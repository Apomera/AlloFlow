// Leave mantle drift running and shoot the sim at intervals.
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  const page = path.join(OUT, 'pt-shots.html');
  await pg.goto('file:///' + page.split('\\').join('/'));
  await pg.evaluate(() => window.__mount(false, 'sim'));
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const el = document.querySelector('[data-pt-sim-surface]'); el.scrollIntoView({ block: 'start' }); });
  const driftBtn = await pg.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /mantle drift/i.test(x.textContent)); return b ? b.textContent : null; });
  console.log('drift button:', driftBtn);
  const shot = async (name) => {
    const box = await pg.evaluate(() => { const el = document.querySelector('[data-pt-sim-surface]'); el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: r.x, y: Math.max(0, r.y), width: r.width, height: Math.min(r.height + 120, 880) }; });
    await pg.screenshot({ path: path.join(OUT, name), clip: box, animations: 'disabled', timeout: 30000 });
    const live = await pg.evaluate(() => { const el = document.querySelector('[aria-live]'); return el ? el.textContent.slice(0, 160) : null; });
    const readout = await pg.evaluate(() => { const el = Array.from(document.querySelectorAll('*')).find((x) => /^\d+ quakes?$/.test(x.textContent.trim())); return el ? el.textContent.trim() : null; });
    console.log(name, '| live:', live, '| events:', readout);
  };
  for (const t of [8, 20, 40]) { await pg.waitForTimeout((t === 8 ? 8 : t === 20 ? 12 : 20) * 1000); await shot('pt-drift-' + t + 's.png'); }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
