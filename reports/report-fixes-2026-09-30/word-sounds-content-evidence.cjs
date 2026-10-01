const fs = require('node:fs');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const directory = __dirname;
const files = ['word_sounds_core.js', 'word_sounds_setup_source.jsx', 'word_sounds_module.js'];
const before = Object.fromEntries(files.map(file => [file, fs.readFileSync(directory + '/word-sounds-content-before-' + file, 'utf8')]));
const pattern = /\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/;
const expected = '// BEGIN GENERATED WORD SOUNDS CORE\n' + before['word_sounds_core.js'].trim().replace(/\r\n/g, '\n') + '\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE';
const parity = Object.fromEntries(files.slice(1).map(file => [file, (before[file].replace(/\r\n/g, '\n').match(pattern) || [''])[0] === expected]));
if (!Object.values(parity).every(Boolean)) throw Error('Pre-edit canonical embedded-core mismatch');
const current = Object.fromEntries(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const core = current['word_sounds_core.js'].trim();
for (const file of files.slice(1)) parser.parse(current[file].replace(pattern, () => '// BEGIN GENERATED WORD SOUNDS CORE\n' + core + '\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE'), {sourceType: 'script', plugins: ['jsx']});
const generatedFiles = ['word_sounds_setup_module.js', 'desktop/web-app/public/word_sounds_setup_module.js', 'desktop/web-app/public/word_sounds_module.js'];
const report = {
  frozenAt: new Date().toISOString(),
  sourceHashes: Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))])),
  beforeSourceHashes: Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(directory + '/word-sounds-content-before-' + file))])),
  preEditEmbeddedCoreMatchesCanonical: parity,
  generatedHashesBeforeRootBuild: Object.fromEntries(generatedFiles.map(file => [file, hash(fs.readFileSync(file))])),
  syncScriptHash: hash(fs.readFileSync('dev-tools/sync_word_sounds_core.cjs')),
  syncTargets: ['word_sounds_module.js', 'word_sounds_setup_source.jsx'],
  syncCli: ['--check'],
  inMemoryEmbeddingSyntax: 'pass',
  sourceEmbeddingAndMirrorsWrittenByWorker: false,
  limits: ['Curated local examples have not received new phonemic content review.', 'Schema and decodability do not validate generated grammar or science.', 'Custom tasks remain editable review drafts because no explicit verification state exists.', 'A real deployed build is needed to verify old-live behavior and preparation duration.']
};
fs.writeFileSync(directory + '/word-sounds-content-validation.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
