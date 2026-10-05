const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync('stem_lab/stem_tool_bridgelab.js','utf8');
const anchor="window.StemLab.registerTool('bridgeLab', {";
assert(source.includes(anchor));
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){},warn(){}}};
vm.runInNewContext(source.replace(anchor,'window.peakModel={bridgeSeismicResponse,bridgeSeismicRecordedMaximum,bridgeSeismicComparison,bridgeSeismicSample,BRIDGE_RESPONSE_ARCHETYPES};'+anchor),sandbox);
const {bridgeSeismicResponse:response,bridgeSeismicRecordedMaximum:maximum,bridgeSeismicComparison:comparison,bridgeSeismicSample:sample,BRIDGE_RESPONSE_ARCHETYPES:modes}=sandbox.window.peakModel;
const measures={relative:{field:'relativeM',factor:100},acceleration:{field:'absoluteAccelerationMps2',factor:1/9.80665},stored:{field:'storedJPerKg',factor:1}};
assert.equal(maximum(null,'relative'),null);assert.equal(maximum({samples:[]},'relative'),null);
const tied={samples:[{timeS:0,relativeM:0},{timeS:1,relativeM:-2},{timeS:2,relativeM:2}]};
assert.equal(maximum(tied,'relative').timeS,1);assert.equal(maximum(tied,'relative').value,-200);assert.equal(maximum(tied,'constructor').timeS,1);
let experiments=0,recordedChecks=0,negativeChecks=0,zeroChecks=0,scalingChecks=0,pairedScaleChecks=0;
for(const mode of modes)for(const dampingRatio of [0,0.05,0.2,0.4])for(const groundFrequencyHz of [0.2,1.1,3]){
  const byIntensity=new Map();
  for(const intensityG of [0,0.000001,0.12,0.5]){
    const r=response({archetype:mode.id,dampingRatio,groundFrequencyHz,intensityG});byIntensity.set(intensityG,r);experiments++;
    for(const [measure,metric] of Object.entries(measures)){
      const peak=maximum(r,measure),rawMagnitudes=r.samples.map(p=>Math.abs(p[metric.field])),rawMaximum=Math.max(...rawMagnitudes),first=rawMagnitudes.indexOf(rawMaximum),expected=rawMaximum*metric.factor,chart=comparison(r,r,measure);
      assert.equal(peak.magnitude,expected);assert.equal(peak.timeS,r.samples[first].timeS);assert.equal(peak.point,r.samples[first]);assert.equal(peak.value,sample(r,peak.timeS)[metric.field]*metric.factor);
      assert.equal(chart.limit,(r.peaks[metric.field]*metric.factor>0?r.peaks[metric.field]*metric.factor:1)*1.04);
      assert(peak.magnitude<=r.peaks[metric.field]*metric.factor+Number.EPSILON*Math.max(1,expected));assert(Number.isFinite(chart.y(peak.value)));assert(!/NaN|Infinity/.test(chart.reference));
      if(peak.value<0){assert.equal(chart.metric.positive,false);assert(chart.y(peak.value)>90);negativeChecks++;}
      if(intensityG===0){assert.equal(peak.magnitude,0);assert.equal(peak.timeS,0);zeroChecks++;}
      recordedChecks++;
    }
  }
  for(const measure of Object.keys(measures)){
    const ordinary=byIntensity.get(0.12),small=byIntensity.get(0.000001),a=comparison(ordinary,ordinary,measure),b=comparison(small,small,measure),pa=maximum(ordinary,measure),pb=maximum(small,measure),ratio=0.000001/0.12;
    const expectedRatio=measure==='stored'?ratio*ratio:ratio;
    assert(Math.abs(pb.magnitude/pa.magnitude-expectedRatio)<1e-10*expectedRatio);
    assert(Math.abs(Math.abs(sample(small,pa.timeS)[b.metric.field]*b.metric.factor)-pb.magnitude)<1e-10*pb.magnitude);
    assert(Math.abs(Math.abs(sample(ordinary,pb.timeS)[a.metric.field]*a.metric.factor)-pa.magnitude)<1e-10*pa.magnitude);
    for(let i=0;i<ordinary.samples.length;i+=24)assert(Math.abs(a.y(ordinary.samples[i][a.metric.field]*a.metric.factor)-b.y(small.samples[i][b.metric.field]*b.metric.factor))<1e-8);
    const pair=comparison(ordinary,small,measure),reversed=comparison(small,ordinary,measure);
    assert.equal(pair.limit,a.limit);assert.equal(reversed.limit,pair.limit);assert.equal(pair.reference,a.reference);assert.equal(pair.reference,reversed.current);assert.equal(pair.current,reversed.reference);
    const plotted=pair.current.split(' ').map(point=>point.split(',').map(Number));
    for(let i=0;i<small.samples.length;i+=24){const value=small.samples[i][pair.metric.field]*pair.metric.factor,expectedY=pair.metric.positive?172-value/pair.limit*164:90-value/pair.limit*82;assert(Math.abs(plotted[i][1]-expectedY)<=0.005000001);}
    pairedScaleChecks+=2;
    scalingChecks++;
  }
}
assert(negativeChecks>0);
const result={status:'passed',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),inputCombinations:experiments,recordedMaximumChecks:recordedChecks,negativeMarkerChecks:negativeChecks,zeroHistoryChecks:zeroChecks,amplitudeScalingChecks:scalingChecks,unequalPairScaleChecks:pairedScaleChecks,tieSelection:'first exact occurrence'};
fs.writeFileSync('reports/bridgelab-recorded-maxima-2026-10-04/model-invariants.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
