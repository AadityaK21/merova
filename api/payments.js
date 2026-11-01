const { createHash } = require('node:crypto');

const SITE = 'https://merova.app';
const AUTH = 'https://rovobqojqdpstgmnyjcq.supabase.co/auth/v1/user';
const PUBLIC_KEY = 'sb_publishable_wJ8cDHLbF35kuKLz-TOFzQ_IoAHW2LM';
const NAMESPACE = 'merova-studio-v1';
const ID = /^plink_[A-Za-z0-9]{6,40}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function reply(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

async function bodyOf(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new Problem(415, 'Send a JSON request.');
  let raw = req.body;
  if (raw === undefined) {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > 8192) throw new Problem(413, 'This request is too large.');
      chunks.push(Buffer.from(chunk));
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.byteLength(typeof raw === 'string' ? raw : JSON.stringify(raw)) > 8192) throw new Problem(413, 'This request is too large.');
  try { raw = typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { throw new Problem(400, 'Invalid request.'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Problem(400, 'Invalid request.');
  return raw;
}

async function authenticate(req) {
  const bearer = req.headers.authorization;
  if (typeof bearer !== 'string' || !/^Bearer [A-Za-z0-9._-]{10,8192}$/.test(bearer)) throw new Problem(401, 'Sign in to view payments.');
  let response;
  try { response = await fetch(AUTH, { headers: { apikey: PUBLIC_KEY, Authorization: bearer }, signal: AbortSignal.timeout(8000), redirect: 'error' }); }
  catch { throw new Problem(503, 'Could not verify your account. Please try again.'); }
  if (response.status === 401 || response.status === 403) throw new Problem(401, 'Sign in again to continue.');
  if (!response.ok) throw new Problem(503, 'Could not verify your account. Please try again.');
  const user = await response.json();
  if (!UUID.test(user.id || '') || !user.email || !user.email_confirmed_at || user.is_anonymous) throw new Problem(403, 'Confirm your account email before using payments.');
  return user;
}

function settings() {
  const key = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const owner = process.env.MEROVA_BILLING_ADMIN_USER_ID || '';
  const ready = /^rzp_(live|test)_[A-Za-z0-9]+$/.test(key) && secret.length >= 10 && UUID.test(owner);
  return { key, secret, owner, ready, live: key.startsWith('rzp_live_') };
}

async function razorpay(config, path, body) {
  let response;
  try {
    response = await fetch('https://api.razorpay.com/v1/' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Basic ' + Buffer.from(config.key + ':' + config.secret).toString('base64'), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000), redirect: 'error'
    });
  } catch { throw new Problem(503, body ? 'The result is uncertain. Retry with the same quote reference, or check Razorpay before creating another request.' : 'Payment status is unavailable. Please try again.'); }
  // Never relay provider diagnostics, credentials or private merchant details.
  if (!body && path.startsWith('payment_links/') && [400,404].includes(response.status)) throw new Problem(404, 'Payment request not found for this account. Use the email on your agreed quote.');
  if (!response.ok) throw new Problem(response.status === 429 ? 429 : 502, body ? 'Could not confirm creation. Check Razorpay or retry with the same quote reference.' : 'Could not load this payment request. Check the reference or try again later.');
  return response.json();
}

function hostedURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === 'rzp.io' && !url.port && !url.username && !url.password && url.pathname.length > 1) return url.href;
  } catch { /* Fail closed if the provider response is unexpected. */ }
  return null;
}

function view(link, user, owner) {
  if (!ID.test(link.id || '') || link.notes?.app !== NAMESPACE || (user.id !== owner && normalizeEmail(link.customer?.email) !== normalizeEmail(user.email))) {
    throw new Problem(404, 'Payment request not found for this account. Use the email on your agreed quote.');
  }
  if (link.currency !== 'INR' || !Number.isSafeInteger(link.amount) || link.amount < 100 || !Number.isSafeInteger(link.amount_paid) || link.amount_paid < 0 || link.accept_partial !== false) {
    throw new Problem(502, 'This request needs a review by the studio before payment.');
  }
  const expired = Number.isFinite(link.expire_by) && link.expire_by > 0 && link.expire_by <= Math.floor(Date.now() / 1000);
  let status = ['created', 'paid', 'cancelled', 'expired', 'partially_paid'].includes(link.status) ? link.status : 'review';
  if (typeof link.notes.payment_terms !== 'string' || link.notes.payment_terms.trim().length < 10 || typeof link.description !== 'string' || link.description.trim().length < 10) status = 'review';
  if (status === 'created' && expired) status = 'expired';
  if ((status === 'paid' && link.amount_paid !== link.amount) || (status === 'created' && link.amount_paid !== 0)) status = 'review';
  const checkout = status === 'created' ? hostedURL(link.short_url) : null;
  if (status === 'created' && !checkout) status = 'review';
  return {
    id: link.id, reference: link.notes.quote_reference || link.reference_id,
    description: String(link.description || ''), terms: String(link.notes.payment_terms || ''),
    customerEmail: link.customer.email, amount: link.amount, currency: link.currency,
    status, expiresAt: link.expire_by || null, checkout,
    accountURL: SITE + '/account?quote=' + encodeURIComponent(link.id)
  };
}

