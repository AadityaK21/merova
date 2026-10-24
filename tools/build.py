#!/usr/bin/env python3
"""Generates the static Merova pages (shared head/header/footer) into the repo.
Private helper: the output is plain HTML, no build step needed on the site."""
import pathlib, re, sys

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent)
UPDATED = "12 October 2026"
SITE = "https://merova.app"
# Portfolio switch. False hides Work everywhere: nav, home teaser, /work and the case pages
# (vercel.json sends /work to the home page). Set True and rebuild to bring it back.
SHOW_WORK = False

def ph(text):
    return f'<span class="ph">[{text}]</span>'

ADDRESS = ph("BUSINESS ADDRESS")
CITY = ph("CITY")


# ---------------------------------------------------------------- v4 helpers
import html as _html

def _lockup_parts():
    raw = (OUT / "assets/brand/merova-lockup-horizontal-bone.svg").read_text()
    vb = re.search(r'viewBox="([^"]+)"', raw).group(1)
    g = re.search(r'<g transform="([^"]+)"', raw).group(1)
    d = re.search(r'<path transform="([^"]+)" fill="[^"]+" d="([^"]+)"', raw)
    return vb, g, d.group(1), d.group(2)

def _lockup_svg(cls, w, h):
    """The horizontal lockup inlined (fills follow currentColor), so the planes can move."""
    vb, g, pt, pd = _lockup_parts()
    return (f'<svg class="{cls}" viewBox="{vb}" width="{w}" height="{h}" aria-hidden="true" focusable="false">'
            f'<g transform="{g}"><polygon class="lk-r" points="84,78 84,22 42,64 42,78"/>'
            f'<polygon class="lk-l" points="16,78 16,22 58,64 58,78"/></g>'
            f'<path transform="{pt}" d="{pd}"/></svg>')

def _wordmark_svg(cls):
    """Just the 'merova' letters of the lockup, for the oversized footer."""
    vb, g, pt, pd = _lockup_parts()
    x0 = 971.84
    return (f'<svg class="{cls}" viewBox="{x0 - 20:.2f} -600 {4813.54 - 146.85 - x0 + 40:.2f} 640" preserveAspectRatio="xMinYMax meet" '
            f'aria-hidden="true" focusable="false"><path transform="{pt}" d="{pd}"/></svg>')

def pixel_icon(rows, cls="px"):
    """12x12 pixel micro-icon from a bitmap ('#' = on), drawn as one crisp path."""
    parts = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if row[x] == "#":
                x0 = x
                while x < len(row) and row[x] == "#":
                    x += 1
                parts.append(f"M{x0} {y}h{x - x0}v1h-{x - x0}z")
            else:
                x += 1
    return (f'<svg class="{cls}" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true" focusable="false">'
            f'<path d="{"".join(parts)}"/></svg>')

PX = {
 "plan": ["....####....", ".###....###.", ".#........#.", ".#......#.#.", ".#.....#..#.", ".#.#..#...#.",
          ".#..##....#.", ".#........#.", ".#.######.#.", ".#........#.", ".##########.", "............"],
 "meals": ["............", "....#..#....", "...#..#.....", "....#..#....", "............", "############",
           ".#........#.", ".#........#.", "..#......#..", "...######...", "....####....", "............"],
 "water": [".....##.....", "....#..#....", "....#..#....", "...#....#...", "..#......#..", "..#......#..",
           ".#........#.", ".#.#......#.", ".#.#......#.", "..#.#....#..", "...#....#...", "....####...."],
 "weight": ["............", "........####", "..........##", ".........#.#", "........#..#", "...#...#....",
            "..#.#.#.....", ".#...#......", "#...........", "............", "############", "............"],
 "score": ["....####....", "..##....##..", ".#........#.", ".#........#.", "#....##....#", "#...####...#",
           "#...####...#", "#....##....#", ".#........#.", ".#........#.", "..##....##..", "....####...."],
 "goals": [".##########.", "#.#......#.#", "#.#......#.#", ".##......##.", "..#......#..", "...#....#...",
           "....#..#....", ".....##.....", ".....##.....", "....####....", "...######...", "............"],
 "chat": [".##########.", "#..........#", "#..........#", "#.##.##.##.#", "#..........#", "#..........#",
          ".####.#####.", "....#.#.....", "....##......", "....#.......", "............", "............"],
 "calls": ["..#......#..", "############", "#..........#", "############", "#..........#", "#.##.##.##.#",
           "#..........#", "#.##.##....#", "#..........#", "############", "............", "............"],
 "one": ["............", "....###.....", "...####.....", "..##.##.....", ".....##.....", ".....##.....",
         ".....##.....", ".....##.....", ".....##.....", "..########..", "............", "............"],
 "minimal": ["############", "#..........#", "#..........#", "#..........#", "#..........#", "#..######..#",
             "#..........#", "#..........#", "#..........#", "#..........#", "############", "............"],
 "person": ["....####....", "...#....#...", "...#....#...", "...#....#...", "....####....", "............",
            "..########..", ".#........#.", "#..........#", "#..........#", "############", "............"],
 "web": ["############", "#..........#", "############", "#..........#", "#..........#", "#..........#",
         "#..........#", "#..........#", "#..........#", "############", "............", "............"],
 "phone": ["..########..", "..#......#..", "..#.####.#..", "..#......#..", "..#......#..", "..#......#..",
           "..#......#..", "..#......#..", "..#..##..#..", "..#......#..", "..########..", "............"],
 "lock": ["....####....", "...#....#...", "...#....#...", "..########..", "..#......#..", "..#..##..#..",
          "..#..##..#..", "..#......#..", "..#......#..", "..########..", "............", "............"],
 "grid": ["#####..#####", "#...#..#...#", "#...#..#...#", "#####..#####", "............", "............",
          "#####..#####", "#...#..#...#", "#...#..#...#", "#####..#####", "............", "............"],
}

def kicker(num, text):
    return f'<p class="kicker"><span class="kicker__n">{num}</span>{text}</p>'

SCREENS = [
    ("home", "Today", "Your whole day on one screen.",
     "A day score out of 100 sums up what you've logged: your workout, your calories and your water. Your next live class sits right at the top.",
     "Merova Fit home screen: day score 59 out of 100, 3 of 5 exercises done and 800 of 1500 kcal logged."),
    ("train", "Train", "Today's session, move by move.",
     "Every exercise with its sets and reps. Tick them off and watch the session fill up.",
     "Merova Fit workout screen: Lower Body Burn, 60% done, with Goblet Squats, Romanian Deadlift and Walking Lunges ticked off."),
    ("eat", "Eat", "Food, counted without the fuss.",
     "Calories left, protein, carbs and fat at a glance, and each meal of your plan logged with one tap.",
     "Merova Fit nutrition screen: 700 kcal left today, with breakfast and lunch logged."),
]

def phone(base="", eager=False, cls="", only=None):
    """A phone with the real Merova Fit screens stacked inside (the script switches between them)."""
    items = SCREENS if only is None else [s for s in SCREENS if s[0] == only]
    imgs = []
    for i, (k, _, _, _, alt) in enumerate(items):
        on = " is-on" if i == 0 else ""
        hidden = "" if i == 0 else ' aria-hidden="true"'
        lazy = "" if (eager and i == 0) else ' loading="lazy"'
        imgs.append(f'<img class="phone__screen{on}" src="{base}assets/fit/screen-{k}.webp" alt="{_html.escape(alt)}" '
                    f'width="480" height="967" decoding="async"{lazy}{hidden} data-screen="{k}">')
    return (f'<div class="phone {cls}"><div class="phone__frame"><div class="phone__glass">{"".join(imgs)}</div></div></div>')

def product_story(base=""):
    steps = "\n".join(f"""            <li class="story__step{' is-active' if i == 0 else ''}" data-screen="{k}">
              <p class="story__n"><span>0{i + 1}</span>{name}</p>
              <h3 class="story__title">{title}</h3>
              <p class="story__text">{text}</p>
              <div class="story__shot">{phone(base, only=k, cls="phone--inline")}</div>
            </li>""" for i, (k, name, title, text, _) in enumerate(SCREENS))
    return f"""<div class="story" data-story>
          <div class="story__stage" aria-hidden="true">{phone(base)}<p class="story__note">Real screens from the app, with demo data.</p></div>
          <ol class="story__steps" role="list">
{steps}
          </ol>
        </div>"""

# ---------------------------------------------------------------- the Fold, as an object
FOLD3D = """<div class="fold3d" data-fold>
          <div class="fold3d__scene" tabindex="0" role="slider" aria-label="Turn the Merova mark"
               aria-valuemin="-70" aria-valuemax="70" aria-valuenow="-18" aria-valuetext="Turned 18 degrees left" aria-describedby="fold-help" data-cursor="Drag to turn">
            <svg class="fold3d__plan" viewBox="0 0 100 86" aria-hidden="true" focusable="false">
              <g class="plan__lines">
                <path pathLength="1" d="M4 69.68H96"/>
                <path pathLength="1" class="plan__dash" d="M20 20.27H80V69.68H20Z"/>
                <path pathLength="1" d="M14 14.27L69.41 69.68"/>
                <path pathLength="1" d="M86 14.27L30.59 69.68"/>
                <path pathLength="1" class="plan__dash" d="M50 9V76"/>
                <path pathLength="1" d="M20 28.27A8 8 0 0 0 25.66 25.93"/>
                <path pathLength="1" d="M20 11.5V13.5M80 11.5V13.5M20 12.5H80"/>
                <path pathLength="1" d="M11 20.27H13M11 69.68H13M12 20.27V69.68"/>
              </g>
              <circle class="plan__node" cx="50" cy="50.27" r=".9"/>
              <g class="plan__labels">
                <text x="26.6" y="33">45°</text>
                <text x="50" y="10.6" text-anchor="middle">68</text>
                <text x="9.6" y="46" text-anchor="end">56</text>
                <text x="82.5" y="19.6">B · 42%</text>
                <text x="17.5" y="19.6" text-anchor="end">A</text>
              </g>
            </svg>
            <div class="fold3d__ground" aria-hidden="true"><i class="fold3d__pool"></i><i class="fold3d__shadow"></i><i class="fold3d__contact"></i></div>
            <div class="fold3d__obj">
              <div class="plane plane--r"><i class="plane__edge"></i><i class="plane__face"></i></div>
              <div class="plane plane--l"><i class="plane__edge"></i><i class="plane__face"></i></div>
            </div>
          </div>
          <div class="fold3d__hud">
            <p class="hud__fig">Fig. 01 <span>The Fold</span></p>
            <p class="hud__read" aria-hidden="true"><span class="hud__dot"></span><span class="hud__angle" data-angle>&minus;18°</span><span class="hud__state" data-state>Drag to turn</span></p>
            <div class="hud__keys"><button class="hud__btn" type="button" data-fold="align">Line up</button><button class="hud__btn" type="button" data-fold="reset">Reset</button></div>
          </div>
          <p class="visually-hidden" id="fold-help">Two planes form the Merova mark. Drag sideways, or use the left and right arrow keys, to turn them. Press Home, or Line up, to see them line up into the logo. Press End, or Reset, to return to the resting angle of 18 degrees left.</p>
        </div>"""

# ---------------------------------------------------------------- shared parts
HEAD = """<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%%TITLE%%</title>
<meta name="description" content="%%DESC%%">
<link rel="canonical" href="%%URL%%">%%ROBOTS%%
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com; form-action 'self' https://api.web3forms.com; base-uri 'self'; object-src 'none'; upgrade-insecure-requests">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#090909">
<meta name="color-scheme" content="dark light">
<link rel="icon" href="%%B%%favicon.ico" sizes="any">
<link rel="icon" href="%%B%%favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="%%B%%apple-touch-icon.png">
<link rel="manifest" href="%%B%%site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Merova">
<meta property="og:title" content="%%OGTITLE%%">
<meta property="og:description" content="%%DESC%%">
<meta property="og:url" content="%%URL%%">
<meta property="og:image" content="https://merova.app/assets/og/%%OGIMG%%.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="%%OGTITLE%%">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="%%OGTITLE%%">
<meta name="twitter:description" content="%%DESC%%">
<meta name="twitter:image" content="https://merova.app/assets/og/%%OGIMG%%.png">
<link rel="preload" href="%%B%%assets/fonts/instrument-sans-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="%%B%%assets/fonts/instrument-serif-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="%%B%%assets/fonts/instrument-serif-400-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="%%B%%assets/css/style.css">
<script src="%%B%%assets/js/main.js" defer></script>%%EXTRAHEAD%%
</head>
<body>
"""

SOUND_BTN = """<button class="sound-toggle" type="button" aria-pressed="false" data-sound-toggle>
        <span class="sound-toggle__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span data-sound-label>Sound off</span>
      </button>"""

import hashlib as _hashlib
def _ver(rel):
    """Content hash for cache-busting: a changed file gets a new URL, so no visitor ever runs stale CSS or JS."""
    return _hashlib.sha1((OUT / rel).read_bytes()).hexdigest()[:10]
HEAD = (HEAD.replace('assets/css/style.css"', 'assets/css/style.css?v=' + _ver("assets/css/style.css") + '"')
            .replace('assets/js/main.js"', 'assets/js/main.js?v=' + _ver("assets/js/main.js") + '"'))

FOOT_WORK = '          <li><a href="/work">Work</a></li>\n' if SHOW_WORK else ""

def header(active, b):
    def cur(name):
        return ' aria-current="page"' if active == name else ""
    items = [("home", "/", "Home")] + ([("work", "/work", "Work")] if SHOW_WORK else []) + [("services", "/services", "Services"),
             ("about", "/about", "Studio"), ("contact", "/contact", "Contact")]
    BAR_WORK = f'      <a class="bar__link" href="/work"{cur("work")}>Work</a>\n' if SHOW_WORK else ""
    menu_items = "\n".join(
        f'          <li><a href="{href}"{cur(key)}><span class="menu__n">0{i + 1}</span><span class="menu__t">{label}</span><span class="menu__a" aria-hidden="true">→</span></a></li>'
        for i, (key, href, label) in enumerate(items))
    return f"""<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="Merova home">{_lockup_svg("brand__logo", 108, 22)}</a>
    <div class="bar__right">
{BAR_WORK}      <a class="bar__link" href="/services"{cur('services')}>Services</a>
      <a class="bar__link bar__link--cta" href="/services#enquire">Start a project <span aria-hidden="true">↗</span></a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-open>
        <span class="menu-btn__label">Menu</span><span class="menu-btn__icon" aria-hidden="true"><i></i><i></i></span>
      </button>
    </div>
  </div>
</header>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Site menu" hidden>
  <div class="menu__scrim" data-menu-close></div>
  <div class="menu__panel">
    <div class="menu__top">
      <p class="menu__label">Menu</p>
      <button class="menu__close" type="button" data-menu-close>Close <span aria-hidden="true">×</span></button>
    </div>
    <nav aria-label="Main">
      <ol class="menu__list" role="list">
{menu_items}
      </ol>
    </nav>
    <div class="menu__foot">
      <div><p class="menu__label">Product</p><a href="/fit">Merova Fit</a><a href="https://fit.merova.app">Open the app <span aria-hidden="true">↗</span></a></div>
      <div><p class="menu__label">New project</p><a href="mailto:hello@merova.app">hello@merova.app</a><a href="/services#enquire">Start a project <span aria-hidden="true">↗</span></a></div>
      <div><p class="menu__label">Sound</p>{SOUND_BTN}</div>
    </div>
  </div>
</div>
"""

