import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing '+name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(end>=source.length)throw Error('Unclosed '+name);if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const digest=a=>createHash('sha256').update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength)).digest('hex');
const factory=Function('THREE',`
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(talonGroup);var raptorFeet=[{morphTargetInfluences:[0,0]},{morphTargetInfluences:[0,0]}];
  var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var simPaused=false,missionOutcome='active',studyActive=false,studySavedCamera=null,animId=0,disposed=false,lastT=0,windGain=null;
  var raptor={landed:false,crashed:false,pullingUp:false,diving:false,cameraRoll:.2,x:5,y:3,z:10};
  var pauseOverlay={setAttribute:function(){}},paintCalls=0;
  function clearHeldInputs(){}function updateFlightState(){}function setFlightAudioGate(){}
  function publishControlState(){}function refreshKeyGuide(){}function updatePerchHud(){}function updatePracticeHud(){}function updateMissionClock(){}
  function repaintPausedFlight(){paintCalls++;}function rhAnnounce(){}function leaveStudy(){studyActive=false;}
  function requestAnimationFrame(){return 1;}function cancelAnimationFrame(){}function loop(){}
  var starsList=null,gazeTarget=null,gazeState={yaw:.2,pitch:.1},headMesh=new THREE.Group(),tail=new THREE.Group();
  var preyMeshes=[],vegetationWindState={x:1,z:1},vegetationWind={value:new THREE.Vector3(1,0,1)},speedLineMat={opacity:.3};
  var cameraTargetBlend=.3,cameraLateralLead=.2,camera=new THREE.PerspectiveCamera(),cameraRollAxis=new THREE.Vector3();camera.position.set(0,0,5);
  var diveVig=null,rainSystem={visible:true},snowSystem={visible:true},rainGeometry=new THREE.BufferGeometry(),snowGeometry=new THREE.BufferGeometry(),activePrecipitationCount=10;
  var STRIKE_FX_SLOT_COUNT=0,strikeFxSlotActive=[],strikeFxActiveCount=0,strikeContactActiveCount=0;
  var strikeFxPoints={visible:false},strikeContactMesh={visible:false,instanceMatrix:{needsUpdate:false}},strikeFxPositionAttribute={needsUpdate:false};
  function clearTouchdownFx(){}function hideStrikeFxSlot(){}function updateTargetFeedback(){}function updateFlightFov(){}
  var wingPose={fold:0};
  ${['dampingAlpha','raptorCarryGrip','raptorCarryOpacity','clearCarriedPrey','beginCarriedPrey','updateCarriedPrey','setPaused','onReducedMotionChange'].map(body).join('\n')}
  return {begin:function(prey,pausedCatch){scene.add(prey.mesh);beginCarriedPrey(prey,pausedCatch);},clear:clearCarriedPrey,
    at:function(age,dt=0){if(carriedPrey)motionNow=carriedPrey.startedAt+age;updateCarriedPrey(dt);},
    frame:function(ms){if(!simPaused){motionNow+=ms;updateCarriedPrey(ms/1000);}},pause:setPaused,
    preference:function(matches){onReducedMotionChange({matches:matches});},
    state:function(){return {carry:carriedPrey,time:motionNow,paused:simPaused,reduced:_rmFX,paintCalls:paintCalls};},
    group:talonGroup,feet:raptorFeet,finish:function(){clearCarriedPrey();rainGeometry.dispose();snowGeometry.dispose();}};
`);
function prey(){
  const materials=[
    new THREE.MeshStandardMaterial({opacity:1,transparent:false,depthWrite:true}),
    new THREE.MeshStandardMaterial({opacity:.76,transparent:true,depthWrite:false}),
    new THREE.MeshStandardMaterial({opacity:.66,transparent:true,depthWrite:true}),
    new THREE.MeshStandardMaterial({opacity:.82,transparent:false,depthWrite:false}),
  ];
  const geometry=new THREE.BoxGeometry(.4,.3,.8),visual=new THREE.Group(),mesh=new THREE.Group();
  const a=new THREE.Mesh(geometry,[materials[0],materials[1],materials[0],materials[2],materials[3],materials[0]]),b=new THREE.Mesh(geometry,materials[0]);
  a.position.set(.1,.15,0);b.position.set(-.1,-.15,.1);visual.add(a,b);mesh.add(visual);
  return {mesh,visual,animation:{kind:'generic'},data:{id:'test-animal',label:'Test animal'},materials,geometry};
}
const flags=p=>p.materials.map(m=>({opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,version:m.version}));
const originals=[{opacity:1,transparent:false,depthWrite:true},{opacity:.76,transparent:true,depthWrite:false},{opacity:.66,transparent:true,depthWrite:true},{opacity:.82,transparent:false,depthWrite:false}];
function expectedFlags(fade,versions){return originals.map((m,i)=>({...m,opacity:m.opacity*fade,transparent:fade<1||m.transparent,depthWrite:fade<1?false:m.depthWrite,version:versions[i]}));}
function watched(p){const counts=new Map([p.geometry,...p.materials].map(r=>[r,0]));counts.forEach((_,r)=>r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1)));return counts;}

