const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),zlib=require('zlib'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-checkpoint-coaching-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync(path.join(report,'edits/source-edits.json'))),beforeRun=JSON.parse(fs.readFileSync(path.join(report,'before-1/run.json'))),candidate=fs.readFileSync(path.join(__dirname,'source-next.js'));
assert.equal(beforeRun.exitCode,0);assert(beforeRun.inputHashesStable);assert.equal(hash(candidate),receipt.after);new vm.Script(candidate.toString());
const targets=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'].map(f=>path.join(repo,f));for(const f of targets)assert.equal(hash(fs.readFileSync(f)),receipt.before);
const d=fs.statfsSync(repo);assert(d.bavail*d.bsize>128*1048576);
const stages=targets.map(f=>f+'.checkpoint-coaching.tmp');for(const f of stages){fs.writeFileSync(f,candidate,{flag:'wx'});assert.equal(hash(fs.readFileSync(f)),receipt.after);}
for(let i=0;i<targets.length;i++){assert.equal(hash(fs.readFileSync(targets[i])),receipt.before);fs.renameSync(stages[i],targets[i]);}
for(const f of targets)assert.equal(hash(fs.readFileSync(f)),receipt.after);
fs.writeFileSync(path.join(report,'edits/source-after.js.gz'),zlib.gzipSync(candidate));console.log(JSON.stringify({source:receipt.after,mirrorIdentical:true,edits:receipt.edits.length}));
