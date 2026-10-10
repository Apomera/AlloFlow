'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const work = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const candidateFile = path.join(work, 'candidate.js'), beforeFile = path.join(work, 'before.js');
const vendorFile = path.join(repo, 'vendor/three-r128/three.min.js');
const outputFile = path.join(work, 'geometry-result.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = fs.readFileSync(beforeFile, 'utf8'), candidate = fs.readFileSync(candidateFile, 'utf8');
const beforeSHA256 = sha(before), candidateSHA256 = sha(candidate);
assert.equal(beforeSHA256, '147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891');
assert.equal(candidateSHA256, 'dfe3e01f38a419187e468c749cc37827f486a47401b9916afaa9ec6f98a3f86a');
const inputs = Object.fromEntries([__filename, beforeFile, candidateFile, vendorFile].map(file => [file, sha(fs.readFileSync(file))]));
const THREE = {};
new Function('exports', 'module', fs.readFileSync(vendorFile, 'utf8'))(THREE, { exports: THREE });
let assertions = 0;
function check(value, message) { assertions++; assert.ok(value, message); }
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message); }
global.window = {};
function capture(source) {
  let config;
  window.StemLab = { isRegistered: () => false, registerTool() {}, makeBayViewer(value) { config = value; return {}; } };
  new Function(source)();
  check(!!config && typeof config.buildScene === 'function', 'scene builder captured');
  return config;
}
const beforeConfig = capture(before), candidateConfig = capture(candidate);
const describe = config => JSON.stringify(config, (key, value) => key === 'buildScene' ? '[buildScene]' : typeof value === 'function' ? String(value) : value);
equal(describe(candidateConfig), describe(beforeConfig), 'viewer configuration preserved');
function build(config, age, phase, contrast) {
  const scene = new THREE.Scene(), props = { age, tab: 'recovery', childHands: 'two', recPose: phase, guides: false };
  const content = config.buildScene(THREE, {
    scene, phase, dark: true, contrast, wantShadow: false, sceneProps: props,
    trim: (color, shininess) => new THREE.MeshPhongMaterial({ color, shininess: shininess ?? 30, specular: 0x6b7688 }),
  });
  content.frame(0, { ...props, depthLab: { age } }, true);
  scene.updateMatrixWorld(true);
  return { scene, content };
}
function find(model, name) {
  const found = model.scene.getObjectByName(name);
  check(!!found, 'required scene object ' + name);
  return found;
}
const rightPalms = new Set(['fr-patient-right-palm', 'fr-rescuer-upper-palm']);
const rightCreases = new Set(['fr-patient-right-palm-crease', 'fr-patient-right-thumb-crease']);
function mayChange(name, attribute) {
  return (rightPalms.has(name) && ['index', 'normal'].includes(attribute)) ||
    (name === 'fr-patient-right-wrist' && attribute === 'normal') ||
    (rightCreases.has(name) && ['position', 'normal', 'pathPoints'].includes(attribute));
}
function parameterData(mesh) {
  const parameters = mesh.geometry.parameters;
  if (!rightCreases.has(mesh.name)) return parameters;
  const curve = parameters.path;
  return { ...parameters, path: { ...curve, points: { count: curve.points.length, types: curve.points.map(point => point.constructor.name) } } };
}
function bytes(attribute) { return Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength); }
function descriptor(attribute) {
  return [attribute.itemSize, attribute.normalized, attribute.count, attribute.array.constructor.name, attribute.usage, attribute.updateRange];
}
function preservedBoundingBox(mesh) {
  const cached = mesh.geometry.boundingBox;
  if (!rightCreases.has(mesh.name) || !cached) return cached;
  const computed = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
  equal(cached.min.toArray(), computed.min.toArray(), 'crease cached boundingBox minimum matches actual positions ' + mesh.name);
  equal(cached.max.toArray(), computed.max.toArray(), 'crease cached boundingBox maximum matches actual positions ' + mesh.name);
  return { computedFromScopedCreasePositions: true };
}
function preservation(model) {
  const digest = crypto.createHash('sha256'), geometries = new Set(), materials = new Set();
  let nodes = 0, meshes = 0;
  const json = value => digest.update(JSON.stringify(value, (key, item) => key === 'uuid' ? undefined : typeof item === 'function' ? String(item) : item));
  function visit(object, location) {
    nodes++; if (object.isMesh) meshes++;
    json([location, object.type, object.name, object.position.toArray(), object.quaternion.toArray(), object.rotation.toArray(), object.scale.toArray(),
      object.matrix.toArray(), object.matrixWorld.toArray(), object.visible, object.castShadow, object.receiveShadow, object.frustumCulled,
      object.renderOrder, object.layers.mask, object.matrixAutoUpdate, object.userData, object.animations]);
    if (object.geometry) {
      const geometry = object.geometry; geometries.add(geometry);
      json([geometry.type, parameterData(object), geometry.drawRange, geometry.groups, geometry.userData, preservedBoundingBox(object), geometry.boundingSphere]);
      json(Object.keys(geometry.attributes).sort());
      for (const attribute of Object.keys(geometry.attributes).sort()) {
        json([attribute, descriptor(geometry.attributes[attribute])]);
        if (!mayChange(object.name, attribute)) digest.update(bytes(geometry.attributes[attribute]));
      }
      if (geometry.index) {
        json(['index', descriptor(geometry.index)]);
        if (!mayChange(object.name, 'index')) digest.update(bytes(geometry.index));
      } else json(['index', null]);
      json(geometry.morphAttributes); json(geometry.morphTargetsRelative);
    }
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      json(['materialSlots', list.length]);
      for (const material of list) {
        materials.add(material); json(material.toJSON());
        json(String(material.onBeforeCompile)); json(String(material.customProgramCacheKey));
      }
    }
    object.children.forEach((child, index) => visit(child, location + '.' + index));
  }
  visit(model.scene, 'scene');
  json({ landmarks: model.content.landmarks, meshKeys: Object.keys(model.content.meshes).sort(), picks: model.content.picks.map(object => object.name), anchor: model.content.anchor.name });
  return { SHA256: digest.digest('hex'), nodes, meshes, geometries: geometries.size, materials: materials.size };
}
function changedAttributes(prior, current) {
  const changes = [];
  function visit(a, b, location) {
    equal(a.name, b.name, 'scene order and names preserved ' + location);
    equal(a.children.length, b.children.length, 'scene children preserved ' + location);
    if (a.geometry) {
      for (const attribute of [...Object.keys(a.geometry.attributes), 'index']) {
        const left = attribute === 'index' ? a.geometry.index : a.geometry.attributes[attribute];
        const right = attribute === 'index' ? b.geometry.index : b.geometry.attributes[attribute];
        if (!left) continue;
        if (!bytes(left).equals(bytes(right))) {
          check(mayChange(a.name, attribute), 'unexpected changed buffer ' + a.name + '.' + attribute);
          changes.push(a.name + '.' + attribute);
        }
      }
      if (rightCreases.has(a.name)) {
        const left = a.geometry.parameters.path.points.map(point => point.toArray());
        const right = b.geometry.parameters.path.points.map(point => point.toArray());
        if (JSON.stringify(left) !== JSON.stringify(right)) changes.push(a.name + '.pathPoints');
      }
    }
    a.children.forEach((child, index) => visit(child, b.children[index], location + '.' + index));
  }
  visit(prior.scene, current.scene, 'scene');
  check(changes.includes('fr-patient-right-palm.index'), 'right patient palm topology actually changes');
  check(changes.includes('fr-patient-right-palm-crease.position'), 'right palm crease geometry actually changes');
  return changes.sort();
}
function parentPositions(mesh) {
  return Array.from({ length: mesh.geometry.attributes.position.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrix));
}
function vertexKey(point) { return point.toArray().map(value => Math.round(value * 1e7)).join(','); }
function orientedTriangleKey(keys) {
  return [keys.join('|'), [keys[1], keys[2], keys[0]].join('|'), [keys[2], keys[0], keys[1]].join('|')].sort()[0];
}
function triangleKeys(mesh, mirror) {
  const points = parentPositions(mesh), indices = mesh.geometry.index.array, keys = [];
  if (mirror) points.forEach(point => { point.x *= -1; });
  for (let index = 0; index < indices.length; index += 3) {
    const corners = [indices[index], indices[index + 1], indices[index + 2]];
    if (mirror) [corners[1], corners[2]] = [corners[2], corners[1]];
    keys.push(orientedTriangleKey(corners.map(corner => vertexKey(points[corner]))));
  }
  return keys.sort();
}
function normalHealth(mesh) {
  const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal, indices = mesh.geometry.index.array;
  let minNormalLength = Infinity, maxNormalLength = 0, minFaceNormalAgreement = Infinity, outwardFaces = 0;
  const point = index => new THREE.Vector3().fromBufferAttribute(positions, index);
  for (let index = 0; index < normals.count; index++) {
    const normal = new THREE.Vector3().fromBufferAttribute(normals, index);
    check(normal.toArray().every(Number.isFinite), 'finite normal ' + mesh.name);
    check(point(index).toArray().every(Number.isFinite), 'finite position ' + mesh.name);
    const length = normal.length(); minNormalLength = Math.min(minNormalLength, length); maxNormalLength = Math.max(maxNormalLength, length);
    check(Math.abs(length - 1) < 1e-6, 'unit normal ' + mesh.name);
  }
  for (let index = 0; index < indices.length; index += 3) {
    const ids = [indices[index], indices[index + 1], indices[index + 2]], corners = ids.map(point);
    const face = corners[1].clone().sub(corners[0]).cross(corners[2].clone().sub(corners[0]));
    if (face.lengthSq() < 1e-22) continue;
    const center = corners[0].clone().add(corners[1]).add(corners[2]).multiplyScalar(1 / 3);
    check(face.dot(center) > 0, 'outward palm triangle winding ' + mesh.name);
    const normal = new THREE.Vector3();
    ids.forEach(id => normal.add(new THREE.Vector3().fromBufferAttribute(normals, id)));
    const agreement = face.normalize().dot(normal.normalize());
    check(agreement > 0, 'outward palm shader normals ' + mesh.name);
    minFaceNormalAgreement = Math.min(minFaceNormalAgreement, agreement); outwardFaces++;
  }
  check(outwardFaces > 2000, 'complete palm triangle surface checked');
  return { minNormalLength, maxNormalLength, minFaceNormalAgreement, outwardFaces };
}
function palmMirrorNormalStats(left, right, pair) {
  const positions = parentPositions(right), normalMatrix = new THREE.Matrix3().getNormalMatrix(right.matrix);
  const actualNormals = new Map();
  positions.forEach((point, index) => actualNormals.set(vertexKey(point), new THREE.Vector3().fromBufferAttribute(right.geometry.attributes.normal, index).applyMatrix3(normalMatrix).normalize()));
  const leftMatrix = new THREE.Matrix3().getNormalMatrix(left.matrix);
  let maximumChordError = 0, maximumAngleDegrees = 0, sumAngleDegrees = 0, vertices = 0;
  parentPositions(left).forEach((point, index) => {
    point.x *= -1;
    const reflected = new THREE.Vector3().fromBufferAttribute(left.geometry.attributes.normal, index).applyMatrix3(leftMatrix).normalize(); reflected.x *= -1;
    const actualNormal = actualNormals.get(vertexKey(point)); check(!!actualNormal, 'corresponding mirrored palm vertex ' + pair);
    const error = reflected.distanceTo(actualNormal), angle = 2 * Math.asin(Math.min(1, error / 2)) * 180 / Math.PI;
    check(Number.isFinite(angle), 'finite mirrored palm normal angle ' + pair);
    maximumChordError = Math.max(maximumChordError, error); maximumAngleDegrees = Math.max(maximumAngleDegrees, angle); sumAngleDegrees += angle; vertices++;
  });
  return { vertices, maximumChordError, maximumAngleDegrees, meanAngleDegrees: sumAngleDegrees / vertices };
}
function mirrorPalmPair(model, pair, leftName, rightName, prior) {
  const left = find(model, leftName), right = find(model, rightName);
  const expected = triangleKeys(left, true), actual = triangleKeys(right, false);
  equal(actual.length, expected.length, 'mirrored palm triangle count ' + pair);
  equal(sha(JSON.stringify(actual)), sha(JSON.stringify(expected)), 'mirrored anatomical palm triangles ' + pair);
  const normalMirror = palmMirrorNormalStats(left, right, pair);
  const baselineNormalMirror = palmMirrorNormalStats(find(prior, leftName), find(prior, rightName), pair + ' baseline');
  check(normalMirror.maximumAngleDegrees <= .2, 'mirrored palm shader normals stay within 0.2 degrees ' + pair);
  check(normalMirror.maximumAngleDegrees < baselineNormalMirror.maximumAngleDegrees * .5, 'maximum palm shader normal mirror error improves by more than 50 percent ' + pair);
  check(normalMirror.meanAngleDegrees < baselineNormalMirror.meanAngleDegrees * .05, 'mean palm shader normal mirror error improves by more than 95 percent ' + pair);
  const health = [normalHealth(left), normalHealth(right)];
  return { pair, triangles: actual.length, vertices: normalMirror.vertices, mirrorTriangleSHA256: sha(JSON.stringify(actual)), maxNormalMirrorError: normalMirror.maximumChordError, baselineNormalMirror, normalMirror,
    minNormalLength: Math.min(...health.map(value => value.minNormalLength)), maxNormalLength: Math.max(...health.map(value => value.maxNormalLength)),
    minFaceNormalAgreement: Math.min(...health.map(value => value.minFaceNormalAgreement)), outwardFaces: health.map(value => value.outwardFaces) };
}
function skinProbe(palm, point, label) {
  const surface = new THREE.Mesh(palm.geometry, palm.material);
  surface.position.copy(palm.position); surface.quaternion.copy(palm.quaternion); surface.scale.copy(palm.scale); surface.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(new THREE.Vector3(point.x, .15, point.z), new THREE.Vector3(0, -1, 0)).intersectObject(surface, false);
  check(hits.length > 0, 'actual palm skin meets crease sample ' + label);
  const gap = point.y - hits[0].point.y;
  check(gap >= -.001 && gap <= .004, 'crease stays fitted to actual rendered skin ' + label);
  return gap;
}
function creaseSamples(mesh) {
  const positions = parentPositions(mesh), indices = mesh.geometry.index.array, points = positions.map(point => point.clone());
  // Test every ribbon vertex, all edge midpoints, and each actual rendered triangle centroid.
  for (let index = 0; index < indices.length; index += 3) {
    const [a, b, c] = [positions[indices[index]], positions[indices[index + 1]], positions[indices[index + 2]]];
    points.push(a.clone().add(b).multiplyScalar(.5), b.clone().add(c).multiplyScalar(.5), c.clone().add(a).multiplyScalar(.5), a.clone().add(b).add(c).multiplyScalar(1 / 3));
  }
  return points;
}
function patientCreases(model) {
  const records = [];
  for (const kind of ['palm', 'thumb']) {
    const left = find(model, 'fr-patient-left-' + kind + '-crease'), right = find(model, 'fr-patient-right-' + kind + '-crease');
    const expected = left.geometry.parameters.path.getPoints(128), actual = right.geometry.parameters.path.getPoints(128);
    let maximumMirrorError = 0;
    equal(expected.length, 129, '129 crease path samples'); equal(actual.length, expected.length, 'same mirrored path sample count');
    for (let index = 0; index < expected.length; index++) {
      const reflected = expected[index].clone().applyMatrix4(left.matrix); reflected.x *= -1;
      const error = reflected.distanceTo(actual[index].clone().applyMatrix4(right.matrix)); maximumMirrorError = Math.max(maximumMirrorError, error);
      check(error < 1e-7, 'mirrored crease path within 1e-7 ' + kind);
    }
    for (const side of ['left', 'right']) {
      const mesh = side === 'left' ? left : right, palm = find(model, 'fr-patient-' + side + '-palm');
      const pathPoints = mesh.geometry.parameters.path.getPoints(128).map(point => point.applyMatrix4(mesh.matrix));
      const ribbonPoints = creaseSamples(mesh);
      let minSkinGap = Infinity, maxSkinGap = -Infinity;
      for (const point of [...pathPoints, ...ribbonPoints]) {
        const gap = skinProbe(palm, point, mesh.name); minSkinGap = Math.min(minSkinGap, gap); maxSkinGap = Math.max(maxSkinGap, gap);
      }
      const normals = mesh.geometry.attributes.normal;
      for (let index = 0; index < normals.count; index++) {
        const normal = new THREE.Vector3().fromBufferAttribute(normals, index);
        check(normal.toArray().every(Number.isFinite) && Math.abs(normal.length() - 1) < 1e-6, 'finite unit crease shader normals ' + mesh.name);
        check(normal.y > 0, 'crease shading faces outward ' + mesh.name);
      }
      records.push({ side, kind, pathSamples: pathPoints.length, ribbonSamples: ribbonPoints.length, maximumMirrorError, minSkinGap, maxSkinGap });
    }
  }
  return records;
}
function wristNormals(model, prior) {
  const wrist = find(model, 'fr-patient-right-wrist'), old = find(prior, wrist.name);
  const positions = wrist.geometry.attributes.position, normals = wrist.geometry.attributes.normal, oldNormals = old.geometry.attributes.normal, indices = wrist.geometry.index.array;
  const matrix = new THREE.Matrix3().getNormalMatrix(wrist.matrix);
  let newReversedFaces = 0, minimumOldAgreement = 1, minimumNewAgreement = 1, maximumExistingFoldChange = 0;
  for (let index = 0; index < normals.count; index++) {
    const normal = new THREE.Vector3().fromBufferAttribute(normals, index);
    check(normal.toArray().every(Number.isFinite) && Math.abs(normal.length() - 1) < 1e-6, 'finite unit right wrist normals');
  }
  for (let index = 0; index < indices.length; index += 3) {
    const ids = [indices[index], indices[index + 1], indices[index + 2]], points = ids.map(id => new THREE.Vector3().fromBufferAttribute(positions, id).applyMatrix4(wrist.matrix));
    const face = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    if (face.lengthSq() < 1e-22) continue;
    face.normalize(); const normal = new THREE.Vector3(), original = new THREE.Vector3();
    for (const id of ids) {
      normal.add(new THREE.Vector3().fromBufferAttribute(normals, id).applyMatrix3(matrix).normalize());
      original.add(new THREE.Vector3().fromBufferAttribute(oldNormals, id).applyMatrix3(matrix).normalize());
    }
    const agreement = face.dot(normal.normalize()), oldAgreement = face.dot(original.normalize());
    minimumOldAgreement = Math.min(minimumOldAgreement, oldAgreement); minimumNewAgreement = Math.min(minimumNewAgreement, agreement);
    if (oldAgreement > 0) { if (agreement <= 0) newReversedFaces++; check(agreement > 0, 'no newly reversed right wrist shading'); }
    else { maximumExistingFoldChange = Math.max(maximumExistingFoldChange, Math.abs(agreement - oldAgreement)); check(agreement >= oldAgreement - 1e-7, 'existing wrist fold shading preserved'); }
  }
  return { newReversedFaces, minimumOldAgreement, minimumNewAgreement, maximumExistingFoldChange };
}
function dispose(model) {
  const geometries = new Set(), materials = new Set();
  model.scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material); });
  let events = 0;
  for (const resource of [...geometries, ...materials]) { resource.addEventListener('dispose', () => { events++; }); resource.dispose(); }
  equal(events, geometries.size + materials.size, 'all geometry and material resources disposed');
  return { geometries: geometries.size, materials: materials.size, disposed: true };
}
const results = [], negative = [];
for (const age of ['adult', 'child', 'infant']) for (const phase of [0, 2, 5, 8]) for (const contrast of [false, true]) {
  let prior, current; const result = { age, phase, contrast };
  try {
    prior = build(beforeConfig, age, phase, contrast); current = build(candidateConfig, age, phase, contrast);
    const original = preservation(prior), preserved = preservation(current);
    equal(preserved, original, 'scene exact outside explicitly scoped palm/crease/wrist attributes');
    result.sceneParity = { ...preserved, allowedChanges: changedAttributes(prior, current) };
    result.palms = [mirrorPalmPair(current, 'patient', 'fr-patient-left-palm', 'fr-patient-right-palm', prior)];
    if (age !== 'infant') result.palms.push(mirrorPalmPair(current, 'rescuer', 'fr-rescuer-lower-palm', 'fr-rescuer-upper-palm', prior));
    else check(!current.scene.getObjectByName('fr-rescuer-upper-palm'), 'infant has no extra upper rescuer hand');
    result.creases = patientCreases(current);
    result.wrist = wristNormals(current, prior);
    const beforeResources = dispose(prior); prior = null;
    result.resources = dispose(current); current = null;
    equal(result.resources, beforeResources, 'baseline and candidate resource counts preserved');
    result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = error.stack; }
  finally { if (prior) dispose(prior); if (current) dispose(current); }
  results.push(result);
  console.log(JSON.stringify({ age, phase, contrast, status: result.status, error: result.error, maximumCreaseMirrorError: result.creases ? Math.max(...result.creases.map(value => value.maximumMirrorError)) : undefined }));
  if (result.status !== 'passed') break;
}
if (process.argv.includes('--selftest') && results.length === 24 && results.every(result => result.status === 'passed')) {
  const delta = JSON.parse(fs.readFileSync(path.join(work, 'delta.json'), 'utf8'));
  equal(delta.edits.length, 1, 'single diagonal edit for mutation');
  const edit = delta.edits[0]; equal(candidate.split(edit.new).length, 2, 'unique diagonal source mutation marker');
  const scratch = path.join(work, 'palm-symmetry-selftest-source.js'), saved = Buffer.from(candidate);
  fs.writeFileSync(scratch, saved); equal(sha(fs.readFileSync(scratch)), candidateSHA256, 'selftest source saved and reread');
  let model, rejected = false, semanticError = '';
  try {
    fs.writeFileSync(scratch, candidate.replace(edit.new, edit.old));
    const mutated = fs.readFileSync(scratch, 'utf8'); check(sha(mutated) !== candidateSHA256, 'mutation source differs');
    model = build(capture(mutated), 'adult', 8, false);
    try { mirrorPalmPair(model, 'patient', 'fr-patient-left-palm', 'fr-patient-right-palm'); }
    catch (error) { semanticError = error.message; rejected = /mirrored anatomical palm triangles patient/.test(semanticError); }
    check(rejected, 'missing diagonal mutation rejected by actual surface symmetry');
  } finally { if (model) dispose(model); fs.writeFileSync(scratch, saved); equal(fs.readFileSync(scratch), saved, 'selftest source restored and reread byte for byte'); }
  negative.push({ type: 'omit-palm-diagonal-mirror', rejected, semanticError, restoredAndReread: true, restoredSHA256: sha(fs.readFileSync(scratch)) });
}
for (const [file, pin] of Object.entries(inputs)) equal(sha(fs.readFileSync(file)), pin, 'input preserved ' + file);
const report = { passed: results.length === 24 && results.every(result => result.status === 'passed'), beforeSHA256, candidateSHA256, checkerSHA256: inputs[__filename], inputs, assertions,
  cases: results.length, results, negative, selftestRequested: process.argv.includes('--selftest'),
  scope: 'Only right patient and upper rescuer palm indices/normals, right patient wrist normals, and right patient primary/thumb crease positions/normals/path control points and their cached boundingBoxes may differ; each present crease boundingBox must exactly match its actual position buffer. All other scene bytes, transforms, parameters, materials, metadata, counts and viewer configuration are preserved.',
  tolerances: { palmPositionQuantization: 1e-7, palmNormalMirrorMaximumDegrees: .2, palmNormalMirrorMaximumBaselineRatio: .5, palmNormalMirrorMeanBaselineRatio: .05, creaseMirrorError: 1e-7, skinGapMinimum: -.001, skinGapMaximum: .004 },
  limitation: 'CPU raw-module scenes with bundled THREE r128. Skin fit covers every crease vertex plus each ribbon edge midpoint and triangle centroid and 129 center-path samples; it is not a proof over every continuous point. Shader normals retain small seam averaging differences: angular maximum and mean must improve substantially; this does not assert exact normal mirroring or pointwise improvement. Browser, full application loader and full build are separate checks.' };
if (process.argv.includes('--selftest')) report.passed = report.passed && negative.length === 1 && negative[0].rejected && negative[0].restoredAndReread;
fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, cases: report.cases, assertions, negative: negative.map(value => ({ type: value.type, rejected: value.rejected, restoredAndReread: value.restoredAndReread })) }));
if (!report.passed) process.exitCode = 1;
