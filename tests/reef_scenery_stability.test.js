import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SOURCE, loggingRuntime, toolSite } from './helpers/reef_clearance_perf_harness.js';

// Exercise the actual reef and species with a fake clock and renderer. Camera
// motion may change what is visible, but never a placed colony's identity.
vi.setConfig({ testTimeout: 300000 });
const mounted = [];
afterEach(() => { while (mounted.length) mounted.pop().dispose(); });

// Test-only access to the real compaction routine isolates governor behavior
// from camera easing and lets the boundary test move a camera in centimetres.
const controllerMarker = 'setView: setView, setPaused: setPaused,';
const controlledSource = SOURCE.replace(controllerMarker,
  '__forceSceneryRefresh: function () { refreshDecor(true); }, ' + controllerMarker);
function reef(options = {}, controlled = false, real = true) {
  if (controlled) expect(SOURCE.split(controllerMarker).length).toBe(2);
  const t = loggingRuntime({ quality: 'high', site: toolSite('healthy'), reducedMotion: true, ...options },
    controlled ? controlledSource : SOURCE, { real });
  mounted.push(t);
  return t;
}
const hash = (a) => createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
const matrixKey = (a, i) => Array.from(a.subarray(i * 16, i * 16 + 16)).join(',');
const sourceHash = (items) => ['matrices', 'colors', 'centres', 'skeletons'].map((k) => hash(items[k])).join(':');

function catalogue(t) {
  const decor = new Map(), fixed = new Map(), terrain = new Map();
  t.scene.traverse((o) => {
    if (o.userData.items) {
      const items = o.userData.items, indices = new Map();
      for (let i = 0; i < items.matrices.length / 16; i++) indices.set(matrixKey(items.matrices, i), i);
      expect(indices.size, o.userData.kind + ' has unique source anchors').toBe(items.matrices.length / 16);
      decor.set(o.userData.kind, { mesh: o, items, indices, hash: sourceHash(items) });
    }
    if (o.userData.exploreMatrices) {
      const array = o.userData.exploreMatrices, keys = new Set();
      for (let i = 0; i < array.length / 16; i++) keys.add(matrixKey(array, i));
      fixed.set(o.uuid, { mesh: o, hash: hash(array), keys });
    }
    if (['reef-explore-floor', 'reef-explore-bommies'].includes(o.name)) {
      terrain.set(o.name, { mesh: o, hash: hash(o.geometry.attributes.position.array), transform: o.matrix.clone() });
    }
  });
  expect(decor.size).toBeGreaterThan(10);
  expect(fixed.size).toBeGreaterThan(0);
  expect(terrain.size).toBe(2);
  return { scene: t.scene, decor, fixed, terrain };
}

