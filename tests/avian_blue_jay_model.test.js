import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
const api = scope.AvianWoodlandBirds;
function meshes(bird) { const result = []; bird.root.traverse(part => { if (part.isMesh) result.push(part); }); return result; }
function snapshot(bird) {
  return meshes(bird).map(part => ({ positions: [...part.geometry.attributes.position.array], normals: [...part.geometry.attributes.normal.array],
    transform: [...part.parent.position.toArray(), ...part.parent.quaternion.toArray()] }));
}
function bounds(bird) { bird.root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(bird.root); }
function components(geometry) {
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) { parent[find(index[i + 1])] = find(index[i]); parent[find(index[i + 2])] = find(index[i]); }
  const result = new Map();
  parent.forEach((_, i) => { const root = find(i); if (!result.has(root)) result.set(root, []); result.get(root).push(i); });
  return [...result.values()];
}

describe('shared blue jay anatomy', () => {
  it.each(['high', 'low'])('has a distinct crest, necklace, white wingbar and broad white-cornered tail (%s)', quality => {
    expect(api.supports('blueJay')).toBe(true);
    const bird = api.create(THREE, 'blueJay', { quality }), dove = api.create(THREE, 'mourningDove', { quality });
    try {
      expect(Object.isFrozen(bird.profile)).toBe(true);
      expect(bird.profile).toMatchObject({ speciesId: 'blueJay', leg: .037, stance: .015, ankleZ: .002,
        stepLift: .012, walkReach: .023, wingbeatCruise: 5.4, wingbeatBurst: 6.4 });
      expect(bird.profile.ankleY).toBeCloseTo(-.034, 12);
      expect(meshes(bird)).toHaveLength(9);
      expect(new Set(meshes(bird).map(part => part.material)).size).toBe(3);
      const head = bird.root.getObjectByName('woodland-head-plumage').geometry.attributes;
      let crest = 0;
      for (let i = 0; i < head.position.count; i++) if (head.position.getY(i) > .038 && head.color.getZ(i) > head.color.getX(i) * 2) crest++;
      expect(crest).toBeGreaterThan(30);
      const neck = bird.root.getObjectByName('woodland-neck-plumage').geometry.attributes;
      let blackNeck = 0, paleNeck = 0;
      for (let i = 0; i < neck.color.count; i++) {
        if (Math.max(neck.color.getX(i), neck.color.getY(i), neck.color.getZ(i)) < .06) blackNeck++;
        if (Math.min(neck.color.getX(i), neck.color.getY(i), neck.color.getZ(i)) > .50) paleNeck++;
      }
      expect(blackNeck).toBeGreaterThan(30); expect(paleNeck).toBeGreaterThan(30);
      const wing = bird.wings[0].children[0].geometry.attributes;
      let wingbar = 0;
      let overlappingRow = 0;
      for (let i = 0; i < wing.color.count; i++) if (wing.featherInfo.getX(i) === 3 && Math.floor(wing.featherInfo.getY(i) / 13) === 2 && wing.color.getX(i) > .65) wingbar++;
      for (let i = 0; i < wing.color.count; i++) if (wing.featherInfo.getX(i) === 3 && Math.floor(wing.featherInfo.getY(i) / 13) === 3) overlappingRow++;
      expect(wingbar).toBeGreaterThan(10);
      expect(overlappingRow).toBeGreaterThan(100);
      const tail = bird.tail.children[0].geometry.attributes;
      let whiteCorners = 0, blueCenter = 0;
      for (let i = 0; i < tail.color.count; i++) if (tail.uv.getY(i) > .90) {
        const feather = tail.featherInfo.getY(i);
        if ((feather <= 2 || feather >= 9) && tail.color.getX(i) > .65) whiteCorners++;
        if ((feather === 5 || feather === 6) && tail.color.getZ(i) > tail.color.getX(i) * 3) blueCenter++;
      }
      expect(whiteCorners).toBeGreaterThan(12); expect(blueCenter).toBeGreaterThan(4);
      const birdBounds = bounds(bird), doveBounds = bounds(dove);
      expect(birdBounds.min.y).toBeCloseTo(0, 6);
      expect(birdBounds.getSize(new THREE.Vector3()).z).toBeGreaterThan(.25);
      expect(birdBounds.getSize(new THREE.Vector3()).z).toBeLessThan(.32);
      expect(birdBounds.max.y).toBeGreaterThan(doveBounds.max.y + .025);
      bird.update({ flight: 1, phase: 1.5, effort: 0 }); dove.update({ flight: 1, phase: 1.5, effort: 0 });
      expect(bounds(bird).getSize(new THREE.Vector3()).x).toBeLessThan(bounds(dove).getSize(new THREE.Vector3()).x * .9);
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      bird.wings[0].children[0].material.onBeforeCompile(shader);
      expect(shader.uniforms.awJay.value).toBe(1); expect(shader.uniforms.awGrouse.value).toBe(0);
      expect(shader.fragmentShader).toContain('awJayBars * awJayVane');
      // Dove covert spots are keyed to their own flag, which is off for the jay.
      expect(shader.uniforms.awDove.value).toBe(0);
      expect(shader.fragmentShader).toContain('awDove * awCovert');
      expect(shader.fragmentShader).not.toContain('undefined');
    } finally { bird.dispose(); dove.dispose(); }
  });

  it.each(['high', 'low'])('has exactly one pair of eye globes and a separate stout dark bill (%s)', quality => {
    const bird = api.create(THREE, 'blueJay', { quality });
    try {
      const geometry = bird.root.getObjectByName('woodland-eyes-and-bill').geometry;
      const parts = components(geometry), { position, color } = geometry.attributes;
      expect(parts).toHaveLength(5); // Two orbital rims, two globes, one bill.
      const eyeColor = new THREE.Color('#0f1010').convertSRGBToLinear();
      const globes = parts.filter(part => part.every(i => Math.abs(color.getX(i) - eyeColor.r) < 1e-7 && Math.abs(color.getZ(i) - eyeColor.b) < 1e-7));
      expect(globes).toHaveLength(2);
      const centers = globes.map(part => part.reduce((x, i) => x + position.getX(i) / part.length, 0)).sort((a, b) => a - b);
      expect(centers[0]).toBeLessThan(-.020); expect(centers[1]).toBeGreaterThan(.020);
      expect(centers[0] + centers[1]).toBeCloseTo(0, 7);
      const bill = parts.at(-1), tip = Math.max(...bill.map(i => position.getZ(i)));
      expect(tip).toBeCloseTo(.031 * .76 + .029, 7);
      expect(Math.max(...bill.map(i => position.getX(i)))).toBeCloseTo(.0058, 7);
      expect(bill.every(i => Math.max(color.getX(i), color.getY(i), color.getZ(i)) < .05)).toBe(true);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('keeps flight, walking, landing and contact handoff finite, seekable and allocation stable (%s)', quality => {
    const bird = api.create(THREE, 'blueJay', { quality }), parts = meshes(bird);
    const buffers = parts.map(part => Object.values(part.geometry.attributes).map(attribute => attribute.array));
    const targets = [{ x: -.015, y: .049, z: .018, swing: .5, yaw: .25 }, { x: .015, y: .037, z: -.006, swing: -1, yaw: -.10 }];
    const poses = [
      {}, { flight: 0, stride: 1.3, walking: .8, lookYaw: -.5 },
      { flight: 0, stride: 2.6, walking: 1, footTargets: targets, footTargetBlend: 1 },
      { flight: .2, phase: 4.2, effort: 1, walking: .5, footTargets: targets, footTargetBlend: .4 },
      { flight: 1, phase: 2.2, effort: .9, bank: -.4, tailSpread: .2 },
      { flight: .7, phase: 5.1, effort: .65, landing: .8, tailSpread: 1 },
      { flight: 0, peck: .95, lookPitch: .1 }, { flight: 0, walking: 0, effort: 0, phase: 0 }
    ];
    try {
      const snapshots = [];
      for (const pose of poses) {
        bird.update(pose); snapshots.push(snapshot(bird));
        for (const part of parts) {
          const attributes = part.geometry.attributes;
          for (const attribute of Object.values(attributes)) expect(attribute.array.every(Number.isFinite)).toBe(true);
          let normalError = 0;
          for (let i = 0; i < attributes.normal.count; i++) normalError = Math.max(normalError,
            Math.abs(Math.hypot(attributes.normal.getX(i), attributes.normal.getY(i), attributes.normal.getZ(i)) - 1));
          expect(normalError).toBeLessThan(2e-5);
        }
        const size = bounds(bird).getSize(new THREE.Vector3());
        expect(size.x).toBeLessThan(.6); expect(size.y).toBeLessThan(.4); expect(size.z).toBeLessThan(.4);
      }
      for (let i = poses.length - 1; i >= 0; i--) { bird.update(poses[i]); expect(snapshot(bird)).toEqual(snapshots[i]); }
      parts.forEach((part, i) => Object.values(part.geometry.attributes).forEach((attribute, a) => expect(attribute.array).toBe(buffers[i][a])));
      const versions = parts.map(part => [part.geometry.attributes.position.version, part.geometry.attributes.normal.version]);
      bird.update(poses[0]); expect(parts.map(part => [part.geometry.attributes.position.version, part.geometry.attributes.normal.version])).toEqual(versions);
      const resources = new Set(parts.flatMap(part => [part.geometry, part.material]));
      for (const part of parts) expect(Object.values(part.material).some(value => value?.isTexture)).toBe(false);
      const counts = new Map(); resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1)));
      bird.dispose(); bird.dispose(); bird.update(poses[4]);
      expect(counts.size).toBe(12); expect([...counts.values()].every(count => count === 1)).toBe(true);
    } finally { bird.dispose(); }
  });
});
