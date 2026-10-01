import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
function solve(id,prediction=2,mode='demonstrate'){let s=R.startRescue(id,prediction,mode);if(id==='dry'){s=R.act(s,'pour',50);s=R.act(s,'stirSweep','button');}else for(let i=0;i<12;i++)s=R.act(s,'advance',15);for(const a of [['panHeat',0],['taste'],['plate']])s=R.act(s,...a);return R.submit({...s,answers:[id==='dry'?0:1,null]});}
describe('Recipe rescue challenges',()=>{
 it('requires a known problem and a recorded prediction',()=>{expect(R.startRescue('unknown',0)).toBe(null);for(const p of [-1,3,undefined,'0',NaN])expect(R.startRescue('dry',p)).toBe(null);});
 it('provides a clearly scoped starting dish without inventing learner actions',()=>{for(const id of ['dry','watery']){const s=R.startRescue(id,0);expect(s.log).toEqual([]);expect(s.prep.cutMethod).toBe('provided');expect(s.time).toBe(0);expect(s.pan.combined).toBe(true);expect(R.evidence(s).scope).toContain('supplied');expect(R.criteria(s)).toHaveLength(3);expect(R.criteria(s)[0].met).toBe(false);}});
 for(const id of ['dry','watery'])it('solves '+id+' and preserves the ungraded prediction, evidence, and canonical replay',()=>{const s=solve(id);expect(s.plated).toBe(true);expect(s.submitted).toBe(true);expect(R.evidence(s).status).toBe('Rescue demonstrated independently');expect(s.rescue.prediction).toBe(2);expect(R.evidence(s).rescue.prediction).toContain('Mix');expect(R.criteria(s).every(c=>c.met)).toBe(true);expect(R.restore(s)).toEqual(s);expect(R.replay(s,0).state.pan.moisture).toBe(id==='dry'?8:240);expect(R.replay(s,s.log.length).state.pan).toEqual(s.pan);expect(R.review(s).findings).toHaveLength(3);});
 it('cannot complete the challenge by only checking and plating the unchanged dish',()=>{let s=R.startRescue('dry',0);s=R.act(R.act(s,'taste'),'plate');s=R.submit({...s,answers:[0,null]});expect(R.evidence(s).status).toBe('Review and retry');expect(R.criteria(s)[0].met).toBe(false);});
 it('requires saved water to be mixed and a supported explanation',()=>{expect(R.act(R.act(R.startRescue('dry',0),'taste'),'stirPan').pan.tasted).toBe(false);let s=R.act(R.startRescue('dry',0),'pour',50);s=R.act(R.act(s,'taste'),'plate');expect(R.criteria(s)[0].met).toBe(false);const solved=solve('dry');expect(R.evidence({...solved,answers:[2,null]}).status).toBe('Review and retry');});
 it('leaves prediction errors ungraded and identifies coaching and requested support',()=>{expect(R.evidence(solve('dry',1,'practice')).status).toBe('Rescue completed with coaching');const s=solve('watery');expect(R.evidence({...s,hints:1}).status).toBe('Rescue completed with support');});
 it('rebuilds supplied conditions instead of trusting modified raw physics or baseline metadata',()=>{const s=solve('dry');expect(R.restore({...s,pan:{...s.pan,moisture:999},servings:4,id:'tomato'})).toEqual(s);expect(R.restore({...s,rescue:{id:'invalid',prediction:0}})).toBe(null);expect(R.restore({...s,rescue:{id:'dry',prediction:-1}})).toBe(null);});
 it('requires a selected explanation but leaves written reflection optional',()=>{const s=solve('dry');expect(R.submit({...s,submitted:false,answers:[null,null]}).submitted).toBe(false);expect(s.reflection).toBe('');expect(s.submitted).toBe(true);});
 it('keeps excess heat/time and scorching reviewable rather than treating any action as rescue',()=>{let s=R.startRescue('watery',1);for(let i=0;i<12;i++)s=R.act(s,'advance',60);s=R.act(s,'panHeat',0);s=R.act(R.act(s,'taste'),'plate');s=R.submit({...s,answers:[1,null]});expect(R.evidence(s).status).toBe('Review and retry');expect(R.criteria(s)[1].met).toBe(false);});
});

it('preserves an optional rescue plan across restore and export without grading its words',()=>{
 const s=solve('dry'), plan='I will add 50 mL, fold, then inspect the coating.';
 const planned=R.restore({...s,plan});
 expect(planned.plan).toBe(plan);expect(R.evidence(planned).plan).toBe(plan);
 expect(R.evidence(planned).status).toBe(R.evidence(s).status);expect(planned.hints).toBe(0);
 expect(R.criteria(planned)).toEqual(R.criteria(s));expect(planned.log).toEqual(s.log);
 expect(R.restore({...s,plan:'x'.repeat(900)}).plan).toHaveLength(600);
 expect(R.restore({...s,plan:{unsafe:true}}).plan).toBe('');
 const {plan:omitted,...legacy}=s;expect(R.restore(legacy).plan).toBe('');
});