// Inspect rendered slots, rather than merely comparing source arrays: removing
// an off-screen member compacts every later slot and must carry its own colour
// and living/bare-skeleton flag along with its world transform.
function inspect(t, base) {
  const errors = [], drawn = new Map();
  let decorCount = 0, fixedCount = 0, living = 0, skeletons = 0;
  if (t.scene !== base.scene) errors.push('scene replaced');
  for (const [kind, b] of base.decor) {
    if (b.mesh.userData.items !== b.items || sourceHash(b.items) !== b.hash) errors.push(kind + ' source data changed');
  }
  for (const [name, b] of base.terrain) {
    if (t.scene.getObjectByName(name) !== b.mesh || hash(b.mesh.geometry.attributes.position.array) !== b.hash || !b.mesh.matrix.equals(b.transform)) errors.push(name + ' changed');
  }
  for (const b of base.fixed.values()) if (hash(b.mesh.userData.exploreMatrices) !== b.hash) errors.push('fixed colony source changed');
  t.scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.visible) return;
    if (o.userData.decorative && o.userData.lod) {
      const b = base.decor.get(o.userData.kind), colors = o.instanceColor.array;
      const flags = o.geometry.getAttribute('reefSkeleton').array;
      for (let i = 0; i < o.count; i++) {
        const matrix = matrixKey(o.instanceMatrix.array, i), k = b.indices.get(matrix), key = o.userData.kind + ':' + matrix;
        if (k === undefined) { errors.push(o.name + ' foreign transform'); continue; }
        if (drawn.has(key)) errors.push(o.name + ' colony drawn in multiple detail tiers');
        for (let c = 0; c < 3; c++) if (colors[i * 3 + c] !== b.items.colors[k * 3 + c]) errors.push(o.name + ' colour does not belong to its anchor');
        if (flags[i] !== b.items.skeletons[k]) errors.push(o.name + ' tissue state does not belong to its anchor');
        drawn.set(key, o.userData.lod + ':' + Array.from(colors.subarray(i * 3, i * 3 + 3)).join(',') + ':' + flags[i]);
        decorCount++; if (flags[i]) skeletons++; else living++;
      }
    }
    if (o.userData.exploreMatrices) {
      const b = base.fixed.get(o.uuid), seen = new Set();
      for (let i = 0; i < o.count; i++) {
        const matrix = matrixKey(o.instanceMatrix.array, i);
        if (!b.keys.has(matrix)) errors.push(o.name + ' foreign fixed-colony transform');
        if (seen.has(matrix)) errors.push(o.name + ' fixed colony duplicated');
        seen.add(matrix); drawn.set(o.uuid + ':' + matrix, 'fixed'); fixedCount++;
      }
    }
  });
  expect(errors.slice(0, 12), errors.length + ' placement errors').toEqual([]);
  return { drawn, decorCount, fixedCount, living, skeletons };
}
const drawingHash = (sample) => createHash('sha256').update(JSON.stringify([...sample.drawn].sort())).digest('hex');
function crowdDrawn(t) {
  let n = 0;
  t.scene.traverse((o) => { if (o.isInstancedMesh && o.visible && o.userData.ambient && /^body/.test(o.userData.part)) n += o.count; });
  return n;
}

