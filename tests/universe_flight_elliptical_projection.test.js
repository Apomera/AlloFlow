import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight;
let scene;
let frames;
let now;
let nextFrame;
let buffers;
let uploads;
let updates;
let created;
let deleted;

const GOLDEN = { center: [800000, 550000, 850000], radius: 135000, tilt: 1.05, turn: -0.55 };
const STRIDE = 6;
const MODEL_FLOATS = 8 * 8 * 6 * STRIDE;
const GOLDEN_START = 3 * MODEL_FLOATS;
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const length = value => Math.hypot(...value);
const unit = value => value.map(component => component / length(value));

function worldBasis() {
  const ct = Math.cos(GOLDEN.tilt), st = Math.sin(GOLDEN.tilt);
  const cr = Math.cos(GOLDEN.turn), sr = Math.sin(GOLDEN.turn);
  return [[cr, sr, 0], [-ct * sr, ct * cr, st], [st * sr, -st * cr, ct]];
}

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  frames = new Map(); now = 100; nextFrame = 0;
  buffers = new Map(); uploads = []; updates = [];
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
  const bindings = new Map(), constants = new Map();
  const gl = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation') return (_program, name) => name;
      if (key === 'getParameter') return () => [1, 256];
      if (key === 'bindBuffer') return (target, buffer) => bindings.set(target, buffer);
      if (key === 'bufferData') return (target, value) => {
        const buffer = bindings.get(target), data = new Float32Array(value);
        buffers.set(buffer, data);
        uploads.push({ buffer, data: data.slice() });
      };
      if (key === 'bufferSubData') return (target, offset, value) => {
        const buffer = bindings.get(target), data = new Float32Array(value);
        updates.push({ buffer, offset, data: data.slice() });
        buffers.get(buffer).set(data, offset / Float32Array.BYTES_PER_ELEMENT);
      };
      const operation = String(key).match(/^(create|delete)(Buffer|Program|Texture|Shader)$/);
      if (operation) return resource => {
        if (operation[1] === 'create') {
          const item = { type: operation[2], index: created[operation[2]].length };
          created[operation[2]].push(item);
          return item;
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
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas);
  scene.set({ mode: 'explore', region: 'cosmic', running: false });
  advance();
});

afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

function advance(milliseconds = 16) {
  now += milliseconds;
  const callbacks = [...frames.values()];
  frames.clear(); callbacks.forEach(callback => callback(now));
}

function surfaceBuffer() {
  return uploads.findLast(item => item.data.length > GOLDEN_START && item.data[GOLDEN_START + 3] > 0.75)?.buffer;
}

function surface() { return buffers.get(surfaceBuffer()); }

function moveTo(position) {
  const saved = scene.snapshot();
  saved.state.position = position.slice();
  expect(scene.restore(saved)).toBe(true);
  advance();
  expect(scene.snapshot().state.position).toEqual(position);
}

// Recover the two half-width vectors from actual uploaded grid corners. Atlas
// UVs remain the existing four-tile layout, so this does not call private code.
function goldenFootprint(data = surface()) {
  const corners = [];
  for (let index = GOLDEN_START; index < GOLDEN_START + MODEL_FLOATS; index += STRIDE) {
    const u = (data[index + 3] * 2048 - 3 * 512 - 8.5) / 495;
    const v = (data[index + 4] * 512 - 8.5) / 495;
    if ((u < 1e-6 || u > 1 - 1e-6) && (v < 1e-6 || v > 1 - 1e-6)) {
      corners[(u > 0.5 ? 1 : 0) + (v > 0.5 ? 2 : 0)] = Array.from(data.slice(index, index + 3));
    }
  }
  expect(corners.filter(Boolean)).toHaveLength(4);
  const x = subtract(corners[1], corners[0]).map(value => value / 2);
  const y = subtract(corners[2], corners[0]).map(value => value / 2);
  return { x, y, center: corners[0].map((value, index) => value + x[index] + y[index]) };
}

