import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_BROW_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function functionText(text, name) {
  const start = text.indexOf('function ' + name + '('), open = text.indexOf('{', start);
  if (start < 0 || open < start) throw new Error('Missing production helper: ' + name);
  let depth = 1, end = open + 1;
  while (depth && end < text.length) { if (text[end] === '{') depth++; if (text[end] === '}') depth--; end++; }
  if (depth) throw new Error('Unbalanced production helper: ' + name);
  return text.slice(start, end);
}
function helpers(text) {
  return new Function(functionText(text, 'dinoSurfaceAnchor') + '\n' + functionText(text, 'dinoFacialStripGeometry') + '\nreturn { dinoSurfaceAnchor, dinoFacialStripGeometry };')();
}
const { dinoSurfaceAnchor: anchorFor, dinoFacialStripGeometry: stripFor } = helpers(source);
function makeSurface(size, rotated) {
  const mesh = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.MeshBasicMaterial());
  mesh.position.set(2 * size, 3 * size, .2 * size);
  mesh.scale.set(1.2 * size, .8 * size, .6 * size);
  if (rotated) mesh.rotation.set(.14, .19, -.10);
  const parent = new T.Group(); parent.add(mesh);
  if (rotated) { parent.rotation.set(.07, -.09, .04); parent.scale.set(1.1, .9, 1.05); }
  parent.updateMatrixWorld(true); return mesh;
}
function pointsFor(mesh) {
  return [[-.55, .15, 0], [0, .25, 0], [.55, .15, 0]].map(p => mesh.localToWorld(new T.Vector3(...p)));
}
function fingerprint(g) {
  const digest = createHash('sha256');
  for (const key of Object.keys(g.attributes).sort()) {
    const a = g.attributes[key]; digest.update(key + ':' + a.itemSize + ':' + a.normalized + ':' + a.array.constructor.name);
    digest.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
  }
  digest.update(Buffer.from(g.index.array.buffer, g.index.array.byteOffset, g.index.array.byteLength));
  digest.update(JSON.stringify(g.parameters)); return digest.digest('hex');
}
// Recorded from the unchanged production helper before brow blending.
const legacyHashes = {
  "-1:0": "1762c9cea2c06b0c75cf9a421c8f152b60fc233d165330b9d2ab465ae9bca0dd",
  "-1:0.05": "2d94ee69e4117d8ad7768021236c57d535b0eb6c68fcd1e8379efb2421cf21eb",
  "1:0": "a1ddfabdf873e46f07f655ae575639263a32f388802ac1d4ed64ff0f7716944d",
  "1:0.05": "3b56e4c207aa1140cc8ecf30af081cd71180a667b4feeb1a495cb5e28bc9c145"
};

