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
  setIsRosterKeyOpen,
  onDifferentiateByGroup,
  onQuickAddGroup,
  defaultGrade,
  defaultLanguage,
  t
}) {
  const GRADE_OPTIONS = ["Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade"];
  const [quickName, setQuickName] = React.useState("");
  const [quickGrade, setQuickGrade] = React.useState(GRADE_OPTIONS.includes(defaultGrade) ? defaultGrade : "5th Grade");
  const [quickLanguage, setQuickLanguage] = React.useState(defaultLanguage || "English");
  const [quickMessage, setQuickMessage] = React.useState("");
  const hasGroups = !!(rosterKey && Object.keys(rosterKey.groups || {}).length > 0);
  const submitQuickGroup = (event) => {
    event.preventDefault();
    const result = typeof onQuickAddGroup === "function" ? onQuickAddGroup(quickName, quickGrade, quickLanguage) : "unavailable";
    if (result === "added") {
      setQuickName("");
      setQuickMessage("");
    } else if (result === "duplicate") setQuickMessage(t("roster.quick_duplicate") || "You already have a group with that name.");
    else if (result === "empty") setQuickMessage(t("roster.quick_need_name") || "Give the group a name first.");
  };
  const noop = () => null;
  const ClipboardList = window.ClipboardList || noop;
  const Settings = window.Settings || noop;
  const Layers = window.Layers || noop;
  return /* @__PURE__ */ React.createElement("div", { id: "ui-roster-strip", "data-help-key": "class_groups_strip", className: "bg-white rounded-3xl shadow-indigo-500/10 border border-slate-400 overflow-hidden shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-indigo-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 16 }), " ", t("roster.strip_title") || "Class Groups"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, hasGroups && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsRosterKeyOpen(true), className: "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", "data-help-key": "roster_manage_btn" }, /* @__PURE__ */ React.createElement(Settings, { size: 14, "aria-hidden": "true" }), " ", t("roster.edit_groups") || "Edit groups"))), /* @__PURE__ */ React.createElement("div", { className: "p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs leading-relaxed text-slate-600 mb-2" }, t("roster.strip_intro") || "Give each group its own grade and language. Tap a group to create for it, or make a version for every group."), rosterKey && Object.keys(rosterKey.groups || {}).length > 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" }, Object.entries(rosterKey.groups).map(([gid, g]) => /* @__PURE__ */ React.createElement(
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
      onClick: onDifferentiateByGroup,
      disabled: !hasSourceOrAnalysis,
      className: "w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 border border-amber-600"
    },
    /* @__PURE__ */ React.createElement(Layers, { size: 14 }),
    " ",
    t("roster.batch_generate") || "Differentiate by Group"
  )) : typeof onQuickAddGroup === "function" ? /* @__PURE__ */ React.createElement("form", { onSubmit: submitQuickGroup, "data-help-key": "roster_quick_add", className: "grid gap-2", "aria-labelledby": "roster-quick-title" }, /* @__PURE__ */ React.createElement("p", { id: "roster-quick-title", className: "text-xs font-bold text-slate-800" }, t("roster.quick_title") || "Add your first group"), /* @__PURE__ */ React.createElement("label", { className: "grid gap-1 text-xs font-semibold text-slate-700" }, t("roster.quick_name") || "Group name", /* @__PURE__ */ React.createElement("input", { value: quickName, onChange: (e) => setQuickName(e.target.value), maxLength: 60, placeholder: t("roster.quick_name_example") || "For example: Reading support", className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500" })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "grid gap-1 text-xs font-semibold text-slate-700" }, t("roster.quick_grade") || "Grade", /* @__PURE__ */ React.createElement("select", { value: quickGrade, onChange: (e) => setQuickGrade(e.target.value), className: "min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900" }, GRADE_OPTIONS.map((g) => /* @__PURE__ */ React.createElement("option", { key: g, value: g }, g)))), /* @__PURE__ */ React.createElement("label", { className: "grid gap-1 text-xs font-semibold text-slate-700" }, t("roster.quick_language") || "Language", /* @__PURE__ */ React.createElement("input", { value: quickLanguage, onChange: (e) => setQuickLanguage(e.target.value), maxLength: 40, className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900" }))), quickMessage && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-xs font-semibold text-red-700" }, quickMessage), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "min-h-11 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" }, t("roster.quick_add") || "Add group"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsRosterKeyOpen(true), className: "min-h-11 justify-self-start px-1 text-xs font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-900" }, t("roster.open_full") || "Open the full class roster")) : /* @__PURE__ */ React.createElement("div", { className: "text-center py-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mb-1" }, t("roster.strip_empty_groups") || "No groups yet."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsRosterKeyOpen(true), className: "inline-flex min-h-11 items-center px-2 text-xs text-indigo-700 font-bold underline underline-offset-2 hover:text-indigo-900" }, t("roster.strip_setup_groups") || "Set up groups"))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TeacherHistoryTab = { TeacherHistoryTab: TeacherHistoryTab };
  console.log('[CDN] TeacherHistoryTab loaded');
})();
