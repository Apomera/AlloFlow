const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceSHA256='147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),sourceSHA256);
const previousReviewSHA256='345e758f8232ff6c781ee03cf3a70e371b14a9805574e185f2c4dcfd06e8c4a8';
const reviewFile=path.join(work,'independent-visual-review.json');
const archivedReview=path.join(work,'candidate-rejected-recovery-fold','independent-visual-review.json');
assert.equal(sha(fs.readFileSync(reviewFile)),previousReviewSHA256,'prior review changed');
assert.equal(sha(fs.readFileSync(archivedReview)),previousReviewSHA256,'prior review archive changed');
const folders={'adult-wide':'native-adult-fold-final','child-narrow':'native-child-fold-final','infant-narrow-contrast':'native-infant-fold-final'};
const reviewedImageHashes={
 'adult-wide-baseline-stage.png':'2a54c9d70c8193f8071eb98b3a786a4a8cc48df96f20a4d1c1a30b96d9c8d9e8',
 'adult-wide-baseline-wrist.png':'b8a51df8983d6adb5d666dc4911961018b8de9d17baf0feff0f0363a41209a5e',
 'adult-wide-candidate-stage.png':'579aa2cd340abcb34bb1f3c4c115dcbfcfe4df582bea433b009a68df70b38b01',
 'adult-wide-candidate-wrist.png':'f775c0016310350a49fea003b5575ff29febe404c94f978e79cd8625395e86eb',
 'child-narrow-baseline-stage.png':'9b4d28dd9d6452cc466ce1d1836c28bf71f1ad7d2eaaa8161caeeb20e677d81b',
 'child-narrow-baseline-wrist.png':'643c3d991ffbceefad32a3241127b2e54c455a9112c04e7619bfc65cf7eddb8a',
 'child-narrow-candidate-stage.png':'9285cc7ef68a63ec3aff306481a8b471585d42982c42a229d44aca403d288fea',
 'child-narrow-candidate-wrist.png':'90856a307dee0a6e7903740be8ea776ae4edc95945e1232db37ef6164397568a',
 'infant-narrow-contrast-baseline-stage.png':'7bd6901ebc5ec55fe5a5eb5cec4c3e1550ffc6abbac5b3ae339a9934691ee730',
 'infant-narrow-contrast-baseline-wrist.png':'db878c0a0f7be5f33d2f7ceb7c65d4ae0f03d69f1ee8f999ceb29fc1c14f63ee',
 'infant-narrow-contrast-candidate-stage.png':'363a2d702f2f329c0bcbc07071c9857ff667ceac431e7510f5ede048eb195a8c',
 'infant-narrow-contrast-candidate-wrist.png':'f643d3e17afceebac30f8fa3c2eee2239a4a1fff01bf4f275e60d5c597067c53'
};
const imageHashes={},nativeEvidence=[];
for(const[id,folder]of Object.entries(folders)){
 const summary=JSON.parse(fs.readFileSync(path.join(work,folder,'summary.json'),'utf8'));
 assert.equal(summary.finalSHA,sourceSHA256);assert.equal(summary.workflows,1);assert.equal(summary.stats.expected,1);assert.equal(summary.stats.unexpected,0);assert.equal(summary.stats.skipped,0);assert.equal(summary.stats.flaky,0);assert.equal(summary.inputsUnchanged,true);
 for(const variant of ['baseline','candidate'])for(const suffix of ['stage','wrist']){const file=id+'-'+variant+'-'+suffix+'.png';imageHashes[file]=sha(fs.readFileSync(path.join(work,folder,file)));assert.equal(imageHashes[file],reviewedImageHashes[file],'reviewed pixels changed: '+file);}
 nativeEvidence.push({id,folder,pixelComparison:summary.pixelComparisons[0]});
}
assert.equal(Object.keys(imageHashes).length,12);
const review={sourceSHA256,accepted:true,imageHashes,nativeEvidence,observations:[
 'Viewed all twelve baseline/candidate images at their native captured size: stage and same-frame wrist detail for adult wide, child narrow and infant narrow contrast.',
 'The adult candidate softens the lower wrist-to-palm corner into a small rounded shading transition. The broad upper forearm edge remains the same geometric silhouette. The change is useful local surface polish; it does not relocate the hand or erase the arm outline.',
 'The child candidate has a smoother wrist entry while preserving the visible palm, finger separation and full head framing. The second visible hand remains readable. No flat shading patch or discontinuous new highlight appeared in the reviewed views.',
 'The infant contrast candidate retains the wrist/hand outline and palm marks. Its small contour change introduces no new dark spike or broad filled patch. The unchanged contrast shader consumes the changed normal buffer, so its pixels can legitimately differ.',
 'The three matched native workflows report unchanged inputs and successful checks. Adult changed 790 stage/wrist pixels; child changed 886 stage pixels and 502 wrist pixels; infant changed 68 stage/wrist pixels.',
 'The prior review and source were preserved in candidate-rejected-recovery-fold. These twelve images were reviewed again for the final source above, whose fold-preservation behavior also has a separate adult recovery-pose diagnostic review.'
 ],limitations:'Raw-module native browser harness and three matched views only. No full-app loader, build or deployment verification. The unchanged geometric upper forearm boundary remains visible; this pass improves the local wrist shading transition. Adult recovery pose 8 is covered by a separate four-image diagnostic review, not by these twelve images.'};
const encoded=JSON.stringify(review,null,2)+'\n';
fs.writeFileSync(reviewFile,encoded);
assert.equal(fs.readFileSync(reviewFile,'utf8'),encoded,'saved review reread differs');
console.log(JSON.stringify({accepted:true,sourceSHA256,images:Object.keys(imageHashes).length,sharedFilesWritten:0}));
