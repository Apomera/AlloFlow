import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){
  const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing helper '+name);
  let end=source.indexOf('{',start),depth=1;
  while(depth){end++;if(end>=source.length)throw Error('Unclosed helper '+name);if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const names=['preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildMammalPreyParts','buildRainforestPreyParts',
  'bendFishPreyGeometry','createFishBodyGeometry','createFishFinGeometry','buildPreyVisual','advanceGroundPreyGait','setGroundPreyLegPose',
  'advanceGroundPreyTerrain','advanceGroundPreyHead','applyGroundPreyHeadPose'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,gait:advanceGroundPreyGait,leg:setGroundPreyLegPose,terrain:advanceGroundPreyTerrain,head:advanceGroundPreyHead,pose:applyGroundPreyHeadPose};')(THREE);
const ids=['rodent','rabbit','hare','arcticHare','groundSquirrel','squirrel','lemming','skunk','fawnDeer','pronghornCalf','fox','sloth','howlerMonkey','capuchin','coati'];
const make=(id,size=2)=>api.build({id,color:0x857366,speedMps:id==='sloth'?.25:6,behavior:id==='sloth'?'still':'flee-on-sight'},size);
function resources(model){const result=new Set();model.root.traverse(o=>{if(o.geometry)result.add(o.geometry);if(o.material)result.add(o.material);});return result;}
function dispose(model){resources(model).forEach(resource=>resource.dispose());}
function step(model,effort,bearing,elevation,alerted,dt,reduced=false,seed=.7){api.head(model.look,effort,bearing,elevation,alerted,dt,reduced,seed);api.pose(model);}
function clearance(mesh,height){let minimum=Infinity;const point=new THREE.Vector3(),positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);minimum=Math.min(minimum,point.y-height(point.x,point.z));}return minimum;
}
function applyFeet(model){model.legs.forEach((leg,index)=>api.leg(leg,model.gait.strides?model.gait.strides[index]:index===0?model.gait.front:model.gait.hind));}
function terrainPose(model,heading,size,height){
  const t=model.gait.terrain,y=size*.42;api.terrain(t,0,y,0,heading,size,size*.42,0,true,height);
  model.root.position.set(0,y+t.lift,0);model.root.rotation.set(t.pitch,heading,t.roll,'YXZ');model.root.updateMatrixWorld(true);
}
const updateFixture=Function('THREE','api','raptor',`
  var headAnchorWorld=new THREE.Vector3(),headLookDirection=new THREE.Vector3(),headLookMatrix=new THREE.Matrix4();
  var advanceGroundPreyHead=api.head,applyGroundPreyHeadPose=api.pose;
  ${body('updateGroundPreyHead')}
  return updateGroundPreyHead;
`);
const carryFixture=Function('THREE','prey','api','observe',`
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(prey.mesh);var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[0]},{morphTargetInfluences:[0]}];
  var setGroundPreyLegPose=api.leg,advanceGroundPreyHead=api.head,applyGroundPreyHeadPose=api.pose;
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var originalMeasure=carriedPreyBounds.setFromObject;
  carriedPreyBounds.setFromObject=function(object){observe(prey.animation);return originalMeasure.call(this,object);};
  ${body('clearCarriedPrey')}
  ${body('beginCarriedPrey')}
  return {begin:function(){beginCarriedPrey(prey);},group:talonGroup,state:function(){return carriedPrey;},bounds:carriedPreyBounds,size:carriedPreySize};
`);

