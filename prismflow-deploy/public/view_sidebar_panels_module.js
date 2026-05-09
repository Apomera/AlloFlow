(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewSidebarPanelsModule) { console.log('[CDN] ViewSidebarPanelsModule already loaded, skipping'); return; }
var React = window.React || React;
var ReactDOM = window.ReactDOM;
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
var AlertCircle = _lazyIcon('AlertCircle');
var ArrowRight = _lazyIcon('ArrowRight');
var Ban = _lazyIcon('Ban');
var BookOpen = _lazyIcon('BookOpen');
var CheckCircle = _lazyIcon('CheckCircle');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var ChevronDown = _lazyIcon('ChevronDown');
var Download = _lazyIcon('Download');
var ExternalLink = _lazyIcon('ExternalLink');
var FileText = _lazyIcon('FileText');
var Flag = _lazyIcon('Flag');
var Globe = _lazyIcon('Globe');
var Heart = _lazyIcon('Heart');
var History = _lazyIcon('History');
var ImageIcon = _lazyIcon('ImageIcon');
var Layout = _lazyIcon('Layout');
var Link = _lazyIcon('Link');
var ListOrdered = _lazyIcon('ListOrdered');
var Lock = _lazyIcon('Lock');
var MessageSquare = _lazyIcon('MessageSquare');
var MonitorPlay = _lazyIcon('MonitorPlay');
var Palette = _lazyIcon('Palette');
var PenTool = _lazyIcon('PenTool');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Search = _lazyIcon('Search');
var Settings = _lazyIcon('Settings');
var Settings2 = _lazyIcon('Settings2');
var Smile = _lazyIcon('Smile');
var Sparkles = _lazyIcon('Sparkles');
var X = _lazyIcon('X');
function AdventurePanel(props) {
  const {
    Cloud,
    CloudOff,
    Octagon,
    Package,
    addToast,
    adventureArtStyle,
    adventureChanceMode,
    adventureConsistentCharacters,
    adventureCustomArtStyle,
    adventureCustomInstructions,
    adventureDifficulty,
    adventureFreeResponseEnabled,
    adventureInputMode,
    adventureLanguageMode,
    adventureState,
    enableFactionResources,
    expandedTools,
    factionResourceMode,
    globalPoints,
    handleResumeAdventure,
    handleSetFactionResourceModeToAi,
    handleSetFactionResourceModeToManual,
    handleStartAdventure,
    hasSavedAdventure,
    hasSourceOrAnalysis,
    isAdventureCloudEnabled,
    isAdventureStoryMode,
    isProcessing,
    isResumingAdventure,
    isSocialStoryMode,
    isTeacherMode,
    safeSetItem,
    selectedLanguages,
    setAdventureArtStyle,
    setAdventureChanceMode,
    setAdventureConsistentCharacters,
    setAdventureCustomArtStyle,
    setAdventureCustomInstructions,
    setAdventureDifficulty,
    setAdventureFreeResponseEnabled,
    setAdventureInputMode,
    setAdventureLanguageMode,
    setAdventureState,
    setEnableFactionResources,
    setIsAdventureCloudEnabled,
    setIsAdventureStoryMode,
    setIsSocialStoryMode,
    setSocialStoryFocus,
    setStudentProjectSettings,
    setUseLowQualityVisuals,
    socialStoryFocus,
    studentProjectSettings,
    t,
    useLowQualityVisuals
  } = props;
  if (!expandedTools || !expandedTools.includes("adventure")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-purple-50/50 flex flex-col gap-3" }, hasSavedAdventure && /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.resume_saved_adventure"),
      "data-help-key": "adventure_resume_btn",
      onClick: handleResumeAdventure,
      disabled: isResumingAdventure,
      className: "w-full bg-white border-2 border-purple-600 text-purple-700 text-sm font-bold py-2 rounded-md hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 shadow-sm mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
    },
    isResumingAdventure ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(History, { size: 16 }),
    isResumingAdventure ? t("adventure.loading_save") : t("adventure.resume")
  ), globalPoints < studentProjectSettings.adventureUnlockXP ? /* @__PURE__ */ React.createElement("div", { className: "bg-slate-800 text-white p-4 rounded-xl text-center shadow-md border border-slate-600 animate-in zoom-in" }, /* @__PURE__ */ React.createElement(Lock, { size: 32, className: "mx-auto mb-2 text-yellow-400" }), /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-lg mb-1" }, t("adventure.locked_title")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 mb-3" }, t("adventure.locked_desc_prefix"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-bold text-yellow-400" }, studentProjectSettings.adventureUnlockXP, " XP"), " ", t("adventure.locked_desc_suffix")), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-600" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full bg-yellow-400 transition-all duration-500",
      style: { width: `${Math.min(100, globalPoints / studentProjectSettings.adventureUnlockXP * 100)}%` }
    }
  )), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] mt-1 font-mono opacity-70" }, globalPoints, " / ", studentProjectSettings.adventureUnlockXP, " XP"), /* @__PURE__ */ React.createElement("p", { className: "text-xs mt-3 text-purple-200 font-medium" }, t("adventure.locked_tip"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { "data-help-key": "adventure_input_mode" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("adventure.interaction_mode")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "adventure_setup_input_mode",
      value: adventureInputMode,
      onChange: (e) => setAdventureInputMode(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-shadow duration-300 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "choice" }, t("adventure.mode_choice")),
    /* @__PURE__ */ React.createElement("option", { value: "debate" }, t("adventure.mode_debate")),
    /* @__PURE__ */ React.createElement("option", { value: "system" }, t("adventure.mode_system"))
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, adventureInputMode === "choice" ? t("adventure.mode_choice_desc") : adventureInputMode === "debate" ? t("adventure.mode_debate_desc") : t("adventure.mode_system_desc"))), /* @__PURE__ */ React.createElement("div", { "data-help-key": "adventure_difficulty" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("adventure.difficulty_label")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "adventure_setup_difficulty",
      value: adventureDifficulty,
      onChange: (e) => setAdventureDifficulty(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-shadow duration-300 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Story" }, t("adventure.diff_story_option")),
    /* @__PURE__ */ React.createElement("option", { value: "Normal" }, t("adventure.diff_normal_option")),
    /* @__PURE__ */ React.createElement("option", { value: "Hard" }, t("adventure.diff_hard_option")),
    /* @__PURE__ */ React.createElement("option", { value: "Hardcore" }, t("adventure.diff_hardcore_option"))
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, adventureDifficulty === "Story" ? t("adventure.diff_story_desc") : adventureDifficulty === "Hard" ? t("adventure.diff_hard_desc") : adventureDifficulty === "Hardcore" ? t("adventure.diff_hardcore_desc") : t("adventure.diff_normal_desc"))), /* @__PURE__ */ React.createElement("div", { "data-help-key": "adventure_language" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("adventure.language_label")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "adventure_setup_language",
      value: adventureLanguageMode,
      onChange: (e) => setAdventureLanguageMode(e.target.value),
      disabled: !isTeacherMode && !studentProjectSettings.adventurePermissions?.allowLanguageSwitch,
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-shadow duration-300 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "English" }, t("adventure.lang_options.english_only")),
    selectedLanguages.map((lang) => /* @__PURE__ */ React.createElement(React.Fragment, { key: lang }, /* @__PURE__ */ React.createElement("option", { value: lang }, t("adventure.lang_options.only_suffix", { lang })), /* @__PURE__ */ React.createElement("option", { value: `${lang} + English` }, t("adventure.lang_options.plus_english", { lang })))),
    selectedLanguages.length > 1 && /* @__PURE__ */ React.createElement("option", { value: "All + English" }, t("adventure.lang_options.all_plus_english", { langs: selectedLanguages.join(", ") }))
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, t("adventure.language_help"))), /* @__PURE__ */ React.createElement("div", { "data-help-key": "adventure_custom_instructions" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-purple-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("input.custom_instructions") || "Custom instructions for adventure",
      value: adventureCustomInstructions,
      onChange: (e) => setAdventureCustomInstructions(e.target.value),
      placeholder: t("common.adventure_instructions_placeholder"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none resize-none h-16 transition-shadow duration-300"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200", "data-help-key": "adventure_free_response" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_adventure_free_response_enabled"),
      id: "freeResponseMode",
      type: "checkbox",
      "data-help-key": "adventure_setup_chk_freeresponse",
      checked: adventureFreeResponseEnabled,
      onChange: (e) => setAdventureFreeResponseEnabled(e.target.checked),
      className: "w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "freeResponseMode", className: "text-xs font-bold text-purple-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PenTool, { size: 14, className: "text-purple-600" }), " ", t("adventure.free_response_label"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-normal opacity-80" }, t("adventure.free_response_desc")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200", "data-help-key": "adventure_chance_mode" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_adventure_chance_mode"),
      id: "chanceMode",
      type: "checkbox",
      "data-help-key": "adventure_setup_chk_chance",
      checked: adventureChanceMode,
      onChange: (e) => setAdventureChanceMode(e.target.checked),
      className: "w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "chanceMode", className: "text-xs font-bold text-purple-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Octagon, { size: 14, className: "text-purple-600" }), " ", t("adventure.chance_mode_label"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-normal opacity-80" }, t("adventure.chance_mode_desc")))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 bg-pink-50 p-2 rounded border border-pink-200", "data-help-key": "adventure_social_story" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_is_social_story_mode"),
      id: "socialStoryMode",
      type: "checkbox",
      checked: isSocialStoryMode,
      onChange: (e) => setIsSocialStoryMode(e.target.checked),
      className: "w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "socialStoryMode", className: "text-xs font-bold text-pink-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Heart, { size: 14, className: "text-pink-600" }), " ", t("adventure.social_story_mode_label") || "Social Story Mode (SEL)", /* @__PURE__ */ React.createElement("span", { className: "font-normal opacity-80" }, t("adventure.social_story_mode_desc") || "Focus on social skills"))), isSocialStoryMode && /* @__PURE__ */ React.createElement("div", { className: "pl-6 animate-in slide-in-from-top-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] text-pink-700 font-bold mb-1 uppercase opacity-80" }, t("adventure.social_story_focus_label") || "Target Social Skill / Focus:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.adventure_social_story_focus_placeholder"),
      type: "text",
      value: socialStoryFocus,
      onChange: (e) => setSocialStoryFocus(e.target.value),
      placeholder: t("adventure.social_story_focus_placeholder") || "e.g., Sharing toys, Dealing with frustration",
      className: "w-full text-xs p-1.5 border border-pink-300 rounded focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none text-pink-900 placeholder:text-pink-300"
    }
  ))), adventureInputMode === "system" && /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 p-2 rounded border border-amber-200 space-y-2", "data-help-key": "adventure_system_state" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_enable_faction_resources"),
      id: "enableFactionResources",
      type: "checkbox",
      checked: enableFactionResources,
      onChange: (e) => setEnableFactionResources(e.target.checked),
      className: "w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "enableFactionResources", className: "text-xs font-bold text-amber-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Package, { size: 14, className: "text-amber-600" }), " ", t("adventure.system_state_label"), /* @__PURE__ */ React.createElement("span", { className: "font-normal opacity-80" }, t("adventure.system_state_desc")))), enableFactionResources && /* @__PURE__ */ React.createElement("div", { className: "pl-6 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs text-amber-700 font-medium" }, t("adventure.system_state_mode_label"), ":"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetFactionResourceModeToAi,
      className: `px-2 py-1 text-xs rounded-full font-medium transition-all ${factionResourceMode === "ai" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`
    },
    "\u{1F916} ",
    t("adventure.system_state_ai_decides")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetFactionResourceModeToManual,
      className: `px-2 py-1 text-xs rounded-full font-medium transition-all ${factionResourceMode === "manual" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`
    },
    "\u270F\uFE0F ",
    t("adventure.system_state_manual_entry")
  ))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-600 italic" }, factionResourceMode === "ai" ? t("adventure.system_state_ai_desc") : t("adventure.system_state_manual_desc")), factionResourceMode === "manual" && /* @__PURE__ */ React.createElement("div", { className: "space-y-2 bg-amber-50/50 p-2 rounded border border-amber-200" }, (adventureState.systemResources || []).map((resource, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "flex items-center gap-2 text-xs" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_resource"),
      type: "text",
      value: resource.icon,
      onChange: (e) => {
        const updated = [...adventureState.systemResources || []];
        updated[idx] = { ...updated[idx], icon: e.target.value };
        setAdventureState((prev) => ({ ...prev, systemResources: updated }));
      },
      className: "w-10 p-1 text-center border border-amber-300 rounded text-sm",
      placeholder: "\u{1F539}"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": "\u{1F539}",
      type: "text",
      value: resource.name,
      onChange: (e) => {
        const updated = [...adventureState.systemResources || []];
        updated[idx] = { ...updated[idx], name: e.target.value };
        setAdventureState((prev) => ({ ...prev, systemResources: updated }));
      },
      className: "flex-1 p-1 border border-amber-300 rounded",
      placeholder: t("common.placeholder_state_variable")
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.state_variable"),
      type: "number",
      value: resource.quantity,
      onChange: (e) => {
        const updated = [...adventureState.systemResources || []];
        updated[idx] = { ...updated[idx], quantity: parseInt(e.target.value) || 0 };
        setAdventureState((prev) => ({ ...prev, systemResources: updated }));
      },
      className: "w-16 p-1 border border-amber-300 rounded text-center",
      min: "0"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_resource"),
      type: "text",
      value: resource.unit || "",
      onChange: (e) => {
        const updated = [...adventureState.systemResources || []];
        updated[idx] = { ...updated[idx], unit: e.target.value };
        setAdventureState((prev) => ({ ...prev, systemResources: updated }));
      },
      className: "w-12 p-1 border border-amber-300 rounded text-center text-[11px]",
      placeholder: "%",
      title: t("common.unit_e_g_people_days")
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.remove"),
      onClick: () => {
        const updated = (adventureState.systemResources || []).filter((_, i) => i !== idx);
        setAdventureState((prev) => ({ ...prev, systemResources: updated }));
      },
      className: "p-1 text-red-500 hover:text-red-700",
      title: t("common.remove")
    },
    /* @__PURE__ */ React.createElement(X, { size: 14 })
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.add"),
      onClick: () => {
        const updated = [...adventureState.systemResources || [], { name: "", icon: "\u{1F539}", quantity: 50, unit: "%", type: "strategic" }];
        setAdventureState((prev) => ({ ...prev, systemResources: updated }));
      },
      className: "text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1"
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 12 }),
    " ",
    t("adventure.add_state_variable")
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200", "data-help-key": "adventure_story_mode" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_is_adventure_story_mode"),
      id: "storyMode",
      type: "checkbox",
      "data-help-key": "adventure_setup_chk_story",
      checked: isAdventureStoryMode,
      onChange: (e) => setIsAdventureStoryMode(e.target.checked),
      className: "w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "storyMode", className: "text-xs font-bold text-purple-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(BookOpen, { size: 14, className: "text-purple-600" }), " ", t("adventure.story_mode_label"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-normal opacity-70 hidden sm:inline" }, t("adventure.story_mode_desc")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-violet-100/50 p-2 rounded border border-violet-200", "data-help-key": "adventure_consistent_characters" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_consistent_characters") || "Toggle consistent characters",
      id: "advConsistentChars",
      type: "checkbox",
      "data-help-key": "adventure_setup_chk_consistent_characters",
      checked: adventureConsistentCharacters,
      onChange: (e) => setAdventureConsistentCharacters(e.target.checked),
      disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
      className: "w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "advConsistentChars", className: "text-xs font-bold text-violet-800 cursor-pointer select-none flex items-center gap-2" }, "\u{1F3AD} ", t("adventure.consistent_characters_label") || "Consistent Characters", /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-normal opacity-70 hidden sm:inline" }, t("adventure.consistent_characters_desc") || "Persistent visual cast across scenes"))), /* @__PURE__ */ React.createElement("details", { className: "group/adv-settings" }, /* @__PURE__ */ React.createElement("summary", { className: "flex items-center gap-2 bg-slate-100/50 p-2 rounded border border-slate-400 cursor-pointer select-none hover:bg-slate-100 transition-colors list-none" }, /* @__PURE__ */ React.createElement(Settings, { size: 14, className: "text-slate-600" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "\u2699\uFE0F ", t("adventure.advanced_settings") || "Advanced Settings"), /* @__PURE__ */ React.createElement(ChevronDown, { size: 12, className: "text-slate-600 ml-auto transition-transform group-open/adv-settings:rotate-180" })), /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 space-y-1.5 pl-1 animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-indigo-100/50 p-2 rounded border border-indigo-200", "data-help-key": "adventure_art_style" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "advArtStyle", className: "text-xs font-bold text-indigo-800 cursor-pointer select-none flex items-center gap-2 whitespace-nowrap" }, "\u{1F3A8} ", t("adventure.art_style_label") || "Art Style"), /* @__PURE__ */ React.createElement("select", { id: "advArtStyle", value: adventureArtStyle, onChange: (e) => setAdventureArtStyle(e.target.value), className: "flex-1 text-xs px-2 py-1 border border-indigo-600 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer" }, /* @__PURE__ */ React.createElement("option", { value: "auto" }, "\u{1F3A8} ", t("adventure.art_auto") || "Auto (default)"), /* @__PURE__ */ React.createElement("option", { value: "storybook" }, "\u{1F4DA} ", t("adventure.art_storybook") || "Storybook"), /* @__PURE__ */ React.createElement("option", { value: "pixel" }, "\u{1F3AE} ", t("adventure.art_pixel") || "Pixel Art"), /* @__PURE__ */ React.createElement("option", { value: "cinematic" }, "\u{1F3AC} ", t("adventure.art_cinematic") || "Cinematic"), /* @__PURE__ */ React.createElement("option", { value: "anime" }, "\u{1F3A8} ", t("adventure.art_anime") || "Anime"), /* @__PURE__ */ React.createElement("option", { value: "crayon" }, "\u{1F58D}\uFE0F ", t("adventure.art_crayon") || "Hand-drawn"), /* @__PURE__ */ React.createElement("option", { value: "custom" }, "\u270F\uFE0F ", t("adventure.art_custom") || "Custom..."))), adventureArtStyle === "custom" && /* @__PURE__ */ React.createElement("input", { type: "text", "aria-label": t("adventure.custom_art_style_placeholder") || "Custom art style", value: adventureCustomArtStyle, onChange: (e) => setAdventureCustomArtStyle(e.target.value), placeholder: t("adventure.custom_art_style_placeholder") || "Describe your art style...", className: "w-full text-xs px-3 py-1.5 border border-indigo-600 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200", "data-help-key": "adventure_low_quality" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_use_low_quality_visuals"),
      id: "advLowQuality",
      type: "checkbox",
      "data-help-key": "adventure_setup_chk_lowqual",
      checked: useLowQualityVisuals,
      onChange: (e) => setUseLowQualityVisuals(e.target.checked),
      className: "w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "advLowQuality", className: "text-xs font-bold text-purple-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(MonitorPlay, { size: 14, className: "text-purple-600" }), " ", t("adventure.low_quality_label"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-normal opacity-70" }, t("adventure.low_quality_desc")))), (isTeacherMode || studentProjectSettings.adventurePermissions?.allowCloudImageStorage !== false) && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-green-100/50 p-2 rounded border border-green-200", "data-help-key": "adventure_cloud_storage" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_is_adventure_cloud_enabled"),
      id: "advCloudStorage",
      type: "checkbox",
      checked: isAdventureCloudEnabled,
      onChange: (e) => {
        setIsAdventureCloudEnabled(e.target.checked);
        safeSetItem("allo_adventure_cloud", e.target.checked ? "true" : "false");
      },
      className: "w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "advCloudStorage", className: "text-xs font-bold text-green-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Cloud, { size: 14, className: "text-green-600" }), " ", t("adventure.cloud_storage_label"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-normal opacity-70" }, t("adventure.cloud_storage_desc")))))), adventureFreeResponseEnabled && isAdventureCloudEnabled && (isTeacherMode || studentProjectSettings.adventurePermissions?.allowCloudImageStorage) && /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-300 rounded p-2 flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 14, className: "text-amber-600 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-800" }, /* @__PURE__ */ React.createElement("strong", null, t("adventure.pii_warning_title")), " ", t("adventure.pii_warning_desc"))), isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-red-100/50 p-2 rounded border border-red-200", "data-help-key": "adventure_lock_settings" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_lock_all_settings_false"),
      id: "lockAllSettings",
      type: "checkbox",
      checked: studentProjectSettings.adventurePermissions?.lockAllSettings || false,
      onChange: (e) => setStudentProjectSettings((prev) => ({
        ...prev,
        adventurePermissions: {
          ...prev.adventurePermissions,
          lockAllSettings: e.target.checked
        }
      })),
      className: "w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "lockAllSettings", className: "text-xs font-bold text-red-800 cursor-pointer select-none flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Lock, { size: 14, className: "text-red-600" }), " ", t("adventure.lock_settings_label"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-normal opacity-70" }, t("adventure.lock_settings_desc")))), isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-amber-100/50 p-2 rounded border border-amber-200", "data-help-key": "adventure_allow_cloud" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_allow_cloud_image_storage_false"),
      id: "allowCloudImageStorage",
      type: "checkbox",
      checked: studentProjectSettings.adventurePermissions?.allowCloudImageStorage !== false,
      onChange: (e) => setStudentProjectSettings((prev) => ({
        ...prev,
        adventurePermissions: {
          ...prev.adventurePermissions,
          allowCloudImageStorage: e.target.checked
        }
      })),
      className: "w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "allowCloudImageStorage", className: "text-xs font-bold text-amber-800 cursor-pointer select-none flex flex-col gap-0.5" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(CloudOff, { size: 14, className: "text-amber-600" }), " ", t("adventure.allow_cloud_storage_label")), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-normal opacity-70" }, t("adventure.allow_cloud_storage_desc")), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-normal text-amber-700 bg-amber-200/50 px-1 rounded mt-0.5" }, "\u26A0\uFE0F ", t("adventure.ferpa_warning")))), /* @__PURE__ */ React.createElement("div", { className: "bg-white p-3 rounded-lg border border-purple-100 shadow-sm space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-purple-100 pb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-purple-800 uppercase tracking-widest flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Flag, { size: 12 }), " ", t("adventure.climax.settings_header")), adventureState.climax?.isActive && /* @__PURE__ */ React.createElement("span", { className: "bg-red-100 text-red-600 text-[11px] font-black px-2 py-0.5 rounded border border-red-200 animate-pulse" }, t("adventure.climax.status_active"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", "data-help-key": "adventure_auto_climax" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_enable_auto_climax_false"),
      id: "enableAutoClimax",
      type: "checkbox",
      checked: adventureState.enableAutoClimax || false,
      onChange: (e) => setAdventureState((prev) => ({ ...prev, enableAutoClimax: e.target.checked })),
      className: "w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "enableAutoClimax", className: "text-xs font-medium text-slate-700 cursor-pointer select-none" }, t("adventure.climax.enable_label"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs text-slate-600 font-medium" }, t("adventure.climax.min_rounds_label")), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_adventure_state"),
      type: "number",
      min: "3",
      max: "50",
      value: adventureState.climaxMinTurns || 20,
      onChange: (e) => setAdventureState((prev) => ({ ...prev, climaxMinTurns: Math.max(1, parseInt(e.target.value) || 20) })),
      className: "w-14 text-xs border border-purple-600 rounded p-1 text-center focus:ring-purple-500 outline-none font-bold text-purple-900"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-2 rounded border border-slate-100 flex flex-col gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[11px] text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center" }, /* @__PURE__ */ React.createElement("span", null, t("adventure.climax.status_turns")), /* @__PURE__ */ React.createElement("span", { className: `font-bold ${adventureState.turnCount >= (adventureState.climaxMinTurns || 20) ? "text-green-600" : "text-slate-600"}` }, adventureState.turnCount, "/", adventureState.climaxMinTurns || 20)), /* @__PURE__ */ React.createElement("div", { className: "h-full w-px bg-slate-200" }), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center" }, /* @__PURE__ */ React.createElement("span", null, t("adventure.climax.status_mastery")), /* @__PURE__ */ React.createElement("span", { className: `font-bold ${adventureState.climax?.masteryScore >= 80 ? "text-green-600" : "text-slate-600"}` }, adventureState.climax?.masteryScore || 0, "/80"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const minTurns = adventureState.climaxMinTurns || 20;
        if ((adventureState.turnCount || 0) < minTurns) {
          addToast(t("adventure.climax.warning_min_rounds", { count: minTurns }), "warning");
          return;
        }
        if ((adventureState.climax?.masteryScore || 0) < 80) {
          addToast(t("adventure.climax.warning_mastery"), "warning");
          return;
        }
        setAdventureState((prev) => ({
          ...prev,
          climax: {
            ...prev.climax,
            isActive: true,
            masteryScore: 50,
            archetype: prev.climax.archetype || "Catastrophe"
          }
        }));
        addToast(t("adventure.climax.toast_initiated"), "success");
      },
      disabled: adventureState.climax?.isActive,
      className: `w-full py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${adventureState.climax?.isActive ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-white border border-purple-200 text-purple-600 hover:bg-purple-50"}`
    },
    adventureState.climax?.isActive ? t("adventure.climax.active_btn") : t("adventure.climax.trigger_btn")
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.next"),
      "data-help-key": "adventure_start_btn",
      onClick: handleStartAdventure,
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-purple-700 transition-colors flex items-center gap-2" }, t("adventure.start"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-purple-600" })
  ))));
}
function SimplifiedPanel(props) {
  const {
    InfoTooltip,
    addInterest,
    addToast,
    aiStandardQuery,
    differentiationRange,
    dokLevel,
    expandedTools,
    gradeLevel,
    handleAddStandard,
    handleFindStandards,
    handleGenerate,
    handleInterestKeyDown,
    handleRemoveStandard,
    handleSetStandardModeToAi,
    handleSetStandardModeToManual,
    hasSourceOrAnalysis,
    includeCharts,
    interestInput,
    isFindingStandards,
    isProcessing,
    keepCitations,
    leveledTextCustomInstructions,
    leveledTextLanguage,
    leveledTextLength,
    removeInterest,
    selectedLanguages,
    setAiStandardQuery,
    setDifferentiationRange,
    setDokLevel,
    setGradeLevel,
    setIncludeCharts,
    setInterestInput,
    setKeepCitations,
    setLeveledTextCustomInstructions,
    setLeveledTextLanguage,
    setLeveledTextLength,
    setStandardInputValue,
    setTargetStandards,
    setTextFormat,
    setUseEmojis,
    standardInputValue,
    standardMode,
    studentInterests,
    suggestedStandards,
    t,
    targetStandards,
    textFormat,
    useEmojis
  } = props;
  if (!expandedTools || !expandedTools.includes("simplified")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { id: "tour-level-settings", "data-help-key": "tour-simplified-settings", className: "p-3 border-b border-slate-100 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("wizard.grade_level")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "simplified_grade_level",
      value: gradeLevel,
      onChange: (e) => setGradeLevel(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Kindergarten" }, t("grades.k")),
    /* @__PURE__ */ React.createElement("option", { value: "1st Grade" }, t("grades.g1")),
    /* @__PURE__ */ React.createElement("option", { value: "2nd Grade" }, t("grades.g2")),
    /* @__PURE__ */ React.createElement("option", { value: "3rd Grade" }, t("grades.g3")),
    /* @__PURE__ */ React.createElement("option", { value: "4th Grade" }, t("grades.g4")),
    /* @__PURE__ */ React.createElement("option", { value: "5th Grade" }, t("grades.g5")),
    /* @__PURE__ */ React.createElement("option", { value: "6th Grade" }, t("grades.g6")),
    /* @__PURE__ */ React.createElement("option", { value: "7th Grade" }, t("grades.g7")),
    /* @__PURE__ */ React.createElement("option", { value: "8th Grade" }, t("grades.g8")),
    /* @__PURE__ */ React.createElement("option", { value: "9th Grade" }, t("grades.g9")),
    /* @__PURE__ */ React.createElement("option", { value: "10th Grade" }, t("grades.g10")),
    /* @__PURE__ */ React.createElement("option", { value: "11th Grade" }, t("grades.g11")),
    /* @__PURE__ */ React.createElement("option", { value: "12th Grade" }, t("grades.g12")),
    /* @__PURE__ */ React.createElement("option", { value: "College" }, t("grades.college")),
    /* @__PURE__ */ React.createElement("option", { value: "Graduate Level" }, t("grades.grad"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("simplified.diff_label")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "simplified_differentiation",
      value: differentiationRange,
      onChange: (e) => setDifferentiationRange(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "None" }, t("simplified.diff_options.none")),
    /* @__PURE__ */ React.createElement("option", { value: "1" }, t("simplified.diff_options.one")),
    /* @__PURE__ */ React.createElement("option", { value: "2" }, t("simplified.diff_options.two")),
    /* @__PURE__ */ React.createElement("option", { value: "Both" }, t("simplified.diff_options.both"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("wizard.output_format")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "simplified_format",
      value: textFormat,
      onChange: (e) => setTextFormat(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Standard Text" }, t("simplified.formats.standard")),
    /* @__PURE__ */ React.createElement("option", { value: "Dialogue Script" }, t("simplified.formats.dialogue")),
    /* @__PURE__ */ React.createElement("option", { value: "Mock Advertisement" }, t("simplified.formats.advertisement")),
    /* @__PURE__ */ React.createElement("option", { value: "News Report" }, t("simplified.formats.news")),
    /* @__PURE__ */ React.createElement("option", { value: "Podcast Script" }, t("simplified.formats.podcast")),
    /* @__PURE__ */ React.createElement("option", { value: "Social Media Thread" }, t("simplified.formats.social")),
    /* @__PURE__ */ React.createElement("option", { value: "Poetry" }, t("simplified.formats.poetry")),
    /* @__PURE__ */ React.createElement("option", { value: "Narrative Story" }, t("simplified.formats.narrative_story"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("input.length")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "simplified_length",
      value: leveledTextLength,
      onChange: (e) => setLeveledTextLength(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Same as Source" }, t("simplified.length_options.same")),
    /* @__PURE__ */ React.createElement("option", { value: "Condense (50%)" }, t("simplified.length_options.condense")),
    /* @__PURE__ */ React.createElement("option", { value: "Shorten (75%)" }, t("simplified.length_options.shorten")),
    /* @__PURE__ */ React.createElement("option", { value: "Expand (125%)" }, t("simplified.length_options.expand")),
    /* @__PURE__ */ React.createElement("option", { value: "Extend (150%)" }, t("simplified.length_options.extend")),
    /* @__PURE__ */ React.createElement("option", { value: "Double (200%)" }, t("simplified.length_options.double"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("wizard.output_language")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "simplified_language",
      value: leveledTextLanguage,
      onChange: (e) => setLeveledTextLanguage(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "English" }, t("languages.english")),
    selectedLanguages.map((lang) => /* @__PURE__ */ React.createElement("option", { key: lang, value: lang }, lang)),
    selectedLanguages.length > 0 && /* @__PURE__ */ React.createElement("option", { value: "All Selected Languages" }, t("languages.all_selected"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium flex items-center gap-1" }, t("quiz.dok_target"), /* @__PURE__ */ React.createElement(InfoTooltip, { text: "Depth of Knowledge: Level 1 (Recall) -> Level 4 (Extended Thinking/Synthesis)." })), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "simplified_dok",
      value: dokLevel,
      onChange: (e) => setDokLevel(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("wizard.dok_levels.none")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 1: Recall & Reproduction" }, t("wizard.dok_levels.l1")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 2: Skill/Concept" }, t("wizard.dok_levels.l2")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 3: Strategic Thinking" }, t("wizard.dok_levels.l3")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 4: Extended Thinking" }, t("wizard.dok_levels.l4"))
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-2 rounded-lg border border-slate-400", "data-help-key": "simplified_standards" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs text-slate-600 font-bold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12, className: "text-indigo-600" }), " Target Standard"), /* @__PURE__ */ React.createElement("div", { className: "flex bg-white rounded-md border border-slate-400 p-0.5 shadow-sm" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetStandardModeToAi,
      className: `px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === "ai" ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:text-slate-600"}`
    },
    "AI Match"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetStandardModeToManual,
      className: `px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === "manual" ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:text-slate-600"}`
    },
    "Manual"
  ))), standardMode === "ai" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2 animate-in fade-in slide-in-from-top-1 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_ai_standard_query"),
      type: "text",
      value: aiStandardQuery,
      onChange: (e) => setAiStandardQuery(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleFindStandards(gradeLevel),
      placeholder: `Describe skill (e.g. "identify main idea") for ${gradeLevel}...`,
      className: "flex-grow text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.refresh"),
      onClick: () => handleFindStandards(gradeLevel),
      disabled: !aiStandardQuery.trim() || isFindingStandards,
      className: "bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
      title: t("common.find_relevant_standards")
    },
    isFindingStandards ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Search, { size: 14 })
  )), suggestedStandards.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "max-h-32 overflow-y-auto custom-scrollbar border border-slate-400 rounded bg-white divide-y divide-slate-100" }, suggestedStandards.map((std, idx) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: idx,
      onClick: () => {
        const val = `${std.code}: ${std.description}`;
        if (targetStandards.length < 3 && !targetStandards.includes(val)) {
          setTargetStandards((prev) => [...prev, val]);
          addToast(`Added ${std.code} to list`, "success");
        } else if (targetStandards.length >= 3) {
          addToast(t("standards.toast_max_limit"), "error");
        }
      },
      className: "w-full text-left p-2 hover:bg-indigo-50 transition-colors group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100" }, std.code), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 uppercase" }, std.framework)),
    /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 leading-snug mt-1 line-clamp-2 group-hover:text-indigo-900" }, std.description)
  ))), suggestedStandards.length === 0 && !isFindingStandards && aiStandardQuery && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 italic text-center p-1" }, t("standards.press_search_hint"))) : /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_standard_input_value"),
      type: "text",
      value: standardInputValue,
      onChange: (e) => setStandardInputValue(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleAddStandard(),
      placeholder: t("standards.manual_placeholder"),
      className: "flex-grow text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.add"),
      onClick: handleAddStandard,
      disabled: !standardInputValue.trim() || targetStandards.length >= 3,
      className: "bg-indigo-100 text-indigo-700 p-1.5 rounded-md hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      title: t("standards.add_button")
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 16 })
  ))), targetStandards.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mt-2 mb-2" }, targetStandards.map((std, idx) => /* @__PURE__ */ React.createElement("span", { key: idx, className: "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 animate-in slide-in-from-left-1 max-w-full" }, /* @__PURE__ */ React.createElement("span", { className: "truncate", title: std }, std), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.close"),
      onClick: () => handleRemoveStandard(idx),
      className: "hover:text-indigo-900 ml-1 shrink-0",
      title: t("common.remove_standard")
    },
    /* @__PURE__ */ React.createElement(X, { size: 10 })
  )))), /* @__PURE__ */ React.createElement("div", { "data-help-key": "simplified_interests" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium flex items-center gap-1 mt-2" }, /* @__PURE__ */ React.createElement(Heart, { size: 12, className: "text-indigo-500" }), " ", t("input.interests_label"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_interest_input"),
      type: "text",
      value: interestInput,
      onChange: (e) => setInterestInput(e.target.value),
      onKeyDown: handleInterestKeyDown,
      placeholder: t("common.interest_placeholder"),
      className: "flex-grow text-sm px-2 py-1.5 border border-slate-400 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.add"),
      onClick: addInterest,
      disabled: !interestInput.trim() || studentInterests.length >= 5,
      className: "bg-indigo-100 text-indigo-700 p-1.5 rounded-md hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 16 })
  )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 min-h-[1.5rem]" }, studentInterests.map((interest, idx) => /* @__PURE__ */ React.createElement("span", { key: idx, className: "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200" }, interest, /* @__PURE__ */ React.createElement("button", { onClick: () => removeInterest(interest), className: "hover:text-indigo-900", "aria-label": t("common.remove") }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), studentInterests.length === 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600 italic" }, t("input.no_interests")))), /* @__PURE__ */ React.createElement("div", { className: "mt-3", "data-help-key": "simplified_custom_instructions" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("input.custom_instructions") || "Custom instructions for simplified text",
      value: leveledTextCustomInstructions,
      onChange: (e) => setLeveledTextCustomInstructions(e.target.value),
      placeholder: t("common.custom_instructions_placeholder"),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 p-1.5 h-16 resize-none transition-shadow duration-300 outline-none"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-2", "data-help-key": "simplified_emojis" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_use_emojis"),
      id: "useEmojis",
      type: "checkbox",
      checked: useEmojis,
      onChange: (e) => setUseEmojis(e.target.checked),
      className: "w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "useEmojis", className: "text-xs font-medium text-slate-700 cursor-pointer select-none flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Smile, { size: 12, className: "text-indigo-500" }), " ", t("simplified.use_emojis"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-2", "data-help-key": "simplified_citations" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_keep_citations"),
      id: "keepCitations",
      type: "checkbox",
      checked: keepCitations,
      onChange: (e) => setKeepCitations(e.target.checked),
      className: "w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "keepCitations", className: "text-xs font-medium text-slate-700 cursor-pointer select-none flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Link, { size: 12, className: "text-indigo-500" }), " ", t("simplified.preserve_links"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-2", "data-help-key": "simplified_charts" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_include_charts"),
      id: "includeCharts",
      type: "checkbox",
      checked: includeCharts,
      onChange: (e) => setIncludeCharts(e.target.checked),
      className: "w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "includeCharts", className: "text-xs font-medium text-slate-700 cursor-pointer select-none flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Layout, { size: 12, className: "text-indigo-500" }), " ", t("simplified.data_visuals"))))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("simplified"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-indigo-700 transition-colors flex items-center gap-2" }, t("simplified.rewrite"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ));
}
function MathPanel(props) {
  const {
    Calculator,
    addToast,
    cubeAnswer,
    cubeChallenge,
    cubeDims,
    cubeDragRef,
    cubeFeedback,
    cubeNotch,
    cubeRotation,
    cubeScale,
    cubeShape,
    cubeShowLayers,
    expandedTools,
    exploreDifficulty,
    getAdaptiveDifficulty,
    gradeLevel,
    handleGenerateMath,
    handleScoreUpdate,
    hasSourceOrAnalysis,
    isMathGraphEnabled,
    isProcessing,
    mathInput,
    mathMode,
    mathQuantity,
    mathSubject,
    setActiveView,
    setCubeAnswer,
    setCubeChallenge,
    setCubeDims,
    setCubeFeedback,
    setCubeNotch,
    setCubeRotation,
    setCubeScale,
    setCubeShape,
    setCubeShowLayers,
    setExploreDifficulty,
    setGeneratedContent,
    setHistory,
    setIsMathGraphEnabled,
    setMathInput,
    setMathMode,
    setMathQuantity,
    setMathSubject,
    setUseMathSourceContext,
    storageDB,
    t,
    useMathSourceContext
  } = props;
  if (!expandedTools || !expandedTools.includes("math")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-blue-50/50 flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("math.subject")), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none" }, /* @__PURE__ */ React.createElement(BookOpen, { size: 12, className: "text-slate-600" })), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "math_subject",
      value: mathSubject,
      onChange: (e) => setMathSubject(e.target.value),
      className: "w-full pl-7 text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "General Math" }, t("math.subjects.general")),
    /* @__PURE__ */ React.createElement("option", { value: "Algebra" }, t("math.subjects.algebra")),
    /* @__PURE__ */ React.createElement("option", { value: "Geometry" }, t("math.subjects.geometry")),
    /* @__PURE__ */ React.createElement("option", { value: "Calculus" }, t("math.subjects.calculus")),
    /* @__PURE__ */ React.createElement("option", { value: "Chemistry" }, t("math.subjects.chemistry")),
    /* @__PURE__ */ React.createElement("option", { value: "Physics" }, t("math.subjects.physics")),
    /* @__PURE__ */ React.createElement("option", { value: "Biology" }, t("math.subjects.biology")),
    /* @__PURE__ */ React.createElement("option", { value: "Earth Science" }, t("math.subjects.earth_science")),
    /* @__PURE__ */ React.createElement("option", { value: "Computer Science" }, t("math.subjects.comp_sci")),
    /* @__PURE__ */ React.createElement("option", { value: "Economics" }, t("math.subjects.economics"))
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("math.mode")), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none" }, /* @__PURE__ */ React.createElement(Settings2, { size: 12, className: "text-slate-600" })), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "math_mode",
      value: mathMode,
      onChange: (e) => setMathMode(e.target.value),
      className: "w-full pl-7 text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-shadow duration-300 p-1.5"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Problem Set Generator" }, t("math.modes.problem_set")),
    /* @__PURE__ */ React.createElement("option", { value: "Step-by-Step" }, t("math.modes.step_by_step")),
    /* @__PURE__ */ React.createElement("option", { value: "Conceptual" }, t("math.modes.conceptual")),
    /* @__PURE__ */ React.createElement("option", { value: "Real-World Application" }, t("math.modes.real_world")),
    /* @__PURE__ */ React.createElement("option", { value: "Fluency Probes" }, "\u23F1\uFE0F ", t("math.modes.fluency_probe") || "Fluency Probe"),
    /* @__PURE__ */ React.createElement("option", { value: "Fluency Maze" }, "\u{1F3AF} ", t("math.modes.fluency_maze") || "Fluency Maze")
  )))), mathMode === "Fluency Probes" && (() => {
    const MathFluencyComponent = window.AlloModules && window.AlloModules.MathFluency;
    if (!MathFluencyComponent) return /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-amber-50 rounded-xl border border-amber-200 text-center text-amber-700 text-sm" }, "Loading Math Fluency module...");
    return /* @__PURE__ */ React.createElement(
      MathFluencyComponent,
      {
        gradeLevel,
        t,
        addToast,
        storageDB,
        handleScoreUpdate,
        onProbeComplete: (entry) => setHistory((prev) => [...prev, entry])
      }
    );
  })(), mathMode === "Fluency Maze" && /* @__PURE__ */ (() => {
    const launchMaze = () => {
      const newItem = {
        id: "fluency-maze-" + Date.now(),
        type: "math-fluency-maze",
        title: `\u{1F3F0} Fluency Maze \xB7 ${gradeLevel}`,
        timestamp: /* @__PURE__ */ new Date(),
        data: { gradeLevel, launchedAt: Date.now() },
        config: { grade: gradeLevel }
      };
      setHistory((prev) => [...prev, newItem]);
      setGeneratedContent({ type: "math-fluency-maze", data: newItem.data, id: newItem.id, config: newItem.config });
      setActiveView("math-fluency-maze");
      if (typeof addToast === "function") addToast("\u{1F3F0} Fluency Maze opened in main view", "success");
    };
    return /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-3xl mb-2" }, "\u{1F3F0}"), /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-black text-amber-900 mb-1" }, "Fluency Maze"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-800 mb-3 leading-relaxed" }, "Navigate a torchlit dungeon. Each gate is locked by a math fact \u2014 solve it to pass. Find the golden key to unlock the exit."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: launchMaze,
        className: "w-full px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2",
        "aria-label": "Open Fluency Maze in main view"
      },
      "\u{1F6AA} Open Maze (full view)"
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-amber-700 mt-2 italic" }, "Saved to history so you can re-enter later."));
  })(), mathMode === "Volume Builder" && window.AlloModules && window.AlloModules.VolumeBuilderView && React.createElement(window.AlloModules.VolumeBuilderView, {
    cubeAnswer,
    cubeChallenge,
    cubeDims,
    cubeDragRef,
    cubeFeedback,
    cubeNotch,
    cubeRotation,
    cubeScale,
    cubeShape,
    cubeShowLayers,
    exploreDifficulty,
    getAdaptiveDifficulty,
    mathMode,
    setCubeAnswer,
    setCubeChallenge,
    setCubeDims,
    setCubeFeedback,
    setCubeNotch,
    setCubeRotation,
    setCubeScale,
    setCubeShape,
    setCubeShowLayers,
    setExploreDifficulty,
    t
  }), (mathMode === "Problem Set Generator" || mathMode === "Word Problems from Source" || mathMode === "Freeform Builder") && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("math.quantity")), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none" }, /* @__PURE__ */ React.createElement(ListOrdered, { size: 12, className: "text-slate-600" })), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.text_field"),
      "data-help-key": "math_quantity",
      type: "number",
      min: "1",
      max: "10",
      value: mathQuantity,
      onChange: (e) => setMathQuantity(parseInt(e.target.value) || 5),
      className: "w-full pl-7 text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-shadow duration-300 p-1.5"
    }
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, mathMode === "Problem Set Generator" ? t("math.labels.topic_skill") : mathMode === "Word Problems from Source" ? t("math.labels.instructions_opt") : t("math.labels.problem_question")), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-2.5 left-2 pointer-events-none" }, /* @__PURE__ */ React.createElement(Calculator, { size: 14, className: "text-slate-600" })), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("math.labels.problem_question") || "Math problem input",
      "data-help-key": "math_input",
      value: mathInput,
      onChange: (e) => setMathInput(e.target.value),
      placeholder: mathMode === "Problem Set Generator" ? t("math.placeholder_topic") : mathMode === "Word Problems from Source" ? t("math.placeholder_focus") : t("math.placeholder_eq"),
      className: "w-full pl-8 text-xs p-2 border border-slate-400 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-blue-500/30 outline-none resize-none h-24 font-mono transition-shadow duration-300"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", "data-help-key": "math_graph" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_is_math_graph_enabled"),
      id: "mathGraph",
      type: "checkbox",
      checked: isMathGraphEnabled,
      onChange: (e) => setIsMathGraphEnabled(e.target.checked),
      className: "w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "mathGraph", className: "text-xs font-medium text-slate-700 cursor-pointer select-none flex items-center gap-1" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 12, className: "text-blue-500" }), " ", t("math.graph_label"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2", "data-help-key": "math_context" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_use_math_source_context"),
      id: "mathContext",
      type: "checkbox",
      checked: useMathSourceContext,
      onChange: (e) => setUseMathSourceContext(e.target.checked),
      disabled: !hasSourceOrAnalysis,
      title: !hasSourceOrAnalysis ? "No source text or analysis available to use as context" : "Use source text to contextualize math problems",
      className: `w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 ${!hasSourceOrAnalysis ? "opacity-40 cursor-not-allowed" : ""}`
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "mathContext", className: "text-xs font-medium text-slate-700 cursor-pointer select-none flex items-center gap-1" }, /* @__PURE__ */ React.createElement(FileText, { size: 12, className: "text-blue-500" }), " ", t("math.customize_label")))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate_math_problems"),
      "data-help-key": "math_generate_button",
      onClick: handleGenerateMath,
      disabled: !mathInput.trim() || isProcessing || mathMode === "Fluency Probe",
      style: mathMode === "Fluency Probe" ? { display: "none" } : {},
      className: "w-full p-3 bg-gradient-to-r w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed group disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold flex items-center gap-2" }, t("math.solve"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ));
}
function DbqPanel(props) {
  const {
    addToast,
    callGemini,
    callGeminiVision,
    expandedTools,
    fetchAndCleanUrl,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    setExpandedTools,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("dbq")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-rose-50 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600" }, t("dbq.desc") || "Generate a complete Document-Based Question activity from your source text \u2014 with primary sources, HAPP framework, sourcing questions, corroboration analysis, synthesis essay prompt, and rubric."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1" }, "Analysis Mode"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, [
    ["standard", "\u{1F4C4} Standard DBQ", "Extract documents from your source text"],
    ["perspectives", "\u2694\uFE0F Competing Perspectives", "AI finds 2+ viewpoints that agree and disagree"],
    ["search", "\u{1F50D} Web-Enhanced", "Find real primary sources from archives (LOC, NARA, etc.)"],
    ["links", "\u{1F517} Teacher Links", "Paste URLs to articles \u2014 AI builds DBQ around them"],
    ["custom", "\u270F\uFE0F Teacher Docs", "Paste your own document text directly"]
  ].map(([mode, label, desc]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: mode,
      onClick: () => {
        window._dbqMode = mode;
        setExpandedTools((prev) => [...prev]);
      },
      className: `flex-1 text-left p-2 rounded-lg text-[11px] font-bold transition-all border ${(window._dbqMode || "standard") === mode ? "border-rose-400 bg-rose-100 text-rose-800" : "border-slate-200 bg-white text-slate-600 hover:bg-rose-50"}`
    },
    /* @__PURE__ */ React.createElement("div", null, label),
    /* @__PURE__ */ React.createElement("div", { className: "font-normal mt-0.5 opacity-70" }, desc)
  )))), (window._dbqMode === "search" || window._dbqMode === "perspectives" || window._dbqMode === "links") && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase block mb-1" }, window._dbqMode === "search" ? "Search Topic (optional \u2014 refines source hunting)" : window._dbqMode === "links" ? "Topic Context (helps AI understand the links)" : "Perspectives to Compare (optional)"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: window._dbqMode === "search" ? 'e.g. "Japanese internment primary sources"' : window._dbqMode === "links" ? 'e.g. "Civil Rights Movement"' : 'e.g. "Federalists vs Anti-Federalists"',
      "aria-label": window._dbqMode === "search" ? "Search topic for primary source hunting" : window._dbqMode === "links" ? "Topic context for AI link analysis" : "Perspectives to compare for DBQ",
      className: "w-full text-xs border border-rose-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none",
      id: "dbq-focus-topic"
    }
  )), window._dbqMode === "links" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase block mb-1" }, "Document URLs (one per line)"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "dbq-teacher-links",
      placeholder: "https://www.loc.gov/item/example-document/\nhttps://founders.archives.gov/documents/...\nhttps://www.archives.gov/milestone-documents/...",
      className: "w-full text-xs border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none h-20 font-mono",
      "aria-label": "Document URLs for DBQ"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, "Paste links to articles, primary sources, or documents. AI will build the DBQ scaffolding around them.")), window._dbqMode === "custom" && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-50 border border-indigo-200 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-700 mb-2" }, /* @__PURE__ */ React.createElement("strong", null, "Paste each document below."), " Separate documents with ", /* @__PURE__ */ React.createElement("code", { className: "bg-indigo-100 px-1 rounded" }, "---"), " on its own line. Or use the import buttons to fetch from a URL or upload an image of a document."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-500" }, "For each document, optionally include a title and source on the first lines:"), /* @__PURE__ */ React.createElement("pre", { className: "text-[11px] bg-white border border-indigo-100 rounded p-2 mt-1 text-indigo-600 whitespace-pre-wrap" }, "Title: Letter from Abigail Adams to John Adams", "\n", "Source: March 31, 1776", "\n", "Remember the Ladies, and be more generous and favourable to them than your ancestors...", "\n", "---", "\n", "Title: Declaration of Independence (excerpt)", "\n", "Source: Thomas Jefferson, July 4, 1776", "\n", "We hold these truths to be self-evident, that all men are created equal...")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-wrap items-end" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-[200px]" }, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase block mb-1" }, "Import from URL"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      id: "dbq-import-url",
      className: "flex-1 text-xs border border-indigo-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none",
      placeholder: "https://... (article, speech, primary source)",
      "aria-label": "URL to import as document"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        const urlInput = document.getElementById("dbq-import-url");
        const docArea = document.getElementById("dbq-custom-docs");
        const url = urlInput?.value?.trim();
        if (!url || !docArea) return;
        addToast && addToast("Fetching document from URL...", "info");
        try {
          const text = await fetchAndCleanUrl(url, callGemini, addToast);
          if (text) {
            const separator = docArea.value.trim() ? "\n---\n" : "";
            docArea.value += separator + "Title: (imported from URL)\nSource: " + url + "\n" + text.replace(/^Source:.*\n\n?/, "");
            urlInput.value = "";
            addToast && addToast("Document imported! Review and edit the text below.", "success");
          }
        } catch (e) {
          addToast && addToast("Import failed: " + e.message, "error");
        }
      },
      className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-all shrink-0",
      "aria-label": "Fetch URL"
    },
    "\u{1F517} Fetch"
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase block mb-1" }, "Upload Document Image"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      id: "dbq-import-image",
      accept: "image/*,.pdf",
      className: "hidden",
      onChange: async (e) => {
        const file = e.target.files?.[0];
        const docArea = document.getElementById("dbq-custom-docs");
        if (!file || !docArea || !callGeminiVision) return;
        addToast && addToast("Extracting text from image...", "info");
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64 = reader.result.split(",")[1];
              const mimeType = file.type || "image/png";
              const ocrPrompt = `You are an OCR expert. Extract ALL readable text from this document image. Preserve the original wording exactly. Maintain paragraph structure. If there are handwritten portions, do your best to transcribe them. Return ONLY the extracted text.`;
              const text = await callGeminiVision(ocrPrompt, base64, mimeType);
              if (text && text.trim().length > 10) {
                const separator = docArea.value.trim() ? "\n---\n" : "";
                docArea.value += separator + "Title: (extracted from " + file.name + ")\nSource: Uploaded document image\n" + text.trim();
                addToast && addToast("Text extracted from image! Review and edit below.", "success");
              } else {
                addToast && addToast("Could not extract readable text from this image.", "error");
              }
            } catch (err) {
              addToast && addToast("OCR failed: " + err.message, "error");
            }
          };
          reader.readAsDataURL(file);
        } catch (err) {
          addToast && addToast("File read failed: " + err.message, "error");
        }
        e.target.value = "";
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => document.getElementById("dbq-import-image")?.click(),
      className: "px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1",
      "aria-label": "Upload document image"
    },
    "\u{1F4F7} Upload Image"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        const docArea = document.getElementById("dbq-custom-docs");
        if (!docArea || !callGeminiVision) return;
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t2) => t2.startsWith("image/"));
            if (imageType) {
              addToast && addToast("Extracting text from clipboard image...", "info");
              const blob = await item.getType(imageType);
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const base64 = reader.result.split(",")[1];
                  const text = await callGeminiVision("You are an OCR expert. Extract ALL readable text from this document image. Preserve original wording and paragraph structure. Return ONLY the extracted text.", base64, imageType);
                  if (text && text.trim().length > 10) {
                    const separator = docArea.value.trim() ? "\n---\n" : "";
                    docArea.value += separator + "Title: (pasted from clipboard)\nSource: Clipboard image\n" + text.trim();
                    addToast && addToast("Text extracted from clipboard image!", "success");
                  } else {
                    addToast && addToast("Could not extract text from clipboard image.", "error");
                  }
                } catch (err) {
                  addToast && addToast("OCR failed: " + err.message, "error");
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
          addToast && addToast("No image found in clipboard. Copy an image first (screenshot, right-click copy, etc.)", "info");
        } catch (err) {
          addToast && addToast("Clipboard access failed. Try uploading instead.", "info");
        }
      },
      className: "px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1",
      "aria-label": "Paste image from clipboard"
    },
    "\u{1F4CB} Paste Image"
  )))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "dbq-custom-docs",
      className: "w-full text-xs border border-rose-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none font-mono",
      rows: 8,
      placeholder: "Paste your documents here, separated by --- on its own line...",
      "aria-label": "Custom documents for DBQ"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      id: "dbq-custom-essay-focus",
      className: "w-full text-xs border border-rose-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none",
      placeholder: "Essay focus question (optional) \u2014 e.g. 'How did different groups define liberty in 1776?'",
      "aria-label": "Custom essay focus question"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg p-2 border border-rose-100" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1" }, t("dbq.includes") || "DBQ Packet Includes"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 font-medium" }, "\u{1F4C4} Document Excerpts"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 font-medium" }, "\u{1F50D} HAPP Sourcing"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 font-medium" }, "\u{1F517} Corroboration"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 font-medium" }, "\u270D\uFE0F Essay Prompt"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 font-medium" }, "\u{1F4CA} 4-Point Rubric"), window._dbqMode === "perspectives" && /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-medium" }, "\u2694\uFE0F POV Comparison"), window._dbqMode === "search" && /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-medium" }, "\u{1F310} Web Sources"), window._dbqMode === "custom" && /* @__PURE__ */ React.createElement("span", { className: "text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-medium" }, "\u270F\uFE0F Teacher Docs")))), !hasSourceOrAnalysis && window._dbqMode !== "custom" && /* @__PURE__ */ React.createElement("div", { className: "px-3 pb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-rose-400 italic flex items-center gap-1" }, "\u2B06\uFE0F Paste a source text above first \u2014 the DBQ will be built from it.")), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": "Generate DBQ",
      "data-help-key": "dbq_generate_button",
      onClick: () => handleGenerate("dbq"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-rose-700 transition-colors flex items-center gap-2" }, t("dbq.generate") || "Generate DBQ Packet", " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-rose-600" })
  ));
}
function SourceInputPanel(props) {
  const {
    addToast,
    aiStandardQuery,
    aiStandardRegion,
    callGeminiVision,
    expandedTools,
    generationStep,
    gradeLevel,
    handleAddStandard,
    handleAiUrlSearch,
    handleFindStandards,
    handleGenerateSource,
    handleRemoveStandard,
    handleSelectMainSearchOption,
    handleSetIsUrlSearchModeToFalse,
    handleSetIsUrlSearchModeToTrue,
    handleSetStandardModeToAi,
    handleSetStandardModeToManual,
    handleUrlFetch,
    includeSourceCitations,
    inputText,
    isCanvas,
    isDraftSaving,
    isExtracting,
    isFindingStandards,
    isGeneratingSource,
    isIndependentMode,
    isUrlSearchMode,
    searchOptions,
    setAiStandardQuery,
    setAiStandardRegion,
    setGenerationStep,
    setIncludeSourceCitations,
    setInputText,
    setIsExtracting,
    setIsUrlSearchMode,
    setSearchOptions,
    setSourceCustomInstructions,
    setSourceLength,
    setSourceLevel,
    setSourceTone,
    setSourceTopic,
    setSourceVocabulary,
    setStandardInputValue,
    setTargetStandards,
    setUrlSearchQuery,
    setUrlToFetch,
    showSourceGen,
    showUrlInput,
    sourceCustomInstructions,
    sourceLength,
    sourceLevel,
    sourceTone,
    sourceTopic,
    sourceVocabulary,
    standardInputValue,
    standardMode,
    suggestedStandards,
    t,
    targetStandards,
    urlSearchQuery,
    urlToFetch
  } = props;
  if (!expandedTools || !expandedTools.includes("source-input")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, showUrlInput && /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-indigo-50/50 border-b border-indigo-100 animate-in slide-in-from-top-2 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center bg-white p-1 rounded-lg border border-indigo-100 mb-2 shadow-sm" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetIsUrlSearchModeToFalse,
      className: `flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${!isUrlSearchMode ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-700"}`
    },
    t("wizard.paste_link_label")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetIsUrlSearchModeToTrue,
      className: `flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${isUrlSearchMode ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-700"}`
    },
    t("wizard.find_ai_label")
  )), isUrlSearchMode ? /* @__PURE__ */ React.createElement("div", { className: "animate-in fade-in slide-in-from-right-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-indigo-900 mb-1" }, t("wizard.topic_find_label")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_url_search_query"),
      type: "text",
      value: urlSearchQuery,
      onChange: (e) => setUrlSearchQuery(e.target.value),
      placeholder: `e.g. Photosynthesis for ${gradeLevel}...`,
      className: "flex-grow text-sm p-2 border border-indigo-600 rounded-md focus:ring-2 focus:ring-indigo-200 outline-none",
      onKeyDown: (e) => e.key === "Enter" && handleAiUrlSearch(),
      autoFocus: true
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.search_by_url"),
      onClick: handleAiUrlSearch,
      disabled: !urlSearchQuery.trim() || isExtracting,
      className: "bg-teal-700 text-white text-sm font-medium px-4 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
    },
    isExtracting ? /* @__PURE__ */ React.createElement(RefreshCw, { className: "animate-spin", size: 14 }) : /* @__PURE__ */ React.createElement(Search, { size: 14 }),
    t("wizard.find_action")
  )), !isExtracting && searchOptions.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-2 mt-3 animate-in slide-in-from-bottom-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[11px] font-bold text-indigo-600 uppercase tracking-wider" }, t("wizard.select_resource")), searchOptions.map((opt, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "relative group" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSelectMainSearchOption(opt),
      className: "w-full text-left p-3 pr-10 rounded-lg border border-indigo-100 hover:border-teal-500 hover:bg-teal-50 transition-all bg-white shadow-sm"
    },
    /* @__PURE__ */ React.createElement("div", { className: "font-bold text-slate-700 group-hover:text-teal-800 mb-0.5 text-xs" }, opt.title || "Untitled Resource"),
    /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 group-hover:text-teal-600 line-clamp-2 leading-snug" }, opt.description || "No description available."),
    /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 mt-1 truncate max-w-[200px]" }, opt.url)
  ), /* @__PURE__ */ React.createElement(
    "a",
    {
      href: opt.url,
      target: "_blank",
      rel: "noopener noreferrer",
      onClick: (e) => {
        e.stopPropagation();
        setIsUrlSearchMode(false);
        setSearchOptions([]);
        setUrlToFetch("");
        addToast(t("common.link_opened_copy_paste"), "info");
      },
      className: "absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-100 rounded-full transition-colors z-20",
      title: t("common.open_link_paste_mode")
    },
    /* @__PURE__ */ React.createElement(ExternalLink, { size: 14 })
  )))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-600 mt-2" }, t("wizard.ai_search_note"))) : /* @__PURE__ */ React.createElement("div", { className: "animate-in fade-in slide-in-from-left-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-indigo-900 mb-1" }, t("wizard.article_url_label")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.common_url_placeholder"),
      type: "url",
      value: urlToFetch,
      onChange: (e) => setUrlToFetch(e.target.value),
      placeholder: t("common.url_placeholder"),
      className: "flex-grow text-sm p-2 border border-indigo-600 rounded-md focus:ring-2 focus:ring-indigo-200 outline-none",
      onKeyDown: (e) => e.key === "Enter" && handleUrlFetch(),
      autoFocus: true
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.download"),
      onClick: () => handleUrlFetch(),
      disabled: !urlToFetch.trim() || isExtracting,
      className: "bg-indigo-600 text-white text-sm font-medium px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
    },
    isExtracting ? /* @__PURE__ */ React.createElement(RefreshCw, { className: "animate-spin", size: 14 }) : /* @__PURE__ */ React.createElement(Download, { size: 14 }),
    t("wizard.fetch_action")
  )), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-600 mt-1" }, t("wizard.fetch_note")))), showSourceGen && window.AlloModules && window.AlloModules.SourceGenPanel && React.createElement(window.AlloModules.SourceGenPanel, {
    addToast,
    aiStandardQuery,
    aiStandardRegion,
    gradeLevel,
    handleAddStandard,
    handleFindStandards,
    handleGenerateSource,
    handleRemoveStandard,
    handleSetStandardModeToAi,
    handleSetStandardModeToManual,
    includeSourceCitations,
    isFindingStandards,
    isGeneratingSource,
    isIndependentMode,
    setAiStandardQuery,
    setAiStandardRegion,
    setIncludeSourceCitations,
    setSourceCustomInstructions,
    setSourceLength,
    setSourceLevel,
    setSourceTone,
    setSourceTopic,
    setSourceVocabulary,
    setStandardInputValue,
    setTargetStandards,
    showSourceGen,
    sourceCustomInstructions,
    sourceLength,
    sourceLevel,
    sourceTone,
    sourceTopic,
    sourceVocabulary,
    standardInputValue,
    standardMode,
    suggestedStandards,
    t,
    targetStandards
  }), /* @__PURE__ */ React.createElement("div", { className: "p-4 relative" }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: inputText,
      onChange: (e) => setInputText(e.target.value),
      onPaste: async (e) => {
        const items = e.clipboardData?.items;
        if (!items || !callGeminiVision) return;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            e.preventDefault();
            const blob = item.getAsFile();
            if (!blob) return;
            setIsExtracting(true);
            setGenerationStep("Extracting text from pasted image...");
            addToast && addToast("Image detected \u2014 extracting text...", "info");
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const base64 = reader.result.split(",")[1];
                const text = await callGeminiVision(
                  "You are an OCR expert for educators. Extract all readable text from this image. Preserve structure (headers, paragraphs) using markdown. If there are tables, preserve them as markdown tables. Return ONLY the extracted text.",
                  base64,
                  item.type
                );
                if (text && text.trim().length > 10) {
                  setInputText((prev) => prev ? prev + "\n\n" + text.trim() : text.trim());
                  addToast && addToast("Text extracted from image!", "success");
                } else {
                  addToast && addToast("Could not extract readable text from image.", "error");
                }
              } catch (err) {
                addToast && addToast("Image OCR failed: " + err.message, "error");
              }
              setIsExtracting(false);
              setGenerationStep("");
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      },
      placeholder: isGeneratingSource ? t("common.writing_content") : isExtracting ? t("common.scanning_document") : t("input.placeholder"),
      disabled: isGeneratingSource || isExtracting,
      "aria-busy": isGeneratingSource,
      className: `w-full h-48 p-3 text-sm border border-slate-400 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none resize-none transition-all duration-300 ${isGeneratingSource || isExtracting ? "bg-slate-50 text-slate-600" : ""}`,
      "aria-label": t("common.source_material_aria"),
      "data-help-key": "input_area"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-2 right-4 text-[11px] font-medium transition-opacity duration-500 text-slate-600 pointer-events-none flex items-center gap-1" }, isDraftSaving ? /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 8, className: "animate-spin" }), " ", t("status.saving_draft")) : inputText && !isCanvas ? /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 text-green-700" }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 8 }), " ", t("status.saved_device")) : null), (isGeneratingSource || isExtracting) && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 hidden md:flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-b-xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { className: "animate-spin text-indigo-600", size: 24 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-indigo-600" }, generationStep)))));
}
function GlossaryPanel(props) {
  const {
    InfoTooltip,
    addLanguage,
    autoRemoveWords,
    expandedTools,
    glossaryCustomInstructions,
    glossaryDefinitionLevel,
    glossaryImageStyle,
    glossaryTier2Count,
    glossaryTier3Count,
    gradeLevel,
    handleGenerate,
    handleKeyDown,
    hasSourceOrAnalysis,
    includeEtymology,
    isProcessing,
    languageInput,
    removeLanguage,
    selectedLanguages,
    setAutoRemoveWords,
    setGlossaryCustomInstructions,
    setGlossaryDefinitionLevel,
    setGlossaryImageStyle,
    setGlossaryTier2Count,
    setGlossaryTier3Count,
    setIncludeEtymology,
    setLanguageInput,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("glossary")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100", "data-help-key": "tour-glossary-settings" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { "data-help-key": "glossary_tier2_count" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium flex items-center" }, t("glossary.tier2"), /* @__PURE__ */ React.createElement(InfoTooltip, { text: t("glossary.tier2_tooltip") })), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_glossary_tier2_count"),
      type: "number",
      min: "0",
      max: "20",
      value: glossaryTier2Count,
      onChange: (e) => setGlossaryTier2Count(parseInt(e.target.value) || 0),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-sky-300 focus:ring focus:ring-sky-200 p-1"
    }
  )), /* @__PURE__ */ React.createElement("div", { "data-help-key": "glossary_tier3_count" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium flex items-center" }, t("glossary.tier3"), /* @__PURE__ */ React.createElement(InfoTooltip, { text: t("glossary.tier3_tooltip") })), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_glossary_tier3_count"),
      type: "number",
      min: "0",
      max: "20",
      value: glossaryTier3Count,
      onChange: (e) => setGlossaryTier3Count(parseInt(e.target.value) || 0),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-sky-300 focus:ring focus:ring-sky-200 p-1"
    }
  )), /* @__PURE__ */ React.createElement("div", { "data-help-key": "glossary_definition_level" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("glossary.def_level")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      value: glossaryDefinitionLevel,
      onChange: (e) => setGlossaryDefinitionLevel(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-sky-300 focus:ring focus:ring-sky-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Same as Source Text" }, t("glossary.def_options.source")),
    /* @__PURE__ */ React.createElement("option", { value: "Same as Global Level" }, t("glossary.def_options.global"), " (", gradeLevel, ")"),
    /* @__PURE__ */ React.createElement("option", { value: "Kindergarten" }, t("grades.k")),
    /* @__PURE__ */ React.createElement("option", { value: "1st Grade" }, t("grades.g1")),
    /* @__PURE__ */ React.createElement("option", { value: "2nd Grade" }, t("grades.g2")),
    /* @__PURE__ */ React.createElement("option", { value: "3rd Grade" }, t("grades.g3")),
    /* @__PURE__ */ React.createElement("option", { value: "4th Grade" }, t("grades.g4")),
    /* @__PURE__ */ React.createElement("option", { value: "5th Grade" }, t("grades.g5")),
    /* @__PURE__ */ React.createElement("option", { value: "6th Grade" }, t("grades.g6")),
    /* @__PURE__ */ React.createElement("option", { value: "9th Grade" }, t("grades.g9")),
    /* @__PURE__ */ React.createElement("option", { value: "10th Grade" }, t("grades.g10")),
    /* @__PURE__ */ React.createElement("option", { value: "11th Grade" }, t("grades.g11")),
    /* @__PURE__ */ React.createElement("option", { value: "12th Grade" }, t("grades.g12")),
    /* @__PURE__ */ React.createElement("option", { value: "College" }, t("grades.college"))
  ))), /* @__PURE__ */ React.createElement("div", { className: "mb-3", "data-help-key": "glossary_etymology_info" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: includeEtymology,
      onChange: (e) => setIncludeEtymology(e.target.checked),
      className: "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
    }
  ), "\u{1F4DC} ", t("glossary.settings.include_etymology") || "Include word roots / etymology"), includeEtymology && /* @__PURE__ */ React.createElement("p", { className: "mt-1 ml-6 text-[11px] text-slate-600 leading-snug" }, t("glossary.settings.etymology_always_all") || "Applied to every term \u2014 shows the actual root morphemes, word history, and related English words that share the root.")), /* @__PURE__ */ React.createElement("div", { className: "mb-3", "data-help-key": "glossary_custom_instructions" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-violet-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("input.custom_instructions") || "Custom instructions for glossary",
      value: glossaryCustomInstructions,
      onChange: (e) => setGlossaryCustomInstructions(e.target.value),
      placeholder: t("glossary.placeholder_instructions"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:ring-2 focus:ring-sky-200 outline-none resize-none h-16"
    }
  )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, t("glossary.add_languages_label")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-3", "data-help-key": "glossary_language_input" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: languageInput,
      onChange: (e) => setLanguageInput(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder: t("glossary.language_placeholder"),
      className: "flex-grow text-sm px-2 py-1 border border-slate-400 rounded-md focus:ring-2 focus:ring-sky-200 outline-none",
      "aria-label": t("common.target_language_aria")
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: addLanguage,
      disabled: !languageInput.trim() || selectedLanguages.length >= 4,
      className: "bg-sky-100 text-sky-700 p-1.5 rounded-md hover:bg-sky-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
      "aria-label": t("common.add")
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 16 })
  )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 min-h-[2rem]" }, selectedLanguages.map((lang) => /* @__PURE__ */ React.createElement("span", { key: lang, className: "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100" }, lang, /* @__PURE__ */ React.createElement("button", { onClick: () => removeLanguage(lang), className: "hover:text-sky-900", "aria-label": "Remove " + lang }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), selectedLanguages.length === 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600 italic" }, t("glossary.no_languages"))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 pt-2 border-t border-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "mb-3", "data-help-key": "glossary_image_style" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-medium text-slate-600 block mb-1" }, /* @__PURE__ */ React.createElement(Palette, { size: 12, className: "inline mr-1 text-purple-500" }), " ", t("glossary.image_style_label")), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.glossary_style_placeholder"),
      type: "text",
      value: glossaryImageStyle,
      onChange: (e) => setGlossaryImageStyle(e.target.value),
      placeholder: t("glossary.style_placeholder"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, t("glossary.image_style_hint"))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none", "data-help-key": "glossary_auto_remove" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_auto_remove_words"),
      type: "checkbox",
      checked: autoRemoveWords,
      onChange: (e) => setAutoRemoveWords(e.target.checked),
      className: "rounded border-slate-300 text-indigo-600 focus:ring-sky-500 h-4 w-4"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Ban, { size: 12, className: "text-red-400" }), " ", t("glossary.auto_remove"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 font-normal" }, t("glossary.slower")))))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("glossary"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-sky-700 transition-colors flex items-center gap-2" }, t("glossary.generate"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ));
}
function QuizPanel(props) {
  const {
    InfoTooltip,
    dokLevel,
    expandedTools,
    generatedContent,
    handleGenerate,
    hasSourceOrAnalysis,
    history,
    imageStyle,
    isProcessing,
    mcqVisualMode,
    quizCustomInstructions,
    quizMcqCount,
    quizMode,
    quizReflectionCount,
    setDokLevel,
    setImageStyle,
    setMcqVisualMode,
    setQuizCustomInstructions,
    setQuizMcqCount,
    setQuizMode,
    setQuizReflectionCount,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("quiz")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-teal-50/50 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("quiz.mcq_count")), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.text_field"),
      "data-help-key": "quiz_question_count",
      type: "number",
      min: "1",
      max: "20",
      value: quizMcqCount,
      onChange: (e) => setQuizMcqCount(parseInt(e.target.value) || 3),
      className: "w-full text-sm border-slate-300 rounded-md p-1.5 focus:ring-emerald-200 focus:border-emerald-300"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("quiz.reflections")), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.text_field"),
      "data-help-key": "quiz_reflection_count",
      type: "number",
      min: "0",
      max: "5",
      value: quizReflectionCount,
      onChange: (e) => setQuizReflectionCount(parseInt(e.target.value) || 1),
      className: "w-full text-sm border-slate-300 rounded-md p-1.5 focus:ring-indigo-200 focus:border-indigo-300"
    }
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium flex items-center gap-1" }, t("quiz.dok_target"), /* @__PURE__ */ React.createElement(InfoTooltip, { text: "Set cognitive complexity. Level 1 (Recall) -> Level 4 (Extended Thinking)." })), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "quiz_dok",
      value: dokLevel,
      onChange: (e) => setDokLevel(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("wizard.dok_levels.none")),
    /* @__PURE__ */ React.createElement("option", { value: "Mixed" }, t("wizard.dok_levels.mixed")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 1: Recall & Reproduction" }, t("wizard.dok_levels.l1")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 2: Skill/Concept" }, t("wizard.dok_levels.l2")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 3: Strategic Thinking" }, t("wizard.dok_levels.l3")),
    /* @__PURE__ */ React.createElement("option", { value: "Level 4: Extended Thinking" }, t("wizard.dok_levels.l4"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("input.custom_instructions") || "Custom instructions for quiz",
      "data-help-key": "quiz_custom_instructions",
      value: quizCustomInstructions,
      onChange: (e) => setQuizCustomInstructions(e.target.value),
      placeholder: t("quiz.custom_placeholder"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:ring-2 focus:ring-indigo-200 outline-none resize-none h-16"
    }
  )), (generatedContent?.data?.analysis || history.some((h) => h && h.type === "analysis")) && /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-teal-700 flex items-center gap-1 mt-1 pt-1 border-t border-teal-100" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }), " ", t("quiz.context_active"))), /* @__PURE__ */ React.createElement("div", { className: "px-3 pt-2 pb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "quiz-mode-select", className: "text-[10px] font-bold uppercase tracking-wider text-slate-600 flex-shrink-0" }, "Mode:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      id: "quiz-mode-select",
      value: quizMode,
      onChange: (ev) => setQuizMode(ev.target.value),
      disabled: isProcessing,
      "data-help-key": "quiz_pedagogical_mode_select",
      className: "flex-1 min-w-0 text-xs font-semibold px-2 py-1 rounded border border-slate-300 bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-50",
      "aria-label": "Quiz mode",
      title: "Quiz mode: choose what this quiz is for. Pre-check probes prerequisites; Exit Ticket assesses today's content; Formative is a quick mid-lesson pulse; Spaced Review re-tests prior content."
    },
    /* @__PURE__ */ React.createElement("option", { value: "exit-ticket" }, "\u{1F4DD} Exit Ticket"),
    /* @__PURE__ */ React.createElement("option", { value: "pre-check" }, "\u{1F3AF} Pre-Check (Readiness)"),
    /* @__PURE__ */ React.createElement("option", { value: "formative" }, "\u{1F321}\uFE0F Formative Check"),
    /* @__PURE__ */ React.createElement("option", { value: "review" }, "\u{1F501} Spaced Review")
  )), /* @__PURE__ */ React.createElement("div", { className: "px-3 pt-1 pb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "quiz-visuals-select", className: "text-[10px] font-bold uppercase tracking-wider text-slate-600 flex-shrink-0" }, "Visuals:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      id: "quiz-visuals-select",
      value: mcqVisualMode,
      onChange: (ev) => setMcqVisualMode(ev.target.value),
      disabled: isProcessing,
      "data-help-key": "quiz_visual_mode_select",
      className: "flex-1 min-w-0 text-xs font-semibold px-2 py-1 rounded border border-slate-300 bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-50",
      "aria-label": "MCQ visual mode",
      title: "Visuals (MCQ items only): None = text-only (free, fastest). Question = generate one image per question stem. Options = generate 4 images per question (one per option). Both = question + options. Image gen takes ~3-5s per image and uses Imagen credits."
    },
    /* @__PURE__ */ React.createElement("option", { value: "none" }, "\u2205 None (text only)"),
    /* @__PURE__ */ React.createElement("option", { value: "question" }, "\u{1F5BC}\uFE0F Question images"),
    /* @__PURE__ */ React.createElement("option", { value: "options" }, "\u{1F3B4} Option images"),
    /* @__PURE__ */ React.createElement("option", { value: "both" }, "\u{1F5BC}\uFE0F\u{1F3B4} Both")
  )), mcqVisualMode !== "none" && /* @__PURE__ */ React.createElement("div", { className: "px-3 pt-0 pb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "quiz-image-style-input", className: "text-[10px] font-bold uppercase tracking-wider text-slate-600 flex-shrink-0" }, "Style:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "quiz-image-style-input",
      type: "text",
      value: imageStyle,
      onChange: (ev) => setImageStyle(ev.target.value),
      disabled: isProcessing,
      "data-help-key": "quiz_image_style_input",
      placeholder: "e.g. watercolor, flat vector, photorealistic, line drawing",
      maxLength: 120,
      className: "flex-1 min-w-0 text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-50 placeholder:italic placeholder:text-slate-400",
      "aria-label": "Image style hint",
      title: "Optional. Applied to every image in the quiz (question + options). Empty = default style. Persisted with the quiz so refine actions stay on-brand."
    }
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("quiz", null, false, null, { quizMode, mcqVisualMode, imageStyle }),
      "data-help-key": "quiz_generate_button",
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-indigo-700 transition-colors flex items-center gap-2" }, quizMode === "exit-ticket" ? t("quiz.generate") : quizMode === "pre-check" ? "Generate Pre-Check" : quizMode === "formative" ? "Generate Formative Check" : "Generate Spaced Review", " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ));
}
function TimelinePanel(props) {
  const {
    TIMELINE_MODE_DEFINITIONS,
    expandedTools,
    handleGenerate,
    hasSourceOrAnalysis,
    includeTimelineVisuals,
    isProcessing,
    setIncludeTimelineVisuals,
    setTimelineImageStyle,
    setTimelineItemCount,
    setTimelineMode,
    setTimelineTopic,
    t,
    timelineImageStyle,
    timelineItemCount,
    timelineMode,
    timelineTopic
  } = props;
  if (!expandedTools || !expandedTools.includes("timeline")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-teal-50 flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("timeline.topic"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_timeline_topic"),
      "data-help-key": "timeline_topic",
      type: "text",
      value: timelineTopic,
      onChange: (e) => setTimelineTopic(e.target.value),
      placeholder: t("timeline.topic_placeholder"),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 p-1.5 outline-none"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("timeline.count"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.text_field"),
      "data-help-key": "timeline_count",
      type: "number",
      min: "3",
      max: "20",
      value: timelineItemCount,
      onChange: (e) => {
        const raw = e.target.value;
        if (raw === "") {
          setTimelineItemCount("");
          return;
        }
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) {
          setTimelineItemCount("");
          return;
        }
        setTimelineItemCount(String(Math.min(20, Math.max(3, n))));
      },
      placeholder: t("timeline.placeholder_count"),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 p-1.5 outline-none"
    }
  )), /* @__PURE__ */ React.createElement("div", { "data-help-key": "timeline_mode_info" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("timeline.settings.mode_label") || "Ordering Mode"), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("timeline.settings.mode_label") || "Ordering mode",
      value: timelineMode,
      onChange: (e) => setTimelineMode(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 p-1.5 outline-none"
    },
    /* @__PURE__ */ React.createElement("option", { value: "auto" }, t("timeline.settings.mode_auto") || "\u2728 Auto-detect (AI picks best)"),
    /* @__PURE__ */ React.createElement("option", { value: "chronological" }, t("timeline.modes.chronological") || "Chronological \u2014 dates, events"),
    /* @__PURE__ */ React.createElement("option", { value: "procedural" }, t("timeline.modes.procedural") || "Procedural steps \u2014 how-to, experiments"),
    /* @__PURE__ */ React.createElement("option", { value: "lifecycle" }, t("timeline.modes.lifecycle") || "Life cycle / Developmental stages"),
    /* @__PURE__ */ React.createElement("option", { value: "size" }, t("timeline.modes.size") || "Size / Scale \u2014 smallest to largest"),
    /* @__PURE__ */ React.createElement("option", { value: "hierarchy" }, t("timeline.modes.hierarchy") || "Hierarchy / Taxonomy \u2014 broadest to specific"),
    /* @__PURE__ */ React.createElement("option", { value: "cause-effect" }, t("timeline.modes.cause-effect") || "Cause \u2192 Effect chain"),
    /* @__PURE__ */ React.createElement("option", { value: "intensity" }, t("timeline.modes.intensity") || "Intensity / Degree \u2014 least to most"),
    /* @__PURE__ */ React.createElement("option", { value: "narrative" }, t("timeline.modes.narrative") || "Narrative arc \u2014 exposition to resolution")
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 italic mt-1" }, timelineMode === "auto" ? t("timeline.settings.mode_hint_auto") || "AI examines the text and topic hint to pick the best ordering axis." : TIMELINE_MODE_DEFINITIONS[timelineMode]?.description || "")), /* @__PURE__ */ React.createElement("div", { "data-help-key": "timeline_visuals_info" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: includeTimelineVisuals,
      onChange: (e) => setIncludeTimelineVisuals(e.target.checked),
      className: "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
    }
  ), "\u{1F3A8} ", t("timeline.settings.include_visuals") || "Include sequence visuals"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 italic mt-1 ml-6" }, t("timeline.settings.visuals_hint") || "Generates an AI icon for each item. Adds ~30-50 seconds.")), includeTimelineVisuals && /* @__PURE__ */ React.createElement("div", { "data-help-key": "timeline_image_style" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, /* @__PURE__ */ React.createElement(Palette, { size: 12, className: "inline mr-1 text-purple-500" }), " ", t("timeline.settings.image_style_label") || "Image style", " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("timeline.settings.image_style_label") || "Image style",
      type: "text",
      value: timelineImageStyle,
      onChange: (e) => setTimelineImageStyle(e.target.value),
      placeholder: t("timeline.settings.style_placeholder") || "e.g. cartoon, pixel art, watercolor",
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 p-1.5 outline-none"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 italic mt-1" }, t("timeline.settings.image_style_hint") || "Applied to all AI-generated sequence visuals."))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("timeline"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed",
      "data-help-key": "timeline_generate_button"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" }), " ", t("timeline.generate")),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ));
}
function ConceptSortPanel(props) {
  const {
    addConcept,
    conceptImageMode,
    conceptInput,
    conceptItemCount,
    conceptSortImageStyle,
    expandedTools,
    handleConceptKeyDown,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    removeConcept,
    selectedConcepts,
    setConceptImageMode,
    setConceptInput,
    setConceptItemCount,
    setConceptSortImageStyle,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("concept-sort")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-amber-50 flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("concept_sort.categories"), " ", t("concept_sort.max_categories"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-amber-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_concept_input"),
      "data-help-key": "concept_sort_categories",
      type: "text",
      value: conceptInput,
      onChange: (e) => setConceptInput(e.target.value),
      onKeyDown: handleConceptKeyDown,
      placeholder: t("concept_sort.placeholder_categories"),
      className: "flex-grow text-sm px-2 py-1 border border-slate-400 rounded-md focus:ring-2 focus:ring-indigo-200 outline-none"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.add"),
      onClick: addConcept,
      disabled: !conceptInput.trim() || selectedConcepts.length >= 5,
      className: "bg-indigo-100 text-indigo-700 p-1.5 rounded-md hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 16 })
  )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 min-h-[1.5rem]" }, selectedConcepts.map((c) => /* @__PURE__ */ React.createElement("span", { key: c, className: "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200" }, c, /* @__PURE__ */ React.createElement("button", { onClick: () => removeConcept(c), className: "hover:text-indigo-900", "aria-label": t("common.remove") }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), selectedConcepts.length === 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600 italic" }, t("concept_sort.auto_detect")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("concept_sort.items"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-amber-600 font-normal" }, "(optional)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.text_field"),
      "data-help-key": "concept_sort_items",
      type: "number",
      min: "4",
      max: "30",
      placeholder: "Auto (AI decides)",
      value: conceptItemCount,
      onChange: (e) => {
        const v = e.target.value;
        setConceptItemCount(v === "" ? "" : parseInt(v, 10) || "");
      },
      title: "Leave blank to let AI pick the right number based on your source text. Or type 4\u201330 to force a specific count.",
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 p-1"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, "Card visuals"), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "Card visuals",
      "data-help-key": "concept_sort_image_mode",
      value: conceptImageMode,
      onChange: (e) => setConceptImageMode(e.target.value),
      className: "w-full text-xs border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "auto" }, "Auto (only on short items)"),
    /* @__PURE__ */ React.createElement("option", { value: "always" }, "Always generate images"),
    /* @__PURE__ */ React.createElement("option", { value: "never" }, "Never (text-only cards)")
  )), conceptImageMode !== "never" && /* @__PURE__ */ React.createElement("div", { "data-help-key": "concept_sort_image_style" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, /* @__PURE__ */ React.createElement(Palette, { size: 12, className: "inline mr-1 text-purple-500" }), " ", t("concept_sort.image_style_label") || "Image style", " ", /* @__PURE__ */ React.createElement("span", { className: "text-amber-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("concept_sort.image_style_label") || "Image style",
      type: "text",
      value: conceptSortImageStyle,
      onChange: (e) => setConceptSortImageStyle(e.target.value),
      placeholder: t("concept_sort.style_placeholder") || "e.g. cartoon, pixel art, watercolor",
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 p-1"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, t("concept_sort.image_style_hint") || "Applied to all AI-generated card visuals."))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      "data-help-key": "concept_sort_generate_button",
      onClick: () => handleGenerate("concept-sort"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-indigo-700 transition-colors flex items-center gap-2" }, t("concept_sort.generate"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ));
}
function BrainstormPanel(props) {
  const {
    BRIDGE_MODES,
    Terminal,
    brainstormCustomInstructions,
    bridgeSimType,
    bridgeStepCount,
    expandedTools,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    setBrainstormCustomInstructions,
    setBridgeSimType,
    setBridgeStepCount,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("brainstorm")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-yellow-50/50 flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("brainstorm.instructions")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("brainstorm.instructions") || "Brainstorm instructions",
      "data-help-key": "brainstorm_custom_instructions",
      value: brainstormCustomInstructions,
      onChange: (e) => setBrainstormCustomInstructions(e.target.value),
      placeholder: t("brainstorm.placeholder_input"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:ring-2 focus:ring-yellow-200 outline-none resize-none h-16 bg-white text-slate-800 placeholder:text-slate-500"
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("brainstorm"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-700 group-hover:text-violet-700 transition-colors flex items-center gap-2 font-semibold" }, t("brainstorm.generate"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-700 group-hover:text-violet-600" })
  ), /* @__PURE__ */ React.createElement("div", { className: "px-3 pb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 my-2" }, /* @__PURE__ */ React.createElement("div", { className: "h-px bg-slate-200 flex-grow" }), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-700 uppercase tracking-wider" }, t("brainstorm.divider_or")), /* @__PURE__ */ React.createElement("div", { className: "h-px bg-slate-200 flex-grow" })), /* @__PURE__ */ React.createElement("div", { className: "bg-violet-50 p-3 rounded-lg border border-violet-100 mb-3 space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-bold text-violet-900 mb-1 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Terminal, { size: 12 }), " ", t("brainstorm.simulation_type")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "brainstorm_simulation_type",
      value: bridgeSimType,
      onChange: (e) => setBridgeSimType(e.target.value),
      className: "w-full text-xs border border-violet-600 rounded p-1.5 focus:ring-2 focus:ring-violet-500 outline-none text-violet-800"
    },
    BRIDGE_MODES.map((mode) => /* @__PURE__ */ React.createElement("option", { key: mode.id, value: mode.id }, t(`bridge.modes.${mode.id}_label`)))
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-violet-800 mt-1 italic leading-tight" }, t(`bridge.modes.${bridgeSimType}_desc`))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-bold text-violet-900" }, t("bridge.iterative_steps")), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-mono bg-white px-1.5 rounded border border-violet-200 text-violet-800 font-bold" }, bridgeStepCount, " ", t("bridge.prompts_count"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.range_slider"),
      "data-help-key": "brainstorm_step_count",
      type: "range",
      min: "1",
      max: "10",
      step: "1",
      value: bridgeStepCount,
      onChange: (e) => setBridgeStepCount(parseInt(e.target.value)),
      className: "w-full h-1.5 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-700 mt-1" }, t("bridge.step_desc")))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.refresh"),
      "data-help-key": "brainstorm_generate_button",
      onClick: () => handleGenerate("gemini-bridge"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    },
    isProcessing ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Terminal, { size: 14 }),
    t("brainstorm.canvas_prompt")
  )));
}
function ImagePanel(props) {
  const {
    creativeMode,
    expandedTools,
    fillInTheBlank,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    noText,
    setCreativeMode,
    setFillInTheBlank,
    setNoText,
    setUseLowQualityVisuals,
    setVisualCustomInstructions,
    setVisualLayoutMode,
    setVisualStyle,
    t,
    useLowQualityVisuals,
    visualCustomInstructions,
    visualLayoutMode,
    visualStyle
  } = props;
  if (!expandedTools || !expandedTools.includes("image")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-purple-50/50 flex flex-col gap-3", "data-help-key": "tour-visual-settings" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement("input", { "aria-label": t("common.toggle"), "data-help-key": "visuals_worksheet_mode", type: "checkbox", checked: fillInTheBlank, onChange: (e) => setFillInTheBlank(e.target.checked), className: "rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4" }), /* @__PURE__ */ React.createElement(PenTool, { size: 12, className: "text-purple-600" }), " ", t("visuals.worksheet_mode")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement("input", { "aria-label": t("common.toggle"), "data-help-key": "visuals_creative_mode", type: "checkbox", checked: creativeMode, onChange: (e) => setCreativeMode(e.target.checked), className: "rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4" }), /* @__PURE__ */ React.createElement(Palette, { size: 12, className: "text-pink-600" }), " ", t("visuals.enhanced")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement("input", { "aria-label": t("common.toggle_no_text"), "data-help-key": "visuals_no_text", type: "checkbox", checked: noText, onChange: (e) => setNoText(e.target.checked), className: "rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4" }), /* @__PURE__ */ React.createElement(Ban, { size: 12, className: "text-red-500" }), " ", t("visuals.text_reduced")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_use_low_quality_visuals"),
      type: "checkbox",
      "data-help-key": "adventure_setup_chk_lowqual",
      checked: useLowQualityVisuals,
      onChange: (e) => setUseLowQualityVisuals(e.target.checked),
      className: "rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
    }
  ), /* @__PURE__ */ React.createElement(MonitorPlay, { size: 12, className: "text-slate-600" }), " ", t("visuals.low_quality_label"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 ml-1" }, t("visuals.low_quality_hint")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("visuals.art_style")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "visuals_art_style",
      value: visualStyle,
      onChange: (e) => setVisualStyle(e.target.value),
      className: "w-full text-xs border-slate-300 rounded-md shadow-sm focus:border-cyan-300 focus:ring focus:ring-cyan-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Default" }, t("visuals.styles.default")),
    /* @__PURE__ */ React.createElement("option", { value: "Isometric Diagram" }, t("visuals.styles.isometric")),
    /* @__PURE__ */ React.createElement("option", { value: "Pixel Art" }, t("visuals.styles.pixel")),
    /* @__PURE__ */ React.createElement("option", { value: "Watercolor" }, t("visuals.styles.watercolor")),
    /* @__PURE__ */ React.createElement("option", { value: "Technical Blueprint" }, t("visuals.styles.blueprint")),
    /* @__PURE__ */ React.createElement("option", { value: "Comic Book Style" }, t("visuals.styles.comic")),
    /* @__PURE__ */ React.createElement("option", { value: "Line Art" }, t("visuals.styles.line")),
    /* @__PURE__ */ React.createElement("option", { value: "3D Render" }, t("visuals.styles.render_3d"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, "\u{1F3AC} Layout Mode"), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.layout_mode_selection"),
      "data-help-key": "visuals_layout_mode",
      value: visualLayoutMode,
      onChange: (e) => setVisualLayoutMode(e.target.value),
      className: "w-full text-xs border-slate-300 rounded-md shadow-sm focus:border-cyan-300 focus:ring focus:ring-cyan-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "auto" }, "\u{1F916} AI Art Director (Auto)"),
    /* @__PURE__ */ React.createElement("option", { value: "single" }, "\u{1F5BC}\uFE0F Single Image"),
    /* @__PURE__ */ React.createElement("option", { value: "before-after" }, "\u2194\uFE0F Before & After"),
    /* @__PURE__ */ React.createElement("option", { value: "comparison" }, "\u{1F4CA} Comparison"),
    /* @__PURE__ */ React.createElement("option", { value: "sequence" }, "\u{1F522} Sequence / Steps"),
    /* @__PURE__ */ React.createElement("option", { value: "labeled-diagram" }, "\u{1F3F7}\uFE0F Labeled Diagram")
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement("textarea", { "aria-label": t("input.custom_instructions") || "Custom instructions for visuals", "data-help-key": "visuals_custom_instructions", value: visualCustomInstructions, onChange: (e) => setVisualCustomInstructions(e.target.value), placeholder: t("visuals.placeholder_instructions"), className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:ring-2 focus:ring-cyan-200 outline-none resize-none h-16" }))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("image"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-cyan-700 transition-colors flex items-center gap-2" }, t("visuals.generate"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-cyan-600" })
  ));
}
function PersonaPanel(props) {
  const {
    ListChecks,
    MessageCircleQuestion,
    activeView,
    expandedTools,
    generatedContent,
    handleGeneratePersonas,
    handleSetActiveViewToPersona,
    hasSourceOrAnalysis,
    isGeneratingPersona,
    isPersonaFreeResponse,
    isProcessing,
    personaCustomInstructions,
    personaState,
    setActiveView,
    setIsPersonaFreeResponse,
    setPersonaCustomInstructions,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("persona")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-indigo-50/50 flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", { "data-help-key": "persona_custom_instructions" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("input.custom_instructions") || "Custom instructions for persona",
      value: personaCustomInstructions,
      onChange: (e) => setPersonaCustomInstructions(e.target.value),
      placeholder: t("persona.custom_placeholder"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none resize-none h-16 transition-shadow duration-300"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-indigo-100/50 p-2 rounded border border-indigo-200", "data-help-key": "persona_free_response" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_is_persona_free_response"),
      id: "personaFreeResponseSidebar",
      type: "checkbox",
      checked: isPersonaFreeResponse,
      onChange: (e) => setIsPersonaFreeResponse(e.target.checked),
      className: "w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "personaFreeResponseSidebar", className: "text-xs font-bold text-indigo-800 cursor-pointer select-none flex items-center gap-2" }, isPersonaFreeResponse ? /* @__PURE__ */ React.createElement(MessageSquare, { size: 14, className: "text-indigo-600" }) : /* @__PURE__ */ React.createElement(ListChecks, { size: 14, className: "text-indigo-600" }), isPersonaFreeResponse ? t("persona.sidebar_mode_free") : t("persona.sidebar_mode_mc"), /* @__PURE__ */ React.createElement("span", { className: "font-normal opacity-70 hidden sm:inline" }, isPersonaFreeResponse ? t("persona.sidebar_hint_uncheck") : t("persona.sidebar_hint_check"))))), (personaState.options.length > 0 || generatedContent && generatedContent.type === "persona") && /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.ask_question"),
      onClick: handleSetActiveViewToPersona,
      className: `w-full p-3 text-left hover:bg-indigo-50 flex justify-between items-center group border-b border-slate-100 ${activeView === "persona" ? "bg-indigo-50 text-indigo-900 font-bold" : "text-slate-600"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm transition-colors flex items-center gap-2" }, /* @__PURE__ */ React.createElement(MessageCircleQuestion, { size: 14, className: "text-indigo-600" }), personaState.selectedCharacter ? t("persona.resume") : t("persona.view_candidates")),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.refresh"),
      "data-help-key": "persona_generate_button",
      onClick: () => {
        handleGeneratePersonas();
        setActiveView("persona");
      },
      disabled: !hasSourceOrAnalysis || isGeneratingPersona || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-purple-700 transition-colors flex items-center gap-2" }, isGeneratingPersona ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" }), isGeneratingPersona ? t("persona.identifying") : personaState.options.length > 0 ? t("persona.regenerate") : t("persona.find")),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-purple-600" })
  ));
}
function OutlinePanel(props) {
  const {
    expandedTools,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    outlineCustomInstructions,
    outlineType,
    setOutlineCustomInstructions,
    setOutlineType,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("outline")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-orange-50/50 flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("outline.structure_label")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "outline_structure",
      value: outlineType,
      onChange: (e) => setOutlineType(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Venn Diagram" }, t("outline.venn")),
    /* @__PURE__ */ React.createElement("option", { value: "T-Chart" }, t("outline.t_chart")),
    /* @__PURE__ */ React.createElement("option", { value: "Fishbone" }, t("outline.fishbone")),
    /* @__PURE__ */ React.createElement("option", { value: "Structured Outline" }, t("outline.structured")),
    /* @__PURE__ */ React.createElement("option", { value: "Key Concept Map" }, t("outline.concept_map")),
    /* @__PURE__ */ React.createElement("option", { value: "Flow Chart" }, t("outline.flow_chart")),
    /* @__PURE__ */ React.createElement("option", { value: "Cause and Effect" }, t("outline.cause_effect")),
    /* @__PURE__ */ React.createElement("option", { value: "Problem Solution" }, t("outline.problem_solution"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("outline.instructions_label")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("outline.instructions_label") || "Custom instructions for outline",
      "data-help-key": "outline_custom_instructions",
      value: outlineCustomInstructions,
      onChange: (e) => setOutlineCustomInstructions(e.target.value),
      placeholder: t("outline.placeholder_instructions"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:ring-2 focus:ring-cyan-200 outline-none resize-none h-16"
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      "data-help-key": "outline_generate_button",
      onClick: () => handleGenerate("outline"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-cyan-700 transition-colors flex items-center gap-2" }, t("outline.generate"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-cyan-600" })
  ));
}
function FaqPanel(props) {
  const {
    expandedTools,
    faqCount,
    faqCustomInstructions,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    setFaqCount,
    setFaqCustomInstructions,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("faq")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-cyan-50/50 flex flex-col gap-3", "data-help-key": "tour-faq-settings" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("faq.count")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "faq_count",
      value: faqCount,
      onChange: (e) => setFaqCount(parseInt(e.target.value)),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-cyan-300 focus:ring focus:ring-cyan-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: 3 }, t("faq.options.q3")),
    /* @__PURE__ */ React.createElement("option", { value: 5 }, t("faq.options.q5")),
    /* @__PURE__ */ React.createElement("option", { value: 8 }, t("faq.options.q8")),
    /* @__PURE__ */ React.createElement("option", { value: 10 }, t("faq.options.q10"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("input.custom_instructions") || "Custom instructions for FAQ",
      "data-help-key": "faq_custom_instructions",
      value: faqCustomInstructions,
      onChange: (e) => setFaqCustomInstructions(e.target.value),
      placeholder: t("faq.placeholder_instructions"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:ring-2 focus:ring-indigo-200 outline-none resize-none h-16"
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("faq"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-indigo-700 transition-colors flex items-center gap-2" }, t("faq.generate"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-indigo-600" })
  ));
}
function SentenceFramesPanel(props) {
  const {
    expandedTools,
    frameCustomInstructions,
    frameType,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    setFrameCustomInstructions,
    setFrameType,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("sentence-frames")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-rose-50/50 flex flex-col gap-3", "data-help-key": "tour-scaffolds-settings" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-medium" }, t("scaffolds.type")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      "data-help-key": "scaffolds_type",
      value: frameType,
      onChange: (e) => setFrameType(e.target.value),
      className: "w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-rose-300 focus:ring focus:ring-rose-200 p-1"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Sentence Starters" }, t("scaffolds.starters")),
    /* @__PURE__ */ React.createElement("option", { value: "Paragraph Frame" }, t("scaffolds.frame")),
    /* @__PURE__ */ React.createElement("option", { value: "Discussion Prompts" }, t("scaffolds.prompts"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-slate-700 mb-1" }, t("input.custom_instructions")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("input.custom_instructions") || "Custom instructions for scaffolds",
      "data-help-key": "scaffolds_custom_instructions",
      value: frameCustomInstructions,
      onChange: (e) => setFrameCustomInstructions(e.target.value),
      placeholder: t("scaffolds.placeholder_instructions"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-md focus:ring-2 focus:ring-cyan-200 outline-none resize-none h-16"
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      onClick: () => handleGenerate("sentence-frames"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-cyan-700 transition-colors flex items-center gap-2" }, t("scaffolds.generate"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-cyan-600" })
  ));
}
function LessonPlanPanel(props) {
  const {
    activeView,
    expandedTools,
    handleGenerateLessonPlan,
    hasSourceOrAnalysis,
    isProcessing,
    lessonCustomAdditions,
    setLessonCustomAdditions,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("lesson-plan")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-indigo-50/50 flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-bold text-slate-600 mb-1" }, t("lesson_plan.custom_additions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": t("lesson_plan.custom_additions") || "Lesson plan custom additions",
      "data-help-key": "lesson_plan_custom_additions",
      value: lessonCustomAdditions,
      onChange: (e) => setLessonCustomAdditions(e.target.value),
      placeholder: t("lesson_plan.placeholder_additions"),
      className: "w-full text-xs p-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none resize-none h-16 bg-white"
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate_lesson_plan"),
      onClick: handleGenerateLessonPlan,
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-cyan-700 transition-colors flex items-center gap-2" }, isProcessing && activeView === "lesson-plan" ? t("lesson_plan.drafting") : t("lesson_plan.generate"), isProcessing && activeView === "lesson-plan" ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-cyan-600" })
  ));
}
function AnalysisPanel(props) {
  const {
    checkAccuracyWithSearch,
    expandedTools,
    handleGenerate,
    hasSourceOrAnalysis,
    isProcessing,
    setCheckAccuracyWithSearch,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("analysis")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-100 bg-violet-50/50", "data-help-key": "tour-analysis-settings" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none", "data-help-key": "analysis_check_accuracy" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.toggle_check_accuracy_with_search"),
      type: "checkbox",
      checked: checkAccuracyWithSearch,
      onChange: (e) => setCheckAccuracyWithSearch(e.target.checked),
      className: "rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Globe, { size: 12, className: "text-blue-500" }), " ", t("analysis.check_accuracy"))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mt-1 ml-6 mb-2" }, t("analysis.grounding_desc"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      "data-help-key": "analysis_generate_button",
      onClick: () => handleGenerate("analysis"),
      disabled: !hasSourceOrAnalysis || isProcessing,
      "aria-busy": isProcessing,
      className: "w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 group-hover:text-violet-700 transition-colors flex items-center gap-2" }, t("analysis.run"), " ", /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-600" })),
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-slate-600 group-hover:text-violet-600" })
  ));
}
function UiToolWordsoundsPanel(props) {
  const {
    expandedTools,
    handleOpenWordSounds,
    t
  } = props;
  if (!expandedTools || !expandedTools.includes("ui-tool-wordsounds")) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white animate-in slide-in-from-top-2", "data-help-key": "tour-wordsounds-panel" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mb-3 leading-relaxed" }, "Generate phonics activities from any word list. Includes automatic segmentation, rhyming, and image generation."), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.generate"),
      "data-help-key": "wordsounds_open_btn",
      onClick: handleOpenWordSounds,
      className: "w-full py-2 bg-pink-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-pink-700 active:scale-95 transition-all flex items-center justify-center gap-2"
    },
    /* @__PURE__ */ React.createElement(Sparkles, { size: 14, className: "text-yellow-300" }),
    " Open Generator"
  ));
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.AdventurePanel = (typeof AdventurePanel !== 'undefined') ? AdventurePanel : null;
window.AlloModules.SimplifiedPanel = (typeof SimplifiedPanel !== 'undefined') ? SimplifiedPanel : null;
window.AlloModules.MathPanel = (typeof MathPanel !== 'undefined') ? MathPanel : null;
window.AlloModules.DbqPanel = (typeof DbqPanel !== 'undefined') ? DbqPanel : null;
window.AlloModules.SourceInputPanel = (typeof SourceInputPanel !== 'undefined') ? SourceInputPanel : null;
window.AlloModules.GlossaryPanel = (typeof GlossaryPanel !== 'undefined') ? GlossaryPanel : null;
window.AlloModules.QuizPanel = (typeof QuizPanel !== 'undefined') ? QuizPanel : null;
window.AlloModules.TimelinePanel = (typeof TimelinePanel !== 'undefined') ? TimelinePanel : null;
window.AlloModules.ConceptSortPanel = (typeof ConceptSortPanel !== 'undefined') ? ConceptSortPanel : null;
window.AlloModules.BrainstormPanel = (typeof BrainstormPanel !== 'undefined') ? BrainstormPanel : null;
window.AlloModules.ImagePanel = (typeof ImagePanel !== 'undefined') ? ImagePanel : null;
window.AlloModules.PersonaPanel = (typeof PersonaPanel !== 'undefined') ? PersonaPanel : null;
window.AlloModules.OutlinePanel = (typeof OutlinePanel !== 'undefined') ? OutlinePanel : null;
window.AlloModules.FaqPanel = (typeof FaqPanel !== 'undefined') ? FaqPanel : null;
window.AlloModules.SentenceFramesPanel = (typeof SentenceFramesPanel !== 'undefined') ? SentenceFramesPanel : null;
window.AlloModules.LessonPlanPanel = (typeof LessonPlanPanel !== 'undefined') ? LessonPlanPanel : null;
window.AlloModules.AnalysisPanel = (typeof AnalysisPanel !== 'undefined') ? AnalysisPanel : null;
window.AlloModules.UiToolWordsoundsPanel = (typeof UiToolWordsoundsPanel !== 'undefined') ? UiToolWordsoundsPanel : null;
window.AlloModules.ViewSidebarPanelsModule = true;
window.AlloModules.SidebarPanels = true;  // satisfies loadModule('SidebarPanels', ...)
console.log('[CDN] ViewSidebarPanelsModule loaded — 18 panels registered');
})();
