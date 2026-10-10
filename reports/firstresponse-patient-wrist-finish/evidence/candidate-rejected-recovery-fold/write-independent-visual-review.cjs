const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceSHA256='38660be59270be0b42e34649f7c7ef62f91a804671d3469631b48b5292a35be4';
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),sourceSHA256);
const folders={'adult-wide':'native-adult-palm-prototype','child-narrow':'native-child-narrow','infant-narrow-contrast':'native-infant-narrow-contrast'};
const imageHashes={},nativeEvidence=[];
for(const[id,folder]of Object.entries(folders)){
 const summary=JSON.parse(fs.readFileSync(path.join(work,folder,'summary.json'),'utf8'));
 assert.equal(summary.finalSHA,sourceSHA256);assert.equal(summary.workflows,1);assert.equal(summary.stats.expected,1);assert.equal(summary.stats.unexpected,0);assert.equal(summary.stats.skipped,0);assert.equal(summary.stats.flaky,0);assert.equal(summary.inputsUnchanged,true);
 for(const variant of ['baseline','candidate'])for(const suffix of ['stage','wrist']){const file=id+'-'+variant+'-'+suffix+'.png';imageHashes[file]=sha(fs.readFileSync(path.join(work,folder,file)));}
 nativeEvidence.push({id,folder,pixelComparison:summary.pixelComparisons[0]});
}
assert.equal(Object.keys(imageHashes).length,12);
const review={sourceSHA256,accepted:true,imageHashes,nativeEvidence,observations:[
 'Viewed all twelve baseline/candidate images at their native captured size: stage and same-frame wrist detail for adult wide, child narrow and infant narrow contrast.',
 'The adult candidate softens the lower wrist-to-palm corner into a small rounded shading transition. The broad upper forearm edge remains the same geometric silhouette. The change is useful local surface polish; it does not relocate the hand or erase the arm outline.',
 'The child candidate has a smoother wrist entry while preserving the visible palm, finger separation and full head framing. The second visible hand remains readable. No flat shading patch or discontinuous new highlight appeared in the reviewed views.',
 'The infant contrast candidate retains the wrist/hand outline and palm marks. Its small contour change introduces no new dark spike or broad filled patch. The unchanged contrast shader consumes the changed normal buffer, so its pixels can legitimately differ.',
 'All paired camera, crop, scene-transform, metadata, contact, learner-state and resource checks passed. Only the exact two patient wrist normal buffers differ. Adult changed 790 stage/wrist pixels; child changed 886 stage pixels and 502 wrist pixels; infant changed 68 stage/wrist pixels.',
 'The earlier root-only dc9 candidate was visually insufficient and was retained under candidate-rejected-root-only. This acceptance applies solely to the revised source above and the three folders named above.'
 ],limitations:'Raw-module native browser harness and three matched views only. No full-app loader, build or deployment verification. The unchanged geometric upper forearm boundary remains visible; this pass improves the local wrist shading transition.'};
fs.writeFileSync(path.join(work,'independent-visual-review.json'),JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({accepted:true,sourceSHA256,images:Object.keys(imageHashes).length,sharedFilesWritten:0}));
