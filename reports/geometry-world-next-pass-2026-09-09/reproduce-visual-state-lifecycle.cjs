const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const THREE=require(path.join(process.cwd(),'vendor/three-r128/three.min.js'));
const core=fs.readFileSync('stem_lab/stem_tool_geometryworld.js','utf8'),builder=fs.readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
function slice(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,start+' extraction');return source.slice(a,b);}
const landscape=slice(core,'(function initLandscape()','// Soft rim light');
const quality=slice(core,'engine.applyRenderQuality = function(preference)','engine.applyRenderQuality(d.renderQuality');
const profileSource=slice(core,'function resolveGeometryRenderProfile(preference, runtime)','window.StemLab.GeometryWorldRenderProfile');
const resolveProfile=new Function(profileSource+';return resolveGeometryRenderProfile;')();
const showcaseSource=slice(builder,'function showcaseBuild(ctx)','function showcaseExportSize');
const glowSource=slice(core,'engine._selectionGlows = [];','// Input handlers');
const clearSource=slice(core,'engine.clearWorld = function()','engine.createNPC = function');
const dustSource=slice(core,'if (!engine._dustMotes) engine._dustMotes = [];','// ── Animate clouds');
function clock(){let id=0;const timers=new Map();return{setTimeout(fn,ms){const key=++id;timers.set(key,{fn,ms});return key;},clearTimeout(key){timers.delete(key);},flush(ms){for(const [key,item]of [...timers].sort((a,b)=>a[1].ms-b[1].ms)){if(item.ms<=ms){timers.delete(key);item.fn();}}},timers};}
function canvas(){const ctx={createRadialGradient(){return{addColorStop(){}};},fillRect(){}};return{width:128,height:128,getContext(){return ctx;}};}
function fixture(){
  const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,4/3,0.1,200),blocks:{},npcs:[],_renderProfile:{tier:'detail'},_currentLesson:{ground:{xMin:-5,xMax:5,zMin:-4,zMax:4,y:0}},renderer:{shadowMap:{enabled:true},domElement:{clientWidth:800,clientHeight:600},setPixelRatio(){}},_horizon:{material:{color:new THREE.Color(0x496d46).convertSRGBToLinear()}},_ambientMotionEnabled:true};
  e.scene.background=new THREE.Color(0x8cc9fa);e.scene.fog=new THREE.Fog(0x8cc9fa,55,145);e.camera.position.set(6,4,8);
  const block=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());block.position.set(.5,.5,.5);e.blocks['0,0,0']=block;e.scene.add(block);
  const clockwork=clock(),ctx={toolData:{geometryWorld:{}}};
  const selected={engine:e,measurement:{blocks:[{x:0,y:0,z:0}]}};
  const win={THREE,devicePixelRatio:1,matchMedia(){return{matches:false};}};
  const doc={pointerLockElement:null,createElement(){return canvas();},getElementById(){return null;}};
  new Function('THREE','engine','geometryWorldSrgbColor',landscape)(THREE,e,(T,h)=>new T.Color(h).convertSRGBToLinear());
  new Function('engine','resolveGeometryRenderProfile','isMobile','window','navigator','container',quality)(e,resolveProfile,false,win,{hardwareConcurrency:8},{clientWidth:800,clientHeight:600});
  const startShowcase=new Function('selectionMeasurement','aimedStudentMeasurement','ENGINE_KEY','window','document','keyFor','patchGeometryState','focusWorldSurface','announce','setTimeout','studioGroundFootprints','studioContactMap',showcaseSource+';return showcaseBuild;')(()=>selected,()=>selected,'test',win,doc,p=>p.x+','+p.y+','+p.z,(_ctx,patch)=>Object.assign(ctx.toolData.geometryWorld,patch),()=>{},()=>{},clockwork.setTimeout,()=>[],()=>({canvas:canvas(),width:2,depth:2}));
  return{e,clockwork,ctx,win,startShowcase};
}
const findings={};
{
  const f=fixture(),e=f.e;e.refreshLandscape(e._currentLesson.ground);const old=e._landscape;let disposed=0;old.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
  f.startShowcase(f.ctx);e.setShowcaseLook('studio');assert.equal(old.visible,false);
  e.applyRenderQuality('saver');const replacement=e._landscape;
  findings.studioLandscapeRebuild={confirmed:replacement.visible===true,oldDetached:old.parent===null,oldGeometriesDisposed:disposed,replacementVisible:replacement.visible,replacementAttached:replacement.parent===e.scene,oldStoredInHidden:e._showcase.studio.hidden.some(x=>x[0]===old),replacementStoredInHidden:e._showcase.studio.hidden.some(x=>x[0]===replacement)};
  assert.equal(findings.studioLandscapeRebuild.confirmed,true);
  e.endShowcase();findings.studioLandscapeRebuild.disposedGroupNotReattached=old.parent===null;e.disposeLandscape();
}
{
  const f=fixture(),e=f.e;
  const glows=new Function('engine','window','setTimeout','setInterval','clearInterval',glowSource+';return {show:showSelectionGlow,clear:clearSelectionGlow};')(e,f.win,f.clockwork.setTimeout,()=>1,()=>{});
  glows.show([{x:0,y:0,z:0},{x:0,y:1,z:0}]);f.clockwork.flush(0);f.startShowcase(f.ctx);e.setShowcaseLook('studio');
  const priorCount=e._selectionGlows.length;f.clockwork.flush(400);
  findings.delayedGlowInStudio={confirmed:e._selectionGlows.some(o=>o.visible),beforeCount:priorCount,afterCount:e._selectionGlows.length,visibleCount:e._selectionGlows.filter(o=>o.visible).length};
  assert.equal(findings.delayedGlowInStudio.confirmed,true);e.endShowcase();glows.clear();
}
{
  const f=fixture(),e=f.e;
  const glows=new Function('engine','window','setTimeout','setInterval','clearInterval',glowSource+';return {show:showSelectionGlow,clear:clearSelectionGlow};')(e,f.win,f.clockwork.setTimeout,()=>1,()=>{});
  new Function('engine',clearSource)(e);e._disposeBlockMesh=m=>{m.geometry.dispose();m.material.dispose();};
  glows.show([{x:0,y:0,z:0},{x:0,y:1,z:0}]);f.clockwork.flush(0);e.clearWorld();
  const remains=e._selectionGlows.filter(o=>o.parent===e.scene).length;
  e._destroyed=true;glows.clear();f.clockwork.flush(400);
  findings.glowResetAndTeardown={confirmed:remains>0&&e._selectionGlows.some(o=>o.parent===e.scene),glowsRemainingAfterClearWorld:remains,newGlowsAfterDestroyed:e._selectionGlows.length};
  assert.equal(findings.glowResetAndTeardown.confirmed,true);glows.clear();
}
{
  const f=fixture(),e=f.e;f.startShowcase(f.ctx);e.setShowcaseLook('studio');
  const controlledMath=Object.create(Math);controlledMath.random=()=>.01;
  new Function('engine','THREE','Math','dt','t',dustSource)(e,THREE,controlledMath,.016,1);
  const dust=e._dustMotes[0];findings.dustInStudio={confirmed:!!dust&&dust.visible,created:e._dustMotes.length,visible:!!dust&&dust.visible,recordedInStudioHidden:e._showcase.studio.hidden.some(x=>x[0]===dust)};
  assert.equal(findings.dustInStudio.confirmed,true);e.endShowcase();e.scene.remove(dust);dust.geometry.dispose();dust.material.dispose();
}
{
  const automatic=resolveProfile('auto',{reducedMotion:true,hardwareConcurrency:8}),detail=resolveProfile('detail',{reducedMotion:true,hardwareConcurrency:8});
  const npcSnippet=slice(core,'var baseY = npc.data.position[1] + 0.75;','// Sync head + floating sprites');
  const update=new Function('engine','npc','i','t',npcSnippet),e={_ambientMotionEnabled:false,camera:new THREE.PerspectiveCamera()},npc={data:{position:[0,0,0]},body:new THREE.Object3D()};
  e.camera.position.set(0,1,1);update(e,npc,0,0);const y0=npc.body.position.y;update(e,npc,0,1);const y1=npc.body.position.y;
  findings.reducedMotion={manualDetailedEnablesAmbientMotion:detail.ambientMotion,autoUsesSaver:automatic.tier==='saver',autoDisablesAmbientMotion:automatic.ambientMotion===false,npcMovesWithAmbientMotionDisabled:Math.abs(y1-y0)>0.00001,npcY:[y0,y1],dynamicPreferenceListenerPresent:/matchMedia\([^)]*prefers-reduced-motion[^)]*\)[\s\S]{0,120}add(?:Event)?Listener/.test(core)};
  assert.equal(findings.reducedMotion.manualDetailedEnablesAmbientMotion,true);assert.equal(findings.reducedMotion.npcMovesWithAmbientMotionDisabled,true);
}
const result={scope:'Read-only lifecycle audit using actual source slices and vendored THREE r128; timers/canvas/renderer dependencies stubbed; no browser',sourceSHA256:crypto.createHash('sha256').update(core).digest('hex'),builderSHA256:crypto.createHash('sha256').update(builder).digest('hex'),reproductionPassed:true,findings};
fs.writeFileSync(path.join(__dirname,'visual-state-lifecycle-reproduction.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
