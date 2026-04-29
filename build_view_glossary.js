// Build view_glossary_module.js from the extracted Glossary JSX block.
// Mirrors build_view_timeline.js. Uses @babel/core with @babel/plugin-transform-react-jsx
// to convert JSX -> React.createElement so the module runs as plain JS in the browser.
//
// Lucide icons resolved lazily via window.AlloIcons (populated by host at
// AlloFlowANTI.txt:4930) — same pattern as view_timeline_module.js / view_renderers_module.js.

const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/glossary_inner.txt', 'utf-8');

// Wrap the JSX block as a function with all host-scope refs as props.
const wrapped = `
function GlossaryView(props) {
  // Pure data + state reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var history = props.history;
  var selectedLanguages = props.selectedLanguages;
  var displayLanguages = props.displayLanguages;
  var leveledTextLanguage = props.leveledTextLanguage;
  var currentUiLanguage = props.currentUiLanguage;
  var activeView = props.activeView;
  var isTeacherMode = props.isTeacherMode;
  var gradeLevel = props.gradeLevel;
  var inputText = props.inputText;
  var includeEtymology = props.includeEtymology;
  // Derived state from host
  var filteredGlossaryData = props.filteredGlossaryData;
  // Edit / add / lookup state
  var isEditingGlossary = props.isEditingGlossary;
  var isAddingTerm = props.isAddingTerm;
  var newGlossaryTerm = props.newGlossaryTerm;
  var glossarySearchTerm = props.glossarySearchTerm;
  var glossaryFilter = props.glossaryFilter;
  var glossaryImageSize = props.glossaryImageSize;
  var glossaryRefinementInputs = props.glossaryRefinementInputs;
  // Flashcard state
  var flashcardIndex = props.flashcardIndex;
  var flashcardMode = props.flashcardMode;
  var flashcardLang = props.flashcardLang;
  var standardDeckLang = props.standardDeckLang;
  var isFlashcardQuizMode = props.isFlashcardQuizMode;
  var isFlashcardFlipped = props.isFlashcardFlipped;
  var showFlashcardImages = props.showFlashcardImages;
  var flashcardScore = props.flashcardScore;
  var flashcardOptions = props.flashcardOptions;
  var flashcardFeedback = props.flashcardFeedback;
  var quizSelectedOption = props.quizSelectedOption;
  var isInteractiveFlashcards = props.isInteractiveFlashcards;
  // Per-term generation state (objects keyed by index)
  var isGeneratingTermImage = props.isGeneratingTermImage;
  var isGeneratingAudio = props.isGeneratingAudio;
  var isGeneratingEtymology = props.isGeneratingEtymology;
  // Audio + playback
  var isPlaying = props.isPlaying;
  var playingContentId = props.playingContentId;
  var downloadingContentId = props.downloadingContentId;
  var selectedVoice = props.selectedVoice;
  // Health-check + screener
  var glossaryHealthCheck = props.glossaryHealthCheck;
  var isRunningHealthCheck = props.isRunningHealthCheck;
  var showHealthCheckPanel = props.showHealthCheckPanel;
  var screenerSession = props.screenerSession;
  var rosterQueue = props.rosterQueue;
  // Game state
  var gameMode = props.gameMode;
  var gameData = props.gameData;
  var isMemoryGame = props.isMemoryGame;
  var isCrosswordGame = props.isCrosswordGame;
  var isMatchingGame = props.isMatchingGame;
  var isBingoGame = props.isBingoGame;
  var isStudentBingoGame = props.isStudentBingoGame;
  var isWordScrambleGame = props.isWordScrambleGame;
  var bingoSettings = props.bingoSettings;
  var bingoState = props.bingoState;
  // Word search
  var wordSearchLang = props.wordSearchLang;
  var showWordSearchAnswers = props.showWordSearchAnswers;
  var selectedLetters = props.selectedLetters;
  var foundWords = props.foundWords;
  // Setters
  var setGlossarySearchTerm = props.setGlossarySearchTerm;
  var setIsEditingGlossary = props.setIsEditingGlossary;
  var setIsAddingTerm = props.setIsAddingTerm;
  var setFlashcardIndex = props.setFlashcardIndex;
  var setFlashcardMode = props.setFlashcardMode;
  var setFlashcardLang = props.setFlashcardLang;
  var setStandardDeckLang = props.setStandardDeckLang;
  var setIsFlashcardQuizMode = props.setIsFlashcardQuizMode;
  var setIsFlashcardFlipped = props.setIsFlashcardFlipped;
  var setShowFlashcardImages = props.setShowFlashcardImages;
  var setFlashcardScore = props.setFlashcardScore;
  var setFlashcardOptions = props.setFlashcardOptions;
  var setFlashcardFeedback = props.setFlashcardFeedback;
  var setIsMatchingGame = props.setIsMatchingGame;
  var setIsMemoryGame = props.setIsMemoryGame;
  var setIsCrosswordGame = props.setIsCrosswordGame;
  var setIsSyntaxGame = props.setIsSyntaxGame;
  var setIsStudentBingoGame = props.setIsStudentBingoGame;
  var setIsInteractiveFlashcards = props.setIsInteractiveFlashcards;
  var setGlossaryHealthCheck = props.setGlossaryHealthCheck;
  var setIsGeneratingAudio = props.setIsGeneratingAudio;
  var setPlayingContentId = props.setPlayingContentId;
  var setGlossaryImageSize = props.setGlossaryImageSize;
  var setBingoSettings = props.setBingoSettings;
  var setBingoState = props.setBingoState;
  var setWordSearchLang = props.setWordSearchLang;
  var setGlossaryImageStyle = props.setGlossaryImageStyle;
  var setNewGlossaryTerm = props.setNewGlossaryTerm;
  var setShowHealthCheckPanel = props.setShowHealthCheckPanel;
  var setGlossaryRefinementInputs = props.setGlossaryRefinementInputs;
  // Handlers
  var handleAddGlossaryTerm = props.handleAddGlossaryTerm;
  var handleQuickAddGlossary = props.handleQuickAddGlossary;
  var handleDeleteTerm = props.handleDeleteTerm;
  var handleGenerateTermImage = props.handleGenerateTermImage;
  var handleDeleteTermImage = props.handleDeleteTermImage;
  var handleGenerateTermEtymology = props.handleGenerateTermEtymology;
  var handleRefineGlossaryImage = props.handleRefineGlossaryImage;
  var handleGlossaryChange = props.handleGlossaryChange;
  var handleSpeak = props.handleSpeak;
  var handleDownloadAudio = props.handleDownloadAudio;
  var handleCardAudioSequence = props.handleCardAudioSequence;
  var handleExportFlashcards = props.handleExportFlashcards;
  var handleQuizOptionClick = props.handleQuizOptionClick;
  var handleToggleIsFlashcardFlipped = props.handleToggleIsFlashcardFlipped;
  var handleToggleShowFlashcardImages = props.handleToggleShowFlashcardImages;
  var handleToggleIsEditingGlossary = props.handleToggleIsEditingGlossary;
  var handleSetGlossaryFilterToAll = props.handleSetGlossaryFilterToAll;
  var handleSetGlossaryFilterToAcademic = props.handleSetGlossaryFilterToAcademic;
  var handleSetGlossaryFilterToDomain = props.handleSetGlossaryFilterToDomain;
  var handleSetGlossarySearchTermConst = props.handleSetGlossarySearchTermConst;
  var handleSetIsMemoryGameToTrue = props.handleSetIsMemoryGameToTrue;
  var handleSetIsCrosswordGameToTrue = props.handleSetIsCrosswordGameToTrue;
  var handleSetIsMatchingGameToTrue = props.handleSetIsMatchingGameToTrue;
  var handleSetIsBingoGameToTrue = props.handleSetIsBingoGameToTrue;
  var handleSetIsStudentBingoGameToTrue = props.handleSetIsStudentBingoGameToTrue;
  var handleSetIsWordScrambleGameToTrue = props.handleSetIsWordScrambleGameToTrue;
  var handleCloseWordScramble = props.handleCloseWordScramble;
  var closeStudentBingo = props.closeStudentBingo;
  var handleToggleShowWordSearchAnswers = props.handleToggleShowWordSearchAnswers;
  var handlePrintGame = props.handlePrintGame;
  var handleSetGameModeToNull = props.handleSetGameModeToNull;
  var handleToggleShowHealthCheckPanel = props.handleToggleShowHealthCheckPanel;
  var handleGlossarySelectAll = props.handleGlossarySelectAll;
  var handleGlossarySelectionChange = props.handleGlossarySelectionChange;
  var handleDeleteGlossaryItem = props.handleDeleteGlossaryItem;
  var fetchReplacementSuggestion = props.fetchReplacementSuggestion;
  var toggleLetterSelection = props.toggleLetterSelection;
  // Screener helpers
  var classifyScreeningRisk = props.classifyScreeningRisk;
  var advanceRoster = props.advanceRoster;
  var setScreenerSession = props.setScreenerSession;
  var setRosterQueue = props.setRosterQueue;
  var exportScreeningCSV = props.exportScreeningCSV;
  var handleGameScoreUpdate = props.handleGameScoreUpdate;
  var handleGameCompletion = props.handleGameCompletion;
  var handleScoreUpdate = props.handleScoreUpdate;
  var handleAiSafetyFlag = props.handleAiSafetyFlag;
  var handleGenerateBingo = props.handleGenerateBingo;
  var generateWordSearch = props.generateWordSearch;
  var prevFlashcard = props.prevFlashcard;
  var nextFlashcard = props.nextFlashcard;
  var stopPlayback = props.stopPlayback;
  var launchInteractiveFlashcards = props.launchInteractiveFlashcards;
  var closeInteractiveFlashcards = props.closeInteractiveFlashcards;
  var closeMemory = props.closeMemory;
  var closeCrossword = props.closeCrossword;
  var closeMatching = props.closeMatching;
  var closeBingo = props.closeBingo;
  var runGlossaryHealthCheck = props.runGlossaryHealthCheck;
  var runGlossaryScreener = props.runGlossaryScreener;
  // Pure helpers
  var addToast = props.addToast;
  var playSound = props.playSound;
  var callTTS = props.callTTS;
  var callImagen = props.callImagen;
  var callGeminiImageEdit = props.callGeminiImageEdit;
  var copyToClipboard = props.copyToClipboard;
  var safeDownloadBlob = props.safeDownloadBlob;
  var isRtlLang = props.isRtlLang;
  var cleanJson = props.cleanJson;
  var fisherYatesShuffle = props.fisherYatesShuffle;
  var getRows = props.getRows;
  // Auto-remove + visual prefs
  var autoRemoveWords = props.autoRemoveWords;
  var visualStyle = props.visualStyle;
  var glossaryImageStyle = props.glossaryImageStyle;
  // Refs
  var alloBotRef = props.alloBotRef;
  // Components from host scope
  var ErrorBoundary = props.ErrorBoundary;
  var SpeakButton = props.SpeakButton;
  var MemoryGame = props.MemoryGame;
  var CrosswordGame = props.CrosswordGame;
  var MatchingGame = props.MatchingGame;
  var BingoGame = props.BingoGame;
  var StudentBingoGame = props.StudentBingoGame;
  var WordScrambleGame = props.WordScrambleGame;
  return (
${inner}
  );
}
`;

