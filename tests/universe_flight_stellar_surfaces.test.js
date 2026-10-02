import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

let flight, scene, canvas, now, frames, frameId;
let buffers, uploads, updates, draws, attributes, uniforms, constants, created, deleted;
let programAttributes, pointProgram, pointBuffer, surfaceBuffer, range;

// These byte hashes pin the existing generated world, rather than deriving an
// expected result from the new rendering code. Only six static quad corners
// may be appended to the surface buffer.
const WORLD = {
  neighborhood: { count: 19203, points: 'd918319e8229e8005107e8535f7fcb2f1b092f070f42395fcffa739d0905c3e4', surfaceFloats: 0, surface: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  galaxy: { count: 36400, points: 'f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab', surfaceFloats: 1920, surface: 'e97a5ba4db3d27acd2bda8ba417e84c696c7ba32f3b5fd0817d8ba58810890fa' },
  cosmic: { count: 41470, points: '156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85', surfaceFloats: 257280, surface: '102e9fa5c941b24e52de513ac8fb058e749a000ce8ee631740113809bc21253b' },
};
const STARS = [
  { id: 'amber-star', center: [-3.1, 1, 8.5], radius: 0.6 },
  { id: 'blue-star', center: [4.3, -2.2, 16], radius: 0.8 },
  { id: 'pale-star', center: [0.65, 2.4, 24], radius: 1 },
];
const hash = values => createHash('sha256').update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)).digest('hex');
const copy = value => ArrayBuffer.isView(value) || Array.isArray(value) ? Array.from(value) : value;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  frames = new Map(); frameId = 0; now = 100; range = 256;
  buffers = new Map(); uploads = []; updates = []; draws = [];
  attributes = new Map(); uniforms = new Map(); constants = new Map(); programAttributes = new Map();
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
  pointProgram = null; pointBuffer = null; surfaceBuffer = null;
  const bindings = new Map(); let currentProgram = null, blend = [];
  const gl = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getParameter') return () => [1, range];
      if (key === 'getAttribLocation') return (program, name) => {
        if (!programAttributes.has(program)) programAttributes.set(program, new Map());
        const locations = programAttributes.get(program);
        // Linked programs may reuse attribute indices. Enable state belongs to
        // the GL context, so point/galaxy/quad draws must restore it correctly.
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
        const namedAttributes = Object.fromEntries([...programAttributes.get(currentProgram)].map(([name, location]) => [name, { ...attributes.get(location), constant: copy(attributes.get(location)?.constant) }]));
        draws.push({ program: currentProgram, mode, first, count, blend: blend.slice(), attributes: namedAttributes, uniforms: structuredClone(uniforms.get(currentProgram) || {}) });
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
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
  canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,');
  scene = flight.create(canvas);
  advance();
});

afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

function advance(milliseconds = 16) {
  now += milliseconds;
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
}

function draw() { const start = draws.length; scene.capture(); return draws.slice(start); }
function pointDraw(calls) { return calls.find(item => item.mode === constants.get('POINTS')); }
function quadDraws(calls) { return calls.filter(item => item.program === pointProgram && item.mode === constants.get('TRIANGLES')); }
function pose(star = STARS[0], overrides = {}) {
  const saved = scene.snapshot();
  saved.settings = { ...saved.settings, mode: 'explore', region: 'neighborhood', ...overrides.settings };
  saved.state = { ...saved.state, position: [star.center[0], star.center[1], star.center[2] - star.radius], yaw: 0, pitch: 0, ...overrides.state };
  saved.targetId = star.id;
  expect(scene.restore(saved)).toBe(true); advance();
}
function starRecords() {
  const data = buffers.get(pointBuffer);
  return STARS.map(star => {
    const center = Array.from(new Float32Array(star.center));
    for (let index = 0; index < data.length; index += 9) if (center.every((value, axis) => value === data[index + axis])) return Array.from(data.slice(index, index + 9));
    throw new Error('The generated named star record is missing: ' + star.id);
  });
}

function assertPointArrays(call) {
  for (const [name, size, offset] of [['position', 3, 0], ['color', 3, 12], ['size', 1, 24], ['light', 1, 28], ['cloud', 1, 32]]) {
    expect(call.attributes['a_' + name]).toMatchObject({ enabled: true, buffer: pointBuffer, size, stride: 36, offset });
  }
  expect(call.attributes.a_corner.enabled).toBe(false);
  expect(call.uniforms.u_stellarQuad).toBe(0);
  expect(call.blend).toEqual([constants.get('ONE'), constants.get('ONE')]);
}

