import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const base={active:true,state:'Exploring',x:1,z:-.5,yaw:.4,altitude:.025,distance:0,phase:0,stride:1,moving:.3,forage:0,rest:0,crouch:0,pounce:0};
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});

describe('recorded mammal articulation and rabbit bounds',()=>{
  it('keeps a slower rabbit supported and gives a fast rabbit a shared flight between paired contacts',()=>{
    let fastFlight=0,slowFlight=0,maxFlight=0;
    for(let n=0;n<=400;n++){
      const distance=n/400*Math.PI*2/28;
      for(const moving of [.3,1.15]){
        const p={...base,distance,moving},a=api.mammalArticulation('rabbits',p,false);
        const feet=[true,false].flatMap(hind=>[-1,1].map(side=>api.footPose('rabbits',p,hind,side)));
        expect(a.supportFeet).toBe(feet.filter(f=>!f.swing).length);
        expect(feet[0]).toEqual(feet[1]);expect(feet[2]).toEqual(feet[3]);
        expect(a.flightLift).toBeCloseTo(api.mammalPosture('rabbits',p).flightLift,12);
        if(a.supportFeet===0){if(moving===.3)slowFlight++;else fastFlight++;}
        if(a.flightLift>1e-6)expect(a.supportFeet).toBe(0);
        maxFlight=Math.max(maxFlight,a.flightLift);
      }
    }
    expect(slowFlight).toBe(0);expect(fastFlight).toBeGreaterThan(100);expect(maxFlight).toBeGreaterThan(.109);expect(maxFlight).toBeLessThanOrEqual(.11);
  });

  it('reconstructs rabbit soles on slopes with shared flight and individual swing clearance added once',()=>{
    let maxError=0;
    for(const moving of [.3,.5,.9,1.15])for(const index of [0,4])for(const yaw of [-2,.4,2.7])for(const [sx,sz] of [[0,0],[.10,-.06],[-.12,.04]])for(let n=0;n<=60;n++)for(const hind of [false,true])for(const side of [-1,1]){
      const surface=(x,z)=>sx*x+sz*z,p={...base,moving,yaw,distance:n/60*Math.PI*2/28},size=.86*(.94+index%5*.028);
      const foot=api.footPose('rabbits',p,hind,side),contact=api.rabbitFooting(p,index,hind,side,surface),posture=api.mammalPosture('rabbits',p);
      const x=(hind?-.17:.22)+contact.x+.1*Math.sin(foot.angle),y=(hind?.16:.155)+foot.height+contact.y-.1*Math.cos(foot.angle),z=side*(hind?.18:.12)+contact.z;
      const wx=p.x+size*(Math.cos(yaw)*x+Math.sin(yaw)*z),wz=p.z+size*(-Math.sin(yaw)*x+Math.cos(yaw)*z),wy=surface(p.x,p.z)+p.altitude+posture.drop+size*y;
      const slope=foot.angle+contact.pawRotation,radius=size*Math.hypot((hind?.175:.12)*Math.sin(slope),(hind?.05:.045)*Math.cos(slope));
      maxError=Math.max(maxError,Math.abs(wy-radius-surface(wx,wz)-.002-foot.lift*size-posture.flightLift));
      const joints=api.rabbitLegPose(p,index,hind,side,contact);expect(joints.paw).toEqual([x,y,z]);
    }
    expect(maxError).toBeLessThan(1e-10);
  });

  it('eases fast-bound timing and body flight continuously through speed, landing and braking boundaries',()=>{
    let maxJump=0;
    for(const phase of [0,.42*Math.PI*2,.6*Math.PI*2,.82*Math.PI*2,2*Math.PI])for(const moving of [.35,.5,.9,1.15]){
      const left={...base,phase:phase-1e-7,moving},right={...base,phase:phase+1e-7,moving};
      for(const hind of [true,false]){
        const a=api.footPose('rabbits',left,hind,-1),b=api.footPose('rabbits',right,hind,-1);
        for(const key of ['angle','height','lift'])expect(Math.abs(a[key]-b[key])).toBeLessThan(1e-6);
      }
      expect(Math.abs(api.mammalPosture('rabbits',left).drop-api.mammalPosture('rabbits',right).drop)).toBeLessThan(1e-6);
    }
    for(let n=1;n<=1000;n++){
      const a={...base,phase:4.7,moving:n/1000*1.15},b={...a,moving:(n-1)/1000*1.15};
      maxJump=Math.max(maxJump,Math.abs(api.mammalPosture('rabbits',a).flightLift-api.mammalPosture('rabbits',b).flightLift));
    }
    expect(maxJump).toBeLessThan(.003);
    const still=api.mammalArticulation('rabbits',{...base,moving:0,stride:0},false);
    expect(still.flightLift).toBe(0);expect(still.supportFeet).toBe(4);
  });

  it('distinguishes a rabbit spine/tuck cycle from the restrained fox stride and coordinates a curved resting brush',()=>{
    const rabbit=api.mammalArticulation('rabbits',{...base,distance:.05},false),fox=api.mammalArticulation('foxes',{...base,distance:.05},false);
    expect(Math.abs(rabbit.spineFlex)).toBeGreaterThan(Math.abs(fox.spineFlex)*2);
    expect(Math.abs(rabbit.bodyStretch-1)).toBeGreaterThan(Math.abs(fox.bodyStretch-1)*2);
    const rest=api.mammalArticulation('foxes',{...base,stride:0,moving:0,rest:1,state:'Resting'},false);
    expect(rest.tailYaw).toBeCloseTo(.8,12);expect(rest.tailCurl).toBeCloseTo(.65,12);expect(rest.headDrop).toBeGreaterThan(0);
    const leap=api.mammalArticulation('foxes',{...base,pounce:1,state:'Pouncing'},false);
    expect(leap.mode).toBe('pounce');expect(leap.supportFeet).toBe(0);expect(leap.foreContact||leap.hindContact).toBe(false);
  });

  it('lowers and reaches the grazing rabbit head through the neck without changing any limb target',()=>{
    const upright=api.mammalArticulation('rabbits',{...base,stride:0,moving:0},false);
    const feedingPose={...base,stride:0,moving:0,forage:.75,state:'Grazing'},feeding=api.mammalArticulation('rabbits',feedingPose,false);
    expect(feeding.headPitch).toBeLessThan(-.9);expect(feeding.headDrop).toBeCloseTo(.20,12);expect(feeding.headReach).toBeGreaterThan(0);
    expect(upright.headPitch).toBeCloseTo(0,12);expect(feeding.supportFeet).toBe(4);
    for(const hind of [true,false])for(const side of [-1,1])expect(api.rabbitFooting(feedingPose,0,hind,side)).toEqual(api.rabbitFooting({...feedingPose,forage:0},0,hind,side));
  });

  it('freezes local articulation in reduced motion, returns finite neutral fallbacks and exactly repeats recorded poses',()=>{
    const neutral=api.mammalArticulation('rabbits',base,true);
    expect(api.mammalArticulation('rabbits',{...base,distance:99,moving:1.15,pounce:1,rest:1,forage:1},true)).toEqual(neutral);
    for(const id of ['rabbits','foxes','plants']){
      expect(Object.values(api.mammalArticulation(id,{},false)).filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true);
      expect(Object.values(api.mammalArticulation(id,{active:true,distance:NaN,phase:Infinity,stride:1,moving:Infinity,rest:Infinity,crouch:NaN,forage:NaN},false)).filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true);
      expect(api.mammalArticulation(id,{...base,active:false},false)).toEqual(neutral);
      const first=api.mammalArticulation(id,base,false);api.mammalArticulation(id,{...base,distance:45},false);expect(api.mammalArticulation(id,base,false)).toEqual(first);
    }
  });

  it('finds real flight in recorded rabbit retreats while leaving the food-web run unchanged',()=>{
    const config={event:'none',cover:10,initial:{rabbits:90,foxes:6}},runs=api.compare(config),before=JSON.stringify(runs);
    const frames=api.behaviorTimeline(config,runs.baseline);let flight=null;
    for(const frame of frames)for(const p of frame.rabbits){const a=api.mammalArticulation('rabbits',p,false);if(p.active&&p.state==='Retreating'&&a.flightLift>.005&&a.supportFeet===0){flight={p,a};break;}}
    expect(flight).not.toBeNull();expect(flight.p.state).toBe('Retreating');expect(flight.p.footPlants.every(f=>!f.planted)).toBe(true);
    expect(JSON.stringify(runs)).toBe(before);
  });
});
