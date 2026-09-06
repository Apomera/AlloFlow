// Two claims the quiz makes about itself, checked by driving it:
//   1. the correct answer is spread evenly across the four slots;
//   2. wrongFeedback stays in step with the rotated options, so the explanation
//      a student reads belongs to the option they actually picked.
// The second is the dangerous one: a misaligned rotation tells a student who
// answered correctly that they were wrong, and nothing about the layout looks
// broken.
//   node dev-tools/pt_answer_balance.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'quiz'));
  await pg.waitForTimeout(1200);

  const slots = [];
  const rows = [];
  for (let q = 0; q < 8; q++) {
    const n = await pg.$$('[data-pt-quiz-opt]');
    if (!n.length) break;
    // The balancer puts the answer in slot (index % 4), so picking (q % 4)
    // scores every question and NEVER exercises the wrong-answer branch - which
    // is the branch where a misaligned rotation actually hurts. Offset by one
    // to land on a wrong option every time.
    const pick = (q + 1) % 4;
    const el = await pg.$('[data-pt-quiz-opt="' + pick + '"]');
    if (!el) break;
    await el.click();
    await pg.waitForTimeout(220);
    const r = await pg.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('[data-pt-quiz-verdict]')).length
        ? Array.from(document.querySelectorAll('.grid.grid-cols-2 > div')) : [];
      const correctIdx = cells.findIndex((e) => (e.textContent || '').indexOf('✅') === 0);
      const v = document.querySelector('[data-pt-quiz-verdict]');
      const kids = v ? Array.from(v.children).map((e) => (e.textContent || '').trim()) : [];
      return {
        correctIdx,
        verdict: v ? v.getAttribute('data-pt-quiz-verdict') : null,
        feedback: kids[1] || '',
        headline: kids[0] || ''
      };
    });
    slots.push(r.correctIdx);
    // The verdict and the feedback are two derivations of the same fact.
    const feedbackSaysRight = /^Correct!/.test(r.feedback);
    const verdictSaysRight = r.verdict === 'correct';
    const agree = feedbackSaysRight === verdictSaysRight;
    rows.push({ q: q + 1, picked: pick, correctIdx: r.correctIdx, verdict: r.verdict, agree, feedback: r.feedback.slice(0, 46) });
    const nx = await pg.$('[data-pt-quiz-next]');
    if (!nx) break;
    await nx.click();
    await pg.waitForTimeout(220);
  }
  rows.forEach((r) => console.log(
    'q' + r.q + ' picked ' + r.picked + '  correct slot ' + r.correctIdx +
    '  verdict=' + r.verdict + (r.agree ? '  agree' : '  *** FEEDBACK DISAGREES ***') + '  "' + r.feedback + '"'));
  const dist = [0, 0, 0, 0];
  slots.forEach((s) => { if (s >= 0 && s < 4) dist[s]++; });
  console.log('correct-answer slot distribution A/B/C/D:', dist.join(' / '));
  console.log('rows where feedback and verdict disagree:', rows.filter((r) => !r.agree).length);
  // Exact check of the parallel rotation, using the function the tool exposes.
  // Reading the rendered feedback and judging by eye that it "matches" is a
  // heuristic; tagging both arrays by index and comparing tags is not.
  const unit = await pg.evaluate(() => {
    const f = window.__alloPtBalanceAnswers;
    if (typeof f !== 'function') return { missing: true };
    const bank = [];
    for (let i = 0; i < 8; i++) {
      bank.push({
        q: 'Q' + i,
        opts: ['t0', 't1', 't2', 't3'],
        wrongFeedback: ['t0', 't1', 't2', 't3'],
        ans: i % 3            // deliberately lopsided input
      });
    }
    const out = f(bank);
    const dist = [0, 0, 0, 0];
    let mismatched = 0, answerMoved = 0;
    out.forEach((qq, i) => {
      dist[qq.ans]++;
      // every slot must still pair the same tag in both arrays
      for (let k = 0; k < 4; k++) if (qq.opts[k] !== qq.wrongFeedback[k]) mismatched++;
      // and the option now marked correct must be the one that was correct before
      if (qq.opts[qq.ans] !== bank[i].opts[bank[i].ans]) answerMoved++;
    });
    return { dist, mismatched, answerMoved };
  });
  console.log('synthetic bank ->', JSON.stringify(unit));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
