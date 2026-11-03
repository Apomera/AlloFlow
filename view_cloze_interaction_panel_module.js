/**
 * AlloFlow ClozeInteractionPanel Module
 * Auto-generated. Source: view_cloze_interaction_panel_source.jsx
 * Source SHA-256: c205aca3ebf53090
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
    activityScope,
    setClozeCompletedSet,
    setClozeInstanceSet,
    t,
    wordBankPosition,
    wordBankRef,
    completedBlankCount
  } = props;
  const tx = (key, fallback) => {
    const value = typeof t === "function" ? t(key) : "";
    return typeof value === "string" && value.trim() && value !== key ? value : fallback;
  };
  const controlSize = { minHeight: 44, minWidth: 44 };
  const resetButtonRef = React.useRef(null);
  const bankHeadingRef = React.useRef(null);
  const resetFocusRef = React.useRef(null);
  const panelId = React.useId();
  const [resetPrompt, setResetPrompt] = React.useState(null);
  const [resetStatus, setResetStatus] = React.useState("");
  const hasCompletedAnswers = !Number.isInteger(completedBlankCount) || completedBlankCount > 0;
  const isEnglishPassage = !leveledTextLanguage || leveledTextLanguage === "English";
  const [bankLang, setBankLang] = React.useState("target");
  const bankEntries = latestGlossary.map((item) => {
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
    return { label, payload };
  });
  const contentScope = JSON.stringify([leveledTextLanguage || "English", bankLang, bankEntries.map(({ label, payload }) => [label, payload])]);
  const resetScope = JSON.stringify([activityScope, contentScope]);
  const resetOpen = resetPrompt === resetScope;
  const [picked, setPicked] = React.useState(null);
  const pickedIdx = picked && picked.activityScope === activityScope && picked.contentScope === contentScope ? picked.idx : null;
  const sendPick = (word) => {
    window.__alloClozeBankPick = word || null;
    try {
      window.dispatchEvent(new CustomEvent("allo-cloze-bank-pick", { detail: word || null }));
    } catch (_) {
    }
  };
  const pickChip = (idx, word) => {
    const next = pickedIdx === idx ? null : idx;
    setPicked(next === null ? null : { idx: next, activityScope, contentScope });
    sendPick(next === null ? null : word);
    if (next !== null && playSound) playSound("click");
  };
  const closeReset = (event, confirmed) => {
    if (confirmed && (!resetOpen || !hasCompletedAnswers)) return;
    resetFocusRef.current = { from: event.currentTarget, scope: resetScope, cleared: confirmed };
    setResetPrompt(null);
    if (confirmed) {
      setClozeCompletedSet(/* @__PURE__ */ new Set());
      if (typeof setClozeInstanceSet === "function") setClozeInstanceSet(/* @__PURE__ */ new Set());
      setPicked(null);
      sendPick(null);
      setResetStatus(tx("simplified.cloze_reset_done", "Completed answers cleared."));
      if (playSound) playSound("click");
    }
  };
  React.useLayoutEffect(() => {
    const pending = resetFocusRef.current;
    resetFocusRef.current = null;
    if (!pending || pending.scope !== resetScope) return;
    const active = document.activeElement;
    if (active !== document.body && active !== pending.from && !pending.from.contains(active)) return;
    const target = pending.cleared ? bankHeadingRef.current : resetButtonRef.current;
    if (target && target.isConnected && !target.disabled) target.focus();
  });
  React.useEffect(() => {
    const onPick = (e) => {
      if (!e.detail) setPicked(null);
    };
    window.addEventListener("allo-cloze-bank-pick", onPick);
    return () => {
      window.removeEventListener("allo-cloze-bank-pick", onPick);
      sendPick(null);
    };
  }, []);
  React.useEffect(() => {
    setPicked(null);
    sendPick(null);
    setResetPrompt(null);
    setResetStatus("");
    resetFocusRef.current = null;
  }, [activityScope, contentScope]);
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
        className: "flex flex-wrap gap-2 justify-between items-center mb-2 border-b border-blue-200/50 pb-2 cursor-move select-none"
      },
      /* @__PURE__ */ React.createElement("h4", { ref: bankHeadingRef, tabIndex: -1, className: "font-bold text-blue-800 flex items-center gap-2 text-sm uppercase tracking-wider pointer-events-none" }, /* @__PURE__ */ React.createElement(Globe, { size: 16 }), " ", t("simplified.word_bank")),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          style: controlSize,
          ref: resetButtonRef,
          "data-cloze-reset": true,
          disabled: !hasCompletedAnswers,
          "aria-expanded": resetOpen,
          "aria-controls": panelId + "-reset",
          onClick: () => {
            setResetStatus("");
            setResetPrompt(resetScope);
          },
          className: "text-blue-800 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed",
          title: t("simplified.reset_activity")
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 }),
        " ",
        tx("common.reset", "Reset")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          style: controlSize,
          "aria-label": t("common.close"),
          onClick: handleSetInteractionModeToRead,
          className: "text-blue-700 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 p-1 rounded-full transition-colors",
          title: t("simplified.exit_cloze")
        },
        /* @__PURE__ */ React.createElement(X, { size: 14 })
      ))
    ),
    resetOpen && /* @__PURE__ */ React.createElement(
      "div",
      {
        id: panelId + "-reset",
        role: "group",
        "aria-labelledby": panelId + "-reset-heading",
        "aria-describedby": panelId + "-reset-description",
        className: "mb-3 rounded-lg border border-blue-300 bg-white p-3",
        "data-cloze-reset-confirmation": true,
        onKeyDown: (event) => {
          if (event.key === "Escape" && !event.isComposing && !event.nativeEvent?.isComposing && event.keyCode !== 229 && event.nativeEvent?.keyCode !== 229) {
            event.preventDefault();
            event.stopPropagation();
            closeReset(event, false);
          }
        }
      },
      /* @__PURE__ */ React.createElement("p", { id: panelId + "-reset-heading", className: "font-bold text-sm text-blue-900" }, tx("simplified.cloze_reset_title", "Reset completed answers?")),
      /* @__PURE__ */ React.createElement("p", { id: panelId + "-reset-description", className: "mt-1 text-sm text-blue-900" }, tx("simplified.cloze_reset_description", "Completed blanks will be empty again. Your passage and word bank stay available.")),
      /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", autoFocus: true, style: controlSize, onClick: (event) => closeReset(event, false), className: "rounded-md border border-blue-300 bg-white px-3 text-sm font-bold text-blue-800" }, tx("common.cancel", "Cancel")), /* @__PURE__ */ React.createElement("button", { type: "button", style: controlSize, "data-cloze-reset-confirm": true, disabled: !hasCompletedAnswers, onClick: (event) => closeReset(event, true), className: "rounded-md bg-blue-700 px-3 text-sm font-bold text-white" }, tx("simplified.cloze_reset_confirm", "Clear completed answers")))
    ),
    /* @__PURE__ */ React.createElement("p", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "text-sm text-blue-800", "data-cloze-reset-status": true }, resetStatus),
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
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto custom-scrollbar p-1" }, bankEntries.map(({ label, payload }, idx) => {
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
