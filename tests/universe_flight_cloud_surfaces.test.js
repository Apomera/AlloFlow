import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

let flight, scene, canvas, now, frames, frameId, telemetry, range, dpr, box;
let buffers, uploads, updates, textureUploads, draws, uniforms, constants, attributes, programAttributes, created, deleted;
let pointBuffer, surfaceBuffer, pointProgram;

// Source and atlas pins come from accepted enhancement39, before this surface
// expansion. The new batch repeats existing records; it adds no scenery.
const WORLD = {
  neighborhood: { count: 19203, points: 'f0933322797366fbee8bbdc9ce8d2263700b1c07a71caa1bcfa1224d68edc2a3', surfaceFloats: 0, surface: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  galaxy: { count: 36400, points: 'f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab', surfaceFloats: 1920, surface: 'e97a5ba4db3d27acd2bda8ba417e84c696c7ba32f3b5fd0817d8ba58810890fa' },
  cosmic: { count: 41470, points: '156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85', surfaceFloats: 257280, surface: '102e9fa5c941b24e52de513ac8fb058e749a000ce8ee631740113809bc21253b' },
};
const ATLASES = {
  2048: '7bedb2ee41e173ac302455b9f6b064c1daa5ba60862cf03feb35c2b4750778c3',
  512: 'b57c6fd38bbb173b026084c3f7977e0a27c8a91bb5446e045cef067a043b2c88',
};
const STELLAR_CORNERS = new Float32Array([0, 0, 0, -1, -1, 0, 0, 0, 1, -1, 0, 0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, -1, 1]);
const hash = values => createHash('sha256').update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)).digest('hex');
const copy = value => ArrayBuffer.isView(value) || Array.isArray(value) ? Array.from(value) : value;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  now = 100; frameId = 0; frames = new Map(); telemetry = null; range = 256; dpr = 1; box = { width: 800, height: 500 };
  buffers = new Map(); uploads = []; updates = []; textureUploads = []; draws = [];
  uniforms = new Map(); constants = new Map(); attributes = new Map(); programAttributes = new Map();
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
  pointBuffer = null; surfaceBuffer = null; pointProgram = null;
  const bindings = new Map(); let currentProgram = null, blend = [];
  const gl = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getParameter') return () => [1, range];
      if (key === 'getAttribLocation') return (program, name) => {
        if (!programAttributes.has(program)) programAttributes.set(program, new Map());
        const locations = programAttributes.get(program);
        // Attribute indices are deliberately reused by both linked programs.
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
      if (key === 'blendFunc') return (source, destination) => { blend = [source, destination]; };
      if (key === 'bindBuffer') return (target, buffer) => bindings.set(target, buffer);
      if (key === 'bufferData') return (target, value) => {
        const buffer = bindings.get(target), data = new Float32Array(value);
        buffers.set(buffer, data); uploads.push({ buffer, data: data.slice() });
      };
      if (key === 'bufferSubData') return (target, offset, value) => {
        const buffer = bindings.get(target), data = new Float32Array(value);
        updates.push({ buffer, offset, data: data.slice() }); buffers.get(buffer).set(data, offset / 4);
      };
      if (key === 'texImage2D') return (_target, _level, _internal, width, height, _border, _format, _type, source) => {
        textureUploads.push({ width, height, source, data: source.slice() });
      };
      if (key === 'enableVertexAttribArray' || key === 'disableVertexAttribArray') return location => {
        attributes.set(location, { ...attributes.get(location), enabled: key.startsWith('enable') });
      };
      if (key === 'vertexAttribPointer') return (location, size, type, normalized, stride, offset) => {
        attributes.set(location, { ...attributes.get(location), buffer: bindings.get(constants.get('ARRAY_BUFFER')), size, type, normalized, stride, offset });
      };
      if (/^vertexAttrib[1234]f(v)?$/.test(key)) return (location, ...values) => {
        attributes.set(location, { ...attributes.get(location), constant: values.length === 1 ? copy(values[0]) : values });
      };
      if (key === 'drawArrays') return (mode, first, count) => {
        const named = Object.fromEntries([...programAttributes.get(currentProgram)].map(([name, location]) => [name, { ...attributes.get(location), constant: copy(attributes.get(location)?.constant) }]));
        draws.push({ program: currentProgram, mode, first, count, blend: blend.slice(), attributes: named, uniforms: structuredClone(uniforms.get(currentProgram) || {}) });
      };
      const operation = String(key).match(/^(create|delete)(Buffer|Program|Texture|Shader)$/);
      if (operation) return resource => {
        if (operation[1] === 'create') {
          const item = { type: operation[2], index: created[operation[2]].length }; created[operation[2]].push(item);
          if (operation[2] === 'Buffer') { if (item.index % 2 === 0) pointBuffer = item; else surfaceBuffer = item; }
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
  vi.spyOn(window, 'devicePixelRatio', 'get').mockImplementation(() => dpr);
  canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockImplementation(() => box);
  vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,');
  scene = flight.create(canvas, { onTelemetry: value => { telemetry = value; } }); advance();
});

afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });
function advance(milliseconds = 16) {
  now += milliseconds; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
}
function capture() { const start = draws.length; scene.capture(); return draws.slice(start); }
function pointDraw(calls) { return calls.find(item => item.program === pointProgram && item.mode === constants.get('POINTS')); }
function cloudDraws(calls) { return calls.filter(item => item.program === pointProgram && item.mode === constants.get('TRIANGLES') && item.uniforms.u_cloudQuad === 1); }
function latest(buffer) { return uploads.findLast(item => item.buffer === buffer).data; }
function objects() { return Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()])); }
function pose(position, options = {}) {
  const saved = scene.snapshot();
  saved.settings = { ...saved.settings, mode: 'explore', region: 'neighborhood', ...options.settings };
  saved.state = { ...saved.state, position: position.slice(), yaw: 0, pitch: 0, ...options.state };
  saved.targetId = options.targetId || 'blue-nebula';
  expect(scene.restore(saved)).toBe(true); advance();
}
function assertPointArrays(call) {
  for (const [name, size, offset] of [['position', 3, 0], ['color', 3, 12], ['size', 1, 24], ['light', 1, 28], ['cloud', 1, 32]]) {
    expect(call.attributes['a_' + name]).toMatchObject({ enabled: true, buffer: pointBuffer, size, stride: 36, offset });
  }
  expect(call.attributes.a_corner.enabled).toBe(false);
  expect(call.uniforms.u_cloudQuad).toBe(0); expect(call.uniforms.u_stellarQuad).toBe(0);
  expect(call.blend).toEqual([constants.get('ONE'), constants.get('ONE')]);
}
function released() {
  for (const [type, items] of Object.entries(created)) {
    expect(deleted[type]).toHaveLength(items.length);
    for (const item of items) expect(deleted[type].filter(resource => resource === item)).toHaveLength(1);
  }
}

