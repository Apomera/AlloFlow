import {describe,it as vitestIt,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const birdIds=['pigeon','mourningDove','songbird','shorebird','duck','waterfowl','grouse','ptarmigan','smallOwl'];
// This file performs exhaustive geometry checks on a heavily loaded desktop.
// Keep the generous runner budget local; every assertion stays unchanged.
const it=(name,test)=>vitestIt(name,test,180000);
function body(name){
  const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing helper '+name);
  let end=source.indexOf('{',start),depth=1;
  while(depth){end++;if(end>=source.length)throw Error('Unclosed helper '+name);if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const names=['preyBirdPalette','createPreyBirdBodyGeometry','createPreyWingGeometry','createPreyTailGeometry','preyKindFor','preyEscapeProfile',
  'mergeGroundPreyParts','buildGroundPreyParts','buildMammalPreyParts','buildRainforestPreyParts',
  'bendFishPreyGeometry','createFishBodyGeometry','createFishFinGeometry','buildPreyVisual','advancePreyVisualPose',
  'advanceBirdPreyHead','applyBirdPreyHeadPose'];
const api=Function('THREE',names.map(body).join('\n')+';return {palette:preyBirdPalette,wing:createPreyWingGeometry,build:buildPreyVisual,advance:advancePreyVisualPose,escape:preyEscapeProfile,head:advanceBirdPreyHead,headPose:applyBirdPreyHeadPose};')(THREE);
const transformStart=source.indexOf('else pm2.animation.wings.forEach(function(wing, wingIndex) {');
const transformEnd=source.indexOf("if(pm2.animation.gait&&pm2.surfaceMode==='terrain')",transformStart);
if(transformStart<0||transformEnd<0)throw Error('Missing production prey surface transforms');
const transform=Function('pm2','preyPose','motionPhase','_rmFX',source.slice(transformStart+5,transformEnd));
const flightStart=source.indexOf('var flightTarget = pm2.alerted ? Math.max(0, pm2.escapeProfile.climb) : 0;');
const flightEnd=source.indexOf("if(pm2.animation.kind==='fish'){",flightStart);
if(flightStart<0||flightEnd<0)throw Error('Missing production prey climb and bob transforms');
const advanceFlight=Function('pm2','dt','motionNow','phase','advancePreyVisualPose',`
  var _rmFX=false,preyPreviousY=pm2.mesh.position.y;
  function dampingAlpha(rate,elapsed){return 1-Math.exp(-rate*elapsed);}
  function terrainHeightAt(){return 0;}
  pm2.bobPhase=phase;
  ${source.slice(flightStart,flightEnd)}
  }
`);
const make=(id,size=1)=>api.build({id,color:0x9ca3af,speedMps:2},size);
function meshes(model){const result=[];model.root.traverse(object=>{if(object.isMesh)result.push(object);});return result;}
function resources(model){const result=new Set();meshes(model).forEach(mesh=>{result.add(mesh.geometry);result.add(mesh.material);});return result;}
function dispose(model){resources(model).forEach(resource=>resource.dispose());}
function point(attribute,index){return new THREE.Vector3().fromBufferAttribute(attribute,index);}
function blend(base,target,index,weight){return point(base,index).lerp(point(target,index),weight);}
function finite(attribute){expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);}
function faces(geometry,position,size){
  const index=geometry.index.array;
  for(let i=0;i<index.length;i+=3){
    const a=point(position,index[i]),b=point(position,index[i+1]),c=point(position,index[i+2]);
    const normal=b.sub(a).cross(c.sub(a));
    expect(normal.length()).toBeGreaterThan(size*size*1e-7);expect(normal.y).toBeGreaterThan(0);
  }
}
function render(model,dt=1/60,reduced=false,alerted=true,height=2,now=0){
  api.advance(model.pose,1,1,height,now,.7,alerted,dt,reduced);transform({animation:model},model.pose,model.pose.phase,reduced);
}
const carryFixture=Function('THREE','prey','api','observe',`
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(prey.mesh);var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[0]},{morphTargetInfluences:[0]}];
  var advanceBirdPreyHead=api.head,applyBirdPreyHeadPose=api.headPose;
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var originalMeasure=carriedPreyBounds.setFromObject;
  carriedPreyBounds.setFromObject=function(object){observe(prey.animation);return originalMeasure.call(this,object);};
  ${body('clearCarriedPrey')}
  ${body('beginCarriedPrey')}
  return {begin:function(){beginCarriedPrey(prey);},clear:clearCarriedPrey,group:talonGroup,state:function(){return carriedPrey;},size:carriedPreySize};
`);
const preferenceFixture=Function('THREE','preys',`
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
  function updateBirdPreyHead(){}
  ${body('onReducedMotionChange')}
  return {change:function(matches){onReducedMotionChange({matches:matches});},state:function(){return {reduced:_rmFX,paused:simPaused,time:motionNow,paintCalls:paintCalls};}};
`);

describe('Bird prey outer-wing flex geometry',()=>{
  it('fixes both shoulders and inner halves while bending all nine mirrored outer wings at both sizes',()=>{
    for(const id of birdIds)for(const size of [.75,3.15]){
      const palette=api.palette(id),left=api.wing(size,-1,palette),right=api.wing(size,1,palette);
      for(const geometry of [left,right]){
        expect(geometry.attributes.position.count).toBe(45);expect(geometry.index.count).toBe(192);
        expect(geometry.morphTargetsRelative).toBe(false);expect(geometry.morphAttributes.position).toHaveLength(2);expect(geometry.morphAttributes.normal).toHaveLength(2);
        finite(geometry.attributes.position);faces(geometry,geometry.attributes.position,size);
        for(const target of geometry.morphAttributes.position){
          expect(target.count).toBe(45);finite(target);faces(geometry,target,size);
          for(let vertex=0;vertex<45;vertex++){
            const base=geometry.attributes.position;
            expect(target.getZ(vertex)).toBe(base.getZ(vertex));
            if(vertex<25)expect(point(target,vertex).toArray()).toEqual(point(base,vertex).toArray());
            else{expect(Math.abs(target.getY(vertex)-base.getY(vertex))).toBeLessThan(size*.1);expect(Math.abs(target.getX(vertex)-base.getX(vertex))).toBeLessThan(size*.02);}
          }
          expect(Math.abs(target.getY(40)-geometry.attributes.position.getY(40))).toBeGreaterThan(size*.06);
        }
      }
      for(let targetIndex=0;targetIndex<2;targetIndex++)for(let vertex=0;vertex<45;vertex++)for(const kind of ['position','normal']){
        const a=left.morphAttributes[kind][targetIndex],b=right.morphAttributes[kind][targetIndex];
        expect(a.getX(vertex)).toBe(-b.getX(vertex));expect(a.getY(vertex)).toBe(b.getY(vertex));expect(a.getZ(vertex)).toBe(b.getZ(vertex));
      }
      left.dispose();right.dispose();
    }
  });

  it('stores correctly recomputed normals that retain finite, smooth lighting through every blend',()=>{
    for(const id of birdIds)for(const size of [.75,3.15])for(const side of [-1,1]){
      const geometry=api.wing(size,side,api.palette(id)),base=geometry.attributes.normal;
      for(let targetIndex=0;targetIndex<2;targetIndex++){
        const target=geometry.morphAttributes.normal[targetIndex],recomputed=new THREE.BufferGeometry();
        recomputed.setIndex(geometry.index);recomputed.setAttribute('position',geometry.morphAttributes.position[targetIndex]);recomputed.computeVertexNormals();finite(target);
        expect(Array.from(target.array)).toEqual(Array.from(recomputed.attributes.normal.array));
        for(let vertex=0;vertex<45;vertex++){
          expect(point(target,vertex).length()).toBeCloseTo(1,5);
          for(const weight of [0,.25,.5,.75,1]){const normal=blend(base,target,vertex,weight).normalize();expect(normal.y).toBeGreaterThan(.7);expect(normal.length()).toBeCloseTo(1,10);}
          if(vertex<20)expect(point(target,vertex).toArray()).toEqual(point(base,vertex).toArray());
        }
        expect(point(target,42).distanceTo(point(base,42))).toBeGreaterThan(.15);recomputed.dispose();
      }
      geometry.dispose();
    }
  });

  it('keeps base vertices, both targets and intermediate flex inside conservative culling bounds',()=>{
    for(const id of birdIds)for(const size of [.75,3.15])for(const side of [-1,1]){
      const geometry=api.wing(size,side,api.palette(id)),box=geometry.boundingBox,sphere=geometry.boundingSphere;
      expect(box.isEmpty()).toBe(false);expect(Number.isFinite(sphere.radius)).toBe(true);expect(sphere.radius).toBeGreaterThan(0);
      for(const target of geometry.morphAttributes.position)for(const weight of [0,.125,.25,.5,.75,.875,1])for(let vertex=0;vertex<45;vertex++){
        const p=blend(geometry.attributes.position,target,vertex,weight);
        expect(box.distanceToPoint(p)).toBeLessThan(size*1e-6);expect(p.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius+size*1e-6);
      }
      geometry.dispose();
    }
  });
});

describe('Bird prey wing-flex timing and retained rendering',()=>{
  it('lags the existing wingbeat, stays bounded and relaxes when the wings fold',()=>{
    const pose={heading:0,bank:0,spread:1,phase:0,rate:18,wingAmplitude:.65,motionBlend:1};
    const samples=[];
    for(const phase of [0,Math.PI/2,Math.PI,Math.PI*1.5]){pose.phase=phase/1.7;api.advance(pose,0,1,2,999999,.7,true,0,false);samples.push({angle:pose.wingAngle,flex:pose.wingFlex});}
    expect(Math.abs(samples[0].angle)).toBeLessThan(1e-12);expect(samples[0].flex).toBeCloseTo(-1,10);
    expect(samples[1].angle).toBeGreaterThan(.6);expect(Math.abs(samples[1].flex)).toBeLessThan(1e-12);
    expect(Math.abs(samples[2].angle)).toBeLessThan(1e-12);expect(samples[2].flex).toBeCloseTo(1,10);
    expect(samples[3].angle).toBeLessThan(-.6);expect(Math.abs(samples[3].flex)).toBeLessThan(1e-12);
    for(let frame=0;frame<180;frame++){api.advance(pose,0,1,0,frame*1000/60,.7,false,1/60,false);expect(Math.abs(pose.wingFlex)).toBeLessThanOrEqual(pose.spread+1e-12);}
    expect(pose.spread).toBeLessThan(1e-12);expect(Math.abs(pose.wingFlex)).toBeLessThan(1e-12);
  });

  it('preserves oscillator rates across 30, 60 and 120 Hz, freezes on reduced motion and gently resumes',()=>{
    const results=[];
    for(const hz of [30,60,120]){
      const model=make('shorebird');
      for(let frame=0;frame<hz*3;frame++)render(model,1/hz,false,frame>=hz,2,frame*1000/hz);
      expect(model.pose.phase).toBeCloseTo(.7+8+36-10*(1-Math.exp(-12))/6,9);expect(model.pose.rate).toBeCloseTo(18-10*Math.exp(-12),9);
      const frozen={phase:model.pose.phase,rate:model.pose.rate,wingAmplitude:model.pose.wingAmplitude};render(model,30,true,true,2,90000);
      expect({phase:model.pose.phase,rate:model.pose.rate,wingAmplitude:model.pose.wingAmplitude}).toEqual(frozen);expect(model.pose.wingFlex).toBe(0);
      expect(model.wings.map(wing=>wing.morphTargetInfluences)).toEqual([[0,0],[0,0]]);
      render(model,0,false,true,2,180000);expect(model.pose.wingFlex).toBe(0);expect(model.pose.motionBlend).toBe(0);expect(model.pose.phase).toBe(frozen.phase);
      render(model,1/hz,false,true,2,180000+1000/hz);expect(model.pose.motionBlend).toBeGreaterThan(0);expect(model.pose.motionBlend).toBeLessThan(.24);expect(Math.abs(model.pose.wingFlex)).toBeLessThan(.24);
      for(let frame=1;frame<hz;frame++)render(model,1/hz,false,true,2,180000+(frame+1)*1000/hz);
      results.push({...model.pose});dispose(model);
    }
    for(const key of ['phase','rate','wingAmplitude','motionBlend','wingAngle','wingFlex']){expect(results[0][key]).toBeCloseTo(results[1][key],9);expect(results[0][key]).toBeCloseTo(results[2][key],9);}
  });

  it('changes only retained transforms and morph weights through the actual production flight block',()=>{
    for(const id of birdIds){
      const model=make(id),before=resources(model),records=meshes(model).map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,weights:mesh.morphTargetInfluences,
        attributes:[...Object.values(mesh.geometry.attributes),...(mesh.geometry.index?[mesh.geometry.index]:[]),...Object.values(mesh.geometry.morphAttributes).flat()].map(attribute=>({attribute,array:attribute.array,version:attribute.version,values:Array.from(attribute.array)}))}));
      expect(meshes(model)).toHaveLength(5);expect(before.size).toBe(9);expect(new Set(meshes(model).map(mesh=>mesh.material)).size).toBe(4);
      model.wings.forEach(wing=>{expect(wing.material.morphTargets).toBe(true);expect(wing.material.morphNormals).toBe(true);expect(wing.material.vertexColors).toBe(true);expect(wing.material.map).toBeNull();});
      let maximum=0,minimum=0;
      for(let frame=0;frame<360;frame++){
        render(model,1/60,frame>=240&&frame<270,frame>=60&&frame<180,frame<180?2:0,frame*1000/60);
        maximum=Math.max(maximum,model.pose.wingFlex);minimum=Math.min(minimum,model.pose.wingFlex);
        for(const wing of model.wings){const weights=wing.morphTargetInfluences;expect(weights.every(value=>Number.isFinite(value)&&value>=0&&value<=1)).toBe(true);expect(weights[0]*weights[1]).toBe(0);expect(weights[0]-weights[1]).toBe(model.pose.wingFlex);}
      }
      expect(maximum).toBeGreaterThan(.9);expect(minimum).toBeLessThan(-.9);expect(resources(model)).toEqual(before);
      for(const record of records){expect(record.mesh.geometry).toBe(record.geometry);expect(record.mesh.material).toBe(record.material);expect(record.mesh.morphTargetInfluences).toBe(record.weights);
        for(const saved of record.attributes){expect(saved.attribute.array).toBe(saved.array);expect(saved.attribute.version).toBe(saved.version);expect(Array.from(saved.attribute.array)).toEqual(saved.values);}}
      dispose(model);
    }
  });

  it('resets wing flex immediately on the actual media preference change while paused and preserves the water draft',()=>{
    const models=birdIds.map(id=>make(id)),preys=models.map((model,index)=>({visual:model.root,animation:model,surfaceMode:index%2?'water-surface':'air',alerted:true,bobPhase:.7}));
    models.forEach(model=>{for(let frame=0;frame<120;frame++)render(model);model.pose.wingFlex=.8;model.wings.forEach(wing=>{wing.morphTargetInfluences[0]=.8;wing.morphTargetInfluences[1]=0;});model.float.offset=-.15;model.root.position.y=.2;});
    const frozen=models.map(model=>({phase:model.pose.phase,spread:model.pose.spread,rate:model.pose.rate,amplitude:model.pose.wingAmplitude})),fixture=preferenceFixture(THREE,preys);
    fixture.change(true);expect(fixture.state()).toEqual({reduced:true,paused:true,time:750,paintCalls:1});
    for(const [index,model] of models.entries()){
      expect({phase:model.pose.phase,spread:model.pose.spread,rate:model.pose.rate,amplitude:model.pose.wingAmplitude}).toEqual(frozen[index]);expect(model.pose.wingFlex).toBe(0);expect(model.pose.motionBlend).toBe(0);
      expect(model.wings.map(wing=>wing.morphTargetInfluences)).toEqual([[0,0],[0,0]]);expect(model.root.position.y).toBe(index%2?-.15:0);expect(model.float.offset).toBe(-.15);
    }
    fixture.change(false);expect(fixture.state().paused).toBe(true);expect(fixture.state().time).toBe(750);
    models.forEach(model=>{expect(model.pose.wingFlex).toBe(0);expect(model.wings.map(wing=>wing.morphTargetInfluences)).toEqual([[0,0],[0,0]]);dispose(model);});
  });
});

