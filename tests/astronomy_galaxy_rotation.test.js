import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_astronomy.js','astronomy');model=window.__alloAstroPure.galaxyRotationModel;});
const state=(galaxy='NGC3198',ml=.5,index=42)=>({rotationGalaxy:galaxy,rotationML:ml,rotationPoint:index});
const doc=saved=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'galaxies',observingList:[],...saved}}),'text/html');
const dir='reports/sky-lab-rotation-curves-2026-10-01';

describe('SPARC measurement provenance',()=>{
 it('pins the downloaded table content across operating-system line endings',()=>{
  for(const [file,hash]of [
   ['SPARC_Lelli2016c.mrt','5aa0501f6b0d881fa579030e315e7b5b6ef561a5bd3a07472f9929c7e5728243'],
   ['MassModels_Lelli2016c.mrt','fd56b08f93ee6be38bb5b2305a16a2dc57d98ee29034223c5d14ecf8f50759d0']
  ])expect(createHash('sha256').update(readFileSync(dir+'/'+file,'utf8').replace(/\r\n/g,'\n')).digest('hex')).toBe(hash);
 });
 it.each([['NGC3198',43,13.8,1.4,73,3],['NGC6503',31,6.26,.31,74,2]])('retains every published radial sample and adopted geometry for %s',(id,count,distance,error,inc,incError)=>{
  const m=model(state(id)),lines=readFileSync(dir+'/MassModels_Lelli2016c.mrt','utf8').split('\n').filter(l=>l.slice(0,11).trim()===id);
  expect(m.points).toHaveLength(count);expect(lines).toHaveLength(count);
  const columns=[[19,25,'radiusKpc'],[26,32,'observedKms'],[33,38,'errorKms'],[39,45,'gasKms'],[46,52,'unitDiskKms'],[53,59,'unitBulgeKms']];
  for(let i=0;i<count;i++)for(const [lo,hi,key]of columns)expect(m.points[i][key],id+' row '+i+' '+key).toBe(Number(lines[i].slice(lo,hi)));
  expect(m.distanceMpc).toBe(distance);expect(m.distanceErrorMpc).toBe(error);expect(m.inclinationDeg).toBe(inc);expect(m.inclinationErrorDeg).toBe(incError);
  expect(m.points.every(p=>p.unitBulgeKms===0)).toBe(true);
 });
 it('keeps independent examples and returned data mutation safe',()=>{
  const a=model(state());a.points[0].observedKms=-100;a.examples[0].name='forged';
  const b=model(state());expect(b.points[0].observedKms).toBe(24.4);expect(b.examples[0].name).toBe('NGC 3198');
  expect(model(state('NGC6503')).points[0].observedKms).toBe(77);
 });
});

describe('Newtonian stars and gas model',()=>{
 it('adds gravitational contributions in squared-speed space',()=>{
  const p=model(state()).selected;
  expect(p.baryonKms).toBeCloseTo(Math.sqrt(47.84**2+.5*61.63**2),12);
  expect(p.baryonKms).not.toBeCloseTo(47.84+Math.sqrt(.5)*61.63,3);
  expect(p.differenceKms).toBeCloseTo(149-p.baryonKms,12);
 });
 it.each([.1,.2,.5,1])('uses M/L=%s consistently across both complete published curves',ml=>{
  for(const id of ['NGC3198','NGC6503']){
   const m=model(state(id,ml));
   for(const p of m.points){
    expect(p.baryonKms**2).toBeCloseTo(p.gasKms*Math.abs(p.gasKms)+ml*(p.unitDiskKms**2+p.unitBulgeKms**2),8);
    expect(p.stellarKms**2).toBeCloseTo(ml*(p.unitDiskKms**2+p.unitBulgeKms**2),8);
    expect(p.differenceKms+p.baryonKms).toBeCloseTo(p.observedKms,12);
   }
  }
 });
 it('preserves signed gas terms for outward central forces',()=>{
  const p=model(state('NGC3198',.5,8)).selected;expect(p.gasKms).toBe(-1.43);expect(p.gasSq).toBeCloseTo(-(1.43**2),12);
  expect(p.baryonSq).toBeCloseTo(.5*88.98**2-1.43**2,10);
  expect(p.baryonSq).toBeLessThan(.5*88.98**2);
 });
 it('scales the stellar contribution as the square root of M/L while observations stay fixed',()=>{
  const a=model(state('NGC6503',.2)),b=model(state('NGC6503',.8));
  for(let i=0;i<a.points.length;i++){
   expect(b.points[i].stellarKms/a.points[i].stellarKms).toBeCloseTo(2,12);
   expect(b.points[i].observedKms).toBe(a.points[i].observedKms);expect(b.points[i].errorKms).toBe(a.points[i].errorKms);
   expect(b.points[i].gasKms).toBe(a.points[i].gasKms);
  }
 });
 it('retains negative speed differences instead of manufacturing a positive halo term',()=>{
  const m=model(state('NGC6503',1,2));expect(m.selected.differenceKms).toBeLessThan(-30);expect(m.regime).toBe('below');
 });
 it.each([[.2,'above'],[.6,'overlap'],[1,'below']])('reports comparison with the quoted random error at M/L=%s',(ml,regime)=>{
  expect(model(state('NGC6503',ml,2)).regime).toBe(regime);
 });
 it('retains a negative lower error-bar bound rather than clipping the source uncertainty',()=>{
  const p=model(state('NGC3198',.5,0)).selected;expect(p.observedKms-p.errorKms).toBe(-11.5);
 });
 it('contains every speed and error bar within fixed plotted scales across all supported assumptions',()=>{
  for(const id of ['NGC3198','NGC6503'])for(const ml of [.1,1])for(const p of model(state(id,ml)).points){
   expect(p.observedKms+p.errorKms).toBeLessThan(200);expect(p.observedKms-p.errorKms).toBeGreaterThan(-50);
   expect(p.baryonKms).toBeLessThan(200);expect(p.baryonKms).toBeGreaterThanOrEqual(0);
   expect(p.differenceKms+p.errorKms).toBeLessThan(150);expect(p.differenceKms-p.errorKms).toBeGreaterThan(-150);
  }
 });
});

