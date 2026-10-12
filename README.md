# merova.app

The website for Merova. Plain HTML, CSS and a little JavaScript. No build step, no frameworks.

## What's in this folder

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, what Merova is, the apps (Merova Fit + next app), launch waitlist, FAQ |
| `about.html` | The solo-founder story |
| `contact.html` | Emails, business details and the contact form |
| `privacy.html` | Privacy policy (Razorpay + Play Store) |
| `terms.html` | Terms of service |
| `refund.html` | Refund and cancellation policy (7-day window) |
| `shipping.html` | Shipping and delivery policy |
| `delete-account.html` | Account deletion page (Play Store asks for this URL) |
| `404.html` | "Page not found" page (GitHub Pages uses it automatically) |
| `assets/css/style.css` | All styles. Colours and fonts are at the top |
| `assets/js/main.js` | Mobile menu, form sending (contact + waitlist), copy buttons, motion. **The Web3Forms key goes at the top of this file** |
| `assets/fonts/` | Sora and IBM Plex Mono, self-hosted (no Google Fonts requests) |
| `assets/brand/` | Logos, icons and the link-preview image from the logo kit |
| `CNAME` | Tells GitHub Pages the site lives at merova.app |
| `.nojekyll` | Tells GitHub Pages to serve files as they are |
| `site.webmanifest`, `robots.txt`, `sitemap.xml`, favicons | SEO and icons |

## Preview on your computer

Links use clean addresses (merova.app/about, not about.html), so preview with a server that understands them. Open the folder in a terminal and run:

```
npx serve .
```

