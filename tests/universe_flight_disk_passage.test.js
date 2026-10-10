import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight, route, scene, telemetry, pauses, frames, time, nextFrame, created, deleted, textureUploads, bufferUploads;
const TIMES = [0, 7, 13, 21, 27, 35, 44];
const NODES = [[56000, 15000, -38000], [42000, 6000, -23000], [34500, 624, -9500], [27000, -624, 4000], [23000, -5200, 15000], [12000, -27000, 45000], [-32000, -60000, 88000]];
const PHASES = ['approach', 'descent', 'crossing', 'emerge', 'turn', 'reveal', 'complete'];
function world(point) {
  const ct = Math.cos(0.88), st = Math.sin(0.88), cr = Math.cos(-0.22), sr = Math.sin(-0.22);
  const y = point[1] * ct - point[2] * st;
  return [point[0] * cr - y * sr, point[0] * sr + y * cr, point[1] * st + point[2] * ct];
}
function local(point) {
  const ct = Math.cos(0.88), st = Math.sin(0.88), cr = Math.cos(-0.22), sr = Math.sin(-0.22);
  const x = point[0] * cr + point[1] * sr, y = -point[0] * sr + point[1] * cr;
  return [x, y * ct + point[2] * st, -y * st + point[2] * ct];
}
function expectPose(actual, expected, expectedGaze = expected) {
  actual.position.forEach((value, axis) => expect(value).toBeCloseTo(expected.position[axis], 6));
  expect(actual.distanceLy).toBeCloseTo(expected.distance, 6);
  expect(Math.sin(actual.yaw)).toBeCloseTo(Math.sin(expectedGaze.yaw), 11);
  expect(Math.cos(actual.yaw)).toBeCloseTo(Math.cos(expectedGaze.yaw), 11);
  expect(actual.pitch).toBeCloseTo(expectedGaze.pitch, 11);
  expect([actual.universeYears, actual.travelerYears]).toEqual([0, 0]);
}
// Live playback follows the authored gaze with a 0.35-second response. Seeks,
// highlight stops, and paused Follow view still resolve the authored gaze exactly.
// Use a shortest-arc angle and exponential decay to predict live orientation.
function followedGaze(previous, target, seconds) {
  const decay = Math.exp(-seconds / 0.35);
  const arc = Math.atan2(Math.sin(target.yaw - previous.yaw), Math.cos(target.yaw - previous.yaw));
  return { yaw: previous.yaw + arc * (1 - decay), pitch: target.pitch + (previous.pitch - target.pitch) * decay };
}

beforeAll(() => {
  delete window.UniverseFlight;
  const source = readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), marker = '  global.UniverseFlight =';
  expect(source.includes(marker)).toBe(true);
  // Only this test evaluation exposes the authored camera function. Production
  // APIs and WebGL execution remain unchanged and use separate browser checks.
  new Function(source.replace(marker, '  global.__diskPassageTestRoute=DISK_FLYBY;\n' + marker))();
  route = window.__diskPassageTestRoute; delete window.__diskPassageTestRoute;
  flight = window.UniverseFlight;
});
beforeEach(() => {
  scene = null; telemetry = null; pauses = []; frames = new Map(); time = 100; nextFrame = 0;
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
  textureUploads = 0; bufferUploads = 0;
});
afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });
function createScene() {
  const constants = new Map();
  const gl = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation') return (_program, name) => name;
      if (key === 'getParameter') return () => [1, 256];
      if (key === 'texImage2D') return () => textureUploads++;
      if (key === 'bufferData') return () => bufferUploads++;
      const operation = String(key).match(/^(create|delete)(Buffer|Program|Texture|Shader)$/);
      if (operation) return resource => {
        if (operation[1] === 'create') {
          const item = { type: operation[2], index: created[operation[2]].length };
          created[operation[2]].push(item); return item;
        }
        deleted[operation[2]].push(resource);
      };
      if (String(key).toUpperCase() === key) {
        if (!constants.has(key)) constants.set(key, constants.size + 1);
        return constants.get(key);
      }
      return () => {};
    },
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => time);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas, { onTelemetry(value) { telemetry = value; }, onPause(message, detail) { pauses.push({ message, detail }); } });
}
function advance(milliseconds = 16) {
  time += milliseconds; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time));
}
function launch(rate = 1) {
  scene.set({ mode: 'explore', region: 'galaxy', flybyRate: rate, fov: 64, pauseAtHighlights: false });
  expect(scene.startFlyby('disk')).toBe(true); advance(); return flight.flybys('galaxy')[1];
}
function publish() { scene.set({}); return telemetry; }
function resources() { return Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()])); }
function reject(action) {
  const saved = scene.snapshot(), before = structuredClone(telemetry), scheduled = [...frames.keys()], eventCount = pauses.length;
  expect(action()).toBe(false); expect(scene.snapshot()).toEqual(saved); expect(telemetry).toEqual(before);
  expect([...frames.keys()]).toEqual(scheduled); expect(pauses).toHaveLength(eventCount);
}

