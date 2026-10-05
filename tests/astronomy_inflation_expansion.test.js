
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js','astronomy'); model=window.__alloAstroPure.inflationExpansionModel; });
const state=(n=3,wave=.5)=>({inflationFolds:n,inflationWaveH:wave});
const doc=saved=>new window.DOMParser().parseFromString(renderTool('astronomy',{
 astronomy:{tab:'galaxies',observingList:[],...saved}
}),'text/html');

describe('Inflation expansion and Fourier convention',()=>{
 it('has an unchanged pattern, length and volume at zero expansion',()=>{
  const m=model(state(0));expect(m.stretch).toBe(1);expect(m.volumeStretch).toBe(1);expect(m.comovingHubbleRatio).toBe(1);
  expect(m.beforePattern).toEqual(m.afterPattern);expect(m.waveH).toBe(.5);
 });
 it.each([0,1,3,10,60])('obeys the length, volume and comoving Hubble relationships at N=%s',n=>{
  const m=model(state(n));
  expect(Math.log(m.stretch)).toBeCloseTo(n,12);
  expect(Math.log(m.volumeStretch)).toBeCloseTo(3*n,12);
  expect(m.volumeStretch/(m.stretch**3)).toBeCloseTo(1,12);
  expect(m.waveH/m.initialWaveH).toBe(m.stretch);
  expect(m.comovingHubbleRatio*m.stretch).toBeCloseTo(1,12);
  expect(m.logStretch).toBeCloseTo(Math.log10(m.stretch),12);
  expect(m.logModeScale).toBeCloseTo(Math.log10(m.modeScale),12);
 });
 it('makes each additional e-fold multiply lengths by e and volumes by e cubed',()=>{
  const a=model(state(4)),b=model(state(5));
  expect(b.stretch/a.stretch).toBeCloseTo(Math.E,12);
  expect(b.volumeStretch/a.volumeStretch).toBeCloseTo(Math.E**3,12);
 });
 it('represents 60 e-folds with finite values near 1.14e26 length growth',()=>{
  const m=model(state(60));expect(m.stretch/1.1420073898156842e26).toBeCloseTo(1,12);
  expect(m.volumeStretch).toBeGreaterThan(1e78);expect(m.volumeStretch).toBeLessThan(1.5e78);
  expect(m.growth).toHaveLength(121);
 });
 it.each([.25,.5,1,2])('uses the full-wavelength 2pi factor for Hubble-scale crossing at initial wavelength=%s',wave=>{
  const start=model(state(0,wave)),m=model(state(start.crossingFolds,wave));
  // Check k_physical = 2*pi/lambda = H/c in units where c/H = 1.
  expect(2*Math.PI/m.waveH).toBeCloseTo(1,12);expect(m.waveH).toBeCloseTo(2*Math.PI,12);
  expect(m.modeScale).toBeCloseTo(1,12);expect(m.regime).toBe('crossing');
  expect(model(state(start.crossingFolds-.001,wave)).regime).toBe('below');
  expect(model(state(start.crossingFolds+.001,wave)).regime).toBe('above');
 });
 it('does not confuse one full Hubble-length wavelength with k=aH crossing',()=>{
  const m=model(state(Math.log(2),.5));expect(m.waveH).toBeCloseTo(1,12);expect(m.regime).toBe('below');
  expect(m.modeScale).toBeCloseTo(1/(2*Math.PI),12);
 });
 it('keeps a fixed physical window and the same central crest while stretching the pattern',()=>{
  const a=model(state(0)),b=model(state(Math.log(2)));
  expect(a.beforePattern.map(p=>p.xH)).toEqual(b.afterPattern.map(p=>p.xH));
  expect(a.beforePattern[80].value).toBeCloseTo(-1,12);expect(a.beforePattern[160].value).toBe(1);
  expect(b.afterPattern[80].value).toBeCloseTo(0,12);expect(b.afterPattern[160].value).toBe(1);
  expect(b.afterPattern[0].value).toBeCloseTo(-1,12);
 });
 it('smooths the finite crop at large expansion without modifying the initial pattern',()=>{
  const m=model(state(60));expect(m.afterPattern.every(p=>Math.abs(p.value-1)<1e-12)).toBe(true);
  expect(Math.min(...m.beforePattern.map(p=>p.value))).toBeCloseTo(-1,12);
 });
});

