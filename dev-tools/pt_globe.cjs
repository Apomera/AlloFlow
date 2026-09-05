// Shoot the Earth Through Time globe at every era on the timeline tab.
//   node dev-tools/pt_globe.cjs <out-dir>   (pt-shots.html must already exist there; run pt_shots.cjs first)
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'timeline'));
  await pg.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) {
    await pg.evaluate((idx) => { const r = document.querySelector('input[type=range][aria-label="timeline era"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, String(idx)); r.dispatchEvent(new Event('input', { bubbles: true })); }, i);
    await pg.waitForTimeout(1200);
    const cv = await pg.$('#geology-earth-canvas');
    await cv.scrollIntoViewIfNeeded(); await pg.waitForTimeout(400);
    await cv.screenshot({ path: path.join(OUT, 'globe-' + i + '.png'), animations: 'disabled' });
    console.log('era', i, await pg.evaluate(() => (document.querySelector('[data-tl-era]') || {}).getAttribute('data-tl-era')));
  }
  const globeInfo = await pg.evaluate(() => { const c = document.getElementById('geology-earth-canvas'); return c && { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight, label: c.getAttribute('aria-label') }; });
  console.log(JSON.stringify(globeInfo));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
