import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FORELEG_TAPER_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(anchor)) throw new Error('Dino Lab registration anchor missing');
window.StemLab = { registerTool() {} };
new Function(source.replace(anchor,
  'globalThis.__dinoForelegTaper = { DINOS, skeletalAnatomyProfileFor, postcranialSurfaceProfileFor, dinoFootSurfaceProfileFor, dinoCeratopsianForelegRadii, dinoSurfaceGeometry, dinoCranialGeometry, dinoPlantLimbSurface, dinoCompactFootGeometry, dinoCompactDigitGeometry, dinoBluntTerminalGeometry, dinoKeratinGeometry, dinoIguanodontThumbEnabled };' + anchor))();
const art = globalThis.__dinoForelegTaper;
delete globalThis.__dinoForelegTaper;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const sha = value => createHash('sha256').update(value).digest('hex');
function block(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker), end = text.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error('Actual construction seam missing: ' + startMarker);
  return text.slice(start, end);
}
const legCode = block(source, 'function addLeg(x, z, front) {', 'var stance =');
const chainCode = block(source, 'function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {', 'function addContourGroup(meshes)');
const boneCode = block(source, 'function addBone(a, b, radius) {', 'function addLimbJoint(p, axis, radius, hingeScale) {');
const contourCode = block(source, 'function addBodyContour(mesh) {', 'function addSceneCylinder(a, b, radius, mat) {');
const digitCode = block(source, 'function tagDistalSurface(mesh, front, sideSign, partIds, feature) {', 'function surfaceAnchor(surface, center, outward) {');
const inContext = (code, result, context) => new Function('context', 'with (context) {' + code + 'return ' + result + ';}')(context);
function setup(scale = 1, breadth = .70, id = 'triceratops', front = true, side = 1, columnar = false) {
  const dn = art.DINOS.find(value => value.id === id);
  if (!dn) throw new Error('Catalog species missing: ' + id);
  return { scale, breadth, dn, front, side, columnar,
    skeletalProfile: art.skeletalAnatomyProfileFor(dn), postcranialSurface: art.postcranialSurfaceProfileFor(dn),
    len: 8 * scale, ht: 3 * scale, bodyDepth: breadth * scale,
    shoulder: vec(-1.44, 1.285056, 0).multiplyScalar(scale), hip: vec(1.44, 1.30, 0).multiplyScalar(scale),
    posture: { kneeFlex: .05, footReach: 1 } };
}
function caller(data, enabled = true) {
  const model = new THREE.Group(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const records = { chains: [], helperCalls: [], bones: [], operations: [], anchors: [], contacts: [] };
  const serial = value => value && value.isVector3 ? value.toArray() : value;
  const record = name => (...args) => { records.operations.push({ name, args: args.map(serial) }); return null; };
  const footProfile = art.dinoFootSurfaceProfileFor(data.dn, data.skeletalProfile, data.front);
  if (data.columnar) footProfile.columnar = true;
  const context = {
    THREE, vec, model, props: { showBody: true, showSkeleton: true }, dn: data.dn, cladeName: data.dn.clade,
    detailScale: data.scale, len: data.len, ht: data.ht, bodyDepth: data.bodyDepth, surfaceBodyDepth: data.bodyDepth, shoulder: data.shoulder, hip: data.hip,
    posture: data.posture, skeletalProfile: data.skeletalProfile, postcranialSurface: data.postcranialSurface,
    isTheropod: data.dn.group === 'theropod', isSauropod: data.dn.group === 'sauropod',
    bodyMat: material, headMat: material, boneMat: material, bodyWireMat: material, keratinMat: material,
    dinoSurfaceGeometry: art.dinoSurfaceGeometry, dinoCranialGeometry: art.dinoCranialGeometry,
    dinoPlantLimbSurface: art.dinoPlantLimbSurface, dinoCompactFootGeometry: art.dinoCompactFootGeometry,
    dinoCompactDigitGeometry: art.dinoCompactDigitGeometry, dinoBluntTerminalGeometry: art.dinoBluntTerminalGeometry,
    dinoIguanodontThumbEnabled: art.dinoIguanodontThumbEnabled,
    dinoFootSurfaceProfileFor: (dn, skeletal, front) => front === data.front ? footProfile : art.dinoFootSurfaceProfileFor(dn, skeletal, front),
    dinoCeratopsianForelegRadii: (radii, gate) => {
      const saved = radii.slice(), result = art.dinoCeratopsianForelegRadii(radii, enabled ? gate : false);
      records.helperCalls.push({ input: radii, saved, result, gate }); return result;
    },
    plantedFootContacts: records.contacts, idleMotion: { legs: [] }, surfaceHypothesis: { featureScales: true },
    addBodyPartAnchor: (part, point) => {
      const object = new THREE.Object3D(); object.position.copy(point); object.userData.dinoBodyPart = part; model.add(object);
      records.anchors.push({ object, part, rest: point.toArray() }); return object;
    },
    addLimbJoint: record('joint'), addLimbCrest: record('crest'), addDigitFan: record('skeletalDigits'),
    addMuscleBelly: record('muscle'), addIguanodontThumb: record('thumb'), addContourPlumage: record('plumage'), addLimbPlumage: record('limbPlumage'),
    addKeratinCone: record('keratinCone'), addEllipsoid: record('ellipsoid'), addSoftTissueCylinder: record('softCylinder')
  };
  context.addBodyContour = inContext(contourCode, 'addBodyContour', context);
  const nativeChain = inContext(chainCode, 'addSoftTissueChain', context);
  context.addSoftTissueChain = (points, radii, mat) => {
    const meshes = nativeChain(points, radii, mat);
    records.chains.push({ points, pointValues: points.map(point => point.toArray()), radii: radii.slice(), meshes }); return meshes;
  };
  const bones = inContext(boneCode, '({addBone, addLongBone})', context);
  context.addBone = (...args) => { records.operations.push({ name: 'metapodialBone', args: args.map(serial) }); return bones.addBone(...args); };
  context.addLongBone = (...args) => {
    const previous = new Set(model.children), result = bones.addLongBone(...args);
    records.bones.push({ args: args.map(serial), meshes: model.children.filter(child => !previous.has(child)) }); return result;
  };
  context.addSoftTissueDigitFan = inContext(digitCode, 'addSoftTissueDigitFan', context);
  const addLeg = inContext(legCode, 'addLeg', context);
  addLeg((data.front ? data.shoulder : data.hip).x, data.side * .32 * data.scale, data.front);
  model.updateMatrixWorld(true);
  const mesh = records.chains[0].meshes[0], pad = model.children.find(child => child.userData.dinoFeature === 'plantar-pad');
  return { data, model, mesh, pad, material, footProfile, records, motion: context.idleMotion.legs[0] };
}
function dispose(built) {
  const geometries = new Set(); built.model.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
  geometries.forEach(geometry => geometry.dispose()); built.material.dispose();
}
function geometryEqual(actual, expected) {
  for (const name of ['position', 'normal', 'uv']) expect(actual.attributes[name].array).toEqual(expected.attributes[name].array);
  expect(actual.index.array).toEqual(expected.index.array);
  expect(actual.boundingBox.min.toArray()).toEqual(expected.boundingBox.min.toArray());
  expect(actual.boundingBox.max.toArray()).toEqual(expected.boundingBox.max.toArray());
}
function topology(geometry) {
  const p = geometry.attributes.position, size = new THREE.Box3().setFromBufferAttribute(p).getSize(vec(0, 0, 0)).length(), epsilon = size * 1e-6;
  const keys = new Map(), ids = [], edges = new Map(); let degenerates = 0;
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(value => Math.round(value / epsilon)).join(',');
    if (!keys.has(key)) keys.set(key, keys.size); ids.push(keys.get(key));
  }
  for (let i = 0; i < geometry.index.count; i += 3) {
    const tri = [ids[geometry.index.array[i]], ids[geometry.index.array[i + 1]], ids[geometry.index.array[i + 2]]];
    if (new Set(tri).size !== 3) degenerates++;
    for (let j = 0; j < 3; j++) {
      const a = tri[j], b = tri[(j + 1) % 3], key = a < b ? a + ',' + b : b + ',' + a;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  return { degenerates, counts: Array.from(edges.values()) };
}
function inside(mesh, point, tolerance) {
  const direction = vec(1, .371, .217).normalize(), hits = new THREE.Raycaster(point, direction).intersectObject(mesh, false);
  const distances = [];
  for (const hit of hits) if (hit.distance > tolerance && !distances.some(value => Math.abs(hit.distance - value) < tolerance)) distances.push(hit.distance);
  return distances.length % 2 === 1;
}

describe('Dino Lab bounded ceratopsid foreleg skin taper', () => {
  it('returns exact inputs for disabled, unsupported and unsafe radii', () => {
    const valid = [.20, .25, .27, .16, .17, .10, .09];
    for (const gate of [false, undefined, null, 1, 'true']) expect(art.dinoCeratopsianForelegRadii(valid, gate)).toBe(valid);
    for (const radii of [null, {}, valid.slice(1), [...valid, .08], ...[0, -.1, NaN, Infinity, '0.1'].map(value => valid.map((radius, index) => index === 5 ? value : radius))])
      expect(art.dinoCeratopsianForelegRadii(radii, true)).toBe(radii);
    expect(valid).toEqual([.20, .25, .27, .16, .17, .10, .09]);
  });

  it('preserves an already narrow middle and a large distal-joint requirement', () => {
    for (const radii of [[.20, .25, .27, .16, .10, .09, .08], [.20, .25, .27, .16, .17, .18, .15]]) {
      const old = radii.slice(); expect(art.dinoCeratopsianForelegRadii(radii, true)).toBe(radii); expect(radii).toEqual(old);
    }
  });

  it('copies only the targeted middle station and bounds its reduction without mutating frozen evidence', () => {
    const input = Object.freeze([.20, .25, .27, .16, .17, .10, .09]), output = art.dinoCeratopsianForelegRadii(input, true);
    expect(output === input).toBe(false); expect(output).toHaveLength(7);
    for (const index of [0, 1, 2, 3, 5, 6]) expect(output[index]).toBe(input[index]);
    expect(output[4]).toBeLessThan(input[4]); expect(output[4]).toBeGreaterThanOrEqual(input[4] * .84);
    expect(output[4]).toBeLessThan(input[3]); expect(output[4]).toBeGreaterThan(input[5]);
    expect(input).toEqual([.20, .25, .27, .16, .17, .10, .09]);
  });

  for (const scale of [.5, 1, 4]) for (const breadth of [.60, .82]) {
    it('retains closed finite native skin, joint stations and planted bounds at scale ' + scale + ', breadth ' + breadth, () => {
      const built = caller(setup(scale, breadth)), baseline = caller(setup(scale, breadth), false);
      const chain = built.records.chains[0], old = baseline.records.chains[0];
      const unplanted = art.dinoSurfaceGeometry(THREE, chain.points, chain.radii, { smoothProfile: true });
      try {
        expect(chain.pointValues).toEqual(old.pointValues); expect(chain.points).toHaveLength(7);
        expect(built.records.helperCalls[0].input).toEqual(built.records.helperCalls[0].saved);
        for (const index of [0, 1, 2, 3, 5, 6]) expect(chain.radii[index]).toBe(old.radii[index]);
        expect(chain.radii[4]).toBeLessThan(old.radii[4]); expect(chain.radii[4]).toBeGreaterThanOrEqual(old.radii[4] * .84);
        const closure = topology(unplanted); expect(closure.degenerates).toBe(0); expect(closure.counts.every(count => count === 2)).toBe(true);
        expect(unplanted.attributes.position.count).toBe(1227); expect(unplanted.index.count).toBe(7056);
        for (const geometry of [unplanted, built.mesh.geometry]) {
          expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
          expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
          expect(geometry.boundingSphere.radius).toBeGreaterThan(0);
          for (let index = 0; index < geometry.attributes.position.count; index++) {
            const point = vec(0, 0, 0).fromBufferAttribute(geometry.attributes.position, index);
            expect(geometry.boundingBox.containsPoint(point)).toBe(true);
            expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + scale * 1e-6);
          }
        }
        expect(built.mesh.geometry.index.array).toEqual(baseline.mesh.geometry.index.array);
        expect(built.mesh.geometry.attributes.uv.array).toEqual(baseline.mesh.geometry.attributes.uv.array);
        expect(built.mesh.position.toArray()).toEqual(chain.pointValues[6]);
        expect(built.mesh.userData.dinoPlantedPivot).toEqual(chain.pointValues[6]);
        expect(built.mesh.geometry.boundingBox.min.y + built.mesh.position.y).toBeGreaterThanOrEqual(.006 * scale - scale * 1e-6);
        for (let ring = 0; ring <= 48; ring++) {
          const normal = unplanted.attributes.normal;
          expect(vec(0, 0, 0).fromBufferAttribute(normal, ring * 25).distanceTo(vec(0, 0, 0).fromBufferAttribute(normal, ring * 25 + 24))).toBeLessThan(1e-6);
        }
      } finally { unplanted.dispose(); dispose(built); dispose(baseline); }
    });
  }

  it('contains the native lower-arm and companion-bone vertices across representative scales, breadths and sides', () => {
    for (const scale of [.5, 1, 4]) for (const breadth of [.60, .82]) for (const side of [-1, 1]) {
      const built = caller(setup(scale, breadth, 'triceratops', true, side));
      try {
        expect(built.records.bones).toHaveLength(3);
        for (const bone of built.records.bones.slice(1)) for (const mesh of bone.meshes) {
          const positions = mesh.geometry.attributes.position;
          for (let index = 0; index < positions.count; index++) {
            const point = mesh.localToWorld(vec(0, 0, 0).fromBufferAttribute(positions, index));
            expect(inside(built.mesh, point, scale * 1e-6), 'Exposed represented lower-arm bone at scale ' + scale + ', breadth ' + breadth + ', side ' + side + ', vertex ' + index).toBe(true);
          }
        }
      } finally { dispose(built); }
    }
  });

  for (const [id, front] of [['triceratops', false], ['parasaurolophus', true], ['brachiosaurus', true]]) {
    it('keeps the actual off-gate ' + id + (front ? ' foreleg' : ' hindleg') + ' byte-identical', () => {
      const data = setup(1, .70, id, front), built = caller(data), baseline = caller(data, false);
      try {
        expect(built.records.helperCalls[0].gate).toBe(false);
        expect(built.records.helperCalls[0].result).toBe(built.records.helperCalls[0].input);
        geometryEqual(built.mesh.geometry, baseline.mesh.geometry);
        expect(built.records.chains[0].pointValues).toEqual(baseline.records.chains[0].pointValues);
      } finally { dispose(built); dispose(baseline); }
    });
  }

  it('excludes a columnar surface even when the caller has a ceratopsid clade', () => {
    const data = setup(1, .70, 'triceratops', true, 1, true), built = caller(data), baseline = caller(data, false);
    try { expect(built.records.helperCalls[0].gate).toBe(false); geometryEqual(built.mesh.geometry, baseline.mesh.geometry); }
    finally { dispose(built); dispose(baseline); }
  });

  it('keeps the terminal skin closure inside the unchanged native foot pad and retains its planar ground contact', () => {
    for (const scale of [.5, 1, 4]) for (const side of [-1, 1]) {
      const built = caller(setup(scale, .70, 'triceratops', true, side)), baseline = caller(setup(scale, .70, 'triceratops', true, side), false);
      try {
        expect(built.pad).toBeDefined(); geometryEqual(built.pad.geometry, baseline.pad.geometry);
        expect(built.pad.position.toArray()).toEqual(baseline.pad.position.toArray());
        const terminals = model => model.children.filter(mesh => ['compact-digit', 'hoof-like-terminal'].includes(mesh.userData.dinoFeature));
        const actualTerminals = terminals(built.model), oldTerminals = terminals(baseline.model);
        expect(actualTerminals.length).toBeGreaterThan(0); expect(actualTerminals.length).toBe(oldTerminals.length);
        for (let terminal = 0; terminal < actualTerminals.length; terminal++) {
          geometryEqual(actualTerminals[terminal].geometry, oldTerminals[terminal].geometry);
          expect(actualTerminals[terminal].position.toArray()).toEqual(oldTerminals[terminal].position.toArray());
          expect(actualTerminals[terminal].userData.dinoPartIds).toEqual(oldTerminals[terminal].userData.dinoPartIds);
        }
        expect(built.pad.geometry.boundingBox.min.y + built.pad.position.y).toBeGreaterThanOrEqual(.004 * scale - scale * 1e-6);
        const positions = built.mesh.geometry.attributes.position;
        for (const index of [1226, ...Array.from({ length: 8 }, (_, sideIndex) => 48 * 25 + sideIndex * 3)]) {
          const point = built.mesh.localToWorld(vec(0, 0, 0).fromBufferAttribute(positions, index));
          expect(inside(built.pad, point, scale * 1e-6), 'Skin terminal lies outside native foot cuff at scale ' + scale + ', side ' + side + ', vertex ' + index).toBe(true);
        }
        expect(built.records.contacts.map(contact => ({ ...contact, point: contact.point.toArray() }))).toEqual(baseline.records.contacts.map(contact => ({ ...contact, point: contact.point.toArray() })));
      } finally { dispose(built); dispose(baseline); }
    }
  });

  it('keeps actual bone, joint, foot, anchor, material, contour and idle-motion registration unchanged', () => {
    const built = caller(setup()), baseline = caller(setup(), false);
    try {
      expect(built.records.operations).toEqual(baseline.records.operations);
      expect(built.records.bones.map(bone => bone.args)).toEqual(baseline.records.bones.map(bone => bone.args));
      for (let index = 0; index < built.records.bones.length; index++) for (let segment = 0; segment < built.records.bones[index].meshes.length; segment++) {
        const actual = built.records.bones[index].meshes[segment], old = baseline.records.bones[index].meshes[segment];
        expect(actual.geometry.attributes.position.array).toEqual(old.geometry.attributes.position.array);
        expect(actual.position.toArray()).toEqual(old.position.toArray()); expect(actual.quaternion.toArray()).toEqual(old.quaternion.toArray());
      }
      for (const anchorRecord of built.records.anchors) {
        expect(anchorRecord.object.getWorldPosition(vec(0, 0, 0)).distanceTo(vec(...anchorRecord.rest))).toBeLessThan(1e-6);
      }
      expect(built.mesh.material).toBe(built.material); expect(built.mesh.userData.dinoRegion).toBe('foreleg-1');
      expect(built.mesh.userData.dinoPartIds).toEqual(['forelimb', 'shoulder', 'elbow', 'wrist']);
      expect(built.motion.mesh).toBe(built.mesh); expect(built.motion.front).toBe(true); expect(built.motion.side).toBe(1);
      expect(built.motion.baseRotation.toArray()).toEqual(built.mesh.rotation.toArray());
      expect(built.motion.contour.geometry).toBe(built.mesh.geometry); expect(built.motion.contour.position.toArray()).toEqual(built.mesh.position.toArray());
      expect(built.motion.contour.quaternion.toArray()).toEqual(built.mesh.quaternion.toArray());
      const pivot = built.mesh.position.clone(); built.mesh.rotation.z += .025; built.mesh.updateMatrixWorld(true);
      expect(built.mesh.localToWorld(vec(0, 0, 0)).distanceTo(pivot)).toBeLessThan(1e-6);
    } finally { dispose(built); dispose(baseline); }
  });

  it('preserves the prior beak, jaw, eye, skeleton, foot, planting and caller registration source blocks', () => {
    const protectedBlocks = [["function dinoBeakSurfaceGeometry(THREE, geometry, height, enabled) {","function dinoKeratinGeometry(THREE, direction, radius, kind, coverage) {","df7001604a41e81b29b6a21dbc62c84bb5b470763a39f39d1ade847474892179"],["function dinoJawProfile(THREE, start, end, height, depth, length) {","function dinoCranialGeometry(THREE, points, radii, shape) {","9abc2987fc403eb660829fea47b48b7229a0856d88645746952aa66569eddf49"],["function dinoEyeSurfaceFrame(THREE, normal, side, maxTurn) {","function dinoFacialStripGeometry(THREE, surface, points, options) {","7767c197ee1a81ec749a997e1cef299816750683bb324a9451ca35e6fa0ae681"],["function dinoEyeGeometry(THREE, radius) {","function dinoStudioLightProfile(mode) {","e5efe43882858dd3df3d9ef0eddad2ac8ed80d3b1de53bca31981feaf256daf3"],["var cranialFaceBefore = model.children.slice();","captureCranialMotion(cranialFaceBefore);","1b0d6fed870b8246c12a3b14b00af077b6fb3068c06b0f8722911ebf1ee8fdf6"],["var cranialBoneBefore = model.children.slice();","captureCranialMotion(cranialBoneBefore);","0a2228c8f6a6819233b962a84791108c5cb45f95ec79b98a2962a09f9fb4e8c8"],["function addBone(a, b, radius) {","function addLimbJoint(p, axis, radius, hingeScale) {","2acce2ce8743386c7bba0deafd49e56e258fdffedd55e10fa76850fe44d8aa25"],["function addDigitFan(root, front, sideSign)","function surfaceAnchor(surface, center, outward) {","51aede197a5c58819abd613f9a72ea96bab16271f61f635f82a4c8a76b4ac6bf"],["function dinoFootSurfaceProfileFor(dn, skeletal, front) {","function dinoSurfaceGeometry(THREE, points, radii, options) {","1e60582fc4cd49d0970b00a223d14dbd00d5a269681a0a1e907df02b75c4110a"]];
    for (const [start, end, digest] of protectedBlocks) expect(sha(block(source, start, end))).toBe(digest);
    expect(sha(legCode.slice(0, legCode.indexOf('var upperLimbShell =')))).toBe('0817f718c622092e193107bcda30d9e4d0377383f9b74797682c035d9cdeb0b1');
    // The later sauropod shading pass adds one registration field. Remove only
    // that exact addition, then retain the original planting/anchor/motion guard.
    const registration = legCode.slice(legCode.indexOf('upperLimbShell.userData.dinoRegion'));
    const forelimbField = '                  forelimbBlendWidth: front && isSauropod ? Math.min(thighRadius, surfaceBodyDepth) * 0.30 : 0,\n';
    expect(registration.split(forelimbField)).toHaveLength(2);
    expect(sha(registration.replace(forelimbField, ''))).toBe('3d83ad5ad1860848b6856f382b3bd0136d427fc13e742de14323a52ae703cd2c');
  });
});
