// Live-mount gate for the STEM fullscreen buttons added in the 2026-09-15 sweep.
//
// WHY A LIVE MOUNT AND NOT SSR: renderToStaticMarkup never invokes refs or runs
// effects, so under SSR a fullscreen button renders whether or not its ref, its
// effect, and its click handler are wired to anything. Every defect this sweep
// could plausibly introduce — a ref that never attaches, a handler that throws,
// a label that never changes — is invisible to the SSR harness that covers the
// rest of the lab. So this mounts for real with ReactDOMClient + act, clicks the
// button, and asserts the element the helper received is the STAGE (canvas plus
// its controls), not the bare canvas.
//
// The assertion that matters pedagogically: fullscreen must not strand the
// learner in a picture with no controls, and the button must say which state it
// is in, so a screen-reader user can tell fullscreen is on.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  loadTool, makeCtx, newStore, resetStemLab, React, ReactDOMClient,
} from './helpers/stem_widgets_smoke_harness.js';
import { installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

// React 18 ships act on the React package itself; the harness resolves React
// out of desktop/web-app/node_modules, so take act from that same instance
// rather than importing 'react-dom/test-utils' (not resolvable from the repo root).
const act = React.unstable_act || React.act;

// Each entry: the tool, the id it registers, the data attribute its stage
// carries, and any toolData needed to reveal the canvas. Several tools keep the
// visual behind a tab or a collapsed section, so without `seed` the button is
// simply not in the tree and the assertions would be testing nothing.
const CASES = [
  { file: 'stem_lab/stem_tool_heatlab.js', id: 'heatLab', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_graphcalc.js', id: 'graphCalc', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_algebracas.js', id: 'algebraCAS', stage: 'data-allo-fs-stage', seed: { algebraCAS: { tab: 'scale' } } },
  { file: 'stem_lab/stem_tool_areamodel.js', id: 'areamodel', stage: 'data-allo-fs-stage', seed: { _areamodel: { showAreaPatterns: true } } },
  // funcGrapher renders a 'Loading...' placeholder until its state exists, so
  // the seed is what makes the real body (and the Function Zoo) render at all.
  { file: 'stem_lab/stem_tool_funcgrapher.js', id: 'funcGrapher', stage: 'data-allo-fs-stage', seed: { funcGrapher: { type: 'linear', a: 1, b: 0, c: 0, traceX: 0 } } },
  { file: 'stem_lab/stem_tool_unitconvert.js', id: 'unitConvert', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_printlab.js', id: 'printLab', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_numberline.js', id: 'numberline', stage: 'data-allo-fs-stage', seed: { _numberline: { showIntegerLab: true } } },
  { file: 'stem_lab/stem_tool_logiclab.js', id: 'logicLab', stage: 'data-allo-fs-stage', seed: { logicLab: { showTruthLab: true } } },
  { file: 'stem_lab/stem_tool_coding.js', id: 'codingPlayground', stage: 'data-allo-fs-stage' },
  // cityLab keeps its 3D board in local useState, so no toolData seed can reach
  // it; the view has to be switched the way a student switches it.
  { file: 'stem_lab/stem_tool_citylab.js', id: 'cityLab', stage: 'data-allo-fs-stage', reveal: /show the map by 3d/i },
  { file: 'stem_lab/stem_tool_consciousness.js', id: 'consciousnessLab', stage: 'data-allo-fs-stage', seed: { consciousnessLab: { activeView: 'bench' } } },
  { file: 'stem_lab/stem_tool_climateExplorer.js', id: 'climateExplorer', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_epidemic.js', id: 'epidemicSim', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_skatelab.js', id: 'skatelab', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_semiconductor.js', id: 'semiconductor', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_playlab.js', id: 'playlab', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_music.js', id: 'musicSynth', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_wave.js', id: 'wave', stage: 'data-allo-fs-stage', seed: { wave: { frequency: 2, amplitude: 50, waveType: 'sine', amplitude2: 30, frequency2: 3, phase2: 0, harmonic: 1 } } },
  { file: 'stem_lab/stem_tool_universe.js', id: 'universe', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_fractions.js', id: 'fractions', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_nuclearlab.js', id: 'nuclearLab', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_economicslab.js', id: 'economicsLab', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_singing.js', id: 'singing', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_moonmission.js', id: 'moonMission', stage: 'data-allo-fs-stage' },
  { file: 'stem_lab/stem_tool_money.js', id: 'moneyMath', stage: 'data-allo-fs-stage', seed: { _moneyMath: { tab: 'inquiry', showDollarLab: true } } },
  { file: 'stem_lab/stem_tool_manipulatives.js', id: 'base10', stage: 'data-allo-fs-stage', seed: { _manipulatives: { b10Solid: true } } },
  // The scene view only exists once a student has picked a scene.
  { file: 'stem_lab/stem_tool_decomposer.js', id: 'decomposer', stage: 'data-allo-fs-stage', seed: { decomposer: { tab: 'scenes', activeScene: 'kitchen' } } },
];

// Roughly half the STEM tools declare no React hooks and cannot re-render a
// label from state, so they bind their button through the host's
// __alloStemFsBind. Load the REAL implementation out of stem_lab_module.js
// rather than restating it here: a stub would let the shipped helper rot while
// this suite stayed green.
function installRealBinder() {
  const host = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
  const start = host.indexOf('window.__alloStemFsBind = function (btn, stage) {');
  if (start < 0) throw new Error('__alloStemFsBind not found in stem_lab_module.js');
  const open = host.indexOf('{', host.indexOf('function (btn, stage)'));
  let depth = 0; let end = open;
  for (let i = open; i < host.length; i += 1) {
    if (host[i] === '{') depth += 1;
    else if (host[i] === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  const body = host.slice(host.indexOf('function (btn, stage)', start), end);
  // eslint-disable-next-line no-new-func
  window.__alloStemFsBind = new Function('return (' + body + ');')();
}

// Some tools already said "full screen" (two words) in their own copy; the
// button is the same affordance, so match both rather than reword good text.
const FS_LABEL = /full\s?screen/i;

let fsCalls = [];
let container = null;
let root = null;

beforeEach(() => {
  // jsdom has no canvas backend: getContext returns null and the draw effects
  // these tools run on mount would crash before the button is ever clicked.
  installCanvasStub();
  // jsdom ships no ResizeObserver, and several tools observe their stage from a
  // canvas ref callback. Without this the ref throws on mount and React unmounts
  // the subtree, so the button under test is simply not there.
  if (typeof window.ResizeObserver !== 'function') {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    globalThis.ResizeObserver = window.ResizeObserver;
  }
  resetStemLab();
  fsCalls = [];
  // Stand in for the real helper in stem_lab_module.js and record what it got.
  // Mirrors the real one's observable contract: it stamps the marker attribute
  // the tools watch, which is how their button label stays honest.
  window.__alloStemFS = (el) => {
    fsCalls.push(el);
    if (!el) return;
    if (el.hasAttribute('data-allo-fullscreen-active')) el.removeAttribute('data-allo-fullscreen-active');
    else el.setAttribute('data-allo-fullscreen-active', 'true');
  };
  installRealBinder();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  container?.remove();
  container = null;
  delete window.__alloStemFS;
  delete window.__alloStemFsBind;
  vi.restoreAllMocks();
});

function mount(toolId, seed, reveal) {
  const cfg = window.StemLab._registry[toolId];
  const store = newStore(seed || {});
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const Comp = () => cfg.render(ctx);
  root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(Comp)));
  if (reveal) {
    const opener = [...container.querySelectorAll('button')]
      .find((b) => reveal.test(b.getAttribute('aria-label') || b.textContent || ''));
    if (!opener) throw new Error('reveal control not found for ' + toolId + ': ' + reveal);
    act(() => { opener.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  }
  return container;
}

describe('STEM fullscreen buttons are live, labelled, and fill with a usable stage', () => {
  CASES.forEach(({ file, id, stage, seed, reveal }) => {
    describe(id, () => {
      beforeEach(() => { loadTool(file, id); });

      it('renders exactly one fullscreen button, and it is reachable', () => {
        const el = mount(id, seed, reveal);
        const btns = [...el.querySelectorAll('button')].filter((b) => FS_LABEL.test(b.getAttribute('aria-label') || ''));
        expect(btns.length).toBe(1);
        expect(btns[0].getAttribute('type')).toBe('button');
        // The glyph is decorative; the accessible name must carry the meaning.
        expect((btns[0].getAttribute('aria-label') || '').length).toBeGreaterThan(8);
      });

      it('hands the helper the STAGE, not the bare canvas, so controls survive', () => {
        const el = mount(id, seed, reveal);
        const btn = [...el.querySelectorAll('button')].find((b) => FS_LABEL.test(b.getAttribute('aria-label') || ''));
        act(() => { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

        expect(fsCalls.length).toBe(1);
        const target = fsCalls[0];
        expect(target, 'fullscreen button fired with a null element: the ref never attached').toBeTruthy();
        expect(target.tagName).not.toBe('CANVAS');
        expect(target.hasAttribute(stage)).toBe(true);
        // The whole point: the stage the helper fills still contains the drawing
        // surface. Tools that mount a host 3D viewer (makeOrbitViewer /
        // makeBayViewer) hand it a plain div and the canvas is created later by
        // three.js, so accept either - what must never happen is the stage being
        // the drawing surface itself, which the assertions above pin.
        expect(target.querySelector('canvas') || target.querySelector('div')).toBeTruthy();
      });

      it('reflects fullscreen state in the button so AT users can tell', async () => {
        const el = mount(id, seed, reveal);
        const find = () => [...el.querySelectorAll('button')].find((b) => FS_LABEL.test(b.getAttribute('aria-label') || ''));
        const before = find().getAttribute('aria-label');
        expect(find().getAttribute('aria-pressed')).toBe('false');

        // MutationObserver callbacks are delivered as microtasks, so the state
        // update lands after the click's act() scope. Flush a microtask turn.
        await act(async () => { find().dispatchEvent(new MouseEvent('click', { bubbles: true })); });

        expect(find().getAttribute('aria-pressed')).toBe('true');
        expect(find().getAttribute('aria-label')).not.toBe(before);
      });
    });
  });
});

// A repo-wide guard, not a per-tool one. Twice in this sweep the fullscreen copy
// called the wrong i18n helper for its tool - `__alloT` in a tool that defines
// only `t`, and `t` in a tool that defines only `__alloT`. Both are a
// ReferenceError that kills the whole tool the moment that branch renders, and
// neither is visible to a syntax check or to any test that does not render that
// exact subtree. This catches the class across every tool at once, including the
// ones whose canvas sits behind a tab no test has a seed for.
describe('fullscreen copy calls an i18n helper its tool actually defines', () => {
  const dir = 'stem_lab';
  const files = readdirSync(dir).filter((f) => /^stem_tool_.*\.js$/.test(f));
  const touched = files.filter((f) => /data-allo-fs-stage|__alloStemFS\(/.test(readFileSync(dir + '/' + f, 'utf8')));

  it('finds the tools this sweep touched', () => {
    // Floor: if this hits zero the detection broke and the loop below is vacuous.
    expect(touched.length).toBeGreaterThanOrEqual(15);
  });

  touched.forEach((file) => {
    it(file + ' resolves its fullscreen label helper', () => {
      const src = readFileSync(dir + '/' + file, 'utf8');
      const definesAlloT = /var __alloT = function/.test(src);
      const definesT = /var t = function|var t = ctx\.t|const t = ctx\.t|var t = \(?ctx\.t/.test(src);
      // Read the identifier in FRONT of each fullscreen label call rather than
      // testing with a lookbehind. An earlier version of this line carried a
      // literal backspace inside the pattern (a backslash-b that the shell turned into
      // the control character), so it matched nothing and the guard passed every
      // tool for free. Reading the receiver is both what the test is actually
      // about and impossible to break that quietly.
      const receivers = [];
      var __fsCallRe = /([A-Za-z_$][A-Za-z0-9_$]*)\('stem\.[^']*(?:enter|exit)_fullscreen/g;
      var __fsM;
      while ((__fsM = __fsCallRe.exec(src)) !== null) receivers.push(__fsM[1]);
      const callsT = receivers.indexOf('t') !== -1;
      const callsAlloT = receivers.indexOf('__alloT') !== -1;
      if (callsAlloT) expect(definesAlloT, file + ' calls __alloT but never defines it').toBe(true);
      if (callsT) expect(definesT, file + ' calls t() but never defines it').toBe(true);
    });
  });
});

// Structural cover for the stages a jsdom mount cannot reach. Five tools put their
// fullscreen stage behind a real three.js context (threeLoaded / engine === 'ready'
// / window.THREE), which the harness deliberately never loads, so the live cases
// above cannot click them. They are still held to the same contract: a stage, a
// button wired to it, an accessible name that changes with state, and aria-pressed.
// Without this they would be the only fullscreen buttons in the lab with no gate
// at all - exactly how the original dead-button bug survived three reports.
describe('THREE-gated stages still satisfy the fullscreen contract', () => {
  const CASES = ['arccity', 'echotrainer', 'magnetism', 'molecule', 'probability', 'spaceexplorer', 'titration', 'fireecology', 'weldlab', 'dinolab'];

  CASES.forEach((name) => {
    it('stem_tool_' + name + '.js declares a wired, labelled stage', () => {
      const src = readFileSync('stem_lab/stem_tool_' + name + '.js', 'utf8');
      expect(src, 'no fullscreen stage').toContain('data-allo-fs-stage');
      // Either flavour is fine, but one of them must be present: the hookless
      // binder, or a direct __alloStemFS call from a hook-driven button.
      const wired = /__alloStemFsBind\(/.test(src) || /__alloStemFS\(/.test(src);
      expect(wired, 'stage is never handed to the helper').toBe(true);
      const labelled = /(?:enter|exit)_fullscreen/.test(src)
        || (/data-fs-in/.test(src) && /data-fs-out/.test(src))
        || (/Exit fullscreen/i.test(src) && /fullscreen/i.test(src))
        // dinoLab calls it "Focus model" / "Exit focus view" - a better name for
        // what it does than "fullscreen", and renaming good copy to satisfy a
        // matcher would be the test wagging the tool.
        || (/Exit focus view/i.test(src) && /Focus model/i.test(src));
      expect(labelled, 'no state-dependent fullscreen label').toBe(true);
      expect(src).toContain('aria-pressed');
    });
  });
});
