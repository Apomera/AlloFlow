// The epicentre panel now renders through ui_strings rather than inline
// literals. Read back what a student actually sees, so a template that failed
// to substitute shows up as a visible "{vp}" rather than passing silently.
//   node dev-tools/pt_epi_text.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'sim'));
  await pg.waitForTimeout(2500);
  const r = await pg.evaluate(() => {
    const cv = document.querySelector('[data-pt-epicenter-canvas]');
    const panel = cv ? cv.closest('div[role], section, div') : null;
    // Walk up to the panel that carries the whole widget.
    let root = cv;
    for (let i = 0; i < 8 && root && root.parentElement; i++) root = root.parentElement;
    const txt = root ? (root.innerText || '') : '';
    return {
      unsubstituted: (txt.match(/\{[a-z]+\}/g) || []),
      aria: cv ? (cv.getAttribute('aria-label') || '').slice(0, 60) : null,
      ariaPlaceholders: cv ? ((cv.getAttribute('aria-label') || '').match(/\{[a-z]+\}/g) || []) : [],
      hasMath: /P-waves race through continental crust at ~/.test(txt),
      mathNumbers: (txt.match(/at ~[0-9.]+ km\/s; slower S-waves trail at ~[0-9.]+ km\/s/) || [null])[0],
      hasCircles: /Show distance circles/.test(txt),
      hasFit: /Show triangulated fit/.test(txt),
      hasTip: /Tip: stations are also draggable/.test(txt),
      hasPngBtn: /Save PNG/.test(txt),
      panelChars: txt.length,
      unused: !!panel
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
