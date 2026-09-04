// Does switching modes over and over leak WebGL contexts or listeners?
//   node dev-tools/galaxy_mode_churn.cjs <out-dir> [cycles]
//
// Chromium caps live WebGL contexts at roughly 16. A learner moving between Galaxy,
// Black Hole and Star Life a dozen times is ordinary use; if each visit left its
// context behind, the scene would stop building partway through a lesson and show the
// generic "3-D unavailable" card - a failure that looks like a device problem.
//
// Contexts are counted by instrumenting getContext, and releases by listening for
// webglcontextlost. A healthy run has made == lost at every cycle, no errors, and a
// galaxy scene that still builds at the end (checked via cv._layers / cv._galaxyOrbit,
// because the scene builder swallows its own exceptions).
//
// Baseline 2026-09-04: 8 cycles, made=16 lost=16, zero errors, scene rebuilt.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2];
const CYCLES = parseInt(process.argv[3] || '8', 10);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1200 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => {
    let s = 8080; Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
    // Count every WebGL context handed out, and every one deliberately released, so a
    // leak shows as a growing difference rather than as a mystery failure later.
    window.__gl = { made: 0, lost: 0, restored: 0 };
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type) {
      const ctx = orig.apply(this, arguments);
      if (ctx && /webgl/i.test(String(type))) {
        window.__gl.made += 1;
        this.addEventListener('webglcontextlost', () => { window.__gl.lost += 1; });
        this.addEventListener('webglcontextrestored', () => { window.__gl.restored += 1; });
      }
      return ctx;
    };
  });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'churn.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'));
  await pg.waitForTimeout(2400);

  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).split('\n')[0].slice(0, 120)));
  pg.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/CORS|ERR_FAILED|Failed to load resource|mirrors urls|alasky|casda/.test(t)) errors.push(t.split('\n')[0].slice(0, 120));
  });

  const ROTATION = [
    { simMode: 'galaxy', galaxyControlPanel: 'view' },
    { simMode: 'blackHole' },
    { simMode: 'star' },
  ];
  const lines = ['Mode-churn leak sweep (' + CYCLES + ' cycles x ' + ROTATION.length + ' modes)', ''];

  for (let c = 0; c < CYCLES; c += 1) {
    for (const state of ROTATION) {
      await pg.evaluate((st) => window.__mount(st), state);
      await pg.waitForTimeout(1700);
    }
    const gl = await pg.evaluate(() => window.__gl);
    const built = await pg.evaluate(() => {
      const cv = document.querySelector('canvas');
      return { canvases: document.querySelectorAll('canvas').length, w: cv ? cv.width : 0 };
    });
    lines.push('cycle ' + String(c + 1).padStart(2) + '  contexts=' + String(gl.made).padStart(3)
      + '  lost=' + String(gl.lost).padStart(3) + '  restored=' + String(gl.restored).padStart(2)
      + '  canvases=' + built.canvases + '  backing=' + built.w
      + (errors.length ? '  ERRORS: ' + errors.slice(-2).join(' | ') : ''));
  }

  // A galaxy scene that still builds at the end is the outcome that matters.
  await pg.evaluate(() => window.__mount({ simMode: 'galaxy', galaxyControlPanel: 'view' }));
  await pg.waitForTimeout(6000);
  const final = await pg.evaluate(() => {
    const cv = document.querySelector('[data-galaxy-canvas]');
    return { hasLayers: !!(cv && cv._layers), hasOrbit: !!(cv && cv._galaxyOrbit), backing: cv ? cv.width : 0 };
  });
  lines.push('');
  lines.push('after churn, galaxy scene: ' + JSON.stringify(final));
  lines.push('scene-init errors seen: ' + (errors.filter((e) => /Scene initialization|WebGL|context/i.test(e)).join(' | ') || 'none'));
  lines.push('all errors: ' + (errors.length ? errors.slice(0, 4).join(' | ') : 'none'));
  fs.writeFileSync(path.join(OUT, 'churn.txt'), lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
