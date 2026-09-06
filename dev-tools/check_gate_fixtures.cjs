#!/usr/bin/env node
/**
 * check_gate_fixtures — run every calibration the layout gate has, and fail if
 * any of them drifts.
 *
 *   node dev-tools/check_gate_fixtures.cjs
 *
 * WHY THIS EXISTS. On 2026-09-05/06 the gate itself carried nine bugs, and the
 * fixtures caught most of them within a minute of being introduced — including
 * three from changes that looked like pure plumbing (a dedupe that deleted
 * findings, a coverage note that broke every baseline, a `--gate` exit that
 * failed on caveats). But verifying the gate meant running eight commands by
 * hand and comparing numbers from memory, which is precisely the kind of step
 * that silently stops happening. One command, exact expectations, non-zero exit
 * on drift.
 *
 * ★A green board proves nothing unless the gate can still FAIL. Every fixture
 * below carries the false positive that motivated it as well as the defect, so
 * they fail in both directions: they catch a detector going blind AND a
 * detector getting greedy.
 *
 * The known-bad blob is a historical pets build; it is fetched from git on
 * demand so this script needs no checked-in binary.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GATE = path.join(__dirname, 'check_stem_layout_defects.cjs');
const KNOWN_BAD_BLOB = 'f25a88533:stem_lab/stem_tool_pets.js';

function run(args) {
  try {
    return execFileSync(process.execPath, [GATE].concat(args), {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024, timeout: 900000
    });
  } catch (e) {
    // --gate exits 1 by design when findings exist; keep the output.
    if (e.stdout) return e.stdout;
    throw e;
  }
}

function findings(out) {
  const m = /(\d+) finding\(s\)/.exec(out);
  return m ? Number(m[1]) : null;
}

const F = (name) => path.join('dev-tools', 'fixtures', name);

// Materialise the known-bad blob next to the OS temp dir, not in the repo.
let knownBad = null;
try {
  const blob = execFileSync('git', ['show', KNOWN_BAD_BLOB], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  });
  knownBad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gate-kb-')), 'knownbad_pets.js');
  fs.writeFileSync(knownBad, blob);
} catch (e) {
  console.error('! could not fetch the known-bad blob (' + KNOWN_BAD_BLOB + '): ' + e.message);
}

const checks = [];

if (knownBad) {
  checks.push({
    name: 'known-bad blob still fires',
    args: [knownBad, '--deep'],
    expect: (out) => findings(out) === 7,
    describe: '7 findings'
  });
}

checks.push(
  { name: 'current pets is clean', args: ['stem_lab/stem_tool_pets.js', '--deep'],
    expect: (o) => findings(o) === 0, describe: '0 findings' },
  { name: 'current pets is clean at full depth', args: ['stem_lab/stem_tool_pets.js', '--deep', '--deep-cap=all'],
    expect: (o) => findings(o) === 0, describe: '0 findings' },
  { name: 'clipped text', args: [F('clipped_text_fixture.js')],
    expect: (o) => findings(o) === 1, describe: '1 finding' },
  { name: 'overflow column (incl. pushed-clean-off, excl. transform-parked)',
    args: [F('overflow_column_fixture.js'), '--narrow'],
    expect: (o) => findings(o) === 4, describe: '4 findings' },
  { name: 'svg text ink (leading discounted, real cut kept)', args: [F('svg_text_fixture.js')],
    expect: (o) => findings(o) === 1, describe: '1 finding' },
  { name: 'contrast ink with host CSS', args: [F('contrast_ink_fixture.js'), '--contrast'],
    expect: (o) => findings(o) === 1, describe: '1 finding' },
  { name: 'contrast ink without host CSS', args: [F('contrast_ink_fixture.js'), '--contrast', '--no-host-css'],
    expect: (o) => findings(o) === 4, describe: '4 findings' },
  { name: 'deep coverage is reported when the cap bites',
    args: [F('deep_cap_fixture.js'), '--deep', '--deep-cap=12'],
    expect: (o) => findings(o) === 0 && /12 of 15 matched controls/.test(o),
    describe: '0 findings + "12 of 15 matched controls"' },
  { name: 'deep coverage is silent when the cap does not bite',
    args: [F('deep_cap_fixture.js'), '--deep', '--deep-cap=15'],
    expect: (o) => findings(o) === 0 && !/matched controls/.test(o),
    describe: '0 findings, no coverage line' },
  { name: 'settle caveat fires when an animation outlasts the cap',
    args: [F('settle_fixture.js'), '--deep'],
    expect: (o) => findings(o) === 0 && /animation was still running/.test(o),
    describe: '0 findings + the settle caveat' },
  { name: 'settle caveat is silent once the animation finishes',
    args: [F('settle_fixture.js'), '--deep', '--settle-cap=5000'],
    expect: (o) => findings(o) === 0 && !/animation was still running/.test(o),
    describe: '0 findings, no settle caveat' },
  // ★ --gate must fail on DEFECTS, never on CAVEATS. Adding coverage entries to
  // `report` once made `report.length` non-zero for a lab with zero defects.
  { name: '--gate ignores a coverage-only caveat',
    args: [F('deep_cap_fixture.js'), '--deep', '--deep-cap=12', '--gate'],
    expect: (o) => findings(o) === 0, describe: 'exit 0 / no findings' }
);

let failed = 0;
for (const c of checks) {
  process.stdout.write('  ' + c.name.padEnd(58) + ' ');
  let out;
  try { out = run(c.args); } catch (e) {
    console.log('ERROR (' + String(e.message).slice(0, 60) + ')');
    failed += 1;
    continue;
  }
  if (c.expect(out)) {
    console.log('ok (' + c.describe + ')');
  } else {
    console.log('DRIFTED — expected ' + c.describe + ', got ' + findings(out) + ' finding(s)');
    failed += 1;
  }
}

console.log('');
if (failed) {
  console.log('[check_gate_fixtures] ' + failed + ' of ' + checks.length + ' calibration(s) DRIFTED.');
  console.log('A drifted calibration means the GATE changed behaviour, not that a tool did.');
  process.exit(1);
}
console.log('[check_gate_fixtures] all ' + checks.length + ' calibrations hold.');
