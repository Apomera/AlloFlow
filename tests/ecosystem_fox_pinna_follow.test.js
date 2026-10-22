import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const sourceFile=process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js',copy=v=>JSON.parse(JSON.stringify(v)),zero=()=>({pitch:0,yaw:0,history:null});
const applied="if(foxPinnaFollow){ear.rotation.y+=foxPinnaFollow.yaw;ear.rotation.z+=foxPinnaFollow.pitch;}";
let api,control,probe,f;
beforeAll(()=>{
 resetStemLab();loadTool(sourceFile,'ecosystem');api=window.StemLab.ecosystemFoodWeb;
 const source=readFileSync(sourceFile,'utf8');expect(source.split(applied)).toHaveLength(2);resetStemLab();new Function(source.replace(applied,''))();control=window.StemLab.ecosystemFoodWeb;
 const config=api.normalize({soil:{enabled:false},enabled:{rabbits:false,voles:false,foxes:true,owls:false,caterpillars:false,bluetits:false},initial:{foxes:20},capacity:160,cover:0,event:'none',target:'foxes',eventStep:80}),pair=api.compare(config),oldPair=control.compare(config);
 f={config,pair,oldPair,frames:api.behaviorTimeline(config,pair.baseline),oldFrames:control.behaviorTimeline(config,oldPair.baseline),index:6,step:69};
 const anchor='  window.StemLab.ecosystemFoodWeb.foxPinnaFollow=ecoMeadowFoxPinnaFollow;';expect(source.split(anchor)).toHaveLength(2);resetStemLab();new Function(source.replace(anchor,anchor+'\n  Object.assign(window.StemLab.ecosystemFoodWeb,{pinnaTestRecord:ecoMeadowFoxPinnaRecord,pinnaTestGate:ecoMeadowFoxPinnaGate,pinnaTestEdge:ecoMeadowFoxPinnaEdge});'))();probe=window.StemLab.ecosystemFoodWeb;
},60_000);
function synthetic(turn=.12,count=16){return Array.from({length:count},(_,step)=>({foxes:[{active:true,state:'Searching',x:step*.032,z:0,yaw:Math.min(step,5)*turn,altitude:.025,moving:step?.32:0,stride:.8,distance:step*.032,phase:.4,activity:step*.1,rest:0,pounce:0,forage:0,crouch:0,headTurn:0,turnBalance:0,earLeft:0,earRight:0,earTilt:0,listenTilt:0}]}));}
function sameBaseArt(a,b){expect(a).toEqual(b);}
function cloneArt(p){const a=api.mammalArticulation('foxes',p,false),b=api.mammalArticulation('foxes',copy(p),false);for(const key of Object.keys(a).filter(k=>k!=='tailCurl'))expect(a[key]).toEqual(b[key]);}

