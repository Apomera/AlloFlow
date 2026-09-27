// Track 11 handoff: prepares a narrow reader delta without writing the shared
// reader or its generated modules. Tests apply this transform in memory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createPatch } = require('diff');

function applyReadingLookupAdapter(source) {
  const retryControl = `        {data.dictionaryStatus === 'unavailable' && typeof data.retryDictionary === 'function' && <button type="button" data-dictionary-retry={kind} onClick={() => data.retryDictionary()} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{helpText('simplified.lookup_dictionary_retry', 'Try dictionary again')}</button>}`;
  const addDictionaryRetry = text => {
    if (text.includes('data-dictionary-retry={kind}')) return text;
    const line = text.split('\n').find(value => value.includes("data.dictionaryStatus === 'unavailable'"));
    if (!line || text.indexOf(line) !== text.lastIndexOf(line)) throw new Error('Dictionary retry anchor changed');
    return text.replace(line, line + '\n' + retryControl);
  };
  if (source.includes('var renderLookupStatus = function (data, kind)')) {
    if (!source.includes('var renderDefinitionSpeech = function (data)') || !source.includes('data-lookup-retry={kind}') || !source.includes("'phonics-context'")) throw new Error('Reader adapter is only partially integrated');
    return addDictionaryRetry(source);
  }
  let text = source;
  const replace = (before, after) => {
    const at = text.indexOf(before);
    if (at < 0 || text.indexOf(before, at + before.length) >= 0) throw new Error('Reader adapter anchor changed: ' + before.slice(0, 110));
    text = text.slice(0, at) + after + text.slice(at + before.length);
  };
  replace("var renderSimplifiedPopupSpeaker = function (contentId, spokenText) {", "var renderSimplifiedPopupSpeaker = function (contentId, spokenText, language, label) {");
  replace('stopHelpAudio(); handleSpeak(text, contentId, 0);', 'stopHelpAudio(); if (language) handleSpeak(text, contentId, 0, false, language); else handleSpeak(text, contentId, 0);');
  replace('aria-label={active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel}', 'aria-label={active ? simplifiedPopupStopReadingLabel : label || simplifiedPopupReadAloudLabel}');
  replace('title={active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel}', 'title={active ? simplifiedPopupStopReadingLabel : label || simplifiedPopupReadAloudLabel}');
  replace('<span>{active ? simplifiedPopupStopLabel : simplifiedPopupListenLabel}</span>', '<span>{active ? simplifiedPopupStopLabel : label || simplifiedPopupListenLabel}</span>');
  replace('[phonicsData?.word, definitionData?.word, generatedContent?.id, generatedContent?.data, interactionMode]', '[phonicsData?.word, definitionData?.word, phonicsData?.lookupRequest, definitionData?.lookupRequest, generatedContent?.id, generatedContent?.data, interactionMode]');
  replace('stopSimplifiedPopupAudio(SIMPLIFIED_DEFINE_AUDIO_ID);', "stopSimplifiedPopupAudio(SIMPLIFIED_DEFINE_AUDIO_ID);\n        stopSimplifiedPopupAudio(SIMPLIFIED_DEFINE_AUDIO_ID + '-english');");
  replace('[!!definitionData]);', '[!!definitionData, definitionData?.lookupRequest]);');
  replace('var renderHelpAudioButton = function (key, recordingUrl, word, language) {', 'var renderHelpAudioButton = function (key, recordingUrl, word, language, idleLabel) {');
  replace('      return <button key={key} type="button" data-word-help-audio={key}', "      if (idleLabel && !active && !(current && helpAudioState.status === 'error')) label = idleLabel;\n      return <button key={key} type=\"button\" data-word-help-audio={key}");
  replace('    var SIMPLIFIED_DEFINE_AUDIO_ID =', `    // Session identity, not word spelling, owns dismissal and pending audio.
    var lookupCloseRef = React.useRef(null);
    lookupCloseRef.current = { definition: props.closeDefinition, phonics: props.closePhonics };
    React.useEffect(function () {
      return function () {
        lookupCloseRef.current?.definition?.();
        lookupCloseRef.current?.phonics?.();
      };
    }, [isCompareMode]);
    var renderLookupStatus = function (data, kind) {
      var status = data.aiStatus || (kind === 'definition' ? data.text ? 'ready' : 'loading' : data.isLoading ? 'loading' : data.data ? 'ready' : 'error');
      var blocked = status === 'disabled' || studentAiFeaturesHidden;
      return <div data-lookup-status={kind}>
        {data.preparedText && <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3"><p className="text-xs font-bold">{helpText('simplified.word_help_card_prepared', 'Word help from your teacher')}</p><p>{data.preparedText}</p></div>}
        {(blocked || status === 'error' || status === 'loading') && <p role="status" className="my-2 text-sm text-slate-700">{blocked ? helpText('simplified.lookup_ai_disabled', 'AI explanations are off. You can still use any available word help.') : status === 'loading' ? helpText('simplified.lookup_loading', 'Preparing word help…') : helpText('simplified.lookup_ai_failed', 'AI word help could not load. Any available help is still shown.')}</p>}
        {!blocked && status === 'error' && typeof data.retry === 'function' && <button type="button" data-lookup-retry={kind} onClick={() => { stopHelpAudio(); data.retry(); }} className="min-h-11 rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-900">{helpText('simplified.lookup_retry', 'Try word help again')}</button>}
        {data.dictionaryStatus === 'loading' && <p role="status" className="my-2 text-sm text-slate-700">{helpText('simplified.lookup_dictionary_loading', 'Looking for a dictionary entry…')}</p>}
        {data.dictionaryStatus === 'unavailable' && <p className="my-2 text-sm text-slate-700">{helpText('simplified.lookup_dictionary_unavailable', 'No dictionary entry is available.')}</p>}
      </div>;
    };
    var renderDefinitionSpeech = function (data) {
      var dictionaryText = (data.dictionary?.meanings || []).slice(0, 2).map(entry => entry.definitions?.[0]?.definition).filter(Boolean).join('. ');
      var spoken = data.text || data.preparedText || dictionaryText;
      if (!spoken) return null;
      var language = data.text || data.preparedText ? data.language : 'English';
      var translation = language && language !== 'English' ? spoken.match(/\\n\\s*(?:\\*\\*)?English:(?:\\*\\*)?\\s*/i) : null;
      var primary = translation ? spoken.slice(0, translation.index) : spoken;
      var english = translation ? spoken.slice(translation.index + translation[0].length) : '';
      return <>{renderSimplifiedPopupSpeaker(SIMPLIFIED_DEFINE_AUDIO_ID, [data.word, primary], language)}{english.trim() && renderSimplifiedPopupSpeaker(SIMPLIFIED_DEFINE_AUDIO_ID + '-english', english, 'English', helpText('simplified.lookup_listen_english', 'Listen in English'))}</>;
    };
    var SIMPLIFIED_DEFINE_AUDIO_ID =`);
  replace("{ language: card.language });", "{ language: card.language, preparedText: card.entry.definition || card.entry.explanation || card.entry.text || '' });");
  replace('{definitionData.text ? renderSimplifiedPopupSpeaker(SIMPLIFIED_DEFINE_AUDIO_ID, [definitionData.word, definitionData.text]) : null}', '{renderDefinitionSpeech(definitionData)}');
  replace('>{definitionData.word}</h5><div className="flex items-center gap-1">', '>{definitionData.word}</h5><div className="flex flex-wrap items-center justify-end gap-1">');
  replace("{definitionData.text ? renderReadingLevelExplanation(definitionData, t, renderFormattedText) : <div className=\"flex items-center gap-2 text-xs text-indigo-500\"><RefreshCw size={12} className=\"animate-spin motion-reduce:animate-none\" /> {t('glossary.popups.finding')}</div>}", "{renderLookupStatus(definitionData, 'definition')}{definitionData.text && renderReadingLevelExplanation(definitionData, t, renderFormattedText)}");
  const phonicsStart = '{phonicsData.isLoading ?';
  const at = text.indexOf(phonicsStart);
  const dataAt = text.indexOf('phonicsData.data ? <div className="space-y-4">', at);
  if (at < 0 || dataAt < 0) throw new Error('Phonics render branch changed');
  text = text.slice(0, at) + "{renderLookupStatus(phonicsData, 'phonics')}<div className=\"mb-3 flex flex-wrap gap-2\">{renderHelpAudioButton('phonics-word', null, phonicsData.word, phonicsData.language)}{phonicsData.lookupRequest?.passageText && renderHelpAudioButton('phonics-context', null, phonicsData.lookupRequest.passageText, phonicsData.language, helpText('simplified.lookup_hear_passage', 'Hear in passage'))}</div>{renderPhonicsDictRow(phonicsData, t, renderHelpAudioButton)}{" + text.slice(dataAt);
  replace("</div>{renderHelpAudioButton('phonics-word', null, phonicsData.word, phonicsData.language)}</div>{renderPhonicsDictRow(phonicsData, t, renderHelpAudioButton)}", '</div></div>');
  replace(" : <div className=\"text-center text-red-600 text-xs font-bold py-4\">{t('glossary.popups.failed')}</div>}", ' : null}');
  // Allow phrase selection to reach the already-existing Define menu. A drag
  // selection must not also activate the word's click handler.
  replace('onMouseUp={isSelectionMode ? handleTextMouseUp : undefined}', "onMouseUp={isSelectionMode || interactionMode === 'define' ? handleTextMouseUp : undefined}");
  replace('var activate = function (event) {\n                event.stopPropagation();', "var activate = function (event) {\n                if (event.type === 'click' && (selectionMenu?.text || window.getSelection?.().toString().trim())) return;\n                event.stopPropagation();");
  replace('var activate = event => { event.stopPropagation();', "var activate = event => { if (event.type === 'click' && (selectionMenu?.text || window.getSelection?.().toString().trim())) return; event.stopPropagation();");
  replace('data-reading-paragraph={pane + \'-\' + lineIndex}', "onMouseUp={interactionMode === 'define' ? handleTextMouseUp : undefined} data-reading-paragraph={pane + '-' + lineIndex}");
  return addDictionaryRetry(text);
}

