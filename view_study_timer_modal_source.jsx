/**
 * AlloFlow — Study Timer Modal Module
 *
 * Pomodoro-style study timer overlay. Custom duration + task label, start/pause,
 * confetti on completion, large clock display.
 *
 * Extracted from AlloFlowANTI.txt lines 23217-23348 (May 2026).
 * 132 lines, ~16 deps + 5 icons.
 */
function StudyTimerModal(props) {
  const noop = () => null;
  const _w = typeof window !== 'undefined' ? window : {};
  const Clock = _w.Clock || noop;
  const Pause = _w.Pause || noop;
  const Play = _w.Play || noop;
  const RefreshCw = _w.RefreshCw || noop;
  const X = _w.X || noop;
  const {
    ConfettiExplosion, customTimerMinutes, formatTime: rawFormatTime,
    handleSetShowStudyTimerModalToFalse, isStudyTimerRunning, setCustomTimerMinutes,
    setIsStudyTimerRunning, setStudyDuration, setStudyTaskLabel, setStudyTimeLeft,
    showTimerConfetti, studyDuration, studyTaskLabel, studyTimeLeft, studyTimerRef, t: rawT,
  } = props || {};
  const t = typeof rawT === 'function' ? rawT : (k => k);
  const formatTime = typeof rawFormatTime === 'function'
    ? rawFormatTime
    : ((secs) => {
        const s = Math.max(0, Math.floor(Number.isFinite(Number(secs)) ? Number(secs) : 0));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      });
  const safeClose = () => { if (typeof handleSetShowStudyTimerModalToFalse === 'function') handleSetShowStudyTimerModalToFalse(); };
  const safeSetDuration = (v) => { if (typeof setStudyDuration === 'function') setStudyDuration(v); };
  const safeSetTimeLeft = (v) => { if (typeof setStudyTimeLeft === 'function') setStudyTimeLeft(v); };
  const safeSetCustomMins = (v) => { if (typeof setCustomTimerMinutes === 'function') setCustomTimerMinutes(v); };
  const safeSetRunning = (v) => { if (typeof setIsStudyTimerRunning === 'function') setIsStudyTimerRunning(v); };
  const safeSetTaskLabel = (v) => { if (typeof setStudyTaskLabel === 'function') setStudyTaskLabel(v); };
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const backgroundState = [];
    const seenNodes = new Set();
    for (let branch = dialog; branch && branch !== document.body && branch.parentElement; branch = branch.parentElement) {
      Array.from(branch.parentElement.children).forEach((sibling) => {
        if (sibling === branch || seenNodes.has(sibling) || /^(?:SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName) || (typeof sibling.matches === 'function' && sibling.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]'))) return;
        seenNodes.add(sibling);
        backgroundState.push({
          node: sibling,
          hadInert: sibling.hasAttribute('inert'),
          ariaHidden: sibling.getAttribute('aria-hidden'),
        });
        sibling.setAttribute('inert', '');
        sibling.setAttribute('aria-hidden', 'true');
      });
    }
    // Shared scroll-lock counter: only the last dialog to close unlocks the page.
    const alloScrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
    const alloScrollLocked = !!document.body;
    if (alloScrollLocked && ++alloScrollLock.count === 1) { alloScrollLock.prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    const trap = { root: dialog };
    const trapStack = typeof window !== 'undefined' ? (window.__alloFocusTrapStack = window.__alloFocusTrapStack || []) : null;
    if (trapStack) trapStack.push(trap);
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => {
        if (!el || el.hidden || el.getAttribute('aria-hidden') === 'true' || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        const closedDetails = el.closest('details:not([open])');
        if (closedDetails && !(el.tagName === 'SUMMARY' && el.parentElement === closedDetails)) return false;
        if (typeof window.getComputedStyle === 'function') {
          for (let cur = el; cur && cur !== dialog; cur = cur.parentElement) {
            const style = window.getComputedStyle(cur);
            if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
          }
        }
        return true;
      });
    (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (!dialog.isConnected || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      const topTrap = trapStack && trapStack[trapStack.length - 1];
      if (topTrap && topTrap !== trap && !(topTrap.root && typeof topTrap.root.contains === 'function' && topTrap.root.contains(dialog))) return;
      if (event.key === 'Escape') { if (event.ctrlKey || event.metaKey || event.altKey) return; event.preventDefault(); event.stopPropagation(); safeClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (alloScrollLocked) { alloScrollLock.count = Math.max(0, alloScrollLock.count - 1); if (alloScrollLock.count === 0 && document.body) document.body.style.overflow = alloScrollLock.prev; }
      backgroundState.forEach(({ node, hadInert, ariaHidden }) => {
        if (!node || !node.isConnected) return;
        if (!hadInert) node.removeAttribute('inert');
        if (ariaHidden == null) node.removeAttribute('aria-hidden');
        else if (ariaHidden !== 'true') node.setAttribute('aria-hidden', ariaHidden);
      });
      // The app shell also wraps this dialog in the host focus trap, and that
      // entry sits above this one on the shared stack. It is this same dialog,
      // not another one, so it must not stop focus going back to the opener.
      let wasTop = true;
      for (let i = trapStack ? trapStack.length - 1 : -1; i >= 0 && trapStack[i] !== trap; i--) {
        const other = trapStack[i] && trapStack[i].root;
        if (!other || !(other === dialog || (typeof other.contains === 'function' && (other.contains(dialog) || dialog.contains(other))))) { wasTop = false; break; }
      }
      if (trapStack) {
        const idx = trapStack.lastIndexOf(trap);
        if (idx >= 0) trapStack.splice(idx, 1);
      }
      if (wasTop && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [handleSetShowStudyTimerModalToFalse]);

  const safeDuration = Number.isFinite(Number(studyDuration)) ? Math.max(0, Number(studyDuration)) : 0;
  const safeTimeLeft = Number.isFinite(Number(studyTimeLeft)) ? Math.max(0, Number(studyTimeLeft)) : 0;
  const completionPercent = safeDuration > 0
    ? Math.max(0, Math.min(100, Math.round(((safeDuration - safeTimeLeft) / safeDuration) * 100)))
    : 0;
  const clockLabel = `${t('timer.title')}: ${formatTime(safeTimeLeft)}`;
  const completionLabel = `${completionPercent}% · ${t('common.progress')}`;
  const timerTx = (key, fallback) => { const v = typeof t === 'function' ? t(key) : ''; return v && v !== key ? v : fallback; };
  const [timerStatus, setTimerStatus] = React.useState('');
  const prevTimerRef = React.useRef({ running: !!isStudyTimerRunning, timeLeft: safeTimeLeft });
  const extendTimerByMinutes = (mins) => {
    const added = mins * 60;
    const nextLeft = Math.max(0, safeTimeLeft) + added;
    const nextDuration = Math.max(nextLeft, safeDuration + added);
    safeSetDuration(nextDuration);
    safeSetTimeLeft(nextLeft);
    setTimerStatus(`${t('timer.title')}: +${mins}m — ${formatTime(nextLeft)}`);
  };

  React.useEffect(() => {
    const prev = prevTimerRef.current;
    const running = !!isStudyTimerRunning;
    if (!prev.running && running) {
      setTimerStatus(`${t('timer.title')}: ${t('timer.start')} — ${formatTime(safeTimeLeft)}`);
    } else if (prev.running && !running && safeTimeLeft > 0) {
      setTimerStatus(`${t('timer.title')}: ${t('timer.pause')} — ${formatTime(safeTimeLeft)}`);
    } else if (prev.timeLeft > 0 && safeTimeLeft === 0 && safeDuration > 0) {
      setTimerStatus(`${t('timer.title')}: ${formatTime(0)}`);
    } else if (running && prev.timeLeft !== safeTimeLeft && (safeTimeLeft === 300 || safeTimeLeft === 60)) {
      setTimerStatus(`${t('timer.title')}: ${formatTime(safeTimeLeft)}`);
    }
    prevTimerRef.current = { running, timeLeft: safeTimeLeft };
  }, [isStudyTimerRunning, safeTimeLeft, safeDuration, formatTime, t]);

  const applyCustomMinutes = () => {
    if (isStudyTimerRunning) return;
    const parsed = parseInt(customTimerMinutes, 10);
    if (!Number.isFinite(parsed)) return;
    const mins = Math.max(1, Math.min(180, parsed));
    safeSetCustomMins(String(mins));
    safeSetDuration(mins * 60);
    safeSetTimeLeft(mins * 60);
    safeSetRunning(true);
    setTimerStatus(`${t('timer.title')}: ${t('timer.start')} — ${formatTime(mins * 60)}`);
  };

  return (
        <div
            ref={studyTimerRef}
            role="presentation"
            className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 motion-reduce:animate-none"
            onClick={safeClose}
        >
            {showTimerConfetti && typeof ConfettiExplosion === 'function' && <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center motion-reduce:hidden" aria-hidden="true"><ConfettiExplosion /></div>}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="allo-docsuite bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative border-4 border-indigo-100 transition-all animate-in zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none"
                role="dialog" aria-modal="true" aria-labelledby="study-timer-title" onClick={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    aria-label={t('common.close_study_timer')}
                    data-help-key="timer_close_btn"
                    onClick={safeClose}
                    className="absolute top-4 right-4 min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-full text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors motion-reduce:transition-none"
                >
                    <X size={20} aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2 mb-6 text-indigo-900">
                    <div className="bg-indigo-100 p-2 rounded-full"><Clock size={20} className="text-indigo-600" aria-hidden="true"/></div>
                    <h3 id="study-timer-title" className="font-black text-lg">{t('timer.title')}</h3>
                </div>
                <div className="mb-6">
                    <label htmlFor="study-timer-task" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('timer.label_task')}</label>
                    <input id="study-timer-task"
                        data-help-key="timer_task_input"
                        type="text"
                        maxLength={120}
                        value={studyTaskLabel ?? ''}
                        onChange={(e) => safeSetTaskLabel(e.target.value)}
                        disabled={isStudyTimerRunning}
                        placeholder={t('timer.placeholder')}
                        className="w-full text-sm p-3 border-2 border-indigo-600 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-1 transition-all font-medium text-slate-700 bg-slate-50 focus:bg-white"
                    />
                    {!isStudyTimerRunning && !String(studyTaskLabel || '').trim() && (
                        <div data-timer-task-presets role="group" aria-label={timerTx('timer.quick_tasks_aria', 'Quick focus goals')} className="mt-2 flex flex-wrap gap-1.5">
                            {[
                                timerTx('timer.preset_reading', 'Reading'),
                                timerTx('timer.preset_notes', 'Notes'),
                                timerTx('timer.preset_practice', 'Practice'),
                                timerTx('timer.preset_writing', 'Writing'),
                            ].map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    data-timer-task-preset={idx}
                                    onClick={() => safeSetTaskLabel(preset)}
                                    className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-2 mb-4 justify-center flex-wrap">
                    {[5, 15, 25, 45].map(min => (
                        <button
                            type="button"
                            data-help-key="timer_duration_btn"
                            key={min}
                            disabled={isStudyTimerRunning}
                            aria-pressed={studyDuration === min * 60 && !customTimerMinutes}
                            onClick={() => {
                                safeSetDuration(min * 60);
                                safeSetTimeLeft(min * 60);
                                safeSetCustomMins('');
                                safeSetRunning(false);
                                setTimerStatus(`${t('timer.title')}: ${min}m`);
                            }}
                            className="min-h-11 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
                        >
                            {min}m
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 mb-4 justify-center">
                    <input aria-label={t('common.enter_custom_timer_minutes')}
                        type="number"
                        min="1"
                        max="180"
                        value={customTimerMinutes ?? ''}
                        onChange={(e) => safeSetCustomMins(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || e.nativeEvent?.keyCode === 229) return;
                            if (e.key !== 'Enter' || isStudyTimerRunning || !customTimerMinutes) return;
                            e.preventDefault();
                            applyCustomMinutes();
                        }}
                        placeholder={t('common.placeholder_custom_min')}
                        disabled={isStudyTimerRunning}
                        className="w-24 min-h-11 p-2 text-xs border border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-1 text-center font-bold text-slate-700"
                    />
                    <button
                        type="button"
                        onClick={applyCustomMinutes}
                        disabled={!customTimerMinutes || isStudyTimerRunning}
                        className="min-h-11 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
                    >
                        {t('timer.set_btn') || 'Set'}
                    </button>
                </div>
                <div className="text-center mb-6 relative">
                    <div className="text-5xl font-black text-slate-700 font-mono tracking-wider" role="timer" aria-live="off" aria-label={clockLabel}>
                        {formatTime(safeTimeLeft)}
                    </div>
                    {safeDuration > 0 && (
                        <div className="mt-3 mx-auto max-w-[200px]">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden" role="progressbar" aria-label={t('common.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent} aria-valuetext={completionLabel}>
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-linear motion-reduce:transition-none"
                                    style={{ width: `${completionPercent}%` }}
                                />
                            </div>
                            <div className="text-[11px] text-slate-600 mt-1 font-medium">
                                {completionLabel}
                            </div>
                        </div>
                    )}
                    {safeDuration > 0 && safeTimeLeft > 0 && (
                        <div data-timer-extend-controls className="mt-3 flex items-center justify-center gap-2">
                            {[1, 5].map(mins => (
                                <button
                                    key={mins}
                                    type="button"
                                    data-timer-extend={mins}
                                    onClick={() => extendTimerByMinutes(mins)}
                                    aria-label={timerTx('timer.add_minutes_aria', 'Add {count} minutes').replace('{count}', String(mins))}
                                    className="min-h-11 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
                                >
                                    +{mins}m
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        aria-label={isStudyTimerRunning ? t('timer.pause') : t('timer.start')}
                        onClick={() => {
                            if (isStudyTimerRunning) {
                                safeSetRunning(false);
                            } else {
                                if (safeTimeLeft === 0) {
                                    safeSetTimeLeft(25 * 60);
                                    safeSetDuration(25 * 60);
                                }
                                safeSetRunning(true);
                            }
                        }}
                        className={`flex-1 py-3 rounded-xl font-black text-white shadow-lg transition-all transform active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 ${isStudyTimerRunning ? 'bg-amber-700 hover:bg-amber-800' : 'bg-green-700 hover:bg-green-800'}`}
                    >
                        {isStudyTimerRunning ? <Pause size={20} className="fill-current" aria-hidden="true"/> : <Play size={20} className="fill-current" aria-hidden="true"/>}
                        {isStudyTimerRunning ? t('timer.pause') : t('timer.start')}
                    </button>
                    <button
                        type="button"
                        aria-label={t('timer.reset')}
                        data-help-key="timer_reset_btn"
                        onClick={() => {
                            safeSetRunning(false);
                            safeSetTimeLeft(0);
                            safeSetDuration(0);
                            safeSetCustomMins('');
                            setTimerStatus(`${t('timer.title')}: ${t('timer.reset')}`);
                        }}
                        className="px-4 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-red-700 rounded-xl font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
                        title={t('timer.reset')}
                    >
                        <RefreshCw size={20} aria-hidden="true"/>
                    </button>
                </div>
                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{timerStatus}</div>
            </div>
        </div>
  );
}
