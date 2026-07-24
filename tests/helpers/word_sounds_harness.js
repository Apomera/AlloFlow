// Word Sounds golden-master harness.
//
// PURPOSE: a characterization (golden master) baseline for WordSoundsModal — the
// ~25k-line god-component this project plans to decompose. It pins the
// component's *observable behavior* (render output per activity, feedback UI,
// and the linguistic anchor data) so the structure can be refactored with a
// safety net: if a refactor changes what the component renders for a fixed set
// of inputs, the snapshot diff catches it.
//
// HOW IT WORKS (zero changes to the live module — read-only):
//   * load word_sounds_module.js into the vitest+jsdom window (the same
//     `new Function(src)()` trick as tests/setup.js), but with REAL React
//     (from desktop/web-app/node_modules) so the component can render.
//   * the module references ~70 ambient globals at production runtime (lucide
//     icons, a few data tables, firebase handles, helper fns). They are injected
//     by the host page there; here we stub them so the IIFE loads and renders.
//     The exact set was discovered with eslint-scope through-references
//     (the same engine as dev-tools/check_render_refs.cjs).
//   * render each activity with renderToStaticMarkup — this exercises the RENDER
//     phase (including the crash-prone hook dependency arrays) but skips
//     useEffect, so there is no audio / network / timer nondeterminism.
//   * Math.random and Date.now are frozen so snapshots are byte-stable.
//
// SCOPE / HONEST LIMITS: this pins the render phase under a fixed stub env, not
// a live browser session. It does NOT exercise effects, audio, AI calls, or
// click-driven grading (checkAnswer runs in a handler). The pure grading /
// phoneme logic is closure-locked inside the component; characterizing it
// directly is a separate step that needs a small extraction (the first
// decomposition move). See tests/word_sounds_golden.test.js.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

// Real React 18 + its SSR renderer. react-dom resolves its own `react` from the
// same directory, so element identity is consistent with `React` below.
export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const noop = () => {};

