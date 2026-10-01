import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const R=(value=100,id=1)=>({type:'resistor',value,id});
let solve,probe;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');solve=window.StemLab.solveCircuit;probe=window.StemLab.circuitProbeReading;});
describe('ideal differential voltage probes',()=>{
  it('recovers voltage-divider node potentials and signed differences',()=>{
    const s=solve({voltage:12,components:[R(200),R(100,2)]});
    expect(probe(s).nodes.map(n=>n.voltage)).toEqual([12,4,0]);
    expect(probe(s,0,1).voltage).toBe(8);expect(probe(s,1,2).voltage).toBe(4);
    expect(probe(s,2,1).voltage).toBe(-4);expect(probe(s,1,1).voltage).toBe(0);
  });
  it('agrees with each known component drop, including an LED and tiny switch drop',()=>{
    const s=solve({voltage:9,components:[R(470),{type:'led',id:2},{type:'switch',closed:true,id:3}]});
    s.rows.forEach((r,i)=>expect(probe(s,i,i+1).voltage).toBeCloseTo(r.voltage,12));
    const root=document.createElement('div');root.innerHTML=renderTool('circuit',{_circuit:{benchView:'3d',sceneProbes:true,probeRed:3,probeBlack:2,components:s.components}});
    expect(root.querySelector('.circuit-probe-display strong').textContent).toMatch(/^-.*µV$/);
  });
  it('leaves unknown internal nodes unknown while retaining both known ends',()=>{
    const s=solve({voltage:9,components:[R(),{type:'capacitor',id:2},{type:'switch',closed:false,id:3},R(100,4)]});
    expect(probe(s).nodes.map(n=>n.voltage)).toEqual([9,9,null,0,0]);
    expect(probe(s,1,3).voltage).toBe(9);expect(probe(s,1,2).voltage).toBeNull();
    expect(probe(s,2,3).voltage).toBeNull();
    // A point measured against itself is zero, even if its absolute potential is unknown.
    expect(probe(s,2,2).voltage).toBe(0);
  });
  it('resolves the voltage across a single open switch',()=>{
    const s=solve({voltage:9,components:[R(),{type:'switch',closed:false,id:2},R(100,3)]});
    expect(probe(s).nodes.map(n=>n.voltage)).toEqual([9,9,0,0]);
    expect(probe(s,1,2).voltage).toBe(9);
  });
  it('uses the same two rail potentials for every parallel branch',()=>{
    const s=solve({mode:'parallel',voltage:9,components:[R(),{type:'switch',closed:false,id:2}]});
    expect(probe(s).nodes.map(n=>n.voltage)).toEqual([9,0]);
    expect(probe(s,0,1).voltage).toBe(9);expect(probe(s,1,0).voltage).toBe(-9);
    expect(s.current).toBe(.09);
  });
  it('handles source-off, empty, and obsolete node selections',()=>{
    expect(probe(solve({voltage:0,components:[R()]})).voltage).toBe(0);
    expect(probe(solve({voltage:9,components:[]})).voltage).toBe(9);
    const p=probe(solve({components:[R()]}),8,-1);
    expect(p.red).toBe(1);expect(p.black).toBe(0);expect(p.voltage).toBe(-9);
  });
  it('keeps under-threshold internal LED nodes unresolved',()=>{
    const s=solve({voltage:1,components:[{type:'led',id:1},{type:'led',id:2}]});
    expect(probe(s).nodes.map(n=>n.voltage)).toEqual([1,null,0]);
    expect(probe(s,0,1).voltage).toBeNull();expect(probe(s,0,2).voltage).toBe(1);
  });
  it('includes signed probe readings in saved images',()=>{
    const state={voltage:12,sceneProbes:true,probeRed:2,probeBlack:1,components:[R(200),R(100,2)]};
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const image=window.StemLab.circuitBenchSnapshot(svg,solve(state),0,state);
    expect(image).toContain('red N2 − black N1 = -4.00V');
    expect(image).toContain('Ideal probes do not load the circuit');
  });
});

describe('differential readings within floating sections',()=>{
  it('measures known drops between unresolved absolute potentials',()=>{
    const s=solve({voltage:9,components:[{type:'capacitor',id:1},R(100,2),R(200,3),{type:'switch',closed:false,id:4}]});
    expect(probe(s).nodes.map(n=>n.voltage)).toEqual([9,null,null,null,0]);
    expect(probe(s,1,2).voltage).toBe(0);
    expect(probe(s,1,3).voltage).toBe(0);
    expect(probe(s,3,1).voltage===0).toBe(true);
    expect(probe(s,0,2).voltage).toBeNull();
    expect(probe(s,1,4).voltage).toBeNull();
    expect(probe(s,0,4).voltage).toBe(9);
  });
});
