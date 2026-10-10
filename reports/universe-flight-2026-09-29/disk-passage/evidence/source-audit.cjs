'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),binary=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
const baselinePin='6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8',candidatePin='bbc67cfbf287f906882f085c4e54becdaa57d3f0d368d3fa6bef6b6fa5e78d34';
const driverHash=sha(fs.readFileSync(__filename)),output={completed:false,driverHash,startedAt:new Date().toISOString(),scope:'Independent host audit of staged59 source invariants and sampled authored route geometry; no native WebGL or physical trajectory claim.'};
const oldPath=path.join(stage,'baseline-renderer.js'),newPath=path.join(stage,'candidate-renderer.js'),canonicalPath=path.join(repo,'stem_lab/universe_flight_scene.js');
function load(source){
 const marker='  global.UniverseFlight =';assert.equal(source.split(marker).length,2);
 const hook='  global.__audit={routes:FLYBY_ROUTES,makeRegion:makeRegion,galaxyGeometry:galaxyGeometry,galaxyPixels:galaxyPixels,cloudPixels:cloudPixels,pointVertex:VERTEX,pointFragment:FRAGMENT,galaxyVertex:GALAXY_VERTEX,galaxyFragment:GALAXY_FRAGMENT,spiralPlaneMarker:spiralPlaneMarker,writeSpiralPlane:writeSpiralPlane,projectedGalaxyView:projectedGalaxyView,ellipticalView:ellipticalView,spiralBulgeView:spiralBulgeView,spiralDiskView:spiralDiskView,writeProjectedSurface:writeProjectedSurface,diskLightProfile:diskLightProfile};\n';
 const window={};new Function('window',source.replace(marker,hook+marker))(window);return window;
}
function local(position){const ct=Math.cos(.88),st=Math.sin(.88),cr=Math.cos(-.22),sr=Math.sin(-.22),x=position[0]*cr+position[1]*sr,y=-position[0]*sr+position[1]*cr;return[x,y*ct+position[2]*st,-y*st+position[2]*ct];}
function near(a,b,tolerance,message){assert.ok(Math.abs(a-b)<=tolerance,message+': '+a+' vs '+b);}
try{
 const before=fs.readFileSync(oldPath,'utf8'),after=fs.readFileSync(newPath,'utf8');assert.equal(sha(before),baselinePin);assert.equal(sha(after),candidatePin);
 output.baselineHash=baselinePin;output.candidateHash=candidatePin;output.canonicalBefore=sha(fs.readFileSync(canonicalPath));assert.equal(output.canonicalBefore,baselinePin,'Staged source audit leaves product58 installed');
 const old=load(before),next=load(after),bh=old.__audit,ah=next.__audit;
 const helperNames=['makeRegion','galaxyGeometry','galaxyPixels','cloudPixels','spiralPlaneMarker','writeSpiralPlane','projectedGalaxyView','ellipticalView','spiralBulgeView','spiralDiskView','writeProjectedSurface','diskLightProfile'];
 for(const key of helperNames)assert.equal(ah[key].toString(),bh[key].toString(),key+' source exact');
 for(const key of Object.keys(old.UniverseFlight.math))assert.equal(next.UniverseFlight.math[key].toString(),old.UniverseFlight.math[key].toString(),key+' math exact');
 for(const key of['pointVertex','pointFragment','galaxyVertex','galaxyFragment'])assert.equal(ah[key],bh[key],key+' shader exact');
 const originalIds=Object.keys(bh.routes);assert.deepEqual(originalIds,['halo','nebula','group','stellar']);assert.deepEqual(Object.keys(ah.routes),[...originalIds,'disk']);
 assert.deepEqual(next.UniverseFlight.flybys().slice(0,4),old.UniverseFlight.flybys(),'Original catalog entries exact');
 let originalSamples=0;
 for(const id of originalIds){assert.equal(ah.routes[id].atTime.toString(),bh.routes[id].atTime.toString(),id+' function exact');for(let step=0;step<=2048;step++){const seconds=bh.routes[id].durationSeconds*step/2048;assert.deepEqual(ah.routes[id].atTime(seconds),bh.routes[id].atTime(seconds),id+' authored pose exact');originalSamples++;}}
 output.preserved={helpers:helperNames,mathFunctions:Object.keys(old.UniverseFlight.math),shaders:['pointVertex','pointFragment','galaxyVertex','galaxyFragment'],originalRouteIds:originalIds,originalSampledPoses:originalSamples};
 output.regions={};
 for(const region of['neighborhood','galaxy','cosmic']){
  const a=ah.makeRegion(region),b=bh.makeRegion(region);assert.deepEqual(binary(a.points),binary(b.points));assert.deepEqual(a.galaxies,b.galaxies);assert.deepEqual(next.UniverseFlight.landmarks(region),old.UniverseFlight.landmarks(region));
  const ga=ah.galaxyGeometry(a.galaxies),gb=bh.galaxyGeometry(b.galaxies);assert.deepEqual(binary(ga.points),binary(gb.points));for(const key of['planes','ellipticals','bulges','disks'])assert.deepEqual(ga[key],gb[key]);
  output.regions[region]={pointCount:a.points.length/9,pointsHash:sha(binary(a.points)),geometryHash:sha(binary(ga.points)),geometryFloats:ga.points.length};
 }
 assert.deepEqual(binary(ah.galaxyPixels(512)),binary(bh.galaxyPixels(512)));assert.deepEqual(binary(ah.cloudPixels()),binary(bh.cloudPixels()));
 output.atlases={galaxy:sha(binary(ah.galaxyPixels(512))),cloud:sha(binary(ah.cloudPixels()))};
 const route=ah.routes.disk,metadata=next.UniverseFlight.flybys().at(-1),targetIds=new Set(next.UniverseFlight.landmarks('galaxy').map(item=>item.id));
 assert.equal(route.id,'disk');assert.equal(route.region,'galaxy');assert.equal(route.durationSeconds,44);assert.equal(route.fov,64);assert.equal(route.targetId,'inner-arm');assert.equal(route.completionTargetId,'galactic-center');
 assert.deepEqual(metadata.highlights.map(item=>[item.id,item.seconds,item.targetId]),[['arms',10,'inner-arm'],['crossing',17,'inner-arm'],['panorama',40,'galactic-center']]);
 assert.ok(metadata.highlights.every(item=>targetIds.has(item.targetId)&&item.seconds>0&&item.seconds<44));
 let previous=-1,minRange=Infinity,maxRange=0,maxPace=0,negativePace=0,insideSamples=0,planeCrossings=0,previousHeight;
 const sampleCount=44001,dt=.001;
 for(let step=0;step<sampleCount;step++){
  const seconds=step*dt,sample=route.atTime(seconds),position=sample.position,xyz=local(position),range=Math.hypot(...position);
  assert.ok(position.every(Number.isFinite)&&Number.isFinite(sample.yaw)&&Number.isFinite(sample.pitch)&&Number.isFinite(sample.distance)&&Number.isFinite(sample.pace));
  assert.ok(range<3000000,'Route stays inside galaxy scene bound');assert.ok(sample.distance>=previous-1e-9,'Distance is monotonic');assert.ok(sample.pace>=0,'Pace stays nonnegative');
  minRange=Math.min(minRange,range);maxRange=Math.max(maxRange,range);maxPace=Math.max(maxPace,sample.pace);if(sample.pace<0)negativePace++;
  if(Math.hypot(xyz[0],xyz[2])<52000*1.12&&Math.abs(xyz[1])<=52000*.012)insideSamples++;
  if(previousHeight!==undefined&&previousHeight>0&&xyz[1]<=0)planeCrossings++;previousHeight=xyz[1];previous=sample.distance;
 }
 assert.ok(minRange>18000,'Pass remains outside the central core standoff');assert.ok(insideSamples>4000,'Several authored seconds occur within the disk');assert.equal(planeCrossings,1,'Source-frame disk crossed once');
 assert.equal(route.atTime(0).pace,0);assert.ok(route.atTime(44).pace<1e-8);assert.equal(route.atTime(0).distance,0);assert.deepEqual(route.atTime(0).position,metadata.position);
 assert.deepEqual(route.atTime(-1),route.atTime(0));assert.deepEqual(route.atTime(45),route.atTime(44));
 const joins=[7,13,21,27,35],joinChecks=[];
 for(const time of joins){const h=1e-6,a=route.atTime(time-h),b=route.atTime(time),c=route.atTime(time+h);near(a.pace,c.pace,.01,'Continuous authored distance pace');const left=b.position.map((value,i)=>(value-a.position[i])/h),right=c.position.map((value,i)=>(value-b.position[i])/h);const jump=Math.hypot(...left.map((value,i)=>value-right[i])),scale=Math.max(Math.hypot(...left),Math.hypot(...right),1);assert.ok(jump/scale<.01,'Sampled arc lookup world velocity stays within1% at joins');joinChecks.push({time,pace:b.pace,worldVelocityRelativeJump:jump/scale});}
 const crossing=route.atTime(17),xyz=local(crossing.position);assert.ok(Math.abs(xyz[1])<624);assert.equal(ah.spiralPlaneMarker({center:[0,0,0],radius:52000,tilt:.88,turn:-.22},crossing.position),.5);
 output.route={id:'disk',durationSeconds:44,metadata,sampleCount,dt,minimumCentralRangeLy:minRange,maximumRangeLy:maxRange,maximumPaceLyPerAuthoredSecond:maxPace,insideSamples,insideAuthoredSeconds:insideSamples*dt,planeCrossings,joinChecks,crossingSourceFrame:xyz,totalDistanceLy:route.atTime(44).distance,limits:'Geometry is a Hermite teaching camera curve, with sampled arc-length lookup. Distance timing is smooth; sampled world velocity is approximate rather than mathematically exact C1.'};
 assert.equal(sha(fs.readFileSync(__filename)),driverHash);assert.equal(sha(fs.readFileSync(oldPath)),baselinePin);assert.equal(sha(fs.readFileSync(newPath)),candidatePin);assert.equal(sha(fs.readFileSync(canonicalPath)),output.canonicalBefore);output.completed=true;output.finishedAt=new Date().toISOString();
}catch(error){output.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;}
assert.equal(fs.existsSync(path.join(stage,'source-audit.json')),false,'Preserve existing audit before rerunning.');fs.writeFileSync(path.join(stage,'source-audit.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
