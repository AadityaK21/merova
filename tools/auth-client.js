import { createClient } from '@supabase/supabase-js';
import { passwordError, passwordRules, PASSWORD_HINT } from './password-policy.js';

// Public browser connection values. No service-role or secret key belongs here.
const client = createClient('https://rovobqojqdpstgmnyjcq.supabase.co', 'sb_publishable_wJ8cDHLbF35kuKLz-TOFzQ_IoAHW2LM', {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const root = document.querySelector('[data-account-page]');
const mode = root.dataset.accountPage;
const form = root.querySelector('form');
const status = root.querySelector('[data-auth-status]');
const privateView = root.querySelector('[data-private-view]');
let busy = false;
let verification = 0;
let passwordUpdated = false;
const newPassword = mode === 'signup' || mode === 'reset-password';
function validatePassword() {
  if (!newPassword) return;
  const input = form.elements.password;
  const rules = passwordRules(input.value);
  input.setCustomValidity(input.value ? passwordError(input.value) : '');
  root.querySelectorAll('[data-password-rule]').forEach(item => {
    const met = rules[item.dataset.passwordRule];
    item.classList.toggle('is-met', met);
    item.querySelector('[data-rule-mark]').textContent = met ? '✓' : '○';
    item.querySelector('[data-rule-status]').textContent = met ? 'Met: ' : 'Needed: ';
  });
  const confirmation = form.elements.password_confirm;
  confirmation.setCustomValidity(confirmation.value && confirmation.value !== input.value ? 'The passwords do not match.' : '');
}
if (newPassword) {
  form.elements.password.addEventListener('input', validatePassword);
  form.elements.password_confirm.addEventListener('input', validatePassword);
}
function clearPasswords() {
  form?.querySelectorAll('input[type=password]').forEach(input => { input.value = ''; input.setCustomValidity(''); });
  validatePassword();
}
function hidePrivateData() {
  if (privateView) privateView.hidden = true;
  const identity = root.querySelector('[data-account-email]');
  if (identity) identity.textContent = '';
  if (mode === 'reset-password') form.hidden = true;
}
function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('is-error', error);
}
function explain(error) {
  if (error?.status === 429 || /rate.limit/i.test(error?.code || '')) return 'Too many attempts. Please wait a few minutes and try again.';
  if (error?.code === 'email_not_confirmed') return 'Confirm your email before signing in. You can resend the confirmation below.';
  if (error?.code === 'invalid_credentials') return 'The email or password is incorrect. Try again or reset your password.';
  if (error?.code === 'weak_password') return `${PASSWORD_HINT} Avoid common or previously leaked passwords.`;
  if (error?.code === 'reauthentication_needed' || error?.code === 'reauthentication_not_valid') return 'Request a fresh password-reset link from your email, then try again.';
  if (/fetch|network/i.test(error?.message || '')) return 'Could not connect. Check your connection and try again.';
  return 'This request could not be completed. Please try again, or contact hello@merova.app if it continues.';
}
async function run(action) {
  if (busy) return;
  busy = true;
  const buttons = [...root.querySelectorAll('button')];
  buttons.forEach(button => button.disabled = true);
  root.setAttribute('aria-busy', 'true');
  try { await action(); } catch (error) { message(explain(error), true); }
  finally { busy = false; buttons.forEach(button => button.disabled = false); root.removeAttribute('aria-busy'); }
}
const url = new URL(location.href);
const linkError = url.searchParams.has('error') || new URLSearchParams(location.hash.slice(1)).has('error');
if (linkError) {
  history.replaceState(null, '', location.pathname);
  message('This email link is invalid or has expired. Request a new link and open it in the same browser.', true);
}
const callback = path => new URL(path, location.origin).href;
const email = () => form.elements.email.value.trim();
form?.addEventListener('submit', event => {
  event.preventDefault();
  validatePassword();
  if (!form.reportValidity()) return;
  run(async () => {
    message('Working on it…');
    if (mode === 'signup') {
      const { data, error } = await client.auth.signUp({ email: email(), password: form.elements.password.value, options: { emailRedirectTo: callback('/account') } });
      if (error) throw error;
      clearPasswords();
      if (data.session) location.assign('/account');
      else message('Check your inbox to confirm your email. If you already have an account, sign in or reset your password. Open the link in this browser.');
    } else if (mode === 'login') {
      const { error } = await client.auth.signInWithPassword({ email: email(), password: form.elements.password.value });
      if (error) throw error;
      clearPasswords();
      location.assign('/account');
    } else if (mode === 'forgot-password') {
      const { error } = await client.auth.resetPasswordForEmail(email(), { redirectTo: callback('/reset-password') });
      if (error) throw error;
      message('If an account exists for this email, you will receive a reset link. Open it in this browser.');
    } else if (mode === 'reset-password') {
      const { data, error: checkError } = await client.auth.getUser();
      if (checkError || !data.user) { message('Your link has expired. Request a new password reset.', true); form.hidden = true; return; }
      const { error } = await client.auth.updateUser({ password: form.elements.password.value });
      if (error) throw error;
      passwordUpdated = true;
      verification++;
      form.reset();
      clearPasswords();
      form.hidden = true;
      const { error: signoutError } = await client.auth.signOut({ scope: 'global' });
      message(signoutError ? 'Password updated, but we could not sign out every session. Go to your account and try Sign out of all devices again.' : 'Password updated. All sessions have been signed out. Existing access may continue until it expires. Sign in with your new password.', Boolean(signoutError));
    }
  });
});
root.querySelector('[data-resend]')?.addEventListener('click', () => {
  const input = form.elements.email;
  if (!input.reportValidity()) return;
  run(async () => {
    const { error } = await client.auth.resend({ type: 'signup', email: email(), options: { emailRedirectTo: callback('/account') } });
    if (error) throw error;
    message('If your email is awaiting confirmation, a new link will be sent. Check your inbox and spam folder.');
  });
});
root.querySelectorAll('[data-signout]').forEach(button => button.addEventListener('click', () => run(async () => {
  const { error } = await client.auth.signOut({ scope: button.dataset.signout === 'global' ? 'global' : 'local' });
  hidePrivateData();
  clearPasswords();
  if (error) {
    message('We could not confirm server sign-out. Sign in again and retry Sign out of all devices to end your other sessions.', true);
    return;
  }
  location.replace('/login');
})));
async function verifyView() {
  if (mode !== 'account' && mode !== 'reset-password') return;
  if (passwordUpdated) return;
  const current = ++verification;
  hidePrivateData();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (current !== verification) return;
  if (sessionError || !sessionData.session) {
    if (!linkError) message(mode === 'account' ? 'Sign in to view your account.' : 'Open the password-reset link from your email to choose a new password.', true);
    return;
  }
  // Never render account details from local storage alone. Verify against Auth.
  const { data, error } = await client.auth.getUser();
  if (current !== verification) return;
  if (error || !data.user) { message('Your session could not be verified. Sign in again or retry when you are online.', true); return; }
  if (mode === 'account') {
    root.querySelector('[data-account-email]').textContent = data.user.email || '';
    privateView.hidden = false;
    message('Signed in. Your account is ready.');
  } else { form.hidden = false; message('Choose your new password.'); }
}
client.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    verification++;
    hidePrivateData();
    clearPasswords();
    message('You are signed out.');
  } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
    // Run outside the Auth callback so SDK session locks are not reentered.
    setTimeout(() => { verifyView().catch(error => message(explain(error), true)); }, 0);
  }
});
window.addEventListener('pagehide', () => {
  verification++;
  hidePrivateData();
  clearPasswords();
});
window.addEventListener('pageshow', () => { verifyView().catch(error => message(explain(error), true)); });
verifyView().catch(error => message(explain(error), true));
form?.querySelector('button[type=submit]')?.removeAttribute('disabled');
