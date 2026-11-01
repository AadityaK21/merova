import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../../api/payments.js';

// No real credentials, provider calls, emails or charges in these tests.
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const admin = '12345678-1234-1234-1234-123456789abc';
const customer = '22345678-1234-1234-1234-123456789abc';
const other = '32345678-1234-1234-1234-123456789abc';
const id = 'plink_Abc12345678901';
let calls, links, authStatus, providerStatus, timeoutPost, lostCreation, confirmed;
const users = {
  'owner-token-123': { id: admin, email: 'owner@example.com' },
  'customer-token-123': { id: customer, email: 'customer@example.com' },
  'other-token-123': { id: other, email: 'other@example.com' }
};
const payload = () => ({ reference: 'PROJECT-001', email: 'customer@example.com', amount: '12000.05', description: 'Approved milestone: landing page design', terms: 'Payment and cancellation as agreed in the signed project quote.', validDays: 14, agreed: true });
const sample = () => ({ id, amount: 1200005, amount_paid: 0, currency: 'INR', accept_partial: false, status: 'created', short_url: 'https://rzp.io/i/fixture', customer: {email: 'customer@example.com'}, description: 'Approved scope', expire_by: Math.floor(Date.now()/1000)+86400, notes: {app:'merova-studio-v1', payment_terms:'Approved terms', quote_reference:'PROJECT-001'} });
beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_FixtureOnly';
  process.env.RAZORPAY_KEY_SECRET = 'fake-secret-never-a-real-key';
  process.env.MEROVA_BILLING_ADMIN_USER_ID = admin;
  process.env.VERCEL = '1';
  calls=[]; links=[]; authStatus=200; providerStatus=200; timeoutPost=false; lostCreation=false; confirmed=true;
  globalThis.fetch = async (url, init) => {
    calls.push({url, init});
    if (url.includes('supabase.co/auth/v1/user')) {
      const user = users[init.headers.Authorization.slice(7)];
      return Response.json(user ? {...user, email_confirmed_at: confirmed ? '2026-11-01T00:00:00Z' : null} : {}, {status: user ? authStatus : 401});
    }
    assert.ok(url.startsWith('https://api.razorpay.com/v1/'), 'provider URL is fixed');
    assert.equal(init.headers.Authorization, 'Basic '+Buffer.from('rzp_test_FixtureOnly:fake-secret-never-a-real-key').toString('base64'));
    assert.equal(init.redirect, 'error');
    if (providerStatus !== 200) return Response.json({error:{description:'PRIVATE PROVIDER DIAGNOSTIC'}}, {status:providerStatus});
    if (init.method === 'POST') {
      const data = JSON.parse(init.body);
      if (!timeoutPost || lostCreation) links.push({...data, id, amount_paid:0, status:'created', short_url:'https://rzp.io/i/fixture'});
      if (timeoutPost) throw new Error('PRIVATE TIMEOUT');
      return Response.json(links.at(-1));
    }
    if (url.includes('?reference_id=')) return Response.json({payment_links:links});
    return Response.json(links.find(link=>url.endsWith('/'+link.id)) || {});
  };
});
after(() => { globalThis.fetch = originalFetch; for (const key of ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','MEROVA_BILLING_ADMIN_USER_ID','VERCEL']) { if(originalEnv[key]===undefined) delete process.env[key]; else process.env[key]=originalEnv[key]; } });
async function request({method='GET', token='customer-token-123', quote, body, origin='https://merova.app', headers={}, raw=false}={}) {
  const req=Readable.from(raw ? [typeof body==='string'?body:JSON.stringify(body)] : []);
  req.url='/api/payments'+(quote===undefined?'':'?quote='+encodeURIComponent(quote)); req.method=method;
  req.headers={...(token?{authorization:'Bearer '+token}:{}),origin,'content-type':'application/json',...headers};
  if(!raw && body!==undefined) req.body=body;
  const res={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(value){this.body=JSON.parse(value);}};
  await handler(req,res);
  assert.match(res.headers['cache-control'], /no-store/);
  assert.equal(res.headers['referrer-policy'],'no-referrer');
  const serialized=JSON.stringify(res.body);
  assert.ok(!serialized.includes('fake-secret')&&!serialized.includes('PRIVATE'), 'no secret or upstream diagnostics');
  return res;
}
test('signed-out requests cannot fetch merchant data',async()=>{
  const r=await request({token:null,quote:id});assert.equal(r.statusCode,401);assert.equal(calls.length,0);
});
test('expired/forged bearer tokens fail server verification',async()=>{
  assert.equal((await request({token:'forged-token-123',quote:id})).statusCode,401);assert.equal(calls.length,1);
});
test('unconfirmed users cannot view or create payments',async()=>{
  confirmed=false;assert.equal((await request()).statusCode,403);assert.equal(calls.length,1);
});
test('auth outages do not authorize anyone',async()=>{
  authStatus=503;assert.equal((await request({token:'owner-token-123'})).statusCode,503);assert.equal(calls.length,1);
});
test('owner capability is derived from verified UID, not browser identity',async()=>{
  assert.equal((await request()).body.canCreate,false);
  assert.deepEqual((await request({token:'owner-token-123'})).body,{ready:true,canCreate:true,live:false});
});
test('missing owner config fails closed for all billing',async()=>{
  delete process.env.MEROVA_BILLING_ADMIN_USER_ID;
  assert.equal((await request()).body.ready,false);
  assert.equal((await request({quote:id})).statusCode,503);
});
test('missing or malformed credentials fail closed',async()=>{
  process.env.RAZORPAY_KEY_SECRET='';assert.equal((await request()).body.ready,false);
  process.env.RAZORPAY_KEY_SECRET='long-fake-secret';process.env.RAZORPAY_KEY_ID='random';assert.equal((await request()).body.ready,false);
});
test('customer cannot create or change a price even with owner flags',async()=>{
  assert.equal((await request({method:'POST',body:{...payload(),isAdmin:true,owner:admin}})).statusCode,403);
  assert.equal(calls.length,1);
});
test('cross-site writes and production localhost writes are rejected',async()=>{
  for(const origin of ['https://evil.example','null','http://localhost:8767',undefined]) {
    const headers=origin===undefined?{origin:undefined}:{};
    assert.equal((await request({method:'POST',token:'owner-token-123',body:payload(),origin,headers})).statusCode,403);
  }
  assert.equal(calls.length,0);
});
test('unsupported methods rejected before auth',async()=>{
  const r=await request({method:'DELETE'});assert.equal(r.statusCode,405);assert.equal(r.headers.allow,'GET, POST');assert.equal(calls.length,0);
});
test('validated owner can create exact paise total without notifications',async()=>{
  const r=await request({method:'POST',token:'owner-token-123',body:payload(),raw:true});assert.equal(r.statusCode,200);
  const sent=JSON.parse(calls.find(c=>c.init.method==='POST').init.body);
  assert.equal(sent.amount,1200005);assert.equal(sent.currency,'INR');assert.equal(sent.accept_partial,false);
  assert.deepEqual(sent.notify,{email:false,sms:false});assert.equal(sent.reminder_enable,false);
  assert.equal(sent.callback_url,'https://merova.app/account');assert.equal(sent.notes.app,'merova-studio-v1');
  assert.ok(sent.reference_id.length<=40);assert.equal(r.body.quote.checkout,'https://rzp.io/i/fixture');
  assert.equal(r.body.quote.accountURL,'https://merova.app/account?quote='+id);
});
test('same quote retry reuses a link and does not submit a second creation',async()=>{
  const input={method:'POST',token:'owner-token-123',body:payload()};
  const first=await request(input),second=await request(input);
  assert.equal(first.body.quote.id,second.body.quote.id);assert.equal(calls.filter(c=>c.init.method==='POST').length,1);
});
test('existing reference cannot silently change price, email or terms',async()=>{
  await request({method:'POST',token:'owner-token-123',body:payload()});
  for(const change of [{amount:'99.00'},{email:'someone@example.com'},{terms:'A different cancellation rule'},{description:'A different milestone scope'},{validDays:30}]) {
    assert.equal((await request({method:'POST',token:'owner-token-123',body:{...payload(),...change}})).statusCode,409);
  }
  assert.equal(calls.filter(c=>c.init.method==='POST').length,1);
});
test('timeout after provider creates a link safely recovers by reference',async()=>{
  timeoutPost=true;lostCreation=true;
  const r=await request({method:'POST',token:'owner-token-123',body:payload()});assert.equal(r.statusCode,200);
  assert.equal(links.length,1);assert.equal(calls.filter(c=>c.init.method==='POST').length,1);
});
test('uncertain creation is not blindly retried or marked paid',async()=>{
  timeoutPost=true;const r=await request({method:'POST',token:'owner-token-123',body:payload()});
  assert.equal(r.statusCode,503);assert.match(r.body.error,/same quote reference/);assert.equal(calls.filter(c=>c.init.method==='POST').length,1);
});
test('invalid input rejected before any Razorpay call',async()=>{
  const changes=[{amount:'0'},{amount:'1e3'},{amount:'1.001'},{amount:'1000000.01'},{amount:100},{amount:'-5'}, {reference:'<script>'},{reference:''},{email:'bad'}, {agreed:false},{validDays:0},{validDays:91},{validDays:1.5},{description:'short'},{terms:'tiny'},{terms:'a'.repeat(257)}];
  for(const change of changes) assert.equal((await request({method:'POST',token:'owner-token-123',body:{...payload(),...change}})).statusCode,400,JSON.stringify(change));
  assert.ok(calls.every(c=>c.url.includes('supabase.co')));
});
test('malformed, non-JSON and oversized bodies rejected',async()=>{
  assert.equal((await request({method:'POST',token:'owner-token-123',body:payload(),headers:{'content-type':'text/plain'}})).statusCode,415);
  assert.equal((await request({method:'POST',token:'owner-token-123',body:'{oops',raw:true})).statusCode,400);
  assert.equal((await request({method:'POST',token:'owner-token-123',body:'x'.repeat(9000),raw:true})).statusCode,413);
});
test('customer reads only a quote addressed to their verified email',async()=>{
  links=[sample()];assert.equal((await request({quote:id})).statusCode,200);
  const r=await request({quote:id,token:'other-token-123'});assert.equal(r.statusCode,404);assert.ok(!JSON.stringify(r.body).includes('customer@example.com'));
});
test('email comparison handles case but does not invent alias equivalence',async()=>{
  links=[sample()];links[0].customer.email=' CUSTOMER@EXAMPLE.COM ';assert.equal((await request({quote:id})).statusCode,200);
  links[0].customer.email='customer+quote@example.com';assert.equal((await request({quote:id})).statusCode,404);
});
test('other merchant products remain private, even to studio owner endpoint',async()=>{
  links=[sample()];links[0].notes.app='merova-fit';
  for(const token of ['customer-token-123','owner-token-123']) assert.equal((await request({quote:id,token})).statusCode,404);
});
test('invalid and injected provider paths cannot be fetched',async()=>{
  for(const quote of ['../payments','https://evil.example','plink_x?amount=1','']) assert.equal((await request({quote})).statusCode,400);
  assert.ok(calls.every(c=>c.url.includes('supabase.co')));
});
test('only provider-confirmed full payment is marked received',async()=>{
  links=[{...sample(),status:'paid',amount_paid:1200005}];let r=await request({quote:id});assert.equal(r.body.quote.status,'paid');assert.equal(r.body.quote.checkout,null);
  links[0].amount_paid=1;r=await request({quote:id});assert.equal(r.body.quote.status,'review');assert.equal(r.body.quote.checkout,null);
});
test('expired, cancelled and partially paid links cannot start checkout',async()=>{
  for(const status of ['cancelled','expired','partially_paid']) {
    links=[{...sample(),status}];assert.equal((await request({quote:id})).body.quote.checkout,null);
  }
  links=[{...sample(),expire_by:1}];assert.equal((await request({quote:id})).body.quote.status,'expired');
});
test('provider amounts, currencies and partial-payment flags are checked',async()=>{
  for(const change of [{currency:'USD'},{amount:1.1},{amount:-1},{amount_paid:-1},{accept_partial:true}]) {
    links=[{...sample(),...change}];assert.equal((await request({quote:id})).statusCode,502);
  }
});
test('untrusted checkout URLs fail closed',async()=>{
  for(const short_url of ['javascript:alert(1)','https://rzp.io.evil.example/pay','http://rzp.io/pay','https://evil.example','https://user@rzp.io/pay']) {
    links=[{...sample(),short_url}];const r=await request({quote:id});assert.equal(r.body.quote.checkout,null);assert.equal(r.body.quote.status,'review');
  }
});
test('provider errors and rate limits return sanitized errors',async()=>{
  for(const status of [401,500,429]) {providerStatus=status;const r=await request({quote:id});assert.equal(r.statusCode,status===429?429:502);}
});
test('missing and wrong-owner quotes return the same not-found message',async()=>{
  links=[sample()];const wrong=await request({quote:id,token:'other-token-123'});
  providerStatus=400;const absent=await request({quote:id});assert.equal(absent.statusCode,404);assert.deepEqual(absent.body,wrong.body);
});
test('missing agreed scope or terms cannot lead to checkout',async()=>{
  links=[sample()];links[0].notes.payment_terms='';let r=await request({quote:id});assert.equal(r.body.quote.checkout,null);assert.equal(r.body.quote.status,'review');
  links=[sample()];links[0].description='';r=await request({quote:id});assert.equal(r.body.quote.checkout,null);
});
