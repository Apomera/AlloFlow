// Inject Chunk Read mood keyframes once. Reduced-motion media query disables
  // the animations globally so users with that preference see static styling.
  (function () {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-chunk-mood-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-chunk-mood-css';
    st.textContent = '@keyframes allo-chunk-popin { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }' + '@keyframes allo-chunk-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }' + '@media (prefers-reduced-motion: reduce) {' + '  [data-sentence-idx] { animation: none !important; }' + '}';
    if (document.head) document.head.appendChild(st);
  })();
  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? <I {...props} /> : null;
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
    return <div className="space-y-6">{isImmersiveReaderActive && generatedContent?.immersiveData && <div className="fixed inset-0 z-[200] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 flex flex-col font-sans" style={{
        backgroundColor: immersiveSettings.bgColor || '#fdfbf7'
      }} onMouseMove={e => setImmersiveRulerY(e.clientY)}><ImmersiveToolbar settings={immersiveSettings} setSettings={setImmersiveSettings} onClose={handleCloseImmersiveReader} onGeneratePOS={handleGeneratePOSData} isGeneratingPOS={isAnalyzingPos} posReady={!!generatedContent?.posEnriched} onGenerateSyllables={handleGeneratePOSData} isGeneratingSyllables={isAnalyzingPos} syllablesReady={!!generatedContent?.posEnriched} playbackRate={playbackRate} setPlaybackRate={setPlaybackRate} lineHeight={lineHeight} setLineHeight={setLineHeight} letterSpacing={letterSpacing} setLetterSpacing={setLetterSpacing} isFocusReaderActive={isFocusReaderActive} onToggleFocusReader={() => setIsFocusReaderActive(!isFocusReaderActive)} isChunkReaderActive={isChunkReaderActive} onToggleChunkReader={() => {
          setIsChunkReaderActive(!isChunkReaderActive);
          setChunkReaderIdx(0);
          setChunkReaderAutoPlay(false);
        }} chunkReaderIdx={chunkReaderIdx} setChunkReaderIdx={setChunkReaderIdx} chunkReaderAutoPlay={chunkReaderAutoPlay} setChunkReaderAutoPlay={setChunkReaderAutoPlay} chunkReaderSpeed={chunkReaderSpeed} setChunkReaderSpeed={setChunkReaderSpeed} chunkReaderMood={chunkReaderMood} setChunkReaderMood={setChunkReaderMood} interactionMode={interactionMode} setInteractionMode={setInteractionMode} isCrawlReaderActive={isCrawlReaderActive} onToggleCrawlReader={() => setIsCrawlReaderActive(!isCrawlReaderActive)} isKaraokeOverlayActive={isKaraokeOverlayActive} onToggleKaraokeOverlay={() => setIsKaraokeOverlayActive(!isKaraokeOverlayActive)} chunkReaderReadAlong={chunkReaderReadAlong} onToggleChunkReaderReadAlong={() => {
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
        }} totalSentences={(() => {
          const sbs = getSideBySideContent(generatedContent?.data);
          const ps = sbs ? [...(sbs.source || []), ...(sbs.target || [])] : (generatedContent?.data || '').split(new RegExp('\\n{2,}'));
          return ps.flatMap(p => p.trim().startsWith('|') ? [] : splitTextToSentences(p)).length || 1;
        })()} /><ErrorBoundary fallbackMessage="Focus reader encountered an error. Please close and reopen."><FocusReaderOverlay isOpen={isFocusReaderActive} onClose={handleCloseSpeedReader} text={(generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')} /><PerspectiveCrawlOverlay isOpen={isCrawlReaderActive} onClose={() => setIsCrawlReaderActive(false)} text={(generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')} /><KaraokeReaderOverlay isOpen={isKaraokeOverlayActive} onClose={() => setIsKaraokeOverlayActive(false)} getAudioUrl={sentenceText => callTTS(sentenceText).catch(() => null)} text={(generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')} /></ErrorBoundary>{immersiveSettings.lineFocus && <><div className="fixed top-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[height] duration-75 ease-out" style={{
            height: Math.max(0, immersiveRulerY - immersiveSettings.textSize * 2.5) + 'px'
          }} /><div className="fixed bottom-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[top] duration-75 ease-out" style={{
            top: immersiveRulerY + immersiveSettings.textSize * 2.5 + 'px'
          }} /><div className="fixed left-0 right-0 border-b border-indigo-400/30 z-[210] pointer-events-none transition-[top] duration-75 ease-out" style={{
            top: immersiveRulerY + 'px'
          }} /></>}<div className="flex-grow overflow-y-auto p-8 md:p-16 custom-scrollbar relative z-10"><div className={`max-w-4xl mx-auto transition-all duration-300`} style={{
            color: immersiveSettings.fontColor || '#1e293b',
            lineHeight: lineHeight,
            letterSpacing: `${immersiveSettings.wideText ? letterSpacing + 0.15 : letterSpacing}em`,
            wordSpacing: immersiveSettings.wideText ? '0.25em' : 'normal',
            fontFamily: immersiveSettings.fontFamily || undefined
          }}>{(() => {
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
              const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              return generatedContent.immersiveData.map((wordData, i) => {
                if (wordData.pos === 'newline') {
                  return <div key={wordData.id || i} className="w-full h-4" />;
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
                return <span key={wordData.id || i} data-sentence-idx={assignedIdx} style={{
                  opacity: moodOpacity,
                  transition: chunkReaderMood === 'typewriter' ? 'opacity 0.05s linear' : 'all 0.3s ease',
                  // In chunk-read mode every word is click-to-jump (onClick below);
                  // pointer cursor surfaces the affordance without needing instructions.
                  ...(isChunkReaderActive ? {
                    cursor: 'pointer'
                  } : {}),
                  ...(moodAnimation ? {
                    animation: moodAnimation
                  } : {}),
                  ...(showHighlight || isPlaying && playbackState.currentIdx === assignedIdx ? {
                    backgroundColor: 'rgba(250, 204, 21, 0.35)',
                    borderRadius: '4px',
                    boxDecorationBreak: 'clone',
                    WebkitBoxDecorationBreak: 'clone'
                  } : {})
                }}><ImmersiveWord wordData={wordData} settings={immersiveSettings} isActive={isPlaying && playbackState.currentIdx === assignedIdx || isChunkHighlight} onClick={e => {
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
                  }} /></span>;
              });
            })()}</div></div></div>}{interactionMode === 'cloze' && isClozeComplete && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"><ConfettiExplosion /><div className="mt-40 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border-4 border-white shadow-xl animate-in zoom-in duration-500 flex items-center gap-2"><Trophy size={24} className="text-yellow-500 fill-current" /> Activity Complete!</div></div>}{!isZenMode && <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-6"><p className="text-sm text-green-800"><strong>{t('simplified.udl_goal').split(':')[0]}:</strong> {t('simplified.udl_goal').split(':')[1]}</p></div>}<div className={`bg-orange-50 border-l-4 border-orange-400 shadow-sm rounded-r-lg relative ${isZenMode ? 'p-4' : 'p-8'}`}>{!isZenMode && <div className="flex justify-center items-center mb-2 flex-wrap gap-2">{(() => {
            const displayGrade = generatedContent?.config?.grade || gradeLevel;
            const displayLang = generatedContent?.config?.language || leveledTextLanguage;
            const displayInterests = generatedContent?.config?.interests || studentInterests;
            const displayStandards = generatedContent?.config?.standards || standardsInput;
            return <div className="flex items-center gap-2"><h4 className="font-comic font-bold text-xl text-orange-800">{isTeacherMode ? `${t('simplified.target_level_label')}: ${displayGrade}` : sourceTopic || "Reading Selection"}</h4>{displayLang !== 'English' && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold border border-blue-200">{displayLang}</span>}{displayInterests.length > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold border border-red-200 flex items-center gap-1"><Heart size={10} /> {t('simplified.engagement_optimized')}</span>}{displayStandards && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200 flex items-center gap-1 cursor-help" title={`${t('simplified.label_standard')}: ${displayStandards}`}><CheckCircle size={10} />{displayStandards.length > 20 ? displayStandards.substring(0, 20) + '...' : displayStandards}</span>}</div>;
          })()}</div>}<div className={`flex items-center gap-2 ${isZenMode ? 'justify-center mb-4' : 'justify-center'}`}><div className="flex flex-col gap-1 items-center"><div className="flex flex-wrap justify-center bg-white rounded-2xl sm:rounded-full p-1 border border-indigo-200 shadow-sm sm:flex-nowrap gap-y-1"><button onClick={() => {
                setInteractionMode('read');
                stopPlayback();
                setSelectionMenu(null);
                setRevisionData(null);
                setIsCompareMode(false);
                setIsFluencyMode(false);
              }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'read' && !isCompareMode && !isFluencyMode ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_read')} aria-label={t('simplified.read_mode')} data-help-key="simplified_read_mode"><Volume2 size={12} /> {t('simplified.read_mode')}</button><button onClick={() => {
                setIsFluencyMode(true);
                stopPlayback();
                setInteractionMode('read');
                setIsCompareMode(false);
              }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${isFluencyMode ? 'bg-rose-100 text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_read_along')} aria-label={t('simplified.read_along')} data-help-key="simplified_read_along"><Mic size={12} /> {t('simplified.read_along')}</button><button onClick={() => {
                setInteractionMode('define');
                stopPlayback();
                setSelectionMenu(null);
                setRevisionData(null);
                setIsCompareMode(false);
                setIsFluencyMode(false);
              }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'define' && !isCompareMode ? 'bg-yellow-100 text-yellow-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_define')} aria-label={t('simplified.define_mode')} data-help-key="simplified_define_mode"><Search size={12} /> {t('simplified.define_mode')}</button><button onClick={() => {
                setInteractionMode('phonics');
                stopPlayback();
                setPhonicsData(null);
                setIsCompareMode(false);
                setIsFluencyMode(false);
              }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'phonics' && !isCompareMode ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_phonics')} aria-label={t('simplified.phonics_mode')} data-help-key="simplified_phonics_mode"><Ear size={12} /> {t('simplified.phonics_mode')}</button>{isTeacherMode && <button onClick={() => {
                setInteractionMode('add-glossary');
                stopPlayback();
                setSelectionMenu(null);
                setRevisionData(null);
                setIsCompareMode(false);
                setIsFluencyMode(false);
              }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'add-glossary' && !isCompareMode ? 'bg-green-100 text-green-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_add_term')} aria-label={t('simplified.add_term')} data-help-key="simplified_add_term"><Plus size={12} /> {t('simplified.add_term')}</button>}<button onClick={() => {
                setInteractionMode('explain');
                stopPlayback();
                setIsCompareMode(false);
                setIsFluencyMode(false);
              }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'explain' && !isCompareMode ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_explain')} aria-label={t('simplified.explain_mode')} data-help-key="simplified_explain_mode"><HelpCircle size={12} /> {t('simplified.explain_mode')}</button><button onClick={() => {
                setInteractionMode('cloze');
                stopPlayback();
                setIsCompareMode(false);
                setIsFluencyMode(false);
              }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'cloze' && !isCompareMode ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_cloze')} aria-label={t('simplified.cloze_mode')} data-help-key="simplified_cloze_mode"><PenTool size={12} /> {t('simplified.cloze_mode')}</button><button onClick={handleSetIsSyntaxGameToTrue} className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all bg-orange-100 text-orange-800 hover:bg-orange-200 shadow-sm" title={t('simplified.tip_scramble')} aria-label={t('simplified.scramble_game')} data-help-key="simplified_scramble_game"><Gamepad2 size={12} /> {t('simplified.scramble_game')}</button>{isTeacherMode && <><button onClick={() => {
                  setInteractionMode('revise');
                  stopPlayback();
                  setIsCompareMode(false);
                }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'revise' && !isCompareMode ? 'bg-purple-100 text-purple-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_revise')} aria-label={t('simplified.revise_mode')} data-help-key="simplified_revise_mode"><Pencil size={12} /> {t('simplified.revise_mode')}</button><button data-help-key="simplified_compare_mode" onClick={() => {
                  setIsCompareMode(!isCompareMode);
                  stopPlayback();
                }} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${isCompareMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-700'}`} title={t('simplified.tip_compare')} aria-label={t('simplified.compare_mode')}><GitCompare size={12} /> {t('simplified.compare_mode')}</button></>}</div>{!isZenMode && <div className="flex flex-wrap items-center justify-center gap-2"><button aria-label={t('common.refresh')} data-help-key="simplified_immersive_reader" onClick={() => {
                if (generatedContent.immersiveData) {
                  setIsImmersiveReaderActive(true);
                } else {
                  handleAnalyzePOS();
                }
              }} disabled={isAnalyzingPos || isEditingLeveledText} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" title={t('simplified.tip_immersive_btn')}>{isAnalyzingPos ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}{isAnalyzingPos ? t('simplified.loading_reader') : t('simplified.immersive_reader')}</button><select value={readingTheme} onChange={e => setReadingTheme(e.target.value)} aria-label="Reading theme" className={`px-2 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${readingTheme === 'default' ? 'border-slate-200 bg-white text-slate-600' : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`}><option value="default">🎨 Default (App Theme)</option><option value="warm">☀️ Warm Cream</option><option value="sepia">📜 Sepia</option>{theme !== 'dark' && <option value="dark">🌙 Dark Mode</option>}<option value="highContrast">◼️ High Contrast</option><option value="blue">💧 Blue Wash</option><option value="green">🌿 Green Tint</option><option value="rose">🌸 Rose</option><option value="dyslexia">🔤 Easy Read</option></select>{isTeacherMode && <div className="flex items-center mr-2"><button aria-label={t('common.settings')} data-help-key="simplified_teacher_tools" onClick={handleToggleIsTeacherToolbarExpanded} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isTeacherToolbarExpanded ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:text-indigo-600 hover:border-indigo-200'}`} title={t('simplified.teacher_tools_tooltip')}><Settings size={14} /><span className="hidden sm:inline">{t('simplified.teacher_tools_label')}</span>{isTeacherToolbarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}</button><div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out flex-wrap ${isTeacherToolbarExpanded ? 'max-w-[920px] opacity-100 ml-2' : 'max-w-0 opacity-0'}`}><button onClick={handleDuplicateResource} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap" title={t('simplified.tip_duplicate_btn')} aria-label={t('simplified.tip_duplicate_btn')} data-help-key="simplified_duplicate"><Copy size={14} /> {t('common.duplicate')}</button><button onClick={handleCheckLevel} disabled={isCheckingLevel} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap" title={t('simplified.tip_check_level_btn')} aria-label={t('simplified.tip_check_level_btn')} data-help-key="simplified_check_level">{isCheckingLevel ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}{isCheckingLevel ? t('simplified.checking') : t('simplified.check_level')}</button><button onClick={handleCheckAlignment} disabled={isCheckingAlignment || !standardsInput} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${!standardsInput ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-slate-300'}`} title={!standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn')} aria-label={!standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn')} data-help-key="simplified_rigor_report">{isCheckingAlignment ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}{isCheckingAlignment ? t('simplified.checking') : t('simplified.rigor_report')}</button><button onClick={() => copyToClipboard(generatedContent?.data)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap" title={t('simplified.tip_copy_btn')} aria-label={t('simplified.tip_copy_btn')} data-help-key="simplified_copy_text"><Copy size={14} /> {t('common.copy_text')}</button><button onClick={() => handleDownloadAudio(generatedContent?.data, `leveled-text-${gradeLevel}`, 'dl-simplified-main')} disabled={downloadingContentId === 'dl-simplified-main'} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap" data-help-key="simplified_download_audio">{downloadingContentId === 'dl-simplified-main' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}{downloadingContentId === 'dl-simplified-main' ? t('common.downloading') : t('common.download_audio')}</button></div></div>}{isTeacherMode && <button aria-label={t('common.toggle_edit_text')} onClick={handleToggleIsEditingLeveledText} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingLeveledText ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'}`} data-help-key="simplified_edit">{isEditingLeveledText ? <CheckCircle2 size={14} /> : <Pencil size={14} />}{isEditingLeveledText ? t('common.done_editing') : t('common.edit')}</button>}</div>}</div></div>{definitionData && <div className="fixed z-[100] bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-64 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-75 duration-300 ease-out" style={{
          top: Math.min(window.innerHeight - 300, definitionData.y + 10) + 'px',
          left: Math.min(window.innerWidth - 280, definitionData.x - 20) + 'px'
        }}><div className="flex justify-between items-start mb-2"><h5 className="font-bold text-indigo-900 text-lg capitalize">{definitionData.word}</h5><button onClick={closeDefinition} className="text-slate-600 hover:text-slate-600" aria-label={t('common.close')}><X size={14} /></button></div>{definitionData.text ? <div className="text-sm text-slate-700 leading-relaxed">{renderFormattedText(definitionData.text, false)}</div> : <div className="flex items-center gap-2 text-xs text-indigo-500"><RefreshCw size={12} className="animate-spin" /> {t('glossary.popups.finding')}</div>}{definitionData.text && <div className="mt-3 pt-3 border-t border-slate-100">{definitionData.imageUrl ? <img src={definitionData.imageUrl} alt={definitionData.word} className="w-full h-32 object-contain rounded-lg bg-slate-50 border border-slate-400" /> : definitionData.imageLoading ? <div className="flex items-center justify-center gap-2 text-xs text-indigo-500 h-20 bg-slate-50 rounded-lg border border-slate-400 border-dashed"><RefreshCw size={12} className="animate-spin" /> {t('common.loading') || 'Loading picture...'}</div> : definitionData.imageError ? <div className="text-xs text-slate-500 italic text-center py-2">{t('glossary.popups.image_error') || 'Could not load picture.'}</div> : <button onClick={() => handleFetchWordImage(definitionData.word)} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors" aria-label={t('glossary.popups.show_picture') || 'Show picture for this word'}><ImageIcon size={12} /> {t('glossary.popups.show_picture') || 'Show picture'}</button>}</div>}<div className="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-indigo-200 transform rotate-45" /></div>}{definitionData && <div role="button" tabIndex={0} onKeyDown={e => {
          if (e.key === 'Escape') e.currentTarget.click();
        }} className="fixed inset-0 z-[90]" onClick={closeDefinition} />}{phonicsData && <div role="dialog" aria-modal="true" aria-labelledby="phonics-popup-title" className="fixed z-[100] bg-white allo-popover-solid p-5 rounded-xl shadow-2xl border-2 border-emerald-200 w-72 animate-in zoom-in-95 duration-200" style={{
          top: Math.min(window.innerHeight - 300, phonicsData.y + 10) + 'px',
          left: Math.min(window.innerWidth - 300, phonicsData.x - 20) + 'px'
        }}><div className="flex justify-between items-start mb-3"><h5 id="phonics-popup-title" className="font-black text-emerald-900 text-2xl capitalize tracking-tight">{phonicsData.word}</h5><button onClick={closePhonics} className="text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1" aria-label={t('common.close')}><X size={14} /></button></div>{phonicsData.isLoading ? <div className="flex flex-col items-center justify-center py-6 gap-2 text-emerald-600"><RefreshCw size={24} className="animate-spin" /><span className="text-xs font-bold uppercase tracking-wider">{t('glossary.popups.analyzing')}</span></div> : phonicsData.data ? <div className="space-y-4"><div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100"><div><div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">{t('glossary.phonetic_spelling')}</div><div className="text-lg font-serif italic text-slate-700">/{phonicsData.data.phoneticSpelling}/</div></div><button aria-label={t('common.volume')} onClick={() => {
                if (phonicsData.audioUrl) {
                  const audio = new Audio(phonicsData.audioUrl);
                  audio.playbackRate = voiceSpeed || 1;
                  audio.play().catch(() => {});
                }
              }} className="bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95" title={t('glossary.popups.replay')}><Volume2 size={20} className="fill-current" /></button></div><div className="grid grid-cols-2 gap-2"><div className="bg-slate-50 p-2 rounded border border-slate-100"><div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{t('glossary.popups.ipa')}</div><div className="font-mono text-sm text-slate-600">{phonicsData.data.ipa}</div></div><div className="bg-slate-50 p-2 rounded border border-slate-100"><div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{t('glossary.popups.syllables')}</div><div className="flex flex-wrap items-center gap-0.5">{phonicsData.data.syllables.map((syl, i) => <>{i > 0 && <span className="text-emerald-500 font-bold px-0.5" aria-hidden="true">•</span>}<span className="bg-white px-1.5 rounded border border-slate-400 text-sm font-bold text-slate-700 shadow-sm">{syl}</span></>)}</div></div></div></div> : <div className="text-center text-red-600 text-xs font-bold py-4">{t('glossary.popups.failed')}</div>}<div className="allo-popover-solid absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-emerald-200 transform rotate-45" /></div>}{phonicsData && <div role="button" tabIndex={0} onKeyDown={e => {
          if (e.key === 'Escape') e.currentTarget.click();
        }} className="fixed inset-0 z-[90]" onClick={closePhonics} />}{selectionMenu && <div className="fixed z-[100] flex flex-col gap-1 items-center animate-in fade-in slide-in-from-bottom-2 duration-200" style={{
          top: selectionMenu.y - 50 + 'px',
          left: selectionMenu.x + 'px',
          transform: 'translateX(-50%)'
        }}><div className="bg-slate-900/90 text-white text-[11px] px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-sm max-w-[150px] truncate border border-slate-700">"{selectionMenu.text.length > 20 ? selectionMenu.text.substring(0, 20) + '...' : selectionMenu.text}"</div><div className="bg-slate-800 text-white rounded-full shadow-xl p-1 flex items-center gap-1">{isCustomReviseOpen ? <div className="flex items-center gap-1 px-1 animate-in slide-in-from-right-2 duration-200"><input aria-label={t('common.enter_custom_revise_instruction')} autoFocus={true} type="text" value={customReviseInstruction} onChange={e => setCustomReviseInstruction(e.target.value)} onKeyDown={e => {
                if (e.key === 'Enter') handleReviseSelection('custom', customReviseInstruction);
                if (e.key === 'Escape') setIsCustomReviseOpen(false);
              }} placeholder={t('text_tools.menu_placeholder')} className="text-xs bg-slate-700 border-none rounded-full px-3 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none text-white w-48 placeholder:text-slate-600" /><button aria-label={t('common.continue')} onClick={() => handleReviseSelection('custom', customReviseInstruction)} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors" disabled={!customReviseInstruction.trim()}><ArrowRight size={12} /></button><button aria-label={t('common.close_revision_panel')} onClick={handleSetIsCustomReviseOpenToFalse} className="p-1.5 text-slate-600 hover:text-white rounded-full transition-colors"><X size={12} /></button></div> : <>{interactionMode === 'explain' && <button aria-label={t('common.help')} onClick={() => handleReviseSelection('explain')} className="px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"><HelpCircle size={12} className="text-teal-700" /> {t('text_tools.explain')}</button>}{interactionMode === 'revise' && <><button aria-label={t('common.generate')} onClick={() => handleReviseSelection('simplify')} className="px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"><Sparkles size={12} className="text-yellow-700" /> {t('text_tools.simplify')}</button><div className="w-px h-3 bg-slate-600" /><button onClick={() => handleReviseSelection('custom-input')} className="px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"><PenTool size={12} className="text-indigo-600" /> {t('text_tools.custom')}</button></>}{interactionMode === 'define' && <button aria-label={t('common.search')} onClick={handleDefineSelection} className="px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"><Search size={12} className="text-yellow-700" /> {t('text_tools.define')}</button>}{interactionMode === 'add-glossary' && <button aria-label={t('common.add')} onClick={() => {
                handleQuickAddGlossary(selectionMenu.text, true);
                setSelectionMenu(null);
              }} className="px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"><Plus size={12} className="text-green-700" /> {t('text_tools.add_term')}</button>}</>}</div><div className="w-2 h-2 bg-slate-800 rotate-45" /></div>}{selectionMenu && <div className="fixed inset-0 z-[90] bg-transparent" onMouseDown={e => {
          setSelectionMenu(null);
          setIsCustomReviseOpen(false);
        }} />}{revisionData && <div className="fixed z-[100] bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-72 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200" style={{
          top: Math.min(window.innerHeight - 300, revisionData.y + 20) + 'px',
          left: Math.min(window.innerWidth - 300, Math.max(20, revisionData.x - 140)) + 'px'
        }}><div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100"><h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">{revisionData.type === 'simplify' ? <Sparkles size={14} className="text-yellow-500" /> : revisionData.type === 'custom' ? <PenTool size={14} className="text-indigo-500" /> : <HelpCircle size={14} className="text-teal-500" />}{revisionData.type === 'simplify' ? t('simplified.revision.header_simplify') : revisionData.type === 'custom' ? t('simplified.revision.header_custom') : t('simplified.revision.header_explain')}</h5><button onClick={closeRevision} className="text-slate-600 hover:text-slate-600" aria-label={t('common.close')}><X size={14} /></button></div>{revisionData.result ? <><div className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100 mb-3">{renderFormattedText(revisionData.result, false)}</div>{(revisionData.type === 'simplify' || revisionData.type === 'custom') && <button aria-label={t('common.apply_text_revision')} onClick={applyTextRevision} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"><RefreshCw size={12} /> {t('simplified.revision.replace_btn')}</button>}</> : <div className="flex flex-col items-center justify-center py-4 gap-2 text-slate-600"><RefreshCw size={20} className="animate-spin text-indigo-500" /><span className="text-xs">{t('simplified.revision.working')}</span></div>}</div>}{revisionData && <div role="button" tabIndex={0} onKeyDown={e => {
          if (e.key === 'Escape') e.currentTarget.click();
        }} className="fixed inset-0 z-[90] bg-black/5" onClick={closeRevision} />}{isTeacherMode && !isCompareMode && !isZenMode && generatedContent && ['simplified', 'quiz', 'sentence-frames', 'glossary'].includes(generatedContent.type) && <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm mb-6 mx-1" data-help-key="simplified_complexity_slider"><label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 text-center">{generatedContent.type === 'quiz' ? t('simplified.complexity_controls.adjust_difficulty') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.adjust_scaffolding') : generatedContent.type === 'glossary' ? t('simplified.complexity_controls.adjust_definition') : t('simplified.complexity_controls.adjust_relative')}</label><div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-600 uppercase w-20 text-right">{generatedContent.type === 'quiz' ? t('simplified.complexity_controls.easier') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.more_support') : t('simplified.complexity_controls.simpler')}</span><div className="relative flex-grow h-6 flex items-center"><div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 transform -translate-x-1/2" /><input aria-label={t('common.range_slider')} type="range" min="1" max="9" step="1" value={complexityLevel} onChange={e => setComplexityLevel(parseInt(e.target.value))} onMouseUp={handleComplexityAdjustment} onTouchEnd={handleComplexityAdjustment} disabled={isProcessing} aria-busy={isProcessing} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 z-10 relative" /></div><span className="text-xs font-bold text-slate-600 uppercase w-20">{generatedContent.type === 'quiz' ? t('simplified.complexity_controls.harder') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.less_support') : t('simplified.complexity_controls.complex')}</span></div><div className="px-16"><ComplexityGauge level={complexityLevel} /></div><div className="text-center mt-2 text-xs font-medium h-4">{complexityLevel < 5 && <span className="text-green-600 animate-pulse">{t('status.adjusting')}...</span>}{complexityLevel > 5 && <span className="text-indigo-600 animate-pulse">{t('status.adjusting')}...</span>}{complexityLevel === 5 && <span className="text-slate-600">{t('simplified.complexity_controls.drag_hint')}</span>}</div><div className="flex items-center justify-center mt-4 pt-3 border-t border-slate-100"><label className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full cursor-pointer select-none transition-all border ${saveOriginalOnAdjust ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-1 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`} title={t('common.choose_overwrite_version')} data-help-key="simplified_overwrite_toggle"><input aria-label={t('common.toggle_save_original_on_adjust')} type="checkbox" checked={saveOriginalOnAdjust} onChange={e => setSaveOriginalOnAdjust(e.target.checked)} className="hidden" />{saveOriginalOnAdjust ? <CheckCircle2 size={16} /> : <Copy size={16} />}<span>{saveOriginalOnAdjust ? t('common.keep_original') : t('common.overwrite_version')}</span></label></div></div>}{generatedContent.levelCheck && <div className="mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-lg animate-in slide-in-from-top-2"><div className="flex items-start gap-3"><div className="bg-indigo-100 p-2 rounded-full text-indigo-600 mt-1"><Search size={16} /></div><div className="flex-grow"><h4 className="font-bold text-indigo-900 text-sm flex items-center justify-between">{t('simplified.level_analysis_title')}<span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">{generatedContent.levelCheck.confirmedLevel || generatedContent.levelCheck.estimatedLevel}</span></h4>{generatedContent.levelCheck.rubric ? <div className="mt-3 space-y-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm"><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('simplified.complexity_rubric_title')}</p>{Object.entries(generatedContent.levelCheck.rubric).map(([key, data]) => {
                  const percent = (data.score + 5) / 10 * 100;
                  const isAligned = Math.abs(data.score) <= 1;
                  const colorClass = isAligned ? 'bg-green-500' : data.score < 0 ? 'bg-blue-400' : 'bg-red-400';
                  return <div key={key} className="space-y-1"><div className="flex justify-between text-xs"><span className="font-bold text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span><span className={`font-mono font-bold ${isAligned ? 'text-green-600' : 'text-slate-600'}`}>{data.score > 0 ? '+' : ''}{data.score}</span></div><div className="relative h-2 bg-slate-100 rounded-full overflow-hidden"><div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10" /><div className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${colorClass}`} style={{
                        left: data.score < 0 ? `${percent}%` : '50%',
                        width: `${Math.abs(data.score) * 10}%`
                      }} /></div><p className="text-[11px] text-slate-600 italic">{data.reason}</p></div>;
                })}<div className="flex justify-between text-[11px] text-slate-600 font-bold uppercase tracking-widest mt-1"><span>{t('simplified.gauge_simple')}</span><span>{t('simplified.gauge_aligned')}</span><span>{t('simplified.gauge_complex')}</span></div></div> : <div className="flex items-center flex-wrap gap-2 mt-1 mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t('simplified.level_estimate_label')}:</span><span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded text-sm border border-indigo-100 shadow-sm">{generatedContent.levelCheck.estimatedLevel}</span><span className={`text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.levelCheck.alignment === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>{generatedContent.levelCheck.alignment}</span></div>}<p className="text-sm text-slate-700 leading-relaxed mt-2 p-2 bg-indigo-50/50 rounded italic border border-indigo-100/50">"{generatedContent.levelCheck.nuanceSummary || generatedContent.levelCheck.feedback}"</p></div><button aria-label={t('common.close_fluency_session')} onClick={() => {
              const updated = {
                ...generatedContent
              };
              delete updated.levelCheck;
              setGeneratedContent(updated);
            }} className="text-slate-600 hover:text-slate-600 p-1"><X size={14} /></button></div></div>}{generatedContent.alignmentCheck && <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg animate-in slide-in-from-top-2"><div className="flex items-start gap-3"><div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1"><ShieldCheck size={16} /></div><div className="flex-grow"><h4 className="font-bold text-emerald-900 text-sm">{t('simplified.rigor_check_title')}</h4><div className="flex items-center flex-wrap gap-2 mt-1 mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t('simplified.rigor_status_label')}:</span><span className={`text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.alignmentCheck.status === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{generatedContent.alignmentCheck.status}</span></div><div className="space-y-2 mb-3"><p className="text-sm text-slate-700 leading-relaxed"><span className="font-bold text-emerald-800">{t('simplified.rigor_evidence_label')}:</span> "{generatedContent.alignmentCheck.evidence}"</p><p className="text-sm text-slate-700 leading-relaxed"><span className="font-bold text-emerald-800">{t('simplified.rigor_analysis_label')}:</span> {generatedContent.alignmentCheck.rigorReport}</p>{generatedContent.alignmentCheck.missingElements && generatedContent.alignmentCheck.missingElements !== "None" && <p className="text-sm text-red-700 leading-relaxed bg-red-50 p-2 rounded border border-red-100"><span className="font-bold flex items-center gap-1"><AlertCircle size={12} /> {t('simplified.missing_label')}:</span> {generatedContent.alignmentCheck.missingElements}</p>}</div>{generatedContent.alignmentCheck.improvement && <div className="bg-white p-3 rounded border border-emerald-200 mt-2 shadow-sm"><p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles size={12} /> {t('simplified.suggestion_label')}</p><p className="text-sm text-slate-600 italic mb-2">"{generatedContent.alignmentCheck.improvement}"</p><button aria-label={t('common.regenerate_with_rigor')} onClick={handleRegenerateWithRigor} disabled={isProcessing} aria-busy={isProcessing} className="text-xs font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"><RefreshCw size={12} className={isProcessing ? "animate-spin" : ""} /> {t('simplified.apply_regenerate')}</button></div>}</div><button aria-label={t('common.close_fluency_results')} onClick={() => {
              const updated = {
                ...generatedContent
              };
              delete updated.alignmentCheck;
              setGeneratedContent(updated);
            }} className="text-slate-600 hover:text-slate-600 p-1"><X size={14} /></button></div></div>}{isCompareMode ? <div className="w-full h-full min-h-[500px] animate-in fade-in duration-300"><div className="bg-slate-50 border-b border-slate-200 p-4 mb-4 flex justify-between items-center rounded-t-lg"><span className="text-sm font-bold text-slate-700 flex items-center gap-2"><GitCompare size={16} className="text-indigo-600" /> {t('simplified.diff_view')}</span><div className="flex gap-4 text-xs font-medium"><span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded" /> {t('simplified.diff_removed')}</span><span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded" /> {t('simplified.diff_added')}</span></div></div>{(() => {
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
            return <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-8"><div className="bg-white p-6 rounded-lg border border-slate-400 shadow-sm overflow-y-auto max-h-[70vh] custom-scrollbar"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 border-b pb-2 sticky top-0 bg-white z-10">{t('simplified.diff_original')}</h4><div className="text-sm text-slate-700 leading-relaxed font-serif whitespace-pre-wrap">{diff.map((part, i) => {
                    if (part.type === 'add') return null;
                    if (part.type === 'del') {
                      return <span key={i} className="bg-red-100 text-red-800 line-through decoration-red-400 decoration-2 px-0.5 rounded mx-0.5">{part.value}</span>;
                    }
                    return <span key={i} className="opacity-70">{part.value} </span>;
                  })}</div></div><div className="bg-white p-6 rounded-lg border border-slate-400 shadow-sm overflow-y-auto max-h-[70vh] custom-scrollbar"><h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-4 border-b pb-2 sticky top-0 bg-white z-10">{t('simplified.diff_adapted')}</h4><div className="text-sm text-slate-800 leading-relaxed font-medium font-serif whitespace-pre-wrap">{diff.map((part, i) => {
                    if (part.type === 'del') return null;
                    if (part.type === 'add') {
                      return <span key={i} className="bg-green-100 text-green-900 font-bold border-b-2 border-green-300 px-0.5 rounded mx-0.5">{part.value}</span>;
                    }
                    return <span key={i}>{part.value} </span>;
                  })}</div></div></div>;
          })()}</div> : isEditingLeveledText ? <div className="w-full bg-white border border-orange-200 rounded-lg overflow-hidden shadow-sm"><div className="flex items-center gap-1 p-2 bg-orange-50 border-b border-orange-100"><button onClick={() => handleFormatText('bold')} className="p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors" title={t('formatting.bold')}><Bold size={16} strokeWidth={3} /></button><button onClick={() => handleFormatText('italic')} className="p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors" title={t('formatting.italic')}><Italic size={16} /></button><button onClick={() => handleFormatText('highlight')} className="p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors" title={t('formatting.highlight')}><Highlighter size={16} /></button><div className="w-px h-4 bg-orange-200 mx-1" /><button onClick={() => handleFormatText('h1')} className="p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs" title={t('formatting.h1')}>H1</button><button onClick={() => handleFormatText('h2')} className="p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs" title={t('formatting.h2')}>H2</button><div className="w-px h-4 bg-orange-200 mx-1" /><button onClick={() => handleFormatText('list')} className="p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors" title={t('formatting.list')}><List size={16} /></button></div><textarea aria-label={t('simplified.revision.placeholder_edit_text') || 'Edit simplified text'} ref={textEditorRef} value={generatedContent?.data} onChange={e => handleSimplifiedTextChange(e.target.value)} className="w-full min-h-[500px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-lg text-slate-800 font-medium leading-relaxed resize-none font-sans" spellCheck="false" placeholder={t('simplified.revision.placeholder_edit_text')} /></div> : isSideBySide && getSideBySideContent(generatedContent?.data) ? <div className={`w-full min-h-[500px] font-sans ${cursorStyles[interactionMode]}`}>{(() => {
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
                return <div className={`cursor-text selection:text-teal-900 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'}`} onMouseUp={handleTextMouseUp}>{cleanText}</div>;
              } else if (interactionMode === 'add-glossary') {
                const textBlock = sentences.join(' ').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
                const parts = highlightGlossaryTerms(textBlock, latestGlossary, false);
                const partsArray = Array.isArray(parts) ? parts : [parts];
                return partsArray.map((part, ptIdx) => {
                  if (React.isValidElement(part)) {
                    return <span key={ptIdx} className="bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-200 inline-flex items-baseline"><span className="text-[11px] mr-1 text-indigo-600 font-bold">✓</span>{part}</span>;
                  }
                  if (typeof part !== 'string') return null;
                  return part.split(/(\s+)/).map((subPart, spIdx) => {
                    if (subPart.match(/^\s+$/)) return <span key={`${ptIdx}-${spIdx}`}>{subPart}</span>;
                    const cleanWord = subPart.replace(/\*\*|\*/g, '');
                    return <span key={`${ptIdx}-${spIdx}`} onClick={e => {
                      e.stopPropagation();
                      handleQuickAddGlossary(cleanWord, true);
                    }} onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickAddGlossary(cleanWord, true);
                      }
                    }} tabIndex={0} role="button" className="cursor-copy hover:bg-green-200 text-slate-800 hover:text-green-900 rounded px-0.5 transition-colors inline-block border-b border-transparent hover:border-green-400 select-none" title={t('common.click_add_glossary')}>{cleanWord}</span>;
                  });
                });
              } else if (interactionMode === 'phonics' || interactionMode === 'define') {
                const textBlock = sentences.join(' ').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
                return textBlock.split(/(\s+)/).map((part, i) => {
                  if (part.match(/^\s+$/)) return <span key={i}>{part}</span>;
                  const cleanWord = part.replace(/\*\*|\*/g, '');
                  const handleClick = e => {
                    if (interactionMode === 'phonics') handlePhonicsClick(cleanWord, e);
                    if (interactionMode === 'define') handleWordClick(cleanWord, e);
                  };
                  return <span key={i} onClick={handleClick} onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick(e);
                    }
                  }} tabIndex="0" role="button" aria-label={interactionMode === 'phonics' ? `Hear phonics for ${cleanWord}` : `Define ${cleanWord}`} className={`cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 inline-block border-b border-transparent hover:border-emerald-200 focus:bg-yellow-200 focus:outline-none`} title={interactionMode === 'phonics' ? t('text_tools.click_to_phonics') : t('text_tools.click_to_define')}>{cleanWord}</span>;
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
                  return <span key={sIdx} id={`sentence-${globalIdx}`} onClick={e => {
                    if (interactionMode === 'cloze') return;
                    e.stopPropagation();
                    handleSpeak(generatedContent?.data, 'simplified-main', globalIdx);
                  }} onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'cloze') {
                      e.preventDefault();
                      handleSpeak(generatedContent?.data, 'simplified-main', globalIdx);
                    }
                  }} tabIndex={interactionMode !== 'cloze' ? "0" : "-1"} role={interactionMode !== 'cloze' ? "button" : "text"} aria-label={`Read sentence: ${cleanText}`} className={`transition-colors duration-300 rounded px-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100 focus:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200' : ''} ${isActive ? 'bg-yellow-200 text-black shadow-sm' : ''} ${headerClass}`} title={interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""}>{formatInteractiveText(cleanText, interactionMode === 'cloze')} </span>;
                });
              }
            };
            return <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="hidden md:block font-bold text-orange-800 text-sm uppercase tracking-wider border-b-2 border-orange-200 pb-2 mb-2">{leveledTextLanguage}</div><div className="hidden md:block font-bold text-orange-800 text-sm uppercase tracking-wider border-b-2 border-orange-200 pb-2 mb-2">{t('common.english_translation')}</div>{rows.map((_, i) => {
                const sourceParaSentences = source[i] ? splitTextToSentences(source[i]) : [];
                const targetParaSentences = target[i] ? splitTextToSentences(target[i]) : [];
                const rowSourceStartIdx = currentSourceSentenceIdx;
                const rowTargetStartIdx = currentTargetSentenceIdx;
                const rowSourceEndIdx = rowSourceStartIdx + sourceParaSentences.length;
                const rowTargetEndIdx = rowTargetStartIdx + targetParaSentences.length;
                currentSourceSentenceIdx += sourceParaSentences.length;
                currentTargetSentenceIdx += targetParaSentences.length;
                return <><div className={`bg-white/60 rounded-lg p-4 border border-orange-100 hover:border-orange-300 transition-colors ${isRtlLang(generatedContent?.config?.language || leveledTextLanguage) ? 'text-right' : 'text-left'}`} dir={isRtlLang(generatedContent?.config?.language || leveledTextLanguage) ? 'rtl' : 'ltr'}><div className="md:hidden font-bold text-orange-800 text-xs uppercase tracking-wider mb-2">{leveledTextLanguage}</div><div className="text-lg text-slate-800 font-medium leading-relaxed">{renderTextContent(sourceParaSentences, rowSourceStartIdx, false)}</div></div><div className="bg-indigo-50/60 rounded-lg p-4 border border-indigo-100 hover:border-indigo-300 transition-colors relative text-left" dir="ltr"><div className="md:hidden font-bold text-indigo-800 text-xs uppercase tracking-wider mb-2 mt-2 md:mt-0">{t('common.english')}</div><div className="text-base text-slate-700 leading-relaxed">{renderTextContent(targetParaSentences, rowTargetStartIdx, false)}</div></div></>;
              })}</div>;
          })()}{isProcessing && <div className="mt-6 flex items-center justify-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider animate-pulse opacity-80"><RefreshCw size={12} className="animate-spin" /> Generating more...</div>}</div> : <div className={`w-full min-h-[500px] text-lg font-medium leading-relaxed font-sans prose prose-p:my-2 max-w-none ${cursorStyles[interactionMode]} transition-all duration-500 ease-in-out ${isLineFocusMode ? 'bg-slate-950 text-slate-600 p-8 rounded-2xl shadow-inner prose-invert' : 'text-slate-800 prose-headings:text-orange-900 prose-strong:text-orange-900'} ${getContentDirection(generatedContent?.config?.language || leveledTextLanguage) === 'rtl' ? 'text-right' : 'text-left'}`} dir={getContentDirection(generatedContent?.config?.language || leveledTextLanguage)}>{generatedContent?.data ? <div className="space-y-4">{(() => {
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
                      return <div key={`${keyPrefix}-table-${pIdx}`} className="mb-6 overflow-x-auto">{renderFormattedText(para, false)}</div>;
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
                      return <p key={pIdx} className={`mb-4 leading-relaxed cursor-text selection:text-teal-900 transition-all duration-500 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'} ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 rounded-xl shadow-lg text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`} onMouseUp={handleTextMouseUp} onMouseEnter={() => setFocusedParagraphIndex(pIdx)} onMouseLeave={() => setFocusedParagraphIndex(null)}>{cleanText}</p>;
                    }
                    if (sentencesInPara.length === 0) return null;
                    return <p key={pIdx} className={`mb-4 leading-relaxed transition-all duration-500 ease-in-out rounded-xl ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 shadow-2xl text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`} onMouseEnter={() => setFocusedParagraphIndex(pIdx)} onMouseLeave={() => setFocusedParagraphIndex(null)}>{interactionMode === 'add-glossary' ? (() => {
                        const cleanPara = para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
                        const parts = highlightGlossaryTerms(cleanPara, latestGlossary, false);
                        const partsArray = Array.isArray(parts) ? parts : [parts];
                        return partsArray.map((part, ptIdx) => {
                          if (React.isValidElement(part)) {
                            return <span key={ptIdx} className="bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-200 inline-flex items-baseline"><span className="text-[11px] mr-1 text-indigo-600 font-bold">✓</span>{part}</span>;
                          }
                          if (typeof part !== 'string') return null;
                          return part.split(/(\s+)/).map((subPart, spIdx) => {
                            if (subPart.match(/^\s+$/)) return <span key={`${ptIdx}-${spIdx}`}>{subPart}</span>;
                            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(subPart);
                            const isHeader = subPart.startsWith('#') || isHtmlHeader;
                            let displayPart = isHeader ? isHtmlHeader ? subPart.replace(/<\/?h[1-6][^>]*>/gi, '') : subPart.replace(/^#+\s*/, '') : subPart;
                            displayPart = displayPart.replace(/\*\*|\*/g, '');
                            return <span key={`${ptIdx}-${spIdx}`} onClick={e => {
                              e.stopPropagation();
                              handleQuickAddGlossary(displayPart, true);
                            }} className={`rounded px-0.5 transition-colors duration-200 ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''} cursor-copy hover:bg-green-200 border-b border-transparent hover:border-green-400 select-none`} title={t('common.click_add_glossary')}>{displayPart}</span>;
                          });
                        });
                      })() : interactionMode === 'define' ? para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
                        if (part.match(/^\s+$/)) return <span key={i}>{part}</span>;
                        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(part);
                        const isHeader = part.startsWith('#') || isHtmlHeader;
                        let displayPart = isHeader ? isHtmlHeader ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
                        displayPart = displayPart.replace(/\*\*|\*/g, '');
                        const handleClick = e => handleWordClick(displayPart, e);
                        return <span key={i} onClick={handleClick} onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleClick(e);
                          }
                        }} tabIndex={0} role="button" className={`cursor-help hover:bg-yellow-200 rounded px-0.5 transition-colors duration-200 focus:bg-yellow-200 focus:outline-none ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''}`}>{displayPart}</span>;
                      }) : interactionMode === 'phonics' ? para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
                        if (part.match(/^\s+$/)) return <span key={i}>{part}</span>;
                        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(part);
                        const isHeader = part.startsWith('#') || isHtmlHeader;
                        let displayPart = isHeader ? isHtmlHeader ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
                        displayPart = displayPart.replace(/\*\*|\*/g, '');
                        const handleClick = e => handlePhonicsClick(displayPart, e);
                        return <span key={i} onClick={handleClick} onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleClick(e);
                          }
                        }} tabIndex={0} role="button" className={`cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-emerald-200 inline-block focus:bg-yellow-200 focus:outline-none ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''}`} title={t('common.click_hear_phonics')}>{displayPart}</span>;
                      }) : sentencesInPara.map((sentence, sIdx) => {
                        const currentGlobalIdx = startIdx + sIdx;
                        const isActive = currentGlobalIdx === playbackState.currentIdx;
                        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(sentence.trim());
                        const isHeader = sentence.trim().startsWith('#') || isHtmlHeader;
                        const headerLevel = isHeader ? isHtmlHeader ? parseInt((sentence.trim().match(/^<h([1-6])/) || [0, 2])[1]) : (sentence.trim().match(/^#+/) || [''])[0].length : 0;
                        const cleanText = isHeader ? isHtmlHeader ? sentence.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : sentence.trim().replace(/^#+\s*/, '') : sentence;
                        const headerClass = isHeader ? headerLevel === 1 ? `text-2xl font-bold ${isEnglish ? isLineFocusMode ? 'text-indigo-300' : 'text-indigo-900' : isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-6 border-b ${isEnglish ? 'border-indigo-200' : 'border-orange-200'} pb-1` : headerLevel === 2 ? `text-xl font-bold ${isEnglish ? isLineFocusMode ? 'text-indigo-300' : 'text-indigo-900' : isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-4` : `text-lg font-bold ${isEnglish ? isLineFocusMode ? 'text-indigo-300' : 'text-indigo-900' : isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-1 mt-3` : "";
                        return <span key={sIdx} id={`sentence-${currentGlobalIdx}`} onClick={e => {
                          if (interactionMode === 'cloze') return;
                          e.stopPropagation();
                          handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
                        }} className={`transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100/20' : ''} ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : isLineFocusMode ? 'text-slate-100' : 'text-slate-800'} ${headerClass}`} title={interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""}>{formatInteractiveText(cleanText, interactionMode === 'cloze')} </span>;
                      })}</p>;
                  });
                  return <>{renderParagraphs(source, 'src')}<div className={`my-8 flex items-center gap-4 text-indigo-600 font-bold text-sm tracking-wider uppercase select-none transition-opacity duration-300 ${isLineFocusMode && focusedParagraphIndex !== null ? 'opacity-20' : 'opacity-100'}`}><div className="h-px bg-indigo-200 flex-grow" />{t('common.english_translation')}<div className="h-px bg-indigo-200 flex-grow" /></div><div dir="ltr" className="text-left">{renderParagraphs(target, 'tgt', true)}</div></>;
                } else {
                  const paragraphs = safeData.split(/\n{2,}/);
                  let sentenceCounter = 0;
                  return paragraphs.map((para, pIdx) => {
                    if (para.trim().startsWith('|') || para.includes('\n|')) {
                      return <div key={`mono-table-${pIdx}`} className="mb-6 overflow-x-auto">{renderFormattedText(para, false)}</div>;
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
                      return <p key={pIdx} className={`mb-4 leading-relaxed cursor-text selection:text-teal-900 transition-all duration-500 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'} ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 rounded-xl shadow-lg text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`} onMouseUp={handleTextMouseUp} onMouseEnter={() => setFocusedParagraphIndex(pIdx)} onMouseLeave={() => setFocusedParagraphIndex(null)}>{cleanText}</p>;
                    }
                    if (sentencesInPara.length === 0) return null;
                    return <p key={pIdx} className={`mb-4 leading-relaxed transition-all duration-500 ease-in-out rounded-xl ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 shadow-2xl text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`} onMouseEnter={() => setFocusedParagraphIndex(pIdx)} onMouseLeave={() => setFocusedParagraphIndex(null)}>{interactionMode === 'cloze' ? sentencesInPara.map((sentence, sIdx) => {
                        const currentGlobalIdx = startIdx + sIdx;
                        const cleanText = sentence.trim().replace(/^#+\s*/, '');
                        return <span key={sIdx}>{formatInteractiveText(cleanText, true)} </span>;
                      }) : interactionMode === 'phonics' || interactionMode === 'define' ? para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
                        if (part.match(/^\s+$/)) return <span key={i}>{part}</span>;
                        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(part);
                        const isHeader = part.startsWith('#') || isHtmlHeader;
                        let displayPart = isHeader ? isHtmlHeader ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
                        displayPart = displayPart.replace(/\*\*|\*/g, '');
                        const handleClick = e => {
                          if (interactionMode === 'phonics') handlePhonicsClick(displayPart, e);
                          if (interactionMode === 'define') handleWordClick(displayPart, e);
                        };
                        return <span key={i} onClick={handleClick} onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleClick(e);
                          }
                        }} tabIndex="0" role="button" aria-label={interactionMode === 'phonics' ? `Hear phonics for ${displayPart}` : `Define ${displayPart}`} className={`cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-emerald-200 inline-block focus:bg-yellow-200 focus:outline-none ${isHeader ? 'font-bold text-orange-900' : ''}`} title={interactionMode === 'phonics' ? t('text_tools.click_to_phonics') : t('text_tools.click_to_define')}>{displayPart}</span>;
                      }) : sentencesInPara.map((sentence, sIdx) => {
                        const currentGlobalIdx = startIdx + sIdx;
                        const isActive = currentGlobalIdx === playbackState.currentIdx;
                        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(sentence.trim());
                        const isHeader = sentence.trim().startsWith('#') || isHtmlHeader;
                        const headerLevel = isHeader ? isHtmlHeader ? parseInt((sentence.trim().match(/^<h([1-6])/) || [0, 2])[1]) : (sentence.trim().match(/^#+/) || [''])[0].length : 0;
                        const cleanText = isHeader ? isHtmlHeader ? sentence.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : sentence.trim().replace(/^#+\s*/, '') : sentence;
                        const headerClass = isHeader ? headerLevel === 1 ? `text-2xl font-bold ${isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-6 border-b border-orange-200 pb-1` : headerLevel === 2 ? `text-xl font-bold ${isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-2 mt-4` : `text-lg font-bold ${isLineFocusMode ? 'text-orange-300' : 'text-orange-900'} block mb-1 mt-3` : "";
                        return <span key={sIdx} id={`sentence-${currentGlobalIdx}`} onClick={e => {
                          if (interactionMode === 'cloze') return;
                          e.stopPropagation();
                          handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
                        }} onKeyDown={e => {
                          if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'cloze') {
                            e.preventDefault();
                            handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
                          }
                        }} tabIndex={interactionMode !== 'cloze' ? "0" : "-1"} role={interactionMode !== 'cloze' ? "button" : "text"} aria-label={`Read sentence: ${cleanText}`} className={`transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100/20' : ''} ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : isLineFocusMode ? 'text-slate-100' : 'text-slate-800'} ${headerClass}`} title={interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""}>{formatInteractiveText(cleanText, interactionMode === 'cloze')} </span>;
                      })}</p>;
                  });
                }
              })();
              return <>{_bodyEl}{_hasBilingual && _englishBlock && (() => {
                  const _isTable = p => p.trim().startsWith('|') || p.includes('\n|');
                  const _srcParas = safeData.split(/\n{2,}/).filter(p => p.trim());
                  const _srcSentCount = _srcParas.flatMap(p => _isTable(p) ? [] : splitTextToSentences(p)).length;
                  const _engParas = _englishBlock.split(/\n{2,}/).filter(p => p.trim());
                  let _engSentCounter = _srcSentCount;
                  return <div className="mt-6 pl-4 border-l-4 border-indigo-300 bg-slate-50 p-4 rounded-r-xl"><div className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-2 border-b border-indigo-100 pb-1 inline-block">English Translation</div><div className="text-slate-700 leading-relaxed">{_engParas.map((para, pIdx) => {
                        if (_isTable(para)) {
                          return <div key={`eng-table-${pIdx}`} className="mb-6 overflow-x-auto">{renderFormattedText(para, false)}</div>;
                        }
                        const sentencesInPara = splitTextToSentences(para);
                        if (sentencesInPara.length === 0) return null;
                        const startIdx = _engSentCounter;
                        _engSentCounter += sentencesInPara.length;
                        if (interactionMode === 'explain' || interactionMode === 'revise') {
                          const cleanText = para.replace(/\*\*|\*/g, '');
                          return <p key={`eng-p-${pIdx}`} className={`mb-4 leading-relaxed cursor-text selection:text-teal-900 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'}`} onMouseUp={handleTextMouseUp}>{cleanText}</p>;
                        }
                        if (interactionMode === 'add-glossary') {
                          const cleanPara = para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '');
                          const parts = highlightGlossaryTerms(cleanPara, latestGlossary, false);
                          const partsArray = Array.isArray(parts) ? parts : [parts];
                          return <p key={`eng-p-${pIdx}`} className="mb-4 leading-relaxed">{partsArray.map((part, ptIdx) => {
                              if (React.isValidElement(part)) {
                                return <span key={ptIdx} className="bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-200 inline-flex items-baseline"><span className="text-[11px] mr-1 text-indigo-600 font-bold">✓</span>{part}</span>;
                              }
                              if (typeof part !== 'string') return null;
                              return part.split(/(\s+)/).map((subPart, spIdx) => {
                                if (subPart.match(/^\s+$/)) return <span key={`${ptIdx}-${spIdx}`}>{subPart}</span>;
                                const isHtmlHeader2 = /^<h([1-6])[^>]*>/i.test(subPart);
                                const isHeader2 = subPart.startsWith('#') || isHtmlHeader2;
                                let displayPart2 = isHeader2 ? isHtmlHeader2 ? subPart.replace(/<\/?h[1-6][^>]*>/gi, '') : subPart.replace(/^#+\s*/, '') : subPart;
                                displayPart2 = displayPart2.replace(/\*\*|\*/g, '');
                                return <span key={`${ptIdx}-${spIdx}`} onClick={e => {
                                  e.stopPropagation();
                                  handleQuickAddGlossary(displayPart2, true);
                                }} className={`rounded px-0.5 transition-colors duration-200 ${isHeader2 ? 'font-bold text-indigo-900' : ''} cursor-copy hover:bg-green-200 border-b border-transparent hover:border-green-400 select-none`} title={t('common.click_add_glossary')}>{displayPart2}</span>;
                              });
                            })}</p>;
                        }
                        if (interactionMode === 'phonics' || interactionMode === 'define') {
                          return <p key={`eng-p-${pIdx}`} className="mb-4 leading-relaxed">{para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split(/(\s+)/).map((part, i) => {
                              if (part.match(/^\s+$/)) return <span key={i}>{part}</span>;
                              const isHtmlHeader3 = /^<h([1-6])[^>]*>/i.test(part);
                              const isHeader3 = part.startsWith('#') || isHtmlHeader3;
                              let displayPart3 = isHeader3 ? isHtmlHeader3 ? part.replace(/<\/?h[1-6][^>]*>/gi, '') : part.replace(/^#+\s*/, '') : part;
                              displayPart3 = displayPart3.replace(/\*\*|\*/g, '');
                              const handleClick = e => {
                                if (interactionMode === 'phonics') handlePhonicsClick(displayPart3, e);
                                if (interactionMode === 'define') handleWordClick(displayPart3, e);
                              };
                              return <span key={i} onClick={handleClick} onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleClick(e);
                                }
                              }} tabIndex="0" role="button" aria-label={interactionMode === 'phonics' ? `Hear phonics for ${displayPart3}` : `Define ${displayPart3}`} className={`cursor-help hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-indigo-200 inline-block focus:bg-yellow-200 focus:outline-none ${isHeader3 ? 'font-bold text-indigo-900' : ''}`} title={interactionMode === 'phonics' ? t('text_tools.click_to_phonics') : t('text_tools.click_to_define')}>{displayPart3}</span>;
                            })}</p>;
                        }
                        return <p key={`eng-p-${pIdx}`} className="mb-4 leading-relaxed">{sentencesInPara.map((sentence, sIdx) => {
                            const currentGlobalIdx = startIdx + sIdx;
                            const isActive = currentGlobalIdx === playbackState.currentIdx;
                            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(sentence.trim());
                            const isHeader = sentence.trim().startsWith('#') || isHtmlHeader;
                            const headerLevel = isHeader ? isHtmlHeader ? parseInt((sentence.trim().match(/^<h([1-6])/) || [0, 2])[1]) : (sentence.trim().match(/^#+/) || [''])[0].length : 0;
                            const cleanText = isHeader ? isHtmlHeader ? sentence.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : sentence.trim().replace(/^#+\s*/, '') : sentence;
                            const headerClass = isHeader ? headerLevel === 1 ? 'text-2xl font-bold text-indigo-900 block mb-2 mt-6 border-b border-indigo-200 pb-1' : headerLevel === 2 ? 'text-xl font-bold text-indigo-900 block mb-2 mt-4' : 'text-lg font-bold text-indigo-900 block mb-1 mt-3' : "";
                            return <span key={sIdx} id={`sentence-${currentGlobalIdx}`} onClick={e => {
                              if (interactionMode === 'cloze') return;
                              e.stopPropagation();
                              handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
                            }} onKeyDown={e => {
                              if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'cloze') {
                                e.preventDefault();
                                handleSpeak(generatedContent?.data, 'simplified-main', currentGlobalIdx);
                              }
                            }} tabIndex={interactionMode !== 'cloze' ? "0" : "-1"} role={interactionMode !== 'cloze' ? "button" : "text"} aria-label={`Read sentence: ${cleanText}`} className={`transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone ${interactionMode !== 'cloze' ? 'cursor-pointer hover:bg-indigo-100/20' : ''} ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'text-slate-700'} ${headerClass}`} title={interactionMode !== 'cloze' ? t('common.click_read_from_here') : ""}>{formatInteractiveText(cleanText, interactionMode === 'cloze')} </span>;
                          })}</p>;
                      })}</div></div>;
                })()}<SourceReferencesPanel referencesText={_references} /></>;
            })()}</div> : null}{isProcessing && <div className="mt-4 flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider animate-pulse opacity-80"><RefreshCw size={12} className="animate-spin" /> Generating more...</div>}</div>}</div></div>;
  }
