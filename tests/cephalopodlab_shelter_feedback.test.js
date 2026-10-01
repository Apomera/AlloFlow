import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),start=source.indexOf('function clHuntShelterCarryText('),end=source.indexOf('function initHuntSim3D(',start);
assert.ok(start>=0&&end>start);const helpers=new Function(source.slice(start,end)+';return {carry:clHuntShelterCarryText,tradeoff:clHuntShelterTradeoffText,placed:clHuntPlacedShelterText,nearest:clHuntNearestPlacedShelter};')();
const conch={label:'conch shell',camoBonus:.4,speedPenalty:.15,dropLifeMs:60000,carriable:true},sponge={label:'barrel sponge',camoBonus:.45,speedPenalty:0,dropLifeMs:0,carriable:false};
function object(state,x=0,y=0,z=0){return{position:{x,y,z},userData:{state,createdAt:1000}};}
describe('Cephalopod Hunter actionable shelter guidance',()=>{
  it('reports actual per-type camouflage, carrying speed and finite placed lifetimes',()=>{
    assert.equal(helpers.tradeoff(conch),'+40% camo · 15% slower · 60s placed cover');assert.equal(helpers.tradeoff(sponge),'+45% camo · anchored');
    assert.equal(helpers.tradeoff({...conch,label:'coconut half',camoBonus:.3,speedPenalty:.1,dropLifeMs:90000}),'+30% camo · 10% slower · 90s placed cover');
    assert.equal(helpers.tradeoff({...conch,label:'glass bottle',camoBonus:.2,speedPenalty:.05,dropLifeMs:120000}),'+20% camo · 5% slower · 120s placed cover');
    // These are the actual species multipliers used by movement: giant
    // Pacific 0, coconut octopus .3, and common octopus 1. Zero must not fall
    // through a falsy default; 4.5% must not report the unadjusted 15% cost.
    for(const [cost,text] of [[0,'no carry slowdown'],[.3,'4.5% slower'],[1,'15% slower']]){assert.equal(helpers.carry(conch,cost),text);assert.equal(helpers.tradeoff(conch,cost),'+40% camo · '+text+' · 60s placed cover');}
    assert.equal(helpers.carry(conch),'15% slower');assert.equal(helpers.carry(conch,null),'15% slower');assert.equal(helpers.tradeoff(sponge,0),'+45% camo · anchored');
  });
  it('rounds cover countdown upward without inventing a lifetime for an anchored sponge',()=>{
    const data={state:'dropped',createdAt:1000},copy={...data};assert.equal(helpers.placed(conch,data,1000),'conch shell · +40% camo · 60s left');assert.equal(helpers.placed(conch,data,60001),'conch shell · +40% camo · 1s left');assert.equal(helpers.placed(conch,data,61000),'conch shell · +40% camo · 0s left');assert.equal(helpers.placed(conch,data,99000),'conch shell · +40% camo · 0s left');assert.deepEqual(data,copy);
    assert.equal(helpers.placed(sponge,{state:'static',createdAt:0},1e9),'barrel sponge · +45% camo · anchored');
  });
  it('uses the distinct real den and camouflage height limits with strict horizontal boundaries',()=>{
    const cover=object('static'),position={x:0,y:1.1,z:0};assert.equal(helpers.nearest([cover],position,1.5,1),null);assert.equal(helpers.nearest([cover],position,1.5,1.2),cover);
    for(const sign of [-1,1]){position.y=sign*1;assert.equal(helpers.nearest([cover],position,1.5,1),null);position.y=sign*.999;assert.equal(helpers.nearest([cover],position,1.5,1),cover);}
    position.y=.5;position.x=1.5;assert.equal(helpers.nearest([cover],position,1.5,1),null);position.x=1.499;assert.equal(helpers.nearest([cover],position,1.5,1),cover);
    cover.position.y=NaN;assert.equal(helpers.nearest([cover],position,1.5,1),null);
  });
  it('selects only the nearest actual placed cover without mutating free, carried or neighboring objects',()=>{
    const free=object('free',.1),carried=object('carried',.2),dropped=object('dropped',.8),staticCover=object('static',.5),high=object('static',.1,4),items=[free,carried,dropped,staticCover,high],before=JSON.stringify(items),position={x:0,y:.55,z:0};
    assert.equal(helpers.nearest(items,position,1.5,1),staticCover);assert.equal(JSON.stringify(items),before);staticCover.userData.state='free';assert.equal(helpers.nearest(items,position,1.5,1),dropped);dropped.position.x=2;assert.equal(helpers.nearest(items,position,1.5,1),null);
  });
});
