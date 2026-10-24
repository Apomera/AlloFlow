import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js');
const initial=Object.freeze(C.create({oilMl:15,starchG:3,dispersion:.95}));
const assess=(composition,waterMl,extra={})=>C.assess(composition,{waterMl,temperature:85,servings:2,recipe:'mushroom',model:3,...extra});
function pour(starchPerMl,amount,base=initial,waterBefore=45){
 const composition=C.add(base,{starchG:amount*starchPerMl},waterBefore,amount),waterMl=waterBefore+amount;
 return {composition:C.mix(composition,{waterMl,temperature:85,effort:1}),waterMl};
}

describe('Composition-aware dilution with two cooked liquid sources',()=>{
 it('distinguishes equal water volumes by the starch each source carries',()=>{
  const plain=pour(0,50),reduced=pour(.04,50);
  expect(plain.waterMl).toBe(reduced.waterMl);
  expect(plain.composition.starchG).toBe(3);expect(reduced.composition.starchG).toBe(5);
  expect(assess(initial,45).type).toBe('thick');
  expect(assess(plain.composition,plain.waterMl).type).toBe('coating');
  expect(assess(reduced.composition,reduced.waterMl).type).toBe('thick');
  expect(plain.composition.oilMl).toBe(15);expect(reduced.composition.oilMl).toBe(15);
 });
 it('conserves starch and water across finite source transfers without creating extra liquid',()=>{
  const source=Object.freeze(C.create({starchG:4})),first=C.transfer(source,100,50);
  const pan=C.add(initial,first.transferred.composition,45,first.transferred.waterMl);
  expect(pan.starchG+first.remaining.starchG).toBe(initial.starchG+source.starchG);
  expect(45+first.transferred.waterMl+first.waterMl).toBe(145);
  const rest=C.transfer(first.remaining,first.waterMl,80);
  expect(rest.transferred.waterMl).toBe(50);expect(rest.waterMl).toBe(0);expect(rest.remaining.starchG).toBe(0);
  const empty=C.transfer(rest.remaining,rest.waterMl,50);
  expect(empty.transferred.waterMl).toBe(0);expect(empty.transferred.composition.starchG).toBe(0);
  const combined=C.add(pan,rest.transferred.composition,95,rest.transferred.waterMl);
  expect(combined.starchG).toBe(7);expect(combined.oilMl).toBe(15);
  expect(source).toEqual({starchG:4,oilMl:0,dispersion:0});
 });
 it('reduces concentration toward the source concentration rather than treating every splash as plain water',()=>{
  let previous=assess(initial,45).starchPercent;
  for(const amount of [10,50,150,1000]){
   const next=pour(.04,amount),reading=assess(next.composition,next.waterMl);
   expect(reading.starchPercent).toBeLessThan(previous);
   expect(reading.starchPercent).toBeGreaterThan(4);
   expect(reading.type).toBe('thick');previous=reading.starchPercent;
  }
 });
 it('keeps a large starch-rich mixture thick instead of labelling it watery because of volume alone',()=>{
  const next=pour(.04,150),reading=assess(next.composition,next.waterMl);
  expect(next.waterMl).toBe(195);expect(reading.starchPercent).toBeGreaterThan(4);
  expect(reading.type).toBe('thick');expect(reading.flowText).toContain('very slowly');
  // Previous save versions retain their original observation and assessment rules.
  for(const model of [1,2])expect(assess(next.composition,next.waterMl,{model}).type).toBe('watery');
 });
 it('can leave a large amount of sauce with body, then dilute it far enough to become thin',()=>{
  const generous=pour(0,150),excess=pour(0,300);
  expect(generous.waterMl).toBeGreaterThan(180);
  expect(assess(generous.composition,generous.waterMl).type).toBe('coating');
  const thin=assess(excess.composition,excess.waterMl);
  expect(thin.type).toBe('watery');expect(thin.viscosity).toBeLessThan(C.constants.minBody);
  expect(excess.composition.starchG).toBe(initial.starchG);
  expect(thin.coatingText).toContain('runs off');
 });
 it('allows plain water to recover a measured addition of the concentrated source',()=>{
  const first=pour(.04,50),recovered=pour(0,70,first.composition,first.waterMl);
  expect(assess(first.composition,first.waterMl).type).toBe('thick');
  expect(assess(recovered.composition,recovered.waterMl).type).toBe('coating');
  expect(recovered.composition.starchG).toBe(first.composition.starchG);
  expect(recovered.composition.oilMl).toBe(initial.oilMl);
 });
 it('makes folding redistribute the added liquid without removing excess starch or adding water',()=>{
  const mixed=pour(.04,50),before=JSON.stringify(mixed);let folded=mixed.composition;
  for(let i=0;i<5;i++)folded=C.mix(folded,{waterMl:mixed.waterMl,temperature:85,effort:1});
  expect(folded.starchG).toBe(5);expect(folded.oilMl).toBe(15);
  expect(assess(folded,mixed.waterMl).type).toBe('thick');
  expect(JSON.stringify(mixed)).toBe(before);
 });
 it('retains cooling thickening and the meaning of its model-two evidence fields',()=>{
  const sauce=C.create({oilMl:15,starchG:1.5,dispersion:.95});
  for(const temperature of [35,60,85,100]){
   expect(assess(sauce,50,{temperature})).toEqual(assess(sauce,50,{temperature,model:2}));
  }
  expect(assess(sauce,50,{temperature:35}).type).toBe('thick');
  expect(assess(sauce,50,{temperature:85}).type).toBe('coating');
 });
 it('scales the same concentration and flow outcomes with the serving count',()=>{
  for(const starchPerMl of [0,.04])for(const amount of [50,150,300]){
   const small=pour(starchPerMl,amount),large=pour(starchPerMl,amount*2,{oilMl:30,starchG:6,dispersion:.95},90);
   const a=assess(small.composition,small.waterMl),b=assess(large.composition,large.waterMl,{servings:4});
   for(const key of ['type','starchPercent','viscosity','dispersion','coolingFactor'])expect(b[key]).toBe(a[key]);
   expect(b.starchG).toBe(a.starchG*2);expect(b.oilMl).toBe(a.oilMl*2);
  }
 });
 it('keeps insufficient free water, separate oil, and irreversible scorching distinct from thickness',()=>{
  expect(assess(initial,8).type).toBe('dry');
  expect(assess({oilMl:25,starchG:1.2,dispersion:.08},80).type).toBe('separated');
  const diluted=pour(0,50);
  expect(assess(diluted.composition,diluted.waterMl,{damage:1}).type).toBe('scorched');
  expect(assess(diluted.composition,diluted.waterMl,{damage:1}).observation).toContain('cannot undo');
 });
 it('requires a finite temperature for the new cooling calculation and never mutates the input',()=>{
  const options=Object.freeze({waterMl:45,temperature:85,servings:2,recipe:'mushroom',model:3});
  const before=JSON.stringify([initial,options]);C.assess(initial,options);
  expect(JSON.stringify([initial,options])).toBe(before);
  for(const temperature of [undefined,null,NaN,Infinity,-Infinity,-274])expect(()=>assess(initial,45,{temperature})).toThrow();
 });
});
