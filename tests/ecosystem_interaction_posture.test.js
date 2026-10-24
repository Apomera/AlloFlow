import {beforeEach,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const toolSource=process.env.ECOLOGY_POSTURE_CANDIDATE||'stem_lab/stem_tool_ecosystem.js';
beforeEach(()=>{resetStemLab();loadTool(toolSource,'ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const current=(extra={})=>({active:true,state:'Grazing',huntStage:'',...extra});
const listening=(extra={})=>current({state:'Listening',listenCue:{id:'rabbits',index:0,distance:2,movement:.3,onsetMovement:.3,age:0},attention:{kind:'prey',id:'rabbits',index:0,turn:.48},...extra});
const pose=(extra={})=>({active:true,state:'Grazing',x:0,z:0,yaw:0,altitude:.025,distance:.1,phase:0,stride:0,moving:0,forage:.75,rest:0,crouch:0,pounce:0,headTurn:0,...extra});
const withoutPosture=frames=>frames.map(frame=>Object.fromEntries(Object.entries(frame).map(([id,animals])=>[id,animals.map(p=>{const {headRaise,listenTilt,earFollowPitch,earFollowYaw,...rest}=p;return rest;})])));

describe('recorded interaction skull posture',()=>{
  it('raises a rabbit promptly for existing vigilance and lowers gradually when feeding resumes',()=>{
    const before={active:true,headRaise:0},alarm=api.interactionPosture('rabbits',before,current({state:'Retreating'}));
    expect(alarm).toEqual({headRaise:.75,listenTilt:0});const full=api.interactionPosture('rabbits',{...before,...alarm},current({state:'Alert'}));expect(full.headRaise).toBe(1);
    let previous={active:true,...full},raised=[];for(let step=0;step<9;step++){const next=api.interactionPosture('rabbits',previous,current());raised.push(next.headRaise);previous={active:true,...next};}
    expect(raised[0]).toBeCloseTo(.88,12);expect(raised.at(-1)).toBe(0);for(let i=1;i<raised.length;i++){expect(raised[i]).toBeLessThanOrEqual(raised[i-1]);expect(raised[i-1]-raised[i]).toBeLessThanOrEqual(.1200000001);}
    expect(api.interactionPosture('rabbits',before,current({state:'Checking after retreat',recoveryCue:{stage:'still'}})).headRaise).toBe(.75);
    expect(api.interactionPosture('rabbits',before,current({state:'Checking after retreat'})).headRaise).toBe(0);
  });
  it('clears absence and invalid species without creating a cue or mutating inputs',()=>{
    const previous={active:true,headRaise:1,listenTilt:.14},alarm=current({state:'Alert'}),original=JSON.stringify({previous,alarm});
    expect(api.interactionPosture('rabbits',previous,alarm).headRaise).toBe(1);expect(JSON.stringify({previous,alarm})).toBe(original);
    for(const id of ['voles','owls','plants',''])expect(api.interactionPosture(id,previous,alarm)).toEqual({headRaise:0,listenTilt:0});
    for(const c of [null,{},current({active:false}),current({active:1})])expect(api.interactionPosture('foxes',previous,c)).toEqual({headRaise:0,listenTilt:0});
    expect(api.interactionPosture('rabbits',{active:true,headRaise:Infinity},alarm).headRaise).toBe(.75);
  });
  it('cocks a listening fox only toward the same validated recorded prey attention, then relaxes',()=>{
    let previous={active:true,listenTilt:0};const values=[];
    for(let step=0;step<4;step++){const a=api.interactionPosture('foxes',previous,listening());values.push(a.listenTilt);previous={active:true,...a};}
    expect(values).toEqual([-.04,-.08,-.12,-.14]);expect(api.interactionPosture('foxes',{active:true},listening({attention:{kind:'prey',id:'rabbits',index:0,turn:-.48}})).listenTilt).toBe(.04);
    const relax=api.interactionPosture('foxes',previous,current({state:'Stalking'}));expect(relax.listenTilt).toBeCloseTo(-.115,12);expect(relax.headRaise).toBe(0);
    for(const mutation of [c=>{c.attention.index=1;},c=>{c.attention.id='voles';},c=>{c.attention.kind='threat';},c=>{c.attention.turn=NaN;},c=>{c.listenCue.age=8;},c=>{c.listenCue.distance=4.6;},c=>{c.listenCue.onsetMovement=.11;},c=>{c.listenCue.id='plants';c.attention.id='plants';},c=>{c.listenCue.index=16;c.attention.index=16;},c=>{c.listenCue=null;}]){const c=listening();mutation(c);expect(api.interactionPosture('foxes',{active:true,listenTilt:0},c).listenTilt).toBe(0);}
    for(const huntStage of ['prepare','airborne','recover'])expect(api.interactionPosture('foxes',previous,listening({huntStage}))).toEqual({headRaise:0,listenTilt:0});
  });
  it('changes the skull while preserving paws, posture, locomotion, breathing and chewing',()=>{
    const p=pose({state:'Retreating',forage:.6,stride:.5,moving:.4}),base=api.mammalArticulation('rabbits',p,false),raised=api.mammalArticulation('rabbits',{...p,headRaise:.75},false);
    expect(raised.headPitch).toBeGreaterThan(base.headPitch);expect(raised.headDrop).toBeCloseTo(base.headDrop*.25,12);expect(raised.headReach).toBeCloseTo(base.headReach*.25,12);
    for(const key of ['phase','spineFlex','bodyStretch','shoulderLift','haunchLift','tailYaw','tailPitch','tailCurl','foreContact','hindContact','supportFeet','foreLift','hindLift','flightLift','ribScaleY','ribScaleZ','ribRoll','eyeOpen','jawOpen','jawSide'])expect(raised[key]).toBe(base[key]);
    for(const side of [-1,1])for(const hind of [true,false]){expect(api.footPose('rabbits',{...p,headRaise:.75},hind,side)).toEqual(api.footPose('rabbits',p,hind,side));}
    const f=pose({state:'Listening',forage:0,headTurn:.48}),neutral=api.mammalArticulation('foxes',f,false),tilt=api.mammalArticulation('foxes',{...f,listenTilt:-.14},false);expect(tilt.headRoll-neutral.headRoll).toBeCloseTo(-.14,12);expect(tilt.headYaw).toBe(neutral.headYaw);expect(tilt.headPitch).toBe(neutral.headPitch);
    // Positive local yaw points toward -Z; negative local-X roll tilts the
    // crown toward -Z. No artificial turn or new target is added.
    expect(Math.sin(tilt.headRoll)).toBeLessThan(0);
  });
  it('interpolates only recorded posture and freezes/reset exactly for reduced motion and absence',()=>{
    const a=pose({headRaise:1,listenTilt:-.14}),b=pose({distance:.2,headRaise:.88,listenTilt:-.115}),mid=api.blendPose(a,b,.5,'rabbits');expect(mid.headRaise).toBeCloseTo(.94,12);expect(mid.listenTilt).toBeCloseTo(-.1275,12);
    for(const id of ['rabbits','foxes'])for(const reduced of [true,false]){const p={...a,active:reduced?true:false};const r=api.mammalArticulation(id,p,reduced);expect(r.headRaise).toBe(0);expect(r.listenTilt).toBe(0);expect(r.headRoll).toBe(0);expect(r.headDrop).toBe(0);}
    const first=api.mammalArticulation('rabbits',a,false);api.mammalArticulation('foxes',b,false);expect(api.mammalArticulation('rabbits',a,false)).toEqual(first);
  });
});

describe('actual recorded vigilance, listening and interaction catalogs',()=>{
  const configurations=[{event:'none'},{enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10,event:'none'},{enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:80,event:'none'}];
  it('raises the real grazing-to-alarm rabbits and gradually resumes the recorded feeding pose',()=>{
    let transitions=0,resumptions=0;
    for(const config of configurations){const frames=api.behaviorTimeline(config,api.compare(config).baseline);for(let step=1;step<frames.length;step++)for(let i=0;i<16;i++){
      const p=frames[step].rabbits[i],old=frames[step-1].rabbits[i];if(!p.active)continue;
      if(old.state==='Grazing'&&['Alert','Retreating'].includes(p.state)&&p.forage>.2){transitions++;const art=api.mammalArticulation('rabbits',p,false),unraised=api.mammalArticulation('rabbits',{...p,headRaise:0},false);expect(p.headRaise).toBeGreaterThanOrEqual(.75);expect(art.headDrop).toBeLessThanOrEqual(unraised.headDrop*.25+1e-12);expect(art.headPitch).toBeGreaterThan(unraised.headPitch);}
      if(p.state==='Grazing'&&old.headRaise>.12&&p.headRaise>0){resumptions++;expect(p.headRaise).toBeCloseTo(old.headRaise-.12,12);}
    }}expect(transitions).toBeGreaterThan(5);expect(resumptions).toBeGreaterThan(0);
  });
  it('uses actual fox listening provenance and keeps bounded skull relaxation',()=>{
    const config=configurations[1],frames=api.behaviorTimeline(config,api.compare(config).baseline);let posed=0,relaxing=0;
    for(let step=1;step<frames.length;step++)for(let i=0;i<16;i++){const p=frames[step].foxes[i],old=frames[step-1].foxes[i];if(!p.active)continue;if(p.state==='Listening'&&p.listenCue&&Math.abs(p.listenTilt)>.01){posed++;expect(p.attention).toMatchObject({kind:'prey',id:p.listenCue.id,index:p.listenCue.index});expect(p.listenCue.onsetMovement).toBeGreaterThanOrEqual(.12);expect(Math.abs(p.listenTilt-old.listenTilt)).toBeLessThanOrEqual(.040000001);expect(Math.abs(p.listenTilt)).toBeLessThanOrEqual(.140000001);}
      if(!p.huntStage&&p.state!=='Listening'&&Math.abs(p.listenTilt)>0&&Math.abs(old.listenTilt)>0){relaxing++;expect(Math.abs(p.listenTilt)).toBeLessThan(Math.abs(old.listenTilt));}
    }expect(posed).toBeGreaterThan(20);expect(relaxing).toBeGreaterThan(0);
  });
  it('keeps all original routes, actions, feet, cues, catalogs and sampled populations when this posture rule is disabled',()=>{
    const originalApi=api,source=readFileSync(toolSource,'utf8'),anchor='var interactionPosture=ecoMeadowInteractionPosture(sp.id,old,{active:active,state:action.state,huntStage:hunt.stage,listenCue:listening.cue,attention:attention,recoveryCue:recovering.cue});';expect(source.split(anchor)).toHaveLength(2);
    resetStemLab();new Function(source.replace(anchor,'var interactionPosture={headRaise:0,listenTilt:0};'))();const control=window.StemLab.ecosystemFoodWeb;
    for(const config of configurations){const rows=originalApi.compare(config).baseline,before=JSON.stringify(rows),f=originalApi.behaviorTimeline(config,rows),c=control.behaviorTimeline(config,rows);expect(withoutPosture(f)).toEqual(withoutPosture(c));expect(originalApi.encounters(f,config)).toEqual(control.encounters(c,config));expect(JSON.stringify(rows)).toBe(before);expect(originalApi.behaviorTimeline(config,rows)).toEqual(f);}
  }, 30000 /* exhaustive geometry/replay assertions; not a wall-clock performance test */);
});
