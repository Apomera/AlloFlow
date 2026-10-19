import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FEATHER_SYMMETRY_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function extract(name) {
  const start = source.indexOf('function ' + name + '('), open = source.indexOf('{', start);
  if (start < 0) throw Error('Missing ' + name);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; }
  if (depth) throw Error('Unbalanced ' + name);
  return source.slice(start, end);
}
const helper = name => new Function(extract(name) + ';return ' + name)();
const profileFor = helper('dinoFeatherVaneProfile'), makeVane = helper('dinoFeatherGeometry');
const makeShaft = helper('dinoFeatherShaftGeometry'), frame = helper('dinoFeatherFrame'), mark = helper('dinoSurfacePartIds');
const registration = "window.StemLab.registerTool('dinoLab'";
window.StemLab = { registerTool() {} };
new Function(source.replace(registration, 'globalThis.__vaneInspection = { dinoPartInspectionFor, byId };' + registration))();
const inspectionAPI = globalThis.__vaneInspection; delete globalThis.__vaneInspection;
const point = (p, index) => new T.Vector3().fromBufferAttribute(p, index);
const reviewed = [
  ['anchiornis', 'forewing'], ['anchiornis', 'manual-wing'], ['anchiornis', 'hind-wing'],
  ['caudipteryx', 'tail-fan']
];