describe('Wing-flex contact and catch compatibility',()=>{
  it('introduces no new ground crossings through native takeoff, bank recovery and landing at both sizes',()=>{
    const dt=1/60,basePoint=new THREE.Vector3(),bentPoint=new THREE.Vector3();
    for(const id of birdIds)for(const climb of [api.escape({id}).climb,...(id==='shorebird'?[9]:[])])for(const size of [.75,3.15])for(const seed of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const turnSide of [-1,1]){
      const model=make(id,size),mesh=new THREE.Group();mesh.add(model.root);
      const prey={mesh,visual:model.root,animation:model,groundClearance:size*.42,flightHeight:0,depthOffset:0,
        escapeProfile:{climb},surfaceMode:'terrain',vx:1,vz:1,alerted:false};
      let minimumBase=Infinity,minimumFlex=Infinity,baselineClipFrames=0,newClipFrames=0,maximumSpread=0,maximumFlex=0,maximumBank=0;
      for(let frame=0;frame<300;frame++){
        prey.alerted=frame>=12&&frame<90;
        const heading=frame>=45?turnSide*Math.PI/2:0;prey.vx=Math.sin(heading);prey.vz=Math.cos(heading);
        advanceFlight(prey,dt,frame*1000/60,seed,api.advance);transform(prey,model.pose,model.pose.phase,false);
        maximumSpread=Math.max(maximumSpread,model.pose.spread);maximumFlex=Math.max(maximumFlex,Math.abs(model.pose.wingFlex));
        maximumBank=Math.max(maximumBank,Math.abs(model.pose.bank));
        {
          // Turn while high, then retain the heading through descent. The
          // production bank response eases toward neutral as the bird lands.
          mesh.updateMatrixWorld(true);
          let frameBase=Infinity,frameFlex=Infinity;
          for(const wing of model.wings){
            const base=wing.geometry.attributes.position,targets=wing.geometry.morphAttributes.position,weights=wing.morphTargetInfluences;
            for(let vertex=0;vertex<base.count;vertex++){
              basePoint.fromBufferAttribute(base,vertex);bentPoint.copy(basePoint);
              for(let target=0;target<2;target++)if(weights[target]){
                bentPoint.x+=(targets[target].getX(vertex)-base.getX(vertex))*weights[target];
                bentPoint.y+=(targets[target].getY(vertex)-base.getY(vertex))*weights[target];
                bentPoint.z+=(targets[target].getZ(vertex)-base.getZ(vertex))*weights[target];
              }
              basePoint.applyMatrix4(wing.matrixWorld);bentPoint.applyMatrix4(wing.matrixWorld);
              frameBase=Math.min(frameBase,basePoint.y);frameFlex=Math.min(frameFlex,bentPoint.y);
            }
          }
          minimumBase=Math.min(minimumBase,frameBase);minimumFlex=Math.min(minimumFlex,frameFlex);
          if(frameBase<-size*1e-6)baselineClipFrames++;
          else if(frameFlex<-size*1e-6)newClipFrames++;
        }
      }
      expect(maximumSpread).toBeGreaterThan(.99);expect(maximumFlex).toBeGreaterThan(.9);expect(maximumBank).toBeGreaterThan(.12);expect(maximumBank).toBeLessThanOrEqual(.24);expect(prey.flightHeight).toBeLessThan(.001);expect(model.pose.spread).toBeLessThan(.001);expect(Math.abs(model.pose.bank)).toBeLessThan(.001);
      expect(Number.isFinite(minimumFlex)).toBe(true);
      expect(newClipFrames,`${id}, size ${size}, climb ${climb}, phase ${seed}, turn ${turnSide}: flex min ${minimumFlex}, base min ${minimumBase}, baseline clip frames ${baselineClipFrames}`).toBe(0);
      dispose(model);
    }
  });

  it('keeps conservative folded bounds above the original body floor and neutralizes flex before native carry measurement',()=>{
    for(const id of birdIds)for(const size of [.75,3.15]){
      const model=make(id,size),neutralBounds=new THREE.Box3().setFromObject(model.root),neutralSize=neutralBounds.getSize(new THREE.Vector3()),before=resources(model),disposals=new Map();
      expect(neutralBounds.min.y).toBeCloseTo(-size*.3024,6);expect(neutralSize.x/size).toBeLessThan(1.75);expect(neutralSize.y/size).toBeLessThan(1.25);expect(neutralSize.z/size).toBeLessThan(2.6);
      before.forEach(resource=>{disposals.set(resource,0);resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));});
      for(let frame=0;frame<120;frame++)render(model);model.pose.wingFlex=.9;model.wings.forEach(wing=>{wing.morphTargetInfluences[0]=.9;wing.morphTargetInfluences[1]=0;});
      api.head(model.birdLook,1,1,.4,true,.2,1,false,.7);api.headPose(model);model.tail.rotation.set(.2,-.3,.1);
      const phase=model.pose.phase,mesh=new THREE.Group();mesh.add(model.root);mesh.position.set(4,2,8);mesh.rotation.set(.3,.8,.2);model.root.rotation.set(.2,.4,-.1,'YXZ');
      const prey={mesh,visual:model.root,animation:model,data:{id,speedMps:2},groundClearance:0,bobPhase:.7};let measures=0;
      const fixture=carryFixture(THREE,prey,api,animation=>{
        measures++;expect(animation).toBe(model);expect(model.pose.wingFlex).toBe(0);expect(model.pose.phase).toBe(phase);
        expect(model.wings.map(wing=>wing.morphTargetInfluences)).toEqual([[0,0],[0,0]]);expect(model.tail.rotation.toArray().slice(0,3)).toEqual([0,0,0]);expect(model.birdHead.rotation.toArray()).toEqual([0,0,0,'YXZ']);
        model.wings.forEach((wing,index)=>{const side=index===0?-1:1;expect(wing.rotation.x).toBe(0);expect(wing.rotation.y).toBe(side*1.15);expect(wing.rotation.z).toBe(side*.08);expect(wing.scale.x).toBe(.3);});
      });
      fixture.begin();expect(measures).toBe(1);expect(mesh.parent).toBe(fixture.group);expect(fixture.state().materials).toHaveLength(4);expect(fixture.size.distanceTo(neutralSize)).toBeLessThan(1e-5);expect(resources(model)).toEqual(before);
      fixture.clear();fixture.clear();expect(mesh.parent).toBeNull();expect(Array.from(disposals.values())).toEqual(Array(9).fill(1));
    }
  });

  it('leaves generic wing geometry and motion outside the bird flex path',()=>{
    for(const side of [-1,1]){
      const geometry=api.wing(2,side);expect(geometry.attributes.position.count).toBe(45);expect(geometry.morphAttributes.position).toBeUndefined();expect(geometry.morphAttributes.normal).toBeUndefined();
      const wing=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()),animation={kind:'mammal',wings:[wing],legs:[],tail:null};
      transform({animation},{spread:1,wingFlex:.9,rate:18},.7,false);expect(wing.morphTargetInfluences).toBeUndefined();expect(wing.rotation.z).toBeCloseTo(Math.sin(.7*1.7)*.7,10);
      transform({animation},{spread:1,wingFlex:.9,rate:18},.7,true);expect(wing.rotation.z).toBe(.08);geometry.dispose();wing.material.dispose();
    }
  });

  it('keeps ground and fish models on their own existing rendering paths',()=>{
    for(const id of ['rodent','rabbit','fox','coati','fish']){
      const model=make(id);expect(model.kind).not.toBe('bird');expect(model.wings).toHaveLength(0);expect(model.birdHead).toBeNull();
      for(const mesh of meshes(model))if(model.kind!=='fish')expect(mesh.geometry.morphAttributes.position).toBeUndefined();dispose(model);
    }
  });
});
