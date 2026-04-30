// Build view_simplified_module.js — extracted from
// AlloFlowANTI.txt activeView==='simplified' block (1,650 lines body).
// The biggest single extraction in the project's history.
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_simplified.txt', 'utf-8');

const wrapped = `
function SimplifiedView(props) {
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var inputText = props.inputText;
  var gradeLevel = props.gradeLevel;
  var leveledTextLanguage = props.leveledTextLanguage;
  var studentInterests = props.studentInterests;
  var standardsInput = props.standardsInput;
  var sourceTopic = props.sourceTopic;
  var isTeacherMode = props.isTeacherMode;
  var isProcessing = props.isProcessing;
  var isPlaying = props.isPlaying;
  var interactionMode = props.interactionMode;
  var isCompareMode = props.isCompareMode;
  var isFluencyMode = props.isFluencyMode;
  var isEditingLeveledText = props.isEditingLeveledText;
  var isImmersiveReaderActive = props.isImmersiveReaderActive;
  var immersiveSettings = props.immersiveSettings;
  var immersiveRulerY = props.immersiveRulerY;
  var isFocusReaderActive = props.isFocusReaderActive;
  var isChunkReaderActive = props.isChunkReaderActive;
  var chunkReaderIdx = props.chunkReaderIdx;
  var chunkReaderAutoPlay = props.chunkReaderAutoPlay;
  var chunkReaderSpeed = props.chunkReaderSpeed;
  var chunkReaderReadAlong = props.chunkReaderReadAlong;
  var chunkReaderSweepPct = props.chunkReaderSweepPct;
  var isCrawlReaderActive = props.isCrawlReaderActive;
  var isKaraokeOverlayActive = props.isKaraokeOverlayActive;
  var isAnalyzingPos = props.isAnalyzingPos;
  var isCheckingLevel = props.isCheckingLevel;
  var isCheckingAlignment = props.isCheckingAlignment;
  var isLineFocusMode = props.isLineFocusMode;
  var focusedParagraphIndex = props.focusedParagraphIndex;
  var isZenMode = props.isZenMode;
  var definitionData = props.definitionData;
  var phonicsData = props.phonicsData;
  var revisionData = props.revisionData;
  var selectionMenu = props.selectionMenu;
  var isCustomReviseOpen = props.isCustomReviseOpen;
  var customReviseInstruction = props.customReviseInstruction;
  var latestGlossary = props.latestGlossary;
  var history = props.history;
  var complexityLevel = props.complexityLevel;
  var saveOriginalOnAdjust = props.saveOriginalOnAdjust;
  var playbackState = props.playbackState;
  var playbackRate = props.playbackRate;
  var voiceSpeed = props.voiceSpeed;
  var lineHeight = props.lineHeight;
  var letterSpacing = props.letterSpacing;
  var readingTheme = props.readingTheme;
  var theme = props.theme;
  var isTeacherToolbarExpanded = props.isTeacherToolbarExpanded;
  var downloadingContentId = props.downloadingContentId;
  var isClozeComplete = props.isClozeComplete;
  var isSideBySide = props.isSideBySide;
  var cursorStyles = props.cursorStyles;
  // Setters
  var setInteractionMode = props.setInteractionMode;
  var setIsCompareMode = props.setIsCompareMode;
  var setIsFluencyMode = props.setIsFluencyMode;
  var setSelectionMenu = props.setSelectionMenu;
  var setRevisionData = props.setRevisionData;
  var setPhonicsData = props.setPhonicsData;
  var setIsImmersiveReaderActive = props.setIsImmersiveReaderActive;
  var setImmersiveSettings = props.setImmersiveSettings;
  var setImmersiveRulerY = props.setImmersiveRulerY;
  var setIsFocusReaderActive = props.setIsFocusReaderActive;
  var setIsChunkReaderActive = props.setIsChunkReaderActive;
  var setChunkReaderIdx = props.setChunkReaderIdx;
  var setChunkReaderAutoPlay = props.setChunkReaderAutoPlay;
  var setChunkReaderSpeed = props.setChunkReaderSpeed;
  var setChunkReaderReadAlong = props.setChunkReaderReadAlong;
  var setChunkReaderSweepPct = props.setChunkReaderSweepPct;
  var setIsCrawlReaderActive = props.setIsCrawlReaderActive;
  var setIsKaraokeOverlayActive = props.setIsKaraokeOverlayActive;
  var setPlaybackRate = props.setPlaybackRate;
  var setLineHeight = props.setLineHeight;
  var setLetterSpacing = props.setLetterSpacing;
  var setFocusedParagraphIndex = props.setFocusedParagraphIndex;
  var setIsCustomReviseOpen = props.setIsCustomReviseOpen;
  var setCustomReviseInstruction = props.setCustomReviseInstruction;
  var setComplexityLevel = props.setComplexityLevel;
  var setSaveOriginalOnAdjust = props.setSaveOriginalOnAdjust;
  var setReadingTheme = props.setReadingTheme;
  var setGeneratedContent = props.setGeneratedContent;
  // Refs
  var chunkReaderSweepAudioRef = props.chunkReaderSweepAudioRef;
  var chunkReaderSweepRafRef = props.chunkReaderSweepRafRef;
  var textEditorRef = props.textEditorRef;
  // Handlers
  var handleCloseImmersiveReader = props.handleCloseImmersiveReader;
  var handleGeneratePOSData = props.handleGeneratePOSData;
  var handleCloseSpeedReader = props.handleCloseSpeedReader;
  var handleSpeak = props.handleSpeak;
  var handleWordClick = props.handleWordClick;
  var handlePhonicsClick = props.handlePhonicsClick;
  var handleFormatText = props.handleFormatText;
  var handleSimplifiedTextChange = props.handleSimplifiedTextChange;
  var handleReviseSelection = props.handleReviseSelection;
  var handleQuickAddGlossary = props.handleQuickAddGlossary;
  var handleDefineSelection = props.handleDefineSelection;
  var handleTextMouseUp = props.handleTextMouseUp;
  var handleSetIsSyntaxGameToTrue = props.handleSetIsSyntaxGameToTrue;
  var handleAnalyzePOS = props.handleAnalyzePOS;
  var handleCheckLevel = props.handleCheckLevel;
  var handleCheckAlignment = props.handleCheckAlignment;
  var handleDuplicateResource = props.handleDuplicateResource;
  var handleDownloadAudio = props.handleDownloadAudio;
  var handleToggleIsTeacherToolbarExpanded = props.handleToggleIsTeacherToolbarExpanded;
  var handleToggleIsEditingLeveledText = props.handleToggleIsEditingLeveledText;
  var handleSetIsCustomReviseOpenToFalse = props.handleSetIsCustomReviseOpenToFalse;
  var closeDefinition = props.closeDefinition;
  var closePhonics = props.closePhonics;
  var closeRevision = props.closeRevision;
  var handleFetchWordImage = props.handleFetchWordImage;
  var applyTextRevision = props.applyTextRevision;
  var stopPlayback = props.stopPlayback;
  var handleComplexityAdjustment = props.handleComplexityAdjustment;
  var handleRegenerateWithRigor = props.handleRegenerateWithRigor;
  // Pure helpers
  var splitTextToSentences = props.splitTextToSentences;
  var getSideBySideContent = props.getSideBySideContent;
  var formatInteractiveText = props.formatInteractiveText;
  var renderFormattedText = props.renderFormattedText;
  var splitReferencesFromBody = props.splitReferencesFromBody;
  var parseReferenceItems = props.parseReferenceItems;
  var highlightGlossaryTerms = props.highlightGlossaryTerms;
  var diffWords = props.diffWords;
  var callTTS = props.callTTS;
  var copyToClipboard = props.copyToClipboard;
  var isRtlLang = props.isRtlLang;
  var getContentDirection = props.getContentDirection;
  // Components
  var ImmersiveToolbar = props.ImmersiveToolbar;
  var ImmersiveWord = props.ImmersiveWord;
  var ErrorBoundary = props.ErrorBoundary;
  var FocusReaderOverlay = props.FocusReaderOverlay;
  var PerspectiveCrawlOverlay = props.PerspectiveCrawlOverlay;
  var KaraokeReaderOverlay = props.KaraokeReaderOverlay;
  var ConfettiExplosion = props.ConfettiExplosion;
  var ComplexityGauge = props.ComplexityGauge;
  var SourceReferencesPanel = props.SourceReferencesPanel;
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

if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }
const transformedFn = result.code;

const moduleSrc = `/**
 * AlloFlow View - Simplified (Leveled Text) Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='simplified' block.
 * Source range: 1,650 lines body (largest single extraction in the project).
 * Renders: leveled text reader with immersive mode, focus/chunk/crawl/karaoke
 * overlays, side-by-side bilingual layout, define/phonics/revise/cloze/
 * add-glossary interaction modes, level check + rigor report panels,
 * complexity slider, teacher edit mode with formatting toolbar, definition/
 * phonics/revision popups, line focus, theme switcher, immersive toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SimplifiedView) {
    console.log('[CDN] ViewSimplifiedModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSimplifiedModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Heart = _lazyIcon('Heart');
  var CheckCircle = _lazyIcon('CheckCircle');
  var Volume2 = _lazyIcon('Volume2');
  var Mic = _lazyIcon('Mic');
  var Search = _lazyIcon('Search');
  var Ear = _lazyIcon('Ear');
  var Plus = _lazyIcon('Plus');
  var HelpCircle = _lazyIcon('HelpCircle');
  var PenTool = _lazyIcon('PenTool');
  var Gamepad2 = _lazyIcon('Gamepad2');
  var Pencil = _lazyIcon('Pencil');
  var GitCompare = _lazyIcon('GitCompare');
  var BookOpen = _lazyIcon('BookOpen');
  var Settings = _lazyIcon('Settings');
  var ChevronLeft = _lazyIcon('ChevronLeft');
  var ChevronRight = _lazyIcon('ChevronRight');
  var Copy = _lazyIcon('Copy');
  var RefreshCw = _lazyIcon('RefreshCw');
  var ShieldCheck = _lazyIcon('ShieldCheck');
  var Download = _lazyIcon('Download');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var X = _lazyIcon('X');
  var Bold = _lazyIcon('Bold');
  var Italic = _lazyIcon('Italic');
  var Highlighter = _lazyIcon('Highlighter');
  var List = _lazyIcon('List');
  var Trophy = _lazyIcon('Trophy');
  var ImageIcon = _lazyIcon('ImageIcon');
  var Sparkles = _lazyIcon('Sparkles');
  var AlertCircle = _lazyIcon('AlertCircle');
  var ArrowRight = _lazyIcon('ArrowRight');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SimplifiedView = SimplifiedView;
  window.AlloModules.ViewSimplifiedModule = true;
})();
`;

fs.writeFileSync('view_simplified_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_simplified_module.js', moduleSrc);
console.log('Wrote view_simplified_module.js (' + moduleSrc.length + ' bytes)');
