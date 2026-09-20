/**
 * AlloFlow Sidebar Tabs Nav Module
 * Auto-generated. Source: view_sidebar_tabs_nav_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SidebarTabsNav) {
    console.log('[CDN] SidebarTabsNav already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[SidebarTabsNav] React not found on window'); return; }

function SidebarTabsNav({
  activeSidebarTab,
  handleSetActiveSidebarTabToCreate,
  isHistoryPulsing,
  setActiveSidebarTab,
  setIsHistoryPulsing,
  t
}) {
  const noop = () => null;
  const Sparkles = window.Sparkles || noop;
  const History = window.History || noop;
  const translatedLabel = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  const createLabel = translatedLabel("sidebar.create_tab", "Create");
  const historyLabel = translatedLabel("sidebar.history_tab", "History");
  const createTabRef = React.useRef(null);
  const historyTabRef = React.useRef(null);
  const focusSiblingTab = (event, targetRef) => {
    event.preventDefault();
    targetRef.current?.focus();
  };
  return /* @__PURE__ */ React.createElement(
    "nav",
    {
      "aria-label": translatedLabel("common.content_tabs", "Content tabs"),
      "aria-orientation": "horizontal",
      role: "tablist",
      className: "grid grid-cols-2 gap-1 rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 mb-4 shrink-0 shadow-inner shadow-slate-200/60"
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        ref: createTabRef,
        type: "button",
        role: "tab",
        "aria-selected": activeSidebarTab === "create",
        tabIndex: activeSidebarTab === "create" ? 0 : -1,
        "aria-controls": "sidebar-create-panel",
        id: "tab-create",
        onClick: handleSetActiveSidebarTabToCreate,
        onKeyDown: (event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "End") focusSiblingTab(event, historyTabRef);
          else if (event.key === "Home") focusSiblingTab(event, createTabRef);
        },
        className: `relative min-h-11 px-3 py-2 text-sm font-bold rounded-lg border transition-[background-color,color,border-color,box-shadow] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${activeSidebarTab === "create" ? "bg-white text-indigo-700 border-slate-200 shadow-sm shadow-slate-900/5" : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/70"}`,
        "data-help-key": "sidebar_tab_create"
      },
      /* @__PURE__ */ React.createElement(Sparkles, { size: 16, "aria-hidden": "true" }),
      " ",
      /* @__PURE__ */ React.createElement("span", null, createLabel)
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        ref: historyTabRef,
        type: "button",
        role: "tab",
        "aria-selected": activeSidebarTab === "history",
        tabIndex: activeSidebarTab === "history" ? 0 : -1,
        "aria-controls": "sidebar-history-panel",
        id: "tab-history",
        onClick: () => {
          setActiveSidebarTab("history");
          setIsHistoryPulsing(false);
        },
        onKeyDown: (event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home") focusSiblingTab(event, createTabRef);
          else if (event.key === "End") focusSiblingTab(event, historyTabRef);
        },
        className: `relative min-h-11 px-3 py-2 text-sm font-bold rounded-lg border transition-[background-color,color,border-color,box-shadow] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${activeSidebarTab === "history" ? "bg-white text-indigo-700 border-slate-200 shadow-sm shadow-slate-900/5" : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/70"} ${isHistoryPulsing ? "ring-2 ring-indigo-200 ring-offset-1 ring-offset-slate-100" : ""}`,
        "data-help-key": "sidebar_tab_history"
      },
      /* @__PURE__ */ React.createElement(History, { size: 16, "aria-hidden": "true" }),
      " ",
      /* @__PURE__ */ React.createElement("span", null, historyLabel),
      isHistoryPulsing && activeSidebarTab !== "history" && /* @__PURE__ */ React.createElement("span", { className: "absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white", "aria-hidden": "true" })
    )
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SidebarTabsNav = { SidebarTabsNav: SidebarTabsNav };
  console.log('[CDN] SidebarTabsNav loaded');
})();
