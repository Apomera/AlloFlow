import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_NECK_SHOULDER_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(anchor)) throw new Error('Dino Lab registration anchor was not found');
window.StemLab = { registerTool() {} };
new Function(source.replace(anchor,
  'globalThis.__dinoNeckShoulder = { DINOS, postcranialSurfaceProfileFor, dinoCervicalEnvelope, dinoCervicalSkinEnvelope, dinoSurfaceGeometry, dinoCranialGeometry, dinoTorsoRadii, dinoNeckJunction, dinoLoftRadius };' + anchor))();
const art = globalThis.__dinoNeckShoulder;
const species = id => {
  const dino = art.DINOS.find(value => value.id === id);
  if (!dino) throw new Error('Missing catalog species: ' + id);
  return dino;
};
function setup(scale = 1, steep = false, id = 'triceratops') {
  const dn = species(id), profile = art.postcranialSurfaceProfileFor(dn);
  const height = .8 * scale, depth = height * (steep ? .64 : .82), length = 3.2 * scale;
  const shoulder = new THREE.Vector3(-.8 * scale, 1.7 * scale, .13 * scale);
  const hip = shoulder.clone().add(new THREE.Vector3(length, (steep ? -.12 : .04) * height, 0));
  const thoraxCenter = shoulder.clone().lerp(hip, .28);
  const head = shoulder.clone().add(new THREE.Vector3((steep ? -.7 : -1.2) * scale, (steep ? .9 : .23) * scale, 0));
  const baseRadius = height * .42 * (steep ? 1.18 : .90), tipRadius = height * .08;
  const envelope = art.dinoCervicalEnvelope(THREE, shoulder, head, height, baseRadius, tipRadius, profile,
    /Sauropod|Diplodoc|Brachiosaur|Camarasaur/i.test(dn.clade || ''), dn.clade);
  const torsoPoints = [shoulder.clone().add(new THREE.Vector3(-length * .25, 0, 0)), shoulder,
    thoraxCenter, shoulder.clone().lerp(hip, .53), shoulder.clone().lerp(hip, .78), hip,
    hip.clone().add(new THREE.Vector3(length * .24, 0, 0))];
  return { scale, dn, profile, height, depth, shoulder, hip, thoraxCenter, head, envelope, torsoPoints,
    torsoRadii: art.dinoTorsoRadii(height, depth, profile) };
}
function surface(envelope, taperRoot = false) {
  return art.dinoSurfaceGeometry(THREE, envelope.points, envelope.radii, { smoothProfile: true, taperRoot });
}
function topology(geometry) {
  const p = geometry.attributes.position, epsilon = new THREE.Box3().setFromBufferAttribute(p).getSize(new THREE.Vector3()).length() * 1e-6;
  const keys = new Map(), vertexIds = [], edges = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(value => Math.round(value / epsilon)).join(',');
    if (!keys.has(key)) keys.set(key, keys.size);
    vertexIds.push(keys.get(key));
  }
  let degenerates = 0;
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const tri = [vertexIds[index[i]], vertexIds[index[i + 1]], vertexIds[index[i + 2]]];
    if (new Set(tri).size !== 3) degenerates++;
    for (let j = 0; j < 3; j++) {
      const a = tri[j], b = tri[(j + 1) % 3], key = a < b ? a + ',' + b : b + ',' + a;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  return { degenerates, counts: Array.from(edges.values()) };
}
const chainStart = source.indexOf('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {');
const chainEnd = source.indexOf('function addContourGroup(meshes)', chainStart);
const callerStart = source.indexOf('var neckSkinEnvelope = dinoCervicalSkinEnvelope(');
const callerEnd = source.indexOf('var tailMidA =', callerStart);
if ([chainStart, chainEnd, callerStart, callerEnd].some(index => index < 0)) throw new Error('Neck skin construction was not found');
const createChain = new Function('THREE', 'props', 'bodyMat', 'model', 'dinoCranialGeometry', 'dinoSurfaceGeometry',
  source.slice(chainStart, chainEnd) + 'return addSoftTissueChain;');
const buildNeck = new Function('THREE', 'cervicalEnvelope', 'shoulder', 'thoraxCenter', 'cladeName', 'isSauropod', 'hasAnatomyPart',
  'neckPoints', 'neckRadii', 'head', 'bodyMat', 'idleMotion', 'addSoftTissueChain', 'addContourGroup', 'dinoCervicalSkinEnvelope',
  source.slice(callerStart, callerEnd) + 'return { neckMeshes, neckSkinEnvelope, neckSurfaceCurve, neckContours };');
