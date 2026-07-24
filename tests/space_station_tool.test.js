import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));
const axe = require(resolve(MODULES_DIR, 'axe-core'));

const TOOL_PATHS = [
  'stem_lab/stem_tool_spacestation.js',
  'desktop/web-app/public/stem_lab/stem_tool_spacestation.js',
];

// jsdom shims: no canvas 2D context, no rAF (animation loops must never advance)
const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const noop = () => {};
function mountCtx(toolData, setToolData) {
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });
  return {
    React, toolData, setToolData, update: noop, updateMulti: noop,
    setStemLabTool: noop, addToast: noop, announceToSR: noop, awardXP: noop,
    callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
    icons: Icons, t: (k, f) => (f != null ? f : k),
  };
}

// Stateful mount (mirrors stem_lab_module.js StemPluginBridge): the tool seeds
// its bucket via setToolData on first render, then re-renders its real body.
// `seed` lets each case pre-position the tool on a given tab/state.
function mountWithSeed(seed) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState(seed ? { spaceStation: seed } : {});
    return cfg.render(mountCtx(toolData, setToolData));
  }
  try {
    act(() => { root.render(React.createElement(Harness)); });
    return host.innerHTML;
  } finally {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  }
}

function mountLiveWithSeed(seed) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: seed });
    return cfg.render(mountCtx(toolData, setToolData));
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    host,
    cleanup() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}
const BASE = {
  tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0,
  interiorRoom: 'harmony', interiorDone: {}, interiorSeen: { harmony: true }, interiorChoices: {},
  interiorInspected: {}, interiorAttempts: {}, interiorDiscovery: null, interiorLog: [],
  interiorGuided: true, lowGImpulse: 10, lowGResult: null,
  researchStep: 0, researchFeedback: '', researchErrors: 0, maintenanceChecks: {}, maintenanceReading: null, interiorNotes: {},
  cabinStow: {}, cupolaTarget: 'day', cupolaCaptured: false, cupolaShutters: false, cupolaObservation: '',
  orbitAlt: 420, quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
  seenModules: {}, seenHours: {}, orbitTouched: false, quizBest: 0,
  askInput: '', askAnswer: '', askLoading: false,
};

