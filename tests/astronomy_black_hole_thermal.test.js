import {beforeAll,describe,expect,it} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_astronomy.js','astronomy');model=window.__alloAstroPure.blackHoleThermalModel;});
const doc=state=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'galaxies',observingList:[],...state}}),'text/html');
describe('Schwarzschild thermal model',()=>{
 it('recovers accepted approximate solar-mass horizon, temperature and dimensionless entropy',()=>{
  const m=model({});
  expect(m.diameterM).toBeCloseTo(5906.500076,3);
  expect(m.temperatureK/1e-8).toBeCloseTo(6.17,2);
  expect(m.entropyOverK/1e77).toBeGreaterThan(1.04);expect(m.entropyOverK/1e77).toBeLessThan(1.06);
  expect(m.cmbRelation).toBe('colder');expect(m.example).toBe('solar');
 });
 it('gives a millimetre horizon a sub-kelvin temperature through an independent radius-temperature relation',()=>{
  const m=model({bhMassSolar:model({}).millimeterMassSolar});
  const independent=6.62607015e-34*299792458/(4*Math.PI*Math.PI*1.380649e-23*.001);
  expect(m.diameterM).toBeCloseTo(.001,14);
  expect(m.temperatureK).toBeCloseTo(independent,12);
  expect(m.temperatureK).toBeGreaterThan(.36);expect(m.temperatureK).toBeLessThan(.37);
  expect(m.cmbRelation).toBe('colder');expect(m.example).toBe('millimeter');
 });
 it.each([.01,.5,2,10,1e6])('scales radius with mass, temperature inversely and entropy quadratically (%s)',ratio=>{
  const a=model({}),b=model({bhMassSolar:ratio});
  expect(b.radiusM/a.radiusM).toBeCloseTo(ratio,9);
  expect(b.temperatureK/a.temperatureK*ratio).toBeCloseTo(1,12);
  expect(b.entropyOverK/a.entropyOverK/(ratio*ratio)).toBeCloseTo(1,12);
  expect(b.areaM2/a.areaM2/(ratio*ratio)).toBeCloseTo(1,12);
 });
 it('agrees with an independently tabulated Planck-length entropy calculation',()=>{
  const m=model({bhMassSolar:10}),planckLength=1.616255e-35;
  const independent=4*Math.PI*m.radiusM*m.radiusM/(4*planckLength*planckLength);
  expect(m.entropyOverK/independent).toBeCloseTo(1,5);
 });
 it('locates the CMB equality and changes sign on either side of it',()=>{
  const mass=model({}).cmbMassSolar,a=model({bhMassSolar:mass}),small=model({bhMassSolar:mass/2}),big=model({bhMassSolar:mass*2});
  expect(a.temperatureK).toBeCloseTo(2.72548,12);expect(a.cmbRelation).toBe('balanced');expect(a.example).toBe('cmb');
  expect(small.cmbRelation).toBe('hotter');expect(big.cmbRelation).toBe('colder');
  expect(a.diameterM*1000).toBeGreaterThan(.13);expect(a.diameterM*1000).toBeLessThan(.14);
 });
 it.each([[4e6,'sgrA'],[6.5e9,'m87']])('uses only an unedited published central mass as its source preset (%s)',(mass,id)=>{
  expect(model({bhMassSolar:mass}).example).toBe(id);
  expect(model({bhMassSolar:String(mass)}).example).toBe(id);
  expect(model({bhMassSolar:mass*1.01,bhExample:id}).example).toBe('custom');
 });
 it('places increasing mass to the right and decreasing temperature lower on the fixed log chart',()=>{
  const points=[-14,-10,-6,0,6,10].map(exp=>model({bhMassSolar:10**exp}).chart);
  for(let i=1;i<points.length;i++){expect(points[i].x).toBeGreaterThan(points[i-1].x);expect(points[i].y).toBeGreaterThan(points[i-1].y);expect(points[i].temperatureK).toBeLessThan(points[i-1].temperatureK);}
 });
 it('puts the CMB marker on the temperature relation and keeps every curve point inside the plot',()=>{
  const m=model({});
  expect(m.curve).toHaveLength(49);
  for(const p of [...m.curve,m.chart,m.cmbChart]){
   expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(1);
   expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(1);
   expect(Number.isFinite(p.temperatureK)).toBe(true);
  }
 });
 it('keeps physically tiny horizon disks proportional rather than clamping their displayed size',()=>{
  for(const mass of [1e-14,1e-7,1,4e6,6.5e9,1e10]){
   const m=model({bhMassSolar:mass});
   expect(m.selectedDisk/m.solarDisk/mass).toBeCloseTo(1,12);
   expect(Math.max(m.solarDisk,m.selectedDisk)).toBeCloseTo(76,12);
   expect(Math.min(m.solarDisk,m.selectedDisk)).toBeGreaterThan(0);
  }
  expect(model({bhMassSolar:1e-14}).selectedTiny).toBe(true);
  expect(model({bhMassSolar:1e10}).solarTiny).toBe(true);
 });
 it.each([undefined,null,false,true,'',{},[],NaN,Infinity,-Infinity,'forged'].map(v=>[v]))('rejects malformed saved mass (%s)',v=>{
  expect(model({bhMassSolar:v})).toMatchObject({massSolar:1,example:'solar',cmbRelation:'colder'});
 });
 it.each([undefined,null,false,true,[],2,'saved'].map(v=>[v]))('recovers a malformed saved container (%s)',v=>{
  expect(model(v).massSolar).toBe(1);
 });
 it('clamps finite extremes and keeps all physical outputs finite',()=>{
  for(const mass of [-1,0,1e-90,1e50]){
   const m=model({bhMassSolar:mass});
   expect(m.massSolar).toBeGreaterThanOrEqual(1e-14);expect(m.massSolar).toBeLessThanOrEqual(1e10);
   expect([m.massKg,m.radiusM,m.diameterM,m.temperatureK,m.entropyOverK,m.cmbRatio,m.selectedDisk,m.solarDisk].every(Number.isFinite)).toBe(true);
  }
 });
});
describe('thermal source labels and accessible scientific explanation',()=>{
 it('separates published mass inputs from theoretical temperature and horizon outputs',()=>{
  const d=doc({bhMassSolar:6.5e9});
  expect(d.querySelector('#astronomy-bht-input-status').dataset.bhtExample).toBe('m87');
  expect(d.querySelector('#astronomy-black-hole-thermal').textContent).toContain('theoretical calculations');
  expect(d.querySelector('#astronomy-black-hole-thermal').textContent).toContain('±0.2 billion statistical');
  expect(d.querySelector('a[href="https://arxiv.org/abs/1906.11243"]')).toBeTruthy();
 });
 it('keeps an exact CMB match readable and announced without reporting an evaporation rate',()=>{
  const d=doc({bhMassSolar:model({}).cmbMassSolar});
  expect(d.querySelector('#astronomy-bht-cmb-status').dataset.cmbRelation).toBe('balanced');
  expect(d.querySelector('#astronomy-bht-cmb-status').textContent).toContain('unstable');
  expect(d.querySelector('#astronomy-bht-readout').getAttribute('aria-live')).toBe('polite');
  expect(d.querySelector('#astronomy-bht-curve').getAttribute('role')).toBe('slider');
 });
 it('recovers malformed mass while preserving unrelated saved topic and stellar notes',()=>{
  const d=doc({bhMassSolar:{forged:1},selectedBH:'hawking',hrHunt:{hypothesis:'Keep notes'}});
  expect(d.querySelector('#astronomy-bht-input-status').dataset.bhtExample).toBe('solar');
  expect(d.querySelector('#astronomy-bh-panel').getAttribute('aria-labelledby')).toBe('astronomy-bh-tab-hawking');
  expect(d.body.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
 });
 it('corrects the old millimetre temperature statement, entropy units and bit-area factor',()=>{
  const hawking=doc({selectedBH:'hawking'}),entropy=doc({selectedBH:'entropy'});
  expect(hawking.querySelector('#astronomy-bh-panel').textContent).toContain('0.36 K');
  expect(hawking.querySelector('#astronomy-bh-panel').textContent).not.toContain('10²³ K');
  expect(entropy.querySelector('#astronomy-bh-panel').textContent).toContain('4 ln 2 Planck areas');
 });
 it('keeps radiation entropy distinct from the horizon entropy and fixes the Page-time interpretation',()=>{
  const d=doc({selectedBH:'page'});
  expect(d.querySelector('#astronomy-bh-panel').textContent).toContain('does not mean half the mass has evaporated');
  expect(d.querySelector('#astronomy-page-comparison').textContent).toContain('independent of the mass controls');
  expect(d.querySelector('#astronomy-page-curve-diagram').getAttribute('viewBox')).toBe('0 0 360 260');
 });
});
