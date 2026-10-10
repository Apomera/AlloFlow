'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const baselineHash = 'f00632bfe4eb8f57091aca4550b05d0eb0272a745dccbdf7a1f8a8d740d50086';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const files = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'].map(name => path.join(repo, name));
const baselineFile = path.join(__dirname, 'baseline-runtime.js');
if (!fs.existsSync(baselineFile)) {
  const baseline = fs.readFileSync(files[0]);
  if (hash(baseline) !== baselineHash || !baseline.equals(fs.readFileSync(files[1]))) throw Error('Starting runtime copies differ from reviewed baseline');
  fs.writeFileSync(baselineFile, baseline, { flag: 'wx' });
}
const baseline = fs.readFileSync(baselineFile);
if (hash(baseline) !== baselineHash) throw Error('Frozen baseline changed');
if (process.argv.includes('--freeze')) { console.log(JSON.stringify({ baselineSha256: baselineHash, bytes: baseline.length })); process.exit(0); }
let source = baseline.toString('utf8');
const newline = '\n';
const normalized = text => text.replace(/\r\n/g, '\n').trimEnd();
const helper = normalized(fs.readFileSync(path.join(__dirname, 'render-land-cutaway.js'), 'utf8'));
const css = normalized(fs.readFileSync(path.join(__dirname, 'land-cutaway.css'), 'utf8'));
if (!helper.startsWith('          function renderWcLandCutaway() {')) throw Error('Unexpected presentation helper boundary');
const changes = [];
function replace(id, original, replacement) {
  if (source.indexOf(original) < 0 || source.indexOf(original) !== source.lastIndexOf(original)) throw Error('Nonunique insertion: ' + id);
  source = source.replace(original, replacement);
  changes.push({ id, original, replacement });
}
const styleAnchor = '  // Read a pore-scale schematic independently of the live water parcel.';
replace('cutaway-styles', styleAnchor, '  var WC_LAND_CUTAWAY_STYLE = ' + JSON.stringify(css) + ';' + newline + newline + styleAnchor);
const helperAnchor = '          function startWcQuickGuide() {';
replace('cutaway-renderer', helperAnchor, helper + newline + newline + helperAnchor);
const controlsAt = source.indexOf('              React.createElement("div", { className: "wc-land-grid" },');
const evidenceAt = source.indexOf('              React.createElement("div", { className: "wc-land-response-head" },', controlsAt);
const comparisonAt = source.indexOf('            wcScenarioBaseline && React.createElement("div", {', evidenceAt);
const labEnd = source.lastIndexOf('            ),', comparisonAt);
if (controlsAt < 0 || evidenceAt <= controlsAt || labEnd <= evidenceAt) throw Error('Land lab boundaries changed');
const controls = source.slice(controlsAt, evidenceAt).trimEnd();
const evidence = source.slice(evidenceAt, labEnd).trimEnd();
const originalLabBody = source.slice(controlsAt, labEnd);
const workbench = [
  '              React.createElement("div", { className: "wc-land-workbench" },',
  '                React.createElement("div", { className: "wc-land-evidence" },',
  '                  renderWcLandCutaway(),',
  evidence,
  '                ),',
  '                React.createElement("div", { className: "wc-land-controls-stack" },',
  controls,
  '                  React.createElement("button", { type: "button", className: "wc-land-return", "data-cutaway-return": "true",',
  '                    onClick: function() { focusWcComparisonTarget("wcLandCutawayTitle"); } }, "See updated cutaway")',
  '                )',
  '              )',
  ''
].join(newline);
replace('cutaway-workbench', originalLabBody, workbench);
new Function(source);
let restored = source;
for (const change of changes) {
  if (restored.indexOf(change.replacement) < 0 || restored.indexOf(change.replacement) !== restored.lastIndexOf(change.replacement)) throw Error('Nonunique restoration: ' + change.id);
  restored = restored.replace(change.replacement, change.original);
}
if (!Buffer.from(restored).equals(baseline)) throw Error('Change outside reviewed presentation slices');
const candidate = Buffer.from(source);
fs.writeFileSync(path.join(__dirname, 'candidate-runtime.js'), candidate);
fs.writeFileSync(path.join(__dirname, 'presentation-changes.json'), JSON.stringify({ baselineSha256: baselineHash,
  sourceSha256: hash(candidate), bytes: candidate.length, changes }, null, 2) + '\n');
console.log(JSON.stringify({ successful: true, sourceSha256: hash(candidate), bytes: candidate.length, slices: changes.map(change => change.id) }));
