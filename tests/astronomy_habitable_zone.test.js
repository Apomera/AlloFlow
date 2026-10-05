import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const OUT='reports/sky-lab-habitable-zone-2026-10-01';
let model;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_astronomy.js','astronomy');model=window.__alloAstroPure.habitableZoneModel;});
const state=(t=5772,l=1,r=1,a=.294)=>({hzTemperatureK:t,hzLuminosity:l,hzDistanceAu:r,hzAlbedo:a});
const doc=saved=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'exoplanets',observingList:[],...saved}}),'text/html');
const polynomial=(t,c)=>c.reduceRight((sum,value)=>sum*t+value,0);

describe('Published model and NASA reference inputs',()=>{
 it('pins source snapshots with normalized checksums',()=>{
  const records=JSON.parse(readFileSync(OUT+'/download-provenance.json','utf8'));
  expect(records).toHaveLength(5);
  for(const p of records){expect(p.status).toBe(200);expect(createHash('sha256').update(readFileSync(OUT+'/'+p.file,'utf8').replace(/\r\n/g,'\n')).digest('hex')).toBe(p.sha256);}
 });
 it('uses the author coefficients for the one-Earth-mass conservative columns',()=>{
  const rows=readFileSync(OUT+'/coefficients.dat','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).map(l=>l.trim().split(/\s+/).map(Number));
  const m=model({});expect(rows).toHaveLength(5);
  expect(m.inner.coefficients).toEqual(rows.map(r=>r[1]));expect(m.outer.coefficients).toEqual(rows.map(r=>r[2]));
  const fortran=readFileSync(OUT+'/author-model.f90','utf8');expect(fortran).toContain('tstar = teff - 5780.0d0');
 });
 it.each([['venus',.72333199,.77,737],['earth',1.00000011,.294,288],['mars',1.52366231,.25,214]])('retains the published %s orbital and reflectivity inputs',(id,r,a,k)=>{
  const m=model(state(5772,1,r,a)),p=m.reference;expect(p.id).toBe(id);expect(p.surfaceK).toBe(k);expect(p.distanceAu).toBe(r);expect(p.albedo).toBe(a);
  const html=readFileSync(OUT+'/'+id+'-facts.html','utf8');expect(html).toContain(String(r));expect(html).toContain(String(a));expect(html).toContain(String(k));
 });
 it('uses nominal solar temperature while preserving the paper polynomial origin',()=>{
  const m=model({});expect(m.temperatureK).toBe(5772);expect(m.luminosity).toBe(1);
  expect(m.inner.flux).toBeCloseTo(polynomial(-8,[1.107,1.332e-4,1.58e-8,-8.308e-12,-1.931e-15]),13);
  expect(m.inner.flux).not.toBe(1.107);expect(model(state(5780)).inner.flux).toBe(1.107);expect(model(state(5780)).outer.flux).toBe(.356);
 });
 it('keeps the Earth equilibrium estimate distinct from its surface reference',()=>{
  const m=model({});expect(m.reference.id).toBe('earth');expect(m.equilibriumK).toBeGreaterThan(254);expect(m.equilibriumK).toBeLessThan(256);
  expect(m.reference.surfaceK).toBe(288);expect(m.regime).toBe('within');
 });
 it('returns independent source objects and coefficient arrays',()=>{
  const m=model({});m.references[0].albedo=0;m.reference.surfaceK=900;m.inner.coefficients[0]=99;
  const next=model({});expect(next.references[0].albedo).toBe(.77);expect(next.reference.surfaceK).toBe(288);expect(next.inner.coefficients[0]).toBe(1.107);
 });
});

describe('Climate limits and energy conservation',()=>{
 it.each([2600,3000,5772,5780,7000,7200])('evaluates both fourth-order flux boundaries at %s K',temperature=>{
  const m=model(state(temperature,3,1,.4));
  for(const b of m.boundaries){expect(b.flux).toBeCloseTo(polynomial(temperature-5780,b.coefficients),12);expect(b.distanceAu).toBeCloseTo(Math.sqrt(3/b.flux),12);}
  expect(m.inner.distanceAu).toBeLessThan(m.outer.distanceAu);
 });
 it('moves both zone boundaries with the square root of luminosity',()=>{
  const a=model(state(4000,1)),b=model(state(4000,4));
  expect(b.inner.distanceAu/a.inner.distanceAu).toBe(2);expect(b.outer.distanceAu/a.outer.distanceAu).toBe(2);
  expect(b.flux/a.flux).toBe(4);expect(b.equilibriumK/a.equilibriumK).toBeCloseTo(Math.sqrt(2),12);
 });
 it('makes doubling orbital distance reduce incident light to a quarter',()=>{
  const a=model(state(5772,1,.7,.3)),b=model(state(5772,1,1.4,.3));
  expect(a.irradiance/b.irradiance).toBeCloseTo(4,12);expect(a.equilibriumK/b.equilibriumK).toBeCloseTo(Math.sqrt(2),12);expect(a.boundaries).toEqual(b.boundaries);
 });
 it('conserves reflected plus absorbed light and averages over the globe',()=>{
  for(const albedo of[0,.25,.294,.77,.9]){
   const m=model(state(6000,2.1,1.3,albedo));
   expect(m.reflected+m.absorbed).toBeCloseTo(m.irradiance,10);expect(m.reflectedFraction+m.absorbedFraction).toBe(1);
   expect(m.meanAbsorbed).toBe(m.absorbed/4);expect(5.670374419e-8*m.equilibriumK**4).toBeCloseTo(m.meanAbsorbed,9);
  }
 });
 it('does not use the simple albedo control to alter published climate boundaries',()=>{
  const a=model(state(5772,1,1,.25)),b=model(state(5772,1,1,.75));
  expect(a.boundaries).toEqual(b.boundaries);expect(a.regime).toBe(b.regime);expect(a.irradiance).toBe(b.irradiance);
  expect(a.absorbed/b.absorbed).toBe(3);expect(a.equilibriumK/b.equilibriumK).toBeCloseTo(3**.25,12);
 });
 it('changes climate flux limits with spectral temperature at fixed luminosity',()=>{
  const a=model(state(3000)),b=model(state(7000));expect(a.irradiance).toBe(b.irradiance);expect(a.equilibriumK).toBe(b.equilibriumK);
  expect(a.inner.distanceAu).not.toBe(b.inner.distanceAu);
 });
 it('classifies exact boundaries inclusively and their adjacent sides correctly',()=>{
  const m=model(state()),lo=m.inner.distanceAu,hi=m.outer.distanceAu;
  expect(model(state(5772,1,lo*.999)).regime).toBe('inner');expect(model(state(5772,1,lo)).regime).toBe('within');
  expect(model(state(5772,1,hi)).regime).toBe('within');expect(model(state(5772,1,hi*1.001)).regime).toBe('outer');
  expect(model(state(5772,1,m.zoneCenterAu)).regime).toBe('within');
 });
 it('keeps every permitted extreme finite and all climate bands on the distance axis',()=>{
  for(const t of[2600,7200])for(const l of[.01,10])for(const r of[.03,20])for(const a of[0,.9]){
   const m=model(state(t,l,r,a));for(const k of['flux','irradiance','meanAbsorbed','equilibriumK'])expect(Number.isFinite(m[k]),k).toBe(true);
   expect(m.equilibriumK).toBeGreaterThan(0);expect(m.inner.distanceAu).toBeGreaterThan(.03);expect(m.outer.distanceAu).toBeLessThan(20);
  }
 });
});

describe('Saved input recovery and clear UI semantics',()=>{
 it.each([null,true,false,[],{},'', ' ', 'bad',NaN,Infinity,-Infinity])('recovers malformed scalar input %j',value=>{
  const m=model({hzTemperatureK:value,hzLuminosity:value,hzDistanceAu:value,hzAlbedo:value});
  expect(m.temperatureK).toBe(5772);expect(m.luminosity).toBe(1);expect(m.distanceAu).toBe(1.00000011);expect(m.albedo).toBe(.294);
 });
 it('accepts finite numeric strings and preserves catalog precision',()=>{
  const m=model({hzTemperatureK:'5772',hzLuminosity:'1',hzDistanceAu:'.72333199',hzAlbedo:'.77'});
  expect(m.reference.id).toBe('venus');expect(m.distanceAu).toBe(.72333199);
 });
 it('bounds numeric extremes to the documented ranges',()=>{
  const a=model(state(1,-1,-1,-1)),b=model(state(99999,99,99,99));
  expect([a.temperatureK,a.luminosity,a.distanceAu,a.albedo]).toEqual([2600,.01,.03,0]);expect([b.temperatureK,b.luminosity,b.distanceAu,b.albedo]).toEqual([7200,10,20,.9]);
 });
 it('does not mutate saved inputs or claim a named reference after assumptions change',()=>{
  const s=Object.freeze({...state(5772,1,.72333199,.77),hrHunt:{hypothesis:'Retain'},selectedExoplanet:'kepler186f'}),m=model(s);
  expect(m.reference.id).toBe('venus');expect(model({...s,hzLuminosity:2}).reference).toBeNull();expect(model({...s,hzAlbedo:.76}).reference).toBeNull();expect(s.hrHunt.hypothesis).toBe('Retain');
 });
 it('exposes four continuous native sliders, a diagram slider, and live regime text',()=>{
  const html=doc({});const root=html.querySelector('#astronomy-habitable-zone-lab');expect(root).not.toBeNull();
  const ranges=root.querySelectorAll('input[type="range"]');expect(ranges).toHaveLength(4);
  for(const r of ranges){expect(r.getAttribute('step')).toBe('any');expect(r.getAttribute('aria-label')).toBeTruthy();expect(html.querySelector('label[for="'+r.id+'"]')).not.toBeNull();}
  expect(root.querySelector('#astronomy-hz-orbit').getAttribute('role')).toBe('slider');expect(root.querySelector('#astronomy-hz-status').getAttribute('aria-live')).toBe('polite');
 });
 it('states the atmosphere and mass assumptions and preserves source table accessibility',()=>{
  const root=doc({}).querySelector('#astronomy-habitable-zone-lab');expect(root.textContent).toContain('one Earth mass');expect(root.textContent).toContain('planetary atmospheres are not simulated');
  expect(root.textContent).toContain('not evidence of water or life');expect(root.textContent).toContain('5,780 K polynomial offset');expect(root.textContent).toContain('Measurement uncertainty is not propagated');
  expect(root.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);expect(root.querySelectorAll('tbody th[scope="row"]')).toHaveLength(3);
  for(const id of['venus','earth','mars'])expect(root.querySelector('a[href*="'+id+'fact.html"]')).not.toBeNull();
 });
 it('uses plain actions for reset and centering and toggles for examples',()=>{
  const root=doc({}).querySelector('#astronomy-habitable-zone-lab'),buttons=[...root.querySelectorAll('button')];
  for(const title of['Move between the boundaries','Reset habitable-zone explorer'])expect(buttons.find(b=>b.textContent===title).hasAttribute('aria-pressed')).toBe(false);
  expect(buttons.find(b=>b.textContent==='Earth reference').getAttribute('aria-pressed')).toBe('true');
 });
});
