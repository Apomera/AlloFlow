import {describe,it,expect,vi,beforeAll,beforeEach,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';

let THREE,api,makeShape;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');new Function(source.replace('window.StemLab.geometryWorldBuilderPure = {','window.StemLab.geometryWorldBuilderPure = {showcaseBuildForTest:showcaseBuild,'))();api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();delete window.__geoWorldEngine;});
const DISPLAY_HEX=0xf1eee8;
function expected(linear=false){const color=new THREE.Color(DISPLAY_HEX);return linear?color.convertSRGBToLinear():color;}
function sameColor(actual,wanted){actual.toArray().forEach((value,i)=>expect(value).toBeCloseTo(wanted.toArray()[i],10));}
function fixture(){
  const scene=new THREE.Scene();scene.background=expected(true);scene.fog=new THREE.Fog(expected(true),55,145);
  const renderer={outputEncoding:THREE.sRGBEncoding,toneMapping:THREE.NoToneMapping,toneMappingExposure:1,target:null,getRenderTarget(){return this.target;}};
  return {scene,renderer,camera:new THREE.PerspectiveCamera()};
}
function renderHook(app,target){return app.scene.onBeforeRender.call(app.scene,app.renderer,app.scene,app.camera,target);}
function colorRefs(app){return {background:app.scene.background,fog:app.scene.fog,color:app.scene.fog.color};}
function assertRefs(app,refs){expect(app.scene.background).toBe(refs.background);expect(app.scene.fog).toBe(refs.fog);expect(app.scene.fog.color).toBe(refs.color);}

describe('r128 Studio background and fog color synchronization',()=>{
  it.each(['NoToneMapping','ACESFilmicToneMapping'])('matches raw background and post-encoding fog for direct and composer paths with %s',mapping=>{
    const app=fixture(),refs=colorRefs(app);app.renderer.toneMapping=THREE[mapping];const dispose=api.installStudioBackdropColorSync(app.scene,DISPLAY_HEX);
    for(const [target,wanted] of [[null,expected(false)],[{texture:{encoding:THREE.LinearEncoding}},expected(true)],[{texture:{encoding:THREE.sRGBEncoding}},expected(false)]]){
      renderHook(app,target);sameColor(app.scene.background,wanted);sameColor(app.scene.fog.color,wanted);assertRefs(app,refs);expect(app.renderer.toneMapping).toBe(THREE[mapping]);expect(app.renderer.outputEncoding).toBe(THREE.sRGBEncoding);expect(app.renderer.toneMappingExposure).toBe(1);
    }
    dispose();
  });
  it('uses an explicit render target argument, including null, rather than a stale renderer target',()=>{
    const app=fixture();api.installStudioBackdropColorSync(app.scene,DISPLAY_HEX);
    app.renderer.target={texture:{encoding:THREE.LinearEncoding}};renderHook(app,null);sameColor(app.scene.background,expected(false));sameColor(app.scene.fog.color,expected(false));
    app.renderer.target=null;renderHook(app,{texture:{encoding:THREE.LinearEncoding}});sameColor(app.scene.background,expected(true));sameColor(app.scene.fog.color,expected(true));
  });
  it('uses the active renderer target when a caller omits the fourth argument and treats untagged render textures as linear',()=>{
    const app=fixture();api.installStudioBackdropColorSync(app.scene,DISPLAY_HEX);app.renderer.target={texture:{}};
    app.scene.onBeforeRender.call(app.scene,app.renderer,app.scene,app.camera);sameColor(app.scene.background,expected(true));sameColor(app.scene.fog.color,expected(true));
    app.renderer.target=null;app.renderer.outputEncoding=THREE.LinearEncoding;app.scene.onBeforeRender.call(app.scene,app.renderer,app.scene,app.camera);sameColor(app.scene.background,expected(true));
  });
  it('follows each actual render target through Saver/detail changes without replacing color objects or consulting stale quality flags',()=>{
    const app=fixture(),refs=colorRefs(app);api.installStudioBackdropColorSync(app.scene,DISPLAY_HEX);
    for(const [postFx,target,isLinear] of [[false,null,false],[true,{texture:{encoding:THREE.LinearEncoding}},true],[false,{texture:{encoding:THREE.LinearEncoding}},true],[true,null,false],[false,null,false]]){
      app.renderer._postFxEnabled=postFx;renderHook(app,target);sameColor(app.scene.background,expected(isLinear));sameColor(app.scene.fog.color,expected(isLinear));assertRefs(app,refs);
    }
  });
  it('chains the previous callback first with its exact receiver, arguments and return value',()=>{
    const app=fixture(),receiver={custom:true},target={texture:{encoding:THREE.LinearEncoding}},extra={sentinel:1},result={returned:true},calls=[];
    app.scene.onBeforeRender=function(...args){calls.push({receiver:this,args});app.scene.background.setRGB(1,0,0);app.scene.fog.color.setRGB(0,0,1);return result;};
    api.installStudioBackdropColorSync(app.scene,DISPLAY_HEX);
    expect(app.scene.onBeforeRender.call(receiver,app.renderer,app.scene,app.camera,target,extra)).toBe(result);
    expect(calls).toEqual([{receiver,args:[app.renderer,app.scene,app.camera,target,extra]}]);sameColor(app.scene.background,expected(true));sameColor(app.scene.fog.color,expected(true));
  });
  it.each(['background','fog'])('does not recolor a replacement %s that belongs to another scene state',field=>{
    const app=fixture();api.installStudioBackdropColorSync(app.scene,DISPLAY_HEX);
    if(field==='background'){app.scene.background=new THREE.Color(0x123456);const replacement=app.scene.background.clone();renderHook(app,null);sameColor(app.scene.background,replacement);}
    else{app.scene.fog=new THREE.Fog(0x654321,2,9);const replacement=app.scene.fog.color.clone();renderHook(app,null);sameColor(app.scene.fog.color,replacement);expect([app.scene.fog.near,app.scene.fog.far]).toEqual([2,9]);}
  });
  it('restores only its own callback, deactivates retained wrappers and makes repeated disposal safe',()=>{
    const app=fixture(),previous=vi.fn(()=>73);app.scene.onBeforeRender=previous;const dispose=api.installStudioBackdropColorSync(app.scene,DISPLAY_HEX),owned=app.scene.onBeforeRender;
    const later=function(...args){return owned.apply(this,args);};app.scene.onBeforeRender=later;dispose();dispose();expect(app.scene.onBeforeRender).toBe(later);
    app.scene.background.setRGB(.1,.2,.3);app.scene.fog.color.setRGB(.4,.5,.6);expect(renderHook(app,null)).toBe(73);expect(previous).toHaveBeenCalledTimes(1);expect(app.scene.background.toArray()).toEqual([.1,.2,.3]);expect(app.scene.fog.color.toArray()).toEqual([.4,.5,.6]);
    const other=fixture();other.scene.onBeforeRender=previous;const restore=api.installStudioBackdropColorSync(other.scene,DISPLAY_HEX);restore();expect(other.scene.onBeforeRender).toBe(previous);
  });
});

function studioFixture(){
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},drawImage(){}}));
  const {scene,renderer,camera}=fixture();scene.background=new THREE.Color(.12,.24,.36);scene.fog=new THREE.Fog(new THREE.Color(.4,.5,.6),44,180);camera.position.set(4,6,10);camera.aspect=800/600;camera.updateProjectionMatrix();
  renderer.domElement={clientWidth:800,clientHeight:600};renderer.shadowMap={enabled:false};
  const engine={scene,renderer,camera,blocks:{},_undoStack:[{action:'place'}],_redoStack:[{action:'remove'}],_currentLesson:{sandbox:true,ground:{y:0}},velocity:new THREE.Vector3(),euler:new THREE.Euler(),_popBlocks:[]};
  const blocks=[{x:0,y:1,z:0,shape:'cube',rotation:0},{x:1,y:1,z:0,shape:'quarter',rotation:3},{x:0,y:2,z:0,shape:'halfB',rotation:1}];
  blocks.forEach(p=>{const material=new THREE.MeshStandardMaterial({color:0x62846a,roughness:.77,metalness:.04}),mesh=new THREE.Mesh(makeShape(p.shape),material);mesh.position.set(p.x+.5,p.y+(p.shape==='cube'?.5:p.shape==='halfB'?.25:0),p.z+.5);mesh.rotation.y=p.rotation*Math.PI/2;mesh.userData={gridPos:{x:p.x,y:p.y,z:p.z},blockType:'stone',shape:p.shape,rotation:p.rotation,_measurementLayer:'student'};mesh.updateMatrixWorld(true);engine.blocks[[p.x,p.y,p.z].join(',')]=mesh;scene.add(mesh);});
  engine._builderSelection={blocks:blocks.map(({x,y,z})=>({x,y,z}))};engine.measureStructure=(_x,_y,_z,retained)=>({blocks:retained || engine._builderSelection.blocks,count:blocks.length,isComplete:true});window.__geoWorldEngine=engine;
  const ctx={toolData:{geometryWorld:{sandboxDockCollapsed:false}},updateMulti:vi.fn(),addToast:vi.fn()};
  return {engine,scene,renderer,camera,blocks,ctx};
}
function blockState(engine){return Object.values(engine.blocks).map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Array.from(mesh.geometry.getAttribute('position').array),position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),color:mesh.material.color.toArray(),roughness:mesh.material.roughness,metalness:mesh.material.metalness,toneMapped:mesh.material.toneMapped,visible:mesh.visible}));}

