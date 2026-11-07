import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Multiplication Table stage B (2026-11-03): the new pure engines, run rather
// than grepped: factors and primes (4.OA.4), the sieve reducer, the number
// detective, word problems (3.OA.3, 3.OA.8), fact families and the 3.OA.4
// missing-number division forms. MULTTABLE_DEEP_SRC points the suite at
// another copy (mutation check: the stage-A copy has none of these).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
const src = fs.readFileSync(FILE, 'utf8');
const NAMES = ['factorPairs', 'factorsOf', 'primeStatus', 'widthLimit', 'diagnosePrimeClaim', 'pickDetectiveItem', 'detectiveAnswer',
  'diagnoseDetective', 'sieveInit', 'sieveAct', 'sieveNext', 'makeWordProblem', 'diagnoseOps', 'diagnoseStep', 'wpTypesFor', 'wpGivens',
  'makeFamily', 'diagnoseFamily', 'cardTrue', 'makeFluencyRound', 'factPool', 'factAnswer', 'diagnoseMistake', 'missedFactIdentity', 'formatMissedFact', 'missedFactMode'];
const E = (() => {
  const start = src.indexOf('var DIFFICULTY = {');
  const end = src.indexOf("window.StemLab.registerTool('multtable'", start);
  // eslint-disable-next-line no-new-func
  return new Function('window', src.slice(start, end) + '\nreturn {' + NAMES.map((n) => `${n}: typeof ${n} === 'function' ? ${n} : null`).join(',') + '};')({});
})();

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

describe('engine is present', () => {
  it('exposes every stage-B function', () => {
    expect(NAMES.filter((n) => !E[n])).toEqual([]);
  });
});

describe('factors and primes (4.OA.4)', () => {
  it('factor pairs multiply back to n and cover every factor, 1 to 100', () => {
    for (let n = 1; n <= 100; n++) {
      const pairs = E.factorPairs(n);
      const brute = [];
      for (let f = 1; f <= n; f++) if (n % f === 0) brute.push(f);
      expect(E.factorsOf(n)).toEqual(brute);
      pairs.forEach(([w, q]) => { expect(w * q).toBe(n); expect(w).toBeLessThanOrEqual(q); });
      expect(E.primeStatus(n)).toBe(n === 1 ? 'neither' : brute.length === 2 ? 'prime' : 'composite');
      expect(E.widthLimit(n) ** 2).toBeLessThanOrEqual(n);
      expect((E.widthLimit(n) + 1) ** 2).toBeGreaterThan(n);
    }
    expect(E.factorsOf(24)).toEqual([1, 2, 3, 4, 6, 8, 12, 24]);
  });

  it('names the three classic misconceptions and never diagnoses a right claim', () => {
    expect(E.diagnosePrimeClaim(1, 'prime').kind).toBe('onePrime');
    expect(E.diagnosePrimeClaim(21, 'prime').kind).toBe('oddPrime');
    expect(E.diagnosePrimeClaim(9, 'prime').kind).toBe('oddPrime');
    expect(E.diagnosePrimeClaim(2, 'composite').kind).toBe('twoEven');
    expect(E.diagnosePrimeClaim(14, 'prime').kind).toBe('evenPrime');
    expect(E.diagnosePrimeClaim(13, 'neither').kind).toBe('neitherOnlyOne');
    for (let n = 1; n <= 100; n++) expect(E.diagnosePrimeClaim(n, E.primeStatus(n)), String(n)).toBeNull();
    expect(E.diagnoseDetective({ type: 'more', x: 12, y: 31, answer: 12 }, 31).kind).toBe('biggerMore');
    expect(E.diagnoseDetective({ type: 'more', x: 12, y: 31, answer: 12 }, 12)).toBeNull();
    expect(E.diagnoseDetective({ type: 'multiple', n: 3, d: 9 }, 'yes').kind).toBe('factorNotMultiple');
    expect(E.diagnoseDetective({ type: 'multiple', n: 35, d: 4 }, 'yes').kind).toBe('notAMultiple');
    expect(E.diagnoseDetective({ type: 'multiple', n: 36, d: 4 }, 'no').kind).toBe('missedMultiple');
  });

  it('detective items are well formed, in range for the band, and the "more factors" trap is common', () => {
    const rng = seeded(5);
    let traps = 0, more = 0, ones = 0, oddComposites = 0;
    for (const [band, max] of [['early', 30], ['core', 50], ['extend', 100]]) {
      for (let i = 0; i < 600; i++) {
        const it = E.pickDetectiveItem(band, rng);
        expect(it.id).toBeTruthy();
        if (it.type === 'prime') { expect(it.n).toBeGreaterThanOrEqual(1); expect(it.n).toBeLessThanOrEqual(max); if (it.n === 1) ones++; if (it.n % 2 && E.primeStatus(it.n) === 'composite') oddComposites++; }
        if (it.type === 'more') {
          more++;
          const cx = E.factorsOf(it.x).length, cy = E.factorsOf(it.y).length;
          expect(cx).not.toBe(cy);
          expect(it.answer).toBe(cx > cy ? it.x : it.y);
          if (it.answer !== Math.max(it.x, it.y)) traps++;
        }
        if (it.type === 'multiple') { expect(it.d).toBeGreaterThanOrEqual(2); expect(it.d).toBeLessThanOrEqual(9); expect(it.n).toBeLessThanOrEqual(max); }
        expect(E.diagnoseDetective(it, E.detectiveAnswer(it))).toBeNull();
      }
    }
    expect(traps / more).toBeGreaterThan(0.3);
    expect(ones).toBeGreaterThan(20);
    expect(oddComposites).toBeGreaterThan(100);
  });
});

