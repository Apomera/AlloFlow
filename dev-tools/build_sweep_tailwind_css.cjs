// Precompile a STATIC Tailwind stylesheet for the contrast sweeps.
//
//   node dev-tools/build_sweep_tailwind_css.cjs [out.css]
//   (default out: dev-tools/.cache/sweep-tailwind.css)
//
// WHY. dev-tools/theme_contrast_sweep.cjs used to pull cdn.tailwindcss.com and
// wait a fixed 3.2s. That CDN is a BROWSER JIT: it watches the DOM and compiles
// classes on demand, so a sweep can audit a page before the rules it is
// measuring exist. Its own header records `calculus` returning light-theme
// counts of 5, 9, 11 and 11 across four runs of identical code while dark stayed
// at 6 -- enough to invent a "DARK-SPECIFIC (+2)" finding out of nothing, and it
// did. A number that changes run to run cannot gate anything.
//
// Compiling ahead of time removes BOTH sources of variance: no network, and no
// on-demand compilation racing the measurement. The page then loads one inert
// <style> block that is identical on every run.
//
// It also tracks production more closely than the Play CDN did: this uses the
// app's OWN desktop/web-app/tailwind.config.js -- same safelist, same
// tailwindcss-animate plugin, same tailwindcss 3.4.x -- rather than the CDN's
// stock defaults.
//
// NOTE ON `dark:` -- the config sets no `darkMode` key, so Tailwind emits
// `dark:` utilities inside `@media (prefers-color-scheme: dark)`, following the
// OPERATING SYSTEM rather than the app's `theme-*` class. That is a real product
// behaviour (see tests/dark_mode_contrast_gate.test.js) and is preserved here
// deliberately: the sweep should measure what ships, not a corrected version.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
const WEBAPP = path.join(ROOT, 'desktop', 'web-app');

async function build() {
  // Resolve tailwind + postcss from the web-app install, which is where the
  // repo actually keeps them (there is no root tailwindcss).
  const req = require('module').createRequire(path.join(WEBAPP, 'package.json'));
  const tailwindcss = req('tailwindcss');
  const postcss = req('postcss');
  const baseConfig = require(path.join(WEBAPP, 'tailwind.config.js'));

  // Same config, but content globs are rewritten to the STEM tools plus the
  // host module, expressed from the repo root. The web-app config's globs are
  // relative to desktop/web-app and would resolve to nothing from here.
  const config = Object.assign({}, baseConfig, {
    content: [
      path.join(ROOT, 'stem_lab', '*.js'),
      path.join(ROOT, 'desktop', 'web-app', 'public', 'stem_lab', '*.js'),
    ],
  });

  const input = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
  const result = await postcss([tailwindcss(config)]).process(input, { from: undefined });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, result.css, 'utf8');
  return result.css.length;
}

build()
  .then((bytes) => {
    console.log('sweep tailwind css: ' + bytes.toLocaleString() + ' bytes -> ' + path.relative(ROOT, OUT));
  })
  .catch((e) => {
    console.error('FAILED to build sweep stylesheet: ' + (e && e.message));
    console.error('Without it the sweep would measure unstyled colour, which is fiction.');
    process.exit(1);
  });
