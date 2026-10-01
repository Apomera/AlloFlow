// Isolated track 11 candidates: current AI availability and partial phonics.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createPatch, applyPatch } = require('diff');
const { applyEngineMedia, applyReaderMedia, applyHostMedia } = require('./prepare_reading_lookup_media.cjs');
const { applyDictionaryCacheRaceRecovery } = require('./prepare_dictionary_cache_race.cjs');
function editor(source) {
  return {
    replace(before, after, expected = 1) {
      if (source.split(before).length - 1 !== expected) throw Error('Availability anchor changed: ' + before.slice(0, 100));
      source = source.split(before).join(after);
    },
    result: () => source
  };
}
function applyEngineAvailability(source) {
  source = applyEngineMedia(source);
  if (source.includes('const lookupAiAvailability =')) return source;
  const e = editor(source);
  e.replace(`  const lookupAiDisabled = () => {
      const fn = _currentCallGemini();
      return typeof fn !== 'function' || fn._alloQrBlocked === true || window.__alloStudentAiDisabled === true;
  };`, `  const lookupAiAvailability = () => {
      const fn = _currentCallGemini(), state = _s();
      if (fn?._alloQrBlocked === true || window.__alloStudentAiDisabled === true
          || (!state.isTeacherMode && state.studentAiFeaturesHidden === true)) return 'disabled';
      return typeof fn === 'function' ? 'ready' : 'unavailable';
  };
  const lookupAiUnavailableState = availability => ({
      aiStatus: availability === 'disabled' ? 'disabled' : 'error',
      aiErrorReason: availability === 'unavailable' ? 'not_available' : null,
      aiRetryAvailable: true, isLoading: false
  });`);
  for (const indent of ['          ', '              ']) e.replace('\n' + indent + "if (lookupAiDisabled()) { update({ aiStatus: 'disabled', isLoading: false }); return; }", '\n' + indent + 'const availability = lookupAiAvailability();\n' + indent + "if (availability !== 'ready') { update(lookupAiUnavailableState(availability)); return; }");
  e.replace(`              if (isCurrent() && currentAttempt === attempt) update(lookupAiDisabled()
                  ? { aiStatus: 'disabled', isLoading: false }
                  : { aiStatus: 'error', aiErrorReason: timedOut ? 'timeout' : 'failed', isLoading: false, aiRetryAvailable: true });`, `              const availability = lookupAiAvailability();
              if (isCurrent() && currentAttempt === attempt) update(availability !== 'ready'
                  ? lookupAiUnavailableState(availability)
                  : { aiStatus: 'error', aiErrorReason: timedOut ? 'timeout' : 'failed', isLoading: false, aiRetryAvailable: true });`);
  e.replace('          lookupRequest: request, preparedText: request.preparedText,', '          lookupRequest: request, preparedText: request.preparedText,\n          getAiAvailability: lookupAiAvailability,');
  return e.result();
}
function applyReaderAvailability(source) {
  source = applyReaderMedia(source);
  if (source.includes('var lookupAvailability =')) return source;
  const e = editor(source);
  e.replace("      var blocked = status === 'disabled' || studentAiFeaturesHidden;", `      // A past attempt does not determine today's policy or provider availability.
      var lookupAvailability = typeof data.getAiAvailability === 'function' ? data.getAiAvailability() : null;
      var blocked = studentAiFeaturesHidden || window.__alloStudentAiDisabled === true
        || lookupAvailability === 'disabled' || (lookupAvailability == null && status === 'disabled');
      var canRetry = !blocked && lookupAvailability !== 'unavailable' && (status === 'error' || status === 'disabled');
      var availabilityRestored = lookupAvailability === 'ready' && (status === 'disabled' || data.aiErrorReason === 'not_available');`);
  e.replace("{(blocked || status === 'error' || status === 'loading') &&", "{(blocked || status === 'error' || status === 'loading' || status === 'disabled') &&");
  e.replace(": data.aiErrorReason === 'timeout' ? helpText('simplified.lookup_ai_timeout'", ": availabilityRestored ? helpText('simplified.lookup_ai_available', 'AI word help is available. You can try again.') : data.aiErrorReason === 'not_available' ? helpText('simplified.lookup_ai_unavailable', 'AI word help is unavailable right now. Any available help is still shown.') : data.aiErrorReason === 'timeout' ? helpText('simplified.lookup_ai_timeout'");
  e.replace("{!blocked && (status === 'error' || data.aiRetryAvailable) && typeof data.retry === 'function'", "{!blocked && (status === 'error' || status === 'disabled' || data.aiRetryAvailable) && typeof data.retry === 'function'");
  e.replace("data-lookup-retry={kind} aria-disabled={status !== 'error'}", 'data-lookup-retry={kind} aria-disabled={!canRetry}');
  e.replace("onClick={() => { if (status !== 'error') return; stopHelpAudio(); data.retry(); }}", 'onClick={() => { if (!canRetry) return; stopHelpAudio(); data.retry(); }}');
  const spelling = '<div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100"><div><div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">{t(\'glossary.phonetic_spelling\')}</div><div className="text-lg font-serif italic text-slate-700">/{phonicsData.data.phoneticSpelling}/</div></div></div>';
  e.replace(spelling, '{phonicsData.data.phoneticSpelling && ' + spelling + '}');
  return e.result();
}
module.exports = { applyEngineAvailability, applyReaderAvailability };

