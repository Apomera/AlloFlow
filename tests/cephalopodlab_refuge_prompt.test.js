import {describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const start=source.indexOf('function clHuntRefugeText('),end=source.indexOf('function resolveCLHuntRockCollision(',start);assert.ok(start>=0&&end>start);const text=new Function(source.slice(start,end)+';return clHuntRefugeText;')();
describe('Compact crevice prompts',()=>{
 it('keeps all five contextual actions short while retaining the fuller exposure explanation',()=>{
  for(const phase of ['entering','settling','tucked','peeking','exiting']){const posture={phase},action=text(posture,'action');assert.ok(action.length>15&&action.length<=60,phase);assert.match(text(posture,true),/direction|exposed/);assert.ok(text(posture,false).length>10);}
  assert.match(text({phase:'tucked'},'action'),/Forward \/ Back.*peek/);assert.match(text({phase:'peeking'},'action'),/exposed.*deeper.*tuck/);assert.equal(text({phase:'open'},'action'),'');
 });
 it('uses compact action text in the prompt and full exposure text in Observe',()=>{
  assert.equal(source.split("prompt=clHuntRefugeText(gameState.refugePosture,'action');").length,2);assert.ok(source.includes('clHuntRefugeText(gameState.refugePosture,true)'));assert.ok(source.includes('clHuntRefugeText(gameState.refugePosture,false)'));
 });
});