describe('Carried prey solid surfaces and fade depth',()=>{
  it('captures every unique original material once without changing solid opacity, depth flags or program versions',()=>{
    const api=factory(THREE),p=prey(),before=flags(p);api.begin(p,false);
    expect(flags(p)).toEqual(before);expect(api.state().carry.materials).toHaveLength(4);
    expect(new Set(api.state().carry.materials.map(e=>e.material))).toEqual(new Set(p.materials));
    for(const entry of api.state().carry.materials){const i=p.materials.indexOf(entry.material);expect(entry.opacity).toBe(originals[i].opacity);expect(entry.transparent).toBe(originals[i].transparent);expect(entry.depthWrite).toBe(originals[i].depthWrite);}
    expect(api.state().carry.until-api.state().carry.startedAt).toBe(1100);expect(p.mesh.parent).toBe(api.group);api.finish();
  });
  it('preserves the hold through exactly 900 ms before switching only affected material flags once',()=>{
    const api=factory(THREE),p=prey();api.begin(p,false);
    for(const age of [0,40,160,400,899,900]){api.at(age);expect(flags(p)).toEqual(expectedFlags(1,[0,0,0,0]));}
    api.at(901);const fade=1-(3*.005*.005-2*.005*.005*.005);
    const actual=flags(p),wanted=expectedFlags(fade,[1,0,1,1]);for(let i=0;i<actual.length;i++){expect(actual[i].opacity).toBeCloseTo(wanted[i].opacity,12);expect({...actual[i],opacity:0}).toEqual({...wanted[i],opacity:0});}api.finish();
  });
  it('retains the original smooth opacity curve, translucent wing baselines and unchanged steady fade programs',()=>{
    const api=factory(THREE),p=prey();api.begin(p,false);
    for(const [age,fade] of [[950,.84375],[1000,.5],[1050,.15625],[1099,.00007475]]){api.at(age);const actual=flags(p),wanted=expectedFlags(fade,[1,0,1,1]);for(let i=0;i<actual.length;i++){expect(actual[i].opacity).toBeCloseTo(wanted[i].opacity,12);expect({...actual[i],opacity:0}).toEqual({...wanted[i],opacity:0});}}
    expect(api.state().carry.prey).toBe(p);api.finish();
  });
  it('changes no model, child transform, authored buffer bytes or upload versions through hold and fade',()=>{
    const api=factory(THREE),p=prey(),owners=p.visual.children.map(o=>({mesh:o,geometry:o.geometry,material:o.material,matrix:o.matrix.clone(),position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray()}));
    p.visual.children.forEach(o=>o.updateMatrix());owners.forEach(e=>e.matrix.copy(e.mesh.matrix));
    const attrs=Object.values(p.geometry.attributes).map(a=>({a,array:a.array,version:a.version,hash:digest(a)})),index=p.geometry.index,indexHash=digest(index);
    api.begin(p,false);for(let age=0;age<1100;age+=20)api.at(age,1/60);
    expect(api.state().carry.prey).toBe(p);expect(p.visual.children).toEqual(owners.map(e=>e.mesh));
    for(const e of owners){expect(e.mesh.geometry).toBe(e.geometry);expect(e.mesh.material).toBe(e.material);expect(e.mesh.position.toArray()).toEqual(e.position);expect(e.mesh.rotation.toArray()).toEqual(e.rotation);expect(e.mesh.scale.toArray()).toEqual(e.scale);e.mesh.updateMatrix();expect(e.mesh.matrix.equals(e.matrix)).toBe(true);}
    for(const e of attrs){expect(e.a.array).toBe(e.array);expect(e.a.version).toBe(e.version);expect(digest(e.a)).toBe(e.hash);}expect(p.geometry.index).toBe(index);expect(digest(index)).toBe(indexHash);api.finish();
  });
  it('freezes the actual paused fade without advancing its clock, opacity, flags or program versions',()=>{
    const api=factory(THREE),p=prey();api.begin(p,false);api.at(1000);api.pause(true,false);const before=flags(p),time=api.state().time,until=api.state().carry.until;
    api.frame(60000);expect(flags(p)).toEqual(before);expect(api.state().time).toBe(time);expect(api.state().carry.until).toBe(until);expect(api.state().carry.grip).toBe(1);api.finish();
  });
  it('restores each original depth flag immediately for reduced motion during a paused fade and returns to that same fade age',()=>{
    const api=factory(THREE),p=prey();api.begin(p,false);api.at(1000);api.pause(true,false);const time=api.state().time,until=api.state().carry.until;
    api.preference(true);expect(flags(p)).toEqual(expectedFlags(1,[2,0,2,2]));expect(api.state().time).toBe(time);expect(api.state().carry.until).toBe(until);
    api.preference(true);expect(flags(p)).toEqual(expectedFlags(1,[2,0,2,2]));api.frame(60000);expect(api.state().time).toBe(time);
    api.preference(false);expect(flags(p)).toEqual(expectedFlags(.5,[3,0,3,3]));expect(api.state().time).toBe(time);expect(api.state().paused).toBe(true);
    api.preference(false);expect(flags(p)).toEqual(expectedFlags(.5,[3,0,3,3]));api.finish();
  });
  it('keeps an initially reduced-motion or paused catch solid and retains reduced-motion opacity until original expiry',()=>{
    for(const mode of ['reduced','pausedCatch']){const api=factory(THREE),p=prey();if(mode==='reduced')api.preference(true);api.begin(p,mode==='pausedCatch');expect(flags(p)).toEqual(expectedFlags(1,[0,0,0,0]));expect(api.state().carry.grip).toBe(1);
      if(mode==='reduced'){for(const age of [900,950,1000,1099]){api.at(age);expect(flags(p)).toEqual(expectedFlags(1,[0,0,0,0]));}}api.finish();}
  });
  it('clears at exactly 1100 ms and disposes shared geometries and array materials once without affecting feet',()=>{
    const api=factory(THREE),p=prey(),counts=watched(p),feet=api.feet.map(f=>f.morphTargetInfluences);api.begin(p,false);api.at(1099);expect(p.mesh.parent).toBe(api.group);expect([...counts.values()]).toEqual([0,0,0,0,0]);
    api.at(1100);api.clear();expect(api.state().carry).toBeNull();expect(p.mesh.parent).toBeNull();expect([...counts.values()]).toEqual([1,1,1,1,1]);api.feet.forEach((f,i)=>{expect(f.morphTargetInfluences).toBe(feet[i]);expect(f.morphTargetInfluences[1]).toBe(0);});api.finish();
  });
  it('disposes a fading catch once on replacement and captures fresh material baselines for the next animal',()=>{
    const api=factory(THREE),first=prey(),old=watched(first);api.begin(first,false);api.at(1000);const second=prey(),next=watched(second);api.begin(second,true);
    expect(first.mesh.parent).toBeNull();expect([...old.values()]).toEqual([1,1,1,1,1]);expect(flags(second)).toEqual(expectedFlags(1,[0,0,0,0]));expect(api.state().carry.prey).toBe(second);expect(api.state().carry.grip).toBe(1);
    api.clear();api.clear();expect([...old.values()]).toEqual([1,1,1,1,1]);expect([...next.values()]).toEqual([1,1,1,1,1]);api.finish();
  });
});
