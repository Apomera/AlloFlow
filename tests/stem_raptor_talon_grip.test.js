import {describe, it, expect, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const baseline = require('./fixtures/raptor-talon-grip-before.cjs');
const source = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
function body(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw Error('Missing production helper ' + name);
  let end = source.indexOf('{', start), depth = 1;
  while (depth) { end++; if (end >= source.length) throw Error('Unclosed helper ' + name); if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
  return source.slice(start, end + 1);
}
const build = quality => Function('THREE', 'graphicsQuality', 'return (' + body('createRaptorFootGeometry') + ');')(THREE, quality);
const before = quality => Function('THREE', 'graphicsQuality', 'return (' + baseline.footFactorySource + ');')(THREE, quality);
const grip = Function(body('raptorCarryGrip') + ';return raptorCarryGrip;')();
const variants = ['low', 'balanced'].flatMap(quality => [
  {quality, label:'hawk', owl:false, opposed:false},
  {quality, label:'owl', owl:true, opposed:true},
  {quality, label:'osprey', owl:false, opposed:true}
]);
const bytes = attribute => Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
const digest = attribute => createHash('sha256').update(bytes(attribute)).digest('hex');
const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
function blended(geometry, index, extension, amount) {
  const base = point(geometry.attributes.position, index);
  return base.multiplyScalar(1 - extension)
    .addScaledVector(point(geometry.morphAttributes.position[0], index), extension * (1 - amount))
    .addScaledVector(point(geometry.morphAttributes.position[1], index), extension * amount);
}
function uniqueResources(root) {
  const result = new Set();
  root.traverse(object => { if (object.geometry) result.add(object.geometry); if (Array.isArray(object.material)) object.material.forEach(material => result.add(material)); else if (object.material) result.add(object.material); });
  return result;
}
function watched(root) {
  const counts = new Map();
  uniqueResources(root).forEach(resource => { counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1)); });
  return counts;
}
function makePrey() {
  const mesh = new THREE.Group(), visual = new THREE.Group();
  visual.add(new THREE.Mesh(new THREE.BoxGeometry(.45, .26, .55), new THREE.MeshStandardMaterial())); mesh.add(visual);
  return {mesh, visual, animation:{kind:'fixture'}, data:{id:'fixture', label:'Fixture prey', speedMps:2}, bobPhase:.7};
}

