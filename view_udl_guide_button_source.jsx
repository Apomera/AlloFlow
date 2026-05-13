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
 *
 * Icons (from window globals): MessageSquare, ChevronDown, ArrowRight
 */
function UDLGuideButton({ handleToggleShowUDLGuide, showUDLGuide, t }) {
  const noop = () => null;
  const MessageSquare = window.MessageSquare || (window.AlloIcons && window.AlloIcons.MessageSquare) || noop;
  const ChevronDown = window.ChevronDown || noop;
  const ArrowRight = window.ArrowRight || noop;

  return (
    <button
      aria-label={t('common.message')}
      id="tour-tool-udl"
      data-help-key="tool_udl"
      onClick={handleToggleShowUDLGuide}
      className={`w-full p-4 rounded-3xl shadow-lg shadow-indigo-500/10 flex items-center justify-between transition-all group border-2 mb-4 shrink-0 ${showUDLGuide ? 'bg-indigo-800 text-white border-indigo-600 shadow-indigo-500/30' : 'bg-white text-indigo-900 border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-500/20'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-2xl ${showUDLGuide ? 'bg-indigo-700' : 'bg-indigo-100 text-indigo-600'}`}>
          <MessageSquare size={20} />
        </div>
        <div className="text-left">
          <div className="font-bold text-sm">{t('sidebar.ai_guide')}</div>
          <div className={`text-xs ${showUDLGuide ? 'text-indigo-200' : 'text-slate-600'}`}>{t('sidebar.ai_guide_sub')}</div>
        </div>
      </div>
      {showUDLGuide ? <ChevronDown size={20}/> : <ArrowRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity"/>}
    </button>
  );
}