function quoteInput(body) {
  const email = normalizeEmail(body.email);
  const text = key => typeof body[key] === 'string' ? body[key].trim() : '';
  const reference = text('reference').toUpperCase();
  const description = text('description'), terms = text('terms'), amount = text('amount');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Problem(400, 'Enter the customer account email.');
  if (!/^[A-Z0-9][A-Z0-9._/-]{2,39}$/.test(reference)) throw new Problem(400, 'Use a unique quote reference of 3 to 40 letters, numbers, dots, slashes, underscores or hyphens.');
  if (description.length < 10 || description.length > 1000 || terms.length < 10 || terms.length > 256) throw new Problem(400, 'Include the agreed scope and payment terms within the displayed limits.');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(amount)) throw new Problem(400, 'Enter the final INR total with at most two decimal places.');
  const [whole, fraction = ''] = amount.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise) || paise < 100 || paise > 100000000) throw new Problem(400, 'This checkout supports totals from INR 1 to INR 10,00,000. Contact the studio for larger projects.');
  if (!Number.isInteger(body.validDays) || body.validDays < 1 || body.validDays > 90 || body.agreed !== true) throw new Problem(400, 'Confirm the agreed quote and choose a validity of 1 to 90 days.');
  return {
    amount: paise, currency: 'INR', accept_partial: false, description,
    reference_id: 'mrv_' + createHash('sha256').update(reference).digest('hex').slice(0,32),
    customer: { email }, notify: { sms: false, email: false }, reminder_enable: false,
    notes: { app: NAMESPACE, quote_reference: reference, payment_terms: terms, valid_days: String(body.validDays) },
    expire_by: Math.floor(Date.now() / 1000) + body.validDays * 86400,
    callback_url: SITE + '/account', callback_method: 'get'
  };
}

function matches(link, payload) {
  return link.reference_id === payload.reference_id && link.notes?.app === NAMESPACE && link.amount === payload.amount && link.currency === 'INR' && link.accept_partial === false && normalizeEmail(link.customer?.email) === payload.customer.email && link.description === payload.description && link.notes.payment_terms === payload.notes.payment_terms && link.notes.valid_days === payload.notes.valid_days;
}

async function existing(config, payload) {
  const result = await razorpay(config, 'payment_links?reference_id=' + encodeURIComponent(payload.reference_id));
  if (!Array.isArray(result.payment_links)) throw new Problem(502, 'Could not check existing quotes. Please try again.');
  const links = result.payment_links.filter(link => link.reference_id === payload.reference_id);
  if (!links.length) return null;
  if (links.length !== 1 || !matches(links[0], payload)) throw new Problem(409, 'That quote reference already exists with different details. Check Razorpay before using a new reference.');
  return links[0];
}

module.exports = async function payments(req, res) {
  try {
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); throw new Problem(405, 'Method not allowed.'); }
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      const local = process.env.VERCEL !== '1' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
      if (origin !== SITE && !local) throw new Problem(403, 'Open payments from merova.app.');
    }
    const user = await authenticate(req);
    const config = settings();
    const isOwner = UUID.test(config.owner) && user.id === config.owner;
    const url = new URL(req.url, SITE);
    if (req.method === 'GET' && !url.searchParams.has('quote')) {
      return reply(res, 200, { ready: config.ready, canCreate: isOwner && config.ready, live: config.ready && config.live });
    }
    if (!config.ready) throw new Problem(503, 'Payments are not ready yet. Contact hello@merova.app about your quote.');
    if (req.method === 'GET') {
      const id = url.searchParams.get('quote');
      if (!ID.test(id || '')) throw new Problem(400, 'Enter a valid payment reference beginning with plink_.');
      const link = await razorpay(config, 'payment_links/' + encodeURIComponent(id));
      if (link.id !== id) throw new Problem(502, 'Could not verify this payment request.');
      return reply(res, 200, { quote: view(link, user, config.owner) });
    }
    if (!isOwner) throw new Problem(403, 'Only the studio owner can create payment requests.');
    const payload = quoteInput(await bodyOf(req));
    let link = await existing(config, payload);
    if (!link) {
      try { link = await razorpay(config, 'payment_links', payload); }
      catch (error) {
        // A concurrent request or network timeout may have created it already.
        // Reuse the provider's unique reference; never retry POST blindly.
        link = await existing(config, payload);
        if (!link) throw error;
      }
    }
    if (!matches(link, payload)) throw new Problem(502, 'The payment request needs review in Razorpay.');
    return reply(res, 200, { quote: view(link, user, config.owner) });
  } catch (error) {
    return reply(res, error instanceof Problem ? error.status : 503, { error: error instanceof Problem ? error.message : 'Payments are temporarily unavailable. Please try again.' });
  }
};
