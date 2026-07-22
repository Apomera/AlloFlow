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

  function useAdventureDialogFocus(isOpen, dialogRef, onClose) {
  var closeHandlerRef = React.useRef(onClose);
  closeHandlerRef.current = onClose;
  React.useEffect(function () {
    if (!isOpen) return undefined;
    var dialog = dialogRef.current;
    if (!dialog) return undefined;
    var previousFocus = document.activeElement;
    var getFocusable = function () {
      return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    };
    (getFocusable()[0] || dialog).focus();
    var onKeyDown = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHandlerRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return function () {
      dialog.removeEventListener('keydown', onKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [isOpen, dialogRef]);
}
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
  var prewarmAdventureAudio = props.prewarmAdventureAudio; // scene TTS pre-warm (2026-07-16)
  var handleAdventureHint = props.handleAdventureHint; // once-per-scene free-response Strategy Hint
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
  var ledgerDialogRef = React.useRef(null);
  var inventoryDialogRef = React.useRef(null);
  useAdventureDialogFocus(showLedger, ledgerDialogRef, handleSetShowLedgerToFalse);
  useAdventureDialogFocus(!!selectedInventoryItem, inventoryDialogRef, handleSetSelectedInventoryItemToNull);
  var xpMax = Math.max(1, Number(adventureState.xpToNextLevel) || 1);
  var xpValue = Math.max(0, Math.min(xpMax, Number(adventureState.xp) || 0));
  var xpProgressPercent = Math.max(0, Math.min(100, xpValue / xpMax * 100));
  var energyValue = Math.max(0, Math.min(100, Number(adventureState.energy) || 0));
  var debateMomentumValue = Math.max(0, Math.min(100, Number(adventureState.debateMomentum) || 0));
  var renderStrategyHintCard = function (isDark) {
    var hint = adventureState.currentHint;
    if (!hint || hint.turn !== adventureState.turnCount) return null;
    var notice = hint.notice || hint.text;
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      className: isDark ? 'p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-50 text-sm backdrop-blur-sm' : 'p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm'
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 font-black mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, '\u{1F4A1}'), /*#__PURE__*/React.createElement("span", null, t('adventure.hint_card_title') || 'Strategy Hint')), hint.loading ? /*#__PURE__*/React.createElement("div", null, t('adventure.hint_loading') || 'Building a strategy hint...') : /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, notice && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-black uppercase tracking-wide text-[10px] mr-2"
    }, t('adventure.hint_notice_label') || 'Notice'), /*#__PURE__*/React.createElement("span", null, notice)), hint.connect && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-black uppercase tracking-wide text-[10px] mr-2"
    }, t('adventure.hint_connect_label') || 'Connect'), /*#__PURE__*/React.createElement("span", null, hint.connect)), hint.tryStep && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-black uppercase tracking-wide text-[10px] mr-2"
    }, t('adventure.hint_try_label') || 'Try'), /*#__PURE__*/React.createElement("span", null, hint.tryStep)), hint.starter && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setAdventureTextInput(hint.starter + ' '),
      className: isDark ? 'mt-1 px-2 py-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-50 text-xs font-bold hover:bg-amber-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300' : 'mt-1 px-2 py-1 rounded-lg bg-amber-100 border border-amber-400 text-amber-950 text-xs font-bold hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700',
      title: t('adventure.hint_use_starter') || 'Use this sentence starter'
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, '\u21B3', " "), "\"", hint.starter, "\""), /*#__PURE__*/React.createElement("div", {
      className: isDark ? 'text-[11px] text-amber-100/80 italic' : 'text-[11px] text-amber-800 italic'
    }, t('adventure.hint_footer') || 'The next move is still yours.')));
  };
  var renderStrategyHintButton = function (isDark) {
    if (!handleAdventureHint) return null;
    var hint = adventureState.currentHint;
    var hintLoading = !!(hint && hint.turn === adventureState.turnCount && hint.loading);
    var hintUsed = adventureState.hintUsedTurn === adventureState.turnCount;
    return /*#__PURE__*/React.createElement("div", {
      className: isDark ? 'w-full' : 'self-start'
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleAdventureHint(),
      disabled: adventureState.isLoading || hintLoading || hintUsed,
      className: isDark ? 'min-h-11 w-full bg-transparent border border-amber-400/40 text-amber-200 p-2 rounded-xl text-xs font-bold hover:bg-amber-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black' : 'min-h-11 px-3 py-2 rounded-xl border border-amber-400 text-amber-800 text-xs font-bold hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2',
      title: t('adventure.hint_button_title') || 'Get one grounded clue and a response strategy'
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, '\u{1F4A1}', " "), hintUsed ? t('adventure.hint_used') || 'Clue used this scene' : t('adventure.hint_button') || 'Give me a clue'), !hintUsed && /*#__PURE__*/React.createElement("div", {
      className: isDark ? 'mt-1 text-center text-[10px] text-amber-100/70' : 'mt-1 text-[10px] text-slate-600'
    }, t('adventure.hint_button_helper') || 'One clue per scene. You still decide what happens.'));
  };
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
    role: "presentation",
    className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none",
    onClick: handleSetShowLedgerToFalse
  }, /*#__PURE__*/React.createElement("div", {
    ref: ledgerDialogRef,
    tabIndex: -1,
    className: "bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[calc(100vh-1rem)] overflow-y-auto relative border-4 border-indigo-200 transition-all animate-in zoom-in-95 motion-reduce:animate-none",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "adventure-ledger-title",
    "aria-describedby": "adventure-ledger-subtitle",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetShowLedgerToFalse,
    className: "absolute top-2 right-2 sm:top-3 sm:right-3 min-w-11 min-h-11 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 24,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h3", {
    id: "adventure-ledger-title",
    className: "text-xl font-black text-indigo-900"
  }, t('adventure.ledger_title')), /*#__PURE__*/React.createElement("p", {
    id: "adventure-ledger-subtitle",
    className: "text-xs text-slate-700"
  }, t('adventure.ledger_subtitle'))), /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-label": t('adventure.ledger_title'),
    tabIndex: 0,
    className: "bg-slate-50 p-4 rounded-xl border border-slate-400 text-sm text-slate-700 leading-relaxed max-h-[50vh] overflow-y-auto custom-scrollbar whitespace-pre-line font-serif focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, adventureState.narrativeLedger || t('adventure.ledger_empty')), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.storybook'),
    onClick: () => {
      setShowLedger(false);
      setShowStorybookExportModal(true);
    },
    disabled: isProcessing || adventureState.history.length === 0,
    "aria-busy": isProcessing,
    className: "min-h-11 w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Download, {
    size: 18,
    "aria-hidden": "true"
  }), t('adventure.storybook')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetShowLedgerToFalse,
    className: "min-h-11 w-full px-6 py-2 text-slate-700 font-bold hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 rounded-xl"
  }, t('common.close'))))), /*#__PURE__*/React.createElement("div", {
    className: `bg-indigo-900 p-4 rounded-lg border border-indigo-800 flex flex-col md:flex-row justify-between items-center shadow-md shrink-0 gap-4 relative overflow-x-auto ${adventureState.isImmersiveMode ? 'hidden' : ''}`
  }, adventureEffects.levelUp && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]"
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null)), /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-400 text-indigo-900 px-8 py-4 rounded-2xl border-4 border-white shadow-2xl font-black text-2xl animate-in zoom-in duration-300 rotate-3 motion-reduce:animate-none motion-reduce:transform-none",
    role: "status",
    "aria-live": "assertive",
    "aria-atomic": "true"
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
    className: "text-yellow-300",
    "aria-hidden": "true"
  }), " ", t('adventure.title')), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-400/50 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 animate-pulse motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🏛️"), " ", t('adventure.system_simulation')), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-800 px-3 py-1 rounded-full text-xs font-bold border border-indigo-600 flex items-center gap-2 relative shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-300"
  }, t('common.level_abbrev') || 'Lvl', " ", adventureState.level), /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-2 bg-indigo-950 rounded-full overflow-hidden",
    role: "progressbar",
    "aria-label": t('common.xp') || 'XP',
    "aria-valuemin": 0,
    "aria-valuemax": xpMax,
    "aria-valuenow": xpValue,
    "aria-valuetext": t('adventure.tooltips.xp', {
      current: xpValue,
      next: xpMax
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ease-out motion-reduce:transition-none",
    "aria-hidden": "true",
    style: {
      width: xpProgressPercent + '%'
    }
  })), adventureEffects.xp !== null && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: `absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-300 font-black text-lg animate-[ping_0.8s_ease-out_reverse] motion-reduce:animate-none motion-reduce:transform-none pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.xp < 0 ? 'text-red-400' : 'text-yellow-300'}`
  }, adventureEffects.xp > 0 ? '+' : '', adventureEffects.xp, " ", t('common.xp') || 'XP')), /*#__PURE__*/React.createElement("div", {
    className: `px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 relative shrink-0 transition-all duration-200 ${adventureInputMode === 'system' ? 'bg-amber-900/60 border-amber-600' : adventureEffects.energy < 0 ? 'animate-shake border-red-500 bg-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-indigo-800 border-indigo-600'}`,
    title: adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    })
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 12,
    "aria-hidden": "true",
    className: `fill-current transition-colors duration-200 motion-reduce:transition-none ${adventureInputMode === 'system' ? 'text-amber-400' : adventureEffects.energy < 0 ? 'text-red-400' : 'text-yellow-400'}`
  }), /*#__PURE__*/React.createElement("span", {
    className: `w-6 text-right transition-colors duration-200 ${adventureInputMode === 'system' ? 'text-amber-300' : adventureEffects.energy < 0 ? 'text-red-300' : 'text-yellow-400'}`
  }, /*#__PURE__*/React.createElement(AnimatedNumber, {
    value: energyValue
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-2 bg-indigo-950 rounded-full overflow-hidden relative",
    role: "progressbar",
    "aria-label": adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    }),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": energyValue
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `h-full transition-all duration-500 motion-reduce:transition-none ${adventureInputMode === 'system' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : adventureState.energy < 20 || adventureEffects.energy < 0 ? 'bg-red-500 animate-pulse motion-reduce:animate-none' : 'bg-yellow-400'}`,
    style: {
      width: energyValue + '%'
    }
  })), adventureEffects.energy !== null && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: `absolute -top-8 left-1/2 transform -translate-x-1/2 font-black text-lg animate-[ping_0.8s_ease-out_reverse] motion-reduce:animate-none motion-reduce:transform-none pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.energy > 0 ? 'text-green-400' : 'text-red-500'}`
  }, adventureEffects.energy > 0 ? '+' : '', adventureEffects.energy)), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-800 px-3 py-1 rounded-full text-xs font-bold border border-indigo-600 flex items-center gap-1.5 text-yellow-300 shadow-sm shrink-0",
    title: t('adventure.tooltips.gold', {
      value: adventureState.gold
    })
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "💰"), " ", adventureState.gold, adventureState.activeGoldBuffTurns > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] ml-1 bg-yellow-400 text-black px-1 rounded-full"
  }, adventureState.activeGoldBuffTurns)), (adventureState.stats?.conceptsFound || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-cyan-900/60 px-3 py-1 rounded-full text-xs font-bold border border-cyan-600 flex items-center gap-1.5 text-cyan-200 shadow-sm shrink-0",
    title: (t('adventure.mission_report.concepts_secured') || 'Concepts secured') + ': ' + adventureState.stats.conceptsFound.join(', '),
    "aria-label": (t('adventure.mission_report.concepts_secured') || 'Concepts secured') + ': ' + adventureState.stats.conceptsFound.join(', ')
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🔑"), " ", adventureState.stats.conceptsFound.length), /*#__PURE__*/React.createElement(InventoryGrid, {
    inventory: adventureState.inventory,
    onSelect: handleSelectInventoryItem
  }), adventureInputMode === 'system' && enableFactionResources && (adventureState.systemResources || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1 mt-1"
  }, adventureState.systemResources.slice(0, 5).map((resource, idx) => /*#__PURE__*/React.createElement("div", {
    key: `fr-${idx}`,
    className: "bg-amber-900/50 border border-amber-600/40 rounded px-1.5 py-0.5 flex items-center gap-1 text-[11px]",
    title: `${resource.name}: ${resource.quantity}${resource.unit || ''}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, resource.icon || '📦'), /*#__PURE__*/React.createElement("span", {
    className: "text-amber-200 font-bold"
  }, resource.quantity, resource.unit ? /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300/70 font-normal ml-0.5"
  }, resource.unit) : ''))), adventureState.systemResources.length > 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300/60 text-[11px]"
  }, "+", adventureState.systemResources.length - 5))), adventureInputMode === 'debate' && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-4 bg-slate-700 rounded-full border border-slate-600 overflow-hidden shadow-inner",
    role: "progressbar",
    "aria-label": t('adventure.debate_you') + ' / ' + t('adventure.debate_opponent'),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": debateMomentumValue,
    "aria-valuetext": t('adventure.debate_you') + ': ' + debateMomentumValue + '; ' + t('adventure.debate_opponent') + ': ' + (100 - debateMomentumValue)
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `h-full transition-all duration-500 ease-out motion-reduce:transition-none ${adventureState.debateMomentum > 60 ? 'bg-green-500' : adventureState.debateMomentum < 40 ? 'bg-red-500' : 'bg-yellow-500'}`,
    style: {
      width: debateMomentumValue + '%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 z-10",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center z-20 pointer-events-none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-black text-white drop-shadow-md tracking-wider"
  }, debateMomentumValue, "/100"))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-indigo-200 mt-1 px-1 uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement("span", null, t('adventure.debate_opponent')), /*#__PURE__*/React.createElement("span", null, t('adventure.debate_you')))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-indigo-200 mt-1"
  }, t('adventure.explore_hint'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 relative z-10 overflow-x-auto min-w-0 shrink-0",
    role: "group",
    "aria-label": t('adventure.title')
  }, isTeacherMode && adventureState.currentScene && !adventureState.isGameOver && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "adventure_edit_options",
    onClick: handleStartOptionEdit,
    disabled: isEditingOptions,
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${isEditingOptions ? 'bg-indigo-900 text-indigo-600 border-indigo-700 opacity-50 cursor-not-allowed' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white'}`,
    title: t('adventure.edit_options_tooltip'),
    "aria-label": t('adventure.edit_options_tooltip')
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 14,
    "aria-hidden": "true"
  }), " ", /*#__PURE__*/React.createElement("span", {
    className: "hidden xl:inline"
  }, t('adventure.edit_options_btn'))), activeSessionCode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "democracy_toggle",
    onClick: toggleDemocracyMode,
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${sessionData?.democracy?.isActive ? 'bg-teal-700 text-white border-teal-500 ring-2 ring-teal-400' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700'}`,
    title: t('adventure.tooltips.democracy_toggle'),
    "aria-label": t('adventure.tooltips.democracy_toggle'),
    "aria-pressed": !!sessionData?.democracy?.isActive
  }, sessionData?.democracy?.isActive ? /*#__PURE__*/React.createElement(Users, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(User, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden xl:inline"
  }, sessionData?.democracy?.isActive ? t('adventure.democracy_on') : t('adventure.democracy_off'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.ledger_tooltip'),
    onClick: handleSetShowLedgerToTrue,
    className: "min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white",
    title: t('adventure.ledger_tooltip')
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 14,
    className: "fill-current",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.log_button'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": adventureState.isImmersiveMode ? t('adventure.exit_immersive') : t('adventure.enter_immersive'),
    "aria-pressed": adventureState.isImmersiveMode,
    onClick: handleToggleAdventureImmersive,
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${adventureState.isImmersiveMode ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white'}`,
    title: adventureState.isImmersiveMode ? t('adventure.exit_immersive') : t('adventure.enter_immersive')
  }, /*#__PURE__*/React.createElement(Monitor, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, adventureState.isImmersiveMode ? t('adventure.view_standard') : t('adventure.view_immersive'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable'),
    "aria-pressed": adventureAutoRead,
    "data-help-key": "adventure_immersive_autoread",
    onClick: () => {
      const newState = !adventureAutoRead;
      setAdventureAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${adventureAutoRead ? 'bg-yellow-400 text-indigo-900 border-yellow-500 hover:bg-yellow-300' : 'bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700'}`,
    title: adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable')
  }, adventureAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 14,
    className: "fill-current animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.auto_read_status_label'), ": ", adventureAutoRead ? t('common.on') : t('common.off'))), !isZenMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.maximize_tooltip'),
    onClick: handleSetIsZenModeToTrue,
    className: "min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 bg-indigo-800 text-indigo-300 border-indigo-600 hover:bg-indigo-700 hover:text-white",
    title: t('adventure.maximize_tooltip')
  }, /*#__PURE__*/React.createElement(Maximize, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.view_button'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.start_new_adventure'),
    "data-help-key": "adventure_start_btn",
    onClick: handleStartAdventure,
    className: "min-w-11 min-h-11 flex items-center gap-2 bg-white/10 text-white border border-white/40 px-4 py-2 rounded-full text-xs font-bold hover:bg-white/20 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: adventureState.isLoading ? "animate-spin motion-reduce:animate-none" : "",
    "aria-hidden": "true"
  }), " ", t('adventure.restart')))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow bg-slate-100 rounded-xl border border-slate-400 shadow-inner overflow-hidden flex flex-col relative"
  }, !adventureState.isImmersiveMode ? /*#__PURE__*/React.createElement("div", {
    ref: adventureScrollRef,
    className: "flex-grow overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar"
  }, !adventureState.currentScene && adventureState.history.length === 0 && !adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "min-h-full flex flex-col items-center py-4 sm:py-10 animate-in fade-in zoom-in duration-300 motion-reduce:animate-none"
  }, hasSavedAdventure && !showNewGameSetup ? /*#__PURE__*/React.createElement("div", {
    className: "max-w-md w-full text-center space-y-6 my-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 sm:p-8 rounded-3xl shadow-xl border-4 border-indigo-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border-2 border-indigo-200"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 40,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800 mb-2"
  }, t('adventure.paused_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 mb-6 font-medium"
  }, t('adventure.paused_desc')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.resume'),
    "data-help-key": "adventure_resume_btn",
    onClick: handleResumeAdventure,
    className: "min-h-11 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-lg hover:scale-105 transition-all motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(History, {
    size: 20,
    "aria-hidden": "true"
  }), " ", t('adventure.resume'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.start_overwrite'),
    onClick: handleSetShowNewGameSetupToTrue,
    className: "min-h-11 text-slate-700 hover:text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors px-3 py-2 uppercase tracking-wider rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('adventure.start_overwrite'))) : /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-5xl bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden relative my-auto"
  }, hasSavedAdventure && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.back_to_resume'),
    onClick: handleSetShowNewGameSetupToFalse,
    className: "absolute top-2 left-2 sm:top-4 sm:left-4 min-w-11 min-h-11 text-white hover:bg-white/20 p-2 rounded-full transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600",
    title: t('adventure.back_to_resume')
  }, /*#__PURE__*/React.createElement(ArrowDown, {
    className: "rotate-90",
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-600 p-4 text-white flex justify-between items-center relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-grow text-center px-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl sm:text-2xl font-black uppercase tracking-wide sm:tracking-widest flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 24,
    "aria-hidden": "true"
  }), " ", t('adventure.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-white text-sm font-medium"
  }, t('adventure.setup_subtitle')))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-labelledby": "adventure-setup-core-heading",
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "adventure-setup-core-heading",
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2"
  }, t('adventure.settings.core')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "adventure-setup-input-mode",
    className: "block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between"
  }, t('adventure.interaction_mode'), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowModeSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("select", {
    id: "adventure-setup-input-mode",
    "data-help-key": "adventure_setup_input_mode",
    value: adventureInputMode,
    onChange: e => setAdventureInputMode(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowModeSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "min-h-11 w-full p-2 border border-slate-500 rounded-lg text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 transition-all"
  }, /*#__PURE__*/React.createElement("option", {
    value: "choice"
  }, t('adventure.mode_choice')), /*#__PURE__*/React.createElement("option", {
    value: "debate"
  }, t('adventure.mode_debate')), /*#__PURE__*/React.createElement("option", {
    value: "system"
  }, t('adventure.mode_system')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "adventure-setup-difficulty",
    className: "block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between"
  }, t('adventure.difficulty_label'), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowDifficultySwitch || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("select", {
    id: "adventure-setup-difficulty",
    "data-help-key": "adventure_setup_difficulty",
    value: adventureDifficulty,
    onChange: e => setAdventureDifficulty(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowDifficultySwitch || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "min-h-11 w-full p-2 border border-slate-500 rounded-lg text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 transition-all"
  }, /*#__PURE__*/React.createElement("option", {
    value: "Story"
  }, t('adventure.diff_story_option')), /*#__PURE__*/React.createElement("option", {
    value: "Normal"
  }, t('adventure.diff_normal_option')), /*#__PURE__*/React.createElement("option", {
    value: "Hard"
  }, t('adventure.diff_hard_option')), /*#__PURE__*/React.createElement("option", {
    value: "Hardcore"
  }, t('adventure.diff_hardcore_option')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "adventure-setup-language",
    className: "block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between"
  }, t('adventure.language_label'), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowLanguageSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("select", {
    id: "adventure-setup-language",
    "data-help-key": "adventure_setup_language",
    value: adventureLanguageMode,
    onChange: e => setAdventureLanguageMode(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowLanguageSwitch || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "min-h-11 w-full p-2 border border-slate-500 rounded-lg text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 transition-all"
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
    role: "group",
    "aria-labelledby": "adventure-setup-modifiers-heading",
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "adventure-setup-modifiers-heading",
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2"
  }, t('adventure.settings.modifiers')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: `min-h-11 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-indigo-700 focus-within:ring-offset-2 ${adventureFreeResponseEnabled ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && (studentProjectSettings.allowFreeResponse === false || studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_freeresponse",
    checked: adventureFreeResponseEnabled,
    onChange: e => setAdventureFreeResponseEnabled(e.target.checked),
    disabled: !isTeacherMode && (studentProjectSettings.allowFreeResponse === false || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "w-5 h-5 shrink-0 text-indigo-600 rounded focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.free_response_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-700"
  }, t('adventure.free_response_desc')))), /*#__PURE__*/React.createElement("label", {
    className: `min-h-11 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-indigo-700 focus-within:ring-offset-2 ${adventureChanceMode ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_chance",
    checked: adventureChanceMode,
    onChange: e => setAdventureChanceMode(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-5 h-5 shrink-0 text-indigo-600 rounded focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.chance_mode_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-700"
  }, t('adventure.chance_mode_desc')))), /*#__PURE__*/React.createElement("label", {
    className: `min-h-11 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-indigo-700 focus-within:ring-offset-2 ${isAdventureStoryMode ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_story",
    checked: isAdventureStoryMode,
    onChange: e => setIsAdventureStoryMode(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-5 h-5 shrink-0 text-indigo-600 rounded focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.story_mode_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-700"
  }, t('adventure.story_mode_desc')))), /*#__PURE__*/React.createElement("label", {
    className: `min-h-11 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-indigo-700 focus-within:ring-offset-2 ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_consistent_characters",
    checked: adventureConsistentCharacters,
    onChange: e => setAdventureConsistentCharacters(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-5 h-5 shrink-0 text-violet-600 rounded focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, "🎭 ", t('adventure.consistent_characters_label') || 'Consistent Characters'), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-700"
  }, t('adventure.consistent_characters_desc') || 'Persistent visual cast across scenes'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 p-2 rounded-lg border border-indigo-100 bg-indigo-50/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, "🎨 ", t('adventure.art_style_label') || 'Art Style'), /*#__PURE__*/React.createElement("select", {
    "aria-label": t('adventure.art_style_label') || 'Art style',
    value: adventureArtStyle,
    onChange: e => setAdventureArtStyle(e.target.value),
    disabled: !isTeacherMode && (studentProjectSettings.adventurePermissions?.allowVisualsToggle === false || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "mt-1 min-h-11 w-full text-xs px-2 py-2 border border-indigo-600 rounded-lg bg-white focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 focus:outline-none cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: "auto"
  }, "🎨 ", t('adventure.art_auto') || 'Auto (default)'), /*#__PURE__*/React.createElement("option", {
    value: "storybook"
  }, "📚 ", t('adventure.art_storybook') || 'Storybook'), /*#__PURE__*/React.createElement("option", {
    value: "pixel"
  }, "🎮 ", t('adventure.art_pixel') || 'Pixel Art'), /*#__PURE__*/React.createElement("option", {
    value: "cinematic"
  }, "🎬 ", t('adventure.art_cinematic') || 'Cinematic'), /*#__PURE__*/React.createElement("option", {
    value: "anime"
  }, "🎨 ", t('adventure.art_anime') || 'Anime'), /*#__PURE__*/React.createElement("option", {
    value: "crayon"
  }, "🖍️ ", t('adventure.art_crayon') || 'Hand-drawn'), /*#__PURE__*/React.createElement("option", {
    value: "custom"
  }, "✏️ ", t('adventure.art_custom') || 'Custom...')), adventureArtStyle === 'custom' && /*#__PURE__*/React.createElement("input", {
    type: "text",
    "aria-label": t('adventure.custom_art_style_placeholder') || 'Custom art style',
    value: adventureCustomArtStyle,
    onChange: e => setAdventureCustomArtStyle(e.target.value),
    placeholder: t('adventure.custom_art_style_placeholder') || 'Describe your art style...',
    disabled: !isTeacherMode && (studentProjectSettings.adventurePermissions?.allowVisualsToggle === false || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "mt-1 min-h-11 w-full text-xs px-2 py-2 border border-indigo-600 rounded-lg bg-white focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 focus:outline-none"
  }))), /*#__PURE__*/React.createElement("label", {
    className: `min-h-11 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-indigo-700 focus-within:ring-offset-2 ${useLowQualityVisuals ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && (studentProjectSettings.adventurePermissions?.allowVisualsToggle === false || studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "data-help-key": "adventure_setup_chk_lowqual",
    checked: useLowQualityVisuals,
    onChange: e => setUseLowQualityVisuals(e.target.checked),
    disabled: !isTeacherMode && (studentProjectSettings.adventurePermissions?.allowVisualsToggle === false || studentProjectSettings.adventurePermissions?.lockAllSettings),
    className: "w-5 h-5 shrink-0 text-indigo-600 rounded focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.low_quality_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-700"
  }, t('adventure.low_quality_desc')))), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("label", {
    className: `min-h-11 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-indigo-700 focus-within:ring-offset-2 ${enableFactionResources ? 'bg-amber-50 border-amber-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: enableFactionResources,
    onChange: e => setEnableFactionResources(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-5 h-5 shrink-0 text-amber-700 rounded focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-bold text-slate-700"
  }, t('adventure.system_state_label')), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-700"
  }, t('adventure.system_state_desc')))))), /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-labelledby": "adventure-setup-customization-heading",
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "adventure-setup-customization-heading",
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2"
  }, t('adventure.settings.customization')), /*#__PURE__*/React.createElement("div", {
    className: `bg-indigo-50 p-3 rounded-lg border border-indigo-100 ${!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings ? 'opacity-50 pointer-events-none' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "setupAutoClimax",
    className: "min-h-11 text-xs font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2 rounded-lg focus-within:ring-2 focus-within:ring-indigo-700 focus-within:ring-offset-2"
  }, /*#__PURE__*/React.createElement("input", {
    id: "setupAutoClimax",
    type: "checkbox",
    checked: adventureState.enableAutoClimax || false,
    onChange: e => handleSetEnableAutoClimax(e.target.checked),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-5 h-5 shrink-0 text-indigo-600 border-slate-400 rounded focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
  }), t('adventure.climax.enable_label'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "adventure-setup-climax-min-turns",
    className: "text-[11px] text-slate-700 font-bold uppercase"
  }, t('adventure.climax.min_rounds_label')), /*#__PURE__*/React.createElement("input", {
    id: "adventure-setup-climax-min-turns",
    type: "number",
    min: "3",
    max: "50",
    value: adventureState.climaxMinTurns || 20,
    onChange: e => handleSetClimaxMinTurns(e.target.value),
    disabled: !isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings,
    className: "w-16 min-h-11 text-xs border border-indigo-600 rounded p-2 text-center focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 outline-none font-bold text-indigo-900 bg-white"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mt-2 leading-snug"
  }, t('adventure.climax.setup_hint') || "Recommended: adds a final challenge that tests what the story taught. The Mission Debrief's Story Performance comes from how it goes — without it, adventures run in infinite mode.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "adventure-setup-custom-instructions",
    className: "block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, t('input.custom_instructions'), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-600 font-normal"
  }, t('common.optional'))), !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowCustomInstructions || studentProjectSettings.adventurePermissions?.lockAllSettings) && /*#__PURE__*/React.createElement(Lock, {
    size: 12,
    className: "text-slate-600",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("textarea", {
    id: "adventure-setup-custom-instructions",
    value: adventureCustomInstructions,
    onChange: e => setAdventureCustomInstructions(e.target.value),
    disabled: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowCustomInstructions || studentProjectSettings.adventurePermissions?.lockAllSettings),
    placeholder: !isTeacherMode && (!studentProjectSettings.adventurePermissions?.allowCustomInstructions || studentProjectSettings.adventurePermissions?.lockAllSettings) ? t('adventure.placeholder_locked') : t('adventure.placeholder_custom'),
    className: "w-full p-2 border border-slate-500 rounded-lg text-sm h-28 resize-y focus:border-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 focus:bg-white transition-all shadow-inner"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-slate-50 border-t border-slate-200 flex justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.start'),
    onClick: () => executeStartAdventure(),
    disabled: adventureState.isLoading,
    "aria-busy": adventureState.isLoading,
    className: "min-h-11 w-full md:w-auto px-8 sm:px-16 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all motion-reduce:transform-none flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20,
    className: "animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }), t('adventure.start'))))), adventureState.history.map((entry, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2 duration-500 ${entry.type === 'choice' ? 'flex justify-end' : 'flex justify-start'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: `max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${entry.type === 'choice' ? 'bg-indigo-600 text-white rounded-br-none' : entry.type === 'feedback' ? 'bg-green-50 border border-green-200 text-green-800 italic text-xs' : 'bg-white text-slate-800 border border-slate-400 rounded-bl-none font-serif'}`
  }, entry.type === 'choice' && /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1"
  }, t('adventure.you_chose')), entry.type === 'feedback' && /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 10
  }), " ", t('adventure.analysis_label')), renderFormattedText(entry.text, true, entry.type === 'choice')))), adventureState.pendingChoice && adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "flex justify-start animate-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[85%] bg-amber-50 p-4 rounded-2xl rounded-bl-none border border-amber-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 font-bold text-xs uppercase tracking-wider"
  }, "⚔️ ", t('adventure.your_choice') || 'Your Choice')), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-800 text-sm font-medium italic leading-relaxed"
  }, "\"", adventureState.pendingChoice, "\""), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-700 text-xs mt-2 animate-pulse motion-reduce:animate-none"
  }, adventureState.loadingStage || t('adventure.story_unfolds') || 'The story unfolds...'))), adventureState.isLoading && !adventureState.pendingChoice && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "flex justify-start animate-pulse motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-2xl rounded-bl-none border border-slate-400 flex items-center gap-2 text-slate-600 text-sm"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), " ", adventureState.loadingStage || t('adventure.status.loading_story'))), adventureState.currentScene && /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-labelledby": "adventure-current-scene-heading",
    className: "flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[90%] bg-white p-6 rounded-2xl rounded-bl-none border-l-4 border-l-yellow-400 shadow-md relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "adventure-current-scene-heading",
    className: "text-xs font-bold text-yellow-700 uppercase tracking-wider flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Flag, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('adventure.current_scene')), (adventureState.sceneImage || adventureState.sceneImagePreview) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100",
    title: t('common.adjust_image_size')
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14,
    className: "text-yellow-700",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.adjust_image_size'),
    "aria-valuetext": adventureImageSize + ' px',
    type: "range",
    min: "150",
    max: "600",
    step: "50",
    value: adventureImageSize,
    onChange: e => setAdventureImageSize(Number(e.target.value)),
    className: "w-24 h-11 bg-yellow-200 rounded-lg cursor-pointer accent-yellow-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-700 focus-visible:ring-offset-2"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-lg overflow-hidden bg-slate-100 border border-slate-400 shadow-inner relative group transition-all duration-300 motion-reduce:transition-none",
    style: {
      minHeight: adventureImageSize + 'px'
    }
  }, adventureState.sceneImage || adventureState.sceneImagePreview ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: adventureState.sceneImage || adventureState.sceneImagePreview,
    alt: "",
    style: {
      height: `${adventureImageSize}px`,
      filter: !adventureState.sceneImage && adventureState.sceneImagePreview ? 'blur(1.5px) saturate(0.9)' : 'none'
    },
    className: "w-full object-cover animate-in fade-in duration-500 transition-[filter,opacity] motion-reduce:animate-none motion-reduce:transition-none",
    decoding: "async"
  }), !adventureState.sceneImage && adventureState.sceneImagePreview && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "absolute left-3 bottom-3 bg-slate-950/80 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg backdrop-blur-sm"
  }, adventureState.imagePolishStage === 'matching' ? 'Matching your cast…' : 'Polishing scene details…'), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 10,
    className: "inline mr-1"
  }), " ", t('adventure.nano_badge'))) : /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "absolute inset-0 flex items-center justify-center text-slate-700 flex-col gap-2"
  }, adventureState.isImageLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 24,
    className: "animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium animate-pulse motion-reduce:animate-none"
  }, adventureState.loadingStage || t('adventure.generating_scene'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 24,
    className: "opacity-40",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold"
  }, t('adventure.no_image'))))), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm text-slate-800 font-medium font-serif leading-relaxed max-w-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4",
    onPointerEnter: () => {
      if (prewarmAdventureAudio && adventureState.currentScene) prewarmAdventureAudio(adventureState.currentScene.text, adventureState.currentScene.voices);
    }
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
        // Per-sentence read-aloud: the sentence TEXT is the control (click or
        // Enter/Space). The former inline speaker button (52c353dea) was removed
        // 2026-07-16 per Aaron — redundant with click-to-karaoke and visually
        // clunky — while keeping its keyboard/SR semantics on the span itself.
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: `sentence-${currentGlobalIdx}`,
          role: "button",
          tabIndex: 0,
          "aria-pressed": isActive,
          "aria-label": (t('adventure.read_aloud_title') || t('common.click_read_aloud') || 'Read aloud') + ': ' + cleanText.replace(/\*\*/g, '').trim(),
          title: t('adventure.read_aloud_title') || t('common.click_read_aloud'),
          onClick: e => {
            e.stopPropagation();
            handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
          },
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
            }
          },
          className: `transition-colors duration-300 motion-reduce:transition-none rounded px-1 py-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${isActive ? 'bg-yellow-200 text-black shadow-sm' : 'hover:bg-yellow-50'} ${isHeader ? 'font-bold block text-lg mt-2' : ''}`
        }, formatInteractiveText(cleanText), " ");
      }));
    });
  })())))), adventureState.isGameOver && (() => {
    // Defeat vs completion (2026-07-16): energy-death used to get the SAME
    // confetti + trophy as a victory — a failure celebrated. Defeat now gets
    // an honest (still kind) treatment; completions keep the party.
    const _isDefeat = (Number(adventureState.energy) || 0) <= 0 && !adventureState.canStartSequel;
    return /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-center justify-center py-8 gap-4"
    }, !_isDefeat && /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement(ConfettiExplosion, null)), _isDefeat ? /*#__PURE__*/React.createElement("div", {
      className: "bg-amber-100 text-amber-900 px-6 py-3 rounded-full font-bold border border-amber-300 flex items-center gap-2 shadow-sm animate-in zoom-in duration-500 motion-reduce:animate-none",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true"
    }, /*#__PURE__*/React.createElement(Zap, {
      size: 18,
      "aria-hidden": "true"
    }), " ", t('adventure.game_over_defeat') || 'Out of energy — the journey ends here. Every attempt teaches something!') : /*#__PURE__*/React.createElement("div", {
      className: "bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border border-green-200 flex items-center gap-2 shadow-sm animate-in zoom-in duration-500 motion-reduce:animate-none",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true"
    }, /*#__PURE__*/React.createElement(Trophy, {
      size: 18,
      "aria-hidden": "true"
    }), " ", t('adventure.game_over')), /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-slate-600 font-bold"
    }, t('adventure.final_level'), ": ", adventureState.level), adventureState.xp >= studentProjectSettings.adventureMinXP ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleSetShowStorybookExportModalToTrue,
      disabled: isProcessing,
      "aria-busy": isProcessing,
      className: "min-h-11 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all animate-in slide-in-from-bottom-4 motion-reduce:animate-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
      title: t('adventure.storybook'),
      "aria-label": t('adventure.storybook')
    }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 20,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(BookOpen, {
      size: 20,
      "aria-hidden": "true"
    }), isProcessing ? t('adventure.storybook_writing') : t('adventure.storybook')) : /*#__PURE__*/React.createElement("div", {
      className: "min-h-11 flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold border-2 border-slate-300 shadow-inner animate-in slide-in-from-bottom-4 motion-reduce:animate-none"
    }, /*#__PURE__*/React.createElement(Lock, {
      size: 18,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, t('adventure.storybook_locked', {
      needed: studentProjectSettings.adventureMinXP - adventureState.xp
    }))));
  })()) : /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl group select-none relative"
  }, adventureState.sceneImage || adventureState.sceneImagePreview ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: adventureState.sceneImage || adventureState.sceneImagePreview,
    className: `absolute inset-0 w-full h-full ${immersiveHideUI ? 'object-contain' : 'object-cover'} transition-opacity duration-700 animate-ken-burns motion-reduce:animate-none motion-reduce:transition-none`,
    alt: ""
  }) : /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "absolute inset-0 bg-slate-900 flex items-center justify-center flex-col gap-4 text-slate-200"
  }, adventureState.isImageLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 48,
    className: "animate-spin motion-reduce:animate-none text-indigo-300",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold animate-pulse motion-reduce:animate-none"
  }, adventureState.loadingStage || t('adventure.generating_scene'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 48,
    className: "opacity-40",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold"
  }, t('adventure.no_image')))), !adventureState.sceneImage && adventureState.sceneImagePreview && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "absolute left-1/2 top-5 -translate-x-1/2 z-20 bg-black/75 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm"
  }, adventureState.imagePolishStage === 'matching' ? 'Matching your cast…' : 'Polishing scene details…'), theme !== 'contrast' && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-4 left-4 right-4 flex justify-between items-start z-20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-black/60 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold w-fit shadow-sm"
  }, t('common.level_abbrev'), " ", adventureState.level), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-amber-600/80 to-amber-800/80 backdrop-blur-md text-amber-100 border border-amber-400/50 px-3 py-1 rounded-full text-[11px] font-bold w-fit shadow-lg flex items-center gap-1.5 animate-pulse motion-reduce:animate-none"
  }, t('adventure.system_simulation')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 pr-3 shadow-sm",
    title: adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: `p-1 rounded-full ${adventureInputMode === 'system' ? 'bg-amber-500/20' : 'bg-yellow-500/20'}`
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 12,
    "aria-hidden": "true",
    className: `fill-current ${adventureInputMode === 'system' ? 'text-amber-400' : 'text-yellow-400'}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10",
    role: "progressbar",
    "aria-label": adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    }),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": energyValue
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `h-full transition-all duration-500 motion-reduce:transition-none ${adventureInputMode === 'system' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-yellow-400 to-orange-500'}`,
    style: {
      width: energyValue + '%'
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
    className: "text-indigo-300 fill-current",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10",
    role: "progressbar",
    "aria-label": t('common.xp') || 'XP',
    "aria-valuemin": 0,
    "aria-valuemax": xpMax,
    "aria-valuenow": xpValue,
    "aria-valuetext": t('adventure.tooltips.xp', {
      current: xpValue,
      next: xpMax
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500 motion-reduce:transition-none",
    "aria-hidden": "true",
    style: {
      width: xpProgressPercent + '%'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-end gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip'),
    "aria-pressed": adventureAutoRead,
    "data-help-key": "adventure_immersive_autoread",
    onClick: () => {
      const newState = !adventureAutoRead;
      setAdventureAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${adventureAutoRead ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`,
    title: adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip')
  }, adventureAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 16,
    className: "fill-current",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 16,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": immersiveHideUI ? t('adventure.show_ui') : t('adventure.hide_ui'),
    "aria-pressed": immersiveHideUI,
    "data-help-key": "adventure_immersive_toggle_ui",
    onClick: handleToggleImmersiveHideUI,
    className: `min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${immersiveHideUI ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`,
    title: immersiveHideUI ? t('adventure.show_ui') : t('adventure.hide_ui')
  }, immersiveHideUI ? /*#__PURE__*/React.createElement(EyeOff, {
    size: 16,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Eye, {
    size: 16,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.tooltips.exit_immersive'),
    "data-help-key": "adventure_immersive_exit",
    onClick: handleExitAdventureImmersive,
    className: "min-w-11 min-h-11 bg-black/50 backdrop-blur-md text-white border border-white/40 p-2 rounded-full hover:bg-white/20 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    title: t('adventure.tooltips.exit_immersive')
  }, /*#__PURE__*/React.createElement(Minimize, {
    size: 16,
    "aria-hidden": "true"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-black/50 backdrop-blur-md text-yellow-300 border border-yellow-500/60 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    "aria-hidden": "true"
  }, "💰"), " ", adventureState.gold), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.inventory'),
    "aria-expanded": showImmersiveInventory,
    "aria-controls": "adventure-immersive-inventory",
    "data-help-key": "adventure_immersive_inventory",
    onClick: e => {
      e.stopPropagation();
      setShowImmersiveInventory(!showImmersiveInventory);
    },
    className: `min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${showImmersiveInventory ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white border-white/20 hover:bg-white/20'}`,
    title: t('adventure.inventory')
  }, /*#__PURE__*/React.createElement(Backpack, {
    size: 16,
    "aria-hidden": "true"
  })), showImmersiveInventory && /*#__PURE__*/React.createElement("div", {
    id: "adventure-immersive-inventory",
    role: "region",
    "aria-label": t('adventure.inventory'),
    className: "absolute top-full right-0 mt-2 w-56 bg-black/80 backdrop-blur-md border border-white/40 rounded-xl p-2 shadow-xl z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none"
  }, adventureInputMode === 'system' && enableFactionResources && /*#__PURE__*/React.createElement("div", {
    className: "border-b border-amber-500/30 pb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-amber-200 uppercase tracking-wide mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "📊"), " ", t('adventure.system_state')), (adventureState.systemResources || []).length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1"
  }, adventureState.systemResources.map((resource, idx) => /*#__PURE__*/React.createElement("div", {
    key: `${resource.name}-${idx}`,
    className: "bg-gradient-to-r from-amber-900/40 to-amber-800/20 border border-amber-600/30 rounded-lg px-2 py-1 flex items-center gap-1.5 hover:border-amber-400/50 transition-all cursor-default",
    title: `${resource.name}: ${resource.quantity}${resource.unit || ''} (${resource.type || 'strategic'})`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    "aria-hidden": "true"
  }, resource.icon || '📊'), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col leading-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-amber-200/80 truncate max-w-[60px]"
  }, resource.name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-200 font-bold"
  }, resource.quantity, resource.unit && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-400/70 font-normal ml-0.5 text-[11px]"
  }, resource.unit)))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[11px] text-amber-200/50 py-1 italic"
  }, "No state variables yet")), /*#__PURE__*/React.createElement("div", null, adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "📜"), " Policies & Agreements"), adventureState.inventory.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2"
  }, adventureState.inventory.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    type: "button",
    "aria-label": item.name,
    onClick: e => {
      e.stopPropagation();
      setSelectedInventoryItem(item);
      setShowImmersiveInventory(false);
    },
    className: "group relative w-11 h-11 bg-white/10 rounded-lg border border-white/40 hover:bg-indigo-600 hover:border-indigo-400 flex items-center justify-center transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    title: item.name
  }, item.image ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: item.image,
    alt: "",
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
    type: "button",
    "aria-pressed": immersiveShowChoices,
    "aria-label": immersiveShowChoices ? t('adventure.return_to_story') : t('adventure.make_a_choice'),
    "data-help-key": "adventure_choice_toggle",
    onClick: handleToggleImmersiveShowChoices,
    className: "min-h-11 bg-indigo-600 text-white text-xs font-bold px-6 py-2 rounded-full border-2 border-white/20 shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all motion-reduce:transform-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
  }, immersiveShowChoices ? /*#__PURE__*/React.createElement(BookOpen, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(MousePointerClick, {
    size: 14,
    "aria-hidden": "true"
  }), immersiveShowChoices ? t('adventure.return_to_story') : t('adventure.make_a_choice'))), immersiveShowChoices ? /*#__PURE__*/React.createElement("div", {
    className: "animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4 duration-300"
  }, failedAdventureAction ? /*#__PURE__*/React.createElement("div", {
    role: "alert",
    "aria-atomic": "true",
    className: "w-full bg-red-900/90 border-2 border-red-500 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-500 p-3 rounded-full mb-3 text-white"
  }, /*#__PURE__*/React.createElement(WifiOff, {
    size: 24,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-white mb-1"
  }, t('adventure.interrupted_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-red-200 text-sm mb-4 max-w-xs"
  }, t('adventure.interrupted_desc')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.retry_adventure_turn'),
    onClick: handleRetryAdventureTurn,
    className: "min-h-11 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 motion-reduce:transform-none border border-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-900"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    "aria-hidden": "true"
  }), " ", t('adventure.retry_action'))) : adventureState.currentScene && (adventureFreeResponseEnabled ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3"
  }, renderStrategyHintCard(true), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('adventure.aria_free_response') || 'Type your adventure action',
    "data-help-key": "adventure_input_field",
    value: adventureTextInput,
    onChange: e => setAdventureTextInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey && adventureTextInput.trim() && !adventureState.isLoading) {
        e.preventDefault();
        handleAdventureTextSubmit();
      }
    },
    placeholder: t('adventure.action_placeholder_short'),
    className: "w-full bg-black/50 text-white border border-white/30 rounded-xl p-3 focus:border-white focus:ring-2 focus:ring-white/20 outline-none resize-none h-24 text-sm font-medium placeholder:text-white/50 backdrop-blur-sm",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "adventure_input_send",
    onClick: () => handleAdventureTextSubmit(),
    disabled: !adventureTextInput.trim() || adventureState.isLoading,
    className: "min-h-11 w-full bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white text-white p-3 rounded-xl font-bold transition-all active:scale-95 motion-reduce:transform-none backdrop-blur-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
  }, /*#__PURE__*/React.createElement(Send, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.send_action')), renderStrategyHintButton(true)) : /*#__PURE__*/React.createElement("div", {
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
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        className: `bg-white/10 hover:bg-white/20 border text-left p-4 rounded-xl text-white text-sm font-bold transition-all backdrop-blur-sm group relative overflow-hidden motion-reduce:transform-none
                                                                ${isReadingThisOption ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-white/20 shadow-lg scale-[1.02] z-10' : 'border-white/30 hover:border-white'}`
      }, isDemocracy && voteCount > 0 && /*#__PURE__*/React.createElement("div", {
        "aria-hidden": "true",
        className: "absolute left-0 top-0 bottom-0 bg-indigo-500/30 transition-all duration-500 motion-reduce:transition-none",
        style: {
          width: `${percent}%`
        }
      }), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between relative z-10 w-full"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-help-key": "adventure_choice_btn",
        onClick: () => handleAdventureChoice(opt),
        disabled: adventureState.isLoading,
        className: "min-h-11 flex items-center gap-3 flex-grow text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
      }, /*#__PURE__*/React.createElement("span", {
        className: `bg-white/20 px-2.5 py-1 rounded text-xs opacity-70 group-hover:bg-white group-hover:text-black transition-colors ${isReadingThisOption ? 'bg-yellow-400 text-black opacity-100' : ''}`
      }, idx + 1), /*#__PURE__*/React.createElement("span", {
        className: "text-left"
      }, typeof opt === 'object' && opt?.action ? opt.action : opt)), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        "aria-label": (t('common.listen') || 'Listen') + ': ' + (typeof opt === 'object' && opt?.action ? opt.action : opt),
        onClick: e => {
          e.stopPropagation();
          if (typeof opt === 'object' && opt?.audio) {
            const audio = new Audio(opt.audio);
            audio.play();
          } else if (handleSpeak) {
            const optText = typeof opt === 'object' && opt?.action ? opt.action : String(opt);
            handleSpeak(optText, 'adventure-option-' + idx);
          }
        },
        className: "min-w-11 min-h-11 rounded-full bg-white/10 hover:bg-white/30 text-white hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        title: t('common.listen')
      }, /*#__PURE__*/React.createElement(Volume2, {
        size: 16,
        "aria-hidden": "true"
      })), isDemocracy && /*#__PURE__*/React.createElement("span", {
        "aria-live": "polite",
        "aria-atomic": "true",
        className: `text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${voteCount > 0 ? 'bg-indigo-500 text-white shadow-sm' : 'opacity-40'}`
      }, t('adventure.vote_status', {
        count: voteCount,
        percent: percent
      })))));
    });
  })()))) : /*#__PURE__*/React.createElement("div", {
    className: "animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4 duration-300"
  }, adventureState.pendingChoice && adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "mb-4 animate-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-900/80 backdrop-blur-sm border border-amber-500/50 rounded-xl p-4 shadow-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-700 font-bold text-xs uppercase tracking-wider"
  }, "⚔️ ", t('adventure.your_choice') || 'Your Choice')), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-100 text-sm font-medium italic leading-relaxed"
  }, "\"", adventureState.pendingChoice, "\""), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "w-2 h-2 bg-amber-400 rounded-full animate-pulse motion-reduce:animate-none"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-300 text-xs animate-pulse motion-reduce:animate-none"
  }, t('adventure.story_unfolds') || 'The story unfolds...')))), (() => {
    const lastFeedback = adventureState.history.slice().reverse().find(h => h && h.type === 'feedback');
    if (lastFeedback) {
      return /*#__PURE__*/React.createElement("div", {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        className: "text-yellow-300 text-sm mb-3 italic font-medium border-b border-white/20 pb-2"
      }, renderFormattedText(lastFeedback.text, false, true));
    }
    return null;
  })(), /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-label": t('adventure.current_scene'),
    className: "text-lg md:text-xl text-slate-100 font-medium leading-relaxed font-serif text-shadow-sm min-h-[80px]"
  }, adventureState.currentScene && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4",
    onPointerEnter: () => {
      if (prewarmAdventureAudio && adventureState.currentScene) prewarmAdventureAudio(adventureState.currentScene.text, adventureState.currentScene.voices);
    }
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
        // Per-sentence read-aloud (immersive/dark theme): the sentence TEXT is
        // the control — inline speaker button removed 2026-07-16 per Aaron
        // (see the light-theme renderer above for the rationale).
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: `sentence-${currentGlobalIdx}`,
          role: "button",
          tabIndex: 0,
          "aria-pressed": isActive,
          "aria-label": (t('adventure.read_aloud_title') || t('common.click_read_aloud') || 'Read aloud') + ': ' + cleanText.replace(/\*\*/g, '').trim(),
          title: t('adventure.read_aloud_title') || t('common.click_read_aloud'),
          onClick: e => {
            e.stopPropagation();
            handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
          },
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
            }
          },
          className: `transition-colors duration-300 motion-reduce:transition-none rounded px-1 py-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${isActive ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-400/50' : 'hover:bg-white/10'} ${isHeader ? 'font-bold block text-2xl mt-2 text-yellow-400' : ''}`
        }, formatInteractiveText(cleanText.replace(/\*\*([^*]+)\*\*/g, '$1'), false, true), " ");
      }));
    });
  })())))))), !adventureState.isImmersiveMode && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200 shrink-0"
  }, adventureState.currentScene && !adventureState.isGameOver ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, adventureInputMode === 'debate' && adventureState.debatePhase === 'setup' && /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-2 animate-in motion-reduce:animate-none slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-teal-200 shadow-sm flex items-center justify-center gap-2 w-fit mx-auto"
  }, /*#__PURE__*/React.createElement(Scale, {
    size: 12
  }), " ", t('adventure.debate_stance'))), failedAdventureAction ? /*#__PURE__*/React.createElement("div", {
    role: "alert",
    "aria-atomic": "true",
    className: "w-full bg-red-50 border-2 border-red-200 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-100 p-3 rounded-full mb-3 text-red-500"
  }, /*#__PURE__*/React.createElement(WifiOff, {
    size: 24,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-red-900 mb-1"
  }, t('adventure.interrupted_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-red-700/80 text-sm mb-4 max-w-xs"
  }, t('adventure.interrupted_desc')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.retry_adventure_turn'),
    onClick: handleRetryAdventureTurn,
    className: "min-h-11 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    "aria-hidden": "true"
  }), " ", t('adventure.retry_action'))) : isEditingOptions ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mb-4 animate-in motion-reduce:animate-none fade-in"
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
    "aria-label": t('adventure.option_placeholder', {
      n: idx + 1
    }),
    type: "text",
    value: opt,
    onChange: e => handleOptionBufferChange(idx, e.target.value),
    className: "flex-grow p-3 rounded-xl border-2 border-indigo-600 text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none",
    placeholder: t('adventure.option_placeholder', {
      n: idx + 1
    })
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": (t('adventure.tooltips.remove_option') || 'Remove option') + ' ' + (idx + 1),
    onClick: () => handleRemoveOptionSlot(idx),
    className: "min-w-11 min-h-11 p-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2",
    title: t('adventure.tooltips.remove_option')
  }, /*#__PURE__*/React.createElement(X, {
    size: 16,
    "aria-hidden": "true"
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleAddOptionSlot,
    className: "min-h-11 p-3 rounded-xl border-2 border-dashed border-indigo-400 text-indigo-700 hover:bg-indigo-50 font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.add_option'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-4 pt-3 border-t border-indigo-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleBroadcastOptions,
    className: "min-h-11 flex-grow bg-green-700 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-800 transition-all flex items-center justify-center gap-2 active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-800 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Wifi, {
    size: 18,
    "aria-hidden": "true"
  }), " ", t('adventure.broadcast')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetIsEditingOptionsToFalse,
    className: "min-h-11 px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-500 hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
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
        type: "button",
        "data-help-key": "adventure_choice_btn",
        onClick: () => handleAdventureChoice(opt),
        disabled: adventureState.isLoading,
        className: `min-h-11 p-3 rounded-xl border-2 font-bold text-sm transition-all text-left flex items-center gap-3 group shadow-sm hover:shadow-md relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transform-none
                                                                ${isDebateSetup ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-600 hover:text-white hover:border-teal-600' : 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}
                                                                ${isReadingThisOption ? 'ring-4 ring-yellow-400 bg-yellow-100 border-yellow-400 text-indigo-900 scale-[1.02] z-10' : ''}
                                                            `
      }, /*#__PURE__*/React.createElement("span", {
        className: `w-6 h-6 rounded-full flex items-center justify-center text-xs border shrink-0 transition-colors z-10
                                                                ${isReadingThisOption ? 'bg-yellow-400 text-indigo-900 border-yellow-600' : isDebateSetup ? 'bg-white text-teal-700 border-teal-200 group-hover:border-transparent' : 'bg-white text-indigo-600 border-indigo-200 group-hover:border-transparent'}`
      }, isDebateSetup ? /*#__PURE__*/React.createElement(Scale, {
        size: 12,
        "aria-hidden": "true"
      }) : idx + 1), /*#__PURE__*/React.createElement("span", {
        className: "z-10"
      }, typeof opt === 'object' && opt?.action ? opt.action : opt), /*#__PURE__*/React.createElement("div", {
        "aria-hidden": "true",
        className: "absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 motion-reduce:transition-none motion-reduce:transform-none"
      }));
    });
  })()) : /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": isDictationMode ? t('adventure.tooltips.dictation_stop') : t('adventure.tooltips.dictation_start'),
    "aria-pressed": isDictationMode,
    type: "button",
    onClick: () => {
      const newState = !isDictationMode;
      setIsDictationMode(newState);
      if (newState && adventureInputRef.current) {
        setTimeout(() => adventureInputRef.current.focus(), 100);
      }
    },
    className: `min-w-11 min-h-11 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${isDictationMode ? 'bg-red-50 border-red-500 text-red-700 animate-pulse motion-reduce:animate-none' : 'bg-white border-indigo-300 text-slate-700 hover:text-indigo-700 hover:border-indigo-500'}`,
    title: isDictationMode ? t('adventure.tooltips.dictation_stop') : t('adventure.tooltips.dictation_start')
  }, isDictationMode ? /*#__PURE__*/React.createElement(Mic, {
    size: 20,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(MicOff, {
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("textarea", {
    ref: adventureInputRef,
    "data-help-key": "adventure_input_field",
    value: adventureTextInput,
    onChange: e => setAdventureTextInput(e.target.value),
    placeholder: adventureInputMode === 'debate' ? t('adventure.placeholder_debate') : t('adventure.placeholder_action'),
    "aria-label": adventureInputMode === 'debate' ? t('adventure.aria_debate') : t('adventure.aria_action'),
    className: "flex-grow p-3 text-sm border border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none resize-none h-20 bg-purple-50 text-purple-900 placeholder:text-purple-300 transition-shadow duration-300",
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey && adventureTextInput.trim() && !adventureState.isLoading) {
        e.preventDefault();
        handleAdventureTextSubmit();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "adventure_input_send",
    onClick: () => handleAdventureTextSubmit(),
    disabled: !adventureTextInput.trim() || adventureState.isLoading,
    className: "min-w-[80px] min-h-11 bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Send, {
    size: 18,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px]"
  }, t('adventure.act_button')))), handleAdventureHint && adventureFreeResponseEnabled && adventureState.currentScene && !adventureState.isGameOver && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-2 flex flex-col gap-2"
  }, renderStrategyHintCard(false), renderStrategyHintButton(false)), adventureState.canStartSequel && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"
  }, t('adventure.sequel_prompt')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.start_sequel'),
    onClick: handleStartSequel,
    className: "min-h-11 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:scale-105 hover:shadow-2xl transition-all motion-reduce:transform-none flex items-center gap-3 border-2 border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20,
    "aria-hidden": "true"
  }), t('adventure.start_sequel')))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-xs text-slate-600 italic"
  }, adventureState.isGameOver ? t('adventure.status.reset_prompt') : t('adventure.status.waiting')))), selectedInventoryItem && /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none",
    onClick: handleSetSelectedInventoryItemToNull
  }, /*#__PURE__*/React.createElement("div", {
    ref: inventoryDialogRef,
    tabIndex: -1,
    className: "bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-sm w-full max-h-[calc(100vh-1rem)] overflow-y-auto relative border-4 border-indigo-200 transition-all animate-in zoom-in-95 motion-reduce:animate-none",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "adventure-inventory-item-title",
    "aria-describedby": "adventure-inventory-item-description",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetSelectedInventoryItemToNull,
    className: "absolute top-2 right-2 sm:top-3 sm:right-3 min-w-11 min-h-11 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-24 bg-indigo-50 rounded-xl border-2 border-indigo-100 flex items-center justify-center mb-4 shadow-inner relative overflow-hidden group"
  }, selectedInventoryItem.image ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: selectedInventoryItem.image,
    alt: "",
    className: "w-full h-full object-contain pixelated",
    style: STYLE_IMAGE_PIXELATED
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-4xl",
    "aria-hidden": "true"
  }, selectedInventoryItem.icon || "📦"), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"
  })), /*#__PURE__*/React.createElement("h3", {
    id: "adventure-inventory-item-title",
    className: "text-xl font-black text-indigo-900 mb-1"
  }, selectedInventoryItem.name), /*#__PURE__*/React.createElement("span", {
    className: "inline-block max-w-full truncate whitespace-nowrap text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full mb-3 border border-indigo-300",
    title: t(`adventure.effects.${selectedInventoryItem.effectType}_label`) || t(`adventure.effects.${selectedInventoryItem.effectType}`) || selectedInventoryItem.effectType || "Consumable"
  }, t(`adventure.effects.${selectedInventoryItem.effectType}_label`) || t(`adventure.effects.${selectedInventoryItem.effectType}`) || selectedInventoryItem.effectType || "Consumable"), /*#__PURE__*/React.createElement("p", {
    id: "adventure-inventory-item-description",
    className: "text-sm text-slate-700 mb-6 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-300 w-full"
  }, selectedInventoryItem.description || t('adventure.inventory_fallback_desc')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 w-full"
  }, selectedInventoryItem.effectType === 'key_item' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: true,
    className: "min-h-11 flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border-2 border-slate-300 cursor-not-allowed flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.key_item_btn')) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleUseItem,
    className: "min-h-11 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.use_item'))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AdventureView = AdventureView;
  window.AlloModules.ViewAdventureModule = true;
})();
