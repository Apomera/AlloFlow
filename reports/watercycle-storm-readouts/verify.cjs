'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = __dirname, preflight = process.argv.includes('--preflight');
const snapshotOnly = process.argv.includes('--snapshot-only');
const repo = process.env.WC_REPO || (preflight ? 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated' : path.resolve(root, '../..'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw Error(message); };
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const digest = value => hash(JSON.stringify(stable(value)));
const isHash = value => /^[a-f0-9]{64}$/.test(value || '');
const arg = (name, fallback) => process.argv.find(a => a.startsWith('--' + name + '='))?.slice(name.length + 3) || fallback;
function within(directory, relative) {
  assert(typeof relative === 'string' && relative && !path.isAbsolute(relative), 'Relative evidence path required');
  const absolute = path.resolve(directory, relative);
  assert(absolute.startsWith(path.resolve(directory) + path.sep), 'Evidence path escaped its root');
  return absolute;
}
const read = relative => JSON.parse(fs.readFileSync(within(root, relative), 'utf8'));
const fileHash = absolute => hash(fs.readFileSync(absolute));
const qaDir = arg('qa-dir', 'qa/final'), unitLabel = arg('unit-label', 'unit-final2');
assert(/^[a-zA-Z0-9_/-]+$/.test(qaDir) && /^[a-z0-9-]+$/.test(unitLabel), 'Safe evidence labels required');

let inventory;
if (!preflight) {
  inventory = read('artifact-hashes.json');
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink(), 'Report symlink rejected');
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name !== 'artifact-hashes.json') files.push(path.relative(root, absolute).replace(/\\/g, '/'));
    }
  }
  walk(root);
  assert(new Set(inventory.artifacts.map(a => a.file)).size === inventory.artifacts.length && same(files.sort(), inventory.artifacts.map(a => a.file).sort()), 'Inventory coverage differs');
  for (const item of inventory.artifacts) {
    const bytes = fs.readFileSync(within(root, item.file));
    assert(bytes.length === item.bytes && hash(bytes) === item.sha256, 'Artifact changed: ' + item.file);
  }
  assert(inventory.totalBytes === inventory.artifacts.reduce((n, a) => n + a.bytes, 0), 'Inventory byte total differs');
  assert(!inventory.artifacts.some(a => /candidate-runtime|ui_strings/.test(a.file)), 'Runtime and support-string copies are outside this compact report');
}
const manifest = read('presentation-changes.json');
assert(manifest.baselinePath === 'reports/watercycle-hydro-readability/candidate-runtime.js' && manifest.baselineSha256 === '6252fd6fd2ccfc1159a9df831ff6857dd1d09ca36e3179e279a8726a44974a4f', 'Frozen baseline differs');
assert(isHash(manifest.sourceSha256) && manifest.presentationOnly === true && manifest.changes.length === 2 && same(manifest.changes.map(change => change.id), ['storm-readout-theme', 'storm-readout-presentation']), 'Theme hook and CSS append required');
if (inventory) assert(inventory.sourceSha256 === manifest.sourceSha256 && inventory.baselineSha256 === manifest.baselineSha256, 'Inventory source differs');
execFileSync(process.execPath, [path.join(root, 'verify-source.cjs'), ...(snapshotOnly ? ['--snapshot-only'] : [])], { stdio: 'inherit', windowsHide: true, env: { ...process.env, WC_REPO: repo } });

