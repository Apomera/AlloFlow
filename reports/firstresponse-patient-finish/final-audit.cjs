const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const path = require('node:path');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo,'reports/firstresponse-patient-finish');
const read = name => fs.readFileSync(path.join(report,name),'utf8');
const json = name => JSON.parse(read(name).replace(/^\uFEFF/,''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(path.join(repo,'stem_lab/stem_tool_firstresponse.js'));
const mirror = fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js'));
assert(source.equals(mirror));
assert.equal(hash(source),'970fbb0e068412f3d3e3fb4ed01013a1afb56b9d5270fb2eb18d24201bfd012c');
const block = read('finish-block.js');
assert.equal(Buffer.byteLength(block),354);
assert.equal(source.toString('utf8').split(block).length,2);
assert.equal(hash(source.toString('utf8').replace(block,'')),'6e24299465bceafcce0f079ef8171d6ab2871f852a64483acad90ac57cd79a9f');
const runs = json('unit-final-summary.json');
assert.equal(runs.length,22);
const distinct = new Set(), files = {};
for (const run of runs) {
  assert.equal(run.status,'passed'); assert.equal(run.exit,0); assert.equal(run.failed,0); assert.equal(run.passed,run.expected);
  assert.equal(run.sourceSHA256.toLowerCase(),hash(source)); assert.equal(run.passedNames.length,run.expected);
  for (const name of run.passedNames) { const key=run.file+':'+name; assert(!distinct.has(key)); distinct.add(key); }
  files[run.file]=(files[run.file]||0)+run.passed;
}
assert.equal(distinct.size,176);
assert.deepEqual(Object.values(files).sort((a,b)=>a-b),[11,22,34,109]);
const browserLog=read('browser-final.log'); assert.match(browserLog,/3 passed/); assert.doesNotMatch(browserLog,/\d+ failed/);
const reviewLog=read('finish-review/browser-review.log'); assert.match(reviewLog,/1 passed/);
const pairs=json('patient-finish-metrics.json'); assert.equal(pairs.length,15);
assert.equal(new Set(pairs.map(pair=>pair.condition)).size,15);
const normal=pairs.filter(pair=>!pair.evidence.contrast), contrast=pairs.filter(pair=>pair.evidence.contrast);
assert.equal(normal.length,12); assert.equal(contrast.length,3);
const conditions=[];
for (const {condition,evidence:e} of pairs) {
  assert.equal(e.exteriorChanged,0); assert.equal(e.exteriorNoise,0); assert.equal(e.noise,0);
  let protectedCount=0;
  for (const [kind,stats] of Object.entries(e.sampleStats)) if(kind!=='skin') {
    assert.equal(stats.changed,0); assert.equal(stats.noise,0); protectedCount+=stats.count;
  }
  assert(protectedCount>8);
  for (const suffix of ['final.png','original.png','stage.png','evidence.json']) assert(fs.existsSync(path.join(report,condition+'-'+suffix)));
  if(e.contrast) assert.equal(e.changed,0);
  else {
    assert(e.changed>100); assert(e.finalMean/e.originalMean<.9);
    assert(e.finalRange>15); assert(e.finalRange/e.originalRange>.45);
    assert(e.originalBright>30); assert(e.finalBright/e.originalBright<.001);
    const capture=json(condition+'-evidence.json');
    assert.deepEqual(capture.pose.skin.color,[192/255*.86,148/255*.86,120/255*.86]);
  }
  conditions.push({condition,width:e.width,height:e.height,contrast:e.contrast,changedPixels:e.changed,
    meanLuminanceRatio:e.originalMean?e.finalMean/e.originalMean:null,
    originalNearClipped:e.originalBright,finalNearClipped:e.finalBright,
    finalLuminanceRange:e.finalRange,retainedRangeRatio:e.originalRange?e.finalRange/e.originalRange:null,
    protectedSamples:protectedCount,exteriorChanged:e.exteriorChanged,repeatNoise:e.noise});
}
const axeFiles=['adult-final-axe.json','child-final-axe.json','phone-infant-final-axe.json','phone-infant-forced-colors-axe.json'];
for(const file of axeFiles) assert.deepEqual(json(file),[]);
const ratios=conditions.filter(c=>!c.contrast).map(c=>c.meanLuminanceRatio);
const ranges=conditions.filter(c=>!c.contrast).map(c=>c.retainedRangeRatio);
const normalConditions=conditions.filter(c=>!c.contrast);
const highlightReductions=normalConditions.map(c=>1-c.finalNearClipped/c.originalNearClipped);
const result={source:{sha256:hash(source),mirrorExact:true,bytes:source.length,deltaBytes:354,
    reversionSHA256:hash(source.toString('utf8').replace(block,'')),diffuseScalar:.86,specular:'060606'},
  units:{passed:distinct.size,processes:runs.length,files},browser:{finalWorkflows:3,normalPairs:12,contrastPairs:3,
    studyWorkflows:1,studyHeadVariants:9,workers:1,retries:0,axeScans:4,axeViolations:0,
    measuredExteriorChanges:0,protectedInteriorChanges:0,repeatNoise:0,
    meanLuminanceRatioRange:[Math.min(...ratios),Math.max(...ratios)],retainedRangeRatioRange:[Math.min(...ranges),Math.max(...ranges)],
    minimumNearClippedReduction:Math.min(...highlightReductions),zeroNearClippedConditions:normalConditions.filter(c=>c.finalNearClipped===0).length,
    totalOriginalNearClipped:normalConditions.reduce((sum,c)=>sum+c.originalNearClipped,0),totalFinalNearClipped:normalConditions.reduce((sum,c)=>sum+c.finalNearClipped,0),
    changedPixelRGBTolerance:8,skinMaskDilationPixels:2},conditions};
fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
