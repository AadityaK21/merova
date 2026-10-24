import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const pg = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
let failures = 0;
const showWork = /^SHOW_WORK = True/m.test(readFileSync(new URL('../build.py', import.meta.url), 'utf8'));
for (const p of ['/', '/services', '/work', '/about', '/contact', '/fit', '/work/company-hub', '/work/the-fold'].filter(p => showWork || !p.startsWith('/work'))) {
  await pg.goto((process.env.BASE_URL || 'http://localhost:8765') + p, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.querySelectorAll('.rv, .rv-box, .rv-words').forEach(e => e.classList.add('is-in')));
  await pg.waitForTimeout(1600);
  const r = await new AxeBuilder({ page: pg }).analyze();
  failures += r.violations.length;
  console.log(p, r.violations.map(v => `${v.id} ${v.nodes.length} ${v.nodes.slice(0,3).map(n => n.target.join(' ') + ' ' + (n.any[0]?.data?.contrastRatio || '')).join(' | ')}`).join('\n') || 'clean');
}
await b.close();
if (failures) process.exitCode = 1;
