import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
function region(first,last){const a=source.indexOf(first),b=source.indexOf(last,a);assert.ok(a>=0&&b>a,first);return source.slice(a,b);}
const interaction=region('            var heldE = !!keys.KeyE || !!gameState.forageTarget;','            // ─── Bubble particle animation');
const cancellation=region('        function cancelForage(message){','        function toggleForage(){');
const range=source.match(/var DRILL_RANGE\s*=\s*[^;]+;/),duration=source.match(/var DRILL_DURATION\s*=\s*[^;]+;/);assert.ok(range&&duration);
const makeFixture=new Function('objects',`
  const keys={},events=[],achievements=[],records=[],saves=[];
  let clams=objects,now=1000,dt=.05,isMoving=false,soundCount=0;
  ${range[0]} ${duration[0]}
  const octopus={position:{x:0,y:0,z:0}},capabilities={diet:'carnivore'};
  const gameState={forageTarget:null,forageProgress:0,drillingClam:null,drillProgress:0,tookHitAt:0,score:0,hunger:0,maxHunger:100,runStats:{clams:0}};
  const scene={remove(o){o.parent=null;}},rockBlocks=(a,b)=>!!b.blocked;
  const forageButton={setAttribute(k,v){this[k]=v;}},forageProgress={value:0},forageRow={hidden:false};
  const unlockAchievement=s=>achievements.push(s),recordEvent=(a,b)=>records.push([a,b]),clAnnounce=s=>events.push(s),sfxCatch=()=>soundCount++;
  const __alloT=(key,text)=>text,setCL=f=>saves.push(f({huntsSuccessful:0,huntBestRun:0}));
  const gameNow=now;
  ${cancellation}
  function step(options={}){if('held' in options)keys.KeyE=options.held;isMoving=!!options.moving;dt=options.dt===undefined?.05:options.dt;now+=dt*1000;${interaction}}
  return {step,gameState,octopus,capabilities,keys,events,achievements,records,saves,forageButton,forageProgress,forageRow,
    snapshot(){return {clams:clams.slice(),now,soundCount,range:DRILL_RANGE,duration:DRILL_DURATION};}};
`);
function clam(name,x=0,y=0,z=0){
  const counters={geometry:0,material:0};
  return {name,position:{x,y,z},userData:{alive:true},children:[{}, {rotation:{x:0}}],parent:'scene',counters,
    traverse(fn){fn({geometry:{dispose(){counters.geometry++;}},material:[{dispose(){counters.material++;}},{dispose(){counters.material++;}}]});}};
}
function near(actual,expected){assert.ok(Math.abs(actual-expected)<1e-10,`${actual} vs ${expected}`);}
function advance(f,frames=12,options={held:true}){for(let i=0;i<frames;i++)f.step(options);}

