// Behavior Lens golden-master harness.
//
// PURPOSE: a characterization (golden master) baseline for BehaviorLens — a
// ~27.7k-line module that holds Lisa Hatch's pilot students' entire ABC /
// observation / risk-screening record. The audit identified 4 ship-blockers
// (XSS in print pipelines, codename-rename data loss, 1,415 fake-button
// divs, VTA overclaim) and 6 should-fixes. Per memory:project_word_sounds_golden_master.md
// the standing pattern is "no big-bang rewrite without a snapshot." This
// harness pins the top-level Hub's render-phase behavior so the upcoming
// structural fixes have a safety net — a diff here means a visible change,
// intended or not. Re-baseline with `vitest -u` only when reviewed.
//
// HOW IT WORKS (zero changes to the live module — read-only):
//   * load behavior_lens_module.js into vitest+jsdom via `new Function(src)()`
//     (matches the word_sounds harness pattern)
//   * inject the ambient globals the IIFE needs (React, lucide icons stubbed,
//     Firebase-modular handles, callGemini, addToast, etc.)
//   * SSR-render `window.AlloModules.BehaviorLens` (the top-level Hub)
//     across a small matrix of prop configurations — student vs teacher mode,
//     Canvas iframe vs standalone, with/without studentNickname
//   * Math.random and Date.now are frozen so snapshots are byte-stable
//
// SCOPE / HONEST LIMITS:
//   * Sub-components (ABCModal, RiskScreening, BCBAHandoff, NaturalLanguageABC,
//     etc.) are closure-locked inside the module's IIFE — they can't be
//     rendered in isolation without modifying the live module. v1 pins the
//     Hub only. A subsequent extraction step (the first decomposition move)
//     would let us snapshot each panel directly.
//   * useEffect is skipped (renderToStaticMarkup runs render phase only) —
//     no Firebase calls, no localStorage reads in effects, no toasts.
//     The render-phase localStorage reads ARE exercised (any synchronous
//     `localStorage.getItem` during render hits the populated jsdom store).
//   * This is the render baseline, not a behavior baseline. Click handlers,
//     AI grading, and Firebase sync need their own characterization.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const noop = () => {};
const FROZEN_EPOCH = 1700000000000;

// Lucide icons + internal sub-component identifiers that get referenced as
// bare globals in the render path. The internal sub-components are real
// React components defined inside the IIFE, so we never need to stub them —
// they resolve by closure. The set below is just lucide icons that come from
// host-provided window.AlloIcons in production.
//
// CAREFUL: names like `Map`, `Image`, `Set`, `Date`, `Function` would
// CLOBBER built-in globals if injected as stubs — jsdom internally uses
// `new Map()` etc., so any name collision crashes the module load with
// "Map is not a constructor" the moment jsdom touches the DOM. Behavior
// Lens calls document.createElement('style') at module load (lines
// 42, 102, 141), so the collision surfaces immediately.
//
// Names below were grep-verified safe: none collide with built-ins, and
// none of the collision-prone lucide names (Map, Image) are actually
// referenced in behavior_lens_module.js.
const LUCIDE_ICONS = [
  'AlertCircle', 'AlertTriangle', 'ArrowLeft', 'BarChart2', 'BarChart3',
  'Bell', 'Brain', 'Calendar', 'Camera', 'Check', 'CheckCircle',
  'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp',
  'Clipboard', 'ClipboardList', 'Clock', 'Cloud', 'CloudOff', 'Copy',
  'Database', 'Download', 'Edit', 'Edit2', 'Edit3', 'ExternalLink',
  'Eye', 'EyeOff', 'FileText', 'Filter', 'Flag', 'Folder', 'Gauge',
  'Globe', 'Grid', 'Hash', 'Heart', 'Home', 'Info', 'Layers',
  'Layout', 'Lightbulb', 'List', 'Loader', 'Lock', 'Mail',
  'MapPin', 'MessageCircle', 'MessageSquare', 'Mic', 'MicOff', 'Minus',
  'MoreHorizontal', 'MoreVertical', 'Music', 'PauseCircle', 'PenTool',
  'PieChart', 'Play', 'PlayCircle', 'Plus', 'Power', 'Printer',
  'RefreshCw', 'Repeat', 'RotateCw', 'Save', 'Search', 'Send', 'Settings',
  'Share', 'Share2', 'Shield', 'ShieldAlert', 'ShieldCheck', 'Smile',
  'Speaker', 'Square', 'Star', 'Sun', 'Target', 'ThumbsDown', 'ThumbsUp',
  'Trash', 'Trash2', 'TrendingDown', 'TrendingUp', 'Trophy', 'Type',
  'Upload', 'User', 'UserCheck', 'UserPlus', 'Users', 'Video', 'Volume2',
  'Wifi', 'WifiOff', 'Wind', 'X', 'XCircle', 'Zap', 'ZoomIn', 'ZoomOut'
];

