const fs=require('fs'),vm=require('vm'),file='stem_lab/stem_tool_geometryworld.js';const raw=fs.readFileSync(file,'utf8');let s=raw.replace(/\r\n/g,'\n');function replace(a,b){if(s.split(a).length!==2)throw Error('Expected one match: '+a.slice(0,100));s=s.replace(a,b);}
replace('  // Interpolate two bearings the short way round,',`  // Keep inspection shadows around the subject, even when a fitted camera is
  // far away. A manual move/look, return transition, or new lesson releases it.
  function geometryWorldShadowAnchor(engine) {
    var camera=engine.camera,creation=engine._creationFocus,preset=engine._viewPresetLighting,focus=null;
    if(creation && !creation.manual && !creation.returning && creation.lesson===engine._currentLesson && creation.frame)focus=creation.frame.target;
    if(!creation && preset && preset.lesson===engine._currentLesson && engine._viewPreset!=='free' && camera.position.distanceToSquared(preset.position)<0.0001 && Math.abs(camera.quaternion.dot(preset.quaternion))>0.999999)focus=preset.target;
    if(focus && [focus.x,focus.y,focus.z].every(function(v){return typeof v==='number' && isFinite(v);}))return {x:focus.x,y:focus.y,z:focus.z};
    var ground=engine._currentLesson && engine._currentLesson.ground;
    return {x:camera.position.x,y:ground && Number.isFinite(ground.y)?ground.y:0,z:camera.position.z};
  }
  // Interpolate two bearings the short way round,`);
replace('          engine._viewPreset = selected;',`          var lightingCamera=engine.camera.clone();lightingCamera.position.copy(toPosition);lightingCamera.lookAt(toTarget);
          engine._viewPresetLighting=selected==='free'?null:{lesson:engine._currentLesson,position:toPosition.clone(),quaternion:lightingCamera.quaternion.clone(),target:toTarget.clone()};
          engine._viewPreset = selected;`);
replace('            var stx = Math.round(engine.camera.position.x / texel) * texel;\n            var stz = Math.round(engine.camera.position.z / texel) * texel;\n            if (engine._sunTarget) { engine._sunTarget.position.set(stx, 0, stz); engine._sunTarget.updateMatrixWorld(); }\n            engine.sun.position.set(stx + sdir.x * sd, sdir.y * sd, stz + sdir.z * sd);',`            var shadowAnchor=geometryWorldShadowAnchor(engine);
            var stx = Math.round(shadowAnchor.x / texel) * texel;
            var sty = Math.round(shadowAnchor.y / texel) * texel;
            var stz = Math.round(shadowAnchor.z / texel) * texel;
            if (engine._sunTarget) { engine._sunTarget.position.set(stx, sty, stz); engine._sunTarget.updateMatrixWorld(); }
            engine.sun.position.set(stx + sdir.x * sd, sty + sdir.y * sd, stz + sdir.z * sd);`);
replace('          try { Object.keys(engine._matCache || {}).forEach(function(k) { assign(engine._matCache[k]); }); } catch (e) {}',`          try { Object.keys(engine._matCache || {}).forEach(function(k) { assign(engine._matCache[k]); }); } catch (e) {}
          if(engine._buildBatchPreview && engine._buildBatchPreview.surfaces)engine._buildBatchPreview.surfaces.traverse(function(part){assign(part.material);});`);
new vm.Script(s);const data=Buffer.from(raw.includes('\r\n')?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}console.log('Updated inspection shadows and preview reflection refresh');
