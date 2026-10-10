const assert=require('node:assert/strict');
const changes=[
  {
    "label": "finite octopus grab intent",
    "before": "    var squidStrikePreparation=0,squidStrikeBrace=0,squidStrikeEnvelope=false;",
    "after": "    var octopusGrabAim=!swimming&&motion&&state.strikeAim&&Number.isFinite(state.strikeAim.x)&&Number.isFinite(state.strikeAim.y)&&Number.isFinite(state.strikeAim.z)?state.strikeAim:null;\n    var octopusGrabBrace=octopusGrabAim&&Number.isFinite(state.strikeBrace)?Math.max(0,Math.min(1,state.strikeBrace)):0;\n    var octopusGrabRadius=octopusGrabAim&&Number.isFinite(state.strikeRadius)&&state.strikeRadius>0?Math.max(0.08,Math.min(0.65,state.strikeRadius)):0.13;\n    var squidStrikePreparation=0,squidStrikeBrace=0,squidStrikeEnvelope=false;",
    "scope": "animal"
  },
  {
    "label": "three leading arms unfold before reaching",
    "before": "      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;",
    "after": "      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;\n      var grabbing=octopusGrabAim&&l.index>=1&&l.index<=3,armJet=grabbing?jet*(1-octopusGrabBrace*0.15):jet;",
    "scope": "animal"
  },
  {
    "label": "directed grasp and curved tip recovery",
    "before": "        }else{\n          x=Math.cos(ang)*(0.24+reach)*compress;\n          z=0.20+Math.sin(ang)*(0.24+reach)*compress;\n          if(jet>0){\n            // Integrate directions at fixed segment lengths. Blending endpoint\n            // positions or subtracting forward reach collapses the front arm.\n            if(j>0){\n              var sweep=Math.min(1,(t-0.5/rings)/0.72);sweep=sweep*sweep*(3-2*sweep);\n              var heading=ang+streamYaw*jet*(0.30+0.70*sweep),segment=l.length*compress/rings;\n              streamX+=Math.cos(heading)*segment;streamZ+=Math.sin(heading)*segment;\n            }\n            x=streamX;z=streamZ;\n          }\n          y=-0.22-Math.sin(t*Math.PI/2)*0.24+Math.max(0,walk)*Math.sin(t*Math.PI)*0.13*(0.3+octopusMoveBlend*0.7)*(1-jet*0.85);\n          var armDrift=Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion*(1-jet*0.78);\n          x+=Math.cos(ang+Math.PI/2)*armDrift;\n          z+=Math.sin(ang+Math.PI/2)*armDrift;\n          y+=Math.pow(t,7)*(0.12-jet*0.04)+jet*t*(0.025+Math.sin(ang)*0.10);\n          if(strike>0&&Math.sin(ang)>0){z+=strike*t*0.55;y+=strike*t*0.15;}\n        }",
    "after": "        }else{\n          x=Math.cos(ang)*(0.24+reach)*compress;\n          z=0.20+Math.sin(ang)*(0.24+reach)*compress;\n          if(armJet>0){\n            // Integrate directions at fixed segment lengths. Blending endpoint\n            // positions or subtracting forward reach collapses the front arm.\n            if(j>0){\n              var sweep=Math.min(1,(t-0.5/rings)/0.72);sweep=sweep*sweep*(3-2*sweep);\n              var heading=ang+streamYaw*armJet*(0.30+0.70*sweep),segment=l.length*compress/rings;\n              streamX+=Math.cos(heading)*segment;streamZ+=Math.sin(heading)*segment;\n            }\n            x=streamX;z=streamZ;\n          }\n          y=-0.22-Math.sin(t*Math.PI/2)*0.24+Math.max(0,walk)*Math.sin(t*Math.PI)*0.13*(0.3+octopusMoveBlend*0.7)*(1-armJet*0.85);\n          var armDrift=Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion*(1-armJet*0.78);\n          x+=Math.cos(ang+Math.PI/2)*armDrift;\n          z+=Math.sin(ang+Math.PI/2)*armDrift;\n          y+=Math.pow(t,7)*(0.12-armJet*0.04)+armJet*t*(0.025+Math.sin(ang)*0.10);\n          if(!grabbing&&strike>0&&Math.sin(ang)>0){z+=strike*t*0.55;y+=strike*t*0.15;}\n          if(grabbing&&strike>0){\n            // Reach with the sucker-bearing section, then curl the remaining tip\n            // around the prey. The three arms approach separate contact points.\n            var grabSide=2-l.index,approachX=octopusGrabAim.x,approachY=octopusGrabAim.y+0.22,approachZ=octopusGrabAim.z-0.20;\n            var approachLength=Math.hypot(approachX,approachY,approachZ);\n            if(approachLength<0.0001){approachX=0;approachY=0;approachZ=1;approachLength=1;}\n            approachX/=approachLength;approachY/=approachLength;approachZ/=approachLength;\n            var grabHorizontal=Math.hypot(approachX,approachZ),acrossX=grabHorizontal>0.0001?approachZ/grabHorizontal:1,acrossZ=grabHorizontal>0.0001?-approachX/grabHorizontal:0;\n            var grabUpX=approachY*acrossZ,grabUpY=approachZ*acrossX-approachX*acrossZ,grabUpZ=-approachY*acrossX;\n            var lift=octopusGrabRadius*(grabSide?0.32:0.60),offsetX=acrossX*grabSide*octopusGrabRadius+grabUpX*lift,offsetY=grabUpY*lift,offsetZ=acrossZ*grabSide*octopusGrabRadius+grabUpZ*lift;\n            var contactX=octopusGrabAim.x+offsetX,contactY=octopusGrabAim.y+offsetY,contactZ=octopusGrabAim.z+offsetZ;\n            var anchorX=Math.cos(ang)*0.24*compress,anchorY=-0.22,anchorZ=0.20+Math.sin(ang)*0.24*compress;\n            var grabU=Math.min(1,t/0.70),grabV=1-grabU,grabUU=grabU*grabU,grabVV=grabV*grabV;\n            var control1X=anchorX+Math.cos(ang)*0.34,control1Y=anchorY-0.015,control1Z=anchorZ+Math.sin(ang)*0.34;\n            // An outward shoulder gives rearward reaches room to turn beneath the head.\n            var shoulderRoom=Math.max(0,1-approachLength/0.8);\n            control1X+=(grabSide||1)*shoulderRoom*0.30;\n            if(approachZ<0){control1X+=(grabSide||1)*(-approachZ)*0.32;control1Z+=0.10*(-approachZ);}\n            var grabX=anchorX*grabVV*grabV+3*control1X*grabVV*grabU+3*(contactX-approachX*0.32)*grabV*grabUU+contactX*grabUU*grabU;\n            var grabY=anchorY*grabVV*grabV+3*control1Y*grabVV*grabU+3*(contactY-approachY*0.32)*grabV*grabUU+contactY*grabUU*grabU;\n            var grabZ=anchorZ*grabVV*grabV+3*control1Z*grabVV*grabU+3*(contactZ-approachZ*0.32)*grabV*grabUU+contactZ*grabUU*grabU;\n            if(t>0.70){var wrapAngle=(t-0.70)/0.30*2.30,wrapCos=Math.cos(wrapAngle),wrapSin=Math.sin(wrapAngle)*octopusGrabRadius*0.88;grabX=octopusGrabAim.x+offsetX*wrapCos+approachX*wrapSin;grabY=octopusGrabAim.y+offsetY*wrapCos+approachY*wrapSin;grabZ=octopusGrabAim.z+offsetZ*wrapCos+approachZ*wrapSin;}\n            if(j===0)grabCurvePoint.set(x,y,z);\n            else{\n              // Interpolate directions and lengths, not opposite endpoints.\n              // This keeps a recovering/boosting arm from pinching to zero.\n              grabFrom.set(x,y,z).sub(grabPreviousBase);grabTo.set(grabX,grabY,grabZ).sub(grabPreviousTarget);\n              var fromLength=grabFrom.length(),toLength=grabTo.length();\n              if(fromLength>0.000001&&toLength>0.000001){\n                grabFrom.multiplyScalar(1/fromLength);grabTo.multiplyScalar(1/toLength);\n                if(j===1){grabRotation.setFromUnitVectors(grabFrom,grabTo).slerp(grabIdentity,1-strike);grabDirection.copy(grabFrom).applyQuaternion(grabRotation);}\n                else{\n                  // Blend successive bends so adjacent sections take the same\n                  // route around a turn, including during boost recovery.\n                  grabRotation.setFromUnitVectors(grabPreviousFrom,grabFrom);grabTargetBend.setFromUnitVectors(grabPreviousTo,grabTo);\n                  grabRotation.slerp(grabTargetBend,strike);grabDirection.applyQuaternion(grabRotation).normalize();\n                }\n                grabPreviousFrom.copy(grabFrom);grabPreviousTo.copy(grabTo);\n                grabCurvePoint.addScaledVector(grabDirection,fromLength+(toLength-fromLength)*strike);\n              }else grabCurvePoint.set(grabX,grabY,grabZ);\n            }\n            grabPreviousBase.set(x,y,z);grabPreviousTarget.set(grabX,grabY,grabZ);\n            x=grabCurvePoint.x;y=grabCurvePoint.y;z=grabCurvePoint.z;\n          }\n        }",
    "scope": "animal"
  },
  {
    "label": "owned accepted-grab snapshot",
    "before": "        var squidStrikeVisual=null,squidStrikeAimLocal=new THREE.Vector3(),squidStrikeAimOffset=new THREE.Vector3();",
    "after": "        var squidStrikeVisual=null,squidStrikeAimLocal=new THREE.Vector3(),squidStrikeAimOffset=new THREE.Vector3();\n        var octopusStrikeVisual=null,octopusStrikeAimLocal=new THREE.Vector3(),octopusStrikeAimOffset=new THREE.Vector3();",
    "scope": "controller"
  },
  {
    "label": "commit octopus intent alongside the existing capture request",
    "before": "                  squidStrikeVisual={startedAt:now,aimWorld:visualPrey?visualPrey.position.clone():octopus.localToWorld(new THREE.Vector3(0,-0.10*bodyScale,2.60*bodyScale))};\n                }",
    "after": "                  squidStrikeVisual={startedAt:now,aimWorld:visualPrey?visualPrey.position.clone():octopus.localToWorld(new THREE.Vector3(0,-0.10*bodyScale,2.60*bodyScale))};\n                }\n                if(!capabilities.swimming){\n                  octopus.updateWorldMatrix(true,false);\n                  var octopusVisualPrey=selectedPrey&&selectedPrey.userData.alive?selectedPrey:null;\n                  // Keep a visual grip width after the prey mesh has been captured/disposed.\n                  octopusStrikeVisual={startedAt:now,radiusWorld:octopusVisualPrey&&octopusVisualPrey.userData.cfg?0.30*octopusVisualPrey.userData.cfg.sizeMul:0.13*bodyScale,aimWorld:octopusVisualPrey?octopusVisualPrey.position.clone():octopus.localToWorld(new THREE.Vector3(0,-0.22*bodyScale,1.45*bodyScale))};\n                }",
    "scope": "controller"
  },
  {
    "label": "follow the committed prey through the contact frame",
    "before": "            if(squidStrikeVisual&&gameState.pendingStrike){var visualTarget=gameState.pendingStrike.target;if(visualTarget&&visualTarget.userData.alive)squidStrikeVisual.aimWorld.copy(visualTarget.position);}",
    "after": "            if(squidStrikeVisual&&gameState.pendingStrike){var visualTarget=gameState.pendingStrike.target;if(visualTarget&&visualTarget.userData.alive)squidStrikeVisual.aimWorld.copy(visualTarget.position);}\n            if(octopusStrikeVisual&&gameState.pendingStrike){var octopusVisualTarget=gameState.pendingStrike.target;if(octopusVisualTarget&&octopusVisualTarget.userData.alive)octopusStrikeVisual.aimWorld.copy(octopusVisualTarget.position);}",
    "scope": "controller"
  },
  {
    "label": "bounded octopus preparation contact and recovery clock",
    "before": "            var strikePose=strikePhase*strikePhase*(3-2*strikePhase);",
    "after": "            if(octopusStrikeVisual){\n              var grabAge=now-octopusStrikeVisual.startedAt;\n              if(grabAge>=650||grabAge<0){octopusStrikeVisual=null;strikePhase=0;}\n              else{\n                // Preserve the existing 200 ms contact and 650 ms recovery.\n                strikePhase=grabAge<=40?0:grabAge<=200?(grabAge-40)/160:grabAge<=260?1:(650-grabAge)/390;\n                var grabLoad=Math.max(0,Math.min(1,grabAge/40)),grabRelease=Math.max(0,Math.min(1,(650-grabAge)/390));\n                strikePreparation=grabAge<=40?grabLoad*grabLoad*(3-2*grabLoad):0;\n                strikeBrace=grabAge<=40?grabLoad*grabLoad*(3-2*grabLoad):grabAge<=260?1:grabRelease*grabRelease*(3-2*grabRelease);\n                octopus.updateWorldMatrix(true,false);octopusStrikeAimLocal.copy(octopusStrikeVisual.aimWorld);octopus.worldToLocal(octopusStrikeAimLocal);octopusStrikeAimLocal.multiplyScalar(1/bodyScale);\n                octopusStrikeAimOffset.copy(octopusStrikeAimLocal);octopusStrikeAimOffset.y+=0.22;octopusStrikeAimOffset.z-=0.20;\n                var grabReach=octopusStrikeAimOffset.length();if(grabReach>3.2){octopusStrikeAimLocal.copy(octopusStrikeAimOffset).multiplyScalar(3.2/grabReach);octopusStrikeAimLocal.y-=0.22;octopusStrikeAimLocal.z+=0.20;}\n                directedStrikeAim=octopusStrikeAimLocal;\n              }\n            }\n            var directedStrikeRadius=octopusStrikeVisual?octopusStrikeVisual.radiusWorld/bodyScale:0;\n            var strikePose=strikePhase*strikePhase*(3-2*strikePhase);",
    "scope": "controller"
  },
  {
    "label": "owned interpolation scratch space",
    "before": "  var strikeTubeSide=new T.Vector3(-1,0,0);",
    "after": "  var strikeTubeSide=new T.Vector3(-1,0,0);\n  var grabPreviousBase=new T.Vector3(),grabPreviousTarget=new T.Vector3(),grabCurvePoint=new T.Vector3(),grabFrom=new T.Vector3(),grabTo=new T.Vector3(),grabRotation=new T.Quaternion(),grabIdentity=new T.Quaternion(),grabPreviousFrom=new T.Vector3(),grabPreviousTo=new T.Vector3(),grabDirection=new T.Vector3(),grabTargetBend=new T.Quaternion();",
    "scope": "animal"
  },
  {
    "label": "pass the visual grip width to the existing rig",
    "before": "strike:strikePose,strikeAim:directedStrikeAim,strikePreparation:strikePreparation",
    "after": "strike:strikePose,strikeAim:directedStrikeAim,strikeRadius:directedStrikeRadius,strikePreparation:strikePreparation",
    "scope": "controller"
  }
];
// Historical fixtures pass either the entire tool or its extracted animal factory.
// Both paths require every applicable exact guard; partial/stale inputs fail.
function restorePass53Source(source){
  const animalOnly=source.trimStart().startsWith('function createCLHuntAnimal(');
  assert.ok(animalOnly||source.includes('function initHuntSim3D('),'Pass53 reference requires the full tool or animal factory');
  for(const c of [...changes].reverse()){
    if(animalOnly&&c.scope==='controller')continue;
    assert.equal(source.split(c.after).length-1,1,'Pass53 inverse guard: '+c.label);
    source=source.replace(c.after,c.before);
  }
  return source;
}
module.exports={restorePass53Source};