describe('Universe projected stellar surfaces', () => {
  it('preserves all generated point and initial surface bytes and appends only six static corners', () => {
    for (const [region, expected] of Object.entries(WORLD)) {
      scene.set({ region, running: false }); advance();
      const points = uploads.findLast(item => item.buffer === pointBuffer).data;
      const surfaces = uploads.findLast(item => item.buffer === surfaceBuffer).data;
      expect(points).toHaveLength(expected.count * 9); expect(hash(points)).toBe(expected.points);
      expect(surfaces).toHaveLength(expected.surfaceFloats + 30);
      expect(hash(surfaces.subarray(0, expected.surfaceFloats))).toBe(expected.surface);
      const tail = surfaces.subarray(expected.surfaceFloats), corners = [];
      for (let index = 0; index < tail.length; index += 5) {
        expect(Array.from(tail.subarray(index, index + 3))).toEqual([0, 0, 0]);
        const corner = Array.from(tail.subarray(index + 3, index + 5));
        expect(corner.every(value => Math.abs(value) === 1)).toBe(true); corners.push(corner);
      }
      expect(new Set(corners.map(value => value.join(','))).size).toBe(4);
      const area = index => (corners[index + 1][0] - corners[index][0]) * (corners[index + 2][1] - corners[index][1]) - (corners[index + 1][1] - corners[index][1]) * (corners[index + 2][0] - corners[index][0]);
      expect(Math.abs(area(0))).toBe(4); expect(area(3)).toBe(area(0));
    }
  });

  it('uses exact Float32 named-star records and restores point arrays after constant-attribute quad draws', () => {
    pose(); const records = starRecords(), calls = draw(), points = pointDraw(calls), quads = quadDraws(calls);
    assertPointArrays(points);
    expect(points.count).toBe(WORLD.neighborhood.count);
    expect(points.uniforms.u_stellarCount).toBe(3);
    expect(points.uniforms['u_stellarCenters[0]']).toEqual(records.flatMap(record => record.slice(0, 3)));
    expect(quads.length).toBeGreaterThan(0); expect(quads.length).toBeLessThanOrEqual(3);
    for (const quad of quads) {
      expect(quad.uniforms.u_stellarQuad).toBe(1);
      expect(quad.blend).toEqual([constants.get('ONE'), constants.get('ONE_MINUS_SRC_ALPHA')]);
      expect(quad.first).toBe(0); expect(quad.count).toBe(6);
      expect(quad.attributes.a_corner).toMatchObject({ enabled: true, buffer: surfaceBuffer, size: 2, stride: 20, offset: 12 });
      const position = quad.attributes.a_position.constant;
      const record = records.find(item => item.slice(0, 3).every((value, index) => value === position[index]));
      expect(record).toBeDefined(); expect(record[8]).toBe(0);
      for (const [name, value] of [['position', record.slice(0, 3)], ['color', record.slice(3, 6)], ['size', record[6]], ['light', record[7]], ['cloud', 0]]) {
        const attribute = quad.attributes['a_' + name]; expect(attribute.enabled).toBe(false);
        expect(attribute.constant).toEqual(value);
      }
    }
    assertPointArrays(pointDraw(draw()));
  });

  it('keeps distant stars on the original point path and does not select clouds or other regions for quads', () => {
    pose(STARS[0], { state: { position: [0, 0, -1000] } });
    expect(quadDraws(draw())).toHaveLength(0);
    for (const region of ['galaxy', 'cosmic']) {
      scene.set({ region, running: false }); advance(); const calls = draw();
      expect(quadDraws(calls)).toHaveLength(0);
      expect(pointDraw(calls).uniforms.u_stellarCount).toBe(0);
      expect(pointDraw(calls).count).toBe(WORLD[region].count);
      const diffuse = calls.filter(item => item.program !== pointProgram);
      expect(diffuse).toHaveLength(1); expect(diffuse[0].count).toBe(WORLD[region].surfaceFloats / 5);
    }
  });

  it('has finite bounded uniforms and skips behind-camera and coincident sources', () => {
    for (const star of STARS) {
      pose(star, { settings: { fov: 30 } }); expect(quadDraws(draw()).some(item => item.attributes.a_position.constant.every((value, axis) => value === Math.fround(star.center[axis])))).toBe(true);
      pose(star, { state: { position: star.center.map(Math.fround), yaw: Math.PI } });
      const calls = draw();
      expect(quadDraws(calls).some(item => item.attributes.a_position.constant.every((value, axis) => value === Math.fround(star.center[axis])))).toBe(false);
      pose(star, { settings: { mode: 'relativity', beta: 0.9999 }, state: { position: star.center.map(Math.fround) } });
      expect(quadDraws(draw()).some(item => item.attributes.a_position.constant.every((value, axis) => value === Math.fround(star.center[axis])))).toBe(false);
      pose(star, { state: { yaw: Math.PI } });
      expect(quadDraws(draw()).some(item => item.attributes.a_position.constant.every((value, axis) => value === Math.fround(star.center[axis])))).toBe(false);
    }
    pose(STARS[0], { settings: { mode: 'relativity', beta: 0.9999 }, state: { position: [-3.1, 1, 8.5 - 1e-7] } });
    for (const call of draw()) {
      expect(call.uniforms.u_quadMax).toBeGreaterThan(0);
      expect(call.uniforms.u_quadMax).toBeLessThanOrEqual(2 * Math.max(canvas.width, canvas.height));
      for (const value of Object.values(call.uniforms)) {
        if (Array.isArray(value)) expect(value.every(Number.isFinite)).toBe(true);
        else expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('reuses static geometry across paused camera, lens, exposure, quality and DPR changes', () => {
    pose(); const bytes = new Map([...buffers].map(([buffer, values]) => [buffer, values.slice()]));
    const uploadCount = uploads.length, updateCount = updates.length, resources = structuredClone(created);
    const original = scene.snapshot(); draw(); advance(1000);
    expect(scene.snapshot()).toEqual(original);
    scene.look(0.18, -0.12); advance(); scene.set({ fov: 30, exposure: 1.4, quality: 'low' }); advance();
    const changed = scene.snapshot();
    expect(changed.state.position).toEqual(original.state.position);
    for (const name of ['distanceLy', 'universeYears', 'travelerYears']) expect(changed.state[name]).toBe(original.state[name]);
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2); scene.set({ quality: 'high' }); advance();
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount); expect(created).toEqual(resources);
    for (const [buffer, values] of bytes) expect(buffers.get(buffer)).toEqual(values);
    const calls = draw(); assertPointArrays(pointDraw(calls));
    expect(pointDraw(calls).uniforms.u_dpr).toBe(2);
    expect(pointDraw(calls).uniforms.u_quadMax).toBeGreaterThan(pointDraw(calls).uniforms.u_pointMax);
  });

  it('draws the same named stellar surface beyond a 32-pixel point limit at DPR2', () => {
    scene.dispose(); range = 32;
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
    scene = flight.create(canvas); scene.set({ quality: 'high' }); advance(); pose();
    const calls = draw(), points = pointDraw(calls), quads = quadDraws(calls);
    assertPointArrays(points);
    expect(points.uniforms.u_pointMax).toBe(32); expect(points.uniforms.u_dpr).toBe(2);
    expect(points.uniforms.u_quadMax).toBe(1536);
    expect(quads.some(item => item.attributes.a_position.constant.every((value, axis) => value === Math.fround(STARS[0].center[axis])))).toBe(true);
    expect(quads.every(item => item.uniforms.u_quadMax === points.uniforms.u_quadMax && item.uniforms.u_pointMax === 32)).toBe(true);
    expect(hash(buffers.get(pointBuffer))).toBe(WORLD.neighborhood.points);
    const uploadCount = uploads.length, updateCount = updates.length;
    scene.look(0.12, 0); scene.set({ fov: 30 }); advance(); draw();
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount);
  });

  it('composites at most three stellar surfaces from far to near and restores additive blending', () => {
    scene.dispose(); range = 1;
    scene = flight.create(canvas); advance();
    pose(STARS[0], { state: { position: [0, 0, 0] } });
    const calls = draw(), quads = quadDraws(calls), points = pointDraw(calls);
    assertPointArrays(points); expect(quads).toHaveLength(3);
    const positions = quads.map(item => item.attributes.a_position.constant);
    expect(new Set(positions.map(position => position.join(','))).size).toBe(3);
    const expected = STARS.map(star => star.center.map(Math.fround)).sort((a, b) => Math.hypot(...b) - Math.hypot(...a));
    expect(positions).toEqual(expected);
    for (const quad of quads) {
      expect(quad.count).toBe(6); expect(quad.uniforms.u_stellarQuad).toBe(1);
      expect(quad.blend).toEqual([constants.get('ONE'), constants.get('ONE_MINUS_SRC_ALPHA')]);
    }
    // The next point pass and diffuse galaxy pass share this GL context. A
    // leaked alpha blend mode would dim their additive background light.
    assertPointArrays(pointDraw(draw()));
    scene.set({ region: 'cosmic' }); advance();
    const cosmic = draw(); expect(quadDraws(cosmic)).toHaveLength(0);
    for (const call of cosmic) expect(call.blend).toEqual([constants.get('ONE'), constants.get('ONE')]);
  });

  it('restores the same surface draws after a region change and during a native star orbit without extra resources', () => {
    pose(); const saved = scene.snapshot(), reference = draw().filter(item => item.program === pointProgram);
    const resources = structuredClone(created), originalPoints = buffers.get(pointBuffer).slice();
    scene.set({ region: 'cosmic' }); advance(); expect(scene.restore(saved)).toBe(true); advance();
    expect(draw().filter(item => item.program === pointProgram)).toEqual(reference);
    expect(buffers.get(pointBuffer)).toEqual(originalPoints);
    expect(scene.startOrbit('amber-star')).toBe(true); scene.set({ running: true }); advance();
    const start = scene.snapshot(); const uploadCount = uploads.length, updateCount = updates.length;
    for (let index = 0; index < 10; index++) advance(100);
    expect(scene.snapshot().state.position).not.toEqual(start.state.position);
    expect(quadDraws(draw()).length).toBeGreaterThan(0);
    scene.set({ running: false }); advance(); const stopped = scene.snapshot(); draw(); advance(1000);
    expect(scene.snapshot()).toEqual(stopped);
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount); expect(created).toEqual(resources);
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(2);
    scene.dispose(); scene.dispose();
    for (const [type, items] of Object.entries(created)) {
      expect(deleted[type]).toHaveLength(items.length);
      for (const item of items) expect(deleted[type].filter(resource => resource === item)).toHaveLength(1);
    }
  });
});
