/**
 * AlloFlow UDL Guide Button Module
 * Auto-generated. Source: view_udl_guide_button_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.UDLGuideButton) {
    console.log('[CDN] UDLGuideButton already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[UDLGuideButton] React not found on window'); return; }

function UDLGuideButton({ handleToggleShowUDLGuide, showUDLGuide, t: rawT, subtitle, panelId = "udl-guide-panel" } = {}) {
  if (typeof window !== "undefined" && (window.__alloQrStudentMode === true || window._alloQrBlocked === true || window.__alloStudentAiDisabled === true || window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.studentAiDisabled === true)) {
    return null;
  }
  const t = typeof rawT === "function" ? rawT : (k) => k;
  const noop = () => null;
  const isComp = (c) => typeof c === "function" || c != null && typeof c === "object" && !!c.$$typeof;
  const icon = (name) => {
    if (typeof window === "undefined") return noop;
    const fromAllo = window.AlloIcons && Object.prototype.hasOwnProperty.call(window.AlloIcons, name) ? window.AlloIcons[name] : null;
    if (isComp(fromAllo)) return fromAllo;
    const fromWin = Object.prototype.hasOwnProperty.call(window, name) ? window[name] : null;
    return isComp(fromWin) ? fromWin : noop;
  };
  const MessageSquare = icon("MessageSquare");
  const ChevronDown = icon("ChevronDown");
  const ArrowRight = icon("ArrowRight");
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "aria-expanded": Boolean(showUDLGuide),
      "aria-controls": panelId || void 0,
      id: "tour-tool-udl",
      "data-help-key": "tool_udl",
      onClick: typeof handleToggleShowUDLGuide === "function" ? handleToggleShowUDLGuide : void 0,
      className: `min-h-11 w-full p-4 rounded-3xl shadow-lg shadow-indigo-500/10 flex items-center justify-between gap-2 transition-all motion-reduce:transition-none group border-2 mb-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${showUDLGuide ? "bg-indigo-800 text-white border-indigo-600 shadow-indigo-500/30" : "bg-white text-indigo-900 border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-500/20"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("div", { className: `p-2 rounded-2xl shrink-0 ${showUDLGuide ? "bg-indigo-700" : "bg-indigo-100 text-indigo-700"}` }, /* @__PURE__ */ React.createElement(MessageSquare, { size: 20, "aria-hidden": "true" })), /* @__PURE__ */ React.createElement("div", { className: "text-start min-w-0 break-words" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-sm leading-snug" }, t("sidebar.ai_guide")), /* @__PURE__ */ React.createElement("div", { className: `text-xs leading-snug ${showUDLGuide ? "text-indigo-100" : "text-slate-600"}` }, subtitle || t("sidebar.ai_guide_sub_plain")))),
    showUDLGuide ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 20, className: "shrink-0", "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(ArrowRight, { size: 20, "aria-hidden": "true", className: "shrink-0 opacity-60 group-hover:opacity-100 transition-opacity motion-reduce:transition-none" })
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.UDLGuideButton = { UDLGuideButton: UDLGuideButton };
  console.log('[CDN] UDLGuideButton loaded');
})();
