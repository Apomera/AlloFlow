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
  const dialogRef = React.useRef(null);
  const continueButtonRef = React.useRef(null);
  const closeHandlerRef = React.useRef(handleSetShowGlobalLevelUpToFalse);
  closeHandlerRef.current = handleSetShowGlobalLevelUpToFalse;
  const xpMax = Math.max(1, Number(adventureState.xpToNextLevel) || 1);
  const xpValue = Math.max(0, Math.min(xpMax, Number(adventureState.xp) || 0));
  const xpPercent = Math.max(0, Math.min(100, Math.round((xpValue / xpMax) * 100)));

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => {
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
      return !style || (style.display !== 'none' && style.visibility !== 'hidden');
    });
    (continueButtonRef.current || dialog).focus();

    const handleKeyDown = (event) => {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeHandlerRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const wasTopTrap = isTopTrap();
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, []);

  return (
    <div role="presentation" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-500 motion-reduce:animate-none" onClick={handleSetShowGlobalLevelUpToFalse}>
      <div aria-hidden="true" className="motion-reduce:hidden"><ConfettiExplosion /></div>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-level-up-title"
        aria-describedby="global-level-up-description"
        className="bg-white rounded-3xl p-5 sm:p-8 md:p-12 text-center shadow-2xl border-4 border-yellow-400 relative overflow-y-auto max-h-[calc(100vh-1rem)] max-w-sm w-full transform transition-all animate-in zoom-in-50 duration-500 motion-reduce:animate-none motion-reduce:transform-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div aria-hidden="true" className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(250,204,21,1)0%,rgba(255,255,255,0)70%)] animate-pulse motion-reduce:animate-none"></div>
        <div className="relative z-10">
          <div aria-hidden="true" className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-white relative">
            <Trophy size={48} className="text-indigo-900 fill-current animate-bounce motion-reduce:animate-none" />
            <div className="absolute -top-2 -right-2 bg-indigo-900 text-yellow-300 text-xs font-black px-2 py-1 rounded-full border-2 border-white transform rotate-12 motion-reduce:transform-none">
              {t('common.new_badge')}
            </div>
          </div>
          <h2 id="global-level-up-title" className="text-3xl sm:text-4xl font-black text-indigo-900 mb-2 uppercase tracking-tight drop-shadow-sm">{t('feedback.level_up_title')}</h2>
          <p id="global-level-up-description" className="text-indigo-800 font-bold text-lg mb-6">{t('feedback.level_reached', { level: adventureState.level })}</p>
          <div className="bg-indigo-50 rounded-xl p-4 mb-8 border border-indigo-200 shadow-inner">
            <div className="text-[11px] text-indigo-800 font-bold uppercase tracking-wider mb-1 flex justify-between gap-2">
              <span>{t('feedback.next_milestone')}</span>
              <span>{xpPercent}%</span>
            </div>
            <div
              className="w-full bg-indigo-200 rounded-full h-3 overflow-hidden border border-indigo-300"
              role="progressbar"
              aria-label={t('feedback.next_milestone')}
              aria-valuemin={0}
              aria-valuemax={xpMax}
              aria-valuenow={xpValue}
              aria-valuetext={`${xpValue} ${t('common.xp')} / ${xpMax} ${t('common.xp')}`}
            >
              <div
                aria-hidden="true"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000 ease-out motion-reduce:transition-none"
                style={{ width: `${xpPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] font-mono font-bold text-indigo-800 mt-1.5 gap-2">
              <span><AnimatedNumber value={xpValue} /> {t('common.xp')}</span>
              <span>{xpMax} {t('common.xp')}</span>
            </div>
          </div>
          <button
            ref={continueButtonRef}
            type="button"
            aria-label={t('feedback.continue_learning')}
            onClick={handleSetShowGlobalLevelUpToFalse}
            className="min-h-11 w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-700 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
          >
            {t('feedback.continue_learning')}
          </button>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {t('feedback.level_reached', { level: adventureState.level })}
          </div>
        </div>
      </div>
    </div>
  );
}