// Clipped, 1:1 screenshot of ONE element of the Galaxy tool, in a chosen state.
//   node dev-tools/galaxy_panel_shot.cjs <out-dir> '<state-json>' '<css-selector>' [name] [viewport-width]
//
// ★ Use this, not `galaxy_a11y_audit --shots`, for anything about layout. That tool's
// `fullPage: true` capture MISRENDERS this page: it made a correct grid-cols-7 picker
// look like seven stacked rows and 24x24 chips look like 8px slivers, both of which
// measured correct in the DOM and shot correctly when clipped to the element.
//
// ★ Two traps, both from the scene's continuous rAF loop:
//   - Playwright's own actionability waits (scrollIntoViewIfNeeded, locator.screenshot)
//     NEVER settle while it runs. Scroll by hand with evaluate() instead.
//   - Measure the clip box AFTER scrolling and AFTER neutralising rAF. Measuring first
//     lands the clip on whatever has since moved into those coordinates.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2];
const STATE = JSON.parse(process.argv[3] || '{"simMode":"galaxy"}');
const SELECTOR = process.argv[4] || '[data-galaxy-root]';
const NAME = process.argv[5] || 'panel';
const VW = parseInt(process.argv[6] || '1180', 10);
// A good deal of this tool sits inside <details> disclosures. A closed one still
// reports layout boxes for its children, so a selector inside it resolves to a
// plausible-looking rect that paints nothing - which reads as a broken harness
// rather than as collapsed content. Pass --open to expand them all first.
const OPEN_DETAILS = process.argv.includes('--open');
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
  const pg = await b.newPage({ viewport: { width: VW, height: 2400 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => {
    let s = 123456789;
    Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
  });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'panel.html');
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
  await pg.evaluate((st) => window.__mount(st), STATE);
  await pg.waitForTimeout(5000);
  if (OPEN_DETAILS) {
    const opened = await pg.evaluate(() => {
      const all = Array.from(document.querySelectorAll('details'));
      all.forEach((d) => { d.open = true; });
      return all.length;
    });
    console.log('opened ' + opened + ' disclosure(s)');
    await pg.waitForTimeout(900);
  }
  const found = await pg.evaluate((sel) => !!document.querySelector(sel), SELECTOR);
  if (!found) { console.log('selector not found: ' + SELECTOR); await b.close(); return; }
  // Scroll by hand: Playwright's own scrollIntoViewIfNeeded waits for the element to be
  // stable, and the scene's rAF loop means that never happens. Neutralise rAF only
  // AFTER the scroll, then measure - a box measured before either step lands the clip
  // on whatever has since moved into those coordinates.
  await pg.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: 'center' }); }, SELECTOR);
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { window.requestAnimationFrame = function () { return 0; }; });
  await pg.waitForTimeout(300);
  const shot = await pg.evaluate(({ sel, vw }) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - 4), y: Math.max(0, r.top - 4), width: Math.min(vw, r.width + 8), height: Math.min(2300, r.height + 8) };
  }, { sel: SELECTOR, vw: VW });
  await pg.screenshot({ path: path.join(OUT, NAME + '.png'), clip: shot, timeout: 25000 });
  console.log(NAME + ' ' + JSON.stringify(shot));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
