import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8').replace(/\r\n/g,'\n');
function section(startMarker,endMarker){const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);if(start<0||end<start)throw Error('Missing source section '+startMarker);return source.slice(start,end);}
function engineFunction(name){const start=source.indexOf('        engine.'+name+' = function('),endMark='\n        };';if(start<0)throw Error('Missing engine function '+name);return source.slice(start,source.indexOf(endMark,start)+endMark.length);}
function catalog(name){const start=source.indexOf('  var '+name+' ='),end=source.indexOf('\n  ];',start)+5;return new Function(source.slice(start,end)+'\nreturn '+name+';')();}
const BLOCK_TYPES=catalog('BLOCK_TYPES'),BLOCK_SHAPES=catalog('BLOCK_SHAPES');
let THREE,makeShape,builder;
const cleanups=[];
const originalPointerLock=Object.getOwnPropertyDescriptor(document,'pointerLockElement');
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;window.THREE=THREE;
  makeShape=new Function(section('  function createShapeGeometry(','  // Format fractional volume for display')+'\nreturn createShapeGeometry;')();
  const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();builder=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{cleanups.splice(0).forEach(fn=>fn());vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();delete window.__geoWorldEngine;delete window._alloHaptic;if(originalPointerLock)Object.defineProperty(document,'pointerLockElement',originalPointerLock);else delete document.pointerLockElement;document.body.innerHTML='';});