if (require.main === module) {
  const root = path.resolve(__dirname, '..'), directory = path.join(root, 'reports/lookup-recovery/availability');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const files = [
    ['content_engine_source.jsx', applyEngineAvailability, applyEngineMedia, 'engine'],
    ['view_simplified_source.jsx', applyReaderAvailability, applyReaderMedia, 'reader'],
    ['host_handlers_source.jsx', applyHostMedia, applyHostMedia, 'host'],
    ['dictionary_loader.js', applyDictionaryCacheRaceRecovery, applyDictionaryCacheRaceRecovery, 'dictionary']
  ];
  const dependencies = ['reader_place_store.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'dev-tools/prepare_reading_lookup_availability.cjs', 'dev-tools/prepare_reading_lookup_media.cjs', 'dev-tools/prepare_reading_lookup_resilience.cjs', 'dev-tools/prepare_reading_lookup_enhancements.cjs', 'dev-tools/prepare_dictionary_cache_recovery.cjs', 'dev-tools/prepare_dictionary_cache_race.cjs', 'tests/reading_lookup_candidate.js', 'tests/reading_lookup_recovery.test.js', 'tests/reading_lookup_popup_adapter.test.js'];
  if (process.argv.includes('--verify')) {
    const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'baseline.json'), 'utf8'));
    const tests = JSON.parse(fs.readFileSync(path.join(directory, 'tests.json'), 'utf8'));
    const report = { inspectedAt: new Date().toISOString(), head: head(), baselineHead: baseline.head, files: {}, dependencies: {}, artifacts: {}, tests: { passed: tests.numPassedTests, failed: tests.numFailedTests, skipped: tests.numPendingTests, files: tests.testResults.length, success: tests.success } };
    for (const [file, transform, previous, name] of files) {
      const raw = read(file), source = raw.replace(/\r\n/g, '\n');
      const candidate = fs.readFileSync(path.join(directory, name + '.candidate.source.js'), 'utf8');
      const patch = fs.readFileSync(path.join(directory, name + '.patch'), 'utf8');
      report.files[file] = { sharedSourceUnchanged: sha(raw) === baseline.files[file].sourceSha256,
        candidateUnchanged: sha(candidate) === baseline.files[file].candidateSha256,
        patchReproducesCandidate: applyPatch(source, patch) === candidate,
        transformReproducesCandidate: transform(source) === candidate, transformIsIdempotent: transform(candidate) === candidate };
      if (name === 'engine' || name === 'reader') report.files[file].incrementReproducesCandidate = applyPatch(previous(source), fs.readFileSync(path.join(directory, name + '-availability.patch'), 'utf8')) === candidate;
    }
    for (const [file, hash] of Object.entries(baseline.dependencies)) report.dependencies[file] = sha(read(file)) === hash;
    for (const [file, hash] of Object.entries(baseline.artifacts)) report.artifacts[file] = sha(fs.readFileSync(path.join(directory, file))) === hash;
    report.verified = tests.success && tests.numFailedTests === 0 && tests.numPendingTests === 0
      && Object.values(report.files).every(checks => Object.values(checks).every(Boolean))
      && Object.values(report.dependencies).every(Boolean) && Object.values(report.artifacts).every(Boolean);
    fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (!report.verified) process.exitCode = 1;
  } else {
    fs.mkdirSync(directory, { recursive: true });
    const record = { head: head(), files: {}, dependencies: {}, artifacts: {} };
    const write = (name, value) => { fs.writeFileSync(path.join(directory, name), value); record.artifacts[name] = sha(value); };
    for (const [file, transform, previous, name] of files) {
      const raw = read(file), source = raw.replace(/\r\n/g, '\n'), candidate = transform(source);
      if (transform(candidate) !== candidate) throw Error('Non-idempotent transform: ' + file);
      require('@babel/parser').parse(candidate, { sourceType: 'script', plugins: ['jsx'] });
      record.files[file] = { sourceSha256: sha(raw), candidateSha256: sha(candidate) };
      write(name + '.patch', createPatch(file, source, candidate, '', '', { context: 3 }));
      write(name + '.baseline.source.js', source);
      write(name + '.candidate.source.js', candidate);
      if (name === 'engine' || name === 'reader') write(name + '-availability.patch', createPatch(file, previous(source), candidate, '', '', { context: 3 }));
      if (name === 'engine') {
        const wrap = require('../_build_simple_iife_module.js').wrapSimpleIife;
        write('content_engine_module.candidate.js', wrap({ source: candidate, guardKey: 'ContentEngineModule' }));
        write('content_engine_module.baseline.js', wrap({ source, guardKey: 'ContentEngineModule' }));
      }
      if (name === 'reader') {
        const compile = text => '(function(){ var React = window.React;\n' + require('@babel/core').transformSync(read('reader_place_store.js') + '\n' + text, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code + '\nwindow.AlloModules.SimplifiedView = SimplifiedView; })();\n';
        write('view_simplified_module.candidate.js', compile(candidate));
        write('view_simplified_module.baseline.js', compile(source));
      }
    }
    for (const file of dependencies) record.dependencies[file] = sha(read(file));
    fs.writeFileSync(path.join(directory, 'baseline.json'), JSON.stringify(record, null, 2) + '\n');
    console.log('Prepared fresh isolated availability/phonics candidates with the pending media and dictionary changes. Shared application files were not written.');
  }
}
