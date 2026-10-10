import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { originalGalaxySurface, galaxySurfaceFloats } from './helpers/universe_galaxy_surfaces.js';

let flight, helpers, scene, frames, now, nextFrame, buffers, uploads, updates, created, deleted;
const MODEL = { center: [0, 0, 0], radius: 52000, tilt: 0.88, turn: -0.22, style: 'spiral' };
const Q = Math.sqrt(2) * 0.065 / 0.135;
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const length = a => Math.hypot(...a);
const unit = a => a.map(value => value / length(a));
const hash = a => createHash('sha256').update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
const ORIGINAL_SURFACES = {
  neighborhood: [0, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  galaxy: [1920, 'e97a5ba4db3d27acd2bda8ba417e84c696c7ba32f3b5fd0817d8ba58810890fa'],
  cosmic: [257280, '102e9fa5c941b24e52de513ac8fb058e749a000ce8ee631740113809bc21253b'],
};

function axes(model = MODEL) {
  const ct = Math.cos(model.tilt), st = Math.sin(model.tilt), cr = Math.cos(model.turn), sr = Math.sin(model.turn);
  return [[cr, sr, 0], [-ct * sr, ct * cr, st], [st * sr, -st * cr, ct]];
}
function observer(direction, range = MODEL.radius * 5) { return MODEL.center.map((v, i) => v + direction[i] * range); }

beforeAll(() => {
  delete window.UniverseFlight;
  const source = readFileSync('stem_lab/universe_flight_scene.js', 'utf8');
  // Expose private mathematical helpers only in this test evaluation. Public
  // production APIs and shader execution remain covered by browser checks.
  const marker = '  global.UniverseFlight =';
  expect(source.includes(marker)).toBe(true);
  new Function(source.replace(marker,
    '  global.__universeBulgeTests = { galaxyPixels:galaxyPixels, cloudPixels:cloudPixels, makeRegion:makeRegion, galaxyGeometry:galaxyGeometry, spiralBulgeView:spiralBulgeView, writeProjectedSurface:writeProjectedSurface };\n' + marker))();
  helpers = window.__universeBulgeTests; delete window.__universeBulgeTests;
  flight = window.UniverseFlight;
});

beforeEach(() => {
  scene = null; frames = new Map(); now = 100; nextFrame = 0;
  buffers = new Map(); uploads = []; updates = [];
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
});
afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

function createScene(region = 'galaxy') {
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
        buffers.set(buffer, data); uploads.push({ buffer, data: data.slice() });
      };
      if (key === 'bufferSubData') return (target, offset, value) => {
        const buffer = bindings.get(target), data = new Float32Array(value);
        updates.push({ buffer, offset, data: data.slice() }); buffers.get(buffer).set(data, offset / 4);
      };
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
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas); scene.set({ mode: 'explore', region, running: false }); advance();
}
function advance(milliseconds = 16) {
  now += milliseconds; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
}
function moveTo(position) {
  const saved = scene.snapshot(); saved.state.position = position.slice();
  expect(scene.restore(saved)).toBe(true); advance();
}
function resources() { return Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()])); }
function surface() { return buffers.get(created.Buffer[1]); }

