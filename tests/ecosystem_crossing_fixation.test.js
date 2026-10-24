import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const toolSource=process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js';
const config={soil:{enabled:false},enabled:{rabbits:false,voles:false,owls:false,caterpillars:false,bluetits:false},initial:{foxes:20},capacity:160,cover:0,event:'none',target:'foxes',eventStep:80};
const copy=value=>JSON.parse(JSON.stringify(value)),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
let api,c,pair,frames,hits,moving;
beforeAll(()=>{
  resetStemLab();loadTool(toolSource,'ecosystem');api=window.StemLab.ecosystemFoodWeb;c=api.normalize(config);pair=api.compare(c);frames=api.behaviorTimeline(c,pair.baseline);
  hits=[];frames.forEach((frame,step)=>frame.foxes.forEach((pose,index)=>{const target=api.foxEyeTarget(pose);if(target?.id==='foxes'&&Math.abs(pose.eyeAim)>.02)hits.push({step,index,pose,target});}));
  expect(hits.length).toBeGreaterThan(0);
  moving=hits.find(({step,index,pose})=>{const next=frames[step+1]?.foxes[index],target=next&&api.foxEyeTarget(next);return target?.id==='foxes'&&target.index===pose.crossingIndex&&next.crossingCue.startStep===pose.crossingCue.startStep&&Math.abs(next.eyeAim)>.02&&Math.hypot(next.x-pose.x,next.z-pose.z)>1e-5;});
  expect(moving).toBeTruthy();
},60_000);

