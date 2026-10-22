import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const catalogSource = readFileSync('stem_lab/stem_sim_assets.js', 'utf8');
const birdSource = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const meadowSource = readFileSync('stem_lab/stem_sim_meadow.js', 'utf8');
const VERSION = '1.0.0', DOVE = 'animal.mourning-dove';
const PLANTS = ['shrub', 'grass', 'reed', 'seed'];

function load(source, window) { new Function('window', source)(window); }
function library({ providers = true, catalogFirst = false } = {}) {
  const window = {};
  if (catalogFirst) load(catalogSource, window);
  if (providers) { load(birdSource, window); load(meadowSource, window); }
  if (!catalogFirst) load(catalogSource, window);
  return window;
}
function deeplyFrozen(value) {
  return !value || typeof value !== 'object' || Object.isFrozen(value) && Object.values(value).every(deeplyFrozen);
}
function resources(root) {
  const result = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    result.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      result.add(material);
      for (const value of Object.values(material)) if (value && value.isTexture) result.add(value);
    }
  });
  return result;
}
function plain(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => key === 'uuid' ? undefined : item));
}
function snapshot(handle) {
  handle.root.updateMatrixWorld(true);
  const objects = [];
  handle.root.traverse(object => {
    const record = {
      name: object.name, type: object.type, visible: object.visible,
      position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
      matrixWorld: object.matrixWorld.toArray(), userData: plain(object.userData),
      castShadow: object.castShadow, receiveShadow: object.receiveShadow,
      frustumCulled: object.frustumCulled, renderOrder: object.renderOrder
    };
    if (object.geometry) {
      const geometry = object.geometry;
      record.geometry = {
        type: geometry.type, groups: plain(geometry.groups), drawRange: { ...geometry.drawRange },
        index: geometry.index ? Array.from(geometry.index.array) : null,
        attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, attribute]) => [key, {
          itemSize: attribute.itemSize, normalized: attribute.normalized, usage: attribute.usage,
          type: attribute.array.constructor.name, values: Array.from(attribute.array)
        }])),
        boundingBox: geometry.boundingBox ? [geometry.boundingBox.min.toArray(), geometry.boundingBox.max.toArray()] : null,
        boundingSphere: geometry.boundingSphere ? [geometry.boundingSphere.center.toArray(), geometry.boundingSphere.radius] : null
      };
      record.material = (Array.isArray(object.material) ? object.material : [object.material]).map(material => plain(material.toJSON()));
    }
    objects.push(record);
  });
  return { profile: plain(handle.profile), objects };
}
function placement(root) { return [...root.position.toArray(), ...root.quaternion.toArray(), ...root.scale.toArray()]; }