function assertProjectedContour(observer) {
  const footprint = goldenFootprint(), n = unit(subtract(GOLDEN.center, observer));
  const axes = worldBasis(), radii = [1, 0.70, 0.72].map(value => value * GOLDEN.radius);
  expect(length(subtract(footprint.center, GOLDEN.center))).toBeLessThan(0.3);
  expect(Math.abs(dot(footprint.x, n)) / length(footprint.x)).toBeLessThan(2e-6);
  expect(Math.abs(dot(footprint.y, n)) / length(footprint.y)).toBeLessThan(2e-6);
  // Test several projected contour directions directly against the quadratic
  // form of the fixed world-space spheroid, without repeating an eigen solver.
  for (const seed of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [2, -3, 5]]) {
    const tangent = subtract(seed, n.map(value => value * dot(seed, n)));
    if (length(tangent) < 1e-8) continue;
    const direction = unit(tangent);
    const expected = Math.sqrt(axes.reduce((sum, axis, index) => sum + (radii[index] * dot(direction, axis)) ** 2, 0));
    // The atlas itself supplies a 0.72 ellipse and geometry has a 1.22 margin.
    const actual = Math.hypot(dot(direction, footprint.x) / 1.22, dot(direction, footprint.y) * 0.72 / 1.22);
    expect(actual / expected).toBeCloseTo(1, 5);
  }
  expect(Math.min(length(footprint.x), length(footprint.y) * 0.72) / 1.22).toBeGreaterThan(GOLDEN.radius * 0.69);
}

