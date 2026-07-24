// Symbol Studio golden-master harness.
//
// PURPOSE: a characterization (golden master) baseline for SymbolStudio — the
// ~7,700-line hand-maintained AAC god-component (symbol_studio_module.js) that
// this project plans to decompose. It pins the component's observable RENDER
// output for a fixed set of inputs so the internals can be refactored with a
// safety net: if a refactor changes what the component renders, the snapshot
// diff catches it.
//
// Mirrors tests/helpers/word_sounds_harness.js. Read-only — zero changes to the
// live module:
//   * load symbol_studio_module.js into the vitest+jsdom window via the same
//     `new Function(src)()` trick as tests/setup.js, with REAL React (from
//     desktop/web-app/node_modules) so the component can render.
//   * render with renderToStaticMarkup — exercises the RENDER phase (including
//     the crash-prone hook dependency arrays) but skips useEffect, so there is
//     no MutationObserver / audio / network / timer nondeterminism.
//   * Math.random and Date.now are frozen so snapshots are byte-stable (the
//     auto-created default profile's uid() is therefore deterministic too).
//
// Symbol Studio renders OUTSIDE the host's themed <main> and mirrors the host
// theme onto its own modal root (the theme-mirror added in the 2026-05-31 work).
// So we plant a <main id="main-content"> and set its class before each render to
// characterize the default / dark / high-contrast render paths.
//
// SCOPE / HONEST LIMITS: pins the render phase under a fixed stub env, not a live
// browser session. It does NOT exercise effects, the profile-switch reload,
// localStorage round-trips beyond the initial load, AI calls, or click handlers.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

// Real React 18 + its SSR renderer (react-dom resolves its own react from the
// same dir, so element identity matches React below).
export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const noop = () => {};
const FROZEN_EPOCH = 1700000000000;
const passthroughT = (key, fallback) => fallback || key;

let _loaded = false;
let _SymbolStudio = null;

// Globals Symbol Studio may reference. Most window.* couplings (AlloStudent,
// AlloFlowVoice, GardenBridge, speechSynthesis) are only touched in effects /
// handlers, not the render path; stubbed defensively so the IIFE loads cleanly.
function installAmbientGlobals() {
  window.AlloModules = window.AlloModules || {};
  const stubs = { React, AlloStudent: null, AlloFlowVoice: null, AlloIcons: {} };
  for (const k of Object.keys(stubs)) { window[k] = stubs[k]; globalThis[k] = stubs[k]; }
  if (typeof globalThis.warnLog !== 'function') globalThis.warnLog = noop;
}

function ensureMainContent() {
  let m = document.getElementById('main-content');
  if (!m) { m = document.createElement('main'); m.id = 'main-content'; document.body.appendChild(m); }
  return m;
}

// Symbol Studio reads `new Date().getHours()` at symbol_studio_module.js:6472
// (time-of-day greeting in the AAC quick-board), which bypasses any Date.now
// stub. Without freezing the Date CONSTRUCTOR too, snapshots drift every time
// the wall clock crosses a time bucket (9/12/14/16) and red-mark the suite for
// reasons unrelated to component changes. Stub by replacing the global Date
// with a thin wrapper class that always represents FROZEN_EPOCH for the
// no-arg construction path — and leaves all other call shapes intact (parsed
// strings, explicit epoch ms, etc.) so the rest of the module sees a real Date.
function freezeDate() {
  const RealDate = globalThis.Date;
  if (RealDate.__symbolStudioFrozen) return;
  const FrozenDate = function () {
    if (arguments.length === 0) return new RealDate(FROZEN_EPOCH);
    if (arguments.length === 1) return new RealDate(arguments[0]);
    if (arguments.length === 2) return new RealDate(arguments[0], arguments[1]);
    if (arguments.length === 3) return new RealDate(arguments[0], arguments[1], arguments[2]);
    if (arguments.length === 4) return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3]);
    if (arguments.length === 5) return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
    if (arguments.length === 6) return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
    return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]);
  };
  // Re-export the static methods + prototype so `Date.now()`, `Date.parse()`,
  // `Date.UTC()`, and instanceof checks keep working.
  FrozenDate.now = function () { return FROZEN_EPOCH; };
  FrozenDate.parse = RealDate.parse.bind(RealDate);
  FrozenDate.UTC = RealDate.UTC.bind(RealDate);
  FrozenDate.prototype = RealDate.prototype;
  FrozenDate.__symbolStudioFrozen = true;
  FrozenDate.__realDate = RealDate;
  globalThis.Date = FrozenDate;
  if (typeof window !== 'undefined') window.Date = FrozenDate;
}

