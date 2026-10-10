const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex'),file=name=>path.join(__dirname,name);
const source=fs.readFileSync(file('candidate.js'),'utf8'),delta=JSON.parse(fs.readFileSync(file('delta.json'),'utf8'));
assert.equal(hash(source),'38660be59270be0b42e34649f7c7ef62f91a804671d3469631b48b5292a35be4');
assert.equal(hash(fs.readFileSync(file('candidate-rejected-recovery-fold/candidate.js'))),hash(source));
const old="      var normalRay = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3());\n      // Blend only beside the real palm surface, retaining the wrist's bend away from the join.";
const replacement=`      var normalRay = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3());
      var wristIndices = wrist.geometry.index.array, folded = new Uint8Array(positions.count);
      var a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      var faceNormal = new THREE.Vector3(), averageNormal = new THREE.Vector3(), cornerNormal = new THREE.Vector3();
      // Preserve shading around tightly folded faces before fitting the palm join.
      for (var triangleIndex = 0; triangleIndex < wristIndices.length; triangleIndex += 3) {
        var ia = wristIndices[triangleIndex], ib = wristIndices[triangleIndex + 1], ic = wristIndices[triangleIndex + 2];
        a.fromBufferAttribute(positions, ia).multiply(wrist.scale);
        b.fromBufferAttribute(positions, ib).multiply(wrist.scale);
        c.fromBufferAttribute(positions, ic).multiply(wrist.scale);
        faceNormal.copy(b).sub(a).cross(c.sub(a));
        averageNormal.set(0, 0, 0);
        for (var cornerIndex = 0; cornerIndex < 3; cornerIndex++) {
          cornerNormal.fromBufferAttribute(normals, wristIndices[triangleIndex + cornerIndex]).divide(wrist.scale).normalize();
          averageNormal.add(cornerNormal);
        }
        if (faceNormal.dot(averageNormal) <= 0) folded[ia] = folded[ib] = folded[ic] = 1;
      }
      // Blend only beside the real palm surface, retaining the wrist's bend away from the join.`;
const loopOld='      for (var wi = 7 * around; wi < positions.count; wi++) {';
const loopNew=loopOld+'\n        if (folded[wi]) continue;';
for(const text of [source,delta.edits[0].new]){assert.equal(text.split(old).length,2);assert.equal(text.split(loopOld).length,2);}
const next=source.replace(old,replacement).replace(loopOld,loopNew);
new Function(next);
delta.edits[0].new=delta.edits[0].new.replace(old,replacement).replace(loopOld,loopNew);
delta.afterSHA256=hash(next);
let rebuilt=fs.readFileSync(file('before.js'),'utf8');
for(const edit of delta.edits){assert.equal(rebuilt.split(edit.old).length,2);rebuilt=rebuilt.replace(edit.old,edit.new);}
assert.equal(rebuilt,next);
fs.writeFileSync(file('candidate.js'),next);
fs.writeFileSync(file('delta.json'),JSON.stringify(delta,null,2)+'\n');
assert.equal(hash(fs.readFileSync(file('candidate.js'))),delta.afterSHA256);
console.log(JSON.stringify({candidateSHA256:delta.afterSHA256,bytes:Buffer.byteLength(next),syntax:true,deltaRebuildExact:true,sharedWrites:false}));
