// The geometry and raycaster are real Three r128; only GPU drawing is replaced.
// Real WebGL appearance and browser interactions are covered by the visual QA harness.
import { describe, it, expect, vi, afterEach } from 'vitest';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

// Building real Three.js residents (pigment bakes, fin membranes) costs
// seconds per test, and the first harness also pays the one-time compile of
// the ~218KB scene source. The 5s default made these flip red under load;
// 30s matches the other 3D suites here.
vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });

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
// The renderer clamps dt to 0.05s per frame, so h.flush(900) advances the
// simulation by ONE 50ms step, not 900ms. Anything that needs the swim
// simulation to actually progress has to step it repeatedly.
const settle = (h, steps = 40) => { for (let i = 0; i < steps; i++) h.flush(50); };
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

describe('Aquarium atmosphere layer', () => {
  const atmosphere = h => h.root('atmosphere');
  const lightOn = { light: { installed: true, on: true, intensity: 1 } };

  it('suspends motes and light shafts that never intercept picking', () => {
    const h = harness({ paused: true, appearance: { waterShimmer: .8 }, equipment: lightOn, model: { daylight: true } });
    const layer = atmosphere(h);
    expect(layer).toBeTruthy();
    const motes = layer.getObjectByName('aquarium-suspended-motes');
    const shafts = layer.getObjectByName('aquarium-light-shafts');
    const vignette = layer.getObjectByName('aquarium-depth-vignette');
    expect(motes.geometry.attributes.position.count).toBeGreaterThan(0);
    expect(shafts.children.length).toBeGreaterThan(0);
    // Every atmosphere mesh must opt out of raycast picking, or it would
    // steal clicks meant for a fish behind it.
    layer.traverse(node => { if (node !== layer && node.isObject3D) expect(node.userData.ignorePick || layer.userData.ignorePick).toBeTruthy(); });
    expect(vignette.material.depthWrite).toBe(false);
    expect(motes.material.depthWrite).toBe(false);
    expect(shafts.children[0].material.depthWrite).toBe(false);
  });

  it('extinguishes shafts in the dark and dims motes, then restores them with the lamp', () => {
    const h = harness({ paused: true, appearance: { waterShimmer: 1 }, equipment: lightOn, model: { daylight: true } });
    const layer = atmosphere(h);
    const motes = layer.getObjectByName('aquarium-suspended-motes');
    const shafts = layer.getObjectByName('aquarium-light-shafts');
    const litMotes = motes.material.opacity, litShafts = shafts.children[0].material.opacity;
    expect(shafts.visible).toBe(true);
    expect(litShafts).toBeGreaterThan(0);
    h.update({ lighting: 'night' });h.flush();
    expect(shafts.visible).toBe(false);
    expect(shafts.children[0].material.opacity).toBe(0);
    h.update({ lighting: 'day' });h.flush();
    expect(shafts.visible).toBe(true);
    h.update({ equipment: { light: { installed: true, on: false, intensity: 1 } }, model: { daylight: false } });h.flush();
    expect(shafts.visible).toBe(false);
    expect(motes.material.opacity).toBeLessThan(litMotes);
    h.update({ equipment: lightOn, model: { daylight: true } });h.flush();
    expect(shafts.visible).toBe(true);
    expect(shafts.children[0].material.opacity).toBeCloseTo(litShafts, 8);
    expect(motes.material.opacity).toBeCloseTo(litMotes, 8);
  });

  it('scales shaft and mote strength with the shimmer slider', () => {
    const h = harness({ paused: true, appearance: { waterShimmer: 1 }, equipment: lightOn, model: { daylight: true } });
    const layer = atmosphere(h);
    const motes = layer.getObjectByName('aquarium-suspended-motes');
    const shafts = layer.getObjectByName('aquarium-light-shafts');
    const fullShaft = shafts.children[0].material.opacity, fullMote = motes.material.opacity;
    h.update({ appearance: { waterShimmer: 0 } });h.flush();
    expect(shafts.children[0].material.opacity).toBeLessThan(fullShaft);
    expect(motes.material.opacity).toBeLessThan(fullMote);
  });

  it('drifts motes only while animating, and holds them still under reduced motion', () => {
    const h = harness({ appearance: { waterShimmer: .7 }, equipment: lightOn, model: { daylight: true } });
    const motes = atmosphere(h).getObjectByName('aquarium-suspended-motes');
    const attr = motes.geometry.attributes.position;
    const before = Array.from(attr.array);
    h.flush(400);
    const moved = Array.from(attr.array).some((v, i) => Math.abs(v - before[i]) > 1e-6);
    expect(moved).toBe(true);
    expect(attr.version).toBeGreaterThan(0);
    h.reduce(true);h.flush(400);
    const held = Array.from(attr.array);
    h.flush(400);
    Array.from(attr.array).forEach((v, i) => expect(Math.abs(v - held[i])).toBeLessThan(1e-9));
  });

  it('keeps every mote inside the tank across a resize', () => {
    const h = harness({ appearance: { waterShimmer: .7 }, equipment: lightOn, model: { daylight: true } });
    const motes = atmosphere(h).getObjectByName('aquarium-suspended-motes');
    h.flush(900);
    const vessel = h.root('vessel').userData, attr = motes.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      expect(attr.getY(i)).toBeGreaterThanOrEqual(0);
      expect(attr.getY(i)).toBeLessThanOrEqual(vessel.waterSurfaceY + .2);
    }
  });

  it('draws no motes on the low quality tier', () => {
    const h = harness({ paused: true, appearance: { quality: 'low' }, equipment: lightOn, model: { daylight: true } });
    // The cloud is allocated once at the top tier and gated by drawRange, so
    // the object exists but contributes nothing on low.
    const motes = atmosphere(h).getObjectByName('aquarium-suspended-motes');
    expect(motes.geometry.drawRange.count).toBe(0);
    expect(motes.visible).toBe(false);
  });
});

