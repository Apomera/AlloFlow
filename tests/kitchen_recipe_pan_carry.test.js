import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),P=require('../stem_lab/kitchen_studio/recipe_lab_pan_carry.js');
const cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const point=(at,u=100,v=100)=>({x:at.x,z:at.z,u,v});
const started=s=>P.start(s,point(P.handle(s)),false);
function lifted(s){return P.move(started(s),point(P.handle(s),100,60));}
function targetPoint(s,t,u=200,v=100){const at=R.panPosition(s,t.destination);return {x:at.x+t.offset.x,z:at.z+t.offset.z,u,v};}
function arrived(s){const t=lifted(s);return P.move(t,targetPoint(s,t));}
function completed(s){const t=arrived(s);return P.move(t,targetPoint(s,t,200,140));}
function hot(size='standard'){
 let s=R.start('mushroom',4);for(const action of ['wash','rinse','cut','dry','oil','produce'])s=R.act(s,action);
 s={...s,pan:{...s.pan,size,temp:185,heat:3,moisture:0}};return s;
}
describe('Deliberate handle-based pan movement',()=>{
 it('finds the actual scaled handle at both current engine sites',()=>{
  for(const size of ['standard','wide'])for(const site of ['burner','trivet']){
   const s={...hot(size),pan:{...hot(size).pan,placement:site}},at=R.panPosition(s),h=P.handle(s);
   expect(h).toEqual({x:at.x+.98*(size==='wide'?1.08:1),y:1.39,z:at.z});expect(P.height).toBe(1.55);
   expect(started(s)).toMatchObject({source:s,sourceSite:site,destination:site==='burner'?'trivet':'burner',phase:'lift',position:{x:at.x,z:at.z}});
  }
 });
 it('allows hot loaded cookware, rescues, and moving a pan during serving',()=>{
  const s=hot();expect(P.available(s,false).ready).toBe(true);expect(P.available(R.startRescue('dry',0),false).ready).toBe(true);
  const served={...s,pan:{...s.pan,combined:true,tasted:true},log:s.log.concat({action:'servePortion',value:0,accepted:true,time:0})};
  expect(R.serving(served).started).toBe(true);expect(P.available(served,false).ready).toBe(true);expect(P.drop(served,completed(served),false)).toBe('trivet');
 });
 it('locks replay, finished, submitted, and exhausted kitchens without hiding the move behind heat state',()=>{
  const s=hot();expect(P.available(s,true).ready).toBe(false);expect(P.start(s,point(P.handle(s)),true)).toBeNull();
  for(const blocked of [{...s,plated:true},{...s,submitted:true},{...s,time:3600},{...s,log:Array(1200).fill({})}]){
   expect(P.available(blocked,false).ready).toBe(false);expect(started(blocked)).toBeNull();expect(P.drop(blocked,completed(s),false)).toBeNull();
  }
 });
 it('picks the handle outside camera mode and never starts from food or the pan body',()=>{
  const s=hot(),at=R.panPosition(s);expect(P.pickup(s,{panHandle:true},'stir',false)).toMatchObject({name:'Sauce pan handle',item:'pan-handle',mode:'pan',ready:true});
  expect(P.pickup(s,{panHandle:true},'camera',false)).toBeNull();expect(P.pickup(s,{piece:2},'pan',false)).toBeNull();expect(P.pickup(s,{pan:true},'pan',false)).toBeNull();
  expect(P.start(s,point(at),false)).toBeNull();const h=P.handle(s);expect(P.start(s,point({...h,x:h.x+.25}),false)).toBeNull();
 });
 it('rejects malformed states, points, and traces without manufacturing a move',()=>{
  const s=hot();for(const bad of [null,{}, {...s,pan:null},{...s,pan:{...s.pan,temp:NaN}},{...s,pan:{...s.pan,size:'giant'}}]){expect(P.available(bad,false).ready).toBe(false);expect(P.handle(bad)).toBeNull();}
  for(const p of [null,{},point({x:NaN,z:0}),{...point(P.handle(s)),v:Infinity}])expect(P.start(s,p,false)).toBeNull();
  for(const t of [null,{}, {...started(s),phase:'unknown'}, {...started(s),lift:NaN}]){expect(P.move(t,point(P.handle(s)))).toBeNull();expect(P.drop(s,t,false)).toBeNull();expect(P.preview(t)).toBeNull();expect(P.guidance(s,t)).toBeNull();}
  const t=P.move(started(s),null);expect(t.invalid).toBe(true);expect(P.drop(s,t,false)).toBeNull();expect(P.guidance(null,t).invalid).toBe(true);
 });
 it('requires a real upward lift before any carry can become a placement',()=>{
  const s=hot(),first=started(s);expect(P.drop(s,first,false)).toBeNull();expect(P.preview(first).y).toBe(0);
  const partial=P.move(first,point(P.handle(s),100,80));expect(partial.phase).toBe('lift');expect(P.preview(partial).y).toBeCloseTo(.35*20/32);expect(P.drop(s,partial,false)).toBeNull();
  const drag=P.move(first,targetPoint(s,first,200,100));expect(drag.invalid).toBe(true);expect(P.drop(s,drag,false)).toBeNull();
  const up=P.move(first,point(P.handle(s),100,68));expect(up.phase).toBe('carry');expect(P.preview(up).y).toBe(.35);
 });
 it('rejects sideways lifting or early lift reversal',()=>{
  const s=hot(),side=P.move(started(s),point(P.handle(s),129,60)),reverse=P.move(P.move(started(s),point(P.handle(s),100,80)),point(P.handle(s),100,95));
  expect(side.invalid).toBe(true);expect(reverse.invalid).toBe(true);expect(P.drop(s,P.move(side,targetPoint(s,side)),false)).toBeNull();
 });
 it('preserves the grab offset and previews a level full pan between its supports',()=>{
  const s=hot(),h=P.handle(s),grab={...h,x:h.x+.1,z:h.z+.07},first=P.start(s,point(grab),false),up=P.move(first,point(grab,100,60));
  const p={x:grab.x+.45,z:grab.z+.25,u:150,v:75},carrying=P.move(up,p),origin=R.panPosition(s);
  expect(carrying.phase).toBe('carry');const held=P.preview(carrying);expect(held.x).toBeCloseTo(origin.x+.45,12);expect(held.y).toBe(.35);expect(held.z).toBeCloseTo(origin.z+.25,12);
  const lowered=P.move(carrying,targetPoint(s,carrying));expect(lowered.phase).toBe('lower');expect(lowered.position).toEqual({x:2.18,z:.6});
 });
 it('waits for the pointer to reach a support and settle before counting lowering',()=>{
  const s=hot(),up=lifted(s),at=targetPoint(s,up),entry=P.move(up,{...at,x:at.x-.2,u:180,v:95});expect(entry.phase).toBe('lower');
  const approach=P.move(entry,{...at,x:at.x-.05,u:198,v:107});expect(approach.depth).toBe(0);expect(approach.anchor).toEqual({u:198,v:107});
  const centered=P.move(approach,{...at,u:200,v:110});expect(centered.depth).toBe(0);expect(centered.anchor).toEqual({u:200,v:110});
  const done=P.move(centered,{...at,u:200,v:142});expect(P.drop(s,done,false)).toBe('trivet');
 });
 it('keeps carrying after leaving a tentative target and permits a fresh approach',()=>{
  const s=hot(),first=arrived(s),outside=P.move(first,{...targetPoint(s,first),x:4,u:240,v:100});expect(outside.phase).toBe('carry');expect(outside.invalid).toBe(false);
  const returned=P.move(outside,targetPoint(s,outside));expect(returned.phase).toBe('lower');expect(P.drop(s,P.move(returned,targetPoint(s,returned,200,140)),false)).toBe('trivet');
 });
 it('does not treat returning to the original support as an opposite placement',()=>{
  const s=hot(),up=lifted(s),origin=R.panPosition(s);let t=P.move(up,{x:origin.x+up.offset.x,z:origin.z+up.offset.z,u:200,v:100});
  expect(t.phase).toBe('carry');t=P.move(t,{x:origin.x+up.offset.x,z:origin.z+up.offset.z,u:200,v:140});expect(P.drop(s,t,false)).toBeNull();
 });
 it('requires a complete straight lowering and rejects excessive travel or early reversal',()=>{
  const s=hot(),t=arrived(s);expect(P.drop(s,t,false)).toBeNull();expect(P.drop(s,P.move(t,targetPoint(s,t,200,120)),false)).toBeNull();
  const side=P.move(t,targetPoint(s,t,229,140)),far=P.move(t,targetPoint(s,t,200,181)),mid=P.move(t,targetPoint(s,t,200,120)),reverse=P.move(mid,targetPoint(s,t,200,104));
  for(const invalid of [side,far,reverse]){expect(invalid.invalid).toBe(true);expect(P.drop(s,invalid,false)).toBeNull();expect(P.preview(invalid).y).toBe(0);}
 });
 it('accepts a coarse straight lowering even when its fixed-plane projection moves beyond the support',()=>{
  const s=hot(),t=arrived(s),p=targetPoint(s,t,200,140),done=P.move(t,{...p,z:p.z+.6});expect(P.drop(s,done,false)).toBe('trivet');expect(P.preview(done)).toEqual({x:2.18,y:0,z:.6});
 });
 it('rechecks latest release motion after lowering, allowing a small settle but no lift or sideways escape',()=>{
  const s=hot(),done=completed(s);expect(P.drop(s,done,false)).toBe('trivet');expect(P.drop(s,P.move(done,targetPoint(s,done,200,128)),false)).toBe('trivet');
  for(const p of [targetPoint(s,done,200,127),targetPoint(s,done,229,140),targetPoint(s,done,200,181)])expect(P.drop(s,P.move(done,p),false)).toBeNull();
 });
 it('never mutates cooking state or previous traces during successful previews',()=>{
  const s=hot(),before=JSON.stringify(s),t=started(s),saved=JSON.stringify(t),next=P.move(t,point(P.handle(s),100,60));
  expect(JSON.stringify(t)).toBe(saved);expect(next).not.toBe(t);expect(P.preview(completed(s))).toEqual({x:2.18,y:0,z:.6});
  expect(P.guidance(s,{trace:completed(s)})).toMatchObject({phase:'release',target:{site:'trivet'},over:true,progress:1});expect(JSON.stringify(s)).toBe(before);
 });
 it('guides each physical phase toward the actual opposite support and never reports incomplete work as a release',()=>{
  const s=hot(),steps=[started(s),lifted(s),arrived(s),completed(s)],phases=['lift','carry','lower','release'];
  steps.forEach((t,i)=>{const d=P.guidance(s,{trace:t});expect(d.phase).toBe(phases[i]);expect(d.target).toEqual({site:'trivet'});expect(d.over).toBe(i>=2);expect(d.progress).toBeLessThanOrEqual(1);if(i<3)expect(P.drop(s,t,false)).toBeNull();});
  const parked=R.act(s,'panPlace','trivet');expect(P.guidance(parked,{trace:completed(parked)})).toMatchObject({title:'Return the pan to heat',target:{site:'burner'},phase:'release'});
 });
 it('rejects any accepted external cook update or fresh/replayed object even when the site matches',()=>{
  const s=hot(),t=completed(s);for(const changed of [R.act(s,'panHeat',0),R.act(s,'advance',5),R.act(s,'stirPan'),{...s},R.start('tomato',4),R.restore(JSON.parse(JSON.stringify(s)))])expect(P.drop(changed,t,false)).toBeNull();
  expect(P.drop(s,t,true)).toBeNull();expect(P.guidance({...s},{trace:t})).toMatchObject({phase:'retry',progress:0});
 });
 it('catches changed source time, log identity, size, or placement even if the original object was altered',()=>{
  for(const mutate of [s=>s.time++,s=>s.log=s.log.slice(),s=>s.log.push({accepted:true}),s=>s.pan.size='wide',s=>s.pan.placement='trivet']){const s=hot(),t=completed(s);mutate(s);expect(P.drop(s,t,false)).toBeNull();expect(P.guidance(s,t).invalid).toBe(true);}
 });
 it.each(['standard','wide'])('records one reversible placement for %s cookware without an instant thermal or food change',size=>{
  const s=hot(size),before=JSON.stringify(s),at=P.drop(s,completed(s),false),next=R.act(s,'panPlace',at,'scene-drag');
  expect(next.pan.placement).toBe('trivet');expect(next.pan.temp).toBe(s.pan.temp);expect(next.pan.heat).toBe(3);expect(next.pan.pieces).toEqual(s.pan.pieces);expect(next.time).toBe(s.time);expect(next.pot).toEqual(s.pot);expect(next.prep).toEqual(s.prep);expect(JSON.stringify(s)).toBe(before);
  const back=R.act(next,'panPlace',P.drop(next,completed(next),false),'pan-placement');expect(R.panPosition(back).site).toBe('burner');expect(back.pan.temp).toBe(s.pan.temp);expect(back.pan.pieces).toEqual(s.pan.pieces);
 });
 it('retains residual cooking only on later clock steps and does not confuse an empty burner with a cool pan',()=>{
  const s=hot(),parked=R.act(s,'panPlace',P.drop(s,completed(s),false)),cooled=R.act(parked,'advance',30),stayed=R.act(s,'advance',30);
  expect(cooled.pan.temp).toBeLessThan(stayed.pan.temp);expect(cooled.pan.temp).toBeLessThan(s.pan.temp);expect(cooled.pan.brown).toBeGreaterThan(s.pan.brown);expect(cooled.pan.heat).toBe(3);
  expect(P.guidance(s,{trace:completed(s)}).detail).toContain('empty burner will still be on');expect(P.guidance(parked,{trace:completed(parked)}).detail).toContain('stored heat remains');
 });
 it('supports older cook structure without adding any state flag and shows actual placement in replay',()=>{
  const raw=JSON.parse(readFileSync('tests/fixtures/kitchen_recipe_legacy_sizes.json','utf8')),s=R.restore(raw),before=JSON.stringify(s);expect(s.pan).not.toHaveProperty('placement');
  expect(P.drop(s,completed(s),false)).toBe('trivet');expect(JSON.stringify(s)).toBe(before);let next=R.act(s,'panPlace','trivet');const moveIndex=next.log.length;
  for(const action of ['garlicPrep','garlic'])next=R.act(next,action);next=R.act(next,'measure',160);next=R.act(R.act(next,'fill'),'potHeat',3);
  for(let i=0;i<120&&next.pot.temp<96&&next.time<3600;i++)next=R.act(next,'advance',30);
  next=R.act(R.act(next,'pasta'),'stirPot');for(let i=0;i<120&&next.pot.progress<.94&&next.time<3600;i++)next=R.act(next,'advance',30);
  for(const action of ['sample','reserve','drain'])next=R.act(next,action);next=R.act(R.act(next,'potHeat',0),'panHeat',0);for(const action of ['combine','taste','plate'])next=R.act(next,action);
  next=R.submit({...next,answers:[0,0]});expect(next.plated).toBe(true);expect(next.submitted).toBe(true);const frame=R.replay(next,moveIndex);
  expect(frame.state.pan.placement).toBe('trivet');expect(frame.changes.some(c=>c.includes('Pan moved to trivet'))).toBe(true);
 });
 it.each(['scene-pan-carry','pan-carry-keyboard','pan-carry-svg','scene-drag','pan-placement'])('preserves %s interaction evidence through saving and replay without changing cooking physics',method=>{
  let s=R.start('mushroom',2,'demonstrate');for(const [action,value] of cook().steps){if(action==='plate')break;s=R.act(s,action,value);}
  const next=R.act(s,'panPlace',P.drop(s,completed(s),false),method),entry=next.log.at(-1);
  expect(entry).toMatchObject({action:'panPlace',value:'trivet',accepted:true,interaction:method});expect(next.time).toBe(s.time);expect(next.pan.temp).toBe(s.pan.temp);expect(next.pan.pieces).toEqual(s.pan.pieces);expect(next.pan.heat).toBe(s.pan.heat);
  const finished=R.submit({...R.act(next,'plate'),answers:[0,0]});expect(finished.plated).toBe(true);expect(finished.submitted).toBe(true);
  const restored=R.restore(JSON.parse(JSON.stringify(finished)));expect(restored).toEqual(finished);const frame=R.replay(restored,next.log.length);expect(frame.action.interaction).toBe(method);expect(frame.state.pan.placement).toBe('trivet');expect(frame.state.pan.temp).toBe(s.pan.temp);expect(frame.state.time).toBe(s.time);
 });
 it('delivers exactly the same pure module to the desktop runtime',()=>{
  expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/recipe_lab_pan_carry.js','utf8')).toBe(readFileSync('stem_lab/kitchen_studio/recipe_lab_pan_carry.js','utf8'));
 });
});
