import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const sourceFile=process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js',copy=v=>JSON.parse(JSON.stringify(v));
const zero=()=>({curl:0,history:null});
let api,probe,f;
beforeAll(()=>{
  resetStemLab();loadTool(sourceFile,'ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({soil:{enabled:false},enabled:{rabbits:false,voles:false,foxes:true,owls:false,caterpillars:false,bluetits:false},initial:{foxes:20},capacity:160,cover:0,event:'none',target:'foxes',eventStep:80}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline);
  f={config,pair,frames,step:69,index:6};
  expect(api.foxBrushFollow(frames[61].foxes[6],false).curl).toBeGreaterThan(.02);
  const source=readFileSync(sourceFile,'utf8'),anchor='  window.StemLab.ecosystemFoodWeb.foxBrushFollow=ecoMeadowFoxBrushFollow;';expect(source.split(anchor)).toHaveLength(2);
  resetStemLab();new Function(source.replace(anchor,anchor+'\n  Object.assign(window.StemLab.ecosystemFoodWeb,{brushTestRecord:ecoMeadowFoxBrushRecord,brushTestGate:ecoMeadowFoxBrushGate,brushTestEdge:ecoMeadowFoxBrushEdge});'))();probe=window.StemLab.ecosystemFoodWeb;
},60_000);
function synthetic(turn=0.12,count=14){
  return Array.from({length:count},(_,step)=>({foxes:[{active:true,state:'Searching',x:step*.032,z:0,yaw:Math.min(step,5)*turn,altitude:.025,moving:step?.32:0,stride:1,distance:step*.032,phase:.4,activity:step*.1,rest:0,pounce:0,forage:0,crouch:0,headTurn:0,turnBalance:0,earLeft:0,earRight:0,earTilt:0}]}));
}

describe('fox distal brush follow-through from finite recorded motion history',()=>{
  it('adds only a bounded distal bend during a real held peer-clearance turn and settles after the actual heading straightens',()=>{
    const original=JSON.stringify(f.frames),p=f.frames[61].foxes[6];expect(p.peerAvoidance).not.toBeNull();expect(p.crossingCue).toMatchObject({receiverIndex:6,index:1,startStep:61});
    const amounts=[];
    for(const step of [60,61,62,65,68,69,70,71,72]){
      const p=f.frames[step].foxes[6],follow=api.foxBrushFollow(p,false),a=api.mammalArticulation('foxes',p,false),b=api.mammalArticulation('foxes',copy(p),false);
      expect(Math.abs(follow.curl)).toBeLessThan(.06);expect(a.tailCurl-b.tailCurl).toBeCloseTo(follow.curl,14);
      for(const key of Object.keys(a).filter(key=>key!=='tailCurl'))expect(a[key]).toEqual(b[key]);expect(Object.keys(a)).toEqual(Object.keys(b));
      amounts.push(follow.curl);
    }
    expect(f.frames[62].foxes[6].moving).toBe(0);expect(amounts.at(-4)).toBeGreaterThan(amounts.at(-3));expect(amounts.at(-3)).toBeGreaterThan(amounts.at(-2));expect(amounts.at(-2)).toBeGreaterThan(amounts.at(-1));
    expect(JSON.stringify(f.frames)).toBe(original);
  });
  it('rejects copies, edited inputs, replaced frames, groups and slots, and appended traces while allowing exact restoration',()=>{
    const p=f.frames[f.step].foxes[f.index],follow=api.foxBrushFollow(p,false);expect(follow.curl).toBeGreaterThan(.02);expect(api.foxBrushFollow(copy(p),false)).toEqual(zero());
    for(const mutate of [p=>p.yaw+=.001,p=>p.moving=NaN,p=>p.distance+=.01,p=>p.active=false,p=>p.altitude=.2,p=>p.crossingCue.index++]){
      const original=copy(p);mutate(p);expect(api.foxBrushFollow(p,false)).toEqual(zero());for(const key of Object.keys(p))delete p[key];Object.assign(p,original);expect(api.foxBrushFollow(p,false)).toEqual(follow);
    }
    const before=f.frames[f.step-4].foxes[f.index],yaw=before.yaw;before.yaw+=.001;expect(api.foxBrushFollow(p,false)).toEqual(zero());before.yaw=yaw;
    const after=f.frames[f.step+2].foxes[f.index],activity=after.activity;after.activity+=.001;expect(api.foxBrushFollow(p,false)).toEqual(zero());after.activity=activity;
    const frame=f.frames[f.step];f.frames[f.step]={...frame};expect(api.foxBrushFollow(p,false)).toEqual(zero());f.frames[f.step]=frame;
    const group=frame.foxes;frame.foxes=group.slice();expect(api.foxBrushFollow(p,false)).toEqual(zero());frame.foxes=group;
    group[f.index]=copy(p);expect(api.foxBrushFollow(p,false)).toEqual(zero());group[f.index]=p;
    f.frames.push(null);expect(api.foxBrushFollow(p,false)).toEqual(zero());f.frames.pop();expect(api.foxBrushFollow(p,false)).toEqual(follow);
  });
  it('uses short yaw arcs and finite real travel, rejecting teleports, impossible speed and broken activity chronology',()=>{
    const frames=synthetic(),a=frames[3].foxes[0],b=frames[4].foxes[0];expect(probe.brushTestEdge(a,b)).toBe(true);
    expect(probe.brushTestEdge({...a,yaw:Math.PI-.02},{...b,yaw:-Math.PI+.02})).toBe(true);
    for(const change of [{x:b.x+1},{distance:b.distance+.1},{moving:Infinity},{moving:2.1},{yaw:b.yaw+1},{phase:b.phase+.1},{activity:a.activity+.2},{activity:a.activity-.1},{active:false}])expect(probe.brushTestEdge(a,{...b,...change})).toBe(false);
    const teleported=synthetic();teleported[6].foxes[0].x+=10;probe.brushTestRecord(teleported);expect(probe.foxBrushFollow(teleported[6].foxes[0],false).curl).toBe(0);
    for(const value of [null,{},copy(a),{...a,x:NaN}])expect(probe.foxBrushFollow(value,false)).toEqual(zero());
  });
  it('has symmetric turn inertia, no invented wag on a straight trace, and no remaining bend after four unchanged-heading edges',()=>{
    const left=synthetic(.12),right=synthetic(-.12),straight=synthetic(0);for(const frames of [left,right,straight])probe.brushTestRecord(frames);
    for(let step=0;step<left.length;step++){
      const a=probe.foxBrushFollow(left[step].foxes[0],false).curl,b=probe.foxBrushFollow(right[step].foxes[0],false).curl;
      expect(a).toBeCloseTo(-b,14);expect(Math.abs(a)).toBeLessThan(.06);expect(probe.foxBrushFollow(straight[step].foxes[0],false).curl).toBe(0);
      if(step>=9)expect(a).toBe(0);
    }
    expect(probe.foxBrushFollow(left[5].foxes[0],false).curl).toBeLessThan(-.03);expect(Math.abs(probe.foxBrushFollow(left[6].foxes[0],false).curl)).toBeGreaterThan(.005);
  });
  it('uses smooth zero gates at rest, takeoff and raised altitude, with zero motion at trace endpoints and broken windows',()=>{
    const base=synthetic()[4].foxes[0];expect(probe.brushTestGate(base)).toBe(1);
    for(const [key,edge] of [['rest',.45],['pounce',.01],['altitude',.045]]){expect(probe.brushTestGate({...base,[key]:edge-1e-8})).toBeLessThan(1e-9);expect(probe.brushTestGate({...base,[key]:edge+1e-8})).toBe(0);}
    for(const key of ['rest','pounce','altitude'])expect(probe.brushTestGate({...base,[key]:NaN})).toBe(0);
    const frames=synthetic();probe.brushTestRecord(frames);for(const step of [0,frames.length-1])expect(probe.foxBrushFollow(frames[step].foxes[0],false).curl).toBe(0);
    const cut=synthetic();cut[7].foxes[0].pounce=1;probe.brushTestRecord(cut);for(const step of [6,7,8])expect(probe.foxBrushFollow(cut[step].foxes[0],false).curl).toBe(0);
  });
  it('interpolates actual adjacent history densely and at quarters, with exact endpoints, copy rejection and mutation-sensitive provenance',()=>{
    const step=69,index=6,a=f.frames[step].foxes[index],b=f.frames[step+1].foxes[index],u=api.foxBrushFollow(a,false).curl,v=api.foxBrushFollow(b,false).curl;
    let previous=u;
    for(let k=0;k<=200;k++){
      const alpha=k/200,p=api.blendPose(a,b,alpha,'foxes',f.frames[step-1].foxes[index],f.frames[step+2].foxes[index]),follow=api.foxBrushFollow(p,false),art=api.mammalArticulation('foxes',p,false),plain=api.mammalArticulation('foxes',copy(p),false);
      expect(follow.curl).toBeCloseTo(u+(v-u)*alpha,14);expect(Math.abs(follow.curl-previous)).toBeLessThan(.0001);previous=follow.curl;
      expect(art.tailCurl-plain.tailCurl).toBeCloseTo(follow.curl,14);for(const key of Object.keys(art).filter(key=>key!=='tailCurl'))expect(art[key]).toEqual(plain[key]);
    }
    for(const alpha of [.25,.5,.75]){
      const p=api.blendPose(a,b,alpha,'foxes'),before=api.foxBrushFollow(p,false);expect(before.history.step).toBe(step+alpha);expect(api.foxBrushFollow(copy(p),false)).toEqual(zero());
      const yaw=p.yaw;p.yaw+=.001;expect(api.foxBrushFollow(p,false)).toEqual(zero());p.yaw=yaw;expect(api.foxBrushFollow(p,false)).toEqual(before);
      const sourceYaw=a.yaw;a.yaw+=.001;expect(api.foxBrushFollow(p,false)).toEqual(zero());a.yaw=sourceYaw;expect(api.foxBrushFollow(p,false)).toEqual(before);
    }
    expect(api.blendPose(a,b,0,'foxes')).toBe(a);expect(api.blendPose(a,b,1,'foxes')).toBe(b);
  });
  it('rejects non-adjacent, cross-index and cross-timeline blending and freezes the entire addition under reduced motion',()=>{
    const a=f.frames[69].foxes[6],other=api.behaviorTimeline(f.config,f.pair.baseline);
    for(const b of [f.frames[71].foxes[6],f.frames[70].foxes[5],other[70].foxes[6],copy(f.frames[70].foxes[6])])for(const alpha of [.25,.5,.75])expect(api.foxBrushFollow(api.blendPose(a,b,alpha,'foxes'),false)).toEqual(zero());
    for(const frame of f.frames)for(const p of frame.foxes){expect(api.foxBrushFollow(p,true)).toEqual(zero());expect(api.mammalArticulation('foxes',p,true)).toEqual(api.mammalArticulation('foxes',copy(p),true));}
  });
  it('leaves complete populations, raw timelines, paw targets, rabbit articulation and static tail anatomy unchanged',()=>{
    const before=JSON.stringify({pair:f.pair,frames:f.frames}),skin=api.mammalSurface('foxes','tail');
    for(let step=0;step<f.frames.length;step+=13)for(const p of f.frames[step].foxes.slice(0,4)){
      for(const side of [-1,1])for(const hind of [false,true])expect(api.foxFooting(p,0,hind,side)).toEqual(api.foxFooting(copy(p),0,hind,side));
      expect(api.mammalArticulation('rabbits',p,false)).toEqual(api.mammalArticulation('rabbits',copy(p),false));
    }
    expect(api.compare(f.config)).toEqual(f.pair);expect(api.behaviorTimeline(f.config,f.pair.baseline)).toEqual(f.frames);expect(JSON.stringify({pair:f.pair,frames:f.frames})).toBe(before);expect(api.mammalSurface('foxes','tail')).toEqual(skin);
  });
});
