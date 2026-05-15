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
  const {
    InteractiveBlueprintCard,
    activeBlueprint,
    addToast,
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
    showUDLGuide,
    suggestedStandards,
    t,
    theme,
    udlInput,
    udlInputRef,
    udlMessages,
    udlScrollRef,
    udlStandardFramework,
    udlStandardGrade
  } = props;
  if (!showUDLGuide) return null;
  return /* @__PURE__ */ React.createElement("div", { className: `fixed z-[100] rounded-2xl flex flex-col animate-in fade-in slide-in-from-right-5 duration-300 overflow-hidden transition-all ${isUDLGuideExpanded ? "inset-4 top-24" : "top-24 right-4 bottom-4 w-96"} ${isSpotlightMode ? "opacity-20 hover:opacity-100 pointer-events-none hover:pointer-events-auto" : "opacity-100"} ${chatStyles.container}` }, /* @__PURE__ */ React.createElement("div", { className: `p-4 flex justify-between items-center shrink-0 ${chatStyles.header}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 font-bold" }, /* @__PURE__ */ React.createElement(HelpCircle, { size: 18 }), " ", t("chat_guide.header")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-help-key": "chat_voice_mode",
      onClick: (e) => {
        if (isHelpMode) return;
        e.preventDefault();
        const newState = !isConversationMode;
        setIsConversationMode(newState);
        if (newState) {
          setIsDictationMode(true);
          setIsBotVisible(true);
        }
      },
      className: `hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${isConversationMode ? "bg-green-700 text-white border-green-400" : "border-transparent"}`,
      title: isConversationMode ? t("chat_guide.voice_disable") : t("chat_guide.voice_enable")
    },
    /* @__PURE__ */ React.createElement(Headphones, { size: 12 }),
    " ",
    isConversationMode ? t("chat_guide.voice_on") : t("chat_guide.voice_mode")
  ), isConversationMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      "data-help-key": "chat_auto_send",
      onClick: handleToggleAutoSendVoice,
      className: `hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${autoSendVoice ? "bg-teal-700 text-white border-teal-400" : "border-transparent opacity-80"}`,
      title: t("chat_guide.auto_send_tooltip"),
      "aria-label": t("chat_guide.auto_send_tooltip")
    },
    autoSendVoice ? /* @__PURE__ */ React.createElement(Zap, { size: 12, className: "fill-current" }) : /* @__PURE__ */ React.createElement(Zap, { size: 12 }),
    autoSendVoice ? t("chat_guide.auto_send_on") : t("chat_guide.auto_send_off")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "data-help-key": "chat_save",
      onClick: () => saveFullChat(),
      className: "hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border-transparent",
      title: t("common.save_conversation_to_history"),
      "aria-label": t("common.save_conversation_to_history")
    },
    /* @__PURE__ */ React.createElement(Save, { size: 12 }),
    " ",
    t("chat_guide.save_chat")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.show"),
      "data-help-key": "chat_show_me",
      onClick: handleToggleIsShowMeMode,
      className: `hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${isShowMeMode ? "bg-yellow-400 text-indigo-900 border-yellow-500" : "border-transparent"}`,
      title: isShowMeMode ? t("chat_guide.show_me_disable_tooltip") : t("chat_guide.show_me_enable_tooltip")
    },
    /* @__PURE__ */ React.createElement(Eye, { size: 12 }),
    " ",
    isShowMeMode ? t("chat_guide.show_me_on") : t("chat_guide.show_me")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.minimize"),
      "data-help-key": "chat_expand",
      onClick: handleToggleIsUDLGuideExpanded,
      className: "hover:bg-white/20 p-1 rounded transition-colors",
      title: isUDLGuideExpanded ? t("common.minimize") : t("common.maximize")
    },
    isUDLGuideExpanded ? /* @__PURE__ */ React.createElement(Minimize, { size: 18 }) : /* @__PURE__ */ React.createElement(Maximize, { size: 18 })
  ), /* @__PURE__ */ React.createElement("button", { "data-help-key": "chat_close", onClick: handleSetShowUDLGuideToFalse, className: "hover:bg-white/20 p-1 rounded", "aria-label": t("common.close") }, /* @__PURE__ */ React.createElement(X, { size: 18 })))), /* @__PURE__ */ React.createElement("div", { className: `flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar ${chatStyles.body}`, ref: udlScrollRef }, udlMessages.map((msg, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: `flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}` }, !msg.type && /* @__PURE__ */ React.createElement("div", { className: `max-w-[85%] p-3 rounded-xl text-sm shadow-sm ${msg.role === "user" ? `${chatStyles.userBubble} rounded-br-none` : `${chatStyles.modelBubble} rounded-bl-none`}` }, renderFormattedText(msg.text)), msg.type === "blueprint" && activeBlueprint && /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-[95%]" }, /* @__PURE__ */ React.createElement(
    InteractiveBlueprintCard,
    {
      config: activeBlueprint,
      onUpdate: handleBlueprintUIUpdate,
      onConfirm: handleExecuteBlueprint,
      onCancel: () => {
        setUdlMessages((prev) => [...prev, { role: "model", text: t("blueprint.cancel_msg") }]);
        setActiveBlueprint(null);
      }
    }
  )), !msg.type && msg.role === "model" && msg.isActionable && idx > 0 && /* @__PURE__ */ React.createElement(
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
  ))), isChatProcessing && /* @__PURE__ */ React.createElement("div", { className: "flex items-start" }, /* @__PURE__ */ React.createElement("div", { className: `p-3 rounded-xl rounded-bl-none flex items-center gap-2 text-sm ${chatStyles.modelBubble}` }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), " ", t("bot.mood_thinking")))), /* @__PURE__ */ React.createElement("div", { className: `p-3 border-t ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${chatStyles.inputArea}` }, /* @__PURE__ */ React.createElement("div", { className: `mb-3 p-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700" : theme === "contrast" ? "bg-black border-white" : "bg-slate-50 border-slate-200"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ React.createElement("label", { className: `text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${chatStyles.subText}` }, /* @__PURE__ */ React.createElement(Search, { size: 10 }), " ", t("standards.finder_header"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
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
  ))), /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg transition-all duration-500 select-none ${!isAutoFillMode && !hasUsedAutoFill ? "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 shadow-sm animate-pulse" : `border border-transparent px-1 ${chatStyles.subText}`}` }, /* @__PURE__ */ React.createElement(
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
function AIBackendModal(props) {
  const {
    _isCanvasEnv,
    ai,
    setShowAIBackendModal,
    showAIBackendModal,
    t
  } = props;
  if (!(showAIBackendModal && !_isCanvasEnv)) return null;
  return /* @__PURE__ */ React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: (e) => {
    if (e.key === "Escape") e.currentTarget.click();
  }, className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300", onClick: () => setShowAIBackendModal(false) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative border-4 border-violet-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto", role: "dialog", "aria-modal": "true", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowAIBackendModal(false), className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10", "aria-label": t("common.close") || "Close" }, /* @__PURE__ */ React.createElement(X, { size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-6 text-violet-900" }, /* @__PURE__ */ React.createElement("div", { className: "bg-violet-100 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Unplug, { size: 20, className: "text-violet-600" })), /* @__PURE__ */ React.createElement("h3", { className: "font-black text-lg" }, "AI Backend Settings")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, "Provider"), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "AI Backend Provider",
      id: "ai-backend-provider",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").backend || "gemini";
        } catch {
          return "gemini";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        const defaults = { gemini: "", localai: "http://localhost:8080", ollama: "http://localhost:11434", openai: "https://api.openai.com", claude: "https://api.anthropic.com", "onnx-npu": "http://localhost:11435", custom: "http://localhost:8080" };
        const updated = { ...current, backend: e.target.value, baseUrl: defaults[e.target.value] || "" };
        localStorage.setItem("alloflow_ai_config", JSON.stringify(updated));
        const urlEl = document.getElementById("ai-backend-url");
        if (urlEl) urlEl.value = updated.baseUrl || "";
      },
      className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-bold text-slate-700 bg-white cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "gemini" }, "\u2728 Gemini (Google) \u2014 Default"),
    /* @__PURE__ */ React.createElement("option", { value: "localai" }, "\u{1F5A5}\uFE0F LocalAI (Self-Hosted GPU)"),
    /* @__PURE__ */ React.createElement("option", { value: "ollama" }, "\u{1F999} Ollama (Local)"),
    /* @__PURE__ */ React.createElement("option", { value: "openai" }, "\u{1F916} OpenAI"),
    /* @__PURE__ */ React.createElement("option", { value: "claude" }, "\u{1F9E0} Claude (Anthropic)"),
    /* @__PURE__ */ React.createElement("option", { value: "onnx-npu" }, "\u{1F9E0} On-Device NPU (Snapdragon)"),
    /* @__PURE__ */ React.createElement("option", { value: "custom" }, "\u2699\uFE0F Custom Endpoint")
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, "Server URL"), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "ai-backend-url",
      "aria-label": "Custom AI backend URL",
      type: "text",
      placeholder: "http://localhost:8080",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").baseUrl || "";
        } catch {
          return "";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        localStorage.setItem("alloflow_ai_config", JSON.stringify({ ...current, baseUrl: e.target.value }));
      },
      className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, "API Key ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, "(cloud providers only)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "ai-backend-apikey",
      "aria-label": "Custom AI backend API key",
      type: "password",
      placeholder: "Your API key...",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").apiKey || "";
        } catch {
          return "";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        localStorage.setItem("alloflow_ai_config", JSON.stringify({ ...current, apiKey: e.target.value }));
      },
      className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5" }, "Wolfram Alpha App ID ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, "(optional \u2014 enhances math)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "ai-backend-wolfram",
      "aria-label": "Custom backend Wolfram App ID",
      type: "text",
      placeholder: "XXXXX-XXXXXXXXXX (from developer.wolframalpha.com)",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").wolframAppId || "";
        } catch {
          return "";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        localStorage.setItem("alloflow_ai_config", JSON.stringify({ ...current, wolframAppId: e.target.value }));
      },
      className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, "Free: 2,000 queries/month \u2022 Adds exact math solving & step-by-step verification")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 pt-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      id: "ai-backend-test",
      onClick: async () => {
        const btn = document.getElementById("ai-backend-test");
        const status = document.getElementById("ai-backend-status");
        btn.disabled = true;
        btn.textContent = "\u23F3 Testing...";
        if (status) {
          status.textContent = "";
          status.className = "";
        }
        try {
          const result = await ai.testConnection();
          if (result.success) {
            if (status) {
              status.textContent = "\u2705 Connected! " + result.modelCount + " model(s) available";
              status.className = "text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100";
            }
            const modelSelect = document.getElementById("ai-backend-model-default");
            const fallbackSelect = document.getElementById("ai-backend-model-fallback");
            if (modelSelect && result.models?.length > 0) {
              modelSelect.innerHTML = '<option value="">Auto (server default)</option>' + result.models.map((m) => `<option value="${m.id}">${m.id}</option>`).join("");
              const cfg = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
              if (cfg.models?.default) modelSelect.value = cfg.models.default;
            }
            if (fallbackSelect && result.models?.length > 0) {
              fallbackSelect.innerHTML = '<option value="">Same as default</option>' + result.models.map((m) => `<option value="${m.id}">${m.id}</option>`).join("");
              const cfg = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
              if (cfg.models?.fallback) fallbackSelect.value = cfg.models.fallback;
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
        btn.disabled = false;
        btn.textContent = "\u{1F50C} Test Connection";
      },
      className: "flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95"
    },
    "\u{1F50C} Test Connection"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        localStorage.removeItem("alloflow_ai_config");
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
          s.textContent = "\u{1F504} Reset to defaults \u2014 reload page to apply";
          s.className = "text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100";
        }
      },
      className: "bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all active:scale-95"
    },
    "\u21A9 Reset"
  )), /* @__PURE__ */ React.createElement("div", { id: "ai-backend-status" }), /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(Cpu, { size: 14, className: "text-blue-600" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, "Model Selection")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "Default Model ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, "(text generation)")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "Default AI model",
      id: "ai-backend-model-default",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").models?.default || "";
        } catch {
          return "";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        const models = { ...current.models || {}, default: e.target.value || void 0 };
        if (!e.target.value) delete models.default;
        localStorage.setItem("alloflow_ai_config", JSON.stringify({ ...current, models }));
      },
      className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Auto (server default)")
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "Fallback Model ", /* @__PURE__ */ React.createElement("span", { className: "normal-case font-normal text-slate-600" }, "(rate-limit cascade)")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "Fallback AI model",
      id: "ai-backend-model-fallback",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").models?.fallback || "";
        } catch {
          return "";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        const models = { ...current.models || {}, fallback: e.target.value || void 0 };
        if (!e.target.value) delete models.fallback;
        localStorage.setItem("alloflow_ai_config", JSON.stringify({ ...current, models }));
      },
      className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Same as default")
  )), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic" }, '\u{1F4A1} Click "Test Connection" above to auto-populate available models from your backend.'))), /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-emerald-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(Headphones, { size: 14, className: "text-emerald-600" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, "Text-to-Speech")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "Text-to-speech provider",
      id: "ai-backend-tts-provider",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").ttsProvider || "auto";
        } catch {
          return "auto";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        localStorage.setItem("alloflow_ai_config", JSON.stringify({ ...current, ttsProvider: e.target.value }));
      },
      className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "auto" }, "\u{1F504} Auto (match backend)"),
    /* @__PURE__ */ React.createElement("option", { value: "gemini" }, "\u2728 Gemini Cloud TTS"),
    /* @__PURE__ */ React.createElement("option", { value: "local" }, "\u{1F5A5}\uFE0F Local TTS (Kokoro \u2192 Edge TTS cascade)"),
    /* @__PURE__ */ React.createElement("option", { value: "browser" }, "\u{1F310} Browser Built-in (speechSynthesis)"),
    /* @__PURE__ */ React.createElement("option", { value: "off" }, "\u{1F507} Off (disable narration)")
  ), /* @__PURE__ */ React.createElement("div", { className: "mt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-emerald-700 font-medium leading-relaxed" }, /* @__PURE__ */ React.createElement("strong", null, "Auto:"), " Gemini voices for cloud backends, Edge TTS voices for local backends. Narrator voice selection is in the header bar (\u{1F3A7} button)."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-emerald-600 mt-1" }, /* @__PURE__ */ React.createElement("strong", null, "Local cascade:"), " Kokoro (:8880, 8 langs) \u2192 Edge TTS (:5500, 40+ langs) \u2192 Browser fallback"))), /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t-2 border-violet-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-100 p-1.5 rounded-lg" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 14, className: "text-amber-600" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-700 uppercase tracking-wider" }, "Image Generation")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "Image generation provider",
      id: "ai-backend-image-provider",
      defaultValue: (() => {
        try {
          return JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}").imageProvider || "auto";
        } catch {
          return "auto";
        }
      })(),
      onChange: (e) => {
        const current = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        localStorage.setItem("alloflow_ai_config", JSON.stringify({ ...current, imageProvider: e.target.value }));
      },
      className: "w-full p-2 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "auto" }, "\u{1F504} Auto (match backend)"),
    /* @__PURE__ */ React.createElement("option", { value: "imagen" }, "\u{1F3A8} Imagen 4.0 (Google Cloud)"),
    /* @__PURE__ */ React.createElement("option", { value: "flux" }, "\u{1F5BC}\uFE0F FLUX (Local \u2014 port 7860)"),
    /* @__PURE__ */ React.createElement("option", { value: "off" }, "\u{1F6AB} Off (disable image generation)")
  ), /* @__PURE__ */ React.createElement("div", { className: "mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-700 font-medium leading-relaxed" }, /* @__PURE__ */ React.createElement("strong", null, "Imagen:"), " Google Cloud (requires Blaze plan). High quality, fast."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-600 mt-1" }, /* @__PURE__ */ React.createElement("strong", null, "FLUX:"), " Self-hosted at localhost:7860. Supports generation + editing via FLUX Kontext. No cloud dependency."))), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 font-medium leading-relaxed" }, /* @__PURE__ */ React.createElement("strong", { className: "text-slate-600" }, "Active:"), " ", (() => {
    try {
      const c = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
      return c.backend ? c.backend.charAt(0).toUpperCase() + c.backend.slice(1) + (c.baseUrl ? " \u2192 " + c.baseUrl : "") : "Gemini (default)";
    } catch {
      return "Gemini (default)";
    }
  })()), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 font-medium mt-1" }, "\u26A1 Reload page after changing backend to apply.")))));
}
window.AlloModules = window.AlloModules || {};
// GroupSessionModal + PdfDiffViewer live in view_misc_panels_module.js; this module only owns
// UDLGuideModal + AIBackendModal. Registering the other two from here resolves them to null
// (they aren't defined in this scope) and is harmless only because view_misc_panels loads later.
window.AlloModules.UDLGuideModal = (typeof UDLGuideModal !== 'undefined') ? UDLGuideModal : null;
window.AlloModules.AIBackendModal = (typeof AIBackendModal !== 'undefined') ? AIBackendModal : null;
window.AlloModules.ViewMiscModalsModule = true;
window.AlloModules.MiscModals = true;  // satisfies loadModule('MiscModals', ...) registration check
console.log('[CDN] ViewMiscModalsModule loaded — 2 modals registered (UDLGuide, AIBackend)');
})();
