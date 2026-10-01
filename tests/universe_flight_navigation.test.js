import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight;
let scene;
let telemetry;
let pauses;
let pauseEvents;
let sceneCanvas;
let frames;
let time;
let nextFrame;
let graphics;
let createdTextures;
let deletedTextures;
let textureUploads;
let failTextureUploadAt;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  frames = new Map();
  time = 100;
  nextFrame = 0;
  pauses = [];
  pauseEvents = [];
  telemetry = null;
  createdTextures = [];
  deletedTextures = [];
  textureUploads = [];
  failTextureUploadAt = null;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => time);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  // Exercise navigation and persistence against the real scene lifecycle. GPU
  // drawing is stubbed because these checks concern state, geometry, and clocks.
  graphics = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'createBuffer' || key === 'createProgram' || key === 'createShader') return () => ({});
      if (key === 'createTexture') return () => { const resource = {}; createdTextures.push(resource); return resource; };
      if (key === 'deleteTexture') return resource => deletedTextures.push(resource);
      if (key === 'texImage2D') return (...args) => {
        textureUploads.push(args);
        if (textureUploads.length === failTextureUploadAt) throw new Error('Texture upload unavailable');
      };
      if (key === 'getUniformLocation') return (_program, name) => name;
      if (String(key).toUpperCase() === key) return 1;
      return () => {};
    },
  });
  const canvas = document.createElement('canvas');
  sceneCanvas = canvas;
  vi.spyOn(canvas, 'getContext').mockReturnValue(graphics);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas, {
    onTelemetry: value => { telemetry = value; },
    onPause: (...args) => { pauses.push(args[0]); pauseEvents.push(args); },
  });
});

afterEach(() => {
  scene?.dispose();
  vi.restoreAllMocks();
});

function advance(milliseconds = 16) {
  time += milliseconds;
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach(callback => callback(time));
}

describe('Universe flight texture lifecycle', () => {
  it('reuses uploaded visual textures across scenes and releases each resource once on disposal', () => {
    const resources = createdTextures.slice(), uploads = textureUploads.length;
    expect(resources.length).toBeGreaterThan(0);
    for (const region of ['galaxy', 'cosmic', 'neighborhood']) {
      scene.set({ region });
      advance();
      expect(createdTextures).toEqual(resources);
      expect(textureUploads).toHaveLength(uploads);
    }
    scene.dispose();
    expect(deletedTextures).toHaveLength(resources.length);
    for (const resource of resources) expect(deletedTextures.filter(item => item === resource)).toHaveLength(1);
    scene.dispose();
    expect(deletedTextures).toHaveLength(resources.length);
  });

  it('releases allocated visual textures when a later upload fails and remains safe to dispose', () => {
    const start = createdTextures.length, statuses = [];
    failTextureUploadAt = textureUploads.length + 2;
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(graphics);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
    const failed = flight.create(canvas, { onStatus: value => statuses.push(value) });
    expect(statuses.at(-1).state).toBe('error');
    const resources = createdTextures.slice(start);
    expect(resources.length).toBeGreaterThan(0);
    for (const resource of resources) expect(deletedTextures.filter(item => item === resource)).toHaveLength(1);
    const deletions = deletedTextures.length;
    failed.dispose(); failed.dispose();
    expect(deletedTextures).toHaveLength(deletions);
    failTextureUploadAt = null;
  });
});

describe('Universe flight destination navigation', () => {
  it('returns independent landmark catalogs for every generated scene', () => {
    const ids = new Set();
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) {
      const items = flight.landmarks(region);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
        expect(item.position).toHaveLength(3);
        expect(item.position.every(Number.isFinite)).toBe(true);
        expect(item.arrivalRadiusLy).toBeGreaterThan(0);
      }
      const original = flight.landmarks(region)[0];
      items[0].name = 'Mutated';
      items[0].position[0] = 1e20;
      expect(flight.landmarks(region)[0]).toEqual(original);
    }
    expect(flight.landmarks('missing')).toEqual([]);
  });

  it('clips even the fastest approach at its viewing distance and pauses without adding physical clock time', () => {
    const target = flight.landmarks('neighborhood')[0];
    scene.set({ mode: 'explore', speed: 1e10 });
    expect(scene.navigateTo(target.id)).toBe(true);
    advance();
    for (let frame = 0; frame < 300 && telemetry.running; frame++) {
      advance(100);
      const position = scene.snapshot().state.position;
      const gap = Math.hypot(...target.position.map((value, index) => value - position[index]));
      expect(gap).toBeGreaterThanOrEqual(target.arrivalRadiusLy - 1e-9);
    }
    const remaining = Math.hypot(...target.position.map((value, index) => value - telemetry.position[index]));
    expect(remaining).toBeCloseTo(target.arrivalRadiusLy, 8);
    expect(telemetry.distanceLy).toBeCloseTo(Math.hypot(...target.position) - target.arrivalRadiusLy, 8);
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.universeYears).toBe(0);
    expect(telemetry.travelerYears).toBe(0);
    expect(pauses).toHaveLength(1);
    const stopped = structuredClone(telemetry.position);
    advance(1000);
    expect(telemetry.position).toEqual(stopped);
  });

  it('centers the apparent destination at relativistic speeds without moving or starting travel', () => {
    const target = flight.landmarks('neighborhood')[0];
    scene.set({ mode: 'relativity', beta: 0.9 });
    expect(scene.focusTarget(target.id)).toBe(true);
    expect(telemetry.target.id).toBe(target.id);
    expect(telemetry.target.screen[0]).toBeCloseTo(0.5, 10);
    expect(telemetry.target.screen[1]).toBeCloseTo(0.5, 10);
    expect(telemetry.target.inView).toBe(true);
    expect(telemetry.position).toEqual([0, 0, 0]);
    expect(telemetry.running).toBe(false);
    expect(scene.navigateTo(target.id)).toBe(false);
  });

  it('cancels a guided approach immediately and rejects a missing destination', () => {
    const target = flight.landmarks('neighborhood')[0];
    expect(scene.navigateTo('missing')).toBe(false);
    expect(scene.navigateTo(target.id)).toBe(true);
    expect(scene.cancelNavigation()).toBe(true);
    advance();
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.position).toEqual([0, 0, 0]);
  });

  it('starts a fresh galaxy approach after a physical journey and retains it across the UI settings echo', () => {
    scene.set({ mode: 'relativity', beta: 0.9, timeScale: 10 });
    scene.set({ running: true });
    advance(); advance(100);
    expect(scene.snapshot().state.universeYears).toBeGreaterThan(0);
    expect(scene.snapshot().state.travelerYears).toBeGreaterThan(0);

    const target = flight.landmarks('galaxy').find(item => item.id === 'galactic-center');
    const launch = scene.snapshot();
    launch.settings = { ...launch.settings, mode: 'explore', region: 'galaxy', fov: 65 };
    launch.state = { position: [0, 0, -95000], yaw: 0, pitch: 0, distanceLy: 0, universeYears: 0, travelerYears: 0 };
    launch.targetId = target.id;
    expect(scene.restore(launch)).toBe(true);
    expect(telemetry.running).toBe(false);

    scene.set({ speed: 4000, smoothTravel: true });
    const plan = scene.planApproach(target.id, 1);
    expect(plan.estimatedSeconds).toBeGreaterThan(18);
    expect(plan.estimatedSeconds).toBeLessThan(21);
    pauses.length = 0; pauseEvents.length = 0;
    expect(scene.navigateTo(target.id, 1)).toBe(true);
    // React mirrors the restored scene and selected pace after the launch handler.
    scene.set({ ...launch.settings, speed: 4000, running: true });
    expect(telemetry.navigation.active).toBe(true);
    expect(telemetry.target.id).toBe(target.id);
    expect(telemetry.target.screen[0]).toBeCloseTo(0.5, 8);
    expect(telemetry.target.screen[1]).toBeCloseTo(0.5, 8);

    advance();
    let steps = 0;
    while (telemetry.running && steps < 1500) { advance(20); steps++; }
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.completed).toBe(true);
    expect(telemetry.target.distanceLy).toBeCloseTo(plan.arrivalRadiusLy, 6);
    expect(telemetry.distanceLy).toBeCloseTo(plan.remainingLy, 6);
    expect(Math.abs(steps * 0.02 - plan.estimatedSeconds)).toBeLessThan(0.15);
    expect(telemetry.universeYears).toBe(0);
    expect(telemetry.travelerYears).toBe(0);
    expect(pauseEvents).toEqual([[expect.stringContaining('Arrived'), expect.objectContaining({ kind: 'arrival', targetId: target.id, region: 'galaxy', mode: 'explore' })]]);
    const stopped = scene.snapshot();
    advance(5000);
    expect(scene.snapshot()).toEqual(stopped);
    expect(pauses).toHaveLength(1);
  });
});

