import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),prior=require('./helpers/cephalopod_pass68_reference.cjs').restorePass68Source(source),owned=[];
function region(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i,a);return s.slice(i,j);}
function fixture(text=source){
  const context=`const octopus=new THREE.Group(),bodyScale=1,camera=new THREE.PerspectiveCamera(48,1.3,.1,150),cameraRay=new THREE.Raycaster(),rocks=[],gameState={cameraMode:0,facingAngle:0,paused:false,a11y:{reducedMotion:false},pendingStrike:null,score:17,strikeReadyAt:1900},inspection={active:false,snapCamera:true,yaw:.4,pitch:.3,distance:5,center:new THREE.Vector3(0,2,0)},anatomyLabels=[];
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,.8,2),new THREE.MeshStandardMaterial());octopus.add(body);let selectedPrey=null,octopusStrikeVisual=null,squidStrikeVisual=null,ground=()=>-10,occlusions=0;
  const canvasEl={getBoundingClientRect(){return{left:0,top:0,width:800,height:600};}},inspectionPanel={getBoundingClientRect(){return{left:0,top:0};}},inspectionTitle={getBoundingClientRect(){return{bottom:10};}},inspectionTools={getBoundingClientRect(){return{top:580};}},terrainHeight=(x,z)=>ground(x,z),updateInspectionOcclusion=()=>{occlusions++;},layoutCLAnatomyLabels=()=>[];
  octopus.position.set(0,2,0);camera.position.set(0,4,-4.6);const lastLook=new THREE.Vector3(),nativeLookAt=camera.lookAt;camera.lookAt=function(v){lastLook.copy(v);return nativeLookAt.call(this,v);};camera.lookAt(new THREE.Vector3(0,2.15,0));camera.updateMatrixWorld();`;
  const f=new Function('THREE',context+region(text,'        var huntCameraFrame=','        function preyCandidates()')+`;return{camera,octopus,body,rocks,inspection,gameState,frame:huntCameraFrame,lastLook,update:updateDiveCamera,terrain:terrainHeight,setGround(fn){ground=fn;},get occlusions(){return occlusions;}};`)(T);owned.push(f.body);return f;
}
const snapshot=f=>({position:f.camera.position.toArray(),quaternion:f.camera.quaternion.toArray(),look:f.lastLook.toArray(),up:f.camera.up.toArray(),inspectionSnap:f.inspection.snapCamera});
function assertAim(f){const wanted=f.lastLook.clone().sub(f.camera.position).normalize();assert.ok(f.camera.getWorldDirection(new T.Vector3()).distanceTo(wanted)<1e-10);assert.deepEqual(f.camera.up.toArray(),[0,1,0]);assert.ok(Math.abs(new T.Vector3(1,0,0).applyQuaternion(f.camera.quaternion).y)<1e-10,'The camera retains a level horizon without roll');}
function rockAlongView(f){const direction=f.camera.position.clone().sub(f.lastLook).normalize(),rock=new T.Mesh(new T.SphereGeometry(.5,16,12),new T.MeshBasicMaterial());rock.position.copy(f.lastLook).addScaledVector(direction,2.8);rock.updateMatrixWorld();f.rocks.push(rock);owned.push(rock);assert.ok(new T.Raycaster(f.lastLook,direction).intersectObject(rock).length);return rock;}
afterEach(()=>owned.splice(0).forEach(o=>{o.geometry.dispose();o.material.dispose();}));

