import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let c;beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');c=window.__SemiconductorCore;});
describe('Linked MOSFET output curve',()=>{
 for(const [type,p,beta] of [['mosfet-n',1,1],['mosfet-p',-1,.5]]){
  const curve=(gate,drain)=>c.mosCurve(c.mosfet(type,gate*p,drain*p));
  it(type+' places saturation at the electrical boundary and current',()=>{
   const a=curve(3,1.5);expect(a.boundary).toBe(1.5);expect(a.peakMilliamp).toBeCloseTo(beta*1.125,12);
   expect(a.selected.x).toBe(a.boundaryX);expect(a.selected.y).toBe(a.bezier.end.y);
  });
  it(type+' draws the nonlinear triode branch through the model readings',()=>{
   for(const gate of [1.6,2,3,5])for(const t of [.1,.25,.6,.9]){
    const m=c.mosfet(type,gate*p,(gate-1.5)*t*p),a=c.mosCurve(m),q=a.bezier;
    const x=(1-t)**2*q.start.x+2*(1-t)*t*q.control.x+t*t*q.end.x;
    const y=(1-t)**2*q.start.y+2*(1-t)*t*q.control.y+t*t*q.end.y;
    expect(x).toBeCloseTo(a.selected.x,10);expect(y).toBeCloseTo(a.selected.y,10);
   }
  });
  it(type+' keeps the signed current while plotting positive magnitudes',()=>{
   for(const d of [0,.5,1.5,5,10]){
    const a=curve(3,d),m=c.mosfet(type,3*p,d*p);
    expect(a.selected.drainVoltage).toBe(d*p);expect(a.selected.currentA).toBe(m.currentA);
    expect(a.selected.region).toBe(m.region);expect(a.selected.x).toBeCloseTo(a.bounds.left+d/10*(a.bounds.right-a.bounds.left),12);
    expect(a.selected.y).toBeLessThanOrEqual(a.bounds.bottom);
   }
  });
  it(type+' preserves saturated current as the point moves to higher drain bias',()=>{
   const a=curve(3,1.5),b=curve(3,10);
   expect(b.selected.y).toBe(a.selected.y);expect(b.selected.x).toBe(b.bounds.right);
   expect(b.selected.currentA).toBe(a.selected.currentA);expect(b.flatPath).toBe(a.flatPath);
  });
  it(type+' changes both the boundary and the current scale with gate drive',()=>{
   const a=curve(2.5,5),b=curve(3.5,5);
   expect(b.boundary/a.boundary).toBe(2);expect(b.peakMilliamp/a.peakMilliamp).toBe(4);
   expect(b.yMaxMilliamp/a.yMaxMilliamp).toBe(4);
  });
  it(type+' renders zero current without a false saturation boundary at cutoff or threshold',()=>{
   for(const gate of [0,1,1.5]){
    const a=curve(gate,5);expect(a.peakMilliamp).toBe(0);expect(a.boundary).toBeNull();
    expect(a.bezier).toBeNull();expect(a.linearPath).toBeNull();expect(a.yMaxMilliamp).toBeGreaterThan(0);
    expect(a.selected.y).toBe(a.bounds.bottom);
   }
  });
  it(type+' withholds an invalid operating point while retaining the supported curve',()=>{
   const a=curve(3,-5);expect(a.selected).toBeNull();expect(a.peakMilliamp).toBeGreaterThan(0);
   expect(a.linearPath).not.toMatch(/NaN|Infinity/);
  });
 }
 it('does not change the live model when generating a curve',()=>{
  const m=Object.freeze(c.mosfet('mosfet-n',3,.5)),before=JSON.stringify(m);
  c.mosCurve(m);expect(JSON.stringify(m)).toBe(before);
 });
 it('keeps the optional curve collapsed on the initial cutaway',()=>{
  const html=renderTool('semiconductor',{semiconductor:{subtool:'transistor',deviceView:'3d',gateVoltage:3,drainVoltage:.5}});
  expect(html).toContain('Explore the current–voltage curve');expect(html).toContain('data-mos-cutaway');
  expect(html).not.toContain('data-mos-curve=');expect(html).not.toContain('Drain-bias magnitude on the current–voltage curve');
 });
});
