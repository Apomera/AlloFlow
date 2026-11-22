/**
 * AlloFlow — Hints Modal Module
 *
 * Modal showing accumulated AI hints + a "Generate Lesson Ideas" CTA.
 * Each hint can be applied (yellow brainstorm hint) or saved to history
 * (purple extension idea).
 *
 * Extracted from AlloFlowANTI.txt lines 21632-21694 (May 2026).
 *
 * D4 (2026-08-16): this modal is now the ONE place AlloFlow keeps what it has told
 * you. A second tab replays the toast log. Toasts auto-dismiss on a reading-length
 * timer and several of them carry information that matters (a save failed, a format
 * was unavailable, an export landed) — a slower reader lost them permanently. Rather
 * than build a parallel notification centre, the toast log rides the mechanism that
 * already existed for the "did you know" hint history.
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
 * Optional props:
 *   toastHistory                   — array of { id, message, type, timestamp }
 *   onClearToastHistory            — clears the toast log
 *   initialTab                     — 'hints' | 'messages' (defaults to 'hints')
 *
 * Icons (read from window globals): Lightbulb, RefreshCw, Save, Sparkles, X
 */
function _hintsAiDoor(t) {
  try {
    if (typeof window !== 'undefined' && typeof window.__alloAiSetupDoorway === 'function') {
      return window.__alloAiSetupDoorway('text', t);
    }
  } catch (_) {}
  return { disabled: false };
}