describe('Cephalopod Hunter clam drilling belongs to the worked shell',()=>{
  it('starts a newly approached clam from zero and closes the previous shell after held-E movement',()=>{
    const first=clam('first',.4),second=clam('second',1.8),f=makeFixture([first,second]);
    advance(f,20);assert.equal(f.gameState.drillingClam,first);assert.ok(f.gameState.drillProgress>.5);
    f.octopus.position.x=1.5;f.step({held:true,moving:true});const oldProgress=f.gameState.drillProgress;
    assert.ok(oldProgress>.4);f.step({held:true});
    assert.equal(f.gameState.drillingClam,second);near(f.gameState.drillProgress,.05/f.snapshot().duration);
    near(f.gameState.forageProgress,f.gameState.drillProgress);assert.equal(first.children[1].rotation.x,0);
    near(second.children[1].rotation.x,-f.gameState.drillProgress*Math.PI/6);
    assert.equal(f.gameState.score,0);assert.equal(first.userData.alive,true);assert.equal(second.userData.alive,true);
  });
  it('retains unfinished work and shell pose when the same clam is resumed after releasing E',()=>{
    const food=clam('same',.4),f=makeFixture([food]);advance(f,12);
    const progress=f.gameState.drillProgress;f.step({held:false});near(f.gameState.drillProgress,progress-.05*.8);
    assert.equal(f.gameState.drillingClam,food);near(food.children[1].rotation.x,-f.gameState.drillProgress*Math.PI/6);
    f.step({held:true});near(f.gameState.drillProgress,progress-.05*.8+.05/f.snapshot().duration);
    assert.equal(f.gameState.drillingClam,food);assert.equal(f.gameState.score,0);
  });
  it('decays the first clam while moving with E held without opening the newly nearest clam',()=>{
    const first=clam('first',.4),second=clam('second',1.8),f=makeFixture([first,second]);advance(f);
    const progress=f.gameState.drillProgress;f.octopus.position.x=1.5;advance(f,3,{held:true,moving:true});
    near(f.gameState.drillProgress,progress-3*.05*.8);assert.equal(f.gameState.drillingClam,first);
    assert.equal(second.children[1].rotation.x,0);assert.equal(f.gameState.score,0);
    advance(f,12,{held:false});assert.equal(f.gameState.drillProgress,0);assert.equal(f.gameState.drillingClam,null);
    near(first.children[1].rotation.x,0);
  });
  it('keeps tap-Forage locked to its chosen clam even when another clam is nearer',()=>{
    const chosen=clam('chosen',.9),nearer=clam('nearer',.2),f=makeFixture([chosen,nearer]);
    f.gameState.forageTarget=chosen;advance(f,12,{held:false});
    assert.equal(f.gameState.drillingClam,chosen);assert.equal(f.gameState.forageTarget,chosen);
    near(f.gameState.drillProgress,12*.05/f.snapshot().duration);assert.equal(nearer.children[1].rotation.x,0);
    chosen.position.blocked=true;f.step({held:false});near(f.gameState.drillProgress,12*.05/f.snapshot().duration-.05*.8);
    assert.equal(f.gameState.drillingClam,chosen);assert.equal(nearer.children[1].rotation.x,0);
  });
  it('discards stale progress without touching a dead previous clam when a new live clam is worked',()=>{
    const removed=clam('removed'),food=clam('new',.4),f=makeFixture([food]);removed.userData.alive=false;
    Object.defineProperty(removed,'children',{get(){throw new Error('disposed clam shell accessed');}});
    f.gameState.drillingClam=removed;f.gameState.drillProgress=.9;f.step({held:true});
    assert.equal(f.gameState.drillingClam,food);near(f.gameState.drillProgress,.05/f.snapshot().duration);
    assert.equal(f.gameState.score,0);assert.deepEqual(removed.counters,{geometry:0,material:0});
  });
  it('preserves strict reach, vertical reach, cover, injury, and detritus eligibility gates',()=>{
    for(const mode of ['range','depth','cover','injury','detritus']){
      const food=clam(mode,.4),f=makeFixture([food]);
      if(mode==='range')food.position.x=f.snapshot().range;
      if(mode==='depth')food.position.y=1;
      if(mode==='cover')food.position.blocked=true;
      if(mode==='injury')f.gameState.tookHitAt=1000;
      if(mode==='detritus')f.capabilities.diet='detritus';
      f.step({held:true});assert.equal(f.gameState.drillProgress,0,mode);assert.equal(f.gameState.drillingClam,null,mode);
      assert.equal(food.children[1].rotation.x,0,mode);assert.equal(f.gameState.score,0,mode);
    }
  });
  it('finishes and disposes one clam once with unchanged rewards for held and tap-Forage input',()=>{
    for(const tapped of [false,true]){
      const food=clam('meal',.4),f=makeFixture([food]);if(tapped)f.gameState.forageTarget=food;
      advance(f,100,{held:!tapped});assert.equal(f.gameState.score,1);assert.equal(f.gameState.hunger,30);
      assert.equal(f.gameState.runStats.clams,1);assert.equal(f.gameState.drillingClam,null);assert.equal(f.gameState.drillProgress,0);
      assert.equal(f.gameState.forageTarget,null);assert.equal(food.userData.alive,false);assert.equal(food.parent,null);
      assert.equal(f.snapshot().clams.length,0);assert.equal(f.snapshot().soundCount,1);assert.deepEqual(food.counters,{geometry:1,material:2});
      assert.deepEqual(f.achievements,['firstClam']);assert.equal(f.events.length,1);assert.equal(f.records.length,1);
      assert.deepEqual(f.saves,[{huntsSuccessful:1,huntBestRun:1}]);
      if(tapped){assert.equal(f.forageButton['aria-pressed'],'false');assert.equal(f.forageRow.hidden,true);}
    }
  });
});
