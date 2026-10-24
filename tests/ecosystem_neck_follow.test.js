// Copy to tests/ecosystem_neck_follow.test.js before running the integrated suite.
import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const xyz=(array,index)=>Array.from(array.slice(index*3,index*3+3));
const gap=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const neckHome=id=>id==='foxes'?[.265,.51,0]:[.178,.365,0];
const headHome=id=>[.24,id==='foxes'?.58:.4,0];
// THREE's default XYZ Euler order, independently assembled in column-major form.
function headMatrix(id,roll=0,yaw=0,pitch=0,reach=0,drop=0){
  const a=Math.cos(roll),b=Math.sin(roll),c=Math.cos(yaw),d=Math.sin(yaw),e=Math.cos(pitch),f=Math.sin(pitch),home=headHome(id);
  return [c*e,a*f+b*e*d,b*f-a*e*d,0,-c*f,a*e-b*f*d,b*e+a*f*d,0,d,-b*c,a*c,0,home[0]+reach,home[1]-drop,home[2],1];
}
const headTarget=(id,p,m)=>{const h=headHome(id),q=p.map((n,i)=>n-h[i]);return [m[0]*q[0]+m[4]*q[1]+m[8]*q[2]+m[12],m[1]*q[0]+m[5]*q[1]+m[9]*q[2]+m[13],m[2]*q[0]+m[6]*q[1]+m[10]*q[2]+m[14]];};

describe('neck skin follows the actual skull while its shoulder stays attached',()=>{
  it('reconstructs the unchanged neutral neck exactly for both species',()=>{
    for(const id of ['foxes','rabbits']){
      const source=api.mammalSurface(id,'neck').positions,home=neckHome(id),fit=api.neckFit(id,headMatrix(id));
      expect(fit.length).toBe(source.length);expect(fit.length/3).toBe(825);
      for(let vertex=0;vertex<fit.length/3;vertex++)expect(gap(xyz(fit,vertex),xyz(source,vertex).map((n,i)=>n-home[i]))).toBeLessThan(1e-12);
      const pose={active:true,state:'Grazing',distance:1,phase:.5,stride:0,moving:0,forage:.75,rest:0,crouch:0,pounce:0,headTurn:.48,activity:9};
      const reduced=api.mammalArticulation(id,pose,true),matrix=headMatrix(id,reduced.headRoll,reduced.headYaw,reduced.headPitch,reduced.headReach,reduced.headDrop);
      expect(api.neckFit(id,matrix)).toEqual(fit);
    }
  });

  it('fixes the shoulder vertices and rigidly attaches skull vertices through combined yaw, pitch, roll and head shifts',()=>{
    for(const id of ['foxes','rabbits'])for(const yaw of [-.48,0,.48])for(const pitch of [0,-.40,-.93]){
      const source=api.mammalSurface(id,'neck').positions,before=JSON.stringify(source),matrix=headMatrix(id,.08,yaw,pitch,.035,.20),matrixBefore=[...matrix],fit=api.neckFit(id,matrix,source),home=neckHome(id),anchor=id==='foxes'?.18:.11,attach=id==='foxes'?.34:.23;
      let shoulder=0,skull=0,lateralMotion=0;
      for(let vertex=0;vertex<source.length/3;vertex++){
        const rest=xyz(source,vertex),actual=xyz(fit,vertex).map((n,i)=>n+home[i]);
        if(rest[0]<=anchor){expect(gap(actual,rest)).toBeLessThan(1e-12);shoulder++;}
        if(rest[0]>=attach){expect(gap(actual,headTarget(id,rest,matrix))).toBeLessThan(1e-12);lateralMotion=Math.max(lateralMotion,Math.abs(actual[2]-rest[2]));skull++;}
      }
      expect(shoulder).toBeGreaterThan(25);expect(skull).toBeGreaterThan(25);if(yaw!==0)expect(lateralMotion).toBeGreaterThan(id==='foxes'?.025:.004);
      expect(fit.every(Number.isFinite)).toBe(true);expect(JSON.stringify(source)).toBe(before);expect(matrix).toEqual(matrixBefore);
    }
  });

  it('keeps intermediate skin within its two attachment transforms with smooth transition boundaries and a closed circumference',()=>{
    for(const id of ['foxes','rabbits']){
      const matrix=headMatrix(id,-.08,.42,-.93,.035,.20),source=api.mammalSurface(id,'neck').positions,fit=api.neckFit(id,matrix,source),home=neckHome(id),anchor=id==='foxes'?.18:.11,attach=id==='foxes'?.34:.23;
      for(let vertex=0;vertex<source.length/3;vertex++){
        const rest=xyz(source,vertex),moved=headTarget(id,rest,matrix),actual=xyz(fit,vertex).map((n,i)=>n+home[i]);
        for(let axis=0;axis<3;axis++){expect(actual[axis]).toBeGreaterThanOrEqual(Math.min(rest[axis],moved[axis])-1e-12);expect(actual[axis]).toBeLessThanOrEqual(Math.max(rest[axis],moved[axis])+1e-12);}
      }
      for(let ring=0;ring<=32;ring++)expect(gap(xyz(fit,ring*25),xyz(fit,ring*25+24))).toBeLessThan(1e-12);
      for(const boundary of [anchor,attach]){
        const e=1e-6,point=x=>api.neckFit(id,matrix,[x,.55,.065]),left=point(boundary-e),at=point(boundary),right=point(boundary+e);
        const before=at.map((n,i)=>(n-left[i])/e),after=right.map((n,i)=>(n-at[i])/e);
        expect(gap(before,after)).toBeLessThan(.001);
      }
    }
  });

  it('reuses a bounded vertex buffer and rewinds exactly without changing any limb calibration',()=>{
    const pose={active:true,state:'Grazing',x:1,z:-.5,yaw:.4,altitude:.025,distance:.2,phase:.7,stride:0,moving:0,forage:.75,rest:0,crouch:0,pounce:0,headTurn:.42,activity:4};
    for(const id of ['foxes','rabbits']){
      const source=api.mammalSurface(id,'neck').positions,matrix=headMatrix(id,.07,.42,-.93,.035,.20),expected=api.neckFit(id,matrix,source),target=new Float64Array(expected.length),before=JSON.stringify(pose),contacts=[];
      for(const hind of [false,true])for(const side of [-1,1])contacts.push(id==='foxes'?api.foxFooting(pose,0,hind,side):api.rabbitFooting(pose,0,hind,side));
      expect(api.neckFit(id,matrix,source,target)).toBe(target);expect(Array.from(target)).toEqual(expected);
      api.neckFit(id,headMatrix(id,.02,-.3,-.2,.01,.04),source,target);api.neckFit(id,matrix,source,target);expect(Array.from(target)).toEqual(expected);
      const after=[];for(const hind of [false,true])for(const side of [-1,1])after.push(id==='foxes'?api.foxFooting(pose,0,hind,side):api.rabbitFooting(pose,0,hind,side));
      expect(after).toEqual(contacts);expect(JSON.stringify(pose)).toBe(before);expect(api.neckFit(id,matrix,source,new Float32Array(3))).toBeNull();
    }
    expect(api.neckFit('plants',headMatrix('foxes'))).toBeNull();expect(api.neckFit('foxes',Array(16).fill(NaN))).toBeNull();
  });
});
