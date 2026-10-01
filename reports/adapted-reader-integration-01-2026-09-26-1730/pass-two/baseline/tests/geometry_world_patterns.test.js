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
    const deps={engine,THREE,getBlockMaterial:type=>new THREE.MeshStandardMaterial({color:type==='wood'?0x886644:0x998877}),MAX_BLOCKS:1500,BLOCK_TYPES:[{id:'stone',color:0x998877},{id:'wood',color:0x886644},{id:'grass',color:0x669955}],BLOCK_SHAPES:[{id:'cube'},{id:'halfB'},{id:'halfA'},{id:'quarter'}],createShapeGeometry:makeShape,upd:(k,v)=>f.updates.push({key:k,value:v}),announceToSR:f.effects.sr};
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


describe('atomic repeated creations',()=>{
 it.each(['x','y','z'])('spaces mixed shapes along %s and preserves every recipe',axis=>{
  const input=[block(1,3,2,'stone','halfA',3),block(3,5,4,'wood','quarter',1)],f=selected(input),before=snapshot(f),plan=api.previewSelectionEdit(f.engine,'repeat',{axis,direction:1,total:4,gap:2});
  expect(plan.ok).toBe(true);expect(snapshot(f)).toEqual(before);expect(plan.removals).toEqual([]);expect(plan.additions).toHaveLength(6);expect(plan.afterSelection.blocks).toHaveLength(8);expect(plan.afterSelection.exact).toBe(true);
  for(let copy=1;copy<=3;copy++)for(let i=0;i<input.length;i++)expect(plan.additions[(copy-1)*2+i]).toEqual({...input[i],[axis]:input[i][axis]+copy*5});
  expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);expect(f.engine._undoStack).toHaveLength(1);f.engine.undo();expect(api.selectionEditSnapshot(f.engine).blocks).toEqual(input);f.engine.redo();expect(f.engine._builderSelection.blocks).toHaveLength(8);
 });
 it('keeps zero-gap touching copies and the original selected as a single pattern',()=>{
  const f=selected([block(0)]),plan=api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:-1,total:3,gap:0});expect(plan.ok).toBe(true);expect(plan.additions.map(b=>b.x)).toEqual([-1,-2]);expect(plan.afterSelection.blocks).toHaveLength(3);expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);
 });
 it.each([{total:1},{total:13},{total:2.5},{total:NaN},{gap:-1},{gap:9},{gap:1.5},{axis:'q'},{direction:0}])('refuses malformed options %j without changing the world',bad=>{const f=selected([block(0)]),before=snapshot(f);expect(api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:4,gap:1,...bad}).ok).toBe(false);expect(snapshot(f)).toEqual(before);});
 it('refuses an occupied copy, an out-of-world pattern, and an oversized allocation',()=>{
  const f=selected([block(0)]);place(f,block(4));const before=snapshot(f);expect(api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:4,gap:1}).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  expect(api.previewSelectionEdit(selected([block(63)]).engine,'repeat',{axis:'x',direction:1,total:3,gap:0}).ok).toBe(false);
  expect(api.transformCreationBlocks(Array.from({length:751},(_,i)=>block(i)),'repeat',{axis:'x',direction:1,total:2,gap:0}).reason).toContain('1500');
 });
 it('revalidates the source and destination after preview',()=>{
  const f=selected([block(0)]),plan=api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:3,gap:1});place(f,block(2));const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  const g=selected([block(0)]),next=api.previewSelectionEdit(g.engine,'repeat',{axis:'x',direction:1,total:3,gap:1});g.engine.blocks['0,1,0'].userData.rotation=2;expect(api.commitSelectionEdit(g.engine,next).ok).toBe(false);
 });
});
describe('align the grid footprint without deforming the build',()=>{
 it.each([['x','start',10,[10,12]],['x','end',10,[7,9]],['y','start',1,[1,3]],['y','end',8,[5,7]],['z','start',-5,[-5,-3]],['z','end',0,[-3,-1]]])('aligns %s %s to grid line %s',(axis,edge,coordinate,expected)=>{
  const f=selected([block(1,3,2,'stone','halfA',3),block(3,5,4,'wood','quarter',1)]),before=api.selectionEditSnapshot(f.engine),plan=api.previewSelectionEdit(f.engine,'align',{axis,edge,coordinate});expect(plan.ok).toBe(true);expect(plan.additions.map(b=>b[axis])).toEqual(expected);expect(plan.additions.map(b=>[b.type,b.shape,b.rotation])).toEqual(before.blocks.map(b=>[b.type,b.shape,b.rotation]));expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);f.engine.undo();expect(api.selectionEditSnapshot(f.engine)).toEqual(before);
 });
 it('reports already aligned, noninteger lines, and blocked moves',()=>{
  const f=selected([block(0)]);expect(api.previewSelectionEdit(f.engine,'align',{axis:'x',edge:'start',coordinate:0}).reason).toContain('already aligned');expect(api.previewSelectionEdit(f.engine,'align',{axis:'x',edge:'start',coordinate:.5}).ok).toBe(false);place(f,block(4));expect(api.previewSelectionEdit(f.engine,'align',{axis:'x',edge:'start',coordinate:4}).ok).toBe(false);
 });
});
describe('material preview ownership and geometry fidelity',()=>{
 it('keeps drawing wireframes lightweight, builds surfaces only on review, and reuses them',()=>{
  const f=selected([block(-10)]),e=f.engine,plan={ok:true,additions:[block(0,1,0,'stone','halfB'),block(1,1,0,'wood','halfA',1)]},before=api.editableWorld(e);e.showBuildBatchPreview(plan,'test');expect(e._buildBatchPreview.group.children).toHaveLength(1);expect(e.setBuildPreviewSurface(true,'other')).toBe(false);expect(e.setBuildPreviewSurface(true,'test')).toBe(true);const state=e._buildBatchPreview,surfaces=state.surfaces;
  expect(surfaces.children).toHaveLength(2);expect(surfaces.children.every(m=>m.material.transparent&&m.userData.gwDecorative)).toBe(true);
  for(let i=0;i<2;i++){const b=plan.additions[i],geo=surfaces.children[i].geometry,p=geo.attributes.position,actual=[];for(let j=0;j<p.count;j++)actual.push(new THREE.Vector3().fromBufferAttribute(p,j));expect(pointSet(actual)).toEqual(pointSet(worldVertices(b)));expect(geo.attributes.normal.count).toBe(p.count);expect(geo.attributes.uv.count).toBe(p.count);}
  expect(api.editableWorld(e)).toEqual(before);expect(e._undoStack).toHaveLength(0);e.setBuildPreviewSurface(false,'test');expect(surfaces.visible).toBe(false);e.setBuildPreviewSurface(true,'test');expect(state.surfaces).toBe(surfaces);
 });
 it('disposes all preview geometry and material once and does not dispose another owner',()=>{
  const e=makeFixture().engine;e.showBuildBatchPreview({ok:true,additions:[block(0),block(2,1,0,'wood')]},'test');e.setBuildPreviewSurface(true,'test');const spies=[];e._buildBatchPreview.group.traverse(p=>{if(p.geometry)spies.push(vi.spyOn(p.geometry,'dispose'));if(p.material)spies.push(vi.spyOn(p.material,'dispose'));});e.clearBuildBatchPreview('other');expect(spies.every(s=>s.mock.calls.length===0)).toBe(true);e.clearBuildBatchPreview('test');expect(spies.every(s=>s.mock.calls.length===1)).toBe(true);
 });
 it('rebuilds the material when only the recipe color changes and keeps blocked previews as wireframes',()=>{
  const e=makeFixture().engine;e.showBuildBatchPreview({ok:true,additions:[block(0)]},'test');e.setBuildPreviewSurface(true,'test');const first=e._buildBatchPreview;e.showBuildBatchPreview({ok:true,additions:[block(0,1,0,'wood')]},'test');expect(e._buildBatchPreview).not.toBe(first);e.setBuildPreviewSurface(true,'test');expect(e._buildBatchPreview.surfaces.children[0].name).toBe('gw-preview-wood');e.showBuildBatchPreview({ok:false,additions:[block(0)]},'test');expect(e.setBuildPreviewSurface(true,'test')).toBe(false);expect(e._buildBatchPreview.group.children).toHaveLength(1);
 });
});

describe('repeat preview composition',()=>{
 it('frames the original and every copy while counting only new blocks',()=>{const f=selected([block(0),block(2)]),plan=api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:3,gap:1}),facts=api.previewChangeFacts(plan);expect(facts.count).toBe(4);expect(facts.net).toBe(4);expect(facts.min.x).toBe(0);expect(facts.max.x).toBe(11);expect(facts.width).toBe(11);});
});
