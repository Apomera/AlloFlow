import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const EXTENSIONS = ['EXT_texture_filter_anisotropic', 'MOZ_EXT_texture_filter_anisotropic', 'WEBKIT_EXT_texture_filter_anisotropic'];
const FILTER = 0x84fe, MAX_FILTER = 0x84ff;
const extension = { TEXTURE_MAX_ANISOTROPY_EXT: FILTER, MAX_TEXTURE_MAX_ANISOTROPY_EXT: MAX_FILTER };
const digest = values => createHash('sha256').update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)).digest('hex');
let flight, scenes, frames, time, frameId;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  scenes = []; frames = new Map(); time = 100; frameId = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => time);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
});

afterEach(() => { scenes.forEach(scene => scene.dispose()); vi.restoreAllMocks(); });

function advance(milliseconds = 16) {
  time += milliseconds;
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time));
}

// Keep GPU behavior visible through bindings and uploads. The native renderer
// still owns the scene, motion controllers, quality selection and resources.
function create(options = {}) {
  let texture = null, currentBuffer = null, telemetry;
  const enums = new Map(), queries = [], capabilities = [], sampling = [], statuses = [];
  const textures = [], buffers = [], sources = [], uploadedPoints = [], deleted = { Buffer: [], Texture: [], Program: [], Shader: [] };
  const resources = { Buffer: [], Texture: [], Program: [], Shader: [] };
  const gl = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getExtension') return name => {
        queries.push(name);
        if (options.extensionError) throw new Error('Optional extension acquisition failed');
        return name === (options.alias || EXTENSIONS[0]) && options.available !== false ? (options.extension || extension) : null;
      };
      if (key === 'getParameter') return name => {
        if (name === enums.get('ALIASED_POINT_SIZE_RANGE')) return [1, 256];
        capabilities.push(name);
        if (options.capabilityError) throw new Error('Optional capability query failed');
        return Object.prototype.hasOwnProperty.call(options, 'maximum') ? options.maximum : 8;
      };
      if (key === 'texParameterf') return (target, name, value) => {
        sampling.push({ texture, target, name, value });
        if (options.samplingError) throw new Error('Optional sampler update failed');
      };
      if (key === 'bindTexture') return (_target, item) => { texture = item; };
      if (key === 'texImage2D') return (_target, _level, _internal, width, height, _border, _format, _type, values) => textures.push({ texture, width, height, hash: digest(values), source: values });
      if (key === 'bindBuffer') return (_target, item) => { currentBuffer = item; };
      if (key === 'bufferData') return (_target, values) => { buffers.push({ buffer: currentBuffer, length: values.length }); if (currentBuffer === resources.Buffer[0]) uploadedPoints.push(digest(values)); };
      if (key === 'shaderSource') return (_shader, source) => sources.push(source);
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation') return (_program, name) => name;
      const operation = String(key).match(/^(create|delete)(Buffer|Program|Texture|Shader)$/);
      if (operation) return resource => {
        if (operation[1] === 'create') { const item = { kind: operation[2], index: resources[operation[2]].length }; resources[operation[2]].push(item); return item; }
        deleted[operation[2]].push(resource);
      };
      if (String(key).toUpperCase() === key) {
        if (!enums.has(key)) enums.set(key, enums.size + 1);
        return enums.get(key);
      }
      return () => {};
    },
  });
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(options.glUnavailable ? null : gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,');
  const scene = flight.create(canvas, { onTelemetry: value => { telemetry = value; }, onStatus: (...args) => statuses.push(args) });
  scenes.push(scene);
  return { scene, canvas, gl, enums, queries, capabilities, sampling, textures, buffers, resources, deleted, uploadedPoints, sources, statuses,
    info: () => structuredClone(telemetry), galaxy: () => textures.find(item => item.width === 2048).texture, cloud: () => textures.find(item => item.width === 512).texture };
}

const allocations = fixture => Object.fromEntries(Object.entries(fixture.resources).map(([kind, items]) => [kind, items.length]));
function ready(fixture) {
  expect(fixture.info()).not.toBeUndefined();
  expect(fixture.statuses).toContainEqual([{ state: 'ready', message: '3D flight explorer ready.' }]);
  expect(allocations(fixture)).toEqual({ Buffer: 2, Texture: 2, Program: 2, Shader: 4 });
}
function sample(fixture, values) {
  expect(fixture.sampling.map(item => item.value)).toEqual(values);
  for (const item of fixture.sampling) expect(item).toEqual({ texture: fixture.galaxy(), target: fixture.enums.get('TEXTURE_2D'), name: FILTER, value: item.value });
}