module.exports = { applyReadingLookupAdapter };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'view_simplified_source.jsx'), 'utf8');
  const normalized = source.replace(/\r\n/g, '\n');
  const result = applyReadingLookupAdapter(normalized);
  if (result === normalized) throw new Error('Reader adapter is already integrated; no patch was written.');
  const directory = path.join(root, 'reports', 'lookup-recovery');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'reader-adapter.patch'), createPatch('view_simplified_source.jsx', normalized, result, '', '', { context: 3 }));
  const head = require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(directory, 'reader-adapter-base.json'), JSON.stringify({ head, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), normalizedSourceSha256: crypto.createHash('sha256').update(normalized).digest('hex') }, null, 2) + '\n');
  if (process.argv.includes('--candidate')) {
    const embedded = fs.readFileSync(path.join(root, 'reader_place_store.js'), 'utf8');
    const compiled = require('@babel/core').transformSync(embedded + '\n' + result, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
    fs.writeFileSync(path.join(directory, 'view_simplified_module.candidate.js'), '(function(){ var React = window.React;\n' + compiled + '\nwindow.AlloModules.SimplifiedView = SimplifiedView; window.AlloModules.ViewSimplifiedModule = true; })();\n');
  }
  console.log('Prepared reports/lookup-recovery/reader-adapter.patch; shared reader files were not changed.');
}
