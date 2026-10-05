'use strict';
// Verify saved evidence only. This file launches no browser or test suite.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const reportDir = path.relative(root, __dirname).replace(/\\/g, '/');
const result = { checkedAt: new Date().toISOString(), completed: false, successful: false, checks: [], errors: [] };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const check = (label, passed, details) => result.checks.push({ label, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
const resolve = name => {
  const full = path.resolve(root, name);
  if (!full.startsWith(root + path.sep)) throw new Error('Artifact outside repository: ' + name);
  return full;
};
const bytes = name => fs.readFileSync(resolve(name));
const json = name => JSON.parse(bytes(name));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const ordered = values => [...values].sort((left, right) => left.name.localeCompare(right.name));
const tail = name => name.replace(/\\/g, '/').split('/').pop();
const local = name => reportDir + '/' + name;
const time = value => Date.parse(value);
const validTime = value => Number.isFinite(time(value));
function png(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
function testIdentities(report, expected, label) {
  const suites = report.testResults || [];
  check(label + ' exact test files', same(suites.map(suite => tail(suite.name)).sort(), expected.map(tail).sort()));
  const identities = [];
  for (const suite of suites) for (const test of suite.assertionResults || []) {
    const identity = tail(suite.name) + '::' + (test.fullName || [...(test.ancestorTitles || []), test.title].join(' > '));
    identities.push(identity);
    check(label + ' passed test ' + identity, test.status === 'passed');
  }
  check(label + ' successful with no omitted tests', report.success === true && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0 && report.numPassedTests === report.numTotalTests && identities.length === report.numTotalTests);
  check(label + ' distinct test identities', new Set(identities).size === identities.length);
  return identities;
}
function verifyClosure(report, label) {
  check(label + ' completed successfully', report.completed === true && report.successful === true && (report.errors || []).length === 0 && (report.consoleErrors || []).length === 0);
  check(label + ' actual browser closed', report.resourcesClosed === true && report.browserClosed === true && validTime(report.browserClosedAt));
  check(label + ' setContent requires no server', report.serverUsed === false && report.serverClosed === true && report.serverClosedAt === null);
  check(label + ' closure chronology', validTime(report.startedAt) && validTime(report.browserLaunchedAt) && validTime(report.completedAt) && time(report.startedAt) <= time(report.browserLaunchedAt) && time(report.browserLaunchedAt) <= time(report.browserClosedAt) && time(report.browserClosedAt) <= time(report.completedAt));
}
function verifyTestMetadata(report, manifest, label, closures) {
  const before = json(manifest.reports[label + 'Before']);
  const after = json(manifest.reports[label + 'After']);
  check(label + ' raw result binds after metadata', same(report.waterCycleGroundwaterLensVerification, after));
  check(label + ' before metadata remains in after', Object.keys(before).every(key => same(before[key], after[key])));
  check(label + ' runtime expectation', before.expectedRuntimeSha256 === manifest.sourceSha256 && after.expectedRuntimeSha256 === manifest.sourceSha256);
  check(label + ' isolated successful process', after.processExitCode === 0 && after.processSignal === null && after.singleWorker === true && after.fileParallelism === false);
  check(label + ' test chronology', validTime(after.startedAt) && validTime(after.completedAt) && time(after.completedAt) >= time(after.startedAt));
  for (const field of ['sourceSha256Before', 'sourceSha256After', 'publicSha256Before', 'publicSha256After']) check(label + ' ' + field, after[field] === manifest.sourceSha256);
  const wantedTests = label === 'unit' ? [manifest.testPath] : manifest.regressionFiles;
  check(label + ' exact metadata file scopes', same(after.runtimeFiles.map(item => item.path).sort(), [manifest.sourcePath, manifest.publicPath].sort()) && same(after.testFiles.map(item => item.path).sort(), [...wantedTests].sort()));
  const wantedFixtures = label === 'unit' ? [manifest.baselinePath] : manifest.regressionBaselineInputs.map(item => item.path);
  check(label + ' exact frozen fixture scopes', same(after.fixtureFiles.map(item => item.path).sort(), [...wantedFixtures].sort()));
  check(label + ' independently expected frozen fixture hashes', after.fixtureFiles.every(item => item.sha256 === item.expectedSha256));
  for (const [kind, inputs, outputs] of [['runtime', after.runtimeFiles, after.runtimeFilesAfter], ['test', after.testFiles, after.testFilesAfter], ['fixture', after.fixtureFiles, after.fixtureFilesAfter]]) {
    const rawPins = values => values.map(({ path, sha256, bytes }) => ({ path, sha256, bytes }));
    check(label + ' ' + kind + ' before/after raw pins agree', same(rawPins(inputs), rawPins(outputs)));
    for (const pin of inputs) {
      const current = bytes(pin.path);
      check(label + ' ' + kind + ' bytes ' + pin.path, sha(current) === pin.sha256 && current.length === pin.bytes);
      const reads = after.loadedFiles.filter(item => item.path === pin.path);
      check(label + ' actual native file reads ' + pin.path, reads.length > 0 && reads.every(item => item.sha256 === pin.sha256 && item.bytes === pin.bytes && validTime(item.loadedAt) && time(item.loadedAt) >= time(after.startedAt) && time(item.loadedAt) <= time(after.completedAt) && Number.isInteger(item.pid) && item.pid > 0));
    }
  }
  const loaded = json(manifest.reports[label + 'Loaded']);
  check(label + ' captured helper-load report', same(loaded, after.loadedReport));
  check(label + ' both helper-loaded runtime hashes', loaded.loadedRuntimes.length === 2 && same(loaded.loadedRuntimes.map(item => item.path).sort(), [manifest.sourcePath, manifest.publicPath].sort()) && loaded.loadedRuntimes.every(item => item.sha256 === manifest.sourceSha256 && (label === 'unit' ? bytes(item.path).length === item.bytes : item.bytes === undefined)));
  const helperTest = label === 'unit' ? manifest.testPath : manifest.regressionFiles.find(name => tail(name) === 'watercycle_cloud_evidence.test.js');
  check(label + ' exact helper-loaded test hash', loaded.loadedTest.path === helperTest && loaded.loadedTest.sha256 === sha(bytes(helperTest)) && (label === 'unit' ? loaded.loadedTest.bytes === bytes(helperTest).length : loaded.loadedTest.bytes === undefined));
  if (label === 'unit') check(label + ' rich helper load chronology', validTime(loaded.loadedAt) && validTime(loaded.completedAt) && time(loaded.loadedAt) >= time(after.startedAt) && time(loaded.completedAt) >= time(loaded.loadedAt) && time(loaded.completedAt) <= time(after.completedAt));
  else check(label + ' legacy helper hash receipt is supplemented by actual timed native reads', loaded.loadedAt === undefined && loaded.completedAt === undefined && after.loadedFiles.length > 0 && [manifest.sourcePath, manifest.publicPath, helperTest].every(name => after.loadedFiles.some(item => item.path === name && item.sha256 === sha(bytes(name)) && item.bytes === bytes(name).length && validTime(item.loadedAt) && time(item.loadedAt) >= time(after.startedAt) && time(item.loadedAt) <= time(after.completedAt))));
  check(label + ' exact final browser closure inputs', after.closureEvidence.length === closures.length && same(after.closureEvidence.map(item => item.path).sort(), closures.map(item => item.path).sort()));
  for (const closure of after.closureEvidence) {
    const saved = closures.find(item => item.path === closure.path);
    const publicHash = saved?.report.publicSha256 || saved?.report.publicHostSha256;
    check(label + ' bound closed browser ' + closure.path, saved && closure.sha256 === sha(bytes(closure.path)) && closure.bytes === bytes(closure.path).length && closure.mode === saved.report.mode && closure.sourceSha256 === saved.report.sourceSha256 && closure.publicSha256 === publicHash && closure.publicHashField === (saved.report.publicSha256 ? 'publicSha256' : 'publicHostSha256') && closure.browserClosedAt === saved.report.browserClosedAt && closure.resourcesClosed === true && closure.serverUsed === false && closure.serverClosed === true && closure.serverClosedAt === null);
    check(label + ' starts after ' + closure.mode + ' browser closes', time(after.startedAt) >= time(closure.browserClosedAt));
  }
  check(label + ' preservation metadata binding', after.preservation.baselinePath === manifest.baselinePath && after.preservation.baselineSha256 === manifest.baselineSha256 && same(ordered(after.preservation.anchors), ordered(manifest.preservation.anchors)) && same(ordered(after.preservation.scoredAnchors), ordered(manifest.preservation.scoredAnchors)));
  return after;
}
function contrastRatio(foreground, background) {
  const match = foreground.match(/rgba?\(([^)]+)\)/);
  if (!match || !Array.isArray(background) || background.length !== 3) return NaN;
  const color = match[1].split(',').map(Number), alpha = color.length > 3 ? color[3] : 1;
  const front = color.slice(0, 3).map((value, index) => value * alpha + background[index] * (1 - alpha));
  const lum = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const levels = [lum(front), lum(background)];
  return (Math.max(...levels) + .05) / (Math.min(...levels) + .05);
}
function color(value) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error('Unsupported computed color: ' + value);
  return match[1].split(',').map(Number);
}
function compose(front, back) {
  const alpha = front[3] === undefined ? 1 : front[3];
  return front.slice(0, 3).map((value, index) => value * alpha + back[index] * (1 - alpha));
}
function swatchSamples(item) {
  const fill = color(item.fill), stops = (item.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(color);
  if (fill[3] === undefined || fill[3] === 1) return stops.length ? stops.map(stop => compose(stop, fill)) : [fill.slice(0, 3)];
  const beneath = item.paper.map(background => compose(fill, background));
  return stops.length ? stops.flatMap(stop => beneath.map(background => compose(stop, background))) : beneath;
}
try {
  const manifest = json(local('artifact-summary.json'));
  if (manifest.status !== 'final') throw new Error('Final groundwater evidence artifacts are not ready.');
  check('current enhancement remains described as uncommitted', manifest.enhancementCommitted === false);
  const source = bytes(manifest.sourcePath), mirror = bytes(manifest.publicPath), baseline = bytes(manifest.baselinePath);
  new vm.Script(source.toString('utf8'), { filename: manifest.sourcePath });
  check('source/public bytes equal final tested runtime', sha(source) === manifest.sourceSha256 && sha(mirror) === manifest.sourceSha256 && source.equals(mirror) && sha(bytes(manifest.testedRuntimePath)) === manifest.sourceSha256);
  check('committed frozen baseline hash', sha(baseline) === manifest.baselineSha256);
  for (const name of manifest.baselineRuntimeInputs) check('exact baseline capture buffer ' + name, bytes(name).equals(baseline));
  for (const input of manifest.regressionBaselineInputs) check('committed regression baseline ' + input.path, sha(bytes(input.path)) === input.sha256);
  result.sourceSha256 = manifest.sourceSha256;
  result.baselineSha256 = manifest.baselineSha256;
  const pins = manifest.artifacts;
  check('unique artifact paths', new Set(pins.map(pin => pin.path)).size === pins.length);
  check('all declared inputs are pinned exactly once', manifest.requiredInputs.length === pins.length && manifest.requiredInputs.every(name => pins.some(pin => pin.path === name)));
  for (const pin of pins) {
    const buffer = bytes(pin.path);
    check('artifact hash/bytes ' + pin.path, sha(buffer) === pin.sha256 && buffer.length === pin.bytes);
    check('exclude mutable outputs and preliminary inputs ' + pin.path, !['README.md', 'verify.cjs', 'artifact-summary.json', 'verification-summary.json'].includes(tail(pin.path)) && !/preflight|diagnostic|runner-state|\.log$/.test(pin.path));
    if (pin.width !== undefined) check('PNG dimensions ' + pin.path, same(png(buffer), { width: pin.width, height: pin.height }));
  }
  const browser = json(manifest.reports.browser), before = json(manifest.reports.baseline);
  verifyClosure(before, 'baseline');
  verifyClosure(browser, 'browser');
  check('baseline runtime and separate current-public observation', before.sourceSha256 === manifest.baselineSha256 && before.sourceBytes === baseline.length && (before.publicSha256 || before.publicHostSha256) === manifest.baselinePublicSha256);
  check('baseline tested harness bytes', before.harnessSha256 === sha(bytes(manifest.baselineHarnessPath)));
  check('final browser loaded and retained exact bytes', browser.sourceSha256 === manifest.sourceSha256 && (browser.publicSha256 || browser.publicHostSha256) === manifest.sourceSha256 && browser.sourceAfterSha256 === manifest.sourceSha256 && browser.publicAfterSha256 === manifest.sourceSha256 && browser.sourceBytes === source.length);
  check('final browser tested harness matches current harness', browser.harnessSha256 === sha(bytes(manifest.testedHarnessPath)) && bytes(manifest.testedHarnessPath).equals(bytes(manifest.browserHarnessPath)));
  check('same authored fixtures across baseline/final', same(json(manifest.fixturePaths[0]), json(manifest.fixturePaths[1])));
  check('all final browser check instances pass', browser.checks.length > 0 && browser.checks.every(item => item.passed === true));
  const counts = { checkInstances: browser.checks.length, uniqueCheckLabels: new Set(browser.checks.map(item => item.label)).size, cases: browser.cases.length, nativeActions: browser.nativeActions.length, audits: browser.audits.length, captures: browser.captures.length };
  check('actual browser counts match manifest', same(counts, manifest.browser.counts), counts);
  result.browser = counts;
  for (const label of manifest.browser.requiredSemanticChecks) check('native semantic proof ' + label, browser.checks.some(item => item.label === label && item.passed === true));
  check('exact responsive display variant scope', same(manifest.browser.variants, ['phone320', 'phone390', 'desktop', 'host390', 'dark', 'forced-phone', 'forced-dark']));
  for (const variant of manifest.browser.variants) for (const context of ['explorer', 'check']) {
    const prefix = context + ' ' + variant;
    for (const part of ['soil', 'boundary', 'groundwater']) {
      const proof = browser.checks.find(item => item.label === prefix + ' ' + part + ' distinct diagram evidence');
      const cues = proof?.details || [];
      const expected = part === 'soil' ? ['partial-water', 'open-air'] : part === 'boundary' ? ['capillary-water', 'water-table'] : ['filled-pores', 'possible-flow'];
      check('actual selected diagram cues ' + prefix + ' ' + part, proof?.passed === true && expected.every(cue => cues.includes(cue)));
      check('native part action ' + prefix + ' ' + part, browser.nativeActions.filter(item => item.action === 'inspect part' && item.context === context && item.variant === variant && item.part === part).length === 1);
    }
    for (const answer of ['all_recharge', 'dry_soil', 'soil_storage']) {
      const proof = browser.checks.find(item => item.label === prefix + ' ' + answer + ' explains reasoning');
      check('actual unscored feedback reasoning ' + prefix + ' ' + answer, proof?.passed === true && proof.details?.outcome === (answer === 'soil_storage' ? 'supported' : 'retry') && proof.details.text.length > 100);
      check('native keyboard answer action ' + prefix + ' ' + answer, browser.nativeActions.filter(item => item.action === 'answer unscored question' && item.context === context && item.variant === variant && item.answer === answer && item.keyboard === true).length === 1);
    }
    check('native keyboard disclosure action ' + prefix, browser.nativeActions.filter(item => item.action === 'open lens' && item.context === context && item.variant === variant && item.keyboard === true).length === 1);
  }
  const preservationChecks = browser.checks.filter(item => /full learner data\/rewards\/canvas state preserved$|full data\/rewards\/canvas unchanged$|Actual3D lens practice preserves full learner data\/rewards$/.test(item.label));
  check('native practice retains data rewards and canvas state', preservationChecks.length === 85 && preservationChecks.every(item => item.passed === true && same(item.details.before, item.details.after) && item.details.before.awards.length === 0));
  const focusChecks = browser.checks.filter(item => item.label.endsWith('focused explanation heading'));
  check('all keyboard part/answer headings have visible contrasting focus', focusChecks.length === 56 && focusChecks.every(item => item.passed === true && item.details.id.startsWith('wcGroundwater-') && item.details.outline !== 'none' && item.details.width >= 2 && item.details.contrast >= 3 && Math.abs(contrastRatio(item.details.color, item.details.background.slice(0, 3)) - item.details.contrast) < 1e-8));
  const measuredCases = browser.cases.filter(item => item.measured);
  const contexts = measuredCases.map(item => item.context + ':' + item.variant + ':' + (item.phase || 'inspection')).sort();
  const expectedContexts = manifest.browser.variants.flatMap(variant => ['explorer', 'check'].flatMap(context => ['inspection', 'question-supported'].map(phase => context + ':' + variant + ':' + phase))).sort();
  check('both contexts and phases across every distinct display variant', same(contexts, expectedContexts) && new Set(contexts).size === contexts.length);
  for (const item of measuredCases) {
    const label = item.context + ' ' + item.variant + ' ' + (item.phase || 'inspection'), measured = item.measured;
    check('scoped layout and visible HTML text ' + label, measured.clientWidth > 0 && measured.scrollWidth <= measured.clientWidth + 1 && measured.text.length > 0 && measured.text.every(reading => reading.range.width > 0 && reading.range.height > 0 && !reading.clipped));
    check('native targets at least 44 px ' + label, measured.controls.length > 0 && measured.controls.every(control => control.bounds.height >= 43.99));
    check('text-free bounded 210 px illustrative diagrams ' + label, measured.svgs.length === 2 && measured.svgs.every((svg, index) => svg.textCount === 0 && svg.hidden === 'true' && svg.focusable === 'false' && (index === 0 ? Math.abs(svg.width - 120) < .1 : svg.width >= 140) && svg.height >= 209.99 && svg.bounds.x >= svg.view.x - 1 && svg.bounds.y >= svg.view.y - 1 && svg.bounds.x + svg.bounds.width <= svg.view.x + svg.view.width + 1 && svg.bounds.y + svg.bounds.height <= svg.view.y + svg.view.height + 1));
  }
  check('base contrast readings match their actual measured cases', browser.contrastReadings.length === measuredCases.filter(item => !item.phase).length && browser.contrastReadings.every(item => same(item.readings, measuredCases.find(candidate => !candidate.phase && candidate.context === item.context && candidate.variant === item.variant)?.measured.text)));
  const contrast = measuredCases.flatMap(item => item.measured.text);
  const minimum = Math.min(...contrast.map(item => item.minimumContrast));
  check('independent composed text contrast calculations', contrast.length === manifest.browser.contrast.readings && minimum === manifest.browser.contrast.minimum && contrast.every(item => item.minimumContrast >= 4.5 && item.range.width > 0 && item.range.height > 0 && !item.clipped && item.backgrounds.length > 0 && Math.abs(Math.min(...item.backgrounds.map(background => contrastRatio(item.foreground, background))) - item.minimumContrast) < 1e-8));
  const nontext = measuredCases.flatMap(item => item.measured.nontext);
  check('independent recorded graphic contrast calculations', nontext.length === manifest.browser.nontext.readings && Math.min(...nontext.map(item => item.ratio)) === manifest.browser.nontext.minimumRecorded && nontext.every(item => item.ratio >= 1 && Math.abs(contrastRatio(item.foreground, item.background.match(/rgba?\(([^)]+)\)/)[1].split(',').slice(0, 3).map(Number)) - item.ratio) < 1e-8));
  const requiredGraphicRatios = [];
  for (const item of measuredCases) {
    const reading = name => item.measured.nontext.find(value => value.name === name)?.ratio || 0;
    const ratios = [Math.max(reading('grain outline against water'), item.variant.startsWith('forced-') ? reading('grain fill against water') : 0), reading('hatching against grain fill')];
    if (!item.phase) ratios.push(reading('groundwater flow arrow against water'));
    requiredGraphicRatios.push(...ratios);
    check('material boundaries and hatching with possible-flow cue ' + item.context + ' ' + item.variant + ' ' + (item.phase || 'inspection'), ratios.every(value => value >= 3));
  }
  check('honest required graphic contrast summary', requiredGraphicRatios.length === manifest.browser.nontext.requiredReadings && Math.min(...requiredGraphicRatios) === manifest.browser.nontext.minimumRequired);
  const swatches = measuredCases.flatMap(item => item.measured.swatches);
  const legendCueRatios = [];
  for (const item of measuredCases) {
    check('full patterned material legend ' + item.context + ' ' + item.variant + ' ' + (item.phase || 'inspection'), same(item.measured.swatches.map(value => value.material).sort(), ['air', 'grain', 'water']));
    for (const swatch of item.measured.swatches) {
      const fills = swatchSamples(swatch);
      const borderToFill = Math.min(...fills.map(background => contrastRatio(swatch.border, background)));
      const borderToPaper = Math.min(...swatch.paper.map(background => contrastRatio(swatch.border, background)));
      const fillRatios = fills.flatMap(fill => swatch.paper.map(background => contrastRatio('rgb(' + fill.join(',') + ')', background)));
      check('independent actual swatch composites ' + item.context + ' ' + item.variant + ' ' + (item.phase || 'inspection') + ' ' + swatch.material, swatch.paper.length > 0 && same(fills, swatch.fillSamples) && Math.abs(borderToFill - swatch.borderToFill) < 1e-8 && Math.abs(borderToPaper - swatch.borderToPaper) < 1e-8 && Math.abs(Math.min(...fillRatios) - swatch.fillToPaperMinimum) < 1e-8 && Math.abs(Math.max(...fillRatios) - swatch.fillToPaperMaximum) < 1e-8);
      const cue = swatch.material === 'air' ? borderToFill : Math.max(borderToPaper, Math.max(...fillRatios));
      legendCueRatios.push(cue);
      check('visible patterned or outlined legend cue ' + item.context + ' ' + item.variant + ' ' + (item.phase || 'inspection') + ' ' + swatch.material, cue >= 3 && swatch.borderWidth >= 1 && (swatch.material !== 'air' || swatch.borderStyle === 'dashed') && (swatch.material !== 'grain' || swatch.backgroundImage.includes('repeating-linear-gradient') || item.variant.startsWith('forced-') && swatch.borderStyle === 'solid' && borderToPaper >= 3));
    }
  }
  check('honest legend cue contrast summary', swatches.length === manifest.browser.legend.readings && Math.min(...legendCueRatios) === manifest.browser.legend.minimumRequired);
  const renderer2d = browser.renderer2d, renderer3d = browser.renderer3d;
  check('actual 2D canvas/context/hooks and progress retained', renderer2d && same(Object.keys(renderer2d.identity).sort(), ['canvas', 'context', 'pause', 'redraw', 'setProgress']) && Object.values(renderer2d.identity).every(value => value === true) && renderer2d.progressBefore === renderer2d.progressAfter);
  check('actual mounted 2D hooks are functions', same(Object.keys(renderer2d.hookTypes).sort(), ['pause', 'redraw', 'setProgress']) && Object.values(renderer2d.hookTypes).every(value => value === 'function'));
  const arcID = item => item.arcs[0].x + ':' + item.arcs[0].y + ':' + item.arcs[0].radius;
  check('actual clipped partial liquid shares an upper pore with air', renderer2d.partial.length > 0 && renderer2d.air.length > 0 && renderer2d.saturated.length > 0 && renderer2d.partial.every(item => item.clipped === true && item.arcs.length === 1 && item.arcs[0].y <= item.height * .845 && renderer2d.air.some(air => arcID(air) === arcID(item)) && Math.abs(item.args[0] - (item.arcs[0].x - item.arcs[0].radius)) < 1e-8 && Math.abs(item.args[1] - (item.arcs[0].y + item.arcs[0].radius * .1)) < 1e-8 && Math.abs(item.args[2] - item.arcs[0].radius * 2) < 1e-8 && Math.abs(item.args[3] - item.arcs[0].radius * .9) < 1e-8) && renderer2d.saturated.every(item => item.arcs[0].y > item.height * .845));
  check('actual mounted paused 3D renderer resources retained', renderer3d && same(Object.keys(renderer3d.identity).sort(), ['adjustCamera', 'camera', 'canvas', 'cleanup', 'context', 'renderer', 'resetCamera', 'scene', 'syncCamera']) && Object.values(renderer3d.identity).every(value => value === true) && renderer3d.engineState === 'ready' && renderer3d.paused === true && renderer3d.contextLost === false && renderer3d.progressBefore === renderer3d.progressAfter && renderer3d.children > 0 && typeof renderer3d.sceneUuid === 'string' && typeof renderer3d.cameraUuid === 'string');
  check('actual mounted 3D hooks and resource kinds exist', same(Object.keys(renderer3d.hookTypes).sort(), ['adjustCamera', 'cleanup', 'resetCamera', 'syncCamera']) && Object.values(renderer3d.hookTypes).every(value => value === 'function') && same(Object.keys(renderer3d.objectKinds).sort(), ['camera', 'context', 'renderer', 'scene']) && Object.values(renderer3d.objectKinds).every(value => value === true));
  const expectedAuditLabels = manifest.browser.variants.flatMap(variant => ['explorer', 'check'].flatMap(context => [context + ' ' + variant, context + ' ' + variant + ' question'])).sort();
  check('exact scoped audit matrix', same(browser.audits.map(item => item.label).sort(), expectedAuditLabels) && new Set(browser.audits.map(item => item.label)).size === expectedAuditLabels.length);
  result.incompleteAudits = browser.audits.filter(item => item.incomplete.length).map(item => ({ label: item.label, incomplete: item.incomplete, manualResolutions: item.manualResolutions }));
  for (const audit of browser.audits) {
    check('scoped automated audit ' + audit.label, audit.violations.length === 0);
    const nodes = audit.incomplete.flatMap(item => item.nodes.map(node => ({ rule: item.id, node })));
    const key = item => item.rule + ':' + JSON.stringify(item.node?.target || item.target);
    check('complete distinct manual-resolution scope ' + audit.label, audit.manualResolutions.length === nodes.length && new Set(audit.manualResolutions.map(key)).size === nodes.length && nodes.every(item => audit.manualResolutions.some(reading => key(reading) === key(item))));
    for (const { rule, node } of nodes) {
      const reading = audit.manualResolutions.find(item => item.rule === rule && same(item.target, node.target));
      const box = reading?.range, scope = reading?.scope;
      const inScope = box && scope && box.left >= scope.left - 1 && box.right <= scope.right + 1 && box.top >= scope.top - 1 && box.bottom <= scope.bottom + 1;
      check('independent exact-target manual contrast ' + audit.label + ' ' + node.target.join(' '), rule === 'color-contrast' && reading?.resolved === true && reading.html === node.html && reading.selector === node.target.join(' ') && reading.text.trim().length > 0 && box.width > 0 && box.height > 0 && scope.width > 0 && scope.height > 0 && inScope && reading.clipped === false && reading.minimumContrast >= 4.5 && reading.backgrounds.length > 0 && Math.abs(Math.min(...reading.backgrounds.map(background => contrastRatio(reading.foreground, background))) - reading.minimumContrast) < 1e-8 && reading.part === (audit.label.endsWith(' question') ? 'soil' : 'groundwater') && reading.questionOpen === audit.label.endsWith(' question') && Array.isArray(node.any) && Array.isArray(node.all) && Array.isArray(node.none));
    }
  }
  const auditCounts = { automatedViolations: browser.audits.reduce((sum, item) => sum + item.violations.length, 0), incompleteItems: browser.audits.reduce((sum, item) => sum + item.incomplete.length, 0), incompleteNodes: browser.audits.reduce((sum, item) => sum + item.incomplete.reduce((total, rule) => total + rule.nodes.length, 0), 0), manualResolutions: browser.audits.reduce((sum, item) => sum + item.manualResolutions.length, 0) };
  check('honest scoped violation/incomplete/manual counts', same(auditCounts, manifest.browser.audit.counts));
  check('honest minimum manual contrast', Math.min(...browser.audits.flatMap(item => item.manualResolutions.map(reading => reading.minimumContrast))) === manifest.browser.audit.minimumManualContrast);
  for (const report of [before, browser]) for (const capture of report.captures) {
    const name = local(capture.path), buffer = bytes(name);
    check('bound capture ' + name, capture.sha256 === sha(buffer) && capture.bytes === buffer.length && same(png(buffer), { width: capture.width, height: capture.height }) && capture.sourceSha256 === report.sourceSha256 && validTime(capture.capturedAt) && time(capture.capturedAt) >= time(report.startedAt) && time(capture.capturedAt) <= time(report.browserClosedAt));
    check('capture hash/dimensions pinned ' + name, pins.some(pin => pin.path === name && pin.sha256 === capture.sha256 && pin.width === capture.width && pin.height === capture.height));
  }
  check('unique baseline and final capture paths', new Set([...before.captures, ...browser.captures].map(item => item.path)).size === before.captures.length + browser.captures.length);
  const matchedContexts = manifest.browser.variants.flatMap(variant => ['land', 'check', 'canvas'].map(region => region + '-' + variant)).sort();
  check('all corresponding capture contexts are present exactly once', same(manifest.captures.pairs.map(item => item.context).sort(), matchedContexts));
  for (const pair of manifest.captures.pairs) check('corresponding before/after capture ' + pair.context, before.captures.some(item => local(item.path) === pair.before) && browser.captures.some(item => local(item.path) === pair.after) && pair.before === local('baseline-' + pair.context + '.png') && pair.after === local('browser-' + pair.context + '.png'));
  const closures = [{ path: manifest.reports.baseline, report: before }, { path: manifest.reports.browser, report: browser }];
  const unit = json(manifest.reports.unit), regression = json(manifest.reports.regression);
  const unitMeta = verifyTestMetadata(unit, manifest, 'unit', closures), regressionMeta = verifyTestMetadata(regression, manifest, 'regression', closures);
  const ownedClosures = json(manifest.reports.ownedBrowserClosures);
  check('recorded operational browser cleanup completed', ownedClosures.cleanupCompleted === true && ownedClosures.allOwnedBrowserResourcesClosed === true && ownedClosures.noServerCreated === true && validTime(ownedClosures.cleanupCompletedAt));
  check('all recorded owned browsers closed before tests', ownedClosures.closures.length === 9 && new Set(ownedClosures.closures.map(item => item.pid)).size === 9 && ownedClosures.closures.every(item => item.browserClosed === true && item.resourcesClosed === true && item.serverUsed === false && item.serverClosed === true && item.serverClosedAt === null && validTime(item.browserClosedAt) && time(item.browserClosedAt) <= time(unitMeta.startedAt) && /^[a-f0-9]{64}$/.test(item.reportSha256)));
  for (const closure of closures) {
    const owned = ownedClosures.closures.find(item => item.reportPath === closure.path);
    check('operational closure binds final evidence ' + closure.path, owned && owned.reportSha256 === sha(bytes(closure.path)) && owned.sourceSha256 === closure.report.sourceSha256 && owned.browserClosedAt === closure.report.browserClosedAt && owned.successful === true && owned.completed === true);
  }
  check('operational capture count matches final evidence', ownedClosures.finalCapturesIndependentlyVerified === browser.captures.length);
  check('regression begins after focused process completes', time(regressionMeta.startedAt) >= time(unitMeta.completedAt));
  const unitIDs = testIdentities(unit, [manifest.testPath], 'unit'), regressionIDs = testIdentities(regression, manifest.regressionFiles, 'regression');
  check('focused/regression identities do not overlap', new Set([...unitIDs, ...regressionIDs]).size === unitIDs.length + regressionIDs.length);
  check('distinct test counts match manifest', unitIDs.length === manifest.tests.unit && regressionIDs.length === manifest.tests.regression && unitIDs.length + regressionIDs.length === manifest.tests.total);
  result.tests = { unit: unitIDs.length, regression: regressionIDs.length, total: unitIDs.length + regressionIDs.length };
  const testSource = bytes(manifest.testPath).toString('utf8'), start = testSource.indexOf('const SOURCE_PATH ='), end = testSource.indexOf('const loadedAt =');
  if (start < 0 || end <= start) throw new Error('Missing preservation export');
  const helper = vm.runInNewContext(testSource.slice(start, end).replace('export const waterCycleGroundwaterLensVerification', 'const waterCycleGroundwaterLensVerification') + '\nwaterCycleGroundwaterLensVerification;', { parse: require('acorn').parse, createHash: crypto.createHash }, { timeout: 10000 });
  check('independent preservation helper scope', helper.baselinePath === manifest.baselinePath && helper.baselineSha === manifest.baselineSha256 && helper.preservedNames.length === 63 && new Set(helper.preservedNames).size === 63);
  const old = helper.productionNodes(baseline.toString('utf8')), oldScored = helper.scoredNodes(baseline.toString('utf8'));
  check('all baseline anchors exist', Object.keys(old).length === helper.preservedNames.length && helper.preservedNames.every(name => Object.hasOwn(old, name)));
  check('both exact scored callback bodies exist', same(Object.keys(oldScored).sort(), ['myth', 'quiz']));
  for (const [label, buffer] of [['source', source], ['public', mirror]]) {
    const current = helper.productionNodes(buffer.toString('utf8')), scored = helper.scoredNodes(buffer.toString('utf8'));
    check(label + ' exact protected anchor scope', Object.keys(current).length === helper.preservedNames.length);
    for (const name of helper.preservedNames) check(label + ' protected anchor with declared visual exceptions ' + name, current[name] === old[name]);
    for (const name of ['myth', 'quiz']) check(label + ' exact first-answer scoring/reward body ' + name, scored[name] === oldScored[name]);
  }
  const anchors = ordered(helper.preservedNames.map(name => ({ name, sha256: sha(old[name]) })));
  const scoredAnchors = ordered(Object.entries(oldScored).map(([name, text]) => ({ name, sha256: sha(text) })));
  check('independent preservation hashes match manifest', same(anchors, ordered(manifest.preservation.anchors)) && same(scoredAnchors, ordered(manifest.preservation.scoredAnchors)));
  check('only two declared visual exceptions', same(manifest.preservation.exceptions.map(item => item.name).sort(), ['canvasRef', 'renderWcCheckPores']));
  for (const mutation of ['d.landSaturation = 100;', 'state.recharge++;', 'upd("wcGroundwaterLens", {});', 'ctx.canvas.width = 999;', 'var state = ctx.canvas;', 'delete ctx.fillStyle;', 'this.score = 9;', 'import("./model.js");']) {
    let rejected = false; try { helper.reviewedPoreDecoration(mutation); } catch (_) { rejected = true; }
    check('decorative paint validator rejects state/API mutation ' + mutation, rejected);
  }
  for (const body of ["upd('score', 100); return renderWcGroundwaterLens('check');", "return renderWcGroundwaterLens('explorer');", "return renderWcGroundwaterLens('check', d);"]) {
    let rejected = false; try { helper.normalizeReviewedCheckPores('function renderWcCheckPores() {' + body + '}'); } catch (_) { rejected = true; }
    check('Check adapter validator rejects extra work ' + body, rejected);
  }
  const preview = json(manifest.reports.preview);
  check('preview served tested runtime', preview.successful === true && preview.previewStatus === 200 && preview.runtimeStatus === 200 && preview.servedRuntimeSha256 === manifest.sourceSha256 && preview.url === 'http://127.0.0.1:8770/');
  result.completed = true;
} catch (error) { result.errors.push(error.stack || String(error)); }
result.passed = result.checks.filter(item => item.passed).length;
result.failed = result.checks.filter(item => !item.passed).length;
result.successful = result.completed && result.errors.length === 0 && result.failed === 0;
if (!process.argv.includes('--read-only')) fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ completed: result.completed, successful: result.successful, passed: result.passed, failed: result.failed, errors: result.errors }));
process.exitCode = result.successful ? 0 : 1;
