import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const start=source.indexOf('  function solveKepler(M, e, tol)'),end=source.indexOf('  /** Human-readable orbital phase',start);
const {profile,point}=new Function('var TAU=2*Math.PI,AU_KM=1.496e8,G_SI=6.674e-11,M_SUN=1.989e30;'+source.slice(start,end)+';return {profile:orbitSpeedProfile,point:orbitSpeedPoint};')();
describe('zero-based orbit speed profile',()=>{
 for(const e of [0,.01671,.20564,.9671])it('preserves vis-viva speed and endpoints for eccentricity '+e,()=>{
  const body={a:1,T:1,e},chart=profile(body),first=chart.points[0],middle=chart.points[96],last=chart.points[192];
  expect(chart.points).toHaveLength(193);expect(first.x).toBe(44);expect(last.x).toBe(304);expect(first.speed).toBeCloseTo(last.speed,10);expect(first.y).toBeCloseTo(last.y,10);
  const circular=Math.sqrt(6.674e-11*1.989e30/(1.496e8*1000))/1000;
  expect(first.speed).toBeCloseTo(circular*Math.sqrt((1+e)/(1-e)),8);expect(middle.speed).toBeCloseTo(circular*Math.sqrt((1-e)/(1+e)),8);
  chart.points.forEach((p,i)=>{expect(p.x).toBeCloseTo(44+260*i/192,8);expect(p.y).toBeGreaterThanOrEqual(32);expect(p.y).toBeLessThan(108);expect((108-p.y)/76).toBeCloseTo(p.speed/chart.ceiling,10);expect(p.speed).toBeCloseTo(chart.points[192-i].speed,7);});
  if(e===0)expect(Math.max(...chart.points.map(p=>p.y))-Math.min(...chart.points.map(p=>p.y))).toBeLessThan(1e-9);
 });
 it('keeps Earth nearly flat while showing Mercury variation',()=>{const span=e=>{const c=profile({a:1,T:1,e});return c.points[96].y-c.points[0].y;};expect(span(.01671)).toBeLessThan(3);expect(span(.20564)).toBeGreaterThan(20);});
 it('wraps the live cursor at full orbits, including negative time',()=>{const b={a:.387,T:.241,e:.20564},c=profile(b);expect(point(b,0,c.ceiling)).toEqual(point(b,b.T,c.ceiling));expect(point(b,-b.T/4,c.ceiling).x).toBeCloseTo(239,8);expect(point(b,10.5*b.T,c.ceiling).x).toBeCloseTo(174,8);});
});
