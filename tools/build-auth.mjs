import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
await build({ entryPoints: [fileURLToPath(new URL('./auth-client.js', import.meta.url))], bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'eof', outfile: fileURLToPath(new URL('../assets/js/account.js', import.meta.url)) });
