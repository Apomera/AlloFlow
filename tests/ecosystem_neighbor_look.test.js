import {beforeEach,describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api,recording;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={soil:{enabled:false},enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none',target:'foxes',eventStep:80};
function fixture(){
  const old={x:0,z:0,yaw:0,headTurn:0,headRaise:0,speed:0,moving:0,rest:0,forage:.8,state:'Grazing',foodAvailable:true,active:true};
  const giver={x:.9,z:.1,yaw:0,moving:.2,speed:.22,state:'Giving space',foodAvailable:true,active:true,spacingCue:{id:'rabbits',index:0,x:0,z:0,decisionDistance:.88,duration:10,age:1,side:1}};
  return {old,previous:{rabbits:[old,giver]},counts:{rabbits:2},current:{step:12,active:true,state:'Grazing',speed:0,moving:0,rest:0,foodAvailable:true,directAlarm:false}};
}
const call=f=>api.rabbitNeighborLook(0,f.old,f.previous,f.counts,f.current);
function recorded(){if(!recording){const c=api.normalize(config),pair=api.compare(c);recording={c,pair,frames:api.behaviorTimeline(c,pair.baseline)};}return recording;}
const presentation=new Set(['headTurn','attention','earLeft','earRight','earTilt','neighborLook','neighborLookCue','neighborLookCooldown','neighbor','neighborIndex','neighborDistance','eyeAim','earFollowPitch','earFollowYaw','crossingCue','crossingLook','crossingCooldown','crossing','crossingIndex','crossingDistance']);
const physical=frames=>frames.map(f=>Object.fromEntries(Object.entries(f).map(([id,poses])=>[id,poses.map(p=>Object.fromEntries(Object.entries(p).filter(([key])=>!presentation.has(key))))])));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function headRotation(point,a){
  const cx=Math.cos(a.headRoll),sx=Math.sin(a.headRoll),cy=Math.cos(a.headYaw),sy=Math.sin(a.headYaw),cz=Math.cos(a.headPitch),sz=Math.sin(a.headPitch),[x,y,z]=point;
  return [cy*cz*x-cy*sz*y+sy*z,(cx*sz+sx*sy*cz)*x+(cx*cz-sx*sy*sz)*y-sx*cy*z,(sx*sz-cx*sy*cz)*x+(sx*cz+cx*sy*sz)*y+cx*cy*z];
}

describe('reciprocal feeding-neighbor rabbit glance',()=>{
  it('records only an actual moving giving-space neighbor with a detached flattened prior-frame point',()=>{
    const f=fixture(),before=JSON.stringify(f),a=call(f);
    expect(a).toMatchObject({weight:.35,cooldown:0,cue:{id:'rabbits',index:1,receiverIndex:0,x:.9,z:.1,movement:.2,sourceStep:11,startStep:12,age:0,duration:8,givingSpaceAge:1}});
    expect(a.cue.distance).toBeCloseTo(Math.hypot(.9,.1),12);expect(JSON.stringify(f)).toBe(before);expect(call(f)).toEqual(a);
    f.previous.rabbits[1].x=999;f.previous.rabbits[1].spacingCue.x=999;expect(a.cue.x).toBe(.9);expect('spacingCue' in a.cue).toBe(false);expect('neighborLookCue' in a.cue).toBe(false);
  });

  it('lets direct/social alarm, refuge, recovery, motion, absence and rest cancel the visual glance immediately',()=>{
    const original=fixture(),started=call(original);
    for(const patch of [{active:false},{state:'Alert'},{state:'Retreating'},{state:'Resting'},{state:'Checking after retreat'},{speed:.001},{moving:.001},{rest:.2},{foodAvailable:false},{directAlarm:true},{socialCue:{id:'rabbits',index:1}},{socialMemory:true},{refugeCue:{index:0}},{recoveryCue:{stage:'still'}},{spacingCue:{index:1}},{speed:NaN},{step:0}]){
      const f=fixture();f.old={...f.old,neighborLookCue:started.cue,neighborLook:.7};f.previous.rabbits[0]=f.old;f.current={...f.current,step:13,...patch};const result=call(f);expect(result.cue).toBeNull();expect(result.weight).toBe(0);
    }
    for(const oldPatch of [{active:false},{state:'Alert'},{headRaise:.5},{speed:.01},{directAlarm:true},{socialCue:{}},{socialMemory:true},{refugeCue:{}},{recoveryCue:{}}]){const f=fixture();f.old={...f.old,...oldPatch};f.previous.rabbits[0]=f.old;expect(call(f).cue).toBeNull();}
    const f=fixture();expect(api.rabbitNeighborLook(-1,f.old,f.previous,f.counts,f.current).cue).toBeNull();expect(api.rabbitNeighborLook(0,f.old,f.previous,{rabbits:0},f.current).cue).toBeNull();
  });

  it('rejects missing, nonmoving, copied, wrong-receiver and malformed source cues without propagating a new alarm',()=>{
    for(const mutate of [
      f=>{f.old.x=1001;f.previous.rabbits[1].x=1001.9;f.previous.rabbits[1].spacingCue.x=1001;},
      f=>{f.old.x=999.8;f.previous.rabbits[1].x=1000.7;f.previous.rabbits[1].spacingCue.x=999.8;},
      f=>{f.previous.rabbits[1]=null;},f=>{f.counts.rabbits=1;},f=>{f.previous.rabbits[1].active=false;},f=>{f.previous.rabbits[1].moving=.04;},f=>{f.previous.rabbits[1].state='Grazing';},f=>{f.previous.rabbits[1].state='Alert';},f=>{f.previous.rabbits[1].foodAvailable=false;},f=>{f.previous.rabbits[1].directAlarm=true;},f=>{f.previous.rabbits[1].socialMemory=true;},f=>{f.previous.rabbits[1].refugeCue={};},f=>{f.previous.rabbits[1].spacingCue.index=1;},f=>{f.previous.rabbits[1].spacingCue.age=10;},f=>{f.previous.rabbits[1].spacingCue.duration=9;},f=>{f.previous.rabbits[1].spacingCue.side=0;},f=>{f.previous.rabbits[1].spacingCue.x=.1;},f=>{f.previous.rabbits[1].spacingCue.decisionDistance=1.3;},f=>{f.previous.rabbits[1].x=2;},f=>{f.previous.rabbits[1].moving=NaN;},f=>{f.previous.rabbits[1].moving=.3;},f=>{f.previous.rabbits[1].state='Grazing';f.previous.rabbits[1].neighborLookCue={id:'rabbits',index:0};}
    ]){const f=fixture();mutate(f);expect(call(f).cue).toBeNull();}
  });

  it('uses at most eight sequential samples, refreshes only from actual prior positions and then cools down',()=>{
    const f=fixture(),saved=[];
    for(let age=0;age<8;age++){
      f.current.step=12+age;f.previous.rabbits[1].x=.9+age*.01;f.previous.rabbits[1].spacingCue.age=1+age;
      const result=call(f);expect(result.cue).toMatchObject({age,duration:8,startStep:12,sourceStep:11+age,x:.9+age*.01});expect(result.weight).toBe(Math.min(1,(age+1)*.35));saved.push(result.cue);
      f.old={...f.old,neighborLook:result.weight,neighborLookCue:result.cue,neighborLookCooldown:result.cooldown};f.previous.rabbits[0]=f.old;
    }
    expect(saved[0].x).toBe(.9);f.current.step=20;f.previous.rabbits[1].spacingCue.age=9;const end=call(f);expect(end.cue).toBeNull();expect(end.cooldown).toBe(18);expect(end.weight).toBeCloseTo(.82,12);
    f.old={...f.old,neighborLookCue:null,neighborLook:end.weight,neighborLookCooldown:end.cooldown};f.previous.rabbits[0]=f.old;f.current.step=21;expect(call(f).cue).toBeNull();expect(call(f).cooldown).toBe(17);
    const broken=fixture();broken.old={...broken.old,neighborLookCue:{...saved[0],sourceStep:99}};expect(call(broken).cue).toBeNull();
  });

  it('uses the existing head/ear attention convention with primary danger priority and neutral reduced-motion articulation',()=>{
    const f=fixture(),cue=call(f).cue,origin={...f.old,active:true};
    const a=api.attention('rabbits','Grazing',origin,null,null,null,null,cue);expect(a).toMatchObject({kind:'neighbor',id:'rabbits',index:1,x:.9,z:.1});expect(a.turn).toBeCloseTo(Math.atan2(-.1,.9),12);
    const threat={id:'foxes',index:0,x:0,z:-1,distance:1};expect(api.attention('rabbits','Alert',origin,null,threat,null,null,cue)).toMatchObject({kind:'threat',id:'foxes',index:0});
    const plain={...origin,phase:0,distance:0,stride:0,pounce:0,headRaise:0,headTurn:0,earLeft:0,earRight:0,earTilt:0},look={...plain,neighborLook:1},before=api.mammalArticulation('rabbits',plain,false),after=api.mammalArticulation('rabbits',look,false);
    expect(after.neighborLook).toBe(1);expect(after.headPitch).toBeGreaterThan(before.headPitch);expect(after.headDrop).toBeLessThan(before.headDrop);expect(after.headRaise).toBe(0);
    for(const key of ['spineFlex','bodyStretch','shoulderLift','haunchLift','ribScaleY','ribScaleZ','jawOpen','jawSide','eyeOpen','foreContact','hindContact','supportFeet','foreLift','hindLift','flightLift','landingFore','landingHind','landingDip'])expect(after[key]).toBe(before[key]);
    expect(api.mammalArticulation('rabbits',look,true).neighborLook).toBe(0);expect(api.mammalArticulation('rabbits',{...look,active:false},false).neighborLook).toBe(0);expect(api.mammalArticulation('rabbits',{...look,state:'Retreating'},false).neighborLook).toBe(0);
    const blended=api.blendPose({...plain,neighborLook:0,neighborLookCue:null},{...plain,neighborLook:1,neighborLookCue:cue},.5,'rabbits');expect(blended.neighborLook).toBeCloseTo(.5,12);expect(blended.neighborLookCue).toBeNull();
  });

  it('replays genuine pair responses exactly while preserving all physical/model fields and existing learning episodes',()=>{
    const {c,pair,frames}=recorded(),before=JSON.stringify(pair),seen=[];
    for(let step=1;step<frames.length;step++)for(let index=0;index<16;index++){
      const p=frames[step].rabbits[index],cue=p.neighborLookCue;if(!cue)continue;seen.push({step,index});const source=frames[step-1].rabbits[cue.index];
      expect(p.state).toBe('Grazing');expect(p.speed).toBe(0);expect(p.moving).toBe(0);expect(p.directAlarm).toBe(false);expect(source).toMatchObject({active:true,state:'Giving space',foodAvailable:true,spacingCue:{id:'rabbits',index}});expect(source.moving).toBeGreaterThan(.04);expect([cue.x,cue.z]).toEqual([source.x,source.z]);expect(cue.sourceStep).toBe(step-1);
      expect(p.attention).toMatchObject({kind:'neighbor',id:p.neighbor,index:p.neighborIndex,x:source.x,z:source.z});expect(p.neighborDistance).toBe(cue.distance);expect(cue.age).toBeLessThan(8);
    }
    expect(seen).toContainEqual({step:124,index:1});expect(seen.length).toBeGreaterThan(8);expect(frames[124].rabbits[1].neighborLook).toBe(1);expect(frames[124].rabbits[1].neighborLookCue.index).toBe(3);
    expect(digest(physical(frames))).toBe('12bde037b4b4550e83666d38ad017022af4d0d73b77333667ef5d0a57e6fc55b');expect(digest(pair)).toBe('846ec83134c2aff034b6f1c2db6d29f335d6019ed727a3243cfc2249787e9f6b');expect(JSON.stringify(pair)).toBe(before);
    expect(api.encounters(frames,c).find(e=>e.kind==='spacing')).toMatchObject({id:'spacing:rabbits:3:120:129:rabbits:1',actor:{id:'rabbits',index:3},cue:{id:'rabbits',index:1},start:120,end:129,step:124});
    expect(JSON.stringify(api.behaviorTimeline(c,pair.baseline))).toBe(JSON.stringify(frames));
  });

  it('explains the actual reciprocal cue without claiming alarm, cooperation or communication from the pose',()=>{
    const {frames}=recorded(),p=frames[124].rabbits[1],info=api.explainBehavior('rabbits',p);
    expect(info.cue).toMatchObject({id:'rabbits',index:3});expect(info.text).toContain('recorded previous-frame movement');expect(info.text).toContain('adds no alarm');expect(info.text).toContain('does not establish communication, cooperation');
    expect(api.explainBehavior('rabbits',{...p,neighborLookCue:{...p.neighborLookCue,sourceStep:0}}).cue).toBeNull();expect(api.explainBehavior('rabbits',{...p,neighborLookCue:null,neighborLook:1}).cue).toBeNull();
  });

  it('keeps every actual skull vertex inside the existing reservation and the full original nose envelope above terrain during glances and settling',()=>{
    const {frames}=recorded(),head=api.mammalSurface('rabbits','head').positions;let checked=0,minNose=Infinity,minEnvelope=Infinity;
    for(let step=0;step<frames.length;step++)for(let index=0;index<16;index++){
      const p=frames[step].rabbits[index];if(!p.active||!(p.neighborLook>0))continue;checked++;const art=api.mammalArticulation('rabbits',p,false),size=.86*(.94+index%5*.028),posture=api.mammalPosture('rabbits',p);
      for(let v=0;v<head.length;v+=3){const q=headRotation([head[v]-.24,head[v+1]-.4,head[v+2]],art),radius=Math.hypot(q[0]+.24+art.headReach,q[2])*size;minEnvelope=Math.min(minEnvelope,api.peerRadius('rabbits',index)-radius);}
      const q=headRotation([.455-.24,.395-.4,0],art),x=(q[0]+.24+art.headReach)*size,y=(q[1]+.4-art.headDrop)*size,z=q[2]*size,co=Math.cos(p.yaw),si=Math.sin(p.yaw),wx=p.x+co*x+si*z,wz=p.z-si*x+co*z;
      // Global |gradient terrain| < .42 follows the analytic sine/exponential
      // derivative bounds. The rotated ellipsoid vertical support plus this
      // horizontal-radius bound covers all nose points, including mesh faces.
      const basis=[[1,0,0],[0,1,0],[0,0,1]].map(v=>headRotation(v,art)[1]),vertical=size*Math.hypot(basis[0]*.020,basis[1]*.015,basis[2]*.023),clearance=api.groundHeight(p.x,p.z)+p.altitude+posture.drop+y-api.groundHeight(wx,wz)-vertical-.42*size*.023;
      minNose=Math.min(minNose,clearance);
    }
    expect(checked).toBeGreaterThan(10);expect(minEnvelope).toBeGreaterThan(.03);expect(minNose).toBeGreaterThan(.03);
  });
});