// Defensive guard: even after the manual audit above, refuse to install
// any stub whose key matches a built-in global. If a future contributor
// adds a name like 'Map' or 'Image' here by mistake, this will skip it
// rather than clobber jsdom's internals. The first run will surface the
// missing icon as an undefined component (visible in snapshot diff)
// rather than a cryptic "Map is not a constructor" crash.
const BUILTIN_GLOBALS = new Set([
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Proxy', 'Reflect',
  'Symbol', 'Image', 'Date', 'Math', 'RegExp', 'String', 'Number',
  'Array', 'Object', 'Function', 'Boolean', 'Error', 'JSON',
  'Intl', 'Atomics', 'SharedArrayBuffer', 'ArrayBuffer', 'DataView',
  'BigInt', 'Infinity', 'NaN', 'undefined', 'globalThis',
  'window', 'document', 'console', 'fetch'
]);

let _loaded = false;
let _BehaviorLens = null;

function installAmbientGlobals() {
  const stubs = { React };

  // Lucide icons: render as <span class="lucide-icon" data-icon="NAME">.
  // Stable, snapshot-friendly. The production AlloFlow shell exposes the
  // real lucide-react components via window.AlloIcons; here we don't need
  // pixel fidelity, only a stable placeholder.
  for (const name of LUCIDE_ICONS) {
    stubs[name] = () => React.createElement('span', { className: 'lucide-icon', 'data-icon': name });
  }

  // Firebase modular SDK handles. Behavior Lens reads these in useEffect
  // for cloud sync — useEffect is skipped under renderToStaticMarkup, so
  // these need to exist (for the render phase reference) but never get
  // called. Empty stubs are correct.
  stubs.collection = () => ({ _stub: 'collection' });
  stubs.doc = () => ({ _stub: 'doc' });
  stubs.setDoc = noop;
  stubs.getDoc = async () => ({ exists: () => false, data: () => ({}) });
  stubs.onSnapshot = () => () => {};
  stubs.deleteDoc = noop;
  stubs.signInAnonymously = async () => ({ user: { uid: 'test-uid' } });
  stubs.onAuthStateChanged = () => () => {};

  // Misc host-provided helpers that the module references defensively.
  stubs.callGemini = async () => '';
  stubs.callGeminiVision = async () => '';
  stubs.addToast = noop;
  stubs.warnLog = noop;
  stubs.debugLog = noop;
  stubs.safeGetItem = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  stubs.safeSetItem = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  stubs.studentNickname = '';

  for (const k of Object.keys(stubs)) {
    if (BUILTIN_GLOBALS.has(k)) {
      // Defensive: refuse to clobber a built-in global. See LUCIDE_ICONS
      // comment for why this matters (jsdom's `new Map()` breaks if we
      // overwrite global Map).
      // eslint-disable-next-line no-console
      console.warn('[behavior_lens_harness] refusing to install stub for built-in:', k);
      continue;
    }
    window[k] = stubs[k];
    globalThis[k] = stubs[k];
  }
}

