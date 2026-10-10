const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=path.resolve(__dirname),from=path.resolve(work,'raw-wrist-fold-tests'),to=path.resolve(work,'raw-memory-diagnostics/fold-interrupted-no-result'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const target of [from,to])assert.ok(target.startsWith(work+path.sep),'Archive move stays inside private work');assert.ok(!fs.existsSync(to));
for(const name of ['candidate-results.json','summary.json','candidate.log'])assert.ok(!fs.existsSync(path.join(from,name)),'Do not archive newly completed or diagnosed run');
const source=fs.readFileSync(path.join(from,'stem_lab/stem_tool_firstresponse.js'));assert.equal(sha(source),'147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{assert.ok(!e.isSymbolicLink());const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p];});
const files=walk(from).map(file=>({path:path.relative(from,file),sha256:sha(fs.readFileSync(file)),bytes:fs.statSync(file).size}));
fs.mkdirSync(path.dirname(to),{recursive:true});fs.renameSync(from,to);
for(const item of files){const file=path.join(to,item.path);assert.equal(sha(fs.readFileSync(file)),item.sha256);assert.equal(fs.statSync(file).size,item.bytes);}
const runner=fs.readFileSync(path.join(work,'run-raw-wrist.cjs'));fs.writeFileSync(path.join(to,'runner.cjs.saved'),runner);
const result={accepted:false,reason:'The app refreshed while the parent runner buffered child output. The exec session became unknown and no node process, result, log or summary remained. No test outcome can be inferred. All prepared inputs and original runner bytes are preserved.',session:75519,candidateSHA256:sha(source),runnerSHA256:sha(runner),files,verifiedAfterMove:true,sharedWrites:0};
fs.writeFileSync(path.join(to,'failure.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({archived:true,files:files.length,candidateSHA256:result.candidateSHA256,sharedWrites:0}));