def footer(b):
    return f"""<footer class="site-footer">
  <div class="wrap">
    <div class="footer__top">
      <div class="footer__lead">
        <p class="footer__line">Digital work,<br>made with intention.</p>
        <a class="footer__mail" href="mailto:hello@merova.app">hello@merova.app</a>
      </div>
      <nav class="footer__col" aria-label="Studio">
        <h2>Studio</h2>
        <ul>
          <li><a href="/">Home</a></li>
{FOOT_WORK}          <li><a href="/services">Services</a></li>
          <li><a href="/about">Studio</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/brand">Brand kit</a></li>
        </ul>
      </nav>
      <nav class="footer__col" aria-label="Products">
        <h2>Products</h2>
        <ul>
          <li><a href="/fit">Merova Fit</a></li>
          <li><a href="https://fit.merova.app">Open the app ↗</a></li>
        </ul>
        <h2 class="footer__h2b">Legal</h2>
        <ul>
          <li><a href="/privacy">Privacy policy</a></li>
          <li><a href="/terms">Terms of service</a></li>
          <li><a href="/refund">Refunds</a></li>
          <li><a href="/shipping">Shipping and delivery</a></li>
          <li><a href="/delete-account">Delete your account</a></li>
        </ul>
      </nav>
      <div class="footer__col">
        <h2>Email</h2>
        <ul>
          <li><a href="mailto:hello@merova.app">hello@merova.app</a><small>projects and general</small></li>
          <li><a href="mailto:support@merova.app">support@merova.app</a><small>help with Merova Fit</small></li>
        </ul>
        <h2 class="footer__h2b">Sound</h2>
        {SOUND_BTN}
      </div>
    </div>
    <a class="footer__mark" href="/" aria-label="Merova home">{_wordmark_svg("footer__word")}</a>
    <div class="footer__base">
      <p>&copy; 2026 Merova</p>
      <p>An independent digital studio, India.</p>
      <a class="to-top" href="#main">Back to top <span aria-hidden="true">↑</span></a>
    </div>
  </div>
</footer>
</body>
</html>
"""

PAGES = ("about", "services", "contact", "fit", "brand", "privacy", "terms", "refund", "shipping", "delete-account")


def clean_links(html: str) -> str:
    """Link to merova.app/about instead of merova.app/about.html (GitHub Pages serves both)."""
    html = re.sub(r'href="/?index\.html(#[^"]*)?"', lambda m: f'href="/{m.group(1) or ""}"', html)
    return re.sub(r'href="/?(%s)\.html(#[^"]*)?"' % "|".join(PAGES),
                  lambda m: f'href="/{m.group(1)}{m.group(2) or ""}"', html)


def add_arrows(html: str) -> str:
    """Give every button a small arrow that nudges on hover: external, down (same page, download) or forward."""
    def arrow_for(tag):
        if "download" in tag or 'href="#' in tag:
            return "↓"
        if 'href="http' in tag or 'href="mailto:' in tag or '#enquire"' in tag:
            return "↗"
        return "→"
    def fix(m):
        tag, inner = m.group(1), m.group(2)
        if "btn__arrow" in inner or "btn--sm" in tag:
            return m.group(0)
        return f'{tag}{inner}<span class="btn__arrow" aria-hidden="true">{arrow_for(tag)}</span></{m.group(3)}>'
    return re.sub(r'(<(?:a|button) class="btn[^"]*"[^>]*>)(.*?)</(a|button)>', fix, html, flags=re.S)


def page(filename, *, title, desc, body, active="", og_title=None, base="", noindex=False, extra_head="", canonical=None, og=None):
    if not SHOW_WORK and (filename == "work.html" or filename.startswith("work/")):
        return  # portfolio hidden: no /work pages are written
    path = canonical if canonical is not None else ("/" if filename == "index.html" else "/" + filename.replace(".html", ""))
    slug = "home" if filename == "index.html" else filename.replace(".html", "")
    og_img = og or (slug if (OUT / "assets" / "og" / f"{slug}.png").exists() else "home")
    html = (HEAD
            .replace("%%OGIMG%%", og_img)
            .replace("%%TITLE%%", title)
            .replace("%%OGTITLE%%", og_title or title)
            .replace("%%DESC%%", desc)
            .replace("%%URL%%", SITE + path)
            .replace("%%ROBOTS%%", '\n<meta name="robots" content="noindex">' if noindex else "")
            .replace("%%EXTRAHEAD%%", extra_head)
            .replace("%%B%%", base))
    html += header(active, base)
    html += body.replace("%%B%%", base)
    html += footer(base)
    html = clean_links(html)
    html = add_arrows(html)
    (OUT / filename).parent.mkdir(parents=True, exist_ok=True)
    (OUT / filename).write_text(html, encoding="utf-8")
    print("wrote", filename, len(html))

def page_hero(title, lede=None, meta=None):
    parts = [f'<h1 class="display">{title}</h1>']
    if lede:
        parts.append(f'<p class="lede">{lede}</p>')
    if meta:
        parts.append(f'<p class="page-hero__meta">{meta}</p>')
    inner = "\n      ".join(parts)
    return f"""<section class="page-hero page-hero--doc">
    <div class="wrap page-hero__inner">
      <p class="kicker">Policies</p>
      {inner}
    </div>
  </section>
"""

LEGAL_DOCS = [
    ("privacy.html", "Privacy policy"),
    ("terms.html", "Terms of service"),
    ("refund.html", "Refunds and cancellations"),
    ("shipping.html", "Shipping and delivery"),
    ("delete-account.html", "Delete your account"),
]

def legal(filename, *, h1, title, desc, summary, sections, note=""):
    CUR = ' aria-current="page"'
    nav = "\n".join(
        f'            <li><a href="{f}"{CUR if f == filename else ""}>{n}</a></li>'
        for f, n in LEGAL_DOCS)
    toc = "\n".join(f'              <li><a href="#{i}">{t}</a></li>'
                     for i, t in re.findall(r'<h2 id="([a-z0-9-]+)">([^<]+)</h2>', sections))
    body = f"""<main id="main">
  <div class="read-progress" aria-hidden="true"></div>
  {page_hero(h1, meta=f"Last updated {UPDATED}")}
  <section class="s-light">
    <div class="wrap">
      <div class="legal">
        <aside class="legal-nav">
          <nav aria-label="Legal pages">
            <p class="split__label">Policies</p>
            <ul>
{nav}
            </ul>
          </nav>
          <nav class="toc" aria-label="On this page">
            <p class="split__label">On this page</p>
            <ol>
{toc}
            </ol>
          </nav>
        </aside>
        <article class="doc">{note}
          <div class="summary">
            {summary}
          </div>
{sections}
        </article>
      </div>
    </div>
  </section>
</main>
"""
    page(filename, title=title, desc=desc, body=body)

# ---------------------------------------------------------------- artwork
FOLD_SVG = """<svg class="fold" viewBox="2 6 96 86" role="img" aria-labelledby="fold-title">
          <title id="fold-title">Construction drawing of the Merova mark: two planes folded into an M, the right plane at 42% opacity.</title>
          <g class="guides">
            <line class="guide" x1="16" y1="8" x2="16" y2="90"/>
            <line class="guide" x1="42" y1="8" x2="42" y2="90"/>
            <line class="guide" x1="50" y1="8" x2="50" y2="90"/>
            <line class="guide" x1="58" y1="8" x2="58" y2="90"/>
            <line class="guide" x1="84" y1="8" x2="84" y2="90"/>
            <line class="guide" x1="2" y1="22" x2="98" y2="22"/>
            <line class="guide" x1="2" y1="64" x2="98" y2="64"/>
            <line class="guide" x1="2" y1="78" x2="98" y2="78"/>
          </g>
          <line class="diag" x1="6" y1="12" x2="72" y2="78" pathLength="1"/>
          <line class="diag" x1="94" y1="12" x2="28" y2="78" pathLength="1"/>
          <g class="fold-r"><g class="hinge hinge--r"><polygon class="plane plane--r" points="84,78 84,22 42,64 42,78" opacity=".42"/></g></g>
          <g class="fold-l"><g class="hinge hinge--l"><polygon class="plane plane--l" points="16,78 16,22 58,64 58,78"/></g></g>
          <g class="late">
            <path class="arc" d="M9 22 A7 7 0 0 1 11.05 17.05"/>
            <text x="8.2" y="19.4" text-anchor="end">45°</text>
            <circle class="node node--l" cx="16" cy="22" r=".9"/>
            <circle class="node node--r" cx="84" cy="22" r=".9"/>
            <g class="foldpt"><circle class="node node--halo" cx="50" cy="56" r="2.6"/><circle class="node node--fold" cx="50" cy="56" r="1.1"/>
            <text x="50" y="51.6" text-anchor="middle">fold</text></g>
            <line class="tick" x1="16" y1="81" x2="16" y2="84"/>
            <line class="tick" x1="42" y1="81" x2="42" y2="84"/>
            <line class="tick" x1="58" y1="81" x2="58" y2="84"/>
            <line class="tick" x1="84" y1="81" x2="84" y2="84"/>
            <line class="tick" x1="16" y1="82.5" x2="84" y2="82.5"/>
            <text x="29" y="88.4" text-anchor="middle">100%</text>
            <text x="50" y="88.4" text-anchor="middle">overlap</text>
            <text x="71" y="88.4" text-anchor="middle">42%</text>
          </g>
        </svg>"""


# A real postal address goes here once it's decided; until then the row is left out of the contact page.
REAL_ADDRESS = ""
ADDRESS_ROW = f'<div><dt>Address</dt><dd>{REAL_ADDRESS}</dd></div>' if REAL_ADDRESS else ""

# ---------------------------------------------------------------- HOME
NEXT_02 = """<svg class="next__art" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
              <g class="next__grid"><path d="M0 20H120M0 50H120M0 80H120M20 0V100M60 0V100M100 0V100"/></g>
              <polygon class="next__solid" points="22,86 22,30 64,72 64,86"/>
              <polygon class="next__ghost" points="98,86 98,14 50,62 50,86"/>
              <circle class="next__pin" cx="57" cy="65" r="1.6"/>
            </svg>"""
NEXT_03 = """<svg class="next__art" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
              <g class="next__grid"><path d="M0 20H120M0 50H120M0 80H120M20 0V100M60 0V100M100 0V100"/></g>
              <polygon class="next__ghost" points="30,86 30,22 72,64 72,86"/>
              <polygon class="next__ghost" points="92,86 92,40 62,70 62,86"/>
            </svg>"""

faq_items = [
    ("Who makes Merova Fit?", 'Merova, an independent digital studio in India. The person who builds the app also answers your support emails. <a class="link" href="about.html">More about the studio</a>.'),
    ("Can I use Merova Fit now?", 'Merova Fit runs on the web at <a class="link" href="https://fit.merova.app">fit.merova.app</a>, and is coming to Android through Google Play. Join the list above to hear when it lands there.'),
    ("How much does Merova Fit cost?", "Plans and prices are shown inside Merova Fit before you pay anything."),
    ("Is my data safe?", 'Merova only collects what an app needs to work and never sells your data. Payments go through Razorpay, so card and UPI details never reach us. The <a class="link" href="privacy.html">privacy policy</a> has the details.'),
    ("Can I get a refund?", 'Yes. Ask within 7 days of your first payment for a plan and you get your money back. See the <a class="link" href="refund.html">refund policy</a>.'),
    ("How do I delete my account?", 'From inside the app, or by emailing support@merova.app. Here’s <a class="link" href="delete-account.html">exactly what gets deleted</a>.'),
    ("How do I get help?", 'Email <a class="link" href="mailto:support@merova.app">support@merova.app</a>. It goes straight to the person who builds the app.'),
]
faq_html = "\n".join(f"""          <details class="faq__item">
            <summary><span>{q}</span><span class="faq__icon" aria-hidden="true"></span></summary>
            <div class="faq__body"><p>{a}</p></div>
          </details>""" for q, a in faq_items)

WAITLIST_FORM = """<form class="signup" data-form="waitlist" action="https://api.web3forms.com/submit" method="POST" novalidate>
          <input type="hidden" name="subject" value="Waitlist sign-up from merova.app">
          <input type="hidden" name="from_name" value="merova.app waitlist">
          <div class="hp" aria-hidden="true"><label>Leave this empty <input type="checkbox" name="botcheck" tabindex="-1"></label></div>
          <label class="signup__label" for="wl-email">Your email</label>
          <div class="signup__row">
            <input id="wl-email" name="email" type="email" autocomplete="email" required maxlength="200" placeholder="you@example.com" aria-describedby="wl-note">
            <button class="btn btn--primary" type="submit">Notify me</button>
          </div>
          <fieldset class="signup__opts">
            <legend>Tell me when</legend>
            <label class="check"><input type="checkbox" name="interest" value="Merova Fit on Android" checked><span>Merova Fit is on Android</span></label>
            <label class="check"><input type="checkbox" name="interest" value="The next Merova app" checked><span>The next app is out</span></label>
          </fieldset>
          <p class="form-status" role="status" aria-live="polite"></p>
          <p class="signup__note" id="wl-note">Only launch news, nothing else. Reply “stop” to any email to leave the list.</p>
        </form>"""



# ==========================================================================
# WORK: the one list the home grid, the /work index and the case pages are
# built from. To add a project (a client site, an app, an experiment), add an
# entry here plus its images in assets/work/, then a case_page() call below.
# `origin` must stay honest: "Self-initiated" for my own work, "Client" only
# for paid client work, and experiments keep kind="Experiment".
# ==========================================================================
WORK = [
    dict(slug="merova-fit", href="/fit", title="Merova Fit", kind="Product", category="Product", origin="Self-initiated",
         tags=["Web app", "Product"], year="2026", status="Live on the web",
         summary="A fitness coaching app: daily plans, meal and water logs, coach chat and payments, in one place.",
         visual="fit", alt="Three screens of the Merova Fit app: today, training and food."),
    dict(slug="company-hub", href="/work/company-hub", title="Company Hub", kind="Web application", category="Web app", origin="Self-initiated",
         tags=["Web app"], year=None, status="Live",
         summary="Company-wise LeetCode questions, ranked by how often companies really ask them.",
         visual="ch", alt="Company Hub's home page and its Google question list."),
    dict(slug="merova-site", href="/work/merova-site", title="merova.app", kind="Website and identity", category="Website", origin="Self-initiated",
         tags=["Website", "Identity"], year="2026", status="Live, you're on it",
         summary="The studio's own identity and website: a monochrome system, an interactive mark and a fast static build.",
         visual="site", alt="The Merova identity: wordmark, mark, colours and type."),
    dict(slug="the-fold", href="/work/the-fold", title="The Fold", kind="Experiment", category="Experiment", origin="Self-initiated",
         tags=["Experiment"], year="2026", status="Interactive experiment",
         summary="The Merova mark as an object you can turn. Two lit planes in CSS 3D, no libraries.",
         visual="fold", alt="The two planes of the Merova mark standing as sheets under a light."),
]

