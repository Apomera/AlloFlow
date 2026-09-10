import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const host={};vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js','utf8'),host);const K=host.WaterWorldsKernel;
const finish=s=>K.advance(K.begin(s,false),240);
function paired(){const base=K.record(finish(K.initial()));return K.advance(K.begin(K.edit(base,[0,1,2],'paved'),true),240);}
describe('Water Worlds spatial evidence',()=>{
 it('requires a completed controlled comparison',()=>{
  expect(K.spatialDifference(K.initial())).toBe(null);const base=K.record(finish(K.initial()));
  expect(K.spatialDifference(base)).toBe(null);expect(K.spatialDifference(K.begin(base,true))).toBe(null);
  expect(K.spatialDifference(finish(paired()))).toBe(null);
 });
 it('compares reconstructed worlds at exactly the same elapsed time',()=>{
  const s=paired(),d=K.spatialDifference(s,21),a=K.atTime(s.run,21),b=K.atTime(s.baseline.run,21);
  expect(d.minute).toBe(21);expect(d.cells).toHaveLength(96);
  for(const c of d.cells)for(const k of ['surface','soil','ground']){
   expect(c[k].currentMm).toBe(a.cells[c.index][k]);expect(c[k].baselineMm).toBe(b.cells[c.index][k]);
   expect(c[k].differenceMm).toBe(a.cells[c.index][k]-b.cells[c.index][k]);
  }
 });
 it('keeps zero initial differences and sums local differences to the domain difference',()=>{
  const s=paired(),start=K.spatialDifference(s,0),end=K.spatialDifference(s);
  expect(start.cells.every(c=>c.surface.differenceMm===0&&c.soil.differenceMm===0&&c.ground.differenceMm===0)).toBe(true);
  const a=K.measure(s.world),b=K.measure(s.baseline.world);
  for(const k of ['surface','soil','ground'])expect(end.totalsM3[k]).toBeCloseTo(a[k+'M3']-b[k+'M3'],8);
  expect(end.cells.some(c=>c.surface.differenceMm>0)).toBe(true);expect(end.cells.some(c=>c.soil.differenceMm<0)).toBe(true);
 });
 it('exports detached final spatial evidence and restores safe display preferences',()=>{
  const s=paired(),before=JSON.stringify(s),e=K.evidence(s);expect(e.spatialDifference.minute).toBe(100);
  e.spatialDifference.cells[0].soil.currentMm=999;expect(JSON.stringify(s)).toBe(before);
  expect(K.report(s)).toContain('Spatial water differences at 100 min');
  expect(K.restore({...s,lens:'difference',differenceStore:'ground'}).differenceStore).toBe('ground');
  expect(K.restore({...s,differenceStore:'bad'}).differenceStore).toBe('surface');
 });
});
