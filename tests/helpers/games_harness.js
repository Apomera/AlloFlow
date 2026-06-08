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
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');

export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

if (!window.React) window.React = React;
if (!globalThis.React) globalThis.React = React;

// Deterministic, non-mutating shuffle stand-in (stable for snapshots).
if (typeof window.fisherYatesShuffle !== 'function') {
  window.fisherYatesShuffle = (arr) => (Array.isArray(arr) ? arr.slice() : arr);
}

// games_module.js (like its sibling CDN modules) resolves a couple of
// identifiers from the global scope at runtime — the "script-tag injection"
// pattern the host satisfies: window.AlloIcons is populated
// (AlloFlowANTI.txt:4298) and a global `t` translation shim routes to
// window.__alloT (:14768). setup.js already stubs warnLog/debugLog the same
// way. We provide faithful stand-ins so SSR resolves them instead of throwing
// ReferenceError:
//   • t — global translation shim; identity-on-key (no translation pack
//         loaded), matching the host shim's untranslated fallback. (Most game
//         labels come from the per-component `const {t}=useContext` context
//         default; this covers the few module-scope bare-`t` references.)
//   • X — the lucide close icon. The build's icon auto-detector skips the
//         single-letter name, so unlike every other icon (aliased from
//         window.AlloIcons with a null fallback) it stays a bare global.
const _iconStub = () => React.createElement('span', { 'aria-hidden': 'true' });
if (typeof globalThis.t !== 'function') { globalThis.t = (k) => k; window.t = globalThis.t; }
if (typeof globalThis.X === 'undefined') { globalThis.X = _iconStub; window.X = _iconStub; }

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
