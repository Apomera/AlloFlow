import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const base={active:true,state:'Stalking',x:2,z:-1,yaw:.4,altitude:.025,distance:0,phase:0,stride:.5,moving:.175,pounce:0,crouch:0,rest:0};
const feet=[{name:'LF',hind:false,side:-1},{name:'RH',hind:true,side:1},{name:'RF',hind:false,side:1},{name:'LH',hind:true,side:-1}];
const at=(stride,phase)=>({...base,stride,moving:stride*.35,phase:phase*Math.PI*2});
const motionKeys=['angle','height','lift'];

describe('recorded mammal gait transitions',()=>{
  it('walks with four successive footfalls and at least three planted feet at a slow recorded pace',()=>{
    const landings=[],previous=feet.map(f=>api.footPose('foxes',at(.5,-1e-5),f.hind,f.side));
    expect(api.foxGait(at(.5,0),false,-1)).toMatchObject({blend:0,stance:.78,pattern:'walk'});
    for(let sample=0;sample<1000;sample++){
      const p=at(.5,sample/1000),poses=feet.map(f=>api.footPose('foxes',p,f.hind,f.side));
      expect(poses.filter(f=>!f.swing).length).toBeGreaterThanOrEqual(3);
      poses.forEach((foot,i)=>{if(previous[i].swing&&!foot.swing)landings.push(feet[i].name);previous[i]=foot;});
    }
    expect(landings).toEqual(['LF','RH','RF','LH']);
  });

  it('eases into exact synchronized diagonal pairs while every transitional gait retains two supported feet',()=>{
    for(let strideStep=1;strideStep<=20;strideStep++)for(let phaseStep=0;phaseStep<100;phaseStep++){
      const p=at(strideStep/20,phaseStep/100),poses=feet.map(f=>api.footPose('foxes',p,f.hind,f.side));
      expect(poses.filter(f=>!f.swing).length).toBeGreaterThanOrEqual(2);
      if(strideStep===20){expect(poses[0]).toEqual(poses[1]);expect(poses[2]).toEqual(poses[3]);}
    }
    expect(api.foxGait(at(1,0),true,1)).toMatchObject({blend:1,stance:.64,offset:0,pattern:'trot'});
    // A stopped pose releases every local foot arc even if its phase is in swing.
    for(const foot of feet)expect(api.footPose('foxes',at(0,.9),foot.hind,foot.side)).toMatchObject({angle:0,height:0,lift:0});
  });

  it('keeps position continuous through pace boundaries, stance changes and the wrapped hind-foot phase',()=>{
    for(const stride of [0,.6,.6000001,.75,.9999999,1])for(let phase=0;phase<=1;phase+=.01)for(const foot of feet){
      const a=api.footPose('foxes',at(Math.max(0,stride-1e-7),phase),foot.hind,foot.side),b=api.footPose('foxes',at(Math.min(1,stride+1e-7),phase),foot.hind,foot.side);
      for(const key of motionKeys)expect(Math.abs(a[key]-b[key])).toBeLessThan(1e-5);
    }
    for(const stride of [.3,.6,.8,1])for(const foot of feet){
      const gait=api.foxGait(at(stride,0),foot.hind,foot.side);
      for(const boundary of [-gait.offset,gait.stance-gait.offset,1-gait.offset]){
        const a=api.footPose('foxes',at(stride,boundary-1e-7),foot.hind,foot.side),b=api.footPose('foxes',at(stride,boundary+1e-7),foot.hind,foot.side);
        for(const key of motionKeys)expect(Math.abs(a[key]-b[key])).toBeLessThan(1e-5);
      }
    }
  });

  it('preserves calibrated fox sole contact, swing clearance and joint lengths throughout the walking-to-trotting range',()=>{
    let maximumError=0;
    for(const stride of [.3,.6,.75,.9,1])for(const [sx,sz] of [[0,0],[.10,-.06],[-.12,.04]])for(const foot of feet)for(let phase=0;phase<1;phase+=.05){
      const p=at(stride,phase),surface=(x,z)=>sx*x+sz*z,f=api.footPose('foxes',p,foot.hind,foot.side),contact=api.foxFooting(p,0,foot.hind,foot.side,surface),rig=api.foxLegPose(p,foot.hind,foot.side,contact);
      const knee=[rig.hipX+.21*Math.sin(rig.upper),rig.hipY-.21*Math.cos(rig.upper)],paw=[knee[0]+.20*Math.sin(rig.lower),knee[1]-.20*Math.cos(rig.lower)];
      expect(Math.hypot(knee[0]-rig.hipX,knee[1]-rig.hipY)).toBeCloseTo(.21,12);expect(Math.hypot(paw[0]-knee[0],paw[1]-knee[1])).toBeCloseTo(.20,12);
      const ca=Math.cos(f.angle),sa=Math.sin(f.angle),lx=(foot.hind?-.33:.29)+ca*paw[0]-sa*paw[1],ly=.4+f.height+sa*paw[0]+ca*paw[1],lz=foot.side*.16+contact.z;
      const wx=p.x+.94*(Math.cos(p.yaw)*lx+Math.sin(p.yaw)*lz),wz=p.z+.94*(-Math.sin(p.yaw)*lx+Math.cos(p.yaw)*lz),wy=surface(p.x,p.z)+.025+.94*ly,beta=f.angle+rig.lower+rig.pawPitch;
      const radius=.94*Math.hypot(.078*Math.sin(beta),.042*Math.cos(beta));maximumError=Math.max(maximumError,Math.abs(wy-radius-surface(wx,wz)-.002-f.lift*.94));
    }
    expect(maximumError).toBeLessThan(1e-10);
    for(const foot of feet)expect(api.footPose('foxes',{...base,pounce:1},foot.hind,foot.side)).toMatchObject({angle:foot.hind?-.75:.95,height:0,lift:0});
  });

  it('lets rabbit bounce follow eased speed without a torso pop when a behavior label changes',()=>{
    let maximumJump=0,previous=null;
    for(let step=0;step<=500;step++){
      const p={...base,stride:1,moving:step/500*1.15,distance:.031,phase:.5};
      const exploring=api.mammalPosture('rabbits',{...p,state:'Exploring'}),retreat=api.mammalPosture('rabbits',{...p,state:'Retreating'});
      expect(exploring).toEqual(retreat);if(previous)maximumJump=Math.max(maximumJump,Math.abs(exploring.drop-previous.drop));previous=exploring;
    }
    expect(maximumJump).toBeLessThan(.003);
    const start={...base,stride:1,moving:.3,distance:.031,phase:.5,state:'Exploring'},end={...start,moving:1.15,state:'Retreating'};
    const beforeBoundary=api.blendPose(start,end,1-1e-7,'rabbits');
    expect(beforeBoundary.state).toBe('Exploring');expect(Math.abs(api.mammalPosture('rabbits',beforeBoundary).drop-api.mammalPosture('rabbits',end).drop)).toBeLessThan(1e-6);
    for(const moving of [.3,1.15]){
      const p={...base,stride:1,moving,distance:.031,phase:.5,state:moving>.9?'Retreating':'Exploring'},posture=api.mammalPosture('rabbits',p),amplitude=moving>.9?.065:.025;
      expect(posture.drop-posture.flightLift+api.rabbitLanding(p).dip).toBeCloseTo(Math.abs(Math.sin(p.distance*28+p.phase))*amplitude,12);
    }
  });
});
