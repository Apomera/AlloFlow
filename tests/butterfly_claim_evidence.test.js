import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});

function examine(s,id){const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});BF.land(s);BF.observe(s);}
function brood(s,id){examine(s,id);BF.layEggs(s,id,'complete');while(BF.advanceStage(s).ok);BF.broodResult(s);}

describe('Butterfly claim-specific evidence',()=>{
 it('does not use a milkweed success as a test of nectar-only or green-only habitat',()=>{
   const s=BF.freshState();brood(s,'milkweed');
   for(const id of ['nectar-enough','needs-both','green-enough']){
     const result=BF.judgeClaim(s,id);
     expect(result.tested).toBe(false);
     expect(result.nextStep).toContain('Wild bergamot');
     expect(result.why).not.toContain('Every generation you followed on a nectar-only patch stopped');
   }
 });

 it('uses one nectar-only failure as a counterexample, while requesting the missing host comparison',()=>{
   const s=BF.freshState();brood(s,'bergamot');
   expect(BF.judgeClaim(s,'nectar-enough').tested).toBe(true);
   expect(BF.judgeClaim(s,'green-enough').tested).toBe(true);
   const needsBoth=BF.judgeClaim(s,'needs-both');
   expect(needsBoth.tested).toBe(false);
   expect(needsBoth.nextStep).toContain('Common milkweed');
   // The conclusion must not claim the learner tested lawn when they did not.
   expect(BF.judgeClaim(s,'green-enough').why).not.toContain('Mown lawn');
 });

 it('does not let a lawn failure stand in for nectar-only evidence',()=>{
   const s=BF.freshState();brood(s,'milkweed');brood(s,'lawn');
   expect(BF.judgeClaim(s,'green-enough').tested).toBe(true);
   expect(BF.judgeClaim(s,'nectar-enough').tested).toBe(false);
   expect(BF.judgeClaim(s,'needs-both').tested).toBe(false);
   brood(s,'bergamot');
   expect(BF.judgeClaim(s,'needs-both')).toMatchObject({tested:true,nextStep:''});
   expect(BF.judgeClaim(s,'needs-both').why).toContain('Common milkweed');
   expect(BF.judgeClaim(s,'needs-both').why).toContain('Wild bergamot');
 });

 it('does not invent current restoration observations from a different examined planting',()=>{
   const s=BF.freshState();BF.applyPlan(s,'flowers','nectar');examine(s,'restoration');
   expect(BF.evidenceFor(s).lines.map(l=>l.id)).toEqual(['patch:restoration:flowers']);
   BF.applyPlan(s,'mixed','both');
   expect(BF.evidenceFor(s).lines).toEqual([]);
   examine(s,'restoration');
   expect(BF.evidenceFor(s).lines.map(l=>l.id)).toEqual(['patch:restoration:mixed']);
   expect(BF.evidenceFor(s).lines[0].text).toContain('Milkweed + bergamot');
 });

 it('provides stable, unique record IDs with the planting attached to restoration evidence',()=>{
   const s=BF.freshState();brood(s,'milkweed');
   BF.runSeason(s,'milkweed','never','complete');BF.runSeason(s,'milkweed','early','stop');
   BF.applyPlan(s,'mixed','both');brood(s,'restoration');
   BF.runSeason(s,'restoration','never','complete');BF.runSeason(s,'restoration','mid','stop');
   const ids=BF.evidenceFor(s).lines.map(l=>l.id);
   expect(ids).toContain('patch:milkweed');expect(ids).toContain('brood:milkweed');
   expect(ids).toContain('season:milkweed:early');expect(ids).toContain('timing:milkweed:never:early');
   expect(ids).toContain('brood:restoration:mixed');
   expect(ids).toContain('season:restoration:mixed:never');
   expect(ids).toContain('timing:restoration:mixed:never:mid');
   expect(new Set(ids).size).toBe(ids.length);
   expect(BF.evidenceFor(BF.freshState(BF.save(s))).lines).toEqual(BF.evidenceFor(s).lines);
   BF.applyPlan(s,'flowers','nectar');
   expect(BF.evidenceFor(s).lines.some(l=>l.id.includes(':restoration:'))).toBe(false);
 });
});