describe('fixed reef scenery during movement and adaptive performance', () => {
  for (const quality of ['low', 'high']) it('keeps source anchors, colours and tissue state through swimming and reversed turns (' + quality + ')', () => {
    const site = toolSite('healthy');
    site.health = { coralCover: 0.3, bleaching: 0.45, algae: 0.3 };
    const t = reef({ quality, site }), base = catalogue(t), seen = new Set(), histories = new Set();
    const start = { ...t.state().diver };
    let living = 0, skeletons = 0, maxTravel = 0, maxTurn = 0;
    const check = () => {
      const sample = inspect(t, base), d = t.state().diver;
      sample.drawn.forEach((_, key) => seen.add(key)); histories.add(drawingHash(sample));
      living += sample.living; skeletons += sample.skeletons;
      maxTravel = Math.max(maxTravel, Math.hypot(d.x - start.x, d.y - start.y, d.z - start.z));
      maxTurn = Math.max(maxTurn, Math.abs(d.headingDeg - start.headingDeg));
    };
    check();
    for (const [input, frames] of [[{ forward: 1, turn: 0 }, 100], [{ forward: -1, turn: 0 }, 100], [{ forward: 0, turn: 1 }, 80], [{ forward: 0, turn: -1 }, 80]]) {
      t.controller.setInput(input);
      for (let i = 0; i < frames; i++) { t.step(50); if (i % 20 === 19) check(); }
    }
    t.controller.setInput(null); t.run(1); check();
    expect(maxTravel, 'the diver actually moved through the scenery').toBeGreaterThan(2);
    expect(maxTurn, 'the view actually turned and reversed').toBeGreaterThan(45);
    expect(histories.size, 'camera motion exercised culling and detail transitions').toBeGreaterThan(8);
    expect(seen.size).toBeGreaterThan(500);
    expect(living, 'living tissue was inspected').toBeGreaterThan(100);
    expect(skeletons, 'bare skeleton compaction was inspected').toBeGreaterThan(20);
  });

  it('preserves the same fixed drawing through pressure and recovery while allowing mobile crowds to thin', () => {
    const t = reef({}, true); t.run(1.5); t.controller.setView('third');
    const base = catalogue(t), position = t.camera.position.clone(), rotation = t.camera.quaternion.clone();
    const sample = () => {
      t.camera.position.copy(position); t.camera.quaternion.copy(rotation); t.camera.updateMatrixWorld(true);
      t.controller.__forceSceneryRefresh(); return inspect(t, base);
    };
    const first = sample(), before = drawingHash(first), crowd = crowdDrawn(t);
    expect(first.decorCount).toBeGreaterThan(100); expect(first.fixedCount).toBeGreaterThan(0); expect(crowd).toBeGreaterThan(20);
    t.renderer.info.render.triangles = 2500000;
    t.run(3, 1000 / 60);
    expect(drawingHash(sample()), 'fast frames preserve all fixed anchors and detail tiers').toBe(before);
    expect(crowdDrawn(t)).toBe(crowd);
    // Comparing colour modes while paused still requests render frames. Even
    // with artificial script pressure these must not advance the governor.
    t.controller.setPaused(true); t.clockStep = 30;
    const modes = ['vivid', 'fluorescence', 'natural'];
    for (let i = 0; i < 30; i++) {
      t.controller.setVision(modes[i % modes.length]); t.run(0.5);
      expect(drawingHash(sample()), 'paused fixed drawing in ' + modes[i % modes.length]).toBe(before);
      expect(crowdDrawn(t), 'paused mode comparisons preserve the crowd').toBe(crowd);
    }
    t.clockStep = 0; t.controller.setPaused(false);
    const crowds = [];
    for (let i = 0; i < 40; i++) {
      t.run(0.5); crowds.push(crowdDrawn(t));
      expect(drawingHash(sample()), 'fixed drawing during pressure stage ' + i).toBe(before);
    }
    expect(Math.min(...crowds), 'performance pressure reached the mobile crowd').toBeLessThan(crowd * 0.85);
    t.renderer.info.render.triangles = 1000; t.run(20);
    expect(drawingHash(sample()), 'fixed drawing after recovery').toBe(before);
    expect(crowdDrawn(t), 'the mobile crowd recovers').toBeGreaterThanOrEqual(crowd * 0.97);
  });

  it('holds a colony detail tier during small camera reversals at both distance boundaries', () => {
    // Only the scenery algorithm matters here: use one lightweight selectable
    // species and the real terrain/colony geometry, then inspect the target slot.
    const site = { ...toolSite('healthy'), population: [{ id: 'brain_coral', count: 6 }] };
    const t = reef({ site }, true, false), base = catalogue(t), b = base.decor.get('brain');
    t.controller.setPaused(true);
    inspect(t, base);
    const target = b.items.matrices.subarray(0, 16), centre = b.items.centres, meshes = [];
    t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.kind === 'brain' && o.userData.lod) meshes.push(o); });
    const at = (distance) => {
      t.camera.position.set(centre[0], centre[1], centre[2] + distance);
      t.camera.lookAt(centre[0], centre[1], centre[2]); t.camera.updateMatrixWorld(true);
      t.controller.__forceSceneryRefresh();
      const tiers = [];
      for (const mesh of meshes) {
        if (!mesh.visible) continue;
        const matrix = mesh.instanceMatrix.array;
        for (let i = 0; i < mesh.count; i++) {
          let same = true;
          for (let k = 0; k < 16; k++) if (matrix[i * 16 + k] !== target[k]) { same = false; break; }
          if (same) tiers.push(mesh.userData.lod);
        }
      }
      expect(tiers.length, 'one target colony remains visible at ' + distance + ' m').toBe(1);
      return tiers[0];
    };
    let previous = at(3);
    expect(previous).toBe('near');
    const transitions = [];
    // Discover thresholds from actual behavior rather than reimplementing the
    // distance formula. A tiny retreat after crossing must not swap it back.
    for (let distance = 3.25; distance < 29 && transitions.length < 2; distance += 0.25) {
      const current = at(distance);
      if (current !== previous) {
        transitions.push(previous + '>' + current);
        for (let j = 0; j < 6; j++) expect(at(distance + (j % 2 ? 0.3 : -0.3)), 'no flicker at ' + distance + ' m').toBe(current);
        expect(at(distance - 2.6), 'a deliberate approach restores finer detail').toBe(previous);
        expect(at(distance), 'moving back out restores the coarser tier').toBe(current);
        previous = current;
      }
    }
    expect(transitions).toEqual(['near>mid', 'mid>far']);
    inspect(t, base);
  });
});
