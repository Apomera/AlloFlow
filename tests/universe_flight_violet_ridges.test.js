import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

let flight, scene, canvas, now, frames, frameId, pointBuffer, pointProgram, telemetry;
let buffers, uploads, updates, draws, uniforms, constants, attributes, created, deleted;
const VIOLET = { first: 9070, count: 430, center: [-22, 11, 83] };
// The viewing axis of the existing violet reveal, pinned as a depth contract.
const REVEAL_AXIS = [0, 0.5150839655301299, -0.8571397251637307];
// Pinned from the accepted renderer before violet ridge remapping.
// Only the three position floats in each of the 430 violet records may change.
const BASELINE = {
  "before": "5f244e93539d1b2f03dbe6b394c4fcfb63865d4a5d219c253853d25c95f90519",
  "after": "095d4c5c90938d7418e5059c581a0c56188e597ce672bb31cc7382ccce6fa075",
  "attributes": "b70c4fe9cfd66efe9cce93b3a77d42f24eb0ee3efdc68395a1adbfe84927c603",
  "positions": "5b21d8dad29550d93d1d7b6f286381a4b9618e543f4d9e4780c3b6d58d972203",
  "blue": "3987f23b4ff4b19676e630c58d053384f9c4e310e0036a056f46fce6065a0443",
  "galaxy": "f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab",
  "cosmic": "156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85"
};
const hash = values => createHash('sha256').update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)).digest('hex');
const copy = value => ArrayBuffer.isView(value) || Array.isArray(value) ? Array.from(value) : value;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  now = 100; frameId = 0; frames = new Map(); pointBuffer = null; pointProgram = null; telemetry = null;
  buffers = new Map(); uploads = []; updates = []; draws = [];
  uniforms = new Map(); constants = new Map(); attributes = new Map();
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
  const bindings = new Map(); let currentProgram = null;
  const gl = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getParameter') return () => [1, 256];
      if (key === 'getAttribLocation') return (program, name) => {
        if (!attributes.has(program)) attributes.set(program, new Map());
        const locations = attributes.get(program);
        if (!locations.has(name)) locations.set(name, locations.size);
        if (name === 'a_cloud') pointProgram = program;
        return locations.get(name);
      };
      if (key === 'getUniformLocation') return (program, name) => ({ program, name });
      if (/^uniform[1234][fi](v)?$/.test(key)) return (location, ...values) => {
        if (!uniforms.has(location.program)) uniforms.set(location.program, {});
        uniforms.get(location.program)[location.name] = values.length === 1 ? copy(values[0]) : values;
      };
      if (key === 'useProgram') return program => { currentProgram = program; };
      if (key === 'bindBuffer') return (target, buffer) => bindings.set(target, buffer);
      if (key === 'bufferData') return (target, values) => {
        const buffer = bindings.get(target), data = new Float32Array(values);
        buffers.set(buffer, data); uploads.push({ buffer, data: data.slice() });
      };
      if (key === 'bufferSubData') return (target, offset, values) => {
        const buffer = bindings.get(target), data = new Float32Array(values);
        updates.push({ buffer, offset, data: data.slice() }); buffers.get(buffer).set(data, offset / 4);
      };
      if (key === 'drawArrays') return (mode, first, count) => {
        draws.push({ program: currentProgram, mode, first, count, uniforms: structuredClone(uniforms.get(currentProgram) || {}) });
      };
      const operation = String(key).match(/^(create|delete)(Buffer|Program|Texture|Shader)$/);
      if (operation) return resource => {
        if (operation[1] === 'create') {
          const item = { type: operation[2], index: created[operation[2]].length };
          created[operation[2]].push(item);
          if (operation[2] === 'Buffer' && pointBuffer === null) pointBuffer = item;
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
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
  canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,');
  scene = flight.create(canvas, { onTelemetry: value => { telemetry = value; } }); advance();
});

afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

function advance(milliseconds = 16) {
  now += milliseconds;
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
}
function points() { return buffers.get(pointBuffer); }
function violetRecords() { return points().subarray(VIOLET.first * 9, (VIOLET.first + VIOLET.count) * 9); }
function capturePoints() {
  const start = draws.length; scene.capture();
  const calls = draws.slice(start).filter(call => call.program === pointProgram && call.mode === constants.get('POINTS'));
  expect(calls).toHaveLength(1);
  for (const value of Object.values(calls[0].uniforms)) {
    expect(Array.isArray(value) ? value.every(Number.isFinite) : Number.isFinite(value)).toBe(true);
  }
  return calls[0];
}
function resources() { return Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()])); }
function expectReleased() {
  for (const type of Object.keys(created)) {
    expect(deleted[type]).toHaveLength(created[type].length);
    for (const item of created[type]) expect(deleted[type].filter(resource => resource === item)).toHaveLength(1);
  }
}