describe('Universe flight journey checkpoints', () => {
  function clearPauses() { pauses.length = 0; pauseEvents.length = 0; }

  function positionAndClocks(snapshot) {
    const { yaw, pitch, ...state } = snapshot.state;
    return state;
  }

  function centerSeparation(snapshot) {
    const { position, yaw, pitch } = snapshot.state;
    const length = Math.hypot(...position), n = position.map(value => -value / length);
    const beta = snapshot.settings.mode === 'relativity' && !snapshot.settings.compareRest ? snapshot.settings.beta : 0;
    const denominator = 1 + beta * n[2], gamma = 1 / Math.sqrt(1 - beta * beta);
    const apparent = [n[0] / gamma / denominator, n[1] / gamma / denominator, (n[2] + beta) / denominator];
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    const x = apparent[0] * cy - apparent[2] * sy;
    const y = -apparent[0] * sy * sp + apparent[1] * cp - apparent[2] * cy * sp;
    const z = apparent[0] * sy * cp + apparent[1] * sp + apparent[2] * cy * cp;
    return Math.atan2(Math.hypot(x, y), z);
  }

  it('emits one structured boundary event in every scale and motion mode while stopping at the finite edge', () => {
    for (const [region, boundary] of [['neighborhood', 100000], ['galaxy', 3000000], ['cosmic', 120000000]]) {
      for (const mode of ['explore', 'relativity']) {
        const saved = scene.snapshot();
        saved.settings = { ...saved.settings, region, mode, beta: 0.6 };
        saved.state = { ...saved.state, position: [0, 0, boundary - 1], yaw: 0, pitch: 0 };
        expect(scene.restore(saved)).toBe(true);
        scene.set({ speed: 1e10, smoothTravel: false, timeScale: 1e10 }); clearPauses();
        scene.set({ running: true }); advance(); advance(100);
        expect(telemetry.running).toBe(false);
        expect(telemetry.motion.paceLyPerSecond).toBe(0);
        expect(Math.hypot(...telemetry.position)).toBeCloseTo(boundary, 6);
        expect(pauseEvents).toHaveLength(1);
        expect(pauseEvents[0]).toEqual([expect.stringContaining('edge'), { kind: 'boundary', region, mode, position: telemetry.position }]);
        expect(pauseEvents[0][1].position).not.toBe(telemetry.position);
        const edgePosition = telemetry.position.slice();
        pauseEvents[0][1].position[0] = 1e20;
        expect(scene.snapshot().state.position).toEqual(edgePosition);
        const stopped = scene.snapshot(); advance(5000);
        expect(scene.snapshot()).toEqual(stopped);
        expect(pauseEvents).toHaveLength(1);
      }
    }
  });

  it('reports genuine arrival metadata using the chosen viewing radius and emits it once', () => {
    const initial = scene.snapshot(), target = flight.landmarks('neighborhood')[0];
    for (const multiplier of [1, 4]) {
      scene.restore(initial); scene.set({ speed: 1e10 }); clearPauses();
      expect(scene.navigateTo(target.id, multiplier)).toBe(true);
      advance();
      for (let i = 0; i < 300 && telemetry.running; i++) advance(100);
      expect(telemetry.running).toBe(false);
      expect(telemetry.navigation.completed).toBe(true);
      expect(pauseEvents).toEqual([[expect.stringContaining('Arrived'), {
        kind: 'arrival', region: 'neighborhood', mode: 'explore', position: telemetry.position, targetId: target.id,
        targetName: target.name, arrivalRadiusLy: target.arrivalRadiusLy * multiplier,
      }]]);
      const remaining = Math.hypot(...target.position.map((value, index) => value - telemetry.position[index]));
      expect(remaining).toBeCloseTo(target.arrivalRadiusLy * multiplier, 9);
      expect(pauseEvents[0][1].position).not.toBe(telemetry.position);
      const arrivalPosition = telemetry.position.slice();
      pauseEvents[0][1].position[0] = 1e20;
      expect(scene.snapshot().state.position).toEqual(arrivalPosition);
      advance(5000); expect(pauseEvents).toHaveLength(1);
    }
  });

  it('keeps generic pause callbacks message-only, including already-within and canceled approaches', () => {
    const initial = scene.snapshot(), inside = structuredClone(initial);
    inside.state.position = flight.landmarks('neighborhood')[0].position.slice();
    scene.restore(inside); clearPauses();
    expect(scene.navigateTo('amber-star')).toBe(false);
    expect(pauseEvents).toEqual([[expect.stringContaining('Already within')]]);
    scene.restore(initial); clearPauses();
    scene.navigateTo('amber-star'); scene.cancelNavigation();
    expect(pauseEvents).toEqual([[expect.stringContaining('canceled')]]);
    clearPauses(); scene.nudge('right', 1); scene.frameTarget('amber-star'); scene.faceSceneCenter();
    expect(pauseEvents).toHaveLength(3);
    expect(pauseEvents.every(args => args.length === 1 && typeof args[0] === 'string')).toBe(true);
  });

  it('looks toward the geometric center in free and both displayed relativistic skies without changing the journey or lens', () => {
    const initial = scene.snapshot();
    for (const [mode, compareRest, beta] of [['explore', false, 0.9], ['relativity', false, 0.9], ['relativity', true, 0.9]]) {
      for (const position of [[37, -14, -85], [-14, 8, 26], [0, 1000, 0], [0, -1000, 0]]) {
        const saved = structuredClone(initial);
        saved.settings = { ...saved.settings, mode, compareRest, beta, fov: 55, exposure: 1.35, quality: 'high' };
        saved.state = { ...saved.state, position, yaw: 0.3, pitch: -0.2, distanceLy: 900, universeYears: 120, travelerYears: 96 };
        saved.targetId = 'blue-star';
        expect(scene.restore(saved)).toBe(true);
        scene.set({ speed: 17, smoothTravel: true, timeScale: 42, running: true });
        const before = scene.snapshot(); clearPauses();
        expect(scene.faceSceneCenter()).toBe(true);
        const facing = scene.snapshot();
        expect(telemetry.running).toBe(false);
        expect(telemetry.motion).toMatchObject({ smoothTravel: true, paceLyPerSecond: 0 });
        expect(positionAndClocks(facing)).toEqual(positionAndClocks(before));
        expect(facing.settings).toEqual(before.settings);
        expect(facing.targetId).toBe(before.targetId);
        expect(centerSeparation(facing)).toBeLessThanOrEqual(0.01 + 1e-12);
        if (position[0] !== 0) expect(centerSeparation(facing)).toBeLessThan(1e-12);
        expect(Math.abs(facing.state.pitch)).toBeLessThanOrEqual(Math.PI / 2 - 0.01);
        expect(pauseEvents).toEqual([[expect.stringContaining('center')]]);
        advance(5000); expect(scene.snapshot()).toEqual(facing);
        expect(scene.restore(facing)).toBe(true);
        expect(centerSeparation(scene.snapshot())).toBeCloseTo(centerSeparation(facing), 12);
        expect(positionAndClocks(scene.snapshot())).toEqual(positionAndClocks(facing));
      }
    }
  });

  it('clears routes, orbits, and framing while keeping the selected destination and precision history', () => {
    scene.nudge('right', 1); scene.frameTarget('amber-star', 1 / 3);
    const framed = scene.snapshot();
    expect(telemetry.cameraMoves).toBe(1); expect(telemetry.framing.canUndo).toBe(true);
    expect(scene.faceSceneCenter()).toBe(true);
    expect(positionAndClocks(scene.snapshot())).toEqual(positionAndClocks(framed));
    expect(telemetry.cameraMoves).toBe(1);
    expect(telemetry.framing).toMatchObject({ canUndo: false, placement: null });
    expect(scene.undoFrame()).toBe(false);
    expect(scene.undoNudge()).toBe(true);
    expect(telemetry.position).toEqual([0, 0, 0]);

    scene.navigateTo('blue-star'); advance(); advance(100);
    scene.frameTarget('blue-star', 2 / 3);
    expect(telemetry.navigation.active).toBe(true); expect(telemetry.framing.canUndo).toBe(true);
    const route = scene.snapshot(); expect(scene.faceSceneCenter()).toBe(true);
    expect(telemetry.navigation).toMatchObject({ active: false, targetId: null });
    expect(telemetry.target.id).toBe('blue-star');
    expect(telemetry.framing).toMatchObject({ canUndo: false, placement: null });
    expect(positionAndClocks(scene.snapshot())).toEqual(positionAndClocks(route));

    scene.startOrbit('blue-star'); advance(); advance(100); scene.selectTarget('blue-star');
    const orbit = scene.snapshot(); expect(scene.faceSceneCenter()).toBe(true);
    expect(telemetry.orbit).toEqual({ active: false, targetId: null });
    expect(telemetry.running).toBe(false);
    expect(telemetry.target.id).toBe('blue-star');
    expect(positionAndClocks(scene.snapshot())).toEqual(positionAndClocks(orbit));
  });

  it('rejects an origin sightline atomically while an orbit is running', () => {
    expect(scene.startOrbit('amber-star')).toBe(true);
    const before = scene.snapshot(), published = structuredClone(telemetry), scheduled = frames.size;
    clearPauses(); expect(scene.faceSceneCenter()).toBe(false);
    expect(scene.snapshot()).toEqual(before);
    expect(telemetry).toEqual(published);
    expect(frames.size).toBe(scheduled);
    expect(pauseEvents).toEqual([]);
  });

  it('rejects lost or disposed graphics without mutating the camera or emitting a pause', () => {
    scene.nudge('right', 1); scene.frameTarget('amber-star', 1 / 3);
    const event = new Event('webglcontextlost', { cancelable: true }); sceneCanvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const lost = scene.snapshot(), published = structuredClone(telemetry); clearPauses();
    expect(scene.faceSceneCenter()).toBe(false);
    expect(scene.snapshot()).toEqual(lost); expect(telemetry).toEqual(published);
    expect(pauseEvents).toEqual([]);
    scene.dispose(); expect(scene.faceSceneCenter()).toBe(false);
    expect(scene.snapshot()).toEqual(lost); expect(pauseEvents).toEqual([]);
  });

  it('rejects unavailable graphics even after restoring a non-origin camera', () => {
    const canvas = document.createElement('canvas'), callback = vi.fn();
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
    const unavailable = flight.create(canvas, { onPause: callback });
    const saved = unavailable.snapshot(); saved.state.position = [1, 0, 0];
    expect(unavailable.restore(saved)).toBe(true); callback.mockClear();
    const before = unavailable.snapshot();
    expect(unavailable.faceSceneCenter()).toBe(false);
    expect(unavailable.snapshot()).toEqual(before); expect(callback).not.toHaveBeenCalled();
    unavailable.dispose();
  });
});

