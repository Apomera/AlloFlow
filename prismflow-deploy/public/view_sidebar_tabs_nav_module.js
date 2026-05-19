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
  return /* @__PURE__ */ React.createElement("nav", { "aria-label": t("common.content_tabs"), role: "tablist", className: "bg-slate-200 p-1 rounded-lg flex mb-4 shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      role: "tab",
      "aria-selected": activeSidebarTab === "create",
      "aria-controls": "tour-input-panel",
      id: "tab-create",
      "aria-label": t("common.create_new_content"),
      onClick: handleSetActiveSidebarTabToCreate,
      className: `flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeSidebarTab === "create" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-700 hover:text-slate-900"}`,
      "data-help-key": "sidebar_tab_create"
    },
    /* @__PURE__ */ React.createElement(Sparkles, { size: 16, "aria-hidden": "true" }),
    " ",
    t("sidebar.create_tab")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      role: "tab",
      "aria-selected": activeSidebarTab === "history",
      "aria-controls": "ui-roster-strip",
      id: "tab-history",
      "aria-label": t("common.history"),
      onClick: () => {
        setActiveSidebarTab("history");
        setIsHistoryPulsing(false);
      },
      className: `flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeSidebarTab === "history" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-700 hover:text-slate-900"} ${isHistoryPulsing ? "pulse-history shadow-indigo-500/50" : ""}`,
      "data-help-key": "sidebar_tab_history"
    },
    /* @__PURE__ */ React.createElement(History, { size: 16, "aria-hidden": "true" }),
    " ",
    t("sidebar.history_tab")
  ));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SidebarTabsNav = { SidebarTabsNav: SidebarTabsNav };
  console.log('[CDN] SidebarTabsNav loaded');
})();
