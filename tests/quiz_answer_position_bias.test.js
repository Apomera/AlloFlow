import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Answer-position bias: if the correct option sits in the same slot too often, a
// student who always picks that slot scores well without understanding anything.
// It has been found and fixed repeatedly here (geology, dino/evo, microbio/bike,
// decomposer/baking, raptor, auto repair), so the remaining risk is not finding a
// new instance — it is one of those fixes silently switching itself off.
//
// ★Do not audit this by counting `correctIdx`/`correct` literals in the source.
// A 2026-09-07 sweep of every tool did exactly that and flagged a dozen banks at
// 70-99% on one slot; tracing each one showed they are all normalised at load,
// under names a grep does not share: shuffleAnswers, brainAtlasShuffle, rhShuffle,
// arRotateQuizBank, arRotateCaseBank. The authored order is not what a student
// sees. Assert on the DISPLAYED distribution, or on the normaliser still applying.
//
// ★The failure mode that IS live: every one of these normalisers bails out when a
// question does not have the shape it expects — `if (!Array.isArray(q.choices))
// return q` — so renaming a bank's option key turns the de-biasing into a silent
// no-op with no error anywhere. The key-shape assertions below exist for that.

const read = (p) => readFileSync(p, 'utf8');
const share = (counts, n) => Math.max(...Object.values(counts)) / n;

/** Authored questions in source order: option count + authored correct index. */
function parseBank(src) {
  const re = /options: *\[([^\]]*)\][^}]*?correctIdx: *(\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    const quoted = m[1].match(/'(?:[^'\\]|\\.)*'/g) || [];
    out.push({ len: quoted.length || 4, correctIdx: Number(m[2]) });
  }
  return out;
}

describe('quiz answer-position bias stays de-biased', () => {
  describe('raptorHunt — 70 questions, de-biased by a load-time rotation', () => {
    const src = read('stem_lab/stem_tool_raptorhunt.js');
    const bank = parseBank(src);

    it('parses the whole bank', () => {
      expect(bank.length).toBeGreaterThanOrEqual(70);
      expect(bank.every((q) => q.len === 4)).toBe(true);
    });

    it('the authored bank really is biased, so the rotation is load-bearing', () => {
      // If this stops being true, the next case proves nothing.
      const counts = {};
      bank.forEach((q) => { counts[q.correctIdx] = (counts[q.correctIdx] || 0) + 1; });
      expect(share(counts, bank.length)).toBeGreaterThan(0.5);
    });

    it('keeps the rotation that remaps correctIdx along with the options', () => {
      // Rotating options without remapping the index marks right answers wrong,
      // which is worse than the bias it set out to fix.
      expect(src).toContain('var shift = (i * 7 + 3) % len;');
      expect(src).toContain('q.options = q.options.slice(shift).concat(q.options.slice(0, shift));');
      expect(src).toContain('q.correctIdx = (q.correctIdx - shift + len) % len;');
    });

    it('the distribution a student actually sees is near chance', () => {
      const counts = {};
      bank.forEach((q, i) => {
        const shift = (i * 7 + 3) % q.len;
        const idx = shift === 0 ? q.correctIdx : (q.correctIdx - shift + q.len) % q.len;
        counts[idx] = (counts[idx] || 0) + 1;
      });
      const worst = share(counts, bank.length);
      // Chance is 25%; it currently sits at 27%. The rotation is deterministic on
      // array position, so ADDING questions reshuffles every later index and can
      // re-introduce bias. This is the assertion that catches that.
      expect(worst, `worst slot holds ${(worst * 100).toFixed(0)}% of answers`).toBeLessThan(0.35);
      expect(Object.keys(counts).length, 'every slot is used').toBe(4);
    });
  });

  describe('autoRepair — two banks, two normalisers, each guarded on a key name', () => {
    const src = read('stem_lab/stem_tool_autorepair.js');

    it('runs both normalisers at load', () => {
      expect(src).toContain('QUIZ = arRotateQuizBank(QUIZ);');
      expect(src).toContain('DAMAGE_CASES = arRotateCaseBank(DAMAGE_CASES);');
    });

    it('each bank still uses the key its normaliser guards on', () => {
      // arRotateQuizBank: `if (!q || !Array.isArray(q.choices) ...) return q;`
      // arRotateCaseBank: `if (!sub || !Array.isArray(sub.a) ...) return;`
      // Rename either key and the de-biasing quietly stops happening.
      expect(src).toContain('!Array.isArray(q.choices)');
      expect(src).toContain('!Array.isArray(sub.a)');
      // The quiz bank is authored with `choices`, and the damage sub-questions
      // with `a` — the shapes those guards require.
      expect(src).toMatch(/var QUIZ = \[[\s\S]{0,400}?choices: \[/);
      expect(src).toMatch(/\bpart:\s*\{[\s\S]{0,300}?\ba: \[/);
      expect(src).toContain('["part", "cause", "sev"].forEach');
    });
  });

  it('roadReady shuffles every question it serves', () => {
    const src = read('stem_lab/stem_tool_roadready.js');
    // Authored 10/10 on one slot in one bank; harmless only because each served
    // question is shuffled first, with Fisher-Yates rather than a random comparator.
    expect(src).toContain('function shuffleAnswers(question)');
    expect(src).toContain('.map(shuffleAnswers)');
    expect(src).toContain('function shuffleArray(arr)');
  });

  it('brainAtlas shuffles displayed options instead of using the authored index as a slot', () => {
    const src = read('stem_lab/stem_tool_brainatlas.js');
    // correctIdx here picks the effect TEXT for the patient prompt; the options a
    // student clicks are region names, built and shuffled at question time.
    expect(src).toContain('function brainAtlasShuffle(list)');
    expect(src).toContain('opts = brainAtlasShuffle(opts);');
    expect(src).toContain('brainQuizOpts = brainAtlasShuffle(wrong.concat([quizQ]));');
  });
});
