import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const fixtureSource=readFileSync('tests/geometry_world_placement_transaction.test.js','utf8');
const originalLab=window.StemLab,originalThree=window.THREE;
let THREE,makeShape,makeFixture,api,style,fixtures=[];
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;window.THREE=THREE;
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
  const helpers=fixtureSource.slice(fixtureSource.indexOf('function engineFunction('),fixtureSource.indexOf('\nfunction seed('));
  const base=new Function('source','THREE','makeShape','vi',helpers+'\nreturn fixture;')(core,THREE,makeShape,vi);
  makeFixture=()=>{
    const f=base(),engine=f.engine;engine._worldActive=true;engine._modalState={};engine.releaseInput=vi.fn();
    const start=core.indexOf('        // Atomic student construction:'),end=core.indexOf('        // End bounded drawing previews.',start);
    const history=core.slice(core.indexOf('        var MAX_UNDO = 200;'),core.indexOf('        engine.undo = function()'));
    const deps={engine,THREE,MAX_BLOCKS:1500,BLOCK_TYPES:[{id:'stone',color:0x998877},{id:'wood',color:0x886644},{id:'grass',color:0x669955}],BLOCK_SHAPES:[{id:'cube'},{id:'halfB'},{id:'halfA'},{id:'quarter'}],createShapeGeometry:makeShape,upd:(k,v)=>f.updates.push({key:k,value:v}),announceToSR:f.effects.sr};
    new Function(...Object.keys(deps),history+core.slice(start,end))(...Object.values(deps));fixtures.push(f);return f;
  };
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  if(!document.getElementById('allo-geometryworld-builder-css')){style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
});
afterAll(()=>{window.StemLab=originalLab;window.THREE=originalThree;style?.remove();});
beforeEach(()=>{window.THREE=THREE;});
afterEach(()=>{fixtures.forEach(f=>{f.engine.clearBuildBatchPreview?.();Object.values(f.engine.blocks).forEach(mesh=>f.engine._disposeBlockMesh(mesh));});fixtures=[];vi.restoreAllMocks();});
const block=(x,y=1,z=0,type='stone',shape='cube',rotation=0)=>({x,y,z,type,shape,rotation});
const key=b=>[b.x,b.y,b.z].join(',');
const pos=b=>({x:b.x,y:b.y,z:b.z});
function place(f,b){return f.engine.placeBlock(b.x,b.y,b.z,b.type,b.shape,b.rotation);}
function selected(blocks=[block(0,1,0,'stone','halfA',3),block(7,2,1,'wood','quarter',1)]){const f=makeFixture();blocks.forEach(b=>place(f,b));f.engine._builderSelection={blocks:blocks.map(pos)};f.engine._undoStack=[];f.engine._redoStack=[];f.events.length=0;return f;}
function snapshot(f){return {recipes:Object.values(f.engine.blocks).map(mesh=>({...mesh.userData})),identities:Object.values(f.engine.blocks),scene:f.engine.scene.children.slice(),undo:structuredClone(f.engine._undoStack),redo:structuredClone(f.engine._redoStack),selection:structuredClone(f.engine._builderSelection),count:f.engine.blocksPlaced,events:structuredClone(f.events)};}
function worldVertices(b){const geometry=makeShape(b.shape),position=new THREE.Vector3(b.x+.5,b.y+(b.shape==='cube'?.5:b.shape==='halfB'?.25:0),b.z+.5),matrix=new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),b.rotation*Math.PI/2),new THREE.Vector3(1,1,1)),a=geometry.attributes.position,result=[];for(let i=0;i<a.count;i++)result.push(new THREE.Vector3(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(matrix));geometry.dispose();return result;}
const pointSet=points=>[...new Set(points.map(p=>p.toArray().map(v=>Math.round(v*1e6)/1e6).join(',')))].sort();
function memoryStorage(initial){let raw=initial;return {getItem:()=>raw??null,setItem:(_key,value)=>{raw=value;},raw:()=>raw};}

