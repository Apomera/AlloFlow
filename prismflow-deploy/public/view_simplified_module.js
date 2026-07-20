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
  st.textContent = '@keyframes allo-chunk-popin { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }' + '@keyframes allo-chunk-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }' + '@media (prefers-reduced-motion: reduce) {' + '  [data-sentence-idx] { animation: none !important; }' + '}';
  if (document.head) document.head.appendChild(st);
})();
// Authoritative dictionary panel (Wiktionary via dictionaryapi.dev, offline-cached)
// rendered beside the AI's leveled definition in the Define popup — triangulation.
// Pure fn of (entry, t); returns null when there's no entry (AI-only fallback).
function renderDictionaryPanel(dict, t) {
  if (!dict) return null;
  var kids = [];
  var sourceUrl = dict.sourceUrl || (dict.word ? 'https://en.wiktionary.org/wiki/' + encodeURIComponent(dict.word) : '');
  kids.push(React.createElement('div', {
    key: 'hd',
    className: 'flex items-center gap-2 mb-1 flex-wrap'
  }, React.createElement('span', {
    className: 'text-[10px] font-bold uppercase tracking-wide text-emerald-700'
  }, t('glossary.popups.dictionary') || 'Dictionary'), dict.phonetic ? React.createElement('span', {
    className: 'text-[11px] text-slate-500'
  }, dict.phonetic) : null, dict.audio ? React.createElement('button', {
    type: 'button',
    onClick: function () {
      try {
        new Audio(dict.audio).play().catch(function () {});
      } catch (_e) {}
    },
    className: 'inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5 transition-colors',
    'aria-label': t('glossary.popups.hear_real') || 'Hear a real recording',
    title: t('glossary.popups.hear_real') || 'Hear a real recording'
  }, React.createElement(Volume2, {
    size: 11
  }), React.createElement('span', null, t('glossary.popups.real_audio') || 'Recording')) : null));
  (dict.meanings || []).slice(0, 2).forEach(function (m, mi) {
    var d0 = m.definitions && m.definitions[0] ? m.definitions[0].definition : '';
    if (!d0) return;
    var d0ex = m.definitions[0].example || '';
    kids.push(React.createElement('div', {
      key: 'm' + mi,
      className: 'text-xs text-slate-700 leading-snug mb-1'
    }, m.partOfSpeech ? React.createElement('span', {
      className: 'italic text-slate-500 mr-1'
    }, m.partOfSpeech) : null, d0, d0ex ? React.createElement('span', {
      className: 'block text-[11px] text-slate-500 italic mt-0.5'
    }, '"' + d0ex + '"') : null));
  });
  if (dict.synonyms && dict.synonyms.length) {
    kids.push(React.createElement('div', {
      key: 'syn',
      className: 'text-[11px] text-slate-500 mt-0.5'
    }, (t('glossary.popups.similar') || 'Similar') + ': ' + dict.synonyms.slice(0, 5).join(', ')));
  }
  kids.push(React.createElement('div', {
    key: 'src',
    className: 'text-[10px] text-slate-400 mt-1'
  }, sourceUrl ? React.createElement('a', {
    href: sourceUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    className: 'text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2',
    'aria-label': 'Open dictionary source for ' + (dict.word || 'this word')
  }, 'Source: ' + (dict.source || 'Wiktionary')) : 'Source: ' + (dict.source || 'Dictionary')));
  return React.createElement('div', {
    className: 'mt-3 pt-3 border-t border-emerald-100'
  }, kids);
}

// Lead with the accessible explanation students asked for, while clearly
// distinguishing it from the sourced dictionary entry that follows.
function renderReadingLevelExplanation(definitionData, t, renderFormattedText) {
  if (!definitionData || !definitionData.text) return null;
  return React.createElement('div', {
    className: 'rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2.5',
    'aria-label': t('glossary.popups.reading_level_explanation') || 'Reading-level explanation'
  }, React.createElement('div', {
    className: 'flex items-center gap-2 mb-1.5 flex-wrap'
  }, React.createElement('span', {
    className: 'text-[10px] font-bold uppercase tracking-wide text-indigo-700'
  }, t('glossary.popups.reading_level_explanation') || 'Reading-level explanation'), React.createElement('span', {
    className: 'text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-full px-1.5 py-0.5'
  }, t('glossary.popups.ai_generated') || 'AI-generated')), React.createElement('div', {
    className: 'text-sm text-slate-700 leading-relaxed'
  }, renderFormattedText(definitionData.text, false)));
}

