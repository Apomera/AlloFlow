/**
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

  // Inject Chunk Read mood keyframes once. Reduced-motion media query disables
  // the animations globally so users with that preference see static styling.
  (function () {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-chunk-mood-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-chunk-mood-css';
    st.textContent =
      '@keyframes allo-chunk-popin { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }' +
      '@keyframes allo-chunk-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }' +
      '@media (prefers-reduced-motion: reduce) {' +
      '  [data-sentence-idx] { animation: none !important; }' +
      '}';
    if (document.head) document.head.appendChild(st);
  })();

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
  var chunkReaderMood = props.chunkReaderMood || 'highlight';
  var setChunkReaderMood = props.setChunkReaderMood;
  var chunkTypewriterCharIdx = props.chunkTypewriterCharIdx || 0;
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
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, isImmersiveReaderActive && generatedContent?.immersiveData && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[200] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 flex flex-col font-sans",
    style: {
      backgroundColor: immersiveSettings.bgColor || '#fdfbf7'
    },
    onMouseMove: e => setImmersiveRulerY(e.clientY)
  }, /*#__PURE__*/React.createElement(ImmersiveToolbar, {
    settings: immersiveSettings,
    setSettings: setImmersiveSettings,
    onClose: handleCloseImmersiveReader,
    onGeneratePOS: handleGeneratePOSData,
    isGeneratingPOS: isAnalyzingPos,
    posReady: !!generatedContent?.posEnriched,
    onGenerateSyllables: handleGeneratePOSData,
    isGeneratingSyllables: isAnalyzingPos,
    syllablesReady: !!generatedContent?.posEnriched,
    playbackRate: playbackRate,
    setPlaybackRate: setPlaybackRate,
    lineHeight: lineHeight,
    setLineHeight: setLineHeight,
    letterSpacing: letterSpacing,
    setLetterSpacing: setLetterSpacing,
    isFocusReaderActive: isFocusReaderActive,
    onToggleFocusReader: () => setIsFocusReaderActive(!isFocusReaderActive),
    isChunkReaderActive: isChunkReaderActive,
    onToggleChunkReader: () => {
      setIsChunkReaderActive(!isChunkReaderActive);
      setChunkReaderIdx(0);
      setChunkReaderAutoPlay(false);
    },
    chunkReaderIdx: chunkReaderIdx,
    setChunkReaderIdx: setChunkReaderIdx,
    chunkReaderAutoPlay: chunkReaderAutoPlay,
    setChunkReaderAutoPlay: setChunkReaderAutoPlay,
    chunkReaderSpeed: chunkReaderSpeed,
    setChunkReaderSpeed: setChunkReaderSpeed,
    chunkReaderMood: chunkReaderMood,
    setChunkReaderMood: setChunkReaderMood,
    interactionMode: interactionMode,
    setInteractionMode: setInteractionMode,
    isCrawlReaderActive: isCrawlReaderActive,
    onToggleCrawlReader: () => setIsCrawlReaderActive(!isCrawlReaderActive),
    isKaraokeOverlayActive: isKaraokeOverlayActive,
    onToggleKaraokeOverlay: () => setIsKaraokeOverlayActive(!isKaraokeOverlayActive),
    chunkReaderReadAlong: chunkReaderReadAlong,
    onToggleChunkReaderReadAlong: () => {
      const next = !chunkReaderReadAlong;
      setChunkReaderReadAlong(next);
      setChunkReaderSweepPct(0);
      if (!next) {
        try {
          if (chunkReaderSweepAudioRef.current) {
            chunkReaderSweepAudioRef.current.pause();
            chunkReaderSweepAudioRef.current = null;
          }
        } catch (e) {}
        if (chunkReaderSweepRafRef.current) {
          cancelAnimationFrame(chunkReaderSweepRafRef.current);
          chunkReaderSweepRafRef.current = null;
        }
        try {
          window.speechSynthesis && window.speechSynthesis.cancel();
        } catch (e) {}
      }
    },
    totalSentences: (() => {
      const sbs = getSideBySideContent(generatedContent?.data);
      const ps = sbs ? [...(sbs.source || []), ...(sbs.target || [])] : (generatedContent?.data || '').split(new RegExp('\\n{2,}'));
      return ps.flatMap(p => p.trim().startsWith('|') ? [] : splitTextToSentences(p)).length || 1;
    })()
  }), /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Focus reader encountered an error. Please close and reopen."
  }, /*#__PURE__*/React.createElement(FocusReaderOverlay, {
    isOpen: isFocusReaderActive,
    onClose: handleCloseSpeedReader,
    text: (generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')
  }), /*#__PURE__*/React.createElement(PerspectiveCrawlOverlay, {
    isOpen: isCrawlReaderActive,
    onClose: () => setIsCrawlReaderActive(false),
    text: (generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')
  }), /*#__PURE__*/React.createElement(KaraokeReaderOverlay, {
    isOpen: isKaraokeOverlayActive,
    onClose: () => setIsKaraokeOverlayActive(false),
    getAudioUrl: sentenceText => callTTS(sentenceText).catch(() => null),
    text: (generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')
  })), immersiveSettings.lineFocus && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed top-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[height] duration-75 ease-out",
    style: {
      height: Math.max(0, immersiveRulerY - immersiveSettings.textSize * 2.5) + 'px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[top] duration-75 ease-out",
    style: {
      top: immersiveRulerY + immersiveSettings.textSize * 2.5 + 'px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed left-0 right-0 border-b border-indigo-400/30 z-[210] pointer-events-none transition-[top] duration-75 ease-out",
    style: {
      top: immersiveRulerY + 'px'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow overflow-y-auto p-8 md:p-16 custom-scrollbar relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: `max-w-4xl mx-auto transition-all duration-300`,
    style: {
      color: immersiveSettings.fontColor || '#1e293b',
      lineHeight: lineHeight,
      letterSpacing: `${immersiveSettings.wideText ? letterSpacing + 0.15 : letterSpacing}em`,
      wordSpacing: immersiveSettings.wideText ? '0.25em' : 'normal',
      fontFamily: immersiveSettings.fontFamily || undefined
    }
  }, (() => {
    const isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    let sentences = [];
    const sideBySideData = getSideBySideContent(generatedContent?.data);
    if (sideBySideData) {
      const sourceSentences = sideBySideData.source.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
      const targetSentences = sideBySideData.target.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
      sentences = [...sourceSentences, ...targetSentences];
    } else {
      const paragraphs = generatedContent?.data.split(/\n{2,}/);
      sentences = paragraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
    }
    let currentSentenceIdx = 0;
    let currentSentenceText = sentences[0] || "";
    let normalizedSentence = currentSentenceText.replace(/\s+/g, '').toLowerCase();
    let currentTokenBuffer = "";
    // Typewriter char-offset bookkeeping for the active sentence (mood='typewriter').
    // Resets when we encounter the first token of the active sentence; each token in
    // the active sentence contributes wordData.text.length to the rolling offset.
    let activeChunkCharOffset = 0;
    let lastWasActiveSentence = false;
    const reduceMotion = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return generatedContent.immersiveData.map((wordData, i) => {
      if (wordData.pos === 'newline') {
        return /*#__PURE__*/React.createElement("div", {
          key: wordData.id || i,
          className: "w-full h-4"
        });
      }
      const tokenStr = wordData.text.replace(/\s+/g, '').toLowerCase();
      const assignedIdx = currentSentenceIdx;
      currentTokenBuffer += tokenStr;
      if (currentTokenBuffer.length >= normalizedSentence.length) {
        if (currentSentenceIdx < sentences.length - 1) {
          currentSentenceIdx++;
          currentSentenceText = sentences[currentSentenceIdx];
          normalizedSentence = currentSentenceText.replace(/\s+/g, '').toLowerCase();
          currentTokenBuffer = "";
        }
      }
      const isChunkHighlight = isChunkReaderActive && assignedIdx === chunkReaderIdx;
      const isChunkDimmed = isChunkReaderActive && assignedIdx !== chunkReaderIdx;
      // Track word's char-offset within the active sentence for typewriter mood
      let wordStartChar = -1;
      if (isChunkHighlight) {
        if (!lastWasActiveSentence) activeChunkCharOffset = 0;
        wordStartChar = activeChunkCharOffset;
        activeChunkCharOffset += (wordData.text || '').length;
        lastWasActiveSentence = true;
      } else {
        lastWasActiveSentence = false;
      }
      // Mood-aware styling: highlight (default), typewriter, popin, pulse
      let moodOpacity = isChunkDimmed ? 0.45 : 1;
      let moodAnimation = '';
      let showHighlight = isChunkHighlight;
      if (isChunkReaderActive && chunkReaderMood === 'typewriter') {
        if (isChunkDimmed) moodOpacity = 0.2;
        if (isChunkHighlight) {
          moodOpacity = wordStartChar < chunkTypewriterCharIdx ? 1 : 0;
          if (wordStartChar >= chunkTypewriterCharIdx) showHighlight = false;
        }
      } else if (isChunkReaderActive && chunkReaderMood === 'popin' && isChunkHighlight && !reduceMotion) {
        moodAnimation = 'allo-chunk-popin 0.25s ease-out';
      } else if (isChunkReaderActive && chunkReaderMood === 'pulse' && isChunkHighlight && !reduceMotion) {
        moodAnimation = 'allo-chunk-pulse 2s ease-in-out infinite';
      }
      return /*#__PURE__*/React.createElement("span", {
        key: wordData.id || i,
        "data-sentence-idx": assignedIdx,
        style: {
          opacity: moodOpacity,
          transition: chunkReaderMood === 'typewriter' ? 'opacity 0.05s linear' : 'all 0.3s ease',
          // In chunk-read mode every word is click-to-jump (onClick below);
          // pointer cursor surfaces the affordance without needing instructions.
          ...(isChunkReaderActive ? { cursor: 'pointer' } : {}),
          ...(moodAnimation ? { animation: moodAnimation } : {}),
          ...(showHighlight || isPlaying && playbackState.currentIdx === assignedIdx ? {
            backgroundColor: 'rgba(250, 204, 21, 0.35)',
            borderRadius: '4px',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone'
          } : {})
        }
      }, /*#__PURE__*/React.createElement(ImmersiveWord, {
        wordData: wordData,
        settings: immersiveSettings,
        isActive: isPlaying && playbackState.currentIdx === assignedIdx || isChunkHighlight,
        onClick: e => {
          e.stopPropagation();
          if (interactionMode === 'define') {
            handleWordClick(wordData.text, e);
            return;
          }
          if (interactionMode === 'phonics') {
            handlePhonicsClick(wordData.text, e);
            return;
          }
          if (isChunkReaderActive) {
            setChunkReaderIdx(assignedIdx);
          } else {
            handleSpeak(generatedContent?.data, 'simplified-main', assignedIdx);
          }
        }
      }));
    });
  })()))), interactionMode === 'cloze' && isClozeComplete && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null), /*#__PURE__*/React.createElement("div", {
    className: "mt-40 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border-4 border-white shadow-xl animate-in zoom-in duration-500 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 24,
    className: "text-yellow-500 fill-current"
  }), " Activity Complete!")), !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-4 rounded-lg border border-green-100 mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-800"
  }, /*#__PURE__*/React.createElement("strong", null, t('simplified.udl_goal').split(':')[0], ":"), " ", t('simplified.udl_goal').split(':')[1])), /*#__PURE__*/React.createElement("div", {
    className: `bg-orange-50 border-l-4 border-orange-400 shadow-sm rounded-r-lg relative ${isZenMode ? 'p-4' : 'p-8'}`
  }, !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center items-center mb-2 flex-wrap gap-2"
  }, (() => {
    const displayGrade = generatedContent?.config?.grade || gradeLevel;
    const displayLang = generatedContent?.config?.language || leveledTextLanguage;
    const displayInterests = generatedContent?.config?.interests || studentInterests;
    const displayStandards = generatedContent?.config?.standards || standardsInput;
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-comic font-bold text-xl text-orange-800"
    }, isTeacherMode ? `${t('simplified.target_level_label')}: ${displayGrade}` : sourceTopic || "Reading Selection"), displayLang !== 'English' && /*#__PURE__*/React.createElement("span", {
      className: "bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold border border-blue-200"
    }, displayLang), displayInterests.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold border border-red-200 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Heart, {
      size: 10
    }), " ", t('simplified.engagement_optimized')), displayStandards && /*#__PURE__*/React.createElement("span", {
      className: "bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200 flex items-center gap-1 cursor-help",
      title: `${t('simplified.label_standard')}: ${displayStandards}`
    }, /*#__PURE__*/React.createElement(CheckCircle, {
      size: 10
    }), displayStandards.length > 20 ? displayStandards.substring(0, 20) + '...' : displayStandards));
  })()), /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-2 ${isZenMode ? 'justify-center mb-4' : 'justify-center'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center bg-white rounded-2xl sm:rounded-full p-1 border border-indigo-200 shadow-sm sm:flex-nowrap gap-y-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setInteractionMode('read');
      stopPlayback();
      setSelectionMenu(null);
      setRevisionData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'read' && !isCompareMode && !isFluencyMode ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_read'),
    "aria-label": t('simplified.read_mode'),
    "data-help-key": "simplified_read_mode"
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 12
  }), " ", t('simplified.read_mode')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setIsFluencyMode(true);
      stopPlayback();
      setInteractionMode('read');
      setIsCompareMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${isFluencyMode ? 'bg-rose-100 text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_read_along'),
    "aria-label": t('simplified.read_along'),
    "data-help-key": "simplified_read_along"
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 12
  }), " ", t('simplified.read_along')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setInteractionMode('define');
      stopPlayback();
      setSelectionMenu(null);
      setRevisionData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'define' && !isCompareMode ? 'bg-yellow-100 text-yellow-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_define'),
    "aria-label": t('simplified.define_mode'),
    "data-help-key": "simplified_define_mode"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12
  }), " ", t('simplified.define_mode')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setInteractionMode('phonics');
      stopPlayback();
      setPhonicsData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'phonics' && !isCompareMode ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_phonics'),
    "aria-label": t('simplified.phonics_mode'),
    "data-help-key": "simplified_phonics_mode"
  }, /*#__PURE__*/React.createElement(Ear, {
    size: 12
  }), " ", t('simplified.phonics_mode')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setInteractionMode('add-glossary');
      stopPlayback();
      setSelectionMenu(null);
      setRevisionData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'add-glossary' && !isCompareMode ? 'bg-green-100 text-green-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_add_term'),
    "aria-label": t('simplified.add_term'),
    "data-help-key": "simplified_add_term"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " ", t('simplified.add_term')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setInteractionMode('explain');
      stopPlayback();
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'explain' && !isCompareMode ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_explain'),
    "aria-label": t('simplified.explain_mode'),
    "data-help-key": "simplified_explain_mode"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 12
  }), " ", t('simplified.explain_mode')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setInteractionMode('cloze');
      stopPlayback();
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'cloze' && !isCompareMode ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_cloze'),
    "aria-label": t('simplified.cloze_mode'),
    "data-help-key": "simplified_cloze_mode"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 12
  }), " ", t('simplified.cloze_mode')), /*#__PURE__*/React.createElement("button", {
    onClick: handleSetIsSyntaxGameToTrue,
    className: "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all bg-orange-100 text-orange-800 hover:bg-orange-200 shadow-sm",
    title: t('simplified.tip_scramble'),
    "aria-label": t('simplified.scramble_game'),
    "data-help-key": "simplified_scramble_game"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 12
  }), " ", t('simplified.scramble_game')), isTeacherMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setInteractionMode('revise');
      stopPlayback();
      setIsCompareMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'revise' && !isCompareMode ? 'bg-purple-100 text-purple-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_revise'),
    "aria-label": t('simplified.revise_mode'),
    "data-help-key": "simplified_revise_mode"
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 12
  }), " ", t('simplified.revise_mode')), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "simplified_compare_mode",
    onClick: () => {
      setIsCompareMode(!isCompareMode);
      stopPlayback();
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${isCompareMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_compare'),
    "aria-label": t('simplified.compare_mode')
  }, /*#__PURE__*/React.createElement(GitCompare, {
    size: 12
  }), " ", t('simplified.compare_mode')))), !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    "data-help-key": "simplified_immersive_reader",
    onClick: () => {
      if (generatedContent.immersiveData) {
        setIsImmersiveReaderActive(true);
      } else {
        handleAnalyzePOS();
      }
    },
    disabled: isAnalyzingPos || isEditingLeveledText,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
    title: t('simplified.tip_immersive_btn')
  }, isAnalyzingPos ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(BookOpen, {
    size: 14
  }), isAnalyzingPos ? t('simplified.loading_reader') : t('simplified.immersive_reader')), /*#__PURE__*/React.createElement("select", {
    value: readingTheme,
    onChange: e => setReadingTheme(e.target.value),
    "aria-label": "Reading theme",
    className: `px-2 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${readingTheme === 'default' ? 'border-slate-200 bg-white text-slate-600' : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`
  }, /*#__PURE__*/React.createElement("option", {
    value: "default"
  }, "\uD83C\uDFA8 Default (App Theme)"), /*#__PURE__*/React.createElement("option", {
    value: "warm"
  }, "\u2600\uFE0F Warm Cream"), /*#__PURE__*/React.createElement("option", {
    value: "sepia"
  }, "\uD83D\uDCDC Sepia"), theme !== 'dark' && /*#__PURE__*/React.createElement("option", {
    value: "dark"
  }, "\uD83C\uDF19 Dark Mode"), /*#__PURE__*/React.createElement("option", {
    value: "highContrast"
  }, "\u25FC\uFE0F High Contrast"), /*#__PURE__*/React.createElement("option", {
    value: "blue"
  }, "\uD83D\uDCA7 Blue Wash"), /*#__PURE__*/React.createElement("option", {
    value: "green"
  }, "\uD83C\uDF3F Green Tint"), /*#__PURE__*/React.createElement("option", {
    value: "rose"
  }, "\uD83C\uDF38 Rose"), /*#__PURE__*/React.createElement("option", {
    value: "dyslexia"
  }, "\uD83D\uDD24 Easy Read")), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center mr-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.settings'),
    "data-help-key": "simplified_teacher_tools",
    onClick: handleToggleIsTeacherToolbarExpanded,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isTeacherToolbarExpanded ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:text-indigo-600 hover:border-indigo-200'}`,
    title: t('simplified.teacher_tools_tooltip')
  }, /*#__PURE__*/React.createElement(Settings, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('simplified.teacher_tools_label')), isTeacherToolbarExpanded ? /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  }) : /*#__PURE__*/React.createElement(ChevronRight, {
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out flex-wrap ${isTeacherToolbarExpanded ? 'max-w-[920px] opacity-100 ml-2' : 'max-w-0 opacity-0'}`
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleDuplicateResource,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_duplicate_btn'),
    "aria-label": t('simplified.tip_duplicate_btn'),
    "data-help-key": "simplified_duplicate"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.duplicate')), /*#__PURE__*/React.createElement("button", {
    onClick: handleCheckLevel,
    disabled: isCheckingLevel,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
    title: t('simplified.tip_check_level_btn'),
    "aria-label": t('simplified.tip_check_level_btn'),
    "data-help-key": "simplified_check_level"
  }, isCheckingLevel ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Search, {
    size: 14
  }), isCheckingLevel ? t('simplified.checking') : t('simplified.check_level')), /*#__PURE__*/React.createElement("button", {
    onClick: handleCheckAlignment,
    disabled: isCheckingAlignment || !standardsInput,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${!standardsInput ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-slate-300'}`,
    title: !standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn'),
    "aria-label": !standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn'),
    "data-help-key": "simplified_rigor_report"
  }, isCheckingAlignment ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 14
  }), isCheckingAlignment ? t('simplified.checking') : t('simplified.rigor_report')), /*#__PURE__*/React.createElement("button", {
    onClick: () => copyToClipboard(generatedContent?.data),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_copy_btn'),
    "aria-label": t('simplified.tip_copy_btn'),
    "data-help-key": "simplified_copy_text"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.copy_text')), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDownloadAudio(generatedContent?.data, `leveled-text-${gradeLevel}`, 'dl-simplified-main'),
    disabled: downloadingContentId === 'dl-simplified-main',
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    "data-help-key": "simplified_download_audio"
  }, downloadingContentId === 'dl-simplified-main' ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Download, {
    size: 14
  }), downloadingContentId === 'dl-simplified-main' ? t('common.downloading') : t('common.download_audio')))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_text'),
    onClick: handleToggleIsEditingLeveledText,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingLeveledText ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'}`,
    "data-help-key": "simplified_edit"
  }, isEditingLeveledText ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingLeveledText ? t('common.done_editing') : t('common.edit'))))), definitionData && /*#__PURE__*/React.createElement("div", {
    className: "fixed z-[100] bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-64 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-75 duration-300 ease-out",
    style: {
      top: Math.min(window.innerHeight - 300, definitionData.y + 10) + 'px',
      left: Math.min(window.innerWidth - 280, definitionData.x - 20) + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-indigo-900 text-lg capitalize"
  }, definitionData.word), /*#__PURE__*/React.createElement("button", {
    onClick: closeDefinition,
    className: "text-slate-600 hover:text-slate-600",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), definitionData.text ? /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-700 leading-relaxed"
  }, renderFormattedText(definitionData.text, false)) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-xs text-indigo-500"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }), " ", t('glossary.popups.finding')), definitionData.text && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-slate-100"
  }, definitionData.imageUrl ? /*#__PURE__*/React.createElement("img", {
    src: definitionData.imageUrl,
    alt: definitionData.word,
    className: "w-full h-32 object-contain rounded-lg bg-slate-50 border border-slate-400"
  }) : definitionData.imageLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 text-xs text-indigo-500 h-20 bg-slate-50 rounded-lg border border-slate-400 border-dashed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }), " ", t('common.loading') || 'Loading picture...') : definitionData.imageError ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 italic text-center py-2"
  }, t('glossary.popups.image_error') || 'Could not load picture.') : /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFetchWordImage(definitionData.word),
    className: "w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors",
    "aria-label": t('glossary.popups.show_picture') || 'Show picture for this word'
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 12
  }), " ", t('glossary.popups.show_picture') || 'Show picture')), /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-indigo-200 transform rotate-45"
  })), definitionData && /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === 'Escape') e.currentTarget.click();
    },
    className: "fixed inset-0 z-[90]",
    onClick: closeDefinition
  }), phonicsData && /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "phonics-popup-title",
    className: "fixed z-[100] bg-white allo-popover-solid p-5 rounded-xl shadow-2xl border-2 border-emerald-200 w-72 animate-in zoom-in-95 duration-200",
    style: {
      top: Math.min(window.innerHeight - 300, phonicsData.y + 10) + 'px',
      left: Math.min(window.innerWidth - 300, phonicsData.x - 20) + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-3"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "phonics-popup-title",
    className: "font-black text-emerald-900 text-2xl capitalize tracking-tight"
  }, phonicsData.word), /*#__PURE__*/React.createElement("button", {
    onClick: closePhonics,
    className: "text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), phonicsData.isLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-6 gap-2 text-emerald-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 24,
    className: "animate-spin"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider"
  }, t('glossary.popups.analyzing'))) : phonicsData.data ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1"
  }, t('glossary.phonetic_spelling')), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-serif italic text-slate-700"
  }, "/", phonicsData.data.phoneticSpelling, "/")), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    onClick: () => {
      if (phonicsData.audioUrl) {
        const audio = new Audio(phonicsData.audioUrl);
        audio.playbackRate = voiceSpeed || 1;
        audio.play().catch(() => {});
      }
    },
    className: "bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95",
    title: t('glossary.popups.replay')
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 20,
    className: "fill-current"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-2 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
  }, t('glossary.popups.ipa')), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-sm text-slate-600"
  }, phonicsData.data.ipa)), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-2 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
  }, t('glossary.popups.syllables')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-0.5"
  }, phonicsData.data.syllables.map((syl, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-500 font-bold px-0.5",
    "aria-hidden": "true"
  }, "\u2022"), /*#__PURE__*/React.createElement("span", {
    className: "bg-white px-1.5 rounded border border-slate-400 text-sm font-bold text-slate-700 shadow-sm"
  }, syl))))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-red-400 text-xs font-bold py-4"
  }, t('glossary.popups.failed')), /*#__PURE__*/React.createElement("div", {
    className: "allo-popover-solid absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-emerald-200 transform rotate-45"
  })), phonicsData && /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === 'Escape') e.currentTarget.click();
    },
    className: "fixed inset-0 z-[90]",
    onClick: closePhonics
  }), selectionMenu && /*#__PURE__*/React.createElement("div", {
    className: "fixed z-[100] flex flex-col gap-1 items-center animate-in fade-in slide-in-from-bottom-2 duration-200",
    style: {
      top: selectionMenu.y - 50 + 'px',
      left: selectionMenu.x + 'px',
      transform: 'translateX(-50%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/90 text-white text-[11px] px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-sm max-w-[150px] truncate border border-slate-700"
  }, "\"", selectionMenu.text.length > 20 ? selectionMenu.text.substring(0, 20) + '...' : selectionMenu.text, "\""), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 text-white rounded-full shadow-xl p-1 flex items-center gap-1"
  }, isCustomReviseOpen ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 px-1 animate-in slide-in-from-right-2 duration-200"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_custom_revise_instruction'),
    autoFocus: true,
    type: "text",
    value: customReviseInstruction,
    onChange: e => setCustomReviseInstruction(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleReviseSelection('custom', customReviseInstruction);
      if (e.key === 'Escape') setIsCustomReviseOpen(false);
    },
    placeholder: t('text_tools.menu_placeholder'),
    className: "text-xs bg-slate-700 border-none rounded-full px-3 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none text-white w-48 placeholder:text-slate-600"
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.continue'),
    onClick: () => handleReviseSelection('custom', customReviseInstruction),
    className: "p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors",
    disabled: !customReviseInstruction.trim()
  }, /*#__PURE__*/React.createElement(ArrowRight, {
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close_revision_panel'),
    onClick: handleSetIsCustomReviseOpenToFalse,
    className: "p-1.5 text-slate-600 hover:text-white rounded-full transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, interactionMode === 'explain' && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.help'),
    onClick: () => handleReviseSelection('explain'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 12,
    className: "text-teal-400"
  }), " ", t('text_tools.explain')), interactionMode === 'revise' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.generate'),
    onClick: () => handleReviseSelection('simplify'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    className: "text-yellow-400"
  }), " ", t('text_tools.simplify')), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-3 bg-slate-600"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleReviseSelection('custom-input'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 12,
    className: "text-indigo-600"
  }), " ", t('text_tools.custom'))), interactionMode === 'define' && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.search'),
    onClick: handleDefineSelection,
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12,
    className: "text-yellow-400"
  }), " ", t('text_tools.define')), interactionMode === 'add-glossary' && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.add'),
    onClick: () => {
      handleQuickAddGlossary(selectionMenu.text, true);
      setSelectionMenu(null);
    },
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12,
    className: "text-green-400"
  }), " ", t('text_tools.add_term')))), /*#__PURE__*/React.createElement("div", {
    className: "w-2 h-2 bg-slate-800 rotate-45"
  })), selectionMenu && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[90] bg-transparent",
    onMouseDown: e => {
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
    }
  }), revisionData && /*#__PURE__*/React.createElement("div", {
    className: "fixed z-[100] bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-72 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200",
    style: {
      top: Math.min(window.innerHeight - 300, revisionData.y + 20) + 'px',
      left: Math.min(window.innerWidth - 300, Math.max(20, revisionData.x - 140)) + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-3 pb-2 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2"
  }, revisionData.type === 'simplify' ? /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-yellow-500"
  }) : revisionData.type === 'custom' ? /*#__PURE__*/React.createElement(PenTool, {
    size: 14,
    className: "text-indigo-500"
  }) : /*#__PURE__*/React.createElement(HelpCircle, {
    size: 14,
    className: "text-teal-500"
  }), revisionData.type === 'simplify' ? t('simplified.revision.header_simplify') : revisionData.type === 'custom' ? t('simplified.revision.header_custom') : t('simplified.revision.header_explain')), /*#__PURE__*/React.createElement("button", {
    onClick: closeRevision,
    className: "text-slate-600 hover:text-slate-600",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), revisionData.result ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100 mb-3"
  }, renderFormattedText(revisionData.result, false)), (revisionData.type === 'simplify' || revisionData.type === 'custom') && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.apply_text_revision'),
    onClick: applyTextRevision,
    className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }), " ", t('simplified.revision.replace_btn'))) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-4 gap-2 text-slate-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin text-indigo-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, t('simplified.revision.working')))), revisionData && /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === 'Escape') e.currentTarget.click();
    },
    className: "fixed inset-0 z-[90] bg-black/5",
    onClick: closeRevision
  }), isTeacherMode && !isCompareMode && !isZenMode && generatedContent && ['simplified', 'quiz', 'sentence-frames', 'glossary'].includes(generatedContent.type) && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100 shadow-sm mb-6 mx-1",
    "data-help-key": "simplified_complexity_slider"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 text-center"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.adjust_difficulty') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.adjust_scaffolding') : generatedContent.type === 'glossary' ? t('simplified.complexity_controls.adjust_definition') : t('simplified.complexity_controls.adjust_relative')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-20 text-right"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.easier') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.more_support') : t('simplified.complexity_controls.simpler')), /*#__PURE__*/React.createElement("div", {
    className: "relative flex-grow h-6 flex items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 transform -translate-x-1/2"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.range_slider'),
    type: "range",
    min: "1",
    max: "9",
    step: "1",
    value: complexityLevel,
    onChange: e => setComplexityLevel(parseInt(e.target.value)),
    onMouseUp: handleComplexityAdjustment,
    onTouchEnd: handleComplexityAdjustment,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 z-10 relative"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-20"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.harder') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.less_support') : t('simplified.complexity_controls.complex'))), /*#__PURE__*/React.createElement("div", {
    className: "px-16"
  }, /*#__PURE__*/React.createElement(ComplexityGauge, {
    level: complexityLevel
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-center mt-2 text-xs font-medium h-4"
  }, complexityLevel < 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 animate-pulse"
  }, t('status.adjusting'), "..."), complexityLevel > 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-600 animate-pulse"
  }, t('status.adjusting'), "..."), complexityLevel === 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, t('simplified.complexity_controls.drag_hint'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center mt-4 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full cursor-pointer select-none transition-all border ${saveOriginalOnAdjust ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-1 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`,
    title: t('common.choose_overwrite_version'),
    "data-help-key": "simplified_overwrite_toggle"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_save_original_on_adjust'),
    type: "checkbox",
    checked: saveOriginalOnAdjust,
    onChange: e => setSaveOriginalOnAdjust(e.target.checked),
    className: "hidden"
  }), saveOriginalOnAdjust ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Copy, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, saveOriginalOnAdjust ? t('common.keep_original') : t('common.overwrite_version'))))), generatedContent.levelCheck && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-lg animate-in slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-2 rounded-full text-indigo-600 mt-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 text-sm flex items-center justify-between"
  }, t('simplified.level_analysis_title'), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full"
  }, generatedContent.levelCheck.confirmedLevel || generatedContent.levelCheck.estimatedLevel)), generatedContent.levelCheck.rubric ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
  }, t('simplified.complexity_rubric_title')), Object.entries(generatedContent.levelCheck.rubric).map(([key, data]) => {
    const percent = (data.score + 5) / 10 * 100;
    const isAligned = Math.abs(data.score) <= 1;
    const colorClass = isAligned ? 'bg-green-500' : data.score < 0 ? 'bg-blue-400' : 'bg-red-400';
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "space-y-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between text-xs"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-slate-700 capitalize"
    }, key.replace(/([A-Z])/g, ' $1').trim()), /*#__PURE__*/React.createElement("span", {
      className: `font-mono font-bold ${isAligned ? 'text-green-600' : 'text-slate-600'}`
    }, data.score > 0 ? '+' : '', data.score)), /*#__PURE__*/React.createElement("div", {
      className: "relative h-2 bg-slate-100 rounded-full overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10"
    }), /*#__PURE__*/React.createElement("div", {
      className: `absolute top-0 bottom-0 rounded-full transition-all duration-500 ${colorClass}`,
      style: {
        left: data.score < 0 ? `${percent}%` : '50%',
        width: `${Math.abs(data.score) * 10}%`
      }
    })), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-slate-600 italic"
    }, data.reason));
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] text-slate-600 font-bold uppercase tracking-widest mt-1"
  }, /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_simple')), /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_aligned')), /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_complex')))) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600"
  }, t('simplified.level_estimate_label'), ":"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-indigo-700 bg-white px-2 py-0.5 rounded text-sm border border-indigo-100 shadow-sm"
  }, generatedContent.levelCheck.estimatedLevel), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.levelCheck.alignment === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`
  }, generatedContent.levelCheck.alignment)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed mt-2 p-2 bg-indigo-50/50 rounded italic border border-indigo-100/50"
  }, "\"", generatedContent.levelCheck.nuanceSummary || generatedContent.levelCheck.feedback, "\"")), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close_fluency_session'),
    onClick: () => {
      const updated = {
        ...generatedContent
      };
      delete updated.levelCheck;
      setGeneratedContent(updated);
    },
    className: "text-slate-600 hover:text-slate-600 p-1"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), generatedContent.alignmentCheck && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg animate-in slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1"
  }, /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-emerald-900 text-sm"
  }, t('simplified.rigor_check_title')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600"
  }, t('simplified.rigor_status_label'), ":"), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.alignmentCheck.status === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`
  }, generatedContent.alignmentCheck.status)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-emerald-800"
  }, t('simplified.rigor_evidence_label'), ":"), " \"", generatedContent.alignmentCheck.evidence, "\""), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-emerald-800"
  }, t('simplified.rigor_analysis_label'), ":"), " ", generatedContent.alignmentCheck.rigorReport), generatedContent.alignmentCheck.missingElements && generatedContent.alignmentCheck.missingElements !== "None" && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-700 leading-relaxed bg-red-50 p-2 rounded border border-red-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 12
  }), " ", t('simplified.missing_label'), ":"), " ", generatedContent.alignmentCheck.missingElements)), generatedContent.alignmentCheck.improvement && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-emerald-200 mt-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12
  }), " ", t('simplified.suggestion_label')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 italic mb-2"
  }, "\"", generatedContent.alignmentCheck.improvement, "\""), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.regenerate_with_rigor'),
    onClick: handleRegenerateWithRigor,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "text-xs font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: isProcessing ? "animate-spin" : ""
  }), " ", t('simplified.apply_regenerate')))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close_fluency_results'),
    onClick: () => {
      const updated = {
        ...generatedContent
      };
      delete updated.alignmentCheck;
      setGeneratedContent(updated);
    },
    className: "text-slate-600 hover:text-slate-600 p-1"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), isCompareMode ? /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full min-h-[500px] animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 border-b border-slate-200 p-4 mb-4 flex justify-between items-center rounded-t-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-slate-700 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(GitCompare, {
    size: 16,
    className: "text-indigo-600"
  }), " ", t('simplified.diff_view')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 text-xs font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-3 h-3 bg-red-100 border border-red-300 rounded"
  }), " ", t('simplified.diff_removed')), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-3 h-3 bg-green-100 border border-green-300 rounded"
  }), " ", t('simplified.diff_added')))), (() => {
    const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
    const sourceContent = latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText ? latestAnalysis.data.originalText : inputText;
    let originalText = sourceContent.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    let adaptedText = generatedContent?.data;
    const sideBySide = getSideBySideContent(adaptedText);
    if (sideBySide) {
      adaptedText = sideBySide.targetFull;
    }
    adaptedText = adaptedText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    const diff = diffWords(originalText, adaptedText);
    return /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-8"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white p-6 rounded-lg border border-slate-400 shadow-sm overflow-y-auto max-h-[70vh] custom-scrollbar"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 border-b pb-2 sticky top-0 bg-white z-10"
    }, t('simplified.diff_original')), /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-slate-700 leading-relaxed font-serif whitespace-pre-wrap"
    }, diff.map((part, i) => {
      if (part.type === 'add') return null;
      if (part.type === 'del') {
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          className: "bg-red-100 text-red-800 line-through decoration-red-400 decoration-2 px-0.5 rounded mx-0.5"
        }, part.value);
      }
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        className: "opacity-70"
      }, part.value, " ");
    }))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white p-6 rounded-lg border border-slate-400 shadow-sm overflow-y-auto max-h-[70vh] custom-scrollbar"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-bold text-indigo-500 uppercase tracking-wider mb-4 border-b pb-2 sticky top-0 bg-white z-10"
    }, t('simplified.diff_adapted')), /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-slate-800 leading-relaxed font-medium font-serif whitespace-pre-wrap"
    }, diff.map((part, i) => {
      if (part.type === 'del') return null;
      if (part.type === 'add') {
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          className: "bg-green-100 text-green-900 font-bold border-b-2 border-green-300 px-0.5 rounded mx-0.5"
        }, part.value);
      }
      return /*#__PURE__*/React.createElement("span", {
        key: i
      }, part.value, " ");
    }))));
  })()) : isEditingLeveledText ? /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-white border border-orange-200 rounded-lg overflow-hidden shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 p-2 bg-orange-50 border-b border-orange-100"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('bold'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.bold')
  }, /*#__PURE__*/React.createElement(Bold, {
    size: 16,
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('italic'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.italic')
  }, /*#__PURE__*/React.createElement(Italic, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('highlight'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.highlight')
  }, /*#__PURE__*/React.createElement(Highlighter, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('h1'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h1')
  }, "H1"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('h2'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h2')
  }, "H2"), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('list'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.list')
  }, /*#__PURE__*/React.createElement(List, {
    size: 16
  }))), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('simplified.revision.placeholder_edit_text') || 'Edit simplified text',
    ref: textEditorRef,
    value: generatedContent?.data,
    onChange: e => handleSimplifiedTextChange(e.target.value),
    className: "w-full min-h-[500px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-lg text-slate-800 font-medium leading-relaxed resize-none font-sans",
    spellCheck: "false",
    placeholder: t('simplified.revision.placeholder_edit_text')
  })) : isSideBySide && getSideBySideContent(generatedContent?.data) ? /*#__PURE__*/React.createElement("div", {
    className: `w-full min-h-[500px] font-sans ${cursorStyles[interactionMode]}`
  }, (() => {
    const {
      source,
      target,
      sourceFull
    } = getSideBySideContent(generatedContent?.data);
    const maxPars = Math.max(source.length, target.length);
    const rows = Array.from({
      length: maxPars
    });
    const sourceSentencesTotal = source.flatMap(p => splitTextToSentences(p)).length;
    let currentSourceSentenceIdx = 0;
    let currentTargetSentenceIdx = 0;
    const renderTextContent = (sentences, startIdx, isHeaderStyle) => {
      if (interactionMode === 'explain' || interactionMode === 'revise') {
        const cleanText = sentences.join(' ').replace(/\*\*|\*/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        return /*#__PURE__*/React.createElement("div", {
          className: `cursor-text selection:text-teal-900 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'}`,
          onMouseUp: handleTextMouseUp
        }, cleanText);
      } else if (interactionMode === 'add-glossary') {
        const textBlock = sentences.join(' ').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
        const parts = highlightGlossaryTerms(textBlock, latestGlossary, false);
        const partsArray = Array.isArray(parts) ? parts : [parts];
        return partsArray.map((part, ptIdx) => {
          if (React.isValidElement(part)) {
            return /*#__PURE__*/React.createElement("span", {
              key: ptIdx,
              className: "bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-200 inline-flex items-baseline"
            }, /*#__PURE__*/React.createElement("span", {
              className: "text-[11px] mr-1 text-indigo-600 font-bold"
            }, "\u2713"), part);
          }
          if (typeof part !== 'string') return null;
          return part.split(/(\s+)/).map((subPart, spIdx) => {
            if (subPart.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
              key: `${ptIdx}-${spIdx}`
            }, subPart);
            const cleanWord = subPart.replace(/\*\*|\*/g, '');
            return /*#__PURE__*/React.createElement("span", {
              key: `${ptIdx}-${spIdx}`,
              onClick: e => {
                e.stopPropagation();
                handleQuickAddGlossary(cleanWord, true);
              },
              onKeyDown: e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleQuickAddGlossary(cleanWord, true);
                }
              },
              tabIndex: 0,
              role: "button",
              className: "cursor-copy hover:bg-green-200 text-slate-800 hover:text-green-900 rounded px-0.5 transition-colors inline-block border-b border-transparent hover:border-green-400 select-none",
              title: t('common.click_add_glossary')
            }, cleanWord);
          });
        });
      } else if (interactionMode === 'phonics' || interactionMode === 'define') {
        const textBlock = sentences.join(' ').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
        return textBlock.split(/(\s+)/).map((part, i) => {
          if (part.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
            key: i
          }, part);
          const cleanWord = part.replace(/\*\*|\*/g, '');
          const handleClick = e => {
            if (interactionMode === 'phonics') handlePhonicsClick(cleanWord, e);
            if (interactionMode === 'define') handleWordClick(cleanWord, e);
          };
          return /*#__PURE__*/React.createElement("span", {
            key: i,
            onClick: handleClick,
            onKeyDown: e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e);
              }
            },
            tabIndex: "0",
            role: "button",
            "aria-label": interactionMode === 'phonics' ? `Hear phonics for ${cleanWord}` : `Define ${cleanWord}`,
            className: `cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 inline-block border-b border-transparent hover:border-emerald-200 focus:bg-yellow-200 focus:outline-none`,
            title: interactionMode === 'phonics' ? t('text_tools.click_to_phonics') : t('text_tools.click_to_define')
          }, cleanWord);
        });
      } else {
        return sentences.map((s, sIdx) => {
          const globalIdx = startIdx + sIdx;
          const isActive = globalIdx === playbackState.currentIdx;
          const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
          const isHeader = s.trim().startsWith('#') || isHtmlHeader;
          const headerLevel = isHeader ? isHtmlHeader ? parseInt((s.trim().match(/^<h([1-6])/) || [0, 2])[1]) : (s.trim().match(/^#+/) || [''])[0].length : 0;
          const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
          const headerClass = isHeader ? headerLevel === 1 ? "text-2xl font-bold text-orange-900 block mb-2 mt-4" : headerLevel === 2 ? "text-xl font-bold text-orange-900 block mb-2 mt-3" : "text-lg font-bold text-orange-900 block mb-1 mt-2" : "";
          return /*#__PURE__*/React.createElement("span", {
            key: sIdx,
            id: `sentence-${globalIdx}`,
            onClick: e => {
              if (interactionMode === 'cloze') return;
              e.stopPropagation();
              handleSpeak(generatedContent?.data, 'simplified-main', globalIdx);
            },
            onKeyDown: e => {
              if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'cloze') {
                e.preventDefault();
                handleSpeak(generatedContent?.data, 'simplified-main', globalIdx);
              }
            },
            tabIndex: interactionMode !== 'cloze' ? "0" : "-1",
            role: interactionMode !== 'cloze' ? "button" : "text",
            "aria-label": `Read sentence: ${cleanText}`,
            className: `transition-colors duration-300 rounded px-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100 focus:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200' : ''} ${isActive ? 'bg-yellow-200 text-black shadow-sm' : ''} ${headerClass}`,
            title: interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""
          }, formatInteractiveText(cleanText, interactionMode === 'cloze'), " ");
        });
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "hidden md:block font-bold text-orange-800 text-sm uppercase tracking-wider border-b-2 border-orange-200 pb-2 mb-2"
    }, leveledTextLanguage), /*#__PURE__*/React.createElement("div", {
      className: "hidden md:block font-bold text-orange-800 text-sm uppercase tracking-wider border-b-2 border-orange-200 pb-2 mb-2"
    }, t('common.english_translation')), rows.map((_, i) => {
      const sourceParaSentences = source[i] ? splitTextToSentences(source[i]) : [];
      const targetParaSentences = target[i] ? splitTextToSentences(target[i]) : [];
      const rowSourceStartIdx = currentSourceSentenceIdx;
      const rowTargetStartIdx = currentTargetSentenceIdx;
      const rowSourceEndIdx = rowSourceStartIdx + sourceParaSentences.length;
      const rowTargetEndIdx = rowTargetStartIdx + targetParaSentences.length;
      currentSourceSentenceIdx += sourceParaSentences.length;
      currentTargetSentenceIdx += targetParaSentences.length;
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: i
      }, /*#__PURE__*/React.createElement("div", {
        className: `bg-white/60 rounded-lg p-4 border border-orange-100 hover:border-orange-300 transition-colors ${isRtlLang(generatedContent?.config?.language || leveledTextLanguage) ? 'text-right' : 'text-left'}`,
        dir: isRtlLang(generatedContent?.config?.language || leveledTextLanguage) ? 'rtl' : 'ltr'
      }, /*#__PURE__*/React.createElement("div", {
        className: "md:hidden font-bold text-orange-800 text-xs uppercase tracking-wider mb-2"
      }, leveledTextLanguage), /*#__PURE__*/React.createElement("div", {
        className: "text-lg text-slate-800 font-medium leading-relaxed"
      }, renderTextContent(sourceParaSentences, rowSourceStartIdx, false))), /*#__PURE__*/React.createElement("div", {
        className: "bg-indigo-50/60 rounded-lg p-4 border border-indigo-100 hover:border-indigo-300 transition-colors relative text-left",
        dir: "ltr"
      }, /*#__PURE__*/React.createElement("div", {
        className: "md:hidden font-bold text-indigo-800 text-xs uppercase tracking-wider mb-2 mt-2 md:mt-0"
      }, t('common.english')), /*#__PURE__*/React.createElement("div", {
        className: "text-base text-slate-700 leading-relaxed"
      }, renderTextContent(targetParaSentences, rowTargetStartIdx, false))));
    }));
  })(), isProcessing && /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex items-center justify-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider animate-pulse opacity-80"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }), " Generating more...")) : /*#__PURE__*/React.createElement("div", {
    className: `w-full min-h-[500px] text-lg font-medium leading-relaxed font-sans prose prose-p:my-2 max-w-none ${cursorStyles[interactionMode]} transition-all duration-500 ease-in-out ${isLineFocusMode ? 'bg-slate-950 text-slate-600 p-8 rounded-2xl shadow-inner prose-invert' : 'text-slate-800 prose-headings:text-orange-900 prose-strong:text-orange-900'} ${getContentDirection(generatedContent?.config?.language || leveledTextLanguage) === 'rtl' ? 'text-right' : 'text-left'}`,
    dir: getContentDirection(generatedContent?.config?.language || leveledTextLanguage)
  }, generatedContent?.data ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    const rawData = generatedContent?.data;
    const _fullData = typeof rawData === 'string' ? rawData : String(rawData || '');
    const {
      body: _bodyNoRefs,
      references: _referencesFromContent
    } = splitReferencesFromBody(_fullData);
    const _refsFromInput = inputText ? splitReferencesFromBody(inputText).references : '';
    const _refsContentCount = parseReferenceItems(_referencesFromContent || '').length;
    const _refsInputCount = parseReferenceItems(_refsFromInput || '').length;
    const _references = _refsInputCount > _refsContentCount ? _refsFromInput : _referencesFromContent || _refsFromInput;
    const _bilingualIdx = _bodyNoRefs.indexOf('--- ENGLISH TRANSLATION ---');
    const _hasBilingual = _bilingualIdx !== -1;
    const safeData = _hasBilingual ? _bodyNoRefs.substring(0, _bilingualIdx).trim() : _bodyNoRefs;
    const _englishBlock = _hasBilingual ? _bodyNoRefs.substring(_bilingualIdx + '--- ENGLISH TRANSLATION ---'.length).trim() : '';
    const _bodyEl = (() => {
      const sideBySideData = getSideBySideContent(safeData);
      if (sideBySideData) {
        let sentenceCounter = 0;
        const {
          source,
          target
        } = sideBySideData;
        const renderParagraphs = (paragraphs, keyPrefix, isEnglish = false) => paragraphs.map((para, pIdx) => {
          if (para.trim().startsWith('|') || para.includes('\n|')) {
            return /*#__PURE__*/React.createElement("div", {
              key: `${keyPrefix}-table-${pIdx}`,
              className: "mb-6 overflow-x-auto"
            }, renderFormattedText(para, false));
          }
          const paragraphId = `${keyPrefix}-${pIdx}`;
          const sentencesInPara = splitTextToSentences(para);
          const startIdx = sentenceCounter;
          const endIdx = startIdx + sentencesInPara.length;
          if (interactionMode !== 'explain' && interactionMode !== 'revise' && interactionMode !== 'add-glossary' && interactionMode !== 'define' && interactionMode !== 'phonics') {
            sentenceCounter += sentencesInPara.length;
          } else {
            sentenceCounter += sentencesInPara.length;
          }
          const isReadingThisParagraph = isPlaying && playbackState.currentIdx >= startIdx && playbackState.currentIdx < endIdx;
          const shouldFocus = isPlaying ? isReadingThisParagraph : focusedParagraphIndex === paragraphId;
          const isDimmed = isLineFocusMode && !shouldFocus;
          if (interactionMode === 'explain' || interactionMode === 'revise') {
            const cleanText = para.replace(/\*\*|\*/g, '');
            return /*#__PURE__*/React.createElement("p", {
              key: pIdx,
              className: `mb-4 leading-relaxed cursor-text selection:text-teal-900 transition-all duration-500 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'} ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 rounded-xl shadow-lg text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`,
              onMouseUp: handleTextMouseUp,
              onMouseEnter: () => setFocusedParagraphIndex(pIdx),
              onMouseLeave: () => setFocusedParagraphIndex(null)
            }, cleanText);
          }
          if (sentencesInPara.length === 0) return null;
          return /*#__PURE__*/React.createElement("p", {
            key: pIdx,
            className: `mb-4 leading-relaxed transition-all duration-500 ease-in-out rounded-xl ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 shadow-2xl text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`,
            onMouseEnter: () => setFocusedParagraphIndex(pIdx),
            onMouseLeave: () => setFocusedParagraphIndex(null)
          }, interactionMode === 'add-glossary' ? (() => {
            const cleanPara = para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
            const parts = highlightGlossaryTerms(cleanPara, latestGlossary, false);
            const partsArray = Array.isArray(parts) ? parts : [parts];
            return partsArray.map((part, ptIdx) => {
              if (React.isValidElement(part)) {
                return /*#__PURE__*/React.createElement("span", {
                  key: ptIdx,
                  className: "bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-200 inline-flex items-baseline"
                }, /*#__PURE__*/React.createElement("span", {
                  className: "text-[11px] mr-1 text-indigo-600 font-bold"
                }, "\u2713"), part);
              }
              if (typeof part !== 'string') return null;
              return part.split(/(\s+)/).map((subPart, spIdx) => {
                if (subPart.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
                  key: `${ptIdx}-${spIdx}`
                }, subPart);
                const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(subPart);
                const isHeader = subPart.startsWith('#') || isHtmlHeader;
                let displayPart = isHeader ? isHtmlHeader ? subPart.replace(/<\/?h[1-6][^>]*>/gi, '') : subPart.replace(/^#+\s*/, '') : subPart;
                displayPart = displayPart.replace(/\*\*|\*/g, '');
                return /*#__PURE__*/React.createElement("span", {
                  key: `${ptIdx}-${spIdx}`,
                  onClick: e => {
                    e.stopPropagation();
                    handleQuickAddGlossary(displayPart, true);
                  },
                  className: `rounded px-0.5 transition-colors duration-200 ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''} cursor-copy hover:bg-green-200 border-b border-transparent hover:border-green-400 select-none`,
                  title: t('common.click_add_glossary')
                }, displayPart);
              });
            });
          })() : interactionMode === 'define' ? para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
            if (part.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
              key: i
            }, part);
            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(part);
            const isHeader = part.startsWith('#') || isHtmlHeader;
            let displayPart = isHeader ? isHtmlHeader ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
            displayPart = displayPart.replace(/\*\*|\*/g, '');
            const handleClick = e => handleWordClick(displayPart, e);
            return /*#__PURE__*/React.createElement("span", {
              key: i,
              onClick: handleClick,
              onKeyDown: e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(e);
                }
              },
              tabIndex: 0,
              role: "button",
              className: `cursor-help hover:bg-yellow-200 rounded px-0.5 transition-colors duration-200 focus:bg-yellow-200 focus:outline-none ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''}`
            }, displayPart);
          }) : interactionMode === 'phonics' ? para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
            if (part.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
              key: i
            }, part);
            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(part);
            const isHeader = part.startsWith('#') || isHtmlHeader;
            let displayPart = isHeader ? isHtmlHeader ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
            displayPart = displayPart.replace(/\*\*|\*/g, '');
            const handleClick = e => handlePhonicsClick(displayPart, e);
            return /*#__PURE__*/React.createElement("span", {
              key: i,
              onClick: handleClick,
              onKeyDown: e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(e);
                }
              },
              tabIndex: 0,
              role: "button",
              className: `cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-emerald-200 inline-block focus:bg-yellow-200 focus:outline-none ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''}`,
              title: t('common.click_hear_phonics')
            }, displayPart);
          }) : sentencesInPara.map((sentence, sIdx) => {
            const currentGlobalIdx = startIdx + sIdx;
            const isActive = currentGlobalIdx === playbackState.currentIdx;
            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(sentence.trim());
            const isHeader = sentence.trim().startsWith('#') || isHtmlHeader;
            const headerLevel = isHeader ? isHtmlHeader ? parseInt((sentence.trim().match(/^<h([1-6])/) || [0, 2])[1]) : (sentence.trim().match(/^#+/) || [''])[0].length : 0;
            const cleanText = isHeader ? isHtmlHeader ? sentence.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : sentence.trim().replace(/^#+\s*/, '') : sentence;
            const headerClass = isHeader ? headerLevel === 1 ? `text-2xl font-bold ${isEnglish ? isLineFocusMode ? 'text-indigo-300' : 'text-indigo-900' : isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-6 border-b ${isEnglish ? 'border-indigo-200' : 'border-orange-200'} pb-1` : headerLevel === 2 ? `text-xl font-bold ${isEnglish ? isLineFocusMode ? 'text-indigo-300' : 'text-indigo-900' : isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-4` : `text-lg font-bold ${isEnglish ? isLineFocusMode ? 'text-indigo-300' : 'text-indigo-900' : isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-1 mt-3` : "";
            return /*#__PURE__*/React.createElement("span", {
              key: sIdx,
              id: `sentence-${currentGlobalIdx}`,
              onClick: e => {
                if (interactionMode === 'cloze') return;
                e.stopPropagation();
                handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
              },
              className: `transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100/20' : ''} ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : isLineFocusMode ? 'text-slate-100' : 'text-slate-800'} ${headerClass}`,
              title: interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""
            }, formatInteractiveText(cleanText, interactionMode === 'cloze'), " ");
          }));
        });
        return /*#__PURE__*/React.createElement(React.Fragment, null, renderParagraphs(source, 'src'), /*#__PURE__*/React.createElement("div", {
          className: `my-8 flex items-center gap-4 text-indigo-600 font-bold text-sm tracking-wider uppercase select-none transition-opacity duration-300 ${isLineFocusMode && focusedParagraphIndex !== null ? 'opacity-20' : 'opacity-100'}`
        }, /*#__PURE__*/React.createElement("div", {
          className: "h-px bg-indigo-200 flex-grow"
        }), t('common.english_translation'), /*#__PURE__*/React.createElement("div", {
          className: "h-px bg-indigo-200 flex-grow"
        })), /*#__PURE__*/React.createElement("div", {
          dir: "ltr",
          className: "text-left"
        }, renderParagraphs(target, 'tgt', true)));
      } else {
        const paragraphs = safeData.split(/\n{2,}/);
        let sentenceCounter = 0;
        return paragraphs.map((para, pIdx) => {
          if (para.trim().startsWith('|') || para.includes('\n|')) {
            return /*#__PURE__*/React.createElement("div", {
              key: `mono-table-${pIdx}`,
              className: "mb-6 overflow-x-auto"
            }, renderFormattedText(para, false));
          }
          const sentencesInPara = splitTextToSentences(para);
          const startIdx = sentenceCounter;
          const endIdx = startIdx + sentencesInPara.length;
          sentenceCounter += sentencesInPara.length;
          const isReadingThisParagraph = isPlaying && playbackState.currentIdx >= startIdx && playbackState.currentIdx < endIdx;
          const shouldFocus = isPlaying ? isReadingThisParagraph : focusedParagraphIndex === pIdx;
          const isDimmed = isLineFocusMode && !shouldFocus;
          if (interactionMode === 'explain' || interactionMode === 'revise' || interactionMode === 'add-glossary') {
            const cleanText = para.replace(/\*\*|\*/g, '');
            return /*#__PURE__*/React.createElement("p", {
              key: pIdx,
              className: `mb-4 leading-relaxed cursor-text selection:text-teal-900 transition-all duration-500 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'} ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 rounded-xl shadow-lg text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`,
              onMouseUp: handleTextMouseUp,
              onMouseEnter: () => setFocusedParagraphIndex(pIdx),
              onMouseLeave: () => setFocusedParagraphIndex(null)
            }, cleanText);
          }
          if (sentencesInPara.length === 0) return null;
          return /*#__PURE__*/React.createElement("p", {
            key: pIdx,
            className: `mb-4 leading-relaxed transition-all duration-500 ease-in-out rounded-xl ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 shadow-2xl text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`,
            onMouseEnter: () => setFocusedParagraphIndex(pIdx),
            onMouseLeave: () => setFocusedParagraphIndex(null)
          }, interactionMode === 'cloze' ? sentencesInPara.map((sentence, sIdx) => {
            const currentGlobalIdx = startIdx + sIdx;
            const cleanText = sentence.trim().replace(/^#+\s*/, '');
            return /*#__PURE__*/React.createElement("span", {
              key: sIdx
            }, formatInteractiveText(cleanText, true), " ");
          }) : interactionMode === 'phonics' || interactionMode === 'define' ? para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
            if (part.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
              key: i
            }, part);
            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(part);
            const isHeader = part.startsWith('#') || isHtmlHeader;
            let displayPart = isHeader ? isHtmlHeader ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
            displayPart = displayPart.replace(/\*\*|\*/g, '');
            const handleClick = e => {
              if (interactionMode === 'phonics') handlePhonicsClick(displayPart, e);
              if (interactionMode === 'define') handleWordClick(displayPart, e);
            };
            return /*#__PURE__*/React.createElement("span", {
              key: i,
              onClick: handleClick,
              onKeyDown: e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(e);
                }
              },
              tabIndex: "0",
              role: "button",
              "aria-label": interactionMode === 'phonics' ? `Hear phonics for ${displayPart}` : `Define ${displayPart}`,
              className: `cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-emerald-200 inline-block focus:bg-yellow-200 focus:outline-none ${isHeader ? 'font-bold text-orange-900' : ''}`,
              title: interactionMode === 'phonics' ? t('text_tools.click_to_phonics') : t('text_tools.click_to_define')
            }, displayPart);
          }) : sentencesInPara.map((sentence, sIdx) => {
            const currentGlobalIdx = startIdx + sIdx;
            const isActive = currentGlobalIdx === playbackState.currentIdx;
            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(sentence.trim());
            const isHeader = sentence.trim().startsWith('#') || isHtmlHeader;
            const headerLevel = isHeader ? isHtmlHeader ? parseInt((sentence.trim().match(/^<h([1-6])/) || [0, 2])[1]) : (sentence.trim().match(/^#+/) || [''])[0].length : 0;
            const cleanText = isHeader ? isHtmlHeader ? sentence.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : sentence.trim().replace(/^#+\s*/, '') : sentence;
            const headerClass = isHeader ? headerLevel === 1 ? `text-2xl font-bold ${isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-6 border-b border-orange-200 pb-1` : headerLevel === 2 ? `text-xl font-bold ${isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-4` : `text-lg font-bold ${isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-1 mt-3` : "";
            return /*#__PURE__*/React.createElement("span", {
              key: sIdx,
              id: `sentence-${currentGlobalIdx}`,
              onClick: e => {
                if (interactionMode === 'cloze') return;
                e.stopPropagation();
                handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
              },
              onKeyDown: e => {
                if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'cloze') {
                  e.preventDefault();
                  handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
                }
              },
              tabIndex: interactionMode !== 'cloze' ? "0" : "-1",
              role: interactionMode !== 'cloze' ? "button" : "text",
              "aria-label": `Read sentence: ${cleanText}`,
              className: `transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100/20' : ''} ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : isLineFocusMode ? 'text-slate-100' : 'text-slate-800'} ${headerClass}`,
              title: interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""
            }, formatInteractiveText(cleanText, interactionMode === 'cloze'), " ");
          }));
        });
      }
    })();
    return /*#__PURE__*/React.createElement(React.Fragment, null, _bodyEl, _hasBilingual && _englishBlock && (() => {
      const _isTable = p => p.trim().startsWith('|') || p.includes('\n|');
      const _srcParas = safeData.split(/\n{2,}/).filter(p => p.trim());
      const _srcSentCount = _srcParas.flatMap(p => _isTable(p) ? [] : splitTextToSentences(p)).length;
      const _engParas = _englishBlock.split(/\n{2,}/).filter(p => p.trim());
      let _engSentCounter = _srcSentCount;
      return /*#__PURE__*/React.createElement("div", {
        className: "mt-6 pl-4 border-l-4 border-indigo-300 bg-slate-50 p-4 rounded-r-xl"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-2 border-b border-indigo-100 pb-1 inline-block"
      }, "English Translation"), /*#__PURE__*/React.createElement("div", {
        className: "text-slate-700 leading-relaxed"
      }, _engParas.map((para, pIdx) => {
        if (_isTable(para)) {
          return /*#__PURE__*/React.createElement("div", {
            key: `eng-table-${pIdx}`,
            className: "mb-6 overflow-x-auto"
          }, renderFormattedText(para, false));
        }
        const sentencesInPara = splitTextToSentences(para);
        if (sentencesInPara.length === 0) return null;
        const startIdx = _engSentCounter;
        _engSentCounter += sentencesInPara.length;
        if (interactionMode === 'explain' || interactionMode === 'revise') {
          const cleanText = para.replace(/\*\*|\*/g, '');
          return /*#__PURE__*/React.createElement("p", {
            key: `eng-p-${pIdx}`,
            className: `mb-4 leading-relaxed cursor-text selection:text-teal-900 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'}`,
            onMouseUp: handleTextMouseUp
          }, cleanText);
        }
        if (interactionMode === 'add-glossary') {
          const cleanPara = para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
          const parts = highlightGlossaryTerms(cleanPara, latestGlossary, false);
          const partsArray = Array.isArray(parts) ? parts : [parts];
          return /*#__PURE__*/React.createElement("p", {
            key: `eng-p-${pIdx}`,
            className: "mb-4 leading-relaxed"
          }, partsArray.map((part, ptIdx) => {
            if (React.isValidElement(part)) {
              return /*#__PURE__*/React.createElement("span", {
                key: ptIdx,
                className: "bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-200 inline-flex items-baseline"
              }, /*#__PURE__*/React.createElement("span", {
                className: "text-[11px] mr-1 text-indigo-600 font-bold"
              }, "\u2713"), part);
            }
            if (typeof part !== 'string') return null;
            return part.split(/(\s+)/).map((subPart, spIdx) => {
              if (subPart.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
                key: `${ptIdx}-${spIdx}`
              }, subPart);
              const isHtmlHeader2 = /^<h([1-6])[^>]*>/i.test(subPart);
              const isHeader2 = subPart.startsWith('#') || isHtmlHeader2;
              let displayPart2 = isHeader2 ? isHtmlHeader2 ? subPart.replace(/<\/?h[1-6][^>]*>/gi, '') : subPart.replace(/^#+\s*/, '') : subPart;
              displayPart2 = displayPart2.replace(/\*\*|\*/g, '');
              return /*#__PURE__*/React.createElement("span", {
                key: `${ptIdx}-${spIdx}`,
                onClick: e => {
                  e.stopPropagation();
                  handleQuickAddGlossary(displayPart2, true);
                },
                className: `rounded px-0.5 transition-colors duration-200 ${isHeader2 ? 'font-bold text-indigo-900' : ''} cursor-copy hover:bg-green-200 border-b border-transparent hover:border-green-400 select-none`,
                title: t('common.click_add_glossary')
              }, displayPart2);
            });
          }));
        }
        if (interactionMode === 'phonics' || interactionMode === 'define') {
          return /*#__PURE__*/React.createElement("p", {
            key: `eng-p-${pIdx}`,
            className: "mb-4 leading-relaxed"
          }, para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
            if (part.match(/^\s+$/)) return /*#__PURE__*/React.createElement("span", {
              key: i
            }, part);
            const isHtmlHeader3 = /^<h([1-6])[^>]*>/i.test(part);
            const isHeader3 = part.startsWith('#') || isHtmlHeader3;
            let displayPart3 = isHeader3 ? isHtmlHeader3 ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
            displayPart3 = displayPart3.replace(/\*\*|\*/g, '');
            const handleClick = e => {
              if (interactionMode === 'phonics') handlePhonicsClick(displayPart3, e);
              if (interactionMode === 'define') handleWordClick(displayPart3, e);
            };
            return /*#__PURE__*/React.createElement("span", {
              key: i,
              onClick: handleClick,
              onKeyDown: e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(e);
                }
              },
              tabIndex: "0",
              role: "button",
              "aria-label": interactionMode === 'phonics' ? `Hear phonics for ${displayPart3}` : `Define ${displayPart3}`,
              className: `cursor-help hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-indigo-200 inline-block focus:bg-yellow-200 focus:outline-none ${isHeader3 ? 'font-bold text-indigo-900' : ''}`,
              title: interactionMode === 'phonics' ? t('text_tools.click_to_phonics') : t('text_tools.click_to_define')
            }, displayPart3);
          }));
        }
        return /*#__PURE__*/React.createElement("p", {
          key: `eng-p-${pIdx}`,
          className: "mb-4 leading-relaxed"
        }, sentencesInPara.map((sentence, sIdx) => {
          const currentGlobalIdx = startIdx + sIdx;
          const isActive = currentGlobalIdx === playbackState.currentIdx;
          const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(sentence.trim());
          const isHeader = sentence.trim().startsWith('#') || isHtmlHeader;
          const headerLevel = isHeader ? isHtmlHeader ? parseInt((sentence.trim().match(/^<h([1-6])/) || [0, 2])[1]) : (sentence.trim().match(/^#+/) || [''])[0].length : 0;
          const cleanText = isHeader ? isHtmlHeader ? sentence.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : sentence.trim().replace(/^#+\s*/, '') : sentence;
          const headerClass = isHeader ? headerLevel === 1 ? 'text-2xl font-bold text-indigo-900 block mb-2 mt-6 border-b border-indigo-200 pb-1' : headerLevel === 2 ? 'text-xl font-bold text-indigo-900 block mb-2 mt-4' : 'text-lg font-bold text-indigo-900 block mb-1 mt-3' : "";
          return /*#__PURE__*/React.createElement("span", {
            key: sIdx,
            id: `sentence-${currentGlobalIdx}`,
            onClick: e => {
              if (interactionMode === 'cloze') return;
              e.stopPropagation();
              handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
            },
            onKeyDown: e => {
              if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'cloze') {
                e.preventDefault();
                handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
              }
            },
            tabIndex: interactionMode !== 'cloze' ? "0" : "-1",
            role: interactionMode !== 'cloze' ? "button" : "text",
            "aria-label": `Read sentence: ${cleanText}`,
            className: `transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100/20' : ''} ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'text-slate-700'} ${headerClass}`,
            title: interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""
          }, formatInteractiveText(cleanText, interactionMode === 'cloze'), " ");
        }));
      })));
    })(), /*#__PURE__*/React.createElement(SourceReferencesPanel, {
      referencesText: _references
    }));
  })()) : null, isProcessing && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider animate-pulse opacity-80"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }), " Generating more..."))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SimplifiedView = SimplifiedView;
  window.AlloModules.ViewSimplifiedModule = true;
})();
