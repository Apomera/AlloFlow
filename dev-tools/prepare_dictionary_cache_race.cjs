// Track 11: isolated follow-up to cache validation; never writes shared app files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createPatch, applyPatch } = require('diff');
const { applyDictionaryCacheRecovery } = require('./prepare_dictionary_cache_recovery.cjs');

function applyDictionaryCacheRaceRecovery(source) {
  source = applyDictionaryCacheRecovery(source);
  const marker = '      // A concurrent caller may have cached a usable entry while this request waited.';
  if (source.includes(marker)) return source;
  const before = "      if (response.status === 404) { writeCache(w, null); return result(null, 'not_found'); }";
  const after = [
    marker,
    '      // readCache validates it; a late miss must not erase successful offline help.',
    '      if (response.status === 404) {',
    '        const recovered = readCache(w);',
    '        if (recovered) return result(recovered);',
    "        writeCache(w, null); return result(null, 'not_found');",
    '      }'
  ].join('\n');
  const at = source.indexOf(before);
  if (at < 0 || source.indexOf(before, at + before.length) >= 0) throw Error('Dictionary 404 recovery anchor changed');
  return source.slice(0, at) + after + source.slice(at + before.length);
}
module.exports = { applyDictionaryCacheRaceRecovery };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const directory = path.join(root, 'reports/lookup-recovery/cache-race');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const raw = read('dictionary_loader.js'), source = raw.replace(/\r\n/g, '\n');
  const cacheCandidate = applyDictionaryCacheRecovery(source);
  const dependencies = [
    'dev-tools/prepare_dictionary_cache_recovery.cjs',
    'dev-tools/prepare_reading_lookup_resilience.cjs',
    'dev-tools/prepare_dictionary_cache_race.cjs',
    'tests/dictionary_lookup_race.test.js',
    'tests/dictionary_lookup_cancellation.test.js'
  ];
  if (process.argv.includes('--verify')) {
    const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'baseline.json'), 'utf8'));
    const tests = JSON.parse(fs.readFileSync(path.join(directory, 'tests.json'), 'utf8'));
    const candidate = fs.readFileSync(path.join(directory, 'dictionary.candidate.source.js'), 'utf8');
    const combined = fs.readFileSync(path.join(directory, 'dictionary.patch'), 'utf8');
    const increment = fs.readFileSync(path.join(directory, 'cache-race.patch'), 'utf8');
    const checks = {
      sharedSourceUnchanged: sha(raw) === baseline.sourceSha256,
      candidateUnchanged: sha(candidate) === baseline.candidateSha256,
      fullPatchReproducesCandidate: applyPatch(source, combined) === candidate,
      incrementReproducesCandidate: applyPatch(cacheCandidate, increment) === candidate,
      transformReproducesCandidate: applyDictionaryCacheRaceRecovery(source) === candidate,
      transformIsIdempotent: applyDictionaryCacheRaceRecovery(candidate) === candidate,
      dependenciesUnchanged: Object.entries(baseline.dependencies).every(([file, hash]) => sha(read(file)) === hash),
      testsPassed: tests.success === true && tests.numFailedTests === 0 && tests.numPassedTests > 0
    };
    const reproduction = JSON.parse(fs.readFileSync(path.join(directory, 'source-reproduction.json'), 'utf8'));
    const report = { inspectedAt: new Date().toISOString(), head: head(), baselineHead: baseline.head, checks,
      tests: { passed: tests.numPassedTests, failed: tests.numFailedTests, files: tests.testResults.length },
      sourceReproduction: { sourceSha256: baseline.sourceSha256, failedCases: reproduction.testResults.flatMap(file => file.assertionResults.filter(test => test.status === 'failed').map(test => test.fullName)) },
      artifacts: Object.fromEntries(['tests.json', 'source-reproduction.json'].map(file => [file, sha(fs.readFileSync(path.join(directory, file)))])),
      verified: Object.values(checks).every(Boolean) };
    fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (!report.verified) process.exitCode = 1;
  } else {
    const candidate = applyDictionaryCacheRaceRecovery(source);
    if (applyDictionaryCacheRaceRecovery(candidate) !== candidate) throw Error('Non-idempotent dictionary race transform');
    new Function(candidate); // Parse without running the loader.
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'dictionary.candidate.source.js'), candidate);
    fs.writeFileSync(path.join(directory, 'dictionary.patch'), createPatch('dictionary_loader.js', source, candidate, '', '', { context: 3 }));
    fs.writeFileSync(path.join(directory, 'cache-race.patch'), createPatch('dictionary_loader.js', cacheCandidate, candidate, '', '', { context: 3 }));
    fs.writeFileSync(path.join(directory, 'baseline.json'), JSON.stringify({ head: head(), sourceSha256: sha(raw), normalizedSourceSha256: sha(source), priorCacheCandidateSha256: sha(cacheCandidate), candidateSha256: sha(candidate),
      dependencies: Object.fromEntries(dependencies.map(file => [file, sha(read(file))])) }, null, 2) + '\n');
    console.log('Prepared dictionary-only cache-race candidate and patches. Shared source and pending media artifacts were not written.');
  }
}
