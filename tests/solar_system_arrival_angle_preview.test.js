import {describe,it,expect} from 'vitest';import {readFileSync} from 'node:fs';
const s=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');const preview=new Function(s.slice(s.indexOf('  function arrivalAnglePreview('),s.indexOf('  function marsArrivalGeometry('))+';return arrivalAnglePreview;')();
const solver=s.slice(s.indexOf('  function solveKepler('),s.indexOf('  /** Human-readable orbital phase')),model=s.slice(s.indexOf('  function hohmann('),s.indexOf('  /** Synodic period'));
const rendezvous=new Function('var PI=Math.PI,TAU=2*PI,AU_KM=1.496e8,G_SI=6.674e-11,M_SUN=1.989e30;'+solver+model+';return transferRendezvous;')();
describe('arrival angle preview',()=>{
 it('matches the existing transfer model throughout the slider range',()=>{for(let angle=-60;angle<=60;angle++){expect(preview(angle).gap*1.524).toBeCloseTo(rendezvous(1,1.524,1,angle).separation,8);}});
 it('puts a zero gap at the craft and curve minimum',()=>{expect(preview(0)).toMatchObject({angle:0,gap:0,ratio:0,x:180,y:108,chartX:150,chartY:132});});
 it('mirrors positions while preserving distance',()=>{const a=preview(37),b=preview(-37);expect(a.gap).toBe(b.gap);expect(a.x).toBe(b.x);expect(a.y+b.y).toBeCloseTo(216);expect(a.chartX+b.chartX).toBe(300);expect(a.chartY).toBe(b.chartY);});
 it('normalizes ratios to the 30 degree model gap',()=>{expect(preview(30).ratio).toBeCloseTo(1,10);expect(preview(-30).ratio).toBeCloseTo(1,10);expect(preview(60).gap).toBeCloseTo(1,10);expect(preview(60).ratio).toBeCloseTo(1.93185,5);});
 it('clamps out of range angles and rejects nonfinite values',()=>{expect(preview(100).angle).toBe(60);expect(preview(-100).angle).toBe(-60);for(const value of [undefined,null,NaN,Infinity,'30'])expect(preview(value).angle).toBe(0);});
 it('keeps normalized points on the orbit and within the chart',()=>{for(let angle=-60;angle<=60;angle++){const p=preview(angle);expect(Math.hypot(p.x-108,p.y-108)).toBeCloseTo(72,9);expect(p.chartX).toBeGreaterThanOrEqual(30);expect(p.chartX).toBeLessThanOrEqual(270);expect(p.chartY).toBeGreaterThanOrEqual(42);expect(p.chartY).toBeLessThanOrEqual(132);}});
});
