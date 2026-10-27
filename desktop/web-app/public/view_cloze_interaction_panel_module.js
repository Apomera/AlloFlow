/**
 * AlloFlow ClozeInteractionPanel Module
 * Auto-generated. Source: view_cloze_interaction_panel_source.jsx
 * Source SHA-256: 0c8235fb203a6ca9
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
    setClozeInstanceSet,
    t,
    wordBankPosition,
    wordBankRef
  } = props;
  const isEnglishPassage = !leveledTextLanguage || leveledTextLanguage === "English";
  const [bankLang, setBankLang] = React.useState("target");
  const [pickedIdx, setPickedIdx] = React.useState(null);
  const sendPick = (word) => {
    window.__alloClozeBankPick = word || null;
    try {
      window.dispatchEvent(new CustomEvent("allo-cloze-bank-pick", { detail: word || null }));
    } catch (_) {
    }
  };
  const pickChip = (idx, word) => {
    const next = pickedIdx === idx ? null : idx;
    setPickedIdx(next);
    sendPick(next === null ? null : word);
    if (next !== null && playSound) playSound("click");
  };
  React.useEffect(() => {
    const onPick = (e) => {
      if (!e.detail) setPickedIdx(null);
    };
    window.addEventListener("allo-cloze-bank-pick", onPick);
    return () => {
      window.removeEventListener("allo-cloze-bank-pick", onPick);
      sendPick(null);
    };
  }, []);
  React.useEffect(() => {
    setPickedIdx(null);
    sendPick(null);
  }, [bankLang]);
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
          onClick: () => {
            setClozeCompletedSet(/* @__PURE__ */ new Set());
            if (typeof setClozeInstanceSet === "function") setClozeInstanceSet(/* @__PURE__ */ new Set());
            setPickedIdx(null);
            sendPick(null);
            playSound("click");
          },
          className: "text-blue-800 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1",
          title: t("simplified.reset_activity")
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 }),
        " Reset"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.close"),
          onClick: handleSetInteractionModeToRead,
          className: "text-blue-700 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 p-1 rounded-full transition-colors",
          title: t("simplified.exit_cloze")
        },
        /* @__PURE__ */ React.createElement(X, { size: 14 })
      ))
    ),
    !isEnglishPassage && /* @__PURE__ */ React.createElement("div", { role: "group", "aria-label": t("simplified.word_bank_language") || "Word bank language", className: "flex items-center justify-center gap-1 mb-2" }, [
      { id: "target", label: leveledTextLanguage },
      { id: "english", label: t("simplified.word_bank_english") || "English" },
      { id: "both", label: t("simplified.word_bank_both") || "Both" }
    ].map((opt) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: opt.id,
        type: "button",
        "aria-pressed": bankLang === opt.id,
        onClick: () => setBankLang(opt.id),
        className: `px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border transition-colors ${bankLang === opt.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-100"}`
      },
      opt.label
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto custom-scrollbar p-1" }, latestGlossary.map((item, idx) => {
      const englishTerm = item.term;
      let translatedTerm = "";
      if (!isEnglishPassage && item.translations && item.translations[leveledTextLanguage]) {
        const transString = String(item.translations[leveledTextLanguage]);
        translatedTerm = transString.includes(":") ? transString.split(":")[0].trim() : transString.trim();
      }
      const showTranslated = translatedTerm && bankLang !== "english";
      const dragPayload = translatedTerm || englishTerm;
      const label = !translatedTerm ? englishTerm : bankLang === "both" ? `${translatedTerm} / ${englishTerm}` : showTranslated ? translatedTerm : englishTerm;
      const payload = bankLang === "english" ? englishTerm : dragPayload;
      const isPicked = pickedIdx === idx;
      return /* @__PURE__ */ React.createElement(
        "span",
        {
          key: idx,
          role: "button",
          tabIndex: 0,
          "aria-pressed": isPicked,
          "data-cloze-bank-chip": "true",
          className: `px-3 py-1.5 font-bold text-sm rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:scale-105 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${isPicked ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-700 ring-offset-1" : "bg-white text-blue-700 border-blue-200"}`,
          draggable: "true",
          onDragStart: (e) => e.dataTransfer.setData("text/plain", payload),
          onClick: () => pickChip(idx, payload),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pickChip(idx, payload);
            }
          }
        },
        label
      );
    })),
    /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-blue-500 mt-2 text-center font-medium pointer-events-none" }, t("simplified.cloze_instructions_tap"))
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ClozeInteractionPanel = { ClozeInteractionPanel: ClozeInteractionPanel };
  console.log('[CDN] ClozeInteractionPanel loaded');
})();
