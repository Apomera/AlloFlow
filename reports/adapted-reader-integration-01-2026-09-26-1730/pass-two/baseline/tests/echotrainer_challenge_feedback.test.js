import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Echo Navigator's challenge feedback had two problems:
//  - the distance challenge divided by its own target, which rounds to one decimal,
//    so standing against a surface produced "Infinity% off"
//  - the sentences a student actually hears were assembled from English fragments
//    and then passed as a variable to an already-translatable announceToSR call, so
//    the call site measured as localised while the words were not

const sourcePath = 'stem_lab/stem_tool_echotrainer.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

describe('Echo Navigator — distance challenge scoring', () => {
  function loadScorer() {
    const source = read().replace(/\r\n/g, '\n');
    const at = source.indexOf('var pct = actual > 0');
    expect(at, 'guarded percentage calculation').toBeGreaterThan(-1);
    const line = source.slice(at, source.indexOf('\n', at));
    // Rebuild just the arithmetic so it can be exercised directly.
    return new Function('actual', 'error', line.replace('var pct =', 'return') .replace(/;$/, ';'));
  }

  it('never divides by a zero target', () => {
    const pctOf = loadScorer();
    // targetDist = Math.round(minDist * 0.1 * 10) / 10, and the challenge only
    // requires minDist < 500 with no lower bound, so 0.0 is reachable.
    expect(pctOf(0, 0.5)).toBe(100);
    expect(pctOf(0, 0)).toBe(0);
    expect(Number.isFinite(pctOf(0, 20))).toBe(true);
  });

  it('still scores normal distances the same way', () => {
    const pctOf = loadScorer();
    expect(pctOf(10, 1)).toBe(10);
    expect(pctOf(2, 1)).toBe(50);
    expect(pctOf(5, 0)).toBe(0);
  });

  it('guards the division rather than dividing unconditionally', () => {
    const source = read();
    // The arithmetic itself is unchanged; what matters is that it now sits behind a
    // zero check instead of being evaluated for every target.
    expect(source).toMatch(/var pct = actual > 0 \? Math\.round\(\(error \/ actual\) \* 100\)/);
    expect(source).not.toMatch(/var pct = Math\.round\(\(error \/ actual\) \* 100\);/);
  });
});

describe('Echo Navigator — spoken feedback is translatable', () => {
  it('routes the four run-feedback sentences through the translator', () => {
    const source = read();
    for (const key of ['feedback_perfect', 'feedback_many_bumps', 'feedback_some_bumps', 'feedback_strong']) {
      expect(source, key).toContain('stem.echotrainer.' + key);
    }
    // Both the 3D and 2D loops build this message; neither may hold a bare literal.
    expect(source).not.toMatch(/feedbackMsg2? = 'Perfect navigation/);
    expect(source).not.toMatch(/feedbackMsg2? = 'Strong performance/);
  });

  it('translates the view-mode names spoken on a win', () => {
    const source = read();
    for (const key of ['mode_audio_only', 'mode_echo_vision', 'mode_revealed']) {
      expect(source, key).toContain('stem.echotrainer.' + key);
    }
    expect(source).not.toMatch(/modeLabel2? = currentViewMode\w* === 'audio' \? 'Audio-only'/);
  });

  it('translates the distance challenge prompt, grades and result', () => {
    const source = read();
    expect(source).toContain('stem.echotrainer.dist_prompt');
    expect(source).toContain('stem.echotrainer.dist_result');
    for (const key of ['grade_excellent', 'grade_good', 'grade_fair', 'grade_keep_practicing']) {
      expect(source, key).toContain('stem.echotrainer.' + key);
    }
    // The English wording stays as the t() fallback — what must be gone is the bare
    // concatenation that had no key attached to it.
    expect(source).toMatch(/tFmt\('stem\.echotrainer\.dist_prompt', 'You just sent a sonar pulse\./);
    expect(source).not.toMatch(/'You just sent a sonar pulse\. How far is the ' \+/);
    expect(source).not.toMatch(/\? 'Excellent!' :/);
  });

  it('translates the material quiz explanation', () => {
    const source = read();
    expect(source).toContain('stem.echotrainer.mat_correct');
    expect(source).toContain('stem.echotrainer.mat_wrong');
    expect(source).not.toMatch(/'Correct! ' \+ opt \+ ' has a '/);
  });

  it('leaves no English prose assigned to a variable that reaches the user', () => {
    const source = read().replace(/\r\n/g, '\n');
    const offenders = [];
    for (const line of source.split('\n')) {
      const m = /(?:^|[;{]|\bvar\s+|\belse\s+)\s*([A-Za-z_$][\w$]*)\s*=\s*(?:[^=;]*\?\s*)?(['"])([A-Z][^'"]{14,})\2/.exec(line);
      if (!m) continue;
      const text = m[3];
      if (!/\s/.test(text)) continue;
      if (/px|rgba?\(|#[0-9a-f]{3,6}|sans-serif|monospace|^stem\./i.test(text)) continue;
      offenders.push(m[1] + ' = ' + JSON.stringify(text).slice(0, 60));
    }
    expect(offenders).toEqual([]);
  });
});

describe('Echo Navigator — material quiz fairness', () => {
  it('shuffles the options and keys correctness on text, not position', () => {
    const source = read();
    const at = source.indexOf("var allMats = ['concrete'");
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(at, at + 700);
    // Fisher-Yates over the option list, so the correct answer is not always first.
    expect(block).toMatch(/for \(var si = options\.length - 1; si > 0; si--\)/);
    // Correctness compares the material name; an index comparison would break the
    // moment the shuffle changed.
    expect(source).toMatch(/var correct = opt === matQuiz\.correctMat;/);
  });

  it('always builds four distinct options and cannot loop forever', () => {
    const source = read().replace(/\r\n/g, '\n');
    const at = source.indexOf("var allMats = ['concrete'");
    const block = source.slice(at, source.indexOf('upd(\'matQuiz\'', at));
    const fn = new Function('hitMat', 'Math', `
      ${block}
      return options;
    `);
    // Deterministic Math stub so the assertion does not depend on chance.
    let seed = 7;
    const rng = { random: () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }, floor: Math.floor, sqrt: Math.sqrt, abs: Math.abs };
    for (const hit of ['concrete', 'rock', 'wood', 'metal', 'glass', 'car', 'flesh']) {
      const options = fn(hit, rng);
      expect(options.length, hit).toBe(4);
      expect(new Set(options).size, hit + ' options must be distinct').toBe(4);
      expect(options, hit + ' must include the answer').toContain(hit);
    }
  });
});
