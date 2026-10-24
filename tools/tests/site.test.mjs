import { chromium, devices } from 'playwright';
const B = process.env.BASE_URL || 'http://localhost:8765';
import { fileURLToPath } from 'node:url'; const S = process.env.SHOTS_DIR || fileURLToPath(new URL('./shots', import.meta.url));
import { mkdirSync, readFileSync } from 'node:fs'; mkdirSync(S, { recursive: true });
const EXE = process.env.CHROME_PATH || undefined;
// The portfolio can be switched off in build.py (SHOW_WORK). The work checks follow that switch.
const SHOW_WORK = /^SHOW_WORK = True/m.test(readFileSync(new URL('../build.py', import.meta.url), 'utf8'));
const WORK_PAGES = SHOW_WORK ? ['/work', '/work/company-hub', '/work/merova-site', '/work/the-fold'] : [];
const withWork = list => list.filter(p => SHOW_WORK || !p.startsWith('/work'));
const b = await chromium.launch({ executablePath: EXE });
const out = []; const ok = (c, m) => { out.push((c ? 'PASS ' : 'FAIL ') + m); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const errsAll = [];

// count every synthesized sound: wrap the Web Audio source start() calls
const soundProbe = () => {
  window.__snd = 0; window.__ctx = 0;
  const AC = window.AudioContext;
  if (!AC) return;
  window.AudioContext = function (...a) { window.__ctx++; return new AC(...a); };
  window.AudioContext.prototype = AC.prototype;
  const o = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (...a) { window.__snd++; return o.apply(this, a); };
  const c = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      const ctx = dest.context;
      if (!ctx.__an) { ctx.__an = ctx.createAnalyser(); ctx.__an.fftSize = 2048; window.__an = ctx.__an; }
      c.call(this, ctx.__an);
    }
    return c.call(this, dest, ...rest);
  };
  window.__listen = ms => new Promise(res => { let peak = 0; const buf = new Float32Array(2048); const t0 = performance.now();
    // A suspended AudioContext is silent, but its analyser keeps the last buffer.
    (function f() { if (window.__an && window.__an.context.state === 'running') { window.__an.getFloatTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v)); }
      if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(peak); })(); });
};

const state = pg => pg.evaluate(() => {
  const ch = document.querySelector('.chapter'), f = document.querySelector('[data-fold]'), band = document.querySelector('.talk__track');
  // which chapter should be showing: last [data-chapter] whose top passed the middle of the screen
  const mid = innerHeight / 2; let exp = null;
  document.querySelectorAll('[data-chapter]').forEach(c => { if (c.getBoundingClientRect().top <= mid) exp = c; });
  const footTop = document.querySelector('.site-footer').getBoundingClientRect().top;
  const expHidden = !exp || exp === document.querySelector('[data-chapter]') || footTop < innerHeight * 0.85;
  return {
    y: scrollY,
    ch: ch.querySelector('.chapter__n').textContent, chHidden: ch.classList.contains('is-hidden'),
    expCh: exp ? exp.getAttribute('data-chapter') : null, expHidden,
    p: parseFloat(getComputedStyle(f).getPropertyValue('--p') || '0'),
    aria: f.querySelector('.fold3d__scene').getAttribute('aria-valuenow'),
    angle: f.querySelector('[data-angle]').textContent,
    bx: parseFloat(band.style.getPropertyValue('--bx') || '0'),
    bandVis: (() => { const r = band.parentNode.getBoundingClientRect(); return r.bottom > -150 && r.top < innerHeight + 150; })(),
  };
});

