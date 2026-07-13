// Guard: the PDF accessibility score is min(content, automated) — the weakest (GOVERNING) layer, NEVER a
// mean. A `(scoreA + scoreB) / 2` blend kept creeping back: the weakest-layer redesign updated the
// breakdown card but left the header labels, and TWO mean sites in the host (the auto-continue loop's
// newScore + blendAiAxe) survived five deploys because parse / render-ref / string-anti-drift tests don't
// detect a mean-vs-min behavioral drift. This scans every scoring source for a parenthesised SUM of
// score-ish operands divided by 2 and fails if one reappears. (2026-06-21)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = ['doc_pipeline_source.jsx', 'view_pdf_audit_source.jsx', 'AlloFlowANTI.txt'];

// A parenthesised expression divided by 2 …
const DIV2 = /\)\s*\/\s*2\b/;
// … whose line mentions an accessibility-score operand (camelCase-safe substrings + bounded abbreviations).
const SCOREISH = /score|rubric|\baxe\b|\bai\b|deterministic|_reAi|_reDet|\b_det\b|_wdet|reVerify/i;

const findMeanBlends = (src) => {
  const out = [];
  src.split('\n').forEach((ln, i) => {
    if (/mean-ok/.test(ln)) return; // explicit, reviewed opt-out for a genuine non-headline average
    if (DIV2.test(ln) && ln.includes('+') && SCOREISH.test(ln)) out.push((i + 1) + ': ' + ln.trim());
  });
  return out;
};

describe('no mean-blend of two accessibility scores (weakest-layer-governs)', () => {
  for (const f of FILES) {
    it(`${f}: no (scoreA + scoreB) / 2 blend — use Math.min`, () => {
      const src = readFileSync(resolve(process.cwd(), f), 'utf8');
      const offenders = findMeanBlends(src);
      expect(offenders, `mean-blend(s) found — the headline must be min(content, automated):\n${offenders.join('\n')}`).toEqual([]);
    });
  }

  it('self-test: the detector catches the known bad shapes and ignores min / geometry', () => {
    // the exact patterns that had slipped in
    expect(findMeanBlends('x = Math.round((aiScore + axeScore) / 2);')).toHaveLength(1);
    expect(findMeanBlends('const newScore = Math.round((reVerify.score + _det) / 2);')).toHaveLength(1);
    expect(findMeanBlends('const _wscore = Math.round((_wv.score + _wdet) / 2);')).toHaveLength(1);
    // the correct form + unrelated /2 must NOT trip it
    expect(findMeanBlends('return Math.min(aiScore, axeScore);')).toEqual([]);
    expect(findMeanBlends('const mid = (left + right) / 2;')).toEqual([]);
    expect(findMeanBlends('const cx = (x1 + x2) / 2; // geometry midpoint')).toEqual([]);
    // the opt-out works
    expect(findMeanBlends('const avg = (scoreA + scoreB) / 2; // mean-ok: deliberate panel average')).toEqual([]);
  });
});
