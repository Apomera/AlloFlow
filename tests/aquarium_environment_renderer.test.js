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
      h.update({ dimensions });h.flush(700);h.flush(700);
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
  const lit = { light: { installed: true, on: true, intensity: 1 }, filter: { installed: true, on: true, intensity: 1 } };
  const swimmers = [resident('neon', 0), resident('neon', 1), resident('guppy', 2)];
  const shadowsOf = h => { const out = []; h.root('residents').traverse(n => { if (n.name === 'aquarium-resident-shadow') out.push(n); }); return out; };

  it('gives every resident a shadow that lies flat on the substrate', () => {
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'high' } });
    h.flush(600);
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
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'high' } });
    for (const dimensions of [{ width: 12, height: 5.2, depth: 6.4, volumeGallons: 20 }, { width: 18, height: 9, depth: 9, volumeGallons: 100 }]) {
      h.update({ dimensions });h.flush(700);
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
    const h = harness({ fish: [resident('neon', 0)], equipment: lit, model: { daylight: true }, appearance: { quality: 'high' } });
    h.flush(400);
    const body = h.root('residents').children[0], shadow = shadowsOf(h)[0];
    const samples = [];
    for (let step = 0; step < 90; step++) {
      h.flush(120);
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
    const h = harness({ fish: [floorFish, openFish], equipment: lit, model: { daylight: true }, appearance: { quality: 'high' } });
    h.flush(900);h.flush(900);
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
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'high' } });
    h.flush(400);
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

  it('omits resident shadows on the low quality tier', () => {
    const h = harness({ fish: swimmers, equipment: lit, model: { daylight: true }, appearance: { quality: 'low' } });
    h.flush(300);
    expect(shadowsOf(h).length).toBe(0);
  });
});