function fixture(){
  vi.useFakeTimers();window.THREE=THREE;Object.defineProperty(document,'pointerLockElement',{configurable:true,value:null});
  const wrap=document.createElement('div');wrap.id='geoworld-fs-wrap';wrap.tabIndex=0;const canvas=document.createElement('canvas');wrap.appendChild(canvas);document.body.appendChild(wrap);wrap.focus();
  const ref={current:{timer:null,feedback:'',shapeFeedback:''}},updates=[],events=[],effects={placeSound:vi.fn(),breakSound:vi.fn(),placeParticles:vi.fn(),breakParticles:vi.fn(),xp:vi.fn(),toast:vi.fn(),sr:vi.fn(),npc:vi.fn(),frustration:vi.fn(),collab:vi.fn(),haptic:vi.fn()};
  window._alloHaptic=effects.haptic;let hits=[];
  const engine=window.__geoWorldEngine={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),renderer:{domElement:canvas},blocks:{},npcs:[],_undoStack:[],_redoStack:[],_blocksDirty:true,_blocksArr:[],_particles:[],_popBlocks:[],blocksPlaced:9,_blockMilestones:{},_ambientMotionEnabled:false,_worldActive:true,
    _currentLesson:{sandbox:true,ground:{y:0}},_placeState:{selectedBlock:0,selectedShape:0,blockRotation:0,collabMode:true},_tutorialState:{step:4,dismissed:true},_builderSelection:{blocks:[]},_modalState:{},moveState:{},lookState:{},velocity:new THREE.Vector3(),isLocked:false,
    clock:{getElapsedTime:()=>12},configureBlockFinish(){},refreshAONeighbourhood(){},logEvent:(type,data)=>events.push({type,data}),raycaster:{setFromCamera:vi.fn(),intersectObjects:vi.fn(()=>hits)}};
  const apply=(key,value)=>{const patch=typeof key==='object'?key:{[key]:value};updates.push(patch);if('actionFeedback'in patch)ref.current.feedback=patch.actionFeedback;};
  const ctx={update:(_bucket,key,value)=>apply(key,value),updateMulti:(_bucket,patch)=>apply(patch)};
  const upd=new Function('ctx','shapeActionRef',section('      var upd = function (key, val) {','      var callGemini')+'\nreturn upd;')(ctx,ref);
  const componentDeps={window,engineKey:'__geoWorldEngine',selectedShape:0,blockRotation:0,BLOCK_TYPES,BLOCK_SHAPES,shapeActionRef:ref,upd,announceToSR:effects.sr};
  const component=new Function(...Object.keys(componentDeps),section('      function setBuildShape(','      var homeLang')+'\nreturn {setBuildShape,publishMatchedBlock};')(...Object.values(componentDeps));
  let componentCleanup;
  new Function('React','shapeActionRef','upd','actionFeedback',section('      shapeActionRef.current.feedback = actionFeedback;','      // Every input uses'))({useEffect(fn){componentCleanup=fn();}},ref,upd,'');
  const doc={},cv={};
  const helperNames=['_disposeBlockMesh','placementCellForHit','getPlacementEligibility','placementForHit','publishPlacementPreview','getBlocksArr','isInputActive'];
  const body=helperNames.map(engineFunction).join('\n')+'\n'+section('        var MAX_UNDO = 200;','        // ── Ambient occlusion')+'\n'+engineFunction('placeBlock')+'\n'+engineFunction('removeBlock')+'\n'+section('        var origPlace = engine.placeBlock;','        // Export session data as CSV')+'\n'+section('        function canMatchAimedBlock()','        // One measurement path')+'\n'+engineFunction('interactAtCrosshair')+'\n'+section('        function updateGhostPreview() {','        // ── Collision helper')+'\n'+section("        document.addEventListener('keydown', _docH.keydown","        document.addEventListener('keyup'")+'\n'+section("        canvas.addEventListener('mousedown', _cvH.mousedown","        canvas.addEventListener('contextmenu'");
  const deps={engine,THREE,MAX_BLOCKS:1500,createShapeGeometry:makeShape,BLOCK_TYPES,BLOCK_SHAPES,getBlockMaterial:()=>new THREE.MeshStandardMaterial({color:0x998877}),makeTorchGlowTexture:()=>new THREE.Texture(),addBlockEdges(){},geometryWorldGroundTint:()=>1,upd,addToast:effects.toast,announceToSR:effects.sr,sfxPlace:effects.placeSound,spawnPlaceParticles:effects.placeParticles,awardXP:effects.xp,sfxBreak:effects.breakSound,spawnBreakParticles:effects.breakParticles,checkBreakFrustration:effects.frustration,sfxNpcChime:effects.npc,syncBlocksToFirestore:effects.collab,answeredNpcs:{},disposeGhost:mesh=>mesh.traverse(p=>{p.geometry?.dispose();p.material?.dispose();}),publishMatchedBlock:component.publishMatchedBlock,setBuildShape:component.setBuildShape,canvas,_docH:doc,_cvH:cv,keyLookAllowed:()=>engine.isInputActive()};
  new Function(...Object.keys(deps),body)(...Object.values(deps));
  cleanups.push(()=>{componentCleanup?.();Object.keys(doc).forEach(name=>document.removeEventListener(name,doc[name]));Object.keys(cv).forEach(name=>canvas.removeEventListener(name,cv[name]));});
  return {engine,canvas,wrap,ref,updates,events,effects,publish:upd,shape:component.setBuildShape,cleanup:()=>componentCleanup(),setHits(value){hits=value;},key(code='KeyI',options={},target=wrap){const event=new KeyboardEvent('keydown',{key:code==='KeyI'?'i':code==='KeyB'?'b':code,code,bubbles:true,cancelable:true,...options});target.dispatchEvent(event);return event;}};
}
function seed(f,{x=0,y=1,z=0,type='stone',shape='cube',rotation=0,lesson=false,layer=lesson?'lesson':'student'}={}){
  const mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshStandardMaterial({color:0x719580}));mesh.position.set(x+.5,y+(shape==='cube'?.5:shape==='halfB'?.25:0),z+.5);if(shape!=='cube')mesh.rotation.y=rotation*Math.PI/2;
  mesh.userData={gridPos:{x,y,z},blockType:type,shape,rotation,_lessonBlock:lesson,_measurementLayer:layer};mesh.updateMatrixWorld(true);f.engine.scene.add(mesh);f.engine.blocks[[x,y,z].join(',')]=mesh;f.engine._blocksDirty=true;return mesh;
}
function hit(mesh,normal=[0,1,0]){return {object:mesh,face:{normal:new THREE.Vector3(...normal)},distance:2};}
function stableState(f){return {blocks:Object.entries(f.engine.blocks).map(([key,mesh])=>({key,mesh,geometry:mesh.geometry,material:mesh.material,position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),vertices:Array.from(mesh.geometry.attributes.position.array),type:mesh.userData.blockType,shape:mesh.userData.shape,rotation:mesh.userData.rotation})),undo:structuredClone(f.engine._undoStack),redo:structuredClone(f.engine._redoStack),camera:[f.engine.camera.position.toArray(),f.engine.camera.quaternion.toArray()],velocity:f.engine.velocity.toArray(),selection:structuredClone(f.engine._builderSelection),placed:f.engine.blocksPlaced,milestones:{...f.engine._blockMilestones},events:structuredClone(f.events),particles:f.engine._particles.length,pop:f.engine._popBlocks.length,shake:[f.engine._shakeUntil,f.engine._shakeIntensity]};}
function choices(f){return {...f.engine._placeState};}

