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
// The REAL spines must be in a CLEAN state — empty now, or fully reviewed later — but NEVER the
// filled-but-unreviewed laundering state. (State-aware so it keeps passing once a human populates+verifies.)
ok(L.validateNormSpine(L.NORM_SPINE).status !== 'invalid', 'NORM_SPINE must be empty-or-reviewed, never filled-but-unreviewed: ' + JSON.stringify(L.validateNormSpine(L.NORM_SPINE).problems));
ok(L.validateNormSpine(L.DIBELS8_ORF).status !== 'invalid', 'DIBELS8_ORF must be empty-or-reviewed, never filled-but-unreviewed: ' + JSON.stringify(L.validateNormSpine(L.DIBELS8_ORF).problems));
// selectNorm still refuses an empty cell — pinned on a guaranteed-empty SYNTHETIC spine, independent of the real spine's fill state.
ok(L.selectNorm({ measure: 'ORF-WCPM', unit: 'words/min', source: 'TEST', gradeRange: [1, 6], reviewedOn: null, cells: {} }, { measure: 'ORF-WCPM', unit: 'words/min' }, { grade: 4, season: 'winter', percentile: 50 }).hazard === 'no-cell', 'selectNorm must refuse an empty cell (no fabricated norm renders)');
ok(L.selectNorm(L.NORM_SPINE, { measure: 'ORF-WCPM', unit: 'words/min' }, { grade: 9, season: 'winter' }).hazard === 'out-of-range', 'selectNorm refuses an out-of-range grade');
// The gate BLOCKS the laundering states: filled-but-unreviewed, and reviewed-but-empty.
ok(L.validateNormSpine({ reviewedOn: null, cells: { 4: { winter: { p50: 112 } } } }).status === 'invalid', 'a filled-but-unreviewed spine MUST be invalid (blocks shipping unverified norms)');
ok(L.validateNormSpine({ reviewedOn: '2026-01-01', cells: {} }).status === 'invalid', 'a reviewed-but-empty spine MUST be invalid (no false verification claim)');
ok(L.validateNormSpine({ reviewedOn: '2026-01-01', cells: { 4: { winter: { p25: 130, p50: 112 } } } }).status === 'invalid', 'p25 > p50 MUST be invalid (catches a transcription error)');
ok(L.assertSourcedDefensible({ audience: 'iep-team', sourceRefs: [{ id: 's1', verified: false, citation: 'c', locator: 'https://x', value: 1 }] }).blocked === true, 'an unverified benchmark must block an IEP-team export');
ok(L.sourcedRenderable({ verified: true, citation: 'c', locator: 'javascript:alert(1)', value: 1 }).ok === false, 'a javascript: locator must not be renderable');

