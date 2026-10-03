import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

let flight, scene, canvas, now, frames, frameId, pointBuffer, pointProgram, telemetry;
let buffers, uploads, updates, draws, uniforms, constants, attributes, created, deleted;
const BLUE = { first: 8500, count: 570, center: [9, -2, 34] };
// Pinned from the previous renderer. These hashes exclude only the three
// intentionally replaced position floats of the 570 blue emission records.
const BASELINE = {
  before: '9183389c90a3a74cd4d58778f0a13615dd0c7c8d9d20b8d90dad2272ee801e79',
  after: '9f86101b392e560fab03009e3d9465df4251bfeaa706bfad40b1bbdc8796f574',
  attributes: '6d0adac86a0586962e078a0936db66bc9a43af7f9d1c11e96d1156a5c7cc15a3',
  galaxy: 'f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab',
  cosmic: '156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85',
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
function blueRecords() { return points().subarray(BLUE.first * 9, (BLUE.first + BLUE.count) * 9); }
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

describe('Universe fixed blue emission shell', () => {
  it('changes only the 570 blue positions while preserving all other records and their six source attributes', () => {
    const data = points(), blue = blueRecords(), attributes = new Float32Array(BLUE.count * 6);
    expect(data).toHaveLength(19203 * 9); expect(blue).toHaveLength(BLUE.count * 9);
    expect(hash(data.subarray(0, BLUE.first * 9))).toBe(BASELINE.before);
    expect(hash(data.subarray((BLUE.first + BLUE.count) * 9))).toBe(BASELINE.after);
    for (let index = 0; index < BLUE.count; index++) attributes.set(blue.subarray(index * 9 + 3, index * 9 + 9), index * 6);
    expect(hash(attributes)).toBe(BASELINE.attributes);
    expect(Array.from(data).every(Number.isFinite)).toBe(true);
    expect(capturePoints().count).toBe(19203);
  });

  it('surrounds an empty central cavity with bounded emission and substantial depth in every axis', () => {
    const blue = blueRecords(), octants = new Set(), radii = [], minima = [Infinity, Infinity, Infinity], maxima = [-Infinity, -Infinity, -Infinity];
    for (let index = 0; index < blue.length; index += 9) {
      const relative = BLUE.center.map((value, axis) => blue[index + axis] - value);
      const radius = Math.hypot(...relative); radii.push(radius);
      expect(radius).toBeGreaterThan(3); expect(radius).toBeLessThanOrEqual(14);
      // The existing survey standoff must remain outside the cloud, even when
      // conservatively adding each sprite's full size to its center radius.
      expect(radius + blue[index + 6]).toBeLessThan(20);
      expect(blue[index + 8]).toBeGreaterThanOrEqual(5);
      octants.add(relative.map(value => value < 0 ? 0 : 1).join(''));
      relative.forEach((value, axis) => { minima[axis] = Math.min(minima[axis], value); maxima[axis] = Math.max(maxima[axis], value); });
    }
    expect(octants.size).toBe(8);
    for (let axis = 0; axis < 3; axis++) expect(maxima[axis] - minima[axis]).toBeGreaterThan(10);
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(2);
  });

  it('keeps source geometry fixed through native approach, orbit, pause and manual viewing', () => {
    const geometry = points().slice(), objects = resources(), uploadCount = uploads.length, updateCount = updates.length;
    scene.set({ mode: 'explore', speed: 50 });
    expect(scene.navigateTo('blue-nebula')).toBe(true); advance();
    for (let index = 0; index < 40 && telemetry.running; index++) advance(100);
    const arrived = scene.snapshot();
    expect(telemetry.running).toBe(false); expect(telemetry.navigation.completed).toBe(true); expect(arrived.targetId).toBe('blue-nebula');
    expect(Math.hypot(...arrived.state.position.map((value, axis) => value - BLUE.center[axis]))).toBeCloseTo(20, 6);
    expect(scene.startOrbit('blue-nebula')).toBe(true); advance(); const start = scene.snapshot();
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

  it('regenerates the same shell after other regions and restores paused observer poses inside the cavity', () => {
    const geometry = points().slice(), objects = resources(), saved = scene.snapshot();
    saved.state.position = BLUE.center.slice(); saved.targetId = 'blue-nebula';
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

  it('reopens the same deterministic shell and deletes each graphics object once without leaving scheduled frames', () => {
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
