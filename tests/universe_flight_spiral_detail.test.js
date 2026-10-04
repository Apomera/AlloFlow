import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

let flight, scene, canvas, now, frames, frameId, telemetry;
let buffers, uploads, updates, textureUploads, draws, uniforms, constants, attributes, created, deleted;
let pointBuffer, surfaceBuffer, pointProgram;

// Independently captured from the accepted renderer before the spiral atlas
// detail pass. Barred/elliptical maps, central bulge and cloud atlas stay exact.
// Two-arm refinement is covered by universe_flight_two_arm_detail.test.js.
const ATLAS = {
  tiles: [
    '60458319e79536c603dd275db077bcdb33cc40e76a6987824f6249b90a3c8b79',
    '8a4f1ef140edfc925a3005767207d6f5077bf7cd9d9744b6ed5ce6f65741e642',
    'b4d05f4c47a17ecb92f55fd0aeac4133c239e127689ce7a84a9334b372cdaa26',
    '08f244e4ef3ad6f71eb240e7e9e67410fe82f16a69f1992f27c2f857dcd15d38',
  ],
  core: '3958dbb5ca03df4a60b94664ed7723171dd93d584d28f26623c1b264226ea112',
  gutter: 'ca8a4b28e8b434e231027bf5d9952a7d32014111151ed7e3e2efc0b6fe934a0a',
  cloud: 'b57c6fd38bbb173b026084c3f7977e0a27c8a91bb5446e045cef067a043b2c88',
};
const WORLD = {
  neighborhood: { count: 19203, points: 'f0933322797366fbee8bbdc9ce8d2263700b1c07a71caa1bcfa1224d68edc2a3', surfaceFloats: 0, surface: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  galaxy: { count: 36400, points: 'f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab', surfaceFloats: 1920, surface: 'e97a5ba4db3d27acd2bda8ba417e84c696c7ba32f3b5fd0817d8ba58810890fa' },
  cosmic: { count: 41470, points: '156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85', surfaceFloats: 257280, surface: '102e9fa5c941b24e52de513ac8fb058e749a000ce8ee631740113809bc21253b' },
};
const hash = values => createHash('sha256').update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)).digest('hex');
const copy = value => ArrayBuffer.isView(value) || Array.isArray(value) ? Array.from(value) : value;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  now = 100; frameId = 0; frames = new Map(); telemetry = null;
  buffers = new Map(); uploads = []; updates = []; textureUploads = []; draws = [];
  uniforms = new Map(); constants = new Map(); attributes = new Map();
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
  pointBuffer = null; surfaceBuffer = null; pointProgram = null;
  const bindings = new Map(); let currentProgram = null, texture = null;
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
      if (key === 'bindTexture') return (_target, resource) => { texture = resource; };
      if (key === 'texImage2D') return (_target, level, internalFormat, width, height, border, format, type, source) => {
        textureUploads.push({ texture, level, internalFormat, width, height, border, format, type, source, data: source.slice() });
      };
      if (key === 'drawArrays') return (mode, first, count) => {
        draws.push({ program: currentProgram, mode, first, count, uniforms: structuredClone(uniforms.get(currentProgram) || {}) });
      };
      const operation = String(key).match(/^(create|delete)(Buffer|Program|Texture|Shader)$/);
      if (operation) return resource => {
        if (operation[1] === 'create') {
          const item = { type: operation[2], index: created[operation[2]].length };
          created[operation[2]].push(item);
          if (operation[2] === 'Buffer') {
            if (item.index % 2 === 0) pointBuffer = item;
            else surfaceBuffer = item;
          }
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
function atlas() { return textureUploads.find(item => item.width === 2048); }
function tile(data, index) {
  const result = new Uint8Array(512 * 512 * 4);
  for (let y = 0; y < 512; y++) result.set(data.subarray((y * 2048 + index * 512) * 4, (y * 2048 + (index + 1) * 512) * 4), y * 512 * 4);
  return result;
}
function capture() {
  const start = draws.length; scene.capture(); const calls = draws.slice(start);
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) for (const value of Object.values(call.uniforms)) {
    expect(Array.isArray(value) ? value.every(Number.isFinite) : Number.isFinite(value)).toBe(true);
  }
  return calls;
}
function resources() { return Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()])); }
function expectReleased() {
  for (const type of Object.keys(created)) {
    expect(deleted[type]).toHaveLength(created[type].length);
    for (const item of created[type]) expect(deleted[type].filter(resource => resource === item)).toHaveLength(1);
  }
}

