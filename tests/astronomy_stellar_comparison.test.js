import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); model=window.__alloAstroPure.hrComparisonModel; });
const html = iq => new window.DOMParser().parseFromString(renderTool('astronomy', {astronomy:{tab:'hrDiagram',observingList:[],hrHunt:iq}}),'text/html');
describe('published stellar inputs and physical size comparisons', () => {
 it.each([
  [5772,1,1,'sun'],[9845,24.74,2.063,'siriusA'],[25369,.02448,1.018,'siriusB']
 ])('recognizes all three unmodified reference inputs (%s K)',(t,l,m,id)=>{
  expect(model(t,l,m,'true').reference.id).toBe(id);
  expect(model(String(t),String(l),String(m),'true').reference.id).toBe(id);
 });
 it.each(['temperature','luminosity','mass'])('clears reference attribution when %s is changed',field=>{
  const values={temperature:9845,luminosity:24.74,mass:2.063}; values[field]*=1.01;
  expect(model(values.temperature,values.luminosity,values.mass,'true').reference).toBeNull();
 });
 it('fits the independently reported Sirius radii within the quoted radius errors',()=>{
  expect(Math.abs(model(9845,24.74,2.063).star.radius-1.7144)).toBeLessThan(.0090);
  expect(Math.abs(model(25369,.02448,1.018).star.radius-.008098)).toBeLessThan(.000046);
 });
 it('keeps a hotter white dwarf faint because its radiating area is small',()=>{
  const a=model(9845,24.74,2.063), b=model(25369,.02448,1.018);
  expect(b.star.tempK).toBeGreaterThan(a.star.tempK);
  expect(b.emissionPerArea).toBeGreaterThan(a.emissionPerArea);
  expect(b.surfaceArea/a.surfaceArea).toBeLessThan(.00003);
  expect(b.star.lumin/a.star.lumin).toBeLessThan(.001);
  expect(b.star.category).toBe('whiteDwarf');
 });
 it('recovers luminosity from surface area and emission across the supported diagram',()=>{
  for(const t of [2000,5772,9845,25369,50000])for(const l of [.001,.02448,1,24.74,100000]){
   const m=model(t,l,1,'true');
   expect(m.surfaceArea*m.emissionPerArea/l).toBeCloseTo(1,12);
   expect(m.starDisk/m.sunDisk/m.star.radius).toBeCloseTo(1,12);
   expect(Math.max(m.sunDisk,m.starDisk)).toBeCloseTo(80,12);
   expect(Math.min(m.sunDisk,m.starDisk)).toBeGreaterThan(0);
   expect([m.sunDisk,m.starDisk,m.surfaceArea,m.emissionPerArea].every(Number.isFinite)).toBe(true);
  }
 });
 it('never enlarges subpixel physical disks in true scale mode',()=>{
  const tinyStar=model(50000,.001,1,'true'), tinySun=model(2000,100000,1,'true');
  expect(tinyStar.starDisk).toBeLessThan(1); expect(tinyStar.starTiny).toBe(true);
  expect(tinySun.sunDisk).toBeLessThan(1); expect(tinySun.sunTiny).toBe(true);
  expect(tinyStar.sunTiny).toBe(false); expect(tinySun.starTiny).toBe(false);
 });
 it('makes the readable comparison explicitly compressed',()=>{
  const a=model(25369,.02448,1.018,'compressed'),b=model(25369,.02448,1.018,'true');
  expect(a.starDisk).toBe(10);expect(a.sunDisk).toBe(36);
  expect(a.starDisk/a.sunDisk).not.toBeCloseTo(a.star.radius,2);
  expect(b.starDisk/b.sunDisk).toBeCloseTo(b.star.radius,12);
 });
 it.each([undefined,null,false,true,'',{},[],NaN,Infinity,-Infinity].map(v=>[v]))('recovers malformed values (%s) to finite controls',v=>{
  const m=model(v,v,v,v);
  expect(m.star.tempK).toBe(5800);expect(m.star.lumin).toBe(1);expect(m.mass).toBe(1);
  expect(m.mode).toBe('compressed');expect(m.reference).toBeNull();
  expect(Number.isFinite(m.starDisk)).toBe(true);
 });
 it('changes mass without moving the diagram or changing physical radius',()=>{
  const a=model(25369,.02448,1.018,'true'),b=model(25369,.02448,20,'true');
  expect(b.star).toEqual(a.star);expect(b.surfaceArea).toBe(a.surfaceArea);
  expect(b.reference).toBeNull();
 });
});
describe('clear saved stellar comparisons',()=>{
 it('renders a real reference with exact quoted inputs and the true scale choice pressed',()=>{
  const doc=html({tempK:25369,lumin:.02448,mass:1.018,sizeScale:'true'});
  expect(doc.querySelector('#astronomy-hr-reference-status').dataset.reference).toBe('siriusB');
  expect(doc.querySelector('#hr-mass').getAttribute('value')).toBe('1.018');
  expect(doc.querySelector('#hr-mass').getAttribute('step')).toBe('0.001');
  expect(doc.querySelector('#astronomy-hr-size').dataset.sizeScale).toBe('true');
  const disks=doc.querySelectorAll('[data-hr-disk]');
  expect(Number(disks[1].getAttribute('r'))/Number(disks[0].getAttribute('r'))).toBeCloseTo(.008098,5);
  expect(doc.querySelector('#astronomy-hr-scale-note').textContent).toContain('same scale');
  expect(doc.querySelector('#astronomy-hr-references').textContent).toContain('internal model-fit errors');
 });
 it('distinguishes teaching presets from referenced inputs on the same diagram',()=>{
  const doc=html({tempK:4000,lumin:1000,mass:1.5});
  expect(doc.querySelector('#astronomy-hr-reference-status').dataset.reference).toBe('custom');
  expect(doc.querySelectorAll('[data-hr-reference]')).toHaveLength(2);
  expect(doc.querySelector('#astronomy-hr-explorer').textContent).toContain('Teaching examples');
  expect(doc.querySelector('#astronomy-hr-explorer').textContent).toContain('its axes are logarithmic');
 });
 it('rejects forged display modes while keeping notes and logged stars',()=>{
  const doc=html({sizeScale:{mode:'true'},hypothesis:'Keep this prediction',log:[{m:1,t:5772,l:1,c:'sunLike'}]});
  expect(doc.querySelector('#astronomy-hr-size').dataset.sizeScale).toBe('compressed');
  expect(doc.querySelector('textarea').textContent).toBe('Keep this prediction');
  expect(doc.querySelectorAll('tbody tr')).toHaveLength(1);
  expect(doc.body.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
 });
});