describe('Rotation explorer state recovery and clarity',()=>{
 it.each([undefined,null,false,true,'','bad',[],{},NaN,Infinity])('recovers malformed controls %s',raw=>{
  const m=model({rotationGalaxy:raw,rotationML:raw,rotationPoint:raw});
  expect(m.galaxy).toBe('NGC3198');expect(m.ml).toBe(.5);expect(m.index).toBe(42);
 });
 it.each([null,[],false,'bad'])('recovers malformed containers %s',raw=>{expect(model(raw).index).toBe(42);});
 it('accepts numeric strings, bounds extremes and aligns restored assumptions with the native slider step',()=>{
  const m=model({rotationGalaxy:'NGC6503',rotationML:'0.33',rotationPoint:'2.7'});
  expect(m.ml).toBe(.35);expect(m.index).toBe(3);
  expect(model(state('NGC6503',1e50,1e50)).index).toBe(30);expect(model(state('NGC3198',-1e50,-1e50)).index).toBe(0);
  expect(model(state('NGC3198',-100)).ml).toBe(.1);expect(model(state('NGC3198',100)).ml).toBe(1);
 });
 it('links both diagrams and metric values to the selected published sample',()=>{
  const s=state('NGC6503',.6,2),m=model(s),lab=doc(s).querySelector('#astronomy-rotation-lab');
  for(const key of ['radiusKpc','observedKms','baryonKms','differenceKms'])expect(Number(lab.querySelector('[data-rotation-metric="'+key+'"]').getAttribute('data-value'))).toBe(m.selected[key]);
  for(const id of ['chart','difference'])expect(lab.querySelector('#astronomy-rotation-'+id).getAttribute('data-index')).toBe('2');
  expect(lab.querySelectorAll('#astronomy-rotation-chart [data-rotation-sample]')).toHaveLength(31);
  expect(lab.querySelector('#astronomy-rotation-status').getAttribute('data-regime')).toBe('overlap');
 });
 it('shows the rotation investigation with its relevant topic and retains topic panel semantics',()=>{
  expect(doc({selectedDM:'lensing'}).querySelector('#astronomy-rotation-lab')).toBe(null);
  const d=doc({selectedDM:'rotation'});expect(d.querySelector('#astronomy-rotation-lab')).toBeTruthy();
  expect(d.querySelector('#astronomy-dm-panel').getAttribute('aria-labelledby')).toBe('astronomy-dm-tab-rotation');
 });
 it('names data provenance and separates quoted error bars from missing model uncertainty',()=>{
  const lab=doc({}).querySelector('#astronomy-rotation-lab');expect(lab.textContent).toContain('exclude inclination systematics');
  expect(lab.textContent).toContain('Model uncertainty is not included');expect(lab.textContent).toContain('not a statistical fit');
  expect(lab.textContent).toContain('Daigle et al. (2006)');expect(lab.textContent).toContain('factor 1.33 for helium');
  expect(lab.querySelector('a[href="https://arxiv.org/abs/1606.09251"]')).toBeTruthy();
  expect(lab.querySelector('button[aria-pressed]')).toBeTruthy();
  const reset=Array.from(lab.querySelectorAll('button')).find(n=>n.textContent==='Reset rotation explorer');expect(reset.hasAttribute('aria-pressed')).toBe(false);
 });
 it('corrects the compact-mass and present-epoch explanations in source and both English registries',()=>{
  for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
   const labels=JSON.parse(readFileSync(file,'utf8')).stem.astronomy;
   expect(labels.vera_rubin_kent_ford_1970s_measured_ho).toContain('compact central mass');
   expect(labels.about_5_of_the_universe_is_ordinary_ma).toContain('present-day cosmic energy budget');
   expect(labels.the_cosmic_microwave_background_has_ti).toContain('model of cosmic evolution');
  }
  const d=doc({selectedDM:'cmb'});expect(d.querySelector('#astronomy-dm-panel').textContent).toContain('present epoch under base ΛCDM');
  expect(d.querySelector('#astronomy-energy-budget').innerHTML).not.toContain('min-width:10px');
 });
});