describe('Universe flight destination bearing guide', () => {
  function guide(direction, yaw = 0, pitch = 0, beta = 0, fov = 65, aspect = 1) {
    return flight.math.targetView(direction, yaw, pitch, beta, fov, aspect);
  }

  function boundedEdge(view) {
    expect(view.edge).toHaveLength(2);
    for (const coordinate of view.edge) {
      expect(Number.isFinite(coordinate)).toBe(true);
      expect(coordinate).toBeGreaterThanOrEqual(0.1 - 1e-12);
      expect(coordinate).toBeLessThanOrEqual(0.9 + 1e-12);
    }
    expect(Number.isFinite(view.arrowDeg)).toBe(true);
    expect(Number.isFinite(view.angleDeg)).toBe(true);
  }

  it('points toward all eight screen-plane directions without reversing targets behind the camera', () => {
    const directions = [
      [[1, 0, 0], 'right', 0],
      [[1, -1, 0], 'lower-right', 45],
      [[0, -1, 0], 'down', 90],
      [[-1, -1, 0], 'lower-left', 135],
      [[-1, 0, 0], 'left', 180],
      [[-1, 1, 0], 'upper-left', -135],
      [[0, 1, 0], 'up', -90],
      [[1, 1, 0], 'upper-right', -45],
    ];
    for (const [direction, sector, arrow] of directions) {
      const view = guide(direction);
      expect(view.inView).toBe(false);
      expect(view.sector).toBe(sector);
      expect(Math.cos(view.arrowDeg * Math.PI / 180)).toBeCloseTo(Math.cos(arrow * Math.PI / 180), 10);
      expect(Math.sin(view.arrowDeg * Math.PI / 180)).toBeCloseTo(Math.sin(arrow * Math.PI / 180), 10);
      expect(view.angleDeg).toBeCloseTo(90, 10);
      boundedEdge(view);
      const behind = guide([direction[0], direction[1], -0.2]);
      expect(behind.behind).toBe(true);
      expect(behind.inView).toBe(false);
      expect(behind.sector).toBe(sector);
      expect(behind.arrowDeg).toBeCloseTo(view.arrowDeg, 10);
      boundedEdge(behind);
    }
  });

  it('uses viewport aspect for both visible projection and the inset bearing position', () => {
    const square = guide([1, 1, 0], 0, 0, 0, 65, 1);
    const wide = guide([1, 1, 0], 0, 0, 0, 65, 2);
    const tall = guide([1, 1, 0], 0, 0, 0, 65, 0.5);
    expect(square.edge[0]).toBeCloseTo(0.9, 10);
    expect(square.edge[1]).toBeCloseTo(0.1, 10);
    expect(wide.edge[0]).toBeCloseTo(0.7, 10);
    expect(wide.edge[1]).toBeCloseTo(0.1, 10);
    expect(tall.edge[0]).toBeCloseTo(0.9, 10);
    expect(tall.edge[1]).toBeCloseTo(0.3, 10);
    const ray = [1, 0, 1];
    expect(guide(ray, 0, 0, 0, 65, 1).inView).toBe(false);
    const projected = guide(ray, 0, 0, 0, 65, 2);
    expect(projected.inView).toBe(true);
    expect(projected.screen[0]).toBeCloseTo(0.5 + 1 / Math.tan(65 * Math.PI / 360) / 4, 10);
    expect(projected.screen[1]).toBeCloseTo(0.5, 10);
    const verticalRay = [0, Math.tan(20 * Math.PI / 180), 1];
    expect(guide(verticalRay, 0, 0, 0, 30, 2).inView).toBe(false);
    expect(guide(verticalRay, 0, 0, 0, 65, 2).inView).toBe(true);
  });

  it('provides finite guides at the exact antipode and on both sides of a perpendicular sightline', () => {
    const antipode = guide([0, 0, -1]);
    expect(antipode.sector).toBe('behind');
    expect(antipode.behind).toBe(true);
    expect(antipode.angleDeg).toBeCloseTo(180, 10);
    expect(antipode.screen).toEqual([null, null]);
    boundedEdge(antipode);
    for (const z of [-1e-12, 0, 1e-12]) {
      const view = guide([1, 0, z]);
      expect(view.inView).toBe(false);
      expect(view.sector).toBe('right');
      expect(view.angleDeg).toBeCloseTo(90, 8);
      expect(view.edge[0]).toBeCloseTo(0.9, 10);
      expect(view.edge[1]).toBeCloseTo(0.5, 10);
      boundedEdge(view);
    }
  });

  it('aberrates in the travel frame before rotating into the camera view', () => {
    const rest = guide([1, 0, 0]);
    const moving = guide([1, 0, 0], 0, 0, 0.9);
    expect(rest.inView).toBe(false);
    expect(moving.inView).toBe(true);
    expect(moving.angleDeg).toBeCloseTo(Math.acos(0.9) * 180 / Math.PI, 10);
    expect(moving.screen[0]).toBeCloseTo(0.5 + Math.sqrt(1 - 0.9 ** 2) / 0.9 / Math.tan(65 * Math.PI / 360) / 2, 10);
    const turned = guide([1, 0, 0], Math.PI / 2, 0, 0.9);
    expect(turned.sector).toBe('left');
    expect(turned.inView).toBe(false);
    expect(turned.angleDeg).toBeCloseTo(Math.asin(0.9) * 180 / Math.PI, 10);
    const restTurned = guide([1, 0, 0], Math.PI / 2);
    expect(restTurned.inView).toBe(true);
    expect(restTurned.screen[0]).toBeCloseTo(0.5, 10);
    expect(restTurned.angleDeg).toBeCloseTo(0, 8);
  });

  it('bounds invalid helper inputs and treats a coincident landmark as having no sightline', () => {
    for (const direction of [null, [], [NaN, Infinity, 0], [0, 0, 0]]) {
      const view = guide(direction, NaN, Infinity, NaN, NaN, 0);
      boundedEdge(view);
      expect(view.screen.every(value => value === null || Number.isFinite(value))).toBe(true);
    }
    const target = flight.landmarks('neighborhood')[0];
    const saved = scene.snapshot();
    saved.state.position = target.position.slice();
    saved.targetId = target.id;
    expect(scene.restore(saved)).toBe(true);
    expect(telemetry.target.distanceLy).toBe(0);
    expect(telemetry.target.coincident).toBe(true);
    expect(telemetry.target.guide).toBeNull();
    expect(telemetry.target.doppler).toBeNull();
    expect(telemetry.target.restAngleDeg).toBeNull();
    expect(telemetry.target.apparentAngleDeg).toBeNull();
    const before = scene.snapshot();
    expect(scene.focusTarget(target.id)).toBe(false);
    expect(scene.snapshot()).toEqual(before);
  });

  it('keeps the live guide consistent after centering and looking, without moving or advancing clocks', () => {
    const target = flight.landmarks('neighborhood')[0];
    scene.set({ mode: 'relativity', beta: 0.9, fov: 65 });
    scene.focusTarget(target.id);
    expect(telemetry.target.guide.angleDeg).toBeCloseTo(0, 6);
    expect(telemetry.target.guide.inView).toBe(true);
    expect(telemetry.target.guide.screen).toEqual(telemetry.target.screen);
    scene.look(Math.PI / 2, 0.2);
    advance();
    const snapshot = scene.snapshot();
    const expected = guide(target.position, snapshot.state.yaw, snapshot.state.pitch, 0.9, 65, 800 / 500);
    expect(telemetry.target.guide).toEqual(expected);
    expect(telemetry.target.inView).toBe(expected.inView);
    expect(telemetry.target.screen).toEqual(expected.screen);
    expect(telemetry.position).toEqual([0, 0, 0]);
    expect(telemetry.running).toBe(false);
    expect(telemetry.universeYears).toBe(0);
    expect(telemetry.travelerYears).toBe(0);
    const physicalAngle = telemetry.target.apparentAngleDeg;
    scene.set({ compareRest: true });
    const unshifted = guide(target.position, snapshot.state.yaw, snapshot.state.pitch, 0, 65, 800 / 500);
    expect(telemetry.target.guide).toEqual(unshifted);
    expect(telemetry.target.apparentAngleDeg).toBe(physicalAngle);
    expect(scene.snapshot().state).toEqual(snapshot.state);
  });
});

