import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const pose={active:true,x:1,z:-1,yaw:0,altitude:.025,distance:.2,phase:.4,moving:.6,stride:1,forage:0,rest:0,crouch:0,pounce:0,headTurn:0,state:'Exploring'};
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});

describe('recorded mammal turn follow-through',()=>{
  it('uses the short heading arc, keeps left/right symmetry and bounds a sample change',()=>{
    for(const id of ['foxes','rabbits']){
      const left=api.turnBalance(id,pose,{...pose,yaw:.3}),right=api.turnBalance(id,pose,{...pose,yaw:-.3});
      expect(left).toBe(.18);expect(right).toBe(-left);
      expect(api.turnBalance(id,{...pose,yaw:Math.PI-.02},{...pose,yaw:-Math.PI+.02})).toBeCloseTo(.04/.3,12);
      expect(api.turnBalance(id,{...pose,turnBalance:.9},{...pose,yaw:-.3})).toBeCloseTo(.72,12);
    }
    for(const id of ['plants','owls','voles'])expect(api.turnBalance(id,pose,{...pose,yaw:1})).toBe(0);
    for(const change of [{active:false},{yaw:NaN},{yaw:Infinity}])expect(api.turnBalance('foxes',pose,{...pose,...change})).toBe(0);
    expect(api.turnBalance('foxes',{...pose,active:false},pose)).toBe(0);
  });

  it('settles a stopped tail without inventing a turn or retaining an old impulse indefinitely',()=>{
    let previous={...pose,turnBalance:1};const original=JSON.stringify(previous);
    const sequence=[];for(let step=0;step<8;step++){const next={...pose,moving:0};next.turnBalance=api.turnBalance('foxes',previous,next);sequence.push(next.turnBalance);previous=next;}
    expect(sequence[0]).toBeCloseTo(.82,12);expect(sequence.at(-1)).toBe(0);
    expect(sequence.every((v,k)=>v>=0&&(k===0||v<=sequence[k-1]))).toBe(true);
    expect(JSON.parse(original).turnBalance).toBe(1);
    expect(api.turnBalance('foxes',pose,{...pose,moving:0,yaw:1})).toBe(0);
  });

  it('adds restrained opposing tail/head motion while preserving every calibrated paw target',()=>{
    for(const id of ['foxes','rabbits']){
      const neutral=api.mammalArticulation(id,pose,false),left=api.mammalArticulation(id,{...pose,turnBalance:1},false),right=api.mammalArticulation(id,{...pose,turnBalance:-1},false);
      expect(left.tailYaw).toBeLessThan(neutral.tailYaw);expect(right.tailYaw-neutral.tailYaw).toBeCloseTo(neutral.tailYaw-left.tailYaw,12);
      expect(left.headRoll).toBeLessThan(neutral.headRoll);expect(Math.abs(left.headRoll-neutral.headRoll)).toBeLessThan(.04);
      for(const key of ['foreLift','hindLift','flightLift','supportFeet','headPitch','headYaw'])expect(left[key]).toBe(neutral[key]);
      for(const hind of [true,false])for(const side of [-1,1]){
        const method=id==='foxes'?'foxFooting':'rabbitFooting';
        expect(api[method]({...pose,turnBalance:1},0,hind,side)).toEqual(api[method](pose,0,hind,side));
      }
      expect(api.mammalArticulation(id,{...pose,turnBalance:1,rest:1},false).turnBalance).toBe(0);
      expect(api.mammalArticulation(id,{...pose,turnBalance:1,pounce:1},false).turnBalance).toBe(0);
    }
  });

  it('records the same bounded response from actual prior poses without changing population results',()=>{
    const config={event:'none',cover:10,initial:{rabbits:90,foxes:6}},pair=api.compare(config),original=JSON.stringify(pair),frames=api.behaviorTimeline(config,pair.baseline);
    let nonzero=0;
    for(let step=1;step<frames.length;step+=5)for(const id of ['foxes','rabbits'])for(let index=0;index<4;index++){
      const p=frames[step][id][index],old=frames[step-1][id][index];
      expect(p.turnBalance).toBe(api.turnBalance(id,old,p));expect(Math.abs(p.turnBalance)).toBeLessThanOrEqual(1);
      if(p.active&&Math.abs(p.turnBalance)>.1)nonzero++;
    }
    expect(nonzero).toBeGreaterThan(10);expect(JSON.stringify(pair)).toBe(original);
    const a=api.mammalArticulation('foxes',frames[40].foxes[0],false);api.mammalArticulation('foxes',frames[90].foxes[0],false);expect(api.mammalArticulation('foxes',frames[40].foxes[0],false)).toEqual(a);
  });

  it('interpolates follow-through during playback and freezes it in reduced motion',()=>{
    const a={...pose,turnBalance:-.6},b={...pose,turnBalance:.8,yaw:.2};
    expect(api.blendPose(a,b,.5,'foxes').turnBalance).toBeCloseTo(.1,12);
    expect(api.blendPose(a,b,0,'foxes')).toBe(a);expect(api.blendPose(a,b,1,'foxes')).toBe(b);
    for(const id of ['foxes','rabbits']){
      const neutral=api.mammalArticulation(id,pose,true);
      expect(api.mammalArticulation(id,{...pose,turnBalance:1,yaw:2},true)).toEqual(neutral);
      expect(api.mammalArticulation(id,{...pose,turnBalance:1,active:false},false)).toEqual(neutral);
    }
  });
});
