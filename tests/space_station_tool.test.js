import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));
const axe = require(resolve(MODULES_DIR, 'axe-core'));

// axe-core guards every run with `assert(!axe._running, 'Axe is already
// running...')`, and that flag is module-global. When ONE axe test overruns its
// timeout, vitest abandons the test but the underlying run keeps going with the
// flag still set, so every later axe test threw instantly — turning a single
// slow pass into 9 red tests. That happened repeatedly, and the failure COUNT
// stopped meaning anything: it was always one real stall plus N instant
// cascades, and which tab stalled varied run to run.
//
// `axe.teardown()` does NOT help — it clears caches and the tree, not _running.
// Serialising is the honest fix: a later test now WAITS for the in-flight run
// instead of exploding, so the suite reports one slow test rather than nine
// failures that say nothing about the product.
let axeQueue = Promise.resolve();
function runAxe(host, options) {
  const started = axeQueue.then(() => axe.run(host, options), () => axe.run(host, options));
  // Swallow on the queue only; `started` still rejects for the caller.
  axeQueue = started.then(() => undefined, () => undefined);
  return started;
}

// A failing toContain on the 2 MB tool source (or a whole rendered tab) makes
// vitest print and diff the entire string, which looks like a hung suite. Whole-
// string checks use this matcher: the same substring test, a one-line failure.
expect.extend({
  toIncludeText(received, needle) {
    if (typeof received !== 'string' || typeof needle !== 'string') {
      throw new TypeError('toIncludeText needs two strings, got ' + typeof received + ' and ' + typeof needle);
    }
    const pass = received.includes(needle);
    return { pass, message: () => 'expected ' + received.length + ' characters of text ' +
      (pass ? 'not ' : '') + 'to include ' + JSON.stringify(needle) };
  },
});

// Many tests here mount the 2 MB tool many times (each mount re-parses its CSS
// in jsdom), so several ran 5-6.5 s against vitest's 5 s default and failed on
// machine load alone. As with the explicit caps below, the timeout catches a hang.
vi.setConfig({ testTimeout: 30000 });

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
//
// jsdom 29 keeps a <style>'s sheet in document.styleSheets when the element
// leaves inside a removed subtree (React unmount), though a direct removal drops
// it. Each mount left ~2,000 rules behind and axe's getComputedStyle calls match
// every rule, so tabs slowed test by test until the late axe passes ran for
// minutes. Detach the tool's styles before unmounting.
//
// jsdom also re-parses the tool's ~250 KB of CSS on every mount, and css-tree
// builds a SyntaxError for each value it cannot validate, formatting its stack
// at once (Object.assign runs the getter) through vitest's source-map hook.
// That was ~45% of a mount; nothing reads those stacks, so the first render
// runs with no captured frames.
function renderTool(root, element) {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 0;
  try { act(() => { root.render(element); }); } finally { Error.stackTraceLimit = limit; }
}

function unmountTool(root, host) {
  host.querySelectorAll('style').forEach((style) => style.remove());
  try { act(() => root.unmount()); } catch (_) {}
  host.remove();
}

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
    renderTool(root, React.createElement(Harness));
    return host.innerHTML;
  } finally {
    unmountTool(root, host);
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
  renderTool(root, React.createElement(Harness));
  return {
    host,
    cleanup() {
      unmountTool(root, host);
    },
  };
}
const BASE = {
  tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0, sysStep: 0,
  interiorRoom: 'harmony', interiorDone: {}, interiorSeen: { harmony: true }, interiorChoices: {},
  interiorInspected: {}, interiorAttempts: {}, interiorDiscovery: null, interiorLog: [],
  interiorGuided: true, lowGImpulse: 10, lowGResult: null,
  interiorView: '3d', interiorNav: { flightRoom: null, hatches: {}, collisions: 0, railGrabs: 0, railPushOffs: 0, looseHits: 0, cargoCatches: 0, cargoSecures: 0, stowAttempts: 0, stowCatches: 0, stowSecures: 0, stowWarnings: 0, stowComplete: false, stowItems: {}, transferAttempts: 0, transferContacts: 0, transferCompletions: 0, transferComplete: false, capillaryAttempts: 0, capillaryUnderfills: 0, capillaryOverflows: 0, capillaryInterruptions: 0, capillaryTransfers: 0, worksiteAttempts: 0, worksiteReactions: 0, worksiteServices: 0, observationAttempts: 0, observationBlurs: 0, observationInterruptions: 0, observationCaptures: 0, observationSecures: 0, routeStep: 0, routeComplete: false },
  researchStep: 0, researchFeedback: '', researchErrors: 0, maintenanceChecks: {}, maintenanceReading: null, interiorNotes: {},
  cabinStow: {}, cupolaTarget: 'day', cupolaCaptured: false, cupolaShutters: false, cupolaObservation: '',
  opsMode: 'integrated', opsScenario: 'nominal', opsOrbitMinute: 0, opsFocus: 'all', opsCrew: 7, opsResearch: 60, opsArrayAngle: 86, opsEclipse: 35, opsBattery: 76, opsRecovery: 98, opsScrub: 88, opsRadiator: 82, opsCooling: 86, opsCmg: 28, opsMissionDays: 180, opsExercise: 2.5, opsDebrisSize: 1, opsShieldGap: 10, opsDebrisSpeed: 12, opsEmergency: 'leak', opsEmergencyResult: '', opsRuns: 0, opsLog: [], assemblyIdx: 11,
  orbitAlt: 420, orbitPredictRef: 420, orbitPredictPick: null, orbitPredictAlt: null, orbitPredictLog: [],
  orbitChallenge: null, orbitChallengePick: null, orbitChallengeDone: {},
  quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizResults: {},
  seenModules: {}, seenHours: {}, orbitTouched: false, quizBest: 0, mapView: 'overview', mapCutaway: false,
  askInput: '', askAnswer: '', askLoading: false,
};

