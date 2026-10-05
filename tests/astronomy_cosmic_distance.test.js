
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeAll(() => {
  resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  model = window.__alloAstroPure.cosmicDistanceModel;
});
const state = (z = 1, h0 = 67.4) => ({ cosmoZ: z, cosmoH0: h0 });
const documentFor = saved => new window.DOMParser().parseFromString(renderTool('astronomy', {
  astronomy: { observingList: [], tab: 'galaxies', ...saved }
}), 'text/html');

// Independent fixed-grid quadrature, distinct from the production adaptive
// distance integrator and analytic age calculation.
function simpson(f, end, n = 16000) {
  const step = end / n;
  let sum = f(0) + f(end);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(i * step);
  return sum * step / 3;
}
const secondsPerGyr = 365.25 * 86400 * 1e9;
const mpcKm = 3.0856775814913673e19;

describe('Cosmic distance physics and units', () => {
  it('has a finite local limit at zero redshift', () => {
    const m = model(state(0));
    for (const key of ['nowGly', 'thenGly', 'lightTravelGly', 'lookbackGyr', 'nowMpc']) expect(m[key]).toBe(0);
    expect(m.scaleFactor).toBe(1); expect(m.ageGyr).toBe(m.ageNowGyr);
  });
  it.each([0.0001, 0.1, 1, 3, 10, 15])('matches independent distance and lookback quadrature at z=%s', z => {
    const m = model(state(z)), e = x => Math.sqrt(.315 * (1+x)**3 + .685);
    const integral = simpson(x => 1/e(x), z), timeIntegral = simpson(x => 1/((1+x)*e(x)), z);
    const hubbleGyr = mpcKm/67.4/secondsPerGyr;
    expect(m.nowGly/(integral*hubbleGyr)).toBeCloseTo(1, 9);
    expect(m.lookbackGyr/(timeIntegral*hubbleGyr)).toBeCloseTo(1, 8);
    expect(m.nowMpc/(299792.458/67.4*integral)).toBeCloseTo(1, 9);
  });
  it.each([0, 1, 3, 10, 15])('matches independently integrated cosmic age at z=%s', z => {
    const m = model(state(z)), max = Math.sqrt(1/(1+z));
    const ageIntegral = simpson(u => 2*u*u/Math.sqrt(.315+.685*u**6), max);
    expect(m.ageGyr/(ageIntegral*mpcKm/67.4/secondsPerGyr)).toBeCloseTo(1, 10);
    expect(m.ageGyr+m.lookbackGyr).toBeCloseTo(m.ageNowGyr, 12);
  });
  it('has the expected rounded central-input present age and z=1 distances', () => {
    const m = model(state());
    expect(m.ageNowGyr).toBeGreaterThan(13.79); expect(m.ageNowGyr).toBeLessThan(13.81);
    expect(m.nowMpc).toBeGreaterThan(3400); expect(m.nowMpc).toBeLessThan(3405);
    expect(m.lookbackGyr).toBeGreaterThan(7.94); expect(m.lookbackGyr).toBeLessThan(7.96);
  });
  it('uses the same wavelength and separation expansion factor', () => {
    const m = model(state(10));
    expect(m.nowGly/m.thenGly).toBeCloseTo(11,12); expect(m.scaleFactor).toBeCloseTo(1/11,12);
    expect(m.lightTravelGly).toBe(m.lookbackGyr);
    expect(m.nowGly).toBeGreaterThan(m.lightTravelGly); expect(m.lightTravelGly).toBeGreaterThan(m.thenGly);
  });
  it('approaches Hubble law at very small redshift', () => {
    const m = model(state(.0001));
    expect(m.nowMpc/(299792.458*.0001/67.4)).toBeCloseTo(1, 4);
    expect(m.nowGly/m.lookbackGyr).toBeCloseTo(1, 3);
  });
  it('scales every distance and time inversely with H0, holding matter fixed', () => {
    const a = model(state(3,67.4)), b = model(state(3,73.04));
    for (const key of ['nowGly','thenGly','lightTravelGly','ageGyr','ageNowGyr','lookbackGyr','nowMpc'])
      expect(b[key]/a[key]).toBeCloseTo(67.4/73.04,12);
    expect(a.omegaM).toBe(b.omegaM); expect(b.source).toBe('shoes');
  });
  it('keeps finite, monotonic present distance and lookback while emission distance turns over', () => {
    const m = model(state(15)), samples=m.samples;
    for (let i=1;i<samples.length;i++){
      expect(samples[i].nowGly).toBeGreaterThan(samples[i-1].nowGly);
      expect(samples[i].lookbackGyr).toBeGreaterThan(samples[i-1].lookbackGyr);
      expect(samples[i].ageGyr).toBeLessThan(samples[i-1].ageGyr);
    }
    const peak=samples.reduce((a,b)=>a.thenGly>b.thenGly?a:b);
    expect(peak.z).toBeGreaterThan(1.4);expect(peak.z).toBeLessThan(1.8);
    expect(samples.at(-1).thenGly).toBeLessThan(peak.thenGly);
    expect(model(state(15,50)).nowGly).toBeLessThan(50);
  });
  it('returns independent sample objects without corrupting later renders', () => {
    const m=model(state(1));m.samples[10].nowGly=-999;m.samples.pop();
    const next=model(state(1));expect(next.samples).toHaveLength(151);expect(next.samples[10].nowGly).toBe(next.nowGly);
  });
});