describe('Universe static spiral atlas detail', () => {
  it('uploads a refined spiral map while preserving the original bulge, gutters, two other maps and cloud atlas', () => {
    expect(textureUploads).toHaveLength(2);
    const map = atlas(), data = map.data;
    expect(map).toMatchObject({ width: 2048, height: 512, level: 0, border: 0 });
    expect(data).toHaveLength(4194304);
    expect(hash(tile(data, 0))).not.toBe(ATLAS.tiles[0]);
    for (let index = 2; index < 4; index++) expect(hash(tile(data, index))).toBe(ATLAS.tiles[index]);
    const core = [], gutter = [];
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const px = ((x - 8) / 495 * 2 - 1) * 1.22, pz = ((y - 8) / 495 * 2 - 1) * 1.22;
      const offset = (y * 2048 + x) * 4;
      if (x >= 8 && x < 504 && y >= 8 && y < 504 && Math.hypot(px, pz) < 0.18) core.push(...data.subarray(offset, offset + 4));
      if (x < 8 || x >= 504 || y < 8 || y >= 504) gutter.push(...data.subarray(offset, offset + 4));
    }
    expect(core).toHaveLength(16768); expect(hash(new Uint8Array(core))).toBe(ATLAS.core);
    expect(gutter).toHaveLength(64512); expect(hash(new Uint8Array(gutter))).toBe(ATLAS.gutter);
    expect(gutter.every(value => value === 0)).toBe(true);
    const cloud = textureUploads.find(item => item.width === 512);
    expect(cloud).toMatchObject({ width: 512, height: 128 });
    expect(hash(cloud.data)).toBe(ATLAS.cloud);
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(2);
    expect(created.Shader).toHaveLength(4);
  });

  it('keeps every generated point and original galaxy surface exact across regions without rebuilding either atlas', () => {
    const maps = textureUploads.map(item => ({ source: item.source, hash: hash(item.data) })), objects = resources();
    for (const [region, expected] of Object.entries(WORLD)) {
      scene.set({ region, running: false }); advance();
      const points = uploads.findLast(item => item.buffer === pointBuffer).data;
      const surfaces = uploads.findLast(item => item.buffer === surfaceBuffer).data;
      expect(points).toHaveLength(expected.count * 9); expect(hash(points)).toBe(expected.points);
      expect(surfaces).toHaveLength(expected.surfaceFloats + 30);
      expect(hash(surfaces.subarray(0, expected.surfaceFloats))).toBe(expected.surface);
      expect(capture().find(item => item.program === pointProgram && item.mode === constants.get('POINTS')).count).toBe(expected.count);
    }
    expect(textureUploads).toHaveLength(2); expect(resources()).toEqual(objects);
    textureUploads.forEach((item, index) => { expect(item.source).toBe(maps[index].source); expect(hash(item.source)).toBe(maps[index].hash); });
  });

  it('retains fixed geometry and atlas uploads through native spiral approach, orbit, pause and manual viewing', () => {
    scene.set({ region: 'galaxy', mode: 'explore', speed: 50000 }); advance();
    const pointHash = hash(buffers.get(pointBuffer)), objects = resources(), uploadCount = uploads.length, updateCount = updates.length;
    expect(scene.navigateTo('galactic-center')).toBe(true); advance();
    for (let index = 0; index < 80 && telemetry.running; index++) advance(100);
    const arrived = scene.snapshot();
    expect(telemetry.running).toBe(false); expect(telemetry.navigation.completed).toBe(true);
    expect(arrived.targetId).toBe('galactic-center'); expect(Math.hypot(...arrived.state.position)).toBeCloseTo(18000, 6);
    expect(scene.startOrbit('galactic-center')).toBe(true); advance(); const start = scene.snapshot();
    for (let index = 0; index < 10; index++) advance(100);
    expect(scene.snapshot().state.position).not.toEqual(start.state.position);
    scene.set({ running: false }); advance(); const paused = scene.snapshot(), pausedDraw = capture();
    advance(1000); expect(scene.snapshot()).toEqual(paused); expect(capture()).toEqual(pausedDraw);
    scene.look(0.16, -0.1); scene.set({ fov: 38, exposure: 1.3, quality: 'low' }); advance();
    expect(capture()[0].uniforms.u_forward).not.toEqual(pausedDraw[0].uniforms.u_forward);
    expect(scene.snapshot().state.position).toEqual(paused.state.position);
    expect(scene.snapshot().state.universeYears).toBe(0); expect(scene.snapshot().state.travelerYears).toBe(0);
    expect(hash(buffers.get(pointBuffer))).toBe(pointHash);
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount);
    expect(textureUploads).toHaveLength(2); expect(resources()).toEqual(objects);
  });

  it('keeps physical viewing uniforms finite at extreme beta and restores a paused spiral pose after region changes', () => {
    scene.set({ region: 'galaxy', mode: 'relativity', beta: 0.9999, compareRest: false, running: false }); advance();
    const saved = scene.snapshot();
    saved.state.position = [0, 0, 0]; saved.state.yaw = 0; saved.state.pitch = 1.2;
    expect(scene.restore(saved)).toBe(true); advance(); const reference = capture();
    expect(reference.find(item => item.program === pointProgram).uniforms.u_beta).toBe(0.9999);
    const objects = resources();
    for (const region of ['neighborhood', 'cosmic']) {
      scene.set({ region, running: false }); advance(); capture();
      expect(scene.restore(saved)).toBe(true); advance();
      expect(scene.snapshot()).toEqual(saved); expect(capture()).toEqual(reference);
      advance(1000); expect(scene.snapshot()).toEqual(saved);
      expect(hash(buffers.get(pointBuffer))).toBe(WORLD.galaxy.points);
    }
    expect(textureUploads).toHaveLength(2); expect(resources()).toEqual(objects);
  });

  it('reuses the cached CPU maps on reopening and deletes every graphics object once without leaving scheduled frames', () => {
    const original = textureUploads.map(item => ({ source: item.source, hash: hash(item.data) }));
    const previousPointBuffer = pointBuffer;
    scene.dispose(); scene.dispose(); expectReleased(); expect(frames.size).toBe(0); expect(scene.capture()).toBeNull();
    scene = flight.create(canvas); advance();
    expect(pointBuffer).not.toBe(previousPointBuffer); expect(textureUploads).toHaveLength(4);
    original.forEach((item, index) => {
      expect(textureUploads[index + 2].source).toBe(item.source);
      expect(hash(textureUploads[index + 2].data)).toBe(item.hash);
    });
    expect(hash(buffers.get(pointBuffer))).toBe(WORLD.neighborhood.points);
    expect(capture().find(item => item.mode === constants.get('POINTS')).count).toBe(WORLD.neighborhood.count);
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(4);
    expect(created.Shader).toHaveLength(8);
    scene.dispose(); scene.dispose(); expectReleased(); expect(frames.size).toBe(0);
  });
});