// lucide icons referenced as bare globals in the render path.
const ICONS = ['AlertCircle', 'AlertTriangle', 'BarChart2', 'BarChart3', 'Calculator', 'Chart', 'Check', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ClipboardList', 'Cloud', 'Download', 'Ear', 'Edit2', 'Globe', 'Maximize2', 'Mic', 'MicOff', 'Minimize', 'Music', 'Play', 'PlayCircle', 'Printer', 'RefreshCw', 'Settings', 'ShieldCheck', 'Star', 'Trash2', 'Trophy', 'Upload', 'Users', 'Volume2', 'Wifi', 'X', 'Zap'];

// The 14 distinct wordSoundsActivity values (from `wordSoundsActivity === "..."`
// comparisons in the module).
export const ACTIVITIES = ['rhyming', 'blending', 'segmentation', 'isolation', 'manipulation', 'syllable_blending', 'syllable_counting', 'sound_sort', 'word_families', 'orthography', 'letter_tracing', 'spelling_bee', 'mapping', 'counting', 'decoding'];

const FROZEN_EPOCH = 1700000000000;

let _loaded = false;
let _WordSoundsModal = null;

/**
 * Build the ambient-global stub contract and install it on the jsdom window
 * (and globalThis, so bare-identifier lookups inside the IIFE resolve either
 * way). Discovered via eslint-scope; benign fixed values — the point is that
 * they are STABLE so the snapshots stay deterministic.
 */
function installAmbientGlobals() {
  const stubs = { React };
  for (const name of ICONS) {
    stubs[name] = () => React.createElement('span', { className: 'lucide-icon', 'data-icon': name });
  }
  // host-provided data / util tables
  stubs.LETTER_NAME_AUDIO = {};
  stubs.ORF_PRACTICE_PASSAGES = [];
  stubs.PHONEME_GUIDE = {};
  stubs.PRACTICE_PROBE_BANKS = {};
  stubs.SafetyContentChecker = { check: () => ({ safe: true }), isSafe: () => true, scan: () => ({ safe: true }) };
  // firebase handles (only used inside effects; stubbed so refs resolve)
  stubs.db = {};
  stubs.appId = 'test-app';
  stubs.collection = () => ({});
  stubs.onSnapshot = () => () => {};
  stubs.saveInterventionLog = noop;
  stubs.deleteInterventionLog = noop;
  // helper globals
  stubs._CACHE_WORD_AUDIO_BANK = {};
  stubs.calculateRunningRecordMetrics = () => ({});
  stubs.callGeminiImageEdit = async () => null;
  stubs.getBenchmarkComparison = () => null;
  stubs.normalizePhoneme = (p) => p;
  stubs.safeGetItem = () => null;
  stubs.safeSetItem = noop;
  stubs.renderVoiceInputOverlay = () => null;
  // state-ish free vars (referenced as globals; benign fixed values)
  stubs.alloBotRef = { current: null };
  stubs.cancelled = false;
  stubs.currentStreak = 0;
  stubs.fluencyBenchmarkGrade = null;
  stubs.fluencyBenchmarkSeason = null;
  stubs.mathFluencyHistory = [];
  stubs.phonemeData = {};
  stubs.rtiGoals = [];
  stubs.rtiDecisionRuleMethod = '';
  stubs.rtiDecisionRuleThreshold = 0;
  stubs.setRtiGoals = noop;
  stubs.setRtiDecisionRuleMethod = noop;
  stubs.setRtiDecisionRuleThreshold = noop;
  stubs.setShowClassAnalytics = noop;
  stubs.studentNickname = '';

  for (const k of Object.keys(stubs)) {
    window[k] = stubs[k];
    globalThis[k] = stubs[k];
  }
  window.ts = emptyTranslationT;
  globalThis.ts = emptyTranslationT;
  if (typeof globalThis.warnLog !== 'function') globalThis.warnLog = noop;
  if (typeof globalThis.debugLog !== 'function') globalThis.debugLog = noop;
}

/**
 * Load WordSoundsModal into the jsdom window with a deterministic environment.
 * Idempotent. Returns the harness API.
 */
export function setupWordSounds() {
  if (_loaded) return api();

  // freeze the only two nondeterministic primitives the module touches
  globalThis.Math.random = () => 0.42;
  globalThis.Date.now = () => FROZEN_EPOCH;

  installAmbientGlobals();

  window.AlloModules = window.AlloModules || {};
  const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();

  _WordSoundsModal = window.AlloModules.WordSoundsModal;
  if (typeof _WordSoundsModal !== 'function') {
    throw new Error('Harness setup failed: WordSoundsModal did not register on window.AlloModules');
  }
  _loaded = true;
  return api();
}

const passthroughT = (key, fallback) => fallback || key;
const emptyTranslationT = () => '';
const FALLBACK_STRING_KEYS = new Set(['word_sounds.sr_welcome', 'word_sounds.sr_number', 'word_sounds.sr_tap_count_syllables', 'word_sounds.sr_tracing_canvas']);
const wordSoundsStringStub = (_t, key) => {
  // Keep the golden harness mostly key-stable, but exercise explicit English
  // fallbacks for strings whose prior baseline intentionally asserted them.
  if (FALLBACK_STRING_KEYS.has(key)) return '';
  return key;
};

/**
 * A complete, deterministic prop set that drives one activity to a populated
 * (non-loading) render. Setters are no-ops, callbacks are no-ops, translation
 * is a passthrough — the core state (word / phonemes / activity / feedback) is
 * fed via props so the render is meaningful and stable.
 */
export function baseProps(activity) {
  return {
    audioCache: {}, glossaryTerms: [{ term: 'cat', definition: 'a small pet' }], onClose: noop,
    wordSoundsActivity: activity, setWordSoundsActivity: noop,
    wordSoundsScore: { correct: 2, total: 5, streak: 1 }, setWordSoundsScore: noop,
    currentWordSoundsWord: 'cat', setCurrentWordSoundsWord: noop,
    wordSoundsPhonemes: ['k', 'a', 't'], setWordSoundsPhonemes: noop,
    wordSoundsLanguage: 'en', setWordSoundsLanguage: noop,
    wordSoundsFeedback: null, setWordSoundsFeedback: noop,
    wordSoundsHistory: [], setWordSoundsHistory: noop,
    wordSoundsFamilies: [], setWordSoundsFamilies: noop,
    wordSoundsAudioLibrary: {}, setWordSoundsAudioLibrary: noop,
    fetchTTSBytes: noop, onScoreUpdate: noop, speakWord: noop,
    callGemini: noop, callTTS: noop, callImagen: noop, selectedVoice: null, t: passthroughT,
    wordSoundsDifficulty: 'auto', setWordSoundsDifficulty: noop,
    wordSoundsAccuracyHistory: [], setWordSoundsAccuracyHistory: noop,
    wordSoundsTtsSpeed: 1, setWordSoundsTtsSpeed: noop,
    orthoSessionGoal: 0, setOrthoSessionGoal: noop,
    wordSoundsStreak: 0, setWordSoundsStreak: noop,
    wordSoundsSessionGoal: 10, setWordSoundsSessionGoal: noop,
    wordSoundsSessionProgress: 0, setWordSoundsSessionProgress: noop,
    wordSoundsBadges: [], setWordSoundsBadges: noop,
    wordSoundsLevel: 1, setWordSoundsLevel: noop,
    phonemeMastery: {}, setPhonemeMastery: noop,
    wordSoundsDailyProgress: {}, setWordSoundsDailyProgress: noop,
    wordSoundsConfusionPatterns: {}, setWordSoundsConfusionPatterns: noop,
    playSound: noop, disableAnimations: true, addToast: noop,
    wsPreloadedWords: [], setWsPreloadedWords: noop, onBackToSetup: noop,
    initialShowReviewPanel: false, initialActivitySequence: [], lessonPlanConfig: null,
    isProbeMode: false, probeGradeLevel: 'K', onProbeComplete: noop,
    getWordSoundsString: wordSoundsStringStub, isParentMode: false,
  };
}

function scrub(html) {
  return html
    .split('><').join('>\n<')                              // one tag per line -> readable diffs
    .split(String(FROZEN_EPOCH)).join('<TS>');             // normalize frozen epoch if it leaks into ids
}

/**
 * SSR-render WordSoundsModal. Pass an activity name (uses baseProps) or a full
 * props object. Returns scrubbed, line-oriented HTML suitable for snapshotting.
 */
export function renderActivity(activityOrProps) {
  if (!_loaded) setupWordSounds();
  const props = typeof activityOrProps === 'string' ? baseProps(activityOrProps) : activityOrProps;
  return scrub(ReactDOMServer.renderToStaticMarkup(React.createElement(_WordSoundsModal, props)));
}

function api() {
  return {
    React, ReactDOMServer,
    WordSoundsModal: _WordSoundsModal,
    anchor: window.__alloAnchor,
    renderActivity, baseProps, ACTIVITIES,
  };
}
