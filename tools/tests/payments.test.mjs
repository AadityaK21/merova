import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:8768';
const auth = 'https://rovobqojqdpstgmnyjcq.supabase.co';
const key = 'sb-rovobqojqdpstgmnyjcq-auth-token';
const user = {id:'12345678-1234-1234-1234-123456789abc',email:'customer@example.com',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-11-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
const access = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.mock`;
const session = {access_token:access,refresh_token:'mock-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};
const id='plink_Abc12345678901';
const fixture=()=>({id,reference:'TEST-QUOTE-001',customerEmail:user.email,description:'Test fixture: an agreed landing page milestone.',terms:'Test fixture: terms already agreed in writing.',amount:1200005,currency:'INR',status:'created',expiresAt:Math.floor(Date.now()/1000)+86400,checkout:'https://rzp.io/i/fixture',accountURL:'https://merova.app/account?quote='+id});
let passed=0;
function check(value,label){if(!value)throw new Error(label);console.log('PASS '+label);passed++;}
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const shots=new URL('./shots/payments/',import.meta.url);mkdirSync(shots,{recursive:true});
try {
 for(const width of [1440,1024,390]) {
  const context=await browser.newContext({viewport:{width,height:width===1024?768:width===390?844:1000},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];const apiCalls=[];let owner=false,quote=fixture(),denied=false,slow=false;
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await context.route(auth+'/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    await route.fulfill({status:path.endsWith('/logout')?204:200,contentType:'application/json',body:path.endsWith('/logout')?'':JSON.stringify(path.endsWith('/token')?session:user)});
  });
  await context.route('**/api/payments*',async route=>{
    const req=route.request(),url=new URL(req.url());apiCalls.push({method:req.method(),url:req.url(),headers:req.headers(),body:req.postDataJSON()});
    if(slow)await new Promise(r=>setTimeout(r,250));
    const isQuote=url.searchParams.has('quote')||req.method()==='POST';
    await route.fulfill({status:denied&&isQuote?404:200,contentType:'application/json',body:JSON.stringify(denied&&isQuote?{error:'Payment request not found for this account. Use the email on your agreed quote.'}:isQuote?{quote}:{ready:true,canCreate:owner,live:false})});
  });
  // A malicious paid callback cannot bypass login or establish payment status.
  await page.goto(base+'/account?razorpay_payment_link_id='+id+'&razorpay_payment_link_status=paid&razorpay_signature=forged');
  await page.getByText('Sign in to view your account.').waitFor();
  check(!await page.locator('[data-private-view]').isVisible(),`${width}: callbacks cannot expose private data`);
  check(!page.url().includes('razorpay_'),`${width}: callback payment claims removed`);
  check(apiCalls.length===0,`${width}: no billing requests before verified sign-in`);
  await page.locator('.account-links').getByRole('link',{name:'Sign in',exact:false}).click();
  await page.getByLabel('Email address',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('Orbit!7a');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL('**/account?quote='+id);await page.locator('[data-quote]').waitFor({state:'visible'});
  check(await page.locator('[data-quote-state]').textContent()==='Awaiting payment',`${width}: forged paid callback replaced by server status`);
  check(!await page.locator('[data-billing-owner]').isVisible(),`${width}: customer has no quote creation UI`);
  check(await page.locator('[data-quote-amount]').textContent()==='₹12,000.05',`${width}: exact total displayed in INR`);
  check(apiCalls.every(call=>call.headers.authorization==='Bearer '+access),`${width}: billing fetches carry session token`);
  check((await new AxeBuilder({page}).include('main').analyze()).violations.length===0,`${width}: customer payment accessibility`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: customer page fits viewport`);
  await page.screenshot({path:new URL(`customer-${width}.png`,shots).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
  // Last-moment recheck must prevent checkout if payment was already received elsewhere.
  const before=apiCalls.length;quote={...quote,status:'paid',checkout:null};
  await page.getByRole('button',{name:'Continue to Razorpay'}).click();
  await page.getByText('Razorpay confirms this payment was received.',{exact:false}).waitFor();
  check(apiCalls.length>before&&!await page.locator('[data-quote-pay]').isVisible(),`${width}: recheck blocks double payment after status changed`);
  check(new URL(page.url()).origin===base,`${width}: paid quote stays on Merova`);
  quote=fixture();await page.getByRole('button',{name:'Refresh payment status'}).click();await page.locator('[data-quote-pay]').waitFor({state:'visible'});
  let checkout=false;
  await page.route('https://rzp.io/**',async route=>{checkout=true;await route.fulfill({contentType:'text/html',body:'<title>Mock checkout</title><p>Test checkout only</p>'});});
  await page.getByRole('button',{name:'Continue to Razorpay'}).click();await page.waitForURL('https://rzp.io/i/fixture');
  check(checkout,`${width}: checkout uses only the validated provider URL`);
  await page.goto(base+'/account?quote='+id);await page.locator('[data-quote]').waitFor({state:'visible'});
  // Owner form and quote preview, using fixtures only.
  owner=true;await page.reload();await page.locator('[data-billing-owner]').waitFor({state:'visible'});
  await page.getByText('Create a payment request',{exact:true}).click();
  await page.getByLabel('Unique quote or milestone reference').fill('TEST-QUOTE-001');
  await page.getByLabel('Customer account email').fill(user.email);
  await page.getByLabel('Agreed project or milestone scope').fill(quote.description);
  await page.getByLabel('Final total in INR, including applicable taxes').fill('12000.05');
  await page.getByLabel('Agreed payment and cancellation terms').fill(quote.terms);
  await page.getByLabel('Payment link valid for (days)').fill('14');
  await page.locator('[name=agreed]').check();
  check(await page.locator('[data-quote-create]').evaluate(f=>f.checkValidity()),`${width}: owner form accepts complete agreed quote`);
  slow=true;const create=page.getByRole('button',{name:'Create payment request',exact:true});
  await create.click();check(!await create.isEnabled(),`${width}: duplicate submit disabled while creating`);
  await page.getByText('Request ready.',{exact:false}).waitFor();slow=false;
  check(apiCalls.filter(c=>c.method==='POST').length===1,`${width}: one create request from one submission`);
  check(await page.locator('[data-quote-share]').inputValue()===quote.accountURL,`${width}: owner receives customer link`);
  const audit=await new AxeBuilder({page}).include('main').analyze();
  check(audit.violations.length===0,`${width}: expanded owner form accessibility ${JSON.stringify(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))}`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: owner form fits viewport`);
  await page.screenshot({path:new URL(`owner-${width}.png`,shots).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
  // Private text is rendered as text, not markup.
  quote={...quote,description:'<img src=x onerror=alert(1)>',terms:'<script>window.pwned=1</script>'};
  await page.getByRole('button',{name:'Refresh payment status'}).click();await page.getByText(quote.description,{exact:true}).waitFor();
  check(await page.locator('[data-quote-description] img').count()===0&&!await page.evaluate(()=>window.pwned),`${width}: quote text cannot inject HTML`);
  denied=true;await page.getByLabel('Payment reference',{exact:true}).fill('plink_Different123');
  await page.getByRole('button',{name:'View payment request',exact:true}).click();await page.getByText('Payment request not found for this account.',{exact:false}).waitFor();
  check(!await page.locator('[data-quote]').isVisible(),`${width}: rejected quote hides previous details`);
  denied=false;await page.getByLabel('Payment reference',{exact:true}).fill(id);await page.getByRole('button',{name:'View payment request',exact:true}).click();await page.locator('[data-quote]').waitFor({state:'visible'});
  // A delayed response cannot restore private data after cross-tab signout.
  slow=true;await page.getByRole('button',{name:'Refresh payment status'}).click();
  const other=await context.newPage();await other.goto(base+'/account');await other.locator('[data-private-view]').waitFor({state:'visible'});
  await other.getByRole('button',{name:'Sign out of this browser'}).click();await other.waitForURL('**/login');
  await page.locator('[data-private-view]').waitFor({state:'hidden'});
  await page.waitForTimeout(350);
  check(await page.locator('[data-quote-description]').textContent()===''&&await page.locator('[data-quote-share]').inputValue()==='',`${width}: signout clears quote and sharing data`);
  check(!await page.locator('[data-quote]').isVisible(),`${width}: delayed response cannot restore signed-out data`);
  check(errors.filter(e=>!e.includes('status of 404')).length===0,`${width}: no script, pattern or CSP errors: ${errors.join('; ')}`);
  await context.close();
 }
} finally {await browser.close();}
console.log(`${passed} passed`);
