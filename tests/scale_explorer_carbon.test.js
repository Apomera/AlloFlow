import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const start=source.indexOf('  function carbonOrbitalDensity('),end=source.indexOf('  var HELIO_CROSSINGS=',start);
if(start<0||end<start)throw new Error('Carbon orbital helpers missing');
const {carbonOrbitalDensity:density,carbonRadialTable:table}=vm.runInNewContext(source.slice(start,end)+'\n({carbonOrbitalDensity,carbonRadialTable});');

describe('Qualitative carbon orbital density',()=>{
 it('keeps the 1s density spherical, positive and decreasing from the nucleus',()=>{
  let previous=Infinity;
  for(const r of [0,.01,.035,.07,.14,.35,.7]){
   const value=density('1s',r,0,0);
   expect(value).toBeGreaterThan(0);
   expect(value).toBeLessThan(previous);
   expect(density('1s',0,r,0)).toBeCloseTo(value,14);
   expect(density('1s',0,0,-r)).toBeCloseTo(value,14);
   previous=value;
  }
 });
 it('places the 2s radial node on a spherical surface with density on both sides',()=>{
  const r=.15;
  for(const p of [[r,0,0],[0,-r,0],[0,0,r],[r/Math.sqrt(3),r/Math.sqrt(3),r/Math.sqrt(3)]])expect(density('2s',...p)).toBeLessThan(1e-28);
  expect(density('2s',.14,0,0)).toBeGreaterThan(0);
  expect(density('2s',.16,0,0)).toBeGreaterThan(0);
  expect(density('2s',0,0,0)).toBe(1);
 });
 it('keeps the 2p nodal plane empty and its two lobes symmetric',()=>{
  for(const x of [-.3,0,.3])for(const z of [-.3,0,.3])expect(density('2p',x,0,z)).toBe(0);
  for(const y of [.02,.1,.3]){
   expect(density('2p',0,y,0)).toBeGreaterThan(0);
   expect(density('2p',.05,y,.08)).toBeCloseTo(density('2p',.05,-y,.08),14);
  }
 });
 it('builds finite monotonic radius distributions for every displayed subshell',()=>{
  for(const kind of ['1s','2s','2p']){
   const cdf=table(kind);
   expect(cdf[0]).toBe(0);
   expect(cdf.at(-1)).toBe(1);
   for(let i=1;i<cdf.length;i++){
    expect(Number.isFinite(cdf[i])).toBe(true);
    expect(cdf[i]).toBeGreaterThanOrEqual(cdf[i-1]);
   }
  }
 });
 it('includes the spherical volume factor when sampling the compact core',()=>{
  const cdf=table('1s'),step=.7/(cdf.length-1);
  let mean=0;
  for(let i=1;i<cdf.length;i++)mean+=(i-.5)*step*(cdf[i]-cdf[i-1]);
  // For r² exp(-2r/a), the mean radius is 3a/2; an omitted r² fails this check.
  expect(mean).toBeCloseTo(1.5*.035,5);
 });
});
