const fs=require('node:fs');
const canonical='stem_lab/stem_tool_geometryworld_builder.js',mirror='desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js';
const original=fs.readFileSync(canonical,'utf8');let source=original.replace(/\r\n/g,'\n');
function once(before,after){if(source.split(before).length!==2)throw new Error('Ambiguous patch: '+before.slice(0,100));source=source.replace(before,after);}
once('  function showcaseBuild(ctx) {',`  // Measure only the persistent presentation controls. File panels, PNG buffer
  // sizes and the hidden building HUD do not change the model composition.
  function showcaseCompositionRect(engine) {
    var canvas=engine && engine.renderer && engine.renderer.domElement,area=null;
    if(canvas && typeof canvas.getBoundingClientRect==='function')area=canvas.getBoundingClientRect();
    var measured=!!(area && area.width>0 && area.height>0);
    var width=measured?area.width:Number(canvas && (canvas.clientWidth || canvas.width)) || 800;
    var height=measured?area.height:Number(canvas && (canvas.clientHeight || canvas.height)) || 600;
    if(!isFinite(width) || width<=0)width=800;if(!isFinite(height) || height<=0)height=600;
    var origin={left:measured?area.left:0,top:measured?area.top:0,width:width,height:height};
    var margin=Math.min(12,width*0.04,height*0.04),gap=10;
    var pixels={left:margin,right:width-margin,top:margin,bottom:height-margin},observed=false;
    var workspace=canvas && canvas.closest && canvas.closest('#geoworld-fs-workspace');
    var overlay=workspace && workspace.querySelector && workspace.querySelector('.gwe-showcase');
    if(measured && overlay && overlay.querySelectorAll)overlay.querySelectorAll('.gwe-showcase-caption,.gwe-showcase-tools,.gwe-showcase-orbit').forEach(function(node){
      var style=window.getComputedStyle?window.getComputedStyle(node):null,r=node.getBoundingClientRect();
      if(style && (style.display==='none' || style.visibility==='hidden') || !r.width || !r.height)return;
      var left=r.left-origin.left,right=r.right-origin.left,top=r.top-origin.top,bottom=r.bottom-origin.top;
      if(right<=0 || left>=width || bottom<=0 || top>=height)return;
      observed=true;
      if(node.classList.contains('gwe-showcase-caption'))pixels.top=Math.max(pixels.top,bottom+gap);
      else if(node.classList.contains('gwe-showcase-tools'))pixels.bottom=Math.min(pixels.bottom,top-gap);
      else if((left+right)/2<width/2)pixels.left=Math.max(pixels.left,right+gap);
      else pixels.right=Math.min(pixels.right,left-gap);
    });
    // A first/no-DOM fit stays usable until the committed controls are measured.
    if(!observed || pixels.right<=pixels.left || pixels.bottom<=pixels.top){
      pixels={left:width*0.12,right:width*0.88,top:height*0.2,bottom:height*0.78};observed=false;
    }
    pixels.left=Math.max(0,pixels.left);pixels.right=Math.min(width,pixels.right);pixels.top=Math.max(0,pixels.top);pixels.bottom=Math.min(height,pixels.bottom);
    return {rect:{left:pixels.left/width*2-1,right:pixels.right/width*2-1,bottom:1-pixels.bottom/height*2,top:1-pixels.top/height*2},pixelRect:pixels,canvasRect:origin,fallback:!observed};
  }
  // Fit perspective depth into an offset rectangle without changing the chosen
  // bearing. A ground constraint raises the parallel view only when necessary.
  function fitShowcaseCamera(box,camera,rect,bearing,screenUp,minCameraY) {
    var THREE=window.THREE;
    if(!THREE || !box || !box.min || !box.max || !camera || !bearing || !screenUp)return null;
    var coordinates=[box.min.x,box.min.y,box.min.z,box.max.x,box.max.y,box.max.z];
    if(!coordinates.every(function(n){return typeof n==='number' && isFinite(n);}) || box.min.x>box.max.x || box.min.y>box.max.y || box.min.z>box.max.z)return null;
    var aspect=Number(camera.aspect),fov=Number(camera.getEffectiveFOV?camera.getEffectiveFOV():camera.fov);
    if(!isFinite(aspect) || aspect<=0 || !isFinite(fov) || fov<=0 || fov>=179.9)return null;
    var direction=bearing.clone().normalize(),right=new THREE.Vector3().crossVectors(screenUp,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
    if(![direction.x,direction.y,direction.z,right.x,right.y,right.z,up.x,up.y,up.z].every(isFinite) || direction.lengthSq()<0.99 || right.lengthSq()<0.99)return null;
    rect=rect || {left:-0.8,right:0.8,bottom:-0.6,top:0.7};
    if(![rect.left,rect.right,rect.bottom,rect.top].every(function(n){return typeof n==='number' && isFinite(n);}))return null;
    var left=Math.max(-1,rect.left),rightEdge=Math.min(1,rect.right),bottom=Math.max(-1,rect.bottom),top=Math.min(1,rect.top);
    if(rightEdge<=left || top<=bottom)return null;
    var cx=(left+rightEdge)/2,cy=(bottom+top)/2,hx=(rightEdge-left)*0.48,hy=(top-bottom)*0.48;
    var safe={left:cx-hx,right:cx+hx,bottom:cy-hy,top:cy+hy},tanY=Math.tan(fov*Math.PI/360),tanX=tanY*aspect;
    var near=Number(camera.near);if(!isFinite(near) || near<=0)near=0.1;
    var clearance=Math.max(0.05,near*0.5),distance=near+clearance,upperDistance=Infinity,corners=[];
    var center=box.getCenter(new THREE.Vector3());
    [box.min.x,box.max.x].forEach(function(x){[box.min.y,box.max.y].forEach(function(y){[box.min.z,box.max.z].forEach(function(z){
      var point=new THREE.Vector3(x,y,z).sub(center),px=point.dot(right),py=point.dot(up),pz=point.dot(direction);
      corners.push({x:px,y:py,z:pz});
      distance=Math.max(distance,pz+near+clearance,pz+Math.abs(px+cx*pz*tanX)/(hx*tanX),pz+Math.abs(py+cy*pz*tanY)/(hy*tanY));
    });});});
    function constrain(slope,amount){
      if(Math.abs(slope)<1e-10){if(amount>1e-8)upperDistance=-Infinity;}
      else if(slope>0)distance=Math.max(distance,amount/slope);
      else upperDistance=Math.min(upperDistance,amount/slope);
    }
    var floor=typeof minCameraY==='number' && isFinite(minCameraY)?minCameraY:-Infinity;
    var heightSlope=direction.y-cx*tanX*right.y;
    if(isFinite(floor)){
      if(Math.abs(up.y)>1e-10){
        var groundConstant=(floor-center.y)/up.y,groundSlope=-heightSlope/up.y;
        corners.forEach(function(point){
          if(up.y>0)constrain(-groundSlope-safe.bottom*tanY,groundConstant-point.y-safe.bottom*tanY*point.z);
          else constrain(groundSlope+safe.top*tanY,point.y+safe.top*tanY*point.z-groundConstant);
        });
      }else constrain(heightSlope,floor-center.y);
    }
    distance+=Math.max(0.00001,distance*1e-7);
    if(!isFinite(distance) || distance>upperDistance+1e-7)return null;
    var sx=-cx*distance*tanX,sy=-cy*distance*tanY;
    if(isFinite(floor) && Math.abs(up.y)>1e-10){
      var groundShift=(floor-center.y-distance*direction.y-sx*right.y)/up.y;
      sy=up.y>0?Math.max(sy,groundShift):Math.min(sy,groundShift);
    }
    var shift=right.clone().multiplyScalar(sx).addScaledVector(up,sy),target=center.clone().add(shift),position=target.clone().addScaledVector(direction,distance);
    var depthNear=Infinity,depthFar=-Infinity;corners.forEach(function(point){depthNear=Math.min(depthNear,distance-point.z);depthFar=Math.max(depthFar,distance-point.z);});
    var diagonal=box.getSize(new THREE.Vector3()).length(),oldFar=Number(camera.far),far=Math.max(isFinite(oldFar)?oldFar:200,depthFar+Math.max(10,diagonal*0.05));
    if(![position.x,position.y,position.z,target.x,target.y,target.z,depthNear,depthFar,far].every(isFinite))return null;
    return {position:position,target:target,distance:distance,far:far,depthNear:depthNear,depthFar:depthFar,rect:safe};
  }
  function scheduleShowcaseLayoutFit(engine) {
    var session=engine && engine._showcase;
    if(!session || !engine.fitShowcase)return;
    if(session.fitFrame!=null && window.cancelAnimationFrame)window.cancelAnimationFrame(session.fitFrame);
    if(!window.requestAnimationFrame){engine.fitShowcase();return;}
    session.fitFrame=window.requestAnimationFrame(function(){session.fitFrame=null;if(engine._showcase===session && !engine._destroyed && engine.fitShowcase)engine.fitShowcase();});
    return function(){if(session.fitFrame!=null && window.cancelAnimationFrame)window.cancelAnimationFrame(session.fitFrame);session.fitFrame=null;};
  }
  function showcaseBuild(ctx) {`);
