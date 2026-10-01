// Isolated track 11 dictionary cache/provider recovery. No shared files are written.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createPatch, applyPatch } = require('diff');
const { applyDictionaryRecovery } = require('./prepare_reading_lookup_resilience.cjs');

function applyDictionaryCacheRecovery(source) {
  source = applyDictionaryRecovery(source);
  if (source.includes('function normalizeCachedEntry(')) return source;
  function replace(before, after) {
    const at = source.indexOf(before);
    if (at < 0 || source.indexOf(before, at + before.length) >= 0) throw Error('Dictionary cache anchor changed: ' + before.slice(0, 100));
    source = source.slice(0, at) + after + source.slice(at + before.length);
  }
  replace('  function readCache(word) {', String.raw`  function dictionaryText(value) { return typeof value === 'string' ? value.trim() : ''; }
  function dictionaryRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function dictionaryList(value) { return Array.isArray(value) ? value : []; }
  function dictionarySourceUrl(value) {
    var url = dictionaryText(value), lower = url.toLowerCase();
    return lower.startsWith('https://') || lower.startsWith('http://') ? url : '';
  }
  function dictionaryPronunciations(value) {
    var variants = [];
    dictionaryList(value).filter(dictionaryRecord).forEach(function (record) {
      var pair = { phonetic: dictionaryText(record.phonetic), audio: dictionaryText(record.audio) };
      if ((pair.phonetic || pair.audio) && !variants.some(p => p.phonetic === pair.phonetic && p.audio === pair.audio)) variants.push(pair);
    });
    return variants.slice(0, 12);
  }
  // Cache data crosses a persistence boundary. Recover useful fields without
  // trusting a stale/corrupt shape, mutating storage, or inventing pronunciation pairs.
  function normalizeCachedEntry(value, word) {
    if (value === null) return null; // Preserve the legacy real-404 cache sentinel.
    if (!dictionaryRecord(value)) return undefined;
    if (value.word != null && (typeof value.word !== 'string' || normalizeWord(value.word) !== word)) return undefined;
    var meanings = dictionaryList(value.meanings).filter(dictionaryRecord).map(function (meaning) {
      var definitions = dictionaryList(meaning.definitions).filter(dictionaryRecord).map(function (definition) {
        return { definition: dictionaryText(definition.definition), example: dictionaryText(definition.example) };
      }).filter(d => d.definition).slice(0, 3);
      return { partOfSpeech: dictionaryText(meaning.partOfSpeech), definitions: definitions, pronunciations: dictionaryPronunciations(meaning.pronunciations) };
    }).filter(m => m.definitions.length).slice(0, 4);
    if (!meanings.length) return undefined;
    var pronunciations = dictionaryPronunciations(value.pronunciations);
    var primary = pronunciations.find(p => p.phonetic && p.audio) || pronunciations[0];
    return {
      word: word,
      // Legacy independent fields stay separate when no per-record variants exist.
      phonetic: primary ? primary.phonetic : dictionaryText(value.phonetic),
      audio: primary ? primary.audio : dictionaryText(value.audio),
      pronunciations: pronunciations, meanings: meanings,
      synonyms: Array.from(new Set(dictionaryList(value.synonyms).map(dictionaryText).filter(Boolean).map(s => s.toLowerCase()))).slice(0, 8),
      source: dictionaryText(value.source) || 'Wiktionary (via dictionaryapi.dev)',
      sourceUrl: dictionarySourceUrl(value.sourceUrl) || 'https://en.wiktionary.org/wiki/' + encodeURIComponent(word)
    };
  }

  function readCache(word) {`);
  replace('      return JSON.parse(raw);', '      return normalizeCachedEntry(JSON.parse(raw), word);');
  const start = source.indexOf('  function normalizeEntry(rows, word) {'), end = source.indexOf('  // Content-word tokens', start);
  if (start < 0 || end < 0) throw Error('Dictionary normalization section changed');
  source = source.slice(0, start) + String.raw`  function normalizeEntry(rows, word) {
    if (!Array.isArray(rows) || !rows.length) return null;
    var meanings = [], pronunciations = [], synonyms = [], sourceUrl = '';
    rows.filter(dictionaryRecord).forEach(function (row) {
      if (!sourceUrl) sourceUrl = dictionaryList(row.sourceUrls).map(dictionarySourceUrl).find(Boolean) || '';
      var rowPronunciations = dictionaryPronunciations(dictionaryList(row.phonetics).filter(dictionaryRecord).map(function (p) {
        return { phonetic: p.text, audio: p.audio };
      }));
      var phonetic = dictionaryText(row.phonetic);
      if (phonetic && !rowPronunciations.some(p => p.phonetic === phonetic)) rowPronunciations.push({ phonetic: phonetic, audio: '' });
      pronunciations.push(...rowPronunciations);
      dictionaryList(row.meanings).filter(dictionaryRecord).forEach(function (meaning) {
        var definitions = dictionaryList(meaning.definitions).filter(dictionaryRecord);
        meanings.push({ partOfSpeech: meaning.partOfSpeech, definitions: definitions, pronunciations: rowPronunciations });
        synonyms.push(...dictionaryList(meaning.synonyms));
        definitions.forEach(d => synonyms.push(...dictionaryList(d.synonyms)));
      });
    });
    return normalizeCachedEntry({ word: word, meanings: meanings, pronunciations: pronunciations, synonyms: synonyms,
      source: 'Wiktionary (via dictionaryapi.dev)', sourceUrl: sourceUrl }, word) || null;
  }

` + source.slice(end);
  return source;
}
module.exports = { applyDictionaryCacheRecovery };