describe('Fossil-supported feather vane symmetry', () => {
  it('restricts the correction to explicitly reviewed species and tracts', () => {
    for (const [id, tract] of reviewed) {
      const profile = profileFor({ id }, tract);
      expect(profile.leftScale).toBe(profile.rightScale);
      expect(profile.leftScale + profile.rightScale).toBeCloseTo(1.68, 10);
      expect(profile.note).toMatch(/reconstructed/);
      expect(profile.source.url).toBe(id === 'anchiornis' ? 'https://doi.org/10.1038/nature08322' : 'https://doi.org/10.1038/31635');
    }
    for (const id of ['microraptor', 'archaeopteryx', 'velociraptor', 'yutyrannus', '']) {
      for (const tract of ['forewing', 'manual-wing', 'hind-wing', 'tail-fan', 'crown', 'contour']) expect(profileFor({ id }, tract), id + ':' + tract).toBeNull();
    }
    for (const id of ['anchiornis', 'caudipteryx']) {
      for (const tract of ['crown', 'contour', 'forewing-coverts', 'manual-wing-coverts', 'tail-frond', 'terminal-tail', undefined]) expect(profileFor({ id }, tract), id + ':' + tract).toBeNull();
    }
    expect(profileFor({ id: 'caudipteryx' }, 'hind-wing')).toBeNull();
    // Kiat & O'Connor (2024, doi:10.1073/pnas.2306639121) measured modest
    // asymmetry in Caudipteryx primaries: do not apply tail-fan symmetry to arms.
    expect(profileFor({ id: 'caudipteryx' }, 'forewing')).toBeNull();
    expect(profileFor({ id: 'caudipteryx' }, 'manual-wing')).toBeNull();
    expect(profileFor(null, 'manual-wing')).toBeNull();
  });

  for (const [length, width] of [[.001, .00015], [.35, .06], [4, .65]]) {
    it('centers vanes around the unchanged shaft and preserves breadth at length ' + length, () => {
      const profile = profileFor({ id: 'anchiornis' }, 'manual-wing');
      const current = makeVane(T, length, width, profile), before = makeVane(T, length, width), shaft = makeShaft(T, length, width);
      const p = current.attributes.position, b = before.attributes.position;
      expect(p.count).toBe(105); expect(current.index.count).toBe(480);
      expect(Object.keys(current.attributes)).toEqual(Object.keys(before.attributes));
      expect(Array.from(current.attributes.uv.array)).toEqual(Array.from(before.attributes.uv.array));
      expect(Array.from(current.index.array)).toEqual(Array.from(before.index.array));
      for (const attribute of Object.values(current.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      for (let row = 0; row <= 20; row++) {
        const left = row * 5, right = left + 4, middle = left + 2;
        expect(p.getX(left)).toBeCloseTo(-p.getX(right), 9);
        expect(p.getX(left + 1)).toBeCloseTo(-p.getX(right - 1), 9);
        expect(p.getX(middle)).toBe(0);
        const actualSpan = p.getX(right) - p.getX(left), oldSpan = b.getX(right) - b.getX(left);
        expect(Math.abs(actualSpan - oldSpan)).toBeLessThan(width * 1e-6);
        expect(point(p, middle).distanceTo(point(b, middle))).toBe(0);
        for (let column = 0; column <= 4; column++) {
          const index = left + column;
          expect(p.getY(index)).toBe(b.getY(index)); expect(p.getZ(index)).toBe(b.getZ(index));
          expect(current.boundingBox.containsPoint(point(p, index))).toBe(true);
          if (row > 0 && row < 20) expect(point(current.attributes.normal, index).length()).toBeCloseTo(1, 6);
        }
        if (row < 20) {
          const shaftCenter = new T.Vector3();
          for (let side = 0; side < 8; side++) shaftCenter.add(point(shaft.attributes.position, row * 9 + side));
          shaftCenter.multiplyScalar(1 / 8);
          expect(shaftCenter.distanceTo(point(p, middle))).toBeLessThan(length * 1e-7);
        }
      }
      for (let triangle = 0; triangle < current.index.count; triangle += 3) {
        const [a, b, c] = [0, 1, 2].map(offset => point(p, current.index.getX(triangle + offset)));
        const face = b.clone().sub(a).cross(c.clone().sub(a));
        if (face.lengthSq() > length * width * 1e-20) expect(face.dot(point(current.attributes.normal, current.index.getX(triangle)))).toBeGreaterThanOrEqual(0);
      }
      current.dispose(); before.dispose(); shaft.dispose();
    });
  }

  it('retains the old schematic when no reviewed correction applies', () => {
    const before = makeVane(T, .35, .06), fallback = makeVane(T, .35, .06, profileFor({ id: 'microraptor' }, 'manual-wing'));
    for (const key of Object.keys(before.attributes)) expect(Array.from(fallback.attributes[key].array)).toEqual(Array.from(before.attributes[key].array));
    expect(Array.from(fallback.index.array)).toEqual(Array.from(before.index.array));
    before.dispose(); fallback.dispose();
  });
});

function construct(id, tract, side = 1, showBody = true) {
  const model = new T.Group(), featherVaneMat = new T.MeshStandardMaterial(), filamentMat = new T.MeshStandardMaterial();
  const idleMotion = { phase: .2, feathers: [] };
  const env = { THREE: T, dn: { id }, props: { showBody }, model, featherVaneMat, filamentMat, idleMotion,
    dinoFeatherVaneProfile: profileFor, dinoFeatherGeometry: makeVane, dinoFeatherShaftGeometry: makeShaft,
    dinoFeatherFrame: frame, dinoSurfacePartIds: mark, vec: (x, y, z) => new T.Vector3(x, y, z) };
  const add = new Function(...Object.keys(env), extract('addFeatherVane') + ';return addFeatherVane;')(...Object.values(env));
  const base = new T.Vector3(.2, .3, side * .1), tip = base.clone().add(new T.Vector3(.4, -.06, side * .08));
  const vane = add(base, tip, .04, new T.Vector3(.03, -.1, side * .07), tract);
  model.updateMatrixWorld(true);
  return { model, vane, idleMotion, dispose() { model.traverse(object => { if (object.geometry) object.geometry.dispose(); }); featherVaneMat.dispose(); filamentMat.dispose(); } };
}

describe('Reviewed symmetry reaches actual model feathers', () => {
  for (const [id, tract] of reviewed) it('routes ' + id + ' ' + tract + ' through its evidence profile', () => {
    const current = construct(id, tract), g = current.vane.geometry, p = g.attributes.position;
    expect(current.vane.userData.dinoFeatherVaneProfile).toEqual(profileFor({ id }, tract));
    expect(current.vane.userData.featherTract).toBe(tract);
    expect(p.getX(50)).toBeCloseTo(-p.getX(54), 7);
    expect(current.vane.children).toHaveLength(1);
    expect(current.vane.children[0].geometry.attributes.position.count).toBe(191);
    expect(current.idleMotion.feathers).toHaveLength(1);
    expect(current.idleMotion.feathers[0].mesh).toBe(current.vane);
    current.dispose();
  });
  it('keeps left/right wing vane coordinates mirrored through their existing frames', () => {
    const left = construct('anchiornis', 'manual-wing', -1), right = construct('anchiornis', 'manual-wing', 1);
    for (let index = 0; index < left.vane.geometry.attributes.position.count; index++) {
      const l = left.vane.localToWorld(point(left.vane.geometry.attributes.position, index));
      const r = right.vane.localToWorld(point(right.vane.geometry.attributes.position, index));
      // Camber lies on opposite sides of mirrored local frames. Removing its
      // normal displacement isolates the anatomical vane plane and span.
      const localZ = left.vane.geometry.attributes.position.getZ(index);
      const ln = new T.Vector3(0, 0, 1).applyQuaternion(left.vane.quaternion);
      const rn = new T.Vector3(0, 0, 1).applyQuaternion(right.vane.quaternion);
      l.addScaledVector(ln, -localZ); r.addScaledVector(rn, -localZ);
      expect(l.x).toBeCloseTo(r.x, 7); expect(l.y).toBeCloseTo(r.y, 7); expect(l.z).toBeCloseTo(-r.z, 7);
    }
    left.dispose(); right.dispose();
  });
  it('keeps hidden-body construction empty', () => {
    const current = construct('anchiornis', 'manual-wing', 1, false);
    expect(current.vane).toBeNull(); expect(current.model.children).toHaveLength(0); expect(current.idleMotion.feathers).toHaveLength(0); current.dispose();
  });
});

describe('Students inspect the same evidence used by the vane geometry', () => {
  it('directs Anchiornis limb inspection to shafts and paired vanes while retaining limits on performance inference', () => {
    for (const id of ['wing', 'feathers', 'hindwings']) {
      const inspection = inspectionAPI.dinoPartInspectionFor(inspectionAPI.byId('anchiornis'), { id });
      expect(inspection.question).toMatch(/shaft.*vane widths on either side/);
      expect(inspection.life).toMatch(/nearly equal vanes/);
      expect(inspection.source.url).toBe(profileFor({ id: 'anchiornis' }, 'manual-wing').source.url);
      expect(inspection.limit).toMatch(/reconstructed/);
      expect(inspection.limit).toMatch(/symmetry alone does not measure flight performance/);
    }
  });
  it('limits Caudipteryx equal-vane learning claims to the terminal fan and leaves arm uncertainty separate', () => {
    const dn = inspectionAPI.byId('caudipteryx');
    for (const id of ['tailfeathers', 'feathers']) {
      const inspection = inspectionAPI.dinoPartInspectionFor(dn, { id });
      expect(inspection.question).toMatch(/shafts in the terminal tail fan/);
      expect(inspection.life).toMatch(/correction is limited to the tail fan/);
      expect(inspection.source.url).toBe(profileFor(dn, 'tail-fan').source.url);
      expect(inspection.limit).toMatch(/does not infer flight ability from symmetry/);
    }
    const arm = inspectionAPI.dinoPartInspectionFor(dn, { id: 'wing' });
    expect(arm.source).toBeUndefined();
    expect([arm.question, arm.life, arm.limit].join(' ')).not.toMatch(/symmetrical|equal vanes|terminal tail fan/);
    expect(arm.limit).toMatch(/not a preserved fossil map/);
    expect(profileFor(dn, 'manual-wing')).toBeNull();
  });
});