describe('Universe elliptical light projection', () => {
  it('projects a broad finite spheroid from principal, oblique, inside, and center viewpoints', () => {
    const directions = [...worldBasis(), unit([2, -3, 5])];
    for (const direction of directions) {
      const observer = GOLDEN.center.map((value, index) => value + direction[index] * GOLDEN.radius * 5);
      moveTo(observer);
      expect(Array.from(surface()).every(Number.isFinite)).toBe(true);
      assertProjectedContour(observer);
    }
    const inside = GOLDEN.center.map((value, index) => value + directions[3][index] * GOLDEN.radius * 0.2);
    moveTo(inside); assertProjectedContour(inside);
    moveTo(GOLDEN.center);
    expect(Array.from(surface()).every(Number.isFinite)).toBe(true);
    const centered = goldenFootprint();
    // A coincident observer has no defined sightline: the diffuse proxy
    // collapses to the center while the world-space stellar points remain.
    expect(length(centered.x)).toBe(0);
    expect(length(centered.y)).toBe(0);
    expect(length(subtract(centered.center, GOLDEN.center))).toBeLessThan(0.3);
  });

  it('updates projected ranges and leaves the fixed spiral grids and point bytes unchanged while the camera moves', () => {
    // Projected kinds (see universe_flight_bulges): elliptical (u > .75), bulge (flag >= 1)
    // and the exterior spiral-disk proxy (flag < 0, Enhancement57). Fixed grids have flag 0.
    const buffer = surfaceBuffer(), original = surface().slice();
    const pointBuffer = created.Buffer.find(item => item !== buffer);
    const originalPoints = buffers.get(pointBuffer).slice();
    const fullUploads = uploads.length, start = updates.length;
    moveTo([1600000, 650000, 1250000]);
    expect(uploads).toHaveLength(fullUploads);
    const changed = updates.slice(start);
    expect(changed.length).toBeGreaterThan(0);
    // Collect violations and assert once: ~120k per-vertex expect() calls exceeded the
    // 5 s budget once the disk proxies (34k more vertices) began updating.
    const unprojectedUpdates = [], movedUV = [], movedFixed = [];
    for (const update of changed) {
      expect(update.buffer).toBe(buffer);
      expect(update.offset % (STRIDE * 4)).toBe(0);
      expect(update.data.length % STRIDE).toBe(0);
      const offset = update.offset / 4;
      for (let index = offset; index < offset + update.data.length; index += STRIDE) {
        if (!(original[index + 3] > 0.75 || original[index + 5] >= 1 || original[index + 5] < 0)) unprojectedUpdates.push(index / STRIDE);
      }
    }
    expect(unprojectedUpdates.slice(0, 5), unprojectedUpdates.length + ' fixed vertices were re-uploaded').toEqual([]);
    const current = surface();
    for (let index = 0; index < original.length; index += STRIDE) {
      if (current[index + 3] !== original[index + 3] || current[index + 4] !== original[index + 4]) movedUV.push(index / STRIDE);
      if (original[index + 3] < 0.75 && original[index + 5] === 0) {
        for (let k = 0; k < STRIDE; k++) if (!Object.is(current[index + k], original[index + k])) { movedFixed.push(index / STRIDE); break; }
      }
    }
    expect(movedUV.slice(0, 5), movedUV.length + ' vertices changed atlas UVs').toEqual([]);
    expect(movedFixed.slice(0, 5), movedFixed.length + ' fixed vertices changed').toEqual([]);
    expect(buffers.get(pointBuffer)).toEqual(originalPoints);
    expect(current.slice(GOLDEN_START, GOLDEN_START + MODEL_FLOATS)).not.toEqual(original.slice(GOLDEN_START, GOLDEN_START + MODEL_FLOATS));
  });

  it('keeps surface bytes and uploads stable for paused, look-only, lens, exposure, and quality changes', () => {
    moveTo([1550000, 850000, 450000]);
    const bytes = surface().slice(), count = updates.length, fullUploads = uploads.length;
    const position = scene.snapshot().state.position;
    advance(1000);
    scene.look(0.3, -0.12); advance();
    scene.set({ fov: 78, exposure: 1.4, quality: 'low', running: false }); advance();
    const view = scene.snapshot(); view.state.yaw += 0.2;
    expect(scene.restore(view)).toBe(true); advance();
    expect(scene.snapshot().state.position).toEqual(position);
    expect(surface()).toEqual(bytes);
    expect(updates).toHaveLength(count);
    expect(uploads).toHaveLength(fullUploads);
  });

  it('refreshes projection after changing regions and restores the same paused surface deterministically', () => {
    const position = [1400000, 150000, 1600000];
    moveTo(position);
    const expected = surface().slice(), saved = scene.snapshot();
    scene.set({ region: 'galaxy' }); advance();
    scene.set({ region: 'cosmic' }); advance();
    const before = updates.length;
    expect(scene.restore(saved)).toBe(true); advance();
    expect(updates.length).toBeGreaterThan(before);
    expect(scene.snapshot().state.position).toEqual(position);
    expect(surface()).toEqual(expected);
  });

  it('moves the projection during a native orbit, freezes on pause, and reuses then disposes existing resources', () => {
    const resources = Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()]));
    expect(resources.Buffer).toHaveLength(2);
    expect(resources.Program).toHaveLength(2);
    expect(resources.Texture).toHaveLength(2);
    moveTo([1650000, 650000, 1250000]);
    expect(scene.selectTarget('golden-elliptical')).toBe(true);
    expect(scene.startOrbit('golden-elliptical')).toBe(true);
    scene.set({ running: true }); advance();
    const start = scene.snapshot().state.position, count = updates.length;
    for (let index = 0; index < 10; index++) advance(100);
    expect(scene.snapshot().state.position).not.toEqual(start);
    expect(updates.length).toBeGreaterThan(count);
    expect(created).toEqual(resources);
    scene.set({ running: false }); advance();
    const stopped = scene.snapshot(), bytes = surface().slice(), stoppedCount = updates.length;
    advance(1000);
    expect(scene.snapshot()).toEqual(stopped);
    expect(surface()).toEqual(bytes);
    expect(updates).toHaveLength(stoppedCount);
    scene.dispose(); scene.dispose();
    for (const [type, items] of Object.entries(resources)) {
      expect(deleted[type]).toHaveLength(items.length);
      for (const resource of items) expect(deleted[type].filter(item => item === resource)).toHaveLength(1);
    }
  });
});
