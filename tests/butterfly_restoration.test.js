import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function visit(s){Object.assign(s,{x:-42,z:38});expect(BF.land(s).ok).toBe(true);return BF.observe(s);}
describe('Butterfly restoration investigation',()=>{
 it('keeps the three reference patches unchanged while updating only the fourth plot',()=>{
   const s=BF.freshState(),before=JSON.stringify(BF.habitats(s).slice(0,3));BF.applyPlan(s,'mixed','both');
   expect(BF.habitats(s)).toHaveLength(4);expect(JSON.stringify(BF.habitats(s).slice(0,3))).toBe(before);
   expect(BF.habitats(s)[3]).toMatchObject({id:'restoration',nectar:true,host:true,x:-42,z:38});
 });
 it('requires a valid prediction and never awards evidence merely for changing a plan',()=>{
   const s=BF.freshState(),before=JSON.stringify(s);
   for(const [plan,guess] of [['mixed',''],['constructor','both'],['flowers','__proto__'],[null,null]])expect(BF.applyPlan(s,plan,guess).ok).toBe(false);
   expect(JSON.stringify(s)).toBe(before);BF.applyPlan(s,'flowers','both');expect(s.restoration.trials).toEqual([]);expect(s.observations).toEqual([]);expect(BF.observe(s).ok).toBe(false);
 });
 it.each([['lawn','neither',false,false],['flowers','nectar',true,false],['mixed','both',true,true]])('%s produces the resources in the established planting, only after a visit', (plan,guess,nectar,host)=>{
   const s=BF.freshState();BF.applyPlan(s,plan,guess);s.energy=20;const result=visit(s);
   expect(result.message).toContain('Prediction matched.');expect(BF.habitats(s)[3]).toMatchObject({nectar,host});expect(s.energy).toBe(nectar?100:20);
   expect(s.restoration.trials).toEqual([{design:plan,prediction:guess}]);expect(s.restoration.prediction).toBeNull();expect(s.observations).toEqual([]);
 });
 it('explains a mismatched prediction and keeps completed trials when a new plan is applied',()=>{
   const s=BF.freshState({observations:['milkweed']});BF.applyPlan(s,'flowers','both');expect(visit(s).message).toContain('Different from your prediction.');
   BF.applyPlan(s,'mixed','both');expect(s.restoration.trials).toEqual([{design:'flowers',prediction:'both'}]);expect(s.observations).toEqual(['milkweed']);
   visit(s);BF.applyPlan(s,'flowers','nectar');visit(s);expect(s.restoration.trials).toEqual([{design:'mixed',prediction:'both'},{design:'flowers',prediction:'nectar'}]);
   BF.observe(s);expect(s.restoration.trials).toHaveLength(2);
 });
 it('pauses a redesign without consuming time, energy, or moving the player horizontally',()=>{
   const s=BF.freshState();Object.assign(s,{paused:false,clock:13,energy:61,target:'bergamot',x:-10,z:27});BF.applyPlan(s,'mixed','both');
   expect(s).toMatchObject({paused:true,target:null,clock:13,energy:61,x:-10,z:27});
   visit(s);BF.applyPlan(s,'lawn','neither');expect(s.landed).toBeNull();expect(s.y).toBe(6);expect(s.x).toBe(-42);expect(s.z).toBe(38);
 });
 it('guides the learner to the redesigned plot and uses its current landing behavior',()=>{
   const s=BF.freshState();BF.applyPlan(s,'flowers','nectar');Object.assign(s,{paused:false,target:'restoration'});
   for(let i=0;i<1000&&!s.paused;i++)BF.step(s,.05,{});
   expect(s.paused).toBe(true);expect(BF.nearest(s).plant.id).toBe('restoration');expect(BF.land(s).ok).toBe(true);expect(s.y).toBe(3.5);
 });
 it('round-trips pending predictions and historical results without aliasing saves',()=>{
   const s=BF.freshState({version:1,observations:['milkweed']});expect(s.restoration).toEqual({design:'lawn',prediction:null,trials:[]});
   BF.applyPlan(s,'lawn','nectar');visit(s);BF.applyPlan(s,'mixed','both');const saved=BF.save(s),restored=BF.freshState(saved);
   expect(saved.version).toBe(3);expect(restored.restoration).toEqual(s.restoration);expect(restored.paused).toBe(true);expect(restored.landed).toBeNull();
   saved.restoration.trials[0].prediction='both';expect(s.restoration.trials[0].prediction).toBe('nectar');expect(restored.restoration.trials[0].prediction).toBe('nectar');
 });
 it('rejects unknown saved designs, predictions and record fields, and bounds history',()=>{
   const s=BF.freshState({restoration:{design:'constructor',prediction:'toString',trials:[null,{design:'mixed',prediction:'both',host:false,note:'unsafe'},{design:'mixed',prediction:'nectar'},...Array(20).fill({design:'flowers',prediction:'nectar'})]}});
   expect(s.restoration).toEqual({design:'lawn',prediction:null,trials:[{design:'flowers',prediction:'nectar'}]});
   expect(BF.freshState({restoration:{trials:'invalid'}}).restoration.trials).toEqual([]);
 });
});


describe('Butterfly rendering-independent flight timing',()=>{
 it('advances the same flight time across smooth and slow frames',()=>{
   const smooth=Object.assign(BF.freshState(),{paused:false}),slow=Object.assign(BF.freshState(),{paused:false});
   for(let i=0;i<120;i++)BF.advanceFrame(smooth,1/60,{forward:true});
   for(let i=0;i<20;i++)BF.advanceFrame(slow,.1,{forward:true});
   expect(smooth.clock).toBeCloseTo(2,8);expect(slow.clock).toBeCloseTo(2,8);expect(smooth.energy).toBeCloseTo(slow.energy,8);expect(Math.abs(smooth.z-slow.z)).toBeLessThan(.02);
 });
 it('caps long interruptions and stops substeps when the guided flight arrives',()=>{
   const s=Object.assign(BF.freshState(),{paused:false});BF.advanceFrame(s,99,{forward:true});expect(s.clock).toBeCloseTo(.25,8);
   Object.assign(s,{target:'restoration',x:-42,z:38});const before=s.clock;BF.advanceFrame(s,.25,{});expect(s.paused).toBe(true);expect(s.clock-before).toBeCloseTo(.05,8);
   const stopped=JSON.stringify(s);BF.advanceFrame(s,.25,{left:true});expect(JSON.stringify(s)).toBe(stopped);
 });
});
