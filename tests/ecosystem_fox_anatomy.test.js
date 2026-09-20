import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
it('keeps connected segments at fixed length and reaches the intended paw position throughout strides and leaps',()=>{
  let error=0,pitchError=0,minFlex=Infinity,maxFlex=-Infinity;
  for(const hind of [false,true])for(const side of [-1,1])for(const pounce of [0,.25,.75,1])for(let sample=0;sample<=400;sample++){
    const p={distance:sample/400*Math.PI*2/28,phase:.3,stride:1,pounce},foot=api.footPose('foxes',p,hind,side),rig=api.foxLegPose(p,hind,side);
    const knee=[rig.hipX+.21*Math.sin(rig.upper),rig.hipY-.21*Math.cos(rig.upper)];
    const paw=[knee[0]+.20*Math.sin(rig.lower),knee[1]-.20*Math.cos(rig.lower)];
    error=Math.max(error,Math.abs(paw[0]-.056),Math.abs(paw[1]+.38));
    pitchError=Math.max(pitchError,Math.abs(foot.angle+rig.lower+rig.pawPitch-pounce*(hind?-.30:.20)));
    expect(Object.values(rig).every(Number.isFinite)).toBe(true);
    if(!pounce&&hind){minFlex=Math.min(minFlex,Math.abs(rig.lower-rig.upper));maxFlex=Math.max(maxFlex,Math.abs(rig.lower-rig.upper));}
  }
  expect(error).toBeLessThan(1e-12);expect(pitchError).toBeLessThan(1e-12);expect(maxFlex-minFlex).toBeGreaterThan(.4);
});
it('bends front and hind joints in opposite directions and settles to the same neutral shape',()=>{
  const rest={distance:0,phase:0,stride:0,pounce:0};
  const fore=api.foxLegPose(rest,false,1),hind=api.foxLegPose(rest,true,1);
  expect(fore.upper).toBeLessThan(0);expect(hind.upper).toBeGreaterThan(0);
  for(const rear of [false,true])for(const side of [-1,1]){
    const neutral=api.foxLegPose(rest,rear,side),later=api.foxLegPose({...rest,distance:37,phase:5},rear,side);
    for(const key of Object.keys(neutral))expect(later[key]).toBeCloseTo(neutral[key],12);
    let previous=null,maxJump=0;
    for(let i=0;i<=1000;i++){
      const pose=api.foxLegPose({...rest,distance:i/1000*Math.PI*2/28,stride:1},rear,side);
      if(previous)maxJump=Math.max(maxJump,...Object.keys(pose).map(key=>Math.abs(pose[key]-previous[key])));
      previous=pose;
    }
    expect(maxJump).toBeLessThan(.035);
  }
});
