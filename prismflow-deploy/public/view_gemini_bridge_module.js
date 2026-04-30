/**
 * AlloFlow View - Gemini Bridge Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='gemini-bridge' block.
 * Source range: 43 lines body. Renders Gemini prompt steps as a
 * terminal-style card with copy buttons per step.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.GeminiBridgeView) {
    console.log('[CDN] ViewGeminiBridgeModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewGeminiBridgeModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Terminal = _lazyIcon('Terminal');
  var Copy = _lazyIcon('Copy');

  function GeminiBridgeView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var copyToClipboard = props.copyToClipboard;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 text-slate-600 p-6 rounded-xl border border-slate-700 shadow-lg font-mono relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-6 border-b border-slate-700 pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-green-400 font-bold"
  }, /*#__PURE__*/React.createElement(Terminal, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, t('bridge.prompt_header'))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 font-sans"
  }, Array.isArray(generatedContent?.data) ? t('bridge.steps_count_label', {
    count: generatedContent?.data.length
  }) : t('bridge.single_prompt_label'))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, (Array.isArray(generatedContent?.data) ? generatedContent?.data : [generatedContent?.data]).map((promptStep, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "relative group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute -left-3 -top-3 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold border-2 border-slate-900 shadow-sm z-10"
  }, idx + 1), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors"
  }, /*#__PURE__*/React.createElement("pre", {
    className: "whitespace-pre-wrap text-sm leading-relaxed text-slate-200 overflow-x-auto font-mono mb-2"
  }, promptStep), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end pt-2 border-t border-slate-700/50"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.copy'),
    onClick: () => copyToClipboard(promptStep),
    className: "flex items-center gap-2 text-[11px] font-bold bg-slate-700 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 12
  }), " ", t('bridge.copy_step', {
    step: idx + 1
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 pt-4 border-t border-slate-700 text-xs text-slate-600 flex items-center gap-2 justify-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-green-500 animate-pulse"
  }), t('bridge.next_step'))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.GeminiBridgeView = GeminiBridgeView;
  window.AlloModules.ViewGeminiBridgeModule = true;
})();
