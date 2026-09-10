const fs=require('fs');const file='stem_lab/stem_tool_geometryworld_builder.js';let s=fs.readFileSync(file,'utf8');const nl=s.includes('\r\n')?'\r\n':'\n';s=s.replace(/\r\n/g,'\n');
function once(a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Expected one marker: '+a);s=s.replace(a,b);}
once('  function studioGroundFootprints(meshes, baseY) {','  function studioGroundFootprints(meshes, baseY, poppingMeshes) {');
once('      mesh.updateWorldMatrix(true,false);\n      var points=[],seen={};',`      mesh.updateWorldMatrix(true,false);
      var matrix=mesh.matrixWorld;
      // Placement animation changes display scale only. Grounding follows the
      // finished block using a temporary matrix, without touching the live mesh.
      if(poppingMeshes && poppingMeshes.indexOf(mesh)!==-1){
        matrix=new THREE.Matrix4().compose(mesh.position,mesh.quaternion,new THREE.Vector3(1,1,1));
        if(mesh.parent)matrix.premultiply(mesh.parent.matrixWorld);
      }
      var points=[],seen={};`);
once('var point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);','var point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(matrix);');
once('studioGroundFootprints(selectedMeshes,box.min.y),contactMap','studioGroundFootprints(selectedMeshes,box.min.y,engine._popBlocks),contactMap');
new Function(s);s=s.replace(/\n/g,nl);for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
console.log('Canonical Studio grounding applied and mirrored.');
