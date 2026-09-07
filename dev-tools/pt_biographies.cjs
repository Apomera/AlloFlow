// GEOLOGISTS held 30 scientists and was referenced only by its own definition
// while the Biographies tab rendered a different inline list of 30, sharing 11.
// Nineteen were unreachable, including Vine, Matthews, Morley and Tuzo Wilson -
// the people behind the seafloor-spreading confirmation this whole tool is about.
//   node dev-tools/pt_biographies.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'biographies'));
  await pg.waitForTimeout(1300);

  const r = await pg.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      intro: (t.match(/\d+ scientists who shaped/) || [null])[0],
      // previously unreachable, and central to plate tectonics
      wilson: t.includes('John Tuzo Wilson'),
      vine: t.includes('Frederick Vine'),
      morley: t.includes('Lawrence Morley'),
      // was already on screen - the merge must not have dropped the live side
      steno: t.includes('Nicolas Steno'),
      // country was folded into the description rather than lost
      country: /\((?:Canada|Germany|United Kingdom|Britain)\)/.test(t),
      holes: (t.match(/\{[a-z]+\}/g) || []).length
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
