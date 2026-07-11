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
 *   activeSessionCode                — 5-character live session code
 *   addToast                         — toast helper
 *   appId                            — current app ID
 *   copyToClipboard                  — clipboard helper (also fires a toast)
 *   db                               — Firestore db handle
 *   deleteDoc                        — Firestore deleteDoc primitive
 *   doc                              — Firestore doc primitive
 *   handleSetShowGroupModalToTrue    — open the groups manager
 *   handleSetShowSessionModalToFalse — close this modal
 *   isMailboxSession               — whether this uses the mailbox transport
 *   mailboxJoinUrl                 — capability-bearing mailbox student URL
 *   onEndMailboxSession            — mailbox teardown callback
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
  isMailboxSession = false,
  mailboxJoinUrl = '',
  onEndMailboxSession = null,
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
  const lanJoinUrl = Array.isArray(sessionData?.joinUrls) ? sessionData.joinUrls[0] : '';
  const isLocalOnly = sessionData?.isLocalOnly === true || sessionData?.transport === 'local-preview';
  const [liveQrSvg, setLiveQrSvg] = React.useState('');
  const [liveQrError, setLiveQrError] = React.useState(false);

  const liveJoinUrl = React.useMemo(() => {
    if (mailboxJoinUrl) return mailboxJoinUrl;
    if (isLocalOnly || !activeSessionCode || typeof window === 'undefined') return '';
    const params = {
      allo_join: activeSessionCode,
      allo_host: activeSessionAppId || appId,
      allo_ai: 'off',
    };
    if (typeof window.__alloBuildShareUrl === 'function') {
      try { return window.__alloBuildShareUrl(params); } catch (_) {}
    }
    try {
      const url = new URL(window.location.href);
      const protocol = String(url.protocol || '').toLowerCase();
      const host = String(url.hostname || '').toLowerCase();
      if (!/^https?:$/.test(protocol)
        || host === 'localhost'
        || host === '127.0.0.1'
        || host.includes('gemini.google')
        || host === 'prismflow-911fe.web.app'
        || host === 'prismflow-911fe.firebaseapp.com') {
        return '';
      }
      url.search = '';
      url.hash = '';
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
      return url.toString();
    } catch (_) {
      return '';
    }
  }, [activeSessionAppId, activeSessionCode, appId, isLocalOnly, mailboxJoinUrl]);

  React.useEffect(() => {
    let cancelled = false;
    if (!liveJoinUrl || typeof window === 'undefined') {
      setLiveQrSvg('');
      setLiveQrError(false);
      return undefined;
    }
    setLiveQrSvg('');
    setLiveQrError(false);
    const makeQrSvg = async () => {
      if (typeof window.__alloMakeQrSvg === 'function') {
        return window.__alloMakeQrSvg(liveJoinUrl, 'AlloFlow student join QR');
      }
      if (!window.qrcode) throw new Error('QR helper unavailable');
      const qr = window.qrcode(0, 'M');
      qr.addData(liveJoinUrl);
      qr.make();
      return qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true, title: 'AlloFlow student join QR' });
    };
    makeQrSvg()
      .then(svg => { if (!cancelled) setLiveQrSvg(svg); })
      .catch(() => { if (!cancelled) { setLiveQrSvg(''); setLiveQrError(true); } });
    return () => { cancelled = true; };
  }, [liveJoinUrl]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={handleSetShowSessionModalToFalse}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 text-center max-w-md w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="alloflow-session-modal-title">
        <button onClick={handleSetShowSessionModalToFalse} className="absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" aria-label={t('common.close')}><X size={24}/></button>
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-4 rounded-full shadow-inner">
            <Wifi size={48} className="text-green-600 animate-pulse" />
          </div>
        </div>
        <h2 id="alloflow-session-modal-title" className="text-2xl font-black text-slate-800 mb-2">{isLocalOnly ? 'Local preview' : isMailboxSession ? 'Class Mailbox live session' : t('session.live_title')}</h2>
        <p className="text-slate-600 mb-6 font-medium">{isLocalOnly ? 'Firebase did not create a shareable session. This preview stays on the teacher device.' : isMailboxSession ? 'Students join through your Class Mailbox without accounts.' : t('session.live_instruction')}</p>
        <button
          type="button"
          className="w-full bg-indigo-50 border-4 border-indigo-100 rounded-2xl p-4 sm:p-6 mb-6 cursor-pointer hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors group relative"
          onClick={() => copyToClipboard(activeSessionCode)}
          title={t('common.click_to_copy')}
        >
          <div className="text-5xl sm:text-7xl font-black text-indigo-600 tracking-[0.16em] sm:tracking-widest font-mono">
            {activeSessionCode}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1">
            <Copy size={10}/> {t('session.click_to_copy')}
          </div>
        </button>
        {liveJoinUrl && (
          <div className="mb-6 bg-cyan-50 p-4 rounded-xl border border-cyan-200 text-left">
            <p className="text-[11px] text-cyan-700 font-bold uppercase tracking-wider mb-2 text-center">{isMailboxSession ? 'Class Mailbox QR join' : 'Student QR join'}</p>
            <div className="flex justify-center mb-3">
              <div className="bg-white border border-cyan-200 rounded-lg p-2 w-40 h-40 flex items-center justify-center shadow-sm">
                {liveQrSvg
                  ? <div className="w-full h-full [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: liveQrSvg }} />
                  : <span className="text-xs font-bold text-cyan-700 text-center">{liveQrError ? 'Copy link below' : 'QR loading'}</span>}
              </div>
            </div>
            <button
              aria-label={t('common.copy')}
              onClick={() => copyToClipboard(liveJoinUrl)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-cyan-800 hover:text-cyan-900 bg-white border border-cyan-300 hover:border-cyan-400 rounded-lg p-2 transition-all break-all"
            >
              Copy student join link <Copy size={12}/>
            </button>
            <p className="text-[11px] text-cyan-800 mt-2 text-center">{isMailboxSession ? 'This QR uses the mailbox session secret and does not require Firebase sign-in.' : 'QR students join this live session with AI generation off.'}</p>
          </div>
        )}
        {!liveJoinUrl && (
          <div className="mb-6 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider mb-1 text-center">{isLocalOnly ? 'Local preview only' : 'Student QR unavailable'}</p>
            <p className="text-xs text-amber-900 text-center">{isLocalOnly ? 'This code was not saved to Firebase, so students cannot join it. Reload, start a new live session, and share only when a QR appears.' : 'This host is not configured as a student join path. Use the class code, local network link, or a student app URL.'}</p>
          </div>
        )}
        {lanJoinUrl && (
          <div className="mb-6 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider mb-1">Local network join link</p>
            <button
              aria-label={t('common.copy')}
              onClick={() => copyToClipboard(lanJoinUrl)}
              className="w-full flex items-center justify-center gap-2 text-xs font-mono font-bold text-emerald-800 hover:text-emerald-900 bg-white border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all break-all"
            >
              {lanJoinUrl} <Copy size={12}/>
            </button>
          </div>
        )}
        {!isMailboxSession && (
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
        )}
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
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleSetShowSessionModalToFalse}
            className="w-full sm:w-auto px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full transition-colors"
          >
            {t('session.action_close')}
          </button>
          <button
            onClick={async () => {
              setConfirmDialog({ message: t('session.end_confirm') || 'Are you sure you want to end this session?', onConfirm: async () => {
                if (typeof onEndMailboxSession === 'function') {
                  try {
                    await onEndMailboxSession();
                    addToast(t('session.session_ended_toast') || "Session ended.", "success");
                  } catch (e) {
                    warnLog("Error ending mailbox session:", e);
                    addToast(t('session.error_end_session') || "Failed to end session.", "error");
                  }
                } else if (activeSessionCode) {
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
            className="w-full sm:w-auto px-8 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <XCircle size={18}/> {t('session.action_end')}
          </button>
        </div>
      </div>
    </div>
  );
}
