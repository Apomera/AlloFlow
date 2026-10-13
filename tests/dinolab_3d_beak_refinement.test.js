import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_BEAK_SURFACE_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(anchor)) throw new Error('Dino Lab registration anchor was not found');
window.StemLab = { registerTool() {} };
new Function(source.replace(anchor,
  'globalThis.__dinoBeakRefinement = { DINOS, cranialSurfaceProfileFor, dinoBeakSurfaceGeometry, dinoSurfaceGeometry, dinoKeratinShading };' + anchor))();
const art = globalThis.__dinoBeakRefinement;
delete globalThis.__dinoBeakRefinement;

function setup(id, scale, breadth) {
  const dino = art.DINOS.find(value => value.id === id), profile = art.cranialSurfaceProfileFor(dino);
  const head = new THREE.Vector3(.2, .3, .13).multiplyScalar(scale);
  const snout = head.clone().add(new THREE.Vector3(-1.4 * scale, 0, 0));
  const height = .5 * scale, depth = .36 * scale * breadth, base = head.clone().lerp(snout, .84);
  return { height, base, points: [base, snout.clone().add(new THREE.Vector3(-scale * .12, 0, 0)),
    snout.clone().add(new THREE.Vector3(-scale * .32, -height * .20, 0))],
    radii: [[height * .36, depth * .55 * profile.muzzleTipScale],
      [height * .25, depth * .42 * profile.muzzleTipScale], [height * .025, depth * .10]] };
}
function loft(data, sides) {
  const geometry = art.dinoSurfaceGeometry(THREE, data.points, data.radii, { smoothProfile: true, sides });
  geometry.translate(-data.base.x, -data.base.y, -data.base.z);
  return geometry;
}
// The previous sculpt equations, deliberately independent of the candidate helper.
// They preserve a coordinate-level contract at each of the original 24 radial samples.
function legacySculpt(geometry, height) {
  const positions = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const t = Math.max(0, Math.min(1, uv.getX(i)));
    let hook = Math.max(0, Math.min(1, (t - .45) / .55));
    hook = hook * hook * (3 - 2 * hook);
    const bow = Math.sin(Math.PI * t);
    positions.setY(i, positions.getY(i) + height * (.04 * bow * bow - .16 * hook));
    positions.setZ(i, positions.getZ(i) * (1 - .55 * hook));
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
function tuple(attribute, index) {
  return Array.from(attribute.array.slice(index * attribute.itemSize, (index + 1) * attribute.itemSize));
}
function manifold(geometry) {
  const positions = geometry.attributes.position, indices = geometry.index.array;
  const epsilon = geometry.boundingBox.getSize(new THREE.Vector3()).length() * 1e-7;
  const keys = new Map(), ids = [], edges = new Map();
  for (let i = 0; i < positions.count; i++) {
    const key = tuple(positions, i).map(value => Math.round(value / epsilon)).join(',');
    if (!keys.has(key)) keys.set(key, keys.size);
    ids.push(keys.get(key));
  }
  let minimumArea = Infinity;
  for (let i = 0; i < indices.length; i += 3) {
    const vertices = Array.from(indices.slice(i, i + 3));
    const points = vertices.map(index => new THREE.Vector3().fromBufferAttribute(positions, index));
    minimumArea = Math.min(minimumArea, points[1].sub(points[0]).cross(points[2].sub(points[0])).length());
    for (let j = 0; j < 3; j++) {
      const a = ids[vertices[j]], b = ids[vertices[(j + 1) % 3]], key = Math.min(a, b) + ',' + Math.max(a, b);
      const edge = edges.get(key) || { count: 0, direction: 0 };
      edge.count++; edge.direction += a < b ? 1 : -1; edges.set(key, edge);
    }
  }
  return { minimumArea, edges: Array.from(edges.values()) };
}

describe('Dino Lab finer ceratopsian beak surface', () => {
  for (const id of ['triceratops', 'styracosaurus', 'psittacosaurus']) {
    for (const [scale, breadth] of [[.03, .84], [1, 1], [12, 1.12]]) {
      it('retains every legacy outline sample and cap for ' + id + ' at scale ' + scale, () => {
        const data = setup(id, scale, breadth), old = legacySculpt(loft(data, 24), data.height), fine = loft(data, 48);
        try {
          art.dinoBeakSurfaceGeometry(THREE, fine, data.height, true);
          expect(fine.attributes.position.count).toBe(2403); expect(fine.index.count).toBe(14112);
          for (let ring = 0; ring <= 48; ring++) for (let side = 0; side <= 24; side++) {
            const original = ring * 25 + side, current = ring * 49 + side * 2;
            for (const name of ['position', 'uv']) expect(tuple(fine.attributes[name], current)).toEqual(tuple(old.attributes[name], original));
          }
          for (const offset of [1, 2]) for (const name of ['position', 'uv']) {
            expect(tuple(fine.attributes[name], fine.attributes.position.count - offset))
              .toEqual(tuple(old.attributes[name], old.attributes.position.count - offset));
          }
          // Axis extrema occur at cardinal radial samples, which both lofts include.
          expect(fine.boundingBox.min.toArray()).toEqual(old.boundingBox.min.toArray());
          expect(fine.boundingBox.max.toArray()).toEqual(old.boundingBox.max.toArray());
        } finally { old.dispose(); fine.dispose(); }
      });

      it('remains closed with finite unit normals and an exact normal seam for ' + id + ' at scale ' + scale, () => {
        const data = setup(id, scale, breadth), geometry = loft(data, 48);
        try {
          art.dinoBeakSurfaceGeometry(THREE, geometry, data.height, true);
          const topology = manifold(geometry);
          expect(topology.minimumArea).toBeGreaterThan(scale * scale * 1e-10);
          expect(topology.edges.every(edge => edge.count === 2 && edge.direction === 0)).toBe(true);
          const p = geometry.attributes.position, n = geometry.attributes.normal;
          expect(Array.from(p.array).every(Number.isFinite)).toBe(true); expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
          for (let i = 0; i < p.count; i++) {
            expect(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1)).toBeLessThan(1e-6);
            const point = new THREE.Vector3().fromBufferAttribute(p, i);
            expect(geometry.boundingBox.containsPoint(point)).toBe(true);
            expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + scale * 1e-6);
          }
          for (let ring = 0; ring <= 48; ring++) expect(tuple(n, ring * 49)).toEqual(tuple(n, ring * 49 + 48));
        } finally { geometry.dispose(); }
      });
    }
  }

  for (const sides of [24, 48]) {
    it('provides finite continuous restrained grain and neutral caps for ' + sides + ' radial samples', () => {
      const data = setup('triceratops', 1, 1), geometry = loft(data, sides);
      try {
        art.dinoBeakSurfaceGeometry(THREE, geometry, data.height, true);
        const grain = geometry.attributes.dinoKeratin;
        expect(grain.itemSize).toBe(4); expect(grain.count).toBe(geometry.attributes.position.count);
        expect(Array.from(grain.array).every(Number.isFinite)).toBe(true);
        for (let ring = 0; ring <= 48; ring++) {
          const first = ring * (sides + 1), last = first + sides;
          expect(tuple(grain, first)).toEqual(tuple(grain, last));
          for (let side = 0; side <= sides; side++) {
            const i = first + side;
            expect(Math.abs(Math.hypot(grain.getX(i), grain.getY(i)) - 1)).toBeLessThan(1e-6);
            expect(grain.getZ(i)).toBe(geometry.attributes.uv.getX(i));
            expect(grain.getW(i)).toBe(Math.fround(.55));
          }
        }
        for (const offset of [1, 2]) {
          const index = grain.count - offset;
          expect([grain.getX(index), grain.getY(index), grain.getW(index)]).toEqual([0, 0, 0]);
        }
        expect(geometry.userData.dinoBeakGrain).toEqual({ interpretive: true, coordinates: 'radial-longitudinal' });
      } finally { geometry.dispose(); }
    });
  }

  it('uses the existing fragment grain without adding vertex displacement or changing alpha', () => {
    const material = art.dinoKeratinShading(new THREE.MeshStandardMaterial());
    const shader = { vertexShader: '#include <begin_vertex>\n#include <project_vertex>',
      fragmentShader: '#include <color_fragment>\n#include <roughnessmap_fragment>' };
    try {
      material.onBeforeCompile(shader, {});
      expect(shader.vertexShader).toBe('attribute vec4 dinoKeratin;\nvarying vec4 vDinoKeratin;\n#include <begin_vertex>\nvDinoKeratin = dinoKeratin;\n#include <project_vertex>');
      expect(shader.fragmentShader).toContain('fwidth(keratinPhaseA)');
      expect(shader.fragmentShader).toContain('fwidth(keratinPhaseB)');
      expect(shader.fragmentShader).toContain('diffuseColor.rgb *=');
      expect(shader.fragmentShader).not.toMatch(/diffuseColor\.a\s*=/);
      expect(material.defaultAttributeValues.dinoKeratin).toEqual([0, 0, 0, 0]);
    } finally { material.dispose(); }
  });
});
