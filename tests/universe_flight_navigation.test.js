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
let graphicsCreates;
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
  graphicsCreates = {};
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
      if (key === 'createBuffer' || key === 'createProgram' || key === 'createShader') return () => {
        graphicsCreates[key] = (graphicsCreates[key] || 0) + 1;
        return {};
      };
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

describe('Universe flight Halo flyby', () => {
  function publishFlyby() {
    // Running telemetry is throttled; a same-rate UI settings echo publishes
    // the current frame without changing the route or its camera.
    scene.set({ flybyRate: telemetry.flyby.rate });
    return telemetry.flyby;
  }

  function launch(rate = 1) {
    scene.set({ mode: 'explore', region: 'galaxy', flybyRate: rate });
    expect(scene.startFlyby('halo')).toBe(true);
    advance(); // A newly started RAF establishes time without displacement.
    return flight.flybys('galaxy')[0];
  }

  function finish(interval = 100) {
    const positions = [scene.snapshot().state.position];
    for (let step = 0; step < 10000 && telemetry.running; step++) {
      advance(interval);
      positions.push(scene.snapshot().state.position);
    }
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby.completed).toBe(true);
    return positions;
  }

  function expectAtomicRejection(action) {
    const before = scene.snapshot(), published = structuredClone(telemetry), scheduled = frames.size;
    const eventCount = pauseEvents.length;
    expect(action()).toBe(false);
    expect(scene.snapshot()).toEqual(before);
    expect(telemetry).toEqual(published);
    expect(frames.size).toBe(scheduled);
    expect(pauseEvents).toHaveLength(eventCount);
  }

  it('adds six distinct generated destinations while preserving existing catalog IDs and independent metadata', () => {
    const oldIds = {
      neighborhood: ['amber-star', 'blue-star', 'pale-star'],
      galaxy: ['galactic-center', 'inner-arm', 'disk-edge'],
      cosmic: ['near-galaxy', 'companion-galaxy', 'distant-galaxy', 'golden-elliptical'],
    };
    const all = Object.keys(oldIds).flatMap(region => {
      const catalog = flight.landmarks(region);
      expect(catalog.slice(0, oldIds[region].length).map(item => item.id)).toEqual(oldIds[region]);
      return catalog;
    });
    expect(all).toHaveLength(18);
    expect(new Set(all.map(item => item.id)).size).toBe(18);
    const clusters = flight.landmarks('galaxy').filter(item => item.id.startsWith('halo-cluster-'));
    expect(clusters.map(item => item.id)).toEqual(Array.from({ length: 6 }, (_, i) => 'halo-cluster-' + (i + 1)));
    expect(new Set(clusters.map(item => JSON.stringify(item.position))).size).toBe(6);
    for (const item of clusters) {
      expect(item.position.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...item.position)).toBeLessThan(3000000);
      expect(item.arrivalRadiusLy).toBeGreaterThan(0);
      expect(item.kind + ' ' + item.description).toMatch(/generated/i);
    }
    const routes = flight.flybys('galaxy');
    expect(routes).toHaveLength(1);
    expect(routes).toEqual(flight.flybys().filter(item => item.region === 'galaxy'));
    expect(flight.flybys('cosmic')).toMatchObject([{ id: 'group', region: 'cosmic' }]);
    expect(flight.flybys('missing')).toEqual([]);
    expect(routes[0]).toMatchObject({ id: 'halo', region: 'galaxy', targetId: 'halo-cluster-2' });
    expect(routes[0].durationSeconds).toBeGreaterThan(10);
    expect(routes[0].durationSeconds).toBeLessThan(120);
    expect(routes[0].position.every(Number.isFinite)).toBe(true);
    expect(routes[0].aim.every(Number.isFinite)).toBe(true);
    const original = structuredClone(routes[0]);
    routes[0].position[0] = 1e20; routes[0].aim[1] = 1e20; routes[0].name = 'Changed';
    expect(flight.flybys('galaxy')[0]).toEqual(original);
  });

  it('starts a fresh camera journey and survives the UI settings echo without creating resources', () => {
    scene.set({ mode: 'relativity', beta: 0.9, timeScale: 10 });
    scene.set({ running: true });
    advance(); advance(100);
    expect(scene.snapshot().state.universeYears).toBeGreaterThan(0);
    scene.set({ mode: 'explore', region: 'galaxy' });
    scene.nudge('right', 1000); scene.frameTarget('galactic-center', 1 / 3);
    const resources = createdTextures.slice(), uploads = textureUploads.length;
    const route = launch();
    expect(telemetry.flyby).toMatchObject({ active: true, completed: false, id: route.id, progress: 0, elapsedSeconds: 0, autoLook: true, rate: 1 });
    expect(telemetry.motion.kind).toBe('flyby');
    expect(telemetry.position).toEqual(route.position);
    expect(telemetry.target.id).toBe(route.targetId);
    expect(telemetry.cameraMoves).toBe(0);
    expect(telemetry.framing.canUndo).toBe(false);
    expect(telemetry.trail).toEqual([route.position]);
    expect(telemetry.distanceLy).toBe(0);
    expect(telemetry.universeYears).toBe(0);
    expect(telemetry.travelerYears).toBe(0);
    const settings = scene.snapshot().settings;
    scene.set({ ...settings, running: true, speed: 4000, smoothTravel: true, flybyRate: 1 });
    expect(telemetry.flyby.active).toBe(true);
    expect(telemetry.position).toEqual(route.position);
    advance(100);
    expect(publishFlyby().elapsedSeconds).toBeCloseTo(0.1, 10);
    expect(createdTextures).toEqual(resources);
    expect(textureUploads).toHaveLength(uploads);
  });

  it('follows a continuous curved path outside the star cluster and pauses once at a repeatable endpoint', () => {
    const route = launch();
    pauses.length = 0; pauseEvents.length = 0;
    const cluster = flight.landmarks('galaxy').find(item => item.id === route.targetId);
    const positions = finish(), end = scene.snapshot();
    const gaps = positions.map(position => Math.hypot(...cluster.position.map((value, i) => value - position[i])));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(500);
    expect(Math.min(...gaps)).toBeLessThan(2500);
    expect(positions.every(position => position.every(Number.isFinite) && Math.hypot(...position) < 3000000)).toBe(true);
    const chords = positions.slice(1).map((position, i) => Math.hypot(...position.map((value, j) => value - positions[i][j])));
    expect(Math.max(...chords)).toBeLessThan(3000);
    const line = end.state.position.map((value, i) => value - positions[0][i]);
    const lineLength = Math.hypot(...line), unit = line.map(value => value / lineLength);
    const deviations = positions.map(position => {
      const offset = position.map((value, i) => value - positions[0][i]);
      const projection = offset.reduce((sum, value, i) => sum + value * unit[i], 0);
      return Math.hypot(...offset.map((value, i) => value - projection * unit[i]));
    });
    expect(Math.max(...deviations)).toBeGreaterThan(500);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: true, progress: 1, elapsedSeconds: route.durationSeconds });
    expect(telemetry.target.id).toBe('galactic-center');
    expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
    expect(pauseEvents).toEqual([[expect.any(String), {
      kind: 'flyby', region: 'galaxy', mode: 'explore', position: end.state.position,
      targetId: 'galactic-center', targetName: 'Galactic center', routeId: route.id, routeName: route.name,
    }]]);
    expect(pauseEvents[0][1].position).not.toBe(telemetry.position);
    pauseEvents[0][1].position[0] = 1e20;
    advance(5000); expect(scene.snapshot()).toEqual(end);
    expect(pauses).toHaveLength(1);
    launch(); finish(25);
    expect(scene.snapshot().state.position).toEqual(end.state.position);
  });

  it('freezes route progress on pause and resumes at the same point without a time jump', () => {
    launch(); for (let i = 0; i < 20; i++) advance(100);
    scene.set({ running: false });
    const paused = scene.snapshot(), route = structuredClone(telemetry.flyby);
    expect(route.active).toBe(true);
    expect(telemetry.motion.paceLyPerSecond).toBe(0);
    advance(5000);
    expect(scene.snapshot()).toEqual(paused); expect(telemetry.flyby).toEqual(route);
    scene.set({ running: true }); advance();
    expect(scene.snapshot()).toEqual(paused);
    expect(telemetry.flyby.elapsedSeconds).toBe(route.elapsedSeconds);
    advance(100);
    expect(publishFlyby().elapsedSeconds).toBeCloseTo(route.elapsedSeconds + 0.1, 10);
    expect(telemetry.position).not.toEqual(paused.state.position);
  });

  it('freezes hidden and offscreen routes and excludes suspended wall time when visibility returns', () => {
    let intersect;
    const originalObserver = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(callback) { intersect = callback; }
      observe() {}
      disconnect() {}
    };
    try {
      scene.dispose();
      scene = flight.create(sceneCanvas, { onTelemetry: value => { telemetry = value; }, onPause: (...args) => { pauses.push(args[0]); pauseEvents.push(args); } });
      launch(); advance(100); advance(100);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      const hidden = scene.snapshot(), elapsed = telemetry.flyby.elapsedSeconds;
      expect(telemetry.motion.paceLyPerSecond).toBe(0);
      advance(5000); expect(scene.snapshot()).toEqual(hidden);
      expect(telemetry.flyby.elapsedSeconds).toBe(elapsed);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      advance(); expect(scene.snapshot()).toEqual(hidden);
      advance(100); expect(publishFlyby().elapsedSeconds).toBeCloseTo(elapsed + 0.1, 10);
      intersect([{ isIntersecting: false }]);
      const offscreen = scene.snapshot(), offscreenElapsed = telemetry.flyby.elapsedSeconds;
      advance(5000); expect(scene.snapshot()).toEqual(offscreen);
      expect(telemetry.flyby.elapsedSeconds).toBe(offscreenElapsed);
      intersect([{ isIntersecting: true }]);
      advance(); expect(scene.snapshot()).toEqual(offscreen);
      advance(100); expect(publishFlyby().elapsedSeconds).toBeCloseTo(offscreenElapsed + 0.1, 10);
    } finally {
      if (originalObserver === undefined) delete window.IntersectionObserver;
      else window.IntersectionObserver = originalObserver;
    }
  });

  it('uses the chosen route rate independently of travel pace, clock scale, beta, and frame subdivision', () => {
    const results = [];
    for (const [rate, interval] of [[0.25, 100], [1, 100], [4, 100], [1, 25]]) {
      const route = launch(rate);
      scene.set({ speed: 1e10, timeScale: 1e10, beta: 0.9999, smoothTravel: true });
      for (let elapsed = 0; elapsed < 1000; elapsed += interval) advance(interval);
      scene.set({ running: false });
      expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(rate, 10);
      expect(telemetry.flyby.progress).toBeCloseTo(rate / route.durationSeconds, 10);
      expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
      results.push(scene.snapshot().state.position);
    }
    results[3].forEach((value, i) => expect(value).toBeCloseTo(results[1][i], 7));
    expect(results[0]).not.toEqual(results[1]); expect(results[2]).not.toEqual(results[1]);
    launch(); scene.set({ flybyRate: 100 }); expect(telemetry.flyby.rate).toBe(4);
    scene.set({ flybyRate: -100 }); expect(telemetry.flyby.rate).toBe(0.25);
    scene.set({ flybyRate: NaN }); expect(Number.isFinite(telemetry.flyby.rate)).toBe(true);
  });

  it('keeps flight moving during manual free look and lets Follow view resume camera guidance without moving the observer', () => {
    launch(); advance(100); advance(100);
    scene.look(0.3, -0.1);
    const looked = scene.snapshot();
    advance(100); advance(100);
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: false });
    expect(telemetry.running).toBe(true);
    expect(telemetry.position).not.toEqual(looked.state.position);
    expect(scene.snapshot().state.yaw).toBe(looked.state.yaw);
    expect(scene.snapshot().state.pitch).toBe(looked.state.pitch);
    const beforeFollow = scene.snapshot().state, elapsed = publishFlyby().elapsedSeconds;
    expect(scene.followFlybyView()).toBe(true);
    expect(telemetry.flyby.autoLook).toBe(true);
    expect(scene.snapshot().state.position).toEqual(beforeFollow.position);
    expect(scene.snapshot().state.distanceLy).toBe(beforeFollow.distanceLy);
    expect(telemetry.flyby.elapsedSeconds).toBe(elapsed);
    scene.view('back'); advance(100); advance(100);
    expect(telemetry.flyby.autoLook).toBe(false);
    expect(telemetry.running).toBe(true);
    expect(scene.snapshot().state.yaw).toBe(Math.PI);
    expect(scene.snapshot().state.pitch).toBe(0);
    scene.set({ running: false });
    const paused = scene.snapshot(), pausedElapsed = telemetry.flyby.elapsedSeconds;
    expect(scene.followFlybyView()).toBe(true);
    expect(telemetry.running).toBe(false);
    expect(scene.snapshot().state.position).toEqual(paused.state.position);
    expect(telemetry.flyby.elapsedSeconds).toBe(pausedElapsed);
  });

  it('keeps the route when framing its selected target and returns to automatic gaze on request', () => {
    launch(); advance(100); advance(100);
    const target = telemetry.target.id, elapsed = publishFlyby().elapsedSeconds;
    expect(scene.focusTarget(target)).toBe(true);
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: false });
    expect(telemetry.running).toBe(true);
    expect(scene.frameTarget(target, 1 / 3)).toBe(true);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: false });
    expect(telemetry.flyby.elapsedSeconds).toBe(elapsed);
    expect(telemetry.target.screen[0]).toBeCloseTo(1 / 3, 8);
    expect(scene.followFlybyView()).toBe(true);
    expect(telemetry.flyby.autoLook).toBe(true);
    expect(telemetry.running).toBe(false);
    scene.faceSceneCenter();
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: false });
    expect(telemetry.running).toBe(false);
  });

  it('cancels at the current observation and does not restart when free travel resumes', () => {
    launch(); advance(100); advance(100);
    const before = scene.snapshot();
    expect(scene.cancelFlyby()).toBe(true);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false });
    expect(telemetry.running).toBe(false);
    expect(scene.snapshot()).toEqual(before);
    advance(5000); expect(scene.snapshot()).toEqual(before);
    expect(scene.cancelFlyby()).toBe(false);
    expect(scene.followFlybyView()).toBe(false);
    scene.set({ speed: 10, smoothTravel: false, running: true }); advance();
    expect(scene.snapshot()).toEqual(before);
    advance(100);
    expect(telemetry.motion.kind).toBe('free');
    expect(telemetry.flyby.active).toBe(false);
    expect(scene.snapshot().state.position).not.toEqual(before.state.position);
  });

  it('hands off to restore, reset, different targets, precision moves, approaches, orbits, scales and physical travel', () => {
    const actions = [
      () => scene.restore(scene.snapshot()),
      () => scene.reset(),
      () => scene.selectTarget('galactic-center'),
      () => scene.nudge('right', 100),
      () => scene.navigateTo('galactic-center'),
      () => scene.startOrbit('galactic-center'),
      () => scene.set({ region: 'cosmic' }),
      () => scene.set({ mode: 'relativity' }),
    ];
    for (const action of actions) {
      launch(); advance(100); advance(100);
      action();
      expect(telemetry.flyby).toMatchObject({ active: false, completed: false });
      expect(telemetry.motion.kind).not.toBe('flyby');
    }
    launch(); scene.selectTarget('halo-cluster-2');
    expect(telemetry.flyby.active).toBe(true);
  });

  it('rejects invalid launches and controls atomically, including unavailable, lost and disposed graphics', () => {
    expectAtomicRejection(() => scene.startFlyby('halo'));
    scene.set({ region: 'galaxy', mode: 'relativity' });
    expectAtomicRejection(() => scene.startFlyby('halo'));
    launch(); advance(100);
    expectAtomicRejection(() => scene.startFlyby('missing'));
    expectAtomicRejection(() => scene.startFlyby(null));
    expectAtomicRejection(() => scene.navigateTo('missing'));
    expectAtomicRejection(() => scene.startOrbit('missing'));
    expectAtomicRejection(() => scene.selectTarget('missing'));
    expectAtomicRejection(() => scene.frameTarget('missing', 1 / 3));
    expectAtomicRejection(() => scene.nudge('missing', 100));
    sceneCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expectAtomicRejection(() => scene.startFlyby('halo'));
    expectAtomicRejection(() => scene.cancelFlyby());
    expectAtomicRejection(() => scene.followFlybyView());
    scene.dispose();
    expectAtomicRejection(() => scene.startFlyby('halo'));
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
    const unavailable = flight.create(canvas);
    unavailable.set({ mode: 'explore', region: 'galaxy' });
    const before = unavailable.snapshot();
    expect(unavailable.startFlyby('halo')).toBe(false);
    expect(unavailable.cancelFlyby()).toBe(false);
    expect(unavailable.followFlybyView()).toBe(false);
    expect(unavailable.snapshot()).toEqual(before);
    unavailable.dispose();
  });

  it('resumes ordinary travel after completion without resetting position and restarts only when explicitly launched', () => {
    const route = launch(4); finish();
    const completed = scene.snapshot();
    scene.set({ running: true, speed: 10, smoothTravel: false }); advance();
    expect(scene.snapshot()).toEqual(completed);
    expect(telemetry.flyby.active).toBe(false);
    expect(telemetry.motion.kind).toBe('free');
    advance(100);
    expect(scene.snapshot().state.distanceLy).toBeCloseTo(completed.state.distanceLy + 1, 7);
    expect(Math.hypot(...scene.snapshot().state.position.map((value, i) => value - completed.state.position[i]))).toBeCloseTo(1, 7);
    expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
    expect(scene.startFlyby(route.id)).toBe(true);
    expect(telemetry.position).toEqual(route.position);
    expect(telemetry.distanceLy).toBe(0);
    expect(telemetry.flyby).toMatchObject({ active: true, completed: false, progress: 0, elapsedSeconds: 0 });
  });
  it('keeps saved observations detached and paused without persisting an active route', () => {
    launch(); advance(100); advance(100);
    const saved = scene.snapshot(), expected = structuredClone(saved);
    expect(Object.keys(saved).sort()).toEqual(['settings', 'state', 'targetId', 'version']);
    expect(Object.keys(saved.settings).sort()).toEqual(['beta', 'compareRest', 'exposure', 'fov', 'mode', 'quality', 'region']);
    expect(saved.version).toBe(1);
    saved.state.position[0] = 1e20; saved.settings.mode = 'relativity';
    expect(scene.snapshot()).toEqual(expected);
    const flyby = telemetry.flyby;
    flyby.progress = 0.9; flyby.elapsedSeconds = 1e20; flyby.id = 'Changed';
    scene.set({ running: false });
    expect(telemetry.flyby.id).toBe('halo');
    expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(0.2, 10);
    expect(scene.restore(expected)).toBe(true);
    expect(scene.snapshot()).toEqual(expected);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false });
    advance(5000); expect(scene.snapshot()).toEqual(expected);
    scene.set({ speed: 0, running: true }); advance(); advance(100);
    expect(telemetry.motion.kind).toBe('free');
    expect(telemetry.flyby.active).toBe(false);
    expect(scene.snapshot()).toEqual(expected);
  });
});

