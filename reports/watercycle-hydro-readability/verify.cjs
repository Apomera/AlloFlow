'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = __dirname;
const preflight = process.argv.includes('--preflight');
const snapshotOnly = process.argv.includes('--snapshot-only');
const repo = process.env.WC_REPO || (preflight
  ? 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated'
  : path.resolve(root, '../..'));
const BASE_SHA = 'bef9797b926aafb7430bcce82d7f24252c1d9e09361efc6a9cc6aea6ed29ec88';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (ok, message) => { if (!ok) throw Error(message); };
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const arg = (name, fallback) => process.argv.find(a => a.startsWith('--' + name + '='))?.slice(name.length + 3) || fallback;
const label = value => { assert(/^[a-z0-9-]+$/.test(value), 'Safe evidence label required'); return value; };
const contained = (directory, relative) => {
  assert(typeof relative === 'string' && relative && !path.isAbsolute(relative), 'Relative artifact path required');
  const absolute = path.resolve(directory, relative);
  assert(absolute.startsWith(path.resolve(directory) + path.sep), 'Artifact path escaped evidence root');
  return absolute;
};
const read = relative => JSON.parse(fs.readFileSync(contained(root, relative), 'utf8'));
const fileHash = absolute => hash(fs.readFileSync(absolute));
const digest = value => hash(JSON.stringify(stable(value)));
const isHash = value => /^[a-f0-9]{64}$/.test(value || '');

let inventory;
if (!preflight) {
  inventory = read('artifact-hashes.json');
  const actual = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink(), 'Unexpected report symlink');
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name !== 'artifact-hashes.json') actual.push(path.relative(root, absolute).replace(/\\/g, '/'));
    }
  }
  walk(root);
  assert(Array.isArray(inventory.artifacts) && new Set(inventory.artifacts.map(a => a.file)).size === inventory.artifacts.length, 'Artifact inventory duplicates');
  assert(same(actual.sort(), inventory.artifacts.map(a => a.file).sort()), 'Artifact inventory coverage differs');
  for (const item of inventory.artifacts) {
    const bytes = fs.readFileSync(contained(root, item.file));
    assert(bytes.length === item.bytes && hash(bytes) === item.sha256, 'Artifact changed: ' + item.file);
  }
  assert(inventory.totalBytes === inventory.artifacts.reduce((n, a) => n + a.bytes, 0), 'Inventory byte total differs');
}

