import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendorContext = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendorContext);
const Three = vendorContext.THREE;
const helpers = () => window.__RR_TEST_EXPORTS__.flightSim;
const radians = degrees => degrees * Math.PI / 180;
const vector = value => new Three.Vector3(value.x, value.y, value.z);

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
});
let mountedRoot, mountedHost;
afterEach(async () => {
  if (mountedRoot) await React.act(async () => mountedRoot.unmount());
  mountedRoot = null; mountedHost?.remove(); mountedHost = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks; delete window.THREE;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

const poses = [
  { heading: 0, pitch: 0, bank: 0 },
  { heading: 90, pitch: 0, bank: 0 },
  { heading: 180, pitch: 0, bank: 0 },
  { heading: 270, pitch: 0, bank: 0 },
  { heading: 0, pitch: 30, bank: 45 },
  { heading: 90, pitch: -30, bank: -45 },
  { heading: 180, pitch: 15, bank: -35 },
  { heading: 270, pitch: -15, bank: 35 },
  { heading: 359, pitch: 10, bank: 20 },
  { heading: -90, pitch: -10, bank: -20 },
  { heading: 720, pitch: 25, bank: 40 },
  { heading: 42, pitch: -25, bank: 0 },
];

function cameraFor({ heading, pitch, bank }, width = 1280, height = 720) {
  const camera = new Three.PerspectiveCamera(60, width / height, 0.1, 300000);
  camera.position.set(700, 1200, -2300);
  camera.quaternion.setFromEuler(new Three.Euler(radians(pitch), -radians(heading), -radians(bank), 'YXZ'));
  camera.updateMatrixWorld(true);
  return camera;
}
function expectVector(actual, expected) {
  for (const axis of ['x', 'y', 'z']) expect(actual[axis]).toBeCloseTo(expected[axis], 10);
}

// Real Three.js is the independent reference: these comparisons catch swapped
// axes, Euler order, and roll/pitch signs that can look plausible at zero pitch.
describe('SkySchool world direction and camera projection', () => {
  it.each(poses)('matches Three YXZ camera axes at heading $heading / pitch $pitch / bank $bank', pose => {
    const actual = helpers().getFlightViewBasis(pose.heading, pose.pitch, pose.bank);
    const camera = cameraFor(pose);
    expectVector(actual.right, new Three.Vector3(1, 0, 0).applyQuaternion(camera.quaternion));
    expectVector(actual.up, new Three.Vector3(0, 1, 0).applyQuaternion(camera.quaternion));
    expectVector(actual.forward, new Three.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
    expect(actual.fov).toBe(60);
    expect(vector(actual.right).dot(vector(actual.up))).toBeCloseTo(0, 10);
    expect(vector(actual.forward).length()).toBeCloseTo(1, 10);
  });

  it.each(poses)('projects world directions like the real camera at heading $heading / pitch $pitch / bank $bank', pose => {
    const width = pose.heading === 90 ? 320 : 1280;
    const height = pose.heading === 90 ? 763 : 720;
    const basis = helpers().getFlightViewBasis(pose.heading, pose.pitch, pose.bank);
    const direction = helpers().getFlightDirection(pose.heading + 12, pose.pitch - 7);
    const actual = helpers().projectFlightDirection(direction, basis, width, height);
    const camera = cameraFor(pose, width, height);
    const reference = vector(direction).multiplyScalar(100000).add(camera.position).project(camera);
    expect(actual).not.toBeNull();
    expect(actual.x).toBeCloseTo((reference.x + 1) * width / 2, 7);
    expect(actual.y).toBeCloseTo((1 - reference.y) * height / 2, 7);
    expect(actual.depth).toBeGreaterThan(0);
  });

  it.each(poses)('keeps the cockpit nose at the optical center at heading $heading / pitch $pitch / bank $bank', pose => {
    const basis = helpers().getFlightViewBasis(pose.heading, pose.pitch, pose.bank);
    const nose = helpers().getFlightDirection(pose.heading, pose.pitch);
    expect(vector(nose).length()).toBeCloseTo(1, 10);
    const projected = helpers().projectFlightDirection(nose, basis, 320, 763);
    expect(projected.x).toBeCloseTo(160, 9);
    expect(projected.y).toBeCloseTo(381.5, 9);
  });

  it('places a ten-degree world pitch rung on the nose when the cockpit is pitched up ten degrees', () => {
    const { getFlightDirection, getFlightViewBasis, projectFlightDirection } = helpers();
    const basis = getFlightViewBasis(35, 10, 0);
    const rung = projectFlightDirection(getFlightDirection(35, 10), basis, 1280, 720);
    const horizon = projectFlightDirection(getFlightDirection(35, 0), basis, 1280, 720);
    expect(rung.y).toBeCloseTo(360, 9);
    expect(horizon.y).toBeCloseTo(360 + (360 / Math.tan(Math.PI / 6)) * Math.tan(radians(10)), 9);
    expect(horizon.y).toBeGreaterThan(rung.y);
  });

  it('uses viewport height and the actual camera field of view instead of fixed pixels per degree', () => {
    const { getFlightDirection, getFlightViewBasis, projectFlightDirection } = helpers();
    const direction = getFlightDirection(0, 10);
    const basis = getFlightViewBasis(0, 0, 0);
    const small = projectFlightDirection(direction, basis, 320, 360);
    const large = projectFlightDirection(direction, basis, 640, 720);
    expect(360 - large.y).toBeCloseTo((180 - small.y) * 2, 9);
    const narrow = projectFlightDirection(direction, { ...basis, fov: 40 }, 640, 720);
    expect(narrow.y).toBeLessThan(large.y);
  });

  it.each([45, -45])('rolls the real world horizon in the correct direction at bank %s', bank => {
    const { getFlightDirection, getFlightViewBasis, projectFlightDirection } = helpers();
    const basis = getFlightViewBasis(0, 0, bank);
    const left = projectFlightDirection(getFlightDirection(-10, 0), basis, 1280, 720);
    const right = projectFlightDirection(getFlightDirection(10, 0), basis, 1280, 720);
    expect((right.y - left.y) * bank).toBeLessThan(0);
  });

  it('preserves offscreen coordinates so a painter can omit cues instead of inventing a clamped direction', () => {
    const basis = helpers().getFlightViewBasis(0, 0, 0);
    const projected = helpers().projectFlightDirection({ x: 4, y: 2, z: -1 }, basis, 320, 763);
    expect(projected.x).toBeGreaterThan(320);
    expect(projected.y).toBeLessThan(0);
  });
  it.each([
    { x: 0, y: 0, z: 1 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: NaN, y: 0, z: -1 },
    { x: 0, y: Infinity, z: -1 },
  ])('omits behind-camera and degenerate rays %j', direction => {
    expect(helpers().projectFlightDirection(direction, helpers().getFlightViewBasis(0, 0, 0), 1280, 720)).toBeNull();
  });

  it('projects a chase camera with arbitrary position, heading lag, pitch, and roll from its actual axes', () => {
    const camera = new Three.PerspectiveCamera(60, 320 / 763, 10, 300000);
    camera.position.set(-60, 1550, 80);
    const target = new Three.Vector3(0, 1502, 0);
    const chaseAxis = target.clone().sub(camera.position).normalize();
    camera.up.set(0, 1, 0).applyAxisAngle(chaseAxis, radians(45 * 0.35));
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    const matrix = camera.matrixWorld.elements;
    const basis = {
      right: { x: matrix[0], y: matrix[1], z: matrix[2] },
      up: { x: matrix[4], y: matrix[5], z: matrix[6] },
      forward: { x: -matrix[8], y: -matrix[9], z: -matrix[10] }, fov: camera.fov,
    };
    const direction = helpers().getFlightDirection(35, 5);
    const actual = helpers().projectFlightDirection(direction, basis, 320, 763);
    const reference = vector(direction).multiplyScalar(100000).add(camera.position).project(camera);
    expect(actual.x).toBeCloseTo((reference.x + 1) * 160, 7);
    expect(actual.y).toBeCloseTo((1 - reference.y) * 381.5, 7);
  });
});

describe('SkySchool flight path velocity matches integrated movement', () => {
  const state = { heading: 0, speed: 100, vsi: 0, onGround: false };
  const controls = { bank: 0, throttle: 0.6 };
  it('uses the horizontal component of fixed-wing total TAS during a steep climb', () => {
    const velocity = helpers().getFlightVelocity({ ...state, vsi: 60 }, controls, {}, 0, {});
    expectVector(velocity, { x: 0, y: 60, z: -80 });
    expect(Math.atan2(velocity.y, Math.hypot(velocity.x, velocity.z)) * 180 / Math.PI).toBeCloseTo(36.86989764584402, 9);
  });
  it.each([0, 30, -45])('does not invent fixed-wing sideways drift at bank %s', bank => {
    const velocity = helpers().getFlightVelocity(state, { ...controls, bank }, {}, 0, {});
    expectVector(velocity, { x: 0, y: 0, z: -100 });
    const projected = helpers().projectFlightDirection(velocity, helpers().getFlightViewBasis(0, 0, bank), 1280, 720);
    expect(projected.x).toBeCloseTo(640, 9);
    expect(projected.y).toBeCloseTo(360, 9);
  });
  it.each([
    { heading: 0, expected: { x: 0, y: -20, z: -Math.sqrt(9600) } },
    { heading: 90, expected: { x: Math.sqrt(9600), y: -20, z: 0 } },
    { heading: 180, expected: { x: 0, y: -20, z: Math.sqrt(9600) } },
    { heading: 270, expected: { x: -Math.sqrt(9600), y: -20, z: 0 } },
  ])('uses east/up/south coordinates at heading $heading', ({ heading, expected }) => {
    expectVector(helpers().getFlightVelocity({ ...state, heading, vsi: -20 }, controls, {}, 0, {}), expected);
  });
  it.each([
    { windDir: 90, eastSign: -1 },
    { windDir: 270, eastSign: 1 },
  ])('moves the flight path away from the direction wind blows FROM $windDir', ({ windDir, eastSign }) => {
    const velocity = helpers().getFlightVelocity(state, controls, { wind: 20, windDir }, 0, {});
    expectVector(velocity, { x: eastSign * 20 * 1.68781, y: 0, z: -100 });
    const projected = helpers().projectFlightDirection(velocity, helpers().getFlightViewBasis(0, 0, 0), 1280, 720);
    expect((projected.x - 640) * eastSign).toBeGreaterThan(0);
  });
  it('adds an eastbound jet stream even when heading west', () => {
    const velocity = helpers().getFlightVelocity({ ...state, heading: 270 }, controls, {}, 30, {});
    expectVector(velocity, { x: -100 + 30 * 1.68781, y: 0, z: 0 });
  });
  it('combines headwind and jet velocity vectorially', () => {
    const velocity = helpers().getFlightVelocity(state, controls, { wind: 10, windDir: 0 }, 20, {});
    expectVector(velocity, { x: 20 * 1.68781, y: 0, z: -(100 - 10 * 1.68781) });
  });
  it('suppresses wind and jet displacement on the runway', () => {
    const velocity = helpers().getFlightVelocity({ ...state, onGround: true }, controls, { wind: 40, windDir: 270 }, 100, {});
    expectVector(velocity, { x: 0, y: 0, z: -100 });
  });
  it.each([
    { aircraft: { isHelicopter: true }, expectedStrafe: 9 },
    { aircraft: { isDrone: true }, expectedStrafe: 15 },
  ])('retains rotor forward speed and its real roll strafe %j', ({ aircraft, expectedStrafe }) => {
    const velocity = helpers().getFlightVelocity({ ...state, vsi: 60 }, { ...controls, bank: 30 }, {}, 0, aircraft);
    expectVector(velocity, { x: expectedStrafe, y: 60, z: -100 });
  });
  it('rotates drone strafe with heading before adding surface wind', () => {
    const velocity = helpers().getFlightVelocity({ ...state, heading: 90 }, { ...controls, bank: 30 }, { wind: 5, windDir: 180 }, 0, { isDrone: true });
    expectVector(velocity, { x: 100, y: 0, z: 15 - 5 * 1.68781 });
  });
  it('keeps a zero-forward-speed hover with vertical motion finite', () => {
    const velocity = helpers().getFlightVelocity({ ...state, speed: 0, vsi: 10 }, controls, {}, 0, { isHelicopter: true });
    expectVector(velocity, { x: 0, y: 10, z: 0 });
  });
});


// Capture the actual React animation-frame painter. Matrix bookkeeping makes
// it possible to distinguish world rotation from an accidental rotated HUD.
function captureCanvas() {
  const commands = [], saved = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  const multiply = next => {
    const [a, b, c, d, e, f] = matrix;
    const [g, h, i, j, k, l] = next;
    matrix = [a*g+c*h, b*g+d*h, a*i+c*j, b*i+d*j, a*k+c*l+e, b*k+d*l+f];
  };
  const target = {
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
  const context = new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      return (...args) => {
        commands.push({ method: property, args, stroke: object.strokeStyle, fill: object.fillStyle, font: object.font, alpha: object.globalAlpha, matrix: [...matrix], depth: saved.length });
        if (property === 'save') saved.push({ matrix: [...matrix], stroke: object.strokeStyle, fill: object.fillStyle, font: object.font, alpha: object.globalAlpha });
        else if (property === 'restore' && saved.length) {
          const held = saved.pop(); matrix = held.matrix; object.strokeStyle = held.stroke; object.fillStyle = held.fill; object.font = held.font; object.globalAlpha = held.alpha;
        } else if (property === 'translate') multiply([1, 0, 0, 1, args[0], args[1]]);
        else if (property === 'rotate') multiply([Math.cos(args[0]), Math.sin(args[0]), -Math.sin(args[0]), Math.cos(args[0]), 0, 0]);
        else if (property === 'scale') multiply([args[0], 0, 0, args[1], 0, 0]);
        else if (property === 'setTransform') matrix = args.length === 6 ? [...args] : [1, 0, 0, 1, 0, 0];
        else if (property === 'resetTransform') matrix = [1, 0, 0, 1, 0, 0];
      };
    },
    set(object, property, value) { object[property] = value; return true; },
  });
  return { commands, context };
}
async function mountPaint({ webgl = false, chase = false, width = 320, height = 763, pitch = 10, bank = 30,
  parked = false, ordinary = false, noticeTitle = null, flight = {} } = {}) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.__testHooks = {};
  vi.useFakeTimers();
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  vi.stubGlobal('devicePixelRatio', 1);
  const capture = captureCanvas();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(capture.context);
  let wallTime = 1000, callback;
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', cb => { if (cb.name === 'loop') callback = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const renderer = {
    domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize: vi.fn(), setPixelRatio: vi.fn(), dispose: vi.fn(),
    getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }),
  };
  if (webgl) window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  else delete window.THREE;
  mountedHost = document.createElement('div'); document.body.appendChild(mountedHost);
  mountedRoot = ReactDOMClient.createRoot(mountedHost);
  const tool = window.StemLab._registry.flightSim;
  let latest;
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase, railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, flightDetails: true,
      ...(ordinary ? { earnedBadges: Object.fromEntries(helpers().ACHIEVEMENTS.map(item => [item.id, true])) } : {}) } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      t: (key, fallback) => key === 'stem.flightsim.notice_discovery' && noticeTitle ? noticeTitle : fallback,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await React.act(async () => mountedRoot.render(React.createElement(App)));
  if (ordinary) await React.act(async () => mountedHost.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  else await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('energy_management'));
  const hooks = window.__testHooks.flightSim;
  const airport = helpers().WAYPOINTS[0];
  Object.assign(hooks.flightRef.current, {
    lat: airport.lat, lon: airport.lon, altitude: airport.alt + (parked ? 0 : 4000), fieldElev: airport.alt,
    speed: parked ? 0 : 180, heading: 25, vsi: 0, onGround: parked, ...flight,
  });
  Object.assign(hooks.controlsRef.current, { throttle: 0.4, pitch, bank, flaps: 0, brake: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0 });
  hooks.pausedRef.current = !ordinary;
  if (ordinary) {
    // The notice belongs to ordinary active flight. Keep only motion fixed so
    // production recording and notice arbitration run without challenge or
    // pause guards, while the world still paints the supplied bank and pitch.
    vi.spyOn(helpers().Physics, 'step').mockImplementation(state => ({ ...state,
      forces: { lift: helpers().Physics.WEIGHT, weight: helpers().Physics.WEIGHT, drag: 0, thrust: 0 } }));
  }
  const resize = (nextWidth, nextHeight) => {
    for (const canvas of mountedHost.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: nextWidth });
      Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: nextHeight });
    }
  };
  resize(width, height);
  const frame = async () => { wallTime += 100; expect(callback).toBeTypeOf('function'); await React.act(async () => callback()); };
  await frame();
  return { ...capture, renderer, errors, hooks, frame, resize, getSaved: () => latest };
}
function expectUntransformed(command) {
  for (let i = 0; i < 6; i++) expect(command.matrix[i]).toBeCloseTo([1, 0, 0, 1, 0, 0][i], 10);
}
function actualDirectionProjection(camera, direction, width, height) {
  const point = vector(direction).multiplyScalar(100000).add(camera.position).project(camera);
  return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 };
}

