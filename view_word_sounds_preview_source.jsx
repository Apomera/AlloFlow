                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center">
                      <div className="text-4xl mb-3">🎵</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{generatedContent?.title || 'Word Sounds Studio'}</h3>
                      <p className="text-sm text-slate-600 mb-1">{generatedContent?.configSummary || 'Ready to practice'}</p>
                      {generatedContent?.data && <p className="text-xs text-violet-500 font-medium">{generatedContent.data.length} words loaded</p>}
                      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
                        <button
                          onClick={() => {
                            const initialActivity = (wsActivitySequence && wsActivitySequence.length > 0) ? wsActivitySequence[0] : 'counting';
                            setWordSoundsActivity(initialActivity);
                            setIsWordSoundsMode(true);
                            setWordSoundsAutoReview(true);
                          }}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                          <BookOpen size={18} /> Pre-Activity Review
                        </button>
                        <button
                          onClick={() => { setIsWordSoundsMode(true); setWordSoundsActivity('counting'); }}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                          <Play size={18} /> Launch Word Sounds Studio
                        </button>
                      </div>
                    </div>
                  </div>