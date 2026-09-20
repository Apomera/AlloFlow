import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
function worldFoot(id,p,index,hind,side){
  const fox=id==='foxes',foot=api.footPose(id,p,hind,side),contact=fox?api.foxFooting(p,index,hind,side):api.rabbitFooting(p,index,hind,side);
  const posture=api.mammalPosture(id,p),size=(fox?1:.86)*(.94+(index%5)*.028),sy=fox?1-.12*posture.compression:1,a=foot.angle;
  let lx,ly,lz,beta;
  if(fox){const rig=api.foxLegPose(p,hind,side,contact),x=rig.hipX+.21*Math.sin(rig.upper)+.20*Math.sin(rig.lower),y=rig.hipY-.21*Math.cos(rig.upper)-.20*Math.cos(rig.lower);lx=(hind?-.33:.29)+Math.cos(a)*x-Math.sin(a)*sy*y;ly=.4+foot.height+Math.sin(a)*x+Math.cos(a)*sy*y;lz=side*.16+contact.z;beta=rig.lower+rig.pawPitch;}
  else{lx=(hind?-.17:.22)+contact.x+.1*Math.sin(a);ly=(hind?.16:.155)+foot.height+contact.y-.1*Math.cos(a);lz=side*(hind?.18:.12)+contact.z;beta=contact.pawRotation;}
  if(!fox){
    const joints=api.rabbitLegPose(p,index,hind,side,contact),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
    expect(distance(joints.hip,joints.knee)).toBeCloseTo(hind?.17:.155,10);expect(distance(joints.knee,joints.paw)).toBeCloseTo(hind?.18:.155,10);
    expect(distance(joints.paw,[lx,ly,lz])).toBeLessThan(1e-12);
  }
  const x=p.x+size*(Math.cos(p.yaw)*lx+Math.sin(p.yaw)*lz),z=p.z+size*(-Math.sin(p.yaw)*lx+Math.cos(p.yaw)*lz),y=api.groundHeight(p.x,p.z)+p.altitude+posture.drop+size*ly;
  const yx=Math.sin(a)*Math.cos(beta)+Math.cos(a)*sy*Math.sin(beta),yy=-Math.sin(a)*Math.sin(beta)+Math.cos(a)*sy*Math.cos(beta);
  const radius=size*Math.hypot((fox?.078:hind?.175:.12)*yx,(fox?.042:hind?.05:.045)*yy);
  return {x,z,gap:y-radius-api.groundHeight(x,z),lift:foot.lift*size};
}
it('holds recorded stance positions and fits both mammals to terrain while settling and walking',()=>{
  const rows=api.compare({}).experiment,before=JSON.stringify(rows),frames=api.behaviorTimeline({},rows);
  let held=0,walkingHeld=0,maxError=0,maxGapError=0;
  for(const id of ['foxes','rabbits']){
    let maxSettle=0;
    for(let step=0;step<frames.length;step++)for(let index=0;index<7;index++){
      const p=frames[step][id][index];if(!p.active||p.pounce>0)continue;
      maxSettle=Math.max(maxSettle,api.mammalPosture(id,p).settle);
      for(const side of [-1,1])for(const hind of [true,false]){
        const slot=(side<0?0:2)+(hind?0:1),plant=p.footPlants[slot],foot=worldFoot(id,p,index,hind,side);
        maxError=Math.max(maxError,Math.hypot(foot.x-plant.x,foot.z-plant.z));maxGapError=Math.max(maxGapError,Math.abs(foot.gap-foot.lift-.002));
        if(plant.held){held++;if(p.moving>.05)walkingHeld++;const old=frames[step-1][id][index].footPlants[slot];expect(plant.x).toBe(old.x);expect(plant.z).toBe(old.z);}
      }
    }
    expect(maxSettle).toBeGreaterThan(.85);
  }
  expect(held).toBeGreaterThan(100);expect(walkingHeld).toBeGreaterThan(100);expect(maxError).toBeLessThan(1e-10);expect(maxGapError).toBeLessThan(.006);
  expect(JSON.stringify(rows)).toBe(before);expect(frames).toEqual(api.behaviorTimeline({},rows));
});
it('lowers resting bodies without shortening bones and releases the posture for locomotion and flight',()=>{
  for(const id of ['foxes','rabbits']){
    const p={distance:0,phase:0,stride:0,pounce:0,rest:1,crouch:0};
    const down=api.mammalPosture(id,p),moving=api.mammalPosture(id,{...p,stride:1}),air=api.mammalPosture(id,{...p,pounce:1});
    expect(down.settle).toBe(1);expect(down.drop).toBeCloseTo(id==='foxes'?-.18:-.065,12);expect(moving.settle).toBe(0);expect(air.settle).toBe(0);
    let previous=api.mammalPosture(id,{...p,rest:0}),maxStep=0;
    for(let i=1;i<=100;i++){const next=api.mammalPosture(id,{...p,rest:i/100});maxStep=Math.max(maxStep,Math.abs(next.drop-previous.drop));previous=next;}
    expect(maxStep).toBeLessThan(.004);
  }
});
