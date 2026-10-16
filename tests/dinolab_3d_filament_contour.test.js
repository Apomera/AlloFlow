import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { baselineCoatGeometry } from './fixtures/dinolab_coat_before_filament_contour.js';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FILAMENT_CONTOUR_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const registration = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(registration)) throw new Error('Dino Lab registration missing');
window.StemLab = { registerTool() {} };
new Function(source.replace(registration, 'globalThis.__filamentContour = { dinoCoatGeometry, dinoSkinCoordinates };' + registration))();
const { dinoCoatGeometry, dinoSkinCoordinates } = globalThis.__filamentContour;
delete globalThis.__filamentContour;
const at = (attribute, index) => new T.Vector3().fromBufferAttribute(attribute, index);
const center = (geometry, start, row) => at(geometry.attributes.position, start + row * 2).add(at(geometry.attributes.position, start + row * 2 + 1)).multiplyScalar(.5);
const bytes = attribute => new Uint8Array(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
function exactAttribute(actual, expected) {
  expect(actual.itemSize).toBe(expected.itemSize); expect(actual.normalized).toBe(expected.normalized);
  expect(actual.array.constructor).toBe(expected.array.constructor); expect(bytes(actual)).toEqual(bytes(expected));
}
function fixedFields(actual, expected, all = false) {
  expect(Object.keys(actual.attributes).sort()).toEqual(Object.keys(expected.attributes).sort());
  for (const name of Object.keys(expected.attributes)) if (all || !['position', 'normal'].includes(name)) exactAttribute(actual.attributes[name], expected.attributes[name]);
  exactAttribute(actual.index, expected.index); expect(actual.parameters).toEqual(expected.parameters);
  if (all) {
    expect(actual.boundingBox).toEqual(expected.boundingBox); expect(actual.boundingSphere).toEqual(expected.boundingSphere);
  }
}
function specimen(kind, scale = 1) {
  const surface = kind === 'sphere' ? new T.SphereGeometry(scale, 18, 12) : new T.PlaneGeometry(2 * scale, 2 * scale, 6, 6);
  if (kind === 'fallback' || kind === 'near-fallback') {
    const normal = new T.Vector3(1, -.12, kind === 'fallback' ? 0 : .015).normalize();
    const rotation = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
    surface.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(rotation));
  }
  return surface;
}
function pair(surface, options) {
  const actual = dinoCoatGeometry(T, surface, options), baseline = baselineCoatGeometry(T, surface, options);
  return { actual, baseline, dispose() { actual?.dispose(); baseline?.dispose(); surface.dispose(); } };
}
function validateFilaments(actual, baseline, tolerance) {
  fixedFields(actual, baseline);
  const p = actual.attributes.position, n = actual.attributes.normal, roots = actual.attributes.dinoCoatRoot;
  expect(p.count).toBe(actual.parameters.roots * 36); expect(actual.index.count).toBe(actual.parameters.roots * 90);
  for (const attribute of Object.values(actual.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
  for (let i = 0; i < p.count; i++) {
    const point = at(p, i), normal = at(n, i);
    expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6);
    expect(normal.dot(at(actual.attributes.dinoCoatNormal, i))).toBeGreaterThan(.8);
    expect(actual.boundingBox.containsPoint(point)).toBe(true);
    expect(point.distanceTo(actual.boundingSphere.center)).toBeLessThanOrEqual(actual.boundingSphere.radius + tolerance);
  }
  for (let start = 0; start < p.count; start += 12) {
    const centers = Array.from({ length: 6 }, (_, row) => center(actual, start, row));
    const across = at(p, start + 1).sub(at(p, start)).normalize();
    const widths = [];
    for (let row = 0; row <= 5; row++) {
      expect(centers[row].distanceTo(center(baseline, start, row))).toBeLessThan(tolerance);
      const left = at(p, start + row * 2), right = at(p, start + row * 2 + 1);
      widths.push(left.distanceTo(right));
      // A second-order finite difference reconstructs the centerline tangent
      // from the output positions, including the two strip endpoints.
      const tangent = row === 0 ? centers[0].clone().multiplyScalar(-3).addScaledVector(centers[1], 4).sub(centers[2])
        : row === 5 ? centers[5].clone().multiplyScalar(3).addScaledVector(centers[4], -4).add(centers[3])
          : centers[row + 1].clone().sub(centers[row - 1]);
      const geometricNormal = new T.Vector3().crossVectors(across, tangent).normalize();
      expect(at(n, start + row * 2).toArray()).toEqual(at(n, start + row * 2 + 1).toArray());
      for (const column of [0, 1]) {
        const vertex = start + row * 2 + column;
        expect(at(n, vertex).dot(geometricNormal)).toBeGreaterThan(.99999);
        expect(at(roots, vertex).distanceTo(at(roots, start))).toBe(0);
      }
    }
    for (let row = 1; row <= 5; row++) expect(widths[row]).toBeLessThan(widths[row - 1]);
    expect(widths[5]).toBe(0);
    expect(widths[0] / centers[0].distanceTo(centers[5])).toBeLessThan(.03);
    // Nearest-neighbor normal changes stay smooth across the bent strip.
    for (let row = 1; row <= 5; row++) expect(at(n, start + row * 2).dot(at(n, start + (row - 1) * 2))).toBeGreaterThan(.999);
  }
  let regularFaces = 0, collapsedTips = 0;
  for (let i = 0; i < actual.index.count; i += 3) {
    const ids = [0, 1, 2].map(offset => actual.index.getX(i + offset));
    const [a, b, c] = ids.map(id => at(p, id));
    const face = b.sub(a).cross(c.sub(a));
    if (face.lengthSq() === 0) {
      collapsedTips++; expect(ids.filter(id => actual.attributes.dinoCoatVane.getY(id) === 1)).toHaveLength(2);
    } else {
      regularFaces++; face.normalize();
      const smooth = ids.reduce((sum, id) => sum.add(at(n, id)), new T.Vector3()).normalize();
      expect(face.dot(smooth)).toBeGreaterThan(.999);
    }
  }
  expect(regularFaces).toBe(actual.parameters.roots * 27); expect(collapsedTips).toBe(actual.parameters.roots * 3);
}

describe('Dino Lab slender curved contour filaments', () => {
  for (const kind of ['plane', 'sphere']) for (const scale of [.02, 1, 9]) for (const seed of [0, 0xffffffff]) {
    it('preserves seeded roots and centerlines with geometric ribbon lighting on ' + kind + ', scale ' + scale + ', seed ' + seed, () => {
      const generated = pair(specimen(kind, scale), { count: 18, length: scale * .12, seed });
      try { validateFilaments(generated.actual, generated.baseline, scale * 3e-6); }
      finally { generated.dispose(); }
    });
  }

  for (const kind of ['fallback', 'near-fallback']) it('handles tangent fallback on ' + kind + ' root orientations', () => {
    const generated = pair(specimen(kind), { count: 17, length: .2, seed: 519 });
    try { validateFilaments(generated.actual, generated.baseline, 3e-6); }
    finally { generated.dispose(); }
  });

  for (const kind of ['plane', 'sphere', 'fallback']) for (const seed of [7, 2048]) {
    it('keeps every pennaceous buffer and bound byte-identical on ' + kind + ', seed ' + seed, () => {
      const generated = pair(specimen(kind), { count: 23, length: .2, seed, pennaceous: true, taper: { x: [-.8, .4, .3], u: [.55, .4] } });
      try { fixedFields(generated.actual, generated.baseline, true); }
      finally { generated.dispose(); }
    });
  }

  for (const options of [
    { dorsalOnly: true }, { minX: .1 }, { maxU: .6 },
    { dorsalOnly: true, minX: -.2, maxU: .7 },
    { taper: { x: [-.7, .5, .12] } }, { taper: { u: [.35, .16] } },
    { taper: { x: [-.7, .5, .2], u: [.4, .3] }, dorsalOnly: true, maxU: .8 }
  ]) it('preserves root filtering and boundary taper for ' + JSON.stringify(options), () => {
    const generated = pair(specimen('sphere'), { count: 32, length: .18, seed: 613, ...options });
    try {
      validateFilaments(generated.actual, generated.baseline, 3e-6);
      const g = generated.actual;
      for (let i = 0; i < g.attributes.position.count; i += 36) {
        if (options.dorsalOnly) expect(g.attributes.dinoCoatNormal.getY(i)).toBeGreaterThan(.45);
        if (options.minX != null) expect(g.attributes.dinoCoatRoot.getX(i)).toBeGreaterThanOrEqual(options.minX - 1e-6);
        if (options.maxU != null) expect(g.attributes.uv.getX(i)).toBeLessThanOrEqual(options.maxU + 1e-6);
      }
    } finally { generated.dispose(); }
  });

  it('keeps taper falloffs tied to the same roots without shifting seed consumption', () => {
    const surface = specimen('plane');
    const options = { count: 30, length: .2, seed: 29 };
    const full = dinoCoatGeometry(T, surface, options);
    const short = dinoCoatGeometry(T, surface, { ...options, taper: { x: [-.4, .4, .25] } });
    try {
      for (const name of ['dinoCoatRoot', 'dinoCoatNormal', 'color', 'uv', 'dinoCoatVane']) exactAttribute(short.attributes[name], full.attributes[name]);
      let shortened = 0, preserved = 0;
      for (let start = 0; start < full.attributes.position.count; start += 36) {
        const x = full.attributes.dinoCoatRoot.getX(start);
        const fullSpan = center(full, start, 5).distanceTo(center(full, start, 0));
        const ratio = center(short, start, 5).distanceTo(center(short, start, 0)) / fullSpan;
        if (x <= -.4) { expect(ratio).toBeCloseTo(.25, 5); shortened++; }
        else if (x >= .4) { expect(ratio).toBeCloseTo(1, 5); preserved++; }
        else { expect(ratio).toBeGreaterThan(.25 - 1e-5); expect(ratio).toBeLessThan(1 + 1e-5); }
      }
      expect(shortened).toBeGreaterThan(0); expect(preserved).toBeGreaterThan(0);
    } finally { full.dispose(); short.dispose(); surface.dispose(); }
  });

  it('supports nonindexed surfaces without UVs while preserving their fallback pigment coordinates', () => {
    const indexed = specimen('plane'), surface = indexed.toNonIndexed(); indexed.dispose(); surface.deleteAttribute('uv');
    const generated = pair(surface, { count: 16, length: .1, seed: 12, maxU: -.1, taper: { u: [.2, .1] } });
    try {
      validateFilaments(generated.actual, generated.baseline, 3e-6);
      for (let i = 0; i < generated.actual.attributes.uv.count; i++) expect(generated.actual.attributes.uv.getX(i)).toBe(0);
    } finally { generated.dispose(); }
  });

  it('continues to bake pigment from root normals and positions after the visible strip normal changes', () => {
    const generated = pair(specimen('sphere'), { count: 15, length: .15, seed: 72 });
    try {
      const g = generated.actual, matrix = new T.Matrix4().compose(new T.Vector3(2, -.3, 1), new T.Quaternion().setFromEuler(new T.Euler(.2, -.35, .18)), new T.Vector3(1.2, .8, 1.1));
      const normalMatrix = new T.Matrix3().getNormalMatrix(matrix);
      const before = Object.fromEntries(Object.entries(g.attributes).map(([name, attribute]) => [name, attribute.clone()]));
      dinoSkinCoordinates(T, g, matrix, true);
      for (const [name, attribute] of Object.entries(before)) exactAttribute(g.attributes[name], attribute);
      for (let i = 0; i < g.attributes.position.count; i++) {
        expect(at(g.attributes.dinoSkinPosition, i).distanceTo(at(g.attributes.dinoCoatRoot, i).applyMatrix4(matrix))).toBeLessThan(5e-7);
        expect(at(g.attributes.dinoSkinNormal, i).distanceTo(at(g.attributes.dinoCoatNormal, i).applyMatrix3(normalMatrix).normalize())).toBeLessThan(1e-6);
        expect(g.attributes.dinoSkinRegion.getX(i)).toBe(g.attributes.uv.getX(i)); expect(g.attributes.dinoSkinRegion.getY(i)).toBe(1);
      }
      expect(bytes(g.attributes.normal)).not.toEqual(bytes(g.attributes.dinoCoatNormal));
    } finally { generated.dispose(); }
  });

  for (const options of [{ count: 0 }, { length: 0 }, { length: -1 }, { minX: 10 }, { maxU: -1 }, { dorsalOnly: true }]) {
    it('returns no geometry when roots are excluded by ' + JSON.stringify(options), () => {
      const generated = pair(specimen('plane'), { count: 8, length: .1, seed: 2, ...options });
      try { expect(generated.actual).toBeNull(); expect(generated.baseline).toBeNull(); }
      finally { generated.dispose(); }
    });
  }
});
