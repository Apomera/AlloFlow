import {describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const from=source.indexOf('      function clHuntSpeciesStrategy('),to=source.indexOf('      // Controls describe the same species capabilities',from);
assert.ok(from>=0&&to>from);const rules=new Function(source.slice(from,to)+';return {strategy:clHuntSpeciesStrategy,advice:clHuntRefugeAdvice};')();
const refuge={gaps:[{x:-8.65,z:-12,width:.30,label:'Small crevice'},{x:-7.57,z:-12,width:.42,label:'Wider crevice'}]},position={x:0,z:0};
describe('Cephalopod Hunter species strategy and refuge guidance',()=>{
  it('directs small octopuses to the small passage and giant Pacific to a fitting wider passage',()=>{
    assert.match(rules.advice(refuge,'commonOcto',1,position),/^Small crevice 15 metres/);
    assert.match(rules.advice(refuge,'giantPacific',1.4,position),/^Wider crevice 14 metres/);
    assert.match(rules.advice(refuge,'blueRinged',.72,position),/^Small crevice/);
    assert.match(rules.advice(refuge,'commonOcto',1,position),/mouths remain exposed/);
  });
  it('does not offer missing, impossible, swimming or rigid-body squeeze routes',()=>{
    assert.equal(rules.advice(null,'commonOcto',1,position),'');
    assert.equal(rules.advice(refuge,'giantPacific',3,position),'');
    for(const id of ['cuttlefish','bobtailSquid','dumboOcto','vampireSquid','humboldtSquid','nautilus','unknown'])assert.equal(rules.advice(refuge,id,1,position),'',id);
  });
  it('gives all twelve species specific supported strategies and clearly identifies future behaviors',()=>{
    const ids=['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto','cuttlefish','bobtailSquid','dumboOcto','vampireSquid','humboldtSquid','nautilus'];
    assert.equal(new Set(ids.map(rules.strategy)).size,12);
    assert.match(rules.strategy('vampireSquid'),/marine snow/);assert.match(rules.strategy('cuttlefish'),/rigid cuttlebone/);assert.match(rules.strategy('humboldtSquid'),/Group coordination is not simulated/);assert.match(rules.strategy('coconutOcto'),/assembly.*not simulated/);assert.match(rules.strategy('nautilus'),/future realism/);
  });
});
