'use strict';
// Read-only numeric analysis. Private functions are exposed only in an isolated
// VM copy; neither the production renderer nor its mirror is modified.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const repo=process.env.UNIVERSE_REPO || path.resolve(__dirname,'..');
const outputDir=process.env.UNIVERSE_STELLAR_ANALYSIS_OUTPUT || path.join(repo,'reports/universe-flight-2026-09-29/stellar-passage/');
const sourcePath=path.join(repo,'stem_lab/universe_flight_scene.js');
const mirrorPath=path.join(repo,'desktop/web-app/public/stem_lab/universe_flight_scene.js');
const baselinePath=process.env.UNIVERSE_STELLAR_BASELINE || path.join(repo,'reports/universe-flight-2026-09-29/stellar-passage/baseline-renderer.js');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const normalized=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
const sourceBytes=fs.readFileSync(sourcePath),baselineBytes=fs.readFileSync(baselinePath);
assert.equal(sha(normalized(sourceBytes)),'36178183ee42c51c345bc38b4929aa840d1f258004603876c5c17a1bb922e3aa');
assert.equal(sha(normalized(baselineBytes)),'c3a15420c5cbcb65321ea569886a7378c563636bc1e7dcd841554799175b0bef');
assert.deepEqual(fs.readFileSync(mirrorPath),sourceBytes);
function load(bytes,stellar) {
  let code=bytes.toString('utf8');
  const marker='  global.UniverseFlight =';
  assert.equal(code.split(marker).length,2);
  code=code.replace(marker,'  global.__analysis={makeRegion:makeRegion,route:'+(stellar?'STELLAR_FLYBY':'null')+',routes:FLYBY_ROUTES,galaxyPixels:galaxyPixels,cloudPixels:cloudPixels,shaders:{pointVertex:VERTEX,pointFragment:FRAGMENT,galaxyVertex:GALAXY_VERTEX,galaxyFragment:GALAXY_FRAGMENT}};\n'+marker);
  if(stellar) {
    const geometryMarker="    return {id:'stellar',name:'Stellar close pass'";
    assert.equal(code.split(geometryMarker).length,2);
    code=code.replace(geometryMarker,'    global.__stellarGeometry={nodes:nodes,tangents:tangents};\n'+geometryMarker);
  }
  const window={};vm.runInNewContext(code,{window},{filename:stellar?'actual-renderer-analysis':'baseline-renderer-analysis'});
  return window;
}
const actual=load(sourceBytes,true),baseline=load(baselineBytes,false),route=actual.__analysis.route;
assert.equal(route.id,'stellar');assert.equal(route.durationSeconds,46);
const jsonMatch=(left,right)=>assert.equal(JSON.stringify(left),JSON.stringify(right));
const audit={regions:{},atlases:{},shaders:{},publicMath:{},landmarks:{},oldRoutes:{}};
const binary=typed=>Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength);
for(const name of ['neighborhood','galaxy','cosmic']) {
  const currentRegion=actual.__analysis.makeRegion(name),old=baseline.__analysis.makeRegion(name);
  assert.deepEqual(binary(currentRegion.points),binary(old.points));jsonMatch(currentRegion.galaxies,old.galaxies);
  const catalog=actual.UniverseFlight.landmarks(name);jsonMatch(catalog,baseline.UniverseFlight.landmarks(name));
  audit.regions[name]={pointCount:currentRegion.points.length/9,pointBytesHash:sha(binary(currentRegion.points)),galaxyModelsHash:sha(Buffer.from(JSON.stringify(currentRegion.galaxies))),matchesBaseline:true};
  audit.landmarks[name]={count:catalog.length,catalogHash:sha(Buffer.from(JSON.stringify(catalog))),matchesBaseline:true};
}
for(const [name,argument] of [['galaxyPixels',512],['cloudPixels',undefined]]) {
  const current=actual.__analysis[name](argument),old=baseline.__analysis[name](argument);
  assert.deepEqual(binary(current),binary(old));audit.atlases[name]={bytes:current.byteLength,hash:sha(binary(current)),matchesBaseline:true};
}
for(const name of Object.keys(actual.__analysis.shaders)) {
  const text=actual.__analysis.shaders[name];assert.equal(text,baseline.__analysis.shaders[name]);
  audit.shaders[name]={hash:sha(Buffer.from(text)),matchesBaseline:true};
}
for(const name of Object.keys(actual.UniverseFlight.math)) {
  const text=actual.UniverseFlight.math[name].toString();assert.equal(text,baseline.UniverseFlight.math[name].toString());
  audit.publicMath[name]={hash:sha(Buffer.from(text)),matchesBaseline:true};
}
assert.equal(actual.UniverseFlight.create.toString(),baseline.UniverseFlight.create.toString());
audit.resourceCreationCode={hash:sha(Buffer.from(actual.UniverseFlight.create.toString())),matchesBaseline:true};
jsonMatch(actual.UniverseFlight.flybys().filter(item=>item.id!=='stellar'),baseline.UniverseFlight.flybys());
for(const id of ['halo','nebula','group']) {
  const currentRoute=actual.__analysis.routes[id],oldRoute=baseline.__analysis.routes[id];jsonMatch(currentRoute,oldRoute);
  const samples=[];for(let index=0;index<=currentRoute.durationSeconds*10;index++) {
    const seconds=index/10,current=currentRoute.atTime(seconds);jsonMatch(current,oldRoute.atTime(seconds));samples.push(current);
  }
  audit.oldRoutes[id]={samples:samples.length,sampleIntervalSeconds:0.1,metadataHash:sha(Buffer.from(JSON.stringify(currentRoute))),sampleHash:sha(Buffer.from(JSON.stringify(samples))),matchesBaseline:true};
}
const region=actual.__analysis.makeRegion('neighborhood');
const oldRegion=baseline.__analysis.makeRegion('neighborhood');
const pointBytes=Buffer.from(region.points.buffer,region.points.byteOffset,region.points.byteLength);
const oldPointBytes=Buffer.from(oldRegion.points.buffer,oldRegion.points.byteOffset,oldRegion.points.byteLength);
assert.deepEqual(pointBytes,oldPointBytes);
const landmarks=actual.UniverseFlight.landmarks('neighborhood').filter(item=>['amber-star','blue-star','pale-star'].includes(item.id));
const minima=landmarks.map(item=>({targetId:item.id,minimumDistanceLy:Infinity,seconds:null,position:null,viewingRadiusLy:item.arrivalRadiusLy}));
const geometry=actual.__stellarGeometry,bounds={minimum:[Infinity,Infinity,Infinity],maximum:[-Infinity,-Infinity,-Infinity]};
// Hermite curves stay inside their equivalent cubic Bezier control hull.
for(let segment=0;segment<geometry.nodes.length-1;segment++) {
  const n0=geometry.nodes[segment],n1=geometry.nodes[segment+1];
  const t0=geometry.tangents[segment],t1=geometry.tangents[segment+1];
  const controls=[n0,n0.map((v,i)=>v+t0[i]/3),n1.map((v,i)=>v-t1[i]/3),n1];
  controls.forEach(p=>p.forEach((v,i)=>{bounds.minimum[i]=Math.min(bounds.minimum[i],v);bounds.maximum[i]=Math.max(bounds.maximum[i],v);}));
}
function boxDistance(p) {
  let sum=0;for(let i=0;i<3;i++){const d=Math.max(bounds.minimum[i]-p[i],0,p[i]-bounds.maximum[i]);sum+=d*d;}
  return Math.sqrt(sum);
}
const candidates=[];let generatedStars=0,discardedLowerBound=Infinity;
for(let offset=0;offset<region.points.length;offset+=9) {
  if(region.points[offset+8]>=0.5)continue;
  generatedStars++;
  const p=[region.points[offset],region.points[offset+1],region.points[offset+2]],size=region.points[offset+6];
  const lowerBound=boxDistance(p)-size;
  if(lowerBound<=2)candidates.push({pointIndex:offset/9,position:p,spriteProxyRadiusLy:size});
  else discardedLowerBound=Math.min(discardedLowerBound,lowerBound);
}
let nearestStar=null,nearestEnvelope=null,maximumPace={lyPerSecond:0,seconds:0},maximumStepLy=0,previous=null;
let minimumPace=Infinity,minimumDistanceIncrement=Infinity;
const phaseChanges=[];let lastPhase=null;
const dt=0.001,samples=46001;
for(let index=0;index<samples;index++) {
  const seconds=index*dt,sample=route.atTime(seconds),p=sample.position;
  assert.ok(p.every(Number.isFinite));
  assert.ok([sample.distance,sample.pace,sample.yaw,sample.pitch].every(Number.isFinite));
  assert.ok(sample.pace>=0);
  assert.ok(Math.abs(sample.pitch)<Math.PI/2);
  minimumPace=Math.min(minimumPace,sample.pace);
  if(sample.pace>maximumPace.lyPerSecond)maximumPace={lyPerSecond:sample.pace,seconds};
  if(previous){const advance=sample.distance-previous.distance;assert.ok(advance>=-1e-12);minimumDistanceIncrement=Math.min(minimumDistanceIncrement,advance);maximumStepLy=Math.max(maximumStepLy,Math.hypot(...p.map((v,i)=>v-previous.position[i])));}
  if(sample.phase!==lastPhase){phaseChanges.push({phase:sample.phase,seconds});lastPhase=sample.phase;}
  landmarks.forEach((landmark,i)=>{const d=Math.hypot(...landmark.position.map((v,j)=>v-p[j]));if(d<minima[i].minimumDistanceLy)minima[i]={...minima[i],minimumDistanceLy:d,seconds,position:p.slice()};});
  for(const star of candidates) {
    const distance=Math.hypot(...star.position.map((v,i)=>v-p[i]));
    if(!nearestStar||distance<nearestStar.minimumCenterDistanceLy)nearestStar={...star,minimumCenterDistanceLy:distance,seconds,cameraPosition:p.slice()};
    const clearance=distance-star.spriteProxyRadiusLy;
    if(!nearestEnvelope||clearance<nearestEnvelope.minimumClearanceLy)nearestEnvelope={...star,minimumClearanceLy:clearance,centerDistanceLy:distance,seconds,cameraPosition:p.slice()};
  }
  previous=sample;
}
assert.ok(nearestEnvelope.minimumClearanceLy>0);
assert.ok(discardedLowerBound>nearestEnvelope.minimumClearanceLy);
minima.forEach(item=>assert.ok(item.minimumDistanceLy>item.viewingRadiusLy));
assert.deepEqual(phaseChanges.map(item=>item.phase),['depart','amber','to-blue','blue','to-pale','pale','reveal','complete']);
const start=route.atTime(0),end=route.atTime(46),halfFov=route.fov/2,forward=[Math.sin(end.yaw)*Math.cos(end.pitch),Math.sin(end.pitch),Math.cos(end.yaw)*Math.cos(end.pitch)];
assert.equal(start.pace,0);assert.equal(end.pace,0);
const endAngles=landmarks.concat(actual.UniverseFlight.landmarks('neighborhood').filter(item=>item.id==='blue-nebula')).map(item=>{
  const delta=item.position.map((v,i)=>v-end.position[i]),distance=Math.hypot(...delta);
  const cosine=Math.min(1,Math.max(-1,delta.reduce((sum,v,i)=>sum+v*forward[i],0)/distance));
  const angle=Math.acos(cosine)*180/Math.PI;assert.ok(angle<halfFov);
  return {targetId:item.id,distanceLy:distance,angleDegrees:angle};
});
const highlights=route.highlights.map(item=>{
  const sample=route.atTime(item.seconds),landmark=landmarks.find(x=>x.id===item.targetId);
  const distance=Math.hypot(...landmark.position.map((v,i)=>v-sample.position[i]));
  const point=region.points;let starSize;
  for(let offset=0;offset<point.length;offset+=9)if(point[offset+8]<0.5&&Math.hypot(...landmark.position.map((v,i)=>v-point[offset+i]))<1e-5){starSize=point[offset+6];break;}
  assert.ok(starSize>0);
  const lens=1/Math.tan(route.fov*Math.PI/360);
  const sizes=[320,600].map(canvasHeightCss=>{
    const pointSizeCss=Math.min(120,starSize/distance*canvasHeightCss*lens);
    return {canvasHeightCss,fullSpriteCssPixels:pointSizeCss,luminousCoreDiameterCssPixels:pointSizeCss*0.35};
  });
  return {id:item.id,targetId:item.targetId,seconds:item.seconds,position:sample.position,yaw:sample.yaw,pitch:sample.pitch,distanceToTargetLy:distance,spriteProxyRadiusLy:starSize,centeredSpriteEstimates:sizes};
});
const report={completed:true,sourceHash:sha(sourceBytes),baselineHash:sha(baselineBytes),mirrorsMatch:true,baselineAudit:audit,generatedPointBytesMatch:true,generatedPointBytesHash:sha(pointBytes),routeId:route.id,durationSeconds:46,fovDegrees:route.fov,sampleIntervalSeconds:dt,sampleCount:samples,pathLengthLy:end.distance,start,end,minimumPaceLyPerSecond:minimumPace,maximumPace,minimumDistanceIncrementLy:minimumDistanceIncrement,maximumStepLy,landmarkClearances:minima,phaseChanges,highlights,finalVisibleTargets:endAngles,generatedStellarClearance:{totalStars:generatedStars,candidateStars:candidates.length,controlHullBounds:bounds,discardedStarClearanceLowerBoundLy:discardedLowerBound,nearestCenter:nearestStar,nearestSpriteEnvelope:nearestEnvelope},limits:['Sprite sizes and stellar surfaces are illustrative teaching visuals, not physical stellar radii.','Projected full-sprite sizes use a centered target, FOV 62 and the 120 CSS pixel renderer cap; hardware point limits may reduce them.','The luminous core diameter is 0.35 of the full point sprite, so the renderer cap gives at most 42 CSS pixels of core at DPR 1.','Stellar proxy clearance uses the existing a_size value as a conservative world-space sprite-envelope radius; cloud emission remains illustrative and has no collision model.','Clearance minima are dense 1 ms samples; all other stars are excluded using the exact cubic Bezier control-hull bounding box.']};
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'route-analysis.json'),JSON.stringify(report,null,2)+'\n');
assert.deepEqual(fs.readFileSync(sourcePath),sourceBytes);assert.deepEqual(fs.readFileSync(mirrorPath),sourceBytes);
console.log(JSON.stringify({completed:true,sourceHash:report.sourceHash,pathLengthLy:report.pathLengthLy,samples:report.sampleCount,maximumPace:report.maximumPace,landmarkClearances:report.landmarkClearances,nearestSpriteEnvelope:nearestEnvelope,candidateStars:candidates.length,generatedPointBytesMatch:true,baselineAuditPassed:true,output:path.join(outputDir,'route-analysis.json')},null,2));
