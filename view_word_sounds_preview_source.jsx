
function WordSoundsPreviewView(props) {
  function label(key, fallback, values) {
    var fullKey = 'word_sounds.' + key;
    var translated = typeof props.t === 'function' ? props.t(fullKey, values || {}) : '';
    var text = typeof translated === 'string' && translated && translated !== fullKey ? translated : fallback;
    return text.replace(/\{(\w+)\}/g, function(match, name) { return values && values[name] != null ? String(values[name]) : match; });
  }
  var generatedContent = props.generatedContent;
  var wsActivitySequence = props.wsActivitySequence;
  var setWordSoundsActivity = props.setWordSoundsActivity;
  var setIsWordSoundsMode = props.setIsWordSoundsMode;
  var setWordSoundsAutoReview = props.setWordSoundsAutoReview;
  var prepareWordSoundsSession = props.prepareWordSoundsSession;
  var wordSoundsAudioCoverage = props.wordSoundsAudioCoverage;
  var requestIncompleteAudioConfirmation = props.requestIncompleteAudioConfirmation;
  var missingAudioLabels = wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingLabels)
    ? wordSoundsAudioCoverage.missingLabels
    : ((wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingWords)) ? wordSoundsAudioCoverage.missingWords : []);
  // Treat an omitted role as the educator view so older call sites retain the
  // review path. Learner call sites pass false explicitly.
  var isTeacherMode = props.isTeacherMode !== false;
  var readinessApi = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.WordSoundsReadiness;
  var readinessResource = React.useMemo(function () {
    return generatedContent && Object.assign({}, generatedContent, {
      lessonPlanSequence: Array.isArray(wsActivitySequence) && wsActivitySequence.length ? wsActivitySequence : generatedContent.lessonPlanSequence,
    });
  }, [generatedContent, wsActivitySequence]);
  var readinessBinding = readinessApi ? readinessApi.identity(readinessResource, { route: 'student-pack' }) : null;
  var readinessRunRef = React.useRef({ binding: readinessBinding, controller: null, mounted: true, epoch: 0 });
  var readinessCheckButtonRef = React.useRef(null);
  var readinessCancelButtonRef = React.useRef(null);
  var readinessPanelRef = React.useRef(null);
  var readinessState = React.useState({ busy: false, notice: '' });
  var readinessStateValue = readinessState[0], setReadinessState = readinessState[1];
  var readinessMatches = readinessRunRef.current.binding === readinessBinding;
  var readinessBusy = readinessMatches && readinessStateValue.busy;
  var readinessNotice = readinessMatches ? readinessStateValue.notice : '';
  React.useEffect(function () {
    var current = readinessRunRef.current;
    if (current.controller) current.controller.abort();
    current.binding = readinessBinding; current.controller = null; current.mounted = true; current.epoch += 1;
    setReadinessState({ busy: false, notice: '' });
    return function () { current.mounted = false; current.epoch += 1; if (current.controller) current.controller.abort(); };
  }, [readinessBinding]);
  React.useEffect(function () {
    if (typeof document === 'undefined') return;
    var active = document.activeElement;
    if (active && active !== document.body && !(readinessPanelRef.current && readinessPanelRef.current.contains(active))) return;
    var target = readinessBusy ? readinessCancelButtonRef.current : readinessNotice && readinessCheckButtonRef.current;
    if (target) target.focus();
  }, [readinessBusy, readinessNotice]);
  wordSoundsAudioCoverage = readinessApi ? readinessApi.inspect(readinessResource, { route: 'student-pack' }) : {
    ready: 0, total: wordSoundsAudioCoverage && wordSoundsAudioCoverage.total || 0,
    missing: 0, embedded: 0, online: 0, deviceOnly: 0, unverified: 1, complete: false, dependencies: [], missingLabels: [],
  };
  missingAudioLabels = wordSoundsAudioCoverage && wordSoundsAudioCoverage.missingLabels || [];
  var readinessCategoryNames = {
    "speech": label('readiness_category_speech', 'Words and text'),
    "phoneme": label('readiness_category_phoneme', 'Speech sounds'),
    "instruction": label('readiness_category_instruction', 'Instructions'),
    "feedback": label('readiness_category_feedback', 'Feedback'),
    "isolation": label('readiness_category_isolation', 'Sound position prompts'),
    "letter-name": label('readiness_category_letter_name', 'Letter names'),
  };
  var readableAudioLabel = function (value) {
    var parts = String(value || '').split(': '), category = parts.shift(), name = parts.join(': ');
    if (category === 'instruction' || category === 'feedback') name = name.replace(/^(inst_|fb_)/, '').replace(/_/g, ' ');
    return (readinessCategoryNames[category] || category) + ': ' + name;
  };
  var checkReadiness = function () {
    var current = readinessRunRef.current;
    if (!readinessApi || !readinessResource || current.controller || !current.mounted) return;
    var controller = new AbortController(), epoch = ++current.epoch, binding = readinessBinding;
    current.controller = controller;
    setReadinessState({ busy: true, notice: '' });
    readinessApi.check(readinessResource, { route: 'student-pack', signal: controller.signal }).then(function (report) {
      if (!current.mounted || current.epoch !== epoch || current.binding !== binding) return;
      current.controller = null;
      setReadinessState({ busy: false, notice: report && !report.cancelled && !report.stale ? 'checked' : 'cancelled' });
    }).catch(function () {
      if (!current.mounted || current.epoch !== epoch || current.binding !== binding) return;
      current.controller = null;
      setReadinessState({ busy: false, notice: 'failed' });
    });
  };
  var cancelReadiness = function () {
    var current = readinessRunRef.current;
    current.epoch += 1;
    if (current.controller) current.controller.abort();
    current.controller = null;
    setReadinessState({ busy: false, notice: 'cancelled' });
  };
  // A missing-audio confirmation can outlive the resource that opened it.
  // Keep its callback tied to the exact prepared lesson and allow one launch.
  var launchContext = JSON.stringify([generatedContent && generatedContent.id, generatedContent && generatedContent.sessionConfig, generatedContent && generatedContent.data, generatedContent && generatedContent.wsPreloadedWords, wsActivitySequence, isTeacherMode]);
  var launchRef = React.useRef({ context: launchContext, launched: false, mounted: true });
  if (launchRef.current.context !== launchContext) launchRef.current = { context: launchContext, launched: false, mounted: true };
  React.useEffect(function () {
    launchRef.current.mounted = true;
    return function () { launchRef.current.mounted = false; };
  }, []);
  var claimLaunch = function () {
    var current = launchRef.current;
    if (!current.mounted || current.context !== launchContext || current.launched) return false;
    current.launched = true;
    return true;
  };
  var launchErrorState = React.useState('');
  var launchError = launchErrorState[0], setLaunchError = launchErrorState[1];
  var launchPreparedActivity = function() {
    if (!claimLaunch()) return;
    setLaunchError('');
    try {
    var initialActivity = (wsActivitySequence && wsActivitySequence.length > 0) ? wsActivitySequence[0] : 'counting';
    if (typeof prepareWordSoundsSession === 'function') {
      prepareWordSoundsSession({
        ...(generatedContent?.sessionConfig || {}),
        resourceId: generatedContent?.id || null,
        initialActivity,
      });
    }
    setWordSoundsActivity(initialActivity);
    setWordSoundsAutoReview(false);
    setIsWordSoundsMode(true);
    } catch (_) {
      launchRef.current.launched = false;
      setLaunchError(label('preview_launch_failed', 'The activity could not open. Please try again.'));
    }
  };
  return (
                  <div className="space-y-6">{launchError && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{launchError}</p>}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center">
                      <div className="text-4xl mb-3">🎵</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{generatedContent?.title || label('preview_title', 'Word Sounds Studio')}</h3>
                      <p className="text-sm text-slate-600 mb-1">{generatedContent?.configSummary || label('preview_ready', 'Ready to practice')}</p>
                      {generatedContent?.data && <p className="text-xs text-violet-700 font-medium">{label('preview_word_count', '{count} words loaded', { count: generatedContent.data.length })}</p>}
                      {isTeacherMode && wordSoundsAudioCoverage && (
                        <section ref={readinessPanelRef} className="mt-4 rounded-xl border border-violet-200 bg-white p-4 text-start" aria-label={label('readiness_panel', 'Ready for students: audio check')} aria-busy={readinessBusy} onKeyDown={event => { if (event.key === 'Escape' && readinessBusy) { event.preventDefault(); cancelReadiness(); } }}>
                          <h4 className="font-bold text-slate-800">{label('readiness_heading', 'Ready for students')} <span className="text-sm font-medium">{label('readiness_audio_qualifier', 'Audio check')}</span></h4>
                          <p role="status" aria-live="polite" aria-atomic="true" className={`mt-2 text-sm font-bold ${wordSoundsAudioCoverage.complete ? 'text-emerald-700' : 'text-amber-800'}`}>
                            {readinessBusy ? label('readiness_checking', 'Checking local clips. This may take up to 30 seconds.') : (wordSoundsAudioCoverage.complete ? label('readiness_ready', 'Audio verified for this student pack') : label('readiness_review', 'Audio needs checking or review'))}
                            {!readinessBusy && readinessNotice === 'cancelled' && <span className="block">{label('readiness_cancelled', 'Audio check cancelled. Readiness is unconfirmed.')}</span>}
                            {!readinessBusy && readinessNotice === 'failed' && <span className="block">{label('readiness_failed', 'Audio could not be checked. Review the lesson and try again.')}</span>}
                          </p>
                          <p className="mt-2 text-sm text-slate-700">{label('readiness_counts', '{ready}/{total} required clips verified; {embedded} embedded, {online} online dependencies, {deviceOnly} available only on this device.', wordSoundsAudioCoverage)}</p>
                          <p className="mt-2 text-xs text-slate-600">{label('readiness_limits', 'This checks audio only. Review the lesson content before sharing. Online app banks and device cache are not embedded in the student pack; this check cannot confirm them on another device.')}</p>
                          {missingAudioLabels.length > 0 && <p className="mt-2 text-sm text-amber-900">{label('preview_missing', 'Missing: {labels}', { labels: missingAudioLabels.slice(0, 5).map(readableAudioLabel).join(', ') })}{missingAudioLabels.length > 5 && label('preview_more', ', plus {count} more', { count: missingAudioLabels.length - 5 })}</p>}
                          {wordSoundsAudioCoverage.dependencies && wordSoundsAudioCoverage.dependencies.length > 0 && <p className="mt-2 text-sm text-slate-700">{label('readiness_dependencies', 'App or device audio to review: {labels}', { labels: wordSoundsAudioCoverage.dependencies.slice(0, 5).map(readableAudioLabel).join(', ') })}{wordSoundsAudioCoverage.dependencies.length > 5 && label('preview_more', ', plus {count} more', { count: wordSoundsAudioCoverage.dependencies.length - 5 })}</p>}
                          {wordSoundsAudioCoverage.omittedLabels && wordSoundsAudioCoverage.omittedLabels.length > 0 && <p className="mt-2 text-sm text-amber-900">{label('readiness_omitted', 'Prepared clips omitted from delivery: {labels}', { labels: wordSoundsAudioCoverage.omittedLabels.slice(0, 5).join(', ') })}{wordSoundsAudioCoverage.omittedLabels.length > 5 && label('preview_more', ', plus {count} more', { count: wordSoundsAudioCoverage.omittedLabels.length - 5 })}</p>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button ref={readinessCheckButtonRef} type="button" onClick={checkReadiness} disabled={readinessBusy || !readinessApi} className="min-h-11 rounded-lg border border-violet-300 px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{label('readiness_check', 'Check prepared audio')}</button>
                            {readinessBusy && <button ref={readinessCancelButtonRef} type="button" onClick={cancelReadiness} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{label('readiness_cancel', 'Cancel check')}</button>}
                          </div>
                          <p className="mt-2 text-xs text-slate-600">{label('readiness_recovery', 'For missing embedded clips, use Teacher: Review Words & Audio, then re-prepare the pack in setup. Starting or reviewing a session follows the existing session controls.')}</p>
                        </section>
                      )}
                      <div className={`grid grid-cols-1 ${isTeacherMode ? 'sm:grid-cols-2' : ''} gap-3 mt-5`}>
                        {isTeacherMode && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!claimLaunch()) return;
                              const initialActivity = (wsActivitySequence && wsActivitySequence.length > 0) ? wsActivitySequence[0] : 'counting';
                              if (typeof prepareWordSoundsSession === 'function') {
                                prepareWordSoundsSession({
                                  ...(generatedContent?.sessionConfig || {}),
                                  resourceId: generatedContent?.id || null,
                                  initialActivity,
                                });
                              }
                              setWordSoundsActivity(initialActivity);
                              setIsWordSoundsMode(true);
                              setWordSoundsAutoReview(true);
                            }}
                            className="min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-white text-violet-800 font-bold rounded-xl border-2 border-violet-300 hover:bg-violet-100 hover:border-violet-500 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
                          >
                            <BookOpen size={20} aria-hidden="true" />
                            <span className="text-start">
                              <span className="block">{label('preview_teacher_review', 'Teacher: Review Words & Audio')}</span>
                              <span className="block text-xs font-medium text-violet-600">{label('preview_teacher_hint', 'Check or edit the lesson before students begin')}</span>
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isTeacherMode
                                && wordSoundsAudioCoverage
                                && !wordSoundsAudioCoverage.complete
                                && typeof requestIncompleteAudioConfirmation === 'function') {
                              requestIncompleteAudioConfirmation(wordSoundsAudioCoverage, launchPreparedActivity);
                              return;
                            }
                            // Honor the lesson-plan sequence exactly like the
                            // Review button above — 'counting' is only the
                            // no-sequence fallback.
                            launchPreparedActivity();
                          }}
                          className="min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all motion-safe:hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
                        >
                          <Play size={20} aria-hidden="true" />
                          <span className="text-start">
                            <span className="block">{isTeacherMode ? label('preview_student_practice', 'Student: Start Practice') : label('preview_start', 'Start Activity')}</span>
                            <span className="block text-xs font-medium text-indigo-100">{label('preview_start_hint', 'Begin the prepared activities now')}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
  );
}
