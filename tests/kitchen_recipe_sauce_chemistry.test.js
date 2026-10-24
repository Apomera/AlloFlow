import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js');
const reading=(s,waterMl,extra={})=>C.assess(s,{waterMl,servings:2,recipe:'mushroom',...extra});
const fold=(s,waterMl,temperature=92,effort=1)=>C.mix(s,{waterMl,temperature,effort});

describe('Conserved sauce ingredients and qualitative chemistry',()=>{
 it('adds measured starch and oil without creating a second canonical water field',()=>{
  const s=C.create({oilMl:15,starchG:.35,dispersion:.3}),next=C.add(s,{starchG:.6},8,50);
  expect(next).toEqual({oilMl:15,starchG:.95,dispersion:expect.any(Number)});
  expect(next).not.toHaveProperty('waterMl');expect(s.starchG).toBe(.35);
 });
 it('rescues the dry dish with a measured splash followed by folding, not folding alone',()=>{
  const s=C.create({oilMl:15,starchG:.35,dispersion:.3});
  expect(reading(s,8).type).toBe('dry');expect(reading(fold(s,8),8).coating).toBe(false);
  const wet=C.add(s,{starchG:.6},8,50);expect(reading(wet,58).type).toBe('separated');
  expect(reading(fold(wet,58),58).type).toBe('coating');
 });
 it('reduces a loose tomato sauce by removing only water, concentrating the retained starch',()=>{
  const s=C.create({oilMl:15,starchG:1.6,dispersion:.9}),before=reading(s,240,{recipe:'tomato'});
  const after=C.advance(s,{waterMl:170,temperature:98,seconds:60}),reduced=reading(after,170,{recipe:'tomato'});
  expect(before.type).toBe('watery');expect(reduced.type).toBe('coating');
  expect(after.oilMl).toBe(s.oilMl);expect(after.starchG).toBe(s.starchG);
  expect(reduced.starchPercent).toBeCloseTo(before.starchPercent*240/170,12);
 });
 it('distinguishes equal water additions containing different amounts of starch',()=>{
  const base=C.create({oilMl:15,starchG:.1}),plain=fold(C.add(base,{},8,50),58),starchy=fold(C.add(base,{starchG:.6},8,50),58);
  expect(reading(plain,58).type).toBe('watery');expect(reading(starchy,58).type).toBe('coating');
  expect(reading(starchy,58).viscosity).toBeGreaterThan(reading(plain,58).viscosity);
 });
 it('shows thickening during excessive reduction and dilution when water is restored',()=>{
  const s=C.create({oilMl:15,starchG:1.6,dispersion:.95});
  expect(reading(s,40).type).toBe('thick');
  const diluted=C.add(s,{},40,40);expect(reading(fold(diluted,80),80).type).toBe('coating');
  expect(diluted.starchG).toBe(1.6);expect(diluted.oilMl).toBe(15);
 });
 it('retains the same composition and observation when a recipe is doubled',()=>{
  for(const recipe of ['mushroom','tomato']){
   const s=C.create({oilMl:25,starchG:1.2,dispersion:.08}),large=C.create({oilMl:50,starchG:2.4,dispersion:.08});
   const a=reading(fold(s,80),80,{recipe}),b=reading(fold(large,160),160,{recipe,servings:4});
   for(const key of ['type','coating','starchPercent','oilFraction','dispersion','viscosity'])expect(b[key]).toEqual(a[key]);
   expect(b.freeOilMl).toBeCloseTo(a.freeOilMl*2,12);
  }
 });
 it('makes excess oil and insufficient water matter even after repeated folding',()=>{
  let s=C.create({oilMl:90,starchG:1.2,dispersion:.05});
  for(let i=0;i<10;i++)s=fold(s,60);
  expect(reading(s,60).type).toBe('separated');expect(s.oilMl).toBe(90);
 });
 it('requires the hot separated challenge to cool before folding can restore a coating',()=>{
  let s=C.create({oilMl:25,starchG:1.2,dispersion:.08});
  expect(reading(s,80).type).toBe('separated');
  for(let i=0;i<10;i++)s=fold(s,80,115);
  expect(reading(s,80).type).toBe('separated');expect(s.dispersion).toBeLessThan(.5);
  const cooled=C.advance(s,{waterMl:80,temperature:97,seconds:60});
  expect(reading(cooled,80).type).toBe('separated');
  expect(reading(fold(cooled,80,97),80).type).toBe('coating');
 });
 it('uses starch to slow settling while leaving the oil and starch quantities intact',()=>{
  const plain=C.create({oilMl:15,starchG:0,dispersion:.95}),starchy=C.create({...plain,starchG:1.2}),o={waterMl:80,temperature:92,seconds:300};
  const a=C.advance(plain,o),b=C.advance(starchy,o);
  expect(b.dispersion).toBeGreaterThan(a.dispersion);expect(a.oilMl).toBe(15);expect(b.oilMl).toBe(15);expect(b.starchG).toBe(1.2);
  expect(reading(a,80).freeOilMl).toBeGreaterThan(reading(b,80).freeOilMl);
 });
 it('gives consistent settling and mixing across split time or effort steps at fixed conditions',()=>{
  const s=C.create({oilMl:25,starchG:1.2,dispersion:.95});
  for(const temperature of [22,92,115]){
   const whole=C.advance(s,{waterMl:80,temperature,seconds:60});let split=s;
   for(let i=0;i<120;i++)split=C.advance(split,{waterMl:80,temperature,seconds:.5});
   expect(split.dispersion).toBeCloseTo(whole.dispersion,12);
  }
  const whole=fold(s,80,92,1),split=fold(fold(s,80,92,.4),80,92,.6);
  expect(split.dispersion).toBeCloseTo(whole.dispersion,12);
 });
 it('conserves water, starch and oil during a representative portion transfer',()=>{
  const s=C.create({oilMl:25,starchG:1.2,dispersion:.9}),part=C.transfer(s,80,30);
  expect(part.waterMl+part.transferred.waterMl).toBe(80);
  for(const key of ['oilMl','starchG'])expect(part.remaining[key]+part.transferred.composition[key]).toBeCloseTo(s[key],12);
  expect(part.transferred.composition.starchG).toBeCloseTo(.45,12);
  expect(part.remaining.dispersion).toBe(s.dispersion);expect(part.transferred.composition.dispersion).toBe(s.dispersion);
  const restored=C.add(part.remaining,part.transferred.composition,part.waterMl,part.transferred.waterMl);
  expect(restored.starchG).toBeCloseTo(s.starchG,12);expect(restored.oilMl).toBeCloseTo(s.oilMl,12);
 });
 it('clamps transfers to the available water and does not carry dissolved material from an empty vessel',()=>{
  const s=C.create({oilMl:25,starchG:1.2,dispersion:.9}),all=C.transfer(s,80,500),none=C.transfer(s,0,50);
  expect(all.waterMl).toBe(0);expect(all.remaining.oilMl).toBe(0);expect(all.remaining.starchG).toBe(0);
  expect(none.transferred.waterMl).toBe(0);expect(none.transferred.composition.oilMl).toBe(0);expect(none.remaining).toEqual(s);
 });
 it('keeps scorch damage separate and irreversible when dilution and mixing improve texture',()=>{
  const s=C.create({oilMl:15,starchG:1.6,dispersion:.1}),repaired=fold(C.add(s,{},40,40),80);
  expect(reading(repaired,80).type).toBe('coating');
  expect(reading(repaired,80,{damage:1}).type).toBe('scorched');
  expect(reading(repaired,80,{damage:1}).observation).toContain('cannot undo');
 });
 it('never mutates compositions, additions or observation options',()=>{
  const s=Object.freeze(C.create({oilMl:25,starchG:1.2,dispersion:.8})),addition=Object.freeze({oilMl:2,starchG:.2}),o=Object.freeze({waterMl:80,temperature:92,seconds:30,effort:1,servings:2,damage:0});
  const before=JSON.stringify([s,addition,o]);
  for(const result of [C.create(s),C.add(s,addition,80,20),C.mix(s,o),C.advance(s,o),C.transfer(s,80,20).remaining])expect(result).not.toBe(s);
  C.assess(s,o);expect(JSON.stringify([s,addition,o])).toBe(before);
 });
 it('rejects invalid numeric inputs before they can contaminate a saved simulation',()=>{
  for(const bad of [NaN,Infinity,-Infinity,-1,'15',null]){
   expect(()=>C.create({oilMl:bad})).toThrow();expect(()=>C.create({starchG:bad})).toThrow();
   expect(()=>C.assess(C.create(),{waterMl:bad})).toThrow();expect(()=>C.transfer(C.create(),10,bad)).toThrow();
  }
  expect(()=>C.create({dispersion:1.1})).toThrow();expect(()=>C.assess(C.create(),{waterMl:10,servings:0})).toThrow();
  expect(()=>C.mix(C.create(),{waterMl:80,temperature:NaN})).toThrow();
  expect(()=>C.advance(C.create(),{waterMl:80,temperature:92,seconds:-1})).toThrow();
  expect(()=>C.add(C.create({oilMl:Number.MAX_VALUE}),{oilMl:Number.MAX_VALUE},80,20)).toThrow();
 });
 it('returns finite readings at empty or extremely concentrated boundaries',()=>{
  const s=C.create({oilMl:0,starchG:1,dispersion:0}),r=reading(s,0);
  for(const value of Object.values(r))if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);
  expect(r.type).toBe('dry');expect(C.advance(s,{waterMl:0,temperature:Number.MAX_VALUE,seconds:0})).toEqual(s);
  const advanced=C.advance(s,{waterMl:0,temperature:Number.MAX_VALUE,seconds:1});expect(advanced.dispersion).toBe(0);
 });
 it('supplies concrete observations for every physical state without a single universal temperature rule',()=>{
  const cases=[['dry',{oilMl:15,starchG:1,dispersion:1},8,{}],['watery',{oilMl:15,starchG:1,dispersion:1},240,{}],['thick',{oilMl:15,starchG:2,dispersion:1},40,{}],['separated',{oilMl:25,starchG:1.2,dispersion:.1},80,{}],['coating',{oilMl:25,starchG:1.2,dispersion:.95},80,{}],['scorched',{oilMl:25,starchG:1.2,dispersion:.95},80,{damage:1}]];
  for(const [type,s,water,extra] of cases){const r=reading(s,water,extra);expect(r.type).toBe(type);for(const key of ['label','observation','flowText','coatingText','separationText'])expect(r[key].length).toBeGreaterThan(8);}
 });
});
