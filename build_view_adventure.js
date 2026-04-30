// Build view_adventure_module.js — extracted from
// AlloFlowANTI.txt activeView==='adventure' block (1,304-line body).
// The biggest extraction in this session after Simplified.
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_adventure.txt', 'utf-8');

const wrapped = `
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
  return (
${inner}
  );
}
`;

const result = babel.transformSync(wrapped, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
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

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AdventureView = AdventureView;
  window.AlloModules.ViewAdventureModule = true;
})();
`;

fs.writeFileSync('view_adventure_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_adventure_module.js', moduleSrc);
console.log('Wrote view_adventure_module.js (' + moduleSrc.length + ' bytes)');
