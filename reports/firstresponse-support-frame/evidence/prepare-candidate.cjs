const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const expected = '164407bb58546fc91584761e51e9a907d2eacd33442a0a5fae31da0c22ef37c0';
const copies = ['stem_lab/stem_tool_firstresponse.js', 'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'desktop/app-build/stem_lab/stem_tool_firstresponse.js', 'desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'];
const snapshot = copies.map(relative => {
  const bytes = fs.readFileSync(path.join(repo, relative));
  assert.equal(hash(bytes), expected, 'baseline pin: ' + relative);
  const destination = path.join(__dirname, 'runtime-before', relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  assert.equal(hash(fs.readFileSync(destination)), expected);
  return { relative, bytes: bytes.length, SHA256: hash(bytes) };
});
const before = fs.readFileSync(path.join(repo, copies[0]), 'utf8');
fs.writeFileSync(path.join(__dirname, 'before.js'), before);
let source = before;
const changes = [];
function replace(prior, next) {
  if (!source.includes(prior)) { prior = prior.replace(/\n/g, '\r\n'); next = next.replace(/\n/g, '\r\n'); }
  assert.equal(source.split(prior).length, 2, 'unambiguous anchor');
  source = source.replace(prior, next);
  changes.push({ before: prior, after: next });
}
replace('      var supportSphere = supportBox.getBoundingSphere(new THREE.Sphere());',
`      var supportSphere = supportBox.getBoundingSphere(new THREE.Sphere());
      var supportFaceSphere = supportBox.clone().union(new THREE.Box3().setFromObject(headPivot)).getBoundingSphere(new THREE.Sphere());
      var supportFacePoint = new THREE.Vector3(), supportFaceRadiusSq = 0;
      [supportingHand, headPivot].forEach(function (group) {
        group.traverse(function (part) {
          var positions = part.geometry && part.geometry.attributes && part.geometry.attributes.position;
          if (!positions) return;
          for (var i = 0; i < positions.count; i++) {
            supportFacePoint.fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld);
            supportFaceRadiusSq = Math.max(supportFaceRadiusSq, supportFacePoint.distanceToSquared(supportFaceSphere.center));
          }
        });
      });
      supportContext.forEach(function (point) { supportFaceRadiusSq = Math.max(supportFaceRadiusSq, point.distanceToSquared(supportFaceSphere.center)); });
      supportFaceSphere.radius = Math.sqrt(supportFaceRadiusSq);`);
replace('        center: supportSphere.center.toArray(), radius: supportSphere.radius,',
`        center: supportSphere.center.toArray(), radius: supportSphere.radius,
        faceFrame: { center: supportFaceSphere.center.toArray(), radius: supportFaceSphere.radius },`);
replace('    var fit = palmDetailCamera(frSupportingHandInfo, width > 0 && height > 0 ? width / height : 1, FR_BODY_CAMERA_HOME);',
`    var aspect = width > 0 && height > 0 ? width / height : 1;
    var info = frSupportingHandInfo;
    if (aspect < 1.15 && info.faceFrame) info = { center: info.faceFrame.center, radius: info.faceFrame.radius,
      normal: info.normal, forward: info.forward };
    var fit = palmDetailCamera(info, aspect, FR_BODY_CAMERA_HOME);`);
let reversed = source;
for (const change of changes.slice().reverse()) {
  assert.equal(reversed.split(change.after).length, 2);
  reversed = reversed.replace(change.after, change.before);
}
assert.equal(reversed, before, 'only three replacement spans changed');
fs.writeFileSync(path.join(__dirname, 'candidate.js'), source);
assert.equal(fs.readFileSync(path.join(__dirname, 'candidate.js'), 'utf8'), source);
fs.writeFileSync(path.join(__dirname, 'changes.json'), JSON.stringify(changes, null, 2) + '\n');
const metadata = { baselineSHA256: hash(before), candidateSHA256: hash(source), candidateBytes: Buffer.byteLength(source), sourceSpans: changes.length, runtimeBefore: snapshot, schema: 'inspection.faceFrame = {center:[x,y,z], radius:number}', threshold: 'viewer aspect < 1.15', createdAt: new Date().toISOString() };
fs.writeFileSync(path.join(__dirname, 'baseline-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify(metadata));
