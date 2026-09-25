# Three.js 0.186.0

Vendored from the published `three@0.186.0` npm package. Three.js and OrbitControls
are MIT licensed; the full original license is in `LICENSE` beside these files.

- `three.core.mjs`: `build/three.core.js`
- `three.module.mjs`: `build/three.module.js`, with the core import renamed to the
  local `./three.core.mjs`
- `OrbitControls.mjs`: `examples/jsm/controls/OrbitControls.js`, with the `three`
  bare import changed to `./three.module.mjs`

The three modules were minified independently with esbuild 0.27.4 (`--minify
--format=esm --legal-comments=inline`). No source was bundled into Astral's core.
All browser imports are relative, so the static app works on GitHub Pages without
an import map, CDN, API key, package install, or a request to a third-party host.