describe('SkySchool mounted flight cues and Canvas world', () => {
  it('covers all phone corners while banking scenery and restores the HUD transform', async () => {
    const { commands, errors } = await mountPaint();
    const roll = radians(-30), width = 320, height = 763;
    const paddedWidth = Math.ceil(width * Math.cos(roll) + Math.abs(height * Math.sin(roll)));
    const paddedHeight = Math.ceil(height * Math.cos(roll) + Math.abs(width * Math.sin(roll)));
    const sky = commands.find(c => c.method === 'fillRect' && c.args[0] === 0 && c.args[1] === 0 && c.args[2] === paddedWidth && c.args[3] === paddedHeight);
    expect(sky).toBeTruthy();
    const [a, b, c, d, e, f] = sky.matrix, determinant = a*d - b*c;
    for (const [screenX, screenY] of [[0,0], [width,0], [width,height], [0,height]]) {
      const x = (d*(screenX-e)-c*(screenY-f))/determinant;
      const y = (-b*(screenX-e)+a*(screenY-f))/determinant;
      expect(x).toBeGreaterThanOrEqual(-1e-8); expect(x).toBeLessThanOrEqual(paddedWidth+1e-8);
      expect(y).toBeGreaterThanOrEqual(-1e-8); expect(y).toBeLessThanOrEqual(paddedHeight+1e-8);
    }
    const nose = commands.find(c => c.method === 'arc' && c.fill === '#fbbf24' && c.args[2] === 2 && Math.abs(c.args[0]-160) < 1e-8 && Math.abs(c.args[1]-381.5) < 1e-8);
    expect(nose).toBeTruthy(); expectUntransformed(nose);
    const fpv = commands.find(c => c.method === 'arc' && c.stroke === '#4ade80' && c.args[2] === 6);
    expect(fpv).toBeTruthy(); expectUntransformed(fpv);
    const worldEnd = commands.findIndex((command, index) => index > commands.indexOf(sky) && command.method === 'restore' && command.depth === sky.depth);
    expect(worldEnd).toBeGreaterThan(commands.indexOf(sky));
    expect(commands.indexOf(nose)).toBeGreaterThan(worldEnd);
    expect(commands.indexOf(fpv)).toBeGreaterThan(worldEnd);
    expect(errors).not.toHaveBeenCalled();
  });

  it('keeps all parked flight cues level when the learner deflects the ailerons', async () => {
    const { commands, errors } = await mountPaint({ bank: 45, pitch: 0, parked: true });
    const worldStart = commands.findIndex(c => c.method === 'translate' && c.args[0] === 160 && c.args[1] === 381.5);
    expect(worldStart).toBeGreaterThanOrEqual(0);
    expect(commands[worldStart+1].method).toBe('rotate');
    expect(Math.abs(commands[worldStart+1].args[0])).toBe(0);
    const horizon = commands.find(c => c.method === 'moveTo' && c.stroke === 'rgba(255,255,255,0.3)' && c.args[0] === 0);
    expect(horizon.args[1]).toBeCloseTo(381.5, 8);
    expect(commands.some(c => c.method === 'arc' && c.stroke === '#4ade80' && c.args[2] === 6)).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it.each([false, true])('paints the FPV and nose through the actual WebGL camera in chase %s', async chase => {
    const { commands, renderer, hooks, errors } = await mountPaint({ webgl: true, chase, bank: 35, pitch: 10 });
    expect(renderer.render).toHaveBeenCalled();
    const [, camera] = renderer.render.mock.calls.at(-1);
    const velocity = helpers().getFlightVelocity(hooks.flightRef.current, hooks.controlsRef.current, hooks.getWeatherRef().current, 0, {});
    const reference = actualDirectionProjection(camera, velocity, 320, 763);
    const fpv = commands.find(c => c.method === 'arc' && c.stroke === '#4ade80' && c.args[2] === 6);
    expect(fpv).toBeTruthy();
    expect(fpv.args[0]).toBeCloseTo(reference.x, 6);
    expect(fpv.args[1]).toBeCloseTo(reference.y, 6);
    const noseReference = actualDirectionProjection(camera, helpers().getFlightDirection(hooks.flightRef.current.heading, hooks.controlsRef.current.pitch), 320, 763);
    const nose = commands.find(c => c.method === 'arc' && c.fill === '#fbbf24' && c.args[2] === 2 && Math.abs(c.args[0]-noseReference.x) < 1e-5 && Math.abs(c.args[1]-noseReference.y) < 1e-5);
    expect(nose).toBeTruthy(); expectUntransformed(fpv);
    expect(errors).not.toHaveBeenCalled();
  });

  it('reprojects a paused cockpit after resizing without moving its flight, controls, clock, or evidence', async () => {
    const painted = await mountPaint({ webgl: true });
    const { commands, renderer, hooks, frame, resize, errors } = painted;
    const heldFlight = JSON.stringify(hooks.flightRef.current);
    const heldControls = JSON.stringify(hooks.controlsRef.current);
    const heldEvidence = JSON.stringify(hooks.getLogRef().current);
    const heldTime = hooks.timeRef.current;
    commands.length = 0; resize(1280,720); await frame();
    const [, camera] = renderer.render.mock.calls.at(-1);
    const reference = actualDirectionProjection(camera, helpers().getFlightDirection(25,10),1280,720);
    const nose = commands.find(c => c.method === 'arc' && c.fill === '#fbbf24' && c.args[2] === 2 && Math.abs(c.args[0]-reference.x) < 1e-5 && Math.abs(c.args[1]-reference.y) < 1e-5);
    expect(nose).toBeTruthy(); expectUntransformed(nose);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(heldFlight);
    expect(JSON.stringify(hooks.controlsRef.current)).toBe(heldControls);
    expect(JSON.stringify(hooks.getLogRef().current)).toBe(heldEvidence);
    expect(hooks.timeRef.current).toBe(heldTime);
    expect(errors).not.toHaveBeenCalled();
  });
});


describe('SkySchool screen-space discovery notices', () => {
  it('keeps the shared title upright and inside the phone while saving complete facts for live notes and debrief', async () => {
    const place = helpers().GEO_PLACES.find(item => item.name === 'Washington D.C.');
    expect(place).toBeTruthy();
    // A banked chase camera has no cockpit pitch ladder over this title slot.
    // Keep the world rotated while proving that screen-space UI stays upright.
    const { commands, context, errors, getSaved } = await mountPaint({ ordinary: true, chase: true, bank: 35, pitch: 0,
      flight: { lat: place.lat, lon: place.lon, altitude: 5000 } });
    const header = commands.find(command => command.method === 'fillText' && String(command.args[0]).includes('Discovered:'));
    expect(header).toBeTruthy(); expectUntransformed(header);
    const headerIndex = commands.indexOf(header);
    const card = commands.slice(0, headerIndex).findLast(command => ['roundRect', 'fillRect'].includes(command.method)
      && command.fill === 'rgba(2,6,23,0.85)' && command.args[3] > 22);
    expect(card).toBeTruthy(); expectUntransformed(card);
    const [x, y, width, height] = card.args;
    expect(x).toBeGreaterThanOrEqual(52);
    expect(x + width).toBeLessThanOrEqual(268);
    expect(width).toBeGreaterThanOrEqual(160);
    expect(y).toBeGreaterThanOrEqual(64);
    expect(height).toBeGreaterThan(22);
    const layout = helpers().getFlightInstrumentLayout(320, 763, true);
    expect(y + height).toBeLessThanOrEqual(layout.vsi.y - layout.vsi.r - 8);
    expect(y + height).toBeLessThanOrEqual(layout.auxiliary.y - 42 - 8);
    expect(header.args[1]).toBeGreaterThanOrEqual(x + 8);
    expect(header.args[1]).toBeLessThanOrEqual(x + width - 8);
    expect(header.args[2]).toBeGreaterThan(y);
    expect(header.args[2]).toBeLessThan(y + height);
    expect(header.font).toBe('bold 12px system-ui');
    expect(context.measureText(header.args[0]).width).toBeLessThanOrEqual(width - 24);
    const paintedText = commands.filter(command => command.method === 'fillText').map(command => String(command.args[0])).join(' ');
    expect(paintedText).not.toContain(place.fact);
    expect(paintedText).not.toContain('DISCOVERED:');
    const worldRect = commands.find(command => command.method === 'fillRect' && Math.abs(command.matrix[1]) > 0.1 && command.args[0] === 0 && command.args[1] === 0);
    expect(worldRect).toBeTruthy();
    const worldEnd = commands.findIndex((command, index) => index > commands.indexOf(worldRect) && command.method === 'restore' && command.depth === worldRect.depth);
    expect(headerIndex).toBeGreaterThan(worldEnd);
    const expand = mountedHost.querySelector('button[aria-label="Expand the flight deck controls"]');
    expect(expand).toBeTruthy(); await React.act(async () => expand.click());
    const liveNotes = mountedHost.querySelector('[data-flight-notes-scope="live"]');
    expect(liveNotes.textContent).toContain(place.name);
    expect(liveNotes.textContent).toContain(place.fact);
    const exit = [...mountedHost.querySelectorAll('button')].find(button => /Exit$/.test(button.textContent));
    expect(exit).toBeTruthy(); await React.act(async () => exit.click());
    expect(getSaved().view).toBe('debrief');
    expect(getSaved().lastDebrief.discoveredPlaces).toContainEqual(expect.objectContaining({ name: place.name, fact: place.fact, country: place.country }));
    expect(mountedHost.querySelector('[data-flight-notes-scope="latest"]').textContent).toContain(place.fact);
    expect(errors).not.toHaveBeenCalled();
  });

  it('yields a long cockpit title to an actually painted pitch rung without dimming subsequent instruments', async () => {
    const place = helpers().GEO_PLACES.find(item => item.name === 'Washington D.C.');
    const title = 'Discovered: {place}. Compare the observed coast, rivers, landmarks, and changing terrain; record a question to investigate on your next flight.';
    const { commands, hooks, frame, errors } = await mountPaint({ ordinary: true, width: 1280, height: 1000,
      bank: 0, pitch: 0, noticeTitle: title, flight: { lat: place.lat, lon: place.lon, altitude: 5000 } });
    const assertYield = () => {
      // This is the wide cockpit's actual projected 20-degree rung, not the
      // small attitude gauge ladder. It crosses the long title's otherwise
      // available center lane, well above the main instrument band.
      const crossing = commands.find((command, index) => command.method === 'moveTo'
        && command.stroke === 'rgba(230,240,255,0.55)'
        && command.args[1] > 174 && command.args[1] < 222
        && commands[index + 1]?.method === 'lineTo'
        && Math.min(command.args[0], commands[index + 1].args[0]) < 820
        && Math.max(command.args[0], commands[index + 1].args[0]) > 460);
      expect(crossing).toBeTruthy(); expectUntransformed(crossing);
      expect(commands.some(command => command.method === 'roundRect' && command.fill === 'rgba(2,6,23,0.85)')).toBe(false);
      expect(commands.some(command => command.method === 'fillText' && String(command.args[0]).includes('Discovered:'))).toBe(false);
      const attitudeSky = commands.find(command => command.method === 'fillRect' && command.fill === '#1e40af');
      expect(attitudeSky).toBeTruthy(); expect(attitudeSky.alpha).toBe(1);
      const fpv = commands.find(command => command.method === 'arc' && command.stroke === '#4ade80' && command.args[2] === 6);
      expect(fpv).toBeTruthy(); expect(fpv.alpha).toBe(1);
    };
    expect(helpers().getFlightInstrumentLayout(1280, 1000, false).atis.y).toBeGreaterThan(300);
    assertYield();
    hooks.timeRef.current = 7; commands.length = 0; await frame();
    assertYield();
    await React.act(async () => mountedHost.querySelector('button[aria-label="Expand the flight deck controls"]').click());
    expect(mountedHost.querySelector('[data-flight-notes-scope="live"]').textContent).toContain(place.fact);
    expect(errors).not.toHaveBeenCalled();
  });
});


it('does not let an active fading discovery notice dim the cockpit when the short phone has no safe title slot', async () => {
  const place = helpers().GEO_PLACES.find(item => item.name === 'Washington D.C.');
  const { commands, hooks, resize, frame, errors } = await mountPaint({ ordinary: true, height: 500, bank: 35, pitch: 10,
    flight: { lat: place.lat, lon: place.lon, altitude: 5000 } });
  expect(commands.some(command => command.method === 'fillText' && String(command.args[0]).includes('Discovered:'))).toBe(false);
  const expand = mountedHost.querySelector('button[aria-label="Expand the flight deck controls"]');
  expect(expand).toBeTruthy(); await React.act(async () => expand.click());
  expect(mountedHost.querySelector('[data-flight-notes-scope="live"]').textContent).toContain(place.fact);
  await React.act(async () => mountedHost.querySelector('button[aria-label="Collapse the flight deck controls"]').click());
  hooks.timeRef.current = 7;
  commands.length = 0;
  resize(320, 501); await frame();
  expect(commands.some(command => command.method === 'fillText' && String(command.args[0]).includes('Discovered:'))).toBe(false);
  expect(commands.some(command => command.method === 'roundRect' && command.fill === 'rgba(2,6,23,0.85)')).toBe(false);
  const attitudeSky = commands.find(command => command.method === 'fillRect' && command.fill === '#1e40af');
  expect(attitudeSky).toBeTruthy();
  expect(attitudeSky.alpha).toBe(1);
  expect(errors).not.toHaveBeenCalled();
});
