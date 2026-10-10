'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const work = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const beforeFile = path.join(work, 'before.js'), candidateFile = path.join(work, 'candidate.js');
const vendorFile = path.join(repo, 'vendor/three-r128/three.min.js'), deltaFile = path.join(work, 'delta.json');
const outputFile = path.join(work, 'geometry-result.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = fs.readFileSync(beforeFile, 'utf8'), candidate = fs.readFileSync(candidateFile, 'utf8');
const beforeSHA256 = sha(before), candidateSHA256 = sha(candidate);
assert.equal(beforeSHA256, 'dfe3e01f38a419187e468c749cc37827f486a47401b9916afaa9ec6f98a3f86a');
assert.equal(candidateSHA256, '77394bfee2544c33c3274293a13e9666912c26f657117ac98d15416f220f060e');
const inputs = Object.fromEntries([__filename, beforeFile, candidateFile, vendorFile, deltaFile].map(file => [file, sha(fs.readFileSync(file))]));
const THREE = {};
new Function('exports', 'module', fs.readFileSync(vendorFile, 'utf8'))(THREE, { exports: THREE });
let assertions = 0;
function check(value, message) { assertions++; assert.ok(value, message); }
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message); }
const fingerNames = new Set(['left', 'right'].flatMap(side => Array.from({ length: 4 }, (_, digit) => 'fr-patient-' + side + '-finger-' + digit + '-surface')));
const tolerances = { unitNormal: 1e-6, distalStartT: .36, rootProbeMaximumT: .34, rootProbeMaximumGap: .006,
  rootProbeMinimumBaselineAlignment: .25, minimumProbesPerFinger: 5, rootMeanMaximumBaselineRatio: .8,
  rootMeanMinimumImprovementDegrees: 5, normalMirrorMaximumAddedDegrees: .5, mirrorPositionQuantization: 1e-7 };
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
  const content = config.buildScene(THREE, { scene, phase, dark: true, contrast, wantShadow: false, sceneProps: props,
    trim: (color, shininess) => new THREE.MeshPhongMaterial({ color, shininess: shininess ?? 30, specular: 0x6b7688 }) });
  content.frame(0, { ...props, depthLab: { age } }, true);
  scene.updateMatrixWorld(true);
  return { scene, content };
}
function find(model, name) {
  const found = model.scene.getObjectByName(name);
  check(!!found, 'required scene object ' + name);
  return found;
}
function mayChange(name, attribute) { return fingerNames.has(name) && attribute === 'normal'; }
function bytes(attribute) { return Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength); }
function descriptor(attribute) { return [attribute.itemSize, attribute.normalized, attribute.count, attribute.array.constructor.name, attribute.usage, attribute.updateRange]; }
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
      json([geometry.type, geometry.parameters, geometry.drawRange, geometry.groups, geometry.userData, geometry.boundingBox, geometry.boundingSphere]);
      json(Object.keys(geometry.attributes).sort());
      for (const attribute of Object.keys(geometry.attributes).sort()) {
        json([attribute, descriptor(geometry.attributes[attribute])]);
        if (!mayChange(object.name, attribute)) digest.update(bytes(geometry.attributes[attribute]));
      }
      if (geometry.index) { json(['index', descriptor(geometry.index)]); digest.update(bytes(geometry.index)); }
      else json(['index', null]);
      json(geometry.morphAttributes); json(geometry.morphTargetsRelative);
    }
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      json(['materialSlots', list.length]);
      for (const material of list) { materials.add(material); json(material.toJSON()); json(String(material.onBeforeCompile)); json(String(material.customProgramCacheKey)); }
    }
    object.children.forEach((child, index) => visit(child, location + '.' + index));
  }
  visit(model.scene, 'scene');
  json({ contentKeys: Object.keys(model.content).sort(), landmarks: model.content.landmarks, meshKeys: Object.keys(model.content.meshes).sort(),
    picks: model.content.picks.map(object => object.name), anchor: model.content.anchor.name, frame: String(model.content.frame) });
  return { SHA256: digest.digest('hex'), nodes, meshes, geometries: geometries.size, materials: materials.size };
}
function changedAttributes(prior, current) {
  const changes = [];
  function visit(a, b, location) {
    equal(a.name, b.name, 'scene order and names preserved ' + location);
    equal(a.children.length, b.children.length, 'scene children preserved ' + location);
    if (a.geometry) for (const attribute of [...Object.keys(a.geometry.attributes), 'index']) {
      const left = attribute === 'index' ? a.geometry.index : a.geometry.attributes[attribute];
      const right = attribute === 'index' ? b.geometry.index : b.geometry.attributes[attribute];
      if (!left) continue;
      if (!bytes(left).equals(bytes(right))) { check(mayChange(a.name, attribute), 'unexpected changed buffer ' + a.name + '.' + attribute); changes.push(a.name + '.' + attribute); }
    }
    a.children.forEach((child, index) => visit(child, b.children[index], location + '.' + index));
  }
  visit(prior.scene, current.scene, 'scene');
  equal(changes.sort(), [...fingerNames].map(name => name + '.normal').sort(), 'exactly the eight authorized patient finger normal buffers change');
  return changes;
}
function relativeSurface(mesh, reference) {
  const matrix = new THREE.Matrix4().copy(reference.matrixWorld).invert().multiply(mesh.matrixWorld);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix), positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
  return { points: Array.from({ length: positions.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(matrix)),
    normals: Array.from({ length: normals.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(normals, index).applyMatrix3(normalMatrix).normalize()) };
}
function palmTriangles(palm, hand) {
  const surface = relativeSurface(palm, hand), index = palm.geometry.index.array, triangles = [];
  const bounds = new THREE.Box3().setFromPoints(surface.points), centerY = palm.getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(hand.matrixWorld).invert()).y;
  for (let offset = 0; offset < index.length; offset += 3) {
    const ids = [index[offset], index[offset + 1], index[offset + 2]], points = ids.map(id => surface.points[id]);
    const face = new THREE.Vector3().subVectors(points[1], points[0]).cross(new THREE.Vector3().subVectors(points[2], points[0]));
    if (face.lengthSq() < 1e-22) continue;
    triangles.push({ face: offset / 3, points, normals: ids.map(id => surface.normals[id]) });
  }
  return { triangles, minY: bounds.min.y, maxY: bounds.max.y, centerY };
}
function palmHit(point, surface) {
  // Use 3D ray/triangle intersections, rather than the fitter's projection grid.
  // Cast from both sides and retain every actual hit before choosing the nearest
  // hit on the same half of the palm as the finger vertex.
  const rays = [new THREE.Ray(new THREE.Vector3(point.x, surface.maxY + .1, point.z), new THREE.Vector3(0, -1, 0)),
    new THREE.Ray(new THREE.Vector3(point.x, surface.minY - .1, point.z), new THREE.Vector3(0, 1, 0))];
  const sign = point.y >= surface.centerY ? 1 : -1, hits = [], target = new THREE.Vector3(), bary = new THREE.Vector3();
  const rayHits = [0, 0];
  for (let side = 0; side < rays.length; side++) for (const triangle of surface.triangles) {
    const [a, b, c] = triangle.points;
    if (!rays[side].intersectTriangle(a, b, c, false, target)) continue;
    rayHits[side]++;
    if (sign * (target.y - surface.centerY) < -1e-9) continue;
    THREE.Triangle.getBarycoord(target, a, b, c, bary);
    const normal = triangle.normals[0].clone().multiplyScalar(bary.x).addScaledVector(triangle.normals[1], bary.y).addScaledVector(triangle.normals[2], bary.z).normalize();
    hits.push({ face: triangle.face, gap: target.distanceTo(point), signedGap: (point.y - target.y) * sign, normal, raySide: side });
  }
  hits.sort((a, b) => a.gap - b.gap || a.face - b.face || a.raySide - b.raySide);
  return hits.length ? { ...hits[0], rayHits } : null;
}
function tripleBytes(attribute, index) {
  const size = attribute.array.BYTES_PER_ELEMENT;
  return Buffer.from(attribute.array.buffer, attribute.array.byteOffset + index * attribute.itemSize * size, attribute.itemSize * size);
}
function angle(a, b) { return a.angleTo(b) * 180 / Math.PI; }
function verifyFinger(prior, current, hand, palm) {
  const name = current.name, positions = current.geometry.attributes.position, oldNormals = prior.geometry.attributes.normal, normals = current.geometry.attributes.normal, index = current.geometry.index.array;
  const protectedVertices = new Set(), reversedFaces = new Set();
  let newReversedFaces = 0, minimumBaselineFaceAgreement = 1, minimumCandidateFaceAgreement = 1;
  for (let offset = 0; offset < index.length; offset += 3) {
    const ids = [index[offset], index[offset + 1], index[offset + 2]], points = ids.map(id => new THREE.Vector3().fromBufferAttribute(positions, id));
    const face = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    if (face.lengthSq() < 1e-20) continue;
    const original = new THREE.Vector3(), actual = new THREE.Vector3();
    ids.forEach(id => { original.add(new THREE.Vector3().fromBufferAttribute(oldNormals, id)); actual.add(new THREE.Vector3().fromBufferAttribute(normals, id)); });
    const baselineAgreement = face.clone().normalize().dot(original.normalize()), candidateAgreement = face.normalize().dot(actual.normalize());
    minimumBaselineFaceAgreement = Math.min(minimumBaselineFaceAgreement, baselineAgreement);
    minimumCandidateFaceAgreement = Math.min(minimumCandidateFaceAgreement, candidateAgreement);
    if (baselineAgreement <= 0) { reversedFaces.add(offset / 3); ids.forEach(id => protectedVertices.add(id)); }
    else if (candidateAgreement <= 0) newReversedFaces++;
  }
  equal(newReversedFaces, 0, 'no newly reversed face shading ' + name);
  for (const id of protectedVertices) equal(tripleBytes(normals, id), tripleBytes(oldNormals, id), 'original reversed face vertex normal preserved ' + name + ':' + id);
  const ringSize = 16, ringCount = (positions.count - 2) / ringSize;
  check(Number.isInteger(ringCount) && ringCount > 32, 'actual digit rings and two cap centers ' + name);
  let changedVertices = 0, distalVertices = 0, maximumChangedT = -1;
  for (let id = 0; id < normals.count; id++) {
    const normal = new THREE.Vector3().fromBufferAttribute(normals, id);
    check(normal.toArray().every(Number.isFinite), 'finite finger normals ' + name);
    check(Math.abs(normal.length() - 1) < tolerances.unitNormal, 'unit finger normal ' + name);
    const t = id < ringCount * ringSize ? Math.floor(id / ringSize) / ringCount : 1;
    const changed = !tripleBytes(normals, id).equals(tripleBytes(oldNormals, id));
    if (t >= tolerances.distalStartT) { equal(tripleBytes(normals, id), tripleBytes(oldNormals, id), 'distal finger normal unchanged ' + name + ':' + id); distalVertices++; }
    if (changed) { changedVertices++; maximumChangedT = Math.max(maximumChangedT, t); check(t < tolerances.distalStartT, 'changed normal stays proximal ' + name); }
  }
  for (const id of [positions.count - 2, positions.count - 1]) equal(tripleBytes(normals, id), tripleBytes(oldNormals, id), 'cap center normal unchanged ' + name);
  const baselineSurface = relativeSurface(prior, hand), actualSurface = relativeSurface(current, hand);
  // Probe selection depends only on unchanged geometry and baseline normals.
  // Every proximal ring vertex with a nearby, plausibly aligned palm surface
  // contributes, whether or not the candidate chooses to change it.
  let count = 0, baselineSum = 0, candidateSum = 0, baselineMaximumDegrees = 0, candidateMaximumDegrees = 0, maximumGap = 0, upper = 0, lower = 0, worsenedProbes = 0;
  const selected = [], probeSurface = palmTriangles(palm, hand);
  for (let id = 0; id < ringCount * ringSize; id++) {
    const t = Math.floor(id / ringSize) / ringCount;
    if (t > tolerances.rootProbeMaximumT) break;
    if (protectedVertices.has(id)) continue;
    const point = actualSurface.points[id], hit = palmHit(point, probeSurface);
    if (!hit || hit.gap > tolerances.rootProbeMaximumGap || baselineSurface.normals[id].dot(hit.normal) < tolerances.rootProbeMinimumBaselineAlignment) continue;
    check(hit.rayHits.every(value => value > 0), 'independent ray meets actual palm triangles from both hemispheres ' + name);
    const oldAngle = angle(baselineSurface.normals[id], hit.normal), newAngle = angle(actualSurface.normals[id], hit.normal);
    check(Number.isFinite(oldAngle) && Number.isFinite(newAngle), 'finite root overlap probe angles ' + name);
    count++; baselineSum += oldAngle; candidateSum += newAngle;
    baselineMaximumDegrees = Math.max(baselineMaximumDegrees, oldAngle); candidateMaximumDegrees = Math.max(candidateMaximumDegrees, newAngle);
    maximumGap = Math.max(maximumGap, hit.gap); if (point.y >= probeSurface.centerY) upper++; else lower++;
    if (newAngle > oldAngle + 1e-4) worsenedProbes++;
    selected.push({ vertex: id, face: hit.face, signedGap: hit.signedGap });
  }
  check(count >= tolerances.minimumProbesPerFinger, 'enough independent root overlap probes ' + name);
  const baselineMeanDegrees = baselineSum / count, candidateMeanDegrees = candidateSum / count;
  check(candidateMeanDegrees < baselineMeanDegrees * tolerances.rootMeanMaximumBaselineRatio && baselineMeanDegrees - candidateMeanDegrees >= tolerances.rootMeanMinimumImprovementDegrees,
    'root overlap angular agreement improves meaningfully ' + name + ' (' + baselineMeanDegrees + ' -> ' + candidateMeanDegrees + ' degrees)');
  check(changedVertices > 0, 'patient finger join shading actually changes ' + name);
  return { name, newReversedFaces, baselineReversedFaces: reversedFaces.size, protectedVertices: protectedVertices.size, protectedVerticesUnchanged: true,
    capCentersUnchanged: true, distalNormalsUnchanged: true, distalVertices, changedVertices, maximumChangedT,
    minimumBaselineFaceAgreement, minimumCandidateFaceAgreement, probe: { baselineMeanDegrees, candidateMeanDegrees, count, baselineMaximumDegrees, candidateMaximumDegrees,
      maximumGap, upperHemisphereCount: upper, lowerHemisphereCount: lower, worsenedProbes, selectionSHA256: sha(JSON.stringify(selected)) } };
}
function mirrorStats(model, digit) {
  const leftHand = find(model, 'fr-patient-left-hand'), rightHand = find(model, 'fr-patient-right-hand');
  const left = relativeSurface(find(model, 'fr-patient-left-finger-' + digit + '-surface'), leftHand);
  const right = relativeSurface(find(model, 'fr-patient-right-finger-' + (3 - digit) + '-surface'), rightHand);
  const key = point => point.toArray().map(value => Math.round(value / tolerances.mirrorPositionQuantization)).join(',');
  const map = new Map(); right.points.forEach((point, id) => map.set(key(point), id));
  let maximumDegrees = 0, sum = 0;
  for (let id = 0; id < left.points.length; id++) {
    const reflected = left.points[id].clone(); reflected.x *= -1;
    const rightId = map.get(key(reflected)); check(rightId !== undefined, 'mirrored patient finger vertex exists ' + digit);
    const normal = left.normals[id].clone(); normal.x *= -1;
    const degrees = angle(normal, right.normals[rightId]); maximumDegrees = Math.max(maximumDegrees, degrees); sum += degrees;
  }
  return { digit, vertices: left.points.length, maximumDegrees, meanDegrees: sum / left.points.length };
}
function mirrorCheck(prior, current) {
  return Array.from({ length: 4 }, (_, digit) => {
    const baseline = mirrorStats(prior, digit), candidate = mirrorStats(current, digit);
    check(candidate.maximumDegrees <= baseline.maximumDegrees + tolerances.normalMirrorMaximumAddedDegrees, 'finger normal mirror error stays within baseline plus 0.5 degrees ' + digit);
    return { digit, baseline, candidate };
  });
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
cases: for (const age of ['adult', 'child', 'infant']) for (const phase of [0, 2, 5, 8]) for (const contrast of [false, true]) {
  let prior, current; const result = { age, phase, contrast };
  try {
    prior = build(beforeConfig, age, phase, contrast); current = build(candidateConfig, age, phase, contrast);
    const original = preservation(prior), preserved = preservation(current);
    equal(preserved, original, 'scene exact outside the eight authorized patient finger normal buffers');
    result.sceneParity = { ...preserved, allowedChanges: changedAttributes(prior, current) };
    result.fingers = [];
    for (const name of fingerNames) {
      const side = name.includes('-left-') ? 'left' : 'right';
      result.fingers.push(verifyFinger(find(prior, name), find(current, name), find(current, 'fr-patient-' + side + '-hand'), find(current, 'fr-patient-' + side + '-palm')));
    }
    result.normalMirrors = mirrorCheck(prior, current);
    const oldResources = dispose(prior); prior = null; result.resources = dispose(current); current = null;
    equal(result.resources, oldResources, 'baseline and candidate resource counts preserved'); result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = error.stack; }
  finally { if (prior) dispose(prior); if (current) dispose(current); }
  results.push(result);
  console.log(JSON.stringify({ age, phase, contrast, status: result.status, error: result.error, fingerMeanImprovements: result.fingers?.map(value => value.probe.baselineMeanDegrees - value.probe.candidateMeanDegrees) }));
  if (result.status !== 'passed') break cases;
  if (process.argv.includes('--one-case')) break cases;
}
if (process.argv.includes('--selftest') && results.length === 24 && results.every(result => result.status === 'passed')) {
  const call = '        finishPatientFingerNormals(digit.mesh,patientFingerNormalSurface);';
  equal(candidate.split(call).length, 2, 'unique actual finger fitter call for mutation');
  const scratch = path.join(work, 'finger-joins-selftest-source.js'), saved = Buffer.from(candidate);
  fs.writeFileSync(scratch, saved); equal(fs.readFileSync(scratch), saved, 'private selftest source saved and reread');
  for (const type of ['omit-finger-fit', 'unauthorized-finger-position']) {
    let prior, current, rejected = false, semanticError = '';
    try {
      const replacement = type === 'omit-finger-fit' ? '' : "        digit.mesh.geometry.attributes.position.setX(0,digit.mesh.geometry.attributes.position.getX(0)+.001);\n" + call;
      fs.writeFileSync(scratch, candidate.replace(call, replacement));
      const mutated = fs.readFileSync(scratch, 'utf8'); check(sha(mutated) !== candidateSHA256, 'selftest source actually differs');
      prior = build(beforeConfig, 'adult', 8, false); current = build(capture(mutated), 'adult', 8, false);
      try {
        if (type === 'omit-finger-fit') verifyFinger(find(prior, 'fr-patient-left-finger-0-surface'), find(current, 'fr-patient-left-finger-0-surface'), find(current, 'fr-patient-left-hand'), find(current, 'fr-patient-left-palm'));
        else equal(preservation(current), preservation(prior), 'unauthorized position mutation violates scene parity');
      } catch (error) { semanticError = error.message; rejected = type === 'omit-finger-fit' ? /root overlap angular agreement improves meaningfully/.test(semanticError) : /unauthorized position mutation violates scene parity/.test(semanticError); }
      check(rejected, 'semantic negative control rejected ' + type);
    } finally {
      if (prior) dispose(prior); if (current) dispose(current);
      fs.writeFileSync(scratch, saved); equal(fs.readFileSync(scratch), saved, 'selftest source restored and reread byte for byte ' + type);
    }
    negative.push({ type, rejected, semanticError, restoredAndReread: true, restoredSHA256: sha(fs.readFileSync(scratch)) });
  }
}
for (const [file, pin] of Object.entries(inputs)) equal(sha(fs.readFileSync(file)), pin, 'input preserved ' + file);
const report = { beforeSHA256, candidateSHA256, checkerSHA256: inputs[__filename], inputs, passed: results.length === 24 && results.every(result => result.status === 'passed'),
  cases: results.length, assertions, results, negative, selftestRequested: process.argv.includes('--selftest'), tolerances,
  scope: 'Only the normal buffers of patient left and right finger 0..3 surfaces may differ. Positions, indices, parameters, material values and hooks, scene configuration, frame function, transforms, landmarks, picks, metadata, hierarchy and resource counts remain exact. Root and tip cap center normals, original reversed-face vertex normals and all digit normals from t >= 0.36 remain byte-exact.',
  limitation: 'Raw-module CPU scenes with bundled THREE r128. Independent overlap probes enumerate actual palm triangles and signed vertical rays from both hemispheres, select the closest relevant hit, and interpolate actual vertex normals barycentrically in the hand frame. Geometry-selected proximal probes measure average angular agreement, not every continuous point or pointwise improvement. Browser, full application loader and full build are separate checks.' };
if (report.selftestRequested) report.passed = report.passed && negative.length === 2 && negative.every(value => value.rejected && value.restoredAndReread && value.restoredSHA256 === candidateSHA256);
fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, cases: report.cases, assertions, negative: negative.map(value => ({ type: value.type, rejected: value.rejected, restoredAndReread: value.restoredAndReread })) }));
if (!report.passed) process.exitCode = 1;
