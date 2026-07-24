#!/usr/bin/env node
/*
 * check_module_render.cjs — render-smoke for NON-STEM CDN view modules.
 *
 * Companion to check_stem_render.cjs. STEM tools share one ctx contract so they can be
 * smoked generically; the other CDN modules each export bespoke components with bespoke
 * props, and many exports are helpers (createX) not components — so "render every export"
 * would false-positive. Instead this is a CURATED, extensible config: per module, name
 * the real entry-point components + the props that drive them to a real render. A throw
 * = a render-phase crash (the class static gates miss: bare `t`, undefined.map, etc. —
 * e.g. the 2026-06-05 annotation Toolbar `t is not defined` crash).
 *
 * Deeply-stateful modules (word_sounds, symbol_studio, behavior_lens) already have
 * golden-master harnesses run by `npm test`, so they are intentionally NOT duplicated here.
 *
 * SSR-only (render phase, not effects). Skips gracefully if React/jsdom are absent.
 * Usage:  node dev-tools/check_module_render.cjs [--quiet]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, 'desktop/web-app', 'node_modules');
const QUIET = process.argv.includes('--quiet');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES_DIR, 'jsdom')).JSDOM;
  React = require(path.join(MODULES_DIR, 'react'));
  RDS = require(path.join(MODULES_DIR, 'react-dom', 'server'));
} catch (e) {
  console.warn('[check_module_render] SKIPPED — React/jsdom not found at ' + MODULES_DIR + ' (' + e.message + ')');
  process.exit(0);
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true });
function setGlobal(k, v) {
  try { global[k] = v; } catch (e) { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {} }
}
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('getComputedStyle', dom.window.getComputedStyle);

const noop = function () {};
const t = function (k) { return k; };
const stubComp = function () { return null; };
const iconsProxy = new Proxy({}, { get: function () { return stubComp; } });
setGlobal('React', React);
dom.window.React = React;
dom.window.AlloIcons = iconsProxy;
dom.window.AlloModules = dom.window.AlloModules || {};
if (typeof dom.window.matchMedia !== 'function') {
  dom.window.matchMedia = function () { return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }; };
}

// Sample annotations covering every Overlay node kind (sticker/note/highlight/voice/draw).
const ANNS = [
  { id: 's1', type: 'sticker', kind: 'sticker', stickerType: 'star', x: 10, y: 10, author: 'teacher', authorName: 'T' },
  { id: 'n1', type: 'note', kind: 'note', content: 'hi', x: 10, y: 10, color: 'yellow', author: 'teacher', authorName: 'T' },
  { id: 'h1', type: 'highlight', kind: 'highlight', color: 'yellow', rects: [{ x: 0, y: 0, width: 10, height: 10 }], x: 0, y: 0, width: 10, height: 10, author: 'teacher', authorName: 'T' },
  { id: 'v1', type: 'voice', kind: 'voice', x: 10, y: 10, audioData: 'data:audio/webm;base64,AA==', durationSec: 3, author: 'teacher', authorName: 'T' },
  { id: 'd1', type: 'draw', kind: 'draw', color: 'red', width: 4, shape: 'free', points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], path: 'M0,0 L5,5', author: 'teacher', authorName: 'T' },
];

// ── SimplifiedView (leveled-text reader) render-smoke props ──
// SimplifiedView is a pure presentational view that receives ~110 props from
// the parent App (state + setters + handlers + pure helpers + sub-components).
// Setters/handlers fire only on interaction, but the pure-helper props are
// CALLED during the synchronous render, so they must be real functions
// returning safe shapes. `simplifiedBase` holds the stable props; per-recipe
// overrides vary content + reading mode. (Mapped read-only against the module.)
const _sid = function (x) { return x == null ? '' : String(x); };
const simplifiedBase = {
  t: t,
  isTeacherMode: false, isProcessing: false, isPlaying: false,
  interactionMode: 'read', isCompareMode: false, isFluencyMode: false, isEditingLeveledText: false,
  isImmersiveReaderActive: false, immersiveSettings: {}, immersiveRulerY: 0,
  isFocusReaderActive: false, isChunkReaderActive: false, chunkReaderIdx: 0, chunkReaderAutoPlay: false,
  chunkReaderSpeed: 1, chunkReaderReadAlong: false, chunkReaderSweepPct: 0, chunkReaderMood: 'highlight', chunkTypewriterCharIdx: 0,
  isCrawlReaderActive: false, isKaraokeOverlayActive: false, isAnalyzingPos: false,
  isCheckingLevel: false, isCheckingAlignment: false, isLineFocusMode: false, focusedParagraphIndex: null, isZenMode: false,
  definitionData: null, phonicsData: null, revisionData: null, selectionMenu: null, isCustomReviseOpen: false,
  customReviseInstruction: '', latestGlossary: [], history: [],
  complexityLevel: 5, saveOriginalOnAdjust: false, playbackState: { currentIdx: -1 }, playbackRate: 1, voiceSpeed: 1,
  lineHeight: 1.5, letterSpacing: 0, readingTheme: 'default', theme: 'light', isTeacherToolbarExpanded: false,
  downloadingContentId: null, isClozeComplete: false, isSideBySide: false, cursorStyles: {},
  studentInterests: [], standardsInput: '', sourceTopic: '',
  chunkReaderSweepAudioRef: { current: null }, chunkReaderSweepRafRef: { current: null }, textEditorRef: { current: null },
  // pure helpers invoked during render — must return safe shapes
  splitTextToSentences: function (p) { return (p && _sid(p).trim()) ? _sid(p).split(/(?<=[.!?])\s+/) : []; },
  getSideBySideContent: function () { return null; },
  formatInteractiveText: function (txt) { return _sid(txt); },
  renderFormattedText: function (txt) { return _sid(txt); },
  splitReferencesFromBody: function (txt) { return { body: _sid(txt), references: '' }; },
  parseReferenceItems: function () { return []; },
  highlightGlossaryTerms: function (txt) { return _sid(txt); },
  diffWords: function (a, b) { return [{ type: 'equal', value: _sid(b) }]; },
  callTTS: function () { return Promise.resolve(null); },
  copyToClipboard: noop, isRtlLang: function () { return false; }, getContentDirection: function () { return 'ltr'; },
  // sub-component props — stub to null-render (ErrorBoundary passes children)
  ImmersiveToolbar: function () { return null; }, ImmersiveWord: function () { return null; },
  ErrorBoundary: function (p) { return p.children || null; },
  FocusReaderOverlay: function () { return null; }, PerspectiveCrawlOverlay: function () { return null; },
  KaraokeReaderOverlay: function () { return null; }, ConfettiExplosion: function () { return null; },
  ComplexityGauge: function () { return null; }, SourceReferencesPanel: function () { return null; },
};
// Every set*/handle*/close*/apply*/stop* prop the component reads — fired only
// on interaction, so a no-op each so none are undefined on the render pass.
['setInteractionMode', 'setIsCompareMode', 'setIsFluencyMode', 'setSelectionMenu', 'setRevisionData', 'setPhonicsData', 'setIsImmersiveReaderActive', 'setImmersiveSettings', 'setImmersiveRulerY', 'setIsFocusReaderActive', 'setIsChunkReaderActive', 'setChunkReaderIdx', 'setChunkReaderAutoPlay', 'setChunkReaderSpeed', 'setChunkReaderReadAlong', 'setChunkReaderSweepPct', 'setIsCrawlReaderActive', 'setIsKaraokeOverlayActive', 'setPlaybackRate', 'setLineHeight', 'setLetterSpacing', 'setFocusedParagraphIndex', 'setIsCustomReviseOpen', 'setCustomReviseInstruction', 'setComplexityLevel', 'setSaveOriginalOnAdjust', 'setReadingTheme', 'setGeneratedContent', 'setChunkReaderMood', 'handleCloseImmersiveReader', 'handleGeneratePOSData', 'handleCloseSpeedReader', 'handleSpeak', 'handleWordClick', 'handlePhonicsClick', 'handleFormatText', 'handleSimplifiedTextChange', 'handleReviseSelection', 'handleQuickAddGlossary', 'handleDefineSelection', 'handleTextMouseUp', 'handleSetIsSyntaxGameToTrue', 'handleAnalyzePOS', 'handleCheckLevel', 'handleCheckAlignment', 'handleDuplicateResource', 'handleDownloadAudio', 'handleToggleIsTeacherToolbarExpanded', 'handleToggleIsEditingLeveledText', 'handleSetIsCustomReviseOpenToFalse', 'closeDefinition', 'closePhonics', 'closeRevision', 'handleFetchWordImage', 'applyTextRevision', 'stopPlayback', 'handleComplexityAdjustment', 'handleRegenerateWithRigor'].forEach(function (k) { simplifiedBase[k] = noop; });
function simplified(overrides) { return Object.assign({}, simplifiedBase, overrides); }

