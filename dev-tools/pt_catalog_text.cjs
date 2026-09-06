// Four catalogues just moved their prose into ui_strings. Render each tab and
// confirm the cards still carry their text - a wrapping mistake shows up as a
// blank card or a leaked placeholder, neither of which a syntax check sees.
//   node dev-tools/pt_catalog_text.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const TABS = ['tsunamis', 'hotspots', 'faults', 'geologists'];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));

  for (const tab of TABS) {
    await pg.evaluate(([t]) => window.__mount(false, t), [tab]);
    await pg.waitForTimeout(900);
    const r = await pg.evaluate(() => {
      const txt = document.body.innerText || '';
      return {
        chars: txt.length,
        placeholders: (txt.match(/\{[a-z]+\}/g) || []).length,
        // "undefined" reaching the screen is what a mis-wrapped field looks like
        undef: (txt.match(/\bundefined\b/g) || []).length,
        // a sample of prose that should have survived the move
        sample: (txt.match(/Megathrust quake|Continental hotspot|right-lateral|Proposed continental drift|seafloor spreading/i) || [])[0] || null,
        head: txt.slice(0, 90).replace(/\s+/g, ' ')
      };
    });
    console.log(tab.padEnd(12), JSON.stringify(r));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
