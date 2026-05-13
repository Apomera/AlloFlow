/**
 * AlloFlow — Global Level-Up Modal Module
 *
 * Celebratory full-screen modal shown when student levels up their global XP
 * (across all activities). Trophy icon, confetti, progress bar to next level,
 * "Continue Learning" button.
 *
 * Extracted from AlloFlowANTI.txt lines 24140-24181 (May 2026).
 *
 * Required props:
 *   AnimatedNumber                    — animated counter component (file-level const)
 *   ConfettiExplosion                 — confetti overlay component (file-level const)
 *   adventureState                    — { level, xp, xpToNextLevel, ... }
 *   handleSetShowGlobalLevelUpToFalse — close handler
 *   t                                 — translation function
 *
 * Icons (from window globals): Trophy
 */
function GlobalLevelUpModal({
  AnimatedNumber,
  ConfettiExplosion,
  adventureState,
  handleSetShowGlobalLevelUpToFalse,
  t,
}) {
  const Trophy = window.Trophy || (() => null);
  return (
    <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500" onClick={handleSetShowGlobalLevelUpToFalse}>
      <ConfettiExplosion />
      <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); }}} className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-2xl border-4 border-yellow-400 relative overflow-hidden max-w-sm w-full mx-4 transform transition-all animate-in zoom-in-50 duration-500" onClick={e => e.stopPropagation()}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(250,204,21,1)0%,rgba(255,255,255,0)70%)] animate-pulse"></div>
        <div className="relative z-10">
          <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-white relative">
            <Trophy size={48} className="text-indigo-900 fill-current animate-bounce" />
            <div className="absolute -top-2 -right-2 bg-indigo-900 text-yellow-400 text-xs font-black px-2 py-1 rounded-full border-2 border-white transform rotate-12">
              {t('common.new_badge')}
            </div>
          </div>
          <h2 className="text-4xl font-black text-indigo-900 mb-2 uppercase tracking-tight drop-shadow-sm">{t('feedback.level_up_title')}</h2>
          <p className="text-indigo-600 font-bold text-lg mb-6">{t('feedback.level_reached', { level: adventureState.level })}</p>
          <div className="bg-indigo-50 rounded-xl p-4 mb-8 border border-indigo-100 shadow-inner">
            <div className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mb-1 flex justify-between">
              <span>{t('feedback.next_milestone')}</span>
              <span>{Math.round((adventureState.xp / adventureState.xpToNextLevel) * 100)}%</span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-3 overflow-hidden border border-indigo-300/50">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(5, (adventureState.xp / adventureState.xpToNextLevel) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] font-mono font-bold text-indigo-600 mt-1.5">
              <span><AnimatedNumber value={adventureState.xp} /> {t('common.xp')}</span>
              <span>{adventureState.xpToNextLevel} {t('common.xp')}</span>
            </div>
          </div>
          <button
            aria-label={t('common.close')}
            onClick={handleSetShowGlobalLevelUpToFalse}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-700 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all active:scale-95"
            autoFocus
          >
            {t('feedback.continue_learning')}
          </button>
        </div>
      </div>
    </div>
  );
}