describe('Universe flight Nebula passage', () => {
  const haloMetadata = {
    id: 'halo', name: 'Halo flyby', region: 'galaxy', durationSeconds: 36,
    position: [3957.7186846376026, 27436.312283454703, -23854.48402140951],
    aim: [23665.618022678005, 436.3122834547021, -21488.326021261044],
    fov: 60, targetId: 'halo-cluster-2',
  };
  const haloEndpoint = [74941.59615155982, 50436.3122834547, 60272.14160782259];

  function publish() {
    scene.set({ flybyRate: telemetry.flyby.rate });
    return telemetry.flyby;
  }

  function launch(rate = 1) {
    const route = flight.flybys('neighborhood')[0];
    // Match the UI's authored view settings; startFlyby preserves the current FOV.
    scene.set({ mode: 'explore', region: 'neighborhood', fov: route.fov, flybyRate: rate });
    expect(scene.startFlyby('nebula')).toBe(true);
    advance();
    return route;
  }

  function finish(interval = 100) {
    for (let step = 0; step < 10000 && telemetry.running; step++) advance(interval);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby.completed).toBe(true);
    return scene.snapshot();
  }

  function expectAtomicRejection(action) {
    const saved = scene.snapshot(), published = structuredClone(telemetry), scheduled = frames.size;
    const eventCount = pauseEvents.length;
    expect(action()).toBe(false);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry).toEqual(published);
    expect(frames.size).toBe(scheduled);
    expect(pauseEvents).toHaveLength(eventCount);
  }

  it('returns independent region-specific route catalogs and preserves the original Halo metadata', () => {
    const catalog = flight.flybys(), neighborhood = flight.flybys('neighborhood'), galaxy = flight.flybys('galaxy');
    expect(catalog).toHaveLength(4);
    expect(new Set(catalog.map(item => item.id)).size).toBe(4);
    expect(neighborhood).toHaveLength(2);
    expect(galaxy).toMatchObject([haloMetadata]);
    expect(neighborhood[0]).toMatchObject({
      id: 'nebula', name: 'Nebula passage', region: 'neighborhood', durationSeconds: 40,
      position: [-14, 6, 3], aim: [9, -2, 34], fov: 64, targetId: 'blue-nebula',
    });
    expect(neighborhood).toEqual(catalog.filter(item => item.region === 'neighborhood'));
    expect(galaxy).toEqual(catalog.filter(item => item.region === 'galaxy'));
    expect(flight.flybys('cosmic')).toEqual(catalog.filter(item => item.region === 'cosmic'));
    expect(flight.flybys('missing')).toEqual([]);
    expect(flight.flybys(null)).toEqual([]);
    const original = structuredClone(catalog);
    for (const item of catalog.concat(neighborhood, galaxy)) {
      item.name = 'Changed'; item.position[0] = 1e20; item.aim[1] = 1e20;
    }
    expect(flight.flybys()).toEqual(original);
    const local = flight.landmarks('neighborhood');
    expect(local.map(item => item.id)).toEqual(['amber-star', 'blue-star', 'pale-star', 'blue-nebula', 'violet-nebula']);
    expect(local.find(item => item.id === 'blue-nebula')).toMatchObject({ position: [9, -2, 34], arrivalRadiusLy: 20 });
    expect(local.find(item => item.id === 'violet-nebula')).toMatchObject({ position: [-22, 11, 83], arrivalRadiusLy: 32 });
    for (const item of local.slice(3)) {
      expect(item.kind + ' ' + item.description).toMatch(/generated/i);
      expect(item.arrivalRadiusLy).toBeGreaterThan(0);
    }
  });

  it('rejects cross-region and physical-mode launches without altering the current route or observation', () => {
    scene.set({ mode: 'relativity', region: 'neighborhood' });
    expectAtomicRejection(() => scene.startFlyby('nebula'));
    scene.set({ mode: 'explore', region: 'galaxy' });
    expectAtomicRejection(() => scene.startFlyby('nebula'));
    expect(scene.startFlyby('halo')).toBe(true); advance(); advance(100);
    scene.set({ running: false });
    expectAtomicRejection(() => scene.startFlyby('nebula'));
    expect(telemetry.flyby.id).toBe('halo');
    launch(); advance(100); scene.set({ running: false });
    expectAtomicRejection(() => scene.startFlyby('halo'));
    expectAtomicRejection(() => scene.startFlyby('missing'));
    expect(telemetry.flyby.id).toBe('nebula');
    scene.set({ region: 'cosmic' });
    expectAtomicRejection(() => scene.startFlyby('nebula'));
    expectAtomicRejection(() => scene.startFlyby('halo'));
  });

  it('starts a fresh local journey after Halo travel and accepts the matching UI settings echo', () => {
    scene.set({ mode: 'explore', region: 'galaxy', quality: 'high', beta: 0.99, timeScale: 20, speed: 4000, smoothTravel: true });
    expect(scene.startFlyby('halo')).toBe(true); advance(); advance(100); advance(100);
    expect(scene.snapshot().state.distanceLy).toBeGreaterThan(0);
    const resources = createdTextures.slice(), uploads = textureUploads.length;
    const route = launch(2);
    expect(telemetry.flyby).toMatchObject({ active: true, completed: false, id: 'nebula', name: route.name, progress: 0, elapsedSeconds: 0, autoLook: true, rate: 2 });
    expect(telemetry.target.id).toBe('blue-nebula');
    expect(telemetry.motion.kind).toBe('flyby');
    expect(telemetry.position).toEqual(route.position);
    expect(telemetry.trail).toEqual([route.position]);
    expect(telemetry.distanceLy).toBe(0);
    expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
    const saved = scene.snapshot();
    expect(saved.settings).toMatchObject({ quality: 'high', beta: 0.99, mode: 'explore', region: 'neighborhood', fov: route.fov });
    scene.set({ ...saved.settings, running: true, speed: 4000, smoothTravel: true, flybyRate: 2 });
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry.flyby.active).toBe(true);
    advance(100);
    expect(publish().elapsedSeconds).toBeCloseTo(0.2, 10);
    expect(createdTextures).toEqual(resources);
    expect(textureUploads).toHaveLength(uploads);
  });

  it('follows a continuous local course through its phases and pauses exactly once at the violet reveal', () => {
    const route = launch(), start = scene.snapshot().state.position;
    pauses.length = 0; pauseEvents.length = 0;
    const positions = [start], phaseOrder = ['depart', 'filaments', 'passage', 'turn', 'reveal', 'complete'];
    const phases = [telemetry.flyby.phase];
    let previousDistance = 0, previousPhase = 0;
    for (let step = 0; step < 10000 && telemetry.running; step++) {
      advance(100); publish();
      const state = scene.snapshot().state;
      expect(state.position.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...state.position)).toBeLessThan(100);
      expect(state.distanceLy).toBeGreaterThanOrEqual(previousDistance);
      previousDistance = state.distanceLy;
      const phase = phaseOrder.indexOf(telemetry.flyby.phase);
      expect(phase).toBeGreaterThanOrEqual(previousPhase); previousPhase = phase;
      if (phases.at(-1) !== telemetry.flyby.phase) phases.push(telemetry.flyby.phase);
      for (const star of flight.landmarks('neighborhood').slice(0, 3)) {
        expect(Math.hypot(...state.position.map((value, i) => value - star.position[i]))).toBeGreaterThan(star.arrivalRadiusLy);
      }
      positions.push(state.position);
    }
    const end = scene.snapshot();
    expect(phases).toEqual(phaseOrder);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: true, id: 'nebula', progress: 1, elapsedSeconds: route.durationSeconds, phase: 'complete' });
    expect(telemetry.target.id).toBe('violet-nebula');
    expect(end.state.position).toEqual([-25, 29, 56]);
    expect(telemetry.target.distanceLy).toBeGreaterThan(32);
    expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
    const chords = positions.slice(1).map((position, i) => Math.hypot(...position.map((value, j) => value - positions[i][j])));
    expect(Math.max(...chords)).toBeLessThan(10);
    const bluePass = Math.min(...positions.map(position => Math.hypot(position[0] - 9, position[1] + 2, position[2] - 34)));
    expect(bluePass).toBeGreaterThan(5); expect(bluePass).toBeLessThan(15);
    expect(end.state.distanceLy).toBeGreaterThan(Math.hypot(...end.state.position.map((value, i) => value - start[i])));
    expect(pauseEvents).toEqual([[expect.any(String), {
      kind: 'flyby', region: 'neighborhood', mode: 'explore', position: end.state.position,
      targetId: 'violet-nebula', targetName: flight.landmarks('neighborhood').find(item => item.id === 'violet-nebula').name,
      routeId: route.id, routeName: route.name,
    }]]);
    advance(5000); expect(scene.snapshot()).toEqual(end);
    expect(pauses).toHaveLength(1);
  });

  it('samples the local route independently of frame subdivision and completes at the same endpoint at different rates', () => {
    const partial = [];
    for (const interval of [100, 25]) {
      launch(2);
      scene.set({ speed: 1e10, timeScale: 1e10, beta: 0.9999 });
      for (let elapsed = 0; elapsed < 1000; elapsed += interval) advance(interval);
      scene.set({ running: false });
      expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(2, 10);
      expect(telemetry.flyby.progress).toBeCloseTo(2 / 40, 10);
      partial.push(scene.snapshot().state);
    }
    partial[1].position.forEach((value, i) => expect(value).toBeCloseTo(partial[0].position[i], 9));
    expect(partial[1].distanceLy).toBeCloseTo(partial[0].distanceLy, 9);
    launch(4); const fast = finish();
    launch(0.5); const slow = finish(25);
    expect(slow.state.position).toEqual(fast.state.position);
    expect(slow.state.distanceLy).toBeCloseTo(fast.state.distanceLy, 9);
    expect(slow.targetId).toBe('violet-nebula');
    expect(slow.state.universeYears).toBe(0); expect(slow.state.travelerYears).toBe(0);
  });

  it('uses the local route gaze for Follow view and preserves it when framing the selected nebula', () => {
    launch(); advance(100); advance(100);
    scene.look(0.4, -0.15);
    const looked = scene.snapshot().state;
    advance(100); advance(100); publish();
    expect(telemetry.flyby).toMatchObject({ id: 'nebula', active: true, autoLook: false });
    expect(scene.snapshot().state.position).not.toEqual(looked.position);
    expect(scene.snapshot().state.yaw).toBe(looked.yaw);
    expect(scene.snapshot().state.pitch).toBe(looked.pitch);
    scene.set({ running: false });
    const before = scene.snapshot().state, elapsed = telemetry.flyby.elapsedSeconds;
    expect(scene.followFlybyView()).toBe(true);
    const followed = scene.snapshot().state;
    expect(followed.position).toEqual(before.position);
    expect(followed.distanceLy).toBe(before.distanceLy);
    expect(telemetry.flyby.elapsedSeconds).toBe(elapsed);
    expect(telemetry.target.id).toBe('blue-nebula');
    expect(telemetry.flyby.autoLook).toBe(true);
    expect([followed.yaw, followed.pitch]).not.toEqual([looked.yaw, looked.pitch]);
    expect(scene.frameTarget('blue-nebula', 1 / 3)).toBe(true);
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: false });
    expect(telemetry.target.screen[0]).toBeCloseTo(1 / 3, 8);
    expect(telemetry.running).toBe(false);
    expect(scene.followFlybyView()).toBe(true);
    expect(scene.snapshot().state.yaw).toBe(followed.yaw);
    expect(scene.snapshot().state.pitch).toBe(followed.pitch);
    scene.selectTarget('violet-nebula');
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false });
    expect(telemetry.target.id).toBe('violet-nebula');
  });

  it('saves paused local observations without persisting a route or restarting it on restore', () => {
    launch(); for (let step = 0; step < 20; step++) advance(100);
    scene.set({ running: false });
    const saved = scene.snapshot(), elapsed = telemetry.flyby.elapsedSeconds;
    advance(5000); expect(scene.snapshot()).toEqual(saved);
    expect(telemetry.flyby.elapsedSeconds).toBe(elapsed);
    scene.set({ flybyRate: 2 });
    expect(scene.snapshot()).toEqual(saved);
    scene.set({ running: true }); advance();
    expect(scene.snapshot()).toEqual(saved);
    advance(100); scene.set({ running: false });
    expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(elapsed + 0.2, 10);
    expect(scene.snapshot().state.position).not.toEqual(saved.state.position);
    expect(saved.version).toBe(1);
    expect(Object.keys(saved).sort()).toEqual(['settings', 'state', 'targetId', 'version']);
    expect(saved.targetId).toBe('blue-nebula');
    expect(scene.restore(saved)).toBe(true);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false, id: null });
    advance(5000); expect(scene.snapshot()).toEqual(saved);
    scene.set({ speed: 0, running: true }); advance(); advance(100);
    expect(telemetry.motion.kind).toBe('free');
    expect(scene.snapshot()).toEqual(saved);
  });

  it('ends the local route in place and hands off to ordinary travel or other navigation', () => {
    launch(); advance(100); advance(100); advance(100);
    const saved = scene.snapshot();
    expect(scene.cancelFlyby()).toBe(true);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false, id: null });
    expect(telemetry.running).toBe(false);
    scene.set({ speed: 10, smoothTravel: false, running: true }); advance(); advance(100);
    const free = scene.snapshot().state;
    expect(telemetry.motion.kind).toBe('free');
    expect(free.distanceLy).toBeCloseTo(saved.state.distanceLy + 1, 9);
    expect(Math.hypot(...free.position.map((value, i) => value - saved.state.position[i]))).toBeCloseTo(1, 9);
    launch(); advance(100); advance(100);
    expect(scene.navigateTo('violet-nebula')).toBe(true);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false });
    expect(telemetry.motion.kind).toBe('approach');
    expect(telemetry.target.id).toBe('violet-nebula');
    launch(); advance(100); scene.set({ region: 'galaxy' });
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false });
    expect(telemetry.running).toBe(false);
  });

  it('preserves the Halo launch, duration, completion target and endpoint after a completed local route', () => {
    launch(4); finish();
    scene.set({ region: 'galaxy', flybyRate: 4 });
    expect(flight.flybys('galaxy')).toMatchObject([haloMetadata]);
    expect(scene.startFlyby('halo')).toBe(true); advance();
    expect(telemetry.position).toEqual(haloMetadata.position);
    expect(telemetry.flyby).toMatchObject({ id: 'halo', name: 'Halo flyby', durationSeconds: 36, progress: 0 });
    pauses.length = 0; pauseEvents.length = 0;
    const end = finish();
    expect(end.state.position).toEqual(haloEndpoint);
    expect(end.targetId).toBe('galactic-center');
    expect(telemetry.flyby).toMatchObject({ id: 'halo', completed: true, progress: 1, elapsedSeconds: 36 });
    expect(pauseEvents).toHaveLength(1);
    expect(pauseEvents[0][1]).toMatchObject({ region: 'galaxy', targetId: 'galactic-center', routeId: 'halo', routeName: 'Halo flyby' });
  });
});

