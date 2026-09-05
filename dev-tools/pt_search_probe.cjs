// Type into each catalogue search and report what the list does on a hit and on a miss.
//   node dev-tools/pt_search_probe.cjs <out-dir>   (pt-shots.html must exist there)
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  const cases = [['encyclopedia', 'Search plates', 'nazca'], ['volcanoes', 'Search volcanoes', 'fuji'], ['glossary', 'Search glossary', 'moho']];
  for (const [tab, ph, hit] of cases) {
    await pg.evaluate((t) => window.__mount(false, t), tab); await pg.waitForTimeout(900);
    const sel = 'input[placeholder^="' + ph + '"]';
    for (const term of [hit, 'zzqx']) {
      await pg.fill(sel, term); await pg.waitForTimeout(400);
      const r = await pg.evaluate((q) => {
        const inp = document.querySelector(q); const card = inp.closest('.rounded-2xl');
        const msg = card.querySelector('[data-pt-no-matches]');
        return { cards: card.querySelectorAll('.rounded-lg').length, msg: msg ? msg.textContent : null };
      }, sel);
      console.log(tab, JSON.stringify(term), '->', JSON.stringify(r));
    }
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
