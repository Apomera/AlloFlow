import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const act=(s,steps)=>steps.reduce((v,[a,n])=>R.act(v,a,n),s);
const finish=s=>R.submit({...R.act(s,'plate'),answers:[R.rescueDefinition(s.rescue.id).correct,null]});
const earlier={
 holding:'After the last adjustment, record a coating check, advance the clock by at least 2 minutes, and check again. A further adjustment starts a new comparison.',
 starchy:'Check the heavy coating before changing it. Choose a small measured liquid addition, fold it through, and compare a fresh spoon check.',
 fragile:'Observe the separate oil first. After the last adjustment, compare two coating checks at least 2 minutes apart.',
 cooled:'Record the cool, heavy coating before adjusting it, then compare a fresh coating check. Warming or a measured change in liquid may help; inspect between short steps.'
};
function burn(id,version=2){
 let s=R.restore({...R.startRescue(id,0,'demonstrate'),sauceObservationModel:version});s=act(s,[['taste'],['panHeat',3]]);
 for(let i=0;i<20&&s.pan.damage<1;i++)s=R.act(s,'advance',60);
 return finish(act(s,[['panHeat',0],['taste']]));
}
function successful(id){
 let s=R.act(R.startRescue(id,0,'demonstrate'),'taste');
 if(id==='cooled')s=act(s,[['panHeat',1],['advance',45],['panHeat',0],['taste']]);
 else{s=act(s,[[id==='starchy'?'pourPlain':'pour',id==='fragile'?30:id==='starchy'?60:50],['stirSweep','button'],['taste']]);for(let fold=0;fold<3&&R.needsMixing(s);fold++)s=act(s,[['stirSweep','button'],['taste']]);if(id!=='starchy')s=act(s,[['advance',60],['advance',60],['taste']]);}
 return finish(s);
}
describe('Scorched rescue comparison feedback starts with a fresh attempt',()=>{
 for(const id of Object.keys(earlier)){
  it('prioritizes irreversible damage in '+id+' without changing scores or state',()=>{
   const s=burn(id),before=JSON.stringify(s),goals=R.criteria(s),review=R.review(s),advice=review.findings[3].nextPractice;
   expect(s.pan.damage).toBeGreaterThanOrEqual(1);expect(review.findings[3].met).toBe(false);
   expect(advice).toBe('Start a fresh rescue before repeating this comparison. Scorching cannot be undone; control the heat and use shorter checks in the new attempt.');
   expect(R.evidence(s).status).toBe('Review and retry');expect(R.evidence(s).criteria).toEqual(goals);expect(R.criteria(s)).toEqual(goals);expect(JSON.stringify(s)).toBe(before);
   expect(R.restore(s)).toEqual(s);expect(R.evidence(R.restore(s)).review).toEqual(review);
  });
  it('preserves model-one '+id+' feedback exactly',()=>{
   const s=burn(id,1),before=JSON.stringify(s);expect(R.review(s).findings[3].nextPractice).toBe(earlier[id]);
   expect(R.evidence(s).status).toBe('Review and retry');expect(R.restore(s)).toEqual(s);expect(R.evidence(R.restore(s)).review).toEqual(R.review(s));expect(JSON.stringify(s)).toBe(before);
  });
  it('keeps successful '+id+' comparison coaching unchanged',()=>{
   const s=successful(id),old=R.restore({...s,sauceObservationModel:1});
   expect(R.criteria(s).every(c=>c.met)).toBe(true);expect(R.evidence(s).status).toBe('Rescue demonstrated independently');
   expect(R.review(s).findings).toEqual(R.review(old).findings);expect(R.review(s).findings[3].nextPractice).not.toContain('fresh rescue');
  });
  it('keeps unburnt incomplete '+id+' comparison coaching unchanged',()=>{
   const s=finish(R.act(R.startRescue(id,0,'demonstrate'),'taste'));expect(s.pan.damage).toBe(0);
   expect(R.review(s).findings[3].nextPractice).toBe(earlier[id]);
  });
 }
 it('retains unversioned holding and starch rescue feedback',()=>{
  for(const id of ['holding','starchy']){const raw={...burn(id)};delete raw.sauceObservationModel;const s=R.restore(raw);expect(s).not.toHaveProperty('sauceObservationModel');expect(R.review(s).findings[3].nextPractice).toBe(earlier[id]);expect(R.restore(s)).toEqual(s);}
 });
 it('keeps the ordinary three-criterion rescue review unchanged',()=>{
  const modern=burn('dry'),legacy=R.restore({...modern,sauceObservationModel:1});expect(R.review(modern).findings).toHaveLength(3);expect(R.review(modern).findings).toEqual(R.review(legacy).findings);
 });
});
