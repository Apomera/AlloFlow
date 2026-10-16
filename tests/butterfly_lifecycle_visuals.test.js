import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function examined(s,id){const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});expect(BF.land(s).ok).toBe(true);expect(BF.observe(s).ok).toBe(true);return s;}
function started(id='milkweed',plan){const s=BF.freshState();if(plan)BF.applyPlan(s,plan,'both');examined(s,id);expect(BF.layEggs(s,id,'complete').ok).toBe(true);return s;}
function completed(s){while(BF.advanceStage(s).ok);expect(BF.broodResult(s).ok).toBe(true);return s;}
function finiteNumbers(value){if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);else if(value&&typeof value==='object')Object.values(value).forEach(finiteNumbers);}

describe('Butterfly generation on the plant',()=>{
 it('has no specimen before a generation starts, even after a patch is examined',()=>{
  const s=examined(BF.freshState(),'milkweed');expect(BF.lifecycleVisual(s)).toBeNull();
  expect(BF.lifecycleVisual(BF.freshState({lifecycle:{patch:'milkweed'}}))).toBeNull();
 });

 it.each([
  ['milkweed',undefined,true,0,4],['bergamot',undefined,false,0,2.3],
  ['restoration','mixed',true,-6,4],['restoration','flowers',false,0,2.3],
 ])('anchors %s / %s on an actual leaf in its current planting',(id,plan,host,offset,height)=>{
  const s=started(id,plan),p=BF.habitats(s).find(p=>p.id===id),v=BF.lifecycleVisual(s);
  expect(v).toMatchObject({patch:id,stage:'egg',host,blocked:false,recorded:false,support:'leaf'});
  if(plan)expect(v.plan).toBe(plan);
  // Leaf 3 belongs to the first modeled stem. Mixed plots use milkweed at -6,
  // rather than the adult nectar perch on bergamot at +6.
  expect(v.anchor.x).toBeCloseTo(p.x+offset+2,8);
  expect(v.anchor.y).toBeCloseTo(height*.61,8);
  expect(v.anchor.z).toBeCloseTo(p.z+.7,8);
  expect(v.anchor.yaw).toBeCloseTo(-Math.PI/2,8);expect(v.anchor.tilt).toBeCloseTo(.12,8);
  finiteNumbers(v);expect(v.title.length).toBeGreaterThan(0);expect(v.note.length).toBeGreaterThan(0);
 });

 it.each([['lawn',undefined],['restoration','lawn']])('shows the %s / %s experiment on ground without inventing a host leaf',(id,plan)=>{
  const s=started(id,plan),egg=BF.lifecycleVisual(s);expect(egg).toMatchObject({support:'ground',host:false,stage:'egg',blocked:false});
  expect(BF.advanceStage(s).ok).toBe(true);expect(BF.lifecycleVisual(s)).toMatchObject({support:'ground',host:false,stage:'caterpillar',blocked:true});
  expect(BF.advanceStage(s).ok).toBe(false);finiteNumbers(egg);
 });

 it('follows all four host stages without automatically recording a generation',()=>{
  const s=started();for(const stage of ['egg','caterpillar','chrysalis','adult']){
   const v=BF.lifecycleVisual(s);expect(v).toMatchObject({stage,host:true,blocked:false,recorded:false});finiteNumbers(v);
   expect(s.lifecycle.broods).toEqual([]);if(stage!=='adult')expect(BF.advanceStage(s).ok).toBe(true);
  }
  expect(BF.broodResult(s).ok).toBe(true);expect(BF.lifecycleVisual(s)).toMatchObject({stage:'adult',recorded:true});
  expect(BF.lifecycleVisual(BF.freshState(BF.save(s)))).toEqual(BF.lifecycleVisual(s));
 });

 it('lets the nonhost egg hatch but never presents a chrysalis or adult',()=>{
  const s=started('bergamot');expect(BF.lifecycleVisual(s).blocked).toBe(false);
  expect(BF.advanceStage(s).ok).toBe(true);expect(BF.lifecycleVisual(s)).toMatchObject({stage:'caterpillar',blocked:true,recorded:false});
  expect(BF.advanceStage(s).ok).toBe(false);BF.broodResult(s);
  expect(BF.lifecycleVisual(s)).toMatchObject({stage:'caterpillar',blocked:true,recorded:true});
 });

 it('keeps the specimen at its habitat when the player moves and leaves simulation state untouched',()=>{
  const s=started(),original=BF.lifecycleVisual(s);Object.assign(s,{x:55,z:41,y:12,landed:null,paused:false,clock:37,energy:42});
  const before=JSON.stringify(s),saved=BF.save(s);
  for(let i=0;i<10;i++){expect(BF.lifecycleVisual(s)).toEqual(original);BF.lifecyclePose(original,i/9,false);}
  expect(JSON.stringify(s)).toBe(before);expect(BF.save(s)).toEqual(saved);
 });

 it('restores active stage but does not persist animation progress or watch state',()=>{
  const s=started();BF.advanceStage(s);const before=BF.save(s);
  BF.lifecyclePose(BF.lifecycleVisual(s),.7,false);
  expect(BF.save(s)).toEqual(before);expect(BF.lifecycleVisual(BF.freshState(before))).toEqual(BF.lifecycleVisual(s));
 });

 it('prefers a rerun over its recorded endpoint and restores that endpoint when abandoned',()=>{
  const s=completed(started());expect(BF.lifecycleVisual(s)).toMatchObject({stage:'adult',recorded:true});
  BF.layEggs(s,'milkweed','stalls');expect(BF.lifecycleVisual(s)).toMatchObject({stage:'egg',recorded:false});
  BF.abandonBrood(s);expect(BF.lifecycleVisual(s)).toMatchObject({stage:'adult',recorded:true});
 });

 it('removes a replanted generation while preserving its historical result',()=>{
  const s=completed(started('restoration','mixed'));expect(BF.lifecycleVisual(s)).toMatchObject({stage:'adult',plan:'mixed'});
  BF.applyPlan(s,'flowers','nectar');expect(BF.lifecycleVisual(s)).toBeNull();
  expect(s.lifecycle.broods).toHaveLength(1);expect(s.lifecycle.broods[0].plan).toBe('mixed');
  examined(s,'restoration');BF.layEggs(s,'restoration','stalls');expect(BF.lifecycleVisual(s)).toMatchObject({stage:'egg',plan:'flowers',host:false});
  BF.applyPlan(s,'lawn','neither');expect(BF.lifecycleVisual(s)).toBeNull();
 });

 it('keeps a reference generation visible while another plot is replanted',()=>{
  const s=started(),before=BF.lifecycleVisual(s);BF.applyPlan(s,'mixed','both');expect(BF.lifecycleVisual(s)).toEqual(before);
 });

 it('returns bounded finite scene poses and manually selectable reduced-motion stages',()=>{
  const s=started();for(const stage of ['egg','caterpillar','chrysalis','adult']){
   const v=BF.lifecycleVisual(s),before=JSON.stringify(v);
   for(const progress of [-10,0,.25,.5,1,10,NaN,Infinity])finiteNumbers(BF.lifecyclePose(v,progress,false));
   expect(BF.lifecyclePose(v,-10,false)).toEqual(BF.lifecyclePose(v,0,false));
   expect(BF.lifecyclePose(v,10,false)).toEqual(BF.lifecyclePose(v,1,false));
   for(const progress of [0,.25,.5,1])expect(BF.lifecyclePose(v,progress,true)).toEqual(BF.lifecyclePose(v,progress,false));
   expect(JSON.stringify(v)).toBe(before);if(stage!=='adult')BF.advanceStage(s);
  }
 });

 it('grows a fed caterpillar and unfolds the adult, while a blocked caterpillar stays small',()=>{
  const fed=started();BF.advanceStage(fed);const host=BF.lifecycleVisual(fed);
  expect(BF.lifecyclePose(host,1,false).growth).toBeGreaterThan(BF.lifecyclePose(host,0,false).growth);
  const unfed=started('bergamot');BF.advanceStage(unfed);const blocked=BF.lifecycleVisual(unfed);
  for(const progress of [0,.25,.5,.75,1])expect(BF.lifecyclePose(blocked,progress,false)).toMatchObject({growth:.32,crawl:0});
  BF.advanceStage(fed);BF.advanceStage(fed);const adult=BF.lifecycleVisual(fed),emerging=BF.lifecyclePose(adult,0,false),expanded=BF.lifecyclePose(adult,1,false);
  expect(expanded.adultScale).toBeGreaterThan(emerging.adultScale);expect(expanded.wingAngle).toBeLessThan(emerging.wingAngle);
 });

 it('aims each closeup at the specimen without changing the generation or player',()=>{
  const s=started();for(const stage of ['egg','caterpillar','chrysalis','adult']){
   const v=BF.lifecycleVisual(s),before=JSON.stringify(s),camera=BF.lifecycleCamera(v);
   expect(camera.target).toEqual([v.point.x,v.point.y,v.point.z]);finiteNumbers(camera);
   expect(camera.position[1]).toBeGreaterThanOrEqual(.24);expect(camera.fov).toBeGreaterThan(0);expect(camera.fov).toBeLessThan(90);
   expect(JSON.stringify(s)).toBe(before);if(stage!=='adult')BF.advanceStage(s);
  }
 });
});