// Execute the actual carry, pause, preference and animation functions. UI/audio
// stubs below provide their surrounding closure, without replacing foot behavior.
const animationStart = source.indexOf('var talonStrikeAmount =');
const animationEnd = source.indexOf('var tailResting=', animationStart);
if (animationStart < 0 || animationEnd < 0) throw Error('Missing production talon animation block');
const fixtureFactory = Function('THREE', 'feet', `
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(talonGroup);feet.forEach(function(foot){talonGroup.add(foot);});
  var raptorFeet=feet,carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var raptor={landed:false,crashed:false,pullingUp:false,diving:false,cameraRoll:.2,x:5,y:3,z:10};
  var activePerch=null,footContactVector=new THREE.Vector3(),wingPose={fold:0},talonThrow={active:false};
  var talonPreparation=0,strikeFeedbackActive=false,strikeAge=0;
  function terrainHeightAt(){return 0;}
  var simPaused=false,missionOutcome='active',studyActive=false,studySavedCamera=null,animId=0,disposed=false,lastT=0,windGain=null;
  var pauseOverlay={setAttribute:function(){}},paintCalls=0,flightState='glide';
  function clearHeldInputs(){}function updateFlightState(value){flightState=value;}function setFlightAudioGate(){}
  function publishControlState(){}function refreshKeyGuide(){}function updatePerchHud(){}function updatePracticeHud(){}function updateMissionClock(){}
  function repaintPausedFlight(){paintCalls++;}function rhAnnounce(){}function leaveStudy(){studyActive=false;}
  function requestAnimationFrame(){return 1;}function cancelAnimationFrame(){}function loop(){}
  var starsList=null,gazeTarget=null,gazeState={yaw:.2,pitch:.1},headMesh=new THREE.Group(),tail=new THREE.Group();
  var preyMeshes=[],vegetationWindState={x:1,z:1},vegetationWind={value:new THREE.Vector3(1,0,1)},speedLineMat={opacity:.3};
  var cameraTargetBlend=.3,cameraLateralLead=.2,camera=new THREE.PerspectiveCamera(),cameraRollAxis=new THREE.Vector3();
  camera.position.set(0,0,5);
  var diveVig=null,rainSystem={visible:true},snowSystem={visible:true},rainGeometry=new THREE.BufferGeometry(),snowGeometry=new THREE.BufferGeometry(),activePrecipitationCount=10;
  var STRIKE_FX_SLOT_COUNT=0,strikeFxSlotActive=[],strikeFxActiveCount=0,strikeContactActiveCount=0;
  var strikeFxPoints={visible:false},strikeContactMesh={visible:false,instanceMatrix:{needsUpdate:false}},strikeFxPositionAttribute={needsUpdate:false};
  function clearTouchdownFx(){}function hideStrikeFxSlot(){}function updateTargetFeedback(){}function updateFlightFov(){}
  ${body('dampingAlpha')}
  ${body('raptorCarryGrip')}
  ${body('raptorCarryOpacity')}
  ${body('raptorFootSurfaceClearance')}
  ${body('clearCarriedPrey')}
  ${body('beginCarriedPrey')}
  ${body('updateCarriedPrey')}
  ${body('setPaused')}
  ${body('onReducedMotionChange')}
  function frame(dt){${source.slice(animationStart, animationEnd)}}
  return {
    begin:function(prey,pausedCatch){scene.add(prey.mesh);beginCarriedPrey(prey,pausedCatch);},
    clear:clearCarriedPrey, pause:setPaused, preference:function(matches){onReducedMotionChange({matches:matches});},
    outcome:function(value){missionOutcome=value;}, terrain:function(value){terrainHeightAt=function(){return value;};},
    visual:function(fold,preparation,throwing,landed){wingPose.fold=fold;talonPreparation=preparation;talonThrow.active=throwing;raptor.landed=landed;},
    frame:function(dt){if(!simPaused){motionNow+=dt*1000;frame(dt);}},
    at:function(age,dt){if(carriedPrey)motionNow=carriedPrey.startedAt+age;updateCarriedPrey(dt);},
    clearance:raptorFootSurfaceClearance, group:talonGroup, feet:feet,
    state:function(){return {carry:carriedPrey,time:motionNow,paused:simPaused,reduced:_rmFX,paintCalls:paintCalls,extension:strikeFootExtension,flightState:flightState};},
    finish:function(){clearCarriedPrey();var resources=new Set();feet.forEach(function(foot){resources.add(foot.geometry);resources.add(foot.material);});resources.forEach(function(resource){resource.dispose();});rainGeometry.dispose();snowGeometry.dispose();}
  };
`);
function fixture(variant = variants[0]) {
  const make = build(variant.quality), material = new THREE.MeshStandardMaterial({morphTargets:true, morphNormals:true});
  const feet = [-1, 1].map(side => { const mesh = new THREE.Mesh(make(side, variant.owl, variant.opposed), material); mesh.position.x=side*.135; return mesh; });
  return fixtureFactory(THREE, feet);
}
function advance(api, milliseconds, hz = 60) {
  let remaining = milliseconds;
  while (remaining > 1e-8) { const step = Math.min(remaining, 1000 / hz); api.frame(step / 1000); remaining -= step; }
}

