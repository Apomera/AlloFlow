/**
 * AlloFlow — Session Modal Module
 *
 * Live session status modal: shows the session code (large + copyable),
 * the host's app ID (copyable), the groups manager entry, the sync/async
 * mode toggle, and Close / End Session actions.
 *
 * Extracted from AlloFlowANTI.txt lines 20205-20304 (May 2026).
 *
 * Required props:
 *   activeSessionAppId               — alternate session host app ID
 *   activeSessionCode                — 4-6 digit live session code
 *   addToast                         — toast helper
 *   appId                            — current app ID
 *   copyToClipboard                  — clipboard helper (also fires a toast)
 *   db                               — Firestore db handle
 *   deleteDoc                        — Firestore deleteDoc primitive
 *   doc                              — Firestore doc primitive
 *   handleSetShowGroupModalToTrue    — open the groups manager
 *   handleSetShowSessionModalToFalse — close this modal
 *   sessionData                      — current session state (mode + roster)
 *   setActiveSessionCode             — clears session code on end
 *   setConfirmDialog                 — shows confirm dialog for "end session"
 *   setSessionData                   — clears session data on end
 *   setShowSessionModal              — direct setter (used in end-session flow)
 *   t                                — translation function
 *   toggleSessionMode                — toggles sync vs async student pacing
 *   warnLog                          — debug logger
 *
 * Icons (from window globals): Wifi, X, Copy, Users, ChevronRight, XCircle
 */
function SessionModal({
  activeSessionAppId,
  activeSessionCode,
  addToast,
  appId,
  copyToClipboard,
  db,
  deleteDoc,
  doc,
  handleSetShowGroupModalToTrue,
  handleSetShowSessionModalToFalse,
  sessionData,
  setActiveSessionCode,
  setConfirmDialog,
  setSessionData,
  setShowSessionModal,
  t,
  toggleSessionMode,
  warnLog,
}) {
  const noop = () => null;
  const Wifi = window.Wifi || noop;
  const X = window.X || noop;
  const Copy = window.Copy || noop;
  const Users = window.Users || noop;
  const ChevronRight = window.ChevronRight || noop;
  const XCircle = window.XCircle || noop;

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={handleSetShowSessionModalToFalse}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('session.live_title')}>
        <button onClick={handleSetShowSessionModalToFalse} className="absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" aria-label={t('common.close')}><X size={24}/></button>
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-4 rounded-full shadow-inner">
            <Wifi size={48} className="text-green-600 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">{t('session.live_title')}</h2>
        <p className="text-slate-600 mb-6 font-medium">{t('session.live_instruction')}</p>
        <div
          className="bg-indigo-50 border-4 border-indigo-100 rounded-2xl p-6 mb-6 cursor-pointer hover:bg-indigo-100 transition-colors group relative"
          onClick={() => copyToClipboard(activeSessionCode)}
          title={t('common.click_to_copy')}
        >
          <div className="text-7xl font-black text-indigo-600 tracking-widest font-mono">
            {activeSessionCode}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1">
            <Copy size={10}/> {t('session.click_to_copy')}
          </div>
        </div>
        <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[11px] text-slate-600 font-bold uppercase tracking-wider mb-1">{t('session.host_id_share')}</p>
          <button
            aria-label={t('common.copy')}
            onClick={() => copyToClipboard(appId)}
            className="w-full flex items-center justify-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-400 hover:border-indigo-200 rounded-lg p-2 transition-all"
          >
            {appId} <Copy size={12}/>
          </button>
        </div>
        {sessionData && (
          <div className="mb-6 text-center animate-in slide-in-from-bottom-2">
            <button
              aria-label={t('common.groups')}
              onClick={handleSetShowGroupModalToTrue}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-3"
            >
              <Users size={20} />
              <div className="text-left">
                <span className="block">{t('groups.manage_button')}</span>
                <span className="block text-[11px] font-normal opacity-80">{t('groups.manage_button_desc')}</span>
              </div>
              <ChevronRight size={18} className="opacity-60"/>
            </button>
          </div>
        )}
        {sessionData && (
          <div className="mb-8 flex justify-center">
            <button
              onClick={toggleSessionMode}
              className={`flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all w-full justify-center ${sessionData.mode === 'sync' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
            >
              <div className={`w-10 h-5 rounded-full relative transition-colors ${sessionData.mode === 'sync' ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${sessionData.mode === 'sync' ? 'left-6' : 'left-1'}`}></div>
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold uppercase tracking-wider">{sessionData.mode === 'sync' ? t('session.teacher_paced') : t('session.student_paced')}</span>
                <span className="block text-[11px] opacity-70 font-normal">
                  {sessionData.mode === 'sync' ? t('session.teacher_paced_desc') : t('session.student_paced_desc')}
                </span>
              </div>
            </button>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleSetShowSessionModalToFalse}
            className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full transition-colors"
          >
            {t('session.action_close')}
          </button>
          <button
            onClick={async () => {
              setConfirmDialog({ message: t('session.end_confirm') || 'Are you sure you want to end this session?', onConfirm: async () => {
                if (activeSessionCode) {
                  try {
                    const sessionRef = doc(db, 'artifacts', activeSessionAppId || appId, 'public', 'data', 'sessions', activeSessionCode);
                    await deleteDoc(sessionRef);
                    addToast(t('session.session_ended_toast') || "Session ended.", "success");
                  } catch (e) {
                    warnLog("Error ending session:", e);
                    addToast(t('session.error_end_session') || "Failed to end session.", "error");
                  }
                }
                setActiveSessionCode(null);
                setSessionData(null);
                setShowSessionModal(false);
              }});
            }}
            className="px-8 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-full transition-colors flex items-center gap-2"
          >
            <XCircle size={18}/> {t('session.action_end')}
          </button>
        </div>
      </div>
    </div>
  );
}
