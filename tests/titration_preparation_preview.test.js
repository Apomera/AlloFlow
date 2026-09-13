import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {preview,offset,step,result}=new Function(pure+';return {preview:titrationPreparationAdditionPreview,offset:titrationPreparationMeniscusOffset,step:titrationPreparationTransition,result:titrationPreparationResult};')();
const sample=(volumeUnits=9995,eyeLevel=true)=>({sourceUnits:4800,phase:'filling',volumeUnits,eyeLevel});
describe('solution preparation addition preview',()=>{
 it('compares fine and coarse additions at the mark without changing the sample',()=>{
  const s=Object.freeze(sample());expect(preview(s,5)).toEqual({units:5,beforeUnits:9995,afterUnits:10000,differenceUnits:0,relation:'at'});expect(preview(s,100)).toMatchObject({afterUnits:10095,differenceUnits:-95,relation:'above'});expect(s.volumeUnits).toBe(9995);
 });
 it('matches the actual next action throughout the permitted volume range',()=>{
  for(let v=9500;v<=10000;v+=5)for(const units of [5,100]){const s=Object.freeze(sample(v)),p=preview(s,units);expect(p.afterUnits).toBe(step(s,{type:'add',units}).volumeUnits);expect(p.differenceUnits).toBe(10000-p.afterUnits);expect(s.volumeUnits).toBe(v);}
 });
 it('reports below, exactly at, and above the target using integer model volumes',()=>{
  expect(preview(sample(9895),100)).toMatchObject({relation:'below',differenceUnits:5});expect(preview(sample(9900),100).relation).toBe('at');expect(preview(sample(9905),100)).toMatchObject({relation:'above',differenceUnits:-5});
 });
 it('keeps intentional overshoot available at the mark while never inventing a result',()=>{
  for(const units of [5,100])expect(preview(sample(10000),units)).toMatchObject({relation:'above',afterUnits:10000+units});expect(result(sample(10000))).toBeNull();
 });
 it('does not forecast further additions before filling, after overshoot, or after completion',()=>{
  for(const raw of [undefined,{}, {...sample(),phase:'received'}, {...sample(),phase:'dissolved'},sample(10005),{...sample(10000),phase:'mixed'},{...sample(),sourceUnits:Infinity}])expect(preview(raw,5)).toBeNull();
 });
 it('rejects unsupported portions and normalizes corrupt saved volume with the existing model',()=>{
  for(const units of [null,undefined,0,1,25,-5,Infinity,NaN,'5'])expect(preview(sample(),units)).toBeNull();expect(preview(sample(NaN),5)).toMatchObject({beforeUnits:9500,afterUnits:9505});
 });
 it('does not perform the eye check or mix when a preview reaches the target',()=>{
  const s=Object.freeze(sample(9995,false)),p=preview(s,5);expect(p.relation).toBe('at');const after=step(s,{type:'add',units:5});expect(after.eyeLevel).toBe(false);expect(result(step(after,{type:'mix'}))).toBeNull();expect(s.eyeLevel).toBe(false);
 });
 it('places model and preview menisci on the correct side of the single calibration mark',()=>{
  expect(offset(10000)).toBe(0);expect(offset(9995)).toBeGreaterThan(0);expect(offset(10005)).toBeLessThan(0);expect(offset(10095)).toBeGreaterThanOrEqual(-29);expect(offset(9500)).toBeLessThanOrEqual(70);expect(offset(9995)).toBeLessThan(offset(9990));
 });
});