describe('sieve of Eratosthenes reducer', () => {
  function run(N) {
    let s = E.sieveInit(N);
    let r = E.sieveAct(s, { type: 'one', choice: 'prime' });
    expect(r.fb.kind).toBe('onePrime');
    expect(r.s.phase).toBe('one');
    s = E.sieveAct(r.s, { type: 'one', choice: 'cross' }).s;
    let guard = 0;
    while (!s.done && guard++ < 200) {
      const p = E.sieveNext(s);
      r = E.sieveAct(s, { type: 'cell', n: p });
      expect(r.fb.kind).toBe('circled');
      s = r.s;
      const truth = p * p <= N;
      const wrong = E.sieveAct(s, { type: 'predict', yes: !truth });
      expect(wrong.fb.kind).toBe(truth ? 'predictMissed' : 'predictNoNew');
      expect(wrong.s.phase).toBe('predict');
      r = E.sieveAct(s, { type: 'predict', yes: truth });
      s = r.s;
      if (!truth) { expect(r.fb.kind).toBe('finished'); break; }
      // A non-multiple is named, the prime itself is kept, then cross a few and finish.
      const notM = p + 1;
      if (notM <= N && notM % p) expect(E.sieveAct(s, { type: 'cell', n: notM }).fb.kind).toMatch(/notMultiple|alreadyCrossed|circledNotMultiple/);
      expect(E.sieveAct(s, { type: 'cell', n: p }).fb.kind).toBe('keepPrime');
      expect(E.sieveAct(s, { type: 'finishP' }).s.phase).toBe('cross'); // must cross some first
      let crossedByHand = 0;
      for (let m = 2 * p; m <= N && crossedByHand < 3 && s.phase === 'cross'; m += p) {
        if (s.crossed[m]) { expect(E.sieveAct(s, { type: 'cell', n: m }).fb.kind).toBe('alsoMultiple'); continue; }
        r = E.sieveAct(s, { type: 'cell', n: m }); s = r.s; crossedByHand++;
        expect(r.fb.kind).toMatch(/crossed/);
      }
      if (s.phase === 'cross') s = E.sieveAct(s, { type: 'finishP' }).s;
      expect(s.phase).toBe('pick');
    }
    return s;
  }
  it('finds exactly the primes to 30, 50 and 100, stopping at the square-root rule', () => {
    for (const [N, count] of [[30, 10], [50, 15], [100, 25]]) {
      const s = run(N);
      expect(s.done).toBe(true);
      const primes = Object.keys(s.primes).map(Number).sort((a, b) => a - b);
      expect(primes.length).toBe(count);
      expect(primes.every((n) => E.primeStatus(n) === 'prime')).toBe(true);
      expect(s.crossed[1]).toBe(true);
    }
  });
  it('never mutates the state it is given', () => {
    const s0 = E.sieveInit(30);
    const snap = JSON.stringify(s0);
    E.sieveAct(s0, { type: 'one', choice: 'cross' });
    expect(JSON.stringify(s0)).toBe(snap);
  });
});

