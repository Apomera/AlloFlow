import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
function region(first,last){const a=source.indexOf(first),b=source.indexOf(last,a);assert.ok(a>=0&&b>a,first);return source.slice(a,b);}
const input=region('        var keys = {};','        var targetRay=');
const settings=region('        function openSettings(){','        settingsPanel.onkeydown=');
const inspect=region('        function inspectKey(e){','        function inspectPointerDown(e){');
const forage=region('        function forageReady(food){','        function updateThreatHud(){');
const snow=region('        function updateSnow(dt){','        // Created after gameplay actors:');
const axes=region('            var moveFwd =','            if(gameState.stamina<=1)');
const create=new Function('THREE','options',`
  var gameNow=1000,gKeyDownPrev=false,gameState={paused:false,gameOver:false,forageTarget:null,forageProgress:0,drillProgress:0,drillingClam:null,forageStartedAt:0,tookHitAt:0,hunger:20,maxHunger:100,score:0,runStats:{}};
  var inspection={active:false,wasPaused:false,drag:{id:1}},capabilities={diet:options.diet||'carnivore'},calls={help:0,focus:0,touchRelease:0,camera:0,target:0,inspect:0},announcements=[],records=[],orbits=[],zooms=[];
  var canvasEl={focus(){calls.focus++;}},document={hidden:false},pauseOverlay={style:{}},pauseButton={textContent:'Pause',title:'Pause dive (Escape)'},settingsWasPaused=false,mobileToolsWasPaused=false;
  var settingsPanel={hidden:true,querySelector(){return{focus(){calls.focus++;}};}},mobileToolsPanel={hidden:true};
  var guideIntro={textContent:''},species={name:'Common octopus'},settingsContent={scrollTop:20},guideTitle={focus(){calls.focus++;}};
  function updateHuntHelp(){calls.help++;} function clAnnounce(t){announcements.push(t);} function recordEvent(a,b){records.push([a,b]);} function releaseTouchInputs(){calls.touchRelease++;}
  function cycleCamera(){calls.camera++;} function cycleTarget(){calls.target++;} function toggleInspection(){calls.inspect++;} function orbit(x,y){orbits.push([x,y]);} function zoomSpecimen(n){zooms.push(n);}
  function __alloT(k,v){return v;} function rockBlocks(){return false;}
  var octopus=new THREE.Group(),food=new THREE.Group();food.position.set(1,0,0);food.userData={alive:true,gather:0};food.add(new THREE.Group(),new THREE.Group());
  var marineSnow=[food],clams=[food],DRILL_RANGE=2.4,forageButton={attributes:{},setAttribute(k,v){this.attributes[k]=v;}},forageProgress={value:0},forageRow={hidden:true};
  ${input}\n${settings}\n${inspect}\n${forage}\n${snow}
  return {gameState,inspection,calls,announcements,records,orbits,zooms,settingsPanel,mobileToolsPanel,pauseButton,pauseOverlay,food,forageButton,forageProgress,forageRow,
    down:onKeyDown,up:onKeyUp,inspect:inspectKey,clear:clearInput,pause:setPaused,blur:onWindowBlur,visibility:onVisibility,forage:toggleForage,updateForaging,snow:updateSnow,
    dispatch(e){inspectKey(e);if(!e.stopped)onKeyDown(e);},axes(){${axes}return{forward:moveFwd,turn};},
    snapshot(){return{keys:{...keys},strike:clickRequested,ink:inkRequested,gPrevious:gKeyDownPrev,settingsWasPaused,mobileToolsWasPaused};},
    markInteraction(){gKeyDownPrev=true;},consume(){clickRequested=false;inkRequested=false;},hidden(v){document.hidden=v;}
  };
`);
function fixture(options={}){return create(THREE,options);}
function event(code,extra={}){return{code,key:code,repeat:false,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};}
function press(f,code,extra={}){const e=event(code,extra);f.dispatch(e);return e;}
function release(f,code){f.up(event(code));}
const arrows=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];