const unit = read(preflight ? 'unit/' + unitLabel + '-receipt.json' : 'unit-receipt.json');
const results = read(preflight ? 'unit/' + unitLabel + '-results.json' : 'unit-results.json');
const unitLog = preflight ? 'unit/' + unitLabel + '-run.log' : 'unit-run.log';
assert(unit.sourceSha256 === manifest.sourceSha256 && unit.successful === true && unit.exitCode === 0 && unit.signal === null && !unit.errors.length && unit.total === 33 && unit.passed === 33 && unit.failed === 0 && unit.skipped === 0, 'Complete native receipt required');
assert(unit.environment === 'node' && unit.pool === 'forks' && unit.configLoader === 'native', 'Native runner configuration differs');
assert(results.success === true && results.numTotalTests === 33 && results.numPassedTests === 33 && results.numFailedTests === 0 && results.numPendingTests === 0 && !results.numTodoTests, 'Native result totals differ');
const assertions = results.testResults.flatMap(suite => suite.assertionResults);
assert(results.testResults.length === 2 && results.testResults.every(s => s.status === 'passed') && assertions.length === 33 && assertions.every(a => a.status === 'passed') && new Set(assertions.map(a => a.fullName)).size === 33, 'Native assertions incomplete');
assert(fileHash(within(root, preflight ? 'unit/' + unitLabel + '-results.json' : 'unit-results.json')) === unit.resultSha256 && fileHash(within(root, unitLog)) === unit.logSha256, 'Native result or log changed');
const expected = {
  runtime: ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'],
  tests: ['tests/watercycle_precipitation_lab.test.js', 'tests/watercycle_storm_experiment.test.js'],
  helpers: ['tests/helpers/stem_widgets_smoke_harness.js'],
  support: ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'],
  executionInputs: ['run-tests-node.cjs', 'storm-vitest.config.mjs', 'ssr-node-setup.mjs'],
};
for (const [kind, files] of Object.entries(expected)) {
  const before = unit[kind + 'Before'], after = unit[kind + 'After'];
  assert(same(before, after) && same(before.map(a => a.file), files) && before.every(a => isHash(a.sha256)), 'Native input stamps differ: ' + kind);
  if (kind === 'runtime') assert(before.every(a => a.sha256 === manifest.sourceSha256), 'Native runtime differs');
  for (const item of before) {
    if (kind === 'runtime' || kind === 'support') continue;
    const absolute = preflight
      ? kind === 'executionInputs' ? within(root, 'unit/' + item.file) : path.join(repo, item.file)
      : within(root, 'unit-inputs/' + path.basename(item.file));
    assert(fileHash(absolute) === item.sha256, 'Frozen native input differs: ' + item.file);
  }
  // These suites and their SSR helper use ctx.t fallbacks; neither shared
  // ui_strings file is loaded. Retain their recorded before/after inventory
  // without binding this report to later, unrelated translation edits.
  if (!snapshotOnly && kind !== 'executionInputs' && kind !== 'support') for (const item of before) assert(fileHash(path.join(repo, item.file)) === item.sha256, 'Current native input differs: ' + item.file);
}
for (const [kind, file] of [['runner', 'run-tests-node.cjs'], ['config', 'storm-vitest.config.mjs'], ['setup', 'ssr-node-setup.mjs']]) {
  const stamp = unit.executionInputsBefore.find(a => a.file === file);
  assert(unit[kind + 'File'] === file && unit[kind + 'Sha256'] === stamp.sha256 && unit['final' + kind[0].toUpperCase() + kind.slice(1) + 'Sha256'] === stamp.sha256, 'Runner/config/setup receipt differs');
}

const browserFile = preflight ? qaDir + '/results.json' : inventory.browserResults;
const browser = read(browserFile), browserFolder = path.dirname(browserFile);
assert(browser.successful === true && browser.completed === true && browser.failed === 0 && browser.errors.length === 0 && browser.browserClosed === true && browser.serverClosed === true, 'Complete browser receipt required');
assert(browser.sourceSha256 === manifest.sourceSha256 && browser.publicSourceSha256 === manifest.sourceSha256 && browser.baselineSha256 === manifest.baselineSha256, 'Browser source stamps differ');
assert(isHash(browser.harnessSha256) && fileHash(within(root, browserFolder + '/tested-harness.cjs')) === browser.harnessSha256, 'Frozen browser harness differs');
assert(browser.checks.length === browser.passed && browser.checks.every(check => check.passed === true), 'Browser check totals differ');
function requiredCheck(label) {
  const found = browser.checks.filter(check => check.label === label);
  assert(found.length === 1 && found[0].passed === true, 'Required browser check missing: ' + label);
}
for (const label of ['installed bytes remain unchanged', 'frozen baseline remains unchanged', 'harness remains unchanged', 'two baseline and nine candidate captures completed', 'no runtime errors', 'owned browser and server closed']) requiredCheck(label);
if (inventory) assert(inventory.regressionTests === 33 && inventory.browserChecks === browser.passed, 'Inventory validation counts differ');

