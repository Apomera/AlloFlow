(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewMiscModalsModule) { console.log('[CDN] ViewMiscModalsModule already loaded, skipping'); return; }
var React = window.React || React;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useContext = React.useContext;
var Fragment = React.Fragment;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
// Icons used across the 4 modals (de-duplicated):
var Check = _lazyIcon('Check');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronRight = _lazyIcon('ChevronRight');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Clock = _lazyIcon('Clock');
var FileText = _lazyIcon('FileText');
var Globe = _lazyIcon('Globe');
var GripVertical = _lazyIcon('GripVertical');
var Layers = _lazyIcon('Layers');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var UserCheck = _lazyIcon('UserCheck');
var Users = _lazyIcon('Users');
var X = _lazyIcon('X');
var ArrowRight = _lazyIcon('ArrowRight');
var Eye = _lazyIcon('Eye');
var HelpCircle = _lazyIcon('HelpCircle');
var Maximize = _lazyIcon('Maximize');
var Minimize = _lazyIcon('Minimize');
var Save = _lazyIcon('Save');
var Search = _lazyIcon('Search');
var Send = _lazyIcon('Send');
var ShieldCheck = _lazyIcon('ShieldCheck');
var Sparkles = _lazyIcon('Sparkles');
var Zap = _lazyIcon('Zap');
var ImageIcon = _lazyIcon('ImageIcon');
var Unplug = _lazyIcon('Unplug');
var Cpu = _lazyIcon('Cpu');
var Headphones = _lazyIcon('Headphones');
function UDLGuideModal(props) {
  const [chatMenuOpen, setChatMenuOpen] = React.useState(false);
  const [voicePaused, setVoicePaused] = React.useState(false);
  React.useEffect(() => {
    if (!chatMenuOpen) return void 0;
    const onKey = (ev) => {
      if (ev.key === "Escape") setChatMenuOpen(false);
    };
    const onDown = () => setChatMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [chatMenuOpen]);
  const {
    InteractiveBlueprintCard,
    activeBlueprint,
    addToast,
    blueprintExecutionResult,
    setBlueprintExecutionResult,
    isExecutingBlueprint,
    handleStopBlueprintRun,
    archiveLivePlan,
    archivedPlans,
    handleRestoreArchivedPlan,
    handleDeleteArchivedPlan,
    handleRebuildBlueprintStep,
    handleOpenGenerationErrorLog,
    handleCopyBlueprintDiagnostics,
    handleDownloadBlueprintDiagnostics,
    getSafeGenerationFailureReason,
    lessonTemplates,
    handleSaveLessonTemplate,
    handleApplyLessonTemplate,
    handleDeleteLessonTemplate,
    handlePreviewBlueprintStep,
    blueprintPreview,
    closeBlueprintPreview,
    aiStandardQuery,
    aiStandardRegion,
    autoSendVoice,
    chatStyles,
    handleAutoFillToggle,
    handleBlueprintUIUpdate,
    handleExecuteBlueprint,
    handleFindStandards,
    handleSendUDLMessage,
    handleSetShowUDLGuideToFalse,
    handleToggleAutoSendVoice,
    handleToggleIsShowMeMode,
    handleToggleIsUDLGuideExpanded,
    hasUsedAutoFill,
    isAutoFillMode,
    isChatProcessing,
    isConversationMode,
    isFindingStandards,
    isHelpMode,
    isIndependentMode,
    isSavingAdvice,
    isShowMeMode,
    isSpotlightMode,
    isUDLGuideExpanded,
    renderFormattedText,
    saveFullChat,
    saveUDLAdvice,
    setActiveBlueprint,
    setAiStandardQuery,
    setAiStandardRegion,
    setIsBotVisible,
    setIsConversationMode,
    setIsDictationMode,
    setStandardsInput,
    setUdlInput,
    setUdlMessages,
    setUdlStandardFramework,
    setUdlStandardGrade,
    showStemLab,
    showUDLGuide,
    suggestedStandards,
    alloVoiceActive,
    voiceAvailable,
    onToggleVoiceAgent,
    t,
    theme,
    udlInput,
    udlInputRef,
    udlMessages,
    udlScrollRef,
    udlStandardFramework,
    udlStandardGrade
  } = props;
  const stopLegacyDictation = React.useCallback(() => {
    try {
      const voice = window.AlloFlowVoice;
      if (voice && typeof voice.stopActiveDictation === "function") voice.stopActiveDictation(true);
    } catch (_) {
    }
    setIsDictationMode(false);
  }, [setIsDictationMode]);
  const closeGuide = React.useCallback(() => {
    stopLegacyDictation();
    setIsConversationMode(false);
    handleSetShowUDLGuideToFalse();
  }, [handleSetShowUDLGuideToFalse, setIsConversationMode, stopLegacyDictation]);
  React.useEffect(() => {
    if (alloVoiceActive || voicePaused || !showUDLGuide) stopLegacyDictation();
    if (!alloVoiceActive || !showUDLGuide) setIsConversationMode(false);
    if (!alloVoiceActive) setVoicePaused(false);
  }, [alloVoiceActive, setIsConversationMode, showUDLGuide, stopLegacyDictation, voicePaused]);
  const [standardToolsOpen, setStandardToolsOpen] = useState(() => {
    try {
      return localStorage.getItem("allo_udl_standard_tools_open") === "1";
    } catch (_) {
      return false;
    }
  });
  const toggleStandardTools = () => setStandardToolsOpen((prev) => {
    const next = !prev;
    try {
      localStorage.setItem("allo_udl_standard_tools_open", next ? "1" : "0");
    } catch (_) {
    }
    return next;
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  if (!showUDLGuide) return null;
  if (isCollapsed) {
    return /* @__PURE__ */ React.createElement("div", { style: { zIndex: showStemLab ? 10490 : void 0 }, className: `allo-docsuite fixed z-[100] bottom-4 right-4 rounded-2xl shadow-lg overflow-hidden ${chatStyles.container}` }, /* @__PURE__ */ React.createElement("div", { className: `px-3 py-2 flex items-center gap-2 ${chatStyles.header}` }, /* @__PURE__ */ React.createElement(HelpCircle, { size: 16 }), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-sm" }, t("chat_guide.header")), isChatProcessing && /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setIsCollapsed(false),
        className: "hover:bg-white/20 p-1 rounded transition-colors ml-1",
        title: t("chat_guide.restore") || "Restore chat",
        "aria-label": t("chat_guide.restore") || "Restore chat"
      },
      /* @__PURE__ */ React.createElement(Maximize, { size: 16 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: closeGuide,
        className: "hover:bg-white/20 p-1 rounded transition-colors",
        "aria-label": t("common.close")
      },
      /* @__PURE__ */ React.createElement(X, { size: 16 })
    )));
  }
  return /* @__PURE__ */ React.createElement("div", { style: { zIndex: showStemLab ? 10490 : void 0 }, className: `allo-docsuite fixed z-[100] rounded-2xl flex flex-col animate-in fade-in slide-in-from-right-5 duration-300 overflow-hidden transition-all ${isUDLGuideExpanded ? "inset-4 top-24" : "top-24 right-4 bottom-4 w-96"} ${isSpotlightMode ? "opacity-20 hover:opacity-100 pointer-events-none hover:pointer-events-auto" : "opacity-100"} ${chatStyles.container}` }, /* @__PURE__ */ React.createElement("div", { className: `p-4 flex justify-between items-center shrink-0 ${chatStyles.header}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 font-bold" }, /* @__PURE__ */ React.createElement(HelpCircle, { size: 18 }), " ", t("chat_guide.header")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-help-key": "chat_talk",
      "aria-pressed": alloVoiceActive ? "true" : "false",
      onClick: (e) => {
        if (isHelpMode) return;
        e.preventDefault();
        const next = !alloVoiceActive;
        stopLegacyDictation();
        if (typeof onToggleVoiceAgent === "function") onToggleVoiceAgent();
        setVoicePaused(false);
        setIsConversationMode(false);
        if (next) setIsBotVisible(true);
        let seenHint = false;
        try {
          seenHint = !!localStorage.getItem("allo_agent_voice_hint_v1");
        } catch (_) {
        }
        if (next && !seenHint) {
          try {
            localStorage.setItem("allo_agent_voice_hint_v1", "1");
          } catch (_) {
          }
          setUdlMessages((prev) => [...prev, { role: "model", text: t("chat_guide.talk_hint") || "Listening for app commands. Try \u201Copen the learning hub\u201D, \u201Cread this page\u201D, or \u201Cwhere is the export button?\u201D. Say \u201Cpause listening\u201D to pause AlloBot commands or \u201Cstop listening\u201D to finish. To ask a question or request several steps, type below; typed multi-step requests get a plan card you review before anything runs. Privacy note: AlloBot uses your selected recognition engine. A browser speech service may send command audio to its provider; on-device Whisper keeps recognition audio on this device." }]);
        }
      },
      className: `hover:bg-white/20 px-2 py-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${alloVoiceActive ? voicePaused ? "bg-amber-400 text-indigo-900 border-amber-500" : "bg-red-600 text-white border-red-400 animate-pulse" : "border-white/40"}`,
      title: alloVoiceActive ? voicePaused ? t("chat_guide.talk_stop_paused_tooltip", "Stop the paused AlloBot voice session") : t("chat_guide.talk_stop_tooltip", "Stop AlloBot command listening") : t("chat_guide.talk_start_tooltip", "Start AlloBot command listening")
    },
    /* @__PURE__ */ React.createElement(Headphones, { size: 12 }),
    " ",
    alloVoiceActive ? voicePaused ? t("chat_guide.talk_paused", "Paused") : t("chat_guide.talk_on") || "Listening" : t("chat_guide.talk") || "Talk"
  ), alloVoiceActive && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-help-key": "chat_talk_pause",
      "aria-pressed": voicePaused ? "true" : "false",
      onClick: () => {
        stopLegacyDictation();
        const loop = window.__alloVoiceLoop;
        if (!loop) return;
        if (voicePaused) {
          Promise.resolve(loop.resume()).then((ok) => setVoicePaused(!ok));
        } else {
          loop.pause();
          setVoicePaused(true);
        }
      },
      className: `hover:bg-white/20 px-2 py-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${voicePaused ? "bg-amber-400 text-indigo-900 border-amber-500" : "border-white/40"}`,
      title: voicePaused ? t("chat_guide.resume_tooltip", "Resume AlloBot command listening") : t("chat_guide.pause_tooltip", "Pause AlloBot command listening and release its microphone session")
    },
    voicePaused ? t("chat_guide.resume", "Resume") : t("chat_guide.pause", "Pause")
  ), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-help-key": "chat_more",
      "aria-haspopup": "true",
      "aria-expanded": chatMenuOpen ? "true" : "false",
      "aria-label": t("chat_guide.more_actions", "More chat options"),
      onClick: () => setChatMenuOpen((v) => !v),
      className: "hover:bg-white/20 p-1 rounded transition-colors mr-1",
      title: t("chat_guide.more_actions", "More chat options")
    },
    /* @__PURE__ */ React.createElement(ChevronDown, { size: 18 })
  ), chatMenuOpen && /* @__PURE__ */ React.createElement("div", { role: "menu", className: "absolute right-0 z-50 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-1 text-slate-800 shadow-xl" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      role: "menuitemcheckbox",
      "aria-checked": isShowMeMode ? "true" : "false",
      type: "button",
      onClick: () => {
        handleToggleIsShowMeMode();
        setChatMenuOpen(false);
      },
      className: "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-100"
    },
    /* @__PURE__ */ React.createElement(Eye, { size: 14, className: "mt-0.5 shrink-0" }),
    /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, t("chat_guide.show_me", "Point things out on screen")), /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-slate-500" }, isShowMeMode ? t("common.on", "On") : t("common.off", "Off"), " \u2014 ", t("chat_guide.show_me_desc", "Asking \u201Cwhere is\u2026\u201D always points, with or without this.")))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      role: "menuitem",
      type: "button",
      onClick: () => {
        saveFullChat();
        setChatMenuOpen(false);
      },
      className: "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-100"
    },
    /* @__PURE__ */ React.createElement(Save, { size: 14, className: "mt-0.5 shrink-0" }),
    /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, t("chat_guide.save_chat", "Save this chat"))
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.minimize"),
      "data-help-key": "chat_expand",
      onClick: handleToggleIsUDLGuideExpanded,
      className: "hover:bg-white/20 p-1 rounded transition-colors",
      title: isUDLGuideExpanded ? t("common.minimize") : t("common.maximize")
    },
    isUDLGuideExpanded ? /* @__PURE__ */ React.createElement(Minimize, { size: 18 }) : /* @__PURE__ */ React.createElement(Maximize, { size: 18 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-help-key": "chat_collapse",
      onClick: () => setIsCollapsed(true),
      className: "hover:bg-white/20 p-1 rounded transition-colors",
      title: t("chat_guide.collapse") || "Collapse to a bar (keeps the conversation)",
      "aria-label": t("chat_guide.collapse") || "Collapse to a bar (keeps the conversation)"
    },
    /* @__PURE__ */ React.createElement(ChevronDown, { size: 18 })
  ), /* @__PURE__ */ React.createElement("button", { "data-help-key": "chat_close", onClick: closeGuide, className: "hover:bg-white/20 p-1 rounded", "aria-label": t("common.close") }, /* @__PURE__ */ React.createElement(X, { size: 18 })))), /* @__PURE__ */ React.createElement("div", { className: `flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar ${chatStyles.body}`, ref: udlScrollRef }, udlMessages.map((msg, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: `flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}` }, !msg.type && /* @__PURE__ */ React.createElement("div", { className: `max-w-[85%] p-3 rounded-xl text-sm shadow-sm ${msg.role === "user" ? `${chatStyles.userBubble} rounded-br-none` : `${chatStyles.modelBubble} rounded-bl-none`}` }, renderFormattedText(msg.text)), msg.type === "blueprint" && activeBlueprint && /* @__PURE__ */ React.createElement("div", { className: "w-full" }, /* @__PURE__ */ React.createElement(
    InteractiveBlueprintCard,
    {
      config: activeBlueprint,
      run: blueprintExecutionResult,
      isRunning: !!isExecutingBlueprint,
      onStopRun: handleStopBlueprintRun,
      onRebuildStep: handleRebuildBlueprintStep,
      onOpenErrorLog: handleOpenGenerationErrorLog,
      onCopyDiagnostics: handleCopyBlueprintDiagnostics,
      onDownloadDiagnostics: handleDownloadBlueprintDiagnostics,
      summarizeFailureReason: getSafeGenerationFailureReason,
      onSaveTemplate: handleSaveLessonTemplate,
      onPreviewStep: handlePreviewBlueprintStep,
      onUpdate: handleBlueprintUIUpdate,
      onConfirm: handleExecuteBlueprint,
      onCancel: () => {
        if (isExecutingBlueprint) {
          addToast(t("blueprint.cancel_while_running") || "This plan is still generating. Wait for it to finish.", "info");
          return;
        }
        if (typeof archiveLivePlan === "function") archiveLivePlan();
        setUdlMessages((prev) => [...prev, { role: "model", text: t("blueprint.cancel_msg") }]);
        setActiveBlueprint(null);
        if (typeof setBlueprintExecutionResult === "function") setBlueprintExecutionResult(null);
      }
    }
  )), msg.type === "choices" && /* @__PURE__ */ React.createElement("div", { className: `max-w-[92%] p-3 rounded-xl text-sm shadow-sm ${chatStyles.modelBubble} rounded-bl-none` }, renderFormattedText(msg.text), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mt-3", role: "group", "aria-label": t("chat_guide.header") }, (msg.choices || []).map((choice, cIdx) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: cIdx,
      type: "button",
      disabled: isChatProcessing || idx !== udlMessages.length - 1,
      title: choice.hint || void 0,
      "aria-label": choice.hint ? `${choice.label} \u2014 ${choice.hint}` : void 0,
      onClick: () => {
        if (choice.action === "focus-input") {
          setUdlInput("");
          if (udlInputRef && udlInputRef.current) udlInputRef.current.focus();
          return;
        }
        handleSendUDLMessage(choice.value);
      },
      className: `px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${choice.tone === "secondary" ? chatStyles.secondaryButton : chatStyles.button}`
    },
    choice.label
  ))), idx === udlMessages.length - 1 && /* @__PURE__ */ React.createElement("p", { className: `mt-2 text-[11px] italic ${chatStyles.subText}` }, t("chat_guide.chips.or_type") || "\u2026or just type your answer below.")), !msg.type && msg.role === "model" && msg.isActionable && idx > 0 && /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.refresh"),
      "data-help-key": "chat_save_advice_btn",
      onClick: () => saveUDLAdvice(msg.text, udlMessages[idx - 1]?.role === "user" ? udlMessages[idx - 1].text : "Teacher Inquiry"),
      disabled: isSavingAdvice,
      className: `mt-1 text-[11px] flex items-center gap-1 font-medium px-2 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${chatStyles.secondaryButton}`
    },
    isSavingAdvice ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Save, { size: 10 }),
    isSavingAdvice ? t("chat_guide.save_actionable_loading") : t("chat_guide.save_actionable_btn")
  ))), !activeBlueprint && Array.isArray(lessonTemplates) && lessonTemplates.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "w-full", "data-testid": "bp-template-picker" }, /* @__PURE__ */ React.createElement("p", { className: `text-[11px] mb-1 ${chatStyles.subText}` }, t("blueprint.template_picker_title") || "Start from one of your templates:"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-1" }, lessonTemplates.slice(0, 8).map((tpl) => /* @__PURE__ */ React.createElement("li", { key: tpl.id, className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-testid": "bp-template-apply",
      "data-help-key": "blueprint_template_apply_btn",
      onClick: () => handleApplyLessonTemplate(tpl.id),
      className: `flex-grow text-left text-xs px-2 py-1.5 rounded border transition-colors ${chatStyles.secondaryButton}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, tpl.name),
    /* @__PURE__ */ React.createElement("span", { className: "opacity-70 ml-2" }, (() => {
      const _n = Array.isArray(tpl.resourcePlan) ? tpl.resourcePlan.length : 0;
      const _word = _n === 1 ? t("blueprint.template_step_count_one") || "step" : t("blueprint.template_step_count") || "steps";
      return _n + " " + _word;
    })())
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-testid": "bp-template-delete",
      onClick: () => handleDeleteLessonTemplate(tpl.id),
      "aria-label": `${t("blueprint.template_delete") || "Delete template"}: ${tpl.name}`,
      title: t("blueprint.template_delete") || "Delete template",
      className: "text-xs px-2 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
    },
    "\xD7"
  ))))), !activeBlueprint && Array.isArray(archivedPlans) && archivedPlans.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "w-full", "data-testid": "bp-archive-picker" }, /* @__PURE__ */ React.createElement("p", { className: `text-[11px] mb-1 ${chatStyles.subText}` }, t("blueprint.archive_title") || "Previous plans:"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-1" }, archivedPlans.slice(0, 8).map((rec) => /* @__PURE__ */ React.createElement("li", { key: rec.id, className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-testid": "bp-archive-restore",
      "data-help-key": "blueprint_archive_restore_btn",
      onClick: () => handleRestoreArchivedPlan(rec.id),
      className: `flex-grow text-left text-xs px-2 py-1.5 rounded border transition-colors ${chatStyles.secondaryButton}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, rec.name),
    /* @__PURE__ */ React.createElement("span", { className: "opacity-70 ml-2" }, rec.stats ? `${rec.stats.landed}/${rec.stats.total} ${t("blueprint.archive_landed") || "landed"}` : "", rec.savedAt ? ` \xB7 ${String(rec.savedAt).slice(0, 10)}` : "")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-testid": "bp-archive-delete",
      "data-help-key": "blueprint_archive_delete_btn",
      onClick: () => handleDeleteArchivedPlan(rec.id),
      "aria-label": `${t("blueprint.archive_delete") || "Delete archived plan"}: ${rec.name}`,
      title: t("blueprint.archive_delete") || "Delete archived plan",
      className: "text-xs px-2 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
    },
    "\xD7"
  ))))), activeBlueprint && !(udlMessages || []).some((m) => m && m.type === "blueprint") && /* @__PURE__ */ React.createElement("div", { className: "w-full" }, /* @__PURE__ */ React.createElement("p", { className: `text-[11px] mb-1 ${chatStyles.subText}` }, t("blueprint.restored_notice") || "Your saved lesson plan:"), /* @__PURE__ */ React.createElement(
    InteractiveBlueprintCard,
    {
      config: activeBlueprint,
      run: blueprintExecutionResult,
      isRunning: !!isExecutingBlueprint,
      onStopRun: handleStopBlueprintRun,
      onRebuildStep: handleRebuildBlueprintStep,
      onOpenErrorLog: handleOpenGenerationErrorLog,
      onCopyDiagnostics: handleCopyBlueprintDiagnostics,
      onDownloadDiagnostics: handleDownloadBlueprintDiagnostics,
      summarizeFailureReason: getSafeGenerationFailureReason,
      onSaveTemplate: handleSaveLessonTemplate,
      onPreviewStep: handlePreviewBlueprintStep,
      onUpdate: handleBlueprintUIUpdate,
      onConfirm: handleExecuteBlueprint,
      onCancel: () => {
        if (isExecutingBlueprint) {
          addToast(t("blueprint.cancel_while_running") || "This plan is still generating. Wait for it to finish.", "info");
          return;
        }
        if (typeof archiveLivePlan === "function") archiveLivePlan();
        setActiveBlueprint(null);
        if (typeof setBlueprintExecutionResult === "function") setBlueprintExecutionResult(null);
      }
    }
  )), isChatProcessing && /* @__PURE__ */ React.createElement("div", { className: "flex items-start" }, /* @__PURE__ */ React.createElement("div", { className: `p-3 rounded-xl rounded-bl-none flex items-center gap-2 text-sm ${chatStyles.modelBubble}` }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), " ", t("bot.mood_thinking")))), blueprintPreview && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `absolute inset-0 z-20 flex flex-col ${theme === "dark" ? "bg-slate-900" : "bg-white"}`,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("blueprint.preview_step") || "Preview this resource",
      "data-testid": "bp-preview-overlay"
    },
    /* @__PURE__ */ React.createElement("div", { className: `p-3 flex items-center justify-between shrink-0 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"}` }, /* @__PURE__ */ React.createElement("span", { className: `text-sm font-bold ${chatStyles.text}` }, blueprintPreview.itemTitle || blueprintPreview.title), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "data-testid": "bp-preview-close",
        onClick: closeBlueprintPreview,
        "aria-label": t("common.close"),
        className: "hover:bg-slate-500/20 p-1 rounded transition-colors"
      },
      /* @__PURE__ */ React.createElement(X, { size: 18 })
    )),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-auto p-4 custom-scrollbar" }, blueprintPreview.missing ? /* @__PURE__ */ React.createElement("p", { className: `text-sm ${chatStyles.subText}`, "data-testid": "bp-preview-missing" }, t("blueprint.preview_missing") || "That resource is no longer in this workspace. Rebuild the step to make it again.") : blueprintPreview.unsupported ? (
      // generateResourceHTML has no branch for some types and returns
      // '' — say so rather than showing an empty white box.
      /* @__PURE__ */ React.createElement("p", { className: `text-sm ${chatStyles.subText}`, "data-testid": "bp-preview-unsupported" }, t("blueprint.preview_unsupported") || "This resource type opens in its own view rather than a preview.")
    ) : /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "allo-preview-body text-sm",
        "data-testid": "bp-preview-body",
        dangerouslySetInnerHTML: { __html: blueprintPreview.html }
      }
    ))
  ), /* @__PURE__ */ React.createElement("div", { className: `p-3 border-t ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${chatStyles.inputArea}` }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: toggleStandardTools,
      "aria-expanded": standardToolsOpen,
      "aria-controls": "udl-standard-tools",
      "data-help-key": "chat_standard_tools_toggle",
      className: `w-full mb-2 flex items-center gap-1.5 px-1 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${chatStyles.subText} hover:opacity-100 opacity-80`
    },
    standardToolsOpen ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 12 }) : /* @__PURE__ */ React.createElement(ChevronRight, { size: 12 }),
    /* @__PURE__ */ React.createElement(ShieldCheck, { size: 11 }),
    t("standards.tools_disclosure") || "Standards tools",
    !standardToolsOpen && /* @__PURE__ */ React.createElement("span", { className: "font-normal normal-case ml-auto opacity-80" }, t("standards.tools_disclosure_hint") || "find / consult")
  ), /* @__PURE__ */ React.createElement("div", { id: "udl-standard-tools", hidden: !standardToolsOpen }, /* @__PURE__ */ React.createElement("div", { className: `mb-3 p-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700" : theme === "contrast" ? "bg-black border-white" : "bg-slate-50 border-slate-200"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ React.createElement("label", { className: `text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${chatStyles.subText}` }, /* @__PURE__ */ React.createElement(Search, { size: 10 }), " ", t("standards.finder_header"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.standards_region_framework_placeholder"),
      type: "text",
      value: aiStandardRegion,
      onChange: (e) => setAiStandardRegion(e.target.value),
      "data-help-key": "standards_region_input",
      placeholder: t("standards.region_framework_placeholder"),
      className: `w-1/3 text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 ${chatStyles.input}`
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.text_field"),
      type: "text",
      value: aiStandardQuery,
      onChange: (e) => setAiStandardQuery(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleFindStandards(),
      placeholder: isIndependentMode ? t("wizard.independent_learning_goal") : t("wizard.skill_search_placeholder"),
      className: `flex-grow text-xs rounded p-1.5 focus:ring-1 outline-none ${chatStyles.input}`
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleFindStandards,
      disabled: isFindingStandards || !aiStandardQuery.trim(),
      className: `p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm ${chatStyles.button}`,
      title: t("standards.search_button_title"),
      "aria-label": t("standards.search_button_title")
    },
    isFindingStandards ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Search, { size: 14 })
  )), suggestedStandards.length > 0 && /* @__PURE__ */ React.createElement("div", { className: `max-h-32 overflow-y-auto custom-scrollbar border rounded divide-y ${theme === "dark" ? "bg-slate-900 border-slate-700 divide-slate-700" : theme === "contrast" ? "bg-black border-white divide-white" : "bg-white border-slate-200 divide-slate-100"}` }, suggestedStandards.map((std, idx) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: idx,
      onClick: () => {
        setStandardsInput(`${std.code}: ${std.description}`);
        addToast(t("toasts.applied_standard", { code: std.code }), "success");
      },
      className: `w-full text-left p-2 transition-colors group flex flex-col gap-1 ${theme === "dark" ? "hover:bg-indigo-900/50" : theme === "contrast" ? "hover:bg-yellow-900" : "hover:bg-green-50"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: `text-[11px] font-bold px-1 rounded border ${theme === "dark" ? "bg-indigo-900 text-indigo-200 border-indigo-700" : theme === "contrast" ? "bg-black text-yellow-400 border-yellow-400" : "bg-indigo-50 text-indigo-700 border-indigo-100"}` }, std.code), /* @__PURE__ */ React.createElement("span", { className: `text-[11px] uppercase ml-auto ${chatStyles.subText}` }, std.framework)),
    /* @__PURE__ */ React.createElement("p", { className: `text-[11px] leading-snug line-clamp-2 ${chatStyles.text}` }, std.description)
  )))), /* @__PURE__ */ React.createElement("div", { className: `mb-3 p-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700" : theme === "contrast" ? "bg-black border-white" : "bg-slate-50 border-slate-200"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ React.createElement("label", { className: `text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${chatStyles.subText}` }, /* @__PURE__ */ React.createElement(ShieldCheck, { size: 10 }), " ", t("standards.consult_header"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      "data-help-key": "chat_framework_select",
      value: udlStandardFramework,
      onChange: (e) => setUdlStandardFramework(e.target.value),
      className: `flex-1 text-xs rounded p-1.5 focus:ring-1 outline-none ${chatStyles.input}`,
      "aria-label": t("standards.consult_header")
    },
    /* @__PURE__ */ React.createElement("option", { value: "Common Core ELA" }, t("standards.frameworks.ccss_ela")),
    /* @__PURE__ */ React.createElement("option", { value: "Common Core Math" }, t("standards.frameworks.ccss_math")),
    /* @__PURE__ */ React.createElement("option", { value: "Next Generation Science Standards (NGSS)" }, t("standards.frameworks.ngss")),
    /* @__PURE__ */ React.createElement("option", { value: "C3 Framework (Social Studies)" }, t("standards.frameworks.c3")),
    /* @__PURE__ */ React.createElement("option", { value: "ISTE Standards" }, t("standards.frameworks.iste")),
    /* @__PURE__ */ React.createElement("option", { value: "CASEL Competencies" }, t("standards.frameworks.casel")),
    /* @__PURE__ */ React.createElement("option", { value: "Texas Essential Knowledge and Skills (TEKS)" }, t("standards.frameworks.teks"))
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "chat_grade_select",
      value: udlStandardGrade,
      onChange: (e) => setUdlStandardGrade(e.target.value),
      className: `w-28 text-xs rounded p-1.5 focus:ring-1 outline-none ${chatStyles.input}`
    },
    /* @__PURE__ */ React.createElement("option", { value: "Kindergarten" }, t("standards.grades.k")),
    /* @__PURE__ */ React.createElement("option", { value: "1st Grade" }, t("standards.grades.1")),
    /* @__PURE__ */ React.createElement("option", { value: "2nd Grade" }, t("standards.grades.2")),
    /* @__PURE__ */ React.createElement("option", { value: "3rd Grade" }, t("standards.grades.3")),
    /* @__PURE__ */ React.createElement("option", { value: "4th Grade" }, t("standards.grades.4")),
    /* @__PURE__ */ React.createElement("option", { value: "5th Grade" }, t("standards.grades.5")),
    /* @__PURE__ */ React.createElement("option", { value: "6th Grade" }, t("standards.grades.6")),
    /* @__PURE__ */ React.createElement("option", { value: "7th Grade" }, t("standards.grades.7")),
    /* @__PURE__ */ React.createElement("option", { value: "8th Grade" }, t("standards.grades.8")),
    /* @__PURE__ */ React.createElement("option", { value: "9th Grade" }, t("standards.grades.9")),
    /* @__PURE__ */ React.createElement("option", { value: "10th Grade" }, t("standards.grades.10")),
    /* @__PURE__ */ React.createElement("option", { value: "11th Grade" }, t("standards.grades.11")),
    /* @__PURE__ */ React.createElement("option", { value: "12th Grade" }, t("standards.grades.12"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.continue"),
      "data-help-key": "chat_consult_btn",
      onClick: () => handleSendUDLMessage(t("standards.prompts.identify_key_standards", { framework: udlStandardFramework, grade: udlStandardGrade })),
      className: `p-1.5 rounded transition-colors border ${theme === "dark" ? "bg-indigo-900 border-indigo-700 text-indigo-300 hover:bg-indigo-800" : theme === "contrast" ? "bg-black border-yellow-400 text-yellow-400 hover:bg-yellow-900" : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200"}`,
      title: t("standards.consult_btn_title")
    },
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 })
  )))), /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg transition-all duration-500 select-none ${!isAutoFillMode && !hasUsedAutoFill ? "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 shadow-sm animate-pulse" : `border border-transparent px-1 ${chatStyles.subText}`}` }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_is_auto_fill_mode"),
      type: "checkbox",
      checked: isAutoFillMode,
      onChange: handleAutoFillToggle,
      className: `rounded h-3.5 w-3.5 cursor-pointer ${theme === "contrast" ? "bg-black border-yellow-400 checked:bg-yellow-400" : "border-slate-300 text-indigo-600 focus:ring-indigo-500"}`,
      id: "udl-autofill-check",
      "data-help-key": "chat_autofill"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "udl-autofill-check", className: `flex items-center gap-1 cursor-pointer text-xs ${!isAutoFillMode && !hasUsedAutoFill ? "font-bold text-orange-900" : "font-medium"}` }, /* @__PURE__ */ React.createElement(Sparkles, { size: 12, className: theme === "contrast" ? "text-yellow-400" : "text-yellow-500 fill-current" }), t("chat_guide.autofill_label"), !isAutoFillMode && !hasUsedAutoFill && /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-orange-600 font-normal ml-1 hidden sm:inline" }, t("common.recommended")))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_udl_input"),
      ref: udlInputRef,
      type: "text",
      value: udlInput,
      onChange: (e) => setUdlInput(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleSendUDLMessage(),
      placeholder: isShowMeMode ? t("chat_guide.input_placeholder_showme") : t("chat_guide.input_placeholder_default"),
      className: `flex-grow text-sm p-2 border rounded-lg focus:ring-2 outline-none ${chatStyles.input}`,
      "data-help-key": "chat_input"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.show"),
      onClick: () => handleSendUDLMessage(),
      disabled: !udlInput.trim() || isChatProcessing,
      className: `p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${chatStyles.button}`,
      "data-help-key": "chat_send"
    },
    isShowMeMode ? /* @__PURE__ */ React.createElement(Eye, { size: 18 }) : /* @__PURE__ */ React.createElement(Send, { size: 18 })
  ))));
}
function PlatformDiagnosticsSection(props) {
  const { t } = props;
  const [platProbe, setPlatProbe] = React.useState(null);
  const [probeRunning, setProbeRunning] = React.useState(false);
  const runPlatformProbe = async () => {
    const rows = [];
    const add = (name, status, detail) => rows.push({ name, status, detail: String(detail || "") });
    setProbeRunning(true);
    try {
      try {
        let origin = "unknown";
        try {
          origin = window.location.origin;
        } catch (_) {
        }
        let inFrame = "unknown";
        try {
          inFrame = window.top === window ? "no (top window)" : "yes";
        } catch (_) {
          inFrame = "yes (cross-origin parent)";
        }
        add("Context", "info", "origin: " + origin + " \xB7 in iframe: " + inFrame + " \xB7 secure: " + (typeof isSecureContext !== "undefined" ? isSecureContext : "?"));
      } catch (e) {
        add("Context", "info", "unreadable: " + e.message);
      }
      try {
        const ensureFn = typeof window.__alloEnsureStemPluginLoaded === "function";
        const stateFn = typeof window.__alloGetStemPluginState === "function";
        add(
          "STEM plugin loader",
          ensureFn && stateFn ? "pass" : "fail",
          ensureFn && stateFn ? "loader hooks present" : "missing hook(s) \u2014 ensure:" + ensureFn + " getState:" + stateFn + ". Tools cannot be requested at all; every tool will sit on its loading skeleton."
        );
        const reg = window.StemLab && window.StemLab._registry;
        const registered = reg ? Object.keys(reg) : [];
        add(
          "STEM tools registered",
          registered.length ? "pass" : "warn",
          registered.length ? registered.length + " registered" : "none registered yet \u2014 open a tool first, or the plugins are not executing"
        );
        const seen = window.__alloStemPluginStates || null;
        const names = seen ? Object.keys(seen) : [];
        if (stateFn && names.length) {
          const summary = names.map((mod) => {
            const st = seen[mod] || {};
            const short = String(mod).replace(/^.*stem_tool_/, "").replace(/\.js$/, "");
            const ms = st.finishedAt && st.startedAt ? " " + (st.finishedAt - st.startedAt) + "ms" : "";
            return short + "=" + (st.status || "?") + (st.attempt > 1 ? " (try " + st.attempt + ")" : "") + ms + (st.error ? " \u2014 " + st.error : "");
          });
          const anyError = names.some((mod) => (seen[mod] || {}).status === "error");
          add("STEM plugin states", anyError ? "fail" : "info", summary.join(" \xB7 "));
        } else {
          add(
            "STEM plugin states",
            "warn",
            "no plugin has been requested this session. If a tool is showing its loading skeleton right now, the request was never made \u2014 the fault is upstream of the download, not the network."
          );
        }
      } catch (e) {
        add("STEM plugin loader", "info", "unreadable: " + e.message);
      }
      try {
        const first = window.__alloFirstError;
        add(
          "First page error",
          first ? "fail" : "pass",
          first ? new Date(first.at).toLocaleTimeString() + " \u2014 " + first.msg + (first.src ? " (" + first.src + (first.line ? ":" + first.line : "") + ")" : "") : "no uncaught error captured this session"
        );
      } catch (e) {
        add("First page error", "info", "unreadable: " + e.message);
      }
      try {
        const w = window.open("", "_blank", "width=80,height=60");
        if (w) {
          try {
            w.close();
          } catch (_) {
          }
          add("Pop-up windows", "pass", "window.open works \u2014 compare view + Save-as-PDF can open");
        } else add("Pop-up windows", "fail", "window.open returned null \u2014 the compare view and print flow cannot open here");
      } catch (e) {
        add("Pop-up windows", "fail", "window.open threw: " + e.message);
      }
      try {
        new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
        add("WebAssembly", "pass", "compiles \u2014 Writing Check + OCR can run");
      } catch (e) {
        add("WebAssembly", "fail", "cannot compile: " + e.message);
      }
      try {
        const prior = localStorage.getItem("allo_platform_probe_marker");
        localStorage.setItem("allo_platform_probe_marker", (/* @__PURE__ */ new Date()).toISOString());
        if (localStorage.getItem("allo_platform_probe_marker")) {
          add("localStorage (this session)", "pass", "write + read OK");
          add("localStorage (across sessions)", prior ? "pass" : "warn", prior ? "marker from a previous run found (" + prior.slice(0, 19) + ") \u2014 storage persisted" : "no marker from a previous run \u2014 first probe here, or storage was wiped between sessions. Run again in a new session to confirm.");
        } else add("localStorage (this session)", "fail", "wrote but could not read back");
      } catch (e) {
        add("localStorage (this session)", "fail", e.message);
      }
      try {
        const idb = await new Promise((resolve) => {
          const to = setTimeout(() => resolve({ status: "fail", detail: "open timed out (3s)" }), 3e3);
          try {
            const req = indexedDB.open("allo_platform_probe", 1);
            req.onupgradeneeded = () => {
              try {
                req.result.createObjectStore("kv");
              } catch (_) {
              }
            };
            req.onerror = () => {
              clearTimeout(to);
              resolve({ status: "fail", detail: "open error: " + (req.error && req.error.message) });
            };
            req.onsuccess = () => {
              try {
                const db = req.result;
                const tx = db.transaction("kv", "readwrite");
                const st = tx.objectStore("kv");
                const get = st.get("marker");
                get.onsuccess = () => {
                  const prior = get.result;
                  st.put((/* @__PURE__ */ new Date()).toISOString(), "marker");
                  tx.oncomplete = () => {
                    clearTimeout(to);
                    try {
                      db.close();
                    } catch (_) {
                    }
                    resolve({
                      status: "pass",
                      detail: prior ? "works; marker from a previous run found (" + String(prior).slice(0, 19) + ") \u2014 persisted" : "works this session; no prior marker \u2014 first probe here, or wiped between sessions. Re-run in a new session to confirm."
                    });
                  };
                };
                get.onerror = () => {
                  clearTimeout(to);
                  resolve({ status: "fail", detail: "read failed" });
                };
              } catch (e) {
                clearTimeout(to);
                resolve({ status: "fail", detail: e.message });
              }
            };
          } catch (e) {
            clearTimeout(to);
            resolve({ status: "fail", detail: e.message });
          }
        });
        add("IndexedDB", idb.status, idb.detail);
      } catch (e) {
        add("IndexedDB", "fail", e.message);
      }
      try {
        const u = URL.createObjectURL(new Blob(["probe"], { type: "text/plain" }));
        const r = await fetch(u);
        const txt = await r.text();
        URL.revokeObjectURL(u);
        add("Blob URLs (same window)", txt === "probe" ? "pass" : "warn", txt === "probe" ? "create + fetch back OK" : "fetched but content mismatched");
      } catch (e) {
        add("Blob URLs (same window)", "fail", e.message);
      }
      try {
        const u = URL.createObjectURL(new Blob(["AlloFlow probe OK"], { type: "text/plain" }));
        const a = document.createElement("a");
        a.href = u;
        a.download = "alloflow-platform-probe.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(u), 4e3);
        add("File downloads", "info", "a tiny test file was triggered \u2014 if alloflow-platform-probe.txt appears in Downloads, downloads work end-to-end");
      } catch (e) {
        add("File downloads", "fail", e.message);
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText("AlloFlow platform probe");
          add("Clipboard (API)", "pass", "writeText OK");
        } else add("Clipboard (API)", "warn", "navigator.clipboard unavailable");
      } catch (e) {
        add("Clipboard (API)", "warn", "writeText rejected: " + String(e && e.message).slice(0, 120));
      }
      try {
        const ta = document.createElement("textarea");
        ta.setAttribute("aria-label", "Clipboard fallback text");
        ta.value = "AlloFlow platform probe";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        add("Clipboard (fallback)", ok ? "pass" : "warn", ok ? "execCommand copy works \u2014 copy buttons function even where the API is blocked" : "execCommand returned false");
      } catch (e) {
        add("Clipboard (fallback)", "fail", String(e && e.message).slice(0, 120));
      }
      add("Dialogs (confirm/prompt)", "info", "typeof confirm = " + typeof window.confirm + " \u2014 use \u201CTest dialog\u201D for the real answer (a sandbox can define it but silently return false)");
      const cdns = [
        ["jsDelivr", "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/package.json"],
        ["unpkg", "https://unpkg.com/pdf-lib@1.17.1/package.json"],
        ["cdnjs", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"],
        ["Google Fonts", "https://fonts.googleapis.com/css2?family=Lexend&display=swap"]
      ];
      for (const pair of cdns) {
        try {
          const t0 = Date.now();
          const ac = typeof AbortController === "function" ? new AbortController() : null;
          const tid = ac ? setTimeout(() => {
            try {
              ac.abort();
            } catch (_) {
            }
          }, 6e3) : null;
          const r = await fetch(pair[1], ac ? { signal: ac.signal } : void 0);
          if (tid) clearTimeout(tid);
          add("CDN: " + pair[0], r.ok ? "pass" : "warn", "HTTP " + r.status + " in " + (Date.now() - t0) + "ms");
        } catch (e) {
          add("CDN: " + pair[0], "fail", "unreachable: " + (e && e.message));
        }
      }
      try {
        const t0 = Date.now();
        const r = await fetch("https://cdn.jsdelivr.net/npm/harper.js@2.4.0/dist/harper_wasm_bg.wasm", { cache: "force-cache" });
        if (r.ok) {
          await r.arrayBuffer();
          add("Writing-Check cache (10 MB WASM)", "info", "fetched in " + (Date.now() - t0) + "ms \u2014 under ~500ms means the HTTP cache held it; re-run in a fresh session to test cross-session caching");
        } else add("Writing-Check cache (10 MB WASM)", "warn", "HTTP " + r.status);
      } catch (e) {
        add("Writing-Check cache (10 MB WASM)", "warn", e.message);
      }
    } finally {
      setPlatProbe({ when: (/* @__PURE__ */ new Date()).toLocaleString(), rows });
      setProbeRunning(false);
    }
  };
  const runDialogProbe = () => {
    let value = null;
    try {
      value = window.confirm(t("platform_diag.dialog_question") || "Dialog test: click OK.");
    } catch (e) {
      value = "threw: " + e.message;
    }
    setPlatProbe((previous) => ({
      when: previous && previous.when || (/* @__PURE__ */ new Date()).toLocaleString(),
      rows: [
        ...(previous && previous.rows || []).filter((row) => row.name !== "Dialogs (live test)"),
        {
          name: "Dialogs (live test)",
          status: value === true ? "pass" : value === false ? "warn" : "fail",
          detail: value === true ? "confirm() returned true after OK \u2014 dialogs work" : value === false ? "confirm() returned FALSE \u2014 either Cancel was clicked or the sandbox suppressed the dialog" : String(value)
        }
      ]
    }));
  };
  const probeReportText = () => !platProbe ? "" : "AlloFlow Platform Check \u2014 " + platProbe.when + "\n" + (typeof navigator !== "undefined" ? navigator.userAgent : "") + "\n\n" + platProbe.rows.map((row) => "[" + row.status.toUpperCase() + "] " + row.name + " \u2014 " + row.detail).join("\n");
  const copyProbeReport = async () => {
    const text = probeReportText();
    try {
      if (typeof window.alloCopyText === "function" && await window.alloCopyText(text)) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (_) {
    }
    try {
      const ta = document.createElement("textarea");
      ta.setAttribute("aria-label", "Clipboard fallback text");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (_) {
    }
  };
  return /* @__PURE__ */ React.createElement("section", { id: "ai-platform-diagnostics-section", "data-help-key": "ai_platform_diagnostics", className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "bg-violet-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(Cpu, { size: 14, className: "text-violet-600" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { id: "ai-platform-diagnostics-title", className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, t("platform_diag.header") || "Platform & Browser Diagnostics"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5" }, "Check capabilities that affect AI, files, storage, and pop-up workflows."))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: runPlatformProbe, disabled: probeRunning, className: "bg-violet-600 text-white border-2 border-violet-600 px-3 py-2 rounded-xl font-bold text-xs hover:bg-violet-700 disabled:opacity-60" }, "\u{1F52C} ", probeRunning ? "Running platform check\u2026" : t("platform_diag.run") || "Run platform check"), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-ignore": "true", "data-a11y-ignore": "diagnostic-confirm", onClick: runDialogProbe, className: "bg-white text-violet-700 border-2 border-violet-200 px-3 py-2 rounded-xl font-bold text-xs hover:bg-violet-50" }, "\u{1F9EA} ", t("platform_diag.dialog") || "Test dialog"), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-ignore": "true", onClick: () => {
    if (typeof window.__alloOpenDeviceStorageProbe === "function") window.__alloOpenDeviceStorageProbe();
  }, className: "bg-white text-violet-700 border-2 border-violet-200 px-3 py-2 rounded-xl font-bold text-xs hover:bg-violet-50" }, "\u{1F4BE} ", t("platform_diag.storage_probe") || "Test device storage")), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-2" }, "Use this when a feature behaves differently across environments. Copy the report and include it when asking for help."), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, t("platform_diag.storage_probe_hint") || "Test device storage only checks whether this browser can keep data. To see, restore, or erase your saved resource packs, use Local storage and downloads above."), platProbe && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "mt-3 bg-white border border-slate-300 rounded-lg p-2 text-[11px]", role: "region", "aria-labelledby": "ai-platform-results-title" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { id: "ai-platform-results-title", className: "font-bold text-slate-700" }, t("platform_diag.results") || "Results", " \u2014 ", platProbe.when), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: copyProbeReport, "aria-label": t("platform_diag.copy") || "Copy report", className: "min-h-11 shrink-0 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold hover:bg-slate-200" }, "\u{1F4CB} ", t("platform_diag.copy") || "Copy report")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-0.5" }, platProbe.rows.map((row, index) => /* @__PURE__ */ React.createElement("li", { key: index, className: "flex gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "shrink-0 font-bold " + (row.status === "pass" ? "text-green-700" : row.status === "fail" ? "text-red-700" : row.status === "warn" ? "text-amber-700" : "text-slate-500") }, row.status === "pass" ? "\u2713" : row.status === "fail" ? "\u2717" : row.status === "warn" ? "\u26A0" : "\u2139"), /* @__PURE__ */ React.createElement("span", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, row.name, ":"), " ", row.detail))))), /* @__PURE__ */ React.createElement("div", { className: "sr-only", role: "status", "aria-live": "polite", "aria-atomic": "true" }, "Platform check complete. ", platProbe.rows.length, " results available.")));
}
function ModelDiagnosticsSection(props) {
  const { t, _isCanvasEnv, GEMINI_MODELS } = props;
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogFetched, setCatalogFetched] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const usage = typeof window !== "undefined" && window.__alloGeminiModelUsage || {};
  const usageEntries = Object.values(usage).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  const _sessionTotals = (() => {
    const by = {};
    for (const e of usageEntries) {
      const m = e.served || e.requested || "(unknown)";
      by[m] = (by[m] || 0) + (e.count || 0);
    }
    return Object.entries(by).sort((a, b) => b[1] - a[1]);
  })();
  const _sessionCallTotal = _sessionTotals.reduce((s, pair) => s + pair[1], 0);
  const _quotaHits = typeof window !== "undefined" && window.__alloGeminiQuotaHits || [];
  const slots = ["default", "fallback", "flash", "image", "vision", "tts", "quality", "safety"];
  const storedOverrides = (() => {
    try {
      return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").models || {};
    } catch (_) {
      return {};
    }
  })();
  const refreshCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const fn = typeof window !== "undefined" ? window.listAvailableGeminiModels : null;
      if (typeof fn !== "function") {
        setCatalogError(t("model_diag.list_unavailable") || "Model catalog API not yet loaded. Try again in a moment.");
        setCatalogLoading(false);
        return;
      }
      const result = await fn();
      if (result.error) {
        setCatalogError(result.error);
        setCatalog([]);
      } else {
        setCatalog(result.models || []);
        setCatalogError(null);
      }
      setCatalogFetched(true);
    } catch (e) {
      setCatalogError(e && e.message || "Unknown error");
      setCatalog([]);
    }
    setCatalogLoading(false);
  };
  const saveOverride = (slot, value) => {
    try {
      const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
      const models = { ...current.models || {} };
      if (value) models[slot] = value;
      else delete models[slot];
      const next = { ...current, models };
      if (Object.keys(models).length === 0) delete next.models;
      localStorage.setItem("alloflow_ai_config", JSON.stringify(next));
      setRefreshKey((k) => k + 1);
    } catch (_) {
    }
  };
  const clearAllOverrides = () => {
    try {
      const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
      delete current.models;
      localStorage.setItem("alloflow_ai_config", JSON.stringify(current));
      setRefreshKey((k) => k + 1);
    } catch (_) {
    }
  };
  const formatRelativeTime = (ts) => {
    if (!ts) return "\u2014";
    const now = typeof Date !== "undefined" && Date.now ? Date.now() : 0;
    const ago = now - ts;
    if (ago < 6e4) return Math.max(1, Math.floor(ago / 1e3)) + "s ago";
    if (ago < 36e5) return Math.floor(ago / 6e4) + "m ago";
    return Math.floor(ago / 36e5) + "h ago";
  };
  return /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(Cpu, { size: 14, className: "text-indigo-600" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, t("model_diag.header") || "AI Model Diagnostics")), /* @__PURE__ */ React.createElement("div", { className: "mb-3 bg-violet-50/60 border border-violet-200 rounded-lg p-2.5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1" }, "\u26FD ", t("model_diag.usage_header") || "Your Gemini usage (this session)"), _sessionCallTotal === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600" }, t("model_diag.usage_none") || "No AI calls yet this session.") : /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, _sessionCallTotal), " ", t("model_diag.usage_calls") || "AI call(s):", " ", _sessionTotals.map((pair, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: "font-mono" }, pair[0], " \xD7", pair[1], i < _sessionTotals.length - 1 ? " \xB7 " : ""))), _quotaHits.length > 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-red-700 font-bold mt-1" }, "\u{1F6D1} ", t("model_diag.quota_hit") || "Quota limit (HTTP 429) hit this session", " \u2014 ", new Date(_quotaHits[_quotaHits.length - 1].at).toLocaleTimeString(), " (", _quotaHits[_quotaHits.length - 1].model, "). ", t("model_diag.quota_hit_advice") || "If retries keep failing, the daily quota is spent \u2014 free-tier quotas reset around midnight Pacific.") : /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-green-700 mt-1" }, "\u2713 ", t("model_diag.quota_ok") || "No quota errors this session."), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, t("model_diag.usage_caveat") || "Honest limits of this meter: Google does not let apps see your remaining balance, so this counts AlloFlow\u2019s own calls and resets when the page reloads. A 429 error is the only definitive \u201Cquota reached\u201D signal \u2014 when one happens, a red banner appears at the top of the app (dismissable) and it\u2019s recorded here.")), /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, t("model_diag.served_header") || "Models actually used this session"), usageEntries.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-2.5 rounded-lg border border-slate-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic" }, t("model_diag.no_calls_yet") || "No AI calls completed yet this session. Run an audit, generate text, or use any AI feature to populate.")) : /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 rounded-lg border border-slate-100 overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "text-[11px] w-full" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-100 text-slate-700" }, /* @__PURE__ */ React.createElement("th", { className: "text-left p-1.5 font-bold" }, t("model_diag.col_requested") || "Requested"), /* @__PURE__ */ React.createElement("th", { className: "text-left p-1.5 font-bold" }, t("model_diag.col_served") || "Served by Google"), /* @__PURE__ */ React.createElement("th", { className: "text-right p-1.5 font-bold" }, t("model_diag.col_count") || "Calls"), /* @__PURE__ */ React.createElement("th", { className: "text-right p-1.5 font-bold" }, t("model_diag.col_last") || "Last"))), /* @__PURE__ */ React.createElement("tbody", null, usageEntries.map((entry, i) => /* @__PURE__ */ React.createElement("tr", { key: i, className: entry.divergent ? "bg-amber-50 border-t border-amber-200" : "border-t border-slate-200" }, /* @__PURE__ */ React.createElement("td", { className: "p-1.5 font-mono text-slate-700" }, entry.requested), /* @__PURE__ */ React.createElement("td", { className: "p-1.5 font-mono text-slate-700" }, entry.served || /* @__PURE__ */ React.createElement("span", { className: "italic text-slate-400" }, t("model_diag.unreported") || "(unreported)"), entry.divergent && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-amber-700 font-bold", title: t("model_diag.divergent_tooltip") || "Google routed this request to a different model" }, "\u21C4")), /* @__PURE__ */ React.createElement("td", { className: "p-1.5 text-right text-slate-700 font-bold" }, entry.count), /* @__PURE__ */ React.createElement("td", { className: "p-1.5 text-right text-slate-600" }, formatRelativeTime(entry.lastSeen))))))), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1 italic" }, t("model_diag.served_hint") || "\u21C4 marks a row where Google served a different model than the one requested (silent reroute by the API).")), /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, t("model_diag.catalog_header") || "Available models for your API key"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: refreshCatalog,
      disabled: catalogLoading,
      className: "text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded hover:bg-indigo-200 disabled:opacity-50 active:scale-95"
    },
    catalogLoading ? t("model_diag.loading") || "\u23F3 Loading..." : (catalogFetched ? "\u21BB " : "\u2193 ") + (t("model_diag.refresh") || "Fetch catalog")
  )), catalogError && /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 p-2 rounded-lg border border-red-100 mb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-red-700 font-medium" }, "\u26A0 ", catalogError)), catalog.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 rounded-lg border border-slate-100 max-h-40 overflow-y-auto" }, /* @__PURE__ */ React.createElement("table", { className: "text-[10px] w-full" }, /* @__PURE__ */ React.createElement("thead", { className: "sticky top-0 bg-slate-100" }, /* @__PURE__ */ React.createElement("tr", { className: "text-slate-700" }, /* @__PURE__ */ React.createElement("th", { className: "text-left p-1 font-bold" }, t("model_diag.col_id") || "Model"), /* @__PURE__ */ React.createElement("th", { className: "text-left p-1 font-bold" }, t("model_diag.col_display") || "Name"), /* @__PURE__ */ React.createElement("th", { className: "text-right p-1 font-bold", title: t("model_diag.col_in_tt") || "Input token limit" }, t("model_diag.col_in") || "In tok"), /* @__PURE__ */ React.createElement("th", { className: "text-right p-1 font-bold", title: t("model_diag.col_out_tt") || "Output token limit" }, t("model_diag.col_out") || "Out tok"))), /* @__PURE__ */ React.createElement("tbody", null, catalog.map((m, i) => /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-slate-200" }, /* @__PURE__ */ React.createElement("td", { className: "p-1 font-mono text-slate-700" }, m.id), /* @__PURE__ */ React.createElement("td", { className: "p-1 text-slate-700" }, m.displayName), /* @__PURE__ */ React.createElement("td", { className: "p-1 text-right text-slate-600" }, m.inputTokenLimit ? m.inputTokenLimit.toLocaleString() : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "p-1 text-right text-slate-600" }, m.outputTokenLimit ? m.outputTokenLimit.toLocaleString() : "\u2014")))))), !catalogFetched && !catalogError && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 italic" }, t("model_diag.click_to_load") || 'Click "Fetch catalog" to query Google for the list of models your key can access.')), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, t("model_diag.map_header") || "Current model map (what the app requests)"), Object.keys(storedOverrides).length > 0 && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: clearAllOverrides,
      className: "text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 active:scale-95",
      title: t("model_diag.clear_all_tt") || "Remove every per-slot override and revert to app defaults"
    },
    t("model_diag.clear_all") || "\u21A9 Clear overrides"
  )), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 rounded-lg border border-slate-100 p-2 space-y-1.5" }, slots.map((slot) => {
    const current = GEMINI_MODELS && GEMINI_MODELS[slot] || "(not set)";
    const overridden = !!storedOverrides[slot];
    const inCatalog = catalog.length === 0 || catalog.some((m) => m.id === current);
    return /* @__PURE__ */ React.createElement("div", { key: slot + ":" + refreshKey, className: "flex items-center gap-1.5 text-[11px]" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-slate-700 uppercase tracking-wider w-14 shrink-0" }, slot), catalog.length > 0 ? /* @__PURE__ */ React.createElement(
      "select",
      {
        defaultValue: storedOverrides[slot] || "",
        onChange: (e) => saveOverride(slot, e.target.value),
        className: "flex-1 p-1 text-[11px] border border-slate-200 rounded bg-white font-mono text-slate-700",
        "aria-label": (t("model_diag.slot_aria") || "Model override for slot") + ": " + slot
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, (t("model_diag.use_default_prefix") || "Use app default") + " (" + current + ")"),
      catalog.map((m, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: m.id }, m.id))
    ) : /* @__PURE__ */ React.createElement("span", { className: "flex-1 font-mono text-slate-700" }, current), overridden && !inCatalog && catalog.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-amber-700 font-bold whitespace-nowrap", title: t("model_diag.not_in_catalog_tt") || "This override is not in your current model catalog \u2014 may 404 at request time" }, "\u26A0 ", t("model_diag.not_in_catalog") || "not in catalog"), overridden && (inCatalog || catalog.length === 0) && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-indigo-700 font-bold", title: t("model_diag.overridden_tt") || "You have overridden this slot" }, "\u270E"));
  })), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1.5 italic" }, "\u26A1 ", t("model_diag.reload_hint") || "Reload the page after changing a model override for it to take effect."), _isCanvasEnv && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-0.5 italic" }, t("model_diag.canvas_hint") || "In Gemini Canvas, available models are determined by Google and may be a narrower set than public GA.")));
}
function AIBackendModal(props) {
  if (!(props.showAIBackendModal && !props._isCanvasEnv)) return null;
  return /* @__PURE__ */ React.createElement(AIBackendModalBody, { ...props });
}
function AIBackendModalBody(props) {
  const {
    _isCanvasEnv,
    ai,
    setShowAIBackendModal,
    showAIBackendModal,
    t,
    GEMINI_MODELS
  } = props;
  const isStudentAiSetup = Boolean(typeof window !== "undefined" && window.__alloStudentAiSetupAllowed && window.__alloQrStudentMode);
  const [guidedView, setGuidedView] = React.useState("choose");
  const [advancedOpen, setAdvancedOpen] = React.useState(isStudentAiSetup);
  const [guidedReady, setGuidedReady] = React.useState(false);
  const guidedHeadingRef = React.useRef(null);
  const prevGuidedViewRef = React.useRef("choose");
  React.useEffect(() => {
    if (prevGuidedViewRef.current === guidedView) return;
    prevGuidedViewRef.current = guidedView;
    try {
      if (guidedHeadingRef.current) guidedHeadingRef.current.focus();
    } catch (_) {
    }
  }, [guidedView]);
  const configStorage = isStudentAiSetup ? window.sessionStorage : window.localStorage;
  const configStorageKey = isStudentAiSetup ? "alloflow_qr_student_ai_config" : "alloflow_ai_config";
  const aiBackendDefaults = {
    gemini: "",
    "alloflow-local": "http://localhost:32173",
    lmstudio: "http://localhost:1234",
    localai: "http://localhost:8080",
    ollama: "http://localhost:11434",
    openai: "https://api.openai.com",
    claude: "https://api.anthropic.com",
    "onnx-npu": "http://localhost:11435",
    custom: "http://localhost:8080"
  };
  const readAIBackendConfig = () => {
    try {
      return JSON.parse(configStorage.getItem(configStorageKey) || "{}");
    } catch {
      return {};
    }
  };
  const fingerprintAIBackendConfig = (config) => {
    try {
      return typeof window.__alloStudentAiConfigFingerprint === "function" ? window.__alloStudentAiConfigFingerprint(config) : "";
    } catch (_) {
      return "";
    }
  };
  const writeAIBackendConfig = (config, options = {}) => {
    try {
      const next = { ...config || {} };
      if (options.preserveValidation !== true) delete next.validation;
      configStorage.setItem(configStorageKey, JSON.stringify(next));
      if (isStudentAiSetup) window.dispatchEvent(new CustomEvent("alloflow:student-ai-config-changed"));
      try {
        window.dispatchEvent(new CustomEvent("alloflow:ai-config-changed"));
      } catch (_) {
      }
    } catch (_) {
    }
  };
  const clearAIBackendConfig = () => {
    try {
      if (isStudentAiSetup && typeof window.__alloDisconnectStudentAi === "function") {
        window.__alloDisconnectStudentAi();
      } else {
        configStorage.removeItem(configStorageKey);
        if (isStudentAiSetup) window.dispatchEvent(new CustomEvent("alloflow:student-ai-config-changed"));
      }
    } catch (_) {
    }
  };
  const populateModelSelect = (select, emptyLabel, models, selectedValue = "") => {
    if (!select) return;
    select.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = emptyLabel;
    select.appendChild(emptyOption);
    (models || []).forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.id;
      select.appendChild(option);
    });
    select.value = selectedValue || "";
  };
  const stopEngineStripPoll = () => {
    if (window.__alloEngineStripPoll) {
      clearInterval(window.__alloEngineStripPoll);
      window.__alloEngineStripPoll = null;
    }
  };
  const startEngineStripPoll = () => {
    if (window.__alloEngineStripPoll) return;
    window.__alloEngineStripPoll = setInterval(() => {
      if (!document.getElementById("ai-backend-engine-strip")) {
        stopEngineStripPoll();
        return;
      }
      refreshEngineStrip();
    }, 2e3);
  };
  const refreshSdTurboStrip = async () => {
    const strip = document.getElementById("ai-backend-sdturbo-strip");
    if (!strip) return;
    let text = strip.querySelector("[data-sd-strip-text]");
    let btn = strip.querySelector("[data-sd-strip-btn]");
    if (!text) {
      text = document.createElement("span");
      text.setAttribute("data-sd-strip-text", "1");
      strip.appendChild(text);
      btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-sd-strip-btn", "1");
      btn.className = "ml-2 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700";
      btn.hidden = true;
      strip.appendChild(btn);
    }
    const TITLE = (t("ai_backend.sd_title") || "Local images (SD-Turbo)") + ": ";
    const setLine = (line, cls) => {
      const full = TITLE + line;
      if (text.textContent !== full) text.textContent = full;
      if (strip.className !== cls) strip.className = cls;
    };
    const SD_SLATE = "text-xs font-bold mt-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200";
    const SD_GREEN = "text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100";
    const SD_AMBER = "text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100";
    strip.style.display = "";
    if (window._sdTurbo?.ready) {
      setLine(t("ai_backend.sd_ready") || "Ready. Images generate on this computer when cloud image AI is unavailable.", SD_GREEN);
      btn.hidden = true;
      return;
    }
    let adapterOk = false;
    try {
      adapterOk = window.__alloWebGpuAdapterCheck ? await window.__alloWebGpuAdapterCheck() : !!(typeof navigator !== "undefined" && navigator.gpu && await navigator.gpu.requestAdapter());
    } catch (_) {
      adapterOk = false;
    }
    if (!adapterOk) {
      setLine(t("ai_backend.sd_no_gpu") || "Not available on this computer (no WebGPU graphics adapter). Cloud image AI still works with an API key.", SD_SLATE);
      btn.hidden = true;
      return;
    }
    const DOWNLOADING = t("ai_backend.sd_downloading") || "Downloading the model... about 2GB, one time only.";
    if (window.__sdTurboDownloading) {
      setLine(DOWNLOADING, SD_AMBER);
      btn.hidden = true;
      return;
    }
    setLine(t("ai_backend.sd_available") || "Available. Downloads a ~2GB model once, then images generate on this computer at no cost.", SD_SLATE);
    btn.textContent = t("ai_backend.sd_download_btn") || "Download & enable";
    btn.hidden = false;
    btn.disabled = false;
    btn.onclick = async () => {
      btn.disabled = true;
      btn.hidden = true;
      window.__sdTurboDownloading = true;
      setLine(DOWNLOADING + " 0%", SD_AMBER);
      try {
        const ok = await (window.__loadSdTurbo ? window.__loadSdTurbo((p) => {
          const pct = p && p.pct != null ? Math.round(p.pct * 100) + "%" : "";
          setLine(DOWNLOADING + " " + pct, SD_AMBER);
        }) : Promise.resolve(false));
        window.__sdTurboDownloading = false;
        if (ok) {
          setLine(t("ai_backend.sd_ready") || "Ready. Images generate on this computer when cloud image AI is unavailable.", SD_GREEN);
        } else {
          setLine(t("ai_backend.sd_failed") || "Download failed. Check the connection and try again.", SD_AMBER);
          btn.hidden = false;
          btn.disabled = false;
        }
      } catch (e) {
        window.__sdTurboDownloading = false;
        setLine((t("ai_backend.sd_failed") || "Download failed. Check the connection and try again.") + (e && e.message ? " (" + e.message + ")" : ""), SD_AMBER);
        btn.hidden = false;
        btn.disabled = false;
      }
    };
  };
  const refreshEngineStrip = async () => {
    const strip = document.getElementById("ai-backend-engine-strip");
    if (!strip) return;
    let backend = readAIBackendConfig().backend || "gemini";
    const providerSelect = document.getElementById("ai-backend-provider");
    if (providerSelect && providerSelect.value) backend = providerSelect.value;
    if (backend !== "alloflow-local") {
      strip.style.display = "none";
      stopEngineStripPoll();
      return;
    }
    strip.style.display = "";
    let stripText = strip.querySelector("[data-engine-strip-text]");
    let startBtn = strip.querySelector("[data-engine-strip-start]");
    if (!stripText) {
      stripText = document.createElement("span");
      stripText.setAttribute("data-engine-strip-text", "1");
      strip.appendChild(stripText);
      startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.setAttribute("data-engine-strip-start", "1");
      startBtn.textContent = t("ai_backend.engine_start_btn") || "Start engine";
      startBtn.className = "ml-2 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700";
      startBtn.onclick = async () => {
        startBtn.disabled = true;
        try {
          await fetch("/api/engine/start", { method: "POST" });
        } catch (_) {
        }
        startEngineStripPoll();
      };
      strip.appendChild(startBtn);
    }
    const setLine = (line, cls) => {
      if (stripText.textContent !== line) stripText.textContent = line;
      if (strip.className !== cls) strip.className = cls;
    };
    const AMBER = "text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100";
    if (!(typeof window !== "undefined" && window._isDesktopBundledApp)) {
      setLine(
        t("ai_backend.engine_desktop_only") || "The Built-in Engine runs inside AlloFlow Desktop. Install the desktop app to use local AI on this computer \u2014 no account or key needed.",
        "text-xs font-bold mt-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
      );
      startBtn.hidden = true;
      stopEngineStripPoll();
      return;
    }
    try {
      const engineStatus = await fetch("/api/engine/status").then((response) => response.json());
      if (engineStatus.running) {
        const _bridgeActive = typeof window !== "undefined" && window.__alloActiveAIBackend && window.__alloActiveAIBackend.backend === "alloflow-local";
        const _tail = _bridgeActive ? t("ai_backend.engine_connected") || "Connected \u2014 this app is using it right now." : t("ai_backend.engine_reload_note") || "Reload the app to start using it.";
        setLine(
          "\u2713 " + (t("ai_backend.engine_running") || "Engine running") + (engineStatus.model && engineStatus.model.name ? " \u2014 " + engineStatus.model.name : "") + ". " + _tail,
          "text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100"
        );
        startBtn.hidden = true;
        stopEngineStripPoll();
        return;
      }
      let line = t("ai_backend.engine_stopped") || "Engine is not running.";
      const busy = Boolean(engineStatus.download && engineStatus.download.totalBytes) || engineStatus.phase === "starting" || engineStatus.phase === "downloading-binary" || engineStatus.phase === "downloading-model";
      if (engineStatus.download && engineStatus.download.totalBytes) {
        line = (t("ai_backend.engine_downloading") || "Downloading") + " " + engineStatus.download.file + " \u2014 " + Math.round(engineStatus.download.receivedBytes / engineStatus.download.totalBytes * 100) + "%";
      } else if (engineStatus.phase === "starting") {
        line = t("ai_backend.engine_starting") || "Starting the engine\u2026";
      } else if (engineStatus.lastError) {
        line = engineStatus.lastError;
      }
      if (engineStatus.model && !engineStatus.model.present && !busy) {
        line += " " + (t("ai_backend.engine_first_run") || "(first start downloads the AI model \u2014 about 2 GB, one time)");
      }
      setLine(line, AMBER);
      startBtn.hidden = busy;
      if (!busy) startBtn.disabled = false;
      if (busy) startEngineStripPoll();
      else stopEngineStripPoll();
    } catch (_) {
      setLine(t("ai_backend.engine_unreachable") || "Could not reach the desktop runtime from this page.", AMBER);
      startBtn.hidden = true;
      stopEngineStripPoll();
    }
  };
  const createAIProviderFromSettings = (configOverride = null) => {
    const cfg = configOverride || readAIBackendConfig();
    const backend = cfg.backend || "gemini";
    const Provider = typeof window !== "undefined" && window.AIProvider || ai && ai.constructor;
    if (!Provider) return ai;
    const canInheritActiveProvider = !isStudentAiSetup && (backend === "gemini" || backend === (ai && ai.backend));
    const inheritedApiKey = canInheritActiveProvider ? ai && ai.apiKey : "";
    const inheritedModels = canInheritActiveProvider ? ai && ai.models : {};
    return new Provider({
      backend,
      apiKey: cfg.apiKey ?? inheritedApiKey ?? "",
      baseUrl: cfg.baseUrl || aiBackendDefaults[backend] || "",
      models: cfg.models || inheritedModels || {},
      ttsProvider: cfg.ttsProvider || "auto",
      imageProvider: cfg.imageProvider || "auto",
      isCanvasEnv: false
    });
  };
  const applyBackendChoice = (backend, { showStatus = false } = {}) => {
    const current = readAIBackendConfig();
    const updated = { ...current, backend, baseUrl: aiBackendDefaults[backend] || "" };
    if (backend !== current.backend) delete updated.models;
    writeAIBackendConfig(updated);
    const urlEl = document.getElementById("ai-backend-url");
    if (urlEl) urlEl.value = updated.baseUrl || "";
    populateModelSelect(document.getElementById("ai-backend-model-default"), "Auto (server default)", [], "");
    populateModelSelect(document.getElementById("ai-backend-model-fallback"), "Same as default", [], "");
    if (showStatus) {
      const status = document.getElementById("ai-backend-status");
      if (status) {
        status.textContent = "Preset applied. Test connection to discover models, then reload to apply.";
        status.className = "text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100";
      }
    }
    setTimeout(refreshEngineStrip, 0);
  };
  const GUIDED_BACKEND_LABELS = {
    gemini: "Google Gemini",
    "alloflow-local": "the built-in private AI",
    lmstudio: "LM Studio",
    ollama: "Ollama",
    localai: "LocalAI",
    custom: "your custom endpoint"
  };
  const GUIDED_CONNECT_APPS = [
    { id: "lmstudio", title: "LM Studio", body: "Desktop app with a friendly model browser.", keyProps: { "data-help-key": "ai_backend_guided_connect_lmstudio" }, link: "https://lmstudio.ai", steps: ["Install LM Studio from lmstudio.ai (free).", 'Use its search to download a model \u2014 "Qwen 2.5 7B Instruct" is a good start.', "Open the Developer / Local Server tab and press Start.", "Press Test Connection below."] },
    { id: "ollama", title: "Ollama", body: "Lightweight command-line runner.", keyProps: { "data-help-key": "ai_backend_guided_connect_ollama" }, link: "https://ollama.com", steps: ["Install Ollama from ollama.com (free).", "In a terminal, run: ollama run llama3.2", "Leave it running.", "Press Test Connection below."] },
    { id: "localai", title: "LocalAI", body: "Self-hosted server (advanced).", keyProps: { "data-help-key": "ai_backend_guided_connect_localai" }, link: "https://localai.io", steps: ["Follow the LocalAI install guide at localai.io.", "Start the server with at least one text model.", "Press Test Connection below."] },
    { id: "custom", title: "Custom endpoint", body: "Any OpenAI-compatible server.", keyProps: { "data-help-key": "ai_backend_guided_connect_custom" }, link: "", steps: ["Enter your server address below.", "Add an API key only if your server requires one.", "Press Test Connection below."] }
  ];
  const renderUrlField = () => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, t("ai_backend.server_url_label") || "Server URL"), /* @__PURE__ */ React.createElement(
    "input",
    {
      "data-help-key": "ai_backend_custom_url_input",
      id: "ai-backend-url",
      "aria-label": t("ai_backend.server_url_aria") || "Custom AI backend URL",
      type: "text",
      placeholder: "http://localhost:8080",
      defaultValue: readAIBackendConfig().baseUrl || "",
      onChange: (e) => {
        const current = readAIBackendConfig();
        writeAIBackendConfig({ ...current, baseUrl: e.target.value });
      },
      className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
    }
  ));
  const renderApiKeyField = (labelText, hintText) => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, labelText || t("ai_backend.api_key_label") || "API Key", " ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, hintText || t("ai_backend.api_key_hint") || "(cloud providers only)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      "data-help-key": "ai_backend_api_key_input",
      id: "ai-backend-apikey",
      "aria-label": t("ai_backend.api_key_aria") || "Custom AI backend API key",
      type: "password",
      autoComplete: "off",
      placeholder: t("ai_backend.api_key_placeholder") || "Your API key...",
      defaultValue: readAIBackendConfig().apiKey || "",
      onChange: (e) => {
        const current = readAIBackendConfig();
        writeAIBackendConfig({ ...current, apiKey: e.target.value });
      },
      className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
    }
  ));
  const renderEngineStrip = () => /* @__PURE__ */ React.createElement("div", { id: "ai-backend-engine-strip", style: { display: "none" }, "aria-live": "polite", ref: (node) => {
    if (node && !node.dataset.engineInit) {
      node.dataset.engineInit = "1";
      setTimeout(refreshEngineStrip, 0);
    }
  } });
  const guidedStepHeading = (text) => /* @__PURE__ */ React.createElement("p", { ref: guidedHeadingRef, tabIndex: -1, role: "status", "aria-live": "polite", className: "text-[11px] font-black text-violet-700 uppercase tracking-wider outline-none" }, text);
  const guidedBackBtn = (target) => /* @__PURE__ */ React.createElement("button", { "data-help-key": "ai_backend_guided_back_btn", onClick: () => {
    setGuidedReady(false);
    setGuidedView(target);
  }, className: "text-xs font-bold text-slate-600 hover:text-violet-700 transition-colors" }, "\u25C0 ", t("ai_backend.guided_back") || "Back");
  const guidedCard = (keyProps, onClick, emoji, title, badge, body, req) => /* @__PURE__ */ React.createElement(
    "button",
    {
      ...keyProps,
      type: "button",
      onClick,
      className: "w-full text-left border-2 border-slate-200 rounded-2xl p-4 hover:border-violet-400 hover:bg-violet-50/40 transition-all active:scale-[0.99]"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, emoji), /* @__PURE__ */ React.createElement("span", { className: "font-black text-sm text-slate-800" }, title), badge && /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full" }, badge)),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mt-1 leading-relaxed" }, body),
    req && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-1" }, req)
  );
  const renderGuidedStep = () => {
    const cfg = readAIBackendConfig();
    if (guidedView === "gemini") return /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, guidedStepHeading(t("ai_backend.guided_gemini_kicker") || "Step 2 of 2 \xB7 Google Gemini"), /* @__PURE__ */ React.createElement("ol", { className: "list-decimal ml-5 space-y-1.5 text-xs text-slate-700 leading-relaxed" }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener noreferrer", className: "font-bold text-violet-700 underline" }, t("ai_backend.guided_gemini_step1") || "Open Google AI Studio \u2197")), /* @__PURE__ */ React.createElement("li", null, t("ai_backend.guided_gemini_step2") || "Sign in with any Google account (a free one is fine)."), /* @__PURE__ */ React.createElement("li", null, t("ai_backend.guided_gemini_step3") || 'Press "Create API key" and copy it.'), /* @__PURE__ */ React.createElement("li", null, t("ai_backend.guided_gemini_step4") || "Paste the key below.")), renderApiKeyField(t("ai_backend.guided_gemini_key_label") || "Your Gemini API key", " "), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500" }, t("ai_backend.guided_gemini_key_note") || "Stored only on this device. The free tier covers everyday classroom use."), guidedBackBtn("choose"));
    if (guidedView === "private") return /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, guidedStepHeading(t("ai_backend.guided_private_kicker") || "Step 2 of 2 \xB7 Private AI on this computer"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-1.5 text-xs text-slate-700 leading-relaxed" }, /* @__PURE__ */ React.createElement("li", null, "\u2705 ", /* @__PURE__ */ React.createElement("strong", null, t("ai_backend.guided_private_b1a") || "Private:"), " ", t("ai_backend.guided_private_b1b") || "lessons and student text never leave this computer."), /* @__PURE__ */ React.createElement("li", null, "\u{1F4E5} ", /* @__PURE__ */ React.createElement("strong", null, t("ai_backend.guided_private_b2a") || "One-time download:"), " ", t("ai_backend.guided_private_b2b") || "a starter AI model (about 2 GB). Keep the app open until it finishes."), /* @__PURE__ */ React.createElement("li", null, "\u{1F5A5}\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, t("ai_backend.guided_private_b3a") || "Hardware:"), " ", t("ai_backend.guided_private_b3b") || "works best with 8 GB+ memory and ~2.5 GB free disk."), /* @__PURE__ */ React.createElement("li", null, "\u23F1\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, t("ai_backend.guided_private_b4a") || "Speed:"), " ", t("ai_backend.guided_private_b4b") || "answers take a bit longer than cloud AI \u2014 that's the privacy trade.")), renderEngineStrip(), guidedBackBtn("choose"));
    if (guidedView === "connect") return /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, guidedStepHeading(t("ai_backend.guided_connect_kicker") || "Step 2 of 3 \xB7 Which app do you run?"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, GUIDED_CONNECT_APPS.map((app) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: app.id,
        ...app.keyProps,
        type: "button",
        onClick: () => {
          applyBackendChoice(app.id);
          setGuidedReady(false);
          setGuidedView("connect-detail:" + app.id);
        },
        className: "text-left border-2 border-slate-200 rounded-xl p-3 hover:border-violet-400 hover:bg-violet-50/40 transition-all active:scale-[0.99]"
      },
      /* @__PURE__ */ React.createElement("span", { className: "font-black text-xs text-slate-800" }, app.title),
      /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5" }, app.body)
    ))), guidedBackBtn("choose"));
    if (guidedView.startsWith("connect-detail:")) {
      const app = GUIDED_CONNECT_APPS.find((a) => a.id === guidedView.slice("connect-detail:".length)) || GUIDED_CONNECT_APPS[3];
      return /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, guidedStepHeading((t("ai_backend.guided_connect_detail_kicker") || "Step 3 of 3 \xB7 Connect") + " " + app.title), /* @__PURE__ */ React.createElement("ol", { className: "list-decimal ml-5 space-y-1.5 text-xs text-slate-700 leading-relaxed" }, app.steps.map((step, i) => /* @__PURE__ */ React.createElement("li", { key: i }, app.link && i === 0 ? /* @__PURE__ */ React.createElement("a", { href: app.link, target: "_blank", rel: "noopener noreferrer", className: "font-bold text-violet-700 underline" }, step, " \u2197") : step))), renderUrlField(), renderApiKeyField(t("ai_backend.guided_connect_key_label") || "API key", t("ai_backend.guided_connect_key_hint") || "(only if your server needs one)"), guidedBackBtn("connect"));
    }
    const currentBackend = cfg.backend || "gemini";
    const connected = Boolean(cfg.validation && cfg.validation.ok);
    const badgeFor = (backend) => currentBackend === backend && cfg.backend ? t("ai_backend.guided_current_badge") || "Current" : "";
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, guidedStepHeading(t("ai_backend.guided_choose_kicker") || "First-time setup \xB7 Choose your AI"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, t("ai_backend.guided_intro") || "AlloFlow uses an AI engine to create lessons, read aloud, and answer questions. Pick how you'd like it to work \u2014 you can change this any time."), connected && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-green-800 bg-green-50 border border-green-100 rounded-xl p-2" }, "\u2705 ", (t("ai_backend.guided_connected_chip") || "Connected \u2014") + " " + (GUIDED_BACKEND_LABELS[currentBackend] || currentBackend)), !connected && guidedCard(
      { "data-help-key": "ai_backend_guided_card_canvas" },
      () => {
        try {
          window.open("https://share.gemini.google/SdsF4DiVkTwu", "_blank", "noopener");
        } catch (e) {
        }
      },
      "\u{1F680}",
      t("ai_backend.guided_card_canvas_title") || "Use AlloFlow inside Gemini Canvas",
      t("ai_backend.guided_card_canvas_badge") || "No setup",
      t("ai_backend.guided_card_canvas_body") || "The easiest way to get AI: open AlloFlow inside Google Gemini. Free with a Google account, using your Gemini plan\u2019s daily quota (personal, Education, or paid plans all work). Nothing to install and no key to manage.",
      t("ai_backend.guided_card_canvas_req") || "Opens gemini.google.com in a new tab \xB7 plan details at google.com/gemini"
    ), guidedCard(
      { "data-help-key": "ai_backend_guided_card_gemini" },
      () => {
        applyBackendChoice("gemini");
        setGuidedReady(false);
        setGuidedView("gemini");
      },
      "\u2728",
      t("ai_backend.guided_card_gemini_title") || "Google Gemini",
      badgeFor("gemini") || (t("ai_backend.guided_card_gemini_badge") || "Recommended"),
      t("ai_backend.guided_card_gemini_body") || "Best quality and speed. Runs in Google's cloud with a free key \u2014 we'll walk you through getting one (about 2 minutes).",
      t("ai_backend.guided_card_gemini_req") || "Works anywhere \xB7 needs internet"
    ), guidedCard(
      { "data-help-key": "ai_backend_guided_card_private" },
      () => {
        applyBackendChoice("alloflow-local");
        setGuidedReady(false);
        setGuidedView("private");
      },
      "\u{1F512}",
      t("ai_backend.guided_card_private_title") || "Private AI on this computer",
      badgeFor("alloflow-local") || (t("ai_backend.guided_card_private_badge") || "Most private"),
      t("ai_backend.guided_card_private_body") || "Everything stays on this computer \u2014 no account, no internet needed after setup. One click downloads a starter AI model.",
      t("ai_backend.guided_card_private_req") || "8 GB+ memory recommended \xB7 ~2.5 GB one-time download"
    ), guidedCard(
      { "data-help-key": "ai_backend_guided_card_connect" },
      () => {
        setGuidedReady(false);
        setGuidedView("connect");
      },
      "\u{1F50C}",
      t("ai_backend.guided_card_connect_title") || "An AI app I already run",
      badgeFor("lmstudio") || badgeFor("ollama") || badgeFor("localai") || badgeFor("custom"),
      t("ai_backend.guided_card_connect_body") || "Already use LM Studio, Ollama, or LocalAI on this computer? Connect it.",
      ""
    ));
  };
  const guidedTestVisible = advancedOpen || guidedView === "gemini" || guidedView === "private" || guidedView.startsWith("connect-detail:");
  const openDeviceStorageManager = () => {
    if (typeof window.__alloOpenStorageRecoveryManager === "function") {
      window.__alloOpenStorageRecoveryManager();
      return;
    }
    const _skewNotice = t("canvas_settings.device_storage_needs_reload") || "Reload AlloFlow to open the Storage and recovery manager \u2014 this app build is older than this settings panel.";
    if (typeof window.__alloAddToast === "function") {
      window.__alloAddToast(_skewNotice, "info");
      return;
    }
    try {
      console.warn("[Storage] Storage and recovery manager bridge unavailable on this host build.");
    } catch (_) {
    }
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { zIndex: props.showStemLab ? 10490 : void 0 },
      className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300",
      onClick: () => setShowAIBackendModal(false)
    },
    /* @__PURE__ */ React.createElement("div", { "data-help-key": "ai_backend_modal_panel", "data-student-ai-setup": isStudentAiSetup ? "true" : "false", className: "bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative border-4 border-violet-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto", role: "dialog", "aria-modal": "true", "aria-labelledby": "ai-backend-title", tabIndex: -1, onKeyDown: (e) => {
      if (e.key === "Escape") setShowAIBackendModal(false);
    }, onClick: (e) => e.stopPropagation() }, isStudentAiSetup && /* @__PURE__ */ React.createElement("style", null, `
              [data-student-ai-setup="true"] #ai-backend-engine-strip,
              [data-student-ai-setup="true"] #ai-backend-sdturbo-strip,
              [data-student-ai-setup="true"] div:has(> #ai-backend-wolfram),
              [data-student-ai-setup="true"] div.pt-3:has(#ai-backend-model-default),
              [data-student-ai-setup="true"] div.pt-3:has(#ai-backend-tts-provider),
              [data-student-ai-setup="true"] div.pt-3:has(#ai-backend-image-provider),
              [data-student-ai-setup="true"] #ai-backend-device-storage-section {
                display: none !important;
              }
            `), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowAIBackendModal(false), className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10", "aria-label": t("common.close") || "Close" }, /* @__PURE__ */ React.createElement(X, { size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-6 text-violet-900" }, /* @__PURE__ */ React.createElement("div", { className: "bg-violet-100 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Unplug, { size: 20, className: "text-violet-600" })), /* @__PURE__ */ React.createElement("h3", { id: "ai-backend-title", className: "font-black text-lg" }, isStudentAiSetup ? "Connect Personal AI" : t("ai_backend.title") || "AI Backend Settings")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, isStudentAiSetup && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950" }, /* @__PURE__ */ React.createElement("p", { className: "font-black" }, "Personal AI for this session"), /* @__PURE__ */ React.createElement("p", { className: "mt-1" }, "Use only your own provider account. Your credential is stored only in this browser tab and transmitted only to the provider you choose; it is never placed in the QR, Class Mailbox, or student submission."), /* @__PURE__ */ React.createElement("p", { className: "mt-1" }, "Your prompts and activity content are sent directly to the provider you choose and may create charges. Follow your school or district rules, do not include private student information, and use a restricted, low-budget key. Avoid shared devices.")), !advancedOpen && !isStudentAiSetup && renderGuidedStep(), !advancedOpen && !isStudentAiSetup && /* @__PURE__ */ React.createElement("section", { id: "ai-backend-guided-storage-shortcut", className: "rounded-xl border border-cyan-200 bg-cyan-50 p-3", "aria-labelledby": "ai-backend-guided-storage-title" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { id: "ai-backend-guided-storage-title", className: "text-xs font-black text-cyan-950" }, t("canvas_settings.local_storage_title") || "Saved work on this device"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[11px] leading-relaxed text-cyan-900" }, t("canvas_settings.local_storage_hint") || "Open your saved resource packs to restore, pin, export, or erase them. Also shows space used and the offline voice models such as Whisper and Kokoro.")), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "ai_backend_guided_storage_btn", onClick: openDeviceStorageManager, className: "min-h-11 shrink-0 rounded-xl border-2 border-cyan-600 bg-white px-4 py-2 text-sm font-black text-cyan-900 hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2" }, t("canvas_settings.local_storage_btn") || "Open saved work"))), advancedOpen && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, t("ai_backend.provider_label") || "Provider"), /* @__PURE__ */ React.createElement(
      "select",
      {
        "data-help-key": "ai_backend_provider_select",
        "aria-label": t("ai_backend.provider_aria") || "AI Backend Provider",
        id: "ai-backend-provider",
        defaultValue: readAIBackendConfig().backend || "gemini",
        onChange: (e) => applyBackendChoice(e.target.value, { showStatus: true }),
        className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-bold text-slate-700 bg-white cursor-pointer"
      },
      /* @__PURE__ */ React.createElement("option", { value: "gemini" }, "\u2728 Gemini (Google) \u2014 Default"),
      !isStudentAiSetup && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("option", { value: "alloflow-local" }, "\u{1F3EB} AlloFlow Built-in Engine (this computer \u2014 no account)"), /* @__PURE__ */ React.createElement("option", { value: "lmstudio" }, "LM Studio (Local)"), /* @__PURE__ */ React.createElement("option", { value: "localai" }, "\u{1F5A5}\uFE0F LocalAI (Self-Hosted GPU)"), /* @__PURE__ */ React.createElement("option", { value: "ollama" }, "\u{1F999} Ollama (Local)")),
      /* @__PURE__ */ React.createElement("option", { value: "openai" }, "\u{1F916} OpenAI"),
      !isStudentAiSetup && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("option", { value: "claude" }, "\u{1F9E0} Claude (Anthropic)"), /* @__PURE__ */ React.createElement("option", { value: "onnx-npu" }, "\u{1F9E0} On-Device NPU (Snapdragon)")),
      /* @__PURE__ */ React.createElement("option", { value: "custom" }, "\u2699\uFE0F Custom Endpoint")
    )), renderUrlField(), renderEngineStrip(), /* @__PURE__ */ React.createElement("div", { id: "ai-backend-sdturbo-strip", style: { display: "none" }, "aria-live": "polite", ref: (node) => {
      if (node && !node.dataset.sdInit) {
        node.dataset.sdInit = "1";
        setTimeout(refreshSdTurboStrip, 0);
      }
    } }), renderApiKeyField(), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, t("ai_backend.wolfram_label") || "Wolfram Alpha App ID", " ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, t("ai_backend.wolfram_hint") || "(optional \u2014 enhances math)")), /* @__PURE__ */ React.createElement(
      "input",
      {
        "data-help-key": "ai_backend_wolfram_input",
        id: "ai-backend-wolfram",
        "aria-label": t("ai_backend.wolfram_aria") || "Custom backend Wolfram App ID",
        type: "text",
        placeholder: t("ai_backend.wolfram_placeholder") || "XXXXX-XXXXXXXXXX (from developer.wolframalpha.com)",
        defaultValue: readAIBackendConfig().wolframAppId || "",
        onChange: (e) => {
          const current = readAIBackendConfig();
          writeAIBackendConfig({ ...current, wolframAppId: e.target.value });
        },
        className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, t("ai_backend.wolfram_free_note") || "Free: 2,000 queries/month \u2022 Adds exact math solving & step-by-step verification"))), !advancedOpen && guidedReady && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-green-200 bg-green-50 p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-black text-green-900" }, "\u2705 ", (t("ai_backend.guided_ready") || "You're ready \u2014 AlloFlow is using") + " " + (GUIDED_BACKEND_LABELS[readAIBackendConfig().backend || "gemini"] || readAIBackendConfig().backend) + "."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-green-800 mt-1" }, t("ai_backend.guided_ready_note") || "Your choice is active now \u2014 close this window and start working."), /* @__PURE__ */ React.createElement("button", { "data-help-key": "ai_backend_guided_done_btn", onClick: () => setShowAIBackendModal(false), className: "mt-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition-all active:scale-95" }, t("ai_backend.guided_done") || "Done")), guidedTestVisible && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 pt-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        "data-help-key": "ai_backend_test_connection_btn",
        id: "ai-backend-test",
        onClick: async () => {
          const btn = document.getElementById("ai-backend-test");
          const status = document.getElementById("ai-backend-status");
          const panel = btn && btn.closest('[data-help-key="ai_backend_modal_panel"]');
          const lockedControls = panel ? Array.from(panel.querySelectorAll("input, select, button")).filter((control) => control !== btn) : [];
          btn.disabled = true;
          lockedControls.forEach((control) => {
            control.disabled = true;
          });
          btn.textContent = "\u23F3 Testing...";
          if (status) {
            status.textContent = "";
            status.className = "";
          }
          try {
            const testedConfig = readAIBackendConfig();
            const testedFingerprint = fingerprintAIBackendConfig(testedConfig);
            writeAIBackendConfig(testedConfig);
            const result = await createAIProviderFromSettings(testedConfig).testConnection();
            if (result.success) {
              if (!testedFingerprint || fingerprintAIBackendConfig(readAIBackendConfig()) !== testedFingerprint) {
                throw new Error("Settings changed while the connection was being tested. Please test again.");
              }
              const modelSelect = document.getElementById("ai-backend-model-default");
              const fallbackSelect = document.getElementById("ai-backend-model-fallback");
              const cfg = readAIBackendConfig();
              const firstModel = result.selectedModel || result.models?.[0]?.id || "";
              if (firstModel && cfg.models?.default !== firstModel) {
                const models = { ...cfg.models || {}, default: firstModel };
                writeAIBackendConfig({ ...cfg, models });
              }
              const refreshedCfg = readAIBackendConfig();
              writeAIBackendConfig({
                ...refreshedCfg,
                validation: {
                  ok: true,
                  backend: refreshedCfg.backend || "gemini",
                  text: true,
                  fingerprint: fingerprintAIBackendConfig(refreshedCfg),
                  capabilities: {
                    text: true,
                    vision: false,
                    image: false,
                    imageEdit: false,
                    audio: false,
                    ...result.capabilities || {}
                  },
                  testedAt: (/* @__PURE__ */ new Date()).toISOString(),
                  expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1e3).toISOString(),
                  modelCount: Number(result.modelCount || 0)
                }
              }, { preserveValidation: true });
              if (isStudentAiSetup && typeof window.__alloSyncQrStudentAiAccess === "function") window.__alloSyncQrStudentAiAccess();
              try {
                if (!isStudentAiSetup && typeof window._upgradeGeminiAPI === "function") window._upgradeGeminiAPI();
              } catch (_) {
              }
              setGuidedReady(true);
              if (status) {
                status.textContent = "Connected! " + result.modelCount + " model(s) available" + (firstModel && cfg.models?.default !== firstModel ? ". Verified model selected." : "");
                status.className = "text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100";
              }
              if (modelSelect && result.models?.length > 0) {
                populateModelSelect(modelSelect, "Auto (server default)", result.models, refreshedCfg.models?.default || "");
              }
              if (fallbackSelect && result.models?.length > 0) {
                populateModelSelect(fallbackSelect, "Same as default", result.models, refreshedCfg.models?.fallback || "");
              }
            } else {
              if (status) {
                status.textContent = "\u274C Failed: " + result.error;
                status.className = "text-xs font-bold mt-2 text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-100";
              }
            }
          } catch (err) {
            if (status) {
              status.textContent = "\u274C Error: " + err.message;
              status.className = "text-xs font-bold mt-2 text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-100";
            }
          }
          lockedControls.forEach((control) => {
            control.disabled = false;
          });
          btn.disabled = false;
          btn.textContent = "\u{1F50C} Test Connection";
        },
        className: "flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95"
      },
      "\u{1F50C} Test Connection"
    ), advancedOpen && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          clearAIBackendConfig();
          const p = document.getElementById("ai-backend-provider");
          const u = document.getElementById("ai-backend-url");
          const k = document.getElementById("ai-backend-apikey");
          const s = document.getElementById("ai-backend-status");
          if (p) p.value = "gemini";
          if (u) u.value = "";
          if (k) k.value = "";
          const w = document.getElementById("ai-backend-wolfram");
          if (w) w.value = "";
          const md = document.getElementById("ai-backend-model-default");
          const mf = document.getElementById("ai-backend-model-fallback");
          const tt = document.getElementById("ai-backend-tts-provider");
          const ig = document.getElementById("ai-backend-image-provider");
          if (md) md.value = "";
          if (mf) mf.value = "";
          if (tt) tt.value = "auto";
          if (ig) ig.value = "auto";
          if (s) {
            s.textContent = isStudentAiSetup ? "Disconnected. The session key was erased." : "\u{1F504} Reset to defaults \u2014 reload page to apply";
            s.className = "text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100";
          }
        },
        className: "bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all active:scale-95"
      },
      isStudentAiSetup ? "Disconnect & erase key" : "\u21A9 Reset"
    )), /* @__PURE__ */ React.createElement("div", { id: "ai-backend-status" })), advancedOpen && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(Cpu, { size: 14, className: "text-blue-600" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, t("ai_backend.model_selection_header") || "Model Selection")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, t("ai_backend.default_model_label") || "Default Model", " ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, t("ai_backend.default_model_hint") || "(text generation)")), /* @__PURE__ */ React.createElement(
      "select",
      {
        "data-help-key": "ai_backend_model_select",
        "aria-label": t("ai_backend.default_model_aria") || "Default AI model",
        id: "ai-backend-model-default",
        defaultValue: readAIBackendConfig().models?.default || "",
        onChange: (e) => {
          const current = readAIBackendConfig();
          const models = { ...current.models || {}, default: e.target.value || void 0 };
          if (!e.target.value) delete models.default;
          writeAIBackendConfig({ ...current, models });
        },
        className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, t("ai_backend.auto_server_default") || "Auto (server default)")
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, t("ai_backend.fallback_model_label") || "Fallback Model", " ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, t("ai_backend.fallback_model_hint") || "(rate-limit cascade)")), /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": t("ai_backend.fallback_model_aria") || "Fallback AI model",
        id: "ai-backend-model-fallback",
        defaultValue: readAIBackendConfig().models?.fallback || "",
        onChange: (e) => {
          const current = readAIBackendConfig();
          const models = { ...current.models || {}, fallback: e.target.value || void 0 };
          if (!e.target.value) delete models.fallback;
          writeAIBackendConfig({ ...current, models });
        },
        className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, t("ai_backend.same_as_default") || "Same as default")
    )), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic" }, '\u{1F4A1} Click "Test Connection" above to auto-populate available models from your backend.'))), /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-emerald-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(Headphones, { size: 14, className: "text-emerald-600" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, "Text-to-Speech")), /* @__PURE__ */ React.createElement(
      "select",
      {
        "data-help-key": "ai_backend_tts_provider_select",
        "aria-label": t("ai_backend.tts_provider_aria") || "Text-to-speech provider",
        id: "ai-backend-tts-provider",
        defaultValue: readAIBackendConfig().ttsProvider || "auto",
        onChange: (e) => {
          const current = readAIBackendConfig();
          writeAIBackendConfig({ ...current, ttsProvider: e.target.value });
        },
        className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
      },
      /* @__PURE__ */ React.createElement("option", { value: "auto" }, "\u{1F504} Auto (match backend)"),
      /* @__PURE__ */ React.createElement("option", { value: "gemini" }, "\u2728 Gemini Cloud TTS"),
      /* @__PURE__ */ React.createElement("option", { value: "local" }, "\u{1F5A5}\uFE0F Local TTS (Kokoro \u2192 Edge TTS cascade)"),
      /* @__PURE__ */ React.createElement("option", { value: "browser" }, "\u{1F310} Browser Built-in (speechSynthesis)"),
      /* @__PURE__ */ React.createElement("option", { value: "off" }, "\u{1F507} Off (disable narration)")
    ), /* @__PURE__ */ React.createElement("div", { className: "mt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-emerald-700 font-medium leading-relaxed" }, /* @__PURE__ */ React.createElement("strong", null, "Auto:"), " Gemini voices for cloud backends, Edge TTS voices for local backends. Narrator voice selection is in the header bar (\u{1F3A7} button)."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-emerald-600 mt-1" }, /* @__PURE__ */ React.createElement("strong", null, t("ai_backend.local_cascade_label") || "Local cascade:"), " Kokoro (:8880, 8 langs) \u2192 Edge TTS (:5500, 40+ langs) \u2192 Browser fallback"))), /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 14, className: "text-amber-600" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, t("ai_backend.image_generation_header") || "Image Generation")), /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": t("ai_backend.image_provider_aria") || "Image generation provider",
        id: "ai-backend-image-provider",
        defaultValue: readAIBackendConfig().imageProvider || "auto",
        onChange: (e) => {
          const current = readAIBackendConfig();
          writeAIBackendConfig({ ...current, imageProvider: e.target.value });
        },
        className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
      },
      /* @__PURE__ */ React.createElement("option", { value: "auto" }, "\u{1F504} Auto (match backend)"),
      /* @__PURE__ */ React.createElement("option", { value: "sd-local" }, "\u{1F3EB} SD-Turbo (this computer \u2014 no account)"),
      /* @__PURE__ */ React.createElement("option", { value: "imagen" }, "\u{1F3A8} Imagen 4.0 (Google Cloud)"),
      /* @__PURE__ */ React.createElement("option", { value: "flux" }, "\u{1F5BC}\uFE0F FLUX (Local \u2014 port 7860)"),
      /* @__PURE__ */ React.createElement("option", { value: "off" }, "\u{1F6AB} Off (disable image generation)")
    ), /* @__PURE__ */ React.createElement("div", { className: "mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-700 font-medium leading-relaxed" }, /* @__PURE__ */ React.createElement("strong", null, "Imagen:"), " Google Cloud (requires Blaze plan). High quality, fast."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-600 mt-1" }, /* @__PURE__ */ React.createElement("strong", null, "FLUX:"), " Self-hosted at localhost:7860. Supports generation + editing via FLUX Kontext. No cloud dependency."))), !isStudentAiSetup && /* @__PURE__ */ React.createElement(ModelDiagnosticsSection, { t, _isCanvasEnv, GEMINI_MODELS }), !isStudentAiSetup && /* @__PURE__ */ React.createElement(PlatformDiagnosticsSection, { t }), /* @__PURE__ */ React.createElement("div", { id: "ai-backend-device-storage-section", className: "border-t border-slate-100 pt-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, t("canvas_settings.device_storage_label") || "Device Storage"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mb-2" }, t("canvas_settings.device_storage_hint") || "Work and settings are saved on this device only \u2014 nothing goes to a server. Review, export, or erase what is stored here."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: openDeviceStorageManager,
        className: "bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
      },
      "\u{1F50C} ",
      t("canvas_settings.device_storage_btn") || "Manage device storage"
    )), /* @__PURE__ */ React.createElement("div", { id: "ai-backend-diagnostics-section", className: "border-t border-slate-100 pt-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, t("canvas_settings.diagnostics_label") || "Diagnostics & Logs"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mb-2" }, t("canvas_settings.diagnostics_hint") || "View captured errors and the read-aloud (text-to-speech) activity trace \u2014 useful when audio stalls without a visible error."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (typeof window.__alloOpenDiagnosticsLog !== "function") return;
          let hasErrors = false;
          try {
            hasErrors = (window.AlloModules.ErrorReporter.getBuffer() || []).length > 0;
          } catch (e) {
          }
          window.__alloOpenDiagnosticsLog(hasErrors ? "errors" : "tts");
        },
        className: "bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
      },
      "\u{1FA7A} ",
      t("canvas_settings.diagnostics_btn") || "Open error & read-aloud log"
    )), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 font-medium leading-relaxed" }, /* @__PURE__ */ React.createElement("strong", { className: "text-slate-600" }, "Active:"), " ", (() => {
      try {
        const c = readAIBackendConfig();
        return c.backend ? c.backend.charAt(0).toUpperCase() + c.backend.slice(1) + (c.baseUrl ? " \u2192 " + c.baseUrl : "") : "Gemini (default)";
      } catch {
        return "Gemini (default)";
      }
    })()), !isStudentAiSetup && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 font-medium mt-1" }, "\u26A1 Reload page after changing backend to apply."), isStudentAiSetup && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 font-medium mt-1" }, "Verified connections enable text AI only for this browser tab. Media generation stays off unless separately verified."))), !isStudentAiSetup && /* @__PURE__ */ React.createElement(
      "button",
      {
        "data-help-key": "ai_backend_advanced_toggle",
        type: "button",
        "aria-expanded": advancedOpen,
        onClick: () => {
          setGuidedReady(false);
          setAdvancedOpen((v) => !v);
        },
        className: "w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-violet-700 border-t border-slate-100 pt-3 transition-colors"
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "inline-block transition-transform " + (advancedOpen ? "rotate-180" : "") }, "\u25BC"),
      advancedOpen ? t("ai_backend.advanced_toggle_close") || "Back to guided setup" : t("ai_backend.advanced_toggle") || "Advanced settings"
    )))
  );
}
window.AlloModules = window.AlloModules || {};
// GroupSessionModal + PdfDiffViewer live in view_misc_panels_module.js; this module only owns
// UDLGuideModal + AIBackendModal. Registering the other two from here resolves them to null
// (they aren't defined in this scope) and is harmless only because view_misc_panels loads later.
window.AlloModules.UDLGuideModal = (typeof UDLGuideModal !== 'undefined') ? UDLGuideModal : null;
window.AlloModules.AIBackendModal = (typeof AIBackendModal !== 'undefined') ? AIBackendModal : null;
window.AlloModules.ModelDiagnosticsSection = (typeof ModelDiagnosticsSection !== 'undefined') ? ModelDiagnosticsSection : null;
window.AlloModules.PlatformDiagnosticsSection = (typeof PlatformDiagnosticsSection !== 'undefined') ? PlatformDiagnosticsSection : null;
window.AlloModules.ViewMiscModalsModule = true;
window.AlloModules.MiscModals = true;  // satisfies loadModule('MiscModals', ...) registration check
console.log('[CDN] ViewMiscModalsModule loaded — 2 modals + 2 shared sections registered (UDLGuide, AIBackend, ModelDiagnosticsSection, PlatformDiagnosticsSection)');
})();