describe('space station tool', () => {
  it('registers the plugin with quest hooks and all eight tabs', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("window.StemLab.registerTool('spaceStation'");
      expect(source).toContain('questHooks');
      // Eight tabs
      ['interior', 'map', 'day', 'systems', 'orbit', 'missions', 'history', 'quiz'].forEach((tabId) => {
        expect(source).toContain("id: '" + tabId + "'");
      });
      // Self-guarding module pattern
      expect(source).toContain("if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;");
    });
  });

  it('models the real station: 13 modules of accurate vintage and physics', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      const moduleIds = ['zarya', 'unity', 'zvezda', 'destiny', 'quest', 'harmony', 'columbus', 'kibo', 'tranquility', 'cupola', 'leonardo', 'nauka', 'truss'];
      moduleIds.forEach((id) => expect(source).toContain("id: '" + id + "'"));
      // Anchor facts kept accurate
      expect(source).toContain('Nov 20, 1998');            // Zarya launch
      expect(source).toContain('Nov 2, 2000');             // continuous habitation
      expect(source).toContain('7.66 km/s');               // orbital speed
      expect(source).toContain('98%');                     // water recovery milestone
      expect(source).toContain('Sabatier');                // CO2 -> water loop
      expect(source).toContain('Whipple');                 // debris shielding
      expect(source).toContain('Control Moment Gyroscopes');
      // Real orbital mechanics, not hardcoded outputs
      expect(source).toContain('var GM = 398600.4418');
      expect(source).toContain('Math.sqrt(GM / orbitR)');
      // Future plans stay hedged
      expect(source).toContain('Planned retirement');
      expect(source).toContain('Deorbit Vehicle');
    });
  });

  it('keeps the 3-D canvas accessible and self-cleaning', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('prefers-reduced-motion');
      expect(source).toContain("role: 'application'");
      expect(source).toContain('cv._issCleanup = cleanup');
      expect(source).toContain('if (!cv.isConnected) { cleanup(); return; }');
      // Module inspection works without the canvas (keyboard/AT path)
      expect(source).toContain("'aria-pressed': on");
      expect(source).toContain("role: 'tablist'");
    });
  });

  it('ships the docking sim, EVA game, and interior views with honest physics', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Missions tab exists
      expect(source).toContain("id: 'missions'");
      // Docking sim runs real Clohessy-Wiltshire coupling, toggleable for contrast
      expect(source).toContain('Clohessy-Wiltshire');
      expect(source).toContain('3 * N_ORBIT * N_ORBIT * st.x + 2 * N_ORBIT * st.vy');
      expect(source).toContain('-2 * N_ORBIT * st.vx');
      expect(source).toContain('exaggerated');            // time-scaling disclosed honestly
      expect(source).toContain('dockRealMode');
      // No per-frame React state: game state lives on the canvas element
      expect(source).toContain('cv._dockState = st');
      expect(source).toContain('cv._dockCleanup = cleanup');
      // EVA enforces the two-tether rule and consumables budget
      expect(source).toContain('Moved WITHOUT clipping ahead');
      expect(source).toContain('tetherA');
      expect(source).toContain('Suit consumables');
      // Interior views wired to their modules
      expect(source).toContain('renderCupolaInterior');
      expect(source).toContain('renderSleepInterior');
      expect(source).toContain("selModule.id === 'cupola' ? renderCupolaInterior()");
      // New quest hooks
      expect(source).toContain("id: 'iss_inside'");
      expect(source).toContain("id: 'iss_dock'");
      expect(source).toContain("id: 'iss_eva'");
      // Interior shift is interactive, responsive, and exposes hotspot learning
      expect(source).toContain('INTERIOR_ROOMS');
      expect(source).toContain('data-iss-interior');
      expect(source).toContain('iss-interior-layout');
      expect(source).toContain('chooseInterior');
      expect(source).toContain('data-iss-lowg-sim');
      expect(source).toContain('var speed = impulse / 70');
      expect(source).toContain('Learning guidance level');
      expect(source).toContain('interiorInspected');
      expect(source).toContain('data-iss-research-procedure');
      expect(source).toContain('data-iss-maintenance-console');
      expect(source).toContain('data-iss-crew-notebook');
      expect(source).toContain('data-iss-cabin-stow');
      expect(source).toContain('data-iss-cupola-observation');
    });
  });

  describe('mount smoke — every tab really renders', () => {
    beforeEach(() => {
      resetStemLab();
      loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
    });

    it('seeds its state bucket from empty and opens an interior crew shift', () => {
      const html = mountWithSeed(null);
      expect(html).toContain('Space Station');
      expect(html).toContain('Float inside. Work like an astronaut.');
      expect(html).toContain('Crew quarters');
      expect(html).toContain('Stow your sleep station');
    });

    it('renders research, maintenance, and low-g activities inside the station', () => {
      const research = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'destiny' });
      expect(research).toContain('Destiny laboratory');
      expect(research).toContain('plant-water experiment');
      expect(research).toContain('Secure the sample');
      expect(research).toContain('Prime the wick');
      expect(research).toContain('Start camera + baseline');
      const maintenance = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'tranquility' });
      expect(maintenance).toContain('Restore cabin airflow');
      expect(maintenance).toContain('clogged inlet filter');
      const lowG = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity' });
      expect(lowG).toContain('Low-g practice');
      expect(lowG).toContain('Push impulse');
      expect(lowG).toContain('Predicted speed');
      expect(lowG).toContain('Δv = impulse ÷ 70 kg');
    });

    it('turns Harmony morning life into a three-item freefall stow scan', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'harmony' });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        expect(live.host.textContent).toContain('0 / 3 secured');
        act(() => { findButton('Sleeping bag').click(); });
        expect(live.host.textContent).toContain('1 / 3 secured');
        act(() => { findButton('Crew tablet').click(); });
        act(() => { findButton('Damp washcloth').click(); });
        expect(live.host.textContent).toContain('Cabin clear');
        expect(live.host.textContent).toContain('Air return unobstructed');
        expect(live.host.textContent).toContain('1 / 5 jobs');
        expect(live.host.textContent).toContain('Crew attempts: 1 • first-try bonus earned');
      } finally {
        live.cleanup();
      }
    });

    it('runs a Cupola Earth-observation capture before shutter closeout', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'cupola' });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        expect(findButton('Close shutters').disabled).toBe(true);
        act(() => { findButton('Aurora curtain').click(); });
        expect(live.host.textContent).toContain('Low light • steady camera');
        act(() => { findButton('Capture image').click(); });
        expect(live.host.textContent).toContain('Aurora traces charged particles');
        expect(findButton('Close shutters').disabled).toBe(false);
        act(() => { findButton('Close shutters').click(); });
        expect(live.host.textContent).toContain('WINDOW SHUTTERS CLOSED');
        expect(live.host.textContent).toContain('1 / 5 jobs');
        expect(live.host.textContent).toContain('Observation logged and Cupola secure');
      } finally {
        live.cleanup();
      }
    });
    it('enforces the Destiny research sequence and persists the scientific result', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'destiny' });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        act(() => { findButton('Prime the wick').click(); });
        expect(live.host.textContent).toContain('Sequence hold: complete step 1');
        act(() => { findButton('Secure the sample').click(); });
        expect(live.host.textContent).toContain('Continue to step 2');
        act(() => { findButton('Prime the wick').click(); });
        expect(live.host.textContent).toContain('Continue to step 3');
        act(() => { findButton('Start camera + baseline').click(); });
        expect(live.host.textContent).toContain('1 / 5 jobs');
        expect(live.host.textContent).toContain('Baseline logged');
        expect(live.host.textContent).toContain('Science you used:');
        expect(live.host.textContent).toContain('Crew attempts: 2');
      } finally {
        live.cleanup();
      }
    });
    it('tracks inspected hotspots and lets learners remove guided support', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'harmony' });
      try {
        expect(live.host.textContent).toContain('Flight hint:');
        const independent = [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Independent'));
        act(() => { independent.click(); });
        expect(live.host.textContent).not.toContain('Flight hint:');
        const hotspot = [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Air return'));
        act(() => { hotspot.click(); });
        expect(live.host.textContent).toContain('1/10');
        expect(hotspot.textContent).toContain('✓ 🌬️ Air return');
        expect(live.host.textContent).toContain('Air does not rise or fall here.');
      } finally {
        live.cleanup();
      }
    });

    it('requires Tranquility telemetry evidence before maintenance and stabilizes CO₂', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'tranquility' });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        expect(findButton('clogged inlet filter').disabled).toBe(true);
        act(() => { findButton('Fan motor current').click(); });
        expect(live.host.textContent).toContain('motor is powered');
        act(() => { findButton('Inlet pressure drop').click(); });
        expect(findButton('clogged inlet filter').disabled).toBe(false);
        act(() => { findButton('clogged inlet filter').click(); });
        expect(live.host.textContent).toContain('Airflow restored.');
        expect(live.host.textContent).toContain('STABLE');
        expect(live.host.textContent).toContain('1 / 5 jobs');
      } finally {
        live.cleanup();
      }
    });

    it('persists an optional room-specific crew notebook observation', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'harmony' });
      try {
        const textarea = live.host.querySelector('[data-iss-crew-notebook] textarea');
        const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        act(() => {
          setValue.call(textarea, 'Airflow replaces natural convection in the cabin.');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(live.host.textContent).toContain('observation saved');
        expect(live.host.querySelector('[data-iss-crew-notebook] textarea').value).toContain('natural convection');
      } finally {
        live.cleanup();
      }
    });
    it('uses real impulse math to distinguish controlled and unsafe low-g pushes', () => {
      const controlled = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity', lowGImpulse: 10 });
      try {
        const push = [...controlled.host.querySelectorAll('button')].find((button) => button.textContent.includes('Push off and test'));
        act(() => { push.click(); });
        expect(controlled.host.textContent).toContain('Controlled arrival:');
        expect(controlled.host.textContent).toContain('0.14 m/s');
        expect(controlled.host.textContent).toContain('1 / 5 jobs');
        act(() => { push.click(); });
        expect(controlled.host.textContent).toContain('Crew attempts: 1 • first-try bonus earned');
      } finally {
        controlled.cleanup();
      }

      const unsafe = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity', lowGImpulse: 22 });
      try {
        const push = [...unsafe.host.querySelectorAll('button')].find((button) => button.textContent.includes('Push off and test'));
        act(() => { push.click(); });
        expect(unsafe.host.textContent).toContain('Flight result:');
        expect(unsafe.host.textContent).toContain('Approach too fast.');
        expect(unsafe.host.textContent).toContain('0 / 5 jobs');
      } finally {
        unsafe.cleanup();
      }
    });
    it('has no detectable structural accessibility violations in the interior shift', async () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity' });
      try {
        const results = await axe.run(live.host, {
          rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
        });
        expect(results.violations.map((violation) => violation.id)).toEqual([]);
      } finally {
        live.cleanup();
      }
    });
    it('renders learned feedback and a completed interior shift log', () => {
      const html = mountWithSeed({
        ...BASE, tab: 'interior', interiorRoom: 'cupola',
        interiorDone: { harmony: true, destiny: true, tranquility: true, unity: true, cupola: true },
        interiorChoices: { cupola: 'shutters' },
        interiorInspected: { 'harmony:0': true, 'destiny:0': true, 'tranquility:0': true, 'unity:0': true, 'cupola:0': true },
        interiorAttempts: { harmony: 1, destiny: 1, tranquility: 2, unity: 1, cupola: 1 },
        interiorLog: ['06:30 GMT — Stow your sleep station complete (first try)', '21:25 GMT — Secure the Cupola for sleep complete (first try)'],
        interiorNotes: { destiny: 'Capillary flow stayed contained.', tranquility: 'High pressure drop identified the blocked filter.' },
      });
      expect(html).toContain('5 / 5 jobs');
      expect(html).toContain('Science you used');
      expect(html).toContain('Shift complete');
      expect(html).toContain('Start another shift');
      expect(html).toContain('First try');
      expect(html).toContain('4/5');
      expect(html).toContain('5/10');
      expect(html).toContain('Notes');
      expect(html).toContain('2/5');
    });

    it('renders the Cupola interior and sleep-cabin interior when those modules are selected', () => {
      const cupola = mountWithSeed({ ...BASE, selModule: 'cupola' });
      expect(cupola).toContain('Inside the Cupola');
      expect(cupola).toContain('debris shutters');
      const cabin = mountWithSeed({ ...BASE, selModule: 'harmony' });
      expect(cabin).toContain('Inside a crew sleep cabin');
      expect(cabin).toContain('Sleeping bag');
    });

    it('renders A Day Aboard with the exercise WHY', () => {
      const html = mountWithSeed({ ...BASE, tab: 'day', dayIdx: 4 });
      expect(html).toContain('Exercise 1 of 2');
      expect(html).toContain('1-1.5%');
    });

    it('renders Systems with the air loop and design challenge', () => {
      const html = mountWithSeed({ ...BASE, tab: 'systems', sysIdx: 1 });
      expect(html).toContain('Air loop');
      expect(html).toContain('Sabatier');
      expect(html).toContain('Design challenge');
    });

    it('computes real orbital mechanics in the Orbit Lab', () => {
      const html = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250 });
      // v = sqrt(398600.4418 / 6621) = 7.76 km/s
      expect(html).toContain('7.76 km/s');
      expect(html).toContain('Severe drag');
      const high = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 1500 });
      expect(high).toContain('radiation');
    });

    it('renders both missions, including a started EVA and a docking report', () => {
      const html = mountWithSeed({
        ...BASE, tab: 'missions',
        dockResult: 'bonk', dockMsg: 'Contact too fast.', dockRuns: 2, dockWins: 1,
        eva: { pos: 6, tetherA: 6, tetherB: 6, freeTether: 'A', o2: 61, bolts: 4, done: true, failMsg: '', started: true, log: ['done'] },
      });
      expect(html).toContain('Dock the cargo capsule');
      expect(html).toContain('Mission report');
      expect(html).toContain('Pump worksite');
      expect(html).toContain('Pump secured');
      expect(html).toContain('Torque bolt');
    });

    it('renders History and a completed quiz debrief', () => {
      const history = mountWithSeed({ ...BASE, tab: 'history' });
      expect(history).toContain('Assembly to retirement');
      expect(history).toContain('Spot the Station');
      const quiz = mountWithSeed({ ...BASE, tab: 'quiz', quizDone: true, quizScore: 8, quizBest: 8 });
      expect(quiz).toContain('8 / 10');
      expect(quiz).toContain('Flight-controller material');
    });
  });

  it('is registered in the catalog, loader lists, and build manifest', () => {
    const moduleSrc = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(moduleSrc).toContain("id: 'spaceStation'");
    expect(moduleSrc).toContain('spaceStation: true');

    ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'build.js'].forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src, p + ' should load the space station tool').toContain("'stem_lab/stem_tool_spacestation.js'");
    });
  });
});
