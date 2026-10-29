import {beforeAll,afterAll,afterEach,describe,it,expect,vi} from 'vitest';
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
    const deps={engine,THREE,MAX_BLOCKS:1500,BLOCK_TYPES:[{id:'stone',color:0x998877},{id:'wood',color:0x886644}],BLOCK_SHAPES:[{id:'cube'},{id:'halfB'},{id:'halfA'},{id:'quarter'}],createShapeGeometry:makeShape,upd:(k,v)=>f.updates.push({key:k,value:v}),announceToSR:f.effects.sr,__alloT:(_key,fallback)=>fallback};
    new Function(...Object.keys(deps),history+core.slice(start,end))(...Object.values(deps));fixtures.push(f);return f;
  };
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  if(!document.getElementById('allo-geometryworld-builder-css')){style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
});
afterAll(()=>{window.StemLab=originalLab;window.THREE=originalThree;style?.remove();});
afterEach(()=>{fixtures.forEach(f=>{f.engine.clearBuildBatchPreview?.();Object.values(f.engine.blocks).forEach(mesh=>f.engine._disposeBlockMesh(mesh));});fixtures=[];vi.restoreAllMocks();});

const point=(x,y=1,z=0)=>({x,y,z});
const key=p=>[p.x,p.y,p.z].join(',');
const position=p=>point(p.x,p.y,p.z);
const options=(changes={})=>({mode:'block',origin:point(0),length:3,width:2,height:2,axis:'x',type:'stone',shape:'cube',rotation:0,...changes});
const preview=(f,changes)=>api.previewCoordinateBuild(f.engine,options(changes));
function snapshot(f){return {keys:Object.keys(f.engine.blocks),identities:Object.values(f.engine.blocks),recipes:Object.values(f.engine.blocks).map(mesh=>structuredClone(mesh.userData)),scene:f.engine.scene.children.slice(),undo:structuredClone(f.engine._undoStack),redo:structuredClone(f.engine._redoStack),selection:structuredClone(f.engine._builderSelection),count:f.engine.blocksPlaced,events:structuredClone(f.events),camera:f.engine.camera.position.toArray()};}
function seed(f,p,extra={}){const mesh=f.engine.placeBlock(p.x,p.y,p.z,'stone','cube',0);Object.assign(mesh.userData,extra);f.engine._undoStack=[];f.engine._redoStack=[];f.events.length=0;return mesh;}