/** Idempotent module load. Returns the harness API. */
export function setupBehaviorLens() {
  if (_loaded) return api();

  // Freeze nondeterministic primitives. Behavior Lens uses Date.now in a
  // few places for entry IDs + timestamps; Math.random is mostly absent
  // from the render path but freezing is cheap insurance.
  globalThis.Math.random = () => 0.42;
  globalThis.Date.now = () => FROZEN_EPOCH;

  installAmbientGlobals();

  window.AlloModules = window.AlloModules || {};
  const src = readFileSync(resolve(process.cwd(), 'behavior_lens_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();

  _BehaviorLens = window.AlloModules.BehaviorLens;
  if (typeof _BehaviorLens !== 'function') {
    throw new Error('Harness setup failed: BehaviorLens did not register on window.AlloModules');
  }
  _loaded = true;
  return api();
}

// Translation stub. With no languagePack/UI_STRINGS loaded, the real t()
// resolves every key to undefined and the codebase's `t(key) || 'English'`
// and `t(key) || []` patterns supply the value. The real t() signature is
// t(keyString, params) where the 2nd arg is an OPTIONS object (interpolation
// vars, { returnObjects: true }, …) — NOT a fallback. So only echo a string
// 2nd arg (legacy fallback convention); never return an options object, which
// would poison `t('codenames.adjectives', { returnObjects: true }) || []`
// (a truthy non-array that can't .map).
const passthroughT = (key, arg) => (typeof arg === 'string' ? arg : undefined);

/**
 * Default prop set producing a stable, populated Hub render. Matches the prop
 * shape destructured at behavior_lens_module.js:23625-23640. Setters are
 * no-ops, callbacks are no-ops, translation is passthrough.
 *
 * Override any field by passing a partial overrides object.
 */
export function baseProps(overrides) {
  const base = {
    onClose: noop,
    callGemini: async () => '',
    callGeminiVision: async () => '',
    addToast: noop,
    t: passthroughT,
    studentNickname: '',
    dashboardData: null,
    isTeacherMode: false,
    alloBotRef: { current: null },
    firestore: null,
    firebaseAuth: null,
    isCanvasEnv: true,  // pilot default — Lisa runs AlloFlow inside Gemini Canvas
  };
  return Object.assign(base, overrides || {});
}

/**
 * Reset jsdom localStorage between renders so each snapshot starts from a
 * known state. Sets the active-profile key to a deterministic value so the
 * Hub's per-profile scoping logic resolves consistently.
 */
export function resetStorage(activeProfileId) {
  try {
    localStorage.clear();
    if (activeProfileId) localStorage.setItem('alloActiveProfileId', activeProfileId);
  } catch (e) { /* jsdom localStorage not available — leave as-is */ }
}

function scrub(html) {
  return html
    .split('><').join('>\n<')                              // one tag per line for readable diffs
    .split(String(FROZEN_EPOCH)).join('<TS>');             // normalize frozen epoch if it leaks into ids
}

/**
 * SSR-render the BehaviorLens Hub with a given prop config. Returns scrubbed,
 * line-oriented HTML suitable for snapshotting.
 */
export function renderHub(propsOverrides, opts) {
  if (!_loaded) setupBehaviorLens();
  const profileId = (opts && opts.activeProfileId) || 'test-profile-1';
  resetStorage(profileId);
  const props = baseProps(propsOverrides);
  return scrub(ReactDOMServer.renderToStaticMarkup(React.createElement(_BehaviorLens, props)));
}

/**
 * The matrix of prop configurations covered by the v1 golden master. Each
 * entry is a {label, propsOverrides} pair. Label flows into the snapshot
 * test name. Keep this list small + meaningful — every entry locks one
 * dimension of refactor freedom.
 */
export const PROP_MATRIX = [
  { label: 'default — Canvas iframe, no student, no teacher mode',
    propsOverrides: {} },
  { label: 'teacher mode in Canvas iframe',
    propsOverrides: { isTeacherMode: true } },
  { label: 'standalone (non-Canvas) — cloud-sync path enabled',
    propsOverrides: { isCanvasEnv: false } },
  { label: 'with studentNickname set',
    propsOverrides: { studentNickname: 'Eagle' } },
  { label: 'teacher mode + standalone + named student',
    propsOverrides: { isTeacherMode: true, isCanvasEnv: false, studentNickname: 'Eagle' } },
  { label: 'with dashboardData populated',
    propsOverrides: { dashboardData: { students: ['Eagle', 'Falcon', 'Hawk'], lastUpdate: '<TS>' } } },
];

function api() {
  return {
    React, ReactDOMServer,
    BehaviorLens: _BehaviorLens,
    baseProps, renderHub, resetStorage, PROP_MATRIX,
  };
}
