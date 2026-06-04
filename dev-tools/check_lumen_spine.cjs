#!/usr/bin/env node
'use strict';
// check_lumen_spine.cjs — Lumen norm-spine status reporter + honesty guard.
//
// Lumen's benchmark feature ships with EMPTY curated norm spines (NORM_SPINE = Hasbrouck &
// Tindal 2017 ORF percentiles, grades 1-6; DIBELS8_ORF = grade 7-8 cut-points). A human must
// byte-transcribe each cell from the PRIMARY source and set `reviewedOn` before any norm renders.
// This tool reports where the transcription stands and BLOCKS the one unsafe state — cells
// populated but not human-reviewed (shipping unverified norms). Run it during the transcription
// session to see progress; it's also CI-safe (exits non-zero only on the 'invalid' laundering state).
//
// Run: node dev-tools/check_lumen_spine.cjs
// Worksheet (what to fill, and where to find it): docs/lumen_norm_spine_worksheet.md

const path = require('path');
let L;
try {
  L = require(path.join(__dirname, '..', 'stem_lab', 'stem_tool_lumen.js'));
} catch (e) {
  console.error('check_lumen_spine: cannot load stem_tool_lumen.js — ' + (e && e.message));
  process.exit(1);
}

var ICON = { empty: '○', ready: '✓', invalid: '✗' };
var blocked = false;

function report(name, spine) {
  var v = L.validateNormSpine(spine);
  console.log('');
  console.log('  ' + (ICON[v.status] || '?') + ' ' + name + ' [' + v.status.toUpperCase() + ']  (' + (v.cellCount || 0) + ' cell(s), reviewedOn=' + JSON.stringify(spine.reviewedOn) + ')');
  console.log('    source: ' + spine.source + ' ' + (spine.year || '') + '  grades ' + spine.gradeRange[0] + '-' + spine.gradeRange[1] + '  (' + spine.locator + ')');
  if (v.status === 'empty') {
    console.log('    → ships EMPTY: selectNorm refuses every cell, so the benchmark picker honestly declines.');
    console.log('      To activate: byte-transcribe the cells (see docs/lumen_norm_spine_worksheet.md), then set reviewedOn.');
  } else if (v.status === 'ready') {
    console.log('    → READY: cells are populated AND human-reviewed; verified benchmark lines will render.');
  } else {
    blocked = true;
    console.log('    → INVALID — release is BLOCKED until fixed:');
    v.problems.forEach(function (p) { console.log('        • ' + p); });
  }
}

console.log('=== Lumen norm-spine status ===');
report('NORM_SPINE (H&T 2017 ORF)', L.NORM_SPINE);
report('DIBELS8_ORF (G7-8 cut-points)', L.DIBELS8_ORF);
console.log('');

if (blocked) {
  console.error('check_lumen_spine: BLOCKED — a spine is in the filled-but-unreviewed/invalid state. ' +
    'Fix the problems above (or revert the cells to {}) before release.');
  process.exit(1);
}
console.log('check_lumen_spine: OK — both spines are in a clean state (empty or fully reviewed). ' +
  'No fabricated or unverified norm can render.');
process.exit(0);
