import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight, scene, canvas, now, frames, frameId, pointProgram;
let draws, uniforms, attributes, constants, programAttributes, created, deleted, uploads, updates;
const STARS = [
  { id: 'amber-star', center: [-3.1, 1, 8.5], radius: 0.6 },
  { id: 'blue-star', center: [4.3, -2.2, 16], radius: 0.8 },
  { id: 'pale-star', center: [0.65, 2.4, 24], radius: 1 },
].map(star => ({ ...star, center: star.center.map(Math.fround) }));
const copy = value => ArrayBuffer.isView(value) || Array.isArray(value) ? Array.from(value) : value;
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = value => value.map(component => component / Math.hypot(...value));

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  now = 100; frameId = 0; frames = new Map(); pointProgram = null;
  draws = []; uniforms = new Map(); attributes = new Map(); constants = new Map(); programAttributes = new Map();
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] }; uploads = []; updates = [];
  let currentProgram = null, blend = [];
  const gl = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getParameter') return () => [1, 256];
      if (key === 'getAttribLocation') return (program, name) => {
        if (!programAttributes.has(program)) programAttributes.set(program, new Map());
        const locations = programAttributes.get(program);
        // Enable state belongs to the context. Programs may alias locations.
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
      if (key === 'blendFunc') return (...values) => { blend = values; };
      if (key === 'bufferData' || key === 'bufferSubData') return (...values) => (key === 'bufferData' ? uploads : updates).push(values);
      if (key === 'enableVertexAttribArray' || key === 'disableVertexAttribArray') return location => {
        attributes.set(location, { ...attributes.get(location), enabled: key.startsWith('enable') });
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
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
  canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,');
  scene = flight.create(canvas); advance();
});

afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

function advance(milliseconds = 16) {
  now += milliseconds;
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
}
function draw() { const start = draws.length; scene.capture(); return draws.slice(start); }
function quads(calls) { return calls.filter(item => item.program === pointProgram && item.mode === constants.get('TRIANGLES')); }
function starQuad(calls, star = STARS[0]) {
  return quads(calls).find(item => star.center.every((value, axis) => item.attributes.a_position.constant[axis] === value));
}
function pose(star = STARS[0], settings = {}, state = {}) {
  const saved = scene.snapshot();
  saved.settings = { ...saved.settings, mode: 'explore', region: 'neighborhood', fov: 30, running: false, ...settings };
  saved.state = { ...saved.state, position: [star.center[0], star.center[1], star.center[2] - star.radius], yaw: 0, pitch: 0, ...state };
  saved.targetId = star.id;
  expect(scene.restore(saved)).toBe(true); advance();
}
function frame(call) {
  return ['u_stellarRight', 'u_stellarUp', 'u_stellarToward'].map(name => call.uniforms[name]);
}
function expectVector(actual, expected, precision = 6) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], precision));
}
function expectFrame(call, observer, star) {
  const [right, up, toward] = frame(call);
  for (const axis of [right, up, toward]) {
    expect(axis).toHaveLength(3); expect(axis.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...axis)).toBeCloseTo(1, 6);
  }
  expect(dot(right, up)).toBeCloseTo(0, 6);
  expect(dot(right, toward)).toBeCloseTo(0, 6);
  expect(dot(up, toward)).toBeCloseTo(0, 6);
  expectVector(toward, normalize(observer.map((value, axis) => value - star.center[axis])));
  expectVector(up, cross(right, toward));
}

