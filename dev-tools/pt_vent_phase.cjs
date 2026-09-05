// Shoot the sim's 3D volcano in both themes at the SAME eruption phase, so a
// theme comparison is not confounded by where the eruption happened to be.
//   node dev-tools/pt_vent_phase.cjs <out-dir>   (pt-shots.html must exist there)
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  for (const dark of [false, true]) {
    await pg.evaluate((d) => window.__mount(d, 'sim'), dark); await pg.waitForTimeout(1200);
    await pg.evaluate(() => { const el = Array.from(document.querySelectorAll('button')).find((x) => /3D volcano/.test(x.textContent)); el && el.click(); });
    await pg.waitForTimeout(2500);
    const sel = '[data-pt-sim-surface]';
    const el = await pg.$(sel); await el.scrollIntoViewIfNeeded();
    for (const want of ['blast', 'repose']) {
      let ph = null;
      for (let i = 0; i < 120; i++) {
        ph = await pg.evaluate(() => window.__alloVentGL && window.__alloVentGL.phase());
        if (ph === want) break;
        await pg.waitForTimeout(250);
      }
      await pg.waitForTimeout(300);
      const name = 'vent-' + want + (dark ? '-dark' : '-light') + '.png';
      const box = await pg.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return { x: r.x, y: Math.max(0, r.y), width: r.width, height: Math.min(r.height, 880) }; }, sel);
      await pg.screenshot({ path: path.join(OUT, name), clip: box, animations: 'disabled', timeout: 30000 });
      console.log('wrote', name, 'phase=' + ph);
    }
    const header = await pg.evaluate(() => document.querySelector('[data-pt-canvas-toolbar]').textContent.trim());
    console.log('toolbar:', header);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
