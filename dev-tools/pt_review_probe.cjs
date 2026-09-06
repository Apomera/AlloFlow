// Drive the Quick-Review cards: answers hidden at rest, one reveal shows exactly
// one, the button KEEPS FOCUS and flips back, and "Show all" agrees with the
// per-card state. Keyboard behaviour is driven, not asserted from source.
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

  const state = () => pg.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-pt-review-reveal]'));
    const open = btns.filter((e) => e.getAttribute('aria-expanded') === 'true');
    const bodies = Array.from(document.querySelectorAll('[data-pt-review-answer] > div[id^="pt-review-answer-"]'));
    const doubled = Array.from(document.querySelectorAll('[data-pt-review-answer] > div, .text-\\[11px\\].text-slate-700'))
      .map((e) => (e.textContent || '').trim())
      .filter((t) => /^(Concept|Question|Answer):\s*(Concept|Question|Answer):/.test(t)).length;
    // Every revealed answer must have the element its button claims to control.
    const orphan = open.filter((btn) => !document.getElementById(btn.getAttribute('aria-controls'))).length;
    return {
      buttons: btns.length, open: open.length, bodies: bodies.length, doubled, orphan,
      allLabel: (document.querySelector('[data-pt-review-reveal-all]') || {}).textContent,
      allFlag: (document.querySelector('[data-pt-review-reveal-all]') || {}).getAttribute
        ? document.querySelector('[data-pt-review-reveal-all]').getAttribute('data-pt-review-reveal-all') : null,
      focus: document.activeElement ? (document.activeElement.getAttribute('data-pt-review-reveal') || document.activeElement.tagName) : null
    };
  });

  console.log('resting        ', JSON.stringify(await state()));
  // Focus the button the way a keyboard user would, then activate it.
  await pg.focus('[data-pt-review-reveal="3"]');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
  console.log('after Enter    ', JSON.stringify(await state()));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
  console.log('Enter again    ', JSON.stringify(await state()));
  await pg.click('[data-pt-review-reveal-all]'); await pg.waitForTimeout(700);
  console.log('show all       ', JSON.stringify(await state()));
  await pg.click('[data-pt-review-reveal="7"]'); await pg.waitForTimeout(400);
  console.log('hide one of all', JSON.stringify(await state()));
  await pg.click('[data-pt-review-reveal-all]'); await pg.waitForTimeout(700);
  console.log('all again      ', JSON.stringify(await state()));
  await pg.click('[data-pt-review-reveal-all]'); await pg.waitForTimeout(700);
  console.log('hide all       ', JSON.stringify(await state()));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
