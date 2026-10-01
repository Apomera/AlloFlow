'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { Script } = require('node:vm');
const root = path.resolve(__dirname, '../..');
const claim = JSON.parse(fs.readFileSync(path.join(__dirname, 'word-sounds-build-claim.json'), 'utf8'));
const reportPath = path.join(__dirname, 'build-word.json');
const previousReport = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
const read = file => fs.readFileSync(path.join(root, file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'reflective_journal.md'];
const hostHashes = Object.fromEntries(hosts.map(file => [file, hash(read(file))]));
const player = 'word_sounds_module.js', setup = 'word_sounds_setup_module.js';
for (const [file, expected] of Object.entries(claim.frozen)) {
  if (hash(read(file)) !== expected) throw new Error('Owned input drift before core sync: ' + file);
}
for (const [file, expected] of Object.entries(claim.outputBefore)) {
  if (hash(read(file)) !== expected) throw new Error('Generated destination drift before build: ' + file);
}
if (!read(setup).equals(read('desktop/web-app/public/' + setup))) throw new Error('Unreconciled setup mirror');
if (hash(read('dev-tools/sync_word_sounds_core.cjs')) !== claim.syncSha256 || claim.preEditCoreEmbeddingVerified !== true) throw new Error('Unverified sync workflow');
const frozenCore = hash(read('word_sounds_core.js'));
execFileSync(process.execPath, ['dev-tools/sync_word_sounds_core.cjs'], { cwd: root, windowsHide: true, stdio: 'inherit' });
if (hash(read('word_sounds_core.js')) !== frozenCore) throw new Error('Canonical core changed during sync');
const inputs = Object.fromEntries(['word_sounds_core.js', 'word_sounds_setup_source.jsx', 'dev-tools/sync_word_sounds_core.cjs', '_build_word_sounds_setup_module.js'].map(file => [file, hash(read(file))]));
new Script(read(player).toString('utf8'), { filename: player });
execFileSync(process.execPath, ['_build_word_sounds_setup_module.js'], { cwd: root, windowsHide: true, stdio: 'inherit' });
for (const [file, expected] of Object.entries(inputs)) if (hash(read(file)) !== expected) throw new Error('Input drift during build: ' + file);
const playerMirror = 'desktop/web-app/public/' + player;
if (hash(read(playerMirror)) !== claim.outputBefore[playerMirror]) throw new Error('Player destination changed during build');
fs.copyFileSync(path.join(root, player), path.join(root, playerMirror));
const modules = [player, setup].map(output => {
  new Script(read(output).toString('utf8'), { filename: output });
  if (!read(output).equals(read('desktop/web-app/public/' + output))) throw new Error('Generated mirror mismatch: ' + output);
  return { output, sha256: hash(read(output)), inputs, mirrorEqual: true, syntax: 'passed' };
});
const untouchedByBuild = Object.fromEntries(hosts.map(file => [file, hostHashes[file] === hash(read(file))]));
if (previousReport) {
  const archive = path.join(__dirname, 'build-word-before-' + previousReport.at.replace(/[^0-9]/g, '') + '.json');
  if (!fs.existsSync(archive)) fs.writeFileSync(archive, JSON.stringify(previousReport, null, 2) + '\n');
}
fs.writeFileSync(reportPath, JSON.stringify({ at: new Date().toISOString(), phase: 'word', hostIntegration: 'held', modules, untouchedByBuild }, null, 2) + '\n');
if (Object.values(untouchedByBuild).some(value => !value)) throw new Error('Held file changed during build; reconcile concurrent writer');
console.log('Canonical Word Sounds core synchronized; owned player/setup pairs built and verified. Host untouched.');