describe('Match aimed block recipes and state ownership',()=>{
  it.each(BLOCK_TYPES.map((type,index)=>[type.id,index]))('matches every shape and rotation in %s without editing the creation', (type,selectedBlock)=>{
    const f=fixture();
    for(let selectedShape=0;selectedShape<BLOCK_SHAPES.length;selectedShape++)for(let rotation=0;rotation<4;rotation++){
      const mesh=seed(f,{x:selectedShape*4+rotation,type,shape:BLOCK_SHAPES[selectedShape].id,rotation}),before=stableState(f);f.setHits([hit(mesh)]);f.updates.length=0;
      expect(f.engine.matchAimedBlock()).toBe(true);expect(choices(f)).toEqual({selectedBlock,selectedShape,blockRotation:rotation,collabMode:true});
      expect(f.updates).toHaveLength(1);expect(f.updates[0]).toMatchObject({selectedBlock,selectedShape,blockRotation:rotation,actionFeedback:expect.any(String)});expect(f.ref.current.feedback).toContain(BLOCK_TYPES[selectedBlock].name);
      expect(stableState(f)).toEqual(before);
    }
    expect(f.effects.placeParticles).not.toHaveBeenCalled();expect(f.effects.breakParticles).not.toHaveBeenCalled();expect(f.effects.xp).not.toHaveBeenCalled();expect(f.effects.npc).not.toHaveBeenCalled();
  });
  it('uses matched live state for preview and an immediate B placement before React rerenders',()=>{
    const f=fixture(),target=seed(f,{type:'wood',shape:'quarter',rotation:3});f.engine._builderSelection={blocks:[target.userData.gridPos]};f.setHits([hit(target)]);
    const bytes=new Uint8Array(builder.buildGeometryWorldStl(f.engine,f.engine._builderSelection.blocks).buffer),before=stableState(f);
    expect(f.key().defaultPrevented).toBe(true);expect(stableState(f)).toEqual(before);expect(new Uint8Array(builder.buildGeometryWorldStl(f.engine,f.engine._builderSelection.blocks).buffer)).toEqual(bytes);
    f.engine.updateGhostPreview();expect(f.engine._ghostMesh).toBeTruthy();expect(f.engine._placeState).toMatchObject({selectedBlock:2,selectedShape:3,blockRotation:3});
    f.key('KeyB');const placed=f.engine.blocks['0,2,0'];expect(placed).toBeInstanceOf(THREE.Mesh);expect(placed.userData).toMatchObject({blockType:'wood',shape:'quarter',rotation:3});expect(placed.rotation.y).toBe(3*Math.PI/2);expect(f.engine._undoStack).toHaveLength(1);expect(f.engine.blocksPlaced).toBe(before.placed+1);
  });
  it.each([['ground',true,'ground'],['lesson',true,'lesson']])('can sample protected %s appearance without weakening its protection',(_label,lesson,layer)=>{
    const f=fixture(),mesh=seed(f,{type:'grass',shape:'halfB',rotation:2,lesson,layer}),before=stableState(f);f.setHits([hit(mesh)]);expect(f.engine.matchAimedBlock()).toBe(true);expect(choices(f)).toMatchObject({selectedBlock:1,selectedShape:2,blockRotation:2});expect(stableState(f)).toEqual(before);expect(mesh.userData._lessonBlock).toBe(true);
  });
  it.each(['missing','NPC','decoration','stale','invisible','missing-grid','fractional-grid','missing-type','unknown-type','missing-shape','unknown-shape','missing-rotation','fractional-rotation','negative-rotation','large-rotation'])('rejects a %s target with useful feedback and unchanged choices',kind=>{
    const f=fixture(),mesh=seed(f,{type:'gold',shape:'quarter',rotation:2});let target=mesh;
    if(kind==='NPC'){target=new THREE.Mesh(makeShape('cube'));target.userData={isNPC:true,npcIndex:0};f.engine.npcs=[{body:target}];}
    if(kind==='decoration'){target=new THREE.Mesh(makeShape('cube'));target.userData={gwDecorative:true};}
    if(kind==='stale'){target=mesh.clone();target.userData={...mesh.userData};}
    if(kind==='invisible')mesh.visible=false;
    if(kind==='missing-grid')delete mesh.userData.gridPos;if(kind==='fractional-grid')mesh.userData.gridPos.x=.5;
    if(kind==='missing-type')delete mesh.userData.blockType;if(kind==='unknown-type')mesh.userData.blockType='unknown';
    if(kind==='missing-shape')delete mesh.userData.shape;if(kind==='unknown-shape')mesh.userData.shape='unknown';
    if(kind==='missing-rotation')delete mesh.userData.rotation;if(kind==='fractional-rotation')mesh.userData.rotation=.5;if(kind==='negative-rotation')mesh.userData.rotation=-1;if(kind==='large-rotation')mesh.userData.rotation=4;
    f.setHits(kind==='missing'?[]:[hit(target)]);const before=stableState(f),recipe=choices(f);
    expect(f.engine.matchAimedBlock()).toBe(false);expect(choices(f)).toEqual(recipe);expect(stableState(f)).toEqual(before);expect(f.ref.current.feedback.length).toBeGreaterThan(0);expect(f.effects.npc).not.toHaveBeenCalled();expect(f.updates.some(p=>p.showNpcDialog)).toBe(false);
  });
});

