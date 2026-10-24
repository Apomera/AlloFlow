import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
import geometry from './helpers/ecosystem_attachment_geometry.cjs';
const sourceFile=process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js';
const require=createRequire(import.meta.url),T=require(resolve(process.cwd(),'vendor/three-r128/three.min.js'));
let api,control,recordings,examples;
const neutral=()=>({scaleY:1,scaleZ:1,compression:0});
const pose=(cycle,extra={})=>({active:true,state:'Retreating',x:1,z:1,yaw:.4,altitude:.025,distance:cycle*Math.PI*2/28,phase:0,stride:1,moving:1.15,rest:0,crouch:0,pounce:0,forage:0,headRaise:1,activity:1,...extra});
beforeAll(()=>{
  resetStemLab();loadTool(sourceFile,'ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const source=readFileSync(sourceFile,'utf8'),anchor='    if(rabbit){var landingTorso=ecoMeadowRabbitLandingTorso(clean,reduced);result.ribScaleY*=landingTorso.scaleY;result.ribScaleZ*=landingTorso.scaleZ;}';expect(source.split(anchor)).toHaveLength(2);
  resetStemLab();new Function(source.replace(anchor,''))();control=window.StemLab.ecosystemFoodWeb;
  recordings=[{event:'none'},{soil:{enabled:false},enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none',target:'foxes',eventStep:80}].map(config=>{
    const c=api.normalize(config),pair=api.compare(c),oldPair=control.compare(c),frames=api.behaviorTimeline(c,pair.baseline),oldFrames=control.behaviorTimeline(c,oldPair.baseline);return {config:c,pair,oldPair,frames,oldFrames};
  });
  examples={fore:null,hind:null,air:null};
  for(const recording of recordings)for(let step=0;step<recording.frames.length;step++)for(let index=0;index<16;index++){
    const p=recording.frames[step].rabbits[index];if(!p.active)continue;const landing=api.rabbitLanding(p),art=api.mammalArticulation('rabbits',p,false);
    for(const kind of ['fore','hind'])if(step>0&&step<239&&landing[kind]>.5&&(!examples[kind]||landing[kind]>examples[kind].amount))examples[kind]={recording,step,index,amount:landing[kind]};
    if(art.flightLift>.01&&!examples.air)examples.air={recording,step,index};
  }
  expect(examples.fore).toBeTruthy();expect(examples.hind).toBeTruthy();expect(examples.air).toBeTruthy();
},60_000);

describe('rabbit ribcage settling on existing grounded landing pulses',()=>{
  it('caps compression at 1.8 percent and preserves volume with reciprocal widening on both original paired landings',()=>{
    for(const cycle of [.0588,.2388]){const p=pose(cycle),landing=api.rabbitLanding(p),settle=api.rabbitLandingTorso(p,false);expect(Math.max(landing.fore,landing.hind)).toBeCloseTo(1,12);expect(settle.compression).toBeCloseTo(.018,14);expect(settle.scaleY).toBeCloseTo(.982,14);expect(settle.scaleZ).toBeCloseTo(1/.982,14);expect(settle.scaleY*settle.scaleZ).toBeCloseTo(1,15);}
    let maximum=0;for(let n=0;n<=2000;n++){const p=pose(n/2000),s=api.rabbitLandingTorso(p,false);maximum=Math.max(maximum,s.compression);expect(s.compression).toBeGreaterThanOrEqual(0);expect(s.compression).toBeLessThanOrEqual(.018000000001);expect(s.scaleY*s.scaleZ).toBeCloseTo(1,15);}
    expect(maximum).toBeGreaterThan(.0179);
  });
  it('changes only rabbit rib scales in genuine fore/hind examples and leaves every other original articulation channel exact',()=>{
    for(const kind of ['fore','hind']){
      const {recording,step,index}=examples[kind],p=recording.frames[step].rabbits[index],old=recording.oldFrames[step].rabbits[index],a=api.mammalArticulation('rabbits',p,false),b=control.mammalArticulation('rabbits',old,false),s=api.rabbitLandingTorso(p,false);
      expect(api.rabbitLanding(p)[kind]).toBeGreaterThan(.5);expect(s.compression).toBeGreaterThan(.009);expect(a.ribScaleY/b.ribScaleY).toBeCloseTo(s.scaleY,14);expect(a.ribScaleZ/b.ribScaleZ).toBeCloseTo(s.scaleZ,14);expect(Object.keys(a)).toEqual(Object.keys(b));
      for(const key of Object.keys(a).filter(k=>!['ribScaleY','ribScaleZ'].includes(k)))expect(a[key]).toEqual(b[key]);
      for(const side of [-1,1])for(const hind of [false,true]){expect(api.rabbitFooting(p,index,hind,side)).toEqual(control.rabbitFooting(old,index,hind,side));expect(api.rabbitLegPose(p,index,hind,side)).toEqual(control.rabbitLegPose(old,index,hind,side));}
      expect(api.mammalPosture('rabbits',p)).toEqual(control.mammalPosture('rabbits',old));
    }
  });
  it('is zero in shared flight, without stride, at rest or absence, and fades continuously before raised or pouncing poses',()=>{
    const p=pose(.0588);for(const extra of [{moving:.35},{stride:0},{rest:1},{pounce:.01},{altitude:.04},{active:false}])expect(api.rabbitLandingTorso({...p,...extra},false)).toEqual(neutral());
    const {recording,step,index}=examples.air,air=recording.frames[step].rabbits[index];expect(api.mammalArticulation('rabbits',air,false).supportFeet).toBe(0);expect(api.rabbitLandingTorso(air,false)).toEqual(neutral());
    for(let n=0;n<=1000;n++){const p=pose(n/1000),a=api.mammalArticulation('rabbits',p,false),s=api.rabbitLandingTorso(p,false);if(s.compression>0)expect(a.supportFeet).toBeGreaterThan(0);if(a.supportFeet===0)expect(s).toEqual(neutral());}
    for(const [key,edge] of [['pounce',.01],['altitude',.04]]){const left=api.rabbitLandingTorso({...p,[key]:edge-1e-8},false).compression,right=api.rabbitLandingTorso({...p,[key]:edge+1e-8},false).compression;expect(left).toBeLessThan(1e-10);expect(right).toBe(0);}
  });
  it('has matching values and first derivatives at pulse ends, phase wrap, speed thresholds and smooth ground gates',()=>{
    const h=1e-7,verify=(fn,edge)=>{const a=fn(edge-h),b=fn(edge),c=fn(edge+h);expect(Math.abs(c-a)).toBeLessThan(1e-6);expect(Math.abs((b-a)/h-(c-b)/h)).toBeLessThan(.001);};
    for(const edge of [0,.1176,.18,.2976,.42,.6,1])verify(c=>api.rabbitLandingTorso(pose(c),false).compression,edge);
    for(const edge of [.35,.9])verify(moving=>api.rabbitLandingTorso(pose(.05,{moving}),false).compression,edge);
    for(const edge of [.015,.115])verify(stride=>api.rabbitLandingTorso(pose(.05,{stride}),false).compression,edge);
    for(const [key,edges] of [['rest',[0,1]],['pounce',[0,.01]],['altitude',[.025,.04]]])for(const edge of edges){if(edge===0)continue;verify(value=>api.rabbitLandingTorso(pose(.05,{[key]:value}),false).compression,edge);}
  });
  it('follows dense real fractional playback deterministically and freezes both scale channels in reduced motion',()=>{
    const {recording,step,index}=examples.fore,from=Math.max(1,step-1),a=recording.frames[from].rabbits[index],b=recording.frames[from+1].rabbits[index];let last=null;
    for(let k=0;k<=200;k++){
      const alpha=k/200,p=api.blendPose(a,b,alpha,'rabbits',recording.frames[from-1].rabbits[index],recording.frames[from+2].rabbits[index]),s=api.rabbitLandingTorso(p,false),again=api.rabbitLandingTorso(p,false);expect(again).toEqual(s);expect(s.scaleY*s.scaleZ).toBeCloseTo(1,15);if(last!==null)expect(Math.abs(s.compression-last)).toBeLessThan(.002);last=s.compression;
      const reduced=api.mammalArticulation('rabbits',p,true);expect(reduced.ribScaleY).toBe(1);expect(reduced.ribScaleZ).toBe(1);expect(api.rabbitLandingTorso(p,true)).toEqual(neutral());
    }
    const first=api.rabbitLandingTorso(a,false);api.rabbitLandingTorso(recording.frames[Math.min(240,from+20)].rabbits[index],false);expect(api.rabbitLandingTorso(a,false)).toEqual(first);
  });
  it('keeps every concealed limb cap buried, every distal ring and calibrated joint exact through the changed torso transform',()=>{
    const domain=geometry.rayDomain(api.mammalSurface('rabbits','torso'));
    for(const kind of ['fore','hind']){const {recording,step,index}=examples[kind],p=recording.frames[step].rabbits[index],matrix=geometry.torsoMatrix(api,'rabbits',p),inverse=geometry.inverse(matrix);
      for(const hind of [false,true])for(const side of [-1,1]){
        const joints=api.rabbitLegPose(p,index,hind,side),before=api.mammalLimbFit('rabbits',hind,joints),after=before.slice();api.mammalLimbAttachment('rabbits',hind,joints,matrix,after,0,side);
        expect(after.slice(5*39,221*3)).toEqual(before.slice(5*39,221*3));expect(after.slice(222*3,223*3)).toEqual(joints.paw);
        for(const point of geometry.capSamples(after))expect(domain(geometry.transform(inverse,point))).toBeGreaterThan(.01);
      }
    }
  });
  it('retains exact neck geometry and bounds the change in every closest neck-to-torso contact distance',()=>{
    const nearest=(neck,torso)=>neck.map(p=>Math.min(...torso.map(q=>Math.hypot(...p.map((v,k)=>v-q[k]))))).sort((a,b)=>a-b).slice(0,32);
    for(const kind of ['fore','hind']){
      const {recording,step,index}=examples[kind],p=recording.frames[step].rabbits[index],old=recording.oldFrames[step].rabbits[index],art=api.mammalArticulation('rabbits',p,false),shape=api.mammalSurface('rabbits','torso'),neck=api.mammalSurface('rabbits','neck');
      const hm=new T.Matrix4().compose(new T.Vector3(.24+art.headReach,.4-art.headDrop,0),new T.Quaternion().setFromEuler(new T.Euler(art.headRoll,art.headYaw,art.headPitch)),new T.Vector3(1,1,1)).toArray();
      const fitted=api.neckFit('rabbits',hm,neck.positions),prior=control.neckFit('rabbits',hm,control.mammalSurface('rabbits','neck').positions);expect(fitted).toEqual(prior);
      const neckPoints=Array.from({length:fitted.length/3},(_,k)=>[fitted[k*3]+.178,fitted[k*3+1]+.365,fitted[k*3+2]]),a=geometry.torsoMatrix(api,'rabbits',p),b=geometry.torsoMatrix(control,'rabbits',old),current=Array.from({length:shape.positions.length/3},(_,k)=>geometry.transform(a,shape.positions.slice(k*3,k*3+3))),before=Array.from({length:shape.positions.length/3},(_,k)=>geometry.transform(b,shape.positions.slice(k*3,k*3+3)));
      const afterGaps=nearest(neckPoints,current),beforeGaps=nearest(neckPoints,before);for(let k=0;k<32;k++)expect(afterGaps[k]-beforeGaps[k]).toBeLessThan(.006);
    }
  });
  it('rejects malformed helper inputs and preserves complete model/timeline/static anatomy and all fox articulation',()=>{
    const p=pose(.0588);for(const input of [null,{},...[...['distance','phase','moving','stride','rest','pounce','altitude']].map(key=>({...p,[key]:NaN})),{...p,stride:2},{...p,rest:-1},{...p,altitude:-.1}])expect(api.rabbitLandingTorso(input,false)).toEqual(neutral());
    const first=api.rabbitLandingTorso(p,false);first.scaleY=999;expect(api.rabbitLandingTorso(p,false).scaleY).toBeCloseTo(.982,14);
    for(const r of recordings){expect(r.pair).toEqual(r.oldPair);expect(r.frames).toEqual(r.oldFrames);for(let step=0;step<r.frames.length;step+=17)for(let index=0;index<16;index++)expect(api.mammalArticulation('foxes',r.frames[step].foxes[index],false)).toEqual(control.mammalArticulation('foxes',r.oldFrames[step].foxes[index],false));}
    for(const id of ['foxes','rabbits'])for(const part of ['torso','head','neck','tail','ear','forelimb','hindlimb'])expect(api.mammalSurface(id,part)).toEqual(control.mammalSurface(id,part));
  });
});
