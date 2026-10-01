import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesEnergyModel;});
function show(id,baseline,current={},extra={}){
 const state={selected:id,settings:{[id]:current},readings:baseline?{[id]:[baseline]}:{},...extra};
 const before=JSON.stringify(state),host=document.createElement('div');
 host.innerHTML=renderTool('renewablesLab',{renewablesLab:{view:'energy3d',energyLab:state}});
 expect(JSON.stringify(state)).toBe(before);
 const panel=host.querySelector('[aria-label="Component baseline comparison"]');expect(panel).not.toBeNull();return panel;
}
function delta(panel){return panel.querySelector('[aria-label="Component reading difference"]').textContent;}
function widths(panel){return [...panel.querySelectorAll('.rn-energy-component-compare-track>span')].map(e=>parseFloat(e.style.width));}
describe('Guided component baseline comparison',()=>{
 for(const id of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass','storage'])it(id+' renders a matched baseline without changing saved data',()=>{
  const p=show(id,{settings:{},profileId:'steady',phase:0,name:'Reference'});
  expect(delta(p)).toBe('No change');expect(p.textContent).toContain('Same modeled conditions');expect(p.textContent).toContain('Baseline: Reference');
  expect(p.textContent).not.toMatch(/NaN|undefined|Infinity/);expect(widths(p).every(v=>v===0||v===100)).toBe(true);
 });
 it('offers an explicit baseline save when no reading exists',()=>{const p=show('solarPv',null);expect(p.textContent).toContain('Save a baseline');expect(p.querySelector('[aria-label="Component reading difference"]')).toBeNull();});
 it('compares PV DC output analytically on a common scale',()=>{const p=show('solarPv',{settings:{irradiance:1000,incidence:0,area:20,efficiency:20}},{irradiance:1000,incidence:0,area:40,efficiency:20});expect(delta(p)).toBe('+4 kW');expect(widths(p)).toEqual([50,100]);expect(p.textContent).toContain('One input changed');});
 it('uses percentage points for a difference between efficiencies',()=>{const p=show('hydro',{settings:{efficiency:80}},{efficiency:90});expect(delta(p)).toBe('+10 percentage points');expect(p.textContent).not.toContain('+10%');expect(p.querySelector('[aria-label="Baseline and current Combined conversion"]')).not.toBeNull();});
 it('retains signed negative and tiny differences and empty zero bars',()=>{const a=show('solarPv',{settings:{irradiance:1000,incidence:0,area:20,efficiency:20}},{irradiance:1000,incidence:0,area:10,efficiency:20});expect(delta(a)).toBe('-2 kW');expect(widths(a)).toEqual([100,50]);const b=show('solarPv',{settings:{irradiance:0}},{irradiance:0});expect(widths(b)).toEqual([0,0]);const tiny=show('solarPv',{settings:{irradiance:0}},{irradiance:1e-10});expect(delta(tiny)).toMatch(/^\+[\d.]+e-\d+ kW$/);expect(widths(tiny)).toEqual([0,100]);});
 it('distinguishes changed scenario and time from controlled input changes',()=>{const p=show('solarPv',{settings:{},profileId:'clouds',phase:20},{},{scenarios:{solarPv:{profileId:'clouds',minute:50}}});expect(p.textContent).toContain('Different operating conditions');expect(p.textContent).toContain('Selected minute changed: 20 → 50');expect(p.textContent).toContain('cannot be attributed to one input');});
 it('keeps battery comparison values in kWh and checks the meaningful cycle time',()=>{const p=show('storage',{settings:{roundtrip:100,initial:0},phase:0},{roundtrip:100,initial:0},{phases:{storage:60}});expect(delta(p)).toBe('+50 kWh');expect(p.textContent).toContain('Different operating conditions');expect(p.textContent).toContain('minute 60');expect(p.textContent).not.toContain('+50 kW ');});
 it('distinguishes several changed inputs and renders the captured input differences',()=>{const p=show('solarPv',{settings:{area:20,efficiency:20}},{area:40,efficiency:25});expect(p.textContent).toContain('Several inputs changed');expect(p.textContent).toContain('Review 2 changed inputs');expect(p.textContent).toContain('20 → 40');expect(p.textContent).toContain('20 → 25');});
 it('escapes user-defined baseline names',()=>{const p=show('solarPv',{settings:{},name:'<img src=x onerror=alert(1)>'});expect(p.textContent).toContain('<img src=x onerror=alert(1)>');expect(p.querySelector('img')).toBeNull();});
});
