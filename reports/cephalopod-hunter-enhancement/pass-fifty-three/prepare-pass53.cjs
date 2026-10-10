const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',dir=path.join(repo,'reports/cephalopod-hunter-enhancement/pass-fifty-three'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const mirrors=['stem_lab','desktop/web-app/public/stem_lab','desktop/app-build/stem_lab','desktop/web-app/build/stem_lab'].map(p=>path.join(repo,p,'stem_tool_cephalopodlab.js')),source=fs.readFileSync(mirrors[0],'utf8');assert.equal(hash(source),'f746c8e0bc501363d41f773cded469fb70d6d7a0200ad26df3ca11d9a1318c6a');for(const f of mirrors)assert.equal(fs.readFileSync(f,'utf8'),source);let candidate=source;const changes=[];
function replace(label,before,after){assert.equal(candidate.split(before).length-1,1,label);candidate=candidate.replace(before,after);changes.push({label,before,after});}
replace('finite octopus grab intent',
 '    var squidStrikePreparation=0,squidStrikeBrace=0,squidStrikeEnvelope=false;',
 `    var octopusGrabAim=!swimming&&motion&&state.strikeAim&&Number.isFinite(state.strikeAim.x)&&Number.isFinite(state.strikeAim.y)&&Number.isFinite(state.strikeAim.z)?state.strikeAim:null;
    var octopusGrabBrace=octopusGrabAim&&Number.isFinite(state.strikeBrace)?Math.max(0,Math.min(1,state.strikeBrace)):0;
    var squidStrikePreparation=0,squidStrikeBrace=0,squidStrikeEnvelope=false;`);
replace('three leading arms unfold before reaching',
 "      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;",
 `      var isTent=l.kind==='tentacle',fil=l.kind==='filament',compress=l.compressCurrent||1;
      var grabbing=octopusGrabAim&&l.index>=1&&l.index<=3,armJet=grabbing?jet*(1-octopusGrabBrace):jet;`);
const start=candidate.indexOf('        }else{\n          x=Math.cos(ang)*(0.24+reach)*compress;'),end=candidate.indexOf('\n        if(jet&&swimming)',start);assert.ok(start>0&&end>start);const oldPose=candidate.slice(start,end);let pose=oldPose.replace('if(jet>0)','if(armJet>0)').replace('streamYaw*jet*','streamYaw*armJet*').replaceAll('1-jet*0.85','1-armJet*0.85').replaceAll('1-jet*0.78','1-armJet*0.78').replace('0.12-jet*0.04','0.12-armJet*0.04').replace('+jet*t*','+armJet*t*').replace('if(strike>0&&Math.sin(ang)>0)','if(!grabbing&&strike>0&&Math.sin(ang)>0)');
pose=pose.slice(0,-10)+`
          if(grabbing&&strike>0){
            // Reach with the sucker-bearing section, then curl the remaining tip
            // around the prey. The three arms approach separate contact points.
            var grabSide=2-l.index,grabDX=octopusGrabAim.x,grabDZ=octopusGrabAim.z-0.20,grabHorizontal=Math.hypot(grabDX,grabDZ);
            var acrossX=grabHorizontal>0.0001?grabDZ/grabHorizontal:1,acrossZ=grabHorizontal>0.0001?-grabDX/grabHorizontal:0;
            var offsetX=acrossX*grabSide*0.13,offsetY=grabSide?0.025:0.11,offsetZ=acrossZ*grabSide*0.13;
            var contactX=octopusGrabAim.x+offsetX,contactY=octopusGrabAim.y+offsetY,contactZ=octopusGrabAim.z+offsetZ;
            var anchorX=Math.cos(ang)*0.24*compress,anchorY=-0.22,anchorZ=0.20+Math.sin(ang)*0.24*compress;
            var approachX=contactX-anchorX,approachY=contactY-anchorY,approachZ=contactZ-anchorZ,approachLength=Math.hypot(approachX,approachY,approachZ);
            if(approachLength<0.0001){approachX=0;approachY=0;approachZ=1;approachLength=1;}
            approachX/=approachLength;approachY/=approachLength;approachZ/=approachLength;
            var grabU=Math.min(1,t/0.70),grabV=1-grabU,grabUU=grabU*grabU,grabVV=grabV*grabV;
            var control1X=anchorX+Math.cos(ang)*0.34,control1Y=anchorY-0.015,control1Z=anchorZ+Math.sin(ang)*0.34;
            // An outward shoulder gives rearward reaches room to turn beneath the head.
            if(approachZ<0){control1X+=(grabSide||1)*(-approachZ)*0.32;control1Z+=0.10*(-approachZ);}
            var grabX=anchorX*grabVV*grabV+3*control1X*grabVV*grabU+3*(contactX-approachX*0.32)*grabV*grabUU+contactX*grabUU*grabU;
            var grabY=anchorY*grabVV*grabV+3*control1Y*grabVV*grabU+3*(contactY-approachY*0.32)*grabV*grabUU+contactY*grabUU*grabU;
            var grabZ=anchorZ*grabVV*grabV+3*control1Z*grabVV*grabU+3*(contactZ-approachZ*0.32)*grabV*grabUU+contactZ*grabUU*grabU;
            if(t>0.70){var wrapAngle=(t-0.70)/0.30*2.30,wrapCos=Math.cos(wrapAngle),wrapSin=Math.sin(wrapAngle)*0.18;grabX=octopusGrabAim.x+offsetX*wrapCos+approachX*wrapSin;grabY=octopusGrabAim.y+offsetY*wrapCos+approachY*wrapSin;grabZ=octopusGrabAim.z+offsetZ*wrapCos+approachZ*wrapSin;}
            x+=(grabX-x)*strike;y+=(grabY-y)*strike;z+=(grabZ-z)*strike;
          }
        }`;
