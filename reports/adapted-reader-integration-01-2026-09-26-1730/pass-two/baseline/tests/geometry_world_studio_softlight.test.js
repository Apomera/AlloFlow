import {describe,it,expect,vi,beforeAll,beforeEach,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';

let THREE,api,makeShape;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
  new Function(source.replace('window.StemLab.geometryWorldBuilderPure = {','window.StemLab.geometryWorldBuilderPure = {showcaseBuildForTest:showcaseBuild,'))();
  api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();delete window.__geoWorldEngine;});

const INCLUDE='#include <shadowmap_pars_fragment>';
const SOFT='#elif defined( SHADOWMAP_TYPE_PCF_SOFT )';
const VSM='#elif defined( SHADOWMAP_TYPE_VSM )';
function camera(width=24,height=12){return new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,100);}
function compile(material,fragmentShader=THREE.ShaderLib.standard.fragmentShader){
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader,uniforms:{existing:{value:17}}};
  material.onBeforeCompile(shader,{});return shader;
}
function insertedChunk(shader){
  const [before,after]=THREE.ShaderLib.standard.fragmentShader.split(INCLUDE);
  expect(shader.fragmentShader.startsWith(before)).toBe(true);expect(shader.fragmentShader.endsWith(after)).toBe(true);
  return shader.fragmentShader.slice(before.length,shader.fragmentShader.length-after.length);
}
function softParts(chunk){
  const start=chunk.indexOf(SOFT),end=chunk.indexOf(VSM,start);
  expect(start).toBeGreaterThan(-1);expect(end).toBeGreaterThan(start);
  return {before:chunk.slice(0,start),branch:chunk.slice(start,end),after:chunk.slice(end)};
}
function materialState(material){return {keys:Object.keys(material),hook:material.onBeforeCompile,cache:material.customProgramCacheKey,version:material.version,userData:JSON.stringify(material.userData),color:material.color?.toArray(),map:material.map};}
function spread(shader){const uniform=shader.uniforms.gweStudioShadowSpread;expect(uniform?.value?.isVector2).toBe(true);return uniform.value;}

