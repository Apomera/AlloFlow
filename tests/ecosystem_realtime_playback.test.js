import {beforeEach,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={enabled:{caterpillars:true,bluetits:true},event:'none'};
function timeline(c=config){return api.behaviorTimeline(c,api.compare(c).baseline);}

describe('real-time playback between recorded samples',()=>{
  it('returns the exact recorded samples at both ends and eases continuous values between them',()=>{
    const frames=timeline();let checked=0;
    for(let t=1;t<frames.length;t+=11)for(const id of ['rabbits','foxes','owls','caterpillars']){
      const a=frames[t-1][id][0],b=frames[t][id][0];if(!a.active||!b.active)continue;
      expect(api.blendPose(a,b,0,id)).toBe(a);expect(api.blendPose(a,b,1,id)).toBe(b);
      const mid=api.blendPose(a,b,0.5,id);
      for(const key of ['x','z','altitude','distance','forage','headTurn'])expect(mid[key]).toBeCloseTo((a[key]+b[key])/2,12);
      expect(mid.state).toBe(a.state);expect(mid.huntStage).toBe(a.huntStage);expect(Object.values(mid).filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(40);
  });
  it('turns along the short arc and keeps planted feet between their recorded contacts',()=>{
    const a={active:true,x:0,z:0,yaw:Math.PI-0.1,phase:0,distance:0,moving:0,footPlants:[{x:1,z:1,planted:true},{x:2,z:2,planted:false}]};
    const b={...a,yaw:-Math.PI+0.1,x:1,footPlants:[{x:1,z:1,planted:true},{x:4,z:2,planted:true}]};
    const mid=api.blendPose(a,b,0.5,'foxes');
    expect(Math.abs(Math.atan2(Math.sin(mid.yaw-Math.PI),Math.cos(mid.yaw-Math.PI)))).toBeLessThan(1e-12);
    expect(mid.footPlants[0]).toEqual({x:1,z:1,planted:true});expect(mid.footPlants[1]).toEqual({x:3,z:2,planted:false});
    expect(a.footPlants[1].x).toBe(2);
  });
  it('follows sampled paths with continuous velocity and no overshoot at a stop',()=>{
    const pose=(x)=>({active:true,x,z:0,yaw:0,phase:0,distance:x,moving:1,altitude:0.025});
    const path=[pose(0),pose(0.1),pose(0.2),pose(0.2)];
    for(let t=0.05;t<1;t+=0.1){const x=api.blendPose(path[1],path[2],t,'foxes',path[0],path[3]).x;expect(x).toBeGreaterThanOrEqual(0.1);expect(x).toBeLessThanOrEqual(0.2+1e-12);}
    const walk=[pose(0),pose(0.1),pose(0.3),pose(0.6),pose(1)];
    const end=(api.blendPose(walk[1],walk[2],1-1e-6,'foxes',walk[0],walk[3]).x-api.blendPose(walk[1],walk[2],1-2e-6,'foxes',walk[0],walk[3]).x)/1e-6;
    const next=(api.blendPose(walk[2],walk[3],2e-6,'foxes',walk[1],walk[4]).x-api.blendPose(walk[2],walk[3],1e-6,'foxes',walk[1],walk[4]).x)/1e-6;
    expect(Math.abs(end-next)).toBeLessThan(1e-3);
    expect(api.blendPose(path[1],path[2],0.5,'foxes',{...path[0],active:false},path[3]).x).toBeCloseTo(0.15,12);
  });
  it('never blends across an arrival or absence',()=>{
    const a={active:false,x:0,z:0,yaw:0},b={active:true,x:5,z:5,yaw:1};
    expect(api.blendPose(a,b,0.5,'rabbits')).toBe(a);expect(api.blendPose(b,a,0.5,'rabbits')).toBe(b);
    const frames=timeline(),frame=api.blendFrame(frames[10],frames[11],0.25);
    expect(Object.keys(frame).sort()).toEqual(Object.keys(frames[10]).sort());
    expect(api.blendFrame(frames[10],frames[11],0)).toBe(frames[10]);
  });
  it('drives playback from the frame clock instead of a fixed interval, in both shipped copies',()=>{
    for(const file of ['stem_lab/stem_tool_ecosystem.js','desktop/web-app/public/stem_lab/stem_tool_ecosystem.js']){
      const source=readFileSync(file,'utf8'),meadow=source.slice(source.indexOf('function EcoMeadow3D'),source.indexOf('function ecoWebInsights'));
      expect(meadow).toContain('frameId=requestAnimationFrame(frame);');
      expect(meadow).toContain('ecoMeadowBlendFrame(runs[sampleStep],runs[sampleStep+1],blendAmount,runs[sampleStep-1],runs[sampleStep+2])');
      expect(meadow).not.toMatch(/setInterval\(/);
    }
  });
});

describe('natural representative behavior',()=>{
  it('keeps foxes spread out and gives each hunter its own target',()=>{
    const frames=timeline({event:'none'});let pairs=0,close=0,targets=0,shared=0;
    frames.forEach(f=>{
      const foxes=f.foxes.filter(p=>p.active);
      for(let a=0;a<foxes.length;a++)for(let b=a+1;b<foxes.length;b++){pairs++;if(Math.hypot(foxes[a].x-foxes[b].x,foxes[a].z-foxes[b].z)<1.5)close++;}
      const seen=new Set();foxes.forEach(p=>{if(!p.prey)return;targets++;const key=p.prey+':'+p.preyIndex;if(seen.has(key))shared++;seen.add(key);});
    });
    expect(pairs).toBeGreaterThan(1000);expect(close/pairs).toBeLessThan(0.02);
    expect(targets).toBeGreaterThan(300);expect(shared/targets).toBeLessThan(0.05);
  });
  it('lets rabbits alternate feeding, exploring and resting instead of fleeing constantly',()=>{
    const counts={};timeline({event:'none'}).forEach(f=>f.rabbits.forEach(p=>{if(p.active)counts[p.state]=(counts[p.state]||0)+1;}));
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    expect((counts.Retreating||0)/total).toBeLessThan(0.4);
    for(const state of ['Grazing','Exploring','Resting','Alert'])expect(counts[state]||0,state).toBeGreaterThan(total*0.05);
  });
  it('keeps fleeing until a safe gap opens and eases speed changes outside a pounce',()=>{
    const frames=timeline();let bouts=0,long=0;
    for(let i=0;i<16;i++){let run=0;for(let t=1;t<frames.length;t++){const p=frames[t].rabbits[i];if(p.active&&p.state==='Retreating')run++;else{if(run){bouts++;if(run>=5)long++;}run=0;}}}
    expect(bouts).toBeGreaterThan(5);expect(long/bouts).toBeGreaterThan(0.6);
    for(let t=1;t<frames.length;t++)for(const id of ['rabbits','voles','foxes','bluetits'])for(let i=0;i<16;i++){
      const p=frames[t][id][i],old=frames[t-1][id][i];
      if(p.active&&old.active&&!p.huntStage&&!old.huntStage)expect(Math.abs(p.speed-old.speed)).toBeLessThanOrEqual(0.4+1e-12);
    }
  });
  it('sends threatened rabbits into refuge cover when thickets are present',()=>{
    const covered={event:'none',cover:80},frames=timeline(covered),spots=[[-6,2.5],[-4,4],[0,4.6],[4,3.8],[6,1.5],[4,-3.8],[0,-4.5],[-4,-3.6]];
    let sheltering=0;
    frames.forEach(f=>f.rabbits.forEach(p=>{if(p.active&&p.state==='Alert'&&p.threatDistance!=null&&spots.some(([x,z])=>Math.hypot(p.x-x,p.z-z)<1.3))sheltering++;}));
    expect(sheltering).toBeGreaterThan(10);
  });
  it('drops owls to low quartering height over voles and back up to search height',()=>{
    const frames=timeline();let low=0,high=0;
    for(let t=1;t<frames.length;t++)frames[t].owls.forEach((p,i)=>{if(!p.active)return;
      expect(Math.abs(p.altitude-frames[t-1].owls[i].altitude)).toBeLessThanOrEqual(0.035+1e-12);expect(p.altitude).toBeGreaterThan(1.2);
      if(p.altitude<1.5)low++;if(p.altitude>1.95)high++;});
    expect(low).toBeGreaterThan(20);expect(high).toBeGreaterThan(20);
  });
  it('walks toward seeded destinations and picks new ones on arrival',()=>{
    const frames=timeline({event:'none'});let aligned=0,roaming=0;const goals=new Map();
    for(let t=1;t<frames.length;t++)for(const id of ['rabbits','foxes','voles'])frames[t][id].forEach((p,i)=>{
      const old=frames[t-1][id][i];if(!p.active||p.goalN==null)return;
      const key=id+i;goals.set(key,(goals.get(key)||new Set()).add(p.goalN));
      if(['Exploring','Searching'].includes(p.state)&&!p.navigation&&p.moving>0.05&&Math.hypot(p.goalX-old.x,p.goalZ-old.z)>0.5){
        roaming++;const dx=p.x-old.x,dz=p.z-old.z,gx=p.goalX-old.x,gz=p.goalZ-old.z;
        if((dx*gx+dz*gz)/Math.hypot(dx,dz)/Math.hypot(gx,gz)>0.5)aligned++;
      }
    });
    expect(roaming).toBeGreaterThan(200);expect(aligned/roaming).toBeGreaterThan(0.8);
    expect([...goals.values()].filter(set=>set.size>=2).length).toBeGreaterThan(5);
    expect(timeline({event:'none'})).toEqual(frames);
  });
});
