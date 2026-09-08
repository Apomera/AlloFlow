import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
const start = source.indexOf('  function solveKepler(M, e, tol)');
const end = source.indexOf('  /** Human-readable orbital phase', start);
const { point, geometry, step } = new Function('var TAU=2*Math.PI;'+source.slice(start,end)+';return {point:orbitRhythmPoint,geometry:orbitRhythmGeometry,step:orbitRhythmStep};')();
const area = points => Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-p.y*q.x;},0))/2;
describe('Orrery orbit rhythm geometry',()=>{
  for(const e of [0,0.01671,0.20564,0.8471,0.9671]) {
    it('preserves the ellipse and equal swept areas at eccentricity '+e,()=>{
      const body={a:17.83,T:75.3,e};
      const g=geometry(body);
      expect(g.marks).toHaveLength(12);
      const expectedArea=Math.PI*92*92*Math.sqrt(1-e*e)/12;
      for(const sector of g.sectors) expect(Math.abs(area(sector)/expectedArea-1)).toBeLessThan(0.0002);
      for(const p of g.marks) expect(((p.x-160)/92)**2+((p.y-120)/(92*Math.sqrt(1-e*e)))**2).toBeCloseTo(1,8);
      expect(point(body,0).x).toBeCloseTo(252,8);
      expect(point(body,body.T/2).x).toBeCloseTo(68,8);
      expect(point(body,body.T)).toEqual(point(body,0));
    });
  }
  it('shows wider equal-time spacing near perihelion for Mercury',()=>{
    const {marks}=geometry({a:0.387,T:0.241,e:0.20564});
    const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    expect(gap(marks[0],marks[1])).toBeGreaterThan(gap(marks[6],marks[7])*1.3);
  });
  it('steps from the live phase and wraps repeatedly without losing a cycle',()=>{
    for(const period of [0.241,1,75.3,557]) {
      let time=0;
      for(let i=0;i<12;i++)time=step(time,period,1);
      expect(time).toBe(0);
      expect(step(0,period,-1)).toBeCloseTo(period*11/12,8);
      expect(step(period*5.2,period,1)).toBeCloseTo(period*(0.2+1/12),8);
      expect(step(step(period*0.2,period,1),period,-1)).toBeCloseTo(period*0.2,8);
    }
  });
});
