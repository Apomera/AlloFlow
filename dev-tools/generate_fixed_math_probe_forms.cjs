#!/usr/bin/env node
'use strict';
// Builds the version 2 fixed probe forms in psychometric_math_probes.json and
// its duplicate psychometric_math_probes.js (math review 3, 2026-10-20).
//
// Deterministic: a seeded generator fills each grade's blueprint, so a re-run
// reproduces the files byte for byte. tests/math_review3_probe_forms_equivalence.test.js
// checks the result independently (item correctness, no ties, answer repetition,
// cross-form overlap, answer digits per form, standards claims, JS = JSON).
//
// Every form in a grade follows the same slot sequence: slot i is the same item
// type (operation, digits, regrouping, trivial or not) on Forms A, B and C, so
// the forms are parallel by construction and carry the same answer digits.
// Items are drawn so that no item repeats inside a form, an item is reused
// across forms only when the grade's item pool is too small, and no answer
// value fills more than the cap below.
//
//   node dev-tools/generate_fixed_math_probe_forms.cjs          write both files
//   node dev-tools/generate_fixed_math_probe_forms.cjs --print  print the JSON text
//   node dev-tools/generate_fixed_math_probe_forms.cjs --check  exit 1 if either file differs

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'psychometric_math_probes.json');
const JS_PATH = path.join(ROOT, 'psychometric_math_probes.js');
const FORMS = ['A', 'B', 'C'];
const N = 25;
const SYMBOL = { add: '+', sub: '\u2212', mul: '\u00d7', div: '\u00f7' };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const range = (lo, hi) => { const out = []; for (let i = lo; i <= hi; i++) out.push(i); return out; };
const digits = (n) => String(Math.abs(n)).length;
function carries(a, b) {
  let c = 0, n = 0;
  while (a > 0 || b > 0) { const s = (a % 10) + (b % 10) + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); }
  return n;
}
function borrows(a, b) {
  let br = 0, n = 0;
  while (a > 0 || b > 0) { const d = (a % 10) - br - (b % 10); br = d < 0 ? 1 : 0; n += br; a = Math.floor(a / 10); b = Math.floor(b / 10); }
  return n;
}
const onesNonZero = (n) => n % 10 !== 0;

// ---- item builders -------------------------------------------------------
function comp(op, a, b) {
  const answer = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : a / b;
  return { a, b, op, symbol: SYMBOL[op], answer };
}
const compKey = (p) => p.op + ':' + p.a + ':' + p.b;
const compTwin = (p) => (p.op === 'add' || p.op === 'mul') ? p.op + ':' + Math.min(p.a, p.b) + ':' + Math.max(p.a, p.b) : compKey(p);
// Missing number: the unknown is the first ('a') or second ('b') operand.
function mn(op, pos, a, b) {
  const c = op === 'add' ? a + b : a - b;
  const sign = op === 'add' ? '+' : '-';
  const left = pos === 'a' ? '__' : String(a);
  const right = pos === 'b' ? '__' : String(b);
  return { display: left + ' ' + sign + ' ' + right + ' = ' + c, missingPos: pos, answer: pos === 'a' ? a : b };
}
const mnKey = (p) => p.display;
// Quantity discrimination: the pair is the item; which side the larger number
// sits on is decided later, per form.
const qdPair = (lo, hi) => ({ lo, hi });
const qdKey = (p) => p.lo + 'v' + p.hi;

