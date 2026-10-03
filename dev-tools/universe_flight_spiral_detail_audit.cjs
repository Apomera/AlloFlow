'use strict';
// Read-only audit of the generated scene and camera contracts. Private helpers
// are exposed in isolated VM copies; production source and mirrors stay intact.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const repo=process.env.UNIVERSE_REPO || path.resolve(__dirname,'..');
const reportDir=path.join(repo,'reports/universe-flight-2026-09-29/spiral-detail');
const outputDir=process.env.UNIVERSE_SPIRAL_DETAIL_AUDIT_OUTPUT || reportDir;
const baselinePath=process.env.UNIVERSE_SPIRAL_DETAIL_BASELINE || path.join(reportDir,'baseline-renderer.js');
const sourcePath=path.join(repo,'stem_lab/universe_flight_scene.js');
const mirrorPath=path.join(repo,'desktop/web-app/public/stem_lab/universe_flight_scene.js');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const normalize=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
const sourceBytes=fs.readFileSync(sourcePath),baselineBytes=fs.readFileSync(baselinePath),mirrorBytes=fs.readFileSync(mirrorPath);
assert.equal(sha(normalize(sourceBytes)),'d11e8261f7075b630e628b5d38edb3b6b6ac2de5695fb2611c90e996fb1746fa','accepted final renderer, ignoring line endings');
assert.equal(sha(normalize(baselineBytes)),'13d09e339945e9d3cc5fbe75a77e62e90373d9e685c4a9d49d026274c33dc5ce','accepted baseline renderer, ignoring line endings');
assert.deepEqual(mirrorBytes,sourceBytes,'desktop renderer is an exact mirror');
function load(bytes,filename) {
  const marker='  global.UniverseFlight =';
  let source=normalize(bytes).toString('utf8');
  assert.equal(source.split(marker).length,2,'unique private audit injection marker');
  source=source.replace(marker,'  global.__audit={makeRegion:makeRegion,routes:FLYBY_ROUTES,galaxyPixels:galaxyPixels,cloudPixels:cloudPixels,helpers:{galaxyGeometry:galaxyGeometry,ellipticalView:ellipticalView,writeEllipticalSurface:writeEllipticalSurface},shaders:{pointVertex:VERTEX,pointFragment:FRAGMENT,galaxyVertex:GALAXY_VERTEX,galaxyFragment:GALAXY_FRAGMENT}};\n'+marker);
  const window={};
  // Sharing the host's unchanged Math intrinsic avoids slow sandbox-global
  // lookups while generating millions of deterministic atlas samples.
  vm.runInNewContext(source,{window,Math},{filename,timeout:30000});
  return window;
}
const current=load(sourceBytes,'final-renderer-audit'),baseline=load(baselineBytes,'baseline-renderer-audit');
const binary=value=>Buffer.from(value.buffer,value.byteOffset,value.byteLength);
const jsonBytes=value=>Buffer.from(JSON.stringify(value));
const compareJson=(a,b,message)=>assert.deepEqual(jsonBytes(a),jsonBytes(b),message);
const result={completed:false,sourceHash:sha(sourceBytes),sourceNormalizedHash:sha(normalize(sourceBytes)),baselineHash:sha(baselineBytes),baselineNormalizedHash:sha(normalize(baselineBytes)),mirrorsMatch:true,regions:{},helpers:{},atlases:{},shaders:{},publicMath:{},landmarks:{},flybyCatalogs:{},routes:{},checks:[],limits:['Star surface sizes, colors and brightness remain illustrative teaching visuals.','Only the four-arm spiral emission tile changes; all generated world positions remain fixed.','Scene data, atlas, helper, catalog and camera samples are compared with the preserved renderer; this audit does not measure browser rasterization.']};
for(const name of ['neighborhood','galaxy','cosmic']) {
  const a=current.__audit.makeRegion(name),b=baseline.__audit.makeRegion(name);
  assert.deepEqual(binary(a.points),binary(b.points),name+' exact generated point bytes');
  compareJson(a.galaxies,b.galaxies,name+' exact generated model bytes');
  const landmarks=current.UniverseFlight.landmarks(name);
  compareJson(landmarks,baseline.UniverseFlight.landmarks(name),name+' landmark catalog');
  const catalog=current.UniverseFlight.flybys(name);
  compareJson(catalog,baseline.UniverseFlight.flybys(name),name+' public flyby catalog');
  const aGeometry=current.__audit.helpers.galaxyGeometry(a.galaxies),bGeometry=baseline.__audit.helpers.galaxyGeometry(b.galaxies);
  assert.deepEqual(binary(aGeometry.points),binary(bGeometry.points),name+' galaxy helper geometry bytes');
  compareJson(aGeometry.ellipticals,bGeometry.ellipticals,name+' elliptical range metadata');
  result.regions[name]={pointCount:a.points.length/9,pointBytes:a.points.byteLength,pointBytesHash:sha(binary(a.points)),galaxyModelCount:a.galaxies.length,galaxyModelsHash:sha(jsonBytes(a.galaxies)),galaxyGeometryFloats:aGeometry.points.length,galaxyGeometryHash:sha(binary(aGeometry.points)),matchesBaseline:true,nonPositionAttributesMatchBaseline:true};
  result.landmarks[name]={count:landmarks.length,catalogHash:sha(jsonBytes(landmarks)),matchesBaseline:true};
  result.flybyCatalogs[name]={count:catalog.length,catalogHash:sha(jsonBytes(catalog)),matchesBaseline:true};
}
console.log('Audit: all world data, geometry and catalogs match.');
for(const name of Object.keys(current.__audit.helpers)) {
  const a=current.__audit.helpers[name].toString(),b=baseline.__audit.helpers[name].toString();
  assert.equal(a,b,name+' helper source');
  result.helpers[name]={sourceHash:sha(Buffer.from(a)),matchesBaseline:true};
}
const atlas=current.__audit.galaxyPixels(512),oldAtlas=baseline.__audit.galaxyPixels(512);
assert.equal(atlas.length,oldAtlas.length);assert.equal(atlas.length,512*512*4*4);
function tileBytes(values,tile){const out=new Uint8Array(512*512*4);for(let y=0;y<512;y++)out.set(values.subarray((y*2048+tile*512)*4,(y*2048+(tile+1)*512)*4),y*512*4);return out;}
const tileRecords=[];let changedPixels=0,coreBytes=0,gutterBytes=0,nearWhiteChannels=0,total=0,oldTotal=0,outer=0,oldOuter=0;
for(let tile=0;tile<4;tile++){
  const a=tileBytes(atlas,tile),b=tileBytes(oldAtlas,tile);
  if(tile>0)assert.deepEqual(binary(a),binary(b),'unchanged morphology tile '+tile);
  tileRecords.push({tile,hash:sha(binary(a)),baselineHash:sha(binary(b)),matchesBaseline:tile>0});
  if(tile!==0)continue;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4,gutter=x<8||x>=504||y<8||y>=504;
    const r=Math.hypot(((x-8)/495*2-1)*1.22,((y-8)/495*2-1)*1.22),core=!gutter&&r<.18;
    if(gutter||core){assert.deepEqual(binary(a.subarray(i,i+4)),binary(b.subarray(i,i+4)),gutter?'exact gutter':'exact warm core');if(gutter)gutterBytes+=4;else coreBytes+=4;}
    if(a.subarray(i,i+4).some((value,k)=>value!==b[i+k]))changedPixels++;
    for(let k=0;k<3;k++)if(a[i+k]>=250)nearWhiteChannels++;
    const emission=(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2])*a[i+3]/255,oldEmission=(.2126*b[i]+.7152*b[i+1]+.0722*b[i+2])*b[i+3]/255;
    total+=emission;oldTotal+=oldEmission;if(!core){outer+=emission;oldOuter+=oldEmission;}
  }
}
assert.ok(changedPixels>10000);assert.ok(nearWhiteChannels===0);assert.ok(total/oldTotal>.85&&total/oldTotal<1.15,'bounded display emission');
assert.equal(current.__audit.galaxyPixels(512),atlas,'CPU atlas is cached');
result.spiralDetail={tile:0,changedPixels,coreBytes,gutterBytes,nearWhiteChannels,emissionRatio:total/oldTotal,outerEmissionRatio:outer/oldOuter,coreMatchesBaseline:true,guttersMatchBaseline:true,otherTilesMatchBaseline:true,tiles:tileRecords,cached:true};
result.atlases.galaxyPixels={bytes:atlas.byteLength,hash:sha(binary(atlas)),baselineHash:sha(binary(oldAtlas)),matchesBaseline:false,intentionallyChanged:true};
const cloud=current.__audit.cloudPixels(),oldCloud=baseline.__audit.cloudPixels();assert.deepEqual(binary(cloud),binary(oldCloud),'exact cloud atlas bytes');
result.atlases.cloudPixels={bytes:cloud.byteLength,hash:sha(binary(cloud)),matchesBaseline:true};
for(const name of Object.keys(current.__audit.shaders)) {
  const a=current.__audit.shaders[name],b=baseline.__audit.shaders[name];
  const unchanged=true;
  if(unchanged)assert.equal(a,b,name+' shader source');

  result.shaders[name]={hash:sha(Buffer.from(a)),baselineHash:sha(Buffer.from(b)),matchesBaseline:unchanged,intentionallyChanged:!unchanged};
}
assert.deepEqual(Object.keys(current.UniverseFlight.math),Object.keys(baseline.UniverseFlight.math),'public math API names');
for(const name of Object.keys(current.UniverseFlight.math)) {
  const a=current.UniverseFlight.math[name].toString(),b=baseline.UniverseFlight.math[name].toString();
  assert.equal(a,b,name+' public math source');
  result.publicMath[name]={sourceHash:sha(Buffer.from(a)),matchesBaseline:true};
}
compareJson(current.UniverseFlight.flybys(),baseline.UniverseFlight.flybys(),'complete public flyby catalog');
assert.deepEqual(Object.keys(current.__audit.routes),['halo','nebula','group','stellar'],'all four authored routes');
assert.deepEqual(Object.keys(current.__audit.routes),Object.keys(baseline.__audit.routes),'private route catalog names');
for(const id of Object.keys(current.__audit.routes)) {
  const a=current.__audit.routes[id],b=baseline.__audit.routes[id];
  compareJson(a,b,id+' route metadata');
  assert.equal(a.atTime.toString(),b.atTime.toString(),id+' atTime function source');
  const samples=[];
  for(let index=0;index<=a.durationSeconds*10;index++) {
    const seconds=index/10,sample=a.atTime(seconds);
    compareJson(sample,b.atTime(seconds),id+' exact camera sample at '+seconds+' seconds');
    samples.push(sample);
  }
  result.routes[id]={durationSeconds:a.durationSeconds,sampleIntervalSeconds:0.1,sampleCount:samples.length,metadataHash:sha(jsonBytes(a)),atTimeSourceHash:sha(Buffer.from(a.atTime.toString())),sampleHash:sha(jsonBytes(samples)),matchesBaseline:true};
}
result.totalRouteSamples=Object.values(result.routes).reduce((sum,value)=>sum+value.sampleCount,0);
assert.equal(result.totalRouteSamples,1704,'all four route poses at 100 ms intervals');
result.checks.push('All point fields and models retain exact baseline bytes.','Galaxy geometry, elliptical projection and surface writer preserve source and outputs.','Only spiral tile zero changes; other tiles, core, gutters, cloud atlas and shaders retain exact bytes.','All public math functions and landmark/flyby catalogs preserve their contracts.','All four authored routes preserve every camera sample at 100 ms intervals.','All four shaders retain exact accepted bytes.');
assert.deepEqual(fs.readFileSync(sourcePath),sourceBytes,'renderer remained stable during audit');
assert.deepEqual(fs.readFileSync(mirrorPath),mirrorBytes,'mirror remained stable during audit');
assert.deepEqual(fs.readFileSync(baselinePath),baselineBytes,'baseline remained stable during audit');
result.completed=true;
fs.mkdirSync(outputDir,{recursive:true});
const output=path.join(outputDir,'renderer-audit.json');
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({completed:true,sourceHash:result.sourceHash,sourceNormalizedHash:result.sourceNormalizedHash,pointCounts:Object.values(result.regions).map(value=>value.pointCount),routes:Object.fromEntries(Object.entries(result.routes).map(([id,value])=>[id,value.sampleCount])),checks:result.checks.length,output},null,2));
