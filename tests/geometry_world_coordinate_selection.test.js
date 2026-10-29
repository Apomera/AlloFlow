import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

let api,style;
const originalLab=window.StemLab;
beforeAll(()=>{
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  if(!document.getElementById('allo-geometryworld-builder-css')){style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  api=window.StemLab.geometryWorldBuilderPure;
});
afterAll(()=>{window.StemLab=originalLab;style?.remove();});

const key=p=>[p.x,p.y,p.z].join(',');
const point=(x,y=1,z=0)=>({x,y,z});
function add(engine,p,extra={}){
  engine.blocks[key(p)]={visible:extra.visible!==false,userData:{gridPos:{...p},shape:'cube',rotation:0,blockType:'stone',volume:1,_measurementLayer:'student',...extra}};
}
function fixture(){
  const engine={blocks:{},_currentLesson:{sandbox:true},_undoStack:[{action:'place',x:0,y:1,z:0}],_redoStack:[],blocksPlaced:4};
  add(engine,point(-2));add(engine,point(0),{blockType:'wood',shape:'halfB',volume:.5});add(engine,point(1,2,1),{visible:false});add(engine,point(3));
  add(engine,point(0,0),{_measurementLayer:'ground'});add(engine,point(2),{_lessonBlock:true});add(engine,point(4),{_measurementLayer:'lesson'});
  engine._builderSelection={blocks:[point(3)],exact:true};
  return engine;
}
const options=(overrides={})=>({from:point(-2),to:point(1,2,1),operation:'replace',material:'all',...overrides});
const snapshot=e=>JSON.stringify({blocks:e.blocks,selection:e._builderSelection,undo:e._undoStack,redo:e._redoStack,placed:e.blocksPlaced});
const preview=(engine,overrides)=>api.previewCoordinateSelection(engine,options(overrides));

describe('coordinate selection preview',()=>{
  it('normalizes inclusive reversed string corners, includes hidden blocks, and does not mutate the world',()=>{
    const engine=fixture(),before=snapshot(engine),selection=engine._builderSelection;
    const plan=preview(engine,{from:{x:'1',y:' 2 ',z:'1'},to:{x:'-2',y:'1',z:'0'}});
    expect(plan).toMatchObject({ok:true,count:3,resultingCount:3,operation:'replace',material:'all',bounds:{min:point(-2),max:point(1,2,1)}});
    expect(plan.cells).toEqual([point(-2),point(0),point(1,2,1)]);expect(plan.engine).toBe(engine);expect(plan.lesson).toBe(engine._currentLesson);
    expect(engine._builderSelection).toBe(selection);expect(snapshot(engine)).toBe(before);
  });
  it('filters by real material without including protected lesson cells or grid neighbors',()=>{
    const engine=fixture(),plan=preview(engine,{material:'wood'});
    expect(plan).toMatchObject({ok:true,count:1,resultingCount:1,cells:[point(0)]});
    expect(api.commitCoordinateSelection(engine,plan)).toEqual({ok:true,count:1});
    expect(engine._builderSelection).toEqual({blocks:[point(0)],exact:true});
  });
  it.each(['', ' ', '1.5', 1.5, NaN, Infinity, -Infinity, null, undefined, true, false, Number.MAX_SAFE_INTEGER+1, 65, -65])('rejects invalid X coordinates (%s) without replacing a selection',value=>{
    const engine=fixture(),before=snapshot(engine),result=preview(engine,{from:{x:value,y:1,z:0}});
    expect(result.ok).toBe(false);expect(result.invalidFields).toContain('from.x');expect(snapshot(engine)).toBe(before);
  });
  it.each([0,-1,129,'1.2'])('validates height (%s) and reports the specific input',value=>{
    const engine=fixture(),result=preview(engine,{to:{x:1,y:value,z:1}});
    expect(result.ok).toBe(false);expect(result.invalidFields).toContain('to.y');
  });
  it('reports every invalid field and validates filter/action choices',()=>{
    const engine=fixture(),result=api.previewCoordinateSelection(engine,{from:{x:'bad',y:0,z:-65},to:{x:65,y:129,z:Infinity},operation:'erase',material:'mystery'});
    expect(result.invalidFields).toEqual(['from.x','from.y','from.z','to.x','to.y','to.z','operation','material']);
  });
  it('keeps the original selection when the range or material matches nothing',()=>{
    const engine=fixture(),selection=engine._builderSelection;
    for(const changes of [{from:point(5),to:point(8)},{material:'glass'},{from:point(2),to:point(2)}]){
      expect(preview(engine,changes)).toMatchObject({ok:false,invalidFields:[]});expect(engine._builderSelection).toBe(selection);
    }
  });
  it('accepts supported boundary cells but omits malformed or out-of-bounds metadata',()=>{
    const engine=fixture();add(engine,point(-64,128,64));add(engine,point(65));add(engine,point(2.5));add(engine,point(2,1.5));
    expect(preview(engine,{from:point(-64),to:point(64,128,64)}).cells).toContainEqual(point(-64,128,64));
    expect(api.coordinateSelectionBounds(engine,false)).toEqual({from:point(-64),to:point(3,128,64)});
  });
});

describe('committing coordinate selections',()=>{
  it('supports exact add and remove with deduplication and allows removing the final selected block',()=>{
    const engine=fixture(),geometry=JSON.stringify(engine.blocks),history=engine._undoStack;
    const added=preview(engine,{operation:'add'});expect(added.resultingCount).toBe(4);
    expect(api.commitCoordinateSelection(engine,added).count).toBe(4);
    expect(preview(engine,{operation:'add'}).resultingCount).toBe(4);
    const removed=preview(engine,{operation:'remove'});expect(removed.resultingCount).toBe(1);expect(api.commitCoordinateSelection(engine,removed).count).toBe(1);
    const last=preview(engine,{from:point(3),to:point(3),operation:'remove'});expect(last.resultingCount).toBe(0);expect(api.commitCoordinateSelection(engine,last)).toEqual({ok:true,count:0});
    expect(engine._builderSelection).toBeNull();expect(JSON.stringify(engine.blocks)).toBe(geometry);expect(engine._undoStack).toBe(history);expect(engine.blocksPlaced).toBe(4);
  });
  it.each(['add','delete','shape','material','rotation','position','volume','protect','selection','exact','lesson','showcase','transition','destroyed'])('rejects a stale %s without further changes',change=>{
    const engine=fixture(),plan=preview(engine);
    if(change==='add')add(engine,point(9));
    if(change==='delete')delete engine.blocks['0,1,0'];
    if(change==='shape')engine.blocks['0,1,0'].userData.shape='quarter';
    if(change==='material')engine.blocks['0,1,0'].userData.blockType='gold';
    if(change==='rotation')engine.blocks['0,1,0'].userData.rotation=2;
    if(change==='position')engine.blocks['0,1,0'].userData.gridPos.x=1;
    if(change==='volume')engine.blocks['0,1,0'].userData.volume=.25;
    if(change==='protect')engine.blocks['0,1,0'].userData._lessonBlock=true;
    if(change==='selection')engine._builderSelection.blocks=[point(-2)];
    if(change==='exact')engine._builderSelection.exact=false;
    if(change==='lesson')engine._currentLesson={sandbox:true};
    if(change==='showcase')engine._showcase={};
    if(change==='transition')engine._pendingWorldTransition={};
    if(change==='destroyed')engine._destroyed=true;
    const before=snapshot(engine);expect(api.commitCoordinateSelection(engine,plan).ok).toBe(false);expect(snapshot(engine)).toBe(before);
  });
  it('rejects a preview from a different engine and modified preview cells',()=>{
    const engine=fixture(),other=fixture(),plan=preview(engine),before=snapshot(other);
    expect(api.commitCoordinateSelection(other,plan).ok).toBe(false);expect(snapshot(other)).toBe(before);
    plan.cells.push(point(3));const unchanged=snapshot(engine);expect(api.commitCoordinateSelection(engine,plan).ok).toBe(false);expect(snapshot(engine)).toBe(unchanged);
  });
  it('limits the resulting selection, allowing an oversized prior selection to be reduced',()=>{
    const engine={blocks:{},_currentLesson:{sandbox:true},_builderSelection:{blocks:[],exact:true}};
    for(let index=0;index<1501;index++){const p=point(index%64,Math.floor(index/64)+1);add(engine,p);engine._builderSelection.blocks.push(p);}
    expect(preview(engine,{from:point(0),to:point(63,24)}).ok).toBe(false);
    const remove=preview(engine,{from:point(0),to:point(63),operation:'remove'});expect(remove.resultingCount).toBe(1437);expect(api.commitCoordinateSelection(engine,remove).count).toBe(1437);
    const addAgain=preview(engine,{from:point(0),to:point(62),operation:'add'});expect(addAgain.resultingCount).toBe(1500);expect(api.commitCoordinateSelection(engine,addAgain).count).toBe(1500);
    expect(preview(engine,{from:point(63),to:point(63),operation:'add'}).ok).toBe(false);
  });
});

describe('coordinate selection bounds',()=>{
  it('fits only valid student cells and can restrict bounds to the retained selection',()=>{
    const engine=fixture(),before=snapshot(engine);
    expect(api.coordinateSelectionBounds(engine,false)).toEqual({from:point(-2),to:point(3,2,1)});
    expect(api.coordinateSelectionBounds(engine,true)).toEqual({from:point(3),to:point(3)});
    engine._builderSelection.blocks=[point(2),point(0,0)];expect(api.coordinateSelectionBounds(engine,true)).toBeNull();
    engine._builderSelection={blocks:[point(3)],exact:true};expect(snapshot(engine)).toBe(before);
  });
  it('returns no bounds for an absent or empty world/selection',()=>{
    expect(api.coordinateSelectionBounds(null,false)).toBeNull();expect(api.coordinateSelectionBounds({blocks:{}},false)).toBeNull();
    const engine=fixture();engine._builderSelection=null;expect(api.coordinateSelectionBounds(engine,true)).toBeNull();
  });
  it.each([null,{blocks:{},_currentLesson:{sandbox:false}},{blocks:{},_currentLesson:{sandbox:true},_pendingWorldTransition:{}}])('refuses unavailable editing contexts',engine=>{
    expect(preview(engine).ok).toBe(false);
  });
});
