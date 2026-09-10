import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';

let THREE, api, makeShape;
beforeAll(() => {
  const exports={};
  new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});
  THREE=exports;window.THREE=THREE;
  window.StemLab={_registry:{geometryWorld:{render(){return null;}}},registerTool(id,cfg){this._registry[id]=cfg;}};
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  api=window.StemLab.geometryWorldBuilderPure;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
afterEach(()=>{vi.restoreAllMocks();delete window.__geoWorldEngine;});
const key=b=>[b.x,b.y,b.z].join(',');
const incoming={schema:'alloflow-geometry-world/2',title:'New tower',blocks:[
  {x:0,y:1,z:0,type:'stone',shape:'cube',rotation:0},
  {x:1,y:1,z:0,type:'gold',shape:'quarter',rotation:2},
  {x:0,y:2,z:0,type:'brick',shape:'halfB',rotation:1}
]};
const original=[
  {x:0,y:0,z:0,type:'grass',shape:'cube',rotation:0,lessonBlock:true,measurementLayer:'ground'},
  {x:8,y:1,z:-3,type:'diamond',shape:'halfA',rotation:3,lessonBlock:true,measurementLayer:'lesson'},
  {x:2,y:1,z:3,type:'wood',shape:'quarter',rotation:1,lessonBlock:false,measurementLayer:'student'},
  {x:2,y:2,z:3,type:'brick',shape:'halfB',rotation:2,lessonBlock:false,measurementLayer:'student'},
  {x:-4,y:4,z:9,type:'glass',shape:'cube',rotation:0,lessonBlock:false}
];
function fixture(blocks=original){
  let state={activeLesson:'customLesson',worldActive:true,selectedBlock:2,selectedShape:3,blockRotation:1,
    builderPrintContext:{unitMm:12.5,aiUse:'ASSISTED',aiDisclosure:'Planning'},builderPrintCheck:{status:'PASS'},
    score:3,totalQ:4,answeredNpcs:{1:true},measureResult:{count:2},measureHistory:[{count:1}],blocksPlaced:37,
    volumePrediction:'7',predictionStrategy:'layers',actionFeedback:'Quarter wedge · 90°',layerFocus:0,viewPreset:'free'};
  const ctx={toolData:{geometryWorld:state,printLab:{note:'Keep printer profile'}},updateMulti:vi.fn(function(tool,patch){
    expect(tool).toBe('geometryWorld');state={...state,...patch};this.toolData.geometryWorld=state;
  })};
  const engine={scene:new THREE.Scene(),blocks:{},_undoStack:[],_redoStack:[],_currentLesson:{title:'Custom lesson',sandbox:false,ground:{xMin:0,xMax:0,zMin:0,zMax:0,y:0},structures:[{type:'fill',x1:8,x2:8,y1:1,y2:1,z1:-3,z2:-3,block:'stone'}],npcs:[]},
    camera:new THREE.PerspectiveCamera(48,1.5,.1,300),velocity:new THREE.Vector3(.25,-.5,.75),euler:new THREE.Euler(0,0,0,'YXZ'),yaw:.43,pitch:-.22,flyMode:true,
    blocksPlaced:37,_playerBlockCount:3,_sessionXP:19,_blockMilestones:{ten:true},_historyRevision:8,_predictionState:{commitment:7,history:[{value:6}]},_progressKey:'saved-progress',
    completionTriggered:true,completionProgress:.75,_placingLessonBlocks:false,_measurementLayer:null,_replayingHistory:false,_entryAnim:null,_viewPreset:'free',_fillTruncated:false,
    sessionLog:[{type:'previous-action',data:{test:true}}],refreshAllAO:vi.fn(),refreshLandscape:vi.fn()};
  engine.camera.zoom=1.2;engine.camera.up.set(0,0,1);engine.camera.updateProjectionMatrix();engine.camera.position.set(4,6,12);engine.camera.quaternion.setFromEuler(new THREE.Euler(-.22,.43,0,'YXZ'));
  function add(block){
    const mesh=new THREE.Mesh(makeShape(block.shape),new THREE.MeshBasicMaterial());
    mesh.position.set(block.x+.5,block.y+(block.shape==='cube'?.5:block.shape==='halfB'?.25:0),block.z+.5);
    mesh.rotation.y=block.rotation*Math.PI/2;
    mesh.userData={blockType:block.type,shape:block.shape,rotation:block.rotation,volume:({cube:1,halfA:.5,halfB:.5,quarter:.25})[block.shape],gridPos:{x:block.x,y:block.y,z:block.z},_lessonBlock:!!block.lessonBlock};
    if(block.measurementLayer!==undefined)mesh.userData._measurementLayer=block.measurementLayer;
    mesh.updateMatrixWorld(true);engine.scene.add(mesh);engine.blocks[key(block)]=mesh;return mesh;
  }
  engine.placeBlock=vi.fn((x,y,z,type,shape='cube',rotation=0)=>{
    if(engine.blocks[[x,y,z].join(',')])return null;
    const mesh=add({x,y,z,type,shape,rotation,lessonBlock:engine._placingLessonBlocks,measurementLayer:engine._measurementLayer || (engine._placingLessonBlocks?'lesson':'student')});
    engine._undoStack.push({action:'place',x,y,z,type,shape,rotation});engine._redoStack=[];
    engine.sessionLog.push({type:'block_place',data:{x,y,z}});return mesh;
  });
  engine.loadLesson=vi.fn(lesson=>{
    Object.values(engine.blocks).forEach(mesh=>engine.scene.remove(mesh));engine.blocks={};engine._currentLesson=lesson;engine._builderSelection=null;
    engine._undoStack=[];engine._redoStack=[];engine.blocksPlaced=0;engine._playerBlockCount=0;engine._sessionXP=0;engine._blockMilestones={};
    engine._predictionState={history:[]};engine._progressKey='new-progress';engine.completionTriggered=false;engine.completionProgress=0;
    engine.camera.fov=60;engine.camera.near=.2;engine.camera.far=200;engine.camera.zoom=1;engine.camera.up.set(0,1,0);engine.camera.updateProjectionMatrix();engine.camera.position.set(0,18,-2);engine.camera.quaternion.identity();engine._entryAnim={progress:0};engine._viewPreset='free';
    engine._placingLessonBlocks=true;engine._measurementLayer='ground';
    if(lesson.ground)add({x:0,y:0,z:0,type:'grass',shape:'cube',rotation:0,lessonBlock:true,measurementLayer:'ground'});
    engine._placingLessonBlocks=false;engine._measurementLayer=null;
    engine.sessionLog.push({type:'lesson_load',data:{title:lesson.title}});
    ctx.updateMulti('geometryWorld',{score:0,totalQ:0,answeredNpcs:{},blocksPlaced:0,measureResult:null,measureHistory:[],volumePrediction:'',predictionStrategy:''});
  });
  blocks.forEach(add);engine._builderSelection={blocks:blocks.filter(b=>!b.lessonBlock).map(({x,y,z})=>({x,y,z}))};
  engine._undoStack=[{action:'place',...original[2]}];engine._redoStack=[{action:'remove',...original[3]}];
  window.__geoWorldEngine=engine;
  return {engine,ctx,state:()=>state,add};
}
function snapshot(app){
  const en=app.engine;
  return {blocks:Object.values(en.blocks).map(m=>({data:m.userData,position:m.position.toArray(),quaternion:m.quaternion.toArray()})).sort((a,b)=>key(a.data.gridPos).localeCompare(key(b.data.gridPos))),
    lesson:en._currentLesson,selection:en._builderSelection,undo:en._undoStack,redo:en._redoStack,
    counters:[en.blocksPlaced,en._playerBlockCount,en._sessionXP,en._blockMilestones,en._historyRevision,en.completionTriggered,en.completionProgress],
    prediction:[en._predictionState,en._progressKey],pose:[en.camera.position.toArray(),en.camera.quaternion.toArray(),en.yaw,en.pitch,en.flyMode,en.velocity.toArray()],
    projection:[en.camera.fov,en.camera.near,en.camera.far,en.camera.zoom,en.camera.up.toArray()],
    flags:[en._placingLessonBlocks,en._measurementLayer,en._replayingHistory,en._entryAnim,en._viewPreset,en._fillTruncated],
    sessionLog:en.sessionLog,state:app.state(),printLab:app.ctx.toolData.printLab};
}
function frozen(app){return JSON.parse(JSON.stringify(snapshot(app)));}
function faultSecondStudent(app,kind){
  const real=app.engine.placeBlock;let count=0,failed=false;
  app.engine.placeBlock=vi.fn(function(...args){
    if(!this._placingLessonBlocks && !failed && ++count===2){failed=true;if(kind==='throw')throw new Error('Injected placement failure');if(kind==='wrong')return real(...args.slice(0,4),'cube',0);return null;}
    return real(...args);
  });
}
describe('Editable Geometry World import transactions',()=>{
  it('rejects invalid files without loading, capturing or mutating the workspace',()=>{
    const app=fixture(),before=frozen(app);
    expect(api.restoreEditableWorld(app.engine,{...incoming,schema:'unknown'},app.ctx).ok).toBe(false);
    expect(app.engine.loadLesson).not.toHaveBeenCalled();expect(frozen(app)).toEqual(before);
  });
  it('refuses replacement when the current world cannot be completely backed up',()=>{
    const app=fixture();app.engine.blocks.invalid={userData:{blockType:'wood'}};const before=app.engine.blocks;
    const result=api.restoreEditableWorld(app.engine,incoming,app.ctx);
    expect(result).toMatchObject({ok:false,error:expect.stringContaining('No blocks were changed')});
    expect(app.engine.loadLesson).not.toHaveBeenCalled();expect(app.engine.blocks).toBe(before);
  });
  it('opens a valid file with the requested materials, fractions and rotations as a new history baseline',()=>{
    const app=fixture();const result=api.restoreEditableWorld(app.engine,incoming,app.ctx);
    expect(result).toMatchObject({ok:true,placedCount:3});expect(app.engine._undoStack).toEqual([]);expect(app.engine._redoStack).toEqual([]);
    expect(api.editableWorld(app.engine).blocks).toEqual(api.normalizeEditableWorld(incoming).value.blocks);
    expect(app.engine.blocksPlaced).toBe(3);expect(app.ctx.toolData.printLab).toEqual({note:'Keep printer profile'});
  });
  it.each(['null','throw','wrong'])('restores exact live roles, geometry, selection, history, camera, counters and print context after %s placement failure',kind=>{
    const app=fixture(),before=frozen(app);const students=original.filter(b=>!b.lessonBlock);
    const stl=new Uint8Array(api.buildGeometryWorldStl(app.engine,students).buffer);
    faultSecondStudent(app,kind);
    const result=api.restoreEditableWorld(app.engine,incoming,app.ctx);
    expect(result).toMatchObject({ok:false,restored:true,error:expect.stringContaining('previous workspace was restored')});
    expect(frozen(app)).toEqual(before);expect(new Uint8Array(api.buildGeometryWorldStl(app.engine,students).buffer)).toEqual(stl);
    expect(app.engine.blocks['8,1,-3'].userData).toMatchObject({blockType:'diamond',shape:'halfA',rotation:3,_lessonBlock:true,_measurementLayer:'lesson'});
    expect(app.engine._editableImportRecovery).toBeUndefined();
  });
  it.each([false,true])('restores building view after Showcase import failure despite stale React state (collapsed=%s)',collapsed=>{
    const app=fixture(),en=app.engine,before=frozen(app);
    const stale={...app.state(),showcaseActive:true,showcaseSaving:true,sandboxDockCollapsed:true};
    let published={...stale};app.ctx.toolData.geometryWorld=stale;
    app.ctx.updateMulti=vi.fn((tool,patch)=>{expect(tool).toBe('geometryWorld');published={...published,...patch};});
    en._showcase={collapsed};en.camera.position.set(30,40,50);en.camera.fov=42;
    const end=vi.fn(()=>{
      en._showcase=null;en.endShowcase=null;en.camera.position.fromArray(before.pose[0]);en.camera.quaternion.fromArray(before.pose[1]);
      [en.camera.fov,en.camera.near,en.camera.far,en.camera.zoom]=before.projection.slice(0,4);en.camera.up.fromArray(before.projection[4]);en.camera.updateProjectionMatrix();
    });en.endShowcase=end;
    faultSecondStudent(app,'null');
    expect(api.restoreEditableWorld(en,incoming,app.ctx)).toMatchObject({ok:false,restored:true});
    expect(end).toHaveBeenCalledTimes(1);expect(en._showcase).toBeNull();
    expect(published).toMatchObject({showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:collapsed});
    before.state={...before.state,showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:collapsed};
    const after=frozen(app);after.state=JSON.parse(JSON.stringify(published));expect(after).toEqual(before);
  });
  it.each(['invalid','saving'])('leaves Showcase and its camera untouched when an import is %s',reason=>{
    const app=fixture(),en=app.engine,before=frozen(app);en._showcase={collapsed:false};en.endShowcase=vi.fn();en._showcaseExporting=reason==='saving';
    const candidate=reason==='invalid'?{...incoming,schema:'unknown'}:incoming;
    expect(api.restoreEditableWorld(en,candidate,app.ctx).ok).toBe(false);expect(en.endShowcase).not.toHaveBeenCalled();expect(en.loadLesson).not.toHaveBeenCalled();expect(frozen(app)).toEqual(before);
  });
  it('rolls back a lesson-loader exception after the current world was cleared',()=>{
    const app=fixture(),before=frozen(app),real=app.engine.loadLesson;let count=0;
    app.engine.loadLesson=vi.fn(lesson=>{real(lesson);if(++count===1)throw new Error('Injected lesson failure');});
    expect(api.restoreEditableWorld(app.engine,incoming,app.ctx)).toMatchObject({ok:false,restored:true});expect(frozen(app)).toEqual(before);
  });
  it('rolls back a post-load capacity failure',()=>{
    const app=fixture(),before=frozen(app),real=app.engine.loadLesson;let count=0;
    app.engine.loadLesson=vi.fn(lesson=>{real(lesson);if(++count===1)for(let i=0;i<1499;i++)app.engine.blocks['extra-'+i]={userData:{}};});
    expect(api.restoreEditableWorld(app.engine,incoming,app.ctx)).toMatchObject({ok:false,restored:true});expect(frozen(app)).toEqual(before);
  });
  it.each(['null','throw'])('retains a directly importable original backup when persistent %s failures also prevent rollback',kind=>{
    const app=fixture(),before=frozen(app),previous=api.editableWorld(app.engine);
    app.engine.placeBlock=vi.fn(()=>{if(kind==='throw')throw new Error('Persistent placement failure');return null;});
    const result=api.restoreEditableWorld(app.engine,incoming,app.ctx);
    expect(result).toMatchObject({ok:false,restored:false,error:expect.stringContaining('could not be fully restored')});
    expect(result.error).not.toContain('workspace was restored');expect(result.recovery).toBe(app.engine._editableImportRecovery);
    expect(result.recovery.blocks).toHaveLength(original.length);expect(result.recovery.state.builderPrintContext).toEqual(before.state.builderPrintContext);
    expect(result.recovery.undo).toEqual(before.undo);expect(result.recovery.camera).toEqual(before.pose[0]);
    expect(api.parseEditableWorldText(JSON.stringify(result.recovery.editableWorld))).toMatchObject({ok:true,value:previous});
    expect([app.engine._placingLessonBlocks,app.engine._measurementLayer,app.engine._replayingHistory]).toEqual([false,null,false]);
  });
  it('releases temporary lesson/history flags and keeps backup when rollback setup throws',()=>{
    const app=fixture();app.engine.loadLesson=()=>{app.engine.blocks={};app.engine._placingLessonBlocks=true;app.engine._measurementLayer='ground';app.engine._replayingHistory=true;throw new Error('Persistent lesson failure');};
    const result=api.restoreEditableWorld(app.engine,incoming,app.ctx);
    expect(result).toMatchObject({ok:false,restored:false});expect(result.recovery.blocks).toHaveLength(original.length);
    expect([app.engine._placingLessonBlocks,app.engine._measurementLayer,app.engine._replayingHistory]).toEqual([false,null,false]);
  });
  it('keeps the earliest complete backup through a failed retry and a later successful import',()=>{
    const app=fixture(),real=app.engine.placeBlock;app.engine.placeBlock=()=>null;
    const first=api.restoreEditableWorld(app.engine,incoming,app.ctx).recovery;
    expect(first).toBeTruthy();expect(api.restoreEditableWorld(app.engine,incoming,app.ctx).ok).toBe(false);expect(app.engine._editableImportRecovery).toBe(first);
    app.engine.placeBlock=real;expect(api.restoreEditableWorld(app.engine,incoming,app.ctx).ok).toBe(true);expect(app.engine._editableImportRecovery).toBe(first);
  });
  it('retains full recovery details without promising an editable file for an empty original student world',()=>{
    const app=fixture(original.filter(b=>b.lessonBlock));app.engine.placeBlock=()=>null;
    const result=api.restoreEditableWorld(app.engine,incoming,app.ctx);
    expect(result).toMatchObject({ok:false,restored:false});expect(result.recovery.editableWorld).toBeNull();expect(result.recovery.blocks).toHaveLength(2);
  });
});
