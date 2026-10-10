const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceSHA256=sha(fs.readFileSync(path.join(__dirname,'candidate.js')));
assert.equal(sourceSHA256,'77394bfee2544c33c3274293a13e9666912c26f657117ac98d15416f220f060e');
const images=[];
for(const folder of ['native-adult','native-child','native-infant'])for(const name of fs.readdirSync(path.join(__dirname,folder)).filter(n=>n.endsWith('.png')).sort()){
  const file=folder+'/'+name;images.push({file,SHA256:sha(fs.readFileSync(path.join(__dirname,file))),accepted:true});
}
assert.equal(images.length,12);
const review={sourceSHA256,accepted:true,reviewer:'Root assistant inspected all 12 final PNGs with view_image.',images,
  observations:[
    'Adult wide pose8: small, softer finger/palm joins. Finger widths, tips, crease lines and cheek contact remain clear. Full-stage framing is unchanged.',
    'Child narrow pose4: the supporting finger roots blend more gently into the palm. The far hand remains visible at the top edge. Both hands retain their contours, and the close-up shows readable palm and thumb folds.',
    'Infant narrow high contrast pose8: the outline, fingertips and palm/thumb creases remain legible. The small root shading change produces no new disconnected black marks.'
  ],limitations:'Three raw-module native camera views. The improvement is subtle at screen size. Geometry-selected angle measurements include some vertices covered by the palm. Full application loader and build were not run.'};
fs.writeFileSync(path.join(__dirname,'visual-review.json'),JSON.stringify(review,null,2)+'\n');
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname,'visual-review.json'))),review);
console.log('Saved visual acceptance for all 12 inspected final images.');