def work_label(w):
    return f'{w["category"]} · {w["origin"]}'

def work_visual(w, big=False):
    v = w["visual"]
    tag = f'<span class="wv__tag">{work_label(w)}</span>'
    if v == "fit":
        return f"""<div class="wv wv--fit" role="img" aria-label="{w['alt']}">
              {phone("/", only="train", cls="phone--wv phone--wv-l")}
              {phone("/", only="home", cls="phone--wv phone--wv-c")}
              {phone("/", only="eat", cls="phone--wv phone--wv-r")}
              {tag}
            </div>"""
    if v == "ch":
        return f"""<div class="wv wv--ch">
              <img class="wv__shot wv__shot--a" src="/assets/work/ch-home.webp" alt="{w['alt']}" width="714" height="1024" loading="lazy" decoding="async">
              <img class="wv__shot wv__shot--b" src="/assets/work/ch-google.webp" alt="" width="714" height="1024" loading="lazy" decoding="async">
              {tag}
            </div>"""
    if v == "site":
        return f"""<div class="wv wv--site" role="img" aria-label="{w['alt']}">
              <div class="wv__board">
                <span class="wv__mark">{_lockup_svg("wv__lockup", 160, 32)}</span>
                <span class="wv__chips"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></span>
                <span class="wv__aa">Aa</span>
                <span class="wv__spec">Instrument Sans<br>IBM Plex Mono</span>
                <span class="wv__hex">#090909<br>#F1EFE9</span>
              </div>
              {tag}
            </div>"""
    if v == "fold":
        return f"""<div class="wv wv--fold">
              <img class="wv__fold" src="/assets/work/fold-a.webp" alt="{w['alt']}" width="1320" height="1036" loading="lazy" decoding="async">
              {tag}
            </div>"""
    return ""

def work_card(w, i, cls=""):
    meta = " · ".join(([w["year"]] if w.get("year") else []) + [w["status"]])
    return f"""<li class="wcard {cls}">
          <a class="wcard__link" href="{w['href']}">
            <div class="wcard__visual vt-{w['slug']}" data-cursor="View project ↗" data-cursor-kind="view">{work_visual(w)}</div>
            <div class="wcard__text">
              <p class="wcard__n">{i:02d}</p>
              <h3 class="wcard__title">{w['title']}<span class="wcard__arrow" aria-hidden="true">→</span></h3>
              <p class="wcard__kind">{w['kind']} · {w['origin']}</p>
              <p class="wcard__sum">{w['summary']}</p>
              <p class="wcard__meta">{meta}</p>
            </div>
          </a>
        </li>"""

NEXT_02 = """<svg class="next__art" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
              <g class="next__grid"><path d="M0 20H120M0 50H120M0 80H120M20 0V100M60 0V100M100 0V100"/></g>
              <polygon class="next__solid" points="22,86 22,30 64,72 64,86"/>
              <polygon class="next__ghost" points="98,86 98,14 50,62 50,86"/>
              <circle class="next__pin" cx="57" cy="65" r="1.6"/>
            </svg>"""

# ---------------------------------------------------------------- SERVICES (shared by home and /services)
# Plain descriptions of work I can actually do. No prices: every project is quoted.
SERVICES = [
    dict(key="website", title="Website design and development",
         text="A site designed from a blank page and built by hand. Fast on any phone, accessible, and easy to keep up to date. For a studio, a shop front, a launch or a personal brand.",
         includes=["Layout, type and art direction", "Responsive build, no page builders", "Hosting, domain and forms set up", "Search basics and fast loading"]),
    dict(key="motion", title="Interactive and motion-led websites",
         text="For when the site itself should be remembered. Scroll-driven storytelling, objects you can play with, considered sound and transitions, still quick and still usable with a keyboard.",
         includes=["Scroll and hover motion", "Interactive pieces like The Fold", "Optional UI sound", "A calm version for reduced motion"]),
    dict(key="app", title="Web applications and digital products",
         text="Accounts, data, dashboards and payments, designed and built end to end. Merova Fit and Company Hub are both built this way.",
         includes=["Sign-in, roles and dashboards", "Databases and APIs", "Payment flows through providers like Razorpay", "Deployment and monitoring"]),
    dict(key="improve", title="Product design and ongoing improvements",
         text="Already have a site or app? I can redesign the parts that confuse people, fix what's slow, and keep improving it after launch, by arrangement.",
         includes=["Design and UX review", "Speed and accessibility fixes", "Redesigns of key screens", "Regular improvements, if agreed"]),
]

def svc_rows(detail=False):
    out = []
    for i, s in enumerate(SERVICES):
        inc = "".join(f"<li>{x}</li>" for x in s["includes"])
        out.append(f"""        <li class="svc" id="svc-{s['key']}">
          <span class="svc__n">{i + 1:02d}</span>
          <h3 class="svc__title">{s['title']}</h3>
          <div class="svc__body">
            <p>{s['text']}</p>
            <ul class="svc__inc" role="list">{inc}</ul>
          </div>
          <a class="svc__cta" href="/services?type={s['key']}#enquire">Start a project <span aria-hidden="true">↗</span><span class="visually-hidden"> for {s['title'].lower()}</span></a>
        </li>""")
    return "\n".join(out)

STEPS = [
    ("Talk", "You tell me what you're making and why. The enquiry form or a plain email is fine."),
    ("Scope and quote", "We agree what's in and what isn't. You get a written quote and timeline before any work starts."),
    ("Design and build", "Designed in the browser and built in the open, with previews you can click through as it grows."),
    ("Launch and look after", "I ship it, test it on real devices, and stay around to fix and improve it."),
]
steps_html = "\n".join(f'        <li><span class="steps4__n">{i + 1:02d}</span><h3>{t}</h3><p>{d}</p></li>' for i, (t, d) in enumerate(STEPS))

MAILTO_PROJECT = ("mailto:hello@merova.app?subject=Project%20enquiry&amp;body=Hi%20Merova%2C%0D%0A%0D%0A"
                  "The%20idea%3A%0D%0A%0D%0AWhat%20it%20should%20achieve%3A%0D%0A%0D%0ATimeline%3A%0D%0A%0D%0A"
                  "Budget%20(a%20rough%20range%20is%20fine)%3A%0D%0A")

BAND = '<p class="talk__track">' + "<span>Let's build something worth exploring</span><span>·</span>" * 4 + "</p>"

# ---------------------------------------------------------------- HOME
JSONLD = """
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Organization","name":"Merova","url":"https://merova.app","logo":"https://merova.app/assets/brand/icon-512.png","email":"hello@merova.app","description":"An independent digital studio in India that designs and builds websites, interactive sites, web applications and digital products.","areaServed":"Worldwide"}
</script>"""


_o = 0 if SHOW_WORK else 1  # chapter numbers shift up by one when the work teaser is hidden
def _c(n): return f"{n - _o:02d}"
TEASER = (f"""  <section class="teaser" id="work" aria-labelledby="work-title" data-chapter="02" data-chapter-name="Selected work">
    <div class="wrap teaser__grid">
      <div class="teaser__head">
        {kicker("02", "Selected work")}
        <h2 class="h2 h2--serif" id="work-title">Real work, live on the web.</h2>
        <p class="teaser__note">Two products, this website and an experiment. All self-initiated so far; client projects join here as they ship.</p>
        <ol class="tlist" role="list">
{chr(10).join(f'''          <li><a class="tlist__link" href="{w['href']}" data-teaser="{i}"><span class="tlist__n">{i + 1:02d}</span><span class="tlist__t">{w['title']}</span><span class="tlist__k">{w['category']}</span><span class="tlist__a" aria-hidden="true">→</span></a></li>''' for i, w in enumerate(WORK))}
        </ol>
        <div class="actions"><a class="btn btn--primary" href="/work">See all work</a></div>
      </div>
      <a class="teaser__stage" href="{WORK[0]['href']}" data-teaser-stage data-cursor="View project ↗" data-cursor-kind="view" aria-labelledby="teaser-project-title teaser-project-kind">
{chr(10).join(f'''        <span class="teaser__slide{' is-on' if i == 0 else ''}" data-slide="{i}" data-href="{w['href']}" data-title="{w['title']}" aria-hidden="true">{work_visual(w) if w['visual'] != 'site' else '<div class="wv wv--site"><img class="teaser__site-shot" src="/assets/work/site-home.webp" alt="" width="1440" height="1000" loading="lazy" decoding="async"></div>'}</span>''' for i, w in enumerate(WORK))}
        <span class="teaser__cap"><span id="teaser-project-title" data-teaser-title>{WORK[0]['title']}</span> <span id="teaser-project-kind" data-teaser-kind>{WORK[0]['kind']}</span></span>
      </a>
    </div>
  </section>

""") if SHOW_WORK else ""
FINDER_WORK = ("""          <a class="finder__work" data-finder-work href="/work/merova-site" aria-labelledby="finder-work-label">
            <span class="finder__preview"><img data-finder-image src="/assets/work/site-home.webp" alt="The Merova website, with its editorial typography and interactive Fold" width="1600" height="1000" loading="lazy" decoding="async"><span class="finder__preview-arrow" aria-hidden="true">↗</span></span>
            <span class="finder__caption" id="finder-work-label"><span><strong data-finder-project>merova.app</strong> <small data-finder-kind>Website and identity</small></span> <span class="finder__origin">Self-initiated</span></span>
          </a>""") if SHOW_WORK else ""
HERO_SECOND = '<a class="btn btn--ghost" href="/work">See the work</a>' if SHOW_WORK else '<a class="btn btn--ghost" href="/services">See the services</a>'

