import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
function measure(p,index,hind,side,surface){
  const foot=api.footPose('foxes',p,hind,side),contact=api.foxFooting(p,index,hind,side,surface),rig=api.foxLegPose(p,hind,side,contact);
  const x=rig.hipX+.21*Math.sin(rig.upper)+.20*Math.sin(rig.lower),y=rig.hipY-.21*Math.cos(rig.upper)-.20*Math.cos(rig.lower);
  const size=.94+(index%5)*.028,compression=Math.max(p.crouch||0,(p.rest||0)*.65),sy=1-.12*compression,drop=-.045*compression,b=-(p.pounce||0)*.12,a=foot.angle;
  const lx=(hind?-.33:.29)+Math.cos(a)*x-Math.sin(a)*sy*y,ly=.4+foot.height+Math.sin(a)*x+Math.cos(a)*sy*y,bx=Math.cos(b)*lx-Math.sin(b)*ly,by=Math.sin(b)*lx+Math.cos(b)*ly;
  const wx=p.x+size*(Math.cos(p.yaw)*bx+Math.sin(p.yaw)*side*.16),wz=p.z+size*(-Math.sin(p.yaw)*bx+Math.cos(p.yaw)*side*.16),wy=surface(p.x,p.z)+p.altitude+drop+size*by;
  const beta=rig.lower+rig.pawPitch,t=b+a,yx=Math.sin(t)*Math.cos(beta)+Math.cos(t)*sy*Math.sin(beta),yy=-Math.sin(t)*Math.sin(beta)+Math.cos(t)*sy*Math.cos(beta),xx=Math.cos(t)*Math.cos(beta)-Math.sin(t)*sy*Math.sin(beta);
  return {gap:wy-size*Math.hypot(.078*yx,.042*yy)-surface(wx,wz),pitch:Math.atan2(yx,xx),contact,rig,size,sy};
}
it('keeps soles on flat and sloping ground while preserving swing lift and local slope alignment',()=>{
  let maxGapError=0,maxPitchError=0;
  for(const [sx,sz] of [[0,0],[.10,-.06],[-.12,.04]])for(const yaw of [-2,.4,2.7])for(const index of [0,4])for(const crouch of [0,.6])for(const hind of [true,false])for(const side of [-1,1])for(let phase=0;phase<6.3;phase+=.3){
    const surface=(x,z)=>sx*x+sz*z,p={x:2,z:-1,yaw,distance:0,phase,stride:1,pounce:0,crouch,rest:0,altitude:.025};
    const m=measure(p,index,hind,side,surface),lift=api.footPose('foxes',p,hind,side).lift*m.size;
    maxGapError=Math.max(maxGapError,Math.abs(m.gap-lift-.002));maxPitchError=Math.max(maxPitchError,Math.abs(m.pitch-Math.atan(sx*Math.cos(yaw)-sz*Math.sin(yaw))));
  }
  expect(maxGapError).toBeLessThan(1e-10);expect(maxPitchError).toBeLessThan(1e-10);
});
it('releases terrain fitting in flight and bounds correction on steep terrain without invalid joints',()=>{
  for(const hind of [true,false])for(const side of [-1,1]){
    const p={x:2,z:-1,yaw:.7,distance:.4,phase:1,stride:1,pounce:1,crouch:0,rest:0,altitude:.345},surface=(x,z)=>.1*x-.06*z,m=measure(p,0,hind,side,surface),air=api.foxLegPose(p,hind,side);
    expect(m.contact.weight).toBe(0);expect(m.gap).toBeGreaterThan(.2);for(const key of Object.keys(air))expect(m.rig[key]).toBeCloseTo(air[key],12);
    const steep=measure({...p,pounce:0,altitude:.025},0,hind,side,(x,z)=>.9*x+.7*z);
    expect(Object.values(steep.rig).every(Number.isFinite)).toBe(true);expect(Math.hypot(steep.contact.x,steep.contact.y*steep.sy)).toBeLessThanOrEqual(.08+1e-12);
  }
});
