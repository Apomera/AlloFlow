        // Five rock-rooted groves frame open sand. Reuse the 105 accepted actors and their draw stream.
        var clHabitatGroves=[
          {targetX:-12,targetZ:8,phase:3.35,rockIndex:-1},
          {targetX:-8,targetZ:23,phase:1.95,rockIndex:-1},
          {targetX:14,targetZ:17,phase:0.70,rockIndex:-1},
          {targetX:-22,targetZ:-13,phase:3.80,rockIndex:-1},
          {targetX:14,targetZ:-19,phase:5.35,rockIndex:-1}
        ],clHabitatReady=false;
        function clHabitatSiteClear(x,z,radius,near,minDistance,maxDistance){
          var centerX=near?near.x:0,centerZ=near?near.z:0,dx=x-centerX,dz=z-centerZ,distanceSq=dx*dx+dz*dz;
          if(!Number.isFinite(distanceSq)||distanceSq<minDistance*minDistance||distanceSq>maxDistance*maxDistance)return false;
          // Plant roots remain on the shallow shelf; the existing steep drop-off stays open water.
          if(x+radius>24)return false;
          if(x+radius>-4.5&&x-radius<4.5&&z+radius>-5&&z-radius<4.5)return false;
          if(x+radius>0&&x-radius<7&&z+radius>-5&&z-radius<10)return false;
          for(var di=0;di<dens.length;di++){
            var den=dens[di],ddx=x-den.x,ddz=z-den.z,yaw=den.group.rotation.y;
            var forward=ddx*Math.sin(yaw)+ddz*Math.cos(yaw),side=ddx*Math.cos(yaw)-ddz*Math.sin(yaw);
            if(ddx*ddx+ddz*ddz<(3+radius)*(3+radius))return false;
            if(Math.abs(side)<1.85+radius&&forward>-1.1-radius&&forward<7+radius)return false;
          }
          for(var si=0;si<shelters.length;si++){
            var shelter=shelters[si];if(shelter.userData.state==='carried')continue;
            var sdx=x-shelter.position.x,sdz=z-shelter.position.z;
            if(sdx*sdx+sdz*sdz<(1.5+radius)*(1.5+radius))return false;
          }
          for(var pool=0;pool<2;pool++){
            var obstacles=pool?corals:rocks;
            for(var oi=0;oi<obstacles.length;oi++){
              var obstacle=obstacles[oi],f=obstacle.userData.reefFootprint;
              if(!f||obstacle.userData.reefPlacementValid===false)continue;
              var margin=radius+0.12;
              if(x+margin>obstacle.position.x+f.minX&&x-margin<obstacle.position.x+f.maxX&&z+margin>obstacle.position.z+f.minZ&&z-margin<obstacle.position.z+f.maxZ)return false;
            }
          }
          return true;
        }
        function settleCLHuntHabitatPlants(near,refresh){
          var first=!clHabitatReady,centerX=near?near.x:0,centerZ=near?near.z:0;
          if(first||refresh){
            for(var groveIndex=0;groveIndex<clHabitatGroves.length;groveIndex++){
              var grove=clHabitatGroves[groveIndex],best=-1,bestScore=Infinity;
              for(var rockIndex=0;rockIndex<rocks.length;rockIndex++){
                var candidateRock=rocks[rockIndex],f=candidateRock.userData.reefFootprint;
                if(!f||candidateRock.position.x+f.maxX>21)continue;
                var cx=candidateRock.position.x,cz=candidateRock.position.z,allowed=true;
                if(Math.hypot(cx-centerX,cz-centerZ)>(near?110:60))continue;
                for(var previous=0;previous<groveIndex;previous++){
                  var previousRock=rocks[clHabitatGroves[previous].rockIndex];
                  if(previousRock&&Math.hypot(cx-previousRock.position.x,cz-previousRock.position.z)<9){allowed=false;break;}
                }
                if(!allowed)continue;
                var tx=cx-(centerX+grove.targetX),tz=cz-(centerZ+grove.targetZ),score=tx*tx+tz*tz;
                if(score<bestScore){bestScore=score;best=rockIndex;}
              }
              grove.rockIndex=best;
            }
          }
          // Iterate persistent arrays directly: no mesh, buffer, material, vector or scratch-array churn.
          for(var habitatPool=0;habitatPool<2;habitatPool++){
            var plants=habitatPool?grass:kelpStrands,kind=habitatPool?'grass':'kelp',perGrove=habitatPool?16:5;
            for(var plantIndex=0;plantIndex<plants.length;plantIndex++){
              var plant=plants[plantIndex],mesh=plant.mesh,data=mesh.userData.clHabitat;
              if(!data){
                var box=mesh.geometry.boundingBox,height=mesh.geometry.userData.clPlantHeight;
                var bx=Math.max(Math.abs(box.min.x),Math.abs(box.max.x)),bz=Math.max(Math.abs(box.min.z),Math.abs(box.max.z));
                var plantRadius=Math.hypot(bx,bz)+(habitatPool?0.24+height*0.125:0);
                data=mesh.userData.clHabitat={kind:kind,index:plantIndex,grove:Math.floor(plantIndex/perGrove),seedX:mesh.position.x,seedZ:mesh.position.z,radius:plantRadius,anchorIndex:-1,valid:false,dirty:false};
              }
              var minDistance=data.dirty?55:0,maxDistance=near?(data.dirty?95:119):78;
              if(!first&&!refresh&&!data.dirty&&clHabitatSiteClear(mesh.position.x,mesh.position.z,data.radius,near,minDistance,maxDistance)){data.valid=true;mesh.visible=true;continue;}
              var patch=clHabitatGroves[data.grove],anchor=rocks[patch.rockIndex],anchorX=anchor?anchor.position.x:centerX+patch.targetX,anchorZ=anchor?anchor.position.z:centerZ+patch.targetZ;
              var footprint=anchor?anchor.userData.reefFootprint:null,rockRadius=footprint?Math.hypot(Math.max(Math.abs(footprint.minX),Math.abs(footprint.maxX)),Math.max(Math.abs(footprint.minZ),Math.abs(footprint.maxZ))):1;
              var slot=plantIndex%perGrove,jitter=data.seedX*0.017+data.seedZ*0.013;jitter-=Math.floor(jitter);
              // Existing height draws place shorter kelp at the crescent edge and taller stems closer to rock.
              var baseRadius=rockRadius+data.radius+0.45+(habitatPool?0.55+(slot%3)*0.75:(9-plant.baseHeight)*0.25);
              var angle=patch.phase+(habitatPool?(slot-7.5)*0.19:(slot-2)*0.43)+(jitter-0.5)*0.16;
              var placed=false;
              // Bounded local search keeps roots near their rock while avoiding actual coral and shelter footprints.
              for(var ring=0;ring<7&&!placed;ring++)for(var sample=0;sample<16;sample++){
                var offset=sample===0?0:(sample%2?1:-1)*Math.ceil(sample/2)*0.21;
                var probeAngle=angle+offset,probeRadius=baseRadius+ring*0.65;
                var x=anchorX+Math.cos(probeAngle)*probeRadius,z=anchorZ+Math.sin(probeAngle)*probeRadius;
                if(!clHabitatSiteClear(x,z,data.radius,near,minDistance,maxDistance))continue;
                if(!habitatPool){
                  var spaced=true;
                  for(var earlier=0;earlier<plantIndex;earlier++){
                    var neighbor=kelpStrands[earlier].mesh;if(!neighbor.visible)continue;
                    if(Math.hypot(x-neighbor.position.x,z-neighbor.position.z)<1.35){spaced=false;break;}
                  }
                  if(!spaced)continue;
                }
                mesh.position.x=x;mesh.position.z=z;placed=true;break;
              }
              // Real shelter and coral placement can close the preferred crescent completely.
              // Search the full local rock perimeter before declaring an opening slot unavailable.
              // The same clearance predicate and seven-unit grove bound remain authoritative.
              if(!placed)for(var perimeterRing=0;perimeterRing<12&&!placed;perimeterRing++)for(var perimeterSample=0;perimeterSample<40;perimeterSample++){
                var perimeterAngle=angle+perimeterSample*Math.PI*2/40,perimeterRadius=rockRadius+data.radius+1.05+perimeterRing*0.5;
                var px=anchorX+Math.cos(perimeterAngle)*perimeterRadius,pz=anchorZ+Math.sin(perimeterAngle)*perimeterRadius;
                if(!clHabitatSiteClear(px,pz,data.radius,near,minDistance,maxDistance))continue;
                if(!habitatPool){
                  var perimeterSpaced=true;
                  for(var previousPlant=0;previousPlant<plantIndex;previousPlant++){
                    var previousMesh=kelpStrands[previousPlant].mesh;if(!previousMesh.visible)continue;
                    if(Math.hypot(px-previousMesh.position.x,pz-previousMesh.position.z)<1.35){perimeterSpaced=false;break;}
                  }
                  if(!perimeterSpaced)continue;
                }
                mesh.position.x=px;mesh.position.z=pz;placed=true;break;
              }
              // A streamed seed may belong to a different side of the annulus. Resolve locally without new draws.
              if(!placed&&near)for(var recoveryRing=0;recoveryRing<5&&!placed;recoveryRing++)for(var recoverySample=0;recoverySample<24;recoverySample++){
                var recoveryAngle=plantIndex*2.3999632297+recoverySample*Math.PI*2/24,recoveryRadius=recoveryRing*1.25;
                var rx=data.seedX+Math.cos(recoveryAngle)*recoveryRadius,rz=data.seedZ+Math.sin(recoveryAngle)*recoveryRadius;
                if(clHabitatSiteClear(rx,rz,data.radius,near,minDistance,maxDistance)){mesh.position.x=rx;mesh.position.z=rz;placed=true;break;}
              }
              // Saturated or deep areas retain pooled resources invisibly until a valid shelf site is available.
              data.anchorIndex=patch.rockIndex;data.valid=placed;data.dirty=false;mesh.visible=placed;
              if(placed)mesh.position.y=terrainHeight(mesh.position.x,mesh.position.z)+mesh.userData.groundOffset;
            }
          }
          clHabitatReady=true;
        }
