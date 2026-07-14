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
  connectedStudentCount = 0,
  db,
  deleteDoc,
  doc,
  handleSetShowGroupModalToTrue,
  handleSetShowSessionModalToFalse,
  isMailboxSession = false,
  mailboxJoinUrl = '',
  onRequestEndSession,
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
  const ExternalLink = window.ExternalLink || noop;
  const Printer = window.Printer || noop;
  const Maximize = window.Maximize || noop;
  const Minimize = window.Minimize || noop;
  const CheckCircle2 = window.CheckCircle2 || noop;
  const [isProjectionMode, setIsProjectionMode] = React.useState(false);
  const lanJoinUrl = Array.isArray(sessionData?.joinUrls) ? sessionData.joinUrls[0] : '';
  const isLocalOnly = sessionData?.isLocalOnly === true || sessionData?.transport === 'local-preview';
  const [liveQrSvg, setLiveQrSvg] = React.useState('');
  const [liveQrError, setLiveQrError] = React.useState(false);
  const dialogRef = React.useRef(null);
  React.useEffect(function () {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const getFocusable = function () { return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')); };
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); handleSetShowSessionModalToFalse(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return function () { dialog.removeEventListener('keydown', onKeyDown); if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus(); };
  }, [handleSetShowSessionModalToFalse]);

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

  const testStudentJoin = React.useCallback(() => {
    if (!liveJoinUrl || typeof window === 'undefined') return;
    const preview = window.open(liveJoinUrl, '_blank');
    if (preview) {
      try { preview.opener = null; } catch (_) {}
    } else {
      addToast('Allow pop-ups to test this student join link.', 'info');
    }
  }, [addToast, liveJoinUrl]);

  const printLiveQr = React.useCallback(() => {
    if (!liveQrSvg || typeof window === 'undefined') {
      addToast('Wait for the QR code to finish loading before printing.', 'info');
      return;
    }
    const popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) {
      addToast('Allow pop-ups to print this QR code.', 'info');
      return;
    }
    try { popup.opener = null; } catch (_) {}
    const safeCode = String(activeSessionCode || '').replace(/[^A-Z0-9-]/gi, '');
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>AlloFlow live session ${safeCode}</title><style>body{font-family:Arial,sans-serif;color:#172033;text-align:center;padding:40px}h1{font-size:28px;margin:0 0 8px}.mode{font-weight:700;color:#0e7490;margin-bottom:24px}.qr{width:360px;height:360px;margin:0 auto 24px}.qr svg{width:100%;height:100%}.code{font:900 54px/1.1 monospace;letter-spacing:.18em;margin:12px 0}.note{font-size:15px;color:#475569;margin-top:18px}@media print{body{padding:20px}}</style></head><body><h1>AlloFlow live session</h1><div class="mode">${isMailboxSession ? 'Class Mailbox QR join' : 'Student QR join'} · AI tools off</div><div class="qr">${liveQrSvg}</div><div>Fallback class code</div><div class="code">${safeCode}</div><div class="note">Scan the QR code to join. This invitation works only while the teacher session is active.</div></body></html>`);
    popup.document.close();
    setTimeout(() => { try { popup.focus(); popup.print(); } catch (_) {} }, 250);
  }, [activeSessionCode, addToast, isMailboxSession, liveQrSvg]);

  return (
    <div className={`fixed inset-0 bg-black/80 z-[150] flex items-center justify-center animate-in fade-in duration-200 ${isProjectionMode ? 'p-0' : 'p-4'}`} role="presentation" onClick={handleSetShowSessionModalToFalse}>
      <div ref={dialogRef} tabIndex={-1} className={`bg-white shadow-2xl text-center w-full overflow-y-auto relative animate-in zoom-in-95 duration-200 focus:outline-none ${isProjectionMode ? 'h-screen max-w-none rounded-none p-6 sm:p-10' : 'max-h-[90vh] max-w-md rounded-2xl p-5 sm:p-8'}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="alloflow-session-modal-title">
        {!isLocalOnly && liveJoinUrl && <button type="button" onClick={() => setIsProjectionMode(value => !value)} className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:border-indigo-400" aria-label={isProjectionMode ? 'Exit projection mode' : 'Open projection mode'}>
          {isProjectionMode ? <Minimize size={16}/> : <Maximize size={16}/>} <span className="hidden sm:inline">{isProjectionMode ? 'Exit projection' : 'Project QR'}</span>
        </button>}
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
          className={`w-full bg-indigo-50 border-4 border-indigo-100 rounded-2xl cursor-pointer hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors group relative ${isProjectionMode ? 'mx-auto max-w-4xl p-4 mb-4' : 'p-4 sm:p-6 mb-6'}`}
          onClick={() => copyToClipboard(activeSessionCode)}
          title={t('common.click_to_copy')}
        >
          <div className={`font-black text-indigo-600 tracking-[0.16em] sm:tracking-widest font-mono ${isProjectionMode ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'}`}>
            {activeSessionCode}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1">
            <Copy size={10}/> {t('session.click_to_copy')}
          </div>
        </button>
        {liveJoinUrl && (
          <div className={`bg-cyan-50 rounded-xl border border-cyan-200 text-left ${isProjectionMode ? 'mx-auto max-w-5xl p-5 mb-3' : 'p-4 mb-6'}`}>
            <p className="text-[11px] text-cyan-700 font-bold uppercase tracking-wider mb-2 text-center">{isMailboxSession ? 'Class Mailbox QR join' : 'Student QR join'}</p>
            <div className="flex justify-center mb-3">
              <div className={`bg-white border border-cyan-200 rounded-lg p-2 flex items-center justify-center shadow-sm ${isProjectionMode ? 'w-[min(52vh,72vw)] h-[min(52vh,72vw)]' : 'w-40 h-40'}`}>
                {liveQrSvg
                  ? <div className="w-full h-full [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: liveQrSvg }} />
                  : <span className="text-xs font-bold text-cyan-700 text-center">{liveQrError ? 'Copy link below' : 'QR loading'}</span>}
              </div>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3" aria-label="Live session readiness">
              <span className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 font-bold text-emerald-800"><CheckCircle2 size={14}/> Session active</span>
              <span className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 font-bold text-emerald-800"><CheckCircle2 size={14}/> Student link ready</span>
              <span className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 font-bold text-emerald-800"><CheckCircle2 size={14}/> QR validated</span>
            </div>
            <button
              aria-label={t('common.copy')}
              onClick={() => copyToClipboard(liveJoinUrl)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-cyan-800 hover:text-cyan-900 bg-white border border-cyan-300 hover:border-cyan-400 rounded-lg p-2 transition-all break-all"
            >
              Copy student join link <Copy size={12}/>
            </button>
            <input aria-label="Selectable student join link" readOnly value={liveJoinUrl} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
            <div className={`mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 ${isProjectionMode ? 'hidden' : ''}`}>
              <button type="button" onClick={testStudentJoin} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-900 hover:border-emerald-500">
                Test as student <ExternalLink size={12}/>
              </button>
              <button type="button" onClick={printLiveQr} disabled={!liveQrSvg} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
                Print QR <Printer size={12}/>
              </button>
            </div>
            <p className="text-[11px] text-cyan-800 mt-2 text-center">{connectedStudentCount > 0 ? connectedStudentCount + ' student' + (connectedStudentCount === 1 ? '' : 's') + ' connected. ' : ''}{isMailboxSession ? 'Ready to scan. This QR uses the mailbox session secret, requires no Firebase sign-in, and expires when the teacher ends the session.' : 'Ready to scan. QR students join this live session with AI generation off; the link stops working when the session ends.'}</p>
          </div>
        )}
        {!liveJoinUrl && (
          <div className="mb-6 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider mb-1 text-center">{isLocalOnly ? 'Local preview only' : 'Student QR unavailable'}</p>
            <p className="text-xs text-amber-900 text-center">{isLocalOnly ? 'This code was not saved to Firebase, so students cannot join it. Reload, start a new live session, and share only when a QR appears.' : 'This host is not configured as a student join path. Use the class code, local network link, or a student app URL.'}</p>
          </div>
        )}
        {!isProjectionMode && lanJoinUrl && (
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
        {!isProjectionMode && !isMailboxSession && (
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
        {!isProjectionMode && sessionData && (
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
        {!isProjectionMode && sessionData && (
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
        <div className={`flex flex-col sm:flex-row gap-3 justify-center ${isProjectionMode ? 'hidden' : ''}`}>
          <button
            onClick={handleSetShowSessionModalToFalse}
            className="w-full sm:w-auto px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full transition-colors"
          >
            {t('session.action_close')}
          </button>
          <button
            onClick={() => {
              if (typeof onRequestEndSession === 'function') onRequestEndSession();
              else setConfirmDialog({ message: t('session.end_confirm') || 'Are you sure you want to end this session?', onConfirm: () => { setActiveSessionCode(null); setSessionData(null); setShowSessionModal(false); } });
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
