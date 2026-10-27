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
  const Globe = window.Globe || noop;
  const RefreshCw = window.RefreshCw || noop;
  const X = window.X || noop;
  const {
    activeView, handleBankMouseDown, handleSetInteractionModeToRead,
    interactionMode, latestGlossary, leveledTextLanguage, playSound,
    setClozeCompletedSet, setClozeInstanceSet, t, wordBankPosition, wordBankRef,
  } = props;
  const isEnglishPassage = !leveledTextLanguage || leveledTextLanguage === 'English';
  // Kept local: it is a per-student display preference, not lesson content, so
  // it does not belong in the host's state or in the saved resource.
  // Defaults to the passage's own language — that is the text the student is
  // reading, and English is one tap away.
  const [bankLang, setBankLang] = React.useState('target');
  // Tap path (WCAG 2.5.7): tap a chip to pick it up, then tap a blank. The
  // blanks (ClozeInput, misc_components) read window.__alloClozeBankPick and
  // the 'allo-cloze-bank-pick' event; a blank sends detail null once placed.
  const [pickedIdx, setPickedIdx] = React.useState(null);
  const sendPick = (word) => {
      window.__alloClozeBankPick = word || null;
      try { window.dispatchEvent(new CustomEvent('allo-cloze-bank-pick', { detail: word || null })); } catch (_) {}
  };
  const pickChip = (idx, word) => {
      const next = pickedIdx === idx ? null : idx;
      setPickedIdx(next);
      sendPick(next === null ? null : word);
      if (next !== null && playSound) playSound('click');
  };
  React.useEffect(() => {
      const onPick = (e) => { if (!e.detail) setPickedIdx(null); };
      window.addEventListener('allo-cloze-bank-pick', onPick);
      return () => { window.removeEventListener('allo-cloze-bank-pick', onPick); sendPick(null); };
  }, []);
  // The payload follows the language toggle, so a pick made before a switch is stale.
  React.useEffect(() => { setPickedIdx(null); sendPick(null); }, [bankLang]);
  return (
              <div
                  ref={wordBankRef}
                  style={wordBankPosition ? {
                      position: 'fixed',
                      left: wordBankPosition.x,
                      top: wordBankPosition.y,
                      bottom: 'auto',
                      transform: 'none'
                  } : {}}
                  className={`z-40 w-[90%] max-w-3xl bg-blue-50/95 backdrop-blur-md p-4 rounded-xl border-2 border-blue-300 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] animate-in fade-in duration-300 ${!wordBankPosition ? 'absolute bottom-28 left-1/2 -translate-x-1/2 slide-in-from-bottom-10' : ''}`}
              >
                  <div
                      onMouseDown={handleBankMouseDown}
                      className="flex justify-between items-center mb-2 border-b border-blue-200/50 pb-2 cursor-move select-none"
                  >
                      <h4 className="font-bold text-blue-800 flex items-center gap-2 text-sm uppercase tracking-wider pointer-events-none">
                          <Globe size={16} /> {t('simplified.word_bank')}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setClozeCompletedSet(new Set());
                                // The solved blanks live here; clearing only the set above changed nothing.
                                if (typeof setClozeInstanceSet === 'function') setClozeInstanceSet(new Set());
                                setPickedIdx(null);
                                sendPick(null);
                                playSound('click');
                            }}
                            className="text-blue-800 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                            title={t('simplified.reset_activity')}
                        >
                            <RefreshCw size={12}/> Reset
                        </button>
                        <button
                            aria-label={t('common.close')}
                            onClick={handleSetInteractionModeToRead}
                            className="text-blue-700 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 p-1 rounded-full transition-colors"
                            title={t('simplified.exit_cloze')}
                        >
                            <X size={14}/>
                        </button>
                      </div>
                  </div>
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
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border transition-colors ${bankLang === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto custom-scrollbar p-1">
                      {latestGlossary.map((item, idx) => {
                          const englishTerm = item.term;
                          // A translation is usable even without the "term: definition"
                          // shape — the old code only split on ':' and otherwise fell
                          // back to English, which is why the bank so often looked
                          // English-only even for a translated passage.
                          let translatedTerm = '';
                          if (!isEnglishPassage && item.translations && item.translations[leveledTextLanguage]) {
                              const transString = String(item.translations[leveledTextLanguage]);
                              translatedTerm = transString.includes(':')
                                  ? transString.split(':')[0].trim()
                                  : transString.trim();
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
                          const isPicked = pickedIdx === idx;
                          return (
                              <span
                                key={idx}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isPicked}
                                data-cloze-bank-chip="true"
                                className={`px-3 py-1.5 font-bold text-sm rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:scale-105 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${isPicked ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-700 ring-offset-1' : 'bg-white text-blue-700 border-blue-200'}`}
                                draggable="true"
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", payload)}
                                onClick={() => pickChip(idx, payload)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickChip(idx, payload); } }}
                              >
                                {/* Pointer alternative to dragging: tap the chip, then tap a blank. Blanks also accept typing. */}
                                  {label}
                              </span>
                          );
                      })}
                  </div>
                  <p className="text-[11px] text-blue-500 mt-2 text-center font-medium pointer-events-none">{t('simplified.cloze_instructions_tap')}</p>
              </div>
  );
}