replace('directed grasp and curved tip recovery',oldPose,pose);
replace('owned accepted-grab snapshot',
 '        var squidStrikeVisual=null,squidStrikeAimLocal=new THREE.Vector3(),squidStrikeAimOffset=new THREE.Vector3();',
 `        var squidStrikeVisual=null,squidStrikeAimLocal=new THREE.Vector3(),squidStrikeAimOffset=new THREE.Vector3();
        var octopusStrikeVisual=null,octopusStrikeAimLocal=new THREE.Vector3(),octopusStrikeAimOffset=new THREE.Vector3();`);
const commitEnd="                  squidStrikeVisual={startedAt:now,aimWorld:visualPrey?visualPrey.position.clone():octopus.localToWorld(new THREE.Vector3(0,-0.10*bodyScale,2.60*bodyScale))};\n                }";
replace('commit octopus intent alongside the existing capture request',commitEnd,commitEnd+`
                if(!capabilities.swimming){
                  octopus.updateWorldMatrix(true,false);
                  var octopusVisualPrey=selectedPrey&&selectedPrey.userData.alive?selectedPrey:null;
                  octopusStrikeVisual={startedAt:now,aimWorld:octopusVisualPrey?octopusVisualPrey.position.clone():octopus.localToWorld(new THREE.Vector3(0,-0.22*bodyScale,1.45*bodyScale))};
                }`);
const follow='            if(squidStrikeVisual&&gameState.pendingStrike){var visualTarget=gameState.pendingStrike.target;if(visualTarget&&visualTarget.userData.alive)squidStrikeVisual.aimWorld.copy(visualTarget.position);}';
replace('follow the committed prey through the contact frame',follow,follow+`
            if(octopusStrikeVisual&&gameState.pendingStrike){var octopusVisualTarget=gameState.pendingStrike.target;if(octopusVisualTarget&&octopusVisualTarget.userData.alive)octopusStrikeVisual.aimWorld.copy(octopusVisualTarget.position);}`);
replace('bounded octopus preparation contact and recovery clock',
 '            var strikePose=strikePhase*strikePhase*(3-2*strikePhase);',
 `            if(octopusStrikeVisual){
              var grabAge=now-octopusStrikeVisual.startedAt;
              if(grabAge>=650||grabAge<0){octopusStrikeVisual=null;strikePhase=0;}
              else{
                // Preserve the existing 200 ms contact and 650 ms recovery.
                strikePhase=grabAge<=80?0:grabAge<=200?(grabAge-80)/120:grabAge<=260?1:(650-grabAge)/390;
                var grabLoad=Math.max(0,Math.min(1,grabAge/80)),grabRelease=Math.max(0,Math.min(1,(650-grabAge)/390));
                strikePreparation=grabAge<=80?grabLoad*grabLoad*(3-2*grabLoad):0;
                strikeBrace=grabAge<=80?grabLoad*grabLoad*(3-2*grabLoad):grabAge<=260?1:grabRelease*grabRelease*(3-2*grabRelease);
                octopus.updateWorldMatrix(true,false);octopusStrikeAimLocal.copy(octopusStrikeVisual.aimWorld);octopus.worldToLocal(octopusStrikeAimLocal);octopusStrikeAimLocal.multiplyScalar(1/bodyScale);
                octopusStrikeAimOffset.copy(octopusStrikeAimLocal);octopusStrikeAimOffset.y+=0.22;octopusStrikeAimOffset.z-=0.20;
                var grabReach=octopusStrikeAimOffset.length();if(grabReach>3.2){octopusStrikeAimLocal.copy(octopusStrikeAimOffset).multiplyScalar(3.2/grabReach);octopusStrikeAimLocal.y-=0.22;octopusStrikeAimLocal.z+=0.20;}
                directedStrikeAim=octopusStrikeAimLocal;
              }
            }
            var strikePose=strikePhase*strikePhase*(3-2*strikePhase);`);
fs.mkdirSync(dir,{recursive:true});assert.ok(!fs.existsSync(path.join(dir,'baseline-source.js')));fs.writeFileSync(path.join(dir,'baseline-source.js'),source);fs.writeFileSync(path.join(dir,'candidate-source.js'),candidate);fs.writeFileSync(path.join(dir,'change-guards.json'),JSON.stringify({baselineSHA:hash(source),candidateSHA:hash(candidate),changes},null,2)+'\n');new (require('vm').Script)(candidate);console.log({candidateSHA:hash(candidate),blocks:changes.length});