describe('fox pinna follow-through from private recorded skull history',()=>{
 it('adds a visible bounded renderer-only ear lag through a genuine clearance turn and release, preserving complete base articulation',()=>{
  const original=JSON.stringify(f.frames),amounts=[];
  for(const step of [60,61,62,65,69,70,72,74]){const p=f.frames[step].foxes[6],old=f.oldFrames[step].foxes[6],follow=api.foxPinnaFollow(p,false),a=api.mammalArticulation('foxes',p,false),b=control.mammalArticulation('foxes',old,false);expect(follow.history).toMatchObject({index:6,step});expect(Math.hypot(follow.pitch,follow.yaw)).toBeLessThan(.05);sameBaseArt(a,b);cloneArt(p);amounts.push(follow.yaw);}
  expect(f.frames[61].foxes[6].crossingCue).toMatchObject({index:1,receiverIndex:6,startStep:61});expect(f.frames[62].foxes[6].moving).toBe(0);expect(amounts[4]).toBeGreaterThan(.04);expect(amounts[4]).toBeGreaterThan(amounts[5]);expect(amounts[5]).toBeGreaterThan(amounts[6]);expect(amounts[6]).toBeGreaterThan(amounts[7]);expect(JSON.stringify(f.frames)).toBe(original);
 });
 it('invalidates edited fields of any type, nested cues, replaced frame/group/slot identities and changed trace length',()=>{
  const p=f.frames[69].foxes[6],before=api.foxPinnaFollow(p,false);expect(before.yaw).toBeGreaterThan(.04);expect(api.foxPinnaFollow(copy(p),false)).toEqual(zero());
  for(const [key,value]of [['yaw',p.yaw+.001],['earLeft',NaN],['earRight',Infinity],['headTurn',null],['active',false],['state','Edited'],['newUndefinedField',undefined]]){const had=Object.prototype.hasOwnProperty.call(p,key),old=p[key];p[key]=value;expect(api.foxPinnaFollow(p,false)).toEqual(zero());if(had)p[key]=old;else delete p[key];expect(api.foxPinnaFollow(p,false)).toEqual(before);}
  const q=f.frames[65].foxes[6],old=q.crossingCue.index;q.crossingCue.index++;expect(api.foxPinnaFollow(p,false)).toEqual(zero());q.crossingCue.index=old;
  const after=f.frames[71].foxes[6],distance=after.distance;after.distance+=.001;expect(api.foxPinnaFollow(p,false)).toEqual(zero());after.distance=distance;
  const frame=f.frames[69],group=frame.foxes;f.frames[69]={...frame};expect(api.foxPinnaFollow(p,false)).toEqual(zero());f.frames[69]=frame;frame.foxes=group.slice();expect(api.foxPinnaFollow(p,false)).toEqual(zero());frame.foxes=group;group[6]=copy(p);expect(api.foxPinnaFollow(p,false)).toEqual(zero());group[6]=p;group.push(null);expect(api.foxPinnaFollow(p,false)).toEqual(zero());group.pop();f.frames.push(null);expect(api.foxPinnaFollow(p,false)).toEqual(zero());f.frames.pop();expect(api.foxPinnaFollow(p,false)).toEqual(before);
 });
 it('requires finite genuine travel and adjacent chronology, rejecting teleports, impossible speed and head jumps',()=>{
  const frames=synthetic(),a=frames[3].foxes[0],b=frames[4].foxes[0];expect(probe.pinnaTestEdge(a,b)).toBe(true);expect(probe.pinnaTestEdge({...a,yaw:Math.PI-.02},{...b,yaw:-Math.PI+.02})).toBe(true);
  for(const change of [{x:b.x+1},{distance:b.distance+.1},{moving:2.1},{moving:NaN},{yaw:b.yaw+.5},{activity:a.activity+.2},{activity:a.activity-.1},{phase:b.phase+.1},{headTurn:.1},{listenTilt:Infinity},{active:false}])expect(probe.pinnaTestEdge(a,{...b,...change})).toBe(false);
  const bad=synthetic();bad[6].foxes[0].x+=10;probe.pinnaTestRecord(bad);expect(probe.foxPinnaFollow(bad[6].foxes[0],false).yaw).toBe(0);for(const p of [null,{},copy(a),{...a,x:NaN}])expect(probe.foxPinnaFollow(p,false)).toEqual(zero());
 });
 it('has mirrored turn lag, no invented motion on a fixed skull, and loses yaw lag after four unchanged-heading edges',()=>{
  const left=synthetic(.12),right=synthetic(-.12),straight=synthetic(0);straight.forEach(frame=>frame.foxes[0].stride=0);for(const frames of [left,right,straight])probe.pinnaTestRecord(frames);
  for(let step=0;step<left.length;step++){const a=probe.foxPinnaFollow(left[step].foxes[0],false),b=probe.foxPinnaFollow(right[step].foxes[0],false);expect(a.yaw).toBeCloseTo(-b.yaw,14);expect(a.pitch).toBeCloseTo(b.pitch,14);expect(Math.hypot(a.yaw,a.pitch)).toBeLessThan(.05);expect(probe.foxPinnaFollow(straight[step].foxes[0],false)).toMatchObject({pitch:0,yaw:0});if(step>=9)expect(a.yaw).toBe(0);}
  expect(probe.foxPinnaFollow(left[5].foxes[0],false).yaw).toBeLessThan(-.03);expect(Math.abs(probe.foxPinnaFollow(left[6].foxes[0],false).yaw)).toBeGreaterThan(.005);
 });
 it('smoothly cancels at rest, pounce and altitude boundaries with zero trace endpoints and broken-window joins',()=>{
  const base=synthetic()[4].foxes[0];expect(probe.pinnaTestGate(base)).toBe(1);
  for(const [key,start,end]of [['rest',.05,.45],['pounce',0,.01],['altitude',.025,.045]]){let last=1;for(let k=0;k<=200;k++){const v=probe.pinnaTestGate({...base,[key]:start+(end-start)*k/200});expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(last+1e-14);expect(Math.abs(v-last)).toBeLessThan(.008);last=v;}expect(last).toBe(0);expect(probe.pinnaTestGate({...base,[key]:end-1e-8})).toBeLessThan(1e-9);expect(probe.pinnaTestGate({...base,[key]:end+1e-8})).toBe(0);expect(probe.pinnaTestGate({...base,[key]:NaN})).toBe(0);}
  const frames=synthetic();probe.pinnaTestRecord(frames);for(const step of [0,frames.length-1])expect(probe.foxPinnaFollow(frames[step].foxes[0],false)).toMatchObject({pitch:0,yaw:0});frames[7].foxes[0].pounce=1;probe.pinnaTestRecord(frames);for(const step of [6,7,8])expect(probe.foxPinnaFollow(frames[step].foxes[0],false)).toMatchObject({pitch:0,yaw:0});
 });
 it('densely interpolates adjacent own history with smooth endpoint slopes and exact complete base articulation',()=>{
  const step=69,index=6,a=f.frames[step].foxes[index],b=f.frames[step+1].foxes[index],oldA=f.oldFrames[step].foxes[index],oldB=f.oldFrames[step+1].foxes[index],u=api.foxPinnaFollow(a,false),v=api.foxPinnaFollow(b,false);let previous=u;
  for(let k=0;k<=200;k++){const alpha=k/200,t=alpha*alpha*(3-2*alpha),p=api.blendPose(a,b,alpha,'foxes',f.frames[step-1].foxes[index],f.frames[step+2].foxes[index]),old=control.blendPose(oldA,oldB,alpha,'foxes',f.oldFrames[step-1].foxes[index],f.oldFrames[step+2].foxes[index]),follow=api.foxPinnaFollow(p,false),art=api.mammalArticulation('foxes',p,false),prior=control.mammalArticulation('foxes',old,false);for(const key of ['pitch','yaw']){expect(follow[key]).toBeCloseTo(u[key]+(v[key]-u[key])*t,14);expect(Math.abs(follow[key]-previous[key])).toBeLessThan(.00005);}previous=follow;expect(Math.hypot(follow.pitch,follow.yaw)).toBeLessThan(.05);sameBaseArt(art,prior);cloneArt(p);expect(api.foxPinnaFollow(p,false)).toEqual(follow);}
  for(const edge of [0,1]){const alpha=edge?1-1e-6:1e-6,p=api.blendPose(a,b,alpha,'foxes'),follow=api.foxPinnaFollow(p,false),target=edge?v:u;expect(Math.hypot(follow.yaw-target.yaw,follow.pitch-target.pitch)).toBeLessThan(1e-12);}expect(api.blendPose(a,b,0,'foxes')).toBe(a);expect(api.blendPose(a,b,1,'foxes')).toBe(b);
 });
 it('rejects cross-trace/index/time blending and changed display or source provenance, returning detached history',()=>{
  const a=f.frames[69].foxes[6],b=f.frames[70].foxes[6],other=api.behaviorTimeline(f.config,f.pair.baseline);
  for(const q of [f.frames[71].foxes[6],f.frames[70].foxes[5],other[70].foxes[6],copy(b)])for(const alpha of [.25,.5,.75])expect(api.foxPinnaFollow(api.blendPose(a,q,alpha,'foxes'),false)).toEqual(zero());
  for(const alpha of [.25,.5,.75]){const p=api.blendPose(a,b,alpha,'foxes'),before=api.foxPinnaFollow(p,false);expect(before.history.step).toBe(69+alpha);expect(api.foxPinnaFollow(copy(p),false)).toEqual(zero());const yaw=p.yaw;p.yaw+=.001;expect(api.foxPinnaFollow(p,false)).toEqual(zero());p.yaw=yaw;const tilt=a.earTilt;a.earTilt+=.001;expect(api.foxPinnaFollow(p,false)).toEqual(zero());a.earTilt=tilt;expect(api.foxPinnaFollow(p,false)).toEqual(before);before.history.from=-1;expect(api.foxPinnaFollow(p,false).history.from).toBeGreaterThanOrEqual(0);}
 });
 it('preserves complete populations, raw recordings, all paw targets, rabbit and reduced art, and static anatomy',()=>{
  expect(f.pair).toEqual(f.oldPair);expect(f.frames).toEqual(f.oldFrames);const before=JSON.stringify({pair:f.pair,frames:f.frames});
  for(let step=0;step<f.frames.length;step+=17)for(let index=0;index<16;index++){for(const id of ['foxes','rabbits']){const p=f.frames[step][id][index],old=f.oldFrames[step][id][index];expect(api.foxPinnaFollow(p,true)).toEqual(zero());expect(api.mammalArticulation(id,p,true)).toEqual(control.mammalArticulation(id,old,true));expect(api.mammalArticulation(id,p,false)).toEqual(control.mammalArticulation(id,old,false));if(id==='foxes')for(const side of [-1,1])for(const hind of [false,true]){const foot=api.foxFooting(p,index,hind,side),prior=control.foxFooting(old,index,hind,side);expect(foot).toEqual(prior);expect(api.foxLegPose(p,hind,side,foot)).toEqual(control.foxLegPose(old,hind,side,prior));}}}
  for(const id of ['foxes','rabbits'])for(const part of ['torso','head','neck','tail','ear','forelimb','hindlimb'])expect(api.mammalSurface(id,part)).toEqual(control.mammalSurface(id,part));expect(JSON.stringify({pair:f.pair,frames:f.frames})).toBe(before);
 });
});
