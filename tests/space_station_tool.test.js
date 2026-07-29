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
  tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0, sysStep: 0,
  interiorRoom: 'harmony', interiorDone: {}, interiorSeen: { harmony: true }, interiorChoices: {},
  interiorInspected: {}, interiorAttempts: {}, interiorDiscovery: null, interiorLog: [],
  interiorGuided: true, lowGImpulse: 10, lowGResult: null,
  researchStep: 0, researchFeedback: '', researchErrors: 0, maintenanceChecks: {}, maintenanceReading: null, interiorNotes: {},
  cabinStow: {}, cupolaTarget: 'day', cupolaCaptured: false, cupolaShutters: false, cupolaObservation: '',
  opsMode: 'integrated', opsScenario: 'nominal', opsOrbitMinute: 0, opsFocus: 'all', opsCrew: 7, opsResearch: 60, opsArrayAngle: 86, opsEclipse: 35, opsBattery: 76, opsRecovery: 98, opsScrub: 88, opsRadiator: 82, opsCooling: 86, opsCmg: 28, opsMissionDays: 180, opsExercise: 2.5, opsDebrisSize: 1, opsShieldGap: 10, opsDebrisSpeed: 12, opsEmergency: 'leak', opsEmergencyResult: '', opsRuns: 0, opsLog: [], assemblyIdx: 11,
  orbitAlt: 420, quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizResults: {},
  seenModules: {}, seenHours: {}, orbitTouched: false, quizBest: 0, mapView: 'overview', mapCutaway: false,
  askInput: '', askAnswer: '', askLoading: false,
};

