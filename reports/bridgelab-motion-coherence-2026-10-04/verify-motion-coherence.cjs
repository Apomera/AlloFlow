const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const folder='reports/bridgelab-motion-coherence-2026-10-04/',source=fs.readFileSync('stem_lab/stem_tool_bridgelab.js','utf8');
const anchor="window.StemLab.registerTool('bridgeLab', {";assert(source.includes(anchor));
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){},warn(){}}};
vm.runInNewContext(source.replace(anchor,'window.motionModel={bridgeSeismicResponse,bridgeSeismicMotionFrame,BRIDGE_RESPONSE_ARCHETYPES};'+anchor),sandbox);
const {bridgeSeismicResponse:response,bridgeSeismicMotionFrame:frame,BRIDGE_RESPONSE_ARCHETYPES:modes}=sandbox.window.motionModel;
assert.equal(frame(null,null),null);assert.equal(frame({peaks:{}},null),null);
const opposite=frame({peaks:{groundM:1,absoluteM:1}},{groundM:-1,absoluteM:1,relativeM:2});assert.equal(opposite.groundPercent,10);assert.equal(opposite.deckPercent,90);assert.equal(opposite.deckPercent-opposite.groundPercent,80);
let combinations=0,frameChecks=0,opposingFrames=0,negativeGaps=0,zeroFrames=0,amplitudeChecks=0,pairedChecks=0;
function close(actual,expected,scale=1){assert(Math.abs(actual-expected)<=1e-10*Math.max(scale,Math.abs(expected)),actual+' != '+expected);}
for(const mode of modes)for(const dampingRatio of [0,0.05,0.2,0.4])for(const groundFrequencyHz of [0.2,1.1,3]){
  const trials=new Map();
  for(const intensityG of [0,0.000001,0.12,0.5]){
    const r=response({archetype:mode.id,dampingRatio,groundFrequencyHz,intensityG}),maximum=Math.max(r.peaks.groundM,r.peaks.absoluteM);trials.set(intensityG,r);combinations++;
    for(const p of r.samples){const f=frame(r,p);assert.equal(f.maximumM,maximum);assert.equal(f.rangeM,maximum>0?maximum:0.001);assert(Number.isFinite(f.groundPercent)&&Number.isFinite(f.deckPercent));for(const value of [f.groundPercent,f.deckPercent])assert(value>=10-1e-9&&value<=90+1e-9);close((f.groundPercent-50)*f.rangeM/40,p.groundM,f.rangeM);close((f.deckPercent-50)*f.rangeM/40,p.absoluteM,f.rangeM);close((f.deckPercent-f.groundPercent)*f.rangeM/40,p.relativeM,f.rangeM);if(p.groundM*p.absoluteM<0)opposingFrames++;if(p.relativeM<0)negativeGaps++;if(intensityG===0){assert.equal(f.groundPercent,50);assert.equal(f.deckPercent,50);zeroFrames++;}frameChecks++;}
  }
  const ordinary=trials.get(0.12),small=trials.get(0.000001),maximum=Math.max(ordinary.peaks.groundM,ordinary.peaks.absoluteM,small.peaks.groundM,small.peaks.absoluteM);
  for(let i=0;i<ordinary.samples.length;i+=24){const a=frame(ordinary,ordinary.samples[i]),b=frame(small,small.samples[i]);close(a.groundPercent,b.groundPercent);close(a.deckPercent,b.deckPercent);amplitudeChecks++;const pairA=frame(ordinary,ordinary.samples[i],small),pairB=frame(small,small.samples[i],ordinary);assert.equal(pairA.rangeM,maximum);assert.equal(pairB.rangeM,maximum);for(const [f,p] of [[pairA,ordinary.samples[i]],[pairB,small.samples[i]]]){close((f.deckPercent-f.groundPercent)*f.rangeM/40,p.relativeM,f.rangeM);pairedChecks++;}}
}
const result={status:'passed',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),inputCombinations:combinations,recordedFramesChecked:frameChecks,opposingGroundDeckFrames:opposingFrames,negativeRelativeGapFrames:negativeGaps,zeroFramesChecked:zeroFrames,amplitudeShapeChecks:amplitudeChecks,unequalPairFramesChecked:pairedChecks,syntheticOpposingEndpoints:'gap twice either absolute offset remains within rail'};
fs.writeFileSync(folder+'model-invariants.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