describe('Carried-prey grip geometry', () => {
  it('preserves the exact pass25 tucked and standing buffers, topology and bounds in every foot variant', () => {
    expect(baseline.sourceSha256).toBe('17acdd9ac63c52ed2e150e7519555dabe013b9843780778fc0db5342c1267d98');
    for (const variant of variants) for (const side of [-1, 1]) {
      const current = build(variant.quality)(side, variant.owl, variant.opposed), reference = before(variant.quality)(side, variant.owl, variant.opposed);
      // Hash each complete typed-array view. Deep Buffer assertions enumerate
      // every byte through assertion machinery on the memory-constrained host.
      for (const key of ['position', 'normal', 'color', 'rhFootSurface']) expect(digest(current.attributes[key])).toBe(digest(reference.attributes[key]));
      expect(digest(current.index)).toBe(digest(reference.index));
      for (const key of ['position', 'normal']) expect(digest(current.morphAttributes[key][0])).toBe(digest(reference.morphAttributes[key][0]));
      expect(current.morphAttributes.position).toHaveLength(2); expect(current.morphAttributes.normal).toHaveLength(2); expect(current.morphTargetsRelative).toBe(false);
      expect(current.userData).toEqual(reference.userData);
      current.computeBoundingBox(); reference.computeBoundingBox(); current.computeBoundingSphere(); reference.computeBoundingSphere();
      expect(current.boundingBox.min.toArray()).toEqual(reference.boundingBox.min.toArray()); expect(current.boundingBox.max.toArray()).toEqual(reference.boundingBox.max.toArray());
      expect(current.boundingSphere.center.toArray()).toEqual(reference.boundingSphere.center.toArray()); expect(current.boundingSphere.radius).toBe(reference.boundingSphere.radius);
      current.dispose(); reference.dispose();
    }
  });

  it('pins the entire leg and gathers all four mirrored toes and claws inside the original extended bounds', () => {
    for (const variant of variants) {
      const left = build(variant.quality)(-1, variant.owl, variant.opposed), right = build(variant.quality)(1, variant.owl, variant.opposed);
      const extended = right.morphAttributes.position[0], held = right.morphAttributes.position[1], surface = right.attributes.rhFootSurface, stride = extended.count / 9;
      const bounds = new THREE.Box3().setFromBufferAttribute(extended); let maximumError=0, outside=0, changed=0, yChanges=0;
      for (let i=0; i<extended.count; i++) {
        const part=Math.floor(i/stride), along=surface.getX(i), smooth=along*along*(3-2*along);
        const factor=part===0?1:part%2===1?1+(.62-1)*smooth:.62+(.58-.62)*smooth;
        maximumError=Math.max(maximumError,Math.abs(held.getX(i)-extended.getX(i)*factor),Math.abs(held.getZ(i)-(.12+(extended.getZ(i)-.12)*factor)));
        if(held.getY(i)!==extended.getY(i))yChanges++;
        if(bounds.distanceToPoint(point(held,i))>1e-6)outside++;
        if(point(held,i).distanceTo(point(extended,i))>.001)changed++;
        if(part===0)expect(point(held,i).toArray()).toEqual(point(extended,i).toArray());
      }
      expect(maximumError).toBeLessThan(1e-6); expect(yChanges).toBe(0); expect(outside).toBe(0); expect(changed).toBeGreaterThan(extended.count/2);
      for(const kind of ['position','normal']) for(const target of [0,1]) {
        const a=left.morphAttributes[kind][target],b=right.morphAttributes[kind][target];let mirrorError=0;
        for(let i=0;i<a.count;i++)mirrorError=Math.max(mirrorError,Math.abs(a.getX(i)+b.getX(i)),Math.abs(a.getY(i)-b.getY(i)),Math.abs(a.getZ(i)-b.getZ(i)));
        expect(mirrorError).toBeLessThan(1e-6);
      }
      left.dispose(); right.dispose();
    }
  });

  it('retains closed nondegenerate surfaces and finite normals throughout the two-target convex blend', {timeout:180000}, () => {
    for(const variant of variants) {
      const geometry=build(variant.quality)(1,variant.owl,variant.opposed),indices=geometry.index.array,edges=new Map();
      for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const u=indices[i+j],v=indices[i+(j+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');edges.set(key,(edges.get(key)||0)+1);}
      expect([...edges.values()].every(count=>count===2)).toBe(true);
      let minimumArea=Infinity,minimumNormal=Infinity,invalid=0;
      for(const extension of [0,.25,.5,.75,1])for(const amount of [0,.25,.5,.75,1]) {
        const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
        for(let i=0;i<indices.length;i+=3){a.copy(blended(geometry,indices[i],extension,amount));b.copy(blended(geometry,indices[i+1],extension,amount));c.copy(blended(geometry,indices[i+2],extension,amount));minimumArea=Math.min(minimumArea,b.sub(a).cross(c.sub(a)).length());}
        for(let i=0;i<geometry.attributes.normal.count;i++){
          const n=point(geometry.attributes.normal,i).multiplyScalar(1-extension).addScaledVector(point(geometry.morphAttributes.normal[0],i),extension*(1-amount)).addScaledVector(point(geometry.morphAttributes.normal[1],i),extension*amount);
          if(![n.x,n.y,n.z].every(Number.isFinite))invalid++;minimumNormal=Math.min(minimumNormal,n.length());
        }
      }
      expect(invalid).toBe(0); expect(minimumArea).toBeGreaterThan(1e-9); expect(minimumNormal).toBeGreaterThan(.9);geometry.dispose();
    }
  });

  it('computes retained unit grip normals from the actual curled indexed surface', () => {
    for(const variant of variants)for(const side of [-1,1]){
      const geometry=build(variant.quality)(side,variant.owl,variant.opposed),target=geometry.morphAttributes.normal[1],check=new THREE.BufferGeometry();
      check.setIndex(geometry.index);check.setAttribute('position',geometry.morphAttributes.position[1]);check.computeVertexNormals();
      expect(bytes(target)).toEqual(bytes(check.attributes.normal));let invalid=0,maximumError=0;
      for(let i=0;i<target.count;i++){const n=point(target,i);if(![n.x,n.y,n.z].every(Number.isFinite))invalid++;maximumError=Math.max(maximumError,Math.abs(n.length()-1));}
      expect(invalid).toBe(0);expect(maximumError).toBeLessThan(1e-6);check.dispose();geometry.dispose();
    }
  });
});

describe('Carried-prey talon grip lifecycle', () => {
  it('eases closed over 160 ms and immediately supports a paused or reduced-motion catch', () => {
    expect([-100,0,40,80,120,160,500].map(age=>grip(age,false,false))).toEqual([0,0,.578125,.875,.984375,1,1]);
    for(const age of [0,40,80,160,500]){expect(grip(age,true,false)).toBe(1);expect(grip(age,false,true)).toBe(1);}
    const values=Array.from({length:33},(_,i)=>grip(i*5,false,false));
    for(let i=1;i<values.length;i++)expect(values[i]).toBeGreaterThanOrEqual(values[i-1]);
  });

  it('uses actual carry age consistently at 30, 60 and 120 Hz while keeping prey anchor and lifetime', () => {
    const results=[];
    for(const hz of [30,60,120]){
      const api=fixture(),prey=makePrey();api.begin(prey,false);const initial=api.state();
      expect(initial.carry.grip).toBe(0);expect(initial.carry.feet).toBe(api.feet);expect(initial.carry.until-initial.carry.startedAt).toBe(1100);expect(api.feet.map(foot=>foot.morphTargetInfluences)).toEqual([[1,0],[1,0]]);
      const anchor={...initial.carry.anchor};advance(api,80,hz);expect(api.state().carry.grip).toBeCloseTo(.875,12);
      advance(api,80,hz);expect(api.state().carry.grip).toBe(1);expect(api.feet.map(foot=>foot.morphTargetInfluences)).toEqual([[0,1],[0,1]]);
      expect(api.state().carry.anchor).toEqual(anchor);expect(prey.mesh.parent).toBe(api.group);results.push(api.state().carry.grip);api.finish();
    }
    expect(results).toEqual([1,1,1]);
  });

  it('starts paused-catch and reduced-motion catches in the secured pose before any frame', () => {
    for(const mode of ['pausedCatch','reduced']){
      const api=fixture(),prey=makePrey();if(mode==='reduced')api.preference(true);const time=api.state().time;api.begin(prey,mode==='pausedCatch');
      expect(api.state().time).toBe(time);expect(api.state().carry.grip).toBe(1);expect(api.feet.map(foot=>foot.morphTargetInfluences)).toEqual([[0,1],[0,1]]);expect(prey.mesh.parent).toBe(api.group);api.finish();
    }
  });

  it('secures an ordinary or completed-mission pause immediately and freezes the held pose', () => {
    for(const outcome of ['active','success']){
      const api=fixture(),prey=makePrey();api.begin(prey,false);advance(api,40);expect(api.state().carry.grip).toBeCloseTo(.578125,12);
      if(outcome==='success')api.outcome(outcome);const time=api.state().time,until=api.state().carry.until;api.pause(true,false);
      expect(api.state().paused).toBe(true);expect(api.state().carry.grip).toBe(1);expect(api.feet.map(foot=>foot.morphTargetInfluences)).toEqual([[0,1],[0,1]]);
      const position=prey.mesh.position.toArray(),rotation=prey.mesh.rotation.toArray();api.frame(60);
      expect(api.state().time).toBe(time);expect(api.state().carry.until).toBe(until);expect(prey.mesh.position.toArray()).toEqual(position);expect(prey.mesh.rotation.toArray()).toEqual(rotation);
      api.pause(false,false);expect(api.state().paused).toBe(outcome!=='active');expect(api.state().carry.grip).toBe(1);api.finish();
    }
  });

  it('applies the actual reduced-motion handler during pause and never reopens an already secured grip', () => {
    const api=fixture(),prey=makePrey();api.begin(prey,false);advance(api,40);api.pause(true,false);
    const time=api.state().time,until=api.state().carry.until;api.preference(true);
    expect(api.state().reduced).toBe(true);expect(api.state().time).toBe(time);expect(api.state().carry.until).toBe(until);expect(api.state().carry.grip).toBe(1);
    expect(api.feet.map(foot=>foot.morphTargetInfluences)).toEqual([[0,1],[0,1]]);expect(prey.mesh.rotation.toArray().slice(0,3)).toEqual([0,0,0]);
    api.preference(false);expect(api.state().time).toBe(time);expect(api.state().carry.grip).toBe(1);api.pause(false,false);advance(api,20);
    expect(api.state().carry.grip).toBe(1);expect(api.feet.map(foot=>foot.morphTargetInfluences)).toEqual([[0,1],[0,1]]);api.finish();
  });

  it('clears the held target while preserving extension and disposes only prey resources once', () => {
    const api=fixture(),feetDisposals=watched(api.group),first=makePrey(),firstDisposals=watched(first.mesh);api.begin(first,true);
    api.feet.forEach(foot=>{foot.morphTargetInfluences[0]=.24;foot.morphTargetInfluences[1]=.36;});api.clear();api.clear();
    expect(api.state().carry).toBeNull();expect(first.mesh.parent).toBeNull();expect(api.feet.map(foot=>foot.morphTargetInfluences)).toEqual([[.6,0],[.6,0]]);
    expect([...firstDisposals.values()]).toEqual([1,1]);expect([...feetDisposals.values()].every(count=>count===0)).toBe(true);
    const second=makePrey(),secondDisposals=watched(second.mesh);api.begin(second,false);const third=makePrey(),thirdDisposals=watched(third.mesh);api.begin(third,true);
    expect(second.mesh.parent).toBeNull();expect([...secondDisposals.values()]).toEqual([1,1]);api.at(1100,0);
    expect(api.state().carry).toBeNull();expect(third.mesh.parent).toBeNull();expect([...thirdDisposals.values()]).toEqual([1,1]);expect(api.feet.every(foot=>foot.morphTargetInfluences[1]===0)).toBe(true);
    expect([...feetDisposals.values()].every(count=>count===0)).toBe(true);api.finish();expect([...feetDisposals.values()].every(count=>count===1)).toBe(true);
  });

  it('reports actual two-target world clearance under grounded and pitched/banked foot transforms', () => {
    for(const variant of variants){
      const api=fixture(variant);api.terrain(1.2);
      for(const [rotation,extension,amount] of [[[0,0,0],1,0],[[0,0,0],1,1],[[.4,.2,-.3],.7,.45],[[-.5,-.3,.2],1,1]]){
        api.group.position.set(3,2.5,8);api.group.rotation.set(...rotation);api.feet.forEach(foot=>{foot.morphTargetInfluences[0]=extension*(1-amount);foot.morphTargetInfluences[1]=extension*amount;});api.group.updateMatrixWorld(true);
        let expected=Infinity;for(const foot of api.feet)for(let i=0;i<foot.geometry.attributes.position.count;i++)expected=Math.min(expected,blended(foot.geometry,i,extension,amount).applyMatrix4(foot.matrixWorld).y-1.2);
        expect(api.clearance()).toBeCloseTo(expected,12);
      }
      api.finish();
    }
  });

  it('retains foot meshes, material, attributes, bytes and weights across 360 production frames per variant', {timeout:180000}, () => {
    for(const variant of variants){
      const api=fixture(variant),records=api.feet.map(foot=>({foot,geometry:foot.geometry,material:foot.material,weights:foot.morphTargetInfluences,
        slots:[...Object.keys(foot.geometry.attributes).map(key=>({read:()=>foot.geometry.attributes[key],attribute:foot.geometry.attributes[key]})),{read:()=>foot.geometry.index,attribute:foot.geometry.index},
          ...Object.entries(foot.geometry.morphAttributes).flatMap(([kind,targets])=>targets.map((attribute,index)=>({read:()=>foot.geometry.morphAttributes[kind][index],attribute})))].map(slot=>({...slot,array:slot.attribute.array,version:slot.attribute.version,digest:digest(slot.attribute)}))}));
      const prey=makePrey();api.begin(prey,false);const normalSpy=vi.spyOn(THREE.BufferGeometry.prototype,'computeVertexNormals'),attributeSpy=vi.spyOn(THREE.BufferGeometry.prototype,'setAttribute');let invalid=0,replaced=0,disagreement=0;
      try{
        for(let frame=0;frame<360;frame++){
          api.visual(frame>=180&&frame<240?1:0,frame>=240?.3:0,frame>=280&&frame<300,frame>=180&&frame<240);api.frame(1/60);
          for(const record of records){const weights=record.foot.morphTargetInfluences,total=weights[0]+weights[1],held=api.state().carry;
            if(weights!==record.weights)replaced++;if(!weights.every(Number.isFinite)||weights.some(value=>value<0)||total>1+1e-12)invalid++;
            if(Math.abs(weights[1]-total*(held?held.grip:0))>1e-12)disagreement++;
          }
        }
        expect(replaced).toBe(0);expect(invalid).toBe(0);expect(disagreement).toBe(0);expect(normalSpy).not.toHaveBeenCalled();expect(attributeSpy).not.toHaveBeenCalled();
      }finally{normalSpy.mockRestore();attributeSpy.mockRestore();}
      expect(new Set(api.feet.map(foot=>foot.material)).size).toBe(1);expect(api.feet).toHaveLength(2);
      for(const record of records){expect(record.foot.geometry).toBe(record.geometry);expect(record.foot.material).toBe(record.material);for(const slot of record.slots){expect(slot.read()).toBe(slot.attribute);expect(slot.attribute.array).toBe(slot.array);expect(slot.attribute.version).toBe(slot.version);expect(digest(slot.attribute)).toBe(slot.digest);}}
      api.finish();
    }
  });
});