// 10. 2nd-variable / multi-series extension (scatter): conditional-spread byte-identity, conditional
//     schemaVersion, the single-var trend unchanged by y2, the association claim = correlation-not-causation
//     L1 (never amber), its n-floor refusal/flag, seriesKeys, and the data-table column byte-identity.
(function () {
  function pairedComp(rows) {
    var c = L.makeCompendium('WCPM', 'words/min', { variable2: 'Comprehension', unit2: '%' });
    rows.forEach(function (o) { L.addObservation(c, o); });
    return c;
  }
  var plain = L.makeCompendium('WCPM', 'words/min');
  L.REYNA_SAMPLE.forEach(function (o) { L.addObservation(plain, o); });
  var paired = pairedComp(L.PAIRED_SAMPLE);

  ok(('y2' in plain.observations[0]) === false && ('series' in plain.observations[0]) === false, 'conditional spread: a legacy row must NOT carry y2/series keys');
  ok(JSON.stringify(plain.observations[0]) === JSON.stringify({ id: 'o1', x: 1, y: 42, phase: 'baseline' }), 'a legacy row must serialize byte-identically (no phantom undefined keys)');
  ok(L.makeCompendium('a', 'b').schemaVersion === 2 && L.makeCompendium('a', 'b', { variable2: 'c' }).schemaVersion === 3, 'schemaVersion: 2 for single-var, 3 only for multi-var');

  var ct = L.deriveTrendClaim(plain, {}), cp = L.deriveTrendClaim(paired, {});
  ok(cp._hash === ct._hash, 'adding y2 to rows must NOT change the primary trend _hash (byte-identity)');
  ok(JSON.stringify(L.plotGeometry(paired.observations, cp, undefined, [])) === JSON.stringify(L.plotGeometry(plain.observations, ct, undefined, [])), 'the trend geometry must be byte-identical when other rows carry y2');

  var assoc = L.deriveAssociationClaim(paired, {});
  ok(assoc.kind === 'association' && assoc.level === 'L1' && L.encode(assoc.level).caution === false, 'association must be L1 (never amber/L3)');
  ok(/not causation/i.test(assoc.text), 'the association sentence MUST carry the not-causation caveat (copy-survivable)');
  ok(L.deriveAssociationClaim(pairedComp(L.PAIRED_SAMPLE.slice(0, 2)), {}).refused === true, 'association must refuse n<3 paired points');
  var flagged = L.deriveAssociationClaim(pairedComp(L.PAIRED_SAMPLE.slice(0, 5)), {});
  ok(flagged.refused !== true && flagged.small === true, 'association must flag 3<=n<8 (small)');
  ok(L.deriveAssociationClaim(pairedComp(L.PAIRED_SAMPLE), {}).small === false, 'association must NOT flag at n>=8');

  var sg = L.plotGeometry(paired.observations, assoc, undefined, [], 'scatter');
  ok(sg.chartType === 'scatter' && sg.scatterPoints.length === L.PAIRED_SAMPLE.length && sg.scatterPoints.every(function (p) { return p.level === 'L0'; }), 'scatter points must be the L0 observed pairs');
  ok(sg.points === undefined && sg.trendPath === undefined, 'scatter must not emit the trend points/line keys');
  ok(JSON.stringify(L.seriesKeys(L.REYNA_SAMPLE)) === '[]', 'seriesKeys must be [] for legacy single-series data');
  ok(JSON.stringify(L.dataTableModel(L.REYNA_SAMPLE, ct)) === JSON.stringify(L.dataTableModel(L.REYNA_SAMPLE, ct, [])), 'a legacy trend data table must be byte-identical with/without the sourceRefs arg');

  // multi-series line: colour-channel guard, per-series single-slope claims, per-series determinism,
  // and the no-series (pooled) trend claim staying byte-identity-clean (no seriesKey).
  ok(L.seriesColorOK(), 'series colours must be distinct from the caution/reference/neutral ink (no L3-amber collision)');
  var multi = L.makeCompendium('WCPM', 'words/min');
  L.MULTI_SAMPLE.forEach(function (o) { L.addObservation(multi, o); });
  var mkeys = L.seriesKeys(multi.observations);
  ok(mkeys.length === 2, 'seriesKeys must enumerate every series tag (anti-cherry-pick)');
  var msClaims = mkeys.map(function (k) { return L.deriveTrendClaim(multi, { series: k }); });
  ok(msClaims.every(function (c) { return typeof c.estimate.slope === 'number' && c.seriesKey != null; }), 'each per-series claim carries ONE slope (single-slope-per-claim) tagged with its seriesKey');
  ok(L.deriveTrendClaim(multi, {}).seriesKey === undefined, 'the no-series (pooled) trend claim must carry NO seriesKey (byte-identity)');
  var mg = L.plotGeometry(multi.observations, msClaims, undefined, [], 'multiSeriesLine');
  ok(mg.seriesGeo.length === 2 && mg.seriesGeo.every(function (s) { return s.points.every(function (p) { return p.level === 'L0'; }); }), 'multiSeriesGeometry: one series-geo per tag, observed (L0) points');
  var twin = L.makeCompendium('v', 'u');
  [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (x) { var y = x * 1.5 + (x % 2 ? 2 : -1); L.addObservation(twin, { x: x, y: y, series: 'a' }); L.addObservation(twin, { x: x, y: y, series: 'b' }); });
  var ca = L.deriveTrendClaim(twin, { series: 'a' }), cb = L.deriveTrendClaim(twin, { series: 'b' });
  ok(JSON.stringify(ca.estimate.bootstrap) !== JSON.stringify(cb.estimate.bootstrap), 'two series with IDENTICAL points must get distinct (series-seeded) bootstrap intervals — the per-series-seed footgun');

  // grouped bar: 0-baseline (no truncated-axis lie), one slot per series per group, empty cell => no bar,
  // and the <=1-series delegation to the legacy bar (byte-identity).
  var gb = L.plotGeometry(multi.observations, null, undefined, [], 'groupedBar');
  ok(gb.chartType === 'groupedBar' && gb.y0 <= 0, 'grouped bar must include 0 in the value axis (no truncated-axis lie)');
  ok(gb.groups.length >= 1 && gb.groups[0].bars.length === mkeys.length, 'grouped bar: one bar slot per series within each phase group');
  ok(L.plotGeometry(L.REYNA_SAMPLE, null, undefined, [], 'groupedBar').chartType === 'bar', 'a <=1-series grouped bar must DELEGATE to the legacy bar (byte-identity)');
  var gap = L.makeCompendium('v', 'u');
  [{ x: 1, y: 5, phase: 'a', series: 'p' }, { x: 2, y: 6, phase: 'a', series: 'p' }, { x: 1, y: 9, phase: 'b', series: 'p' }, { x: 1, y: 8, phase: 'b', series: 'q' }, { x: 2, y: 7, phase: 'b', series: 'q' }].forEach(function (o) { L.addObservation(gap, o); });
  var gg = L.plotGeometry(gap.observations, null, undefined, [], 'groupedBar');
  var aGrp = gg.groups.filter(function (x) { return x.phase === 'a'; })[0];
  ok(aGrp && aGrp.bars.some(function (b) { return b.empty === true; }), 'an empty (phase × series) cell must be flagged empty — no fabricated bar');

  // color-blind-safe categorical channel (WCAG 1.4.1): series are ALSO keyed by dash +
  // shape + texture, so hue is never the only cue. Series 0 is the unchanged solid/circle/solid.
  ok(L.seriesDash(0) === 'none' && L.seriesShape(0) === 'circle' && L.seriesTexture(0) === 'solid', 'series 0 stays solid/circle/solid (single-series chart unchanged)');
  ok(L.seriesDash(1) !== 'none' && L.seriesShape(1) !== 'circle' && L.seriesTexture(1) !== 'solid', 'series 1 differs from series 0 in ALL THREE non-colour channels');
  var dashes = [0, 1, 2, 3, 4, 5].map(L.seriesDash), shapes = [0, 1, 2, 3].map(L.seriesShape), texs = [0, 1, 2, 3, 4, 5].map(L.seriesTexture);
  ok(new Set(dashes).size === dashes.length, 'the 6 series dashes are mutually distinct');
  ok(new Set(shapes).size === shapes.length, 'the 4 series shapes are mutually distinct');
  ok(new Set(texs).size === texs.length, 'the 6 series textures are mutually distinct');
  ok(L.seriesDash(6) === L.seriesDash(0) && L.seriesShape(4) === L.seriesShape(0), 'series channels cycle (never throw / run off the end)');
})();

