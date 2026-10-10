const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const stage=__dirname,sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=fs.readFileSync(path.join(stage,'source-audit.cjs'),'utf8');assert.equal(sha(path.join(stage,'source-audit.cjs')),'164b5e08c3d4c637f60a0ca8c0515267a4d1cae2ae4ef6dce59d71ff4d37ba29');
const pin='255f57893385f5e0ae1a932d00f3ba8e7e98cacc8851bc6ce8985003bd025a75';assert.equal(sha(path.join(stage,'candidate-v2-renderer.js')),pin);
let next=before.replace("candidatePin='bbc67cfbf287f906882f085c4e54becdaa57d3f0d368d3fa6bef6b6fa5e78d34'","candidatePin='"+pin+"'");
assert.notEqual(next,before);next=next.replace("newPath=path.join(stage,'candidate-renderer.js')","newPath=path.join(stage,'candidate-v2-renderer.js')").replaceAll("'source-audit.json'","'source-audit-final.json'").replace("jump/scale<.01,'Sampled arc lookup world velocity stays within1% at joins'","jump/scale<.005,'Refined arc lookup world velocity stays within0.5% at joins'");
assert.equal(fs.existsSync(path.join(stage,'source-audit-final.cjs')),false);fs.writeFileSync(path.join(stage,'source-audit-final.cjs'),next);
console.log(JSON.stringify({completed:true,driver:'source-audit-final.cjs',driverHash:sha(path.join(stage,'source-audit-final.cjs')),candidatePin:pin}));
