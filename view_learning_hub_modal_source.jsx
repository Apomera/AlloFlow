/**
 * AlloFlow — Learning Hub Modal Module
 *
 * Tool launcher modal: STEM Lab, StoryForge, LitLab, PoetTree, SEL Hub, AlloHaven.
 * Each button closes this modal and opens the chosen tool.
 *
 * Extracted from AlloFlowANTI.txt lines 23409-23465 (May 2026).
 * 57 lines, 11 deps (mostly navigation setters).
 */
function LearningHubModal(props) {
  const {
    setIsAlloHavenOpen, setSelHubTab, setShowLearningHub, setShowLitLab,
    setShowPoetTree, setShowSelHub, setShowStemLab, setShowStoryForge,
    setStemLabTab, showLearningHub, t,
  } = props;
  return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLearningHub(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') setShowLearningHub(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8" role="dialog" aria-modal="true" aria-label="Learning Tools" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{'\uD83E\uDDE9'} {t('learning_hub.title') || 'Learning Tools'}</h2>
                <p className="text-sm text-slate-600 mt-1">{t('learning_hub.subtitle') || 'Choose a tool to explore'}</p>
              </div>
              <button onClick={() => setShowLearningHub(false)} className="text-slate-600 hover:text-slate-600 text-xl" aria-label="Close learning hub">{'\u2715'}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => { setShowLearningHub(false); setShowStemLab(true); setStemLabTab('explore'); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">{'\uD83D\uDD2C'}</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('learning_hub.stem_title') || 'STEM Lab'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('learning_hub.stem_desc') || '40+ interactive math & science explorations'}</p>
                </div>
              </button>
              <button onClick={() => { setShowLearningHub(false); setShowStoryForge(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">{'\uD83D\uDCD6'}</span>
                <div>
                  <h3 className="font-bold text-rose-800">{t('learning_hub.storyforge_title') || 'StoryForge'}</h3>
                  <p className="text-xs text-rose-600 mt-1">{t('learning_hub.storyforge_desc') || 'Create illustrated stories with AI writing tools'}</p>
                </div>
              </button>
              <button onClick={() => { setShowLearningHub(false); setShowLitLab(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">🎭</span>
                <div>
                  <h3 className="font-bold text-violet-800">LitLab</h3>
                  <p className="text-xs text-violet-600 mt-1">Bring stories to life with character voices & literary analysis</p>
                </div>
              </button>
              <button onClick={() => { setShowLearningHub(false); setShowPoetTree(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center">
                <span className="text-4xl">🌳</span>
                <div>
                  <h3 className="font-bold text-teal-800">PoetTree</h3>
                  <p className="text-xs text-teal-600 mt-1">Write poems with form scaffolds, rhyme & meter analysis, AI feedback</p>
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
            </div>
          </div>
        </div>
  );
}