describe('Universe flight galaxy group flyby', () => {
  const launchPosition = [-450000, 400000, -1050000];
  const endpoint = [1250000, 1200000, -800000];
  const phases = ['depart', 'spiral', 'crossing', 'elliptical', 'reveal', 'complete'];

  function publish() {
    scene.set({ flybyRate: telemetry.flyby.rate });
    return telemetry.flyby;
  }

  function launch(rate = 1) {
    const route = flight.flybys('cosmic')[0];
    scene.set({ mode: 'explore', region: 'cosmic', fov: route.fov, flybyRate: rate });
    expect(scene.startFlyby('group')).toBe(true);
    advance();
    return route;
  }

  function finish(interval = 500) {
    for (let step = 0; step < 2000 && telemetry.running; step++) advance(interval);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby.completed).toBe(true);
    return scene.snapshot();
  }

  function expectAtomicRejection(action) {
    const saved = scene.snapshot(), published = structuredClone(telemetry);
    const scheduled = [...frames.keys()], eventCount = pauseEvents.length;
    expect(action()).toBe(false);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry).toEqual(published);
    expect([...frames.keys()]).toEqual(scheduled);
    expect(pauseEvents).toHaveLength(eventCount);
  }

  function expectSameView(actual, expected) {
    // Existing restore and resume normalize yaw to 0–2π without changing view.
    expect({ ...actual, state: { ...actual.state, yaw: 0 } }).toEqual({ ...expected, state: { ...expected.state, yaw: 0 } });
    expect(Math.sin(actual.state.yaw)).toBeCloseTo(Math.sin(expected.state.yaw), 12);
    expect(Math.cos(actual.state.yaw)).toBeCloseTo(Math.cos(expected.state.yaw), 12);
  }

  it('adds one detached cosmic route while retaining every existing generated galaxy', () => {
    const routes = flight.flybys('cosmic'), original = structuredClone(routes);
    expect(routes).toHaveLength(1);
    expect(flight.flybys().map(route => route.id)).toEqual(['halo', 'nebula', 'group', 'stellar']);
    expect(routes[0]).toMatchObject({
      id: 'group', name: 'Galaxy group flyby', region: 'cosmic', durationSeconds: 48,
      position: launchPosition, aim: [0, 0, 0], fov: 60, targetId: 'near-galaxy',
    });
    expect(routes[0].highlights.map(highlight => highlight.id)).toEqual(['spiral', 'elliptical', 'panorama']);
    expect(flight.landmarks('cosmic').map(item => item.id)).toEqual(['near-galaxy', 'companion-galaxy', 'distant-galaxy', 'golden-elliptical']);
    routes[0].position[0] = 1e20; routes[0].aim[2] = 1e20;
    routes[0].name = 'Changed'; routes[0].highlights[0].seconds = 1e20;
    routes[0].highlights.splice(1);
    expect(flight.flybys('cosmic')).toEqual(original);
    expect(flight.flybys().filter(route => route.region === 'cosmic')).toEqual(original);
  });

  it('starts a fresh group journey and retains view preferences across the UI settings echo', () => {
    scene.set({ mode: 'relativity', beta: 0.99, timeScale: 20 });
    scene.set({ running: true });
    advance(); advance(100);
    expect(scene.snapshot().state.universeYears).toBeGreaterThan(0);
    scene.set({ mode: 'explore', region: 'cosmic', quality: 'high', exposure: 0.72, compareRest: true });
    scene.nudge('right', 100000); scene.frameTarget('near-galaxy', 1 / 3);
    const creates = { ...graphicsCreates }, textures = createdTextures.slice(), uploads = textureUploads.length;
    const route = launch(2), saved = scene.snapshot();
    expect(telemetry.flyby).toMatchObject({ active: true, completed: false, id: 'group', progress: 0, elapsedSeconds: 0, autoLook: true, rate: 2, phase: 'depart' });
    expect(telemetry.position).toEqual(route.position);
    expect(telemetry.target.id).toBe('near-galaxy');
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.framing.canUndo).toBe(false);
    expect(telemetry.cameraMoves).toBe(0);
    expect(telemetry.trail).toEqual([route.position]);
    expect(saved.state).toMatchObject({ distanceLy: 0, universeYears: 0, travelerYears: 0 });
    expect(saved.settings).toMatchObject({ mode: 'explore', region: 'cosmic', fov: route.fov, quality: 'high', exposure: 0.72, beta: 0.99, compareRest: true });
    scene.set({ ...saved.settings, running: true, speed: 1e10, smoothTravel: true, flybyRate: 2 });
    expectSameView(scene.snapshot(), saved);
    advance(100);
    expect(publish().elapsedSeconds).toBeCloseTo(0.2, 10);
    expect(graphicsCreates).toEqual(creates);
    expect(createdTextures).toEqual(textures);
    expect(textureUploads).toHaveLength(uploads);
  });

  it('skims the spiral and elliptical on a continuous curved course with one final panorama pause', () => {
    const route = launch(), start = scene.snapshot().state.position;
    const galaxies = flight.landmarks('cosmic'), spiral = galaxies[0], elliptical = galaxies[3];
    const positions = [start], visited = [telemetry.flyby.phase];
    let previousDistance = 0, previousPhase = 0;
    pauses.length = 0; pauseEvents.length = 0;
    for (let step = 0; step < 1000 && telemetry.running; step++) {
      advance(100); publish();
      const state = scene.snapshot().state;
      expect(state.position.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...state.position)).toBeLessThan(3000000);
      expect(state.distanceLy).toBeGreaterThanOrEqual(previousDistance);
      previousDistance = state.distanceLy;
      expect(state.universeYears).toBe(0); expect(state.travelerYears).toBe(0);
      const phase = phases.indexOf(telemetry.flyby.phase);
      expect(phase).toBeGreaterThanOrEqual(previousPhase); previousPhase = phase;
      if (visited.at(-1) !== telemetry.flyby.phase) visited.push(telemetry.flyby.phase);
      positions.push(state.position);
    }
    const end = scene.snapshot();
    expect(visited).toEqual(phases);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: true, id: 'group', phase: 'complete', progress: 1, elapsedSeconds: route.durationSeconds });
    expect(end.state.position).toEqual(endpoint);
    expect(end.targetId).toBe('golden-elliptical');
    const spiralPass = Math.min(...positions.map(position => Math.hypot(...position.map((value, i) => value - spiral.position[i]))));
    const ellipticalPass = Math.min(...positions.map(position => Math.hypot(...position.map((value, i) => value - elliptical.position[i]))));
    // The authored spiral skim enters its broad viewing range while keeping a
    // 200,000 ly camera clearance. The elliptical is viewed outside its range.
    expect(spiralPass).toBeGreaterThan(200000); expect(spiralPass).toBeLessThan(spiral.arrivalRadiusLy);
    expect(ellipticalPass).toBeGreaterThan(elliptical.arrivalRadiusLy); expect(ellipticalPass).toBeLessThan(500000);
    const line = end.state.position.map((value, i) => value - start[i]), length = Math.hypot(...line);
    const unit = line.map(value => value / length);
    const deviations = positions.map(position => {
      const offset = position.map((value, i) => value - start[i]);
      const projection = offset.reduce((sum, value, i) => sum + value * unit[i], 0);
      return Math.hypot(...offset.map((value, i) => value - projection * unit[i]));
    });
    expect(Math.max(...deviations)).toBeGreaterThan(length * 0.05);
    expect(end.state.distanceLy).toBeGreaterThan(length * 1.1);
    const chords = positions.slice(1).map((position, i) => Math.hypot(...position.map((value, j) => value - positions[i][j])));
    expect(Math.max(...chords)).toBeLessThan(end.state.distanceLy * 0.015);
    expect(pauseEvents).toEqual([[expect.any(String), {
      kind: 'flyby', region: 'cosmic', mode: 'explore', position: endpoint,
      targetId: 'golden-elliptical', targetName: elliptical.name, routeId: route.id, routeName: route.name,
    }]]);
    advance(5000); expect(scene.snapshot()).toEqual(end);
    expect(pauses).toHaveLength(1);
  });

  it('uses route pacing independently of physical settings and frame subdivision', () => {
    const partial = [];
    for (const [rate, interval] of [[0.25, 100], [1, 100], [4, 100], [1, 25]]) {
      launch(rate); scene.set({ speed: 1e10, timeScale: 1e10, beta: 0.9999, smoothTravel: true });
      for (let elapsed = 0; elapsed < 1000; elapsed += interval) advance(interval);
      scene.set({ running: false });
      expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(rate, 10);
      expect(telemetry.flyby.progress).toBeCloseTo(rate / 48, 10);
      expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
      partial.push(scene.snapshot().state);
    }
    partial[3].position.forEach((value, i) => expect(value).toBeCloseTo(partial[1].position[i], 7));
    expect(partial[3].distanceLy).toBeCloseTo(partial[1].distanceLy, 7);
    expect(partial[0].position).not.toEqual(partial[1].position);
    expect(partial[2].position).not.toEqual(partial[1].position);
    launch(4); const fast = finish();
    launch(0.5); const slow = finish();
    expect(slow.state.position).toEqual(fast.state.position);
    expect(slow.state.distanceLy).toBe(fast.state.distanceLy);
    expect(slow.targetId).toBe('golden-elliptical');
    launch(); scene.set({ flybyRate: 100 }); expect(telemetry.flyby.rate).toBe(4);
    scene.set({ flybyRate: -100 }); expect(telemetry.flyby.rate).toBe(0.25);
  });

  it('freezes paused, hidden and offscreen group travel and excludes suspended wall time on resume', () => {
    let intersect;
    const originalObserver = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(callback) { intersect = callback; }
      observe() {}
      disconnect() {}
    };
    try {
      scene.dispose();
      scene = flight.create(sceneCanvas, { onTelemetry: value => { telemetry = value; }, onPause: (...args) => { pauses.push(args[0]); pauseEvents.push(args); } });
      launch(2); advance(100); advance(100);
      scene.set({ running: false });
      const paused = scene.snapshot(), elapsed = telemetry.flyby.elapsedSeconds;
      advance(5000); expect(scene.snapshot()).toEqual(paused);
      scene.set({ running: true }); advance(5000);
      expectSameView(scene.snapshot(), paused);
      expect(publish().elapsedSeconds).toBe(elapsed);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(elapsed + 0.2, 10);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      const hidden = scene.snapshot(), hiddenElapsed = telemetry.flyby.elapsedSeconds;
      advance(5000); expect(scene.snapshot()).toEqual(hidden);
      expect(telemetry.motion.paceLyPerSecond).toBe(0);
      expect(telemetry.flyby.elapsedSeconds).toBe(hiddenElapsed);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      advance(5000); expectSameView(scene.snapshot(), hidden);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(hiddenElapsed + 0.2, 10);
      intersect([{ isIntersecting: false }]);
      const offscreen = scene.snapshot(), offscreenElapsed = telemetry.flyby.elapsedSeconds;
      advance(5000); expect(scene.snapshot()).toEqual(offscreen);
      expect(telemetry.motion.paceLyPerSecond).toBe(0);
      expect(telemetry.flyby.elapsedSeconds).toBe(offscreenElapsed);
      intersect([{ isIntersecting: true }]);
      advance(5000); expectSameView(scene.snapshot(), offscreen);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(offscreenElapsed + 0.2, 10);
    } finally {
      if (originalObserver === undefined) delete window.IntersectionObserver;
      else window.IntersectionObserver = originalObserver;
    }
  });

  it('keeps moving during manual look and restores its authored gaze without moving a paused observer', () => {
    const route = launch(); advance(100); advance(100);
    scene.look(0.4, -0.15);
    const looked = scene.snapshot().state;
    advance(100); advance(100); publish();
    expect(telemetry.flyby).toMatchObject({ id: 'group', active: true, autoLook: false });
    expect(telemetry.running).toBe(true);
    expect(scene.snapshot().state.position).not.toEqual(looked.position);
    expect(scene.snapshot().state.yaw).toBe(looked.yaw);
    expect(scene.snapshot().state.pitch).toBe(looked.pitch);
    scene.set({ running: false });
    const before = scene.snapshot().state, elapsed = telemetry.flyby.elapsedSeconds;
    expect(scene.followFlybyView()).toBe(true);
    const followed = scene.snapshot().state;
    expect(followed.position).toEqual(before.position);
    expect(followed.distanceLy).toBe(before.distanceLy);
    expect(telemetry.flyby.elapsedSeconds).toBe(elapsed);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby.autoLook).toBe(true);
    expect([followed.yaw, followed.pitch]).not.toEqual([looked.yaw, looked.pitch]);
    expect(scene.frameTarget(route.targetId, 1 / 3)).toBe(true);
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: false });
    expect(telemetry.target.screen[0]).toBeCloseTo(1 / 3, 8);
    expect(scene.followFlybyView()).toBe(true);
    expect(scene.snapshot().state.yaw).toBe(followed.yaw);
    expect(scene.snapshot().state.pitch).toBe(followed.pitch);
    expect(scene.snapshot().state.position).toEqual(before.position);
  });

  it('ends the group route in place and hands control to free travel or another navigation action', () => {
    launch(); advance(100); advance(100);
    const saved = scene.snapshot();
    expect(scene.cancelFlyby()).toBe(true);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false, id: null });
    expect(telemetry.running).toBe(false);
    advance(5000); expect(scene.snapshot()).toEqual(saved);
    expect(scene.cancelFlyby()).toBe(false);
    expect(scene.followFlybyView()).toBe(false);
    scene.set({ speed: 100000, smoothTravel: false, running: true }); advance(); advance(100);
    expect(telemetry.motion.kind).toBe('free');
    expect(scene.snapshot().state.distanceLy).toBeCloseTo(saved.state.distanceLy + 10000, 7);
    expect(Math.hypot(...scene.snapshot().state.position.map((value, i) => value - saved.state.position[i]))).toBeCloseTo(10000, 7);
    const actions = [
      () => scene.restore(scene.snapshot()),
      () => scene.reset(),
      () => scene.selectTarget('golden-elliptical'),
      () => scene.nudge('right', 100000),
      () => scene.navigateTo('golden-elliptical'),
      () => scene.startOrbit('near-galaxy'),
      () => scene.set({ region: 'galaxy' }),
      () => scene.set({ mode: 'relativity' }),
    ];
    for (const action of actions) {
      launch(); advance(100); action();
      expect(telemetry.flyby).toMatchObject({ active: false, completed: false });
      expect(telemetry.motion.kind).not.toBe('flyby');
    }
    launch(); scene.selectTarget('near-galaxy');
    expect(telemetry.flyby.active).toBe(true);
  });

  it('rejects invalid and cross-region controls atomically, including lost, disposed and unavailable graphics', () => {
    expectAtomicRejection(() => scene.startFlyby('group'));
    for (const [region, id] of [['galaxy', 'halo'], ['neighborhood', 'nebula']]) {
      scene.set({ mode: 'explore', region });
      expect(scene.startFlyby(id)).toBe(true); advance(); advance(100);
      expectAtomicRejection(() => scene.startFlyby('group'));
      expect(telemetry.flyby.id).toBe(id);
    }
    scene.set({ mode: 'relativity', region: 'cosmic' });
    expectAtomicRejection(() => scene.startFlyby('group'));
    const route = launch();
    for (const id of ['halo', 'nebula', 'stellar', 'missing', '__proto__', null, undefined, 8]) expectAtomicRejection(() => scene.startFlyby(id));
    for (const id of ['arm', 'cluster', 'approach', 'filaments', 'violet', '__proto__', null, undefined, 8]) expectAtomicRejection(() => scene.seekFlybyHighlight(id));
    expectAtomicRejection(() => scene.navigateTo('missing'));
    expectAtomicRejection(() => scene.startOrbit('missing'));
    expectAtomicRejection(() => scene.selectTarget('missing'));
    expectAtomicRejection(() => scene.frameTarget('missing', 1 / 3));
    expectAtomicRejection(() => scene.nudge('missing', 100000));
    sceneCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    for (const action of [() => scene.startFlyby('group'), () => scene.seekFlybyHighlight(route.highlights[0].id), () => scene.cancelFlyby(), () => scene.followFlybyView()]) expectAtomicRejection(action);
    scene.dispose();
    for (const action of [() => scene.startFlyby('group'), () => scene.seekFlybyHighlight(route.highlights[0].id), () => scene.cancelFlyby(), () => scene.followFlybyView()]) expectAtomicRejection(action);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
    const unavailable = flight.create(canvas);
    unavailable.set({ mode: 'explore', region: 'cosmic' });
    const before = unavailable.snapshot();
    expect(unavailable.startFlyby('group')).toBe(false);
    expect(unavailable.seekFlybyHighlight(route.highlights[0].id)).toBe(false);
    expect(unavailable.cancelFlyby()).toBe(false);
    expect(unavailable.followFlybyView()).toBe(false);
    expect(unavailable.snapshot()).toEqual(before);
    unavailable.dispose();
  });

  it('jumps backward through the group highlights, clears framing, and resumes from the selected moment', () => {
    const route = launch(2), first = route.highlights[0], last = route.highlights.at(-1);
    scene.set({ fov: 91, exposure: 0.55, quality: 'low', beta: 0.73, compareRest: true, speed: 1234, smoothTravel: true });
    expect(scene.seekFlybyHighlight(last.id)).toBe(true);
    const later = scene.snapshot(), preferences = { ...later.settings };
    expect(scene.frameTarget(last.targetId, 1 / 3)).toBe(true);
    expect(telemetry.framing.canUndo).toBe(true);
    expect(scene.seekFlybyHighlight(first.id)).toBe(true);
    const earlier = scene.snapshot(), events = pauseEvents.length;
    expect(earlier.state.distanceLy).toBeLessThan(later.state.distanceLy);
    expect(earlier.state.position).not.toEqual(later.state.position);
    expect(earlier.settings).toEqual(preferences);
    expect(telemetry.flyby).toMatchObject({ active: true, completed: false, autoLook: true, elapsedSeconds: first.seconds, rate: 2 });
    expect(telemetry.target.id).toBe('near-galaxy');
    expect(telemetry.framing).toMatchObject({ canUndo: false, placement: null });
    expect(telemetry.cameraMoves).toBe(0);
    expect(telemetry.trail).toEqual([earlier.state.position]);
    advance(5000); expect(scene.snapshot()).toEqual(earlier);
    scene.set({ running: true }); advance(5000);
    expectSameView(scene.snapshot(), earlier);
    expect(publish().elapsedSeconds).toBe(first.seconds);
    advance(100);
    expect(publish().elapsedSeconds).toBeCloseTo(first.seconds + 0.2, 10);
    expect(scene.snapshot().state.distanceLy).toBeGreaterThan(earlier.state.distanceLy);
    expect(scene.snapshot().state.position).not.toEqual(earlier.state.position);
    expect(scene.snapshot().settings).toEqual(preferences);
    expect(pauseEvents).toHaveLength(events);
  });

  it('restores a detached version-one group highlight as an ordinary paused observation', () => {
    const route = launch(), highlight = route.highlights[1];
    expect(scene.seekFlybyHighlight(highlight.id)).toBe(true);
    const saved = scene.snapshot(), expected = structuredClone(saved);
    expect(saved.version).toBe(1);
    expect(Object.keys(saved).sort()).toEqual(['settings', 'state', 'targetId', 'version']);
    expect(Object.keys(saved.settings).sort()).toEqual(['beta', 'compareRest', 'exposure', 'fov', 'mode', 'quality', 'region']);
    expect(saved.settings.region).toBe('cosmic');
    expect(saved.targetId).toBe('golden-elliptical');
    saved.state.position[0] = 1e20; saved.settings.region = 'galaxy';
    expect(scene.snapshot()).toEqual(expected);
    expect(scene.restore(expected)).toBe(true);
    expectSameView(scene.snapshot(), expected);
    const restored = scene.snapshot();
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false, id: null });
    expectAtomicRejection(() => scene.seekFlybyHighlight(highlight.id));
    advance(5000); expect(scene.snapshot()).toEqual(restored);
    scene.set({ running: true, speed: 0 }); advance(); advance(100);
    expect(scene.snapshot()).toEqual(restored);
    expect(telemetry.motion.kind).toBe('free');
    expect(telemetry.flyby.active).toBe(false);
  });
});

