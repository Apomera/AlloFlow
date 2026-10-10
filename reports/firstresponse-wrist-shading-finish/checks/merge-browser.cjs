const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=process.argv.slice(2);assert.equal(names.length,2,'provide two accepted run directories');assert.equal(new Set(names).size,2);for(const name of names)assert.match(name,/^[a-z0-9-]+$/);
const delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8')),expected=delta.afterSHA256;
assert.equal(expected,'179ddeefd0c930ca4a084d98fc683c321fb4f36f720e62cddf8b30d56b576466');assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),expected);
const dest=path.join(work,'native-final');assert.ok(!fs.existsSync(dest),'combined evidence must be new');
const runs=names.map(name=>{const dir=path.join(work,name),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));return{name,dir,summary:read('summary.json'),inputs:read('inputs.json'),metrics:read('wrist-preview-metrics.json')};});
const views=['adult-heel-side','child-heel-side-contrast'];
assert.deepEqual(runs.flatMap(r=>r.summary.selectedViews).sort(),views.slice().sort());
for(const run of runs){
 assert.equal(run.summary.baselineSHA,delta.beforeSHA256);assert.equal(run.summary.finalSHA,expected);assert.equal(run.summary.inputsUnchanged,true);assert.equal(run.summary.baselineOnly,false);assert.equal(run.summary.workers,1);assert.equal(run.summary.retries,0);assert.equal(run.summary.workflows,1);assert.equal(run.summary.stats.expected,1);
 for(const k of ['unexpected','skipped','flaky'])assert.equal(run.summary.stats[k],0);
 for(const[p,h]of Object.entries(run.inputs.inputs))assert.equal(sha(fs.readFileSync(p)),h,'input changed: '+p);
 const watchdog=path.join(work,run.name+'-watchdog.json');
 if(fs.existsSync(watchdog)){const record=JSON.parse(fs.readFileSync(watchdog,'utf8'));assert.equal(record.run,run.name);assert.equal(record.timedOut,false);assert.equal(record.exitCode,0);assert.equal(record.runnerUnchanged,true);assert.equal(sha(fs.readFileSync(path.join(work,'run-native-bounded.cjs'))),record.wrapperSHA256);}
}
const evidence=runs.flatMap(r=>r.metrics.evidence);assert.equal(evidence.length,8);
for(const id of views)for(const variant of ['baseline','candidate'])for(const phase of ['release','compression'])assert.equal(evidence.filter(e=>e.id===id&&e.variant===variant&&e.phase===phase).length,1);
fs.mkdirSync(dest);
for(const run of runs){fs.cpSync(run.dir,path.join(dest,'runs',run.name),{recursive:true});for(const name of fs.readdirSync(run.dir).filter(n=>n.endsWith('.png')||n.endsWith('-evidence.json'))){assert.ok(!fs.existsSync(path.join(dest,name)));fs.copyFileSync(path.join(run.dir,name),path.join(dest,name));}const watchdog=path.join(work,run.name+'-watchdog.json');if(fs.existsSync(watchdog))fs.copyFileSync(watchdog,path.join(dest,'runs',run.name,'watchdog.json'));}
const images=fs.readdirSync(dest).filter(n=>n.endsWith('.png')).sort();assert.equal(images.length,16);
const imageHashes=Object.fromEntries(images.map(n=>[n,sha(fs.readFileSync(path.join(dest,n)))]));
const stats={expected:2,unexpected:0,skipped:0,flaky:0,duration:runs.reduce((sum,r)=>sum+r.summary.stats.duration,0)};
const summary={baselineSHA:delta.beforeSHA256,finalSHA:expected,workflows:2,selectedViews:views,evidenceCount:8,workers:1,retries:0,inputsUnchanged:true,privateCandidate:true,runs:names,images,imageHashes,stats};
fs.writeFileSync(path.join(dest,'summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(dest,'wrist-preview-metrics.json'),JSON.stringify({baselineSHA:summary.baselineSHA,finalSHA:expected,evidence},null,2)+'\n');
console.log(JSON.stringify(summary));
