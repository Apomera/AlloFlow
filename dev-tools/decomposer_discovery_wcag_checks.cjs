'use strict';
// Run after the bounded native QA and mounted tests. This validator refuses
// evidence from a different source revision instead of silently reusing it.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = process.cwd();
const folder = 'reports/decomposer-discovery-wcag';
const nativeFolder = process.argv.find(value => value.startsWith('--native='))?.slice(9) || 'reports/decomposer-text-resize-wcag/verified';
const paletteFolder = 'reports/decomposer-text-resize-wcag/palette-final';
const read = file => fs.readFileSync(path.join(root, file));
const json = file => JSON.parse(read(file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourcePath = 'stem_lab/stem_tool_decomposer.js';
const source = read(sourcePath);
const sourceSha256 = hash(source);
assert.equal(hash(read('desktop/web-app/public/' + sourcePath)), sourceSha256, 'Runtime mirrors differ');
new vm.Script(source.toString(), { filename: sourcePath });
const catalogs = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
assert.equal(hash(read(catalogs[0])), hash(read(catalogs[1])), 'Catalog mirrors differ');
const strings = json(catalogs[0]).stem.decomposer;
for (const key of ['percent_value', 'humidity', 'oxygen', 'rate', 'discovery_instructions', 'estimated_rate', 'reading_number', 'reading_saved', 'discovery_reset', 'saved_readings', 'no_readings', 'show_open_prompts', 'hide_open_prompts', 'discovery_model_note']) {
  assert.equal(typeof strings[key], 'string', 'Missing discovery catalog entry: ' + key);
}
const unitsPath = folder + '/unit-tests.json';
const units = json(unitsPath);
assert.ok(units.success && units.numFailedTests === 0 && units.numPassedTests === 75, 'Focused mounted tests must pass');
const unitSources = json(folder + '/unit-source.json');
assert.equal(unitSources.length, 7);
for (const file of unitSources) assert.equal(hash(read(file.path)), file.sha256, 'Mounted test evidence is stale: ' + file.path);
const nativePath = nativeFolder + '/results.json';
const native = json(nativePath);
const layoutSource = read(native.sourcePath).toString();
assert.equal(hash(Buffer.from(layoutSource)), native.sourceSha256, 'Frozen layout source changed');
// Reuse the passing layout matrix only when the complete source difference is
// exactly the reviewed palette change. All other edits require new layout QA.
let layoutEvidence = 'Exact final source';
if (native.sourceSha256 !== sourceSha256) {
  const newline = layoutSource.match(/\r?\n/)[0];
  const lineHeight = "            '[data-decomposer-active-tab]:not([data-decomposer-active-tab=scenes]) :is(div,section,span,p,h3,h4,h5,dt,dd,label,button,input,select,textarea){line-height:1.5}' +";
  const heroBackground = "                background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',";
  const deltas = [
    [lineHeight, lineHeight + newline + "            '@media(forced-colors:active){[data-decomposer-snapshot]{background:ButtonFace!important;color:ButtonText!important;border:1px solid ButtonText!important}}' +"],
    [heroBackground, heroBackground + newline + "                backgroundColor: isContrast ? '#000' : '#fff',"],
    ["color: 'var(--allo-stem-text-soft, #475569)'", "color: '#475569'"],
    ["h('button', { 'aria-label': __alloT('stem.decomposer.a11y_snapshot'", "h('button', { 'data-decomposer-snapshot': true, 'aria-label': __alloT('stem.decomposer.a11y_snapshot'"]
  ];
  let transformed = layoutSource;
  for (const [before, after] of deltas) {
    assert.equal(transformed.split(before).length, 2, 'Palette delta target is missing or ambiguous');
    transformed = transformed.replace(before, after);
  }
  assert.equal(transformed, source.toString(), 'Changes beyond the reviewed palette delta require new layout QA');
  layoutEvidence = 'Passing layout source plus an exact four-part palette delta: opaque hero underlay, fixed hint ink, Snapshot data attribute, and forced-color Snapshot system colors/border. The forced-color palette is checked separately on the final source.';
}
assert.ok(native.success && native.failed === 0 && native.checks.every(item => item.ok), 'Native checks must pass');
assert.equal(native.cases.length, 36);
const states = ['explore-comparison', 'quiz-answered', 'tutor-long-reply', 'states-paused', 'atoms-paused', 'decomposition-predictions'];
for (const width of [320, 640]) for (const kind of ['normal', 'spacing', 'size200']) for (const state of states) {
  const label = [width, kind, state].join('-');
  const rows = native.cases.filter(row => row.label === label);
  assert.equal(rows.length, 1, 'Missing or duplicate layout case: ' + label);
  const row = rows[0];
  assert.ok(row.page.scrollWidth <= row.page.clientWidth + 1, label + ' page overflow');
  assert.equal(row.textOutsideCell.length, 0, label + ' text outside its cell');
  assert.equal(row.controlsOverflow.length, 0, label + ' overflowing controls');
  assert.ok(row.clippedText.every(item => item.accessibleScroll), label + ' inaccessible clipping');
  if (kind === 'size200') assert.equal(row.exactTextSize.actual, row.exactTextSize.base * 2, label + ' text size');
  for (const focus of row.focus) if (!focus.absent && !focus.disabled) assert.ok(focus.hit && focus.visibleFocus && focus.centerInViewport, label + ' obscured keyboard focus');
}
assert.equal(native.discovery.audits.length, 16);
assert.ok(native.discovery.audits.every(audit => audit.violations.length === 0), 'Discovery automated findings remain');
assert.equal(native.errors.length, 0);
assert.equal(native.networkFailures.length, 0);
assert.ok(native.browsersClosed && native.browserTempCleaned, 'Native QA did not release its browser/profile');
for (const capture of native.captures) assert.equal(hash(read(capture.path)), capture.sha256, 'Screenshot changed: ' + capture.path);
const palettePath = paletteFolder + '/results.json';
const palette = json(palettePath);
assert.equal(palette.sourceSha256, sourceSha256, 'Final palette checks are stale');
assert.equal(hash(read(palette.sourcePath)), sourceSha256, 'Frozen palette source changed');
assert.ok(palette.success && palette.failed === 0 && palette.checks.every(item => item.ok));
assert.equal(palette.discovery.audits.length, 16);
assert.ok(palette.discovery.audits.every(audit => audit.violations.length === 0));
assert.equal(palette.errors.length, 0);
assert.equal(palette.networkFailures.length, 0);
assert.ok(palette.browsersClosed && palette.browserTempCleaned);
for (const capture of palette.captures) assert.equal(hash(read(capture.path)), capture.sha256);
assert.equal(palette.palette.length, 4);
const gradientTargets = palette.palette.flatMap(mode => mode.targets);
assert.equal(gradientTargets.length, 24);
assert.ok(gradientTargets.every(target => target.contrast.known && target.contrast.minimumSampledContrast >= 4.5), 'Gradient/system-color adjudications did not pass');
assert.equal(palette.huntHero.mode, 'app-contrast');
assert.equal(palette.huntHero.targets.length, 2);
assert.ok(palette.huntHero.targets.every(target => target.contrast.known && target.contrast.minimumSampledContrast >= 4.5), 'Hunt hero contrast guard failed');
const reviewPath = folder + '/visual-review.json';
const review = json(reviewPath);
assert.equal(review.sourceSha256, sourceSha256, 'Visual review is stale');
assert.ok(review.captures.length > 0 && review.captures.every(capture => capture.reviewed && [sourceSha256, native.sourceSha256].includes(capture.sourceSha256) && hash(read(capture.path)) === capture.sha256));
function luminance(hex) {
  const rgb = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
const rateColors = [...source.toString().matchAll(/(stopped|slow|medium|fast):\s*\{ label:[^\n]+?color: '(#[0-9a-f]{6})', bg: '(#[0-9a-f]{6})'/g)].map(match => {
  const [a, b] = [luminance(match[2]), luminance(match[3])].sort((a, b) => b - a);
  const ratio = (a + .05) / (b + .05);
  assert.ok(ratio >= 4.5, match[1] + ' rate text contrast');
  return { state: match[1], foreground: match[2], background: match[3], ratio: Number(ratio.toFixed(2)) };
});
assert.equal(rateColors.length, 4);
const summary = {
  success: true, sourceSha256, catalogSha256: hash(read(catalogs[0])),
  unitTests: { passed: units.numPassedTests, failed: units.numFailedTests, result: unitsPath, sha256: hash(read(unitsPath)) },
  native: { passed: native.passed, failed: native.failed, layouts: native.cases.length, sourceSha256: native.sourceSha256, layoutEvidence, result: nativePath, sha256: hash(read(nativePath)) },
  finalPalette: { passed: palette.passed, failed: palette.failed, sourceSha256, discoveryAxeScans: palette.discovery.audits.length, confirmedViolations: 0, gradientAndSystemTargets: gradientTargets.length, minimumSampledGradientContrast: Math.min(...gradientTargets.map(target => target.contrast.minimumSampledContrast)), result: palettePath, sha256: hash(read(palettePath)) },
  rateTextContrast: rateColors, visualReview: reviewPath,
  changes: [
    'Discovery readings are displayed with named condition/rate fields and numbered latest-eight history; save/reset feedback uses a persistent polite status.',
    'The prompt disclosure stays mounted with expanded state and a named controlled region, preserving keyboard focus.',
    'Horizontal tabs preserve modified shortcuts, input composition and native Up/Down scrolling.',
    'Comparison controls, badges, material details, mass readouts, slider labels and quiz answers reflow with enlarged text.',
    'Unitless line heights prevent enlarged definition terms and values, and comparison titles and formulae, from overlapping.',
    'Rate text colors and saved-reading fields support app contrast and forced colors; dark-host headings and discovery textarea text retain readable contrast.',
    'An opaque base beneath the hero gradient protects its dark text in dark hosts, and Snapshot uses system colors in forced-color mode.'
  ],
  scope: 'A targeted WCAG 2.2 accessibility improvement pass. Six states at 320/640 CSS px with normal text, required text-spacing overrides and a separate exact computed-font 200% simulation. Sixteen automated discovery scans cover four rates in light, dark, app contrast and forced colors. This does not certify complete WCAG conformance, literal browser zoom, or spoken screen-reader output.',
  standards: [
    'https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html',
    'https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html',
    'https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html',
    'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/'
  ],
  noCommit: true
};
fs.writeFileSync(path.join(root, folder, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