describe('space station tool', () => {
  it('registers the plugin with quest hooks and all nine tabs', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toIncludeText("window.StemLab.registerTool('spaceStation'");
      expect(source).toIncludeText('questHooks');
      // Nine tabs
      ['interior', 'operations', 'map', 'day', 'systems', 'orbit', 'missions', 'history', 'quiz'].forEach((tabId) => {
        expect(source).toIncludeText("id: '" + tabId + "'");
      });
      // Self-guarding module pattern
      expect(source).toIncludeText("if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;");
    });
  });

  it('models the real station: 13 modules of accurate vintage and physics', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      const moduleIds = ['zarya', 'unity', 'zvezda', 'destiny', 'quest', 'harmony', 'columbus', 'kibo', 'tranquility', 'cupola', 'leonardo', 'nauka', 'truss'];
      moduleIds.forEach((id) => expect(source).toIncludeText("id: '" + id + "'"));
      // Anchor facts kept accurate
      expect(source).toIncludeText('Nov 20, 1998');            // Zarya launch
      expect(source).toIncludeText('Nov 2, 2000');             // continuous habitation
      expect(source).toIncludeText('7.66 km/s');               // orbital speed
      expect(source).toIncludeText('98%');                     // water recovery milestone
      expect(source).toIncludeText('Sabatier');                // CO2 -> water loop
      expect(source).toIncludeText('Whipple');                 // debris shielding
      expect(source).toIncludeText('Control Moment Gyroscopes');
      // Real orbital mechanics, not hardcoded outputs
      // One orbit implementation feeds the fast-facts card, the status strip,
      // the Orbit Lab readouts and the drag/reboost reference curve. They used
      // to derive it separately, and the card's static '~92 min' disagreed with
      // the strip's computed 93 on the very same screen.
      expect(source).toIncludeText('var ISS_GM = 398600.4418');
      expect(source).toIncludeText('function issOrbit(altKm)');
      expect((source.match(/398600\.4418/g) || []).length).toBe(1);
      expect(source).toIncludeText('var v = Math.sqrt(ISS_GM / r)');   // v = sqrt(GM/r), once
      // Future plans stay hedged
      expect(source).toIncludeText('Planned retirement');
      expect(source).toIncludeText('Deorbit Vehicle');
    });
  });

  it('keeps the 3-D canvas accessible and self-cleaning', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toIncludeText('prefers-reduced-motion');
      expect(source).toIncludeText('min-width:24px');
      expect(source).toIncludeText('@media (forced-colors: active)');
      expect(source).toIncludeText('@media (prefers-contrast: more)');
      expect(source).toIncludeText('.iss-root *:before,.iss-root *:after');
      expect(source).toIncludeText('.iss-root summary{min-height:24px}');
      expect(source).toIncludeText('[aria-selected="true"]');
      expect(source).toIncludeText('overflow:visible;border:1px solid rgba(125,211,252,.24)');
      expect(source).toIncludeText('.iss-location-strip{flex-wrap:wrap;overflow-x:visible}');
      // Phones keep TWO columns for the four short status readouts (a single
      // column made the header 4 rows tall on a 390px screen).
      expect(source).toIncludeText('@media (max-width:420px){.iss-status-strip{grid-template-columns:1fr 1fr}');
      expect(source).toIncludeText('iss-quiz-answer-state');
      expect(source).toIncludeText("role: 'application'");
      expect(source).toIncludeText("'aria-describedby': 'iss-map-instructions iss-map-status iss-map-orientation'");
      expect(source).toIncludeText("'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight + - Home F'");
      expect(source).toIncludeText("id: 'iss-map-status'");
      expect(source).toIncludeText("upd({ mapView: 'overview' })");
      expect(source).toIncludeText('cv._issCleanup = cleanup');
      expect(source).toIncludeText('cameraTween');
      expect(source).toIncludeText('cv._issCutaway');
      expect(source).toIncludeText('data-iss-camera-view');
      expect(source).toIncludeText('data-iss-module-marker');
      expect(source).toIncludeText('data-iss-light-phase');
      expect(source).toIncludeText('data-iss-focus-module');
      expect(source).toIncludeText('cv._issFocusModule');
      expect(source).toIncludeText('focusDistance');
      expect(source).toIncludeText('data-iss-orientation-widget');
      expect(source).toIncludeText("data-iss-axis': 'x'");
      expect(source).toIncludeText('_axisOrigin');
      expect(source).toIncludeText("cv.addEventListener('keydown', onKey)");
      // Touch parity: without touchAction the browser steals the drag for page
      // scrolling and camera orbit is unavailable on touchscreens. Cancellation
      // must release the active gesture so subsequent input can take over.
      expect(source).toIncludeText("cv.style.touchAction = 'none'");
      expect(source).toIncludeText("window.addEventListener('pointercancel', onUp)");
      expect(source).toIncludeText("window.removeEventListener('pointercancel', onUp)");
      expect(source).toIncludeText('moduleDetails');
      // The backbone is one batched open lattice (built and counted below).
      expect(source).toIncludeText('geo = issOpenTrussGeometry(THREE, len, m.size[0] * 2);');
      expect(source).toIncludeText('if (!cv.isConnected) { cleanup(); return; }');
      // Module inspection works without the canvas (keyboard/AT path)
      expect(source).toIncludeText("'aria-pressed': on");
      expect(source).toIncludeText("role: 'tablist'");
    });
  });

  // jsdom has no WebGL, so the render pipeline can only be pinned at the source
  // level — the same way the canvas contract above is pinned. These guard the
  // three things a future edit could silently drop with no test going red.
  it('keeps the 3-D render pipeline guarded, kill-switchable, and idle-cheap', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Bloom rides the renderer and stays opt-out-able platform-wide.
      expect(source).toIncludeText('renderer._alloComposer');
      expect(source).toIncludeText('window.AlloPostFXEnabled === false');
      // Never let a post-FX failure blank the station.
      expect(source).toIncludeText('else renderMapScene();');
      expect(source).toIncludeText('renderer.render(planetScene, camera);');
      expect(source).toIncludeText('stationPass.clear = false');
      // Composer must track canvas resizes or bloom detaches from the viewport.
      expect(source).toIncludeText('composer.setSize(');
      // Reduced motion must not redraw an identical frame forever.
      expect(source).toIncludeText('_lastFrameSig');
      expect(source).toIncludeText('tick % 120 !== 0');
      // Solar arrays track through a group transform; their material reflects
      // sunlight rather than emitting an artificial glow in eclipse.
      expect(source).toIncludeText('wings[wi].quaternion.setFromEuler(arrayEuler)');
      expect(source).not.toIncludeText('0.16 + 0.62 * glint');
      // Canadarm2's booms must grow from a SHARED elbow. They previously had
      // independently-set centres, so their ends never met and the arm drew as
      // two disconnected sticks. Pin the derivation, and that the old
      // free-floating literal position is gone.
      expect(source).toIncludeText('arm1.position.copy(armBase.clone().add(armAxis1');
      expect(source).toIncludeText('arm2.position.copy(armElbow.clone().add(armAxis2');
      expect(source).not.toIncludeText('arm2.position.set(1.7, 1.25');
      // A SAVED camera view has to reach the camera on build. d.mapView
      // persists and the view buttons render aria-pressed from it, but
      // _issSetView had only two call sites — the Home key and the button's
      // onClick — so after a tab switch the button stayed lit on "Earth-facing"
      // while the scene sat at the hardcoded overview pose. jsdom has no WebGL,
      // so a source pin is the only way to stop this being dropped again.
      expect(source).toIncludeText("if (d && d.mapView && d.mapView !== 'overview') cv._issSetView(d.mapView, true);");
      // ...and it must restore SILENTLY and without a tween: nothing was just
      // selected, so announcing it would lie to a screen reader, and swooping
      // from a pose the student never chose is worse than opening there.
      expect(source).toIncludeText('cv._issSetView = function (name, immediate)');
      expect(source).toIncludeText('if (_prefersReducedMotion || immediate)');
      // Pin the INVARIANT, not the wording: the announcement must stay behind
      // `if (!immediate)` so the silent restore path cannot start narrating.
      // This used to pin the whole English sentence, which made it fail the
      // moment that string was extracted for translation -- a spelling pin on
      // a line whose text is expected to change. See
      // feedback_moved_code_breaks_text_pin_tests.
      expect(source).toMatch(/if \(!immediate\) announceToSR\(/);
      // The restore call itself must still pass `immediate = true`.
      expect(source).toIncludeText('cv._issSetView(d.mapView, true);');
    });
  });

  it('paints the planet from real coastline data and says which parts are schematic', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // The land mask is real Natural Earth data in the same base36 per-row RLE
      // the flight-sim tool uses. Pin the decoder's shape and the grid size: a
      // silent change to either draws a garbled planet that still "renders".
      expect(source).toIncludeText('ISS_LAND_W = 720, ISS_LAND_H = 360');
      expect(source).toIncludeText("ISS_LAND_RLE.split(';')");
      expect(source).toIncludeText("parseInt(runs[k], 36)");
      // 360 rows of latitude, one per line, or the decode walks off the mask.
      const rle = source.match(/var ISS_LAND_RLE = '([0-9a-z,;]+)'/);
      expect(rle).not.toBeNull();
      expect(rle[1].split(';').length).toBe(360);

      // Honesty: the tab must tell students which of what they see is data.
      expect(source).toIncludeText('the coastlines are real');
      expect(source).toIncludeText('Natural Earth');
      expect(source).toIncludeText('are schematic');

      // Texture generation must stay deterministic. The GL smoke test compares
      // two mounts pixel-for-pixel; a Math.random() in the map painter would
      // either fail it or hide a real regression behind noise.
      const painter = source.slice(source.indexOf('function issEarthCanvases'), source.indexOf('function issGlowCanvas'));
      expect(painter.length).toBeGreaterThan(500);
      expect(painter).not.toIncludeText('Math.random');
      // Painted once per quality tier and reused across mounts.
      expect(source).toIncludeText('_issEarthCanvases[key]');

      // City lights ride the same daylight term as the windows:
      // fixed emissive either blows them white over the day side or
      // leaves them invisible over the night side.
      expect(source).toIncludeText('earthLightsMat.emissiveIntensity = 0.1 + 1.45 * lampOn');

      // The same modeled Sun direction lights both rendered scenes. Physical
      // orbit/beta/shadow geometry is covered by the focused lighting tests.
      expect(source).toIncludeText('sun.position.copy(_sunDir).multiplyScalar(40)');
      expect(source).toIncludeText('earthSun.position.copy(sun.position)');
      expect(source).toIncludeText('sun.intensity = lightModel.eclipse ? 0 : 1.35');

      // Earth's surface is at y = -4.5 here, so an "Earth-facing" camera below
      // that sits inside the planet and renders a flat wash.
      expect(source).toIncludeText('nadir: { camera: [0, -3.8, 5.6]');
      expect(source).not.toIncludeText('nadir: { camera: [0, -11.5, 2.5]');

      // Per-renderer textures must be released with the renderer.
      expect(source).toIncludeText('earthTextures.forEach(');
    });
  });

  it('lights the atmospheric limb from the Sun instead of ringing the planet evenly', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Both shells carry per-vertex colour driven by the sun direction, so the
      // night limb goes dark and the terminator gets its orange line. A flat
      // material colour here is the regression: it lit the night side's limb as
      // brightly as the day side's.
      expect(source).toIncludeText('function makeLimbShell(');
      expect(source).toIncludeText('vertexColors: true');
      expect(source).toIncludeText('limbShells[ls].update(_sunDir)');
      expect(source).not.toIncludeText("new THREE.MeshBasicMaterial({ color: 0x67c8ff, transparent: true, opacity: 0.15");

      // Repainting 2,665 vertices per shell must stay off the hot path, and
      // must still force ONE draw under reduced motion — the idle-render guard
      // would otherwise hold the pre-paint image on screen for two seconds.
      expect(source).toIncludeText('tick % 4 === 0 && limbShells.length');
      expect(source).toIncludeText("+ (_limbPainted ? 1 : 0)");

      // The background is authored PRE tone-mapping: the post-FX chain runs the
      // clear colour through ACES, and the old value came out a milky navy.
      expect(source).toIncludeText('new THREE.Color(0x000102)');
      expect(source).not.toIncludeText('new THREE.Color(0x030712)');
    });
  });

  it('builds the truss backbone as a braced open lattice, not a solid bar', () => {
    // Four rails, a square frame at every bay boundary and one diagonal per face
    // per bay make the 109-meter backbone read as structure. Build the real
    // geometry with the vendored three.js the app ships.
    const vendor = {};
    runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const start = source.indexOf('  function issOpenTrussGeometry(');
      expect(start, filePath).toBeGreaterThan(-1);
      const close = /\r?\n  \}\r?\n/.exec(source.slice(start));
      expect(close, filePath).not.toBeNull();
      const build = new Function(source.slice(start, start + close.index + close[0].length) + '\nreturn issOpenTrussGeometry;')();
      for (const [length, width] of [[11, 0.4], [3.2, 0.3]]) {
        const geometry = build(vendor.THREE, length, width);
        const bays = Math.ceil(length / 0.5);
        expect(geometry.userData.memberCount, filePath + ' ' + length).toBe(4 + 4 * (bays + 1) + 4 * bays);
        const box = geometry.boundingBox;
        expect(box.max.x - box.min.x).toBeGreaterThanOrEqual(length);
        expect(box.max.x - box.min.x).toBeLessThan(length + 0.05);
        for (const axis of ['y', 'z']) { // Float32 positions: allow single-precision rounding.
          expect(box.max[axis] - box.min[axis]).toBeLessThanOrEqual(width + 1e-6);
          expect(box.max[axis] - box.min[axis]).toBeGreaterThan(width * 0.9);
        }
        // Open: a ray through the middle of a bay passes between the diagonals,
        // while the same ray at rail height hits a rail.
        const mesh = new vendor.THREE.Mesh(geometry, new vendor.THREE.MeshBasicMaterial({ side: vendor.THREE.DoubleSide }));
        const quarterBay = -length / 2 + (length / bays) / 4;
        const inset = width / 2 - 0.018;
        const hits = (y) => new vendor.THREE.Raycaster(new vendor.THREE.Vector3(quarterBay, y, -1),
          new vendor.THREE.Vector3(0, 0, 1)).intersectObject(mesh).length;
        expect(hits(0), filePath + ' bay center').toBe(0);
        expect(hits(inset), filePath + ' rail').toBeGreaterThan(0);
        geometry.dispose();
      }
    });
  });

  it('docks the visiting vehicles at the ports they actually use', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      // Dragon on Harmony forward (module at z -3.4, half-length 0.8, so the
      // port is at z -4.2) and Progress on Zvezda aft (4.6 + 1.6 = 6.2).
      expect(source).toIncludeText("addVisitor(dragonCap, 'harmony')");
      expect(source).toIncludeText("addVisitor(progressCargo, 'zvezda')");
      // Attached as details of their host module so the cutaway control dims
      // them together with it.
      expect(source).toIncludeText("mesh._issParentId = hostId");
      expect(source).toIncludeText('moduleDetails.push(mesh)');
    });
  });

  it('ships the docking sim, EVA game, and interior views with honest physics', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Missions tab exists
      expect(source).toIncludeText("id: 'missions'");
      // Docking sim runs real Clohessy-Wiltshire coupling, toggleable for contrast
      expect(source).toIncludeText('Clohessy-Wiltshire');
      expect(source).toIncludeText('3 * N_ORBIT * N_ORBIT * st.x + 2 * N_ORBIT * st.vy');
      expect(source).toIncludeText('-2 * N_ORBIT * st.vx');
      expect(source).toIncludeText('exaggerated');            // time-scaling disclosed honestly
      expect(source).toIncludeText('dockRealMode');
      // No per-frame React state: game state lives on the canvas element
      expect(source).toIncludeText('cv._dockState = st');
      expect(source).toIncludeText('cv._dockCleanup = cleanup');
      expect(source).toIncludeText("'data-dock-hud': 'true'");
      // Instructions and live status lead the list; the mount test resolves every id.
      expect(source).toIncludeText("'aria-describedby': 'iss-dock-instructions iss-dock-status");
      expect(source).toIncludeText('function holdKey(on)');
      expect(source).toIncludeText('onPointerCancel: press(false)');
      expect(source).toIncludeText('onKeyDown: holdKey(true)');
      expect(source).toIncludeText('function clearThrust()');
      expect(source).toIncludeText("window.addEventListener('blur', clearThrust)");
      expect(source).toIncludeText('st.trail');
      expect(source).toIncludeText('function coastForecast()');
      expect(source).toIncludeText('BRAKING DISTANCE');
      expect(source).toIncludeText('PROXIMITY ×');
      expect(source).toIncludeText('STOP MARGIN');
      expect(source).toIncludeText('TOTAL RATE');
      expect(source).toIncludeText('milestones.m15');
      expect(source).toIncludeText('renderDockDebrief');
      expect(source).toIncludeText('POST-APPROACH FLIGHT DATA');
      expect(source).toIncludeText('data-iss-dock-debrief');
      // EVA enforces the two-tether rule and consumables budget
      expect(source).toIncludeText('Moved WITHOUT clipping ahead');
      expect(source).toIncludeText('tetherA');
      expect(source).toIncludeText('Suit consumables');
      expect(source).toIncludeText('SUIT BUDGET');
      expect(source).toIncludeText('reserveFloor = 15');
      expect(source).toIncludeText('RESERVE BREACH');
      expect(source).toIncludeText('data-iss-eva-phase');
      expect(source).toIncludeText("phaseSteps = ['AIRLOCK', 'TRANSLATE', 'WORKSITE', 'SECURED']");
      // Interior views wired to their modules
      expect(source).toIncludeText('renderCupolaInterior');
      expect(source).toIncludeText('renderSleepInterior');
      expect(source).toIncludeText("selModule.id === 'cupola' ? renderCupolaInterior()");
      // New quest hooks
      expect(source).toIncludeText("id: 'iss_inside'");
      expect(source).toIncludeText("id: 'iss_freeflight'");
      expect(source).toIncludeText("id: 'iss_dock'");
      expect(source).toIncludeText("id: 'iss_eva'");
      // Interior shift is interactive, responsive, and exposes hotspot learning
      expect(source).toIncludeText('INTERIOR_ROOMS');
      expect(source).toIncludeText('data-iss-interior');
      expect(source).toIncludeText('iss-interior-layout');
      expect(source).toIncludeText('INTERIOR_3D_LAYOUT');
      expect(source).toIncludeText("var INTERIOR_ROUTE_IDS = ['harmony', 'destiny', 'unity', 'tranquility', 'cupola']");
      expect(source).toIncludeText('function interiorCanvasRef');
      expect(source).toIncludeText('data-iss-interior-canvas');
      expect(source).toIncludeText("'aria-describedby': 'iss-interior-flight-instructions iss-interior-transfer-instructions iss-interior-flight-status iss-interior-transfer-readout iss-interior-stow-readout iss-interior-cabin-airflow iss-interior-observation-readout'");
      expect(source).toIncludeText("id: 'iss-interior-transfer-instructions'");
      expect(source).toIncludeText("'aria-keyshortcuts': 'W A S D R F Q E B C V T P X ArrowUp ArrowDown ArrowLeft ArrowRight Space Home'");
      expect(source).toIncludeText('cv._issInteriorState = state');
      expect(source).toIncludeText('cv._issInteriorSetControl');
      expect(source).toIncludeText('cv._issInteriorGrabRail');
      expect(source).toIncludeText('cv._issInteriorCargoAction = cargoAction');
      expect(source).toIncludeText('cv._issInteriorStowAction = stowAction');
      expect(source).toIncludeText('cv._issInteriorStowSceneItems = harmonyStowItems');
      expect(source).toIncludeText('cv._issInteriorWorksiteAction = setWorksiteAction');
      expect(source).toIncludeText('cv._issInteriorCenter');
      expect(source).toIncludeText('cv._issInteriorReset');
      expect(source).toIncludeText('cv._issInteriorCleanup = cleanup');
      expect(source).toIncludeText('state.velocity.addScaledVector');
      expect(source).toIncludeText("mode: 'STATIONARY'");
      expect(source).toIncludeText("state.mode = 'RAIL HOLD'");
      expect(source).toIncludeText('Math.ceil(elapsed / 0.04)');
      expect(source).toIncludeText('if (state.velocity.length() > 0.78)');
      expect(source).toIncludeText('COASTING // NO DRAG');
      expect(source).toIncludeText('function crossedConnectorPlane');
      expect(source).toIncludeText('function canOccupyFromRoom');
      expect(source).toIncludeText('canOccupyFromRoom(state.room, tempCandidate)');
      const physicalTransitionStart = source.indexOf('var nextRoom = transitionRoom(state.room, state.position);');
      const physicalTransitionLastWant = source.indexOf('lastWant = nextRoom.id;', physicalTransitionStart);
      const physicalTransitionCanvasWant = source.indexOf('cv._issInteriorWantRoom = nextRoom.id;', physicalTransitionLastWant);
      const physicalTransitionCanvasWantEnd = physicalTransitionCanvasWant + 'cv._issInteriorWantRoom = nextRoom.id;'.length;
      expect(physicalTransitionStart).toBeGreaterThan(-1);
      expect(physicalTransitionLastWant).toBeGreaterThan(physicalTransitionStart);
      expect(physicalTransitionCanvasWant).toBeGreaterThan(physicalTransitionLastWant);
      expect(source.slice(physicalTransitionLastWant, physicalTransitionCanvasWantEnd).replace(/\s+/g, ' ')).toBe(
        'lastWant = nextRoom.id; cv._issInteriorWantRoom = nextRoom.id;',
      );
      expect(source).toIncludeText('function hullCollisionNormal');
      expect(source).toIncludeText('var normalImpactSpeed = state.velocity.dot(tempCollisionNormal)');
      expect(source).toIncludeText("normalSpeed: normalImpactSpeed");
      expect(source).not.toIncludeText('state.velocity.multiplyScalar(-0.18)');
      expect(source).toIncludeText('angularVelocity: 0');
      expect(source).toIncludeText('state.angularVelocity += rollInput');
      expect(source).toIncludeText('ROTATING // NO DRAG');
      expect(source).toIncludeText('railHeld: false');
      expect(source).toIncludeText('pushOffLatch: false');
      expect(source).toIncludeText('var railPushOffImpulse = 10');
      expect(source).toIncludeText("emit('rail-push-off'");
      expect(source).toIncludeText('state.pushOffLatch = true');
      expect(source).toIncludeText('cargoPosition: cargo.position');
      expect(source).toIncludeText('cargoVelocity: new THREE.Vector3');
      expect(source).toIncludeText("cargoMode: 'loose', cargoHeld: false, cargoSecured: false");
      expect(source).toIncludeText('function cargoAction()');
      expect(source).toIncludeText("emit('cargo-caught'");
      expect(source).toIncludeText("emit('cargo-secured'");
      expect(source).toIncludeText("event.type === 'cargo-secured'");
      expect(source).toIncludeText('nav.cargoSecured = true');
      expect(source).toIncludeText('(navigation.cargoClear || navigation.cargoSecured)');
      // A bulky bag follows the learner through the Harmony-Destiny hatch
      // with spring/damper lag. Its full visible envelope, not only the crew
      // body, must clear the reduced centerline aperture.
      expect(source).toIncludeText('var transferHatchZ = -8.45');
      expect(source).toIncludeText('var transferSafeRadius = 0.70');
      expect(source).toIncludeText('var transferAttachReach = 0.78');
      expect(source).toIncludeText('var transferBagMass = 12');
      expect(source).toIncludeText('var transferSpring = 5.6');
      expect(source).toIncludeText('var transferDamping = 2.8');
      expect(source).toIncludeText('function transferAction()');
      expect(source).toIncludeText('function resetTransfer(preserveCounters, outcome)');
      expect(source).toIncludeText('function updateHatchTransfer(dt)');
      const transferPhysicsStart = source.indexOf('function updateHatchTransfer(dt)');
      const transferSpringForce = source.indexOf('.copy(tempTransferTarget).sub(state.transferPosition).multiplyScalar(transferSpring)', transferPhysicsStart);
      const transferDamperForce = source.indexOf('.addScaledVector(state.transferVelocity, -transferDamping)', transferSpringForce);
      const transferVelocityStep = source.indexOf('state.transferVelocity.addScaledVector(tempTransferAcceleration, dt)', transferDamperForce);
      const transferSpeedCap = source.indexOf('state.transferVelocity.length() > 1.25', transferVelocityStep);
      const transferPositionStep = source.indexOf('state.transferPosition.addScaledVector(state.transferVelocity, dt)', transferSpeedCap);
      expect(transferPhysicsStart).toBeGreaterThan(-1);
      expect(transferSpringForce).toBeGreaterThan(transferPhysicsStart);
      expect(transferDamperForce).toBeGreaterThan(transferSpringForce);
      expect(transferVelocityStep).toBeGreaterThan(transferDamperForce);
      expect(transferSpeedCap).toBeGreaterThan(transferVelocityStep);
      expect(transferPositionStep).toBeGreaterThan(transferSpeedCap);
      const transferPhysicsEnd = source.indexOf('function setWorksiteVisualComplete', transferPhysicsStart);
      const transferPhysicsSource = source.slice(transferPhysicsStart, transferPhysicsEnd);
      expect(transferPhysicsEnd).toBeGreaterThan(transferPhysicsStart);
      expect(source).toIncludeText('transferPreviousBodyPosition: startDef.center.clone()');
      expect(source).toIncludeText('transferPreviousBagPosition: (persistedTransferComplete ? transferDockPoint : transferStagingPoint).clone()');
      expect(source).toIncludeText('transferBodyCrossed: persistedTransferComplete, transferBagCrossed: persistedTransferComplete');
      expect(source).toIncludeText('function interpolatedTransferRadius(previousPosition, currentPosition)');
      expect(source).toIncludeText('function failHatchTransferContact(culprit, bodyRadius, bagRadius)');
      expect(transferPhysicsSource).toIncludeText('var bodySweptForward = previousBodyPosition.z <= transferHatchZ && state.position.z > transferHatchZ;');
      expect(transferPhysicsSource).toIncludeText('var bagSweptForward = previousBagPosition.z <= transferHatchZ && state.transferPosition.z > transferHatchZ;');
      expect(transferPhysicsSource).toIncludeText('var bodySweptReverse = previousBodyPosition.z > transferHatchZ && state.position.z <= transferHatchZ;');
      expect(transferPhysicsSource).toIncludeText('var bagSweptReverse = previousBagPosition.z > transferHatchZ && state.transferPosition.z <= transferHatchZ;');
      expect(transferPhysicsSource).toIncludeText('if (bodySweptReverse) {');
      expect(transferPhysicsSource).toIncludeText('state.transferBodyCrossed = false;');
      expect(transferPhysicsSource).toIncludeText('state.transferBodyCrossingRadius = null;');
      expect(transferPhysicsSource).toIncludeText('if (bagSweptReverse) {');
      expect(transferPhysicsSource).toIncludeText('state.transferBagCrossed = false;');
      expect(transferPhysicsSource).toIncludeText('state.transferBagCrossingRadius = null;');
      expect(transferPhysicsSource).toIncludeText('state.transferBodyCrossingRadius = interpolatedTransferRadius(previousBodyPosition, state.position);');
      expect(transferPhysicsSource).toIncludeText('state.transferBagCrossingRadius = interpolatedTransferRadius(previousBagPosition, state.transferPosition);');
      expect(transferPhysicsSource).toIncludeText('var bodyUnsafe = bodySweptForward && state.transferBodyCrossingRadius > transferSafeRadius;');
      expect(transferPhysicsSource).toIncludeText('var bagUnsafe = bagSweptForward && state.transferBagCrossingRadius > transferSafeRadius;');
      expect(transferPhysicsSource).toIncludeText('failHatchTransferContact(culprit, state.transferBodyCrossingRadius, state.transferBagCrossingRadius);');
      const transferBodyReverse = transferPhysicsSource.indexOf('if (bodySweptReverse) {');
      const transferBagReverse = transferPhysicsSource.indexOf('if (bagSweptReverse) {', transferBodyReverse);
      const transferBodyForward = transferPhysicsSource.indexOf('if (bodySweptForward) {', transferBagReverse);
      const transferBagForward = transferPhysicsSource.indexOf('if (bagSweptForward) {', transferBodyForward);
      const transferBodyCrossed = transferPhysicsSource.indexOf('state.transferBodyCrossed = true;', transferBodyForward);
      const transferBagCrossed = transferPhysicsSource.indexOf('state.transferBagCrossed = true;', transferBagForward);
      expect(transferBodyReverse).toBeGreaterThan(-1);
      expect(transferBagReverse).toBeGreaterThan(transferBodyReverse);
      expect(transferBodyForward).toBeGreaterThan(transferBagReverse);
      expect(transferBodyCrossed).toBeGreaterThan(transferBodyForward);
      expect(transferBagForward).toBeGreaterThan(transferBodyCrossed);
      expect(transferBagCrossed).toBeGreaterThan(transferBagForward);
      const transferBothCrossedGate = transferPhysicsSource.indexOf('if (!state.transferBodyCrossed || !state.transferBagCrossed)');
      const transferBothBeyondGate = transferPhysicsSource.indexOf("if (state.position.z <= transferHatchZ || state.transferPosition.z <= transferHatchZ || state.room !== 'destiny') return;", transferBothCrossedGate);
      const transferCompletion = transferPhysicsSource.indexOf('state.transferComplete = true;', transferBothBeyondGate);
      expect(transferBothCrossedGate).toBeGreaterThan(-1);
      expect(transferBothBeyondGate).toBeGreaterThan(transferBothCrossedGate);
      expect(transferCompletion).toBeGreaterThan(transferBothBeyondGate);
      const transferMoveToRoomStart = source.indexOf('function moveToRoom(id, speak, preserveProgress)');
      const transferMoveToRoomEnd = source.indexOf('function grabRail()', transferMoveToRoomStart);
      const transferMoveToRoomSource = source.slice(transferMoveToRoomStart, transferMoveToRoomEnd);
      expect(transferMoveToRoomStart).toBeGreaterThan(-1);
      expect(transferMoveToRoomEnd).toBeGreaterThan(transferMoveToRoomStart);
      expect(transferMoveToRoomSource).toIncludeText("var transferCancelled = def.id !== previousRoom && state.transferMode === 'tethered' && !state.transferComplete;");
      const transferCancelReset = transferMoveToRoomSource.indexOf("resetTransfer(true, 'cancelled');");
      const transferTeleport = transferMoveToRoomSource.indexOf('state.position.copy(def.center);');
      expect(transferCancelReset).toBeGreaterThan(-1);
      expect(transferMoveToRoomSource).toIncludeText("emit('transfer-cancelled'");
      expect(transferTeleport).toBeGreaterThan(transferCancelReset);
      const transferResetStart = source.indexOf('function resetTransfer(preserveCounters, outcome)');
      const transferResetEnd = source.indexOf('function placeCrewAtTransferStaging()', transferResetStart);
      const transferResetSource = source.slice(transferResetStart, transferResetEnd);
      expect(transferResetStart).toBeGreaterThan(-1);
      expect(transferResetEnd).toBeGreaterThan(transferResetStart);
      expect(transferResetSource).toIncludeText('state.transferPreviousBodyPosition.copy(state.position);');
      expect(transferResetSource).toIncludeText('state.transferPreviousBagPosition.copy(state.transferPosition);');
      expect(transferResetSource).toIncludeText('state.transferBodyCrossed = !!state.transferComplete;');
      expect(transferResetSource).toIncludeText('state.transferBagCrossed = !!state.transferComplete;');
      expect(transferResetSource).toIncludeText('state.transferBodyCrossingRadius = state.transferComplete ? 0 : null;');
      expect(transferResetSource).toIncludeText('state.transferBagCrossingRadius = state.transferComplete ? 0 : null;');
      expect(transferResetSource).toIncludeText('state.transferPendingSafeCrossing = false;');
      expect(source).toIncludeText('n.transferComplete');
      expect(source).toIncludeText("transferMode: persistedTransferComplete ? 'docked' : 'staged'");
      expect(source).toIncludeText('transferPreviousZ: persistedTransferComplete ? transferDockPoint.z : transferStagingPoint.z');
      expect(source).toIncludeText("transferBag.name = 'iss-bulky-transfer-bag'");
      expect(source).toIncludeText('new THREE.BoxGeometry(0.78, 0.52, 0.58)');
      expect(source).toIncludeText('new THREE.TorusGeometry(0.47, 0.018');
      expect(source).toIncludeText('new THREE.TorusGeometry(transferSafeRadius, 0.035');
      expect(source).toIncludeText("transferTether.name = 'iss-bulky-transfer-tether'");
      expect(source).toIncludeText("transferClearanceCue.name = 'iss-hatch-transfer-clearance-cue'");
      expect(source).toIncludeText('transferTetherGeometry.attributes.position.needsUpdate = true');
      expect(source).toIncludeText("var tetherVisible = state.transferMode === 'tethered';");
      expect(source).toIncludeText('transferTether.visible = tetherVisible');
      expect(source).toIncludeText('var dockVisible = state.transferComplete;');
      expect(source).toIncludeText('transferDockCue.visible = dockVisible');
      expect(source).toIncludeText("state.transferMode === 'tethered' ? transferBagMass : 0");
      expect(source).toIncludeText("emit('transfer-attempt'");
      expect(source).toIncludeText("emit('transfer-contact'");
      expect(source).toIncludeText("emit('transfer-complete'");
      expect(source).toIncludeText("if (event.code === 'KeyB')");
      expect(source).toIncludeText('cv._issInteriorTransferAction = transferAction');
      expect(source).toIncludeText('cv._issInteriorTransferAttempts = state.transferAttempts');
      expect(source).toIncludeText('cv._issInteriorTransferContacts = state.transferContacts');
      expect(source).toIncludeText('cv._issInteriorTransferCompletions = state.transferCompletions');
      expect(source).toIncludeText('cv._issInteriorTransferComplete = state.transferComplete');
      expect(source).toIncludeText('cv._issInteriorTransferAction = null');
      expect(source).toIncludeText("event.type === 'transfer-attempt'");
      expect(source).toIncludeText("event.type === 'transfer-contact'");
      expect(source).toIncludeText("event.type === 'transfer-complete'");
      expect(source).toIncludeText('nav.transferAttempts = Math.max');
      expect(source).toIncludeText('nav.transferComplete = true');
      expect(source).toIncludeText("if (event.source !== 'diagram')");
      const transferReducerStart = source.indexOf("} else if (event.type === 'transfer-attempt')");
      const transferReducerEnd = source.indexOf("} else if (event.type === 'stow-attempt')", transferReducerStart);
      const transferReducerSource = source.slice(transferReducerStart, transferReducerEnd);
      expect(transferReducerStart).toBeGreaterThan(-1);
      expect(transferReducerEnd).toBeGreaterThan(transferReducerStart);
      expect(transferReducerSource).toIncludeText('var reportedTransferContact = Number(event.contact);');
      expect(transferReducerSource).toIncludeText('? Math.max(Number(nav.transferContacts || 0), reportedTransferContact) : Number(nav.transferContacts || 0) + 1;');
      expect(transferReducerSource).toIncludeText("if (event.source !== 'diagram') {");
      expect(transferReducerSource).toIncludeText("nav.flightRoom = 'harmony';");
      expect(transferReducerSource).toIncludeText("} else if (event.type === 'transfer-cancelled') {");
      expect(transferReducerSource).toIncludeText("nav.transferLastOutcome = 'cancelled';");
      expect(transferReducerSource).toIncludeText('nav.transferCancelledTo = event.to || null;');
      expect(transferReducerSource).toIncludeText('if (!nav.transferComplete) nav.transferCompletions = Math.max');
      expect(source).toIncludeText("{ id: 'transfer', done: !!navigation.transferComplete");
      expect(source).toIncludeText("'data-iss-interior-transfer-action': 'true'");
      expect(source).toIncludeText("'data-iss-interior-transfer-readout': 'true'");
      expect(source).toIncludeText("'aria-describedby': 'iss-interior-transfer-readout'");
      expect(source).toIncludeText("'aria-keyshortcuts': 'B'");
      expect(source).toIncludeText('canvas._issInteriorTransferAttempts = Number(navigation.transferAttempts || 0)');
      expect(source).toIncludeText('canvas._issInteriorTransferContacts = Number(navigation.transferContacts || 0)');
      expect(source).toIncludeText('canvas._issInteriorTransferCompletions = Number(navigation.transferCompletions || 0)');
      expect(source).toIncludeText('canvas._issInteriorTransferComplete = !!navigation.transferComplete');
      expect(source).toIncludeText('cv._issInteriorTransferAttempts = null');
      expect(source).toIncludeText('cv._issInteriorTransferContacts = null');
      expect(source).toIncludeText('cv._issInteriorTransferCompletions = null');
      expect(source).toIncludeText('cv._issInteriorTransferComplete = null');
      expect(source).toIncludeText('function chooseHatchTransferDiagram(choice)');
      expect(source).toIncludeText("if (navigation.transferComplete) return;");
      expect(source).toIncludeText("'data-iss-hatch-transfer-diagram': 'true'");
      expect(source).toIncludeText("'aria-labelledby': 'iss-hatch-transfer-diagram-title'");
      expect(source).toIncludeText("'data-iss-hatch-transfer-clearance-cue': 'true'");
      expect(source).toIncludeText("'aria-labelledby': 'iss-hatch-transfer-svg-title iss-hatch-transfer-svg-desc'");
      expect(source).toIncludeText("h('title', { id: 'iss-hatch-transfer-svg-title' }");
      expect(source).toIncludeText("h('desc', { id: 'iss-hatch-transfer-svg-desc' }");
      expect(source).toIncludeText("'data-iss-hatch-transfer-choice': choice[0]");
      expect(source).toIncludeText("'data-iss-hatch-transfer-diagram-readout': 'true'");
      expect(source).toIncludeText("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
      expect(source).toIncludeText("['aligned', 'Align body + bag on centerline']");
      expect(source).toIncludeText("['body-only', 'Center my body only']");
      expect(source).toIncludeText("['pull-hard', 'Pull harder through the rim']");
      expect(source).toIncludeText('SAFE CENTER RADIUS 0.70 M');
      const transferDiagramStart = source.indexOf('function chooseHatchTransferDiagram(choice)');
      const transferDiagramEnd = source.indexOf('function sceneArt()', transferDiagramStart);
      const transferDiagramSource = source.slice(transferDiagramStart, transferDiagramEnd);
      expect(transferDiagramStart).toBeGreaterThan(-1);
      expect(transferDiagramEnd).toBeGreaterThan(transferDiagramStart);
      expect(transferDiagramSource).toIncludeText("type: 'transfer-contact'");
      expect(transferDiagramSource).toIncludeText("type: 'transfer-complete'");
      expect(transferDiagramSource).toIncludeText("source: 'diagram'");
      expect(transferDiagramSource).toIncludeText('safeRadius: 0.70');
      // Harmony adds three independently drifting cabin items. Safe capture is
      // based on reach and relative velocity; restraint requires a stable rail
      // brace at the matching item-specific target.
      expect(source).toIncludeText("addHarmonyStowItem('bag', 'sleeping bag'");
      expect(source).toIncludeText("addHarmonyStowItem('tablet', 'crew tablet'");
      expect(source).toIncludeText("addHarmonyStowItem('cloth', 'damp washcloth'");
      expect(source).toIncludeText("target.name = 'iss-harmony-restraint-' + id");
      expect(source).toIncludeText('harmonyStowTargets.bag.add(bagStrap)');
      expect(source).toIncludeText('harmonyStowTargets.tablet.add(tabletDock)');
      expect(source).toIncludeText('harmonyStowTargets.cloth.add(hygienePouch)');
      expect(source).toIncludeText('var stowCatchReach = 0.65');
      expect(source).toIncludeText('var stowCatchRelativeSpeed = 0.2');
      expect(source).toIncludeText('function stowAction()');
      expect(source).toIncludeText('var stableBrace = state.railHeld && state.velocity.length() <= 0.02 && Math.abs(state.angularVelocity) <= 0.035');
      expect(source).toIncludeText("emit('stow-caught'");
      expect(source).toIncludeText("emit('stow-secured'");
      expect(source).toIncludeText("emit('stow-complete'");
      expect(source).toIncludeText("emit('stow-airflow-warning'");
      expect(source).toIncludeText("if (event.code === 'KeyX')");
      expect(source).toIncludeText("event.type === 'stow-attempt'");
      expect(source).toIncludeText("event.type === 'stow-caught'");
      expect(source).toIncludeText("event.type === 'stow-secured'");
      expect(source).toIncludeText("event.type === 'stow-complete'");
      expect(source).toIncludeText('station.cabinStow = { bag: true, tablet: true, cloth: true }');
      expect(source).toIncludeText("{ id: 'stow', done: cabinStowComplete");
      expect(source).toIncludeText('if (state.stowComplete)');
      expect(source).toIncludeText('stowEl.disabled = state.stowComplete');
      expect(source.indexOf('if (state.stowComplete)', source.indexOf('function stowAction()'))).toBeLessThan(
        source.indexOf('state.stowAttempts += 1', source.indexOf('function stowAction()')),
      );
      expect(source).toIncludeText('function freshInteriorNavigation()');
      expect(source).toIncludeText("interiorView: '3d', interiorNav: freshInteriorNavigation()");
      expect(source).toIncludeText('var startsFreshInteriorShift = patch && patch.interiorShiftComplete === false');
      expect(source).toIncludeText('if (startsFreshInteriorShift) patch = Object.assign({}, patch, { interiorNav: freshInteriorNavigation() })');
      const cargoActionStart = source.indexOf('function cargoAction()');
      const stowActionStart = source.indexOf('function stowAction()');
      expect(cargoActionStart).toBeGreaterThan(-1);
      expect(stowActionStart).toBeGreaterThan(-1);
      expect(source.indexOf('if (state.stowHeldId)', cargoActionStart)).toBeLessThan(
        source.indexOf("if (state.cargoMode === 'held')", cargoActionStart),
      );
      expect(source.indexOf("if (state.cargoMode === 'held')", stowActionStart)).toBeLessThan(
        source.indexOf('state.stowAttempts += 1', stowActionStart),
      );
      expect(source).toIncludeText("var stowHandsBusy = state.cargoMode === 'held'");
      expect(source).toIncludeText('is in reach and motion-matched. Press X to catch it.');
      expect(source).not.toIncludeText("nearestStowDistance.toFixed(2) + ' meters away at '");
      expect(source).toIncludeText('flowArrow.rotation.z = Math.PI / 2');
      // Reduced motion removes decorative tumbling, never the pouch's actual
      // free-flight translation and collision response.
      const cargoPhysicsStart = source.indexOf("if (state.cargoMode === 'loose')");
      const cargoTranslation = source.indexOf('tempCargoCandidate.copy(cargo.position).addScaledVector(state.cargoVelocity, dt)', cargoPhysicsStart);
      const cargoDecorationGuard = source.indexOf("if (!_prefersReducedMotion)", cargoTranslation);
      expect(cargoPhysicsStart).toBeGreaterThan(-1);
      expect(cargoTranslation).toBeGreaterThan(cargoPhysicsStart);
      expect(cargoDecorationGuard).toBeGreaterThan(cargoTranslation);
      expect(source.indexOf('cargo.position.copy(tempCargoCandidate)', cargoTranslation)).toBeLessThan(cargoDecorationGuard);
      expect(source).toIncludeText('function updateMotionGuide');
      expect(source).toIncludeText('new THREE.ArrowHelper');
      expect(source).toIncludeText('motionGuideVisible');
      expect(source).toIncludeText('function addWayfindingPlacard');
      expect(source).toIncludeText('var hatchCollarMat');
      expect(source).toIncludeText('function updateRoomLighting');
      expect(source).toIncludeText('function setWorksiteAction(on)');
      expect(source).toIncludeText('var worksiteAngularImpulse = 0.14');
      expect(source).toIncludeText('var worksiteDuration = 1.5');
      expect(source).toIncludeText("emit('worksite-reaction'");
      expect(source).toIncludeText("emit('worksite-complete'");
      expect(source).toIncludeText("event.type === 'worksite-complete'");
      expect(source).toIncludeText('nav.worksiteComplete = true');
      expect(source).toIncludeText('var capillaryFlowRate = 1.3');
      expect(source).toIncludeText('var capillaryDoseMinimum = 2.7');
      expect(source).toIncludeText('var capillaryDoseMaximum = 3.3');
      expect(source).toIncludeText('Math.sqrt(state.capillaryDuration / capillaryWettingDuration)');
      expect(source).toIncludeText('function setCapillaryAction(on)');
      expect(source).toIncludeText('function cancelCapillaryAction(quiet)');
      expect(source).toIncludeText('function updateCapillary(dt, now)');
      expect(source).toIncludeText("emit('capillary-underfill'");
      expect(source).toIncludeText("emit('capillary-overflow'");
      expect(source).toIncludeText("emit('capillary-interrupted'");
      expect(source).toIncludeText("emit('capillary-complete'");
      expect(source).toIncludeText("event.type === 'capillary-complete'");
      expect(source).toIncludeText('nav.capillaryComplete = true');
      expect(source).toIncludeText('cv._issInteriorCapillaryAction = setCapillaryAction');
      expect(source).toIncludeText('cv._issInteriorCapillaryCancel = cancelCapillaryAction');
      expect(source).toIncludeText('cv._issInteriorCapillaryAction = null');
      expect(source).toIncludeText("'data-iss-interior-capillary-action': 'true'");
      expect(source).toIncludeText('cv._issInteriorResearchStep = null');
      expect(source).toIncludeText('cv._issInteriorCapillaryLastDose = null');
      expect(source).toIncludeText('if (wasActive) state.capillaryAttempts = Math.max(0, state.capillaryAttempts - 1)');
      expect(source).toIncludeText('onPointerLeave: capillaryCancel');
      expect(source).toIncludeText("'data-iss-interior-capillary-readout': 'true'");
      expect(source).toIncludeText('Target band reached. Release V now');
      expect(source).toIncludeText('SECURE SAMPLE FIRST // WATER VALVE LOCKED');
      expect(source).toIncludeText('Contained fluid transfer');
      expect(source).toIncludeText('var observationReach = 0.95');
      expect(source).toIncludeText('var observationDuration = 1.2');
      expect(source).toIncludeText('function setObservationAction(on)');
      expect(source).toIncludeText('function cancelObservationAction(quiet)');
      expect(source).toIncludeText('function updateObservation(dt, now)');
      expect(source).toIncludeText("emit('observation-blurred'");
      expect(source).toIncludeText("emit('observation-interrupted'");
      expect(source).toIncludeText("emit('observation-captured'");
      expect(source).toIncludeText("emit('observation-secured'");
      expect(source).toIncludeText('cv._issInteriorObservationAction = setObservationAction');
      expect(source).toIncludeText('cv._issInteriorObservationCancel = cancelObservationAction');
      expect(source).toIncludeText('cv._issInteriorObservationAction = null');
      expect(source).toIncludeText('cv._issInteriorObservationCancel = null');
      expect(source).toIncludeText('cv._issInteriorSecureCupola = null');
      expect(source).toIncludeText("'data-iss-interior-observation-action': 'true'");
      expect(source).toIncludeText("'data-iss-interior-observation-readout': 'true'");
      expect(source).toIncludeText("'data-iss-interior-stow-action': 'true'");
      expect(source).toIncludeText("'data-iss-interior-stow-status': cabinStowComplete ? 'complete' : 'approach'");
      expect(source).toIncludeText("'data-iss-interior-stow-item': 'none'");
      expect(source).toIncludeText("'data-iss-interior-stow-count': cabinStowComplete ? '3' : '0'");
      expect(source).toIncludeText("'data-iss-interior-stow-readout': 'true'");
      expect(source).toIncludeText("'data-iss-interior-cabin-airflow': 'true'");
      expect(source).toIncludeText("cabinAirflowEl.setAttribute('data-state', state.stowAirflowState)");
      expect(source).toIncludeText("state.stowAirflowState === 'blocked'");
      expect(source).toIncludeText("var cabinDiagramEnabled = d.interiorView === 'diagram'");
      expect(source).toIncludeText('Capture Earth frame (P)');
      expect(source).toIncludeText('releasing early blurs the frame');
      expect(source).not.toIncludeText('if (roomAt(tempCandidate))');
      expect(source).toIncludeText("emit('hatch'");
      expect(source).toIncludeText("emit('cargo-clear'");
      expect(source).toIncludeText("emit('orientation-recovered'");
      expect(source).toIncludeText("emit('route-complete'");
      expect(source).toIncludeText('if (!state.routeComplete)');
      expect(source).toIncludeText('if (!preserveProgress && !state.routeComplete)');
      expect(source).toIncludeText('nav.routeComplete = !!nav.routeComplete || !!canvasState.routeComplete');
      expect(source).toIncludeText('nav.flightRoom = event.to');
      expect(source).toIncludeText('storedNavigation.flightRoom');
      expect(source).not.toIncludeText('station.interiorRoom = event.to');
      expect(source).toIncludeText("'data-iss-interior-room-select': r.id");
      expect(source).toIncludeText("'data-iss-interior-reset-route': 'true'");
      expect(source).toIncludeText("if (interiorView !== 'diagram' || roomDone || captured) return;");
      expect(source).toIncludeText("recordInteriorNavigation({ type: 'observation-captured'");
      expect(source).toIncludeText("source: 'diagram'");
      expect(source).toIncludeText('function railDistance');
      expect(source).toIncludeText('function nextRouteTarget');
      expect(source).toIncludeText('distance > 0.68');
      expect(source).toIncludeText('speed >= 0.12 && speed <= 0.35');
      expect(source).toIncludeText('side: THREE.BackSide');
      expect(source).toIncludeText('THREE.CanvasTexture');
      expect(source).toIncludeText('issEarthCanvases(256)');
      expect(source).toIncludeText('new THREE.RingGeometry(aperture, bulkheadOuterRadius');
      expect(source).toIncludeText('polygonOffset: true');
      expect(source).toIncludeText('COUNTER-PUSH NOW // FAST');
      expect(source).toIncludeText('function addModulePlacard');
      expect(source).toIncludeText('function addActivityBeacon');
      expect(source).toIncludeText('function addModuleIdentityKit');
      const identityKitStart = source.indexOf('function addModuleIdentityKit');
      const identityKitEnd = source.indexOf('function addRoom', identityKitStart);
      const identityKitSource = source.slice(identityKitStart, identityKitEnd);
      ['harmony', 'destiny', 'unity', 'tranquility', 'cupola'].forEach((roomId) =>
        expect(identityKitSource).toIncludeText("def.id === '" + roomId + "'"));
      ['berth', 'scienceGlass', 'destinyWickDry', 'restraintRing', 'duct', 'controller'].forEach((landmark) =>
        expect(identityKitSource).toIncludeText(landmark));
      expect(source).toIncludeText('function updateCrewRig');
      expect(source).toIncludeText("handPose: 'tucked'");
      expect(source).toIncludeText('data-iss-hand-pose');
      expect(source).toIncludeText('cv._issInteriorRouteStep');
      expect(source).toIncludeText('cv._issInteriorRouteComplete');
      expect(source).toIncludeText('cv._issInteriorVisitedRooms');
      expect(source).toIncludeText('cv._issInteriorOrientationDone');
      expect(source).toIncludeText('iss-interior-route-map');
      expect(source).toIncludeText('iss-route-schematic');
      expect(source).toIncludeText('data-iss-interior-rail-distance');
      expect(source).toIncludeText('data-iss-interior-next-label');
      expect(source).toIncludeText('data-iss-interior-next-distance');
      expect(source).toIncludeText('data-iss-interior-next-arrow');
      expect(source).toIncludeText('data-iss-interior-event');
      expect(source).toIncludeText('data-iss-interior-objective');
      expect(source).toIncludeText('data-iss-interior-reticle');
      expect(source).toIncludeText('data-iss-interior-orientation');
      expect(source).toIncludeText('data-iss-interior-braking');
      expect(source).toIncludeText('data-iss-interior-impact-flash');
      expect(source).toIncludeText('data-iss-interior-cargo-action');
      expect(source).toIncludeText('data-iss-interior-cargo-status');
      expect(source).toIncludeText('data-iss-interior-worksite-action');
      expect(source).toIncludeText('data-iss-interior-worksite-status');
      expect(source).toIncludeText('grabEl.disabled = false');
      expect(source).toIncludeText("grabEl.setAttribute('aria-disabled', !state.railHeld && distanceToRail > 0.68 ? 'true' : 'false')");
      expect(source).toIncludeText('cv._issInteriorCargoAction = null');
      expect(source).toIncludeText('cv._issInteriorStowAction = null');
      expect(source).toIncludeText('cv._issInteriorStowSceneItems = null');
      expect(source).toIncludeText('cv._issInteriorCabinStow = null');
      expect(source).toIncludeText('cv._issInteriorCabinComplete = null');
      expect(source).toIncludeText('cv._issInteriorStowItems = null');
      expect(source).toIncludeText('cv._issInteriorStowAttempts = null');
      expect(source).toIncludeText('cv._issInteriorStowCatches = null');
      expect(source).toIncludeText('cv._issInteriorStowSecures = null');
      expect(source).toIncludeText('cv._issInteriorStowWarnings = null');
      expect(source).toIncludeText('cv._issInteriorWorksiteAction = null');
      expect(source).toIncludeText('cv._issInteriorEvent = null');
      expect(source).toIncludeText('cv._issInteriorWantRoom = null');
      expect(source).toIncludeText('renderer.forceContextLoss()');
      expect(source).toIncludeText('function handleInteriorInitFailure');
      expect(source).toIncludeText('cv._issInteriorRenderer = renderer');
      expect(source).toIncludeText("cv.addEventListener('webglcontextlost'");
      expect(source).toIncludeText("cv.removeEventListener('webglcontextlost'");
      expect(source).toIncludeText('data-iss-next-maneuver');
      expect(source).toIncludeText('data-iss-interior-fallback');
      expect(source).toIncludeText('function showInteriorFallback');
      expect(source).toIncludeText("shell.setAttribute('data-iss-webgl-state', 'unavailable')");
      expect(source).toIncludeText("shell.querySelectorAll('.iss-interior-controls button')");
      expect(source).toIncludeText('unavailableControls[controlIndex].disabled = true');
      expect(source).toIncludeText('.iss-interior-sim[data-iss-webgl-state="unavailable"] .iss-interior-controls{display:none}');
      expect(source).toIncludeText('chooseInterior');
      expect(source).toIncludeText('data-iss-lowg-sim');
      expect(source).toIncludeText('data-iss-lowg-trajectory');
      expect(source).toIncludeText('HANDRAIL CATCH WINDOW');
      expect(source).toIncludeText('var speed = impulse / 70');
      expect(source).toIncludeText('Learning guidance level');
      expect(source).toIncludeText('interiorInspected');
      expect(source).toIncludeText('data-iss-research-procedure');
      expect(source).toIncludeText('data-iss-capillary-visual');
      expect(source).toIncludeText('data-iss-maintenance-console');
      expect(source).toIncludeText('data-iss-maintenance-telemetry');
      expect(source).toIncludeText('data-iss-crew-notebook');
      expect(source).toIncludeText('data-iss-cabin-stow');
      expect(source).toIncludeText('data-iss-cabin-safety');
      expect(source).toIncludeText('LOOSE-ITEM SAFETY SCAN');
      expect(source).toIncludeText('data-iss-cupola-observation');
      expect(source).toIncludeText('data-iss-cupola-view');
      expect(source).toIncludeText('data-observation-state');
      expect(source).toIncludeText("'aria-describedby': 'iss-ask-count'");
      expect(source).toIncludeText("'aria-disabled': d.askLoading ? 'true' : undefined");
      expect(source).toIncludeText("'data-iss-quiz-next': 'true'");
      expect(source).toIncludeText('answerState');
    });
  });

  describe('mount smoke — every tab really renders', () => {
    let sheetsBefore = 0;
    beforeEach(() => {
      resetStemLab();
      loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
      sheetsBefore = document.styleSheets.length;
    });
    // A leaked sheet slows every later getComputedStyle call; fail where it starts.
    afterEach(() => {
      expect(document.styleSheets.length, 'stylesheets left behind by this test').toBe(sheetsBefore);
    });

    it('counts a completed bulky hatch transfer toward the free-flight quest', () => {
      const hook = window.StemLab._registry.spaceStation.questHooks.find((entry) => entry.id === 'iss_freeflight');
      const questData = (transferComplete) => ({
        spaceStation: {
          ...BASE,
          interiorNav: {
            ...BASE.interiorNav,
            preciseHatch: true,
            handrailStop: true,
            transferComplete,
          },
        },
      });

      expect(hook).toBeDefined();
      expect(hook.check(questData(false))).toBe(false);
      expect(hook.check(questData(true))).toBe(true);
    });

    it('seeds its state bucket from empty and lands on the 3-D station', () => {
      // The station is the tool's opening image: a fresh bucket must land on
      // the 3-D map, not on the crew-shift interior it used to open with.
      const html = mountWithSeed(null);
      expect(html).toIncludeText('Space Station');
      expect(html).toIncludeText('iss-station-stage');
      expect(html).toIncludeText('ISS // ORBITAL VIEW');
      expect(html).toIncludeText('Interactive 3-D model of the International Space Station');
      expect(html).toIncludeText('Fast facts');
      // ...and the interior surface is NOT what greets them.
      expect(html).not.toIncludeText('data-iss-room-transition');
      // The 3-D tab is also first in the tablist, so keyboard Home reaches it.
      const mapIndex = html.indexOf('iss-tab-map');
      const interiorIndex = html.indexOf('iss-tab-interior');
      expect(mapIndex).toBeGreaterThan(-1);
      expect(interiorIndex).toBeGreaterThan(mapIndex);
    });

    it('still opens the interior crew shift when that tab is selected', () => {
      const html = mountWithSeed({ ...BASE, tab: 'interior' });
      expect(html).toIncludeText('Float inside. Work like an astronaut.');
      expect(html).toIncludeText('Crew quarters');
      expect(html).toIncludeText('CONNECTED INTERIOR ROUTE');
      expect(html).toIncludeText('PORT TURN // NADIR DESCENT');
      expect(html).toIncludeText('data-iss-room-transition');
      expect(html).toIncludeText('Stow your sleep station');
      const routeStart = html.indexOf('YOU // HARMONY');
      const routeDestiny = html.indexOf('>DESTINY<');
      const routeUnity = html.indexOf('>UNITY<');
      const routeTranquility = html.indexOf('>TRANQUILITY<');
      const routeCupola = html.indexOf('>CUPOLA<');
      expect(routeStart).toBeGreaterThan(-1);
      expect(routeDestiny).toBeGreaterThan(routeStart);
      expect(routeUnity).toBeGreaterThan(routeDestiny);
      expect(routeTranquility).toBeGreaterThan(routeUnity);
      expect(routeCupola).toBeGreaterThan(routeTranquility);
    });

    it('switches between navigable 3-D and the equivalent accessible diagram', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: '3d' });
      try {
        const freeFlight = live.host.querySelector('[data-iss-interior-view="3d"]');
        const diagram = live.host.querySelector('[data-iss-interior-view="diagram"]');
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        const capillaryAction = live.host.querySelector('[data-iss-interior-capillary-action]');
        const capillaryReadout = live.host.querySelector('[data-iss-interior-capillary-readout]');
        const observationAction = live.host.querySelector('[data-iss-interior-observation-action]');
        const observationReadout = live.host.querySelector('[data-iss-interior-observation-readout]');
        const stowAction = live.host.querySelector('[data-iss-interior-stow-action]');
        const stowReadout = live.host.querySelector('[data-iss-interior-stow-readout]');
        const cabinAirflow = live.host.querySelector('[data-iss-interior-cabin-airflow]');
        expect(freeFlight.getAttribute('aria-pressed')).toBe('true');
        expect(diagram.getAttribute('aria-pressed')).toBe('false');
        expect(canvas).not.toBeNull();
        expect(canvas.getAttribute('role')).toBe('application');
        expect(canvas.getAttribute('aria-describedby')).toContain('iss-interior-flight-instructions');
        expect(canvas.getAttribute('aria-describedby')).toContain('iss-interior-flight-status');
        expect(canvas.getAttribute('aria-describedby')).toContain('iss-interior-transfer-readout');
        expect(canvas.getAttribute('aria-describedby')).toContain('iss-interior-stow-readout');
        expect(canvas.getAttribute('aria-describedby')).toContain('iss-interior-cabin-airflow');
        expect(canvas.getAttribute('aria-describedby')).toContain('iss-interior-observation-readout');
        expect(canvas.getAttribute('aria-keyshortcuts')).toContain('Space Home');
        expect(canvas.getAttribute('aria-keyshortcuts')).toContain('Q E B C V T P X ArrowUp');
        expect(live.host.querySelectorAll('[data-iss-nav-challenge]').length).toBe(10);
        expect(stowAction.tagName).toBe('BUTTON');
        expect(stowAction.textContent).toBe('Catch cabin item (X)');
        expect(stowAction.getAttribute('data-iss-interior-stow-status')).toBe('approach');
        expect(stowAction.getAttribute('data-iss-interior-stow-item')).toBe('none');
        expect(stowAction.getAttribute('data-iss-interior-stow-count')).toBe('0');
        expect(stowAction.getAttribute('aria-disabled')).toBe('false');
        expect(stowAction.getAttribute('aria-describedby')).toBe('iss-interior-stow-readout iss-interior-cabin-airflow');
        expect(stowReadout.getAttribute('role')).toBe('status');
        expect(stowReadout.getAttribute('aria-live')).toBe('polite');
        expect(stowReadout.textContent).toContain('zero point six five meters');
        expect(cabinAirflow.getAttribute('data-state')).toBe('risk');
        expect(cabinAirflow.getAttribute('role')).toBe('status');
        expect(cabinAirflow.textContent).toContain('Airflow risk');
        expect(capillaryAction).not.toBeNull();
        expect(capillaryAction.getAttribute('data-iss-interior-capillary-status')).toBe('approach');
        expect(capillaryAction.getAttribute('aria-pressed')).toBe('false');
        expect(capillaryAction.getAttribute('aria-describedby')).toBe('iss-interior-capillary-readout');
        expect(capillaryReadout).not.toBeNull();
        expect(capillaryReadout.getAttribute('role')).toBe('status');
        expect(capillaryReadout.textContent).toContain('2.7');
        expect(capillaryAction.textContent).toBe('Dose wick (V)');
        expect(observationAction.tagName).toBe('BUTTON');
        expect(observationAction.textContent).toBe('Capture Earth frame (P)');
        expect(observationAction.getAttribute('data-iss-interior-observation-status')).toBe('approach');
        expect(observationAction.getAttribute('data-iss-interior-observation-progress')).toBe('0');
        expect(observationAction.getAttribute('data-iss-interior-observation-target')).toBe('day');
        expect(observationAction.getAttribute('aria-pressed')).toBe('false');
        expect(observationAction.getAttribute('aria-describedby')).toBe('iss-interior-observation-readout');
        expect(observationReadout.getAttribute('role')).toBe('status');
        expect(observationReadout.getAttribute('aria-live')).toBe('polite');
        expect(observationReadout.textContent).toContain('one point two seconds');
        expect(live.host.querySelector('[data-iss-interior-reset-route]').tagName).toBe('BUTTON');
        expect(live.host.querySelector('.iss-interior-route-map')).not.toBeNull();
        expect(live.host.querySelector('.iss-route-schematic')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-rail-distance]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-next-label]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-next-distance]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-next-arrow]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-event]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-objective]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-reticle]').getAttribute('data-rate')).toBe('stopped');
        expect(live.host.querySelector('[data-iss-interior-orientation]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-braking]').textContent).toContain('NO DRIFT');
        expect(live.host.querySelector('[data-iss-interior-impact-flash]')).not.toBeNull();
        const cargoAction = live.host.querySelector('[data-iss-interior-cargo-action]');
        expect(cargoAction).not.toBeNull();
        expect(cargoAction.getAttribute('data-iss-interior-cargo-status')).toBe('loose');
        expect(cargoAction.getAttribute('aria-disabled')).toBe('true');
        expect(cargoAction.textContent).toContain('Catch pouch (C)');
        const worksiteAction = live.host.querySelector('[data-iss-interior-worksite-action]');
        expect(worksiteAction).not.toBeNull();
        expect(worksiteAction.getAttribute('data-iss-interior-worksite-status')).toBe('approach');
        expect(worksiteAction.getAttribute('aria-disabled')).toBe('false');
        expect(worksiteAction.textContent).toContain('Service filter (T)');
        expect(live.host.querySelector('[data-iss-next-maneuver]')).not.toBeNull();
        expect(live.host.querySelector('[data-iss-interior-mode]').textContent).toBe('STATIONARY');
        expect(live.host.textContent).toIncludeText('Rotation continues after release');
        expect(live.host.textContent).toIncludeText('Grab handrail');

        act(() => { diagram.click(); });
        expect(live.host.querySelector('[data-iss-interior-canvas]')).toBeNull();
        expect(canvas._issInteriorObservationAction).toBeNull();
        expect(canvas._issInteriorObservationCancel).toBeNull();
        expect(canvas._issInteriorEvent).toBeNull();
        expect(canvas._issInteriorWantRoom).toBeNull();
        expect(live.host.querySelector('[data-iss-interior-view="diagram"]').getAttribute('aria-pressed')).toBe('true');
        expect(live.host.querySelector('[data-iss-room-transition]').getAttribute('data-iss-room-transition')).toBe('harmony');

        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        expect(live.host.querySelector('[data-iss-interior-canvas]')).not.toBeNull();
      } finally {
        live.cleanup();
      }
    });

    it('preserves the physical flight room and route progress across a diagram detour', () => {
      const routeSeed = {
        ...BASE,
        tab: 'interior',
        interiorView: '3d',
        interiorRoom: 'unity',
        interiorSeen: { harmony: true, destiny: true, unity: true },
        interiorNav: { ...BASE.interiorNav, flightRoom: 'unity', routeStep: 2, orientationRecovered: true },
      };
      const live = mountLiveWithSeed(routeSeed);
      try {
        function canvasProgress() {
          const canvas = live.host.querySelector('[data-iss-interior-canvas]');
          return {
            room: canvas._issInteriorWantRoom,
            routeStep: canvas._issInteriorRouteStep,
            routeComplete: canvas._issInteriorRouteComplete,
            visited: canvas._issInteriorVisitedRooms,
            orientationDone: canvas._issInteriorOrientationDone,
          };
        }

        const firstCanvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(canvasProgress()).toMatchObject({
          room: 'unity',
          routeStep: 2,
          routeComplete: false,
          visited: { harmony: true, destiny: true, unity: true },
          orientationDone: true,
        });

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        expect(live.host.querySelector('[data-iss-interior-canvas]')).toBeNull();
        act(() => { live.host.querySelector('[data-iss-interior-room-select="cupola"]').click(); });
        expect(live.host.querySelector('[data-iss-room-transition]').getAttribute('data-iss-room-transition')).toBe('cupola');

        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        expect(live.host.querySelector('[data-iss-interior-canvas]')).not.toBe(firstCanvas);
        expect(canvasProgress()).toMatchObject({
          room: 'unity',
          routeStep: 2,
          routeComplete: false,
          visited: { harmony: true, destiny: true, unity: true },
          orientationDone: true,
        });
      } finally {
        live.cleanup();
      }
    });

    it('keeps a completed route sticky through diagram browsing until an explicit reset', () => {
      const live = mountLiveWithSeed({
        ...BASE,
        tab: 'interior',
        interiorView: '3d',
        interiorRoom: 'cupola',
        interiorSeen: { harmony: true, destiny: true, unity: true, tranquility: true, cupola: true },
        interiorNav: { ...BASE.interiorNav, flightRoom: 'cupola', routeStep: 4, routeComplete: true },
      });
      try {
        expect(live.host.querySelector('[data-iss-nav-challenge="route"]').className).toContain('is-complete');
        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-room-select="harmony"]').click(); });
        expect(live.host.querySelector('[data-iss-room-transition]').getAttribute('data-iss-room-transition')).toBe('harmony');

        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        let canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(canvas._issInteriorWantRoom).toBe('cupola');
        expect(canvas._issInteriorRouteStep).toBe(4);
        expect(canvas._issInteriorRouteComplete).toBe(true);
        expect(live.host.querySelector('[data-iss-nav-challenge="route"]').className).toContain('is-complete');

        act(() => { live.host.querySelector('[data-iss-interior-reset-route]').click(); });
        canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(canvas._issInteriorWantRoom).toBe('harmony');
        expect(canvas._issInteriorRouteStep).toBe(0);
        expect(canvas._issInteriorRouteComplete).toBe(false);
        expect(live.host.querySelector('[data-iss-nav-challenge="route"]').className).not.toContain('is-complete');
      } finally {
        live.cleanup();
      }
    });

    it('persists free-flight hatch, handrail, and loose-object challenges', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: '3d' });
      try {
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(typeof canvas._issInteriorEvent).toBe('function');
        act(() => {
          canvas._issInteriorEvent({ type: 'hatch', from: 'harmony', to: 'destiny', speed: 0.32, controlled: true });
          canvas._issInteriorEvent({ type: 'rail-grab', room: 'destiny', speed: 0.21 });
          canvas._issInteriorEvent({ type: 'cargo-clear', room: 'unity', speed: 0.18 });
          canvas._issInteriorEvent({ type: 'collision', room: 'unity', speed: 0.44, normalSpeed: 0.31 });
        });
        expect(live.host.querySelector('[data-iss-interior-3d]').getAttribute('data-iss-interior-3d')).toBe('destiny');
        expect(live.host.querySelector('[data-iss-nav-challenge="hatch"]').className).toContain('is-complete');
        expect(live.host.querySelector('[data-iss-nav-challenge="rail"]').className).toContain('is-complete');
        expect(live.host.querySelector('[data-iss-nav-challenge="cargo"]').className).toContain('is-complete');
        expect(live.host.textContent).toIncludeText('1 hatch transitions / 1 rail catches');
        expect(live.host.textContent).toIncludeText('1 hull contacts');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('3 of 10 complete');

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        expect(live.host.querySelector('[data-iss-nav-challenge="hatch"]').className).toContain('is-complete');
        expect(live.host.querySelector('[data-iss-nav-challenge="rail"]').className).toContain('is-complete');
        expect(live.host.querySelector('[data-iss-nav-challenge="cargo"]').className).toContain('is-complete');
      } finally {
        live.cleanup();
      }
    });

    it('persists idempotent 3-D bulky hatch-transfer outcomes and resets the drill explicitly', () => {
      const live = mountLiveWithSeed({
        ...BASE,
        tab: 'interior',
        interiorView: '3d',
        interiorRoom: 'unity',
        interiorNav: { ...BASE.interiorNav, flightRoom: 'unity' },
      });
      try {
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        const transferAction = live.host.querySelector('[data-iss-interior-transfer-action]');
        const transferReadout = live.host.querySelector('[data-iss-interior-transfer-readout]');

        expect(typeof canvas._issInteriorEvent).toBe('function');
        expect(transferAction.tagName).toBe('BUTTON');
        expect(transferAction.textContent).toContain('(B)');
        expect(transferAction.getAttribute('aria-describedby')).toBe('iss-interior-transfer-readout');
        expect(transferReadout.getAttribute('role')).toBe('status');
        expect(transferReadout.getAttribute('aria-live')).toBe('polite');
        expect(transferReadout.textContent).toContain('Harmony');

        act(() => {
          canvas._issInteriorEvent({ type: 'transfer-attempt', room: 'harmony', attempt: 1, source: '3d' });
          canvas._issInteriorEvent({ type: 'transfer-contact', room: 'harmony', attempt: 1, contact: 1, radial: 0.91, safeRadius: 0.70, source: '3d' });
          canvas._issInteriorEvent({ type: 'transfer-contact', room: 'harmony', attempt: 1, contact: 1, radial: 0.91, safeRadius: 0.70, source: '3d' });
        });
        let transferChallenge = live.host.querySelector('[data-iss-nav-challenge="transfer"]');
        expect(canvas._issInteriorWantRoom).toBe('harmony');
        expect(live.host.querySelector('[data-iss-interior-3d]').getAttribute('data-iss-interior-3d')).toBe('harmony');
        expect(live.host.querySelector('[data-iss-interior-transfer-readout]').textContent).toContain('Physical');
        expect(transferChallenge.className).not.toContain('is-complete');
        expect(transferChallenge.textContent).toContain('clipped the rim');
        expect(canvas._issInteriorTransferAttempts).toBe(1);
        expect(canvas._issInteriorTransferContacts).toBe(1);
        expect(canvas._issInteriorTransferCompletions).toBe(0);
        expect(canvas._issInteriorTransferComplete).toBe(false);

        act(() => {
          canvas._issInteriorEvent({ type: 'transfer-attempt', room: 'harmony', attempt: 2, source: '3d' });
          canvas._issInteriorEvent({ type: 'transfer-complete', room: 'destiny', attempt: 2, completion: 1, radial: 0.31, safeRadius: 0.70, source: '3d' });
          canvas._issInteriorEvent({ type: 'transfer-complete', room: 'destiny', attempt: 2, completion: 1, radial: 0.31, safeRadius: 0.70, source: '3d' });
        });
        transferChallenge = live.host.querySelector('[data-iss-nav-challenge="transfer"]');
        expect(transferChallenge.className).toContain('is-complete');
        expect(transferChallenge.textContent).toContain('docked in Destiny');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('1 of 10 complete');
        expect(canvas._issInteriorTransferAttempts).toBe(2);
        expect(canvas._issInteriorTransferContacts).toBe(1);
        expect(canvas._issInteriorTransferCompletions).toBe(1);
        expect(canvas._issInteriorTransferComplete).toBe(true);

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        let restoredCanvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(restoredCanvas._issInteriorWantRoom).toBe('harmony');
        expect(restoredCanvas._issInteriorTransferAttempts).toBe(2);
        expect(restoredCanvas._issInteriorTransferContacts).toBe(1);
        expect(restoredCanvas._issInteriorTransferCompletions).toBe(1);
        expect(restoredCanvas._issInteriorTransferComplete).toBe(true);

        act(() => {
          restoredCanvas._issInteriorEvent({ type: 'transfer-complete', room: 'destiny', attempt: 9, completion: 9, radial: 0.2, safeRadius: 0.70, source: '3d' });
        });
        expect(restoredCanvas._issInteriorTransferCompletions).toBe(1);
        expect(restoredCanvas._issInteriorTransferComplete).toBe(true);

        act(() => { live.host.querySelector('[data-iss-interior-reset-route]').click(); });
        restoredCanvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(restoredCanvas._issInteriorWantRoom).toBe('harmony');
        expect(restoredCanvas._issInteriorTransferAttempts).toBe(0);
        expect(restoredCanvas._issInteriorTransferContacts).toBe(0);
        expect(restoredCanvas._issInteriorTransferCompletions).toBe(0);
        expect(restoredCanvas._issInteriorTransferComplete).toBe(false);
        expect(live.host.querySelector('[data-iss-nav-challenge="transfer"]').className).not.toContain('is-complete');
      } finally {
        live.cleanup();
      }
    });

    it('persists a pre-teleport transfer cancellation without changing outcome counts', () => {
      const live = mountLiveWithSeed({
        ...BASE,
        tab: 'interior',
        interiorView: '3d',
        interiorRoom: 'harmony',
        interiorNav: { ...BASE.interiorNav, flightRoom: 'harmony' },
      });
      try {
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(typeof canvas._issInteriorEvent).toBe('function');

        act(() => {
          canvas._issInteriorEvent({ type: 'transfer-attempt', room: 'harmony', attempt: 1, source: '3d' });
          canvas._issInteriorEvent({ type: 'transfer-cancelled', room: 'harmony', to: 'unity', attempt: 1, source: '3d' });
        });
        expect(canvas._issInteriorWantRoom).toBe('unity');
        expect(live.host.querySelector('[data-iss-interior-3d]').getAttribute('data-iss-interior-3d')).toBe('unity');
        expect(canvas._issInteriorTransferAttempts).toBe(1);
        expect(canvas._issInteriorTransferContacts).toBe(0);
        expect(canvas._issInteriorTransferCompletions).toBe(0);
        expect(canvas._issInteriorTransferComplete).toBe(false);
        expect(live.host.querySelector('[data-iss-interior-transfer-readout]').textContent).toContain('cancelled');

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        const restoredCanvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(restoredCanvas._issInteriorWantRoom).toBe('unity');
        expect(restoredCanvas._issInteriorTransferAttempts).toBe(1);
        expect(restoredCanvas._issInteriorTransferContacts).toBe(0);
        expect(restoredCanvas._issInteriorTransferCompletions).toBe(0);
        expect(restoredCanvas._issInteriorTransferComplete).toBe(false);
      } finally {
        live.cleanup();
      }
    });
    it('offers an equivalent hatch-transfer diagram without moving the saved flight room', () => {
      const live = mountLiveWithSeed({
        ...BASE,
        tab: 'interior',
        interiorView: 'diagram',
        interiorRoom: 'harmony',
        interiorSeen: { harmony: true, destiny: true, unity: true },
        interiorNav: { ...BASE.interiorNav, flightRoom: 'unity', routeStep: 2 },
      });
      try {
        const transferDiagram = live.host.querySelector('[data-iss-hatch-transfer-diagram]');
        const clearanceDiagram = live.host.querySelector('[data-iss-hatch-transfer-clearance-cue]');
        const transferGroup = live.host.querySelector('[role="group"][aria-label="Choose a bulky hatch-transfer method"]');
        const transferDiagramReadout = live.host.querySelector('[data-iss-hatch-transfer-diagram-readout]');
        const choice = (id) => live.host.querySelector('[data-iss-hatch-transfer-choice="' + id + '"]');
        expect(transferDiagram).not.toBeNull();
        expect(transferDiagram.getAttribute('data-iss-hatch-transfer-status')).toBe('ready');
        expect(transferDiagram.getAttribute('aria-labelledby')).toBe('iss-hatch-transfer-diagram-title');
        expect(live.host.querySelector('#iss-hatch-transfer-diagram-title').textContent).toContain('Harmony');
        expect(clearanceDiagram.getAttribute('role')).toBe('img');
        expect(clearanceDiagram.getAttribute('aria-labelledby')).toBe('iss-hatch-transfer-svg-title iss-hatch-transfer-svg-desc');
        expect(clearanceDiagram.querySelector('title').textContent).toContain('combined body and bag');
        expect(clearanceDiagram.querySelector('desc').textContent).toContain('safe center zone');
        expect(transferGroup).not.toBeNull();
        expect(transferDiagramReadout.getAttribute('role')).toBe('status');
        expect(transferDiagramReadout.getAttribute('aria-live')).toBe('polite');
        expect(transferDiagramReadout.getAttribute('aria-atomic')).toBe('true');
        ['aligned', 'body-only', 'pull-hard'].forEach((id) => expect(choice(id).tagName).toBe('BUTTON'));

        act(() => { choice('body-only').click(); });
        expect(live.host.querySelector('[data-iss-hatch-transfer-diagram]').getAttribute('data-iss-hatch-transfer-status')).toBe('contact');
        expect(live.host.querySelector('[data-iss-hatch-transfer-diagram-readout]').textContent).toContain('saved 3-D flight room is unchanged');
        act(() => { choice('pull-hard').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        let canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(canvas._issInteriorWantRoom).toBe('unity');
        expect(canvas._issInteriorTransferAttempts).toBe(2);
        expect(canvas._issInteriorTransferContacts).toBe(2);
        expect(canvas._issInteriorTransferCompletions).toBe(0);
        expect(canvas._issInteriorTransferComplete).toBe(false);
        expect(live.host.querySelector('[data-iss-nav-challenge="transfer"]').className).not.toContain('is-complete');

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-room-select="harmony"]').click(); });
        expect(live.host.querySelector('[data-iss-hatch-transfer-diagram]')).not.toBeNull();
        act(() => { choice('aligned').click(); });
        expect(live.host.querySelector('[data-iss-hatch-transfer-diagram]').getAttribute('data-iss-hatch-transfer-status')).toBe('complete');
        expect(live.host.querySelector('[data-iss-hatch-transfer-diagram-readout]').textContent).toContain('bag docked in Destiny');
        ['aligned', 'body-only', 'pull-hard'].forEach((id) => expect(choice(id).disabled).toBe(true));
        act(() => { choice('aligned').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(canvas._issInteriorWantRoom).toBe('unity');
        expect(canvas._issInteriorTransferAttempts).toBe(3);
        expect(canvas._issInteriorTransferContacts).toBe(2);
        expect(canvas._issInteriorTransferCompletions).toBe(1);
        expect(canvas._issInteriorTransferComplete).toBe(true);
        expect(live.host.querySelector('[data-iss-nav-challenge="transfer"]').className).toContain('is-complete');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('1 of 10 complete');
      } finally {
        live.cleanup();
      }
    });
    it('persists a secured cargo pouch as the existing loose-object challenge', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: '3d' });
      try {
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(typeof canvas._issInteriorEvent).toBe('function');
        expect(live.host.querySelectorAll('[data-iss-nav-challenge]').length).toBe(10);

        act(() => {
          canvas._issInteriorEvent({ type: 'cargo-caught', room: 'unity', speed: 0.12, relativeSpeed: 0.04, distance: 0.42 });
          canvas._issInteriorEvent({ type: 'cargo-secured', room: 'unity', speed: 0, distance: 0.28 });
        });

        const cargoChallenge = live.host.querySelector('[data-iss-nav-challenge="cargo"]');
        expect(live.host.querySelectorAll('[data-iss-nav-challenge]').length).toBe(10);
        expect(cargoChallenge.className).toContain('is-complete');
        expect(cargoChallenge.textContent).toContain('Pouch caught and restrained safely in Unity.');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('1 of 10 complete');
        expect(live.host.textContent).toIncludeText('1 pouches secured');

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        expect(live.host.querySelectorAll('[data-iss-nav-challenge]').length).toBe(10);
        expect(live.host.querySelector('[data-iss-nav-challenge="cargo"]').className).toContain('is-complete');
        expect(live.host.querySelector('[data-iss-nav-challenge="cargo"]').textContent).toContain('Pouch caught and restrained safely in Unity.');
      } finally {
        live.cleanup();
      }
    });

    it('persists idempotent Harmony cabin stow progress and completes only after three restraints', () => {
      const live = mountLiveWithSeed({
        ...BASE, tab: 'interior', interiorView: '3d', interiorRoom: 'harmony',
        interiorNav: { ...BASE.interiorNav, flightRoom: 'harmony' },
      });
      try {
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        const stowControl = live.host.querySelector('[data-iss-interior-stow-action]');
        const diagramItems = [...live.host.querySelectorAll('[data-iss-cabin-stow] button')];
        expect(typeof canvas._issInteriorEvent).toBe('function');
        expect(diagramItems).toHaveLength(3);
        expect(diagramItems.map((button) => button.textContent)).toEqual(expect.arrayContaining([
          expect.stringContaining('Sleeping bag'),
          expect.stringContaining('Crew tablet'),
          expect.stringContaining('Damp washcloth'),
        ]));
        diagramItems.forEach((button) => {
          expect(button.disabled).toBe(true);
          expect(button.getAttribute('aria-disabled')).toBe('true');
          expect(button.textContent).toContain('Use X in the 3-D simulation');
        });

        act(() => {
          canvas._issInteriorEvent({ type: 'stow-airflow-warning', room: 'harmony', item: 'cloth', distance: 0.42 });
          canvas._issInteriorEvent({ type: 'stow-airflow-warning', room: 'harmony', item: 'cloth', distance: 0.42 });
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 1 });
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 1 });
          canvas._issInteriorEvent({ type: 'stow-caught', room: 'harmony', item: 'bag', distance: 0.51, relativeSpeed: 0.12, attempt: 1 });
          canvas._issInteriorEvent({ type: 'stow-caught', room: 'harmony', item: 'bag', distance: 0.51, relativeSpeed: 0.12, attempt: 1 });
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 2, held: 'bag' });
          canvas._issInteriorEvent({ type: 'stow-secured', room: 'harmony', item: 'bag', count: 1, attempt: 2, braced: true });
          canvas._issInteriorEvent({ type: 'stow-secured', room: 'harmony', item: 'bag', count: 1, attempt: 2, braced: true });
        });
        let stowChallenge = live.host.querySelector('[data-iss-nav-challenge="stow"]');
        expect(stowChallenge.className).not.toContain('is-complete');
        expect(stowChallenge.textContent).toContain('loose item reached the air return');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('0 of 10 complete');
        expect(canvas._issInteriorCabinStow).toEqual({ bag: true });
        expect(canvas._issInteriorStowItems).toMatchObject({ bag: 'secured' });
        expect(canvas._issInteriorStowAttempts).toBe(2);
        expect(canvas._issInteriorStowCatches).toBe(1);
        expect(canvas._issInteriorStowSecures).toBe(1);
        expect(canvas._issInteriorStowWarnings).toBe(1);
        expect(live.host.textContent).toIncludeText('0 / 5 jobs');

        act(() => {
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 3 });
          canvas._issInteriorEvent({ type: 'stow-caught', room: 'harmony', item: 'tablet', distance: 0.6, relativeSpeed: 0.19, attempt: 3 });
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 4, held: 'tablet' });
          canvas._issInteriorEvent({ type: 'stow-secured', room: 'harmony', item: 'tablet', count: 2, attempt: 4, braced: true });
        });
        expect(live.host.querySelector('[data-iss-nav-challenge="stow"]').className).not.toContain('is-complete');
        expect(canvas._issInteriorCabinStow).toEqual({ bag: true, tablet: true });
        expect(live.host.textContent).toIncludeText('0 / 5 jobs');

        act(() => {
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 5 });
          canvas._issInteriorEvent({ type: 'stow-caught', room: 'harmony', item: 'cloth', distance: 0.65, relativeSpeed: 0.2, attempt: 5 });
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 6, held: 'cloth' });
          canvas._issInteriorEvent({ type: 'stow-secured', room: 'harmony', item: 'cloth', count: 3, attempt: 6, braced: true });
          canvas._issInteriorEvent({ type: 'stow-secured', room: 'harmony', item: 'cloth', count: 3, attempt: 6, braced: true });
        });
        stowChallenge = live.host.querySelector('[data-iss-nav-challenge="stow"]');
        expect(stowChallenge.className).toContain('is-complete');
        expect(stowChallenge.textContent).toContain('Harmony air return clear');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('1 of 10 complete');
        expect(live.host.textContent).toIncludeText('0 / 5 jobs');
        expect(stowControl.disabled).toBe(true);
        expect(stowControl.getAttribute('data-iss-interior-stow-status')).toBe('complete');
        expect(stowControl.getAttribute('data-iss-interior-stow-count')).toBe('3');
        expect(live.host.querySelector('[data-iss-interior-cabin-airflow]').getAttribute('data-state')).toBe('clear');

        act(() => {
          canvas._issInteriorEvent({ type: 'stow-complete', room: 'harmony', count: 3, attempt: 6, source: '3d' });
          canvas._issInteriorEvent({ type: 'stow-complete', room: 'harmony', count: 3, attempt: 6, source: '3d' });
        });
        expect(live.host.textContent).toIncludeText('1 / 5 jobs');
        expect(live.host.textContent).toIncludeText('Crew attempts: 1');
        expect(canvas._issInteriorCabinComplete).toBe(true);
        expect(canvas._issInteriorStowAttempts).toBe(6);
        expect(canvas._issInteriorStowCatches).toBe(3);
        expect(canvas._issInteriorStowSecures).toBe(3);
        expect(canvas._issInteriorStowWarnings).toBe(1);

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        expect(live.host.querySelector('[data-iss-cabin-safety]').getAttribute('data-iss-cabin-safety')).toBe('clear');
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        const restoredCanvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(restoredCanvas).not.toBe(canvas);
        expect(restoredCanvas._issInteriorCabinStow).toEqual({ bag: true, tablet: true, cloth: true });
        expect(restoredCanvas._issInteriorStowItems).toEqual({ bag: 'secured', tablet: 'secured', cloth: 'secured' });
        expect(restoredCanvas._issInteriorCabinComplete).toBe(true);
        expect(restoredCanvas._issInteriorStowAttempts).toBe(6);
        expect(restoredCanvas._issInteriorStowCatches).toBe(3);
        expect(restoredCanvas._issInteriorStowSecures).toBe(3);
        expect(restoredCanvas._issInteriorStowWarnings).toBe(1);
        expect(live.host.querySelector('[data-iss-nav-challenge="stow"]').className).toContain('is-complete');
      } finally {
        live.cleanup();
      }
    });

    it('persists reaction torque and a completed braced maintenance challenge', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: '3d', interiorRoom: 'tranquility' });
      try {
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(typeof canvas._issInteriorEvent).toBe('function');

        act(() => {
          canvas._issInteriorEvent({ type: 'worksite-reaction', room: 'tranquility', angularImpulse: 0.14, attempt: 1 });
        });
        const worksiteChallenge = live.host.querySelector('[data-iss-nav-challenge="worksite"]');
        expect(worksiteChallenge.className).not.toContain('is-complete');
        expect(worksiteChallenge.textContent).toContain('The tool spun you');
        expect(live.host.textContent).toIncludeText('1 reaction-torque events');

        act(() => {
          canvas._issInteriorEvent({ type: 'worksite-complete', room: 'tranquility', duration: 1.5, maxSpeed: 0, maxAngularSpeed: 0, attempt: 2, braced: true });
        });
        expect(worksiteChallenge.className).toContain('is-complete');
        expect(worksiteChallenge.textContent).toContain('Tranquility filter serviced without losing body position.');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('1 of 10 complete');
        expect(live.host.textContent).toIncludeText('1 filters serviced');

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        expect(live.host.querySelector('[data-iss-nav-challenge="worksite"]').className).toContain('is-complete');
      } finally {
        live.cleanup();
      }
    });

    it('records Destiny dosing retries and restores a completed capillary transfer', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: '3d', interiorRoom: 'destiny' });
      try {
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        const doseButton = live.host.querySelector('[data-iss-interior-capillary-action]');
        const valveCalls = [];
        let quietCancels = 0;
        expect(typeof canvas._issInteriorEvent).toBe('function');
        expect(doseButton.tagName).toBe('BUTTON');
        expect(doseButton.getAttribute('aria-pressed')).toBe('false');

        canvas._issInteriorCapillaryAction = (on) => valveCalls.push(on);
        canvas._issInteriorCapillaryCancel = () => { quietCancels += 1; };
        act(() => {
          doseButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          doseButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }));
          doseButton.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
          doseButton.dispatchEvent(new Event('pointerout', { bubbles: true, cancelable: true }));
        });
        expect(valveCalls).toEqual([true, false]);
        expect(quietCancels).toBe(2);

        act(() => {
          canvas._issInteriorEvent({ type: 'capillary-underfill', room: 'destiny', dose: 1.2, duration: 0.92, attempt: 1 });
          canvas._issInteriorEvent({ type: 'capillary-overflow', room: 'destiny', dose: 3.3, duration: 2.54, attempt: 2 });
          canvas._issInteriorEvent({ type: 'capillary-interrupted', room: 'destiny', dose: 1.7, duration: 1.31, attempt: 3, reason: 'alignment' });
        });

        let capillaryChallenge = live.host.querySelector('[data-iss-nav-challenge="capillary"]');
        expect(capillaryChallenge.className).not.toContain('is-complete');
        expect(capillaryChallenge.textContent).toContain('Overflow stayed contained');
        expect(live.host.textContent).toIncludeText('1 wick underfills');
        expect(live.host.textContent).toIncludeText('1 contained overflows');
        expect(live.host.textContent).toIncludeText('0 wick transfers');
        expect(live.host.textContent).toIncludeText('3-D transfer interrupted');
        expect(canvas._issInteriorCapillaryComplete).toBe(false);
        expect(canvas._issInteriorCapillaryAttempts).toBe(3);
        expect(canvas._issInteriorCapillaryUnderfills).toBe(1);
        expect(canvas._issInteriorCapillaryOverflows).toBe(1);
        expect(canvas._issInteriorCapillaryInterruptions).toBe(1);

        act(() => {
          canvas._issInteriorEvent({ type: 'capillary-complete', room: 'destiny', dose: 2.94, duration: 2.26, attempt: 4, maxSpeed: 0.01, maxAngularSpeed: 0.02, stable: true });
        });

        capillaryChallenge = live.host.querySelector('[data-iss-nav-challenge="capillary"]');
        expect(capillaryChallenge.className).toContain('is-complete');
        expect(capillaryChallenge.textContent).toContain('2.7');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('1 of 10 complete');
        expect(live.host.textContent).toIncludeText('1 wick transfers');
        expect(live.host.textContent).toIncludeText('Wick primed in 3-D at 2.94 mL');
        expect(live.host.querySelector('[data-iss-capillary-visual]').getAttribute('data-iss-capillary-visual')).toBe('2');
        expect(canvas._issInteriorCapillaryComplete).toBe(true);
        expect(canvas._issInteriorCapillaryAttempts).toBe(4);
        expect(canvas._issInteriorCapillaryTransfers).toBe(1);

        expect(canvas._issInteriorCapillaryLastDose).toBeCloseTo(2.94, 5);
        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        const restoredCanvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(restoredCanvas).not.toBe(canvas);
        expect(restoredCanvas._issInteriorCapillaryComplete).toBe(true);
        expect(restoredCanvas._issInteriorCapillaryAttempts).toBe(4);
        expect(restoredCanvas._issInteriorCapillaryUnderfills).toBe(1);
        expect(restoredCanvas._issInteriorCapillaryOverflows).toBe(1);
        expect(restoredCanvas._issInteriorCapillaryInterruptions).toBe(1);
        expect(restoredCanvas._issInteriorCapillaryTransfers).toBe(1);
        expect(live.host.querySelector('[data-iss-nav-challenge="capillary"]').className).toContain('is-complete');
        expect(restoredCanvas._issInteriorCapillaryLastDose).toBeCloseTo(2.94, 5);
        expect(live.host.textContent).toIncludeText('1 wick transfers');
      } finally {
        live.cleanup();
      }
    });

    it('persists Cupola frame failures, capture, and canonical shutter closeout', () => {
      const live = mountLiveWithSeed({
        ...BASE,
        tab: 'interior',
        interiorView: '3d',
        interiorRoom: 'cupola',
        interiorSeen: { harmony: true, destiny: true, unity: true, tranquility: true, cupola: true },
        interiorNav: { ...BASE.interiorNav, flightRoom: 'cupola', routeStep: 4 },
      });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        const canvas = live.host.querySelector('[data-iss-interior-canvas]');
        const captureControl = live.host.querySelector('[data-iss-interior-observation-action]');
        const readout = live.host.querySelector('[data-iss-interior-observation-readout]');
        const diagramCapture = findButton('Use 3-D camera control (P)');
        const actionCalls = [];
        const cancelCalls = [];

        expect(canvas._issInteriorWantRoom).toBe('cupola');
        expect(diagramCapture.disabled).toBe(true);
        expect(captureControl.tagName).toBe('BUTTON');
        expect(captureControl.getAttribute('aria-describedby')).toBe('iss-interior-observation-readout');
        expect(readout.getAttribute('role')).toBe('status');
        expect(readout.getAttribute('aria-live')).toBe('polite');
        canvas._issInteriorObservationAction = (on) => actionCalls.push(on);
        canvas._issInteriorObservationCancel = (quiet) => cancelCalls.push(quiet);
        act(() => {
          captureControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          captureControl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }));
          captureControl.dispatchEvent(new Event('pointercancel', { bubbles: true, cancelable: true }));
          captureControl.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        });
        expect(actionCalls).toEqual([true, false]);
        expect(cancelCalls).toEqual([true, true]);

        act(() => {
          canvas._issInteriorEvent({ type: 'observation-blurred', room: 'cupola', target: 'aurora', duration: 0.42, attempt: 1, alignment: 0.99 });
          canvas._issInteriorEvent({ type: 'observation-interrupted', room: 'cupola', target: 'aurora', attempt: 2, reason: 'bracing' });
          canvas._issInteriorEvent({ type: 'observation-captured', room: 'cupola', target: 'aurora', duration: 1.2, attempt: 3, braced: true, source: '3d' });
        });

        let observationChallenge = live.host.querySelector('[data-iss-nav-challenge="observation"]');
        expect(observationChallenge.className).not.toContain('is-complete');
        expect(observationChallenge.textContent).toContain('Press P again to close all seven shutters');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('0 of 10 complete');
        expect(live.host.textContent).toIncludeText('1 blurred Earth frames');
        expect(live.host.textContent).toIncludeText('1 interrupted frame locks');
        expect(live.host.textContent).toIncludeText('1 Earth frames captured');
        expect(canvas._issInteriorCupolaTarget).toBe('aurora');
        expect(canvas._issInteriorCupolaCaptured).toBe(true);
        expect(canvas._issInteriorCupolaShutters).toBe(false);
        expect(canvas._issInteriorObservationAttempts).toBe(3);
        expect(canvas._issInteriorObservationBlurs).toBe(1);
        expect(canvas._issInteriorObservationInterruptions).toBe(1);
        expect(canvas._issInteriorObservationCaptures).toBe(1);

        act(() => { live.host.querySelector('[data-iss-interior-view="diagram"]').click(); });
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('captured');
        act(() => { live.host.querySelector('[data-iss-interior-view="3d"]').click(); });
        const restoredCanvas = live.host.querySelector('[data-iss-interior-canvas]');
        expect(restoredCanvas).not.toBe(canvas);
        expect(restoredCanvas._issInteriorCupolaTarget).toBe('aurora');
        expect(restoredCanvas._issInteriorCupolaCaptured).toBe(true);
        expect(restoredCanvas._issInteriorObservationAttempts).toBe(3);
        expect(restoredCanvas._issInteriorObservationBlurs).toBe(1);
        expect(restoredCanvas._issInteriorObservationInterruptions).toBe(1);
        expect(restoredCanvas._issInteriorObservationCaptures).toBe(1);

        act(() => {
          restoredCanvas._issInteriorEvent({ type: 'observation-secured', room: 'cupola', target: 'aurora', source: '3d' });
        });
        act(() => { restoredCanvas._issInteriorSecureCupola(); });
        observationChallenge = live.host.querySelector('[data-iss-nav-challenge="observation"]');
        expect(observationChallenge.className).toContain('is-complete');
        expect(observationChallenge.textContent).toContain('all seven pressure-window shutters secured');
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('secured');
        expect(live.host.textContent).toIncludeText('1 / 5 jobs');
      } finally {
        live.cleanup();
      }
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
      expect(research).toIncludeText('Destiny laboratory');
      expect(research).toIncludeText('plant-water experiment');
      expect(research).toIncludeText('Secure the sample');
      expect(research).toIncludeText('Prime the wick');
      expect(research).toIncludeText('Start camera + baseline');
      expect(research).toIncludeText('data-iss-capillary-visual');
      expect(research).toIncludeText('CHAMBER UNLATCHED');
      const maintenance = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'tranquility' });
      expect(maintenance).toIncludeText('Restore cabin airflow');
      expect(maintenance).toIncludeText('clogged inlet filter');
      expect(maintenance).toIncludeText('data-iss-maintenance-telemetry');
      expect(maintenance).toIncludeText('DIAGNOSE');
      const lowG = mountWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity' });
      expect(lowG).toIncludeText('Low-g practice');
      expect(lowG).toIncludeText('Push impulse');
      expect(lowG).toIncludeText('Predicted speed');
      expect(lowG).toIncludeText('data-iss-lowg-trajectory');
      expect(lowG).toIncludeText('HANDRAIL CATCH WINDOW');
      expect(lowG).toIncludeText('NO DRAG');
      expect(lowG).toIncludeText('Δv = impulse ÷ 70 kg');
    });

    it('turns Harmony morning life into a three-item freefall stow scan', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: 'diagram', interiorRoom: 'harmony' });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        expect(live.host.textContent).toIncludeText('0 / 3 secured');
        expect(live.host.querySelector('[data-iss-cabin-safety]').getAttribute('data-iss-cabin-safety')).toBe('risk-3');
        expect(live.host.textContent).toIncludeText('3 LOOSE OBJECTS');
        act(() => { findButton('Sleeping bag').click(); });
        expect(live.host.textContent).toIncludeText('1 / 3 secured');
        expect(live.host.querySelector('[data-iss-cabin-safety]').getAttribute('data-iss-cabin-safety')).toBe('risk-2');
        expect(live.host.textContent).toIncludeText('BAG // SECURED');
        act(() => { findButton('Crew tablet').click(); });
        act(() => { findButton('Damp washcloth').click(); });
        expect(live.host.textContent).toIncludeText('Cabin clear');
        expect(live.host.textContent).toIncludeText('Air return unobstructed');
        expect(live.host.querySelector('[data-iss-cabin-safety]').getAttribute('data-iss-cabin-safety')).toBe('clear');
        expect(live.host.textContent).toIncludeText('CABIN CLEAR');
        expect(live.host.textContent).toIncludeText('1 / 5 jobs');
        expect(live.host.textContent).toIncludeText('Crew attempts: 1 • first-try bonus earned');
      } finally {
        live.cleanup();
      }
    });

    it('runs a Cupola Earth-observation capture before shutter closeout', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: 'diagram', interiorRoom: 'cupola', interiorNav: { ...BASE.interiorNav, flightRoom: 'cupola' } });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        expect(findButton('Close shutters').disabled).toBe(true);
        expect(live.host.querySelector('[data-iss-cupola-view]').getAttribute('data-iss-cupola-view')).toBe('day');
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('targeting');
        act(() => { findButton('Aurora curtain').click(); });
        expect(live.host.textContent).toIncludeText('Low light • steady camera');
        expect(live.host.querySelector('[data-iss-cupola-view]').getAttribute('data-iss-cupola-view')).toBe('aurora');
        act(() => { findButton('Capture image').click(); });
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('captured');
        expect(live.host.textContent).toIncludeText('FRAME CAPTURED');
        expect(live.host.textContent).toIncludeText('Aurora traces charged particles');
        expect(findButton('Close shutters').disabled).toBe(false);
        act(() => { findButton('Close shutters').click(); });
        expect(live.host.textContent).toIncludeText('WINDOWS SECURED');
        expect(live.host.textContent).toIncludeText('SHUTTERS CLOSED');
        expect(live.host.querySelector('[data-observation-state]').getAttribute('data-observation-state')).toBe('secured');
        expect(live.host.textContent).toIncludeText('1 / 5 jobs');
        expect(live.host.textContent).toIncludeText('Observation logged and Cupola secure');
      } finally {
        live.cleanup();
      }
    });
    it('enforces the Destiny research sequence and persists the scientific result', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'destiny' });
      try {
        const findButton = (label) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(label));
        act(() => { findButton('Prime the wick').click(); });
        expect(live.host.textContent).toIncludeText('Sequence hold: complete step 1');
        act(() => { findButton('Secure the sample').click(); });
        expect(live.host.textContent).toIncludeText('Continue to step 2');
        expect(live.host.querySelector('[data-iss-capillary-visual]').getAttribute('data-iss-capillary-visual')).toBe('1');
        act(() => { findButton('Prime the wick').click(); });
        expect(live.host.textContent).toIncludeText('Continue to step 3');
        expect(live.host.querySelector('[data-iss-capillary-visual]').getAttribute('data-iss-capillary-visual')).toBe('2');
        expect(live.host.textContent).toIncludeText('CAPILLARY FRONT AT ROOTS');
        act(() => { findButton('Start camera + baseline').click(); });
        expect(live.host.textContent).toIncludeText('1 / 5 jobs');
        expect(live.host.textContent).toIncludeText('Baseline logged');
        expect(live.host.querySelector('[data-iss-capillary-visual]').getAttribute('data-iss-capillary-visual')).toBe('3');
        expect(live.host.textContent).toIncludeText('BASELINE RECORDING');
        expect(live.host.textContent).toIncludeText('Science you used:');
        expect(live.host.textContent).toIncludeText('Crew attempts: 2');
      } finally {
        live.cleanup();
      }
    });
    it('tracks inspected hotspots and lets learners remove guided support', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'harmony' });
      try {
        expect(live.host.textContent).toIncludeText('Flight hint:');
        const independent = [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Independent'));
        act(() => { independent.click(); });
        expect(live.host.textContent).not.toIncludeText('Flight hint:');
        const hotspot = [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Air return'));
        act(() => { hotspot.click(); });
        expect(live.host.textContent).toIncludeText('1/10');
        expect(hotspot.textContent).toContain('✓ 🌬️ Air return');
        expect(live.host.textContent).toIncludeText('Air does not rise or fall here.');
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
        expect(live.host.textContent).toIncludeText('motor is powered');
        expect(live.host.querySelector('[data-iss-maintenance-telemetry]').getAttribute('data-iss-maintenance-telemetry')).toBe('focus-0');
        act(() => { findButton('Inlet pressure drop').click(); });
        expect(findButton('clogged inlet filter').disabled).toBe(false);
        expect(live.host.querySelector('[data-iss-maintenance-telemetry]').getAttribute('data-iss-maintenance-telemetry')).toBe('focus-1');
        expect(live.host.textContent).toIncludeText('EVIDENCE CORRELATED');
        act(() => { findButton('clogged inlet filter').click(); });
        expect(live.host.textContent).toIncludeText('Airflow restored.');
        expect(live.host.textContent).toIncludeText('STABLE');
        expect(live.host.querySelector('[data-iss-maintenance-telemetry]').getAttribute('data-iss-maintenance-telemetry')).toBe('restored');
        expect(live.host.textContent).toIncludeText('TRENDS STABILIZING');
        expect(live.host.textContent).toIncludeText('1 / 5 jobs');
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
        expect(live.host.textContent).toIncludeText('observation saved');
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
        expect(controlled.host.textContent).toIncludeText('Controlled arrival:');
        expect(controlled.host.textContent).toIncludeText('0.14 m/s');
        expect(controlled.host.querySelector('[data-iss-lowg-trajectory]').getAttribute('data-iss-lowg-trajectory')).toBe('controlled');
        expect(controlled.host.textContent).toIncludeText('1 / 5 jobs');
        act(() => { push.click(); });
        expect(controlled.host.textContent).toIncludeText('Crew attempts: 1 • first-try bonus earned');
      } finally {
        controlled.cleanup();
      }

      const unsafe = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorRoom: 'unity', lowGImpulse: 22 });
      try {
        const push = [...unsafe.host.querySelectorAll('button')].find((button) => button.textContent.includes('Push off and test'));
        act(() => { push.click(); });
        expect(unsafe.host.textContent).toIncludeText('Flight result:');
        expect(unsafe.host.textContent).toIncludeText('Approach too fast.');
        expect(unsafe.host.querySelector('[data-iss-lowg-trajectory]').getAttribute('data-iss-lowg-trajectory')).toBe('overspeed');
        expect(unsafe.host.textContent).toIncludeText('ARRIVAL OVERSPEED');
        expect(unsafe.host.textContent).toIncludeText('0 / 5 jobs');
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
      expect(html).toIncludeText('5 / 5 jobs');
      expect(html).toIncludeText('Science you used');
      expect(html).toIncludeText('Shift complete');
      expect(html).toIncludeText('Start another shift');
      expect(html).toIncludeText('First try');
      expect(html).toIncludeText('4/5');
      expect(html).toIncludeText('5/10');
      expect(html).toIncludeText('Notes');
      expect(html).toIncludeText('2/5');
    });

    it('renders the Cupola interior and sleep-cabin interior when those modules are selected', () => {
      const cupola = mountWithSeed({ ...BASE, selModule: 'cupola' });
      expect(cupola).toIncludeText('Inside the Cupola');
      expect(cupola).toIncludeText('debris shutters');
      const cabin = mountWithSeed({ ...BASE, selModule: 'harmony' });
      expect(cabin).toIncludeText('Inside a crew sleep cabin');
      expect(cabin).toIncludeText('Sleeping bag');
    });

    it('exposes cinematic 3D view selection and module cutaway controls', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'map', selModule: 'destiny' });
      try {
        expect(live.host.textContent).toIncludeText('SELECTED // DESTINY');
        expect(live.host.querySelector('[data-iss-module-marker]')).toBeTruthy();
        expect(live.host.querySelector('[data-iss-light-phase]')).toBeTruthy();
        expect(live.host.querySelector('[data-iss-orientation-widget]')).toBeTruthy();
        expect(live.host.textContent).toIncludeText('Orientation triad: X is port to starboard');
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
        expect(live.host.textContent).toIncludeText('Cutaway ON');
      } finally {
        live.cleanup();
      }
    });
    it('renders A Day Aboard with the exercise WHY', () => {
      const html = mountWithSeed({ ...BASE, tab: 'day', dayIdx: 4 });
      expect(html).toIncludeText('Exercise 1 of 2');
      expect(html).toIncludeText('1-1.5%');
      expect(html).toIncludeText('24-HOUR CREW TIMELINE');
      expect(html).toIncludeText('WORK + EXERCISE');
      expect(html).toIncludeText('24H ALLOCATION');
      expect(html).toIncludeText('WORK + EX 10.5h');
      expect(html).toIncludeText('data-iss-crew-day-timeline');
      expect(html).toIncludeText('data-iss-day-allocation="work"');
      expect(html).toIncludeText('ORBIT-CYCLE RIBBON');
      expect(html).toIncludeText('ORBIT 7 / 16');
      expect(html).toIncludeText('ECLIPSE');
    });

    it('synchronizes crew schedule selections with the orbital light cycle', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'day', dayIdx: 4 });
      try {
        expect(live.host.querySelector('[data-iss-day-light-phase]').getAttribute('data-iss-day-light-phase')).toBe('eclipse');
        expect(live.host.querySelector('[data-iss-day-allocation]').getAttribute('data-iss-day-allocation')).toBe('work');
        expect(live.host.textContent).toIncludeText('ORBIT 7 / 16');
        const science = live.host.querySelector('[data-iss-day-slot="3"]');
        act(() => { science.click(); });
        expect(live.host.querySelector('[data-iss-day-light-phase]').getAttribute('data-iss-day-light-phase')).toBe('sunlight');
        expect(live.host.textContent).toIncludeText('ORBIT 6 / 16');
        expect(live.host.textContent).toIncludeText('ECLIPSE IN');
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
      expect(integrated).toIncludeText('Keep a city-sized spacecraft alive.');
      expect(integrated).toIncludeText('Simulate the next 92-minute orbit');
      expect(integrated).toIncludeText('Cabin CO₂');
      expect(integrated).toIncludeText('FLIGHT DIRECTOR DEBRIEF');
      expect(integrated).toIncludeText('NEXT-ORBIT MARGIN FORECAST');
      expect(integrated).toIncludeText('Nominal orbit');
      expect(integrated).toIncludeText('Science surge');
      expect(integrated).toIncludeText('RULE ≥ 25% · GO');
      expect(integrated).toIncludeText('data-iss-orbit-forecast');
      expect(integrated).toIncludeText('Scrub predicted orbit');
      expect(integrated).toIncludeText('T+0 MIN');
      expect(integrated).toIncludeText('5 / 5 FLIGHT RULES GO');
      expect(integrated).toIncludeText('All systems');
      expect(integrated).toIncludeText('Crew safety is the combined result');

      // ── Ops-model fidelity ────────────────────────────────────────────────
      // These pin two properties the model got WRONG, both of which taught
      // something false about the real station.
      //
      // A nominal orbit reaches full charge, then supplies eclipse from finite
      // storage. It may finish below the initial reserve because excess daylight
      // cannot be saved beyond capacity; the next cycle is sustainable.
      const fidelityPower = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'power', opsScenario: 'nominal' });
      expect(fidelityPower).toIncludeText('This setup supplies the full orbit.');
      expect(fidelityPower).toIncludeText('Battery reaches full');
      expect(fidelityPower).toIncludeText('RULE ≥ 25% · GO');

      // 2. Cabin CO2 must read like a spacecraft, not an office. Real ISS cabin
      //    CO2 runs roughly 2-4 mmHg (~2600-5300 ppm) against Earth's ~420 ppm;
      //    the old model peaked near 950 ppm and ruled at < 1000.
      const fidelityEclss = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'eclss', opsScenario: 'nominal' });
      const fidelityPpm = Number((fidelityEclss.match(/Modeled CO₂ (\d+) ppm/) || [])[1]);
      expect(fidelityPpm).toBeGreaterThan(2000);
      expect(fidelityPpm).toBeLessThan(5300);
      expect(fidelityEclss).toIncludeText('highest zone reading during this orbit');
      expect(fidelityEclss).toIncludeText('classroom comparison');

      const comparison = mountWithSeed({ ...BASE, tab: 'operations', opsScenario: 'science', opsResearch: 95 });
      expect(comparison).toIncludeText('Dashed = nominal orbit');

      const power = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'power' });
      expect(power).toIncludeText('SUNLIGHT 57 MIN');
      expect(power).toIncludeText('Battery after one orbit');
      const eclss = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'eclss' });
      expect(eclss).toIncludeText('Water resupply gap');
      expect(eclss).toIncludeText('Cabin-air quality');
      const debris = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'debris' });
      expect(debris).toIncludeText('HYPERVELOCITY TEST');
      expect(debris).toIncludeText('Impact energy');
      const human = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'human' });
      expect(human).toIncludeText('Modeled bone loss');
      expect(human).toIncludeText('Radiation exposure');

      const coolingIncident = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'emergency', opsEmergency: 'cooling' });
      expect(coolingIncident).toIncludeText('INCIDENT DISPLAY // EXTERNAL COOLING LOOP');
      expect(coolingIncident).toIncludeText('data-iss-emergency-visual="cooling"');
      expect(coolingIncident).toIncludeText('data-iss-emergency-state="active"');
      expect(coolingIncident).toIncludeText('LOOP PRESSURE LOW');
      expect(coolingIncident).toIncludeText('OUTLET WARMING');

      const rendezvous = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'rendezvous', opsRendezvousHold: 2 });
      expect(rendezvous).toIncludeText('RENDEZVOUS FLIGHT-DIRECTOR BOARD');
      expect(rendezvous).toIncludeText('data-iss-rendezvous-planner="2"');
      expect(rendezvous).toIncludeText('HOLD 3 / 4 // 30 M');
      expect(rendezvous).toIncludeText('USE SMALL CORRECTION PULSES');
      expect(rendezvous).toIncludeText('Representative sequence · vehicle routes vary');
    });

    it('inspects rendezvous hold points with synchronized flight-rule cues', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'operations', opsMode: 'rendezvous', opsRendezvousHold: 0 });
      try {
        const captureHold = live.host.querySelector('[data-iss-rendezvous-hold="3"]');
        expect(live.host.querySelector('[data-iss-rendezvous-planner]').getAttribute('data-iss-rendezvous-planner')).toBe('0');
        expect(live.host.textContent).toIncludeText('ESTABLISH RELATIVE NAVIGATION');
        act(() => { captureHold.click(); });
        expect(captureHold.getAttribute('aria-pressed')).toBe('true');
        expect(live.host.querySelector('[data-iss-rendezvous-planner]').getAttribute('data-iss-rendezvous-planner')).toBe('3');
        expect(live.host.textContent).toIncludeText('CENTER, DAMP, THEN COAST');
        expect(live.host.textContent).toIncludeText('PORT CENTERED');
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
        expect(live.host.textContent).toIncludeText('coolant loops carry to radiators');
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
        expect(live.host.textContent).toIncludeText('T+70 MIN');
        expect(live.host.textContent).toIncludeText('ECLIPSE');
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
        expect(live.host.textContent).toIncludeText('Cascading fault');
        expect(live.host.textContent).toIncludeText('RULE ≥ 25% · CHECK');
        // 4000 ppm ~= 3 mmHg, the level ISS crews work to stay under. The old
        // 1000 ppm rule was an office-air figure: real cabin CO2 runs 2-4 mmHg.
        expect(live.host.textContent).toIncludeText('RULE < 4000 ppm · CHECK');
        // Restricted cooling now heats the cabin beyond 27 C during the orbit.
        expect(live.host.querySelector('[data-flight-rule=\"thermal\"]').textContent).toContain('CHECK');
        expect(live.host.textContent).toIncludeText('5 FLIGHT RULES TO CHECK');
        expect(live.host.textContent).toIncludeText('too little battery reserve during this orbit');
        const powerRule = live.host.querySelector('[data-flight-rule="power"]');
        act(() => { powerRule.click(); });
        expect(live.host.textContent).toIncludeText('Solar generation');
        expect(live.host.textContent).toIncludeText('Battery after one orbit');
      } finally {
        live.cleanup();
      }
    });

    it('runs an orbit simulation and an emergency procedure', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'operations' });
      try {
        const simulate = [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Simulate the next'));
        act(() => { simulate.click(); });
        expect(live.host.textContent).toIncludeText('ORBIT 1 // battery');
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
        expect(emergency.host.textContent).toIncludeText('PRESSURE ISOLATION');
        const isolate = [...emergency.host.querySelectorAll('button')].find((button) => button.textContent.includes('Close the suspected'));
        act(() => { isolate.click(); });
        expect(emergency.host.textContent).toIncludeText('PROCEDURE CORRECT');
        expect(emergency.host.querySelector('[data-iss-emergency-state]').getAttribute('data-iss-emergency-state')).toBe('contained');
        expect(emergency.host.textContent).toIncludeText('LEAK ISOLATED');
      } finally {
        emergency.cleanup();
      }
      const heldEmergency = mountLiveWithSeed({ ...BASE, tab: 'operations', opsMode: 'emergency', opsEmergency: 'fire' });
      try {
        const ventilate = [...heldEmergency.host.querySelectorAll('button')].find((button) => button.textContent.includes('Increase ventilation'));
        act(() => { ventilate.click(); });
        expect(heldEmergency.host.textContent).toIncludeText('PROCEDURE HOLD');
        expect(heldEmergency.host.querySelector('[data-iss-emergency-state]').getAttribute('data-iss-emergency-state')).toBe('hold');
        expect(heldEmergency.host.textContent).toIncludeText('HOLD // HAZARD ACTIVE');
      } finally {
        heldEmergency.cleanup();
      }
    });
    it('renders Systems with the air loop and design challenge', () => {
      const html = mountWithSeed({ ...BASE, tab: 'systems', sysIdx: 1 });
      expect(html).toIncludeText('Air loop');
      expect(html).toIncludeText('Sabatier');
      expect(html).toIncludeText('Design challenge');
    });

    it('shows how each system couples its inputs and outputs across the station', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'systems', sysIdx: 1, sysStep: 0 });
      try {
        let coupling = live.host.querySelector('[data-iss-system-coupling]');
        expect(coupling.getAttribute('data-iss-system-coupling')).toBe('air');
        expect(coupling.querySelector('svg').getAttribute('aria-label')).toContain('Inputs: WATER LOOP and ELECTRIC POWER');
        expect(live.host.textContent).toIncludeText('STATION COUPLING // INPUTS → FUNCTION → OUTPUTS');
        expect(live.host.textContent).toIncludeText('Cabin air depends on water processing');

        const power = [...live.host.querySelectorAll('.iss-system-tab')].find((button) => button.textContent.includes('Power'));
        act(() => { power.click(); });
        coupling = live.host.querySelector('[data-iss-system-coupling]');
        expect(coupling.getAttribute('data-iss-system-coupling')).toBe('power');
        expect(coupling.querySelector('svg').getAttribute('aria-label')).toContain('Inputs: SUNLIGHT and SOLAR ARRAYS');
        expect(live.host.textContent).toIncludeText('Every major station function becomes a managed electrical load.');
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
        expect(live.host.textContent).toIncludeText('RECOVER: scrub + Sabatier');
        expect(live.host.textContent).toIncludeText('STAGE 4 / 4');
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

    // ── Orbit Lab prediction gate ──────────────────────────────────────────
    // The gate exists because the Orbit Lab's own intro names the "lower is
    // faster" misconception and then never makes a student confront it: the
    // readouts updated live while the slider moved, so the wrong intuition was
    // overwritten before it was ever stated. These cases pin the property that
    // matters -- that the ANSWER is withheld until a direction is committed --
    // rather than pinning the copy, which is free to be reworded.
    it('withholds the solved orbit rows until a direction is predicted', () => {
      // Moved 420 -> 250 with no prediction: the four derived quantities are
      // hidden. 7.76 km/s is the correct value AT 250 km, so asserting its
      // absence is asserting the gate actually closed rather than that some
      // unrelated string changed.
      const gated = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 420 });
      expect(gated).toIncludeText('predict first');
      expect(gated).not.toIncludeText('7.76 km/s');
      // The SETUP stays on screen: a student who cannot see what they changed
      // cannot form a prediction at all.
      expect(gated).toIncludeText('250 km');
      expect(gated).toIncludeText('Severe drag');
      expect(gated).toIncludeText('ALTITUDE ENVIRONMENT');

      // Committing a direction reveals them.
      const open = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 420, orbitPredictPick: 'faster', orbitPredictAlt: 250 });
      expect(open).toIncludeText('7.76 km/s');
      expect(open).not.toIncludeText('predict first');
    });

    it('grades the prediction from the same physics the readouts use', () => {
      // Dropping from 420 to 250 km makes the station FASTER -- the answer that
      // contradicts driving intuition, and the whole reason the gate is here.
      const right = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 420, orbitPredictPick: 'faster', orbitPredictAlt: 250 });
      expect(right).toIncludeText('You predicted it');
      const wrong = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 420, orbitPredictPick: 'slower', orbitPredictAlt: 250 });
      expect(wrong).toIncludeText('Not what happened');
      // Climbing is the mirror case: 420 -> 1500 km is SLOWER.
      const climbRight = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 1500, orbitPredictRef: 420, orbitPredictPick: 'slower', orbitPredictAlt: 1500 });
      expect(climbRight).toIncludeText('You predicted it');
      const climbWrong = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 1500, orbitPredictRef: 420, orbitPredictPick: 'faster', orbitPredictAlt: 1500 });
      expect(climbWrong).toIncludeText('Not what happened');
    });

    it('explains the mechanism even when the student guessed right', () => {
      // A correct guess for the wrong reason needs the mechanism just as much
      // as a wrong one does, so the explanation keys on the direction that
      // actually occurred rather than on whether the student was right.
      const right = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 420, orbitPredictPick: 'faster', orbitPredictAlt: 250 });
      expect(right).toIncludeText('You predicted it');
      expect(right).toIncludeText('breaks driving intuition');
      const wrong = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 420, orbitPredictPick: 'slower', orbitPredictAlt: 250 });
      expect(wrong).toIncludeText('breaks driving intuition');
    });

    it('treats a prediction made at another altitude as a new question', () => {
      // The pick belongs to orbitPredictAlt 250, but the slider is now at 600:
      // the gate must close again rather than unlocking on a stale answer.
      const stale = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 600, orbitPredictRef: 420, orbitPredictPick: 'faster', orbitPredictAlt: 250 });
      expect(stale).toIncludeText('predict first');
      expect(stale).toIncludeText('no longer unlocks this one');
    });

    it('opens the gate at the reference altitude, where there is nothing to predict from', () => {
      // "Faster or slower than what?" has no answer when you have not moved,
      // so the gate opens rather than posing an unanswerable question.
      const atRef = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 420, orbitPredictRef: 420 });
      expect(atRef).not.toIncludeText('predict first');
      expect(atRef).toIncludeText('7.66 km/s');
    });

    it('does not leak the answer through the diagram or the status strip', () => {
      // The status strip prints velocity on EVERY tab and defeated the gate
      // outright before it was covered; the diagram carried the signed delta,
      // which answers "which way did it go" more directly than the value does.
      const gated = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 420 });
      expect(gated).not.toIncludeText('7.76 km/s');
      expect(gated).not.toIncludeText('DELTA V');
      expect(gated).toIncludeText('SPEED HIDDEN UNTIL YOU PREDICT');
      expect(gated).toIncludeText('? km/s');
      // On any OTHER tab there is no open question, so the live station
      // numbers belong in the strip exactly as they always did.
      const elsewhere = mountWithSeed({ ...BASE, tab: 'map', orbitAlt: 250, orbitPredictRef: 420 });
      expect(elsewhere).toIncludeText('7.76 km/s');
    });

    it('offers orbit challenges whose numbers come from the orbital model', () => {
      const html = mountWithSeed({ ...BASE, tab: 'orbit' });
      expect(html).toIncludeText('Orbit challenges');
      expect(html).toIncludeText('0 of 4 solved');
      // Opening a challenge shows its prompt and options but no verdict yet.
      const open = mountWithSeed({ ...BASE, tab: 'orbit', orbitChallenge: 'phasing' });
      expect(open).toIncludeText('30 km BEHIND the station');
      expect(open).toIncludeText('lower, faster orbit');
      expect(open).not.toIncludeText('Takeaway');
      // Answering correctly reveals the mechanism AND the takeaway. The
      // feedback quotes 7.66 km/s, which is issOrbit(420) -- derived from the
      // same function the readouts use, never a second hand-typed copy.
      const solved = mountWithSeed({ ...BASE, tab: 'orbit', orbitChallenge: 'phasing', orbitChallengePick: 'slowdown', orbitChallengeDone: { phasing: true } });
      expect(solved).toIncludeText('7.66 km/s');
      expect(solved).toIncludeText('Takeaway');
      expect(solved).toIncludeText('1 of 4 solved');
      // A wrong answer explains why it is wrong and withholds the takeaway.
      const missed = mountWithSeed({ ...BASE, tab: 'orbit', orbitChallenge: 'phasing', orbitChallengePick: 'speedup' });
      expect(missed).toIncludeText('driving answer');
      expect(missed).not.toIncludeText('Takeaway');
    });

    it('survives a saved project whose prediction and challenge state is malformed', () => {
      // Saved projects are INPUT. A string where an object belongs, an array
      // where a map belongs, or an id this build no longer defines must not
      // blank the tab.
      const hostile = mountWithSeed({
        ...BASE, tab: 'orbit',
        orbitPredictRef: 'nonsense', orbitPredictPick: 'sideways', orbitPredictAlt: 'x',
        orbitPredictLog: 'not-an-array',
        orbitChallenge: 'no-such-challenge', orbitChallengePick: 'no-such-option',
        orbitChallengeDone: ['array', 'not', 'map'],
      });
      expect(hostile).toIncludeText('Orbit challenges');
      // The bogus done-array must not inflate the tally above what is shown.
      expect(hostile).toIncludeText('0 of 4 solved');
      expect(hostile).toIncludeText('Pick a challenge above to begin');
    });

    it('computes real orbital mechanics in the Orbit Lab', () => {
      // orbitPredictRef moves with orbitAlt: this case tests the physics,
      // not the prediction gate, so the tool sits at its own reference
      // altitude and the solved rows are shown as they always were.
      const html = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 250, orbitPredictRef: 250 });
      // v = sqrt(398600.4418 / 6621) = 7.76 km/s
      expect(html).toIncludeText('7.76 km/s');
      expect(html).toIncludeText('Severe drag');
      expect(html).toIncludeText('ALTITUDE ENVIRONMENT');
      expect(html).toIncludeText('SEVERE DRAG');
      expect(html).toIncludeText('VS 420 KM');
      expect(html).toIncludeText('DELTA V +');
      const high = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 1500, orbitPredictRef: 1500 });
      expect(high).toIncludeText('radiation');
      expect(high).toIncludeText('RADIATION EXPOSURE RISES');
      const issBand = mountWithSeed({ ...BASE, tab: 'orbit', orbitAlt: 420 });
      expect(issBand).toIncludeText('CREWED LEO / ISS BAND');
      expect(issBand).toIncludeText('ISS REFERENCE // 420 KM');
      expect(issBand).toIncludeText('ORBIT MAINTENANCE / 30-DAY LAB');
      expect(issBand).toIncludeText('data-iss-drag-model="nominal"');
      expect(issBand).toIncludeText('data-iss-reboost-day="20"');
      expect(issBand).toIncludeText('calibrated to 75 m/day at 420 km');
      expect(issBand).toIncludeText('this model does not predict reentry');
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
        expect(live.host.textContent).toIncludeText('REBOOST +5 KM');
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
      expect(html).toIncludeText('Dock the cargo capsule');
      expect(html).toIncludeText('Mission report');
      expect(html).toIncludeText('POST-APPROACH FLIGHT DATA');
      expect(html).toIncludeText('HARD CONTACT');
      expect(html).toIncludeText('CONTACT RATE');
      expect(html).toIncludeText('CAPTURE ENVELOPE');
      expect(html).toIncludeText('data-iss-dock-debrief="bonk"');
      expect(html).toIncludeText('Pump worksite');
      expect(html).toIncludeText('Pump secured');
      expect(html).toIncludeText('PROJECTED');
      expect(html).toIncludeText('SUIT BUDGET');
      expect(html).toIncludeText('RESERVE +');
      expect(html).toIncludeText('NEXT MOVE SECURED');
      expect(html).toIncludeText('data-iss-eva-phase="SECURED"');
      expect(html).toIncludeText('Torque bolt');
    });

    it('supports keyboard-held docking thrusters and exposes textual telemetry', () => {
      const live = mountLiveWithSeed({ ...BASE, tab: 'missions' });
      try {
        const canvas = live.host.querySelector('[data-dock-canvas]');
        const status = live.host.querySelector('[data-dock-hud]');
        const forward = [...live.host.querySelectorAll('button')].find((button) =>
          (button.getAttribute('aria-label') || '').startsWith('Thrust Forward'));
        // Every description the canvas points at must exist in the rendered tab.
        const describedBy = canvas.getAttribute('aria-describedby').split(/\s+/);
        expect(describedBy.slice(0, 2)).toEqual(['iss-dock-instructions', 'iss-dock-status']);
        describedBy.forEach((id) => expect(live.host.querySelector('#' + id), id).not.toBeNull());
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
        expect(fatal.host.textContent).toIncludeText('Moved WITHOUT clipping ahead');
        expect(fatal.host.textContent).toIncludeText('Suit consumables exhausted');
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
        expect(lastBolt.host.textContent).toIncludeText('Bolt 4/4 torqued');
        expect(suitPct(lastBolt.host)).toContain('Suit consumables 45 percent');
        expect(lastBolt.host.textContent).toIncludeText('Pump secured');
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
        expect(live.host.textContent).toIncludeText('ASSEMBLY GROWTH PROFILE');
        expect(live.host.textContent).toIncludeText('1998');
      } finally {
        live.cleanup();
      }
    });
    it('teaches inclination with a real ground track over real coastlines', () => {
      const at = (orbitInc) => mountWithSeed({ ...BASE, tab: 'orbit', orbitInc });

      // Default is the station's real inclination, and the track's highest
      // latitude must equal it — that identity IS the orbital mechanics here.
      const iss = at(51.6);
      expect(iss).toIncludeText('data-iss-ground-track="51.6"');
      expect(iss).toIncludeText('Reaches 51.6°N to 51.6°S');
      expect(at(28.5)).toIncludeText('Reaches 28.5°N to 28.5°S');
      expect(at(90)).toIncludeText('Reaches 90.0°N to 90.0°S');

      // Land coverage is COMPUTED from the embedded mask (cos-weighted for
      // area), not quoted: a band of zero width covers no land, a polar orbit
      // covers all of it, and 51.6° lands where the real geography puts it.
      expect(at(0)).toIncludeText('0% of Earth’s land');
      expect(at(90)).toIncludeText('100% of Earth’s land');
      expect(iss).toMatch(/flies over 7[01]% of Earth’s land/);
      expect(at(28.5)).toMatch(/flies over 4[123]% of Earth’s land/);

      // Earth turns under the orbit, so each pass runs west of the last. At the
      // ~93 min period of a 420 km orbit that is ~23°, the published figure.
      expect(iss).toMatch(/each later pass runs 23\.[0-9]° further west/);

      // A pad cannot reach an inclination below its own latitude. Baikonur is
      // at 46°N, so it can reach 51.6° but not 28.5°.
      const reach = (html, site) => {
        const i = html.indexOf('data-iss-launch-site="' + site + '"');
        return i < 0 ? null : /data-iss-site-reachable="(yes|no)"/.exec(html.slice(i))[1];
      };
      expect(reach(iss, 'Baikonur')).toBe('yes');
      expect(reach(at(28.5), 'Baikonur')).toBe('no');
      expect(reach(at(28.5), 'Tanegashima')).toBe('no');     // 30.4°N
      expect(reach(at(28.5), 'Cape Canaveral')).toBe('yes');  // 28.5°N exactly
      expect(reach(at(28.5), 'Kourou')).toBe('yes');          // 5.2°N
      expect(at(28.5)).toIncludeText('3 of 5');
      expect(iss).toIncludeText('5 of 5');

      // Reachability must not be carried by colour alone: red/green is the
      // commonest colour-vision failure and axe cannot see the problem, because
      // both colours pass contrast against the map behind them. Unreachable
      // pads get a hollow ring with a strike through it, and the map's own
      // aria-label names them.
      expect(at(28.5)).toIncludeText('filled dot = pad can reach this orbit');
      expect(at(28.5)).toMatch(/data-iss-site-reachable="no"[\s\S]{0,400}?fill="none"/);
      expect(at(28.5)).toMatch(/Tanegashima and Baikonur cannot reach this orbit directly/);
      // Derived from LAUNCH_SITES.length, not the literal "five" this used to
      // pin: the readout below the map already computes the count, so a spelled
      // -out twin in the aria-label was a second derivation of one fact that
      // would have started lying the moment a sixth pad was added — invisibly,
      // since only a screen reader ever reads it. Pin the DERIVATION by
      // checking the count matches the site list rather than a frozen word.
      expect(iss).toIncludeText('All 5 marked launch sites can reach this orbit directly');
      expect(iss).toIncludeText('Pads that can reach it');

      // The explanation must survive: you can aim higher than your latitude,
      // never lower.
      expect(at(28.5)).toIncludeText('cannot reach 28.5°');
      expect(iss).toIncludeText('Baikonur sits at about 46°N');
      // The explanation of the REAL orbit must not follow the slider: it quotes
      // the land share at 51.6°, not at whatever the student has dragged to.
      expect(at(10)).toIncludeText('about 71% of Earth’s land');
      expect(at(10)).toIncludeText('flies over 14% of Earth’s land');   // the live readout does follow
      // ...and the placeholder must actually be substituted, never shipped raw.
      expect(iss).not.toIncludeText('{pct}');
      // London 51.5°N is inside the band and Berlin 52.5°N is outside — a
      // checkable anchor, and both cities are in the tool's own light list.
      expect(iss).toIncludeText('London at 51.5°N');
      expect(iss).toIncludeText('Berlin, at 52.5°N');
      // 30 s for the same reason the module/operations sweeps got it: this
      // renders the tool at many inclinations, and against vitest's 5 s default
      // it timed out on four separate runs while ASSERTING NOTHING WRONG. A
      // baseline swap settled that it is not a regression — HEAD's tool times
      // out on this same test under the same load (5.4 s vs 7.0 s). A cap that
      // trips on machine load is a false alarm generator, and this one has
      // repeatedly made a green change look red.
    }, 30000);

    it('derives the quiz pass mark once instead of writing it out six times', () => {
      TOOL_PATHS.forEach((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        // The threshold appeared as a literal 7 in the quest hook, the quest
        // LABEL, the debrief message, the completion toast, and three times in
        // the debrief gauge. Adding an eleventh question moved the bar in some
        // of those and not others, so the gauge would have said FLIGHT
        // QUALIFIED at a score the quest refused to credit.
        expect(source).toIncludeText('var QUIZ_PASS = Math.ceil(QUIZ.length * 0.7)');
        expect(source).toIncludeText("label: 'Score ' + QUIZ_PASS + '+ on the station quiz'");
        expect(source).toIncludeText('(s.quizBest || 0) >= QUIZ_PASS');
        expect(source).toIncludeText('d.quizScore >= QUIZ_PASS');
        expect(source).toIncludeText('finalScore >= QUIZ_PASS');
        expect(source).not.toMatch(/score >= 7 \?/);
        expect(source).not.toIncludeText("'Score 7+ on the station quiz'");
      });

      // QUIZ and QUIZ_TOPIC_LABELS are parallel arrays read by index in the
      // debrief, so a length mismatch silently mislabels a question's topic.
      const source = readFileSync(TOOL_PATHS[0], 'utf8');
      const questions = (source.match(/^    \{ q: '/gm) || []).length;
      const labels = source.match(/QUIZ_TOPIC_LABELS = \[([^\]]*)\]/)[1].split(',').length;
      expect(questions).toBe(11);
      expect(labels).toBe(questions);
    });

    it('renders every system, not just the first one', () => {
      // The suite only ever mounted the Systems tab at sysIdx 0, so a new
      // system could crash the tab in a real browser while every test stayed
      // green. Three id-keyed maps have to agree — SYSTEMS, the flow diagram
      // and the coupling map — and only one of them has a fallback.
      const source = readFileSync(TOOL_PATHS[0], 'utf8');
      const ids = [...source.matchAll(/^ {4}\{ id: '([a-z0-9]+)', icon:/gm)].map((m) => m[1]);
      const flows = [...source.matchAll(/^ {10}([a-z0-9]+): \{ nodes:/gm)].map((m) => m[1]);
      const couplings = [...source.matchAll(/^ {10}([a-z0-9]+): \{ upstream:/gm)].map((m) => m[1]);
      expect(ids.length).toBeGreaterThanOrEqual(8);
      expect(flows.sort()).toEqual([...ids].sort());
      expect(couplings.sort()).toEqual([...ids].sort());

      // And each one actually renders ITS OWN content — the flow map falls back
      // to the water loop, so "it rendered" is not enough; the selected
      // system's own name and coupling note have to be on screen.
      const entries = [...source.matchAll(/^ {4}\{ id: '([a-z0-9]+)', icon: '[^']*', name: '([^']+)'/gm)]
        .map((m) => ({ id: m[1], name: m[2] }));
      expect(entries.length).toBe(ids.length);
      entries.forEach((entry, index) => {
        const html = mountWithSeed({ ...BASE, tab: 'systems', sysIdx: index, sysStep: 0 });
        expect(html, 'system ' + entry.id + ' should render').toIncludeText('iss-system-tabs');
        // React escapes & in the serialized markup, so compare like for like.
        const escaped = entry.name.replace(/&/g, '&amp;');
        expect(html, 'system ' + entry.id + ' should show its own name').toIncludeText(escaped);
        expect(html, 'system ' + entry.id + ' should not render as NaN/undefined').not.toIncludeText('undefined');
      });

      // The Operations tab pulls schematics by MEANING, not by position:
      // an index lookup silently drew the wrong loop if SYSTEMS was reordered.
      expect(source).toIncludeText("systemById('water')");
      // Thermal now renders its own coupled heat-path experiment.
      expect(mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'thermal' })).toIncludeText('data-iss-thermal-lab');
      expect(source).toIncludeText("systemById('body')");
      expect(source).not.toMatch(/renderSystemSchematic\(SYSTEMS\[\d\]\)/);
    });

    it('renders every module, day slot and quiz question — not just the first', () => {
      // Generalising the Systems-tab bug: this suite only ever mounted 4 of 13
      // modules, 2 of 12 crew-day slots and 1 of 11 quiz questions, so a bad
      // entry anywhere else could ship green. Several modules take id-specific
      // branches (cupola and harmony open bespoke interiors; the truss is drawn
      // as a box rather than a cylinder), which is exactly where entries differ.
      const source = readFileSync(TOOL_PATHS[0], 'utf8');
      const esc = (s) => s.replace(/&/g, '&amp;');

      const modules = [...source.matchAll(/^ {4}\{ id: '([a-z0-9]+)', name: '([^']+)'/gm)]
        .map((m) => ({ id: m[1], name: m[2] }));
      expect(modules.length).toBe(13);
      // The map's motion help uses "undefined" as a math word in fixed English
      // fallbacks; remove exactly those phrases so any leaked value still fails.
      const mathProse = ['path direction is undefined', 'the curve is undefined', 'rate of speed change is left undefined'];
      const withoutMathProse = (html) => mathProse.reduce((text, phrase) => text.split(phrase).join(''), html);
      modules.forEach((mod) => {
        const html = mountWithSeed({ ...BASE, tab: 'map', selModule: mod.id });
        expect(html, 'module ' + mod.id + ' should render its own card').toIncludeText(esc(mod.name));
        expect(withoutMathProse(html), 'module ' + mod.id + ' should not leak undefined').not.toIncludeText('undefined');
        expect(html, 'module ' + mod.id + ' should not leak NaN').not.toIncludeText('NaN');
      });

      const dayBlock = source.match(/var DAY_SCHEDULE = \[([\s\S]*?)\n {2}\];/)[1];
      const daySlots = [...dayBlock.matchAll(/\{ h: '([^']+)'/g)].map((m) => m[1]);
      expect(daySlots.length).toBe(12);
      daySlots.forEach((time, index) => {
        const html = mountWithSeed({ ...BASE, tab: 'day', dayIdx: index });
        expect(html, 'day slot ' + time + ' should render').toIncludeText(time);
        expect(html, 'day slot ' + time + ' should not leak undefined').not.toIncludeText('undefined');
      });

      const quizCount = (source.match(/^ {4}\{ q: '/gm) || []).length;
      for (let i = 0; i < quizCount; i++) {
        const html = mountWithSeed({ ...BASE, tab: 'quiz', quizIdx: i, quizPicked: null });
        expect(html, 'quiz question ' + i + ' should render').toIncludeText('iss-quiz-option-' + i + '-0');
        expect(html, 'quiz question ' + i + ' should not leak undefined').not.toIncludeText('undefined');
      }
      // ~50 full React mounts of an 800 KB tool. Measured on IDENTICAL code it
      // swings 3.5s-5.7s with machine load, so against vitest's 5s default it
      // fails intermittently and the failure reads as "a module renders wrong"
      // rather than "the box was busy". Same fix as the catalog test below.
    }, 30000);

    it('renders every operations mode, preset scenario and emergency', () => {
      // Same class again: the Operations tab is the tool's most branch-heavy
      // surface, and two of its nine modes and three of its five preset
      // scenarios had never been mounted by any test.
      const source = readFileSync(TOOL_PATHS[0], 'utf8');

      const modes = [...source.matchAll(/\['([a-z]+)','[^']*','[A-Z][^']*'\]/g)]
        .map((m) => m[1])
        .filter((id, i, all) => all.indexOf(id) === i);
      expect(modes).toContain('integrated');
      expect(modes).toContain('thermal');
      expect(modes).toContain('attitude');
      modes.forEach((mode) => {
        const html = mountWithSeed({ ...BASE, tab: 'operations', opsMode: mode });
        expect(html, 'ops mode ' + mode + ' should render').toIncludeText('iss-ops-grid');
        expect(html, 'ops mode ' + mode + ' should not leak undefined').not.toIncludeText('undefined');
        expect(html, 'ops mode ' + mode + ' should not leak NaN').not.toIncludeText('NaN');
      });

      const scenarios = [...source.matchAll(/\{ id: '([a-z]+)', icon: '[^']*', label: '[^']*', note: '[^']*', patch:/g)]
        .map((m) => m[1]);
      expect(scenarios).toEqual(['nominal', 'science', 'eclipse', 'crew', 'fault']);
      scenarios.forEach((scenario) => {
        const html = mountWithSeed({ ...BASE, tab: 'operations', opsScenario: scenario });
        expect(html, 'scenario ' + scenario + ' should render').toIncludeText('iss-ops-grid');
        expect(html, 'scenario ' + scenario + ' should not leak NaN').not.toIncludeText('NaN');
      });

      ['leak', 'fire', 'cooling'].forEach((emergency) => {
        const html = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'emergency', opsEmergency: emergency });
        expect(html, 'emergency ' + emergency + ' should render').toIncludeText('iss-ops-grid');
        expect(html, 'emergency ' + emergency + ' should not leak undefined').not.toIncludeText('undefined');
      });
      // ~50 full React mounts of an 800 KB tool. Measured on identical code it
      // swings 3.5s-5.7s with machine load, so against vitest's 5s default it
      // fails intermittently and the failure reads as "a module renders wrong"
      // rather than "the box was busy". Same fix as the catalog test below.
    }, 30000);

    it('derives the relay numbers from the same physics it teaches', () => {
      const html = mountWithSeed({ ...BASE, tab: 'systems', sysIdx: 6, sysStep: 0 });
      expect(html).toIncludeText('Talking to the ground');

      // Geostationary is not a quoted altitude — it is the ONE radius whose
      // period is a sidereal day, so it falls out of Kepler's third law.
      const GM = 398600.4418, Re = 6371, SID = 86164, C = 299792.458, ref = 420;
      const rGeo = Math.cbrt((GM * SID * SID) / (4 * Math.PI * Math.PI));
      const alt = Math.round((rGeo - Re) / 100) * 100;
      expect(alt).toBe(35800);                         // published 35,786 km
      expect(html).toIncludeText(alt.toLocaleString() + ' km');
      expect(html).toIncludeText(Math.round((rGeo - Re) / ref) + '× higher');

      // ...and the delay is that path length over c, using the SHORT geometry
      // so the number quoted is a floor.
      const path = (rGeo - (Re + ref)) + (rGeo - Re);
      const ms = Math.round(((2 * path) / C) * 1000 / 10) * 10;
      expect(ms).toBeGreaterThan(400);
      expect(ms).toBeLessThan(600);
      expect(html).toIncludeText(ms + ' ms');
    });

    it('agrees with itself about the orbit on a single screen', () => {
      // The map tab shows the hero status strip AND the fast-facts grid. The
      // strip computed the period from sqrt(GM/r) and rounded it to 93; the
      // card stated a flat '~92 min'. Both were visible at once.
      const html = mountWithSeed({ ...BASE, tab: 'map', orbitAlt: 420 });

      const period = /Orbit period<\/div><div[^>]*>~?(\d+(?:\.\d+)?) min/.exec(html)
        || /~(\d+) min/.exec(html);
      expect(period).not.toBeNull();
      const cardMinutes = Math.round(Number(period[1]));

      const strip = /(\d+) minutes/.exec(html);
      expect(strip).not.toBeNull();
      const stripMinutes = Number(strip[1]);
      expect(cardMinutes).toBe(stripMinutes);

      // And both must match the physics, not just each other: a 420 km circular
      // orbit is 92.8 minutes at 7.66 km/s.
      const r = 6371 + 420;
      const v = Math.sqrt(398600.4418 / r);
      expect(stripMinutes).toBe(Math.round((2 * Math.PI * r / v) / 60));
      expect(html).toIncludeText(v.toFixed(2) + ' km/s');
    });

    it('survives a corrupted inclination instead of rendering NaN', () => {
      // Number('') is 0 and Number('abc') is NaN. The first would quietly show
      // an equatorial orbit as though the student had chosen it; the second put
      // NaN into every coordinate of the ground-track SVG. Both fall back.
      const bad = (orbitInc) => mountWithSeed({ ...BASE, tab: 'orbit', orbitInc });
      ['', 'abc', null, undefined, NaN].forEach((value) => {
        const html = bad(value);
        expect(html).not.toIncludeText('NaN');
        expect(html).toIncludeText('data-iss-ground-track="51.6"');
      });
      // A real value still wins, out-of-range values clamp rather than fall
      // back, numeric strings are accepted, and a genuine 0 SURVIVES — it is
      // the Equatorial preset, not a missing value.
      expect(bad(28.5)).toIncludeText('data-iss-ground-track="28.5"');
      expect(bad('28.5')).toIncludeText('data-iss-ground-track="28.5"');
      expect(bad(0)).toIncludeText('data-iss-ground-track="0.0"');
      expect(bad(-40)).toIncludeText('data-iss-ground-track="0.0"');
      expect(bad(400)).toIncludeText('data-iss-ground-track="90.0"');

      // Derived once: two copies of the clamp expression would let a changed
      // default disagree with itself between the map and the readouts.
      TOOL_PATHS.forEach((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        expect((source.match(/Number\(_rawInc\)/g) || []).length).toBe(1);
        expect(source).toIncludeText("_rawInc == null || _rawInc === ''");
      });
    });

    it('answers the land-share question without rescanning the planet', () => {
      TOOL_PATHS.forEach((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        // The inclination slider steps every 0.1°, so a drag from 0 to 90 asks
        // this question 900 times. Scanning all 259,200 mask cells per answer
        // measured 157ms of pure compute per drag on a dev machine, which is
        // far worse on the Chromebooks this ships to. Row areas are built once
        // and the band is a prefix-sum difference.
        expect(source).toIncludeText('_issRowPrefix');
        expect(source).toIncludeText('function issLandRowAreas');
        expect(source).toMatch(/_issRowPrefix\[lastExclusive\] - _issRowPrefix\[first\]/);
        // The old per-call full scan must not come back.
        expect(source).not.toMatch(/function issLandShareWithin[\s\S]{0,600}?for \(var col = 0; col < ISS_LAND_W/);
      });
    });

    it('draws the ground track from the same land data as the globe', () => {
      // One mask, two surfaces. If the flat map ever stops agreeing with the
      // 3-D globe the tool is telling two different stories about the planet.
      const html = mountWithSeed({ ...BASE, tab: 'orbit' });
      expect(html).toIncludeText('Coastlines: Natural Earth (public domain)');
      // Land is ONE path built from run-length subpaths. A world with almost no
      // subpaths means the mask decode silently produced an empty planet.
      const landPath = /<path d="((?:M[-\d.]+ [-\d.]+h[-\d.]+v[-\d.]+h-[-\d.]+z)+)"/.exec(html);
      expect(landPath).not.toBeNull();
      expect((landPath[1].match(/M/g) || []).length).toBeGreaterThan(300);
      // ...and it must NOT go back to hundreds of separate elements: that made
      // the orbit tab's axe pass take 59s and re-reconciled on every drag.
      expect((html.match(/<rect[^>]*>/g) || []).length).toBeLessThan(30);
    });

    it('draws the counts it states — seven Cupola windows, arrays joined to the truss', () => {
      // Two silent-regression classes, both caught by eye and neither reachable
      // by any behavioural assertion: a DRAWN COUNT that disagrees with a number
      // printed everywhere else, and hardware drawn floating unattached.
      const cupola = mountWithSeed({ ...BASE, tab: 'map', selModule: 'cupola' });
      const dome = cupola.slice(cupola.indexOf('MODULE BLUEPRINT'));
      // The blueprint drew FIVE while the timeline says "the seven-window
      // Cupola", the shutter task says "all seven pressure windows", and the
      // 3-D scene builds 1 + 6. Count the window circles in the dome art.
      const windows = (dome.match(/<circle[^>]*stroke="#7dd3fc"/g) || []).length;
      expect(windows).toBe(7);
      // The stated count lives in the History timeline and the shutter task, not
      // in the map render — cross-check it against the SOURCE, which is the
      // whole point of this test: the drawing and the prose must agree.
      const toolSource = readFileSync(TOOL_PATHS[0], 'utf8');
      expect(toolSource).toIncludeText('seven-window Cupola');
      expect(toolSource).toIncludeText('all seven pressure windows');

      // The truss blueprint's four wings hung 15-22 units clear of the beam
      // with nothing joining them; each now has a mast and a rotary joint.
      const truss = mountWithSeed({ ...BASE, tab: 'map', selModule: 'truss' });
      const trussArt = truss.slice(truss.indexOf('MODULE BLUEPRINT'));
      expect((trussArt.match(/<rect[^>]*fill="#a86e16"/g) || []).length).toBe(4);
      expect((trussArt.match(/<line[^>]*stroke="#cbd5e1"[^>]*stroke-width="2.4"/g) || []).length).toBe(4);
    }, 30000);

    it('grows the solar arrays on the dates they were actually installed', () => {
      // The picture used to put all four wing pairs up at once from 2002 and
      // leave them, beside an AVAILABLE POWER readout climbing 18 -> 120 kW.
      const wingsAt = (assemblyIdx) => {
        const html = mountWithSeed({ ...BASE, tab: 'history', assemblyIdx });
        return (html.match(/data-iss-array-wing="([a-z0-9]+)"/g) || [])
          .map((m) => m.replace(/.*"([a-z0-9]+)"/, '$1'));
      };
      expect(wingsAt(0)).toEqual([]);                       // 1998: no arrays yet
      expect(wingsAt(1)).toEqual(['p6']);                   // Nov 2000: P6 on Z1
      expect(wingsAt(3)).toEqual(['p6', 'p4']);             // Sep 2006: P4
      expect(wingsAt(4)).toEqual(['p6', 'p4', 's4']);       // Jun 2007: S4
      expect(wingsAt(6)).toEqual(['p6', 'p4', 's4', 's6']); // Mar 2009: complete
      expect(wingsAt(12)).toEqual(['p6', 'p4', 's4', 's6']);

      // The count is stated, not just drawn, so it reaches screen readers and
      // sits next to the power figure it explains.
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 0 })).toIncludeText('0 / 8');
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 1 })).toIncludeText('2 / 8');
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 })).toIncludeText('8 / 8');
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 })).toIncludeText('8 of 8 solar array wings');

      // P6 flew on the Z1 truss above Unity and was physically relocated to the
      // port truss in 2007 — it should not be drawn at its final home before
      // that happened.
      const p6X = (assemblyIdx) => {
        const html = mountWithSeed({ ...BASE, tab: 'history', assemblyIdx });
        const group = html.slice(html.indexOf('data-iss-array-wing="p6"'));
        const hit = group.match(/x="(-?\d+(?:\.\d+)?)"/);
        return hit ? Number(hit[1]) : null;
      };
      expect(p6X(1)).toBe(296);   // 320 centre - 24: parked on Z1 above Unity
      expect(p6X(6)).toBe(126);   // 150 port end - 24: relocated in 2007
    });

    it('moves Leonardo from Unity to Tranquility in 2015, touching its new host and clear of Kibo', () => {
      // Each module's plan box, read through the DOM: its group's translate()
      // plus the first rect's offsets. Keyed by the module name in <title>.
      const boxesAt = (assemblyIdx) => {
        const host = document.createElement('div');
        host.innerHTML = mountWithSeed({ ...BASE, tab: 'history', assemblyIdx });
        const boxes = {};
        host.querySelectorAll('g > title').forEach((title) => {
          const g = title.parentElement, rect = g.querySelector('rect');
          const move = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(g.getAttribute('transform') || '');
          if (!move || !rect) return;
          const x = Number(move[1]) + Number(rect.getAttribute('x')), y = Number(move[2]) + Number(rect.getAttribute('y'));
          boxes[title.textContent.split(' — ')[0]] = { x0: x, y0: y, x1: x + Number(rect.getAttribute('width')), y1: y + Number(rect.getAttribute('height')) };
        });
        return boxes;
      };
      const overlap = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.01 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.01;
      const at2011 = boxesAt(8), at2020 = boxesAt(9);
      const unity = at2011['Unity (Node 1)'], leo2011 = at2011['Leonardo (PMM)'];
      // 2011-2015: on Unity's Earth-facing port, drawn on Unity's own centre.
      expect((leo2011.x0 + leo2011.x1) / 2).toBeCloseTo((unity.x0 + unity.x1) / 2, 6);
      expect((leo2011.y0 + leo2011.y1) / 2).toBeCloseTo(106 + 0.2 * 12, 6);
      // Since May 2015: Tranquility's forward port, aft end on its forward edge.
      const leo = at2020['Leonardo (PMM)'], node3 = at2020['Tranquility (Node 3)'], kibo = at2020['Kibo (JEM)'];
      expect((leo.x0 + leo.x1) / 2).toBeCloseTo((node3.x0 + node3.x1) / 2, 6);
      expect(leo.y1).toBeCloseTo(node3.y0, 6);
      expect(overlap(leo, node3)).toBe(false);
      expect(overlap(leo, kibo)).toBe(false);
    });

    it('renders History and a completed quiz debrief', () => {
      const history = mountWithSeed({ ...BASE, tab: 'history' });
      expect(history).toIncludeText('ORBITAL ASSEMBLY');
      expect(history).toIncludeText('AVAILABLE POWER');
      expect(history).toIncludeText('ASSEMBLY GROWTH PROFILE');
      expect(history).toIncludeText('data-iss-assembly-growth');
      expect(history).toIncludeText('Assembly to retirement');
      expect(history).toIncludeText('Previous');
      expect(history).toIncludeText('Next');
      expect(history).toIncludeText('iss-assembly-new');
      expect(history).toIncludeText('data-iss-assembly-install');
      expect(history).toIncludeText('data-iss-assembly-milestone');
      expect(history).toIncludeText('2002-2006');
      // Derived the same way the tool derives it, so this assertion keeps
      // testing that the "you are here" marker renders without going stale.
      expect(history).toIncludeText(`${new Date().getFullYear()} (now)`);
      expect(history).toIncludeText('Spot the Station');
      const retirement = mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 12 });
      expect(retirement).toIncludeText('CONTROLLED REENTRY');
      expect(retirement).toIncludeText('iss-deorbit-path');
      const kiboInstall = mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 });
      expect(kiboInstall).toIncludeText('INSTALLED THIS STEP');
      expect(kiboInstall).toIncludeText('Kibo');
      const quiz = mountWithSeed({ ...BASE, tab: 'quiz', quizDone: true, quizScore: 8, quizBest: 8, quizResults: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: false, 9: false, 10: false } });
      expect(quiz).toIncludeText('8 / 11');
      expect(quiz).toIncludeText('Flight-controller material');
      expect(quiz).toIncludeText('MISSION KNOWLEDGE DEBRIEF');
      expect(quiz).toIncludeText('QUESTION FLIGHT RECORD');
      expect(quiz).toIncludeText('8 correct, 3 to review');
      expect(quiz).toIncludeText('data-iss-quiz-debrief="11"');
      expect(quiz).toIncludeText('SHIELDING');
      expect(quiz).toIncludeText('INCLINATION');
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
        expect(live.host.textContent).not.toIncludeText('MISSION KNOWLEDGE DEBRIEF');
        expect(selected.textContent).toContain('Your answer — incorrect');
        expect(correct.textContent).toContain('Correct answer');
        expect(selected.getAttribute('aria-describedby')).toBe('iss-quiz-feedback');
        expect(live.host.querySelector('#iss-quiz-feedback').getAttribute('aria-atomic')).toBe('true');
        expect(document.activeElement).toBe(next);

        const results = await runAxe(live.host, {
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
          const results = await runAxe(live.host, {
            rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
          });
          expect(results.violations.map((violation) => violation.id)).toEqual([]);
        } finally {
          live.cleanup();
        }
      },
      // 240 s, raised from 120 s. The heaviest tab (interior, which mounts the
      // full 3-D crew scene) runs this pass in 2.6-4.4 s in ISOLATION and has
      // overrun 120 s three times under full-suite load — most recently at
      // 122.8 s, a 2% overshoot that failed a run in which nothing was wrong.
      // The cap is here to catch a HANG, not to measure how busy the machine
      // is, and 240 s still catches one. Same reasoning as the inclination
      // sweep above; see also runAxe, which stops one overrun cascading.
      240000,
    );
  });

  it('is registered in the catalog, loader lists, and build manifest', () => {
    const moduleSrc = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(moduleSrc).toIncludeText("id: 'spaceStation'");
    expect(moduleSrc).toIncludeText('spaceStation: true');

    ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'build.js'].forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src, p + ' should load the space station tool').toIncludeText("'stem_lab/stem_tool_spacestation.js'");
    });
    // Reads both ~44k-line ANTI copies plus App.jsx and build.js. That sat just
    // under vitest's 5s default and started timing out once the rest of the
    // suite grew — a timeout here reads as "the tool is unregistered", which is
    // alarming and wrong. Same convention as the axe tests below.
  }, 30000);
});