describe('floor-only Studio softlight against pinned THREE r128 shaders',()=>{
  it('replaces only the PCFSoft branch and preserves every stock frustum, bias, basic, PCF, VSM and point-shadow path',()=>{
    const chunksBefore={...THREE.ShaderChunk},stock=softParts(THREE.ShaderChunk.shadowmap_pars_fragment),material=new THREE.MeshStandardMaterial();
    expect(api.configureStudioFloorShadow(material,camera())).toBe(true);
    const shader=compile(material),actual=softParts(insertedChunk(shader));
    const declaration=/uniform\s+vec2\s+gweStudioShadowSpread\s*;\r?\n/g;
    expect(actual.before.match(declaration)).toHaveLength(1);
    expect(actual.before.replace(declaration,'')).toBe(stock.before);expect(actual.after).toBe(stock.after);expect(actual.branch).not.toBe(stock.branch);
    const comparisons=text=>(text.match(/texture2DCompare\s*\(/g)||[]).length;
    expect(comparisons(actual.branch)).toBeGreaterThan(1);expect(comparisons(actual.branch)).toBeLessThanOrEqual(comparisons(stock.branch));
    expect(actual.branch).not.toMatch(/\bfor\s*\(|\bwhile\s*\(/);expect(shader.vertexShader).toBe(THREE.ShaderLib.standard.vertexShader);
    expect(shader.uniforms.existing.value).toBe(17);expect(THREE.ShaderChunk).toEqual(chunksBefore);
  });

  it.each([[4,4],[24,12],[360,36]])('keeps equal physical softness on a %s by %s orthographic span', (width,height)=>{
    const material=new THREE.MeshStandardMaterial(),shadowCamera=camera(width,height),cameraBefore=shadowCamera.toJSON();
    expect(api.configureStudioFloorShadow(material,shadowCamera)).toBe(true);
    const value=spread(compile(material)),worldX=value.x*width,worldY=value.y*height;
    expect(Number.isFinite(worldX)&&Number.isFinite(worldY)).toBe(true);expect(worldX).toBeGreaterThan(0);expect(worldX).toBeCloseTo(worldY,12);
    const reference=new THREE.MeshStandardMaterial();api.configureStudioFloorShadow(reference,camera(8,8));
    expect(worldX).toBeCloseTo(spread(compile(reference)).x*8,12);expect(shadowCamera.toJSON()).toEqual(cameraBefore);
  });

  it('honors custom physical radii without changing the shader program and retains the documented omitted default',()=>{
    const shadowCamera=camera(20,10),small=new THREE.MeshStandardMaterial(),large=new THREE.MeshStandardMaterial(),omitted=new THREE.MeshStandardMaterial(),explicitDefault=new THREE.MeshStandardMaterial();
    expect(api.configureStudioFloorShadow(small,shadowCamera,.035)).toBe(true);expect(api.configureStudioFloorShadow(large,shadowCamera,.07)).toBe(true);
    const first=compile(small),second=compile(large),a=spread(first),b=spread(second);
    expect(a.x*20).toBeCloseTo(.035,12);expect(a.y*10).toBeCloseTo(.035,12);expect(b.x/a.x).toBeCloseTo(2,12);expect(b.y/a.y).toBeCloseTo(2,12);
    expect(first.fragmentShader).toBe(second.fragmentShader);expect(small.customProgramCacheKey()).toBe(large.customProgramCacheKey());
    api.configureStudioFloorShadow(omitted,shadowCamera);api.configureStudioFloorShadow(explicitDefault,shadowCamera,.14);
    expect(spread(compile(omitted)).toArray()).toEqual(spread(compile(explicitDefault)).toArray());
  });

  it.each([['null',null],['numeric string','0.04'],['NaN',NaN],['infinity',Infinity],['zero',0],['negative',-.02],['boolean',true]])('rejects an explicit %s radius without material mutation',(_label,radius)=>{
    const material=new THREE.MeshStandardMaterial(),before=materialState(material);
    expect(api.configureStudioFloorShadow(material,camera(),radius)).toBe(false);expect(materialState(material)).toEqual(before);
  });

  it.each([
    ['zero width',{left:1,right:1,top:2,bottom:-2}],['reversed width',{left:2,right:1,top:2,bottom:-2}],
    ['zero height',{left:-2,right:2,top:1,bottom:1}],['reversed height',{left:-2,right:2,top:-1,bottom:1}],
    ['NaN',{left:NaN,right:2,top:2,bottom:-2}],['infinite span',{left:-Infinity,right:2,top:2,bottom:-2}],
    ['missing camera',null]
  ])('rejects %s without changing the material',(_name,invalid)=>{
    const material=new THREE.MeshStandardMaterial(),before=materialState(material);
    expect(api.configureStudioFloorShadow(material,invalid)).toBe(false);expect(materialState(material)).toEqual(before);
  });

  it('rejects unsupported material types without assigning callbacks or metadata',()=>{
    const material=new THREE.MeshBasicMaterial(),before=materialState(material);
    expect(api.configureStudioFloorShadow(material,camera())).toBe(false);expect(materialState(material)).toEqual(before);
    expect(api.configureStudioFloorShadow(null,camera())).toBe(false);
  });

  it.each(['soft marker','VSM marker','standard include'])('fails closed for an incompatible %s without mutating the material or source library',which=>{
    const chunk=THREE.ShaderChunk.shadowmap_pars_fragment,fragment=THREE.ShaderLib.standard.fragmentShader;
    try{
      if(which==='standard include')THREE.ShaderLib.standard.fragmentShader=fragment.replace(INCLUDE,'');
      else THREE.ShaderChunk.shadowmap_pars_fragment=chunk.replace(which==='soft marker'?SOFT:VSM,'/* unavailable branch */');
      const material=new THREE.MeshStandardMaterial(),before=materialState(material),alteredChunk=THREE.ShaderChunk.shadowmap_pars_fragment,alteredFragment=THREE.ShaderLib.standard.fragmentShader;
      expect(api.configureStudioFloorShadow(material,camera())).toBe(false);expect(materialState(material)).toEqual(before);
      expect(THREE.ShaderChunk.shadowmap_pars_fragment).toBe(alteredChunk);expect(THREE.ShaderLib.standard.fragmentShader).toBe(alteredFragment);
    }finally{THREE.ShaderChunk.shadowmap_pars_fragment=chunk;THREE.ShaderLib.standard.fragmentShader=fragment;}
  });

  it('leaves a later unsupported shader and its uniforms untouched rather than injecting dangling shadow references',()=>{
    const material=new THREE.MeshStandardMaterial();expect(api.configureStudioFloorShadow(material,camera())).toBe(true);
    const fragment='void main() { gl_FragColor = vec4( 1.0 ); }',shader=compile(material,fragment);
    expect(shader.fragmentShader).toBe(fragment);expect(shader.uniforms).toEqual({existing:{value:17}});
  });

  it('reuses its material-owned uniform across compiles, isolates other floors, and shares a distinct valid program across camera sizes',()=>{
    const a=new THREE.MeshStandardMaterial(),b=new THREE.MeshStandardMaterial(),stock=new THREE.MeshStandardMaterial();
    api.configureStudioFloorShadow(a,camera(8,8));api.configureStudioFloorShadow(b,camera(80,40));
    const first=compile(a),second=compile(a),other=compile(b);
    expect(first.uniforms.gweStudioShadowSpread).toBe(second.uniforms.gweStudioShadowSpread);
    expect(spread(first)).not.toBe(spread(other));expect(spread(first).x/spread(other).x).toBeCloseTo(10,12);expect(spread(first).y/spread(other).y).toBeCloseTo(5,12);
    expect(first.fragmentShader).toBe(other.fragmentShader);expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());expect(a.customProgramCacheKey()).not.toBe(stock.customProgramCacheKey());
    const untouched=compile(stock);expect(untouched.fragmentShader).toBe(THREE.ShaderLib.standard.fragmentShader);expect(untouched.uniforms.gweStudioShadowSpread).toBeUndefined();
  });
});

function studioFixture(specs){
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},drawImage(){}}));
  const scene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(68,800/600,.1,200);scene.background=new THREE.Color(.12,.24,.36);scene.fog=new THREE.Fog(.4,.5,.6);viewCamera.position.set(4,6,10);
  const renderer={domElement:{clientWidth:800,clientHeight:600},shadowMap:{enabled:true,type:THREE.PCFSoftShadowMap},outputEncoding:THREE.sRGBEncoding,getRenderTarget(){return null;}};
  const engine={scene,renderer,camera:viewCamera,blocks:{},_undoStack:[{action:'place'}],_redoStack:[{action:'remove'}],_currentLesson:{sandbox:true,ground:{y:0}},velocity:new THREE.Vector3(),euler:new THREE.Euler(),_popBlocks:[]};
  specs.forEach(p=>{
    const shape=p.shape||'cube',rotation=p.rotation||0,mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshStandardMaterial({color:0x62846a,roughness:.77,metalness:.04}));
    mesh.position.set(p.x+.5,p.y+(shape==='cube'?.5:shape==='halfB'?.25:0),p.z+.5);mesh.rotation.y=rotation*Math.PI/2;
    mesh.userData={gridPos:{x:p.x,y:p.y,z:p.z},blockType:'stone',shape,rotation,_measurementLayer:'student'};
    if(p.pop){mesh.scale.setScalar(.19);mesh.userData._popT=.1;engine._popBlocks.push(mesh);}
    scene.add(mesh);mesh.updateMatrixWorld(true);engine.blocks[[p.x,p.y,p.z].join(',')]=mesh;
  });
  engine._builderSelection={blocks:specs.map(({x,y,z})=>({x,y,z}))};engine.measureStructure=(_x,_y,_z,retained)=>({blocks:retained||engine._builderSelection.blocks,count:specs.length,isComplete:true});window.__geoWorldEngine=engine;
  const ctx={toolData:{geometryWorld:{sandboxDockCollapsed:false}},updateMulti:vi.fn(),addToast:vi.fn()};
  return {engine,scene,renderer,camera:viewCamera,ctx,enter(){api.showcaseBuildForTest(ctx);engine.setShowcaseLook('studio');return engine._showcase.studio;}};
}
function modelState(engine){return {meshes:Object.values(engine.blocks).map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Array.from(mesh.geometry.attributes.position.array),position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),materialHook:mesh.material.onBeforeCompile,materialKey:mesh.material.customProgramCacheKey(),color:mesh.material.color.toArray()})),history:JSON.stringify([engine._undoStack,engine._redoStack]),stl:new Uint8Array(api.buildGeometryWorldStl(engine,engine._builderSelection.blocks).buffer)};}
const BUILDS=[
  ['tiny fractional',[{x:0,y:1,z:0,shape:'quarter',rotation:1}]],
  ['large retained bounds',[{x:-60,y:1,z:-48},{x:60,y:1,z:48,shape:'halfA',rotation:2},{x:4,y:86,z:0,shape:'halfB'}]],
  ['rotated placement pop',[{x:0,y:1,z:0,shape:'quarter',rotation:3,pop:true},{x:1,y:1,z:0,shape:'halfB',rotation:1},{x:0,y:3,z:0}]]
];