describe('whole creation geometry transforms',()=>{
  for(const shape of ['cube','halfB','halfA','quarter'])for(let rotation=0;rotation<4;rotation++)for(const operation of ['rotate','mirrorX','mirrorZ'])it(`${operation} preserves the actual ${shape} solid at quarter turn ${rotation}`,()=>{
    const records=[block(-2,3,1,'stone',shape,rotation),block(1,1,5,'wood','cube',0)],before=structuredClone(records),result=api.transformCreationBlocks(records,operation,{});
    expect(result.ok).toBe(true);expect(records).toEqual(before);expect(result.additions.every(b=>[b.x,b.y,b.z,b.rotation].every(Number.isInteger))).toBe(true);
    const expected=worldVertices(records[0]).map(p=>operation==='rotate'?new THREE.Vector3(-2+p.z-1,p.y,1+2-p.x):operation==='mirrorX'?new THREE.Vector3(-2+1+1-p.x,p.y,p.z):new THREE.Vector3(p.x,p.y,1+5+1-p.z));
    expect(pointSet(worldVertices(result.additions[0]))).toEqual(pointSet(expected));
  });
  it('four rotations return every asymmetric footprint recipe to its original grid corner',()=>{const original=[block(-3,1,2,'stone','halfA',1),block(-1,3,6,'wood','quarter',2)];let current=original;for(let i=0;i<4;i++)current=api.transformCreationBlocks(current,'rotate',{}).additions;expect(current).toEqual(original);});
  it.each(['mirrorX','mirrorZ'])('reflecting twice across %s restores exact recipes',operation=>{const original=[block(-3,1,2,'stone','halfA',1),block(-1,3,6,'wood','quarter',2)];expect(api.transformCreationBlocks(api.transformCreationBlocks(original,operation,{}).additions,operation,{}).additions).toEqual(original);});
  it.each([{x:.5,y:0,z:0},{x:1,y:NaN,z:0},{x:129,y:0,z:0},{x:0,y:0,z:0}])('rejects unsafe or empty offsets %j',offset=>{expect(api.transformCreationBlocks([block(0)],'move',offset).ok).toBe(false);});
});

describe('selection editing through actual construction transactions',()=>{
  it.each(['move','duplicate','rotate','mirrorX','mirrorZ','recolor'])('previews %s without changing the world, selection, history or logs',operation=>{const f=selected(),before=snapshot(f),plan=api.previewSelectionEdit(f.engine,operation,{x:12,y:1,z:0,type:'wood'});expect(plan.ok).toBe(true);expect(plan.additions).toHaveLength(2);expect(snapshot(f)).toEqual(before);});
  it.each(['move','duplicate','rotate','mirrorX','mirrorZ','recolor'])('%s commits and replays a disconnected selection in one Undo',operation=>{
    const f=selected(),e=f.engine,before=api.selectionEditSnapshot(e),count=e.blocksPlaced,plan=api.previewSelectionEdit(e,operation,{x:12,y:1,z:0,type:'wood'});
    expect(api.commitSelectionEdit(e,plan).ok).toBe(true);expect(e._undoStack).toHaveLength(1);expect(e._undoStack[0].action).toBe('batch');expect(e._builderSelection.blocks).toEqual(plan.additions.map(pos));expect(e.blocksPlaced).toBe(count+(operation==='duplicate'?2:0));
    expect(e.undo()).toBe(true);expect(api.selectionEditSnapshot(e).blocks).toEqual(before.blocks);expect(e.blocksPlaced).toBe(count);expect(e.redo()).toBe(true);expect(api.selectionEditSnapshot(e).blocks).toEqual(plan.additions.slice().sort((a,b)=>a.y-b.y||a.x-b.x||a.z-b.z));
  });
  it('rechecks destination collisions between preview and apply',()=>{const f=selected([block(0)]),p=api.previewSelectionEdit(f.engine,'move',{x:2,y:0,z:0});place(f,block(2));const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,p).code).toBe('occupied');expect(snapshot(f)).toEqual(before);});
  it.each(['material','selection','removed'])('rejects a stale %s after preview',kind=>{const f=selected(),e=f.engine,p=api.previewSelectionEdit(e,'move',{x:12,y:0,z:0});if(kind==='material')e.blocks['0,1,0'].userData.blockType='wood';if(kind==='selection')e._builderSelection.blocks.pop();if(kind==='removed')delete e.blocks['0,1,0'];const before=snapshot(f);expect(api.commitSelectionEdit(e,p).ok).toBe(false);expect(snapshot(f)).toEqual(before);});
  it('rejects stale selected cells without pruning a partially present selection',()=>{const f=selected();f.engine._builderSelection.blocks.push({x:50,y:50,z:50});const before=snapshot(f);expect(api.previewSelectionEdit(f.engine,'rotate',{}).ok).toBe(false);expect(snapshot(f)).toEqual(before);});
  it('protects the ground and refuses a net capacity increase while allowing a move',()=>{const f=selected([block(0)]),e=f.engine;place(f,block(0,0));e.blocks['0,0,0'].userData._measurementLayer='ground';expect(api.previewSelectionEdit(e,'move',{x:0,y:-1,z:0}).ok).toBe(false);e.getConstructionBlockCount=()=>1500;expect(api.previewSelectionEdit(e,'duplicate',{x:1,y:0,z:0}).code).toBe('block_limit');expect(api.previewSelectionEdit(e,'move',{x:1,y:0,z:0}).ok).toBe(true);});
  it('cannot apply a prior world preview in another lesson or Showcase',()=>{const f=selected(),e=f.engine,p=api.previewSelectionEdit(e,'rotate',{});e._showcase={};expect(api.commitSelectionEdit(e,p).ok).toBe(false);e._showcase=null;e._currentLesson={sandbox:true};expect(api.commitSelectionEdit(e,p).ok).toBe(false);});
});