describe('an unknown persisted tab resolves to a real tab', () => {
  // The panel is a ternary chain ending in `renderQuiz()`, so an id this build
  // does not know did NOT blank the page -- it silently showed the QUIZ under a
  // heading no tab was selected for. Worse, the panel's
  // `aria-labelledby: 'iss-tab-' + tab` then referenced an element that does not
  // exist (WCAG 1.3.1 / 4.1.2), and no tab reported aria-selected="true".
  const labelTarget = (html) => {
    const id = (html.match(/aria-labelledby="(iss-tab-[^"]*)"/) || [])[1];
    return { id, exists: id ? html.includes('id="' + id + '"') : false };
  };

  it('keeps the tabpanel label pointing at a tab that exists', () => {
    for (const tab of ['map', 'quiz', 'zzz_not_a_tab', 'MAP', '']) {
      const html = mountWithSeed({ tab });
      const { id, exists } = labelTarget(html);
      expect(exists, `tab ${JSON.stringify(tab)} labelled by ${id}`).toBe(true);
    }
  });

  it('always marks one tab selected, and never silently opens the quiz', () => {
    const known = mountWithSeed({ tab: 'map' });
    const selectedOn = (h) => (h.match(/aria-selected="true"/g) || []).length;
    for (const tab of ['zzz_not_a_tab', 'MAP', 'Quiz']) {
      const html = mountWithSeed({ tab });
      expect(selectedOn(html), `tab ${tab} marks a selection`).toBe(selectedOn(known));
      // and it lands on the 3-D Station, not the certification exam
      expect(html).not.toIncludeText('FLIGHT-CONTROLLER EXAM');
    }
    // the real quiz tab still reaches the exam
    expect(mountWithSeed({ tab: 'quiz' })).toIncludeText('FLIGHT-CONTROLLER EXAM');
  });

  it('derives the allow-list from TABS so a new tab is covered for free', () => {
    TOOL_PATHS.forEach((filePath) => {
      const src = readFileSync(filePath, 'utf8');
      expect(src, filePath).toIncludeText('var TAB_IDS = TABS.map(');
      expect(src, filePath).toIncludeText("TAB_IDS.indexOf(d.tab) !== -1 ? d.tab : 'map'");
    });
  });
});

