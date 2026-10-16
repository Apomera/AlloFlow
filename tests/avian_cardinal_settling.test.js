import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function api() { const scope = {}; Function('window', anatomy)(scope); return scope; }
function snapshot(model, predicate = () => true) {
  const values = [];
  model.root.traverse(part => {
    if (!predicate(part)) return;
    values.push(...part.position.toArray(), ...part.quaternion.toArray());
    if (part.isMesh) values.push(...part.geometry.attributes.position.array);
  });
  return values;
}
function fixture(height = () => 0) {
  const scope = api(), scene = new THREE.Scene(); let model, pose;
  const create = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const result = create(...args), update = result.update;
    if (args[1] === 'northernCardinal') { model = result; result.update = next => { pose = { ...next }; update(next); }; }
    return result;
  };
  Function('window', behavior)(scope);
  const wildlife = scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed: 57, groundHeight: height });
  return { model, scene, wildlife, get pose() { return pose; }, state: () => wildlife.snapshot().find(b => b.id === 'northernCardinal') };
}
function soles(model) {
  const values = [], point = new THREE.Vector3();
  for (const foot of model.feet) {
    const mesh = foot.getObjectByName('woodland-scaled-toes'), { position, featherInfo } = mesh.geometry.attributes;
    for (let i = 0; i < position.count; i++) if (featherInfo.getX(i) !== 1) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); values.push(point.x, point.y, point.z);
    }
  }
  return values;
}
function difference(a, b) { let max = 0; for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i])); return max; }
describe('cardinal post-contact feather settling', () => {
  it('retains a brief crest/tail release after wing closure and finishes within existing guided recovery', () => {
    const f = fixture();
    try {
      for (const time of [14.19, 14.2]) { f.wildlife.update(time); expect(f.pose.landingSettle).toBeCloseTo(0, 12); }
      f.wildlife.update(14.3); expect(f.pose.landingSettle).toBeCloseTo(1, 12);
      f.wildlife.update(14.66); expect(f.pose.flight).toBe(0); expect(f.pose.landingSettle).toBeGreaterThan(.01);
      expect(f.model.tail.rotation.x).toBeGreaterThan(0);
      f.wildlife.update(14.73); expect(f.pose.landingSettle).toBe(0); expect(f.model.tail.rotation.x).toBe(0);
    } finally { f.wildlife.dispose(); }
  });
  it('joins the analytic contact, hold and release with continuous velocity and acceleration', () => {
    const f = fixture(), epsilon = 1e-5;
    try {
      for (const boundary of [14.2, 14.3, 14.72]) {
        const values = [];
        for (const offset of [-2, -1, 0, 1, 2]) { f.wildlife.update(boundary + offset * epsilon); values.push(f.pose.landingSettle); }
        const leftV = (3 * values[2] - 4 * values[1] + values[0]) / (2 * epsilon);
        const rightV = (-3 * values[2] + 4 * values[3] - values[4]) / (2 * epsilon);
        const leftA = (values[2] - 2 * values[1] + values[0]) / epsilon ** 2;
        const rightA = (values[4] - 2 * values[3] + values[2]) / epsilon ** 2;
        expect(Math.abs(leftV - rightV)).toBeLessThan(.00001);
        expect(Math.abs(leftA - rightA)).toBeLessThan(.7);
      }
    } finally { f.wildlife.dispose(); }
  });
  it.each(['low', 'high'])('changes only crest/tail at %s quality and restores exact rest through arbitrary seeking', quality => {
    const scope = api(), model = scope.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality });
    const resources = [];
    model.root.traverse(part => { if (part.isMesh) resources.push([part, part.geometry, part.material, part.geometry.attributes.position.array]); });
    try {
      model.update({}); const rest = snapshot(model);
      const protectedPart = part => !/woodland-(tail|layered-tail|head-plumage)/.test(part.name);
      const stable = snapshot(model, protectedPart);
      const head = model.head.getObjectByName('woodland-head-plumage').geometry.attributes;
      const skull = Array.from(head.position.array);
      model.update({ landingSettle: .6 }); const settled = snapshot(model);
      expect(snapshot(model, protectedPart)).toEqual(stable); expect(settled).not.toEqual(rest);
      for (let vertex = 0; vertex < head.position.count; vertex++) if (head.featherInfo.getY(vertex) > -1600)
        for (let axis = 0; axis < 3; axis++) expect(head.position.array[vertex * 3 + axis]).toBe(skull[vertex * 3 + axis]);
      for (const pose of [{ flight: 1, phase: 2.4, landing: .5 }, { hopPhase: .4, walking: .7 }, { landingSettle: .2 }, {}]) model.update(pose);
      model.update({ landingSettle: .6 }); expect(snapshot(model)).toEqual(settled);
      model.update({}); expect(snapshot(model)).toEqual(rest);
      for (const [part, geometry, material, positions] of resources) {
        expect(part.geometry).toBe(geometry); expect(part.material).toBe(material); expect(part.geometry.attributes.position.array).toBe(positions);
        expect(positions.every(Number.isFinite)).toBe(true); expect(geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);
      }
    } finally { model.dispose(); }
  });
  it.each([['flat', () => 0], ['sloped', (x, z) => .012 * x + .018 * z]])('keeps both soles planted through the actual free-flight release on %s terrain', (_name, height) => {
    const f = fixture(height), observer = { position: new THREE.Vector3(-.32, 1.65, 2.45), speed: 0 };
    let flew = false, landed = false, feet, releaseFrames = 0, closedFrames = 0;
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 5 * 120; frame++) {
        f.wildlife.update(frame / 120, 1 / 120, observer); f.scene.updateMatrixWorld(true);
        const state = f.state();
        if (state.altitude > .02) flew = true;
        if (flew && state.altitude === 0) landed = true;
        if (!landed || f.pose.landingSettle <= 0) continue;
        const values = soles(f.model);
        if (feet) expect(difference(values, feet)).toBeLessThan(1e-7);
        feet = values; releaseFrames++;
        expect(f.pose.flightTuck).toBe(0);
        if (f.pose.flight === 0) closedFrames++;
      }
      expect(releaseFrames).toBeGreaterThan(55); expect(closedFrames).toBeGreaterThan(15);
    } finally { f.wildlife.dispose(); }
  }, 20000);
  it('leaves every other shared species unchanged when given the cardinal settling cue', () => {
    const scope = api();
    for (const id of ['mourningDove', 'grouse', 'blueJay']) {
      const model = scope.AvianWoodlandBirds.create(THREE, id, { quality: 'low' });
      try {
        for (const pose of [{}, { flight: .5, phase: 1.2, landing: .7 }, { walking: .6, stride: 2.8 }]) {
          model.update(pose); const expected = snapshot(model);
          model.update({ ...pose, landingSettle: .8 }); expect(snapshot(model)).toEqual(expected);
        }
      } finally { model.dispose(); }
    }
  });
});
