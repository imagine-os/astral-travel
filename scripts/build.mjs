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
  .replace('href="./explorer.css"', `href="./explorer.css?v=${version}"`)
  .replace('href="./objects-css3d.css"', `href="./objects-css3d.css?v=${version}"`)
  .replace('src="./theme.mjs"', `src="./theme.mjs?v=${version}"`)
  .replace('src="./app.mjs"', `src="./app.mjs?v=${version}"`);
await writeFile('dist/index.html', html);
for (const file of ['app.mjs', 'explorer.mjs', 'lib/examples.mjs']) {
  let source = await readFile(`dist/${file}`, 'utf8');
  for (const dependency of ['lib/core.mjs', 'explorer.mjs', 'memory-model.mjs', 'objects-3d.mjs', 'objects-css3d.mjs', 'spatial-state.mjs', 'lib/examples.mjs']) {
    source = source.replaceAll(`'./${dependency}'`, `'./${dependency}?v=${version}'`);
  }
  if(file==='lib/examples.mjs')source=source.replaceAll("'./core.mjs'", `'./core.mjs?v=${version}'`);
  await writeFile(`dist/${file}`, source);
}
console.log(`Built static site v${version} in dist/`);
