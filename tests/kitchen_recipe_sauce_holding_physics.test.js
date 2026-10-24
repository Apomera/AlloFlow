import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js');
const uptake=(extra={})=>C.absorb({waterMl:80,absorbedWaterMl:0,dryPastaG:160,temperature:90,seconds:120,...extra});
const composition=Object.freeze(C.create({oilMl:15,starchG:1.5,dispersion:.95}));
const assess=(temperature,extra={})=>C.assess(composition,{waterMl:50,temperature,servings:2,recipe:'mushroom',model:2,...extra});

describe('Water movement and cooling during a sauce hold',()=>{
 it('moves free water into a finite pasta reservoir without calling that water evaporated',()=>{
  const result=uptake();
  expect(result.transferredMl).toBeGreaterThan(0);
  expect(result.transferredMl).toBeLessThan(160*.15);
  expect(result.absorbedWaterMl).toBeCloseTo(result.transferredMl,12);
  expect(result.waterMl+result.absorbedWaterMl).toBeCloseTo(80,12);
  expect(Object.keys(result).sort()).toEqual(['absorbedWaterMl','transferredMl','waterMl']);
 });
 it('retains prior absorbed water and transfers no more than the remaining capacity or supply',()=>{
  const limited=uptake({waterMl:2,absorbedWaterMl:10,seconds:1e8});
  expect(limited).toEqual({waterMl:0,absorbedWaterMl:12,transferredMl:2});
  const saturated=uptake({absorbedWaterMl:23,seconds:1e8});
  expect(saturated).toEqual({waterMl:79,absorbedWaterMl:24,transferredMl:1});
  const alreadyFull=uptake({absorbedWaterMl:25});
  expect(alreadyFull).toEqual({waterMl:80,absorbedWaterMl:25,transferredMl:0});
 });
 it('does not absorb without pasta, available water, remaining capacity, or time',()=>{
  for(const extra of [{dryPastaG:0},{waterMl:0},{absorbedWaterMl:24},{seconds:0}]){
   const result=uptake(extra);
   expect(result.transferredMl).toBe(0);
   expect(result.waterMl).toBe(extra.waterMl??80);
   expect(result.absorbedWaterMl).toBe(extra.absorbedWaterMl??0);
  }
 });
 it('slows uptake as the pan cools and pauses it below the model temperature range',()=>{
  expect(uptake({temperature:65}).transferredMl).toBeLessThan(uptake({temperature:90}).transferredMl);
  expect(uptake({temperature:40}).transferredMl).toBe(0);
  expect(uptake({temperature:22}).transferredMl).toBe(0);
  expect(uptake({temperature:140})).toEqual(uptake({temperature:90}));
 });
 it('gives the same uptake for a whole interval or repeated fixed-temperature steps',()=>{
  for(const waterMl of [2,80])for(const temperature of [22,65,95]){
   const input={waterMl,absorbedWaterMl:3,dryPastaG:160,temperature};
   const whole=C.absorb({...input,seconds:120});let split={...input},moved=0;
   for(let i=0;i<240;i++){
    const step=C.absorb({...split,seconds:.5});moved+=step.transferredMl;
    split={...split,waterMl:step.waterMl,absorbedWaterMl:step.absorbedWaterMl};
   }
   expect(split.waterMl).toBeCloseTo(whole.waterMl,11);
   expect(split.absorbedWaterMl).toBeCloseTo(whole.absorbedWaterMl,11);
   expect(moved).toBeCloseTo(whole.transferredMl,11);
  }
 });
 it('scales both water reservoirs and capacity with the pasta portion',()=>{
  const small=uptake({absorbedWaterMl:5}),large=uptake({waterMl:160,absorbedWaterMl:10,dryPastaG:320});
  for(const key of ['waterMl','absorbedWaterMl','transferredMl'])expect(large[key]).toBeCloseTo(small[key]*2,12);
 });
 it('concentrates the unchanged oil and starch as water enters the pasta',()=>{
  const water=uptake({waterMl:50});
  const before=assess(90),after=assess(90,{waterMl:water.waterMl});
  expect(after.starchPercent).toBeGreaterThan(before.starchPercent);
  expect(after.oilMl).toBe(before.oilMl);expect(after.starchG).toBe(before.starchG);
  expect(composition).toEqual({oilMl:15,starchG:1.5,dispersion:.95});
 });
 it('makes the same cooked composition thicken as it cools without creating or removing ingredients',()=>{
  const warm=assess(95),cool=assess(35);
  expect(warm.type).toBe('coating');expect(cool.type).toBe('thick');
  expect(warm.coolingFactor).toBe(1);expect(cool.coolingFactor).toBe(1.7);
  expect(cool.warmViscosity).toBe(warm.viscosity);
  expect(cool.viscosity).toBeCloseTo(warm.viscosity*1.7,12);
  for(const key of ['waterMl','oilMl','starchG','starchPercent','dispersion'])expect(cool[key]).toBe(warm[key]);
  expect(assess(60).viscosity).toBeGreaterThan(warm.viscosity);
  expect(assess(60).viscosity).toBeLessThan(cool.viscosity);
 });
 it('retains the original model-one reading and its exact field set at every temperature',()=>{
  const original=C.assess(composition,{waterMl:50,servings:2,recipe:'mushroom'});
  expect(original.viscosity).toBe(3*.55+15/50);
  expect(original.type).toBe('coating');
  expect(Object.keys(original).sort()).toEqual(['coating','coatingText','dispersion','flowText','freeOilMl','label','observation','oilDroplets','oilFraction','oilMl','separationText','starchG','starchPercent','type','viscosity','waterMl']);
  for(const temperature of [22,35,85,115])expect(assess(temperature,{model:1})).toEqual(original);
  // Model one never required a temperature merely to inspect a composition.
  expect(C.assess(composition,{waterMl:50,servings:2,recipe:'mushroom',model:1})).toEqual(original);
 });
 it('keeps extreme valid readings bounded and cold uptake at zero',()=>{
  for(const temperature of [-273.15,Number.MAX_VALUE]){
   const reading=assess(temperature,{waterMl:0});
   for(const value of Object.values(reading))if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);
  }
  expect(uptake({temperature:-273.15,seconds:Number.MAX_VALUE}).transferredMl).toBe(0);
  expect(uptake({temperature:Number.MAX_VALUE,seconds:Number.MAX_VALUE}).absorbedWaterMl).toBe(24);
 });
 it('rejects invalid reservoir, time and temperature values without mutating input',()=>{
  for(const key of ['waterMl','absorbedWaterMl','dryPastaG','seconds'])for(const bad of [undefined,null,-1,NaN,Infinity,-Infinity,'5'])expect(()=>uptake({[key]:bad})).toThrow();
  for(const bad of [undefined,null,-274,NaN,Infinity,-Infinity,'90']){
   expect(()=>uptake({temperature:bad})).toThrow();expect(()=>assess(bad)).toThrow();
  }
  const options=Object.freeze({waterMl:80,absorbedWaterMl:3,dryPastaG:160,temperature:90,seconds:120});
  const before=JSON.stringify(options);C.absorb(options);expect(JSON.stringify(options)).toBe(before);
 });
});