home = f"""<main id="main">
  <section class="hero" data-chapter="01" data-chapter-name="Studio">
    <div class="hero__pin">
      <div class="wrap hero__grid">
        <div class="hero__top">
          <p class="hero__intro">Independent digital studio <span aria-hidden="true">·</span> India</p>
          <p class="hero__hint" aria-hidden="true">Built by one. Made for you.</p>
        </div>
        <div class="hero__copy">
          <h1 class="hero__title"><span class="line">Big ideas.</span> <span class="line">Built to</span> <span class="line"><em>stand out.</em></span></h1>
          <div class="hero__aside">
            <p class="lede">Distinctive websites and useful web apps for founders. Designed and built by one person, from first sketch to launch.</p>
            <div class="actions">
              <a class="btn btn--primary" href="/services#enquire">Start a project</a>
              {HERO_SECOND}
            </div>
            <p class="hero__finder">Not sure where to start? <a class="link" href="#services">Find your starting point</a></p>
          </div>
        </div>
        <div class="hero__art">
          {FOLD3D}
        </div>
        <ol class="hero__tags" role="list">
          <li><span class="hero__tag-n">01</span>Websites<i aria-hidden="true"></i></li>
          <li><span class="hero__tag-n">02</span>Web apps<i aria-hidden="true"></i></li>
          <li><span class="hero__tag-n">03</span>Products<i aria-hidden="true"></i></li>
          <li><span class="hero__tag-n">04</span>Experiments<i aria-hidden="true"></i></li>
        </ol>
      </div>
    </div>
  </section>

  <section class="direction-lab" id="direction-lab" aria-labelledby="lab-title" data-direction-lab data-direction="editorial" data-device="desktop">
    <div class="wrap">
      <div class="lab__head">
        <div>
          <p class="kicker">The direction lab</p>
          <h2 class="lab__title" id="lab-title">One idea.<br><em>Three directions.</em></h2>
        </div>
        <div class="lab__intro">
          <p>The same brief, a different point of view. Try a direction and see how type, space and composition change the feeling.</p>
          <p class="lab__disclosure">Interactive concept, not a client project. The brief: a fictional studio launching its first website.</p>
        </div>
      </div>
      <div class="lab__toolbar">
        <fieldset class="lab__directions">
          <legend class="visually-hidden">Choose a visual direction</legend>
          <label class="lab__option"><input type="radio" name="lab_direction" value="editorial" data-lab-direction checked><span><i aria-hidden="true">01</i>Editorial</span></label>
          <label class="lab__option"><input type="radio" name="lab_direction" value="bold" data-lab-direction><span><i aria-hidden="true">02</i>Bold</span></label>
          <label class="lab__option"><input type="radio" name="lab_direction" value="minimal" data-lab-direction><span><i aria-hidden="true">03</i>Minimal</span></label>
        </fieldset>
        <fieldset class="lab__devices">
          <legend class="visually-hidden">Preview width</legend>
          <label class="lab__device"><input type="radio" name="lab_device" value="desktop" data-lab-device checked><span><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="2" y="3" width="16" height="11" rx="1"/><path d="M7 18h6M10 14v4"/></svg>Desktop</span></label>
          <label class="lab__device"><input type="radio" name="lab_device" value="mobile" data-lab-device><span><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="5" y="1" width="10" height="18" rx="2"/><path d="M9 16h2"/></svg>Mobile</span></label>
        </fieldset>
      </div>
      <div class="lab__stage">
        <div class="lab__preview" data-lab-preview role="group" aria-label="Fictional studio website concept">
          <div class="lab__sample-nav"><p class="lab__brand"><span class="lab__brand-mark" aria-hidden="true"></span>Your next idea</p><span class="lab__sample-menu" aria-hidden="true">Independent by design <i>↗</i></span></div>
          <div class="lab__composition">
            <div class="lab__content">
              <p class="lab__eyebrow">A little clarity. A new perspective.</p>
              <h3 class="lab__sample-title">Ideas need<br><em>room to grow.</em></h3>
              <p class="lab__sample-copy">Make something useful. Give it a point of view. Build it with care.</p>
              <span class="lab__sample-action" aria-hidden="true">Explore the idea <i>↗</i></span>
            </div>
            <div class="lab__art" aria-hidden="true"><span class="lab__art-grid"></span><span class="lab__plane lab__plane--left"></span><span class="lab__plane lab__plane--right"></span><span class="lab__art-caption">A new perspective</span></div>
          </div>
          <div class="lab__sample-base"><span>Space for what comes next.</span><span aria-hidden="true">Concept / Merova</span></div>
        </div>
      </div>
      <div class="lab__footer">
        <div class="lab__explanation"><p class="lab__direction-name" data-lab-direction-name>Editorial</p><p data-lab-description>Expressive serif type, warm space and a composition that gives the idea room to breathe.</p></div>
        <a class="lab__use" data-lab-use href="#services">Use this direction <span aria-hidden="true">↗</span></a>
      </div>
      <p class="lab__status visually-hidden" data-lab-status role="status" aria-live="polite"></p>
      <noscript><p class="lab__noscript">This is the editorial direction. <a class="link" href="/services#enquire">Tell me about your own idea</a>.</p></noscript>
    </div>
  </section>

{TEASER}
  <section class="services s-light grow" id="services" aria-labelledby="svc-title" data-chapter="{_c(3)}" data-chapter-name="Services">
    <div class="wrap finder" data-project-finder>
      <div class="finder__heading">
        <div>
          {kicker(_c(3), "Find your starting point")}
          <h2 class="finder__title" id="svc-title">What are you<br>building?</h2>
        </div>
        <div class="finder__intro">
          <p>You bring the idea. I'll help find its shape. Choose the closest starting point to see what we could make together.</p>
          <a class="link" href="/services">Explore all services</a>
        </div>
      </div>
      <noscript><p class="finder__noscript">Choose a service and describe your idea in the <a class="link" href="/services#enquire">enquiry form</a>.</p></noscript>
      <div class="finder__grid">
        <div class="finder__inputs">
          <fieldset class="finder__choices">
            <legend class="finder__label">First, what do you need?</legend>
            <label class="finder__choice">
              <input class="finder__radio" type="radio" name="project_goal" value="website" data-project-choice checked>
              <span class="finder__choice-body"><span class="finder__choice-n" aria-hidden="true">01</span><span><strong>A home for my business</strong><small>A clear, considered website.</small></span><span class="finder__choice-mark" aria-hidden="true">↗</span></span>
            </label>
            <label class="finder__choice">
              <input class="finder__radio" type="radio" name="project_goal" value="motion" data-project-choice>
              <span class="finder__choice-body"><span class="finder__choice-n" aria-hidden="true">02</span><span><strong>A site people remember</strong><small>Interaction, motion and personality.</small></span><span class="finder__choice-mark" aria-hidden="true">↗</span></span>
            </label>
            <label class="finder__choice">
              <input class="finder__radio" type="radio" name="project_goal" value="app" data-project-choice>
              <span class="finder__choice-body"><span class="finder__choice-n" aria-hidden="true">03</span><span><strong>An idea people can use</strong><small>A web app or digital product.</small></span><span class="finder__choice-mark" aria-hidden="true">↗</span></span>
            </label>
            <label class="finder__choice">
              <input class="finder__radio" type="radio" name="project_goal" value="improve" data-project-choice>
              <span class="finder__choice-body"><span class="finder__choice-n" aria-hidden="true">04</span><span><strong>A better version of my site</strong><small>Improve what already exists.</small></span><span class="finder__choice-mark" aria-hidden="true">↗</span></span>
            </label>
          </fieldset>
          <span class="finder__status" data-finder-status role="status" aria-live="polite">Starting point: Website design and development.</span>
          <div class="finder__details">
            <div class="finder__field">
              <label class="finder__label" for="finder-timeline">When are you thinking?</label>
              <select id="finder-timeline" data-finder-timeline>
                <option>Not sure yet</option>
                <option>As soon as possible</option>
                <option>Within a month</option>
                <option>One to three months</option>
                <option>Flexible</option>
              </select>
            </div>
            <div class="finder__field">
              <label class="finder__label" for="finder-note">What is the idea? <span>(optional)</span></label>
              <textarea id="finder-note" data-finder-note maxlength="1200" rows="3" aria-describedby="finder-note-hint" placeholder="A little about what you have in mind..."></textarea>
              <p class="finder__hint" id="finder-note-hint">Your notes stay in this tab. Nothing is sent until you submit the enquiry.</p>
            </div>
          </div>
        </div>
        <aside class="finder__result" aria-labelledby="finder-title">
          <div class="finder__result-top"><p class="finder__label">Your starting point</p><span class="finder__live" aria-hidden="true">Made around you</span></div>
          <h3 class="finder__service" id="finder-title" data-finder-title>Website design and development</h3>
          <p class="finder__description" data-finder-description>A clear home for your business, designed around what visitors need to understand and do.</p>
          <ul class="finder__includes" data-finder-includes role="list">
            <li>Layout, type and art direction</li>
            <li>Responsive build and enquiry forms</li>
            <li>Search basics and fast loading</li>
          </ul>
{FINDER_WORK}
          <div class="finder__next">
            <p class="finder__quote">A recommended starting point. We'll agree the scope, timeline and quote after we talk.</p>
            <a class="btn btn--primary" data-finder-continue href="/services?type=website#enquire">Continue with this brief</a>
            <a class="finder__direct link" href="/services#enquire">Go straight to enquiry</a>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <section class="approach" aria-labelledby="approach-title" data-chapter="{_c(4)}" data-chapter-name="How it works">
    <div class="wrap">
      {kicker(_c(4), "How it works")}
      <h2 class="visually-hidden" id="approach-title">How a project works</h2>
      <p class="statement" data-words>Every project starts with one clear job. Then it's designed and built end to end, from the first sketch to the server it runs on.</p>
      <ol class="steps4" role="list">
{steps_html}
      </ol>
    </div>
  </section>

  <section class="pixels s-light grow" aria-labelledby="pixels-title" data-chapter="{_c(5)}" data-chapter-name="The studio">
    <div class="wrap pixels__grid">
      <div class="pixels__head">
        {kicker(_c(5), "The studio")}
        <h2 class="pixels__title" id="pixels-title">Who's behind the <span class="pixels__px">pixels?</span></h2>
      </div>
      <div class="pixels__body">
        <p class="pixels__lede">No mystery team. No account-manager relay race. Just the person designing the thing, building it, and answering your email. Fewer meetings, more making.</p>
        <dl class="pixels__specs">
          <div><dt>Team size</dt><dd>One. On purpose.</dd></div>
          <div><dt>Hand-offs</dt><dd>None. Same person from sketch to server.</dd></div>
          <div><dt>Replies</dt><dd>From the person writing the code.</dd></div>
        </dl>
        <p class="pixels__line">Have something interesting in mind? Let's make it real.</p>
        <div class="actions">
          <a class="btn btn--primary" href="mailto:hello@merova.app">hello@merova.app</a>
          <a class="btn btn--ghost" href="/about">About the studio</a>
        </div>
      </div>
    </div>
  </section>

  <section class="next" id="next" aria-labelledby="next-title" data-chapter="{_c(6)}" data-chapter-name="In the works">
    <div class="wrap next__grid2">
      <div class="next__head">
        {kicker(_c(6), "In the works")}
        <h2 class="h2" id="next-title">Next from Merova.</h2>
        <p class="next__lede">Alongside client work, Merova makes small apps of its own. Merova Fit is the first. The next one gets a name when it's ready. No dates until they're real.</p>
        <p><a class="link" href="/fit#updates">Get told when it's out</a></p>
      </div>
      <div class="next__card">
        <p class="next__num" aria-hidden="true">02</p>
        {NEXT_02}
        <dl class="next__spec">
          <div><dt>App 02</dt><dd>In the works</dd></div>
          <div><dt>Name</dt><dd>When it's ready</dd></div>
          <div><dt>Job</dt><dd>One everyday task</dd></div>
        </dl>
      </div>
    </div>
  </section>

  <section class="talk s-light grow" id="contact" aria-labelledby="talk-title" data-chapter="{_c(7)}" data-chapter-name="Start a project">
    <div class="talk__band" aria-hidden="true">{BAND}</div>
    <div class="wrap talk__grid">
      <div>
        {kicker(_c(7), "Start a project")}
        <h2 class="h2 h2--serif" id="talk-title">Have a project in mind?</h2>
      </div>
      <div class="talk__body">
        <p class="lede">Let's build something worth exploring. Send the idea, what it should achieve, a rough timeline and a budget range, and you'll get a reply from the person who'll build it.</p>
        <a class="talk__mail" href="{MAILTO_PROJECT}">hello@merova.app</a>
        <div class="actions"><a class="btn btn--primary" href="/services#enquire">Start a project</a><a class="btn btn--ghost" href="/services">See the services</a></div>
      </div>
    </div>
  </section>
  <p class="chapter" aria-hidden="true"><span class="chapter__n">01</span><span class="chapter__name">Studio</span></p>
</main>
"""
page("index.html",
     title="Merova - Independent digital studio",
     og_title="Merova - Digital work, made with intention",
     desc="Merova is an independent digital studio in India. Websites, interactive sites, web apps and products of its own, like Merova Fit. Taking on client projects.",
     body=home, base="/", extra_head=JSONLD)

# ---------------------------------------------------------------- WORK INDEX
rows = "\n".join(f"""        <li class="wrow">
          <a class="wrow__link" href="{w['href']}">
            <span class="wrow__n">{i + 1:02d}</span>
            <span class="wrow__title">{w['title']}</span>
            <span class="wrow__kind">{w['kind']} · {w['origin']}</span>
            <span class="wrow__meta">{w['year'] or ''}</span>
            <span class="wrow__arrow" aria-hidden="true">→</span>
            <span class="wrow__thumb vt-{w['slug']}" aria-hidden="true">{work_visual(w)}</span>
          </a>
        </li>""" for i, w in enumerate(WORK))
kinds = sorted({t for w in WORK for t in w["tags"]})
workpage = f"""<main id="main">
  <section class="page-hero page-hero--serif">
    <div class="wrap page-hero__inner">
      <p class="kicker">Work</p>
      <h1 class="display">Work <span class="count">{len(WORK):02d}</span></h1>
      <p class="lede">Everything here is real and live, and so far all of it is self-initiated: products of my own, this site, and an experiment, marked as one. Client projects will appear here as they ship.</p>
      <p class="tags-line">{" ".join(f'<span>{k}</span>' for k in kinds)}</p>
    </div>
  </section>
  <section class="work-sec" aria-labelledby="gallery-title">
    <div class="wrap">
      <h2 class="visually-hidden" id="gallery-title">Projects</h2>
      <ol class="wgrid" role="list">
{chr(10).join(work_card(w, i + 1, cls) for i, (w, cls) in enumerate(zip(WORK, ["wcard--wide", "wcard--tall", "wcard--tall", "wcard--wide"])))}
      </ol>
    </div>
  </section>
  <section class="work-list" aria-labelledby="index-title">
    <div class="wrap">
      <div class="sec-head sec-head--index">
        <h2 class="h3" id="index-title">Index</h2>
        <p class="sec-head__note">The same projects as a list. Hover a row to preview it.</p>
      </div>
      <ol class="wrows" role="list">
{rows}
      </ol>
    </div>
  </section>
  <section class="work-cta">
    <div class="wrap work-cta__in">
      <h2 class="h2 h2--serif">Your project could be next.</h2>
      <div class="actions"><a class="btn btn--primary" href="/services#enquire">Start a project</a><a class="btn btn--ghost" href="/services">See the services</a></div>
    </div>
  </section>
</main>
"""
page("work.html", title="Work - Merova", active="work", base="/",
     desc="Selected work from Merova: Merova Fit, Company Hub, the merova.app website and identity, and The Fold experiment.",
     body=workpage)