const presets = ['gentleRain', 'summerStorm', 'mountainSnow', 'virga', 'freezingRain', 'hailstorm'];
const controls = [{ key: 'lowLevelHumidity', press: 'Home' }, { key: 'midLevelTempC', press: 'End' }];
const semanticKeys = [...presets, ...controls.map(c => c.key)].sort();
function semantics(s) {
  assert(s.role === 'status' && s.live === 'polite' && s.atomic === 'true' && s.label === s.model.displayLabel && s.badge === s.model.formationLabel && s.description === s.model.description && s.cause === s.model.causalExplanation, 'Native result semantics differ');
  assert(s.metricName === 'Precipitation model readouts' && s.metrics.length === 6 && s.metrics.every(m => m.label && m.value), 'Native metric semantics differ');
}
assert(browser.nativeActions.length === 16, 'Native action count differs');
for (const runtime of ['baseline', 'current']) {
  assert(same(Object.keys(browser.semantics[runtime]).sort(), semanticKeys), 'Preset/range semantic coverage differs');
  const actions = browser.nativeActions.filter(action => action.runtime === runtime);
  assert(actions.length === 8, 'Native runtime action count differs');
  for (const id of presets) {
    const s = browser.semantics[runtime][id], found = actions.filter(a => a.action === 'preset' && a.value === id);
    semantics(s);
    assert(s.preset === id && found.length === 1 && found[0].semanticsSha256 === digest(s), 'Native preset action differs: ' + id);
  }
  for (const control of controls) {
    const s = browser.semantics[runtime][control.key], found = actions.filter(a => a.action === 'range-keyboard' && a.key === control.key);
    semantics(s);
    assert(found.length === 1 && found[0].keyPressed === control.press && found[0].before !== found[0].after && Number.isFinite(Number(found[0].before)) && Number.isFinite(Number(found[0].after)) && found[0].semanticsSha256 === digest(s), 'Native range action differs: ' + control.key);
  }
  requiredCheck(runtime + ' presets and range controls retain learner work, experiment metadata, routes and awards');
  requiredCheck(runtime + ' actual mountain terrain label remains present');
}
assert(same(browser.semantics.baseline, browser.semantics.current), 'Native model text or control behavior changed');

