// punnett quiz banks — answer-position bias.
//
// Measured across CHALLENGE_QS (3 tiers) + BATTLE_QS: 3/36/16/0, i.e. 65% of
// correct answers in slot 2 and slot 4 NEVER correct, with no shuffle anywhere.
// The tool now rotates each question by a per-question offset, applied ONCE to
// the banks at module scope (questions are re-read from the bank on every
// render, so a render-time Math.random() would deal new options mid-question).
//
// punnett is index-based on all three fields, unlike cell/waterCycle:
//   correctness  ->  i === q.correct
//   answer text  ->  q.a[q.correct]
//   feedback     ->  q.wrongFeedback[selectedIndex]
// so the rotation must permute options, remap `correct`, and move wrongFeedback
// together. These tests pin all three.
//
// Source-literal extraction rather than loadTool (large file); CRLF normalised
// because the working tree is CRLF while multi-line markers are authored LF.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_punnett.js';
let built;

function flat(bank) {
  return Array.isArray(bank)
    ? bank
    : Object.keys(bank).reduce((acc, k) => acc.concat(bank[k]), []);
}
function dist(qs) {
  const c = [0, 0, 0, 0];
  qs.forEach((q) => { if (q.a && q.a.length === 4) c[q.correct]++; });
  return c;
}

beforeAll(() => {
  const src = fs.readFileSync(SRC_PATH, 'utf8').replace(/\r\n/g, '\n');
  const hStart = src.indexOf('  function punnettRotateQuestion(q, seedIdx) {');
  const hEnd = src.indexOf('  var CHALLENGE_QS = {');
  const cEnd = src.indexOf('\n  };', hEnd);
  const bStart = src.indexOf('  var BATTLE_QS = [');
  const bEnd = src.indexOf('\n  ];', bStart);
  if (hStart < 0 || hEnd < 0 || bStart < 0) throw new Error('punnett source markers not found');

  built = new Function(
    src.slice(hStart, hEnd) + '\n' +
    src.slice(hEnd, cEnd + 5) + '\n' +
    src.slice(bStart, bEnd + 5) + '\n' +
    'return {' +
    '  authored: { CHALLENGE_QS: CHALLENGE_QS, BATTLE_QS: BATTLE_QS },' +
    '  rotated: { CHALLENGE_QS: punnettRotateBank(CHALLENGE_QS), BATTLE_QS: punnettRotateBank(BATTLE_QS) },' +
    '  rotateQ: punnettRotateQuestion' +
    '};'
  )();
});

describe('punnett — authored banks are position-biased (documents why rotation exists)', () => {
  it('puts most correct answers in slot 2 and never in slot 4', () => {
    const authored = dist(flat(built.authored.CHALLENGE_QS).concat(flat(built.authored.BATTLE_QS)));
    const total = authored.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(50);
    expect(authored[3]).toBe(0);
    expect(authored[1] / total).toBeGreaterThan(0.5);
  });
});

describe('punnett — rotation spreads answers without changing the questions', () => {
  it('no slot is dead and none dominates after rotation', () => {
    const rotated = dist(flat(built.rotated.CHALLENGE_QS).concat(flat(built.rotated.BATTLE_QS)));
    const total = rotated.reduce((a, b) => a + b, 0);
    for (let p = 0; p < 4; p++) {
      expect(rotated[p], 'slot ' + p + ' of ' + rotated.join('/')).toBeGreaterThan(0);
    }
    expect(Math.max(...rotated) / total).toBeLessThan(0.45);
  });

  it('preserves the option set and the correct answer TEXT on every question', () => {
    const a = flat(built.authored.CHALLENGE_QS).concat(flat(built.authored.BATTLE_QS));
    const r = flat(built.rotated.CHALLENGE_QS).concat(flat(built.rotated.BATTLE_QS));
    expect(r.length).toBe(a.length);
    a.forEach((A, i) => {
      const R = r[i];
      expect(R.a.slice().sort(), 'Q' + i).toEqual(A.a.slice().sort());
      expect(R.a[R.correct], 'Q' + i + ' answer text').toBe(A.a[A.correct]);
    });
  });

  it('moves positional wrongFeedback with its own option', () => {
    const a = flat(built.authored.CHALLENGE_QS).concat(flat(built.authored.BATTLE_QS));
    const r = flat(built.rotated.CHALLENGE_QS).concat(flat(built.rotated.BATTLE_QS));
    let checked = 0;
    a.forEach((A, i) => {
      if (!Array.isArray(A.wrongFeedback) || A.wrongFeedback.length !== A.a.length) return;
      const R = r[i];
      A.a.forEach((optText, k) => {
        expect(R.wrongFeedback[R.a.indexOf(optText)], 'Q' + i + ' option ' + k).toBe(A.wrongFeedback[k]);
      });
      checked++;
    });
    expect(checked).toBeGreaterThan(20);
  });

  it('keeps other question fields intact (concept, dmg) and does not mutate the source', () => {
    const a = flat(built.authored.BATTLE_QS);
    const r = flat(built.rotated.BATTLE_QS);
    a.forEach((A, i) => {
      expect(r[i].dmg, 'Q' + i + ' dmg').toBe(A.dmg);
      if (A.concept) expect(r[i].concept).toBe(A.concept);
    });
    const q = a[0];
    const before = q.a.slice();
    built.rotateQ(q, 5);
    expect(q.a).toEqual(before);
  });

  it('is deterministic for a given question index', () => {
    const q = flat(built.authored.CHALLENGE_QS)[2];
    expect(built.rotateQ(q, 2).a).toEqual(built.rotateQ(q, 2).a);
    expect(built.rotateQ(q, 2).correct).toBe(built.rotateQ(q, 2).correct);
  });
});
