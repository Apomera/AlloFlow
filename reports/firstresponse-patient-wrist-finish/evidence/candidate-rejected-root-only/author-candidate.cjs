const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const paths=['stem_lab/stem_tool_firstresponse.js','desktop/web-app/public/stem_lab/stem_tool_firstresponse.js','desktop/app-build/stem_lab/stem_tool_firstresponse.js','desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'];
const expected='69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242';
const snapshots=paths.map(file=>{const bytes=fs.readFileSync(path.join(repo,file));assert.equal(hash(bytes),expected,file);return{path:file,sha256:hash(bytes),bytes:bytes.length,data:bytes};});
const before=snapshots[0].data.toString('utf8');
for(const item of snapshots){const dest=path.join(work,'runtime-snapshot',item.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,item.data);assert.equal(hash(fs.readFileSync(dest)),item.sha256);}
fs.writeFileSync(path.join(work,'before.js'),before);
fs.writeFileSync(path.join(work,'baseline.json'),JSON.stringify({sourceSHA256:expected,runtimeCopies:snapshots.map(({data,...v})=>v)},null,2)+'\n');
const anchor='    function shapedSegment(parent, a, b, contour, mat, name, section) {';
const addition=`    function finishPatientWristNormals(wrist, forearm) {
      var positions = wrist.geometry.attributes.position, normals = wrist.geometry.attributes.normal;
      var armPositions = forearm.geometry.attributes.position, armNormals = forearm.geometry.attributes.normal;
      var armIndices = forearm.geometry.index.array, armShape = forearm.geometry.parameters;
      var armInverse = forearm.quaternion.clone().invert(), handInverse = wrist.parent.quaternion.clone().invert();
      var around = wrist.geometry.parameters.radialSegments, normalRay = new THREE.Ray();
      // Match the forearm where the wrist emerges, then fade into the existing hand shading.
      for (var wi = 0; wi < 8 * around; wi++) {
        var row = Math.floor(wi / around), fade = Math.max(0, (row - 4) / 4);
        var weight = 1 - fade * fade * (3 - 2 * fade);
        var point = new THREE.Vector3().fromBufferAttribute(positions, wi).multiply(wrist.scale)
          .add(wrist.position).applyQuaternion(wrist.parent.quaternion).add(wrist.parent.position)
          .sub(forearm.position).applyQuaternion(armInverse);
        var armRow = Math.min(armShape.heightSegments - 1, Math.max(0,
          Math.floor((.5 - point.y / armShape.height) * armShape.heightSegments)));
        var angle = (Math.atan2(point.x, point.z) + Math.PI * 2) % (Math.PI * 2);
        var sector = Math.min(armShape.radialSegments - 1, Math.floor(angle / (Math.PI * 2) * armShape.radialSegments));
        normalRay.set(new THREE.Vector3(0, point.y, 0), new THREE.Vector3(point.x, 0, point.z).normalize());
        for (var probe = 0; probe < 6; probe++) {
          var neighbor = (sector + [0, 1, -1][Math.floor(probe / 2)] + armShape.radialSegments) % armShape.radialSegments;
          var offset = (neighbor * armShape.heightSegments + armRow) * 6 + (probe % 2) * 3;
          var ids = [armIndices[offset], armIndices[offset + 1], armIndices[offset + 2]];
          var triangle = ids.map(function (vertex) { return new THREE.Vector3().fromBufferAttribute(armPositions, vertex); });
          var hit = normalRay.intersectTriangle(triangle[0], triangle[1], triangle[2], false, new THREE.Vector3());
          if (!hit) continue;
          var weights = THREE.Triangle.getBarycoord(hit, triangle[0], triangle[1], triangle[2], new THREE.Vector3());
          var fitted = new THREE.Vector3();
          for (var corner = 0; corner < 3; corner++) fitted.addScaledVector(
            new THREE.Vector3().fromBufferAttribute(armNormals, ids[corner]), weights.getComponent(corner));
          fitted.normalize().applyQuaternion(forearm.quaternion).applyQuaternion(handInverse);
          var normal = new THREE.Vector3().fromBufferAttribute(normals, wi).divide(wrist.scale).normalize();
          normal.lerp(fitted, weight).normalize().multiply(wrist.scale).normalize();
          normals.setXYZ(wi, normal.x, normal.y, normal.z);
          break;
        }
      }
    }

`;
const oldForearm="      shapedSegment(patientArms, arm[1], arm[2], [[0,.072],[.28,.087],[.65,.068],[1,.048]], skin, 'fr-patient-' + id + '-forearm');";
const oldFold="      patientWrist.name = 'fr-patient-'+id+'-wrist'; sculptWristFold(patientWrist,.15,1);";
const edits=[{old:anchor,new:addition+anchor},{old:oldForearm,new:oldForearm.replace('      shapedSegment','      var patientForearm = shapedSegment')},{old:oldFold,new:oldFold+'\n      finishPatientWristNormals(patientWrist,patientForearm);'}];
let candidate=before;for(const edit of edits){assert.equal(candidate.split(edit.old).length,2);candidate=candidate.replace(edit.old,edit.new);}new Function(candidate);
fs.writeFileSync(path.join(work,'candidate.js'),candidate);fs.writeFileSync(path.join(work,'delta.json'),JSON.stringify({beforeSHA256:expected,afterSHA256:hash(candidate),edits},null,2)+'\n');
assert.equal(hash(fs.readFileSync(path.join(work,'candidate.js'))),hash(candidate));console.log(JSON.stringify({beforeSHA256:expected,candidateSHA256:hash(candidate),bytes:Buffer.byteLength(candidate),edits:edits.length}));
