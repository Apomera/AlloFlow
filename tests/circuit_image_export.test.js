import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const R=(value=100,id=1)=>({type:'resistor',value,id});
let snapshot,solve;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');snapshot=window.StemLab.circuitBenchSnapshot;solve=window.StemLab.solveCircuit;});
function image(state){const wrapper=document.createElement('div');wrapper.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 410" aria-describedby="circuit-flow-note"><text x="20" y="20">Scene</text></svg><button class="circuit-scene-pin" style="left:50%;top:50%" aria-pressed="true">1</button>';return new DOMParser().parseFromString(snapshot(wrapper.querySelector('svg'),solve(state),state.selectedPart||0,state),'image/svg+xml');}
describe('portable 3D bench snapshots',()=>{
  it('includes the circuit measurements and every divider part',()=>{
    const doc=image({voltage:12,components:[R(200),R(100,2)]});
    expect(doc.querySelector('parsererror')).toBeNull();
    const text=doc.documentElement.textContent;
    for(const value of ['Supply 12.00V','40.00 mA','480.00 mW','8.00V','4.00V','320.00 mW','160.00 mW','1. resistor · 200 Ω','2. resistor · 100 Ω'])expect(text).toContain(value);
    expect(doc.documentElement.getAttribute('width')).toBe('1280');
    expect(doc.querySelector('svg svg').hasAttribute('aria-describedby')).toBe(false);
    expect(doc.querySelector('circle').getAttribute('cx')).toBe('320');
    expect(Number(doc.querySelector('circle').getAttribute('cy'))).toBeCloseTo(205,10);
  });
  it('keeps unknown voltages and important model notes explicit',()=>{
    const doc=image({sceneCurrent:true,components:[{type:'capacitor',id:1},{type:'switch',closed:false,id:2}]});
    expect(doc.documentElement.textContent).toContain('undetermined');
    expect(doc.documentElement.textContent).toContain('Undetermined voltages are not zero');
    expect(doc.documentElement.textContent).toContain('not speed or electron motion');
  });
  it('includes all parts even when the camera is in close-up',()=>{
    const doc=image({sceneCloseup:true,selectedPart:7,components:Array.from({length:8},(_,i)=>R((i+1)*100,i+1))});
    expect(doc.documentElement.textContent).toContain('Selected part 8');
    expect(doc.documentElement.textContent).toContain('8. resistor · 800 Ω');
    expect(doc.documentElement.textContent).toContain('The table includes every connected component');
    expect(Number(doc.documentElement.getAttribute('height'))).toBeGreaterThan(1400);
  });
  it('records short-path and LED overcurrent limitations',()=>{
    expect(image({mode:'parallel',components:[{type:'ammeter',id:1}]}).documentElement.textContent).toContain('ideal-source current can exceed real source limits');
    expect(image({components:[{type:'led',id:1}]}).documentElement.textContent).toContain('illustrative 20 mA rating');
  });
  it('preserves tiny readings in the saved table',()=>{
    const doc=image({voltage:9,selectedPart:1,components:[R(),{type:'switch',closed:true,id:2}]});
    expect(doc.documentElement.textContent).toContain('90.0 µV');
    expect(doc.documentElement.textContent).not.toMatch(/NaN|Infinity/);
  });
});