describe('space station tool', () => {
  it('registers the plugin with quest hooks and all nine tabs', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("window.StemLab.registerTool('spaceStation'");
      expect(source).toContain('questHooks');
      // Nine tabs
      ['interior', 'operations', 'map', 'day', 'systems', 'orbit', 'missions', 'history', 'quiz'].forEach((tabId) => {
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
      expect(source).toContain('min-width:24px');
      expect(source).toContain('@media (forced-colors: active)');
      expect(source).toContain('@media (prefers-contrast: more)');
      expect(source).toContain('.iss-root *:before,.iss-root *:after');
      expect(source).toContain('.iss-root summary{min-height:24px}');
      expect(source).toContain('[aria-selected="true"]');
      expect(source).toContain('overflow:visible;border:1px solid rgba(125,211,252,.24)');
      expect(source).toContain('.iss-location-strip{flex-wrap:wrap;overflow-x:visible}');
      expect(source).toContain('.iss-status-strip{grid-template-columns:1fr}');
      expect(source).toContain('iss-quiz-answer-state');
      expect(source).toContain("role: 'application'");
      expect(source).toContain("'aria-describedby': 'iss-map-instructions iss-map-status iss-map-orientation'");
      expect(source).toContain("'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight + - Home'");
      expect(source).toContain("id: 'iss-map-status'");
      expect(source).toContain("upd({ mapView: 'overview' })");
      expect(source).toContain('cv._issCleanup = cleanup');
      expect(source).toContain('cameraTween');
      expect(source).toContain('cv._issCutaway');
      expect(source).toContain('data-iss-camera-view');
      expect(source).toContain('data-iss-module-marker');
      expect(source).toContain('data-iss-light-phase');
      expect(source).toContain('data-iss-focus-module');
      expect(source).toContain('cv._issFocusModule');
      expect(source).toContain('focusDistance');
      expect(source).toContain('data-iss-orientation-widget');
      expect(source).toContain("data-iss-axis': 'x'");
      expect(source).toContain('_axisOrigin');
      expect(source).toContain("cv.addEventListener('keydown', onKey)");
      // Touch parity: without touchAction the browser steals the drag for page
      // scrolling and drag-to-rotate is dead on touchscreen Chromebooks. And
      // pointercancel must clear `dragging`, or the idle auto-rotation (gated on
      // !dragging) freezes for the rest of the session.
      expect(source).toContain("cv.style.touchAction = 'none'");
      expect(source).toContain("window.addEventListener('pointercancel', onUp)");
      expect(source).toContain("window.removeEventListener('pointercancel', onUp)");
      expect(source).toContain('moduleDetails');
      expect(source).toContain('trussBraceMat');
      expect(source).toContain('if (!cv.isConnected) { cleanup(); return; }');
      // Module inspection works without the canvas (keyboard/AT path)
      expect(source).toContain("'aria-pressed': on");
      expect(source).toContain("role: 'tablist'");
    });
  });

  // jsdom has no WebGL, so the render pipeline can only be pinned at the source
  // level — the same way the canvas contract above is pinned. These guard the
  // three things a future edit could silently drop with no test going red.
  it('keeps the 3-D render pipeline guarded, kill-switchable, and idle-cheap', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Bloom rides the renderer and stays opt-out-able platform-wide.
      expect(source).toContain('renderer._alloComposer');
      expect(source).toContain('window.AlloPostFXEnabled === false');
      // Never let a post-FX failure blank the station.
      expect(source).toContain('else renderer.render(scene, camera);');
      // Composer must track canvas resizes or bloom detaches from the viewport.
      expect(source).toContain('composer.setSize(');
      // Reduced motion must not redraw an identical frame forever.
      expect(source).toContain('_lastFrameSig');
      expect(source).toContain('tick % 120 !== 0');
      // Sun-glint decomposes one quaternion per wing, not per panel.
      expect(source).toContain('wingPanelMats');
      expect(source).not.toContain('panelMats[pi].wing');
      // Canadarm2's booms must grow from a SHARED elbow. They previously had
      // independently-set centres, so their ends never met and the arm drew as
      // two disconnected sticks. Pin the derivation, and that the old
      // free-floating literal position is gone.
      expect(source).toContain('arm1.position.copy(armBase.clone().add(armAxis1');
      expect(source).toContain('arm2.position.copy(armElbow.clone().add(armAxis2');
      expect(source).not.toContain('arm2.position.set(1.7, 1.25');
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
      expect(source).toContain("'data-dock-hud': 'true'");
      expect(source).toContain("'aria-describedby': 'iss-dock-instructions iss-dock-status'");
      expect(source).toContain('function holdKey(on)');
      expect(source).toContain('onPointerCancel: press(false)');
      expect(source).toContain('onKeyDown: holdKey(true)');
      expect(source).toContain('function clearThrust()');
      expect(source).toContain("window.addEventListener('blur', clearThrust)");
      expect(source).toContain('st.trail');
      expect(source).toContain('predictStep');
      expect(source).toContain('BRAKING DISTANCE');
      expect(source).toContain('PROXIMITY ×');
      expect(source).toContain('STOP MARGIN');
      expect(source).toContain('TOTAL RATE');
      expect(source).toContain('milestones.m15');
      expect(source).toContain('renderDockDebrief');
      expect(source).toContain('POST-APPROACH FLIGHT DATA');
      expect(source).toContain('data-iss-dock-debrief');
      // EVA enforces the two-tether rule and consumables budget
      expect(source).toContain('Moved WITHOUT clipping ahead');
      expect(source).toContain('tetherA');
      expect(source).toContain('Suit consumables');
      expect(source).toContain('SUIT BUDGET');
      expect(source).toContain('reserveFloor = 15');
      expect(source).toContain('RESERVE BREACH');
      expect(source).toContain('data-iss-eva-phase');
      expect(source).toContain("phaseSteps = ['AIRLOCK', 'TRANSLATE', 'WORKSITE', 'SECURED']");
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
      expect(source).toContain('data-iss-lowg-trajectory');
      expect(source).toContain('HANDRAIL CATCH WINDOW');
      expect(source).toContain('var speed = impulse / 70');
      expect(source).toContain('Learning guidance level');
      expect(source).toContain('interiorInspected');
      expect(source).toContain('data-iss-research-procedure');
      expect(source).toContain('data-iss-capillary-visual');
      expect(source).toContain('data-iss-maintenance-console');
      expect(source).toContain('data-iss-maintenance-telemetry');
      expect(source).toContain('data-iss-crew-notebook');
      expect(source).toContain('data-iss-cabin-stow');
      expect(source).toContain('data-iss-cabin-safety');
      expect(source).toContain('LOOSE-ITEM SAFETY SCAN');
      expect(source).toContain('data-iss-cupola-observation');
      expect(source).toContain('data-iss-cupola-view');
      expect(source).toContain('data-observation-state');
      expect(source).toContain("'aria-describedby': 'iss-ask-count'");
      expect(source).toContain("'aria-disabled': d.askLoading ? 'true' : undefined");
      expect(source).toContain("'data-iss-quiz-next': 'true'");
      expect(source).toContain('answerState');
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
      expect(html).toContain('AFT');
      expect(html).toContain('FORWARD');
      expect(html).toContain('data-iss-room-transition');
      expect(html).toContain('Stow your sleep station');
    });

    it('moves focus and selection together across the section tabs', async () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior' });
      try {
        const interior = live.host.querySelector('#iss-tab-interior');
        interior.focus();
        await act(async () => {
          interior.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const quiz = live.host.querySelector('#iss-tab-quiz');
        expect(quiz.getAttribute('aria-selected')).toBe('true');
        expect(document.activeElement).toBe(quiz);
        expect(live.host.querySelector('#iss-panel').getAttribute('aria-labelledby')).toBe('iss-tab-quiz');
      } finally {
        live.cleanup();
      }
    });

    it('renders research, maintenance, and low-g activities inside the station', () => {
      const research = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'destiny' });
      expect(research).toContain('Destiny laboratory');
      expect(research).toContain('plant-water experiment');
      expect(research).toContain('Secure the sample');
      expect(research).toContain('Prime the wick');
      expect(research).toContain('Start camera + baseline');
      expect(research).toContain('data-iss-capillary-visual');
      expect(research).toContain('CHAMBER UNLATCHED');
      const maintenance = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'tranquility' });
      expect(maintenance).toContain('Restore cabin airflow');
      expect(maintenance).toContain('clogged inlet filter');
      expect(maintenance).toContain('data-iss-maintenance-telemetry');
      expect(maintenance).toContain('DIAGNOSE');
      const lowG = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity' });
      expect(lowG).toContain('Low-g practice');
      expect(lowG).toContain('Push impulse');
      expect(lowG).toContain('Predicted speed');
      expect(lowG).toContain('data-iss-lowg-trajectory');
      expect(lowG).toContain('HANDRAIL CATCH WINDOW');
      expect(lowG).toContain('NO DRAG');
      expect(lowG).toContain('Δv = impulse ÷ 70 kg');
    });

    it('turns Harmony morning life into a three-item freefall stow scan', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'harmony' });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        expect(live.host.textContent).toContain('0 / 3 secured');
        expect(live.host.querySelector('[data-iss-cabin-safety]').getAttribute('data-iss-cabin-safety')).toBe('risk-3');
        expect(live.host.textContent).toContain('3 LOOSE OBJECTS');
        act(() => { findButton('Sleeping bag').click(); });
        expect(live.host.textContent).toContain('1 / 3 secured');
        expect(live.host.querySelector('[data-iss-cabin-safety]').getAttribute('data-iss-cabin-safety')).toBe('risk-2');
        expect(live.host.textContent).toContain('BAG // SECURED');
        act(() => { findButton('Crew tablet').click(); });
        act(() => { findButton('Damp washcloth').click(); });
        expect(live.host.textContent).toContain('Cabin clear');
        expect(live.host.textContent).toContain('Air return unobstructed');
        expect(live.host.querySelector('[data-iss-cabin-safety]').getAttribute('data-iss-cabin-safety')).toBe('clear');
        expect(live.host.textContent).toContain('CABIN CLEAR');
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
        expect(live.host.querySelector('[data-iss-cupola-view]').getAttribute('data-iss-cupola-view')).toBe('day');
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('targeting');
        act(() => { findButton('Aurora curtain').click(); });
        expect(live.host.textContent).toContain('Low light • steady camera');
        expect(live.host.querySelector('[data-iss-cupola-view]').getAttribute('data-iss-cupola-view')).toBe('aurora');
        act(() => { findButton('Capture image').click(); });
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('captured');
        expect(live.host.textContent).toContain('FRAME CAPTURED');
        expect(live.host.textContent).toContain('Aurora traces charged particles');
        expect(findButton('Close shutters').disabled).toBe(false);
        act(() => { findButton('Close shutters').click(); });
        expect(live.host.textContent).toContain('WINDOWS SECURED');
        expect(live.host.textContent).toContain('SHUTTERS CLOSED');
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('secured');
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
        expect(live.host.querySelector('[data-iss-capillary-visual]').getAttribute('data-iss-capillary-visual')).toBe('1');
        act(() => { findButton('Prime the wick').click(); });
        expect(live.host.textContent).toContain('Continue to step 3');
        expect(live.host.querySelector('[data-iss-capillary-visual]').getAttribute('data-iss-capillary-visual')).toBe('2');
        expect(live.host.textContent).toContain('CAPILLARY FRONT AT ROOTS');
        act(() => { findButton('Start camera + baseline').click(); });
        expect(live.host.textContent).toContain('1 / 5 jobs');
        expect(live.host.textContent).toContain('Baseline logged');
        expect(live.host.querySelector('[data-iss-capillary-visual]').getAttribute('data-iss-capillary-visual')).toBe('3');
        expect(live.host.textContent).toContain('BASELINE RECORDING');
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
        expect(live.host.querySelector('[data-iss-maintenance-telemetry]').getAttribute('data-iss-maintenance-telemetry')).toBe('focus-0');
        act(() => { findButton('Inlet pressure drop').click(); });
        expect(findButton('clogged inlet filter').disabled).toBe(false);
        expect(live.host.querySelector('[data-iss-maintenance-telemetry]').getAttribute('data-iss-maintenance-telemetry')).toBe('focus-1');
        expect(live.host.textContent).toContain('EVIDENCE CORRELATED');
        act(() => { findButton('clogged inlet filter').click(); });
        expect(live.host.textContent).toContain('Airflow restored.');
        expect(live.host.textContent).toContain('STABLE');
        expect(live.host.querySelector('[data-iss-maintenance-telemetry]').getAttribute('data-iss-maintenance-telemetry')).toBe('restored');
        expect(live.host.textContent).toContain('TRENDS STABILIZING');
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
        const prompt = live.host.querySelector('#iss-notebook-prompt-harmony');
        const count = live.host.querySelector('#iss-notebook-count-harmony');
        expect(textarea.getAttribute('aria-describedby')).toBe('iss-notebook-prompt-harmony iss-notebook-count-harmony');
        expect(prompt.textContent).toContain('ordinary morning routine');
        expect(count.getAttribute('aria-live')).toBe('off');
        expect(count.textContent).toContain('/ 240 characters');
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
        expect(controlled.host.querySelector('[data-iss-lowg-trajectory]').getAttribute('data-iss-lowg-trajectory')).toBe('controlled');
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
        expect(unsafe.host.querySelector('[data-iss-lowg-trajectory]').getAttribute('data-iss-lowg-trajectory')).toBe('overspeed');
        expect(unsafe.host.textContent).toContain('ARRIVAL OVERSPEED');
        expect(unsafe.host.textContent).toContain('0 / 5 jobs');
      } finally {
        unsafe.cleanup();
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

    it('exposes cinematic 3D view selection and module cutaway controls', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'map', selModule: 'destiny' });
      try {
        expect(live.host.textContent).toContain('SELECTED // DESTINY');
        expect(live.host.querySelector('[data-iss-module-marker]')).toBeTruthy();
        expect(live.host.querySelector('[data-iss-light-phase]')).toBeTruthy();
        expect(live.host.querySelector('[data-iss-orientation-widget]')).toBeTruthy();
        expect(live.host.textContent).toContain('Orientation triad: X is port to starboard');
        expect(live.host.querySelector('[data-iss-focus-module="destiny"]')).toBeTruthy();
        expect(live.host.querySelector('[data-iss-focus-module="destiny"]').textContent).toContain('Center Destiny');
        const canvas = live.host.querySelector('canvas');
        expect(canvas.getAttribute('aria-label')).toContain('Interactive 3-D model');
        expect(canvas.getAttribute('aria-describedby')).toBe('iss-map-instructions iss-map-status iss-map-orientation');
        expect(canvas.getAttribute('aria-keyshortcuts')).toContain('Home');
        expect(live.host.querySelector('#iss-map-status').textContent).toContain('Selected module Destiny');
        expect(live.host.querySelector('#iss-map-instructions').textContent).toContain('equivalent non-canvas inspection path');
        const labs = live.host.querySelector('[data-iss-camera-view="labs"]');
        act(() => { labs.click(); });
        expect(live.host.querySelector('[data-iss-camera-view="labs"]').getAttribute('aria-pressed')).toBe('true');
        expect(live.host.querySelector('#iss-map-status').textContent).toContain('Camera view labs');
        const cutaway = live.host.querySelector('[data-iss-cutaway]');
        act(() => { cutaway.click(); });
        expect(live.host.querySelector('[data-iss-cutaway]').getAttribute('aria-pressed')).toBe('true');
        expect(live.host.textContent).toContain('Cutaway ON');
      } finally {
        live.cleanup();
      }
    });
    it('renders A Day Aboard with the exercise WHY', () => {
      const html = mountWithSeed({ ...BASE, tab: 'day', dayIdx: 4 });
      expect(html).toContain('Exercise 1 of 2');
      expect(html).toContain('1-1.5%');
      expect(html).toContain('24-HOUR CREW TIMELINE');
      expect(html).toContain('WORK + EXERCISE');
      expect(html).toContain('24H ALLOCATION');
      expect(html).toContain('WORK + EX 10.5h');
      expect(html).toContain('data-iss-crew-day-timeline');
      expect(html).toContain('data-iss-day-allocation="work"');
      expect(html).toContain('ORBIT-CYCLE RIBBON');
      expect(html).toContain('ORBIT 7 / 16');
      expect(html).toContain('ECLIPSE');
    });

    it('synchronizes crew schedule selections with the orbital light cycle', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'day', dayIdx: 4 });
      try {
        expect(live.host.querySelector('[data-iss-day-light-phase]').getAttribute('data-iss-day-light-phase')).toBe('eclipse');
        expect(live.host.querySelector('[data-iss-day-allocation]').getAttribute('data-iss-day-allocation')).toBe('work');
        expect(live.host.textContent).toContain('ORBIT 7 / 16');
        const science = live.host.querySelector('[data-iss-day-slot="3"]');
        act(() => { science.click(); });
        expect(live.host.querySelector('[data-iss-day-light-phase]').getAttribute('data-iss-day-light-phase')).toBe('sunlight');
        expect(live.host.textContent).toContain('ORBIT 6 / 16');
        expect(live.host.textContent).toContain('ECLIPSE IN');
        const dinner = live.host.querySelector('[data-iss-day-slot="9"]');
        act(() => { dinner.click(); });
        const allocation = live.host.querySelector('[data-iss-day-allocation]');
        expect(allocation.getAttribute('data-iss-day-allocation')).toBe('crew');
        expect(allocation.querySelector('svg').getAttribute('aria-label')).toContain('selected event is in the meals and crew time block');
      } finally {
        live.cleanup();
      }
    });

    it('renders the connected Mission Operations simulations', () => {
      const integrated = mountWithSeed({ ...BASE, tab: 'operations' });
      expect(integrated).toContain('Keep a city-sized spacecraft alive.');
      expect(integrated).toContain('Simulate the next 92-minute orbit');
      expect(integrated).toContain('Cabin CO₂');
      expect(integrated).toContain('FLIGHT DIRECTOR DEBRIEF');
      expect(integrated).toContain('NEXT-ORBIT MARGIN FORECAST');
      expect(integrated).toContain('Nominal orbit');
      expect(integrated).toContain('Science surge');
      expect(integrated).toContain('RULE ≥ 25% · GO');
      expect(integrated).toContain('data-iss-orbit-forecast');
      expect(integrated).toContain('Scrub predicted orbit');
      expect(integrated).toContain('T+0 MIN');
      expect(integrated).toContain('5 / 5 FLIGHT RULES GO');
      expect(integrated).toContain('All systems');
      expect(integrated).toContain('Crew safety is the combined result');

      // ── Ops-model fidelity ────────────────────────────────────────────────
      // These pin two properties the model got WRONG, both of which taught
      // something false about the real station.
      //
      // 1. A nominal orbit must CHARGE the battery. The arrays were modelled at
      //    132 kW peak, which left a full crew running routine research
      //    net-negative every orbit — i.e. the ISS could not do science at full
      //    crew. It does, continuously.
      const fidelityPower = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'power', opsScenario: 'nominal' });
      expect(fidelityPower).toContain('Net charge +');
      expect(fidelityPower).not.toContain('Net discharge');

      // 2. Cabin CO2 must read like a spacecraft, not an office. Real ISS cabin
      //    CO2 runs roughly 2-4 mmHg (~2600-5300 ppm) against Earth's ~420 ppm;
      //    the old model peaked near 950 ppm and ruled at < 1000.
      const fidelityEclss = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'eclss', opsScenario: 'nominal' });
      const fidelityPpm = Number((fidelityEclss.match(/Modeled CO₂ (\d+) ppm/) || [])[1]);
      expect(fidelityPpm).toBeGreaterThan(2000);
      expect(fidelityPpm).toBeLessThan(5300);
      expect(fidelityEclss).toContain('Earth air is ~420 ppm');

      const comparison = mountWithSeed({ ...BASE, tab: 'operations', opsScenario: 'science', opsResearch: 95 });
      expect(comparison).toContain('Dashed = nominal orbit');

      const power = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'power' });
      expect(power).toContain('SUNLIGHT 57 MIN');
      expect(power).toContain('Battery after one orbit');
      const eclss = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'eclss' });
      expect(eclss).toContain('Water resupply gap');
      expect(eclss).toContain('Cabin-air quality');
      const debris = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'debris' });
      expect(debris).toContain('HYPERVELOCITY TEST');
      expect(debris).toContain('Impact energy');
      const human = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'human' });
      expect(human).toContain('Modeled bone loss');
      expect(human).toContain('Radiation exposure');

      const coolingIncident = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'emergency', opsEmergency: 'cooling' });
      expect(coolingIncident).toContain('INCIDENT DISPLAY // EXTERNAL COOLING LOOP');
      expect(coolingIncident).toContain('data-iss-emergency-visual="cooling"');
      expect(coolingIncident).toContain('data-iss-emergency-state="active"');
      expect(coolingIncident).toContain('LOOP PRESSURE LOW');
      expect(coolingIncident).toContain('OUTLET WARMING');

      const rendezvous = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'rendezvous', opsRendezvousHold: 2 });
      expect(rendezvous).toContain('RENDEZVOUS FLIGHT-DIRECTOR BOARD');
      expect(rendezvous).toContain('data-iss-rendezvous-planner="2"');
      expect(rendezvous).toContain('HOLD 3 / 4 // 30 M');
      expect(rendezvous).toContain('USE SMALL CORRECTION PULSES');
      expect(rendezvous).toContain('Representative sequence · vehicle routes vary');
    });

    it('inspects rendezvous hold points with synchronized flight-rule cues', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'operations', opsMode: 'rendezvous', opsRendezvousHold: 0 });
      try {
        const captureHold = live.host.querySelector('[data-iss-rendezvous-hold="3"]');
        expect(live.host.querySelector('[data-iss-rendezvous-planner]').getAttribute('data-iss-rendezvous-planner')).toBe('0');
        expect(live.host.textContent).toContain('ESTABLISH RELATIVE NAVIGATION');
        act(() => { captureHold.click(); });
        expect(captureHold.getAttribute('aria-pressed')).toBe('true');
        expect(live.host.querySelector('[data-iss-rendezvous-planner]').getAttribute('data-iss-rendezvous-planner')).toBe('3');
        expect(live.host.textContent).toContain('CENTER, DAMP, THEN COAST');
        expect(live.host.textContent).toContain('PORT CENTERED');
        expect(live.host.querySelector('[data-iss-rendezvous-planner] svg').getAttribute('aria-label')).toContain('hold point 4 of 4 at 10 m');
      } finally {
        live.cleanup();
      }
    });

    it('focuses one coupled system and explains its downstream role', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'operations' });
      try {
        const thermal = live.host.querySelector('[data-iss-system-focus="thermal"]');
        act(() => { thermal.click(); });
        expect(live.host.querySelector('[data-iss-network-focus]').getAttribute('data-iss-network-focus')).toBe('thermal');
        expect(live.host.textContent).toContain('coolant loops carry to radiators');
        expect(live.host.querySelector('[data-iss-system-focus="thermal"]').getAttribute('aria-pressed')).toBe('true');
      } finally {
        live.cleanup();
      }
    });    it('scrubs the orbit forecast from sunlight into eclipse with synchronized telemetry', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'operations' });
      try {
        const scrubber = live.host.querySelector('#iss-orbit-cursor');
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        expect(scrubber.getAttribute('aria-valuetext')).toContain('sunlight');
        act(() => {
          setValue.call(scrubber, '70');
          scrubber.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(live.host.textContent).toContain('T+70 MIN');
        expect(live.host.textContent).toContain('ECLIPSE');
        expect(live.host.querySelector('#iss-orbit-cursor').getAttribute('aria-valuetext')).toContain('eclipse');
        expect(live.host.querySelector('[data-iss-orbit-forecast] svg').getAttribute('aria-label')).toContain('T plus 70 minutes');
      } finally {
        live.cleanup();
      }
    });
    it('loads a cascading-fault preset and drills into the violated power rule', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'operations' });
      try {
        const fault = live.host.querySelector('[data-iss-scenario="fault"]');
        expect(fault).toBeTruthy();
        act(() => { fault.click(); });
        expect(fault.getAttribute('aria-pressed')).toBe('true');
        expect(live.host.textContent).toContain('Cascading fault');
        expect(live.host.textContent).toContain('RULE ≥ 25% · CHECK');
        // 4000 ppm ~= 3 mmHg, the level ISS crews work to stay under. The old
        // 1000 ppm rule was an office-air figure: real cabin CO2 runs 2-4 mmHg.
        expect(live.host.textContent).toContain('RULE < 4000 ppm · CHECK');
        expect(live.host.textContent).toContain('4 FLIGHT RULES TO CHECK');
        expect(live.host.textContent).toContain('too little battery reserve after eclipse');
        const powerRule = live.host.querySelector('[data-flight-rule="power"]');
        act(() => { powerRule.click(); });
        expect(live.host.textContent).toContain('Solar generation');
        expect(live.host.textContent).toContain('Battery after one orbit');
      } finally {
        live.cleanup();
      }
    });

    it('runs an orbit simulation and an emergency procedure', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'operations' });
      try {
        const simulate = [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Simulate the next'));
        act(() => { simulate.click(); });
        expect(live.host.textContent).toContain('ORBIT 1 // battery');
        expect(live.host.querySelector('#iss-orbit-cursor').value).toBe('92');
        expect(live.host.querySelector('[data-iss-mission-replay]')).toBeTruthy();
        const eclipseEvent = live.host.querySelector('[data-iss-replay-event="57"]');
        act(() => { eclipseEvent.click(); });
        expect(live.host.querySelector('#iss-orbit-cursor').value).toBe('57');
      } finally {
        live.cleanup();
      }
      const emergency = mountLiveWithSeed({ ...BASE, tab: 'operations', opsMode: 'emergency', opsEmergency: 'leak' });
      try {
        expect(emergency.host.querySelector('[data-iss-emergency-visual]').getAttribute('data-iss-emergency-visual')).toBe('leak');
        expect(emergency.host.querySelector('[data-iss-emergency-state]').getAttribute('data-iss-emergency-state')).toBe('active');
        expect(emergency.host.textContent).toContain('PRESSURE ISOLATION');
        const isolate = [...emergency.host.querySelectorAll('button')].find((button) => button.textContent.includes('Close the suspected'));
        act(() => { isolate.click(); });
        expect(emergency.host.textContent).toContain('PROCEDURE CORRECT');
        expect(emergency.host.querySelector('[data-iss-emergency-state]').getAttribute('data-iss-emergency-state')).toBe('contained');
        expect(emergency.host.textContent).toContain('LEAK ISOLATED');
      } finally {
        emergency.cleanup();
      }
      const heldEmergency = mountLiveWithSeed({ ...BASE, tab: 'operations', opsMode: 'emergency', opsEmergency: 'fire' });
      try {
        const ventilate = [...heldEmergency.host.querySelectorAll('button')].find((button) => button.textContent.includes('Increase ventilation'));
        act(() => { ventilate.click(); });
        expect(heldEmergency.host.textContent).toContain('PROCEDURE HOLD');
        expect(heldEmergency.host.querySelector('[data-iss-emergency-state]').getAttribute('data-iss-emergency-state')).toBe('hold');
        expect(heldEmergency.host.textContent).toContain('HOLD // HAZARD ACTIVE');
      } finally {
        heldEmergency.cleanup();
      }
    });
    it('renders Systems with the air loop and design challenge', () => {
      const html = mountWithSeed({ ...BASE, tab: 'systems', sysIdx: 1 });
      expect(html).toContain('Air loop');
      expect(html).toContain('Sabatier');
      expect(html).toContain('Design challenge');
    });

    it('shows how each system couples its inputs and outputs across the station', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'systems', sysIdx: 1, sysStep: 0 });
      try {
        let coupling = live.host.querySelector('[data-iss-system-coupling]');
        expect(coupling.getAttribute('data-iss-system-coupling')).toBe('air');
        expect(coupling.querySelector('svg').getAttribute('aria-label')).toContain('Inputs: WATER LOOP and ELECTRIC POWER');
        expect(live.host.textContent).toContain('STATION COUPLING // INPUTS → FUNCTION → OUTPUTS');
        expect(live.host.textContent).toContain('Cabin air depends on water processing');

        const power = [...live.host.querySelectorAll('.iss-system-tab')].find((button) => button.textContent.includes('Power'));
        act(() => { power.click(); });
        coupling = live.host.querySelector('[data-iss-system-coupling]');
        expect(coupling.getAttribute('data-iss-system-coupling')).toBe('power');
        expect(coupling.querySelector('svg').getAttribute('aria-label')).toContain('Inputs: SUNLIGHT and SOLAR ARRAYS');
        expect(live.host.textContent).toContain('Every major station function becomes a managed electrical load.');
      } finally {
        live.cleanup();
      }
    });
    it('focuses individual stages in a station system flow', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'systems', sysIdx: 1, sysStep: 0 });
      try {
        const recover = live.host.querySelector('[data-iss-system-step="4"]');
        expect(recover).toBeTruthy();
        act(() => { recover.click(); });
        expect(live.host.querySelector('[data-iss-system-step="4"]').getAttribute('aria-pressed')).toBe('true');
        expect(live.host.textContent).toContain('RECOVER: scrub + Sabatier');
        expect(live.host.textContent).toContain('STAGE 4 / 4');
        const all = live.host.querySelector('[data-iss-system-step="0"]');
        act(() => { all.click(); });
        expect(live.host.querySelector('[data-iss-system-step="0"]').getAttribute('aria-pressed')).toBe('true');
      } finally {
        live.cleanup();
      }
    });
    it('gives simulation ranges stable names, units, and quiet descriptions', () => {
      const lowG = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity', lowGImpulse: 10 });
      const operations = mountLiveWithSeed({ ...BASE, tab: 'operations', opsCrew: 7 });
      const orbit = mountLiveWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 420 });
      const history = mountLiveWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 });
      try {
        const lowGRange = lowG.host.querySelector('#iss-lowg-impulse');
        expect(lowGRange.getAttribute('aria-valuetext')).toBe('10 newton seconds');
        expect(lowG.host.querySelector('label[for="iss-lowg-impulse"] span:last-child').getAttribute('aria-hidden')).toBe('true');

        const crewRange = operations.host.querySelector('#iss-ops-crew');
        expect(crewRange.getAttribute('aria-valuetext')).toBe('7 people');
        expect(operations.host.querySelector('label[for="iss-ops-crew"] strong').getAttribute('aria-hidden')).toBe('true');
        const scrubber = operations.host.querySelector('#iss-orbit-cursor');
        expect(scrubber.getAttribute('aria-describedby')).toBe('iss-orbit-readout');
        expect(operations.host.querySelector('#iss-orbit-readout').getAttribute('aria-live')).toBe('off');

        const orbitRange = orbit.host.querySelector('#iss-orbit-alt');
        expect(orbitRange.getAttribute('aria-valuetext')).toBe('420 kilometers');
        expect(orbitRange.getAttribute('aria-describedby')).toBe('iss-orbit-tradeoff');
        expect(orbit.host.querySelector('#iss-orbit-tradeoff').hasAttribute('role')).toBe(false);

        const historyRange = history.host.querySelector('#iss-assembly-step');
        expect(historyRange.getAttribute('aria-valuetext')).toContain('Milestone 7 of 13');
        expect(historyRange.getAttribute('aria-valuetext')).toContain('2009');
      } finally {
        lowG.cleanup();
        operations.cleanup();
        orbit.cleanup();
        history.cleanup();
      }
    });

    it('computes real orbital mechanics in the Orbit Lab', () => {
      const html = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250 });
      // v = sqrt(398600.4418 / 6621) = 7.76 km/s
      expect(html).toContain('7.76 km/s');
      expect(html).toContain('Severe drag');
      expect(html).toContain('ALTITUDE ENVIRONMENT');
      expect(html).toContain('SEVERE DRAG');
      expect(html).toContain('VS 420 KM');
      expect(html).toContain('DELTA V +');
      const high = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 1500 });
      expect(high).toContain('radiation');
      expect(high).toContain('RADIATION EXPOSURE RISES');
      const issBand = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 420 });
      expect(issBand).toContain('CREWED LEO / ISS BAND');
      expect(issBand).toContain('ISS REFERENCE // 420 KM');
      expect(issBand).toContain('DRAG + REBOOST // 30-DAY TRAINING MODEL');
      expect(issBand).toContain('data-iss-drag-model="nominal"');
      expect(issBand).toContain('data-iss-reboost-day="20"');
      expect(issBand).toContain('Anchored to 75 m/day at 420 km');
      expect(issBand).toContain('not a reentry forecast');
    });

    it('models solar-driven drag and reboost as synchronized altitude trajectories', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 420, orbitSolar: 'nominal', orbitReboostDay: 0 });
      const modeledEnd = () => {
        const aria = live.host.querySelector('[data-iss-drag-model] svg').getAttribute('aria-label');
        return Number((aria.match(/End altitude ([0-9.]+) kilometers/) || [])[1]);
      };
      try {
        const nominalEnd = modeledEnd();
        const highSolar = live.host.querySelector('[data-iss-solar-mode="high"]');
        act(() => { highSolar.click(); });
        const highSolarEnd = modeledEnd();
        expect(highSolar.getAttribute('aria-pressed')).toBe('true');
        expect(live.host.querySelector('[data-iss-drag-model]').getAttribute('data-iss-drag-model')).toBe('high');
        expect(highSolarEnd).toBeLessThan(nominalEnd);
        const reboost = live.host.querySelector('[data-iss-reboost-plan="10"]');
        act(() => { reboost.click(); });
        const reboostEnd = modeledEnd();
        expect(reboost.getAttribute('aria-pressed')).toBe('true');
        expect(live.host.querySelector('[data-iss-drag-model]').getAttribute('data-iss-reboost-day')).toBe('10');
        expect(reboostEnd).toBeGreaterThan(highSolarEnd);
        expect(live.host.textContent).toContain('REBOOST +5 KM');
      } finally {
        live.cleanup();
      }
    });

    it('renders both missions, including a started EVA and a docking report', () => {
      const html = mountWithSeed({
        ...BASE, tab: 'missions',
        dockResult: 'bonk', dockMsg: 'Contact too fast.', dockRuns: 2, dockWins: 1,
        dockDebrief: { range: 4.8, speed: 1.2, offset: 3.1, fuel: 72, elapsed: 89.6, mode: 'orbital' },
        eva: { pos: 6, tetherA: 6, tetherB: 6, freeTether: 'A', o2: 61, bolts: 4, done: true, failMsg: '', started: true, log: ['done'] },
      });
      expect(html).toContain('Dock the cargo capsule');
      expect(html).toContain('Mission report');
      expect(html).toContain('POST-APPROACH FLIGHT DATA');
      expect(html).toContain('HARD CONTACT');
      expect(html).toContain('CONTACT RATE');
      expect(html).toContain('CAPTURE ENVELOPE');
      expect(html).toContain('data-iss-dock-debrief="bonk"');
      expect(html).toContain('Pump worksite');
      expect(html).toContain('Pump secured');
      expect(html).toContain('PROJECTED');
      expect(html).toContain('SUIT BUDGET');
      expect(html).toContain('RESERVE +');
      expect(html).toContain('NEXT MOVE SECURED');
      expect(html).toContain('data-iss-eva-phase="SECURED"');
      expect(html).toContain('Torque bolt');
    });

    it('supports keyboard-held docking thrusters and exposes textual telemetry', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'missions' });
      try {
        const canvas = live.host.querySelector('[data-dock-canvas]');
        const status = live.host.querySelector('[data-dock-hud]');
        const forward = [...live.host.querySelectorAll('button')].find((button) =>
          (button.getAttribute('aria-label') || '').startsWith('Thrust Forward'));
        expect(canvas.getAttribute('aria-describedby')).toBe('iss-dock-instructions iss-dock-status');
        expect(canvas.getAttribute('aria-keyshortcuts')).toContain('ArrowRight');
        expect(status.textContent).toContain('relative speed');
        expect(forward).toBeTruthy();

        act(() => { forward.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
        expect(canvas._dockState.thrust.fwd).toBe(true);
        act(() => { forward.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })); });
        expect(canvas._dockState.thrust.fwd).toBe(false);

        act(() => {
          forward.focus();
          forward.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        });
        expect(canvas._dockState.thrust.fwd).toBe(true);
        act(() => { forward.blur(); });
        expect(canvas._dockState.thrust.fwd).toBe(false);

        act(() => { canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', bubbles: true })); });
        expect(canvas._dockState.thrust.fwd).toBe(true);
        act(() => { canvas.dispatchEvent(new FocusEvent('blur', { bubbles: false })); });
        expect(canvas._dockState.thrust.fwd).toBe(false);
      } finally {
        live.cleanup();
      }
    });

    // The EVA consumables arithmetic had no behavioural coverage, which is how
    // both of these survived. Driven through the live harness, not the source.
    it('charges the EVA consumables budget consistently', () => {
      const findButton = (host, text) =>
        [...host.querySelectorAll('button')].find((b) => b.textContent.includes(text));
      // The route SVG's aria-label carries the exact figure ("Suit consumables N
      // percent"), so assert against that rather than a bare "N%" substring —
      // "8%" would also match the "98%" water-recovery readout on the page.
      const suitPct = (host) =>
        host.querySelector('.iss-eva-visual svg').getAttribute('aria-label');

      // A move with nothing clipped ahead must apply the penalty AND log it. Two
      // updates built from the same snapshot used to make the second revert the
      // first, so the abort message showed while O2 snapped back un-penalised.
      const fatal = mountLiveWithSeed({
        ...BASE, tab: 'missions',
        eva: { pos: 0, tetherA: 0, tetherB: 0, freeTether: 'B', o2: 8, bolts: 0, done: false, failMsg: '', started: true, log: [] },
      });
      try {
        act(() => { findButton(fatal.host, 'Translate').click(); });
        expect(fatal.host.textContent).toContain('Moved WITHOUT clipping ahead');
        expect(fatal.host.textContent).toContain('Suit consumables exhausted');
        // 8% - 12% floors at 0, and the penalty must survive the abort update.
        expect(suitPct(fatal.host)).toContain('Suit consumables 0 percent');
        expect(fatal.host.querySelector('[data-iss-eva-phase]').getAttribute('data-iss-eva-phase')).toBe('ABORTED');
      } finally {
        fatal.cleanup();
      }

      // The fourth bolt is charged and logged like the other three, so the sim
      // agrees with the "PROJECTED AT WORKSITE" figure that bills 5% per bolt.
      const lastBolt = mountLiveWithSeed({
        ...BASE, tab: 'missions',
        eva: { pos: 6, tetherA: 6, tetherB: 6, freeTether: 'A', o2: 50, bolts: 3, done: false, failMsg: '', started: true, log: [] },
      });
      try {
        act(() => { findButton(lastBolt.host, 'Torque bolt').click(); });
        expect(lastBolt.host.textContent).toContain('Bolt 4/4 torqued');
        expect(suitPct(lastBolt.host)).toContain('Suit consumables 45 percent');
        expect(lastBolt.host.textContent).toContain('Pump secured');
        expect(lastBolt.host.querySelector('[data-iss-eva-phase]').getAttribute('data-iss-eva-phase')).toBe('SECURED');
      } finally {
        lastBolt.cleanup();
      }
    });

    it('lets learners jump directly between assembly milestones', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 });
      try {
        let growth = live.host.querySelector('[data-iss-assembly-growth]');
        expect(growth.getAttribute('data-iss-assembly-growth')).toBe('6');
        expect(growth.querySelector('svg').getAttribute('aria-label')).toContain('Station growth profile at 2009');
        const first = live.host.querySelector('[data-iss-assembly-milestone="0"]');
        expect(first).toBeTruthy();
        act(() => { first.click(); });
        expect(live.host.querySelector('[data-iss-assembly-milestone="0"]').getAttribute('aria-current')).toBe('step');
        growth = live.host.querySelector('[data-iss-assembly-growth]');
        expect(growth.getAttribute('data-iss-assembly-growth')).toBe('0');
        expect(growth.querySelector('svg').getAttribute('aria-label')).toContain('major elements 2');
        expect(growth.querySelector('svg').getAttribute('aria-label')).toContain('available power 18 kW');
        expect(live.host.textContent).toContain('ASSEMBLY GROWTH PROFILE');
        expect(live.host.textContent).toContain('1998');
      } finally {
        live.cleanup();
      }
    });
    it('renders History and a completed quiz debrief', () => {
      const history = mountWithSeed({ ...BASE, tab: 'history' });
      expect(history).toContain('ORBITAL ASSEMBLY');
      expect(history).toContain('AVAILABLE POWER');
      expect(history).toContain('ASSEMBLY GROWTH PROFILE');
      expect(history).toContain('data-iss-assembly-growth');
      expect(history).toContain('Assembly to retirement');
      expect(history).toContain('Previous');
      expect(history).toContain('Next');
      expect(history).toContain('iss-assembly-new');
      expect(history).toContain('data-iss-assembly-install');
      expect(history).toContain('data-iss-assembly-milestone');
      expect(history).toContain('2002-2006');
      // Derived the same way the tool derives it, so this assertion keeps
      // testing that the "you are here" marker renders without going stale.
      expect(history).toContain(`${new Date().getFullYear()} (now)`);
      expect(history).toContain('Spot the Station');
      const retirement = mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 12 });
      expect(retirement).toContain('CONTROLLED REENTRY');
      expect(retirement).toContain('iss-deorbit-path');
      const kiboInstall = mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 });
      expect(kiboInstall).toContain('INSTALLED THIS STEP');
      expect(kiboInstall).toContain('Kibo');
      const quiz = mountWithSeed({ ...BASE, tab: 'quiz', quizDone: true, quizScore: 8, quizBest: 8, quizResults: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: false, 9: false } });
      expect(quiz).toContain('8 / 10');
      expect(quiz).toContain('Flight-controller material');
      expect(quiz).toContain('MISSION KNOWLEDGE DEBRIEF');
      expect(quiz).toContain('QUESTION FLIGHT RECORD');
      expect(quiz).toContain('8 correct, 2 to review');
      expect(quiz).toContain('data-iss-quiz-debrief="10"');
      expect(quiz).toContain('SHIELDING');
    });

    it('makes quiz outcomes color-independent and preserves keyboard focus', async () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'quiz', quizIdx: 0, quizPicked: null, quizScore: 0 });
      try {
        const firstWrong = live.host.querySelector('[data-iss-quiz-option="0"]');
        act(() => { firstWrong.click(); });
        const selected = live.host.querySelector('#iss-quiz-option-0-0');
        const correct = live.host.querySelector('#iss-quiz-option-0-2');
        const next = live.host.querySelector('[data-iss-quiz-next]');
        expect(selected.getAttribute('aria-pressed')).toBe('true');
        expect(live.host.textContent).not.toContain('MISSION KNOWLEDGE DEBRIEF');
        expect(selected.textContent).toContain('Your answer — incorrect');
        expect(correct.textContent).toContain('Correct answer');
        expect(selected.getAttribute('aria-describedby')).toBe('iss-quiz-feedback');
        expect(live.host.querySelector('#iss-quiz-feedback').getAttribute('aria-atomic')).toBe('true');
        expect(document.activeElement).toBe(next);

        const results = await axe.run(live.host, {
          rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
        });
        expect(results.violations.map((violation) => violation.id)).toEqual([]);

        await act(async () => {
          next.click();
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
        expect(document.activeElement).toBe(live.host.querySelector('#iss-quiz-option-1-0'));
      } finally {
        live.cleanup();
      }
    }, 120000);

    it.each(['interior', 'operations', 'map', 'day', 'systems', 'orbit', 'missions', 'history', 'quiz'])(
      'has no detectable structural accessibility violations in the %s tab',
      async (tab) => {
        const live = mountLiveWithSeed({ ...BASE, tab });
        try {
          const results = await axe.run(live.host, {
            rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
          });
          expect(results.violations.map((violation) => violation.id)).toEqual([]);
        } finally {
          live.cleanup();
        }
      },
      120000,
    );
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
