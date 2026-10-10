import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),P=require('../stem_lab/kitchen_studio/recipe_lab_pot_drain.js'),W=require('../stem_lab/kitchen_studio/recipe_lab_water.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const point=(at,u=100,v=100)=>({x:at.x,z:at.z,u,v});
function ready(water=800){let s=R.start('mushroom',2);s={...s,pot:{...s.pot,pasta:true,water,reserve:100,temp:96,heat:3,progress:.95}};return R.act(s,'sample');}
function grip(s,side=1){return P.handles(s).find(h=>h.side===side);}
const started=(s,side=1)=>P.start(s,point(grip(s,side)),side,false);
const lifted=(s,side=1)=>P.move(started(s,side),point(grip(s,side),100,60));
const targetPoint=(t,u=200,v=100)=>({x:P.target.x+t.offset.x,z:P.target.z+t.offset.z,u,v});
function arrived(s,side=1){const t=lifted(s,side);return P.move(t,targetPoint(t));}
function pouring(s,side=1,travel=60){const t=arrived(s,side);return P.move(t,targetPoint(t,200,100+travel));}
function dose(s,t,amount=100,interaction='scene-drain'){const after=R.act(s,'drainPour',amount,interaction);return {after,trace:P.rebase(t,s,after)};}

describe('Deliberate handle lift, level carry, and controlled pot drainage',()=>{
  it.each([-1,1])('starts only at actual side %s handle and preserves that grip',side=>{
    const s=ready(),h=grip(s,side);expect(h).toEqual({side,x:P.source.x+side*.68,y:1.70,z:P.source.z});expect(P.height).toBe(1.9);
    const t=started(s,side);expect(t).toMatchObject({side,phase:'lift',position:P.source,lift:0,tilt:0});expect(P.flow(s,t,false)).toBe(0);
    expect(P.pickup(s,{pot:true,potHandle:side},'stir',false)).toMatchObject({item:'pot-handle',mode:'drain',ready:true});
    expect(P.start(s,point(P.source),side,false)).toBeNull();expect(P.start(s,point({...h,x:h.x+.25}),side,false)).toBeNull();
  });
  it('does not turn the pot body, water, or camera navigation into a pickup',()=>{
    const s=ready();for(const hit of [{pot:true},{water:true},{drain:true},{},null])expect(P.pickup(s,hit,'drain',false)).toBeNull();
    expect(P.pickup(s,{potHandle:1},'camera',false)).toBeNull();expect(P.start(s,point(grip(s)),0,false)).toBeNull();
  });
  it('requires pasta, a sample, an uncovered pot, and all spoonfuls returned',()=>{
    const s=ready(),serving={...s,log:s.log.concat({action:'servePortion',accepted:true,value:0,time:s.time})};expect(R.serving(serving).started).toBe(true);
    const cases=[{...s,pot:{...s.pot,pasta:false}},{...s,pot:{...s.pot,sample:null}},{...s,pot:{...s.pot,lid:'covered'}},serving,{...s,pot:{...s.pot,water:0,drained:true}}];
    for(const blocked of cases){expect(P.available(blocked,false).ready).toBe(false);expect(P.start(blocked,point(grip(blocked)),1,false)).toBeNull();}
    expect(P.available(s,false).detail).toContain('Water already drained stays removed');
  });
  it('locks historical, completed, and exhausted kitchens before pickup or flow',()=>{
    const s=ready(),t=pouring(s);expect(P.available(s,true).ready).toBe(false);expect(P.flow(s,t,true)).toBe(0);expect(P.start(s,point(grip(s)),1,true)).toBeNull();
    for(const blocked of [{...s,plated:true},{...s,submitted:true},{...s,time:3600},{...s,log:Array(1200).fill({})}]){expect(P.available(blocked,false).ready).toBe(false);expect(P.flow(blocked,t,false)).toBe(0);expect(P.guidance(blocked,t).phase).toBe('retry');}
  });
  it('rejects malformed states, points, and traces without changing the kitchen',()=>{
    const s=ready();for(const bad of [null,{}, {...s,pot:null},{...s,pot:{...s.pot,water:NaN}},{...s,pot:{...s.pot,heat:4}},{...s,pot:{...s.pot,reserve:-1}}]){expect(P.handles(bad)).toEqual([]);expect(P.available(bad,false).ready).toBe(false);}
    for(const p of [null,{},point({x:NaN,z:0}),{...point(grip(s)),v:Infinity}])expect(P.start(s,p,1,false)).toBeNull();
    for(const t of [null,{}, {...started(s),phase:'unknown'},{...started(s),side:0},{...started(s),lift:NaN}]){expect(P.move(t,point(grip(s)))).toBeNull();expect(P.flow(s,t,false)).toBe(0);expect(P.preview(t)).toBeNull();expect(P.guidance(s,t)).toBeNull();}
    const invalid=P.move(started(s),null);expect(invalid.invalid).toBe(true);expect(P.flow(s,invalid,false)).toBe(0);expect(P.preview(invalid)).toMatchObject({...P.source,lift:0,angle:0,over:false});
  });
  it('requires an upward lift and keeps partial lifting physically level',()=>{
    const s=ready(),t=started(s),partial=P.move(t,point(grip(s),100,84));expect(partial.phase).toBe('lift');expect(P.preview(partial).lift).toBe(.5);expect(P.flow(s,partial,false)).toBe(0);
    const up=P.move(t,point(grip(s),100,68));expect(up.phase).toBe('carry');expect(P.preview(up)).toEqual({...P.source,lift:1,angle:0,over:false});
    expect(P.move(t,targetPoint(t)).invalid).toBe(true);
  });
  it('invalidates sideways lifting and an early reversal, returning the preview upright',()=>{
    const s=ready(),side=P.move(started(s),point(grip(s),129,60)),reversed=P.move(P.move(started(s),point(grip(s),100,80)),point(grip(s),100,95));
    for(const t of [side,reversed]){expect(t.invalid).toBe(true);expect(P.flow(s,t,false)).toBe(0);expect(P.preview(t)).toMatchObject({...P.source,lift:0,angle:0,over:false});expect(P.guidance(s,t).phase).toBe('retry');}
  });
  it('preserves a slightly off-center grip while carrying level, without a cooking action',()=>{
    const s=ready(),h=grip(s),grab={...h,x:h.x+.1,z:h.z+.06},before=JSON.stringify(s),first=P.start(s,point(grab),1,false),snapshot=JSON.stringify(first),up=P.move(first,point(grab,100,60));
    const t=P.move(up,{x:grab.x-.4,z:grab.z+.3,u:140,v:80});expect(P.preview(t)).toMatchObject({x:P.source.x-.4,z:P.source.z+.3,lift:1,angle:0,over:false});expect(P.flow(s,t,false)).toBe(0);
    expect(JSON.stringify(first)).toBe(snapshot);expect(JSON.stringify(s)).toBe(before);
  });
  it('snaps above the actual colander and waits for a separate tilt',()=>{
    const s=ready(),t=arrived(s);expect(t.phase).toBe('pour');expect(t.settling).toBe(true);expect(P.preview(t)).toEqual({...P.target,lift:1,angle:0,over:true});expect(P.flow(s,t,false)).toBe(0);
    expect(P.flow(s,P.move(t,targetPoint(t,200,103)),false)).toBe(0);expect(P.guidance(s,t).instruction).toContain('Pull straight down');
  });
  it('lets approach motion settle without mistaking it for a tilt',()=>{
    const s=ready(),up=lifted(s),at=targetPoint(up),entry=P.move(up,{...at,x:at.x-.25,u:180,v:90}),closer=P.move(entry,{...at,x:at.x-.05,u:198,v:105}),centered=P.move(closer,{...at,u:200,v:110});
    for(const t of [entry,closer,centered]){expect(P.flow(s,t,false)).toBe(0);expect(P.preview(t).angle).toBe(0);}expect(centered.anchor).toEqual({u:200,v:110});
    expect(P.flow(s,P.move(centered,{...at,u:200,v:170}),false)).toBe(45);
  });
  it('returns to level carry when leaving a tentative colander target, then permits another approach',()=>{
    const s=ready(),t=arrived(s),away=P.move(t,{...targetPoint(t),x:0,u:250,v:100});expect(away.phase).toBe('carry');expect(away.invalid).toBe(false);expect(P.flow(s,away,false)).toBe(0);
    const back=P.move(away,targetPoint(away));expect(back.phase).toBe('pour');expect(P.flow(s,P.move(back,targetPoint(back,200,160)),false)).toBe(45);
  });
  it('only flows after sufficient deliberate tilt, with a bounded angle',()=>{
    const s=ready();expect(P.flow(s,pouring(s,1,20),false)).toBe(0);expect(P.flow(s,pouring(s,1,40),false)).toBe(30);expect(P.flow(s,pouring(s,1,200),false)).toBe(70);
    const t=pouring(s),coarse=P.move(arrived(s),{...targetPoint(t,200,160),z:4});expect(P.flow(s,coarse,false)).toBe(45);expect(P.preview(coarse)).toMatchObject({...P.target,over:true});
  });
  it('stops flow immediately when raised to level and permits tilting again',()=>{
    const s=ready(),t=pouring(s),level=P.move(t,targetPoint(t,200,100));expect(P.flow(s,t,false)).toBe(45);expect(P.flow(s,level,false)).toBe(0);expect(P.preview(level).angle).toBe(0);
    expect(P.flow(s,P.move(level,targetPoint(level,200,160)),false)).toBe(45);
  });
  it('stops sideways tilting without discarding the held pot or its existing drainage',()=>{
    const s=ready(),t=pouring(s),side=P.move(t,targetPoint(t,261,160));expect(side.invalid).toBe(false);expect(side.offAxis).toBe(true);expect(P.flow(s,side,false)).toBe(0);expect(P.preview(side).angle).toBe(0);expect(P.guidance(s,side).instruction).toContain('Flow stopped');
    expect(P.flow(s,P.move(side,targetPoint(side,200,160)),false)).toBe(45);
  });
  it('rejects external canonical, replayed, cloned, or freshly restored states',()=>{
    const s=ready(),t=pouring(s);for(const changed of [R.act(s,'potHeat',0),R.act(s,'advance',5),R.act(s,'stirPot'),{...s},R.restore(JSON.parse(JSON.stringify(s)))]){expect(P.flow(changed,t,false)).toBe(0);expect(P.guidance(changed,t).phase).toBe('retry');}
  });
  it('detects changed source cooking observations even if the same source object was altered',()=>{
    const mutations=[s=>s.time++,s=>s.log=s.log.slice(),s=>s.log.push({}),s=>s.pot={...s.pot},s=>s.pot.water--,s=>s.pot.sample=null,s=>s.pot.heat=0,s=>s.pot.lid='covered',s=>s.pot.temp--,s=>s.pot.reserve++];
    for(const mutate of mutations){const s=ready(),t=pouring(s);mutate(s);expect(P.flow(s,t,false)).toBe(0);expect(P.guidance(s,t).phase).toBe('retry');}
  });
  it('rebases only its canonical drainage and preserves the held pose and all other cooking state',()=>{
    const s=ready(),t=pouring(s),before=JSON.stringify(s),{after,trace}=dose(s,t);expect(trace).not.toBeNull();expect(trace.sourceState).toBe(after);expect(P.preview(trace)).toEqual(P.preview(t));expect(P.flow(after,trace,false)).toBe(45);expect(P.flow(after,t,false)).toBe(0);
    expect(after.pot).toEqual({...s.pot,water:700});expect(after.time).toBe(s.time);expect(after.pan).toEqual(s.pan);expect(after.prep).toEqual(s.prep);expect(after.log.at(-1)).toMatchObject({action:'drainPour',accepted:true,interaction:'scene-drain',transfer:{to:'drain',amount:100}});expect(JSON.stringify(s)).toBe(before);
  });
  it('never adopts a direct drainage action during lifting, carrying, or level positioning',()=>{
    const s=ready(),after=R.act(s,'drainPour',100,'scene-drain');for(const t of [started(s),lifted(s),arrived(s),P.move(pouring(s),targetPoint(pouring(s),200,100)),P.move(pouring(s),targetPoint(pouring(s),261,160))])expect(P.rebase(t,s,after)).toBeNull();
  });
  it('rejects unrelated or forged drainage updates rather than adopting external changes',()=>{
    const s=ready(),t=pouring(s),after=R.act(s,'drainPour',100,'scene-drain');
    const cases=[s,R.act(s,'potHeat',0),R.act(after,'advance',5),{...after,time:after.time+1},{...after,pot:{...after.pot,heat:0}},{...after,pot:{...after.pot,reserve:101}},{...after,log:after.log.slice(0,-1).concat({...after.log.at(-1),accepted:false})},{...after,log:after.log.slice(0,-1).concat({...after.log.at(-1),transfer:{to:'drain',amount:99}})}];
    for(const changed of cases)expect(P.rebase(t,s,changed)).toBeNull();expect(P.rebase(t,{...s},after)).toBeNull();
  });
  it.each(['scene-drain','drain-tilt','keyboard'])('uses canonical %s doses with identical water conservation and no instant cooling',interaction=>{
    const s=ready(),t=pouring(s),{after,trace}=dose(s,t,100,interaction);expect(trace).not.toBeNull();expect(s.pot.water-after.pot.water).toBe(after.log.at(-1).transfer.amount);expect(after.pot.reserve).toBe(100);expect(after.pot.temp).toBe(96);expect(after.pot.heat).toBe(3);expect(after.pot.progress).toBe(.95);expect(after.pot.sample).toEqual(s.pot.sample);expect(after.time).toBe(s.time);expect(after).not.toHaveProperty('potPlacement');
  });
  it('emptying a fractional remnant stays held and upright-capable without an extra action',()=>{
    const s=ready(7.6),t=pouring(s),{after,trace}=dose(s,t,25);expect(after.pot.water).toBe(0);expect(after.pot.drained).toBe(true);expect(after.log.at(-1).transfer.amount).toBeCloseTo(7.6);expect(trace).not.toBeNull();expect(trace.phase).toBe('pour');expect(P.flow(after,trace,false)).toBe(0);
    expect(P.guidance(after,trace)).toMatchObject({phase:'empty',progress:1,over:true,invalid:false});const level=P.move(trace,targetPoint(trace,200,100));expect(P.preview(level).angle).toBe(0);expect(P.guidance(after,level).phase).toBe('empty');expect(after.pot.reserve).toBe(100);
  });
  it('keeps accepted water removal after cancellation and requires another lift for the next attempt',()=>{
    const s=ready(),{after,trace}=dose(s,pouring(s));expect(after.pot.water).toBe(700);expect(P.flow(after,trace,false)).toBe(45);
    const next=started(after);expect(next.phase).toBe('lift');expect(P.flow(after,next,false)).toBe(0);expect(after.pot.water).toBe(700);expect(after.pot.reserve).toBe(100);expect(after.log.filter(e=>e.action==='drainPour')).toHaveLength(1);
  });
  it('feeds continuous bounded doses through canonical actions and empties exactly without advancing the clock',()=>{
    let s=ready(800),t=pouring(s),remainder=0,total=0;const initial=JSON.stringify(s),time=s.time;
    for(let i=0;i<200&&!s.pot.drained;i++){const d=W.drainStep(remainder,P.flow(s,t,false),100,s.pot.water);remainder=d.remainder;if(!d.amount)continue;expect(d.amount).toBeGreaterThanOrEqual(25);expect(d.amount).toBeLessThanOrEqual(250);expect(d.amount%25).toBe(0);const before=s;s=R.act(s,'drainPour',d.amount,'scene-drain');total+=before.pot.water-s.pot.water;t=P.rebase(t,before,s);expect(t).not.toBeNull();}
    expect(s.pot.water).toBe(0);expect(s.pot.drained).toBe(true);expect(total).toBe(800);expect(s.time).toBe(time);expect(s.pot.reserve).toBe(100);expect(s.pot.temp).toBe(96);expect(s.pot.heat).toBe(3);expect(s.pot.progress).toBe(.95);expect(s.pot.sample).toEqual(JSON.parse(initial).pot.sample);expect(P.guidance(s,t).phase).toBe('empty');
  });
  it('gives phase-specific targets and truthful thermal and saved-water guidance',()=>{
    const s=ready();expect(P.guidance(s,{trace:started(s)})).toMatchObject({tool:'drain',phase:'lift',target:{potHandle:1},over:false});expect(P.guidance(s,{trace:lifted(s)})).toMatchObject({tool:'drain',phase:'carry',target:{drain:true},over:false});expect(P.guidance(s,{trace:pouring(s)})).toMatchObject({tool:'drain',phase:'pour',target:{drain:true},over:true});
    const text=P.guidance(s,pouring(s)).detail;for(const phrase of ['800 mL in the pot','100 mL saved in the jug','96°C modeled water','stored heat remains','pot burner is still on','Clock paused','cannot be recovered'])expect(text).toContain(phrase);
    expect(P.guidance(null,pouring(s)).phase).toBe('retry');
  });
  it('saves and replays partial drainage in a complete cook without storing transient carry state',()=>{
    let s=R.start('mushroom',2,'demonstrate'),index=0,held;
    for(const[a,v]of cook().steps){if(a==='drain'){const before=s;held=pouring(s);s=R.act(s,'drainPour',100,'scene-drain');held=P.rebase(held,before,s);expect(held).not.toBeNull();index=s.log.length;expect(R.restore(JSON.parse(JSON.stringify(s)))).toEqual(s);while(!s.pot.drained){const prior=s;s=R.act(s,'drainPour',250,'scene-drain');held=P.rebase(held,prior,s);expect(held).not.toBeNull();}}else s=R.act(s,a,v);}
    s=R.submit({...s,answers:[0,0]});expect(R.criteria(s).every(g=>g.met)).toBe(true);const restored=R.restore(JSON.parse(JSON.stringify(s)));expect(restored).toEqual(s);const frame=R.replay(restored,index);expect(frame.state.pot.drained).toBe(false);expect(frame.action.transfer.amount).toBe(100);expect(frame.action.interaction).toBe('scene-drain');expect(frame.state).not.toHaveProperty('potDrainPose');expect(frame.state.pot).not.toHaveProperty('placement');expect(P.available(frame.state,true).ready).toBe(false);
  });
  it('delivers the exact pure module to the desktop runtime',()=>{
    expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/recipe_lab_pot_drain.js','utf8')).toBe(readFileSync('stem_lab/kitchen_studio/recipe_lab_pot_drain.js','utf8'));
  });
});
