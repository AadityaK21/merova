# merova.app

Merova is an independent digital studio in India. The site introduces its website, interactive-site and web-app services, and accepts project enquiries. The portfolio is currently hidden (see below). Merova Fit is one of the studio's own products.

The production site is plain HTML, CSS and JavaScript. A Python script generates the pages; there is no front-end framework or bundler.

## Edit the source

| Path | Purpose |
| --- | --- |
| `tools/build.py` | Page content, shared header and footer, portfolio data, forms, sitemap, security.txt and brand-kit archive |
| `assets/css/style.css` | Design tokens, layout, responsive styling and motion |
| `assets/js/main.js` | Fold controls, menu, reversible scroll effects, sound, direction lab, project finder and form behaviour |
| `assets/fonts/` | Self-hosted Instrument Sans, Instrument Serif and IBM Plex Mono |
| `assets/work/`, `assets/fit/` | Portfolio and product images |
| `assets/og/` | Social link-preview images |
| `vercel.json` | Clean URLs, security headers and caching |
| `tools/tests/` | Browser regression and accessibility checks |
| `briefs/`, `AGENTS.md` | Project context and handoff notes, excluded from deployment |

Do not hand-edit root HTML files or `work/*.html`. Change `tools/build.py`, then regenerate them from the site root:

```powershell
python tools/build.py
```

Run the build after every CSS or JavaScript edit too. The generator puts content hashes into asset URLs; the production cache keeps CSS and JavaScript for a year, so the new hashes are necessary for visitors to receive changes.

## Preview locally

Install the development tools once, then start the preview server:

```powershell
cd tools
npm install
npm run serve
```

Open `http://localhost:8765`. Keep this terminal running while testing. The local server supports clean page URLs such as `/services` and applies the security headers from `vercel.json`. Do not preview by double-clicking an HTML file.

The project finder is at `/#services`. It recommends a service from the visitor's choice and carries a draft brief into `/services#enquire`. The visitor can edit the brief before submitting. Use the direct enquiry link when guidance is not needed.

The direction lab at `/#direction-lab` compares three compositions of the same fictional studio concept, with desktop and phone previews. "Use this direction" adds the choice to the optional finder note without replacing the visitor's writing. It uses local HTML/CSS and no external services.

## Check changes

With the preview server running, use another terminal:

```powershell
cd tools
npx playwright install chromium
npm test
npm run test:finder
npm run test:lab
npm run axe
```

If using an existing Chrome installation, set `CHROME_PATH` before the checks. Set `BASE_URL` to test a different preview address.

```powershell
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:BASE_URL = 'http://localhost:8765'
```

Check desktop at 1440 by 1000, tablet at 1024 by 768 and mobile at 390 by 844. Verify two complete down-and-up scroll cycles, Fold controls after scrolling, menu focus and closing, reduced motion, sound on and off, form validation, project-finder handoff, and horizontal overflow. Check the browser console and CSP errors. Report actual results and any checks that could not run; historical handoff results are not evidence for a new change.

## Design and content

- Near-black `#090909`, warm ivory `#F1EFE9` and neutral secondary text. Product screenshots retain their own colours.
- Instrument Sans for text and interface labels; Instrument Serif for selected display moments; IBM Plex Mono for technical readouts.
- The two-plane Fold is the signature interaction. Scroll progress changes its unfolding, while the user's controls own its angle.
- Scroll effects must reproduce the same state at the same scroll position in either direction. Respect reduced motion.
- The scroll renderer shares one animation frame and reads cached layout positions. Refresh geometry on layout, font, resize and page-restoration events; keep layout reads out of the scroll paint phase.
- Sound is off by default and starts only after a visitor chooses to enable it.
- **Portfolio switch:** `SHOW_WORK = False` near the top of `tools/build.py` hides Work everywhere (navigation, home teaser, finder preview, `/work` and the case pages, sitemap). `vercel.json` temporarily redirects `/work` and `/work/*` to the home page. To show the work again: set `SHOW_WORK = True`, remove the two `redirects` in `vercel.json`, rebuild, and run the tests (they follow the switch).
- Keep all portfolio items labelled `Self-initiated` until real client work is approved for publication. Do not invent clients, testimonials, prices, outcomes or product capabilities.
- Keep the owner's personal name off marketing pages and use plain English without em dashes.

## Forms and configuration

### Customer accounts

