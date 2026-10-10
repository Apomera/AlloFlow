const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,hash=x=>crypto.createHash('sha256').update(x).digest('hex'),before=fs.readFileSync(path.join(work,'before.js'),'utf8'),previous=fs.readFileSync(path.join(work,'candidate.js'),'utf8'),delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8'));
assert.equal(hash(before),'69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242');assert.equal(hash(previous),'dc9deade4909e37e9aa4918309541168696e808b7eb066575fea3fa91d574c7e');
const anchor='    function shapedSegment(parent, a, b, contour, mat, name, section) {';
const helper=`    function finishPatientPalmNormals(wrist, palm) {
      var positions = wrist.geometry.attributes.position, normals = wrist.geometry.attributes.normal;
      var palmPositions = palm.geometry.attributes.position, palmNormals = palm.geometry.attributes.normal;
      var palmIndices = palm.geometry.index.array, shape = palm.geometry.parameters;
      var around = wrist.geometry.parameters.radialSegments, neighbors = [0, 1, -1, 2, -2, 3, -3];
      var normalRay = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3());
      // Blend only beside the real palm surface, retaining the wrist's bend away from the join.
      for (var wi = 7 * around; wi < positions.count; wi++) {
        var row = Math.floor(wi / around), rowFade = Math.min(1, (row - 6) / 2);
        var point = new THREE.Vector3().fromBufferAttribute(positions, wi).multiply(wrist.scale).add(wrist.position);
        var local = point.clone().sub(palm.position).divide(palm.scale), direction = local.clone().normalize();
        var latitude = Math.min(shape.heightSegments - 1, Math.floor(Math.acos(Math.max(-1, Math.min(1, direction.y))) / Math.PI * shape.heightSegments));
        var angle = (Math.atan2(direction.z, -direction.x) + Math.PI * 2) % (Math.PI * 2);
        var sector = Math.min(shape.widthSegments - 1, Math.floor(angle / (Math.PI * 2) * shape.widthSegments));
        normalRay.direction.copy(direction);
        var matched = false;
        for (var lat = 0; lat < neighbors.length && !matched; lat++) {
          var ring = latitude + neighbors[lat];
          if (ring < 0 || ring >= shape.heightSegments) continue;
          for (var lon = 0; lon < neighbors.length && !matched; lon++) {
            var column = (sector + neighbors[lon] + shape.widthSegments) % shape.widthSegments;
            var start = ring === 0 ? column * 3 : shape.widthSegments * 3 + (ring - 1) * shape.widthSegments * 6 + column * (ring === shape.heightSegments - 1 ? 3 : 6);
            for (var face = 0; face < (ring === 0 || ring === shape.heightSegments - 1 ? 1 : 2); face++) {
              var offset = start + face * 3, ids = [palmIndices[offset], palmIndices[offset + 1], palmIndices[offset + 2]];
              var triangle = ids.map(function (vertex) { return new THREE.Vector3().fromBufferAttribute(palmPositions, vertex); });
              var hit = normalRay.intersectTriangle(triangle[0], triangle[1], triangle[2], false, new THREE.Vector3());
              if (!hit) continue;
              matched = true;
              var gap = hit.clone().multiply(palm.scale).add(palm.position).distanceTo(point);
              var fade = Math.max(0, Math.min(1, (gap - .006) / .020));
              var weight = (1 - fade * fade * (3 - 2 * fade)) * rowFade * rowFade * (3 - 2 * rowFade);
              if (weight <= 0) break;
              var weights = THREE.Triangle.getBarycoord(hit, triangle[0], triangle[1], triangle[2], new THREE.Vector3());
              var fitted = new THREE.Vector3();
              for (var corner = 0; corner < 3; corner++) fitted.addScaledVector(
                new THREE.Vector3().fromBufferAttribute(palmNormals, ids[corner]).divide(palm.scale).normalize(), weights.getComponent(corner));
              var normal = new THREE.Vector3().fromBufferAttribute(normals, wi).divide(wrist.scale).normalize();
              normal.lerp(fitted.normalize(), weight).normalize().multiply(wrist.scale).normalize();
              normals.setXYZ(wi, normal.x, normal.y, normal.z);
              break;
            }
          }
        }
      }
    }

`;
assert.equal(delta.edits[0].new.split(anchor).length,2);delta.edits[0].new=delta.edits[0].new.replace(anchor,helper+anchor);
const old="      patientPalm.name = 'fr-patient-'+id+'-palm'; sculptPalm(patientPalm,thumbSide,1);";delta.edits.push({old,new:old+'\n      finishPatientPalmNormals(patientWrist,patientPalm);'});
let candidate=before;for(const edit of delta.edits){assert.equal(candidate.split(edit.old).length,2);candidate=candidate.replace(edit.old,edit.new);}new Function(candidate);delta.afterSHA256=hash(candidate);
assert.equal(hash(fs.readFileSync(path.join(work,'candidate.js'))),hash(previous));fs.writeFileSync(path.join(work,'candidate.js'),candidate);fs.writeFileSync(path.join(work,'delta.json'),JSON.stringify(delta,null,2)+'\n');assert.equal(hash(fs.readFileSync(path.join(work,'candidate.js'))),delta.afterSHA256);
console.log(JSON.stringify({candidateSHA256:delta.afterSHA256,bytes:Buffer.byteLength(candidate),edits:delta.edits.length}));
