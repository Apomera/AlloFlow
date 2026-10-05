import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const testDirectory=dirname(fileURLToPath(import.meta.url));
const repo=existsSync(resolve(testDirectory,'../vendor/three-r128/three.min.js'))?resolve(testDirectory,'..'):resolve(testDirectory,'../../..');
const THREE=require(resolve(repo,'vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||resolve(repo,'stem_lab/stem_tool_cephalopodlab.js'),'utf8').replace(/\r\n/g,'\n');
function braced(start){
  const open=source.indexOf('{',start);if(start<0||open<0)throw new Error('Missing actual-source block');
  let depth=0,quote='',lineComment=false,blockComment=false;
  for(let i=open;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{')depth++;if(c==='}'&&!--depth)return source.slice(start,i+1);
  }
  throw new Error('Unterminated actual-source block');
}
function helper(name){return braced(source.indexOf('function '+name+'('));}
const visualMath=Object.create(Math);visualMath.random=()=>{throw new Error('Lighting consumed simulation RNG');};
const update=new Function('Math',helper('updateCLHuntWaterLighting')+';return updateCLHuntWaterLighting;')(visualMath);
const shadeSand=new Function('Math',helper('shadeCLHuntSandLight')+';return shadeCLHuntSandLight;')(visualMath);
const shadeShaft=new Function('Math',helper('softenLightShaft')+';return softenLightShaft;')(visualMath);
const zoneDefinitions=braced(source.indexOf('var DEPTH_ZONES = '));
const depthDefinitions=helper('depthZoneFor');
const depth=new Function('__alloT',zoneDefinitions+';'+depthDefinitions+';return {zones:DEPTH_ZONES,zoneFor:depthZoneFor};')((_key,fallback)=>fallback);

function lights(){
  return {sun:new THREE.DirectionalLight(0xb8e6f0,.85),ambient:new THREE.AmbientLight(0x3a5876,.60),fillLight:new THREE.HemisphereLight(0x9cded9,0x554737,.55)};
}
function settle(day,y){
  const live=lights(),attenuation=Math.exp(-Math.max(0,-y)*.065);
  for(let frame=0;frame<240;frame++)update(live.sun,live.ambient,live.fillLight,day,attenuation,1-Math.exp(-2*.05));
  return live;
}
function radiance(live){
  return [live.sun.intensity,live.ambient.intensity,live.fillLight.intensity,...live.sun.color.toArray(),...live.ambient.color.toArray(),...live.fillLight.color.toArray(),...live.fillLight.groundColor.toArray()];
}
function bounded(live){
  const values=radiance(live);expect(values.every(Number.isFinite)).toBe(true);
  values.slice(0,3).forEach(value=>{expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1.2);});
  values.slice(3).forEach(value=>{expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);});
}
function section(from,to){const start=source.indexOf(from),end=source.indexOf(to,start);if(start<0||end<=start)throw new Error('Missing lighting frame section '+from);return source.slice(start,end);}
const actualGuard=source.match(/if \(!gameState\.gameOver && !gameState\.paused\) \{/);
if(!actualGuard)throw new Error('Active render guard missing');
const dayFrame=section('            gameState.dayTime = ((','            // ─── Pressure strain');
const groundLine=source.match(/            var groundX=Math\.round[^\n]+/);
if(!groundLine)throw new Error('World tile anchor missing');
const tileStart=source.indexOf('if(floor.position.x!==groundX||floor.position.z!==groundZ){');
const tileFrame=braced(tileStart);
if(!tileFrame.includes('causticsGeo.attributes.position')||!tileFrame.includes('floorGeo.computeVertexNormals()'))throw new Error('Actual terrain transfer block missing');
const transferTile=new Function('floor','floorGeo','causticsGeo','groundX','groundZ','Math',helper('terrainHeight')+tileFrame);
const finishFrame=section('            sandTex.offset.x=','            // ─── Endless-ocean object recycling');
const rayShimmerStart=source.indexOf('// ─── Light ray shimmer');
const rayStart=source.indexOf('lightRays.forEach(function(r) {',rayShimmerStart);
if(rayShimmerStart<0||rayStart<rayShimmerStart)throw new Error('Actual light-ray shimmer block missing');
const rayFrame=braced(rayStart)+');';
if(!rayFrame.includes('r.mesh.material.opacity')||rayFrame.includes('recyclePos'))throw new Error('Light-ray test selected a recycling block');
const frame=new Function('live','dt','Math',helper('updateCLHuntWaterLighting')+String.raw`
  const {gameState,scene,sun,ambient,fillLight,octopus,sandTex,causticsTex,caustics,backdrop,camera,backdropMat,surfaceSheet,surfaceMat,shaftGroup,shafts,sandDownwelling,lightRays,updateGround}=live;
  const DEPTH_ZONES=live.zones,depthZoneFor=live.zoneFor,now=live.now;
  var causticPhase=live.phase;
`+actualGuard[0]+dayFrame+groundLine[0]+'\n'+finishFrame+rayFrame+'\n}\nlive.phase=causticPhase;');
function world(reducedMotion=false){
  const illumination=lights(),sandPixels=new Uint8Array([150,148,137,255,188,184,166,255,165,160,145,255,193,190,177,255]),causticPixels=new Uint8Array([188,231,237,0,188,231,237,190,188,231,237,25,188,231,237,120]);
  const sandTex=new THREE.DataTexture(sandPixels,2,2),causticsTex=new THREE.DataTexture(causticPixels,2,2);
  const floorGeo=new THREE.PlaneGeometry(200,200,80,80),causticsGeo=floorGeo.clone(),shaftGeo=new THREE.PlaneGeometry(3,46,1,1);
  const shaft=new THREE.Mesh(shaftGeo,new THREE.MeshBasicMaterial({transparent:true,opacity:.06}));shaft.rotation.z=.04;
  const ray=new THREE.Mesh(shaftGeo,new THREE.MeshBasicMaterial({transparent:true,opacity:.08}));
  return {...illumination,gameState:{paused:false,gameOver:false,dayTime:0,dayPeriodMs:Infinity,verticalY:0,currentDepthZone:'reef',a11y:{reducedMotion}},scene:{background:new THREE.Color(0x0e3d5c),fog:new THREE.Fog(0x0a4a6b,5,42)},octopus:{position:new THREE.Vector3(42,.55,0)},camera:{position:new THREE.Vector3(40,4,-7)},sandTex,causticsTex,sandPixels,causticPixels,floorGeo,causticsGeo,shaftGeo,caustics:new THREE.Mesh(causticsGeo,new THREE.MeshBasicMaterial({map:causticsTex,transparent:true,opacity:.065})),backdrop:{position:new THREE.Vector3()},backdropMat:{uniforms:{bottomColor:{value:new THREE.Color()},topColor:{value:new THREE.Color()}}},surfaceSheet:{position:new THREE.Vector3()},surfaceMat:{opacity:.165},shaftGroup:{position:new THREE.Vector3()},shafts:[{mesh:shaft,baseZ:.04,phase:.6,baseOpacity:.085}],lightRays:[{mesh:ray,basePhase:.3}],sandDownwelling:{value:1},zones:depth.zones,zoneFor:depth.zoneFor,updateGround:()=>{},phase:0,now:1000};
}
function resources(live){
  return [live.sun.color,live.ambient.color,live.fillLight.color,live.fillLight.groundColor,live.sandDownwelling,live.sandTex,live.causticsTex,live.floorGeo.attributes.position.array,live.floorGeo.attributes.normal.array,live.causticsGeo.attributes.position.array,live.shaftGeo.attributes.position.array];
}
function state(live){return JSON.stringify({radiance:radiance(live),day:live.gameState.dayTime,phase:live.phase,sand:live.sandDownwelling.value,caustic:live.caustics.material.opacity,offset:live.causticsTex.offset.toArray(),surface:live.surfaceMat.opacity,top:live.backdropMat.uniforms.topColor.value.toArray(),bottom:live.backdropMat.uniforms.bottomColor.value.toArray(),shafts:live.shafts.map(s=>[s.mesh.rotation.z,s.mesh.material.opacity]),rays:live.lightRays.map(r=>[r.mesh.rotation.y,r.mesh.material.opacity])});}
function dispose(live){live.sandTex.dispose();live.causticsTex.dispose();live.floorGeo.dispose();live.causticsGeo.dispose();live.shaftGeo.dispose();live.caustics.material.dispose();live.shafts[0].mesh.material.dispose();live.lightRays[0].mesh.material.dispose();}

describe('Cephalopod Hunter underwater lighting finish',()=>{
  it('retains three bounded native lights with clear shallow relief, cool depth, and a visible night transition',()=>{
    const day=settle(1,0),night=settle(0,0),deep=settle(1,-35);[day,night,deep].forEach(bounded);
    expect(day.sun.intensity).toBeGreaterThan(1);expect(day.sun.intensity/day.ambient.intensity).toBeGreaterThan(3);
    expect(day.sun.intensity).toBeGreaterThan(night.sun.intensity*8);expect(deep.sun.intensity).toBeLessThan(day.sun.intensity*.15);
    expect(day.sun.color.r/day.sun.color.b).toBeGreaterThan(1);expect(deep.sun.color.b/deep.sun.color.r).toBeGreaterThan(1.7);
    expect(day.fillLight.groundColor.r).toBeGreaterThan(day.fillLight.groundColor.b);expect(night.fillLight.groundColor.b).toBeGreaterThan(night.fillLight.groundColor.r);
    expect(deep.ambient.intensity).toBeGreaterThanOrEqual(.16);expect(deep.fillLight.intensity).toBeGreaterThanOrEqual(.18);
  });
  it('smooths depth and day transitions in place and freezes exactly for zero blend',()=>{
    const live=settle(1,0),colors=[live.sun.color,live.ambient.color,live.fillLight.color,live.fillLight.groundColor],before=radiance(live);
    update(live.sun,live.ambient,live.fillLight,0,.02,0);expect(radiance(live)).toEqual(before);
    update(live.sun,live.ambient,live.fillLight,0,.02,1-Math.exp(-2*.05));bounded(live);
    const one=radiance(live);expect(one[0]).toBeLessThan(before[0]);expect(one[0]).toBeGreaterThan(before[0]*.85);
    for(let tick=0;tick<600;tick++){const day=(Math.cos(tick*.017)+1)/2,depth=Math.exp(-(tick%80)*.065);update(live.sun,live.ambient,live.fillLight,day,depth,1-Math.exp(-2*.05));bounded(live);}
    expect([live.sun.color,live.ambient.color,live.fillLight.color,live.fillLight.groundColor]).toEqual(colors);
    [live.sun.color,live.ambient.color,live.fillLight.color,live.fillLight.groundColor].forEach((color,index)=>expect(color).toBe(colors[index]));
  });
  it('modifies actual r128 sand and shared shaft shaders without extra textures or broken shader chunks',()=>{
    const scalar={value:1},sand={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}},shaft={vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader,uniforms:{}};
    shadeSand(sand,scalar);shadeShaft(shaft);
    expect(Object.keys(sand.uniforms)).toEqual(['clSandDownwelling']);expect(sand.uniforms.clSandDownwelling).toBe(scalar);expect(Object.keys(shaft.uniforms)).toEqual([]);
    expect(sand.vertexShader).toContain('clSandWorld=(modelMatrix*vec4(position,1.0)).xyz');expect(sand.fragmentShader).toContain('uniform float clSandDownwelling;');
    expect(sand.fragmentShader).toContain('fwidth(clRipplePhase)');expect(sand.fragmentShader).toContain('normal=normalize(');expect(sand.fragmentShader).toContain('#include <normal_fragment_maps>');
    expect(shaft.fragmentShader).toContain('clShaftAcross');expect(shaft.fragmentShader).toContain('diffuseColor.a*=');
    for(const shader of [sand,shaft]){expect(shader.vertexShader).toContain('#include <begin_vertex>');expect(shader.fragmentShader).toContain('#include <color_fragment>');expect(shader.vertexShader).not.toContain('\\n');expect(shader.fragmentShader).not.toContain('\\n');}
    expect((sand.fragmentShader.match(/texture2D\(/g)||[]).length).toBe((THREE.ShaderLib.standard.fragmentShader.match(/texture2D\(/g)||[]).length);
    expect(source).toContain("renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;");expect(source).toContain('sun.shadow.mapSize.set(1024,1024);');
  });
  it('transfers actual terrain tiles into the existing r128 caustic attribute and array with bit-exact positions',()=>{
    const floorConstruction=source.match(/var floorGeo\s*=\s*(new THREE\.PlaneGeometry\([^;]+\));/);
    const causticConstruction=source.match(/var causticsGeo=(floorGeo\.clone\(\));/);
    if(!floorConstruction||!causticConstruction)throw new Error('Actual floor and fixed caustic-clone construction missing');
    const floorGeo=new Function('THREE','return '+floorConstruction[1]+';')(THREE);
    const causticsGeo=new Function('floorGeo','return '+causticConstruction[1]+';')(floorGeo);
    const floor=new THREE.Object3D(),floorAttribute=floorGeo.attributes.position,causticAttribute=causticsGeo.attributes.position;
    const floorArray=floorAttribute.array,causticArray=causticAttribute.array;
    let changedTiles=0,prior=Buffer.from(new Uint8Array(floorArray.buffer,floorArray.byteOffset,floorArray.byteLength));
    try{
      expect(floorAttribute.count).toBe(6561);expect(causticAttribute.count).toBe(floorAttribute.count);
      expect(causticArray.length).toBe(floorArray.length);expect(causticArray).not.toBe(floorArray);
      for(const [x,z]of [[12,0],[24,12],[48,-24],[-84,96],[252,-132],[-120,-120]]){
        const floorVersion=floorAttribute.version,causticVersion=causticAttribute.version;
        transferTile(floor,floorGeo,causticsGeo,x,z,visualMath);
        expect(floorGeo.attributes.position).toBe(floorAttribute);expect(causticsGeo.attributes.position).toBe(causticAttribute);
        expect(floorAttribute.array).toBe(floorArray);expect(causticAttribute.array).toBe(causticArray);
        expect(floorAttribute.count).toBe(causticAttribute.count);expect(floorArray.length).toBe(causticArray.length);
        const floorBytes=Buffer.from(floorArray.buffer,floorArray.byteOffset,floorArray.byteLength),causticBytes=Buffer.from(causticArray.buffer,causticArray.byteOffset,causticArray.byteLength);
        expect(causticBytes.equals(floorBytes)).toBe(true);expect(Array.from(causticArray).every(Number.isFinite)).toBe(true);
        if(!prior.equals(floorBytes))changedTiles++;prior=Buffer.from(floorBytes);
        expect(floorAttribute.version).toBe(floorVersion+1);expect(causticAttribute.version).toBe(causticVersion+1);
        const stableVersion=causticAttribute.version;transferTile(floor,floorGeo,causticsGeo,x,z,visualMath);
        expect(causticAttribute.version).toBe(stableVersion);expect(causticAttribute.array).toBe(causticArray);
      }
      expect(changedTiles).toBeGreaterThan(1);
    }finally{floorGeo.dispose();causticsGeo.dispose();}
  });
  it('executes the actual live day, depth, floor and shaft finish while preserving existing resource identities and static bytes',()=>{
    const live=world(),refs=resources(live),buffers=refs.filter(resource=>ArrayBuffer.isView(resource)).map(array=>({array,bytes:Array.from(array)})),pixels=[Array.from(live.sandPixels),Array.from(live.causticPixels)];
    try{
      for(let tick=0;tick<240;tick++){live.gameState.verticalY=-tick/10;live.octopus.position.y=live.gameState.verticalY+.55;live.now+=50;frame(live,.05,visualMath);bounded(live);expect(live.sandDownwelling.value).toBeGreaterThanOrEqual(0);expect(live.sandDownwelling.value).toBeLessThanOrEqual(1);expect(live.caustics.material.opacity).toBeGreaterThanOrEqual(0);expect(live.caustics.material.opacity).toBeLessThanOrEqual(.065);expect(live.shafts[0].mesh.material.opacity).toBeLessThanOrEqual(.085);expect(live.lightRays[0].mesh.material.opacity).toBeLessThanOrEqual(.04);}
      resources(live).forEach((resource,index)=>expect(resource).toBe(refs[index]));buffers.forEach(({array,bytes})=>expect(Array.from(array)).toEqual(bytes));
      expect(Array.from(live.sandPixels)).toEqual(pixels[0]);expect(Array.from(live.causticPixels)).toEqual(pixels[1]);
      expect(live.sun.position.clone().sub(live.octopus.position).toArray()).toEqual([12,34,8]);expect(live.sun.target.position.toArray()).toEqual(live.octopus.position.toArray());
      expect(live.surfaceMat.opacity).toBeLessThan(.05);expect(live.shafts[0].mesh.material.opacity).toBeLessThan(.015);expect(live.backdropMat.uniforms.topColor.value.b).toBeGreaterThan(live.backdropMat.uniforms.topColor.value.r);
      expect(live.backdropMat.uniforms.bottomColor.value.toArray()).toEqual(live.scene.fog.color.toArray());
    }finally{dispose(live);}
  });
  it('uses the actual active gate to freeze paused and finished presentation, and freezes decorative motion under reduced motion',()=>{
    const live=world(true);
    try{
      for(let tick=0;tick<100;tick++)frame(live,.05,visualMath);
      const phase=live.phase,shaftZ=live.shafts[0].mesh.rotation.z,rayY=live.lightRays[0].mesh.rotation.y;
      for(let tick=0;tick<50;tick++){live.now+=50;frame(live,.05,visualMath);}
      expect(live.phase).toBe(phase);expect(live.shafts[0].mesh.rotation.z).toBe(shaftZ);expect(live.lightRays[0].mesh.rotation.y).toBe(rayY);
      live.gameState.paused=true;const paused=state(live);for(let tick=0;tick<20;tick++){live.now+=50;frame(live,.05,visualMath);}expect(state(live)).toBe(paused);
      live.gameState.paused=false;live.gameState.gameOver=true;const finished=state(live);frame(live,.05,visualMath);expect(state(live)).toBe(finished);
    }finally{dispose(live);}
  });
});