# ---------------------------------------------------------------- CASE STUDY TEMPLATE
def case_page(slug, *, n, title, kind, status, link, link_label, about, facts, frames, notes, hero, theme, desc, extra=""):
    idx = [w["slug"] for w in WORK].index(slug)
    nxt = WORK[(idx + 1) % len(WORK)]
    facts_html = "\n".join(f'          <div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in facts)
    frames_html = "\n".join(f"""        <figure class="case__frame{(' ' + f.get('cls','')) if f.get('cls') else ''}">
          {f['html']}
          <figcaption><span>Frame {j + 1:02d}</span> {f['cap']}</figcaption>
        </figure>""" for j, f in enumerate(frames))
    notes_html = "\n".join(f"          <li>{x}</li>" for x in notes)
    link_html = f'<a class="btn btn--primary" href="{link}">{link_label}</a>' if link else ""
    body = f"""<main id="main" class="case case--{theme}">
  <header class="case__head">
    <div class="wrap">
      <p class="kicker"><a class="link" href="/work">Work</a> <span aria-hidden="true">/</span> {n:02d}</p>
      <h1 class="case__title">{title}</h1>
      <div class="case__meta">
        <p><span>Type</span>{kind}</p>
        <p><span>Status</span>{status}</p>
        <p><span>Origin</span>{WORK[idx]['origin']}</p>
        <div class="actions">{link_html}</div>
      </div>
    </div>
  </header>
  <figure class="case__hero">
    <div class="wrap vt-{slug}">{hero}</div>
  </figure>
  <section class="case__about">
    <div class="wrap case__split">
      <p class="case__label">About it</p>
      <div class="case__lede">{about}</div>
    </div>
  </section>
  <section class="case__facts-sec">
    <div class="wrap case__split">
      <p class="case__label">Details</p>
      <dl class="case__facts">
{facts_html}
      </dl>
    </div>
  </section>
{extra}
  <section class="case__frames">
    <div class="wrap case__frames-grid">
{frames_html}
    </div>
  </section>
  <section class="case__notes">
    <div class="wrap case__split">
      <p class="case__label">What I did</p>
      <ul class="case__list">
{notes_html}
      </ul>
    </div>
  </section>
  <a class="case__next" href="{nxt['href']}">
    <span class="wrap case__next-in">
      <span class="case__label">Next project</span>
      <span class="case__next-title">{nxt['title']}<span aria-hidden="true">→</span></span>
      <span class="case__next-kind">{nxt['kind']}</span>
      <span class="case__next-bar" aria-hidden="true"></span>
    </span>
  </a>
</main>
"""
    page(f"work/{slug}.html", title=f"{title} - Merova", active="work", base="/", desc=desc, body=body)

# ---- Company Hub
case_page("company-hub", n=2, title="Company Hub", kind="Web application", status="Live at companyhub.fun",
    link="https://companyhub.fun", link_label="Visit companyhub.fun", theme="ch",
    desc="Company Hub: company-wise LeetCode questions ranked by real interview frequency, with progress, spaced revision and curated sheets.",
    hero=f"""<div class="case__stage case__stage--ch">
        <img class="case__shot case__shot--a" src="/assets/work/ch-home.webp" alt="Company Hub home page: the exact questions they'll ask." width="714" height="1024" decoding="async">
        <img class="case__shot case__shot--b" src="/assets/work/ch-google.webp" alt="Company Hub's Google page: difficulty split, most asked topics and the question list." width="714" height="1024" loading="lazy" decoding="async">
      </div>""",
    about="<p>Interview prep, sorted by the company you're actually interviewing with. Company Hub ranks LeetCode questions by how often each company really asks them, then helps you work through them with progress tracking, spaced revision and curated sheets like Blind 75.</p>",
    facts=[("Type", "Web application"), ("Covers", "656 companies, 3.4k questions, 72 topics"),
           ("Built with", "Next.js, Supabase, Prisma"), ("Hosting", "Vercel"),
           ("Link", '<a class="link" href="https://companyhub.fun">companyhub.fun</a>')],
    frames=[
        dict(html='<img src="/assets/work/ch-home.webp" alt="Company Hub home page with a terminal-style company search." width="714" height="1024" loading="lazy" decoding="async">',
             cap="The home page. Type a company into a terminal-style search and jump straight to its questions."),
        dict(html='<img src="/assets/work/ch-google.webp" alt="Company Hub page for Google: 2.3k tagged questions with difficulty split and topics." width="714" height="1024" loading="lazy" decoding="async">',
             cap="A company page: difficulty split, most asked topics, and every question ranked by frequency."),
    ],
    notes=["Company pages with a difficulty split and the topics each company asks most.",
           "Question lists ranked by frequency, filterable by topic, level and status.",
           "Progress, bookmarks, spaced revision and curated sheets.",
           "Fixed database connection exhaustion by moving to Supabase's transaction-mode pooler.",
           "Fixed foreign-key errors caused by stale sign-in tokens.",
           "Dealt with Indian internet providers blocking Vercel domains."])

# ---- merova.app
case_page("merova-site", n=3, title="merova.app", kind="Website and identity", status="Live, you're on it",
    link=None, link_label="", theme="site",
    desc="merova.app: the identity and website of Merova, an independent digital studio. A monochrome system, an interactive mark and a fast static build.",
    hero=f"""<div class="case__stage case__stage--site">{work_visual(WORK[2])}</div>""",
    about="<p>Merova's own home, designed and built from scratch. The brief I set myself: black first, ivory second, one strong idea instead of many small effects, and a site that loads fast on any phone. The site is also the studio's first piece of work, so it has to show what I'd build for someone else.</p>",
    facts=[("Type", "Website and identity"), ("Built with", "Plain HTML, CSS and JavaScript. No frameworks."),
           ("Typefaces", "Instrument Sans and IBM Plex Mono, self-hosted"), ("Hosting", "Vercel, with strict security headers"),
           ("Colour", "#090909 black, #F1EFE9 ivory, vermilion only as a signal")],
    frames=[
        dict(html='<img src="/assets/work/site-home.webp" alt="The merova.app home page." width="1600" height="1000" loading="lazy" decoding="async">', cap="The home page, built around the Fold and a single statement.", cls="case__frame--wide"),
        dict(html='<img src="/assets/work/site-fit.webp" alt="The Merova Fit product page." width="1600" height="1000" loading="lazy" decoding="async">', cap="Merova Fit's own page inside the studio site."),
        dict(html='<img src="/assets/work/site-brand.webp" alt="The Merova brand kit page." width="1600" height="1000" loading="lazy" decoding="async">', cap="A brand kit anyone can download."),
    ],
    notes=["A monochrome design system: type scale, buttons, links and layout rules.",
           "The Fold: the logo as a 3D object you can turn (see the next project).",
           "A data-driven Work section, so new projects slot in without a redesign.",
           "Policy pages ready for payments, and a strict content security policy.",
           "Every page works without JavaScript, with a keyboard, and with reduced motion."])

# ---- The Fold
case_page("the-fold", n=4, title="The Fold", kind="Interactive experiment", status="Experiment, live on the home page",
    link="/", link_label="Turn it on the home page", theme="fold",
    desc="The Fold: an interactive experiment that turns the Merova mark into two lit planes you can drag, swipe or turn with the keyboard.",
    hero=f"""<div class="case__stage case__stage--fold"><img src="/assets/work/fold-a.webp" alt="The two planes of the Merova mark as lit sheets." width="1320" height="1036" decoding="async"></div>""",
    about="<p>An experiment, not a client project. What if the logo was an object? The two planes of the Merova mark stand as sheets of paper under a light. Turn them and they catch the light differently. Look at them head on and they line up exactly into the logo.</p>",
    facts=[("Type", "Interactive experiment"), ("Built with", "CSS 3D transforms and a little JavaScript. No WebGL, no libraries."),
           ("Input", "Drag, swipe, or the arrow keys"), ("Weight", "A few kilobytes of code"), ("Status", "Live in the home page hero")],
    frames=[
        dict(html='<img src="/assets/work/fold-a.webp" alt="The Fold turned to the left." width="1320" height="1036" loading="lazy" decoding="async">', cap="Turned left: the solid plane catches the light."),
        dict(html='<img src="/assets/work/fold-b.webp" alt="The Fold turned further, the sheets nearly edge on." width="1320" height="1036" loading="lazy" decoding="async">', cap="Nearly edge on: the paper's thickness shows."),
    ],
    notes=["Each plane sits at its own depth, scaled to cancel perspective, so the head-on view is the exact logo.",
           "Light is worked out from the angle, so the paper brightens and darkens as it turns.",
           "The ground and shadow are drawn flat underneath, which avoids 3D sorting glitches in browsers.",
           "It works with a keyboard and a screen reader (it's a slider), and stays still for reduced motion."],
    extra=f"""  <section class="case__live">
    <div class="wrap case__split">
      <p class="case__label">Try it</p>
      <div class="case__live-stage">{FOLD3D}</div>
    </div>
  </section>""")

# ---------------------------------------------------------------- STUDIO (about)

# ---------------------------------------------------------------- SERVICES PAGE
# Razorpay: paste the official payment link here once you have it. While it's empty, no payment
# button is published anywhere. When set, a separate "Paying an agreed quote" section appears at the
# bottom of /services only (never in the main navigation or next to the enquiry button).
RAZORPAY_PAYMENT_URL = ""

ENQUIRY_FORM = """<form class="form enquiry" id="enquiry-form" data-form="enquiry" action="https://api.web3forms.com/submit" method="POST" novalidate>
        <div class="enquiry__brief" data-enquiry-brief hidden>
          <p class="kicker">Your starting point</p>
          <p data-enquiry-summary></p>
          <p class="note">Your choices are below. Edit anything before sending. <a class="link" href="/#services">Change your choices</a></p>
        </div>
        <input type="hidden" name="project_goal" data-enquiry-goal disabled>
        <input type="hidden" name="subject" value="Project enquiry from merova.app">
        <input type="hidden" name="from_name" value="merova.app project enquiry">
        <div class="hp" aria-hidden="true"><label>Leave this empty <input type="checkbox" name="botcheck" tabindex="-1"></label></div>
        <div class="field-row">
          <div class="field">
            <label for="q-name">Your name</label>
            <input id="q-name" name="name" type="text" autocomplete="name" required maxlength="100">
          </div>
          <div class="field">
            <label for="q-email">Your email</label>
            <input id="q-email" name="email" type="email" autocomplete="email" required maxlength="200">
          </div>
        </div>
        <div class="field">
          <label for="q-type">What you'd like made</label>
          <select id="q-type" name="project_type" data-preselect="type">
            <option value="website">A website</option>
            <option value="motion">An interactive, motion-led website</option>
            <option value="app">A web app or digital product</option>
            <option value="improve">Improvements to something that exists</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </div>
        <div class="field">
          <label for="q-idea">The idea</label>
          <textarea id="q-idea" name="idea" required maxlength="5000" aria-describedby="q-idea-hint"></textarea>
          <p class="field__hint" id="q-idea-hint">What it is, who it's for, and what it should achieve. Links to anything you like are welcome.</p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="q-time">Timeline</label>
            <select id="q-time" name="timeline">
              <option>Not sure yet</option>
              <option>As soon as possible</option>
              <option>Within a month</option>
              <option>One to three months</option>
              <option>Flexible</option>
            </select>
          </div>
          <div class="field">
            <label for="q-budget">Budget <span class="field__opt">(optional, a rough range is fine)</span></label>
            <input id="q-budget" name="budget" type="text" maxlength="120" autocomplete="off">
          </div>
        </div>
        <div class="actions">
          <button class="btn btn--primary" type="submit">Send enquiry</button>
        </div>
        <p class="form-status" role="status" aria-live="polite"></p>
        <p class="note">Goes straight to hello@merova.app through Web3Forms. No newsletters, no sales calls you didn't ask for. See the <a class="link" href="privacy.html">privacy policy</a>.</p>
      </form>"""

PAY_SECTION = "" if not RAZORPAY_PAYMENT_URL else f"""
  <section class="pay-sec" id="pay" aria-labelledby="pay-title">
    <div class="wrap split">
      <p class="split__label">Payments</p>
      <div class="prose">
        <h2 class="h3" id="pay-title">Paying an agreed quote.</h2>
        <p>Only use this after we've agreed the scope and you've received a written quote. Payments are processed by Razorpay.</p>
        <div class="actions actions--spaced"><a class="btn btn--ghost" href="{RAZORPAY_PAYMENT_URL}">Pay through Razorpay</a></div>
      </div>
    </div>
  </section>"""

services_page = f"""<main id="main">
  <section class="page-hero page-hero--serif">
    <div class="wrap page-hero__inner">
      <p class="kicker">Services</p>
      <h1 class="display">Have a project in mind?</h1>
      <p class="lede">Let's build something worth exploring. Websites, interactive sites, web apps and improvements to what you already have, designed and built by one person, end to end.</p>
      <div class="actions"><a class="btn btn--primary" href="#enquire">Start a project</a>{'<a class="btn btn--ghost" href="/work">See the work</a>' if SHOW_WORK else '<a class="btn btn--ghost" href="mailto:hello@merova.app">hello@merova.app</a>'}</div>
    </div>
  </section>

  <section class="services s-light" aria-labelledby="svc-title">
    <div class="wrap">
      <div class="sec-head">
        {kicker("01", "What I make")}
        <h2 class="h2" id="svc-title">Four kinds of work.</h2>
        <p class="sec-head__note">Pick the closest one. Most projects mix a little of two.</p>
      </div>
      <ol class="svc-list" role="list">
{svc_rows(True)}
      </ol>
    </div>
  </section>

  <section class="approach" aria-labelledby="steps-title">
    <div class="wrap">
      {kicker("02", "How it works")}
      <h2 class="h2" id="steps-title">Enquiry, scope, quote, then the work.</h2>
      <ol class="steps4" role="list">
{steps_html}
      </ol>
    </div>
  </section>

  <section class="s-light about">
    <div class="wrap">
      <div class="split">
        <p class="split__label">Good to know</p>
        <div class="prose">
          <ul class="list-lines">
            <li><strong>Pricing.</strong><span>Every project is quoted after we've talked it through. There are no fixed packages or public prices yet.</span></li>
            <li><strong>Payment.</strong><span>Only after we agree the scope and you accept a written quote. Payment terms are part of the quote.</span></li>
            <li><strong>The work so far.</strong><span>The projects on this site are self-initiated. Client case studies will be added as they ship, with permission.</span></li>
            <li><strong>Where.</strong><span>Based in India, working remotely. Email is the main channel, with calls when they help.</span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="enquire-sec" id="enquire" aria-labelledby="enq-title">
    <div class="wrap enquire">
      <div class="enquire__head">
        {kicker("03", "Start a project")}
        <h2 class="h2" id="enq-title">Tell me about it.</h2>
        <p class="lede">The idea, the goal, a rough timeline and budget. You'll get a reply from the person who'd build it.</p>
        <p class="enquire__alt">Prefer email? <a class="link" href="{MAILTO_PROJECT}">hello@merova.app</a> works just as well.</p>
      </div>
      {ENQUIRY_FORM}
    </div>
  </section>
{PAY_SECTION}
</main>
"""
page("services.html", title="Services - Merova", active="services", base="/",
     og_title="Merova - Websites and digital products, designed and built",
     desc="Hire Merova to design and build a website, an interactive motion-led site, a web app, or improvements to what you have. Every project is quoted after a conversation.",
     body=services_page)

# ---------------------------------------------------------------- STUDIO (about)
about = f"""<main id="main">
  <section class="page-hero page-hero--serif">
    <div class="wrap page-hero__inner">
      <p class="kicker">Studio</p>
      <h1 class="display">Independent by nature. Digital by design.</h1>
      <p class="lede">Merova is a one-person digital studio in India. It designs websites, builds web apps, and makes products of its own.</p>
    </div>
  </section>
  <section class="s-light about">
    <div class="wrap">
      <div class="split">
        <p class="split__label">The story</p>
        <div class="prose">
          <p class="big">Merova began with a fitness coaching app, which became Merova Fit. The name needed to hold more than one app, and more than apps: websites, tools and experiments too.</p>
          <p>It's founder-led on purpose. No account managers, no hand-offs. The person who designs it is the person who builds it, and the one who replies when you write.</p>
        </div>
      </div>
      <div class="split">
        <p class="split__label">What it makes</p>
        <div class="prose">
          <ul class="list-lines">
            <li><strong>Websites.</strong><span>Designed and built from scratch, fast, and easy to keep up to date.</span></li>
            <li><strong>Interactive sites.</strong><span>Motion, scroll and small surprises, used where they help.</span></li>
            <li><strong>Web apps.</strong><span>Real products with accounts, data and payments, like Merova Fit and Company Hub.</span></li>
            <li><strong>Experiments.</strong><span>Ideas being explored, like {'<a class="link" href="/work/the-fold">The Fold</a>' if SHOW_WORK else 'The Fold on the home page'}. Always marked as experiments.</span></li>
          </ul>
          <div class="actions actions--spaced"><a class="btn btn--ghost" href="/services">See the services</a></div>
        </div>
      </div>
      <div class="split">
        <p class="split__label">How it works</p>
        <div class="prose">
          <ul class="list-lines">
            <li><strong>One clear job.</strong><span>Every project starts with the problem it solves and who it's for.</span></li>
            <li><strong>Design and code together.</strong><span>Designed in the browser, so motion and detail are real from day one.</span></li>
            <li><strong>Careful with data.</strong><span>Only what's needed is collected, and it's protected. The <a class="link" href="/privacy">privacy policy</a> has the details.</span></li>
            <li><strong>Easy to reach.</strong><span>Emails to <a class="link" href="mailto:hello@merova.app">hello@merova.app</a> reach the person doing the work.</span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>
  <section class="about-mark">
    <div class="wrap about-mark__grid">
      <div class="prose">
        <p class="split__label">The mark</p>
        <p class="big">The Merova logo is called Fold: two planes that overlap to make an M.</p>
        <p>The left plane is solid. The right one sits behind it at 42%. Both are cut at 45°. Turn it around on the <a class="link" href="/">home page</a>{', or read about <a class="link" href="/work/the-fold">the experiment</a>' if SHOW_WORK else ""}.</p>
      </div>
      <figure class="construct">
        {FOLD_SVG}
        <figcaption>Construction of the mark.</figcaption>
      </figure>
    </div>
  </section>
  <section class="s-light about">
    <div class="wrap">
      <div class="split">
        <p class="split__label">Get in touch</p>
        <div class="prose">
          <p class="big">Have something interesting in mind? Let's make it real.</p>
          <div class="actions actions--spaced">
            <a class="btn btn--primary" href="/services#enquire">Start a project</a>
            {'<a class="btn btn--ghost" href="/work">See the work</a>' if SHOW_WORK else '<a class="btn btn--ghost" href="/services">See the services</a>'}
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
"""
page("about.html", title="Studio - Merova", active="about", base="/",
     desc="Merova is a one-person, founder-led digital studio in India. Websites, interactive sites, web apps and products of its own.",
     body=about)

# ---------------------------------------------------------------- CONTACT
contact = f"""<main id="main">
  <section class="page-hero page-hero--serif">
    <div class="wrap page-hero__inner">
      <p class="kicker">Contact</p>
      <h1 class="display">Get in touch.</h1>
      <p class="lede">A project, a question, or a problem with an app. I read and answer every message myself.</p>
    </div>
  </section>
  <section class="s-light">
    <div class="wrap contact">
      <div>
        <div class="mailboxes">
          <div class="mailbox">
            <p class="split__label">General</p>
            <div class="addr-row"><a class="addr" href="mailto:hello@merova.app">hello@merova.app</a><button class="copy" type="button" data-copy="hello@merova.app">Copy</button></div>
            <p>Website and app projects, questions, ideas, partnerships and press.</p>
          </div>
          <div class="mailbox">
            <p class="split__label">App help</p>
            <div class="addr-row"><a class="addr" href="mailto:support@merova.app">support@merova.app</a><button class="copy" type="button" data-copy="support@merova.app">Copy</button></div>
            <p>Your account, payments, refunds, bugs, or deleting your data in Merova Fit.</p>
          </div>
        </div>
        <div class="business">
          <p class="split__label">Business details</p>
          <dl>
            <div><dt>Name</dt><dd>Merova, run by Aaditya Kumawat (sole proprietor)</dd></div>
            {ADDRESS_ROW}
            <div><dt>Grievances</dt><dd>Aaditya Kumawat, <a class="link" href="mailto:support@merova.app">support@merova.app</a></dd></div>
          </dl>
        </div>
      </div>

      <form class="form" id="contact-form" data-form="contact" action="https://api.web3forms.com/submit" method="POST" novalidate>
        <h2 class="h3">Send a message</h2>
        <input type="hidden" name="subject" value="New message from merova.app">
        <input type="hidden" name="from_name" value="merova.app contact form">
        <div class="hp" aria-hidden="true"><label>Leave this empty <input type="checkbox" name="botcheck" tabindex="-1"></label></div>
        <div class="field-row">
          <div class="field">
            <label for="f-name">Your name</label>
            <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="100">
          </div>
          <div class="field">
            <label for="f-email">Your email</label>
            <input id="f-email" name="email" type="email" autocomplete="email" required maxlength="200">
          </div>
        </div>
        <div class="field">
          <label for="f-topic">What it's about</label>
          <select id="f-topic" name="topic">
            <option>A website or app project</option>
            <option>General question</option>
            <option>Help with Merova Fit</option>
            <option>Payments or refunds</option>
            <option>Partnership or press</option>
            <option>Something else</option>
          </select>
        </div>
        <div class="field">
          <label for="f-msg">Message</label>
          <textarea id="f-msg" name="message" required maxlength="5000"></textarea>
        </div>
        <div class="actions">
          <button class="btn btn--primary" type="submit">Send message</button>
        </div>
        <p class="form-status" id="form-status" role="status" aria-live="polite"></p>
        <p class="note">Your message goes to hello@merova.app through Web3Forms. Read the <a class="link" href="privacy.html">privacy policy</a> to see how messages are handled.</p>
      </form>
    </div>
  </section>
</main>
"""
page("contact.html", title="Contact - Merova", active="contact",
     desc="Email hello@merova.app for general questions or support@merova.app for help with Merova apps, or send a message using the form.",
     body=contact)

# ---------------------------------------------------------------- PRIVACY
privacy_summary = """<p><strong>The short version</strong></p>
            <ul>
              <li>We collect what Merova Fit needs to work: your account details, the fitness data you log, your chats and bookings, and your orders.</li>
              <li>We don't sell your personal data, and we don't use it for ads.</li>
              <li>Payments are handled by Razorpay. We never see or store your full card, UPI or bank details.</li>
              <li>You can ask to see, correct or delete your data at any time by emailing <a href="mailto:support@merova.app">support@merova.app</a>.</li>
            </ul>"""

privacy_sections = f"""
          <h2 id="who-we-are">Who we are</h2>
          <p>Merova is run by Aaditya Kumawat, a sole proprietor based in India ("Merova", "we", "us"). This policy explains how we handle personal data when you use:</p>
          <ul>
            <li>this website, merova.app;</li>
            <li>the Merova Fit web app at fit.merova.app; and</li>
            <li>the Merova Fit Android app.</li>
          </ul>
          <p>Together we call these "the services". For the purposes of the Digital Personal Data Protection Act, 2023, Merova is the data fiduciary for the personal data described here.</p>

          <h2 id="what-we-collect">What we collect</h2>
          <p>We only collect what we need to run the services.</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Examples</th><th>Why we need it</th></tr></thead>
              <tbody>
                <tr><td>Account details</td><td>Name, email address, phone number, password (stored only as a secure hash, never in plain text)</td><td>To create and protect your account, send sign-in codes and confirm bookings</td></tr>
                <tr><td>Onboarding answers</td><td>Your goals, age, height, weight, activity level and food preferences {ph("CHECK THIS LIST MATCHES THE QUIZ")}</td><td>To build your plan</td></tr>
                <tr><td>Fitness logs</td><td>Workouts you complete, meals and calories, water, weight, your day score</td><td>To show your progress and let your coach guide you</td></tr>
                <tr><td>Messages and bookings</td><td>Chats with your coach, call bookings and times</td><td>To provide coaching</td></tr>
                <tr><td>Orders and payments</td><td>Items bought, amounts, order and payment IDs, payment status, and a delivery address if you order something physical</td><td>To process orders, send receipts, handle refunds and keep tax records</td></tr>
                <tr><td>Messages to us</td><td>What you send through the contact form or by email</td><td>To reply to you</td></tr>
                <tr><td>Waitlist</td><td>Your email and which launches you asked to hear about</td><td>To tell you when they launch, and nothing else</td></tr>
                <tr><td>Technical data</td><td>Device and browser type, IP address, app version, error logs</td><td>To keep the services secure and fix problems</td></tr>
              </tbody>
            </table>
          </div>
          <p>Some of what you log, like your weight, meals and activity, relates to your health. We use it only to provide the service to you. It is visible to you, your coach and us, and to no one else except the service providers listed below who store it for us.</p>
          <p>Payment details such as card numbers, UPI IDs and bank details are entered directly with Razorpay. We receive only a payment reference and status.</p>

          <h2 id="how-we-use">How we use your data</h2>
          <ul>
            <li>To run your account and the features you use, like plans, logging, chat, bookings and the shop.</li>
            <li>To let your coach see your logs and messages so they can coach you.</li>
            <li>To take payments, send receipts and process refunds.</li>
            <li>To send service messages: sign-in codes by email, receipts, and booking confirmations by email or WhatsApp.</li>
            <li>To keep the services secure, prevent fraud and fix bugs.</li>
            <li>To understand, in total and not per person, which features are used, so we can improve them.</li>
            <li>To meet our legal obligations, such as keeping tax records.</li>
          </ul>
          <p>We do not sell or rent your personal data. We do not share it with advertisers. We only send you marketing emails if you have agreed to receive them, and every such email has a way to unsubscribe.</p>

          <h2 id="consent">Consent and legal basis</h2>
          <p>We process your personal data with your consent, which you give when you create an account and agree to this policy, and for other uses that Indian law allows, such as meeting legal obligations.</p>
          <p>You can withdraw your consent at any time by emailing <a href="mailto:support@merova.app">support@merova.app</a> or by deleting your account. Withdrawing consent doesn't affect anything we did before, but some features will stop working, because we can't run them without the data.</p>

          <h2 id="sharing">Who we share it with</h2>
          <p>We use trusted service providers to run the services. They process data only on our instructions and only for the purpose listed.</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Provider</th><th>What they do for us</th><th>Data involved</th></tr></thead>
              <tbody>
                <tr><td>Razorpay</td><td>Payments and refunds</td><td>Order and payment details</td></tr>
                <tr><td>MongoDB Atlas</td><td>Database hosting</td><td>Account and app data</td></tr>
                <tr><td>Render</td><td>Runs the Merova Fit server</td><td>Account and app data</td></tr>
                <tr><td>Twilio</td><td>WhatsApp messages</td><td>Phone number, booking details</td></tr>
                <tr><td>Resend</td><td>Sign-in codes and receipts by email</td><td>Email address, message content</td></tr>
                <tr><td>Google Workspace</td><td>Our email inbox</td><td>Emails you send us</td></tr>
                <tr><td>Web3Forms</td><td>Delivers contact form messages and waitlist sign-ups</td><td>What you type into the form</td></tr>
                <tr><td>GitHub Pages</td><td>Hosts this website</td><td>IP address in server logs</td></tr>
                <tr><td>Google Play</td><td>Distributes the Android app</td><td>Handled under Google's own policy</td></tr>
              </tbody>
            </table>
          </div>
          <p>We also share data:</p>
          <ul>
            <li>with your coach, as described above;</li>
            <li>with authorities, if the law requires it or to protect someone's safety; and</li>
            <li>with a new owner, if Merova or an app is ever sold or transferred. We'd tell you first, and this policy would keep applying to your data.</li>
          </ul>
          <p>Some providers store data on servers outside India. We only use well-known providers that protect data with strong security, and we transfer data only as Indian law allows.</p>

          <h2 id="cookies">Cookies and local storage</h2>
          <p>This website, merova.app, does not use tracking or advertising cookies.</p>
          <p>Merova Fit stores a sign-in token on your device so you stay signed in, and remembers settings like light or dark mode. These are needed for the app to work. If we ever add analytics, we'll update this policy first.</p>

          <h2 id="retention">How long we keep data</h2>
          <ul>
            <li><strong>Account and app data:</strong> for as long as your account is open. If you delete your account, we delete this data within 30 days.</li>
            <li><strong>Order, payment and invoice records:</strong> for as long as Indian tax and accounting laws require, which is generally up to 8 years.</li>
            <li><strong>Server and error logs:</strong> up to {ph("90")} days.</li>
            <li><strong>Backups:</strong> deleted data can stay in backups for up to {ph("30")} days before it's overwritten.</li>
          </ul>

          <h2 id="your-rights">Your rights</h2>
          <p>Under Indian law, including the Digital Personal Data Protection Act, 2023, you have the right to:</p>
          <ul>
            <li>get a summary of the personal data we hold about you and who we've shared it with;</li>
            <li>correct, complete or update your data;</li>
            <li>have your data erased;</li>
            <li>withdraw your consent;</li>
            <li>nominate someone to use these rights for you if you die or are unable to; and</li>
            <li>raise a complaint with us, and then with the Data Protection Board of India.</li>
          </ul>
          <p>To use any of these rights, email <a href="mailto:support@merova.app">support@merova.app</a> from the email address on your account. We'll reply within 30 days. To delete your account, follow the steps on <a href="delete-account.html">Delete your account</a>.</p>

          <h2 id="security">Security</h2>
          <p>We protect your data with encrypted connections (HTTPS), hashed passwords, sign-in codes, and access limited to the people and systems that need it. No system is perfectly secure, so we can't promise that data will never be exposed. If a breach affects your data, we'll tell you and the authorities as the law requires.</p>

          <h2 id="children">Age limit</h2>
          <p>The services are for people aged 18 and over. We don't knowingly collect data from anyone under 18. If we learn that we have, we'll delete it.</p>

          <h2 id="changes">Changes to this policy</h2>
          <p>We may update this policy as the services change. The date at the top shows the latest version. If a change is significant, we'll tell you by email or in the app before it takes effect.</p>

          <h2 id="contact">Grievance officer and contact</h2>
          <p>If you have a question or complaint about your data, contact our grievance officer:</p>
          <ul>
            <li>Name: Aaditya Kumawat</li>
            <li>Email: <a href="mailto:support@merova.app">support@merova.app</a></li>
            <li>Address: {ADDRESS}</li>
          </ul>
          <p>We'll acknowledge your complaint within 48 hours and aim to resolve it within 30 days.</p>"""

legal("privacy.html", h1="Privacy policy", title="Privacy policy - Merova",
      desc="How Merova and Merova Fit collect, use, share and protect your personal data, and how to use your rights.",
      summary=privacy_summary, sections=privacy_sections)

# ---------------------------------------------------------------- TERMS
terms_summary = """<p><strong>The short version</strong></p>
            <ul>
              <li>You must be 18 or older to use Merova Fit.</li>
              <li>Merova Fit gives fitness and nutrition guidance. It is not medical advice.</li>
              <li>Paid plans renew until you cancel. You can get a full refund within 7 days of your first payment. See the <a href="refund.html">refund policy</a>.</li>
              <li>Be respectful to coaches and other people, and don't misuse the app.</li>
              <li>Indian law applies.</li>
            </ul>"""

terms_sections = f"""
          <h2 id="about">About these terms</h2>
          <p>These terms are an agreement between you and Aaditya Kumawat, a sole proprietor in India who runs Merova ("Merova", "we", "us"). They cover this website (merova.app), the Merova Fit web app (fit.merova.app) and the Merova Fit Android app, together "the services".</p>
          <p>By creating an account or using the services, you agree to these terms and to our <a href="privacy.html">privacy policy</a>. If you don't agree, please don't use the services.</p>

          <h2 id="eligibility">Who can use Merova Fit</h2>
          <p>You must be at least 18 years old and able to enter a binding contract under Indian law. You agree that the information you give us is true and up to date.</p>

          <h2 id="account">Your account</h2>
          <ul>
            <li>Keep your password and sign-in codes private. You're responsible for what happens in your account.</li>
            <li>One account is for one person. Don't share it.</li>
            <li>Tell us straight away at <a href="mailto:support@merova.app">support@merova.app</a> if you think someone else has used your account.</li>
          </ul>

          <h2 id="health">Health and safety</h2>
          <p><strong>Please read this section carefully.</strong></p>
          <ul>
            <li>Merova Fit gives general fitness and nutrition guidance. It is not medical advice, diagnosis or treatment. Coaches on Merova Fit are not doctors.</li>
            <li>Talk to a doctor before starting a new exercise or diet plan, especially if you have a medical condition, an injury, are pregnant, or take medication.</li>
            <li>Stop exercising and get medical help if you feel pain, dizziness, faintness or shortness of breath.</li>
            <li>You take part in workouts and follow meal plans at your own risk. Results differ from person to person, and we don't promise any particular result.</li>
            <li>In an emergency, call your local emergency number. Don't use the app's chat for emergencies.</li>
          </ul>

          <h2 id="coaching">Coaching</h2>
          <p>Paid plans may include chat with a coach and calls you book in the app. Coaches try to reply within a reasonable time, but chat is not instant. Bookings are confirmed by email or WhatsApp. Please be respectful. We may end coaching for anyone who is abusive.</p>

          <h2 id="payments">Plans, prices and payment</h2>
          <ul>
            <li>Prices are shown in Indian rupees (INR) on fit.merova.app before you pay, and include applicable taxes unless stated otherwise. Current prices: {ph("PRICING TBD")}.</li>
            <li>Payments are processed by Razorpay. By paying, you also agree to Razorpay's terms.</li>
            <li>Subscription plans renew automatically at the end of each billing period until you cancel. We'll show the renewal date in the app.</li>
            <li>If we change a price, we'll tell you in advance. The new price applies from your next billing period.</li>
            <li>If a payment fails, we may pause paid features until it's sorted.</li>
          </ul>

          <h2 id="refunds">Cancellations and refunds</h2>
          <p>You can cancel a plan at any time. You can get a full refund if you ask within 7 days of your first payment for a plan. The full rules are in our <a href="refund.html">refund and cancellation policy</a>, which is part of these terms.</p>

          <h2 id="shop">Shop orders</h2>
          <p>We describe shop items as accurately as we can. An order is accepted when you get an order confirmation. We may cancel an order, with a full refund, if an item is out of stock or was listed at the wrong price. Delivery is covered in our <a href="shipping.html">shipping and delivery policy</a>.</p>

          <h2 id="acceptable-use">Acceptable use</h2>
          <p>When using the services, don't:</p>
          <ul>
            <li>break any law, or help anyone else do so;</li>
            <li>harass, threaten or abuse coaches or anyone else;</li>
            <li>post content that is illegal, hateful, sexual or harmful;</li>
            <li>try to get into accounts, data or systems you don't have access to;</li>
            <li>copy, scrape, reverse engineer or resell the services; or</li>
            <li>upload viruses or anything else meant to cause harm.</li>
          </ul>

          <h2 id="your-content">Your content</h2>
          <p>You own what you add to Merova Fit, like your logs and messages. You give us permission to store, process and show that content only as needed to run the services for you, as described in the privacy policy.</p>

          <h2 id="our-content">Our content and brand</h2>
          <p>The Merova and Merova Fit names, the Fold logo, the app's design and code, and the plans and content we create belong to us or the people who licensed them to us. You may use them for your own personal, non-commercial use of the services only.</p>

          <h2 id="third-parties">Other services</h2>
          <p>The services connect with others, such as Razorpay, WhatsApp and Google Play. Their own terms and policies apply when you use them, and we aren't responsible for them.</p>

          <h2 id="availability">Changes to the services</h2>
          <p>We work to keep the services running, but there may be downtime for maintenance or problems outside our control. We may change, add or remove features. If we stop offering a paid service you've prepaid for, we'll refund the unused part.</p>

          <h2 id="termination">Ending your use</h2>
          <p>You can stop using the services and <a href="delete-account.html">delete your account</a> at any time. We may suspend or close an account that breaks these terms. Where it's fair to do so, we'll warn you first and explain why.</p>

          <h2 id="disclaimer">Disclaimer</h2>
          <p>To the extent the law allows, the services are provided "as is" and "as available", without promises that they'll always be error-free or meet every need.</p>

          <h2 id="liability">Limit of liability</h2>
          <p>To the extent the law allows, we aren't liable for indirect or consequential losses, such as lost profits or data. Our total liability for any claim about the services is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits any liability that can't be limited under Indian law.</p>

          <h2 id="indemnity">Indemnity</h2>
          <p>If you break these terms or the law while using the services, and that leads to a claim against us, you agree to cover the reasonable costs of that claim.</p>

          <h2 id="law">Governing law and disputes</h2>
          <p>These terms are governed by the laws of India. If you have a problem, please email <a href="mailto:support@merova.app">support@merova.app</a> first. Most issues can be solved quickly that way. If we can't solve it within 30 days, the courts at {CITY}, India will have jurisdiction. This doesn't affect your rights under the Consumer Protection Act, 2019.</p>

          <h2 id="changes">Changes to these terms</h2>
          <p>We may update these terms. The date at the top shows the latest version. For significant changes, we'll tell you by email or in the app before they take effect. If you keep using the services after that, you accept the new terms.</p>

          <h2 id="contact">Contact</h2>
          <ul>
            <li>Email: <a href="mailto:support@merova.app">support@merova.app</a></li>
            <li>Address: {ADDRESS}</li>
            <li>Grievance officer: Aaditya Kumawat, <a href="mailto:support@merova.app">support@merova.app</a></li>
          </ul>"""

legal("terms.html", h1="Terms of service", title="Terms of service - Merova",
      desc="The terms for using merova.app and the Merova Fit web and Android apps.",
      summary=terms_summary, sections=terms_sections)

# ---------------------------------------------------------------- REFUND
refund_summary = """<p><strong>The short version</strong></p>
            <ul>
              <li>First payment for a plan: full refund if you ask within 7 days.</li>
              <li>Renewals aren't refunded, but you can cancel any time to stop the next charge.</li>
              <li>Failed, duplicate or wrong charges are always refunded in full.</li>
              <li>Approved refunds go back to your original payment method within 5 to 7 working days.</li>
            </ul>"""

refund_sections = f"""
          <h2 id="scope">What this covers</h2>
          <p>This policy covers payments made in Merova Fit (fit.merova.app and the Android app): plans and coaching, paid call bookings, and shop orders. It's part of our <a href="terms.html">terms of service</a>.</p>

          <h2 id="plans">Plans and coaching</h2>
          <ul>
            <li><strong>7-day refund.</strong> If you're not happy, ask for a full refund within 7 days of your first payment for a plan. This applies once per person.</li>
            <li><strong>After 7 days.</strong> The current billing period isn't refunded, but you keep access until it ends.</li>
            <li><strong>Renewals.</strong> Renewal payments aren't refunded. Cancel before your renewal date to avoid the next charge.</li>
          </ul>

          <h2 id="cancel">How to cancel a plan</h2>
          <ul>
            <li>In the app: {ph("IN-APP PATH, e.g. Profile > Plan > Cancel")}; or</li>
            <li>email <a href="mailto:support@merova.app">support@merova.app</a> from the email address on your account.</li>
          </ul>
          <p>Cancelling stops future renewals. Your plan stays active until the end of the period you've paid for. There's no cancellation fee.</p>

          <h2 id="calls">Paid call bookings</h2>
          <p>If a call is paid separately from your plan:</p>
          <ul>
            <li>cancel or reschedule at least {ph("24 hours")} before the call for a full refund;</li>
            <li>later cancellations and missed calls aren't refunded; and</li>
            <li>if your coach cancels, you choose a full refund or a new time.</li>
          </ul>

          <h2 id="shop">Shop orders</h2>
          <ul>
            <li><strong>Before dispatch.</strong> You can cancel an order for a full refund until it has been shipped or delivered.</li>
            <li><strong>Damaged, faulty or wrong items.</strong> Tell us within {ph("7")} days of delivery, with photos, and we'll send a replacement or give a full refund.</li>
            <li><strong>Change of mind.</strong> {ph("RETURNS RULE, e.g. unopened items within 7 days, or not accepted")}.</li>
            <li><strong>Items that can't be returned.</strong> For hygiene reasons, opened food, supplements and personal-care items can't be returned unless they arrived damaged or faulty.</li>
          </ul>

          <h2 id="failed">Failed, duplicate or wrong payments</h2>
          <p>If money left your account but the payment failed, your bank or Razorpay usually reverses it automatically within 5 to 7 working days. If it doesn't, email us with the transaction ID and we'll sort it out. Duplicate or wrong charges are refunded in full.</p>

          <h2 id="request">How to ask for a refund</h2>
          <p>Email <a href="mailto:support@merova.app">support@merova.app</a> with:</p>
          <ul>
            <li>the email address on your account;</li>
            <li>the order or payment ID (it's on your receipt); and</li>
            <li>a short reason.</li>
          </ul>
          <p>We'll confirm by email whether your refund is approved.</p>

          <h2 id="timeline">When you get your money</h2>
          <p>Approved refunds are sent back to the original payment method through Razorpay within 5 to 7 working days. Depending on your bank or card, it may take a few more days to show in your account.</p>

          <h2 id="contact">Contact</h2>
          <p>Questions about a payment? Email <a href="mailto:support@merova.app">support@merova.app</a>. Address: {ADDRESS}.</p>"""

legal("refund.html", h1="Refunds and cancellations", title="Refund and cancellation policy - Merova",
      desc="How cancellations and refunds work for Merova Fit plans, call bookings and shop orders, including the 7-day refund window.",
      summary=refund_summary, sections=refund_sections)

# ---------------------------------------------------------------- SHIPPING
shipping_note = """
          <!-- NOTE FOR AADITYA: if the Merova Fit shop only sells digital things (plans, coaching),
               delete section 03 "Physical products" and the last summary bullet. Keep the page:
               Razorpay asks for a delivery policy even for digital services. -->"""

shipping_summary = f"""<p><strong>The short version</strong></p>
            <ul>
              <li>Plans and coaching are digital. They start in your Merova Fit account as soon as your payment is confirmed.</li>
              <li>You get a receipt by email for every payment.</li>
              <li>Physical products ship within India: dispatch in {ph("X")} working days, delivery in {ph("X to Y")} working days.</li>
            </ul>"""

shipping_sections = f"""
          <h2 id="digital">Digital plans and coaching</h2>
          <p>Plans, coaching and other digital services are delivered online in your Merova Fit account at fit.merova.app and in the Android app. Nothing is shipped.</p>
          <ul>
            <li>Access starts as soon as your payment is confirmed, usually within a few minutes.</li>
            <li>You get a receipt at the email address on your account.</li>
            <li>If your plan isn't active within 24 hours of paying, email <a href="mailto:support@merova.app">support@merova.app</a> with your payment ID.</li>
          </ul>

          <h2 id="calls">Call bookings</h2>
          <p>When you book a call, you get a confirmation by email or WhatsApp with the date and time. The call takes place by {ph("CALL METHOD, e.g. phone or Google Meet")} at the booked time.</p>

          <h2 id="physical">Physical products</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Topic</th><th>Details</th></tr></thead>
              <tbody>
                <tr><td>Where we ship</td><td>{ph("Within India only")}</td></tr>
                <tr><td>Dispatch time</td><td>Within {ph("X")} working days of your order</td></tr>
                <tr><td>Delivery time</td><td>{ph("X to Y")} working days after dispatch, depending on your location</td></tr>
                <tr><td>Shipping charges</td><td>{ph("Shown at checkout / free above INR X")}</td></tr>
                <tr><td>Courier</td><td>{ph("COURIER PARTNER")}</td></tr>
                <tr><td>Tracking</td><td>Sent by email or WhatsApp once your order ships</td></tr>
              </tbody>
            </table>
          </div>
          <p>Delivery times are estimates. Delays can happen because of the courier, weather, holidays or other things outside our control. Please check your address at checkout. If a parcel comes back because of a wrong address or failed delivery, we'll contact you to arrange re-delivery, which may cost extra.</p>
          <p>If an item arrives damaged or wrong, see our <a href="refund.html">refund policy</a>.</p>

          <h2 id="contact">Contact</h2>
          <p>Questions about delivery? Email <a href="mailto:support@merova.app">support@merova.app</a>. Address: {ADDRESS}.</p>"""

legal("shipping.html", h1="Shipping and delivery", title="Shipping and delivery policy - Merova",
      desc="How Merova Fit delivers digital plans and coaching, and how physical shop orders are shipped.",
      summary=shipping_summary, sections=shipping_sections, note=shipping_note)

# ---------------------------------------------------------------- DELETE ACCOUNT
delete_summary = """<p>You can delete your <strong>Merova Fit</strong> account, made by Merova, and the data linked to it at any time. It's free, and you don't need to give a reason.</p>"""

delete_sections = f"""
          <h2 id="in-app">Delete in the app</h2>
          <p>Open Merova Fit on the web or Android and go to {ph("IN-APP PATH, e.g. Profile > Settings > Delete account")}. Confirm, and your account is deleted.</p>

          <h2 id="by-email">Or ask by email</h2>
          <ol class="steps">
            <li><span>Email <a href="mailto:support@merova.app?subject=Delete%20my%20account">support@merova.app</a> from the email address on your account, with the subject "Delete my account".</span></li>
            <li><span>We may send you a code to confirm the request is really from you.</span></li>
            <li><span>We delete your account and data within 30 days and email you when it's done.</span></li>
          </ol>

          <h2 id="deleted">What gets deleted</h2>
          <ul>
            <li>Your profile: name, email, phone number and password</li>
            <li>Your onboarding answers and plans</li>
            <li>Your workout, meal, water and weight logs, and day scores</li>
            <li>Your chats with your coach and your call bookings</li>
          </ul>

          <h2 id="kept">What we keep, and for how long</h2>
          <ul>
            <li><strong>Order, payment and invoice records</strong> (amounts, dates, order and payment IDs) are kept for as long as Indian tax and accounting laws require, generally up to 8 years, then deleted.</li>
            <li><strong>Backups</strong> may hold deleted data for up to {ph("30")} days before it's overwritten.</li>
          </ul>

          <h2 id="plans">If you have an active plan</h2>
          <p>Deleting your account cancels any renewals. Refunds follow our <a href="refund.html">refund policy</a>, so if you're within 7 days of your first payment, ask for your refund before you delete.</p>

          <h2 id="partial">Delete some data only</h2>
          <p>Want to delete certain data, like your weight history or chats, but keep your account? Email <a href="mailto:support@merova.app">support@merova.app</a> and tell us what to remove.</p>"""

legal("delete-account.html", h1="Delete your account", title="Delete your Merova Fit account - Merova",
      desc="How to delete your Merova Fit account and data, what gets deleted, and what we keep by law.",
      summary=delete_summary, sections=delete_sections)


# ---------------------------------------------------------------- MEROVA FIT
FIT_FEATURES = [
    ("Your daily plan", "Today's workout, exercise by exercise, with sets and reps. Tick each one off as you go.", "plan"),
    ("Meals and calories", "Log what you eat and watch calories and macros add up through the day. Follow a meal plan if you have one.", "meals"),
    ("Water", "Tap to add a glass and see the day fill up. Small habit, easy to keep.", "water"),
    ("Weight and measurements", "Log your weight and body measurements and see the trend over weeks, not just today.", "weight"),
    ("Day score", "One number that sums up how today went, built from what you logged.", "score"),
    ("Goals, streaks and badges", "Daily, weekly and monthly goals, with streaks and badges that make showing up feel good.", "goals"),
    ("Chat with your coach", "Ask questions about your plan and get answers from a real person, right in the app.", "chat"),
    ("Book coaching calls", "Pick a time that suits you. You get a confirmation by email or WhatsApp.", "calls"),
]
fit_cells = "\n".join(f"""          <li class="feat">
            {pixel_icon(PX[k])}
            <h3>{t}</h3>
            <p>{d}</p>
          </li>""" for t, d, k in FIT_FEATURES)

FIT_JSONLD = """
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Merova Fit","applicationCategory":"HealthApplication","operatingSystem":"Web, Android","url":"https://fit.merova.app","description":"A fitness coaching app: daily workout plan, meal and calorie log, water and weight tracking, goals and badges, chat with your coach and call bookings.","publisher":{"@type":"Organization","name":"Merova","url":"https://merova.app"}}
</script>"""

import json as _json
FIT_FAQ_LD = _json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq_items]}, ensure_ascii=False)
FIT_JSONLD += f"""
<script type="application/ld+json">
{FIT_FAQ_LD}
</script>"""