describe('keyboard building uses exact grid recipes',()=>{
  it('previews one fractional rotated block from string fields without changing the world',()=>{
    const f=makeFixture(),old=seed(f,point(-8));f.engine._builderSelection={blocks:[point(-8)],exact:true};const before=snapshot(f);
    const plan=preview(f,{origin:{x:'-2',y:' 3 ',z:'4'},type:'wood',shape:'quarter',rotation:'3'});
    expect(plan.ok).toBe(true);expect(plan.additions).toEqual([{x:-2,y:3,z:4,type:'wood',shape:'quarter',rotation:3}]);expect(plan.removals).toEqual([]);
    expect(plan.engine).toBe(f.engine);expect(plan.lesson).toBe(f.engine._currentLesson);expect(plan.afterSelection).toEqual({blocks:[point(-2,3,4)],exact:true});
    expect(snapshot(f)).toEqual(before);expect(f.engine.blocks['-8,1,0']).toBe(old);
  });

  it.each([
    ['line','x',[point(-2,3,4),point(-1,3,4),point(0,3,4)]],
    ['line','y',[point(-2,3,4),point(-2,4,4),point(-2,5,4)]],
    ['line','z',[point(-2,3,4),point(-2,3,5),point(-2,3,6)]],
    ['floor','x',[point(-2,3,4),point(-2,3,5),point(-1,3,4),point(-1,3,5),point(0,3,4),point(0,3,5)]],
    ['wall','x',[point(-2,3,4),point(-2,4,4),point(-1,3,4),point(-1,4,4),point(0,3,4),point(0,4,4)]],
    ['wall','z',[point(-2,3,4),point(-2,3,5),point(-2,3,6),point(-2,4,4),point(-2,4,5),point(-2,4,6)]]
  ])('previews %s along %s with a predictable origin and extent',(mode,axis,expected)=>{
    const f=makeFixture(),before=snapshot(f),plan=preview(f,{mode,axis,origin:point(-2,3,4),length:'3',width:'2',height:'2',type:'wood',shape:'halfA',rotation:'1'});
    expect(plan.ok).toBe(true);expect(plan.additions.map(key).sort()).toEqual(expected.map(key).sort());
    expect(plan.afterSelection).toEqual({blocks:plan.additions.map(position),exact:true});
    expect(plan.additions.every(b=>b.type==='wood'&&b.shape==='halfA'&&b.rotation===1)).toBe(true);expect(snapshot(f)).toEqual(before);
  });

  it.each(['cube','halfB','halfA','quarter'])('commits the actual %s shape and restores selection with one Undo',shape=>{
    const f=makeFixture(),engine=f.engine,old=seed(f,point(-8));engine._builderSelection={blocks:[point(-8)],exact:true};const before=snapshot(f);
    const plan=preview(f,{mode:'wall',axis:'z',origin:point(1,2,3),length:2,height:2,shape,type:'wood',rotation:1});
    expect(api.commitSelectionEdit(engine,plan).ok).toBe(true);expect(engine._undoStack).toHaveLength(1);expect(engine._undoStack[0].action).toBe('batch');
    expect(engine._builderSelection).toEqual(plan.afterSelection);expect(engine.blocksPlaced).toBe(before.count+4);
    for(const b of plan.additions){const mesh=engine.blocks[key(b)];expect(mesh.userData).toMatchObject({shape,blockType:'wood',rotation:1});expect(mesh.rotation.y).toBeCloseTo(shape==='cube'?0:Math.PI/2);expect(mesh.position.y).toBeCloseTo(b.y+(shape==='cube'?.5:shape==='halfB'?.25:0));}
    expect(engine.undo()).toBe(true);expect(Object.keys(engine.blocks)).toEqual(before.keys);expect(engine.blocks['-8,1,0']).toBe(old);expect(engine._builderSelection).toEqual(before.selection);expect(engine.blocksPlaced).toBe(before.count);
    expect(engine.redo()).toBe(true);expect(engine._builderSelection).toEqual(plan.afterSelection);expect(plan.additions.every(b=>engine.blocks[key(b)]?.userData.shape===shape)).toBe(true);
  });

  it('ignores dimensions that do not apply to a single block',()=>{
    const f=makeFixture(),plan=preview(f,{length:'',width:NaN,height:999});expect(plan.ok).toBe(true);expect(plan.additions).toHaveLength(1);
  });

  it('accepts the farthest supported origin when the whole recipe fits',()=>{
    const f=makeFixture();expect(preview(f,{origin:point(64,128,-64)}).ok).toBe(true);
    const plan=preview(f,{mode:'floor',origin:point(-64,1,-64),length:32,width:32});expect(plan.ok).toBe(true);expect(plan.additions).toHaveLength(1024);
  });
});