describe('Dino Lab brow ridges blended into the head surface', () => {
  for (const size of [.003, 1, 24]) for (const side of [-1, 1]) for (const rotated of [false, true]) {
    it(`seats edges and surface normals at scale ${size}, side ${side}, transformed ${rotated}`, () => {
      const surface = makeSurface(size, rotated), width = .08 * size, relief = .025 * size;
      const g = stripFor(T, surface, pointsFor(surface), { width, relief, side, blendSurface: true });
      expect(g).not.toBeNull(); expect(g.parameters.projected).toBe(g.parameters.samples);
      const pos = g.attributes.position, roots = g.attributes.dinoFaceRoot, normals = g.attributes.normal;
      const normalMatrix = new T.Matrix3().getNormalMatrix(surface.matrixWorld);
      let maximum = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const local = new T.Vector3().fromBufferAttribute(pos, i), world = surface.localToWorld(local.clone());
        const root = surface.localToWorld(new T.Vector3().fromBufferAttribute(roots, i));
        const hit = anchorFor(T, surface, root.clone().add(new T.Vector3(0, 0, side * 4 * size)), new T.Vector3(0, 0, -side), 8 * size);
        expect(hit).not.toBeNull(); expect(hit.point.distanceTo(root)).toBeLessThan(size * 3e-7);
        const signedHeight = world.clone().sub(root).dot(hit.normal); maximum = Math.max(maximum, signedHeight);
        expect(signedHeight).toBeGreaterThanOrEqual(-width * .02 - size * 3e-7);
        expect(signedHeight).toBeLessThanOrEqual(width * .06 + relief + size * 3e-7);
        expect([local.x, local.y, local.z].every(Number.isFinite)).toBe(true);
        expect(g.boundingBox.containsPoint(local)).toBe(true);
        expect(local.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius + size * 1e-6);
        const normal = new T.Vector3().fromBufferAttribute(normals, i);
        expect(normal.length()).toBeCloseTo(1, 5);
        const row = Math.floor(i / 9), col = i % 9;
        if (row === 0 || row === 32 || col === 0 || col === 8) {
          expect(Math.abs(signedHeight + width * .02)).toBeLessThan(size * 3e-7);
          normal.applyMatrix3(normalMatrix).normalize();
          expect(normal.distanceTo(hit.normal)).toBeLessThan(2e-6);
        }
      }
      expect(Math.abs(maximum - width * .06 - relief)).toBeLessThan(size * 3e-7);
      const child = new T.Mesh(g, surface.material); surface.add(child);
      const before = fingerprint(g); surface.parent.rotation.y += .27; surface.parent.updateMatrixWorld(true);
      expect(child.parent).toBe(surface); expect(fingerprint(g)).toBe(before);
      const local = new T.Vector3().fromBufferAttribute(pos, 148);
      expect(child.localToWorld(local.clone()).distanceTo(surface.localToWorld(local.clone()))).toBeLessThan(1e-10);
      g.dispose(); surface.geometry.dispose(); surface.material.dispose();
    });
  }
  for (const side of [-1, 1]) for (const relief of [0, .05]) {
    it(`preserves legacy facial buffers when blending is omitted, side ${side}, relief ${relief}`, () => {
      const surface = makeSurface(1, true), options = { width: .035, relief, side };
      const g = stripFor(T, surface, pointsFor(surface), options);
      expect(fingerprint(g)).toBe(legacyHashes[side + ':' + relief]);
      const disabled = stripFor(T, surface, pointsFor(surface), { ...options, blendSurface: false });
      expect(fingerprint(disabled)).toBe(fingerprint(g));
      if (process.env.DINO_BROW_BASELINE) {
        const old = helpers(readFileSync(process.env.DINO_BROW_BASELINE, 'utf8')).dinoFacialStripGeometry(T, surface, pointsFor(surface), options);
        expect(fingerprint(g)).toBe(fingerprint(old)); old.dispose();
      }
      g.dispose(); disabled.dispose(); surface.geometry.dispose(); surface.material.dispose();
    });
  }
  it('mirrors the blended shape and winding on the opposite side', () => {
    const surface = makeSurface(1, false), shapes = [-1, 1].map(side => stripFor(T, surface, pointsFor(surface), { width: .08, relief: .025, side, blendSurface: true }));
    const [a, b] = shapes.map(g => g.attributes.position);
    for (let i = 0; i < a.count; i++) { expect(a.getX(i)).toBeCloseTo(b.getX(i), 5); expect(a.getY(i)).toBeCloseTo(b.getY(i), 5); expect(a.getZ(i)).toBeCloseTo(-b.getZ(i), 5); }
    for (const g of shapes) { const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < g.index.count; i += 3) { const ids = Array.from(g.index.array.slice(i, i + 3)), vertices = ids.map(id => new T.Vector3().fromBufferAttribute(p, id)); const face = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])); expect(face.dot(new T.Vector3().fromBufferAttribute(n, ids[0]))).toBeGreaterThan(0); } g.dispose(); }
    surface.geometry.dispose(); surface.material.dispose();
  });
  it('leaves gaps for missed projections instead of bridging floating triangles', () => {
    const surface = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.MeshBasicMaterial());
    const g = stripFor(T, surface, [new T.Vector3(-1.4, 0, 0), new T.Vector3(0, .12, 0), new T.Vector3(1.4, 0, 0)], { width: .08, relief: .025, side: 1, blendSurface: true });
    expect(g.parameters.projected).toBeLessThan(g.parameters.samples); expect(g.index.count).toBeGreaterThan(0);
    for (const i of g.index.array) { const root = new T.Vector3().fromBufferAttribute(g.attributes.dinoFaceRoot, i); const hit = anchorFor(T, surface, new T.Vector3(root.x, root.y, 3), new T.Vector3(0, 0, -1), 6); expect(hit).not.toBeNull(); expect(hit.point.distanceTo(root)).toBeLessThan(1e-6); }
    expect(stripFor(T, surface, [new T.Vector3(3, 3, 0), new T.Vector3(4, 3, 0)], { width: .08, relief: .025, side: 1, blendSurface: true })).toBeNull();
    g.dispose(); surface.geometry.dispose(); surface.material.dispose();
  });
});

