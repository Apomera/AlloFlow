// Do the keyboard controls the Galaxy tool PROMISES actually work?
//   node dev-tools/galaxy_keyboard_contract.cjs <out-dir>
//
// The text alternative tells screen-reader users: "Focus the canvas for arrow-key
// orbiting, plus and minus zoom, bracket-key star selection, Escape to clear, and R to
// reset." Each is exercised here against state the scene actually holds, because a
// promise in the accessibility text that does not work is worse than no promise.
//
// R is checked against canvasEl._galaxyOverviewRadius - the FITTED overview, not a
// fixed number, since the home distance is derived from the morphology and the canvas.
//
// ★ Two false negatives this probe had to grow past, both worth remembering:
//   - The Object Inspector shows the star CLASS, and ~76% of stars are M-type, so two
//     genuinely different stars read identically there. "[ has no effect" was wrong.
//   - Widening the text window did not help for the same reason. The selection reticle
//     sprite (name: selectionDepthReticle) moves to the chosen star, so its world
//     position is the only honest discriminator.
// Reach the scene through cv._layers - the galaxy canvas exposes no scene handle.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const STATE = () => {
  const cv = document.querySelector('[data-galaxy-canvas]');
  if (!cv || !cv._galaxyOrbit) return null;
  const o = cv._galaxyOrbit;
  const body = document.body.innerText || '';
  const m = body.match(/Object Inspector[\s\S]{0,400}/);
  // The inspector shows the star CLASS, and 76% of stars are M-type, so two different
  // stars read identically there. The selection reticle sprite moves to the chosen
  // star, so its world position is the only honest discriminator.
  let ret = null, sc = null;
  if (cv._layers) { for (const k in cv._layers) { let n = cv._layers[k]; while (n && n.parent) n = n.parent; if (n && n.isScene) { sc = n; break; } } }
  if (sc) sc.traverse((obj) => { if (obj.name === 'selectionDepthReticle') ret = obj; });
  return {
    reticle: ret ? (ret.visible ? [ret.position.x.toFixed(3), ret.position.y.toFixed(3), ret.position.z.toFixed(3)].join(',') : 'hidden') : 'none',
    theta: +o.theta.toFixed(4), phi: +o.phi.toFixed(4), r: +o.r.toFixed(4),
    inspector: (m ? m[0] : '').replace(/\s+/g, ' ').slice(0, 320),
  };
};

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1400 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => { let s = 99; Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; }; });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'keys.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:12px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'));
  await pg.waitForTimeout(2200);
  await pg.evaluate(() => window.__mount({ simMode: 'galaxy', galaxyControlPanel: 'view', galaxyAutoRotate: false }));
  await pg.waitForTimeout(7000);

  const canFocus = await pg.evaluate(() => {
    const cv = document.querySelector('[data-galaxy-canvas]');
    if (!cv) return 'no canvas';
    cv.focus();
    return document.activeElement === cv ? 'focused' : 'NOT focusable (activeElement=' + (document.activeElement && document.activeElement.tagName) + ')';
  });
  const lines = ['Galaxy canvas keyboard contract', '', 'canvas focus: ' + canFocus, ''];

  const KEYS = [
    ['ArrowLeft', 'orbit left'], ['ArrowRight', 'orbit right'],
    ['ArrowUp', 'tilt up'], ['ArrowDown', 'tilt down'],
    ['=', 'zoom in (+)'], ['-', 'zoom out'],
    [']', 'next star'], ['[', 'previous star'],
    ['Escape', 'clear selection'], ['r', 'reset view'],
  ];

  for (const [key, what] of KEYS) {
    const before = await pg.evaluate(STATE);
    await pg.keyboard.press(key);
    await pg.waitForTimeout(700);
    const after = await pg.evaluate(STATE);
    if (!before || !after) { lines.push(key.padEnd(11) + ' ' + what.padEnd(18) + ' NO SCENE HANDLE'); continue; }
    const d = [];
    if (before.theta !== after.theta) d.push('theta ' + before.theta + '->' + after.theta);
    if (before.phi !== after.phi) d.push('phi ' + before.phi + '->' + after.phi);
    if (before.r !== after.r) d.push('r ' + before.r + '->' + after.r);
    if (before.reticle !== after.reticle) d.push('reticle ' + before.reticle + ' -> ' + after.reticle);
    if (before.inspector !== after.inspector) d.push('inspector changed: "' + after.inspector.slice(0, 96) + '..."');
    lines.push(key.padEnd(11) + ' ' + what.padEnd(18) + (d.length ? 'OK   ' + d.join(' | ') : '** NO EFFECT **'));
  }

  // R must return to the same overview the scene was built with.
  const home = await pg.evaluate(() => {
    const cv = document.querySelector('[data-galaxy-canvas]');
    return { r: +cv._galaxyOrbit.r.toFixed(4), exposed: cv._galaxyOverviewRadius === undefined ? '(not exposed)' : +cv._galaxyOverviewRadius.toFixed(4) };
  });
  lines.push('');
  lines.push('after reset: r=' + home.r + '   canvas._galaxyOverviewRadius=' + home.exposed);

  fs.writeFileSync(path.join(OUT, 'keys.txt'), lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
