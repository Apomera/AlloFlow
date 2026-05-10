/**
 * AlloFlow Teacher History Tab Module
 * Auto-generated. Source: view_teacher_history_tab_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.TeacherHistoryTab) {
    console.log('[CDN] TeacherHistoryTab already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[TeacherHistoryTab] React not found on window'); return; }

function TeacherHistoryTab({
  handleApplyRosterGroup,
  hasSourceOrAnalysis,
  rosterKey,
  setBridgeSendOpen,
  setIsRosterKeyOpen,
  setShowBatchConfig,
  t
}) {
  const noop = () => null;
  const ClipboardList = window.ClipboardList || noop;
  const Settings = window.Settings || noop;
  const Layers = window.Layers || noop;
  const safeBatchConfig = setShowBatchConfig || (() => {
  });
  return /* @__PURE__ */ React.createElement("div", { id: "ui-roster-strip", className: "bg-white rounded-3xl shadow-indigo-500/10 border border-slate-400 overflow-hidden shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-indigo-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 16 }), " ", t("roster.strip_title") || "Class Groups"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setBridgeSendOpen(true), className: "p-1.5 rounded-md hover:bg-teal-100 text-teal-600", title: t("roster.bridge_mode_btn") || "\u{1F310} Bridge Mode", "aria-label": t("roster.bridge_mode_btn") || "Bridge Mode", "data-help-key": "bridge_mode_button" }, "\u{1F310}"), /* @__PURE__ */ React.createElement("button", { onClick: () => setIsRosterKeyOpen(true), className: "p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600", title: t("roster.title") || "Manage Roster", "aria-label": t("roster.title"), "data-help-key": "roster_manage_button" }, /* @__PURE__ */ React.createElement(Settings, { size: 14 })))), /* @__PURE__ */ React.createElement("div", { className: "p-3" }, rosterKey && Object.keys(rosterKey.groups || {}).length > 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" }, Object.entries(rosterKey.groups).map(([gid, g]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: gid,
      onClick: () => handleApplyRosterGroup(gid),
      className: "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 border cursor-pointer",
      style: { backgroundColor: (g.color || "#6366f1") + "20", borderColor: (g.color || "#6366f1") + "60", color: g.color === "#f5f5f5" || !g.color ? "#334155" : g.color },
      title: `${g.name} \xB7 ${g.profile?.gradeLevel || "No grade"} \xB7 ${g.profile?.leveledTextLanguage || "English"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "inline-block w-2 h-2 rounded-full mr-1 align-middle", style: { backgroundColor: g.color || "#6366f1" } }),
    g.name
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setIsRosterKeyOpen(true);
        setTimeout(() => safeBatchConfig(true), 300);
      },
      disabled: !hasSourceOrAnalysis,
      className: "w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 border border-amber-600"
    },
    /* @__PURE__ */ React.createElement(Layers, { size: 14 }),
    " ",
    t("roster.batch_generate") || "Differentiate by Group"
  )) : /* @__PURE__ */ React.createElement("div", { className: "text-center py-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mb-1" }, t("roster.strip_empty") || "No class roster yet"), /* @__PURE__ */ React.createElement("button", { onClick: () => setIsRosterKeyOpen(true), className: "text-xs text-indigo-600 font-bold hover:underline" }, t("roster.strip_create") || "Create one"))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TeacherHistoryTab = { TeacherHistoryTab: TeacherHistoryTab };
  console.log('[CDN] TeacherHistoryTab loaded');
})();
