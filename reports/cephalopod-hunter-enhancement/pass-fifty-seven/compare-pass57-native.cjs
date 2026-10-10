const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const work=path.join(__dirname,'pass57-work'),read=p=>JSON.parse(fs.readFileSync(work+'/'+p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const a=read('baseline-views/manifest.json'),b=read('candidate-views/manifest.json'),g=read('change-guards.json');
assert.equal(a.sourceSHA,g.baselineSHA);assert.equal(b.sourceSHA,g.candidateSHA);
assert.equal(a.frames.length,9);assert.equal(b.frames.length,9);assert.equal(a.checks.length,7);assert.equal(b.checks.length,11);
assert.ok([...a.checks,...b.checks].every(c=>c.passed));assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
const tissueMarkers=['ribbonAttribute','tissueUV','grainFilter','veinFilter','sunBacklight','guardedBacklight'];
const checksum=/^\d+:[a-f0-9]{8}$/;
const retainedMasks=new Map(),retainedOriginals=new Map();
function checkProgram(old,current,kind,image){
  for(const [program,finish] of [[old,false],[current,true]]){
    assert.ok(program,kind+' native program exists '+image);assert.equal(program.linked,true);assert.equal(program.compiled,true);
    assert.deepEqual(Object.keys(program.markers).sort(),tissueMarkers.slice().sort());
    for(const marker of tissueMarkers)assert.equal(program.markers[marker],finish,kind+' actual compiled '+marker+' '+image);
    assert.equal(program.shaderChecksums.length,2);assert.ok(program.shaderChecksums.every(value=>checksum.test(value)));
  }
  assert.notDeepEqual(old.shaderChecksums,current.shaderChecksums,kind+' native shader changes '+image);
}
function originalBuffers(plant){
  const result={...plant.buffers};delete result.clPlantRibbon;
  for(const name of ['position','normal','color','uv','index'])assert.ok(checksum.test(result[name]),plant.name+' original '+name+' byte receipt');
  if(plant.name==='cl-seagrass')assert.ok(checksum.test(result.instanceMatrix),'Instanced grass byte receipt');else assert.equal(result.instanceMatrix,undefined);
  return result;
}
const pairs=[];
for(let i=0;i<a.frames.length;i++){
  const x=a.frames[i],y=b.frames[i];assert.equal(x.image,y.image);assert.deepEqual(x.profile,y.profile);
  assert.equal(x.posesSHA,y.posesSHA,'Seeded world and Three UUIDs: '+x.image);
  for(const field of ['player','camera','cameraQuaternion','memory','render','target','score','lights','simulatedMs'])assert.deepEqual(x.state[field],y.state[field],field+' '+x.image);
  assert.ok(x.state.lights.length>0);assert.ok(x.state.lights.some(light=>light.type==='DirectionalLight'));
  assert.ok(x.state.lights.every(light=>light.color.length===3&&light.color.every(Number.isFinite)&&Number.isFinite(light.intensity)));assert.ok(Number.isFinite(x.state.simulatedMs));
  for(const kind of ['cl-kelp','cl-seagrass'])checkProgram(x.state.programs[kind],y.state.programs[kind],kind,x.image);
  assert.equal(x.state.contextLost,false);assert.equal(y.state.contextLost,false);assert.equal(x.state.resourcesRetained,true);assert.equal(y.state.resourcesRetained,true);
  assert.equal(x.state.plants.length,105);assert.equal(y.state.plants.length,105);let maskBytes=0;
  for(let j=0;j<x.state.plants.length;j++){
    const old=x.state.plants[j],current=y.state.plants[j];
    for(const field of ['name','uuid','geometry','vertices','indices','opacity','transparent','depthWrite'])assert.deepEqual(old[field],current[field]);
    assert.equal(old.mask,null);assert.equal(old.buffers.clPlantRibbon,undefined);assert.equal(current.key,'cl-plant-flex-v57-tissue');assert.equal(old.key,'cl-plant-flex-v28-water-pulse');
    const original=originalBuffers(old);assert.deepEqual(original,originalBuffers(current),'Original plant/instance bytes '+x.image+' '+old.uuid);
    const identity=JSON.stringify(x.profile)+':'+old.uuid;
    if(retainedOriginals.has(identity))assert.deepEqual(original,retainedOriginals.get(identity),'Original buffers stay immutable across motion/cameras');else retainedOriginals.set(identity,original);
    assert.equal(current.maskBytes,current.vertices*4);assert.ok(/^[a-f0-9]{64}$/.test(current.maskSHA));assert.ok(checksum.test(current.buffers.clPlantRibbon));assert.equal(Number(current.buffers.clPlantRibbon.split(':')[0]),current.maskBytes);
    if(retainedMasks.has(identity))assert.equal(current.buffers.clPlantRibbon,retainedMasks.get(identity),'Ribbon mask bytes remain immutable');else retainedMasks.set(identity,current.buffers.clPlantRibbon);
    maskBytes+=current.maskBytes;
  }
  assert.equal(maskBytes,38260);assert.equal(sha(fs.readFileSync(work+'/baseline-views/'+x.image)),x.imageSHA);assert.equal(sha(fs.readFileSync(work+'/candidate-views/'+y.image)),y.imageSHA);
  pairs.push({image:x.image,seededPosesIdentical:true,cameraIdentical:true,HUDIdentical:true,actualSceneLightsIdentical:true,simulatedTimeIdentical:true,drawCallsAndTrianglesIdentical:true,GLGeometryAndTextureCountsIdentical:true,originalPlantResourcesRetained:true,originalPlantBuffersIdentical:true,actualCompiledTissueShadersVerified:true,maskBytes,pixelsChanged:x.imageSHA!==y.imageSHA});
}
assert.ok(pairs.some(pair=>pair.pixelsChanged),'Plant finish must be visible');assert.equal(a.gameplay.length,2);assert.equal(b.gameplay.length,2);
const sameProfile=(one,two)=>one.species===two.species&&one.phone===two.phone&&one.quality===two.quality;
for(let i=0;i<2;i++){
  const old=a.gameplay[i],current=b.gameplay[i];assert.deepEqual(old.profile,current.profile);
  for(const proof of [old.ray,current.ray]){assert.equal(proof.kind,'hit');assert.ok(proof.hitCount>0);assert.ok(proof.candidateCount>0);assert.equal(proof.rootUUID,proof.firstHitRootUUID);assert.equal(proof.expectedLabel,'crab');assert.ok(Number.isFinite(proof.firstDistance)&&proof.firstDistance>0);assert.ok(proof.ndc.every(coordinate=>Number.isFinite(coordinate)&&Math.abs(coordinate)<1));}
  assert.equal(old.ray.rootUUID,current.ray.rootUUID,'Same controlled crab chosen in baseline and candidate');assert.equal(old.afterTick.state,'striking');assert.notEqual(current.immediate.state,'striking');assert.notEqual(current.afterTick.state,'striking');assert.ok(current.immediate.action.length>0);assert.ok(/crab/i.test(current.immediate.name),'Synchronous feedback names controlled prey');assert.ok(current.passed);
  const misses=b.checks.filter(check=>sameProfile(check.profile,current.profile)&&check.check==='Verified empty prey ray leaves selection without a strike');assert.equal(misses.length,1);assert.equal(misses[0].ray.kind,'miss');assert.equal(misses[0].ray.hitCount,0);assert.ok(misses[0].ray.candidateCount>0);
  const intentional=b.checks.filter(check=>sameProfile(check.profile,current.profile)&&/Intentional (touch Strike|E) still starts strike/.test(check.check));assert.equal(intentional.length,1);assert.ok(Number.isFinite(intentional[0].sinceHitMs));assert.ok(intentional[0].sinceHitMs>=0&&intentional[0].sinceHitMs<650);assert.ok(intentional[0].timingRationale.includes('Private gameState is not exposed'));assert.equal(intentional[0].passed,true);
}
const result={baselineSHA:g.baselineSHA,candidateSHA:g.candidateSHA,pairs,nativeChecks:11,gameplayProfiles:2,errors:[],scope:'Nine native visual pairs preserve seeded world poses, object UUIDs, cameras, HUD, actual scene-light colour/intensity, consumed simulation time, original plant/instance buffer bytes, scene draws and triangles, and GL geometry/texture counts. Actual attached GL shaders verify tissue/mask/filter/backlight code. One immutable ribbon-mask attribute adds38260bytes. Desktop and emulated phone verify exact controlled-crab ray/root selection and empty live-prey rays; successful intentional E/touch strikes occur before650ms of simulated time. Private gameState is not exposed; focused unit tests check pending/timing state. Scripted plant study cameras and projected crab placement are disclosed. No FPS claim.'};
fs.writeFileSync(work+'/native-comparison.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pairs:9,pixelsChanged:pairs.filter(pair=>pair.pixelsChanged).length,nativeChecks:11,gameplayProfiles:2,identicalWorldPoses:true,identicalDrawCalls:true,originalBufferBytesIdentical:true,actualShaderMarkersVerified:true,actualLightsIdentical:true}));
