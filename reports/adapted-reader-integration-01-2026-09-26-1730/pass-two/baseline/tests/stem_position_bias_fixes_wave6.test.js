import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Wave 6 — the last two flag-schema banks that were owed while their files
// carried another session's uncommitted work (machinelab is still dirty and
// remains owed): weldlab's safety scenarios authored the correct response
// FIRST in all 4, and llm_literacy's comprehension checks never used slot A.

const weld = fs.readFileSync('stem_lab/stem_tool_weldlab.js', 'utf8');
const llm = fs.readFileSync('stem_lab/stem_tool_llm_literacy.js', 'utf8');
const pub = (f) => fs.readFileSync('desktop/web-app/public/stem_lab/' + f, 'utf8');
const T = (k, fb) => (fb === undefined ? k : fb);

function seg(src, startNeedle, endNeedle) {
  const s = src.indexOf(startNeedle);
  const anchor = src.indexOf(endNeedle, s);
  expect(s, startNeedle).toBeGreaterThan(-1);
  expect(anchor, endNeedle).toBeGreaterThan(s);
  return src.slice(s, src.lastIndexOf('\n', anchor)) + '\n';
}

function rotate(arr, shift) {
  return arr.slice(shift).concat(arr.slice(0, shift));
}

describe('Weld Lab safety-scenario rotation (flag-graded)', () => {
  const load = (withRotation) =>
    // eslint-disable-next-line no-new-func
    new Function('__alloT', seg(weld, 'var SAFETY_SCENARIOS = [', withRotation ? 'function PPESafetyLab()' : '// Every safety scenario authored') + '\nreturn SAFETY_SCENARIOS;')(T);
  const raw = load(false);
  const rotated = load(true);

  it('every scenario authored its correct response FIRST (the tell)', () => {
    expect(raw.length).toBeGreaterThanOrEqual(4);
    raw.forEach((sc) => expect(sc.choices[0].correct, sc.id).toBe(true));
  });

  it('rotation matches the recipe; the correct flag and OSHA citation survive', () => {
    raw.forEach((sc, i) => {
      const shift = (i * 7 + 3) % sc.choices.length;
      const rsc = rotated[i];
      expect(rsc.choices.map((c) => c.text)).toEqual(rotate(sc.choices.map((c) => c.text), shift));
      expect(rsc.choices.filter((c) => c.correct).length, sc.id).toBe(1);
      expect(rsc.choices.find((c) => c.correct).text).toBe(sc.choices[0].text);
      expect(rsc.osha).toBe(sc.osha);
    });
    const positions = rotated.map((sc) => sc.choices.findIndex((c) => c.correct));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(2);
  });

  it('the arc-flash response holds: stop welding and brief the bystander', () => {
    const sc1 = rotated.find((sc) => sc.id === 'sc1');
    expect(sc1.choices.find((c) => c.correct).text).toMatch(/^Stop welding/);
  });
});

describe('LLM Literacy comprehension-check rotation (flag-graded)', () => {
  const load = (withRotation) =>
    // eslint-disable-next-line no-new-func
    new Function(seg(llm, 'var CHECKS = {', withRotation ? 'MISCONCEPTIONS: common wrong beliefs' : '// The authored checks never put') + '\nreturn CHECKS;')();
  const raw = load(false);
  const rotated = load(true);

  it('the authored checks never used slot A (the tell)', () => {
    const keys = Object.keys(raw);
    expect(keys.length).toBeGreaterThanOrEqual(5);
    keys.forEach((k) => {
      expect(raw[k].options.findIndex((o) => o.correct), k).toBeGreaterThan(0);
    });
  });

  it('rotation matches the key-order recipe; the why feedback travels with its option', () => {
    Object.keys(raw).forEach((k, ki) => {
      const q = raw[k];
      const rq = rotated[k];
      const shift = (ki * 7 + 3) % q.options.length;
      expect(rq.options.map((o) => o.text)).toEqual(rotate(q.options.map((o) => o.text), shift));
      const rawCorrect = q.options.find((o) => o.correct);
      const rotCorrect = rq.options.filter((o) => o.correct);
      expect(rotCorrect.length, k).toBe(1);
      expect(rotCorrect[0].text).toBe(rawCorrect.text);
      expect(rotCorrect[0].why).toBe(rawCorrect.why);
    });
    const positions = Object.keys(rotated).map((k) => rotated[k].options.findIndex((o) => o.correct));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(2);
  });

  it('AI-literacy answers hold', () => {
    expect(rotated.tokens.options.find((o) => o.correct).text).toContain('small chunk of text');
    expect(rotated.fails.options.find((o) => o.correct).text).toContain('hallucinated');
  });
});

describe('deployment copies', () => {
  it('public mirrors are byte-identical to the root copies', () => {
    expect(pub('stem_tool_weldlab.js')).toBe(weld);
    expect(pub('stem_tool_llm_literacy.js')).toBe(llm);
  });
});
