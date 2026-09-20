import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let c;beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');c=window.__SemiconductorCore;});
describe('Controlled MOSFET gate comparison',()=>{
 for(const [type,p,beta] of [['mosfet-n',1,1],['mosfet-p',-1,.5]]){
  const compare=(g,d,r)=>c.mosGateComparison(c.mosfet(type,g*p,d*p),{gate:r*p,polarity:p});
  it(type+' uses one current scale for both curves',()=>{
   const a=compare(4,.5,3);
   expect(a.current.yMaxMilliamp).toBe(a.reference.yMaxMilliamp);
   expect(a.current.bounds).toEqual(a.reference.bounds);
   expect(a.current.selected.y).toBeLessThan(a.reference.selected.y);
   expect(a.reference.selected.drainVoltage).toBe(a.current.selected.drainVoltage);
  });
  it(type+' reports signed changes separately from magnitude changes',()=>{
   const a=compare(4,.5,3);
   expect(a.signedChangeMilliamp).toBeCloseTo(p*beta*.5,12);
   expect(a.magnitudeChangeMilliamp).toBeCloseTo(beta*.5,12);
   expect(a.referenceModel.gate).toBe(3*p);
  });
  it(type+' recalculates reference current at the live drain bias',()=>{
   const a=compare(4,0,3),b=compare(4,.5,3),d=compare(4,5,3);
   expect(a.referenceModel.currentA).toBe(p*0);
   expect(b.referenceModel.currentA).not.toBe(d.referenceModel.currentA);
   expect(b.referenceModel.gate).toBe(d.referenceModel.gate);
   expect(b.reference.linearPath).toBe(d.reference.linearPath);
  });
  it(type+' shares a small nonzero scale with a cutoff reference',()=>{
   const a=compare(1.6,.05,0);
   expect(a.reference.yMaxMilliamp).toBe(a.current.yMaxMilliamp);
   expect(a.current.yMaxMilliamp).toBeLessThan(.01);
   expect(a.reference.boundary).toBeNull();
   expect(a.reference.selected.y).toBe(a.reference.bounds.bottom);
   expect(a.current.selected.y).toBeLessThan(a.reference.selected.y);
  });
  it(type+' distinguishes operating regions at one fixed drain voltage',()=>{
   const a=compare(4,1.5,3);
   expect(a.current.selected.region).toBe('Linear (triode)');
   expect(a.reference.selected.region).toBe('Saturation');
   expect(a.current.boundary).toBe(2.5);expect(a.reference.boundary).toBe(1.5);
  });
  it(type+' represents equal gates and two cutoff curves without false differences',()=>{
   for(const gate of [0,1,3]){
    const a=compare(gate,.5,gate);
    expect(a.sameGate).toBe(true);expect(a.signedChangeMilliamp).toBe(0);
    expect(a.magnitudeChangeMilliamp).toBe(0);
    expect(a.reference.linearPath).toBe(a.current.linearPath);
    expect(a.reference.flatPath).toBe(a.current.flatPath);
    expect(a.current.yMaxMilliamp).toBeGreaterThan(0);
   }
  });
  it(type+' does not turn unsupported drain current into a zero difference',()=>{
   const a=compare(4,-.5,3);
   expect(a.signedChangeMilliamp).toBeNull();expect(a.magnitudeChangeMilliamp).toBeNull();
   expect(a.current.selected).toBeNull();expect(a.reference.selected).toBeNull();
  });
 }
 it('rejects incompatible or malformed references',()=>{
  const m=c.mosfet('mosfet-n',3,.5);
  for(const r of [null,{}, {gate:-3,polarity:-1},{gate:-3,polarity:1},{gate:6,polarity:1},{gate:'3',polarity:1},{gate:NaN,polarity:1},{gate:Infinity,polarity:1}])expect(c.mosGateComparison(m,r)).toBeNull();
 });
 it('never mutates the reference or the electrical model',()=>{
  const m=Object.freeze(c.mosfet('mosfet-n',4,.5)),r=Object.freeze({gate:3,polarity:1});
  const before=JSON.stringify([m,r]);c.mosGateComparison(m,r);expect(JSON.stringify([m,r])).toBe(before);
 });
 it('accepts a shared scale without clipping a conducting curve',()=>{
  const m=c.mosfet('mosfet-n',5,10),base=c.mosCurve(m),wide=c.mosCurve(m,20),small=c.mosCurve(m,.01);
  expect(wide.yMaxMilliamp).toBe(20);expect(small.yMaxMilliamp).toBe(base.yMaxMilliamp);
  expect(wide.selected.y).toBeGreaterThan(base.selected.y);
 });
 it('ignores invalid shared scales',()=>{
  const m=c.mosfet('mosfet-p',-3,-.5),base=c.mosCurve(m);
  for(const scale of [0,-1,NaN,Infinity,'3'])expect(c.mosCurve(m,scale)).toEqual(base);
 });
});