describe('every press-and-hold control claims the touch gesture', () => {
  // A press-and-hold with no `touch-action: none` is claimed by the browser for
  // page scrolling on a touchscreen, so the hold never starts. The 3-D canvas
  // and the thruster buttons already set it; four interior controls did not.
  // General check: compare the touchAction COUNT against the draggable /
  // holdable surfaces, not just "is it present somewhere".
  // ★Set it in CSS, not as an inline `style` prop. These buttons carried NO
  // style prop, and adding one changed how React reconciles them -- it turned
  // the Harmony cabin-stow GL test red (the astronaut reached HULL CONTACT
  // before the catch). A class rule fixes the touch defect with no React-side
  // change at all. Verified by running that GL test against both shapes.
  it('covers every press-and-hold control with a touch-action rule, in both copies', () => {
    TOOL_PATHS.forEach((filePath) => {
      const src = readFileSync(filePath, 'utf8');
      const at = src.indexOf('{touch-action:none}');
      expect(at, 'touch-action rule present in ' + filePath).toBeGreaterThan(-1);
      const rule = src.slice(Math.max(0, at - 260), at);
      ['.iss-interior-controls button', '[data-iss-interior-worksite-action]',
       '[data-iss-interior-capillary-action]', '[data-iss-interior-observation-action]']
        .forEach((sel) => expect(rule, sel + ' covered in ' + filePath).toContain(sel));
      // the handlers those selectors target must still exist
      ['worksiteHold(true)', 'capillaryHold(true)', 'observationHold(true)', 'setControl(true)']
        .forEach((handler) => expect(src, handler + ' in ' + filePath).toIncludeText('onPointerDown: ' + handler));
    });
  });

  it('ships the rule with the interior tab', () => {
    const html = mountWithSeed({ tab: 'interior' });
    expect(html).toIncludeText('data-iss-interior-worksite-action="true"');
    expect(html).toIncludeText('{touch-action:none}');
  });

  // A screen-reader user on a translated host got a MIX: most diagram
  // descriptions came through the pack, but 19 were raw English string
  // concatenation, so they stayed English no matter what pack was loaded.
  // These two tests keep that from creeping back. They are DERIVED from the
  // source rather than pinning a hand-written list, so a NEW diagram that
  // forgets __alloT fails here instead of shipping half-translated.
  it('routes every aria-label and screen-reader summary through __alloT', () => {
    TOOL_PATHS.forEach((filePath) => {
      const src = readFileSync(filePath, 'utf8');

      // Case 1: 'aria-label': <expression>. Anything whose expression contains
      // a single-quoted English phrase (3+ letters, a space, 3+ letters) but
      // no __alloT is an untranslated literal.
      const raw = [];
      // Scoped helpers like `function text(key, fallback) { return __alloT(prefix
      // + key, fallback); }` translate too; a call counts only if the file
      // defines that name exactly this way.
      const wrappers = new Set([...src.matchAll(/function (\w+)\(key, fallback\) \{ return __alloT\(/g)].map((w) => w[1]));
      expect(wrappers.size, 'scoped __alloT helpers in ' + filePath).toBeGreaterThan(0);
      // Every same-named helper must translate, or a call could reach a different one.
      [...src.matchAll(/function (\w+)\((?:key, fallback)?[^)]*\) \{([^\n]*)/g)]
        .filter(([, name]) => wrappers.has(name))
        .forEach(([, name, body]) => expect(body.trimStart().startsWith('return __alloT('), name + ' helper in ' + filePath).toBe(true));
      const re = /'aria-label':\s*([^\n]{0,400})/g;
      let m;
      while ((m = re.exec(src))) {
        const expr = m[1];
        if (expr.includes('__alloT')) continue;
        const call = /^(\w+)\(/.exec(expr);
        if (call && wrappers.has(call[1])) continue;
        // `'aria-label': aria` / `summary` / `label` reference a variable that
        // is built (and translated) elsewhere; only literals matter here.
        if (!/'[A-Za-z]{3,}[^']*\s[A-Za-z]{3,}/.test(expr)) continue;
        raw.push(expr.slice(0, 90));
      }
      expect(raw, 'untranslated aria-label literals in ' + filePath).toEqual([]);

      // Case 2: the `var aria =` / `var summary =` builders feeding those
      // labels. Each must start from a translated template.
      const builders = src.match(/var (?:aria|summary) = [^\n]{0,400}/g) || [];
      const rawBuilders = builders
        .filter((b) => !b.includes('__alloT'))
        .map((b) => b.slice(0, 90));
      expect(rawBuilders, 'untranslated aria/summary builders in ' + filePath).toEqual([]);
    });
  });

  // The R7 landmine: __alloT('key', 'text ' + value) puts an interpolated
  // FALLBACK under a static key. It reads fine until a pack supplies that key,
  // and then the NUMBER SILENTLY VANISHES. The house fix is a {value1}
  // placeholder filled by __alloFill AFTER translation.
  it('never hides a value inside a translation fallback', () => {
    TOOL_PATHS.forEach((filePath) => {
      const src = readFileSync(filePath, 'utf8');
      const interpolated = (src.match(/__alloT\('[^']+',\s*'[^']*'\s*\+/g) || []);
      expect(interpolated, 'interpolated __alloT fallbacks in ' + filePath).toEqual([]);

      // Every {valueN} in a fallback must actually be supplied by an
      // __alloFill on the same call, or the placeholder renders literally.
      const fills = (src.match(/__alloT\('[^']+',\s*'[^']*\{value\d+\}[^']*'\)/g) || []);
      fills.forEach((call) => {
        const at = src.indexOf(call);
        const before = src.slice(Math.max(0, at - 12), at);
        expect(before, 'placeholder text not wrapped in __alloFill: ' + call.slice(0, 70))
          .toContain('__alloFill(');
      });
    });
  });

  // The R9 `tab` defect, one level down. Every one of these is PERSISTED
  // state, and every one of them falls through to a working default view when
  // it holds an unknown id -- so the page looks fine. What breaks is quieter:
  // nothing keeps aria-pressed (no view/mode/scenario reads as current), and
  // the raw junk id reaches a live region or a data- attribute verbatim.
  // A saved project from another build, or a renamed id, is all it takes.
  describe('persisted selectors survive an unknown id', () => {
    beforeEach(() => {
      resetStemLab();
      loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
    });

    const SELECTORS = [
      ['mapView', 'map', 'overview'],
      ['opsMode', 'operations', 'integrated'],
      ['opsFocus', 'operations', 'all'],
      ['opsScenario', 'operations', 'custom'],
      ['opsEmergency', 'operations', 'leak'],
      ['cupolaScene', 'interior', 'day'],
      ['cupolaTarget', 'interior', 'day'],
      ['sleepSpot', 'interior', 'bag'],
      ['interiorRoom', 'interior', 'harmony'],
      ['dockResult', 'missions', 'complete'],
    ];

    it.each(SELECTORS)('renders %s junk exactly like its default', (key, tab, def) => {
      const good = mountWithSeed({ ...BASE, tab, [key]: def });
      const junk = mountWithSeed({ ...BASE, tab, [key]: 'zzz_not_a_value' });
      // Byte-identical is the right bar here: these tools have no randomised
      // content on these tabs, and anything less lets a mislabel through.
      expect(junk, key + ' junk render differs from its default').toBe(good);
      // And the junk id must never be echoed anywhere a user can perceive it.
      expect(junk).not.toIncludeText('zzz_not_a_value');
    });

    // A clamp that swallows VALID input would be worse than the bug it fixes,
    // so pin that every legitimate id still renders its own distinct thing.
    const VALID = [
      ['mapView', 'map', ['overview', 'truss', 'labs', 'russian', 'nadir']],
      ['opsMode', 'operations', ['integrated', 'power', 'eclss', 'thermal', 'attitude', 'debris', 'human', 'emergency', 'rendezvous']],
      ['opsFocus', 'operations', ['all', 'power', 'air', 'water', 'thermal', 'attitude']],
      ['opsScenario', 'operations', ['custom', 'nominal', 'science', 'eclipse', 'crew', 'fault']],
      ['cupolaTarget', 'interior', ['day', 'aurora', 'night']],
    ];

    it.each(VALID)('keeps every valid %s id distinct', (key, tab, ids) => {
      const renders = ids.map((id) => mountWithSeed({ ...BASE, tab, interiorRoom: tab === 'interior' ? 'cupola' : BASE.interiorRoom, [key]: id }));
      expect(new Set(renders).size, key + ': a valid id was clamped away').toBe(ids.length);
    });

    // Derive the allow-lists from the source so a NEW id added to the UI but
    // not to its clamp fails here rather than becoming unreachable from a
    // saved file -- the mistake the clamp itself is guarding against.
    it('derives each allow-list from the ids the UI can actually produce', () => {
      TOOL_PATHS.forEach((filePath) => {
        const src = readFileSync(filePath, 'utf8');

        const mapIds = (src.match(/var MAP_VIEW_IDS = \[([^\]]+)\]/) || [])[1];
        expect(mapIds, 'MAP_VIEW_IDS in ' + filePath).toBeTruthy();
        ['overview', 'truss', 'labs', 'russian', 'nadir']
          .forEach((id) => expect(mapIds).toIncludeText("'" + id + "'"));

        const modeIds = (src.match(/var OPS_MODE_IDS = \[([^\]]+)\]/) || [])[1];
        expect(modeIds, 'OPS_MODE_IDS in ' + filePath).toBeTruthy();
        // Every mode the ops dispatch ternary can branch to must be listed.
        // Scope to THAT line: `mode === '...'` also appears in the cargo-state
        // code ('held'/'secured'), which has nothing to do with ops modes.
        const dispatchLine = (src.match(/var content\s*=\s*mode\s*===[^\n]+/) || [])[0];
        expect(dispatchLine, 'ops dispatch line in ' + filePath).toBeTruthy();
        const dispatched = [...new Set(
          (dispatchLine.match(/mode\s*===\s*'([a-z]+)'/g) || [])
            .map((m) => m.replace(/^mode\s*===\s*'/, '').replace(/'$/, '')),
        )];
        expect(dispatched.length, 'ops dispatch branches found').toBeGreaterThan(5);
        dispatched.forEach((id) => expect(modeIds, id + ' missing from OPS_MODE_IDS').toContain("'" + id + "'"));

        // These two derive their allow-list from the very array the buttons
        // are built from, so they cannot drift by construction. Pin that.
        expect(src).toIncludeText("var focusIds = ['all'].concat(nodes.map(");
        expect(src).toIncludeText('var scenarioIds = [\'custom\'].concat(scenarioPresets.map(');
      });
    });
  });
});

// `toolData` is a SAVED PROJECT FILE, i.e. INPUT. It can carry a value from
// another build, a hand edit, or a half-written save. The numeric fields were
// all written as `Math.max(0, Math.min(N - 1, Number(v)))`, which LOOKS like a
// guard and is not one:
//   * Math.min(x, NaN) is NaN, so a non-numeric value gives NaN, ARRAY[NaN] is
//     undefined, and the next property read THROWS. The lab's error boundary is
//     unkeyed, so one throw blanks every tool on the page -- not just this one.
//   * A fraction survives the clamp intact (Math.min(2, 2.7) === 2.7), and
//     ARRAY[2.7] is undefined too. A clamp bounds a value; it does not make it
//     an index.
// Measured before the fix: 16 hard crashes across 5 of the 6 indices, plus the
// literal text "NaN" in 19 separate ops surfaces.
describe('a hostile saved file cannot crash the tool', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
  });

  // Array indices: a bad value must never reach ARRAY[...] as NaN or a float.
  const INDEX_FIELDS = [
    ['assemblyIdx', 'history'],
    ['dayIdx', 'day'],
    ['sysIdx', 'systems'],
    ['sysStep', 'systems'],
    ['quizIdx', 'quiz'],
    ['researchStep', 'interior'],
  ];
  // Numbers that feed sliders, arithmetic and readouts: a bad value must never
  // be PRINTED as NaN.
  const VALUE_FIELDS = [
    ['opsCrew', 'operations'],
    ['opsResearch', 'operations'],
    ['opsArrayAngle', 'operations'],
    ['opsBattery', 'operations'],
    ['opsScrub', 'operations'],
  ];
  const HOSTILE = ['abc', '', 2.7, -5, 9999, true, null, {}, []];

  it.each([...INDEX_FIELDS, ...VALUE_FIELDS])(
    'renders %s without throwing or printing NaN, whatever the save holds',
    (key, tab) => {
      HOSTILE.forEach((value) => {
        const label = key + ' = ' + JSON.stringify(value);
        let html;
        expect(() => {
          html = mountWithSeed({ ...BASE, tab, interiorRoom: 'destiny', [key]: value });
        }, label + ' threw').not.toThrow();
        expect(html, label + ' rendered nothing').toBeTruthy();
        // A student must never be shown "NaN" where a number belongs -- and a
        // screen-reader user must never hear "Cabin temp NaN degrees C".
        expect(html, label + ' printed NaN').not.toIncludeText('NaN');
        expect(html, label + ' printed undefined').not.toIncludeText('undefined');
      });
    },
  );

  // Guard the guards: pin that the hardened helpers exist and are actually used
  // at every index site, so a future edit cannot quietly reintroduce the raw
  // Math.min pattern on a persisted value.
  it('routes every persisted index through the integer guard', () => {
    TOOL_PATHS.forEach((filePath) => {
      const src = readFileSync(filePath, 'utf8');
      expect(src, 'issIndex helper in ' + filePath).toIncludeText('var issIndex = function (value, len, fallback)');
      expect(src, 'issNum helper in ' + filePath).toIncludeText('var issNum = function (value, min, max, fallback)');
      // Math.floor is what separates an index guard from a mere clamp.
      expect(src).toMatch(/var issIndex = function[^}]*Math\.floor\(n\)/);
      ['d.assemblyIdx', 'd.dayIdx', 'd.sysIdx', 'd.sysStep', 'd.quizIdx', 'd.researchStep']
        .forEach((field) => {
          const uses = (src.match(new RegExp('issIndex\\([^)]*' + field.replace('.', '\\.'), 'g')) || []).length;
          expect(uses, field + ' not routed through issIndex in ' + filePath).toBeGreaterThan(0);
        });
      // And the old shape must be gone from those sites. Strip line comments
      // first: the fix's own explanatory comment quotes the pattern it
      // replaced, and a raw whole-file regex cannot tell code from prose.
      // (The working tree is CRLF, so strip the \r before anchoring on $.)
      const code = src.replace(/\r/g, '').split('\n')
        .map((line) => line.replace(/^\s*\/\/.*$/, '')).join('\n');
      expect(code).not.toMatch(/Math\.min\([^)]*Number\(d\.(assemblyIdx|dayIdx|sysIdx|sysStep|quizIdx|researchStep)/);
    });
  });
});