function enumerate(fn, aRange, bRange) {
  const out = [];
  for (const a of aRange) for (const b of bRange) { const item = fn(a, b); if (item) out.push(item); }
  return out;
}
// Large pools are sampled (seeded, bounded) instead of enumerated.
function sample(rand, count, gen) {
  const out = [], seen = new Set();
  for (let tries = 0; out.length < count && tries < count * 400; tries++) {
    const item = gen(rand);
    if (!item) continue;
    const key = item.display || (item.lo !== undefined ? qdKey(item) : compKey(item));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  if (out.length < count) throw new Error('pool sampling fell short: ' + out.length + ' of ' + count);
  return out;
}
const pick = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// ---- blueprints ----------------------------------------------------------
// Each type: [name, countPerForm, poolBuilder(rand)]. Counts sum to 25.
function blueprints() {
  const C = {};
  C.K = {
    bank: 'MATH_PROBE_BANKS', grade: 'K', key: compKey, twin: null, groupOf: (p) => p.op, answerCap: 5,
    meta: { operation: 'mixed', difficulty: 'within5', timeLimit: 120, standards: ['K.OA.5'] },
    types: [
      ['add_nz', 8, () => enumerate((a, b) => a + b <= 5 ? comp('add', a, b) : null, range(1, 4), range(1, 4))],
      ['add_zero', 5, () => [...range(1, 5).map((b) => comp('add', 0, b)), ...range(1, 5).map((a) => comp('add', a, 0))]],
      ['sub_nz', 8, () => enumerate((a, b) => b < a ? comp('sub', a, b) : null, range(2, 5), range(1, 4))],
      ['sub_zero', 4, () => [...range(1, 5).map((a) => comp('sub', a, 0)), ...range(1, 5).map((a) => comp('sub', a, a))]]
    ]
  };
  C['1'] = {
    bank: 'MATH_PROBE_BANKS', grade: '1', key: compKey, twin: compTwin, groupOf: (p) => p.op, answerCap: 3,
    meta: { operation: 'mixed', difficulty: 'within20', timeLimit: 120, standards: ['1.OA.6'] },
    types: [
      ['add_bridge', 8, () => enumerate((a, b) => a + b >= 11 ? comp('add', a, b) : null, range(2, 9), range(2, 9))],
      ['add_teen', 5, () => enumerate((a, b) => (a % 10) + b <= 9 ? comp('add', a, b) : null, range(11, 18), range(1, 8))],
      ['sub_cross', 8, () => enumerate((a, b) => (a % 10) < b && a - b >= 2 && a - b <= 9 ? comp('sub', a, b) : null, range(11, 18), range(2, 9))],
      ['sub_teen', 4, () => enumerate((a, b) => b <= a % 10 ? comp('sub', a, b) : null, range(11, 19), range(1, 9))]
    ]
  };
  const two = (lo, hi) => (rand) => pick(rand, lo, hi);
  C['2'] = {
    bank: 'MATH_PROBE_BANKS', grade: '2', key: compKey, twin: compTwin, groupOf: (p) => p.op, answerCap: 3,
    meta: { operation: 'mixed', difficulty: 'within100', timeLimit: 120, standards: ['2.NBT.5'] },
    types: [
      ['add_noregroup', 6, (r) => sample(r, 300, (q) => { const a = two(11, 79)(q), b = two(11, 79)(q); return onesNonZero(a) && onesNonZero(b) && a + b <= 99 && carries(a, b) === 0 ? comp('add', a, b) : null; })],
      ['add_regroup', 7, (r) => sample(r, 300, (q) => { const a = two(11, 79)(q), b = two(11, 79)(q); return onesNonZero(a) && onesNonZero(b) && a + b <= 99 && carries(a, b) === 1 ? comp('add', a, b) : null; })],
      ['sub_noregroup', 6, (r) => sample(r, 300, (q) => { const a = two(21, 99)(q), b = two(11, 89)(q); return onesNonZero(b) && a - b >= 10 && borrows(a, b) === 0 ? comp('sub', a, b) : null; })],
      ['sub_regroup', 6, (r) => sample(r, 300, (q) => { const a = two(21, 99)(q), b = two(11, 89)(q); return onesNonZero(b) && a - b >= 10 && borrows(a, b) === 1 ? comp('sub', a, b) : null; })]
    ]
  };
  C['3'] = {
    bank: 'MATH_PROBE_BANKS', grade: '3', key: compKey, twin: compTwin, groupOf: (p) => p.op, answerCap: 3,
    meta: { operation: 'mixed', difficulty: 'facts', timeLimit: 120, standards: ['3.OA.7'] },
    types: [
      ['mul_low', 9, () => enumerate((a, b) => Math.min(a, b) <= 5 && a * b >= 10 ? comp('mul', a, b) : null, range(2, 9), range(2, 9))],
      ['mul_high', 4, () => enumerate((a, b) => comp('mul', a, b), range(6, 9), range(6, 9))],
      // Two-digit dividends only (no 6 / 3), so every division item is the same type.
      ['div_low', 6, () => enumerate((q, d) => q * d >= 10 ? comp('div', q * d, d) : null, range(2, 9), range(2, 5))],
      ['div_high', 6, () => enumerate((q, d) => comp('div', q * d, d), range(2, 9), range(6, 9))]
    ]
  };
  C['4'] = {
    bank: 'MATH_PROBE_BANKS', grade: '4', key: compKey, twin: compTwin, groupOf: (p) => p.op, answerCap: 3,
    meta: { operation: 'mixed', difficulty: 'multidigit', timeLimit: 120, standards: ['4.NBT.4', '4.NBT.5', '4.NBT.6'] },
    types: [
      ['add_3d_1', 4, (r) => sample(r, 300, (q) => { const a = pick(q, 101, 899), b = pick(q, 101, 899); return a + b <= 999 && carries(a, b) === 1 && onesNonZero(a) && onesNonZero(b) ? comp('add', a, b) : null; })],
      ['add_3d_2', 3, (r) => sample(r, 300, (q) => { const a = pick(q, 101, 899), b = pick(q, 101, 899); return a + b <= 999 && carries(a, b) === 2 ? comp('add', a, b) : null; })],
      ['sub_3d_1', 3, (r) => sample(r, 300, (q) => { const a = pick(q, 201, 999), b = pick(q, 101, 899); return a - b >= 100 && borrows(a, b) === 1 && onesNonZero(b) ? comp('sub', a, b) : null; })],
      ['sub_3d_2', 3, (r) => sample(r, 300, (q) => { const a = pick(q, 201, 999), b = pick(q, 101, 899); return a - b >= 100 && borrows(a, b) === 2 ? comp('sub', a, b) : null; })],
      ['mul_2x1', 3, (r) => sample(r, 200, (q) => { const a = pick(q, 13, 99), b = pick(q, 3, 9); return onesNonZero(a) && a * b >= 100 && a * b <= 999 ? comp('mul', a, b) : null; })],
      ['mul_3x1', 3, (r) => sample(r, 200, (q) => { const a = pick(q, 101, 333), b = pick(q, 2, 9); return onesNonZero(a) && a * b <= 999 ? comp('mul', a, b) : null; })],
      ['div_2d', 3, () => enumerate((d, quo) => d * quo <= 99 ? comp('div', d * quo, d) : null, range(3, 7), range(13, 33))],
      ['div_3d', 3, (r) => sample(r, 200, (q) => { const d = pick(q, 3, 9), quo = pick(q, 13, 99); const n = d * quo; return n >= 100 && n <= 999 ? comp('div', n, d) : null; })]
    ]
  };
  C['5'] = {
    bank: 'MATH_PROBE_BANKS', grade: '5', key: compKey, twin: compTwin, groupOf: (p) => p.op, answerCap: 3,
    meta: { operation: 'mixed', difficulty: 'advanced', timeLimit: 120, standards: ['4.NBT.4', '5.NBT.5', '5.NBT.6'] },
    types: [
      ['add_4p3_2', 4, (r) => sample(r, 300, (q) => { const a = pick(q, 1001, 8899), b = pick(q, 101, 999); return a + b <= 9999 && carries(a, b) === 2 && onesNonZero(b) ? comp('add', a, b) : null; })],
      ['add_4p3_3', 3, (r) => sample(r, 300, (q) => { const a = pick(q, 1001, 8899), b = pick(q, 101, 999); return a + b <= 9999 && carries(a, b) === 3 ? comp('add', a, b) : null; })],
      ['sub_4m3_2', 3, (r) => sample(r, 300, (q) => { const a = pick(q, 2001, 9999), b = pick(q, 101, 999); return a - b >= 1000 && borrows(a, b) === 2 && onesNonZero(b) ? comp('sub', a, b) : null; })],
      ['sub_4m3_3', 3, (r) => sample(r, 300, (q) => { const a = pick(q, 2001, 9999), b = pick(q, 101, 999); return a - b >= 1000 && borrows(a, b) === 3 ? comp('sub', a, b) : null; })],
      ['mul_2x2_3', 3, (r) => sample(r, 150, (q) => { const a = pick(q, 13, 49), b = pick(q, 13, 49); return onesNonZero(a) && onesNonZero(b) && a * b <= 999 ? comp('mul', a, b) : null; })],
      ['mul_2x2_4', 3, (r) => sample(r, 300, (q) => { const a = pick(q, 13, 99), b = pick(q, 13, 99); return onesNonZero(a) && onesNonZero(b) && a * b >= 1000 ? comp('mul', a, b) : null; })],
      ['div_3by2', 3, (r) => sample(r, 150, (q) => { const d = pick(q, 12, 99), quo = pick(q, 2, 9); const n = d * quo; return onesNonZero(d) && n >= 100 && n <= 999 ? comp('div', n, d) : null; })],
      ['div_4by2', 3, (r) => sample(r, 300, (q) => { const d = pick(q, 12, 99), quo = pick(q, 10, 99); const n = d * quo; return onesNonZero(d) && onesNonZero(quo) && n >= 1000 && n <= 9999 ? comp('div', n, d) : null; })]
    ]
  };

  const M = {};
  const mnAdd = (pos, filter) => enumerate((k, x) => { const a = pos === 'a' ? x : k, b = pos === 'a' ? k : x; return filter(a, b) ? mn('add', pos, a, b) : null; }, range(0, 99), range(0, 99));
  // Kindergarten: within 5 has only 30 non-trivial missing-number items, too
  // few for three 25-item forms, so the forms add the K.OA.4 make-ten items
  // (7 + __ = 10, 10 - __ = 3).
  M.K = {
    bank: 'MISSING_NUMBER_PROBES', grade: 'K', key: mnKey, twin: null, groupOf: (p) => /\+/.test(p.display) ? 'add' : 'sub', answerCap: 3,
    meta: { timeLimit: 120, standards: ['K.OA.4', 'K.OA.5'] },
    types: [
      ['add_b', 3, () => mnAdd('b', (a, b) => a >= 1 && b >= 1 && a + b <= 5)],
      ['add_a', 3, () => mnAdd('a', (a, b) => a >= 1 && b >= 1 && a + b <= 5)],
      ['add_ten_b', 3, () => mnAdd('b', (a, b) => a >= 1 && b >= 1 && a + b === 10)],
      ['add_ten_a', 3, () => mnAdd('a', (a, b) => a >= 1 && b >= 1 && a + b === 10)],
      ['add_zero_a', 2, () => mnAdd('a', (a, b) => (a === 0 || b === 0) && a + b >= 1 && a + b <= 5)],
      ['add_zero_b', 2, () => mnAdd('b', (a, b) => (a === 0 || b === 0) && a + b >= 1 && a + b <= 5)],
      ['sub_b', 4, () => enumerate((c, b) => b < c ? mn('sub', 'b', c, b) : null, range(2, 5), range(1, 4))],
      ['sub_ten', 3, () => range(1, 9).map((b) => mn('sub', 'b', 10, b))],
      ['sub_zero', 2, () => [...range(1, 5).map((c) => mn('sub', 'b', c, 0)), ...range(1, 5).map((c) => mn('sub', 'b', c, c))]]
    ]
  };
  M['1'] = {
    bank: 'MISSING_NUMBER_PROBES', grade: '1', key: mnKey, twin: null, groupOf: (p) => /\+/.test(p.display) ? 'add' : 'sub', answerCap: 3,
    meta: { timeLimit: 120, standards: ['1.OA.8'] },
    types: [
      ['add_b_bridge', 6, () => mnAdd('b', (a, b) => a >= 2 && a <= 9 && b >= 2 && b <= 9 && a + b >= 11)],
      ['add_a_bridge', 6, () => mnAdd('a', (a, b) => a >= 2 && a <= 9 && b >= 2 && b <= 9 && a + b >= 11)],
      ['add_b_teen', 3, () => mnAdd('b', (a, b) => a >= 11 && a <= 18 && b >= 1 && (a % 10) + b <= 9)],
      ['sub_b_cross', 6, () => enumerate((c, b) => (c % 10) < b && c - b >= 2 && c - b <= 9 ? mn('sub', 'b', c, b) : null, range(11, 18), range(2, 9))],
      ['sub_a_cross', 4, () => enumerate((c, b) => (c % 10) < b && c - b >= 2 && c - b <= 9 ? mn('sub', 'a', c, b) : null, range(11, 18), range(2, 9))]
    ]
  };
  const mn2 = (op, pos, regroup) => (r) => sample(r, 300, (q) => {
    if (op === 'add') {
      const a = pick(q, 11, 79), b = pick(q, 11, 79);
      if (!onesNonZero(a) || !onesNonZero(b) || a + b > 99 || carries(a, b) !== regroup) return null;
      return mn('add', pos, a, b);
    }
    const b = pick(q, 11, 79), d = pick(q, 11, 79), c = b + d;
    if (!onesNonZero(b) || !onesNonZero(d) || c > 99 || borrows(c, b) !== regroup) return null;
    return mn('sub', pos, c, b);
  });
  M['2'] = {
    bank: 'MISSING_NUMBER_PROBES', grade: '2', key: mnKey, twin: null, groupOf: (p) => /\+/.test(p.display) ? 'add' : 'sub', answerCap: 3,
    meta: { timeLimit: 120, standards: ['2.NBT.5'] },
    types: [
      ['add_b_0', 3, mn2('add', 'b', 0)], ['add_b_1', 4, mn2('add', 'b', 1)],
      ['add_a_0', 3, mn2('add', 'a', 0)], ['add_a_1', 3, mn2('add', 'a', 1)],
      ['sub_b_0', 3, mn2('sub', 'b', 0)], ['sub_b_1', 3, mn2('sub', 'b', 1)],
      ['sub_a_0', 3, mn2('sub', 'a', 0)], ['sub_a_1', 3, mn2('sub', 'a', 1)]
    ]
  };

  const Q = {};
  const qdBand = (lo, hi, dLo, dHi) => () => enumerate((a, b) => a < b && b - a >= dLo && b - a <= dHi ? qdPair(a, b) : null, range(lo, hi), range(lo, hi));
  Q.K = {
    bank: 'QUANTITY_DISCRIMINATION_PROBES', grade: 'K', key: qdKey, twin: null, groupOf: null, answerCap: 4,
    meta: { timeLimit: 60, standards: ['K.CC.7'] },
    types: [['near', 9, qdBand(1, 10, 1, 2)], ['mid', 10, qdBand(1, 10, 3, 5)], ['far', 6, qdBand(1, 10, 6, 9)]]
  };
  const tens = (n) => Math.floor(n / 10), ones = (n) => n % 10;
  Q['1'] = {
    bank: 'QUANTITY_DISCRIMINATION_PROBES', grade: '1', key: qdKey, twin: null, groupOf: null, answerCap: 3,
    meta: { timeLimit: 60, standards: ['1.NBT.3'] },
    types: [
      ['same_tens', 8, () => enumerate((a, b) => a < b && tens(a) === tens(b) ? qdPair(a, b) : null, range(10, 99), range(10, 99))],
      ['reversed', 7, () => enumerate((a, b) => a < b && ones(a) !== 0 && tens(a) === ones(b) && ones(a) === tens(b) ? qdPair(a, b) : null, range(10, 99), range(10, 99))],
      ['far_tens', 10, () => enumerate((a, b) => a < b && tens(b) - tens(a) >= 2 && !(tens(a) === ones(b) && ones(a) === tens(b)) ? qdPair(a, b) : null, range(10, 99), range(10, 99))]
    ]
  };
  return [C.K, C['1'], C['2'], C['3'], C['4'], C['5'], M.K, M['1'], M['2'], Q.K, Q['1']];
}

// ---- assembly ------------------------------------------------------------
// Slot order shared by the grade's three forms. Items of one group (the
// operation; for quantity discrimination the type) are spread out: never two
// of a type in a row, the same group as far apart as its count allows (every
// other item with two operations, one in three with four), and never more
// than two of a group in a row.
function slotSequence(bp, rand) {
  const remaining = {};
  bp.types.forEach(([name, count]) => { remaining[name] = count; });
  const total = Object.values(remaining).reduce((s, n) => s + n, 0);
  if (total !== N) throw new Error(bp.bank + ' ' + bp.grade + ': blueprint has ' + total + ' slots');
  const groupOf = bp.groupOf ? (name) => name.split('_')[0] : (name) => name;
  const groupCounts = {};
  Object.keys(remaining).forEach((n) => { groupCounts[groupOf(n)] = (groupCounts[groupOf(n)] || 0) + remaining[n]; });
  const maxGroup = Math.max(...Object.values(groupCounts));
  const groups = Object.keys(groupCounts).length;
  const gap = groups >= 3 && maxGroup <= Math.ceil(N / 3) ? 3 : groups >= 2 && maxGroup <= Math.ceil(N / 2) ? 2 : 1;
  const seq = [];
  let steps = 0;
  // Prune: every group must still fit in the slots left at its spacing.
  function feasible() {
    const left = {};
    Object.keys(remaining).forEach((n) => { left[groupOf(n)] = (left[groupOf(n)] || 0) + remaining[n]; });
    const allLeft = Object.values(left).reduce((s, n) => s + n, 0);
    return Object.keys(left).every((g) => {
      if (!left[g]) return true;
      if (left[g] > 2 * (allLeft - left[g] + 1)) return false;
      let last = -Infinity;
      for (let i = seq.length - 1; i >= 0 && i >= seq.length - gap; i--) if (groupOf(seq[i]) === g) { last = i; break; }
      const first = Math.max(seq.length, last + gap);
      return first <= N - 1 && Math.floor((N - 1 - first) / gap) + 1 >= left[g];
    });
  }
  function place() {
    if (seq.length === N) return true;
    if (++steps > 200000 || !feasible()) return false;
    const names = Object.keys(remaining).filter((n) => remaining[n] > 0);
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    for (const name of names) {
      const i = seq.length, g = groupOf(name);
      if (i > 0 && seq[i - 1] === name) continue;
      let clash = false;
      for (let back = 1; back < gap && i - back >= 0; back++) if (groupOf(seq[i - back]) === g) clash = true;
      if (clash) continue;
      if (i >= 2 && groupOf(seq[i - 1]) === g && groupOf(seq[i - 2]) === g) continue;
      seq.push(name); remaining[name]--;
      if (place()) return true;
      seq.pop(); remaining[name]++;
    }
    return false;
  }
  if (!place()) throw new Error(bp.bank + ' ' + bp.grade + ': no slot order satisfies the spacing rule');
  return seq;
}

function buildGrade(bp, seed) {
  const rand = mulberry32(seed);
  const pools = {};
  bp.types.forEach(([name, , build]) => { pools[name] = build(rand); });
  const seq = slotSequence(bp, rand);
  const forms = {}; FORMS.forEach((f) => { forms[f] = { items: [], keys: new Set(), twins: new Set(), answers: {} }; });
  const usage = new Map();
  const pairCount = { AB: 0, AC: 0, BC: 0 };
  const pairOf = (f, g) => [f, g].sort().join('');
  const answerOf = (item) => item.lo !== undefined ? item.hi : item.answer;
  // Fill the most answer-constrained slots first (types whose pool has the
  // fewest distinct answers), so the answer cap does not run them dry.
  const spread = (name) => new Set(pools[name].map(answerOf)).size;
  const fillOrder = seq.map((type, s) => s).sort((x, y) => spread(seq[x]) - spread(seq[y]) || x - y);
  for (const s of fillOrder) {
    const type = seq[s];
    for (const f of FORMS) {
      const st = forms[f];
      const others = FORMS.filter((g) => g !== f && forms[g].items[s]).map((g) => forms[g].items[s]);
      const atPosition = new Set(others.map(bp.key));
      const twinAtPosition = new Set(bp.twin ? others.map(bp.twin) : []);
      const candidates = pools[type].filter((item) => {
        const k = bp.key(item);
        if (st.keys.has(k) || atPosition.has(k)) return false;
        if (bp.twin && twinAtPosition.has(bp.twin(item))) return false;
        if (bp.twin && st.twins.has(bp.twin(item))) return false;
        return (st.answers[answerOf(item)] || 0) < bp.answerCap;
      });
      if (!candidates.length) return null;
      let best = [], bestScore = Infinity;
      for (const item of candidates) {
        const used = usage.get(bp.key(item)) || [];
        // Fewest forms already using it, then the least-shared form pair,
        // then (computation, grades 1-5) its commutative twin unused elsewhere.
        let score = used.length * 1000 + used.reduce((sum, g) => sum + pairCount[pairOf(f, g)], 0) * 10;
        if (bp.twin) score += FORMS.filter((g) => g !== f && forms[g].twins.has(bp.twin(item))).length;
        if (score < bestScore) { bestScore = score; best = [item]; } else if (score === bestScore) best.push(item);
      }
      const item = best[Math.floor(rand() * best.length)];
      const k = bp.key(item);
      (usage.get(k) || []).forEach((g) => { pairCount[pairOf(f, g)]++; });
      usage.set(k, [...(usage.get(k) || []), f]);
      st.keys.add(k);
      if (bp.twin) st.twins.add(bp.twin(item));
      st.answers[answerOf(item)] = (st.answers[answerOf(item)] || 0) + 1;
      st.items[s] = item;
    }
  }
  if (bp.bank === 'QUANTITY_DISCRIMINATION_PROBES') {
    // The larger number sits on the left for 12 items and on the right for 13,
    // in a different order on each form.
    FORMS.forEach((f) => {
      const sides = [...Array(12).fill('left'), ...Array(13).fill('right')];
      for (let i = sides.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sides[i], sides[j]] = [sides[j], sides[i]]; }
      forms[f].items = forms[f].items.map((p, i) => sides[i] === 'left' ? { left: p.hi, right: p.lo, answer: p.hi } : { left: p.lo, right: p.hi, answer: p.hi });
    });
  }
  const out = {};
  FORMS.forEach((f) => { out[f] = Object.assign({ version: 2 }, bp.meta, { problems: forms[f].items }); });
  return { forms: out, pairCount };
}

