// Drive the Quick-Review cards: confirm answers start hidden, one reveal shows
// exactly one answer with no doubled label, and "Show all answers" reveals all 60.
//   node dev-tools/pt_review_probe.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'review'));
  await pg.waitForTimeout(1200);
  const state = () => pg.evaluate(() => ({
    cards: document.querySelectorAll('[data-pt-review-answer]').length,
    hidden: document.querySelectorAll('[data-pt-review-reveal]').length,
    doubled: Array.from(document.querySelectorAll('[data-pt-review-answer], .text-\\[11px\\].text-slate-700'))
      .map((e) => (e.textContent || '').trim())
      .filter((t) => /^(Concept|Question|Answer):\s*(Concept|Question|Answer):/.test(t)).length,
    shown: Array.from(document.querySelectorAll('[data-pt-review-answer]'))
      .filter((e) => !e.querySelector('[data-pt-review-reveal]')).map((e) => (e.textContent || '').trim().slice(0, 70))
  }));
  console.log('resting  ', JSON.stringify(await state()));
  await pg.click('[data-pt-review-reveal="3"]'); await pg.waitForTimeout(300);
  console.log('one shown', JSON.stringify(await state()));
  await pg.click('[data-pt-review-reveal-all]'); await pg.waitForTimeout(600);
  const all = await state();
  console.log('reveal all', JSON.stringify({ cards: all.cards, hidden: all.hidden, doubled: all.doubled, sample: all.shown[0] }));
  await pg.click('[data-pt-review-reveal-all]'); await pg.waitForTimeout(600);
  console.log('hide all ', JSON.stringify(await state()).slice(0, 120));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