describe('Camera clearance at the actual interpolated position',()=>{
  it('reproduces and fixes terrain penetration between two valid camera endpoints in Follow, Side, Tactical and rock-obstructed Hunt',()=>{
    for(const mode of [0,1,2,3]){const f=fixture(),old=fixture(prior);for(const x of [f,old]){x.gameState.cameraMode=mode;x.octopus.position.set(8,2,0);x.setGround(px=>8*Math.exp(-px*px/4));x.update(0,true);if(mode===3)rockAlongView(x);assert.ok(x.camera.position.y>=x.terrain(x.camera.position.x,x.camera.position.z)+.65);x.camera.position.set(-3,2,-4.6);assert.ok(x.camera.position.y>=x.terrain(-3,-4.6)+.65);x.update(.05,false);}
      assert.ok(old.camera.position.y<old.terrain(old.camera.position.x,old.camera.position.z)+.65,'Accepted camera crosses the ridge below clearance in mode '+mode);assert.ok(f.camera.position.y>=f.terrain(f.camera.position.x,f.camera.position.z)+.65,'Actual interpolated camera clears terrain in mode '+mode);assert.equal(f.camera.position.x,old.camera.position.x);assert.equal(f.camera.position.z,old.camera.position.z);assert.deepEqual(f.lastLook.toArray(),old.lastLook.toArray());assertAim(f);
    }
  });
  it('enforces the same clearance for zero-delta recovery, ordinary frames and reduced motion in every dive view',()=>{
    for(const mode of [0,1,2,3])for(const dt of [0,.05])for(const reduced of [false,true]){const f=fixture();f.gameState.cameraMode=mode;f.gameState.a11y.reducedMotion=reduced;f.update(0,true);if(mode===3)rockAlongView(f);f.setGround(()=>4);f.camera.position.set(0,-2,-4.6);f.update(dt,false);assert.ok(f.camera.position.y>=4.65);assert.ok(f.camera.position.toArray().every(Number.isFinite));assertAim(f);}
  });
  it('preserves flat-ground interpolation, snap, reduced motion and inspection controls exactly',()=>{
    for(const mode of [0,1,2,3])for(const reduced of [false,true])for(const inspecting of [false,true])for(const snap of [false,true]){const f=fixture(),old=fixture(prior);for(const x of [f,old]){x.gameState.cameraMode=mode;x.gameState.facingAngle=.75;x.gameState.a11y.reducedMotion=reduced;x.inspection.active=inspecting;x.setGround(()=>-10);x.update(.05,snap);}assert.deepEqual(snapshot(f),snapshot(old));assert.equal(f.occlusions,old.occlusions);assertAim(f);}
  });
  it('retains Hunt fitting and rock shortening whenever actual terrain clearance is already satisfied',()=>{
    for(const obstructed of [false,true]){const f=fixture(),old=fixture(prior);for(const x of [f,old]){x.gameState.cameraMode=3;x.update(0,true);if(obstructed)rockAlongView(x);x.camera.position.x+=2;x.update(.05,false);}assert.deepEqual(snapshot(f),snapshot(old));assert.ok(f.rocks.every(o=>o.visible));assertAim(f);}
  });
  it('corrects only camera position and aim without changing actors, gameplay state or owned resource identities',()=>{
    for(const mode of [0,1,2,3]){const f=fixture();f.gameState.cameraMode=mode;f.update(0,true);if(mode===3)rockAlongView(f);const game=JSON.stringify(f.gameState),actor=[...f.octopus.position.toArray(),...f.octopus.quaternion.toArray()],geometry=f.body.geometry,material=f.body.material,positions=geometry.attributes.position,bytes=positions.array.slice(),inspection=JSON.stringify(f.inspection),rocks=f.rocks.map(o=>[o.position.toArray(),o.quaternion.toArray(),o.visible]);f.setGround(()=>6);f.camera.position.set(0,-2,-4.6);f.update(.05,false);assert.equal(JSON.stringify(f.gameState),game);assert.deepEqual([...f.octopus.position.toArray(),...f.octopus.quaternion.toArray()],actor);assert.equal(f.body.geometry,geometry);assert.equal(f.body.material,material);assert.equal(geometry.attributes.position,positions);assert.deepEqual(positions.array,bytes);assert.equal(JSON.stringify(f.inspection),inspection);assert.deepEqual(f.rocks.map(o=>[o.position.toArray(),o.quaternion.toArray(),o.visible]),rocks);assert.equal(f.occlusions,0);}
  });
});
