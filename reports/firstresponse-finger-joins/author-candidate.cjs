'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const work = __dirname;
const shared = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_firstresponse.js';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const input = fs.readFileSync(shared);
assert.equal(sha(input), 'dfe3e01f38a419187e468c749cc37827f486a47401b9916afaa9ec6f98a3f86a');
const beforeFile = path.join(work, 'before.js');
if (fs.existsSync(beforeFile)) assert.deepEqual(fs.readFileSync(beforeFile), input);
else fs.writeFileSync(beforeFile, input);
const fitter = `    function patientFingerSurface(palm) {
      // A small projection grid bounds the triangle work for each finger.
      // Keep the cache outside scene and geometry metadata.
      var positions = palm.geometry.attributes.position, normals = palm.geometry.attributes.normal;
      var indices = palm.geometry.index.array, triangles = [], bins = [], divisions = 16;
      var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      var points = [], fittedNormals = [];
      for (var i = 0; i < positions.count; i++) {
        var point = new THREE.Vector3().fromBufferAttribute(positions,i)
          .multiply(palm.scale).applyQuaternion(palm.quaternion).add(palm.position);
        points.push(point);
        fittedNormals.push(new THREE.Vector3().fromBufferAttribute(normals,i)
          .divide(palm.scale).applyQuaternion(palm.quaternion).normalize());
        minX = Math.min(minX,point.x); maxX = Math.max(maxX,point.x);
        minZ = Math.min(minZ,point.z); maxZ = Math.max(maxZ,point.z);
      }
      function cell(value,min,max) {
        return Math.max(0,Math.min(divisions-1,Math.floor((value-min)/(max-min)*divisions)));
      }
      for (var bin = 0; bin < divisions*divisions; bin++) bins.push([]);
      for (var face = 0; face < indices.length; face += 3) {
        var a = points[indices[face]], b = points[indices[face+1]], c = points[indices[face+2]];
        var determinant = (b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
        if (Math.abs(determinant) < 1e-14) continue;
        var triangle = { a:a, b:b, c:c, determinant:determinant,
          normals:[fittedNormals[indices[face]],fittedNormals[indices[face+1]],fittedNormals[indices[face+2]]] };
        var id = triangles.length; triangles.push(triangle);
        var x0 = cell(Math.min(a.x,b.x,c.x),minX,maxX), x1 = cell(Math.max(a.x,b.x,c.x),minX,maxX);
        var z0 = cell(Math.min(a.z,b.z,c.z),minZ,maxZ), z1 = cell(Math.max(a.z,b.z,c.z),minZ,maxZ);
        for (var iz = z0; iz <= z1; iz++) for (var ix = x0; ix <= x1; ix++) bins[iz*divisions+ix].push(id);
      }
      return { triangles:triangles, bins:bins, divisions:divisions,
        minX:minX, maxX:maxX, minZ:minZ, maxZ:maxZ, centreY:palm.position.y };
    }
    function finishPatientFingerNormals(mesh,surface) {
      var positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
      var indices = mesh.geometry.index.array, folded = new Uint8Array(positions.count);
      var a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      var faceNormal = new THREE.Vector3(), average = new THREE.Vector3(), sample = new THREE.Vector3();
      // Preserve the shading of any existing fold whose face and normals disagree.
      for (var face = 0; face < indices.length; face += 3) {
        var ia = indices[face], ib = indices[face+1], ic = indices[face+2];
        a.fromBufferAttribute(positions,ia); b.fromBufferAttribute(positions,ib); c.fromBufferAttribute(positions,ic);
        faceNormal.subVectors(b,a).cross(c.sub(a));
        if (faceNormal.lengthSq() < 1e-20) continue;
        average.fromBufferAttribute(normals,ia).add(sample.fromBufferAttribute(normals,ib))
          .add(sample.fromBufferAttribute(normals,ic));
        if (faceNormal.dot(average) <= 0) folded[ia] = folded[ib] = folded[ic] = 1;
      }
      var around = 16, sections = (positions.count-2)/around;
      var point = new THREE.Vector3(), normal = new THREE.Vector3(), fitted = new THREE.Vector3();
      for (var vi = 0; vi < sections*around; vi++) {
        var t = Math.floor(vi/around)/sections;
        if (t >= .36) break;
        if (folded[vi]) continue;
        point.fromBufferAttribute(positions,vi);
        if (point.x < surface.minX || point.x > surface.maxX || point.z < surface.minZ || point.z > surface.maxZ) continue;
        var ix = Math.min(surface.divisions-1,Math.floor((point.x-surface.minX)/(surface.maxX-surface.minX)*surface.divisions));
        var iz = Math.min(surface.divisions-1,Math.floor((point.z-surface.minZ)/(surface.maxZ-surface.minZ)*surface.divisions));
        var candidates = surface.bins[iz*surface.divisions+ix], sign = point.y >= surface.centreY ? 1 : -1;
        for (var ci = 0; ci < candidates.length; ci++) {
          var triangle = surface.triangles[candidates[ci]], pa = triangle.a, pb = triangle.b, pc = triangle.c;
          var u = ((pb.z-pc.z)*(point.x-pc.x)+(pc.x-pb.x)*(point.z-pc.z))/triangle.determinant;
          var v = ((pc.z-pa.z)*(point.x-pc.x)+(pa.x-pc.x)*(point.z-pc.z))/triangle.determinant, w = 1-u-v;
          if (u < -1e-9 || v < -1e-9 || w < -1e-9) continue;
          var y = u*pa.y+v*pb.y+w*pc.y;
          if ((y-surface.centreY)*sign < -1e-10) continue;
          var signedDistance = (point.y-y)*sign, gap = Math.abs(signedDistance);
          var distanceFade = Math.max(0,Math.min(1,(gap-.0025)/.0065));
          var rowFade = Math.max(0,Math.min(1,(.36-t)/.18));
          var weight = (1-distanceFade*distanceFade*(3-2*distanceFade))*rowFade*rowFade*(3-2*rowFade);
          if (weight <= 0) break;
          fitted.copy(triangle.normals[0]).multiplyScalar(u).addScaledVector(triangle.normals[1],v)
            .addScaledVector(triangle.normals[2],w).normalize();
          normal.fromBufferAttribute(normals,vi);
          var alignment = Math.max(0,Math.min(1,(normal.dot(fitted)-.15)/.30));
          weight *= alignment*alignment*(3-2*alignment);
          if (weight > 0) {
            normal.lerp(fitted,weight).normalize();
            normals.setXYZ(vi,normal.x,normal.y,normal.z);
          }
          break;
        }
      }
    }
`;
const edits = [
  { name:'fit-patient-finger-join-normals', old:'    function roundedDigit(parent, points, radius, name, dorsalSign) {',
    new:fitter+'    function roundedDigit(parent, points, radius, name, dorsalSign) {' },
  { name:'cache-patient-palm-normal-triangles', old:'      finishPatientPalmNormals(patientWrist,patientPalm);\n      for (var f = 0; f < 4; f++) {',
    new:'      finishPatientPalmNormals(patientWrist,patientPalm);\n      var patientFingerNormalSurface = patientFingerSurface(patientPalm);\n      for (var f = 0; f < 4; f++) {' },
  { name:'finish-patient-finger-before-fitted-nail', old:"        fittedNail(patientHand,digit,'fr-patient-'+id+'-nail-'+f);",
    new:"        finishPatientFingerNormals(digit.mesh,patientFingerNormalSurface);\n        fittedNail(patientHand,digit,'fr-patient-'+id+'-nail-'+f);" },
];
let candidate = input.toString('utf8');
for (const edit of edits) {
  assert.equal(candidate.split(edit.old).length,2,edit.name+' unique marker');
  candidate = candidate.replace(edit.old,edit.new);
}
new Function(candidate);
const delta = { beforeSHA256:sha(input), afterSHA256:sha(candidate), edits };
fs.writeFileSync(path.join(work,'candidate.js'),candidate);
fs.writeFileSync(path.join(work,'delta.json'),JSON.stringify(delta,null,2)+'\n');
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),delta.afterSHA256);
console.log(JSON.stringify({prepared:true,...delta,edits:edits.map(({name})=>name)}));
