const fs=require('node:fs');
const paths=['stem_lab/stem_tool_geometryworld.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld.js'];
let source=fs.readFileSync(paths[0],'utf8');
const helper=`
        // Raycast face normals are local to the hit mesh. Placement and its
        // preview share a world-space cell so rotated wedge faces agree visually.
        engine.placementCellForHit = function(hit) {
          var object = hit && hit.object;
          var position = object && object.userData && object.userData.gridPos;
          var normal = hit && hit.face && hit.face.normal;
          if (!position || !normal) return null;
          var nx = normal.x, ny = normal.y, nz = normal.z;
          if (object.matrixWorld && object.matrixWorld.elements && object.matrixWorld.elements.length === 16 && THREE.Vector3 && THREE.Matrix3) {
            var worldNormal = new THREE.Vector3(nx, ny, nz);
            worldNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(object.matrixWorld));
            if (worldNormal.lengthSq() > 1e-12 && isFinite(worldNormal.x) && isFinite(worldNormal.y) && isFinite(worldNormal.z)) {
              worldNormal.normalize(); nx = worldNormal.x; ny = worldNormal.y; nz = worldNormal.z;
            }
          }
          // Lightweight hit fixtures without a transform retain local-normal
          // behavior; valid world meshes always use the transformed normal above.
          return { x:position.x + Math.round(nx), y:position.y + Math.round(ny), z:position.z + Math.round(nz) };
        };
`;
const marker='        engine.raycaster = new THREE.Raycaster();';
if(source.split(marker).length!==2)throw new Error('Expected one raycaster initializer');
source=source.replace(marker,marker+helper);
const action=/var p = hit\.object\.userData\.gridPos;\s+var n = hit\.face\.normal;\s+var placeX = p\.x \+ Math\.round\(n\.x\), placeY = p\.y \+ Math\.round\(n\.y\), placeZ = p\.z \+ Math\.round\(n\.z\);/;
if(!action.test(source))throw new Error('Placement action anchor missing');
source=source.replace(action,'var placement = engine.placementCellForHit(hit);\n              if (!placement) return;\n              var placeX = placement.x, placeY = placement.y, placeZ = placement.z;');
const preview=/var p2 = hits\[0\]\.object\.userData\.gridPos;\s+var n2 = hits\[0\]\.face\.normal;\s+var gx = p2\.x \+ Math\.round\(n2\.x\), gy = p2\.y \+ Math\.round\(n2\.y\), gz = p2\.z \+ Math\.round\(n2\.z\);/;
if(!preview.test(source))throw new Error('Placement preview anchor missing');
source=source.replace(preview,'var previewCell = engine.placementCellForHit(hits[0]);\n            if (!previewCell) { if (engine._ghostMesh) engine._ghostMesh.visible = false; return; }\n            var gx = previewCell.x, gy = previewCell.y, gz = previewCell.z;');
new Function(source);
for(const file of paths){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);}
console.log(JSON.stringify({sourceParses:true,mirrorMatches:fs.readFileSync(paths[0]).equals(fs.readFileSync(paths[1]))}));