describe('Match input guards and feedback lifetime',()=>{
  it.each(['_destroyed','_runtimeFailed','_showcase','_worldActive'])('does not run in %s state',flag=>{
    const f=fixture(),mesh=seed(f);f.setHits([hit(mesh)]);f.engine[flag]=flag==='_worldActive'?false:true;const before=stableState(f),recipe=choices(f);
    expect(f.engine.matchAimedBlock()).toBe(false);expect(choices(f)).toEqual(recipe);expect(stableState(f)).toEqual(before);expect(f.updates).toHaveLength(0);
  });
  it.each(['showNpcDialog','showGameSettings','showGrowthNudge','showMyLessons','showLessonEditor','showLessonIntro','showReflection','showHelp','showTeacherView','showPeerWorlds','showCreatorPanel'])('does not bypass the %s modal',name=>{
    const f=fixture(),mesh=seed(f);f.setHits([hit(mesh)]);f.engine._modalState[name]=true;const recipe=choices(f);expect(f.engine.matchAimedBlock()).toBe(false);expect(choices(f)).toEqual(recipe);expect(f.updates).toHaveLength(0);
  });
  it('allows a direct toolbar Match with the inventory open and the button focused',()=>{
    const f=fixture(),mesh=seed(f,{type:'diamond',shape:'halfA',rotation:1});f.setHits([hit(mesh)]);f.engine._modalState={hudPanel:'inventory',objectivesOpen:true};const button=document.createElement('button');document.body.appendChild(button);button.focus();expect(f.engine.isInputActive()).toBe(false);expect(f.engine.matchAimedBlock()).toBe(true);
  });
  it.each([{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true}])('leaves reserved/repeated I untouched: %j',options=>{
    const f=fixture(),mesh=seed(f);f.setHits([hit(mesh)]);const method=vi.spyOn(f.engine,'matchAimedBlock'),ev=f.key('KeyI',options);expect(method).not.toHaveBeenCalled();expect(ev.defaultPrevented).toBe(false);
  });
  it.each(['input','textarea','select','contenteditable'])('does not steal I from %s',kind=>{
    const f=fixture(),mesh=seed(f);f.setHits([hit(mesh)]);f.engine.isLocked=true;const target=document.createElement(kind==='contenteditable'?'div':kind);if(kind==='contenteditable')target.setAttribute('contenteditable','true');target.tabIndex=0;document.body.appendChild(target);target.focus();const method=vi.spyOn(f.engine,'matchAimedBlock');expect(f.key('KeyI',{},target).defaultPrevented).toBe(false);expect(method).not.toHaveBeenCalled();
  });
  it('requires world focus for I but supports the focused keyboard-only world',()=>{
    const f=fixture(),mesh=seed(f,{type:'wood'});f.setHits([hit(mesh)]);f.wrap.blur();const method=vi.spyOn(f.engine,'matchAimedBlock');f.key('KeyI',{},document.body);expect(method).not.toHaveBeenCalled();f.wrap.focus();f.key();expect(method).toHaveBeenCalledTimes(1);
  });
  it('routes middle click through Match under pointer lock and never opens NPC dialogue',()=>{
    const f=fixture(),mesh=seed(f,{type:'ice'});f.setHits([hit(mesh)]);const method=vi.spyOn(f.engine,'matchAimedBlock');f.canvas.dispatchEvent(new MouseEvent('mousedown',{button:1,bubbles:true,cancelable:true}));expect(method).not.toHaveBeenCalled();f.engine.isLocked=true;Object.defineProperty(document,'pointerLockElement',{configurable:true,value:f.canvas});f.canvas.dispatchEvent(new MouseEvent('mousedown',{button:1,bubbles:true,cancelable:true}));expect(method).toHaveBeenCalledTimes(1);
    const npc=new THREE.Mesh(makeShape('cube'));npc.userData={isNPC:true,npcIndex:0};f.setHits([hit(npc)]);f.canvas.dispatchEvent(new MouseEvent('mousedown',{button:1,bubbles:true,cancelable:true}));expect(method).toHaveBeenCalledTimes(2);expect(f.effects.npc).not.toHaveBeenCalled();expect(f.updates.some(p=>p.showNpcDialog)).toBe(false);
  });
  it('gives a newer Match the full cue lifetime and does not let an older ruler timer clear it',()=>{
    const f=fixture(),a=seed(f,{type:'wood'}),b=seed(f,{x:1,type:'gold',shape:'quarter',rotation:2});f.publish('actionFeedback','Ruler started');setTimeout(()=>f.publish('actionFeedback',''),2000);vi.advanceTimersByTime(1700);f.setHits([hit(a)]);f.engine.matchAimedBlock();vi.advanceTimersByTime(1000);f.setHits([hit(b)]);f.engine.matchAimedBlock();const latest=f.ref.current.feedback;vi.advanceTimersByTime(800);expect(f.ref.current.feedback).toBe(latest);vi.advanceTimersByTime(1000);expect(f.ref.current.feedback).toBe('');expect(f.ref.current.timer).toBeNull();
  });
  it('preserves newer measurement feedback and cancels owned cue timers on unmount',()=>{
    const f=fixture(),mesh=seed(f);f.setHits([hit(mesh)]);f.engine.matchAimedBlock();f.publish('actionFeedback','Measured: 12 cubic units');vi.advanceTimersByTime(1800);expect(f.ref.current.feedback).toBe('Measured: 12 cubic units');f.engine.matchAimedBlock();f.cleanup();const count=f.updates.length;expect(f.ref.current.timer).toBeNull();expect(f.ref.current.feedback).toBe('');vi.advanceTimersByTime(3000);expect(f.updates).toHaveLength(count);
  });
});

