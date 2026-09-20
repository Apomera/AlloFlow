/**
 * AlloFlow — Sidebar Tabs Navigation Module
 *
 * Low-noise segmented bar (Create / History) shown in the teacher-mode sidebar.
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
  const translatedLabel = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  const createLabel = translatedLabel('sidebar.create_tab', 'Create');
  const historyLabel = translatedLabel('sidebar.history_tab', 'History');
  const createTabRef = React.useRef(null);
  const historyTabRef = React.useRef(null);
  const focusSiblingTab = (event, targetRef) => {
    event.preventDefault();
    targetRef.current?.focus();
  };

  return (
    <nav
      aria-label={t('common.content_tabs')}
      aria-orientation="horizontal"
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 mb-4 shrink-0 shadow-inner shadow-slate-200/60"
    >
      <button
        ref={createTabRef}
        role="tab"
        aria-selected={activeSidebarTab === 'create'}
        tabIndex={activeSidebarTab === 'create' ? 0 : -1}
        aria-controls="tour-input-panel"
        id="tab-create"
        aria-label={t('common.create_new_content')}
        onClick={handleSetActiveSidebarTabToCreate}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'End') focusSiblingTab(event, historyTabRef);
        }}
        className={`relative min-h-11 px-3 py-2 text-sm font-bold rounded-lg border transition-[background-color,color,border-color,box-shadow] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${activeSidebarTab === 'create' ? 'bg-white text-indigo-700 border-slate-200 shadow-sm shadow-slate-900/5' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}
        data-help-key="sidebar_tab_create"
      >
        <Sparkles size={16} aria-hidden="true" /> <span>{createLabel}</span>
      </button>
      <button
        ref={historyTabRef}
        role="tab"
        aria-selected={activeSidebarTab === 'history'}
        tabIndex={activeSidebarTab === 'history' ? 0 : -1}
        aria-controls="ui-roster-strip"
        id="tab-history"
        aria-label={t('common.history')}
        onClick={() => {
          setActiveSidebarTab('history');
          setIsHistoryPulsing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'Home') focusSiblingTab(event, createTabRef);
        }}
        className={`relative min-h-11 px-3 py-2 text-sm font-bold rounded-lg border transition-[background-color,color,border-color,box-shadow] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${activeSidebarTab === 'history' ? 'bg-white text-indigo-700 border-slate-200 shadow-sm shadow-slate-900/5' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/70'} ${isHistoryPulsing ? 'ring-2 ring-indigo-200 ring-offset-1 ring-offset-slate-100' : ''}`}
        data-help-key="sidebar_tab_history"
      >
        <History size={16} aria-hidden="true" /> <span>{historyLabel}</span>
        {isHistoryPulsing && activeSidebarTab !== 'history' && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" aria-hidden="true" />
        )}
      </button>
    </nav>
  );
}