// Overlap a grade cannot avoid: per item type, the fewest repeats needed to
// fill 3 forms from a pool of P distinct items.
function overlapFloor(bp, seedRand) {
  let total = 0;
  bp.types.forEach(([, k, build]) => {
    const P = build(seedRand).length, slots = 3 * k;
    if (slots <= P) return;
    const q = Math.floor(slots / P), rem = slots - q * P;
    total += rem * (q + 1) * q / 2 + (P - rem) * q * (q - 1) / 2;
  });
  return Math.ceil(total / 3);
}

function build() {
  const banks = { MATH_PROBE_BANKS: {}, MISSING_NUMBER_PROBES: {}, QUANTITY_DISCRIMINATION_PROBES: {} };
  const report = [];
  blueprints().forEach((bp, index) => {
    const floor = overlapFloor(bp, mulberry32(1));
    const target = Math.max(5, floor + 1);
    // Keep the seed with the least overlap (worst pair, then total); stop early
    // once a seed reaches the floor (or no overlap at all).
    let best = null;
    for (let seed = 1000 * (index + 1); seed < 1000 * (index + 1) + 500; seed++) {
      const built = buildGrade(bp, seed);
      if (!built) continue;
      const pc = built.pairCount;
      const worst = Math.max(pc.AB, pc.AC, pc.BC), total = pc.AB + pc.AC + pc.BC;
      if (worst > target) continue;
      if (!best || worst < best.worst || (worst === best.worst && total < best.total)) best = { seed, built, worst, total };
      if (worst <= floor) break;
    }
    if (!best) throw new Error(bp.bank + ' ' + bp.grade + ': no seed met the overlap target ' + target);
    banks[bp.bank][bp.grade] = best.built.forms;
    report.push(bp.bank + ' ' + bp.grade + ' seed ' + best.seed + ' overlap ' + JSON.stringify(best.built.pairCount) + ' floor ' + floor + ' cap ' + target);
  });
  // Same key order as the shipped file: grades 1..5 then K.
  const ordered = {};
  Object.keys(banks).forEach((name) => {
    ordered[name] = {};
    Object.keys(banks[name]).sort((x, y) => (x === 'K' ? 99 : Number(x)) - (y === 'K' ? 99 : Number(y))).forEach((g) => { ordered[name][g] = banks[name][g]; });
  });
  return { data: ordered, report };
}

