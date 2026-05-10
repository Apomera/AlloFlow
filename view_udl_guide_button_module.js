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

function UDLGuideButton({ handleToggleShowUDLGuide, showUDLGuide, t }) {
  const noop = () => null;
  const MessageSquare = window.MessageSquare || window.AlloIcons && window.AlloIcons.MessageSquare || noop;
  const ChevronDown = window.ChevronDown || noop;
  const ArrowRight = window.ArrowRight || noop;
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.message"),
      id: "tour-tool-udl",
      "data-help-key": "tool_udl",
      onClick: handleToggleShowUDLGuide,
      className: `w-full p-4 rounded-3xl shadow-lg shadow-indigo-500/10 flex items-center justify-between transition-all group border-2 mb-4 shrink-0 ${showUDLGuide ? "bg-indigo-800 text-white border-indigo-600 shadow-indigo-500/30" : "bg-white text-indigo-900 border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-500/20"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: `p-2 rounded-2xl ${showUDLGuide ? "bg-indigo-700" : "bg-indigo-100 text-indigo-600"}` }, /* @__PURE__ */ React.createElement(MessageSquare, { size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-sm" }, t("sidebar.ai_guide")), /* @__PURE__ */ React.createElement("div", { className: `text-xs ${showUDLGuide ? "text-indigo-200" : "text-slate-600"}` }, t("sidebar.ai_guide_sub")))),
    showUDLGuide ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 20 }) : /* @__PURE__ */ React.createElement(ArrowRight, { size: 20, className: "opacity-50 group-hover:opacity-100 transition-opacity" })
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.UDLGuideButton = { UDLGuideButton: UDLGuideButton };
  console.log('[CDN] UDLGuideButton loaded');
})();