describe('Studio softlight in the real Showcase lifecycle',()=>{
  it('scales tiny creation softness from canonical bounds, keeps it stable during placement pop, and caps large-build softness',()=>{
    const samples=[];
    for(const specs of [BUILDS[0][1],BUILDS[0][1].map(p=>({...p,pop:true})),BUILDS[1][1]]){
      const f=studioFixture(specs),before=modelState(f.engine),box=api.creationGeometryBounds(f.engine,f.engine._builderSelection.blocks),creationRadius=Math.max(.8,box.getSize(new THREE.Vector3()).length()/2),studio=f.enter(),key=studio.lights.find(light=>light.castShadow),value=spread(compile(studio.floor.material));
      const physicalX=value.x*(key.shadow.camera.right-key.shadow.camera.left),physicalY=value.y*(key.shadow.camera.top-key.shadow.camera.bottom);
      expect(physicalX).toBeCloseTo(physicalY,12);expect(modelState(f.engine)).toEqual(before);
      samples.push({radius:creationRadius,spread:physicalX,bounds:[box.min.toArray(),box.max.toArray()]});
      f.engine.endShowcase();expect(modelState(f.engine)).toEqual(before);
    }
    const [tiny,popping,large]=samples;
    expect(tiny.spread).toBeGreaterThan(0);expect(tiny.spread).toBeLessThan(large.spread);
    expect(tiny.spread/tiny.radius).toBeCloseTo(.03,12);expect(popping.bounds).toEqual(tiny.bounds);expect(popping.spread).toBeCloseTo(tiny.spread,12);
    expect(large.spread).toBeCloseTo(.14,12);expect(large.spread).toBeLessThan(large.radius*.03);
  });

  it.each(BUILDS)('initializes the floor filter after the %s build shadow camera while preserving exact model data',(_label,specs)=>{
    const f=studioFixture(specs),before=modelState(f.engine),studio=f.enter(),key=studio.lights.find(light=>light.name==='gwe-studio-key'),shader=compile(studio.floor.material),value=spread(shader);
    expect(value.x*(key.shadow.camera.right-key.shadow.camera.left)).toBeCloseTo(value.y*(key.shadow.camera.top-key.shadow.camera.bottom),12);expect(value.x>0&&value.y>0).toBe(true);
    const meshes=[];studio.group.traverse(object=>{if(object.isMesh)meshes.push(object);});
    expect(meshes).toHaveLength(3);expect(studio.resources.filter(resource=>resource.isTexture)).toHaveLength(2);expect(studio.lights.filter(light=>light.castShadow)).toHaveLength(1);
    expect(studio.floor.geometry.index.count).toBe(6);expect(studio.floor.raycast(new THREE.Raycaster(),[])).toBeUndefined();expect(modelState(f.engine)).toEqual(before);
    for(const mesh of Object.values(f.engine.blocks))expect(compile(mesh.material).uniforms.gweStudioShadowSpread).toBeUndefined();
    f.engine.endShowcase();expect(modelState(f.engine)).toEqual(before);
  });

  it('keeps Saver shadow-free with its existing contact fallback and resumes the same floor filter without adding resources',()=>{
    const f=studioFixture(BUILDS[2][1]),before=modelState(f.engine),studio=f.enter(),material=studio.floor.material,compiled=compile(material),ownedSpread=spread(compiled),resources=studio.resources.slice(),children=studio.group.children.slice(),contact=studio.group.getObjectByName('gwe-studio-contact-shadow');
    studio.floor.onBeforeRender();const detailedOpacity=contact.material.opacity;
    f.renderer.shadowMap.enabled=false;studio.floor.onBeforeRender();expect(f.renderer.shadowMap.enabled).toBe(false);expect(contact.material.opacity).toBeGreaterThan(detailedOpacity);
    expect(studio.resources).toEqual(resources);expect(studio.group.children).toEqual(children);expect(studio.floor.material).toBe(material);expect(spread(compile(material))).toBe(ownedSpread);
    f.renderer.shadowMap.enabled=true;studio.floor.onBeforeRender();expect(contact.material.opacity).toBe(detailedOpacity);expect(f.renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);expect(modelState(f.engine)).toEqual(before);
    f.engine.endShowcase();
  });

  it('disposes each floor/material and existing shadow target once across repeated look changes and teardown without shared construction disposal',()=>{
    const f=studioFixture(BUILDS[0][1]),before=modelState(f.engine),blockDisposals=Object.values(f.engine.blocks).flatMap(mesh=>[vi.spyOn(mesh.geometry,'dispose'),vi.spyOn(mesh.material,'dispose')]),originalBackground=f.scene.background,originalFog=f.scene.fog;
    let studio=f.enter();
    for(let cycle=0;cycle<2;cycle++){
      const resources=studio.resources.map(resource=>vi.spyOn(resource,'dispose')),key=studio.lights.find(light=>light.castShadow),map=new THREE.WebGLRenderTarget(16,16),mapPass=new THREE.WebGLRenderTarget(16,16),mapDispose=vi.spyOn(map,'dispose'),passDispose=vi.spyOn(mapPass,'dispose');key.shadow.map=map;key.shadow.mapPass=mapPass;
      if(cycle===0)f.engine.setShowcaseLook('meadow');else{f.engine._destroyed=true;f.engine.disposeShowcaseLook();f.engine.disposeShowcaseLook();}
      resources.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));expect(mapDispose).toHaveBeenCalledTimes(1);expect(passDispose).toHaveBeenCalledTimes(1);expect(studio.group.parent).toBeNull();expect(f.scene.background).toBe(originalBackground);expect(f.scene.fog).toBe(originalFog);
      if(cycle===0){f.engine.setShowcaseLook('studio');const next=f.engine._showcase.studio;expect(next.floor.material).not.toBe(studio.floor.material);studio=next;}
    }
    blockDisposals.forEach(spy=>expect(spy).not.toHaveBeenCalled());expect(modelState(f.engine)).toEqual(before);f.engine.endShowcase();
  });
});
