'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { Script } = require('node:vm');
const root = path.resolve(__dirname, '../..');
const phase = process.argv[2];
const phases = {
  reader: ['text_utility_helpers', 'view_simplified'],
  core: ['generate_dispatcher', 'generation_helpers', 'gemini_api', 'guided_mode_config'],
  audio: ['tts', 'view_kokoro_offer_modal'],
  recovery: ['view_canvas_recovery_dialog'],
  url: ['utils_pure'],
  interview: ['personas'],
};
if (!phases[phase]) throw new Error('Use reader, core, audio, recovery, url or interview');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'));
const reportPath = path.join(__dirname, 'build-' + phase + '.json');
const previousReport = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'reflective_journal.md'];
const hostHashes = Object.fromEntries(hosts.map(file => [file, hash(read(file))]));
const report = { at: new Date().toISOString(), phase, hostIntegration: 'paused pending shared writer clarification', modules: [] };
function guardPair(file) {
  const mirror = 'desktop/web-app/public/' + file;
  if (!read(file).equals(read(mirror))) throw new Error('Unreconciled generated mirror difference: ' + file);
  for (const target of [file, mirror]) {
    const claimFile = { recovery: 'recovery-copy-validation.json', url: 'url-key-validation.json', interview: 'interview-build-claim.json' }[phase];
    const claim = claimFile ? JSON.parse(fs.readFileSync(path.join(__dirname, claimFile), 'utf8')) : null;
    const expected = previousReport?.modules.find(module => module.output === file)?.sha256 || baseline.files[target]?.sha256 || claim?.before?.outputSha256;
    if (claimFile && !expected) throw new Error('Missing guarded generated baseline: ' + target);
    if (expected && hash(read(target)) !== expected) throw new Error('Generated output changed since baseline: ' + target);
  }
}
for (const name of phases[phase]) {
  const output = name + '_module.js';
  guardPair(output);
  const inputs = name === 'view_simplified' ? ['reader_place_store.js', 'reader_support_drafts.js', 'view_simplified_source.jsx'] : [name + '_source.jsx'];
  const before = Object.fromEntries(inputs.map(file => [file, hash(read(file))]));
  const recorded = previousReport?.modules.find(module => module.output === output);
  if (recorded && Object.entries(before).every(([file, sha]) => recorded.inputs?.[file] === sha)) {
    new Script(read(output).toString('utf8'), { filename: output });
    report.modules.push({ ...recorded, reusedUnchanged: true });
    continue;
  }
  const command = name === 'view_canvas_recovery_dialog' ? ['_build_first_wave_view_modules.js', 'CanvasRecoveryDialogView'] : ['_build_' + name + '_module.js'];
  execFileSync(process.execPath, command, { cwd: root, windowsHide: true, stdio: 'inherit' });
  if (inputs.some(file => before[file] !== hash(read(file)))) throw new Error('Source changed during build: ' + name);
  if (!read(output).equals(read('desktop/web-app/public/' + output))) throw new Error('Builder mirror mismatch: ' + name);
  new Script(read(output).toString('utf8'), { filename: output });
  report.modules.push({ output, sha256: hash(read(output)), inputs: before, mirrorEqual: true, syntax: 'passed' });
}
if (phase === 'core') {
  const output = 'error_reporter_module.js';
  const mirror = 'desktop/web-app/public/' + output;
  const expected = baseline.files[mirror]?.sha256;
  if (!expected || hash(read(mirror)) !== expected) throw new Error('Reporter mirror changed since baseline; do not overwrite');
  if (baseline.files[output]?.sha256 !== expected) throw new Error('Reporter baseline had destination-only work');
  const bytes = read(output);
  new Script(bytes.toString('utf8'), { filename: output });
  fs.writeFileSync(path.join(root, mirror), bytes);
  report.modules.push({ output, sha256: hash(bytes), mirrorEqual: read(output).equals(read(mirror)), syntax: 'passed' });
}
report.untouchedByBuild = Object.fromEntries(hosts.map(file => [file, hostHashes[file] === hash(read(file))]));
if (Object.values(report.untouchedByBuild).some(value => !value)) report.concurrentHostChange = true;
if (previousReport) {
  const archive = path.join(__dirname, 'build-' + phase + '-before-' + previousReport.at.replace(/[^0-9]/g, '') + '.json');
  if (!fs.existsSync(archive)) fs.writeFileSync(archive, JSON.stringify(previousReport, null, 2) + '\n');
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log('Built scoped ' + phase + ' candidate; canonical source/public pairs and syntax verified. Shared host integration remains paused.');
