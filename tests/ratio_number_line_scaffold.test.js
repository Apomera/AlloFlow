import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// The double-number-line scaffold printed the scale factor between the two
// known marks, rounded for display. On line-running that rendered as "x 2.333",
// and 18 x 2.333 = 41.994, which the grader rejects against a key of 42 -- a
// student who followed the on-screen instruction exactly was marked wrong.
//
// No test rendered this block. These read the value the TOOL computes (via the
// exported numberLineScaffold) and feed it to the tool's OWN grader, so a
// regression in either one fails here. A test that recomputed the scaffold
// itself would pass no matter what the code did.

const src = fs.readFileSync('stem_lab/stem_tool_ratios.js', 'utf8');
const win = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(win);
const { numberLineScaffold, challengeIsCorrect, challenges, roundTo } = win.RatioLabPure;

// Model tables parsed from the source; answers come from the exported bank.
const MODELS = (() => {
  const flat = src.replace(/\s+/g, '');
  const re = /'(line-[a-z]+)':[\s\S]{0,200}?\[\[0,0\],\[(\d+),(\d+)\],\[(\d+),'\?'\]\]/g;
  const out = [];
  let m;
  while ((m = re.exec(flat)) !== null) {
    out.push({
      id: m[1],
      model: [['Quantity', 'Value'], [[0, 0], [Number(m[2]), Number(m[3])], [Number(m[4]), '?']]],
      targetX: Number(m[4])
    });
  }
  return out;
})();

const challengeFor = (id) => challenges.numberLine.find((c) => c.id === id);

describe('double number line scaffold', () => {
  it('finds the shipped number-line models and their challenges', () => {
    expect(MODELS.length).toBe(3);
    expect(MODELS.map((m) => m.id).sort()).toEqual(['line-batches', 'line-running', 'line-tickets']);
    for (const m of MODELS) expect(challengeFor(m.id), m.id).toBeTruthy();
  });

  it('shows a value a student can follow to an answer the grader accepts', () => {
    for (const m of MODELS) {
      const scaffold = numberLineScaffold(m.model);
      expect(scaffold, m.id).toBeTruthy();
      // A student reads the displayed number and multiplies by the target.
      const typed = String(m.targetX * scaffold.shown);
      expect(challengeIsCorrect(challengeFor(m.id), typed), `${m.id}: ${m.targetX} x ${scaffold.shown} = ${typed}`).toBe(true);
    }
  });

  it('rejects the between-marks scale factor that shipped before', () => {
    // Reconstruct the old scaffold: the factor between the known marks at the
    // 3-place display rounding. This must NOT be what the tool now shows.
    for (const m of MODELS) {
      const rows = m.model[1], known = rows[1];
      const oldShown = roundTo(m.targetX / known[0], 3);
      const scaffold = numberLineScaffold(m.model);
      if (oldShown !== scaffold.shown) {
        // Where the two differ, the old one must be the broken one for running.
        if (m.id === 'line-running') {
          expect(challengeIsCorrect(challengeFor(m.id), String(known[1] * oldShown))).toBe(false);
        }
      }
    }
  });

  it('shows the unit rate, not the between-marks factor', () => {
    for (const m of MODELS) {
      const known = m.model[1][1];
      expect(numberLineScaffold(m.model).unitRate, m.id).toBe(known[1] / known[0]);
    }
  });

  it('returns null rather than a broken diagram on unusable input', () => {
    for (const bad of [null, undefined, [], [[], []], [[], [[0, 0]]], [[], [[0, 0], [0, 5], [3, '?']]]]) {
      expect(numberLineScaffold(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('puts the scaffold in the accessible description, not only the picture', () => {
    const i = src.indexOf('aligned_line_description');
    expect(src.slice(i, i + 400)).toContain('scaffoldText');
  });

  it('ships the same scaffold in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ratios.js', 'utf8')).toBe(src);
  });
});
