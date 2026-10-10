import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight, scene, telemetry, canvas, frames, time, frameId, pauses, resources, released;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  frames = new Map(); time = 100; frameId = 0; pauses = []; telemetry = null;
  resources = { Buffer: [], Texture: [], Program: [] };
  released = { Buffer: [], Texture: [], Program: [] };
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++frameId, callback); return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => time);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  // The native scene owns all geometry, state and clocks. GPU calls are stubbed
  // here; the browser check covers the actual rendered camera movement.
  const graphics = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation') return (_program, name) => name;
      for (const kind of Object.keys(resources)) {
        if (key === 'create' + kind) return () => { const resource = {}; resources[kind].push(resource); return resource; };
        if (key === 'delete' + kind) return resource => released[kind].push(resource);
      }
      if (key === 'createShader') return () => ({});
      if (String(key).toUpperCase() === key) return 1;
      return () => {};
    },
  });
  canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(graphics);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas, {
    onTelemetry: value => { telemetry = value; },
    onPause: (...args) => pauses.push(args),
  });
});

afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

function advance(milliseconds = 16) {
  time += milliseconds;
  const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(time));
}
const range = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const publish = () => { scene.set({}); return telemetry.viewpointGlide; };
const target = (id = 'amber-star', region = 'neighborhood') => flight.landmarks(region).find(item => item.id === id);
function seed(position, id = 'amber-star', region = 'neighborhood') {
  const saved = scene.snapshot();
  saved.settings = { ...saved.settings, region, mode: 'explore', fov: 35, exposure: .7, beta: .9, compareRest: true, quality: 'low' };
  saved.state = { position: position.slice(), yaw: .4, pitch: -.1, distanceLy: 17, universeYears: 9, travelerYears: 4 };
  saved.targetId = id;
  expect(scene.restore(saved)).toBe(true);
  return scene.snapshot();
}
function centered() {
  expect(telemetry.target.screen[0]).toBeCloseTo(.5, 9);
  expect(telemetry.target.screen[1]).toBeCloseTo(.5, 9);
}
function launch(id = 'amber-star', direction = 'left', degrees = 25) {
  const before = scene.snapshot(), plan = scene.planOrbitView(id, direction, degrees);
  expect(plan).not.toBeNull();
  expect(scene.planViewpointGlide(id, direction, degrees)).toEqual(plan);
  expect(scene.startViewpointGlide(id, direction, degrees)).toBe(true);
  expect(scene.snapshot().state.position).toEqual(before.state.position);
  expect(scene.snapshot().state.distanceLy).toBe(before.state.distanceLy);
  expect(telemetry.viewpointGlide).toMatchObject({ active: true, completed: false, targetId: id, direction, progress: 0, elapsedSeconds: 0, durationSeconds: 3 });
  expect(telemetry.motion.kind).toBe('glide'); expect(telemetry.running).toBe(true);
  advance();
  expect(scene.snapshot().state.position).toEqual(before.state.position);
  return { before, plan };
}
function finish() { for (let index = 0; index < 6; index++) advance(500); return scene.snapshot(); }
function reject(action) {
  const saved = scene.snapshot(), info = structuredClone(telemetry), events = pauses.length;
  const scheduled = [...frames.keys()], allocations = Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, v.length]));
  expect(action()).toBe(false);
  expect(scene.snapshot()).toEqual(saved); expect(telemetry).toEqual(info);
  expect(pauses).toHaveLength(events); expect([...frames.keys()]).toEqual(scheduled);
  expect(Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, v.length]))).toEqual(allocations);
}
// Independent spherical geometry, including the sign of the camera controls.
function spherical(position, center, direction, degrees, eased) {
  const [x, y, z] = position.map((v, i) => v - center[i]);
  const radius = Math.hypot(x, y, z), horizontal = Math.hypot(x, z);
  let azimuth = Math.atan2(x, z), elevation = Math.atan2(y, horizontal);
  const angle = degrees * Math.PI / 180, limit = 85 * Math.PI / 180;
  if (direction === 'left' || direction === 'right') {
    azimuth += (direction === 'left' ? angle : -angle) * eased;
    return [center[0] + horizontal * Math.sin(azimuth), position[1], center[2] + horizontal * Math.cos(azimuth)];
  }
  const end = Math.max(-limit, Math.min(limit, elevation + (direction === 'up' ? angle : -angle)));
  elevation += (end - elevation) * eased;
  return [center[0] + radius * Math.cos(elevation) * Math.sin(azimuth), center[1] + radius * Math.sin(elevation), center[2] + radius * Math.cos(elevation) * Math.cos(azimuth)];
}

