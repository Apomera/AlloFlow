// REGRESSION GUARD for the "seed-bucket-then-return-<Loading>-before-hooks" bug
// (a Rules-of-Hooks violation). Several STEM tools gate their body behind
//   if (!ctx.toolData.<bucket>) { ctx.setToolData(seed); return <Loading…> }
// and then call React hooks (useState/useRef/useEffect) AFTER that early return.
// Because the bucket isn't persisted, it's empty on first render → the gate
// returns Loading with 0 hooks; the seed triggers a re-render that runs N hooks →
// React throws "Rendered more hooks than during the previous render" and the tool
// CRASHES on first open. It's invisible to the other gates: SSR / check_stem_render
// render once (just the placeholder), and the e2e uses a mock React with no hook
// enforcement. throwlab, opticsLab, playlab, skatelab, and statsLab all had it.
//
// This guard mount-renders EVERY stem_tool through a wrapper that owns toolData as
// real state (so the Loading→ready transition actually happens) and fails if any
// tool throws the more-hooks error. The fix is always: seed defaults WITHOUT
// early-returning and read state via a local `d = ctx.toolData.<bucket> || DEFAULTS`.

import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

// jsdom shims so tool effects don't throw for unrelated reasons (those are ignored
// anyway — this guard only asserts on the more-hooks signature).
const _no = function () {};
const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
global.ResizeObserver = window.ResizeObserver = function () { return { observe: _no, unobserve: _no, disconnect: _no }; };
global.IntersectionObserver = window.IntersectionObserver = function () { return { observe: _no, unobserve: _no, disconnect: _no }; };
if (!window.matchMedia) global.matchMedia = window.matchMedia = function () { return { matches: false, addEventListener: _no, removeEventListener: _no, addListener: _no, removeListener: _no }; };

function mountCtx(toolData, setToolData) {
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  return { React, toolData, setToolData, update: _no, updateMulti: _no, setStemLabTool: _no,
    setStemLabTab: _no, setToolSnapshots: _no, addToast: _no, announceToSR: _no, awardXP: _no,
    beep: _no, celebrate: _no, canvasNarrate: _no, canvasA11yDesc: _no, callGemini: null,
    callTTS: null, callImagen: null, gradeLevel: '5th Grade', stemLabTab: 'explore', stemLabTool: null,
    toolSnapshots: [], props: {}, srOnly: {}, a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
    icons: Icons, t: (k, f) => f || k, tryAward: _no, getXP: () => 0 };
}

const files = readdirSync('stem_lab').filter(f => /^stem_tool_.*\.js$/.test(f) && !f.endsWith('.bak'));
const HOOKS_ERR = /more hooks|Rendered more hooks|change in the order of Hooks|Rendered fewer hooks/i;

describe('STEM tools — no Loading-gate Rules-of-Hooks crash', () => {
  it('every tool survives the empty→seeded (Loading→ready) mount transition', () => {
    const offenders = [];
    for (const file of files) {
      resetStemLab();
      try { loadTool('stem_lab/' + file, null); } catch (_) { /* null id lookup throws after registration */ }
      let ids = [];
      try { ids = Object.keys(window.StemLab._registry); } catch (_) {}
      for (const id of ids) {
        const cfg = window.StemLab._registry[id];
        if (!cfg || typeof cfg.render !== 'function') continue;
        const host = document.createElement('div'); document.body.appendChild(host);
        const root = ReactDOMClient.createRoot(host);
        let err = null;
        function Harness() { const s = React.useState({}); return cfg.render(mountCtx(s[0], s[1])); }
        try { act(() => { root.render(React.createElement(Harness)); }); }
        catch (e) { err = (e && e.message) || String(e); }
        try { act(() => root.unmount()); } catch (_) {}
        host.remove();
        if (err && HOOKS_ERR.test(err)) offenders.push(file + ' [' + id + ']');
      }
    }
    // Each offender must move its hooks above the Loading-gate, or (the standard
    // fix) seed defaults without early-returning. See the header.
    expect(offenders).toEqual([]);
  }, 120000);
});
