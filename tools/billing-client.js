const validID = value => /^plink_[A-Za-z0-9]{6,40}$/.test(value || '');

// Preserve only a validated quote reference, never a user-supplied redirect URL.
export function quoteContext() {
  const url = new URL(location.href);
  const candidate = url.searchParams.get('quote') || url.searchParams.get('razorpay_payment_link_id');
  let id = validID(candidate) ? candidate : '';
  if (id) { try { sessionStorage.setItem('merova-pending-quote', id); } catch { /* optional continuity */ } }
  else { try { const saved = sessionStorage.getItem('merova-pending-quote'); if (validID(saved)) id = saved; } catch { /* storage unavailable */ } }
  // Callback values, including "paid", are never evidence of a payment.
  for (const key of [...url.searchParams.keys()]) if (key.startsWith('razorpay_')) url.searchParams.delete(key);
  if (id) url.searchParams.set('quote', id);
  if (url.href !== location.href) history.replaceState(null, '', url.pathname + url.search + url.hash);
  return id;
}

export function setupBilling(root, client, initialID) {
  const panel = root.querySelector('[data-billing]');
  const owner = panel.querySelector('[data-billing-owner]');
  const status = panel.querySelector('[data-billing-status]');
  const quote = panel.querySelector('[data-quote]');
  const finder = panel.querySelector('[data-quote-find]');
  const creator = panel.querySelector('[data-quote-create]');
  const pay = panel.querySelector('[data-quote-pay]');
  let generation = 0, controller, activeID = initialID, busy = false;
  const text = (selector, value) => { panel.querySelector(selector).textContent = value; };
  const message = (value, error = false) => { status.textContent = value; status.classList.toggle('is-error', error); };
  function clear() {
    generation++; controller?.abort(); controller = new AbortController(); busy = false;
    owner.hidden = true; quote.hidden = true;
    panel.querySelectorAll('[data-quote-value]').forEach(node => { node.textContent = ''; });
    panel.querySelector('[data-quote-share]').value = '';
    creator.reset(); finder.reset(); pay.hidden = true;
    panel.querySelectorAll('button').forEach(button => { button.disabled = false; });
    message('');
  }
  async function api(id, body, current) {
    const { data, error } = await client.auth.getSession();
    if (current !== generation) throw new DOMException('Cancelled', 'AbortError');
    if (error || !data.session) throw new Error('Sign in again to continue.');
    const response = await fetch('/api/payments' + (id ? '?quote=' + encodeURIComponent(id) : ''), {
      method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + data.session.access_token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json();
    if (current !== generation) throw new DOMException('Cancelled', 'AbortError');
    if (!response.ok) throw new Error(result.error || 'Payments are unavailable. Please try again.');
    return result;
  }
  function remember(id) {
    activeID = id;
    finder.elements.quote.value = id;
    try { sessionStorage.setItem('merova-pending-quote', id); } catch { /* optional */ }
    const url = new URL(location.href); url.searchParams.set('quote', id);
    history.replaceState(null, '', url.pathname + url.search);
  }
  function render(value) {
    remember(value.id);
    text('[data-quote-reference]', value.reference);
    text('[data-quote-email]', value.customerEmail);
    text('[data-quote-description]', value.description);
    text('[data-quote-terms]', value.terms);
    text('[data-quote-amount]', new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value.amount / 100));
    const states = { created: 'Awaiting payment', paid: 'Payment received', cancelled: 'Request cancelled', expired: 'Request expired', partially_paid: 'Partial payment, contact the studio', review: 'Contact the studio before paying' };
    text('[data-quote-state]', states[value.status] || states.review);
    text('[data-quote-expiry]', value.expiresAt ? new Date(value.expiresAt * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Contact the studio');
    panel.querySelector('[data-quote-share]').value = value.accountURL;
    panel.querySelector('[data-quote-share-wrap]').hidden = owner.hidden;
    pay.hidden = value.status !== 'created' || !value.checkout;
    quote.hidden = false;
    message(value.status === 'paid' ? 'Razorpay confirms this payment was received. Contact the studio for delivery or refund questions.' : 'Status checked with Razorpay.');
  }
  async function action(fn) {
    if (busy) return;
    busy = true; const current = generation;
    panel.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try { await fn(current); }
    catch (error) { if (current === generation && error.name !== 'AbortError') message(error.message === 'Failed to fetch' ? 'Connection interrupted. Retry with the same quote reference before creating another request.' : error.message, true); }
    finally { if (current === generation) { busy = false; panel.querySelectorAll('button').forEach(button => { button.disabled = false; }); } }
  }
  async function load() {
    const current = generation;
    message('Checking payments…');
    try {
      const config = await api('', null, current);
      owner.hidden = !config.canCreate;
      text('[data-billing-mode]', config.live ? 'Live payments' : 'Test mode: no real money');
      if (!config.ready) { message('Payments are being set up. Contact hello@merova.app about your quote.'); return; }
      message('Have an agreed quote? Open the payment link shared by the studio.');
      if (activeID) render((await api(activeID, null, current)).quote);
    } catch (error) { if (current === generation && error.name !== 'AbortError') message('Payments could not be loaded. Refresh to retry, or contact hello@merova.app.', true); }
  }
  finder.addEventListener('submit', event => {
    event.preventDefault();
    const id = finder.elements.quote.value.trim();
    if (!validID(id)) { message('Enter the payment reference beginning with plink_ from your studio link.', true); return; }
    quote.hidden = true;
    action(async current => { message('Checking your quote…'); render((await api(id, null, current)).quote); });
  });
  creator.addEventListener('submit', event => {
    event.preventDefault();
    if (!creator.reportValidity()) return;
    action(async current => {
      message('Creating your payment request…');
      const data = Object.fromEntries(new FormData(creator));
      data.validDays = Number(data.validDays); data.agreed = data.agreed === 'on';
      render((await api('', data, current)).quote);
      message('Request ready. Copy the Merova link below and share it with this customer. No email has been sent.');
    });
  });
  panel.querySelector('[data-quote-refresh]').addEventListener('click', () => action(async current => {
    message('Checking payment status…'); render((await api(activeID, null, current)).quote);
  }));
  pay.addEventListener('click', () => action(async current => {
    message('Checking the amount before checkout…');
    const value = (await api(activeID, null, current)).quote;
    render(value);
    if (value.status !== 'created' || !value.checkout) return;
    const destination = new URL(value.checkout);
    if (destination.protocol !== 'https:' || destination.hostname !== 'rzp.io' || destination.port || destination.username || destination.password) throw new Error('Could not verify checkout. Contact the studio.');
    location.assign(destination.href);
  }));
  panel.querySelector('[data-quote-copy]').addEventListener('click', () => action(async () => {
    const field = panel.querySelector('[data-quote-share]');
    try { await navigator.clipboard.writeText(field.value); message('Link copied. Share it with the customer on this quote.'); }
    catch { field.focus(); field.select(); message('Select and copy the link shown above.'); }
  }));
  clear();
  return { clear, load };
}