once('    var box = new THREE.Box3();\n    selected.measurement.blocks.forEach(function(p){box.expandByObject(engine.blocks[keyFor(p)]);});','    var box = creationGeometryBounds(engine,selected.measurement.blocks);');
once("    var corners=[];\n    [box.min.x,box.max.x].forEach(function(x){[box.min.y,box.max.y].forEach(function(y){[box.min.z,box.max.z].forEach(function(z){corners.push(new THREE.Vector3(x,y,z).sub(center));});});});\n",'');
const start=source.indexOf('    engine.fitShowcase=function(){'),end=source.indexOf('    engine.endShowcase=function(){',start);
if(start<0 || end<start)throw new Error('Fit boundaries missing');
source=source.slice(0,start)+`    engine.fitShowcase=function(){
      if(engine._showcase!==saved || engine._destroyed || engine._showcaseExporting)return false;
      camera.fov=42;camera.updateProjectionMatrix();
      var viewUp=new THREE.Vector3(0,saved.view==='top'?0:1,saved.view==='top'?-1:0);
      var composition=showcaseCompositionRect(engine),ground=engine._currentLesson && engine._currentLesson.ground;
      var groundY=ground && typeof ground.y==='number' && isFinite(ground.y)?ground.y:0;
      var minCameraY=Math.max(groundY+0.15,box.min.y+0.03);
      var fit=fitShowcaseCamera(box,camera,composition.rect,direction,viewUp,minCameraY);if(!fit)return false;
      camera.up.copy(viewUp);camera.far=Math.max(saved.far,fit.far);camera.updateProjectionMatrix();
      camera.position.copy(fit.position);camera.lookAt(fit.target);
      if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);camera.updateMatrixWorld(true);
      if(saved.fog && engine.scene.fog){engine.scene.fog.near=Math.max(saved.fog.near,fit.depthFar+2);engine.scene.fog.far=Math.max(saved.fog.far,engine.scene.fog.near+Math.max(80,radius));}
      if(saved.studio && saved.studio.floor){
        var tangent=Math.tan(camera.getEffectiveFOV()*Math.PI/360);
        var fogDepth=engine.scene.fog && isFinite(engine.scene.fog.far)?engine.scene.fog.far:camera.far;
        var fogCornerDistance=fogDepth*Math.sqrt(1+tangent*tangent*(1+camera.aspect*camera.aspect));
        // The stage remains centered on the creation, including an offset view.
        var floorHalf=Math.max(300,camera.position.distanceTo(center)+fogCornerDistance+radius+10);
        saved.studio.floor.scale.set(floorHalf/300,floorHalf/300,1);
      }
      var area=composition.canvasRect,rect=fit.rect;
      saved.composition={rect:rect,pixelRect:{left:(rect.left+1)*area.width/2,right:(rect.right+1)*area.width/2,top:(1-rect.top)*area.height/2,bottom:(1-rect.bottom)*area.height/2},canvasRect:area,fallback:composition.fallback,position:fit.position.clone(),target:fit.target.clone(),depthNear:fit.depthNear,depthFar:fit.depthFar,bounds:box.clone(),minCameraY:minCameraY,view:saved.view};
      return true;
    };
`+source.slice(end);
once('      var previous=engine._showcase;if(!previous)return;\n      disposeStudioLook();','      var previous=engine._showcase;if(!previous)return;\n      if(previous.fitFrame!=null && window.cancelAnimationFrame)window.cancelAnimationFrame(previous.fitFrame);previous.fitFrame=null;\n      disposeStudioLook();');
once('      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);',`      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);
      React.useEffect(function () {
        if(data.showcaseActive)return scheduleShowcaseLayoutFit(window[ENGINE_KEY]);
      },[data.showcaseActive]);`);
once('    studioGroundFootprints:studioGroundFootprints, studioContactMap:studioContactMap,','    studioGroundFootprints:studioGroundFootprints, studioContactMap:studioContactMap,\n    showcaseCompositionRect:showcaseCompositionRect, fitShowcaseCamera:fitShowcaseCamera,');
new Function(source);const output=original.includes('\r\n')?source.replace(/\n/g,'\r\n'):source;
for(const path of [canonical,mirror]){const fd=fs.openSync(path,'r+');try{fs.writeFileSync(fd,output);fs.ftruncateSync(fd,Buffer.byteLength(output));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({syntax:true,mirrorIdentical:fs.readFileSync(canonical).equals(fs.readFileSync(mirror)),bytes:Buffer.byteLength(output)}));
