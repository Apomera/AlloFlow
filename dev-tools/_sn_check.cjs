// The SUPERNOVA sprite is event-triggered, so a plain galaxy render never draws it.
// Fire the trigger directly and confirm the label goes through the translation layer and
// still fits its own 208px box under a long translation.
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStringsRaw = read('ui_strings.js');
const OUT = path.join(__dirname, 'sn_out');

// Second pass runs with a deliberately long translation of the label.
const LONG = 'SUPERNOVA GIGANTESCA ESTELAR';

const PATCH = `
  (function () {
    window.__snRuns = [];
    var orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text) {
      if (typeof text === 'string' && /SUPERNOVA/i.test(text)) {
        window.__snRuns.push({ text: text, font: this.font, width: this.measureText(text).width });
      }
      return orig.apply(this, arguments);
    };
  })();
`;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  fs.mkdirSync(OUT, { recursive: true });

  for (const label of ['SUPERNOVA', LONG]) {
    const parsed = JSON.parse(uiStringsRaw.slice(uiStringsRaw.indexOf('{'), uiStringsRaw.lastIndexOf('}') + 1));
    parsed.stem.galaxy.canvas_supernova_label = label;
    const ctx = await b.newContext();
    const pg = await ctx.newPage({ viewport: { width: 1180, height: 900 } });
    const file = path.join(OUT, 'sn.html');
    fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
      + '<script src="https://cdn.tailwindcss.com"><\/script>'
      + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
      + '<body><main id="slot"></main>'
      + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
      + '<script>window.__uiStrings = ' + JSON.stringify(parsed) + ';<\/script>'
      + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
      + '<script>' + tool + '<\/script></body></html>', 'utf8');
    await pg.addInitScript(PATCH);
    const errors = [];
    pg.on('pageerror', (e) => errors.push(String(e).split('\n')[0].slice(0, 160)));
    await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pg.waitForTimeout(1600);
    await pg.evaluate(() => window.__mount({ simMode: 'galaxy' }));
    await pg.waitForTimeout(2600);
    const fired = await pg.evaluate(() => {
      const cv = document.querySelector('[data-galaxy-canvas]') || document.querySelector('canvas');
      if (!cv || !cv._triggerSupernova) return 'no trigger on canvas';
      cv._triggerSupernova();
      return 'fired';
    });
    await pg.waitForTimeout(800);
    const runs = await pg.evaluate(() => window.__snRuns);
    console.log('label ' + JSON.stringify(label) + ': ' + fired
      + '  runs=' + JSON.stringify(runs)
      + '  fitsBox=' + (runs.length ? runs.every((r) => r.width <= 224) : 'n/a')
      + '  errors=' + (errors.length ? errors.join(' | ') : 'none'));
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(String(e).slice(0, 500)); process.exit(1); });
