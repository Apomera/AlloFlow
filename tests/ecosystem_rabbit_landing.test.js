import {beforeEach,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const toolSource=process.env.ECOLOGY_LANDING_CANDIDATE||'stem_lab/stem_tool_ecosystem.js';
beforeEach(()=>{resetStemLab();loadTool(toolSource,'ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const pose=(cycle,extra={})=>({active:true,state:'Retreating',x:1,z:1,yaw:.4,altitude:.025,distance:cycle*Math.PI*2/28,phase:0,stride:1,moving:1.15,rest:0,crouch:0,pounce:0,forage:0,headRaise:1,...extra});
function disabled(){const source=readFileSync(toolSource,'utf8'),anchor="var landing=id==='rabbits'?ecoMeadowRabbitLanding(pose):{dip:0};";expect(source.split(anchor)).toHaveLength(2);resetStemLab();new Function(source.replace(anchor,'var landing={dip:0};'))();return window.StemLab.ecosystemFoodWeb;}
function pawWorld(a,p,index,hind,side){const f=a.footPose('rabbits',p,hind,side),c=a.rabbitFooting(p,index,hind,side),post=a.mammalPosture('rabbits',p),size=.86*(.94+index%5*.028);return {x:c.x,z:c.z,rotation:c.pawRotation,y:a.groundHeight(p.x,p.z)+p.altitude+post.drop+size*((hind?.16:.155)+f.height-.1*Math.cos(f.angle)+c.y)};}
const configurations=[{event:'none'},{enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10,event:'none'},{enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:80,event:'none'}];

describe('rabbit paired-stance landing cushion',()=>{
  it('compresses only the recorded supporting pair and leaves shared flight untouched',()=>{
    let fore=0,hind=0,air=0;
    for(let step=0;step<=1000;step++){const p=pose(step/1000),a=api.rabbitLanding(p),art=api.mammalArticulation('rabbits',p,false);expect(a.dip).toBeGreaterThanOrEqual(0);expect(a.dip).toBeLessThanOrEqual(.02200000001);expect(art.landingFore).toBe(a.fore);expect(art.landingHind).toBe(a.hind);expect(art.landingDip).toBe(a.dip);
      if(a.fore>0){fore++;expect(art.foreContact).toBe(true);expect(api.footPose('rabbits',p,false,-1).swing).toBe(false);}if(a.hind>0){hind++;expect(art.hindContact).toBe(true);expect(api.footPose('rabbits',p,true,-1).swing).toBe(false);}if(art.supportFeet===0){air++;expect(a).toEqual({fore:0,hind:0,dip:0});}
    }expect(fore).toBeGreaterThan(80);expect(hind).toBeGreaterThan(80);expect(air).toBeGreaterThan(100);
  });
  it('has matching values and first derivatives at support/pulse edges and phase wraps',()=>{
    const h=1e-7,f=c=>api.rabbitLanding(pose(c)).dip;
    for(const edge of [0,.42*.28,.18,.18+.42*.28,.42,.60,1]){const left=f(edge-h),at=f(edge),right=f(edge+h);expect(Math.abs(right-left)).toBeLessThan(1e-8);expect(Math.abs((at-left)/h-(right-at)/h)).toBeLessThan(5e-4);}
    const continuous=(key,edge)=>{const f=v=>api.rabbitLanding(pose(.05,{[key]:v})).dip,left=f(edge-h),at=f(edge),right=f(edge+h);expect(Math.abs(right-left)).toBeLessThan(1e-6);expect(Math.abs((at-left)/h-(right-at)/h)).toBeLessThan(5e-4);};
    for(const edge of [.35,.90])continuous('moving',edge);for(const edge of [.015,.115])continuous('stride',edge);continuous('rest',1);continuous('pounce',1);
  });
  it('fades with stride, speed, rest and pounce and resets for reduced motion and absence',()=>{
    const p=pose(.42*.28/2),base=api.rabbitLanding(p);expect(base.hind).toBeCloseTo(1,12);expect(base.dip).toBeCloseTo(.022,12);
    expect(api.rabbitLanding({...p,stride:.5}).dip).toBeCloseTo(base.dip*.5,12);expect(api.rabbitLanding({...p,rest:.5}).dip).toBeCloseTo(base.dip*.25,12);expect(api.rabbitLanding({...p,pounce:.5}).dip).toBeCloseTo(base.dip*.25,12);
    for(const q of [{...p,stride:0},{...p,moving:.35},{...p,rest:1},{...p,pounce:1},{...p,active:false},null,{}])expect(api.rabbitLanding(q)).toEqual({fore:0,hind:0,dip:0});expect(api.rabbitLanding(p,true)).toEqual({fore:0,hind:0,dip:0});
    for(const id of ['rabbits','foxes']){const a=api.mammalArticulation(id,p,true);expect(a.landingFore).toBe(0);expect(a.landingHind).toBe(0);expect(a.landingDip).toBe(0);}
  });
  it('keeps fitted world paw targets and rotations exact for every index through the full cycle',()=>{
    const control=disabled();let checked=0;
    for(let index=0;index<16;index++)for(let cycle=0;cycle<1;cycle+=.025)for(const side of [-1,1])for(const hind of [true,false]){
      const p=pose(cycle,{x:-5+index*.5,z:Math.sin(index),yaw:index*.4}),a=pawWorld(api,p,index,hind,side),b=pawWorld(control,p,index,hind,side);for(const key of ['x','y','z','rotation'])expect(a[key]).toBeCloseTo(b[key],12);
      const joints=api.rabbitLegPose(p,index,hind,side);expect([...joints.hip,...joints.knee,...joints.paw].every(Number.isFinite)).toBe(true);const distance=(u,v)=>Math.hypot(...u.map((n,j)=>n-v[j]));expect(distance(joints.hip,joints.knee)).toBeCloseTo(hind?.17:.155,10);expect(distance(joints.knee,joints.paw)).toBeCloseTo(hind?.18:.155,10);checked++;
    }expect(checked).toBeGreaterThan(2500);
  });
  it('changes only vertical body translation while skull/neck transforms and planar body envelopes remain unchanged',()=>{
    const control=disabled();for(const p of [pose(.0588),pose(.2388),pose(.75),pose(.05,{rest:.3})]){
      const old=control.mammalPosture('rabbits',p),next=api.mammalPosture('rabbits',p),dip=api.rabbitLanding(p).dip;expect(next.drop).toBeCloseTo(old.drop-dip,12);for(const key of ['settle','compression','flightLift'])expect(next[key]).toBe(old[key]);
      const a=api.mammalArticulation('rabbits',p,false),b=control.mammalArticulation('rabbits',p,false);for(const key of ['headPitch','headYaw','headRoll','headReach','headDrop','headRaise','earLeft','earRight','earTilt','spineFlex','bodyStretch','ribScaleY','ribScaleZ','ribRoll','foreContact','hindContact','supportFeet','flightLift'])expect(a[key]).toBe(b[key]);
      // The neck fit uses the unchanged head-local matrix; both neck and
      // skull are under the same body group's new vertical translation.
      const identity=[1,0,0,0,0,1,0,0,0,0,1,0,.24,.4,0,1];expect(api.neckFit('rabbits',identity)).toEqual(control.neckFit('rabbits',identity));expect(api.peerRadius('rabbits',0)).toBe(control.peerRadius('rabbits',0));expect(api.groundRadius('rabbits',0)).toBe(control.groundRadius('rabbits',0));
    }
  });
});

describe('actual rabbit landing examples and retained ecology evidence',()=>{
  it('provides real fore/hind cushion examples with corresponding recorded support and exact replay',()=>{
    let fore=0,hind=0;for(const config of configurations){const rows=api.compare(config).baseline,frames=api.behaviorTimeline(config,rows);for(const frame of frames)for(const p of frame.rabbits){if(!p.active)continue;const a=api.rabbitLanding(p);if(a.fore>1e-6){fore++;expect(p.footPlants[1].planted).toBe(true);expect(p.footPlants[3].planted).toBe(true);}if(a.hind>1e-6){hind++;expect(p.footPlants[0].planted).toBe(true);expect(p.footPlants[2].planted).toBe(true);}}
      expect(JSON.stringify(api.behaviorTimeline(config,rows))).toBe(JSON.stringify(frames));
    }expect(fore).toBeGreaterThan(10);expect(hind).toBeGreaterThan(10);
  });
  it('preserves all route/action/foot/cue frames, encounter catalogs, movement studies and biomass',()=>{
    const control=disabled();for(const config of configurations){const rows=api.compare(config).baseline,before=JSON.stringify(rows),a=api.behaviorTimeline(config,rows),b=control.behaviorTimeline(config,rows);expect(a).toEqual(b);expect(api.encounters(a,config)).toEqual(control.encounters(b,config));expect(api.motionStudy(a,'rabbits',0)).toEqual(control.motionStudy(b,'rabbits',0));expect(JSON.stringify(rows)).toBe(before);}
  });
  it('keeps every actual transformed nose vertex above the ground during cushioned landings',()=>{
    const require=createRequire(import.meta.url),T=require(resolve(process.cwd(),'vendor/three-r128/three.min.js')),geometry=new T.IcosahedronGeometry(1,2),vertices=geometry.getAttribute('position'),matrix=new T.Matrix4(),q=new T.Quaternion(),euler=new T.Euler(),scale=new T.Vector3(1,1,1),point=new T.Vector3(),translation=new T.Vector3();let checked=0,lowest=Infinity;
    for(const config of configurations){const frames=api.behaviorTimeline(config,api.compare(config).baseline);for(const frame of frames)for(let index=0;index<16;index++){
      const p=frame.rabbits[index];if(!p.active||api.rabbitLanding(p).dip<=1e-6)continue;const a=api.mammalArticulation('rabbits',p,false),post=api.mammalPosture('rabbits',p),size=.86*(.94+index%5*.028),cy=Math.cos(p.yaw),sn=Math.sin(p.yaw);euler.set(a.headRoll,a.headYaw,a.headPitch);q.setFromEuler(euler);translation.set(.24+a.headReach,.4-a.headDrop,0);matrix.compose(translation,q,scale);
      for(let k=0;k<vertices.count;k++){point.set(.455+.020*vertices.getX(k)-.24,.395+.015*vertices.getY(k)-.4,.023*vertices.getZ(k)).applyMatrix4(matrix);const wx=p.x+size*(cy*point.x+sn*point.z),wz=p.z+size*(-sn*point.x+cy*point.z),wy=api.groundHeight(p.x,p.z)+p.altitude+post.drop+size*point.y;lowest=Math.min(lowest,wy-api.groundHeight(wx,wz));checked++;}
    }}expect(checked).toBeGreaterThan(50000);expect(lowest).toBeGreaterThan(.15);
  });
});
