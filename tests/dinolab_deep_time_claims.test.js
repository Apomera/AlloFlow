// Dino Lab taught the famous deep-time fact BACKWARDS, and graded students on it.
//
//   quiz q7  "Stegosaurus lived closer in time to which?"  keyed "Us, today"
//   myth card "Stegosaurus is closer in time to us than to T. rex."
//
// By the tool's OWN catalog (Stegosaurus 155-145 mya, T. rex 68-66 mya):
//   Stegosaurus -> T. rex :  145 - 68 =  77 My
//   Stegosaurus -> today  :             145 My
// so Stegosaurus is far closer to T. rex. The real fact is about T. REX: 66 My
// to us versus 77 My to Stegosaurus.
//
// The deep-time tab stated it correctly the whole time, so the tool was
// contradicting itself and the wrong version was the graded one.
//
// These tests derive the comparison from the catalog instead of pinning
// sentences, so they stay true if the dates are ever revised.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function species(id) {
  const re = new RegExp("id: '" + id + "'[^}]{0,400}");
  const m = SRC.match(re);
  expect(m, `${id} not found in the catalog`).toBeTruthy();
  const hi = Number((m[0].match(/myaHi: ([0-9.]+)/) || [])[1]);
  const lo = Number((m[0].match(/myaLo: ([0-9.]+)/) || [])[1]);
  expect(Number.isFinite(hi) && Number.isFinite(lo), `${id} has no usable dates`).toBe(true);
  return { hi, lo };
}

function quiz() {
  const open = SRC.indexOf('var QUIZ = [');
  const close = SRC.indexOf('\n  ];', open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open + 11, close + 4).replace(/\n {2}\];/, ']'))();
}

describe('the deep-time comparison matches the catalog', () => {
  it('puts Stegosaurus closer to T. rex than to us', () => {
    // The gap that makes the inverted claim false.
    const steg = species('stegosaurus');
    const trex = species('tyrannosaurus');
    const toTrex = steg.lo - trex.hi;
    const toUs = steg.lo;
    expect(toTrex).toBeLessThan(toUs);
  });

  it('puts T. rex closer to us than to Stegosaurus', () => {
    // The gap that makes the corrected claim true.
    const steg = species('stegosaurus');
    const trex = species('tyrannosaurus');
    const toUs = trex.lo;
    const toSteg = steg.lo - trex.hi;
    expect(toUs).toBeLessThan(toSteg);
  });
});

describe('the quiz grades the true version', () => {
  it('asks about T. rex, not Stegosaurus', () => {
    const q7 = quiz().find((q) => q.id === 'q7');
    expect(q7, 'q7 is gone - re-check this claim').toBeTruthy();
    expect(q7.q).toMatch(/T\. rex/);
  });

  it('keys an answer the catalog actually supports', () => {
    // Derive the right answer rather than asserting an index, so reordering
    // the options cannot silently break the key.
    const q7 = quiz().find((q) => q.id === 'q7');
    const steg = species('stegosaurus');
    const trex = species('tyrannosaurus');
    const closerToUs = trex.lo < (steg.lo - trex.hi);
    const keyed = q7.options[q7.answer];
    expect(closerToUs, 'the catalog no longer supports this question').toBe(true);
    expect(keyed, `q7 keys "${keyed}", which the catalog contradicts`).toBe('Us, today');
  });

  it('does not claim Stegosaurus is closer to us', () => {
    const q7 = quiz().find((q) => q.id === 'q7');
    expect(q7.explain).not.toMatch(/Stegosaurus[^.]*closer in time to (us|humans)/i);
  });
});

describe('the tool does not contradict itself', () => {
  it('never says Stegosaurus is closer in time to us', () => {
    // This is the exact wording that was wrong in two places while the deep
    // time tab said the opposite.
    const offenders = SRC.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /Stegosaurus[^.]{0,60}closer in time to (us|humans|you)/i.test(line))
      .map(({ n }) => n);
    expect(offenders, 'inverted deep-time claim at line(s): ' + offenders.join(', ')).toEqual([]);
  });

  it('states the T. rex version wherever it makes the comparison', () => {
    const claims = SRC.split('\n').filter((l) => /closer in time to (us|you)/i.test(l));
    expect(claims.length, 'the deep-time comparison disappeared entirely').toBeGreaterThan(0);
    for (const line of claims) {
      expect(line, 'a "closer in time to us" claim that is not about T. rex: ' + line.trim().slice(0, 90))
        .toMatch(/T\. rex|Tyrannosaurus/);
    }
  });

  it('agrees on the separation between them', () => {
    // Every place that quotes the gap should quote the same number.
    const nums = [...SRC.matchAll(/About (\d+) million years separate|about (\d+) million years separate/g)]
      .map((m) => Number(m[1] || m[2]));
    expect(nums.length, 'no stated separation found').toBeGreaterThan(0);
    expect(new Set(nums).size, 'the stated separation disagrees between places: ' + nums.join(', ')).toBe(1);
  });
});
