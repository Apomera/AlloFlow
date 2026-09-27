// Incremental track 11 recovery patches. Shared application files stay untouched.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createPatch } = require('diff');
const { applyEngineEnhancements, applyDictionaryEnhancements, applyReaderEnhancements } = require('./prepare_reading_lookup_enhancements.cjs');
function editor(source) {
  let text = source;
  return {
    replace(before, after) {
      const at = text.indexOf(before);
      if (at < 0 || text.indexOf(before, at + before.length) >= 0) throw Error('Recovery anchor changed: ' + before.slice(0, 100));
      text = text.slice(0, at) + after + text.slice(at + before.length);
    },
    section(start, end, value) {
      const at = text.indexOf(start), stop = text.indexOf(end, at + start.length);
      if (at < 0 || stop < 0 || text.indexOf(start, at + start.length) >= 0) throw Error('Recovery section changed: ' + start);
      text = text.slice(0, at) + value + text.slice(stop);
    },
    result: () => text
  };
}
function applyDictionaryRecovery(source) {
  source = applyDictionaryEnhancements(source);
  if (source.includes('async function lookupDetailed(')) return source;
  const e = editor(source);
  e.replace('  window.AlloDictionary = {', String.raw`  // Detailed outcomes are optional; lookup() retains its entry-or-null API.
  async function lookupDetailed(word, options = {}) {
    options = options || {};
    const result = (entry, reason = null) => ({ entry, reason });
    if (options.signal?.aborted) return result(null, 'cancelled');
    const w = normalizeWord(word);
    if (!w || /\s/.test(w)) return result(null, 'unsupported_word');
    const cached = readCache(w);
    if (cached !== undefined && !(cached === null && options.bypassMissingCache)) return result(cached, cached ? null : 'not_found');
    if (typeof fetch !== 'function') return result(null, 'not_available');
    try {
      const response = await fetch(API + encodeURIComponent(w), { signal: options.signal });
      if (options.signal?.aborted) return result(null, 'cancelled');
      if (response.status === 404) { writeCache(w, null); return result(null, 'not_found'); }
      if (!response.ok) return result(null, 'request_failed');
      let rows;
      try { rows = await response.json(); }
      catch (_) { return result(null, options.signal?.aborted ? 'cancelled' : 'invalid_response'); }
      if (options.signal?.aborted) return result(null, 'cancelled');
      let entry;
      try { entry = normalizeEntry(rows, w); } catch (_) { return result(null, 'invalid_response'); }
      if (!entry) return result(null, 'invalid_response');
      writeCache(w, entry);
      return result(entry);
    } catch (_) { return result(null, options.signal?.aborted ? 'cancelled' : 'request_failed'); }
  }

  window.AlloDictionary = {`);
  e.section('    lookup: function (word, options) {', '    _normalizeWord:', `    lookupDetailed: lookupDetailed,
    lookup: function (word, options) { return lookupDetailed(word, options || {}).then(result => result.entry); },
`);
  return e.result();
}
function applyEngineRecovery(source) {
  source = applyEngineEnhancements(source);
  if (source.includes('readingLookupMs')) return source;
  const e = editor(source);
  e.replace('let attempt = 0, audio = null, audioUrl = null, dictionaryAttempt = null;', 'let attempt = 0, audio = null, audioUrl = null, dictionaryAttempt = null, aiAttempt = null;');
  e.replace('++attempt; dictionaryAttempt?.cancel(); releaseAudio();', '++attempt; aiAttempt?.cancel(); dictionaryAttempt?.cancel(); releaseAudio();');
  e.replace("resolve({ entry: null }); }, 10000);", "resolve({ entry: null, reason: 'timeout' }); }, 10000);");
  e.replace("update({ dictionaryStatus: 'loading' });", "update({ dictionaryStatus: 'loading', dictionaryReason: null });");
  e.replace("if (!window.AlloDictionary?.lookup && window.__alloLoadPlugin)", "if (!window.AlloDictionary?.lookupDetailed && !window.AlloDictionary?.lookup && window.__alloLoadPlugin)");
  e.replace("                  const entry = await window.AlloDictionary?.lookup?.(word, { signal: controller?.signal, bypassMissingCache: retry });\n                  return { entry };", `                  const options = { signal: controller?.signal, bypassMissingCache: retry };
                  if (typeof window.AlloDictionary?.lookupDetailed === 'function') return await window.AlloDictionary.lookupDetailed(word, options);
                  if (typeof window.AlloDictionary?.lookup !== 'function') return { entry: null, reason: 'not_available' };
                  const entry = await window.AlloDictionary?.lookup?.(word, options);
                  return { entry, reason: entry ? null : 'unavailable' };`);
  e.replace("update(entry ? { dictionary: entry, dictionaryStatus: 'ready' }\n                      : { dictionaryStatus: 'unavailable', dictionaryRetryAvailable: true });", "update(entry ? { dictionary: entry, dictionaryStatus: 'ready', dictionaryReason: null }\n                      : { dictionaryStatus: 'unavailable', dictionaryReason: result.reason || 'unavailable', dictionaryRetryAvailable: true });");
  e.replace("if (dictionaryAttempt === job) update({ dictionaryStatus: 'unavailable', dictionaryRetryAvailable: true });", "if (dictionaryAttempt === job) update({ dictionaryStatus: 'unavailable', dictionaryReason: 'request_failed', dictionaryRetryAvailable: true });");
  e.replace('          const currentAttempt = ++attempt;\n          releaseAudio();', '          const currentAttempt = ++attempt;\n          aiAttempt?.cancel();\n          releaseAudio();');
  e.replace("update({ aiStatus: 'loading', isLoading: true });", "update({ aiStatus: 'loading', aiErrorReason: null, isLoading: true });");
  e.replace("          try {\n              const result = kind === 'definition' ? await callGemini(prompt) : await callGemini(prompt, true);", String.raw`          const controller = typeof AbortController === 'function' ? new AbortController() : null;
          const configuredMs = Number(window.AlloFlowConfig?.timeouts?.readingLookupMs);
          const timeoutMs = Number.isFinite(configuredMs) && configuredMs > 0 ? Math.min(180000, Math.max(1000, configuredMs)) : 45000;
          let timer, timedOut = false;
          const job = { cancel: null };
          aiAttempt = job;
          const cancelled = new Promise(resolve => { job.cancel = () => { controller?.abort(); resolve({ cancelled: true }); }; });
          const deadline = new Promise((_, reject) => { timer = setTimeout(() => {
              timedOut = true; controller?.abort(); reject(new Error('Reading lookup timed out'));
          }, timeoutMs); });
          try {
              const response = await Promise.race([
                  Promise.resolve(callGemini(prompt, kind === 'phonics', false, null, null, controller?.signal || null)).then(value => ({ value })),
                  cancelled, deadline
              ]);
              // The deadline covers text analysis, not optional legacy audio.
              clearTimeout(timer);
              if (aiAttempt === job) aiAttempt = null;
              if (response.cancelled) return;
              const result = response.value;`);
  e.replace("              if (kind === 'definition') {\n                  if (typeof result", "              if (lookupAiDisabled()) { update({ aiStatus: 'disabled', isLoading: false }); return; }\n              if (kind === 'definition') {\n                  if (typeof result");
  e.replace("          } catch (_) {\n              if (isCurrent() && currentAttempt === attempt) update({ aiStatus: 'error', isLoading: false, aiRetryAvailable: true });\n          }", `          } catch (_) {
              if (isCurrent() && currentAttempt === attempt) update(lookupAiDisabled()
                  ? { aiStatus: 'disabled', isLoading: false }
                  : { aiStatus: 'error', aiErrorReason: timedOut ? 'timeout' : 'failed', isLoading: false, aiRetryAvailable: true });
          } finally {
              clearTimeout(timer);
              if (aiAttempt === job) aiAttempt = null;
          }`);
  e.replace("aiStatus: 'loading', dictionaryStatus: dictionarySupported ? 'loading' : 'unsupported',", "aiStatus: 'loading', dictionaryStatus: dictionarySupported ? 'loading' : 'unsupported',\n          dictionaryReason: dictionarySupported ? null : request.language !== 'English' ? 'unsupported_language' : 'unsupported_word',");
  return e.result();
}
function applyReaderRecovery(source) {
  source = applyReaderEnhancements(source);
  if (source.includes('var renderLookupPicture =')) return source;
  const e = editor(source);
  e.replace("helpText('simplified.lookup_ai_failed', 'AI word help could not load. Any available help is still shown.')", "data.aiErrorReason === 'timeout' ? helpText('simplified.lookup_ai_timeout', 'AI word help took too long. Any available help is still shown. You can try again.') : helpText('simplified.lookup_ai_failed', 'AI word help could not load. Any available help is still shown.')");
  // The legacy single-provider status cannot describe independent AI/dictionary outcomes.
  for (const popup of ['definitionData', 'phonicsData']) {
    const start = '<SimplifiedPopupStatus message={' + popup, at = e.result().indexOf(start);
    const stop = e.result().indexOf(' />', at);
    if (at < 0 || stop < 0) throw Error('Legacy lookup status changed: ' + popup);
    const legacy = e.result().slice(at, stop + 3);
    e.replace(legacy, '{!' + popup + '.aiStatus && ' + legacy + '}');
  }
  e.replace("data.aiRetryAvailable && status === 'ready' ?", "status === 'ready' ?");
  e.replace("data.dictionaryRetryAvailable && data.dictionaryStatus === 'ready' ?", "data.dictionaryStatus === 'ready' ?");
  e.replace('    var renderLookupStatus = function (data, kind) {', String.raw`    var dictionaryFailureText = function (data) {
      if (data.dictionaryReason === 'not_found') return helpText('simplified.lookup_dictionary_not_found', 'The dictionary has no entry for this word.');
      if (data.dictionaryReason === 'timeout') return helpText('simplified.lookup_dictionary_timeout', 'The dictionary took too long to respond. You can try again.');
      if (data.dictionaryReason === 'request_failed' || data.dictionaryReason === 'not_available') return helpText('simplified.lookup_dictionary_connection', 'The dictionary could not be reached. Any available help is still shown.');
      if (data.dictionaryReason === 'invalid_response') return helpText('simplified.lookup_dictionary_invalid', 'The dictionary returned an unusable entry. You can try again.');
      return helpText('simplified.lookup_dictionary_unavailable', 'No dictionary entry is available.');
    };
    var renderLookupStatus = function (data, kind) {`);
  e.replace("{data.dictionaryStatus === 'unavailable' && <p className=\"my-2 text-sm text-slate-700\">{helpText('simplified.lookup_dictionary_unavailable', 'No dictionary entry is available.')}</p>}", "{data.dictionaryStatus === 'unavailable' && <p role=\"status\" className=\"my-2 text-sm text-slate-700\">{dictionaryFailureText(data)}</p>}\n        {data.dictionaryStatus === 'unsupported' && <p className=\"my-2 text-sm text-slate-700\">{helpText('simplified.lookup_dictionary_english_words', 'Dictionary entries are available for individual English words. Any other available word help is still shown.')}</p>}");
  e.replace('    var renderDefinitionSpeech = function (data) {', String.raw`    var renderLookupPicture = function (data) {
      var ready = !!data.imageUrl, busy = !ready && !!data.imageLoading;
      var blocked = studentAiFeaturesHidden || window.__alloStudentAiDisabled === true;
      var label = busy ? helpText('simplified.lookup_picture_loading', 'Preparing picture…')
        : ready ? helpText('simplified.lookup_picture_ready', 'Picture ready')
        : data.imageError ? helpText('simplified.lookup_picture_retry', 'Try picture again')
        : helpText('glossary.popups.show_picture', 'Show picture');
      return <div data-lookup-picture>
        {ready && <img src={data.imageUrl} alt={data.word} className="h-32 w-full rounded-lg border border-slate-400 object-contain" />}
        <p role="status" className="my-1 text-xs text-slate-700">{ready ? helpText('simplified.lookup_picture_ready', 'Picture ready') : busy ? helpText('simplified.lookup_picture_loading', 'Preparing picture…') : blocked ? helpText('simplified.lookup_picture_disabled', 'New AI pictures are off.') : data.imageError ? helpText('glossary.popups.image_error', 'Could not load picture.') : ''}</p>
        {!blocked && typeof handleFetchWordImage === 'function' && <button type="button" data-lookup-picture-retry aria-disabled={busy || ready} aria-busy={busy} onClick={() => { if (!busy && !ready) handleFetchWordImage(data.word); }} className="min-h-11 w-full rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{label}</button>}
      </div>;
    };
    var renderDefinitionSpeech = function (data) {`);
  e.section('{definitionData.imageUrl ? <img', '</div>}<div className="absolute -top-2', '{renderLookupPicture(definitionData)}');
  return e.result();
}
module.exports = { applyDictionaryRecovery, applyEngineRecovery, applyReaderRecovery };
if (require.main === module) {
  const root = path.resolve(__dirname, '..'), directory = path.join(root, 'reports/lookup-recovery/resilience');
  fs.mkdirSync(directory, { recursive: true });
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const record = { head: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(), files: {} };
  for (const [file, transform, name] of [['dictionary_loader.js', applyDictionaryRecovery, 'dictionary'], ['content_engine_source.jsx', applyEngineRecovery, 'engine'], ['view_simplified_source.jsx', applyReaderRecovery, 'reader']]) {
    const raw = fs.readFileSync(path.join(root, file), 'utf8'), source = raw.replace(/\r\n/g, '\n'), result = transform(source);
    if (transform(result) !== result) throw Error('Non-idempotent recovery transform: ' + file);
    require('@babel/parser').parse(result, {sourceType: 'script', plugins: ['jsx']});
    record.files[file] = { sourceSha256: sha(raw), normalizedSourceSha256: sha(source), candidateSourceSha256: sha(result) };
    fs.writeFileSync(path.join(directory, name + '.patch'), createPatch(file, source, result, '', '', {context: 3}));
    fs.writeFileSync(path.join(directory, name + '.candidate.source.js'), result);
    if (name === 'engine') fs.writeFileSync(path.join(directory, 'content_engine_module.candidate.js'), require('../_build_simple_iife_module.js').wrapSimpleIife({source: result, guardKey: 'ContentEngineModule'}));
    if (name === 'reader') {
      const compiled = require('@babel/core').transformSync(fs.readFileSync(path.join(root, 'reader_place_store.js'), 'utf8') + '\n' + result, {plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false}).code;
      fs.writeFileSync(path.join(directory, 'view_simplified_module.candidate.js'), '(function(){ var React = window.React;\n' + compiled + '\nwindow.AlloModules.SimplifiedView = SimplifiedView; })();\n');
    }
  }
  record.dependencies = {};
  for (const file of ['host_handlers_source.jsx', 'reader_place_store.js']) record.dependencies[file] = sha(fs.readFileSync(path.join(root, file), 'utf8'));
  // The image ownership suite uses the integrated host unchanged, frozen alongside this candidate.
  fs.writeFileSync(path.join(directory, 'host.baseline.source.js'), fs.readFileSync(path.join(root, 'host_handlers_source.jsx'), 'utf8'));
  fs.writeFileSync(path.join(directory, 'baseline.json'), JSON.stringify(record, null, 2) + '\n');
  console.log('Prepared isolated AI cancellation, dictionary outcome, and picture retry patches. Shared application files were not changed.');
}
