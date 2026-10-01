import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {compare,aliquot}=new Function(pure+';return {compare:titrationSolutionComparison,aliquot:titrationAliquotResult};')();
const prepared=(sourceUnits=4800)=>({sourceUnits,phase:'mixed',volumeUnits:10000,eyeLevel:true});
describe('solution volume and concentration comparison',()=>{
 it('takes a quarter-volume portion with quarter solute mass and unchanged concentration',()=>{
  const r=compare(prepared(),'aliquot');expect(r.before).toMatchObject({volumeMl:100,massGrams:0.48,gramsPerLiter:4.8});
  expect(r.after).toMatchObject({volumeMl:25,massGrams:0.12,gramsPerLiter:4.8});
 });
 it('dilutes the whole recorded mass to the final volume, not by that volume',()=>{
  expect(compare(prepared(),'dilute250').after).toMatchObject({volumeMl:250,massGrams:0.48,gramsPerLiter:1.92});
  expect(compare(prepared(),'dilute500').after).toMatchObject({volumeMl:500,massGrams:0.48,gramsPerLiter:0.96});
 });
 it('uses independent examples without consuming or mutating the original sample',()=>{
  const s=Object.freeze(prepared());compare(s,'aliquot');const r=compare(s,'dilute500');expect(r.after.massGrams).toBe(s.sourceUnits/10000);expect(s).toEqual(prepared());
 });
 it('matches the real aliquot calculation and mass-per-volume identity over the sample range',()=>{
  for(const sourceUnits of [1,2,3,5,10,999,4800,5000,20000]){
   const actual=aliquot({sourceUnits,phase:'delivered',eyeLevel:true,atWall:true,recorded:true});
   const portion=compare(prepared(sourceUnits),'aliquot').after;
   expect(portion.massGrams).toBeCloseTo(actual.massGrams,12);expect(portion.gramsPerLiter).toBeCloseTo(actual.gramsPerLiter,12);
   for(const mode of ['aliquot','dilute250','dilute500']){const r=compare(prepared(sourceUnits),mode);expect(r.after.gramsPerLiter*r.after.volumeMl/1000).toBeCloseTo(r.after.massGrams,12);}
  }
 });
 it('keeps small calculated masses and concentrations positive without rounding them to zero',()=>{
  expect(compare(prepared(1),'aliquot').after.massGrams).toBeCloseTo(0.000025,12);
  expect(compare(prepared(1),'dilute500').after.gramsPerLiter).toBeCloseTo(0.0002,12);
 });
 it('makes tile areas and solute symbols proportional within every comparison',()=>{
  for(const mode of ['aliquot','dilute250','dilute500']){const r=compare(prepared(),mode);expect(r.before.tiles*25).toBe(r.before.volumeMl);expect(r.after.tiles*25).toBe(r.after.volumeMl);expect(r.after.symbols/r.before.symbols).toBeCloseTo(r.after.massGrams/r.before.massGrams,12);expect((r.after.symbols/r.after.tiles)/(r.before.symbols/r.before.tiles)).toBeCloseTo(r.after.gramsPerLiter/r.before.gramsPerLiter,12);}
 });
 it('requires a valid mixed preparation, retaining existing eye-level and volume gates',()=>{
  for(const raw of [undefined,{}, {...prepared(),phase:'filling'}, {...prepared(),phase:'received'}, {...prepared(),eyeLevel:false}, {...prepared(),volumeUnits:10005}, {...prepared(),volumeUnits:NaN}])expect(compare(raw,'dilute250')).toBeNull();
  for(const sourceUnits of [0,-1,20001,0.5,NaN,Infinity,'4800'])expect(compare(prepared(sourceUnits),'aliquot')).toBeNull();
 });
 it('defaults unsupported selections to the valid portion example',()=>{
  for(const mode of [undefined,null,'','dilute0','500',Infinity,{}])expect(compare(prepared(),mode)).toEqual(compare(prepared(),'aliquot'));
 });
});
