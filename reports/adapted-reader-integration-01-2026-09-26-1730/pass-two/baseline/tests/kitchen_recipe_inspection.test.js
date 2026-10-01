import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),G=require('../stem_lab/kitchen_studio/recipe_lab_inspection.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
function sample(progress){const s=R.start();s.pot.pasta=true;s.pot.progress=progress;return R.act(s,'sample',undefined,'sample-press');}
function sauce(moisture,servings=2){const s=R.startRescue('dry',0);s.servings=servings;s.pan.moisture=moisture;return R.act(s,'taste',undefined,'sauce-trail');}
describe('Food inspection observations',()=>{
 it('reveals progressively smaller pasta cores and increasing deformation only after sampling',()=>{
  expect(R.inspections(R.start())).toEqual([]);const readings=[.2,.7,1,1.3,1.6].map(p=>R.inspections(sample(p))[0]);
  expect(readings.map(c=>c.label)).toEqual(['Hard center','Still firm','Tender with a slight bite','Soft','Overcooked']);
  for(let i=1;i<readings.length;i++){expect(readings[i].compression).toBeGreaterThan(readings[i-1].compression);expect(readings[i].coreFraction).toBeLessThanOrEqual(readings[i-1].coreFraction);}
 });
 it('records no observations for rejected or finished checks',()=>{
  for(const action of ['sample','taste'])expect(R.inspections(R.act(R.start(),action))).toEqual([]);
  const ended={...sample(1),plated:true};expect(R.act(ended,'sample')).toBe(ended);
 });
 it('distinguishes dry, coating and watery trails at scaled portion thresholds',()=>{
  expect(R.inspections(sauce(19))[0].type).toBe('dry');expect(R.inspections(sauce(20))[0].type).toBe('coating');expect(R.inspections(sauce(180))[0].type).toBe('coating');expect(R.inspections(sauce(181))[0].type).toBe('watery');
  expect(R.inspections(sauce(300,4))[0].type).toBe('coating');expect(R.inspections(sauce(361,4))[0].type).toBe('watery');expect(R.inspections(sauce(19))[0].closureSeconds).toBe(0);
  expect(R.inspections(sauce(100))[0].closureSeconds).toBeGreaterThan(R.inspections(sauce(200))[0].closureSeconds);
 });
 it('shows unmixed liquid until folding and keeps scorch damage visible after adding water',()=>{
  let s=R.startRescue('dry',0);s=R.act(s,'pour',50);s=R.act(s,'taste');expect(R.inspections(s).at(-1).type).toBe('unmixed');s=R.act(s,'stirSweep','button');s=R.act(s,'taste');expect(R.inspections(s).at(-1).type).toBe('coating');s.pan.damage=1;s=R.act(s,'pour',50);s=R.act(s,'taste');expect(R.inspections(s).at(-1).type).toBe('scorched');
 });
 it('keeps observations as snapshots after the food continues cooking and isolates returned copies',()=>{
  let s=sample(.7);const first=R.inspections(s)[0];s.pot.temp=100;s.pot.water=1200;s.pot.heat=3;s=R.act(s,'advance',60);expect(R.inspections(s)[0]).toEqual(first);s=R.act(s,'sample');expect(R.inspections(s)[1].time).toBe(60);R.inspections(s)[0].label='changed';expect(R.inspections(s)[0].label).toBe('Still firm');
 });
 it('uses equivalent engine checks for gestures and keyboard without advancing cooking time',()=>{
  const s=R.startRescue('dry',0),gesture=R.act(s,'taste',undefined,'sauce-trail'),keyboard=R.act(s,'taste',undefined,'keyboard');expect(gesture.pan).toEqual(keyboard.pan);expect(R.inspections(gesture)).toEqual(R.inspections(keyboard));expect(gesture.time).toBe(s.time);expect(gesture.log.at(-1).interaction).toBe('sauce-trail');
 });
 it('rebuilds inspection evidence from actions, ignoring forged saved observations',()=>{
  let s=R.startRescue('dry',0);s=R.act(s,'pour',50);s=R.act(s,'stirSweep','gesture');s=R.act(s,'taste',undefined,'sauce-trail');s=R.act(s,'plate');s=R.submit({...s,answers:[0,null]});const raw=JSON.parse(JSON.stringify(s));raw.log.find(e=>e.inspection).inspection.label='Forged';
  const restored=R.restore(raw);expect(restored).toEqual(s);expect(R.evidence(restored).inspections[0].label).toBe('Coating the spoon');expect(R.replay(restored,restored.log.length).state.log).toEqual(s.log);
 });
 it('retains all sample and sauce observations through a completed recipe and replay',()=>{
  const s=R.submit({...cook().state,answers:[0,0]}),checks=R.inspections(s);expect(checks.some(c=>c.kind==='pasta')).toBe(true);expect(checks.some(c=>c.kind==='sauce')).toBe(true);expect(R.evidence(s).inspections).toEqual(checks);expect(R.restore(JSON.parse(JSON.stringify(s)))).toEqual(s);
  const index=s.log.findIndex(e=>e.action==='sample')+1;expect(R.inspections(R.replay(s,index).state)).toHaveLength(1);expect(R.inspections(R.start())).toEqual([]);
 });
});
describe('Deliberate inspection gestures',()=>{
 it('requires a full downward fork press or a full spoon trail',()=>{
  const p=G.start('pasta',{x:180,y:55}),s=G.start('sauce',{x:60,y:125});expect(G.complete(p)).toBe(false);expect(G.complete(G.move(p,{x:180,y:144}))).toBe(false);expect(G.complete(G.move(p,{x:180,y:150}))).toBe(true);expect(G.complete(G.move(s,{x:280,y:125}))).toBe(true);expect(p.progress).toBe(0);
 });
 it('rejects wrong starts, lateral scrubbing, reversals and invalid coordinates',()=>{
  expect(G.start('pasta',{x:180,y:150})).toBeNull();expect(G.start('sauce',{x:300,y:125})).toBeNull();expect(G.start('other',{x:60,y:125})).toBeNull();expect(G.start('pasta',{x:NaN,y:55})).toBeNull();
  const p=G.start('pasta',{x:180,y:55});expect(G.complete(G.move(p,{x:250,y:155}))).toBe(false);expect(G.complete(G.move(G.move(p,{x:180,y:150}),{x:180,y:70}))).toBe(false);expect(G.move(p,{x:Infinity,y:150}).invalid).toBe(true);
 });
 it('loads inspection code before the app and keeps desktop assets identical',()=>{
  const html=readFileSync('stem_lab/kitchen_studio/recipe_lab.html','utf8');expect(html.indexOf('src="recipe_lab_inspection.js"')).toBeLessThan(html.indexOf('src="recipe_lab.js"'));expect(html).toContain('href="recipe_lab_inspection.css"');
  for(const file of ['recipe_lab.html','recipe_lab.js','recipe_lab_engine.js','recipe_lab_inspection.js','recipe_lab_inspection.css'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
 });
});
