import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const s=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const {inspect,position,velocity}=new Function('var TAU=2*Math.PI,AU_KM=1.496e8,G_SI=6.674e-11,M_SUN=1.989e30;'+s.slice(s.indexOf('  function solveKepler(M, e, tol)'),s.indexOf('  /** Human-readable orbital phase'))+';return {inspect:orbitSpeedInspection,position:orbitalPos,velocity:orbitalVelocity};')();
describe('same-distance orbit inspection',()=>{
 for(const e of [.01671,.20564,.9671])it('matches distance and speed but reverses radial motion at e='+e,()=>{
  const body={a:1,T:2,e};for(const phase of [.001,.1,.25,.499,.6,.95]){
   const a=inspect(body,phase*body.T,300),b=inspect(body,a.otherTime,300);expect(a.canCompare).toBe(true);expect(a.point.speed).toBeCloseTo(a.other.speed,7);expect(b.otherTime).toBeCloseTo(phase*body.T,8);
   const p=position(body.a,e,2*Math.PI*phase),q=position(body.a,e,2*Math.PI*(1-phase)),v=velocity(body.a,e,2*Math.PI*phase),w=velocity(body.a,e,2*Math.PI*(1-phase));expect(p.r).toBeCloseTo(q.r,8);expect(p.x).toBeCloseTo(q.x,8);expect(p.y).toBeCloseTo(-q.y,8);expect((p.x*v.x+p.y*v.y)/p.r).toBeCloseTo(-(q.x*w.x+q.y*w.y)/q.r,7);
   expect(a.reading).toContain(phase<.5?'away':'toward');
  }
 });
 it('keeps both endpoints selectable and suppresses coincident markers',()=>{const b={a:.387,T:.241,e:.20564};for(const t of [0,b.T/2,b.T,b.T*3])expect(inspect(b,t,60).canCompare).toBe(false);expect(inspect(b,0,60).point.x).toBe(44);expect(inspect(b,b.T,60).point.x).toBe(304);expect(inspect(b,b.T,60).reading).toContain('100.0%');});
 it('does not imply a unique matching distance for a circular orbit',()=>{const i=inspect({a:1,T:1,e:0},.25,40);expect(i.canCompare).toBe(false);expect(i.reading).toContain('constant distance');});
 it('normalizes negative and multi-cycle time',()=>{const b={a:1,T:2,e:.2};expect(inspect(b,-.5,40).point.phase).toBe(.75);expect(inspect(b,10.5,40).otherTime).toBe(1.5);});
});
