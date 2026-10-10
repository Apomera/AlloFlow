const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',dir=path.join(repo,'reports/cephalopod-hunter-enhancement/pass-fifty-two');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),mirrors=['stem_lab','desktop/web-app/public/stem_lab','desktop/app-build/stem_lab','desktop/web-app/build/stem_lab'].map(p=>path.join(repo,p,'stem_tool_cephalopodlab.js'));
const source=fs.readFileSync(mirrors[0],'utf8');assert.equal(hash(source),'e52845d2f95300d17d6052c27e56d2d5e0c62de32e7d838d3521cd523c4b9063');for(const file of mirrors)assert.equal(fs.readFileSync(file,'utf8'),source);
const changes=[];let candidate=source;
function replace(label,before,after){assert.equal(candidate.split(before).length-1,1,label);changes.push({label,before,after});candidate=candidate.replace(before,after);}
replace('owned reef-octopus propulsion state',
 '  var squidJetBlend=0,squidMantlePhase=0,squidFinPhase=0;',
 '  var squidJetBlend=0,squidMantlePhase=0,squidFinPhase=0;\n  var octopusJetBlend=0,octopusMantlePhase=0,octopusTubeSide=new T.Vector3();');
replace('continuous boost and breathing phase',
 '    if(membraneSwimmer){\n      // Accumulate phases:',
 `    if(!swimming){
      // Visual inertia stays separate from the simulation's speed and stamina.
      var octopusStep=Math.max(0,Math.min(0.05,dt||0));
      if(state.reducedMotion)octopusJetBlend=0;
      else octopusJetBlend+=(jet-octopusJetBlend)*(1-Math.exp(-octopusStep*7));
      jet=octopusJetBlend;
      octopusMantlePhase=(octopusMantlePhase+octopusStep*(2.2+8.8*jet)*motion)%(Math.PI*2);
    }
    if(membraneSwimmer){
      // Accumulate phases:`);
replace('phase-continuous octopus mantle',
 'var pulse=Math.sin(squid?squidMantlePhase:membraneSwimmer?membraneMantlePhase:time*(jet?11:2.2))*motion;',
 'var pulse=Math.sin(squid?squidMantlePhase:membraneSwimmer?membraneMantlePhase:!swimming?octopusMantlePhase:time*(jet?11:2.2))*motion;');
replace('interpolated mantle pulse amplitude',
 'else mantle.scale.set(1+pulse*(squid?0.018+jet*0.037:jet?0.055:0.018),1+pulse*(squid?0.024+jet*0.021:jet?0.045:0.024),1+jet*0.04-pulse*0.008);',
 'else mantle.scale.set(1+pulse*(squid||!swimming?0.018+jet*0.037:jet?0.055:0.018),1+pulse*(squid||!swimming?0.024+jet*0.021:jet?0.045:0.024),1+jet*0.04-pulse*0.008);');
replace('retained-length arm sweep setup',
 "      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;",
 `      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;
      var streamX=Math.cos(l.angle)*0.24*compress,streamZ=0.20+Math.sin(l.angle)*0.24*compress;
      var streamYaw=-Math.PI/2+Math.cos(l.angle)*0.32-l.angle;
      streamYaw=Math.atan2(Math.sin(streamYaw),Math.cos(streamYaw));`);
replace('swept arms without shortening away the front arm',
 `          x=Math.cos(ang)*(0.24+reach)*compress;
          z=0.20+Math.sin(ang)*(0.24+reach)*compress;
          y=-0.22-Math.sin(t*Math.PI/2)*0.24+Math.max(0,walk)*Math.sin(t*Math.PI)*0.13*(state.moving?1:0.3);
          x+=Math.cos(ang+Math.PI/2)*Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion;
          z+=Math.sin(ang+Math.PI/2)*Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion;
          y+=Math.pow(t,7)*0.12;
          if(strike>0&&Math.sin(ang)>0){z+=strike*t*0.55;y+=strike*t*0.15;}`,
 `          x=Math.cos(ang)*(0.24+reach)*compress;
          z=0.20+Math.sin(ang)*(0.24+reach)*compress;
          if(jet>0){
            // Integrate directions at fixed segment lengths. Blending endpoint
            // positions or subtracting forward reach collapses the front arm.
            if(j>0){
              var sweep=Math.min(1,(t-0.5/rings)/0.72);sweep=sweep*sweep*(3-2*sweep);
              var heading=ang+streamYaw*jet*(0.30+0.70*sweep),segment=l.length*compress/rings;
              streamX+=Math.cos(heading)*segment;streamZ+=Math.sin(heading)*segment;
            }
            x=streamX;z=streamZ;
          }
          y=-0.22-Math.sin(t*Math.PI/2)*0.24+Math.max(0,walk)*Math.sin(t*Math.PI)*0.13*(state.moving?1:0.3)*(1-jet*0.85);
          var armDrift=Math.sin(t*5+time*1.4+l.phase)*0.12*t*t*motion*(1-jet*0.78);
          x+=Math.cos(ang+Math.PI/2)*armDrift;
          z+=Math.sin(ang+Math.PI/2)*armDrift;
          y+=Math.pow(t,7)*(0.12-jet*0.04)+jet*t*(0.025+Math.sin(ang)*0.10);
          if(strike>0&&Math.sin(ang)>0){z+=strike*t*0.55;y+=strike*t*0.15;}`);
replace('scope the old jet translation to swimmers',
 '        if(jet){x*=1-t*0.35*jet;z+=(swimming?0.16:-1.3)*t*jet;y+=(squid?0.06:0.16)*t*jet;}',
 '        if(jet&&swimming){x*=1-t*0.35*jet;z+=0.16*t*jet;y+=(squid?0.06:0.16)*t*jet;}');
replace('continuous octopus tube and sucker orientation',
 '        }else{binormal.crossVectors(tangent,up).normalize();if(binormal.lengthSq()<0.1)binormal.set(1,0,0);}',
 `        }else if(!swimming){
          // Transport the oral frame along each bent arm instead of resetting
          // it against world-up at every ring (which can flip a sucker row).
          if(j2===0)octopusTubeSide.crossVectors(tangent,up);
          octopusTubeSide.addScaledVector(tangent,-octopusTubeSide.dot(tangent));
          if(octopusTubeSide.lengthSq()<0.000001){octopusTubeSide.set(Math.sin(l.angle),0,-Math.cos(l.angle));octopusTubeSide.addScaledVector(tangent,-octopusTubeSide.dot(tangent));}
          binormal.copy(octopusTubeSide.normalize());
        }else{binormal.crossVectors(tangent,up).normalize();if(binormal.lengthSq()<0.1)binormal.set(1,0,0);}`);
fs.mkdirSync(dir,{recursive:true});assert.ok(!fs.existsSync(path.join(dir,'baseline-source.js')));fs.writeFileSync(path.join(dir,'baseline-source.js'),source);fs.writeFileSync(path.join(dir,'candidate-source.js'),candidate);fs.writeFileSync(path.join(dir,'change-guards.json'),JSON.stringify({baselineSHA:hash(source),candidateSHA:hash(candidate),changes},null,2)+'\n');
console.log({baselineSHA:hash(source),candidateSHA:hash(candidate),blocks:changes.length});