describe('Ground prey head attention',()=>{
  it('animates the existing independent head on all fifteen models without adding mesh or material costs',()=>{
    const models=ids.map(id=>make(id));
    for(const model of models){const meshes=[];model.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
      expect(model.head.isMesh).toBe(true);expect(model.head.parent).toBe(model.root);expect(meshes.includes(model.head)).toBe(true);
      expect(meshes).toHaveLength(model.gait.quadruped?7:5);expect(new Set(meshes.map(mesh=>mesh.material)).size).toBe(1);
      expect(model.look.phase).toBeNull();expect(model.look.rate).toBe(0);expect(model.look.yaw).toBe(0);expect(model.look.pitch).toBe(0);expect(model.look.roll).toBe(0);
      expect(model.look.yawLimit).toBeGreaterThan(0);expect(model.look.yawLimit).toBeLessThanOrEqual(.42);
      expect(model.look.pitchLimit).toBeGreaterThan(0);expect(model.look.pitchLimit).toBeLessThanOrEqual(.14);
      expect(model.look.rateScale).toBeGreaterThan(0);expect(model.look.rateScale).toBeLessThanOrEqual(1.2);
      expect(new THREE.Box3().setFromObject(model.root).min.y).toBeCloseTo(-.84,5);
    }
    expect(new Set(models.map(model=>model.look)).size).toBe(ids.length);models.forEach(dispose);
    const fish=make('fish');expect(fish.look).toBeNull();expect(fish.head).toBeNull();dispose(fish);
  });

  it('integrates idle, running and alert transitions consistently at 30, 60 and 120 Hz',()=>{
    for(const id of ['rabbit','fox','sloth','capuchin']){const runs=[];
      for(const hz of [30,60,120]){const m=make(id);for(let i=0;i<hz*6;i++){
        const time=i/hz;step(m,time>=1&&time<3?1:0,time>=3&&time<5?.8:0,.4,time>=3&&time<5,1/hz);
      }runs.push({...m.look});dispose(m);}
      for(const key of ['phase','rate','activity']){expect(runs[0][key]).toBeCloseTo(runs[1][key],9);expect(runs[0][key]).toBeCloseTo(runs[2][key],9);}
      for(const key of ['yaw','pitch','roll']){expect(Math.abs(runs[0][key]-runs[1][key])).toBeLessThan(.006);expect(Math.abs(runs[0][key]-runs[2][key])).toBeLessThan(.006);}
    }
  });

  it('gives stationary prey small scans, restrains scans while running and slows the sloth',()=>{
    const idle=make('rabbit'),moving=make('rabbit'),sloth=make('sloth'),idleYaw=[],movingYaw=[];
    for(let i=0;i<60*16;i++){
      step(idle,0,0,0,false,1/60);step(moving,1,0,0,false,1/60);step(sloth,0,0,0,false,1/60);
      if(i>60*3){idleYaw.push(idle.look.yaw);movingYaw.push(moving.look.yaw);}
    }
    const span=values=>Math.max(...values)-Math.min(...values);
    expect(span(idleYaw)).toBeGreaterThan(.025);expect(span(idleYaw)).toBeLessThan(.2);
    expect(span(movingYaw)).toBeLessThan(span(idleYaw)*.8);expect(sloth.look.rate).toBeLessThan(idle.look.rate*.55);
    expect(sloth.look.phase-.7).toBeLessThan((idle.look.phase-.7)*.55);
    [idle,moving,sloth].forEach(dispose);
  });

  it('tracks nearby threats with bounded angles, keeps a stable side behind the prey and settles after alert',()=>{
    for(const id of ids){const m=make(id);
      for(let i=0;i<240;i++){
        step(m,.5,i%2===0?Math.PI-.015:-Math.PI+.015,i%3===0?50:-50,true,1/60);
        expect(Math.abs(m.look.yaw)).toBeLessThanOrEqual(m.look.yawLimit+1e-12);expect(Math.abs(m.look.pitch)).toBeLessThanOrEqual(.14+1e-12);expect(Math.abs(m.look.roll)).toBeLessThanOrEqual(.025+1e-12);
        if(i>120){expect(m.look.lookSide).toBe(1);expect(m.look.yaw).toBeGreaterThan(0);}
      }
      expect(m.look.activity).toBeGreaterThan(.9);expect(m.look.yaw).toBeGreaterThan(m.look.yawLimit*.65);
      for(let i=0;i<240;i++)step(m,0,0,0,false,1/60);
      expect(m.look.activity).toBeLessThan(.02);expect(Math.abs(m.look.yaw)).toBeLessThan(.12);
      expect(Math.abs(m.look.pitch)).toBeLessThan(.04);dispose(m);
    }
    const ordinary=make('fox'),wrapped=make('fox');for(let i=0;i<120;i++){step(ordinary,0,.6,.2,true,1/60);step(wrapped,0,.6+Math.PI*8,.2,true,1/60);}
    expect(wrapped.look.yaw).toBeCloseTo(ordinary.look.yaw,10);expect(wrapped.look.lookSide).toBe(ordinary.look.lookSide);[ordinary,wrapped].forEach(dispose);
  });

  it('freezes its phase and rests immediately for reduced motion, then resumes without a pose jump',()=>{
    for(const id of ids){const m=make(id);for(let i=0;i<120;i++)step(m,0,1,.5,true,1/60);
      const phase=m.look.phase;step(m,1,-2,-1,true,60,true);
      expect(m.look.phase).toBe(phase);for(const key of ['rate','yaw','pitch','roll','activity'])expect(m.look[key]).toBe(0);
      expect(m.head.rotation.order).toBe('YXZ');expect([m.head.rotation.x,m.head.rotation.y,m.head.rotation.z].map(Math.abs)).toEqual([0,0,0]);
      step(m,0,1,.5,true,1/60);expect(m.look.phase).toBeGreaterThan(phase);expect(m.look.phase-phase).toBeLessThan(.03);
      expect(Math.abs(m.look.yaw)).toBeLessThan(.06);expect(Math.abs(m.look.pitch)).toBeLessThan(.025);dispose(m);
    }
  });

  it('aims in the visual’s local space after full heading, incline and parent transforms',()=>{
    for(const id of ['rodent','fox','sloth','coati']){const m=make(id),mesh=new THREE.Group(),hunter={x:0,y:0,z:0},update=updateFixture(THREE,api,hunter);
      mesh.add(m.root);mesh.position.set(10,3,-8);mesh.rotation.set(.12,.6,.07,'YXZ');mesh.scale.setScalar(1.2);
      m.root.position.set(.2,.5,-.3);m.root.rotation.set(.25,1.1,-.17,'YXZ');m.gait.effort=.3;
      const prey={mesh,visual:m.root,animation:m,alerted:true,bobPhase:.7};
      for(const direction of [new THREE.Vector3(.8,.6,2),new THREE.Vector3(-.8,-.6,2)]){
        m.root.updateWorldMatrix(true,true);const anchor=m.head.getWorldPosition(new THREE.Vector3());
        const target=direction.clone().transformDirection(m.root.matrixWorld).multiplyScalar(12).add(anchor);
        hunter.x=target.x;hunter.y=target.y;hunter.z=target.z;for(let i=0;i<180;i++)update(prey,1/60,false);
        expect(Math.sign(m.look.yaw)).toBe(Math.sign(direction.x));expect(Math.abs(m.look.yaw)).toBeGreaterThan(.1);
        expect(Math.sign(m.look.pitch)).toBe(-Math.sign(direction.y));expect(Math.abs(m.look.pitch)).toBeGreaterThan(.025);
        expect(Math.abs(m.look.yaw)).toBeLessThanOrEqual(m.look.yawLimit+1e-12);expect(Math.abs(m.look.pitch)).toBeLessThanOrEqual(.14+1e-12);
      }
      update(prey,60,true);expect([m.head.rotation.x,m.head.rotation.y,m.head.rotation.z].map(Math.abs)).toEqual([0,0,0]);dispose(m);
    }
  });
});

