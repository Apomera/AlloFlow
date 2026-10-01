'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const capture = JSON.parse(fs.readFileSync(path.join(__dirname, 'word-sounds-built-inputs.json'), 'utf8'));
for (const [file, expected] of Object.entries(capture.inputHashes)) if (sha(fs.readFileSync(path.join(root, file))) !== expected) throw Error('Drift before guarded follow-up: ' + file);
const core = fs.readFileSync(path.join(root, 'word_sounds_core.js'), 'utf8').trim();
const expected = '// BEGIN GENERATED WORD SOUNDS CORE\n' + core + '\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE';
const pattern = /\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/;
const parity = {};
for (const file of ['word_sounds_module.js', 'word_sounds_setup_source.jsx']) {
  parity[file] = fs.readFileSync(path.join(root, file), 'utf8').match(pattern)?.[0] === expected;
}
if (!Object.values(parity).every(Boolean)) throw Error('Current canonical embedding parity failed before follow-up');
const directory = path.join(__dirname, 'word-sounds-before-own-property');
fs.mkdirSync(directory, { recursive: true });
const files = ['word-sounds-build-claim.json', 'word-sounds-built-inputs.json', 'word-sounds-built-tests.json', 'word-sounds-built-validation.json', 'build-word.json'];
for (const file of files) fs.copyFileSync(path.join(__dirname, file), path.join(directory, file), fs.constants.COPYFILE_EXCL);
for (const file of ['word_sounds_core.js', 'tests/report_word_sounds_content_guard.test.js', 'tests/word_sounds_language_gating.test.js']) {
  fs.copyFileSync(path.join(root, file), path.join(directory, path.basename(file)), fs.constants.COPYFILE_EXCL);
}
fs.writeFileSync(path.join(directory, 'pre-edit-embedding-proof.json'), JSON.stringify({ at: new Date().toISOString(), coreSha256: sha(Buffer.from(core)), parity }, null, 2) + '\n');
console.log('80/81 built run, original assertion, source, claim, and matching embedded core proof preserved before follow-up.');