describe('Universe flight composition framing', () => {
  // Project independently of targetView so inverse framing cannot pass by
  // repeating an error shared with its forward helper.
  function project(direction, pose, beta, fov, aspect) {
    const length = Math.hypot(...direction), n = direction.map(value => value / length);
    const denominator = 1 + beta * n[2], gamma = 1 / Math.sqrt(1 - beta ** 2);
    const apparent = [n[0] / gamma / denominator, n[1] / gamma / denominator, (n[2] + beta) / denominator];
    const sy = Math.sin(pose.yaw), cy = Math.cos(pose.yaw), sp = Math.sin(pose.pitch), cp = Math.cos(pose.pitch);
    const x = apparent[0] * cy - apparent[2] * sy;
    const y = -apparent[0] * sy * sp + apparent[1] * cp - apparent[2] * cy * sp;
    const z = apparent[0] * sy * cp + apparent[1] * sp + apparent[2] * cy * cp;
    return [0.5 + x / z / aspect / Math.tan(fov * Math.PI / 360) / 2, 0.5 - y / z / Math.tan(fov * Math.PI / 360) / 2];
  }

  function stableState(snapshot) {
    const { yaw, pitch, ...state } = snapshot.state;
    return state;
  }

  it('solves known framing angles and puts varied rays at exact anchors after aberration', () => {
    for (const u of [1 / 3, 0.5, 2 / 3]) {
      const forward = flight.math.targetFrame([0, 0, 1], 0, 60, 1, u);
      const expectedYaw = -Math.atan((2 * u - 1) * Math.tan(Math.PI / 6));
      expect(Math.atan2(Math.sin(forward.yaw - expectedYaw), Math.cos(forward.yaw - expectedYaw))).toBeCloseTo(0, 12);
      expect(forward.pitch).toBe(0);
      expect(forward.screen).toEqual([u, 0.5]);
    }
    const centered = flight.math.targetFrame([1, 1, 1], 0, 65, 1.6);
    expect(centered.yaw).toBeCloseTo(Math.PI / 4, 12);
    expect(centered.pitch).toBeCloseTo(Math.asin(1 / Math.sqrt(3)), 12);
    for (const direction of [[-3.1, 1, 8.5], [4.3, -2.2, 16], [1, 0, -1]]) {
      for (const beta of [0, 0.9, 0.9999]) for (const fov of [30, 65, 100]) {
        for (const aspect of [0.5, 1.6, 3]) for (const u of [1 / 3, 0.5, 2 / 3]) {
          const pose = flight.math.targetFrame(direction, beta, fov, aspect, u);
          expect(pose).not.toBeNull();
          const screen = project(direction, pose, beta, fov, aspect);
          expect(screen[0]).toBeCloseTo(u, 9);
          expect(screen[1]).toBeCloseTo(0.5, 9);
          expect(flight.math.targetView(direction, pose.yaw, pose.pitch, beta, fov, aspect).inView).toBe(true);
        }
      }
    }
  });

  it('rejects undefined sightlines and unreachable pole placements without inventing a gaze', () => {
    for (const direction of [null, undefined, [], [1, 0], [NaN, 0, 1], [1, Infinity, 0], [0, 0, 0]]) {
      expect(flight.math.targetFrame(direction, 0, 65, 1.6, 0.5)).toBeNull();
    }
    for (const u of [-0.01, 1.01, NaN, Infinity, null, '0.5']) {
      expect(flight.math.targetFrame([0, 0, 1], 0, 65, 1.6, u)).toBeNull();
    }
    expect(flight.math.targetFrame([0, 1, 0], 0, 65, 1.6, 0.5)).toBeNull();
    const pitch = Math.PI / 2 - 0.02, nearPole = [0, Math.sin(pitch), Math.cos(pitch)];
    const center = flight.math.targetFrame(nearPole, 0, 65, 1.6, 0.5);
    expect(center.pitch).toBeCloseTo(pitch, 10);
    expect(project(nearPole, center, 0, 65, 1.6)[1]).toBeCloseTo(0.5, 10);
    expect(flight.math.targetFrame(nearPole, 0, 65, 1.6, 1 / 3)).toBeNull();
    expect(flight.math.targetFrame(nearPole, 0, 65, 1.6, 2 / 3)).toBeNull();
  });

  it('matches renderer clamps and defaults while keeping boundary anchors finite', () => {
    const ray = [1, 0, 1];
    const defaults = flight.math.targetFrame(ray, NaN, NaN, 0);
    expect(defaults).toEqual(flight.math.targetFrame(ray, 0, 65, 1, 0.5));
    expect(flight.math.targetFrame(ray, 2, 200, 1.6, 1 / 3)).toEqual(flight.math.targetFrame(ray, 0.9999, 100, 1.6, 1 / 3));
    expect(flight.math.targetFrame(ray, -1, -5, -1, 2 / 3)).toEqual(flight.math.targetFrame(ray, 0, 30, 1, 2 / 3));
    for (const u of [0, 1]) {
      const pose = flight.math.targetFrame([0, 0, -1], 0, 65, 1.6, u);
      expect(Number.isFinite(pose.yaw)).toBe(true);
      expect(Number.isFinite(pose.pitch)).toBe(true);
      expect(project([0, 0, -1], pose, 0, 65, 1.6)[0]).toBeCloseTo(u, 10);
    }
  });

  it('uses the displayed sky in every mode and preserves position, path, clocks, and lens', () => {
    scene.set({ mode: 'relativity', beta: 0.6, timeScale: 10 }); scene.set({ running: true });
    advance(); advance(100); scene.set({ running: false });
    const initial = scene.snapshot();
    for (const [mode, compareRest, beta] of [['explore', false, 0], ['relativity', false, 0.9], ['relativity', true, 0.9]]) {
      scene.restore(initial); scene.set({ mode, compareRest, beta, fov: 55 });
      scene.look(0.3, -0.2); scene.selectTarget('amber-star');
      const before = scene.snapshot();
      for (const [u, placement] of [[1 / 3, 'left'], [0.5, 'center'], [2 / 3, 'right']]) {
        expect(scene.frameTarget('amber-star', u)).toBe(true);
        expect(telemetry.running).toBe(false);
        expect(telemetry.target.screen[0]).toBeCloseTo(u, 10);
        expect(telemetry.target.screen[1]).toBeCloseTo(0.5, 10);
        expect(telemetry.framing).toMatchObject({ canLeft: true, canCenter: true, canRight: true, canUndo: true, placement });
        const framed = scene.snapshot();
        expect(stableState(framed)).toEqual(stableState(before));
        expect(framed.settings).toEqual(before.settings);
        const ray = flight.landmarks('neighborhood')[0].position.map((value, index) => value - framed.state.position[index]);
        const screen = project(ray, framed.state, mode === 'relativity' && !compareRest ? beta : 0, 55, 1.6);
        expect(screen[0]).toBeCloseTo(u, 9); expect(screen[1]).toBeCloseTo(0.5, 9);
        advance(1000); expect(scene.snapshot()).toEqual(framed);
        expect(scene.undoFrame()).toBe(true);
        expect(scene.snapshot()).toEqual(before);
        expect(telemetry.framing.canUndo).toBe(false);
      }
    }
  });

  it('has one level of orientation undo and leaves precision-camera history independent', () => {
    scene.nudge('right', 1); scene.look(0.4, 0.1);
    const before = scene.snapshot();
    expect(telemetry.cameraMoves).toBe(1);
    scene.frameTarget('amber-star', 1 / 3);
    const left = scene.snapshot();
    expect(telemetry.cameraMoves).toBe(1);
    scene.frameTarget('amber-star', 2 / 3);
    expect(scene.undoFrame()).toBe(true);
    expect(scene.snapshot()).toEqual(left);
    expect(telemetry.cameraMoves).toBe(1);
    expect(scene.undoFrame()).toBe(false);
    expect(scene.snapshot()).toEqual(left);
    expect(scene.undoNudge()).toBe(true);
    expect(telemetry.position).toEqual([0, 0, 0]);
    expect(telemetry.yaw).toBe(left.state.yaw);
    expect(telemetry.pitch).toBe(left.state.pitch);
    expect(telemetry.cameraMoves).toBe(0);
    expect(stableState(left)).toEqual(stableState(before));
  });

  it('rejects invalid framing atomically, including while running and at a landmark center', () => {
    scene.startOrbit('amber-star'); advance(); advance(100);
    const before = scene.snapshot(), beforeTelemetry = structuredClone(telemetry);
    for (const [id, u] of [['missing', 0.5], ['amber-star', -1], ['amber-star', NaN], ['amber-star', Infinity]]) {
      expect(scene.frameTarget(id, u)).toBe(false);
      expect(scene.snapshot()).toEqual(before);
      expect(telemetry).toEqual(beforeTelemetry);
    }
    const coincident = scene.snapshot();
    coincident.state.position = flight.landmarks('neighborhood')[0].position.slice();
    scene.restore(coincident);
    const coLocated = scene.snapshot();
    expect(telemetry.framing).toMatchObject({ canLeft: false, canCenter: false, canRight: false, canUndo: false });
    expect(scene.frameTarget('amber-star', 0.5)).toBe(false);
    expect(scene.snapshot()).toEqual(coLocated);
    const nearPole = scene.snapshot(), target = flight.landmarks('neighborhood')[0];
    nearPole.state.position = [target.position[0], target.position[1] - Math.sin(Math.PI / 2 - 0.02), target.position[2] - Math.cos(Math.PI / 2 - 0.02)];
    scene.restore(nearPole);
    expect(telemetry.framing).toMatchObject({ canLeft: false, canCenter: true, canRight: false });
    expect(scene.frameTarget('amber-star', 1 / 3)).toBe(false);
    expect(scene.snapshot()).toEqual(nearPole);
  });

  it('ends active orbits, pauses matching approaches, and clears a route when framing another destination', () => {
    scene.startOrbit('amber-star'); advance(); advance(100);
    const orbit = scene.snapshot();
    expect(scene.frameTarget('amber-star', 1 / 3)).toBe(true);
    expect(telemetry.running).toBe(false); expect(telemetry.orbit.active).toBe(false);
    expect(stableState(scene.snapshot())).toEqual(stableState(orbit));
    expect(scene.undoFrame()).toBe(true);
    expect(telemetry.running).toBe(false); expect(telemetry.orbit.active).toBe(false);
    scene.reset(); scene.set({ speed: 1 }); scene.navigateTo('amber-star', 2); advance(); advance(100);
    scene.selectTarget('amber-star'); // Publish the live route after the throttled RAF telemetry.
    const route = scene.snapshot(), navigation = structuredClone(telemetry.navigation);
    expect(scene.frameTarget('amber-star', 2 / 3)).toBe(true);
    expect(telemetry.running).toBe(false); expect(telemetry.navigation.active).toBe(true);
    expect(telemetry.navigation).toEqual(navigation);
    expect(stableState(scene.snapshot())).toEqual(stableState(route));
    advance(1000); expect(telemetry.navigation).toEqual(navigation);
    expect(scene.frameTarget('blue-star', 1 / 3)).toBe(true);
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.target.id).toBe('blue-star');
    expect(telemetry.running).toBe(false);
  });

  it('retains undo across unchanged paused controls and clears it when the view or journey changes', () => {
    scene.frameTarget('amber-star', 1 / 3);
    const framed = scene.snapshot();
    scene.selectTarget('amber-star'); scene.set({ running: false, fov: framed.settings.fov, mode: framed.settings.mode, region: framed.settings.region, beta: framed.settings.beta, compareRest: framed.settings.compareRest });
    scene.set({ exposure: 1.2, quality: 'high' });
    expect(telemetry.framing.canUndo).toBe(true);
    expect(scene.snapshot().state).toEqual(framed.state);
    const actions = [
      () => scene.look(0.1, 0),
      () => scene.view('back'),
      () => scene.focusTarget('amber-star'),
      () => scene.selectTarget('blue-star'),
      () => scene.set({ fov: 45 }),
      () => scene.nudge('right', 1),
      () => { scene.nudge('right', 1); scene.frameTarget('amber-star', 1 / 3); scene.undoNudge(); },
      () => scene.set({ running: true }),
      () => scene.reset(),
      () => scene.restore(scene.snapshot()),
      () => scene.set({ mode: 'relativity' }),
      () => scene.set({ region: 'galaxy' }),
      () => scene.navigateTo('amber-star'),
      () => scene.startOrbit('amber-star'),
    ];
    for (const [index, action] of actions.entries()) {
      scene.restore(framed); expect(scene.frameTarget('amber-star', 1 / 3)).toBe(true);
      expect(telemetry.framing.canUndo).toBe(true);
      action(); advance();
      expect(telemetry.framing.canUndo, 'History action '+index).toBe(false);
      expect(scene.undoFrame()).toBe(false);
    }
    scene.restore(framed); scene.set({ mode: 'relativity', beta: 0.9 }); scene.frameTarget('amber-star', 1 / 3);
    scene.set({ beta: 0.95 });
    expect(telemetry.framing.canUndo).toBe(false);
    expect(scene.undoFrame()).toBe(false);
    scene.frameTarget('amber-star', 1 / 3); scene.set({ compareRest: true });
    expect(telemetry.framing.canUndo).toBe(false);
    expect(scene.undoFrame()).toBe(false);
  });
});