describe('Cosmic distance saved-state recovery and scientific provenance', () => {
  it.each([undefined,null,false,true,'', 'forged', {}, [], Infinity, NaN])('recovers invalid numeric controls: %s', raw => {
    const m=model({cosmoZ:raw,cosmoH0:raw});
    expect(m.z).toBe(1);expect(m.h0).toBe(67.4);expect(m.source).toBe('planck');
    expect(m.samples.every(p=>Number.isFinite(p.nowGly)&&Number.isFinite(p.ageGyr))).toBe(true);
  });
  it.each([null, [], 'forged', false])('recovers malformed state containers: %s', saved => {
    expect(model(saved).z).toBe(1);expect(model(saved).h0).toBe(67.4);
  });
  it('accepts saved numeric strings and limits extreme finite values', () => {
    expect(model({cosmoZ:'3',cosmoH0:'73.04'}).source).toBe('shoes');
    const hi=model(state(1e30,1e30)),lo=model(state(-1e30,-1e30));
    expect(hi.z).toBe(15);expect(hi.h0).toBe(90);expect(lo.z).toBe(0);expect(lo.h0).toBe(50);
    expect(model(state(3,73.05)).source).toBe('custom');
  });
  it('retains a published galaxy redshift only when its saved value still matches', () => {
    const spectrum=window.__alloAstroPure.cosmicRedshiftModel({redshiftReference:'jades14'});
    expect(spectrum.reference.name).toBe('JADES-GS-z14-0');
    const saved={cosmoZ:spectrum.z,cosmoRedshiftReference:spectrum.reference.id};
    expect(model(saved).redshiftReference.name).toBe('JADES-GS-z14-0');
    expect(model({...saved,cosmoZ:3}).redshiftReference).toBeNull();
    expect(model({cosmoZ:3,cosmoRedshiftReference:{forged:true}}).redshiftReference).toBeNull();
  });
  it('renders linked model values, useful units, controls and explicit approximation limits', () => {
    const doc=documentFor(state(3,73.04)),m=model(state(3,73.04)),lab=doc.querySelector('#astronomy-cosmo-lab');
    expect(lab).toBeTruthy();
    for(const key of ['nowGly','thenGly','lookbackGyr','ageGyr','ageNowGyr'])
      expect(Number(lab.querySelector('[data-cosmo-metric="'+key+'"]').getAttribute('data-value'))).toBe(m[key]);
    expect(lab.textContent).toContain('billion light-years');
    expect(lab.textContent).toContain('omits radiation');
    expect(lab.textContent).toContain('not a new cosmological fit');
    expect(lab.querySelector('#astronomy-cosmo-chart').getAttribute('aria-valuenow')).toBe('3');
    expect(lab.querySelector('#astronomy-cosmo-z').getAttribute('step')).toBe('any');
  });
  it('names published inputs, quoted uncertainty limits and original sources', () => {
    const doc=documentFor(state()),lab=doc.querySelector('#astronomy-cosmo-lab');
    expect(lab.textContent).toContain('67.4 ± 0.5');expect(lab.textContent).toContain('73.04 ± 1.04');
    expect(lab.textContent).toContain('not propagated');
    expect(lab.querySelector('a[href="https://arxiv.org/abs/1807.06209"]')).toBeTruthy();
    expect(lab.querySelector('a[href="https://arxiv.org/abs/2112.04510"]')).toBeTruthy();
  });
  it('narrows JWST claims in both English registries and the source fallback', () => {
    for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
      const value=JSON.parse(readFileSync(file,'utf8')).stem.astronomy.two_independent_ways_to_measure_the_cu;
      expect(value).toContain('do not rule out every distance-ladder systematic');
      expect(value).not.toContain('not a Cepheid systematic');
    }
    expect(documentFor({selectedDM:'tension'}).querySelector('#astronomy-dm-panel').textContent).toContain('do not rule out every distance-ladder systematic');
  });
});
