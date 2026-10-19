import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,a);return source.slice(start,end);}
const buttonLine=source.split('\n').find(line=>line.includes("var huntButton=uiButton('Strike [E]'"));assert.ok(buttonLine);
const fixtureCode=`
  var calls=[],keys={},clickRequested=!!options.request,inkRequested=false,explicitTarget=false;
  var gameState={paused:!!options.paused,gameOver:!!options.over,observationUntil:6000,pendingStrike:null,strikeReadyAt:1700,lastStrikeAt:1050,score:4,runStats:{fish:1,crabs:0}},inspection={active:!!options.inspect},capabilities={diet:options.diet||'prey'};
  var canvasEl={getBoundingClientRect:function(){calls.push('bounds');return {left:40,top:20,width:320,height:240};},focus:function(){calls.push('focus');}};
  var camera=new THREE.PerspectiveCamera(45,320/240,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  function prey(z){var root=new THREE.Group(),nested=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8),new THREE.MeshBasicMaterial());root.position.z=z;root.userData={alive:true};nested.add(mesh);root.add(nested);root.updateMatrixWorld(true);return root;}
  var far=prey(-1),near=prey(1),selectedPrey=far,candidates=[far,near];
  function preyCandidates(){calls.push('candidates');return candidates;}
  function updateTrackedPrey(){calls.push('tracked');}function updateMission(){calls.push('mission');}function clAnnounce(message){calls.push(message);}function clHuntInputCue(key,touch){return options.touch?touch:key;}
  function toggleInspection(){}function closeSettings(){}function setPaused(){}function cycleCamera(){}function cycleTarget(){}function toggleForage(){}
  var settingsPanel=null;
  // onClick also tests reef rocks in front of prey (see pointer_occlusion); this open-water fixture has none.
  var rocks=[];
  ${region('function onKeyDown(e){','function onKeyUp(e){')}
  ${region('var targetRay=new THREE.Raycaster(),pointerPoint=new THREE.Vector2();','canvasEl.addEventListener(\'keydown\'')}
  function uiButton(label,handler){return {label:label,activate:handler};}
  ${buttonLine}
  return {far:far,near:near,gameState:gameState,inspection:inspection,calls:calls,click:function(x,y){onClick({clientX:x==null?200:x,clientY:y==null?140:y});},key:function(){onKeyDown({code:'KeyE',repeat:false,preventDefault:function(){calls.push('prevent');}});},button:function(){huntButton.activate();},state:function(){return {selectedPrey:selectedPrey,explicitTarget:explicitTarget,clickRequested:clickRequested};},dispose:function(){[far,near].forEach(function(root){root.traverse(function(mesh){if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});});}};
`;
const fixture=options=>new Function('THREE','options',fixtureCode)(THREE,options||{});

describe('Cephalopod Hunter pointer selection without accidental strikes',()=>{
  it('raycasts the closest nested prey root and refreshes feedback without requesting a strike',()=>{
    for(const touch of [false,true]){const row=fixture({touch});row.click();const state=row.state();assert.equal(state.selectedPrey,row.near);assert.equal(state.explicitTarget,true);assert.equal(state.clickRequested,false);assert.equal(row.gameState.observationUntil,0);assert.deepEqual(row.calls,['bounds','candidates','tracked','mission',touch?'Target selected. Move into range and tap Strike / hold.':'Target selected. Move into range and press E.','focus']);row.dispose();}
  });
  it('preserves an independently queued strike request when selecting prey',()=>{
    const row=fixture({request:true});row.click();assert.equal(row.state().selectedPrey,row.near);assert.equal(row.state().clickRequested,true);row.dispose();
  });
  it('leaves selection, queued actions, observation and feedback untouched when the pointer misses prey',()=>{
    for(const request of [false,true]){const row=fixture({request});row.click(40,20);assert.equal(row.state().selectedPrey,row.far);assert.equal(row.state().explicitTarget,false);assert.equal(row.state().clickRequested,request);assert.equal(row.gameState.observationUntil,6000);assert.deepEqual(row.calls,['bounds','candidates']);row.dispose();}
  });
  it('ignores pointer clicks while paused, inspecting or after a run has ended',()=>{
    for(const options of [{paused:true},{inspect:true},{over:true}]){const row=fixture({...options,request:true});row.click();assert.equal(row.state().selectedPrey,row.far);assert.equal(row.state().explicitTarget,false);assert.equal(row.state().clickRequested,true);assert.equal(row.gameState.observationUntil,6000);assert.deepEqual(row.calls,[]);row.dispose();}
  });
  it('changes only the next selection during an already committed strike',()=>{
    const row=fixture(),commit={target:row.far,at:1200};row.gameState.pendingStrike=commit;const stats=JSON.stringify(row.gameState.runStats);row.click();assert.equal(row.state().selectedPrey,row.near);assert.equal(row.state().clickRequested,false);assert.equal(row.gameState.pendingStrike,commit);assert.equal(commit.target,row.far);assert.equal(commit.at,1200);assert.equal(row.gameState.strikeReadyAt,1700);assert.equal(row.gameState.lastStrikeAt,1050);assert.equal(row.gameState.score,4);assert.equal(JSON.stringify(row.gameState.runStats),stats);assert.equal(row.far.userData.alive,true);assert.equal(row.near.userData.alive,true);row.dispose();
  });
  it('ignores prey selection for detritus feeders without disturbing their active forage or observation',()=>{
    const row=fixture({diet:'detritus'}),snow=new THREE.Group();row.gameState.forageTarget=snow;row.gameState.forageStartedAt=800;row.gameState.forageProgress=.4;row.click();assert.equal(row.state().selectedPrey,row.far);assert.equal(row.state().explicitTarget,false);assert.equal(row.state().clickRequested,false);assert.equal(row.gameState.observationUntil,6000);assert.equal(row.gameState.forageTarget,snow);assert.equal(row.gameState.forageStartedAt,800);assert.equal(row.gameState.forageProgress,.4);assert.deepEqual(row.calls,[]);row.dispose();
  });
  it('keeps E and the dedicated Strike button as intentional strike requests',()=>{
    const keyboard=fixture();keyboard.key();assert.equal(keyboard.state().clickRequested,true);assert.equal(keyboard.state().selectedPrey,keyboard.far);keyboard.dispose();
    const button=fixture();button.button();assert.equal(button.state().clickRequested,true);assert.equal(button.state().selectedPrey,button.far);assert.deepEqual(button.calls,['focus']);button.dispose();
    for(const options of [{paused:true},{inspect:true},{over:true}]){const row=fixture(options);row.key();assert.equal(row.state().clickRequested,false);row.dispose();}
  });
});