describe('Universe flight Stellar close pass', () => {
  const endpoint = [7, 7, 48];
  const phases = ['depart', 'amber', 'to-blue', 'blue', 'to-pale', 'pale', 'reveal', 'complete'];

  function publish() {
    scene.set({ flybyRate: telemetry.flyby.rate });
    return telemetry.flyby;
  }

  function launch(rate = 1) {
    const route = flight.flybys('neighborhood').find(item => item.id === 'stellar');
    scene.set({ mode: 'explore', region: 'neighborhood', fov: route.fov, flybyRate: rate });
    expect(scene.startFlyby(route.id)).toBe(true);
    advance();
    return route;
  }

  function finish() {
    for (let step = 0; step < 2000 && telemetry.running; step++) advance(500);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby.completed).toBe(true);
    return scene.snapshot();
  }

  function expectSameView(actual, expected) {
    expect({ ...actual, state: { ...actual.state, yaw: 0 } }).toEqual({ ...expected, state: { ...expected.state, yaw: 0 } });
    expect(Math.sin(actual.state.yaw)).toBeCloseTo(Math.sin(expected.state.yaw), 12);
    expect(Math.cos(actual.state.yaw)).toBeCloseTo(Math.cos(expected.state.yaw), 12);
  }

  function expectAtomicRejection(action) {
    const saved = scene.snapshot(), published = structuredClone(telemetry);
    const scheduled = [...frames.keys()], events = pauseEvents.length;
    expect(action()).toBe(false);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry).toEqual(published);
    expect([...frames.keys()]).toEqual(scheduled);
    expect(pauseEvents).toHaveLength(events);
  }

  it('launches beside the existing model stars with fresh clocks and retained view preferences', () => {
    const route = flight.flybys('neighborhood').find(item => item.id === 'stellar');
    expect(route).toMatchObject({
      id: 'stellar', name: 'Stellar close pass', region: 'neighborhood', durationSeconds: 46,
      position: [-7, 4, -2], aim: [-3.1, 1, 8.5], fov: 62, targetId: 'amber-star',
    });
    expect(route.highlights.map(({ id, seconds, targetId }) => ({ id, seconds, targetId }))).toEqual([
      { id: 'amber', seconds: 10, targetId: 'amber-star' },
      { id: 'blue', seconds: 24, targetId: 'blue-star' },
      { id: 'pale', seconds: 38, targetId: 'pale-star' },
    ]);
    scene.set({ mode: 'relativity', beta: 0.97, timeScale: 20 });
    scene.set({ running: true });
    advance(); advance(100);
    expect(scene.snapshot().state.universeYears).toBeGreaterThan(0);
    scene.set({ mode: 'explore', exposure: 0.63, quality: 'low', compareRest: true });
    scene.nudge('right', 3); scene.frameTarget('amber-star', 1 / 3);
    launch(2);
    const saved = scene.snapshot();
    expect(telemetry.flyby).toMatchObject({ id: route.id, active: true, completed: false, autoLook: true, elapsedSeconds: 0, progress: 0, rate: 2, phase: 'depart' });
    expect(saved.state).toMatchObject({ position: route.position, distanceLy: 0, universeYears: 0, travelerYears: 0 });
    expect(saved.settings).toMatchObject({ mode: 'explore', region: 'neighborhood', fov: 62, beta: 0.97, exposure: 0.63, quality: 'low', compareRest: true });
    expect(telemetry.target.id).toBe('amber-star');
    expect(telemetry.navigation.active).toBe(false); expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.framing.canUndo).toBe(false); expect(telemetry.cameraMoves).toBe(0);
    expect(telemetry.trail).toEqual([route.position]);
    scene.set({ ...saved.settings, running: true, speed: 1e10, smoothTravel: true, flybyRate: 2 });
    expectSameView(scene.snapshot(), saved);
    advance(100); expect(publish().elapsedSeconds).toBeCloseTo(0.2, 10);
  });

  it('passes all three viewing radii on a finite curved course and pauses exactly once beyond the stars', () => {
    const route = launch(), start = scene.snapshot().state.position;
    const stars = flight.landmarks('neighborhood').filter(item => ['amber-star', 'blue-star', 'pale-star'].includes(item.id));
    const positions = [start], visited = [telemetry.flyby.phase];
    let previousDistance = 0, previousProgress = 0, previousPhase = 0;
    pauses.length = 0; pauseEvents.length = 0;
    for (let frame = 0; frame < 600 && telemetry.running; frame++) {
      advance(100); publish();
      const state = scene.snapshot().state;
      expect([...state.position, state.yaw, state.pitch, state.distanceLy, telemetry.motion.paceLyPerSecond].every(Number.isFinite)).toBe(true);
      expect(state.distanceLy).toBeGreaterThanOrEqual(previousDistance);
      expect(telemetry.flyby.progress).toBeGreaterThanOrEqual(previousProgress);
      expect(telemetry.flyby.progress).toBeLessThanOrEqual(1);
      previousDistance = state.distanceLy; previousProgress = telemetry.flyby.progress;
      expect(state.universeYears).toBe(0); expect(state.travelerYears).toBe(0);
      const phase = phases.indexOf(telemetry.flyby.phase);
      expect(phase).toBeGreaterThanOrEqual(previousPhase); previousPhase = phase;
      if (visited.at(-1) !== telemetry.flyby.phase) visited.push(telemetry.flyby.phase);
      positions.push(state.position);
    }
    const end = scene.snapshot();
    expect(visited).toEqual(phases);
    expect(telemetry.flyby).toMatchObject({ id: 'stellar', active: false, completed: true, progress: 1, elapsedSeconds: 46, phase: 'complete' });
    expect(end.state.position).toEqual(endpoint); expect(end.targetId).toBe('pale-star');
    const closest = stars.map(star => Math.min(...positions.map(position => Math.hypot(...position.map((value, i) => value - star.position[i])))));
    // These are camera viewing clearances in the generated teaching scene,
    // rather than physical star radii or a spacecraft collision model.
    closest.forEach((gap, i) => expect(gap).toBeGreaterThan(stars[i].arrivalRadiusLy));
    expect(closest[0]).toBeLessThan(0.76); expect(closest[1]).toBeLessThan(0.96); expect(closest[2]).toBeLessThan(1.16);
    const line = endpoint.map((value, i) => value - start[i]), length = Math.hypot(...line), unit = line.map(value => value / length);
    const deviation = positions.map(position => {
      const offset = position.map((value, i) => value - start[i]);
      const along = offset.reduce((sum, value, i) => sum + value * unit[i], 0);
      return Math.hypot(...offset.map((value, i) => value - along * unit[i]));
    });
    expect(Math.max(...deviation)).toBeGreaterThan(5);
    expect(end.state.distanceLy).toBeGreaterThan(length * 1.2);
    const chords = positions.slice(1).map((position, i) => Math.hypot(...position.map((value, j) => value - positions[i][j])));
    expect(Math.max(...chords)).toBeLessThan(0.7);
    expect(pauseEvents).toEqual([[expect.any(String), {
      kind: 'flyby', region: 'neighborhood', mode: 'explore', position: endpoint,
      targetId: 'pale-star', targetName: stars[2].name, routeId: route.id, routeName: route.name,
    }]]);
    advance(5000); expect(scene.snapshot()).toEqual(end); expect(pauses).toHaveLength(1);
  });

  it('keeps camera pacing independent of physical settings and frame subdivision', () => {
    const partial = [];
    for (const [rate, interval] of [[0.25, 100], [1, 100], [4, 100], [1, 25]]) {
      launch(rate); scene.set({ speed: 1e10, timeScale: 1e10, beta: 0.9999, smoothTravel: true });
      for (let elapsed = 0; elapsed < 1000; elapsed += interval) advance(interval);
      scene.set({ running: false });
      expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(rate, 10);
      expect(telemetry.flyby.progress).toBeCloseTo(rate / 46, 10);
      expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
      partial.push(scene.snapshot().state);
    }
    partial[3].position.forEach((value, i) => expect(value).toBeCloseTo(partial[1].position[i], 9));
    expect(partial[3].distanceLy).toBeCloseTo(partial[1].distanceLy, 9);
    expect(partial[0].position).not.toEqual(partial[1].position); expect(partial[2].position).not.toEqual(partial[1].position);
    launch(4); const fast = finish();
    launch(0.5); const slow = finish();
    expect(slow.state.position).toEqual(fast.state.position);
    expect(slow.state.distanceLy).toBe(fast.state.distanceLy); expect(slow.targetId).toBe('pale-star');
  });

  it('freezes the blue pass while paused, hidden or offscreen and excludes suspended wall time', () => {
    let intersect;
    const originalObserver = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(callback) { intersect = callback; }
      observe() {}
      disconnect() {}
    };
    try {
      scene.dispose();
      scene = flight.create(sceneCanvas, { onTelemetry: value => { telemetry = value; }, onPause: (...args) => { pauses.push(args[0]); pauseEvents.push(args); } });
      launch(2); expect(scene.seekFlybyHighlight('blue')).toBe(true);
      const paused = scene.snapshot(), elapsed = telemetry.flyby.elapsedSeconds, events = pauseEvents.length;
      advance(5000); expect(scene.snapshot()).toEqual(paused);
      scene.set({ running: true }); advance(5000);
      expectSameView(scene.snapshot(), paused); expect(publish().elapsedSeconds).toBe(elapsed);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(elapsed + 0.2, 10);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      const hidden = scene.snapshot(), hiddenElapsed = telemetry.flyby.elapsedSeconds;
      advance(5000); expect(scene.snapshot()).toEqual(hidden); expect(telemetry.motion.paceLyPerSecond).toBe(0);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      advance(5000); expectSameView(scene.snapshot(), hidden);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(hiddenElapsed + 0.2, 10);
      intersect([{ isIntersecting: false }]);
      const offscreen = scene.snapshot(), offscreenElapsed = telemetry.flyby.elapsedSeconds;
      advance(5000); expect(scene.snapshot()).toEqual(offscreen); expect(telemetry.motion.paceLyPerSecond).toBe(0);
      intersect([{ isIntersecting: true }]);
      advance(5000); expectSameView(scene.snapshot(), offscreen);
      advance(100); expect(publish().elapsedSeconds).toBeCloseTo(offscreenElapsed + 0.2, 10);
      expect(pauseEvents).toHaveLength(events);
    } finally {
      if (originalObserver === undefined) delete window.IntersectionObserver;
      else window.IntersectionObserver = originalObserver;
    }
  });

  it('allows free gaze during a close pass and restores the paused route view without moving', () => {
    launch(); expect(scene.seekFlybyHighlight('blue')).toBe(true);
    const authored = scene.snapshot();
    scene.look(0.45, -0.16); publish();
    const looked = scene.snapshot();
    expect(telemetry.flyby.autoLook).toBe(false);
    expect(scene.followFlybyView()).toBe(true); expectSameView(scene.snapshot(), authored);
    scene.look(0.45, -0.16); scene.set({ running: true }); advance(); advance(100);
    expect(telemetry.running).toBe(true); expect(telemetry.flyby.autoLook).toBe(false);
    expect(scene.snapshot().state.position).not.toEqual(looked.state.position);
    expect(Math.sin(scene.snapshot().state.yaw)).toBeCloseTo(Math.sin(looked.state.yaw), 12);
    expect(Math.cos(scene.snapshot().state.yaw)).toBeCloseTo(Math.cos(looked.state.yaw), 12);
    expect(scene.snapshot().state.pitch).toBe(looked.state.pitch);
    scene.set({ running: false });
    const before = scene.snapshot(), elapsed = telemetry.flyby.elapsedSeconds;
    expect(scene.followFlybyView()).toBe(true);
    const followed = scene.snapshot();
    expect(followed.state.position).toEqual(before.state.position); expect(followed.state.distanceLy).toBe(before.state.distanceLy);
    expect(telemetry.flyby.elapsedSeconds).toBe(elapsed); expect(telemetry.running).toBe(false);
    expect(scene.frameTarget('blue-star', 1 / 3)).toBe(true);
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: false });
    expect(telemetry.target.screen[0]).toBeCloseTo(1 / 3, 8);
    expect(scene.followFlybyView()).toBe(true); expectSameView(scene.snapshot(), followed);
  });

  it('rejects invalid and incompatible Stellar controls atomically, including unavailable graphics', () => {
    for (const [region, id] of [['galaxy', 'halo'], ['cosmic', 'group']]) {
      scene.set({ mode: 'explore', region });
      expect(scene.startFlyby(id)).toBe(true); advance(); advance(100);
      expectAtomicRejection(() => scene.startFlyby('stellar'));
      expect(telemetry.flyby.id).toBe(id);
    }
    scene.set({ mode: 'relativity', region: 'neighborhood' });
    expectAtomicRejection(() => scene.startFlyby('stellar'));
    const route = launch();
    for (const id of ['halo', 'group', 'missing', '__proto__', null, undefined, 8]) expectAtomicRejection(() => scene.startFlyby(id));
    for (const id of ['arm', 'cluster', 'panorama', 'approach', 'filaments', 'violet', 'elliptical', '__proto__', null, undefined, 8]) expectAtomicRejection(() => scene.seekFlybyHighlight(id));
    sceneCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    for (const action of [() => scene.startFlyby('stellar'), () => scene.seekFlybyHighlight('blue'), () => scene.cancelFlyby(), () => scene.followFlybyView()]) expectAtomicRejection(action);
    scene.dispose();
    for (const action of [() => scene.startFlyby('stellar'), () => scene.seekFlybyHighlight('blue'), () => scene.cancelFlyby(), () => scene.followFlybyView()]) expectAtomicRejection(action);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
    const unavailable = flight.create(canvas);
    unavailable.set({ mode: 'explore', region: route.region });
    const before = unavailable.snapshot();
    expect(unavailable.startFlyby('stellar')).toBe(false); expect(unavailable.seekFlybyHighlight('blue')).toBe(false);
    expect(unavailable.cancelFlyby()).toBe(false); expect(unavailable.followFlybyView()).toBe(false);
    expect(unavailable.snapshot()).toEqual(before); unavailable.dispose();
  });

  it('restores a detached version-one star observation and supports native orbit without new graphics resources', () => {
    const textures = createdTextures.slice(), uploads = textureUploads.length, creates = { ...graphicsCreates };
    launch(); expect(scene.seekFlybyHighlight('pale')).toBe(true);
    const saved = scene.snapshot(), expected = structuredClone(saved);
    expect(saved.version).toBe(1);
    expect(Object.keys(saved).sort()).toEqual(['settings', 'state', 'targetId', 'version']);
    expect(Object.keys(saved.settings).sort()).toEqual(['beta', 'compareRest', 'exposure', 'fov', 'mode', 'quality', 'region']);
    expect(saved.targetId).toBe('pale-star'); expect(saved.settings.region).toBe('neighborhood');
    saved.state.position[0] = 1e20; saved.settings.region = 'cosmic';
    expect(scene.snapshot()).toEqual(expected);
    expect(scene.restore(expected)).toBe(true); expectSameView(scene.snapshot(), expected);
    expect(telemetry.running).toBe(false); expect(telemetry.flyby).toMatchObject({ active: false, completed: false, id: null });
    expectAtomicRejection(() => scene.seekFlybyHighlight('pale'));
    const restored = scene.snapshot(); advance(5000); expect(scene.snapshot()).toEqual(restored);
    expect(scene.focusTarget('pale-star')).toBe(true);
    expect(telemetry.target.screen[0]).toBeCloseTo(0.5, 10); expect(telemetry.target.screen[1]).toBeCloseTo(0.5, 10);
    const radius = telemetry.target.distanceLy;
    expect(scene.startOrbit('pale-star')).toBe(true); advance(); advance(100);
    expect(telemetry.orbit.active).toBe(true); expect(scene.snapshot().state.position).not.toEqual(restored.state.position);
    expect(telemetry.target.distanceLy).toBeCloseTo(radius, 10);
    expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
    expect(createdTextures).toEqual(textures); expect(textureUploads).toHaveLength(uploads); expect(graphicsCreates).toEqual(creates);
  });
});

