import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
function attempt(id='dry',success=true,mode='demonstrate',explanation=true){let s=R.startRescue(id,2,mode);if(success&&id==='dry'){s=R.act(s,'pour',50);s=R.act(s,'stirSweep','button');}if(success&&id==='watery')for(let i=0;i<12;i++)s=R.act(s,'advance',15);s=R.act(s,'panHeat',0);s=R.act(R.act(s,'taste'),'plate');return R.submit({...s,answers:[explanation?(id==='dry'?0:1):2,null]});}
describe('Rescue attempt comparison',()=>{
 it('includes only recorded rescue attempts and keeps their history order',()=>{const a=attempt(),b=attempt('watery');expect(M.recorded([null,R.start(),R.startRescue('dry',0),a,b],'dry').map(e=>e.index)).toEqual([3]);expect(M.recorded([a,b]).map(e=>e.label)).toEqual(['Cook 1','Cook 2']);});
 it('rejects a duplicate selection, unfinished work, and incompatible starting scenarios',()=>{const a=attempt();expect(M.compare(a,a)).toBe(null);expect(M.compare(a,R.startRescue('dry',0))).toBe(null);expect(M.compare(a,attempt('watery'))).toBe(null);expect(M.compare(a,{...attempt(),servings:4})).toBe(null);});
 it('identifies improved outcomes alongside concrete changes in water and texture',()=>{const a=attempt('dry',false),b=attempt(),c=M.compare(a,b);expect(c.startingMoisture).toBe(8);expect(c.a.moisture).toBe(8);expect(c.b.moisture).toBe(58);expect(c.a.waterUsed).toBe(0);expect(c.b.waterUsed).toBe(50);expect(c.changes[0].change).toBe('improved');expect(c.nextPractice).toContain('successful adjustment');});
 it('shows regressions and unchanged findings without declaring every retry an improvement',()=>{const good=attempt(),bad=attempt('dry',false);expect(M.compare(good,bad).changes[0].change).toBe('needs-practice');expect(M.compare(good,attempt()).changes.every(c=>c.change==='unchanged')).toBe(true);expect(M.compare(good,bad).nextPractice).toContain('small measured splash');});
 it('separates explanations, predictions, support, and timing from outcome criteria',()=>{const a=attempt('watery',true,'practice',false),b=attempt('watery');a.hints=1;const c=M.compare(a,b);expect(c.a.prediction).toBe(c.b.prediction);expect(c.a.mode).toBe('practice');expect(c.a.hints).toBe(1);expect(c.changes.slice(0,3).every(x=>x.change==='unchanged')).toBe(true);expect(c.changes[3].change).toBe('improved');expect(c.b.seconds).toBe(180);expect(c.scope).toContain('Predictions are ungraded');});
 it('offers an explanation next step when physical outcomes were met',()=>{const c=M.compare(attempt(),attempt('dry',true,'demonstrate',false));expect(c.nextPractice).toContain('starting problem');});
 it('reconstructs independent historical frames from the supplied dish through completion',()=>{const s=attempt(),before=JSON.stringify(s),f=M.frame(s,1);expect(M.frame(s,0).moisture).toBe(8);expect(f.moisture).toBe(58);expect(f.reserve).toBe(150);expect(M.frame(s,s.log.length).observation).toContain('glossy');expect(M.frame(s,-1)).toBe(null);expect(M.frame(s,s.log.length+1)).toBe(null);expect(JSON.stringify(s)).toBe(before);});
 it('exports detached action and outcome snapshots without changing the source attempts',()=>{const a=attempt('dry',false),b=attempt(),before=JSON.stringify([a,b]),c=M.compare(a,b);c.a.actions[0].observation='changed';c.b.criteria[0].met=false;expect(JSON.stringify([a,b])).toBe(before);});
});

it('retains each attempt plan as ungraded context in comparison exports',()=>{
 const a={...attempt('dry',false),plan:'Mix only.'},b={...attempt(),plan:'Add a measured splash and fold.'};
 const c=M.compare(a,b);expect(c.a.plan).toBe(a.plan);expect(c.b.plan).toBe(b.plan);
 expect(c.changes).toEqual(M.compare({...a,plan:''},{...b,plan:''}).changes);
 expect(c.scope).toContain('Plans and reflections need human review');
});