describe('word problems (3.OA.3, 3.OA.8)', () => {
  it('every generated problem is true arithmetic and never states its answer', () => {
    const rng = seeded(21);
    const seen = new Set();
    for (const band of ['early', 'core', 'extend']) {
      for (let i = 0; i < 1500; i++) {
        const it = E.makeWordProblem(band, rng, {});
        seen.add(it.type);
        const givens = E.wpGivens(it);
        expect(givens).not.toContain(it.answer);
        expect(it.answer).toBeGreaterThanOrEqual(1);
        givens.forEach((g) => expect(Number.isInteger(g) && g >= 1).toBe(true));
        let carry = null;
        it.steps.forEach((st, k) => {
          const v = { mul: st.l * st.r, div: st.l / st.r, add: st.l + st.r, sub: st.l - st.r }[st.op];
          expect(v, it.id).toBe(st.v);
          if (k > 0) expect([st.l, st.r]).toContain(carry);
          carry = st.v;
        });
        expect(it.steps[it.steps.length - 1].v).toBe(it.answer);
        if (band === 'early') { expect(it.ops).toEqual(['mul']); expect(Math.max(it.a, it.b)).toBeLessThanOrEqual(10); }
        if (band !== 'extend') expect(Math.max(it.a, it.b)).toBeLessThanOrEqual(10);
        expect(it.options.some((o) => o.join() === it.ops.join())).toBe(true);
        expect(E.diagnoseOps(it, it.ops)).toBeNull();
      }
    }
    expect(seen.size).toBe(15);
  });

  it('a teacher lock limits the types, and two-step options hold three named distractors', () => {
    const rng = seeded(4);
    for (let i = 0; i < 200; i++) expect(E.makeWordProblem('core', rng, { lock: 'two' }).ops).toHaveLength(2);
    for (let i = 0; i < 200; i++) expect(E.makeWordProblem('core', rng, { lock: 'one' }).ops).toHaveLength(1);
    const it = E.makeWordProblem('core', rng, { type: 'two_mul_sub' });
    const kinds = it.options.filter((o) => o.join() !== 'mul,sub').map((o) => E.diagnoseOps(it, o).kind).sort();
    expect(kinds).toEqual(['firstStepOp', 'oneStepOnly', 'secondStepOp']);
  });

  it('names the operation misconceptions', () => {
    const rng = seeded(9);
    const kind = (type, ops) => E.diagnoseOps(E.makeWordProblem('core', rng, { type }), ops).kind;
    expect(kind('groups_mul', ['add'])).toBe('addForMult');
    expect(kind('compare_mul', ['add'])).toBe('timesAsManyAdd');
    expect(kind('groups_share', ['mul'])).toBe('multForDiv');
    expect(kind('compare_div', ['mul'])).toBe('timesAsManyMult');
    expect(kind('array_rows', ['sub'])).toBe('subForDiv');
    expect(kind('measure_area', ['div'])).toBe('divForMult');
  });

  it('names a wrong step answer', () => {
    expect(E.diagnoseStep({ l: 7, op: 'mul', r: 8, v: 56 }, 15).kind).toBe('added');
    expect(E.diagnoseStep({ l: 56, op: 'div', r: 7, v: 8 }, 56).kind).toBe('product');
    expect(E.diagnoseStep({ l: 30, op: 'sub', r: 4, v: 26 }, 34).kind).toBe('addedNotSub');
    expect(E.diagnoseStep({ l: 30, op: 'add', r: 4, v: 34 }, 26).kind).toBe('subNotAdd');
    expect(E.diagnoseStep({ l: 30, op: 'add', r: 4, v: 34 }, 34)).toBeNull();
  });
});