function jsonText(data) { return JSON.stringify(data, null, 2); }
function jsText(data) {
  const lines = [
    '// psychometric_math_probes.js',
    '// Duplicate of psychometric_math_probes.json, the file the app actually loads',
    '// (AlloFlowANTI.txt fetches the JSON). Both are written by',
    '// dev-tools/generate_fixed_math_probe_forms.cjs; do not edit either by hand.',
    '// tests/math_review3_probe_forms_equivalence.test.js fails if they drift.',
    '// Version 2 fixed forms A/B/C (2026-10-20): parallel slot blueprints per grade,',
    '// standards claims in each form\'s `standards` field.',
    '(function (data) {',
    '  window.MATH_PROBE_BANKS = data.MATH_PROBE_BANKS;',
    '  window.MISSING_NUMBER_PROBES = data.MISSING_NUMBER_PROBES;',
    '  window.QUANTITY_DISCRIMINATION_PROBES = data.QUANTITY_DISCRIMINATION_PROBES;',
    '})(' + jsonText(data) + ');',
    ''
  ];
  return lines.join('\n').replace(/\n/g, '\r\n');
}

if (require.main === module) {
  const { data, report } = build();
  const json = jsonText(data), js = jsText(data);
  if (process.argv.includes('--print')) { process.stdout.write(json); process.exit(0); }
  if (process.argv.includes('--check')) {
    const ok = fs.readFileSync(JSON_PATH, 'utf8') === json && fs.readFileSync(JS_PATH, 'utf8') === js;
    console.log(ok ? 'probe forms match the generator' : 'probe forms differ from the generator output');
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(JSON_PATH, json);
  fs.writeFileSync(JS_PATH, js);
  report.forEach((line) => console.log(line));
}

module.exports = { build, jsonText, jsText, blueprints, buildGrade, overlapFloor, mulberry32 };
