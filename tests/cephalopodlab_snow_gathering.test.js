import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const THREE=createRequire(process.cwd()+'/package.json')('./vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
function region(first,last){const a=source.indexOf(first),b=source.indexOf(last,a);assert.ok(a>=0&&b>a,first);return source.slice(a,b);}
const eligibility=region('        function forageReady(food){','        function cancelForage(message){');
const cancellation=region('        function cancelForage(message){','        function toggleForage(){');
const tapUpdate=region('        function updateForaging(){','        function updateThreatHud(){');
const gathering=region('        function updateSnow(dt){','        // Created after gameplay actors:');
const makeFixture=new Function('THREE',`
  const keys={},events=[],records=[],octopus={position:new THREE.Vector3()},capabilities={diet:'detritus'};
  const marineSnow=[{position:new THREE.Vector3(0,0,1),userData:{gather:0}}];
  let gameNow=1000,clickRequested=false,blocked=false;
  const gameState={forageTarget:null,forageStartedAt:0,forageProgress:0,drillingClam:null,drillProgress:0,tookHitAt:0,score:0,hunger:0,maxHunger:100,runStats:{marineSnow:0}};
  const rockBlocks=()=>blocked,forageButton={setAttribute(k,v){this[k]=v;}},forageProgress={value:0},forageRow={hidden:false};
  const recordEvent=(a,b)=>records.push([a,b]),clAnnounce=s=>events.push(s),__alloT=(key,text)=>text;
  ${eligibility}${cancellation}${tapUpdate}${gathering}
  function step(dt=.05){gameNow+=dt*1000;updateForaging();updateSnow(dt);}
  function start(tap=false){if(tap){gameState.forageTarget=marineSnow[0];gameState.forageStartedAt=gameNow;}else keys.KeyE=true;}
  return {step,start,gameState,keys,events,records,marineSnow,octopus,forageButton,forageProgress,forageRow,forageReady,
    hit(){gameState.tookHitAt=gameNow;},setBlocked(value){blocked=value;},setNow(value){gameNow=value;},get now(){return gameNow;}};
`);
function fixture(tap=false){const f=makeFixture(THREE);f.start(tap);return f;}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} vs ${b}`);
function advance(f,n){for(let i=0;i<n;i++)f.step();}

describe('Cephalopod Hunter marine snow uses consistent held and tap feeding rules',()=>{
  it('retains the existing gathering duration and grants exactly one unchanged meal for either input',()=>{
    for(const tap of [false,true]){const f=fixture(tap);advance(f,12);near(f.marineSnow[0].userData.gather,.6);assert.equal(f.gameState.score,0);
      advance(f,2);assert.equal(f.gameState.score,2);assert.equal(f.gameState.hunger,18);assert.equal(f.gameState.runStats.marineSnow,1);assert.equal(f.records.length,1);
      advance(f,16);assert.equal(f.gameState.score,2);assert.equal(f.gameState.runStats.marineSnow,1);assert.equal(f.gameState.forageTarget,null);
      if(tap){assert.equal(f.forageButton['aria-pressed'],'false');assert.equal(f.forageRow.hidden,true);}}
  });
  for(const key of ['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyZ','Space'])it(`resets partial feeding on ${key} with held or tap input`,()=>{
    for(const tap of [false,true]){const f=fixture(tap);advance(f,10);near(f.marineSnow[0].userData.gather,.5);f.keys[key]=true;advance(f,14);
      assert.equal(f.marineSnow[0].userData.gather,0);assert.equal(f.gameState.forageProgress,0);assert.equal(f.gameState.score,0);assert.equal(f.gameState.forageTarget,null);
      f.keys[key]=false;if(tap)f.start(true);f.step();near(f.marineSnow[0].userData.gather,.05);advance(f,13);assert.equal(f.gameState.score,2);}
  });
  it('interrupts nearly completed feeding after fresh damage and restarts after the existing 250 ms settling window',()=>{
    for(const tap of [false,true]){const f=fixture(tap);advance(f,12);f.hit();f.step();assert.equal(f.marineSnow[0].userData.gather,0);assert.equal(f.gameState.score,0);assert.equal(f.gameState.forageTarget,null);
      if(tap)f.start(true);advance(f,4);assert.equal(f.now-f.gameState.tookHitAt,250);assert.equal(f.marineSnow[0].userData.gather,0);
      f.step();near(f.marineSnow[0].userData.gather,.05);advance(f,13);assert.equal(f.gameState.score,2);assert.equal(f.gameState.runStats.marineSnow,1);}
  });
  it('clears held progress when E is released and tap input stops through cancellation',()=>{
    const held=fixture();advance(held,10);held.keys.KeyE=false;held.step();assert.equal(held.marineSnow[0].userData.gather,0);held.start();held.step();near(held.marineSnow[0].userData.gather,.05);
    const tap=fixture(true);advance(tap,10);tap.keys.KeyW=true;tap.step();assert.equal(tap.gameState.forageTarget,null);assert.equal(tap.marineSnow[0].userData.gather,0);assert.equal(tap.gameState.score,0);
  });
  it('preserves strict three-dimensional reach and rock occlusion before awarding food',()=>{
    for(const mode of ['range','depth','cover'])for(const tap of [false,true]){const f=fixture(tap);advance(f,10);
      if(mode==='range')f.marineSnow[0].position.set(2.4,0,0);if(mode==='depth')f.marineSnow[0].position.set(0,-2.4,0);if(mode==='cover')f.setBlocked(true);
      assert.equal(f.forageReady(f.marineSnow[0]),false);f.step();assert.equal(f.marineSnow[0].userData.gather,0);assert.equal(f.gameState.score,0);
      f.setBlocked(false);f.marineSnow[0].position.set(0,0,1);if(tap)f.start(true);f.step();near(f.marineSnow[0].userData.gather,.05);}
  });
  it('keeps tap gathering bound to its chosen floc while preserving held gathering of eligible flocs',()=>{
    for(const tap of [false,true]){const f=fixture(tap),other={position:new THREE.Vector3(0,0,.2),userData:{gather:0}};f.marineSnow.push(other);advance(f,6);
      near(f.marineSnow[0].userData.gather,.3);near(other.userData.gather,tap?0:.3);assert.equal(f.gameState.forageTarget,tap?f.marineSnow[0]:null);}
  });
});
