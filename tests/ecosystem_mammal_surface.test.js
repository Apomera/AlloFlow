import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const point=(array,index)=>array.slice(index*3,index*3+3);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

describe('continuous mammal coat geometry',()=>{
  it('builds finite indexed skins with unit outward normals and matching UV seam vertices',()=>{
    for(const [id,part] of [['foxes','torso'],['rabbits','torso'],['foxes','tail'],['foxes','neck'],['rabbits','neck']]){
      const skin=api.mammalSurface(id,part),count=skin.positions.length/3;
      expect(skin.normals.length).toBe(count*3);expect(skin.uv.length).toBe(count*2);expect(skin.tints.length).toBe(count);
      for(const field of ['positions','normals','uv','tints'])expect(skin[field].every(Number.isFinite)).toBe(true);
      expect(skin.indices.every(v=>Number.isInteger(v)&&v>=0&&v<count)).toBe(true);
      expect(skin.tints.every(v=>v>=0&&v<=1)).toBe(true);
      for(let i=0;i<count;i++)expect(Math.hypot(...point(skin.normals,i))).toBeCloseTo(1,10);
      for(let ring=0;ring<=skin.rings;ring++){
        const a=ring*(skin.sides+1),b=a+skin.sides;
        expect(distance(point(skin.positions,a),point(skin.positions,b))).toBeLessThan(1e-12);
        expect(distance(point(skin.normals,a),point(skin.normals,b))).toBeLessThan(1e-12);
      }
      // Away from the two pole rings, every face points along the analytic
      // outward normal. This catches a closed shape accidentally wound inward.
      let validFaces=0;
      for(let f=0;f<skin.indices.length;f+=3){
        const [a,b,c]=skin.indices.slice(f,f+3),p=point(skin.positions,a),q=point(skin.positions,b),r=point(skin.positions,c);
        const u=q.map((v,i)=>v-p[i]),v=r.map((n,i)=>n-p[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        if(Math.hypot(...cross)<1e-12)continue;
        const normal=point(skin.normals,a).map((n,i)=>n+skin.normals[b*3+i]+skin.normals[c*3+i]);
        expect(cross.reduce((sum,n,i)=>sum+n*normal[i],0)).toBeGreaterThan(0);validFaces++;
      }
      expect(validFaces).toBeGreaterThan(1000);
    }
  });

  it('distinguishes tapered fox and high-haunched rabbit silhouettes without separate torso spheres',()=>{
    const fox=api.mammalSurface('foxes','torso'),rabbit=api.mammalSurface('rabbits','torso');
    const extent=skin=>({x:Math.max(...skin.positions.filter((_,i)=>i%3===0))-Math.min(...skin.positions.filter((_,i)=>i%3===0)),y:Math.max(...skin.positions.filter((_,i)=>i%3===1))-Math.min(...skin.positions.filter((_,i)=>i%3===1))});
    expect(extent(fox).x/extent(fox).y).toBeGreaterThan(extent(rabbit).x/extent(rabbit).y);
    const highest=skin=>{let index=1;for(let i=4;i<skin.positions.length;i+=3)if(skin.positions[i]>skin.positions[index])index=i;return skin.positions[index-1];};
    expect(highest(rabbit)).toBeLessThan(-.05);
    const undersideAt=x=>{let ring=0,delta=Infinity;for(let i=0;i<=fox.rings;i++){const d=Math.abs(fox.positions[i*(fox.sides+1)*3]-x);if(d<delta){delta=d;ring=i;}}return fox.positions[(ring*(fox.sides+1)+fox.sides/2)*3+1];};
    expect(undersideAt(.20)).toBeLessThan(undersideAt(-.12)-.07);
    expect(api.mammalSurface('owls','torso')).toBeNull();expect(api.mammalSurface('rabbits','tail')).toEqual(api.rabbitTailSurface());
    expect(api.mammalSurface('foxes','torso')).toEqual(fox);
  });

  it('bends one continuous brush with a fixed root, continuous tangents and a curled distal tip',()=>{
    const skin=api.mammalSurface('foxes','tail'),before=JSON.stringify(skin),curl=.65,trim=-.106;
    const base=api.mammalTailPoint(0,0,.068,curl,trim);expect(distance(base,[0,0,.068])).toBeLessThan(1e-12);
    const tip=api.mammalTailPoint(-.85,-.13,0,curl,trim);expect(Math.abs(tip[2])).toBeGreaterThan(.2);
    for(const boundary of [-.18,-.63]){
      const e=1e-5,left=api.mammalTailPoint(boundary-e,-.03,.04,curl,trim),at=api.mammalTailPoint(boundary,-.03,.04,curl,trim),right=api.mammalTailPoint(boundary+e,-.03,.04,curl,trim);
      const dl=at.map((n,i)=>(n-left[i])/e),dr=right.map((n,i)=>(n-at[i])/e);expect(distance(dl,dr)).toBeLessThan(.0002);
    }
    for(let i=0;i<skin.positions.length;i+=3){const p=skin.positions.slice(i,i+3);expect(api.mammalTailPoint(...p,curl,trim).every(Number.isFinite)).toBe(true);expect(distance(api.mammalTailPoint(...p,0,0),p)).toBeLessThan(1e-12);}
    expect(JSON.stringify(skin)).toBe(before);
  });

  it('brings a full grazing muzzle to the grass without changing recorded paw targets',()=>{
    const pose={active:true,state:'Grazing',forage:.75,distance:.7,phase:1,stride:0,moving:0,pounce:0,rest:0,crouch:0,x:0,z:0,yaw:0,altitude:.025};
    const art=api.mammalArticulation('rabbits',pose,false),upright=api.mammalArticulation('rabbits',{...pose,forage:0},false),size=.86*.94;
    // Named rabbit nose centre (.455,.395) relative to head root (.24,.4).
    const noseY=.4-art.headDrop+.215*Math.sin(art.headPitch)-.005*Math.cos(art.headPitch);
    const soleGap=pose.altitude+size*(noseY-.02);
    expect(soleGap).toBeGreaterThan(0);expect(soleGap).toBeLessThan(.035);expect(art.headPitch).toBeLessThan(upright.headPitch-.9);
    expect(art.headPitch+art.earTilt).toBeGreaterThan(-.5);expect(art.headPitch+art.earTilt).toBeLessThan(0);
    for(const hind of [true,false])for(const side of [-1,1])expect(api.rabbitFooting(pose,0,hind,side)).toEqual(api.rabbitFooting({...pose,forage:0},0,hind,side));
  });
});
