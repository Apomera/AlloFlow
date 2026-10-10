'use strict';

// Historical generic bird profiles from the pass 21 production source.
// Source SHA256: 69d38b7a7f22f05611b5282c7bdbb4a0992932a509b43a7dba693c73edb787ae
// Helpers, shared constructor declarations, bird branch, and common return are exact excerpts.
// Nonbird construction branches are omitted; this comparison fixture builds bird prey only.
exports.previousBirdProfilesFactory = String.raw`(()=>{
function preyBirdPalette(id) {
          // Back, belly, head, neck, flight feathers, wing marking, bill, breast.
          // Color is baked into the existing surfaces; no texture or extra draw.
          var rows={
            pigeon:[0x697885,0xb7bbb7,0x5c6b76,0x53776c,0x39444e,0x29343e,0x51575a,0xa6aaa8],
            mourningDove:[0x9a8e7e,0xd8c8b1,0xa59a8b,0xb8a38e,0x655e57,0x403c38,0x55504a,0xc9b299],
            songbird:[0x8b7050,0xe1c894,0x887457,0xe4d3aa,0x5b5146,0xd0be99,0x65523b,0xc4a370],
            shorebird:[0x827b6b,0xe4e0ce,0x918979,0xe8e2ce,0x555b58,0xd9d5c5,0x48473e,0xd4ccb7],
            duck:[0x7b7770,0xcac2ad,0x2f6350,0xe3dfc5,0x464b4a,0x47587c,0xb5a24d,0x775344],
            waterfowl:[0x827b68,0xd3c8aa,0x8b8068,0xb6aa8b,0x555b55,0xc0b394,0x88764c,0xb8a17c],
            grouse:[0x7d6952,0xc8b598,0x8d7c63,0xbaaa8c,0x5f574c,0xb7a58b,0x575145,0xbca27e],
            ptarmigan:[0xdde0d8,0xefeee1,0xe6e7dd,0xe8e8dc,0xd8ddd8,0xf0efe5,0x414948,0xe9e7d9],
            smallOwl:[0x796e5f,0xc4b79d,0x8c8271,0xd5cbb5,0x554f46,0xa79a81,0x9a9478,0xb9a689]
          };
          var row=rows[id]||rows.songbird,keys=['back','belly','head','neck','flight','bar','bill','breast'],palette={id:id};
          keys.forEach(function(key,index){palette[key]=new THREE.Color(row[index]).convertSRGBToLinear();});
          palette.tail=id==='ptarmigan'?new THREE.Color(0x414947).convertSRGBToLinear():palette.flight;
          return palette;
        }
function createPreyBirdBodyGeometry(size,palette) {
          var geometry=new THREE.SphereGeometry(size*0.42,16,12),p=geometry.attributes.position,colors=[],color=new THREE.Color();
          for(var i=0;i<p.count;i++) {
            var y=p.getY(i)/(size*0.42),z=p.getZ(i)/(size*0.42);
            // Narrow the rump, keeping the original belly/contact height exactly.
            p.setX(i,p.getX(i)*(1-Math.max(0,-z)*0.28));
            var back=Math.max(0,Math.min(1,(y+0.12)/0.82));back=back*back*(3-2*back);
            color.copy(palette.belly).lerp(palette.back,back);
            var breast=Math.max(0,z)*Math.max(0,1-Math.abs(y)*1.5);
            color.lerp(palette.breast,breast*0.78);
            var featherShade=1+Math.sin(z*27+Math.abs(p.getX(i)/size)*19)*Math.sin(y*21)*0.025;
            color.multiplyScalar(featherShade);colors.push(color.r,color.g,color.b);
          }
          geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
        }
function createPreyWingGeometry(size, side, palette) {
          var positions=[],colors=[],indices=[];
          for(var i=0;i<=8;i++)for(var j=0;j<=4;j++) {
            var u=i/8,v=j/4,chord=0.26*Math.pow(1-u,0.65)+0.018;
            var featherEdge=j===4 && i>3 ? (i%2)*0.045 : 0;
            positions.push(side*size*(0.06+u),size*Math.sin(v*Math.PI)*0.045*(1-u),size*(-u*u*0.27+(1-2*v)*chord-featherEdge));
            var tone=(j===4?0.16:0.27)+(i>2 && i<5?0.07:0);
            if(palette) {
              var wingColor=palette.back.clone().lerp(palette.flight,Math.min(1,u*0.55+v*0.48));
              var marking=palette.id==='pigeon' ? ((i===3||i===5)&&j>0?0.85:0) :
                palette.id==='duck' ? (i>=3&&i<=5&&j>=2?0.8:0) :
                (j===2&&i>1&&i<6?0.35:0);
              wingColor.lerp(palette.bar,marking);
              if(j===4)wingColor.multiplyScalar(0.82);
              colors.push(wingColor.r,wingColor.g,wingColor.b);
            } else colors.push(tone*0.82,tone*0.89,tone);
            if(i<8 && j<4){var a=i*5+j,b=a+5;if(side>0)indices.push(a,b,a+1,b,b+1,a+1);else indices.push(a,a+1,b,b,a+1,b+1);}
          }
          var geometry=new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
          geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
          geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
        }
function createPreyTailGeometry(size, palette) {
          var positions=[0,size*0.025,0],indices=[];
          for(var i=0;i<=8;i++){
            var across=i/4-1;
            positions.push(across*size*0.26,size*0.012*(1-Math.abs(across)),-size*(0.52+(i%2)*0.04-Math.abs(across)*0.04));
            if(i>0)indices.push(0,i+1,i);
          }
          var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
          if(palette){
            var colors=[palette.back.r,palette.back.g,palette.back.b];
            for(var feather=0;feather<=8;feather++){
              var color=palette.tail.clone().multiplyScalar(feather%2?0.84:1);
              colors.push(color.r,color.g,color.b);
            }
            geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
          }
          geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
        }
function preyKindFor(preyData) {
          if (preyData.id === 'fish') return 'fish';
          if (preyData.id === 'snake') return 'snake';
          if (preyData.id === 'cicada' || preyData.id === 'dragonfly' || preyData.id === 'largeInsect') return 'insect';
          if (preyData.id === 'songbird' || preyData.id === 'pigeon' || preyData.id === 'mourningDove' ||
              preyData.id === 'ptarmigan' || preyData.id === 'grouse' || preyData.id === 'duck' ||
              preyData.id === 'waterfowl' || preyData.id === 'shorebird' || preyData.id === 'smallOwl') return 'bird';
          if (preyData.id === 'rabbit' || preyData.id === 'hare' || preyData.id === 'arcticHare') return 'rabbit';
          if (preyData.id === 'rodent' || preyData.id === 'lemming' || preyData.id === 'groundSquirrel' || preyData.id === 'squirrel') return 'rodent';
          return 'mammal';
        }
function advancePreyVisualPose(pose,vx,vz,height,now,phase,alerted,dt,reduced) {
          var moving=vx*vx+vz*vz>0.01;
          var desired=moving?Math.atan2(vx,vz):(pose.heading===null?0:pose.heading);
          if(pose.heading===null)pose.heading=desired;
          var delta=Math.atan2(Math.sin(desired-pose.heading),Math.cos(desired-pose.heading));
          var turn=delta*(1-Math.exp(-9*dt));
          pose.heading=Math.atan2(Math.sin(pose.heading+turn),Math.cos(pose.heading+turn));
          var lift=Math.max(0,Math.min(1,(height-0.06)/0.8));
          var spreadGoal=lift*lift*(3-2*lift);
          pose.spread+=(spreadGoal-pose.spread)*(1-Math.exp(-10*dt));
          var bankGoal=reduced?0:Math.max(-0.24,Math.min(0.24,-turn/Math.max(0.001,dt)*0.045))*pose.spread;
          pose.bank=reduced?0:pose.bank+(bankGoal-pose.bank)*(1-Math.exp(-8*dt));
          if(!Number.isFinite(pose.phase)){pose.phase=phase||0;pose.rate=8;pose.wingAmplitude=0.3;}
          if(!reduced){
            // Integrate the changing rate instead of multiplying total elapsed time.
            // Phase stays continuous when prey startles, settles, pauses, or resumes.
            var decay=Math.exp(-6*Math.max(0,dt)),rateGoal=alerted?18:8,amplitudeGoal=alerted?0.65:0.3;
            pose.phase+=rateGoal*dt+(pose.rate-rateGoal)*(1-decay)/6;
            pose.rate=rateGoal+(pose.rate-rateGoal)*decay;
            pose.wingAmplitude=amplitudeGoal+(pose.wingAmplitude-amplitudeGoal)*decay;
          }
          pose.wingAngle=reduced?0.08:0.08*(1-pose.spread)+Math.sin(pose.phase*1.7)*pose.wingAmplitude*pose.spread;
        }
function buildPreyVisual(preyData, size) {
          var kind = preyKindFor(preyData);
          var root = new THREE.Group();
          root.name = 'prey-' + kind + '-' + preyData.id;
          var material = new THREE.MeshStandardMaterial({
            color: preyData.color, roughness: 0.72,
            emissive: preyData.color, emissiveIntensity: 0.08
          });
          var darkMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.82 });
          var paleMaterial = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.82 });
          var wings = [];
          var legs = [];
          var tail = null;
          var body;
          var gait=null,slither=null,insect=null,head=null,look=null,fins=[];
          if (kind === 'bird') {
            var birdPalette=preyBirdPalette(preyData.id);
            material.color.setHex(0xffffff);material.vertexColors=true;material.roughness=0.86;
            material.emissive.copy(birdPalette.belly);material.emissiveIntensity=0.06;
            body = new THREE.Mesh(createPreyBirdBodyGeometry(size,birdPalette), material);
            body.name='prey-plumage-body';
            body.scale.set(0.78, 0.72, 1.35);
            root.add(body);
            var birdHeadGeometry = new THREE.SphereGeometry(size * 0.24, 14, 10);
            var headPositions=birdHeadGeometry.attributes.position,headColors=[];
            var headColor=new THREE.Color(),beakColor=birdPalette.bill;
            for(var headVertex=0;headVertex<headPositions.count;headVertex++){
              var headY=headPositions.getY(headVertex)/size,headZ=headPositions.getZ(headVertex)/size;
              var throat=Math.max(0,Math.min(1,(-headY-0.07)/0.10));
              headColor.copy(birdPalette.head).lerp(birdPalette.neck,throat);
              if(preyData.id==='smallOwl')headColor.lerp(birdPalette.neck,Math.max(0,headZ/0.24)*0.75);
              headColors.push(headColor.r,headColor.g,headColor.b);
            }
            birdHeadGeometry.setAttribute('color',new THREE.Float32BufferAttribute(headColors,3));birdHeadGeometry.computeVertexNormals();
            // Eyes share the head's geometry and material, adding detail without draw calls.
            var expandedHead=birdHeadGeometry.toNonIndexed();birdHeadGeometry.dispose();
            var facePositions=Array.from(expandedHead.attributes.position.array),faceColors=Array.from(expandedHead.attributes.color.array),faceNormals=Array.from(expandedHead.attributes.normal.array);
            var broadBill=preyData.id==='duck' || preyData.id==='waterfowl';
            var billSource=new THREE.ConeGeometry(size*(broadBill?0.09:0.055),size*(broadBill?0.28:0.20),6);
            billSource.rotateX(Math.PI/2);billSource.scale(broadBill?1.3:1,0.5,1);billSource.translate(0,-size*0.04,size*(broadBill?0.28:0.26));
            var bill=billSource.toNonIndexed();billSource.dispose();
            for(var billVertex=0;billVertex<bill.attributes.position.count;billVertex++){
              facePositions.push(bill.attributes.position.getX(billVertex),bill.attributes.position.getY(billVertex),bill.attributes.position.getZ(billVertex));
              faceNormals.push(bill.attributes.normal.getX(billVertex),bill.attributes.normal.getY(billVertex),bill.attributes.normal.getZ(billVertex));
              faceColors.push(beakColor.r,beakColor.g,beakColor.b);
            }
            bill.dispose();
            [-1,1].forEach(function(side){
              var eyeSource=new THREE.SphereGeometry(size*0.034,8,6),eye=eyeSource.toNonIndexed();eyeSource.dispose();
              eye.translate(side*size*0.208,size*0.062,size*0.104);
              for(var eyeVertex=0;eyeVertex<eye.attributes.position.count;eyeVertex++){
                facePositions.push(eye.attributes.position.getX(eyeVertex),eye.attributes.position.getY(eyeVertex),eye.attributes.position.getZ(eyeVertex));
                faceColors.push(0.012,0.018,0.022);
                faceNormals.push(eye.attributes.normal.getX(eyeVertex),eye.attributes.normal.getY(eyeVertex),eye.attributes.normal.getZ(eyeVertex));
              }
              eye.dispose();
              var glintSource=new THREE.SphereGeometry(size*0.009,6,4),glint=glintSource.toNonIndexed();glintSource.dispose();
              glint.translate(side*size*0.235,size*0.074,size*0.111);
              for(var glintVertex=0;glintVertex<glint.attributes.position.count;glintVertex++){
                facePositions.push(glint.attributes.position.getX(glintVertex),glint.attributes.position.getY(glintVertex),glint.attributes.position.getZ(glintVertex));
                faceNormals.push(glint.attributes.normal.getX(glintVertex),glint.attributes.normal.getY(glintVertex),glint.attributes.normal.getZ(glintVertex));
                faceColors.push(0.56,0.62,0.60);
              }
              glint.dispose();
            });
            expandedHead.dispose();birdHeadGeometry=new THREE.BufferGeometry();
            birdHeadGeometry.setAttribute('position',new THREE.Float32BufferAttribute(facePositions,3));
            birdHeadGeometry.setAttribute('color',new THREE.Float32BufferAttribute(faceColors,3));
            birdHeadGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(faceNormals,3));
            var birdHead = new THREE.Mesh(birdHeadGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.78}));
            birdHead.name='prey-plumage-head';
            birdHead.scale.setScalar(preyData.id==='smallOwl'?0.96:0.82);
            birdHead.position.set(0, size * 0.10, size * 0.52);
            root.add(birdHead);
            var preyWingMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.86,side:THREE.DoubleSide});
            [-1, 1].forEach(function(side) {
              var wing = new THREE.Mesh(createPreyWingGeometry(size,side,birdPalette),preyWingMaterial);
              wing.name='prey-tapered-wing';
              wing.position.set(side * size * 0.18, size * 0.04, 0);
              wing.rotation.y=side*1.15;wing.rotation.z=side*0.08;wing.scale.x=0.3;
              root.add(wing);
              wings.push(wing);
            });
            var preyTailGeometry=createPreyTailGeometry(size,birdPalette);
            var preyTailMaterial=darkMaterial;preyTailMaterial.side=THREE.DoubleSide;
            preyTailMaterial.color.setHex(0xffffff);preyTailMaterial.vertexColors=true;
            tail = new THREE.Mesh(preyTailGeometry,preyTailMaterial);
            tail.position.z = -size * 0.40;
            root.add(tail);
          }
          if(head){
            look={phase:null,rate:0,activity:0,yaw:0,pitch:0,roll:0,lookSide:0,
              rateScale:preyData.id==='sloth'?0.20:kind==='rodent'?1.15:kind==='rabbit'?1.10:preyData.id==='howlerMonkey'?0.80:1,
              yawLimit:preyData.id==='sloth'?0.18:preyData.id==='fox'?0.40:kind==='rodent'?0.38:kind==='rabbit'?0.32:0.34,
              pitchLimit:preyData.id==='sloth'?0.055:kind==='rodent'||kind==='rabbit'?0.12:preyData.id==='coati'?0.105:0.14};
          }
          return { root: root, kind: kind, body: body, head:head, look:look, fins:fins, wings: wings, legs: legs, tail: tail, gait:gait, slither:slither, insect:insect, pose: { heading:null, bank:0, spread:0, wingAngle:0.08, phase:null, rate:8, wingAmplitude:0.3 }, float: {height:0,slopeX:0,slopeZ:0,pitch:0,roll:0,offset:0,contact:0}, swim: {size:size,bend:0,phase:null,rate:Math.PI*1.3,amplitude:0,tailYaw:0,bodyYaw:0,roll:0} };
        }
return {build:buildPreyVisual,advance:advancePreyVisualPose};
})()`;
exports.originalSourceSha256 = '69d38b7a7f22f05611b5282c7bdbb4a0992932a509b43a7dba693c73edb787ae';
