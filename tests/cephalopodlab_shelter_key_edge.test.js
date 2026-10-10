import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const first=source.indexOf('            var gKeyNow = !!keys.KeyG;'),last=source.indexOf('            // Carrying wobble',first);
assert.ok(first>=0&&last>first);
const interaction=source.slice(first,last);
const helperFirst=source.indexOf('      function clHuntNearestReachablePickup('),helperLast=source.indexOf('      function initHuntSim3D(',helperFirst);
assert.ok(helperFirst>=0&&helperLast>helperFirst);const pickupHelper=source.slice(helperFirst,helperLast);
const makeFixture=new Function('objects',`
  const keys={},events=[],achievements=[],saves=[];
  let carriedShelter=null,gKeyDownPrev=false,now=1000,pearls=objects.pearls;
  const shelters=objects.shelters,scene={add(o){o.parent='scene';},remove(o){o.parent=null;}};
  const octopus={position:{x:0,y:.55,z:0},add(o){o.parent='player';},remove(o){o.parent=null;}};
  const SHELTER_TYPES={coconut:{carriable:true,label:'coconut half'},bottle:{carriable:true,label:'glass bottle'},sponge:{carriable:false,label:'barrel sponge'}};
  const PEARL_PICKUP_RANGE=2,SHELTER_PICKUP_RANGE=2,pearlState={byLandmark:{},total:0},gameState={runStats:{}};
  const terrainHeight=(x,z)=>.2*x+.1*z,savePearls=s=>saves.push(JSON.stringify(s)),sfxCatch=()=>{};
  const unlockAchievement=s=>achievements.push(s),clAnnounce=s=>events.push(s);
  ${pickupHelper}
  const rockBlocks=()=>false,canPickUpShelter=shelter=>shelter.userData.state==='free'&&SHELTER_TYPES[shelter.userData.shelterType].carriable;
  function step(held){keys.KeyG=held;now+=50;${interaction}}
  return {step,events,saves,achievements,octopus,shelters,gameState,pearlState,
    snapshot(){return {carried:carriedShelter,previous:gKeyDownPrev,pearls:pearls.slice(),now};}};
`);
function pose(x=0,y=0,z=0){return{x,y,z,set(a,b,c){this.x=a;this.y=b;this.z=c;}};}
function pearl(id,x=0,y=0,z=0){
  const counters={geometry:0,material:0};
  return {position:pose(x,y,z),userData:{landmarkType:id},parent:'scene',counters,
    traverse(fn){fn({geometry:{dispose(){counters.geometry++;}},material:{dispose(){counters.material++;}}});}};
}
function shelter(type='coconut',state='free',x=0,y=0,z=0){return{position:pose(x,y,z),rotation:pose(),userData:{state,shelterType:type},parent:'scene'};}
function fixture(pearls=[],shelters=[]){return makeFixture({pearls,shelters});}
function hold(f,frames=10){for(let i=0;i<frames;i++)f.step(true);}
function press(f){f.step(false);f.step(true);}

describe('Cephalopod Hunter one interaction per held input',()=>{
  it('collects the pearl before the shelter and keeps that same press consumed on later frames',()=>{
    const treasure=pearl('arch'),cover=shelter(),f=fixture([treasure],[cover]);
    f.step(true);hold(f,120);
    assert.equal(f.pearlState.total,1);assert.equal(f.gameState.runStats.pearlsCollected,1);
    assert.equal(f.snapshot().pearls.length,0);assert.equal(f.snapshot().carried,null);
    assert.equal(cover.userData.state,'free');assert.equal(cover.parent,'scene');
    assert.equal(f.snapshot().previous,true);assert.equal(f.saves.length,1);
    assert.deepEqual(treasure.counters,{geometry:1,material:1});assert.equal(treasure.parent,null);
    assert.deepEqual(f.events,['Pearl collected — 1 total']);
  });
  it('collects only one nearby pearl per press, then rearms on release',()=>{
    const near=pearl('arch',.2),far=pearl('wreck',.8),f=fixture([far,near]);
    hold(f,12);assert.deepEqual(f.snapshot().pearls,[far]);assert.equal(f.pearlState.byLandmark.arch,true);
    assert.equal(f.pearlState.byLandmark.wreck,undefined);assert.equal(f.saves.length,1);
    press(f);hold(f,12);assert.equal(f.pearlState.total,2);assert.equal(f.snapshot().pearls.length,0);
    assert.equal(f.saves.length,2);assert.equal(f.gameState.runStats.pearlsCollected,2);
    assert.deepEqual(far.counters,{geometry:1,material:1});assert.deepEqual(near.counters,{geometry:1,material:1});
  });
  it('allows a new press to pick up the shelter after a pearl, and another new press to place it',()=>{
    const cover=shelter(),f=fixture([pearl('arch')],[cover]);
    f.step(true);hold(f);press(f);hold(f);
    assert.equal(f.snapshot().carried,cover);assert.equal(cover.userData.state,'carried');assert.equal(cover.parent,'player');
    assert.equal(f.events.length,2);f.octopus.position.x=3;f.octopus.position.z=4;
    press(f);hold(f);assert.equal(f.snapshot().carried,null);assert.equal(cover.userData.state,'dropped');
    assert.equal(cover.parent,'scene');assert.deepEqual([cover.position.x,cover.position.y,cover.position.z],[3,1.12,4]);
    assert.ok(cover.userData.createdAt>1000);assert.equal(f.events.length,3);
    assert.deepEqual(f.achievements,['firstShelter','coconutBuilder']);
  });
  it('preserves ordinary nearest eligible pickup, carried hold, and bottle placement without a pearl',()=>{
    const staticCover=shelter('sponge','static'),placed=shelter('coconut','dropped',.05),high=shelter('coconut','free',.1,4);
    const farther=shelter('coconut','free',1),cover=shelter('bottle','free',.5),f=fixture([],[staticCover,placed,high,farther,cover]);
    hold(f);assert.equal(f.snapshot().carried,cover);assert.equal(f.events.length,1);
    press(f);hold(f);assert.equal(f.snapshot().carried,null);assert.equal(cover.userData.state,'dropped');
    assert.equal(cover.rotation.z,Math.PI/2);assert.equal(f.events.length,2);
    assert.equal(farther.userData.state,'free');assert.equal(placed.userData.state,'dropped');assert.equal(high.userData.state,'free');
  });
  it('does not trigger an interaction merely by moving into range with an already held input',()=>{
    const treasure=pearl('arch',10),cover=shelter('coconut','free',10),f=fixture([treasure],[cover]);
    f.step(true);treasure.position.x=0;cover.position.x=0;hold(f);
    assert.equal(f.events.length,0);assert.equal(f.snapshot().carried,null);assert.equal(f.pearlState.total,0);
    press(f);hold(f);assert.equal(f.pearlState.total,1);assert.equal(f.snapshot().carried,null);assert.equal(f.events.length,1);
  });
  it('places a carried shelter before collecting a pearl, then requires a fresh press for that pearl',()=>{
    const treasure=pearl('arch',10),cover=shelter(),f=fixture([treasure],[cover]);
    hold(f);assert.equal(f.snapshot().carried,cover);treasure.position.x=0;
    press(f);hold(f);assert.equal(cover.userData.state,'dropped');assert.equal(f.pearlState.total,0);
    press(f);hold(f);assert.equal(f.pearlState.total,1);assert.equal(f.events.length,3);
    assert.deepEqual(f.events,['coconut half picked up','coconut half placed — temporary den','Pearl collected — 1 total']);
  });
});
