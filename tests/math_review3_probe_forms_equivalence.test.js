// Math review 3 (2026-10-20): the fixed probe forms A/B/C in
// psychometric_math_probes.json must be correct, unambiguous and equivalent
// within each grade, and claim only the standards their items assess.
//
// The version 1 forms failed this in many ways: Missing Number grade 2 had 71
// of 75 answers equal to 27, Quantity Discrimination K Form A item 5 was a tie
// (4 vs 4), grade 5 Forms B/C had 9-10 answers equal to 165, the K forms shared
// 17-20 of 25 items, answer digits differed within a grade (grade 4: 56/58/61)
// and the standards notes claimed content the items did not have (grade 2 x
// facts under addition standards, 2-digit items and x11/x12 facts under 4.NBT,
// 5.NBT.7 decimals with no decimals).
//
// Every rule here is computed from the bank itself and this file's own
// standards definitions; nothing is read from the generator except in the
// last check, which only confirms the files are its exact output.
//
// Overlap and repetition caps: 20% shared items between two forms and 15% of a
// form on one answer, unless the grade's item pool makes that impossible. Then
// the cap is the least any form set with this blueprint could reach (+1 shared
// item), worked out below from the pool, so a small domain (kindergarten
// facts within 5 has 42 facts in all) is held to the best it allows, not
// excused.
//
// Mutation check: point MATH_PROBES_JSON / MATH_PROBES_JS at a copy (for
// example the version 1 bank) and this file goes red.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const JSON_PATH = resolve(ROOT, process.env.MATH_PROBES_JSON || 'psychometric_math_probes.json');
const JS_PATH = resolve(ROOT, process.env.MATH_PROBES_JS || 'psychometric_math_probes.js');
const jsonText = readFileSync(JSON_PATH, 'utf8');
const data = JSON.parse(jsonText);

const FORMS = ['A', 'B', 'C'];
const SHAPE = {
  MATH_PROBE_BANKS: { grades: ['1', '2', '3', '4', '5', 'K'], timeLimit: 120, items: 25 },
  MISSING_NUMBER_PROBES: { grades: ['1', '2', 'K'], timeLimit: 120, items: 25 },
  QUANTITY_DISCRIMINATION_PROBES: { grades: ['1', 'K'], timeLimit: 60, items: 25 }
};
const SYMBOL = { add: '+', sub: '\u2212', mul: '\u00d7', div: '\u00f7' };
const MAX_SHARED = 0.20;
const MAX_ONE_ANSWER = 0.15;
const DIGIT_BAND = 0.02;
const MAX_TRIVIAL = 0.40;

// ---- item reading ---------------------------------------------------------
const keysOf = (o) => Object.keys(o).sort().join(',');
function readComputation(p) {
  if (!p || keysOf(p) !== 'a,answer,b,op,symbol') return { error: 'fields are not {a,b,op,symbol,answer}' };
  if (!SYMBOL[p.op] || p.symbol !== SYMBOL[p.op]) return { error: 'symbol does not match op' };
  if (![p.a, p.b, p.answer].every((n) => Number.isSafeInteger(n) && n >= 0)) return { error: 'not whole numbers' };
  const value = p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : p.b ? p.a / p.b : NaN;
  if (value !== p.answer) return { error: 'answer is wrong' };
  return { op: p.op, pos: 'result', a: p.a, b: p.b, c: p.answer, answer: p.answer, key: p.op + ':' + p.a + ':' + p.b,
    twin: (p.op === 'add' || p.op === 'mul') ? p.op + ':' + Math.min(p.a, p.b) + ':' + Math.max(p.a, p.b) : p.op + ':' + p.a + ':' + p.b };
}
function readMissing(p) {
  if (!p || keysOf(p) !== 'answer,display,missingPos') return { error: 'fields are not {display,missingPos,answer}' };
  const m = /^(__|\d+) ([+-]) (__|\d+) = (__|\d+)$/.exec(String(p.display));
  if (!m) return { error: 'display is not "x + y = z" with one blank' };
  if ([m[1], m[3], m[4]].filter((t) => t === '__').length !== 1) return { error: 'needs exactly one blank' };
  const pos = m[1] === '__' ? 'a' : m[3] === '__' ? 'b' : 'result';
  const op = m[2] === '+' ? 'add' : 'sub';
  const num = (t) => (t === '__' ? null : Number(t));
  let a = num(m[1]), b = num(m[3]), c = num(m[4]);
  if (pos === 'a') a = op === 'add' ? c - b : c + b;
  else if (pos === 'b') b = op === 'add' ? c - a : a - c;
  else c = op === 'add' ? a + b : a - b;
  if (![a, b, c].every((n) => Number.isSafeInteger(n) && n >= 0)) return { error: 'blank has no whole-number value' };
  const value = pos === 'a' ? a : pos === 'b' ? b : c;
  if (p.missingPos !== pos) return { error: 'missingPos does not name the blank' };
  if (p.answer !== value) return { error: 'answer is not the blank value ' + value };
  return { op, pos, a, b, c, answer: value, key: p.display, twin: p.display };
}
function readQd(p) {
  if (!p || keysOf(p) !== 'answer,left,right') return { error: 'fields are not {left,right,answer}' };
  if (![p.left, p.right].every((n) => Number.isSafeInteger(n) && n >= 0)) return { error: 'not whole numbers' };
  if (p.left === p.right) return { error: 'tie: both numbers are ' + p.left };
  const lo = Math.min(p.left, p.right), hi = Math.max(p.left, p.right);
  if (p.answer !== hi) return { error: 'answer is not the larger number' };
  // 3 vs 7 and 7 vs 3 are one comparison: one item.
  return { lo, hi, answer: hi, leftLarger: p.left > p.right, key: lo + 'v' + hi, twin: lo + 'v' + hi };
}
const READ = { MATH_PROBE_BANKS: readComputation, MISSING_NUMBER_PROBES: readMissing, QUANTITY_DISCRIMINATION_PROBES: readQd };