describe('Universe source-anchored stellar structure', () => {
  it('provides a finite orthonormal source frame for each named stellar close-up', () => {
    for (const star of STARS) {
      pose(star); const call = starQuad(draw(), star);
      expect(call).toBeDefined(); expectFrame(call, scene.snapshot().state.position, star);
      expectVector(call.uniforms.u_stellarRight, [1, 0, 0]);
      expectVector(call.uniforms.u_stellarUp, [0, 1, 0]);
      expectVector(call.uniforms.u_stellarToward, [0, 0, -1]);
      for (const name of ['u_stellarStructure', 'u_stellarLoops']) {
        expect(Number.isFinite(call.uniforms[name])).toBe(true);
        expect(call.uniforms[name]).toBeGreaterThanOrEqual(0); expect(call.uniforms[name]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the body direction tied to the observer and rotates only its screen basis when looking around', () => {
    const observer = STARS[0].center.map((value, axis) => value + [-0.12, 0.09, -0.58][axis]);
    pose(STARS[0], {}, { position: observer }); const original = starQuad(draw());
    pose(STARS[0], {}, { position: observer, yaw: 0.25, pitch: -0.2 }); const changed = starQuad(draw());
    expectFrame(changed, observer, STARS[0]);
    expectVector(changed.uniforms.u_stellarToward, original.uniforms.u_stellarToward);
    const cameraRight = changed.uniforms.u_right, toward = changed.uniforms.u_stellarToward;
    const projected = normalize(cameraRight.map((value, axis) => value - dot(cameraRight, toward) * toward[axis]));
    expectVector(changed.uniforms.u_stellarRight, projected);
    expect(changed.uniforms.u_stellarRight).not.toEqual(original.uniforms.u_stellarRight);
    expect(changed.uniforms.u_forward).not.toEqual(original.uniforms.u_forward);
    expect(changed.attributes.a_position.constant).toEqual(original.attributes.a_position.constant);
    expect(changed.attributes.a_color.constant).toEqual(original.attributes.a_color.constant);
  });

  it('changes the visible body hemisphere when the observer moves around a source', () => {
    const star = STARS[0], radius = 0.4;
    for (const direction of [[0, 0, -1], [-Math.SQRT1_2, 0, -Math.SQRT1_2], [0, -Math.SQRT1_2, -Math.SQRT1_2], [0, 0, 1]]) {
      const position = star.center.map((value, axis) => value + radius * direction[axis]);
      const aim = direction.map(value => -value), yaw = Math.atan2(aim[0], aim[2]), pitch = Math.asin(aim[1]);
      pose(star, {}, { position, yaw, pitch }); const call = starQuad(draw());
      expect(call).toBeDefined(); expectFrame(call, position, star);
      expectVector(call.uniforms.u_stellarToward, direction);
    }
  });

  it('keeps small surfaces on the original detail path and enables structure only as the CSS image grows', () => {
    pose(STARS[0], { fov: 65 }); const small = starQuad(draw());
    expect(small).toBeDefined(); expect(small.uniforms.u_stellarStructure).toBe(0); expect(small.uniforms.u_stellarLoops).toBe(0);
    pose(); const medium = starQuad(draw());
    expect(medium.uniforms.u_stellarStructure).toBeGreaterThan(0.9);
    expect(medium.uniforms.u_stellarLoops).toBeGreaterThanOrEqual(0); expect(medium.uniforms.u_stellarLoops).toBeLessThan(0.2);
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2); scene.set({ quality: 'high' }); advance();
    const retinaMedium = starQuad(draw());
    for (const name of ['u_stellarStructure', 'u_stellarLoops']) expect(retinaMedium.uniforms[name]).toBeCloseTo(medium.uniforms[name], 12);
    expect(frame(retinaMedium)).toEqual(frame(medium));
    const near = [STARS[0].center[0], STARS[0].center[1], STARS[0].center[2] - 0.25];
    pose(STARS[0], {}, { position: near }); const large = starQuad(draw());
    expect(large.uniforms.u_stellarStructure).toBe(1); expect(large.uniforms.u_stellarLoops).toBe(1);
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1); scene.set({ quality: 'high' }); advance();
    const retina = starQuad(draw());
    for (const name of ['u_stellarStructure', 'u_stellarLoops']) expect(retina.uniforms[name]).toBe(large.uniforms[name]);
    expect(frame(retina)).toEqual(frame(large));
  });

  it('handles source poles, parallel tangent fallbacks and source coincidence without invalid uniforms', () => {
    const star = STARS[0];
    // Aberration makes a source on the physical camera-right axis visible in
    // front. This exercises the tangent fallback while a real quad is drawn.
    for (const offset of [[0.01, 0, 0], [-0.01, 0, 0], [0.01, 1e-9, 0], [0, 0.01, 0], [0, -0.01, 0]]) {
      const position = star.center.map((value, axis) => value + offset[axis]);
      pose(star, { mode: 'relativity', beta: 0.99 }, { position });
      const call = starQuad(draw()); expect(call).toBeDefined(); expectFrame(call, position, star);
      expect(call.uniforms.u_stellarStructure).toBeGreaterThan(0);
    }
    for (const offset of [[0, 0, 0], [1e-7, 0, 0]]) {
      const position = star.center.map((value, axis) => value + offset[axis]);
      pose(star, { mode: 'relativity', beta: 0.9999 }, { position }); const calls = draw();
      expect(starQuad(calls)).toBeUndefined();
      for (const call of calls) for (const value of Object.values(call.uniforms)) {
        expect(Array.isArray(value) ? value.every(Number.isFinite) : Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('keeps fixed body frames and source identity through pause, snapshot restore and a region round trip', () => {
    pose(); const saved = scene.snapshot(), reference = starQuad(draw());
    const resourceCounts = Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.length]));
    const uploadCount = uploads.length, updateCount = updates.length;
    advance(1000); expect(scene.snapshot()).toEqual(saved); expect(starQuad(draw())).toEqual(reference);
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount);
    scene.set({ region: 'cosmic' }); advance(); expect(scene.restore(saved)).toBe(true); advance();
    expect(starQuad(draw())).toEqual(reference);
    expect(Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.length]))).toEqual(resourceCounts);
    // The region switch rebuilds geometry and updates the cosmic elliptical
    // projections. Establish its new baseline before checking viewing alone.
    expect(uploads.length).toBeGreaterThan(uploadCount);
    const restoredUploads = uploads.length, restoredUpdates = updates.length;
    scene.look(0.08, -0.04); advance(); draw();
    expect(uploads).toHaveLength(restoredUploads); expect(updates).toHaveLength(restoredUpdates);
  });

  it('updates the visible hemisphere during native orbit and freezes it with the observer', () => {
    pose(); expect(scene.startOrbit('amber-star')).toBe(true); scene.set({ running: true }); advance();
    const initial = starQuad(draw()), resources = Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.length]));
    const uploadCount = uploads.length, updateCount = updates.length;
    for (let index = 0; index < 15; index++) advance(100);
    const moving = starQuad(draw()); expect(moving).toBeDefined(); expectFrame(moving, scene.snapshot().state.position, STARS[0]);
    expect(moving.uniforms.u_stellarToward).not.toEqual(initial.uniforms.u_stellarToward);
    expect(moving.attributes.a_position.constant).toEqual(initial.attributes.a_position.constant);
    scene.set({ running: false }); advance(); const paused = scene.snapshot(), frozen = starQuad(draw());
    advance(1000); expect(scene.snapshot()).toEqual(paused); expect(starQuad(draw())).toEqual(frozen);
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount);
    expect(Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.length]))).toEqual(resources);
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(2);
  });

  it('resets structure and neutral frame uniforms for every point pass and other regions', () => {
    pose(STARS[0], {}, { position: [STARS[0].center[0], STARS[0].center[1], STARS[0].center[2] - 0.25] });
    const first = draw(); expect(starQuad(first).uniforms.u_stellarLoops).toBe(1);
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) {
      scene.set({ region }); advance(); const calls = draw();
      const points = calls.find(item => item.program === pointProgram && item.mode === constants.get('POINTS'));
      expect(points.uniforms.u_stellarStructure).toBe(0); expect(points.uniforms.u_stellarLoops).toBe(0);
      expect(frame(points)).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, -1]]);
      expect(points.blend).toEqual([constants.get('ONE'), constants.get('ONE')]);
      for (const name of ['a_position', 'a_color', 'a_size', 'a_light', 'a_cloud']) expect(points.attributes[name].enabled).toBe(true);
      expect(points.attributes.a_corner.enabled).toBe(false);
      if (region !== 'neighborhood') expect(quads(calls)).toHaveLength(0);
    }
  });
});