describe('Aquarium water surface ripple', () => {
  const surfaceOf = h => h.root('vessel').getObjectByName('aquarium-water-surface');
  const running = { light: { installed: true, on: true, intensity: 1 }, filter: { installed: true, on: true, intensity: 1 } };

  it('displaces the surface and keeps uploading it while the filter runs', () => {
    const h = harness({ equipment: running, model: { daylight: true } });
    const surface = surfaceOf(h);
    const attr = surface.geometry.attributes.position;
    h.flush(600);
    const displaced = Array.from({ length: attr.count }, (_, i) => attr.getZ(i));
    expect(displaced.some(z => Math.abs(z) > 1e-4)).toBe(true);
    expect(attr.version).toBeGreaterThan(0);
    const before = displaced.slice();
    h.flush(600);
    expect(Array.from({ length: attr.count }, (_, i) => attr.getZ(i)).some((z, i) => Math.abs(z - before[i]) > 1e-5)).toBe(true);
  });

  it('roughens the surface when the filter and airstone run, and calms it when they stop', () => {
    const peak = h => { let m = 0; const a = surfaceOf(h).geometry.attributes.position; for (let i = 0; i < a.count; i++) m = Math.max(m, Math.abs(a.getZ(i))); return m; };
    const h = harness({ equipment: running, model: { daylight: true } });
    h.flush(800);
    const stirred = peak(h);
    h.update({ equipment: { light: running.light, filter: { installed: true, on: false, intensity: 1 } } });
    h.flush(800);
    expect(peak(h)).toBeLessThan(stirred);
    h.update({ equipment: { ...running, aerator: { installed: true, on: true, intensity: 1 } } });
    h.flush(800);
    expect(peak(h)).toBeGreaterThan(0);
  });

  it('re-derives displacement from rest rather than accumulating it', () => {
    const h = harness({ equipment: running, model: { daylight: true } });
    const attr = surfaceOf(h).geometry.attributes.position;
    let worst = 0;
    for (let step = 0; step < 24; step++) { h.flush(500); for (let i = 0; i < attr.count; i++) worst = Math.max(worst, Math.abs(attr.getZ(i))); }
    // A drifting sum would grow without bound; a re-derived wave stays bounded.
    expect(worst).toBeLessThan(1);
  });

  it('holds the surface still under reduced motion', () => {
    const h = harness({ equipment: running, model: { daylight: true } });
    h.flush(400);h.reduce(true);h.flush(400);
    const attr = surfaceOf(h).geometry.attributes.position;
    const held = Array.from({ length: attr.count }, (_, i) => attr.getZ(i));
    h.flush(900);
    held.forEach((z, i) => expect(Math.abs(attr.getZ(i) - z)).toBeLessThan(1e-9));
  });
});

