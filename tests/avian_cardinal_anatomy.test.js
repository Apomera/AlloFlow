import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
const api = scope.AvianWoodlandBirds;
function meshes(bird) { const found = []; bird.root.traverse(part => { if (part.isMesh) found.push(part); }); return found; }
function bounds(root) {
  root.updateWorldMatrix(true, true);
  const result = new THREE.Box3(), point = new THREE.Vector3();
  root.traverse(part => {
    if (!part.isMesh) return;
    const position = part.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) result.expandByPoint(point.fromBufferAttribute(position, i).applyMatrix4(part.matrixWorld));
  });
  return result;
}
function components(geometry) {
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
  function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) { parent[find(index[i + 1])] = find(index[i]); parent[find(index[i + 2])] = find(index[i]); }
  const groups = new Map();
  parent.forEach((_, i) => { const key = find(i); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
  return [...groups.values()];
}
function snapshot(bird) {
  const result = [];
  bird.root.traverse(part => result.push(...part.position.toArray(), ...part.quaternion.toArray(), ...part.scale.toArray()));
  for (const part of meshes(bird)) result.push(...part.geometry.attributes.position.array);
  return result;
}

describe('male Northern cardinal shared anatomy', () => {
  it.each(['high', 'low'])('has a compact peaked crest, red plumage, dark face and long rounded tail at species scale (%s)', quality => {
    expect(api.supports('northernCardinal')).toBe(true);
    const bird = api.create(THREE, 'northernCardinal', { quality });
    try {
      expect(Object.isFrozen(bird.profile)).toBe(true);
      expect(bird.profile.speciesId).toBe('northernCardinal');
      expect(bird.profile.walkReach).toBeLessThan(.020);
      const resting = bounds(bird.root).getSize(new THREE.Vector3());
      expect(resting.z).toBeGreaterThanOrEqual(.21); expect(resting.z).toBeLessThanOrEqual(.23);
      const head = bird.head.getObjectByName('woodland-head-plumage').geometry.attributes;
      let crest = 0, mask = 0, redCheek = 0;
      for (let i = 0; i < head.position.count; i++) {
        const red = head.color.getX(i), green = head.color.getY(i), blue = head.color.getZ(i);
        if (head.position.getY(i) > .027 && red > green * 4 && red > blue * 4) crest++;
        if (head.position.getZ(i) > .008 && head.position.getY(i) < .008 && Math.max(red, green, blue) < .05) mask++;
        if (head.position.getZ(i) < 0 && red > green * 4 && red > blue * 4) redCheek++;
      }
      expect(crest).toBeGreaterThan(25); expect(mask).toBeGreaterThan(25); expect(redCheek).toBeGreaterThan(25);
      const tail = bird.tail.children[0].geometry.attributes;
      const lengths = new Map();
      for (let i = 0; i < tail.position.count; i++) {
        const feather = tail.featherInfo.getY(i);
        lengths.set(feather, Math.max(lengths.get(feather) || 0, -tail.position.getZ(i)));
        expect(tail.color.getX(i)).toBeGreaterThan(tail.color.getY(i) * 3);
      }
      expect(lengths.size).toBe(12);
      expect(lengths.get(0) / lengths.get(5)).toBeGreaterThan(.85);
      expect(lengths.get(0) / lengths.get(5)).toBeLessThan(.94);
      for (const wing of bird.wings) {
        const { color } = wing.children[0].geometry.attributes;
        for (let i = 0; i < color.count; i++) expect(Math.min(color.getX(i), color.getY(i), color.getZ(i))).toBeLessThan(.25);
      }
      bird.update({ flight: 1, effort: 0 });
      const spread = bounds(bird.root).getSize(new THREE.Vector3()).x;
      expect(spread).toBeGreaterThanOrEqual(.25); expect(spread).toBeLessThanOrEqual(.31);
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      bird.wings[0].children[0].material.onBeforeCompile(shader);
      expect(shader.uniforms.awCardinal.value).toBe(1); expect(shader.uniforms.awJay.value).toBe(0);
      // Dove covert spots are keyed to their own flag, which is off for the cardinal.
      expect(shader.uniforms.awDove.value).toBe(0);
      expect(shader.fragmentShader).toContain('awDove * awCovert');
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('keeps two true eyes, a conical orange-red bill and safe seed-peck contact (%s)', quality => {
    const bird = api.create(THREE, 'northernCardinal', { quality });
    try {
      const face = bird.head.getObjectByName('woodland-eyes-and-bill');
      const skull = bird.head.getObjectByName('woodland-head-plumage');
      const { position, color } = face.geometry.attributes;
      const parts = components(face.geometry);
      expect(parts).toHaveLength(5); // Two globes, their two rims, one connected bill.
      const eyes = parts.filter(part => part.every(i => Math.max(color.getX(i), color.getY(i), color.getZ(i)) < .01));
      expect(eyes).toHaveLength(2);
      const bill = parts.find(part => part.every(i => color.getX(i) > .6 && color.getX(i) > color.getY(i) * 4));
      expect(bill).toBeTruthy();
      const billLength = Math.max(...bill.map(i => position.getZ(i))) - Math.min(...bill.map(i => position.getZ(i)));
      const billWidth = Math.max(...bill.map(i => position.getX(i))) - Math.min(...bill.map(i => position.getX(i)));
      expect(billWidth / billLength).toBeGreaterThan(.9); expect(billWidth / billLength).toBeLessThan(1.2);
      const ray = new THREE.Raycaster(), point = new THREE.Vector3();
      for (const pose of [{}, { lookYaw: .4, lookPitch: -.2 }, { peck: 1 }]) {
        bird.update(pose); bird.root.updateMatrixWorld(true);
        for (const eye of eyes) {
          const center = eye.reduce((sum, i) => sum.add(point.fromBufferAttribute(position, i)), new THREE.Vector3()).divideScalar(eye.length);
          const origin = new THREE.Vector3(Math.sign(center.x) * .10, center.y, center.z).applyMatrix4(bird.head.matrixWorld);
          center.applyMatrix4(bird.head.matrixWorld);
          ray.set(origin, center.clone().sub(origin).normalize());
          const hit = ray.intersectObjects([face, skull], false)[0];
          expect(hit.object).toBe(face);
          expect(eye.includes(face.geometry.index.getX(hit.faceIndex * 3))).toBe(true);
        }
      }
      let fullPeckTip = Infinity;
      const tipZ = Math.max(...bill.map(i => position.getZ(i)));
      for (let step = 0; step <= 40; step++) {
        bird.update({ peck: step / 40 }); bird.root.updateMatrixWorld(true);
        let lowest = Infinity;
        for (const i of bill) {
          point.fromBufferAttribute(position, i).applyMatrix4(face.matrixWorld); lowest = Math.min(lowest, point.y);
          if (step === 40 && Math.abs(position.getZ(i) - tipZ) < 1e-6) fullPeckTip = Math.min(fullPeckTip, point.y);
        }
        expect(lowest).toBeGreaterThan(-.001);
      }
      expect(fullPeckTip).toBeLessThan(.004);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('plants its smaller songbird toes and blends continuously into folded flight feet (%s)', quality => {
    const bird = api.create(THREE, 'northernCardinal', { quality });
    try {
      const targets = [{ x: -bird.profile.stance, y: bird.profile.leg, z: -.004, swing: -1, yaw: .2 },
        { x: bird.profile.stance, y: bird.profile.leg, z: .004, swing: -1, yaw: -.15 }];
      bird.update({ footTargets: targets, walking: 1 });
      for (const foot of bird.feet) expect(Math.abs(bounds(foot).min.y)).toBeLessThan(.0015);
      targets[0].y += .01; targets[0].swing = .5;
      bird.update({ footTargets: targets, walking: 1 });
      expect(bounds(bird.feet[0]).min.y).toBeGreaterThan(.004);
      expect(Math.abs(bounds(bird.feet[1]).min.y)).toBeLessThan(.0015);
      for (const flight of [0, .2, .5, .8, 1]) {
        bird.update({ flight, phase: 1.1, effort: .65, footTargets: targets, footTargetBlend: 1 - flight });
        const before = snapshot(bird);
        bird.update({ flight: Math.min(1, flight + .0001), phase: 1.1001, effort: .65, footTargets: targets, footTargetBlend: 1 - Math.min(1, flight + .0001) });
        const after = snapshot(bird);
        let delta = 0;
        for (let i = 0; i < before.length; i++) delta = Math.max(delta, Math.abs(before[i] - after[i]));
        expect(delta).toBeLessThan(.001);
      }
      bird.update({ flight: 1, effort: .5 });
      for (const foot of bird.feet) expect(bounds(foot).min.y).toBeGreaterThan(.02);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('retains finite feather buffers, seekable poses and single-disposal resources (%s)', quality => {
    const bird = api.create(THREE, 'northernCardinal', { quality });
    const parts = meshes(bird), resources = new Set(parts.flatMap(part => [part.geometry, part.material]));
    const attributes = parts.map(part => Object.entries(part.geometry.attributes));
    const savedArrays = attributes.map(entries => entries.map(([, attribute]) => attribute.array));
    const disposal = new Map();
    for (const resource of resources) { disposal.set(resource, 0); resource.addEventListener('dispose', () => disposal.set(resource, disposal.get(resource) + 1)); }
    const poses = [{}, { walking: 1, stride: 1.7, lookYaw: .6 }, { peck: .8 }, { preen: 1, preenSide: -1, preenStroke: .4 },
      { flight: .5, phase: .8, effort: .8 }, { flight: 1, phase: 2.2, effort: .9, bank: -.4, tailSpread: .2 },
      { flight: .6, phase: 5.1, landing: .8, tailSpread: .9 }];
    try {
      const expected = poses.map(pose => { bird.update(pose); return snapshot(bird); });
      for (let frame = 0; frame < 80; frame++) bird.update({ flight: (1 + Math.sin(frame * .17)) / 2, phase: frame * .47, effort: .7, stride: frame * .3, walking: 1 });
      poses.forEach((pose, index) => { bird.update(pose); expect(snapshot(bird)).toEqual(expected[index]); });
      parts.forEach((part, index) => {
        for (const [attributeIndex, [name, attribute]] of attributes[index].entries()) {
          expect(part.geometry.attributes[name]).toBe(attribute); expect(attribute.array).toBe(savedArrays[index][attributeIndex]);
          expect(attribute.array.every(Number.isFinite)).toBe(true);
        }
        const normal = part.geometry.attributes.normal;
        let normalError = 0;
        for (let i = 0; i < normal.count; i++) normalError = Math.max(normalError, Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1));
        expect(normalError).toBeLessThan(2e-5);
      });
    } finally { bird.dispose(); bird.dispose(); }
    for (const count of disposal.values()) expect(count).toBe(1);
  });
});
