'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const archive = path.join(__dirname, 'word-sounds-before-own-property');
const before = JSON.parse(fs.readFileSync(path.join(archive, 'word-sounds-built-inputs.json'), 'utf8'));
const oldCore = fs.readFileSync(path.join(archive, 'word_sounds_core.js'), 'utf8');
const oldLine = '    const curated = english && CURATED_MANIPULATIONS[target];';
const newLine = '    const curated = english && Object.prototype.hasOwnProperty.call(CURATED_MANIPULATIONS, target) && CURATED_MANIPULATIONS[target];';
if (oldCore.split(oldLine).length !== 2 || read('word_sounds_core.js').toString('utf8') !== oldCore.replace(oldLine, () => newLine)) throw Error('Unexpected change outside inherited-term guard');
const allowed = new Set(['word_sounds_core.js', 'tests/report_word_sounds_content_guard.test.js', 'tests/word_sounds_language_gating.test.js']);
for (const [file, expected] of Object.entries(before.inputHashes)) if (!allowed.has(file) && sha(read(file)) !== expected) throw Error('Unowned input changed before follow-up freeze: ' + file);
const proof = JSON.parse(fs.readFileSync(path.join(archive, 'pre-edit-embedding-proof.json'), 'utf8'));
if (!Object.values(proof.parity).every(Boolean)) throw Error('Pre-edit canonical embedding proof missing');
const pattern = /\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/;
const oldBlock = '// BEGIN GENERATED WORD SOUNDS CORE\n' + oldCore.trim() + '\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE';
for (const file of ['word_sounds_module.js', 'word_sounds_setup_source.jsx']) if (read(file).toString('utf8').match(pattern)?.[0] !== oldBlock) throw Error('Prior embedded core no longer matches source proof: ' + file);
const resultsFile = 'word-sounds-own-property-tests.json';
const results = JSON.parse(fs.readFileSync(path.join(__dirname, resultsFile), 'utf8'));
if (!results.success || results.numFailedTests) throw Error('Narrow follow-up tests failed');
const frozen = Object.fromEntries(['word_sounds_core.js', 'word_sounds_setup_source.jsx', 'word_sounds_module.js'].map(file => [file, sha(read(file))]));
const outputBefore = Object.fromEntries(['word_sounds_setup_module.js', 'desktop/web-app/public/word_sounds_setup_module.js', 'desktop/web-app/public/word_sounds_module.js'].map(file => [file, sha(read(file))]));
const syncSha256 = sha(read('dev-tools/sync_word_sounds_core.cjs'));
const claim = {
  at: new Date().toISOString(), frozen, outputBefore, syncSha256,
  preEditCoreEmbeddingVerified: true, preEditCoreSha256: before.inputHashes['word_sounds_core.js'],
  followUp: 'Only the inherited object-property guard in canonical core plus its regression and one obsolete language-pool assertion; original 80/81 failure retained in word-sounds-before-own-property.',
  tests: { result: resultsFile, passed: results.numPassedTests, failed: results.numFailedTests,
    inputHashes: Object.fromEntries(['tests/report_word_sounds_content_guard.test.js', 'tests/word_sounds_language_gating.test.js', 'tests/helpers/word_sounds_core.js', 'tests/helpers/word_sounds_pack_fixture.js', 'tests/helpers/word_sounds_harness.js'].map(file => [file, sha(read(file))])),
    playerExecution: 'Actual player with current canonical core embedded in memory; generated mirrors still await root guarded resync.' },
  hostNavigation: { proposalOnly: true, fixApplied: false },
  limits: ['Only existing exact matching English curated tasks are graded; other task drafts require content review.', 'Generated connected text grammar/science is not certified.', 'No deployed timing, keyboard, screen reader, or full CI claim.']
};
fs.writeFileSync(path.join(__dirname, 'word-sounds-build-claim.json'), JSON.stringify(claim, null, 2) + '\n');
console.log(JSON.stringify({ frozen, outputBefore, testsPassed: results.numPassedTests, inputDriftExceptAuthorized: [] }));
