const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),sourceSHA256='147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
assert.equal(sha(fs.readFileSync(path.join(__dirname,'candidate.js'))),sourceSHA256);
const imageHashes={};
for(const[id,dir]of [['adult-wide','native-adult-fold-final'],['child-narrow','native-child-fold-final'],['infant-narrow-contrast','native-infant-fold-final']])for(const variant of ['baseline','candidate'])for(const part of ['stage','wrist']){const name=id+'-'+variant+'-'+part+'.png';imageHashes[name]=sha(fs.readFileSync(path.join(__dirname,dir,name)));}
const review={sourceSHA256,accepted:true,imageHashes,observations:[
  'Reviewed all 12 final before/after stage and wrist images. The adult lower wrist-to-palm join now has a rounded, more continuous shading transition where the baseline had a hard dark lip.',
  'The adult forearm silhouette remains in the same position. This is a local finish improvement; the revised wrist does not look artificially flat and has no new visible spike.',
  'The child view has a softer wrist entry while the palm, fingers, supporting-hand contact and framing remain clear and unchanged.',
  'The infant high-contrast view retains a legible hand outline. Its small wrist-contour change introduces no new dark spike or filled patch.'
],limitations:'Raw-module native views only. Full application loader, full-app build and deployment were not tested.'};
const file=path.join(__dirname,'visual-review.json');if(fs.existsSync(file))assert.deepEqual(fs.readFileSync(file),fs.readFileSync(path.join(__dirname,'candidate-rejected-recovery-fold/visual-review.json')),'Prior review must match its preserved archive');fs.writeFileSync(file,JSON.stringify(review,null,2)+'\n');assert.deepEqual(JSON.parse(fs.readFileSync(file)),review);console.log(JSON.stringify({accepted:true,sourceSHA256,images:Object.keys(imageHashes).length}));
