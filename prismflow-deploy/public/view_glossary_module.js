/**
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
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-800 max-w-xs"
  }, /*#__PURE__*/React.createElement("strong", null, t('simplified.udl_goal').split(':')[0], ":"), " ", t('glossary.udl_goal_desc')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 w-full sm:w-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex bg-white rounded-full p-1 border border-blue-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_standard_flashcards",
    onClick: () => launchInteractiveFlashcards('standard'),
    className: "px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1",
    title: t('flashcards.tooltip_launch_standard')
  }, /*#__PURE__*/React.createElement(MonitorPlay, {
    size: 14
  }), " ", t('flashcards.launch_standard')), selectedLanguages.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "w-px bg-blue-200 my-1"
  }), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_language_flashcards",
    onClick: () => launchInteractiveFlashcards('language'),
    className: "px-3 py-1 rounded-full text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1",
    title: t('flashcards.tooltip_launch_language')
  }, /*#__PURE__*/React.createElement(Languages, {
    size: 14
  }), " ", t('flashcards.launch_language')))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_export_standard",
    onClick: () => handleExportFlashcards('standard'),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap",
    title: t('flashcards.tooltip_export_standard')
  }, /*#__PURE__*/React.createElement(GalleryHorizontal, {
    size: 14
  }), " ", t('flashcards.export_standard')), isTeacherMode && selectedLanguages.length > 0 && /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_export_language",
    onClick: () => handleExportFlashcards('language'),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-sm whitespace-nowrap",
    title: t('flashcards.tooltip_export_language')
  }, /*#__PURE__*/React.createElement(Languages, {
    size: 14
  }), " ", t('flashcards.export_language'))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center bg-teal-50 rounded-full p-0.5 border border-teal-200"
  }, selectedLanguages.length > 0 && /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    "data-help-key": "glossary_puzzle_lang",
    value: wordSearchLang,
    onChange: e => {
      setWordSearchLang(e.target.value);
      if (gameMode === 'wordsearch') {
        generateWordSearch(e.target.value);
      }
    },
    className: "text-xs font-bold text-teal-700 bg-transparent border-r border-teal-600 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer hover:bg-teal-100 rounded-l-full",
    title: t('glossary.tooltips.select_puzzle_lang')
  }, /*#__PURE__*/React.createElement("option", {
    value: "English"
  }, t('common.english')), selectedLanguages.map(lang => /*#__PURE__*/React.createElement("option", {
    key: lang,
    value: lang
  }, lang))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_game'),
    "data-help-key": "glossary_word_search",
    onClick: () => generateWordSearch(wordSearchLang),
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedLanguages.length > 0 ? 'rounded-l-none pl-2' : ''} bg-teal-700 text-white hover:bg-teal-700 shadow-sm`,
    title: t('glossary.tooltips.generate_word_search')
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), gameMode === 'wordsearch' ? t('common.regenerate') : t('glossary.word_search'))), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_memory_game",
    onClick: handleSetIsMemoryGameToTrue,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm whitespace-nowrap",
    title: t('glossary.tooltips.launch_memory')
  }, /*#__PURE__*/React.createElement(Brain, {
    size: 14
  }), " ", t('glossary.memory_game')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_game'),
    "data-help-key": "glossary_crossword",
    onClick: handleSetIsCrosswordGameToTrue,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap",
    title: t('glossary.tooltips.generate_crossword')
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), " ", t('glossary.crossword')), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_matching",
    onClick: handleSetIsMatchingGameToTrue,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-700 text-white hover:bg-orange-600 transition-all shadow-sm whitespace-nowrap",
    title: t('glossary.tooltips.generate_matching')
  }, /*#__PURE__*/React.createElement(GitMerge, {
    size: 14
  }), " ", t('glossary.matching')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_game'),
    "data-help-key": "glossary_bingo",
    onClick: handleSetIsBingoGameToTrue,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-700 text-white hover:bg-rose-600 transition-all shadow-sm whitespace-nowrap",
    title: t('glossary.tooltips.generate_bingo')
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), " ", t('glossary.bingo')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.start_game'),
    "data-help-key": "glossary_play_bingo",
    onClick: handleSetIsStudentBingoGameToTrue,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-700 text-white hover:bg-pink-600 transition-all shadow-sm whitespace-nowrap",
    title: t('glossary.tooltips.launch_bingo')
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), " ", t('glossary.play_bingo')), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_scramble",
    onClick: handleSetIsWordScrambleGameToTrue,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-700 transition-all shadow-sm whitespace-nowrap",
    title: t('glossary.tooltips.launch_scramble')
  }, /*#__PURE__*/React.createElement(Shuffle, {
    size: 14
  }), " ", t('glossary.scramble'))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_edit",
    onClick: handleToggleIsEditingGlossary,
    "aria-label": isEditingGlossary ? t('common.done') : t('common.edit'),
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm whitespace-nowrap ${isEditingGlossary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`
  }, isEditingGlossary ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingGlossary ? t('common.done') : t('common.edit')), /*#__PURE__*/React.createElement("div", {
    "data-help-key": "glossary_image_size",
    className: "flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-blue-200 shadow-sm",
    title: t('glossary.image_size_tooltip')
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14,
    className: "text-blue-400"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.range_slider'),
    type: "range",
    min: "64",
    max: "300",
    step: "16",
    value: glossaryImageSize,
    onChange: e => setGlossaryImageSize(Number(e.target.value)),
    className: "w-20 h-1.5 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex bg-white p-1 rounded-full border border-blue-200 shadow-sm shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    "data-help-key": "glossary_filter_all",
    onClick: handleSetGlossaryFilterToAll,
    className: `px-3 py-0.5 rounded-full text-[11px] font-bold transition-all ${glossaryFilter === 'all' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-600'}`
  }, t('glossary.filter_all')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    "data-help-key": "glossary_filter_tier2",
    onClick: handleSetGlossaryFilterToAcademic,
    className: `px-3 py-0.5 rounded-full text-[11px] font-bold transition-all ${glossaryFilter === 'academic' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-600'}`
  }, t('glossary.filter_tier2')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    "data-help-key": "glossary_filter_tier3",
    onClick: handleSetGlossaryFilterToDomain,
    className: `px-3 py-0.5 rounded-full text-[11px] font-bold transition-all ${glossaryFilter === 'domain' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-600'}`
  }, t('glossary.filter_tier3'))), /*#__PURE__*/React.createElement("div", {
    "data-help-key": "glossary_search",
    className: "relative w-full sm:w-auto"
  }, /*#__PURE__*/React.createElement(Search, {
    className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    "aria-label": t('glossary.search_placeholder') || 'Search glossary',
    placeholder: t('glossary.search_placeholder'),
    value: glossarySearchTerm,
    onChange: e => setGlossarySearchTerm(e.target.value),
    className: "pl-8 pr-3 py-1.5 text-sm border border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 w-full"
  }), glossarySearchTerm && /*#__PURE__*/React.createElement("button", {
    onClick: handleSetGlossarySearchTermConst,
    className: "absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600",
    "aria-label": t('common.clear')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (generatedContent?.type === 'glossary' && Array.isArray(generatedContent?.data)) {
        const sourceText = history.slice().reverse().find(h => h && h.type === 'analysis')?.data?.originalText || inputText || '';
        console.log('[HealthCheck] Manual trigger: ' + generatedContent.data.length + ' terms');
        runGlossaryHealthCheck(generatedContent.data, sourceText);
      } else {
        console.warn('[HealthCheck] Manual trigger failed: generatedContent type=' + generatedContent?.type + ', data is array=' + Array.isArray(generatedContent?.data));
        addToast(t('common.generate_glossary_first') || 'Generate a glossary first', 'info');
      }
    },
    disabled: isRunningHealthCheck || generatedContent?.type !== 'glossary',
    className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-all shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
    title: "Analyze glossary quality, grade level, and accuracy"
  }, isRunningHealthCheck ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCA"), isRunningHealthCheck ? 'Analyzing...' : glossaryHealthCheck ? 'Re-run Health Check' : 'Health Check')))), isInteractiveFlashcards && generatedContent?.data && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-start pt-20 sm:pt-24 p-4 animate-in fade-in duration-300 overflow-auto"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: closeInteractiveFlashcards,
    className: "absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 32
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-6 z-50 hidden sm:flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleShowFlashcardImages,
    className: `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg border ${showFlashcardImages ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-600 border-slate-700 hover:text-white'}`,
    title: t('flashcards.tooltip_toggle_images'),
    "aria-label": showFlashcardImages ? t('flashcards.hide_images') : t('flashcards.show_images')
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 16
  }), " ", showFlashcardImages ? t('flashcards.hide_images') : t('flashcards.show_images')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setIsFlashcardQuizMode(!isFlashcardQuizMode);
      setFlashcardScore(0);
      setFlashcardIndex(0);
      setIsFlashcardFlipped(false);
      setFlashcardOptions([]);
      setFlashcardFeedback(null);
    },
    className: `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg border ${isFlashcardQuizMode ? 'bg-yellow-500 text-indigo-900 border-yellow-400' : 'bg-slate-800 text-slate-600 border-slate-700 hover:text-white'}`,
    title: t('flashcards.tooltip_toggle_quiz'),
    "aria-label": isFlashcardQuizMode ? "Disable Quiz Mode" : "Enable Quiz Mode"
  }, isFlashcardQuizMode ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Brain, {
    size: 16
  }), isFlashcardQuizMode ? t('flashcards.quiz_active') : t('flashcards.practice_mode'))), flashcardMode === 'standard' && selectedLanguages.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-1/2 -translate-x-1/2 z-50"
  }, /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    value: standardDeckLang,
    onChange: e => setStandardDeckLang(e.target.value),
    className: "bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-lg"
  }, /*#__PURE__*/React.createElement("option", {
    value: "English Only"
  }, t('languages.english_only')), selectedLanguages.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, "+ ", l)))), flashcardMode === 'language' && selectedLanguages.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-1/2 -translate-x-1/2 z-50"
  }, /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    value: flashcardLang,
    onChange: e => setFlashcardLang(e.target.value),
    className: "bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
  }, selectedLanguages.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-4xl perspective-1000"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6 px-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-white/80 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg flex items-center gap-2"
  }, flashcardMode === 'standard' ? t('flashcards.deck_standard') : t('flashcards.deck_language', {
    lang: flashcardLang || 'Language'
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-normal opacity-70"
  }, "(", flashcardIndex + 1, "/", generatedContent?.data.length, ")")), isFlashcardQuizMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-500 text-indigo-900 px-3 py-0.5 rounded-full text-sm font-black shadow-sm animate-in zoom-in"
  }, t('flashcards.score_label'), " ", flashcardScore), /*#__PURE__*/React.createElement("div", {
    className: "sm:hidden flex gap-1"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_images'),
    onClick: handleToggleShowFlashcardImages,
    className: `p-1.5 rounded border ${showFlashcardImages ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-600'}`
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setIsFlashcardQuizMode(!isFlashcardQuizMode);
      setFlashcardOptions([]);
      setFlashcardFeedback(null);
    },
    className: `p-1.5 rounded border ${isFlashcardQuizMode ? 'bg-yellow-500 border-yellow-400 text-indigo-900' : 'bg-slate-800 border-slate-700 text-slate-600'}`
  }, /*#__PURE__*/React.createElement(Brain, {
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "relative w-full aspect-[3/2] cursor-pointer group",
    onClick: handleToggleIsFlashcardFlipped,
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsFlashcardFlipped(!isFlashcardFlipped);
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": isFlashcardFlipped ? "Flashcard Back (Click to flip)" : "Flashcard Front (Click to flip)"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-full h-full transition-all duration-500 transform-style-3d shadow-2xl rounded-3xl ${isFlashcardFlipped ? 'rotate-y-180' : 'rotate-y-0'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 backface-hidden bg-white rounded-3xl p-8 flex flex-col items-center justify-center text-center border-4 border-blue-100 shadow-inner"
  }, flashcardMode === 'standard' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-6 text-xs font-bold text-blue-400 uppercase tracking-widest"
  }, t('flashcards.front_label_term')), showFlashcardImages && generatedContent?.data[flashcardIndex].image && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 max-h-[55%] w-auto flex justify-center"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: generatedContent?.data[flashcardIndex].image,
    alt: t('flashcards.alt_visual'),
    className: "max-h-full max-w-full object-contain rounded-lg shadow-sm border border-slate-100",
    decoding: "async"
  })), /*#__PURE__*/React.createElement("h2", {
    className: `${showFlashcardImages && generatedContent?.data[flashcardIndex].image ? 'text-3xl md:text-5xl' : 'text-5xl md:text-8xl'} font-black text-slate-800 hover:text-blue-600 transition-colors`,
    onClick: e => {
      e.stopPropagation();
      handleSpeak(generatedContent?.data[flashcardIndex].term, 'fc-front');
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleSpeak(generatedContent?.data[flashcardIndex].term, 'fc-front');
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": `Read term: ${generatedContent?.data[flashcardIndex].term}`,
    title: t('flashcards.tooltip_audio')
  }, generatedContent?.data[flashcardIndex].term), standardDeckLang !== 'English Only' && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-100 w-2/3 animate-in fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-indigo-600 uppercase mb-1"
  }, standardDeckLang), /*#__PURE__*/React.createElement("h3", {
    className: "text-3xl md:text-4xl font-bold text-indigo-600",
    onClick: e => {
      e.stopPropagation();
      const fullTrans = generatedContent?.data[flashcardIndex].translations?.[standardDeckLang] || "";
      const term = fullTrans.includes(':') ? fullTrans.split(':')[0].trim() : "";
      if (term) handleSpeak(term, `fc-front-${standardDeckLang}`);
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const fullTrans = generatedContent?.data[flashcardIndex].translations?.[standardDeckLang] || "";
        const term = fullTrans.includes(':') ? fullTrans.split(':')[0].trim() : "";
        if (term) handleSpeak(term, `fc-front-${standardDeckLang}`);
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": t('common.click_read_aloud')
  }, (() => {
    const fullTrans = generatedContent?.data[flashcardIndex].translations?.[standardDeckLang] || "";
    if (fullTrans.includes(":")) {
      return fullTrans.split(":")[0].trim();
    }
    return "";
  })()))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-6 text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Globe, {
    size: 14
  }), " English"), showFlashcardImages && generatedContent?.data[flashcardIndex].image && /*#__PURE__*/React.createElement("div", {
    className: "mb-2 max-h-[45%] w-auto flex justify-center"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: generatedContent?.data[flashcardIndex].image,
    alt: "Visual",
    className: "max-h-full max-w-full object-contain rounded-lg shadow-sm border border-slate-100",
    decoding: "async"
  })), /*#__PURE__*/React.createElement("h2", {
    className: `${showFlashcardImages && generatedContent?.data[flashcardIndex].image ? 'text-3xl md:text-4xl' : 'text-4xl md:text-6xl'} font-black text-slate-800 mb-2 hover:text-indigo-600 transition-colors`,
    onClick: e => {
      e.stopPropagation();
      handleSpeak(generatedContent?.data[flashcardIndex].term, 'fc-front-term');
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleSpeak(generatedContent?.data[flashcardIndex].term, 'fc-front-term');
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": `Read term: ${generatedContent?.data[flashcardIndex].term}`
  }, generatedContent?.data[flashcardIndex].term), /*#__PURE__*/React.createElement("p", {
    className: `${showFlashcardImages && generatedContent?.data[flashcardIndex].image ? 'text-lg' : 'text-2xl'} text-slate-600 leading-relaxed max-w-2xl hover:text-indigo-500 transition-colors line-clamp-4`,
    onClick: e => {
      e.stopPropagation();
      handleSpeak(generatedContent?.data[flashcardIndex].def, 'fc-front-def');
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleSpeak(generatedContent?.data[flashcardIndex].def, 'fc-front-def');
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": t('common.click_read_aloud')
  }, generatedContent?.data[flashcardIndex].def)), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-6 text-slate-600 text-xs font-bold uppercase tracking-widest flex items-center gap-1 animate-pulse"
  }, t('flashcards.flip_hint'), " ", /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10
  }))), /*#__PURE__*/React.createElement("div", {
    className: `absolute inset-0 backface-hidden rounded-3xl p-8 flex flex-col items-center justify-center text-center rotate-y-180 border-4 shadow-inner text-white ${flashcardMode === 'standard' ? 'bg-blue-600 border-blue-400' : 'bg-indigo-600 border-indigo-400'}`
  }, isFlashcardQuizMode ? /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl md:text-4xl font-black text-white mb-2 drop-shadow-md"
  }, (() => {
    const item = generatedContent?.data[flashcardIndex];
    if (flashcardMode === 'language' && flashcardLang) {
      const trans = item.translations?.[flashcardLang];
      if (trans && trans.includes(":")) {
        return trans.split(":")[0].trim();
      }
      return item.term;
    }
    return item.term;
  })()), /*#__PURE__*/React.createElement("h3", {
    className: "text-xs font-bold mb-4 text-white/80 uppercase tracking-widest"
  }, flashcardFeedback === 'correct' ? t('flashcards.correct_msg') : flashcardFeedback === 'incorrect' ? t('flashcards.try_again') : t('flashcards.select_match')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3 w-full overflow-y-auto custom-scrollbar max-h-[65%] pr-1"
  }, flashcardOptions.map((opt, idx) => {
    const isSelected = quizSelectedOption === opt;
    const currentItem = generatedContent?.data[flashcardIndex];
    const isCorrectAnswer = opt === currentItem.def;
    let btnClass = "bg-white/10 hover:bg-white/20 text-white border-2 border-white/20";
    let icon = null;
    if (quizSelectedOption) {
      if (isCorrectAnswer) {
        btnClass = "bg-green-700 border-green-600 text-white font-bold ring-2 ring-white scale-[1.02] shadow-lg";
        icon = /*#__PURE__*/React.createElement(CheckCircle2, {
          size: 16,
          className: "shrink-0"
        });
      } else if (isSelected) {
        btnClass = "bg-red-500 border-red-400 text-white opacity-80";
        icon = /*#__PURE__*/React.createElement(XCircle, {
          size: 16,
          className: "shrink-0"
        });
      } else {
        btnClass = "opacity-30 bg-white/5";
      }
    }
    return /*#__PURE__*/React.createElement("button", {
      key: idx,
      onClick: e => handleQuizOptionClick(e, opt),
      disabled: !!quizSelectedOption,
      className: `p-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left shadow-sm flex items-center gap-3 ${btnClass}`
    }, icon && /*#__PURE__*/React.createElement("span", null, icon), /*#__PURE__*/React.createElement("span", {
      className: "line-clamp-2"
    }, opt));
  }))) : flashcardMode === 'standard' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-6 text-xs font-bold text-blue-200 uppercase tracking-widest"
  }, t('flashcards.back_label_def')), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl md:text-4xl font-medium leading-relaxed hover:text-blue-200 transition-colors cursor-pointer",
    onClick: e => {
      e.stopPropagation();
      handleSpeak(generatedContent?.data[flashcardIndex].def, 'fc-back-def');
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleSpeak(generatedContent?.data[flashcardIndex].def, 'fc-back-def');
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": t('common.read_translated_definition'),
    title: t('flashcards.tooltip_audio')
  }, generatedContent?.data[flashcardIndex].def), standardDeckLang !== 'English Only' && /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-4 border-t border-blue-400 w-full animate-in fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-blue-200 uppercase mb-2"
  }, standardDeckLang), /*#__PURE__*/React.createElement("p", {
    className: "text-xl md:text-2xl font-medium leading-relaxed italic text-blue-50 hover:text-white cursor-pointer",
    onClick: e => {
      e.stopPropagation();
      const fullTrans = generatedContent?.data[flashcardIndex].translations?.[standardDeckLang] || "";
      const def = fullTrans.includes(':') ? fullTrans.split(':')[1].trim() : fullTrans;
      handleSpeak(def, `fc-back-def-${standardDeckLang}`);
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const fullTrans = generatedContent?.data[flashcardIndex].translations?.[standardDeckLang] || "";
        const def = fullTrans.includes(':') ? fullTrans.split(':')[1].trim() : fullTrans;
        handleSpeak(def, `fc-back-def-${standardDeckLang}`);
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": t('common.read_translated_definition')
  }, (() => {
    const fullTrans = generatedContent?.data[flashcardIndex].translations?.[standardDeckLang] || "Translation not available";
    if (fullTrans.includes(":")) {
      return fullTrans.split(":")[1].trim();
    }
    return fullTrans;
  })())), generatedContent?.data[flashcardIndex]?.etymology && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-blue-400/50 w-full animate-in fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-blue-200 uppercase mb-1"
  }, "\uD83D\uDCDC ", t('glossary.etymology_label') || 'Word roots'), /*#__PURE__*/React.createElement("p", {
    className: "text-sm md:text-base text-blue-50 italic leading-relaxed hover:text-white cursor-pointer",
    onClick: e => {
      e.stopPropagation();
      handleSpeak(generatedContent.data[flashcardIndex].etymology, 'fc-back-etym');
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleSpeak(generatedContent.data[flashcardIndex].etymology, 'fc-back-etym');
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": t('glossary.etymology_label') || 'Word roots'
  }, generatedContent.data[flashcardIndex].etymology))) : (() => {
    const fullTrans = generatedContent?.data[flashcardIndex].translations?.[flashcardLang] || "Translation not available";
    let transTerm = "";
    let transDef = fullTrans;
    if (fullTrans.includes(":")) {
      const splitIdx = fullTrans.indexOf(":");
      transTerm = fullTrans.substring(0, splitIdx).trim();
      transDef = fullTrans.substring(splitIdx + 1).trim();
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "absolute top-6 left-6 text-xs font-bold text-indigo-200 uppercase tracking-widest flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(Globe, {
      size: 14
    }), " ", flashcardLang), transTerm && /*#__PURE__*/React.createElement("h2", {
      className: "text-4xl md:text-6xl font-black text-white mb-6 hover:text-indigo-200 transition-colors cursor-pointer",
      onClick: e => {
        e.stopPropagation();
        handleSpeak(transTerm, 'fc-back-term');
      },
      onKeyDown: e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          handleSpeak(transTerm, 'fc-back-term');
        }
      },
      tabIndex: 0,
      role: "button",
      "aria-label": `Read ${flashcardLang} term`
    }, transTerm), /*#__PURE__*/React.createElement("p", {
      className: "text-xl md:text-2xl text-indigo-100 leading-relaxed font-serif italic hover:text-white transition-colors cursor-pointer",
      onClick: e => {
        e.stopPropagation();
        handleSpeak(transDef, 'fc-back-def');
      },
      onKeyDown: e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          handleSpeak(transDef, 'fc-back-def');
        }
      },
      tabIndex: 0,
      role: "button",
      "aria-label": `Read ${flashcardLang} definition`
    }, transDef));
  })()))), /*#__PURE__*/React.createElement("div", {
    className: "mt-10 pb-8 flex justify-between items-center px-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: prevFlashcard,
    disabled: flashcardIndex === 0,
    className: "flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    "aria-label": t('common.prev_flashcard'),
    "data-help-key": "flashcard_prev"
  }, /*#__PURE__*/React.createElement(ArrowDown, {
    className: "rotate-90",
    size: 20
  }), " ", t('flashcards.previous')), /*#__PURE__*/React.createElement("button", {
    onClick: handleCardAudioSequence,
    className: "px-8 py-4 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105 transition-all flex items-center gap-3 font-bold text-lg",
    title: t('common.play_audio_sequence'),
    "aria-label": isPlaying && playingContentId === 'flashcard-sequence' ? t('flashcards.stop') : t('flashcards.play_card'),
    "data-help-key": "flashcard_play_sequence"
  }, isPlaying && playingContentId === 'flashcard-sequence' ? /*#__PURE__*/React.createElement(StopCircle, {
    size: 24,
    className: "fill-current"
  }) : /*#__PURE__*/React.createElement(Volume2, {
    size: 24,
    className: "fill-current"
  }), isPlaying && playingContentId === 'flashcard-sequence' ? t('flashcards.stop') : t('flashcards.play_card')), /*#__PURE__*/React.createElement("button", {
    onClick: e => nextFlashcard(e),
    disabled: flashcardIndex === generatedContent?.data.length - 1,
    className: "flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    "aria-label": t('common.next_flashcard'),
    "data-help-key": "flashcard_next"
  }, t('flashcards.next'), " ", /*#__PURE__*/React.createElement(ArrowDown, {
    className: "-rotate-90",
    size: 20
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-center text-white/40 text-xs mt-6 font-medium"
  }, t('flashcards.pro_tip_audio')))), isMemoryGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Memory Game encountered an error."
  }, /*#__PURE__*/React.createElement(MemoryGame, {
    data: generatedContent?.data,
    onClose: closeMemory,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })), isCrosswordGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Crossword Puzzle encountered an error."
  }, /*#__PURE__*/React.createElement(CrosswordGame, {
    data: generatedContent?.data,
    onClose: closeCrossword,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })), isMatchingGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Matching Game encountered an error."
  }, /*#__PURE__*/React.createElement(MatchingGame, {
    data: generatedContent?.data,
    onClose: closeMatching,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })), isBingoGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Bingo Generator encountered an error."
  }, /*#__PURE__*/React.createElement(BingoGame, {
    data: generatedContent?.data,
    onClose: closeBingo,
    settings: bingoSettings,
    setSettings: setBingoSettings,
    onGenerate: handleGenerateBingo,
    bingoState: bingoState,
    setBingoState: setBingoState,
    onGenerateAudio: callTTS,
    selectedVoice: selectedVoice,
    alloBotRef: alloBotRef
  })), isStudentBingoGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Bingo Game encountered an error."
  }, /*#__PURE__*/React.createElement(StudentBingoGame, {
    data: generatedContent?.data,
    onClose: closeStudentBingo,
    playSound: playSound,
    onGameComplete: handleGameCompletion
  })), isWordScrambleGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Word Scramble Game encountered an error."
  }, /*#__PURE__*/React.createElement(WordScrambleGame, {
    data: generatedContent?.data,
    onClose: handleCloseWordScramble,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate
  })), screenerSession && screenerSession.status === 'interstitial' && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-emerald-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200"
  }, /*#__PURE__*/React.createElement(CheckCircle, {
    size: 32
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-black text-slate-800 mb-2"
  }, screenerSession.subtests[screenerSession.currentIndex - 1]?.replace(/^./, c => c.toUpperCase()), " Complete!"), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 mb-4"
  }, "Next up:"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-black text-emerald-600 mb-6"
  }, screenerSession.subtests[screenerSession.currentIndex]?.replace(/^./, c => c.toUpperCase())), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-slate-100 rounded-full h-2 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-emerald-500 h-2 rounded-full transition-all duration-500",
    style: {
      width: `${Math.round(screenerSession.currentIndex / screenerSession.subtests.length * 100)}%`
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, screenerSession.currentIndex, " of ", screenerSession.subtests.length, " subtests complete"))), screenerSession && screenerSession.status === 'complete' && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full border-4 border-violet-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-violet-200"
  }, /*#__PURE__*/React.createElement(Award, {
    size: 32
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-black text-slate-800"
  }, t('common.screening_complete')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm mt-1"
  }, screenerSession.student, " \u2014 Grade ", screenerSession.grade, " \u2014 Form ", screenerSession.form)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 mb-6"
  }, screenerSession.results.map((r, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-700 capitalize"
  }, r.activity), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-600"
  }, r.correct, "/", r.total), /*#__PURE__*/React.createElement("span", {
    className: `text-sm font-bold px-2 py-0.5 rounded-full ${r.accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' : r.accuracy >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`
  }, r.accuracy, "%"), r.itemsPerMin > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, r.itemsPerMin, " items/min"))))), (() => {
    const risk = classifyScreeningRisk(screenerSession.results);
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center p-4 rounded-xl border-2 mb-6",
      style: {
        background: risk.bg,
        borderColor: risk.border
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-3xl mb-1"
    }, risk.emoji), /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-bold",
      style: {
        color: risk.color
      }
    }, risk.label), /*#__PURE__*/React.createElement("p", {
      className: `text-4xl font-black ${risk.tier === 1 ? 'text-emerald-600' : risk.tier === 2 ? 'text-amber-600' : 'text-red-600'}`
    }, risk.avgAccuracy, "%"), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mt-1"
    }, t('glossary_health.composite_accuracy')), risk.reasons.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 space-y-1"
    }, risk.reasons.map((r, ri) => /*#__PURE__*/React.createElement("p", {
      key: ri,
      className: "text-xs",
      style: {
        color: risk.color
      }
    }, r))));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, rosterQueue.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: advanceRoster,
    className: "flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-colors"
  }, "\u25B6 Next Student (", rosterQueue[0], ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setScreenerSession(null);
      setRosterQueue([]);
    },
    className: `${rosterQueue.length > 0 ? 'flex-1' : 'w-full'} py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg transition-colors`
  }, rosterQueue.length > 0 ? 'Skip / Done' : 'Done')), /*#__PURE__*/React.createElement("button", {
    onClick: exportScreeningCSV,
    className: "w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
  }, "\uD83D\uDCCA Export Screening CSV"))), gameMode === 'wordsearch' && gameData && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-white p-6 rounded-xl border-2 border-teal-200 shadow-md animate-in fade-in slide-in-from-top-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4 border-b border-slate-100 pb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-teal-800 text-lg flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 20
  }), " ", t('glossary.word_search_title')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_word_search_answers'),
    onClick: handleToggleShowWordSearchAnswers,
    className: `text-xs flex items-center gap-1 px-3 py-1 rounded-full font-bold transition-colors ${showWordSearchAnswers ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
  }, showWordSearchAnswers ? /*#__PURE__*/React.createElement(Eye, {
    size: 14
  }) : /*#__PURE__*/React.createElement(MousePointerClick, {
    size: 14
  }), showWordSearchAnswers ? t('glossary.hide_answers') : t('glossary.show_answers')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    onClick: handlePrintGame,
    className: "text-xs flex items-center gap-1 bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-bold hover:bg-teal-200 transition-colors"
  }, /*#__PURE__*/React.createElement(Printer, {
    size: 14
  }), " ", t('glossary.print_puzzle')), /*#__PURE__*/React.createElement("button", {
    onClick: handleSetGameModeToNull,
    className: "text-slate-600 hover:text-slate-600 p-1",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  })))), /*#__PURE__*/React.createElement("div", {
    id: "printable-game-area",
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "no-print text-xs text-slate-600 mb-2 italic"
  }, t('glossary.word_search_instructions')), /*#__PURE__*/React.createElement("h2", {
    className: "hidden print-only font-bold text-xl mb-4"
  }, t('glossary.word_search_title')), /*#__PURE__*/React.createElement("div", {
    className: "inline-block border-2 border-slate-800 p-1 bg-white"
  }, gameData.grid.map((row, r) => /*#__PURE__*/React.createElement("div", {
    key: r,
    className: "flex grid-row"
  }, row.map((char, c) => {
    const isAnswer = gameData.solutions && gameData.solutions.includes(`${r}-${c}`);
    const highlightClass = showWordSearchAnswers && isAnswer ? 'bg-green-200 text-green-900 font-extrabold' : selectedLetters.has(`${r}-${c}`) ? 'bg-yellow-200 text-black' : 'bg-white text-slate-700 hover:bg-slate-50';
    return /*#__PURE__*/React.createElement("div", {
      key: c,
      onClick: () => toggleLetterSelection(r, c),
      className: `w-8 h-8 sm:w-9 sm:h-9 border border-slate-400 flex items-center justify-center font-mono text-sm sm:text-base font-bold cursor-pointer select-none transition-colors grid-cell ${highlightClass}`
    }, char);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 w-full max-w-md"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 text-center"
  }, t('glossary.word_search_find')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-x-6 gap-y-2 word-list"
  }, gameData.words.map((word, i) => {
    const isFound = foundWords.has(word);
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: `
                                                        text-sm font-medium px-2 py-1 rounded transition-all flex items-center gap-1 print:bg-transparent print:p-0
                                                        ${isFound ? 'bg-green-100 text-green-800 line-through opacity-70 decoration-green-600' : 'text-slate-700 bg-slate-100'}
                                                    `
    }, isFound && /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 12,
      className: "inline"
    }), word);
  }))))), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    "data-help-key": "glossary_add_term",
    className: "flex gap-2 mb-4 bg-white p-3 rounded-lg border border-slate-400 shadow-sm items-center animate-in fade-in slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-2 rounded-full text-indigo-600"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 16
  })), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_glossary_image_style'),
    "data-help-key": "glossary_image_style",
    type: "text",
    value: glossaryImageStyle,
    onChange: e => setGlossaryImageStyle(e.target.value),
    placeholder: t('glossary.style_placeholder'),
    className: "w-1/3 text-sm border-r border-slate-200 pr-2 mr-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent placeholder:text-slate-600 rounded px-2",
    disabled: isAddingTerm
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_new_glossary_term'),
    type: "text",
    value: newGlossaryTerm,
    onChange: e => setNewGlossaryTerm(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handleAddGlossaryTerm(),
    placeholder: t('glossary.add_term_placeholder'),
    className: "flex-grow text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent placeholder:text-slate-600 rounded px-2",
    disabled: isAddingTerm
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.add_glossary_term'),
    onClick: handleAddGlossaryTerm,
    disabled: !newGlossaryTerm.trim() || isAddingTerm,
    className: "text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  }, isAddingTerm ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    className: "text-yellow-400 fill-current"
  }), isAddingTerm ? t('glossary.defining') : t('glossary.add_term'))), (glossaryHealthCheck || isRunningHealthCheck) && activeView === 'glossary' && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm overflow-hidden",
    "data-help-key": "glossary_health_check"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: handleToggleShowHealthCheckPanel,
    className: "w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors cursor-pointer",
    role: "button",
    tabIndex: 0
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83D\uDCCA"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-amber-900 text-sm"
  }, t('glossary_health.composite_accuracy') || 'Glossary Health Check'), isRunningHealthCheck && /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin text-amber-600"
  }), glossaryHealthCheck && !glossaryHealthCheck.error && !isRunningHealthCheck && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full font-medium"
  }, glossaryHealthCheck.overallScore ? `${glossaryHealthCheck.overallScore}/5` : '', " \u2014 ", glossaryHealthCheck.definitionGradeLevel || 'Analyzed')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.re_run_analysis'),
    onClick: e => {
      e.stopPropagation();
      if (generatedContent?.type === 'glossary' && Array.isArray(generatedContent?.data)) {
        const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
        runGlossaryHealthCheck(generatedContent?.data, history.slice().reverse().find(h => h && h.type === 'analysis')?.data?.originalText || inputText || '');
      }
    },
    disabled: isRunningHealthCheck,
    className: "text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-200/50 hover:bg-amber-300/50 px-2 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1",
    title: t('common.re_run_analysis')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10
  }), " Re-analyze"), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.dismiss_analysis'),
    onClick: e => {
      e.stopPropagation();
      setGlossaryHealthCheck(null);
      setShowHealthCheckPanel(false);
    },
    className: "text-xs text-amber-400 hover:text-amber-700 p-0.5 rounded-full hover:bg-amber-200/50 transition-colors",
    title: t('common.dismiss_analysis')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 16,
    className: `text-amber-600 transition-transform ${showHealthCheckPanel ? 'rotate-180' : ''}`
  }))), showHealthCheckPanel && glossaryHealthCheck && !glossaryHealthCheck.error && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-4 space-y-3 border-t border-amber-200/50 animate-in slide-in-from-top-2 duration-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-amber-800 italic pt-2"
  }, glossaryHealthCheck.summary), glossaryHealthCheck.definitionGradeLevel && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-28 shrink-0"
  }, t('glossary_health.grade_level')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-grow"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-sm font-bold px-2.5 py-0.5 rounded-full ${glossaryHealthCheck.gradeAppropriate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`
  }, glossaryHealthCheck.definitionGradeLevel), glossaryHealthCheck.gradeAppropriate ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-emerald-600"
  }, "\u2713 Appropriate") : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-600"
  }, "\u26A0 May need adjustment"))), glossaryHealthCheck.tierAudit && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase"
  }, t('glossary_health.vocabulary_tiers')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex flex-wrap gap-1.5"
  }, (Array.isArray(glossaryHealthCheck.tierAudit.tier2) ? glossaryHealthCheck.tierAudit.tier2 : []).map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: `t2-${i}`,
    className: "text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"
  }, "Tier 2: ", t)), (Array.isArray(glossaryHealthCheck.tierAudit.tier3) ? glossaryHealthCheck.tierAudit.tier3 : []).map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: `t3-${i}`,
    className: "text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium"
  }, "Tier 3: ", t))), Array.isArray(glossaryHealthCheck.tierAudit.notes) && glossaryHealthCheck.tierAudit.notes.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 space-y-0.5"
  }, glossaryHealthCheck.tierAudit.notes.map((note, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-xs text-slate-600 italic"
  }, "\uD83D\uDCA1 ", typeof note === 'string' ? note : JSON.stringify(note)))), typeof glossaryHealthCheck.tierAudit.notes === 'string' && glossaryHealthCheck.tierAudit.notes.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 italic"
  }, "\uD83D\uDCA1 ", glossaryHealthCheck.tierAudit.notes))), Array.isArray(glossaryHealthCheck.coverageGaps) && glossaryHealthCheck.coverageGaps.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase"
  }, t('glossary_health.suggested_terms')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 space-y-1"
  }, glossaryHealthCheck.coverageGaps.map((gap, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 bg-white/60 rounded-md px-2.5 py-1.5 border border-amber-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-semibold text-slate-800"
  }, "\"", gap.term, "\""), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600 flex-grow"
  }, gap.reason), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      const addedTerm = gap.term;
      await handleQuickAddGlossary(addedTerm, true);
      setGlossaryHealthCheck(prev => {
        if (!prev || !Array.isArray(prev.coverageGaps)) return prev;
        return {
          ...prev,
          coverageGaps: prev.coverageGaps.filter(g => g.term !== addedTerm)
        };
      });
      const allTerms = generatedContent?.data || [];
      const srcText = history.slice().reverse().find(h => h && h.type === 'analysis')?.data?.originalText || inputText || '';
      const replacement = await fetchReplacementSuggestion(allTerms, addedTerm, srcText);
      if (replacement) {
        setGlossaryHealthCheck(prev => {
          if (!prev) return prev;
          const gaps = Array.isArray(prev.coverageGaps) ? [...prev.coverageGaps] : [];
          gaps.push(replacement);
          return {
            ...prev,
            coverageGaps: gaps
          };
        });
      }
    },
    className: "text-[11px] font-bold bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5 shrink-0",
    title: t('common.add_this_term_to_glossary')
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 10
  }), " Add"))))), Array.isArray(glossaryHealthCheck.conceptConnections) && glossaryHealthCheck.conceptConnections.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase"
  }, t('glossary_health.concept_web')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 space-y-1.5"
  }, glossaryHealthCheck.conceptConnections.map((cc, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-white/60 rounded-md px-2.5 py-1.5 border border-amber-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-indigo-700"
  }, "\uD83D\uDD17 ", cc.concept), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, "\u2192"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, (cc.connectedTerms || []).join(', '))), cc.note && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mt-0.5"
  }, cc.note)))))), showHealthCheckPanel && glossaryHealthCheck && glossaryHealthCheck.error && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-3 text-sm text-amber-600 italic border-t border-amber-200/50 pt-2"
  }, "Analysis could not be completed. Click \"Re-analyze\" to try again."), showHealthCheckPanel && isRunningHealthCheck && !glossaryHealthCheck && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-3 text-sm text-amber-600 border-t border-amber-200/50 pt-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }), " Analyzing glossary quality...")), !isMemoryGame && /*#__PURE__*/React.createElement("div", {
    "data-help-key": "glossary_terms_table",
    className: "overflow-hidden rounded-lg border border-slate-400 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-center text-sm"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-slate-100 text-slate-600 font-semibold"
  }, /*#__PURE__*/React.createElement("tr", null, isEditingGlossary && /*#__PURE__*/React.createElement("th", {
    className: "p-4 border-b border-slate-200 w-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.text_field'),
    type: "checkbox",
    className: "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer",
    checked: generatedContent?.data.length > 0 && generatedContent?.data.every(i => i.isSelected !== false),
    onChange: handleGlossarySelectAll,
    title: t('glossary.tooltips.select_all_highlight')
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-normal leading-none text-slate-600"
  }, t('glossary.highlight_label')))), /*#__PURE__*/React.createElement("th", {
    className: "p-4 border-b border-slate-200 min-w-[150px]"
  }, t('glossary.table_term')), /*#__PURE__*/React.createElement("th", {
    className: "p-4 border-b border-slate-200 min-w-[200px]"
  }, t('glossary.table_def')), displayLanguages.map(lang => /*#__PURE__*/React.createElement("th", {
    key: lang,
    className: "p-4 border-b border-slate-200 min-w-[150px] text-indigo-600 text-center"
  }, lang)))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100"
  }, filteredGlossaryData.map(item => {
    const idx = item._originalIdx;
    const isTier2 = item.tier === 'Academic';
    const isTier3 = item.tier === 'Domain-Specific';
    return /*#__PURE__*/React.createElement("tr", {
      key: idx,
      className: "hover:bg-slate-50 group/row"
    }, isEditingGlossary && /*#__PURE__*/React.createElement("td", {
      className: "p-4 border-b border-slate-100 text-center align-top"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": t('common.toggle_is_selected_false'),
      type: "checkbox",
      className: "mt-1.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer",
      checked: item.isSelected !== false,
      onChange: () => handleGlossarySelectionChange(idx),
      title: t('glossary.tooltips.select_highlight')
    })), /*#__PURE__*/React.createElement("td", {
      className: "p-4 font-bold text-slate-800 align-top min-w-[200px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2 items-center"
    }, !isEditingGlossary && isTeacherMode && item.tier && /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border mb-1 ${isTier2 ? 'bg-blue-50 text-blue-700 border-blue-200' : isTier3 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`
    }, isTier2 ? t('glossary.label_tier2') : isTier3 ? t('glossary.label_tier3') : item.tier), isEditingGlossary ? /*#__PURE__*/React.createElement("div", {
      className: "w-full flex flex-col gap-2"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": t('common.selection'),
      value: item.tier || '',
      onChange: e => handleGlossaryChange(idx, 'tier', e.target.value),
      className: "text-[11px] font-bold uppercase tracking-wider w-full border border-slate-400 rounded px-1 py-1 outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-600",
      "data-help-key": "glossary_edit_tier"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, t('glossary.edit_tier_placeholder')), /*#__PURE__*/React.createElement("option", {
      value: "Academic"
    }, t('glossary.edit_tier_academic')), /*#__PURE__*/React.createElement("option", {
      value: "Domain-Specific"
    }, t('glossary.edit_tier_domain'))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-2 w-full"
    }, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('glossary.edit_term') || 'Edit glossary term',
      value: item.term,
      onChange: e => handleGlossaryChange(idx, 'term', e.target.value),
      rows: getRows(item.term, 25),
      className: "w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200 resize-y text-sm font-bold text-center"
    }), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.delete'),
      onClick: () => handleDeleteGlossaryItem(idx),
      className: "p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded transition-colors shrink-0",
      title: t('glossary.tooltips.delete_term')
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 14
    })))) : /*#__PURE__*/React.createElement("div", {
      className: "px-2 py-1 font-bold text-slate-800 whitespace-pre-wrap text-center"
    }, item.term), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 px-1"
    }, item.image ? /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative group/image inline-block w-fit"
    }, /*#__PURE__*/React.createElement("img", {
      loading: "lazy",
      src: item.image,
      alt: `${item.term} icon`,
      style: {
        width: `${glossaryImageSize}px`,
        height: `${glossaryImageSize}px`
      },
      className: "rounded-lg border border-slate-400 object-contain bg-white shadow-sm transition-all duration-200",
      decoding: "async"
    }), /*#__PURE__*/React.createElement("div", {
      className: "absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity gap-2 backdrop-blur-[1px]"
    }, /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.refresh'),
      "aria-busy": !!isGeneratingTermImage[idx],
      onClick: () => handleGenerateTermImage(idx, item.term),
      className: "text-white p-1.5 hover:text-yellow-300 bg-white/10 rounded-full transition-colors",
      title: t('common.regenerate'),
      disabled: isGeneratingTermImage[idx],
      "data-help-key": "glossary_regen_image"
    }, isGeneratingTermImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12
    })), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.delete'),
      onClick: () => handleDeleteTermImage(idx),
      className: "text-white p-1.5 hover:text-red-300 bg-white/10 rounded-full transition-colors",
      title: t('common.delete'),
      "data-help-key": "glossary_delete_image"
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 12
    })))), isEditingGlossary && /*#__PURE__*/React.createElement("div", {
      className: "animate-in slide-in-from-top-2 mt-1"
    }, /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.refresh'),
      onClick: () => handleRefineGlossaryImage(idx, "Remove all text, labels, letters, and words from the image. Keep the illustration clean."),
      disabled: isGeneratingTermImage[idx],
      className: "w-full mb-1.5 text-[11px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-2 py-1 rounded flex items-center justify-center gap-1 transition-colors font-bold shadow-sm",
      title: t('glossary.auto_remove_tooltip'),
      "data-help-key": "glossary_remove_words"
    }, isGeneratingTermImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(Ban, {
      size: 10
    }), " ", t('glossary.remove_words_btn')), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": t('common.glossary_custom_edit_placeholder'),
      type: "text",
      value: glossaryRefinementInputs[idx] || '',
      onChange: e => setGlossaryRefinementInputs(prev => ({
        ...prev,
        [idx]: e.target.value
      })),
      placeholder: t('glossary.custom_edit_placeholder'),
      className: "text-[11px] border border-yellow-300 rounded px-1 py-0.5 w-20 focus:w-full transition-all focus:outline-none focus:ring-1 focus:ring-yellow-400",
      onKeyDown: e => e.key === 'Enter' && handleRefineGlossaryImage(idx)
    }), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.refresh'),
      onClick: () => handleRefineGlossaryImage(idx),
      disabled: !glossaryRefinementInputs[idx] || isGeneratingTermImage[idx],
      className: "bg-yellow-400 text-yellow-900 p-1 rounded hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
      title: t('glossary.tooltips.apply_edit')
    }, isGeneratingTermImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(Send, {
      size: 10
    }))), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-slate-600 italic mt-0.5 block"
    }, t('visuals.nano_active_status')))) : /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.refresh'),
      onClick: () => handleGenerateTermImage(idx, item.term),
      disabled: isGeneratingTermImage[idx],
      className: "text-[11px] flex items-center gap-1.5 bg-white text-indigo-500 border border-indigo-100 px-2 py-1 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm opacity-60 hover:opacity-100",
      title: t('glossary.tooltips.generate_icon')
    }, isGeneratingTermImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(ImageIcon, {
      size: 10
    }), isGeneratingTermImage[idx] ? t('glossary.creating_icon') : t('glossary.create_icon'))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 opacity-50 group-hover/row:opacity-100 transition-opacity mt-1"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handleSpeak(item.term, `term-${idx}`),
      disabled: isGeneratingAudio && playingContentId !== `term-${idx}`,
      className: `p-1 rounded-full transition-colors flex-shrink-0 ${playingContentId === `term-${idx}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`,
      "data-help-key": "glossary_speak_term"
    }, playingContentId === `term-${idx}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin"
    }) : playingContentId === `term-${idx}` ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 14
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDownloadAudio(item.term, `term-${idx}-audio`, `dl-term-${idx}`),
      disabled: downloadingContentId === `dl-term-${idx}`,
      className: "text-slate-600 hover:text-indigo-600 p-1 rounded-full transition-colors",
      "data-help-key": "glossary_download_audio"
    }, downloadingContentId === `dl-term-${idx}` ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(Download, {
      size: 14
    }))))), /*#__PURE__*/React.createElement("td", {
      className: "p-4 text-slate-600 align-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2 items-center"
    }, isEditingGlossary ? /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('glossary.edit_definition') || 'Edit definition',
      value: item.def,
      onChange: e => handleGlossaryChange(idx, 'def', e.target.value),
      rows: getRows(item.def, 45),
      className: "w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200 resize-y text-sm text-center"
    }) : /*#__PURE__*/React.createElement("div", {
      className: "px-2 py-1 text-slate-600 whitespace-pre-wrap"
    }, currentUiLanguage !== 'English' && /*#__PURE__*/React.createElement("span", {
      className: "block font-bold text-indigo-900 text-xs mb-1 uppercase tracking-wide"
    }, item.term), item.def), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 opacity-50 group-hover/row:opacity-100 transition-opacity"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handleSpeak(item.def, `def-${idx}`),
      disabled: isGeneratingAudio && playingContentId !== `def-${idx}`,
      className: `p-1 rounded-full transition-colors flex-shrink-0 ${playingContentId === `def-${idx}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`
    }, playingContentId === `def-${idx}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin"
    }) : playingContentId === `def-${idx}` ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 14
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDownloadAudio(item.def, `def-${idx}-audio`, `dl-def-${idx}`),
      disabled: downloadingContentId === `dl-def-${idx}`,
      className: "text-slate-600 hover:text-indigo-600 p-1 rounded-full transition-colors"
    }, downloadingContentId === `dl-def-${idx}` ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(Download, {
      size: 14
    }))), item.etymology ? /*#__PURE__*/React.createElement("details", {
      className: "mt-2 text-xs w-full",
      "data-help-key": "glossary_etymology_info"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer text-indigo-700 font-medium hover:text-indigo-900 select-none"
    }, "\uD83D\uDCDC ", t('glossary.etymology_label') || 'Word roots'), (() => {
      const etyMap = item.etymologyByLang && typeof item.etymologyByLang === 'object' ? item.etymologyByLang : null;
      const displayLang = leveledTextLanguage || 'English';
      const etymologyProse = etyMap && (etyMap[displayLang] || etyMap['English'] || etyMap[Object.keys(etyMap)[0]]) || item.etymology || '';
      return /*#__PURE__*/React.createElement("div", {
        className: "mt-1 pl-4 border-l-2 border-indigo-200 space-y-2"
      }, etyMap && Object.keys(etyMap).length > 1 && /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] uppercase tracking-wide text-indigo-500 font-bold"
      }, displayLang), /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-1"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-slate-700 leading-relaxed italic flex-1"
      }, etymologyProse), /*#__PURE__*/React.createElement("button", {
        onClick: () => handleSpeak(etymologyProse, `etym-${idx}`),
        disabled: isGeneratingAudio && playingContentId !== `etym-${idx}`,
        className: `p-1 rounded-full transition-colors flex-shrink-0 ${playingContentId === `etym-${idx}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`,
        "aria-label": t('glossary.etymology_label') || 'Word roots'
      }, playingContentId === `etym-${idx}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin"
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 12
      }))), (() => {
        const validRoots = Array.isArray(item.roots) ? item.roots.filter(r => r && typeof r.root === 'string' && r.root.trim()) : [];
        if (validRoots.length === 0) return null;
        return /*#__PURE__*/React.createElement("div", {
          className: "space-y-1.5",
          "aria-label": t('glossary.etymology_roots_label') || 'Source roots'
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex flex-wrap gap-1.5 justify-center"
        }, validRoots.map((r, ri) => {
          const related = Array.isArray(r.related) ? r.related.filter(w => typeof w === 'string' && w.trim()) : [];
          return /*#__PURE__*/React.createElement("button", {
            key: ri,
            type: "button",
            onClick: () => handleSpeak(`${r.root}${r.meaning ? ', meaning ' + r.meaning : ''}${related.length > 0 ? '. Related words: ' + related.join(', ') : ''}`, `root-${idx}-${ri}`),
            title: `${r.lang || ''}${related.length > 0 ? (r.lang ? ' · ' : '') + 'Related: ' + related.join(', ') : ''}`.trim(),
            className: "inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 hover:bg-indigo-100 hover:border-indigo-300 transition-colors text-indigo-900",
            "aria-label": `${r.root}${r.lang ? ' (' + r.lang + ')' : ''}${r.meaning ? ', meaning ' + r.meaning : ''}${related.length > 0 ? ', related to ' + related.join(', ') : ''}`
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-bold"
          }, r.root), r.lang && /*#__PURE__*/React.createElement("span", {
            className: "text-[10px] text-indigo-600/80 uppercase tracking-wide"
          }, r.lang), r.meaning && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-600"
          }, "= ", r.meaning));
        })), (() => {
          const allRelated = [];
          const seen = new Set();
          validRoots.forEach(r => {
            if (Array.isArray(r.related)) r.related.forEach(w => {
              const k = String(w || '').trim();
              if (k && !seen.has(k.toLowerCase())) {
                seen.add(k.toLowerCase());
                allRelated.push(k);
              }
            });
          });
          if (allRelated.length === 0) return null;
          return /*#__PURE__*/React.createElement("div", {
            className: "text-[11px] text-slate-600 leading-snug pl-1"
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-semibold text-slate-700"
          }, t('glossary.related_words_label') || 'Related words:'), ' ', allRelated.slice(0, 6).map((w, wi) => /*#__PURE__*/React.createElement("span", {
            key: wi
          }, wi > 0 && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-300"
          }, ", "), /*#__PURE__*/React.createElement("span", {
            className: "font-medium text-indigo-800"
          }, w))));
        })());
      })());
    })()) : includeEtymology ? /*#__PURE__*/React.createElement("button", {
      onClick: () => handleGenerateTermEtymology(idx, item.term),
      disabled: isGeneratingEtymology[idx],
      "aria-busy": !!isGeneratingEtymology[idx],
      "aria-live": "polite",
      className: "mt-2 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1",
      "data-help-key": "glossary_etymology_info",
      title: t('glossary.etymology_label') || 'Word roots'
    }, isGeneratingEtymology[idx] ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12,
      className: "animate-spin"
    }), " ", t('glossary.actions.generating_etymology') || 'Finding roots…') : /*#__PURE__*/React.createElement(React.Fragment, null, "\uD83D\uDCDC ", t('glossary.actions.show_etymology') || 'Show word roots')) : null)), displayLanguages.map(lang => /*#__PURE__*/React.createElement("td", {
      key: lang,
      className: "p-4 text-slate-600 italic border-l border-slate-50 align-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2",
      dir: isRtlLang(lang) ? 'rtl' : 'ltr'
    }, isEditingGlossary ? /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('glossary.edit_translation') || 'Edit translation',
      value: item.translations?.[lang] || "",
      onChange: e => handleGlossaryChange(idx, 'translations', e.target.value, lang),
      rows: getRows(item.translations?.[lang], 30),
      className: "w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200 resize-y text-sm italic text-center"
    }) : /*#__PURE__*/React.createElement("div", {
      className: "px-2 py-1 text-slate-600 italic whitespace-pre-wrap text-center"
    }, item.translations?.[lang] || ""), item.translations?.[lang] && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 opacity-50 group-hover/row:opacity-100 transition-opacity justify-center",
      dir: "ltr"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handleSpeak(item.translations[lang], `trans-${idx}-${lang}`),
      disabled: isGeneratingAudio && playingContentId !== `trans-${idx}-${lang}`,
      className: `p-1 rounded-full transition-colors flex-shrink-0 ${playingContentId === `trans-${idx}-${lang}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`
    }, playingContentId === `trans-${idx}-${lang}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin"
    }) : playingContentId === `trans-${idx}-${lang}` ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 14
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDownloadAudio(item.translations[lang], `trans-${idx}-${lang}-audio`, `dl-trans-${idx}-${lang}`),
      disabled: downloadingContentId === `dl-trans-${idx}-${lang}`,
      className: "text-slate-600 hover:text-indigo-600 p-1 rounded-full transition-colors"
    }, downloadingContentId === `dl-trans-${idx}-${lang}` ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(Download, {
      size: 14
    }))), item.translations?.[lang] && (() => {
      const etyLangProse = item.etymologyByLang && typeof item.etymologyByLang === 'object' ? item.etymologyByLang[lang] : null;
      const hasOwnProse = typeof etyLangProse === 'string' && etyLangProse.trim() && etyLangProse.trim() !== 'NONE';
      const hasEnglishEty = !!(item.etymology || item.etymologyByLang && (item.etymologyByLang.English || Object.keys(item.etymologyByLang).length > 0));
      const ETYMOLOGY_LABELS = {
        Spanish: {
          roots: 'Raíces',
          show: 'Ver raíces',
          loading: 'Buscando raíces…',
          related: 'Palabras relacionadas:'
        },
        French: {
          roots: 'Racines',
          show: 'Voir les racines',
          loading: 'Recherche en cours…',
          related: 'Mots apparentés :'
        },
        German: {
          roots: 'Wortwurzeln',
          show: 'Wortwurzeln zeigen',
          loading: 'Wurzeln werden gesucht…',
          related: 'Verwandte Wörter:'
        },
        Italian: {
          roots: 'Radici',
          show: 'Mostra radici',
          loading: 'Ricerca radici…',
          related: 'Parole correlate:'
        },
        Portuguese: {
          roots: 'Raízes',
          show: 'Ver raízes',
          loading: 'Buscando raízes…',
          related: 'Palavras relacionadas:'
        },
        Dutch: {
          roots: 'Woordwortels',
          show: 'Woordwortels tonen',
          loading: 'Wortels zoeken…',
          related: 'Verwante woorden:'
        },
        Russian: {
          roots: 'Корни',
          show: 'Показать корни',
          loading: 'Поиск корней…',
          related: 'Родственные слова:'
        },
        Polish: {
          roots: 'Rdzenie',
          show: 'Pokaż rdzenie',
          loading: 'Szukanie rdzeni…',
          related: 'Słowa pokrewne:'
        },
        Ukrainian: {
          roots: 'Корені',
          show: 'Показати корені',
          loading: 'Пошук коренів…',
          related: 'Споріднені слова:'
        },
        Arabic: {
          roots: 'الجذور',
          show: 'عرض جذور الكلمة',
          loading: 'جاري البحث…',
          related: 'كلمات ذات صلة:'
        },
        Hebrew: {
          roots: 'שורשים',
          show: 'הצג שורשי מילה',
          loading: 'מחפש שורשים…',
          related: 'מילים קשורות:'
        },
        Hindi: {
          roots: 'शब्द-मूल',
          show: 'शब्द-मूल दिखाएँ',
          loading: 'मूल खोज रहे हैं…',
          related: 'संबंधित शब्द:'
        },
        Chinese: {
          roots: '词根',
          show: '显示词根',
          loading: '正在查找词根…',
          related: '相关词语：'
        },
        Japanese: {
          roots: '語源',
          show: '語源を表示',
          loading: '語源を検索中…',
          related: '関連語：'
        },
        Korean: {
          roots: '어근',
          show: '어근 보기',
          loading: '어근 검색 중…',
          related: '관련 단어:'
        },
        Vietnamese: {
          roots: 'Gốc từ',
          show: 'Xem gốc từ',
          loading: 'Đang tìm gốc từ…',
          related: 'Từ liên quan:'
        },
        Turkish: {
          roots: 'Kökler',
          show: 'Kökleri göster',
          loading: 'Kökler aranıyor…',
          related: 'İlgili kelimeler:'
        },
        Swahili: {
          roots: 'Mizizi',
          show: 'Onyesha mizizi',
          loading: 'Inatafuta mizizi…',
          related: 'Maneno yanayohusiana:'
        },
        Somali: {
          roots: 'Xididada',
          show: 'Muuji xididada',
          loading: 'Raadinta xididada…',
          related: 'Ereyada la xidhiidha:'
        },
        Tagalog: {
          roots: 'Ugat ng salita',
          show: 'Ipakita ang ugat',
          loading: 'Naghahanap ng ugat…',
          related: 'Mga kaugnay na salita:'
        }
      };
      const langLabels = ETYMOLOGY_LABELS[lang] || null;
      const rootsLabel = langLabels?.roots || t('glossary.etymology_label') || 'Word roots';
      const showLabel = langLabels?.show || t('glossary.actions.show_etymology') || 'Show word roots';
      const loadingLabel = langLabels?.loading || t('glossary.actions.generating_etymology') || 'Finding roots…';
      const relatedLabel = langLabels?.related || t('glossary.related_words_label') || 'Related words:';
      const ORIGIN_LANG_LOCALIZED = {
        Spanish: {
          Latin: 'latín',
          Greek: 'griego',
          'Old English': 'inglés antiguo',
          French: 'francés',
          'Old French': 'francés antiguo',
          Germanic: 'germánico',
          'Proto-Germanic': 'protogermánico',
          Sanskrit: 'sánscrito',
          Arabic: 'árabe',
          Hebrew: 'hebreo',
          Norse: 'nórdico',
          'Old Norse': 'nórdico antiguo'
        },
        French: {
          Latin: 'latin',
          Greek: 'grec',
          'Old English': 'vieil anglais',
          French: 'français',
          'Old French': 'ancien français',
          Germanic: 'germanique',
          'Proto-Germanic': 'proto-germanique',
          Sanskrit: 'sanskrit',
          Arabic: 'arabe',
          Hebrew: 'hébreu',
          Norse: 'norrois',
          'Old Norse': 'vieux norrois'
        },
        German: {
          Latin: 'lateinisch',
          Greek: 'griechisch',
          'Old English': 'altenglisch',
          French: 'französisch',
          'Old French': 'altfranzösisch',
          Germanic: 'germanisch',
          'Proto-Germanic': 'urgermanisch',
          Sanskrit: 'sanskrit',
          Arabic: 'arabisch',
          Hebrew: 'hebräisch',
          Norse: 'nordisch',
          'Old Norse': 'altnordisch'
        },
        Italian: {
          Latin: 'latino',
          Greek: 'greco',
          'Old English': 'inglese antico',
          French: 'francese',
          'Old French': 'francese antico',
          Germanic: 'germanico',
          'Proto-Germanic': 'protogermanico',
          Sanskrit: 'sanscrito',
          Arabic: 'arabo',
          Hebrew: 'ebraico',
          Norse: 'norreno',
          'Old Norse': 'norreno antico'
        },
        Portuguese: {
          Latin: 'latim',
          Greek: 'grego',
          'Old English': 'inglês antigo',
          French: 'francês',
          'Old French': 'francês antigo',
          Germanic: 'germânico',
          'Proto-Germanic': 'protogermânico',
          Sanskrit: 'sânscrito',
          Arabic: 'árabe',
          Hebrew: 'hebraico',
          Norse: 'nórdico',
          'Old Norse': 'nórdico antigo'
        },
        Dutch: {
          Latin: 'Latijn',
          Greek: 'Grieks',
          'Old English': 'Oudengels',
          French: 'Frans',
          'Old French': 'Oudfrans',
          Germanic: 'Germaans',
          'Proto-Germanic': 'Proto-Germaans',
          Sanskrit: 'Sanskriet',
          Arabic: 'Arabisch',
          Hebrew: 'Hebreeuws',
          Norse: 'Noors',
          'Old Norse': 'Oudnoors'
        },
        Russian: {
          Latin: 'латинский',
          Greek: 'греческий',
          'Old English': 'древнеанглийский',
          French: 'французский',
          'Old French': 'старофранцузский',
          Germanic: 'германский',
          'Proto-Germanic': 'прагерманский',
          Sanskrit: 'санскрит',
          Arabic: 'арабский',
          Hebrew: 'иврит',
          Norse: 'норвежский',
          'Old Norse': 'древнескандинавский'
        },
        Polish: {
          Latin: 'łaciński',
          Greek: 'grecki',
          'Old English': 'staroangielski',
          French: 'francuski',
          'Old French': 'starofrancuski',
          Germanic: 'germański',
          'Proto-Germanic': 'pragermański',
          Sanskrit: 'sanskryt',
          Arabic: 'arabski',
          Hebrew: 'hebrajski',
          Norse: 'nordycki',
          'Old Norse': 'staronordycki'
        },
        Ukrainian: {
          Latin: 'латинська',
          Greek: 'грецька',
          'Old English': 'давньоанглійська',
          French: 'французька',
          'Old French': 'старофранцузька',
          Germanic: 'германська',
          'Proto-Germanic': 'прагерманська',
          Sanskrit: 'санскрит',
          Arabic: 'арабська',
          Hebrew: 'іврит'
        },
        Arabic: {
          Latin: 'اللاتينية',
          Greek: 'اليونانية',
          'Old English': 'الإنجليزية القديمة',
          French: 'الفرنسية',
          'Old French': 'الفرنسية القديمة',
          Germanic: 'الجرمانية',
          Sanskrit: 'السنسكريتية',
          Arabic: 'العربية',
          Hebrew: 'العبرية',
          Norse: 'الإسكندنافية'
        },
        Hebrew: {
          Latin: 'לטינית',
          Greek: 'יוונית',
          'Old English': 'אנגלית עתיקה',
          French: 'צרפתית',
          'Old French': 'צרפתית עתיקה',
          Germanic: 'גרמאנית',
          Sanskrit: 'סנסקריט',
          Arabic: 'ערבית',
          Hebrew: 'עברית',
          Norse: 'נורדית'
        },
        Hindi: {
          Latin: 'लैटिन',
          Greek: 'ग्रीक',
          'Old English': 'पुरानी अंग्रेज़ी',
          French: 'फ्रेंच',
          Germanic: 'जर्मेनिक',
          Sanskrit: 'संस्कृत',
          Arabic: 'अरबी',
          Hebrew: 'हिब्रू',
          Norse: 'नॉर्स'
        },
        Chinese: {
          Latin: '拉丁语',
          Greek: '希腊语',
          'Old English': '古英语',
          French: '法语',
          'Old French': '古法语',
          Germanic: '日耳曼语',
          'Proto-Germanic': '原始日耳曼语',
          Sanskrit: '梵语',
          Arabic: '阿拉伯语',
          Hebrew: '希伯来语',
          Norse: '北欧语',
          'Old Norse': '古诺尔斯语'
        },
        Japanese: {
          Latin: 'ラテン語',
          Greek: 'ギリシャ語',
          'Old English': '古英語',
          French: 'フランス語',
          'Old French': '古フランス語',
          Germanic: 'ゲルマン語',
          Sanskrit: 'サンスクリット語',
          Arabic: 'アラビア語',
          Hebrew: 'ヘブライ語',
          Norse: 'ノルド語',
          'Old Norse': '古ノルド語'
        },
        Korean: {
          Latin: '라틴어',
          Greek: '그리스어',
          'Old English': '고대 영어',
          French: '프랑스어',
          'Old French': '고대 프랑스어',
          Germanic: '게르만어',
          Sanskrit: '산스크리트어',
          Arabic: '아랍어',
          Hebrew: '히브리어',
          Norse: '노르드어',
          'Old Norse': '고대 노르드어'
        },
        Vietnamese: {
          Latin: 'tiếng La-tinh',
          Greek: 'tiếng Hy Lạp',
          'Old English': 'tiếng Anh cổ',
          French: 'tiếng Pháp',
          'Old French': 'tiếng Pháp cổ',
          Germanic: 'tiếng Giéc-manh',
          Sanskrit: 'tiếng Phạn',
          Arabic: 'tiếng Ả Rập',
          Hebrew: 'tiếng Hê-brơ'
        },
        Turkish: {
          Latin: 'Latince',
          Greek: 'Yunanca',
          'Old English': 'Eski İngilizce',
          French: 'Fransızca',
          'Old French': 'Eski Fransızca',
          Germanic: 'Germence',
          Sanskrit: 'Sanskritçe',
          Arabic: 'Arapça',
          Hebrew: 'İbranice',
          Norse: 'Norsça',
          'Old Norse': 'Eski Norsça'
        },
        Swahili: {
          Latin: 'Kilatini',
          Greek: 'Kigiriki',
          'Old English': 'Kiingereza cha Kale',
          French: 'Kifaransa',
          Germanic: 'Kijerumani',
          Arabic: 'Kiarabu',
          Hebrew: 'Kiebrania'
        },
        Somali: {
          Latin: 'Laatiin',
          Greek: 'Giriig',
          'Old English': 'Ingiriisi qadiim ah',
          French: 'Faransiis',
          Arabic: 'Carabi',
          Hebrew: 'Cibraani'
        },
        Tagalog: {
          Latin: 'Latin',
          Greek: 'Griyego',
          'Old English': 'Lumang Ingles',
          French: 'Pranses',
          Germanic: 'Germaniko',
          Arabic: 'Arabe',
          Hebrew: 'Hebreo'
        }
      };
      const localizeRoot = function (r) {
        var langLocalized = r.langByLocale && r.langByLocale[lang] || ORIGIN_LANG_LOCALIZED[lang] && ORIGIN_LANG_LOCALIZED[lang][r.lang] || r.lang || '';
        var meaningLocalized = r.meaningByLang && r.meaningByLang[lang] || r.meaning || '';
        return {
          langLocalized: langLocalized,
          meaningLocalized: meaningLocalized
        };
      };
      const validRootsL = Array.isArray(item.roots) ? item.roots.filter(r => r && typeof r.root === 'string' && r.root.trim()) : [];
      if (hasOwnProse) {
        return /*#__PURE__*/React.createElement("details", {
          className: "mt-1 text-xs w-full",
          dir: isRtlLang(lang) ? 'rtl' : 'ltr'
        }, /*#__PURE__*/React.createElement("summary", {
          className: "cursor-pointer text-indigo-700 font-medium hover:text-indigo-900 select-none text-center"
        }, "\uD83D\uDCDC ", rootsLabel), /*#__PURE__*/React.createElement("div", {
          className: "mt-1 pl-3 border-l-2 border-indigo-200 space-y-2"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-start gap-1"
        }, /*#__PURE__*/React.createElement("p", {
          className: "text-slate-700 leading-relaxed italic flex-1 not-italic"
        }, etyLangProse), /*#__PURE__*/React.createElement("button", {
          onClick: () => handleSpeak(etyLangProse, `etym-${idx}-${lang}`),
          disabled: isGeneratingAudio && playingContentId !== `etym-${idx}-${lang}`,
          className: `p-1 rounded-full transition-colors flex-shrink-0 ${playingContentId === `etym-${idx}-${lang}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`,
          "aria-label": rootsLabel
        }, playingContentId === `etym-${idx}-${lang}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
          size: 12,
          className: "animate-spin"
        }) : /*#__PURE__*/React.createElement(Volume2, {
          size: 12
        }))), validRootsL.length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "space-y-1.5",
          "aria-label": t('glossary.etymology_roots_label') || 'Source roots',
          dir: "ltr"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex flex-wrap gap-1.5"
        }, validRootsL.map((r, ri) => {
          const relatedL = Array.isArray(r.related) ? r.related.filter(w => typeof w === 'string' && w.trim()) : [];
          const _loc = localizeRoot(r);
          const _langLoc = _loc.langLocalized;
          const _meaningLoc = _loc.meaningLocalized;
          return /*#__PURE__*/React.createElement("button", {
            key: ri,
            type: "button",
            onClick: () => handleSpeak(`${r.root}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? '. ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`, `root-${idx}-${lang}-${ri}`),
            title: `${_langLoc || ''}${relatedL.length > 0 ? (_langLoc ? ' · ' : '') + relatedLabel + ' ' + relatedL.join(', ') : ''}`.trim(),
            className: "inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 hover:bg-indigo-100 hover:border-indigo-300 transition-colors text-indigo-900",
            "aria-label": `${r.root}${_langLoc ? ' (' + _langLoc + ')' : ''}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? ', ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-bold"
          }, r.root), _langLoc && /*#__PURE__*/React.createElement("span", {
            className: "text-[10px] text-indigo-600/80 uppercase tracking-wide"
          }, _langLoc), _meaningLoc && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-600"
          }, "= ", _meaningLoc));
        })), (() => {
          const allRelL = [];
          const seenL = new Set();
          validRootsL.forEach(r => {
            if (Array.isArray(r.related)) r.related.forEach(w => {
              const k = String(w || '').trim();
              if (k && !seenL.has(k.toLowerCase())) {
                seenL.add(k.toLowerCase());
                allRelL.push(k);
              }
            });
          });
          if (allRelL.length === 0) return null;
          return /*#__PURE__*/React.createElement("div", {
            className: "text-[11px] text-slate-600 leading-snug pl-1"
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-semibold text-slate-700"
          }, relatedLabel), ' ', allRelL.slice(0, 6).map((w, wi) => /*#__PURE__*/React.createElement("span", {
            key: wi
          }, wi > 0 && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-300"
          }, ", "), /*#__PURE__*/React.createElement("span", {
            className: "font-medium text-indigo-800"
          }, w))));
        })())));
      }
      if (validRootsL.length > 0) {
        return /*#__PURE__*/React.createElement("details", {
          className: "mt-1 text-xs w-full",
          dir: isRtlLang(lang) ? 'rtl' : 'ltr'
        }, /*#__PURE__*/React.createElement("summary", {
          className: "cursor-pointer text-indigo-700 font-medium hover:text-indigo-900 select-none text-center"
        }, "\uD83D\uDCDC ", rootsLabel), /*#__PURE__*/React.createElement("div", {
          className: "mt-1 pl-3 border-l-2 border-indigo-200 space-y-2",
          dir: "ltr"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex flex-wrap gap-1.5"
        }, validRootsL.map((r, ri) => {
          const relatedL = Array.isArray(r.related) ? r.related.filter(w => typeof w === 'string' && w.trim()) : [];
          const _loc = localizeRoot(r);
          const _langLoc = _loc.langLocalized;
          const _meaningLoc = _loc.meaningLocalized;
          return /*#__PURE__*/React.createElement("button", {
            key: ri,
            type: "button",
            onClick: () => handleSpeak(`${r.root}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? '. ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`, `root-${idx}-${lang}-${ri}`),
            title: `${_langLoc || ''}${relatedL.length > 0 ? (_langLoc ? ' · ' : '') + relatedLabel + ' ' + relatedL.join(', ') : ''}`.trim(),
            className: "inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 hover:bg-indigo-100 hover:border-indigo-300 transition-colors text-indigo-900",
            "aria-label": `${r.root}${_langLoc ? ' (' + _langLoc + ')' : ''}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? ', ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-bold"
          }, r.root), _langLoc && /*#__PURE__*/React.createElement("span", {
            className: "text-[10px] text-indigo-600/80 uppercase tracking-wide"
          }, _langLoc), _meaningLoc && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-600"
          }, "= ", _meaningLoc));
        })), /*#__PURE__*/React.createElement("button", {
          onClick: () => handleGenerateTermEtymology(idx, item.term),
          disabled: isGeneratingEtymology[idx],
          "aria-busy": !!isGeneratingEtymology[idx],
          className: "mt-1 text-[11px] text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1",
          title: rootsLabel
        }, isGeneratingEtymology[idx] ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
          size: 10,
          className: "animate-spin"
        }), " ", loadingLabel) : /*#__PURE__*/React.createElement(React.Fragment, null, "+ ", showLabel))));
      }
      if (includeEtymology || hasEnglishEty) {
        return /*#__PURE__*/React.createElement("button", {
          onClick: () => handleGenerateTermEtymology(idx, item.term),
          disabled: isGeneratingEtymology[idx],
          "aria-busy": !!isGeneratingEtymology[idx],
          className: "mt-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1 justify-center",
          title: rootsLabel,
          dir: isRtlLang(lang) ? 'rtl' : 'ltr'
        }, isGeneratingEtymology[idx] ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
          size: 12,
          className: "animate-spin"
        }), " ", loadingLabel) : /*#__PURE__*/React.createElement(React.Fragment, null, "\uD83D\uDCDC ", showLabel));
      }
      return null;
    })()))));
  }), generatedContent?.data.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 3 + selectedLanguages.length,
    className: "p-8 text-center text-slate-600 italic"
  }, t('glossary.no_terms'))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.GlossaryView = GlossaryView;
  window.AlloModules.ViewGlossaryModule = true;
})();