describe('Aquarium atmosphere respects tiers, shimmer and the glass', () => {
  const lit = { light: { installed: true, on: true, intensity: 1 }, filter: { installed: true, on: true, intensity: 1 } };
  const motesOf = h => h.root('atmosphere').getObjectByName('aquarium-suspended-motes');
  const shaftsOf = h => h.root('atmosphere').getObjectByName('aquarium-light-shafts');
  const drawn = h => { const m = motesOf(h); return m ? m.geometry.drawRange.count : 0; };

  it('changes the drawn mote count when quality changes, without rebuilding the buffer', () => {
    const h = harness({ appearance: { quality: 'high', waterShimmer: .8 }, equipment: lit, model: { daylight: true } });
    const buffer = motesOf(h).geometry.attributes.position;
    const high = drawn(h);
    expect(high).toBeGreaterThan(0);
    h.update({ appearance: { quality: 'medium', waterShimmer: .8 } });h.flush();
    const medium = drawn(h);
    expect(medium).toBeGreaterThan(0);
    expect(medium).toBeLessThan(high);
    h.update({ appearance: { quality: 'low', waterShimmer: .8 } });h.flush();
    expect(drawn(h)).toBe(0);
    expect(motesOf(h).visible).toBe(false);
    h.update({ appearance: { quality: 'high', waterShimmer: .8 } });h.flush();
    expect(drawn(h)).toBe(high);
    expect(motesOf(h).visible).toBe(true);
    // Same GPU buffer throughout: the tier selects a range, it does not realloc.
    expect(motesOf(h).geometry.attributes.position).toBe(buffer);
  });

  it('switches shafts fully off at zero shimmer, exactly as the caustic floor does', () => {
    const h = harness({ appearance: { quality: 'high', waterShimmer: 1 }, equipment: lit, model: { daylight: true } });
    const shimmerFloor = h.root('vessel').getObjectByName('aquarium-water-shimmer');
    expect(shaftsOf(h).children[0].material.opacity).toBeGreaterThan(0);
    h.update({ appearance: { quality: 'high', waterShimmer: 0 } });h.flush();
    expect(shaftsOf(h).children[0].material.opacity).toBe(0);
    expect(shaftsOf(h).visible).toBe(false);
    expect(shimmerFloor.visible).toBe(false);
  });

  it('keeps drifting motes inside the glass at every vessel size', () => {
    const h = harness({ appearance: { quality: 'high', waterShimmer: .8 }, equipment: lit, model: { daylight: true } });
    for (const dimensions of [{ width: 12, height: 5.2, depth: 6.4, volumeGallons: 20 }, { width: 8, height: 4, depth: 6, volumeGallons: 10 }, { width: 18, height: 9, depth: 9, volumeGallons: 100 }]) {
      h.update({ dimensions });settle(h, 8);
      const vessel = h.root('vessel'), motes = motesOf(h);
      vessel.updateMatrixWorld(true);motes.updateMatrixWorld(true);
      const attr = motes.geometry.attributes.position, point = new realThree.Vector3();
      for (let i = 0; i < attr.count; i++) {
        point.set(attr.getX(i), attr.getY(i), attr.getZ(i));
        motes.localToWorld(point);
        expect(Math.abs(point.x)).toBeLessThanOrEqual(dimensions.width / 2);
        expect(Math.abs(point.z)).toBeLessThanOrEqual(dimensions.depth / 2);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(vessel.userData.waterSurfaceY);
      }
    }
  });
});