describe('keyboard building refuses invalid or unsafe operations without mutation',()=>{
  it.each(['', ' ', '1.5', 1.5, NaN, Infinity, null, undefined, true, -65, 65])('links an invalid X origin (%s) to its field',x=>{
    const f=makeFixture(),before=snapshot(f),plan=preview(f,{origin:{x,y:1,z:0}});expect(plan.ok).toBe(false);expect(plan.invalidFields).toContain('origin.x');expect(plan.additions).toBeUndefined();expect(snapshot(f)).toEqual(before);
  });
  it.each([0,129,-1,'1.1'])('rejects unsupported origin height %s',y=>{
    const f=makeFixture(),plan=preview(f,{origin:point(0,y)});expect(plan.ok).toBe(false);expect(plan.invalidFields).toContain('origin.y');
  });
  it.each([
    ['line','length',''],['line','length',0],['line','length',33],['line','length',1.2],
    ['floor','width',''],['floor','width',33],['wall','height',0],['wall','height',33]
  ])('rejects invalid %s %s (%s)',(mode,field,value)=>{
    const f=makeFixture(),before=snapshot(f),plan=preview(f,{mode,[field]:value});expect(plan.ok).toBe(false);expect(plan.invalidFields).toContain(field);expect(snapshot(f)).toEqual(before);
  });
  it.each([
    ['mode',{mode:'sphere'}],['axis',{mode:'line',axis:'diagonal'}],['axis',{mode:'wall',axis:'y'}],
    ['type',{type:'invented'}],['shape',{shape:'invented'}],['rotation',{rotation:4}],['rotation',{rotation:.5}],['rotation',{rotation:''}]
  ])('rejects unsupported recipe field %s', (field,changes)=>{
    const f=makeFixture(),before=snapshot(f),plan=preview(f,changes);expect(plan.ok).toBe(false);expect(plan.invalidFields).toContain(field);expect(snapshot(f)).toEqual(before);
  });
  it.each([
    {mode:'line',axis:'x',origin:point(64),length:2},
    {mode:'line',axis:'y',origin:point(0,128),length:2},
    {mode:'floor',origin:point(0,1,64),width:2},
    {mode:'wall',origin:point(0,127),height:3}
  ])('rejects a recipe crossing the world edge before allocating its cells (%j)',changes=>{
    const f=makeFixture(),validate=vi.spyOn(f.engine,'previewBuildBatch'),before=snapshot(f),plan=preview(f,changes);
    expect(plan.ok).toBe(false);expect(plan.additions).toBeUndefined();expect(validate).not.toHaveBeenCalled();expect(snapshot(f)).toEqual(before);
  });
  it.each(['student','lesson','ground'])('never overwrites an occupied %s block',layer=>{
    const f=makeFixture(),mesh=seed(f,point(1),{_measurementLayer:layer,...(layer==='lesson'?{_lessonBlock:true}:{})});const before=snapshot(f);
    const plan=preview(f,{mode:'line'});expect(plan.ok).toBe(false);expect(plan.code).toBe('occupied');expect(snapshot(f)).toEqual(before);expect(f.engine.blocks['1,1,0']).toBe(mesh);
  });
  it('rechecks a destination occupied after review before committing any cells',()=>{
    const f=makeFixture(),plan=preview(f,{mode:'line'});expect(plan.ok).toBe(true);seed(f,point(2));const before=snapshot(f);
    expect(api.commitSelectionEdit(f.engine,plan)).toMatchObject({ok:false,code:'occupied'});expect(snapshot(f)).toEqual(before);expect(f.engine.blocks['0,1,0']).toBeUndefined();
  });
  it('enforces current capacity again at apply and preserves selection/history',()=>{
    const f=makeFixture(),plan=preview(f,{mode:'floor'});expect(plan.ok).toBe(true);f.engine.getConstructionBlockCount=()=>1498;const before=snapshot(f);
    expect(api.commitSelectionEdit(f.engine,plan)).toMatchObject({ok:false,code:'block_limit'});expect(snapshot(f)).toEqual(before);
    expect(preview(f,{mode:'floor'})).toMatchObject({ok:false,code:'block_limit'});
  });
  it.each(['lesson','showcase','destroyed','pending transition'])('does not commit a reviewed recipe in a changed %s context',change=>{
    const f=makeFixture(),plan=preview(f,{mode:'floor'});if(change==='lesson')f.engine._currentLesson={sandbox:true};else if(change==='showcase')f.engine._showcase={};else if(change==='pending transition')f.engine._pendingWorldTransition={};else f.engine._destroyed=true;const before=snapshot(f);
    expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
  it.each(['lesson','showcase','destroyed','pending transition'])('does not preview while %s makes building unavailable',change=>{
    const f=makeFixture();if(change==='lesson')f.engine._currentLesson={sandbox:false};else if(change==='showcase')f.engine._showcase={};else if(change==='pending transition')f.engine._pendingWorldTransition={};else f.engine._destroyed=true;const before=snapshot(f);
    expect(preview(f,{mode:'floor'}).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
  it('rolls back a partial allocation failure with the prior selection and history intact',()=>{
    const f=makeFixture(),old=seed(f,point(-8));f.engine._builderSelection={blocks:[point(-8)],exact:true};const plan=preview(f,{mode:'line'}),before=snapshot(f),place=f.engine.placeBlock;
    f.engine.placeBlock=function(...args){if(args[0]===1)throw Error('allocation failure');return place.apply(this,args);};
    expect(api.commitSelectionEdit(f.engine,plan)).toMatchObject({ok:false,code:'creation_failed'});expect(snapshot(f)).toEqual(before);expect(f.engine.blocks['-8,1,0']).toBe(old);
  });
});

function selectAsymmetricBuild(f){
  const cells=[point(2,4,-3),point(4,5,0)];cells.forEach(p=>seed(f,p));seed(f,point(60,100,60));
  f.engine._builderSelection={blocks:cells,exact:true};return cells;
}

describe('keyboard continuation positions a recipe beside the retained creation',()=>{
  it.each([
    ['x+',point(5,4,-3)],['x-',point(-1,4,-3)],
    ['y+',point(2,6,-3)],['y-',point(2,3,-3)],
    ['z+',point(2,4,1)],['z-',point(2,4,-5)]
  ])('positions a 3 × 2 floor on the %s face without previewing or changing the world',(face,expected)=>{
    const f=makeFixture();selectAsymmetricBuild(f);const before=snapshot(f),validate=vi.spyOn(f.engine,'previewBuildBatch');
    const result=api.positionCoordinateBuild(f.engine,options({mode:'floor',length:'3',width:'2'}),face);
    expect(result).toMatchObject({ok:true,origin:expected});expect(validate).not.toHaveBeenCalled();expect(snapshot(f)).toEqual(before);
  });
  it('uses the whole wall height below a selection and replaces an unfinished coordinate draft',()=>{
    const f=makeFixture();selectAsymmetricBuild(f);const before=snapshot(f);
    const result=api.positionCoordinateBuild(f.engine,options({mode:'wall',axis:'z',height:'3',length:'2',width:'',origin:{x:'',y:'',z:''}}),'y-');
    expect(result).toMatchObject({ok:true,origin:point(2,1,-3)});expect(snapshot(f)).toEqual(before);
  });
  it.each([
    ['x+',point(64,1,0),{mode:'block'}],['x-',point(-64,1,0),{mode:'line',length:2,axis:'x'}],
    ['y+',point(0,128,0),{mode:'block'}],['y-',point(0,1,0),{mode:'wall',height:2}],
    ['z+',point(0,1,64),{mode:'floor',width:2}],['z-',point(0,1,-64),{mode:'floor',width:2}]
  ])('refuses positioning outside the world at %s without changing the current selection',(face,p,recipe)=>{
    const f=makeFixture();seed(f,p);f.engine._builderSelection={blocks:[p],exact:true};const before=snapshot(f);
    expect(api.positionCoordinateBuild(f.engine,options(recipe),face).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
  it('validates active dimensions and face before changing any draft target',()=>{
    const f=makeFixture();selectAsymmetricBuild(f);const before=snapshot(f);
    expect(api.positionCoordinateBuild(f.engine,options({mode:'wall',height:''}),'y+')).toMatchObject({ok:false,invalidFields:expect.arrayContaining(['height'])});
    expect(api.positionCoordinateBuild(f.engine,options(),'diagonal').ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
  it.each(['none','missing','protected'])('requires live student blocks for a %s selection',kind=>{
    const f=makeFixture();if(kind!=='none'){const p=point(2,4,-3);if(kind==='protected')seed(f,p,{_lessonBlock:true,_measurementLayer:'lesson'});f.engine._builderSelection={blocks:[p],exact:true};}const before=snapshot(f);
    expect(api.positionCoordinateBuild(f.engine,options(),'x+').ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
});

describe('coordinate additions keep the complete creation selected',()=>{
  it('preserves a mixed-shape existing selection while committing and undoing only the additions',()=>{
    const f=makeFixture(),e=f.engine,a=e.placeBlock(-4,2,3,'stone','halfB',1),b=e.placeBlock(-3,2,3,'wood','quarter',2),unselected=e.placeBlock(20,1,0,'wood','cube',0);
    e._undoStack=[];e._redoStack=[];e._builderSelection={blocks:[point(-4,2,3),point(-3,2,3)],exact:true};const before=snapshot(f),oldRecipes=[structuredClone(a.userData),structuredClone(b.userData)];
    const plan=preview(f,{mode:'line',origin:point(5,2,3),length:2,shape:'halfA',rotation:3,selectionMode:'add'});
    expect(plan.ok).toBe(true);expect(plan.sourceSignature).toBeTruthy();expect(plan.afterSelection.exact).toBe(true);expect(plan.afterSelection.blocks.map(key).sort()).toEqual(['-4,2,3','-3,2,3','5,2,3','6,2,3'].sort());expect(snapshot(f)).toEqual(before);
    expect(api.commitSelectionEdit(e,plan).ok).toBe(true);expect(e._undoStack).toHaveLength(1);expect(e._builderSelection).toEqual(plan.afterSelection);expect(e.blocks['-4,2,3']).toBe(a);expect(e.blocks['-3,2,3']).toBe(b);expect([a.userData,b.userData]).toEqual(oldRecipes);expect(e.blocks['20,1,0']).toBe(unselected);
    expect(e.undo()).toBe(true);expect(e._builderSelection).toEqual(before.selection);expect(Object.keys(e.blocks)).toEqual(before.keys);expect(e.blocksPlaced).toBe(before.count);expect(e.redo()).toBe(true);expect(e._builderSelection).toEqual(plan.afterSelection);
  });
  it.each(['selection','material','shape','missing'])('rejects an additive plan when the selected %s changed after review',kind=>{
    const f=makeFixture(),a=seed(f,point(-8)),b=seed(f,point(-7));f.engine._builderSelection={blocks:[point(-8)],exact:true};const plan=preview(f,{selectionMode:'add'});expect(plan.ok).toBe(true);
    if(kind==='selection')f.engine._builderSelection={blocks:[point(-7)],exact:true};else if(kind==='material')a.userData.blockType='wood';else if(kind==='shape')a.userData.shape='halfA';else delete f.engine.blocks['-8,1,0'];
    const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(false);expect(snapshot(f)).toEqual(before);expect(f.engine.blocks['0,1,0']).toBeUndefined();expect(f.engine.blocks['-7,1,0']).toBe(b);
  });
  it('keeps the default new-placement selection independent from an earlier creation',()=>{
    const f=makeFixture();seed(f,point(-8));f.engine._builderSelection={blocks:[point(-8)],exact:true};
    expect(preview(f).afterSelection).toEqual({blocks:[point(0)],exact:true});expect(preview(f,{selectionMode:'new'}).afterSelection).toEqual({blocks:[point(0)],exact:true});
  });
  it('links unsupported selection modes and rejects adding without a retained creation',()=>{
    const f=makeFixture(),before=snapshot(f);expect(preview(f,{selectionMode:'all'})).toMatchObject({ok:false,invalidFields:expect.arrayContaining(['selectionMode'])});expect(preview(f,{selectionMode:'add'}).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
});