describe('Universe flight saved observations', () => {
  it('restores the complete viewpoint and accumulated clocks in a paused state', () => {
    scene.set({ mode: 'relativity', beta: 0.6, timeScale: 10, fov: 55, exposure: 1.35, quality: 'auto' });
    scene.set({ running: true });
    advance();
    advance(100);
    scene.set({ running: false });
    scene.look(0.4, -0.2);
    scene.selectTarget('blue-star');
    const saved = scene.snapshot();
    expect(saved.state.universeYears).toBeGreaterThan(0);
    expect(saved.state.travelerYears).toBeLessThan(saved.state.universeYears);
    scene.set({ region: 'cosmic', mode: 'explore', running: true, fov: 90, exposure: 0.5 });
    expect(scene.restore(saved)).toBe(true);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.position).toEqual(saved.state.position);
    expect(telemetry.universeYears).toBe(saved.state.universeYears);
    expect(telemetry.travelerYears).toBe(saved.state.travelerYears);
    advance(1000);
    expect(scene.snapshot()).toEqual(saved);
  });

  it('copies snapshots so editing a downloaded observation cannot change the live scene', () => {
    const saved = scene.snapshot();
    saved.state.position[0] = 1234;
    saved.settings.region = 'cosmic';
    expect(scene.snapshot().state.position).toEqual([0, 0, 0]);
    expect(scene.snapshot().settings.region).toBe('neighborhood');
  });

  it('rejects invalid or out-of-bounds saved views atomically', () => {
    scene.look(0.5, 0.2);
    const before = scene.snapshot();
    const invalid = [
      null,
      { ...before, version: 999 },
      { ...before, settings: { ...before.settings, region: 'missing' } },
      { ...before, state: { ...before.state, position: [NaN, 0, 0] } },
      { ...before, state: { ...before.state, position: [100001, 0, 0] } },
      { ...before, state: { ...before.state, universeYears: Infinity } },
    ];
    for (const value of invalid) {
      expect(scene.restore(value)).toBe(false);
      expect(scene.snapshot()).toEqual(before);
    }
  });
});

