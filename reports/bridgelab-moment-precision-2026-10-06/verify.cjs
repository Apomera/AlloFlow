const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report=path.join(root,'reports/bridgelab-moment-precision-2026-10-06');
const read=f=>fs.readFileSync(path.join(root,f));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=f=>JSON.parse(fs.readFileSync(path.join(report,f),'utf8'));
const canonical=read('stem_lab/stem_tool_bridgelab.js');
assert(canonical.equals(read('desktop/web-app/public/stem_lab/stem_tool_bridgelab.js')));
const source=canonical.toString('utf8');new vm.Script(source);assert(!/(?<!\r)\n/.test(source));
const edits=json('source-edits.json');assert.equal(hash(canonical),edits.afterSha256);assert.equal(edits.edits.length,3);
let prior=source;
for(const edit of [...edits.edits].reverse()){assert.equal(prior.split(edit.after).length,2);prior=prior.replace(edit.after,edit.before);}
assert.equal(hash(Buffer.from(prior)),edits.beforeSha256);
assert.equal(edits.beforeSha256,'a8ad1578d7555df6f460d004da49b4bfc392dd817adb66d0d7ef6464189926a5');
const modelPath='reports/bridgelab-frame-energy-2026-10-06/model-invariants-before-rounding.json';
const modelBytes=read(modelPath),model=JSON.parse(modelBytes.toString('utf8'));
assert.equal(model.status,'passed');assert.equal(model.configurations,144);
const finalCopy='J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second). Displayed values are rounded.';
const priorCopy='J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second).';
assert.equal(prior.split(finalCopy).length,2);
assert.equal(hash(Buffer.from(prior.replace(finalCopy,priorCopy))),model.sourceSha256);
const calls=/__alloT\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g;
const literals=[...source.matchAll(calls)].map(m=>'['+m[1]+','+m[2]+']');
const entries=new Map();for(const [key,value]of vm.runInNewContext('['+literals.join(',')+']',Object.create(null))){if(!key.startsWith('stem.bridgelab.'))continue;if(entries.has(key))assert.equal(entries.get(key),value);entries.set(key,value);}
assert.equal(entries.size,1355);
const english=[];
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){const bytes=read(file),data=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));for(const [key,value]of entries)assert.equal(data.stem.bridgelab[key.slice('stem.bridgelab.'.length)],value,file+':'+key);english.push({file,sha256:hash(bytes),literalFallbacksMatched:entries.size});}
const proof={status:'source-passed',checkedAt:new Date().toISOString(),sourceSha256:hash(canonical),sourceMirrorsIdentical:true,syntaxValid:true,english,
 model:{configurationsPreviouslyPassed:144,modelCodeUnchanged:true,path:modelPath,sha256:hash(modelBytes),sweepSourceSha256:model.sourceSha256,proof:'Reversing exactly the three documented UI edits and the prior rounding sentence reproduces the checked source hash.'}};
if(process.argv[2]==='source'){fs.writeFileSync(path.join(report,'source-verification.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));process.exit(0);}
function checkRun(kind){const run=json(kind+'-run.json'),bytes=fs.readFileSync(path.join(report,kind+'-results.json'));assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.inputsUnchanged,true);assert.deepEqual(run.inputsBefore,run.inputsAfter);for(const [file,info]of Object.entries(run.inputsBefore)){const b=read(file);assert.equal(hash(b),info.sha256);assert.equal(b.length,info.bytes);}assert.equal(hash(bytes),run.result.sha256);return{run,results:JSON.parse(bytes.toString('utf8'))};}
const {run,results}=checkRun('preview');assert.equal(run.workers,1);assert.equal(run.retries,0);assert.equal(run.video,'off');assert.equal(run.browserCache,'C:/Users/cabba/AppData/Local/ms-playwright');assert.equal(hash(fs.readFileSync(run.config.path)),run.config.sha256);
const flatten=ss=>ss.flatMap(s=>[...(s.specs||[]),...flatten(s.suites||[])]);
const specs=flatten(results.suites);assert.equal(specs.length,8);assert.deepEqual(results.errors,[]);assert.equal(results.stats.expected,8);for(const key of ['unexpected','skipped','flaky'])assert.equal(results.stats[key],0);
assert.equal(specs.filter(s=>s.title.startsWith('moment precision:')).length,2);assert.equal(specs.filter(s=>s.title.startsWith('key moments:')).length,3);assert.equal(specs.filter(s=>s.title.startsWith('frame energy:')).length,3);
for(const spec of specs){assert.equal(spec.ok,true);assert.equal(spec.tests.length,1);const test=spec.tests[0];assert.equal(test.status,'expected');assert.equal(test.projectName,'chromium');assert.equal(test.results.length,1);assert.equal(test.results[0].status,'passed');assert.equal(test.results[0].retry,0);assert.deepEqual(test.results[0].errors,[]);}
proof.browser={passed:8,startedAt:run.startedAt,finishedAt:run.finishedAt,retries:0,workers:1,browserCache:run.browserCache};
const start=Date.parse(run.startedAt),end=Date.parse(run.finishedAt);assert(end>=start);
proof.captures=[];for(const name of fs.readdirSync(report).filter(n=>/^moment-precision-.*\.png$/.test(n))){const f=path.join(report,name),bytes=fs.readFileSync(f),stat=fs.statSync(f);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(stat.mtimeMs>=start&&stat.mtimeMs<=end,'Stale '+name);proof.captures.push({name,sha256:hash(bytes),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});}
assert.deepEqual(proof.captures.map(c=>c.name).sort(),['1000','320'].flatMap(width=>['tiny-motion','tiny-end','normal-acceleration'].map(scene=>'moment-precision-'+width+'-'+scene+'.png')).sort());
proof.unit={status:'not completed',passed:null};
if(fs.existsSync(path.join(report,'unit-run.json'))){const metadata=json('unit-run.json');if(metadata.exitCode===0){const {results:unit}=checkRun('unit');assert.equal(unit.success,true);assert.equal(unit.numFailedTests,0);assert(unit.numPassedTests>0);proof.unit={status:'focused cases passed',passed:unit.numPassedTests,fullSuiteRerun:false};}else proof.unit={status:'focused run did not complete successfully',passed:null,exitCode:metadata.exitCode??null};}
proof.status='verified';fs.writeFileSync(path.join(report,'verification.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,browser:proof.browser.passed,captures:proof.captures.length,unit:proof.unit,english:entries.size,modelCodeUnchanged:true},null,2));
