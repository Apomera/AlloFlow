const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const stage=__dirname,target=path.join(stage,'attempts/source-audit-v1'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const result=JSON.parse(fs.readFileSync(path.join(stage,'source-audit.json')));
assert.equal(result.completed,true);assert.equal(result.candidateHash,'bbc67cfbf287f906882f085c4e54becdaa57d3f0d368d3fa6bef6b6fa5e78d34');
assert.equal(sha(path.join(stage,'source-audit.cjs')),result.driverHash);assert.equal(fs.existsSync(target),false);fs.mkdirSync(target,{recursive:true});
for(const file of['source-audit.cjs','source-audit.json','baseline-renderer.js'])fs.copyFileSync(path.join(stage,file),path.join(target,file));
const archived=path.join(stage,'attempts/route-v1/candidate-renderer.js');assert.equal(sha(archived),result.candidateHash);fs.copyFileSync(archived,path.join(target,'candidate-renderer.js'));
console.log(JSON.stringify({completed:true,target:path.relative(stage,target).replaceAll('\\','/'),driverHash:result.driverHash,candidateHash:result.candidateHash}));
