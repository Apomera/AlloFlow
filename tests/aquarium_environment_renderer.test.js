// The geometry and raycaster are real Three r128; only GPU drawing is replaced.
// Real WebGL appearance and browser interactions are covered by the visual QA harness.
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const realThree = require('../vendor/three-r128/three.min.js');
const source = fs.readFileSync(path.resolve('stem_lab/stem_tool_aquarium.js'), 'utf8');
const start = source.indexOf('  function getAquariumPlantVisualProfile(id) {');
const end = source.indexOf('  function AquariumHabitat3DViewport(props) {', start);
const sceneSource = source.slice(start, end);
const cleanups = [];

function harness(initial = {}, preference = false) {
  const frames = new Map(), canvasListeners = new Map(), documentListeners = new Map();
  let frameId = 0, now = 0, renderer, mediaListener;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const canvas = {
    clientWidth: 760, clientHeight: 420,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }),
    addEventListener: (name, fn) => canvasListeners.set(name, fn),
    removeEventListener: (name, fn) => { if (canvasListeners.get(name) === fn) canvasListeners.delete(name); }
  };
  class Renderer {
    constructor() { renderer = this; this.render = vi.fn((scene, camera) => { this.scene = scene; this.camera = camera; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }); this.dispose = vi.fn(); this.renderLists = { dispose: vi.fn() }; }
    setPixelRatio(value) { this.pixelRatio = value; } setSize() {}
  }
  const media = { matches: preference, addEventListener: (_, fn) => { mediaListener = fn; }, removeEventListener: (_, fn) => { if (mediaListener === fn) mediaListener = null; } };
  const context = {
    window: { THREE: { ...realThree, WebGLRenderer: Renderer }, devicePixelRatio: 2, matchMedia: () => media, addEventListener() {}, removeEventListener() {} },
    document: { hidden: false, createElement: () => ({ width: 0, height: 0, getContext: () => ctx }), addEventListener: (name, fn) => documentListeners.set(name, fn), removeEventListener: name => documentListeners.delete(name) },
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    AquariumEcosystemCore: { getPlantHabitatPosition: (_, index) => ({ x: -3 + index * 2, y: 0.15, z: -1 }) }
  };
  const create = vm.runInNewContext(sceneSource + '; createAquariumHabitatScene', context);
  let options = { fish: [], plants: [], layout: [], catalog: [], overlay: 'none', ...initial };
  const engine = create(canvas, options);
  const flush = (ms = 40) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  flush();
  const result = {
    engine, renderer, frames, canvasListeners, documentListeners, flush,
    root: name => renderer.scene.getObjectByName('aquarium-' + name),
    update(patch) { options = { ...options, ...patch }; engine.update(options); },
    reduce(value) { media.matches = value; mediaListener({ matches: value }); },
    event(name, data = {}) { canvasListeners.get(name)?.({ button: 0, pointerId: 1, clientX: 380, clientY: 210, ...data }); },
    point(object) { renderer.scene.updateMatrixWorld(true); renderer.camera.updateMatrixWorld(true); let center = new realThree.Vector3(); if (object.geometry) { object.geometry.computeBoundingBox(); object.geometry.boundingBox.getCenter(center); object.localToWorld(center); } else object.getWorldPosition(center); const p = center.project(renderer.camera); return { clientX: (p.x + 1) * 380, clientY: (1 - p.y) * 210 }; }
  };
  cleanups.push(() => engine.dispose());
  return result;
}
const resident = (id, index = 0) => ({ id, instanceId: id + '-' + index, name: id, zone: 'mid', targetX: -2 + index * .3, targetZ: 0, fitScore: 80, stress: 0 });
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });


