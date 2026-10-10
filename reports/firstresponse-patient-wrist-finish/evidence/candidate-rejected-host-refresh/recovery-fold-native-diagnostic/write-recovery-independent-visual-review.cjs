const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const work = __dirname;
const folder = 'native-adult-recovery-fold';
const sourceSHA256 = '147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
const baselineSHA256 = '69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const imageHashes = {
  'adult-wide-baseline-stage.png': '0807e2357e8ea8f4483538fd135aea4851595920486b41c06a6eeea0ec395a7c',
  'adult-wide-baseline-wrist.png': '5b63b89f7a49098a6016c45a7f9453ff471ec45fc75bd35034580933afa8a31d',
  'adult-wide-candidate-stage.png': '0bb16ad958616588cb48dfba3765315a7f057ed0de94e0af85cdb4b4ff0f00fc',
  'adult-wide-candidate-wrist.png': '6affae4fc9aa9036c96300a2334dfa12cc2bfedd6c23523ce85219af1bfe7464'
};
assert.equal(sha(fs.readFileSync(path.join(work, 'candidate.js'))), sourceSHA256);
assert.equal(sha(fs.readFileSync(path.join(work, 'before.js'))), baselineSHA256);
for (const [file, hash] of Object.entries(imageHashes)) {
  assert.equal(sha(fs.readFileSync(path.join(work, folder, file))), hash, 'reviewed pixels changed: ' + file);
}
const summary = JSON.parse(fs.readFileSync(path.join(work, folder, 'summary.json'), 'utf8'));
assert.equal(summary.finalSHA, sourceSHA256);
assert.equal(summary.baselineSHA, baselineSHA256);
assert.equal(summary.workflows, 1);
assert.equal(summary.stats.expected, 1);
assert.equal(summary.stats.unexpected, 0);
assert.equal(summary.stats.skipped, 0);
assert.equal(summary.stats.flaky, 0);
assert.equal(summary.inputsUnchanged, true);
const evidence = JSON.parse(fs.readFileSync(path.join(work, folder, 'adult-wide-evidence.json'), 'utf8'));
assert.equal(evidence.finalSHA, sourceSHA256);
assert.equal(evidence.baselineSHA, baselineSHA256);
assert.equal(evidence.view.pose, 8);
assert.equal(evidence.view.age, 'adult');
assert.equal(evidence.view.contrast, false);
const review = {
  accepted: true,
  sourceSHA256,
  imageHashes,
  reviewer: 'Independent visual reviewer',
  pose: 8,
  age: 'adult',
  folder,
  observations: [
    'Viewed all four captured images at their native size: baseline and candidate full stage, followed by the same-frame wrist details for adult recovery pose 8.',
    'The candidate rounds the shading across the lower wrist entry into the palm. The existing forearm outline and the small folded corner remain in the same locations.',
    'The reviewed candidate has no new dark wedge, broad flat patch or broken highlight at this wrist join. The palm markings, separate fingers and contact against the face remain visually consistent with the baseline.',
    'The whole-stage comparison retains the same framing and visible patient features. The native summary records 1056 changed pixels, all within the wrist crop, for this matched view.'
  ],
  limitations: 'One raw-module native browser view: adult recovery pose 8 in normal lighting. This is a visual check of the captured wrist region; the separate CPU checks assess folded-face normal preservation. No full-app loader, build or deployment verification.'
};
const output = path.join(work, 'recovery-visual-review.json');
assert.equal(fs.existsSync(output), false, 'independent recovery review already exists');
const encoded = JSON.stringify(review, null, 2) + '\n';
fs.writeFileSync(output, encoded);
assert.equal(fs.readFileSync(output, 'utf8'), encoded, 'saved review reread differs');
console.log(JSON.stringify({ accepted: true, sourceSHA256, pose: 8, images: 4, sharedFilesWritten: 0 }));
