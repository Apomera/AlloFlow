import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const birdIds=['pigeon','mourningDove','songbird','shorebird','duck','waterfowl','grouse','ptarmigan','smallOwl'];
const groundIds=['rodent','rabbit','hare','arcticHare','groundSquirrel','squirrel','lemming','skunk','fawnDeer','pronghornCalf','fox','sloth','howlerMonkey','capuchin','coati'];
function body(name){
  const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing helper '+name);
  let end=source.indexOf('{',start),depth=1;
  while(depth){end++;if(end>=source.length)throw Error('Unclosed helper '+name);if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const names=['preyBirdPalette','createPreyBirdBodyGeometry','createPreyWingGeometry','createPreyTailGeometry','preyKindFor',
  'mergeGroundPreyParts','buildGroundPreyParts','buildMammalPreyParts','buildRainforestPreyParts',
  'bendFishPreyGeometry','createFishBodyGeometry','createFishFinGeometry','buildPreyVisual','advanceBirdPreyHead','applyBirdPreyHeadPose'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,head:advanceBirdPreyHead,pose:applyBirdPreyHeadPose};')(THREE);
const make=(id,size=2)=>api.build({id,color:0x9ca3af,speedMps:2},size);
function meshes(model){const result=[];model.root.traverse(object=>{if(object.isMesh)result.push(object);});return result;}
function resources(model){const result=new Set();meshes(model).forEach(mesh=>{result.add(mesh.geometry);result.add(mesh.material);});return result;}
function dispose(model){resources(model).forEach(resource=>resource.dispose());}
function step(model,spread,bearing,elevation,alerted,bank,dt,reduced=false,seed=.7){
  api.head(model.birdLook,spread,bearing,elevation,alerted,bank,dt,reduced,seed);api.pose(model);
}
function minimumY(mesh){
  let y=Infinity;const p=mesh.geometry.attributes.position,point=new THREE.Vector3();
  for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);y=Math.min(y,point.y);}return y;
}
const updateFixture=Function('THREE','api','raptor',`
  var headAnchorWorld=new THREE.Vector3(),headLookDirection=new THREE.Vector3(),headLookMatrix=new THREE.Matrix4();
  var advanceBirdPreyHead=api.head,applyBirdPreyHeadPose=api.pose;
  ${body('updateBirdPreyHead')}
  return updateBirdPreyHead;
`);
const carryFixture=Function('THREE','prey','api','observe',`
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(prey.mesh);var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[0]},{morphTargetInfluences:[0]}];
  var advanceBirdPreyHead=api.head,applyBirdPreyHeadPose=api.pose;
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var originalMeasure=carriedPreyBounds.setFromObject;
  carriedPreyBounds.setFromObject=function(object){observe(prey.animation);return originalMeasure.call(this,object);};
  ${body('clearCarriedPrey')}
  ${body('beginCarriedPrey')}
  return {begin:function(){beginCarriedPrey(prey);},clear:clearCarriedPrey,group:talonGroup,state:function(){return carriedPrey;},size:carriedPreySize};
`);
const preferenceFixture=Function('THREE','api','preys',`
  var _rmFX=false,studyBoundsDirty=false,starsList=null,gazeTarget=null,gazeState={yaw:.2,pitch:.1},headMesh=new THREE.Group(),tail=new THREE.Group();
  var raptor={landed:false,crashed:false,cameraRoll:.2,x:5,y:3,z:10},carriedPrey=null,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[.3]}],wingPose={fold:.3},preyMeshes=preys,waterWakeEntries=[];
  var vegetationWindState={x:1,z:1},vegetationWind={value:new THREE.Vector3(1,0,1)},speedLineMat={opacity:.3};
  var cameraTargetBlend=.3,cameraLateralLead=.2,studyActive=false,studySavedCamera=null,camera=new THREE.PerspectiveCamera();
  camera.position.set(0,0,5);var cameraRollAxis=new THREE.Vector3(),simPaused=true,motionNow=750,paintCalls=0,fovCalls=0;
  var diveVig=null,rainSystem={visible:true},snowSystem={visible:true},rainGeometry=new THREE.BufferGeometry(),snowGeometry=new THREE.BufferGeometry(),activePrecipitationCount=10;
  var STRIKE_FX_SLOT_COUNT=0,strikeFxSlotActive=[],strikeFxActiveCount=0,strikeContactActiveCount=0;
  var strikeFxPoints={visible:false},strikeContactMesh={visible:false,instanceMatrix:{needsUpdate:false}},strikeFxPositionAttribute={needsUpdate:false};
  function clearTouchdownFx(){}function hideStrikeFxSlot(){}function updateCarriedPrey(){}function updateTargetFeedback(){}
  function repaintPausedFlight(){paintCalls++;}function updateFlightFov(){fovCalls++;}
  var updateBirdPreyHead=api.update;
  ${body('onReducedMotionChange')}
  return {change:function(matches){onReducedMotionChange({matches:matches});},state:function(){return {reduced:_rmFX,paused:simPaused,time:motionNow,paintCalls:paintCalls,fovCalls:fovCalls};}};
`);

