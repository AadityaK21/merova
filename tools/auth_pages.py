"""Customer account pages, called by build.py. No private data in generated HTML."""

def render(page, version):
    head = f'<link rel="stylesheet" href="/assets/css/account.css?v={version("assets/css/account.css")}"><script type="module" src="/assets/js/account.js?v={version("assets/js/account.js")}"></script>'
    email = '<label for="account-email">Email address</label><input id="account-email" name="email" type="email" autocomplete="email" maxlength="254" required>'
    def password(existing=False):
        field = '<label for="account-password">Password</label><input id="account-password" name="password" type="password" autocomplete="' + ('current-password' if existing else 'new-password') + '" ' + ('' if existing else 'minlength="8" ') + 'maxlength="128" required aria-describedby="password-hint"><p class="account-help" id="password-hint">' + ('Enter your account password.' if existing else 'Use a unique password. Longer passwords are better; a password manager can help.') + '</p>'
        if existing:
            return field
        rules = [('length', 'At least 8 characters'), ('uppercase', 'One uppercase letter (A-Z)'), ('lowercase', 'One lowercase letter (a-z)'), ('number', 'One number (0-9)'), ('special', 'One special character, such as ! @ # $')]
        field += '<ul class="password-rules" aria-label="Password requirements">' + ''.join(f'<li data-password-rule="{key}"><span data-rule-mark aria-hidden="true">○</span><span class="visually-hidden" data-rule-status>Needed: </span>{label}</li>' for key, label in rules) + '</ul>'
        field += '<label for="account-password-confirm">Confirm password</label><input id="account-password-confirm" name="password_confirm" type="password" autocomplete="new-password" maxlength="128" required>'
        return field
    configs = {
        'signup': ('A place for<br><em>your next idea.</em>', 'Create your Merova account', 'Start with an account. Bring your next website idea when you are ready.', email + password() + '<label class="account-check"><input type="checkbox" required><span>I agree to the <a href="/terms">Terms</a> and have read the <a href="/privacy">Privacy Policy</a>.</span></label>', 'Create account', 'Already have an account? <a href="/login">Sign in</a>'),
        'login': ('Good to have<br><em>you back.</em>', 'Sign in to Merova', 'Your account, one place to start.', email + password(True), 'Sign in', '<a href="/forgot-password">Forgot your password?</a><br>New here? <a href="/signup">Create an account</a>'),
        'forgot-password': ('A fresh<br><em>start.</em>', 'Reset your password', 'We will email you a link to choose a new password.', email, 'Send reset link', '<a href="/login">Back to sign in</a>'),
        'reset-password': ('Make it<br><em>yours again.</em>', 'Choose a new password', 'Open your reset link in the same browser where you requested it.', password(), 'Save password', '<a href="/forgot-password">Request a new reset link</a><br><a href="/account">Go to your account</a>'),
    }
    for mode, (title, label, intro, fields, button, links) in configs.items():
        resend = '<button class="account-resend" type="button" data-resend>Resend confirmation email</button>' if mode in ('signup', 'login') else ''
        body = f'''<main id="main" class="account-shell" data-account-page="{mode}">
          <div class="wrap account-grid">
            <section class="account-story"><p class="kicker">Merova / Your account</p><h1>{title}</h1><p>Ideas start with you.<br>We help with what comes next.</p><a class="link" href="/services#enquire">Prefer to talk about a project?</a></section>
            <section class="account-card" aria-labelledby="account-title"><p class="kicker">Welcome to Merova</p><h2 id="account-title">{label}</h2><p>{intro}</p>
              <p class="account-status" role="status" aria-live="polite" data-auth-status></p>
              <form data-auth-form method="post" {'hidden' if mode == 'reset-password' else ''}>{fields}<button class="btn btn--primary" type="submit" disabled>{button}</button></form>
              {resend}<p class="account-links">{links}</p><noscript><p>Enable JavaScript to use your account, or <a href="mailto:hello@merova.app">contact the studio</a>.</p></noscript>
            </section>
          </div></main>'''
        page(mode + '.html', title=label + ' - Merova', desc=intro, body=body, noindex=True, extra_head=head, referrer='no-referrer')
    page('account.html', title='Your account - Merova', desc='Manage your Merova account.', noindex=True, extra_head=head, referrer='no-referrer', body='''
      <main id="main" class="account-shell" data-account-page="account"><div class="wrap account-grid">
        <section class="account-story"><p class="kicker">Merova / Your account</p><h1>What will you<br><em>make next?</em></h1><p>A starting point for your next idea.</p></section>
        <section class="account-card" aria-labelledby="account-title"><h2 id="account-title">Your account</h2><p role="status" aria-live="polite" class="account-status" data-auth-status>Checking your session…</p>
          <div data-private-view hidden><p class="account-help">Signed in as</p><p class="account-identity" data-account-email></p><hr>
          <h3>Have Merova build it</h3><p>Tell us what you are making. Scope, timeline and price are agreed before work starts.</p><a class="btn btn--primary" href="/services#enquire">Start a project</a>
          <section class="account-billing" data-billing aria-labelledby="billing-title">
            <p class="kicker">An idea, made real</p><h3 id="billing-title">Your project payment</h3>
            <p class="account-help">Pay an agreed project or milestone through Razorpay. This is a one-time payment, not a subscription.</p>
            <p class="account-status" role="status" aria-live="polite" data-billing-status></p>
            <form data-quote-find><label for="quote-find">Payment reference</label><input id="quote-find" name="quote" placeholder="plink_…" maxlength="46" autocomplete="off" required><button class="btn btn--ghost" type="submit">View payment request</button></form>
            <div data-billing-owner hidden>
              <details class="billing-create"><summary>Create a payment request</summary>
                <p class="account-help" data-billing-mode></p>
                <form data-quote-create>
                  <label for="quote-reference">Unique quote or milestone reference</label><input id="quote-reference" name="reference" minlength="3" maxlength="40" pattern="[A-Za-z0-9][A-Za-z0-9._\\/\\-]{2,39}" required aria-describedby="quote-reference-help"><p id="quote-reference-help" class="account-help">Reuse this reference if you retry. Use a new reference only for a different agreed payment.</p>
                  <label for="quote-customer">Customer account email</label><input id="quote-customer" name="email" type="email" maxlength="254" autocomplete="off" required>
                  <label for="quote-description">Agreed project or milestone scope</label><textarea id="quote-description" name="description" minlength="10" maxlength="1000" rows="3" required></textarea>
                  <label for="quote-total">Final total in INR, including applicable taxes</label><input id="quote-total" name="amount" type="text" inputmode="decimal" pattern="[0-9]{1,9}(\\.[0-9]{1,2})?" required>
                  <label for="quote-terms">Agreed payment and cancellation terms</label><textarea id="quote-terms" name="terms" minlength="10" maxlength="256" rows="3" required aria-describedby="quote-terms-help"></textarea><p id="quote-terms-help" class="account-help">Summarise the terms already agreed with this customer, including cancellation or refund arrangements. Maximum 256 characters.</p>
                  <label for="quote-days">Payment link valid for (days)</label><input id="quote-days" name="validDays" type="number" min="1" max="90" step="1" required>
                  <label class="account-check"><input name="agreed" type="checkbox" required><span>The customer and I have agreed this scope, final total and payment terms.</span></label>
                  <button class="btn btn--primary" type="submit">Create payment request</button>
                </form>
              </details>
            </div>
            <article class="billing-quote" data-quote hidden aria-labelledby="quote-heading">
              <p class="kicker" data-quote-state data-quote-value></p><h4 id="quote-heading" data-quote-reference data-quote-value></h4>
              <p class="billing-amount" data-quote-amount data-quote-value></p>
              <dl class="billing-details"><dt>For</dt><dd data-quote-email data-quote-value></dd><dt>Scope</dt><dd data-quote-description data-quote-value></dd><dt>Agreed terms</dt><dd data-quote-terms data-quote-value></dd><dt>Payment link expires</dt><dd data-quote-expiry data-quote-value></dd></dl>
              <button class="btn btn--primary" type="button" data-quote-pay hidden>Continue to Razorpay</button>
              <button class="account-resend" type="button" data-quote-refresh>Refresh payment status</button>
              <p class="account-help">Checkout takes place on Razorpay. Merova does not collect your card, bank or UPI credentials. This status records payment receipt; refunds and delivery are handled with the studio.</p>
              <div data-quote-share-wrap hidden><label for="quote-share">Customer link</label><input id="quote-share" data-quote-share type="text" readonly><button class="account-resend" type="button" data-quote-copy>Copy customer link</button><p class="account-help">Share only with the customer on this quote. They must sign in with that email to view it in Merova. This link does not send an email.</p></div>
              <a class="account-help" href="mailto:hello@merova.app">Ask about this payment</a>
            </article>
          </section>
          <div class="account-future"><p class="kicker">In development</p><h3>Build with AI</h3><p>The AI workspace, saved projects and subscriptions are being built. Creating an account or paying a project quote does not start an AI subscription.</p></div>
          <div class="account-security"><h3>Account security</h3><a href="/forgot-password">Reset your password</a><br>
          <button class="account-resend" type="button" data-signout="local">Sign out of this browser</button><br>
          <button class="account-resend" type="button" data-signout="global">Sign out of all devices</button>
          <p class="account-help">Signing out of all devices stops sessions from renewing. Existing access can continue briefly until it expires.</p></div></div>
          <p class="account-links"><a href="/login">Sign in</a> · <a href="/signup">Create an account</a></p>
          <noscript><p>Enable JavaScript to view your account.</p></noscript>
        </section></div></main>''')
