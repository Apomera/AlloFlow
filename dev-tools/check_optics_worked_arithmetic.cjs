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
 * WHAT IT CHECKS. Two bodies of worked physics, both re-derived with the
 * SHIPPED solver extracted from the tool — not a reimplementation, which
 * would only prove two copies of the same mistake agree.
 *   1. Quiz explanations: d_i and m, from the f and d_o the prose names.
 *   2. Sleuth cases: the same numbers AND the image CLASS the case is graded
 *      against. A wrong class is worse than a wrong number, because the
 *      student is marked wrong for being right.
 *
 * WHAT IT DOES NOT CHECK. Among quiz explanations, only claims written in the
 * "(f·d_o)/(d_o−f)" shape are re-derived; prose that states a result without
 * showing the substitution is out of scope. The counts are printed on success
 * so a silent drop to zero is visible rather than reading as a pass — the
 * first draft of this gate matched 1 of 6 claims and looked just as green.
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
  // One canary per body of content. A gate that cannot fail is worse than no
  // gate, and a gate whose SECOND arm cannot fail is a gate that quietly
  // covers half of what its name claims.
  const canaries = [
    ['quiz d_i', 'd_i = (12·20)/(20−12) = 30 cm', 'd_i = (12·20)/(20−12) = 35 cm'],
    ['sleuth image class',
      "setup: 'Diverging lens, f = -8 cm. Object placed at 12 cm from the lens.', correct: 'virtUprRed'",
      "setup: 'Diverging lens, f = -8 cm. Object placed at 12 cm from the lens.', correct: 'realInvMag'"],
  ];
  for (const [what, from, to] of canaries) {
    if (src.indexOf(from) === -1) {
      console.error('✗ --selftest: the ' + what + ' canary line is gone, so this run proves nothing.');
      console.error('  Point that canary at another fully worked line.');
      process.exit(2);
    }
    src = src.replace(from, to);
  }
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

