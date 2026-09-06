// Does the layout survive TRANSLATION? German, Finnish and Russian run 30-45% longer
// than English, and this tool just had ~250 strings made translatable. Every
// stem.galaxy string is expanded and accented in place, then the same overflow check
// the responsive sweep uses is run at four widths.
//
// Placeholders ({name}, {mass}, ...) are preserved exactly - padding inside one would
// break the .replace() that fills it.
//   node dev-tools/galaxy_pseudo_locale_sweep.cjs <out-dir> [--shots]
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2];
const SHOTS = process.argv.includes('--shots');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const MODES = ['galaxy', 'blackHole', 'star', 'metalHunt', 'quiz'];
const PANELS = ['view', 'motion', 'time', 'discover'];
const WIDTHS = [390, 600, 768, 1024];

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'pseudo.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';'
    // Expand every galaxy string by ~40% and accent it, leaving {placeholders} alone.
    + '(function () {'
    + '  var MAP = { a: "\\u00e1", e: "\\u00e9", i: "\\u00ed", o: "\\u00f3", u: "\\u00fa", A: "\\u00c1", E: "\\u00c9", O: "\\u00d3" };'
    + '  function grow(s) {'
    + '    var parts = s.split(/(\\{[a-zA-Z]+\\})/);'
    + '    var out = parts.map(function (p) {'
    + '      if (/^\\{[a-zA-Z]+\\}$/.test(p)) return p;'
    + '      return p.replace(/[aeiouAEO]/g, function (c) { return MAP[c] || c; });'
    + '    }).join("");'
    + '    var words = out.split(" ").filter(Boolean).length;'
    + '    var pad = Math.max(2, Math.round(out.length * 0.4));'
    + '    return out + " " + new Array(pad + 1).join("\\u0161");'
    + '  }'
    + '  var g = window.__uiStrings.stem.galaxy;'
    + '  Object.keys(g).forEach(function (k) { if (typeof g[k] === "string") g[k] = grow(g[k]); });'
    + '}());'
    + '<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');

  const findings = [];
  for (const width of WIDTHS) {
    const pg = await b.newPage({ viewport: { width, height: 1400 }, deviceScaleFactor: 1 });
    await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pg.waitForTimeout(2200);
    for (const mode of MODES) {
      const panels = mode === 'galaxy' ? PANELS : [null];
      for (const panel of panels) {
        const state = { simMode: mode, galaxyAutoRotate: false };
        if (panel) state.galaxyControlPanel = panel;
        if (mode === 'quiz') { state.simMode = 'galaxy'; state.quizMode = true; }
        await pg.evaluate((st) => window.__mount(st), state);
        await pg.waitForTimeout(1200);
        const r = await pg.evaluate((vw) => {
          const root = document.getElementById('slot');
          const out = [];
          const scroller = (el) => {
            for (let n = el; n && n !== document.body; n = n.parentElement) {
              const o = getComputedStyle(n).overflowX;
              if (o === 'auto' || o === 'scroll') return true;
            }
            return false;
          };
          for (const el of root.querySelectorAll('*')) {
            const b2 = el.getBoundingClientRect();
            if (b2.width === 0 || b2.height === 0) continue;
            if (b2.right <= vw + 1 && b2.left >= -1) continue;
            if (scroller(el)) continue;
            if (el.parentElement && el.parentElement !== root) {
              const pb = el.parentElement.getBoundingClientRect();
              if (pb.right > vw + 1 || pb.left < -1) continue;   // report the outermost only
            }
            out.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.getAttribute('class') || '').slice(0, 48),
              left: Math.round(b2.left), right: Math.round(b2.right),
              text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
            });
          }
          return { scrollW: document.documentElement.scrollWidth, out };
        }, width);
        const label = mode + (panel ? '-' + panel : '');
        if (r.out.length) {
          findings.push({ width, label, items: r.out });
          console.log(String(width) + 'px  ' + label.padEnd(16) + r.out.length + ' overflowing');
          for (const it of r.out.slice(0, 4)) {
            console.log('        ' + it.tag + '.' + it.cls + '  [' + it.left + '..' + it.right + ']  "' + it.text + '"');
          }
          if (SHOTS) await pg.screenshot({ path: path.join(OUT, width + '-' + label + '.png'), fullPage: false });
        }
      }
    }
    await pg.close();
  }
  console.log('\ntotal overflowing elements under pseudo-localisation: ' + findings.reduce((a, f) => a + f.items.length, 0));
  await b.close();
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
