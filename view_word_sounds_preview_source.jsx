
function WordSoundsPreviewView(props) {
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
  var launchPreparedActivity = function() {
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
  };
  return (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center">
                      <div className="text-4xl mb-3">🎵</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{generatedContent?.title || 'Word Sounds Studio'}</h3>
                      <p className="text-sm text-slate-600 mb-1">{generatedContent?.configSummary || 'Ready to practice'}</p>
                      {generatedContent?.data && <p className="text-xs text-violet-500 font-medium">{generatedContent.data.length} words loaded</p>}
                      {isTeacherMode && wordSoundsAudioCoverage && wordSoundsAudioCoverage.total > 0 && (
                        <p
                          role="status"
                          aria-live="polite"
                          className={`mt-2 text-xs font-bold ${wordSoundsAudioCoverage.complete ? 'text-emerald-700' : 'text-amber-700'}`}
                        >
                          Audio ready: {wordSoundsAudioCoverage.ready}/{wordSoundsAudioCoverage.total} required clips
                          {!wordSoundsAudioCoverage.complete && ' - Review missing audio before sending to students'}
                          {!wordSoundsAudioCoverage.complete && missingAudioLabels.length > 0 && (
                            <span className="mt-1 block font-medium text-amber-800">
                              Missing: {missingAudioLabels.slice(0, 5).join(', ')}
                              {missingAudioLabels.length > 5 && `, plus ${missingAudioLabels.length - 5} more`}
                            </span>
                          )}
                        </p>
                      )}
                      <div className={`grid grid-cols-1 ${isTeacherMode ? 'sm:grid-cols-2' : ''} gap-3 mt-5`}>
                        {isTeacherMode && (
                          <button
                            type="button"
                            onClick={() => {
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
                            <span className="text-left">
                              <span className="block">Teacher: Review Words &amp; Audio</span>
                              <span className="block text-xs font-medium text-violet-600">Check or edit the lesson before students begin</span>
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isTeacherMode
                                && wordSoundsAudioCoverage
                                && wordSoundsAudioCoverage.total > 0
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
                          className="min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
                        >
                          <Play size={20} aria-hidden="true" />
                          <span className="text-left">
                            <span className="block">{isTeacherMode ? 'Student: Start Practice' : 'Start Activity'}</span>
                            <span className="block text-xs font-medium text-indigo-100">Begin the prepared activities now</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
  );
}
