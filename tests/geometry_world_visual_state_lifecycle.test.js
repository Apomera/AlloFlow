import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8'),builder=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
function slice(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a)throw new Error('Source marker missing: '+start);return source.slice(a,b);}
const landscape=slice(core,'(function initLandscape()','// Soft rim light');
const quality=slice(core,'engine.applyRenderQuality = function(preference)','engine.applyRenderQuality(d.renderQuality');
const profile=new Function(slice(core,'function resolveGeometryRenderProfile(preference, runtime)','window.StemLab.GeometryWorldRenderProfile')+';return resolveGeometryRenderProfile;')();
const showcase=slice(builder,'function showcaseBuild(ctx)','function showcaseExportSize');
const glow=slice(core,'engine._selectionGlows = [];','// Input handlers');
const hide=slice(core,'function hideDimensionDuringShowcase(object)','function makeDimLabel');
const clear=slice(core,'engine.clearWorld = function()','engine.createNPC = function');
const dust=slice(core,'if (!engine._dustMotes) engine._dustMotes = [];','// ── Animate clouds');
const photo=slice(core,'// Force fresh render since WebGLRenderer',"var dataUrl = eng.renderer.domElement.toDataURL('image/png');");
function canvas(){return{width:128,height:128,getContext(){return{createRadialGradient(){return{addColorStop(){}};},fillRect(){}};}};}
const engines=[];
function fixture(){
  const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,4/3,.1,200),blocks:{},npcs:[],_undoStack:[],_renderProfile:{tier:'detail'},_currentLesson:{ground:{xMin:-5,xMax:5,zMin:-4,zMax:4,y:0}},renderer:{shadowMap:{enabled:true},domElement:{clientWidth:800,clientHeight:600},setPixelRatio(){}},_horizon:{material:{color:new THREE.Color(0x496d46).convertSRGBToLinear()}},_ambientMotionEnabled:true};
  engines.push(e);e.scene.background=new THREE.Color(0x8cc9fa);e.scene.fog=new THREE.Fog(0x8cc9fa,55,145);e.camera.position.set(6,4,8);
  const block=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());block.position.set(.5,.5,.5);e.blocks['0,0,0']=block;e.scene.add(block);
  e._disposeBlockMesh=m=>m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!o.material.userData.gwSharedBlockEdge)o.material.dispose();});
  const ctx={toolData:{geometryWorld:{}}},selected={engine:e,measurement:{blocks:[{x:0,y:0,z:0}]}},win={THREE,devicePixelRatio:1,matchMedia(){return{matches:false};}};
  const doc={pointerLockElement:null,createElement(){return canvas();},getElementById(){return null;}};
  new Function('THREE','engine','geometryWorldSrgbColor',landscape)(THREE,e,(T,h)=>new T.Color(h).convertSRGBToLinear());
  new Function('engine','resolveGeometryRenderProfile','isMobile','window','navigator','container',quality)(e,profile,false,win,{hardwareConcurrency:8},{clientWidth:800,clientHeight:600});
  const start=new Function('selectionMeasurement','aimedStudentMeasurement','ENGINE_KEY','window','document','keyFor','patchGeometryState','focusWorldSurface','announce','setTimeout','studioGroundFootprints','studioContactMap',showcase+';return showcaseBuild;')(()=>selected,()=>selected,'test',win,doc,p=>p.x+','+p.y+','+p.z,(_ctx,patch)=>Object.assign(ctx.toolData.geometryWorld,patch),()=>{},()=>{},setTimeout,()=>[],()=>({canvas:canvas(),width:2,depth:2}));
  const annotations=new Function('engine','window','setTimeout','clearTimeout','setInterval','clearInterval',glow+hide+';return {show:showSelectionGlow,clear:clearSelectionGlow};')(e,win,setTimeout,clearTimeout,setInterval,clearInterval);
  new Function('engine',clear)(e);
  return{e,ctx,start(){start(ctx);},annotations};
}
afterEach(()=>{for(const e of engines.splice(0)){if(e.endShowcase)e.endShowcase();if(e.clearSelectionAnnotations)e.clearSelectionAnnotations();if(e.disposeLandscape)e.disposeLandscape();e.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.dispose)o.material.dispose();});}vi.clearAllTimers();vi.useRealTimers();});