describe('Universe fixed violet emission ridges', () => {
  it('changes only the 430 violet positions while preserving all other records and their six source attributes', () => {
    const data = points(), violet = violetRecords(), attributes = new Float32Array(VIOLET.count * 6), positions = new Float32Array(VIOLET.count * 3);
    expect(data).toHaveLength(19203 * 9); expect(violet).toHaveLength(VIOLET.count * 9);
    expect(hash(data.subarray(0, VIOLET.first * 9))).toBe(BASELINE.before);
    expect(hash(data.subarray((VIOLET.first + VIOLET.count) * 9))).toBe(BASELINE.after);
    for (let index = 0; index < VIOLET.count; index++) {
      attributes.set(violet.subarray(index * 9 + 3, index * 9 + 9), index * 6);
      positions.set(violet.subarray(index * 9, index * 9 + 3), index * 3);
    }
    expect(hash(positions)).not.toBe(BASELINE.positions);
    expect(hash(data.subarray(8500 * 9, 9070 * 9))).toBe(BASELINE.blue);
    expect(hash(attributes)).toBe(BASELINE.attributes);
    expect(Array.from(data).every(Number.isFinite)).toBe(true);
    expect(capturePoints().count).toBe(19203);
  });

  it('keeps all ridge emission inside the survey standoff with substantial depth in every axis', () => {
    const violet = violetRecords(), radii = [], depths = [], minima = [Infinity, Infinity, Infinity], maxima = [-Infinity, -Infinity, -Infinity];
    for (let index = 0; index < violet.length; index += 9) {
      const relative = VIOLET.center.map((value, axis) => violet[index + axis] - value);
      const radius = Math.hypot(...relative); radii.push(radius);
      depths.push(relative.reduce((sum, value, axis) => sum + value * REVEAL_AXIS[axis], 0));
      expect(radius).toBeLessThan(32);
      // The existing survey standoff must remain outside the cloud, even when
      // conservatively adding each sprite's full size to its center radius.
      expect(radius + violet[index + 6]).toBeLessThan(32);
      expect(violet[index + 8]).toBeGreaterThanOrEqual(5);
      relative.forEach((value, axis) => { minima[axis] = Math.min(minima[axis], value); maxima[axis] = Math.max(maxima[axis], value); });
    }
    for (let axis = 0; axis < 3; axis++) expect(maxima[axis] - minima[axis]).toBeGreaterThan(8);
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(2);
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(8);
  });

  it('keeps source geometry fixed through native approach, orbit, pause and manual viewing', () => {
    const geometry = points().slice(), objects = resources(), uploadCount = uploads.length, updateCount = updates.length;
    scene.set({ mode: 'explore', speed: 50 });
    expect(scene.navigateTo('violet-nebula')).toBe(true); advance();
    for (let index = 0; index < 40 && telemetry.running; index++) advance(100);
    const arrived = scene.snapshot();
    expect(telemetry.running).toBe(false); expect(telemetry.navigation.completed).toBe(true); expect(arrived.targetId).toBe('violet-nebula');
    expect(Math.hypot(...arrived.state.position.map((value, axis) => value - VIOLET.center[axis]))).toBeCloseTo(32, 6);
    expect(scene.startOrbit('violet-nebula')).toBe(true); advance(); const start = scene.snapshot();
    for (let index = 0; index < 10; index++) advance(100);
    expect(scene.snapshot().state.position).not.toEqual(start.state.position);
    scene.set({ running: false }); advance(); const paused = scene.snapshot(), frozen = capturePoints();
    advance(1000); expect(scene.snapshot()).toEqual(paused); expect(capturePoints()).toEqual(frozen);
    scene.look(0.16, -0.1); scene.set({ fov: 38, exposure: 1.3, quality: 'low' }); advance();
    expect(capturePoints().uniforms.u_forward).not.toEqual(frozen.uniforms.u_forward);
    expect(scene.snapshot().state.position).toEqual(paused.state.position);
    expect(scene.snapshot().state.universeYears).toBe(0); expect(scene.snapshot().state.travelerYears).toBe(0);
    expect(points()).toEqual(geometry); expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount); expect(resources()).toEqual(objects);
  });

  it('regenerates the same ridges after other regions and restores paused observer poses amid the emission', () => {
    const geometry = points().slice(), objects = resources(), saved = scene.snapshot();
    saved.state.position = VIOLET.center.slice(); saved.targetId = 'violet-nebula';
    saved.settings = { ...saved.settings, mode: 'relativity', beta: 0.9999, compareRest: false };
    expect(scene.restore(saved)).toBe(true); advance(); const reference = capturePoints();
    expect(reference.uniforms.u_beta).toBe(0.9999);
    for (const region of ['galaxy', 'cosmic']) {
      scene.set({ region, running: false }); advance();
      expect(hash(points())).toBe(BASELINE[region]);
      expect(scene.restore(saved)).toBe(true); advance();
      expect(points()).toEqual(geometry); expect(scene.snapshot()).toEqual(saved); expect(capturePoints()).toEqual(reference);
      advance(1000); expect(scene.snapshot()).toEqual(saved); expect(resources()).toEqual(objects);
    }
  });

  it('reopens the same deterministic ridges and deletes each graphics object once without leaving scheduled frames', () => {
    const originalHash = hash(points()), previousPointBuffer = pointBuffer;
    scene.dispose(); scene.dispose(); expectReleased(); expect(frames.size).toBe(0); expect(scene.capture()).toBeNull();
    pointBuffer = null; pointProgram = null;
    scene = flight.create(canvas); advance();
    expect(pointBuffer).not.toBe(previousPointBuffer); expect(hash(points())).toBe(originalHash);
    expect(scene.snapshot().settings.region).toBe('neighborhood'); expect(capturePoints().count).toBe(19203);
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(4);
    scene.dispose(); scene.dispose(); expectReleased(); expect(frames.size).toBe(0);
  });
});