describe('Tyrannosaur brow ownership', () => {
  const begin = source.indexOf("} else if (/Tyrannosaur/i.test(cladeName) && hasAnatomyPart('brow')) {"), end = source.indexOf('} else if (/Abelisaur/i.test(cladeName)', begin);
  if (begin < 0 || end < begin) throw new Error('Tyrannosaur facial branch missing');
  const body = source.slice(source.indexOf('{', begin) + 1, end);
  const construct = new Function('model', 'headShell', 'vec', 'anatomyAccentMat', 'addEllipsoid', 'captureCranialMotion', functionText(source, 'dinoMarkSpecialPart') + '\n' + functionText(source, 'dinoTagSpecialParts') + '\n' + body);
  for (const missing of [[], [-1], [-1, 1]]) {
    it('reuses the projected brow and retains the fallback for missing sides ' + missing.join(','), () => {
      const model = new T.Group(), head = new T.Group(), material = new T.MeshBasicMaterial(); model.add(head);
      const eyes = [-1, 1].map(side => { const e = new T.Mesh(new T.SphereGeometry(.1, 8, 6), material); e.userData.dinoFeature = 'eye'; e.userData.dinoEyeSide = side; e.position.set(1, 2, side * .4); model.add(e); return e; });
      const brows = [-1, 1].filter(side => !missing.includes(side)).map(side => { const b = new T.Mesh(new T.PlaneGeometry(.2, .04), material); b.name = 'brow-relief-' + side; b.userData.dinoFeature = 'brow-relief'; head.add(b); return b; });
      const fallbacks = [], captures = [];
      construct(model, head, (x, y, z) => new T.Vector3(x, y, z), material, (point, scale, mat) => { const b = new T.Mesh(new T.SphereGeometry(1, 8, 6), mat); b.position.copy(point); b.scale.copy(scale); model.add(b); fallbacks.push(b); return b; }, before => captures.push(before));
      expect(fallbacks).toHaveLength(missing.length); expect(captures).toHaveLength(1);
      for (const b of brows) { expect(b.parent).toBe(head); expect(b.userData.dinoPartIds).toContain('brow'); expect(b.userData.dinoFeature).toBe('brow-relief'); }
      for (const b of fallbacks) { expect(b.userData.dinoPartIds).toContain('brow'); expect(b.userData.dinoFeature).toBe('brow'); expect(b.position.y).toBeCloseTo(2.112); expect(b.scale.toArray()).toEqual([.128, .020000000000000004, .032]); }
      expect(eyes.every(e => e.parent === model)).toBe(true);
      model.traverse(o => { if (o.geometry) o.geometry.dispose(); }); material.dispose();
    });
  }
});