describe('Geometry World visual-state lifecycle with actual THREE geometry',()=>{
  it.each([true,false])('keeps rebuilt scenery hidden in Studio and restores prior visibility %s',visible=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;e.refreshLandscape(e._currentLesson.ground);const old=e._landscape;old.visible=visible;let disposed=0;old.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
    f.start();e.setShowcaseLook('studio');e.applyRenderQuality('saver');const replacement=e._landscape;
    expect(replacement).not.toBe(old);expect(replacement.visible).toBe(false);expect(disposed).toBe(6);expect(old.parent).toBe(null);
    expect(e._showcase.studio.hidden.some(x=>x[0]===old)).toBe(false);expect(e._showcase.studio.hidden.find(x=>x[0]===replacement)?.[1]).toBe(visible);
    e.applyRenderQuality('saver');expect(e._landscape).toBe(replacement);
    e.applyRenderQuality('detail');expect(e._landscape.visible).toBe(false);expect(e._showcase.studio.hidden.some(x=>x[0]===replacement)).toBe(false);
    e.setShowcaseLook('meadow');expect(e._landscape.visible).toBe(visible);expect(old.parent).toBe(null);
  });
  it('hides late selection layers in Studio and restores them on exit',()=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;f.annotations.show([{x:0,y:0,z:0},{x:0,y:1,z:0}]);vi.advanceTimersByTime(0);f.start();e.setShowcaseLook('studio');vi.advanceTimersByTime(400);
    expect(e._selectionGlows).toHaveLength(2);expect(e._selectionGlows.every(o=>!o.visible)).toBe(true);
    expect(e._selectionGlows.every(o=>e._showcase.hidden.some(x=>x[0]===o))).toBe(true);
    e.endShowcase();expect(e._selectionGlows.every(o=>o.visible)).toBe(true);
  });
  it('cancels delayed layers from the previous measurement',()=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;f.annotations.show([{x:0,y:0,z:0},{x:0,y:1,z:0},{x:0,y:2,z:0}]);vi.advanceTimersByTime(0);let disposed=0;e._selectionGlows[0].geometry.addEventListener('dispose',()=>disposed++);
    f.annotations.show([{x:20,y:0,z:0}]);vi.advanceTimersByTime(1000);expect(e._selectionGlows).toHaveLength(1);expect(e._selectionGlows[0].position.x).toBe(20.5);expect(disposed).toBe(1);
  });
  it('prevents an old 25-second fade from clearing a newer measurement',()=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;f.annotations.show([{x:0,y:0,z:0}]);vi.advanceTimersByTime(24000);f.annotations.show([{x:20,y:0,z:0}]);vi.advanceTimersByTime(1500);
    expect(e._selectionGlows).toHaveLength(1);expect(e._selectionGlows[0].position.x).toBe(20.5);expect(e._selectionGlows[0].material.opacity).toBe(.06);
    vi.advanceTimersByTime(25000);expect(e._selectionGlows).toHaveLength(0);expect(e._selectionGlowFadeInterval).toBe(null);
  });
  it('clears visible and pending glow geometry on world reset',()=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;f.annotations.show([{x:0,y:0,z:0},{x:0,y:1,z:0}]);vi.advanceTimersByTime(0);const old=e._selectionGlows[0];let disposed=0;old.geometry.addEventListener('dispose',()=>disposed++);e.clearWorld();
    expect(e._selectionGlows).toHaveLength(0);expect(old.parent).toBe(null);expect(disposed).toBe(1);vi.advanceTimersByTime(30000);expect(e._selectionGlows).toHaveLength(0);expect(e._selectionGlowTimers).toHaveLength(0);
  });
  it('does not allocate a pending layer after engine teardown',()=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;f.annotations.show([{x:0,y:0,z:0}]);e._destroyed=true;vi.advanceTimersByTime(30000);expect(e._selectionGlows).toHaveLength(0);
  });
  it('removes disposed glows from both Showcase restoration lists',()=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;f.annotations.show([{x:0,y:0,z:0}]);vi.advanceTimersByTime(0);const old=e._selectionGlows[0];f.start();e.setShowcaseLook('studio');f.annotations.clear();
    expect(e._showcase.hidden.some(x=>x[0]===old)).toBe(false);expect(e._showcase.studio.hidden.some(x=>x[0]===old)).toBe(false);e.endShowcase();expect(old.parent).toBe(null);
  });
  it.each(['studio','meadow'])('does not spawn ambient motes in Showcase %s',look=>{
    vi.useFakeTimers();const f=fixture(),e=f.e;f.start();e.setShowcaseLook(look);const math=Object.create(Math);math.random=()=>.01;new Function('engine','THREE','Math','dt','t',dust)(e,THREE,math,.016,1);expect(e._dustMotes).toHaveLength(0);
    e.endShowcase();new Function('engine','THREE','Math','dt','t',dust)(e,THREE,math,.016,1);expect(e._dustMotes).toHaveLength(1);const mote=e._dustMotes[0];e.scene.remove(mote);mote.geometry.dispose();mote.material.dispose();
  });
});