const manifest = read('presentation-changes.json');
assert(isHash(manifest.sourceSha256) && manifest.baselineSha256 === BASE_SHA, 'Unexpected source baseline');
if (inventory) assert(inventory.sourceSha256 === manifest.sourceSha256 && inventory.baselineSha256 === BASE_SHA, 'Inventory source differs');
assert(fileHash(path.join(root, 'candidate-runtime.js')) === manifest.sourceSha256, 'Frozen candidate differs');
assert(manifest.changes?.length === 3 && same(manifest.changes.map(change => change.id).sort(), ['hydro-rank-label', 'hydro-readability-styles', 'hydro-theme-context']), 'Presentation scope differs');
const themeChange = manifest.changes.find(change => change.id === 'hydro-theme-context');
const rankChange = manifest.changes.find(change => change.id === 'hydro-rank-label');
const cssChange = manifest.changes.find(change => change.id === 'hydro-readability-styles');
const themeOriginal = '              "data-watercycle-hydro-quest": "true",';
assert(themeChange.original === themeOriginal && themeChange.replacement === themeOriginal + '\n              "data-wc-hydro-theme": isDark ? "dark" : "light",', 'Local theme hook differs');
const rankOriginal = 'React.createElement("h4", null, hydroRank)';
const rankReplacement = 'React.createElement("p", { className: "wc-hydro-rank" }, hydroRank)';
assert(rankChange.original.trim() === rankOriginal && rankChange.replacement === rankChange.original.replace(rankOriginal, rankReplacement), 'Local rank label markup differs');
const css = fs.readFileSync(path.join(root, 'hydro.css'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
assert(cssChange.replacement === cssChange.original + '    if (wcFiveStyle) wcFiveStyle.textContent += ' + JSON.stringify(css) + ';\n', 'Frozen CSS does not match source append');
assert(fs.statSync(path.join(root, 'candidate-runtime.js')).size === manifest.bytes, 'Candidate byte count differs');
execFileSync(process.execPath, [path.join(root, 'verify-source.cjs'), ...(snapshotOnly ? [] : ['--installed'])], {
  stdio: 'inherit', env: { ...process.env, WC_REPO: repo }, windowsHide: true,
});

const unitLabel = label(arg('unit-label', 'unit-node'));
const qaLabel = label(arg('qa-label', 'qa-final'));
const unit = read(preflight ? unitLabel + '-receipt.json' : 'unit-receipt.json');
const unitResults = read(preflight ? unitLabel + '-results.json' : 'unit-results.json');
assert(unit.sourceSha256 === manifest.sourceSha256 && unit.successful === true && unit.exitCode === 0 && unit.passed === 4 && unit.failed === 0 && unit.skipped === 0, 'Complete four-test native receipt required');
assert(unit.environment === 'node' && unit.pool === 'forks', 'Native configuration scope differs');
assert(unitResults.success === true && unitResults.numTotalTests === 4 && unitResults.numPassedTests === 4 && unitResults.numFailedTests === 0 && unitResults.numPendingTests === 0 && !unitResults.numTodoTests, 'Native result totals differ');
const assertions = unitResults.testResults.flatMap(suite => suite.assertionResults);
assert(assertions.length === 4 && assertions.every(a => a.status === 'passed') && new Set(assertions.map(a => a.fullName)).size === 4, 'Native assertions incomplete or duplicated');
assert(unitResults.testResults.every(s => s.status === 'passed'), 'Native suite status differs');
for (const [before, after] of [['runtimeBefore', 'runtimeAfter'], ['testsBefore', 'testsAfter'], ['supportBefore', 'supportAfter']]) {
  assert(Array.isArray(unit[before]) && same(unit[before], unit[after]), 'Native inputs changed: ' + before);
}
const runtimeFiles = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const testFiles = ['tests/watercycle_hydro_quest.test.js'];
const supportFiles = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
for (const [stamps, files] of [[unit.runtimeBefore, runtimeFiles], [unit.testsBefore, testFiles], [unit.supportBefore, supportFiles]]) {
  assert(same(stamps.map(a => a.file), files) && stamps.every(a => isHash(a.sha256)), 'Native input stamp coverage differs');
}
assert(unit.runtimeBefore.every(a => a.sha256 === manifest.sourceSha256), 'Native runtime hashes differ');
for (const stamp of [...unit.testsBefore, ...unit.supportBefore]) {
  const location = preflight ? path.join(repo, stamp.file) : path.join(root, 'unit-inputs', path.basename(stamp.file));
  assert(fileHash(location) === stamp.sha256, 'Frozen native test differs');
}
if (!snapshotOnly) for (const stamp of [...unit.testsBefore, ...unit.supportBefore]) {
  assert(fileHash(path.join(repo, stamp.file)) === stamp.sha256, 'Current native input differs: ' + stamp.file);
}
for (const kind of ['runner', 'config']) {
  const filename = unit[kind + 'File'], recorded = unit[kind + 'Sha256'], final = unit['final' + kind[0].toUpperCase() + kind.slice(1) + 'Sha256'];
  assert(typeof filename === 'string' && filename === path.basename(filename) && isHash(recorded) && final === recorded, 'Native ' + kind + ' input receipt incomplete');
  const location = preflight ? path.join(root, filename) : path.join(root, 'unit-inputs', filename);
  assert(fileHash(location) === recorded, 'Frozen native ' + kind + ' differs');
}

const browserRelative = preflight ? qaLabel + '/results.json' : inventory.browserResults;
const browser = read(browserRelative), browserFolder = path.dirname(browserRelative);
assert(browser.successful === true && browser.completed === true && browser.baselineOnly === false && browser.browserLaunched === true && browser.browserClosed === true && browser.serverListening === true && browser.serverClosed === true && Array.isArray(browser.errors) && !browser.errors.length && browser.failed === 0, 'Complete successful browser receipt required');
for (const key of ['sourceSha256', 'publicSourceSha256', 'finalSourceSha256', 'finalPublicSourceSha256']) assert(browser[key] === manifest.sourceSha256, 'Browser source stamp differs: ' + key);
assert(browser.baselineSha256 === BASE_SHA && isHash(browser.harnessSha256) && browser.finalHarnessSha256 === browser.harnessSha256, 'Browser baseline/harness stamps differ');
assert(fileHash(contained(root, browserFolder + '/tested-harness.cjs')) === browser.harnessSha256, 'Frozen browser harness differs');
assert(Array.isArray(browser.checks) && browser.checks.length === browser.passed && browser.checks.every(c => c.passed === true), 'Browser passing check count differs');
assert(browser.qaRasterThrottle?.drawsOmittedForPanelChecks === true && browser.qaRasterThrottle.exactDomCloneOnlyDuringCapture === true, 'Browser capture scope absent');
if (inventory) assert(inventory.browserChecks === browser.passed && inventory.regressionTests === 4, 'Inventory validation counts differ');

const matrix = [
  { name: 'baseline-desktop-light', baseline: true, width: 1280, theme: 'light', completed: 3 },
  { name: 'baseline-host400', baseline: true, width: 1280, hostWidth: 400, theme: 'light', completed: 3 },
  { name: 'desktop-light', baseline: false, width: 1280, theme: 'light', completed: 3 },
  { name: 'desktop-dark', baseline: false, width: 1280, theme: 'dark', completed: 6 },
  { name: 'phone320-light', baseline: false, width: 320, theme: 'light', completed: 0 },
  { name: 'phone320-dark', baseline: false, width: 320, theme: 'dark', completed: 3 },
  { name: 'phone320-contrast', baseline: false, width: 320, theme: 'contrast', completed: 3 },
  { name: 'phone320-forced', baseline: false, width: 320, theme: 'light', forced: true, completed: 6 },
  { name: 'phone390-zoom150', baseline: false, width: 390, theme: 'light', zoom: 1.5, completed: 3 },
  { name: 'host400', baseline: false, width: 1280, hostWidth: 400, theme: 'light', completed: 3 },
];
const missions = [
  ['cloud', 'Cloud Chaser', 'Reach condensation in 3D'],
  ['river', 'River Runner', 'Travel by surface runoff in 3D'],
  ['deep', 'Deep Current', 'Enter soil or an aquifer in 3D'],
  ['green', 'Green Return', 'Travel through a plant in 3D'],
  ['routes', 'Route Master', 'Explore all three land paths in 3D'],
  ['cycle', 'Cycle Keeper', 'Complete a full 3D cycle'],
];
function validateSemantics(s, completed, name) {
  const points = completed * 20;
  assert(s && s.labelledby === 'wcHydroQuestTitle' && s.describedby === 'wcHydroQuestStatus', name + ' section identity differs');
  assert(s.rank === ({ 0: 'Observer', 3: 'Watershed Scout', 6: 'Cycle Guardian' })[completed], name + ' rank differs');
  assert(s.score === points + ' HP' && s.scoreLabel === points + ' of 120 Hydro Points', name + ' score differs');
  const p = s.progress;
  assert(p.role === 'progressbar' && !!p.name && p.min === '0' && p.max === '120' && p.now === String(points) && p.fill === points / 1.2 + '%' && p.text === completed + ' of 6 missions complete; ' + points + ' of 120 Hydro Points.', name + ' progress semantics differ');
  assert(s.status === completed + ' of 6 Hydro Quest missions complete. ' + points + ' of 120 Hydro Points.' && s.live === 'polite', name + ' spoken status differs');
  assert(s.list.role === 'list' && !!s.list.name && s.missions.length === 6, name + ' mission list differs');
  for (let i = 0; i < 6; i++) {
    const m = s.missions[i], [id, missionName, detail] = missions[i], complete = completed === 6 || completed === 3 && i < 3;
    assert(m.id === id && m.name === missionName && m.detail === detail && m.role === 'listitem' && m.complete === complete, name + ' mission content differs: ' + id);
    assert(m.state === (complete ? 'Complete' : 'Open') && m.mark === (complete ? '\u2713' : '\u25cb') && m.markHidden === 'true' && m.aria === missionName + (complete ? ' complete. ' : ' open. ') + detail, name + ' non-color mission state differs: ' + id);
  }
}
assert(same(Object.keys(browser.frozenSemantics).sort(), ['0', '3', '6']), 'Frozen evidence state coverage differs');
for (const completed of [0, 3, 6]) validateSemantics(browser.frozenSemantics[completed], completed, 'Frozen ' + completed);
assert(browser.cases.length === 10 && new Set(browser.cases.map(c => c.name)).size === 10, 'Browser case matrix incomplete');
assert(browser.captures.length === 10 && new Set(browser.captures.map(c => c.name)).size === 10, 'Capture matrix incomplete');
assert(browser.loadedSources.length === 10 && new Set(browser.loadedSources.map(c => c.case)).size === 10, 'Loaded source matrix incomplete');
assert(browser.nativeActions.length === 16 && browser.audits.length === 8 && new Set(browser.audits.map(a => a.case)).size === 8, 'Native action or audit matrix incomplete');
assert(browser.fixtures.length === 11, 'Native fixture matrix incomplete');
const baseFixtures = browser.fixtures.filter(f => f.baseline);
assert(baseFixtures.length === 3 && same(baseFixtures.map(f => f.completed).sort((a, b) => a - b), [0, 3, 6]), 'Frozen fixture states incomplete');
for (const completed of [0, 3, 6]) {
  const fixtures = browser.fixtures.filter(f => f.completed === completed), frozen = browser.frozenSemantics[completed];
  assert(fixtures.every(f => isHash(f.seedSha256) && f.semanticsSha256 === digest(frozen)) && new Set(fixtures.map(f => f.seedSha256)).size === 1, 'Fixture evidence differs: ' + completed);
}

for (const expected of matrix) {
  const c = browser.cases.find(a => a.name === expected.name);
  assert(c && c.baseline === expected.baseline, 'Case missing: ' + expected.name);
  const { baseline, ...config } = expected;
  assert(same(c.config, config), 'Case configuration differs: ' + c.name);
  validateSemantics(c.semantics, config.completed, c.name);
  assert(same(c.semantics, browser.frozenSemantics[config.completed]) && c.semanticsSha256 === digest(c.semantics), 'Native semantics changed: ' + c.name);
  const loaded = browser.loadedSources.find(a => a.case === c.name), source = baseline ? BASE_SHA : manifest.sourceSha256;
  assert(loaded.baseline === baseline && loaded.sha256 === source, 'Loaded runtime differs: ' + c.name);
  const capture = browser.captures.find(a => a.name === c.name);
  assert(capture && capture.baseline === baseline && capture.completed === config.completed && capture.sourceSha256 === source && capture.file === c.name + '.png', 'Capture identity differs: ' + c.name);
  const png = fs.readFileSync(contained(root, browserFolder + '/' + capture.file));
  assert(png.length >= 24 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && png.length === capture.bytes && hash(png) === capture.sha256 && png.readUInt32BE(16) === capture.width && png.readUInt32BE(20) === capture.height && capture.width > 0 && capture.width <= config.width + 1 && capture.height > 0 && capture.height <= 2361, 'PNG receipt differs: ' + c.name);
  const clone = capture.clone;
  assert(clone?.markupEqual === true && Math.abs(clone.before.width - clone.after.width) <= 1 && Math.abs(clone.before.height - clone.after.height) <= 1, 'Exact DOM capture differs: ' + c.name);
  if (baseline) continue;
  const fixture = browser.fixtures.filter(f => !f.baseline && f.case === c.name);
  assert(fixture.length === 1 && fixture[0].completed === config.completed && fixture[0].semanticsSha256 === c.semanticsSha256, 'Final native fixture differs: ' + c.name);
  const audit = browser.audits.find(a => a.case === c.name);
  assert(audit && Array.isArray(audit.violations) && !audit.violations.length, 'Scoped accessibility audit differs: ' + c.name);
  const actions = browser.nativeActions.filter(a => a.case === c.name);
  assert(actions.length === 2 && same(actions.map(a => a.action), ['keyboard-view-2d', 'keyboard-view-3d']), 'Native view action sequence differs: ' + c.name);
  const initialized = browser.checks.filter(check => check.label === c.name + ' preserved parcel snapshot uses actual initialized engine progress');
  assert(initialized.length === 1 && initialized[0].passed === true && typeof initialized[0].detail?.progress === 'string' && initialized[0].detail.progress.trim() !== '' && Number.isFinite(Number(initialized[0].detail.progress)), 'Initialized engine progress receipt differs: ' + c.name);
  for (const [i, action] of actions.entries()) {
    assert(action.view === (i ? '3d' : '2d') && action.panelCount === i && action.pressed === 'true' && action.focused === true && action.canvasIdentity === true && action.retained === true && action.awardsRetained === true && action.parcelRetained === true, 'Native state retention differs: ' + c.name);
    assert(isHash(action.beforeSha256) && isHash(action.afterSha256) && same(action.changedFields, i ? [] : ['journeyView']), 'Native snapshot/changed fields differ: ' + c.name);
  }
  assert(actions[0].beforeSha256 === actions[1].beforeSha256 && actions[1].afterSha256 === actions[1].beforeSha256 && actions[0].afterSha256 !== actions[0].beforeSha256, 'Native return-to-3D snapshot differs: ' + c.name);
  const m = c.metrics, zoom = config.zoom || 1;
  assert(m.containerName.includes('wc-hydro-quest') && m.containerType === 'inline-size' && m.columns === (m.contentWidth >= 900 ? 3 : m.contentWidth >= 560 ? 2 : 1), 'Available-width layout differs: ' + c.name);
  assert(m.theme === (config.theme === 'light' ? 'light' : 'dark') && m.backgroundImage === 'none' && m.animations === 0 && m.overflow === false && m.outliers.length === 0, 'Panel theme/containment differs: ' + c.name);
  assert(m.rect.x >= -1 && m.rect.right <= m.viewportWidth + 1 && m.viewportWidth === config.width && m.progress.rect.height / zoom >= 10, 'Panel or progress bounds differ: ' + c.name);
  assert(m.status.visible && m.status.font >= 13 && m.status.position !== 'absolute' && m.status.text === c.semantics.status, 'Visible completion status differs: ' + c.name);
  assert(m.text.length > 20 && m.text.every(t => Number.isFinite(t.font) && t.minimum === (t.tag === 'H4' || /(?:^|\s)wc-hydro-rank(?:\s|$)/.test(t.className) || t.tag === 'STRONG' && missions.some(mission => mission[1] === t.text) ? 15 : 13) && t.font >= t.minimum && t.words.every(n => n <= 1) && t.textRect.x >= m.rect.x - 1 && t.textRect.right <= m.rect.right + 1 && Number.isFinite(t.contrast) && t.contrast >= 4.5), 'Text font/whole-word/contrast differs: ' + c.name);
  assert(m.text.every(t => [t.rect, t.cardRect].every(r => r && t.textRect.x >= r.x - 1 && t.textRect.right <= r.right + 1 && t.textRect.y >= r.y - 1 && t.textRect.bottom <= r.bottom + 1)), 'Text escaped its own label or mission card: ' + c.name);
  assert(m.cards.length === 6 && m.cards.filter(a => a.complete).length === config.completed, 'Visible completion cards differ: ' + c.name);
  for (const [i, card] of m.cards.entries()) {
    assert(card.id === missions[i][0] && card.state === c.semantics.missions[i].state && card.stateRect.y >= card.nameRect.y - 1 && card.stateRect.right <= card.rect.right + 1, 'Visible mission state differs: ' + c.name);
    if (config.forced && card.complete) assert(card.borderStyle === 'double' && card.borderWidth * zoom >= 3, 'Forced-color completion border differs: ' + c.name);
  }
}
if (!snapshotOnly) assert(fileHash(path.join(repo, 'dev-tools/watercycle_hydro_readability_qa.cjs')) === browser.harnessSha256, 'Current browser harness differs');
console.log(JSON.stringify({ successful: true, sourceSha256: manifest.sourceSha256, onlyThemeRankLabelAndStyles: true, regressionTests: 4, browserChecks: browser.passed, finalCaptures: 8, baselineCaptures: 2, nativeActions: 16, scopedAudits: 8, artifactCount: inventory?.artifacts.length, totalBytes: inventory?.totalBytes, preflight, snapshotOnly }));