describe('Universe spiral disk passage', () => {
  it('keeps finite monotone authored poses, exact Hermite joins and a slower safe disk crossing', () => {
    const seen = new Set(); let previous = -1, minimum = Infinity, inside = 0;
    for (let step = 0; step <= 4400; step++) {
      const seconds = step / 100, sample = route.atTime(seconds), point = local(sample.position);
      expect([...sample.position, sample.yaw, sample.pitch, sample.distance, sample.pace].every(Number.isFinite)).toBe(true);
      expect(sample.distance).toBeGreaterThanOrEqual(previous); expect(sample.pace).toBeGreaterThanOrEqual(0);
      const range = Math.hypot(...sample.position); expect(range).toBeLessThan(3000000); minimum = Math.min(minimum, range);
      if (Math.hypot(point[0], point[2]) < 52000 * 1.12 && Math.abs(point[1]) <= 624) inside++;
      seen.add(sample.phase); previous = sample.distance;
    }
    expect([...seen]).toEqual(PHASES); expect(minimum).toBeGreaterThan(18000); expect(inside).toBeGreaterThan(700);
    expect(route.atTime(0).pace).toBe(0); expect(route.atTime(44).pace).toBeLessThan(1e-8);
    for (const [index, seconds] of TIMES.entries()) {
      route.atTime(seconds).position.forEach((value, axis) => expect(value).toBeCloseTo(world(NODES[index])[axis], 8));
      if (index > 0 && index < TIMES.length - 1) expect(Math.abs(route.atTime(seconds - 1e-6).pace - route.atTime(seconds + 1e-6).pace)).toBeLessThan(0.01);
    }
    expect(Math.abs(local(route.atTime(17).position)[1])).toBeLessThan(624);
    expect(route.atTime(17).pace).toBeLessThan(route.atTime(35).pace);
    expect(route.atTime(-1)).toEqual(route.atTime(0)); expect(route.atTime(100)).toEqual(route.atTime(44));
  });

  it('appends detached disk metadata and keeps the original route order and regional catalogs', () => {
    const catalog = flight.flybys(), disk = catalog.at(-1), original = structuredClone(disk);
    expect(catalog.map(item => item.id)).toEqual(['halo', 'nebula', 'group', 'stellar', 'disk']);
    expect(flight.flybys('galaxy').map(item => item.id)).toEqual(['halo', 'disk']);
    expect(flight.flybys('neighborhood').map(item => item.id)).toEqual(['nebula', 'stellar']);
    expect(flight.flybys('cosmic').map(item => item.id)).toEqual(['group']);
    expect(disk).toMatchObject({ id: 'disk', name: 'Spiral disk passage', region: 'galaxy', durationSeconds: 44, position: world(NODES[0]), aim: [-20170, 10020, -4410], fov: 64, targetId: 'inner-arm' });
    expect(disk.highlights.map(item => [item.id, item.seconds, item.targetId])).toEqual([['arms', 10, 'inner-arm'], ['crossing', 17, 'inner-arm'], ['panorama', 40, 'galactic-center']]);
    disk.name = 'Changed'; disk.position[0] = 1e20; disk.aim[1] = 1e20; disk.highlights[0].seconds = 1e20; disk.highlights.splice(1);
    expect(flight.flybys().at(-1)).toEqual(original);
  });

  it('starts a fresh route, survives the settings echo and freezes travel during pause and free look', () => {
    createScene(); scene.set({ mode: 'relativity', beta: 0.9 }); scene.set({ running: true }); advance(); advance(100);
    expect(scene.snapshot().state.universeYears).toBeGreaterThan(0);
    const metadata = launch(), objects = resources(), textures = textureUploads;
    expect(telemetry.flyby).toMatchObject({ id: 'disk', active: true, completed: false, elapsedSeconds: 0, autoLook: true });
    expect(telemetry.position).toEqual(metadata.position); expect(telemetry.target.id).toBe('inner-arm');
    expectPose(scene.snapshot().state, route.atTime(0));
    scene.set({ ...scene.snapshot().settings, running: true, speed: 1e10, smoothTravel: true }); advance(100);
    expect(publish().flyby.elapsedSeconds).toBeCloseTo(0.1, 11);
    scene.set({ running: false }); const saved = scene.snapshot(), elapsed = telemetry.flyby.elapsedSeconds;
    advance(60000); expect(scene.snapshot()).toEqual(saved); expect(publish().flyby.elapsedSeconds).toBe(elapsed);
    scene.look(0.2, -0.1); publish(); expect(telemetry.flyby.autoLook).toBe(false); const looked = scene.snapshot();
    advance(1000); expect(scene.snapshot()).toEqual(looked); expect(telemetry.flyby.elapsedSeconds).toBe(elapsed);
    expect(scene.followFlybyView()).toBe(true); expectPose(scene.snapshot().state, route.atTime(elapsed));
    expect(resources()).toEqual(objects); expect(textureUploads).toBe(textures);
  });

  it('uses all supported authored playback rates without adding physical clock time', () => {
    createScene();
    for (const rate of [0.25, 0.5, 1, 2, 4]) {
      launch(rate); let gaze = route.atTime(0);
      for (let step = 0; step < 10; step++) {
        gaze = followedGaze(gaze, route.atTime((step + 1) * 0.1 * rate), 0.1); advance(100);
        expectPose(scene.snapshot().state, route.atTime((step + 1) * 0.1 * rate), gaze);
      }
      publish();
      expect(telemetry.flyby.elapsedSeconds).toBeCloseTo(rate, 10);
      expectPose(scene.snapshot().state, route.atTime(rate), gaze); expect(telemetry.flyby.rate).toBe(rate);
    }
    scene.set({ flybyRate: 100 }); expect(telemetry.flyby.rate).toBe(4);
    scene.set({ flybyRate: -100 }); expect(telemetry.flyby.rate).toBe(0.25);
  });

  it('seeks arbitrary moments and named highlights exactly while retaining the lens and allocated graphics', () => {
    createScene(); const metadata = launch(2); scene.set({ fov: 43, exposure: 0.72, quality: 'low' });
    const settings = scene.snapshot().settings, objects = resources(), textures = textureUploads, full = bufferUploads;
    for (const seconds of [13.7, 3.2, 43.9, 17, 0]) {
      const events = pauses.length; expect(scene.seekFlyby(seconds)).toBe(true);
      expectPose(scene.snapshot().state, route.atTime(seconds)); expect(telemetry).toMatchObject({ running: false, flyby: { id: 'disk', elapsedSeconds: seconds, autoLook: true } });
      expect(pauses).toHaveLength(events + 1); expect(pauses.at(-1).detail).toMatchObject({ kind: 'flyby-moment', routeId: 'disk', seconds });
      expect(scene.snapshot().settings).toEqual(settings); const saved = scene.snapshot(); advance(10000); expect(scene.snapshot()).toEqual(saved);
    }
    for (const highlight of metadata.highlights) {
      expect(scene.seekFlybyHighlight(highlight.id)).toBe(true); expectPose(scene.snapshot().state, route.atTime(highlight.seconds));
      expect(scene.snapshot().targetId).toBe(highlight.targetId); expect(pauses.at(-1).detail).toMatchObject({ kind: 'flyby-highlight', routeId: 'disk', highlightId: highlight.id });
    }
    expect(resources()).toEqual(objects); expect(textureUploads).toBe(textures); expect(bufferUploads).toBe(full);
  });

  it('stops at every disk highlight exactly across all playback rates and resumes beyond each stop', () => {
    createScene(); const metadata = launch(); const objects = resources();
    for (const rate of [0.25, 0.5, 1, 2, 4]) {
      scene.set({ flybyRate: rate, pauseAtHighlights: true });
      for (const [index, highlight] of metadata.highlights.entries()) {
        expect(scene.seekFlybyHighlight(highlight.id)).toBe(true); const expected = scene.snapshot();
        expect(scene.seekFlyby(highlight.seconds - 0.04)).toBe(true); const events = pauses.length;
        scene.set({ running: true }); advance();
        for (let tick = 0; tick < 100 && publish().running; tick++) advance(100);
        expect(telemetry.running).toBe(false); expectPose(scene.snapshot().state, route.atTime(highlight.seconds));
        expect(scene.snapshot().targetId).toBe(expected.targetId);
        expect(telemetry.flyby).toMatchObject({ id: 'disk', active: true, completed: false, elapsedSeconds: highlight.seconds, rate, pauseAtHighlights: true });
        expect(pauses).toHaveLength(events + 1); expect(pauses.at(-1).detail).toMatchObject({ kind: 'flyby-stop', routeId: 'disk', highlightId: highlight.id, seconds: highlight.seconds, stopIndex: index + 1, stopCount: 3 });
        const saved = scene.snapshot(), stopped = pauses.length; advance(60000); expect(scene.snapshot()).toEqual(saved); expect(pauses).toHaveLength(stopped);
        scene.set({ running: true }); advance(); advance(100); expect(publish().flyby.elapsedSeconds).toBeGreaterThan(highlight.seconds); expect(pauses).toHaveLength(stopped);
      }
    }
    expect(resources()).toEqual(objects);
  });

  it('completes once at the exact endpoint and restores a saved paused pose as free exploration', () => {
    createScene(); launch(4); expect(scene.seekFlyby(43.8)).toBe(true); const completions = pauses.filter(item => item.detail?.kind === 'flyby').length;
    scene.set({ running: true }); advance(); advance(100); publish();
    expect(telemetry.flyby).toMatchObject({ id: 'disk', active: false, completed: true, progress: 1, elapsedSeconds: 44, phase: 'complete' });
    expectPose(scene.snapshot().state, route.atTime(44), followedGaze(route.atTime(43.8), route.atTime(44), 0.1)); expect(scene.snapshot().targetId).toBe('galactic-center');
    expect(pauses.filter(item => item.detail?.kind === 'flyby')).toHaveLength(completions + 1);
    const end = scene.snapshot(); advance(10000); expect(scene.snapshot()).toEqual(end);
    expect(scene.seekFlyby(0)).toBe(true); expectPose(scene.snapshot().state, route.atTime(0));
    expect(scene.seekFlyby(17)).toBe(true); const saved = scene.snapshot();
    expect(scene.restore(saved)).toBe(true); expectPose(scene.snapshot().state, route.atTime(17));
    expect(telemetry.running).toBe(false); expect(telemetry.flyby.active).toBe(false); reject(() => scene.seekFlyby(17));
  });

  it('rejects unavailable seeks atomically and cancels on region, mode or explicit takeover', () => {
    createScene(); reject(() => scene.seekFlyby(1)); scene.set({ mode: 'explore', region: 'neighborhood' }); reject(() => scene.startFlyby('disk'));
    launch(); for (const value of [NaN, Infinity, -1, 44.01, '17']) reject(() => scene.seekFlyby(value));
    reject(() => scene.seekFlybyHighlight('missing')); expect(scene.cancelFlyby()).toBe(true);
    expect(telemetry.flyby).toMatchObject({ active: false, completed: false }); expect(telemetry.running).toBe(false); reject(() => scene.seekFlyby(10));
    launch(); scene.set({ region: 'cosmic' }); expect(telemetry.flyby.active).toBe(false); reject(() => scene.seekFlyby(10));
    launch(); scene.set({ mode: 'relativity' }); expect(telemetry.flyby.active).toBe(false); reject(() => scene.seekFlyby(10));
  });

  it('reuses existing GPU objects throughout the passage and releases each once on disposal', () => {
    createScene(); launch(); const objects = resources();
    for (const type of ['Buffer', 'Program', 'Texture']) expect(objects[type]).toHaveLength(2); expect(objects.Shader).toHaveLength(4);
    for (const seconds of [0, 10, 17, 40, 44, 3.2]) { expect(scene.seekFlyby(seconds)).toBe(true); advance(); }
    expect(resources()).toEqual(objects); scene.dispose(); scene.dispose();
    for (const [type, items] of Object.entries(objects)) {
      expect(deleted[type]).toHaveLength(items.length); for (const item of items) expect(deleted[type].filter(resource => resource === item)).toHaveLength(1);
    }
    expect(frames.size).toBe(0);
  });
});
