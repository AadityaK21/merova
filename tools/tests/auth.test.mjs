import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:8767';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const origin = 'https://rovobqojqdpstgmnyjcq.supabase.co';
const storageKey = 'sb-rovobqojqdpstgmnyjcq-auth-token';
const user = { id:'e46f9071-5598-4c01-99d1-033ad7df1bc7', email:'founder@example.com', aud:'authenticated', role:'authenticated', app_metadata:{provider:'email',providers:['email']}, user_metadata:{}, created_at:'2026-11-01T00:00:00Z' };
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.mock`;
const session = { access_token:token, refresh_token:'mock-refresh', token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, user };
let passed=0;
function check(condition,label) { if(!condition) throw new Error(label); console.log('PASS '+label); passed++; }
const shots = new URL('./shots/auth/',import.meta.url); mkdirSync(shots,{recursive:true});
try {
 for (const width of [1440,1024,390]) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(); const errors=[]; const calls=[]; let loginOK=false, authorized=true;
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error') errors.push(m.text())});
  await page.route(origin+'/**',async route=>{
   const req=route.request(); const url=new URL(req.url());const data=req.postDataJSON(); calls.push({path:url.pathname,query:url.search,data});
   let body={},status=200;
   if(url.pathname.endsWith('/signup')) { await new Promise(r=>setTimeout(r,80)); body=user; }
   else if(url.pathname.endsWith('/token')) { if(loginOK) body=session; else {status=400;body={code:'invalid_credentials',msg:'Invalid login credentials'};} }
   else if(url.pathname.endsWith('/user')) {if(authorized) body=user; else {status=401;body={code:'bad_jwt',msg:'Invalid token'};} }
   else if(url.pathname.endsWith('/logout')) status=204;
   await route.fulfill({status,headers:{'X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},contentType:'application/json',body:status===204?'':JSON.stringify(body)});
  });
  await page.goto(base+'/signup');
  await page.locator('button[type=submit]').waitFor({state:'visible'});
  await page.getByLabel('Email address').fill(user.email);await page.getByLabel('Password',{exact:true}).fill('Orbit!7a');
  await page.getByLabel('Confirm password',{exact:true}).fill('Orbit!7a');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByText('Check your inbox to confirm your email.',{exact:false}).waitFor();
  check(calls.filter(c=>c.path.endsWith('/signup')).length===1,`${width}: signup submits once`);
  check(calls.find(c=>c.path.endsWith('/signup')).data.code_challenge?.length>20,`${width}: signup uses PKCE`);
  check(await page.getByLabel('Password',{exact:true}).inputValue()==='',`${width}: password cleared after signup`);
  check(page.url().endsWith('/signup'),`${width}: confirmation required before account access`);
  await page.getByRole('button',{name:'Resend confirmation email'}).click();
  await page.getByText('If your email is awaiting confirmation,',{exact:false}).waitFor();
  check(calls.some(c=>c.path.endsWith('/resend')),`${width}: confirmation resend connected`);
  check((await new AxeBuilder({page}).include('main').analyze()).violations.length===0,`${width}: signup accessibility`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: no overflow`);
  await page.screenshot({path:new URL(`signup-${width}.png`,shots).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
  await page.goto(base+'/account');await page.getByText('Sign in to view your account.').waitFor();
  check(!await page.locator('[data-private-view]').isVisible(),`${width}: signed-out account is hidden`);
  await page.goto(base+'/login');await page.getByLabel('Email address').fill(user.email);await page.getByLabel('Password',{exact:true}).fill('incorrect');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('The email or password is incorrect.',{exact:false}).waitFor();
  check(page.url().endsWith('/login'),`${width}: invalid login stays on form`);
  loginOK=true;await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/account');await page.locator('[data-private-view]').waitFor({state:'visible'});
  check(await page.locator('[data-account-email]').textContent()===user.email,`${width}: verified account displayed`);
  check((await new AxeBuilder({page}).include('main').analyze()).violations.length===0,`${width}: account accessibility`);
  await page.getByRole('button',{name:'Sign out of this browser'}).click();await page.waitForURL('**/login');
  check(await page.evaluate(key=>!localStorage.getItem(key),storageKey),`${width}: logout clears session`);
  await page.goto(base+'/forgot-password');await page.getByLabel('Email address').fill(user.email);await page.getByRole('button',{name:'Send reset link'}).click();await page.getByText('If an account exists for this email,',{exact:false}).waitFor();
  check(calls.some(c=>c.path.endsWith('/recover')&&c.query.includes('reset-password')),`${width}: recovery has correct redirect`);
  await page.goto(base+'/reset-password');await page.getByText('Open the password-reset link',{exact:false}).waitFor();
  check(!await page.locator('form').isVisible(),`${width}: reset form requires a session`);
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:session});
  await page.reload();await page.locator('form').waitFor({state:'visible'});await page.getByLabel('Password',{exact:true}).fill('Another long unique passphrase!7');await page.getByLabel('Confirm password',{exact:true}).fill('Another long unique passphrase!7');await page.getByRole('button',{name:'Save password'}).click();await page.getByText('Password updated.',{exact:false}).waitFor();
  check(calls.some(c=>c.path.endsWith('/user')&&c.data?.password),`${width}: authenticated password update`);
  check(calls.some(c=>c.path.endsWith('/logout')&&c.query.includes('scope=global')),`${width}: reset revokes all refresh sessions`);
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:session});
  authorized=false; await page.goto(base+'/account');await page.getByText('Your session could not be verified.',{exact:false}).waitFor();
  check(!await page.locator('[data-private-view]').isVisible(),`${width}: rejected stored token does not reveal account`);
  // Expected mocked 400/401 HTTP diagnostics are distinct from script/CSP failures.
  check(errors.filter(e=>!e.includes('status of 400')&&!e.includes('status of 401')).length===0,`${width}: no script or CSP errors`);
  await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(base+'/signup');
 check(!await page.getByRole('button',{name:'Create account',exact:true}).isEnabled(),'no JS: signup cannot leak credentials through fallback submission');
 check(await page.locator('main noscript p').isVisible(),'no JS: clear fallback');await context.close();
 const callbackContext=await browser.newContext();const callbackPage=await callbackContext.newPage();let exchanged=false;
 await callbackPage.route(origin+'/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/token')) exchanged=url.searchParams.get('grant_type')==='pkce'&&route.request().postDataJSON().auth_code==='test-confirmation';
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.endsWith('/token')?session:user)});
 });
 await callbackPage.goto(base+'/login');
 await callbackPage.evaluate(key=>localStorage.setItem(key+'-code-verifier',JSON.stringify('test-verifier')),storageKey);
 await callbackPage.goto(base+'/account?code=test-confirmation');await callbackPage.locator('[data-private-view]').waitFor({state:'visible'});
 check(exchanged,'confirmation callback exchanges PKCE code');
 check(!callbackPage.url().includes('code='),'confirmation callback removes code from URL');
 await callbackContext.close();
} finally {await browser.close();}
console.log(`${passed} passed`);