// 11. INGEST (design §5 Pillar 1) — pure-parser invariants. Imports MUST
//     land as L0 (verbatim echo), MUST refuse to invent values, MUST never
//     drop a row silently (kept + dropped = total), and the parser caps +
//     RFC-4180 quoting MUST hold. Headers MUST be tolerated as strings so a
//     header that looks like a student name never reaches the AI surface
//     (PII-free buildClaimContext is already proven above; this group
//     adds the parse-layer assertions).
(function () {
  // Pure-parse happy path
  var t = L.parseTextTable('week,wcpm,phase\n1,42,baseline\n2,45,baseline\n6,53,tier2');
  ok(t.delimiter === ',' && t.headers.length === 3 && t.rows.length === 3, 'parseTextTable: simple CSV with header parses to 3 rows / 3 headers / comma delim');
  ok(t.notes.length === 0 && t.error === undefined, 'parseTextTable: clean input emits no notes/error');

  // Delimiter autodetect (TAB and ;)
  ok(L.parseTextTable('a\tb\n1\t2').delimiter === '\t', 'parseTextTable: autodetects TAB delimiter');
  ok(L.parseTextTable('a;b\n1;2').delimiter === ';', 'parseTextTable: autodetects semicolon delimiter');

  // hasHeader downgrade on all-numeric first row
  var nh = L.parseTextTable('1,42\n2,45');
  ok(nh.headers[0] === 'col1' && nh.rows.length === 2, 'parseTextTable: all-numeric first row downgrades hasHeader');

  // RFC-4180 quoted with embedded delimiter
  var q = L.parseTextTable('label,value\n"Smith, J",10');
  ok(q.rows[0][0] === 'Smith, J', 'parseTextTable: handles embedded delimiter inside quoted field');

  // BOM strip + CRLF
  var b = L.parseTextTable('﻿week,wcpm\r\n1,42');
  ok(b.headers[0] === 'week' && b.rows[0][1] === '42', 'parseTextTable: strips BOM and normalizes CRLF');

  // Mapping: kept + dropped == total (no silent loss)
  var m = L.mapTextTableToObservations(L.parseTextTable('x,y\n1,1\n2,bad\n3,3\n,99\n4,4'), { xCol: 0, yCol: 1 });
  var total = L.parseTextTable('x,y\n1,1\n2,bad\n3,3\n,99\n4,4').rows.length;
  ok(m.rows.length + m.dropped.length === total, 'mapTextTableToObservations: kept + dropped = total (no silent loss)');
  ok(m.dropped.every(function (d) { return d.reason === 'missing-xy' || d.reason === 'non-numeric-xy'; }), 'every dropped row carries a structured reason');

  // L0 contract: imported observations are bindable into a compendium and the round-trip claim is L1
  var compIng = L.makeCompendium('WCPM', 'words/min');
  m.rows.forEach(function (r) { L.addObservation(compIng, r); });
  // 3 valid rows → small-N flag, not refuse
  var cIng = L.deriveTrendClaim(compIng, {});
  ok(cIng.level === 'L1', 'imported observations derive a deterministic L1 claim (round-trip)');

  // PII safety: a header that LOOKS like a student name does not leak into the AI context
  var compPii = L.makeCompendium('WCPM', 'words/min');
  var pt = L.parseTextTable('Reyna_Hernandez_grade4,wcpm,phase\n1,42,baseline\n2,45,baseline\n6,53,tier2\n7,58,tier2\n8,61,tier2\n9,60,tier2\n10,66,tier2\n11,70,tier2');
  L.mapTextTableToObservations(pt, { xCol: 0, yCol: 1, phaseCol: 2 }).rows.forEach(function (r) { L.addObservation(compPii, r); });
  var ctxPii = L.buildClaimContext(compPii, L.deriveTrendClaim(compPii, {}));
  var ctxJson = JSON.stringify(ctxPii);
  ok(!/reyna|hernandez|student/i.test(ctxJson), 'buildClaimContext from an imported file with a PII-flavored header MUST NOT leak the header text to AI');

  // y2 / series conditional spread (single-var byte-identity is load-bearing)
  var m2 = L.mapTextTableToObservations(L.parseTextTable('x,y\n1,2'), { xCol: 0, yCol: 1 });
  ok(!('y2' in m2.rows[0]) && !('series' in m2.rows[0]), 'mapTextTableToObservations: a single-var mapping must NOT carry y2/series keys (byte-identity)');

  // Parser caps + structured error shape
  var huge = 'a,b\n' + Array(L.INGEST_MAX_BYTES + 1).join('1');
  ok(L.parseTextTable(huge).error && /MB limit/.test(L.parseTextTable(huge).error), 'parseTextTable: refuses files over INGEST_MAX_BYTES with a structured error');

  // File-type guard
  ok(L.ingestFileTypeFromName('a.csv') === 'csv' && L.ingestFileTypeFromName('a.xlsx') === 'xlsx' && L.ingestFileTypeFromName('a.pdf') === null, 'ingestFileTypeFromName: csv/xlsx accepted; pdf (unsafe-without-OCR) rejected');

  // Mapping invariant: xCol/yCol are REQUIRED (refuses a partial mapping)
  ok(L.mapTextTableToObservations(t, { xCol: 0 }).error, 'mapTextTableToObservations: refuses a partial mapping (xCol+yCol both required)');

  // SheetJS wrapper graceful failure
  ok(L.parseWorkbookSheet(null, new ArrayBuffer(0)).error && /SheetJS/.test(L.parseWorkbookSheet(null, new ArrayBuffer(0)).error), 'parseWorkbookSheet: SheetJS-missing case returns a structured error, never throws');
})();

