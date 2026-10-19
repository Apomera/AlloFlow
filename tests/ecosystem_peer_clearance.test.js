import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const toolSource=process.env.ECOLOGY_PEER_CANDIDATE||'stem_lab/stem_tool_ecosystem.js';
beforeEach(()=>{resetStemLab();loadTool(toolSource,'ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const pose=(x,z,extra={})=>({x,z,yaw:0,active:true,huntStage:'',distance:0,stride:0,moving:0,phase:0,...extra});
const proposal=(x,z,extra={})=>({x,z,yaw:.17,distance:1,huntStage:'',...extra});
function relativeMinimum(a,b,c,d){const rx=a.x-c.x,rz=a.z-c.z,vx=b.x-a.x-(d.x-c.x),vz=b.z-a.z-(d.z-c.z),l=vx*vx+vz*vz,t=l?Math.max(0,Math.min(1,-(rx*vx+rz*vz)/l)):0;return Math.hypot(rx+t*vx,rz+t*vz);}

describe('bounded deterministic grounded peer clearance',()=>{
  it('uses a rendered head/torso envelope while keeping static scenery ground radii unchanged',()=>{
    for(const id of ['rabbits','foxes'])for(let index=0;index<16;index++){
      const scale=.94+index%5*.028,renderScale=id==='rabbits'?.86:1;
      expect(api.peerRadius(id,index)).toBeCloseTo((id==='rabbits'?.50*.86:.70)*scale,12);
      expect(api.groundRadius(id,index)).toBeCloseTo((id==='rabbits'?.30:.50)*scale,12);
      for(const part of ['torso','head']){const positions=api.mammalSurface(id,part).positions;let radial=0;for(let k=0;k<positions.length;k+=3)radial=Math.max(radial,Math.hypot(positions[k],positions[k+2]));expect(radial*renderScale*scale).toBeLessThan(api.peerRadius(id,index));}
    }
    for(const id of ['voles','owls','plants',''])expect(api.peerRadius(id,0)).toBe(0);
    for(const index of [-1,.5,16,NaN])expect(api.peerRadius('rabbits',index)).toBe(0);
    const old=pose(-1,0),other=pose(0,0),result=api.peerStep('rabbits',0,old,proposal(.5,0),[old,other],[],2);
    expect(result.peerAvoidance).toMatchObject({envelope:'head-torso',selfRadius:api.peerRadius('rabbits',0),peerRadius:api.peerRadius('rabbits',1),radius:api.peerRadius('rabbits',0)+api.peerRadius('rabbits',1)+.025});
  });

  it('shortens a head-on step without changing its turn, input objects or unrelated metadata',()=>{
    const old=pose(-1,0),other=pose(0,0),next=proposal(.5,0,{navigation:{id:'rock'},state:'Retreating'}),previous=[old,other],before=JSON.stringify({old,next,previous});
    const a=api.peerStep('rabbits',0,old,next,previous,[],2),b=api.peerStep('rabbits',0,old,next,previous,[],2),radius=api.peerRadius('rabbits',0)+api.peerRadius('rabbits',1)+.025;
    expect(a).toEqual(b);expect(a.yaw).toBe(next.yaw);expect(a.state).toBe('Retreating');expect(a.navigation).toEqual(next.navigation);expect(a.peerAvoidance).toMatchObject({id:'rabbits',index:1,x:0,z:0,nextX:0,nextZ:0,source:'previous-position',radius});
    expect(relativeMinimum(old,a,other,other)).toBeGreaterThanOrEqual(radius-2e-10);expect(a.distance).toBeCloseTo(Math.hypot(a.x-old.x,a.z-old.z),12);expect(a.distance).toBeGreaterThan(0);expect(a.distance).toBeLessThan(1.5);expect(a.peerAvoidance.allowedDistance).toBe(a.distance);expect(JSON.stringify({old,next,previous})).toBe(before);
  });
  it('reserves actual earlier paths and tests a crossing between samples, not only endpoints',()=>{
    const previous=[pose(-1,0),pose(0,-1)],committed=[];
    committed[0]=api.peerStep('rabbits',0,previous[0],proposal(1,0),previous,committed,2);committed[0].active=true;
    const b=api.peerStep('rabbits',1,previous[1],proposal(0,1),previous,committed,2),radius=api.peerRadius('rabbits',0)+api.peerRadius('rabbits',1)+.025;
    expect(Math.hypot(committed[0].x-0,committed[0].z-1)).toBeGreaterThan(radius);expect(b.peerAvoidance).toMatchObject({index:0,source:'committed-step',nextX:committed[0].x,nextZ:committed[0].z});
    expect(relativeMinimum(previous[0],committed[0],previous[1],b)).toBeGreaterThanOrEqual(radius-2e-10);expect(b.distance).toBeGreaterThanOrEqual(0);
  });
  it('rechecks an earlier safe crossing when a later peer selects an unsafe intermediate speed',()=>{
    const previous=[pose(0,-4),pose(4,0),pose(-2,0)],committed=[pose(0,4),pose(4,0)],next=proposal(6,0,{distance:8});
    const radius=api.peerRadius('rabbits',0)+api.peerRadius('rabbits',2)+.025;
    // Passing ahead at full speed and waiting both clear the first peer.
    expect(relativeMinimum(previous[2],next,previous[0],committed[0])).toBeGreaterThan(radius);
    expect(relativeMinimum(previous[2],previous[2],previous[0],committed[0])).toBeGreaterThan(radius);
    // A second peer alone shortens the step into that first peer's crossing.
    const laterOnly=api.peerStep('rabbits',2,previous[2],next,[null,previous[1],previous[2]],committed,3);
    expect(laterOnly.peerAvoidance.index).toBe(1);expect(laterOnly.peerAvoidance.fraction).toBeGreaterThan(0);expect(laterOnly.peerAvoidance.fraction).toBeLessThan(1);
    expect(relativeMinimum(previous[2],laterOnly,previous[0],committed[0])).toBeLessThan(radius);
    // The complete solve must restart and certify both actual peer paths.
    const result=api.peerStep('rabbits',2,previous[2],next,previous,committed,3);
    expect(result.peerAvoidance.index).toBe(0);expect(result.peerAvoidance.fraction).toBeLessThan(laterOnly.peerAvoidance.fraction);
    for(let j=0;j<2;j++)expect(relativeMinimum(previous[2],result,previous[j],committed[j])).toBeGreaterThanOrEqual(api.peerRadius('rabbits',2)+api.peerRadius('rabbits',j)+.025-2e-10);
    expect(result.yaw).toBe(next.yaw);expect(result.distance).toBeCloseTo(Math.hypot(result.x-previous[2].x,result.z-previous[2].z),12);
  });
  it('lets an existing overlap separate continuously without snapping and blocks an inward step',()=>{
    const old=pose(-.2,0),other=pose(0,0),previous=[old,other];
    const outward=api.peerStep('rabbits',0,old,proposal(-.23,0,{distance:.03}),previous,[],2),inward=api.peerStep('rabbits',0,old,proposal(-.17,0,{distance:.03}),previous,[],2);
    expect(outward.x).toBe(-.23);expect(outward.peerAvoidance).toBeNull();expect(inward.x).toBe(old.x);expect(inward.z).toBe(old.z);expect(inward.distance).toBe(0);expect(inward.peerAvoidance.fraction).toBe(0);
    const centred=pose(0,0),escape=api.peerStep('rabbits',0,centred,proposal(.03,0,{distance:.03}),[centred,other],[],2);expect(escape.x).toBe(.03);
  });
  it('does not redirect or freeze committed fox leaps or an already airborne rabbit bound',()=>{
    const old=pose(-1,0),other=pose(0,0),next=proposal(.5,0,{distance:1.5,huntStage:'airborne'});
    expect(api.peerStep('foxes',0,old,next,[old,other],[],2)).toMatchObject({...next,peerAvoidance:null});
    const flight=pose(-1,0,{moving:1.15,stride:1,phase:.8*Math.PI*2}),rabbitNext=proposal(.5,0,{distance:1.5});expect(api.mammalArticulation('rabbits',flight,false).supportFeet).toBe(0);
    expect(api.peerStep('rabbits',0,flight,rabbitNext,[flight,other],[],2)).toMatchObject({...rabbitNext,peerAvoidance:null});
    const peerFlight=pose(0,0,{moving:1.15,stride:1,phase:.8*Math.PI*2});expect(api.peerStep('rabbits',0,old,rabbitNext,[old,peerFlight],[],2).peerAvoidance).toBeNull();
  });
  it('ignores missing, removed and unsupported peers and preserves unobstructed steps exactly',()=>{
    const old=pose(-1,0),other=pose(3,3),next=proposal(-.97,0,{distance:.03}),previous=[old,other];
    for(const args of [['voles',0,old,next,previous,[],2],['rabbits',0,old,next,previous,[],1],['rabbits',0,old,next,[old,null],[],2],['rabbits',0,old,next,previous,[],2]])expect(api.peerStep(...args)).toEqual({...next,peerAvoidance:null});
    const removed=[{...other,active:false}];expect(api.peerStep('rabbits',1,old,proposal(3,3),[other,old],removed,2).peerAvoidance).toBeNull();
    for(const args of [['rabbits',-1,old,next,previous,[],2],['rabbits',0,old,next,null,[],2],['rabbits',0,old,next,previous,null,2],['rabbits',0,old,next,previous,[],NaN]])expect(api.peerStep(...args)).toEqual({...next,peerAvoidance:null});
  });
});

describe('recorded same-group clearance and retained ecology activities',()=>{
  const config={enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'};
  it('keeps the demonstrated crowded feeding neighbors apart while retaining real spacing, cue tests, and four still recovery samples',()=>{
    const rows=api.compare(config).baseline,before=JSON.stringify(rows),frames=api.behaviorTimeline(config,rows);let avoided=0;
    for(let step=1;step<frames.length;step++)for(let i=0;i<16;i++){
      const p=frames[step].rabbits[i],old=frames[step-1].rabbits[i];if(!p.active)continue;
      expect(p.distance-old.distance).toBeCloseTo(Math.hypot(p.x-old.x,p.z-old.z),9);expect(p.moving).toBeCloseTo(Math.hypot(p.x-old.x,p.z-old.z)*10,9);
      if(p.peerAvoidance){avoided++;expect(p.peerAvoidance.id).toBe('rabbits');expect(p.peerAvoidance.index).not.toBe(i);expect(p.peerAvoidance.fraction).toBeGreaterThanOrEqual(0);expect(p.peerAvoidance.fraction).toBeLessThanOrEqual(1);expect(p.peerAvoidance.allowedDistance).toBeCloseTo(p.moving*.1,10);const source=frames[step-1].rabbits[p.peerAvoidance.index];expect(p.peerAvoidance.x).toBe(source.x);expect(p.peerAvoidance.z).toBe(source.z);expect(api.mammalArticulation('rabbits',old,false).supportFeet).toBeGreaterThan(0);}
      for(let j=i+1;j<16;j++){const q=frames[step].rabbits[j],oldQ=frames[step-1].rabbits[j];if(!q.active)continue;expect(Math.hypot(p.x-q.x,p.z-q.z)).toBeGreaterThanOrEqual(api.groundRadius('rabbits',i)+api.groundRadius('rabbits',j)-1e-9);const room=api.peerRadius('rabbits',i)+api.peerRadius('rabbits',j);if(old.active&&oldQ.active&&Math.hypot(old.x-oldQ.x,old.z-oldQ.z)>=room-1e-10&&api.mammalArticulation('rabbits',old,false).supportFeet>0&&api.mammalArticulation('rabbits',oldQ,false).supportFeet>0)expect(Math.hypot(p.x-q.x,p.z-q.z)).toBeGreaterThanOrEqual(room-1e-9);}
    }
    expect(avoided).toBeGreaterThan(10);
    const encounter=api.encounters(frames,config).find(e=>e.kind==='spacing');expect(encounter).toBeTruthy();const context=api.spacingProbeCase(frames,encounter);expect(context).toBeTruthy();expect(api.spacingProbeRun(context,'distance',context.recorded.decisionDistance).outcome).toBe('continue');expect(api.spacingProbeRun(context,'distance',1.5).outcome).toBe('stop');
    const episodes=[];for(let step=1;step<frames.length;step++)for(let index=0;index<16;index++){const p=frames[step].rabbits[index];if(p.recoveryCue&&p.recoveryCue.age===0){const samples=[];for(let k=step;k<frames.length;k++){const q=frames[k].rabbits[index];if(!q.recoveryCue)break;if(q.recoveryCue.stage==='still')samples.push(q);}if(samples.length===4)episodes.push(samples);}}
    expect(episodes.length).toBeGreaterThan(0);for(const samples of episodes)for(const p of samples){expect(p.speed).toBe(0);expect(p.moving).toBe(0);expect(p.x).toBe(samples[0].x);expect(p.z).toBe(samples[0].z);}
    expect(JSON.stringify(rows)).toBe(before);expect(api.behaviorTimeline(config,rows)).toEqual(frames);
  });
  it('clears peer metadata at exact removals and retains refuge priority and paused contact evidence',()=>{
    const removal={...config,event:'remove',target:'rabbits',eventStep:100},frames=api.behaviorTimeline(removal,api.compare(removal).experiment);
    for(let step=100;step<frames.length;step++)for(const p of frames[step].rabbits){expect(p.active).toBe(false);expect(p.peerAvoidance).toBeNull();expect(p.spacingCue).toBeNull();expect(p.recoveryCue).toBeNull();}
    const covered={...config,cover:80},f=api.behaviorTimeline(covered,api.compare(covered).baseline);let atCover=0;
    for(const frame of f)for(const p of frame.rabbits)if(p.refugeCue){expect(p.recoveryCue).toBeNull();expect(p.spacingCue).toBeNull();if(p.refugeCue.stage==='at-cover')atCover++;}
    expect(atCover).toBeGreaterThan(0);
    const study=api.mammalMotionStudy(f,'rabbits',0),plan=api.footfallPlan(f,study);expect(study).toBeTruthy();expect(plan.samples).toHaveLength(3);expect(plan.samples.every(s=>s.feet.length===4)).toBe(true);
  });
});
