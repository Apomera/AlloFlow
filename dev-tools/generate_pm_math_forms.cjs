// Generate the PM math computation bank: 20 forms per grade, grades 1-6.
//
//   node dev-tools/generate_pm_math_forms.cjs        -> pm_bank/PM_MATH_FORMS_DRAFT.json
//
// WHY. PM_BANK_FORM_SPEC.md §1 said "existing generator may cover; confirm".
// Confirmed 2026-08-23: there is no generator — psychometric_math_probes.json
// is a FIXED bank of 3 forms (A/B/C) per grade, K-5 only. Weekly monitoring
// needs 20 interchangeable forms per grade including grade 6.
//
// DESIGN MATCHING, NOT EMPIRICAL EQUATING. Every form shares its grade's
// operation order, operand/answer digit lengths and regrouping profile.
// These controls reduce construction differences; alternate-form reliability
// and score equivalence still require review and student field data.
// The shipped A/B/C bank is unchanged; this output remains unpublished.
//
// DETERMINISTIC. Seeded PRNG (mulberry32), fixed seed per grade+form. Re-runs
// reproduce the bank byte-for-byte; no Math.random.
//
// SELF-VERIFYING. After generation the script independently recomputes every
// answer, checks op histograms match the grade template, checks no duplicate
// problem within a form, and checks no two forms in a grade are identical.
// Any failure aborts without writing.
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const existing = JSON.parse(fs.readFileSync(path.join(ROOT, 'psychometric_math_probes.json'), 'utf8')).MATH_PROBE_BANKS;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYMBOL = { add: '+', sub: '−', mul: '×', div: '÷' };
function computeAnswer(p) {
  if (p.op === 'add') return p.a + p.b;
  if (p.op === 'sub') return p.a - p.b;
  if (p.op === 'mul') return p.a * p.b;
  if (p.op === 'div') return p.a / p.b;
  throw new Error('unknown op ' + p.op);
}

// ── Derive per-grade templates from the existing bank (grades 1-5) ──────────
function deriveTemplate(grade) {
  const forms = Object.values(existing[grade]);
  const perOp = {};
  let count = 0;
  for (const f of forms) {
    count += f.problems.length;
    for (const p of f.problems) {
      const e = perOp[p.op] || { n: 0, aMin: Infinity, aMax: -Infinity, bMin: Infinity, bMax: -Infinity };
      e.n++;
      e.aMin = Math.min(e.aMin, p.a); e.aMax = Math.max(e.aMax, p.a);
      e.bMin = Math.min(e.bMin, p.b); e.bMax = Math.max(e.bMax, p.b);
      perOp[p.op] = e;
    }
  }
  const problemCount = Math.round(count / forms.length);
  // Integer op counts summing to problemCount, proportional to observed mix.
  const ops = Object.keys(perOp);
  const mix = {};
  let assigned = 0;
  ops.forEach((op, i) => {
    const share = i === ops.length - 1
      ? problemCount - assigned
      : Math.round(perOp[op].n / count * problemCount);
    mix[op] = share; assigned += share;
  });
  return {
    problemCount,
    timeLimit: forms[0].timeLimit,
    operation: forms[0].operation,
    difficulty: forms[0].difficulty,
    mix,
    ranges: Object.fromEntries(ops.map((op) => [op, {
      a: [perOp[op].aMin, perOp[op].aMax], b: [perOp[op].bMin, perOp[op].bMax],
    }])),
  };
}

const TEMPLATES = {};
for (const g of ['1', '2', '3', '4', '5']) TEMPLATES[g] = deriveTemplate(g);
// Grade 6: no existing form to imitate. Mix marked for REVIEWER CONFIRMATION
// in PM_BANK_FORM_SPEC.md — multi-digit computation extending the grade-5 mix.
TEMPLATES['6'] = {
  problemCount: TEMPLATES['5'].problemCount,
  timeLimit: TEMPLATES['5'].timeLimit,
  operation: 'mixed',
  difficulty: 'multi-digit',
  reviewNote: 'Grade 6 mix is spec-proposed (no existing form to derive from) — reviewers confirm.',
  mix: { add: 6, sub: 6, mul: 8, div: 5 },
  ranges: {
    add: { a: [125, 989], b: [114, 897] },
    sub: { a: [312, 987], b: [105, 689] },
    mul: { a: [12, 89], b: [3, 12] },
    div: { a: [36, 144], b: [3, 12] }, // provisional grade-6 dividend range
  },
};

function genInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

function genProblem(rng, op, ranges) {
  const r = ranges[op];
  let a, b;
  if (op === 'div') {
    b = genInt(rng, Math.max(2, r.b[0]), r.b[1]);
    const qLo = Math.max(1, Math.ceil(r.a[0] / b));
    const qHi = Math.floor(r.a[1] / b);
    if (qLo > qHi) throw new Error("No quotient in declared dividend range");
    const q = genInt(rng, qLo, qHi);
    a = b * q;
  } else if (op === 'sub') {
    a = genInt(rng, r.a[0], r.a[1]);
    b = genInt(rng, r.b[0], Math.min(r.b[1], a)); // no negative answers
  } else {
    a = genInt(rng, r.a[0], r.a[1]);
    b = genInt(rng, r.b[0], r.b[1]);
  }
  const p = { a, b, op, symbol: SYMBOL[op] };
  p.answer = computeAnswer(p);
  return p;
}

