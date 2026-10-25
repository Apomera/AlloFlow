'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), vm = require('node:vm');
const folder = 'reports/decomposer-phase-reaction-wcag';
const run = process.argv.find(value => value.startsWith('--run='))?.slice(6) || 'candidate-v2';
const themeRun = 'verified-themes';
assert.ok(/^[a-z0-9-]+$/.test(run));
const read = file => fs.readFileSync(path.resolve(file));
const json = file => JSON.parse(read(file));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const source = read('stem_lab/stem_tool_decomposer.js'), sourceSha256 = hash(source);
new vm.Script(source.toString());
assert.equal(hash(read('desktop/web-app/public/stem_lab/stem_tool_decomposer.js')), sourceSha256);
const catalogs = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
assert.equal(hash(read(catalogs[0])), hash(read(catalogs[1])), 'Catalog mirrors differ');
const catalog = json(catalogs[0]).stem.decomposer;
for (const key of ['phase_data_missing','phase_model_limit','phase_result','phase_unavailable','phase_model_boundary','phase_no_liquid_range',
  'phase_particle_description','solid_particle_description','liquid_particle_description','gas_particle_description',
  'particle_motion_paused','particle_motion_running','state_particle_model','atom_particle_model','atom_element_count','atom_particle_description',
  'atom_assembled','atom_separated','badge_requirements','challenge_requirements','badge_earned','badge_not_earned','goal_complete','goal_not_complete','remove_material_a','remove_material_b']) {
  assert.equal(typeof catalog[key], 'string', 'Missing translation: ' + key);
}
const testsPath = folder + '/unit-tests.json', tests = json(testsPath);
assert.ok(tests.success && tests.numFailedTests === 0 && tests.numPassedTests === 107, 'Focused tests must pass');
for (const entry of json(folder + '/unit-source.json')) assert.equal(hash(read(entry.path)), entry.sha256, 'Stale unit evidence: ' + entry.path);
const nativePath = folder + '/' + run + '/results.json', native = json(nativePath);
const layoutSource = read(native.sourcePath);
assert.equal(hash(layoutSource), native.sourceSha256, 'Frozen layout source changed');
const oldInk = "earned && h('div', { className: 'text-[0.6875rem] text-amber-500 font-bold' }, '+' + b.xp + ' XP')";
const finalInk = oldInk.replace('text-amber-500', 'text-amber-700');
let layoutBinding = 'Exact current source';
if (native.sourceSha256 !== sourceSha256) {
  const oldProgress = "h('div', { className: 'px-4 py-3 flex items-center justify-between', style: { background: globalPct === 100 ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)' } },";
  const finalProgress = "h('div', { 'data-decomposer-total-progress': true, className: 'px-4 py-3 flex items-center justify-between', style: { background: isContrast ? '#000' : globalPct === 100 ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)' } },";
  const oldPercent = "color: globalPct === 100 ? '#059669' : '#d97706'";
  const finalPercent = "color: globalPct === 100 ? '#065f46' : '#92400e'";
  let transformed = layoutSource.toString();
  for (const [before, after] of [[oldInk,finalInk],[oldProgress,finalProgress],[oldPercent,finalPercent]]) {
    assert.equal(transformed.split(before).length, 2, 'Ambiguous final palette delta');
    transformed = transformed.replace(before, after);
  }
  assert.equal(transformed, source.toString(), 'Changes beyond the exact reviewed palette delta require new layout evidence');
  layoutBinding = 'Complete source difference is exactly three palette areas: earned-badge ink, Hunt progress surface in app contrast (with its data hook), and incomplete/completed percentage inks. Final colors are checked on the current source separately.';
}
const auditNames = native.audits.map(audit => audit.name);
const layoutChecks = native.checks.filter(check => !auditNames.some(name => check.name.startsWith(name + ' ')));
assert.ok(layoutChecks.every(check => check.ok), 'A non-theme native check failed');
assert.ok(native.checks.filter(check => !check.ok).every(check => check.name === 'hunt-goals-light no confirmed automated WCAG finding'), 'An unexpected historical native finding remains');
const states = ['reaction-long-picked','reaction-unknown-result','reaction-known-result','states-calcium-carbonate','states-water-gas','explore-decomposed-salt'];
for (const [width, kind] of [[320,'normal'],[320,'spacing'],[320,'size200'],[640,'size200']]) for (const state of states) {
  const rows = native.cases.filter(row => row.label === [width,kind,state].join('-'));
  assert.equal(rows.length, 1, 'Missing/duplicate core layout case');
}
for (const kind of ['spacing','size200']) assert.ok(native.cases.some(row => row.state === 'expanded-goals' && row.kind === kind));
for (const row of native.cases) {
  assert.ok(row.page.scrollWidth <= row.page.clientWidth + 1, row.label + ' page overflow');
  assert.equal(row.textOutsideCell.length, 0, row.label + ' text outside cell');
  assert.equal(row.controlsOverflow.length, 0, row.label + ' overflowing control');
  assert.ok(row.clippedText.every(item => item.accessibleScroll), row.label + ' inaccessible clipping');
  assert.equal(row.verticalOverlaps.length, 0, row.label + ' overlapping text');
  if (row.kind === 'size200') assert.equal(row.exactTextSize.actual, row.exactTextSize.base * 2, row.label + ' text resize');
  for (const focus of row.focus || []) if (!focus.absent && !focus.disabled) assert.ok(focus.hit && focus.visibleFocus && focus.centerInViewport);
}
assert.ok(native.phaseBehavior.length >= 7 && native.goals.length === 4, 'Missing phase/disclosure behavior evidence');
const themesPath = folder + '/' + themeRun + '/results.json', themes = json(themesPath);
assert.equal(themes.sourceSha256, sourceSha256, 'Final theme evidence is stale');
assert.equal(hash(read(themes.sourcePath)), sourceSha256);
assert.ok(themes.success && themes.failed === 0 && themes.checks.every(check => check.ok));
assert.equal(themes.audits.length, 13, 'Missing targeted theme audits');
const inks = themes.audits.flatMap(audit => audit.conditionalInks || []);
assert.ok(themes.audits.every(audit => audit.violations.length === 0), 'Confirmed automated finding');
assert.ok(inks.length > 0 && inks.every(ink => ink.contrast.known && ink.contrast.minimumSampledContrast >= 4.5), 'Conditional text contrast');
assert.equal(themes.progressPalette.length, 8, 'Missing progress palette cases');
for (const mode of ['light','dark','contrast','forced-colors']) for (const complete of [false,true]) {
  const matches = themes.progressPalette.filter(row => row.mode === mode && row.complete === complete);
  assert.equal(matches.length, 1, 'Missing/duplicate progress state');
  assert.deepEqual(matches[0].targets.map(target => target.name).sort(), ['count','label','percent']);
  assert.ok(matches[0].targets.every(target => target.contrast.known && target.contrast.minimumSampledContrast >= 4.5));
}
assert.equal(native.errors.length, 0); assert.equal(native.networkFailures.length, 0);
assert.ok(native.browsersClosed && native.browserTempCleaned);
assert.equal(themes.errors.length, 0); assert.equal(themes.networkFailures.length, 0);
assert.ok(themes.browsersClosed && themes.browserTempCleaned);
for (const capture of native.captures) assert.equal(hash(read(capture.path)), capture.sha256, 'Changed capture: ' + capture.path);
for (const capture of themes.captures) assert.equal(hash(read(capture.path)), capture.sha256, 'Changed theme capture: ' + capture.path);
const visual = json(folder + '/visual-review.json');
assert.equal(visual.sourceSha256, sourceSha256);
assert.ok(visual.captures.length >= 4 && visual.captures.every(capture => capture.reviewed && [sourceSha256,native.sourceSha256].includes(capture.sourceSha256) && hash(read(capture.path)) === capture.sha256));
const summary = {
  success: true, sourceSha256, catalogSha256: hash(read(catalogs[0])),
  unitTests: { passed: tests.numPassedTests, failed: 0, newMountedTests: 32, result: testsPath, sha256: hash(read(testsPath)) },
  native: { layoutAndBehaviorChecks: layoutChecks.length, failedLayoutAndBehaviorChecks: 0, layouts: native.cases.length,
    sourceSha256: native.sourceSha256, layoutBinding, historicalFinding: 'The later Hunt goals audit exposed low-contrast earned-badge XP, and a color-only follow-up exposed the progress percentage. The final-source theme follow-up verifies both corrections.',
    result: nativePath, sha256: hash(read(nativePath)), browsersClosed: native.browsersClosed, browserTempCleaned: native.browserTempCleaned },
  finalThemes: { checks: themes.passed, failed: 0, sourceSha256, themeAudits: themes.audits.length, confirmedAutomatedViolations: 0,
    conditionalInkSamples: inks.length, minimumConditionalContrast: Math.min(...inks.map(ink => ink.contrast.minimumSampledContrast)),
    progressPaletteCases: themes.progressPalette.length, progressInkSamples: 24, minimumProgressContrast: Math.min(...themes.progressPalette.flatMap(row => row.targets.map(target => target.contrast.minimumSampledContrast))),
    result: themesPath, sha256: hash(read(themesPath)) },
  changes: [
    'A shared phase decision drives text and drawing. Missing thresholds and temperatures beyond a decomposition-limited model produce a clear explanation instead of a fabricated phase.',
    'States and Atoms have visible, associated text alternatives for temperature, arrangement, composition and motion state; phase results use a quiet persistent status.',
    'Reaction removals name the slot and material and return focus to the corresponding palette control.',
    'Native disclosures expose all challenge goals and badge requirements with explicit completion text while retaining saved credit.',
    'Phase facts reflow at enlarged text; Material B, earned-badge XP and Hunt progress percentages use darker ink, with an explicit black progress surface in app contrast.'
  ],
  limits: 'Targeted WCAG improvement evidence, not complete conformance certification, literal browser-zoom testing, spoken screen-reader verification or a chemistry-data audit. Existing catalog thresholds are retained; unsupported model ranges are disclosed. Earlier source-bound audit reports remain historical and were not overwritten.',
  references: ['https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
    'https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html',
    'https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html'],
  visualReview: folder + '/visual-review.json', noCommit: true
};
fs.writeFileSync(folder + '/validation-summary.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
