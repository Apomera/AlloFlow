const fs=require('fs'),assert=require('assert');
function edit(path,run){const original=fs.readFileSync(path,'utf8'),crlf=original.includes('\r\n');let s=original.replace(/\r\n/g,'\n');function replace(a,b){assert.equal(s.split(a).length,2,'Unique '+a.slice(0,80));s=s.replace(a,b);}run(replace);const out=crlf?s.replace(/\n/g,'\r\n'):s,fd=fs.openSync(path,'r+');try{fs.writeSync(fd,out);fs.ftruncateSync(fd,Buffer.byteLength(out));}finally{fs.closeSync(fd);}}
edit('stem_lab/stem_tool_geometryworld.js',replace=>{
replace("if(created.indexOf(mesh)<0 && mesh.material && mesh.material.dispose)mesh.material.dispose();","if(created.indexOf(mesh)<0){if(mesh.geometry || (mesh.userData && mesh.userData.gridPos))engine._disposeBlockMesh(mesh);else if(mesh.material && mesh.material.dispose)mesh.material.dispose();if(mesh.dispose)mesh.dispose();}");
replace("engine.blocksPlaced=Object.keys(engine.blocks).filter(function(k){var d=engine.blocks[k].userData || {};return !d._lessonBlock && !d.gwGroundProxy && (!d._measurementLayer || d._measurementLayer==='student');}).length;","engine.blocksPlaced=Math.max(0,(engine.blocksPlaced || 0)+plan.additions.length-plan.removals.length);");
replace("          engine._replayBuildBatch=function(action,undo){\n            return apply(","          engine._replayBuildBatch=function(action,undo){\n            var expected=undo?action.additions:action.removals;\n            for(var i=0;i<expected.length;i++){var b=expected[i],mesh=engine.blocks[key(b)],d=mesh && mesh.userData;if(!d || d.blockType!==b.type || (d.shape || 'cube')!==b.shape || (d.rotation || 0)!==b.rotation)return failure('changed','The original blocks changed. This operation cannot be replayed.');}\n            return apply(");
});
edit('reports/geometry-world-creative-tools-2026-09-12/drawing-runtime.fragment.js',replace=>{
replace("            list.forEach(function(b){\n              var shape=BLOCK_SHAPES.some(function(s){return s.id===b.shape;})?b.shape:'cube',geometry=createShapeGeometry(shape),edges=new THREE.EdgesGeometry(geometry);geometry.dispose();\n              var mesh=new THREE.LineSegments(edges,material);mesh.position.set(b.x+.5,b.y+(shape==='halfB'?.25:shape==='halfA'||shape==='quarter'?0:.5),b.z+.5);\n              if(shape!=='cube')mesh.rotation.y=(b.rotation || 0)*Math.PI/2;mesh.renderOrder=999;mesh.raycast=function(){};group.add(mesh);\n            });",`            // One line draw call for the whole operation, including mixed stamp shapes.
            var cache={},positions=[];
            list.forEach(function(b){
              var shape=BLOCK_SHAPES.some(function(s){return s.id===b.shape;})?b.shape:'cube';
              if(!cache[shape]){var shapeGeo=createShapeGeometry(shape),edgeGeo=new THREE.EdgesGeometry(shapeGeo);cache[shape]=Array.from(edgeGeo.getAttribute('position').array);shapeGeo.dispose();edgeGeo.dispose();}
              var values=cache[shape],angle=shape==='cube'?0:(b.rotation || 0)*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle),oy=shape==='halfB'?.25:shape==='halfA'||shape==='quarter'?0:.5;
              for(var i=0;i<values.length;i+=3)positions.push(values[i]*c+values[i+2]*s+b.x+.5,values[i+1]+b.y+oy,-values[i]*s+values[i+2]*c+b.z+.5);
            });
            var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
            var mesh=new THREE.LineSegments(geometry,material);mesh.renderOrder=999;mesh.raycast=function(){};group.add(mesh);`);
});
console.log('Finalized batch rollback/history/count safeguards and bounded one-draw-call previews.');
