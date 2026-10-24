import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),V=require('../stem_lab/kitchen_studio/recipe_lab_cooking.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const act=(s,steps)=>steps.reduce((v,[a,n])=>R.act(v,a,n),s);
const burnt=()=>act(R.restore({...R.startRescue('dry',0,'demonstrate'),mixingModel:1}),[['panHeat',3],['advance',60],['advance',60],['panHeat',0],['taste']]);
const flowing=()=>act(burnt(),[['pour',100],['stirSweep','button'],['taste']]);
describe('Independent visible sauce layers',()=>{
 it('shows changed flow and oil while retaining damage and failed rescue status',()=>{
  const dry=burnt(),wet=flowing(),a=S.cues(S.reading(dry)),b=S.cues(S.reading(wet)),before=JSON.stringify(wet);
  expect(a).toMatchObject({bodyType:'dry',patches:true,scorched:true});expect(b).toMatchObject({bodyType:'coating',patches:false,thin:false,scorched:true,oilDroplets:true});
  expect(b.track).toContain('closes gradually');expect(b.separation).toContain('oil');expect(b.residue).toContain('does not remove');
  expect(V.describe(wet).pan).toMatchObject({type:'scorched',bodyType:'coating',scorched:true,oilDroplets:true,observationModel:2});
  expect(V.describe(wet).pan.note).toContain('Dark patches remain');expect(R.criteria(wet)[0].met).toBe(false);expect(JSON.stringify(wet)).toBe(before);
 });
 it('keeps pooled additions unresolved while showing their oil and residue',()=>{
  const s=act(burnt(),[['pour',100],['taste']]),c=S.cues(S.reading(s));
  expect(c).toMatchObject({bodyType:'unmixed',scorched:true,thin:true,patches:false,seconds:.3});expect(c.coating).toContain('not yet combined');
  expect(V.describe(s).pan).toMatchObject({type:'scorched',bodyType:'unmixed',scorched:true,loose:true});
 });
 it('derives independent flow, oil and residue for every physical body state',()=>{
  for(const [bodyType,waterMl,starchG] of [['dry',5,.3],['watery',260,.2],['thick',60,4],['coating',100,1]])for(const dispersion of [.95,.05]){
   const chemistry=C.assess({oilMl:15,starchG,dispersion},{model:3,observationModel:2,waterMl,temperature:90,damage:1.5,recipe:'mushroom'});
   const reading={type:'scorched',observationModel:2,scorched:true,bodyType:chemistry.bodyType,chemistry,closureSeconds:bodyType==='dry'?0:bodyType==='watery'?.35:bodyType==='thick'?4:1.8},c=S.cues(reading);
   expect(c.bodyType).toBe(bodyType);expect(c.scorched).toBe(true);expect(c.thin).toBe(bodyType==='watery');expect(c.patches).toBe(['dry','thick'].includes(bodyType));expect(c.oilDroplets).toBe(dispersion===.05);
  }
 });
 it('retains the exact older cue shape and its damage-first visuals',()=>{
  const legacy=R.restore({...flowing(),sauceObservationModel:1}),r=S.reading(legacy),c=S.cues(r);
  expect(c).toEqual({track:'Dark residue remains in the spoon trail.',coating:'Dark patches cling to the spoon.',separation:'',seconds:0,thin:false,patches:true,oilDroplets:false});
  expect(V.describe(legacy).pan).toMatchObject({type:'scorched',bodyType:'scorched',oilDroplets:false});expect(V.describe(legacy).pan).not.toHaveProperty('scorched');
  const raw={...flowing()};delete raw.sauceObservationModel;const old=R.restore(raw);expect(S.cues(S.reading(old))).not.toHaveProperty('residue');expect(R.evidence(old)).not.toHaveProperty('sauceObservationModel');
 });
 it('keeps rendered observation cues fixed until a fresh check and never mutates the cook',()=>{
  const s=flowing(),recorded=S.cues(S.reading(s)),changed=R.act(s,'pour',50),before=JSON.stringify(changed);
  expect(S.reading(changed).stale).toBe(true);expect(S.cues(S.reading(changed))).toEqual(recorded);expect(V.describe(changed).pan.bodyType).toBe('unmixed');expect(JSON.stringify(changed)).toBe(before);
  expect(S.cues(S.reading(R.act(changed,'taste'))).bodyType).toBe('unmixed');
 });
 it('hides emptied pan layers without erasing the recorded damaged dish',()=>{
  let s=flowing();for(let p=0;p<2;p++)for(let n=0;n<4;n++)s=R.act(s,'servePortion',p);
  expect(V.describe(s).pan.visible).toBe(false);expect(V.describe(s).pan.oilDroplets).toBe(false);expect(S.cues(S.reading(s)).scorched).toBe(true);
 });
 it('exports the actual observation protocol and blocks misleading cross-version comparisons',()=>{
  const finish=s=>R.submit({...R.act(s,'plate'),answers:[0,null]}),current=finish(flowing()),legacy=R.restore({...current,sauceObservationModel:1});
  expect(M.incompatibility(legacy,current)).toContain('different observation models');expect(M.compare(legacy,current)).toBeNull();
  for(const s of [legacy,current]){const comparison=M.compare(s,R.restore(s));expect(comparison.sauceObservationModel).toBe(s.sauceObservationModel);expect(comparison.a.sauceObservationModel).toBe(s.sauceObservationModel);}
 });
});
