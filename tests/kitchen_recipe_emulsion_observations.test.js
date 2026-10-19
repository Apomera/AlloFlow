import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js');
const assess=(composition,options={})=>C.assess(composition,{model:3,observationModel:1,waterMl:120,temperature:90,recipe:'tomato',...options});

describe('Sauce body and dispersed oil are separate observations',()=>{
 for(const [bodyType,waterMl,starchG,recipe] of [['dry',8,.35,'mushroom'],['watery',300,.15,'tomato'],['thick',40,3,'mushroom'],['coating',120,.12,'tomato']])it('keeps '+bodyType+' flow when separate oil appears',()=>{
  const mixed=assess({oilMl:25,starchG,dispersion:.95},{waterMl,recipe}),separate=assess({oilMl:25,starchG,dispersion:.08},{waterMl,recipe});
  expect(mixed.bodyType).toBe(bodyType);expect(separate.bodyType).toBe(bodyType);
  expect(separate.viscosity).toBe(mixed.viscosity);expect(separate.flowText).toBe(mixed.flowText);
  expect(mixed.oilDroplets).toBe(false);expect(separate.oilDroplets).toBe(true);
  expect(separate.coatingText).toContain('oil beads');expect(separate.observation).toContain('oil beads');
  expect(separate.type).toBe(bodyType==='coating'?'separated':bodyType);expect(separate.coating).toBe(false);
 });
 it('does not call a coating-bodied separated sauce watery or evenly coated',()=>{
  const reading=assess({oilMl:25,starchG:.12,dispersion:.08});
  expect(reading.type).toBe('separated');expect(reading.bodyType).toBe('coating');
  expect(reading.flowText).toContain('gradually');expect(reading.observation).not.toContain('watery');
  expect(reading.coatingText).toContain('interrupted by oil beads');
 });
 it('retains irreversible scorch priority while body, oil and starch remain accounted for',()=>{
  const composition=Object.freeze({oilMl:25,starchG:.12,dispersion:.08}),before=JSON.stringify(composition),reading=assess(composition,{damage:1});
  expect(reading.type).toBe('scorched');expect(reading.bodyType).toBe('scorched');expect(reading.coating).toBe(false);
  expect(reading.observation).toContain('cannot undo');expect(reading.oilMl).toBe(25);expect(reading.starchG).toBe(.12);expect(JSON.stringify(composition)).toBe(before);
 });
 it('shows cooling-dependent body without pretending that cooling remixes the oil',()=>{
  const composition={oilMl:25,starchG:2.5,dispersion:.08},warm=assess(composition,{waterMl:60,recipe:'mushroom'}),cool=assess(composition,{waterMl:60,recipe:'mushroom',temperature:35});
  expect(warm.bodyType).toBe('thick');expect(cool.bodyType).toBe('thick');
  expect(cool.viscosity).toBeGreaterThan(warm.viscosity);expect(cool.dispersion).toBe(warm.dispersion);expect(cool.oilDroplets).toBe(true);
 });
 it('preserves the exact legacy field set and separated description without the observation version',()=>{
  for(const model of [1,2,3]){
   const composition={oilMl:25,starchG:1.2,dispersion:.08},options={model,waterMl:80,temperature:90,recipe:'mushroom'};
   const old=C.assess(composition,options),modern=C.assess(composition,{...options,observationModel:1});
   expect(old).not.toHaveProperty('bodyType');expect(old.flowText).toBe('Watery sauce and oil move separately in the trail.');
   for(const key of ['type','coating','waterMl','oilMl','starchG','starchPercent','oilFraction','freeOilMl','oilDroplets','dispersion','viscosity'])expect(modern[key]).toBe(old[key]);
  }
 });
 it('changes observations without changing ingredient amounts or time-dependent settling',()=>{
  const start=Object.freeze({oilMl:25,starchG:.12,dispersion:.08}),mixed=C.mix(start,{waterMl:120,temperature:90,effort:1});
  const whole=C.advance(mixed,{waterMl:120,temperature:90,seconds:120});let split=mixed;
  for(let i=0;i<120;i++)split=C.advance(split,{waterMl:120,temperature:90,seconds:1});
  expect(split.dispersion).toBeCloseTo(whole.dispersion,12);expect(whole.oilMl).toBe(start.oilMl);expect(whole.starchG).toBe(start.starchG);
  expect(assess(mixed).type).toBe('coating');expect(assess(whole).type).toBe('separated');
  expect(assess(whole).bodyType).toBe(assess(mixed).bodyType);expect(start.dispersion).toBe(.08);
 });
 it('rejects unsupported observation models instead of silently changing their meaning',()=>{
  for(const observationModel of [null,0,3,'1',NaN])expect(()=>assess({oilMl:25,starchG:.12,dispersion:.08},{observationModel})).toThrow(RangeError);
 });
});
