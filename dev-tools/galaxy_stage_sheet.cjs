// Screenshot the Star Life canvas once per lifecycle stage.
//   node dev-tools/galaxy_stage_sheet.cjs <out-dir>
//
// The star canvas is a switch over THIRTEEN hand-drawn branches. Looking at one of them
// tells you nothing about the other twelve: this sweep is what found a red supergiant
// drawn with a ~490px radius on a 348px canvas (a flat orange wash, no disc), and nine
// stages printing their MAIN-SEQUENCE temperature, luminosity and radius under a heading
// that said something else entirely.
//
// ★ Pair each stage with a mass that can actually reach it. blue_supergiant only exists
// above 25 solar masses, so probing it at 20 correctly resolves to main sequence - which
// briefly looks like the branch is dead code.
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

// Mass is paired with the stage so each branch is exercised in a state a learner
// could actually reach.
const STAGES = [
  ['nebula', 1], ['protostar', 1], ['main_sequence', 1], ['red_giant', 1],
  ['planetary_nebula', 1], ['white_dwarf', 1], ['black_dwarf', 1], ['blue_dwarf', 0.2],
  ['blue_supergiant', 20], ['red_supergiant', 20], ['supernova', 20],
  ['neutron_star', 20], ['black_hole', 40],
];

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 2400 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => {
    let s = 424242;
    Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
  });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'stages.html');
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

  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

  for (const [stage, mass] of STAGES) {
    await pg.evaluate(({ s, m }) => window.__mount({ simMode: 'star', activeStage: s, lifecycleMass: m, showLifecycle: true }), { s: stage, m: mass });
    // Let the rAF loop advance far enough that animated stages (supernova pulses,
    // neutron-star beams) are drawn mid-cycle rather than at frame zero.
    await pg.waitForTimeout(2600);
    const box = await pg.evaluate(() => {
      const cv = document.querySelector('canvas');
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
    });
    if (!box) { console.log(stage + ': no canvas'); continue; }
    await pg.screenshot({ path: path.join(OUT, 'stage-' + stage + '.png'), clip: box, timeout: 20000 });
    console.log(stage.padEnd(18) + ' ' + Math.round(box.width) + 'x' + Math.round(box.height));
  }
  console.log('page errors: ' + (errors.length ? '\n  ' + errors.join('\n  ') : 'none'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
