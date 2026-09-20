import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const s=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const {sweep,point,step}=new Function('var TAU=2*Math.PI;'+s.slice(s.indexOf('  function solveKepler(M, e, tol)'),s.indexOf('  /** Human-readable orbital phase'))+';return {sweep:orbitRhythmSweep,point:orbitRhythmPoint,step:orbitRhythmStep};')();
const area=ps=>Math.abs(ps.reduce((sum,p,i)=>{const q=ps[(i+1)%ps.length];return sum+p.x*q.y-p.y*q.x;},0))/2;
describe('moving equal-time orbital wedge',()=>{
 for(const e of [0,.01671,.20564,.8471,.9671])it('keeps equal area through every phase at eccentricity '+e,()=>{
  const b={a:17.83,T:75.3,e},expected=Math.PI*92*92*Math.sqrt(1-e*e)/12;
  for(let j=0;j<120;j++){const time=b.T*j/120,w=sweep(b,time),p=point(b,time),next=point(b,step(time,b.T,1));expect(w.points).toHaveLength(130);expect(Math.abs(area(w.points)/expected-1)).toBeLessThan(.0003);expect(w.points[1].x).toBeCloseTo(p.x,6);expect(w.points[1].y).toBeCloseTo(p.y,6);expect(w.next.x).toBeCloseTo(next.x,6);expect(w.next.y).toBeCloseTo(next.y,6);expect(w.path).not.toMatch(/NaN|Infinity/);}
 });
 it('wraps cleanly across perihelion and negative time',()=>{const b={a:1,T:2,e:.20564};expect(sweep(b,-.05).path).toBe(sweep(b,1.95).path);expect(sweep(b,0).path).toBe(sweep(b,2).path);expect(sweep(b,1.95).next.y).toBeLessThan(120);});
});
