import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const R=(value=100,id=1)=>({type:'resistor',value,id});
let task,check;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');task=window.StemLab.circuitProbeTask;check=window.StemLab.circuitProbeTaskCheck;});
describe('probe measurement practice',()=>{
  it('builds a frozen selected-part task with solver-backed voltage and sign',()=>{
    const state={voltage:12,components:[R(200),R(100,2)]},t=task(state,1,'part');
    expect(t.red).toBe(1);expect(t.black).toBe(2);expect(t.expected).toBe(4);expect(t.sign).toBe('positive');
    state.components[1].value=200;expect(t.circuit.components[1].value).toBe(100);
  });
  it('checks placement and prediction separately and recognizes reversed leads',()=>{
    const state={voltage:12,components:[R(200),R(100,2)]},t=task(state,1,'part');
    const wrong=check(t,{...state,probeRed:2,probeBlack:1},'positive');
    expect(wrong.placed).toBe(false);expect(wrong.hint).toContain('reversed');
    const placed=check(t,{...state,probeRed:1,probeBlack:2},'negative');
    expect(placed.placed).toBe(true);expect(placed.predicted).toBe(false);expect(placed.reading).toBe(4);
  });
  it('does not accept a matching number at the wrong connection',()=>{
    const state={voltage:0,components:[R(),R(100,2)]},t=task(state,1,'part');
    const r=check(t,{...state,probeRed:0,probeBlack:0},'zero');
    expect(r.reading).toBe(0);expect(r.placed).toBe(false);expect(r.hint).toContain('matching voltage number alone');
  });
  it('allows any same-node pair but requires the same point, not merely equal potentials',()=>{
    const state={voltage:0,components:[R(),R(100,2)]},t=task(state,0,'same');
    expect(check(t,{...state,probeRed:2,probeBlack:2},'zero').placed).toBe(true);
    expect(check(t,{...state,probeRed:0,probeBlack:2},'zero').placed).toBe(false);
  });
  it('supports unknown readings and parallel shared rails',()=>{
    const state={components:[{type:'capacitor',id:1},{type:'switch',closed:false,id:2}]},t=task(state,0,'part');
    expect(t.sign).toBe('undetermined');expect(t.expected).toBeNull();
    expect(check(t,{...state,probeRed:0,probeBlack:1},'undetermined').placed).toBe(true);
    const p=task({mode:'parallel',components:[R(),R(200,2)]},1,'part');
    expect([p.red,p.black,p.expected]).toEqual([0,1,9]);
  });
  it('invalidates changed circuits while allowing view changes and regenerated IDs',()=>{
    const state={components:[R()]},t=task(state,0,'source');
    expect(check(t,{...state,voltage:12},'positive').stale).toBe(true);
    expect(check(t,{...state,cameraYaw:60,components:[R(100,999)]},'positive').stale).toBe(false);
  });
  it('supports reverse-source and empty-source tasks and rejects invalid choices',()=>{
    expect(task({voltage:9,components:[]},0,'reverse').expected).toBe(-9);
    expect(task({voltage:0,components:[R()]},0,'reverse').sign).toBe('zero');
    expect(task({components:[]},0,'part')).toBeNull();expect(task({},0,'invalid')).toBeNull();
    expect(check(task({},0,'source'),{},'invalid')).toBeNull();
  });
});
