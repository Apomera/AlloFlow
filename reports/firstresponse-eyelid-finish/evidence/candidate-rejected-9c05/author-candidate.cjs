'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const expected = 'af6ecb094af6d67ebb0955170a55e0a9726308c59f4ddd9b196d56cfe434e4c7';
const relativePaths = ['stem_lab/stem_tool_firstresponse.js', 'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'desktop/app-build/stem_lab/stem_tool_firstresponse.js', 'desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const copies = relativePaths.map(relativePath => { const bytes = fs.readFileSync(path.join(root, relativePath)); return { relativePath, bytes, sha256:sha(bytes) }; });
copies.forEach(copy => assert.equal(copy.sha256, expected, copy.relativePath));
const before = copies[0].bytes;
const old = `    function fittedLid(points,side,upper,name) {
      var seam = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0],0,p[1]); }));
      var geometry = new THREE.SphereGeometry(1,32,16), positions = geometry.attributes.position;
      // Closed lid surfaces settle into the face at the seam and corners.
      // The upper lid has a wider, softer fold than the lower lid.
      for (var i = 0; i < positions.count; i++) {
        var u = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        var q = Math.max(0,1-u*u), root = Math.sqrt(q), point = seam.getPoint((u+1)/2);
        var width = upper ? .020 : .010;
        var lidZ = point.z + (upper ? -width*(q-z*root)/2 : width*(q+z*root)/2);
        var lidY = faceSurfaceY(point.x,lidZ)-.0012 + y*root*(y >= 0 ? (upper ? .005 : .0035) : .0012);
        positions.setXYZ(i,point.x*profile.head,lidY*profile.head,lidZ*profile.head);
      }
      // Mirroring the left eye reverses orientation; keep its shell outward.
      if (side < 0) {
        var indices = geometry.index.array;
        for (var i = 0; i < indices.length; i += 3) {
          var swap = indices[i+1]; indices[i+1] = indices[i+2]; indices[i+2] = swap;
        }
      }
      smoothCoincidentNormals(geometry);
      var lid = new THREE.Mesh(geometry,skin); lid.name = name; headPivot.add(lid);
    }`;
const next = `    var pairedLidGeometry = {};
    function fittedLid(points,side,upper,name) {
      var geometry, positions, kind = upper ? 'upper' : 'lower';
      if (side < 0) {
        var seam = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0],0,p[1]); }));
        geometry = new THREE.SphereGeometry(1,48,24); positions = geometry.attributes.position;
        // Seat the closed shells beneath the rendered skin on both sides.
        for (var i = 0; i < positions.count; i++) {
          var u = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
          var q = Math.max(0,1-u*u), root = Math.sqrt(q), point = seam.getPoint((u+1)/2);
          var width = upper ? .020 : .010;
          var lidZ = point.z + (upper ? -width*(q-z*root)/2 : width*(q+z*root)/2);
          var skinY = Math.min(eyeSurfaceY(eyeSkin,point.x,lidZ),eyeSurfaceY(eyeSkin,-point.x,lidZ));
          var lidY = skinY-.0012 + y*root*(y >= 0 ? (upper ? .005 : .0035) : .0012);
          positions.setXYZ(i,point.x*profile.head,lidY*profile.head,lidZ*profile.head);
        }
        var indices = geometry.index.array;
        for (var i = 0; i < indices.length; i += 3) {
          var swap = indices[i+1]; indices[i+1] = indices[i+2]; indices[i+2] = swap;
        }
        smoothCoincidentNormals(geometry); pairedLidGeometry[kind] = geometry;
      } else {
        geometry = pairedLidGeometry[kind].clone(); geometry.parameters = pairedLidGeometry[kind].parameters;
        positions = geometry.attributes.position;
        var normals = geometry.attributes.normal, indices = geometry.index.array;
        for (var i = 0; i < positions.count; i++) {
          positions.setX(i,-positions.getX(i)); normals.setX(i,-normals.getX(i));
        }
        for (var i = 0; i < indices.length; i += 3) {
          var swap = indices[i+1]; indices[i+1] = indices[i+2]; indices[i+2] = swap;
        }
      }
      var lid = new THREE.Mesh(geometry,skin); lid.name = name; headPivot.add(lid);
    }`;
const source = before.toString('utf8');
assert.equal(source.split(old).length,2,'exact old block once');
const candidate = Buffer.from(source.replace(old,next));
new vm.Script(candidate.toString('utf8'));
assert.equal(candidate.toString('utf8').replace(next,old),source,'exact reverse');
function save(name,data) {
  const dest=path.join(__dirname,name);
  if(fs.existsSync(dest)) assert.deepEqual(fs.readFileSync(dest),Buffer.from(data),'refuse unrelated existing private file '+name);
  else fs.writeFileSync(dest,data);
}
save('before.js',before); save('candidate.js',candidate);
const delta = {beforeSHA256:expected,afterSHA256:sha(candidate),edits:[{old,new:next}]};
save('delta.json',JSON.stringify(delta,null,2)+'\n');
save('baseline.json',JSON.stringify({root,sourceSHA256:expected,byteLength:before.length,copies:copies.map(({relativePath,sha256,bytes})=>({relativePath,sha256,byteLength:bytes.length})),candidateSHA256:sha(candidate),candidateByteLength:candidate.length},null,2)+'\n');
copies.forEach(copy => assert.equal(sha(fs.readFileSync(path.join(root,copy.relativePath))),expected,'source changed during private preparation'));
console.log(JSON.stringify({beforeSHA256:expected,afterSHA256:sha(candidate),candidateBytes:candidate.length,editedObjects:['fr-manikin-upper-lid-left','fr-manikin-lower-lid-left','fr-manikin-upper-lid-right','fr-manikin-lower-lid-right'],dependentGeometry:['fr-manikin-eye-left','fr-manikin-eye-right'],extraTriangles:4992,extraDrawCalls:0,extraMaterials:0,sharedFilesWritten:0},null,2));