`/signup`, `/login`, `/forgot-password`, `/reset-password` and `/account` use Supabase Auth. Page markup is generated by `tools/auth_pages.py`, called from `tools/build.py`. `tools/auth-client.js` is bundled with the pinned Supabase SDK into `assets/js/account.js`; only account pages load it. The public project URL and publishable key are browser-safe configuration. No privileged key is used.

After editing auth JavaScript, run `npm run build` from `tools/` to bundle and regenerate versioned pages. `npm run test:auth` defaults to a preview on port 8767 and mocks all account mutations. Start that preview with `PORT=8767` in the server environment. Email/password confirmation uses PKCE, so email links must open in the browser that requested them. Account details are displayed only after `getUser()` verifies the session with Supabase.

The owner must configure Site URL `https://merova.app` and redirects `https://merova.app/account`, `https://merova.app/reset-password`, `http://localhost:8767/account` and `http://localhost:8767/reset-password` in Supabase. Enable email confirmation and configure a verified transactional email sender for public signup. Test real inbox confirmation and recovery before publishing. Keep Resend credentials only in Supabase SMTP settings.

Password creation and reset require at least 8 characters, uppercase and lowercase ASCII letters, a digit and a supported symbol. `tools/password-policy.js` drives the form validation and live checklist; confirmation must match. Login intentionally continues to accept existing passwords. In Supabase's Email provider settings, set minimum length to 8 and choose the uppercase/lowercase/digits/symbols option so direct API calls enforce the same rules. The owner confirmed saving these settings, Secure password change and Secure email change on 1 November 2026; the public key cannot independently inspect administrative policy configuration. When Supabase requires reauthentication, the reset page explains how to request a fresh email reset link rather than bypassing that check.

Auth routes use `no-store`, `no-referrer` and noindex headers, with a matching referrer meta tag. Signout and page exit clear private DOM content and password fields; returning to an account page rechecks the session. Customers can sign out globally, and successful password resets request global signout. Supabase revokes refresh tokens, while already-issued access tokens can remain usable until expiry. Failed server signout is reported without claiming other sessions were revoked. Run `npm run test:auth-security` for password rejection, response headers, storage checks, signout failures, browser-back and cross-tab checks. All automated account mutations are mocked.

Password hashing is handled by Supabase, not custom browser cryptography. This static client still keeps the Supabase session in browser storage, so the restrictive CSP and avoiding untrusted scripts remain important. Before adding saved projects or paid AI endpoints, enforce authorization and row-level policies on the server; hiding a page is not an authorization boundary. CAPTCHA and MFA are not implemented by this increment. Leaked-password protection requires a supported Supabase plan and has not been enabled or verified here. See https://supabase.com/docs/guides/auth/password-security and https://supabase.com/docs/guides/auth/sessions.

Accounts are stored in Supabase Auth's Users area. Saved projects, AI generation and payments are not implemented in this increment. The account page labels them as in development. These static pages contain no private customer data; adding project records later requires database access policies and backend authorization, not just hiding UI.

Project enquiries, contact messages and update sign-ups use Web3Forms. Its access key in `assets/js/main.js` is public by design. Never add payment secrets, email-service secrets or database credentials to browser code.

The main project address is `hello@merova.app`. Project scope, timeline and price are agreed after a conversation.

`RAZORPAY_PAYMENT_URL` in `tools/build.py` is intentionally empty until the owner supplies a real payment link. A configured link belongs only in the separate agreed-quote section on the services page.

Business address, court city, pricing and legal-policy placeholders need confirmed facts from the owner. Keep visible placeholders until those facts are supplied; do not treat the current policy text as a completed legal review.

## Hosting and publication

The handoff identifies Vercel as the production host and `main` in [AadityaK21/merova](https://github.com/AadityaK21/merova) as the deployment branch. A push to `main` can publish the site. Commit and push only with the owner's approval. Changes to DNS, email, payments or the hosting plan also need prior approval.

The supplied `C:\merova` working folder contains copied files and has no `.git` directory. Releases use a separate authenticated clone of this repository. Copy only reviewed source changes into that clone, regenerate the pages there, and inspect the diff before committing. Keep the clone's optimized images and fonts. Do not replace the working folder with a forced checkout or reset.

`.vercelignore` excludes `AGENTS.md`, `README.md`, `tools/` and `briefs/` from deployment. Keep these exclusions. The `CNAME` and `.nojekyll` files are retained from the older GitHub Pages setup; they are not instructions to change DNS or turn Pages back on.

The CSP allows local scripts, styles, fonts and images, with form requests to Web3Forms. Keep runtime JavaScript and CSS in external local files. Any new external service needs an explicit configuration and approval review before deployment.
