const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(sha(path.join(repo,'stem_lab/universe_flight_scene.js')),'8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9');
const manifest=JSON.parse(fs.readFileSync(path.join(stage,'candidate-atlas-test-patch-manifest.json')));
assert.equal(manifest.files.length,4);
for(const t of manifest.files){assert.equal(sha(t.sourcePath),t.baselineHash);assert.equal(sha(t.candidatePath),t.candidateHash);}
const primary=JSON.parse(fs.readFileSync(path.join(report,'unit/execution.json')));assert.equal(primary.completed,true);
for(const t of manifest.files){fs.copyFileSync(t.sourcePath,path.join(report,'preimages',path.basename(t.baselinePath)));fs.copyFileSync(t.candidatePath,t.sourcePath);assert.equal(sha(t.sourcePath),t.candidateHash);}
const result={completed:true,targets:manifest.files.map(x=>({path:path.relative(repo,x.sourcePath).replaceAll('\\','/'),baselineHash:x.baselineHash,candidateHash:x.candidateHash})),committed:false};
fs.writeFileSync(path.join(report,'atlas-test-installation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