describe('Universe flight approach planner', () => {
  it('plans without movement and bounds invalid distance choices', () => {
    const before=scene.snapshot();
    const near=scene.planApproach('amber-star',1),wide=scene.planApproach('amber-star',4);
    expect(wide.arrivalRadiusLy).toBe(near.arrivalRadiusLy*4);
    expect(wide.remainingLy).toBeLessThan(near.remainingLy);
    expect(scene.planApproach('amber-star',100)).toEqual(wide);
    expect(scene.planApproach('amber-star',NaN)).toEqual(near);
    expect(scene.planApproach('missing')).toBeNull();
    expect(scene.snapshot()).toEqual(before);
    scene.set({speed:0});expect(scene.planApproach('amber-star').estimatedSeconds).toBeNull();
    scene.set({mode:'relativity'});expect(scene.planApproach('amber-star')).toBeNull();
  });
  it('stops at each chosen survey radius with monotonic progress and a useful time estimate', () => {
    const target=flight.landmarks('neighborhood')[0];
    for(const multiplier of [1,2,4]) {
      scene.reset();scene.set({speed:2});
      const plan=scene.planApproach(target.id,multiplier);
      expect(scene.navigateTo(target.id,multiplier)).toBe(true);advance();
      let steps=0,progress=0;
      while(telemetry.running&&steps<1000) {
        advance(20);steps++;
        expect(telemetry.navigation.progress).toBeGreaterThanOrEqual(progress);
        progress=telemetry.navigation.progress;
      }
      expect(telemetry.running).toBe(false);
      expect(telemetry.navigation.completed).toBe(true);
      expect(telemetry.navigation.progress).toBe(1);
      expect(telemetry.target.distanceLy).toBeCloseTo(plan.arrivalRadiusLy,8);
      expect(telemetry.distanceLy).toBeCloseTo(plan.remainingLy,8);
      expect(Math.abs(steps*0.02-plan.estimatedSeconds)).toBeLessThan(0.15);
      expect(telemetry.universeYears).toBe(0);
      expect(telemetry.travelerYears).toBe(0);
    }
  });
  it('keeps a paused route intact, updates its estimate with pace, and clears completion on free travel', () => {
    scene.set({speed:1});scene.navigateTo('amber-star',2);advance();advance(100);
    scene.set({running:false});const stopped=structuredClone(telemetry.navigation),position=telemetry.position.slice();
    advance(1000);expect(telemetry.navigation).toEqual(stopped);
    scene.set({speed:5});expect(telemetry.navigation.estimatedSeconds).toBeLessThan(stopped.estimatedSeconds);
    expect(telemetry.position).toEqual(position);
    scene.set({running:true});advance();
    for(let i=0;i<300&&telemetry.running;i++)advance(100);
    expect(telemetry.navigation.completed).toBe(true);
    scene.set({running:true});expect(telemetry.navigation.completed).toBe(false);
    scene.set({running:false});expect(scene.navigateTo('amber-star',4)).toBe(false);
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.completed).toBe(true);
    scene.selectTarget('blue-star');expect(telemetry.navigation.targetId).toBeNull();
  });
});

describe('Universe flight precision camera', () => {
  it('moves along the camera basis and pauses without changing clocks or gaze', () => {
    scene.look(Math.PI/2,Math.PI/6);
    const gaze=scene.snapshot().state;
    expect(scene.nudge('right',2)).toBe(true);
    expect(telemetry.position[0]).toBeCloseTo(0,8);
    expect(telemetry.position[2]).toBeCloseTo(-2,8);
    scene.nudge('up',2);
    expect(telemetry.position[0]).toBeCloseTo(-1,8);
    expect(telemetry.position[1]).toBeCloseTo(Math.sqrt(3),8);
    scene.nudge('forward',2);
    expect(telemetry.position[0]).toBeCloseTo(Math.sqrt(3)-1,8);
    expect(telemetry.position[1]).toBeCloseTo(Math.sqrt(3)+1,8);
    expect(telemetry.distanceLy).toBeCloseTo(6,8);
    expect(telemetry.running).toBe(false);
    expect(telemetry.universeYears).toBe(0);expect(telemetry.travelerYears).toBe(0);
    expect(telemetry.yaw).toBe(gaze.yaw);expect(telemetry.pitch).toBe(gaze.pitch);
  });
  it('undoes position and path while preserving a later look direction, with a 12-step limit', () => {
    for(let i=0;i<14;i++)scene.nudge('forward',1);
    expect(telemetry.cameraMoves).toBe(12);
    scene.look(0.2,0.1);
    for(let i=0;i<12;i++)expect(scene.undoNudge()).toBe(true);
    expect(telemetry.position).toEqual([0,0,2]);
    expect(telemetry.distanceLy).toBe(2);
    expect(telemetry.trail.at(-1)).toEqual([0,0,2]);
    expect(telemetry.yaw).toBeCloseTo(0.2,8);
    expect(telemetry.pitch).toBeCloseTo(0.1,8);
    expect(scene.undoNudge()).toBe(false);
  });
  it('clips steps at the model boundary and can undo the actual clipped displacement', () => {
    const saved=scene.snapshot();saved.state.position=[0,0,99999];scene.restore(saved);
    scene.nudge('forward',20);
    expect(telemetry.position[2]).toBeCloseTo(100000,8);
    expect(telemetry.distanceLy).toBeCloseTo(1,8);
    expect(telemetry.running).toBe(false);
    scene.undoNudge();expect(telemetry.position).toEqual([0,0,99999]);expect(telemetry.distanceLy).toBe(0);
  });
  it('hands off routes and orbits, clears undo for new journeys, and rejects steps in relativity', () => {
    scene.navigateTo('amber-star');scene.nudge('left',1);
    expect(telemetry.navigation.active).toBe(false);expect(telemetry.running).toBe(false);
    scene.startOrbit('amber-star');expect(telemetry.cameraMoves).toBe(0);
    scene.nudge('back',1);expect(telemetry.orbit.active).toBe(false);
    scene.set({running:true});expect(scene.undoNudge()).toBe(false);
    scene.set({running:false});const before=scene.snapshot();
    expect(scene.nudge('missing',1)).toBe(false);expect(scene.nudge('up',NaN)).toBe(false);
    expect(scene.nudge('up',-1)).toBe(false);expect(scene.snapshot()).toEqual(before);
    scene.set({mode:'relativity'});const physical=scene.snapshot();
    expect(scene.nudge('forward',1)).toBe(false);expect(scene.snapshot()).toEqual(physical);
  });
});

