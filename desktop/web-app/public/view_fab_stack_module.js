/**
 * AlloFlow FabStack Module
 * Auto-generated. Source: view_fab_stack_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.FabStack) {
    console.log('[CDN] FabStack already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[FabStack] React not found on window'); return; }

function FabStack(props) {
  const noop = () => null;
  const AlignJustify = window.AlignJustify || noop;
  const Clock = window.Clock || noop;
  const Eye = window.Eye || noop;
  const Gamepad2 = window.Gamepad2 || noop;
  const HelpCircle = window.HelpCircle || noop;
  const MessageCircleQuestion = window.MessageCircleQuestion || noop;
  const Mic = window.Mic || noop;
  const MicOff = window.MicOff || noop;
  const ScanLine = window.ScanLine || noop;
  const Search = window.Search || noop;
  const Volume2 = window.Volume2 || noop;
  const Wrench = window.Wrench || noop;
  const {
    activeView,
    addToast,
    focusMode,
    generatedContent,
    handleSetIsSyntaxGameToTrue,
    handleSetShowStudyTimerModalToTrue,
    handleToggleFocusMode,
    handleToggleIsFabExpanded,
    handleToggleReadingRuler,
    handleToggleShowSocraticChat,
    handleToggleVisualSupports,
    interactionMode,
    isCompareMode,
    isDictationMode,
    dictationStatus,
    isFabExpanded,
    isFluencyMode,
    isLineFocusMode,
    isStudyTimerRunning,
    isTeacherMode,
    readingRuler,
    runTour,
    setFocusedParagraphIndex,
    setInteractionMode,
    setIsCompareMode,
    setIsDictationMode,
    setIsFluencyMode,
    setIsLineFocusMode,
    setRevisionData,
    setSelectionMenu,
    showSocraticChat,
    showVisualSupports,
    stopPlayback,
    studentProjectSettings,
    studentAiFeaturesHidden,
    t
  } = props;
  const panelRef = React.useRef(null);
  const toggleRef = React.useRef(null);
  const dictationPhase = dictationStatus?.state || (isDictationMode ? "listening" : "idle");
  const dictationEngineLabel = dictationStatus?.engineLabel || "";
  const dictationBusy = dictationPhase === "starting" || dictationPhase === "transcribing";
  React.useEffect(() => {
    if (!isFabExpanded) return void 0;
    const focusTimer = window.setTimeout(() => {
      const firstTool = panelRef.current?.querySelector("button:not([disabled])");
      if (firstTool) firstTool.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [isFabExpanded]);
  const handlePanelKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    handleToggleIsFabExpanded();
    toggleRef.current?.focus();
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("style", null, `
        body.alloflow-launchpad-active .alloflow-fab-stack {
          display: none !important;
        }
        @media (max-width: 640px) {
          .alloflow-fab-stack {
            right: calc(12px + env(safe-area-inset-right, 0px)) !important;
            bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important;
            gap: 10px !important;
          }
          .alloflow-fab-panel {
            position: fixed !important;
            left: 12px !important;
            right: 12px !important;
            bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important;
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(44px, 1fr)) !important;
            align-items: center !important;
            gap: 10px !important;
            max-height: 46vh !important;
            overflow-y: auto !important;
            border-radius: 18px !important;
            padding: 12px !important;
          }
          .alloflow-fab-panel button {
            width: 100% !important;
            min-width: 44px !important;
            min-height: 44px !important;
            aspect-ratio: 1 / 1 !important;
            justify-content: center !important;
            padding: 0 !important;
          }
          .alloflow-fab-panel .fab-label {
            display: none !important;
          }
          .alloflow-fab-panel .fab-section-label,
          .alloflow-fab-panel .fab-divider {
            grid-column: 1 / -1 !important;
          }
        }
      `), /* @__PURE__ */ React.createElement("div", { "data-floating-control": "fab-stack", style: { zIndex: 180 }, className: `alloflow-floating-control alloflow-fab-stack fixed bottom-24 md:bottom-8 z-[180] flex flex-col items-end gap-4 no-print transition-all duration-300 motion-reduce:transition-none ${runTour ? "right-[530px]" : "right-6"}` }, isFabExpanded && /* @__PURE__ */ React.createElement(
    "div",
    {
      id: "alloflow-student-tools-panel",
      ref: panelRef,
      role: "group",
      "aria-label": "Student tools",
      onKeyDown: handlePanelKeyDown,
      "data-help-toggle": "true",
      className: "alloflow-fab-panel flex flex-col gap-3 p-3 bg-white/90 backdrop-blur-md border border-slate-400 shadow-2xl rounded-full animate-in slide-in-from-bottom-4 fade-in duration-200 motion-reduce:animate-none max-h-[75vh] overflow-y-auto custom-scrollbar"
    },
    !isTeacherMode && !studentAiFeaturesHidden && studentProjectSettings.allowSocraticTutor && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleShowSocraticChat,
        className: `px-4 py-3 rounded-full transition-all shadow-sm flex items-center gap-2 ${showSocraticChat ? "bg-teal-700 text-white ring-2 ring-teal-400" : "bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-200"}`,
        title: t("socratic.title"),
        "aria-label": t("socratic.ask_for_help"),
        "aria-pressed": showSocraticChat,
        "data-help-key": "socratic_toggle"
      },
      /* @__PURE__ */ React.createElement(MessageCircleQuestion, { size: 20, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", { className: "fab-label text-sm font-bold" }, t("socratic.ask_for_help"))
    ),
    activeView === "simplified" && generatedContent && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "fab-section-label text-[11px] font-black text-slate-600 uppercase text-center tracking-widest pt-1" }, t("simplified.mode_label")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setInteractionMode("read");
          stopPlayback();
          setSelectionMenu(null);
          setRevisionData(null);
          setIsCompareMode(false);
          setIsFluencyMode(false);
        },
        className: `p-3 rounded-full transition-all shadow-sm ${interactionMode === "read" && !isCompareMode && !isFluencyMode ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("simplified.tip_read"),
        "aria-label": t("simplified.read_mode"),
        "aria-pressed": interactionMode === "read" && !isCompareMode && !isFluencyMode,
        "data-help-key": "tool_read_mode"
      },
      /* @__PURE__ */ React.createElement(Volume2, { size: 20, "aria-hidden": "true" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setInteractionMode("define");
          stopPlayback();
          setSelectionMenu(null);
          setRevisionData(null);
          setIsCompareMode(false);
        },
        className: `p-3 rounded-full transition-all shadow-sm ${interactionMode === "define" && !isCompareMode ? "bg-yellow-100 text-yellow-800 ring-2 ring-yellow-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("simplified.tip_define"),
        "aria-label": t("simplified.define_mode"),
        "aria-pressed": interactionMode === "define" && !isCompareMode,
        "data-help-key": "tool_define_mode"
      },
      /* @__PURE__ */ React.createElement(Search, { size: 20, "aria-hidden": "true" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "data-help-toggle": "true",
        onClick: () => {
          setInteractionMode((prev) => prev === "explain" ? "read" : "explain");
          stopPlayback();
          setIsCompareMode(false);
        },
        className: `p-3 rounded-full transition-all shadow-sm ${interactionMode === "explain" && !isCompareMode ? "bg-teal-100 text-teal-800 ring-2 ring-teal-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("simplified.tip_explain"),
        "aria-label": t("simplified.explain_mode"),
        "aria-pressed": interactionMode === "explain" && !isCompareMode,
        "data-help-key": "tool_explain_mode"
      },
      /* @__PURE__ */ React.createElement(HelpCircle, { size: 20, "aria-hidden": "true" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleSetIsSyntaxGameToTrue,
        className: "p-3 rounded-full transition-all shadow-sm bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200",
        title: t("simplified.tip_scramble"),
        "aria-label": t("games.syntax.title"),
        "data-help-key": "tool_syntax_game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 20, "aria-hidden": "true" })
    ), /* @__PURE__ */ React.createElement("div", { className: "fab-divider h-px w-full bg-slate-200 my-1", "aria-hidden": "true" })),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleReadingRuler,
        className: `p-3 rounded-full transition-all shadow-sm ${readingRuler ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("a11y.toggle_ruler"),
        "aria-label": t("a11y.toggle_ruler"),
        "aria-pressed": readingRuler,
        "data-help-key": "fab_ruler"
      },
      /* @__PURE__ */ React.createElement(ScanLine, { size: 20, "aria-hidden": "true" })
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleSetShowStudyTimerModalToTrue,
        className: `p-3 rounded-full transition-all shadow-sm ${isStudyTimerRunning ? "bg-green-100 text-green-700 ring-2 ring-green-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("a11y.task_timer"),
        "aria-label": t("a11y.task_timer"),
        "aria-pressed": isStudyTimerRunning,
        "data-help-key": "fab_timer"
      },
      /* @__PURE__ */ React.createElement(Clock, { size: 20, "aria-hidden": "true" })
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleFocusMode,
        className: `p-3 rounded-full transition-all shadow-sm ${focusMode ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("a11y.toggle_focus"),
        "aria-label": t("a11y.toggle_focus"),
        "aria-pressed": focusMode,
        "data-help-key": "fab_focus"
      },
      /* @__PURE__ */ React.createElement(Eye, { size: 20, "aria-hidden": "true" })
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleVisualSupports,
        className: `p-3 rounded-full transition-all shadow-sm ${showVisualSupports ? "bg-purple-100 text-purple-600 ring-2 ring-purple-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("fab.visual_supports") || "Visual Supports",
        "aria-label": t("fab.visual_supports") || "Visual Supports",
        "aria-pressed": showVisualSupports
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20, lineHeight: 1 }, "aria-hidden": "true" }, "\u{1F5BC}\uFE0F")
    ),
    activeView === "simplified" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsLineFocusMode(!isLineFocusMode);
          setFocusedParagraphIndex(null);
        },
        className: `p-3 rounded-full transition-all shadow-sm ${isLineFocusMode ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("a11y.toggle_line_focus"),
        "aria-label": t("a11y.toggle_line_focus"),
        "aria-pressed": isLineFocusMode,
        "data-help-key": "fab_line_focus"
      },
      /* @__PURE__ */ React.createElement(AlignJustify, { size: 20, "aria-hidden": "true" })
    ),
    (isTeacherMode || studentProjectSettings.allowDictation) && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.preventDefault();
          const voice = window.AlloFlowVoice;
          const supported = voice && typeof voice.isDictationSupported === "function" ? voice.isDictationSupported() : !!(window.SpeechRecognition || window.webkitSpeechRecognition);
          if (!supported) {
            addToast(t("roles.voice_not_supported"), "error");
            return;
          }
          setIsDictationMode(!isDictationMode);
        },
        disabled: dictationPhase === "transcribing",
        className: `p-3 rounded-full transition-all shadow-sm disabled:cursor-wait ${isDictationMode || dictationBusy ? "bg-red-700 text-white animate-pulse motion-reduce:animate-none shadow-red-500/50" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: [t("toolbar.dictation_toggle"), dictationEngineLabel].filter(Boolean).join(" \u2014 "),
        "aria-label": isDictationMode ? t("toolbar.dictation_stop") : t("toolbar.dictation_start"),
        "aria-pressed": isDictationMode,
        "aria-busy": dictationBusy,
        "data-dictation-engine": dictationStatus?.engine || "",
        "data-help-key": "fab_dictation"
      },
      isDictationMode || dictationBusy ? /* @__PURE__ */ React.createElement(Mic, { size: 20, "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(MicOff, { size: 20, "aria-hidden": "true" })
    ),
    dictationStatus && dictationPhase !== "idle" && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: `fab-section-label max-w-44 px-2 text-center text-[10px] leading-tight ${dictationPhase === "error" ? "text-rose-700" : "text-slate-700"}` }, /* @__PURE__ */ React.createElement("div", { className: "font-bold" }, dictationStatus.message || dictationEngineLabel), dictationStatus.privacy && /* @__PURE__ */ React.createElement("div", { className: "mt-0.5 text-slate-600" }, dictationStatus.privacy))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      ref: toggleRef,
      type: "button",
      "aria-expanded": isFabExpanded,
      "aria-controls": "alloflow-student-tools-panel",
      onClick: handleToggleIsFabExpanded,
      className: "w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 motion-reduce:transform-none",
      "aria-label": isFabExpanded ? t("toolbar.student_tools_close") : t("toolbar.student_tools_open"),
      "data-help-key": "fab_toggle"
    },
    /* @__PURE__ */ React.createElement(Wrench, { size: 24, "aria-hidden": "true" })
  )));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FabStack = { FabStack: FabStack };
  console.log('[CDN] FabStack loaded');
})();
