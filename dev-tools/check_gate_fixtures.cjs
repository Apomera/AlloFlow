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
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024, timeout: 900000
    });
  } catch (e) {
    // --gate exits 1 by design when findings exist; keep the output.
    if (e.stdout) return e.stdout;
    // ★ Surface the gate's LAST stderr line, not execFileSync's generic
    // "Command failed: <path>", which was truncated to 60 chars and told me
    // nothing. Under three concurrent browsers the 2026-09-06 run reported
    // one check as ERROR; alone it passed. The distinction between "the
    // environment hiccuped" and "the gate broke" must be visible here.
    const tail = String(e.stderr || '').trim().split(/\r?\n/).filter(Boolean).pop() || '';
    const err = new Error((tail || e.message).slice(0, 160));
    err.transient = true;
    throw err;
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
  // ★ The specified height lives in the class list too: `h-full` (364 uses in
  // the lab) was invisible to this detector. The h-40 parent must stay silent;
  // the auto block parent, the auto FLEX parent (an explicit height beats
  // stretch) and the original inline case must all fire.
  { name: 'collapsed % height from h-full (fixed parent silent, flex fires)',
    args: [F('pct_height_class_fixture.js')],
    expect: (o) => findings(o) === 3 && /asks for h-full of a 40px parent/.test(o),
    describe: '3 findings, incl. h-full in a flex parent' },
  // ★ Clipped by an ANCESTOR: the commonest Tailwind shape (a fixed-height
  // overflow-hidden card cutting the paragraph inside it) was never measured.
  // The scrollable, line-clamped, fitting and collapsed cards must stay silent.
  { name: 'clipped text by an ancestor (scroll/clamp/fits/collapsed silent)',
    args: [F('ancestor_clip_fixture.js')],
    expect: (o) => findings(o) === 1 && /by an ANCESTOR/.test(o),
    describe: '1 finding naming the ancestor' },
  { name: 'clipped text', args: [F('clipped_text_fixture.js')],
    expect: (o) => findings(o) === 1, describe: '1 finding' },
  { name: 'overflow column (incl. pushed-clean-off, excl. transform-parked)',
    args: [F('overflow_column_fixture.js'), '--narrow'],
    expect: (o) => findings(o) === 4, describe: '4 findings' },
  { name: 'svg text ink (leading discounted, real cut kept)', args: [F('svg_text_fixture.js')],
    expect: (o) => findings(o) === 1, describe: '1 finding' },
  // ★ The LEFT half of the same detector, unmeasured until 2026-09-06. It must
  // find the lost row and stay silent on the decorative bleed, the scroller and
  // the parked skip link — a greedy left rule would flag every bleed in the lab.
  { name: 'overflow column, LEFT edge (bleed/scroller/skip-link silent)',
    args: [F('overflow_left_fixture.js')],
    expect: (o) => findings(o) === 1 && /past the left edge/.test(o),
    describe: '1 finding on the left' },
  { name: 'contrast ink with host CSS', args: [F('contrast_ink_fixture.js'), '--contrast'],
    expect: (o) => findings(o) === 1, describe: '1 finding' },
  { name: 'contrast ink without host CSS', args: [F('contrast_ink_fixture.js'), '--contrast', '--no-host-css'],
    expect: (o) => findings(o) === 4, describe: '4 findings' },
  // ★ Opacity is part of the ink. Dark text under opacity .28 paints at 1.6:1;
  // the .7, disabled and full-strength labels must stay silent.
  { name: 'opacity composited into the ink (.7/disabled/full silent)',
    args: [F('opacity_ink_fixture.js')],
    expect: (o) => findings(o) === 1 && /at opacity 0\.28/.test(o),
    describe: '1 finding naming opacity 0.28' },
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
  // ★ A BAND. These three run the SAME fixture and must disagree: the two
  // single-width runs are blind and the band run is not. That disagreement is
  // the calibration — it proves --widths finds something a routine sweep cannot,
  // rather than merely proving --widths runs.
  { name: 'band: a single sweep at 1280 is blind to it',
    args: [F('band_fixture.js'), '--viewport=1280x900'],
    expect: (o) => findings(o) === 0, describe: '0 findings' },
  { name: 'band: a single sweep at 768 is blind to it',
    args: [F('band_fixture.js'), '--narrow'],
    expect: (o) => findings(o) === 0, describe: '0 findings' },
  { name: 'band: --widths finds it and names the clean widths',
    args: [F('band_fixture.js'), '--widths=768,1024,1280'],
    expect: (o) => findings(o) === 2 && /clean at 768px, 1280px/.test(o),
    describe: '2 findings + "clean at 768px, 1280px"' },
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
  let retried = false;
  try { out = run(c.args); } catch (e1) {
    // One retry. A launch or timeout failure under load is not a calibration
    // result, and it must not be spelled the same as a drift — but it must not
    // vanish either, so a pass on the retry says so.
    retried = true;
    try { out = run(c.args); } catch (e2) {
      console.log('ERROR twice — ' + String(e2.message));
      failed += 1;
      continue;
    }
    process.stdout.write('[retried after: ' + String(e1.message).slice(0, 80) + '] ');
  }
  if (c.expect(out)) {
    console.log('ok (' + c.describe + ')' + (retried ? ' — on retry' : ''));
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