describe('Aquarium resident contact shadows', () => {
  // 'medium' rather than 'high': shadows behave identically on every non-low
  // tier, and high's per-fish 512px pigment bake pushed these past the 5s limit.
  const lit = { light: { installed: true, on: true, intensity: 1 }, filter: { installed: true, on: true, intensity: 1 } };
  const swimmers = [resident('neon', 0), resident('guppy', 1)];
  const shadowsOf = h => { const out = []; (h.root('resident-shadows') || { traverse() {} }).traverse(n => { if (n.name === 'aquarium-resident-shadow') out.push(n); }); return out; };

  it('gives every resident a shadow that lies flat on the substrate', () => {
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    settle(h, 6);
    const shadows = shadowsOf(h);
    expect(shadows.length).toBe(swimmers.length);
    h.renderer.scene.updateMatrixWorld(true);
    const up = new realThree.Vector3(), quat = new realThree.Quaternion();
    for (const shadow of shadows) {
      // A plane resting on the substrate has a world normal pointing straight
      // up. Composing a yaw onto an X-rotated plane tilts it instead, so this
      // is the assertion that catches a bad counter-rotation.
      up.set(0, 0, 1).applyQuaternion(shadow.getWorldQuaternion(quat)).normalize();
      expect(Math.abs(up.y)).toBeGreaterThan(0.999);
      expect(shadow.userData.ignorePick).toBe(true);
      expect(shadow.material.depthWrite).toBe(false);
    }
  });

  it('keeps each shadow on the sand, never inside it or adrift in open water', () => {
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    for (const dimensions of [{ width: 12, height: 5.2, depth: 6.4, volumeGallons: 20 }, { width: 18, height: 9, depth: 9, volumeGallons: 100 }]) {
      h.update({ dimensions });settle(h, 8);
      h.renderer.scene.updateMatrixWorld(true);
      const floor = h.root('vessel').getObjectByName('aquarium-substrate-bed');
      floor.updateMatrixWorld(true);
      const floorY = floor.getWorldPosition(new realThree.Vector3()).y;
      // The substrate surface sits a little above the bed's origin and that
      // gap scales with vessel height, so the tolerance has to scale too --
      // a fixed constant passes on a 20gal and is flaky on a 100gal.
      const surfaceGap = 0.1 * (dimensions.height / 5.2) + 0.02;
      for (const shadow of shadowsOf(h)) {
        const y = shadow.getWorldPosition(new realThree.Vector3()).y;
        expect(y).toBeGreaterThanOrEqual(floorY - 0.02);
        expect(y).toBeLessThanOrEqual(floorY + surfaceGap);
      }
    }
  });

  it('fades a shadow as its resident rises and darkens it near the substrate', () => {
    // The swim simulation owns fish height: it clamps to the vessel and eases
    // toward a target, so writing position.y and flushing races the easing and
    // can read a fish that has already been pulled back. Sample whatever
    // heights actually occur instead, and assert the monotonic relationship.
    const h = harness({ fish: [resident('neon', 0)], equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    settle(h, 6);
    const body = h.root('residents').children[0], shadow = shadowsOf(h)[0];
    const samples = [];
    for (let step = 0; step < 30; step++) {
      h.flush(50);
      samples.push({ altitude: body.position.y + body.userData.bodyMinY, opacity: shadow.material.opacity, spread: shadow.scale.x });
    }
    // A cruising fish's bob is small (measured ~0.046 units over 90 steps), so
    // require only that some spread exists rather than guessing a magnitude.
    const altitudes = samples.map(s => s.altitude);
    const spanned = Math.max(...altitudes) - Math.min(...altitudes);
    expect(spanned).toBeGreaterThan(0);
    const lowest = samples.reduce((a, b) => (b.altitude < a.altitude ? b : a));
    const highest = samples.reduce((a, b) => (b.altitude > a.altitude ? b : a));
    expect(highest.opacity).toBeLessThan(lowest.opacity);
    expect(highest.spread).toBeGreaterThan(lowest.spread);
  });

  it('draws a tighter, darker shadow for a bottom dweller than for a mid-water swimmer', () => {
    // Bottom dwellers and open-water fish differ in height by design, which is
    // a far larger and more stable signal than one fish's incidental bob.
    const floorFish = { ...resident('bristlenose', 0), zone: 'bottom' };
    const openFish = { ...resident('neon', 1), zone: 'mid' };
    const h = harness({ fish: [floorFish, openFish], equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    settle(h, 24);
    const residents = h.root('residents').children;
    const byId = id => residents.find(r => r.userData.fishInstanceId === id);
    const low = byId(floorFish.instanceId), high = byId(openFish.instanceId);
    expect(low).toBeTruthy();expect(high).toBeTruthy();
    const lowAltitude = low.position.y + low.userData.bodyMinY;
    const highAltitude = high.position.y + high.userData.bodyMinY;
    expect(highAltitude).toBeGreaterThan(lowAltitude);
    const lowShadow = low.userData.residentShadow, highShadow = high.userData.residentShadow;
    expect(lowShadow.material.opacity).toBeGreaterThan(highShadow.material.opacity);
    expect(lowShadow.scale.x).toBeLessThan(highShadow.scale.x);
  });

  it('disposes a shadow with its resident, leaving nothing behind', () => {
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    settle(h, 6);
    const shadows = shadowsOf(h);
    expect(shadows.length).toBe(swimmers.length);
    const spies = [];
    for (const shadow of shadows) {
      spies.push(vi.spyOn(shadow.geometry, 'dispose'));
      spies.push(vi.spyOn(shadow.material, 'dispose'));
    }
    h.update({ fish: [] });h.flush();
    // A shadow parented to a removed resident must be torn down with it, or a
    // tank the learner keeps restocking leaks a plane per fish.
    for (const spy of spies) expect(spy).toHaveBeenCalled();
    expect(shadowsOf(h).length).toBe(0);
    expect(h.root('residents').children).toHaveLength(0);
  });

  it('keeps the shadow out of the resident it belongs to', () => {
    // A shadow is a mark on the substrate, not part of the animal. Parented
    // INSIDE the fish it inflated Box3.setFromObject(fish) far below the body
    // and past the glass, and exposed the shared shadow map to per-fish
    // resource disposal checks. Both broke other suites while this one stayed
    // green, so pin the containment here.
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    settle(h, 8);
    const shadows = shadowsOf(h);
    expect(shadows.length).toBe(swimmers.length);
    for (const resident of h.root('residents').children) {
      let found = false;
      resident.traverse(n => { if (n.name === 'aquarium-resident-shadow') found = true; });
      expect(found).toBe(false);
    }
    // The residents root holds residents only; nothing else may be counted as one.
    expect(h.root('residents').children.length).toBe(swimmers.length);
  });

  it('omits resident shadows on the low quality tier', () => {
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'low' } });
    settle(h, 4);
    expect(shadowsOf(h).length).toBe(0);
  });
});

describe('Aquarium plant flex', () => {
  const lit = { light: { installed: true, on: true, intensity: 1 }, filter: { installed: true, on: true, intensity: 1 } };
  const flora = [
    { id: 'vallisneria', name: 'Vallisneria', biomass: 2.4, maxBiomass: 3, health: 92 },
    { id: 'java-fern', name: 'Java Fern', biomass: 1.5, maxBiomass: 3, health: 85 }
  ];
  const rigged = h => h.root('plants').children.filter(g => g.userData.plantFlexRig);
  const extremes = group => {
    // Lowest and highest rest vertex across every rigged buffer of one plant.
    const rig = group.userData.plantFlexRig;
    let lo = null, hi = null, loY = Infinity, hiY = -Infinity;
    for (const entry of rig.entries) {
      for (let i = 0; i < entry.position.count; i++) {
        const y = entry.rest[i * 3 + 1];
        if (y < loY) { loY = y; lo = { entry, i }; }
        if (y > hiY) { hiY = y; hi = { entry, i }; }
      }
    }
    return { lo, hi };
  };
  const offset = pick => Math.abs(pick.entry.position.getX(pick.i) - pick.entry.rest[pick.i * 3]);

  it('anchors the base and moves the tip, instead of tipping the whole plant', () => {
    const h = harness({ plants: flora, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    const plants = rigged(h);
    expect(plants.length).toBeGreaterThan(0);
    let sawBend = false;
    for (const group of plants) {
      const { lo, hi } = extremes(group);
      let baseWorst = 0, tipBest = 0;
      for (let step = 0; step < 24; step++) {
        h.flush(50);
        baseWorst = Math.max(baseWorst, offset(lo));
        tipBest = Math.max(tipBest, offset(hi));
      }
      // The anchored end stays put; the free end travels.
      expect(baseWorst).toBeLessThan(1e-6);
      if (tipBest > 1e-4) sawBend = true;
      // A rigid tip-over would show as a rotated group; the group stays put.
      expect(group.rotation.z).toBeCloseTo(group.userData.baseRotation || 0, 10);
    }
    expect(sawBend).toBe(true);
  });

  it('bends further on a taller plant than a low rhizome one', () => {
    const h = harness({ plants: flora, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    const spans = rigged(h).map(g => g.userData.plantFlexRig.span);
    // Displacement is scaled by each plant's own span, so spans must differ for
    // the comparison to mean anything, and the taller rig must carry more reach.
    expect(Math.max(...spans)).toBeGreaterThan(Math.min(...spans));
  });

  it('re-derives the bend from rest rather than accumulating it', () => {
    const h = harness({ plants: flora, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    const group = rigged(h)[0];
    const { hi } = extremes(group);
    let worst = 0;
    for (let step = 0; step < 120; step++) { h.flush(50); worst = Math.max(worst, offset(hi)); }
    // A drifting sum would grow without bound across many frames.
    expect(worst).toBeLessThan(group.userData.plantFlexRig.span);
  });

  it('releases the rig with its plant, and re-rigs a replacement', () => {
    // The rig caches a rest copy and a weight array per buffer (~2x the vertex
    // data), so a plant that is removed must take its rig with it.
    const h = harness({ plants: flora, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    const before = rigged(h);
    expect(before.length).toBeGreaterThan(0);
    const spies = [];
    for (const group of before) {
      for (const entry of group.userData.plantFlexRig.entries) spies.push(vi.spyOn(entry.geometry, 'dispose'));
    }
    h.update({ plants: [] });h.flush();
    for (const spy of spies) expect(spy).toHaveBeenCalled();
    expect(h.root('plants').children).toHaveLength(0);
    expect(rigged(h).length).toBe(0);
    // A replanted tank gets a fresh rig rather than reusing a disposed one.
    h.update({ plants: flora });h.flush();
    const after = rigged(h);
    expect(after.length).toBeGreaterThan(0);
    expect(after[0].userData.plantFlexRig).not.toBe(before[0].userData.plantFlexRig);
  });

  it('holds plants still under reduced motion and skips the rig on the low tier', () => {
    const h = harness({ plants: flora, equipment: lit, model: { daylight: true }, appearance: { quality: 'medium' } });
    const group = rigged(h)[0], { hi } = extremes(group);
    for (let step = 0; step < 10; step++) h.flush(50);
    h.reduce(true);
    for (let step = 0; step < 4; step++) h.flush(50);
    const held = hi.entry.position.getX(hi.i);
    for (let step = 0; step < 10; step++) h.flush(50);
    expect(Math.abs(hi.entry.position.getX(hi.i) - held)).toBeLessThan(1e-9);

    const cheap = harness({ plants: flora, equipment: lit, model: { daylight: true }, appearance: { quality: 'low' } });
    expect(rigged(cheap).length).toBe(0);
  });
});

describe('Aquarium visible condition cues', () => {
  const lit = { light: { installed: true, on: true, intensity: 1 }, filter: { installed: true, on: true, intensity: 1 } };
  const clean = { dissolvedO2: 7.5, ammonia: 0, nitrite: 0 };
  const swimmers = [resident('neon', 0), resident('guppy', 1)];
  const withCondition = (patch) => swimmers.map(f => ({ ...f, ...patch }));
  const firstTracked = group => { let mat = null; group.traverse(n => { if (!mat && n.material && n.material.userData && n.material.userData.symptomTracked) mat = n.material; }); return mat; };

  it('drains colour and clamps fins as stress rises, and restores them when it passes', () => {
    const h = harness({ fish: withCondition({ stress: 0, health: 100 }), equipment: lit, model: { daylight: true, chemistry: clean }, appearance: { quality: 'medium' } });
    settle(h, 6);
    const body = h.root('residents').children[0];
    const swatch = firstTracked(body);
    expect(swatch).toBeTruthy();
    const healthy = swatch.color.clone();
    expect(body.userData.conditionColourFade).toBe(0);
    expect(body.userData.finClampCue).toBe(0);

    h.update({ fish: withCondition({ stress: 95, health: 100 }) });settle(h, 6);
    const stressedBody = h.root('residents').children[0];
    expect(stressedBody.userData.conditionColourFade).toBeGreaterThan(0.3);
    expect(stressedBody.userData.finClampCue).toBeGreaterThan(0.3);
    expect(firstTracked(stressedBody).color.equals(healthy)).toBe(false);

    // Recovery must return the original pigment, not a progressively greyer one.
    h.update({ fish: withCondition({ stress: 0, health: 100 }) });settle(h, 6);
    const recovered = h.root('residents').children[0];
    expect(recovered.userData.conditionColourFade).toBe(0);
    const back = firstTracked(recovered).color;
    expect(back.r).toBeCloseTo(healthy.r, 5);
    expect(back.g).toBeCloseTo(healthy.g, 5);
    expect(back.b).toBeCloseTo(healthy.b, 5);
  });

  it('does not compound the fade when stress holds steady across many frames', () => {
    const h = harness({ fish: withCondition({ stress: 80, health: 40 }), equipment: lit, model: { daylight: true, chemistry: clean }, appearance: { quality: 'medium' } });
    settle(h, 6);
    const swatch = firstTracked(h.root('residents').children[0]).color.clone();
    settle(h, 120);
    const later = firstTracked(h.root('residents').children[0]).color;
    expect(later.r).toBeCloseTo(swatch.r, 6);
    expect(later.g).toBeCloseTo(swatch.g, 6);
    expect(later.b).toBeCloseTo(swatch.b, 6);
  });

  it('draws swimmers toward the surface on low oxygen or high ammonia, and leaves bottom dwellers alone', () => {
    const bottomFish = { ...resident('bristlenose', 2), zone: 'bottom', locomotion: 'crawl' };
    const stock = [...withCondition({ stress: 10, health: 90 }), bottomFish];
    const h = harness({ fish: stock, equipment: lit, model: { daylight: true, chemistry: clean }, appearance: { quality: 'medium' } });
    settle(h, 30);
    const heights = () => {
      const out = { swimmers: [], bottom: [] };
      for (const g of h.root('residents').children) (g.userData.bottom || g.userData.stationary ? out.bottom : out.swimmers).push(g.position.y);
      return out;
    };
    expect(h.root('residents').children.some(g => g.userData.bottom)).toBe(true);
    const calm = heights();
    const calmSwim = calm.swimmers.reduce((a, b) => a + b, 0) / calm.swimmers.length;

    for (const bad of [{ dissolvedO2: 1.5, ammonia: 0, nitrite: 0 }, { dissolvedO2: 7.5, ammonia: 2.8, nitrite: 0 }, { dissolvedO2: 7.5, ammonia: 0, nitrite: 2.6 }]) {
      h.update({ model: { daylight: true, chemistry: bad } });settle(h, 30);
      const sick = heights();
      const sickSwim = sick.swimmers.reduce((a, b) => a + b, 0) / sick.swimmers.length;
      expect(sickSwim).toBeGreaterThan(calmSwim);
      // A bottom dweller stays on the bottom. Comparing it to the swimmers is
      // too weak - one lifted halfway up the tank is still below them.
      expect(sick.bottom.length).toBeGreaterThan(0);
      const calmBottom = Math.max(...calm.bottom);
      expect(Math.max(...sick.bottom)).toBeLessThan(calmBottom + 0.25);
      h.update({ model: { daylight: true, chemistry: clean } });settle(h, 30);
    }
  });

  it('reads no distress at all when the water has not been measured', () => {
    const h = harness({ fish: withCondition({ stress: 0, health: 100 }), equipment: lit, model: { daylight: true, chemistry: { dissolvedO2: null, ammonia: null, nitrite: null } }, appearance: { quality: 'medium' } });
    settle(h, 8);
    // Unknown chemistry must not invent a symptom.
    expect(h.root('environment').userData.surfaceDistressCue).toBe(0);
  });

  it('clouds the water for a bloom and greens it for algae, from the same clean baseline', () => {
    const h = harness({ fish: [], equipment: lit, model: { daylight: true, chemistry: clean }, appearance: { quality: 'medium' } });
    h.flush();
    const cue = () => h.root('environment').userData.clarityCue;
    expect(cue()).toEqual({ algae: 0, bloom: 0 });

    h.update({ algaeLevel: 85 });h.flush();
    expect(cue().algae).toBeGreaterThan(0.5);
    expect(cue().bloom).toBe(0);

    h.update({ algaeLevel: 0, model: { daylight: true, chemistry: { dissolvedO2: 7.5, ammonia: 2.6, nitrite: 0 } } });h.flush();
    expect(cue().algae).toBe(0);
    expect(cue().bloom).toBeGreaterThan(0.5);

    h.update({ model: { daylight: true, chemistry: clean } });h.flush();
    expect(cue()).toEqual({ algae: 0, bloom: 0 });
  });
});

describe('Aquarium equipment status cues', () => {
  const dev = (patch) => ({ installed: true, on: true, intensity: 1, condition: 100, fault: '', ...patch });
  const rig = (heater) => ({ light: dev({}), filter: dev({}), heater: dev(heater) });
  const statusOf = h => h.root('equipment').getObjectByName('equipment-heater').userData.equipmentStatusCue;
  const pipOf = h => {
    // The indicator is the emissive sphere on the device.
    let found = null;
    h.root('equipment').getObjectByName('equipment-heater').traverse(n => {
      if (!found && n.material && n.material.emissive && n.geometry && n.geometry.type === 'SphereGeometry') found = n;
    });
    return found;
  };

  it('tells a failed device apart from a switched-off one', () => {
    // Both report on:false - a fault zeroes output - so before this they were
    // pixel-identical, and "my heater is broken" looked like "I turned it off".
    const off = harness({ equipment: rig({ on: false, intensity: 0 }), model: { daylight: true } });
    expect(statusOf(off)).toBe('off');
    const offColour = pipOf(off).material.color.getHexString();

    const failed = harness({ equipment: rig({ on: false, intensity: 0, fault: 'burnt out' }), model: { daylight: true } });
    expect(statusOf(failed)).toBe('offline');
    expect(pipOf(failed).material.color.getHexString()).not.toBe(offColour);
    // An alert the learner cannot see is not an alert.
    expect(pipOf(failed).scale.x).toBeGreaterThan(pipOf(off).scale.x);
  });

  it('flags wear at the same threshold the simulation counts as needing service', () => {
    // The tool counts condition <= 25 (without a fault) as needing service.
    const ok = harness({ equipment: rig({ condition: 26, intensity: .26 }), model: { daylight: true } });
    expect(statusOf(ok)).toBe('running');
    const worn = harness({ equipment: rig({ condition: 25, intensity: .25 }), model: { daylight: true } });
    expect(statusOf(worn)).toBe('needs-service');
    expect(pipOf(worn).material.color.getHexString()).not.toBe(pipOf(ok).material.color.getHexString());
  });

  it('reports a fault ahead of wear, and leaves a healthy device unchanged', () => {
    const both = harness({ equipment: rig({ on: false, intensity: 0, condition: 5, fault: 'jammed' }), model: { daylight: true } });
    expect(statusOf(both)).toBe('offline');
    const healthy = harness({ equipment: rig({}), model: { daylight: true } });
    expect(statusOf(healthy)).toBe('running');
    // A healthy tank must look exactly as it did before this cue existed.
    expect(healthy.root('equipment').getObjectByName('equipment-heater').userData.equipmentStatusScale).toBe(1);
  });

  it('does not invent a warning for a device with no condition reported', () => {
    // Callers may omit condition/fault entirely. Unknown must read as healthy,
    // not as wear - the same rule as unmeasured water chemistry.
    const h = harness({ equipment: { light: { installed: true, on: true, intensity: 1 }, filter: { installed: true, on: true, intensity: 1 }, heater: { installed: true, on: true, intensity: 1 } }, model: { daylight: true } });
    expect(statusOf(h)).toBe('running');
    expect(h.root('equipment').getObjectByName('equipment-heater').userData.equipmentStatusScale).toBe(1);
  });

  it('re-reads the status when condition or fault changes on a live device', () => {
    const h = harness({ equipment: rig({}), model: { daylight: true } });
    expect(statusOf(h)).toBe('running');
    h.update({ equipment: rig({ condition: 12, intensity: .12 }) });h.flush();
    expect(statusOf(h)).toBe('needs-service');
    h.update({ equipment: rig({ on: false, intensity: 0, fault: 'seized' }) });h.flush();
    expect(statusOf(h)).toBe('offline');
    h.update({ equipment: rig({}) });h.flush();
    expect(statusOf(h)).toBe('running');
  });
});
