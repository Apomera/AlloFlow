#!/usr/bin/env node
'use strict';
/*
 * Optics Lab: every worked number in a quiz explanation must agree with the
 * solver the tool actually ships.
 *
 * WHY THIS EXISTS. The quiz bank explains its answers with arithmetic spelled
 * out in prose — "d_i = (12·20)/(20−12) = 30 cm. m = −30/20 = −1.5." That
 * prose is a SECOND, hand-maintained copy of what `thinLens` computes. Nothing
 * tied the two together, so an edit to a distractor, a sign, or a focal length
 * could leave the worked line stating a number the tool contradicts on screen
 * a moment later. A student who checks the explanation against the calculator
 * and finds them disagreeing learns to distrust the tool.
 *
 * This is the "prose number vs its own table" failure: the data was right and
 * the sentence about the data was wrong, and every test checked the data.
 *
 * WHAT IT CHECKS. For each `explain:` string that spells out a thin-lens
 * computation, it re-derives d_i (and m, where stated) from the f and d_o the
 * prose itself names, using the SHIPPED solver extracted from the tool — not a
 * reimplementation, which would only prove two copies of the same mistake
 * agree.
 *
 * WHAT IT DOES NOT CHECK. Only claims written in the "(f·d_o)/(d_o−f)" shape
 * are re-derived; prose that states a result without showing the substitution
 * is out of scope, and the count below is printed so a silent drop to zero is
 * visible rather than reading as success.
 *
 * DETECTION ONLY — writes nothing.
 *
 * Usage:  node dev-tools/check_optics_worked_arithmetic.cjs [--json] [--selftest]
 * Exit:   0 clean, 1 a stated number disagrees with the solver, 2 the check
 *         could not run (missing file/solver, or nothing to check).
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TOOL = path.join(ROOT, 'stem_lab', 'stem_tool_optics.js');
const SELFTEST = process.argv.includes('--selftest');
const JSON_OUT = process.argv.includes('--json');

if (!fs.existsSync(TOOL)) {
  console.error('✗ ' + path.relative(ROOT, TOOL) + ' not found — run from the repo root.');
  process.exit(2);
}
let src = fs.readFileSync(TOOL, 'utf8');

if (SELFTEST) {
  // Plant a wrong result in the one item whose arithmetic is fully spelled
  // out. A gate that cannot fail is worse than no gate.
  const canaryFrom = 'd_i = (12·20)/(20−12) = 30 cm';
  const canaryTo = 'd_i = (12·20)/(20−12) = 35 cm';
  if (src.indexOf(canaryFrom) === -1) {
    console.error('✗ --selftest: the canary line is no longer in the quiz bank, so this run proves nothing.');
    console.error('  Point the canary at another fully worked explain line.');
    process.exit(2);
  }
  src = src.replace(canaryFrom, canaryTo);
}

// Use the SHIPPED solver, so the gate cannot pass by agreeing with its own
// reimplementation of the physics.
function extract(re, what) {
  const m = src.match(re);
  if (!m) {
    console.error('✗ could not find ' + what + ' in the tool — the gate would test nothing.');
    process.exit(2);
  }
  return m[0];
}
const isNum = extract(/function _isNum\([\s\S]*?\n  }\n/, '_isNum()');
const thinLens = extract(/function thinLens\([\s\S]*?\n  }\n/, 'thinLens()');
let solve;
try {
  solve = new Function(isNum + thinLens + 'return thinLens;')();
} catch (e) {
  console.error('✗ the extracted solver did not evaluate: ' + e.message);
  process.exit(2);
}

const num = (s) => parseFloat(String(s).replace(/[−–]/g, '-'));

const explains = [];
const explainRe = /explain: (['"])((?:\\.|(?!\1)[^\\])*)\1/g;
let m;
while ((m = explainRe.exec(src)) !== null) explains.push(m[2]);

// "d_i = (F·DO)/(...)" — either factor may be negative and parenthesised.
const diRe = /d_i\s*=\s*\(\s*\(?\s*([−–-]?[\d.]+)\s*\)?\s*[·*×]\s*\(?\s*([−–-]?[\d.]+)\s*\)?\s*\)\s*\//;
const cmRe = /=\s*([−–-]?[\d.]+)\s*cm/g;
const mRe = /\bm\s*=\s*[−–+-]?\s*\(?\s*[−–-]?[\d.]+\s*\)?\s*\/\s*\(?\s*[−–-]?[\d.]+\s*\)?\s*=\s*([−–+-]?[\d.]+)/;

const findings = [];
let checkedDi = 0;
let checkedM = 0;

for (const ex of explains) {
  const d = ex.match(diRe);
  if (!d) continue;
  const f = num(d[1]);
  const dO = num(d[2]);
  const r = solve(dO, f);

  const cm = [...ex.matchAll(cmRe)];
  if (cm.length) {
    const stated = num(cm[cm.length - 1][1]);
    checkedDi++;
    if (!r || r.error || Math.abs(r.d_i - stated) > 0.05) {
      findings.push({
        quantity: 'd_i', f: f, d_o: dO, stated: stated,
        solver: r && r.d_i !== undefined ? +r.d_i.toFixed(3) : 'solver error',
        explain: ex.slice(0, 160),
      });
    }
  }

  const mm = ex.match(mRe);
  if (mm) {
    const stated = num(mm[1]);
    checkedM++;
    if (!r || r.error || Math.abs(r.m - stated) > 0.02) {
      findings.push({
        quantity: 'm', f: f, d_o: dO, stated: stated,
        solver: r && r.m !== undefined ? +r.m.toFixed(3) : 'solver error',
        explain: ex.slice(0, 160),
      });
    }
  }
}

const checked = checkedDi + checkedM;
if (JSON_OUT) console.log(JSON.stringify({ explains: explains.length, checkedDi, checkedM, findings }, null, 2));

if (SELFTEST) {
  const caught = findings.some((f) => f.quantity === 'd_i' && f.stated === 35);
  console.log('SELFTEST: planted a wrong d_i (30 -> 35).');
  console.log('SELFTEST: canary ' + (caught ? 'CAUGHT ✓' : 'MISSED ✗ — the gate is blind'));
  process.exit(caught ? 0 : 1);
}

// Checking nothing is not the same as finding nothing.
if (checked === 0) {
  console.log('✗ check_optics_worked_arithmetic: 0 worked claims found in ' + explains.length +
    ' explanations — the bank was reformatted out of this gate’s reach, so this is NOT a pass.');
  process.exit(2);
}

if (findings.length === 0) {
  console.log('✓ check_optics_worked_arithmetic: ' + checked + ' worked number(s) across ' +
    explains.length + ' explanations agree with the shipped solver (' + checkedDi + ' d_i, ' + checkedM + ' m).');
  process.exit(0);
}

console.log('✗ check_optics_worked_arithmetic: ' + findings.length + ' worked number(s) disagree with the shipped solver.');
for (const f of findings) {
  console.log('  ' + f.quantity + ' for f=' + f.f + ', d_o=' + f.d_o + ': the explanation says ' + f.stated + ', thinLens() gives ' + f.solver);
  console.log('      ' + f.explain);
}
console.log('  The prose is a second copy of the physics. Fix the sentence, or fix the solver —');
console.log('  but a student who checks one against the other must not find them disagreeing.');
process.exit(1);