const matrix = [
  { name: 'baseline-desktop-light', width: 1280, theme: 'light', baseline: true },
  { name: 'baseline-host400', width: 1280, hostWidth: 400, theme: 'light', baseline: true },
  { name: 'desktop-light', width: 1280, theme: 'light' }, { name: 'desktop-dark', width: 1280, theme: 'dark' },
  { name: 'phone320-light', width: 320, theme: 'light' }, { name: 'phone390-dark', width: 390, theme: 'dark' },
  { name: 'phone320-contrast', width: 320, theme: 'contrast' }, { name: 'phone320-forced', width: 320, theme: 'light', forced: true },
  { name: 'phone390-zoom150', width: 390, theme: 'light', zoom: 1.5 },
  { name: 'host400', width: 1280, hostWidth: 400, theme: 'light' }, { name: 'tablet660-light', width: 660, theme: 'light' },
];
assert(browser.cases.length === 11 && new Set(browser.cases.map(c => c.name)).size === 11 && browser.captures.length === 11 && new Set(browser.captures.map(c => c.file)).size === 11, 'Case/capture matrix incomplete');
assert(browser.loadedSources.length === 11 && new Set(browser.loadedSources.map(c => c.case)).size === 11 && browser.audits.length === 9 && new Set(browser.audits.map(a => a.name)).size === 9, 'Source/audit matrix incomplete');
for (const expectedCase of matrix) {
  const { baseline = false, ...config } = expectedCase, c = browser.cases.find(c => c.name === config.name);
  assert(c && c.baseline === baseline && same(c.config, config) && same(c.semantics, browser.semantics.baseline.mountainSnow), 'Case semantics/configuration differ: ' + config.name);
  const source = baseline ? manifest.baselineSha256 : manifest.sourceSha256, loaded = browser.loadedSources.find(l => l.case === c.name);
  assert(loaded.baseline === baseline && loaded.sha256 === source, 'Loaded runtime differs: ' + c.name);
  const capture = browser.captures.find(a => a.file === c.name + '.png');
  assert(capture && capture.baseline === baseline && capture.sourceSha256 === source, 'Capture source differs: ' + c.name);
  const png = fs.readFileSync(within(root, browserFolder + '/' + capture.file));
  assert(png.length >= 24 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && png.length === capture.bytes && hash(png) === capture.sha256 && png.readUInt32BE(16) === capture.width && png.readUInt32BE(20) === capture.height && capture.width > 0 && capture.width <= config.width + 1 && capture.height > 0 && capture.height <= 2701, 'PNG receipt differs: ' + c.name);
  if (baseline) continue;
  const audit = browser.audits.find(a => a.name === c.name);
  assert(audit && audit.violations.length === 0, 'Scoped audit differs: ' + c.name);
  const m = c.metrics;
  assert(m.theme === config.theme && m.cardColors.length === 7, 'Actual readout theme evidence differs: ' + c.name);
  if (config.theme === 'contrast' && !config.forced) assert(m.cardColors.every(card => card.background === 'rgb(0, 0, 0)') && m.text.every(t => t.color === 'rgb(255, 255, 0)'), 'Black and yellow readout theme differs: ' + c.name);
  if (config.theme === 'dark' && !config.forced) assert(m.cardColors.every(card => card.background === 'rgb(23, 55, 65)' && card.background === card.expectedStormCard), 'Resolved dark readout cards differ: ' + c.name);
  assert(m.containerName.includes('wc-storm-readouts') && m.containerType === 'inline-size' && m.columns === (m.contentWidth >= 680 ? 3 : m.contentWidth >= 400 ? 2 : 1) && m.cards.length === 6 && m.readoutOverflow === false, 'Readout layout differs: ' + c.name);
  assert(m.viewport === config.width && [m.result, m.grid].every(r => r.x >= -1 && r.right <= m.viewport + 1), 'Readout viewport bounds differ');
  assert(m.text.length >= 16 && m.text.every(t => [13, 14, 16, 22].includes(t.minimum) && t.font >= t.minimum && t.splitWords.length === 0 && Number.isFinite(t.contrast) && t.contrast >= (config.theme === 'contrast' ? 7 : 4.5) && [t.rect, t.card, t.panel].every(r => t.textRect.x >= r.x - 1 && t.textRect.right <= r.right + 1 && t.textRect.y >= r.y - 1 && t.textRect.bottom <= r.bottom + 1)), 'Readout text metrics differ: ' + c.name);
}
if (!snapshotOnly) assert(fileHash(path.join(repo, 'dev-tools/watercycle_storm_readout_qa.cjs')) === browser.harnessSha256, 'Current QA harness differs');
console.log(JSON.stringify({ successful: true, sourceSha256: manifest.sourceSha256, onlyThemeHookAndStyles: true, regressionTests: 33, browserChecks: browser.passed, nativeActions: 16, finalCaptures: 9, baselineCaptures: 2, scopedAudits: 9, artifactCount: inventory?.artifacts.length, totalBytes: inventory?.totalBytes, preflight, snapshotOnly }));
