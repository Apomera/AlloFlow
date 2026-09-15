const fs=require('fs'),assert=require('assert');
function edit(path,run){const original=fs.readFileSync(path,'utf8'),crlf=original.includes('\r\n');let source=original.replace(/\r\n/g,'\n');function replace(old,next){assert.equal(source.split(old).length,2,'Unique anchor: '+old.slice(0,100));source=source.replace(old,next);}run(replace);const output=crlf?source.replace(/\n/g,'\r\n'):source,fd=fs.openSync(path,'r+');try{fs.writeSync(fd,output);fs.ftruncateSync(fd,Buffer.byteLength(output));}finally{fs.closeSync(fd);}}
edit('stem_lab/stem_tool_geometryworld.js',replace=>{
  replace('          engine.drawAtCrosshair=function() {',`          // A fitted creation can sit well beyond walking reach. Keep its drawing
          // ray separate so single blocks, measurements and NPCs retain their range.
          engine.getDrawingReach=function() {
            var focus=engine._creationFocus;
            var fitted=focus && !focus.manual && (!focus.lesson || focus.lesson===engine._currentLesson);
            var preset=['front','side','top'].indexOf(engine._viewPreset)>=0;
            return engine._drawMode!=='single' && (fitted || preset) ? 160 : 8;
          };
          engine.drawingHitAt=function(ndc) {
            if(!engine.isDrawingAllowed() || !engine.camera)return null;
            var ray=engine._drawingRaycaster || (engine._drawingRaycaster=new THREE.Raycaster());
            ray.far=engine.getDrawingReach();
            engine.camera.updateMatrixWorld(true);
            ray.setFromCamera(ndc || new THREE.Vector2(0,0),engine.camera);
            var hits=ray.intersectObjects(engine.getRaycastTargets ? engine.getRaycastTargets():engine.getBlocksArr());
            return hits.length ? hits[0]:null;
          };
          engine.drawAtCrosshair=function() {`);
  replace('\n            var hit=engine.blockUnderCrosshair && engine.blockUnderCrosshair(),cell=engine.placementCellForHit(hit);','\n            var hit=engine.drawingHitAt(),cell=engine.placementCellForHit(hit);');
  replace('              var hit=engine.blockUnderCrosshair && engine.blockUnderCrosshair(),cell=engine.placementCellForHit(hit);','              var hit=engine.drawingHitAt(),cell=engine.placementCellForHit(hit);');
  replace(`          var rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
          ray.far=extend?160:8;
          ray.setFromCamera(new THREE.Vector2((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1),engine.camera);`, `          var rect=canvas.getBoundingClientRect();
          if(!rect.width || !rect.height)return null;
          var ndc=new THREE.Vector2((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1);
          if(!extend)return engine.placementCellForHit(engine.drawingHitAt(ndc));
          var ray=new THREE.Raycaster();ray.far=160;
          engine.camera.updateMatrixWorld(true);ray.setFromCamera(ndc,engine.camera);`);
});
edit('tests/geometry_world_drawing_tools.test.js',replace=>{
  replace('e.blockUnderCrosshair=()=>hit;e.setDrawMode(\'floor\');','e.drawingHitAt=()=>hit;e.setDrawMode(\'floor\');');
  replace(" it.each(['showGeometryHome','showNpcDialog','showActivityGuide'])",` it.each(['focused','front','side','top'])('starts mouse and keyboard drawing beyond walking reach in %s view',view=>{
  const f=makeFixture(),e=f.engine,ground=place(f,block(0,0,0));ground.userData._lessonBlock=true;ground.updateMatrixWorld(true);e._undoStack=[];e.raycaster=new THREE.Raycaster();e.raycaster.far=8;
  e.camera.position.set(.5,40,.5);e.camera.lookAt(.5,.5,.5);e.camera.updateMatrixWorld(true);e.setDrawMode('floor');
  if(view==='focused')e._creationFocus={manual:false,lesson:e._currentLesson};else e._viewPreset=view;
  const pointerStart=source.indexOf('        function drawingPointerCell('),pointerEnd=source.indexOf("        canvas.addEventListener('pointerdown'",pointerStart);
  const pointer=new Function('canvas','engine','THREE',source.slice(pointerStart,pointerEnd)+'return drawingPointerCell;')({getBoundingClientRect:()=>({left:100,top:50,width:800,height:600})},e,THREE);
  expect(pointer({clientX:500,clientY:350},false)).toEqual({x:0,y:1,z:0});expect(e.drawingHitAt().distance).toBeCloseTo(39);expect(e.drawAtCrosshair()).toBe(true);expect(e._drawStart).toEqual({x:0,y:1,z:0});expect(e.raycaster.far).toBe(8);
  e.setDrawMode('single');expect(e.getDrawingReach()).toBe(8);const before=Object.keys(e.blocks);expect(e.interactAtCrosshair('place')).toBeNull();expect(Object.keys(e.blocks)).toEqual(before);
 });
 it('keeps manual and stale focused views at walking reach and caps fitted drawing at 160',()=>{
  const e=makeFixture().engine,ground=e.placeBlock(0,0,0,'stone','cube',0);ground.updateMatrixWorld(true);e.setDrawMode('line');e.camera.position.set(.5,40,.5);e.camera.lookAt(.5,.5,.5);e._viewPreset='free';
  expect(e.drawingHitAt()).toBeNull();e._creationFocus={manual:true,lesson:e._currentLesson};expect(e.drawingHitAt()).toBeNull();e._creationFocus={manual:false,lesson:{}};expect(e.drawingHitAt()).toBeNull();e._creationFocus={manual:false,lesson:e._currentLesson};expect(e.drawingHitAt()).not.toBeNull();
  e.camera.position.y=200;expect(e.drawingHitAt()).toBeNull();expect(e._drawingRaycaster.far).toBe(160);
 });
 it('updates the B/touch endpoint from the same distant fitted ray as its initial point',()=>{
  const e=makeFixture().engine;[0,3].forEach(x=>{const mesh=e.placeBlock(x,0,0,'stone','cube',0);mesh.userData._lessonBlock=true;mesh.updateMatrixWorld(true);});e._undoStack=[];e.setDrawMode('line');e._viewPreset='top';e.camera.position.set(.5,40,.5);e.camera.lookAt(.5,.5,.5);expect(e.drawAtCrosshair()).toBe(true);e.camera.position.x=3.5;e.camera.lookAt(3.5,.5,.5);e.updateDrawingPreview();expect(e._drawEnd).toEqual({x:3,y:1,z:0});expect(e._drawPlan.count).toBe(4);expect(e.drawAtCrosshair()).toBe(true);expect(e._undoStack).toHaveLength(1);expect([0,1,2,3].every(x=>!!e.blocks[x+',1,0'])).toBe(true);
 });
 it.each(['showGeometryHome','showNpcDialog','showActivityGuide'])`);
});
console.log('Aligned focused drawing reach across pointer, B/touch, and live preview while preserving single-block reach.');