if (require.main === module) {
  const root = path.resolve(__dirname, '..'), directory = path.join(root, 'reports/lookup-recovery/cache');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const candidateFiles = ['reports/lookup-recovery/media/content_engine_module.candidate.js', 'reports/lookup-recovery/media/view_simplified_module.candidate.js', 'reports/lookup-recovery/media/host.candidate.source.js'];
  if (process.argv.includes('--verify')) {
    const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'baseline.json'), 'utf8'));
    const tests = JSON.parse(fs.readFileSync(path.join(directory, 'tests.json'), 'utf8'));
    const current = read('dictionary_loader.js'), candidate = fs.readFileSync(path.join(directory, 'dictionary.candidate.source.js'), 'utf8'), patch = fs.readFileSync(path.join(directory, 'dictionary.patch'), 'utf8');
    let patchApplies = true, patchError;
    try { execFileSync('git', ['apply', '--check', '--ignore-space-change', '-p0', path.join(directory, 'dictionary.patch')], { cwd: root, encoding: 'utf8', stdio: 'pipe' }); }
    catch (error) { patchApplies = false; patchError = String(error.stderr || error.message); }
    const report = { inspectedAt: new Date().toISOString(), head: head(), dictionary: { currentMatchesTestedSource: sha(current) === baseline.sourceSha256, candidateMatchesRecordedHash: sha(candidate) === baseline.candidateSourceSha256, patchReproducesCandidate: applyPatch(current.replace(/\r\n/g, '\n'), patch) === candidate, patchApplies, ...(patchError ? { patchError } : {}) }, dependencies: {}, tests: { passed: tests.numPassedTests, failed: tests.numFailedTests, files: tests.testResults.length, success: tests.success }, artifacts: { 'tests.json': sha(fs.readFileSync(path.join(directory, 'tests.json'))) } };
    const reproductionPath = path.join(directory, 'source-reproduction.json');
    if (fs.existsSync(reproductionPath)) {
      const reproduction = JSON.parse(fs.readFileSync(reproductionPath, 'utf8'));
      report.sourceReproduction = { target: 'Unchanged dictionary_loader.js', sourceSha256: baseline.sourceSha256,
        failedCases: reproduction.testResults.flatMap(file => file.assertionResults.filter(test => test.status === 'failed').map(test => test.fullName)) };
      report.artifacts['source-reproduction.json'] = sha(fs.readFileSync(reproductionPath));
    }
    for (const [file, expected] of Object.entries(baseline.dependencies)) report.dependencies[file] = { sha256: sha(read(file)), unchanged: sha(read(file)) === expected };
    report.verified = report.head === baseline.head && report.tests.success && Object.values(report.dictionary).every(value => value === true) && Object.values(report.dependencies).every(value => value.unchanged);
    fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (!report.verified) process.exitCode = 1;
  } else {
    // Reuse the frozen, still-pending media candidates only when their source baseline matches.
    const media = JSON.parse(read('reports/lookup-recovery/media/baseline.json'));
    const dependencies = {};
    for (const [file, entry] of Object.entries(media.files)) {
      if (sha(read(file)) !== entry.sourceSha256) throw Error('Media baseline changed; reconcile pending media patches first: ' + file);
      dependencies[file] = sha(read(file));
    }
    if (sha(read('reader_place_store.js')) !== media.dependencies['reader_place_store.js']) throw Error('Reader-place dependency changed');
    for (const file of ['reader_place_store.js', ...candidateFiles]) dependencies[file] = sha(read(file));
    fs.mkdirSync(directory, { recursive: true });
    const raw = read('dictionary_loader.js'), source = raw.replace(/\r\n/g, '\n'), result = applyDictionaryCacheRecovery(source);
    if (applyDictionaryCacheRecovery(result) !== result) throw Error('Non-idempotent dictionary cache transform');
    require('@babel/parser').parse(result, { sourceType: 'script' });
    fs.writeFileSync(path.join(directory, 'dictionary.patch'), createPatch('dictionary_loader.js', source, result, '', '', { context: 3 }));
    fs.writeFileSync(path.join(directory, 'dictionary.candidate.source.js'), result);
    fs.writeFileSync(path.join(directory, 'baseline.json'), JSON.stringify({ head: head(), sourceSha256: sha(raw), normalizedSourceSha256: sha(source), candidateSourceSha256: sha(result), dependencies }, null, 2) + '\n');
    console.log('Prepared dictionary cache and partial-response recovery. Pending media candidates are unchanged; shared application files were not written.');
  }
}