describe('Cephalopod Hunter intuitive keyboard controls',()=>{
  it('moves and turns with arrow alternatives without doubling simultaneous WASD input',()=>{
    for(const [code,letter,expected] of [['ArrowUp','KeyW',{forward:1,turn:0}],['ArrowDown','KeyS',{forward:-1,turn:0}],['ArrowLeft','KeyA',{forward:0,turn:1}],['ArrowRight','KeyD',{forward:0,turn:-1}]]){
      const f=fixture();assert.equal(press(f,code).prevented,true);assert.deepEqual(f.axes(),expected);press(f,letter);assert.deepEqual(f.axes(),expected);
    }
  });
  it('keeps each alias independently held until its own key is released in either order',()=>{
    for(const [arrow,letter] of [['ArrowUp','KeyW'],['ArrowDown','KeyS'],['ArrowLeft','KeyA'],['ArrowRight','KeyD']])for(const reverse of [false,true]){
      const f=fixture();press(f,arrow);press(f,letter);const expected=f.axes();release(f,reverse?arrow:letter);assert.deepEqual(f.axes(),expected);release(f,reverse?letter:arrow);assert.deepEqual(f.axes(),{forward:0,turn:0});
    }
  });
  it('cancels opposite directions across bindings and leaves the remaining direction active on release',()=>{
    const f=fixture();press(f,'ArrowUp');press(f,'KeyS');press(f,'ArrowLeft');press(f,'KeyD');assert.deepEqual(f.axes(),{forward:0,turn:0});release(f,'KeyS');release(f,'ArrowLeft');assert.deepEqual(f.axes(),{forward:1,turn:-1});
  });
  it('preserves browser modifier shortcuts without capturing movement, actions, or help',()=>{
    for(const modifier of ['ctrlKey','metaKey','altKey'])for(const code of [...arrows,'KeyW','KeyE','KeyI','KeyV','KeyT','KeyF','Escape','Slash']){
      const f=fixture(),e=press(f,code,{[modifier]:true,key:code==='Slash'?'?':code});assert.equal(e.prevented,false);assert.deepEqual(f.snapshot().keys,{});assert.equal(f.calls.help+f.calls.camera+f.calls.target+f.calls.inspect,0);assert.equal(f.gameState.paused,false);
    }
  });
  it('opens help with the question-mark character once and restores the prior pause state on Escape',()=>{
    for(const paused of [false,true]){
      const f=fixture();f.pause(paused);const e=press(f,'Slash',{key:'?',shiftKey:true});assert.equal(e.prevented,true);press(f,'Slash',{key:'?',shiftKey:true,repeat:true});assert.equal(f.calls.help,1);assert.equal(f.settingsPanel.hidden,false);assert.equal(f.gameState.paused,true);assert.equal(f.pauseButton.textContent,'Resume');assert.equal(f.snapshot().keys.Slash,undefined);
      press(f,'Escape');assert.equal(f.settingsPanel.hidden,true);assert.equal(f.gameState.paused,paused);assert.equal(f.pauseButton.textContent,paused?'Resume':'Pause');
    }
  });
  it('keeps discrete toggles and strike/ink requests single-shot under key repeat',()=>{
    const f=fixture();for(const [code,name] of [['KeyV','camera'],['KeyT','target'],['KeyF','inspect']]){press(f,code);press(f,code,{repeat:true});assert.equal(f.calls[name],1);}
    press(f,'KeyE');press(f,'KeyI');assert.equal(f.snapshot().strike,true);assert.equal(f.snapshot().ink,true);f.consume();press(f,'KeyE',{repeat:true});press(f,'KeyI',{repeat:true});assert.equal(f.snapshot().strike,false);assert.equal(f.snapshot().ink,false);
    press(f,'KeyR');assert.equal(f.gameState.forageTarget,f.food);press(f,'KeyR',{repeat:true});assert.equal(f.gameState.forageTarget,f.food);release(f,'KeyR');press(f,'KeyR');assert.equal(f.gameState.forageTarget,null);
  });
  it('pauses once per Escape press, clears held input, and presents the action that resumes the dive',()=>{
    const f=fixture();press(f,'ArrowUp');press(f,'KeyE');press(f,'KeyI');press(f,'Escape');press(f,'Escape',{repeat:true});assert.equal(f.gameState.paused,true);assert.deepEqual(f.snapshot().keys,{});assert.equal(f.snapshot().strike||f.snapshot().ink,false);assert.equal(f.pauseButton.textContent,'Resume');assert.equal(f.pauseButton.title,'Resume dive (Escape)');assert.equal(f.pauseOverlay.style.display,'flex');
    assert.equal(press(f,'ArrowUp').prevented,true);assert.deepEqual(f.axes(),{forward:0,turn:0});press(f,'Escape');assert.equal(f.gameState.paused,false);assert.equal(f.pauseButton.textContent,'Pause');assert.equal(f.pauseOverlay.style.display,'none');f.gameState.gameOver=true;press(f,'ArrowUp');assert.deepEqual(f.axes(),{forward:0,turn:0});
  });
  it('uses arrows only for orbit while inspecting and prevents help or movement from leaking into the dive',()=>{
    const f=fixture();f.inspection.active=true;for(const code of arrows){const e=press(f,code);assert.equal(e.prevented,true);assert.equal(e.stopped,true);}assert.deepEqual(f.orbits,[[0,.08],[0,-.08],[-.12,0],[.12,0]]);assert.deepEqual(f.axes(),{forward:0,turn:0});
    press(f,'KeyW');press(f,'Slash',{key:'?',shiftKey:true});assert.equal(f.calls.help,0);assert.deepEqual(f.snapshot().keys,{});press(f,'Equal');press(f,'Minus');assert.deepEqual(f.zooms,[.92,1.08]);press(f,'KeyF');press(f,'KeyF',{repeat:true});assert.equal(f.calls.inspect,1);
  });
  it('clears movement, queued actions, interaction edges, and forage on blur or hidden document',()=>{
    for(const trigger of ['clear','blur','visibility']){
      const f=fixture();f.forage();f.food.userData.gather=.3;f.gameState.forageProgress=.5;f.gameState.drillProgress=.4;f.gameState.drillingClam=f.food;f.food.children[1].rotation.x=.8;press(f,'ArrowUp');press(f,'KeyW');press(f,'KeyE');press(f,'KeyI');f.markInteraction();f.hidden(true);f[trigger]();
      assert.deepEqual(f.snapshot().keys,{});assert.equal(f.snapshot().strike||f.snapshot().ink||f.snapshot().gPrevious,false);assert.equal(f.gameState.forageTarget,null);assert.equal(f.gameState.forageProgress+f.gameState.drillProgress+f.food.userData.gather+f.food.children[1].rotation.x,0);assert.equal(f.forageButton.attributes['aria-pressed'],'false');assert.equal(f.forageRow.hidden,true);assert.ok(f.calls.touchRelease>0);assert.equal(f.gameState.paused,trigger!=='clear');f.hidden(false);f.visibility();assert.deepEqual(f.axes(),{forward:0,turn:0});
    }
  });
  it('keeps a dive paused when the window loses focus during help, tools, or inspection',()=>{
    for(const kind of ['settings','tools','inspection']){
      const f=fixture();if(kind==='settings')press(f,'Slash',{key:'?'});if(kind==='tools'){f.pause(true);f.mobileToolsPanel.hidden=false;}if(kind==='inspection'){f.pause(true);f.inspection.active=true;}
      f.blur();assert.equal(f.gameState.paused,true);if(kind==='settings'){press(f,'Escape');assert.equal(f.gameState.paused,true);assert.equal(f.snapshot().settingsWasPaused,true);}if(kind==='tools')assert.equal(f.snapshot().mobileToolsWasPaused,true);if(kind==='inspection'){assert.equal(f.inspection.wasPaused,true);assert.equal(f.inspection.drag,null);}
    }
  });
  it('cancels ongoing clam and marine-snow foraging for every arrow movement, including opposed keys',()=>{
    for(const diet of ['carnivore','detritus'])for(const code of arrows){const f=fixture({diet});f.forage();assert.equal(f.gameState.forageTarget,f.food);f.food.userData.gather=.4;press(f,code);f.updateForaging();assert.equal(f.gameState.forageTarget,null);assert.equal(f.food.userData.gather,0);assert.match(f.announcements.at(-1),/Stay still/);}
    const f=fixture({diet:'detritus'});f.forage();press(f,'ArrowUp');press(f,'KeyS');assert.equal(f.axes().forward,0);f.updateForaging();assert.equal(f.gameState.forageTarget,null);
  });
  it('resets held-E marine-snow progress while an arrow is held and requires a fresh settled interval after release',()=>{
    for(const code of arrows){const f=fixture({diet:'detritus'});press(f,'KeyE');f.snow(.4);assert.ok(f.gameState.forageProgress>0);press(f,code);f.snow(.4);assert.equal(f.food.userData.gather,0);assert.equal(f.gameState.forageProgress,0);assert.equal(f.gameState.score,0);release(f,code);f.snow(.3);assert.equal(f.gameState.score,0);assert.ok(f.food.userData.gather>0);f.snow(.36);assert.equal(f.gameState.score,2);assert.equal(f.gameState.runStats.marineSnow,1);}
  });
});