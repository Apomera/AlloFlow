import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {compare,mass,step}=new Function(pure+';return {compare:titrationTransferDifference,mass:titrationTransferMass,step:titrationTransferTransition};')();
const dry=(sourceUnits=5000,residuePermille=40)=>({sourceUnits,residuePermille,phase:'poured',recordedPhase:null});
describe('visual dry transfer mass difference',()=>{
 it('separates the equal boat contribution from the two actual dry readings',()=>{
  const c=compare(dry());expect(c).toMatchObject({solidOnly:false,boatUnits:23456,maxUnits:50000,before:{boatUnits:23456,solidUnits:5000,totalUnits:28456},after:{boatUnits:23456,solidUnits:200,totalUnits:23656},delivered:{boatUnits:0,solidUnits:4800,totalUnits:4800}});
  expect(c.before.totalUnits-c.after.totalUnits).toBe(c.delivered.totalUnits);
 });
 it('removes the same boat mass from both rows while preserving the delivered result',()=>{
  const gross=compare(dry()),solid=compare(dry(),true);expect(solid).toMatchObject({solidOnly:true,before:{boatUnits:0,totalUnits:5000},after:{boatUnits:0,totalUnits:200},delivered:{totalUnits:4800}});
  expect(gross.before.totalUnits-solid.before.totalUnits).toBe(23456);expect(gross.after.totalUnits-solid.after.totalUnits).toBe(23456);expect(solid.before.totalUnits-solid.after.totalUnits).toBe(gross.delivered.totalUnits);
 });
 it('uses one fixed scale in both views and retains all solid bar widths',()=>{
  for(const units of [1,9,99,5000,5011,19999,20000])for(const residue of [0,1,40,50,99,100]){
   const s=dry(units,residue),gross=compare(s),solid=compare(s,true),actual=mass(s);
   for(const view of [gross,solid]){expect(view.maxUnits).toBe(50000);expect(view.before.totalUnits-view.after.totalUnits).toBe(actual.received);for(const key of ['before','after','delivered']){const row=view[key];expect(row.boatFraction+row.solidFraction).toBeCloseTo(row.totalUnits/50000,12);expect(row.boatFraction+row.solidFraction).toBeLessThanOrEqual(1);expect(row.boatFraction).toBeGreaterThanOrEqual(0);expect(row.solidFraction).toBeGreaterThanOrEqual(0);}}
   for(const key of ['before','after','delivered'])expect(solid[key].solidFraction).toBe(gross[key].solidFraction);
  }
 });
 it('uses rounded actual residue, including zero and tiny samples',()=>{
  expect(compare(dry(1,100),true)).toMatchObject({before:{totalUnits:1},after:{totalUnits:0},delivered:{totalUnits:1}});
  expect(compare(dry(9,100),true)).toMatchObject({before:{totalUnits:9},after:{totalUnits:1},delivered:{totalUnits:8}});
  expect(compare(dry(5000,0))).toMatchObject({after:{totalUnits:23456},delivered:{totalUnits:5000}});
 });
 it('withholds a dry comparison for an unpoured or wet trial even with an earlier dry record',()=>{
  expect(compare({...dry(),phase:'ready'})).toBeNull();expect(compare({...dry(),phase:'rinsed'})).toBeNull();expect(compare({...dry(),phase:'rinsed',recordedPhase:'poured'},true)).toBeNull();
 });
 it('preserves the original trial and permits normal rinse and record transitions',()=>{
  const original=Object.freeze({...dry(),recordedPhase:'poured'});compare(original);compare(original,true);expect(original).toEqual({...dry(),recordedPhase:'poured'});
  const rinsed=step(original,{type:'rinse'});expect(compare(rinsed)).toBeNull();expect(rinsed.recordedPhase).toBe('poured');expect(step(rinsed,{type:'record'}).recordedPhase).toBe('rinsed');
 });
 it('requires an explicit boolean to hide the boat contribution',()=>{
  for(const mode of [undefined,null,'true',1,{},[]])expect(compare(dry(),mode).before.boatUnits).toBe(23456);expect(compare(dry(),true).before.boatUnits).toBe(0);
 });
 it('rejects malformed source data without fabricating a dry reading',()=>{
  for(const raw of [undefined,null,[],{...dry(),sourceUnits:0},{...dry(),sourceUnits:Infinity},{...dry(),sourceUnits:'5000'},{...dry(),sourceUnits:20001},{...dry(),phase:'unknown'}])expect(compare(raw)).toBeNull();
  expect(compare({...dry(),residuePermille:Infinity}).after.solidUnits).toBe(200);
 });
});
