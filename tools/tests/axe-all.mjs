import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const SP = process.argv[2] || fileURLToPath(new URL('.', import.meta.url));
const pages = (process.argv[3] || ',services,work,about,contact,fit,work/company-hub,work/the-fold').split(',');
const tag = process.argv[4] || 'a';
mkdirSync(`${SP}/shots`, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const out = [];
for (const [w, h, t] of [[1440, 900, 'd'], [834, 1112, 't'], [390, 844, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const pg = await ctx.newPage();
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) out.push(`${t} console ${m.type()}: ${m.text()}`) });
  pg.on('pageerror', e => out.push(`${t} pageerror ${e}`));
  for (const p of pages) {
    await pg.goto((process.env.BASE_URL || 'http://localhost:8765') + '/' + p, { waitUntil: 'networkidle' });
    for (let y = 0; y < 8000; y += 500) { await pg.evaluate(y => window.scrollTo(0, y), y); await pg.waitForTimeout(60); }
    await pg.waitForTimeout(1500); await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(1600);
    const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w) out.push(`${p || 'home'} ${t}: overflow ${sw}`);
    if (t === 'd') {
      const r = await new AxeBuilder({ page: pg }).analyze();
      r.violations.forEach(v => out.push(`${p || 'home'} axe ${v.impact} ${v.id}: ${v.nodes.length} ${v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' | ')}`));
    }
    await pg.screenshot({ path: `${SP}/shots/${tag}-${(p || 'home').replace(/\W/g,'_')}-${t}.png`, fullPage: true });
  }
  await ctx.close();
}
await b.close();
console.log(out.join('\n') || 'clean');
if (out.length) process.exitCode = 1;