describe('Bird prey attention and stabilized gaze',()=>{
  it('reuses all nine existing bird heads while keeping the ground attention references isolated',()=>{
    const models=birdIds.map(id=>make(id));
    for(const model of models){
      const parts=meshes(model);expect(parts).toHaveLength(5);expect(new Set(parts.map(mesh=>mesh.material)).size).toBe(4);
      expect(model.birdHead.isMesh).toBe(true);expect(model.birdHead.name).toBe('prey-plumage-head');expect(model.birdHead.parent).toBe(model.root);
      expect(parts.includes(model.birdHead)).toBe(true);expect(model.head).toBeNull();expect(model.look).toBeNull();
      expect(model.birdLook.phase).toBeNull();for(const key of ['rate','activity','yaw','pitch','roll'])expect(model.birdLook[key]).toBe(0);
      expect(model.birdLook.yawLimit).toBeGreaterThan(0);expect(model.birdLook.yawLimit).toBeLessThanOrEqual(.5);
      expect(model.birdLook.pitchLimit).toBeGreaterThan(0);expect(model.birdLook.pitchLimit).toBeLessThanOrEqual(.12);
      expect(model.birdLook.rollLimit).toBeGreaterThan(0);expect(model.birdLook.rollLimit).toBeLessThanOrEqual(.15);
    }
    expect(new Set(models.map(model=>model.birdLook)).size).toBe(birdIds.length);models.forEach(dispose);
    for(const id of [...groundIds,'fish']){
      const model=make(id);expect(model.birdHead).toBeNull();expect(model.birdLook).toBeNull();
      const reference=model.head,look=model.look;if(reference)reference.rotation.set(.1,.2,.03,'YXZ');const before=reference&&reference.rotation.toArray();
      api.pose(model);expect(model.head).toBe(reference);expect(model.look).toBe(look);if(reference)expect(reference.rotation.toArray()).toEqual(before);
      dispose(model);
    }
  });

  it('keeps attention timing and settled poses consistent through takeoff, alert and recovery at 30, 60 and 120 Hz',()=>{
    for(const id of ['songbird','duck','grouse','smallOwl']){
      const runs=[];
      for(const hz of [30,60,120]){
        const model=make(id);
        for(let frame=0;frame<hz*6;frame++){
          const time=frame/hz,spread=time>=1&&time<5?1:0,alerted=time>=2&&time<4;
          step(model,spread,.7,.3,alerted,time>=3&&time<5?.25:0,1/hz);
        }
        runs.push({...model.birdLook});dispose(model);
      }
      for(const key of ['phase','rate','activity']){expect(runs[0][key]).toBeCloseTo(runs[1][key],9);expect(runs[0][key]).toBeCloseTo(runs[2][key],9);}
      for(const key of ['yaw','pitch','roll']){expect(Math.abs(runs[0][key]-runs[1][key])).toBeLessThan(.006);expect(Math.abs(runs[0][key]-runs[2][key])).toBeLessThan(.006);}
    }
  });

  it('gives resting birds small independent scans, subdues scanning in flight and partially steadies the face through bank',()=>{
    const idle=make('songbird'),flight=make('songbird'),owl=make('smallOwl'),idleYaw=[],flightYaw=[];
    for(let frame=0;frame<60*16;frame++){
      step(idle,0,0,0,false,0,1/60);step(flight,1,0,0,false,0,1/60);step(owl,0,0,0,false,0,1/60);
      if(frame>180){idleYaw.push(idle.birdLook.yaw);flightYaw.push(flight.birdLook.yaw);}
    }
    const span=values=>Math.max(...values)-Math.min(...values);
    expect(span(idleYaw)).toBeGreaterThan(.04);expect(span(idleYaw)).toBeLessThan(.3);expect(span(flightYaw)).toBeLessThan(span(idleYaw)*.5);
    expect(owl.birdLook.rate).toBeLessThan(idle.birdLook.rate*.7);expect(owl.birdLook.phase-.7).toBeLessThan((idle.birdLook.phase-.7)*.7);
    for(const bank of [.3,-.3]){
      for(let frame=0;frame<180;frame++)step(flight,1,.8,.4,true,bank,1/60);
      expect(Math.sign(flight.birdLook.roll)).toBe(-Math.sign(bank));expect(Math.abs(flight.birdLook.roll)).toBeGreaterThan(.06);
      expect(Math.abs(flight.birdLook.roll)).toBeLessThanOrEqual(flight.birdLook.rollLimit+1e-12);
    }
    [idle,flight,owl].forEach(dispose);
  });

  it('keeps bounded side glances stable across rear-bearing seams, wraps bearings and settles after the threat passes',()=>{
    for(const id of birdIds){
      const model=make(id);for(let frame=0;frame<120;frame++)step(model,0,.8,.3,true,0,1/60);
      const restingYaw=model.birdLook.yaw;
      for(let frame=0;frame<240;frame++){
        step(model,1,frame%2?Math.PI-.01:-Math.PI+.01,frame%3?50:-50,true,frame%2?50:-50,1/60);
        expect(model.birdLook.lookSide).toBe(1);expect(model.birdLook.yaw).toBeGreaterThan(0);
        expect(Math.abs(model.birdLook.yaw)).toBeLessThanOrEqual(model.birdLook.yawLimit+1e-12);
        expect(Math.abs(model.birdLook.pitch)).toBeLessThanOrEqual(model.birdLook.pitchLimit+1e-12);
        expect(Math.abs(model.birdLook.roll)).toBeLessThanOrEqual(model.birdLook.rollLimit+1e-12);
      }
      expect(model.birdLook.activity).toBeGreaterThan(.99);expect(model.birdLook.yaw).toBeLessThan(restingYaw*.8);
      for(let frame=0;frame<240;frame++)step(model,0,0,0,false,0,1/60);
      expect(model.birdLook.activity).toBeLessThan(.001);expect(Math.abs(model.birdLook.yaw)).toBeLessThan(.18);expect(Math.abs(model.birdLook.pitch)).toBeLessThan(.03);dispose(model);
    }
    const ordinary=make('pigeon'),wrapped=make('pigeon');
    for(let frame=0;frame<120;frame++){step(ordinary,.5,-.6,.2,true,.1,1/60);step(wrapped,.5,-.6+Math.PI*8,.2,true,.1,1/60);}
    expect(wrapped.birdLook.yaw).toBeCloseTo(ordinary.birdLook.yaw,10);expect(wrapped.birdLook.lookSide).toBe(ordinary.birdLook.lookSide);[ordinary,wrapped].forEach(dispose);
  });

  it('rests immediately and freezes phase for reduced motion, preserves the chosen glance side and resumes gently',()=>{
    for(const id of birdIds){
      const model=make(id);for(let frame=0;frame<120;frame++)step(model,.7,-1,.5,true,.3,1/60);
      const phase=model.birdLook.phase,side=model.birdLook.lookSide;step(model,1,2,-1,true,-1,60,true);
      expect(model.birdLook.phase).toBe(phase);expect(model.birdLook.lookSide).toBe(side);
      for(const key of ['rate','activity','yaw','pitch','roll'])expect(model.birdLook[key]).toBe(0);
      expect(model.birdHead.rotation.toArray()).toEqual([0,0,0,'YXZ']);
      const frozen={...model.birdLook};step(model,1,-1,.5,true,.3,0,false);expect(model.birdLook).toEqual(frozen);
      step(model,1,-1,.5,true,.3,1/60,false);expect(model.birdLook.phase).toBeGreaterThan(phase);expect(model.birdLook.phase-phase).toBeLessThan(.03);
      expect(Math.abs(model.birdLook.yaw)).toBeLessThan(.04);expect(Math.abs(model.birdLook.pitch)).toBeLessThan(.02);expect(Math.abs(model.birdLook.roll)).toBeLessThan(.02);dispose(model);
    }
  });

  it('tracks the hunter in the actual head-parent coordinates through heading, float pitch, bank and nested transforms',()=>{
    for(const id of ['pigeon','duck','smallOwl']){
      const model=make(id),parent=new THREE.Group(),hunter={x:0,y:0,z:0},update=updateFixture(THREE,api,hunter);
      parent.add(model.root);parent.position.set(10,3,-8);parent.rotation.set(.12,.6,.07,'YXZ');parent.scale.set(1.2,.8,1.4);
      model.root.position.set(.2,.5,-.3);model.root.rotation.set(.25,1.1,-.17,'YXZ');model.pose.spread=.65;
      const prey={mesh:parent,visual:model.root,animation:model,alerted:true,bobPhase:.7};
      for(const direction of [new THREE.Vector3(.8,.6,2),new THREE.Vector3(-.8,-.6,2)]){
        model.root.updateWorldMatrix(true,true);const anchor=model.birdHead.getWorldPosition(new THREE.Vector3());
        const target=direction.clone().transformDirection(model.root.matrixWorld).multiplyScalar(12).add(anchor);hunter.x=target.x;hunter.y=target.y;hunter.z=target.z;
        const expected={...model.birdLook},bearing=Math.atan2(direction.x,direction.z),elevation=Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
        for(let frame=0;frame<180;frame++){
          api.head(expected,model.pose.spread,bearing,elevation,true,model.root.rotation.z,1/60,false,.7);update(prey,1/60,false);
        }
        for(const key of ['phase','rate','activity','yaw','pitch','roll'])expect(model.birdLook[key]).toBeCloseTo(expected[key],9);
        expect(Math.sign(model.birdLook.yaw)).toBe(Math.sign(direction.x));expect(Math.sign(model.birdLook.pitch)).toBe(-Math.sign(direction.y));expect(model.birdLook.roll).toBeGreaterThan(.05);
      }
      update(prey,60,true);expect(model.birdHead.rotation.toArray()).toEqual([0,0,0,'YXZ']);dispose(model);
    }
  });
});