describe('Ground prey head render and catch compatibility',()=>{
  it('keeps head geometry and moving feet clear of level and sloped ground at every extreme attention pose',()=>{
    for(const id of ids)for(const size of [.75,3.15]){const m=make(id,size),anchor=m.head.position.clone();
      for(const slope of [[0,0],[.32,.27],[-.3,.25]])for(const heading of [0,.7,Math.PI]){
        const height=(x,z)=>slope[0]*x+slope[1]*z;
        for(const yaw of [-m.look.yawLimit,m.look.yawLimit])for(const pitch of [-m.look.pitchLimit,m.look.pitchLimit])for(const roll of [-.025,.025]){
          api.gait(m.gait,6,6,size,m.kind,1/60,false,.7);applyFeet(m);m.look.yaw=yaw;m.look.pitch=pitch;m.look.roll=roll;api.pose(m);terrainPose(m,heading,size,height);
          expect(m.head.position.equals(anchor)).toBe(true);expect(clearance(m.head,height)).toBeGreaterThan(-1e-5);
          for(const leg of m.legs)expect(clearance(leg,height)).toBeGreaterThan(-1e-5);
        }
      }dispose(m);
    }
  });

  it('changes transforms while preserving every geometry buffer, upload version, material and posture object',()=>{
    for(const id of ids){const m=make(id),look=m.look,head=m.head,anchor=head.position.clone(),before=[];
      m.root.traverse(mesh=>{if(mesh.isMesh)before.push({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.fromEntries(['position','normal','color'].map(key=>[key,{array:mesh.geometry.attributes[key].array,version:mesh.geometry.attributes[key].version}]))});});
      for(let i=0;i<240;i++)step(m,i%60<30?0:1,Math.sin(i*.01)*2,.5,i%120<90,1/60);
      expect(m.look).toBe(look);expect(m.head).toBe(head);expect(head.position.equals(anchor)).toBe(true);
      for(const entry of before){expect(entry.mesh.geometry).toBe(entry.geometry);expect(entry.mesh.material).toBe(entry.material);
        for(const key of ['position','normal','color']){expect(entry.mesh.geometry.attributes[key].array).toBe(entry.attributes[key].array);expect(entry.mesh.geometry.attributes[key].version).toBe(entry.attributes[key].version);}}
      dispose(m);
    }
  });

  it('resets the actual head before production carry bounds are measured and keeps the same model identity',()=>{
    for(const id of ids){const m=make(id),neutralBounds=new THREE.Box3().setFromObject(m.root),neutralSize=neutralBounds.getSize(new THREE.Vector3()),head=m.head,geometry=head.geometry,material=head.material,headPosition=head.position.clone();
      for(let i=0;i<120;i++)step(m,0,1.2,.8,true,1/60);expect(Math.abs(head.rotation.y)).toBeGreaterThan(.05);
      m.root.position.y=.2;m.root.rotation.set(.2,.7,-.1,'YXZ');api.gait(m.gait,6,6,2,m.kind,.2,false,.7);applyFeet(m);m.tail.rotation.z=.2;
      const mesh=new THREE.Group();mesh.add(m.root);mesh.position.set(4,2,8);mesh.rotation.set(.3,.8,.2);
      const prey={mesh,visual:m.root,animation:m,data:{id,speedMps:6},groundClearance:.84,bobPhase:.7};let measureCount=0;
      const fixture=carryFixture(THREE,prey,api,animation=>{measureCount++;
        expect(animation.head).toBe(head);expect([head.rotation.x,head.rotation.y,head.rotation.z].map(Math.abs)).toEqual([0,0,0]);
        expect([animation.look.yaw,animation.look.pitch,animation.look.roll].map(Math.abs)).toEqual([0,0,0]);
      });fixture.begin();
      expect(measureCount).toBe(1);expect(mesh.parent).toBe(fixture.group);expect(fixture.state().prey).toBe(prey);
      expect(fixture.size.distanceTo(neutralSize)).toBeLessThan(1e-5);expect(head.geometry).toBe(geometry);expect(head.material).toBe(material);expect(head.position.equals(headPosition)).toBe(true);
      expect(fixture.state().materials).toHaveLength(1);dispose(m);
    }
  });
});
