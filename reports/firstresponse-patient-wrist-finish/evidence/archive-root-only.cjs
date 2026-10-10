const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,target=path.join(work,'candidate-rejected-root-only'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.ok(!fs.existsSync(target),'Preserve existing rejected candidate archive');
const candidateSHA256='dc9deade4909e37e9aa4918309541168696e808b7eb066575fea3fa91d574c7e';
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),candidateSHA256);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const file=path.join(dir,e.name);assert.ok(!e.isSymbolicLink(),'Do not archive symbolic links');return e.isDirectory()?walk(file):[file];});}
const entries=walk(work).map(file=>({file,relative:path.relative(work,file),bytes:fs.readFileSync(file)}));
for(const entry of entries)entry.sha256=sha(entry.bytes);
fs.mkdirSync(target);
for(const entry of entries){const destination=path.join(target,entry.relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,entry.bytes,{flag:'wx'});assert.equal(sha(fs.readFileSync(destination)),entry.sha256,'Archived bytes reread');}
for(const entry of entries)assert.equal(sha(fs.readFileSync(entry.file)),entry.sha256,'Original evidence changed during archive');
const rejection={accepted:false,candidateSHA256,decisionBy:'Root with independent visual review',reason:'Adult native comparison passed, but the change was minor polish. The conspicuous wrist/palm edge remained, so root requested a deeper refinement before delivery.',successfulCPU:{cases:30,assertions:261909,negative:2},nativeScope:'Only adult-wide was completed for this rejected candidate; child and infant workflows and focused raw tests were not executed for it.',artifacts:entries.map(({relative,sha256,bytes})=>({path:relative.split(path.sep).join('/'),sha256,bytes:bytes.length})),sharedWrites:0};
fs.writeFileSync(path.join(target,'rejection.json'),JSON.stringify(rejection,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({archived:true,candidateSHA256,files:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes.length,0),destination:target,sharedWrites:0}));
