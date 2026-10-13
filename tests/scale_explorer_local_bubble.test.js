import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),start=source.indexOf('  var LOCAL_BUBBLE_MAP='),end=source.indexOf('  function carbonOrbitalDensity(',start);
if(start<0||end<start)throw new Error('Local Bubble map helpers missing');
const api=vm.runInNewContext('function clamp(x,a,b){return Math.max(a,Math.min(b,x));}\n'+source.slice(start,end)+'\n({LOCAL_BUBBLE_MAP,BUBBLE_REFERENCE_PC,BUBBLE_FRAME,bubblePoint,bubbleSample,bubbleSurfaceData});');
describe('Local Bubble dust-map calibration',()=>{
 it('preserves parsec lengths and uses a right-handed Galactic coordinate frame',()=>{
  const unit=3.085677581491367e16/9.5e18;
  const directions=[[0,0,[1,0,0]],[90,0,[0,0,-1]],[0,90,[0,1,0]]];
  for(const [l,b,expected]of directions){const point=api.bubblePoint(l,b,100);for(let k=0;k<3;k++)expect(point[k]).toBeCloseTo(expected[k]*100*unit,12);}
  expect(Math.hypot(...api.bubblePoint(120,60,100))).toBeCloseTo(100*unit,12);
  expect(Math.hypot(...api.bubblePoint(120,60,0))).toBe(0);
 });
 it('closes angular seams and keeps polar positions unique',()=>{
  const map=api.LOCAL_BUBBLE_MAP,nx=map.longitudeSegments,ny=map.latitudeSegments;
  for(let y=0;y<=ny;y++)expect(Array.from(map.samples[y*(nx+1)])).toEqual(Array.from(map.samples[y*(nx+1)+nx]));
  for(let x=0;x<=nx;x++)for(const y of [0,ny])expect(Array.from(map.samples[y*(nx+1)+x])).toEqual(Array.from(map.samples[y*(nx+1)]));
  expect(Array.from(api.bubbleSample(-90,0))).toEqual(Array.from(api.bubbleSample(270,0)));
  expect(Array.from(api.bubbleSample(360,0))).toEqual(Array.from(api.bubbleSample(0,0)));
 });
 it('retains finite ordered shell edges and nonnegative density for every sample',()=>{
  for(const row of api.LOCAL_BUBBLE_MAP.samples){expect(row.every(Number.isFinite)).toBe(true);expect(row[1]).toBeGreaterThanOrEqual(69);expect(row[1]).toBeLessThanOrEqual(row[0]);expect(row[0]).toBeLessThanOrEqual(row[2]);expect(row[2]).toBeLessThanOrEqual(633);expect(row[3]).toBeGreaterThan(0);expect(row[4]).toBeGreaterThanOrEqual(0);}
 });
 it('preserves the asymmetric research bounds instead of fitting a unit sphere',()=>{
  const peak=api.bubbleSurfaceData(0),pc=api.BUBBLE_REFERENCE_PC;
  const expectedMin=[-281.683737655,-286.125160384,-436.633286883],expectedMax=[263.325959524,590.432738803,337.758491366];
  for(let k=0;k<3;k++){expect(peak.min[k]*pc).toBeCloseTo(expectedMin[k],5);expect(peak.max[k]*pc).toBeCloseTo(expectedMax[k],5);}
  expect(peak.max[1]-peak.min[1]).toBeGreaterThan(2.8);
  for(let k=0;k<3;k++){expect(api.BUBBLE_FRAME.min[k]).toBeLessThan(0);expect(api.BUBBLE_FRAME.max[k]).toBeGreaterThan(0);}
 });
 it('avoids interpolated walls across abrupt radial discontinuities',()=>{
  const d=api.bubbleSurfaceData(0),rows=api.LOCAL_BUBBLE_MAP.samples;
  expect(d.positions.every(Number.isFinite)).toBe(true);expect(d.indices.length).toBeGreaterThan(30000);
  for(let i=0;i<d.indices.length;i+=3){const ids=d.indices.slice(i,i+3);expect(ids.every(n=>n>=0&&n<rows.length)).toBe(true);const r=ids.map(n=>rows[n][0]);expect(Math.max(...r)-Math.min(...r)).toBeLessThanOrEqual(90);}
 });
});
