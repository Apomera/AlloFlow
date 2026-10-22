import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { baselinePlumageSource } from './fixtures/dinolab_dromaeosaur_plumage_before.js';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_DROMAEOSAUR_PLUMAGE_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const baseline = process.env.DINO_DROMAEOSAUR_PLUMAGE_BASELINE ? readFileSync(process.env.DINO_DROMAEOSAUR_PLUMAGE_BASELINE, 'utf8') : baselinePlumageSource;
function extract(text, name) {
  const start = text.indexOf('function ' + name + '('), open = text.indexOf('{', start);
  if (start < 0) throw new Error('Missing production function ' + name);
  let depth = 1, end = open + 1;
  while (depth && end < text.length) { if (text[end] === '{') depth++; if (text[end] === '}') depth--; end++; }
  if (depth) throw new Error('Unbalanced production function ' + name);
  return text.slice(start, end);
}
const sharedNames = ['byId', 'skeletalAnatomyProfileFor', 'reconstructionHypothesesFor', 'dinoFoldedWingProfileFor', 'dinoRestingWingRow', 'dinoFeatherVaneProfile', 'dinoFeatherGeometry', 'dinoFeatherShaftGeometry', 'dinoFeatherFrame', 'dinoSurfaceAnchor', 'dinoSurfacePartIds'];
const reviewedNames = ['dinoDromaeosaurPlumageProfile', 'dinoMarkDromaeosaurPlumage', 'dinoDromaeosaurForearmRow', 'dinoDromaeosaurTailRow'];
function load(text, reviewed) {
  const names = [...sharedNames, ...(reviewed ? reviewedNames : [])];
  const anchor = "window.StemLab.registerTool('dinoLab'";
  window.StemLab = { registerTool() {} };
  new Function(text.replace(anchor, 'globalThis.__raptorPlumage = {' + names.join(',') + '};\n' + anchor))();
  const api = globalThis.__raptorPlumage; delete globalThis.__raptorPlumage;
  return api;
}
const now = load(source, true);
const frozenNames = sharedNames.filter(name => !['byId', 'skeletalAnatomyProfileFor', 'reconstructionHypothesesFor'].includes(name));
const old = { ...now, ...new Function(frozenNames.map(name => extract(baseline, name)).join('\n') + '\nreturn {' + frozenNames.join(',') + '};')() };
const vec = (x, y, z) => new T.Vector3(x, y, z);
const point = (attribute, index) => new T.Vector3().fromBufferAttribute(attribute, index);

function construct(text, api, id, scale = 1, side = 1, mode = 'evidence', kind = 'forearm') {
  const dn = api.byId(id), length = dn.lengthM * scale, ht = dn.heightM * scale;
  const model = new T.Group(), featherVaneMat = new T.MeshStandardMaterial(), filamentMat = new T.MeshStandardMaterial();
  const idleMotion = { phase: .31, feathers: [] }, profile = api.skeletalAnatomyProfileFor(dn);
  const hypothesis = api.reconstructionHypothesesFor(dn, profile, mode).active;
  const start = vec(-length * .12, ht * .8, side * ht * .23), end = vec(-length * .15, ht * .53, side * ht * .26);
  const tailCurve = new T.CatmullRomCurve3([vec(0, ht * .8, 0), vec(length * .18, ht * .83, 0), vec(length * .37, ht * .80, 0), vec(length * .56, ht * .76, 0)]);
  const radius = ht * .018;
  let surface;
  if (kind === 'tail') surface = new T.Mesh(new T.TubeGeometry(tailCurve, 32, radius, 16, false), new T.MeshBasicMaterial({ side: T.DoubleSide }));
  else {
    surface = new T.Mesh(new T.CylinderGeometry(radius, radius, start.distanceTo(end), 16, 4), new T.MeshBasicMaterial({ side: T.DoubleSide }));
    surface.position.copy(start).add(end).multiplyScalar(.5);
    surface.quaternion.setFromUnitVectors(vec(0, 1, 0), end.clone().sub(start).normalize());
  }
  surface.userData.dinoRegion = kind; model.add(surface); model.updateMatrixWorld(true);
  const env = { ...api, THREE: T, dn, len: length, ht, detailScale: scale, props: { showBody: true }, model,
    featherVaneMat, filamentMat, idleMotion, vec, surfaceBodyHeight: ht * .3, surfaceBodyDepth: ht * .25, bodyDepth: ht * .25,
    neckBaseRadius: ht * .07, tailBaseRadius: ht * .04, tailSurfaceCurve: tailCurve, tailMeshes: [surface],
    surfaceHypothesis: hypothesis };
  const nested = ['addFeatherVane', 'surfaceAnchor', 'bindSurfaceDetail', 'addSeatedFeather', 'addRestingWingRows', 'addLimbPlumage'].map(name => extract(text, name)).join('\n');
  let execute;
  if (kind === 'tail') {
    const from = text.indexOf("              if (dn.id === 'microraptor' && surfaceHypothesis.tailFrond) {");
    const to = text.indexOf('              var cranialFaceBefore', from);
    execute = text.slice(from, to);
  } else execute = 'if (surfaceHypothesis.wingFeathers && surfaceHypothesis.forearmFeathers !== false) addLimbPlumage(surface, start, end, side, false);';
  new Function(...Object.keys(env), 'surface', 'start', 'end', 'side', nested + '\n' + execute)(...Object.values(env), surface, start, end, side);
  model.updateMatrixWorld(true);
  const vanes = []; model.traverse(mesh => { if (mesh.userData.dinoFeature === 'feather') vanes.push(mesh); });
  return { model, surface, vanes, idleMotion, hypothesis, start, end, tailCurve, length, ht,
    dispose() { model.traverse(mesh => { if (mesh.geometry) mesh.geometry.dispose(); }); surface.material.dispose(); featherVaneMat.dispose(); filamentMat.dispose(); } };
}
function signature(build) {
  const hash = createHash('sha256');
  build.model.traverse(mesh => {
    hash.update(JSON.stringify({ position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), userData: mesh.userData, shadow: [mesh.castShadow, mesh.receiveShadow], order: mesh.renderOrder }));
    if (mesh.geometry) {
      for (const name of Object.keys(mesh.geometry.attributes).sort()) {
        const attribute = mesh.geometry.attributes[name]; hash.update(name); hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
      }
      const attribute = mesh.geometry.index; if (attribute) hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
  });
  return hash.digest('hex');
}
const cost = build => {
  let vertices = 0, indices = 0, meshes = 0;
  build.model.traverse(mesh => { if (mesh.isMesh) { meshes++; vertices += mesh.geometry.attributes.position.count; indices += mesh.geometry.index?.count || 0; } });
  return { vertices, indices, meshes };
};

