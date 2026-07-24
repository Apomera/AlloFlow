// Lumen render golden-master harness.
//
// Pins the RENDER phase of stem_lab/stem_tool_lumen.js (registered via
// window.StemLab.registerTool) under fixed, deterministic toolData states,
// using real React 18 + renderToStaticMarkup — the tests/helpers/dino_lab_harness.js
// pattern. Lumen's render uses only deterministic, data-seeded math
// (mulberry32 ← cyrb53; no Date.now / Math.random), so snapshots are byte-stable
// without freezing anything.
//
// HONEST LIMIT: this pins the RENDER phase under a fixed prop/state env, not a
// live browser session. Click/async handlers (Add observation, dial, Generate
// AI, Export, sign-off) run inside handlers and are NOT exercised here; their
// RESULTING render is pinned by feeding the equivalent state in via toolData
// (e.g. aiHyps, sourceRefs, showTable). ctx.callGemini is intentionally omitted
// so the AI affordances are inert and the render stays deterministic.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const noop = () => { };
let _cfg = null;

export function setupLumen() {
  if (_cfg) return _cfg;
  const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_lumen.js'), 'utf8');
  const captured = {};
  window.StemLab = { registerTool: (id, cfg) => { captured.id = id; captured.cfg = cfg; } };
  globalThis.StemLab = window.StemLab;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  if (!captured.cfg || typeof captured.cfg.render !== 'function') {
    throw new Error('Lumen harness: tool did not register a render function (anchor changed?).');
  }
  _cfg = captured.cfg;
  return _cfg;
}

function ctxFor(d) {
  // No ctx.callGemini -> the AI dial's network path is inert (deterministic render).
  return { React, toolData: { lumen: Object.assign({ mode: 'data' }, d || {}) }, update: noop, setToolData: noop, announceToSR: noop };
}

function scrub(html) { return html.split('><').join('>\n<'); } // one tag per line -> readable diffs

/** SSR-render the tool under a given toolData.lumen state. Returns scrubbed HTML. */
export function renderState(d) {
  setupLumen();
  return scrub(ReactDOMServer.renderToStaticMarkup(_cfg.render(ctxFor(d))));
}

/** Registration metadata (sans the render fn), for the contract test. */
export function meta() {
  const c = setupLumen();
  return { label: c.label, icon: c.icon, category: c.category, color: c.color, ready: c.ready };
}