Then open the address it prints (usually http://localhost:3000). Don't double-click the files: links like /about only work through a server, just like on the live site.

## Fill these in before launch

Every blank on the site looks like `[THIS]` with a dashed box around it. Search the folder for `[` to find them all.

| Placeholder | Where | Why it matters |
| --- | --- | --- |
| `[BUSINESS ADDRESS]` | contact, privacy, terms, refund, shipping | **Razorpay checks for an address** |
| `[PHONE, optional]` | contact | Razorpay likes a phone number; delete the row if you don't want one public |
| `[CITY]` | terms | City whose courts handle disputes (e.g. New Delhi) |
| `[PRICING TBD]` | index, terms | Razorpay wants prices visible somewhere (the app is fine too) |
| `[IN-APP PATH ...]` | refund, delete-account | Where Cancel plan / Delete account sits in the app |
| `[CHECK THIS LIST MATCHES THE QUIZ]` | privacy | Make the list match the real onboarding questions |
| `[24 hours]`, `[7]`, returns rule | refund | Call cancellation window and shop return rules |
| Shipping table, `[CALL METHOD ...]` | shipping | If you only sell digital things, delete section 03 (there's a note in the file) |
| `[90]`, `[30]` | privacy, delete-account | How long logs and backups are kept |
| Web3Forms key | assets/js/main.js | Done. One key powers both the contact form and the waitlist |

Also confirm `hello@`, `support@` (and `billing@` if you want it) are added as aliases in admin.google.com before going live.

## Turn on the contact form and waitlist (Web3Forms, free)

1. Go to https://web3forms.com and enter `hello@merova.app`.
2. They email you an access key.
3. At the top of `assets/js/main.js`, replace `YOUR_WEB3FORMS_ACCESS_KEY` with that key.
4. Send yourself a test message and a test waitlist sign-up from the live site. Waitlist sign-ups arrive as emails titled "Waitlist sign-up from merova.app".

The Web3Forms key is meant to be public, so it's fine in the code. Until the key is in, both forms tell visitors to email hello@merova.app instead.

## What moves on the site

- The Fold mark in the hero draws itself on load, leans toward the pointer and opens up as you scroll.
- The Merova Fit phone drawing plays once (day score fills, workouts tick, water fills) when it scrolls into view.
- Pages crossfade when you click between them (Chrome, Edge and Safari; other browsers just load normally).
- FAQ answers slide open.
- Everything is switched off for visitors who ask their device for reduced motion.

## Security on the site

- Every page has a Content Security Policy: only files from merova.app run, and forms can only send to Web3Forms.
- No trackers, no third-party scripts or fonts, nothing loaded from other sites.
- No secrets anywhere in the code. The only key (Web3Forms) is public by design.

## Editing the header or footer

The header and footer are copied into every page (that's the price of having no build step). To change one, use VS Code: **Edit > Replace in Files** across the folder.

---

## Put it online with GitHub Pages (free)

### Step 1: Connect your folder to GitHub

The site is already pushed to the `main` branch of github.com/AadityaK21/merova. To link `C:\merova` to it (one time), run this from `C:\merova`:

```
git init
git remote add origin https://github.com/AadityaK21/merova.git
git fetch origin
git checkout -f -B main --track origin/main
```

After that, every change you make goes live with:

```
git add .
git commit -m "Describe the change"
git push
```

### Step 2: Turn on Pages

1. Open github.com/AadityaK21/merova > **Settings** > **Pages**.
2. Source: **Deploy from a branch**. Branch: **main**, folder **/ (root)**. Save.
3. Custom domain: type `merova.app` and Save. (The `CNAME` file already says this.)

A private repo works for Pages because your student pack gives you GitHub Pro.

### Step 3 (recommended): Verify the domain

This stops anyone else from ever pointing merova.app at their own GitHub site.

1. Your GitHub profile > **Settings** > **Pages** > **Add a domain** > `merova.app`.
2. GitHub shows a TXT record named like `_github-pages-challenge-AadityaK21`. Add it at Name.com (see the table below), then click **Verify**.

This is a **new** TXT record with its own name. It doesn't touch your email TXT records.

### Step 4: DNS records at Name.com

Name.com > My Domains > merova.app > **Manage DNS Records**.

**Before adding anything, look at what's already there.** Name.com sometimes adds default "parking" records on `@`, `www` or `*` (A, ALIAS, CNAME or URL forwarding). Those clash with GitHub Pages and are the only records that should be removed. If you're unsure which ones they are, send a screenshot first.

**Add these.** In Name.com, leave **Host** empty for the root domain (`@`). TTL 300 is fine.

| Type | Host | Answer / value |
| --- | --- | --- |
| A | *(empty)* | `185.199.108.153` |
| A | *(empty)* | `185.199.109.153` |
| A | *(empty)* | `185.199.110.153` |
| A | *(empty)* | `185.199.111.153` |
| AAAA | *(empty)* | `2606:50c0:8000::153` |
| AAAA | *(empty)* | `2606:50c0:8001::153` |
| AAAA | *(empty)* | `2606:50c0:8002::153` |
| AAAA | *(empty)* | `2606:50c0:8003::153` |
| CNAME | `www` | `aadityak21.github.io` |
| TXT | `_github-pages-challenge-AadityaK21` | *(the code GitHub shows you in Step 3)* |

**Never touch these (your Google Workspace email):**

| Type | Host | Value |
| --- | --- | --- |
| MX | *(empty)* | `smtp.google.com` (priority 1) |
| TXT | *(empty)* | `v=spf1 include:_spf.google.com ~all` |
| TXT | `google._domainkey` | Google DKIM key |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:aaditya@merova.app` |

A and MX records for the same host live side by side without any problem, so the website and email won't affect each other.

**Later, for Merova Fit:** a `CNAME` for `fit` pointing at wherever the Merova Fit front end is hosted. Don't add it until that's decided.

Don't add a wildcard (`*`) record. GitHub warns it makes domain takeover possible.

### Step 5: HTTPS

`.app` domains only work over HTTPS (browsers force it). After DNS is in place, GitHub creates a certificate for you, which can take from a few minutes to about an hour. Until then the site may show a security error. That's expected.

Once it's ready, go back to **Settings > Pages** and tick **Enforce HTTPS**.

### Step 6: Check it works

- https://merova.app and https://www.merova.app both open the site
- https://merova.app/privacy opens the privacy policy (no `.html` needed)
- Send an email to hello@merova.app from another account. It should still arrive.
- Add merova.app to Google Search Console and submit `https://merova.app/sitemap.xml`

---

## Links you'll need elsewhere

| For | URL |
| --- | --- |
| Razorpay website review | https://merova.app (About, Contact, Privacy, Terms, Refund, Shipping are all linked in the footer) |
| Play Console: privacy policy | https://merova.app/privacy |
| Play Console: account deletion | https://merova.app/delete-account |

## App emails (later)

OTP codes and receipts should go through Resend from a subdomain like `send.merova.app`, not Gmail. Resend will give you its own records (on the `send` subdomain and a `resend._domainkey` key). They don't clash with the Google records, but check with me before adding them.
