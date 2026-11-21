/**
 * AlloFlow — UDL Guide Button Module
 *
 * Big "AI Guide & Assistant" call-to-action button shown in teacher sidebar.
 * Toggles the AlloFlow UDL guide panel.
 *
 * Extracted from AlloFlowANTI.txt lines 20700-20719 (May 2026).
 *
 * Required props:
 *   handleToggleShowUDLGuide — toggle handler
 *   showUDLGuide             — current state for chevron + style
 *   t                        — translation function
 *   subtitle                 — optional; overrides sidebar.ai_guide_sub (Independent Learner
 *                              gets a study-coach line instead of "Pedagogy")
 *
 * Icons (from window globals): MessageSquare, ChevronDown, ArrowRight
 */
function UDLGuideButton({ handleToggleShowUDLGuide, showUDLGuide, t, subtitle, panelId = 'udl-guide-panel' }) {
  const noop = () => null;
  const icon = (name) => (window.AlloIcons && window.AlloIcons[name]) || window[name] || noop;
  const MessageSquare = icon('MessageSquare');
  const ChevronDown = icon('ChevronDown');
  const ArrowRight = icon('ArrowRight');

  return (
    <button
      type="button"
      aria-expanded={Boolean(showUDLGuide)}
      aria-controls={panelId || undefined}
      id="tour-tool-udl"
      data-help-key="tool_udl"
      onClick={handleToggleShowUDLGuide}
      className={`min-h-11 w-full p-4 rounded-3xl shadow-lg shadow-indigo-500/10 flex items-center justify-between gap-2 transition-all motion-reduce:transition-none group border-2 mb-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${showUDLGuide ? 'bg-indigo-800 text-white border-indigo-600 shadow-indigo-500/30' : 'bg-white text-indigo-900 border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-500/20'}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2 rounded-2xl shrink-0 ${showUDLGuide ? 'bg-indigo-700' : 'bg-indigo-100 text-indigo-700'}`}>
          <MessageSquare size={20} aria-hidden="true" />
        </div>
        <div className="text-start min-w-0 break-words">
          <div className="font-bold text-sm leading-snug">{t('sidebar.ai_guide')}</div>
          <div className={`text-xs leading-snug ${showUDLGuide ? 'text-indigo-100' : 'text-slate-600'}`}>{subtitle || t('sidebar.ai_guide_sub_plain')}</div>
        </div>
      </div>
      {showUDLGuide
        ? <ChevronDown size={20} className="shrink-0" aria-hidden="true"/>
        : <ArrowRight size={20} aria-hidden="true" className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity motion-reduce:transition-none"/>}
    </button>
  );
}