describe('Universe flight scenic highlights', () => {
  function routeMetadata(id) {
    return flight.flybys().find(route => route.id === id);
  }

  function publish() {
    scene.set({ flybyRate: telemetry.flyby.rate });
    return telemetry.flyby;
  }

  function launch(id, rate = 1) {
    const route = routeMetadata(id);
    scene.set({ mode: 'explore', region: route.region, flybyRate: rate });
    expect(scene.startFlyby(id)).toBe(true);
    advance();
    return route;
  }

  function advanceRoute(seconds) {
    let remaining = seconds * 1000;
    while (remaining > 0) {
      const step = Math.min(500, remaining);
      advance(step);
      remaining -= step;
    }
    publish();
  }

  function finish() {
    for (let frame = 0; frame < 1000 && telemetry.running; frame++) advance(500);
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby.completed).toBe(true);
    return scene.snapshot();
  }

  function expectAtomicRejection(id) {
    const saved = scene.snapshot(), published = structuredClone(telemetry);
    const scheduled = [...frames.keys()], events = pauseEvents.length;
    expect(scene.seekFlybyHighlight(id)).toBe(false);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry).toEqual(published);
    expect([...frames.keys()]).toEqual(scheduled);
    expect(pauseEvents).toHaveLength(events);
  }

  function expectSameView(actual, expected) {
    // Resume and restore use the established 0–2π yaw normalization. Compare
    // the actual sightline while keeping every other snapshot field exact.
    expect({ ...actual, state: { ...actual.state, yaw: 0 } }).toEqual({ ...expected, state: { ...expected.state, yaw: 0 } });
    expect(Math.sin(actual.state.yaw)).toBeCloseTo(Math.sin(expected.state.yaw), 12);
    expect(Math.cos(actual.state.yaw)).toBeCloseTo(Math.cos(expected.state.yaw), 12);
  }

  it('exports named ordered highlights as detached route metadata', () => {
    const routes = flight.flybys(), original = structuredClone(routes);
    expect(routes.map(route => route.highlights.map(highlight => highlight.id))).toEqual([
      ['arm', 'cluster', 'panorama'], ['approach', 'filaments', 'violet'], ['spiral', 'elliptical', 'panorama'],
      ['amber', 'blue', 'pale'],
    ]);
    expect(routes.map(route => route.highlights.map(highlight => highlight.targetId))).toEqual([
      ['galactic-center', 'halo-cluster-2', 'galactic-center'],
      ['blue-nebula', 'blue-nebula', 'violet-nebula'],
      ['near-galaxy', 'golden-elliptical', 'golden-elliptical'],
      ['amber-star', 'blue-star', 'pale-star'],
    ]);
    for (const route of routes) {
      let previous = 0;
      expect(new Set(route.highlights.map(highlight => highlight.id)).size).toBe(route.highlights.length);
      for (const highlight of route.highlights) {
        expect(Object.keys(highlight).sort()).toEqual(['description', 'id', 'name', 'seconds', 'targetId']);
        expect(typeof highlight.name).toBe('string');
        expect(highlight.name.trim().length).toBeGreaterThan(0);
        expect(typeof highlight.description).toBe('string');
        expect(highlight.description.trim().length).toBeGreaterThan(0);
        expect(Number.isFinite(highlight.seconds)).toBe(true);
        expect(highlight.seconds).toBeGreaterThan(previous);
        expect(highlight.seconds).toBeLessThan(route.durationSeconds);
        expect(flight.landmarks(route.region).some(item => item.id === highlight.targetId)).toBe(true);
        previous = highlight.seconds;
        highlight.targetId = 'changed';
        highlight.id = 'changed'; highlight.name = 'Changed';
        highlight.description = 'Changed'; highlight.seconds = 1e20;
      }
      route.highlights.push({ id: 'extra', name: 'Extra', seconds: 1, description: 'Changed' });
    }
    expect(flight.flybys()).toEqual(original);
    const regional = flight.flybys('galaxy');
    regional[0].highlights.splice(0);
    expect(flight.flybys()).toEqual(original);
    expect(flight.flybys('galaxy')).toEqual(original.filter(route => route.region === 'galaxy'));
  });

  for (const routeId of ['halo', 'nebula', 'group', 'stellar']) {
    it(`jumps to every ${routeId} highlight with the naturally sampled pose and one pause event`, () => {
      for (const highlight of routeMetadata(routeId).highlights) {
        const route = launch(routeId);
        advanceRoute(highlight.seconds);
        scene.set({ running: false });
        expect(scene.followFlybyView()).toBe(true);
        const expected = scene.snapshot().state, phase = telemetry.flyby.phase;

        launch(routeId); advance(100);
        scene.look(0.7, -0.2);
        pauses.length = 0; pauseEvents.length = 0;
        expect(scene.seekFlybyHighlight(highlight.id)).toBe(true);
        const actual = scene.snapshot().state;
        expect(scene.snapshot().targetId).toBe(highlight.targetId);
        expect(telemetry.target.id).toBe(highlight.targetId);
        const landmark = flight.landmarks(route.region).find(item => item.id === highlight.targetId);
        expect(telemetry.target.distanceLy).toBeCloseTo(Math.hypot(...landmark.position.map((value, index) => value - actual.position[index])), 8);
        actual.position.forEach((value, index) => expect(value).toBeCloseTo(expected.position[index], 8));
        expect(actual.distanceLy).toBeCloseTo(expected.distanceLy, 7);
        expect(Math.sin(actual.yaw)).toBeCloseTo(Math.sin(expected.yaw), 10);
        expect(Math.cos(actual.yaw)).toBeCloseTo(Math.cos(expected.yaw), 10);
        expect(actual.pitch).toBeCloseTo(expected.pitch, 10);
        expect(actual.universeYears).toBe(0); expect(actual.travelerYears).toBe(0);
        expect(telemetry.running).toBe(false);
        expect(telemetry.flyby).toMatchObject({
          active: true, completed: false, id: routeId, autoLook: true, phase,
          elapsedSeconds: highlight.seconds, progress: highlight.seconds / route.durationSeconds,
        });
        expect(telemetry.motion).toMatchObject({ kind: 'flyby', paceLyPerSecond: 0 });
        expect(pauseEvents).toHaveLength(1);
        expect(pauseEvents[0][0]).toMatch(/paused/i);
        expect(pauseEvents[0][1]).toMatchObject({
          kind: 'flyby-highlight',
          routeId, routeName: route.name, highlightId: highlight.id, highlightName: highlight.name,
          targetId: highlight.targetId, targetName: telemetry.target.name, position: actual.position,
        });
        advance(5000);
        expect(scene.snapshot().state).toEqual(actual);
        expect(pauseEvents).toHaveLength(1);
      }
    });
  }

  it('moves backward through route distance, preserves view preferences, and clears previous framing', () => {
    const route = launch('halo', 2), [first, , last] = route.highlights;
    scene.set({ fov: 91, exposure: 0.55, quality: 'low', beta: 0.73, compareRest: true, speed: 1234, smoothTravel: true });
    expect(scene.seekFlybyHighlight(last.id)).toBe(true);
    const later = scene.snapshot(), preferences = { ...later.settings };
    expect(scene.frameTarget(last.targetId, 1 / 3)).toBe(true);
    expect(telemetry.framing.canUndo).toBe(true);
    expect(telemetry.flyby.autoLook).toBe(false);
    expect(scene.seekFlybyHighlight(first.id)).toBe(true);
    expect(scene.snapshot().state.distanceLy).toBeLessThan(later.state.distanceLy);
    expect(scene.snapshot().state.position).not.toEqual(later.state.position);
    expect(scene.snapshot().settings).toEqual(preferences);
    expect(telemetry.flyby).toMatchObject({ active: true, autoLook: true, elapsedSeconds: first.seconds, rate: 2 });
    expect(telemetry.framing).toMatchObject({ canUndo: false, placement: null });
    expect(telemetry.cameraMoves).toBe(0);
    expect(telemetry.trail).toEqual([scene.snapshot().state.position]);
    expect(telemetry.motion.smoothTravel).toBe(true);
    expect(scene.cancelFlyby()).toBe(true);
    scene.set({ running: true }); advance(); advance(100);
    expect(telemetry.motion.targetLyPerSecond).toBe(1234);
  });

  it('resumes from the paused highlight with its retained rate and without counting a hidden frame gap', () => {
    const route = launch('nebula', 2), highlight = route.highlights[1];
    expect(scene.seekFlybyHighlight(highlight.id)).toBe(true);
    const paused = scene.snapshot(), events = pauseEvents.length;
    advance(5000);
    expect(scene.snapshot()).toEqual(paused);
    expect(telemetry.flyby.elapsedSeconds).toBe(highlight.seconds);
    scene.set({ running: true }); advance(5000);
    expectSameView(scene.snapshot(), paused);
    expect(publish().elapsedSeconds).toBe(highlight.seconds);
    advance(100);
    expect(publish().elapsedSeconds).toBeCloseTo(highlight.seconds + 0.2, 10);
    expect(scene.snapshot().state.distanceLy).toBeGreaterThan(paused.state.distanceLy);
    expect(scene.snapshot().state.position).not.toEqual(paused.state.position);
    expect(telemetry.flyby.active).toBe(true);
    expect(telemetry.universeYears).toBe(0); expect(telemetry.travelerYears).toBe(0);
    expect(pauseEvents).toHaveLength(events);
  });

  it('revisits completed routes and produces one new completion only after each resumed leg', () => {
    for (const routeId of ['halo', 'nebula', 'group', 'stellar']) {
      const route = launch(routeId, 4), completed = finish();
      const previousCompletions = pauseEvents.filter(([, detail]) => detail?.kind === 'flyby').length;
      for (const highlight of [route.highlights[1], route.highlights[0]]) {
        expect(scene.seekFlybyHighlight(highlight.id)).toBe(true);
        expect(scene.snapshot().targetId).toBe(highlight.targetId);
        expect(telemetry.target.id).toBe(highlight.targetId);
        expect(telemetry.flyby).toMatchObject({ active: true, completed: false, elapsedSeconds: highlight.seconds });
        expect(scene.snapshot().state.distanceLy).toBeLessThan(completed.state.distanceLy);
        const paused = scene.snapshot();
        advance(5000); expect(scene.snapshot()).toEqual(paused);
        scene.set({ running: true }); advance(); finish();
        expect(scene.snapshot().state.position).toEqual(completed.state.position);
        expect(scene.snapshot().state.distanceLy).toBe(completed.state.distanceLy);
        expect(scene.snapshot().targetId).toBe(completed.targetId);
      }
      expect(pauseEvents.filter(([, detail]) => detail?.kind === 'flyby')).toHaveLength(previousCompletions + 2);
      const events = pauseEvents.length;
      advance(5000); expect(pauseEvents).toHaveLength(events);
    }
  });

  it('rejects inactive, invalid, cross-route, physical, lost, and disposed jumps atomically', () => {
    expectAtomicRejection('arm');
    launch('halo'); advance(100);
    for (const id of ['missing', 'approach', 'filaments', 'violet', '__proto__', null, undefined, 8]) expectAtomicRejection(id);
    scene.set({ mode: 'relativity' }); expectAtomicRejection('arm');
    scene.set({ mode: 'explore', region: 'cosmic' }); expectAtomicRejection('arm');
    launch('nebula');
    for (const id of ['arm', 'cluster', 'panorama']) expectAtomicRejection(id);
    sceneCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expectAtomicRejection('filaments');
    scene.dispose(); expectAtomicRejection('filaments');
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
    const unavailable = flight.create(canvas);
    const before = unavailable.snapshot();
    expect(unavailable.seekFlybyHighlight('approach')).toBe(false);
    expect(unavailable.snapshot()).toEqual(before);
    unavailable.dispose();
  });

  it('restores a saved highlight as an ordinary paused observation without retaining its route', () => {
    const route = launch('halo'), highlight = route.highlights[1];
    expect(scene.seekFlybyHighlight(highlight.id)).toBe(true);
    const saved = scene.snapshot(), expected = structuredClone(saved);
    expect(saved.version).toBe(1);
    expect(Object.keys(saved).sort()).toEqual(['settings', 'state', 'targetId', 'version']);
    saved.state.position[0] = 1e20;
    expect(scene.snapshot()).toEqual(expected);
    expect(scene.restore(expected)).toBe(true);
    expectSameView(scene.snapshot(), expected);
    const restored = scene.snapshot();
    expect(telemetry.running).toBe(false);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false, id: null });
    expectAtomicRejection(highlight.id);
    advance(5000); expect(scene.snapshot()).toEqual(restored);
    scene.set({ running: true, speed: 0 }); advance(); advance(100);
    expect(scene.snapshot()).toEqual(restored);
    expect(telemetry.motion.kind).toBe('free');
    expect(telemetry.flyby.active).toBe(false);
  });

  it('reuses all scene graphics resources through repeated jumps, resumes, and completed revisits', () => {
    const textures = createdTextures.slice(), uploads = textureUploads.length;
    const creates = { ...graphicsCreates }, deletions = deletedTextures.length;
    for (const routeId of ['halo', 'nebula', 'group', 'stellar']) {
      const route = launch(routeId, 4);
      for (const highlight of route.highlights) {
        expect(scene.seekFlybyHighlight(highlight.id)).toBe(true);
        advance();
        scene.set({ running: true }); advance(); advance(100);
        expect(createdTextures).toEqual(textures);
        expect(textureUploads).toHaveLength(uploads);
        expect(graphicsCreates).toEqual(creates);
        expect(deletedTextures).toHaveLength(deletions);
      }
      finish();
      expect(scene.seekFlybyHighlight(route.highlights[0].id)).toBe(true);
      advance();
      expect(createdTextures).toEqual(textures);
      expect(textureUploads).toHaveLength(uploads);
      expect(graphicsCreates).toEqual(creates);
      expect(deletedTextures).toHaveLength(deletions);
    }
  });
});

