const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),work=path.resolve(__dirname),source=path.resolve(work,'raw-wrist-fold-tests'),destination=path.resolve(work,'raw-memory-diagnostics/fold-interrupted-streaming');
for(const target of [source,destination])assert.ok(target.startsWith(work+path.sep)&&target!==work,'Move remains inside private work folder');
assert.ok(!fs.existsSync(destination),'Archive already exists');
assert.ok(!fs.existsSync(path.join(source,'candidate-results.json'))&&!fs.existsSync(path.join(source,'exit.json')),'A completed run must be reviewed');
const launch=JSON.parse(fs.readFileSync(path.join(source,'launch.json')));
assert.equal(launch.pid,26816);assert.equal(launch.parentPid,7508);assert.equal(launch.sourceSHA256,'147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891');
const files={};function inventory(folder,prefix=''){for(const name of fs.readdirSync(folder)){const item=path.join(folder,name),relative=prefix+name,stat=fs.lstatSync(item);assert.ok(!stat.isSymbolicLink());if(stat.isDirectory())inventory(item,relative+'/');else files[relative]=sha(fs.readFileSync(item));}}
inventory(source);
fs.renameSync(source,destination);
for(const [name,pin]of Object.entries(files))assert.equal(sha(fs.readFileSync(path.join(destination,name))),pin,'Archived bytes '+name);
assert.ok(!fs.existsSync(source));
const runner=fs.readFileSync(path.join(work,'run-raw-wrist.cjs'));assert.equal(sha(runner),launch.runnerSHA256);fs.writeFileSync(path.join(destination,'runner.cjs.saved'),runner);
const failure={status:'interrupted-no-result',sourceSHA256:launch.sourceSHA256,launch,files,runnerSHA256:sha(runner),processCheck:'Get-Process for exact saved child26816 and parent7508 returned no process after tool-session refresh. No test result or exit record exists.',testOutcome:null,verifiedReread:true};
fs.writeFileSync(path.join(destination,'failure.json'),JSON.stringify(failure,null,2)+'\n');
console.log(JSON.stringify({archived:destination,files:Object.keys(files).length,verifiedReread:true}));
