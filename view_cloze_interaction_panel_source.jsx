/**
 * AlloFlow — Cloze Interaction Panel Module
 *
 * Word bank panel shown when student is in cloze (fill-in-the-blank) mode
 * with glossary available. Floating draggable bank of vocabulary words.
 *
 * Extracted from AlloFlowANTI.txt lines 22306-22370 (May 2026).
 * 65 lines, 14 deps.
 *
 * Icons (from window globals): Globe, RefreshCw, X
 */
function ClozeInteractionPanel(props) {
  const noop = () => null;
  const _w = typeof window !== 'undefined' ? window : {};
  const Globe = _w.Globe || noop;
  const RefreshCw = _w.RefreshCw || noop;
  const X = _w.X || noop;
  const {
    activeView, handleBankMouseDown, handleSetInteractionModeToRead,
    interactionMode, latestGlossary, leveledTextLanguage, playSound, activityScope,
    setClozeCompletedSet, setClozeInstanceSet, t: rawT, wordBankPosition, wordBankRef, completedBlankCount,
  } = props || {};
  const t = typeof rawT === 'function' ? rawT : (k => k);
  const tx = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return typeof value === 'string' && value.trim() && value !== key ? value : fallback; };
  const isGlobalMuted = () => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.__alloMuted === true || window._alloGlobalMute === true || window._alloGlobalMuted === true) return true;
      if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return true;
    } catch (_) {}
    return false;
  };
  const spokeViaSynthRef = React.useRef(false);
  const bionicOn = (typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function') ? window.__alloUseBionic() : false;
  const bt = s => (bionicOn && typeof s === 'string' && typeof window !== 'undefined' && typeof window.__alloBionicReact === 'function') ? window.__alloBionicReact(s) : s;
  const controlSize = { minHeight: 44, minWidth: 44 };
  const resetButtonRef = React.useRef(null);
  const bankHeadingRef = React.useRef(null);
  const resetFocusRef = React.useRef(null);
  const panelId = React.useId();
  const [resetPrompt, setResetPrompt] = React.useState(null);
  const [resetStatus, setResetStatus] = React.useState('');
  const [dockTop, setDockTop] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  React.useEffect(() => {
    if (wordBankPosition) setDockTop(false);
  }, [wordBankPosition]);
  const hasCompletedAnswers = !Number.isInteger(completedBlankCount) || completedBlankCount > 0;
  const isEnglishPassage = !leveledTextLanguage || leveledTextLanguage === 'English';
  // Kept local: it is a per-student display preference, not lesson content, so
  // it does not belong in the host's state or in the saved resource.
  // Defaults to the passage's own language — that is the text the student is
  // reading, and English is one tap away.
  const [bankLang, setBankLang] = React.useState('target');
  // Tap path (WCAG 2.5.7): tap a chip to pick it up, then tap a blank. The
  // blanks (ClozeInput, misc_components) read window.__alloClozeBankPick and
  // the 'allo-cloze-bank-pick' event; a blank sends detail null once placed.
  const safeGlossary = Array.isArray(latestGlossary) ? latestGlossary.filter(item => item && typeof item === 'object') : [];
  const bankEntries = safeGlossary.map((item) => {
      const englishTerm = item?.term || '';
      // A translation is usable even without the "term: definition"
      // shape — the old code only split on ':' and otherwise fell
      // back to English, which is why the bank so often looked
      // English-only even for a translated passage.
      let translatedTerm = '';
      if (!isEnglishPassage && item.translations && typeof item.translations === 'object' && Object.prototype.hasOwnProperty.call(item.translations, leveledTextLanguage)) {
          const rawVal = item.translations[leveledTextLanguage];
          const transString = typeof rawVal === 'string'
              ? rawVal
              : (rawVal && typeof rawVal === 'object' && typeof rawVal.term === 'string' ? rawVal.term : '');
          if (transString) {
              translatedTerm = /[:：]/.test(transString)
                  ? transString.split(/[:：]/)[0].trim()
                  : transString.trim();
          }
      }
      // What the chip shows. What it CARRIES on drop is always the
      // target-language word when one exists, so the solved sentence
      // reads in the passage's language.
      const showTranslated = translatedTerm && bankLang !== 'english';
      const dragPayload = translatedTerm || englishTerm;
      const label = !translatedTerm ? englishTerm
        : bankLang === 'both' ? `${translatedTerm} / ${englishTerm}`
        : showTranslated ? translatedTerm
        : englishTerm;
      const payload = bankLang === 'english' ? englishTerm : dragPayload;
      return { label, payload };
  });
  const contentScope = JSON.stringify([leveledTextLanguage || 'English', bankLang, bankEntries.map(({ label, payload }) => [label, payload])]);
  const resetScope = JSON.stringify([activityScope, contentScope]);
  const resetOpen = resetPrompt === resetScope;
  const [picked, setPicked] = React.useState(null);
  const [bankFilter, setBankFilter] = React.useState('');
  const pickedIdx = picked && picked.activityScope === activityScope && picked.contentScope === contentScope ? picked.idx : null;
  const pickedEntry = pickedIdx !== null && bankEntries[pickedIdx] ? bankEntries[pickedIdx] : null;
  const bankQuery = String(bankFilter || '').trim().toLowerCase();
  const visibleBankEntries = bankEntries
      .map((entry, idx) => ({ ...entry, idx }))
      .filter(({ label, payload }) => !bankQuery || String(label || '').toLowerCase().includes(bankQuery) || String(payload || '').toLowerCase().includes(bankQuery));
  const canSpeakBankWord = Boolean(
      typeof window !== 'undefined' && (
          (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') ||
          (window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function')
      )
  );
  const speakBankWord = (word) => {
      if (isGlobalMuted()) return;
      const clean = String(word || '').trim();
      if (!clean) return;
      const targetLang = bankLang === 'english' ? 'English' : (leveledTextLanguage || 'English');
      try {
          if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
              Promise.resolve(window.AlloSpeechPlayer.speak(clean, { language: targetLang })).catch(() => {});
              return;
          }
          if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
              window.speechSynthesis.cancel();
              const utter = new window.SpeechSynthesisUtterance(clean);
              if (typeof window.languageToTTSCode === 'function') {
                  try { const code = window.languageToTTSCode(targetLang); if (code) utter.lang = code; } catch (_) {}
              }
              spokeViaSynthRef.current = true;
              utter.onend = () => { spokeViaSynthRef.current = false; };
              utter.onerror = () => { spokeViaSynthRef.current = false; };
              window.speechSynthesis.speak(utter);
          }
      } catch (_) { spokeViaSynthRef.current = false; }
  };
  const sendPick = (word) => {
      if (typeof window === 'undefined') return;
      window.__alloClozeBankPick = word || null;
      try { window.dispatchEvent(new CustomEvent('allo-cloze-bank-pick', { detail: word || null })); } catch (_) {}
  };
  const pickChip = (idx, word) => {
      const next = pickedIdx === idx ? null : idx;
      setPicked(next === null ? null : { idx: next, activityScope, contentScope });
      sendPick(next === null ? null : word);
      if (next !== null && typeof playSound === 'function' && !isGlobalMuted()) playSound('click');
  };
  const closeReset = (event, confirmed) => {
      if (confirmed && (!resetOpen || !hasCompletedAnswers)) return;
      resetFocusRef.current = { from: event.currentTarget, scope: resetScope, cleared: confirmed };
      setResetPrompt(null);
      if (confirmed) {
          if (typeof setClozeCompletedSet === 'function') setClozeCompletedSet(new Set());
          if (typeof setClozeInstanceSet === 'function') setClozeInstanceSet(new Set());
          setPicked(null);
          sendPick(null);
          setResetStatus(tx('simplified.cloze_reset_done', 'Completed answers cleared.'));
          if (typeof playSound === 'function' && !isGlobalMuted()) playSound('click');
      }
  };
  React.useLayoutEffect(() => {
      if (typeof document === 'undefined') return;
      const pending = resetFocusRef.current;
      resetFocusRef.current = null;
      if (!pending || pending.scope !== resetScope) return;
      const active = document.activeElement;
      if (active !== document.body && active !== pending.from && !(pending.from && typeof pending.from.contains === 'function' && pending.from.contains(active))) return;
      const target = pending.cleared ? bankHeadingRef.current : resetButtonRef.current;
      if (target && target.isConnected && !target.disabled) target.focus();
  });
  React.useEffect(() => {
      if (typeof window === 'undefined') return undefined;
      const onPick = (e) => { if (!e.detail) setPicked(null); };
      window.addEventListener('allo-cloze-bank-pick', onPick);
      return () => {
          window.removeEventListener('allo-cloze-bank-pick', onPick);
          sendPick(null);
          if (spokeViaSynthRef.current && window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
              try { window.speechSynthesis.cancel(); } catch (_) {}
              spokeViaSynthRef.current = false;
          }
      };
  }, []);
  // Clear old payloads for a new passage or a changed word bank, not equivalent rerenders.
  React.useEffect(() => { setPicked(null); sendPick(null); setResetPrompt(null); setResetStatus(''); setBankFilter(''); resetFocusRef.current = null; }, [activityScope, contentScope]);
  const safeBankPos = (() => {
      if (!wordBankPosition || typeof wordBankPosition !== 'object') return null;
      const rawX = Number(wordBankPosition.x);
      const rawY = Number(wordBankPosition.y);
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null;
      const vw = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1024;
      const vh = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 768;
      return {
          x: Math.max(8, Math.min(Math.max(8, vw - 160), rawX)),
          y: Math.max(8, Math.min(Math.max(8, vh - 80), rawY)),
      };
  })();
  return (
              <div
                  ref={wordBankRef}
                  role="region"
                  aria-label={tx('simplified.word_bank', 'Word Bank')}
                  style={dockTop ? {
                      position: 'fixed',
                      left: '50%',
                      top: '16px',
                      bottom: 'auto',
                      transform: 'translateX(-50%)'
                  } : (safeBankPos ? {
                      position: 'fixed',
                      left: safeBankPos.x,
                      top: safeBankPos.y,
                      bottom: 'auto',
                      transform: 'none'
                  } : {})}
                  className={`z-40 w-[90%] max-w-3xl bg-blue-50/95 backdrop-blur-md p-4 rounded-xl border-2 border-blue-300 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] animate-in fade-in motion-reduce:animate-none duration-300 ${!safeBankPos && !dockTop ? 'absolute bottom-28 left-1/2 -translate-x-1/2 slide-in-from-bottom-10' : ''}`}
              >
                  <div
                      onMouseDown={handleBankMouseDown}
                      className="flex flex-wrap gap-2 justify-between items-center mb-2 border-b border-blue-200/50 pb-2 cursor-move select-none"
                  >
                      <div className="flex flex-wrap items-center gap-2 pointer-events-none">
                        <h4 ref={bankHeadingRef} tabIndex={-1} className="font-bold text-blue-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Globe size={16} aria-hidden="true" /> {t('simplified.word_bank')}
                        </h4>
                        {Number.isInteger(completedBlankCount) && completedBlankCount > 0 && (
                          <span data-cloze-progress-pill className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <span aria-hidden="true">✓</span> {tx('simplified.cloze_solved_count', '{count} solved').replace('{count}', String(completedBlankCount))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                        <button type="button" style={controlSize}
                            data-cloze-dock-toggle="true"
                            aria-pressed={dockTop}
                            onClick={() => setDockTop(prev => !prev)}
                            className="text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            aria-label={dockTop ? (t('simplified.dock_bottom') || 'Move word bank to bottom') : (t('simplified.dock_top') || 'Move word bank to top')}
                            title={dockTop ? (t('simplified.dock_bottom') || 'Move word bank to bottom') : (t('simplified.dock_top') || 'Move word bank to top')}
                        >
                            <span aria-hidden="true">{dockTop ? '⬇' : '⬆'}</span>
                        </button>
                        <button type="button" style={controlSize}
                            data-cloze-minimize-toggle="true"
                            aria-expanded={!isMinimized}
                            onClick={() => setIsMinimized(prev => !prev)}
                            className="text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            aria-label={isMinimized ? (t('simplified.expand_word_bank') || 'Expand word bank') : (t('simplified.minimize_word_bank') || 'Minimize word bank')}
                            title={isMinimized ? (t('simplified.expand_word_bank') || 'Expand word bank') : (t('simplified.minimize_word_bank') || 'Minimize word bank')}
                        >
                            <span aria-hidden="true">{isMinimized ? '+' : '−'}</span>
                        </button>
                        <button type="button" style={controlSize} ref={resetButtonRef}
                            data-cloze-reset disabled={!hasCompletedAnswers}
                            aria-expanded={resetOpen} aria-controls={panelId + '-reset'}
                            onClick={() => { setResetStatus(''); setResetPrompt(resetScope); }}
                            className="text-blue-800 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            title={t('simplified.reset_activity')}
                        >
                            <RefreshCw size={12} aria-hidden="true"/> {tx('common.reset', 'Reset')}
                        </button>
                        <button type="button" style={controlSize}
                            aria-label={t('common.close')}
                            onClick={() => { if (typeof handleSetInteractionModeToRead === 'function') handleSetInteractionModeToRead(); }}
                            className="text-blue-700 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 p-1 rounded-full transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            title={t('simplified.exit_cloze')}
                        >
                            <X size={14} aria-hidden="true"/>
                        </button>
                      </div>
                  </div>
                  {!isMinimized && (
                    <>
                  {resetOpen && <div id={panelId + '-reset'} role="group" aria-labelledby={panelId + '-reset-heading'} aria-describedby={panelId + '-reset-description'}
                    className="mb-3 rounded-lg border border-blue-300 bg-white p-3" data-cloze-reset-confirmation
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && !event.isComposing && !event.nativeEvent?.isComposing && event.keyCode !== 229 && event.nativeEvent?.keyCode !== 229) {
                        event.preventDefault(); event.stopPropagation(); closeReset(event, false);
                      }
                    }}>
                    <p id={panelId + '-reset-heading'} className="font-bold text-sm text-blue-900">{tx('simplified.cloze_reset_title', 'Reset completed answers?')}</p>
                    <p id={panelId + '-reset-description'} className="mt-1 text-sm text-blue-900">{tx('simplified.cloze_reset_description', 'Completed blanks will be empty again. Your passage and word bank stay available.')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" autoFocus style={controlSize} onClick={(event) => closeReset(event, false)} className="rounded-md border border-blue-300 bg-white px-3 text-sm font-bold text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{tx('common.cancel', 'Cancel')}</button>
                      <button type="button" style={controlSize} data-cloze-reset-confirm disabled={!hasCompletedAnswers} onClick={(event) => closeReset(event, true)} className="rounded-md bg-blue-700 px-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1">{tx('simplified.cloze_reset_confirm', 'Clear completed answers')}</button>
                    </div>
                  </div>}
                  <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-blue-800" data-cloze-reset-status>{resetStatus}</p>
                  {/* Language toggle — only when the passage isn't English, so a
                      monolingual classroom never sees a control it cannot use.
                      The blank accepts EITHER spelling, so switching this changes
                      what is offered, never what counts as correct. */}
                  {!isEnglishPassage && (
                    <div role="group" aria-label={t('simplified.word_bank_language') || 'Word bank language'} className="flex items-center justify-center gap-1 mb-2">
                      {[
                        { id: 'target', label: leveledTextLanguage },
                        { id: 'english', label: t('simplified.word_bank_english') || 'English' },
                        { id: 'both', label: t('simplified.word_bank_both') || 'Both' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={bankLang === opt.id}
                          onClick={() => setBankLang(opt.id)}
                          className={`min-h-11 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${bankLang === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {bankEntries.length >= 6 && (
                    <div className="mb-2 flex items-center justify-center gap-1.5">
                      <div className="relative w-full max-w-xs">
                        <input
                          type="search"
                          data-cloze-bank-filter
                          value={bankFilter}
                          onChange={(e) => setBankFilter(e.target.value)}
                          placeholder={tx('simplified.word_bank_filter_placeholder', 'Filter words...')}
                          aria-label={tx('simplified.word_bank_filter_aria', 'Filter word bank')}
                          className="w-full min-h-11 rounded-lg border border-blue-300 bg-white pl-3 pr-10 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        />
                        {bankFilter && (
                          <button
                            type="button"
                            data-cloze-bank-filter-clear
                            onClick={() => setBankFilter('')}
                            aria-label={tx('common.clear', 'Clear filter')}
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          ><span aria-hidden="true">✕</span></button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto custom-scrollbar p-1">
                      {visibleBankEntries.length === 0 ? (
                        <p role="status" className="text-xs font-medium text-blue-800 py-2">{tx('simplified.word_bank_no_matches', 'No matching words in the word bank.')}</p>
                      ) : visibleBankEntries.map(({ label, payload, idx }) => {
                          const isPicked = pickedIdx === idx;
                          return (
                              <span
                                key={idx}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isPicked}
                                data-cloze-bank-chip="true"
                                className={`inline-flex items-center min-h-11 px-3 py-1.5 font-bold text-sm rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:scale-105 motion-reduce:transform-none hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${isPicked ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-700 ring-offset-1' : 'bg-white text-blue-700 border-blue-200'}`}
                                draggable="true"
                                onDragStart={(e) => { if (e.dataTransfer && typeof e.dataTransfer.setData === 'function') e.dataTransfer.setData("text/plain", payload); }}
                                onClick={() => pickChip(idx, payload)}
                                onKeyDown={(e) => { if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || e.nativeEvent?.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickChip(idx, payload); } }}
                              >
                                {/* Pointer alternative to dragging: tap the chip, then tap a blank. Blanks also accept typing. */}
                                  {bt(label)}
                              </span>
                          );
                      })}
                  </div>
                  {pickedEntry && (
                    <div data-cloze-picked-bar className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-blue-900">
                      <span className="font-bold">{tx('simplified.cloze_selected_word', 'Selected')}: {bt(pickedEntry.label)}</span>
                      {canSpeakBankWord && (
                        <button
                          type="button"
                          data-cloze-speak-picked
                          onClick={() => speakBankWord(pickedEntry.payload)}
                          className="min-h-11 inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          <span aria-hidden="true">🔊</span>
                          <span>{tx('common.listen', 'Listen')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        data-cloze-clear-pick
                        onClick={() => { setPicked(null); sendPick(null); }}
                        className="min-h-11 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        {tx('common.clear', 'Clear')}
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-blue-700 mt-2 text-center font-medium pointer-events-none">{bt(t('simplified.cloze_instructions_tap'))}</p>
                    </>
                  )}
              </div>
  );
}
