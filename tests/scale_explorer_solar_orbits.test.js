import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),marker="  window.StemLab.registerTool('scaleExplorer', {",sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.orbitChecks={orbits:SOLAR_ORBITS,max:SOLAR_MAX_YEARS,years:solarYearsValue,kepler:solarKepler,position:solarPosition,point:solarOrbitPoint,apsides:solarApsides,detail:solarDetail,details:atlasDetails,notes:readObservations,limit:inspectionLimit,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.orbitChecks,plain=x=>JSON.parse(JSON.stringify(x)),AU=149597870700,U=9e12;
const vectorDistance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const details=plain(api.details('solar-system',(_,fallback)=>fallback));
const reference=JSON.parse(fs.readFileSync('tests/fixtures/scale-explorer-solar-orbits.json','utf8'));
describe('Scale Explorer fixed-element planetary orbits',()=>{
 it('matches independent bisection and JPL component rotation fixtures',()=>{for(const planet of reference.planets){const orbit=api.orbits.find(o=>o.id===planet.id);for(const s of planet.states){const actual=api.kepler(orbit,s.years);expect(vectorDistance(actual.position,s.position)).toBeLessThan(1e-11);expect(actual.rAU).toBeCloseTo(s.rAU,9);}}});
 it('keeps the 9 trillion metre reference and all eight distinct ellipses',()=>{
  expect(api.items.find(x=>x.id==='solar-system').size).toBe(U);expect(api.orbits.map(x=>x.id)).toEqual(['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']);
  for(const o of api.orbits){expect([o.au,o.e,o.i,o.L,o.varpi,o.node,o.periodYears].every(Number.isFinite)).toBe(true);expect(o.e).toBeGreaterThan(0);expect(o.e).toBeLessThan(1);expect(o.au).toBeGreaterThan(0);expect(o.periodYears).toBeGreaterThan(0);}
 });
 it('bounds elapsed years without accepting malformed persisted values',()=>{
  expect(api.max).toBe(164.79132);for(const v of [undefined,null,NaN,Infinity,-Infinity,'1',{},[],true])expect(api.years(v)).toBe(0);expect(api.years(-1)).toBe(0);expect(api.years(.5)).toBe(.5);expect(api.years(1e9)).toBe(api.max);
 });
 it('solves Kepler’s equation at every sampled epoch',()=>{
  for(const o of api.orbits)for(let i=0;i<=100;i++){const p=api.kepler(o,api.max*i/100);expect([...p.position,p.meanAnomaly,p.eccentricAnomaly,p.rAU].every(Number.isFinite)).toBe(true);expect(p.eccentricAnomaly-o.e*Math.sin(p.eccentricAnomaly)).toBeCloseTo(p.meanAnomaly,11);expect(Math.hypot(...p.position)*U/AU).toBeCloseTo(p.rAU,10);expect(p.rAU).toBeGreaterThanOrEqual(o.au*(1-o.e)-1e-10);expect(p.rAU).toBeLessThanOrEqual(o.au*(1+o.e)+1e-10);}
 });
 it('places the Sun at an ellipse focus, with exact perihelion and aphelion radii',()=>{
  for(const o of api.orbits){const a=api.apsides(o);expect(Math.hypot(...a.perihelion)*U/AU).toBeCloseTo(o.au*(1-o.e),10);expect(Math.hypot(...a.aphelion)*U/AU).toBeCloseTo(o.au*(1+o.e),10);expect(a.perihelionAU).toBeCloseTo(o.au*(1-o.e),12);expect(a.aphelionAU).toBeCloseTo(o.au*(1+o.e),12);
   const focus2=a.perihelion.map((v,i)=>v+a.aphelion[i]);for(let i=0;i<24;i++){const p=api.point(o,i/24*2*Math.PI);expect((Math.hypot(...p)+vectorDistance(p,focus2))*U/AU).toBeCloseTo(2*o.au,9);}}
 });
 it('closes each orbit and keeps its measured inclination',()=>{
  for(const o of api.orbits){expect(vectorDistance(api.point(o,0),api.point(o,2*Math.PI))).toBeLessThan(1e-13);const a=api.point(o,0),b=api.point(o,Math.PI/2),n=cross(a,b),inclination=Math.acos(Math.min(1,Math.abs(n[1])/Math.hypot(...n)))*180/Math.PI;expect(inclination).toBeCloseTo(Math.abs(o.i),6);const p=api.position(o,0),q=api.position(o,o.periodYears);expect(vectorDistance(p,q)).toBeLessThan(1e-12);}
 });
 it('sweeps equal areas in equal time while moving faster near perihelion',()=>{
  const o=api.orbits[0],n=1000,step=o.periodYears/n,areas=[];let slow=Infinity,fast=0;
  for(let i=0;i<n;i++){const p=api.position(o,i*step),q=api.position(o,(i+1)*step);areas.push(Math.hypot(...cross(p,q))/2);const speed=vectorDistance(p,q)/step;slow=Math.min(slow,speed);fast=Math.max(fast,speed);}
  expect(Math.max(...areas)/Math.min(...areas)).toBeLessThan(1.0001);expect(fast/slow).toBeCloseTo((1+o.e)/(1-o.e),3);
 });
 it('offers twelve distinct source-linked camera destinations while retaining old identifiers',()=>{
  const ids=['system-overview','orbital-plane','inner-orbits','asteroid-belt',...api.orbits.map(o=>o.id+'-orbit')];expect(details.map(d=>d.id).sort()).toEqual(ids.sort());for(const d of details){expect([...d.at,...d.view,d.zoom].every(Number.isFinite)).toBe(true);expect(d.zoom).toBeLessThanOrEqual(api.limit('solar-system'));expect(d.source).toMatch(/^https:\/\//);}
 });
 it('moves only a selected planet’s camera target with the shared elapsed time',()=>{
  for(const d of details){const original=plain(d),updated=plain(api.detail(d,17.25)),orbit=api.orbits.find(o=>o.id+'-orbit'===d.id);expect(d).toEqual(original);if(orbit){expect(updated.at).toEqual(plain(api.position(orbit,17.25)));expect(updated.au).toBeCloseTo(api.kepler(orbit,17.25).rAU,11);expect(updated.periodYears).toBe(orbit.periodYears);}else expect(updated.at).toEqual(d.at);}
 });
 it('preserves bounded elapsed time in observations and defaults older notes to epoch zero',()=>{
  for(const d of details){const raw={itemId:'solar-system',detailId:d.id,solarYears:17.25,zoom:d.zoom,yaw:.3,pitch:.6,note:'Elapsed years',view:'atlas'},notes=plain(api.notes([raw]));expect(notes).toHaveLength(1);const {yaw,...rest}=raw;expect(notes[0]).toMatchObject(rest);expect(notes[0].yaw).toBeCloseTo(yaw,12);}
  expect(api.notes([{itemId:'solar-system',detailId:'earth-orbit'}])[0].solarYears).toBe(0);expect(api.notes([{itemId:'solar-system',detailId:'earth-orbit',solarYears:1e8}])[0].solarYears).toBe(api.max);expect(api.notes([{itemId:'solar-system',detailId:'earth-orbit',solarYears:'bad'}])[0].solarYears).toBe(0);
 });
});
