const assert=require('node:assert/strict');
const changes=[
  {
    "label": "visible camera mode with stable control name",
    "before": "        var viewButton=uiButton('View',function(){closeMobileTools(false);cycleCamera();});",
    "after": "        var viewButton=uiButton('View · Follow',function(){closeMobileTools(false);cycleCamera();});\n        viewButton.setAttribute('aria-label','View');viewButton.title='Follow view. V or View cycles Follow, Side, Tactical and Hunt.';"
  },
  {
    "label": "four explicit camera views",
    "before": "        function cycleCamera(){gameState.cameraMode=((gameState.cameraMode||0)+1)%3;if(gameState.paused&&!inspection.active){updateDiveCamera(0,true);if(targetHalo.visible)targetHalo.quaternion.copy(camera.quaternion);}clAnnounce(['Follow view','Side view','Tactical view'][gameState.cameraMode]);canvasEl.focus();}",
    "after": "        function cycleCamera(){gameState.cameraMode=((gameState.cameraMode||0)+1)%4;var names=['Follow','Side','Tactical','Hunt'];viewButton.textContent='View · '+names[gameState.cameraMode];viewButton.title=names[gameState.cameraMode]+' view. V or View cycles Follow, Side, Tactical and Hunt.';if(!inspection.active&&(gameState.paused||gameState.cameraMode===3)){updateDiveCamera(0,true);if(targetHalo.visible)targetHalo.quaternion.copy(camera.quaternion);}clAnnounce(names[gameState.cameraMode]+' view');canvasEl.focus();}"
  },
  {
    "label": "owned hunt camera framing and projected bounds",
    "before": "        function updateDiveCamera(dt,snap){",
    "after": "        // Hunt view measures the existing animal; no scene objects or materials are added.\n        var huntCameraFrame={ready:false,distance:0,hasPrey:false,boundsVersions:new WeakMap(),look:new THREE.Vector3(),desiredLook:new THREE.Vector3(),prey:new THREE.Vector3(),bounds:new THREE.Box3(),part:new THREE.Box3(),inverse:new THREE.Matrix4(),relative:new THREE.Matrix4(),point:new THREE.Vector3(),direction:new THREE.Vector3(),right:new THREE.Vector3(),up:new THREE.Vector3(),offset:new THREE.Vector3()};\n        function measureHuntCameraFrame(dt,snap){\n          var frame=huntCameraFrame;octopus.updateWorldMatrix(true,true);frame.inverse.copy(octopus.matrixWorld).invert();frame.bounds.makeEmpty();\n          octopus.traverse(function(obj){\n            if(!obj.isMesh||obj.isInstancedMesh||!obj.geometry)return;\n            for(var ancestor=obj;ancestor&&ancestor!==octopus.parent;ancestor=ancestor.parent)if(!ancestor.visible)return;\n            // Tubes, fins and mantle can deform. Refresh their retained bounds before fitting.\n            var geometry=obj.geometry,position=geometry.attributes.position;\n            if(!geometry.boundingBox||frame.boundsVersions.get(geometry)!==position.version){geometry.computeBoundingBox();frame.boundsVersions.set(geometry,position.version);}\n            if(!geometry.boundingBox||geometry.boundingBox.isEmpty())return;\n            frame.relative.multiplyMatrices(frame.inverse,obj.matrixWorld);frame.bounds.union(frame.part.copy(obj.geometry.boundingBox).applyMatrix4(frame.relative));\n          });\n          if(frame.bounds.isEmpty())frame.bounds.set(new THREE.Vector3(-1.7,-0.6,-1.5).multiplyScalar(bodyScale),new THREE.Vector3(1.7,0.8,2).multiplyScalar(bodyScale));\n          frame.bounds.expandByScalar(0.14*bodyScale);frame.bounds.getCenter(frame.desiredLook).applyMatrix4(octopus.matrixWorld);\n          // Keep the accepted catch in frame through recovery, including after prey disposal.\n          var visual=octopusStrikeVisual||squidStrikeVisual,tracked=gameState.pendingStrike?gameState.pendingStrike.target:selectedPrey;\n          var focus=visual?visual.aimWorld:tracked&&tracked.userData.alive?tracked.position:null,maxFocus=Math.max(4.5,Math.min(6,3.8*bodyScale));\n          frame.hasPrey=!!(focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.y)&&Number.isFinite(focus.z)&&focus.distanceToSquared(octopus.position)<=maxFocus*maxFocus);\n          if(frame.hasPrey){frame.prey.copy(focus);frame.desiredLook.lerp(frame.prey,0.30);}\n          var step=Math.max(0,Math.min(0.05,dt||0)),immediate=!frame.ready||snap||gameState.a11y.reducedMotion;\n          frame.look.lerp(frame.desiredLook,immediate?1:1-Math.exp(-5*step));frame.ready=true;\n          return immediate;\n        }\n        function fitHuntCameraDistance(direction){\n          var frame=huntCameraFrame;frame.right.crossVectors(camera.up,direction).normalize();frame.up.crossVectors(direction,frame.right).normalize();\n          var tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*Math.max(0.25,Math.min(4,camera.aspect||1)),distance=2.6*bodyScale;\n          for(var group=0;group<(frame.hasPrey?2:1);group++)for(var corner=0;corner<8;corner++){\n            if(group===0){frame.point.set(corner&1?frame.bounds.max.x:frame.bounds.min.x,corner&2?frame.bounds.max.y:frame.bounds.min.y,corner&4?frame.bounds.max.z:frame.bounds.min.z).applyMatrix4(octopus.matrixWorld);}\n            else frame.point.set(frame.prey.x+(corner&1?0.45:-0.45),frame.prey.y+(corner&2?0.45:-0.45),frame.prey.z+(corner&4?0.45:-0.45));\n            frame.point.sub(frame.look);var depth=frame.point.dot(direction);\n            distance=Math.max(distance,depth+Math.abs(frame.point.dot(frame.right))/(tanH*0.82),depth+Math.abs(frame.point.dot(frame.up))/(tanV*0.74),depth+camera.near+0.20);\n          }\n          return distance+0.12*bodyScale;\n        }\n        function updateDiveCamera(dt,snap){"
  },
  {
    "label": "front quarter hunt angle",
    "before": "gameState.facingAngle+(view===1?Math.PI/2:0)",
    "after": "gameState.facingAngle+(view===1?Math.PI/2:view===3?-Math.PI*0.74:0)"
  },
  {
    "label": "fit live hunt view before ordinary clearance",
    "before": "          var camTarget=cameraLook.clone().add(camOff),camDir=camOff.clone().normalize();",
    "after": "          var huntCameraSnap=false,hunting=!inspection.active&&view===3;\n          if(hunting){\n            huntCameraSnap=measureHuntCameraFrame(dt,snap);cameraLook.copy(huntCameraFrame.look);\n            huntCameraFrame.direction.set(-Math.sin(camAngle)*Math.cos(0.24),Math.sin(0.24),-Math.cos(camAngle)*Math.cos(0.24));\n            var needed=fitHuntCameraDistance(huntCameraFrame.direction),ease=huntCameraSnap?1:1-Math.exp(-3.5*Math.max(0,Math.min(0.05,dt||0)));\n            huntCameraFrame.distance=Math.max(needed,huntCameraFrame.distance+(needed-huntCameraFrame.distance)*ease);\n            camOff.copy(huntCameraFrame.direction).multiplyScalar(huntCameraFrame.distance);\n          }else huntCameraFrame.ready=false;\n          var camTarget=cameraLook.clone().add(camOff),camDir=camOff.clone().normalize();"
  },
  {
    "label": "explicit hunt view entry without cutting through the animal",
    "before": "          if(snap&&!inspection.active)camera.position.copy(camTarget);",
    "after": "          if((snap||huntCameraSnap)&&!inspection.active)camera.position.copy(camTarget);"
  },
  {
    "label": "retain framing through live turns while respecting cover",
    "before": "          camera.lookAt(cameraLook);camera.updateMatrixWorld();",
    "after": "          if(hunting&&(!cameraHits||!cameraHits.length)){\n            // A follow interpolation chord may move inward. Fit the actual viewing direction too.\n            huntCameraFrame.offset.subVectors(camera.position,cameraLook);var currentDistance=huntCameraFrame.offset.length();\n            if(currentDistance>0.0001){\n              huntCameraFrame.offset.multiplyScalar(1/currentDistance);var currentFit=fitHuntCameraDistance(huntCameraFrame.offset);\n              if(currentDistance<currentFit){\n                cameraRay.set(cameraLook,huntCameraFrame.offset);cameraRay.far=currentFit;\n                var huntHits=cameraRay.intersectObjects(rocks,false);\n                if(!huntHits.length)camera.position.copy(cameraLook).addScaledVector(huntCameraFrame.offset,currentFit);\n              }\n            }\n            camera.position.y=Math.max(camera.position.y,terrainHeight(camera.position.x,camera.position.z)+0.65);\n          }\n          camera.lookAt(cameraLook);camera.updateMatrixWorld();"
  },
  {
    "label": "refit Hunt view on resize while paused",
    "before": "camera.updateProjectionMatrix();if(inspection.active)frameInspection(false);renderer.setSize(nW,nH,false);",
    "after": "camera.updateProjectionMatrix();if(inspection.active)frameInspection(false);else if(gameState.cameraMode===3){updateDiveCamera(0,true);if(targetHalo.visible)targetHalo.quaternion.copy(camera.quaternion);}renderer.setSize(nW,nH,false);"
  }
];
// Pass54 changes only camera presentation. Exact inverse guards protect old baselines.
function restorePass54Source(source){
  if(source.includes('        function shadeCLHuntWaterSurface('))source=require('./cephalopod_pass55_reference.cjs').restorePass55Source(source);
  const animalOnly=source.trimStart().startsWith('function createCLHuntAnimal(');
  assert.ok(animalOnly||source.includes('function initHuntSim3D('),'Pass54 requires the full tool or animal factory');
  if(animalOnly)return source;
  for(const c of [...changes].reverse()){assert.equal(source.split(c.after).length-1,1,'Pass54 inverse guard: '+c.label);source=source.replace(c.after,c.before);}
  return source;
}
module.exports={restorePass54Source};
