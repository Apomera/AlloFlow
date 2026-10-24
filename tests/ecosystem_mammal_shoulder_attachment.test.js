import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
import geometry from './helpers/ecosystem_attachment_geometry.cjs';
let api;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const pose={active:true,state:'Exploring',x:1,z:-.5,yaw:.4,altitude:.025,distance:0,phase:0,stride:1,moving:.3,forage:0,rest:0,crouch:0,pounce:0,activity:0};
const point=(positions,vertex)=>Array.from(positions.slice(vertex*3,vertex*3+3));
const distance=(a,b)=>Math.hypot(...a.map((value,k)=>value-b[k]));

describe('concealed torso attachments preserve calibrated mammal limb controls',()=>{
  it('buries every proximal cap triangle inside the actual transformed torso through stride feeding rest and flight',()=>{
    for(const id of ['foxes','rabbits']){
      const domain=geometry.rayDomain(api.mammalSurface(id,'torso'));
      for(const state of ['stride','feeding','rest','flight'])for(let sample=0;sample<24;sample++)for(const hind of [false,true])for(const side of [-1,1]){
        const p={...pose,distance:sample/24*Math.PI*2/28,activity:sample/5,moving:state==='rest'?0:state==='flight'?1.15:.3,stride:state==='rest'||state==='feeding'?0:1,rest:state==='rest'?1:0,forage:state==='feeding'?.9:0,pounce:state==='flight'&&id==='foxes'?.85:0};
        const matrix=geometry.torsoMatrix(api,id,p),inverse=geometry.inverse(matrix),joints=geometry.joints(api,id,p,0,hind,side),before=JSON.stringify(joints),positions=api.mammalLimbFit(id,hind,joints);
        expect(api.mammalLimbAttachment(id,hind,joints,matrix,positions,0,side)).toBe(positions);
        for(const capPoint of geometry.capSamples(positions))expect(domain(geometry.transform(inverse,capPoint))).toBeGreaterThan(.01);
        expect(JSON.stringify(joints)).toBe(before);expect(positions.every(Number.isFinite)).toBe(true);
      }
    }
  });
  it('retains exact elbow/hock distal rings paw cap and UV seam while the buried cap follows its torso socket',()=>{
    for(const id of ['foxes','rabbits'])for(const hind of [false,true])for(const side of [-1,1]){
      const joints=geometry.joints(api,id,pose,2,hind,side),original=api.mammalLimbFit(id,hind,joints),matrix=geometry.torsoMatrix(api,id,pose),positions=original.slice();
      api.mammalLimbAttachment(id,hind,joints,matrix,positions,0,side);
      expect(positions.slice(5*39,221*3)).toEqual(original.slice(5*39,221*3));expect(point(positions,222)).toEqual(joints.paw);
      expect(distance(point(positions,221),joints.hip)).toBeGreaterThan(.03);
      for(let ring=0;ring<=16;ring++)expect(distance(point(positions,ring*13),point(positions,ring*13+12))).toBeLessThan(1e-12);
      const centre=[0,0,0];for(let side=0;side<12;side++)point(positions,8*13+side).forEach((value,k)=>centre[k]+=value/12);expect(distance(centre,joints.knee)).toBeLessThan(1e-12);
      const mean=[0,0,0];for(let side=0;side<12;side++)point(positions,side).forEach((value,k)=>mean[k]+=value/12);expect(distance(mean,point(positions,221))).toBeLessThan(1e-12);
    }
  });
  it('uses the complete affine back and rib transform and rewinds without accumulating skin deformation',()=>{
    for(const id of ['foxes','rabbits']){
      const p={...pose,state:'Resting',rest:1,stride:0,moving:0},a=geometry.torsoMatrix(api,id,p),b=geometry.torsoMatrix(api,id,{...p,activity:.7}),joints=geometry.joints(api,id,p,0,false,-1),initial=api.mammalLimbFit(id,false,joints),first=initial.slice();
      api.mammalLimbAttachment(id,false,joints,a,first,0,-1);const later=initial.slice();api.mammalLimbAttachment(id,false,joints,b,later,0,-1);
      expect(point(later,221)).not.toEqual(point(first,221));expect(later.slice(5*39,221*3)).toEqual(first.slice(5*39,221*3));
      api.mammalLimbFit(id,false,joints,later);api.mammalLimbAttachment(id,false,joints,a,later,0,-1);expect(later).toEqual(first);
      const socket=id==='foxes'?[.255,.505,-.085]:[.13,.355,-.065];expect(distance(point(first,221),geometry.transform(a,socket))).toBeLessThan(1e-12);
    }
  });
  it('retains nondegenerate outward proximal faces through a full calibrated walking cycle',()=>{
    const dot=(positions,vertices)=>{
      const points=vertices.map(vertex=>point(positions,vertex)),u=points[1].map((value,k)=>value-points[0][k]),v=points[2].map((value,k)=>value-points[0][k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const mean=ring=>[0,1,2].map(axis=>Array.from({length:12},(_,side)=>positions[(ring*13+side)*3+axis]/12).reduce((sum,value)=>sum+value,0));
      if(vertices.includes(221)){const cap=point(positions,221),next=mean(1);return normal.reduce((sum,value,k)=>sum+value*(cap[k]-next[k]),0);}
      const centres=vertices.map(vertex=>mean(Math.floor(vertex/13))),radial=[0,1,2].map(axis=>(points[0][axis]+points[1][axis]+points[2][axis]-centres[0][axis]-centres[1][axis]-centres[2][axis])/3);
      return normal.reduce((sum,value,k)=>sum+value*radial[k],0);
    };
    for(const id of ['foxes','rabbits'])for(const hind of [false,true])for(const side of [-1,1])for(let sample=0;sample<16;sample++){
      const p={...pose,distance:sample/16*Math.PI*2/28},joints=geometry.joints(api,id,p,0,hind,side),base=api.mammalLimbFit(id,hind,joints),fitted=base.slice(),indices=api.mammalSurface(id,hind?'hindlimb':'forelimb').indices;
      api.mammalLimbAttachment(id,hind,joints,geometry.torsoMatrix(api,id,p),fitted,0,side);
      for(let face=0;face<indices.length;face+=3){const vertices=indices.slice(face,face+3);if(vertices.some(vertex=>vertex<5*13||vertex===221)&&dot(base,vertices)>1e-12)expect(dot(fitted,vertices)).toBeGreaterThan(1e-12);}
    }
  });
  it('writes only its bounded offset slice and rejects malformed data before any target mutation',()=>{
    const joints=geometry.joints(api,'rabbits',pose,0,true,1),base=api.mammalLimbFit('rabbits',true,joints),matrix=geometry.torsoMatrix(api,'rabbits',pose),target=new Float64Array(base.length+14).fill(123);target.set(base,7);
    expect(api.mammalLimbAttachment('rabbits',true,joints,matrix,target,7,1)).toBe(target);expect(Array.from(target.slice(0,7))).toEqual(Array(7).fill(123));expect(Array.from(target.slice(-7))).toEqual(Array(7).fill(123));
    const extreme=matrix.slice();extreme[0]=1e308;
    for(const args of [['voles',true,joints,matrix,base.slice(),0],['rabbits',false,{...joints,hip:[0,NaN,0]},matrix,base.slice(),0],['rabbits',true,joints,Array(16).fill(0),base.slice(),0],['rabbits',true,joints,matrix,base.slice(),-1],['rabbits',true,joints,matrix,base.slice(0,-1),0],['rabbits',true,{...joints,hip:'123'},matrix,base.slice(),0],['rabbits',true,{...joints,hip:{0:0,1:0,2:0,length:3}},matrix,base.slice(),0],['rabbits',true,{...joints,hip:[1e308,0,0]},matrix,base.slice(),0],['rabbits',true,joints,extreme,base.slice(),0],['rabbits',true,joints,matrix,new Uint8Array(base.length),0]]){const before=JSON.stringify(args[4]);expect(api.mammalLimbAttachment(...args,1)).toBeNull();expect(JSON.stringify(args[4])).toBe(before);}
    for(const invalidSide of [undefined,0,2,NaN,'-1']){const unchanged=base.slice();expect(api.mammalLimbAttachment('rabbits',true,joints,matrix,unchanged,0,invalidSide)).toBeNull();expect(unchanged).toEqual(base);}
    const typedJoints=Object.fromEntries(Object.entries(joints).map(([name,values])=>[name,new Float64Array(values)])),typed=Float32Array.from(base);expect(api.mammalLimbAttachment('rabbits',true,typedJoints,Float64Array.from(matrix),typed,0,1)).toBe(typed);expect(Array.from(typed).every(Number.isFinite)).toBe(true);
  });
  it('keeps the original anatomical socket continuous when calibrated hips cross the body midline',()=>{
    for(const id of ['foxes','rabbits'])for(const hind of [false,true])for(const side of [-1,1]){
      const matrix=geometry.torsoMatrix(api,id,pose),inverse=geometry.inverse(matrix);let prior=null;
      for(const hipZ of [-.01,-.001,0,.001,.01]){
        const joints=geometry.joints(api,id,pose,0,hind,side);joints.hip[2]=hipZ;const base=api.mammalLimbFit(id,hind,joints),fitted=base.slice();api.mammalLimbAttachment(id,hind,joints,matrix,fitted,0,side);
        const cap=point(fitted,221),raw=geometry.transform(inverse,cap);expect(Math.sign(raw[2])).toBe(side);if(prior)expect(distance(cap,prior)).toBeLessThan(1e-12);prior=cap;expect(fitted.slice(5*39,221*3)).toEqual(base.slice(5*39,221*3));
      }
    }
  });
});
