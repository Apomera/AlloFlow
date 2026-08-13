
function WordSoundsPreviewView(props) {
  var generatedContent = props.generatedContent;
  var wsActivitySequence = props.wsActivitySequence;
  var setWordSoundsActivity = props.setWordSoundsActivity;
  var setIsWordSoundsMode = props.setIsWordSoundsMode;
  var setWordSoundsAutoReview = props.setWordSoundsAutoReview;
  var prepareWordSoundsSession = props.prepareWordSoundsSession;
  return (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center">
                      <div className="text-4xl mb-3">🎵</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{generatedContent?.title || 'Word Sounds Studio'}</h3>
                      <p className="text-sm text-slate-600 mb-1">{generatedContent?.configSummary || 'Ready to practice'}</p>
                      {generatedContent?.data && <p className="text-xs text-violet-500 font-medium">{generatedContent.data.length} words loaded</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
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
                        <button
                          type="button"
                          onClick={() => {
                            // Honor the lesson-plan sequence exactly like the
                            // Review button above — 'counting' is only the
                            // no-sequence fallback.
                            const initialActivity = (wsActivitySequence && wsActivitySequence.length > 0) ? wsActivitySequence[0] : 'counting';
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
                          }}
                          className="min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
                        >
                          <Play size={20} aria-hidden="true" />
                          <span className="text-left">
                            <span className="block">Student: Start Practice</span>
                            <span className="block text-xs font-medium text-indigo-100">Begin the prepared activities now</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
  );
}