FIT_NEXT = ("""  <a class="case__next" href="/work/company-hub">
    <span class="wrap case__next-in">
      <span class="case__label">Next project</span>
      <span class="case__next-title">Company Hub<span aria-hidden="true">→</span></span>
      <span class="case__next-kind">Web application</span>
      <span class="case__next-bar" aria-hidden="true"></span>
    </span>
  </a>
""") if SHOW_WORK else ""

fit = f"""<main id="main">
  <section class="fit-hero">
    <div class="wrap fit-hero__grid">
      <div class="fit-hero__copy">
        <p class="kicker fit-hero__kicker">{'<a class="link" href="/work">Work</a> <span aria-hidden="true">/</span> (01) Product' if SHOW_WORK else 'A Merova product'}</p>
        <img class="fit-hero__logo" src="assets/brand/merova-fit-lockup-bone.svg" alt="Merova Fit" width="200" height="35">
        <h1 class="display">Fitness coaching, in one app.</h1>
        <p class="lede">Your plan, your logs and your coach in one place. It runs in your browser today. Android is next.</p>
        <div class="actions">
          <a class="btn btn--primary" href="https://fit.merova.app">Open Merova Fit</a>
          <a class="btn btn--ghost" href="#updates">Tell me when it's on Android</a>
        </div>
      </div>
      <div class="fit-hero__art">
        <div class="trio" aria-hidden="true">
          {phone(eager=True, only="train", cls="phone--side phone--left")}
          {phone(eager=True, only="eat", cls="phone--side phone--right")}
        </div>
        {phone(eager=True, only="home", cls="phone--hero")}
      </div>
    </div>
  </section>

  <section class="s-light collection" aria-labelledby="tour-title">
    <div class="wrap">
      <div class="collection__head">
        {kicker("01", "A day in the app")}
        <h2 class="h2" id="tour-title">Three screens, one day.</h2>
      </div>
      <div class="product product--bare">
        {product_story()}
      </div>
    </div>
  </section>

  <section class="feats-sec" aria-labelledby="feat-title">
    <div class="wrap">
      <div class="collection__head">
        {kicker("02", "Everything in it")}
        <h2 class="h2" id="feat-title">What you can do.</h2>
      </div>
      <ul class="feats" role="list">
{fit_cells}
      </ul>
      <p class="feats__more">Also: a shop with Razorpay checkout, reminders, and light and dark mode.</p>
    </div>
  </section>

  <section class="s-light" aria-labelledby="coach-title">
    <div class="wrap">
      <div class="split">
        <p class="split__label">For coaches</p>
        <div class="prose">
          <h2 class="h3" id="coach-title">One dashboard for your clients.</h2>
          <ul class="list-lines">
            <li><strong>Clients</strong><span>See each client's logs, progress and messages in one place.</span></li>
            <li><strong>Plans</strong><span>Write workout and meal plans and update them as clients improve.</span></li>
            <li><strong>Revenue</strong><span>Keep track of plans sold, payments and shop orders.</span></li>
            <li><strong>Broadcasts</strong><span>Send one message to all your clients at once.</span></li>
          </ul>
        </div>
      </div>
      <div class="split">
        <p class="split__label">Plans</p>
        <div class="prose">
          <h2 class="h3">Start free. Upgrade when you're ready.</h2>
          <p>Merova Fit has a free version and a Premium plan, paid monthly or yearly. Plans and prices are shown in the app before you pay anything.</p>
          <dl class="facts facts--list">
            <div><dt>Trial</dt><dd>7 days of Premium, once per person</dd></div>
            <div><dt>Refunds</dt><dd>7 days from your first payment. <a class="link" href="refund.html">Refund policy</a></dd></div>
            <div><dt>Payments</dt><dd>Through Razorpay. Card, UPI and bank details never reach Merova.</dd></div>
          </dl>
        </div>
      </div>
      <div class="split">
        <p class="split__label">Your data</p>
        <div class="prose">
          <ul class="list-lines">
            <li><strong>Your data isn't sold.</strong><span>It's used to run the app for you, and nothing else. <a class="link" href="privacy.html">Privacy policy</a></span></li>
            <li><strong>Delete any time.</strong><span>From the app or by email. <a class="link" href="delete-account.html">What gets deleted</a></span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="updates" id="updates" aria-labelledby="updates-title">
    <div class="wrap updates__grid">
      <div>
        {kicker("03", "Updates")}
        <h2 class="h2" id="updates-title">Hear about launches.</h2>
        <p class="lede">One email when Merova Fit lands on Google Play, and one when the next Merova app is out.</p>
      </div>
      {WAITLIST_FORM}
    </div>
  </section>

  <section class="faq-sec s-light" id="faq" aria-labelledby="faq-title">
    <div class="wrap faq">
      <div class="faq__head">
        {kicker("04", "Questions")}
        <h2 class="h2" id="faq-title">Questions.</h2>
        <p class="muted">Something else? <a class="link" href="contact.html">Ask here</a>.</p>
      </div>
      <div class="faq__list">
{faq_html}
      </div>
    </div>
  </section>

  <section class="updates fit-end" aria-labelledby="fit-cta">
    <div class="wrap fit-cta">
      <h2 class="display" id="fit-cta">Try Merova Fit.</h2>
      <p class="lede">It runs in your browser, on your phone or laptop. No download needed.</p>
      <div class="actions">
        <a class="btn btn--primary" href="https://fit.merova.app">Open Merova Fit</a>
        <a class="btn btn--ghost" href="mailto:support@merova.app">Ask a question</a>
      </div>
    </div>
  </section>
{FIT_NEXT}</main>
"""
page("fit.html", title="Merova Fit - Fitness coaching, in one app", active="fit",
     og_title="Merova Fit - Fitness coaching, in one app",
     desc="Merova Fit is a fitness coaching app: daily workout plan, meal and calorie log, water and weight tracking, goals and badges, coach chat and call bookings.",
     body=fit, extra_head=FIT_JSONLD)

