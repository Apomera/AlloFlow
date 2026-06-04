#!/usr/bin/env node
'use strict';
// check_lumen_floor.cjs — the Lumen integrity ship-gate (design §6 / §7 / §11).
//
// Loads the Node-exported pure kernel of stem_lab/stem_tool_lumen.js and asserts
// the honesty-floor invariants hold at RUNTIME (not by regex): the epistemic
// ladder, amber-only-at-L3 (color is never the sole channel), the small-n +
// hard AI n-floor gates, the L2 numeric-whitelist, the L3 ranked-set rule, the
// PII-free AI context, the HTML XSS escape, the IEP-team sign-off block, and the
// prose-template invariant. Exits non-zero on any violation so it can be wired
// into verify_all.cjs as a blocking check.
//
// Run: node dev-tools/check_lumen_floor.cjs [--quiet]

const path = require('path');
const QUIET = process.argv.includes('--quiet');

let L;
try {
  L = require(path.join(__dirname, '..', 'stem_lab', 'stem_tool_lumen.js'));
} catch (e) {
  console.error('check_lumen_floor: cannot load stem_tool_lumen.js — ' + (e && e.message));
  process.exit(1);
}

const fails = [];
function ok(cond, msg) { if (!cond) fails.push(msg); }

// 1. The epistemic ladder is L0..L3 (L4 "conjecture" deferred to v2).
ok(JSON.stringify(L.LEVELS) === JSON.stringify(['L0', 'L1', 'L2', 'L3']), 'LEVELS must be [L0,L1,L2,L3] (L4 deferred)');

// 2. Caution ink (amber) appears ONLY at L3, and L3 always carries a non-color channel.
ok(L.encode('L0').caution === false && L.encode('L1').caution === false &&
   L.encode('L2').caution === false && L.encode('L3').caution === true, 'amber/caution must be L3-only');
ok(L.encode('L3').texture === 'hatch45' && !!L.encode('L3').glyph, 'L3 must carry a non-color channel (texture + glyph)');
ok(L.encode('L0').labelOpacity === 1 && L.encode('L3').labelOpacity === 1, 'the level WORD must never fade (labelOpacity 1)');

// 3. The small-n rule and the hard AI n-floor.
ok(L.smallNStatus(2) === 'refuse' && L.smallNStatus(7) === 'flag' && L.smallNStatus(8) === 'ok', 'small-n rule must be n<3 refuse / n<8 flag');
ok(L.aiAllowed('L1', 99).allowed === false, 'AI must be OFF below the L2 ceiling');
ok(L.aiAllowed('L3', 7).allowed === false && L.aiAllowed('L3', 8).allowed === true, 'AI must require n>=8');

// 4. The L2 numeric-whitelist + a PII-free AI context.
const comp = L.makeCompendium('WCPM', 'words/min');
L.REYNA_SAMPLE.forEach(function (o) { L.addObservation(comp, o); });
const claim = L.deriveTrendClaim(comp, {});
const aiCtx = L.buildClaimContext(comp, claim);
ok(L.lintL2('grew 50% this term', aiCtx).ok === false, 'L2 numeric-whitelist must reject a fabricated number (50)');
ok(aiCtx.slope != null && !/name|student/i.test(JSON.stringify(aiCtx)), 'AI context must be PII-free numbers');

// 5. The L3 ranked set requires >=1 non-effect explanation; bands are ordinal, never a %.
ok(L.validateHypotheses([{ text: 'x', kind: 'effect', rank: 1 }, { text: 'y', kind: 'effect', rank: 2 }]).ok === false, 'L3 must require >=1 non-effect explanation');
ok(!/%/.test(L.rankBand(1)) && !/%/.test(L.rankBand(3)), 'L3 confidence bands must be ordinal words, never a percent');

// 6. The HTML export sink escapes injection (the symbol_studio printBook XSS lesson).
ok(L.escHtml('<img onerror=x>') === '&lt;img onerror=x&gt;', 'escHtml must neutralize HTML');
const evil = L.makeCompendium('WCPM<img src=x onerror=alert(1)>', 'w');
L.REYNA_SAMPLE.forEach(function (o) { L.addObservation(evil, o); });
const evilHtml = L.buildExportHtml(evil, L.deriveTrendClaim(evil, {}), { audience: 'iep-team' }).html;
ok(evilHtml.indexOf('<img src=x onerror') === -1, 'buildExportHtml must escape a hostile variable name');

// 7. An IEP-team export carrying an unsigned AI reading is BLOCKED; an owned one unblocks.
const hyps = L.validateHypotheses([{ text: 'a', kind: 'effect', rank: 1 }, { text: 'b', kind: 'null', rank: 2 }]).hypotheses;
ok(L.assertDefensible({ audience: 'iep-team', aiHyps: hyps, signoff: null }).blocked === true, 'unsigned L3 IEP-team export must be BLOCKED');
ok(L.assertDefensible({ audience: 'iep-team', aiHyps: hyps, signoff: L.signoffHash(hyps) }).blocked === false, 'an owned (matching-hash) sign-off must unblock');

// 8. The prose-template invariant: level word first, then the interval + n.
ok(/^Derived \(math\):/.test(claim.text) && /interval/.test(claim.text) && /n=/.test(claim.text), 'prose invariant (level word + interval + n) must hold');

// 9. Sourced provenance (§16): orthogonal SRC, curated spine refuses-on-empty, unverified export blocked.
ok(L.encode('SRC').isReference === true && L.encode('SRC').caution === false, 'SRC must be a non-caution reference channel');
ok(L.referenceContrastOK(), 'pal.reference must be colour-distinct from neutral + caution');
ok(JSON.stringify(L.LEVELS).indexOf('SRC') === -1, 'SRC must stay OUT of the LEVELS ladder');
ok(L.selectNorm(L.NORM_SPINE, { measure: 'ORF-WCPM', unit: 'words/min' }, { grade: 4, season: 'winter', percentile: 50 }).hazard === 'no-cell', 'curated spine ships EMPTY -> selectNorm refuses (no fabricated norm renders)');
ok(L.selectNorm(L.NORM_SPINE, { measure: 'ORF-WCPM', unit: 'words/min' }, { grade: 9, season: 'winter' }).hazard === 'out-of-range', 'selectNorm refuses an out-of-range grade');
ok(L.assertSourcedDefensible({ audience: 'iep-team', sourceRefs: [{ id: 's1', verified: false, citation: 'c', locator: 'https://x', value: 1 }] }).blocked === true, 'an unverified benchmark must block an IEP-team export');
ok(L.sourcedRenderable({ verified: true, citation: 'c', locator: 'javascript:alert(1)', value: 1 }).ok === false, 'a javascript: locator must not be renderable');

if (fails.length) {
  console.error('check_lumen_floor: ' + fails.length + ' FAILED');
  fails.forEach(function (f) { console.error('  x ' + f); });
  process.exit(1);
}
if (!QUIET) console.log('check_lumen_floor: OK — Lumen honesty-floor invariants hold (9 groups).');
process.exit(0);