describe('bounded editable browser-local stamps',()=>{
  it('round-trips named shape recipes without changing the creation, then places them with one Undo',()=>{const f=selected(),e=f.engine,store=memoryStorage(),before=snapshot(f),result=api.saveSelectionStamp(e,'Garden arch',store);expect(result.ok).toBe(true);expect(snapshot(f)).toEqual(before);expect(api.readBuildStamps(store)).toEqual(result);const stamp=result.stamps[0];expect(stamp.name).toBe('Garden arch');expect(stamp.blocks.map(b=>[b.type,b.shape,b.rotation])).toEqual([['stone','halfA',3],['wood','quarter',1]]);const plan=api.previewBuildStamp(e,stamp,{x:20,y:1,z:0});expect(plan.ok).toBe(true);expect(snapshot(f)).toEqual(before);expect(api.commitSelectionEdit(e,plan).ok).toBe(true);expect(e._undoStack).toHaveLength(1);expect(e._builderSelection.blocks).toEqual(plan.additions.map(pos));expect(e.undo()).toBe(true);expect(api.selectionEditSnapshot(e).blocks).toEqual(api.selectionEditSnapshot({blocks:Object.fromEntries(before.identities.map(m=>[key(m.userData.gridPos),m])),_builderSelection:before.selection}).blocks);});
  it('keeps stamp coordinates editable and validates a new destination before mutation',()=>{const f=selected(),store=memoryStorage(),saved=api.saveSelectionStamp(f.engine,'Arch',store).stamps[0],before=snapshot(f);expect(api.previewBuildStamp(f.engine,saved,{x:64,y:1,z:0}).ok).toBe(false);expect(api.previewBuildStamp(f.engine,saved,{x:0,y:1,z:0}).code).toBe('occupied');expect(api.previewBuildStamp(f.engine,saved,{x:0.25,y:1,z:0}).ok).toBe(false);expect(snapshot(f)).toEqual(before);});
  it.each(['{','null',JSON.stringify({schema:'alloflow-build-stamps/1',stamps:[{id:'a',name:'Broken',blocks:[block(0,0)]}]})])('does not overwrite malformed stored data %s',raw=>{const f=selected(),store=memoryStorage(raw);expect(api.readBuildStamps(store).ok).toBe(false);expect(api.saveSelectionStamp(f.engine,'Safe',store).ok).toBe(false);expect(store.raw()).toBe(raw);});
  it('rejects duplicate IDs, repeated cells, unknown shapes and oversized libraries',()=>{const recipe={id:'a',name:'Arch',blocks:[block(0)]};for(const stamps of [[recipe,recipe],[{...recipe,blocks:[block(0),block(0)]}],[{...recipe,blocks:[{...block(0),shape:'invented'}]}],Array.from({length:13},(_,i)=>({...recipe,id:'s'+i}))]){expect(api.readBuildStamps(memoryStorage(JSON.stringify({schema:'alloflow-build-stamps/1',stamps}))).ok).toBe(false);}});
  it('handles storage denial or quota exhaustion without losing current blocks or earlier recipes',()=>{const f=selected(),before=snapshot(f);expect(api.saveSelectionStamp(f.engine,'Arch',{getItem(){throw Error('denied');}}).ok).toBe(false);const raw=JSON.stringify({schema:'alloflow-build-stamps/1',stamps:[]});expect(api.saveSelectionStamp(f.engine,'Arch',{getItem:()=>raw,setItem(){throw Error('quota');}}).ok).toBe(false);expect(snapshot(f)).toEqual(before);});
  it('does not silently replace an existing named recipe',()=>{const f=selected(),store=memoryStorage();expect(api.saveSelectionStamp(f.engine,'Arch',store).ok).toBe(true);const raw=store.raw();expect(api.saveSelectionStamp(f.engine,' arch ',store).ok).toBe(false);expect(store.raw()).toBe(raw);});
  it('removes only the chosen stored recipe, leaving placed geometry intact',()=>{const f=selected(),store=memoryStorage(),saved=api.saveSelectionStamp(f.engine,'Arch',store),before=snapshot(f);expect(api.removeBuildStamp(saved.stamps[0].id,store)).toEqual({ok:true,stamps:[]});expect(snapshot(f)).toEqual(before);});
});