// 12. §16 SOURCED Phase 2A — benchmark-document workspace invariants.
//     The §16.1 separation rule + §16.4 always-unverified-by-construction
//     contract get explicit gates here so a future refactor can't quietly
//     erode them. A cell never reaches the spine without an explicit
//     signoffSpineCell call; a stale (post-edit) cell re-blocks; the
//     bind step never touches comp.observations; spineCellsToJSON is
//     deterministic across re-runs.
(function () {
  // Pure scaffold path
  var scaffold = L.buildSpineCellScaffold(L.NORM_SPINE, { grades: [4], seasons: ['winter'], percentiles: [50] });
  ok(scaffold.length === 1 && scaffold[0].verified === false && scaffold[0].signoffHash === null, 'buildSpineCellScaffold: single G4 winter p50 cell is unverified by default');

  // Validate refuses non-positive value + non-http locator
  var bad = Object.assign({}, scaffold[0], { value: 0, locator: 'javascript:alert(1)' });
  var vBad = L.validateProposedSpineCell(bad);
  ok(!vBad.ok && vBad.errors.indexOf('value-not-positive-number') !== -1 && vBad.errors.indexOf('locator-not-http-url') !== -1, 'validateProposedSpineCell: refuses value<=0 + non-http locator');

  // Signoff requires a real reviewedOn ISO; no implicit Date
  var c1 = Object.assign({}, scaffold[0], { value: 120 });
  ok(L.signoffSpineCell(c1, null).ok === false, 'signoffSpineCell: refuses missing reviewedOn (no implicit Date in the pure layer)');
  var sr = L.signoffSpineCell(c1, '2026-06-05');
  ok(sr.ok === true && c1.verified === true && c1.signoffHash != null, 'signoffSpineCell: valid call mutates verified + reviewedOn + signoffHash');
  ok(c1.signoffHash === L.sourcedSignoffHash(c1), 'signoffSpineCell: hash equals sourcedSignoffHash (consistent stale-detection)');

  // Bind: refuses unverified, detects stale, refuses value-collision
  ok(L.bindVerifiedCellsToSpine({}, [Object.assign({}, scaffold[0], { value: 120 })]).added === 0, 'bind: refuses an unverified cell (verified:false)');
  var stale = Object.assign({}, c1, { value: 121 }); // edited after signoff
  ok(L.bindVerifiedCellsToSpine({}, [stale]).collisions[0].reason === 'stale-signoff', 'bind: detects a stale (post-signoff-edit) cell');
  var existing = { 4: { winter: { p50: 120 } } };
  var collide = (function () { var cc = Object.assign({}, scaffold[0], { value: 999 }); L.signoffSpineCell(cc, '2026-06-05'); return cc; })();
  ok(L.bindVerifiedCellsToSpine(existing, [collide]).collisions[0].reason === 'value-collision', 'bind: refuses overwrite-with-different-value (stable-spine)');
  // Idempotent identical-value re-bind
  var same = (function () { var cc = Object.assign({}, scaffold[0], { value: 120 }); L.signoffSpineCell(cc, '2026-06-05'); return cc; })();
  ok(L.bindVerifiedCellsToSpine(existing, [same]).added === 1, 'bind: identical-value re-bind is idempotent (no collision)');

  // §16.1 separation invariant: the bind never touches comp.observations
  var comp = L.makeCompendium('ORF-WCPM', 'words/min', { measure: 'ORF-WCPM' });
  L.REYNA_SAMPLE.forEach(function (o) { L.addObservation(comp, o); });
  var nObsBefore = comp.observations.length;
  var sCell = (function () { var cc = Object.assign({}, scaffold[0], { value: 120 }); L.signoffSpineCell(cc, '2026-06-05'); return cc; })();
  L.bindVerifiedCellsToSpine({}, [sCell]);
  ok(comp.observations.length === nObsBefore && comp.observations.every(function (o) { return o.y !== 120 || o.x !== 4; }), '§16.1 separation: bindVerifiedCellsToSpine never adds to comp.observations');

  // spineCellsToJSON is deterministic (sorted grade → fall/winter/spring → p25/p50/p75)
  var cells = { 4: { winter: { p50: 120 }, fall: { p50: 90 }, spring: { p50: 110 } }, 1: { winter: { p75: 50, p25: 10 } } };
  var json1 = L.spineCellsToJSON(cells);
  var json2 = L.spineCellsToJSON(cells);
  ok(json1 === json2, 'spineCellsToJSON: deterministic across re-runs (sorted)');
  ok(json1.indexOf('"1"') < json1.indexOf('"4"'), 'spineCellsToJSON: grades sorted numerically');
  var g4 = json1.slice(json1.indexOf('"4"'));
  ok(g4.indexOf('fall') < g4.indexOf('winter') && g4.indexOf('winter') < g4.indexOf('spring'), 'spineCellsToJSON: seasons sorted fall → winter → spring');

  // Extractor failure modes never throw
  ok(L.normalizeBenchExtraction(null).kind === 'empty', 'normalizeBenchExtraction: null input → kind:empty (no throw)');
  ok(L.benchDocTypeFromName('a.pdf') === 'pdf' && L.benchDocTypeFromName('a.docx') === 'docx' && L.benchDocTypeFromName('a.png') === null, 'benchDocTypeFromName: pdf+docx accepted; png (handwritten OCR risk) rejected');
})();

