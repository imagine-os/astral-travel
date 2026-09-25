import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('web', 'dist', { recursive: true });
await cp('lib', 'dist/lib', { recursive: true });
// Keep each release's HTML, styles, theme, app, and engine in sync through CDN/browser caches.
const html = (await readFile('dist/index.html', 'utf8'))
  .replace('href="./style.css"', `href="./style.css?v=${version}"`)
  .replace('href="./themes.css"', `href="./themes.css?v=${version}"`)
  .replace('href="./story.css"', `href="./story.css?v=${version}"`)
  .replace('src="./theme.mjs"', `src="./theme.mjs?v=${version}"`)
  .replace('src="./app.mjs"', `src="./app.mjs?v=${version}"`);
await writeFile('dist/index.html', html);
const app = (await readFile('dist/app.mjs', 'utf8')).replace("from './lib/core.mjs'", `from './lib/core.mjs?v=${version}'`);
await writeFile('dist/app.mjs', app);
console.log(`Built static site v${version} in dist/`);
