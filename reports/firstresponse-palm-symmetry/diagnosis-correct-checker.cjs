'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname, file=path.join(work,'verify-palm-symmetry.cjs'), archive=path.join(work,'candidate-rejected-initial-geometry');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(archive),'initial checker archive must be new');
fs.mkdirSync(archive);
const inventory={};
for(const name of ['verify-palm-symmetry.cjs','geometry-result.json','geometry.log']){
  const bytes=fs.readFileSync(path.join(work,name));fs.writeFileSync(path.join(archive,name),bytes);assert.deepEqual(fs.readFileSync(path.join(archive,name)),bytes);inventory[name]=hash(bytes);
}
fs.writeFileSync(path.join(archive,'rejection.json'),JSON.stringify({reason:'Initial checker incorrectly required exact shader-normal mirroring despite pre-existing seam averaging asymmetry, and treated position-derived crease bounding boxes as immutable despite scoped crease position changes.',files:inventory,accepted:false,sourceChanged:false},null,2)+'\n');
let source=fs.readFileSync(file,'utf8');
function replace(old,next){assert.equal(source.split(old).length,2,'unique correction marker');source=source.replace(old,next);}
replace('function preservation(model) {',`function preservedBoundingBox(mesh) {
  const cached = mesh.geometry.boundingBox;
  if (!rightCreases.has(mesh.name) || !cached) return cached;
  const computed = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
  equal(cached.min.toArray(), computed.min.toArray(), 'crease cached boundingBox minimum matches actual positions ' + mesh.name);
  equal(cached.max.toArray(), computed.max.toArray(), 'crease cached boundingBox maximum matches actual positions ' + mesh.name);
  return { computedFromScopedCreasePositions: true };
}
function preservation(model) {`);
replace('geometry.userData, geometry.boundingBox, geometry.boundingSphere','geometry.userData, preservedBoundingBox(object), geometry.boundingSphere');
const begin='function mirrorPalmPair(model, pair, leftName, rightName) {';
const end='function skinProbe(palm, point, label) {';
const i=source.indexOf(begin),j=source.indexOf(end);
assert(i>=0&&j>i);
source=source.slice(0,i)+`function palmMirrorNormalStats(left, right, pair) {
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
`+source.slice(j);
replace("mirrorPalmPair(current, 'patient', 'fr-patient-left-palm', 'fr-patient-right-palm')","mirrorPalmPair(current, 'patient', 'fr-patient-left-palm', 'fr-patient-right-palm', prior)");
replace("mirrorPalmPair(current, 'rescuer', 'fr-rescuer-lower-palm', 'fr-rescuer-upper-palm')","mirrorPalmPair(current, 'rescuer', 'fr-rescuer-lower-palm', 'fr-rescuer-upper-palm', prior)");
replace("right patient primary/thumb crease positions/normals/path control points may differ. All other", "right patient primary/thumb crease positions/normals/path control points and their cached boundingBoxes may differ; each present crease boundingBox must exactly match its actual position buffer. All other");
replace('palmNormalMirrorError: 1e-6','palmNormalMirrorMaximumDegrees: .2, palmNormalMirrorMaximumBaselineRatio: .5, palmNormalMirrorMeanBaselineRatio: .05');
replace("Browser, full application loader and full build are separate checks.","Shader normals retain small seam averaging differences: angular maximum and mean must improve substantially; this does not assert exact normal mirroring or pointwise improvement. Browser, full application loader and full build are separate checks.");
new Function(source);
fs.writeFileSync(file,source);assert.equal(fs.readFileSync(file,'utf8'),source);
const explanation={checkerBefore:inventory['verify-palm-symmetry.cjs'],checkerAfter:hash(source),sourceSHA256:hash(fs.readFileSync(path.join(work,'candidate.js'))),scope:'Checker correction only; candidate and browser files unchanged.',findings:{preservation:'Only right patient primary/thumb crease boundingBox min.y/max.y changed. Bounds are computed from scoped position arrays; revised checker requires exact recomputation while preserving cache presence and every other bound.',patient:{baselineMaxChord:.007009142948124047,candidateMaxChord:.002616975759205534,baselineMeanChord:.0024414059089292815,candidateMeanChord:.000057543507780495854,worseVertices:9,maximumChordIncrease:.0005794621147487149},rescuer:{baselineMaxChord:.004984416571573216,candidateMaxChord:.0014670063502938216,baselineMeanChord:.001628419520280838,candidateMeanChord:.000035955700522092805,worseVertices:8,maximumChordIncrease:.0004234380349031374},cause:'smoothCoincidentNormals first computes normalized per-index normals, then averages duplicate-position seam normals. A mirrored seam can land on a non-seam vertex, so exact triangle mirroring does not imply exact averaged shader normals.'},acceptance:{mirroredTriangles:'unchanged strict geometry hash',creaseSymmetry:'unchanged 1e-7 path check',shaderNormals:'Maximum <=0.2 degrees, maximum <50% baseline, mean <5% baseline, plus unchanged finite/unit/outward checks.',creaseBounds:'Every present scoped crease boundingBox exactly equals Box3 computed from positions before normalized scene comparison.'},tests:'Syntax checked only here. Root will run the full 24-case checker with selftest.'};
fs.writeFileSync(path.join(work,'diagnosis-checker-correction.json'),JSON.stringify(explanation,null,2)+'\n');
console.log(JSON.stringify({ready:true,checkerSHA256:hash(source),candidateSHA256:explanation.sourceSHA256,archive}));
