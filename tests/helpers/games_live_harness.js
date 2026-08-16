// Live-mount harness for the games bundle.
//
// tests/helpers/games_harness.js renders the FIRST synchronous frame only
// (renderToStaticMarkup), so effects never run: a crossword mounted through it
// has an empty grid and a word scramble has no tiles. Every interesting
// behaviour in those two games lives in a useEffect, which is precisely why
// the Latin-1 letter filter survived so long without a test noticing.
//
// This harness mounts with react-dom/client inside vitest's jsdom and flushes
// effects through act(), so the grid is really laid out and the tiles really
// exist. It also exposes the pure text helpers the components share.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const TestUtils = require(resolve(MODULES_DIR, 'react-dom/test-utils'));
export const act = React.act || TestUtils.act;

if (!window.React) window.React = React;
if (!globalThis.React) globalThis.React = React;
if (typeof window.fisherYatesShuffle !== 'function') {
  // Deterministic: the crossword placement walks this, and a real shuffle
  // would make the layout assertions flap.
  window.fisherYatesShuffle = (arr) => (Array.isArray(arr) ? arr.slice() : arr);
}
if (typeof globalThis.t !== 'function') { globalThis.t = (k) => k; window.t = globalThis.t; }
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let _loaded = false;
export function loadGames() {
  if (_loaded) return;
  const src = readFileSync(resolve(process.cwd(), 'games_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
  _loaded = true;
}

export function utils() {
  loadGames();
  const u = window.AlloModules && window.AlloModules.GameTextUtils;
  if (!u) throw new Error('games_live_harness: GameTextUtils not registered');
  return u;
}

/**
 * Mount a registered game, flush effects, and hand back the live container
 * plus an unmount. Caller is responsible for calling unmount().
 */
export function mountGame(name, props) {
  loadGames();
  const Component = window.AlloModules && window.AlloModules[name];
  if (!Component) throw new Error('games_live_harness: "' + name + '" not registered');
  const container = document.createElement('div');
  // The dark-mode remap layer is scoped to `.theme-dark .allo-docsuite`, so
  // anything measuring theme behaviour needs both classes in the ancestry.
  container.className = 'allo-docsuite';
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => { root.render(React.createElement(Component, props || {})); });
  return {
    container,
    unmount: () => {
      act(() => { root.unmount(); });
      container.remove();
    },
    rerender: (nextProps) => {
      act(() => { root.render(React.createElement(Component, nextProps || {})); });
    }
  };
}
