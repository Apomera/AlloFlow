import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
const match = source.match(/var FISH_CATCH_RANGE\s*=\s*[^;]+;/); assert.ok(match);
const run = new Function('THREE', 'options', `
  ${match[0]}
  var gameNow=1000,gameState={pendingStrike:null,strikeReadyAt:0,targetText:'',targetDetail:'',facingAngle:0},capabilities={diet:options.diet||'carnivore'},inspection={active:!!options.inspect};
  var octopus=new THREE.Group();octopus.position.set(0,.55,0);
  var selectedPrey=new THREE.Group();selectedPrey.userData={alive:true,type:'rock'};if(options.kind!=='fish')selectedPrey.userData.cfg={};selectedPrey.position.set(0,options.y==null?.18:options.y,options.z==null?4:options.z);
  var alternative=new THREE.Group();alternative.userData={alive:true,cfg:{},type:'red'};alternative.position.set(0,.18,.6);
  var targetHalo=new THREE.Mesh(new THREE.RingGeometry(.48,.53,40),new THREE.MeshBasicMaterial({color:0xffdf91}));
  var copy=targetHalo.position.copy,copied=null;targetHalo.position.copy=function(position){copied=position;return copy.call(this,position);};
  function rockBlocks(){return !!options.cover;}function clHuntInputCue(key,touch){return options.touch?touch:key;}function clHuntPreyIntentText(){return 'unaware';}
  ${region('function preyReadiness(', 'function forageReady(')}
  ${region('function describeTrackedPrey(', 'function updateTargets(')}
  ${region('function updateTrackedPrey(){', 'var marineSnow=[];')}
  updateTrackedPrey();return {gameState,targetHalo,prey:selectedPrey,alternative,octopus,inspection,readiness:preyReadiness,refresh:updateTrackedPrey,copySource:()=>copied,selectAlternative:()=>{selectedPrey=alternative;}};
`);
const fixture = options => run(THREE, options || {});
function cleanup(row){row.targetHalo.geometry.dispose();row.targetHalo.material.dispose();}

describe('Cephalopod Hunter target presentation and practical approach cues', () => {
  it('reports the real strict fish and crab reach boundaries with actionable distances', () => {
    for (const [kind,limit] of [['fish',2.2],['crab',2.6]]) {
      const row=fixture({kind,y:.55,z:limit});
      assert.equal(row.readiness(row.prey).ready,false);assert.equal(row.gameState.targetState,'range');assert.match(row.gameState.targetText,/^OUT OF REACH/);assert.ok(row.gameState.targetText.includes('under '+limit.toFixed(1)+' m'));
      row.prey.position.z=limit-.001;row.refresh();assert.equal(row.readiness(row.prey).ready,true);assert.equal(row.gameState.targetState,'ready');assert.match(row.gameState.targetText,/^IN RANGE/);assert.equal(row.targetHalo.material.color.getHex(),0x94f4bf);cleanup(row);
    }
  });
  it('gives signed depth advice from actual current height, with keyboard and touch cues', () => {
    for(const touch of [false,true])for(const kind of ['fish','crab'])for(const sign of [-1,1]){
      const row=fixture({kind,touch,y:.55+sign*3.5,z:.1});assert.equal(row.gameState.targetState,'depth');assert.match(row.gameState.targetText,/^MATCH DEPTH/);assert.ok(row.gameState.targetText.includes(sign>0?'Rise':'Dive'));assert.ok(row.gameState.targetText.includes(touch?'Rise / Dive':'Q rises / Z descends'));assert.ok(row.gameState.targetDetail.includes(sign>0?'Rise':'Dive'));assert.equal(row.readiness(row.prey).ready,false);cleanup(row);
    }
  });
  it('retains cover and recovery precedence without changing strike clocks or geometry', () => {
    const row=fixture({cover:true,z:1});assert.equal(row.gameState.targetState,'blocked');assert.match(row.gameState.targetText,/^COVER BLOCKS/);assert.equal(row.targetHalo.material.color.getHex(),0xf4a782);
    const geometry=row.targetHalo.geometry,material=row.targetHalo.material,positions=Array.from(geometry.attributes.position.array),indices=Array.from(geometry.index.array);row.gameState.strikeReadyAt=1450;
    for(let i=0;i<240;i++)row.refresh();assert.equal(row.gameState.targetState,'recovering');assert.match(row.gameState.targetText,/^RECOVERING/);assert.equal(row.gameState.strikeReadyAt,1450);assert.equal(row.targetHalo.material.color.getHex(),0x9eb3c7);assert.equal(row.targetHalo.geometry,geometry);assert.equal(row.targetHalo.material,material);assert.deepEqual(Array.from(geometry.attributes.position.array),positions);assert.deepEqual(Array.from(geometry.index.array),indices);cleanup(row);
  });
  it('follows only the committed prey while next selection changes, including a null commitment', () => {
    const row=fixture({z:4}),original=row.prey,commit={target:original,at:1200};row.gameState.pendingStrike=commit;row.gameState.strikeReadyAt=1450;row.selectAlternative();original.position.set(.4,.3,4.2);row.refresh();
    assert.equal(row.gameState.targetState,'striking');assert.match(row.gameState.targetText,/^STRIKING/);assert.equal(row.copySource(),original.position);assert.deepEqual(row.targetHalo.position.toArray(),[.4,.36,4.2]);assert.equal(row.gameState.pendingStrike,commit);assert.equal(commit.at,1200);assert.equal(original.userData.alive,true);assert.equal(row.alternative.userData.alive,true);
    commit.target=null;row.refresh();assert.equal(row.targetHalo.visible,false);assert.equal(row.gameState.targetState,'striking');assert.match(row.gameState.targetText,/no prey selected/);assert.equal(row.gameState.pendingStrike,commit);cleanup(row);
  });
  it('flushes readiness changes immediately while preserving the six-second Observe hold and routine HUD cadence', () => {
    const line=source.split('\n').find(line=>line.includes("!==lastHudTargetState)lastHudAt="));assert.ok(line);
    const flush=new Function('gameState','now','lastHudTargetState','lastHudAt',line+';return lastHudAt;');
    assert.equal(flush({targetState:'ready',observationUntil:7000},1100,'range',1000),1000);
    assert.equal(flush({targetState:'ready',observationUntil:7000},7100,'range',1000),6975);
    assert.equal(flush({targetState:'ready',observationUntil:0},1100,'range',1000),975);
    assert.equal(flush({targetState:'ready',observationUntil:0},1100,'ready',1000),1000);
  });
  it('hides the presentation for inspection, dead prey, and detritus feeders', () => {
    for(const options of [{inspect:true},{diet:'detritus'}]){const row=fixture(options);assert.equal(row.targetHalo.visible,false);cleanup(row);}
    const row=fixture();row.prey.userData.alive=false;row.refresh();assert.equal(row.targetHalo.visible,false);assert.equal(row.gameState.targetState,'none');assert.equal(row.gameState.targetText,'');cleanup(row);
  });
});
