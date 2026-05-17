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

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={handleSetShowHintsModalToFalse} role="presentation">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] overflow-hidden relative" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="hints-modal-title">
        <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex justify-between items-center shrink-0">
          <h3 id="hints-modal-title" className="font-bold text-lg text-yellow-800 flex items-center gap-2">
            <Lightbulb size={20} className="fill-yellow-500 text-yellow-600"/> {t('hints.title')}
          </h3>
          <button onClick={handleSetShowHintsModalToFalse} className="p-2 rounded-full hover:bg-yellow-100 text-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500" aria-label={t('common.close')}><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
          {hintHistory.length === 0 ? (
            <div className="text-center py-10 text-slate-600 italic">
              {t('hints.empty_state')}
            </div>
          ) : (
            hintHistory.map((hint) => (
              <div key={hint.id} className={`p-4 rounded-xl border-l-4 shadow-sm ${hint.isExtension ? 'bg-purple-50 border-purple-400' : 'bg-white border-yellow-400'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${hint.isExtension ? 'text-purple-600' : 'text-yellow-600'}`}>
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
                      aria-label={t('common.save')}
                      onClick={() => handleSaveExtensionToHistory(hint)}
                      className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Save size={12}/> {t('hints.save_to_history')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyHint(hint)}
                      className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-bold hover:bg-yellow-200 transition-colors flex items-center gap-1"
                      title={t('hints.apply_brainstorm_tooltip')}
                    >
                      <Lightbulb size={12}/> {t('hints.apply_brainstorm')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button aria-label={t('common.on_ideas')}
            onClick={handleGenerateLessonIdeas}
            disabled={isGeneratingExtension || history.length === 0}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
            data-help-key="hints_generate_extension"
          >
            {isGeneratingExtension ? <RefreshCw size={16} className="animate-spin"/> : <Sparkles size={16} className="text-yellow-700 fill-current"/>}
            {isGeneratingExtension ? t('hints.synthesizing') : t('hints.generate_extensions')}
          </button>
        </div>
      </div>
    </div>
  );
}
