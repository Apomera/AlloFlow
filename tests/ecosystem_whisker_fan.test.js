import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool(process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const xyz=(array,k)=>Array.from(array.slice(k*3,k*3+3));
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const feed=(patch={})=>({active:true,state:'Grazing',activity:Math.PI/24,phase:0,distance:0,moving:0,stride:0,forage:.75,rest:0,pounce:0,altitude:.025,headRaise:0,neighborLook:0,...patch});

describe('varied species whisker fans and recorded chewing response',()=>{
  it('keeps the six original roots while giving each strand a distinct outward profile',()=>{
    for(const id of ['foxes','rabbits']){
      const fox=id==='foxes',profile=api.mammalWhiskerProfile(id),raw=api.mammalWhiskers(id,null,true);
      expect(raw).toMatchObject({segments:8,strands:6,fan:0,chewing:{left:0,right:0}});expect(raw.positions).toHaveLength(288);
      expect(new Set(profile.tips.map(point=>Math.hypot(...point).toFixed(8))).size).toBe(3);
      expect(new Set(profile.tips.map(point=>point[0])).size).toBe(3);expect(new Set(profile.tips.map(point=>point[2])).size).toBe(3);
      raw.roots.forEach((vertex,strand)=>{
        const slot=strand%3,side=strand<3?-1:1,root=[(fox?.602:.426)-.24,(fox?.600:.391)+(slot-1)*.013-(fox?.58:.4),side*(fox?.051:.043)],tip=profile.tips[slot],control=profile.control[slot];
        expect(xyz(raw.positions,vertex)).toEqual(root);expect(raw.rootPositions[strand]).toEqual(root);
        expect(distance(xyz(raw.positions,vertex+15),root.map((v,k)=>v+tip[k]*(k===2?side:1)))).toBeLessThan(1e-15);
        expect(distance(xyz(raw.positions,vertex+7),root.map((v,k)=>v+(.5*control[k]+.25*tip[k])*(k===2?side:1)))).toBeLessThan(1e-15);
        let previous=0;for(let k=0;k<16;k++){const p=xyz(raw.positions,vertex+k),outward=side*(p[2]-root[2]);expect(outward).toBeGreaterThanOrEqual(previous-1e-15);expect(p[0]).toBeLessThanOrEqual(root[0]);previous=outward;}
        for(let k=0;k<7;k++)expect(xyz(raw.positions,vertex+k*2+1)).toEqual(xyz(raw.positions,vertex+k*2+2));
      });
    }
    expect(api.mammalWhiskerProfile('foxes')).not.toEqual(api.mammalWhiskerProfile('rabbits'));
    expect(api.mammalWhiskerProfile('owls')).toBeNull();
  });

  it('uses opposing phases of the existing lateral jaw clock with bounded distal-only asymmetry',()=>{
    const a=feed(),b=feed({activity:Math.PI/8}),pa=api.mammalWhiskerPose('rabbits',a,false),pb=api.mammalWhiskerPose('rabbits',b,false);
    expect(api.mammalArticulation('rabbits',a,false).jawSide).toBeGreaterThan(.0219);expect(api.mammalArticulation('rabbits',b,false).jawSide).toBeLessThan(-.0219);
    expect(pa).toEqual({left:0,right:.028});expect(pb).toEqual({left:.028,right:0});
    const neutral=api.mammalWhiskers('rabbits',null,true);
    for(const p of [a,b]){
      const moving=api.mammalWhiskers('rabbits',p,false),symmetric=api.mammalWhiskers('rabbits',{...p,headRaise:1},false);let maximum=0;
      moving.roots.forEach((vertex,strand)=>{expect(xyz(moving.positions,vertex)).toEqual(neutral.rootPositions[strand]);for(let k=0;k<16;k++)maximum=Math.max(maximum,distance(xyz(moving.positions,vertex+k),xyz(neutral.positions,vertex+k)));});
      expect(maximum).toBeGreaterThan(.004);expect(maximum).toBeLessThan(.019);expect(moving.positions).not.toEqual(symmetric.positions);
      for(let strand=0;strand<3;strand++){const left=xyz(moving.positions,moving.roots[strand]+15),right=xyz(moving.positions,moving.roots[strand+3]+15);expect(Math.abs(left[2]+right[2])).toBeGreaterThan(.001);}
    }
  });

  it('suppresses chewing for reduced motion, inactivity, other states, raised attention and flight',()=>{
    for(const patch of [{active:false},{state:'Alert'},{state:'Resting'},{forage:0},{rest:.5},{pounce:.01},{altitude:.03},{headRaise:1},{neighborLook:1},{activity:NaN},{activity:-1},{stride:1}])expect(api.mammalWhiskerPose('rabbits',feed(patch),false)).toEqual({left:0,right:0});
    for(const id of ['foxes','rabbits','owls',undefined])expect(api.mammalWhiskerPose(id,feed(),true)).toEqual({left:0,right:0});
    expect(api.mammalWhiskerPose('foxes',feed(),false)).toEqual({left:0,right:0});
    expect(api.mammalWhiskers('rabbits',feed(),true)).toEqual(api.mammalWhiskers('rabbits',feed({activity:100}),true));
  });

  it('is continuous at chew reversals, reuses private bounded Float32 buffers and exactly rewinds',()=>{
    const p=feed(),before=JSON.stringify(p),original=api.mammalWhiskerProfile('rabbits');original.tips[0][0]=999;expect(api.mammalWhiskerProfile('rabbits').tips[0][0]).toBe(-.084);
    const target=new Float32Array(295).fill(17),other=new Float32Array(288),first=api.mammalWhiskers('rabbits',p,false),saved=first.positions.slice();
    expect(api.mammalWhiskers('rabbits',p,false,target).positions).toBe(target);api.mammalWhiskers('rabbits',feed({activity:.9}),false,other);api.mammalWhiskers('rabbits',feed({activity:2}),false,target);api.mammalWhiskers('rabbits',p,false,target);
    expect(Array.from(target.slice(288))).toEqual(Array(7).fill(17));expect(Array.from(target.slice(0,288))).toEqual(saved.map(Math.fround));expect(first.positions).toEqual(saved);expect(JSON.stringify(p)).toBe(before);
    let maximum=0;for(let k=0;k<=120;k++){const activity=k/120,now=api.mammalWhiskers('rabbits',feed({activity}),false),next=api.mammalWhiskers('rabbits',feed({activity:activity+1e-5}),false);for(let j=0;j<96;j++)maximum=Math.max(maximum,distance(xyz(now.positions,j),xyz(next.positions,j)));}
    expect(maximum).toBeLessThan(.00002);
  });

  it('finds both chewing phases in real recorded grazing without changing any original pose, articulation or paw result',()=>{
    const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),before=JSON.stringify({pair,frames}),encounters=JSON.stringify(api.encounters(frames,config));let left=0,right=0;
    for(let step=0;step<frames.length;step++)for(const id of ['foxes','rabbits'])for(let index=0;index<16;index++){
      const pose=frames[step][id][index],art=api.mammalArticulation(id,pose,false),detail=api.mammalWhiskerPose(id,pose,false);if(detail.left>.02)left++;if(detail.right>.02)right++;
      if(step%19===0){const feet=[-1,1].flatMap(side=>[false,true].map(hind=>id==='foxes'?api.foxFooting(pose,index,hind,side):api.rabbitFooting(pose,index,hind,side)));api.mammalWhiskers(id,pose,false);expect(api.mammalArticulation(id,pose,false)).toEqual(art);expect([-1,1].flatMap(side=>[false,true].map(hind=>id==='foxes'?api.foxFooting(pose,index,hind,side):api.rabbitFooting(pose,index,hind,side)))).toEqual(feet);}
    }
    expect(left).toBeGreaterThan(5);expect(right).toBeGreaterThan(5);expect(JSON.stringify({pair,frames})).toBe(before);expect(JSON.stringify(api.encounters(frames,config))).toBe(encounters);expect(api.compare(config)).toEqual(pair);expect(api.behaviorTimeline(config,pair.baseline)).toEqual(frames);
  });
});
