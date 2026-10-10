import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(process.cwd()+'/package.json'),THREE=require('./vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function region(a,b){const first=source.indexOf(a),last=source.indexOf(b,first);assert.ok(first>=0&&last>first,a);return source.slice(first,last);}
const helpers=region('      function clHuntShelterCarryText(','      function initHuntSim3D(');
const nearest=new Function(helpers+';return clHuntNearestReachablePickup;')();
const action=region('            var gKeyNow = !!keys.KeyG;','            // Carrying wobble');
const prompt=region('          // ─── Action prompt (context-aware)','          // ─── Mini-map (every frame; cheap 2D canvas redraw)');
const spatial=region('        function rockBlocks(','        function inkBlocks(');
const makeFixture=new Function('THREE','objects',`
  ${helpers}
  const scene=new THREE.Scene(),octopus=new THREE.Group(),coverRay=new THREE.Raycaster(),rocks=objects.rocks||[];
  octopus.position.set(0,.55,0);scene.add(octopus);rocks.forEach(o=>scene.add(o));
  let pearls=objects.pearls||[],carriedShelter=null,gKeyDownPrev=false,now=1000,promptText='';
  const shelters=objects.shelters||[],keys={},events=[],saves=[],achievements=[],gameState={runStats:{},strikeReadyAt:0};
  pearls.forEach(o=>scene.add(o));shelters.forEach(o=>scene.add(o));
  const SHELTER_TYPES={coconut:{carriable:true,label:'coconut half',camoBonus:.3,speedPenalty:.1,dropLifeMs:90000},bottle:{carriable:true,label:'glass bottle',camoBonus:.2,speedPenalty:.05,dropLifeMs:120000},sponge:{carriable:false,label:'barrel sponge',camoBonus:.45,speedPenalty:0,dropLifeMs:0}};
  const PEARL_PICKUP_RANGE=1.4,SHELTER_PICKUP_RANGE=1.6,SHELTER_DEN_RADIUS=1.5,DRILL_RANGE=1.6,clams=[],selectedPrey=null,capabilities={diet:'prey',carryCost:1};
  const pearlState={byLandmark:{},total:0},terrainHeight=()=>0,savePearls=s=>saves.push(JSON.stringify(s)),sfxCatch=()=>{};
  const unlockAchievement=s=>achievements.push(s),clAnnounce=s=>events.push(s),clHuntInputCue=(keyboard)=>keyboard;
  const forageReady=()=>false,preyReadiness=()=>({ready:false}),setActionPrompt=text=>promptText=text;
  ${spatial}
  function hint(){scene.updateMatrixWorld(true);${prompt};return promptText;}
  function step(held){keys.KeyG=held;now+=50;scene.updateMatrixWorld(true);${action};return hint();}
  return {step,hint,events,saves,achievements,octopus,scene,shelters,gameState,pearlState,rockBlocks,
    snapshot(){return{carried:carriedShelter,previous:gKeyDownPrev,pearls:pearls.slice(),now};}};
`);
const resources=[];
function pearl(id,x=0,y=.2,z=0){const p=new THREE.Group();p.position.set(x,y,z);p.userData={landmarkType:id};return p;}
function shelter(type='coconut',state='free',x=0,y=.2,z=0){const p=new THREE.Group();p.position.set(x,y,z);p.userData={shelterType:type,state};return p;}
function wall(x=.4,y=.6,z=0,width=.14,height=2,depth=.6){const geometry=new THREE.BoxGeometry(width,height,depth),material=new THREE.MeshBasicMaterial(),rock=new THREE.Mesh(geometry,material);resources.push(geometry,material);rock.position.set(x,y,z);return rock;}
function release(f){f.step(false);}
function press(f){release(f);f.step(true);}
afterEach(()=>{resources.splice(0).forEach(r=>r.dispose());});

describe('Cephalopod Hunter reachable pickup targets and prompts',()=>{
  it('uses actual rock geometry to skip the hidden nearest pearl and collect the farther reachable pearl shown by the prompt',()=>{
    const blocked=pearl('arch',.85),clear=pearl('wreck',0,.2,1.1),cover=shelter('coconut','free',0,.2,.45),f=makeFixture(THREE,{pearls:[blocked,clear],shelters:[cover],rocks:[wall()]});
    assert.match(f.hint(),/collect pearl/);assert.equal(f.rockBlocks(f.octopus.position,blocked.position),true);assert.equal(f.rockBlocks(f.octopus.position,clear.position),false);
    f.step(true);assert.deepEqual(f.snapshot().pearls,[blocked]);assert.equal(f.pearlState.byLandmark.wreck,true);assert.equal(f.pearlState.byLandmark.arch,undefined);assert.equal(f.snapshot().carried,null);assert.equal(f.saves.length,1);
    assert.match(f.hint(),/pick up coconut half/);for(let i=0;i<20;i++)f.step(true);assert.equal(f.snapshot().carried,null);assert.equal(f.saves.length,1);
    press(f);assert.equal(f.snapshot().carried,cover);assert.match(f.hint(),/drop coconut half/);
  });
  it('shows no collect or pickup prompt and changes no rewards or ownership when all nearby objects are behind rock',()=>{
    const treasure=pearl('arch',.85),cover=shelter('coconut','free',.9),f=makeFixture(THREE,{pearls:[treasure],shelters:[cover],rocks:[wall()]});
    assert.doesNotMatch(f.hint(),/collect pearl|pick up/);f.step(true);assert.equal(f.snapshot().carried,null);assert.deepEqual(f.snapshot().pearls,[treasure]);assert.equal(f.pearlState.total,0);assert.equal(f.saves.length,0);assert.equal(f.events.length,0);assert.equal(cover.parent,f.scene);
  });
  it('falls back from an occluded pearl to the nearest reachable free carriable shelter, preserving state and type restrictions',()=>{
    const blocked=pearl('arch',.85),blockedCover=shelter('coconut','free',.9),anchored=shelter('sponge','static',0,.2,.1),placed=shelter('bottle','dropped',0,.2,.2),carried=shelter('bottle','carried',0,.2,.3),clear=shelter('bottle','free',0,.2,1.2),farther=shelter('coconut','free',0,.2,1.3);
    const f=makeFixture(THREE,{pearls:[blocked],shelters:[blockedCover,anchored,placed,carried,farther,clear],rocks:[wall()]});
    assert.match(f.hint(),/pick up glass bottle/);f.step(true);assert.equal(f.snapshot().carried,clear);assert.equal(clear.parent,f.octopus);assert.equal(clear.userData.state,'carried');assert.equal(blockedCover.userData.state,'free');assert.equal(f.pearlState.total,0);assert.deepEqual(f.achievements,['firstShelter']);
    assert.match(f.hint(),/drop glass bottle/);for(let i=0;i<20;i++)f.step(true);assert.equal(clear.userData.state,'carried');
    press(f);assert.equal(clear.userData.state,'dropped');assert.equal(clear.parent,f.scene);assert.equal(clear.rotation.z,Math.PI/2);assert.deepEqual(clear.position.toArray(),[0,.12,0]);assert.match(f.events.at(-1),/placed — temporary den/);
  });
  it('requires release and a new press after a blocked target becomes reachable; one held key never bypasses cover or repeats pickup',()=>{
    const treasure=pearl('arch',.85),rock=wall(),cover=shelter('coconut','free',.9),f=makeFixture(THREE,{pearls:[treasure],shelters:[cover],rocks:[rock]});
    f.step(true);rock.position.z=4;for(let i=0;i<10;i++)f.step(true);assert.match(f.hint(),/collect pearl/);assert.equal(f.pearlState.total,0);assert.equal(f.snapshot().previous,true);
    press(f);assert.equal(f.pearlState.total,1);for(let i=0;i<10;i++)f.step(true);assert.equal(f.snapshot().carried,null);
    press(f);assert.equal(f.snapshot().carried,cover);rock.position.copy(f.octopus.position);press(f);assert.equal(f.snapshot().carried,null);assert.equal(cover.userData.state,'dropped');assert.match(f.events.at(-1),/placed — temporary den/);
  });
  it('preserves exact horizontal and vertical boundaries, stable equal-distance ties, and passes original full-height vectors to the rock query',()=>{
    const position={x:0,y:.5,z:0},calls=[],clear=(a,b)=>{calls.push([a,b]);return false;};
    const atRadius=pearl('radius',1.4),atHeight=pearl('height',.1,.5+1.5),outside=pearl('outside',1.400001),nan=pearl('nan',.1,NaN),first=pearl('first',.7,.3),tie=pearl('tie',-.7,.9);
    assert.equal(nearest([atRadius,atHeight,outside,nan],position,1.4,1.5,clear),null);assert.equal(calls.length,0);
    assert.equal(nearest([first,tie],position,1.4,1.5,clear),first);assert.equal(calls.length,1);assert.equal(calls[0][0],position);assert.equal(calls[0][1],first.position);assert.equal(calls[0][0].y,.5);assert.equal(calls[0][1].y,.3);
    const cover=shelter('coconut','free',1.6,.2),high=shelter('coconut','free',.1,.5+1.2);assert.equal(nearest([cover,high],position,1.6,1.2,clear),null);cover.position.x=1.599999;assert.equal(nearest([cover],position,1.6,1.2,clear),cover);
  });
  it('uses height-aware rock rays so reaching over a low stone remains possible while the same stone blocks a lower target',()=>{
    const high=pearl('high',1,.95),low=pearl('low',1,.1),f=makeFixture(THREE,{pearls:[low,high],rocks:[wall(.5,.2,0,.2,.4,.6)]});
    f.scene.updateMatrixWorld(true);assert.equal(f.rockBlocks(f.octopus.position,low.position),true);assert.equal(f.rockBlocks(f.octopus.position,high.position),false);
    assert.match(f.hint(),/collect pearl/);f.step(true);assert.equal(f.pearlState.byLandmark.high,true);assert.equal(f.pearlState.byLandmark.low,undefined);assert.deepEqual(f.snapshot().pearls,[low]);
  });
  it('preserves objects, positions, and caller-provided ordering while ignoring ineligible entries before any rock query',()=>{
    const position={x:0,y:.55,z:0},free=shelter('coconut','free',.4),placed=shelter('coconut','dropped',.1),notCarriable=shelter('sponge','static',.2),list=[placed,notCarriable,free],order=list.slice(),before=list.map(o=>o.position.toArray()),calls=[];
    const picked=nearest(list,position,1.6,1.2,(a,b)=>{calls.push(b);return false;},s=>s.userData.state==='free'&&s.userData.shelterType!=='sponge');
    assert.equal(picked,free);assert.deepEqual(list,order);assert.deepEqual(list.map(o=>o.position.toArray()),before);assert.deepEqual(calls,[free.position]);
  });
});
