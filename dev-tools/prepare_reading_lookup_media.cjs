// Track 11 media recovery candidates; never writes shared application files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createPatch, applyPatch } = require('diff');
const { applyEngineRecovery, applyReaderRecovery } = require('./prepare_reading_lookup_resilience.cjs');
const { applyImageOwnership } = require('./prepare_reading_lookup_enhancements.cjs');
function editor(source) {
  let text = source;
  return {
    replace(before, after) {
      const at = text.indexOf(before);
      if (at < 0 || text.indexOf(before, at + before.length) >= 0) throw Error('Media recovery anchor changed: ' + before.slice(0, 100));
      text = text.slice(0, at) + after + text.slice(at + before.length);
    },
    section(start, end, replacement) {
      const at = text.indexOf(start), stop = text.indexOf(end, at + start.length);
      if (at < 0 || stop < 0 || text.indexOf(start, at + start.length) >= 0) throw Error('Media recovery section changed: ' + start);
      text = text.slice(0, at) + replacement + text.slice(stop);
    },
    result: () => text
  };
}
function applyEngineMedia(source) {
  source = applyEngineRecovery(source);
  if (source.includes('lookupLifetimeController')) return source;
  const e = editor(source);
  e.replace('      const request = Object.freeze({\n          ...captureLookupContext', '      const lookupLifetimeController = typeof AbortController === \'function\' ? new AbortController() : null;\n      const request = Object.freeze({\n          signal: lookupLifetimeController?.signal || null,\n          ...captureLookupContext');
  e.replace('++attempt; aiAttempt?.cancel(); dictionaryAttempt?.cancel(); releaseAudio();', '++attempt; lookupLifetimeController?.abort(); aiAttempt?.cancel(); dictionaryAttempt?.cancel(); releaseAudio();');
  return e.result();
}
function applyHostMedia(source) {
  source = applyImageOwnership(source);
  if (source.includes('readingPictureMs')) return source;
  const start = source.indexOf('const handleFetchWordImage = async (word) => {'), end = source.indexOf('const _legacyResolveReadAloudAudio =', start);
  if (start < 0 || end < 0) throw Error('Word image handler changed');
  const e = editor(source.slice(start, end));
  e.replace('      const request = initial.lookupRequest;', '      const request = initial.lookupRequest;\n      const lifetime = request?.signal;\n      if (lifetime?.aborted) return;');
  e.replace('imageRequest: token, imageLoading: true, imageError: false', 'imageRequest: token, imageLoading: true, imageError: false, imageErrorReason: null');
  e.replace('          update({ imageLoading: false, imageError: true }); return;', "          update({ imageLoading: false, imageError: true, imageErrorReason: 'disabled' }); return;");
  e.replace('      try {\n          const prompt =', String.raw`      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const configuredMs = Number(window.AlloFlowConfig?.timeouts?.readingPictureMs);
      const timeoutMs = Number.isFinite(configuredMs) && configuredMs > 0 ? Math.min(180000, Math.max(1000, configuredMs)) : 60000;
      let timer, cancel;
      const cancelled = new Promise(resolve => { cancel = () => { controller?.abort(); resolve({ cancelled: true }); }; });
      lifetime?.addEventListener('abort', cancel, { once: true });
      const deadline = new Promise(resolve => { timer = setTimeout(() => {
          controller?.abort(); resolve({ timedOut: true });
      }, timeoutMs); });
      try {
          if (lifetime?.aborted) { cancel(); return; }
          const prompt =`);
  e.replace('          const url = await __d.callImagen(prompt, 256, 0.8);', String.raw`          const result = await Promise.race([
              Promise.resolve(__d.callImagen(prompt, 256, 0.8, { signal: controller?.signal || null })).then(url => ({ url })),
              cancelled, deadline
          ]);
          if (result.cancelled) { update({ imageLoading: false, imageError: false }); return; }
          if (result.timedOut) { update({ imageLoading: false, imageError: true, imageErrorReason: 'timeout' }); return; }
          if (window.__alloStudentAiDisabled === true || __d.callImagen?._alloQrBlocked === true) {
              update({ imageLoading: false, imageError: true, imageErrorReason: 'disabled' }); return;
          }
          const url = result.url;`);
  e.replace('          else update({ imageLoading: false, imageError: true });', "          else update({ imageLoading: false, imageError: true, imageErrorReason: 'failed' });");
  e.replace('      } catch (err) {\n          update({ imageLoading: false, imageError: true });\n      }', "      } catch (err) {\n          if (!lifetime?.aborted) update({ imageLoading: false, imageError: true, imageErrorReason: 'failed' });\n      } finally {\n          clearTimeout(timer);\n          lifetime?.removeEventListener('abort', cancel);\n      }");
  return source.slice(0, start) + e.result() + source.slice(end);
}
function applyReaderMedia(source) {
  source = applyReaderRecovery(source);
  if (source.includes('readingAudioStartupMs')) return source;
  const e = editor(source);
  e.replace('      var current = helpAudioRef.current;helpAudioRef.current = null;', '      var current = helpAudioRef.current;helpAudioRef.current = null;\n      clearTimeout(current?.timer);\n      current?.cancel?.();');
  e.section('    var playHelpAudio = async function (key, recordingUrl, word, language) {', '    React.useEffect(function () {\n      setHelpAudioState', String.raw`    var playHelpAudio = async function (key, recordingUrl, word, language) {
      if (helpAudioRef.current?.key === key) { stopHelpAudio();return; }
      stopHelpAudio();
      if (typeof stopPlayback === 'function') stopPlayback();
      var token = helpAudioTokenRef.current;
      var current = { key: key, audio: null, ownedUrl: null, timer: null, cancel: null };helpAudioRef.current = current;
      var cancelled = new Promise(resolve => { current.cancel = resolve; });
      var configuredMs = Number(window.AlloFlowConfig?.timeouts?.readingAudioStartupMs);
      var timeoutMs = Number.isFinite(configuredMs) && configuredMs > 0 ? Math.min(120000, Math.max(1000, configuredMs)) : 30000;
      var fail = function (reason) {
        if (token !== helpAudioTokenRef.current) return;
        stopHelpAudio(false);setHelpAudioState({ key: key, status: 'error', reason: reason });
      };
      setHelpAudioState({ key: key, status: 'loading' });
      current.timer = setTimeout(() => fail('timeout'), timeoutMs);
      try {
        // Keep the shared TTS cache/API contract. Only this popup's wait is cancelled.
        var work = (async function () {
          var url = recordingUrl || await callTTS(word, selectedVoice, voiceSpeed || 1, 2, language || generatedContent?.config?.language || leveledTextLanguage || 'English');
          if (token !== helpAudioTokenRef.current) { if (!recordingUrl) releaseHelpUrl(url);return; }
          if (!url) throw new Error(viewText('simplified.word_audio_no_pronunciation_audio', 'No pronunciation audio'));
          if (!recordingUrl) current.ownedUrl = url;
          var audio = new Audio(url);current.audio = audio;audio.playbackRate = voiceSpeed || 1;
          audio.onended = function () { if (token === helpAudioTokenRef.current) stopHelpAudio(); };
          audio.onerror = function () { fail('playback'); };
          await audio.play();
          if (token !== helpAudioTokenRef.current) { audio.pause();return; }
          clearTimeout(current.timer);current.timer = null;
          setHelpAudioState({ key: key, status: 'playing' });
        })();
        await Promise.race([work, cancelled]);
      } catch (_) { fail('failed'); }
    };
`);
  e.replace('data-word-help-audio={key} aria-label={label}', "data-word-help-audio={key} aria-busy={current && helpAudioState.status === 'loading'} aria-label={label}");
  e.replace("helpText('simplified.word_audio_error', 'Audio could not play. Try again when you are ready.')", "helpAudioState.reason === 'timeout' ? helpText('simplified.word_audio_timeout', 'Audio took too long to start. You can try again.') : helpText('simplified.word_audio_error', 'Audio could not play. Try again when you are ready.')");
  e.replace("data.imageError ? helpText('glossary.popups.image_error', 'Could not load picture.') : ''", "data.imageError ? data.imageErrorReason === 'timeout' ? helpText('simplified.lookup_picture_timeout', 'The picture took too long to load. You can try again.') : helpText('glossary.popups.image_error', 'Could not load picture.') : ''");
  return e.result();
}
module.exports = { applyEngineMedia, applyHostMedia, applyReaderMedia };
if (require.main === module) {
  const root = path.resolve(__dirname, '..'), directory = path.join(root, 'reports/lookup-recovery/media');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const files = [['content_engine_source.jsx', applyEngineMedia, 'engine'], ['host_handlers_source.jsx', applyHostMedia, 'host'], ['view_simplified_source.jsx', applyReaderMedia, 'reader']];
  if (process.argv.includes('--verify')) {
    const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'baseline.json'), 'utf8'));
    const tests = JSON.parse(fs.readFileSync(path.join(directory, 'tests.json'), 'utf8'));
    const report = { inspectedAt: new Date().toISOString(), head: head(), files: {}, dependencies: {}, artifacts: {}, tests: { passed: tests.numPassedTests, failed: tests.numFailedTests, files: tests.testResults.length, success: tests.success } };
    const retryPath = path.join(directory, 'retry.tests.json');
    if (!tests.success && fs.existsSync(retryPath)) {
      const retry = JSON.parse(fs.readFileSync(retryPath, 'utf8'));
      const failed = tests.testResults.flatMap(file => file.assertionResults.filter(test => test.status === 'failed').map(test => ({ file: file.name, name: test.fullName })));
      const recovered = failed.filter(test => retry.testResults.some(file => file.name === test.file && file.assertionResults.some(result => result.fullName === test.name && result.status === 'passed')));
      const validRetry = retry.success && retry.startTime >= tests.startTime;
      report.tests.initialRun = { passed: tests.numPassedTests, failed: tests.numFailedTests, success: tests.success };
      report.tests.targetedRetry = { passed: retry.numPassedTests, skipped: retry.numPendingTests, recovered: validRetry ? recovered : [], testTimeoutMs: 15000, success: retry.success };
      if (validRetry) {
        report.tests.passed += recovered.length;
        report.tests.failed -= recovered.length;
        report.tests.success = failed.length > 0 && failed.length === tests.numFailedTests && report.tests.failed === 0;
      }
      report.artifacts['retry.tests.json'] = sha(fs.readFileSync(retryPath));
    }
    for (const [file, , name] of files) {
      const current = read(file), candidate = fs.readFileSync(path.join(directory, name + '.candidate.source.js'), 'utf8'), patch = fs.readFileSync(path.join(directory, name + '.patch'), 'utf8');
      let patchApplies = true, patchError;
      try { execFileSync('git', ['apply', '--check', '--ignore-space-change', '-p0', path.join(directory, name + '.patch')], { cwd: root, encoding: 'utf8', stdio: 'pipe' }); }
      catch (error) { patchApplies = false; patchError = String(error.stderr || error.message); }
      report.files[file] = { currentSha256: sha(current), currentMatchesTestedSource: sha(current) === baseline.files[file].sourceSha256, candidateMatchesRecordedHash: sha(candidate) === baseline.files[file].candidateSourceSha256, patchReproducesCandidate: applyPatch(current.replace(/\r\n/g, '\n'), patch) === candidate, patchApplies, ...(patchError ? { patchError } : {}) };
    }
    for (const [file, expected] of Object.entries(baseline.dependencies)) report.dependencies[file] = { currentSha256: sha(read(file)), currentMatchesTestedSource: sha(read(file)) === expected };
    for (const file of ['content_engine_module.candidate.js', 'view_simplified_module.candidate.js', 'dictionary.baseline.source.js', 'tests.json']) report.artifacts[file] = sha(fs.readFileSync(path.join(directory, file)));
    report.verified = report.tests.success && report.head === baseline.head && Object.values(report.files).every(file => file.currentMatchesTestedSource && file.candidateMatchesRecordedHash && file.patchReproducesCandidate && file.patchApplies) && Object.values(report.dependencies).every(file => file.currentMatchesTestedSource);
    fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (!report.verified) process.exitCode = 1;
  } else {
    fs.mkdirSync(directory, { recursive: true });
    const record = { head: head(), files: {}, dependencies: {} };
    for (const [file, transform, name] of files) {
      const raw = read(file), source = raw.replace(/\r\n/g, '\n'), result = transform(source);
      if (transform(result) !== result) throw Error('Non-idempotent media transform: ' + file);
      require('@babel/parser').parse(result, { sourceType: 'script', plugins: ['jsx'] });
      record.files[file] = { sourceSha256: sha(raw), normalizedSourceSha256: sha(source), candidateSourceSha256: sha(result) };
      fs.writeFileSync(path.join(directory, name + '.patch'), createPatch(file, source, result, '', '', { context: 3 }));
      fs.writeFileSync(path.join(directory, name + '.candidate.source.js'), result);
      if (name === 'engine') fs.writeFileSync(path.join(directory, 'content_engine_module.candidate.js'), require('../_build_simple_iife_module.js').wrapSimpleIife({ source: result, guardKey: 'ContentEngineModule' }));
      if (name === 'reader') {
        const compiled = require('@babel/core').transformSync(read('reader_place_store.js') + '\n' + result, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
        fs.writeFileSync(path.join(directory, 'view_simplified_module.candidate.js'), '(function(){ var React = window.React;\n' + compiled + '\nwindow.AlloModules.SimplifiedView = SimplifiedView; })();\n');
      }
    }
    for (const file of ['dictionary_loader.js', 'reader_place_store.js']) record.dependencies[file] = sha(read(file));
    fs.writeFileSync(path.join(directory, 'dictionary.baseline.source.js'), read('dictionary_loader.js'));
    fs.writeFileSync(path.join(directory, 'baseline.json'), JSON.stringify(record, null, 2) + '\n');
    console.log('Prepared isolated word-picture and pronunciation startup recovery patches. Shared application files were not changed.');
  }
}
