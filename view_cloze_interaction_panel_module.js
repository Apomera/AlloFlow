/**
 * AlloFlow ClozeInteractionPanel Module
 * Auto-generated. Source: view_cloze_interaction_panel_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ClozeInteractionPanel) {
    console.log('[CDN] ClozeInteractionPanel already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ClozeInteractionPanel] React not found on window'); return; }

function ClozeInteractionPanel(props) {
  const noop = () => null;
  const Globe = window.Globe || noop;
  const RefreshCw = window.RefreshCw || noop;
  const X = window.X || noop;
  const {
    activeView,
    handleBankMouseDown,
    handleSetInteractionModeToRead,
    interactionMode,
    latestGlossary,
    leveledTextLanguage,
    playSound,
    setClozeCompletedSet,
    t,
    wordBankPosition,
    wordBankRef
  } = props;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: wordBankRef,
      style: wordBankPosition ? {
        position: "fixed",
        left: wordBankPosition.x,
        top: wordBankPosition.y,
        bottom: "auto",
        transform: "none"
      } : {},
      className: `z-40 w-[90%] max-w-3xl bg-blue-50/95 backdrop-blur-md p-4 rounded-xl border-2 border-blue-300 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] animate-in fade-in duration-300 ${!wordBankPosition ? "absolute bottom-28 left-1/2 -translate-x-1/2 slide-in-from-bottom-10" : ""}`
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        onMouseDown: handleBankMouseDown,
        className: "flex justify-between items-center mb-2 border-b border-blue-200/50 pb-2 cursor-move select-none"
      },
      /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-blue-800 flex items-center gap-2 text-sm uppercase tracking-wider pointer-events-none" }, /* @__PURE__ */ React.createElement(Globe, { size: 16 }), " ", t("simplified.word_bank")),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.refresh"),
          onClick: () => {
            setClozeCompletedSet(/* @__PURE__ */ new Set());
            playSound("click");
          },
          className: "text-blue-600 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1",
          title: t("simplified.reset_activity")
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 }),
        " Reset"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.close"),
          onClick: handleSetInteractionModeToRead,
          className: "text-blue-400 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 p-1 rounded-full transition-colors",
          title: t("simplified.exit_cloze")
        },
        /* @__PURE__ */ React.createElement(X, { size: 14 })
      ))
    ),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto custom-scrollbar p-1" }, latestGlossary.map((item, idx) => {
      let displayTerm = item.term;
      if (leveledTextLanguage !== "English" && item.translations && item.translations[leveledTextLanguage]) {
        const transString = item.translations[leveledTextLanguage];
        if (transString.includes(":")) {
          displayTerm = transString.split(":")[0].trim();
        }
      }
      return /* @__PURE__ */ React.createElement(
        "span",
        {
          key: idx,
          className: "px-3 py-1.5 bg-white text-blue-700 font-bold text-sm rounded-lg border border-blue-200 shadow-sm cursor-grab active:cursor-grabbing hover:scale-105 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all select-none",
          draggable: "true",
          onDragStart: (e) => e.dataTransfer.setData("text/plain", displayTerm)
        },
        displayTerm
      );
    })),
    /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-blue-500 mt-2 text-center font-medium pointer-events-none" }, t("simplified.cloze_instructions"))
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ClozeInteractionPanel = { ClozeInteractionPanel: ClozeInteractionPanel };
  console.log('[CDN] ClozeInteractionPanel loaded');
})();
