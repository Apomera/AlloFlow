/**
 * AlloFlow — XP Modal Module
 *
 * Trophy/level/progress overlay shown when student taps the XP indicator.
 * Displays current global level, points, progress to next level, and recent
 * activity history.
 *
 * Extracted from AlloFlowANTI.txt lines 21609-21663 (May 2026).
 *
 * Required props:
 *   currentLevelXP                — XP earned in current level band
 *   globalLevel                   — current numeric level
 *   globalPoints                  — total accumulated XP
 *   globalProgress                — 0-100 progress percentage to next level
 *   globalXPNext                  — XP threshold for next level
 *   handleSetShowXPModalToFalse   — close handler
 *   pointHistory                  — array of recent activity entries
 *   t                             — translation function
 *
 * Icons (read from window globals): Trophy, X, History
 */
function XPModal({
  currentLevelXP,
  globalLevel,
  globalPoints,
  globalProgress,
  globalXPNext,
  handleSetShowXPModalToFalse,
  pointHistory,
  t,
}) {
  const Trophy = window.Trophy || (() => null);
  const X = window.X || (() => null);
  const History = window.History || (() => null);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={handleSetShowXPModalToFalse} role="presentation">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative border-4 border-yellow-400 transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="xp-modal-title">
        <button onClick={handleSetShowXPModalToFalse} className="absolute top-3 right-3 text-slate-600 hover:text-slate-600 bg-slate-100 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label={t('common.close')}><X size={16}/></button>
        <div className="text-center mb-6 relative">
          <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-indigo-900 shadow-lg relative">
            <Trophy size={40} className="text-indigo-900 fill-current" />
            <div className="absolute -bottom-2 bg-indigo-900 text-yellow-400 text-xs font-black px-2 py-1 rounded-full border border-white">
              {t('student_dashboard.level_abbr')} {globalLevel}
            </div>
          </div>
          <h2 id="xp-modal-title" className="text-2xl font-black text-indigo-900 uppercase tracking-tight" data-help-key="xp_modal_summary">{t('student_dashboard.level_progress')}</h2>
          <p className="text-slate-600 font-bold text-sm">{t('student_dashboard.total_xp')}: <span className="text-green-600">{globalPoints}</span></p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-400 shadow-inner">
          <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            <span>{t('common.progress')}</span>
            <span>{Math.round(globalProgress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden border border-slate-400">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ease-out relative"
              style={{ width: `${Math.max(5, globalProgress)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
          <div className="flex justify-between text-[11px] font-mono font-bold text-slate-600 mt-1.5">
            <span>{currentLevelXP} XP</span>
            <span>{globalXPNext} XP to Lvl {globalLevel + 1}</span>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-1">
            <History size={12}/> Recent History
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {pointHistory.length === 0 ? (
              <div className="text-center text-slate-600 text-xs italic py-4">{t('student_dashboard.no_activities')}</div>
            ) : (
              pointHistory.slice(0, 20).map((entry) => (
                <div key={entry.id} className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 truncate max-w-[200px]" title={entry.activity}>{entry.activity}</span>
                    <span className="text-[11px] text-slate-600">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <span className="font-black text-green-600">+{entry.points} XP</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
