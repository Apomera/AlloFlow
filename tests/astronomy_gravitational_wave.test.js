import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_astronomy.js','astronomy');model=window.__alloAstroPure.gravitationalWaveModel;});
const doc=state=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'galaxies',observingList:[],...state}}),'text/html');
const G=6.67430e-11,c=299792458,MS=1.98847e30,MPC=3.0856775814913673e22;
// Independent quadrupole of a circular binary in detector-frame SI units:
// projected second derivative of Qxx-Qyy, without the chirp-mass formula.
function referenceAmplitude(m){
 const a=m.mass1*MS*(1+m.redshift),b=m.mass2*MS*(1+m.redshift),omega=Math.PI*m.frequency;
 const separation=(G*(a+b)/(omega*omega))**(1/3),mu=a*b/(a+b);
 return 4*G*mu*separation*separation*omega*omega/(c**4*m.distance*MPC);
}
describe('Binary quadrupole and ideal detector physics',()=>{
 it.each([undefined,null,false,true,'',{},[],NaN,Infinity].map(v=>[v]))('recovers malformed controls (%s)',value=>{
  const m=model(Object.fromEntries(['waveMass1','waveMass2','waveDistance','waveRedshift','waveOrientation','wavePhase','waveFrequency'].map(k=>[k,value])));
  expect([m.mass1,m.mass2,m.distance,m.redshift,m.orientation,m.phase,m.frequency]).toEqual([36,29,410,.09,0,0,20]);
 });
 it('bounds finite values and accepts numeric strings',()=>{
  const m=model({waveMass1:200,waveMass2:-5,waveDistance:0,waveRedshift:4,wavePhase:2,waveOrientation:200,waveFrequency:999});
  expect([m.mass1,m.mass2,m.distance,m.redshift,m.phase,m.orientation]).toEqual([80,5,50,1,1,90]);expect(m.frequency).toBe(m.frequencyLimit);
  expect(model({waveMass1:'30',waveMass2:'20',waveRedshift:'.1',wavePhase:'.125',waveFrequency:'10'})).toMatchObject({mass1:30,mass2:20,redshift:.1,phase:.125,frequency:10});
 });
 it.each([{}, {waveMass1:5,waveMass2:5,waveRedshift:0,waveFrequency:120}, {waveMass1:80,waveMass2:80,waveRedshift:1,waveFrequency:120},
  {waveDistance:2000,waveFrequency:2}, {waveMass1:5,waveMass2:80,waveRedshift:.5}, {waveRedshift:1,waveFrequency:10}])
 ('agrees with an independently constructed quadrupole (%j)',state=>{
  const m=model(state);expect(m.amplitude/referenceAmplitude(m)).toBeCloseTo(1,12);
 });
 it('uses inverse luminosity distance without changing the orbit or physical clock',()=>{
  const a=model(),b=model({waveDistance:820});
  expect(a.amplitude/b.amplitude).toBeCloseTo(2,12);expect(a.separation).toBe(b.separation);expect(a.duration).toBe(b.duration);
  expect(a.reference).toBe(true);expect(b.reference).toBe(false);
 });
 it('scales wave amplitude and orbit separation correctly with frequency',()=>{
  const a=model({waveFrequency:5}),b=model({waveFrequency:20});
  expect(b.amplitude/a.amplitude).toBeCloseTo(4**(2/3),12);
  expect(b.separation/a.separation).toBeCloseTo(4**(-2/3),12);expect(a.duration/b.duration).toBe(4);
 });
 it('uses redshifted chirp mass and the source-frame orbital frequency consistently',()=>{
  const a=model({waveRedshift:0,waveFrequency:10}),b=model({waveRedshift:1,waveFrequency:10});
  expect(b.detectorChirp/a.detectorChirp).toBe(2);
  expect(b.amplitude/a.amplitude).toBeCloseTo(2**(5/3),12);
  expect(b.separation/a.separation).toBeCloseTo(2**(-2/3),12);
  expect(b.sourceFrequency/a.sourceFrequency).toBe(2);expect(b.duration).toBe(a.duration);
 });
 it.each([[0,1],[22.5,Math.SQRT1_2],[45,0],[90,-1]])('has the correct plus response at %s degrees',(angle,factor)=>{
  const m=model({waveOrientation:angle});expect(m.response).toBeCloseTo(factor,12);
  expect(m.current.strain/m.amplitude).toBeCloseTo(factor,12);
  expect(m.current.plus/m.amplitude).toBe(1);
 });
 it('changes each arm by half the differential strain and preserves the sign',()=>{
  for(const orientation of [0,30,45,90]){
   const m=model({waveOrientation:orientation});
   for(const phase of [0,.125,.25,.5,.75,1]){
    const f=m.at(phase);expect(f.xChange).toBe(-f.yChange);expect(f.differential).toBe(f.xChange-f.yChange);
    expect(f.differential/(m.armMeters*m.amplitude)).toBeCloseTo(f.strain/m.amplitude,12);
   }
  }
 });
 it('generates two wave cycles per orbit and exactly zero at balanced phases',()=>{
  const m=model();expect(m.at(0).plus).toBe(m.amplitude);expect(m.at(.25).plus).toBe(-m.amplitude);
  expect(m.at(.5).plus).toBe(m.amplitude);expect(m.at(.75).plus).toBe(-m.amplitude);expect(m.at(1).plus).toBe(m.amplitude);
  for(const t of [.125,.375,.625,.875])expect(m.at(t).differential).toBe(0);
  expect(m.at(.5).x1).toBeCloseTo(-m.at(0).x1,7);expect(m.at(1).x1).toBe(m.at(0).x1);
  expect(m.duration).toBe(2/m.frequency);
 });
 it('satisfies Kepler and center-of-mass relations',()=>{
  const m=model({waveMass1:80,waveMass2:5,waveFrequency:5});
  const omega=Math.PI*m.sourceFrequency;
  expect(omega**2*m.separation**3/(G*m.total*MS)).toBeCloseTo(1,12);
  expect((m.radius1+m.radius2)/m.separation).toBeCloseTo(1,12);
  for(const t of [0,.13,.4,.79]){
   const f=m.at(t);
   expect((m.mass1*f.x1+m.mass2*f.x2)/(m.total*m.separation)).toBeCloseTo(0,12);
   expect((m.mass1*f.y1+m.mass2*f.y2)/(m.total*m.separation)).toBeCloseTo(0,12);
   expect(Math.hypot(f.x1-f.x2,f.y1-f.y2)/m.separation).toBeCloseTo(1,12);
  }
 });
 it('keeps all extreme inputs finite, horizons separated and orbital speed bounded',()=>{
  for(const a of [5,36,80])for(const b of [5,29,80])for(const z of [0,.09,1])for(const f of [2,20,120]){
   const m=model({waveMass1:a,waveMass2:b,waveRedshift:z,waveFrequency:f});
   expect(m.frequencyLimit).toBeGreaterThan(2);expect(m.frequency).toBeLessThanOrEqual(m.frequencyLimit);
   const v=Math.sqrt(G*m.total*MS/m.separation);expect(v/c).toBeLessThanOrEqual(.300000000001);
   expect((m.horizon1+m.horizon2)/m.separation).toBeLessThanOrEqual(.18000000001);
   expect(m.displayGain*m.amplitude).toBeCloseTo(.2,12);
   for(const phase of [0,.125,.5,1])for(const value of Object.values(m.at(phase)))expect(Number.isFinite(value)).toBe(true);
  }
 });
});
describe('Source provenance and interface',()=>{
 it('retains published source status across chosen frequency, phase and detector alignment',()=>{
  expect(model({waveFrequency:10,wavePhase:.25,waveOrientation:45}).reference).toBe(true);
  for(const state of [{waveMass1:37},{waveMass2:30},{waveDistance:420},{waveRedshift:.1}])expect(model(state).reference).toBe(false);
  const lab=doc({}).querySelector('#astronomy-wave-lab');expect(lab.textContent).toContain('initial 2016 discovery paper');
  expect(lab.querySelector('a').href).toBe('https://arxiv.org/abs/1602.03837');
 });
 it('does not round a very faint physical wave or chart scale to zero',()=>{
  const lab=doc({waveMass1:5,waveMass2:5,waveDistance:2000,waveRedshift:0,waveFrequency:2,waveOrientation:44}).querySelector('#astronomy-wave-lab');
  const m=model({waveMass1:5,waveMass2:5,waveDistance:2000,waveRedshift:0,waveFrequency:2,waveOrientation:44});
  expect(m.current.strain).toBeGreaterThan(0);expect(m.current.strain).toBeLessThan(1e-24);expect(lab.querySelector('[data-wave-strain-value]').textContent).toMatch(/e-2[5-9]/);
  expect(lab.textContent).not.toContain('One chart unit equals 0.000');
 });
 it('recovers malformed settings with valid SVG coordinates and coherent native controls',()=>{
  const lab=doc({waveMass1:{bad:true},waveMass2:true,waveDistance:[],waveRedshift:false,wavePhase:'bad',waveFrequency:'bad',wavePlaying:'true'}).querySelector('#astronomy-wave-lab');
  expect(lab.textContent).not.toMatch(/NaN|Infinity|\[object Object\]/);
  for(const node of lab.querySelectorAll('svg *'))for(const attr of node.attributes)expect(attr.value).not.toMatch(/NaN|Infinity|\[object Object\]/);
  expect(lab.querySelector('#astr-waveMass1').value).toBe('36');expect(lab.querySelector('#astr-waveFrequency').value).toBe('20');
 });
 it('names native controls and gives all interaction targets 44 pixels',()=>{
  const lab=doc({}).querySelector('#astronomy-wave-lab');
  for(const el of lab.querySelectorAll('input')){expect(lab.querySelector('label[for="'+el.id+'"]')).toBeTruthy();expect(el.style.minHeight).toBe('44px');}
  for(const el of lab.querySelectorAll('button,summary,a'))expect(el.style.minHeight).toBe('44px');
 });
 it('explains magnification, ideal plus-only geometry and frozen orbit limits',()=>{
  const lab=doc({}).querySelector('#astronomy-wave-lab');
  expect(lab.textContent).toContain('magnified');expect(lab.textContent).toContain('fixed frequency');
  expect(lab.textContent).toContain('cross component');expect(lab.textContent).toContain('not a detector sensitivity forecast');
  expect(lab.querySelector('#astronomy-interferometer-diagram').getAttribute('aria-labelledby')).toBe('astronomy-interferometer-title astronomy-interferometer-desc');
  expect(lab.querySelector('#astronomy-wave-curve').getAttribute('aria-describedby')).toBe('astronomy-wave-help');
 });
});
