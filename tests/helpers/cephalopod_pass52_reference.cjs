const assert=require('node:assert/strict');
const changes=[
  {
    "label": "owned reef-octopus propulsion state",
    "before": "  var squidJetBlend=0,squidMantlePhase=0,squidFinPhase=0;",
    "after": "  var squidJetBlend=0,squidMantlePhase=0,squidFinPhase=0;\n  var octopusJetBlend=0,octopusMantlePhase=0,octopusMoveBlend=0,octopusGaitPhase=0,octopusTubeSide=new T.Vector3();"
  },
  {
    "label": "continuous boost and breathing phase",
    "before": "    if(membraneSwimmer){\n      // Accumulate phases:",
    "after": "    if(!swimming){\n      // Visual inertia stays separate from the simulation's speed and stamina.\n      var octopusStep=Math.max(0,Math.min(0.05,dt||0));\n      if(state.reducedMotion){octopusJetBlend=0;octopusMoveBlend=0;}\n      else{\n        octopusJetBlend+=(jet-octopusJetBlend)*(1-Math.exp(-octopusStep*7));\n        var moveTarget=state.moving?1:0,moveDecay=Math.exp(-octopusStep*6);\n        // Integrate the easing curve so gait phase stays continuous across input and frame rates.\n        octopusGaitPhase=(octopusGaitPhase+0.8*octopusStep+3.2*(moveTarget*octopusStep+(octopusMoveBlend-moveTarget)*(1-moveDecay)/6))%(Math.PI*2);\n        octopusMoveBlend=moveTarget+(octopusMoveBlend-moveTarget)*moveDecay;\n      }\n      jet=octopusJetBlend*octopusJetBlend*(3-2*octopusJetBlend);\n      octopusMantlePhase=(octopusMantlePhase+octopusStep*(2.2+8.8*jet)*motion)%(Math.PI*2);\n    }\n    if(membraneSwimmer){\n      // Accumulate phases:"
  },
  {
    "label": "phase-continuous octopus mantle",
    "before": "var pulse=Math.sin(squid?squidMantlePhase:membraneSwimmer?membraneMantlePhase:time*(jet?11:2.2))*motion;",
    "after": "var pulse=Math.sin(squid?squidMantlePhase:membraneSwimmer?membraneMantlePhase:!swimming?octopusMantlePhase:time*(jet?11:2.2))*motion;"
  },
  {
    "label": "interpolated mantle pulse amplitude",
    "before": "else mantle.scale.set(1+pulse*(squid?0.018+jet*0.037:jet?0.055:0.018),1+pulse*(squid?0.024+jet*0.021:jet?0.045:0.024),1+jet*0.04-pulse*0.008);",
    "after": "else mantle.scale.set(1+pulse*(squid||!swimming?0.018+jet*0.037:jet?0.055:0.018),1+pulse*(squid||!swimming?0.024+jet*0.021:jet?0.045:0.024),1+jet*0.04-pulse*0.008);"
  },
  {
    "label": "retained-length arm sweep setup",
    "before": "      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;",
    "after": "      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;\n      var streamX=Math.cos(l.angle)*0.24*compress,streamZ=0.20+Math.sin(l.angle)*0.24*compress;\n      var streamYaw=-Math.PI/2+Math.cos(l.angle)*0.32-l.angle;\n      streamYaw=Math.atan2(Math.sin(streamYaw),Math.cos(streamYaw));"
  },
  {
    "label": "swept arms without shortening away the front arm",
    "before": "          x=Math.cos(ang)*(0.24+reach)*compress;\n          z=0.20+Math.sin(ang)*(0.24+reach)*compress;\n          y=-0.22-Math.sin(t*Math.PI/2)*0.24+Math.max(0,walk)*Math.sin(t*Math.PI)*0.13*(state.moving?1:0.3);\n          x+=Math.cos(ang+Math.PI/2)*Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion;\n          z+=Math.sin(ang+Math.PI/2)*Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion;\n          y+=Math.pow(t,7)*0.12;\n          if(strike>0&&Math.sin(ang)>0){z+=strike*t*0.55;y+=strike*t*0.15;}",
    "after": "          x=Math.cos(ang)*(0.24+reach)*compress;\n          z=0.20+Math.sin(ang)*(0.24+reach)*compress;\n          if(jet>0){\n            // Integrate directions at fixed segment lengths. Blending endpoint\n            // positions or subtracting forward reach collapses the front arm.\n            if(j>0){\n              var sweep=Math.min(1,(t-0.5/rings)/0.72);sweep=sweep*sweep*(3-2*sweep);\n              var heading=ang+streamYaw*jet*(0.30+0.70*sweep),segment=l.length*compress/rings;\n              streamX+=Math.cos(heading)*segment;streamZ+=Math.sin(heading)*segment;\n            }\n            x=streamX;z=streamZ;\n          }\n          y=-0.22-Math.sin(t*Math.PI/2)*0.24+Math.max(0,walk)*Math.sin(t*Math.PI)*0.13*(0.3+octopusMoveBlend*0.7)*(1-jet*0.85);\n          var armDrift=Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion*(1-jet*0.78);\n          x+=Math.cos(ang+Math.PI/2)*armDrift;\n          z+=Math.sin(ang+Math.PI/2)*armDrift;\n          y+=Math.pow(t,7)*(0.12-jet*0.04)+jet*t*(0.025+Math.sin(ang)*0.10);\n          if(strike>0&&Math.sin(ang)>0){z+=strike*t*0.55;y+=strike*t*0.15;}"
  },
  {
    "label": "scope the old jet translation to swimmers",
    "before": "        if(jet){x*=1-t*0.35*jet;z+=(swimming?0.16:-1.3)*t*jet;y+=(squid?0.06:0.16)*t*jet;}",
    "after": "        if(jet&&swimming){x*=1-t*0.35*jet;z+=0.16*t*jet;y+=(squid?0.06:0.16)*t*jet;}"
  },
  {
    "label": "continuous octopus tube and sucker orientation",
    "before": "        }else{binormal.crossVectors(tangent,up).normalize();if(binormal.lengthSq()<0.1)binormal.set(1,0,0);}",
    "after": "        }else if(!swimming){\n          // Transport the oral frame along each bent arm instead of resetting\n          // it against world-up at every ring (which can flip a sucker row).\n          if(j2===0)octopusTubeSide.crossVectors(tangent,up);\n          octopusTubeSide.addScaledVector(tangent,-octopusTubeSide.dot(tangent));\n          if(octopusTubeSide.lengthSq()<0.000001){octopusTubeSide.set(Math.sin(l.angle),0,-Math.cos(l.angle));octopusTubeSide.addScaledVector(tangent,-octopusTubeSide.dot(tangent));}\n          binormal.copy(octopusTubeSide.normalize());\n        }else{binormal.crossVectors(tangent,up).normalize();if(binormal.lengthSq()<0.1)binormal.set(1,0,0);}"
  },
  {
    "label": "continuous reef-octopus gait phase",
    "before": "walk=Math.sin(time*(state.moving?4:0.8)-t*4+l.phase)*motion;",
    "after": "walk=Math.sin((swimming?time*(state.moving?4:0.8):octopusGaitPhase)-t*4+l.phase)*motion;"
  }
];
function restorePass52Source(source){for(const c of [...changes].reverse()){assert.equal(source.split(c.after).length-1,1,'Pass52 inverse guard: '+c.label);source=source.replace(c.after,c.before);}return source;}
module.exports={restorePass52Source};
