'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const reportDir = __dirname;
const root = path.resolve(reportDir, '../..');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const proof = JSON.parse(fs.readFileSync(path.join(reportDir, 'word-sounds-content-validation.json'), 'utf8'));
const results = JSON.parse(fs.readFileSync(path.join(reportDir, 'word-sounds-content-route-tests.json'), 'utf8'));
if (!results.success || results.numFailedTests || results.numPassedTests !== 24) throw Error('Current route suite is not 24/24');
if (!Object.values(proof.preEditEmbeddedCoreMatchesCanonical).every(Boolean)) throw Error('Pre-edit embedding proof failed');
const frozen = {
  'word_sounds_core.js': 'a4934a1757716141c754a260bcdf5620798eed89da11b298a634b9f7833aeb54',
  'word_sounds_setup_source.jsx': '57e97d42d537dccaa2c1c0081ee4d348bbc2abfb9eed445b4c4212c86847928f',
  'word_sounds_module.js': '130eeaa68c64a7cf5a932a2791ad5395b0355ff4017b14774f56ba56ff3ee04a'
};
for (const [file, expected] of Object.entries(frozen)) if (sha(read(file)) !== expected) throw Error('Owned input changed before freeze: ' + file);
const outputBefore = proof.generatedHashesBeforeRootBuild;
for (const [file, expected] of Object.entries(outputBefore)) if (sha(read(file)) !== expected) throw Error('Generated destination changed before root build: ' + file);
if (sha(read('dev-tools/sync_word_sounds_core.cjs')) !== proof.syncScriptHash) throw Error('Sync workflow changed');
const tests = ['tests/report_word_sounds_content_guard.test.js', 'tests/helpers/word_sounds_core.js', 'tests/helpers/word_sounds_pack_fixture.js', 'tests/helpers/word_sounds_harness.js'];
const claim = {
  at: new Date().toISOString(), frozen, outputBefore,
  syncSha256: proof.syncScriptHash, preEditCoreEmbeddingVerified: true,
  tests: { result: 'word-sounds-content-route-tests.json', passed: results.numPassedTests, failed: results.numFailedTests,
    inputHashes: Object.fromEntries(tests.map(file => [file, sha(read(file))])),
    playerExecution: 'Actual full player with canonical core embedded in memory, not yet generated mirror' },
  hostNavigation: { held: true, chain: 'onClose=handleCloseDashboard at host line 16733 sets active view to input; minimized Word Sounds mount at line 43137 retains wsGeneratorMinimized', fixApplied: false },
  limits: proof.limits
};
const target = path.join(reportDir, 'word-sounds-build-claim.json');
if (fs.existsSync(target)) throw Error('Existing freeze claim must be reconciled, not overwritten');
fs.writeFileSync(target, JSON.stringify(claim, null, 2) + '\n');
console.log(JSON.stringify({ frozen, testsPassed: results.numPassedTests, claim: target }));
