import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_astronomy.js','astronomy');model=window.__alloAstroPure.magnitudeModel;});
const custom=(mv=4.81,pc=10,av=0)=>({magnitudeReference:'custom',magnitudeMv:mv,magnitudeDistancePc:pc,magnitudeAv:av});
const doc=saved=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'stars',observingList:[],...saved}}),'text/html');
const dir='reports/sky-lab-brightness-2026-10-01';

describe('Published Johnson V inputs',()=>{
 it('pins the retrieved catalogue payload and column definitions',()=>{
  const p=JSON.parse(readFileSync(dir+'/download-provenance.json','utf8')),tsv=readFileSync(dir+'/hipparcos-bright-stars.tsv','utf8').replace(/\r\n/g,'\n');
  expect(createHash('sha256').update(tsv).digest('hex')).toBe(p.normalizedSha256);
  expect(tsv).toContain('Magnitude in Johnson V');expect(tsv).toContain('Standard error in Plx');
 });
 it.each([['sirius',32349,-1.44,379.21,1.58],['vega',91262,.03,128.93,.55]])('retains original %s catalogue inputs and independently infers its M_V',(id,hip,v,plx,error)=>{
  const m=model({magnitudeReference:id}),r=m.reference;
  expect(r.hip).toBe(hip);expect(r.apparentV).toBe(v);expect(r.parallaxMas).toBe(plx);expect(r.parallaxErrorMas).toBe(error);
  expect(m.distancePc).toBe(1000/plx);expect(m.absoluteV).toBeCloseTo(v+5*Math.log10(plx)-10,12);
  expect(m.apparentV).toBeCloseTo(v,12);
  const row=readFileSync(dir+'/hipparcos-bright-stars.tsv','utf8').split('\n').find(l=>l.trim().startsWith(String(hip))).trim().split(/\s+/).map(Number);
  expect(row).toEqual([hip,v,plx,error]);expect(r.source).toContain('ESA 1997');
 });
 it('adopts the named 2018 solar V-band reference at the 10-pc standard distance',()=>{
  const m=model({});expect(m.referenceId).toBe('sun');expect(m.absoluteV).toBe(4.81);expect(m.distancePc).toBe(10);
  expect(m.reference.href).toBe('https://arxiv.org/abs/1804.07788');expect(m.vLightVsSun).toBe(1);expect(m.reference.basis).toContain('Vega magnitude system');
 });
 it('returns fresh references, so mutations cannot alter source inputs',()=>{
  const a=model({magnitudeReference:'sirius'});a.reference.parallaxMas=1;a.references[0].absoluteV=-10;
  const b=model({magnitudeReference:'sirius'});expect(b.reference.parallaxMas).toBe(379.21);expect(b.references[0].absoluteV).toBe(4.81);
 });
});

describe('Distance, dust and magnitude physics',()=>{
 it.each([[.1,-10,10000],[1,-5,100],[10,0,1],[100,5,.01],[1000,10,.0001],[10000,15,.000001]])('uses the distance modulus and inverse-square flux at %s pc',(pc,mu,flux)=>{
  const m=model(custom(4.81,pc));expect(m.distanceModulus).toBeCloseTo(mu,12);expect(m.apparentV).toBeCloseTo(4.81+mu,12);
  expect(m.distanceFlux).toBeCloseTo(flux,12);expect(m.fluxRatio).toBeCloseTo((10/pc)**2,12);
  expect(m.distanceLy).toBeCloseTo(pc*3.261563777167433,9);
 });
 it('makes doubling distance four times fainter and adds 1.50515 magnitudes',()=>{
  const a=model(custom(2,40)),b=model(custom(2,80));expect(a.fluxRatio/b.fluxRatio).toBeCloseTo(4,12);
  expect(b.apparentV-a.apparentV).toBeCloseTo(5*Math.log10(2),12);
 });
 it.each([0,1,2.5,5])('adds %s mag of extinction and multiplies the transmitted flux',av=>{
  const m=model(custom(1.2,36,av));expect(m.apparentV-m.unextinguishedV).toBeCloseTo(av,12);
  expect(m.transmission).toBeCloseTo(10**(-.4*av),12);expect(m.fluxRatio).toBeCloseTo((10/36)**2*10**(-.4*av),12);
 });
 it('brightens V-band light by exactly 100 for a five-magnitude decrease',()=>{
  const a=model(custom(4.81)),b=model(custom(-.19));expect(b.vLightVsSun/a.vLightVsSun).toBeCloseTo(100,12);
  expect(b.apparentV).toBeCloseTo(a.apparentV-5,12);
 });
 it('keeps received relative flux independent of the intrinsic source magnitude',()=>{
  const a=model(custom(-5,71,2)),b=model(custom(12,71,2));expect(a.fluxRatio).toBe(b.fluxRatio);expect(a.transmission).toBe(b.transmission);
  expect(b.apparentV-a.apparentV).toBeCloseTo(17,12);expect(a.vLightVsSun).toBeGreaterThan(b.vLightVsSun);
 });
 it('retains a published intrinsic brightness while distance and dust are simulated',()=>{
  const base=model({magnitudeReference:'vega'}),m=model({magnitudeReference:'vega',magnitudeDistancePc:300,magnitudeAv:3});
  expect(m.referenceId).toBe('vega');expect(m.absoluteV).toBe(base.absoluteV);expect(m.reference.apparentV).toBe(.03);expect(m.apparentV).toBeCloseTo(base.absoluteV+5*Math.log10(30)+3,12);
 });
 it('identifies brighter, equal and fainter flux without an arbitrary visibility claim',()=>{
  expect(model(custom(4,1)).regime).toBe('brighter');expect(model(custom(4,10)).regime).toBe('equal');expect(model(custom(4,100)).regime).toBe('fainter');
  expect(model(custom(4,1,5)).regime).toBe('equal');
 });
 it('keeps both curves within fixed axes for every extreme combination',()=>{
  for(const mv of[-10,15])for(const av of[0,5])for(const pc of[.1,10000]){
   const m=model(custom(mv,pc,av));expect(m.points).toHaveLength(101);
   expect(m.points[0].distancePc).toBe(.1);expect(m.points.at(-1).distancePc).toBe(10000);
   for(const p of m.points){expect(p.apparentV).toBeGreaterThanOrEqual(-20-1e-9);expect(p.apparentV).toBeLessThanOrEqual(35+1e-9);expect(p.apparentV-p.unextinguishedV).toBeCloseTo(av,12);}
   expect(m.fluxLog).toBeGreaterThanOrEqual(-8);expect(m.fluxLog).toBeLessThanOrEqual(4);
  }
 });
});

