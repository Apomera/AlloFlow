
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const R = (value, id=1) => ({type:'resistor',value,id});
const LED = (color='#ef4444', reversed=false) => ({type:'led',ledColor:color,reversed,id:2});
let solve;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_circuit.js','circuit'); solve=window.StemLab.solveCircuit; });
describe('shared circuit DC physics', () => {
  it('solves the voltage divider with KVL and conserved power', () => {
    const s=solve({voltage:12,components:[R(200),R(100,2)]});
    expect(s.current).toBeCloseTo(.04,12);
    expect(s.rows.map(r=>r.voltage)).toEqual([8,4]);
    expect(s.rows.reduce((sum,r)=>sum+r.power,0)).toBeCloseTo(s.power,12);
  });
  it('sums parallel branch currents, including measurement loading', () => {
    const s=solve({voltage:9,mode:'parallel',components:[R(100),R(200,2),{type:'voltmeter',id:3}]});
    expect(s.current).toBeCloseTo(.135+9e-9,12);
    expect(s.rows.every(r=>r.voltage===9)).toBe(true);
    expect(s.rows.reduce((sum,r)=>sum+r.power,0)).toBeCloseTo(s.power,12);
  });
  it('uses exact zero for an open switch and a steady-state capacitor', () => {
    for(const part of [{type:'switch',closed:false,id:2},{type:'capacitor',value:100,id:2}]) {
      const s=solve({voltage:9,components:[R(100),part]});
      expect(s.current).toBe(0); expect(s.power).toBe(0); expect(s.isOpen).toBe(true);
      expect(s.rows[0].voltage).toBe(0); expect(s.rows[1].voltage).toBe(9);
    }
  });
  it('keeps a parallel resistor energized when another branch is open', () => {
    const s=solve({voltage:9,mode:'parallel',components:[R(100),{type:'switch',closed:false,id:2}]});
    expect(s.current).toBe(.09); expect(s.rows[1].current).toBe(0); expect(s.isOpen).toBe(false);
  });
  it('does not invent a voltage split across multiple blocking components', () => {
    const s=solve({components:[{type:'capacitor',id:1},{type:'switch',closed:false,id:2}]});
    expect(s.voltageAmbiguous).toBe(true); expect(s.rows.map(r=>r.voltage)).toEqual([null,null]);
    expect(renderTool('circuit',{_circuit:{components:s.components}})).toContain('undetermined');
  });
  it('models LED forward drop, polarity, turn-on and power balance', () => {
    const s=solve({voltage:9,components:[R(470),LED()]});
    expect(s.current).toBeCloseTo(7/480,12);
    expect(s.rows[1].voltage).toBeCloseTo(2+10*s.current,12);
    expect(s.rows.reduce((sum,r)=>sum+r.voltage,0)).toBeCloseTo(9,12);
    expect(s.rows.reduce((sum,r)=>sum+r.power,0)).toBeCloseTo(s.power,12);
    expect(s.ledOvercurrent).toBe(false);
    expect(solve({voltage:1.5,components:[R(470),LED()]}).current).toBe(0);
    expect(solve({voltage:9,components:[R(470),LED('#ef4444',true)]}).current).toBe(0);
    expect(solve({voltage:9,components:[R(470),LED('#3b82f6')]}).current).toBeLessThan(s.current);
  });
  it('does not let a resistor on a separate branch protect an LED', () => {
    const s=solve({voltage:9,mode:'parallel',components:[R(470),LED()]});
    expect(s.rows[1].current).toBeCloseTo(.7,12); expect(s.ledOvercurrent).toBe(true);
  });
  it('identifies meter faults and preserves nearly ideal series measurements', () => {
    expect(solve({mode:'parallel',components:[R(100),{type:'ammeter',id:2}]}).isShort).toBe(true);
    const series=solve({components:[R(100),{type:'ammeter',id:2}]});
    expect(series.current).toBeCloseTo(.09,5); expect(series.isShort).toBe(false);
    expect(solve({components:[R(100),{type:'voltmeter',id:2}]}).isOpen).toBe(true);
  });
  it('handles empty, unpowered and malformed state without non-finite readings', () => {
    expect(solve({components:[]}).current).toBe(0);
    expect(solve({voltage:0,components:[R(100)]}).current).toBe(0);
    for(const value of [-500,Infinity,NaN,'oops',100000]) {
      const s=solve({voltage:value,components:[R(value),null,{type:'unknown'}]});
      expect(Number.isFinite(s.current)).toBe(true); expect(s.voltage).toBeGreaterThanOrEqual(0);
      expect(s.voltage).toBeLessThanOrEqual(24); expect(s.components[0].value).toBeGreaterThanOrEqual(1);
      expect(s.components[0].value).toBeLessThanOrEqual(10000);
    }
  });
  it('conserves power across a grid of series and parallel networks', () => {
    for(const mode of ['series','parallel']) for(const voltage of [0,1.5,5,9,24]) for(const value of [1,10,100,470,10000]) {
      const s=solve({mode,voltage,components:[R(value),R(value*2,3),LED()]});
      expect(s.rows.reduce((sum,r)=>sum+r.power,0)).toBeCloseTo(s.power,8);
      if(mode==='parallel') expect(s.rows.reduce((sum,r)=>sum+r.current,0)).toBeCloseTo(s.current,10);
      else if(s.current>0) expect(s.rows.reduce((sum,r)=>sum+r.voltage,0)).toBeCloseTo(voltage,10);
    }
  });
});
describe('circuit bench learning and view contract', () => {
  it('renders a named 3D view with an equivalent numeric inspector', () => {
    const html=renderTool('circuit',{_circuit:{benchView:'3d',components:[R(100)]}});
    expect(html).toContain('Rotatable 3D representation');
    expect(html).toContain('3D camera orbit'); expect(html).toContain('3D camera tilt');
    const root=document.createElement('div');root.innerHTML=html;
    const readings=root.querySelector('.circuit-inspector-readings');
    expect([...readings.querySelectorAll('dt')].map(el=>el.textContent)).toEqual(['Voltage across','Current through','Power transferred']);
    expect([...readings.querySelectorAll('dd')].map(el=>el.textContent)).toEqual(['9.00V','90.00 mA','810.00 mW']);
    expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
  });
  it('offers prediction, reversible edits, and progressive explanations', () => {
    const html=renderTool('circuit',{_circuit:{components:[R(100)]}});
    for(const text of ['My prediction and reason','Save baseline','Record comparison','Undo','Redo','Pause motion','What this simulation models','03 / EXPLAIN']) expect(html).toContain(text);
  });
});

describe('circuit response presentation', () => {
  it('explains the LED knee instead of claiming an Ohmic straight line', () => {
    const html=renderTool('circuit',{_circuit:{components:[R(470),LED()],voltage:9}});
    expect(html).toContain('LED turn-on creates a bend');
    expect(html).toContain('includes an LED turn-on threshold');
    expect(html).not.toContain('Current versus voltage is a straight line through the origin; at 9');
  });
  it('renders every supported component in either representation without invalid values', () => {
    const parts=[R(100),{type:'bulb',value:100,id:2},{type:'switch',closed:false,id:3},
      {type:'led',id:4},{type:'capacitor',value:100,id:5},{type:'ammeter',id:6},{type:'voltmeter',id:7}];
    for(const mode of ['series','parallel']) for(const benchView of ['3d','schematic']) {
      const html=renderTool('circuit',{_circuit:{mode,benchView,components:parts}});
      expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
    }
  });
});
