import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const s=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const {arrow,point}=new Function('var TAU=2*Math.PI,AU_KM=1.496e8,G_SI=6.674e-11,M_SUN=1.989e30;'+s.slice(s.indexOf('  function solveKepler(M, e, tol)'),s.indexOf('  /** Human-readable orbital phase'))+';return {arrow:orbitRhythmDirection,point:orbitRhythmPoint};')();
describe('orbit rhythm direction arrows',()=>{
 for(const e of [0,.01671,.20564,.9671])it('follows the forward tangent with fixed length at eccentricity '+e,()=>{
 const body={a:1,T:2,e};for(const phase of [0,.03,.15,.25,.5,.75,.93]){const time=phase*body.T,a=arrow(body,time),p=point(body,time),next=point(body,time+1e-7),prev=point(body,time-1e-7),dx=next.x-prev.x,dy=next.y-prev.y,n=Math.hypot(dx,dy);expect(a.ux).toBeCloseTo(dx/n,5);expect(a.uy).toBeCloseTo(dy/n,5);expect(Math.hypot(a.tip.x-a.start.x,a.tip.y-a.start.y)).toBeCloseTo(24,8);expect(Math.hypot(a.start.x-p.x,a.start.y-p.y)).toBeCloseTo(10,8);expect(a.path).not.toMatch(/NaN|Infinity/);}
 });
 it('distinguishes direction at same-speed paired points',()=>{const b={a:.387,T:.241,e:.20564},a=arrow(b,.25*b.T),c=arrow(b,.75*b.T);expect(a.ux).toBeCloseTo(-c.ux,8);expect(a.uy).toBeCloseTo(c.uy,8);expect(a.ux).toBeLessThan(0);expect(c.ux).toBeGreaterThan(0);});
 it('points sideways at distance turning points and wraps with the orbit',()=>{const b={a:1,T:1,e:.2};expect(arrow(b,0).ux).toBeCloseTo(0,8);expect(arrow(b,0).uy).toBeCloseTo(-1,8);expect(arrow(b,.5).uy).toBeCloseTo(1,8);expect(arrow(b,1).path).toBe(arrow(b,0).path);});
});