# ---------------------------------------------------------------- BRAND KIT
import zipfile

BRAND_FILES = [
    "merova-mark-ink.svg", "merova-mark-bone.svg",
    "merova-lockup-horizontal-ink.svg", "merova-lockup-horizontal-bone.svg",
    "merova-fit-lockup-ink.svg", "merova-fit-lockup-bone.svg",
    "icon-512.png", "icon-192.png",
]
KIT_README = """Merova brand kit (merova.app/brand)

Colours
  Black       #090909  the main colour: backgrounds and text
  Ivory       #F1EFE9  text and the logo on black, light sections
  Gray        #8E8B85  secondary text on black
  Vermilion   #FF4B38  a rare signal only, never a background

Type
  Instrument Sans (headings and text) and IBM Plex Mono (small labels).
  Both are free on Google Fonts.

Logo
  Use the files as they are. Ivory logo on black, black logo on ivory or white.
  Don't stretch, rotate, recolour or redraw it, and don't add effects.

Questions: hello@merova.app
"""
kit = OUT / "assets" / "brand" / "merova-brand-kit.zip"
with zipfile.ZipFile(kit, "w", zipfile.ZIP_DEFLATED) as z:
    for f in BRAND_FILES:
        z.write(OUT / "assets" / "brand" / f, f"merova-brand-kit/{f}")
    z.writestr("merova-brand-kit/README.txt", KIT_README)