describe('Magnitude saved-state resilience',()=>{
 it.each([null,[],false,'bad',{magnitudeReference:{bad:true},magnitudeDistancePc:[],magnitudeAv:true}])('recovers malformed saved controls %j',saved=>{
  const m=model(saved);expect(m.referenceId).toBe('sun');expect(m.absoluteV).toBe(4.81);expect(m.distancePc).toBe(10);expect(m.extinctionV).toBe(0);
 });
 it.each([true,{},[],null,'',Infinity,'bad'])('rejects malformed custom magnitude %j',raw=>{
  expect(model({...custom(),magnitudeMv:raw}).absoluteV).toBe(4.81);
 });
 it('clamps finite values, snaps extinction, and accepts numeric strings',()=>{
  const a=model(custom('-30','0','3.26'));expect(a.absoluteV).toBe(-10);expect(a.distancePc).toBe(.1);expect(a.extinctionV).toBe(3.3);
  const b=model(custom('30','1e10','10'));expect(b.absoluteV).toBe(15);expect(b.distancePc).toBe(10000);expect(b.extinctionV).toBe(5);
  const c=model(custom('1.2345','2.637','-1'));expect(c.absoluteV).toBe(1.2345);expect(c.distancePc).toBe(2.637);expect(c.extinctionV).toBe(0);
 });
 it('keeps the exact catalogue log-distance representable with step any',()=>{
  const m=model({magnitudeReference:'sirius'}),root=doc({magnitudeReference:'sirius'}).querySelector('#astronomy-magnitude-lab');
  const range=root.querySelector('#astronomy-magnitude-distance');expect(range.getAttribute('step')).toBe('any');expect(Number(range.getAttribute('value'))).toBe(m.distanceLog);
  expect(Number(root.querySelector('#astronomy-magnitude-mv').getAttribute('value'))).toBe(m.absoluteV);
 });
 it('leaves other saved investigations untouched',()=>{
  const saved={...custom(),hrHunt:{hypothesis:'Keep my note'},selectedCC:'agriculture',rotationGalaxy:'NGC6503'},before=JSON.stringify(saved);model(saved);expect(JSON.stringify(saved)).toBe(before);
 });
});

describe('Magnitude visual and accessibility contracts',()=>{
 it('links rendered metrics, marker, reference ring and flux positions to the model',()=>{
  const saved=custom(-3,127,2.1),m=model(saved),root=doc(saved).querySelector('#astronomy-magnitude-lab');
  for(const n of root.querySelectorAll('[data-magnitude-metric]'))expect(Number(n.dataset.value)).toBe(m[n.dataset.magnitudeMetric]);
  expect(Number(root.querySelector('[data-magnitude-selected]').dataset.value)).toBe(m.apparentV);
  expect(root.querySelector('#astronomy-magnitude-curve').getAttribute('role')).toBe('slider');
  expect(root.querySelector('#astronomy-magnitude-curve').getAttribute('aria-valuenow')).toBe(String(m.distancePc));
  expect(root.querySelector('[data-magnitude-standard]').dataset.magnitudeStandard).toBe('10pc');
  for(const [key,value,log]of[['distance',m.distanceFlux,m.distanceFluxLog],['received',m.fluxRatio,m.fluxLog]]){
   const row=root.querySelector('[data-magnitude-flux-row=\"'+key+'\"]');expect(Number(row.dataset.value)).toBe(value);expect(Number(row.dataset.logValue)).toBe(log);
   expect(Number(row.querySelector('circle').getAttribute('cx'))).toBe(30+(log+8)/12*300);
  }
 });
 it('provides responsive catalogue headers, source row labels and band limitations',()=>{
  const root=doc({magnitudeReference:'sirius'}).querySelector('#astronomy-magnitude-lab'),table=root.querySelector('#astronomy-magnitude-catalog');
  expect(table.querySelectorAll('thead th[scope=\"col\"]')).toHaveLength(4);expect(table.querySelectorAll('tbody th[scope=\"row\"]')).toHaveLength(2);
  expect(table.style.tableLayout).toBe('fixed');expect(root.textContent).toContain('bolometric correction');expect(root.textContent).toContain('uncertainty are not propagated');
  expect(root.textContent).not.toMatch(/JWST faintest|100,000× more luminous/);
 });
 it('keeps English labels equal in both registries',()=>{
  const delta=JSON.parse(readFileSync(dir+'/english-labels.json','utf8'));
  for(const p of['ui_strings.js','desktop/web-app/public/ui_strings.js']){const a=JSON.parse(readFileSync(p,'utf8')).stem.astronomy;for(const[k,v]of Object.entries(delta))expect(a[k],p+' '+k).toBe(v);}
 });
});