describe('Universe smooth landmark viewpoint glides', () => {
  for (const direction of ['left', 'right', 'up', 'down']) {
    it(`follows the ${direction} circular arc with fixed range, smooth timing, exact endpoint and a centered target`, () => {
      const landmark = target();
      seed(landmark.position.map((v, i) => v + [6, 4, -10][i]));
      scene.set({ speed: 1e10, timeScale: 1e10, flybyRate: 4, orbitRate: 12, smoothTravel: true });
      const { before, plan } = launch(landmark.id, direction, 25), initialRange = range(before.state.position, landmark.position), events = pauses.length;
      expect(telemetry.viewpointGlide.rangeLy).toBeCloseTo(initialRange, 10);
      expect(telemetry.viewpointGlide.distanceLy).toBeCloseTo(plan.distanceLy, 10);
      centered();
      for (let index = 1; index <= 30; index++) {
        advance(100);
        if (![3, 15, 27, 30].includes(index)) continue;
        const glide = publish(), t = index / 30, eased = t * t * (3 - 2 * t), current = scene.snapshot();
        expect(glide.progress).toBeCloseTo(t, 12); expect(glide.elapsedSeconds).toBeCloseTo(index / 10, 12);
        expect(range(current.state.position, landmark.position)).toBeCloseTo(initialRange, 10);
        const expected = index === 30 ? plan.position : spherical(before.state.position, landmark.position, direction, 25, eased);
        current.state.position.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 10));
        if (direction === 'left' || direction === 'right') expect(current.state.position[1]).toBe(before.state.position[1]);
        else {
          const azimuth = Math.atan2(current.state.position[0] - landmark.position[0], current.state.position[2] - landmark.position[2]);
          expect(azimuth).toBeCloseTo(Math.atan2(before.state.position[0] - landmark.position[0], before.state.position[2] - landmark.position[2]), 12);
        }
        expect(current.state.distanceLy - before.state.distanceLy).toBeCloseTo(plan.distanceLy * eased, 10);
        expect(current.state.universeYears).toBe(9); expect(current.state.travelerYears).toBe(4); expect(current.settings).toEqual(before.settings);
        if (index < 30) expect(telemetry.motion.targetLyPerSecond).toBeCloseTo(plan.distanceLy * 1.5 / 3, 10);
        expect(telemetry.motion.paceLyPerSecond).toBeCloseTo(index === 30 ? 0 : plan.distanceLy * 6 * t * (1 - t) / 3, 10);
        centered();
      }
      const completed = scene.snapshot();
      expect(completed.state.position).toEqual(plan.position);
      expect(plan.distanceLy).toBeGreaterThan(range(before.state.position, plan.position));
      expect(telemetry.viewpointGlide).toMatchObject({ active: false, completed: true, targetId: landmark.id, direction, progress: 1, elapsedSeconds: 3 });
      expect(telemetry.running).toBe(false); expect(telemetry.trail.at(-1)).toEqual(plan.position); expect(pauses).toHaveLength(events + 1);
      advance(5000); expect(scene.snapshot()).toEqual(completed); expect(pauses).toHaveLength(events + 1);
    });
  }

  it('uses the same accepted planner endpoints in stellar, cloud, spiral, barred and elliptical scenes without new resources', () => {
    const allocations = Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, v.length]));
    for (const [region, id, offset] of [
      ['neighborhood', 'amber-star', [2, 1, -4]],
      ['neighborhood', 'violet-nebula', [60, 15, -110]],
      ['galaxy', 'galactic-center', [60000, 20000, -120000]],
      ['cosmic', 'distant-galaxy', [500000, 100000, -1000000]],
      ['cosmic', 'golden-elliptical', [500000, 100000, -1000000]],
    ]) {
      const landmark = target(id, region); expect(landmark).toBeDefined();
      seed(landmark.position.map((v, i) => v + offset[i]), id, region);
      const { before, plan } = launch(id, 'up', 15);
      const completed = finish();
      expect(completed.state.position).toEqual(plan.position);
      expect(completed.state.distanceLy - before.state.distanceLy).toBeCloseTo(plan.distanceLy, 6);
      expect(completed.settings).toEqual(before.settings); expect(completed.state.universeYears).toBe(9); expect(completed.state.travelerYears).toBe(4);
      expect(range(completed.state.position, landmark.position)).toBeCloseTo(range(before.state.position, landmark.position), 6); centered();
    }
    expect(Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, v.length]))).toEqual(allocations);
    expect(released).toEqual({ Buffer: [], Texture: [], Program: [] });
  });

  it('defaults to a 25 degree arc and is invariant under frame subdivisions while capping suspended frames', () => {
    const initial = seed([4, 5, -12]), plan = scene.planOrbitView('amber-star', 'left', 25);
    expect(scene.planViewpointGlide('amber-star', 'left')).toEqual(plan);
    expect(scene.startViewpointGlide('amber-star', 'left')).toBe(true); advance();
    for (let i = 0; i < 3; i++) advance(500);
    const coarse = scene.snapshot(); expect(publish().elapsedSeconds).toBeCloseTo(1.5, 12);
    scene.restore(initial); launch(); for (let i = 0; i < 60; i++) advance(25);
    const fine = scene.snapshot();
    fine.state.position.forEach((v, i) => expect(v).toBeCloseTo(coarse.state.position[i], 10));
    expect(fine.state.distanceLy).toBeCloseTo(coarse.state.distanceLy, 10);
    expect(fine.state.distanceLy - initial.state.distanceLy).toBeCloseTo(plan.distanceLy * .5, 10);
    scene.restore(initial); launch(); advance(5000); expect(publish().elapsedSeconds).toBeCloseTo(.5, 12);
    finish(); expect(scene.snapshot().state.position).toEqual(plan.position);
  });

  it('retains an active arc across pause, same-target focus and settings echoes, and excludes the paused gap on resume', () => {
    launch(); advance(500); advance(300); scene.set({ running: false });
    const paused = scene.snapshot(), glide = structuredClone(telemetry.viewpointGlide);
    expect(glide.active).toBe(true); expect(telemetry.motion.kind).toBe('glide'); expect(telemetry.motion.paceLyPerSecond).toBe(0);
    advance(50000); expect(scene.snapshot()).toEqual(paused); expect(telemetry.viewpointGlide).toEqual(glide);
    expect(scene.selectTarget('amber-star')).toBe(true); expect(scene.focusTarget('amber-star')).toBe(true);
    scene.set({ fov: 40, exposure: 1.2, beta: .9, compareRest: true, quality: 'low', speed: 5000, timeScale: 300, smoothTravel: true, flybyRate: 4, orbitTilt: 35 });
    expect(telemetry.viewpointGlide).toEqual(glide); expect(scene.snapshot().state).toEqual(paused.state);
    scene.set({ running: true }); advance(5000);
    expect(scene.snapshot().state).toEqual(paused.state); expect(telemetry.viewpointGlide).toEqual(glide);
    advance(100); expect(publish().elapsedSeconds).toBeCloseTo(glide.elapsedSeconds + .1, 12);
    expect(scene.snapshot().state.position).not.toEqual(paused.state.position); centered();
    finish(); expect(telemetry.viewpointGlide.completed).toBe(true); expect(telemetry.running).toBe(false);
  });

  it('freezes hidden and offscreen arcs and starts with a fresh frame timestamp when visibility returns', () => {
    let intersect;
    const original = window.IntersectionObserver;
    window.IntersectionObserver = class { constructor(callback) { intersect = callback; } observe() {} disconnect() {} };
    try {
      scene.dispose();
      scene = flight.create(canvas, { onTelemetry: value => { telemetry = value; }, onPause: (...args) => pauses.push(args) });
      launch(); advance(300);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
      const hidden = scene.snapshot(), glide = structuredClone(telemetry.viewpointGlide);
      advance(50000); expect(scene.snapshot()).toEqual(hidden); expect(telemetry.viewpointGlide).toEqual(glide);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
      advance(5000); expect(scene.snapshot()).toEqual(hidden);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(glide.elapsedSeconds + .1, 12);
      intersect([{ isIntersecting: false }]);
      const offscreen = scene.snapshot(), offscreenGlide = structuredClone(telemetry.viewpointGlide);
      advance(50000); expect(scene.snapshot()).toEqual(offscreen); expect(telemetry.viewpointGlide).toEqual(offscreenGlide);
      intersect([{ isIntersecting: true }]); advance(5000); expect(scene.snapshot()).toEqual(offscreen);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(offscreenGlide.elapsedSeconds + .1, 12);
    } finally { if (original === undefined) delete window.IntersectionObserver; else window.IntersectionObserver = original; }
  });

  it('ends at the current partial pose, remains paused and permits a fresh camera movement afterward', () => {
    launch(); advance(500); advance(400);
    const before = scene.snapshot(), events = pauses.length;
    expect(scene.cancelViewpointGlide()).toBe(true);
    expect(scene.snapshot()).toEqual(before); expect(telemetry.running).toBe(false);
    expect(telemetry.viewpointGlide).toMatchObject({ active: false, completed: false, targetId: null, progress: 0, elapsedSeconds: 0 });
    expect(telemetry.motion.kind).not.toBe('glide'); expect(pauses).toHaveLength(events + 1);
    advance(50000); expect(scene.snapshot()).toEqual(before); reject(() => scene.cancelViewpointGlide());
    scene.set({ running: true, speed: 10, smoothTravel: false }); advance(); advance(100);
    expect(scene.snapshot().state.distanceLy).toBeCloseTo(before.state.distanceLy + 1, 10);
    launch('amber-star', 'right', 5); finish(); expect(telemetry.viewpointGlide.completed).toBe(true);
    const completed = scene.snapshot();
    scene.set({ running: true }); advance(); expect(scene.snapshot()).toEqual(completed);
    expect(telemetry.viewpointGlide).toMatchObject({ active: false, completed: false }); expect(telemetry.motion.kind).toBe('free');
    advance(100); expect(scene.snapshot().state.distanceLy).toBeCloseTo(completed.state.distanceLy + 1, 10);
  });

  it('makes radial and angular glides mutually exclusive and clears previous completion when starting the other kind', () => {
    launch(); advance(300);
    reject(() => scene.startViewpointGlide('amber-star', 'right', 15));
    reject(() => scene.startDistanceGlide('amber-star', 'closer'));
    reject(() => scene.cancelDistanceGlide());
    scene.cancelViewpointGlide(); expect(scene.startDistanceGlide('amber-star', 'closer')).toBe(true); advance(); advance(300);
    reject(() => scene.startViewpointGlide('amber-star', 'up', 15)); reject(() => scene.cancelViewpointGlide());
    finish(); expect(telemetry.distanceGlide.completed).toBe(true);
    launch('amber-star', 'up', 15); expect(telemetry.distanceGlide.completed).toBe(false); finish();
    expect(telemetry.viewpointGlide.completed).toBe(true);
    expect(scene.startDistanceGlide('amber-star', 'farther')).toBe(true); expect(telemetry.viewpointGlide.completed).toBe(false);
  });

  it('takes over free travel, approaches, orbits and flybys, clears stale undo, and yields to accepted camera handoffs', () => {
    for (const start of [() => scene.set({ running: true }), () => scene.navigateTo('amber-star'), () => scene.startOrbit('amber-star'), () => scene.startFlyby('stellar')]) {
      scene.reset(); start(); advance(); launch();
      expect(telemetry.navigation.active || telemetry.orbit.active || telemetry.flyby.active).toBe(false);
      expect(telemetry.viewpointGlide.active).toBe(true);
    }
    scene.reset(); expect(scene.nudge('right', 1)).toBe(true); expect(scene.frameTarget('amber-star', 1 / 3)).toBe(true); launch();
    expect(telemetry.cameraMoves).toBe(0); reject(() => scene.undoNudge()); reject(() => scene.undoFrame());
    for (const action of [
      () => scene.stepDistanceView('amber-star', 'farther'), () => scene.stepOrbitView('amber-star', 'right', 5),
      () => scene.nudge('right', 1), () => scene.look(.1, -.1), () => scene.view('back'),
      () => scene.frameTarget('amber-star', 1 / 3), () => scene.faceSceneCenter(),
      () => scene.focusTarget('blue-star'), () => scene.selectTarget('blue-star'),
      () => scene.restore(scene.snapshot()), () => scene.reset(), () => scene.set({ mode: 'relativity' }),
      () => scene.set({ region: 'galaxy' }), () => scene.startOrbit('amber-star'),
      () => scene.navigateTo('amber-star'), () => scene.startFlyby('stellar'),
    ]) {
      scene.set({ mode: 'explore', region: 'neighborhood', orbitTilt: 0 }); scene.reset(); launch(); advance(300);
      action(); publish();
      expect(telemetry.viewpointGlide).toMatchObject({ active: false, completed: false, targetId: null });
      expect(telemetry.motion.kind).not.toBe('glide');
    }
  });

  it('keeps completed metadata for same-target focus, lens edits and rejected cancel, then clears it at an accepted handoff', () => {
    for (const handoff of [() => scene.selectTarget('blue-star'), () => scene.focusTarget('blue-star'), () => scene.view('back'), () => scene.frameTarget('amber-star', 1 / 3)]) {
      scene.reset(); launch(); finish();
      const completed = structuredClone(telemetry.viewpointGlide), pose = scene.snapshot().state;
      expect(completed).toMatchObject({ active: false, completed: true, targetId: 'amber-star', progress: 1 });
      scene.selectTarget('amber-star'); scene.focusTarget('amber-star'); scene.set({ fov: 40, exposure: 1.2 });
      expect(telemetry.viewpointGlide).toEqual(completed); expect(scene.snapshot().state).toEqual(pose); expect(telemetry.running).toBe(false);
      reject(() => scene.cancelViewpointGlide()); reject(() => scene.startViewpointGlide('missing', 'left', 25));
      handoff(); publish();
      expect(telemetry.viewpointGlide).toMatchObject({ active: false, completed: false, targetId: null, direction: null, progress: 0, elapsedSeconds: 0 });
    }
  });

  it('rejects invalid and unavailable requests atomically while retaining an active camera mode', () => {
    const invalid = [
      ['missing', 'left', 25], ['galactic-center', 'left', 25], ['amber-star', 'missing', 25],
      ...[0, -5, 46, NaN, Infinity, '15', null].map(degrees => ['amber-star', 'left', degrees]),
    ];
    for (const start of [() => scene.navigateTo('amber-star'), () => scene.startOrbit('amber-star'), () => scene.startFlyby('stellar'), () => scene.startViewpointGlide('amber-star', 'left', 25)]) {
      scene.reset(); start(); advance();
      for (const args of invalid) { expect(scene.planViewpointGlide(...args)).toBeNull(); reject(() => scene.startViewpointGlide(...args)); }
    }
    for (const action of [
      () => scene.startOrbit('missing'), () => scene.navigateTo('missing'), () => scene.startFlyby('missing'),
      () => scene.stepDistanceView('missing', 'closer'), () => scene.stepOrbitView('missing', 'right', 5),
      () => scene.nudge('missing', 1), () => scene.frameTarget('missing', 1 / 3),
      () => scene.focusTarget('missing'), () => scene.selectTarget('missing'),
    ]) reject(action);
    scene.set({ mode: 'relativity', running: true }); reject(() => scene.startViewpointGlide('amber-star', 'up', 15));
    scene.set({ mode: 'explore' }); launch(); canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    reject(() => scene.startViewpointGlide('amber-star', 'left', 15)); reject(() => scene.cancelViewpointGlide());
    scene.dispose(); reject(() => scene.startViewpointGlide('amber-star', 'left', 15)); reject(() => scene.cancelViewpointGlide());
    const missing = document.createElement('canvas'), callback = vi.fn();
    vi.spyOn(missing, 'getContext').mockReturnValue(null); vi.spyOn(missing, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
    const unavailable = flight.create(missing, { onPause: callback }), saved = unavailable.snapshot();
    expect(unavailable.startViewpointGlide('amber-star', 'left', 25)).toBe(false); expect(unavailable.cancelViewpointGlide()).toBe(false);
    expect(unavailable.snapshot()).toEqual(saved); expect(callback).not.toHaveBeenCalled(); unavailable.dispose();
  });

  it('checks the whole arc at the regional edge, including an exterior peak between two valid endpoints', () => {
    const landmark = target(), center = landmark.position, horizontalCenter = Math.hypot(center[0], center[2]);
    const radius = Math.sqrt(100000 ** 2 - center[1] ** 2) - horizontalCenter + .05;
    const azimuth = Math.atan2(center[0], center[2]) - 15 * Math.PI / 180;
    const start = [center[0] + radius * Math.sin(azimuth), center[1], center[2] + radius * Math.cos(azimuth)];
    const end = spherical(start, center, 'left', 30, 1), peak = spherical(start, center, 'left', 30, .5);
    expect(Math.hypot(...start)).toBeLessThan(100000); expect(Math.hypot(...end)).toBeLessThan(100000); expect(Math.hypot(...peak)).toBeGreaterThan(100000);
    seed(start); scene.set({ running: true });
    expect(scene.planOrbitView('amber-star', 'left', 30)).toBeNull(); expect(scene.planViewpointGlide('amber-star', 'left', 30)).toBeNull(); reject(() => scene.startViewpointGlide('amber-star', 'left', 30));
    const { plan } = launch('amber-star', 'right', 15); finish(); expect(scene.snapshot().state.position).toEqual(plan.position);
  });

  it('clips elevation at 85 degrees and rejects uncenterable polar glides while preserving instant pole recovery', () => {
    const landmark = target(), radius = 10, startElevation = 80 * Math.PI / 180;
    for (const sign of [1, -1]) {
      seed([landmark.position[0], landmark.position[1] + sign * radius * Math.sin(startElevation), landmark.position[2] - radius * Math.cos(startElevation)]);
      const direction = sign === 1 ? 'up' : 'down', { before, plan } = launch('amber-star', direction, 25);
      expect(plan.distanceLy).toBeCloseTo(radius * 5 * Math.PI / 180, 12);
      advance(500); advance(500); advance(500);
      const expected = spherical(before.state.position, landmark.position, direction, 25, .5);
      scene.snapshot().state.position.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 10));
      finish(); expect(scene.snapshot().state.position).toEqual(plan.position); centered();
      expect(Math.abs(Math.atan2(scene.snapshot().state.position[1] - landmark.position[1], Math.hypot(scene.snapshot().state.position[0] - landmark.position[0], scene.snapshot().state.position[2] - landmark.position[2])) * 180 / Math.PI)).toBeCloseTo(85, 12);
      reject(() => scene.startViewpointGlide('amber-star', direction, 5));
    }
    seed(landmark.position); scene.set({ running: true }); reject(() => scene.startViewpointGlide('amber-star', 'up', 15));
    for (const offset of [[0, 10, 0], [.001, -10, 0]]) {
      seed(landmark.position.map((v, i) => v + offset[i])); scene.set({ running: true });
      for (const direction of ['left', 'right', 'up', 'down']) {
        expect(scene.planViewpointGlide('amber-star', direction, 15)).toBeNull();
        reject(() => scene.startViewpointGlide('amber-star', direction, 15));
      }
    }
    seed([landmark.position[0], landmark.position[1] + 10, landmark.position[2]]);
    const recovery = scene.planOrbitView('amber-star', 'down', 15);
    expect(scene.stepOrbitView('amber-star', 'down', 15)).toBe(true); expect(scene.snapshot().state.position).toEqual(recovery.position);
    expect(recovery.elevationDeg).toBeCloseTo(75, 12);
    const { plan } = launch('amber-star', 'down', 15); finish(); expect(scene.snapshot().state.position).toEqual(plan.position); centered();
    expect(plan.elevationDeg).toBeCloseTo(60, 12);
  });

  it('leaves an active high view unchanged when a tilted orbit cannot be started', () => {
    const landmark = target(), elevation = 88.5 * Math.PI / 180;
    seed([landmark.position[0], landmark.position[1] + 10 * Math.sin(elevation), landmark.position[2] - 10 * Math.cos(elevation)]);
    scene.set({ orbitTilt: 45 }); launch('amber-star', 'left', 5); advance(300);
    expect(flight.math.orbitPlane(scene.snapshot().state.position, landmark.position, 45)).toBeNull();
    reject(() => scene.startOrbit('amber-star'));
    expect(telemetry.running).toBe(true); expect(telemetry.viewpointGlide.active).toBe(true);
  });

  it('releases every graphics resource once when disposed during an arc and schedules no further movement', () => {
    expect(Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, v.length]))).toEqual({ Buffer: 2, Texture: 2, Program: 2 });
    launch(); advance(300); const saved = scene.snapshot();
    scene.dispose(); scene.dispose();
    for (const kind of Object.keys(resources)) {
      expect(released[kind]).toHaveLength(resources[kind].length);
      expect(new Set(released[kind]).size).toBe(resources[kind].length);
      expect(released[kind]).toEqual(expect.arrayContaining(resources[kind]));
    }
    expect(frames.size).toBe(0); advance(50000); expect(scene.snapshot()).toEqual(saved);
    reject(() => scene.startViewpointGlide('amber-star', 'right', 25)); reject(() => scene.cancelViewpointGlide());
  });
});
