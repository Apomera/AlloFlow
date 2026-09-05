// Drive the sim into plate contact with the keyboard, then shoot the canvas + explainer.
const fs = require('fs'); const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  for (const dark of [false, true]) {
    const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
    pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
    const page = path.join(OUT, 'pt-shots.html');
    await pg.goto('file:///' + page.split('\\').join('/'));
    await pg.evaluate((d) => window.__mount(d, 'sim'), dark);
    await pg.waitForTimeout(2000);
    // pause drift so the state is deterministic
    await pg.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Pause mantle drift/i.test(x.textContent)); if (b) b.click(); });
    const canvas = await pg.$('[data-pt-sim-surface] canvas');
    await canvas.scrollIntoViewIfNeeded();
    await pg.evaluate(() => { const c = document.querySelector('[data-pt-sim-surface] canvas'); c.focus(); });
    // pick the second plate (Nazca) and push it right into S. American until they meet
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown');
    for (let i = 0; i < 40; i++) { await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(30); }
    await pg.waitForTimeout(1800);
    const box = await pg.evaluate(() => { const el = document.querySelector('[data-pt-sim-surface]'); el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: r.x, y: Math.max(0, r.y), width: r.width, height: Math.min(r.height + 260, 880) }; });
    await pg.screenshot({ path: path.join(OUT, 'pt-contact-' + (dark ? 'dark' : 'light') + '.png'), clip: box, animations: 'disabled', timeout: 30000 });
    const live = await pg.evaluate(() => { const el = document.querySelector('[data-pt-live-line], [aria-live]'); return el ? el.textContent.slice(0, 200) : null; });
    console.log('live:', live);
    await pg.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
