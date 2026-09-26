import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
// Content-based cache keys also invalidate follow-up fixes within a release.
const digest = createHash('sha256');
for (const root of ['web','lib']) {
  const names = (await readdir(root, { recursive: true })).filter(name => /\.(?:mjs|css|html)$/.test(name)).sort();
  for (const name of names) { digest.update(`${root}/${name}\0`); digest.update(await readFile(`${root}/${name}`)); }
}
const revision = `${version}-${digest.digest('hex').slice(0,10)}`;
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('web', 'dist', { recursive: true });
await cp('lib', 'dist/lib', { recursive: true });
// Keep each release's HTML, styles, theme, app, and engine in sync through CDN/browser caches.
const html = (await readFile('dist/index.html', 'utf8'))
  .replace('href="./style.css"', `href="./style.css?v=${revision}"`)
  .replace('href="./themes.css"', `href="./themes.css?v=${revision}"`)
  .replace('href="./story.css"', `href="./story.css?v=${revision}"`)
  .replace('href="./explorer.css"', `href="./explorer.css?v=${revision}"`)
  .replace('href="./objects-css3d.css"', `href="./objects-css3d.css?v=${revision}"`)
  .replace('href="./graph-styles.css"', `href="./graph-styles.css?v=${revision}"`)
  .replace('src="./theme.mjs"', `src="./theme.mjs?v=${revision}"`)
  .replace('src="./app.mjs"', `src="./app.mjs?v=${revision}"`);
await writeFile('dist/index.html', html);
for (const file of ['app.mjs', 'explorer.mjs', 'graph-styles.mjs', 'lib/examples.mjs', 'lib/example-packs.mjs']) {
  let source = await readFile(`dist/${file}`, 'utf8');
  for (const dependency of ['lib/core.mjs', 'explorer.mjs', 'memory-model.mjs', 'objects-3d.mjs', 'objects-css3d.mjs', 'spatial-state.mjs', 'graph-styles.mjs', 'graph-layouts.mjs', 'lib/examples.mjs', 'lib/example-packs.mjs']) {
    source = source.replaceAll(`'./${dependency}'`, `'./${dependency}?v=${revision}'`);
  }
  if(file.startsWith('lib/'))for(const name of ['core.mjs','examples.mjs'])source=source.replaceAll(`'./${name}'`, `'./${name}?v=${revision}'`);
  await writeFile(`dist/${file}`, source);
}
console.log(`Built static site v${version} in dist/`);