// ---- item type (the blueprint slot an item fills) ------------------------
const dig = (n) => String(n).length;
function carries(a, b) { let c = 0, n = 0; while (a > 0 || b > 0) { const s = (a % 10) + (b % 10) + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
function borrows(a, b) { let r = 0, n = 0; while (a > 0 || b > 0) { const d = (a % 10) - r - (b % 10); r = d < 0 ? 1 : 0; n += r; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
function trivial(it) {
  if (it.lo !== undefined) return false;
  return [it.a, it.b, it.c].includes(0) || ((it.op === 'mul' || it.op === 'div') && (it.a === 1 || it.b === 1));
}
function typeOf(it) {
  if (it.lo !== undefined) {
    const t = (n) => Math.floor(n / 10), o = (n) => n % 10, d = it.hi - it.lo;
    if (it.hi <= 10) return 'small ' + (d <= 2 ? 'near' : d <= 5 ? 'mid' : 'far');
    if (it.lo >= 10) return t(it.lo) === t(it.hi) ? 'same tens' : (t(it.lo) === o(it.hi) && o(it.lo) === t(it.hi)) ? 'reversed digits' : t(it.hi) - t(it.lo) === 1 ? 'next tens' : 'far tens';
    return 'mixed digits';
  }
  const regroup = it.op === 'add' ? carries(it.a, it.b) : it.op === 'sub' ? borrows(it.a, it.b) : 0;
  return [it.op, 'blank:' + it.pos, dig(it.a), dig(it.b), dig(it.c), 'regroup:' + regroup, trivial(it) ? 'trivial' : ''].join('|');
}

// ---- standards: what an item must look like to be claimed under a code ----
const facts = (n) => n <= 12; // 10, 11 and 12 times tables count as facts, not multi-digit work
const STANDARDS = {
  'K.CC.7': (it) => it.lo !== undefined && it.lo >= 1 && it.hi <= 10,
  'K.OA.4': (it) => it.pos !== 'result' && ((it.op === 'add' && it.c === 10 && it.a >= 1 && it.b >= 1) || (it.op === 'sub' && it.a === 10 && it.pos === 'b' && it.b >= 1 && it.c >= 1)),
  'K.OA.5': (it) => (it.op === 'add' || it.op === 'sub') && Math.max(it.a, it.b, it.c) <= 5,
  '1.NBT.3': (it) => it.lo !== undefined && it.lo >= 10 && it.hi <= 99,
  '1.OA.6': (it) => it.pos === 'result' && (it.op === 'add' || it.op === 'sub') && Math.max(it.a, it.b, it.c) <= 20,
  '1.OA.8': (it) => it.pos !== 'result' && (it.op === 'add' || it.op === 'sub') && Math.max(it.a, it.b, it.c) <= 20,
  '2.NBT.5': (it) => (it.op === 'add' || it.op === 'sub') && Math.max(it.a, it.b, it.c) <= 100,
  '3.OA.7': (it) => it.pos === 'result' && ((it.op === 'mul' && it.a <= 10 && it.b <= 10) || (it.op === 'div' && it.b >= 1 && it.b <= 10 && it.c <= 10)),
  '4.NBT.4': (it) => it.pos === 'result' && (it.op === 'add' || it.op === 'sub') && Math.max(it.a, it.b) >= 100 && Math.max(it.a, it.b, it.c) < 1000000,
  '4.NBT.5': (it) => it.pos === 'result' && it.op === 'mul' && ((Math.min(it.a, it.b) >= 2 && Math.min(it.a, it.b) <= 9 && !facts(Math.max(it.a, it.b)) && Math.max(it.a, it.b) <= 9999)
    || (it.a >= 10 && it.a <= 99 && it.b >= 10 && it.b <= 99 && !facts(it.a) && !facts(it.b))),
  '4.NBT.6': (it) => it.pos === 'result' && it.op === 'div' && it.b >= 2 && it.b <= 9 && it.a <= 9999 && !facts(it.c),
  '5.NBT.5': (it) => it.pos === 'result' && it.op === 'mul' && it.a >= 10 && it.b >= 10 && !facts(it.a) && !facts(it.b),
  '5.NBT.6': (it) => it.pos === 'result' && it.op === 'div' && it.b >= 10 && it.b <= 99 && it.a <= 9999 && it.c >= 2,
  // Decimals: no whole-number item can satisfy it, so claiming it fails.
  '5.NBT.7': () => false
};

// ---- the pool a grade's items come from (for small domains) ---------------
// Every item the grade's claimed standards allow, enumerated when the numbers
// stay at or below 100. Larger domains are treated as unlimited, which only
// makes the caps stricter.
function enumeratePool(bankName, claims) {
  const ok = (it) => claims.some((code) => STANDARDS[code] && STANDARDS[code](it));
  const out = [];
  if (bankName === 'QUANTITY_DISCRIMINATION_PROBES') {
    for (let lo = 0; lo <= 100; lo++) for (let hi = lo + 1; hi <= 100; hi++) { const it = { lo, hi, answer: hi, key: lo + 'v' + hi, twin: lo + 'v' + hi }; if (ok(it)) out.push(it); }
    return out;
  }
  for (let a = 0; a <= 100; a++) for (let b = 0; b <= 100; b++) {
    if (bankName === 'MATH_PROBE_BANKS') {
      for (const op of ['add', 'sub', 'mul', 'div']) {
        const c = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : b ? a / b : NaN;
        if (!Number.isSafeInteger(c) || c < 0) continue;
        const it = readComputation({ a, b, op, symbol: SYMBOL[op], answer: c });
        if (ok(it)) out.push(it);
      }
    } else {
      for (const op of ['add', 'sub']) {
        const c = op === 'add' ? a + b : a - b;
        if (c < 0) continue;
        for (const pos of ['a', 'b']) {
          const sign = op === 'add' ? '+' : '-';
          const display = (pos === 'a' ? '__' : a) + ' ' + sign + ' ' + (pos === 'b' ? '__' : b) + ' = ' + c;
          const it = readMissing({ display, missingPos: pos, answer: pos === 'a' ? a : b });
          if (ok(it)) out.push(it);
        }
      }
    }
  }
  return out;
}

// Fewest shared pairs needed to fill three forms with k distinct items each
// from a pool of P: spread the 3k uses as evenly as possible.
function forcedPairs(k, P) {
  const uses = 3 * k;
  if (uses <= P) return 0;
  const q = Math.floor(uses / P), rem = uses - q * P;
  return rem * (q + 1) * q / 2 + (P - rem) * q * (q - 1) / 2;
}
function maxFlow(cap, s, t) {
  const res = cap.map((row) => row.slice());
  let flow = 0;
  for (;;) {
    const prev = new Array(res.length).fill(-1); prev[s] = s;
    const queue = [s];
    while (queue.length && prev[t] === -1) { const u = queue.shift(); for (let v = 0; v < res.length; v++) if (prev[v] === -1 && res[u][v] > 0) { prev[v] = u; queue.push(v); } }
    if (prev[t] === -1) return flow;
    let f = Infinity;
    for (let v = t; v !== s; v = prev[v]) f = Math.min(f, res[prev[v]][v]);
    for (let v = t; v !== s; v = prev[v]) { res[prev[v]][v] -= f; res[v][prev[v]] += f; }
    flow += f;
  }
}
// Smallest per-answer cap a form with this type mix could meet at all.
function leastAnswerCap(typeCounts, pool, uniqueKey, n) {
  const types = Object.keys(typeCounts);
  const byTypeAnswer = {};
  pool.forEach((it) => {
    const t = typeOf(it);
    if (!typeCounts[t]) return;
    (byTypeAnswer[t] = byTypeAnswer[t] || {})[it.answer] = (byTypeAnswer[t][it.answer] || new Set()).add(uniqueKey(it));
  });
  const answers = [...new Set(types.flatMap((t) => Object.keys(byTypeAnswer[t] || {})))];
  const size = 2 + types.length + answers.length, sink = size - 1;
  for (let c = 1; c <= n; c++) {
    const cap = Array.from({ length: size }, () => new Array(size).fill(0));
    types.forEach((t, i) => {
      cap[0][1 + i] = typeCounts[t];
      answers.forEach((v, j) => { cap[1 + i][1 + types.length + j] = byTypeAnswer[t] && byTypeAnswer[t][v] ? byTypeAnswer[t][v].size : 0; });
    });
    answers.forEach((v, j) => { cap[1 + types.length + j][sink] = c; });
    if (maxFlow(cap, 0, sink) >= n) return c;
  }
  return Infinity;
}

// ---- per grade -------------------------------------------------------------
const GRADES = [];
Object.keys(SHAPE).forEach((bankName) => SHAPE[bankName].grades.forEach((grade) => GRADES.push([bankName, grade])));

function readGrade(bankName, grade) {
  const forms = {}, errors = [];
  FORMS.forEach((f) => {
    const form = data[bankName] && data[bankName][grade] && data[bankName][grade][f];
    const problems = form && Array.isArray(form.problems) ? form.problems : [];
    forms[f] = problems.map((p, i) => {
      const it = READ[bankName](p);
      if (it.error) errors.push(bankName + ' ' + grade + f + ' item ' + (i + 1) + ' ' + JSON.stringify(p) + ': ' + it.error);
      return it;
    });
  });
  return { forms, errors };
}
const kComputation = (bankName, grade) => bankName === 'MATH_PROBE_BANKS' && grade === 'K';

describe('fixed probe forms: shape and versions', () => {
  it('keeps every bank, grade, form, item count and time limit, and stamps version 2', () => {
    const problems = [];
    Object.keys(SHAPE).forEach((bankName) => {
      expect(Object.keys(data[bankName] || {}).sort(), bankName + ' grades').toEqual(SHAPE[bankName].grades.slice().sort());
      SHAPE[bankName].grades.forEach((grade) => {
        expect(Object.keys(data[bankName][grade]).sort(), bankName + ' ' + grade + ' forms').toEqual(FORMS);
        FORMS.forEach((f) => {
          const form = data[bankName][grade][f];
          if (form.version !== 2) problems.push(bankName + ' ' + grade + f + ' version ' + form.version);
          if (form.timeLimit !== SHAPE[bankName].timeLimit) problems.push(bankName + ' ' + grade + f + ' timeLimit ' + form.timeLimit);
          if (!Array.isArray(form.problems) || form.problems.length !== SHAPE[bankName].items) problems.push(bankName + ' ' + grade + f + ' item count');
          if (bankName === 'MATH_PROBE_BANKS' && (form.operation !== 'mixed' || typeof form.difficulty !== 'string')) problems.push(bankName + ' ' + grade + f + ' operation/difficulty');
        });
      });
    });
    expect(problems).toEqual([]);
  });
});

describe.each(GRADES)('%s grade %s', (bankName, grade) => {
  const { forms, errors } = readGrade(bankName, grade);
  const n = SHAPE[bankName].items;
  const claimsOf = (f) => (data[bankName][grade][f] && data[bankName][grade][f].standards) || [];

  it('every item is correct and unambiguous (one blank, a whole-number answer, no ties)', () => {
    expect(errors).toEqual([]);
  });

  it('no item repeats inside a form (nor its commutative twin, grades 1-5 computation)', () => {
    const repeats = [];
    FORMS.forEach((f) => {
      const seen = new Set();
      forms[f].forEach((it, i) => {
        const k = kComputation(bankName, grade) ? it.key : it.twin;
        if (seen.has(k)) repeats.push(grade + f + ' item ' + (i + 1) + ' ' + k);
        seen.add(k);
      });
    });
    expect(repeats).toEqual([]);
  });

  it('claims standards its items actually assess, the same on every form', () => {
    const problems = [];
    const claims = claimsOf('A');
    if (!Array.isArray(claims) || !claims.length) problems.push('Form A claims no standards');
    FORMS.forEach((f) => {
      const own = claimsOf(f);
      if (JSON.stringify(own) !== JSON.stringify(claims)) problems.push(grade + f + ' claims ' + JSON.stringify(own) + ', Form A ' + JSON.stringify(claims));
      own.forEach((code) => {
        if (!STANDARDS[code]) problems.push(grade + f + ' claims unknown code ' + code);
        else if (!forms[f].some((it) => !it.error && STANDARDS[code](it))) problems.push(grade + f + ' claims ' + code + ' but no item assesses it');
      });
      forms[f].forEach((it, i) => {
        if (it.error) return;
        if (!own.some((code) => STANDARDS[code] && STANDARDS[code](it))) problems.push(grade + f + ' item ' + (i + 1) + ' (' + it.key + ') fits none of ' + JSON.stringify(own));
      });
    });
    expect(problems).toEqual([]);
  });

  it('forms are parallel: the same item types in the same numbers, and the same answer digits', () => {
    const problems = [];
    const mix = (f) => { const m = {}; forms[f].forEach((it) => { if (!it.error) { const t = typeOf(it); m[t] = (m[t] || 0) + 1; } }); return m; };
    const sorted = (m) => JSON.stringify(Object.keys(m).sort().map((k) => [k, m[k]]));
    FORMS.slice(1).forEach((f) => { if (sorted(mix(f)) !== sorted(mix('A'))) problems.push(grade + f + ' item types differ from Form A: ' + sorted(mix(f)) + ' vs ' + sorted(mix('A'))); });
    const digitsOf = (f) => forms[f].reduce((s, it) => s + (it.error ? 0 : dig(it.answer)), 0);
    const mean = FORMS.reduce((s, f) => s + digitsOf(f), 0) / FORMS.length;
    FORMS.forEach((f) => { if (Math.abs(digitsOf(f) - mean) > DIGIT_BAND * mean) problems.push(grade + f + ' answer digits ' + digitsOf(f) + ' vs grade mean ' + mean.toFixed(1)); });
    FORMS.forEach((f) => {
      const t = forms[f].filter((it) => !it.error && trivial(it)).length;
      if (t > MAX_TRIVIAL * n) problems.push(grade + f + ' has ' + t + ' items with a 0 or 1 operand');
    });
    if (bankName === 'QUANTITY_DISCRIMINATION_PROBES') {
      const left = (f) => forms[f].filter((it) => it.leftLarger).length;
      FORMS.forEach((f) => { if (Math.abs(left(f) - n / 2) > 1.5) problems.push(grade + f + ' larger number on the left ' + left(f) + ' of ' + n); });
      if (Math.max(...FORMS.map(left)) - Math.min(...FORMS.map(left)) > 1) problems.push(grade + ' left/right balance differs across forms');
    }
    expect(problems).toEqual([]);
  });

  it('no answer value fills more than 15% of a form (or the least the item pool allows)', () => {
    const claims = claimsOf('A');
    const typeCounts = {};
    forms.A.forEach((it) => { if (!it.error) { const t = typeOf(it); typeCounts[t] = (typeCounts[t] || 0) + 1; } });
    const enumerable = FORMS.every((f) => forms[f].every((it) => !it.error && Math.max(it.a ?? it.hi, it.b ?? 0, it.c ?? 0, it.hi ?? 0) <= 100));
    const pool = enumerable ? enumeratePool(bankName, claims) : [];
    const least = enumerable ? leastAnswerCap(typeCounts, pool, (it) => (kComputation(bankName, grade) ? it.key : it.twin), n) : 1;
    const problems = [];
    // No form of this mix can be drawn from what the claims allow: that is a
    // failure, not a reason to lift the cap.
    if (least === Infinity) problems.push(grade + ': the claimed standards ' + JSON.stringify(claims) + ' cannot supply a form with these item types');
    const cap = Math.max(Math.floor(MAX_ONE_ANSWER * n), least === Infinity ? 0 : least);
    FORMS.forEach((f) => {
      const counts = {};
      forms[f].forEach((it) => { if (!it.error) counts[it.answer] = (counts[it.answer] || 0) + 1; });
      Object.keys(counts).forEach((v) => { if (counts[v] > cap) problems.push(grade + f + ': ' + counts[v] + ' of ' + n + ' answers are ' + v + ' (cap ' + cap + ')'); });
    });
    expect(problems).toEqual([]);
  });

  it('forms share at most 20% of their items (or the least the item pool forces, +1), never in the same position', () => {
    const claims = claimsOf('A');
    const typeCounts = {};
    forms.A.forEach((it) => { if (!it.error) { const t = typeOf(it); typeCounts[t] = (typeCounts[t] || 0) + 1; } });
    const enumerable = FORMS.every((f) => forms[f].every((it) => !it.error && Math.max(it.a ?? it.hi, it.b ?? 0, it.c ?? 0, it.hi ?? 0) <= 100));
    const pool = enumerable ? enumeratePool(bankName, claims) : [];
    const problems = [];
    // Computation is checked twice: as printed (7 + 5 vs 7 + 5) and with
    // commutative twins folded (7 + 5 vs 5 + 7), except in kindergarten, where
    // within-5 facts are listed both ways round.
    const keyings = kComputation(bankName, grade) ? [['as printed', (it) => it.key]]
      : bankName === 'MATH_PROBE_BANKS' ? [['as printed', (it) => it.key], ['twins folded', (it) => it.twin]] : [['item', (it) => it.twin]];
    keyings.forEach(([label, keyOf]) => {
      let forced = 0;
      Object.keys(typeCounts).forEach((t) => {
        const P = enumerable ? new Set(pool.filter((it) => typeOf(it) === t).map(keyOf)).size : Infinity;
        if (P < typeCounts[t]) problems.push(grade + ' type ' + t + ' needs ' + typeCounts[t] + ' distinct items, pool has ' + P);
        else if (P !== Infinity) forced += forcedPairs(typeCounts[t], P);
      });
      const cap = Math.max(Math.ceil(MAX_SHARED * n), Math.ceil(forced / 3) + 1);
      for (let i = 0; i < FORMS.length; i++) for (let j = i + 1; j < FORMS.length; j++) {
        const other = new Set(forms[FORMS[j]].map(keyOf));
        const shared = forms[FORMS[i]].filter((it) => !it.error && other.has(keyOf(it))).length;
        if (shared > cap) problems.push(grade + FORMS[i] + '/' + FORMS[j] + ' share ' + shared + ' of ' + n + ' items ' + label + ' (cap ' + cap + ')');
        forms[FORMS[i]].forEach((it, s) => {
          const twin = forms[FORMS[j]][s];
          if (!it.error && twin && !twin.error && keyOf(it) === keyOf(twin)) problems.push(grade + FORMS[i] + '/' + FORMS[j] + ' item ' + (s + 1) + ' is the same item (' + label + ')');
        });
      }
    });
    expect(problems).toEqual([]);
  });
});

describe('the unloaded JS duplicate', () => {
  it('psychometric_math_probes.js carries exactly the JSON data', () => {
    const sandbox = { window: {} };
    vm.runInNewContext(readFileSync(JS_PATH, 'utf8'), sandbox);
    expect(Object.keys(sandbox.window).sort()).toEqual(Object.keys(data).sort());
    Object.keys(data).forEach((bankName) => {
      expect(JSON.stringify(sandbox.window[bankName]), bankName + ' in the JS duplicate').toBe(JSON.stringify(data[bankName]));
    });
  });

  it('both files are the deterministic generator output (re-run it rather than hand-edit)', () => {
    const require = createRequire(import.meta.url);
    const gen = require(resolve(ROOT, 'dev-tools/generate_fixed_math_probe_forms.cjs'));
    const built = gen.build().data;
    expect(jsonText === gen.jsonText(built), 'psychometric_math_probes.json matches the generator').toBe(true);
    expect(readFileSync(JS_PATH, 'utf8') === gen.jsText(built), 'psychometric_math_probes.js matches the generator').toBe(true);
  });
});
