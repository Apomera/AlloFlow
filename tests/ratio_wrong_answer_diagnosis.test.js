import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// A wrong answer returned the same static hint forever, no matter what the
// student did. Additive reasoning -- adding the same amount to both parts of a
// ratio instead of scaling -- is the central misconception in this topic, and
// the tool could already prove when it had happened.

const src = fs.readFileSync('stem_lab/stem_tool_ratios.js', 'utf8');
const win = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(win);
const { diagnoseRatioAnswer, challengeIsCorrect, challenges } = win.RatioLabPure;

const paint = challenges.ratioTable.find((c) => c.id === 'ratio-paint');

describe('wrong-answer diagnosis', () => {
  it('the paint challenge carries the pair its diagnosis needs', () => {
    expect(paint).toBeTruthy();
    expect(paint.ratioPair).toEqual([3, 5, 12, 20]);
    // The stored pair must agree with the answer key it is derived from.
    expect(paint.ratioPair[2]).toBe(Number(paint.answer));
    // And it must be a true proportion: a/b === c/d.
    const [a, b, c, d] = paint.ratioPair;
    expect(a / b).toBeCloseTo(c / d, 12);
  });

  it('names additive reasoning instead of restating the hint', () => {
    // 3:5 -> ?:20. The additive student adds 15 to both and answers 18.
    const diagnosis = diagnoseRatioAnswer(paint, '18');
    expect(diagnosis).toBeTruthy();
    expect(diagnosis.kind).toBe('additive');
    expect(diagnosis.message).toContain('added 15 to both');
    expect(diagnosis.message).toContain('multiplied by 4');
    // It must not simply echo the existing hint.
    expect(diagnosis.message).not.toBe(paint.hint);
  });

  it('catches an answer that is off by a power of ten', () => {
    for (const [typed, factor] of [['120', 10], ['1.2', 10], ['1200', 100]]) {
      const diagnosis = diagnoseRatioAnswer(paint, typed);
      expect(diagnosis, typed).toBeTruthy();
      expect(diagnosis.kind, typed).toBe('placeValue');
      expect(diagnosis.message, typed).toContain(String(factor));
    }
  });

  it('says nothing when the answer is correct', () => {
    expect(diagnoseRatioAnswer(paint, '12')).toBeNull();
    expect(challengeIsCorrect(paint, '12')).toBe(true);
  });

  it('falls back to the hint rather than guessing at an unrecognised slip', () => {
    for (const typed of ['7', '13', '0', '-4']) {
      expect(diagnoseRatioAnswer(paint, typed), typed).toBeNull();
    }
  });

  it('never diagnoses an answer the grader would accept', () => {
    for (const c of challenges.ratioTable.concat(challenges.numberLine)) {
      for (let n = -50; n <= 200; n++) {
        if (challengeIsCorrect(c, String(n))) {
          expect(diagnoseRatioAnswer(c, String(n)), `${c.id} accepts ${n}`).toBeNull();
        }
      }
    }
  });

  it('survives hostile and unparseable input', () => {
    for (const bad of [null, undefined, '', '   ', 'abc', '__proto__', 'Infinity', 'NaN', '1e999', {}, []]) {
      expect(() => diagnoseRatioAnswer(paint, bad)).not.toThrow();
      const out = diagnoseRatioAnswer(paint, bad);
      expect(out === null || typeof out.message === 'string', JSON.stringify(bad)).toBe(true);
    }
    for (const bad of [null, undefined, {}, { answers: ['x'] }]) {
      expect(() => diagnoseRatioAnswer(bad, '18')).not.toThrow();
    }
  });

  it('is wired into the wrong-answer feedback path', () => {
    expect(src).toContain('diagnoseRatioAnswer(challenge, scopedChallengeAnswer)');
    // The diagnosis must REACH the message. Computing it and then discarding it
    // still satisfies a plain source search, so assert the selection itself.
    const lines = src.split(String.fromCharCode(10));
    const pick = lines.find((l) => l.includes('var wrongAnswerHelp'));
    expect(pick).toBeTruthy();
    expect(pick).toContain('diagnosis');
    // Every "Not yet." message must be built from that variable, not the hint.
    const uses = lines.filter((l) => l.includes('Not yet. '));
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u).toContain('wrongAnswerHelp');
  });

  it('ships the same diagnosis in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ratios.js', 'utf8')).toBe(src);
  });
});
