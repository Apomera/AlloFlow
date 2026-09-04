// Does anything in the Galaxy tool overflow a narrow screen?
//   node dev-tools/galaxy_responsive_sweep.cjs <out-dir> [--shots]
//
// Reports horizontal overflow of the document and names every element wider than the
// viewport, per mode, at 390 / 600 / 768 / 1024 px. Overflow is measured, not eyeballed:
// a page that scrolls sideways on a Chromebook is invisible at 1180px. Elements inside a
// deliberate overflow-x scroller are excluded, and only the outermost offender of each
// subtree is reported.
//
// The tool root carries `overflowX: 'clip'`, which HIDES overflow rather than preventing
// it - so a clipped-off control would still produce no document scrollWidth. This probe
// uses getBoundingClientRect, which reports the true position either way.
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

const WIDTHS = [390, 600, 768, 1024];
const STATES = [
  ['galaxy-view', { simMode: 'galaxy', galaxyControlPanel: 'view' }],
  ['galaxy-motion', { simMode: 'galaxy', galaxyControlPanel: 'motion' }],
  ['galaxy-time', { simMode: 'galaxy', galaxyControlPanel: 'time' }],
  ['galaxy-discover', { simMode: 'galaxy', galaxyControlPanel: 'discover' }],
  ['blackHole', { simMode: 'blackHole' }],
  ['star', { simMode: 'star' }],
  ['metalHunt', { simMode: 'metalHunt' }],
  ['quiz', { simMode: 'galaxy', quizMode: true }],
];

const PROBE = () => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const wide = [];
  document.querySelectorAll('#slot *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    // Only report the element itself overflowing, not its scroll container's content.
    if (r.right > vw + 1 || r.left < -1) {
      const cs = getComputedStyle(el);
      // A deliberate horizontal scroller is not an overflow bug.
      let scroller = false;
      let n = el;
      while (n && n.id !== 'slot') {
        const p = getComputedStyle(n);
        if (p.overflowX === 'auto' || p.overflowX === 'scroll') { scroller = true; break; }
        n = n.parentElement;
      }
      if (scroller) return;
      wide.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 58),
        text: (el.textContent || '').trim().slice(0, 34),
        w: Math.round(r.width), right: Math.round(r.right),
      });
    }
  });
  // Keep the outermost offender of each subtree; children inherit the overflow.
  const kept = [];
  for (const w of wide) if (!kept.some((k) => w.cls && k.cls === w.cls)) kept.push(w);
  return { vw, scrollW: doc.scrollWidth, overflow: doc.scrollWidth - vw, wide: kept.slice(0, 6) };
};

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'responsive.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:8px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');

  const lines = ['Horizontal overflow sweep (element wider than the viewport, outside any x-scroller)', ''];
  let offenders = 0;
  for (const width of WIDTHS) {
    const pg = await b.newPage({ viewport: { width, height: 2000 }, deviceScaleFactor: 1 });
    await pg.addInitScript(() => { let s = 5150; Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; }; });
    await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'));
    await pg.waitForTimeout(2400);
    for (const [name, state] of STATES) {
      await pg.evaluate((st) => window.__mount(st), state);
      await pg.waitForTimeout(2600);
      const r = await pg.evaluate(PROBE);
      const flag = r.overflow > 1 ? '  ** OVERFLOW ' + r.overflow + 'px' : '';
      lines.push(String(width).padStart(5) + 'px  ' + name.padEnd(16) + ' scrollW=' + r.scrollW + flag);
      for (const w of r.wide) {
        offenders++;
        lines.push('            ' + w.tag + ' w=' + w.w + ' right=' + w.right + '  "' + w.text + '"  .' + w.cls);
      }
      if (SHOTS && r.overflow > 1) {
        await pg.screenshot({ path: path.join(OUT, 'ovf-' + width + '-' + name + '.png'), fullPage: false });
      }
    }
    await pg.close();
  }
  lines.push('');
  lines.push('offending elements: ' + offenders);
  fs.writeFileSync(path.join(OUT, 'responsive.txt'), lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
