import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {predict,compare}=new Function(pure+';return {predict:titrationSolutionPrediction,compare:titrationSolutionComparison};')();
const prepared=(sourceUnits=4800)=>({sourceUnits,phase:'mixed',volumeUnits:10000,eyeLevel:true});
describe('solution comparison predictions',()=>{
 it('distinguishes a lower solute amount from unchanged aliquot concentration',()=>{
  expect(predict(prepared(),'aliquot',{mass:'lower',concentration:'same'})).toEqual({mass:{answer:'lower',expected:'lower',correct:true},concentration:{answer:'same',expected:'same',correct:true}});
 });
 it('checks conservation of solute mass and lower concentration for both dilutions',()=>{
  for(const mode of ['dilute250','dilute500'])expect(predict(prepared(),mode,{mass:'same',concentration:'lower'})).toEqual({mass:{answer:'same',expected:'same',correct:true},concentration:{answer:'lower',expected:'lower',correct:true}});
 });
 it('returns independent feedback for every answer pair rather than one combined score',()=>{
  for(const mode of ['aliquot','dilute250','dilute500'])for(const mass of ['lower','same','higher'])for(const concentration of ['lower','same','higher']){
   const feedback=predict(prepared(),mode,{mass,concentration});expect(feedback.mass.correct).toBe(mass===(mode==='aliquot'?'lower':'same'));expect(feedback.concentration.correct).toBe(concentration===(mode==='aliquot'?'same':'lower'));expect(feedback.mass.answer).toBe(mass);expect(feedback.concentration.answer).toBe(concentration);
  }
 });
 it('requires both valid answers before evaluating',()=>{
  for(const answers of [undefined,null,{},[],{mass:'lower'},{concentration:'same'},{mass:'',concentration:'same'},{mass:'lower',concentration:'invalid'},{mass:1,concentration:'same'}])expect(predict(prepared(),'aliquot',answers)).toBeNull();
 });
 it('matches numerical relationships across tiny and maximum samples without floating-point false negatives',()=>{
  for(const sourceUnits of [1,2,3,5,7,999,4800,5000,20000])for(const mode of ['aliquot','dilute250','dilute500']){
   const r=compare(prepared(sourceUnits),mode),feedback=predict(prepared(sourceUnits),mode,{mass:'same',concentration:'same'});
   if(feedback.mass.expected==='same')expect(r.after.massGrams).toBe(r.before.massGrams);else expect(r.after.massGrams).toBeLessThan(r.before.massGrams);
   if(feedback.concentration.expected==='same')expect(r.after.gramsPerLiter).toBeCloseTo(r.before.gramsPerLiter,12);else expect(r.after.gramsPerLiter).toBeLessThan(r.before.gramsPerLiter);
  }
 });
 it('keeps the prepared sample and answer input immutable',()=>{
  const raw=Object.freeze(prepared()),answers=Object.freeze({mass:'higher',concentration:'lower'});predict(raw,'aliquot',answers);expect(raw).toEqual(prepared());expect(answers).toEqual({mass:'higher',concentration:'lower'});
 });
 it('follows existing completion gates and comparison fallback for invalid scenarios',()=>{
  for(const raw of [undefined,{},prepared(0),prepared(Infinity),{...prepared(),eyeLevel:false},{...prepared(),volumeUnits:10005},{...prepared(),phase:'filling'}])expect(predict(raw,'aliquot',{mass:'lower',concentration:'same'})).toBeNull();
  expect(predict(prepared(),'unknown',{mass:'lower',concentration:'same'})).toEqual(predict(prepared(),'aliquot',{mass:'lower',concentration:'same'}));
 });
});
