// The star canvas and the size-comparison card both state a star's luminosity. They used
// to derive it two different ways (a ZAMS table against L = M^3.5), so the same star
// carried two different numbers. This reads BOTH for a spread of masses and fails if they
// ever disagree.
//   node dev-tools/galaxy_lum_agreement.cjs
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
// GALAXY_TOOL_PATH lets a calibration run point at a deliberately broken copy, which
// is the only way to know this harness can still fail.
const tool = process.env.GALAXY_TOOL_PATH
  ? fs.readFileSync(process.env.GALAXY_TOOL_PATH, 'utf8')
  : read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');
const OUT = path.join(__dirname, 'lum_out');

const MASSES = [0.2, 0.6, 1, 1.5, 5, 20, 40];

const PATCH = `
  (function () {
    window.__canvasStats = [];
    var orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text) {
      if (typeof text === 'string' && text.indexOf(' L\\u2609') !== -1) window.__canvasStats.push(text);
      return orig.apply(this, arguments);
    };
  })();
`;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext();
  const pg = await ctx.newPage({ viewport: { width: 1180, height: 1600 } });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'l.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  await pg.addInitScript(PATCH);
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).split('\n')[0].slice(0, 160)));
  await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pg.waitForTimeout(1600);

  let mismatches = 0;
  for (const mass of MASSES) {
    await pg.evaluate((m) => {
      window.__canvasStats = [];
      window.__mount({ simMode: 'star', showLifecycle: true, lifecycleMass: m, activeStage: 'main_sequence' });
    }, mass);
    await pg.waitForTimeout(1800);
    const canvasLine = (await pg.evaluate(() => window.__canvasStats.slice(-1)[0] || ''));
    const cardLine = await pg.evaluate(() => {
      const slot = document.getElementById('slot');
      const hit = [...slot.querySelectorAll('*')].filter((el) => !el.children.length
        && !/^(SCRIPT|STYLE)$/.test(el.tagName)
        && /times the Sun/i.test(el.textContent || ''));
      return hit.length ? hit[hit.length - 1].textContent.trim() : '';
    });
    const canvasL = (/L:\s*([0-9.,×\s^10⁶]+?)\s*L/.exec(canvasLine) || [])[1];
    const cardL = (/About\s+([0-9.,×\s^10⁶]+?)\s+times/i.exec(cardLine) || [])[1];
    const agree = canvasL != null && cardL != null && canvasL.trim() === cardL.trim();
    if (!agree) mismatches++;
    console.log((agree ? '  ok  ' : 'FAIL  ') + String(mass).padStart(5) + ' M(sun)'
      + '   canvas=' + JSON.stringify(canvasL || canvasLine)
      + '   card=' + JSON.stringify(cardL || cardLine.slice(0, 60)));
  }
  console.log('\nmismatches: ' + mismatches + ' of ' + MASSES.length);
  console.log('page errors: ' + (errors.length ? errors.join(' | ') : 'none'));
  await b.close();
  process.exit(mismatches ? 1 : 0);
})().catch((e) => { console.error(String(e).slice(0, 500)); process.exit(1); });