// Authoritative pronunciation row for the phonics popup: real Wiktionary recording
// + authoritative IPA, shown quietly beside the AI phonics. Pure fn; null when absent.
function renderPhonicsDictRow(phonicsData, t) {
  var d = phonicsData && phonicsData.dictionary;
  if (!d || !d.phonetic && !d.audio) return null;
  var row = [React.createElement('span', {
    key: 'lbl',
    className: 'text-[10px] font-bold text-emerald-700 uppercase tracking-wide'
  }, t('glossary.popups.dictionary') || 'Dictionary')];
  if (d.phonetic) row.push(React.createElement('span', {
    key: 'ipa',
    className: 'font-mono text-xs text-slate-600'
  }, d.phonetic));
  if (d.audio) row.push(React.createElement('button', {
    key: 'aud',
    type: 'button',
    onClick: function () {
      try {
        new Audio(d.audio).play().catch(function () {});
      } catch (_e) {}
    },
    className: 'inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 transition-colors',
    'aria-label': t('glossary.popups.hear_real') || 'Hear a real recording',
    title: t('glossary.popups.hear_real') || 'Hear a real recording'
  }, React.createElement(Volume2, {
    size: 11
  }), React.createElement('span', null, t('glossary.popups.real_audio') || 'Recording')));
  return React.createElement('div', {
    className: 'flex items-center gap-2 flex-wrap px-1'
  }, row);
}
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
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
var ListOrdered = _lazyIcon('ListOrdered');
var Trophy = _lazyIcon('Trophy');
var ImageIcon = _lazyIcon('ImageIcon');
var Sparkles = _lazyIcon('Sparkles');
var AlertCircle = _lazyIcon('AlertCircle');
var ArrowRight = _lazyIcon('ArrowRight');
var Play = _lazyIcon('Play');
var Pause = _lazyIcon('Pause');
var StopCircle = _lazyIcon('StopCircle');
var Trash2 = _lazyIcon('Trash2');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronUp = _lazyIcon('ChevronUp');
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
  var selectedVoice = props.selectedVoice;
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
  // The immersive reader is a z-[200] full-screen overlay. Word-level popups
  // (Define / Phonics / selection / revise) default to z-[100]/z-[90], so when
  // immersive is open they render BEHIND it — the definition appears to land in
  // the standard view. Lift them above the overlay while immersive is active
  // (backdrop just under the popup, still above the overlay).
  const _popupZ = isImmersiveReaderActive ? 'z-[220]' : 'z-[100]';
  const _popupBackdropZ = isImmersiveReaderActive ? 'z-[210]' : 'z-[90]';
  var ttsPrepState_state = React.useState({
    busy: false,
    done: 0,
    total: 0
  });
  var ttsPrepState = ttsPrepState_state[0];
  var setTtsPrepState = ttsPrepState_state[1];
  var saveTtsAsPlayed_state = React.useState(function () {
    // Default ON (2026-07-09): capture-as-you-play costs no extra synthesis;
    // '0' is the explicit per-device opt-out via the checkbox below.
    try {
      return localStorage.getItem('allo_save_karaoke_audio') !== '0';
    } catch (_) {
      return true;
    }
  });
  var saveTtsAsPlayed = saveTtsAsPlayed_state[0];
  var setSaveTtsAsPlayed = saveTtsAsPlayed_state[1];
  // "Copy diagnostics" for the IN-VIEW read-aloud (playSequence path): the
  // karaoke overlay has its own button, but leveled-text playback happens
  // right here — surface the shared window.__alloTtsTrace ring where the
  // teacher is actually looking when audio gets stuck.
  var ttsDiagCopied_state = React.useState(false);
  var ttsDiagCopied = ttsDiagCopied_state[0];
  var setTtsDiagCopied = ttsDiagCopied_state[1];
  var _fallbackCopyTtsDiag = function (text) {
    try {
      var scratch = document.createElement('textarea');
      scratch.value = text;
      scratch.setAttribute('readonly', '');
      scratch.style.position = 'fixed';
      scratch.style.opacity = '0';
      document.body.appendChild(scratch);
      scratch.select();
      var ok = document.execCommand('copy');
      scratch.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };
  var copyTtsDiagnostics = function () {
    var payload;
    try {
      payload = JSON.stringify({
        at: new Date().toISOString(),
        surface: 'leveled-text',
        userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '').substring(0, 120) : '',
        flags: {
          geminiQuotaFailed: !!window.__ttsGeminiQuotaFailed,
          geminiAuthFailed: !!window.__ttsGeminiAuthFailed,
          kokoroPresent: !!window._kokoroTTS,
          kokoroReady: !!(window._kokoroTTS && window._kokoroTTS.ready),
          sharedResolver: typeof window.__alloResolveReadAloudAudio === 'function'
        },
        lastRoute: window.__ttsLastRoute || null,
        trace: (window.__alloTtsTrace || []).slice(-120)
      }, null, 2);
    } catch (e) {
      payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e);
    }
    var done = function (ok) {
      if (!ok) return;
      setTtsDiagCopied(true);
      setTimeout(function () {
        setTtsDiagCopied(false);
      }, 2000);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(function () {
          done(true);
        }, function () {
          done(_fallbackCopyTtsDiag(payload));
        });
        return;
      }
    } catch (e) {}
    done(_fallbackCopyTtsDiag(payload));
  };
  var savingAudioKeys_state = React.useState({});
  var savingAudioKeys = savingAudioKeys_state[0];
  var setSavingAudioKeys = savingAudioKeys_state[1];
  var captureAudioErrors_state = React.useState({});
  var captureAudioErrors = captureAudioErrors_state[0];
  var setCaptureAudioErrors = captureAudioErrors_state[1];
  var regenAudioKey_state = React.useState(null);
  var regenAudioKey = regenAudioKey_state[0];
  var setRegenAudioKey = regenAudioKey_state[1];
  var setAudioStatusTick = React.useState(0)[1];
  var editAudioOpen_state = React.useState(false);
  var editAudioOpen = editAudioOpen_state[0];
  var setEditAudioOpen = editAudioOpen_state[1];
  var editAudioPlayingKey_state = React.useState(null);
  var editAudioPlayingKey = editAudioPlayingKey_state[0];
  var setEditAudioPlayingKey = editAudioPlayingKey_state[1];
  var editAudioLoadingKey_state = React.useState(null);
  var editAudioLoadingKey = editAudioLoadingKey_state[0];
  var setEditAudioLoadingKey = editAudioLoadingKey_state[1];
  var editAudioMicRequestKey_state = React.useState(null);
  var editAudioMicRequestKey = editAudioMicRequestKey_state[0];
  var setEditAudioMicRequestKey = editAudioMicRequestKey_state[1];
  var editAudioRecordingKey_state = React.useState(null);
  var editAudioRecordingKey = editAudioRecordingKey_state[0];
  var setEditAudioRecordingKey = editAudioRecordingKey_state[1];
  var editAudioRecordingSaveKey_state = React.useState(null);
  var editAudioRecordingSaveKey = editAudioRecordingSaveKey_state[0];
  var setEditAudioRecordingSaveKey = editAudioRecordingSaveKey_state[1];
  var removeAudioKey_state = React.useState(null);
  var removeAudioKey = removeAudioKey_state[0];
  var setRemoveAudioKey = removeAudioKey_state[1];
  var editAudioNotice_state = React.useState('');
  var editAudioNotice = editAudioNotice_state[0];
  var setEditAudioNotice = editAudioNotice_state[1];
  var editAudioPlayerRef = React.useRef(null);
  var editAudioPlayTokenRef = React.useRef(0);
  var editAudioRecordTokenRef = React.useRef(0);
  var editAudioMediaRecorderRef = React.useRef(null);
  var editAudioMediaStreamRef = React.useRef(null);
  var editAudioChunksRef = React.useRef([]);
  var immersiveDialogRef = React.useRef(null);
  var phonicsDialogRef = React.useRef(null);
  var phonicsCloseRef = React.useRef(null);
  var definitionDialogRef = React.useRef(null);
  var definitionCloseRef = React.useRef(null);
  var revisionDialogRef = React.useRef(null);
  var revisionCloseRef = React.useRef(null);
  var stopEditAudioPlayback = function () {
    editAudioPlayTokenRef.current += 1;
    try {
      if (editAudioPlayerRef.current) {
        editAudioPlayerRef.current.onended = null;
        editAudioPlayerRef.current.onerror = null;
        editAudioPlayerRef.current.pause();
      }
    } catch (_) {}
    editAudioPlayerRef.current = null;
    setEditAudioPlayingKey(null);
    setEditAudioLoadingKey(null);
  };
  var getReadAloudAudioKey = function (sentence) {
    try {
      var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
      if (KS && typeof KS.keyFor === 'function') return KS.keyFor(sentence);
    } catch (_) {}
    return String(sentence || '').toLowerCase().replace(/\s+/g, ' ').trim();
  };
  var setSaveTtsAsPlayedEnabled = function (value) {
    var next = !!value;
    setSaveTtsAsPlayed(next);
    try {
      localStorage.setItem('allo_save_karaoke_audio', next ? '1' : '0');
    } catch (_) {}
  };
  React.useEffect(function () {
    if (typeof window === 'undefined') return;
    var onAudioUpdate = function () {
      setAudioStatusTick(function (n) {
        return n + 1;
      });
    };
    var onAudioCapture = function (event) {
      var detail = event && event.detail ? event.detail : {};
      if (generatedContent && generatedContent.id && detail.resourceId && detail.resourceId !== generatedContent.id) return;
      var key = getReadAloudAudioKey(detail.sentence);
      if (!key) return;
      if (detail.status === 'saving') {
        setSavingAudioKeys(function (prev) {
          return Object.assign({}, prev, {
            [key]: true
          });
        });
        setCaptureAudioErrors(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
      } else {
        setSavingAudioKeys(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
        setCaptureAudioErrors(function (prev) {
          var next = Object.assign({}, prev);
          if (detail.status === 'error' || detail.status === 'limit') {
            next[key] = {
              status: detail.status,
              code: detail.code || 'capture-failed',
              reason: detail.reason || 'Played TTS could not be saved.'
            };
          } else {
            delete next[key];
          }
          return next;
        });
        if (detail.status === 'error' || detail.status === 'limit') {
          setEditAudioNotice(detail.reason || 'Played TTS could not be saved. Generate that sentence again to retry.');
        }
        setAudioStatusTick(function (n) {
          return n + 1;
        });
      }
    };
    window.addEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
    window.addEventListener('alloflow:karaoke-audio-capture', onAudioCapture);
    return function () {
      window.removeEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
      window.removeEventListener('alloflow:karaoke-audio-capture', onAudioCapture);
    };
  }, [generatedContent && generatedContent.id]);
  React.useEffect(function () {
    setSavingAudioKeys({});
    setCaptureAudioErrors({});
  }, [generatedContent && generatedContent.id]);
  React.useEffect(function () {
    if (isEditingLeveledText) return;
    setEditAudioOpen(false);
    stopEditAudioPlayback();
    editAudioRecordTokenRef.current += 1;
    var recorder = editAudioMediaRecorderRef.current;
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    } catch (_) {}
  }, [isEditingLeveledText]);
  React.useEffect(function () {
    setEditAudioOpen(false);
    stopEditAudioPlayback();
    setEditAudioMicRequestKey(null);
    setEditAudioRecordingKey(null);
    setEditAudioRecordingSaveKey(null);
    setRemoveAudioKey(null);
    setEditAudioNotice('');
    return function () {
      editAudioPlayTokenRef.current += 1;
      editAudioRecordTokenRef.current += 1;
      try {
        if (editAudioPlayerRef.current) {
          editAudioPlayerRef.current.onended = null;
          editAudioPlayerRef.current.onerror = null;
          editAudioPlayerRef.current.pause();
        }
      } catch (_) {}
      editAudioPlayerRef.current = null;
      var recorder = editAudioMediaRecorderRef.current;
      try {
        if (recorder && recorder.state !== 'inactive') {
          recorder.onstop = null;
          recorder.stop();
        }
      } catch (_) {}
      editAudioMediaRecorderRef.current = null;
      var stream = editAudioMediaStreamRef.current;
      try {
        if (stream) stream.getTracks().forEach(function (track) {
          track.stop();
        });
      } catch (_) {}
      editAudioMediaStreamRef.current = null;
      editAudioChunksRef.current = [];
    };
  }, [generatedContent && generatedContent.id]);
  var cleanSentenceForAudio = function (sentence) {
    // Must mirror playSequence's textToSpeak cleaning (phase_k) — the store
    // key is derived from the cleaned sentence on BOTH sides, so a rule
    // present in one place but not the other orphans that sentence's audio.
    // Delegate to THE shared sanitizer when the phase_k module is loaded
    // (2026-07-17) so the two can never drift; the inline chain below is
    // the standalone fallback and must stay rule-identical to it.
    try {
      var _pk = window.AlloModules && window.AlloModules.PhaseKHelpers;
      if (_pk && typeof _pk.toSpokenText === 'function') return _pk.toSpokenText(sentence);
    } catch (_) {}
    return String(sentence || '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, '').replace(/\[Source\s+\d+\]/gi, '').replace(/\[\d+\]/g, '').replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/__|_/g, '').replace(/~~/g, '').replace(/`/g, '').replace(/^>\s?/gm, '').replace(/^[-*+]\s/gm, '').replace(/^\d+\.\s/gm, '').replace(/\s+/g, ' ').trim();
  };
  var getReadAloudStore = function () {
    try {
      return window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
    } catch (_) {
      return null;
    }
  };
  // The host can refresh callTTS while modules finish loading. Keep the
  // resolver identity tied only to the actual voice profile so capture-status
  // renders do not repeatedly invalidate karaoke's warm cache.
  var karaokeCallTTSRef = React.useRef(callTTS);
  karaokeCallTTSRef.current = callTTS;
  var getKaraokeAudioUrl = React.useCallback(function (sentenceText, requestOptions) {
    var voice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    var speed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var language = leveledTextLanguage || 'English';
    var options = Object.assign({
      language: language,
      maxRetries: 1,
      priority: 'interactive'
    }, requestOptions || {});
    options.language = language;
    // Snapshot the synthesis profile with the request. The shared service uses
    // it for compatibility and provider resolution, so a settings change
    // mid-request cannot relabel the voice the learner actually heard.
    options.profile = Object.assign({}, options.profile || {}, {
      voice: voice,
      speed: speed,
      synthesisRate: speed,
      language: language,
      voiceResolverVersion: 2
    });
    try {
      var sharedResolver = typeof window !== 'undefined' && window.__alloResolveReadAloudAudio;
      if (typeof sharedResolver === 'function') {
        return Promise.resolve(sharedResolver(sentenceText, options)).catch(function () {
          return null;
        });
      }
    } catch (_) {}
    // Direct store/callTTS compatibility path while the shared host module loads.
    try {
      var st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
      if (st) {
        // Stored-clip compatibility guard (2026-07-17): this resolver used
        // to return st.get() blind, bypassing the voice guard the main
        // playSequence path applies — so an older Puck AI clip kept playing
        // after the teacher selected Kore. The store's shared getCompatible
        // enforces voice/speed/language for AI takes; human recordings
        // remain voice-independent and always play.
        if (typeof st.getCompatible === 'function') {
          var compatibleUrl = st.getCompatible(sentenceText, {
            voice: voice,
            speed: speed,
            language: language
          });
          if (compatibleUrl) return Promise.resolve(compatibleUrl);
        } else {
          var storedUrl = st.get(sentenceText);
          if (storedUrl) return Promise.resolve(storedUrl);
        }
      }
    } catch (_) {}
    var resolver = karaokeCallTTSRef.current;
    if (typeof resolver !== 'function') return Promise.resolve(null);
    return Promise.resolve(resolver(sentenceText, voice, speed, options, language)).catch(function () {
      return null;
    });
  }, [selectedVoice, voiceSpeed, leveledTextLanguage]);
  var getReadAloudAudioProvenance = function (sentence) {
    var inspection = null;
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') inspection = sharedInspect(sentence, 'reference');
    } catch (_) {}
    var st = getReadAloudStore();
    var source = inspection && inspection.source != null ? inspection.source : null;
    var metadata = inspection && inspection.metadata ? inspection.metadata : null;
    if (!inspection) {
      try {
        if (st && typeof st.sourceOf === 'function') source = st.sourceOf(sentence);
        if (st && typeof st.metadataOf === 'function') metadata = st.metadataOf(sentence);
      } catch (_) {}
    }
    if (source === 'human-teacher') return {
      source: source,
      label: 'Teacher recording',
      metadata: metadata,
      stale: false
    };
    if (source === 'human-student') return {
      source: source,
      label: 'Student recording',
      metadata: metadata,
      stale: false
    };
    if (source && String(source).indexOf('human') === 0) return {
      source: source,
      label: 'Human recording',
      metadata: metadata,
      stale: false
    };
    var currentVoice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    var currentSpeed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var currentLanguage = leveledTextLanguage || 'English';
    var stale = inspection ? inspection.status === 'stale' : !metadata || Number(metadata.voiceResolverVersion) !== 2 || !!(metadata.voice && String(metadata.voice).toLowerCase() !== String(currentVoice).toLowerCase() || metadata.speed && Math.abs(Number(metadata.speed) - currentSpeed) > 0.001 || metadata.language && String(metadata.language).toLowerCase() !== String(currentLanguage).toLowerCase());
    var details = ['AI voice'];
    if (metadata && metadata.voice) details.push(metadata.voice);
    if (metadata && metadata.speed) details.push(Number(metadata.speed) + '×');
    if (metadata && metadata.language) details.push(metadata.language);
    return {
      source: source || 'ai',
      label: details.join(' · '),
      metadata: metadata,
      stale: stale
    };
  };
  var hasStoredReadAloudAudio = function (sentence) {
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') {
        var inspection = sharedInspect(sentence, 'reference');
        if (inspection && inspection.status) return inspection.status === 'ready' || inspection.status === 'stale';
      }
    } catch (_) {}
    var st = getReadAloudStore();
    try {
      return !!(st && st.has(sentence));
    } catch (_) {
      return false;
    }
  };
  var getReadAloudAudioSummary = function (sentences) {
    var list = Array.isArray(sentences) ? sentences : [];
    var sharedSummary = null;
    try {
      var summaryResolver = typeof window !== 'undefined' && window.__alloGetReadAloudAudioSummary;
      if (typeof summaryResolver === 'function') sharedSummary = summaryResolver(list, 'reference');
    } catch (_) {}
    var saved = sharedSummary ? Number(sharedSummary.ready || 0) + Number(sharedSummary.stale || 0) : list.reduce(function (n, sentence) {
      return n + (hasStoredReadAloudAudio(sentence) ? 1 : 0);
    }, 0);
    var bytes = sharedSummary ? Number(sharedSummary.estimatedBytes || 0) : 0;
    var maxBytes = 0;
    try {
      var st = getReadAloudStore();
      if (!sharedSummary && st && typeof st.estimateBytes === 'function') bytes = st.estimateBytes();
      if (st && typeof st.limits === 'function') maxBytes = st.limits().maxBytes || 0;
    } catch (_) {}
    return {
      saved: saved,
      total: list.length,
      bytes: bytes,
      maxBytes: maxBytes
    };
  };
  var getReadAloudSentencesForText = function (rawText) {
    var text = typeof rawText === 'string' ? rawText : String(rawText || '');
    var isTableText = function (p) {
      return p.trim().startsWith('|') || p.indexOf('\n|') !== -1;
    };
    var splitForReadAloud = function (part) {
      try {
        var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
        if (KS && typeof KS.splitSentences === 'function') return KS.splitSentences(part);
      } catch (_) {}
      return splitTextToSentences(part);
    };
    var parts = getSideBySideContent(text);
    var list = parts ? parts.source.concat(parts.target).flatMap(function (p) {
      return isTableText(p) ? [] : splitForReadAloud(p);
    }) : text.split(/\n{2,}/).flatMap(function (p) {
      return isTableText(p) ? [] : splitForReadAloud(p);
    });
    return list.map(cleanSentenceForAudio).filter(function (s) {
      return s && s.trim().length > 0;
    });
  };
  var karaokeReaderSentences = React.useMemo(function () {
    return getReadAloudSentencesForText(generatedContent && generatedContent.data);
  }, [generatedContent && generatedContent.data]);
  var handlePrepareReadAloudAudio = async function () {
    if (ttsPrepState.busy || typeof window.__alloPrepareReadAloud !== 'function') return;
    var sentences = getReadAloudSentencesForText(generatedContent && generatedContent.data);
    if (!sentences.length) return;
    // Note: prep saves every sentence regardless of the capture toggle, and
    // capture now defaults ON — no longer force-enable it here, so a
    // teacher's explicit opt-out survives pressing Save TTS.
    setTtsPrepState({
      busy: true,
      done: 0,
      total: sentences.length
    });
    try {
      var result = await window.__alloPrepareReadAloud(sentences, function (done, total) {
        setTtsPrepState({
          busy: true,
          done: done,
          total: total || sentences.length
        });
      });
      if (result && result.remaining) {
        setEditAudioNotice(result.failure && result.failure.reason || result.remaining + ' sentence audio clips remain. Run Save TTS again to retry only missing clips.');
      } else if (result && result.ok) {
        setEditAudioNotice('Read-aloud audio is ready for all sentences.');
      }
    } finally {
      setTtsPrepState({
        busy: false,
        done: 0,
        total: 0
      });
    }
  };
  var handleRegenerateReadAloudSentence = async function (sentence, key, sentenceNumber) {
    if (!sentence || regenAudioKey) return;
    if (typeof window.__alloRegenerateSentenceAudio !== 'function') {
      setEditAudioNotice('Sentence audio tools are still loading. Please try again.');
      return;
    }
    var wasSaved = hasStoredReadAloudAudio(sentence);
    if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
    setRegenAudioKey(key);
    setEditAudioNotice((wasSaved ? 'Regenerating' : 'Generating') + ' sentence ' + sentenceNumber + ' audio...');
    try {
      var url = await window.__alloRegenerateSentenceAudio(sentence);
      if (!url) throw new Error('No audio was returned');
      setAudioStatusTick(function (n) {
        return n + 1;
      });
      setEditAudioNotice((wasSaved ? 'Regenerated' : 'Generated') + ' audio for sentence ' + sentenceNumber + '.');
    } catch (_) {
      setEditAudioNotice('Could not generate audio for sentence ' + sentenceNumber + '. Please try again.');
    } finally {
      setRegenAudioKey(null);
    }
  };
  var handlePlayEditAudioSentence = async function (sentence, key, sentenceNumber) {
    if (!sentence || editAudioLoadingKey) return;
    var current = editAudioPlayerRef.current;
    if (current && current._alloSentenceKey === key) {
      if (!current.paused) {
        try {
          current.pause();
        } catch (_) {}
        setEditAudioPlayingKey(null);
        setEditAudioNotice('Paused sentence ' + sentenceNumber + '.');
        return;
      }
      try {
        if (isFinite(current.duration) && current.currentTime >= current.duration) current.currentTime = 0;
        await current.play();
        setEditAudioPlayingKey(key);
        setEditAudioNotice('Playing sentence ' + sentenceNumber + '.');
      } catch (_) {
        setEditAudioNotice('Audio playback was blocked. Press Play again.');
      }
      return;
    }
    if (!hasStoredReadAloudAudio(sentence)) {
      setEditAudioNotice('Generate or record audio for sentence ' + sentenceNumber + ' before playing it.');
      return;
    }
    stopEditAudioPlayback();
    var token = ++editAudioPlayTokenRef.current;
    setEditAudioLoadingKey(key);
    setEditAudioNotice('Loading sentence ' + sentenceNumber + ' audio...');
    try {
      var url = await getKaraokeAudioUrl(sentence);
      if (token !== editAudioPlayTokenRef.current) return;
      if (!url) throw new Error('No saved audio URL');
      var audio = new Audio(url);
      audio._alloSentenceKey = key;
      audio.preload = 'auto';
      // Preview the stored artifact exactly as students receive it.
      audio.playbackRate = 1;
      audio.onended = function () {
        if (editAudioPlayerRef.current === audio) {
          setEditAudioPlayingKey(null);
          setEditAudioNotice('Finished sentence ' + sentenceNumber + '.');
        }
      };
      audio.onerror = function () {
        if (editAudioPlayerRef.current === audio) {
          setEditAudioPlayingKey(null);
          setEditAudioNotice('Could not play sentence ' + sentenceNumber + ' audio.');
        }
      };
      editAudioPlayerRef.current = audio;
      await audio.play();
      if (token !== editAudioPlayTokenRef.current) {
        try {
          audio.pause();
        } catch (_) {}
        return;
      }
      setEditAudioPlayingKey(key);
      setEditAudioNotice('Playing sentence ' + sentenceNumber + '.');
    } catch (_) {
      if (token === editAudioPlayTokenRef.current) {
        editAudioPlayerRef.current = null;
        setEditAudioPlayingKey(null);
        setEditAudioNotice('Could not play sentence ' + sentenceNumber + ' audio.');
      }
    } finally {
      if (token === editAudioPlayTokenRef.current) setEditAudioLoadingKey(null);
    }
  };
  var releaseEditAudioStream = function () {
    var stream = editAudioMediaStreamRef.current;
    try {
      if (stream) stream.getTracks().forEach(function (track) {
        track.stop();
      });
    } catch (_) {}
    editAudioMediaStreamRef.current = null;
  };
  var handleRecordEditAudioSentence = async function (sentence, key, sentenceNumber) {
    var activeRecorder = editAudioMediaRecorderRef.current;
    if (activeRecorder && activeRecorder._alloSentenceKey === key && activeRecorder.state !== 'inactive') {
      try {
        activeRecorder.stop();
        setEditAudioNotice('Finishing the recording for sentence ' + sentenceNumber + '...');
      } catch (_) {}
      return;
    }
    if (!sentence || editAudioRecordingKey || editAudioMicRequestKey || editAudioRecordingSaveKey) return;
    if (typeof window.__alloStoreRecordedSentenceAudio !== 'function') {
      setEditAudioNotice('Recorded-audio storage is still loading. Please try again.');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof window.MediaRecorder === 'undefined') {
      setEditAudioNotice('Microphone recording is not supported in this browser.');
      return;
    }
    stopEditAudioPlayback();
    var requestToken = ++editAudioRecordTokenRef.current;
    setEditAudioMicRequestKey(key);
    setEditAudioNotice('Opening the microphone for sentence ' + sentenceNumber + '...');
    var stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      if (requestToken !== editAudioRecordTokenRef.current) {
        try {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
        } catch (_) {}
        return;
      }
      editAudioMediaStreamRef.current = stream;
      var MediaRecorderCtor = window.MediaRecorder;
      var preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      var mimeType = '';
      if (typeof MediaRecorderCtor.isTypeSupported === 'function') {
        for (var typeIdx = 0; typeIdx < preferredTypes.length; typeIdx++) {
          if (MediaRecorderCtor.isTypeSupported(preferredTypes[typeIdx])) {
            mimeType = preferredTypes[typeIdx];
            break;
          }
        }
      }
      var recorder = mimeType ? new MediaRecorderCtor(stream, {
        mimeType: mimeType
      }) : new MediaRecorderCtor(stream);
      recorder._alloSentenceKey = key;
      editAudioChunksRef.current = [];
      recorder.ondataavailable = function (event) {
        if (event && event.data && event.data.size > 0) editAudioChunksRef.current.push(event.data);
      };
      recorder.onerror = function () {
        setEditAudioNotice('The microphone stopped unexpectedly. Please record sentence ' + sentenceNumber + ' again.');
      };
      recorder.onstop = async function () {
        var chunks = editAudioChunksRef.current.slice();
        editAudioChunksRef.current = [];
        if (editAudioMediaRecorderRef.current === recorder) editAudioMediaRecorderRef.current = null;
        releaseEditAudioStream();
        setEditAudioRecordingKey(null);
        if (!chunks.length) {
          setEditAudioNotice('No audio was captured for sentence ' + sentenceNumber + '.');
          return;
        }
        var recordedBlob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || 'audio/webm'
        });
        setEditAudioRecordingSaveKey(key);
        setEditAudioNotice('Saving the teacher recording for sentence ' + sentenceNumber + ' as MP3...');
        try {
          var saved = await window.__alloStoreRecordedSentenceAudio(sentence, recordedBlob, 'human-teacher');
          if (saved === false) throw new Error('Recording was not saved');
          setAudioStatusTick(function (n) {
            return n + 1;
          });
          setEditAudioNotice('Teacher recording saved for sentence ' + sentenceNumber + '.');
        } catch (_) {
          setEditAudioNotice('Could not save the recording for sentence ' + sentenceNumber + '. Please try again.');
        } finally {
          setEditAudioRecordingSaveKey(null);
        }
      };
      editAudioMediaRecorderRef.current = recorder;
      recorder.start(250);
      setEditAudioMicRequestKey(null);
      setEditAudioRecordingKey(key);
      setEditAudioNotice('Recording sentence ' + sentenceNumber + '. Press Stop when finished.');
    } catch (_) {
      if (stream) {
        try {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
        } catch (_err) {}
      }
      if (requestToken === editAudioRecordTokenRef.current) {
        setEditAudioMicRequestKey(null);
        setEditAudioRecordingKey(null);
        setEditAudioNotice('Microphone access was not available. Check permission and try again.');
      }
    }
  };
  var handleRemoveReadAloudSentence = async function (sentence, key, sentenceNumber) {
    if (!sentence || removeAudioKey) return;
    if (typeof window.__alloRemoveSentenceAudio !== 'function') {
      setEditAudioNotice('Sentence audio removal is still loading. Please try again.');
      return;
    }
    if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
    setRemoveAudioKey(key);
    setEditAudioNotice('Removing saved audio for sentence ' + sentenceNumber + '...');
    try {
      var removed = await window.__alloRemoveSentenceAudio(sentence);
      if (removed === false) throw new Error('Audio was not removed');
      setAudioStatusTick(function (n) {
        return n + 1;
      });
      setEditAudioNotice('Saved audio removed from sentence ' + sentenceNumber + '.');
    } catch (_) {
      setEditAudioNotice('Could not remove the audio for sentence ' + sentenceNumber + '.');
    } finally {
      setRemoveAudioKey(null);
    }
  };
  var handleToggleEditAudioPanel = function () {
    var next = !editAudioOpen;
    if (!next) {
      stopEditAudioPlayback();
      editAudioRecordTokenRef.current += 1;
      setEditAudioMicRequestKey(null);
      var recorder = editAudioMediaRecorderRef.current;
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch (_) {}
    }
    setEditAudioOpen(next);
  };
  function containSimplifiedModalFocus(e, container, onEscape) {
    if (!e || !container) return;
    var nearestDialog = e.target && typeof e.target.closest === 'function' ? e.target.closest('[role="dialog"]') : null;
    if (nearestDialog && nearestDialog !== container) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onEscape === 'function') onEscape(e);
      return;
    }
    if (e.key !== 'Tab' || typeof container.querySelectorAll !== 'function') return;
    var focusable = Array.prototype.slice.call(container.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(function (el) {
      return el && !el.hidden && el.getAttribute('aria-hidden') !== 'true';
    });
    if (!focusable.length) {
      e.preventDefault();
      container.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  React.useEffect(function () {
    if (!isImmersiveReaderActive || !generatedContent?.immersiveData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      var closeButton = immersiveDialogRef.current && immersiveDialogRef.current.querySelector('button[aria-label]');
      if (closeButton) closeButton.focus();else if (immersiveDialogRef.current) immersiveDialogRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [isImmersiveReaderActive]);
  React.useEffect(function () {
    if (!phonicsData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (phonicsCloseRef.current) phonicsCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [!!phonicsData]);
  React.useEffect(function () {
    if (!definitionData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (definitionCloseRef.current) definitionCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [!!definitionData]);
  React.useEffect(function () {
    if (!revisionData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (revisionCloseRef.current) revisionCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [!!revisionData]);
  var renderEditAudioSentenceTools = function () {
    if (!isTeacherMode || !isEditingLeveledText) return null;
    var sentences = getReadAloudSentencesForText(generatedContent && generatedContent.data);
    if (!sentences.length) return null;
    var summary = getReadAloudAudioSummary(sentences);
    var savingCount = Object.keys(savingAudioKeys || {}).length;
    var captureErrorCount = Object.keys(captureAudioErrors || {}).length;
    var panelId = 'allo-edit-audio-' + String(generatedContent && generatedContent.id || 'current').replace(/[^a-z0-9_-]/gi, '-');
    var anyRecordingWork = !!editAudioMicRequestKey || !!editAudioRecordingKey || !!editAudioRecordingSaveKey;
    return /*#__PURE__*/React.createElement("div", {
      className: "border-t border-orange-100 bg-orange-50/80"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleToggleEditAudioPanel,
      "aria-expanded": editAudioOpen,
      "aria-controls": panelId,
      "aria-label": `Edit audio. ${summary.saved} of ${summary.total} sentences saved.`,
      className: "inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-white text-orange-800 border border-orange-200 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 14
    }), /*#__PURE__*/React.createElement("span", null, "Edit audio"), /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 normal-case"
    }, summary.saved, "/", summary.total, " saved", summary.maxBytes ? ` · ${Math.round(summary.bytes / 104857.6) / 10}/${Math.round(summary.maxBytes / 104857.6) / 10} MB` : ''), editAudioOpen ? /*#__PURE__*/React.createElement(ChevronUp, {
      size: 14
    }) : /*#__PURE__*/React.createElement(ChevronDown, {
      size: 14
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center sm:justify-end gap-2 flex-wrap"
    }, savingCount > 0 && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-1"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin motion-reduce:animate-none"
    }), " Saving ", savingCount), captureErrorCount > 0 && /*#__PURE__*/React.createElement("span", {
      role: "alert",
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-1"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 10
    }), " ", captureErrorCount, " save ", captureErrorCount === 1 ? 'issue' : 'issues'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: copyTtsDiagnostics,
      "aria-label": "Copy read-aloud diagnostics to clipboard",
      title: "Copies a technical trace of recent read-aloud attempts — paste it into a bug report if audio gets stuck.",
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-2 py-1 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    }, ttsDiagCopied ? '✓ Copied' : '🩺 Diagnostics'), /*#__PURE__*/React.createElement("label", {
      className: "inline-flex items-center gap-1.5 text-[11px] text-slate-700 font-semibold cursor-pointer"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: saveTtsAsPlayed,
      onChange: function (event) {
        setSaveTtsAsPlayedEnabled(event.target.checked);
      },
      className: "accent-orange-600",
      "aria-label": "Save played TTS into this resource"
    }), /*#__PURE__*/React.createElement("span", null, "Save played TTS")))), editAudioOpen && /*#__PURE__*/React.createElement("div", {
      id: panelId,
      role: "region",
      "aria-label": "Sentence audio editor",
      className: "border-t border-orange-100 bg-white p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-2 mb-3 text-xs text-slate-600"
    }, /*#__PURE__*/React.createElement(Mic, {
      size: 14,
      className: "mt-0.5 shrink-0 text-orange-700"
    }), /*#__PURE__*/React.createElement("p", null, "Preview saved audio, generate a new AI voice, or record your own teacher narration for each sentence. Recordings replace that sentence only.")), editAudioNotice && /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "polite",
      className: "mb-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800"
    }, editAudioNotice), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 max-h-[34rem] overflow-y-auto pr-1 custom-scrollbar"
    }, sentences.map(function (sentence, i) {
      var key = 'simplified-' + i;
      var sentenceNumber = i + 1;
      var audioKey = getReadAloudAudioKey(sentence);
      var isSaving = !!savingAudioKeys[audioKey];
      var isSaved = hasStoredReadAloudAudio(sentence);
      var provenance = isSaved ? getReadAloudAudioProvenance(sentence) : {
        source: null,
        label: 'No saved source',
        stale: false
      };
      var captureIssue = captureAudioErrors[audioKey];
      var needsRebuild = !!(isSaved && provenance.stale);
      var isGenerating = regenAudioKey === key;
      var isLoading = editAudioLoadingKey === key;
      var isPlayingSentence = editAudioPlayingKey === key;
      var isMicRequest = editAudioMicRequestKey === key;
      var isRecording = editAudioRecordingKey === key;
      var isRecordingSave = editAudioRecordingSaveKey === key;
      var isRemoving = removeAudioKey === key;
      var statusLabel = isMicRequest ? 'Opening microphone' : isRecording ? 'Recording' : isRecordingSave ? 'Saving recording' : isGenerating ? isSaved ? 'Regenerating' : 'Generating' : isRemoving ? 'Removing' : isSaving ? 'Caching played TTS' : captureIssue ? captureIssue.status === 'limit' ? 'Storage limit' : 'Save failed' : needsRebuild ? 'Ready · settings changed' : isSaved ? 'Ready' : 'Missing audio';
      var statusClass = isRecording ? 'bg-red-50 text-red-700 border-red-200' : isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : captureIssue ? captureIssue.status === 'limit' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200' : needsRebuild ? 'bg-amber-50 text-amber-800 border-amber-200' : isSaved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200';
      var controlsBlocked = isSaving || isGenerating || isRemoving || ttsPrepState.busy;
      var recordDisabled = !isRecording && (anyRecordingWork || !!regenAudioKey || !!removeAudioKey || isSaving || ttsPrepState.busy);
      var actionClass = 'inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed';
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "rounded-xl border border-slate-200 bg-slate-50/70 p-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-800",
        "aria-hidden": "true"
      }, sentenceNumber), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-1"
      }, /*#__PURE__*/React.createElement("p", {
        dir: "auto",
        className: "text-sm font-medium leading-relaxed text-slate-800"
      }, sentence), /*#__PURE__*/React.createElement("div", {
        className: "mt-1.5 flex items-center gap-1.5 flex-wrap",
        "aria-label": `Sentence ${sentenceNumber} audio status: ${statusLabel}. Source: ${provenance.label}.`
      }, /*#__PURE__*/React.createElement("span", {
        className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`
      }, isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 9,
        className: "animate-spin motion-reduce:animate-none"
      }) : isRecording ? /*#__PURE__*/React.createElement("span", {
        className: "h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none"
      }) : captureIssue || needsRebuild ? /*#__PURE__*/React.createElement(AlertCircle, {
        size: 9
      }) : isSaved ? /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 9
      }) : /*#__PURE__*/React.createElement(AlertCircle, {
        size: 9
      }), statusLabel), /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] font-semibold text-slate-500"
      }, provenance.label)))), /*#__PURE__*/React.createElement("div", {
        role: "group",
        "aria-label": `Audio actions for sentence ${sentenceNumber}`,
        className: "mt-2.5 flex items-center gap-1.5 flex-wrap"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handlePlayEditAudioSentence(sentence, key, sentenceNumber);
        },
        disabled: !isSaved || isLoading || controlsBlocked || anyRecordingWork || !!editAudioLoadingKey && !isLoading,
        "aria-pressed": isPlayingSentence,
        "aria-label": `${isPlayingSentence ? 'Pause' : 'Play'} audio for sentence ${sentenceNumber}`,
        title: !isSaved ? 'Generate or record audio first' : isPlayingSentence ? 'Pause sentence audio' : 'Play sentence audio',
        className: `${actionClass} bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50`
      }, isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : isPlayingSentence ? /*#__PURE__*/React.createElement(Pause, {
        size: 12
      }) : /*#__PURE__*/React.createElement(Play, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isLoading ? 'Loading' : isPlayingSentence ? 'Pause' : 'Play')), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRegenerateReadAloudSentence(sentence, key, sentenceNumber);
        },
        disabled: !!regenAudioKey || isSaving || isRemoving || anyRecordingWork || ttsPrepState.busy,
        "aria-label": `${needsRebuild ? 'Rebuild' : isSaved ? 'Regenerate' : 'Generate'} audio for sentence ${sentenceNumber}`,
        title: needsRebuild ? 'Rebuild this clip with the currently selected voice, speed, and language.' : isSaved ? 'Replace this saved clip with current voice settings.' : 'Generate audio with current voice settings.',
        className: `${actionClass} bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50`
      }, isGenerating ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isGenerating ? isSaved ? 'Regenerating' : 'Generating' : needsRebuild ? 'Rebuild' : isSaved ? 'Regenerate' : 'Generate')), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRecordEditAudioSentence(sentence, key, sentenceNumber);
        },
        disabled: recordDisabled,
        "aria-pressed": isRecording,
        "aria-label": `${isRecording ? 'Stop recording' : 'Record teacher audio'} for sentence ${sentenceNumber}`,
        title: isRecording ? 'Stop and save this recording' : isSaved ? 'Record a teacher voice replacement' : 'Record teacher audio',
        className: `${actionClass} ${isRecording ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-white text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-50'}`
      }, isMicRequest || isRecordingSave ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : isRecording ? /*#__PURE__*/React.createElement(StopCircle, {
        size: 12
      }) : /*#__PURE__*/React.createElement(Mic, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isMicRequest ? 'Opening mic' : isRecording ? 'Stop' : isRecordingSave ? 'Saving' : 'Record')), isSaved && /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRemoveReadAloudSentence(sentence, key, sentenceNumber);
        },
        disabled: !!removeAudioKey || isSaving || !!regenAudioKey || anyRecordingWork || ttsPrepState.busy,
        "aria-label": `Remove saved audio for sentence ${sentenceNumber}`,
        className: `${actionClass} bg-white text-rose-700 border-rose-200 hover:bg-rose-50`
      }, isRemoving ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : /*#__PURE__*/React.createElement(Trash2, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isRemoving ? 'Removing' : 'Remove'))));
    }))));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, isImmersiveReaderActive && generatedContent?.immersiveData && /*#__PURE__*/React.createElement("div", {
    ref: immersiveDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": t('immersive.title') || 'Immersive Reader',
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, immersiveDialogRef.current, handleCloseImmersiveReader),
    className: "fixed inset-0 z-[200] overflow-y-auto animate-in motion-reduce:animate-none fade-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none flex flex-col font-sans",
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
    isTeacher: isTeacherMode,
    onClose: () => setIsKaraokeOverlayActive(false),
    getAudioUrl: getKaraokeAudioUrl,
    sentenceList: karaokeReaderSentences,
    captureOn: saveTtsAsPlayed,
    onCaptureChange: setSaveTtsAsPlayedEnabled,
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
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    className: "fixed inset-0 pointer-events-none z-[100] flex items-center justify-center",
    "data-a11y-overlay": "nonmodal-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null), /*#__PURE__*/React.createElement("div", {
    className: "mt-40 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border-4 border-white shadow-xl animate-in motion-reduce:animate-none zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 24,
    className: "text-yellow-500 fill-current",
    "aria-hidden": "true"
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
    type: "button",
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
    type: "button",
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
    type: "button",
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
    type: "button",
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
    type: "button",
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
    type: "button",
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
    type: "button",
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
    type: "button",
    onClick: handleSetIsSyntaxGameToTrue,
    className: "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all bg-orange-100 text-orange-800 hover:bg-orange-200 shadow-sm",
    title: t('simplified.tip_scramble'),
    "aria-label": t('simplified.scramble_game'),
    "data-help-key": "simplified_scramble_game"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 12
  }), " ", t('simplified.scramble_game')), isTeacherMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
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
    type: "button",
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
    type: "button",
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
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(BookOpen, {
    size: 14
  }), isAnalyzingPos ? t('simplified.loading_reader') : t('simplified.immersive_reader')), /*#__PURE__*/React.createElement("select", {
    value: readingTheme,
    onChange: e => setReadingTheme(e.target.value),
    "aria-label": "Reading theme",
    className: `px-2 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${readingTheme === 'default' ? 'border-slate-200 bg-white text-slate-600' : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`
  }, /*#__PURE__*/React.createElement("option", {
    value: "default"
  }, "🎨 Default (App Theme)"), /*#__PURE__*/React.createElement("option", {
    value: "warm"
  }, "☀️ Warm Cream"), /*#__PURE__*/React.createElement("option", {
    value: "sepia"
  }, "📜 Sepia"), theme !== 'dark' && /*#__PURE__*/React.createElement("option", {
    value: "dark"
  }, "🌙 Dark Mode"), /*#__PURE__*/React.createElement("option", {
    value: "highContrast"
  }, "◼️ High Contrast"), /*#__PURE__*/React.createElement("option", {
    value: "blue"
  }, "💧 Blue Wash"), /*#__PURE__*/React.createElement("option", {
    value: "green"
  }, "🌿 Green Tint"), /*#__PURE__*/React.createElement("option", {
    value: "rose"
  }, "🌸 Rose"), /*#__PURE__*/React.createElement("option", {
    value: "dyslexia"
  }, "🔤 Easy Read")), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center mr-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
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
    type: "button",
    onClick: handleDuplicateResource,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_duplicate_btn'),
    "aria-label": t('simplified.tip_duplicate_btn'),
    "data-help-key": "simplified_duplicate"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.duplicate')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCheckLevel,
    disabled: isCheckingLevel,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
    title: t('simplified.tip_check_level_btn'),
    "aria-label": t('simplified.tip_check_level_btn'),
    "data-help-key": "simplified_check_level"
  }, isCheckingLevel ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Search, {
    size: 14
  }), isCheckingLevel ? t('simplified.checking') : t('simplified.check_level')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCheckAlignment,
    disabled: isCheckingAlignment || !standardsInput,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${!standardsInput ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-slate-300'}`,
    title: !standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn'),
    "aria-label": !standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn'),
    "data-help-key": "simplified_rigor_report"
  }, isCheckingAlignment ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 14
  }), isCheckingAlignment ? t('simplified.checking') : t('simplified.rigor_report')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => copyToClipboard(generatedContent?.data),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_copy_btn'),
    "aria-label": t('simplified.tip_copy_btn'),
    "data-help-key": "simplified_copy_text"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.copy_text')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleDownloadAudio(generatedContent?.data, `leveled-text-${gradeLevel}`, 'dl-simplified-main'),
    disabled: downloadingContentId === 'dl-simplified-main',
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    "data-help-key": "simplified_download_audio"
  }, downloadingContentId === 'dl-simplified-main' ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Download, {
    size: 14
  }), downloadingContentId === 'dl-simplified-main' ? t('common.downloading') : t('common.download_audio')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      if (ttsPrepState.busy) {
        window.__alloPrepareReadAloudCancel = true;
        return;
      }
      handlePrepareReadAloudAudio();
    },
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: ttsPrepState.busy ? t('common.stop') || 'Stop' : t('immersive.prepare_all') || 'Save TTS',
    "aria-label": ttsPrepState.busy ? t('common.stop') || 'Stop saving TTS' : t('immersive.prepare_all') || 'Save TTS',
    "data-help-key": "simplified_save_tts"
  }, ttsPrepState.busy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Volume2, {
    size: 14
  }), ttsPrepState.busy ? `${ttsPrepState.done}/${ttsPrepState.total || '...'} ✕` : 'Save TTS'))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.toggle_edit_text'),
    onClick: handleToggleIsEditingLeveledText,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingLeveledText ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'}`,
    "data-help-key": "simplified_edit"
  }, isEditingLeveledText ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingLeveledText ? t('common.done_editing') : t('common.edit'))))), definitionData && /*#__PURE__*/React.createElement("div", {
    ref: definitionDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "simplified-definition-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, definitionDialogRef.current, closeDefinition),
    className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-64 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none fade-in zoom-in-75 duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none`,
    style: {
      top: Math.min(window.innerHeight - 300, definitionData.y + 10) + 'px',
      left: Math.min(window.innerWidth - 280, definitionData.x - 20) + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "simplified-definition-title",
    className: "font-bold text-indigo-900 text-lg capitalize"
  }, definitionData.word), /*#__PURE__*/React.createElement("button", {
    ref: definitionCloseRef,
    type: "button",
    onClick: closeDefinition,
    className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), definitionData.text ? renderReadingLevelExplanation(definitionData, t, renderFormattedText) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-xs text-indigo-500"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('glossary.popups.finding')), definitionData.dictionary && renderDictionaryPanel(definitionData.dictionary, t), definitionData.text && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-slate-100"
  }, definitionData.imageUrl ? /*#__PURE__*/React.createElement("img", {
    src: definitionData.imageUrl,
    alt: definitionData.word,
    className: "w-full h-32 object-contain rounded-lg bg-slate-50 border border-slate-400"
  }) : definitionData.imageLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 text-xs text-indigo-500 h-20 bg-slate-50 rounded-lg border border-slate-400 border-dashed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('common.loading') || 'Loading picture...') : definitionData.imageError ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 italic text-center py-2"
  }, t('glossary.popups.image_error') || 'Could not load picture.') : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFetchWordImage(definitionData.word),
    className: "w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors",
    "aria-label": t('glossary.popups.show_picture') || 'Show picture for this word'
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 12
  }), " ", t('glossary.popups.show_picture') || 'Show picture')), /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-indigo-200 transform rotate-45"
  })), definitionData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ}`,
    onClick: closeDefinition
  }), phonicsData && /*#__PURE__*/React.createElement("div", {
    ref: phonicsDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "phonics-popup-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, phonicsDialogRef.current, closePhonics),
    className: `fixed ${_popupZ} bg-white allo-popover-solid p-5 rounded-xl shadow-2xl border-2 border-emerald-200 w-72 animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
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
    ref: phonicsCloseRef,
    type: "button",
    onClick: closePhonics,
    className: "text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), phonicsData.isLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-6 gap-2 text-emerald-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 24,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
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
    type: "button",
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
  }))), renderPhonicsDictRow(phonicsData, t), /*#__PURE__*/React.createElement("div", {
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
  }, phonicsData.data.syllables.map((syl, i) => /*#__PURE__*/React.createElement(React.Fragment, null, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-500 font-bold px-0.5",
    "aria-hidden": "true"
  }, "•"), /*#__PURE__*/React.createElement("span", {
    className: "bg-white px-1.5 rounded border border-slate-400 text-sm font-bold text-slate-700 shadow-sm"
  }, syl))))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-red-600 text-xs font-bold py-4"
  }, t('glossary.popups.failed')), /*#__PURE__*/React.createElement("div", {
    className: "allo-popover-solid absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-emerald-200 transform rotate-45"
  })), phonicsData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ}`,
    onClick: closePhonics
  }), selectionMenu && /*#__PURE__*/React.createElement("div", {
    className: `fixed ${_popupZ} flex flex-col gap-1 items-center animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2 duration-200`,
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
    className: "flex items-center gap-1 px-1 animate-in motion-reduce:animate-none slide-in-from-right-2 duration-200"
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
    type: "button",
    "aria-label": t('common.continue'),
    onClick: () => handleReviseSelection('custom', customReviseInstruction),
    className: "p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors",
    disabled: !customReviseInstruction.trim()
  }, /*#__PURE__*/React.createElement(ArrowRight, {
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.close_revision_panel'),
    onClick: handleSetIsCustomReviseOpenToFalse,
    className: "p-1.5 text-slate-600 hover:text-white rounded-full transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, interactionMode === 'explain' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.help'),
    onClick: () => handleReviseSelection('explain'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 12,
    className: "text-teal-700"
  }), " ", t('text_tools.explain')), interactionMode === 'revise' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.generate'),
    onClick: () => handleReviseSelection('simplify'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    className: "text-yellow-700"
  }), " ", t('text_tools.simplify')), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-3 bg-slate-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleReviseSelection('custom-input'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 12,
    className: "text-indigo-600"
  }), " ", t('text_tools.custom'))), interactionMode === 'define' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.search'),
    onClick: handleDefineSelection,
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12,
    className: "text-yellow-700"
  }), " ", t('text_tools.define')), interactionMode === 'add-glossary' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.add'),
    onClick: () => {
      handleQuickAddGlossary(selectionMenu.text, true);
      setSelectionMenu(null);
    },
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12,
    className: "text-green-700"
  }), " ", t('text_tools.add_term')))), /*#__PURE__*/React.createElement("div", {
    className: "w-2 h-2 bg-slate-800 rotate-45"
  })), selectionMenu && /*#__PURE__*/React.createElement("div", {
    className: `fixed inset-0 ${_popupBackdropZ} bg-transparent`,
    onMouseDown: e => {
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
    }
  }), revisionData && /*#__PURE__*/React.createElement("div", {
    ref: revisionDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "simplified-revision-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, revisionDialogRef.current, closeRevision),
    className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-72 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
    style: {
      top: Math.min(window.innerHeight - 300, revisionData.y + 20) + 'px',
      left: Math.min(window.innerWidth - 300, Math.max(20, revisionData.x - 140)) + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-3 pb-2 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "simplified-revision-title",
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
    ref: revisionCloseRef,
    type: "button",
    onClick: closeRevision,
    className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), revisionData.result ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100 mb-3"
  }, renderFormattedText(revisionData.result, false)), (revisionData.type === 'simplify' || revisionData.type === 'custom') && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.apply_text_revision'),
    onClick: applyTextRevision,
    className: "min-h-11 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }), " ", t('simplified.revision.replace_btn'))) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-4 gap-2 text-slate-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin motion-reduce:animate-none text-indigo-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, t('simplified.revision.working')))), revisionData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ} bg-black/5`,
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
    className: "text-green-600 animate-pulse motion-reduce:animate-none"
  }, t('status.adjusting'), "..."), complexityLevel > 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-600 animate-pulse motion-reduce:animate-none"
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
    className: "mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
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
    type: "button",
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
    className: "mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
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
    type: "button",
    "aria-label": t('common.regenerate_with_rigor'),
    onClick: handleRegenerateWithRigor,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "text-xs font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: isProcessing ? "animate-spin motion-reduce:animate-none" : ""
  }), " ", t('simplified.apply_regenerate')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
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
    className: "w-full h-full min-h-[500px] animate-in motion-reduce:animate-none fade-in duration-300"
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
    type: "button",
    onClick: () => handleFormatText('bold'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.bold')
  }, /*#__PURE__*/React.createElement(Bold, {
    size: 16,
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('italic'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.italic')
  }, /*#__PURE__*/React.createElement(Italic, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('highlight'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.highlight')
  }, /*#__PURE__*/React.createElement(Highlighter, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h1'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h1')
  }, "H1"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h2'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h2')
  }, "H2"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h3'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h3') || 'Heading 3'
  }, "H3"), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('list'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.list')
  }, /*#__PURE__*/React.createElement(List, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('numlist'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.numlist') || 'Numbered List'
  }, /*#__PURE__*/React.createElement(ListOrdered, {
    size: 16
  }))), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('simplified.revision.placeholder_edit_text') || 'Edit simplified text',
    "data-allo-textundo": "simplified",
    ref: textEditorRef,
    value: generatedContent?.data,
    onChange: e => handleSimplifiedTextChange(e.target.value),
    className: "w-full min-h-[500px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-lg text-slate-800 font-medium leading-relaxed resize-none font-sans",
    spellCheck: "false",
    placeholder: t('simplified.revision.placeholder_edit_text')
  }), renderEditAudioSentenceTools()) : isSideBySide && getSideBySideContent(generatedContent?.data) ? /*#__PURE__*/React.createElement("div", {
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
            }, "✓"), part);
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
            className: `cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 inline-block border-b border-transparent hover:border-emerald-200 focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1`,
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
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
    className: "mt-6 flex items-center justify-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider animate-pulse motion-reduce:animate-none opacity-80"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " Generating more...")) : /*#__PURE__*/React.createElement("div", {
    className: `w-full min-h-[500px] text-lg font-medium leading-relaxed font-sans prose prose-p:my-2 max-w-none ${cursorStyles[interactionMode]} transition-all duration-500 ease-in-out ${isLineFocusMode ? 'bg-slate-950 text-slate-600 p-8 rounded-2xl shadow-inner prose-invert' : 'text-slate-800 prose-headings:text-orange-900 prose-strong:text-orange-900'} ${getContentDirection(generatedContent?.config?.language || leveledTextLanguage) === 'rtl' ? 'text-right' : 'text-left'}`,
    style: {
      maxWidth: 'min(72ch, 100%)',
      marginLeft: 'auto',
      marginRight: 'auto'
    },
    dir: getContentDirection(generatedContent?.config?.language || leveledTextLanguage)
  }, generatedContent?.data ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    const rawData = generatedContent?.data;
    const _fullData = typeof rawData === 'string' ? rawData : String(rawData || '');
    const {
      body: _bodyRaw,
      references: _referencesFromContent
    } = splitReferencesFromBody(_fullData);
    // Normalize AI heading lines wrapped in * / ** (e.g. "*Dreams*",
    // "**How Do We Dream?**") into real Markdown headings, so the reader
    // styles them as bold section headers instead of showing the raw
    // asterisks. Only matches a WHOLE line that is a single * / ** span
    // with no other asterisks — inline emphasis inside a sentence is
    // untouched.
    const _bodyNoRefs = String(_bodyRaw || '').replace(/^[ \t]*(\*{1,2})([^*\n]+?)\1[ \t]*$/gm, (_m, _s, _inner) => '## ' + _inner.trim());
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
            // focusedParagraphIndex is compared against paragraphId
            // (`${keyPrefix}-${pIdx}`) in this side-by-side branch, so
            // hover must set the same string — setting bare pIdx left
            // the hovered paragraph permanently dimmed/blurred in
            // line-focus mode.
            return /*#__PURE__*/React.createElement("p", {
              key: pIdx,
              className: `mb-4 leading-relaxed cursor-text selection:text-teal-900 transition-all duration-500 ${interactionMode === 'revise' ? 'selection:bg-purple-200' : 'selection:bg-teal-200'} ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 rounded-xl shadow-lg text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`,
              onMouseUp: handleTextMouseUp,
              onMouseEnter: () => setFocusedParagraphIndex(paragraphId),
              onMouseLeave: () => setFocusedParagraphIndex(null)
            }, cleanText);
          }
          if (sentencesInPara.length === 0) return null;
          return /*#__PURE__*/React.createElement("p", {
            key: pIdx,
            className: `mb-4 leading-relaxed transition-all duration-500 ease-in-out rounded-xl ${isLineFocusMode ? shouldFocus ? 'opacity-100 scale-105 origin-left bg-slate-800 p-4 shadow-2xl text-white ring-1 ring-indigo-500/30 -mx-2' : 'opacity-20 blur-[1px]' : 'opacity-100'}`,
            onMouseEnter: () => setFocusedParagraphIndex(paragraphId),
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
                }, "✓"), part);
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
              className: `cursor-help hover:bg-yellow-200 rounded px-0.5 transition-colors duration-200 focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''}`
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
              className: `cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-emerald-200 inline-block focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${isHeader ? isEnglish ? 'font-bold text-indigo-900' : 'font-bold text-orange-900' : ''}`,
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
              className: `cursor-help hover:bg-emerald-100 text-slate-800 hover:text-emerald-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-emerald-200 inline-block focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${isHeader ? 'font-bold text-orange-900' : ''}`,
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
              }, "✓"), part);
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
              className: `cursor-help hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded px-0.5 transition-colors duration-200 border-b border-transparent hover:border-indigo-200 inline-block focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${isHeader3 ? 'font-bold text-indigo-900' : ''}`,
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
    className: "mt-4 flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider animate-pulse motion-reduce:animate-none opacity-80"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " Generating more..."))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SimplifiedView = SimplifiedView;
  window.AlloModules.ViewSimplifiedModule = true;
})();
