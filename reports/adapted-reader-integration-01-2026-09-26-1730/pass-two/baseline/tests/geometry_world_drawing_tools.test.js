import {beforeAll,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const fixtureSource=readFileSync('tests/geometry_world_placement_transaction.test.js','utf8');
let THREE,makeFixture;
beforeAll(()=>{
 const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;window.THREE=THREE;
 const makeShape=new Function(source.slice(source.indexOf('  function createShapeGeometry('),source.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
 const helpers=fixtureSource.slice(fixtureSource.indexOf('function engineFunction('),fixtureSource.indexOf('\nfunction seed('));
 const base=new Function('source','THREE','makeShape','vi',helpers+'\nreturn fixture;')(source,THREE,makeShape,vi);
 makeFixture=()=>{
  const f=base(),engine=f.engine;
  engine._worldActive=true;engine._modalState={};engine.releaseInput=vi.fn();
  const start=source.indexOf('        // Atomic student construction:'),end=source.indexOf('        // End bounded drawing previews.',start);
  if(start<0 || end<0)throw Error('Production drawing implementation is not installed');
  const history=source.slice(source.indexOf('        var MAX_UNDO = 200;'),source.indexOf('        engine.undo = function()'));
  const deps={engine,THREE,MAX_BLOCKS:1500,BLOCK_TYPES:[{id:'stone',color:0x998877},{id:'wood',color:0x886644}],BLOCK_SHAPES:[{id:'cube'},{id:'halfB'},{id:'halfA'},{id:'quarter'}],createShapeGeometry:makeShape,upd:(k,v)=>f.updates.push({key:k,value:v}),announceToSR:f.effects.sr};
  new Function(...Object.keys(deps),history+source.slice(start,end))(...Object.values(deps));
  return f;
 };
});
const block=(x,y=1,z=0,type='stone',shape='cube',rotation=0)=>({x,y,z,type,shape,rotation});
function place(f,b){return f.engine.placeBlock(b.x,b.y,b.z,b.type,b.shape,b.rotation);}
function snapshot(f){return {keys:Object.keys(f.engine.blocks),meshes:Object.values(f.engine.blocks),history:structuredClone(f.engine._undoStack),redo:structuredClone(f.engine._redoStack),events:structuredClone(f.events),count:f.engine.blocksPlaced,scene:f.engine.scene.children.slice()};}

describe('atomic construction batches',()=>{
 it('previews real fractional recipes without mutating scene, logs, count or history',()=>{const f=makeFixture(),before=snapshot(f),p=f.engine.previewBuildBatch([block(0,1,0,'wood','halfA',3)],[],{});expect(p.ok).toBe(true);expect(snapshot(f)).toEqual(before);});
 it.each([
  ['occupied',f=>{place(f,block(1));return [[block(0),block(1)],[]];}],
  ['protected',f=>{const m=place(f,block(0));m.userData._lessonBlock=true;return [[],[block(0)]];}],
  ['protected',f=>{const m=place(f,block(0));m.userData._measurementLayer='ground';return [[],[block(0)]];}],
  ['out_of_bounds',()=>[[block(65)],[]]],['below_floor',()=>[[block(0,-1)],[]]],
  ['shape',()=>[[block(0,1,0,'stone','invented')],[]]],['material',()=>[[block(0,1,0,'invented')],[]]],
  ['rotation',()=>[[block(0,1,0,'stone','halfA',1.5)],[]]],['duplicate',()=>[[block(0),block(0)],[]]]
 ])('rejects %s atomically',(code,input)=>{const f=makeFixture(),args=input(f),before=snapshot(f);expect(f.engine.commitBuildBatch(...args,{label:'Test'}).code).toBe(code);expect(snapshot(f)).toEqual(before);});
 it('accounts for removals before collision and net capacity checks',()=>{const f=makeFixture();place(f,block(0));f.engine.getConstructionBlockCount=()=>1500;expect(f.engine.previewBuildBatch([block(0,1,0,'wood')],[block(0)],{}).ok).toBe(true);expect(f.engine.previewBuildBatch([block(1)],[],{}).code).toBe('block_limit');});
 it('commits a wall as one action and preserves exact meshes through undo and redo',()=>{const f=makeFixture(),e=f.engine;e._undoStack=[];f.events.length=0;const cells=[block(0,1,0,'wood','halfA',3),block(1,1,0,'wood','quarter',1)];expect(e.commitBuildBatch(cells,[],{label:'Wall'}).ok).toBe(true);expect(e._undoStack).toHaveLength(1);expect(e.blocksPlaced).toBe(11);expect(f.events.filter(x=>x.type==='block_place')).toHaveLength(2);expect(e.undo()).toBe(true);expect(Object.keys(e.blocks)).toHaveLength(0);expect(e.blocksPlaced).toBe(9);expect(e.redo()).toBe(true);expect(e.blocks['0,1,0'].userData).toMatchObject({shape:'halfA',rotation:3,blockType:'wood'});expect(e.blocks['1,1,0'].position.y).toBe(1);expect(e.blocksPlaced).toBe(11);});
 it('copies selection history and restores before/after cells',()=>{const f=makeFixture(),e=f.engine;place(f,block(0));e._undoStack=[];const before={blocks:[block(0)]},after={blocks:[block(3)]};expect(e.commitBuildBatch([block(3)],[block(0)],{beforeSelection:before,afterSelection:after}).ok).toBe(true);after.blocks[0].x=99;expect(e._builderSelection.blocks[0].x).toBe(3);expect(e.undo()).toBe(true);expect(e._builderSelection.blocks[0].x).toBe(0);expect(e.redo()).toBe(true);expect(e._builderSelection.blocks[0].x).toBe(3);});
 it('does not overwrite a source whose material changed after commit',()=>{const f=makeFixture(),e=f.engine;e.commitBuildBatch([block(0)],[],{});e.blocks['0,1,0'].userData.blockType='wood';const before=snapshot(f);expect(e.undo()).toBe(false);expect(snapshot(f)).toEqual(before);});
 it('keeps grouped replay on its stack if a destination is now occupied',()=>{const f=makeFixture(),e=f.engine;e.commitBuildBatch([block(0)],[],{});e.undo();e._replayingHistory=true;place(f,block(0));e._replayingHistory=false;const before=snapshot(f);expect(e.redo()).toBe(false);expect(snapshot(f)).toEqual(before);});
 it('restores original mesh identity and no events after a later allocation failure',()=>{const f=makeFixture(),e=f.engine,old=place(f,block(0)),before=snapshot(f),original=e.placeBlock;e.placeBlock=function(...args){if(args[0]===3)throw Error('GPU allocation failed');return original.apply(e,args);};expect(e.commitBuildBatch([block(2),block(3)],[block(0)],{}).code).toBe('creation_failed');expect(snapshot(f)).toEqual(before);expect(e.blocks['0,1,0']).toBe(old);});
 it('cleans a mesh attached before a failed creator registers it',()=>{const f=makeFixture(),e=f.engine,before=snapshot(f),g=new THREE.BoxGeometry(),m=new THREE.MeshBasicMaterial(),gd=vi.spyOn(g,'dispose'),md=vi.spyOn(m,'dispose');e.placeBlock=()=>{e.scene.add(new THREE.Mesh(g,m));throw Error('between attach and map');};expect(e.commitBuildBatch([block(0)],[],{}).ok).toBe(false);expect(snapshot(f)).toEqual(before);expect(gd).toHaveBeenCalledTimes(1);expect(md).toHaveBeenCalledTimes(1);});
});

describe('bounded Line / Floor / Wall drawing',()=>{
 it.each([['line',{x:4,y:1,z:2},1,5,{L:5,W:1,H:1}],['floor',{x:-2,y:9,z:3},1,12,{L:3,W:4,H:1}],['wall',{x:4,y:9,z:2},3,15,{L:5,W:1,H:3}]])('builds predictable %s cells and live dimensions',(mode,end,height,count,dimensions)=>{const e=makeFixture().engine,p=e.buildDrawingCells(mode,{x:0,y:1,z:0},end,height);expect(p.count).toBe(count);expect(p.dimensions).toEqual(dimensions);expect(p.additions).toHaveLength(count);expect(p.additions.every(b=>b.y>=1)).toBe(true);});
 it('reuses a stationary preview until recipe or world history changes',()=>{const e=makeFixture().engine;e.setDrawMode('floor');const validate=vi.spyOn(e,'previewBuildBatch');e.beginDrawing({x:0,y:1,z:0});e.previewDrawing({x:10,y:1,z:10});const calls=validate.mock.calls.length;for(let i=0;i<20;i++)e.previewDrawing({x:10,y:1,z:10});expect(validate).toHaveBeenCalledTimes(calls);e._placeState.selectedBlock=1;e.previewDrawing({x:10,y:1,z:10});expect(validate).toHaveBeenCalledTimes(calls+1);e._undoStack.push({action:'place'});e.previewDrawing({x:10,y:1,z:10});expect(validate).toHaveBeenCalledTimes(calls+2);});
 it('rejects huge rectangles before materializing their cells',()=>{const e=makeFixture().engine,p=e.buildDrawingCells('floor',{x:0,y:1,z:0},{x:1000000,y:1,z:1000000},1);expect(p.code).toBe('block_limit');expect(p.additions).toBeUndefined();});
 it('previews one merged line mesh with exact fractional rotated bounds',()=>{const e=makeFixture().engine;expect(e.showBuildBatchPreview({ok:true,additions:[block(0,1,0,'stone','halfB',0),block(1,1,0,'stone','halfA',1)]},'test')).toBe(true);const group=e._buildBatchPreview.group;expect(group.children).toHaveLength(1);group.children[0].geometry.computeBoundingBox();expect(group.children[0].geometry.boundingBox.min.y).toBe(1);expect(group.children[0].geometry.boundingBox.max.y).toBe(2);const geo=group.children[0].geometry,dispose=vi.spyOn(geo,'dispose');e.clearBuildBatchPreview('other');expect(e._buildBatchPreview).not.toBeNull();e.clearBuildBatchPreview('test');expect(e._buildBatchPreview).toBeNull();expect(dispose).toHaveBeenCalledTimes(1);});
 it('shows collisions without committing and Escape cancellation releases previews',()=>{const f=makeFixture(),e=f.engine;place(f,block(2));e.setDrawMode('line');e.beginDrawing({x:0,y:1,z:0});expect(e.previewDrawing({x:3,y:1,z:0}).code).toBe('occupied');const before=snapshot(f);expect(e.commitDrawing()).toBe(false);expect(Object.keys(e.blocks)).toEqual(before.keys);e.cancelDrawing();expect(e._drawStart).toBeNull();expect(e._buildBatchPreview).toBeNull();});
 it('supports accessible crosshair start then endpoint placement with one Undo',()=>{const f=makeFixture(),e=f.engine;const ground=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());ground.userData.gridPos={x:0,y:0,z:0};let hit={object:ground,face:{normal:new THREE.Vector3(0,1,0)}};e.drawingHitAt=()=>hit;e.setDrawMode('floor');expect(e.drawAtCrosshair()).toBe(true);ground.userData.gridPos={x:2,y:0,z:1};expect(e.drawAtCrosshair()).toBe(true);expect(Object.keys(e.blocks)).toHaveLength(6);expect(e._undoStack).toHaveLength(1);expect(e.undo()).toBe(true);expect(Object.keys(e.blocks)).toHaveLength(0);});
 it.each(['focused','front','side','top'])('starts mouse and keyboard drawing beyond walking reach in %s view',view=>{
  const f=makeFixture(),e=f.engine,ground=place(f,block(0,0,0));ground.userData._lessonBlock=true;ground.updateMatrixWorld(true);e._undoStack=[];e.raycaster=new THREE.Raycaster();e.raycaster.far=8;
  e.camera.position.set(.5,40,.5);e.camera.lookAt(.5,.5,.5);e.camera.updateMatrixWorld(true);e.setDrawMode('floor');
  if(view==='focused')e._creationFocus={manual:false,lesson:e._currentLesson};else e._viewPreset=view;
  const pointerStart=source.indexOf('        function drawingPointerCell('),pointerEnd=source.indexOf("        canvas.addEventListener('pointerdown'",pointerStart);
  const pointer=new Function('canvas','engine','THREE',source.slice(pointerStart,pointerEnd)+'return drawingPointerCell;')({getBoundingClientRect:()=>({left:100,top:50,width:800,height:600})},e,THREE);
  expect(pointer({clientX:500,clientY:350},false)).toEqual({x:0,y:1,z:0});expect(e.drawingHitAt().distance).toBeCloseTo(39);expect(e.drawAtCrosshair()).toBe(true);expect(e._drawStart).toEqual({x:0,y:1,z:0});expect(e.raycaster.far).toBe(8);
  e.setDrawMode('single');expect(e.getDrawingReach()).toBe(8);const before=Object.keys(e.blocks);expect(e.interactAtCrosshair('place')).toBeNull();expect(Object.keys(e.blocks)).toEqual(before);
 });
 it('keeps manual and stale focused views at walking reach and caps fitted drawing at 160',()=>{
  const e=makeFixture().engine,ground=e.placeBlock(0,0,0,'stone','cube',0);ground.updateMatrixWorld(true);e.setDrawMode('line');e.camera.position.set(.5,40,.5);e.camera.lookAt(.5,.5,.5);e._viewPreset='free';
  expect(e.drawingHitAt()).toBeNull();e._creationFocus={manual:true,lesson:e._currentLesson};expect(e.drawingHitAt()).toBeNull();e._creationFocus={manual:false,lesson:{}};expect(e.drawingHitAt()).toBeNull();e._creationFocus={manual:false,lesson:e._currentLesson};expect(e.drawingHitAt()).not.toBeNull();
  e.camera.position.y=200;expect(e.drawingHitAt()).toBeNull();expect(e._drawingRaycaster.far).toBe(160);
 });
 it('updates the B/touch endpoint from the same distant fitted ray as its initial point',()=>{
  const e=makeFixture().engine;[0,3].forEach(x=>{const mesh=e.placeBlock(x,0,0,'stone','cube',0);mesh.userData._lessonBlock=true;mesh.updateMatrixWorld(true);});e._undoStack=[];e.setDrawMode('line');e._viewPreset='top';e.camera.position.set(.5,40,.5);e.camera.lookAt(.5,.5,.5);expect(e.drawAtCrosshair()).toBe(true);e.camera.position.x=3.5;e.camera.lookAt(3.5,.5,.5);e.updateDrawingPreview();expect(e._drawEnd).toEqual({x:3,y:1,z:0});expect(e._drawPlan.count).toBe(4);expect(e.drawAtCrosshair()).toBe(true);expect(e._undoStack).toHaveLength(1);expect([0,1,2,3].every(x=>!!e.blocks[x+',1,0'])).toBe(true);
 });
 it.each(['showGeometryHome','showNpcDialog','showActivityGuide'])('does not draw while %s is open',flag=>{const e=makeFixture().engine;e.setDrawMode('line');e.beginDrawing({x:0,y:1,z:0});e._modalState[flag]=true;expect(e.commitDrawing()).toBe(false);e.updateDrawingPreview();expect(e._drawStart).toBeNull();expect(Object.keys(e.blocks)).toHaveLength(0);});
});
