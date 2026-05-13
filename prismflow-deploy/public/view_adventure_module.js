/**
 * AlloFlow View - Adventure Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='adventure' block.
 * Source range: 1,304 lines body — second-largest extraction in the
 * project's history (after Simplified at 1,650).
 *
 * Renders: full Adventure game UI — setup form (difficulty/language/art
 * style/free-response/chance/story-mode/character-consistency/system-mode
 * /custom-instructions/climax-config), main scene rendering with image,
 * choice buttons, dictation mode, text input, ledger, inventory modal,
 * shop modal, storybook export modal, immersive mode (Ken Burns animation,
 * hide-UI / show-choices toggles, full-screen scene viewer), session
 * democracy/multi-player vote display, climax progress bar, animated XP.
 *
 * Pre-extraction prep: 4 inline setAdventureState callbacks lifted to
 * named host handlers (handleToggleAdventureImmersive,
 * handleExitAdventureImmersive, handleSetEnableAutoClimax,
 * handleSetClimaxMinTurns) to ensure climax-config form doesn't break.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AdventureView) {
    console.log('[CDN] ViewAdventureModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAdventureModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ArrowDown = _lazyIcon('ArrowDown');
  var Backpack = _lazyIcon('Backpack');
  var BookOpen = _lazyIcon('BookOpen');
  var Download = _lazyIcon('Download');
  var Eye = _lazyIcon('Eye');
  var EyeOff = _lazyIcon('EyeOff');
  var Flag = _lazyIcon('Flag');
  var History = _lazyIcon('History');
  var ImageIcon = _lazyIcon('ImageIcon');
  var Lock = _lazyIcon('Lock');
  var MapIcon = _lazyIcon('MapIcon');
  var Maximize = _lazyIcon('Maximize');
  var Mic = _lazyIcon('Mic');
  var MicOff = _lazyIcon('MicOff');
  var Minimize = _lazyIcon('Minimize');
  var Monitor = _lazyIcon('Monitor');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var Pencil = _lazyIcon('Pencil');
  var Plus = _lazyIcon('Plus');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Scale = _lazyIcon('Scale');
  var Send = _lazyIcon('Send');
  var Sparkles = _lazyIcon('Sparkles');
  var Trophy = _lazyIcon('Trophy');
  var User = _lazyIcon('User');
  var Users = _lazyIcon('Users');
  var Volume2 = _lazyIcon('Volume2');
  var VolumeX = _lazyIcon('VolumeX');
  var Wifi = _lazyIcon('Wifi');
  var WifiOff = _lazyIcon('WifiOff');
  var X = _lazyIcon('X');
  var Zap = _lazyIcon('Zap');

  function AdventureView(props) {
  // State (object-bundle)
  var adventureState = props.adventureState;
  // State reads
  var t = props.t;
  var globalPoints = props.globalPoints;
  var soundEnabled = props.soundEnabled;
  var activeView = props.activeView;
  var showLedger = props.showLedger;
  var isProcessing = props.isProcessing;
  var adventureImageSize = props.adventureImageSize;
  var adventureAutoRead = props.adventureAutoRead;
  var isDictationMode = props.isDictationMode;
  var adventureTextInput = props.adventureTextInput;
  var adventureInputMode = props.adventureInputMode;
  var adventureArtStyle = props.adventureArtStyle;
  var adventureCustomArtStyle = props.adventureCustomArtStyle;
  var useLowQualityVisuals = props.useLowQualityVisuals;
  var enableFactionResources = props.enableFactionResources;
  var isZenMode = props.isZenMode;
  var showNewGameSetup = props.showNewGameSetup;
  var hasSavedAdventure = props.hasSavedAdventure;
  var isEditingOptions = props.isEditingOptions;
  var editingOptionsBuffer = props.editingOptionsBuffer;
  var adventureChanceMode = props.adventureChanceMode;
  var isAdventureStoryMode = props.isAdventureStoryMode;
  var adventureConsistentCharacters = props.adventureConsistentCharacters;
  var adventureFreeResponseEnabled = props.adventureFreeResponseEnabled;
  var adventureDifficulty = props.adventureDifficulty;
  var adventureLanguageMode = props.adventureLanguageMode;
  var selectedLanguages = props.selectedLanguages;
  var adventureCustomInstructions = props.adventureCustomInstructions;
  var isTeacherMode = props.isTeacherMode;
  var studentProjectSettings = props.studentProjectSettings;
  var failedAdventureAction = props.failedAdventureAction;
  var selectedInventoryItem = props.selectedInventoryItem;
  var showImmersiveInventory = props.showImmersiveInventory;
  var immersiveHideUI = props.immersiveHideUI;
  var immersiveShowChoices = props.immersiveShowChoices;
  var sessionData = props.sessionData;
  var activeSessionCode = props.activeSessionCode;
  var isPlaying = props.isPlaying;
  var playbackState = props.playbackState;
  var playingContentId = props.playingContentId;
  var theme = props.theme;
  var STYLE_IMAGE_PIXELATED = props.STYLE_IMAGE_PIXELATED;
  // Refs
  var adventureScrollRef = props.adventureScrollRef;
  var adventureInputRef = props.adventureInputRef;
  // Setters
  var setAdventureInputMode = props.setAdventureInputMode;
  var setAdventureDifficulty = props.setAdventureDifficulty;
  var setAdventureLanguageMode = props.setAdventureLanguageMode;
  var setAdventureFreeResponseEnabled = props.setAdventureFreeResponseEnabled;
  var setAdventureChanceMode = props.setAdventureChanceMode;
  var setIsAdventureStoryMode = props.setIsAdventureStoryMode;
  var setAdventureConsistentCharacters = props.setAdventureConsistentCharacters;
  var setAdventureArtStyle = props.setAdventureArtStyle;
  var setAdventureCustomArtStyle = props.setAdventureCustomArtStyle;
  var setUseLowQualityVisuals = props.setUseLowQualityVisuals;
  var setEnableFactionResources = props.setEnableFactionResources;
  var setAdventureCustomInstructions = props.setAdventureCustomInstructions;
  var setAdventureTextInput = props.setAdventureTextInput;
  var setIsDictationMode = props.setIsDictationMode;
  var setSelectedInventoryItem = props.setSelectedInventoryItem;
  var setShowImmersiveInventory = props.setShowImmersiveInventory;
  var setShowLedger = props.setShowLedger;
  var setShowStorybookExportModal = props.setShowStorybookExportModal;
  var setAdventureImageSize = props.setAdventureImageSize;
  var setAdventureAutoRead = props.setAdventureAutoRead;
  // Handlers (lifted in this session's prep + existing)
  var handleToggleAdventureImmersive = props.handleToggleAdventureImmersive;
  var handleExitAdventureImmersive = props.handleExitAdventureImmersive;
  var handleSetEnableAutoClimax = props.handleSetEnableAutoClimax;
  var handleSetClimaxMinTurns = props.handleSetClimaxMinTurns;
  var handleAddOptionSlot = props.handleAddOptionSlot;
  var handleAdventureChoice = props.handleAdventureChoice;
  var handleAdventureCrashRecovery = props.handleAdventureCrashRecovery;
  var handleAdventureTextSubmit = props.handleAdventureTextSubmit;
  var handleBroadcastOptions = props.handleBroadcastOptions;
  var handleCloseShop = props.handleCloseShop;
  var handleOptionBufferChange = props.handleOptionBufferChange;
  var handleRemoveOptionSlot = props.handleRemoveOptionSlot;
  var handleResumeAdventure = props.handleResumeAdventure;
  var handleRetryAdventureTurn = props.handleRetryAdventureTurn;
  var handleSelectInventoryItem = props.handleSelectInventoryItem;
  var handleSetIsEditingOptionsToFalse = props.handleSetIsEditingOptionsToFalse;
  var handleSetIsZenModeToTrue = props.handleSetIsZenModeToTrue;
  var handleSetSelectedInventoryItemToNull = props.handleSetSelectedInventoryItemToNull;
  var handleSetShowLedgerToFalse = props.handleSetShowLedgerToFalse;
  var handleSetShowLedgerToTrue = props.handleSetShowLedgerToTrue;
  var handleSetShowNewGameSetupToFalse = props.handleSetShowNewGameSetupToFalse;
  var handleSetShowNewGameSetupToTrue = props.handleSetShowNewGameSetupToTrue;
  var handleSetShowStorybookExportModalToTrue = props.handleSetShowStorybookExportModalToTrue;
  var handleShopPurchase = props.handleShopPurchase;
  var handleSpeak = props.handleSpeak;
  var handleStartAdventure = props.handleStartAdventure;
  var handleStartOptionEdit = props.handleStartOptionEdit;
  var handleStartSequel = props.handleStartSequel;
  var handleToggleImmersiveHideUI = props.handleToggleImmersiveHideUI;
  var handleToggleImmersiveShowChoices = props.handleToggleImmersiveShowChoices;
  var handleUseItem = props.handleUseItem;
  var toggleDemocracyMode = props.toggleDemocracyMode;
  // Pure helpers
  var renderFormattedText = props.renderFormattedText;
  var formatInteractiveText = props.formatInteractiveText;
  var splitTextToSentences = props.splitTextToSentences;
  var stopPlayback = props.stopPlayback;
  var executeStartAdventure = props.executeStartAdventure;
  var adventureEffects = props.adventureEffects;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var AdventureAmbience = props.AdventureAmbience;
  var AdventureShop = props.AdventureShop;
  var AnimatedNumber = props.AnimatedNumber;
  var ClimaxProgressBar = props.ClimaxProgressBar;
  var ConfettiExplosion = props.ConfettiExplosion;
  var InventoryGrid = props.InventoryGrid;
  return /*#__PURE__*/React.createElement(ErrorBoundary, {
    title: t('adventure.error.title'),
    fallbackMessage: t('adventure.error.fallback'),
    retryLabel: t('adventure.error.retry'),
    onRetry: handleAdventureCrashRecovery
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full flex flex-col gap-3 relative"
  }, /*#__PURE__*/React.createElement(ClimaxProgressBar, {
    climaxState: adventureState.climax
  }), /*#__PURE__*/React.createElement(AdventureAmbience, {
    sceneText: adventureState.currentScene?.text,
    soundParams: adventureState.currentScene?.soundParams,
    active: !adventureState.isGameOver && soundEnabled && activeView === 'adventure',
    volume: 0.2
  }), adventureState.isShopOpen && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "The adventure shop encountered an error."
  }, /*#__PURE__*/React.createElement(AdventureShop, {
    gold: adventureState.gold,
    globalXP: globalPoints,
    onClose: handleCloseShop,
    onPurchase: handleShopPurchase
  })), showLedger && /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === 'Escape') e.currentTarget.click();
    },
    className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200",
    onClick: handleSetShowLedgerToFalse
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative border-4 border-indigo-200 transition-all animate-in zoom-in-95",
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSetShowLedgerToFalse,
    className: "absolute top-3 right-3 text-slate-600 hover:text-slate-600 bg-slate-100 rounded-full p-1 transition-colors",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-black text-indigo-900"
  }, t('adventure.ledger_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, t('adventure.ledger_subtitle'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-4 rounded-xl border border-slate-400 text-sm text-slate-700 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar whitespace-pre-line font-serif"
  }, adventureState.narrativeLedger || t('adventure.ledger_empty')), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => {
      setShowLedger(false);
      setShowStorybookExportModal(true);
    },
    disabled: isProcessing || adventureState.history.length === 0,
    "aria-busy": isProcessing,
    className: "w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Download, {
    size: 18
  }), t('adventure.storybook')), /*#__PURE__*/React.createElement("button", {
    onClick: handleSetShowLedgerToFalse,
    className: "w-full px-6 py-2 text-slate-600 font-bold hover:text-slate-700 transition-colors"
  }, t('common.close'))))), /*#__PURE__*/React.createElement("div", {
    className: `bg-indigo-900 p-4 rounded-lg border border-indigo-800 flex flex-col md:flex-row justify-between items-center shadow-md shrink-0 gap-4 relative overflow-x-auto ${adventureState.isImmersiveMode ? 'hidden' : ''}`
  }, adventureEffects.levelUp && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null), /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-400 text-indigo-900 px-8 py-4 rounded-2xl border-4 border-white shadow-2xl font-black text-2xl animate-in zoom-in duration-300 rotate-3"
  }, t('adventure.feedback.level_up', {
    level: adventureEffects.levelUp
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-white flex-grow relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 overflow-x-auto min-w-0 pb-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold flex items-center gap-2 shrink-0 whitespace-nowrap"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 18,
    className: "text-yellow-400"
  }), " ", t('adventure.title')), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-400/50 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 animate-pulse"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFDB\uFE0F"), " System Sim"), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-800 px-3 py-1 rounded-full text-xs font-bold border border-indigo-600 flex items-center gap-2 relative shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-400"
  }, "Lvl ", adventureState.level), /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-2 bg-indigo-950 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ease-out",
    style: {
      width: `${Math.min(100, adventureState.xp / adventureState.xpToNextLevel * 100)}%`
    }
  })), adventureEffects.xp !== null && /*#__PURE__*/React.createElement("div", {
    className: `absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-300 font-black text-lg animate-[ping_0.8s_ease-out_reverse] pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.xp < 0 ? 'text-red-400' : 'text-yellow-300'}`
  }, adventureEffects.xp > 0 ? '+' : '', adventureEffects.xp, " XP")), /*#__PURE__*/React.createElement("div", {
    className: `px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 relative shrink-0 transition-all duration-200 ${adventureInputMode === 'system' ? 'bg-amber-900/60 border-amber-600' : adventureEffects.energy < 0 ? 'animate-shake border-red-500 bg-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-indigo-800 border-indigo-600'}`,
    title: adventureInputMode === 'system' ? `Stability: ${adventureState.energy}%` : t('adventure.tooltips.energy', {
      value: adventureState.energy
    })
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 12,
    className: `fill-current transition-colors duration-200 ${adventureInputMode === 'system' ? 'text-amber-400' : adventureEffects.energy < 0 ? 'text-red-400' : 'text-yellow-400'}`
  }), /*#__PURE__*/React.createElement("span", {
    className: `w-6 text-right transition-colors duration-200 ${adventureInputMode === 'system' ? 'text-amber-300' : adventureEffects.energy < 0 ? 'text-red-300' : 'text-yellow-400'}`
  }, /*#__PURE__*/React.createElement(AnimatedNumber, {
    value: adventureState.energy
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-2 bg-indigo-950 rounded-full overflow-hidden relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full transition-all duration-500 ${adventureInputMode === 'system' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : adventureState.energy < 20 || adventureEffects.energy < 0 ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`,
    style: {
      width: `${adventureState.energy}%`
    }
  })), adventureEffects.energy !== null && /*#__PURE__*/React.createElement("div", {
    className: `absolute -top-8 left-1/2 transform -translate-x-1/2 font-black text-lg animate-[ping_0.8s_ease-out_reverse] pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.energy > 0 ? 'text-green-400' : 'text-red-500'}`
  }, adventureEffects.energy > 0 ? '+' : '', adventureEffects.energy)), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-800 px-3 py-1 rounded-full text-xs font-bold border border-indigo-600 flex items-center gap-1.5 text-yellow-400 shadow-sm shrink-0",
    title: t('adventure.tooltips.gold', {
      value: adventureState.gold
    })
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCB0"), " ", adventureState.gold, adventureState.activeGoldBuffTurns > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] ml-1 bg-yellow-400 text-black px-1 rounded-full"
  }, adventureState.activeGoldBuffTurns)), /*#__PURE__*/React.createElement(InventoryGrid, {
    inventory: adventureState.inventory,
    onSelect: handleSelectInventoryItem
  }), adventureInputMode === 'system' && enableFactionResources && (adventureState.systemResources || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1 mt-1"
  }, adventureState.systemResources.slice(0, 5).map((resource, idx) => /*#__PURE__*/React.createElement("div", {
    key: `fr-${idx}`,
    className: "bg-amber-900/50 border border-amber-600/40 rounded px-1.5 py-0.5 flex items-center gap-1 text-[11px]",
    title: `${resource.name}: ${resource.quantity}${resource.unit || ''}`
  }, /*#__PURE__*/React.createElement("span", null, resource.icon || '📦'), /*#__PURE__*/React.createElement("span", {
    className: "text-amber-200 font-bold"
  }, resource.quantity, resource.unit ? /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300/70 font-normal ml-0.5"
  }, resource.unit) : ''))), adventureState.systemResources.length > 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300/60 text-[11px]"
  }, "+", adventureState.systemResources.length - 5))), adventureInputMode === 'debate' && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-4 bg-slate-700 rounded-full border border-slate-600 overflow-hidden shadow-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full transition-all duration-500 ease-out ${adventureState.debateMomentum > 60 ? 'bg-green-500' : adventureState.debateMomentum < 40 ? 'bg-red-500' : 'bg-yellow-500'}`,
    style: {
      width: `${adventureState.debateMomentum}%`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 z-10"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-black text-white drop-shadow-md tracking-wider"
  }, adventureState.debateMomentum, "/100"))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-indigo-200 mt-1 px-1 uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement("span", null, t('adventure.debate_opponent')), /*#__PURE__*/React.createElement("span", null, t('adventure.debate_you')))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-indigo-200 mt-1"
  }, t('adventure.explore_hint'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 relative z-10 overflow-x-auto min-w-0 shrink-0"
  }, isTeacherMode && adventureState.currentScene && !adventureState.isGameOver && /*#__PURE__*/React.createElement("button", {
    "data-help-key": "adventure_edit_options",
    onClick: handleStartOptionEdit,
    disabled: isEditingOptions,
    className: `flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${isEditingOptions ? 'bg-indigo-900 text-indigo-600 border-indigo-700 opacity-50 cursor-not-allowed' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white'}`,
    title: t('adventure.edit_options_tooltip'),
    "aria-label": t('adventure.edit_options_tooltip')
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), " ", /*#__PURE__*/React.createElement("span", {
    className: "hidden xl:inline"
  }, t('adventure.edit_options_btn'))), activeSessionCode && /*#__PURE__*/React.createElement("button", {
    "data-help-key": "democracy_toggle",
    onClick: toggleDemocracyMode,
    className: `flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${sessionData?.democracy?.isActive ? 'bg-teal-700 text-white border-teal-500 ring-2 ring-teal-400' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700'}`,
    title: t('adventure.tooltips.democracy_toggle'),
    "aria-label": t('adventure.tooltips.democracy_toggle')
  }, sessionData?.democracy?.isActive ? /*#__PURE__*/React.createElement(Users, {
    size: 14
  }) : /*#__PURE__*/React.createElement(User, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden xl:inline"
  }, sessionData?.democracy?.isActive ? t('adventure.democracy_on') : t('adventure.democracy_off'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.read'),
    onClick: handleSetShowLedgerToTrue,
    className: "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white",
    title: t('adventure.ledger_tooltip')
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 14,
    className: "fill-current"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.log_button'))), /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleAdventureImmersive,
    className: `flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${adventureState.isImmersiveMode ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white'}`,
    title: adventureState.isImmersiveMode ? t('adventure.exit_immersive') : t('adventure.enter_immersive')
  }, /*#__PURE__*/React.createElement(Monitor, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, adventureState.isImmersiveMode ? t('adventure.view_standard') : t('adventure.view_immersive'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    "data-help-key": "adventure_immersive_autoread",
    onClick: () => {
      const newState = !adventureAutoRead;
      setAdventureAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${adventureAutoRead ? 'bg-yellow-400 text-indigo-900 border-yellow-500 hover:bg-yellow-300' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700'}`,
    title: adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable')
  }, adventureAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 14,
    className: "fill-current animate-pulse"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.auto_read_status_label'), ": ", adventureAutoRead ? t('common.on') : t('common.off'))), !isZenMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.maximize'),
    onClick: handleSetIsZenModeToTrue,
    className: "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white",
    title: t('adventure.maximize_tooltip')
  }, /*#__PURE__*/React.createElement(Maximize, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.view_button'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_new_adventure'),
    "data-help-key": "adventure_start_btn",
    onClick: handleStartAdventure,
    className: "flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2 rounded-full text-xs font-bold hover:bg-white/20 transition-colors shadow-sm"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: adventureState.isLoading ? "animate-spin" : ""
  }), " ", t('adventure.restart')))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow bg-slate-100 rounded-xl border border-slate-400 shadow-inner overflow-hidden flex flex-col relative"
  }, !adventureState.isImmersiveMode ? /*#__PURE__*/React.createElement("div", {
    ref: adventureScrollRef,
    className: "flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar"
  }, !adventureState.currentScene && adventureState.history.length === 0 && !adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "min-h-full flex flex-col items-center py-10 animate-in fade-in zoom-in duration-300"
  }, hasSavedAdventure && !showNewGameSetup ? /*#__PURE__*/React.createElement("div", {
    className: "max-w-md w-full text-center space-y-6 my-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-8 rounded-3xl shadow-xl border-4 border-indigo-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border-2 border-indigo-200"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 40
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800 mb-2"
  }, t('adventure.paused_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 mb-6 font-medium"
  }, t('adventure.paused_desc')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.history'),
    "data-help-key": "adventure_resume_btn",
    onClick: handleResumeAdventure,
    className: "w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(History, {
    size: 20
  }), " ", t('adventure.resume'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.new_game_setup'),
    onClick: handleSetShowNewGameSetupToTrue,
    className: "text-slate-600 hover:text-red-500 font-bold text-xs flex items-center justify-center gap-2 transition-colors py-2 uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }), " ", t('adventure.start_overwrite'))) : /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-5xl bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden relative my-auto"
  }, hasSavedAdventure && /*#__PURE__*/React.createElement("button", {
    onClick: handleSetShowNewGameSetupToFalse,
    className: "absolute top-4 left-4 text-white/70 hover:text-white hover:bg-white/20 p-1 rounded-full transition-colors z-10",
    title: t('adventure.back_to_resume')
  }, /*#__PURE__*/React.createElement(ArrowDown, {
    className: "rotate-90",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-600 p-4 text-white flex justify-between items-center relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-grow text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 24
  }), " ", t('adventure.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-200 text-sm font-medium"
  }, t('adventure.setup_subtitle')))), /*#__PURE__*/React.createElement("div", {
    className: "p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2"
  }, t('adventure.settings.core')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between"
  }, t('adventure.interaction_mode'), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowModeSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600"
  })), /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    "data-help-key": "adventure_setup_input_mode",
    value: adventureInputMode,
    onChange: e => setAdventureInputMode(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowModeSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "w-full p-2 border border-slate-400 rounded-lg text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
  }, /*#__PURE__*/React.createElement("option", {
    value: "choice"
  }, t('adventure.mode_choice')), /*#__PURE__*/React.createElement("option", {
    value: "debate"
  }, t('adventure.mode_debate')), /*#__PURE__*/React.createElement("option", {
    value: "system"
  }, t('adventure.mode_system')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between"
  }, t('adventure.difficulty_label'), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowDifficultySwitch || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600"
  })), /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    "data-help-key": "adventure_setup_difficulty",
    value: adventureDifficulty,
    onChange: e => setAdventureDifficulty(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowDifficultySwitch || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "w-full p-2 border border-slate-400 rounded-lg text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
  }, /*#__PURE__*/React.createElement("option", {
    value: "Story"
  }, t('adventure.diff_story_option')), /*#__PURE__*/React.createElement("option", {
    value: "Normal"
  }, t('adventure.diff_normal_option')), /*#__PURE__*/React.createElement("option", {
    value: "Hard"
  }, t('adventure.diff_hard_option')), /*#__PURE__*/React.createElement("option", {
    value: "Hardcore"
  }, t('adventure.diff_hardcore_option')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between"
  }, t('adventure.language_label'), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowLanguageSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600"
  })), /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    "data-help-key": "adventure_setup_language",
    value: adventureLanguageMode,
    onChange: e => setAdventureLanguageMode(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowLanguageSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "w-full p-2 border border-slate-400 rounded-lg text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
  }, /*#__PURE__*/React.createElement("option", {
    value: "English"
  }, t('adventure.lang_options.english_only')), selectedLanguages.map(lang => /*#__PURE__*/React.createElement(React.Fragment, {
    key: lang
  }, /*#__PURE__*/React.createElement("option", {
    value: lang
  }, t('adventure.lang_options.only_suffix', {
    lang
  })), /*#__PURE__*/React.createElement("option", {
    value: `${lang} + English`
  }, t('adventure.lang_options.plus_english', {
    lang
  })))), selectedLanguages.length > 1 && /*#__PURE__*/React.createElement("option", {
    value: "All + English"
  }, t('adventure.lang_options.all_plus_english', {
    langs: selectedLanguages.join(', ')
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2"
  }, t('adventure.settings.modifiers')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureFreeResponseEnabled ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_adventure_free_response_enabled'),
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_freeresponse",
    checked: adventureFreeResponseEnabled,
    onChange: e => setAdventureFreeResponseEnabled(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.free_response_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-600 opacity-80"
  }, t('adventure.free_response_desc')))), /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureChanceMode ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_adventure_chance_mode'),
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_chance",
    checked: adventureChanceMode,
    onChange: e => setAdventureChanceMode(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.chance_mode_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-600 opacity-80"
  }, t('adventure.chance_mode_desc')))), /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${isAdventureStoryMode ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_is_adventure_story_mode'),
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_story",
    checked: isAdventureStoryMode,
    onChange: e => setIsAdventureStoryMode(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.story_mode_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-600 opacity-80"
  }, t('adventure.story_mode_desc')))), /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_consistent_characters') || 'Toggle consistent characters',
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_consistent_characters",
    checked: adventureConsistentCharacters,
    onChange: e => setAdventureConsistentCharacters(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-4 h-4 text-violet-600 rounded focus:ring-violet-500 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, "\uD83C\uDFAD ", t('adventure.consistent_characters_label') || 'Consistent Characters'), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-600 opacity-80"
  }, t('adventure.consistent_characters_desc') || 'Persistent visual cast across scenes'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 p-2 rounded-lg border border-indigo-100 bg-indigo-50/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, "\uD83C\uDFA8 ", t('adventure.art_style_label') || 'Art Style'), /*#__PURE__*/React.createElement("select", {
    "aria-label": t('adventure.art_style_label') || 'Art style',
    value: adventureArtStyle,
    onChange: e => setAdventureArtStyle(e.target.value),
    className: "mt-1 w-full text-xs px-2 py-1 border border-indigo-600 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: "auto"
  }, "\uD83C\uDFA8 ", t('adventure.art_auto') || 'Auto (default)'), /*#__PURE__*/React.createElement("option", {
    value: "storybook"
  }, "\uD83D\uDCDA ", t('adventure.art_storybook') || 'Storybook'), /*#__PURE__*/React.createElement("option", {
    value: "pixel"
  }, "\uD83C\uDFAE ", t('adventure.art_pixel') || 'Pixel Art'), /*#__PURE__*/React.createElement("option", {
    value: "cinematic"
  }, "\uD83C\uDFAC ", t('adventure.art_cinematic') || 'Cinematic'), /*#__PURE__*/React.createElement("option", {
    value: "anime"
  }, "\uD83C\uDFA8 ", t('adventure.art_anime') || 'Anime'), /*#__PURE__*/React.createElement("option", {
    value: "crayon"
  }, "\uD83D\uDD8D\uFE0F ", t('adventure.art_crayon') || 'Hand-drawn'), /*#__PURE__*/React.createElement("option", {
    value: "custom"
  }, "\u270F\uFE0F ", t('adventure.art_custom') || 'Custom...')), adventureArtStyle === 'custom' && /*#__PURE__*/React.createElement("input", {
    type: "text",
    "aria-label": t('adventure.custom_art_style_placeholder') || 'Custom art style',
    value: adventureCustomArtStyle,
    onChange: e => setAdventureCustomArtStyle(e.target.value),
    placeholder: t('adventure.custom_art_style_placeholder') || 'Describe your art style...',
    className: "mt-1 w-full text-xs px-2 py-1 border border-indigo-600 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
  }))), /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${useLowQualityVisuals ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_use_low_quality_visuals'),
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_lowqual",
    checked: useLowQualityVisuals,
    onChange: e => setUseLowQualityVisuals(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.low_quality_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-600 opacity-80"
  }, t('adventure.low_quality_desc')))), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${enableFactionResources ? 'bg-amber-50 border-amber-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_enable_faction_resources'),
    type: "checkbox",
    checked: enableFactionResources,
    onChange: e => setEnableFactionResources(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.system_state_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-600 opacity-80"
  }, t('adventure.system_state_desc')))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2"
  }, t('adventure.settings.customization')), /*#__PURE__*/React.createElement("div", {
    className: `bg-indigo-50 p-3 rounded-lg border border-indigo-100 ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "setupAutoClimax",
    className: "text-xs font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_enable_auto_climax_false'),
    id: "setupAutoClimax",
    type: "checkbox",
    checked: adventureState.enableAutoClimax || false,
    onChange: e => handleSetEnableAutoClimax(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
  }), t('adventure.climax.enable_label'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-slate-600 font-bold uppercase"
  }, t('adventure.climax.min_rounds_label')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_adventure_state'),
    type: "number",
    min: "3",
    max: "50",
    value: adventureState.climaxMinTurns || 20,
    onChange: e => handleSetClimaxMinTurns(e.target.value),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-12 text-xs border border-indigo-600 rounded p-1 text-center focus:ring-indigo-500 outline-none font-bold text-indigo-900 bg-white"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, t('input.custom_instructions'), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-600 font-normal"
  }, t('common.optional'))), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowCustomInstructions || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600"
  })), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('input.custom_instructions') || 'Custom instructions for adventure',
    value: adventureCustomInstructions,
    onChange: e => setAdventureCustomInstructions(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowCustomInstructions || studentProjectSettings.adventurePermissions?.lockAllSettings),
    placeholder: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowCustomInstructions || studentProjectSettings.adventurePermissions?.lockAllSettings) ? t('adventure.placeholder_locked') : t('adventure.placeholder_custom'),
    className: "w-full p-2 border border-slate-400 rounded-lg text-sm h-28 resize-none focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white transition-all shadow-inner"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-slate-50 border-t border-slate-200 flex justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.generate'),
    onClick: () => executeStartAdventure(),
    className: "w-full md:w-auto px-16 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20,
    className: "text-yellow-400 fill-current animate-pulse"
  }), t('adventure.start'))))), adventureState.history.map((entry, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `animate-in fade-in slide-in-from-bottom-2 duration-500 ${entry.type === 'choice' ? 'flex justify-end' : 'flex justify-start'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: `max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${entry.type === 'choice' ? 'bg-indigo-600 text-white rounded-br-none' : entry.type === 'feedback' ? 'bg-green-50 border border-green-200 text-green-800 italic text-xs' : 'bg-white text-slate-800 border border-slate-400 rounded-bl-none font-serif'}`
  }, entry.type === 'choice' && /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1"
  }, t('adventure.you_chose')), entry.type === 'feedback' && /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 10
  }), " ", t('adventure.analysis_label')), renderFormattedText(entry.text, true, entry.type === 'choice')))), adventureState.pendingChoice && adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-start animate-in slide-in-from-bottom-2 duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[85%] bg-amber-50 p-4 rounded-2xl rounded-bl-none border border-amber-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 font-bold text-xs uppercase tracking-wider"
  }, "\u2694\uFE0F ", t('adventure.your_choice') || 'Your Choice')), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-800 text-sm font-medium italic leading-relaxed"
  }, "\"", adventureState.pendingChoice, "\""), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-400 text-xs mt-2 animate-pulse"
  }, t('adventure.story_unfolds') || '✨ The story unfolds...'))), adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-start animate-pulse"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-2xl rounded-bl-none border border-slate-400 flex items-center gap-2 text-slate-600 text-sm"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }), " ", t('adventure.status.loading_story'))), adventureState.currentScene && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[90%] bg-white p-6 rounded-2xl rounded-bl-none border-l-4 border-l-yellow-400 shadow-md relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-yellow-600 uppercase tracking-wider flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Flag, {
    size: 12
  }), " ", t('adventure.current_scene')), adventureState.sceneImage && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100",
    title: t('common.adjust_image_size')
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 10,
    className: "text-yellow-500"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.range_slider'),
    type: "range",
    min: "150",
    max: "600",
    step: "50",
    value: adventureImageSize,
    onChange: e => setAdventureImageSize(Number(e.target.value)),
    className: "w-16 h-1 bg-yellow-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-lg overflow-hidden bg-slate-100 border border-slate-400 shadow-inner relative group transition-all duration-300",
    style: {
      minHeight: '200px'
    }
  }, adventureState.sceneImage ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: adventureState.sceneImage,
    alt: t('adventure.alt_scene'),
    style: {
      height: `${adventureImageSize}px`
    },
    className: "w-full object-cover animate-in fade-in duration-500",
    decoding: "async"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 10,
    className: "inline mr-1"
  }), " ", t('adventure.nano_badge'))) : /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center text-slate-600 flex-col gap-2"
  }, adventureState.isImageLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 24,
    className: "animate-pulse"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium animate-pulse"
  }, t('adventure.generating_scene'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 24,
    className: "opacity-20"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold opacity-50"
  }, t('adventure.no_image'))))), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm text-slate-800 font-medium font-serif leading-relaxed max-w-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    const paragraphs = adventureState.currentScene.text.split(/\n{2,}/);
    let sentenceCounter = 0;
    return paragraphs.map((para, pIdx) => {
      const sentences = splitTextToSentences(para);
      if (sentences.length === 0) return null;
      return /*#__PURE__*/React.createElement("p", {
        key: pIdx,
        className: "mb-4 leading-relaxed"
      }, sentences.map((s, sIdx) => {
        const currentGlobalIdx = sentenceCounter;
        sentenceCounter++;
        const isActive = playbackState.currentIdx === currentGlobalIdx && playingContentId === 'adventure-active';
        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
        const isHeader = s.trim().startsWith('#') || isHtmlHeader;
        const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: isActive ? `sentence-${currentGlobalIdx}` : undefined,
          className: `transition-colors duration-300 rounded px-1 py-0.5 ${isActive ? 'bg-yellow-200 text-black shadow-sm' : 'cursor-pointer hover:bg-yellow-100'} ${isHeader ? 'font-bold block text-lg mt-2' : ''}`,
          onClick: e => {
            e.stopPropagation();
            handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
          },
          title: t('adventure.read_aloud_title')
        }, formatInteractiveText(cleanText), " ");
      }));
    });
  })())))), adventureState.isGameOver && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-8 gap-4"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border border-green-200 flex items-center gap-2 shadow-sm animate-in zoom-in duration-500"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 18
  }), " ", t('adventure.game_over')), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-600 font-bold"
  }, t('adventure.final_level'), ": ", adventureState.level), adventureState.xp >= studentProjectSettings.adventureMinXP ? /*#__PURE__*/React.createElement("button", {
    onClick: handleSetShowStorybookExportModalToTrue,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all animate-in slide-in-from-bottom-4",
    title: t('adventure.storybook'),
    "aria-label": t('adventure.storybook')
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(BookOpen, {
    size: 20
  }), isProcessing ? t('adventure.storybook_writing') : t('adventure.storybook')) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold border-2 border-slate-200 shadow-inner animate-in slide-in-from-bottom-4 cursor-not-allowed opacity-80"
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, t('adventure.storybook_locked', {
    needed: studentProjectSettings.adventureMinXP - adventureState.xp
  }))))) : /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl group select-none relative"
  }, adventureState.sceneImage ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: adventureState.sceneImage,
    className: `absolute inset-0 w-full h-full ${immersiveHideUI ? 'object-contain' : 'object-cover'} transition-opacity duration-700 animate-ken-burns`,
    alt: adventureState.currentScene?.text || "Adventure Scene"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-slate-900 flex items-center justify-center flex-col gap-4 text-slate-600"
  }, adventureState.isImageLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 48,
    className: "animate-spin text-indigo-500"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold animate-pulse"
  }, t('adventure.generating_scene'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 48,
    className: "opacity-20"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold opacity-50"
  }, t('adventure.no_image')))), theme !== 'contrast' && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-4 left-4 right-4 flex justify-between items-start z-20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-black/60 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold w-fit shadow-sm"
  }, t('common.level_abbrev'), " ", adventureState.level), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-amber-600/80 to-amber-800/80 backdrop-blur-md text-amber-100 border border-amber-400/50 px-3 py-1 rounded-full text-[11px] font-bold w-fit shadow-lg flex items-center gap-1.5 animate-pulse"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFDB\uFE0F"), " ", t('adventure.system_simulation')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 pr-3 shadow-sm",
    title: adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: adventureState.energy
    }) : t('adventure.tooltips.energy', {
      value: adventureState.energy
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: `p-1 rounded-full ${adventureInputMode === 'system' ? 'bg-amber-500/20' : 'bg-yellow-500/20'}`
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 12,
    className: `fill-current ${adventureInputMode === 'system' ? 'text-amber-400' : 'text-yellow-400'}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full transition-all duration-500 ${adventureInputMode === 'system' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-yellow-400 to-orange-500'}`,
    style: {
      width: `${adventureState.energy}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 pr-3 shadow-sm",
    title: t('adventure.tooltips.xp', {
      current: adventureState.xp,
      next: adventureState.xpToNextLevel
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-500/20 p-1 rounded-full"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 12,
    className: "text-indigo-600 fill-current"
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500",
    style: {
      width: `${Math.min(100, adventureState.xp / adventureState.xpToNextLevel * 100)}%`
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-end gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    "data-help-key": "adventure_immersive_autoread",
    onClick: () => {
      const newState = !adventureAutoRead;
      setAdventureAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `backdrop-blur-md border p-2 rounded-full transition-all shadow-sm ${adventureAutoRead ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`,
    title: adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip')
  }, adventureAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 16,
    className: "fill-current"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.hide'),
    "data-help-key": "adventure_immersive_toggle_ui",
    onClick: handleToggleImmersiveHideUI,
    className: `backdrop-blur-md border p-2 rounded-full transition-all shadow-sm ${immersiveHideUI ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`,
    title: immersiveHideUI ? t('adventure.show_ui') : t('adventure.hide_ui')
  }, immersiveHideUI ? /*#__PURE__*/React.createElement(EyeOff, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Eye, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.minimize'),
    "data-help-key": "adventure_immersive_exit",
    onClick: handleExitAdventureImmersive,
    className: "bg-black/50 backdrop-blur-md text-white border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all shadow-sm",
    title: t('adventure.tooltips.exit_immersive')
  }, /*#__PURE__*/React.createElement(Minimize, {
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-black/50 backdrop-blur-md text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "\uD83D\uDCB0"), " ", adventureState.gold), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    "data-help-key": "adventure_immersive_inventory",
    onClick: e => {
      e.stopPropagation();
      setShowImmersiveInventory(!showImmersiveInventory);
    },
    className: `backdrop-blur-md border p-2 rounded-full transition-all shadow-sm ${showImmersiveInventory ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white border-white/20 hover:bg-white/20'}`,
    title: t('adventure.inventory')
  }, /*#__PURE__*/React.createElement(Backpack, {
    size: 16
  })), showImmersiveInventory && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full right-0 mt-2 w-56 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-2 shadow-xl z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2"
  }, adventureInputMode === 'system' && enableFactionResources && /*#__PURE__*/React.createElement("div", {
    className: "border-b border-amber-500/30 pb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCA"), " ", t('adventure.system_state')), (adventureState.systemResources || []).length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1"
  }, adventureState.systemResources.map((resource, idx) => /*#__PURE__*/React.createElement("div", {
    key: `${resource.name}-${idx}`,
    className: "bg-gradient-to-r from-amber-900/40 to-amber-800/20 border border-amber-600/30 rounded-lg px-2 py-1 flex items-center gap-1.5 hover:border-amber-400/50 transition-all cursor-default",
    title: `${resource.name}: ${resource.quantity}${resource.unit || ''} (${resource.type || 'strategic'})`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, resource.icon || '📊'), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col leading-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-amber-200/80 truncate max-w-[60px]"
  }, resource.name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-300 font-bold"
  }, resource.quantity, resource.unit && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-400/70 font-normal ml-0.5 text-[11px]"
  }, resource.unit)))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[11px] text-amber-200/50 py-1 italic"
  }, "No state variables yet")), /*#__PURE__*/React.createElement("div", null, adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDC"), " Policies & Agreements"), adventureState.inventory.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2"
  }, adventureState.inventory.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: e => {
      e.stopPropagation();
      setSelectedInventoryItem(item);
      setShowImmersiveInventory(false);
    },
    className: "group relative w-10 h-10 bg-white/10 rounded-lg border border-white/10 hover:bg-indigo-600 hover:border-indigo-400 flex items-center justify-center transition-all overflow-hidden",
    title: item.name
  }, item.image ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: item.image,
    alt: item.name,
    className: "w-full h-full object-contain p-1"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-white"
  }, item.icon || item.name.charAt(0))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[11px] text-white/50 py-2 italic"
  }, adventureInputMode === 'system' ? 'No policies enacted' : t('adventure.inventory_empty'))))))), !immersiveHideUI && /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 left-0 right-0 px-4 pb-2 z-30 flex flex-col justify-end"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-black/70 backdrop-blur-md border-t-2 border-white/20 p-6 rounded-2xl shadow-lg relative min-h-[200px] flex flex-col justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-5 left-1/2 -translate-x-1/2 z-40"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.read'),
    "data-help-key": "adventure_choice_toggle",
    onClick: handleToggleImmersiveShowChoices,
    className: "bg-indigo-600 text-white text-xs font-bold px-6 py-2 rounded-full border-2 border-white/20 shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-2"
  }, immersiveShowChoices ? /*#__PURE__*/React.createElement(BookOpen, {
    size: 14
  }) : /*#__PURE__*/React.createElement(MousePointerClick, {
    size: 14
  }), immersiveShowChoices ? t('adventure.return_to_story') : t('adventure.make_a_choice'))), immersiveShowChoices ? /*#__PURE__*/React.createElement("div", {
    className: "animate-in fade-in slide-in-from-bottom-4 duration-300"
  }, failedAdventureAction ? /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-red-900/90 border-2 border-red-500 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-500 p-3 rounded-full mb-3 text-white"
  }, /*#__PURE__*/React.createElement(WifiOff, {
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-white mb-1"
  }, t('adventure.interrupted_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-red-200 text-sm mb-4 max-w-xs"
  }, t('adventure.interrupted_desc')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.retry_adventure_turn'),
    onClick: handleRetryAdventureTurn,
    className: "flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 border border-red-400"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18
  }), " ", t('adventure.retry_action'))) : adventureState.currentScene && (adventureFreeResponseEnabled ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('adventure.aria_free_response') || 'Type your adventure action',
    "data-help-key": "adventure_input_field",
    value: adventureTextInput,
    onChange: e => setAdventureTextInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAdventureTextSubmit();
      }
    },
    placeholder: t('adventure.action_placeholder_short'),
    className: "w-full bg-black/50 text-white border border-white/30 rounded-xl p-3 focus:border-white focus:ring-2 focus:ring-white/20 outline-none resize-none h-24 text-sm font-medium placeholder:text-white/50 backdrop-blur-sm",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "adventure_input_send",
    onClick: () => handleAdventureTextSubmit(),
    disabled: !adventureTextInput.trim(),
    className: "w-full bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white text-white p-3 rounded-xl font-bold transition-all active:scale-95 backdrop-blur-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(Send, {
    size: 16
  }), " ", t('adventure.send_action'))) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, (() => {
    const mainTextParagraphs = adventureState.currentScene.text.split(/\n{2,}/);
    const isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    const textSentenceCount = mainTextParagraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p)).length;
    return adventureState.currentScene.options.map((opt, idx) => {
      const isDemocracy = sessionData?.democracy?.isActive;
      const votes = isDemocracy && sessionData?.democracy?.votes ? sessionData.democracy.votes : {};
      const voteCount = Object.values(votes).filter(v => String(v).trim() === String(opt).trim()).length;
      const totalVotes = Object.keys(votes).length;
      const percent = totalVotes > 0 ? Math.round(voteCount / totalVotes * 100) : 0;
      const isReadingThisOption = isPlaying && playingContentId === 'adventure-active' && playbackState.currentIdx === textSentenceCount + idx;
      return /*#__PURE__*/React.createElement("button", {
        key: idx,
        "data-help-key": "adventure_choice_btn",
        onClick: () => handleAdventureChoice(opt),
        disabled: adventureState.isLoading,
        className: `bg-white/10 hover:bg-white/20 border text-left p-4 rounded-xl text-white text-sm font-bold transition-all active:scale-95 backdrop-blur-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed
                                                                ${isReadingThisOption ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-white/20 shadow-lg scale-[1.02] z-10' : 'border-white/30 hover:border-white'}`
      }, isDemocracy && voteCount > 0 && /*#__PURE__*/React.createElement("div", {
        className: "absolute left-0 top-0 bottom-0 bg-indigo-500/30 transition-all duration-500",
        style: {
          width: `${percent}%`
        }
      }), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between relative z-10 w-full"
      }, /*#__PURE__*/React.createElement("span", {
        className: "flex items-center gap-3 flex-grow"
      }, /*#__PURE__*/React.createElement("span", {
        className: `bg-white/20 px-2.5 py-1 rounded text-xs opacity-70 group-hover:bg-white group-hover:text-black transition-colors ${isReadingThisOption ? 'bg-yellow-400 text-black opacity-100' : ''}`
      }, idx + 1), /*#__PURE__*/React.createElement("span", {
        className: "text-left"
      }, typeof opt === 'object' && opt?.action ? opt.action : opt)), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2"
      }, typeof opt === 'object' && opt?.audio && /*#__PURE__*/React.createElement("button", {
        "aria-label": t('common.volume'),
        onClick: e => {
          e.stopPropagation();
          const audio = new Audio(opt.audio);
          audio.play();
        },
        className: "p-1.5 rounded-full bg-white/10 hover:bg-white/30 text-white/70 hover:text-white transition-colors",
        title: t('common.listen')
      }, /*#__PURE__*/React.createElement(Volume2, {
        size: 16
      })), isDemocracy && /*#__PURE__*/React.createElement("span", {
        className: `text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${voteCount > 0 ? 'bg-indigo-500 text-white shadow-sm' : 'opacity-40'}`
      }, t('adventure.vote_status', {
        count: voteCount,
        percent: percent
      })))));
    });
  })()))) : /*#__PURE__*/React.createElement("div", {
    className: "animate-in fade-in slide-in-from-bottom-4 duration-300"
  }, adventureState.pendingChoice && adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 animate-in slide-in-from-bottom-2 duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-900/80 backdrop-blur-sm border border-amber-500/50 rounded-xl p-4 shadow-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300 font-bold text-xs uppercase tracking-wider"
  }, "\u2694\uFE0F ", t('adventure.your_choice') || 'Your Choice')), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-100 text-sm font-medium italic leading-relaxed"
  }, "\"", adventureState.pendingChoice, "\""), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-2 h-2 bg-amber-400 rounded-full animate-pulse"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-400/80 text-xs animate-pulse"
  }, t('adventure.story_unfolds') || '✨ The story unfolds...')))), (() => {
    const lastFeedback = adventureState.history.slice().reverse().find(h => h && h.type === 'feedback');
    if (lastFeedback) {
      return /*#__PURE__*/React.createElement("div", {
        className: "text-yellow-300 text-sm mb-3 italic font-medium border-b border-white/10 pb-2"
      }, renderFormattedText(lastFeedback.text, false, true));
    }
    return null;
  })(), /*#__PURE__*/React.createElement("div", {
    className: "text-lg md:text-xl text-slate-100 font-medium leading-relaxed font-serif text-shadow-sm min-h-[80px]"
  }, adventureState.currentScene && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    const paragraphs = adventureState.currentScene.text.split(/\n{2,}/);
    let sentenceCounter = 0;
    return paragraphs.map((para, pIdx) => {
      const sentences = splitTextToSentences(para);
      if (sentences.length === 0) return null;
      return /*#__PURE__*/React.createElement("p", {
        key: pIdx,
        className: "mb-4 leading-relaxed"
      }, sentences.map((s, sIdx) => {
        const currentGlobalIdx = sentenceCounter;
        sentenceCounter++;
        const isActive = playbackState.currentIdx === currentGlobalIdx && playingContentId === 'adventure-active';
        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
        const isHeader = s.trim().startsWith('#') || isHtmlHeader;
        const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: isActive ? `sentence-${currentGlobalIdx}` : undefined,
          className: `transition-colors duration-300 rounded px-1 py-0.5 ${isActive ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-400/50' : 'cursor-pointer hover:bg-white/10'} ${isHeader ? 'font-bold block text-2xl mt-2 text-yellow-400' : ''}`,
          onClick: e => {
            e.stopPropagation();
            handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
          },
          title: t('common.click_read_aloud')
        }, formatInteractiveText(cleanText.replace(/\*\*([^*]+)\*\*/g, '$1'), false, true), " ");
      }));
    });
  })())))))), !adventureState.isImmersiveMode && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200 shrink-0"
  }, adventureState.currentScene && !adventureState.isGameOver ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, adventureInputMode === 'debate' && adventureState.debatePhase === 'setup' && /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-2 animate-in slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-teal-200 shadow-sm flex items-center justify-center gap-2 w-fit mx-auto"
  }, /*#__PURE__*/React.createElement(Scale, {
    size: 12
  }), " ", t('adventure.debate_stance'))), failedAdventureAction ? /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-red-50 border-2 border-red-200 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-100 p-3 rounded-full mb-3 text-red-500"
  }, /*#__PURE__*/React.createElement(WifiOff, {
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-red-900 mb-1"
  }, t('adventure.interrupted_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-red-700/80 text-sm mb-4 max-w-xs"
  }, t('adventure.interrupted_desc')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.retry_adventure_turn'),
    onClick: handleRetryAdventureTurn,
    className: "flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18
  }), " ", t('adventure.retry_action'))) : isEditingOptions ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mb-4 animate-in fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider"
  }, t('adventure.editing_header')), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-indigo-600 italic"
  }, t('adventure.editing_subtext'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, editingOptionsBuffer.map((opt, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_opt'),
    type: "text",
    value: opt,
    onChange: e => handleOptionBufferChange(idx, e.target.value),
    className: "flex-grow p-3 rounded-xl border-2 border-indigo-600 text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none",
    placeholder: t('adventure.option_placeholder', {
      n: idx + 1
    })
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    onClick: () => handleRemoveOptionSlot(idx),
    className: "p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100",
    title: t('adventure.tooltips.remove_option')
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.add'),
    onClick: handleAddOptionSlot,
    className: "p-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-600 font-bold text-sm transition-all flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 16
  }), " ", t('adventure.add_option'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-4 pt-3 border-t border-indigo-100"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.connect'),
    onClick: handleBroadcastOptions,
    className: "flex-grow bg-green-700 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95"
  }, /*#__PURE__*/React.createElement(Wifi, {
    size: 18
  }), " ", t('adventure.broadcast')), /*#__PURE__*/React.createElement("button", {
    onClick: handleSetIsEditingOptionsToFalse,
    className: "px-6 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-400 hover:bg-slate-50 transition-all"
  }, t('common.cancel')))) : !adventureFreeResponseEnabled || adventureInputMode === 'debate' && adventureState.debatePhase === 'setup' ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, (() => {
    const mainTextParagraphs = adventureState.currentScene.text.split(/\n{2,}/);
    const isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    const textSentenceCount = mainTextParagraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p)).length;
    return adventureState.currentScene.options.map((opt, idx) => {
      const isDebateSetup = adventureInputMode === 'debate' && adventureState.debatePhase === 'setup';
      const isReadingThisOption = isPlaying && playingContentId === 'adventure-active' && playbackState.currentIdx === textSentenceCount + idx;
      return /*#__PURE__*/React.createElement("button", {
        key: idx,
        "data-help-key": "adventure_choice_btn",
        onClick: () => handleAdventureChoice(opt),
        className: `p-3 rounded-xl border-2 font-bold text-sm transition-all text-left flex items-center gap-3 group shadow-sm hover:shadow-md relative overflow-hidden
                                                                ${isDebateSetup ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-600 hover:text-white hover:border-teal-600' : 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}
                                                                ${isReadingThisOption ? 'ring-4 ring-yellow-400 bg-yellow-100 border-yellow-400 text-indigo-900 scale-[1.02] z-10' : ''}
                                                            `
      }, /*#__PURE__*/React.createElement("span", {
        className: `w-6 h-6 rounded-full flex items-center justify-center text-xs border shrink-0 transition-colors z-10
                                                                ${isReadingThisOption ? 'bg-yellow-400 text-indigo-900 border-yellow-600' : isDebateSetup ? 'bg-white text-teal-700 border-teal-200 group-hover:border-transparent' : 'bg-white text-indigo-600 border-indigo-200 group-hover:border-transparent'}`
      }, isDebateSetup ? /*#__PURE__*/React.createElement(Scale, {
        size: 12
      }) : idx + 1), /*#__PURE__*/React.createElement("span", {
        className: "z-10"
      }, typeof opt === 'object' && opt?.action ? opt.action : opt), /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
      }));
    });
  })()) : /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 animate-in fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.voice_input'),
    type: "button",
    onClick: () => {
      const newState = !isDictationMode;
      setIsDictationMode(newState);
      if (newState && adventureInputRef.current) {
        setTimeout(() => adventureInputRef.current.focus(), 100);
      }
    },
    className: `p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 min-w-[50px] ${isDictationMode ? 'bg-red-50 border-red-400 text-red-500 animate-pulse' : 'bg-white border-indigo-100 text-slate-600 hover:text-indigo-500 hover:border-indigo-300'}`,
    title: isDictationMode ? t('adventure.tooltips.dictation_stop') : t('adventure.tooltips.dictation_start')
  }, isDictationMode ? /*#__PURE__*/React.createElement(Mic, {
    size: 20
  }) : /*#__PURE__*/React.createElement(MicOff, {
    size: 20
  })), /*#__PURE__*/React.createElement("textarea", {
    ref: adventureInputRef,
    "data-help-key": "adventure_input_field",
    value: adventureTextInput,
    onChange: e => setAdventureTextInput(e.target.value),
    placeholder: adventureInputMode === 'debate' ? t('adventure.placeholder_debate') : t('adventure.placeholder_action'),
    "aria-label": adventureInputMode === 'debate' ? t('adventure.aria_debate') : t('adventure.aria_action'),
    className: "flex-grow p-3 text-sm border border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none resize-none h-20 bg-purple-50 text-purple-900 placeholder:text-purple-300 transition-shadow duration-300",
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAdventureTextSubmit();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "adventure_input_send",
    onClick: () => handleAdventureTextSubmit(),
    disabled: !adventureTextInput.trim(),
    className: "bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1 min-w-[80px]"
  }, /*#__PURE__*/React.createElement(Send, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px]"
  }, t('adventure.act_button')))), adventureState.canStartSequel && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"
  }, t('adventure.sequel_prompt')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_sequel'),
    onClick: handleStartSequel,
    className: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-3 border-2 border-white/20"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20,
    className: "text-yellow-300 fill-current"
  }), t('adventure.start_sequel')))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-xs text-slate-600 italic"
  }, adventureState.isGameOver ? t('adventure.status.reset_prompt') : t('adventure.status.waiting')))), selectedInventoryItem && /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === 'Escape') e.currentTarget.click();
    },
    className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200",
    onClick: handleSetSelectedInventoryItemToNull
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative border-4 border-indigo-200 transition-all animate-in zoom-in-95",
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSetSelectedInventoryItemToNull,
    className: "absolute top-3 right-3 text-slate-600 hover:text-slate-600 bg-slate-100 rounded-full p-1 transition-colors",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-24 bg-indigo-50 rounded-xl border-2 border-indigo-100 flex items-center justify-center mb-4 shadow-inner relative overflow-hidden group"
  }, selectedInventoryItem.image ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: selectedInventoryItem.image,
    alt: selectedInventoryItem.name,
    className: "w-full h-full object-contain pixelated",
    style: STYLE_IMAGE_PIXELATED
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-4xl"
  }, selectedInventoryItem.icon || "📦"), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-black text-indigo-900 mb-1"
  }, selectedInventoryItem.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full mb-3 border border-indigo-200"
  }, t(`adventure.effects.${selectedInventoryItem.effectType}`) || selectedInventoryItem.effectType || "Consumable"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 mb-6 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 w-full"
  }, selectedInventoryItem.description || t('adventure.inventory_fallback_desc')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 w-full"
  }, selectedInventoryItem.effectType === 'key_item' ? /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.locked'),
    disabled: true,
    className: "flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl border-2 border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 16
  }), " ", t('adventure.key_item_btn')) : /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.use_item'),
    onClick: handleUseItem,
    className: "flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 16,
    className: "text-yellow-400 fill-current"
  }), " ", t('adventure.use_item'))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AdventureView = AdventureView;
  window.AlloModules.ViewAdventureModule = true;
})();
