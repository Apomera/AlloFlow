import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const pose={active:true,state:'Exploring',x:1,z:-.5,yaw:.4,altitude:.025,distance:0,phase:0,stride:1,moving:.3,forage:0,rest:0,crouch:0,pounce:0,activity:0};
const xyz=(array,index)=>Array.from(array.slice(index*3,index*3+3));
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
function foxJoints(p,hind,side){
  const contact=api.foxFooting(p,0,hind,side),foot=api.footPose('foxes',p,hind,side),j=api.foxLegPose(p,hind,side,contact),sy=1-.12*Math.max(p.crouch||0,(p.rest||0)*.65),ca=Math.cos(foot.angle),sa=Math.sin(foot.angle);
  const point=(x,y)=>[(hind?-.33:.29)+ca*x-sa*sy*y,.4+foot.height+sa*x+ca*sy*y,side*.16+contact.z];
  const kx=j.hipX+.21*Math.sin(j.upper),ky=j.hipY-.21*Math.cos(j.upper);
  return {hip:point(j.hipX,j.hipY),knee:point(kx,ky),paw:point(kx+.20*Math.sin(j.lower),ky-.20*Math.cos(j.lower))};
}

describe('connected calibrated mammal limb skins',()=>{
  it('uses bounded closed tapered skins with outward unit normals and no circumference lighting seam',()=>{
    for(const id of ['foxes','rabbits'])for(const part of ['forelimb','hindlimb']){
      const skin=api.mammalSurface(id,part),count=skin.positions.length/3;
      expect(count).toBe(223);expect(skin.indices.length/3).toBe(408);expect(count*4).toBeLessThan(1000);expect(skin.indices.length/3*4).toBeLessThan(1700);
      for(const name of ['positions','normals','uv','tints'])expect(skin[name].every(Number.isFinite)).toBe(true);
      expect(skin.indices.every(n=>Number.isInteger(n)&&n>=0&&n<count)).toBe(true);
      for(let vertex=0;vertex<count;vertex++)expect(Math.hypot(...xyz(skin.normals,vertex))).toBeCloseTo(1,9);
      for(let ring=0;ring<=16;ring++){
        expect(distance(xyz(skin.positions,ring*13),xyz(skin.positions,ring*13+12))).toBeLessThan(1e-12);
        expect(distance(xyz(skin.normals,ring*13),xyz(skin.normals,ring*13+12))).toBeLessThan(1e-12);
      }
      for(let f=0;f<skin.indices.length;f+=3){
        const [a,b,c]=skin.indices.slice(f,f+3),p=xyz(skin.positions,a),q=xyz(skin.positions,b),r=xyz(skin.positions,c),u=q.map((n,i)=>n-p[i]),v=r.map((n,i)=>n-p[i]);
        const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],normal=xyz(skin.normals,a).map((n,i)=>n+skin.normals[b*3+i]+skin.normals[c*3+i]);
        expect(cross.reduce((sum,n,i)=>sum+n*normal[i],0)).toBeGreaterThan(0);
      }
      const proximal=Array.from({length:12},(_,side)=>xyz(skin.positions,side)),distal=Array.from({length:12},(_,side)=>xyz(skin.positions,16*13+side));
      expect(Math.max(...proximal.map(p=>Math.hypot(p[0],p[2])))).toBeGreaterThan(Math.max(...distal.map(p=>Math.hypot(p[0],p[2])))*1.8);
    }
  });

  it('keeps every actual hip, knee and paw at the same skin centre through strides, settling and airborne bounds',()=>{
    for(const id of ['foxes','rabbits'])for(const hind of [false,true])for(const side of [-1,1])for(const state of ['walk','rest','flight'])for(let sample=0;sample<=24;sample++){
      const p={...pose,distance:sample/24*Math.PI*2/28,moving:id==='rabbits'&&state==='flight'?1.15:.3,stride:state==='rest'?0:1,rest:state==='rest'?1:0,pounce:id==='foxes'&&state==='flight'?.85:0};
      const joints=id==='foxes'?foxJoints(p,hind,side):api.rabbitLegPose(p,0,hind,side),before=JSON.stringify(joints),skin=api.mammalLimbFit(id,hind,joints);
      for(const [ring,target] of [[0,joints.hip],[8,joints.knee],[16,joints.paw]]){
        const mean=[0,0,0];for(let side=0;side<12;side++)xyz(skin,ring*13+side).forEach((n,i)=>mean[i]+=n/12);
        expect(distance(mean,target)).toBeLessThan(1e-12);
      }
      expect(xyz(skin,221)).toEqual(joints.hip);expect(xyz(skin,222)).toEqual(joints.paw);expect(skin.every(Number.isFinite)).toBe(true);expect(JSON.stringify(joints)).toBe(before);
    }
  });

  it('writes directly into a bounded reusable geometry buffer and reconstructs the same recorded skin after rewind',()=>{
    const joints=api.rabbitLegPose({...pose,moving:1.15,distance:.12},3,true,-1),expected=api.mammalLimbFit('rabbits',true,joints),target=new Float64Array(expected.length+14).fill(123);
    expect(api.mammalLimbFit('rabbits',true,joints,target,7)).toBe(target);expect(Array.from(target.slice(7,-7))).toEqual(expected);expect(Array.from(target.slice(0,7))).toEqual(Array(7).fill(123));expect(Array.from(target.slice(-7))).toEqual(Array(7).fill(123));
    api.mammalLimbFit('rabbits',true,api.rabbitLegPose({...pose,distance:.2},3,true,-1),target,7);api.mammalLimbFit('rabbits',true,joints,target,7);expect(Array.from(target.slice(7,-7))).toEqual(expected);
  });

  it('breathes and settles only torso skin while support timing, bone joints and calibrated terrain contacts stay fixed',()=>{
    for(const id of ['foxes','rabbits']){
      const resting={...pose,state:'Resting',stride:0,moving:0,rest:1,phase:0},initial=api.mammalArticulation(id,resting,false),values=[];
      expect(initial.ribScaleY).toBeCloseTo(.965,12);expect(initial.ribScaleZ).toBeCloseTo(1.025,12);expect(initial.ribRoll).toBeCloseTo(0,12);
      for(let step=0;step<=60;step++){
        const p={...resting,activity:step*.1},art=api.mammalArticulation(id,p,false);values.push(art.ribScaleY);
        expect(art.supportFeet).toBe(4);expect(art.ribScaleY).toBeGreaterThan(.95);expect(art.ribScaleY).toBeLessThan(.98);expect(art.ribScaleZ).toBeGreaterThan(1.015);expect(art.ribScaleZ).toBeLessThan(1.035);
        for(const hind of [false,true])for(const side of [-1,1]){
          if(id==='foxes'){expect(api.foxFooting(p,0,hind,side)).toEqual(api.foxFooting(resting,0,hind,side));expect(foxJoints(p,hind,side)).toEqual(foxJoints(resting,hind,side));}
          else{expect(api.rabbitFooting(p,0,hind,side)).toEqual(api.rabbitFooting(resting,0,hind,side));expect(api.rabbitLegPose(p,0,hind,side)).toEqual(api.rabbitLegPose(resting,0,hind,side));}
        }
      }
      expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(.025);
      const reduced=api.mammalArticulation(id,{...resting,activity:4},true);expect(reduced.ribScaleY).toBe(1);expect(reduced.ribScaleZ).toBe(1);expect(reduced.ribRoll).toBe(0);
    }
    let maximum=0;for(let step=0;step<100;step++){const p={...pose,distance:step/100*Math.PI*2/28},art=api.mammalArticulation('foxes',p,false),left=api.footPose('foxes',p,false,-1),right=api.footPose('foxes',p,false,1);expect(art.ribRoll).toBeCloseTo((left.lift-right.lift)*.28,12);maximum=Math.max(maximum,Math.abs(art.ribRoll));}
    expect(maximum).toBeGreaterThan(.015);expect(maximum).toBeLessThan(.020);
  });
});