// ── GROUP 13: synthetic PRACTICE data is ALWAYS flagged + ALWAYS export-guarded ──
// The "generate sample" feature must never let fabricated data pose as observed
// (L0) data or reach a defensible IEP export.
(function () {
  function compFrom(rs) { var c = L.makeCompendium('WCPM', 'words/min'); rs.forEach(function (r) { L.addObservation(c, r); }); return c; }
  var rows = L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'floor' });
  ok(rows.length === 10 && rows.every(function (r) { return r.synthetic === true; }), 'SYN: every generated row carries synthetic:true');
  ok(JSON.stringify(L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'floor' })) === JSON.stringify(rows), 'SYN: generator is deterministic for a fixed seed');
  ok(JSON.stringify(L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'floor2' })) !== JSON.stringify(rows), 'SYN: a different seed re-rolls');
  ok(L.generatePracticeData().length >= 3, 'SYN: default args never return below the n<3 refuse floor');
  ok(L.generatePracticeData({ n: 1 }).length === 3 && L.generatePracticeData({ n: 999 }).length === 60, 'SYN: n clamps to [3,60]');

  var synC = compFrom(rows);
  var realC = compFrom([{ x: 1, y: 42, phase: 'b' }, { x: 2, y: 45, phase: 'b' }, { x: 3, y: 50, phase: 'b' }]);
  ok(L.compHasSynthetic(synC) === true, 'SYN: compHasSynthetic true for generated data');
  ok(L.compHasSynthetic(compFrom([{ x: 1, y: 2 }, { x: 2, y: 3, synthetic: true }])) === true, 'SYN: a single fabricated row taints the set (fail-safe)');
  ok(L.compHasSynthetic(realC) === false, 'SYN: all-real data is not synthetic');

  ok(L.LEVELS.indexOf('SYN') === -1, 'SYN: not in LEVELS (the AI dial can never reach it)');
  ok((function () { try { return L.encode('SYN').srWord === 'Synthetic (practice)'; } catch (e) { return false; } })(), 'SYN: encode(SYN) resolves to the practice word');

  var synClaim = L.deriveTrendClaim(synC, {});
  var synBars = L.barGeometry(synC.observations, synClaim).bars.map(function (m) { return m.level; });
  var realBars = L.barGeometry(realC.observations, L.deriveTrendClaim(realC, {})).bars.map(function (m) { return m.level; });
  ok(synBars.length > 0 && synBars.every(function (x) { return x === 'SYN'; }), 'SYN: synthetic marks burn SYN');
  ok(realBars.length > 0 && realBars.every(function (x) { return x === 'L0'; }), 'SYN: real marks stay L0 (byte-identity)');

  ok(L.assertExportClean({ audience: 'iep-team', synthetic: true }).blocked === true, 'SYN: iep-team synthetic export is BLOCKED');
  ok(L.assertExportClean({ audience: 'iep-team', synthetic: true, signoff: 'x' }).blocked === true, 'SYN: no signoff clears the synthetic block');
  ok(L.assertExportClean({ audience: 'working', synthetic: true }).blocked === false, 'SYN: working/family synthetic export still allowed (watermarked)');
  ok(L.assertExportClean({ audience: 'iep-team', synthetic: false }).blocked === false, 'SYN: a real iep-team export is not blocked by the synthetic clause');
  ok(/SYNTHETIC/.test(L.buildExportHtml(synC, synClaim, { audience: 'working', synthetic: true }).html), 'SYN: HTML export carries the SYNTHETIC watermark');
  ok(!/SYNTHETIC/.test(L.buildExportHtml(realC, L.deriveTrendClaim(realC, {}), { audience: 'working' }).html), 'SYN: a real HTML export carries no SYNTHETIC marker');
  var synCsv = L.buildExportCsv(synC, synClaim, { includePII: true, synthetic: true });
  ok(/SYNTHETIC/.test(synCsv.csv) && /Synthetic \(practice\)/.test(synCsv.csv) && /SYNTHETIC/.test(synCsv.filename), 'SYN: CSV export marks rows + filename');

  var realRows = [{ x: 1, y: 42, phase: 'b' }, { x: 2, y: 45, phase: 'b' }, { x: 3, y: 50, phase: 't' }, { x: 4, y: 55, phase: 't' }];
  var synRows = realRows.map(function (r) { return Object.assign({}, r, { synthetic: true }); });
  ok(L.deriveTrendClaim(compFrom(synRows), {})._hash === L.deriveTrendClaim(compFrom(realRows), {})._hash, 'SYN: synthetic flag never perturbs the claim _hash');
  ok(!('synthetic' in L.buildClaimContext(compFrom(synRows), L.deriveTrendClaim(compFrom(synRows), {}))), 'SYN: synthetic never enters the AI context');
  ok(Object.keys(compFrom([{ x: 1, y: 2, phase: 'a' }]).observations[0]).join(',') === 'id,x,y,phase', 'SYN: a real row has no phantom synthetic key (byte-identity)');
})();

