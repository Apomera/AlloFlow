import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let c;beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');c=window.__SemiconductorCore;});
const state=p=>({subtool:'transistor',transistorType:p===1?'mosfet-n':'mosfet-p',gateVoltage:4*p,drainVoltage:5*p});
const save=(p=1,note='')=>c.mosComparisonCapture(state(p),{gate:3*p,polarity:p},note);
const entry=s=>c.notebookEntries([s])[0];
describe('Saved MOSFET comparisons',()=>{
 for(const [p,ref,live,delta] of [[1,'1.125','3.125','2'],[-1,'-0.5625','-1.5625','-1']]){
  it('captures signed '+(p===1?'NMOS':'PMOS')+' evidence at one drain bias',()=>{
   const s=save(p),r=Object.fromEntries(s.data.recordedEvidence);
   expect(r['Reference drain current']).toBe(ref+' mA');expect(r['Live drain current']).toBe(live+' mA');
   expect(r['Signed current change (live minus reference)']).toBe(delta+' mA');
   expect(r['Current magnitude change (live minus reference)']).toBe(Math.abs(Number(delta))+' mA');
   expect(r['Shared drain VDS']).toBe((5*p).toFixed(2)+' V');
   expect(r['Reference saturation starts']).toBe('1.5 V magnitude');
   expect(r['Live saturation starts']).toBe('2.5 V magnitude');
  });
  it('restores both '+p+' gate settings without changing other lessons',()=>{
   const saved=save(p,'The larger gate magnitude increased current.'),before=JSON.stringify(saved);
   const restored=c.restoreNotebook({solarArea:87,guidedNotes:{memory:'draft'}},entry(saved));
   expect(restored.gateVoltage).toBe(4*p);expect(restored.drainVoltage).toBe(5*p);
   expect(restored.deviceView).toBe('3d');expect(restored.showCMOS).toBe(false);
   expect(restored.mosComparisonRestore.reference).toEqual({gate:3*p,polarity:p});
   expect(restored.mosComparisonRestore.observation).toContain('increased current');
   expect(restored.solarArea).toBe(87);expect(restored.guidedNotes.memory).toBe('draft');
   restored.mosComparisonRestore.reference.gate=0;expect(JSON.stringify(saved)).toBe(before);
  });
 }
 it('captures zero current and cutoff explicitly',()=>{
  const s=c.mosComparisonCapture({...state(1),gateVoltage:0,drainVoltage:0},{gate:0,polarity:1},'');
  const r=Object.fromEntries(s.data.recordedEvidence);
  expect(r['Live drain current']).toBe('0 mA');expect(r['Shared drain VDS']).toBe('0.00 V');
  expect(r['Reference saturation starts']).toBe('No strong inversion');expect(r['Live region']).toBe('Cutoff');
 });
 it('rejects unsupported bias and incompatible or missing references',()=>{
  expect(c.mosComparisonCapture({...state(1),drainVoltage:-1},{gate:3,polarity:1})).toBeNull();
  expect(c.mosComparisonCapture(state(1),{gate:-3,polarity:-1})).toBeNull();
  expect(c.mosComparisonCapture(state(1),null)).toBeNull();
  expect(c.mosComparisonCapture({...state(1),transistorType:'bjt-npn'},{gate:3,polarity:1})).toBeNull();
 });
 it('uses the default NMOS settings when controls are untouched',()=>{
  const s=c.mosComparisonCapture({}, {gate:0,polarity:1});
  expect(s.data.transistorType).toBe('mosfet-n');expect(s.data.gateVoltage).toBe(0);expect(s.data.drainVoltage).toBe(5);
 });
 it('freezes evidence and explanation independently of live state',()=>{
  const d=state(1),r={gate:3,polarity:1};const s=c.mosComparisonCapture(d,r,'  Larger gate, larger current.  ');
  d.gateVoltage=0;r.gate=0;expect(s.data.gateVoltage).toBe(4);expect(s.data.mosGateComparison.reference.gate).toBe(3);
  expect(entry(s).observation).toBe('Larger gate, larger current.');
 });
 it('does not leak an earlier observation or restore request into quick snapshots',()=>{
  const s=save();s.data.mosComparisonRestore={reference:{gate:0,polarity:1}};
  const quick=c.capture(s.data,'Quick',[]);expect(quick.data.mosGateComparison).toBeUndefined();expect(quick.data.mosComparisonRestore).toBeUndefined();
  expect(entry(quick).observation).toBe('');
 });
 it('clears pending comparisons when restoring ordinary transistor settings',()=>{
  const quick=c.capture(state(1),'Quick',[]);
  expect(c.restoreNotebook({mosComparisonRestore:{reference:{gate:2,polarity:1}}},entry(quick)).mosComparisonRestore).toBeNull();
 });
 it('rejects corrupt saved references while retaining ordinary restoration',()=>{
  const s=save();s.data.mosGateComparison.reference={gate:99,polarity:1};
  const restored=c.restoreNotebook({},entry(s));expect(restored.mosComparisonRestore).toBeNull();expect(restored.gateVoltage).toBe(4);
 });
 it('exports both readings and escaped explanations from saved evidence',()=>{
  const s=save(-1,'<strong>Current</strong> | evidence');s.data.recordedEvidence[4][1]='archived reading';
  const md=c.notebookMarkdown([entry(s)]);expect(md).toContain('archived reading');expect(md).toContain('-1.5625 mA');
  expect(md).toContain('&lt;strong&gt;Current&lt;/strong&gt; \\| evidence');expect(md).not.toContain('mosComparisonRestore');
 });
 it('shows saved comparison evidence in the notebook without recalculating',()=>{
  const s=save(1,'Gate control increases current.');s.data.recordedEvidence[4][1]='historic value';
  const html=renderTool('semiconductor',{semiconductor:{subtool:'transistor',notebookOpen:true}},{toolSnapshots:[s]});
  expect(html).toContain('historic value');expect(html).toContain('Gate control increases current.');expect(html).toContain('Restore experiment reopens');
 });
 it('bounds explanation length and gives repeated saves distinct ids',()=>{
  const a=save(1,'x'.repeat(1200)),b=save();expect(a.data.mosGateComparison.observation.length).toBe(1000);expect(a.id).not.toBe(b.id);
 });
});