/** Load SymbolStudio into the jsdom window with a deterministic environment. Idempotent. */
export function setupSymbolStudio() {
  if (_loaded) return api();

  globalThis.Math.random = () => 0.42;
  freezeDate();
  globalThis.Date.now = () => FROZEN_EPOCH;

  installAmbientGlobals();
  ensureMainContent();

  window.AlloModules = window.AlloModules || {};
  const src = readFileSync(resolve(process.cwd(), 'symbol_studio_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();

  _SymbolStudio = window.AlloModules.SymbolStudio;
  // SymbolStudio is React.memo(...), which is an object (not a function) — accept any
  // truthy renderable component type here.
  if (!_SymbolStudio) {
    throw new Error('Harness setup failed: SymbolStudio did not register on window.AlloModules');
  }
  _loaded = true;
  return api();
}

/** A complete, deterministic prop set that drives the modal to an open render. */
export function baseProps(overrides) {
  return Object.assign({
    isOpen: true, onClose: noop,
    onCallImagen: async () => null, onCallGeminiImageEdit: async () => null,
    onCallGemini: async () => '', onCallTTS: async () => null, onCallGeminiVision: async () => '',
    selectedVoice: 'Kore', onSetVoice: noop, geminiVoices: [], kokoroVoices: [],
    isCanvasEnv: false, addToast: noop, cloudSync: null, liveSession: null,
    dashboardData: null, setDashboardData: noop, selectedStudentId: null,
    t: passthroughT,
  }, overrides || {});
}

function scrub(html) {
  return html
    .split('><').join('>\n<')                    // one tag per line -> readable diffs
    .split(String(FROZEN_EPOCH)).join('<TS>');   // normalize frozen epoch if it leaks into ids
}

/**
 * SSR-render SymbolStudio under a chosen host theme.
 *   opts.theme : 'default' | 'dark' | 'contrast' (sets #main-content class the module mirrors)
 *   opts.tab   : optional tab id ('board'|'schedule'|'stories'|'quickboards'|'books'|'quest'|
 *                'search'|'garden') — seeds the opening tab via the module's initialTab prop so the
 *                non-default tabs can be characterized under SSR (clicks don't fire). Absent => 'symbols'.
 *   opts.props : prop overrides merged into baseProps
 * localStorage is cleared first so each render starts from the same (auto-created
 * default-profile) state. Returns scrubbed, line-oriented HTML for snapshotting.
 */
export function renderStudio(opts) {
  if (!_loaded) setupSymbolStudio();
  opts = opts || {};
  try { window.localStorage.clear(); } catch (e) {}
  const main = ensureMainContent();
  main.className = opts.theme === 'dark' ? 'theme-dark'
    : opts.theme === 'contrast' ? 'theme-contrast' : '';
  const props = baseProps(opts.props);
  if (opts.tab) props.initialTab = opts.tab; // seed the opening tab (deep-link seam) for per-tab snapshots
  return scrub(ReactDOMServer.renderToStaticMarkup(React.createElement(_SymbolStudio, props)));
}

function api() {
  return { React, ReactDOMServer, SymbolStudio: _SymbolStudio, renderStudio, baseProps, setupSymbolStudio };
}
