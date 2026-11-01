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
          <div class="account-future"><p class="kicker">In development</p><h3>Build with AI</h3><p>The AI workspace, saved projects and subscriptions are being built. Your account does not start a subscription and there is nothing to pay here yet.</p></div>
          <div class="account-security"><h3>Account security</h3><a href="/forgot-password">Reset your password</a><br>
          <button class="account-resend" type="button" data-signout="local">Sign out of this browser</button><br>
          <button class="account-resend" type="button" data-signout="global">Sign out of all devices</button>
          <p class="account-help">Signing out of all devices stops sessions from renewing. Existing access can continue briefly until it expires.</p></div></div>
          <p class="account-links"><a href="/login">Sign in</a> · <a href="/signup">Create an account</a></p>
          <noscript><p>Enable JavaScript to view your account.</p></noscript>
        </section></div></main>''')
