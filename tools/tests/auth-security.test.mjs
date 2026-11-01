import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:8767';
const origin = 'https://rovobqojqdpstgmnyjcq.supabase.co';
const storageKey = 'sb-rovobqojqdpstgmnyjcq-auth-token';
const user = { id:'e46f9071-5598-4c01-99d1-033ad7df1bc7', email:'founder@example.com', aud:'authenticated', role:'authenticated', app_metadata:{provider:'email'}, user_metadata:{}, created_at:'2026-11-01T00:00:00Z' };
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.mock`;
const session = { access_token:token, refresh_token:'mock-refresh', token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, user };
let passed = 0;
function check(condition, label) { if (!condition) throw new Error(label); console.log('PASS '+label); passed++; }
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const context = await browser.newContext({reducedMotion:'reduce'});
 const page = await context.newPage();
 await context.route('**/api/payments*', route => route.fulfill({contentType:'application/json',body:JSON.stringify({ready:false,canCreate:false,live:false})}));
 const calls = []; let signupError = null; let logoutError = false; let reauthenticationNeeded = false;
 await context.route(origin+'/**', async route => {
  const req = route.request(), url = new URL(req.url());
  calls.push({path:url.pathname, method:req.method(), query:url.search, data:req.postDataJSON()});
  let status=200, body=user;
  if(url.pathname.endsWith('/signup') && signupError) { status=signupError.status; body={code:signupError.code,msg:'Upstream detail should not be reflected'}; }
  if(url.pathname.endsWith('/logout')) { status=logoutError?503:204; body={code:'unexpected_failure'}; }
  if(url.pathname.endsWith('/user') && req.method()==='PUT' && reauthenticationNeeded) { status=400; body={code:'reauthentication_needed',msg:'Reauthentication required'}; }
  await route.fulfill({status,contentType:'application/json',headers:{'X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},body:status===204?'':JSON.stringify(body)});
 });
 for (const route of ['signup','login','account','forgot-password','reset-password']) {
  const response=await page.goto(`${base}/${route}?code=untrusted-callback`);
  check(/no-store/.test(response.headers()['cache-control']),`${route}: no-store response`);
  check(response.headers()['referrer-policy']==='no-referrer',`${route}: no-referrer response`);
  check(await page.locator('meta[name=referrer]').getAttribute('content')==='no-referrer',`${route}: HTML retains strict referrer policy`);
 }
 await page.goto(base+'/signup');
 await page.getByLabel('Email address').fill(user.email); await page.getByRole('checkbox').check();
 const password=page.getByLabel('Password',{exact:true}), confirm=page.getByLabel('Confirm password',{exact:true});
 const signupCount=()=>calls.filter(c=>c.path.endsWith('/signup')).length;
 for(const [value,label] of [['Ab!1xyz','short'],['abcdef!1','no uppercase'],['ABCDEF!1','no lowercase'],['Abcdef!x','no number'],['Abcdefg1','no symbol'],['Abcdef1 ','space is not a symbol']]) {
  await password.fill(value); await confirm.fill(value); const before=signupCount();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  check(await password.evaluate(input=>!input.checkValidity()) && signupCount()===before,`signup rejects ${label} before sending`);
 }
 await password.fill('Orbit!7a'); await confirm.fill('Orbit!7b');
 check(await confirm.evaluate(input=>!input.checkValidity()),'mismatched confirmation rejected');
 check(await page.locator('[data-password-rule].is-met').count()===5,'checklist reports all five requirements');
 await confirm.fill('Orbit!7a');
 signupError={status:422,code:'weak_password'};
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await page.getByText('Avoid common or previously leaked passwords.',{exact:false}).waitFor();
 check(await page.getByRole('button',{name:'Create account',exact:true}).isEnabled(),'server password rejection allows correction');
 signupError={status:429,code:'over_request_rate_limit'};
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await page.getByText('Too many attempts.',{exact:false}).waitFor();
 check(!await page.locator('main').textContent().then(text=>text.includes('Upstream detail')),'server errors do not expose raw diagnostics');
 signupError=null;
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await page.getByText('Check your inbox to confirm your email.',{exact:false}).waitFor();
 check(calls.filter(c=>c.path.endsWith('/signup')).at(-1).data.password==='Orbit!7a','valid eight-character password accepted by form');
 check(await confirm.inputValue()==='' && await password.inputValue()==='','both password fields cleared on success');
 check(await page.evaluate(()=>![...Object.values(localStorage),...Object.values(sessionStorage)].some(value=>value.includes('Orbit!7a'))),'password not written to browser storage');
 await page.goto(base+'/login'); await password.fill('old-password');
 check(await password.evaluate(input=>input.checkValidity()),'login accepts existing passwords without new composition rules');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:session});
 await page.goto(base+'/reset-password'); await page.locator('form').waitFor({state:'visible'});
 await password.fill('abcdefgh'); await confirm.fill('abcdefgh');
 const updates=calls.filter(c=>c.method==='PUT').length;
 await page.getByRole('button',{name:'Save password'}).click();
 check(await password.evaluate(input=>!input.checkValidity()) && calls.filter(c=>c.method==='PUT').length===updates,'reset blocks weak passwords before API update');
 reauthenticationNeeded=true;
 await password.fill('Orbit!7a'); await confirm.fill('Orbit!7a');
 await page.getByRole('button',{name:'Save password'}).click();
 await page.getByText('Request a fresh password-reset link from your email, then try again.').waitFor();
 check(await page.getByRole('link',{name:'Request a new reset link',exact:false}).isVisible(),'secure password change requires a fresh reset link when Supabase requests reauthentication');
 check(!calls.some(c=>c.path.endsWith('/logout')),'rejected password change does not report success or revoke sessions');
 reauthenticationNeeded=false;
 await page.goto(base+'/account'); await page.locator('[data-private-view]').waitFor({state:'visible'});
 await page.goto(base+'/services');
 await page.goto(base+'/account'); await page.locator('[data-private-view]').waitFor({state:'visible'});
 logoutError=true;
 await page.getByRole('button',{name:'Sign out of all devices',exact:true}).click();
 await page.getByText('We could not confirm server sign-out.',{exact:false}).waitFor();
 check(!await page.locator('[data-private-view]').isVisible() && await page.locator('[data-account-email]').textContent()==='','failed server signout still hides private data and explains retry');
 logoutError=false;
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:session});
 await page.reload(); await page.locator('[data-private-view]').waitFor({state:'visible'});
 await page.getByRole('button',{name:'Sign out of all devices',exact:true}).click();
 await page.waitForURL('**/login');
 check(calls.some(c=>c.path.endsWith('/logout')&&c.query==='?scope=global'),'all-device signout uses global scope');
 check(await page.evaluate(key=>!localStorage.getItem(key),storageKey),'global signout clears local session');
 await page.goBack(); await page.goBack(); await page.getByText('Sign in to view your account.').waitFor();
 check(await page.locator('[data-account-email]').textContent()==='' && !await page.locator('[data-private-view]').isVisible(),'browser back after signout does not expose email');
 // Simulate signout from a second tab, exercising the SDK BroadcastChannel.
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:session});
 await page.reload(); await page.locator('[data-private-view]').waitFor({state:'visible'});
 const other=await context.newPage(); await other.goto(base+'/account'); await other.locator('[data-private-view]').waitFor({state:'visible'});
 await other.getByRole('button',{name:'Sign out of this browser',exact:true}).click(); await other.waitForURL('**/login');
 await page.locator('[data-private-view]').waitFor({state:'hidden'});
 check(await page.locator('[data-account-email]').textContent()==='','cross-tab signout removes previously displayed email');
 await context.close();
 const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'));
 const headers=Object.fromEntries(config.headers.find(rule=>rule.source==='/(.*)').headers.map(h=>[h.key,h.value]));
 check(headers['Content-Security-Policy'].includes("script-src 'self'") && !headers['Content-Security-Policy'].includes("'unsafe-inline'"),'deployment CSP excludes inline and third-party scripts');
 check(headers['X-Frame-Options']==='DENY' && headers['Content-Security-Policy'].includes("frame-ancestors 'none'"),'deployment blocks framing');
 check(headers['Strict-Transport-Security'].includes('max-age=63072000'),'deployment retains HTTPS enforcement');
} finally { await browser.close(); }
console.log(`${passed} passed`);