describe('Universe projected cloud surfaces', () => {
  it('preserves every world and atlas and repeats exactly the 1000 local cloud records in a static suffix', () => {
    const resources = objects(), maps = textureUploads.map(item => ({ width: item.width, source: item.source, hash: hash(item.data) }));
    expect(maps).toHaveLength(2); for (const item of maps) expect(item.hash).toBe(ATLASES[item.width]);
    for (const [region, expected] of Object.entries(WORLD)) {
      scene.set({ region, running: false }); advance();
      const points = latest(pointBuffer), surfaces = latest(surfaceBuffer), suffix = surfaces.subarray(expected.surfaceFloats + 30);
      expect(points).toHaveLength(expected.count * 9); expect(hash(points)).toBe(expected.points);
      expect(hash(surfaces.subarray(0, expected.surfaceFloats))).toBe(expected.surface);
      expect(surfaces.subarray(expected.surfaceFloats, expected.surfaceFloats + 30)).toEqual(STELLAR_CORNERS);
      expect(suffix).toHaveLength(region === 'neighborhood' ? 66000 : 0);
      if (region !== 'neighborhood') continue;
      const sourceIndices = []; for (let index = 0; index < points.length; index += 9) if (points[index + 8] >= 5) sourceIndices.push(index / 9);
      expect(sourceIndices).toHaveLength(1000); expect(sourceIndices).toEqual(Array.from({ length: 1000 }, (_, index) => index + 8500));
      const expectedCorners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let index = 0; index < 1000; index++) for (let vertex = 0; vertex < 6; vertex++) {
        const offset = (index * 6 + vertex) * 11;
        expect(suffix.subarray(offset, offset + 9)).toEqual(points.subarray(sourceIndices[index] * 9, sourceIndices[index] * 9 + 9));
        expect(Array.from(suffix.subarray(offset + 9, offset + 11))).toEqual(expectedCorners[vertex]);
      }
      expect(Array.from(suffix).every(Number.isFinite)).toBe(true);
    }
    expect(textureUploads).toHaveLength(2); expect(objects()).toEqual(resources);
    textureUploads.forEach((item, index) => { expect(item.source).toBe(maps[index].source); expect(hash(item.source)).toBe(maps[index].hash); });
  });

  it('uses one additive cloud batch with source attributes and restores the named-star and point paths', () => {
    pose([-3.1, 1, 7.9], { targetId: 'amber-star' });
    const calls = capture(), batches = cloudDraws(calls);
    expect(batches).toHaveLength(1); const batch = batches[0];
    expect(batch.first).toBe(0); expect(batch.count).toBe(6000);
    expect(batch.blend).toEqual([constants.get('ONE'), constants.get('ONE')]); expect(batch.uniforms.u_stellarQuad).toBe(0);
    for (const [name, size, offset] of [['position', 3, 0], ['color', 3, 12], ['size', 1, 24], ['light', 1, 28], ['cloud', 1, 32], ['corner', 2, 36]]) {
      expect(batch.attributes['a_' + name]).toMatchObject({ enabled: true, buffer: surfaceBuffer, size, stride: 44, offset: 120 + offset });
    }
    const stars = calls.filter(item => item.program === pointProgram && item.mode === constants.get('TRIANGLES') && item.uniforms.u_stellarQuad === 1);
    expect(stars.length).toBeGreaterThan(0); expect(stars.length).toBeLessThanOrEqual(3);
    for (const star of stars) { expect(star.uniforms.u_cloudQuad).toBe(0); expect(star.count).toBe(6); expect(star.attributes.a_position.enabled).toBe(false); }
    assertPointArrays(pointDraw(calls)); assertPointArrays(pointDraw(capture()));
    expect(calls.filter(item => item.program === pointProgram).length).toBe(2 + stars.length);
    for (const region of ['galaxy', 'cosmic']) {
      scene.set({ region, running: false }); advance(); const other = capture();
      expect(cloudDraws(other)).toHaveLength(0); assertPointArrays(pointDraw(other));
      for (const call of other) expect(call.blend).toEqual([constants.get('ONE'), constants.get('ONE')]);
    }
  });

  it('scales the cloud cap with DPR beyond hardware point limits and keeps extreme observer poses finite', () => {
    scene.dispose(); range = 32; dpr = 2;
    scene = flight.create(canvas); scene.set({ quality: 'high' }); advance();
    pose([9, -2, 14], { settings: { quality: 'high', fov: 30 } });
    const high = pointDraw(capture()); expect(high.uniforms.u_pointMax).toBe(32); expect(high.uniforms.u_dpr).toBe(2);
    expect(high.uniforms.u_cloudQuadMax).toBe(768);
    scene.set({ quality: 'low' }); advance(); const low = pointDraw(capture());
    expect(low.uniforms.u_dpr).toBe(0.85); expect(low.uniforms.u_cloudQuadMax).toBeCloseTo(326.4, 10);
    const record = latest(pointBuffer).subarray(8500 * 9, 8500 * 9 + 9), center = Array.from(record.subarray(0, 3));
    // These draw records verify bounded inputs; shader clipping and brightness
    // continuity are verified by the actual WebGL browser captures.
    for (const options of [
      { position: center, settings: { mode: 'relativity', beta: 0.9999 } },
      { position: center.map((value, axis) => value - (axis === 2 ? 1e-7 : 0)), settings: { mode: 'relativity', beta: 0.9999, fov: 30 } },
      { position: [9, -2, 14], state: { yaw: Math.PI } },
      { position: [9, -2, 14], state: { yaw: Math.PI / 2, pitch: 0.4 } },
    ]) {
      pose(options.position, options);
      for (const call of capture()) {
        for (const value of Object.values(call.uniforms)) expect(Array.isArray(value) ? value.every(Number.isFinite) : Number.isFinite(value)).toBe(true);
        const maximum = call.uniforms.u_cloudQuadMax, pointMaximum = Math.min(60 * call.uniforms.u_dpr, call.uniforms.u_pointMax);
        expect(maximum).toBeGreaterThanOrEqual(pointMaximum);
        expect(maximum).toBeLessThanOrEqual(Math.max(pointMaximum, 2 * Math.max(canvas.width, canvas.height)));
      }
    }
    expect(hash(latest(pointBuffer))).toBe(WORLD.neighborhood.points);
  });

  it('keeps native cloud approach, orbit, pause and lens changes independent of source uploads and clocks', () => {
    const geometry = buffers.get(pointBuffer).slice(), surfaces = buffers.get(surfaceBuffer).slice(), resources = objects();
    const uploadCount = uploads.length, updateCount = updates.length, atlasUploads = textureUploads.length;
    scene.set({ mode: 'explore', speed: 50 }); expect(scene.navigateTo('blue-nebula')).toBe(true); advance();
    for (let index = 0; index < 60 && telemetry.running; index++) advance(100);
    expect(telemetry.navigation.completed).toBe(true); expect(telemetry.running).toBe(false);
    expect(Math.hypot(...scene.snapshot().state.position.map((value, axis) => value - [9, -2, 34][axis]))).toBeCloseTo(20, 6);
    expect(scene.startOrbit('blue-nebula')).toBe(true); advance(); const start = scene.snapshot();
    for (let index = 0; index < 10; index++) advance(100);
    expect(scene.snapshot().state.position).not.toEqual(start.state.position);
    scene.set({ running: false }); advance(); const paused = scene.snapshot(), reference = capture();
    advance(1000); expect(scene.snapshot()).toEqual(paused); expect(capture()).toEqual(reference);
    expect(cloudDraws(reference)).toHaveLength(1);
    scene.look(0.18, -0.12); scene.set({ fov: 35, exposure: 1.3, quality: 'low' }); advance();
    expect(scene.snapshot().state.position).toEqual(paused.state.position);
    expect(scene.snapshot().state.universeYears).toBe(0); expect(scene.snapshot().state.travelerYears).toBe(0);
    expect(pointDraw(capture()).uniforms.u_forward).not.toEqual(pointDraw(reference).uniforms.u_forward);
    expect(buffers.get(pointBuffer)).toEqual(geometry); expect(buffers.get(surfaceBuffer)).toEqual(surfaces);
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount); expect(textureUploads).toHaveLength(atlasUploads); expect(objects()).toEqual(resources);
  });

  it('restores the same batch after other scenes, reuses cached atlases on reopen and releases every object once', () => {
    pose([9, -2, 34]); const saved = scene.snapshot(), reference = capture(), geometry = buffers.get(pointBuffer).slice();
    const resources = objects(), maps = textureUploads.map(item => ({ width: item.width, source: item.source }));
    for (const region of ['galaxy', 'cosmic']) {
      scene.set({ region, running: false }); advance(); expect(hash(latest(pointBuffer))).toBe(WORLD[region].points);
      expect(cloudDraws(capture())).toHaveLength(0);
      expect(scene.restore(saved)).toBe(true); advance(); expect(scene.snapshot()).toEqual(saved); expect(capture()).toEqual(reference);
      expect(buffers.get(pointBuffer)).toEqual(geometry); expect(objects()).toEqual(resources);
    }
    scene.dispose(); scene.dispose(); released(); expect(frames.size).toBe(0); expect(scene.capture()).toBeNull();
    scene = flight.create(canvas); advance();
    expect(hash(latest(pointBuffer))).toBe(WORLD.neighborhood.points); expect(cloudDraws(capture())).toHaveLength(1);
    for (const item of textureUploads.slice(-2)) expect(item.source).toBe(maps.find(map => map.width === item.width).source);
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(4);
    scene.dispose(); scene.dispose(); released(); expect(frames.size).toBe(0);
  });
});
