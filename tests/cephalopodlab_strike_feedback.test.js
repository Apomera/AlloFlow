import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
const constants = ['DRILL_RANGE', 'FISH_CATCH_RANGE'].map(name => { const match = source.match(new RegExp('var ' + name + '\\s*=\\s*[^;]+;')); assert.ok(match, name); return match[0]; }).join('\n');
// Execute the real selection and branch condition. The instrumented body only
// observes whether that branch was taken; native tests exercise the full meal.
const drillPrefix = region('var heldE = !!keys.KeyE || !!gameState.forageTarget;', 'gameState.drillingClam = nearestClam;');
const contactPrefix = region('if(gameState.pendingStrike&&now>=gameState.pendingStrike.at){', "if (nearest && prey === 'crab') {");
const missionFunction = region('function updateMission(){', "touchPanel=document.createElement('div');");
const run = new Function('THREE', 'document', 'options', `
  var now=options.now==null?1000:options.now,gameNow=now,announcements=[],gathered=false;
  var octopus=new THREE.Group();octopus.position.set(0,.55,0);
  var target=new THREE.Group();target.userData={alive:true,cfg:{},type:'rock'};target.position.set(0,.18,options.eligible?1.4:6);
  var clam=new THREE.Group();clam.userData={alive:true};clam.position.set(.5,.1,0);
  var clams=options.clam===false?[]:[clam],keys={KeyE:!!options.heldE},capabilities={diet:options.diet||'carnivore'},isMoving=!!options.moving;
  var gameState={forageTarget:options.latched?clam:null,tookHitAt:1000-(options.hitAge==null?1000:options.hitAge),pendingStrike:{target:options.noTarget?null:target,at:1000},strikeReadyAt:1450,strikeMessage:'',strikeMessageUntil:0,runStats:{crabs:0,clams:0},camoEff:0,targetText:'OUT OF REACH · move closer',targetDetail:'Rock crab · 6.0 m · ahead',announcedStep:-1};
  function rockBlocks(a,b){return b===target.position?!!options.preyCover:!!options.clamCover;}
  function clAnnounce(text){announcements.push(text);}function finishRun(){throw new Error('Free-mode feedback must not end the dive');}
  ${constants}
  ${region('function preyReadiness(', 'function forageReady(')}
  ${drillPrefix}gathered=true;}
  ${contactPrefix}}
  var mission=false,observation=false,lastMissionText='',missionBrief=document.createElement('div'),targetReadout=document.createElement('div'),targetDetail=document.createElement('div'),targetAction=document.createElement('div');
  document.body.appendChild(missionBrief);document.body.appendChild(targetReadout);targetReadout.appendChild(targetDetail);targetReadout.appendChild(targetAction);
  ${missionFunction}
  updateMission();
  return {gathered,gameState,announcements,capturable:typeof nearest!=='undefined'&&!!nearest,brief:missionBrief,targetReadout,advanceFeedback:function(time){gameNow=time;updateMission();}};
`);
function fixture(options = {}) { const dom = new JSDOM('<!doctype html><body></body>'); try { return run(THREE, dom.window.document, options); } finally { dom.window.close(); } }

describe('Cephalopod Hunter failed strike feedback beside clams', () => {
  it('shows the same real miss in the free-mode mission brief with or without an untouched reachable clam', () => {
    const noClam = fixture({ clam: false }), nearby = fixture();
    for (const row of [noClam, nearby]) { assert.equal(row.gathered, false); assert.equal(row.gameState.pendingStrike, null); assert.equal(row.gameState.strikeReadyAt, 1450); assert.equal(row.brief.hidden, false); assert.match(row.brief.textContent, /Missed\. Move closer and match the target depth\./); assert.deepEqual(row.announcements, [row.gameState.strikeMessage]); }
    assert.equal(nearby.brief.textContent, noClam.brief.textContent); assert.equal(nearby.gameState.strikeMessageUntil, 2800);
  });
  it('reports actual cover-blocked and uncommitted strikes beside an untouched clam', () => {
    const covered = fixture({ eligible: true, preyCover: true }), none = fixture({ noTarget: true });
    assert.equal(covered.capturable, false); assert.equal(covered.gathered, false); assert.equal(covered.brief.hidden, false); assert.match(covered.brief.textContent, /Strike blocked\. Move around the rock\./);
    assert.equal(none.brief.hidden, false); assert.match(none.brief.textContent, /No prey in reach\. T selects a nearby target\./);
  });
  it('suppresses spurious misses only when the unchanged held-E or latched gathering branch actually runs', () => {
    for (const options of [{ heldE: true }, { latched: true }]) { const row = fixture(options); assert.equal(row.gathered, true); assert.equal(row.gameState.strikeMessage, ''); assert.equal(row.brief.hidden, true); assert.deepEqual(row.announcements, []); }
    for (const options of [{ heldE: true, moving: true }, { heldE: true, hitAge: 250 }, { heldE: true, hitAge: 249 }, { heldE: true, clamCover: true }, { heldE: true, clam: false }, { heldE: true, diet: 'detritus' }]) { const row = fixture(options); assert.equal(row.gathered, false, JSON.stringify(options)); assert.match(row.gameState.strikeMessage, /Missed\./); }
    assert.equal(fixture({ heldE: true, hitAge: 250.001 }).gathered, true, 'The original strict post-hit gathering gate stays intact');
  });
  it('leaves eligible selected prey capturable without a false miss or implicit clam gathering', () => {
    for (const options of [{ eligible: true }, { eligible: true, heldE: true }]) { const row = fixture(options); assert.equal(row.capturable, true); assert.equal(row.gathered, !!options.heldE); assert.equal(row.gameState.strikeMessage, ''); assert.equal(row.brief.hidden, true); assert.deepEqual(row.announcements, []); }
  });
  it('retains contact timing and hides the actual brief at the unchanged message expiry boundary', () => {
    const early = fixture({ now: 999.999 }); assert.ok(early.gameState.pendingStrike); assert.equal(early.gameState.strikeMessage, ''); assert.equal(early.brief.hidden, true);
    const contact = fixture(); assert.equal(contact.gameState.pendingStrike, null); assert.equal(contact.brief.hidden, false); contact.advanceFeedback(2799.999); assert.equal(contact.brief.hidden, false); contact.advanceFeedback(2800); assert.equal(contact.brief.hidden, true); assert.equal(contact.brief.textContent, '');
  });
});
