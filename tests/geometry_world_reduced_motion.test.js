import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
function slice(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a)throw new Error('Missing motion source '+start);return source.slice(a,b);}
const resolve=new Function(slice('function resolveGeometryRenderProfile(preference, runtime)','window.StemLab.GeometryWorldRenderProfile')+';return resolveGeometryRenderProfile;')();
const quality=slice('engine.applyRenderQuality = function(preference)','engine.applyRenderQuality(d.renderQuality');
const npcSource=slice('// Animate NPCs —','// ── NPC proximity chime');
const dustSource=slice('if (!engine._dustMotes) engine._dustMotes = [];','// ── Animate clouds');
const fixtures=[];
function fixture(motion=true){
  const material=()=>new THREE.MeshBasicMaterial({transparent:true,opacity:0});
  const sprite=()=>new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,opacity:0}));
  const npc={data:{position:[2,0,3],question:{},dialogue:'A test character'},body:new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),head:new THREE.Object3D(),label:sprite(),prompt:sprite(),qMark:sprite(),_speechBubble:sprite(),_ring:new THREE.Mesh(new THREE.RingGeometry(),material()),eyeL:new THREE.Object3D(),eyeR:new THREE.Object3D(),_arms:[new THREE.Object3D(),new THREE.Object3D()]};
  npc._eyeParts=[npc.eyeL,npc.eyeR,new THREE.Object3D(),new THREE.Object3D()];npc._arms[0].userData.armSide=-1;npc._arms[1].userData.armSide=1;
  const e={_ambientMotionEnabled:motion,npcs:[npc],_answeredRef:[false],camera:new THREE.PerspectiveCamera(),clock:{getElapsedTime:()=>1},_particles:[],scene:new THREE.Scene(),velocity:new THREE.Vector3(1,2,3),moveState:{forward:true}};
  e.camera.position.set(20,4,20);e.scene.add(npc.body);e.scene.add(npc._ring);fixtures.push({e,npc});
  const update=new Function('engine','window','answeredNpcs','geometryWorldBlinkScale','dt','THREE','Math',npcSource);
  function frame(time,random=.5){e.clock.getElapsedTime=()=>time;const math=Object.create(Math);math.random=()=>random;update(e,{THREE},[],()=>.2,.016,THREE,math);}
  return{e,npc,frame};
}
function snapshot(n){return{body:n.body.position.toArray(),head:n.head.position.toArray(),bodyRotation:n.body.rotation.toArray(),headRotation:n.head.rotation.toArray(),questionPosition:n.qMark.position.toArray(),questionScale:n.qMark.scale.toArray(),eyes:n._eyeParts.map(e=>e.scale.y),arms:n._arms.map(a=>[a.rotation.x,a.rotation.z]),ringScale:n._ring.scale.toArray(),ringOpacity:n._ring.material.opacity,prompt:n.prompt.position.toArray(),promptOpacity:n.prompt.material.opacity,speech:n._speechBubble.position.toArray(),speechOpacity:n._speechBubble.material.opacity,emissive:n.body.material.emissiveIntensity};}
afterEach(()=>{for(const{e,npc}of fixtures.splice(0)){const seen=new Set();for(const object of [...e.scene.children,npc.label,npc.prompt,npc.qMark,npc._speechBubble])object.traverse(o=>{for(const r of [o.geometry,o.material])if(r&&r.dispose&&!seen.has(r)){seen.add(r);r.dispose();}});}vi.restoreAllMocks();});

