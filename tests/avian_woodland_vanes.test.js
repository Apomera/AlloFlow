import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function create(id, quality) {
  const window = {};
  new Function('window', source)(window);
  return window.AvianWoodlandBirds.create(THREE, id, { quality });
}
function tailFeathers(bird) {
  const mesh = bird.tail.getObjectByName('woodland-layered-tail');
  const { position, uv, featherInfo } = mesh.geometry.attributes;
  const feathers = new Map();
  for (let i = 0; i < position.count; i++) {
    const seed = featherInfo.getY(i);
    if (!feathers.has(seed)) feathers.set(seed, []);
    feathers.get(seed).push({ x: position.getX(i), y: position.getY(i), z: position.getZ(i), u: uv.getX(i), v: uv.getY(i) });
  }
  return [...feathers.values()];
}
function profile(vertices) {
  const root = vertices.find(v => v.u === .5 && v.v === 0);
  const tip = vertices.find(v => v.u === .5 && v.v === 1);
  const length = Math.hypot(tip.x - root.x, tip.z - root.z);
  const dx = (tip.x - root.x) / length, dz = (tip.z - root.z) / length;
  const rows = new Map();
  for (const vertex of vertices) {
    if (!rows.has(vertex.v)) rows.set(vertex.v, []);
    rows.get(vertex.v).push(vertex);
  }
  const breadth = row => {
    const lateral = row.map(p => -(p.x - root.x) * dz + (p.z - root.z) * dx);
    return Math.max(...lateral) - Math.min(...lateral);
  };
  return { root, tip, length, dx, dz, cap: rows.get(1), capBreadth: breadth(rows.get(1)), maxBreadth: Math.max(...[...rows.values()].map(breadth)) };
}

describe('woodland feather vane profiles', () => {
  it.each(['high', 'low'])('keeps broad rounded grouse rectrix caps and the graduated dove tail (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality);
      try {
        const feathers = tailFeathers(bird), lengths = [];
        expect(feathers).toHaveLength(id === 'grouse' ? 18 : 12);
        feathers.forEach((vertices, index) => {
          const p = profile(vertices), factor = Math.abs((index / (feathers.length - 1) - .5) * 2);
          const expected = id === 'grouse' ? .152 * (1 - factor * .10) : .137 * (1 - factor ** .8 * .30);
          lengths.push(p.length);
          // Anatomical center endpoints must survive the cap and edge shaping.
          expect(p.length).toBeCloseTo(expected, 6);
          expect(p.capBreadth / p.maxBreadth).toBeGreaterThan(id === 'grouse' ? .35 : .13);
          for (const vertex of p.cap) {
            const behindTip = -((vertex.x - p.tip.x) * p.dx + (vertex.z - p.tip.z) * p.dz);
            expect(behindTip).toBeGreaterThanOrEqual(-1e-7);
            if (vertex.u === 0 || vertex.u === 1) {
              expect(behindTip).toBeGreaterThan(.001); expect(behindTip).toBeLessThan(.008);
            }
          }
        });
        const center = Math.max(...lengths), outer = (lengths[0] + lengths.at(-1)) * .5;
        expect(center / outer).toBeGreaterThan(id === 'grouse' ? 1.09 : 1.35);
        expect(center / outer).toBeLessThan(id === 'grouse' ? 1.12 : 1.44);
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps curved vane normals finite through folded, recovery and fanned poses (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), meshes = [];
      bird.root.traverse(object => { if (object.isMesh) meshes.push(object); });
      try {
        expect(meshes).toHaveLength(9);
        const positions = meshes.map(mesh => mesh.geometry.attributes.position.array);
        const indices = meshes.map(mesh => mesh.geometry.index.array);
        for (const pose of [{ flight: 0 }, { flight: .3, phase: 2.3, effort: .9 },
          { flight: 1, phase: 4.7, effort: .9, tailSpread: 1 }, { flight: .43, landing: 1, tailSpread: .8 }]) {
          bird.update(pose);
          for (const [index, mesh] of meshes.entries()) {
            const { position, normal } = mesh.geometry.attributes;
            expect(position.array).toBe(positions[index]); expect(mesh.geometry.index.array).toBe(indices[index]);
            let normalError = 0, finite = true;
            for (let vertex = 0; vertex < position.count; vertex++) {
              finite = finite && Number.isFinite(position.getX(vertex) + position.getY(vertex) + position.getZ(vertex));
              normalError = Math.max(normalError, Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
            }
            expect(finite).toBe(true); expect(normalError).toBeLessThan(2e-5);
          }
        }
      } finally { bird.dispose(); }
    }
  });
});
