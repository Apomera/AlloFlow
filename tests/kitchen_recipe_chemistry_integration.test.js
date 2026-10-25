import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const legacy=require('./helpers/reference_fixture.cjs')('kitchen-sauce-chemistry-2026-10-17/legacy-fixtures.json.gz');
function totalStarch(s){return s.pot.starchG+s.pot.reserveStarchG+s.pot.discardedStarchG+s.pot.surfaceStarchG+s.pan.chemistry.starchG;}
function finish(s,answer){for(const [a,v] of [['panHeat',0],['taste'],['plate']])s=R.act(s,a,v);return R.submit({...s,answers:[answer,null]});}

describe('Composition-based sauce integration',()=>{
 it('conserves starch through ladling, evaporation, pouring, combining, and draining',()=>{
  let s=R.start('mushroom',2,'demonstrate');
  for(const [a,v] of cook().steps){if(a==='reserve')break;s=R.act(s,a,v);}
  expect(s.pot.releasedStarchG).toBeGreaterThan(0);
  const initial=totalStarch(s),water=s.pot.water,starch=s.pot.starchG;
  s=R.act(s,'ladle');expect(s.pot.reserveStarchG).toBeCloseTo(starch*50/water,12);expect(totalStarch(s)).toBeCloseTo(initial,12);
  s=R.act(s,'drainPour',250);expect(totalStarch(s)).toBeCloseTo(initial,12);expect(s.pot.discardedStarchG).toBeGreaterThan(0);
  s=R.act(s,'drain');expect(s.pot.starchG).toBeCloseTo(0,12);expect(totalStarch(s)).toBeCloseTo(initial,12);
  s=R.act(s,'pour',50);expect(s.pot.reserveStarchG).toBeCloseTo(0,12);expect(totalStarch(s)).toBeCloseTo(initial,12);
  s=R.act(s,'combine');expect(s.pot.surfaceStarchG).toBe(0);expect(totalStarch(s)).toBeCloseTo(initial,12);
  const oil=s.pan.chemistry.oilMl,beforeWater=s.pan.moisture;s=R.act(s,'advance',30);
  expect(s.pan.moisture).toBeLessThan(beforeWater);expect(totalStarch(s)).toBeCloseTo(initial,12);expect(s.pan.chemistry.oilMl).toBe(oil);
 });
 it('makes saved-water concentration depend on when it was collected',()=>{
  let s=R.start();for(const[a,v]of [['measure',160],['fill'],['potHeat',3]])s=R.act(s,a,v);
  while(s.pot.temp<96)s=R.act(s,'advance',30);s=R.act(s,'pasta');
  const early=R.act(s,'ladle');s=R.act(s,'stirPot');for(let i=0;i<7;i++)s=R.act(s,'advance',60);
  const later=R.act(s,'ladle');expect(later.pot.reserveStarchG/later.pot.reserve).toBeGreaterThan(early.pot.reserveStarchG/early.pot.reserve);
 });
 it('distinguishes separated oil from missing water and requires cooling before an effective fold',()=>{
  const s=R.startRescue('separated',2,'demonstrate'),before=JSON.stringify(s);
  expect(R.sauceChemistry(s).type).toBe('separated');expect(s.pan.moisture).toBe(80);
  let hot=s;for(let i=0;i<10;i++)hot=R.act(hot,'stirSweep','button');
  expect(R.criteria(hot)[0].met).toBe(false);expect(hot.pan.moisture).toBeLessThan(s.pan.moisture);expect(hot.time).toBe(60);
  let cooled=R.act(R.act(s,'panHeat',0),'advance',60);expect(R.criteria(cooled)[0].met).toBe(false);
  cooled=R.act(cooled,'stirSweep','button');const done=finish(cooled,2);
  expect(R.criteria(done).every(c=>c.met)).toBe(true);expect(R.evidence(done).status).toBe('Rescue demonstrated independently');
  expect(R.restore(done)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);expect(JSON.stringify(s)).toBe(before);
  expect(R.restore({...done,sauceModel:undefined})).toBeNull();expect(R.replay({...done,sauceModel:undefined},0)).toBeNull();
 });
 it('preserves starch while water keeps evaporating during a completed mix',()=>{
  const s=R.startRescue('watery',1),mixed=R.act(s,'stirSweep','button');
  expect(mixed.pan.moisture).toBeLessThan(s.pan.moisture);expect(mixed.pan.moisture).toBe(R.act(s,'advance',6).pan.moisture);expect(R.criteria(mixed)[0].met).toBe(false);
  let reduced=s;for(let i=0;i<12;i++)reduced=R.act(reduced,'advance',15);
  expect(reduced.pan.chemistry.starchG).toBe(s.pan.chemistry.starchG);expect(R.sauceChemistry(reduced).starchPercent).toBeGreaterThan(R.sauceChemistry(s).starchPercent);expect(R.criteria(reduced)[0].met).toBe(true);
 });
 it('records immutable chemistry observations and reconstructs evidence instead of trusting saved physics',()=>{
  let s=R.startRescue('dry',0);s=R.act(s,'taste');const first=R.inspections(s)[0];
  const copy=R.inspections(s);copy[0].chemistry.starchPercent=999;
  s=R.act(R.act(s,'pour',50),'stirSweep','button');s=finish(s,0);
  expect(R.inspections(s)[0]).toEqual(first);
  const raw=JSON.parse(JSON.stringify(s));raw.pan.chemistry.starchG=999;raw.pot.reserveStarchG=999;raw.log[0].inspection.chemistry.starchPercent=999;
  expect(R.restore(raw)).toEqual(s);expect(R.restore({...raw,sauceModel:999})).toBeNull();
 });
 for(const id of ['mushroom','tomato'])for(const servings of [2,4])it('completes '+id+' for '+servings+' and restores new chemistry exactly',()=>{
  const s=cook(id,servings).state;expect(R.criteria(s).every(c=>c.met)).toBe(true);expect(R.sauceChemistry(s).coating).toBe(true);expect(R.restore(s)).toEqual(s);
 });
 for(const fixture of legacy)it('retains historical '+fixture.label+' outcomes, observations and replay',()=>{
  const restored=R.restore(fixture.state);expect(restored).toEqual(fixture.state);expect(R.evidence(restored)).toEqual(fixture.evidence);expect(R.sauceChemistry(restored)).toBeNull();expect(R.replay(restored,restored.log.length).state.pan).toEqual(fixture.state.pan);
 });
});
