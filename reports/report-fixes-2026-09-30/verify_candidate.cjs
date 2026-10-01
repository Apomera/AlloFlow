'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'));
const modules = [], errors = [];
for (const phase of ['reader', 'core', 'audio', 'recovery', 'url', 'interview', 'word'].filter(phase => fs.existsSync(path.join(__dirname, 'build-' + phase + '.json')))) {
  const build = JSON.parse(fs.readFileSync(path.join(__dirname, 'build-' + phase + '.json'), 'utf8'));
  for (const module of build.modules) {
    const mirror = 'desktop/web-app/public/' + module.output;
    const result = { file: module.output, sha256: hash(module.output), mirrorEqual: hash(module.output) === hash(mirror), inputsMatchBuild: Object.entries(module.inputs || {}).every(([file, sha]) => hash(file) === sha) };
    result.outputMatchesBuild = result.sha256 === module.sha256;
    if (!result.mirrorEqual || !result.inputsMatchBuild || !result.outputMatchesBuild) errors.push('Build drift: ' + module.output);
    modules.push(result);
  }
}
const heldFiles = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const held = heldFiles.map(file => ({ file, sha256: hash(file), differsFromInitialSnapshot: hash(file) !== baseline.files[file].sha256 }));
const hostMirrorsMatch = held.every(file => file.sha256 === held[0].sha256);
const journalUnchanged = hash('reflective_journal.md') === baseline.files['reflective_journal.md'].sha256;
if (!hostMirrorsMatch) errors.push('Held host mirrors diverged');
if (!journalUnchanged) errors.push('Journal changed since initial snapshot');
const preservedFiles = ['audio_helpers_source.jsx', 'read_aloud_audio_service_source.jsx', 'read_aloud_artifact_audio_source.jsx'];
const preserved = preservedFiles.map(file => ({ file, unchangedSinceInitialSnapshot: hash(file) === baseline.files[file].sha256 }));
const queryPatternMatches = fs.readdirSync(root).filter(file => file.endsWith('_source.jsx') || file === 'AlloFlowANTI.txt' || /allobot.*\.(js|jsx)$/i.test(file)).map(file => ({ file, matches: fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).map((line, i) => /[?&]key=|searchParams\.set\(['"]key/.test(line) ? { line: i + 1, diagnosticComment: /\/\/\s*redact\s+\?key=/.test(line) } : null).filter(Boolean) })).filter(entry => entry.matches.length);
const requestQueryPatternsNeedingReview = queryPatternMatches.flatMap(entry => entry.matches.filter(match => !match.diagnosticComment).map(match => ({ file: entry.file, line: match.line })));
const report = { at: new Date().toISOString(), scope: 'Owned runtime pairs only; shared host held and entire checkout is not a release candidate.', modules, held, hostMirrorsMatch, journalUnchanged, preserved, queryPatternMatches, requestQueryPatternsNeedingReview, errors,
  limits: ['Held host differs from the initial snapshot because other workspace work continued; our team made no host edits.', 'URL-pattern review records code locations only and does not establish a credential leak.', 'Passes do not replace real device bridge/reload, screenreader, educator content or deployment checks.'] };
fs.writeFileSync(path.join(__dirname, 'candidate-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ modules: modules.length, errors, hostMirrorsMatch, journalUnchanged, requestQueryPatternsNeedingReview }));
if (errors.length) process.exitCode = 1;
