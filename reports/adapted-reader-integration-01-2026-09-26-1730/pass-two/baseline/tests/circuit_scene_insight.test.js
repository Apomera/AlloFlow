import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const R=(value=100,id=1)=>({type:'resistor',value,id});
function panel(state){
  const root=document.createElement('div');
  root.innerHTML=renderTool('circuit',{_circuit:{benchView:'3d',pauseMotion:true,...state}});
  return root.querySelector('.circuit-scene-insight');
}
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');});
describe('selected 3D component understanding',()=>{
  it('shows the selected divider voltage, current and power from the solver',()=>{
    const el=panel({voltage:12,selectedPart:1,components:[R(200),R(100,2)]});
    expect([...el.querySelectorAll('dd')].map(n=>n.textContent)).toEqual(['4.00V','40.00 mA','160.00 mW']);
    expect(el.textContent).toContain('V = I × R');
    expect(el.textContent).toContain('SELECTED PART 02');
  });
  it('distinguishes an open parallel branch from its conducting neighbor',()=>{
    const state={mode:'parallel',voltage:9,components:[R(),{type:'switch',closed:false,id:2}]};
    expect(panel({...state,selectedPart:0}).textContent).toContain('Resistance transfers energy');
    const el=panel({...state,selectedPart:1});
    expect(el.textContent).toContain('blocks only its own branch');
    expect([...el.querySelectorAll('dd')].map(n=>n.textContent)).toEqual(['9.00V','0 A','0 W']);
  });
  it('keeps ambiguous capacitor voltage explicit and explains the DC limit',()=>{
    const el=panel({components:[{type:'capacitor',id:1},{type:'switch',closed:false,id:2}]});
    expect(el.textContent).toContain('undetermined');
    expect(el.textContent).toContain('Final DC state');
    expect(el.textContent).toContain('cannot assign individual voltages');
    expect(el.textContent).toContain('initial capacitor charge');
  });
  it('distinguishes reversed, overdriven and below-threshold LEDs',()=>{
    const led={type:'led',ledColor:'#ef4444',id:2};
    expect(panel({selectedPart:1,components:[R(470),{...led,reversed:true}]}).textContent).toContain('Reverse polarity');
    const high=panel({mode:'parallel',selectedPart:1,components:[R(470),led]});
    expect(high.dataset.tone).toBe('warning');
    expect(high.textContent).toContain('another parallel branch cannot protect');
    expect(panel({voltage:1,selectedPart:1,components:[R(470),led]}).textContent).toContain('combined LED forward drops');
  });
  it('explains meter placement and nearly ideal short paths',()=>{
    expect(panel({components:[{type:'voltmeter',id:1},R(100,2)]}).textContent).toContain('nearly stops the series current');
    const short=panel({mode:'parallel',components:[{type:'ammeter',id:1},R(100,2)]});
    expect(short.dataset.tone).toBe('warning');
    expect(short.textContent).toContain('Real sources have limits');
    expect(panel({components:[{type:'ammeter',id:1},R(100,2)]}).textContent).toContain('Measuring current');
  });
  it('handles source-off and stale selections without invented readings',()=>{
    const el=panel({voltage:0,selectedPart:7,components:[R()]});
    expect(el.textContent).toContain('Source off');
    expect(el.textContent).toContain('SELECTED PART 01');
    expect([...el.querySelectorAll('dd')].map(n=>n.textContent)).toEqual(['0.00V','0 A','0 W']);
    expect(panel({components:[]})).toBeNull();
  });
});