describe('Universe flight navigation chart', () => {
  it('fits landmarks and path with equal scales for both coordinate axes', () => {
    for (const region of ['neighborhood','galaxy','cosmic']) for (const plane of ['xz','xy']) {
      const chart=flight.math.chartView(region,[-90000,15000,-80000],0.2,0.1,[[0,0,0],[1000,2000,3000]],plane);
      const points=chart.landmarks.map(p=>[p.x,p.y]).concat([[chart.camera.x,chart.camera.y]],chart.trail);
      for(const [x,y] of points) {
        expect(x).toBeGreaterThan(15);expect(x).toBeLessThan(265);
        expect(y).toBeGreaterThan(15);expect(y).toBeLessThan(205);
      }
      const [a,b]=chart.trail;
      expect((b[0]-a[0])/(a[1]-b[1])).toBeCloseTo(plane==='xz'?1/3:1/2,8);
      expect(chart.scaleLy).toBeGreaterThan(0);expect(chart.scalePixels).toBeGreaterThan(0);
    }
  });
  it('projects gaze without a false heading when looking perpendicular to the chart', () => {
    const view=(yaw,pitch,plane)=>flight.math.chartView('neighborhood',[0,0,0],yaw,pitch,[],plane);
    expect(view(0,0,'xz').camera.angle).toBe(0);
    expect(view(Math.PI/2,0,'xz').camera.angle).toBeCloseTo(90,8);
    expect(view(0,Math.PI/2,'xz').camera.headingVisible).toBe(false);
    expect(view(0,0,'xy').camera.headingVisible).toBe(false);
    expect(view(0,Math.PI/4,'xy').camera.angle).toBe(0);
    const shifted=flight.math.chartView('neighborhood',[0,0,0],Math.PI/2,0,[],'xz',0.9);
    expect(shifted.camera.angle).toBeCloseTo(Math.atan2(Math.sqrt(1-0.9*0.9),-0.9)*180/Math.PI,8);
    const invalid=flight.math.chartView('missing',[NaN,Infinity,0],NaN,Infinity,null,'missing');
    expect(Number.isFinite(invalid.camera.x)).toBe(true);expect(invalid.landmarks).toEqual([]);
  });
  it('bounds and copies history, then clears it on a restored view or scene change', () => {
    scene.set({speed:2,running:true});advance();
    for(let i=0;i<150;i++)advance(300);
    scene.set({running:false});expect(telemetry.trail).toHaveLength(128);
    expect(telemetry.trail.at(-1)).toEqual(telemetry.position);
    const saved=scene.snapshot(),oldPosition=telemetry.position.slice();
    telemetry.trail.at(-1)[0]=1e15;scene.selectTarget('amber-star');
    expect(telemetry.trail.at(-1)).toEqual(oldPosition);
    const count=telemetry.trail.length;scene.look(0.1,0);advance();
    expect(telemetry.trail).toHaveLength(count);
    scene.restore(saved);expect(telemetry.trail).toEqual([saved.state.position]);
    scene.set({region:'galaxy'});expect(telemetry.trail).toEqual([[0,0,-95000]]);
    scene.reset();expect(telemetry.trail).toEqual([[0,0,-95000]]);
  });
});

describe('Universe flight camera orbits', () => {
  it('holds radius and altitude, centers its target, and records camera arc length without advancing physical clocks', () => {
    scene.set({ region: 'galaxy', orbitRate: 6 });
    expect(scene.startOrbit('galactic-center')).toBe(true);
    advance();
    for (let i = 0; i < 10; i++) advance(100);
    scene.set({ running: false });
    expect(Math.hypot(...telemetry.position)).toBeCloseTo(95000, 6);
    expect(telemetry.position[1]).toBe(0);
    expect(telemetry.position[0]).toBeLessThan(0);
    expect(telemetry.target.screen[0]).toBeCloseTo(0.5, 8);
    expect(telemetry.target.screen[1]).toBeCloseTo(0.5, 8);
    expect(telemetry.distanceLy).toBeCloseTo(95000 * Math.PI / 30, 6);
    expect(telemetry.universeYears).toBe(0);
    expect(telemetry.travelerYears).toBe(0);
    const paused = scene.snapshot(); advance(5000);
    expect(scene.snapshot()).toEqual(paused);
    expect(telemetry.orbit.active).toBe(true);
    scene.set({ orbitDirection: -1, running: true }); advance();
    for (let i = 0; i < 10; i++) advance(100);
    scene.set({ running: false });
    expect(telemetry.position[0]).toBeCloseTo(0, 6);
    expect(telemetry.position[2]).toBeCloseTo(-95000, 6);
  });

  it('hands control back immediately on manual look and target changes', () => {
    expect(scene.startOrbit('amber-star')).toBe(true);
    const before = scene.snapshot().state.position;
    scene.look(0.2, 0); advance();
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
    expect(telemetry.position).toEqual(before);
    scene.startOrbit('amber-star'); scene.selectTarget('blue-star');
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
    scene.startOrbit('blue-star'); scene.view('back');
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
  });

  it('clears orbit state when switching motion, restoring a view, resetting, or entering relativity', () => {
    const saved = scene.snapshot();
    scene.startOrbit('amber-star'); scene.navigateTo('amber-star');
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.navigation.active).toBe(true);
    scene.startOrbit('amber-star');
    expect(telemetry.navigation.active).toBe(false);
    expect(scene.restore(saved)).toBe(true);
    expect(telemetry.orbit.active).toBe(false);
    scene.startOrbit('amber-star'); scene.reset();
    expect(telemetry.orbit.active).toBe(false);
    scene.startOrbit('amber-star'); scene.set({mode:'relativity'});
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
    expect(scene.startOrbit('amber-star')).toBe(false);
    expect(scene.startOrbit('missing')).toBe(false);
  });

  it('stops an orbit at the generated model boundary', () => {
    const saved = scene.snapshot(); saved.state.position = [-100000,0,0];
    scene.restore(saved); scene.set({orbitRate:0.25}); scene.startOrbit('amber-star');
    advance(); advance(100);
    expect(telemetry.running).toBe(false);
    expect(telemetry.orbit.active).toBe(false);
    expect(Math.hypot(...telemetry.position)).toBeCloseTo(100000, 6);
  });
});