describe('Bird gaze rendering and catch compatibility',()=>{
  it('keeps every extreme attention pose attached to the torso and above the original contact floor',()=>{
    const ray=new THREE.Raycaster(),direction=new THREE.Vector3(1,.37,.23).normalize(),vertex=new THREE.Vector3();
    for(const id of birdIds)for(const size of [.75,3.15]){
      const model=make(id,size),anchor=model.birdHead.position.clone();model.root.updateMatrixWorld(true);
      const floor=minimumY(model.body),bodyBounds=new THREE.Box3().setFromObject(model.body),side=model.body.material.side,positions=model.birdHead.geometry.attributes.position;
      model.body.material.side=THREE.DoubleSide;ray.near=size*1e-6;
      try{
        for(const yaw of [-model.birdLook.yawLimit,model.birdLook.yawLimit])for(const pitch of [-model.birdLook.pitchLimit,model.birdLook.pitchLimit])for(const roll of [-model.birdLook.rollLimit,model.birdLook.rollLimit]){
          Object.assign(model.birdLook,{yaw,pitch,roll});api.pose(model);model.root.updateMatrixWorld(true);
          expect(model.birdHead.position.equals(anchor)).toBe(true);expect(minimumY(model.birdHead)).toBeGreaterThanOrEqual(floor-1e-6);
          expect(bodyBounds.intersectsBox(new THREE.Box3().setFromObject(model.birdHead))).toBe(true);
          expect(new THREE.Box3().setFromObject(model.root).min.y).toBeCloseTo(floor,6);
          // The rear sphere alone must enter the actual closed torso surface;
          // bill or tuft bounds cannot satisfy this geometric neck attachment.
          let rearSphereInside=false;
          for(let index=0;index<positions.count&&!rearSphereInside;index++){
            if(positions.getZ(index)>=-size*.08)continue;
            vertex.fromBufferAttribute(positions,index).applyMatrix4(model.birdHead.matrixWorld);ray.set(vertex,direction);
            const hits=ray.intersectObject(model.body,false);let crossings=0,previous=-Infinity;
            for(const hit of hits)if(hit.distance-previous>size*1e-6){crossings++;previous=hit.distance;}
            rearSphereInside=crossings%2===1;
          }
          expect(rearSphereInside,`${id} neck overlap at yaw ${yaw}, pitch ${pitch}, roll ${roll}, size ${size}`).toBe(true);
        }
      }finally{
        model.body.material.side=side;dispose(model);
      }
    }
  });

  it('changes only head transforms while retaining all geometry, material, buffer and upload identities',()=>{
    for(const id of birdIds){
      const model=make(id),look=model.birdLook,head=model.birdHead,anchor=head.position.clone(),before=resources(model);
      const records=meshes(model).map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.entries(mesh.geometry.attributes).map(([key,attribute])=>({key,attribute,array:attribute.array,version:attribute.version}))}));
      expect(before.size).toBe(9);let maximumYaw=0;
      for(let frame=0;frame<360;frame++){
        step(model,frame%120<60?0:1,Math.sin(frame*.01)*2,.5,frame%180<120,Math.sin(frame*.03)*.3,1/60,frame>=300&&frame<330);
        maximumYaw=Math.max(maximumYaw,Math.abs(head.rotation.y));
      }
      expect(maximumYaw).toBeGreaterThan(.05);expect(model.birdLook).toBe(look);expect(model.birdHead).toBe(head);expect(head.position.equals(anchor)).toBe(true);expect(resources(model)).toEqual(before);
      for(const record of records){expect(record.mesh.geometry).toBe(record.geometry);expect(record.mesh.material).toBe(record.material);
        for(const saved of record.attributes){expect(record.geometry.attributes[saved.key]).toBe(saved.attribute);expect(saved.attribute.array).toBe(saved.array);expect(saved.attribute.version).toBe(saved.version);}}
      dispose(model);
    }
  });

  it('applies the actual reduced-motion media change immediately while paused without changing head phase or water draft',()=>{
    const models=birdIds.map(id=>make(id)),preys=models.map((model,index)=>({visual:model.root,animation:model,surfaceMode:index%2?'water-surface':'air',alerted:true,bobPhase:.7}));
    for(const [index,model] of models.entries()){
      model.pose.spread=.6;model.pose.phase=2;model.float.offset=-.15;model.root.position.y=.2;model.root.rotation.set(.15,.8,.2,'YXZ');
      for(let frame=0;frame<120;frame++)step(model,.6,1,.4,true,.2,1/60);expect(Math.abs(model.birdHead.rotation.y)).toBeGreaterThan(.05);
    }
    const phases=models.map(model=>model.birdLook.phase),update=updateFixture(THREE,api,{x:5,y:3,z:10}),fixture=preferenceFixture(THREE,{update},preys);
    fixture.change(true);expect(fixture.state()).toEqual({reduced:true,paused:true,time:750,paintCalls:1,fovCalls:1});
    for(const [index,model] of models.entries()){
      expect(model.birdLook.phase).toBe(phases[index]);for(const key of ['rate','activity','yaw','pitch','roll'])expect(model.birdLook[key]).toBe(0);
      expect(model.birdHead.rotation.toArray()).toEqual([0,0,0,'YXZ']);expect(model.pose.phase).toBe(2);expect(model.pose.spread).toBe(.6);
      expect(model.root.position.y).toBe(index%2?-.15:0);expect(model.float.offset).toBe(-.15);
    }
    fixture.change(false);expect(fixture.state().time).toBe(750);expect(fixture.state().paused).toBe(true);
    for(const [index,model] of models.entries()){expect(model.birdLook.phase).toBe(phases[index]);expect(model.birdHead.rotation.toArray()).toEqual([0,0,0,'YXZ']);dispose(model);}
  });

  it('rests the actual moving head before native carry size is measured and disposes the same retained resources once',()=>{
    for(const id of birdIds)for(const size of [.75,3.15]){
      const model=make(id,size),neutralSize=new THREE.Box3().setFromObject(model.root).getSize(new THREE.Vector3()),before=resources(model),disposals=new Map(),anchor=model.birdHead.position.clone();
      before.forEach(resource=>{disposals.set(resource,0);resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));});
      for(let frame=0;frame<120;frame++)step(model,1,1.2,.8,true,.3,1/60);expect(Math.abs(model.birdHead.rotation.y)).toBeGreaterThan(.05);
      const phase=model.birdLook.phase;model.wings.forEach((wing,index)=>{wing.rotation.set(.2,index?-.3:.3,index?.5:-.5);wing.scale.x=1;});model.tail.rotation.set(.1,.2,.3);
      const mesh=new THREE.Group();mesh.add(model.root);mesh.position.set(4,2,8);mesh.rotation.set(.3,.8,.2);model.root.rotation.set(.2,.4,-.1,'YXZ');
      const prey={mesh,visual:model.root,animation:model,data:{id,speedMps:2},groundClearance:0,bobPhase:.7};let measures=0;
      const fixture=carryFixture(THREE,prey,api,animation=>{measures++;expect(animation).toBe(model);expect(model.birdLook.phase).toBe(phase);
        for(const key of ['rate','activity','yaw','pitch','roll'])expect(model.birdLook[key]).toBe(0);expect(model.birdHead.rotation.toArray()).toEqual([0,0,0,'YXZ']);
        expect(model.birdHead.position.equals(anchor)).toBe(true);expect(model.tail.rotation.toArray().slice(0,3)).toEqual([0,0,0]);
        model.wings.forEach((wing,index)=>{const side=index===0?-1:1;expect(wing.rotation.x).toBe(0);expect(wing.rotation.y).toBe(side*1.15);expect(wing.rotation.z).toBe(side*.08);expect(wing.scale.x).toBe(.3);});
      });
      fixture.begin();expect(measures).toBe(1);expect(mesh.parent).toBe(fixture.group);expect(fixture.state().prey).toBe(prey);expect(fixture.state().materials).toHaveLength(4);
      expect(fixture.size.distanceTo(neutralSize)).toBeLessThan(1e-5);expect(resources(model)).toEqual(before);
      fixture.clear();fixture.clear();expect(mesh.parent).toBeNull();expect(Array.from(disposals.values())).toEqual(Array(9).fill(1));
    }
  });
});
