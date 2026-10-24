import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHOW_WORK = /^SHOW_WORK = True/m.test(readFileSync(new URL('../build.py', import.meta.url), 'utf8'));
const base = process.env.BASE_URL || 'http://localhost:8765';
const shots = fileURLToPath(new URL('./shots/finder/', import.meta.url));
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; console.log('PASS ' + message); };
const briefKey = 'merova-project-brief-v1';
const variants = [
  ['website', 'Website design and development', '/work/merova-site'],
  ['motion', 'Interactive and motion-led websites', '/work/the-fold'],
  ['app', 'Web applications and digital products', '/work/company-hub'],
  ['improve', 'Product design and ongoing improvements', '/work/merova-site']
];
try {
  for (const [width, height, label] of [[1440, 1000, 'desktop'], [1024, 768, 'tablet'], [390, 844, 'mobile']]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    let requests = 0;
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('https://api.web3forms.com/**', route => { requests++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }); });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    check(await page.locator('.hero__aside a[href="#services"]').count() === 1, label + ': finder is discoverable from the hero');
    for (const [key, title, href] of variants) {
      await page.locator(`[data-project-choice][value="${key}"]`).check();
      check(await page.locator('[data-finder-title]').textContent() === title, label + ': ' + key + ' recommends the matching service');
      if (SHOW_WORK) {
        check(await page.locator('[data-finder-work]').getAttribute('href') === href, label + ': ' + key + ' links to real work');
        await page.locator('[data-finder-image]').scrollIntoViewIfNeeded();
        await page.locator('[data-finder-image]').evaluate(image => new Promise(done => image.complete && image.naturalWidth ? done() : (image.onload = done, image.onerror = done, setTimeout(done, 3000))));
        check(await page.locator('[data-finder-image]').evaluate(image => image.complete && image.naturalWidth > 0), label + ': ' + key + ' preview loads');
      } else {
        check(await page.locator('[data-finder-work], a[href^="/work"]').count() === 0, label + ': ' + key + ' shows no portfolio link while work is hidden');
      }
    }
    await page.locator('[data-project-choice][value="app"]').check();
    await page.locator('[data-finder-timeline]').selectOption({ label: 'Within a month' });
    const note = 'A useful product for my customers. <script>window.unwanted = true</script>';
    await page.locator('[data-finder-note]').fill(note);
    check(requests === 0, label + ': selecting and drafting sends nothing');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': no horizontal overflow');
    await page.locator('.finder').screenshot({ path: shots + label + '.png' });
    await page.locator('[data-finder-continue]').click();
    await page.waitForURL('**/services?type=app&from=finder#enquire');
    check(await page.locator('#q-type').inputValue() === 'app' && await page.locator('#q-time').inputValue() === 'Within a month', label + ': service and timeline carry into enquiry');
    check(await page.locator('#q-idea').inputValue() === note, label + ': note carries as editable text');
    check(!await page.evaluate(() => window.unwanted), label + ': a note is never interpreted as HTML');
    check(await page.locator('[data-enquiry-brief]').isVisible() && await page.locator('[data-enquiry-goal]').inputValue() === 'An idea people can use', label + ': summary and enquiry goal are present');
    check(!page.url().includes('useful') && !page.url().includes('month'), label + ': note and timeline stay out of the URL');
    await page.locator('#q-type').selectOption('website');
    check(await page.locator('[data-enquiry-goal]').inputValue() === 'A home for my business' && (await page.locator('[data-enquiry-summary]').textContent()).includes('Website design'), label + ': editing the service also updates the enquiry goal and summary');
    await page.locator('#enquiry-form button[type="submit"]').click();
    check(requests === 0 && await page.locator('#q-name').getAttribute('aria-invalid') === 'true', label + ': explicit submission validates missing contact details');
    await page.locator('#q-name').fill('Local QA');
    await page.locator('#q-email').fill('qa@example.com');
    await page.locator('#enquiry-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('#enquiry-form .form-status').dataset.state === 'ok');
    check(requests === 1 && !await page.evaluate(key => sessionStorage.getItem(key), briefKey), label + ': successful mocked submission clears the draft');
    check(!await page.locator('[data-enquiry-brief]').isVisible(), label + ': successful mocked submission clears the summary');
    check(errors.length === 0, label + ': no console or CSP errors: ' + errors.join(', '));
    await context.close();
  }

  const keyboard = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await keyboard.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('[data-project-choice][value="website"]').focus();
  await page.keyboard.press('ArrowDown');
  check(await page.locator('[data-project-choice][value="motion"]').isChecked() && (await page.locator('[data-finder-title]').textContent()).startsWith('Interactive'), 'keyboard: native arrow keys update the recommendation');
  await page.locator('[data-finder-timeline]').selectOption({ label: 'Flexible' });
  await page.locator('[data-finder-note]').fill('Keep this idea while I compare options.');
  await page.locator('[data-finder-continue]').click();
  await page.waitForURL('**/services?type=motion&from=finder#enquire');
  await page.locator('[data-enquiry-brief] a').click();
  await page.waitForURL('**/#services');
  check(await page.locator('[data-project-choice][value="motion"]').isChecked() && await page.locator('[data-finder-note]').inputValue() === 'Keep this idea while I compare options.', 'return path: choices and note survive changing the brief');
  check((await page.locator('[data-finder-status]').textContent()).includes('Interactive'), 'return path: status matches the restored choice');
  await keyboard.close();

  const blocked = await browser.newContext({ reducedMotion: 'reduce' });
  await blocked.addInitScript(key => {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, type: 'website', timeline: 'Flexible', note: 'Old note that should stay cleared.' }));
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new Error('Storage disabled'); return setItem.call(this, name, value); };
  }, briefKey);
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(base + '/', { waitUntil: 'networkidle' });
  await blockedPage.locator('[data-finder-note]').fill('Do not silently lose this note.');
  await blockedPage.locator('[data-finder-continue]').click();
  check((await blockedPage.locator('[data-finder-status]').textContent()).includes('Copy your note') && new URL(blockedPage.url()).pathname === '/', 'storage unavailable: explains how to keep the note before leaving');
  await blockedPage.locator('[data-finder-note]').fill('');
  await blockedPage.locator('[data-finder-timeline]').selectOption({ label: 'Not sure yet' });
  await blockedPage.locator('[data-finder-continue]').click();
  check(new URL(blockedPage.url()).pathname === '/', 'storage unavailable: clearing a saved brief cannot accidentally restore stale notes');
  await blockedPage.locator('.finder__direct').click();
  await blockedPage.waitForURL('**/services#enquire');
  check(await blockedPage.locator('#q-idea').inputValue() === '', 'storage unavailable: direct enquiry stays usable');
  await blocked.close();

  const invalid = await browser.newContext({ reducedMotion: 'reduce' });
  await invalid.addInitScript(key => sessionStorage.setItem(key, JSON.stringify({ version: 1, type: '__proto__', timeline: 'Flexible', note: 'Untrusted draft' })), briefKey);
  const invalidPage = await invalid.newPage();
  await invalidPage.goto(base + '/services?type=app&from=finder#enquire', { waitUntil: 'networkidle' });
  check(!await invalidPage.locator('[data-enquiry-brief]').isVisible() && await invalidPage.locator('#q-type').inputValue() === 'app', 'invalid draft: ignored while valid service preselection works');
  await invalid.close();

  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await noScript.newPage();
  await staticPage.goto(base + '/', { waitUntil: 'networkidle' });
  check(await staticPage.locator('.finder__noscript a').isVisible() && !await staticPage.locator('.finder__inputs').isVisible(), 'no JavaScript: a clear direct enquiry replaces inactive controls');
  check(SHOW_WORK ? await staticPage.locator('[data-finder-work]').isVisible() : await staticPage.locator('[data-finder-work]').count() === 0, SHOW_WORK ? 'no JavaScript: real work example remains available' : 'no JavaScript: no portfolio link while work is hidden');
  await noScript.close();

  const touch = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
  const touchPage = await touch.newPage();
  await touchPage.goto(base + '/', { waitUntil: 'networkidle' });
  await touchPage.locator('label').filter({ has: touchPage.locator('[data-project-choice][value="improve"]') }).tap();
  check(await touchPage.locator('[data-project-choice][value="improve"]').isChecked() && (await touchPage.locator('[data-finder-status]').textContent()).includes('ongoing'), 'touch: tapping a choice updates the accessible starting point');
  await touch.close();
  console.log(`\n${passed} finder checks passed. Form submissions were mocked.`);
} finally { await browser.close(); }