// ── Sleuth cases ────────────────────────────────────────────────────────
// The Sleuth tab is a second body of worked physics, and a richer one: each
// case names f and d_o in its setup, states d_i and the magnification in its
// `why`, AND commits to an image CLASS that the student is graded against.
// A wrong class is worse than a wrong number — the student is marked wrong
// for being right. All three are re-derived from the shipped solver.
let checkedSleuth = 0;
const CLASS_OF = (r) => (r.isReal ? 'real' : 'virt') + (r.isUpright ? 'Upr' : 'Inv') + (Math.abs(r.m) > 1 ? 'Mag' : 'Red');
const sleuthRe = /\{ id: (\d+), setup: '((?:\\.|[^'\\])*)', correct: '(\w+)',\s*\n\s*why: '((?:\\.|[^'\\])*)'/g;
let sc;
while ((sc = sleuthRe.exec(src)) !== null) {
  const id = +sc[1];
  const setup = sc[2];
  const correct = sc[3];
  const why = sc[4];
  const fM = setup.match(/f\s*=\s*([\u2212\u2013-]?[\d.]+)\s*cm/);
  if (!fM) continue;
  // "placed at 30 cm", "placed 6 cm", "exactly at 40 cm", and the hallway
  // case's "You stand 100 cm away" — a distance is a distance however phrased.
  const doM = setup.match(/(?:at|placed|stand)\s+(?:exactly\s+)?(?:at\s+)?([\d.]+)\s*cm/)
    || setup.match(/([\d.]+)\s*cm\s*away/);
  const infinite = /infinit|very far|distant star/i.test(setup);
  if (!doM && !infinite) continue;
  const f = num(fM[1]);
  const dO = infinite ? 1e7 : num(doM[1]);
  const r = solve(dO, f);
  if (!r || r.error) { findings.push({ quantity: 'sleuth#' + id, f: f, d_o: dO, stated: correct, solver: 'solver error', explain: setup.slice(0, 160) }); continue; }

  checkedSleuth++;
  const cls = CLASS_OF(r);
  if (cls.toLowerCase() !== correct.toLowerCase()) {
    findings.push({ quantity: 'sleuth#' + id + ' image class', f: f, d_o: dO, stated: correct, solver: cls + ' (m=' + r.m.toFixed(3) + ')', explain: setup.slice(0, 160) });
  }
  const diM = why.match(/d_i\s*=\s*([\u2212\u2013-]?[\d.]+)\s*cm/);
  if (diM && !infinite) {
    const stated = num(diM[1]);
    checkedSleuth++;
    // The bank rounds a few of these to whole cm (-33 for -33.33), so allow
    // slightly more slack here than in the fully worked quiz lines.
    if (Math.abs(r.d_i - stated) > 0.6) {
      findings.push({ quantity: 'sleuth#' + id + ' d_i', f: f, d_o: dO, stated: stated, solver: +r.d_i.toFixed(3), explain: why.slice(0, 160) });
    }
  }
  // Take the LAST "= <number>" in the magnification sentence, not the first:
  // "Magnification = -d_i/d_o = -15/30 = -0.5" states the substitution before
  // the result, and grabbing -15 out of the fraction reports a false finding.
  // The sentence runs to the end of the number, not to the first "." \u2014 a
  // decimal result like "-0.5" contains one. Take the LAST "= <number>",
  // because "Magnification = -d_i/d_o = -15/30 = -0.5" states the
  // substitution before the result, and the operands are not the claim.
  // The number must not be followed by "/", which is what distinguishes the
  // result from a numerator.
  const mgSentence = why.match(/[Mm]agnification\s*=[^;]*/);
  let mgM = null;
  if (mgSentence) {
    const eqs = [...mgSentence[0].matchAll(/=\s*([+\u2212\u2013-]?\d+(?:\.\d+)?)(?!\s*[\/\d])/g)];
    if (eqs.length) mgM = [null, eqs[eqs.length - 1][1]];
  }
  if (mgM) {
    const stated = num(mgM[1]);
    checkedSleuth++;
    if (Math.abs(r.m - stated) > 0.03) {
      findings.push({ quantity: 'sleuth#' + id + ' magnification', f: f, d_o: dO, stated: stated, solver: +r.m.toFixed(3), explain: why.slice(0, 160) });
    }
  }
}

const checked = checkedDi + checkedM + checkedSleuth;
if (JSON_OUT) console.log(JSON.stringify({ explains: explains.length, checkedDi, checkedM, checkedSleuth, findings }, null, 2));

if (SELFTEST) {
  // Two canaries, one per body of content: a quiz number and a Sleuth image
  // class. Either arm going blind must fail the run, so both are required.
  const quizCaught = findings.some((f) => f.quantity === 'd_i' && f.stated === 35);
  const sleuthCaught = findings.some((f) => /^sleuth#4 image class$/.test(f.quantity));
  console.log('SELFTEST: planted a wrong quiz d_i (30 -> 35) and a wrong Sleuth class (virtUprRed -> realInvMag).');
  console.log('SELFTEST: quiz canary   ' + (quizCaught ? 'CAUGHT ✓' : 'MISSED ✗'));
  console.log('SELFTEST: sleuth canary ' + (sleuthCaught ? 'CAUGHT ✓' : 'MISSED ✗'));
  if (!quizCaught || !sleuthCaught) { console.log('  — the gate is blind on that arm.'); process.exit(1); }
  process.exit(0);
}

// Checking nothing is not the same as finding nothing.
if (checked === 0) {
  console.log('✗ check_optics_worked_arithmetic: 0 worked claims found in ' + explains.length +
    ' explanations — the bank was reformatted out of this gate’s reach, so this is NOT a pass.');
  process.exit(2);
}

if (findings.length === 0) {
  console.log('✓ check_optics_worked_arithmetic: ' + checked + ' worked number(s) across ' +
    explains.length + ' explanations and the Sleuth bank agree with the shipped solver (' +
    checkedDi + ' quiz d_i, ' + checkedM + ' quiz m, ' + checkedSleuth + ' sleuth class/d_i/m).');
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
