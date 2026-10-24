import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const point=(array,index)=>array.slice(index*3,index*3+3);
const distance=(a,b)=>Math.hypot(...a.map((n,j)=>n-b[j]));
const dot=(a,b)=>a.reduce((sum,n,j)=>sum+n*b[j],0);
const variants=[['foxes',false],['foxes',true],['rabbits',false],['rabbits',true]];

describe('continuous upper paw fur and preserved sole envelope',()=>{
  it('builds closed finite outward surfaces with welded seam normals and no degenerate triangles',()=>{
    for(const [id,hind] of variants){
      const skin=api.mammalPawSurface(id,hind),count=skin.positions.length/3;
      expect(count).toBe(1225);expect(skin.indices.length/3).toBe(2208);
      expect(skin.normals.length).toBe(count*3);expect(skin.uv.length).toBe(count*2);
      for(const name of ['positions','normals','uv'])expect(skin[name].every(Number.isFinite)).toBe(true);
      expect(skin.indices.every(index=>Number.isInteger(index)&&index>=0&&index<count)).toBe(true);
      let maximumNormalError=0,minimumFaceArea=Infinity,minimumFacing=Infinity;
      for(let vertex=0;vertex<count;vertex++)maximumNormalError=Math.max(maximumNormalError,Math.abs(Math.hypot(...point(skin.normals,vertex))-1));
      expect(maximumNormalError).toBeLessThan(1e-10);
      for(let ring=0;ring<=skin.rings;ring++){
        const a=ring*(skin.sides+1),b=a+skin.sides;
        expect(point(skin.positions,a)).toEqual(point(skin.positions,b));expect(point(skin.normals,a)).toEqual(point(skin.normals,b));
      }
      for(let offset=0;offset<skin.indices.length;offset+=3){
        const [a,b,c]=skin.indices.slice(offset,offset+3),p=point(skin.positions,a),q=point(skin.positions,b),r=point(skin.positions,c);
        const u=q.map((n,j)=>n-p[j]),v=r.map((n,j)=>n-p[j]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        minimumFaceArea=Math.min(minimumFaceArea,Math.hypot(...normal));
        const average=point(skin.normals,a).map((n,j)=>n+skin.normals[b*3+j]+skin.normals[c*3+j]);
        minimumFacing=Math.min(minimumFacing,dot(normal,average));
      }
      expect(minimumFaceArea).toBeGreaterThan(1e-8);expect(minimumFacing).toBeGreaterThan(0);
    }
  });

  it('leaves the entire lower hemisphere and equator on the original unit sphere while only insetting upper fur',()=>{
    for(const [id,hind] of variants){
      const skin=api.mammalPawSurface(id,hind);
      for(let ring=0;ring<=skin.rings;ring++)for(let side=0;side<=skin.sides;side++){
        const index=ring*(skin.sides+1)+side,p=point(skin.positions,index),phi=ring/skin.rings*Math.PI,theta=(side===skin.sides?0:side/skin.sides*Math.PI*2),raw=[Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta)];
        expect(Math.hypot(...p)).toBeLessThanOrEqual(1+1e-12);
        if(ring>=skin.rings/2){expect(distance(p,raw)).toBeLessThan(1e-12);expect(distance(point(skin.normals,index),raw)).toBeLessThan(1e-12);}
        else for(let axis=0;axis<3;axis++)expect(Math.abs(p[axis])).toBeLessThanOrEqual(Math.abs(raw[axis])+1e-12);
      }
      const extents=[0,1,2].map(axis=>skin.positions.filter((_,index)=>index%3===axis));
      for(const axis of extents){expect(Math.min(...axis)).toBeCloseTo(-1,12);expect(Math.max(...axis)).toBeCloseTo(1,12);}
    }
  });

  it('forms visible upper toe channels, a lower forward crown and distinct narrowed heel envelopes',()=>{
    for(const [id,hind] of variants){
      const skin=api.mammalPawSurface(id,hind),at=(ring,side)=>point(skin.positions,ring*(skin.sides+1)+side);
      const groove=at(8,0),lobe=at(8,2),heel=at(8,20),rawHeel=[-.75,.5,Math.sqrt(3)/4];
      expect(lobe[1]-groove[1]).toBeGreaterThan(.055);expect(lobe[0]-groove[0]).toBeGreaterThan(.06);
      expect(lobe[1]).toBeLessThan(.42);expect(heel[2]).toBeLessThan(rawHeel[2]-.08);
      expect(at(0,0)).toEqual([0,1,0]);
    }
    const fox=api.mammalPawSurface('foxes',false),rabbit=api.mammalPawSurface('rabbits',false),hind=api.mammalPawSurface('rabbits',true),heelIndex=8*49+20;
    expect(point(rabbit.positions,heelIndex)[2]).toBeLessThan(point(fox.positions,heelIndex)[2]-.02);
    expect(point(hind.positions,heelIndex)[2]).toBeLessThan(point(rabbit.positions,heelIndex)[2]-.02);
  });

  it('preserves ellipsoid support in all admissible downward directions within the finite mesh tolerance',()=>{
    let worstGap=0;
    for(const [id,hind] of variants){
      const skin=api.mammalPawSurface(id,hind),scale=id==='foxes'?[.078,.042,.052]:hind?[.175,.05,.075]:[.12,.045,.07];
      // Include roll as well as the renderer's usual pitched sole directions.
      for(let pitch=-1.4;pitch<=1.4;pitch+=.1)for(const roll of [-.5,0,.5]){
        const row=[Math.sin(pitch)*Math.cos(roll)*scale[0],Math.cos(pitch)*Math.cos(roll)*scale[1],Math.sin(roll)*scale[2]],radius=Math.hypot(...row);
        expect(row[1]).toBeGreaterThan(0);
        let minimum=Infinity;
        for(let index=0;index<skin.positions.length/3;index++)minimum=Math.min(minimum,dot(row,point(skin.positions,index)));
        const gap=minimum+radius;
        expect(gap).toBeGreaterThanOrEqual(-1e-12);worstGap=Math.max(worstGap,gap);
      }
    }
    expect(worstGap).toBeLessThan(.0007);
  });

  it('keeps local sole up positive for recorded resting, gait, flight and pounce transforms without altering their evidence',()=>{
    const config={event:'restoreCover',eventStep:80,cover:10,initial:{rabbits:90,foxes:6}},runs=api.compare(config),before=JSON.stringify(runs);
    let measured=0,minimumUp=Infinity,states=new Set();
    for(const branch of ['baseline','experiment']){
      const frames=api.behaviorTimeline(config,runs[branch]),frameEvidence=JSON.stringify(frames);
      for(const frame of frames)for(const id of ['foxes','rabbits'])for(let index=0;index<frame[id].length;index++){
        const p=frame[id][index];if(!p.active)continue;states.add(p.state);
        for(const hind of [false,true])for(const side of [-1,1]){
          const foot=api.footPose(id,p,hind,side),fox=id==='foxes',contact=fox?api.foxFooting(p,index,hind,side,api.groundHeight):api.rabbitFooting(p,index,hind,side,api.groundHeight);
          const compression=Math.max(p.crouch||0,(p.rest||0)*.65),sy=fox?1-.12*compression:1,a=foot.angle-(fox?(p.pounce||0)*.12:0),rig=fox?api.foxLegPose(p,hind,side,contact):null,beta=fox?rig.lower+rig.pawPitch:contact.pawRotation;
          const yy=-Math.sin(a)*Math.sin(beta)+Math.cos(a)*sy*Math.cos(beta);
          minimumUp=Math.min(minimumUp,yy);measured++;
        }
      }
      expect(JSON.stringify(frames)).toBe(frameEvidence);
    }
    expect(measured).toBeGreaterThan(10000);expect(minimumUp).toBeGreaterThan(.5);expect(states.has('Retreating')).toBe(true);expect(states.has('Pouncing')).toBe(true);
    expect(JSON.stringify(runs)).toBe(before);
    expect(api.mammalPawSurface('foxes',false)).toEqual(api.mammalPawSurface('foxes',false));expect(api.mammalPawSurface('owls',false)).toBeNull();
  });
});