describe('Published primordial spectral tilt',()=>{
 it('uses the named Planck central value, uncertainty and pivot',()=>{
  const s=model(state()).spectrum;expect(s.ns).toBe(.9649);expect(s.nsError).toBe(.0042);
  expect(s.pivotMpcInv).toBe(.05);expect(s.tensorLimit).toBe(.036);
 });
 it('normalizes mean and uncertainty curves to one at the pivot',()=>{
  const p=model(state()).spectrum.points[40];expect(p.q).toBe(1);expect(p.power).toBe(1);expect(p.low).toBe(1);expect(p.high).toBe(1);
 });
 it('has red tilt, reciprocal endpoint powers and the correct logarithmic slope',()=>{
  const s=model(state()).spectrum,a=s.points[0],b=s.points.at(-1);
  expect(a.power).toBeGreaterThan(1);expect(b.power).toBeLessThan(1);
  expect(a.power*b.power).toBeCloseTo(1,12);
  expect(Math.log(b.power/a.power)/Math.log(b.q/a.q)).toBeCloseTo(s.ns-1,12);
 });
 it('orders the tilt-only uncertainty band on both sides of the pivot',()=>{
  const s=model(state()).spectrum;
  for(const p of s.points){
   expect(p.low).toBeLessThanOrEqual(p.power);expect(p.high).toBeGreaterThanOrEqual(p.power);
   expect(p.low).toBeGreaterThan(.9);expect(p.high).toBeLessThan(1.1);
   if(p.q!==1)expect(Math.log(p.high/p.low)/Math.abs(Math.log(p.q))).toBeCloseTo(2*s.nsError,11);
  }
 });
 it('keeps the observed-parameter curve independent of teaching controls and returned-object edits',()=>{
  const a=model(state(0,.25)),b=model(state(60,2));expect(a.spectrum).toEqual(b.spectrum);
  a.spectrum.ns=9;a.spectrum.points[0].power=-9;a.beforePattern[0].value=-100;
  const fresh=model(state(0,.25));expect(fresh.spectrum.ns).toBe(.9649);expect(fresh.spectrum.points[0].power).toBeGreaterThan(1);
  expect(fresh.beforePattern[0].value).not.toBe(-100);
 });
});

describe('Inflation input recovery and readable scientific scope',()=>{
 it.each([undefined,null,false,true,'','forged',{},[],Infinity,NaN])('recovers invalid persisted controls: %s',raw=>{
  const m=model({inflationFolds:raw,inflationWaveH:raw});
  expect(m.folds).toBe(3);expect(m.initialWaveH).toBe(.5);
  expect(m.growth.every(p=>Number.isFinite(p.logStretch)&&Number.isFinite(p.logModeScale))).toBe(true);
 });
 it.each([null,[],false,'forged'])('recovers malformed containers: %s',saved=>{expect(model(saved).folds).toBe(3);});
 it('accepts saved numeric strings and clamps finite extremes',()=>{
  expect(model({inflationFolds:'10',inflationWaveH:'1'}).folds).toBe(10);
  const hi=model(state(1e40,1e40)),lo=model(state(-1e40,-1e40));
  expect(hi.folds).toBe(60);expect(hi.initialWaveH).toBe(2);expect(lo.folds).toBe(0);expect(lo.initialWaveH).toBe(.25);
 });
 it('links rendered physical values and narratives to one model',()=>{
  const m=model(state(10)),d=doc(state(10)),lab=d.querySelector('#astronomy-inflation-lab');
  for(const key of ['stretch','volumeStretch','waveH','modeScale'])expect(Number(lab.querySelector('[data-inflation-metric="'+key+'"]').getAttribute('data-value'))).toBe(m[key]);
  expect(lab.querySelector('#astronomy-inflation-growth').getAttribute('aria-valuenow')).toBe('10');
  expect(lab.querySelector('#astronomy-inflation-diagram').getAttribute('data-stretch')).toBe(String(m.stretch));
  expect(lab.textContent).toContain('not elapsed seconds');expect(lab.textContent).toContain('λ/(2π)');
  expect(lab.textContent).toContain('not a general causal horizon');
  expect(lab.textContent).toContain('does not solve an inflaton potential');
 });
 it('names the measured inputs and clearly limits the inferred uncertainty curve',()=>{
  const lab=doc(state()).querySelector('#astronomy-inflation-lab');
  expect(lab.textContent).toContain('0.9649 ± 0.0042');expect(lab.textContent).toContain('68% confidence');
  expect(lab.textContent).toContain('r < 0.036 at 95% confidence');expect(lab.textContent).toContain('upper limit is not a tensor detection');
  expect(lab.textContent).toContain('normalization is held fixed');
  expect(lab.textContent).toContain('Changing the teaching controls leaves the measured spectral-index curve unchanged');
  expect(lab.querySelector('a[href="https://arxiv.org/abs/1807.06211"]')).toBeTruthy();
  expect(lab.querySelector('a[href="https://arxiv.org/abs/2110.00483"]')).toBeTruthy();
 });
 it('renders zero expansion as a plain zero rather than scientific notation',()=>{
  const lab=doc(state(0)).querySelector('#astronomy-inflation-lab');
  expect(lab.querySelector('label[for="astronomy-inflation-folds"]').textContent).toBe('Expansion stage: N = 0');
 });
 it('removes fixed timing and automatic confirmation claims from the source and both English fallbacks',()=>{
  for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
   const labels=JSON.parse(readFileSync(file,'utf8')).stem.astronomy;
   expect(labels.alan_guth_then_a_young_postdoc_at_corn).toContain('not a universally measured duration');
   expect(labels.the_big_bang_theory_describes_the_univ).toContain('hot, dense phase');
   expect(labels.inflation_predicts_specific_signatures).toContain('does not identify a unique inflation mechanism');
  }
  const d=doc({selectedInf:'evidence'});expect(d.querySelector('#astronomy-inf-panel').textContent).toContain('not automatically establish a unique inflaton model');
  expect(d.body.textContent).toContain('Early epoch · model dependent');
 });
});
