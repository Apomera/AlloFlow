import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {makeSelectionEngine}=require('./helpers/geometry_world_selection_poll_fixture.cjs');
let api;
beforeEach(()=>{
  window.StemLab={_registry:{geometryWorld:{render(){}}}};
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{delete window.__geoWorldEngine;delete window.__alloPrintLabPendingHandoff;delete window.__alloGeometryWorldReturnProject;});
const point=x=>({x,y:1,z:0});
const poll=(fixture,cache)=>api.polledSelectionMeasurement(fixture.engine,cache);

describe('selection polling semantic cache with the actual core measurement traversal',()=>{
  it('skips all 40 idle polls after one traversal of a 160-block creation',()=>{
    const positions=[];
    for(let x=0;x<10;x++)for(let y=1;y<=4;y++)for(let z=0;z<4;z++)positions.push({x,y,z});
    const fixture=makeSelectionEngine(positions),cache={current:null},first=poll(fixture,cache);
    expect(first.measurement.count).toBe(160);
    for(let i=0;i<40;i++)expect(poll(fixture,cache)).toBe(first);
    expect(fixture.stats).toEqual({measurements:1,candidateVisits:160,acceptedBlockVisits:160});
  });

  it('discovers a new connected bridge and previously unselected world cells only once',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null};
    f.addBlock(point(2));f.addBlock(point(3));
    expect(poll(f,cache).measurement.count).toBe(1);
    f.addBlock(point(1));
    expect(poll(f,cache).measurement.count).toBe(4);
    expect(f.engine._builderSelection.blocks).toHaveLength(4);
    for(let i=0;i<8;i++)poll(f,cache);
    expect(f.stats.measurements).toBe(2);
  });

  it('preserves disjoint retained pieces when a connecting cell is removed',()=>{
    const f=makeSelectionEngine([0,1,2,9].map(point)),cache={current:null};
    poll(f,cache);delete f.engine.blocks['1,1,0'];
    const selected=poll(f,cache);
    expect(selected.measurement.blocks.map(p=>p.x).sort((a,b)=>a-b)).toEqual([0,2,9]);
    expect(selected.measurement.totalVolume).toBe(3);
    poll(f,cache);expect(f.stats.measurements).toBe(2);
    expect(f.engine._undoStack).toEqual([]);expect(f.engine._redoStack).toEqual([]);
  });

  it.each([
    ['shape','quarter'],['rotation',3],['blockType','wood'],['volume',0.25],
    ['_measurementLayer','lesson'],['_lessonBlock',true],
  ])('invalidates an in-place %s metadata edit without dirty flags or history revisions',(field,value)=>{
    const f=makeSelectionEngine([point(0),point(1)]),cache={current:null};
    poll(f,cache);f.engine._blocksDirty=false;f.engine._historyRevision=0;
    f.engine.blocks['1,1,0'].userData[field]=value;
    const selected=poll(f,cache);
    expect(f.stats.measurements).toBe(2);
    if(field==='volume')expect(selected.measurement.totalVolume).toBe(1.25);
    if(field==='shape')expect(selected.measurement.shapeCounts).toEqual({cube:1,quarter:1});
    if(field==='blockType')expect(selected.measurement.materialCounts).toEqual({stone:1,wood:1});
    if(field==='_measurementLayer')expect(selected.measurement.count).toBe(1);
    poll(f,cache);expect(f.stats.measurements).toBe(2);
  });

  it('detects occupancy replacement and lesson-to-student conversion outside selection',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null};
    f.addBlock(point(1),{_measurementLayer:'lesson',_lessonBlock:true});
    expect(poll(f,cache).measurement.count).toBe(1);
    Object.assign(f.engine.blocks['1,1,0'].userData,{_measurementLayer:'student',_lessonBlock:false});
    expect(poll(f,cache).measurement.count).toBe(2);
    f.engine.blocks['2,1,0']=f.engine.blocks['1,1,0'];delete f.engine.blocks['1,1,0'];
    f.engine.blocks['2,1,0'].userData.gridPos=point(2);
    expect(poll(f,cache).measurement.blocks.map(p=>p.x)).toEqual([0]);
    expect(f.stats.measurements).toBe(3);
  });

  it('tracks retained cell changes, replacement engines and replacement measurement implementations',()=>{
    const f=makeSelectionEngine([point(0)]),other=makeSelectionEngine([point(0)]),cache={current:null};
    f.addBlock(point(8));poll(f,cache);
    f.engine._builderSelection={blocks:[point(8)]};
    expect(poll(f,cache).measurement.blocks).toEqual([point(8)]);
    expect(poll(other,cache).engine).toBe(other.engine);
    expect(other.stats.measurements).toBe(1);
    const original=other.engine.measureStructure;
    other.engine.measureStructure=(...args)=>original(...args);
    poll(other,cache);expect(other.stats.measurements).toBe(2);
  });

  it('ignores semantic-equivalent dictionary reorder and render-only state changes',()=>{
    const f=makeSelectionEngine([point(0),point(1)]),cache={current:null},first=poll(f,cache);
    f.engine.blocks=Object.fromEntries(Object.entries(f.engine.blocks).reverse());
    f.engine._builderSelection={blocks:f.engine._builderSelection.blocks.slice().reverse()};
    f.engine._showcase={};f.engine._creationFocus={};f.engine._blocksDirty=true;f.engine._historyRevision=99;
    f.engine.blocks['0,1,0'].material={opacity:0.4};f.engine.blocks['0,1,0'].scale={x:0.7,y:0.7,z:0.7};
    expect(poll(f,cache)).toBe(first);expect(f.stats.measurements).toBe(1);
  });

  it('clears cached results after selection removal and after its final cell disappears',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null};
    poll(f,cache);f.engine._builderSelection=null;
    expect(poll(f,cache)).toBeNull();expect(cache.current).toBeNull();
    f.engine._builderSelection={blocks:[point(0)]};poll(f,cache);
    delete f.engine.blocks['0,1,0'];expect(poll(f,cache)).toBeNull();
    expect(f.engine._builderSelection).toBeNull();expect(poll(f,cache)).toBeNull();
    expect(f.stats.measurements).toBe(2);
  });

  it('does not rewalk for unrelated remote additions, edits or removals',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null},first=poll(f,cache);
    f.addBlock(point(40));expect(poll(f,cache)).toBe(first);
    Object.assign(f.engine.blocks['40,1,0'].userData,{shape:'quarter',rotation:2,volume:0.25,blockType:'wood',_measurementLayer:'lesson',_lessonBlock:true});
    expect(poll(f,cache)).toBe(first);
    delete f.engine.blocks['40,1,0'];expect(poll(f,cache)).toBe(first);
    expect(f.stats.measurements).toBe(1);
  });

  it('watches the frontier of every disconnected retained part',()=>{
    const f=makeSelectionEngine([point(0),point(10)]),cache={current:null};
    poll(f,cache);f.addBlock(point(11));
    expect(poll(f,cache).measurement.blocks.map(p=>p.x).sort((a,b)=>a-b)).toEqual([0,10,11]);
    f.addBlock(point(-1));expect(poll(f,cache).measurement.count).toBe(4);
    poll(f,cache);expect(f.stats.measurements).toBe(3);
  });

  it('retries a real incomplete measurement instead of caching a truncated frontier',()=>{
    const f=makeSelectionEngine(Array.from({length:1501},(_,i)=>point(i))),cache={current:null};
    expect(poll(f,cache)).toBeNull();expect(cache.current).toBeNull();
    expect(poll(f,cache)).toBeNull();expect(cache.current).toBeNull();
    expect(f.stats.measurements).toBe(2);
    delete f.engine.blocks['1500,1,0'];
    expect(poll(f,cache).measurement.count).toBe(1500);
    poll(f,cache);expect(f.stats.measurements).toBe(3);
  });

  it('retries a transient null measurement with otherwise identical occupancy',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null},measure=f.engine.measureStructure;
    let ready=false;
    f.engine.measureStructure=(...args)=>ready?measure(...args):null;
    expect(poll(f,cache)).toBeNull();expect(cache.current).toBeNull();
    ready=true;expect(poll(f,cache).measurement.count).toBe(1);
    poll(f,cache);expect(f.stats.measurements).toBe(1);
  });

  it('keeps deliberate selection validation fresh after a warm polling cache',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null};
    poll(f,cache);api.selectionMeasurement(f.engine);api.selectionMeasurement(f.engine);
    expect(f.stats.measurements).toBe(3);
    f.addBlock(point(1));
    expect(api.selectionMeasurement(f.engine).measurement.count).toBe(2);
    expect(f.stats.measurements).toBe(4);
  });
});