describe('Universe flight smooth camera travel', () => {
  function publishFreeMotion() {
    scene.selectTarget('amber-star');
    return telemetry.motion;
  }

  function startFree(speed = 12) {
    scene.set({ smoothTravel: true, speed, running: true });
    advance(); // Starting RAF establishes time and must add no displacement.
    expect(scene.snapshot().state.distanceLy).toBe(0);
  }

  it('integrates a continuous response and gives the same distance when an interval is split', () => {
    const pace = 15, duration = 0.08, response = 0.6;
    // Solve dv/dt=(pace-v)/response from rest, then integrate v over time.
    const expectedSpeed = pace * (1 - Math.exp(-duration / response));
    const expectedDistance = pace * (duration - response * (1 - Math.exp(-duration / response)));
    const whole = flight.math.easePace(0, pace, duration);
    expect(whole.speed).toBeCloseTo(expectedSpeed, 12);
    expect(whole.distance).toBeCloseTo(expectedDistance, 12);
    const first = flight.math.easePace(0, pace, duration / 2);
    const second = flight.math.easePace(first.speed, pace, duration / 2);
    expect(second.speed).toBeCloseTo(whole.speed, 12);
    expect(first.distance + second.distance).toBeCloseTo(whole.distance, 12);
    const quicker = flight.math.easePace(0, pace, duration, 0.2);
    expect(quicker.speed).toBeCloseTo(pace * (1 - Math.exp(-duration / 0.2)), 12);
    expect(quicker.distance).toBeCloseTo(pace * (duration - 0.2 * (1 - Math.exp(-duration / 0.2))), 12);
  });

  it('decelerates without reversing, bounds malformed inputs, and treats zero pace as an immediate stop', () => {
    const slowed = flight.math.easePace(30, 5, 0.1);
    expect(slowed.speed).toBeGreaterThan(5);
    expect(slowed.speed).toBeLessThan(30);
    expect(slowed.distance).toBeGreaterThan(5 * 0.1);
    expect(slowed.distance).toBeLessThan(30 * 0.1);
    for (const dt of [0, 0.1, 100]) {
      expect(flight.math.easePace(30, 0, dt)).toEqual({ speed: 0, distance: 0 });
    }
    for (const args of [
      [NaN, Infinity, NaN, -1],
      [-100, -2, -0.1, Infinity],
      [1e15, 1e15, 10, 0],
      [undefined, 12, 0.1, NaN],
    ]) {
      const result = flight.math.easePace(...args);
      expect(Number.isFinite(result.speed)).toBe(true);
      expect(Number.isFinite(result.distance)).toBe(true);
      expect(result.speed).toBeGreaterThanOrEqual(0);
      expect(result.speed).toBeLessThanOrEqual(1e10);
      expect(result.distance).toBeGreaterThanOrEqual(0);
      expect(result.distance).toBeLessThanOrEqual(1e9);
    }
    expect(flight.math.easePace(0, 12, 100)).toEqual(flight.math.easePace(0, 12, 0.1));
  });

  it('keeps immediate travel as the default and makes an eased journey independent of frame subdivision', () => {
    scene.set({ speed: 12, running: true }); advance(); advance(100);
    expect(scene.snapshot().state.distanceLy).toBeCloseTo(1.2, 12);
    expect(publishFreeMotion().smoothTravel).toBe(false);
    const results = [];
    for (const interval of [100, 25]) {
      scene.reset(); startFree();
      for (let elapsed = 0; elapsed < 1000; elapsed += interval) advance(interval);
      results.push({ state: scene.snapshot().state, motion: structuredClone(publishFreeMotion()) });
    }
    const expectedDistance = 12 * (1 - 0.6 * (1 - Math.exp(-1 / 0.6)));
    const expectedSpeed = 12 * (1 - Math.exp(-1 / 0.6));
    for (const result of results) {
      expect(result.state.distanceLy).toBeCloseTo(expectedDistance, 10);
      expect(result.state.position).toEqual([0, 0, result.state.distanceLy]);
      expect(result.motion.paceLyPerSecond).toBeCloseTo(expectedSpeed, 10);
      expect(result.motion.targetLyPerSecond).toBe(12);
      expect(result.motion.kind).toBe('free');
      expect(result.state.universeYears).toBe(0);
      expect(result.state.travelerYears).toBe(0);
    }
    expect(results[0].state.distanceLy).toBeCloseTo(results[1].state.distanceLy, 12);
  });

  it('stops on pause, visibility suspension, or a zero setting and resumes from rest', () => {
    startFree(); advance(100); advance(100);
    expect(publishFreeMotion().paceLyPerSecond).toBeGreaterThan(0);
    scene.set({ running: false });
    const paused = scene.snapshot().state;
    expect(publishFreeMotion().paceLyPerSecond).toBe(0);
    expect(telemetry.motion.targetLyPerSecond).toBe(12);
    advance(5000); expect(scene.snapshot().state).toEqual(paused);
    scene.set({ running: true }); advance();
    expect(scene.snapshot().state).toEqual(paused);
    advance(100);
    const restartDistance = 12 * (0.1 - 0.6 * (1 - Math.exp(-0.1 / 0.6)));
    expect(scene.snapshot().state.distanceLy - paused.distanceLy).toBeCloseTo(restartDistance, 12);
    const hidden = scene.snapshot().state;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(telemetry.motion.paceLyPerSecond).toBe(0);
    advance(5000); expect(scene.snapshot().state).toEqual(hidden);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    advance(); expect(scene.snapshot().state).toEqual(hidden);
    advance(100);
    expect(scene.snapshot().state.distanceLy - hidden.distanceLy).toBeCloseTo(restartDistance, 12);
    scene.set({ speed: 0 });
    const stopped = scene.snapshot().state;
    expect(publishFreeMotion().paceLyPerSecond).toBe(0);
    expect(telemetry.motion.targetLyPerSecond).toBe(0);
    advance(100); advance(100);
    expect(scene.snapshot().state).toEqual(stopped);
  });

  it('retains the current response across view controls and target selection while travel continues', () => {
    startFree(); advance(100); advance(100);
    const previous = structuredClone(publishFreeMotion());
    const distance = scene.snapshot().state.distanceLy;
    scene.set({ fov: 45, beta: 0.99, exposure: 1.3 });
    scene.selectTarget('blue-star');
    expect(telemetry.motion.paceLyPerSecond).toBe(previous.paceLyPerSecond);
    expect(scene.snapshot().state.distanceLy).toBe(distance);
    advance(100); scene.selectTarget('blue-star');
    const expectedSpeed = 12 * (1 - Math.exp(-0.3 / 0.6));
    expect(telemetry.motion.paceLyPerSecond).toBeCloseTo(expectedSpeed, 12);
    expect(scene.snapshot().state.distanceLy).toBeCloseTo(12 * (0.3 - 0.6 * (1 - Math.exp(-0.3 / 0.6))), 12);
    expect(telemetry.running).toBe(true);
  });

  it('keeps the preference while clearing momentum on restore, reset, mode and scale changes, and model boundaries', () => {
    const saved = scene.snapshot();
    startFree(); advance(100);
    expect(publishFreeMotion().paceLyPerSecond).toBeGreaterThan(0);
    expect(scene.restore(saved)).toBe(true);
    expect(publishFreeMotion().smoothTravel).toBe(true);
    expect(telemetry.motion.paceLyPerSecond).toBe(0);
    expect(telemetry.running).toBe(false);
    scene.set({ running: true }); advance(); advance(100);
    scene.reset();
    expect(publishFreeMotion().paceLyPerSecond).toBe(0);
    expect(telemetry.motion.smoothTravel).toBe(true);
    scene.set({ running: true }); advance(); advance(100);
    scene.set({ mode: 'relativity' });
    expect(publishFreeMotion().paceLyPerSecond).toBe(0);
    expect(telemetry.running).toBe(false);
    scene.set({ mode: 'explore' });
    const distance = scene.snapshot().state.distanceLy;
    scene.set({ running: true }); advance(); advance(100);
    expect(scene.snapshot().state.distanceLy - distance).toBeCloseTo(12 * (0.1 - 0.6 * (1 - Math.exp(-0.1 / 0.6))), 12);
    scene.set({ region: 'cosmic' });
    expect(telemetry.motion.paceLyPerSecond).toBe(0);
    expect(telemetry.motion.smoothTravel).toBe(true);
    expect(telemetry.running).toBe(false);
    scene.set({ region: 'neighborhood' });
    const edgeView = scene.snapshot(); edgeView.state.position = [0, 0, 99999];
    scene.restore(edgeView); scene.set({ speed: 1e10, running: true }); advance(); advance(100);
    expect(telemetry.running).toBe(false);
    expect(telemetry.motion.paceLyPerSecond).toBe(0);
    expect(telemetry.motion.smoothTravel).toBe(true);
    expect(telemetry.position[2]).toBeCloseTo(100000, 8);
  });

  it('preserves guided stopping distances and orbit geometry when the preference changes', () => {
    const initial = scene.snapshot();
    const routes = [], orbits = [];
    for (const smoothTravel of [false, true]) {
      scene.restore(initial); scene.set({ smoothTravel, speed: 10 });
      scene.navigateTo('amber-star', 2); advance();
      scene.selectTarget('amber-star'); expect(telemetry.motion.kind).toBe('approach');
      for (let i = 0; i < 300 && telemetry.running; i++) advance(100);
      expect(telemetry.running).toBe(false);
      expect(telemetry.target.distanceLy).toBeCloseTo(1.2, 9);
      routes.push(scene.snapshot().state);
      scene.restore(initial); scene.set({ smoothTravel, orbitRate: 6 });
      scene.startOrbit('amber-star'); advance();
      scene.selectTarget('amber-star'); expect(telemetry.motion.kind).toBe('orbit');
      for (let i = 0; i < 10; i++) advance(100);
      scene.set({ running: false });
      orbits.push(scene.snapshot().state);
    }
    expect(routes[1]).toEqual(routes[0]);
    expect(orbits[1]).toEqual(orbits[0]);
    expect(orbits[0].distanceLy).toBeGreaterThan(0);
    expect(orbits[0].universeYears).toBe(0);
  });

  it('leaves relativistic distance and both physical clocks identical with smooth travel enabled', () => {
    const initial = scene.snapshot(), states = [];
    for (const smoothTravel of [false, true]) {
      scene.restore(initial); scene.set({ mode: 'relativity', smoothTravel, beta: 0.6, timeScale: 10 });
      scene.set({ running: true }); advance();
      for (let i = 0; i < 10; i++) advance(100);
      scene.selectTarget('amber-star');
      expect(telemetry.motion.kind).toBe('relativity');
      expect(telemetry.motion.paceLyPerSecond).toBe(0);
      states.push(scene.snapshot().state);
    }
    expect(states[1]).toEqual(states[0]);
    expect(states[0].distanceLy).toBeCloseTo(6, 12);
    expect(states[0].universeYears).toBeCloseTo(10, 12);
    expect(states[0].travelerYears).toBeCloseTo(8, 12);
  });
});
