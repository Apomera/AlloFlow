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
    t
  } = props;
  return /* @__PURE__ */ React.createElement("div", { className: `fixed bottom-24 md:bottom-8 z-[10000] flex flex-col items-end gap-4 no-print transition-all duration-300 ${runTour ? "right-[530px]" : "right-6"}` }, isFabExpanded && /* @__PURE__ */ React.createElement(
    "div",
    {
      "data-help-toggle": "true",
      className: "flex flex-col gap-3 p-3 bg-white/90 backdrop-blur-md border border-slate-400 shadow-2xl rounded-full animate-in slide-in-from-bottom-4 fade-in duration-200 max-h-[75vh] overflow-y-auto custom-scrollbar"
    },
    !isTeacherMode && studentProjectSettings.allowSocraticTutor && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleShowSocraticChat,
        className: `px-4 py-3 rounded-full transition-all shadow-sm flex items-center gap-2 ${showSocraticChat ? "bg-teal-700 text-white ring-2 ring-teal-400" : "bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-200"}`,
        title: t("socratic.title"),
        "aria-label": t("socratic.title"),
        "data-help-key": "socratic_toggle"
      },
      /* @__PURE__ */ React.createElement(MessageCircleQuestion, { size: 20 }),
      /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, t("socratic.ask_for_help"))
    ),
    activeView === "simplified" && generatedContent && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black text-slate-600 uppercase text-center tracking-widest pt-1" }, t("simplified.mode_label")), /* @__PURE__ */ React.createElement(
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
        "data-help-key": "tool_read_mode"
      },
      /* @__PURE__ */ React.createElement(Volume2, { size: 20 })
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
        "data-help-key": "tool_define_mode"
      },
      /* @__PURE__ */ React.createElement(Search, { size: 20 })
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
        "data-help-key": "tool_explain_mode"
      },
      /* @__PURE__ */ React.createElement(HelpCircle, { size: 20 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleSetIsSyntaxGameToTrue,
        className: "p-3 rounded-full transition-all shadow-sm bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200",
        title: t("simplified.tip_scramble"),
        "aria-label": t("games.syntax.title"),
        "data-help-key": "tool_syntax_game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 20 })
    ), /* @__PURE__ */ React.createElement("div", { className: "h-px w-full bg-slate-200 my-1" })),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleReadingRuler,
        className: `p-3 rounded-full transition-all shadow-sm ${readingRuler ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("a11y.toggle_ruler"),
        "aria-label": t("a11y.toggle_ruler"),
        "data-help-key": "fab_ruler"
      },
      /* @__PURE__ */ React.createElement(ScanLine, { size: 20 })
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleSetShowStudyTimerModalToTrue,
        className: `p-3 rounded-full transition-all shadow-sm ${isStudyTimerRunning ? "bg-green-100 text-green-700 ring-2 ring-green-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("a11y.task_timer"),
        "aria-label": t("a11y.task_timer"),
        "data-help-key": "fab_timer"
      },
      /* @__PURE__ */ React.createElement(Clock, { size: 20 })
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleFocusMode,
        className: `p-3 rounded-full transition-all shadow-sm ${focusMode ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("a11y.toggle_focus"),
        "aria-label": t("a11y.toggle_focus"),
        "data-help-key": "fab_focus"
      },
      /* @__PURE__ */ React.createElement(Eye, { size: 20 })
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleToggleVisualSupports,
        className: `p-3 rounded-full transition-all shadow-sm ${showVisualSupports ? "bg-purple-100 text-purple-600 ring-2 ring-purple-500" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("fab.visual_supports") || "Visual Supports",
        "aria-label": t("fab.visual_supports") || "Visual Supports"
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20, lineHeight: 1 } }, "\u{1F5BC}\uFE0F")
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
        "data-help-key": "fab_line_focus"
      },
      /* @__PURE__ */ React.createElement(AlignJustify, { size: 20 })
    ),
    (isTeacherMode || studentProjectSettings.allowDictation) && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.preventDefault();
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) {
            addToast(t("roles.voice_not_supported"), "error");
            return;
          }
          setIsDictationMode(!isDictationMode);
        },
        className: `p-3 rounded-full transition-all shadow-sm ${isDictationMode ? "bg-red-700 text-white animate-pulse shadow-red-500/50" : "bg-white text-slate-600 hover:bg-slate-100"}`,
        title: t("toolbar.dictation_toggle"),
        "aria-label": isDictationMode ? t("toolbar.dictation_stop") : t("toolbar.dictation_start"),
        "data-help-key": "fab_dictation"
      },
      isDictationMode ? /* @__PURE__ */ React.createElement(Mic, { size: 20 }) : /* @__PURE__ */ React.createElement(MicOff, { size: 20 })
    )
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleToggleIsFabExpanded,
      className: "w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95",
      "aria-label": isFabExpanded ? t("toolbar.student_tools_close") : t("toolbar.student_tools_open"),
      "data-help-key": "fab_toggle"
    },
    /* @__PURE__ */ React.createElement(Wrench, { size: 24 })
  ));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FabStack = { FabStack: FabStack };
  console.log('[CDN] FabStack loaded');
})();