describe('Aquarium environment presentation', () => {
  it('preserves explicit zero shimmer and changes reflections without changing organisms, focus or model state', () => {
    const model = { daylight: true, chemistry: { ammonia: .2, oxygen: 6.4 }, simHour: 12 };
    const fish = { ...resident('neon'), selected: true };
    const plants = [{ id: 'anubias', name: 'Anubias', biomass: 1.6, maxBiomass: 3, health: 83 }];
    const appearance = { waterShimmer: 0 };
    const original = JSON.stringify({ model, fish, plants, appearance });
    const h = harness({ paused: true, model, fish: [fish], plants, appearance, equipment: { light: { installed: true, on: true, intensity: 1 } } });
    const shimmer = h.root('vessel').getObjectByName('aquarium-water-shimmer');
    const body = h.root('residents').children[0], plant = h.root('plants').children[0];
    expect(shimmer.visible).toBe(false);expect(shimmer.material.opacity).toBe(0);
    expect(h.engine.focusSelection({ kind: 'fish', id: fish.instanceId })).toBe(true);h.flush();
    const camera = h.renderer.camera.position.clone(), bodyPosition = body.position.clone();
    h.update({ appearance: { waterShimmer: .8 } });h.flush();
    expect(shimmer.visible).toBe(true);expect(shimmer.material.opacity).toBeGreaterThan(0);
    expect(h.root('residents').children[0]).toBe(body);expect(h.root('plants').children[0]).toBe(plant);
    expect(body.position.distanceTo(bodyPosition)).toBeLessThan(1e-9);
    expect(h.renderer.camera.position.distanceTo(camera)).toBeLessThan(1e-9);
    expect(h.frames.size).toBe(0);
    h.update({ appearance: { waterShimmer: 0 } });h.flush();
    expect(shimmer.visible).toBe(false);expect(shimmer.material.opacity).toBe(0);
    expect(JSON.stringify({ model, fish, plants, appearance })).toBe(original);
  });

  it('ties shimmer to effective light output, including worn, switched-off and zero-output fixtures', () => {
    const light = { installed: true, on: true, intensity: 1 };
    const h = harness({ paused: true, appearance: { waterShimmer: 1 }, equipment: { light }, model: { daylight: true } });
    const shimmer = h.root('vessel').getObjectByName('aquarium-water-shimmer');
    const full = shimmer.material.opacity;
    h.update({ equipment: { light: { ...light, intensity: .3 } } });h.flush();
    expect(shimmer.material.opacity).toBeCloseTo(full * .3, 8);
    for (const next of [{ ...light, on: false }, { ...light, intensity: 0 }]) {
      h.update({ equipment: { light: next } });h.flush();
      expect(shimmer.visible).toBe(false);expect(shimmer.material.opacity).toBe(0);
    }
    h.update({ equipment: {}, model: { daylight: false } });h.flush();
    expect(shimmer.visible).toBe(false);
    h.update({ equipment: {}, model: { daylight: true } });h.flush();
    expect(shimmer.visible).toBe(true);expect(shimmer.material.opacity).toBeCloseTo(full, 8);
  });

  it('keeps the visible waterline at the same surface as floating plants through vessel resizing', () => {
    const h = harness({ paused: true, plants: [{ id: 'duckweed', biomass: 2, maxBiomass: 4, health: 90 }] });
    const waterline = h.root('vessel').getObjectByName('aquarium-waterline');
    for (const dimensions of [{ width: 12, height: 5.2, depth: 6.4, volumeGallons: 20 }, { width: 18, height: 9, depth: 9, volumeGallons: 100 }, { width: 8, height: 4, depth: 6, volumeGallons: 10 }]) {
      h.update({ dimensions });h.flush();
      const box = new realThree.Box3().setFromObject(waterline);
      expect(box.min.y).toBeCloseTo(h.root('vessel').userData.waterSurfaceY, 5);
      expect(box.max.y).toBeCloseTo(box.min.y, 6);
      expect(h.root('plants').children[0].userData.waterlineY).toBeCloseTo(box.min.y, 5);
      expect(box.min.x).toBeGreaterThan(-dimensions.width / 2);
      expect(box.max.x).toBeLessThan(dimensions.width / 2);
    }
  });

  it('keeps environment colors stable through repeated appearance and light updates', () => {
    const h = harness({ paused: true, appearance: { substrate: 'sand', backdrop: 'depth', waterShimmer: .4 } });
    const vessel = h.root('vessel');
    const sand = vessel.children.find(node => node.material?.map?.repeat?.x === 5).material;
    const original = sand.color.clone();
    h.update({ appearance: { substrate: 'dark', backdrop: 'black', waterShimmer: 0 } });h.flush();
    expect(sand.color.r).toBeLessThan(original.r);expect(sand.color.g).toBeLessThan(original.g);
    for (let i = 0; i < 4; i++) {
      h.update({ lighting: i % 2 ? 'day' : 'night', appearance: { substrate: 'sand', backdrop: 'depth', waterShimmer: .4, quality: i % 2 ? 'balanced' : 'high' } });h.flush();
      expect(sand.color.distanceTo ? sand.color.distanceTo(original) : Math.abs(sand.color.r-original.r)+Math.abs(sand.color.g-original.g)+Math.abs(sand.color.b-original.b)).toBeLessThan(1e-9);
    }
    expect(h.frames.size).toBe(0);
  });
});
