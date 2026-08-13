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
  const dictationAnnouncement = dictationStatus?.message || (dictationPhase !== "idle" ? dictationEngineLabel : "");
  const dictationActionLabel = isDictationMode ? t("toolbar.dictation_stop") : t("toolbar.dictation_start");
  const dictationIsActive = isDictationMode || dictationBusy;
  const showInputAndPractice = !isTeacherMode && !studentAiFeaturesHidden && studentProjectSettings.allowSocraticTutor || activeView === "simplified" && generatedContent || isTeacherMode || studentProjectSettings.allowDictation || dictationStatus && dictationAnnouncement;
  React.useEffect(() => {
    if (!isFabExpanded) return void 0;
    const focusTimer = window.setTimeout(() => {
      const firstTool = panelRef.current?.querySelector('[data-student-tool="true"]:not([disabled])');
      if (firstTool) firstTool.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [isFabExpanded]);
  const closeStudentTools = () => {
    if (!isFabExpanded) return;
    handleToggleIsFabExpanded();
    window.setTimeout(() => toggleRef.current?.focus(), 0);
  };
  const handlePanelKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeStudentTools();
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("style", null, `
        body.alloflow-launchpad-active .alloflow-fab-stack {
          display: none !important;
        }

        .alloflow-student-tools-panel {
          position: absolute;
          z-index: 2;
          right: 0;
          bottom: 64px;
          width: min(380px, calc(100vw - 32px));
          max-height: min(72vh, 680px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.46);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 26px 70px -28px rgba(15, 23, 42, 0.52), 0 12px 28px -18px rgba(79, 70, 229, 0.34);
          transform-origin: bottom right;
        }
        .alloflow-student-tools-handle {
          display: none;
        }
        .alloflow-student-tools-body {
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
        }
        .alloflow-student-tools-section + .alloflow-student-tools-section {
          border-top: 1px solid rgba(226, 232, 240, 0.9);
        }
        .alloflow-student-tools-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .alloflow-student-tool {
          width: 100%;
          min-width: 0;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(226, 232, 240, 0.94);
          border-radius: 14px;
          padding: 9px 10px;
          text-align: left;
        }
        .alloflow-student-tool-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.58);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
        }
        .alloflow-student-tool:focus-visible,
        .alloflow-student-tools-close:focus-visible,
        .alloflow-student-tools-launcher:focus-visible {
          outline: 3px solid #818cf8;
          outline-offset: 3px;
        }
        .alloflow-student-tools-close {
          min-width: 44px;
          min-height: 44px;
        }
        .alloflow-student-tools-launcher {
          position: relative;
          z-index: 1;
          min-width: 48px;
          min-height: 48px;
        }

        @media (max-width: 767px) {
          .alloflow-fab-stack {
            right: calc(12px + env(safe-area-inset-right, 0px)) !important;
            bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .alloflow-student-tools-panel {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-height: min(82dvh, 720px) !important;
            border-right: 0 !important;
            border-bottom: 0 !important;
            border-left: 0 !important;
            border-radius: 26px 26px 0 0 !important;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            transform-origin: bottom center;
          }
          .alloflow-student-tools-handle {
            display: block;
          }
        }

        @media (max-width: 359px) {
          .alloflow-student-tools-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .alloflow-student-tools-panel,
          .alloflow-student-tool,
          .alloflow-student-tools-close,
          .alloflow-student-tools-launcher {
            animation: none !important;
            scroll-behavior: auto !important;
            transition: none !important;
            transform: none !important;
          }
        }

        @media (forced-colors: active) {
          .alloflow-student-tools-panel,
          .alloflow-student-tools-section,
          .alloflow-student-tool,
          .alloflow-student-tools-close,
          .alloflow-student-tools-launcher {
            border: 1px solid ButtonBorder !important;
            background: Canvas !important;
            color: CanvasText !important;
            box-shadow: none !important;
            forced-color-adjust: auto;
          }
          .alloflow-student-tool[aria-pressed="true"] {
            outline: 2px solid Highlight;
            outline-offset: -3px;
          }
        }
      `), /* @__PURE__ */ React.createElement(
    "div",
    {
      "data-floating-control": "fab-stack",
      style: { zIndex: 180 },
      className: `alloflow-floating-control alloflow-fab-stack ${isFabExpanded ? "is-expanded" : ""} fixed bottom-24 md:bottom-8 z-[180] flex flex-col items-end no-print transition-all duration-300 motion-reduce:transition-none ${runTour ? "right-[530px]" : "right-6"}`
    },
    isFabExpanded && /* @__PURE__ */ React.createElement(
      "div",
      {
        id: "alloflow-student-tools-panel",
        ref: panelRef,
        role: "dialog",
        "aria-labelledby": "alloflow-student-tools-title",
        onKeyDown: handlePanelKeyDown,
        "data-help-toggle": "true",
        className: "alloflow-student-tools-panel backdrop-blur-xl animate-in slide-in-from-bottom-3 fade-in duration-200 motion-reduce:animate-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-handle mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300", "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 border-b border-slate-200/80 px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 shadow-inner", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Wrench, { size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("h2", { id: "alloflow-student-tools-title", className: "text-sm font-black tracking-tight text-slate-900" }, "Student tools"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-xs font-medium text-slate-500" }, "Read, focus, and practice your way")), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: closeStudentTools,
          className: "alloflow-student-tools-close inline-flex items-center justify-center rounded-xl text-2xl leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 motion-reduce:transition-none",
          "aria-label": t("toolbar.student_tools_close")
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\xD7")
      )),
      /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-body custom-scrollbar" }, activeView === "simplified" && generatedContent && /* @__PURE__ */ React.createElement("section", { className: "alloflow-student-tools-section px-4 py-3", "aria-labelledby": "alloflow-student-tools-read-heading" }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("h3", { id: "alloflow-student-tools-read-heading", className: "text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" }, "Read"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold text-slate-400" }, t("simplified.mode_label"))), /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-grid" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: () => {
            setInteractionMode("read");
            stopPlayback();
            setSelectionMenu(null);
            setRevisionData(null);
            setIsCompareMode(false);
            setIsFluencyMode(false);
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${interactionMode === "read" && !isCompareMode && !isFluencyMode ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("simplified.tip_read"),
          "aria-label": t("simplified.read_mode"),
          "aria-pressed": interactionMode === "read" && !isCompareMode && !isFluencyMode,
          "data-help-key": "tool_read_mode"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Volume2, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("simplified.read_mode"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: () => {
            setInteractionMode("define");
            stopPlayback();
            setSelectionMenu(null);
            setRevisionData(null);
            setIsCompareMode(false);
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${interactionMode === "define" && !isCompareMode ? "bg-yellow-100 text-yellow-900 ring-2 ring-yellow-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("simplified.tip_define"),
          "aria-label": t("simplified.define_mode"),
          "aria-pressed": interactionMode === "define" && !isCompareMode,
          "data-help-key": "tool_define_mode"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Search, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("simplified.define_mode"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          "data-help-toggle": "true",
          onClick: () => {
            setInteractionMode((prev) => prev === "explain" ? "read" : "explain");
            stopPlayback();
            setIsCompareMode(false);
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${interactionMode === "explain" && !isCompareMode ? "bg-teal-100 text-teal-900 ring-2 ring-teal-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("simplified.tip_explain"),
          "aria-label": t("simplified.explain_mode"),
          "aria-pressed": interactionMode === "explain" && !isCompareMode,
          "data-help-key": "tool_explain_mode"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(HelpCircle, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("simplified.explain_mode"))
      ))), /* @__PURE__ */ React.createElement("section", { className: "alloflow-student-tools-section px-4 py-3", "aria-labelledby": "alloflow-student-tools-focus-heading" }, /* @__PURE__ */ React.createElement("h3", { id: "alloflow-student-tools-focus-heading", className: "mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" }, "Focus"), /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-grid" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleReadingRuler,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${readingRuler ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("a11y.toggle_ruler"),
          "aria-label": t("a11y.toggle_ruler"),
          "aria-pressed": readingRuler,
          "data-help-key": "fab_ruler"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(ScanLine, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("a11y.toggle_ruler"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleSetShowStudyTimerModalToTrue,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${isStudyTimerRunning ? "bg-green-100 text-green-800 ring-2 ring-green-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("a11y.task_timer"),
          "aria-label": t("a11y.task_timer"),
          "aria-pressed": isStudyTimerRunning,
          "data-help-key": "fab_timer"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Clock, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("a11y.task_timer"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleFocusMode,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${focusMode ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("a11y.toggle_focus"),
          "aria-label": t("a11y.toggle_focus"),
          "aria-pressed": focusMode,
          "data-help-key": "fab_focus"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Eye, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("a11y.toggle_focus"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleVisualSupports,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${showVisualSupports ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("fab.visual_supports") || "Visual Supports",
          "aria-label": t("fab.visual_supports") || "Visual Supports",
          "aria-pressed": showVisualSupports
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18, lineHeight: 1 } }, "\u{1F5BC}\uFE0F")),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("fab.visual_supports") || "Visual Supports")
      ), activeView === "simplified" && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: () => {
            setIsLineFocusMode(!isLineFocusMode);
            setFocusedParagraphIndex(null);
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${isLineFocusMode ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("a11y.toggle_line_focus"),
          "aria-label": t("a11y.toggle_line_focus"),
          "aria-pressed": isLineFocusMode,
          "data-help-key": "fab_line_focus"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(AlignJustify, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("a11y.toggle_line_focus"))
      ))), showInputAndPractice && /* @__PURE__ */ React.createElement("section", { className: "alloflow-student-tools-section px-4 py-3", "aria-labelledby": "alloflow-student-tools-input-heading" }, /* @__PURE__ */ React.createElement("h3", { id: "alloflow-student-tools-input-heading", className: "mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" }, "Input & practice"), /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-grid" }, !isTeacherMode && !studentAiFeaturesHidden && studentProjectSettings.allowSocraticTutor && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleShowSocraticChat,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${showSocraticChat ? "bg-teal-700 text-white ring-2 ring-teal-400" : "bg-teal-100 text-teal-800 hover:bg-teal-200"}`,
          title: t("socratic.title"),
          "aria-label": t("socratic.ask_for_help"),
          "aria-pressed": showSocraticChat,
          "data-help-key": "socratic_toggle"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(MessageCircleQuestion, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("socratic.ask_for_help"))
      ), activeView === "simplified" && generatedContent && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleSetIsSyntaxGameToTrue,
          className: "alloflow-student-tool border-orange-200 bg-orange-100 text-orange-900 shadow-sm transition-colors hover:bg-orange-200 motion-reduce:transition-none",
          title: t("simplified.tip_scramble"),
          "aria-label": t("games.syntax.title"),
          "data-help-key": "tool_syntax_game"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Gamepad2, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("games.syntax.title"))
      ), (isTeacherMode || studentProjectSettings.allowDictation) && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
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
          className: `alloflow-student-tool transition-colors shadow-sm disabled:cursor-wait motion-reduce:transition-none ${dictationIsActive ? "bg-red-700 text-white animate-pulse motion-reduce:animate-none shadow-red-500/50" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: [t("toolbar.dictation_toggle"), dictationEngineLabel].filter(Boolean).join(" \u2014 "),
          "aria-label": dictationActionLabel,
          "aria-pressed": isDictationMode,
          "aria-busy": dictationBusy,
          "data-dictation-engine": dictationStatus?.engine || "",
          "data-help-key": "fab_dictation"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, dictationIsActive ? /* @__PURE__ */ React.createElement(Mic, { size: 18 }) : /* @__PURE__ */ React.createElement(MicOff, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, dictationActionLabel)
      ), dictationStatus && dictationAnnouncement && /* @__PURE__ */ React.createElement(
        "div",
        {
          role: dictationPhase === "error" ? "alert" : "status",
          "aria-live": dictationPhase === "error" ? "assertive" : "polite",
          "aria-atomic": "true",
          className: `alloflow-student-tools-status col-span-full rounded-xl border px-3 py-2 text-xs leading-snug ${dictationPhase === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-700"}`
        },
        /* @__PURE__ */ React.createElement("div", { className: "font-bold" }, dictationAnnouncement),
        dictationStatus.privacy && /* @__PURE__ */ React.createElement("div", { className: "mt-0.5 text-[11px] text-slate-600" }, dictationStatus.privacy)
      ))))
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        ref: toggleRef,
        type: "button",
        "aria-expanded": isFabExpanded,
        "aria-controls": "alloflow-student-tools-panel",
        "aria-haspopup": "dialog",
        onClick: handleToggleIsFabExpanded,
        className: `alloflow-student-tools-launcher h-12 rounded-2xl px-3.5 text-white shadow-lg flex items-center gap-2.5 transition-all hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none ${dictationIsActive ? "bg-gradient-to-br from-rose-600 to-red-700 shadow-rose-600/30" : "bg-gradient-to-br from-indigo-600 to-violet-700 shadow-indigo-600/30 hover:from-indigo-700 hover:to-violet-800"}`,
        "aria-label": isFabExpanded ? t("toolbar.student_tools_close") : t("toolbar.student_tools_open"),
        "data-dictation-active": dictationIsActive ? "true" : "false",
        "data-help-key": "fab_toggle"
      },
      /* @__PURE__ */ React.createElement(Wrench, { size: 20, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", { className: "text-sm font-black tracking-tight" }, "Student tools"),
      dictationIsActive && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-wide" }, /* @__PURE__ */ React.createElement("span", { className: "h-1.5 w-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none", "aria-hidden": "true" }), dictationPhase === "transcribing" ? "Working" : "Listening")
    )
  ));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FabStack = { FabStack: FabStack };
  console.log('[CDN] FabStack loaded');
})();
