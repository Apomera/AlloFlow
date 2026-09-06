// Drive the boundary simulator after its strings moved into ui_strings: switch
// all three boundary types and read back what a student sees, so a template
// that failed to substitute shows as a visible "{n}" instead of passing.
//   node dev-tools/pt_sim_text.cjs <out-dir>
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

  const read = () => pg.evaluate(() => {
    const t = document.body.innerText || '';
    const i = t.indexOf('Plate Boundary Simulator');
    const panel = i >= 0 ? t.slice(i, i + 2600) : '';
    return {
      found: i >= 0,
      placeholders: (panel.match(/\{[a-z]+\}/g) || []),
      evidenceQ: (panel.match(/What observations support [^\n?]*\?/) || [null])[0],
      rate: (panel.match(/Plate rate: [0-9]+ cm\/year/) || [null])[0],
      rows: ['Relative motion', 'Crustal outcome', 'Quake-depth clue', 'Volcanism clue']
        .filter((r) => panel.indexOf(r) >= 0).length,
      depth: (panel.match(/(No active events yet|Deepest active focus: [0-9]+ km \([a-z]+\))/) || [null])[0]
    };
  });

  for (const mode of ['Convergent', 'Divergent', 'Transform']) {
    const clicked = await pg.evaluate((m) => {
      const btn = Array.from(document.querySelectorAll('button')).find((e) => (e.textContent || '').trim().endsWith(m));
      if (!btn) return false;
      btn.click(); return true;
    }, mode);
    await pg.waitForTimeout(900);
    console.log(mode.padEnd(11), clicked ? '' : '(button not found) ', JSON.stringify(await read()));
  }
  // The canvas HUD is drawn, not text, so check it separately by pixel-free means:
  // the alt text the 3D view publishes carries the same numbers.
  const alt = await pg.evaluate(() => {
    const c = Array.from(document.querySelectorAll('canvas, img')).map((e) => e.getAttribute('aria-label') || e.getAttribute('alt') || '').filter(Boolean);
    return c.filter((x) => /block|boundary/i.test(x)).map((x) => x.slice(0, 130));
  });
  console.log('3D alt text    ', JSON.stringify(alt, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
