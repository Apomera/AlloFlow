import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const pose={active:true,x:1,z:2,yaw:0,altitude:.025,phase:0};

describe('current-pose mammal face framing',()=>{
  it('centers the neutral skull of each species at its actual scaled height',()=>{
    for(const [id,local,size,height] of [['foxes',.41,.94,.635],['rabbits',.315,.86*.94,.425]]){
      const focus=api.headFocus(id,pose,0,true);
      expect(focus.point[0]).toBeCloseTo(pose.x+local*size,12);
      expect(focus.point[1]).toBeCloseTo(api.groundHeight(pose.x,pose.z)+pose.altitude+height*size,12);
      expect(focus.point[2]).toBe(pose.z);
    }
  });

  it('follows the current heading and representative size without retaining a prior frame',()=>{
    const a=api.headFocus('rabbits',pose,0,true),turned=api.headFocus('rabbits',{...pose,yaw:Math.PI/2},0,true);
    expect(turned.point[0]).toBeCloseTo(pose.x,12);expect(turned.point[2]).toBeCloseTo(pose.z-(a.point[0]-pose.x),12);
    const larger=api.headFocus('rabbits',pose,4,true);expect(larger.point[0]-pose.x).toBeGreaterThan(a.point[0]-pose.x);
    api.headFocus('foxes',{...pose,yaw:-1,forage:.8,headTurn:.4,activity:3},7,false);
    expect(api.headFocus('rabbits',pose,0,true)).toEqual(a);
  });

  it('changes with the real grazing skull while preserving its inputs and detached results',()=>{
    const feeding={...pose,state:'Grazing',forage:.8,headTurn:.3,activity:4},before=JSON.stringify(feeding);
    const upright=api.headFocus('rabbits',pose,0,false),down=api.headFocus('rabbits',feeding,0,false);
    expect(down.point[1]).toBeLessThan(upright.point[1]-.15);expect(down.point.every(Number.isFinite)).toBe(true);
    const copy=api.headFocus('rabbits',feeding,0,false);copy.point[0]=999;copy.local[0]=999;
    expect(api.headFocus('rabbits',feeding,0,false)).toEqual(down);expect(JSON.stringify(feeding)).toBe(before);
  });

  it('rejects unsupported species, malformed positions and invalid representatives',()=>{
    for(const index of [-1,16,.5,NaN])expect(api.headFocus('rabbits',pose,index,false)).toBeNull();
    for(const id of ['owls','voles','plants',''])expect(api.headFocus(id,pose,0,false)).toBeNull();
    for(const key of ['x','z','yaw','altitude'])for(const value of [NaN,Infinity,'1'])expect(api.headFocus('foxes',{...pose,[key]:value},0,false)).toBeNull();
    expect(api.headFocus('foxes',null,0,false)).toBeNull();
  });
});
