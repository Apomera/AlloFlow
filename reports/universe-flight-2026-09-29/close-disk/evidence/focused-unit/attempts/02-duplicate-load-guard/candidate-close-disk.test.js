import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

let flight, helpers, baseline, scene, frames, now, nextFrame, buffers, uploads, updates, created, deleted;
const MODEL = { center: [2100000, -800000, 4200000], radius: 52000, tilt: 0.88, turn: -0.22, style: 'spiral' };
const hash = a => createHash('sha256').update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)).digest('hex');

function axes(model) {
  const ct = Math.cos(model.tilt), st = Math.sin(model.tilt), cr = Math.cos(model.turn), sr = Math.sin(model.turn);
  return [[cr, sr, 0], [-ct * sr, ct * cr, st], [st * sr, -st * cr, ct]];
}
function observer(model, x, height, z = 0) {
  const basis = axes(model);
  return model.center.map((value, axis) => value + model.radius * (x * basis[0][axis] + height * basis[1][axis] + z * basis[2][axis]));
}
function smooth(value) { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); }
function expectedMarker(radial, height) {
  return Math.fround(0.5 * (1 - smooth((radial - 1.12) / 0.10)) * (1 - smooth((Math.abs(height) - 0.012) / 0.036)));
}
function expose(source, name) {
  const marker = '  global.UniverseFlight =';
  expect(source.includes(marker)).toBe(true);
  new Function(source.replace(marker, `  global.${name} = { makeRegion:makeRegion, galaxyGeometry:galaxyGeometry, spiralPlaneMarker:typeof spiralPlaneMarker==='function'?spiralPlaneMarker:null, writeSpiralPlane:typeof writeSpiralPlane==='function'?writeSpiralPlane:null };\n` + marker))();
  const result = window[name]; delete window[name]; return result;
}