function itemProfile(p) {
  let regroup = 0, carry = 0, a = p.a, b = p.b;
  if (p.op === 'add' || p.op === 'sub') {
    while (a > 0 || b > 0) {
      const x = a % 10, y = b % 10;
      carry = p.op === 'add' ? Number(x + y + carry >= 10) : Number(x - carry < y);
      regroup += carry; a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
  }
  return [p.op, String(p.a).length, String(p.b).length, String(p.answer).length, regroup].join('|');
}
const FORMS_PER_GRADE = 20;
const bank = {
  status: 'DRAFT — generated alternate forms for weekly progress monitoring. NOT wired into the app; clinical review pending (PM_BANK_FORM_SPEC.md). Grade 6 mix is spec-proposed, not derived.',
  blueprintVersion: 2,
  generator: 'dev-tools/generate_pm_math_forms.cjs (deterministic; re-run reproduces byte-for-byte)',
  templates: TEMPLATES,
  PM_MATH_FORMS: {},
};

for (const grade of ['1', '2', '3', '4', '5', '6']) {
  const t = TEMPLATES[grade];
  const forms = {};
  for (let fi = 0; fi < FORMS_PER_GRADE; fi++) {
    const id = 'PM' + String(fi + 1).padStart(2, '0');
    const rng = mulberry32(0xA11F * (Number(grade) + 1) * 1000 + fi * 7 + 13);
    const problems = [];
    const seen = new Set();
    for (const op of Object.keys(t.mix)) {
      for (let k = 0; k < t.mix[op]; k++) {
        let p, tries = 0;
        do { p = genProblem(rng, op, t.ranges); tries++; }
        while (seen.has(p.op + ':' + p.a + ':' + p.b) && tries < 200);
        seen.add(p.op + ':' + p.a + ':' + p.b);
        problems.push(p);
      }
    }
    // The first seeded form fixes a versioned slot profile for the grade.
    // Subsequent forms match each slot, including regrouping and digit load.
    if (fi > 0) {
      problems.length = 0; seen.clear();
      for (const anchor of forms.PM01.problems) {
        let p, tries = 0;
        do { p = genProblem(rng, anchor.op, t.ranges); tries++; }
        while ((itemProfile(p) !== itemProfile(anchor) || seen.has(p.op + ':' + p.a + ':' + p.b)) && tries < 100000);
        if (tries === 100000) throw new Error('Cannot fill blueprint slot ' + grade + '/' + id);
        seen.add(p.op + ':' + p.a + ':' + p.b); problems.push(p);
      }
    }
    // Only the anchor is shuffled; later forms keep its operation order.
    for (let i = fi === 0 ? problems.length - 1 : 0; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [problems[i], problems[j]] = [problems[j], problems[i]];
    }
    if (fi === 0) t.slotProfiles = problems.map(itemProfile);
    forms[id] = { blueprintVersion: 2, operation: t.operation, difficulty: t.difficulty, timeLimit: t.timeLimit, problems };
  }
  bank.PM_MATH_FORMS[grade] = forms;
}

// ── Verify before writing ───────────────────────────────────────────────────
const problems = [];
for (const grade of Object.keys(bank.PM_MATH_FORMS)) {
  const t = TEMPLATES[grade];
  const signatures = new Set();
  for (const [id, form] of Object.entries(bank.PM_MATH_FORMS[grade])) {
    const hist = {};
    const inForm = new Set();
    if (JSON.stringify(form.problems.map(itemProfile)) !== JSON.stringify(t.slotProfiles)) problems.push(grade + '/' + id + ': blueprint mismatch');
    for (const p of form.problems) {
      const r = t.ranges[p.op];
      if (p.a < r.a[0] || p.a > r.a[1] || p.b < r.b[0] || p.b > r.b[1]) problems.push(grade + '/' + id + ': operand out of range');
      if (computeAnswer(p) !== p.answer) problems.push(`${grade}/${id}: wrong answer ${p.a}${p.symbol}${p.b}`);
      if (p.op === 'sub' && p.answer < 0) problems.push(`${grade}/${id}: negative answer`);
      if (p.op === 'div' && !Number.isInteger(p.answer)) problems.push(`${grade}/${id}: non-integer quotient`);
      const key = p.op + ':' + p.a + ':' + p.b;
      if (inForm.has(key)) problems.push(`${grade}/${id}: duplicate problem ${key}`);
      inForm.add(key);
      hist[p.op] = (hist[p.op] || 0) + 1;
    }
    for (const op of Object.keys(t.mix)) {
      if ((hist[op] || 0) !== t.mix[op]) problems.push(`${grade}/${id}: op mix ${op}=${hist[op] || 0}, template ${t.mix[op]}`);
    }
    if (form.problems.length !== t.problemCount) problems.push(`${grade}/${id}: ${form.problems.length} problems, template ${t.problemCount}`);
    const sig = form.problems.map((p) => p.op + p.a + '_' + p.b).join('|');
    if (signatures.has(sig)) problems.push(`${grade}: two identical forms`);
    signatures.add(sig);
  }
}
if (problems.length) {
  console.error('VERIFY FAILED (' + problems.length + '):');
  problems.slice(0, 10).forEach((p) => console.error('  ' + p));
  process.exit(1);
}

const out = path.join(ROOT, 'pm_bank', 'PM_MATH_FORMS_DRAFT.json');
fs.writeFileSync(out, JSON.stringify(bank, null, 1) + '\n');
const total = Object.values(bank.PM_MATH_FORMS).reduce((a, g) => a + Object.keys(g).length, 0);
console.log('VERIFIED: ' + total + ' forms (' + FORMS_PER_GRADE + ' x 6 grades), every answer recomputed, op mixes match templates, no duplicate problems or forms.');
console.log('wrote ' + path.relative(ROOT, out));
for (const g of Object.keys(TEMPLATES)) {
  const t = TEMPLATES[g];
  console.log('  g' + g + ': ' + t.problemCount + ' problems, mix ' + JSON.stringify(t.mix) + (t.reviewNote ? '  [REVIEWER-CONFIRM]' : ''));
}
