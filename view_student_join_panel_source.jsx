/**
 * AlloFlow — Student Join Panel Module
 *
 * Sidebar panel shown to students who are NOT yet in a session. Collapsed
 * by default (one-line "Join" pill); expands to a 4-digit code entry form
 * plus optional host-ID override input.
 *
 * Extracted from AlloFlowANTI.txt lines 21356-21424 (May 2026).
 *
 * Required props (12):
 *   appId, handleSetIsJoinPanelExpandedToFalse,
 *   handleSetIsJoinPanelExpandedToTrue, isJoinPanelExpanded,
 *   joinAppIdInput, joinClassSession, joinCodeInput, setJoinAppIdInput,
 *   setJoinCodeInput, t
 *
 * Icons (from window globals): Minimize, Wifi, ArrowRight
 */
function StudentJoinPanel({
  appId,
  handleSetIsJoinPanelExpandedToFalse,
  handleSetIsJoinPanelExpandedToTrue,
  isJoinPanelExpanded,
  joinAppIdInput,
  joinClassSession,
  joinCodeInput,
  setJoinAppIdInput,
  setJoinCodeInput,
  t,
}) {
  const noop = () => null;
  const Minimize = window.Minimize || noop;
  const Wifi = window.Wifi || noop;
  const ArrowRight = window.ArrowRight || noop;

  return (
    <div className={`bg-white rounded-3xl shadow-xl shadow-indigo-500/10 border border-slate-400 mb-4 shrink-0 animate-in slide-in-from-left-4 duration-500 overflow-hidden transition-all ${isJoinPanelExpanded ? 'p-6' : 'p-2'}`}>
      {isJoinPanelExpanded ? (
        <div className="text-center relative">
          <button
            aria-label={t('common.minimize')}
            onClick={handleSetIsJoinPanelExpandedToFalse}
            className="absolute -top-2 -right-2 p-2 text-slate-600 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50"
            title={t('common.minimize')}
          >
            <Minimize size={16} />
          </button>
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Wifi size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">{t('session.join_panel_title')}</h2>
          <p className="text-slate-600 text-sm mb-6 font-medium">{t('session.join_instructions')}</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <div className="text-left">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">{t('session.host_id_optional')}</label>
              <input aria-label={t('common.enter_join_app_id_input')}
                type="text"
                value={joinAppIdInput}
                onChange={(e) => setJoinAppIdInput(e.target.value)}
                placeholder={`Default: ${appId}`}
                className="w-full text-xs border border-slate-400 rounded-xl p-2 focus:outline-none focus:border-indigo-500 text-slate-600 font-mono mb-2"
              />
            </div>
            <input aria-label={t('common.enter_join_code_input')}
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinClassSession(joinCodeInput)}
              placeholder={t('session.code_placeholder')}
              maxLength={4}
              className="w-full text-center font-mono font-black text-3xl tracking-[0.5em] border-2 border-slate-200 rounded-2xl p-4 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-indigo-800 uppercase transition-all placeholder:text-slate-600"
            />
            <button
              aria-label={t('common.continue')}
              onClick={() => joinClassSession(joinCodeInput)}
              disabled={joinCodeInput.length < 4}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-3 rounded-2xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {t('session.join_action')} <ArrowRight size={20}/>
            </button>
          </div>
        </div>
      ) : (
        <button
          aria-label={t('common.connect')}
          onClick={handleSetIsJoinPanelExpandedToTrue}
          className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-2xl transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
              <Wifi size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-700 text-sm">{t('session.join')}</h3>
              <p className="text-[11px] text-slate-600">{t('session.sync_desc')}</p>
            </div>
          </div>
          <div className="bg-indigo-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-sm">
            <ArrowRight size={16} />
          </div>
        </button>
      )}
    </div>
  );
}