describe('restrained fox fixation on an actual passing peer',()=>{
  it('uses the same current live peer, clearance role and residual bearing as the recorded crossing head attention',()=>{
    const before=JSON.stringify(frames);
    for(const {step,index,pose:p,target} of hits){
      const cue=api.foxCrossingCue(p.crossingCue),source=frames[step].foxes[cue.index];
      expect(cue.receiverIndex).toBe(index);expect(cue.index).toBeLessThan(index);expect(source.active).toBe(true);expect(source.state).toBe('Searching');
      expect(target).toMatchObject({id:'foxes',index:cue.index,x:source.x,z:source.z});expect(p.attention).toMatchObject({kind:'crossing',id:'foxes',index:cue.index,x:source.x,z:source.z});
      const residual=Math.atan2(Math.sin(p.attention.bearing-p.headTurn),Math.cos(p.attention.bearing-p.headTurn));
      expect(target.residual).toBeCloseTo(residual,14);expect(target.amount).toBeCloseTo(Math.sin(Math.max(-.8,Math.min(.8,residual)))/Math.sin(.8)*Math.max(0,Math.cos(residual))*p.crossingLook,14);
      for(const side of [-1,1]){const fix=api.foxEyeFixation(p,side,false);expect(fix.source).toBe('recorded');expect(fix.offset).toBeCloseTo(side*p.eyeAim*.0032,14);expect(Math.abs(fix.offset)).toBeLessThanOrEqual(.0032);}
    }
    expect(JSON.stringify(frames)).toBe(before);
  });
  it('rejects canceled, stale, copied, role-mismatched or malformed current metadata instead of aiming at a merely nearby fox',()=>{
    const base=hits.find(hit=>hit.pose.peerAvoidance)?.pose;expect(base).toBeTruthy();
    const mutations=[p=>p.active=false,p=>p.state='Listening',p=>p.huntStage='prepare',p=>p.searchCue={},p=>p.breakoffCue={},p=>p.listenCue={},p=>p.rest=.11,p=>p.pounce=.02,p=>p.preyDistance=2,p=>p.preyDistance=NaN,p=>p.crossing=null,p=>p.crossingIndex++,p=>p.crossingDistance+=.01,p=>p.crossingLook=0,p=>p.crossingLook=Infinity,p=>p.moving+=.01,p=>p.x+=.01,p=>p.headTurn=NaN,p=>p.attention.index++,p=>p.attention.x+=.01,p=>p.attention.bearing+=.01,p=>p.attention.turn=0,p=>p.crossingCue.receiverIndex=p.crossingCue.index,p=>p.crossingCue.age=16,p=>p.crossingCue.sourceStep++,p=>p.crossingCue.stage='invented',p=>p.peerAvoidance=null,p=>p.peerAvoidance.index++,p=>p.peerAvoidance.nextX+=.01,p=>p.peerAvoidance.source='previous-position'];
    for(const mutate of mutations){const p=copy(base);mutate(p);expect(api.foxEyeTarget(p)).toBeNull();expect(api.foxEyeAim(base,p)).toBe(0);expect(api.foxEyeFixation(p,1,false)).toMatchObject({amount:0,source:'neutral',cue:null});}
  });
  it('fades with the existing release envelope, bounds changes, and returns to the unchanged eye mounts on absence or reduced motion',()=>{
    expect(frames.slice(61,74).some(frame=>frame.foxes[6].crossingCue?.stage==='release'&&frame.foxes[6].crossingLook>0)).toBe(true);
    for(let step=61;step<=77;step++){
      const p=frames[step].foxes[6],previous=frames[step-1].foxes[6],target=api.foxEyeTarget(p);
      if(target){expect(Math.abs(p.eyeAim-previous.eyeAim)).toBeLessThanOrEqual(.220000000000001);expect(Math.abs(target.amount)).toBeLessThanOrEqual(p.crossingLook+1e-12);}
      else expect(p.eyeAim).toBe(0);
      for(const side of [-1,1])expect(api.foxEyeFixation(p,side,true)).toMatchObject({amount:0,source:'neutral',positions:{iris:[.005,0,side*.013],pupil:[.007,.001,side*.016],glint:[.009,.005,side*.019]}});
    }
    expect(frames[77].foxes[6].eyeAim).toBe(0);
    const p=hits[0].pose;expect(api.foxEyeFixation({...p,active:false},1,false).amount).toBe(0);
  });
  it('interpolates only consecutive samples of the same crossing and uses private, mutation-sensitive endpoint provenance',()=>{
    const {step,index}=moving,a=frames[step].foxes[index],b=frames[step+1].foxes[index],before=JSON.stringify([a,b]);
    for(const alpha of [.25,.5,.75]){
      const p=api.blendPose(a,b,alpha,'foxes',frames[step-1].foxes[index],frames[step+2].foxes[index]),fix=api.foxEyeFixation(p,1,false);
      expect(fix.source).toBe('interpolated');expect(fix.amount).toBeCloseTo(a.eyeAim+(b.eyeAim-a.eyeAim)*alpha,14);expect(fix.endpoints).toEqual([api.foxEyeTarget(a),api.foxEyeTarget(b)]);expect(fix.alpha).toBe(alpha);
      expect(api.foxEyeFixation(p,-1,false).offset).toBeCloseTo(-fix.offset,14);expect(api.foxEyeFixation(p,1,true).amount).toBe(0);
      expect(api.foxEyeTarget(p)).toBeNull();expect(api.foxEyeFixation({...p,source:'interpolated',alpha,endpoints:fix.endpoints},1,false).source).toBe('neutral');
      const look=p.crossingLook;p.crossingLook+=.001;expect(api.foxEyeFixation(p,1,false).source).toBe('neutral');p.crossingLook=look;
      const sourceStep=b.crossingCue.sourceStep;b.crossingCue.sourceStep++;expect(api.foxEyeFixation(p,1,false).source).toBe('neutral');b.crossingCue.sourceStep=sourceStep;
      expect(api.foxEyeFixation(p,1,false).source).toBe('interpolated');
    }
    expect(api.blendPose(a,b,0,'foxes')).toBe(a);expect(api.blendPose(a,b,1,'foxes')).toBe(b);expect(JSON.stringify([a,b])).toBe(before);
  });
  it('neutralizes removed peers, invalid next samples and new crossing epochs throughout the fractional interval',()=>{
    const {step,index}=moving,a=frames[step].foxes[index],original=frames[step+1].foxes[index];
    for(const mutate of [p=>p.active=false,p=>p.crossingCue=null,p=>p.attention=null,p=>p.crossingLook=0,p=>p.eyeAim=NaN,p=>p.crossingCue.index++,p=>{p.crossingCue.startStep=p.crossingCue.sourceStep;p.crossingCue.age=0;p.crossingCue.stage='orient';}]){
      const b=copy(original);mutate(b);
      for(const alpha of [.25,.5,.75])expect(api.foxEyeFixation(api.blendPose(a,b,alpha,'foxes'),1,false)).toMatchObject({source:'neutral',amount:0,alpha:null,endpoints:null});
    }
  });
  it('changes only eyeAim on valid crossings and preserves all prey fixation outputs, physical routes, populations, encounters and replay',()=>{
    const source=readFileSync(toolSource,'utf8'),anchor="if(pose&&pose.attention&&pose.attention.kind==='crossing')return ecoMeadowFoxCrossingEyeTarget(pose);";
    expect(source.split(anchor)).toHaveLength(2);resetStemLab();new Function(source.replace(anchor,"if(pose&&pose.attention&&pose.attention.kind==='crossing')return null;"))();
    const baseline=window.StemLab.ecosystemFoodWeb,old=baseline.behaviorTimeline(c,pair.baseline),before=JSON.stringify(pair);
    for(let step=0;step<frames.length;step++)for(const id of Object.keys(frames[step]))for(let index=0;index<frames[step][id].length;index++){
      const p=frames[step][id][index],q=old[step][id][index];expect({...p,eyeAim:0}).toEqual({...q,eyeAim:0});if(id!=='foxes'||p.attention?.kind!=='crossing')expect(p.eyeAim).toBe(q.eyeAim);
    }
    const preyConfig=api.normalize({...config,enabled:{rabbits:true,voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10}),preyPair=api.compare(preyConfig),prey=api.behaviorTimeline(preyConfig,preyPair.baseline),oldPrey=baseline.behaviorTimeline(preyConfig,preyPair.baseline);
    prey.forEach((frame,step)=>frame.foxes.forEach((p,index)=>{if(p.attention?.kind==='prey'){expect(api.foxEyeTarget(p)).toEqual(baseline.foxEyeTarget(oldPrey[step].foxes[index]));expect(p.eyeAim).toBe(oldPrey[step].foxes[index].eyeAim);}}));
    expect(api.compare(c)).toEqual(pair);expect(JSON.stringify(pair)).toBe(before);expect(api.encounters(frames,c)).toEqual(baseline.encounters(old,c));expect(hash(api.behaviorTimeline(c,pair.baseline))).toBe(hash(frames));
  });
});
