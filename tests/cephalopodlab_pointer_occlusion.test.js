import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('        function onClick(e){'),end=source.indexOf('        canvasEl.addEventListener',start);
assert.ok(start>=0&&end>start,'Real Hunter pointer selection function exists');
const clickSource=source.slice(start,end);

// Real camera projection and Three.js intersections exercise depth ordering,
// including child meshes. Only the surrounding HUD and input state are stubbed.
const run=new Function('THREE','options',`
  var gameState={paused:!!options.paused,gameOver:!!options.gameOver,observationUntil:777},inspection={active:!!options.inspection},capabilities={diet:options.diet||'carnivore'};
  var effects=[],calls={tracked:0,mission:0,announced:0,focused:0},originalTarget=new THREE.Group(),selectedPrey=options.locked===false?null:originalTarget,explicitTarget=options.locked!==false;
  var canvasEl={getBoundingClientRect:function(){return {left:30,top:40,width:400,height:300};},focus:function(){calls.focused++;}};
  var targetRay=new THREE.Raycaster(),pointerPoint=new THREE.Vector2(),camera=new THREE.PerspectiveCamera(45,4/3,.1,100);
  camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  var prey=new THREE.Group(),body=new THREE.Group(),preyMesh=new THREE.Mesh(new THREE.SphereGeometry(.4,16,12),new THREE.MeshBasicMaterial());
  body.add(preyMesh);prey.add(body);prey.position.set(options.preyX||0,0,options.preyZ==null?-1:options.preyZ);prey.userData.alive=true;prey.updateMatrixWorld(true);
  var candidates=options.noPrey?[]:[prey],rocks=[];
  (options.rocks||[]).forEach(function(position){var rock=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshBasicMaterial());rock.position.set(position.x||0,0,position.z);rock.updateMatrixWorld(true);rocks.push(rock);});
  if(options.water){var water=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({transparent:true,opacity:.3,side:THREE.DoubleSide}));water.position.z=3;water.updateMatrixWorld(true);effects.push(water);}
  function preyCandidates(){return candidates;}
  function updateTrackedPrey(){calls.tracked++;}function updateMission(){calls.mission++;}function clAnnounce(){calls.announced++;}function clHuntInputCue(value){return value;}
  ${clickSource}
  onClick({clientX:230,clientY:190});
  // Independent real-ray evidence makes the fixtures' visible ordering explicit.
  targetRay.setFromCamera(new THREE.Vector2(0,0),camera);
  var preyHits=targetRay.intersectObjects(candidates,true),rockHits=targetRay.intersectObjects(rocks,false),effectHits=targetRay.intersectObjects(effects,false);
  return {selectedPrey:selectedPrey===prey,originalPreserved:selectedPrey===originalTarget,selectedNull:selectedPrey===null,explicitTarget:explicitTarget,observationUntil:gameState.observationUntil,calls:calls,preyHitCount:preyHits.length,preyDistance:preyHits.length?preyHits[0].distance:null,rockDistance:rockHits.length?rockHits[0].distance:null,effectDistance:effectHits.length?effectHits[0].distance:null};
`);
const fixture=options=>run(THREE,options||{});
function unchanged(row){assert.equal(row.originalPreserved,true);assert.equal(row.explicitTarget,true);assert.equal(row.observationUntil,777);assert.deepEqual(row.calls,{tracked:0,mission:0,announced:0,focused:0});}
function selected(row){assert.equal(row.selectedPrey,true);assert.equal(row.explicitTarget,true);assert.equal(row.observationUntil,0);assert.deepEqual(row.calls,{tracked:1,mission:1,announced:1,focused:1});}

describe('Cephalopod Hunter pointer targeting respects visible reef cover',()=>{
  it('preserves the current target and feedback when opaque rock is in front of a clicked prey',()=>{const row=fixture({rocks:[{z:1}]});assert.ok(row.preyHitCount>0);assert.ok(row.rockDistance<row.preyDistance);unchanged(row);});
  it('does not acquire a hidden prey when there was no explicit target',()=>{const row=fixture({rocks:[{z:1}],locked:false});assert.equal(row.selectedNull,true);assert.equal(row.explicitTarget,false);assert.equal(row.observationUntil,777);assert.deepEqual(row.calls,{tracked:0,mission:0,announced:0,focused:0});});
  it('selects the owning prey group from its nested visible mesh',()=>{const row=fixture();assert.ok(row.preyHitCount>0);assert.equal(row.rockDistance,null);selected(row);});
  it('still selects prey in front of a rock and ignores off-ray rocks',()=>{for(const rocks of [[{z:-3}],[{x:3,z:1}]]){const row=fixture({rocks});assert.ok(row.rockDistance===null||row.preyDistance<row.rockDistance);selected(row);}});
  it('uses the closest blocker regardless of rock array order',()=>{for(const rocks of [[{z:-3},{z:1}],[{z:1},{z:-3}]]){const row=fixture({rocks});assert.ok(row.rockDistance<row.preyDistance);unchanged(row);}});
  it('preserves selection on empty clicks and clicks that hit only rocks',()=>{for(const options of [{noPrey:true},{noPrey:true,rocks:[{z:1}]},{preyX:3,rocks:[{z:1}]}]){const row=fixture(options);assert.equal(row.preyHitCount,0);unchanged(row);}});
  it('leaves translucent water and visual effects click-through',()=>{const row=fixture({water:true,rocks:[{z:-3}]});assert.ok(row.effectDistance<row.preyDistance);assert.ok(row.preyDistance<row.rockDistance);selected(row);});
  it('preserves pause, ended-dive, inspection and detritus input gates',()=>{for(const options of [{paused:true},{gameOver:true},{inspection:true},{diet:'detritus'}]){const row=fixture(options);assert.ok(row.preyHitCount>0);unchanged(row);}});
});