// Curated config: each entry names a module file, its window.AlloModules key, and a
// function returning [label, reactElement] pairs to render. Add modules here over time.
const CONFIG = [
  {
    file: 'annotation_suite_module.js',
    key: 'AnnotationSuite',
    renders: function (M) {
      return [
        ['Toolbar(note,teacher)', React.createElement(M.Toolbar, { t: t, mode: 'note', isTeacher: true })],
        ['Toolbar(sticker,student)', React.createElement(M.Toolbar, { t: t, mode: 'sticker', isTeacher: false })],
        ['Toolbar(no-props)', React.createElement(M.Toolbar, {})], // worst case: host didn't thread t
        ['Overlay(all-kinds)', React.createElement(M.Overlay, {
          annotations: ANNS, mode: 'off', isTeacher: true,
          onNoteChange: noop, onNoteDelete: noop, onHighlightDelete: noop, onVoiceDelete: noop, onDrawDelete: noop, onMove: noop, t: t,
        })],
        ['Sidebar', React.createElement(M.Sidebar, { t: t, annotations: ANNS, isTeacher: true })],
      ];
    },
  },
  {
    // PoetTree — student poetry-writing workshop (self-contained: no i18n/icons).
    file: 'poet_tree_module.js',
    key: 'PoetTree',
    renders: function (M) {
      return [
        ['student-default', React.createElement(M, { onClose: noop, onCallGemini: noop, onCallTTS: noop, onCallImagen: noop, onCallGeminiImageEdit: noop, selectedVoice: 'Kore', gradeLevel: '7th Grade', addToast: noop, studentNickname: 'Sam', handleScoreUpdate: noop })],
        ['student-minimal(defaults)', React.createElement(M, { onClose: noop })],
        ['teacher-assignment-builder', React.createElement(M, { onClose: noop, onCallGemini: noop, onCallTTS: noop, gradeLevel: '8th Grade', addToast: noop, onSaveConfig: noop, onSaveSubmission: noop, onSendToLitLab: noop })],
        ['teacher-initialConfig', React.createElement(M, { onClose: noop, onCallGemini: noop, gradeLevel: '6th Grade', addToast: noop, initialConfig: { formId: 'haiku', teacherPrompt: 'Write about a place that feels like home.', suggestedTitle: 'Where I am From' }, onSaveSubmission: noop })],
      ];
    },
  },
  {
    // QuizView — student/teacher quiz surface. The integrity-critical path is the
    // answer-key reveal gate: showQuizAnswers && (isTeacherMode||isParentMode).
    file: 'view_quiz_module.js',
    key: 'QuizView',
    renders: function (M) {
      var base = { t: t, isParentMode: false, isPresentationMode: false, isReviewGame: false, escapeRoomState: { isActive: false }, isFactChecking: {} };
      return [
        ['student-unanswered(gate-closed)', React.createElement(M, Object.assign({}, base, { isTeacherMode: false, isIndependentMode: false, isEditingQuiz: false, showQuizAnswers: false, generatedContent: { id: 'q1', data: { mode: 'exit-ticket', questions: [{ type: 'mcq', question: 'What is 2+2?', options: ['3', '4', '5'], correctAnswer: '4' }] } } }))],
        ['teacher-revealed(gate-open)', React.createElement(M, Object.assign({}, base, { isTeacherMode: true, isIndependentMode: false, isEditingQuiz: false, showQuizAnswers: true, generatedContent: { id: 'q2', data: { mode: 'exit-ticket', questions: [{ type: 'mcq', question: 'Capital of France?', options: ['Paris', 'Lyon', 'Nice'], correctAnswer: 'Paris' }] } } }))],
        ['independent-student(showAnswers-but-gate-closed)', React.createElement(M, Object.assign({}, base, { isTeacherMode: false, isIndependentMode: true, isEditingQuiz: false, showQuizAnswers: true, generatedContent: { id: 'q3', data: { mode: 'exit-ticket', questions: [{ type: 'mcq', question: 'Largest planet?', options: ['Mars', 'Jupiter', 'Venus'], correctAnswer: 'Jupiter' }] } } }))],
        ['teacher-editing', React.createElement(M, Object.assign({}, base, { isTeacherMode: true, isIndependentMode: false, isEditingQuiz: true, showQuizAnswers: true, getRows: function () { return 2; }, handleQuizChange: noop, handleReflectionChange: noop, generatedContent: { id: 'q4', data: { mode: 'exit-ticket', questions: [{ type: 'mcq', question: 'Photosynthesis uses?', options: ['Sunlight', 'Moonlight'], correctAnswer: 'Sunlight' }], reflections: ['What surprised you?'] } } }))],
      ];
    },
  },
  {
    // SimplifiedView — core-UDL leveled-text reader (props via simplifiedBase above).
    file: 'view_simplified_module.js',
    key: 'SimplifiedView',
    renders: function (M) {
      return [
        ['default-reader(student)', React.createElement(M, simplified({
          generatedContent: { data: 'The sun is a star. It gives us light and heat.\n\nPlants need the sun to grow.', config: { grade: '3', language: 'English', interests: [], standards: '' }, type: 'leveled-text' },
          inputText: 'The sun is a very large star. It provides light and warmth.',
          gradeLevel: '3', leveledTextLanguage: 'English', sourceTopic: 'The Sun',
        }))],
        ['teacher+levelcheck(es)', React.createElement(M, simplified({
          isTeacherMode: true, gradeLevel: '5', leveledTextLanguage: 'Spanish', studentInterests: ['dinosaurs'], standardsInput: 'NGSS MS-LS1-1', sourceTopic: 'Cells',
          complexityLevel: 7, saveOriginalOnAdjust: true,
          inputText: 'A cell is the basic structural and functional unit of all known living organisms.',
          generatedContent: { data: 'A cell is the smallest part of a living thing. Cells make up plants and animals.', config: { grade: '5', language: 'Spanish', interests: ['dinosaurs'], standards: 'NGSS MS-LS1-1' }, type: 'leveled-text', levelCheck: { confirmedLevel: 'Grade 5', estimatedLevel: 'Grade 5', alignment: 'Aligned', nuanceSummary: 'Text matches the target reading level.', rubric: { vocabulary: { score: 2, note: 'Tier-2 words present' }, syntax: { score: 1, note: 'Mostly simple sentences' } } } },
        }))],
        ['immersive+chunk(active)', React.createElement(M, simplified({
          isImmersiveReaderActive: true, immersiveSettings: { bgColor: '#fdfbf7', fontColor: '#1e293b', textSize: 18, lineFocus: false, wideText: false }, immersiveRulerY: 300,
          isChunkReaderActive: true, lineHeight: 1.6,
          ImmersiveWord: function (p) { return (p && p.wordData ? p.wordData.text : null); },
          gradeLevel: '2', leveledTextLanguage: 'English', sourceTopic: 'Cat',
          inputText: 'The cat ran fast. It jumped high.',
          generatedContent: { data: 'The cat ran fast. It jumped high.', immersiveData: [{ id: 'w1', text: 'The', pos: 'det' }, { id: 'w2', text: 'cat', pos: 'noun' }, { id: 'w3', text: 'ran', pos: 'verb' }, { id: 'w4', text: 'fast.', pos: 'adv' }, { id: 'nl1', text: '', pos: 'newline' }, { id: 'w5', text: 'It', pos: 'pron' }, { id: 'w6', text: 'jumped', pos: 'verb' }, { id: 'w7', text: 'high.', pos: 'adv' }], posEnriched: true, config: { grade: '2', language: 'English', interests: [], standards: '' }, type: 'leveled-text' },
        }))],
      ];
    },
  },
];