describe('shared simulation asset catalog pilot', () => {
  it('provides deeply immutable, honest metadata and exact version lookup without loading providers', () => {
    const window = library({ providers: false }), catalog = window.StemSimAssets;
    expect(catalog.version).toBe(VERSION); expect(Object.isFrozen(catalog)).toBe(true);
    expect(catalog.list().map(entry => entry.id)).toEqual([DOVE, ...PLANTS.map(kind => 'plant.meadow-' + kind)]);
    expect(deeplyFrozen(catalog.list())).toBe(true);
    for (const entry of catalog.list()) {
      expect(catalog.get(entry.id, VERSION)).toBe(entry);
      expect(catalog.available(entry.id, VERSION)).toBe(false);
      expect(entry.contract).toBeTruthy(); expect(entry.source.startsWith('stem_lab/')).toBe(true);
      expect(entry.dependencies.length).toBeGreaterThan(0); expect(entry.limits.length).toBeGreaterThan(0);
      for (const version of [undefined, null, '', 'latest', '1.0', '2.0.0']) expect(catalog.get(entry.id, version)).toBe(null);
    }
    const dove = catalog.get(DOVE, VERSION);
    expect(dove.units).toBe('metres'); expect(dove.forward).toBe('+Z'); expect(dove.up).toBe('+Y');
    expect(dove.dimensions).toContain('illustrative');
    for (const kind of PLANTS) expect(catalog.get('plant.meadow-' + kind, VERSION).units).toBe('authored-relative');
    expect(() => { dove.quality.push('ultra'); }).toThrow();
    expect(() => { dove.dependencies[0].version = 'latest'; }).toThrow();
    expect(Object.keys(window)).toEqual(['StemSimAssets']);
  });

  it('supports either script order, probes the current provider, and preserves one catalog on repeated loading', () => {
    const window = library({ providers: false }), catalog = window.StemSimAssets;
    expect(catalog.available(DOVE, VERSION)).toBe(false);
    load(birdSource, window); load(meadowSource, window);
    for (const entry of catalog.list()) expect(catalog.available(entry.id, VERSION)).toBe(true);
    load(catalogSource, window); expect(window.StemSimAssets).toBe(catalog);
    delete window.AvianWoodlandBirds;
    expect(catalog.available(DOVE, VERSION)).toBe(false);
    expect(catalog.available('plant.meadow-grass', VERSION)).toBe(true);
    const catalogFirst = library({ catalogFirst: true }).StemSimAssets;
    expect(catalogFirst.list()).toEqual(catalog.list()); expect(catalogFirst.available(DOVE, VERSION)).toBe(true);
  });

  it('passes the exact options, THREE instance, species, receiver and native result through', () => {
    const window = library({ providers: false }), result = { ownedBy: 'provider' }, options = Object.freeze({ quality: 'low', callerMarker: {} });
    const engine = {}, provider = {
      version: VERSION, supports: vi.fn(id => id === 'mourningDove'),
      create: vi.fn(function (three, id, input) { expect(this).toBe(provider); expect(three).toBe(engine); expect(input).toBe(options); return result; })
    };
    window.AvianWoodlandBirds = provider;
    expect(window.StemSimAssets.create(engine, DOVE, VERSION, options)).toBe(result);
    expect(provider.create).toHaveBeenCalledExactlyOnceWith(engine, 'mourningDove', options);
    const arrays = { positions: [], colors: [], smoothVertices: 0 }, meadow = { vegetation: vi.fn(function () { expect(this).toBe(meadow); return arrays; }) };
    window.StemMeadow = meadow;
    expect(window.StemSimAssets.createData('plant.meadow-reed', VERSION)).toBe(arrays);
    expect(meadow.vegetation).toHaveBeenCalledExactlyOnceWith('reed');
  });

  it('fails closed for unknown identifiers, versions, representations and unavailable or incompatible providers', () => {
    const window = library({ providers: false }), catalog = window.StemSimAssets;
    for (const id of ['animal.fox', 'mourningDove', '__proto__', 'constructor', '', null, undefined, { toString: () => DOVE }]) {
      expect(catalog.get(id, VERSION)).toBe(null); expect(catalog.available(id, VERSION)).toBe(false);
      expect(() => catalog.create(THREE, id, VERSION)).toThrow(RangeError);
    }
    for (const version of [undefined, 'latest', '1.0.1']) {
      expect(() => catalog.create(THREE, DOVE, version)).toThrow(RangeError);
      expect(() => catalog.createData('plant.meadow-shrub', version)).toThrow(RangeError);
    }
    expect(() => catalog.create(THREE, 'plant.meadow-grass', VERSION)).toThrow(/triangle-data/);
    expect(() => catalog.createData(DOVE, VERSION)).toThrow(/three-object/);
    for (const candidate of [undefined, {}, { version: '2.0.0', supports: () => true, create() {} },
      { version: VERSION, supports: () => false, create() {} }, { version: VERSION, supports: () => 1, create() {} },
      { version: VERSION, supports() { throw new Error('broken'); }, create() {} },
      { version: VERSION, supports: () => true }]) {
      window.AvianWoodlandBirds = candidate;
      expect(catalog.available(DOVE, VERSION)).toBe(false);
      expect(() => catalog.create(THREE, DOVE, VERSION)).toThrow(/provider unavailable/);
    }
    for (const candidate of [undefined, {}, { vegetation: true }]) {
      window.StemMeadow = candidate;
      expect(catalog.available('plant.meadow-seed', VERSION)).toBe(false);
      expect(() => catalog.createData('plant.meadow-seed', VERSION)).toThrow(/provider unavailable/);
    }
    const failure = new Error('native allocation failed');
    window.AvianWoodlandBirds = { version: VERSION, supports: () => true, create() { throw failure; } };
    expect(() => catalog.create(THREE, DOVE, VERSION)).toThrow(failure);
  });

  it.each(['high', 'low'])('preserves exact native dove geometry, material, profile, poses and caller placement with Three.js r128 (%s)', quality => {
    expect(THREE.REVISION).toBe('128');
    const window = library(), options = Object.freeze({ quality });
    const native = window.AvianWoodlandBirds.create(THREE, 'mourningDove', options);
    const catalog = window.StemSimAssets.create(THREE, DOVE, VERSION, options);
    try {
      expect(Object.keys(catalog)).toEqual(Object.keys(native));
      expect(snapshot(catalog)).toEqual(snapshot(native));
      for (const bird of [native, catalog]) {
        bird.root.position.set(12, 3, -7); bird.root.rotation.set(.2, -.6, .12); bird.root.scale.set(7.5, 7.5, 7.5);
      }
      const initialPlacement = placement(native.root), resourceSet = resources(catalog.root);
      const poses = [
        {}, { flight: 0, walking: .8, stride: 1.7, peck: .2, lookYaw: -.4, lookPitch: .2 },
        { flight: .3, phase: 2.7, effort: .65, bank: .2, tailSpread: .6 },
        { flight: 1, phase: 0, effort: .9, bank: -.45, tailSpread: .8 },
        { flight: 1, phase: 3.2, effort: .1, lookYaw: .3, lookPitch: -.4 },
        { flight: 0, peck: 1, stride: 0, walking: 0 },
        { flight: 0, walking: .8, stride: 1.7, peck: .2, lookYaw: -.4, lookPitch: .2 }
      ];
      for (const pose of poses) {
        native.update(pose); catalog.update(pose);
        expect(snapshot(catalog)).toEqual(snapshot(native));
        expect(placement(catalog.root)).toEqual(initialPlacement);
      }
      expect(resources(catalog.root)).toEqual(resourceSet);
      expect(options).toEqual({ quality });
    } finally { native.dispose(); catalog.dispose(); }
  });

  it('isolates instances and disposal, retaining the second model and its scene placement', () => {
    const { StemSimAssets: catalog } = library(), scene = new THREE.Scene();
    const first = catalog.create(THREE, DOVE, VERSION, { quality: 'low' });
    const second = catalog.create(THREE, DOVE, VERSION, { quality: 'low' });
    const firstResources = resources(first.root), secondResources = resources(second.root);
    const firstDisposals = new Map(), secondDisposals = new Map();
    for (const resource of firstResources) { firstDisposals.set(resource, 0); resource.addEventListener('dispose', () => firstDisposals.set(resource, firstDisposals.get(resource) + 1)); }
    for (const resource of secondResources) { secondDisposals.set(resource, 0); resource.addEventListener('dispose', () => secondDisposals.set(resource, secondDisposals.get(resource) + 1)); }
    try {
      expect(first).not.toBe(second); expect(first.root).not.toBe(second.root);
      for (const resource of firstResources) expect(secondResources.has(resource)).toBe(false);
      scene.add(first.root, second.root); second.root.position.set(3, 0, -2);
      second.update({ flight: .45, phase: 2.1, effort: .7 }); const unchanged = snapshot(second);
      first.update({ flight: 1, phase: 4, effort: 1, bank: .4 });
      first.root.traverse(object => { if (object.isMesh) { object.material.opacity = .3; object.geometry.attributes.position.array[0] += 1; } });
      expect(snapshot(second)).toEqual(unchanged);
      first.dispose(); first.dispose();
      expect(first.root.parent).toBe(null); expect(second.root.parent).toBe(scene);
      expect([...firstDisposals.values()].every(count => count === 1)).toBe(true);
      expect([...secondDisposals.values()].every(count => count === 0)).toBe(true);
      expect(snapshot(second)).toEqual(unchanged);
      second.update({ flight: 0, peck: 1 }); expect(placement(second.root).slice(0, 3)).toEqual([3, 0, -2]);
    } finally { first.dispose(); second.dispose(); }
    expect([...secondDisposals.values()].every(count => count === 1)).toBe(true);
  });

  it.each(PLANTS)('returns native, fresh %s data without shared arrays or GPU/clock dependencies', kind => {
    const { StemSimAssets: catalog, StemMeadow: meadow } = library();
    const id = 'plant.meadow-' + kind, native = meadow.vegetation(kind), first = catalog.createData(id, VERSION), second = catalog.createData(id, VERSION);
    expect(first).toEqual(native); expect(second).toEqual(native);
    expect(first).not.toBe(second); expect(first.positions).not.toBe(second.positions); expect(first.colors).not.toBe(second.colors);
    expect(first.positions.length).toBeGreaterThan(0); expect(first.colors).toHaveLength(first.positions.length);
    expect(first.positions.every(Number.isFinite)).toBe(true); expect(first.colors.every(Number.isFinite)).toBe(true);
    first.positions[0] = 12345; first.colors.push(-1); first.smoothVertices = -1;
    expect(second).toEqual(native); expect(catalog.createData(id, VERSION)).toEqual(native);
  });
});