KIT_KB = max(1, round(kit.stat().st_size / 1024))

def logo_tile(name, light_file, dark_file, w, h):
    return f"""          <figure class="logo-tile">
            <div class="logo-tile__pair">
              <div class="logo-tile__bg logo-tile__bg--ivory"><img src="assets/brand/{light_file}" alt="{name} on a light background" width="{w}" height="{h}" loading="lazy"></div>
              <div class="logo-tile__bg logo-tile__bg--ink"><img src="assets/brand/{dark_file}" alt="{name} on a dark background" width="{w}" height="{h}" loading="lazy"></div>
            </div>
            <figcaption>
              <span>{name}</span>
              <span class="logo-tile__dl"><a class="link" href="assets/brand/{light_file}" download>Black SVG</a><a class="link" href="assets/brand/{dark_file}" download>Ivory SVG</a></span>
            </figcaption>
          </figure>"""

SWATCHES = [
    ("ink", "Black", "#090909", "The main colour. Backgrounds and text."),
    ("ivory", "Ivory", "#F1EFE9", "Text and the logo on black. Light sections."),
    ("gray", "Gray", "#8E8B85", "Secondary text on black."),
    ("signal", "Vermilion", "#FF4B38", "A rare signal. Never a background."),
]
swatches = "\n".join(f"""          <div class="swatch">
            <div class="swatch__chip swatch__chip--{k}"></div>
            <div class="swatch__info">
              <p class="swatch__name">{n}</p>
              <div class="addr-row"><code>{hx}</code><button class="copy" type="button" data-copy="{hx}">Copy</button></div>
              <p class="muted">{d}</p>
            </div>
          </div>""" for k, n, hx, d in SWATCHES)

brand = f"""<main id="main">
  <section class="page-hero">
    <div class="wrap page-hero__inner">
      <p class="kicker">Brand kit</p>
      <h1 class="display">The Merova brand kit.</h1>
      <p class="lede">Logos, colours and type for anyone writing about Merova or Merova Fit. Take what you need.</p>
      <div class="actions">
        <a class="btn btn--primary" href="assets/brand/merova-brand-kit.zip" download>Download everything ({KIT_KB} KB)</a>
        <a class="btn btn--ghost" href="mailto:hello@merova.app">Press questions</a>
      </div>
    </div>
  </section>

  <section class="s-light sec" aria-labelledby="logo-title">
    <div class="wrap">
      <div class="collection__head">{kicker("01", "Logo")}<h2 class="h2" id="logo-title">Logo.</h2></div>
      <div class="logos">
{logo_tile("The mark", "merova-mark-ink.svg", "merova-mark-bone.svg", 80, 68)}
{logo_tile("Merova", "merova-lockup-horizontal-ink.svg", "merova-lockup-horizontal-bone.svg", 160, 32)}
{logo_tile("Merova Fit", "merova-fit-lockup-ink.svg", "merova-fit-lockup-bone.svg", 190, 33)}
        <figure class="logo-tile">
          <div class="logo-tile__pair logo-tile__pair--one">
            <div class="logo-tile__bg logo-tile__bg--ivory"><img class="logo-tile__icon" src="assets/brand/icon-512.png" alt="Merova app icon" width="96" height="96" loading="lazy"></div>
          </div>
          <figcaption>
            <span>App icon</span>
            <span class="logo-tile__dl"><a class="link" href="assets/brand/icon-512.png" download>PNG 512</a><a class="link" href="assets/brand/icon-192.png" download>PNG 192</a></span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="sec about-mark" aria-labelledby="mark-title">
    <div class="wrap about-mark__grid">
      <div class="prose">
        {kicker("02", "The mark")}
        <h2 class="h2" id="mark-title">It's called Fold.</h2>
        <p>Two planes overlap to make an M. The left plane is solid. The right one sits behind it at 42%. Both are cut at 45°. It's simple on purpose.</p>
      </div>
      <figure class="construct">
        {FOLD_SVG}
      </figure>
    </div>
  </section>

  <section class="s-light sec" aria-labelledby="colour-title">
    <div class="wrap">
      <div class="collection__head">{kicker("03", "Colour")}<h2 class="h2" id="colour-title">Black first.</h2></div>
      <div class="swatches">
{swatches}
      </div>
    </div>
  </section>

  <section class="sec" aria-labelledby="type-title">
    <div class="wrap">
      <div class="collection__head">{kicker("04", "Type")}<h2 class="h2" id="type-title">Type.</h2></div>
      <div class="types">
        <div class="type">
          <p class="type__sample">Digital work, made with intention.</p>
          <p class="type__meta">Instrument Sans. Headings and text. <a class="link" href="https://fonts.google.com/specimen/Instrument+Sans" rel="noopener">Google Fonts</a></p>
        </div>
        <div class="type">
          <p class="type__sample type__sample--mono">labels and small details</p>
          <p class="type__meta">IBM Plex Mono. Small labels only. <a class="link" href="https://fonts.google.com/specimen/IBM+Plex+Mono" rel="noopener">Google Fonts</a></p>
        </div>
      </div>
    </div>
  </section>

  <section class="s-light sec" aria-labelledby="rules-title">
    <div class="wrap">
      <div class="collection__head">{kicker("05", "Rules")}<h2 class="h2" id="rules-title">Using the logo.</h2></div>
      <div class="rules">
        <div>
          <p class="split__label">Do</p>
          <ul class="list-lines">
            <li><span>Use the files as they are.</span></li>
            <li><span>Put the ivory logo on black and the black logo on ivory or white.</span></li>
            <li><span>Leave clear space around it.</span></li>
            <li><span>Write the names as "Merova" and "Merova Fit".</span></li>
          </ul>
        </div>
        <div>
          <p class="split__label">Don't</p>
          <ul class="list-lines">
            <li><span>Stretch, rotate or redraw it.</span></li>
            <li><span>Change its colours or the 42% plane.</span></li>
            <li><span>Add shadows, outlines or gradients.</span></li>
            <li><span>Use vermilion as a background or a large fill.</span></li>
          </ul>
        </div>
      </div>
      <p class="muted rules__note">Writing about Merova? Email <a class="link" href="mailto:hello@merova.app">hello@merova.app</a>.</p>
    </div>
  </section>
</main>
"""
page("brand.html", title="Brand kit - Merova",
     desc="Download the Merova and Merova Fit logos, and see the colours, type and rules for using them.",
     body=brand)

# ---------------------------------------------------------------- sitemap + security.txt
SITEMAP_PAGES = ["", "services"] + (["work", "work/company-hub", "work/merova-site", "work/the-fold"] if SHOW_WORK else []) + ["fit", "about", "contact", "brand", "privacy", "terms", "refund", "shipping", "delete-account"]
TODAY = "2026-10-13"
PAGE_UPDATED = {"": "2026-10-24", "services": "2026-10-24", "about": "2026-10-24", "fit": "2026-10-24"}
(OUT / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "".join(f"  <url><loc>{SITE}/{p}</loc><lastmod>{PAGE_UPDATED.get(p, TODAY)}</lastmod></url>\n" for p in SITEMAP_PAGES)
    + "</urlset>\n", encoding="utf-8")
(OUT / ".well-known").mkdir(exist_ok=True)
(OUT / ".well-known" / "security.txt").write_text(
    "Contact: mailto:support@merova.app\n"
    "Expires: 2027-10-13T00:00:00.000Z\n"
    "Preferred-Languages: en\n"
    "Canonical: https://merova.app/.well-known/security.txt\n", encoding="utf-8")
print("wrote sitemap.xml, .well-known/security.txt")

# ---------------------------------------------------------------- 404
notfound = """<main id="main">
  <section class="notfound">
    <div class="wrap">
      <div class="notfound__inner">
        <svg viewBox="12 18 76 64" aria-hidden="true" focusable="false"><polygon points="84,78 84,22 42,64 42,78" opacity=".42"/><polygon points="16,78 16,22 58,64 58,78"/></svg>
        <h1 class="display">Page not found.</h1>
        <p class="lede">This page doesn't exist. The link may be old or mistyped.</p>
        <div class="actions">
          <a class="btn btn--primary" href="/">Go to the home page</a>
          <a class="btn btn--ghost" href="/contact">Contact</a>
        </div>
      </div>
    </div>
  </section>
</main>
"""
page("404.html", title="Page not found - Merova", desc="This page doesn't exist.",
     body=notfound, base="/", noindex=True, canonical="/404")
