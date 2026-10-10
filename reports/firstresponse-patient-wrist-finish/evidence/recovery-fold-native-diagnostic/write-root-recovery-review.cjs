const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),sourceSHA256='147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
assert.equal(sha(fs.readFileSync(path.join(__dirname,'candidate.js'))),sourceSHA256);
const imageHashes={};for(const variant of ['baseline','candidate'])for(const part of ['stage','wrist']){const name='adult-wide-'+variant+'-'+part+'.png';imageHashes[name]=sha(fs.readFileSync(path.join(__dirname,'native-adult-recovery-fold',name)));}
const review={accepted:true,sourceSHA256,imageHashes,observations:[
  'Reviewed all four adult recovery-pose-8 stage and wrist images. The lower wrist-to-palm join has a rounder lighting transition where the baseline showed a hard lip.',
  'The bent wrist has no new visible dark patch or shading spike. The hand outline, finger placement and contact with the face remain clear.',
  'The forearm outline and full-stage framing remain aligned in the before-and-after pair.'
],limitations:'This is one additional raw-module adult recovery-pose-8 view. The full application loader, build and deployment were not tested.'};
const file=path.join(__dirname,'recovery-root-visual-review.json');assert.ok(!fs.existsSync(file));fs.writeFileSync(file,JSON.stringify(review,null,2)+'\n');assert.deepEqual(JSON.parse(fs.readFileSync(file)),review);console.log(JSON.stringify({accepted:true,sourceSHA256,images:4}));
