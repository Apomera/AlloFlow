/**
 * AlloFlow — Hints Modal Module
 *
 * Modal showing accumulated AI hints + a "Generate Lesson Ideas" CTA.
 * Each hint can be applied (yellow brainstorm hint) or saved to history
 * (purple extension idea).
 *
 * Extracted from AlloFlowANTI.txt lines 21632-21694 (May 2026).
 *
 * Required props:
 *   handleApplyHint                — apply a brainstorm hint
 *   handleGenerateLessonIdeas      — generate new extension ideas
 *   handleSaveExtensionToHistory   — save an extension hint to history
 *   handleSetShowHintsModalToFalse — close the modal
 *   hintHistory                    — array of hint objects
 *   history                        — generation history (used to gate the CTA)
 *   isGeneratingExtension          — bool for spinner state
 *   renderFormattedText            — markdown/format renderer
 *   t                              — translation function
 *
 * Icons (read from window globals): Lightbulb, RefreshCw, Save, Sparkles, X
 */
function HintsModal({
  handleApplyHint,
  handleGenerateLessonIdeas,
  handleSaveExtensionToHistory,
  handleSetShowHintsModalToFalse,
  hintHistory,
  history,
  isGeneratingExtension,
  renderFormattedText,
  t,
}) {
  const Lightbulb = window.Lightbulb || (() => null);
  const RefreshCw = window.RefreshCw || (() => null);
  const Save = window.Save || (() => null);
  const Sparkles = window.Sparkles || (() => null);
  const X = window.X || (() => null);
  const dialogRef = React.useRef(null);
  const hintStatus = isGeneratingExtension
    ? t('hints.synthesizing')
    : `${t('hints.title')}: ${hintHistory.length}`;

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
    (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); handleSetShowHintsModalToFalse(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const wasTopTrap = isTopTrap();
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [handleSetShowHintsModalToFalse]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none" onClick={handleSetShowHintsModalToFalse} role="presentation">
      <div ref={dialogRef} tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] overflow-hidden relative" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="hints-modal-title">
        <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex justify-between items-center shrink-0">
          <h3 id="hints-modal-title" className="font-bold text-lg text-yellow-800 flex items-center gap-2">
            <Lightbulb size={20} className="fill-yellow-500 text-yellow-600" aria-hidden="true"/> {t('hints.title')}
          </h3>
          <button type="button" onClick={handleSetShowHintsModalToFalse} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-full hover:bg-yellow-100 text-yellow-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600" aria-label={t?.('common.close') || 'Close'}><X size={20} aria-hidden="true"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" role="region" aria-label={t?.('hints.title') || 'Hints'} tabIndex={hintHistory.length > 0 ? 0 : undefined}>
          {hintHistory.length === 0 ? (
            <div className="text-center py-10 text-slate-600 italic">
              {t('hints.empty_state')}
            </div>
          ) : (
            <ul className="space-y-4">
              {hintHistory.map((hint) => (
                <li key={hint.id} className={`p-4 rounded-xl border-l-4 shadow-sm ${hint.isExtension ? 'bg-purple-50 border-purple-400' : 'bg-white border-yellow-400'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${hint.isExtension ? 'text-purple-700' : 'text-yellow-800'}`}>
                    {hint.tool}
                  </span>
                  <span className="text-[11px] text-slate-600">{new Date(hint.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line mb-3">
                  {renderFormattedText(hint.text, false)}
                </div>
                <div className="flex justify-end gap-2">
                  {hint.isExtension ? (
                    <button
                      type="button"
                      onClick={() => handleSaveExtensionToHistory(hint)}
                      className="min-h-11 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-600 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Save size={12} aria-hidden="true"/> {t('hints.save_to_history')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApplyHint(hint)}
                      className="min-h-11 text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-bold hover:bg-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600 transition-colors flex items-center gap-1"
                      title={t('hints.apply_brainstorm_tooltip')}
                    >
                      <Lightbulb size={12} aria-hidden="true"/> {t('hints.apply_brainstorm')}
                    </button>
                  )}
                </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={handleGenerateLessonIdeas}
            disabled={isGeneratingExtension || history.length === 0}
            aria-busy={isGeneratingExtension}
            className="w-full min-h-11 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
            data-help-key="hints_generate_extension"
          >
            {isGeneratingExtension ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Sparkles size={16} className="text-yellow-400 fill-current" aria-hidden="true"/>}
            {isGeneratingExtension ? t('hints.synthesizing') : t('hints.generate_extensions')}
          </button>
        </div>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{hintStatus}</div>
      </div>
    </div>
  );
}