describe('Studio color sync in real Showcase entry and cleanup',()=>{
  it('changes only Studio background/fog across render targets, preserving construction materials, geometry, transforms, history and STL',()=>{
    const app=studioFixture(),before=blockState(app.engine),history=JSON.stringify([app.engine._undoStack,app.engine._redoStack]),bytes=new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer);
    api.showcaseBuildForTest(app.ctx);app.engine.setShowcaseLook('studio');expect(app.engine._showcase.studio).toBeTruthy();
    renderHook(app,null);sameColor(app.scene.background,expected(false));sameColor(app.scene.fog.color,expected(false));renderHook(app,{texture:{encoding:THREE.LinearEncoding}});sameColor(app.scene.background,expected(true));sameColor(app.scene.fog.color,expected(true));
    expect(blockState(app.engine)).toEqual(before);expect(JSON.stringify([app.engine._undoStack,app.engine._redoStack])).toBe(history);expect(new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer)).toEqual(bytes);
  });
  it('restores the original hook/background/fog on Studio exit and again after opening a fresh Studio session',()=>{
    const app=studioFixture(),previous=vi.fn(),background=app.scene.background,fog=app.scene.fog,colors=[background.toArray(),fog.color.toArray()];app.scene.onBeforeRender=previous;
    api.showcaseBuildForTest(app.ctx);app.engine.setShowcaseLook('studio');const firstHook=app.scene.onBeforeRender;expect(firstHook).not.toBe(previous);renderHook(app,null);
    app.engine.setShowcaseLook('meadow');expect(app.scene.onBeforeRender).toBe(previous);expect(app.scene.background).toBe(background);expect(app.scene.fog).toBe(fog);expect([background.toArray(),fog.color.toArray()]).toEqual(colors);
    app.engine.setShowcaseLook('studio');expect(app.scene.onBeforeRender).not.toBe(firstHook);renderHook(app,{texture:{encoding:THREE.LinearEncoding}});app.engine.endShowcase();expect(app.scene.onBeforeRender).toBe(previous);expect(app.scene.background).toBe(background);expect(app.scene.fog).toBe(fog);expect([background.toArray(),fog.color.toArray()]).toEqual(colors);expect([fog.near,fog.far]).toEqual([44,180]);
  });
  it('disposes the Studio hook and its existing resources through the teardown method without overwriting a later callback',()=>{
    const app=studioFixture(),previous=vi.fn(),background=app.scene.background,fog=app.scene.fog;app.scene.onBeforeRender=previous;api.showcaseBuildForTest(app.ctx);app.engine.setShowcaseLook('studio');
    const studio=app.engine._showcase.studio,owned=app.scene.onBeforeRender,later=function(...args){return owned.apply(this,args);},spies=studio.resources.map(resource=>vi.spyOn(resource,'dispose'));app.scene.onBeforeRender=later;
    app.engine.disposeShowcaseLook();expect(app.scene.onBeforeRender).toBe(later);expect(app.scene.background).toBe(background);expect(app.scene.fog).toBe(fog);expect(studio.group.parent).toBeNull();spies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));const colors=[background.toArray(),fog.color.toArray()];renderHook(app,null);expect([background.toArray(),fog.color.toArray()]).toEqual(colors);expect(previous).toHaveBeenCalledTimes(1);
  });
});
