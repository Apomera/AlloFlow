const fs=require('node:fs'),vm=require('node:vm');
const file='stem_lab/stem_tool_geometryworld.js';let source=fs.readFileSync(file,'utf8');
const start=source.indexOf('          // ── Break highlight — colored wireframe on the targeted block ──');
const end=source.indexOf('          // ── Placement ghost',start);
if(start<0||end<0)throw new Error('Hover implementation boundaries missing');
const hover=`          // ── Hover feedback follows the rendered shape, including fractional pieces. ──
          if (hits.length > 0 && hits[0].object.userData.gridPos && hits[0].object.geometry) {
            var hoverTarget=hits[0].object, sourceGeometry=hoverTarget.geometry;
            var hoverPosition=sourceGeometry.getAttribute('position'), hoverIndex=sourceGeometry.getIndex();
            var hoverState=engine._hoverGeometryState;
            // Copy buffers only when their geometry or renderable topology changes.
            // Materials and geometry on the construction mesh remain untouched.
            if (!engine._highlightMesh || !engine._hoverGlowMesh || !hoverState ||
              hoverState.geometry!==sourceGeometry || hoverState.position!==hoverPosition || hoverState.positionVersion!==hoverPosition.version ||
              hoverState.index!==hoverIndex || hoverState.indexVersion!==(hoverIndex && hoverIndex.version)) {
              var hoverFill=sourceGeometry.clone(), hoverEdges=new THREE.EdgesGeometry(sourceGeometry);
              if (!engine._highlightMesh) {
                var hlMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.6,depthWrite:false});
                engine._highlightMesh=new THREE.LineSegments(hoverEdges,hlMat);
                engine._highlightMesh.renderOrder=998;engine._highlightMesh.matrixAutoUpdate=false;
                engine._highlightMesh.userData.gwDecorative=true;engine._highlightMesh.raycast=function(){};
                engine.scene.add(engine._highlightMesh);
              } else {engine._highlightMesh.geometry.dispose();engine._highlightMesh.geometry=hoverEdges;}
              if (!engine._hoverGlowMesh) {
                // Pull the fill slightly forward in depth without expanding its geometry.
                var hgMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.12,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
                engine._hoverGlowMesh=new THREE.Mesh(hoverFill,hgMat);
                engine._hoverGlowMesh.renderOrder=997;engine._hoverGlowMesh.matrixAutoUpdate=false;
                engine._hoverGlowMesh.userData.gwDecorative=true;engine._hoverGlowMesh.raycast=function(){};
                engine.scene.add(engine._hoverGlowMesh);
              } else {engine._hoverGlowMesh.geometry.dispose();engine._hoverGlowMesh.geometry=hoverFill;}
              engine._hoverGeometryState={geometry:sourceGeometry,position:hoverPosition,positionVersion:hoverPosition.version,index:hoverIndex,indexVersion:hoverIndex && hoverIndex.version};
            }
            hoverTarget.updateWorldMatrix(true,false);
            // Overlays are scene children; compensate for the scene transform so
            // nested parents, rotations, nonuniform scale and placement pop agree.
            engine._highlightMesh.matrix.copy(engine.scene.matrixWorld).invert().multiply(hoverTarget.matrixWorld);
            engine._hoverGlowMesh.matrix.copy(engine._highlightMesh.matrix);
            engine._highlightMesh.matrixWorldNeedsUpdate=true;engine._hoverGlowMesh.matrixWorldNeedsUpdate=true;
            engine._highlightMesh.visible=true;engine._hoverGlowMesh.visible=true;
            var isProtected=hoverTarget.userData._lessonBlock;
            var pulseT=engine.clock.getElapsedTime(),stillHover=engine._rmHover || engine._ambientMotionEnabled===false;
            engine._highlightMesh.material.color.setHex(isProtected?0xff4444:0xffffff);
            engine._highlightMesh.material.opacity=isProtected?0.3:stillHover?0.4:0.4+Math.sin(pulseT*6)*0.2;
            engine._hoverGlowMesh.material.color.setHex(isProtected?0xff4444:0xffffff);
            engine._hoverGlowMesh.material.opacity=(isProtected?0.08:stillHover?0.1:0.09+Math.sin(pulseT*6)*0.05)*(engine._dimLines && engine._dimLines.length>0?0.35:1);
          } else {
            if (engine._highlightMesh) engine._highlightMesh.visible = false;
            if (engine._hoverGlowMesh) engine._hoverGlowMesh.visible = false;
          }

`;
source=source.slice(0,start)+hover.replace(/\n/g,source.includes('\r\n')?'\r\n':'\n')+source.slice(end);
function replaceOnce(before,after){if(!source.includes(before)||source.indexOf(before)!==source.lastIndexOf(before))throw new Error('Patch anchor missing/ambiguous: '+before.slice(0,90));source=source.replace(before,after);}
replaceOnce('              engine._ghostMesh.renderOrder = 999;','              engine._ghostMesh.renderOrder = 999;\n              engine._ghostMesh.userData.gwDecorative=true;engine._ghostMesh.raycast=function(){};');
replaceOnce('              gEdges.renderOrder = 1000;','              gEdges.renderOrder = 1000;\n              gEdges.userData.gwDecorative=true;gEdges.raycast=function(){};');
source=source.replace(/            \/\/ Gentle breathing pulse — subtle opacity \+ scale oscillation so the preview\r?\n            \/\/ reads as "alive" without distracting from the block it's snapping to\./,'            // Animate opacity only: the preview keeps the exact eventual dimensions.');
const scale=/            var ghostScale = !preview.allowed \|\| engine\._rmHover \|\| engine\._ambientMotionEnabled === false \? 1\.006 : 1 \+ ghostPulse \* 0\.02;\r?\n            engine\._ghostMesh\.scale\.set\(ghostScale, ghostScale, ghostScale\);/;
if(!scale.test(source))throw new Error('Ghost scale anchor missing');
source=source.replace(scale,'            engine._ghostMesh.scale.set(1,1,1);');
replaceOnce('          if (engine._hoverGlowMesh) { engine.scene.remove(engine._hoverGlowMesh); engine._hoverGlowMesh.geometry.dispose(); engine._hoverGlowMesh.material.dispose(); }','          if (engine._hoverGlowMesh) { engine.scene.remove(engine._hoverGlowMesh); engine._hoverGlowMesh.geometry.dispose(); engine._hoverGlowMesh.material.dispose(); }\n          engine._hoverGeometryState=null;');
new vm.Script(source,{filename:file});
for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({syntax:'passed',mirror:fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)),change:'Target-geometry hover, scene-relative world matrix, exact unit-scale ghost, motion-aware opacity.'}));
