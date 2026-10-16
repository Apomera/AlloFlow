import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function fixture(quality) {
  const local = {}, scene = new THREE.Scene();
  new Function('window', source)(local);
  return local.BirdLab3DWildlife.create(THREE, scene, { quality });
}

describe('Resident bird feather surfaces', () => {
  it.each(['high', 'low'])('lights coincident head/body UV seams as one continuous surface (%s)', quality => {
    const wildlife = fixture(quality), a = new THREE.Vector3(), b = new THREE.Vector3();
    try {
      for (const id of ['robin', 'chickadee']) for (const name of ['head-plumage', 'contour-body']) {
        const geometry = wildlife.root.getObjectByName('woodland-' + id).getObjectByName(name).geometry;
        const position = geometry.attributes.position, normals = geometry.attributes.normal, groups = new Map();
        // SphereGeometry contains unused pole vertices; only vertices that
        // actually draw a face need a lighting normal.
        for (const vertex of new Set(geometry.index.array)) {
          a.fromBufferAttribute(position, vertex);
          const key = a.toArray().map(value => Math.round(value * 1e7)).join(',');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(vertex);
        }
        let seams = 0;
        for (const vertices of groups.values()) {
          a.fromBufferAttribute(normals, vertices[0]);
          expect(a.length()).toBeCloseTo(1, 6);
          if (vertices.length > 1) seams++;
          for (const vertex of vertices) {
            b.fromBufferAttribute(normals, vertex);
            expect(b.distanceTo(a)).toBeLessThan(1e-6);
          }
        }
        expect(seams).toBeGreaterThan(10);
      }
    } finally { wildlife.dispose(); }
  });

  it.each(['high', 'low'])('keeps wrapped body tracts outward with finite unit normals and bounded geometry (%s)', quality => {
    const wildlife = fixture(quality), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), center = new THREE.Vector3();
    try {
      let triangles = 0, meshes = 0;
      wildlife.root.traverse(object => {
        if (!object.geometry) return;
        meshes++;
        const geometry = object.geometry, position = geometry.attributes.position, index = geometry.index;
        triangles += index ? index.count / 3 : position.count / 3;
        if (object.name !== 'overlapping-contour-feathers') return;
        const normal = geometry.attributes.normal;
        for (let vertex = 0; vertex < position.count; vertex++) {
          a.fromBufferAttribute(position, vertex); b.fromBufferAttribute(normal, vertex);
          expect([...a.toArray(), ...b.toArray()].every(Number.isFinite)).toBe(true);
          expect(b.length()).toBeCloseTo(1, 6);
        }
        for (let face = 0; face < index.count; face += 3) {
          a.fromBufferAttribute(position, index.getX(face)); b.fromBufferAttribute(position, index.getX(face + 1)); c.fromBufferAttribute(position, index.getX(face + 2));
          center.copy(a).add(b).add(c).multiplyScalar(1 / 3);
          b.sub(a).cross(c.sub(a));
          expect(b.lengthSq()).toBeGreaterThan(1e-20); expect(b.dot(center)).toBeGreaterThan(0);
        }
      });
      expect(meshes).toBeLessThanOrEqual(54);
      expect(triangles).toBeLessThan(quality === 'high' ? 40000 : 15000);
    } finally { wildlife.dispose(); }
  });

  it('releases shared resident feather geometries/materials once after repeated disposal', () => {
    const wildlife = fixture('high'), resources = new Map();
    wildlife.root.traverse(object => {
      for (const resource of [object.geometry, object.material]) if (resource && !resources.has(resource)) {
        resources.set(resource, 0); resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
      }
    });
    expect(resources.size).toBeGreaterThan(10);
    wildlife.dispose(); wildlife.dispose();
    expect(wildlife.root.parent).toBeNull();
    expect([...resources.values()].every(count => count === 1)).toBe(true);
  });

  it.each(['high', 'low'])('keeps cheek markings flush with a shaped head and dark crown (%s)', quality => {
    const wildlife = fixture(quality);
    try {
      const bird = wildlife.root.getObjectByName('woodland-chickadee');
      const head = bird.getObjectByName('head-plumage'), p = head.geometry.attributes.position, c = head.geometry.attributes.color;
      const cheekLight = [[], []], crownLight = [], bibLight = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), luminance = c.getX(i) * .2126 + c.getY(i) * .7152 + c.getZ(i) * .0722;
        if (Math.abs(x) > .018 && y < -.003 && y > -.015 && z < .01) cheekLight[x < 0 ? 0 : 1].push(luminance);
        if (y > .018) crownLight.push(luminance);
        if (y < -.023 && Math.abs(x) < .008 && z < 0) bibLight.push(luminance);
      }
      for (const cheek of cheekLight) {
        expect(cheek.length).toBeGreaterThan(5);
        expect(Math.min(...cheek)).toBeGreaterThan(.35);
      }
      expect(crownLight.length).toBeGreaterThan(10); expect(Math.max(...crownLight)).toBeLessThan(.05);
      expect(bibLight.length).toBeGreaterThan(2); expect(Math.max(...bibLight)).toBeLessThan(.05);
      // Fieldmarks share one continuous mesh: there are no bulging cheek or bib solids.
      expect(bird.getObjectByName('white-cheek')).toBeUndefined(); expect(bird.getObjectByName('black-bib')).toBeUndefined();
      const bounds = new THREE.Box3().setFromBufferAttribute(p);
      expect(bounds.max.y).toBeLessThan(Math.abs(bounds.min.y));
    } finally { wildlife.dispose(); }
  });

  it.each(['high', 'low'])('orients every short crown feather outward and retains valid vane coordinates (%s)', quality => {
    const wildlife = fixture(quality), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    try {
      for (const id of ['robin', 'chickadee']) {
        const bird = wildlife.root.getObjectByName('woodland-' + id);
        const geometry = bird.getObjectByName('crown-and-throat-feathers').geometry;
        const p = geometry.attributes.position, index = geometry.index;
        for (let face = 0; face < index.count; face += 3) {
          a.fromBufferAttribute(p, index.getX(face)); b.fromBufferAttribute(p, index.getX(face + 1)); c.fromBufferAttribute(p, index.getX(face + 2));
          const center = a.clone().add(b).add(c).multiplyScalar(1 / 3);
          const normal = b.sub(a).cross(c.sub(a));
          expect(normal.lengthSq()).toBeGreaterThan(1e-16);
          expect(normal.dot(center)).toBeGreaterThan(0);
          expect(center.length()).toBeLessThan(.031);
        }
        for (const name of ['layered-primaries', 'layered-secondaries', 'individual-tail-feathers', 'overlapping-contour-feathers', 'crown-and-throat-feathers']) {
          const mesh = bird.getObjectByName(name), uv = mesh.geometry.attributes.uv;
          expect(uv.count).toBe(mesh.geometry.attributes.position.count);
          expect([...uv.array].every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
        }
      }
      const before = [];
      wildlife.root.traverse(object => { if (object.isMesh) before.push([object, object.geometry, object.material]); });
      expect(before.length).toBeLessThan(65);
      for (let i = 0; i <= 220; i++) wildlife.update(i / 5);
      for (const [mesh, geometry, material] of before) { expect(mesh.geometry).toBe(geometry); expect(mesh.material).toBe(material); }
    } finally { wildlife.dispose(); }
  });
});
