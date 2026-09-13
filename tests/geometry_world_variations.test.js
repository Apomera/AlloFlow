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


describe('design variations',()=>{
  it('copies current unsaved geometry while preserving the earlier saved draft and edit history',()=>{
    const f=selected(),e=f.engine,store=memoryStorage(),first=api.saveWorldDraft(e,'My pavilion',store).project;
    place(f,block(12));const before=snapshot(f),result=api.saveWorldCopy(e,'My pavilion',store);
    expect(result.ok).toBe(true);expect(snapshot(f)).toEqual(before);
    const projects=api.readWorldShelf(store).projects;expect(projects).toHaveLength(2);expect(projects.find(p=>p.id===first.id)).toEqual(first);
    expect(result.project.world.blocks).toHaveLength(3);expect(result.project.world.title).toBe('My pavilion · variation 2');
    expect(e._workshopProjectId).toBe(result.project.id);expect(api.saveWorldDraft(e,null,store).unchanged).toBe(true);
    place(f,block(13));api.saveWorldDraft(e,null,store);expect(api.readWorldShelf(store).projects.find(p=>p.id===first.id)).toEqual(first);
  });
  it('duplicates a saved project without changing the active project, and assigns bounded unique names',()=>{
    const f=selected(),e=f.engine,store=memoryStorage(),first=api.saveWorldDraft(e,'A'.repeat(80),store).project;
    const a=api.duplicateWorldProject(first.id,store),b=api.duplicateWorldProject(a.project.id,store);
    expect(a.ok&&b.ok).toBe(true);expect(a.project.world.title.length).toBeLessThanOrEqual(80);expect(b.project.world.title).toMatch(/variation 3$/);
    expect(e._workshopProjectId).toBe(first.id);expect(a.project.world.blocks).toEqual(first.world.blocks);expect(api.readWorldShelf(store).projects.find(p=>p.id===first.id)).toEqual(first);
  });
  it('keeps identity and previous storage intact on quota failures, corrupt storage, and a full shelf',()=>{
    const f=selected(),e=f.engine,store=memoryStorage();api.saveWorldDraft(e,'First',store);const id=e._workshopProjectId,version=e._workshopProjectVersion,raw=store.raw();
    expect(api.saveWorldCopy(e,null,{getItem:store.getItem,setItem(){throw Error('quota');}}).ok).toBe(false);expect(store.raw()).toBe(raw);expect(e._workshopProjectId).toBe(id);expect(e._workshopProjectVersion).toBe(version);
    const invalid=memoryStorage('{broken');expect(api.saveWorldCopy(e,null,invalid).ok).toBe(false);expect(invalid.raw()).toBe('{broken');
    for(let i=0;i<7;i++)expect(api.duplicateWorldProject(id,store).ok).toBe(true);const full=store.raw();expect(api.saveWorldCopy(e,null,store).ok).toBe(false);expect(api.duplicateWorldProject(id,store).ok).toBe(false);expect(store.raw()).toBe(full);expect(e._workshopProjectId).toBe(id);
  });
  it('allows a stale tab to preserve its edits as a variation without overwriting the newer saved project',()=>{
    const a=selected(),b=selected(),store=memoryStorage(),first=api.saveWorldDraft(a.engine,'Original',store).project;b.engine._workshopProjectId=first.id;b.engine._workshopProjectVersion=first.version;
    place(a,block(11));const newer=api.saveWorldDraft(a.engine,null,store).project;place(b,block(14));const copy=api.saveWorldCopy(b.engine,null,store);
    expect(copy.ok).toBe(true);expect(api.readWorldShelf(store).projects.find(p=>p.id===first.id)).toEqual(newer);expect(copy.project.world.blocks.some(b=>b.x===14)).toBe(true);expect(copy.project.world.blocks.some(b=>b.x===11)).toBe(false);
  });
  it('refuses empty copies, missing sources, and non-sandbox worlds',()=>{const f=makeFixture(),store=memoryStorage();expect(api.saveWorldCopy(f.engine,null,store).ok).toBe(false);expect(api.duplicateWorldProject('missing',store).ok).toBe(false);f.engine._currentLesson={sandbox:false};expect(api.saveWorldCopy(f.engine,null,store).ok).toBe(false);expect(store.raw()).toBeUndefined();});
});
describe('custom connecting bases',()=>{
  it('creates the requested footprint and thickness while preserving shape, appearance and relative height, with atomic undo/redo',()=>{
    const f=selected([block(0,4,0,'stone','halfA',2),block(3,7,0,'wood','quarter',1)]),e=f.engine,before=api.selectionEditSnapshot(e),plan=api.previewPrintPreparation(e,'base',{padding:2,thickness:3,material:'wood'});
    expect(plan.ok).toBe(true);expect(api.selectionEditSnapshot(e)).toEqual(before);for(let y=1;y<=3;y++)expect(plan.additions.filter(b=>b.y===y&&b.shape==='cube'&&b.type==='wood')).toHaveLength(40);
    expect(plan.additions.find(b=>b.shape==='halfA')).toMatchObject({x:0,y:4,z:0,type:'stone',rotation:2});expect(plan.additions.find(b=>b.shape==='quarter').y).toBe(7);
    expect(api.commitSelectionEdit(e,plan).ok).toBe(true);expect(e._undoStack).toHaveLength(1);e.undo();expect(api.selectionEditSnapshot(e)).toEqual(before);e.redo();expect(e._builderSelection.blocks).toHaveLength(plan.additions.length);
  });
  it('accepts a flush base and rejects incomplete, fractional, out-of-range or unsupported settings without mutation',()=>{
    const f=selected([block(0)]),before=snapshot(f);expect(api.previewPrintPreparation(f.engine,'base',{padding:0,thickness:1}).additions).toHaveLength(2);
    for(const options of [{padding:''},{padding:-1},{padding:1.5},{padding:5},{thickness:0},{thickness:''},{thickness:5},{material:'glass'}])expect(api.previewPrintPreparation(f.engine,'base',options).ok).toBe(false);
    expect(snapshot(f)).toEqual(before);
  });
  it('rechecks collisions and capacity for a custom base',()=>{
    const f=selected([block(0)]),plan=api.previewPrintPreparation(f.engine,'base',{padding:2,thickness:3});place(f,block(2,2,2));const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(false);expect(snapshot(f)).toEqual(before);
    const wide=selected([block(0),block(20,1,20)]);expect(api.previewPrintPreparation(wide.engine,'base',{padding:4,thickness:4}).ok).toBe(false);
  });
});
