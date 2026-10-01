import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';
let P;
beforeAll(()=>{loadAlloModule('stem_lab/stem_tool_geosandbox.js');P=window.StemLab.geoPure;});
const box=(size=[1,1,1])=>({shape:'box',size,position:[0,0.5,0],rotation:[0,0,0],color:'#60a5fa'});
describe('Geometry workbench mathematical fidelity',()=>{
 it('uses identical display units in the floating part label and measurements',()=>{
  const recipe={scale:1.25,parts:[box([2,3,4])]};const m=P.geoSculptMeasure(recipe,2.6).parts[0];
  const label=P.sculptPartLabelText(recipe.parts[0],0,recipe.scale,'cm');
  expect(label).toContain('V: '+Math.round(m.vol*100)/100+' cm^3');expect(label).toContain('SA: '+Math.round(m.sa*100)/100+' cm^2');
 });
 it('applies one uniform factor when a dimension reaches its limit',()=>{
  const p=box([3.8,2,1]);const result=P.geoUniformPartScale(p,1.25);
  expect(result.limited).toBe(true);expect(result.part.size[0]).toBeCloseTo(4,12);
  result.part.size.forEach((n,i)=>expect(n/p.size[i]).toBeCloseTo(result.factor,12));
 });
 it('reports no change at the maximum size',()=>{const r=P.geoUniformPartScale(box([4,4,4]),1.25);expect(r.factor).toBe(1);expect(r.part.size).toEqual([4,4,4]);});
 it('preserves tiny-size proportions when shrinking to the limit',()=>{const r=P.geoUniformPartScale(box([0.02,1,2]),0.5);expect(r.factor).toBe(1);expect(r.part.size).toEqual([0.02,1,2]);});
 it('keeps exact scaling ratios without rounding dimensions independently',()=>{
  const p=box([0.37,0.83,1.91]),r=P.geoUniformPartScale(p,1.25),study=P.geoSculptStudyFromParts(p,r.part,r.factor,1,2.6);
  expect(study.volumeRatio).toBeCloseTo(1.25**3,12);expect(study.areaRatio).toBeCloseTo(1.25**2,12);
  expect(study.after.vol).toBeCloseTo(P.geoSculptMeasure({parts:[r.part]},2.6).totalVol,12);
 });
 it('normalizes position before readout and rendering',()=>{const r=P.geoNormalizeSculpt({parts:[{...box(),position:[7,-8,9]}]});expect(r.parts[0].position).toEqual([4,-4,4]);});
 it('prevents self-intersecting default rings',()=>{const r=P.geoNormalizeSculpt({parts:[{...box(),shape:'torus',size:[0.8,0.8,0.8]}]});expect(r.parts[0].size[1]).toBeLessThan(r.parts[0].size[0]);});
 it('preserves a positive ring opening when scaling down',()=>{const p={...box(),shape:'torus',size:[0.04,0.02,0.2]};const r=P.geoUniformPartScale(p,0.5);expect(r.part.size[0]-r.part.size[1]).toBeGreaterThanOrEqual(0.02);});
 it('matches the annulus volume integral with the torus volume',()=>{const p={shape:'torus',size:[1,0.2]};const profile=P.geoSculptSliceProfile(p,0.5,1,2.6,200);expect(profile.estimate).toBeCloseTo(profile.exact,2);});
});
describe('Geometry sculpture exchange',()=>{
 it('imports its exported recipe envelope without losing exact dimensions and labels',()=>{const r={name:'Bridge',parts:[{...box([1.125,2,3]),label:'Pier',locked:true,finish:'matte'}]};const next=P.geoSculptImport(JSON.stringify({schema:'geometry-sculpture-v1',recipe:r}));expect(next.name).toBe('Bridge');expect(next.parts[0].size).toEqual([1.125,2,3]);expect(next.parts[0].label).toBe('Pier');expect(next.parts[0].locked).toBe(true);expect(next.parts[0].finish).toBe('matte');});
 it.each(['lathe','extrude','unknown'])('rejects %s instead of showing incorrect primitive measurements',shape=>expect(()=>P.geoSculptImport({parts:[{...box(),shape}]})).toThrow());
 it('rejects distorted primitives rather than mislabeling them as exact',()=>{expect(()=>P.geoSculptImport({parts:[{...box(),stretch:[2,1,1]}]})).toThrow();expect(()=>P.geoSculptImport({parts:[{...box(),deform:{twist:30}}]})).toThrow();});
 it('rejects nonfinite or malformed dimension vectors',()=>{expect(()=>P.geoSculptImport({parts:[{...box(),size:[Infinity,1,1]}]})).toThrow();expect(()=>P.geoSculptImport({parts:[{...box(),position:'bad'}]})).toThrow();});
 it('rejects oversized assemblies rather than silently discarding parts',()=>expect(()=>P.geoSculptImport({parts:Array.from({length:15},()=>box())})).toThrow());
});