describe('Geometry World quality-sensitive capture and edges',()=>{
  it.each([false,true,undefined])('Photo honors postprocessing enabled=%s',enabled=>{
    const e={_postFxEnabled:enabled,composer:{render:vi.fn()},renderer:{render:vi.fn()},scene:{},camera:{}};new Function('eng',photo)(e);
    expect(e.composer.render).toHaveBeenCalledTimes(enabled===false?0:1);expect(e.renderer.render).toHaveBeenCalledTimes(enabled===false?1:0);
  });
  it('Photo falls back to direct rendering if enabled postprocessing fails',()=>{
    const e={_postFxEnabled:true,composer:{render(){throw new Error('fixture');}},renderer:{render:vi.fn()},scene:{},camera:{}};new Function('eng',photo)(e);expect(e.renderer.render).toHaveBeenCalledWith(e.scene,e.camera);
  });
  it('changes only authored-ground edge visibility through detail and saver',()=>{
    vi.useFakeTimers();const f=fixture(),e=f.e,cache={};const edgeCode=slice(core,'function addBlockEdges(mesh, shapeId, isGround)','// Block geometry belongs');
    const add=new Function('THREE','engine','_edgeMatCache',edgeCode+';return addBlockEdges;')(THREE,e,cache);
    const ground=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());ground.userData._measurementLayer='ground';ground.visible=false;e.blocks.ground=ground;e.scene.add(ground);add(ground,'cube',true);
    const build=e.blocks['0,0,0'];build.userData._measurementLayer='student';add(build,'cube',false);const extra=new THREE.LineSegments(new THREE.EdgesGeometry(ground.geometry),new THREE.LineBasicMaterial());ground.add(extra);
    const geometry=ground.geometry,history=e._undoStack;e.applyRenderQuality('saver');expect(ground.children[0].visible).toBe(false);expect(build.children[0].visible).toBe(true);expect(extra.visible).toBe(true);expect(ground.visible).toBe(false);expect(ground.geometry).toBe(geometry);expect(e._undoStack).toBe(history);
    const fresh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());add(fresh,'cube',true);expect(fresh.children[0].visible).toBe(false);fresh.geometry.dispose();fresh.children[0].geometry.dispose();fresh.material.dispose();
    e.applyRenderQuality('detail');expect(ground.children[0].visible).toBe(true);expect(build.children[0].visible).toBe(true);expect(ground.visible).toBe(false);Object.values(cache).forEach(m=>m.dispose());
  });
});