describe('Reduced motion is independent of Geometry World rendering detail',()=>{
  it.each(['balanced','detail'])('keeps %s rendering features with optional animation disabled',tier=>{
    const ordinary=resolve(tier,{reducedMotion:false,hardwareConcurrency:8}),reduced=resolve(tier,{reducedMotion:true,hardwareConcurrency:8});
    expect(reduced.tier).toBe(tier);expect(reduced.maxPixelRatio).toBe(ordinary.maxPixelRatio);expect(reduced.shadows).toBe(ordinary.shadows);expect(reduced.postFx).toBe(ordinary.postFx);expect(ordinary.ambientMotion).toBe(true);expect(reduced.ambientMotion).toBe(false);expect(reduced.reason).toContain('Reduced motion');
  });
  it('retains automatic Saver selection for an OS motion preference',()=>{const p=resolve('auto',{reducedMotion:true,hardwareConcurrency:8});expect(p.tier).toBe('saver');expect(p.ambientMotion).toBe(false);});
  it.each([true,false])('keeps Saver still when reducedMotion=%s',reducedMotion=>{expect(resolve('saver',{reducedMotion}).ambientMotion).toBe(false);});
  it('reapplying the same graphics tier updates motion without changing navigation state',()=>{
    const camera=new THREE.PerspectiveCamera(),velocity=new THREE.Vector3(1,2,3),moveState={forward:true};let reduced=false;
    const e={camera,velocity,moveState,blocks:{},_matCache:{},_renderProfile:{tier:'detail'},renderer:{shadowMap:{},setPixelRatio:vi.fn()}};
    new Function('engine','resolveGeometryRenderProfile','isMobile','window','navigator','container',quality)(e,resolve,false,{devicePixelRatio:2,matchMedia:()=>({matches:reduced})},{hardwareConcurrency:8},{clientWidth:640,clientHeight:480});
    e.applyRenderQuality('detail');expect(e._ambientMotionEnabled).toBe(true);reduced=true;e.applyRenderQuality('detail');expect(e._ambientMotionEnabled).toBe(false);expect(e._postFxEnabled).toBe(true);expect(e.renderer.shadowMap.enabled).toBe(true);
    expect(e.camera).toBe(camera);expect(e.velocity.toArray()).toEqual([1,2,3]);expect(e.moveState).toBe(moveState);reduced=false;e.applyRenderQuality('detail');expect(e._ambientMotionEnabled).toBe(true);
  });
});

describe('NPC decorative motion and readable feedback',()=>{
  it('holds idle NPCs, markers, eyes and arms still across animation frames',()=>{
    const f=fixture(false);f.npc._celebrateUntil=5;f.npc._shakeUntil=5;f.npc.eyeL.scale.y=.2;f.npc._arms[0].rotation.x=.8;f.frame(1);const before=snapshot(f.npc);f.frame(3);
    expect(snapshot(f.npc)).toEqual(before);expect(f.npc.body.position.toArray()).toEqual([2.5,.75,3.5]);expect(f.npc._eyeParts.every(e=>e.scale.y===1)).toBe(true);expect(f.npc._arms.map(a=>a.rotation.x)).toEqual([0,0]);expect(f.npc.qMark.visible).toBe(true);
  });
  it('preserves normal decorative movement when motion is enabled',()=>{const f=fixture(true);f.frame(1);const before=snapshot(f.npc);f.frame(2);expect(snapshot(f.npc).body).not.toEqual(before.body);expect(snapshot(f.npc).questionScale).not.toEqual(before.questionScale);});
  it('keeps proximity cues visible and stable without moving the camera or velocity',()=>{
    const f=fixture(false);f.e.camera.position.set(2.5,2,5.5);const camera=f.e.camera.position.toArray();f.frame(1);expect(f.npc.prompt.material.opacity).toBe(.9);expect(f.npc._ring.material.opacity).toBe(.5);const before=snapshot(f.npc);f.frame(3);expect(snapshot(f.npc)).toEqual(before);expect(f.e.camera.position.toArray()).toEqual(camera);expect(f.e.velocity.toArray()).toEqual([1,2,3]);expect(f.e.moveState.forward).toBe(true);
    f.e.camera.position.set(2.5,2,8);f.frame(4);expect(f.npc._speechBubble.material.opacity).toBe(.7);expect(f.npc.prompt.material.opacity).toBe(0);
  });
  it.each([false,true])('applies answered tint with an existing ring when ambient motion=%s',motion=>{
    const f=fixture(motion);f.e._answeredRef=[true];expect(()=>f.frame(1,motion?.5:0)).not.toThrow();expect(f.npc._answeredTinted).toBe(true);expect(f.npc.body.material.emissive.getHex()).toBe(0x22c55e);
    if(!motion){expect(f.npc.body.material.emissiveIntensity).toBe(.15);expect(f.npc.qMark.visible).toBe(false);expect(f.npc.qMark.material.opacity).toBe(0);expect(f.e._particles).toHaveLength(0);const before=snapshot(f.npc);f.frame(2,0);expect(snapshot(f.npc)).toEqual(before);}
  });
  it('disposes remaining dust when optional motion is disabled',()=>{
    const f=fixture(false),d=new THREE.Mesh(new THREE.SphereGeometry(.02,4,4),new THREE.MeshBasicMaterial());Object.assign(d,{_age:0,_life:10,_phase:0,_speed:.2});f.e._dustMotes=[d];f.e.scene.add(d);let geos=0,mats=0;d.geometry.addEventListener('dispose',()=>geos++);d.material.addEventListener('dispose',()=>mats++);
    new Function('engine','THREE','dt','t',dustSource)(f.e,THREE,.016,1);expect(f.e._dustMotes).toHaveLength(0);expect(d.parent).toBe(null);expect(geos).toBe(1);expect(mats).toBe(1);
  });
});
