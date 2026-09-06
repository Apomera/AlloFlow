// Drive a real quake by keyboard and read the mission card back: the tile used
// to speak only about the record, while the magnitude of the quake you just made
// vanished with the on-canvas readout after ~200 frames.
//   node dev-tools/pt_quake_metric.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'sim'));
  await pg.waitForTimeout(1500);

  const tile = () => pg.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div'));
    const label = all.find((e) => (e.textContent || '').trim() === 'Strongest quake');
    const card = label ? label.parentElement : null;
    const st = (((window.__toolState || {}).plateTectonics) || {});
    return {
      tile: card ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : null,
      last: st.lastQuakeMag != null ? +st.lastQuakeMag.toFixed(2) : null,
      max: st.maxQuakeMag != null ? +st.maxQuakeMag.toFixed(2) : null,
      quakes: st.quakeCount || 0
    };
  });
  console.log('before:', JSON.stringify(await tile()));

  // Focus the section canvas and drive one plate into its neighbour.
  await pg.evaluate(() => { const c = document.querySelector('canvas[data-tect-section], .pt-primary-canvas, canvas'); c && c.focus(); });
  for (let i = 0; i < 2; i++) await pg.keyboard.press('ArrowDown');
  for (let i = 0; i < 45; i++) { await pg.keyboard.press('ArrowRight'); }
  await pg.waitForTimeout(5000);
  console.log('after drive:', JSON.stringify(await tile()));
  // Let the on-canvas readout fade, then confirm the tile still reports it.
  await pg.waitForTimeout(6000);
  console.log('after fade :', JSON.stringify(await tile()));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
