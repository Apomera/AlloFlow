// Does every canvas actually hold still under prefers-reduced-motion?
//
// The reduced-motion CSS at the top of the tool does NOTHING for a canvas, and
// this tool is mostly canvas. The only way to tell a loop that honours the
// setting from one that says it does is to grab each canvas twice, a second
// apart, and compare the pixels.
//
//   node dev-tools/pt_motion_check.cjs <out-dir> [tab,tab,...]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const TABS = (process.argv[3] || 'sim,earthquake,timeline,boundaryHunt,quiz,cascadia').split(',');

async function sweep(reduce) {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  const rows = [];
  for (const tab of TABS) {
    await pg.evaluate((t) => window.__mount(false, t), tab);
    await pg.waitForTimeout(1800);
    // Measure each canvas WHILE IT IS IN VIEW, one at a time. Scrolling them
    // all and then jumping back to the top leaves most of them off-screen,
    // where the tool throttles them on purpose — and a throttled canvas that
    // holds still would be counted as proof the reduced-motion setting works.
    const n = await pg.evaluate(() => document.querySelectorAll('canvas').length);
    let moved = 0;
    for (let k = 0; k < n; k++) {
      await pg.evaluate((i) => {
        const c = document.querySelectorAll('canvas')[i];
        if (c) { try { c.scrollIntoView({ block: 'center' }); } catch (e) {} }
      }, k);
      await pg.waitForTimeout(500);
      const grab = () => pg.evaluate((i) => {
        const c = document.querySelectorAll('canvas')[i];
        if (!c || !c.width || !c.height) return 'empty';
        try { return c.toDataURL().slice(-260); } catch (e) { return 'tainted'; }
      }, k);
      const one = await grab();
      await pg.waitForTimeout(1100);
      const two = await grab();
      if (one !== two) moved++;
    }
    rows.push({ tab, canvases: n, moved });
  }
  await b.close();
  return rows;
}

(async () => {
  const off = await sweep(false);
  const on = await sweep(true);
  console.log('tab'.padEnd(16) + 'canvases  moving(normal)  moving(reduce)');
  let bad = 0;
  off.forEach((r, i) => {
    const red = on[i].moved;
    if (red > 0) bad++;
    console.log(r.tab.padEnd(16) + String(r.canvases).padEnd(10) + String(r.moved).padEnd(16) + String(red) + (red ? '   *** still animating under reduce' : ''));
  });
  console.log('\n' + bad + ' tab(s) animate under prefers-reduced-motion');
})().catch((e) => { console.error(e); process.exit(1); });