function caller(data, clade = data.dn.clade, frill = true) {
  const model = new THREE.Group(), material = new THREE.MeshBasicMaterial(), idleMotion = { breathingMeshes: [] }, contourSnapshots = [];
  const chain = createChain(THREE, { showBody: true }, material, model, art.dinoCranialGeometry, art.dinoSurfaceGeometry);
  const built = buildNeck(THREE, data.envelope, data.shoulder, data.thoraxCenter, clade, data.dn.group === 'sauropod', id => frill && id === 'frill',
    data.envelope.points, data.envelope.radii, data.head, material, idleMotion, chain, meshes => meshes.map(mesh => {
      contourSnapshots.push({ position: mesh.position.clone(), positions: mesh.geometry.attributes.position.array.slice() });
      const contour = new THREE.Mesh(mesh.geometry, material);
      contour.position.copy(mesh.position); contour.scale.copy(mesh.scale).multiplyScalar(1.012);
      return contour;
    }), art.dinoCervicalSkinEnvelope);
  return { ...built, material, model, idleMotion, contourSnapshots };
}
function disposeBuilt(built) {
  built.neckMeshes.forEach(mesh => mesh.geometry.dispose());
  built.material.dispose();
}

describe('Dino Lab neck skin shoulder transition', () => {
  it('changes only the middle skin radii while preserving endpoint anchors and the original envelope', () => {
    const data = setup(), before = JSON.stringify(data.envelope);
    const filled = art.dinoCervicalSkinEnvelope(data.envelope, true), base = data.envelope.radii[0], tip = data.envelope.radii[3];
    expect(filled.points).toBe(data.envelope.points);
    expect(filled.radii === data.envelope.radii).toBe(false);
    expect(filled.radii).toEqual([base, base * .70, Math.min(base * .70, tip * 1.36), tip]);
    expect(filled.radii[0]).toBe(base); expect(filled.radii[3]).toBe(tip);
    expect(JSON.stringify(data.envelope)).toBe(before);
    const boundary = { points: data.envelope.points, radii: [tip * 2, tip * 1.8, tip * 1.22, tip] };
    expect(art.dinoCervicalSkinEnvelope(boundary, true).radii).toEqual([tip * 2, tip * 2 * .70, tip * 1.36, tip]);
  });

  it('returns the exact envelope for disabled, malformed or unsuitable endpoint radii', () => {
    const data = setup(), envelope = data.envelope, base = envelope.radii[0], tip = envelope.radii[3];
    for (const enabled of [false, undefined, null, 0, 1, 'true']) expect(art.dinoCervicalSkinEnvelope(envelope, enabled)).toBe(envelope);
    const malformed = [
      { points: envelope.points.slice(0, 3), radii: envelope.radii },
      { points: envelope.points.concat(envelope.points[3]), radii: envelope.radii },
      { points: envelope.points, radii: envelope.radii.slice(0, 3) },
      { points: envelope.points, radii: envelope.radii.concat(tip) }
    ];
    for (const [invalidBase, invalidTip] of [[NaN, tip], [Infinity, tip], [base, NaN], [base, Infinity], [base, -tip], [tip * 1.9, tip]])
      malformed.push({ points: envelope.points, radii: [invalidBase, envelope.radii[1], envelope.radii[2], invalidTip] });
    for (const invalid of malformed) expect(art.dinoCervicalSkinEnvelope(invalid, true)).toBe(invalid);
  });

  for (const scale of [.03, 1, 12]) for (const steep of [false, true]) {
    it('builds a closed bounded monotonic skin taper at scale ' + scale + ' with a ' + (steep ? 'steep' : 'shallow') + ' neck', () => {
      const data = setup(scale, steep), filled = art.dinoCervicalSkinEnvelope(data.envelope, true);
      const before = surface(data.envelope), skin = surface(filled), base = filled.radii[0], tip = filled.radii[3];
      try {
        expect(Array.from(skin.attributes.position.array).every(Number.isFinite)).toBe(true);
        expect(Array.from(skin.attributes.normal.array).every(Number.isFinite)).toBe(true);
        const edges = topology(skin);
        expect(edges.degenerates).toBe(0); expect(edges.counts.every(count => count === 2)).toBe(true);
        expect(skin.attributes.position.count).toBe(before.attributes.position.count);
        expect(skin.index.array).toEqual(before.index.array);
        expect(filled.points).toBe(data.envelope.points);
        expect(filled.radii[1]).toBeLessThan(data.envelope.radii[1]);
        let previous = base, maxNormalError = 0;
        for (let step = 0; step <= 192; step++) {
          const radius = art.dinoLoftRadius(filled.radii, step / 64, 0);
          expect(radius).toBeLessThanOrEqual(previous + scale * 1e-10);
          expect(radius).toBeGreaterThanOrEqual(tip - scale * 1e-10);
          expect(radius).toBeLessThanOrEqual(base + scale * 1e-10);
          previous = radius;
        }
        const normals = skin.attributes.normal;
        for (let i = 0; i < normals.count; i++) maxNormalError = Math.max(maxNormalError, Math.abs(new THREE.Vector3().fromBufferAttribute(normals, i).length() - 1));
        expect(maxNormalError).toBeLessThan(1e-6);
        for (const ring of [0, 48]) {
          const start = ring * 25 * 3;
          expect(skin.attributes.position.array.slice(start, start + 25 * 3)).toEqual(before.attributes.position.array.slice(start, start + 25 * 3));
        }
      } finally { before.dispose(); skin.dispose(); }
    });
  }

  it('keeps the skull closure inside the tapered neck and preserves original junction and detail anchors', () => {
    for (const scale of [.03, 1, 12]) for (const steep of [false, true]) {
      const data = setup(scale, steep), before = JSON.stringify(data.envelope);
      const junction = art.dinoNeckJunction(THREE, data.envelope.points, data.envelope.radii, .6 * scale);
      const built = caller(data, 'Ceratopsidae', true), mesh = built.neckMeshes[0];
      const headLength = .4 * scale, headHeight = .2 * scale, headDepth = .18 * scale;
      const occiput = data.head.clone().add(new THREE.Vector3(headLength * .32, 0, 0));
      const snout = data.head.clone().add(new THREE.Vector3(-headLength, 0, 0));
      const headCap = art.dinoCranialGeometry(THREE,
        [junction.point, junction.point.clone().lerp(occiput, .5), occiput, data.head, data.head.clone().lerp(snout, .58), snout,
          snout.clone().add(new THREE.Vector3(-headLength * .25, -headHeight * .03, 0))],
        [[junction.radius, junction.radius], [headHeight * .20, headDepth * .24], [headHeight * .84, headDepth * .82],
          [headHeight, headDepth], [headHeight * .62, headDepth * .72], [headHeight * .45, headDepth * .62], [headHeight * .025, headDepth * .04]],
        { center: data.head, length: headLength, height: headHeight, depth: headDepth, cheek: 0 });
      try {
        mesh.material.side = THREE.DoubleSide; mesh.updateMatrixWorld(true);
        for (let i = 0; i < 40; i++) {
          const delta = new THREE.Vector3().fromBufferAttribute(headCap.attributes.position, i).sub(junction.point);
          const hit = new THREE.Raycaster(junction.point.clone().addScaledVector(delta, 8), delta.clone().normalize().negate()).intersectObject(mesh, false)[0];
          expect(hit).toBeDefined();
          expect(hit.point.clone().sub(junction.point).dot(delta.clone().normalize())).toBeGreaterThan(delta.length() * 1.05);
        }
        const after = art.dinoNeckJunction(THREE, data.envelope.points, data.envelope.radii, .6 * scale);
        expect(after.point.toArray()).toEqual(junction.point.toArray()); expect(after.radius).toBe(junction.radius); expect(after.t).toBe(junction.t);
        expect(source.includes('var neckPoints = cervicalEnvelope.points;')).toBe(true);
        expect(source.includes('var neckRadii = cervicalEnvelope.radii;')).toBe(true);
        expect(built.neckSurfaceCurve.points).toBe(data.envelope.points);
        const end = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, mesh.geometry.attributes.position.count - 1));
        expect(end.distanceTo(data.head)).toBeLessThan(scale * 1e-6);
        expect(JSON.stringify(data.envelope)).toBe(before);
      } finally { headCap.dispose(); disposeBuilt(built); }
    }
  });

  for (const id of ['stegosaurus', 'brachiosaurus', 'parasaurolophus']) {
    it('preserves non-ceratopsian ' + id + ' geometry through the actual caller', () => {
      const data = setup(1, false, id), built = caller(data, data.dn.clade, false);
      const before = surface(data.envelope, data.dn.group === 'sauropod'); before.translate(-data.shoulder.x, -data.shoulder.y, -data.shoulder.z);
      try {
        expect(built.neckSkinEnvelope).toBe(data.envelope);
        for (const attribute of ['position', 'normal', 'uv']) expect(built.neckMeshes[0].geometry.attributes[attribute].array).toEqual(before.attributes[attribute].array);
        expect(built.neckMeshes[0].geometry.index.array).toEqual(before.index.array);
        expect(built.neckMeshes[0].position.toArray()).toEqual(data.shoulder.toArray());
      } finally { before.dispose(); disposeBuilt(built); }
    });
  }

  for (const check of [
    { label: 'frilled ceratopsian', clade: 'Ceratopsidae', frill: true, enabled: true },
    { label: 'ceratopsian without a frill', clade: 'Ceratopsidae', frill: false, enabled: false },
    { label: 'another clade with a frill flag', clade: 'Hadrosauridae', frill: true, enabled: false }
  ]) it('retains material, contour and motion ownership for a ' + check.label, () => {
    const data = setup(), before = JSON.stringify(data.envelope), built = caller(data, check.clade, check.frill);
    try {
      expect(built.neckSkinEnvelope === data.envelope).toBe(!check.enabled);
      expect(built.neckMeshes).toHaveLength(1); expect(built.model.children).toHaveLength(1);
      const mesh = built.neckMeshes[0];
      expect(mesh.material).toBe(built.material); expect(mesh.userData.dinoRegion).toBe('neck');
      expect(mesh.userData.dinoNeckTip).toEqual(data.head.toArray());
      expect(mesh.position.toArray()).toEqual(data.shoulder.toArray());
      expect(built.contourSnapshots[0].position.toArray()).toEqual(data.shoulder.toArray());
      expect(built.contourSnapshots[0].positions).toEqual(mesh.geometry.attributes.position.array);
      expect(built.neckContours[0].geometry).toBe(mesh.geometry);
      expect(built.idleMotion.neck).toBe(mesh); expect(built.idleMotion.neckContour).toBe(built.neckContours[0]);
      expect(built.idleMotion.neckBaseScale.toArray()).toEqual(mesh.scale.toArray());
      expect(built.idleMotion.neckBaseRotation.toArray()).toEqual(mesh.rotation.toArray());
      expect(built.idleMotion.breathingMeshes).toHaveLength(0);
      expect(built.neckSurfaceCurve.points).toBe(data.envelope.points);
      expect(JSON.stringify(data.envelope)).toBe(before);
    } finally { disposeBuilt(built); }
  });

  it('keeps specimen positions and transformed bounds around the established shoulder pivot', () => {
    const data = setup(), built = caller(data, 'Ceratopsidae', true), mesh = built.neckMeshes[0];
    const raw = surface(built.neckSkinEnvelope);
    try {
      mesh.rotation.set(.045, -.035, .025); mesh.scale.set(1.012, 1.028, 1.012); mesh.updateMatrixWorld(true);
      const expectedBounds = new THREE.Box3(), actualBounds = new THREE.Box3();
      let maxError = 0;
      for (let i = 0; i < raw.attributes.position.count; i++) {
        const expected = new THREE.Vector3().fromBufferAttribute(raw.attributes.position, i).sub(data.shoulder)
          .multiply(mesh.scale).applyQuaternion(mesh.quaternion).add(data.shoulder);
        const actual = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i));
        expectedBounds.expandByPoint(expected); actualBounds.expandByPoint(actual);
        maxError = Math.max(maxError, actual.distanceTo(expected));
      }
      expect(maxError).toBeLessThan(1e-6);
      expect(actualBounds.min.distanceTo(expectedBounds.min)).toBeLessThan(1e-6);
      expect(actualBounds.max.distanceTo(expectedBounds.max)).toBeLessThan(1e-6);
      expect(mesh.localToWorld(new THREE.Vector3()).toArray()).toEqual(data.shoulder.toArray());
    } finally { raw.dispose(); disposeBuilt(built); }
  });

});
