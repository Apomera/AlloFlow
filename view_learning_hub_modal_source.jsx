/**
 * AlloFlow — Learning Hub Modal Module
 *
 * Tool launcher modal: STEM Lab, Open Groove Studio, StoryForge, LitLab,
 * PoetTree, SEL Hub, AlloHaven.
 * Each button closes this modal and opens the chosen tool.
 *
 * Extracted from AlloFlowANTI.txt lines 23409-23465 (May 2026).
 * 57 lines, 11 deps (mostly navigation setters).
 */
function LearningHubModal(props) {
  const {
    setIsAlloHavenOpen, setIsOpenGrooveOpen, setIsTimelineStudioOpen, setSelHubTab, setShowLearningHub, setShowLitLab,
    setShowMindMap, setShowPoetTree, setShowResearchHub, setShowSelHub, setShowStemLab, setShowStoryForge,
    setStemLabTab, showLearningHub,
    // Family Bridge launcher (2026-06-28): opens live two-way translation. Optional
    // default so a host that hasn't wired the setter still renders the hub.
    // BridgeSendModal is teacher-gated, so the card is only shown in teacher mode
    // (default false) to avoid a dead button for student/family entry points.
    setBridgeSendOpen = (() => {}),
    isTeacherMode = false,
    // Reading Library (2026-07-05): StoryWeaver open picture books. Optional —
    // card only renders when the host wires the setter.
    setIsReadingLibraryOpen,
    t,
  } = props;
  return (
        <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-3 sm:p-4" style={{ zIndex: 260 }} onClick={() => setShowLearningHub(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') setShowLearningHub(false); }}>
          {/* allo-docsuite: this modal is a portal rendered OUTSIDE the main .allo-docsuite
              content wrapper, so the theme-dark gradient/text remaps (which are scoped to
              .allo-docsuite) never reached the pastel tool cards — they stayed light-pastel in
              dark mode. Adding the scope class opts the modal into the existing, tested dark
              remap (from-*-50 gradients -> dark tints, text-*-800/600 -> light). No-op in light
              mode: every .allo-docsuite rule is prefixed .theme-dark / .theme-contrast. */}
          <div className="allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-8" style={{ maxHeight: '90vh' }} role="dialog" aria-modal="true" aria-label={t('learning_hub.title') || 'Learning Tools'} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{'\uD83E\uDDE9'} {t('learning_hub.title') || 'Learning Tools'}</h2>
                <p className="text-sm text-slate-600 mt-1">{t('learning_hub.subtitle') || 'Choose a tool to explore'}</p>
              </div>
              <button onClick={() => setShowLearningHub(false)} className="p-2 -m-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl" aria-label={t('learning_hub.close_aria') || 'Close learning hub'}>{'\u2715'}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Bridge card removed 2026-07-02 (Aaron): the header Bridge button is the
                  single entry point now. setBridgeSendOpen prop stays accepted (unused)
                  so hosts that still pass it render unchanged. */}
              <button onClick={() => { setShowLearningHub(false); setShowStemLab(true); setStemLabTab('explore'); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">{'\uD83D\uDD2C'}</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('learning_hub.stem_title') || 'STEM Lab'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('learning_hub.stem_desc') || '100+ interactive math & science explorations'}</p>
                </div>
              </button>
              {typeof setIsOpenGrooveOpen === 'function' && (
                <button onClick={() => { setShowLearningHub(false); setIsOpenGrooveOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-cyan-50 to-emerald-50 border border-cyan-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                  <span className="text-4xl">{'\uD83C\uDF9B\uFE0F'}</span>
                  <div>
                    <h3 className="font-bold text-cyan-900">{t('learning_hub.open_groove_title') || 'Open Groove Studio'}</h3>
                    <p className="text-xs text-cyan-700 mt-1">{t('learning_hub.open_groove_desc') || 'Make beats, shape synths, and connect patterns to real composition and notation.'}</p>
                  </div>
                </button>
              )}
              {typeof setIsTimelineStudioOpen === 'function' && (
                <button onClick={() => { setShowLearningHub(false); setIsTimelineStudioOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                  <span className="text-4xl">{'\uD83D\uDD70\uFE0F'}</span>
                  <div>
                    <h3 className="font-bold text-rose-800">{t('learning_hub.timeline_studio_title') || 'Timeline Studio'}</h3>
                    <p className="text-xs text-rose-700 mt-1">{t('learning_hub.timeline_studio_desc') || 'Turn readings into interactive timelines, or build one by hand.'}</p>
                  </div>
                </button>
              )}
              <button onClick={() => { setShowLearningHub(false); setShowStoryForge(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">{'\uD83D\uDCD6'}</span>
                <div>
                  <h3 className="font-bold text-rose-800">{t('learning_hub.storyforge_title') || 'StoryForge'}</h3>
                  <p className="text-xs text-rose-600 mt-1">{t('learning_hub.storyforge_desc') || 'Create illustrated stories with AI writing tools'}</p>
                </div>
              </button>
              {typeof setIsReadingLibraryOpen === 'function' && (
                <button onClick={() => { setShowLearningHub(false); setIsReadingLibraryOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                  <span className="text-4xl">{'📚'}</span>
                  <div>
                    <h3 className="font-bold text-sky-800">{t('learning_hub.reading_library_title') || 'Reading Library'}</h3>
                    <p className="text-xs text-sky-700 mt-1">{t('learning_hub.reading_library_desc') || 'Real picture books in 10 languages — read along, listen, and practice'}</p>
                  </div>
                </button>
              )}
              <button onClick={() => { setShowLearningHub(false); setShowLitLab(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">🎭</span>
                <div>
                  <h3 className="font-bold text-violet-800">{t('learning_hub.litlab_title') || 'LitLab'}</h3>
                  <p className="text-xs text-violet-600 mt-1">{t('learning_hub.litlab_desc') || 'Bring stories to life with character voices & literary analysis'}</p>
                </div>
              </button>
              {setShowMindMap && (
                <button onClick={() => { setShowLearningHub(false); setShowMindMap(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                  <span className="text-4xl">🧭</span>
                  <div>
                    <h3 className="font-bold text-amber-800">{t('learning_hub.throughline_title') || 'Throughline'}</h3>
                    <p className="text-xs text-amber-700 mt-1">{t('learning_hub.throughline_desc') || 'Arrange your lessons into a spatial unit: teaching sequence, prerequisites, one exportable file'}</p>
                  </div>
                </button>
              )}
              <button onClick={() => { setShowLearningHub(false); setShowPoetTree(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">🌳</span>
                <div>
                  <h3 className="font-bold text-teal-800">{t('learning_hub.poettree_title') || 'PoetTree'}</h3>
                  <p className="text-xs text-teal-600 mt-1">{t('learning_hub.poettree_desc') || 'Write poems with form scaffolds, rhyme & meter analysis, AI feedback'}</p>
                </div>
              </button>
              <button onClick={() => { setShowLearningHub(false); setShowSelHub(true); setSelHubTab('explore'); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">{'\uD83D\uDC96'}</span>
                <div>
                  <h3 className="font-bold text-emerald-800">{t('learning_hub.sel_title') || 'SEL Hub'}</h3>
                  <p className="text-xs text-emerald-600 mt-1">{t('learning_hub.sel_desc') || 'Social-emotional learning for self-awareness & growth'}</p>
                </div>
              </button>
              <button onClick={() => { setShowLearningHub(false); setIsAlloHavenOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-green-50 to-lime-50 border border-green-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl" role="img" aria-label="herb">🌿</span>
                <div>
                  <h3 className="font-bold text-green-800">AlloHaven</h3>
                  <p className="text-xs text-green-700 mt-1">A cozy room you build by focusing and reflecting. Pomodoro + journal + AI decorations. No leaderboards, no streak guilt.</p>
                </div>
              </button>
              <button onClick={() => { setShowLearningHub(false); if (typeof setShowResearchHub === 'function') setShowResearchHub(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">{'🔍'}</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('learning_hub.research_title') || 'Research Hub'}</h3>
                  <p className="text-xs text-indigo-700 mt-1">{t('learning_hub.research_desc') || 'Scientific Inquiry, Engineering Design, and Humanities research — one inquiry journal, three lanes.'}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
  );
}