describe('fact families and 3.OA.4 missing-number forms', () => {
  it('a family has four true members and two false look-alikes, one a reversed division', () => {
    const rng = seeded(13);
    for (let i = 0; i < 300; i++) {
      const fam = E.makeFamily(['early', 'core', 'extend'][i % 3], rng);
      expect(fam.a).not.toBe(fam.b);
      expect(fam.cards).toHaveLength(6);
      fam.cards.forEach((c) => expect(E.cardTrue(c), JSON.stringify(c)).toBe(c.ok));
      expect(fam.cards.filter((c) => c.ok)).toHaveLength(4);
      expect(fam.cards.some((c) => c.kind === 'divReverse')).toBe(true);
      const all = Object.fromEntries(fam.cards.filter((c) => c.ok).map((c) => [c.id, true]));
      expect(E.diagnoseFamily(fam, all)).toBeNull();
      const withTrap = { ...all, x1: true };
      expect(E.diagnoseFamily(fam, withTrap).wrong).toContain('divReverse');
      expect(E.diagnoseFamily(fam, { m1: true }).missing).toBe(3);
    }
  });

  it('"? ÷ d = q" and "p ÷ ? = q" have the right answers and named mistakes', () => {
    const dividend = { a: 6, b: 8, mode: 'divmiss', divisor: 6, form: 'dividend' }; // ? ÷ 6 = 8
    const divisor = { a: 6, b: 8, mode: 'divmiss', divisor: 6, form: 'divisor' };   // 48 ÷ ? = 8
    expect(E.factAnswer(dividend)).toBe(48);
    expect(E.factAnswer(divisor)).toBe(6);
    const k = (ch, g) => (E.diagnoseMistake(ch, g) || {}).kind || null;
    expect(k(dividend, 48)).toBeNull();
    expect(k(dividend, 8)).toBe('quotientEcho');
    expect(k(dividend, 6)).toBe('divisorEcho');
    expect(k(dividend, 14)).toBe('added');
    expect(k(dividend, 42)).toBe('oneGroupOff');
    expect(k(divisor, 6)).toBeNull();
    expect(k(divisor, 8)).toBe('quotientEcho');
    expect(k(divisor, 48)).toBe('product');
    expect(k(divisor, 40)).toBe('subtracted');
    expect(k(divisor, 7)).toBe('offByOneDivisor');
    expect(k({ a: 2, b: 6, mode: 'divmiss', divisor: 2, form: 'dividend' }, 3)).toBe('dividedInstead'); // ? ÷ 2 = 6, said 6 ÷ 2
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) for (const form of ['dividend', 'divisor']) for (const d of [a, b]) {
      const ch = { a, b, mode: 'divmiss', divisor: d, form };
      expect(E.diagnoseMistake(ch, E.factAnswer(ch))).toBeNull();
      expect(E.diagnoseMistake(ch, E.factAnswer(ch) + 100)).not.toBeNull();
    }
  });

  it('missed "divmiss" facts keep their form and print a true division', () => {
    const m = { a: 6, b: 8, mode: 'divmiss', divisor: 6, form: 'dividend', answer: 48 };
    expect(E.missedFactMode(m)).toBe('divmiss');
    expect(E.formatMissedFact(m)).toBe('48 ÷ 6 = 8');
    expect(E.missedFactIdentity(m)).not.toBe(E.missedFactIdentity({ ...m, form: 'divisor' }));
  });
});

describe('fluency rounds', () => {
  it('a round has ten distinct facts from the pool, weak facts first', () => {
    const pool = E.factPool('tens');
    const scores = {};
    pool.forEach((k) => { scores[k] = { attempts: 4, correct: 4 }; });
    scores['7x8'] = { attempts: 4, correct: 0 };
    let has78 = 0;
    const rng = seeded(31);
    for (let r = 0; r < 60; r++) {
      const round = E.makeFluencyRound(pool, scores, rng, 10, true);
      const keys = round.map((it) => Math.min(it.a, it.b) + 'x' + Math.max(it.a, it.b));
      expect(new Set(keys).size).toBe(10);
      keys.forEach((k) => expect(pool).toContain(k));
      round.filter((it) => it.mode === 'div').forEach((it) => expect([it.a, it.b]).toContain(it.divisor));
      if (keys.includes('7x8')) has78++;
    }
    expect(has78).toBeGreaterThan(40);
  });
});
