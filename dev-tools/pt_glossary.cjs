// The glossary tab used to render an inline list while a second, larger table
// sat unreferenced in the same file. Check the merged one actually reaches the
// screen, and that search still filters on both the term and the definition.
//   node dev-tools/pt_glossary.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'glossary'));
  await pg.waitForTimeout(1200);

  const count = () => pg.evaluate(() => {
    const box = document.querySelector('input[aria-label*="glossar" i], input[placeholder*="glossar" i]');
    const rows = Array.from(document.querySelectorAll('div')).filter((e) => {
      const t = (e.textContent || '');
      return e.children.length === 2 && t.length > 12 && t.length < 400;
    });
    return { entries: rows.length, hasBox: !!box };
  });

  const rest = await count();
  console.log('resting                ', JSON.stringify(rest));

  const search = async (term) => {
    await pg.fill('input[aria-label*="glossar" i]', term);
    await pg.waitForTimeout(350);
    const r = await pg.evaluate(() => ({
      body: (document.body.innerText.match(/\b(Anthropocene|Bolide|Asthenosphere|Cleavage)\b/g) || []),
      noMatch: !!document.querySelector('[data-pt-no-matches]')
    }));
    console.log(('search "' + term + '"').padEnd(22), JSON.stringify(r));
  };

  // Two terms that existed ONLY in the previously-unreachable table.
  await search('Bolide');
  await search('Anthropocene');
  // A term that was in the list students could already see.
  await search('Asthenosphere');
  // And a miss, so the empty state still works.
  await search('zzqx');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
