
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const resistor=(value=1000,id=1)=>({type:'resistor',value,id});
const cap=(value=1000,id=2)=>({type:'capacitor',value,id});
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;});
describe('RC transient time lab',()=>{
  it('starts uncharged with V/R current and zero stored energy',()=>{
    const r=api.circuitRCResponse(9,1000,1000,0,false);
    expect(r.tau).toBe(1);expect(r.current).toBe(.009);expect(r.voltage).toBe(0);expect(r.energy).toBe(0);
  });
  it('reaches the analytical one-time-constant solution',()=>{
    const r=api.circuitRCResponse(9,1000,1000,1,false);
    expect(r.voltage).toBeCloseTo(9*(1-Math.exp(-1)),12);
    expect(r.current).toBeCloseTo(.009*Math.exp(-1),12);
    expect(r.energy).toBeCloseTo(.5*.001*r.voltage**2,12);
    expect(r.resistorPower).toBeCloseTo(r.current**2*1000,12);
  });
  it('discharges from full with reverse current and decreasing energy',()=>{
    const start=api.circuitRCResponse(9,1000,1000,0,true);
    const later=api.circuitRCResponse(9,1000,1000,1,true);
    expect(start.voltage).toBe(9);expect(start.current).toBe(-.009);
    expect(later.voltage).toBeCloseTo(9/Math.E,12);
    expect(later.current).toBeLessThan(0);expect(later.energy).toBeLessThan(start.energy);
  });
  it('approaches equilibrium at five time constants without pretending to reach it',()=>{
    const r=api.circuitRCResponse(9,1000,1000,5,false);
    expect(r.fraction).toBeGreaterThan(.99);expect(r.fraction).toBeLessThan(1);
    expect(r.current).toBeGreaterThan(0);
  });
  it('separates resistance and capacitance effects',()=>{
    const r=api.circuitRCResponse(9,2000,1000,0,false),c=api.circuitRCResponse(9,1000,2000,0,false);
    expect(r.tau).toBe(2);expect(c.tau).toBe(2);expect(r.current).toBe(.0045);expect(c.current).toBe(.009);
  });
  it('enforces the supported topology instead of inventing mixed-network transients',()=>{
    expect(api.circuitRCParameters({components:[resistor(),cap()]})).toEqual({voltage:9,capacitance:1000,resistance:1000});
    for(const state of [
      {mode:'parallel',components:[resistor(),cap()]},
      {components:[resistor(),cap(),cap(500,3)]},
      {components:[resistor(),cap(),{type:'led',id:3}]},
      {components:[resistor(),cap(),{type:'switch',closed:false,id:3}]}
    ])expect(api.circuitRCParameters(state)).toBeNull();
  });
  it('keeps an unpowered capacitor response at zero',()=>{
    const r=api.circuitRCResponse(0,1000,1000,1,false);
    expect(r.voltage).toBe(0);expect(r.current).toBe(0);expect(r.fraction).toBe(0);
  });
  it('renders named time controls with exact numeric alternatives',()=>{
    const html=renderTool('circuit',{_circuit:{components:[resistor(),cap()],showTimeLab:true,rcTime:1}});
    expect(html).toContain('5.689 V');expect(html).toContain('3.31 mA');
    expect(html).toContain('circuit-rc-time');expect(html).toContain('Capacitor charge curve');
    expect(html).not.toContain('NaN');
  });
});
describe('controlled circuit comparisons',()=>{
  const base={mode:'series',voltage:9,components:[resistor(100,1),{type:'led',id:2}]};
  it('ignores regenerated IDs and unused stored fields',()=>{
    expect(api.circuitExperimentDiff(base,{...base,components:base.components.map(c=>({...c,id:c.id+10,unused:true}))}).unchanged).toBe(true);
  });
  it('recognizes one changed parameter and identifies its value',()=>{
    const d=api.circuitExperimentDiff(base,{...base,voltage:12});
    expect(d.controlled).toBe(true);expect(d.changes).toEqual(['supply: 9 V → 12 V']);
  });
  it('warns when multiple independent variables changed',()=>{
    const d=api.circuitExperimentDiff(base,{...base,voltage:12,mode:'parallel'});
    expect(d.controlled).toBe(false);expect(d.changes).toHaveLength(2);
  });
  it('aligns middle removals instead of misidentifying subsequent components',()=>{
    const d=api.circuitExperimentDiff(base,{...base,components:[base.components[1]]});
    expect(d.controlled).toBe(true);expect(d.changes).toEqual(['part 1: removed resistor']);
  });
});
