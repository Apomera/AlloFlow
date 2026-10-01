import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const R=(value=100,id=1)=>({type:'resistor',value,id});
function scene(state){const root=document.createElement('div');root.innerHTML=renderTool('circuit',{_circuit:{benchView:'3d',pauseMotion:true,...state}});return root.querySelector('.circuit-3d');}
const widths=el=>[...el.querySelectorAll('.circuit-compare-track>span')].map(n=>parseFloat(n.style.width));
const readings=el=>[...el.querySelectorAll('.circuit-part-copy small')].map(n=>n.textContent);
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');});
describe('3D part comparison cards',()=>{
  it('uses one labeled scale for divider voltage and power',()=>{
    const state={voltage:12,components:[R(200),R(100,2)]};
    const voltage=scene({...state,sceneCompare:'voltage'});
    expect(readings(voltage)).toEqual(['8.00V','4.00V']);expect(widths(voltage)).toEqual([100,50]);
    expect(voltage.textContent).toContain('longest bar = 8.00V');
    const power=scene({...state,sceneCompare:'power'});
    expect(readings(power)).toEqual(['320.00 mW','160.00 mW']);expect(widths(power)).toEqual([100,50]);
    expect(power.textContent).toContain('not energy stored');
  });
  it('shows equal series current and different parallel branch currents',()=>{
    const state={voltage:9,sceneCompare:'current',components:[R(100),R(200,2)]};
    expect(widths(scene(state))).toEqual([100,100]);
    const parallel=scene({...state,mode:'parallel'});
    expect(readings(parallel)).toEqual(['90.00 mA','45.00 mA']);expect(widths(parallel)).toEqual([100,50]);
  });
  it('distinguishes unknown voltages from known zero readings',()=>{
    const el=scene({sceneCompare:'voltage',components:[R(),{type:'capacitor',id:2},{type:'switch',closed:false,id:3}]});
    expect(readings(el)).toEqual(['0.00V','undetermined','undetermined']);
    expect(el.querySelectorAll('[data-unknown=true]')).toHaveLength(2);
    expect(widths(el)).toEqual([0,0,0]);expect(el.textContent).toContain('Striped bars mean undetermined, not zero');
  });
  it('shows an all-zero scale without inventing a positive bar',()=>{
    for(const sceneCompare of ['voltage','current','power']){
      const el=scene({voltage:0,sceneCompare,components:[R(),R(200,2)]});
      expect(widths(el)).toEqual([0,0]);expect(el.textContent).toContain('readings are zero');
      expect(el.innerHTML).not.toMatch(/NaN|Infinity/);
    }
  });
  it('preserves small nonzero switch voltage rather than rounding it to zero',()=>{
    const el=scene({voltage:9,sceneCompare:'voltage',components:[R(),{type:'switch',closed:true,id:2}]});
    expect(readings(el)[1]).toBe('90.0 µV');expect(widths(el)[1]).toBeGreaterThan(0);
  });
  it('keeps details as the default, labels card readings, and handles empty benches',()=>{
    const el=scene({components:[R()],sceneCompare:'invalid'});
    expect(el.querySelector('#circuit-part-compare').value).toBe('details');
    expect(readings(el)).toEqual(['100 Ω']);expect(widths(el)).toEqual([]);
    expect(el.querySelector('.circuit-part-picker button').getAttribute('aria-describedby')).toBe('circuit-part-reading-0');
    expect(scene({components:[]}).querySelector('#circuit-part-compare')).toBeNull();
  });
});

describe('consistent small measurements across circuit views',()=>{
  it('keeps a small switch voltage consistent in the scene, inspector, and comparison',()=>{
    const root=document.createElement('div');root.innerHTML=renderTool('circuit',{_circuit:{benchView:'3d',pauseMotion:true,sceneCompare:'voltage',selectedPart:1,voltage:9,components:[R(),{type:'switch',closed:true,id:2}]}});
    expect(root.querySelector('.circuit-scene-readings dd').textContent).toBe('90.0 µV');
    expect(root.querySelector('.circuit-inspector-readings dd').textContent).toBe('90.0 µV');
    expect(root.querySelector('#circuit-part-reading-1').textContent).toBe('90.0 µV');
  });
  it('preserves small source power and nonzero current in the SVG alternative',()=>{
    const el=scene({voltage:9,components:[{type:'voltmeter',id:1}]});
    expect(el.querySelector('.circuit-scene-metrics').textContent).toContain('0.0810 µW');
    expect(el.querySelector('svg').getAttribute('aria-label')).not.toContain('0.000 amps');
    expect(el.querySelector('svg').getAttribute('aria-label')).toContain('µA');
  });
});