beforeAll(() => {
  delete window.UniverseFlight;
  // The baseline is supplied only by the candidate diagnostic runner. The
  // repository test can use the accepted geometry invariants below instead.
  if (globalThis.__universeCloseBaselineSource) baseline = expose(globalThis.__universeCloseBaselineSource, '__closeBaseline');
  helpers = expose(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), '__closeTests');
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
function surface() { return buffers.get(created.Buffer[1]); }
function planeUpdates(from, geometry) {
  const offsets = new Set(geometry.planes.map(range => range.offset * 4));
  return updates.slice(from).filter(update => offsets.has(update.offset));
}
function xyzUV(values, offset = 0, count = values.length) {
  const result = new Float32Array(count / 6 * 5);
  for (let source = offset, target = 0; source < offset + count; source += 6, target += 5) result.set(values.subarray(source, source + 5), target);
  return result;
}

describe('Universe close spiral disk handoff', () => {
  it('uses the source disk frame under rotation, translation, and mirrored viewing positions', () => {
    for (const [tilt, turn] of [[0, 0], [0.88, -0.22], [-1.12, 2.41], [Math.PI / 2, -Math.PI / 3]]) {
      const model = { ...MODEL, tilt, turn };
      for (const [x, height, z] of [[0.2, 0.005, 0.3], [0.6, 0.03, 0.1], [1.17, 0.03, 0], [0.2, 0.06, 0.3], [1.5, 0, 0]]) {
        const expected = expectedMarker(Math.hypot(x, z), height);
        for (const sign of [-1, 1]) {
          expect(helpers.spiralPlaneMarker(model, observer(model, sign * x, sign * height, sign * z))).toBeCloseTo(expected, 7);
        }
      }
    }
  });

  it('transitions smoothly only inside the radial footprint and within one to four source vertical sigmas', () => {
    const model = { ...MODEL, center: [0, 0, 0], tilt: 0, turn: 0 };
    const heights = [0, 0.006, 0.012, 0.015, 0.021, 0.03, 0.039, 0.045, 0.048, 0.06];
    const vertical = heights.map(height => helpers.spiralPlaneMarker(model, observer(model, 0.6, height)));
    expect(vertical.slice(0, 3)).toEqual([0.5, 0.5, 0.5]);
    expect(vertical[5]).toBeCloseTo(0.25, 7); expect(vertical.slice(-2)).toEqual([0, 0]);
    for (let i = 1; i < vertical.length; i++) expect(vertical[i]).toBeLessThanOrEqual(vertical[i - 1]);
    const radii = [0, 0.5, 1.12, 1.13, 1.15, 1.17, 1.19, 1.21, 1.22, 2, 6];
    const radial = radii.map(radius => helpers.spiralPlaneMarker(model, observer(model, radius, 0)));
    expect(radial.slice(0, 3)).toEqual([0.5, 0.5, 0.5]); expect(radial[5]).toBeCloseTo(0.25, 7);
    expect(radial.slice(-3)).toEqual([0, 0, 0]);
    for (let i = 1; i < radial.length; i++) expect(radial[i]).toBeLessThanOrEqual(radial[i - 1]);
    // Verify both joins have a vanishing slope, avoiding a hard brightness step.
    for (const edge of [0.012, 0.048]) {
      const values = [-1e-5, 0, 1e-5].map(delta => helpers.spiralPlaneMarker(model, observer(model, 0.6, edge + delta)));
      expect(Math.abs(values[2] - values[0]) / 2e-5).toBeLessThan(0.02);
    }
    for (const radius of [0.1, 1.17, 3]) {
      for (const height of [0, 0.03, 0.1]) {
        const marker = helpers.spiralPlaneMarker(model, observer(model, radius, height));
        expect(marker).toBeGreaterThanOrEqual(0); expect(marker).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('keeps all accepted geometry bytes and adds plane metadata only for spiral styles', () => {
    const models = ['spiral', 'two-arm', 'barred', 'elliptical'].map((style, i) => ({ ...MODEL, center: [i * 1000000, 0, 0], style, elliptical: style === 'elliptical' }));
    const geometry = helpers.galaxyGeometry(models);
    expect(geometry.planes.map(range => range.model.style)).toEqual(['spiral', 'two-arm', 'barred']);
    expect(geometry.ellipticals).toHaveLength(1); expect(geometry.bulges).toHaveLength(3); expect(geometry.disks).toHaveLength(3);
    expect(geometry.points).toHaveLength((4 + 3 + 3) * 2304);
    for (const [index, range] of geometry.planes.entries()) {
      expect(range.offset).toBe(index * 2304); expect(range.count).toBe(2304); expect(range.marker).toBe(0);
      for (let offset = range.offset + 5; offset < range.offset + range.count; offset += 6) expect(geometry.points[offset]).toBe(0);
    }
    if (baseline) expect(hash(geometry.points)).toBe(hash(baseline.galaxyGeometry(models).points));
    for (const [region, count] of [['neighborhood', 0], ['galaxy', 1], ['cosmic', 88]]) {
      const data = helpers.makeRegion(region), current = helpers.galaxyGeometry(data.galaxies);
      expect(current.planes).toHaveLength(count);
      if (baseline) {
        const original = baseline.makeRegion(region);
        expect(hash(data.points)).toBe(hash(original.points));
        expect(hash(current.points)).toBe(hash(baseline.galaxyGeometry(original.galaxies).points));
      }
    }
  });

  it('changes only layer markers, caches quantized values, and restores exterior plane bytes', () => {
    for (const style of ['spiral', 'two-arm', 'barred']) {
      const model = { ...MODEL, style }, geometry = helpers.galaxyGeometry([model]), range = geometry.planes[0];
      const original = geometry.points.slice(), oldXYZUV = hash(xyzUV(original, range.offset, range.count));
      expect(helpers.writeSpiralPlane(geometry.points, range, observer(model, 0.4, 0.03))).toBe(true);
      expect(range.marker).toBeCloseTo(0.25, 7);
      expect(hash(xyzUV(geometry.points, range.offset, range.count))).toBe(oldXYZUV);
      expect(geometry.points.subarray(range.count)).toEqual(original.subarray(range.count));
      for (let i = range.offset + 5; i < range.offset + range.count; i += 6) expect(geometry.points[i]).toBe(range.marker);
      const accepted = geometry.points.slice();
      expect(helpers.writeSpiralPlane(geometry.points, range, observer(model, 0.5, 0.03))).toBe(false);
      expect(geometry.points).toEqual(accepted);
      expect(helpers.writeSpiralPlane(geometry.points, range, observer(model, 0.5, 0.1))).toBe(true);
      expect(range.marker).toBe(0); expect(geometry.points).toEqual(original);
      expect(helpers.writeSpiralPlane(geometry.points, range, observer(model, 6, 0))).toBe(false);
    }
  });

  it('uploads the flat plane only when its quantized visibility changes and keeps paused look controls cached', () => {
    const data = helpers.makeRegion('galaxy'), model = data.galaxies[0], geometry = helpers.galaxyGeometry(data.galaxies);
    createScene(); const initial = surface().slice(), pointBytes = hash(buffers.get(created.Buffer[0])), fullUploads = uploads.length;
    let count = updates.length; moveTo(observer(model, 0.4, 0.03));
    let changed = planeUpdates(count, geometry); expect(changed).toHaveLength(1);
    expect(changed[0].offset).toBe(0); expect(changed[0].data).toHaveLength(2304);
    expect(changed[0].data[5]).toBeCloseTo(0.25, 7);
    expect(hash(xyzUV(changed[0].data))).toBe(hash(xyzUV(initial, 0, 2304)));
    count = updates.length; moveTo(observer(model, 0.5, 0.03));
    expect(planeUpdates(count, geometry)).toHaveLength(0); expect(updates.length - count).toBe(2);
    const stable = surface().slice(); count = updates.length;
    advance(1000); scene.look(0.3, -0.1); scene.set({ fov: 80, exposure: 1.4, quality: 'low' }); advance();
    expect(surface()).toEqual(stable); expect(updates).toHaveLength(count);
    count = updates.length; moveTo(observer(model, 0.4, 0.1));
    changed = planeUpdates(count, geometry); expect(changed).toHaveLength(1); expect(changed[0].data[5]).toBe(0);
    expect(surface().subarray(0, 2304)).toEqual(initial.subarray(0, 2304));
    expect(hash(buffers.get(created.Buffer[0]))).toBe(pointBytes); expect(uploads).toHaveLength(fullUploads);
  });

  it('preserves elliptical geometry and all other source ranges when the observer enters one cosmic spiral', () => {
    const data = helpers.makeRegion('cosmic'), geometry = helpers.galaxyGeometry(data.galaxies), chosen = geometry.planes[0];
    createScene('cosmic'); const points = hash(buffers.get(created.Buffer[0])), before = surface().slice(), count = updates.length;
    moveTo(observer(chosen.model, 0.08, 0.005));
    const changes = planeUpdates(count, geometry);
    expect(changes.some(change => change.offset === chosen.offset * 4 && change.data[5] === 0.5)).toBe(true);
    for (const change of changes) {
      expect(change.buffer).toBe(created.Buffer[1]); expect(change.data).toHaveLength(2304);
      expect(hash(xyzUV(change.data))).toBe(hash(xyzUV(before, change.offset / 4, change.data.length)));
      expect(change.data[5]).toBeGreaterThanOrEqual(0); expect(change.data[5]).toBeLessThanOrEqual(0.5);
    }
    for (const range of geometry.planes) {
      expect(hash(xyzUV(surface(), range.offset, range.count))).toBe(hash(xyzUV(before, range.offset, range.count)));
    }
    expect(hash(buffers.get(created.Buffer[0]))).toBe(points);
    // Existing projected elliptical/bulge/disk positions still update on movement.
    expect(updates.length - count - changes.length).toBe(222);
  });

  it('keeps the existing GPU objects through near and exterior moves and disposes each once', () => {
    const model = helpers.makeRegion('galaxy').galaxies[0]; createScene();
    const objects = Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()]));
    for (const type of ['Buffer', 'Program', 'Texture']) expect(objects[type]).toHaveLength(2);
    expect(objects.Shader).toHaveLength(4);
    for (const [radial, height] of [[0.08, 0], [0.3, 0.03], [0.4, 0.1], [3, 0]]) moveTo(observer(model, radial, height));
    expect(created).toEqual(objects); scene.dispose(); scene.dispose();
    for (const [type, items] of Object.entries(objects)) {
      expect(deleted[type]).toHaveLength(items.length);
      for (const item of items) expect(deleted[type].filter(resource => resource === item)).toHaveLength(1);
    }
    expect(frames.size).toBe(0);
  });
});
