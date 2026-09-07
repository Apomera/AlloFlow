// EARTHQUAKE_DB held 58 notable earthquakes that nothing rendered. It now sits
// under the ten case studies in the same tab, behind the same search box.
// Check it reaches the screen, that one search filters BOTH sections, and that
// the empty state fires on a miss.
//   node dev-tools/pt_quake_catalog.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'quakeStories'));
  await pg.waitForTimeout(1200);

  const snap = () => pg.evaluate(() => {
    const t = document.body.innerText || '';
    const cat = document.querySelector('[data-pt-quake-catalog]');
    return {
      catalogue: cat ? Number(cat.getAttribute('data-pt-quake-catalog')) : 0,
      // a case study is one of the ten narrative cards
      stories: (t.match(/Legacy: /g) || []).length,
      countLine: (t.match(/\d+ of \d+ in the catalogue/) || [null])[0],
      holes: (t.match(/\{[a-z]+\}/g) || []).length,
      noMatch: /No earthquakes match that search/.test(t)
    };
  });
  console.log('resting        ', JSON.stringify(await snap()));

  const search = async (term) => {
    await pg.fill('input[aria-label*="earthquake" i]', term);
    await pg.waitForTimeout(350);
    console.log(('search "' + term + '"').padEnd(20), JSON.stringify(await snap()));
  };
  // A term that only exists in the previously-unreachable catalogue.
  await search('Valdivia');
  // A term from the case studies, to prove one box still filters those too.
  await search('Cascadia');
  await search('zzqx');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
