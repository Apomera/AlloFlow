import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,resetStemLab,renderTool} from './helpers/stem_widgets_smoke_harness.js';
let api;
const divider={components:[{id:1,type:'voltage',a:'A',b:'0',value:12},{id:2,type:'resistor',a:'A',b:'B',value:200},{id:3,type:'resistor',a:'B',b:'0',value:100}]};
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;});
describe('3D differential voltage instrument',()=>{
 it('measures a divider drop and exposes each lead voltage relative to reference',()=>{
  const s=api.solveNetworkCircuit(divider),r=api.circuitNetworkOrbitMeterReading(s,'A','B');expect(s.ok).toBe(true);
  expect(r.voltage).toBeCloseTo(8,12);expect(r.red.voltage).toBeCloseTo(12,12);expect(r.black.voltage).toBeCloseTo(4,12);expect(r.status).toBe('positive');expect(r.heldVoltage).toBeNull();expect(r.delta).toBeNull();
 });
 it('reverses polarity by swapping leads without changing the solution',()=>{
  const s=api.solveNetworkCircuit(divider),before=JSON.stringify(s),r=api.circuitNetworkOrbitMeterReading(s,'B','A');expect(r.voltage).toBeCloseTo(-8,12);expect(r.status).toBe('negative');expect(r.message).toContain('lower voltage');expect(JSON.stringify(s)).toBe(before);
 });
 it('retains a known differential reading when both absolute potentials float',()=>{
  const s=api.solveNetworkCircuit({components:[{id:1,type:'voltage',a:'A',b:'B',value:7},{id:2,type:'resistor',a:'A',b:'B',value:1000}]}),r=api.circuitNetworkOrbitMeterReading(s,'A','B');expect(s.ok).toBe(true);expect(r.voltage).toBeCloseTo(7,12);expect(r.red.voltage).toBeNull();expect(r.black.voltage).toBeNull();expect(r.status).toBe('floating');
  expect(api.circuitNetworkOrbitMeterReading(s,'B','A').voltage).toBeCloseTo(-7,12);expect(api.circuitNetworkOrbitMeterReading(s,'A','0').status).toBe('unknown');
 });
 it('distinguishes the same floating node from different nodes of equal known voltage',()=>{
  const s=api.solveNetworkCircuit({components:[{id:1,type:'resistor',a:'A',b:'B',value:100}]}),same=api.circuitNetworkOrbitMeterReading(s,'A','A');expect(same.voltage).toBe(0);expect(same.status).toBe('same-node');expect(same.red.voltage).toBeNull();
  const grounded=api.solveNetworkCircuit({components:[{id:1,type:'resistor',a:'A',b:'0',value:100}]});expect(api.circuitNetworkOrbitMeterReading(grounded,'A','0')).toMatchObject({status:'zero',voltage:0});
 });
 it('identifies unused nodes and separately floating sections without fabricating a difference',()=>{
  const s=api.solveNetworkCircuit(divider);expect(api.circuitNetworkOrbitMeterReading(s,'G','0')).toMatchObject({voltage:null,status:'unknown'});expect(api.circuitNetworkOrbitMeterReading(s,'G','0').message).toContain('unused');
  const split=api.solveNetworkCircuit({components:[{id:1,type:'resistor',a:'A',b:'B',value:100},{id:2,type:'resistor',a:'C',b:'D',value:100}]});expect(api.circuitNetworkOrbitMeterReading(split,'A','C').voltage).toBeNull();expect(api.circuitNetworkOrbitMeterReading(split,'A','C').message).toContain('undetermined');
 });
 it('does not report zero for failed circuits, even if both leads use node 0',()=>{
  const s=api.solveNetworkCircuit({components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'voltage',a:'A',b:'0',value:10}]});expect(s.ok).toBe(false);const r=api.circuitNetworkOrbitMeterReading(s,'0','0');expect(r).toMatchObject({voltage:null,status:'failed'});expect(r.red.voltage).toBeNull();
 });
 it.each([NaN,Infinity,-Infinity])('withholds a nonfinite differential value %s',value=>{
  const s={ok:true,nodes:[{id:'A',used:true,voltage:value},{id:'0',used:true,voltage:0}],difference:()=>value},r=api.circuitNetworkOrbitMeterReading(s,'A','0');expect(r).toMatchObject({voltage:null,heldVoltage:null,delta:null,status:'unknown'});expect(r.red.voltage).toBeNull();
 });
 it('compares the same newly selected lead pair at both held and current snapshots',()=>{
  const design={components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'resistor',a:'A',b:'B',value:100},{id:3,type:'capacitor',a:'B',b:'0',value:100}],duration:.03},run=api.circuitNetworkTransient(design),held=run.frames[0],live=run.frames.at(-1),before=JSON.stringify(run);expect(run.ok).toBe(true);
  for(const [red,black] of [['A','B'],['B','0'],['0','B']]){const r=api.circuitNetworkOrbitMeterReading(live,red,black,held);expect(r.heldVoltage).toBe(held.difference(red,black));expect(r.voltage).toBe(live.difference(red,black));expect(r.delta).toBeCloseTo(live.difference(red,black)-held.difference(red,black),12);}
  expect(JSON.stringify(run)).toBe(before);expect(api.circuitNetworkOrbitMeterReading(live,'G','0',held).delta).toBeNull();
 });
 it('retains exact before and after switch-event voltages at an identical timestamp',()=>{
  const run=api.circuitNetworkTransient({components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'switch',a:'A',b:'B',closed:true,switching:{enabled:true,events:[{id:1,time:.003,closed:false}]}},{id:3,type:'resistor',a:'B',b:'0',value:100}],duration:.01});expect(run.ok).toBe(true);const before=api.circuitNetworkFrame(run,.003,'before'),after=api.circuitNetworkFrame(run,.003,'after'),r=api.circuitNetworkOrbitMeterReading(after,'A','B',before);expect(before.time).toBe(after.time);expect(r.heldVoltage).toBeCloseTo(0,12);expect(r.voltage).toBeCloseTo(5,12);expect(r.delta).toBeCloseTo(5,12);
 });
});
describe('3D voltage instrument presentation',()=>{
 const render=(state)=>new DOMParser().parseFromString(renderTool('circuit',{_circuit:{networkWorkbench:true},_circuitNetwork:{...divider,view:'orbit',selected:2,probeRed:'A',probeBlack:'B',orbit:{probesOpen:true},...state}}),'text/html');
 it('offers named lead controls and a native disclosure while keeping the signed summary readable',()=>{
  const doc=render(),meter=doc.querySelector('.circuit-network-orbit-meter');expect(meter.tagName).toBe('DETAILS');expect(meter.open).toBe(true);expect(Number(meter.querySelector('[data-orbit-probe-reading]').dataset.value)).toBeCloseTo(8,12);
  for(const label of ['3D red probe node','3D black probe node'])expect(meter.querySelector('select[aria-label="'+label+'"]').options).toHaveLength(8);
  expect(meter.querySelector('button[aria-label="Place 3D red probe"]').getAttribute('aria-pressed')).toBe('true');expect(doc.querySelector('select[aria-label="3D scene layer"]').options).toHaveLength(3);
 });
 it('renders reference uncertainty alongside a known floating voltage instead of zero node potentials',()=>{
  const doc=render({components:[{id:1,type:'voltage',a:'A',b:'B',value:7},{id:2,type:'resistor',a:'A',b:'B',value:1000}]}),meter=doc.querySelector('.circuit-network-orbit-meter');expect(meter.dataset.orbitMeterStatus).toBe('floating');expect(Number(meter.querySelector('[data-orbit-probe-reading]').dataset.value)).toBeCloseTo(7,12);
  for(const node of meter.querySelectorAll('[data-probe-potential]'))expect(node.textContent).toBe('Undetermined');expect(meter.textContent).toContain('difference is known');
 });
 it('explains node inspection and offers lead placement without claiming a probe is active',()=>{
  const meter=render({boardNodeMode:'inspect',inspectNode:'A'}).querySelector('.circuit-network-orbit-meter');expect(meter.textContent).toContain('Node inspection is active');for(const button of meter.querySelectorAll('[aria-pressed]'))expect(button.getAttribute('aria-pressed')).toBe('false');
 });
 it('labels voltage colors as reference-relative and hides invalid numeric readings',()=>{
  const doc=render({boardOverlay:'voltage',probeRed:'G'}),meter=doc.querySelector('.circuit-network-orbit-meter');expect(meter.querySelector('[data-orbit-probe-reading]').textContent).toBe('Undetermined');expect(meter.textContent).toContain('unused');expect(doc.querySelector('.circuit-network-orbit-layer-legend').textContent).toContain('Node voltage relative to 0');expect(meter.textContent).not.toMatch(/NaN|Infinity/);
 });
});
