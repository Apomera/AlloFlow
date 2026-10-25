'use strict';
const fs = require('node:fs'), crypto = require('node:crypto'), vm = require('node:vm');
const assert = require('node:assert/strict');
const folder = 'reports/decomposer-hunt-navigation-wcag';
const read = file => fs.readFileSync(file), json = file => JSON.parse(read(file));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const source = read('stem_lab/stem_tool_decomposer.js'), sourceSha256 = hash(source);
new vm.Script(source.toString());
assert.equal(hash(read('desktop/web-app/public/stem_lab/stem_tool_decomposer.js')), sourceSha256);
assert.equal(hash(read('ui_strings.js')), hash(read('desktop/web-app/public/ui_strings.js')));
const catalog = json('ui_strings.js').stem.decomposer;
for (const key of ['hunt_scene_complete_status','hunt_next_target_status','hunt_no_target_status','hunt_identified_object']) assert.equal(typeof catalog[key], 'string');
const unitsPath = folder + '/unit-tests.json', units = json(unitsPath);
assert.ok(units.success && units.numPassedTests === 139 && units.numFailedTests === 0);
const unitSources = json(folder + '/unit-source.json'); assert.equal(unitSources.length, 12);
for (const file of unitSources) assert.equal(hash(read(file.path)), file.sha256, 'Stale unit evidence: ' + file.path);
const nativePath = folder + '/readable/results.json', native = json(nativePath);
const cardPath = folder + '/card-adjudication-all/results.json', cards = json(cardPath);
for (const report of [native,cards]) {
  assert.equal(report.sourceSha256, sourceSha256, 'Native source is stale');
  assert.equal(hash(read(report.sourcePath)), sourceSha256);
  assert.ok(report.success && report.failed === 0 && report.checks.every(check => check.ok));
  assert.equal(report.errors.length, 0); assert.equal(report.networkFailures.length, 0);
  assert.ok(report.browsersClosed && report.browserTempCleaned);
  for (const capture of report.captures) assert.equal(hash(read(capture.path)), capture.sha256, 'Changed capture: ' + capture.path);
}
assert.equal(native.cases.length, 13);
for (const width of [320,640]) for (const kind of ['spacing','size200']) for (const state of ['chooser-positive','chooser-completed','details-acetic-acid']) {
  assert.equal(native.cases.filter(row => row.label === [width,kind,state].join('-')).length, 1);
}
assert.ok(native.cases.some(row => row.label === '1280-spacing-details-acetic-acid'));
for (const row of native.cases) {
  assert.ok(row.page.scrollWidth <= row.page.clientWidth + 1, row.label + ' page overflow');
  assert.equal(row.textOutsideCell.length, 0, row.label + ' reading text outside cell');
  assert.equal(row.controlsOverflow.length, 0, row.label + ' overflowing control');
  assert.ok(row.clippedText.every(item => item.accessibleScroll), row.label + ' inaccessible clipping');
  assert.equal(row.verticalOverlaps.length, 0, row.label + ' overlapping text');
  if (row.kind === 'size200') assert.equal(row.exactTextSize.actual, row.exactTextSize.base * 2);
  for (const focus of row.focus || []) if (!focus.absent && !focus.disabled) assert.ok(focus.hit && focus.visibleFocus && focus.centerInViewport);
}
const wordCheck = native.cases.find(row => row.labelWords)?.labelWords;
assert.ok(wordCheck && wordCheck.display === 'grid' && wordCheck.columns <= 2 && wordCheck.words.length >= 8 && wordCheck.words.every(word => word.lineCount === 1));
assert.equal(native.containerChecks.length, 2);
assert.equal(cards.containerMetadata.length, 2);
for (const entry of cards.containerMetadata) {
  assert.equal(entry.hostContainer, 'inline-size'); assert.equal(entry.hostName, 'decomposer-hunt');
  assert.equal(entry.buttonPosition, entry.kind === 'normal' ? 'absolute' : 'relative');
  if (entry.kind === 'size200') assert.equal(entry.objectsDisplay, 'grid');
}
assert.equal(native.audits.length, 4);
assert.ok(native.audits.every(audit => audit.violations.length === 0));
const bannerInks = native.audits.flatMap(audit => audit.bannerInks);
for (const audit of native.audits) for (const ink of audit.bannerInks) {
  assert.ok(audit.name.includes('forced-colors')
    ? ink.contrast.known && ink.contrast.minimumSampledContrast >= 4.5
    : ink.paintedContrast.minimumPaintedContrast >= 4.5);
}
assert.equal(cards.cardPalette.length, 8);
for (const mode of ['light','dark','contrast','forced-colors']) for (const complete of [false,true]) {
  const rows = cards.cardPalette.filter(row => row.mode === mode && row.complete === complete);
  assert.equal(rows.length, 1); assert.equal(rows[0].cards.length, 5);
  for (const card of rows[0].cards) {
    assert.deepEqual(card.targets.map(target => target.name).sort(), ['description','percent','title']);
    assert.equal(card.targets.find(target => target.name === 'percent').text, complete ? '100%' : '0%');
    assert.ok(card.targets.every(target => target.contrast.known && target.contrast.minimumSampledContrast >= 4.5));
  }
}
assert.equal(Object.keys(cards.fixtures.cardCompleted.foundObjects).length, 30);
const visual = json(folder + '/visual-review.json'); assert.equal(visual.sourceSha256, sourceSha256);
assert.ok(visual.captures.length >= 6 && visual.captures.every(capture => capture.reviewed && hash(read(capture.path)) === capture.sha256));
const cardInks = cards.cardPalette.flatMap(row => row.cards.flatMap(card => card.targets));
const summary = {success:true, sourceSha256, catalogSha256:hash(read('ui_strings.js')),
  unitTests:{passed:units.numPassedTests,failed:0,newMountedTests:32,result:unitsPath,sha256:hash(read(unitsPath))},
  native:{checks:native.passed,failed:0,layouts:native.cases.length,containerAssertions:2,themeAudits:4,confirmedAutomatedViolations:0,
    result:nativePath,sha256:hash(read(nativePath)),browsersClosed:native.browsersClosed,browserTempCleaned:native.browserTempCleaned},
  chooserCardAdjudication:{checks:cards.passed,failed:0,fixtures:'Empty and all 30 objects found; all five cards in both states and all four themes.',
    textPalettes:cardInks.length,minimumContrast:Math.min(...cardInks.map(ink => ink.contrast.minimumSampledContrast)),result:cardPath,sha256:hash(read(cardPath))},
  bannerMinimumComputedContrast:Math.min(...bannerInks.map(ink => ink.contrast.minimumSampledContrast)),
  changes:['Scene entry, Exit and detail-to-tab navigation keep logical keyboard focus.',
    'A persistent polite status identifies the next visible compound assignment and scene completion without revealing the target object.',
    'Identified-object accessible names retain their visible labels across all five scenes.',
    'Hunt descriptions and labels wrap; narrow or enlarged layouts adapt while the ordinary wide picture overlay remains.',
    'The chooser banner, score/streak badges and completed cards keep readable colors across light, dark, app contrast and forced colors.'],
  limits:'Targeted WCAG improvement evidence, not complete conformance, literal browser zoom or spoken screen-reader verification. Standalone decorative glyphs and intentionally sr-only duplicate status text are excluded from visual clipping probes; their relevant names/status updates are tested explicitly. Forced-color text masking is unsupported, so computed system colors and unmodified screenshots are used there.',
  references:['https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html','https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html',
    'https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html','https://www.w3.org/TR/css-conditional-5/'],
  visualReview:folder+'/visual-review.json',noCommit:true};
fs.writeFileSync(folder+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
