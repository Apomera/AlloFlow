import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,resetStemLab,renderTool} from './helpers/stem_widgets_smoke_harness.js';
let api;
const component={id:1,type:'capacitor',a:'A',b:'0',value:100};
const sample=(time,value,side)=>({ok:true,time,side,rows:[{component,voltage:value,current:value,power:value,energy:value}]});
const runOf=frames=>({ok:true,duration:1,frames,events:[]});
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;});
describe('Calculated 3D signal data',()=>{
 it('places nonuniform samples on elapsed time and preserves exact sample indices',()=>{
  const run=runOf([sample(0,3),sample(.01,5),sample(.8,-2),sample(1,1)]),trace=api.circuitNetworkOrbitTrace(run,1,'voltage');
  expect(trace.samples.map(p=>p.index)).toEqual([0,1,2,3]);expect(trace.x(.01)).toBeCloseTo(17.76,10);expect(trace.x(.8)).toBeCloseTo(472.8,10);
  expect(trace.minimum).toMatchObject({index:2,time:.8,value:-2});expect(trace.maximum).toMatchObject({index:1,time:.01,value:5});
 });
 it('retains adjacent switch-event sides at one timestamp and selects the first tied extremum',()=>{
  const trace=api.circuitNetworkOrbitTrace(runOf([sample(0,0),sample(.4,-5,'before'),sample(.4,6,'after'),sample(1,6)]),1,'current');
  expect(trace.samples[1]).toMatchObject({time:.4,side:'before',value:-5});expect(trace.samples[2]).toMatchObject({time:.4,side:'after',value:6});
  expect(trace.minimum.index).toBe(1);expect(trace.maximum.index).toBe(2);expect(trace.x(trace.samples[1].time)).toBe(trace.x(trace.samples[2].time));
  expect(trace.path.match(/242\.400/g)).toHaveLength(2);
 });
 it('breaks the path at unknown, nonfinite, and missing component readings',()=>{
  const frames=[sample(0,1),sample(.1,null),sample(.2,2),sample(.3,NaN),sample(.4,3),sample(.5,Infinity),sample(.6,4),{ok:true,time:.7,rows:[]},sample(.8,5)];
  const trace=api.circuitNetworkOrbitTrace(runOf(frames),1,'voltage');expect(trace.known).toBe(5);expect(trace.path.match(/M/g)).toHaveLength(5);
  expect(trace.path).not.toMatch(/NaN|Infinity|null/);expect(trace.samples.filter(p=>p.value===null)).toHaveLength(4);
 });
 it('withholds readings from failed frames and invalid time positions',()=>{
  const trace=api.circuitNetworkOrbitTrace(runOf([{...sample(0,100),ok:false},sample(NaN,200),sample(-1,300),sample(2,400),sample(.5,2)]),1,'power');
  expect(trace.known).toBe(1);expect(trace.maximum.value).toBe(2);expect(trace.path).not.toMatch(/NaN|Infinity/);
 });
 it.each([null,{ok:false,frames:[],duration:1},{ok:true,frames:[],duration:0},{ok:true,frames:[],duration:Infinity}])('handles unavailable runs without inventing extrema',run=>{
  const trace=api.circuitNetworkOrbitTrace(run,1,'voltage');expect(trace.path).toBe('');expect(trace.minimum).toBeNull();expect(trace.maximum).toBeNull();expect(Number.isFinite(trace.zero)).toBe(true);
 });
 it('anchors one-sign and zero traces to a finite zero baseline',()=>{
  for(const values of [[2,5],[-5,-2],[0,0]]){const trace=api.circuitNetworkOrbitTrace(runOf(values.map((v,i)=>sample(i,v))),1,'power');expect(trace.low).toBeLessThanOrEqual(0);expect(trace.high).toBeGreaterThanOrEqual(0);expect(trace.zero).toBeGreaterThanOrEqual(16);expect(trace.zero).toBeLessThanOrEqual(84);for(const v of values)expect(Number.isFinite(trace.y(v))).toBe(true);}
 });
 it('keeps normalized geometry finite for huge and subnormal signals',()=>{
  for(const value of [Number.MAX_VALUE,Number.MIN_VALUE,1e-200]){const trace=api.circuitNetworkOrbitTrace(runOf([sample(0,-value),sample(1,value)]),1,'current');expect(trace.y(-value)).toBeCloseTo(84);expect(trace.y(value)).toBeCloseTo(16);expect(trace.path).not.toMatch(/NaN|Infinity/);}
 });
 it('limits stored-energy traces to capacitors and inductors',()=>{
  for(const type of ['capacitor','inductor','resistor','voltage']){const frame=sample(0,.002);frame.rows[0].component={...component,type};const trace=api.circuitNetworkOrbitTrace(runOf([frame]),1,'energy');expect(trace.known).toBe(['capacitor','inductor'].includes(type)?1:0);}
 });
 it('uses signed power from real solved sources and loads without taking its magnitude',()=>{
  const run=api.circuitNetworkTransient({components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'resistor',a:'A',b:'0',value:1000}],duration:.01});expect(run.ok).toBe(true);
  expect(api.circuitNetworkOrbitTrace(run,1,'power').maximum.value).toBeCloseTo(-.025,10);expect(api.circuitNetworkOrbitTrace(run,2,'power').minimum.value).toBeCloseTo(.025,10);
 });
 it('reads real RLC stored energy and preserves the solver frames and held reference',()=>{
  const design={components:[{id:1,type:'resistor',a:'A',b:'0',value:10},{id:2,type:'capacitor',a:'A',b:'0',value:100,initial:5},{id:3,type:'inductor',a:'A',b:'0',value:100}],duration:.01},run=api.circuitNetworkTransient(design);expect(run.ok).toBe(true);
  const original=JSON.stringify(run),held=api.circuitNetworkHold(run,run.frames.at(-1));
  for(const metric of ['voltage','current','power','energy']){const trace=api.circuitNetworkOrbitTrace(run,2,metric);trace.samples.forEach((p,i)=>expect(p.value).toBe(run.frames[i].rows.find(r=>r.component.id===2)[metric]));}
  expect(JSON.stringify(run)).toBe(original);expect(api.circuitNetworkHeld(run,held)).toBe(run.frames.at(-1));
 });
});
describe('3D waveform teaching',()=>{
 const design={analysis:'time',duration:.01,time:.005,view:'orbit',selected:2,components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'resistor',a:'A',b:'B',value:100},{id:3,type:'capacitor',a:'B',b:'0',value:100}]};
 it('exposes named controls, a textual alternative, and signed-power guidance',()=>{
  const html=renderTool('circuit',{_circuit:{networkWorkbench:true},_circuitNetwork:{...design,orbit:{signal:'power'}}});const doc=new DOMParser().parseFromString(html,'text/html'),plot=doc.querySelector('.circuit-network-orbit-signal');
  expect(plot.querySelector('svg').getAttribute('aria-label')).toContain('Whole-run power absorbed');
  expect(plot.textContent).toContain('Negative power: returning energy');expect(plot.textContent).toContain('first matching calculated sample');expect(plot.querySelector('option[value=energy]').disabled).toBe(true);
  expect(plot.querySelectorAll('button[aria-label^="Go to"]')).toHaveLength(2);expect(html).not.toContain('NaN');
 });
 it('falls back to voltage for a non-storage part without changing the saved energy preference',()=>{
  const state={...design,orbit:{signal:'energy'}},html=renderTool('circuit',{_circuit:{networkWorkbench:true},_circuitNetwork:state});expect(html).toContain('data-signal-metric="voltage"');expect(state.orbit.signal).toBe('energy');
 });
 it('shows the shared held sample on the trace',()=>{
  const run=api.circuitNetworkTransient(design),boardReference=api.circuitNetworkHold(run,run.frames[0]),html=renderTool('circuit',{_circuit:{networkWorkbench:true},_circuitNetwork:{...design,selected:3,boardReference,orbit:{signal:'energy'}}}),doc=new DOMParser().parseFromString(html,'text/html'),signal=doc.querySelector('.circuit-network-orbit-signal');
  expect(signal.getAttribute('data-signal-metric')).toBe('energy');expect(signal.querySelector('[data-held-marker=energy]')).not.toBeNull();expect(signal.querySelector('[data-orbit-held-value]').textContent).toContain('Held');
 });
 it('does not show a time trace for a DC snapshot',()=>{
  const html=renderTool('circuit',{_circuit:{networkWorkbench:true},_circuitNetwork:{...design,analysis:'dc'}});expect(html).not.toContain('data-orbit-signal-trace');
 });
});
