import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.env.BASE_URL || 'http://localhost:8765';
const shots = process.env.SHOTS_DIR || fileURLToPath(new URL('./shots/lab', import.meta.url));
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let passed = 0, failed = 0;
const check = (value, message) => {
  console.log(`${value ? 'PASS' : 'FAIL'} ${message}`);
  value ? passed++ : failed++;
};
const select = async (page, name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();

try {
  for (const [width, height] of [[1440, 1000], [1024, 768], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('https://api.web3forms.com/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1900);
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector('.hero__pin').getBoundingClientRect();
      const tags = document.querySelector('.hero__tags').getBoundingClientRect();
      const cta = document.querySelector('.hero__aside .actions').getBoundingClientRect();
      return { tagsContained: tags.bottom <= hero.bottom + 1, ctaContained: cta.bottom <= hero.bottom + 1, ctaVisible: cta.bottom <= innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    check(geometry.tagsContained && geometry.ctaContained && !geometry.overflow, `${width}: hero labels and CTAs fit their container without overflow`);
    check(geometry.ctaVisible, `${width}: primary CTA visible in first viewport`);
    await page.screenshot({ path: `${shots}/hero-${width}.png` });
    await page.locator('#direction-lab').scrollIntoViewIfNeeded();
    const title = await page.locator('.lab__sample-title').textContent();
    for (const direction of ['editorial', 'bold', 'minimal']) {
      await select(page, 'lab_direction', direction);
      for (const device of ['desktop', 'mobile']) {
        await select(page, 'lab_device', device);
        await page.waitForTimeout(600);
        check(await page.locator('[data-direction-lab]').getAttribute('data-direction') === direction && await page.locator('[data-direction-lab]').getAttribute('data-device') === device, `${width}: ${direction}/${device} responds to control`);
        check(await page.locator('.lab__sample-title').textContent() === title, `${width}: ${direction}/${device} preserves the same concept`);
        const fit = await page.evaluate(() => {
          const preview = document.querySelector('[data-lab-preview]').getBoundingClientRect();
          const title = document.querySelector('.lab__sample-title').getBoundingClientRect();
          const action = document.querySelector('.lab__sample-action').getBoundingClientRect();
          return title.left >= preview.left && title.right <= preview.right + 1 && title.top >= preview.top && action.bottom <= preview.bottom && document.documentElement.scrollWidth <= innerWidth;
        });
        check(fit, `${width}: ${direction}/${device} sample content fits without clipping`);
        const axe = await new AxeBuilder({ page }).include('#direction-lab').analyze();
        check(!axe.violations.length, `${width}: ${direction}/${device} accessibility ${axe.violations.map(v => v.id).join(',') || 'clean'}`);
        if (width === 1440 || device === 'mobile') await page.locator('#direction-lab').screenshot({ path: `${shots}/lab-${width}-${direction}-${device}.png` });
      }
    }
    await page.locator('[data-finder-note]').fill('My existing project idea.');
    await select(page, 'lab_direction', 'bold');
    await page.locator('[data-lab-use]').click();
    check(await page.locator('[data-finder-note]').inputValue() === 'My existing project idea.\n\nVisual direction: Bold (Merova direction lab).', `${width}: handoff preserves existing writing`);
    await select(page, 'lab_direction', 'minimal');
    await page.locator('[data-lab-use]').click();
    const note = await page.locator('[data-finder-note]').inputValue();
    check(note === 'My existing project idea.\n\nVisual direction: Minimal (Merova direction lab).', `${width}: changed direction replaces its own line without duplicates`);
    await page.locator('[data-finder-continue]').click();
    await page.waitForURL('**/services?**');
    check(await page.locator('#q-idea').inputValue() === note && !page.url().includes('Minimal'), `${width}: direction and note reach enquiry without appearing in URL`);
    await page.goto(base);
    await page.locator('[data-finder-note]').fill('x'.repeat(1200));
    await page.locator('[data-lab-use]').click();
    check((await page.locator('[data-finder-note]').inputValue()).length === 1200 && (await page.locator('[data-lab-status]').textContent()).includes('full'), `${width}: full note is preserved with a useful error`);
    check(!errors.length, `${width}: no browser or CSP errors ${errors.join('; ')}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator('[data-lab-direction][value="editorial"]').focus();
  await page.keyboard.press('ArrowRight');
  check(await page.locator('[data-direction-lab]').getAttribute('data-direction') === 'bold', 'keyboard: arrow keys select visual direction');
  check(await page.locator('[data-lab-direction][value="bold"]').evaluate(el => el === document.activeElement && getComputedStyle(el.nextElementSibling).outlineStyle !== 'none'), 'keyboard: selected control has a visible focus indicator');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await select(page, 'lab_direction', 'minimal');
  check(await page.locator('[data-lab-preview]').evaluate(el => getComputedStyle(el).transitionDuration === '0s'), 'reduced motion: lab switches without animation');
  await page.evaluate(() => scrollTo({ top: 300, behavior: 'instant' }));
  await page.waitForTimeout(150);
  check(await page.locator('.hero').evaluate(el => Number(el.style.getPropertyValue('--p')) === 0), 'reduced motion: live OS preference stops scroll-driven Fold motion');
  await page.locator('[data-menu-open]').click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  check(await page.locator('main').evaluate(el => !el.inert) && await page.locator('#menu').evaluate(el => el.hidden), 'browser restoration: menu closes and page is usable');
  await context.close();

  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await noJS.newPage();
  await staticPage.goto(base);
  check(await staticPage.locator('.lab__sample-title').isVisible() && !await staticPage.locator('.lab__toolbar').isVisible() && await staticPage.locator('.lab__noscript a').isVisible(), 'no JavaScript: meaningful concept and direct enquiry fallback');
  await noJS.close();
} finally {
  await browser.close();
}
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