let failures = 0;
let rendered = 0;
const missing = [];

CONFIG.forEach(function (entry) {
  const file = path.join(ROOT, entry.file);
  if (!fs.existsSync(file)) { missing.push(entry.file); return; }
  try {
    new Function(fs.readFileSync(file, 'utf8'))(); // eslint-disable-line no-new-func
  } catch (e) {
    failures++;
    console.error('✗ ' + entry.file + ' failed to LOAD: ' + ((e && e.message) || e));
    return;
  }
  const M = dom.window.AlloModules[entry.key];
  if (!M) {
    failures++;
    console.error('✗ ' + entry.file + ': window.AlloModules.' + entry.key + ' did not register');
    return;
  }
  let pairs;
  try { pairs = entry.renders(M); } catch (e) {
    failures++;
    console.error('✗ ' + entry.key + ': render config threw — ' + ((e && e.message) || e));
    return;
  }
  pairs.forEach(function (p) {
    const label = p[0], element = p[1];
    try {
      RDS.renderToStaticMarkup(React.createElement(function ModuleSmoke() { return element; }));
      rendered++;
    } catch (e) {
      failures++;
      console.error('✗ ' + entry.key + ' › ' + label + ': ' + ((e && e.message) || e));
    }
  });
});

if (!QUIET) {
  console.log('[check_module_render] ' + rendered + ' component render(s) across ' + CONFIG.length + ' module(s) OK');
}
if (missing.length && !QUIET) {
  console.warn('  (skipped missing files: ' + missing.join(', ') + ')');
}
if (failures > 0) {
  console.error('✗ check_module_render: ' + failures + ' non-STEM render failure(s).');
  process.exit(1);
}
console.log('✓ check_module_render: all curated non-STEM module renders pass (' + rendered + ' renders).');
