// The cinematic tour, stage by stage, for every galaxy type. Nobody has looked at
// what each stage's caption actually points at, or where the camera ends up after
// the tour compared with the home view. Jumps a shimmed clock through the stages.
//   node dev-tools/galaxy_tour_sheet.cjs OUT [TYPES=a,b env]
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');
const TYPES = (process.env.TYPES || 'barredSpiral,grandDesign,elliptical,irregular').split(',');
const STAGE_MS = 5200;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1400 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => {
    let s = 2024; Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
    // An OFFSET clock drifts: SwiftShader screenshots burn 2-4 real seconds each,
    // and those seconds landed on top of the offset, so "stage k" showed stage 2k.
    // A FROZEN clock pins the tour to the exact moment requested.
    const real = Date.now; window.__real = real; window.__frozen = null;
    Date.now = () => (window.__frozen == null ? real() : window.__frozen);
  });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'tour.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pg.waitForTimeout(2400);
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).split('\n')[0].slice(0, 140)));

  const shotCanvas = async (name) => {
    const box = await pg.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height }; });
    await pg.evaluate(() => {
      window.__raf = window.__raf || window.requestAnimationFrame;
      window.__held = [];
      window.requestAnimationFrame = function (cb) { window.__held.push(cb); return 1; };
    });
    await pg.waitForTimeout(250);
    await pg.screenshot({ path: path.join(OUT, name + '.png'), clip: box, timeout: 20000 });
    await pg.evaluate(() => {
      window.requestAnimationFrame = window.__raf;
      const held = window.__held; window.__held = [];
      held.forEach((cb) => window.requestAnimationFrame(cb));
    });
  };
  const readState = () => pg.evaluate(() => {
    const cv = document.querySelector('canvas');
    const st = document.querySelector('[data-galaxy-status]');
    const o = cv && cv._galaxyOrbit;
    return { status: st ? st.textContent : '(none)', r: o ? +o.r.toFixed(3) : null, theta: o ? +o.theta.toFixed(3) : null, phi: o ? +o.phi.toFixed(3) : null, home: cv ? +cv._galaxyOverviewRadius.toFixed(3) : null, tourAttr: cv && cv.getAttribute('data-tour-active') };
  });

  for (const type of TYPES) {
    await pg.evaluate((t) => { window.__frozen = null; window.__mount({ simMode: 'galaxy', galaxyControlPanel: 'view', galaxyType: t, galaxyAutoRotate: false }); }, type);
    await pg.waitForTimeout(7000);
    const before = await readState();
    console.log('\n== ' + type + '  home r=' + before.home + '  start r=' + before.r);
    await shotCanvas(type + '-home');
    const started = await pg.evaluate(() => { const cv = document.querySelector('canvas'); if (!cv || !cv._galaxySetTour) return false; window.__t0 = window.__real(); window.__frozen = window.__t0; cv._galaxySetTour(true); return true; });
    if (!started) { console.log('NO TOUR HANDLER'); continue; }
    for (let k = 0; k < 7; k++) {
      await pg.evaluate((ms) => { window.__frozen = window.__t0 + ms; }, Math.round((k + (k === 6 ? 0.05 : 0.5)) * STAGE_MS));
      await pg.waitForTimeout(700);
      const s = await readState();
      console.log('stage ' + k + '  r=' + s.r + ' theta=' + s.theta + ' phi=' + s.phi + '  tour=' + s.tourAttr + '  "' + s.status + '"');
      await shotCanvas(type + '-stage' + k);
    }
    await pg.evaluate((ms) => { window.__frozen = window.__t0 + ms; }, 7 * STAGE_MS + 400);
    await pg.waitForTimeout(700);
    const end = await readState();
    console.log('after tour: r=' + end.r + ' (home ' + end.home + ')  theta=' + end.theta + ' phi=' + end.phi + '  tour=' + end.tourAttr + '  "' + end.status + '"');
    await shotCanvas(type + '-after');
  }
  console.log('\npage errors: ' + (errors.length ? errors.join(' | ') : 'none'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