describe('clear-position duplicate suggestions',()=>{
  it('uses the whole footprint, preserves the source during preview, and duplicates in one Undo',()=>{
    const f=selected([block(0),block(1),block(2)]),before=snapshot(f),plan=api.suggestCreationDuplicate(f.engine);
    expect(plan.ok).toBe(true);expect(plan.suggestedOffset).toEqual({x:4,y:0,z:0});expect(snapshot(f)).toEqual(before);
    expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);expect(f.engine._undoStack).toHaveLength(1);expect(Object.keys(f.engine.blocks)).toHaveLength(6);
    expect(f.engine.undo()).toBe(true);expect(api.selectionEditSnapshot(f.engine).blocks).toEqual([block(0),block(1),block(2)]);expect(Object.keys(f.engine.blocks)).toHaveLength(3);
  });
  it('tries the opposite side when the first full-copy destination is occupied',()=>{
    const f=selected([block(0),block(1),block(2)]);place(f,block(4));const before=snapshot(f),plan=api.suggestCreationDuplicate(f.engine,'x');
    expect(plan.suggestedOffset).toEqual({x:-4,y:0,z:0});expect(snapshot(f)).toEqual(before);
  });
  it('tries another axis when both X sides are occupied',()=>{
    const f=selected([block(0)]);place(f,block(2));place(f,block(-2));place(f,block(0,1,2));
    expect(api.suggestCreationDuplicate(f.engine).suggestedOffset).toEqual({x:0,y:0,z:-2});
  });
  it('stacks fractional shapes on the next grid layer and retains rotations',()=>{
    const f=selected([block(0,1,0,'stone','quarter',3)]),plan=api.suggestCreationDuplicate(f.engine,'y');
    expect(plan.suggestedOffset).toEqual({x:0,y:1,z:0});expect(plan.additions).toEqual([block(0,2,0,'stone','quarter',3)]);
  });
  it('chooses the inward side at the sandbox edge',()=>{const f=selected([block(64)]);expect(api.suggestCreationDuplicate(f.engine,'x').suggestedOffset).toEqual({x:-2,y:0,z:0});});
  it('reports the actual block limit without mutating a full world',()=>{const f=selected([block(0)]);f.engine.getConstructionBlockCount=()=>1500;const before=snapshot(f);expect(api.suggestCreationDuplicate(f.engine).code).toBe('block_limit');expect(snapshot(f)).toEqual(before);});
  it('leaves an enclosed creation unchanged when all adjacent positions are blocked',()=>{
    const f=selected([block(0)]);[block(2),block(-2),block(0,1,2),block(0,1,-2),block(0,2)].forEach(b=>place(f,b));const before=snapshot(f);
    expect(api.suggestCreationDuplicate(f.engine).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
  it('rechecks a suggested destination before Apply',()=>{const f=selected([block(0)]),plan=api.suggestCreationDuplicate(f.engine);place(f,block(2));const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,plan).code).toBe('occupied');expect(snapshot(f)).toEqual(before);});
});