function formatHintTime(timestamp) {
  if (!timestamp) return '';
  try {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

function HintsModal({
  handleApplyHint,
  handleGenerateLessonIdeas,
  handleSaveExtensionToHistory,
  handleSetShowHintsModalToFalse,
  hintHistory: rawHintHistory,
  history: rawHistory,
  isGeneratingExtension,
  renderFormattedText,
  t,
  toastHistory,
  onClearToastHistory,
  initialTab,
}) {
  const Lightbulb = window.Lightbulb || (() => null);
  const RefreshCw = window.RefreshCw || (() => null);
  const Save = window.Save || (() => null);
  const Sparkles = window.Sparkles || (() => null);
  const X = window.X || (() => null);
  const hintsAiDoor = _hintsAiDoor(t);
  const hintsAiOff = !!(hintsAiDoor && (hintsAiDoor.disabled || hintsAiDoor.available === false));
  const hintsAiTitle = hintsAiOff ? (hintsAiDoor.title || (typeof t === 'function' && t('ai.setup_required')) || 'Set up AI to use this feature') : undefined;
  const dialogRef = React.useRef(null);
  const hintHistory = Array.isArray(rawHintHistory) ? rawHintHistory : [];
  const history = Array.isArray(rawHistory) ? rawHistory : [];
  const messages = Array.isArray(toastHistory) ? toastHistory : [];
  const [tab, setTab] = React.useState(initialTab === 'messages' && messages.length ? 'messages' : 'hints');
  const hintStatus = isGeneratingExtension
    ? t('hints.synthesizing')
    : `${t('hints.title')}: ${hintHistory.length}`;
  const ideasLabel = (t('hints.tab_ideas') || 'Ideas') + (hintHistory.length ? ` (${hintHistory.length})` : '');
  const messagesLabel = (t('hints.tab_messages') || 'Messages') + (messages.length ? ` (${messages.length})` : '');
  const extensionCount = hintHistory.filter((h) => h && h.isExtension).length;
  const brainstormCount = hintHistory.length - extensionCount;
  const messageKindCounts = ['error', 'warning', 'success', 'info']
    .map((kind) => ({
      kind,
      count: messages.filter((entry) => (entry && entry.type ? entry.type : 'info') === kind).length,
    }))
    .filter((item) => item.count > 0);
  const tabButtonStyle = (id) => `min-h-11 rounded-lg px-3 py-2 text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600 ${tab === id ? 'bg-yellow-700 text-white' : 'bg-white text-yellow-800 border border-yellow-200 hover:bg-yellow-100'}`;

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
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => {
      if (element.hidden || element.getAttribute('aria-hidden') === 'true' || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const closedDetails = element.closest('details:not([open])');
      if (closedDetails && !(element.tagName === 'SUMMARY' && element.parentElement === closedDetails)) return false;
      if (typeof window.getComputedStyle === 'function') {
        for (let cur = element; cur && cur !== dialog; cur = cur.parentElement) {
          const style = window.getComputedStyle(cur);
          if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
        }
      }
      return true;
    });
    (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (!dialog.isConnected || event.isComposing || event.keyCode === 229 || !isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); handleSetShowHintsModalToFalse(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
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
      let wasTopTrap = true;
      for (let i = trapStack.length - 1; i >= 0 && trapStack[i] !== trap; i--) {
        const other = trapStack[i] && trapStack[i].root;
        if (!other || !(other === dialog || (typeof other.contains === 'function' && (other.contains(dialog) || dialog.contains(other))))) { wasTopTrap = false; break; }
      }
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [handleSetShowHintsModalToFalse]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[260] flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none" onClick={handleSetShowHintsModalToFalse} role="presentation">
      <div ref={dialogRef} tabIndex={-1} className="allo-docsuite bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] overflow-hidden relative" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="hints-modal-title">
        <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex justify-between items-center shrink-0">
          <h3 id="hints-modal-title" className="font-bold text-lg text-yellow-800 flex items-center gap-2">
            <Lightbulb size={20} className="fill-yellow-500 text-yellow-600" aria-hidden="true"/> {t('hints.title')}
          </h3>
          <button type="button" onClick={handleSetShowHintsModalToFalse} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-full hover:bg-yellow-100 text-yellow-700 transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600" aria-label={t?.('common.close') || 'Close'}><X size={20} aria-hidden="true"/></button>
        </div>
        {/* D4: hints and replayed toasts share one door. Two plain buttons, not a
            tab widget, so the arrow-key semantics of a real tablist are not implied. */}
        <div role="group" aria-label={t('hints.sections_aria') || 'What AlloFlow has told you'} className="flex shrink-0 gap-2 border-b border-yellow-100 bg-yellow-50/60 px-4 py-2">
          <button type="button" aria-pressed={tab === 'hints'} onClick={() => setTab('hints')} className={tabButtonStyle('hints')}>{ideasLabel}</button>
          <button type="button" aria-pressed={tab === 'messages'} onClick={() => setTab('messages')} className={tabButtonStyle('messages')}>{messagesLabel}</button>
        </div>
        {tab === 'messages' ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" role="region" aria-label={t('hints.tab_messages') || 'Messages'} tabIndex={messages.length > 0 ? 0 : undefined}>
              <p className="mb-3 text-xs leading-relaxed text-slate-600">{t('hints.messages_intro') || 'Every notice AlloFlow showed you this session, newest first. Notices disappear on their own so they do not sit on top of your work; they are kept here so you can read them again.'}</p>
              {messageKindCounts.length > 0 && (
                <div data-testid="hints-messages-summary" className="mb-4 flex flex-wrap gap-1.5">
                  {messageKindCounts.map(({ kind, count }) => (
                    <span key={kind} className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                      kind === 'error' ? 'border-red-300 bg-red-50 text-red-800' :
                      kind === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-900' :
                      kind === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' :
                      'border-indigo-300 bg-indigo-50 text-indigo-800'}`}>
                      {count} {t('hints.message_kind_' + kind) || kind}
                    </span>
                  ))}
                </div>
              )}
              {messages.length === 0 ? (
                <div className="py-10 text-center italic text-slate-600">{t('hints.messages_empty') || 'No notices yet.'}</div>
              ) : (
                <ul className="space-y-3">
                  {messages.slice().reverse().map((entry) => (
                    <li key={entry.id} className={`rounded-xl border-l-4 p-3 shadow-sm ${
                      entry.type === 'error' ? 'border-red-400 bg-red-50' :
                      entry.type === 'warning' ? 'border-amber-400 bg-amber-50' :
                      entry.type === 'success' ? 'border-emerald-400 bg-emerald-50' :
                      'border-indigo-400 bg-indigo-50'}`}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {t('hints.message_kind_' + (entry.type || 'info')) || (entry.type || 'info')}
                        </span>
                        {(() => {
                          const entryTime = formatHintTime(entry.timestamp);
                          return entryTime ? <span className="shrink-0 text-xs text-slate-600">{entryTime}</span> : null;
                        })()}
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-800">{entry.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-4">
              <button
                type="button"
                onClick={onClearToastHistory}
                disabled={!messages.length || typeof onClearToastHistory !== 'function'}
                className="min-h-11 w-full rounded-xl border-2 border-slate-300 py-3 font-bold text-slate-700 transition-colors motion-reduce:transition-none hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('hints.messages_clear') || 'Clear this list'}
              </button>
            </div>
          </>
        ) : (<>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" role="region" aria-label={t?.('hints.title') || 'Hints'} tabIndex={hintHistory.length > 0 ? 0 : undefined}>
          {hintHistory.length > 0 && (
            <div data-testid="hints-ideas-summary" className="mb-4 flex flex-wrap gap-1.5">
              {brainstormCount > 0 && (
                <span className="rounded-full border border-yellow-300 bg-yellow-50 px-2.5 py-0.5 text-xs font-bold text-yellow-900">
                  {brainstormCount} {brainstormCount === 1 ? 'brainstorm hint' : 'brainstorm hints'}
                </span>
              )}
              {extensionCount > 0 && (
                <span className="rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-900">
                  {extensionCount} {extensionCount === 1 ? 'extension idea' : 'extension ideas'}
                </span>
              )}
            </div>
          )}
          {hintHistory.length === 0 ? (
            <div className="text-center py-10 text-slate-600 italic">
              {t('hints.empty_state')}
            </div>
          ) : (
            <ul className="space-y-4">
              {hintHistory.map((hint) => (
                <li key={hint.id} className={`p-4 rounded-xl border-l-4 shadow-sm ${hint.isExtension ? 'bg-purple-50 border-purple-400' : 'bg-white border-yellow-400'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${hint.isExtension ? 'text-purple-700' : 'text-yellow-800'}`}>
                    {hint.tool}
                  </span>
                  {(() => {
                    const hintTime = formatHintTime(hint.timestamp);
                    return hintTime ? <span className="text-xs text-slate-600">{hintTime}</span> : null;
                  })()}
                </div>
                <div className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line mb-3">
                  {renderFormattedText(hint.text, false)}
                </div>
                <div className="flex justify-end gap-2">
                  {hint.isExtension ? (
                    <button
                      type="button"
                      onClick={() => handleSaveExtensionToHistory(hint)}
                      className="min-h-11 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-600 transition-colors motion-reduce:transition-none flex items-center gap-1 shadow-sm"
                    >
                      <Save size={12} aria-hidden="true"/> {t('hints.save_to_history')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApplyHint(hint)}
                      className="min-h-11 text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-bold hover:bg-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600 transition-colors motion-reduce:transition-none flex items-center gap-1"
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
            disabled={isGeneratingExtension || history.length === 0 || hintsAiOff}
            aria-busy={isGeneratingExtension}
            aria-describedby={(hintsAiOff || history.length === 0) ? 'hints-generate-disabled-reason' : undefined}
            title={hintsAiTitle}
            className="w-full min-h-11 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-reduce:transition-none shadow-md flex items-center justify-center gap-2"
            data-help-key="hints_generate_extension"
          >
            {isGeneratingExtension ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Sparkles size={16} className="text-yellow-400 fill-current" aria-hidden="true"/>}
            {isGeneratingExtension ? t('hints.synthesizing') : t('hints.generate_extensions')}
          </button>
          {(hintsAiOff || history.length === 0) && (
            <p id="hints-generate-disabled-reason" className="mt-2 text-center text-xs font-medium text-slate-600">
              {hintsAiOff
                ? (hintsAiTitle || t?.('hints.ai_unavailable') || 'AI lesson ideas are unavailable right now. Connect an AI provider to generate new ideas.')
                : (t?.('hints.need_history_reason') || 'Create or open a lesson resource first to generate extension ideas.')}
            </p>
          )}
        </div>
        </>)}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{hintStatus}</div>
      </div>
    </div>
  );
}