describe('Universe optional galaxy atlas texture filtering', () => {
  for (const alias of EXTENSIONS) {
    it(`discovers ${alias} once and applies a capped 4× sampler to the galaxy texture`, () => {
      const fixture = create({ alias }); ready(fixture);
      expect(fixture.queries).toEqual(EXTENSIONS.slice(0, EXTENSIONS.indexOf(alias) + 1));
      expect(fixture.capabilities).toEqual([MAX_FILTER]); sample(fixture, [4]);
      fixture.scene.set({ quality: 'high' }); fixture.scene.set({ quality: 'auto' }); advance();
      sample(fixture, [4]); expect(fixture.capabilities).toEqual([MAX_FILTER]);
    });
  }

  it('keeps the supported 2× hardware limit and uses 1× in Low quality', () => {
    const fixture = create({ maximum: 2 }); ready(fixture); sample(fixture, [2]);
    fixture.scene.set({ quality: 'low' }); sample(fixture, [2, 1]);
    fixture.scene.set({ quality: 'auto' }); fixture.scene.set({ quality: 'high' }); sample(fixture, [2, 1, 2]);
    expect(fixture.capabilities).toEqual([MAX_FILTER]);
  });

  it('leaves the default sampler and explorer intact when no alias is supported', () => {
    const fixture = create({ available: false }); ready(fixture);
    expect(fixture.queries).toEqual(EXTENSIONS); expect(fixture.capabilities).toEqual([]); sample(fixture, []);
    fixture.scene.set({ quality: 'low' }); fixture.scene.set({ quality: 'high' }); window.dispatchEvent(new Event('resize')); advance();
    expect(fixture.queries).toEqual(EXTENSIONS); expect(fixture.capabilities).toEqual([]); sample(fixture, []);
  });

  it('rejects missing, nonnumeric and nonfinite extension enums without writing the sampler', () => {
    for (const invalid of [undefined, null, '34046', NaN, Infinity, -Infinity]) {
      for (const name of ['TEXTURE_MAX_ANISOTROPY_EXT', 'MAX_TEXTURE_MAX_ANISOTROPY_EXT']) {
        const fixture = create({ extension: { ...extension, [name]: invalid } }); ready(fixture);
        expect(fixture.capabilities).toEqual([]); sample(fixture, []);
        fixture.scene.dispose();
      }
    }
  });

  it('rejects nonscalar, nonfinite and unsupported maximum values safely', () => {
    for (const maximum of [undefined, null, '8', [], [8], {}, NaN, Infinity, -Infinity, -2, 0, 1]) {
      const fixture = create({ maximum }); ready(fixture); expect(fixture.capabilities).toEqual([MAX_FILTER]); sample(fixture, []);
      fixture.scene.set({ quality: 'low' }); fixture.scene.set({ quality: 'high' });
      expect(fixture.capabilities).toEqual([MAX_FILTER]); sample(fixture, []); fixture.scene.dispose();
    }
  });

  for (const failure of ['extensionError', 'capabilityError', 'samplingError']) {
    it(`continues rendering when optional ${failure} throws and does not retry failed setup`, () => {
      const fixture = create({ [failure]: true }); ready(fixture);
      const queries = fixture.queries.slice(), capabilities = fixture.capabilities.slice(), writes = fixture.sampling.length;
      expect(writes).toBe(failure === 'samplingError' ? 1 : 0);
      fixture.scene.set({ quality: 'low' }); fixture.scene.set({ quality: 'high' }); window.dispatchEvent(new Event('resize'));
      fixture.scene.set({ region: 'galaxy' }); advance(); expect(fixture.scene.capture()).not.toBeNull();
      expect(fixture.queries).toEqual(queries); expect(fixture.capabilities).toEqual(capabilities); expect(fixture.sampling).toHaveLength(writes);
    });
  }

  it('binds the galaxy atlas explicitly when the cloud texture was bound before a quality update', () => {
    const fixture = create(); ready(fixture);
    fixture.gl.bindTexture(fixture.enums.get('TEXTURE_2D'), fixture.cloud()); fixture.scene.set({ quality: 'low' });
    fixture.gl.bindTexture(fixture.enums.get('TEXTURE_2D'), fixture.cloud()); fixture.scene.set({ quality: 'high' });
    sample(fixture, [4, 1, 4]); expect(fixture.sampling.every(item => item.texture !== fixture.cloud())).toBe(true);
  });

  it('applies a restored quality once and preserves accepted pose, clocks and atlas allocations', () => {
    const fixture = create(); ready(fixture); const count = allocations(fixture), original = fixture.scene.snapshot();
    const saved = structuredClone(original); saved.settings.quality = 'low'; saved.state.position = [2, 1, -4];
    saved.state.distanceLy = 17; saved.state.universeYears = 9; saved.state.travelerYears = 4;
    expect(fixture.scene.restore(saved)).toBe(true); sample(fixture, [4, 1]);
    expect(fixture.scene.snapshot()).toEqual(saved);
    expect(fixture.scene.restore(saved)).toBe(true); sample(fixture, [4, 1]);
    expect(fixture.scene.restore(original)).toBe(true); sample(fixture, [4, 1, 4]);
    expect(fixture.scene.snapshot()).toEqual(original); expect(allocations(fixture)).toEqual(count); expect(fixture.textures).toHaveLength(2);
  });

  it('caches filtering through scene changes, look, glides and physical resize without changing motion', () => {
    const fixture = create(); ready(fixture); const count = allocations(fixture);
    fixture.scene.set({ region: 'galaxy' }); fixture.scene.set({ region: 'cosmic' }); fixture.scene.set({ region: 'neighborhood' });
    fixture.scene.look(.2, -.1); window.dispatchEvent(new Event('resize')); advance(); sample(fixture, [4]);
    expect(fixture.scene.startViewpointGlide('amber-star', 'left', 25)).toBe(true); advance(); advance(300);
    const snapshot = fixture.scene.snapshot(), motion = fixture.info();
    fixture.scene.set({ quality: 'low' });
    expect(fixture.scene.snapshot()).toEqual({ ...snapshot, settings: { ...snapshot.settings, quality: 'low' } });
    expect(fixture.info().viewpointGlide).toEqual(motion.viewpointGlide); expect(fixture.info().motion).toEqual(motion.motion); expect(fixture.info().running).toBe(true);
    fixture.scene.set({ quality: 'high' });
    expect(fixture.scene.snapshot()).toEqual({ ...snapshot, settings: { ...snapshot.settings, quality: 'high' } });
    expect(fixture.info().viewpointGlide).toEqual(motion.viewpointGlide); expect(fixture.info().motion).toEqual(motion.motion); expect(fixture.info().running).toBe(true);
    advance(100); window.dispatchEvent(new Event('resize')); fixture.scene.capture();
    sample(fixture, [4, 1, 4]); expect(fixture.capabilities).toEqual([MAX_FILTER]); expect(fixture.queries).toEqual([EXTENSIONS[0]]);
    expect(allocations(fixture)).toEqual(count); expect(fixture.textures).toHaveLength(2);
  });

  it('keeps atlas bytes, points, shaders and resource ownership identical to the unsupported fallback', () => {
    const baseline = create({ available: false }), refined = create(); ready(baseline); ready(refined);
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) { baseline.scene.set({ region }); refined.scene.set({ region }); }
    expect(refined.textures.map(item => [item.width, item.height, item.hash])).toEqual(baseline.textures.map(item => [item.width, item.height, item.hash]));
    refined.textures.forEach((item, index) => expect(item.source).toBe(baseline.textures[index].source));
    expect(refined.uploadedPoints).toEqual(baseline.uploadedPoints); expect(refined.sources).toEqual(baseline.sources);
    expect(refined.buffers.map(item => item.length)).toEqual(baseline.buffers.map(item => item.length)); expect(allocations(refined)).toEqual(allocations(baseline));
    refined.scene.dispose(); refined.scene.dispose(); expect(refined.scene.capture()).toBeNull();
    for (const [kind, items] of Object.entries(refined.resources)) {
      expect(refined.deleted[kind]).toHaveLength(items.length);
      for (const item of items) expect(refined.deleted[kind].filter(resource => resource === item)).toHaveLength(1);
    }
    refined.scene.set({ quality: 'low' }); window.dispatchEvent(new Event('resize')); sample(refined, [4]);
  });

  it('avoids optional GPU calls after graphics loss and disposal', () => {
    const fixture = create(); ready(fixture); const queries = fixture.queries.slice(), capabilities = fixture.capabilities.slice();
    fixture.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    fixture.scene.set({ quality: 'low' }); window.dispatchEvent(new Event('resize')); expect(fixture.scene.capture()).toBeNull();
    sample(fixture, [4]); fixture.scene.dispose(); fixture.scene.set({ quality: 'high' }); window.dispatchEvent(new Event('resize'));
    expect(fixture.queries).toEqual(queries); expect(fixture.capabilities).toEqual(capabilities); sample(fixture, [4]);
    expect(fixture.deleted.Texture).toHaveLength(0); expect(frames.size).toBe(0);
  });

  it('never queries or writes an optional sampler when WebGL is unavailable', () => {
    const fixture = create({ glUnavailable: true });
    expect(fixture.statuses).toContainEqual([{ state: 'error', message: '3D exploration needs WebGL graphics support. Enable hardware acceleration or try another browser.' }]);
    fixture.scene.set({ quality: 'low' }); fixture.scene.set({ quality: 'high' }); window.dispatchEvent(new Event('resize'));
    expect(fixture.queries).toEqual([]); expect(fixture.capabilities).toEqual([]); sample(fixture, []);
    expect(allocations(fixture)).toEqual({ Buffer: 0, Texture: 0, Program: 0, Shader: 0 }); expect(fixture.scene.capture()).toBeNull();
  });
});