for (const [W, H, tag] of [[1440, 1000, 'desktop'], [1024, 768, 'laptop'], [390, 844, 'mobile']]) {
  console.log(`Checking ${tag} at ${W}x${H}`);
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript(soundProbe);
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.route('https://api.web3forms.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await pg.goto(B + '/', { waitUntil: 'networkidle' });
  await wait(2200);  // let the intro settle
  const H0 = await pg.evaluate(() => document.documentElement.scrollHeight);
  const s0 = await state(pg);
  const monoLabels = await pg.evaluate(() => [...document.querySelectorAll('.kicker, .hero__intro, .menu__label, .wv__tag, .pixels__specs dt, .tlist__k, .footer__col h2')].filter(e => getComputedStyle(e).fontFamily.includes('Plex')).length);
  const parens = await pg.evaluate(() => [...document.querySelectorAll('.kicker, .hero__intro, .menu__label, .pixels__specs dt, .count, .tlist__n, .footer__col h2, .hero__tag-n')].filter(e => /^\(.*\)$/.test(e.textContent.trim())).length);
  ok(monoLabels === 0 && parens === 0, `${tag}: interface labels use the sans and have no brackets (${monoLabels} mono, ${parens} bracketed)`);
  ok(s0.aria === '-18' && s0.angle === '−18°' && s0.p === 0, `${tag}: Fold at rest at the top (${s0.aria}, ${s0.angle}, p=${s0.p})`);

  // ---- two full down/up cycles, sampling the same scroll positions each time
  const ys = []; for (let y = 0; y <= H0 - H; y += Math.round(H * 0.37)) ys.push(y); ys.push(H0 - H);
  const samples = [];
  let chapterBad = [], foldBad = [], dirBad = 0, dirChecks = 0;
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const dir of ['down', 'up']) {
      const seq = dir === 'down' ? ys : [...ys].reverse();
      let prev = null;
      for (const y of seq) {
        // move with the wheel for the first cycle (real input), instant jumps for the second
        if (cycle === 0) { const cur = await pg.evaluate(() => scrollY); await pg.mouse.move(W / 2, H / 2); await pg.mouse.wheel(0, y - cur); await wait(250); await pg.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); }
        else await pg.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
        await wait(650);
        const s = await state(pg);
        samples.push({ cycle, dir, ...s });
        if (W >= 1100 && (s.chHidden !== s.expHidden || (!s.expHidden && s.ch !== s.expCh))) chapterBad.push(`${dir}@${s.y}:${s.ch}/${s.chHidden} want ${s.expCh}/${s.expHidden}`);
        if (s.aria !== '-18' || s.angle !== '−18°') foldBad.push(`${dir}@${s.y}:${s.aria}/${s.angle}`);
        prev = s;
      }
    }
  }
  ok(chapterBad.length === 0, `${tag}: section marker correct in both directions over 2 cycles` + (W < 1100 ? ' (hidden below 1100px by design)' : '') + (chapterBad.length ? ' ' + chapterBad.slice(0, 4).join(', ') : ''));
  ok(foldBad.length === 0, `${tag}: scrolling never changes the Fold's angle or readout` + (foldBad.length ? ' ' + foldBad.slice(0, 3).join(', ') : ''));
  // same position, same band offset, whichever way you came from
  const byY = {}; samples.filter(s => s.bandVis).forEach(s => { (byY[s.y] = byY[s.y] || []).push(s.bx); });
  const drift = [0, ...Object.entries(byY).map(([y, a]) => Math.max(...a) - Math.min(...a))];
  ok(Math.max(...drift) < 1.5, `${tag}: band offset identical at each scroll position down and up (${Object.keys(byY).length} positions, max diff ${Math.max(...drift).toFixed(2)}px)`);
  const pAt = {}; samples.forEach(s => { (pAt[s.y] = pAt[s.y] || []).push(s.p); });
  ok(Object.values(pAt).every(a => Math.max(...a) - Math.min(...a) < 0.002), `${tag}: hero scroll layer identical at each position in both directions`);
  const top = samples.filter(s => s.y === 0);
  ok(top.every(s => s.p === 0 && s.aria === '-18'), `${tag}: back at the top, the Fold is exactly at rest every time`);

  // band direction: scroll down a little, it moves left; back up, it moves right by the same amount
  const band = await pg.evaluate(() => { const r = document.querySelector('.talk__band').getBoundingClientRect(); return r.top + scrollY; });
  await pg.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), band - H * 0.6); await wait(800);
  const b1 = (await state(pg)).bx;
  await pg.mouse.wheel(0, 120); await wait(900);
  const b2 = (await state(pg)).bx;
  await pg.mouse.wheel(0, -120); await wait(900);
  const b3 = (await state(pg)).bx;
  ok(b2 < b1 && Math.abs(b3 - b1) < 1.5, `${tag}: band runs left on scroll down (${b1.toFixed(1)} -> ${b2.toFixed(1)}) and back on scroll up (${b3.toFixed(1)})`);

  // reveals: nothing stuck. At the bottom everything above is shown; at the top, everything in view is shown
  await pg.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await wait(1200);
  const stuckDown = await pg.evaluate(() => [...document.querySelectorAll('.rv, .rv-box, .rv-words')].filter(e => e.getBoundingClientRect().bottom < innerHeight && !e.classList.contains('is-in')).length);
  await pg.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await wait(1200);
  const stuckUp = await pg.evaluate(() => [...document.querySelectorAll('.rv, .rv-box, .rv-words')].filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.85 && r.bottom > 0 && !e.classList.contains('is-in'); }).length);
  const resetBelow = await pg.evaluate(() => [...document.querySelectorAll('.rv, .rv-box, .rv-words')].filter(e => e.getBoundingClientRect().top > innerHeight * 1.2).every(e => !e.classList.contains('is-in')));
  ok(stuckDown === 0 && stuckUp === 0 && resetBelow, `${tag}: reveals reverse cleanly (stuck at bottom ${stuckDown}, at top ${stuckUp}, below-fold reset ${resetBelow})`);

  if (SHOW_WORK) {
  // ---- home teaser: compact, links to /work, list drives the preview
  const teaser = await pg.evaluate(() => ({ grid: !!document.querySelector('.wgrid'), cards: document.querySelectorAll('.wcard').length, items: document.querySelectorAll('.tlist__link').length, all: [...document.querySelectorAll('.teaser a.btn')].map(a => a.getAttribute('href')), hero: [...document.querySelectorAll('.hero a.btn')].map(a => a.textContent.trim() + '=' + a.getAttribute('href')), nav: document.querySelector('.bar__link').getAttribute('href') }));
  ok(!teaser.grid && teaser.cards === 0 && teaser.items === 4 && teaser.all.includes('/work'), `${tag}: home has a compact teaser (no gallery), ${teaser.items} entries and See all work -> /work`);
  ok(teaser.hero.some(h => h.startsWith('See the work') && h.endsWith('=/work')) && teaser.hero.some(h => h.startsWith('Start a project') && h.endsWith('=/services#enquire')) && teaser.nav === '/work', `${tag}: hero CTAs and header Work link go to the right places (${teaser.hero.join(', ')})`);
  if (W > 900) {
    await pg.evaluate(() => document.querySelector('#work').scrollIntoView({ behavior: 'instant' })); await wait(1200);
    await (await pg.$$('.tlist__link'))[2].hover(); await wait(900);
    const sw = await pg.evaluate(() => ({ on: [...document.querySelectorAll('.teaser__slide')].findIndex(s => s.classList.contains('is-on')), href: document.querySelector('.teaser__stage').getAttribute('href'), cap: document.querySelector('[data-teaser-title]').textContent }));
    ok(sw.on === 2 && sw.href === '/work/merova-site' && sw.cap === 'merova.app', `${tag}: hovering a project name swaps the preview and its link (${sw.cap} -> ${sw.href})`);
    await pg.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await wait(500);
  }
  } else {
    const hidden = await pg.evaluate(() => ({ work: document.querySelectorAll('a[href^="/work"], #work, .teaser').length, hero: [...document.querySelectorAll('.hero .btn')].map(a => a.getAttribute('href')) }));
    ok(hidden.work === 0 && hidden.hero.includes('/services#enquire') && hidden.hero.includes('/services'), `${tag}: portfolio hidden: no work section or Work links; hero goes to Start a project and the services`);
  }

  // ---- the Fold controls, including while the page is scrolled
  const scene = await pg.$('.fold3d__scene'); const bb = await scene.boundingBox();
  await pg.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await pg.mouse.down();
  await pg.mouse.move(bb.x + bb.width / 2 + 120, bb.y + bb.height / 2, { steps: 8 }); await pg.mouse.up(); await wait(1200);
  let f = await state(pg);
  ok(+f.aria > -18 && f.angle.replace('−', '-') === f.aria + '°', `${tag}: drag turns it and the readout matches (${f.aria}, ${f.angle})`);
  await pg.click('[data-fold="align"]'); await wait(1100);
  f = await state(pg);
  ok(f.aria === '0' && await pg.$eval('[data-fold]', e => e.classList.contains('is-aligned')), `${tag}: Line up aligns into the logo`);
  await pg.evaluate(() => scrollTo({ top: 260, behavior: 'instant' })); await wait(400);
  await pg.click('[data-fold="reset"]'); await wait(1100);
  f = await state(pg);
  ok(f.aria === '-18' && f.angle === '−18°' && f.p > 0, `${tag}: Reset while scrolled restores −18° (p=${f.p.toFixed(2)})`);
  await pg.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await wait(400);
  f = await state(pg);
  ok(f.p === 0 && f.aria === '-18', `${tag}: and back at the top it's exactly at rest`);
  await pg.focus('.fold3d__scene'); await pg.keyboard.press('ArrowRight'); await wait(80);
  ok((await state(pg)).aria === '-13', `${tag}: arrow key turns 5°`);
  await pg.keyboard.press('End'); await wait(800);
  ok((await state(pg)).aria === '-18', `${tag}: End key resets`);

  // ---- menu
  await pg.click('.menu-btn'); await wait(900);
  const m1 = await pg.evaluate(() => ({ open: document.getElementById('menu').classList.contains('is-open'), lock: getComputedStyle(document.documentElement).overflow, inert: document.querySelector('main').inert, items: [...document.querySelectorAll('.menu__list a')].map(a => a.textContent.replace(/\d|→/g, '').trim()), focusIn: !!document.activeElement.closest('.menu') }));
  ok(m1.open && m1.lock === 'hidden' && m1.inert && m1.focusIn, `${tag}: menu opens, locks scroll, makes the page inert, moves focus in`);
  ok(m1.items.join(',') === (SHOW_WORK ? 'Home,Work,Services,Studio,Contact' : 'Home,Services,Studio,Contact'), `${tag}: menu items ${m1.items.join(', ')}`);
  const panel = await (await pg.$('.menu__panel')).boundingBox();
  ok(Math.abs(panel.x + panel.width - W) < 1, `${tag}: drawer is attached to the right edge (${Math.round(panel.width)}px wide)`);
  await pg.screenshot({ path: `${S}/t6-${tag}-menu.png` });
  let trapped = true; for (let i = 0; i < 14; i++) { await pg.keyboard.press('Tab'); if (!(await pg.evaluate(() => !!document.activeElement.closest('.menu')))) trapped = false; }
  ok(trapped, `${tag}: Tab stays inside the open menu`);
  await pg.keyboard.press('Escape'); await wait(700);
  ok(await pg.evaluate(() => document.getElementById('menu').hidden && document.activeElement.classList.contains('menu-btn') && !document.querySelector('main').inert), `${tag}: Escape closes and returns focus to Menu`);
  if (W > 600) {
    await pg.click('.menu-btn'); await wait(900);
    await pg.mouse.click(20, H - 20); await wait(700);
    ok(await pg.evaluate(() => document.getElementById('menu').hidden), `${tag}: clicking the dimmed page closes the menu`);
  }

  // ---- sound: off by default, on only by choice, hover cues only when on
  await pg.click('.menu-btn'); await wait(900);
  const rows = await pg.$$('.menu__list a');
  await rows[1].hover(); await rows[2].hover(); await wait(150);
  let snd = await pg.evaluate(() => ({ n: window.__snd, c: window.__ctx }));
  ok(snd.n === 0 && snd.c === 0, `${tag}: sound is off by default, no audio created (${snd.n} cues, ${snd.c} contexts)`);
  await pg.click('.menu [data-sound-toggle]'); await wait(300);
  const tog = await pg.evaluate(() => ({ pressed: document.querySelector('.menu [data-sound-toggle]').getAttribute('aria-pressed'), label: document.querySelector('.menu [data-sound-toggle] [data-sound-label]').textContent, store: localStorage.getItem('merova-sound'), n: window.__snd }));
  ok(tog.pressed === 'true' && tog.label === 'Sound on' && tog.store === 'on' && tog.n > 0, `${tag}: Sound toggle turns on, shows it, remembers it, confirms with a chime`);
  let n0 = await pg.evaluate(() => window.__snd);
  const listening = pg.evaluate(() => window.__listen(400));
  await rows[3].hover(); await wait(80); await rows[0].hover();
  const peak = await listening;
  let n1 = await pg.evaluate(() => window.__snd);
  ok(n1 > n0 && peak > 0.005, `${tag}: hovering menu rows plays an audible tick when sound is on (${n1 - n0} tones, peak level ${peak.toFixed(3)})`);
  await pg.click('.menu [data-sound-toggle]'); await wait(200);
  await wait(600);
  n0 = await pg.evaluate(() => window.__snd);
  const muted = pg.evaluate(() => window.__listen(400));
  await rows[2].hover(); await wait(80); await rows[rows.length - 1].hover();
  const mpeak = await muted;
  n1 = await pg.evaluate(() => window.__snd);
  ok(n1 === n0 && mpeak < 0.001 && await pg.evaluate(() => localStorage.getItem('merova-sound')) === 'off', `${tag}: turning sound off silences it immediately and remembers (peak ${mpeak.toFixed(4)})`);
  await pg.keyboard.press('Escape'); await wait(700);

  // ---- context cursor (desktop and laptop only)
  if (W > 600) {
   if (SHOW_WORK) {
    await pg.evaluate(() => document.querySelector('#work').scrollIntoView({ behavior: 'instant' })); await wait(1400);
    const vis = await (await pg.$('.teaser__stage')).boundingBox();
    await pg.mouse.move(vis.x + 30, vis.y + 30); await pg.mouse.move(vis.x + vis.width * 0.6, vis.y + vis.height * 0.9, { steps: 6 }); await wait(500);
    const cue = await pg.evaluate(() => { const c = document.querySelector('.pcur'); const r = c.getBoundingClientRect(); return { on: c.classList.contains('is-on'), label: c.textContent.trim(), r: { l: r.left, t: r.top, b: r.bottom, rt: r.right } }; });
    ok(cue.on && cue.label === 'View project ↗', `${tag}: project image shows "${cue.label}"`);
    ok(cue.r.b <= vis.y + vis.height + 1 && cue.r.rt <= vis.x + vis.width + 1, `${tag}: the label stays inside the image, off the title below`);
    await pg.screenshot({ path: `${S}/t6-${tag}-cursor.png` });
    await pg.mouse.move(5, vis.y - 60); await wait(300);
    ok(!(await pg.evaluate(() => document.querySelector('.pcur').classList.contains('is-on'))), `${tag}: label goes away when leaving the image`);
   }
    ok(await pg.$eval('.btn--primary', e => getComputedStyle(e).cursor) === 'pointer' && await pg.$eval('main p', e => getComputedStyle(e).cursor) === 'auto', `${tag}: ordinary cursor everywhere else`);
    await pg.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await wait(500);
    const sc = await (await pg.$('.fold3d__scene')).boundingBox();
    await pg.mouse.move(sc.x + sc.width / 2, sc.y + sc.height / 2, { steps: 4 }); await wait(400);
    ok(await pg.evaluate(() => { const c = document.querySelector('.pcur'); return c.classList.contains('is-on') && c.textContent.trim() === 'Drag to turn'; }), `${tag}: the Fold shows "Drag to turn" while the pointer is on it`);
    await pg.mouse.move(5, 5);
  }

  // ---- overflow on every page
  const over = [];
  for (const p of withWork(['/', '/work', '/services', '/about', '/contact', '/fit', '/work/company-hub', '/work/merova-site', '/work/the-fold', '/brand', '/privacy'])) {
    await pg.goto(B + p, { waitUntil: 'networkidle' });
    const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
    if (sw > W) over.push(p + ':' + sw);
  }
  ok(over.length === 0, `${tag}: no horizontal overflow on ${withWork(['/', '/work', '/services', '/about', '/contact', '/fit', '/work/company-hub', '/work/merova-site', '/work/the-fold', '/brand', '/privacy']).length} pages ${over.join(' ')}`);
  ok(errs.length === 0, `${tag}: no console errors ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---- remembered sound: never starts by itself, only after the first click
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(soundProbe);
  await ctx.addInitScript(() => localStorage.setItem('merova-sound', 'on'));
  const pg = await ctx.newPage();
  await pg.goto(B + '/', { waitUntil: 'networkidle' }); await wait(1500);
  if (SHOW_WORK) {
  await pg.evaluate(() => document.querySelector('#work').scrollIntoView({ behavior: 'instant' })); await wait(1200);
  const v = await (await pg.$('.teaser__stage')).boundingBox();
  await pg.mouse.move(v.x + 50, v.y + 50, { steps: 3 }); await wait(200);
  const before = await pg.evaluate(() => ({ n: window.__snd, c: window.__ctx }));
  ok(before.c === 0 && before.n === 0, 'remembered "on": no audio before the visitor clicks anything');
  await pg.mouse.click(20, 500); await wait(200);
  await pg.mouse.move(5, v.y - 40); await pg.mouse.move(v.x + 60, v.y + 60, { steps: 3 }); await wait(250);
  const after = await pg.evaluate(() => window.__snd);
  ok(after > 0, `remembered "on": after a click, the project hover cue plays (${after} tones)`);
  } else {
    const before = await pg.evaluate(() => ({ n: window.__snd, c: window.__ctx }));
    ok(before.c === 0 && before.n === 0, 'remembered "on": no audio before the visitor clicks anything');
    await pg.mouse.click(20, 500); await wait(200);
    await pg.click('[data-fold="align"]'); await wait(1600);
    const after = await pg.evaluate(() => window.__snd);
    ok(after > 0, `remembered "on": after a click, the Line up cue plays (${after} tones)`);
  }
  await ctx.close();
}

// ---- enquiry path, links, no payment button
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage(); let posted = 0, body = null;
  await pg.route('https://api.web3forms.com/**', async r => { posted++; body = r.request().postData(); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }); });
  await pg.goto(B + '/services?type=app#enquire', { waitUntil: 'networkidle' });
  ok(await pg.$eval('#q-type', e => e.value) === 'app', 'service row link preselects the project type');
  await pg.click('#enquiry-form button[type=submit]'); await wait(200);
  ok((await pg.$eval('#enquiry-form .form-status', e => e.textContent)).startsWith('Please fill in'), 'empty enquiry explains what is missing');
  await pg.fill('#q-name', 'Test'); await pg.fill('#q-email', 'test@example.com'); await pg.fill('#q-idea', 'A portfolio site'); await pg.fill('#q-budget', 'Not sure');
  await pg.selectOption('#q-time', 'Within a month');
  await pg.click('#enquiry-form button[type=submit]'); await wait(600);
  ok(posted === 1 && /Within a month/.test(body || '') && (await pg.$eval('#enquiry-form .form-status', e => e.textContent)).startsWith('Thanks'), 'enquiry sends idea, timeline and budget, and confirms');
  const links = new Set(), mailtos = new Set(); let payText = [];
  for (const p of withWork(['/', '/work', '/services', '/about', '/contact', '/fit', '/work/company-hub', '/work/merova-site', '/work/the-fold', '/brand'])) {
    await pg.goto(B + p, { waitUntil: 'domcontentloaded' });
    (await pg.$$eval('a[href]', as => as.map(a => a.getAttribute('href')))).forEach(h => { if (h.startsWith('mailto:')) mailtos.add(h.split('?')[0]); else if (h.startsWith('/') || (!h.includes(':') && !h.startsWith('#'))) links.add(h.startsWith('/') ? h : '/' + h); });
    const t = await pg.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('a[href]')].map(a => a.href).join(' '));
    if (/pay now|book now|rzp\.io|razorpay\.me|pages\.razorpay/i.test(t)) payText.push(p);
  }
  const bad = []; for (const l of links) { const r = await pg.request.get(B + l.split('#')[0]); if (r.status() !== 200) bad.push(l + ' ' + r.status()); }
  ok(bad.length === 0, `all ${links.size} internal links work ${bad.join(',')}`);
  if (!SHOW_WORK) { const r = await pg.request.get(B + '/work/the-fold', { maxRedirects: 0 }); ok([307, 308].includes(r.status()) && r.headers()['location'] === '/', `old /work links redirect home (${r.status()})`); }
  ok([...mailtos].every(m => /^mailto:(hello|support)@merova\.app$/.test(m)) && mailtos.has('mailto:hello@merova.app'), `email links: ${[...mailtos].join(', ')}`);
  ok(payText.length === 0, 'no payment or booking button published anywhere ' + payText.join(','));
  const named = [];
  for (const p of withWork(['/', '/work', '/services', '/about', '/fit', '/work/company-hub', '/work/merova-site', '/work/the-fold'])) {
    const html = await (await pg.request.get(B + p)).text();
    if (/Aaditya|Kumawat|IIT Delhi/.test(html)) named.push(p);
  }
  ok(named.length === 0, 'personal name not on any studio or product page ' + named.join(','));
  await ctx.close();
}

// ---- touch phone
{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(soundProbe);
  await ctx.addInitScript(() => localStorage.setItem('merova-sound', 'on'));
  const pg = await ctx.newPage(); const me = []; pg.on('pageerror', e => me.push(String(e)));
  await pg.goto(B + '/', { waitUntil: 'networkidle' }); await wait(2000);
  ok(await pg.$eval('.pcur', () => true).catch(() => false) === false, 'touch: no custom cursor element at all');
  ok(await pg.$eval('[data-state]', e => e.textContent) === 'Swipe to turn', 'touch: the Fold says swipe');
  await pg.tap('[data-fold="align"]'); await wait(1100);
  ok(await pg.$eval('[data-fold]', e => e.classList.contains('is-aligned')), 'touch: Line up works');
  await pg.tap('[data-fold="reset"]'); await wait(1100);
  ok(await pg.$eval('.fold3d__scene', e => e.getAttribute('aria-valuenow')) === '-18', 'touch: Reset works');
  await pg.tap('.menu-btn'); await wait(900);
  ok(await pg.$eval('#menu', e => e.classList.contains('is-open')), 'touch: menu opens');
  const before = await pg.evaluate(() => window.__snd);
  await pg.evaluate(() => document.querySelectorAll('.menu__list a')[2].dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' })));
  ok(await pg.evaluate(() => window.__snd) === before, 'touch: no hover sounds from touches');
  await pg.screenshot({ path: `${S}/t6-touch-menu.png` });
  await pg.tap('.menu__close'); await wait(800);
  ok(await pg.$eval('#menu', e => e.hidden), 'touch: menu closes');
  ok(me.length === 0, 'touch: no errors ' + me.join(' | '));
  await ctx.close();
}

// ---- keyboard only
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const pg = await ctx.newPage();
  await pg.goto(B + '/', { waitUntil: 'networkidle' });
  await pg.keyboard.press('Tab');
  ok(await pg.evaluate(() => document.activeElement.classList.contains('skip-link')), 'keyboard: Tab 1 is the skip link');
  let hit = false; for (let i = 0; i < 8 && !hit; i++) { await pg.keyboard.press('Tab'); hit = await pg.evaluate(() => document.activeElement.classList.contains('menu-btn')); }
  await pg.keyboard.press('Enter'); await wait(900);
  ok(hit && await pg.evaluate(() => document.getElementById('menu').classList.contains('is-open') && document.activeElement.closest('.menu__list') !== null), 'keyboard: Menu opens with Enter and focus lands on the first item');
  await pg.keyboard.press('Escape'); await wait(700);
  await ctx.close();
}

// ---- reduced motion
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  await pg.goto(B + '/', { waitUntil: 'networkidle' });
  ok(await pg.$eval('.fold3d__scene', e => e.getAttribute('aria-valuenow')) === '-18', 'reduced motion: no intro spin');
  const readBand = () => pg.$eval('.talk__track', e => {
    const transform = getComputedStyle(e).transform;
    const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
    return { transform, x: matrix.m41, y: matrix.m42 };
  });
  const bandStates = [await readBand()];
  for (let y = 0; y < 9000; y += 600) { await pg.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await wait(60); bandStates.push(await readBand()); }
  ok(bandStates.every(s => s.transform === bandStates[0].transform && Math.abs(s.x) < 0.01 && Math.abs(s.y) < 0.01), 'reduced motion: the band stays at zero translation throughout scrolling');
  ok(await pg.evaluate(() => !(parseFloat(getComputedStyle(document.querySelector('[data-fold]')).getPropertyValue('--p')) > 0)), 'reduced motion: the hero object does not move with scroll');
  const hidden = await pg.$$eval('main h1, main h2, main h3, main p:not(.chapter), main a, main button, main li', els => els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.5 && e.getBoundingClientRect().height > 0).length);
  ok(hidden === 0, 'reduced motion: nothing hidden');
  await ctx.close();
}

await b.close();
console.log(out.join('\n'));
console.log(`\n${out.filter(l => l.startsWith('PASS')).length} passed, ${out.filter(l => l.startsWith('FAIL')).length} failed`);
if (out.some(line => line.startsWith('FAIL'))) process.exitCode = 1;