describe('Break feedback follows actual block removal',()=>{
  it.each(['ground','lesson'])('keeps protected %s blocks, history and counts intact while retaining the protected bump',layer=>{
    const f=fixture(),mesh=seed(f,{lesson:true,layer}),before=stableState(f);f.engine._undoStack=[{action:'old-undo'}];f.engine._redoStack=[{action:'old-redo'}];const historyBefore=stableState(f);f.setHits([hit(mesh)]);
    expect(f.engine.interactAtCrosshair('break')).toBeNull();expect(stableState(f)).toEqual(historyBefore);expect(f.engine.blocksPlaced).toBe(before.placed);expect(f.effects.haptic).toHaveBeenCalledWith('bump');expect(f.effects.haptic).not.toHaveBeenCalledWith('break');expect(f.effects.breakSound).not.toHaveBeenCalled();expect(f.effects.breakParticles).not.toHaveBeenCalled();expect(f.effects.frustration).not.toHaveBeenCalled();expect(f.updates.some(p=>'blocksPlaced'in p)).toBe(false);vi.advanceTimersByTime(600);expect(f.effects.collab).not.toHaveBeenCalled();
  });
  it('performs one real rotated-block removal and one set of success effects, with undo retaining the recipe',()=>{
    const f=fixture(),mesh=seed(f,{type:'wood',shape:'quarter',rotation:3}),removedGeometry=vi.spyOn(mesh.geometry,'dispose');f.engine._redoStack=[{action:'old-redo'}];f.setHits([hit(mesh)]);const placed=f.engine.blocksPlaced;f.engine.interactAtCrosshair('break');
    expect(f.engine.blocks['0,1,0']).toBeUndefined();expect(removedGeometry).toHaveBeenCalledTimes(1);expect(f.engine._undoStack).toEqual([{action:'remove',x:0,y:1,z:0,type:'wood',shape:'quarter',rotation:3}]);expect(f.engine._redoStack).toEqual([]);expect(f.engine.blocksPlaced).toBe(placed-1);
    expect(f.effects.breakSound).toHaveBeenCalledTimes(1);expect(f.effects.breakParticles).toHaveBeenCalledTimes(1);expect(f.effects.frustration).toHaveBeenCalledTimes(1);expect(f.effects.haptic).toHaveBeenCalledWith('break');expect(f.engine._shakeIntensity).toBeGreaterThan(0);expect(f.events.filter(e=>e.type==='block_remove')).toHaveLength(1);vi.advanceTimersByTime(500);expect(f.effects.collab).toHaveBeenCalledTimes(1);
    expect(f.engine.undo()).toBe(true);expect(f.engine.blocks['0,1,0'].userData).toMatchObject({blockType:'wood',shape:'quarter',rotation:3});
  });
  it('ignores a stale break hit rather than removing the replacement block at that cell',()=>{
    const f=fixture(),original=seed(f,{type:'wood'}),replacement=seed(f,{type:'gold',shape:'quarter',rotation:2});f.setHits([hit(original)]);const before=stableState(f);expect(f.engine.interactAtCrosshair('break')).toBeNull();expect(stableState(f)).toEqual(before);expect(f.engine.blocks['0,1,0']).toBe(replacement);expect(f.effects.breakSound).not.toHaveBeenCalled();expect(f.effects.breakParticles).not.toHaveBeenCalled();expect(f.effects.haptic).not.toHaveBeenCalled();
  });
  it('suppresses success feedback if removal is rejected by the actual removal boundary',()=>{
    const f=fixture(),mesh=seed(f),before=stableState(f);f.setHits([hit(mesh)]);f.engine.removeBlock=vi.fn();expect(f.engine.interactAtCrosshair('break')).toBeNull();expect(stableState(f)).toEqual(before);expect(f.effects.breakSound).not.toHaveBeenCalled();expect(f.effects.haptic).not.toHaveBeenCalled();expect(f.effects.frustration).not.toHaveBeenCalled();expect(f.updates).toHaveLength(0);
  });
});
