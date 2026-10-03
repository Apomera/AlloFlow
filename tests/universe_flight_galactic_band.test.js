import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight, scene, canvas, now, frames, frameId, pointProgram;
let draws, uniforms, constants, attributes, created, deleted, uploads, updates;
const copy = value => ArrayBuffer.isView(value) || Array.isArray(value) ? Array.from(value) : value;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  now = 100; frameId = 0; frames = new Map(); pointProgram = null;
  draws = []; uniforms = new Map(); constants = new Map(); attributes = new Map();
  created = { Buffer: [], Program: [], Texture: [], Shader: [] };
  deleted = { Buffer: [], Program: [], Texture: [], Shader: [] };
  uploads = []; updates = [];
  let currentProgram = null;
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
      if (key === 'drawArrays') return (mode, first, count) => {
        draws.push({ program: currentProgram, mode, first, count, uniforms: structuredClone(uniforms.get(currentProgram) || {}) });
      };
      if (key === 'bufferData' || key === 'bufferSubData') return (...values) => (key === 'bufferData' ? uploads : updates).push(values);
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
function capturePoints() {
  const start = draws.length; scene.capture();
  return draws.slice(start).filter(call => call.program === pointProgram && call.mode === constants.get('POINTS'));
}
function expectBand(expected) {
  const calls = capturePoints();
  expect(calls).toHaveLength(1);
  expect(calls[0].uniforms.u_galacticBand).toBe(expected);
  return calls[0];
}
function resourceCounts() {
  return Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.length]));
}
function expectFinite(call) {
  for (const value of Object.values(call.uniforms)) {
    expect(Array.isArray(value) ? value.every(Number.isFinite) : Number.isFinite(value)).toBe(true);
  }
}
function expectReleased() {
  for (const type of ['Buffer', 'Program', 'Texture', 'Shader']) {
    expect(deleted[type]).toHaveLength(created[type].length);
    expect(new Set(deleted[type])).toEqual(new Set(created[type]));
  }
}

describe('Universe distant galactic band', () => {
  it('enables the neighborhood band in exploration, rest comparison and high-beta travel', () => {
    for (const settings of [
      { mode: 'explore', beta: 0.9, compareRest: false },
      { mode: 'relativity', beta: 0.9999, compareRest: false },
      { mode: 'relativity', beta: 0.9999, compareRest: true },
      { mode: 'relativity', beta: 0, compareRest: false },
    ]) {
      scene.set(settings); advance(); const call = expectBand(1);
      expect(call.uniforms.u_beta).toBe(settings.mode === 'relativity' && !settings.compareRest ? settings.beta : 0);
      expectFinite(call);
    }
  });

  it('resets the band flag on region changes and returns without creating GPU objects', () => {
    const resources = resourceCounts(), objects = Object.fromEntries(Object.entries(created).map(([type, items]) => [type, items.slice()]));
    for (const region of ['galaxy', 'cosmic', 'neighborhood', 'galaxy', 'neighborhood']) {
      const previousUploads = uploads.length;
      scene.set({ region }); advance(); expectBand(region === 'neighborhood' ? 1 : 0);
      expect(uploads.length).toBeGreaterThan(previousUploads);
      expect(resourceCounts()).toEqual(resources);
      for (const type of Object.keys(objects)) expect(created[type]).toEqual(objects[type]);
    }
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(2);
  });

  it('restores the region flag and saved physical clocks while keeping travel paused', () => {
    const resources = resourceCounts(), savedViews = [];
    for (const region of ['neighborhood', 'cosmic']) {
      scene.set({ region, mode: 'relativity', beta: 0.99, compareRest: false, timeScale: 100 });
      scene.set({ running: true }); advance(); advance(100); advance(100);
      scene.set({ running: false }); advance(); const saved = scene.snapshot();
      expect(saved.state.universeYears).toBeGreaterThan(0);
      expect(saved.state.travelerYears).toBeGreaterThan(0);
      expect(saved.state.travelerYears).toBeLessThan(saved.state.universeYears);
      savedViews.push(saved);
    }
    for (const saved of savedViews) {
      expect(scene.restore(saved)).toBe(true); advance();
      const call = expectBand(saved.settings.region === 'neighborhood' ? 1 : 0);
      expect(scene.snapshot()).toEqual(saved); expectFinite(call);
      advance(1000); expect(scene.snapshot()).toEqual(saved); expect(capturePoints()).toEqual([call]);
      expect(resourceCounts()).toEqual(resources);
    }
  });

  it('keeps the band enabled through an observer orbit and frozen without viewing uploads', () => {
    expect(scene.startOrbit('amber-star')).toBe(true); advance(); const initial = expectBand(1);
    const resources = resourceCounts(), uploadCount = uploads.length, updateCount = updates.length;
    for (let index = 0; index < 10; index++) advance(100);
    const moving = expectBand(1); expect(moving.uniforms.u_position).not.toEqual(initial.uniforms.u_position); expectFinite(moving);
    scene.set({ running: false }); advance(); const saved = scene.snapshot(), frozen = expectBand(1);
    advance(1000); expect(scene.snapshot()).toEqual(saved); expect(capturePoints()).toEqual([frozen]);
    scene.look(0.15, -0.08); advance(); const looking = expectBand(1);
    expect(looking.uniforms.u_forward).not.toEqual(frozen.uniforms.u_forward); expectFinite(looking);
    expect(uploads).toHaveLength(uploadCount); expect(updates).toHaveLength(updateCount);
    expect(resourceCounts()).toEqual(resources);
  });

  it('preserves the current region on reset and defaults to the neighborhood after disposal and recreation', () => {
    scene.set({ region: 'galaxy' }); advance(); expectBand(0);
    scene.reset(); advance(); expectBand(0);
    scene.dispose(); expect(frames.size).toBe(0);
    expectReleased();
    expect(scene.capture()).toBeNull();
    scene = flight.create(canvas); advance(); expectBand(1);
    expect(scene.snapshot().settings.region).toBe('neighborhood');
    for (const type of ['Buffer', 'Program', 'Texture']) expect(created[type]).toHaveLength(4);
    scene.dispose();
    expectReleased();
    expect(frames.size).toBe(0);
  });
});
