// Drive the Plate Tectonics tool into states the resting screenshots never show
// and clip each one: widget divergent / transform / 3D block, the Myths panel
// mid-question, and the sim's 3D volcano view.
//   node dev-tools/pt_states.cjs <out-dir> [width]   (pt-shots.html must exist there)
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2]; const W = parseInt(process.argv[3] || '1100', 10);
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: W, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  const clickText = async (re) => pg.evaluate((src) => {
    const r = new RegExp(src, 'i');
    const el = Array.from(document.querySelectorAll('button')).find((x) => r.test(x.textContent.trim()));
    if (!el) return null; el.click(); return el.textContent.trim();
  }, re);
  const clip = async (sel, name, extra) => {
    const el = await pg.$(sel); if (!el) { console.log('missing ' + sel); return; }
    await el.scrollIntoViewIfNeeded(); await pg.waitForTimeout(extra || 900);
    await el.screenshot({ path: path.join(OUT, name), animations: 'disabled' });
    console.log('wrote ' + name);
  };
  for (const dark of [false, true]) {
    const sfx = dark ? '-dark' : '-light';
    await pg.evaluate((d) => window.__mount(d, 'sim'), dark); await pg.waitForTimeout(1500);
    // widget modes
    for (const mode of ['Divergent', 'Transform']) {
      console.log('click', await clickText('^\\S*\\s*' + mode + '$'));
      await pg.waitForTimeout(6000);
      await clip('#pt-boundary-simulator', 'widget-' + mode.toLowerCase() + sfx + '.png');
    }
    console.log('click', await clickText('^\\S*\\s*Convergent$'));
    console.log('click', await clickText('^3D block$'));
    await pg.waitForTimeout(4000);
    await clip('#pt-boundary-simulator', 'widget-3d' + sfx + '.png');
    console.log('click', await clickText('^Cross-section$'));
    // sim 3D volcano
    console.log('click', await clickText('3D volcano'));
    await pg.waitForTimeout(5000);
    await clip('[data-pt-sim-surface]', 'sim-3d' + sfx + '.png');
    console.log('click', await clickText('^2D sim$'));
    // myths (quiz tab)
    await pg.evaluate((d) => window.__mount(d, 'quiz'), dark); await pg.waitForTimeout(1200);
    console.log('click', await clickText('Start'));
    await pg.waitForTimeout(800);
    const myth = await pg.evaluate(() => { const h = Array.from(document.querySelectorAll('*')).find((x) => /Tectonics Myths/.test(x.textContent) && x.children.length < 4); let p = h; for (let i = 0; i < 6 && p; i++) { if (p.getBoundingClientRect().height > 120) break; p = p.parentElement; } if (p) p.setAttribute('data-pt-myth-panel', '1'); return !!p; });
    if (myth) await clip('[data-pt-myth-panel]', 'myths' + sfx + '.png');
    const myth2 = await clickText('^(True|False)$');
    console.log('click', myth2); await pg.waitForTimeout(600);
    if (myth) await clip('[data-pt-myth-panel]', 'myths-answered' + sfx + '.png');
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