// 14. PRESENTATION export (design: the in-app Present mode IS what exports). Same
//     honesty contract as the brief — synthetic watermark, FERPA opt-in for the
//     per-row table, max-epistemic-level footer, hostile-name escaping — and the
//     inlined LIVE svg is sanitized (no <script>/on*-handler) while the chart survives.
(function () {
  function cf(rs) { var c = L.makeCompendium('WCPM', 'words/min'); rs.forEach(function (r) { L.addObservation(c, r); }); return c; }
  var realC = cf([{ x: 1, y: 42, phase: 'b' }, { x: 2, y: 45, phase: 'b' }, { x: 3, y: 50, phase: 't' }, { x: 4, y: 55, phase: 't' }]);
  var realClaim = L.deriveTrendClaim(realC, {});

  var pres = L.buildPresentationHtml(realC, realClaim, { audience: 'working' });
  ok(/max epistemic level L1/.test(pres.html), 'PRES: real presentation footer prints the max epistemic level');
  ok(!/SYNTHETIC/.test(pres.html), 'PRES: a real presentation carries no SYNTHETIC marker');
  ok(/finding-only \(no identifiable rows\)/.test(pres.html) && /omitted from this finding-only presentation/.test(pres.html), 'PRES: default presentation is FERPA finding-only (no per-row table)');
  ok(/-summary\.html$/.test(pres.filename), 'PRES: finding-only filename ends -summary.html');

  var presPII = L.buildPresentationHtml(realC, realClaim, { audience: 'working', includePII: true });
  ok(/<table>/.test(presPII.html) && /CONFIDENTIAL \(identifiable\)/.test(presPII.html) && /-CONFIDENTIAL\.html$/.test(presPII.filename), 'PRES: opt-in PII embeds the table + CONFIDENTIAL footer + filename');

  var synRows = L.generatePracticeData({ scenario: 'improving', n: 8, seed: 'pres' });
  var synC = cf(synRows);
  var synPres = L.buildPresentationHtml(synC, L.deriveTrendClaim(synC, {}), { audience: 'working', synthetic: true });
  ok(/SYNTHETIC/.test(synPres.html) && /PRACTICE/.test(synPres.filename), 'PRES: a synthetic presentation carries the watermark + PRACTICE filename');

  var evil = cf([{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 4 }]);
  evil.variable = '<img src=x onerror=alert(1)>';
  ok(L.buildPresentationHtml(evil, L.deriveTrendClaim(evil, {}), {}).html.indexOf('<img src=x onerror') === -1, 'PRES: a hostile variable name is escaped');

  var hostileSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect onload="alert(2)" x="0" y="0"/><text>ok</text></svg>';
  var presSvg = L.buildPresentationHtml(realC, realClaim, { audience: 'working', chartSvg: hostileSvg });
  ok(presSvg.html.indexOf('<script>') === -1 && presSvg.html.indexOf('onload') === -1 && /<figure class="chart">/.test(presSvg.html) && /<text>ok<\/text>/.test(presSvg.html), 'PRES: the inlined live SVG is sanitized (no <script>/on*-handler) but the chart survives');
})();

if (fails.length) {
  console.error('check_lumen_floor: ' + fails.length + ' FAILED');
  fails.forEach(function (f) { console.error('  x ' + f); });
  process.exit(1);
}
if (!QUIET) console.log('check_lumen_floor: OK — Lumen honesty-floor invariants hold (14 groups, incl. §16 Phase 2A workspace + synthetic practice-data guard + presentation export).');
process.exit(0);
