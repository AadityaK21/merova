import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(process.env.SITE_ROOT || fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.PORT || 8765);
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const require = createRequire(import.meta.url);
const payments = require(path.join(root, 'api/payments.js'));
const security = Object.fromEntries(config.headers.find(rule => rule.source === '/(.*)').headers.map(header => [header.key, header.value]));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.zip': 'application/zip' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\\/g, '/');
    const routeHeaders = Object.fromEntries(config.headers.filter(rule => rule.source !== '/(.*)' && new RegExp('^' + rule.source + '$').test(pathname)).flatMap(rule => rule.headers.map(header => [header.key, header.value])));
    if (pathname === '/api/payments') {
      for (const [key, value] of Object.entries({ ...security, ...routeHeaders })) res.setHeader(key, value);
      await payments(req, res); return;
    }
    // Mirror the simple redirects in vercel.json ("/a" and "/a/:path*" forms).
    const redirect = (config.redirects || []).find(r => r.source.endsWith('/:path*')
      ? pathname.startsWith(r.source.slice(0, -7) + '/') : pathname === r.source);
    if (redirect) { res.writeHead(redirect.permanent ? 308 : 307, { ...security, Location: redirect.destination }).end(); return; }
    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    let file = path.resolve(root, relative);
    const segments = relative.split('/');
    const privatePath = segments.some((segment, index) => segment.startsWith('.') && !(index === 0 && segment === '.well-known'));
    if (!file.startsWith(root + path.sep) || privatePath || /^(?:api|tools|briefs)(?:\/|$)|^(?:AGENTS\.md|README\.md)$/i.test(relative)) {
      res.writeHead(404, { ...security, 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    if (!path.extname(file)) file += '.html';
    let code = 200;
    try { if (!(await stat(file)).isFile()) throw new Error('Not a file'); }
    catch { file = path.join(root, '404.html'); code = 404; }
    res.writeHead(code, { ...security, ...routeHeaders, 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(400).end('Bad request');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
