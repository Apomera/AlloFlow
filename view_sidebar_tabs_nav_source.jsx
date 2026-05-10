/**
 * AlloFlow — Sidebar Tabs Navigation Module
 *
 * Two-tab pill bar (Create / History) shown in the teacher-mode sidebar.
 * Tab semantics: role="tablist" with two role="tab" buttons.
 *
 * Extracted from AlloFlowANTI.txt lines 20668-20698 (May 2026).
 *
 * Required props:
 *   activeSidebarTab               — 'create' | 'history'
 *   handleSetActiveSidebarTabToCreate — switch to Create
 *   isHistoryPulsing               — pulse animation flag for "new history" cue
 *   setActiveSidebarTab            — direct setter (used in History click)
 *   setIsHistoryPulsing            — clear the pulse on tab switch
 *   t                              — translation function
 *
 * Icons (from window globals): Sparkles, History
 */
function SidebarTabsNav({
  activeSidebarTab,
  handleSetActiveSidebarTabToCreate,
  isHistoryPulsing,
  setActiveSidebarTab,
  setIsHistoryPulsing,
  t,
}) {
  const noop = () => null;
  const Sparkles = window.Sparkles || noop;
  const History = window.History || noop;

  return (
    <nav aria-label={t('common.content_tabs')} role="tablist" className="bg-slate-200 p-1 rounded-lg flex mb-4 shrink-0">
      <button
        role="tab"
        aria-selected={activeSidebarTab === 'create'}
        aria-controls="tour-input-panel"
        id="tab-create"
        aria-label={t('common.create_new_content')}
        onClick={handleSetActiveSidebarTabToCreate}
        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeSidebarTab === 'create' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-700 hover:text-slate-900'}`}
        data-help-key="sidebar_tab_create"
      >
        <Sparkles size={16} aria-hidden="true" /> {t('sidebar.create_tab')}
      </button>
      <button
        role="tab"
        aria-selected={activeSidebarTab === 'history'}
        aria-controls="ui-roster-strip"
        id="tab-history"
        aria-label={t('common.history')}
        onClick={() => {
          setActiveSidebarTab('history');
          setIsHistoryPulsing(false);
        }}
        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeSidebarTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-700 hover:text-slate-900'} ${isHistoryPulsing ? 'pulse-history shadow-indigo-500/50' : ''}`}
        data-help-key="sidebar_tab_history"
      >
        <History size={16} aria-hidden="true" /> {t('sidebar.history_tab')}
      </button>
    </nav>
  );
}