describe('Reviewed Velociraptor and Deinonychus plumage', () => {
  for (const id of ['velociraptor', 'deinonychus']) for (const scale of [.02, 1, 9]) for (const kind of ['forearm', 'tail']) {
    it(id + ' builds rooted, slender native vane and shaft meshes in the ' + kind + ' at scale ' + scale, () => {
      const actual = construct(source, now, id, scale, 1, 'evidence', kind), before = construct(baseline, old, id, scale, 1, 'evidence', kind);
      try {
        expect(actual.vanes).toHaveLength(kind === 'forearm' ? 20 : 16);
        expect(cost(actual)).toEqual(cost(before));
        expect(actual.model.userData.dinoDromaeosaurPlumage.species).toBe(id);
        for (const vane of actual.vanes) {
          expect(vane.parent).toBe(actual.surface); expect(vane.children).toHaveLength(1);
          const shaft = vane.children[0], data = vane.userData.dinoDromaeosaurPlumage;
          expect(shaft.userData.dinoDromaeosaurPlumage).toEqual(data);
          expect(data.inferredShape).toBe(true); expect(data.countsIllustrative).toBe(true);
          expect(data.presenceEvidence).toBe(kind === 'forearm' && id === 'velociraptor' ? 'direct attachment evidence in referred specimen' : 'relative inference');
          expect(data.limits).toMatch(/illustrative.*do not demonstrate flight/);
          expect(data.sources).toContain('https://doi.org/10.1126/science.1145076');
          expect(vane.userData.featherWidth / vane.userData.featherLength).toBeLessThan(.105);
          for (const mesh of [vane, shaft]) {
            for (const attribute of Object.values(mesh.geometry.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
            const normal = mesh.geometry.attributes.normal;
            for (let i = 0; i < normal.count; i++) {
              const size = point(normal, i).length();
              // The unchanged vane collapses its root/tip rows into zero-area
              // triangles. Their zero normals are harmless; all lit faces and
              // every closed shaft vertex retain unit normals.
              if (mesh === vane && size === 0) {
                const t = mesh.geometry.attributes.uv.getY(i); expect(t === 0 || t === 1).toBe(true);
              } else expect(size).toBeCloseTo(1, 5);
            }
          }
          const root = vane.getWorldPosition(new T.Vector3()), direction = root.clone().sub(kind === 'tail' ? actual.tailCurve.getPoint(data.t) : actual.start.clone().lerp(actual.end, (data.index / 9) * .86 + .08));
          expect(direction.length()).toBeLessThan(actual.ht * .03);
          const attachment = actual.surface.localToWorld(new T.Vector3().fromArray(vane.userData.dinoAttachment.point));
          expect(root.distanceTo(attachment)).toBeLessThan(vane.userData.featherWidth * .031 + actual.length * 1e-6);
        }
        if (id === 'velociraptor') {
          expect(actual.model.userData.dinoDromaeosaurPlumage.forearmSpecimen).toBe('IGM 100/3503');
          expect(actual.model.userData.dinoDromaeosaurPlumage.forearmEvidence).toMatch(/species referral remains under review/);
          expect(actual.model.userData.dinoDromaeosaurPlumage.sources).toContain('https://doi.org/10.1206/3982.1');
        }
        else expect(actual.model.userData.dinoDromaeosaurPlumage.forearmSpecimen).toBeNull();
      } finally { actual.dispose(); before.dispose(); }
    });
  }

  for (const id of ['velociraptor', 'deinonychus']) it(id + ' has paired reflected forearm roots and a caudally swept bilateral tail tract', () => {
    const dn = now.byId(id), start = vec(-.15, .4, .1), end = vec(-.2, .22, .12);
    const right = now.dinoDromaeosaurForearmRow(T, dn, start, end, 1, dn.lengthM);
    const left = now.dinoDromaeosaurForearmRow(T, dn, start.clone().setZ(-start.z), end.clone().setZ(-end.z), -1, dn.lengthM);
    expect(right).toHaveLength(10); expect(left).toHaveLength(10);
    for (let i = 0; i < right.length; i++) for (const key of ['center', 'covertCenter', 'direction', 'covertDirection', 'outward', 'covertOutward', 'spread']) {
      expect(right[i][key].x).toBe(left[i][key].x); expect(right[i][key].y).toBe(left[i][key].y); expect(right[i][key].z).toBe(-left[i][key].z);
    }
    const curve = new T.CatmullRomCurve3([vec(0, .4, 0), vec(.4, .44, 0), vec(.8, .35, 0)]);
    const rows = now.dinoDromaeosaurTailRow(T, dn, curve, dn.lengthM);
    for (let i = 0; i < rows.length; i += 2) {
      const a = rows[i], b = rows[i + 1], tangent = curve.getTangent(a.t).normalize();
      expect(a.center.toArray()).toEqual(b.center.toArray());
      expect(a.direction.x).toBe(b.direction.x); expect(a.direction.y).toBe(b.direction.y); expect(a.direction.z).toBe(-b.direction.z);
      expect(a.direction.clone().normalize().dot(tangent)).toBeGreaterThan(.98);
      expect(a.width / a.direction.length()).toBeLessThan(.066);
    }
    expect(rows[6].direction.length()).toBeGreaterThan(rows[0].direction.length());
    expect(rows.at(-1).direction.length()).toBeLessThan(rows[6].direction.length());
  });

  for (const [id, mode, expectedForearm, expectedTail] of [
    ['velociraptor', 'conservative', 20, 0], ['deinonychus', 'conservative', 0, 0],
    ['velociraptor', 'classic', 0, 0], ['deinonychus', 'classic', 0, 0],
    ['velociraptor', 'avian', 20, 16], ['deinonychus', 'avian', 20, 16]
  ]) it('retains the ' + id + ' ' + mode + ' covering gates', () => {
    for (const [kind, count] of [['forearm', expectedForearm], ['tail', expectedTail]]) {
      const actual = construct(source, now, id, 1, 1, mode, kind);
      try { expect(actual.vanes).toHaveLength(count); }
      finally { actual.dispose(); }
    }
  });

  for (const id of ['utahraptor', 'microraptor', 'anchiornis', 'archaeopteryx', 'caudipteryx', 'tyrannosaurus']) for (const kind of ['forearm', 'tail']) {
    it('keeps the full native ' + kind + ' construction exact for unreviewed ' + id, () => {
      const actual = construct(source, now, id, 1, 1, 'evidence', kind), before = construct(baseline, old, id, 1, 1, 'evidence', kind);
      try { expect(signature(actual)).toBe(signature(before)); expect(now.dinoDromaeosaurPlumageProfile(now.byId(id))).toBeNull(); }
      finally { actual.dispose(); before.dispose(); }
    });
  }

  it('rejects wrong taxonomy, invalid points and degenerate tracts without native geometry', () => {
    for (const dn of [null, { id: 'velociraptor' }, { ...now.byId('velociraptor'), clade: 'Troodontidae' }, { ...now.byId('deinonychus'), group: 'pterosaur' }]) expect(now.dinoDromaeosaurPlumageProfile(dn)).toBeNull();
    const dn = now.byId('velociraptor'), start = vec(0, 0, 0), end = vec(.1, .2, 0);
    for (const [a, b, side, length] of [[start, start, 1, 2], [null, end, 1, 2], [start, end, 0, 2], [start, end, 1, -1], [vec(NaN, 0, 0), end, 1, 2]]) expect(now.dinoDromaeosaurForearmRow(T, dn, a, b, side, length)).toBeNull();
    expect(now.dinoDromaeosaurTailRow(T, dn, null, 2)).toBeNull(); expect(now.dinoDromaeosaurTailRow(T, dn, {}, 2)).toBeNull();
  });
});
