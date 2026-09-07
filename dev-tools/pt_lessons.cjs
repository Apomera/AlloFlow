// The Activities tab rendered its own inline list of 30 while a second table
// of 30 sat unreferenced, sharing only 2 titles. Check the merged list reaches
// the screen, that the previously-unreachable ones search and filter, and that
// the materials folded into their descriptions survived.
//   node dev-tools/pt_lessons.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'lessons'));
  await pg.waitForTimeout(1500);

  const snap = () => pg.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      titles: (t.match(/Gr [K0-9]+/g) || []).length,
      wasUnreachable: ['Cookie Tectonics', 'Crack-Up Earth', 'Earthquake Bingo'].filter((x) => t.includes(x)),
      wasLive: t.includes('Graham Cracker'),
      materials: (t.match(/Materials:/g) || []).length,
      holes: (t.match(/\{[a-z]+\}/g) || []).length,
      noMatch: !!document.querySelector('[data-pt-no-matches]')
    };
  });
  console.log('resting        ', JSON.stringify(await snap()));

  // A previously-unreachable activity must be findable by search...
  await pg.fill('input[aria-label*="activit" i]', 'eggshell');
  await pg.waitForTimeout(400);
  console.log('search eggshell', JSON.stringify(await snap()));

  // ...and by the grade band filter, which parses "K-2" through gradeSpan.
  await pg.fill('input[aria-label*="activit" i]', '');
  await pg.waitForTimeout(300);
  const bandK2 = await pg.evaluate(() => {
    const b2 = document.querySelector('[data-pt-lesson-band="k2"]');
    if (b2) { b2.click(); return true; }
    return false;
  });
  await pg.waitForTimeout(400);
  console.log('band K-2 (' + bandK2 + ')', JSON.stringify(await snap()));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