const result = babel.transformSync(wrapped, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
});

if (!result || !result.code) {
  console.error('Babel transform failed');
  process.exit(1);
}

const transformedFn = result.code;

const moduleSrc = `/**
 * AlloFlow View - Glossary Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='glossary' block.
 * Source range (pre-extraction): lines 29412-31037 (~1626 lines).
 * Renders the glossary view: term cards, multi-language toggles,
 * flashcard launchers, mini-games (memory/crossword/bingo/scramble/
 * syntax), audio downloads, export buttons, health checks, etymology
 * panels, and edit-mode controls. ErrorBoundary + game components
 * passed in as props.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.GlossaryView) {
    console.log('[CDN] ViewGlossaryModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewGlossaryModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  // Lazy Lucide icon resolution from window.AlloIcons (populated by
  // host at AlloFlowANTI.txt:4930). Avoids threading dozens of icon
  // components as props. Mirrors view_timeline_module.js pattern.
  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ArrowDown = _lazyIcon('ArrowDown');
  var Award = _lazyIcon('Award');
  var Ban = _lazyIcon('Ban');
  var Brain = _lazyIcon('Brain');
  var CheckCircle = _lazyIcon('CheckCircle');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var ChevronDown = _lazyIcon('ChevronDown');
  var Download = _lazyIcon('Download');
  var Eye = _lazyIcon('Eye');
  var GalleryHorizontal = _lazyIcon('GalleryHorizontal');
  var Gamepad2 = _lazyIcon('Gamepad2');
  var GitMerge = _lazyIcon('GitMerge');
  var Globe = _lazyIcon('Globe');
  var ImageIcon = _lazyIcon('ImageIcon');
  var Languages = _lazyIcon('Languages');
  var MonitorPlay = _lazyIcon('MonitorPlay');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var Pencil = _lazyIcon('Pencil');
  var Plus = _lazyIcon('Plus');
  var Printer = _lazyIcon('Printer');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Search = _lazyIcon('Search');
  var Send = _lazyIcon('Send');
  var Shuffle = _lazyIcon('Shuffle');
  var Sparkles = _lazyIcon('Sparkles');
  var StopCircle = _lazyIcon('StopCircle');
  var Trash2 = _lazyIcon('Trash2');
  var Volume2 = _lazyIcon('Volume2');
  var X = _lazyIcon('X');
  var XCircle = _lazyIcon('XCircle');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.GlossaryView = GlossaryView;
  window.AlloModules.ViewGlossaryModule = true;
})();
`;

fs.writeFileSync('view_glossary_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_glossary_module.js', moduleSrc);
console.log('Wrote view_glossary_module.js (' + moduleSrc.length + ' bytes)');
console.log('Mirrored to prismflow-deploy/public/view_glossary_module.js');