describe('Universe rounded spiral bulges', () => {
  it('projects the existing oblate stellar spread for principal and oblique directions and balances area', () => {
    const basis = axes(), directions = [...basis, unit([2, -3, 5]), unit([-4, 1, 2])];
    for (const direction of directions) {
      const position = observer(direction), shape = helpers.spiralBulgeView(MODEL, position), n = unit(subtract(MODEL.center, position));
      expect(Math.abs(dot(shape.major, n)) / length(shape.major)).toBeLessThan(1e-12);
      expect(Math.abs(dot(shape.minor, n)) / length(shape.minor)).toBeLessThan(1e-12);
      expect(Math.abs(dot(shape.major, shape.minor)) / (length(shape.major) * length(shape.minor))).toBeLessThan(1e-12);
      for (const seed of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [2, -3, 5]]) {
        const tangent = subtract(seed, n.map(value => value * dot(seed, n)));
        if (length(tangent) < 1e-8) continue;
        const d = unit(tangent);
        const expected = MODEL.radius * Math.sqrt(basis.reduce((sum, axis, i) => sum + ([1, Q * Q, 1][i]) * dot(d, axis) ** 2, 0));
        const actual = Math.hypot(dot(d, shape.major), dot(d, shape.minor));
        expect(actual / expected).toBeCloseTo(1, 12);
      }
      expect(shape.gain * length(shape.major) * length(shape.minor) / MODEL.radius ** 2).toBeCloseTo(1, 12);
      expect(shape.gain).toBeGreaterThanOrEqual(1 - 1e-12);
      expect(shape.gain).toBeLessThanOrEqual(1 / Q + 1e-12);
    }
    const face = helpers.spiralBulgeView(MODEL, observer(basis[1]));
    expect(length(face.major) / length(face.minor)).toBeCloseTo(1, 12);
    const side = helpers.spiralBulgeView(MODEL, observer(basis[0]));
    expect(length(side.minor) / length(side.major)).toBeCloseTo(Q, 12);
    expect(side.gain).toBeCloseTo(1 / Q, 12);
  });

  it('fades smoothly inside the proxy and keeps zero-light bulges on their own texture layer', () => {
    const direction = axes()[0], far = helpers.spiralBulgeView(MODEL, observer(direction));
    const gains = [0.05, 0.10, 0.20, 0.30, 0.35].map(r => helpers.spiralBulgeView(MODEL, observer(direction, MODEL.radius * r)).gain);
    expect(gains[0]).toBeCloseTo(0, 12); expect(gains.at(-1)).toBeCloseTo(far.gain, 12);
    expect(gains[2]).toBeCloseTo(far.gain * 0.5, 12);
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeGreaterThan(gains[i - 1]);
    const geometry = helpers.galaxyGeometry([MODEL]), range = geometry.bulges[0];
    for (const position of [MODEL.center, observer(direction, MODEL.radius * 0.01), observer(direction, MODEL.radius * 0.05)]) {
      helpers.writeProjectedSurface(geometry.points, range, position);
      for (let i = range.offset; i < range.offset + range.count; i += 6) {
        expect(Number.isFinite(geometry.points[i])).toBe(true); expect(geometry.points[i + 5]).toBe(1);
      }
    }
    const coincident = helpers.spiralBulgeView(MODEL, MODEL.center);
    expect(coincident.gain).toBe(0); expect(length(coincident.major)).toBe(0); expect(length(coincident.minor)).toBe(0);
  });

  it('keeps original disk xyz and UV bytes and appends one tessellated bulge per spiral', () => {
    for (const [region, [oldFloats, oldHash]] of Object.entries(ORIGINAL_SURFACES)) {
      const models = helpers.makeRegion(region).galaxies, geometry = helpers.galaxyGeometry(models);
      expect(hash(originalGalaxySurface(geometry.points, oldFloats))).toBe(oldHash);
      expect(geometry.points).toHaveLength(galaxySurfaceFloats(region, oldFloats));
      expect(geometry.bulges).toHaveLength(models.filter(model => !model.elliptical).length);
      for (const [index, range] of geometry.bulges.entries()) {
        expect(range.offset).toBe(oldFloats / 5 * 6 + index * 2304); expect(range.count).toBe(2304);
        const center = range.model.center.map(Math.fround); let validCenter = true, validLayer = true;
        for (let i = range.offset; i < range.offset + range.count; i += 6) {
          for (let axis = 0; axis < 3; axis++) if (geometry.points[i + axis] !== center[axis]) validCenter = false;
          if (geometry.points[i + 5] !== 1) validLayer = false;
        }
        expect(validCenter).toBe(true); expect(validLayer).toBe(true);
      }
    }
  });

  it('samples the central backward ray at high beta instead of interpolating only displaced corners', () => {
    // Face-on spherical footprint behind +z travel. Aberration is nonlinear:
    // the true center stays behind while the four outer corner rays move ahead.
    const model = { ...MODEL, tilt: Math.PI / 2 }, position = [0, 0, MODEL.radius * 3];
    const geometry = helpers.galaxyGeometry([model]), range = geometry.bulges[0];
    helpers.writeProjectedSurface(geometry.points, range, position);
    const vertices = [];
    for (let i = range.offset; i < range.offset + range.count; i += 6) {
      vertices.push({ position: Array.from(geometry.points.subarray(i, i + 3)), u: geometry.points[i + 3], v: geometry.points[i + 4] });
    }
    const center = vertices.filter(vertex => vertex.u === 0.125 && vertex.v === 0.5);
    expect(center.length).toBeGreaterThan(0);
    const beta = 0.99, gamma = 1 / Math.sqrt(1 - beta * beta);
    const ray = vertex => {
      const n = unit(subtract(vertex.position, position));
      return { D: gamma * (1 + beta * n[2]), z: (n[2] + beta) / (1 + beta * n[2]) };
    };
    for (const vertex of center) {
      expect(vertex.position).toEqual(model.center);
      expect(ray(vertex).D).toBeCloseTo(gamma * (1 - beta), 12);
      expect(ray(vertex).z).toBe(-1);
    }
    const minU = 8.5 / 2048, maxU = 503.5 / 2048, minV = 8.5 / 512, maxV = 503.5 / 512;
    const corners = vertices.filter(vertex => (vertex.u === minU || vertex.u === maxU) && (vertex.v === minV || vertex.v === maxV));
    expect(corners.length).toBeGreaterThanOrEqual(4);
    for (const corner of corners) {
      expect(ray(corner).D).toBeCloseTo(1.005, 2);
      expect(ray(corner).z).toBeGreaterThan(0);
      expect(ray(corner).D / ray(center[0]).D).toBeGreaterThan(14);
    }
  });

  it('reconstructs accepted spiral light within byte quantization and preserves the elliptical and cloud maps', () => {
    const baseline = JSON.parse(readFileSync('tests/fixtures/universe_flight_bulge_baseline.json', 'utf8'));
    const map = helpers.galaxyPixels(512), tint = [1, 0.8, 0.56], sums = Array.from({ length: 3 }, () => [0, 0, 0]);
    for (const [tile, x, y, ...rgb] of baseline.samples) {
      const offset = (y * 2048 + tile * 512 + x) * 4;
      for (let c = 0; c < 3; c++) expect(Math.abs(map[offset + c] + map[offset + 3] * tint[c] - rgb[c])).toBeLessThanOrEqual(1.5);
    }
    let radialMismatches = 0;
    for (let tile = 0; tile < 3; tile++) for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const offset = (y * 2048 + tile * 512 + x) * 4;
      for (let c = 0; c < 3; c++) sums[tile][c] += map[offset + c] + map[offset + 3] * tint[c];
      // A rounded diffuse radial bulge must not inherit curls from the disk's
      // local tone curve. Swapping x and y preserves radius exactly.
      if (map[offset + 3] !== map[(x * 2048 + tile * 512 + y) * 4 + 3]) radialMismatches++;
    }
    expect(radialMismatches).toBe(0);
    for (let tile = 0; tile < 3; tile++) expect(map[(255 * 2048 + tile * 512 + 255) * 4 + 3]).toBeGreaterThan(map[(255 * 2048 + tile * 512 + 320) * 4 + 3]);
    for (let tile = 0; tile < 3; tile++) for (let c = 0; c < 3; c++) expect(Math.abs(sums[tile][c] / baseline.rgbSums[tile][c] - 1)).toBeLessThan(0.01);
    const elliptical = new Uint8Array(512 * 512 * 4);
    for (let y = 0; y < 512; y++) elliptical.set(map.subarray((y * 2048 + 1536) * 4, (y * 2048 + 2048) * 4), y * 512 * 4);
    expect(hash(elliptical)).toBe('08f244e4ef3ad6f71eb240e7e9e67410fe82f16a69f1992f27c2f857dcd15d38');
    expect(hash(helpers.cloudPixels())).toBe('b57c6fd38bbb173b026084c3f7977e0a27c8a91bb5446e045cef067a043b2c88');
    expect(helpers.galaxyPixels(512)).toBe(map);
  });

  it('uploads only projected ranges when position changes and caches paused, look, lens, and exposure changes', () => {
    createScene('cosmic'); const before = surface().slice(), count = updates.length, full = uploads.length;
    const points = buffers.get(created.Buffer[0]).slice();
    moveTo([1600000, 650000, 1250000]);
    const changes = updates.slice(count); expect(changes.length).toBe(134);
    let projectedOnly = true, stableUV = true;
    for (const update of changes) {
      expect(update.buffer).toBe(created.Buffer[1]); expect(update.offset % 24).toBe(0); expect(update.data).toHaveLength(2304);
      for (let i = 0; i < update.data.length; i += 6) {
        const oldOffset = update.offset / 4 + i;
        if (!(before[oldOffset + 3] > 0.75 || before[oldOffset + 5] >= 1)) projectedOnly = false;
        if (update.data[i + 3] !== before[oldOffset + 3] || update.data[i + 4] !== before[oldOffset + 4]) stableUV = false;
      }
    }
    expect(projectedOnly).toBe(true); expect(stableUV).toBe(true);
    expect(hash(buffers.get(created.Buffer[0]))).toBe(hash(points)); expect(uploads).toHaveLength(full);
    const stable = surface().slice(), updateCount = updates.length;
    advance(1000); scene.look(0.3, -0.1); scene.set({ fov: 80, exposure: 1.4, quality: 'low' }); advance();
    expect(hash(surface())).toBe(hash(stable)); expect(updates).toHaveLength(updateCount);
    // The original three spiral disk grids stay fixed. Both projected kinds
    // start after this prefix, and the corner suffix remains intact.
    expect(surface().subarray(0, 6912)).toEqual(before.subarray(0, 6912));
    expect(surface().subarray(surface().length - 36)).toEqual(before.subarray(before.length - 36));
  });

  it('refreshes during native orbit and distance glides, freezes on pause, and restores the same surface', () => {
    createScene(); moveTo([160000, 10000, 0]);
    expect(scene.selectTarget('galactic-center')).toBe(true); expect(scene.startOrbit('galactic-center')).toBe(true);
    scene.set({ running: true }); advance(); const count = updates.length;
    for (let i = 0; i < 5; i++) advance(100);
    expect(updates.length).toBeGreaterThan(count);
    scene.set({ running: false }); advance(); const saved = scene.snapshot(), bytes = surface().slice(), frozen = updates.length;
    advance(1000); expect(surface()).toEqual(bytes); expect(updates).toHaveLength(frozen);
    expect(scene.restore(saved)).toBe(true); advance(); expect(surface()).toEqual(bytes);
    expect(scene.startDistanceGlide('galactic-center', 'closer')).toBe(true); scene.set({ running: true }); advance(); const glide = updates.length;
    for (let i = 0; i < 5; i++) advance(100);
    expect(updates.length).toBeGreaterThan(glide);
    scene.set({ running: false }); advance(); const paused = surface().slice(), pausedCount = updates.length;
    advance(1000); expect(surface()).toEqual(paused); expect(updates).toHaveLength(pausedCount);
  });

  it('uses the same two buffers, textures, and programs through movement and releases each resource once', () => {
    createScene(); const objects = resources();
    for (const type of ['Buffer', 'Program', 'Texture']) expect(objects[type]).toHaveLength(2);
    expect(objects.Shader).toHaveLength(4);
    for (const position of [[160000, 10000, 0], [0, 120000, 0], [0, 0, 0]]) moveTo(position);
    expect(resources()).toEqual(objects); scene.dispose(); scene.dispose();
    for (const [type, items] of Object.entries(objects)) {
      expect(deleted[type]).toHaveLength(items.length);
      for (const item of items) expect(deleted[type].filter(resource => resource === item)).toHaveLength(1);
    }
    expect(frames.size).toBe(0);
  });
});
