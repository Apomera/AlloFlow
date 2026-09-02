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
  interiorView: '3d', interiorNav: { flightRoom: null, hatches: {}, collisions: 0, railGrabs: 0, railPushOffs: 0, looseHits: 0, cargoCatches: 0, cargoSecures: 0, stowAttempts: 0, stowCatches: 0, stowSecures: 0, stowWarnings: 0, stowComplete: false, stowItems: {}, transferAttempts: 0, transferContacts: 0, transferCompletions: 0, transferComplete: false, capillaryAttempts: 0, capillaryUnderfills: 0, capillaryOverflows: 0, capillaryInterruptions: 0, capillaryTransfers: 0, worksiteAttempts: 0, worksiteReactions: 0, worksiteServices: 0, observationAttempts: 0, observationBlurs: 0, observationInterruptions: 0, observationCaptures: 0, observationSecures: 0, routeStep: 0, routeComplete: false },
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
      // One orbit implementation feeds the fast-facts card, the status strip,
      // the Orbit Lab readouts and the drag/reboost reference curve. They used
      // to derive it separately, and the card's static '~92 min' disagreed with
      // the strip's computed 93 on the very same screen.
      expect(source).toContain('var ISS_GM = 398600.4418');
      expect(source).toContain('function issOrbit(altKm)');
      expect((source.match(/398600\.4418/g) || []).length).toBe(1);
      expect(source).toContain('var v = Math.sqrt(ISS_GM / r)');   // v = sqrt(GM/r), once
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
      // Phones keep TWO columns for the four short status readouts (a single
      // column made the header 4 rows tall on a 390px screen).
      expect(source).toContain('@media (max-width:420px){.iss-status-strip{grid-template-columns:1fr 1fr}');
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

  it('paints the planet from real coastline data and says which parts are schematic', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // The land mask is real Natural Earth data in the same base36 per-row RLE
      // the flight-sim tool uses. Pin the decoder's shape and the grid size: a
      // silent change to either draws a garbled planet that still "renders".
      expect(source).toContain('ISS_LAND_W = 720, ISS_LAND_H = 360');
      expect(source).toContain("ISS_LAND_RLE.split(';')");
      expect(source).toContain("parseInt(runs[k], 36)");
      // 360 rows of latitude, one per line, or the decode walks off the mask.
      const rle = source.match(/var ISS_LAND_RLE = '([0-9a-z,;]+)'/);
      expect(rle).not.toBeNull();
      expect(rle[1].split(';').length).toBe(360);

      // Honesty: the tab must tell students which of what they see is data.
      expect(source).toContain('the coastlines are real');
      expect(source).toContain('Natural Earth');
      expect(source).toContain('are schematic');

      // Texture generation must stay deterministic. The GL smoke test compares
      // two mounts pixel-for-pixel; a Math.random() in the map painter would
      // either fail it or hide a real regression behind noise.
      const painter = source.slice(source.indexOf('function issEarthCanvases'), source.indexOf('function issGlowCanvas'));
      expect(painter.length).toBeGreaterThan(500);
      expect(painter).not.toContain('Math.random');
      // Painted once per quality tier and reused across mounts.
      expect(source).toContain('_issEarthCanvases[key]');

      // City lights ride the same daylight term as the windows and the array
      // glint: fixed emissive either blows them white over the day side or
      // leaves them invisible over the night side.
      expect(source).toContain('earthLightsMat.emissiveIntensity = 0.1 + 1.45 * lampOn');

      // The day/night sweep must circle in a plane containing the Earth-station
      // line. The old horizontal sweep kept the Sun above the planet forever,
      // so the ground below never had a night side at all.
      expect(source).toContain('sun.position.set(Math.cos(sa) * 10, Math.sin(sa) * 9.5, Math.cos(sa) * 4.5)');
      expect(source).not.toContain('sun.position.set(Math.cos(sa) * 10, 6, Math.sin(sa) * 10)');
      // A constant z kept the Sun behind the camera for the whole orbit, so the
      // sun billboard never rendered in the view students land on.
      expect(source).not.toContain('Math.sin(sa) * 9.5, 4.5)');

      // Earth's surface is at y = -4.5 here, so an "Earth-facing" camera below
      // that sits inside the planet and renders a flat wash.
      expect(source).toContain('nadir: { camera: [0, -3.9, 5.6]');
      expect(source).not.toContain('nadir: { camera: [0, -11.5, 2.5]');

      // Per-renderer textures must be released with the renderer.
      expect(source).toContain('earthTextures.forEach(');
    });
  });

  it('lights the atmospheric limb from the Sun instead of ringing the planet evenly', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Both shells carry per-vertex colour driven by the sun direction, so the
      // night limb goes dark and the terminator gets its orange line. A flat
      // material colour here is the regression: it lit the night side's limb as
      // brightly as the day side's.
      expect(source).toContain('function makeLimbShell(');
      expect(source).toContain('vertexColors: true');
      expect(source).toContain('limbShells[ls].update(_sunDir)');
      expect(source).not.toContain("new THREE.MeshBasicMaterial({ color: 0x67c8ff, transparent: true, opacity: 0.15");

      // Repainting 2,665 vertices per shell must stay off the hot path, and
      // must still force ONE draw under reduced motion — the idle-render guard
      // would otherwise hold the pre-paint image on screen for two seconds.
      expect(source).toContain('tick % 4 === 0 && limbShells.length');
      expect(source).toContain("+ (_limbPainted ? 1 : 0)");

      // The background is authored PRE tone-mapping: the post-FX chain runs the
      // clear colour through ACES, and the old value came out a milky navy.
      expect(source).toContain('new THREE.Color(0x000102)');
      expect(source).not.toContain('new THREE.Color(0x030712)');
    });
  });

  it('docks the visiting vehicles at the ports they actually use', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      // Dragon on Harmony forward (module at z -3.4, half-length 0.8, so the
      // port is at z -4.2) and Progress on Zvezda aft (4.6 + 1.6 = 6.2).
      expect(source).toContain("addVisitor(dragonCap, 'harmony')");
      expect(source).toContain("addVisitor(progressCargo, 'zvezda')");
      // Attached as details of their host module so the cutaway control dims
      // them together with it.
      expect(source).toContain("mesh._issParentId = hostId");
      expect(source).toContain('moduleDetails.push(mesh)');
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
      expect(source).toContain("id: 'iss_freeflight'");
      expect(source).toContain("id: 'iss_dock'");
      expect(source).toContain("id: 'iss_eva'");
      // Interior shift is interactive, responsive, and exposes hotspot learning
      expect(source).toContain('INTERIOR_ROOMS');
      expect(source).toContain('data-iss-interior');
      expect(source).toContain('iss-interior-layout');
      expect(source).toContain('INTERIOR_3D_LAYOUT');
      expect(source).toContain("var INTERIOR_ROUTE_IDS = ['harmony', 'destiny', 'unity', 'tranquility', 'cupola']");
      expect(source).toContain('function interiorCanvasRef');
      expect(source).toContain('data-iss-interior-canvas');
      expect(source).toContain("'aria-describedby': 'iss-interior-flight-instructions iss-interior-transfer-instructions iss-interior-flight-status iss-interior-transfer-readout iss-interior-stow-readout iss-interior-cabin-airflow iss-interior-observation-readout'");
      expect(source).toContain("id: 'iss-interior-transfer-instructions'");
      expect(source).toContain("'aria-keyshortcuts': 'W A S D R F Q E B C V T P X ArrowUp ArrowDown ArrowLeft ArrowRight Space Home'");
      expect(source).toContain('cv._issInteriorState = state');
      expect(source).toContain('cv._issInteriorSetControl');
      expect(source).toContain('cv._issInteriorGrabRail');
      expect(source).toContain('cv._issInteriorCargoAction = cargoAction');
      expect(source).toContain('cv._issInteriorStowAction = stowAction');
      expect(source).toContain('cv._issInteriorStowSceneItems = harmonyStowItems');
      expect(source).toContain('cv._issInteriorWorksiteAction = setWorksiteAction');
      expect(source).toContain('cv._issInteriorCenter');
      expect(source).toContain('cv._issInteriorReset');
      expect(source).toContain('cv._issInteriorCleanup = cleanup');
      expect(source).toContain('state.velocity.addScaledVector');
      expect(source).toContain("mode: 'STATIONARY'");
      expect(source).toContain("state.mode = 'RAIL HOLD'");
      expect(source).toContain('Math.ceil(elapsed / 0.04)');
      expect(source).toContain('if (state.velocity.length() > 0.78)');
      expect(source).toContain('COASTING // NO DRAG');
      expect(source).toContain('function crossedConnectorPlane');
      expect(source).toContain('function canOccupyFromRoom');
      expect(source).toContain('canOccupyFromRoom(state.room, tempCandidate)');
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
      expect(source).toContain('function hullCollisionNormal');
      expect(source).toContain('var normalImpactSpeed = state.velocity.dot(tempCollisionNormal)');
      expect(source).toContain("normalSpeed: normalImpactSpeed");
      expect(source).not.toContain('state.velocity.multiplyScalar(-0.18)');
      expect(source).toContain('angularVelocity: 0');
      expect(source).toContain('state.angularVelocity += rollInput');
      expect(source).toContain('ROTATING // NO DRAG');
      expect(source).toContain('railHeld: false');
      expect(source).toContain('pushOffLatch: false');
      expect(source).toContain('var railPushOffImpulse = 10');
      expect(source).toContain("emit('rail-push-off'");
      expect(source).toContain('state.pushOffLatch = true');
      expect(source).toContain('cargoPosition: cargo.position');
      expect(source).toContain('cargoVelocity: new THREE.Vector3');
      expect(source).toContain("cargoMode: 'loose', cargoHeld: false, cargoSecured: false");
      expect(source).toContain('function cargoAction()');
      expect(source).toContain("emit('cargo-caught'");
      expect(source).toContain("emit('cargo-secured'");
      expect(source).toContain("event.type === 'cargo-secured'");
      expect(source).toContain('nav.cargoSecured = true');
      expect(source).toContain('(navigation.cargoClear || navigation.cargoSecured)');
      // A bulky bag follows the learner through the Harmony-Destiny hatch
      // with spring/damper lag. Its full visible envelope, not only the crew
      // body, must clear the reduced centerline aperture.
      expect(source).toContain('var transferHatchZ = -8.45');
      expect(source).toContain('var transferSafeRadius = 0.70');
      expect(source).toContain('var transferAttachReach = 0.78');
      expect(source).toContain('var transferBagMass = 12');
      expect(source).toContain('var transferSpring = 5.6');
      expect(source).toContain('var transferDamping = 2.8');
      expect(source).toContain('function transferAction()');
      expect(source).toContain('function resetTransfer(preserveCounters, outcome)');
      expect(source).toContain('function updateHatchTransfer(dt)');
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
      expect(source).toContain('transferPreviousBodyPosition: startDef.center.clone()');
      expect(source).toContain('transferPreviousBagPosition: (persistedTransferComplete ? transferDockPoint : transferStagingPoint).clone()');
      expect(source).toContain('transferBodyCrossed: persistedTransferComplete, transferBagCrossed: persistedTransferComplete');
      expect(source).toContain('function interpolatedTransferRadius(previousPosition, currentPosition)');
      expect(source).toContain('function failHatchTransferContact(culprit, bodyRadius, bagRadius)');
      expect(transferPhysicsSource).toContain('var bodySweptForward = previousBodyPosition.z <= transferHatchZ && state.position.z > transferHatchZ;');
      expect(transferPhysicsSource).toContain('var bagSweptForward = previousBagPosition.z <= transferHatchZ && state.transferPosition.z > transferHatchZ;');
      expect(transferPhysicsSource).toContain('var bodySweptReverse = previousBodyPosition.z > transferHatchZ && state.position.z <= transferHatchZ;');
      expect(transferPhysicsSource).toContain('var bagSweptReverse = previousBagPosition.z > transferHatchZ && state.transferPosition.z <= transferHatchZ;');
      expect(transferPhysicsSource).toContain('if (bodySweptReverse) {');
      expect(transferPhysicsSource).toContain('state.transferBodyCrossed = false;');
      expect(transferPhysicsSource).toContain('state.transferBodyCrossingRadius = null;');
      expect(transferPhysicsSource).toContain('if (bagSweptReverse) {');
      expect(transferPhysicsSource).toContain('state.transferBagCrossed = false;');
      expect(transferPhysicsSource).toContain('state.transferBagCrossingRadius = null;');
      expect(transferPhysicsSource).toContain('state.transferBodyCrossingRadius = interpolatedTransferRadius(previousBodyPosition, state.position);');
      expect(transferPhysicsSource).toContain('state.transferBagCrossingRadius = interpolatedTransferRadius(previousBagPosition, state.transferPosition);');
      expect(transferPhysicsSource).toContain('var bodyUnsafe = bodySweptForward && state.transferBodyCrossingRadius > transferSafeRadius;');
      expect(transferPhysicsSource).toContain('var bagUnsafe = bagSweptForward && state.transferBagCrossingRadius > transferSafeRadius;');
      expect(transferPhysicsSource).toContain('failHatchTransferContact(culprit, state.transferBodyCrossingRadius, state.transferBagCrossingRadius);');
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
      expect(transferMoveToRoomSource).toContain("var transferCancelled = def.id !== previousRoom && state.transferMode === 'tethered' && !state.transferComplete;");
      const transferCancelReset = transferMoveToRoomSource.indexOf("resetTransfer(true, 'cancelled');");
      const transferTeleport = transferMoveToRoomSource.indexOf('state.position.copy(def.center);');
      expect(transferCancelReset).toBeGreaterThan(-1);
      expect(transferMoveToRoomSource).toContain("emit('transfer-cancelled'");
      expect(transferTeleport).toBeGreaterThan(transferCancelReset);
      const transferResetStart = source.indexOf('function resetTransfer(preserveCounters, outcome)');
      const transferResetEnd = source.indexOf('function placeCrewAtTransferStaging()', transferResetStart);
      const transferResetSource = source.slice(transferResetStart, transferResetEnd);
      expect(transferResetStart).toBeGreaterThan(-1);
      expect(transferResetEnd).toBeGreaterThan(transferResetStart);
      expect(transferResetSource).toContain('state.transferPreviousBodyPosition.copy(state.position);');
      expect(transferResetSource).toContain('state.transferPreviousBagPosition.copy(state.transferPosition);');
      expect(transferResetSource).toContain('state.transferBodyCrossed = !!state.transferComplete;');
      expect(transferResetSource).toContain('state.transferBagCrossed = !!state.transferComplete;');
      expect(transferResetSource).toContain('state.transferBodyCrossingRadius = state.transferComplete ? 0 : null;');
      expect(transferResetSource).toContain('state.transferBagCrossingRadius = state.transferComplete ? 0 : null;');
      expect(transferResetSource).toContain('state.transferPendingSafeCrossing = false;');
      expect(source).toContain('n.transferComplete');
      expect(source).toContain("transferMode: persistedTransferComplete ? 'docked' : 'staged'");
      expect(source).toContain('transferPreviousZ: persistedTransferComplete ? transferDockPoint.z : transferStagingPoint.z');
      expect(source).toContain("transferBag.name = 'iss-bulky-transfer-bag'");
      expect(source).toContain('new THREE.BoxGeometry(0.78, 0.52, 0.58)');
      expect(source).toContain('new THREE.TorusGeometry(0.47, 0.018');
      expect(source).toContain('new THREE.TorusGeometry(transferSafeRadius, 0.035');
      expect(source).toContain("transferTether.name = 'iss-bulky-transfer-tether'");
      expect(source).toContain("transferClearanceCue.name = 'iss-hatch-transfer-clearance-cue'");
      expect(source).toContain('transferTetherGeometry.attributes.position.needsUpdate = true');
      expect(source).toContain("var tetherVisible = state.transferMode === 'tethered';");
      expect(source).toContain('transferTether.visible = tetherVisible');
      expect(source).toContain('var dockVisible = state.transferComplete;');
      expect(source).toContain('transferDockCue.visible = dockVisible');
      expect(source).toContain("state.transferMode === 'tethered' ? transferBagMass : 0");
      expect(source).toContain("emit('transfer-attempt'");
      expect(source).toContain("emit('transfer-contact'");
      expect(source).toContain("emit('transfer-complete'");
      expect(source).toContain("if (event.code === 'KeyB')");
      expect(source).toContain('cv._issInteriorTransferAction = transferAction');
      expect(source).toContain('cv._issInteriorTransferAttempts = state.transferAttempts');
      expect(source).toContain('cv._issInteriorTransferContacts = state.transferContacts');
      expect(source).toContain('cv._issInteriorTransferCompletions = state.transferCompletions');
      expect(source).toContain('cv._issInteriorTransferComplete = state.transferComplete');
      expect(source).toContain('cv._issInteriorTransferAction = null');
      expect(source).toContain("event.type === 'transfer-attempt'");
      expect(source).toContain("event.type === 'transfer-contact'");
      expect(source).toContain("event.type === 'transfer-complete'");
      expect(source).toContain('nav.transferAttempts = Math.max');
      expect(source).toContain('nav.transferComplete = true');
      expect(source).toContain("if (event.source !== 'diagram')");
      const transferReducerStart = source.indexOf("} else if (event.type === 'transfer-attempt')");
      const transferReducerEnd = source.indexOf("} else if (event.type === 'stow-attempt')", transferReducerStart);
      const transferReducerSource = source.slice(transferReducerStart, transferReducerEnd);
      expect(transferReducerStart).toBeGreaterThan(-1);
      expect(transferReducerEnd).toBeGreaterThan(transferReducerStart);
      expect(transferReducerSource).toContain('var reportedTransferContact = Number(event.contact);');
      expect(transferReducerSource).toContain('? Math.max(Number(nav.transferContacts || 0), reportedTransferContact) : Number(nav.transferContacts || 0) + 1;');
      expect(transferReducerSource).toContain("if (event.source !== 'diagram') {");
      expect(transferReducerSource).toContain("nav.flightRoom = 'harmony';");
      expect(transferReducerSource).toContain("} else if (event.type === 'transfer-cancelled') {");
      expect(transferReducerSource).toContain("nav.transferLastOutcome = 'cancelled';");
      expect(transferReducerSource).toContain('nav.transferCancelledTo = event.to || null;');
      expect(transferReducerSource).toContain('if (!nav.transferComplete) nav.transferCompletions = Math.max');
      expect(source).toContain("{ id: 'transfer', done: !!navigation.transferComplete");
      expect(source).toContain("'data-iss-interior-transfer-action': 'true'");
      expect(source).toContain("'data-iss-interior-transfer-readout': 'true'");
      expect(source).toContain("'aria-describedby': 'iss-interior-transfer-readout'");
      expect(source).toContain("'aria-keyshortcuts': 'B'");
      expect(source).toContain('canvas._issInteriorTransferAttempts = Number(navigation.transferAttempts || 0)');
      expect(source).toContain('canvas._issInteriorTransferContacts = Number(navigation.transferContacts || 0)');
      expect(source).toContain('canvas._issInteriorTransferCompletions = Number(navigation.transferCompletions || 0)');
      expect(source).toContain('canvas._issInteriorTransferComplete = !!navigation.transferComplete');
      expect(source).toContain('cv._issInteriorTransferAttempts = null');
      expect(source).toContain('cv._issInteriorTransferContacts = null');
      expect(source).toContain('cv._issInteriorTransferCompletions = null');
      expect(source).toContain('cv._issInteriorTransferComplete = null');
      expect(source).toContain('function chooseHatchTransferDiagram(choice)');
      expect(source).toContain("if (navigation.transferComplete) return;");
      expect(source).toContain("'data-iss-hatch-transfer-diagram': 'true'");
      expect(source).toContain("'aria-labelledby': 'iss-hatch-transfer-diagram-title'");
      expect(source).toContain("'data-iss-hatch-transfer-clearance-cue': 'true'");
      expect(source).toContain("'aria-labelledby': 'iss-hatch-transfer-svg-title iss-hatch-transfer-svg-desc'");
      expect(source).toContain("h('title', { id: 'iss-hatch-transfer-svg-title' }");
      expect(source).toContain("h('desc', { id: 'iss-hatch-transfer-svg-desc' }");
      expect(source).toContain("'data-iss-hatch-transfer-choice': choice[0]");
      expect(source).toContain("'data-iss-hatch-transfer-diagram-readout': 'true'");
      expect(source).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
      expect(source).toContain("['aligned', 'Align body + bag on centerline']");
      expect(source).toContain("['body-only', 'Center my body only']");
      expect(source).toContain("['pull-hard', 'Pull harder through the rim']");
      expect(source).toContain('SAFE CENTER RADIUS 0.70 M');
      const transferDiagramStart = source.indexOf('function chooseHatchTransferDiagram(choice)');
      const transferDiagramEnd = source.indexOf('function sceneArt()', transferDiagramStart);
      const transferDiagramSource = source.slice(transferDiagramStart, transferDiagramEnd);
      expect(transferDiagramStart).toBeGreaterThan(-1);
      expect(transferDiagramEnd).toBeGreaterThan(transferDiagramStart);
      expect(transferDiagramSource).toContain("type: 'transfer-contact'");
      expect(transferDiagramSource).toContain("type: 'transfer-complete'");
      expect(transferDiagramSource).toContain("source: 'diagram'");
      expect(transferDiagramSource).toContain('safeRadius: 0.70');
      // Harmony adds three independently drifting cabin items. Safe capture is
      // based on reach and relative velocity; restraint requires a stable rail
      // brace at the matching item-specific target.
      expect(source).toContain("addHarmonyStowItem('bag', 'sleeping bag'");
      expect(source).toContain("addHarmonyStowItem('tablet', 'crew tablet'");
      expect(source).toContain("addHarmonyStowItem('cloth', 'damp washcloth'");
      expect(source).toContain("target.name = 'iss-harmony-restraint-' + id");
      expect(source).toContain('harmonyStowTargets.bag.add(bagStrap)');
      expect(source).toContain('harmonyStowTargets.tablet.add(tabletDock)');
      expect(source).toContain('harmonyStowTargets.cloth.add(hygienePouch)');
      expect(source).toContain('var stowCatchReach = 0.65');
      expect(source).toContain('var stowCatchRelativeSpeed = 0.2');
      expect(source).toContain('function stowAction()');
      expect(source).toContain('var stableBrace = state.railHeld && state.velocity.length() <= 0.02 && Math.abs(state.angularVelocity) <= 0.035');
      expect(source).toContain("emit('stow-caught'");
      expect(source).toContain("emit('stow-secured'");
      expect(source).toContain("emit('stow-complete'");
      expect(source).toContain("emit('stow-airflow-warning'");
      expect(source).toContain("if (event.code === 'KeyX')");
      expect(source).toContain("event.type === 'stow-attempt'");
      expect(source).toContain("event.type === 'stow-caught'");
      expect(source).toContain("event.type === 'stow-secured'");
      expect(source).toContain("event.type === 'stow-complete'");
      expect(source).toContain('station.cabinStow = { bag: true, tablet: true, cloth: true }');
      expect(source).toContain("{ id: 'stow', done: cabinStowComplete");
      expect(source).toContain('if (state.stowComplete)');
      expect(source).toContain('stowEl.disabled = state.stowComplete');
      expect(source.indexOf('if (state.stowComplete)', source.indexOf('function stowAction()'))).toBeLessThan(
        source.indexOf('state.stowAttempts += 1', source.indexOf('function stowAction()')),
      );
      expect(source).toContain('function freshInteriorNavigation()');
      expect(source).toContain("interiorView: '3d', interiorNav: freshInteriorNavigation()");
      expect(source).toContain('var startsFreshInteriorShift = patch && patch.interiorShiftComplete === false');
      expect(source).toContain('if (startsFreshInteriorShift) patch = Object.assign({}, patch, { interiorNav: freshInteriorNavigation() })');
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
      expect(source).toContain("var stowHandsBusy = state.cargoMode === 'held'");
      expect(source).toContain('is in reach and motion-matched. Press X to catch it.');
      expect(source).not.toContain("nearestStowDistance.toFixed(2) + ' meters away at '");
      expect(source).toContain('flowArrow.rotation.z = Math.PI / 2');
      // Reduced motion removes decorative tumbling, never the pouch's actual
      // free-flight translation and collision response.
      const cargoPhysicsStart = source.indexOf("if (state.cargoMode === 'loose')");
      const cargoTranslation = source.indexOf('tempCargoCandidate.copy(cargo.position).addScaledVector(state.cargoVelocity, dt)', cargoPhysicsStart);
      const cargoDecorationGuard = source.indexOf("if (!_prefersReducedMotion)", cargoTranslation);
      expect(cargoPhysicsStart).toBeGreaterThan(-1);
      expect(cargoTranslation).toBeGreaterThan(cargoPhysicsStart);
      expect(cargoDecorationGuard).toBeGreaterThan(cargoTranslation);
      expect(source.indexOf('cargo.position.copy(tempCargoCandidate)', cargoTranslation)).toBeLessThan(cargoDecorationGuard);
      expect(source).toContain('function updateMotionGuide');
      expect(source).toContain('new THREE.ArrowHelper');
      expect(source).toContain('motionGuideVisible');
      expect(source).toContain('function addWayfindingPlacard');
      expect(source).toContain('var hatchCollarMat');
      expect(source).toContain('function updateRoomLighting');
      expect(source).toContain('function setWorksiteAction(on)');
      expect(source).toContain('var worksiteAngularImpulse = 0.14');
      expect(source).toContain('var worksiteDuration = 1.5');
      expect(source).toContain("emit('worksite-reaction'");
      expect(source).toContain("emit('worksite-complete'");
      expect(source).toContain("event.type === 'worksite-complete'");
      expect(source).toContain('nav.worksiteComplete = true');
      expect(source).toContain('var capillaryFlowRate = 1.3');
      expect(source).toContain('var capillaryDoseMinimum = 2.7');
      expect(source).toContain('var capillaryDoseMaximum = 3.3');
      expect(source).toContain('Math.sqrt(state.capillaryDuration / capillaryWettingDuration)');
      expect(source).toContain('function setCapillaryAction(on)');
      expect(source).toContain('function cancelCapillaryAction(quiet)');
      expect(source).toContain('function updateCapillary(dt, now)');
      expect(source).toContain("emit('capillary-underfill'");
      expect(source).toContain("emit('capillary-overflow'");
      expect(source).toContain("emit('capillary-interrupted'");
      expect(source).toContain("emit('capillary-complete'");
      expect(source).toContain("event.type === 'capillary-complete'");
      expect(source).toContain('nav.capillaryComplete = true');
      expect(source).toContain('cv._issInteriorCapillaryAction = setCapillaryAction');
      expect(source).toContain('cv._issInteriorCapillaryCancel = cancelCapillaryAction');
      expect(source).toContain('cv._issInteriorCapillaryAction = null');
      expect(source).toContain("'data-iss-interior-capillary-action': 'true'");
      expect(source).toContain('cv._issInteriorResearchStep = null');
      expect(source).toContain('cv._issInteriorCapillaryLastDose = null');
      expect(source).toContain('if (wasActive) state.capillaryAttempts = Math.max(0, state.capillaryAttempts - 1)');
      expect(source).toContain('onPointerLeave: capillaryCancel');
      expect(source).toContain("'data-iss-interior-capillary-readout': 'true'");
      expect(source).toContain('Target band reached. Release V now');
      expect(source).toContain('SECURE SAMPLE FIRST // WATER VALVE LOCKED');
      expect(source).toContain('Contained fluid transfer');
      expect(source).toContain('var observationReach = 0.95');
      expect(source).toContain('var observationDuration = 1.2');
      expect(source).toContain('function setObservationAction(on)');
      expect(source).toContain('function cancelObservationAction(quiet)');
      expect(source).toContain('function updateObservation(dt, now)');
      expect(source).toContain("emit('observation-blurred'");
      expect(source).toContain("emit('observation-interrupted'");
      expect(source).toContain("emit('observation-captured'");
      expect(source).toContain("emit('observation-secured'");
      expect(source).toContain('cv._issInteriorObservationAction = setObservationAction');
      expect(source).toContain('cv._issInteriorObservationCancel = cancelObservationAction');
      expect(source).toContain('cv._issInteriorObservationAction = null');
      expect(source).toContain('cv._issInteriorObservationCancel = null');
      expect(source).toContain('cv._issInteriorSecureCupola = null');
      expect(source).toContain("'data-iss-interior-observation-action': 'true'");
      expect(source).toContain("'data-iss-interior-observation-readout': 'true'");
      expect(source).toContain("'data-iss-interior-stow-action': 'true'");
      expect(source).toContain("'data-iss-interior-stow-status': cabinStowComplete ? 'complete' : 'approach'");
      expect(source).toContain("'data-iss-interior-stow-item': 'none'");
      expect(source).toContain("'data-iss-interior-stow-count': cabinStowComplete ? '3' : '0'");
      expect(source).toContain("'data-iss-interior-stow-readout': 'true'");
      expect(source).toContain("'data-iss-interior-cabin-airflow': 'true'");
      expect(source).toContain("cabinAirflowEl.setAttribute('data-state', state.stowAirflowState)");
      expect(source).toContain("state.stowAirflowState === 'blocked'");
      expect(source).toContain("var cabinDiagramEnabled = d.interiorView === 'diagram'");
      expect(source).toContain('Capture Earth frame (P)');
      expect(source).toContain('releasing early blurs the frame');
      expect(source).not.toContain('if (roomAt(tempCandidate))');
      expect(source).toContain("emit('hatch'");
      expect(source).toContain("emit('cargo-clear'");
      expect(source).toContain("emit('orientation-recovered'");
      expect(source).toContain("emit('route-complete'");
      expect(source).toContain('if (!state.routeComplete)');
      expect(source).toContain('if (!preserveProgress && !state.routeComplete)');
      expect(source).toContain('nav.routeComplete = !!nav.routeComplete || !!canvasState.routeComplete');
      expect(source).toContain('nav.flightRoom = event.to');
      expect(source).toContain('storedNavigation.flightRoom');
      expect(source).not.toContain('station.interiorRoom = event.to');
      expect(source).toContain("'data-iss-interior-room-select': r.id");
      expect(source).toContain("'data-iss-interior-reset-route': 'true'");
      expect(source).toContain("if (interiorView !== 'diagram' || roomDone || captured) return;");
      expect(source).toContain("recordInteriorNavigation({ type: 'observation-captured'");
      expect(source).toContain("source: 'diagram'");
      expect(source).toContain('function railDistance');
      expect(source).toContain('function nextRouteTarget');
      expect(source).toContain('distance > 0.68');
      expect(source).toContain('speed >= 0.12 && speed <= 0.35');
      expect(source).toContain('side: THREE.BackSide');
      expect(source).toContain('THREE.CanvasTexture');
      expect(source).toContain('issEarthCanvases(256)');
      expect(source).toContain('new THREE.RingGeometry(aperture, bulkheadOuterRadius');
      expect(source).toContain('polygonOffset: true');
      expect(source).toContain('COUNTER-PUSH NOW // FAST');
      expect(source).toContain('function addModulePlacard');
      expect(source).toContain('function addActivityBeacon');
      expect(source).toContain('function addModuleIdentityKit');
      const identityKitStart = source.indexOf('function addModuleIdentityKit');
      const identityKitEnd = source.indexOf('function addRoom', identityKitStart);
      const identityKitSource = source.slice(identityKitStart, identityKitEnd);
      ['harmony', 'destiny', 'unity', 'tranquility', 'cupola'].forEach((roomId) =>
        expect(identityKitSource).toContain("def.id === '" + roomId + "'"));
      ['berth', 'scienceGlass', 'destinyWickDry', 'restraintRing', 'duct', 'controller'].forEach((landmark) =>
        expect(identityKitSource).toContain(landmark));
      expect(source).toContain('function updateCrewRig');
      expect(source).toContain("handPose: 'tucked'");
      expect(source).toContain('data-iss-hand-pose');
      expect(source).toContain('cv._issInteriorRouteStep');
      expect(source).toContain('cv._issInteriorRouteComplete');
      expect(source).toContain('cv._issInteriorVisitedRooms');
      expect(source).toContain('cv._issInteriorOrientationDone');
      expect(source).toContain('iss-interior-route-map');
      expect(source).toContain('iss-route-schematic');
      expect(source).toContain('data-iss-interior-rail-distance');
      expect(source).toContain('data-iss-interior-next-label');
      expect(source).toContain('data-iss-interior-next-distance');
      expect(source).toContain('data-iss-interior-next-arrow');
      expect(source).toContain('data-iss-interior-event');
      expect(source).toContain('data-iss-interior-objective');
      expect(source).toContain('data-iss-interior-reticle');
      expect(source).toContain('data-iss-interior-orientation');
      expect(source).toContain('data-iss-interior-braking');
      expect(source).toContain('data-iss-interior-impact-flash');
      expect(source).toContain('data-iss-interior-cargo-action');
      expect(source).toContain('data-iss-interior-cargo-status');
      expect(source).toContain('data-iss-interior-worksite-action');
      expect(source).toContain('data-iss-interior-worksite-status');
      expect(source).toContain('grabEl.disabled = false');
      expect(source).toContain("grabEl.setAttribute('aria-disabled', !state.railHeld && distanceToRail > 0.68 ? 'true' : 'false')");
      expect(source).toContain('cv._issInteriorCargoAction = null');
      expect(source).toContain('cv._issInteriorStowAction = null');
      expect(source).toContain('cv._issInteriorStowSceneItems = null');
      expect(source).toContain('cv._issInteriorCabinStow = null');
      expect(source).toContain('cv._issInteriorCabinComplete = null');
      expect(source).toContain('cv._issInteriorStowItems = null');
      expect(source).toContain('cv._issInteriorStowAttempts = null');
      expect(source).toContain('cv._issInteriorStowCatches = null');
      expect(source).toContain('cv._issInteriorStowSecures = null');
      expect(source).toContain('cv._issInteriorStowWarnings = null');
      expect(source).toContain('cv._issInteriorWorksiteAction = null');
      expect(source).toContain('cv._issInteriorEvent = null');
      expect(source).toContain('cv._issInteriorWantRoom = null');
      expect(source).toContain('renderer.forceContextLoss()');
      expect(source).toContain('function handleInteriorInitFailure');
      expect(source).toContain('cv._issInteriorRenderer = renderer');
      expect(source).toContain("cv.addEventListener('webglcontextlost'");
      expect(source).toContain("cv.removeEventListener('webglcontextlost'");
      expect(source).toContain('data-iss-next-maneuver');
      expect(source).toContain('data-iss-interior-fallback');
      expect(source).toContain('function showInteriorFallback');
      expect(source).toContain("shell.setAttribute('data-iss-webgl-state', 'unavailable')");
      expect(source).toContain("shell.querySelectorAll('.iss-interior-controls button')");
      expect(source).toContain('unavailableControls[controlIndex].disabled = true');
      expect(source).toContain('.iss-interior-sim[data-iss-webgl-state="unavailable"] .iss-interior-controls{display:none}');
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
      expect(html).toContain('Space Station');
      expect(html).toContain('iss-station-stage');
      expect(html).toContain('ISS // ORBITAL VIEW');
      expect(html).toContain('Interactive 3-D model of the International Space Station');
      expect(html).toContain('Fast facts');
      // ...and the interior surface is NOT what greets them.
      expect(html).not.toContain('data-iss-room-transition');
      // The 3-D tab is also first in the tablist, so keyboard Home reaches it.
      const mapIndex = html.indexOf('iss-tab-map');
      const interiorIndex = html.indexOf('iss-tab-interior');
      expect(mapIndex).toBeGreaterThan(-1);
      expect(interiorIndex).toBeGreaterThan(mapIndex);
    });

    it('still opens the interior crew shift when that tab is selected', () => {
      const html = mountWithSeed({ ...BASE, tab: 'interior' });
      expect(html).toContain('Float inside. Work like an astronaut.');
      expect(html).toContain('Crew quarters');
      expect(html).toContain('CONNECTED INTERIOR ROUTE');
      expect(html).toContain('PORT TURN // NADIR DESCENT');
      expect(html).toContain('data-iss-room-transition');
      expect(html).toContain('Stow your sleep station');
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
        expect(live.host.textContent).toContain('Rotation continues after release');
        expect(live.host.textContent).toContain('Grab handrail');

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
        expect(live.host.textContent).toContain('1 hatch transitions / 1 rail catches');
        expect(live.host.textContent).toContain('1 hull contacts');
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
        expect(live.host.textContent).toContain('1 pouches secured');

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
        expect(live.host.textContent).toContain('0 / 5 jobs');

        act(() => {
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 3 });
          canvas._issInteriorEvent({ type: 'stow-caught', room: 'harmony', item: 'tablet', distance: 0.6, relativeSpeed: 0.19, attempt: 3 });
          canvas._issInteriorEvent({ type: 'stow-attempt', room: 'harmony', attempt: 4, held: 'tablet' });
          canvas._issInteriorEvent({ type: 'stow-secured', room: 'harmony', item: 'tablet', count: 2, attempt: 4, braced: true });
        });
        expect(live.host.querySelector('[data-iss-nav-challenge="stow"]').className).not.toContain('is-complete');
        expect(canvas._issInteriorCabinStow).toEqual({ bag: true, tablet: true });
        expect(live.host.textContent).toContain('0 / 5 jobs');

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
        expect(live.host.textContent).toContain('0 / 5 jobs');
        expect(stowControl.disabled).toBe(true);
        expect(stowControl.getAttribute('data-iss-interior-stow-status')).toBe('complete');
        expect(stowControl.getAttribute('data-iss-interior-stow-count')).toBe('3');
        expect(live.host.querySelector('[data-iss-interior-cabin-airflow]').getAttribute('data-state')).toBe('clear');

        act(() => {
          canvas._issInteriorEvent({ type: 'stow-complete', room: 'harmony', count: 3, attempt: 6, source: '3d' });
          canvas._issInteriorEvent({ type: 'stow-complete', room: 'harmony', count: 3, attempt: 6, source: '3d' });
        });
        expect(live.host.textContent).toContain('1 / 5 jobs');
        expect(live.host.textContent).toContain('Crew attempts: 1');
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
        expect(live.host.textContent).toContain('1 reaction-torque events');

        act(() => {
          canvas._issInteriorEvent({ type: 'worksite-complete', room: 'tranquility', duration: 1.5, maxSpeed: 0, maxAngularSpeed: 0, attempt: 2, braced: true });
        });
        expect(worksiteChallenge.className).toContain('is-complete');
        expect(worksiteChallenge.textContent).toContain('Tranquility filter serviced without losing body position.');
        expect(live.host.querySelector('.iss-nav-challenges').getAttribute('aria-label')).toContain('1 of 10 complete');
        expect(live.host.textContent).toContain('1 filters serviced');

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
        expect(live.host.textContent).toContain('1 wick underfills');
        expect(live.host.textContent).toContain('1 contained overflows');
        expect(live.host.textContent).toContain('0 wick transfers');
        expect(live.host.textContent).toContain('3-D transfer interrupted');
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
        expect(live.host.textContent).toContain('1 wick transfers');
        expect(live.host.textContent).toContain('Wick primed in 3-D at 2.94 mL');
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
        expect(live.host.textContent).toContain('1 wick transfers');
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
        expect(live.host.textContent).toContain('1 blurred Earth frames');
        expect(live.host.textContent).toContain('1 interrupted frame locks');
        expect(live.host.textContent).toContain('1 Earth frames captured');
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
        expect(live.host.textContent).toContain('1 / 5 jobs');
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
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: 'diagram', interiorRoom: 'harmony' });
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
      const live = mountLiveWithSeed({ ...BASE, tab: 'interior', interiorView: 'diagram', interiorRoom: 'cupola', interiorNav: { ...BASE.interiorNav, flightRoom: 'cupola' } });
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
    it('teaches inclination with a real ground track over real coastlines', () => {
      const at = (orbitInc) => mountWithSeed({ ...BASE, tab: 'orbit', orbitInc });

      // Default is the station's real inclination, and the track's highest
      // latitude must equal it — that identity IS the orbital mechanics here.
      const iss = at(51.6);
      expect(iss).toContain('data-iss-ground-track="51.6"');
      expect(iss).toContain('Reaches 51.6°N to 51.6°S');
      expect(at(28.5)).toContain('Reaches 28.5°N to 28.5°S');
      expect(at(90)).toContain('Reaches 90.0°N to 90.0°S');

      // Land coverage is COMPUTED from the embedded mask (cos-weighted for
      // area), not quoted: a band of zero width covers no land, a polar orbit
      // covers all of it, and 51.6° lands where the real geography puts it.
      expect(at(0)).toContain('0% of Earth’s land');
      expect(at(90)).toContain('100% of Earth’s land');
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
      expect(at(28.5)).toContain('3 of 5');
      expect(iss).toContain('5 of 5');

      // Reachability must not be carried by colour alone: red/green is the
      // commonest colour-vision failure and axe cannot see the problem, because
      // both colours pass contrast against the map behind them. Unreachable
      // pads get a hollow ring with a strike through it, and the map's own
      // aria-label names them.
      expect(at(28.5)).toContain('filled dot = pad can reach this orbit');
      expect(at(28.5)).toMatch(/data-iss-site-reachable="no"[\s\S]{0,400}?fill="none"/);
      expect(at(28.5)).toMatch(/Tanegashima and Baikonur cannot reach this orbit directly/);
      expect(iss).toContain('All five marked launch sites can reach this orbit directly');

      // The explanation must survive: you can aim higher than your latitude,
      // never lower.
      expect(at(28.5)).toContain('cannot reach 28.5°');
      expect(iss).toContain('Baikonur sits at about 46°N');
      // The explanation of the REAL orbit must not follow the slider: it quotes
      // the land share at 51.6°, not at whatever the student has dragged to.
      expect(at(10)).toContain('about 71% of Earth’s land');
      expect(at(10)).toContain('flies over 14% of Earth’s land');   // the live readout does follow
      // ...and the placeholder must actually be substituted, never shipped raw.
      expect(iss).not.toContain('{pct}');
      // London 51.5°N is inside the band and Berlin 52.5°N is outside — a
      // checkable anchor, and both cities are in the tool's own light list.
      expect(iss).toContain('London at 51.5°N');
      expect(iss).toContain('Berlin, at 52.5°N');
    });

    it('derives the quiz pass mark once instead of writing it out six times', () => {
      TOOL_PATHS.forEach((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        // The threshold appeared as a literal 7 in the quest hook, the quest
        // LABEL, the debrief message, the completion toast, and three times in
        // the debrief gauge. Adding an eleventh question moved the bar in some
        // of those and not others, so the gauge would have said FLIGHT
        // QUALIFIED at a score the quest refused to credit.
        expect(source).toContain('var QUIZ_PASS = Math.ceil(QUIZ.length * 0.7)');
        expect(source).toContain("label: 'Score ' + QUIZ_PASS + '+ on the station quiz'");
        expect(source).toContain('(s.quizBest || 0) >= QUIZ_PASS');
        expect(source).toContain('d.quizScore >= QUIZ_PASS');
        expect(source).toContain('finalScore >= QUIZ_PASS');
        expect(source).not.toMatch(/score >= 7 \?/);
        expect(source).not.toContain("'Score 7+ on the station quiz'");
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
        expect(html, 'system ' + entry.id + ' should render').toContain('iss-system-tabs');
        // React escapes & in the serialized markup, so compare like for like.
        const escaped = entry.name.replace(/&/g, '&amp;');
        expect(html, 'system ' + entry.id + ' should show its own name').toContain(escaped);
        expect(html, 'system ' + entry.id + ' should not render as NaN/undefined').not.toContain('undefined');
      });

      // The Operations tab pulls three schematics by MEANING, not by position:
      // an index lookup silently drew the wrong loop if SYSTEMS was reordered.
      expect(source).toContain("systemById('water')");
      expect(source).toContain("systemById('thermal')");
      expect(source).toContain("systemById('body')");
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
      modules.forEach((mod) => {
        const html = mountWithSeed({ ...BASE, tab: 'map', selModule: mod.id });
        expect(html, 'module ' + mod.id + ' should render its own card').toContain(esc(mod.name));
        expect(html, 'module ' + mod.id + ' should not leak undefined').not.toContain('undefined');
        expect(html, 'module ' + mod.id + ' should not leak NaN').not.toContain('NaN');
      });

      const dayBlock = source.match(/var DAY_SCHEDULE = \[([\s\S]*?)\n {2}\];/)[1];
      const daySlots = [...dayBlock.matchAll(/\{ h: '([^']+)'/g)].map((m) => m[1]);
      expect(daySlots.length).toBe(12);
      daySlots.forEach((time, index) => {
        const html = mountWithSeed({ ...BASE, tab: 'day', dayIdx: index });
        expect(html, 'day slot ' + time + ' should render').toContain(time);
        expect(html, 'day slot ' + time + ' should not leak undefined').not.toContain('undefined');
      });

      const quizCount = (source.match(/^ {4}\{ q: '/gm) || []).length;
      for (let i = 0; i < quizCount; i++) {
        const html = mountWithSeed({ ...BASE, tab: 'quiz', quizIdx: i, quizPicked: null });
        expect(html, 'quiz question ' + i + ' should render').toContain('iss-quiz-option-' + i + '-0');
        expect(html, 'quiz question ' + i + ' should not leak undefined').not.toContain('undefined');
      }
    });

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
        expect(html, 'ops mode ' + mode + ' should render').toContain('iss-ops-grid');
        expect(html, 'ops mode ' + mode + ' should not leak undefined').not.toContain('undefined');
        expect(html, 'ops mode ' + mode + ' should not leak NaN').not.toContain('NaN');
      });

      const scenarios = [...source.matchAll(/\{ id: '([a-z]+)', icon: '[^']*', label: '[^']*', note: '[^']*', patch:/g)]
        .map((m) => m[1]);
      expect(scenarios).toEqual(['nominal', 'science', 'eclipse', 'crew', 'fault']);
      scenarios.forEach((scenario) => {
        const html = mountWithSeed({ ...BASE, tab: 'operations', opsScenario: scenario });
        expect(html, 'scenario ' + scenario + ' should render').toContain('iss-ops-grid');
        expect(html, 'scenario ' + scenario + ' should not leak NaN').not.toContain('NaN');
      });

      ['leak', 'fire', 'cooling'].forEach((emergency) => {
        const html = mountWithSeed({ ...BASE, tab: 'operations', opsMode: 'emergency', opsEmergency: emergency });
        expect(html, 'emergency ' + emergency + ' should render').toContain('iss-ops-grid');
        expect(html, 'emergency ' + emergency + ' should not leak undefined').not.toContain('undefined');
      });
    });

    it('derives the relay numbers from the same physics it teaches', () => {
      const html = mountWithSeed({ ...BASE, tab: 'systems', sysIdx: 6, sysStep: 0 });
      expect(html).toContain('Talking to the ground');

      // Geostationary is not a quoted altitude — it is the ONE radius whose
      // period is a sidereal day, so it falls out of Kepler's third law.
      const GM = 398600.4418, Re = 6371, SID = 86164, C = 299792.458, ref = 420;
      const rGeo = Math.cbrt((GM * SID * SID) / (4 * Math.PI * Math.PI));
      const alt = Math.round((rGeo - Re) / 100) * 100;
      expect(alt).toBe(35800);                         // published 35,786 km
      expect(html).toContain(alt.toLocaleString() + ' km');
      expect(html).toContain(Math.round((rGeo - Re) / ref) + '× higher');

      // ...and the delay is that path length over c, using the SHORT geometry
      // so the number quoted is a floor.
      const path = (rGeo - (Re + ref)) + (rGeo - Re);
      const ms = Math.round(((2 * path) / C) * 1000 / 10) * 10;
      expect(ms).toBeGreaterThan(400);
      expect(ms).toBeLessThan(600);
      expect(html).toContain(ms + ' ms');
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
      expect(html).toContain(v.toFixed(2) + ' km/s');
    });

    it('survives a corrupted inclination instead of rendering NaN', () => {
      // Number('') is 0 and Number('abc') is NaN. The first would quietly show
      // an equatorial orbit as though the student had chosen it; the second put
      // NaN into every coordinate of the ground-track SVG. Both fall back.
      const bad = (orbitInc) => mountWithSeed({ ...BASE, tab: 'orbit', orbitInc });
      ['', 'abc', null, undefined, NaN].forEach((value) => {
        const html = bad(value);
        expect(html).not.toContain('NaN');
        expect(html).toContain('data-iss-ground-track="51.6"');
      });
      // A real value still wins, out-of-range values clamp rather than fall
      // back, numeric strings are accepted, and a genuine 0 SURVIVES — it is
      // the Equatorial preset, not a missing value.
      expect(bad(28.5)).toContain('data-iss-ground-track="28.5"');
      expect(bad('28.5')).toContain('data-iss-ground-track="28.5"');
      expect(bad(0)).toContain('data-iss-ground-track="0.0"');
      expect(bad(-40)).toContain('data-iss-ground-track="0.0"');
      expect(bad(400)).toContain('data-iss-ground-track="90.0"');

      // Derived once: two copies of the clamp expression would let a changed
      // default disagree with itself between the map and the readouts.
      TOOL_PATHS.forEach((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        expect((source.match(/Number\(_rawInc\)/g) || []).length).toBe(1);
        expect(source).toContain("_rawInc == null || _rawInc === ''");
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
        expect(source).toContain('_issRowPrefix');
        expect(source).toContain('function issLandRowAreas');
        expect(source).toMatch(/_issRowPrefix\[lastExclusive\] - _issRowPrefix\[first\]/);
        // The old per-call full scan must not come back.
        expect(source).not.toMatch(/function issLandShareWithin[\s\S]{0,600}?for \(var col = 0; col < ISS_LAND_W/);
      });
    });

    it('draws the ground track from the same land data as the globe', () => {
      // One mask, two surfaces. If the flat map ever stops agreeing with the
      // 3-D globe the tool is telling two different stories about the planet.
      const html = mountWithSeed({ ...BASE, tab: 'orbit' });
      expect(html).toContain('Coastlines: Natural Earth (public domain)');
      // Land is ONE path built from run-length subpaths. A world with almost no
      // subpaths means the mask decode silently produced an empty planet.
      const landPath = /<path d="((?:M[-\d.]+ [-\d.]+h[-\d.]+v[-\d.]+h-[-\d.]+z)+)"/.exec(html);
      expect(landPath).not.toBeNull();
      expect((landPath[1].match(/M/g) || []).length).toBeGreaterThan(300);
      // ...and it must NOT go back to hundreds of separate elements: that made
      // the orbit tab's axe pass take 59s and re-reconciled on every drag.
      expect((html.match(/<rect[^>]*>/g) || []).length).toBeLessThan(30);
    });

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
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 0 })).toContain('0 / 8');
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 1 })).toContain('2 / 8');
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 })).toContain('8 / 8');
      expect(mountWithSeed({ ...BASE, tab: 'history', assemblyIdx: 6 })).toContain('8 of 8 solar array wings');

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
      const quiz = mountWithSeed({ ...BASE, tab: 'quiz', quizDone: true, quizScore: 8, quizBest: 8, quizResults: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: false, 9: false, 10: false } });
      expect(quiz).toContain('8 / 11');
      expect(quiz).toContain('Flight-controller material');
      expect(quiz).toContain('MISSION KNOWLEDGE DEBRIEF');
      expect(quiz).toContain('QUESTION FLIGHT RECORD');
      expect(quiz).toContain('8 correct, 3 to review');
      expect(quiz).toContain('data-iss-quiz-debrief="11"');
      expect(quiz).toContain('SHIELDING');
      expect(quiz).toContain('INCLINATION');
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
    // Reads both ~44k-line ANTI copies plus App.jsx and build.js. That sat just
    // under vitest's 5s default and started timing out once the rest of the
    // suite grew — a timeout here reads as "the tool is unregistered", which is
    // alarming and wrong. Same convention as the axe tests below.
  }, 30000);
});
