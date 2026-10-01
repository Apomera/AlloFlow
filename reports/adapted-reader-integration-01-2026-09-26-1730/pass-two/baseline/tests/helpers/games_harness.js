// Render-smoke harness for the 21 game components in games_module.js
// (each registered on window.AlloModules.<Name> by _build_games_module.js).
// Mirrors tests/helpers/stem_widgets_smoke_harness.js.
//
// games_module.js reads only two things off window that aren't self-defaulting:
//   • window.React  (hooks) — required
//   • window.fisherYatesShuffle — used by several games; if undefined a game
//     that shuffles on first render throws. We inject a DETERMINISTIC
//     identity-copy (the real host impl uses Math.random, which would make
//     snapshots drift). Everything else games reads (AlloIcons,
//     AlloLanguageContext, getGlobalAudioContext, __alloWarnLog) already
//     self-defaults inside the IIFE, so no stubs are needed for those.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

if (!window.React) window.React = React;
if (!globalThis.React) globalThis.React = React;

// Deterministic, non-mutating shuffle stand-in (stable for snapshots).
if (typeof window.fisherYatesShuffle !== 'function') {
  window.fisherYatesShuffle = (arr) => (Array.isArray(arr) ? arr.slice() : arr);
}

// games_module.js references a global `t` translation shim that the host
// provides from global scope at runtime — the "script-tag injection" pattern
// setup.js documents for warnLog/debugLog (the host's `t` routes to
// window.__alloT, AlloFlowANTI.txt:14768). We stub it as identity-on-key,
// matching the host shim's untranslated fallback, so SSR resolves it instead
// of throwing ReferenceError. (Most game labels come from the per-component
// `const {t}=useContext` context default; this covers the few module-scope
// bare-`t` references.)
//
// We deliberately do NOT stub the lucide close icon `X`: the build now
// self-aliases it from window.AlloIcons like every other icon
// (_build_games_module.js), so the module supplies its own null fallback. By
// not masking X here, this golden master also guards that the build keeps
// aliasing it — a regression would resurface as a ReferenceError.
if (typeof globalThis.t !== 'function') { globalThis.t = (k) => k; window.t = globalThis.t; }

let _loaded = false;

/** Load the games bundle IIFE once against the shared jsdom window. */
export function loadGames() {
  if (_loaded) return;
  const src = readFileSync(resolve(process.cwd(), 'games_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
  _loaded = true;
}

/** Resolve a registered game component by its window.AlloModules name. */
export function getGame(name) {
  const C = window.AlloModules && window.AlloModules[name];
  if (!C) {
    throw new Error(
      'games_harness: "' + name + '" not registered. Available: ' +
      Object.keys(window.AlloModules || {}).join(', ')
    );
  }
  return C;
}

/**
 * SSR-render a registered game by name with the given props. Returns the
 * static markup string; throws if the first synchronous render throws
 * (callers convert that to a per-game failure with context).
 */
export function renderGame(name, props) {
  const C = getGame(name);
  return ReactDOMServer.renderToStaticMarkup(React.createElement(C, props || {}));
}
