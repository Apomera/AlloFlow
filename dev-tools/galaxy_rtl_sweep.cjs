// The tool ships in Arabic, Farsi, Hebrew and Urdu, and contains no RTL handling at
// all. Before proposing any change, MEASURE what actually happens: render with
// dir="rtl" on the tool container, count overflow, and shoot the panels.
//   node dev-tools/galaxy_rtl_sweep.cjs <out-dir>
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

const CASES = [
  { name: 'galaxy-view', state: { simMode: 'galaxy', galaxyControlPanel: 'view', galaxyAutoRotate: false } },
  { name: 'star', state: { simMode: 'star', lifecycleMass: 1, lifecycleStage: 'main_sequence' } },
  { name: 'quiz', state: { simMode: 'galaxy', quizMode: true, quizIdx: 0 } },
];

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'rtl.html');
  fs.writeFileSync(file, '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');

  for (const width of [390, 768]) {
    const pg = await b.newPage({ viewport: { width, height: 1500 }, deviceScaleFactor: 1 });
    await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pg.waitForTimeout(2200);
    for (const c of CASES) {
      await pg.evaluate((st) => window.__mount(st), c.state);
      await pg.waitForTimeout(1400);
      const r = await pg.evaluate((vw) => {
        const root = document.getElementById('slot');
        const over = [];
        for (const el of root.querySelectorAll('*')) {
          const b2 = el.getBoundingClientRect();
          if (!b2.width || !b2.height) continue;
          if (b2.right <= vw + 1 && b2.left >= -1) continue;
          let scroller = false;
          for (let n = el; n && n !== document.body; n = n.parentElement) {
            const o = getComputedStyle(n).overflowX;
            if (o === 'auto' || o === 'scroll') { scroller = true; break; }
          }
          if (scroller) continue;
          if (el.parentElement && el.parentElement !== root) {
            const pb = el.parentElement.getBoundingClientRect();
            if (pb.right > vw + 1 || pb.left < -1) continue;
          }
          over.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 44), left: Math.round(b2.left), right: Math.round(b2.right), svgLabel: (el.closest('svg') && el.closest('svg').getAttribute('aria-label') || '').slice(0, 44), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 36) });
        }
        // Are physical-direction utilities in use? Those are what break under RTL.
        const physical = new Set();
        for (const el of root.querySelectorAll('[class]')) {
          for (const cls of el.getAttribute('class').split(/\s+/)) {
            if (/^-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|text-left|text-right|inset-l|inset-r)(-|$)/.test(cls)) physical.add(cls);
          }
        }
        const svgDirs = [...root.querySelectorAll('svg')].map(function (x) { return (x.getAttribute('dir') || 'none') + ':' + getComputedStyle(x).direction; });
        return { scrollW: document.documentElement.scrollWidth, over, physical: [...physical].sort(), svgDirs: svgDirs };
      }, width);
      console.log(width + 'px  ' + c.name.padEnd(12) + 'overflow=' + r.over.length + '  scrollW=' + r.scrollW
        + '  physical-direction classes=' + r.physical.length);
      if (r.over.length) for (const o of r.over.slice(0, 3)) console.log('      ' + o.tag + ' [' + o.left + '..' + o.right + '] svg="' + o.svgLabel + '" text="' + o.text + '"');
      if (width === 768 && c.name === 'galaxy-view') console.log('      e.g. ' + r.physical.slice(0, 14).join(' '));
      if (width === 768 && c.name === 'galaxy-view') console.log('      svg dir attr:computed = ' + r.svgDirs.join(', '));
      await pg.screenshot({ path: path.join(OUT, width + '-' + c.name + '.png'), fullPage: false });
    }
    await pg.close();
  }
  await b.close();
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