describe('Universe flyby automatic highlight stops', () => {
  function launch(id, enabled = true) {
    const route = flight.flybys().find(item => item.id === id);
    scene.set({ mode: 'explore', region: route.region, pauseAtHighlights: enabled });
    expect(scene.startFlyby(id)).toBe(true);
    advance();
    return route;
  }

  function cross(seconds, rate = 1) {
    scene.seekFlyby(seconds - 0.01);
    scene.set({ running: true, flybyRate: rate });
    advance();
    advance(500);
  }

  for (const id of ['halo', 'nebula', 'group', 'stellar']) {
    it(`stops at every ${id} highlight exactly, across all supported engine paces`, () => {
      const route = launch(id), allocations = { ...graphicsCreates };
      for (const rate of [0.25, 0.5, 1, 2, 4]) {
        for (const [index, highlight] of route.highlights.entries()) {
          scene.seekFlybyHighlight(highlight.id);
          const expected = scene.snapshot();
          cross(highlight.seconds, rate);
          expect(scene.snapshot()).toEqual(expected);
          expect(telemetry).toMatchObject({ running: false, motion: { paceLyPerSecond: 0 }, flyby: { active: true, completed: false, elapsedSeconds: highlight.seconds, pauseAtHighlights: true, rate } });
          expect(pauseEvents.at(-1)[1]).toMatchObject({ kind: 'flyby-stop', region: route.region, mode: 'explore', routeId: id, highlightId: highlight.id, targetId: highlight.targetId, seconds: highlight.seconds, stopIndex: index + 1, stopCount: 3 });
          const eventCount = pauseEvents.length;
          advance(60000);
          expect(scene.snapshot()).toEqual(expected);
          expect(pauseEvents).toHaveLength(eventCount);
          scene.set({ running: true }); advance(); advance(300);
          expect(telemetry.running).toBe(true);
          expect(telemetry.flyby.elapsedSeconds).toBeGreaterThan(highlight.seconds);
          expect(pauseEvents).toHaveLength(eventCount);
        }
      }
      expect(graphicsCreates).toEqual(allocations);
      expect(scene.snapshot().state.universeYears).toBe(0);
      expect(scene.snapshot().state.travelerYears).toBe(0);
    });
  }

  it('preserves manual gaze and display settings at an automatic stop', () => {
    const route = launch('stellar'), highlight = route.highlights[1];
    scene.seekFlyby(highlight.seconds - 0.01);
    scene.look(0.7, -0.1);
    scene.set({ fov: 37, exposure: 0.61 });
    const before = scene.snapshot();
    scene.set({ running: true }); advance(); advance(500);
    const after = scene.snapshot();
    expect(after.state.yaw).toBe(before.state.yaw);
    expect(after.state.pitch).toBe(before.state.pitch);
    expect(after.settings).toEqual(before.settings);
    expect(telemetry.flyby.autoLook).toBe(false);
    expect(telemetry.flyby.elapsedSeconds).toBe(highlight.seconds);
    expect(after.targetId).toBe(highlight.targetId);
  });

  it('keeps continuous playback by default and applies the setting immediately', () => {
    const route = launch('nebula', false), highlight = route.highlights[0];
    cross(highlight.seconds, 2);
    expect(telemetry.running).toBe(true);
    expect(telemetry.flyby.elapsedSeconds).toBeGreaterThan(highlight.seconds);
    scene.set({ pauseAtHighlights: true });
    expect(telemetry.flyby.pauseAtHighlights).toBe(true);
    cross(highlight.seconds, 2);
    expect(telemetry.running).toBe(false);
    scene.seekFlyby(highlight.seconds - 0.01);
    scene.set({ pauseAtHighlights: false, running: true }); advance(); advance(500);
    expect(telemetry.running).toBe(true);
  });

  it('honors forward seeks, revisits backward seeks, and completes once after the last stop', () => {
    const route = launch('halo');
    cross(route.highlights[2].seconds);
    expect(pauseEvents.filter(([,e]) => e?.kind === 'flyby-stop').map(([,e]) => e.highlightId)).toEqual([route.highlights[2].id]);
    cross(route.highlights[0].seconds);
    expect(pauseEvents.at(-1)[1].highlightId).toBe(route.highlights[0].id);
    scene.seekFlyby(route.durationSeconds - 0.01);
    scene.set({ running: true }); advance(); advance(500);
    expect(telemetry.flyby.completed).toBe(true);
    expect(pauseEvents.filter(([,e]) => e?.kind === 'flyby')).toHaveLength(1);
    advance(1000);
    expect(pauseEvents.filter(([,e]) => e?.kind === 'flyby')).toHaveLength(1);
    scene.startFlyby('halo');
    expect(telemetry.flyby.pauseAtHighlights).toBe(true);
    cross(route.highlights[0].seconds);
    expect(pauseEvents.at(-1)[1].highlightId).toBe(route.highlights[0].id);
  });

  it('does not trigger a stop while hidden or after a route is canceled', () => {
    const route = launch('group'), highlight = route.highlights[0];
    scene.seekFlyby(highlight.seconds - 0.01);
    scene.set({ running: true }); advance();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange')); advance(60000);
    expect(telemetry.flyby.elapsedSeconds).toBe(highlight.seconds - 0.01);
    expect(pauseEvents.filter(([,e]) => e?.kind === 'flyby-stop')).toHaveLength(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange')); advance(); advance(500);
    expect(pauseEvents.filter(([,e]) => e?.kind === 'flyby-stop')).toHaveLength(1);
    scene.cancelFlyby(); scene.set({ running: true }); advance(); advance(500);
    expect(pauseEvents.filter(([,e]) => e?.kind === 'flyby-stop')).toHaveLength(1);
  });
});

describe('Universe flight continuous route timeline', () => {
  function launch(id, rate = 1) {
    const route = flight.flybys().find(item => item.id === id);
    scene.set({ mode: 'explore', region: route.region, flybyRate: rate });
    expect(scene.startFlyby(id)).toBe(true);
    advance();
    return route;
  }

  function reject(value) {
    const saved = scene.snapshot(), info = structuredClone(telemetry);
    const scheduled = [...frames.keys()], events = pauseEvents.length;
    expect(scene.seekFlyby(value)).toBe(false);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry).toEqual(info);
    expect([...frames.keys()]).toEqual(scheduled);
    expect(pauseEvents).toHaveLength(events);
  }

  for (const id of ['halo', 'nebula', 'group', 'stellar']) {
    it(`seeks forward and backward to arbitrary ${id} moments on the authored route`, () => {
      const route = launch(id);
      for (const seconds of [13.7, 3.2, route.durationSeconds - 0.1]) {
        launch(id);
        for (let tick = 0; tick < Math.round(seconds * 10); tick++) advance(100);
        scene.set({ running: false });
        scene.followFlybyView();
        const expected = scene.snapshot().state;
        scene.look(0.6, -0.2);
        const eventCount = pauseEvents.length;
        expect(scene.seekFlyby(seconds)).toBe(true);
        const actual = scene.snapshot().state;
        actual.position.forEach((value, index) => expect(value).toBeCloseTo(expected.position[index], 6));
        expect(actual.distanceLy).toBeCloseTo(expected.distanceLy, 6);
        expect(Math.sin(actual.yaw)).toBeCloseTo(Math.sin(expected.yaw), 10);
        expect(Math.cos(actual.yaw)).toBeCloseTo(Math.cos(expected.yaw), 10);
        expect(actual.pitch).toBeCloseTo(expected.pitch, 10);
        expect([actual.universeYears, actual.travelerYears]).toEqual([0, 0]);
        expect(telemetry).toMatchObject({ running: false, flyby: { id, active: true, completed: false, autoLook: true, elapsedSeconds: seconds } });
        expect(pauseEvents).toHaveLength(eventCount + 1);
        expect(pauseEvents.at(-1)[1]).toMatchObject({ kind: 'flyby-moment', routeId: id, seconds });
        const paused = scene.snapshot();
        advance(10000);
        expect(scene.snapshot()).toEqual(paused);
        expect(frames.size).toBe(0);
      }
    });
  }

  it('retains the lens and pace, reuses graphics, and resumes without counting a paused gap', () => {
    const route = launch('nebula', 2);
    scene.set({ fov: 43, exposure: 0.72, quality: 'low', speed: 17 });
    const settings = scene.snapshot().settings, textures = createdTextures.slice();
    const uploads = textureUploads.length, creates = { ...graphicsCreates };
    for (const seconds of [7.4, 24.6, 12.8]) {
      expect(scene.seekFlyby(seconds)).toBe(true);
      advance();
      expect(scene.snapshot().settings).toEqual(settings);
      expect(telemetry.flyby.rate).toBe(2);
      expect(telemetry.motion.paceLyPerSecond).toBe(0);
      expect(createdTextures).toEqual(textures);
      expect(textureUploads).toHaveLength(uploads);
      expect(graphicsCreates).toEqual(creates);
    }
    advance(50000);
    scene.set({ running: true }); advance(10000);
    expect(telemetry.flyby.elapsedSeconds).toBe(12.8);
    advance(100); scene.set({ running: false });
    expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(13, 12);
    expect(telemetry.flyby.active).toBe(true);
    for (const highlight of route.highlights) {
      expect(scene.seekFlyby(highlight.seconds)).toBe(true);
      const atTime = scene.snapshot();
      expect(scene.seekFlybyHighlight(highlight.id)).toBe(true);
      expect(scene.snapshot()).toEqual(atTime);
    }
  });

  it('allows completed-route revisits and exact endpoints without accumulating false travel', () => {
    for (const id of ['halo', 'nebula', 'group', 'stellar']) {
      const route = launch(id);
      expect(scene.seekFlyby(route.durationSeconds)).toBe(true);
      const end = scene.snapshot();
      expect(telemetry).toMatchObject({ running: false, flyby: { active: false, completed: true, progress: 1, phase: 'complete' } });
      expect(end.targetId).toBe(route.highlights.at(-1).targetId);
      expect(scene.seekFlyby(0)).toBe(true);
      expect(scene.snapshot().state.position).toEqual(route.position);
      expect(scene.snapshot().state.distanceLy).toBe(0);
      expect(scene.snapshot().targetId).toBe(route.targetId);
      expect(scene.seekFlyby(route.durationSeconds - 0.1)).toBe(true);
      scene.set({ running: true }); advance(); advance(200);
      expect(telemetry.flyby.completed).toBe(true);
      expect(scene.snapshot().state.position).toEqual(end.state.position);
      expect(scene.snapshot().state.distanceLy).toBe(end.state.distanceLy);
      expect(scene.seekFlyby(8.3)).toBe(true);
      const saved = scene.snapshot();
      expect(scene.restore(saved)).toBe(true);
      expect(telemetry.flyby.active).toBe(false);
      reject(8.3);
    }
  });

  it('rejects invalid or unavailable seeks without changing state, events or scheduled frames', () => {
    reject(1);
    const route = launch('nebula');
    for (const value of [NaN, Infinity, -Infinity, -0.1, route.durationSeconds + 0.1, '10', null, undefined, {}, true]) reject(value);
    scene.set({ mode: 'relativity' }); reject(1);
    launch('halo'); scene.set({ region: 'cosmic' }); reject(1);
    launch('stellar');
    sceneCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    reject(1);
    scene.dispose(); reject(1);
  });
});
