// Drive the 8-question quiz the way a student does: answer every question,
// then press Next once more. Records what the header claims, whether the
// verdict is announced, and where focus lands after each answer.
//   node dev-tools/pt_quiz_run.cjs <out-dir> [wrong]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const MODE = process.argv[3] || 'right';
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'quiz'));
  await pg.waitForTimeout(1200);

  const snap = () => pg.evaluate(() => {
    const t = (sel) => { const e = document.querySelector(sel); return e ? (e.textContent || '').trim() : null; };
    const live = Array.from(document.querySelectorAll('[aria-live],[role="status"],[role="alert"]'))
      .map((e) => (e.textContent || '').trim()).filter(Boolean);
    return {
      header: t('[data-pt-quiz-header]') || (document.body.innerText.match(/Score:[^\n]*/) || [null])[0],
      opts: document.querySelectorAll('[data-pt-quiz-opt]').length,
      next: !!document.querySelector('[data-pt-quiz-next]') || /Next Question/.test(document.body.innerText),
      results: !!document.querySelector('[data-pt-quiz-results]'),
      live: live.filter((s) => /Correct|Not quite|correct|incorrect/.test(s)),
      focus: document.activeElement ? (document.activeElement.tagName + ':' + ((document.activeElement.textContent || '').trim().slice(0, 24))) : null,
      verdict: (document.body.innerText.match(/(Correct!|Not quite!)/) || [null])[0],
      state: { idx: (window.__toolState.plateTectonics || {}).quizIdx || 0, score: (window.__toolState.plateTectonics || {}).quizScore || 0 }
    };
  });

  // Always take option A. ptBalanceAnswers shuffles the key, so this yields a
  // mix of right and wrong, and the tally comes from the verdict the tool
  // itself prints - not from a copy of the answer key.
  let expected = 0;
  const answer = async () => {
    const n = await pg.$$('[data-pt-quiz-opt]');
    if (!n.length) return false;
    await pg.click('[data-pt-quiz-opt="0"]');
    await pg.waitForTimeout(350);
    const v = await pg.evaluate(() => (document.body.innerText.match(/(Correct!|Not quite!)/) || [null])[0]);
    if (v === 'Correct!') expected++;
    return true;
  };

  console.log('resting        ', JSON.stringify(await snap()));
  for (let q = 1; q <= 10; q++) {
    const ok = await answer();
    if (!ok) { console.log('q' + q + ' NO OPTIONS  ', JSON.stringify(await snap())); break; }
    console.log('q' + q + ' answered     ', JSON.stringify(await snap()));
    const nx = await pg.$('[data-pt-quiz-next]') || (await pg.$$('button')).find(() => false);
    if (nx) { await nx.click(); } else {
      await pg.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find((e) => /Next Question/.test(e.textContent || ''));
        if (b) b.click();
      });
    }
    await pg.waitForTimeout(400);
    console.log('q' + q + ' next         ', JSON.stringify(await snap()), 'expected score=' + expected);
  }
  // The results card must name what was missed, and restarting must clear the
  // pass - a "Run again" that keeps the old score would report a lie next lap.
  const res = await pg.evaluate(() => {
    const card = document.querySelector('[data-pt-quiz-results]');
    return card ? { score: card.getAttribute('data-pt-quiz-results'), missed: Array.from(card.querySelectorAll('li')).map((e) => (e.textContent || '').split(' — ')[0]) } : null;
  });
  console.log('results card   ', JSON.stringify(res), 'expected score=' + expected);
  await pg.click('[data-pt-quiz-restart]'); await pg.waitForTimeout(400);
  console.log('after restart  ', JSON.stringify(await snap()));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
