import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js'),{restorePass42CameraSource}=require('./helpers/cephalopod_pass42_reference.cjs'),source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),prior=source.includes('function updateDiveCamera(dt,snap)')?restorePass42CameraSource(source):source,owned=[];
function fixture(text=source){
  const a=text.indexOf('        function updateDiveCamera('),b=text.indexOf('        function preyCandidates()',a),update=text.slice(a,b),cycle=text.match(/function cycleCamera\(\)\{[^\n]*\}/)[0];assert.ok(a>=0&&b>a);
  const context=[
    "const gameState={paused:true,cameraMode:0,facingAngle:0,a11y:{reducedMotion:false},strikeReadyAt:1900},gameNow=1234,pendingStrike={at:1700,target:{alive:true}},octopus=new THREE.Group(),camera=new THREE.PerspectiveCamera(48,1.3,.1,100),targetHalo=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial()),cameraRay=new THREE.Raycaster(),rocks=[],inspection={active:false,snapCamera:true,yaw:.4,pitch:.3,distance:5,center:new THREE.Vector3(0,2,0)},anatomyLabels=[];",
    "octopus.position.set(0,2,0);camera.position.set(0,4,-4.6);camera.lookAt(0,2.15,0);camera.updateMatrixWorld();let ground=0,focus=0,occlusions=0;const announcements=[],canvasEl={focus(){focus++;},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};}},inspectionPanel={getBoundingClientRect(){return{left:0,top:0};}},inspectionTitle={getBoundingClientRect(){return{bottom:10};}},inspectionTools={getBoundingClientRect(){return{top:580};}},terrainHeight=()=>ground,updateInspectionOcclusion=()=>{occlusions++;},layoutCLAnatomyLabels=()=>[],clAnnounce=text=>announcements.push(text);"
  ].join('\n');
  return new Function('THREE',context+'\n'+update+'\n'+cycle+'\nreturn{gameState,octopus,camera,targetHalo,rocks,inspection,pendingStrike,cycle:cycleCamera,update:updateDiveCamera,setGround(n){ground=n;},clock(){return gameNow;},get focus(){return focus;},announcements,get occlusions(){return occlusions;}};')(T);
}
const snapshot=f=>({position:f.camera.position.toArray(),quaternion:f.camera.quaternion.toArray(),inspectionSnap:f.inspection.snapCamera}),near=(a,b)=>assert.ok(a.distanceTo(b)<1e-9,JSON.stringify([a.toArray(),b.toArray()]));
afterEach(()=>{for(const o of owned.splice(0)){o.geometry.dispose();o.material.dispose();}});
describe('Paused dive camera presentation',()=>{
  it('switches all three paused views immediately and billboards the existing target without advancing gameplay',()=>{
    const f=fixture(),pending=f.pendingStrike,actor=f.octopus.position.clone();
    for(const [name,point]of [['Side view',[-4.6,4.35,0]],['Tactical view',[0,11.15,-3]],['Follow view',[0,4.35,-4.6]]]){
      f.cycle();near(f.camera.position,new T.Vector3(...point));assert.ok(Math.abs(f.camera.quaternion.dot(f.targetHalo.quaternion))>1-1e-12);assert.equal(f.announcements.at(-1),name);near(f.octopus.position,actor);assert.equal(f.clock(),1234);assert.equal(f.pendingStrike,pending);assert.equal(pending.at,1700);assert.equal(f.gameState.strikeReadyAt,1900);assert.equal(f.inspection.snapCamera,true);
    }assert.equal(f.focus,3);
  });
  it('retains ordinary frame-based interpolation while running',()=>{
    const f=fixture(),old=fixture(prior);for(const x of [f,old]){x.gameState.paused=false;x.cycle();}assert.deepEqual(snapshot(f),snapshot(old));const before=f.camera.position.clone();f.update(.05);old.update(.05);assert.deepEqual(snapshot(f),snapshot(old));assert.ok(f.camera.position.distanceTo(before)>0);assert.ok(f.camera.position.distanceTo(new T.Vector3(-4.6,4.35,0))>0);
  });
  it('uses the real rock raycast clearance when snapping a paused view',()=>{
    const f=fixture(),look=new T.Vector3(0,2.15,0),direction=new T.Vector3(-4.6,2.2,0).normalize(),rock=new T.Mesh(new T.SphereGeometry(.55,24,16),new T.MeshBasicMaterial());owned.push(rock);rock.position.copy(look).addScaledVector(direction,2.9);rock.updateMatrixWorld(true);f.rocks.push(rock);const probe=new T.Raycaster(look,direction),hit=probe.intersectObject(rock)[0];assert.ok(hit);f.cycle();assert.ok(Math.abs(f.camera.position.distanceTo(look)-Math.max(1.5,hit.distance-.3))<1e-8);probe.far=f.camera.position.distanceTo(look);assert.equal(probe.intersectObject(rock).length,0);
  });
  it('keeps terrain clearance and leaves a hidden target orientation untouched',()=>{
    const f=fixture();f.setGround(20);f.targetHalo.visible=false;const q=f.targetHalo.quaternion.clone();f.cycle();assert.equal(f.camera.position.y,20.65);assert.deepEqual(f.targetHalo.quaternion.toArray(),q.toArray());
  });
  it('retains reduced-motion and inspection snap behavior against the actual previous camera function',()=>{
    for(const reduced of [false,true])for(const active of [false,true])for(const snap of [false,true]){
      const f=fixture(),old=fixture(prior);for(const x of [f,old]){x.gameState.a11y.reducedMotion=reduced;x.inspection.active=active;x.inspection.snapCamera=snap;x.update(.05);}assert.deepEqual(snapshot(f),snapshot(old));assert.equal(f.occlusions,old.occlusions);
    }
  });
  it('does not redirect the inspection camera when a View event is invoked during inspection',()=>{
    const f=fixture();f.inspection.active=true;const before=snapshot(f);f.cycle();assert.deepEqual(snapshot(f),before);assert.equal(f.gameState.cameraMode,1);
  });
});
