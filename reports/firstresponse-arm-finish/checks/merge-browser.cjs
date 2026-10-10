const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const names=process.argv.slice(2);assert.equal(names.length,2,'provide two accepted run directories');assert.equal(new Set(names).size,2);for(const name of names)assert.match(name,/^[a-z0-9-]+$/);
const delta=read(path.join(work,'delta.json')),expected=delta.afterSHA256,prior='179ddeefd0c930ca4a084d98fc683c321fb4f36f720e62cddf8b30d56b576466';
assert.equal(delta.beforeSHA256,prior);assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),expected);
const dest=path.join(work,'native-final');assert.ok(!fs.existsSync(dest),'combined evidence must be new');
const runs=names.map(name=>{const dir=path.join(work,name),json=n=>read(path.join(dir,n));return{name,dir,summary:json('summary.json'),inputs:json('inputs.json'),metrics:json('arm-preview-metrics.json')};});
const views=['adult-heel-side','child-heel-side-contrast'];assert.deepEqual(runs.flatMap(r=>r.summary.selectedViews).sort(),views.slice().sort());
for(const run of runs){
 const s=run.summary;assert.equal(s.baselineSHA,prior);assert.equal(s.finalSHA,expected);assert.equal(s.inputsUnchanged,true);assert.equal(s.baselineOnly,false);assert.equal(s.workers,1);assert.equal(s.retries,0);assert.equal(s.workflows,1);assert.equal(s.evidenceCount,4);assert.equal(s.stats.expected,1);
 for(const k of ['unexpected','skipped','flaky'])assert.equal(s.stats[k],0);
 for(const[p,h]of Object.entries(run.inputs.inputs))assert.equal(sha(fs.readFileSync(p)),h,'input changed: '+p);
 assert.equal(run.metrics.baselineSHA,prior);assert.equal(run.metrics.finalSHA,expected);assert.equal(run.metrics.evidence.length,4);
 const actual=fs.readdirSync(run.dir).filter(n=>n.endsWith('.png')).sort();assert.deepEqual(actual,s.images.slice().sort(),'all captures represented in summary');
 for(const e of run.metrics.evidence){assert.equal(e.sourceSHA,e.variant==='baseline'?prior:expected);assert.ok(e.detail.proof.sameCapturedFrame);if(e.elbowDetail){assert.ok(e.elbowDetail.proof.sameCapturedFrame);assert.equal(e.elbowDetail.proof.sourceSHA256,e.detail.proof.sourceSHA256);}}
}
const evidence=runs.flatMap(r=>r.metrics.evidence);assert.equal(evidence.length,8);
for(const id of views)for(const variant of ['baseline','candidate'])for(const phase of ['release','compression'])assert.equal(evidence.filter(e=>e.id===id&&e.variant===variant&&e.phase===phase).length,1);
const expectedImages=evidence.flatMap(e=>[e.capture,e.detail.file,...(e.elbowDetail?[e.elbowDetail.file]:[])]).sort();assert.equal(new Set(expectedImages).size,expectedImages.length);
for(const run of runs)for(const e of run.metrics.evidence)for(const image of [e.capture,e.detail.file,...(e.elbowDetail?[e.elbowDetail.file]:[])])assert.ok(fs.existsSync(path.join(run.dir,image)),'capture exists: '+image);
fs.mkdirSync(dest);
for(const run of runs){fs.cpSync(run.dir,path.join(dest,'runs',run.name),{recursive:true});for(const name of fs.readdirSync(run.dir).filter(n=>n.endsWith('.png')||n.endsWith('-evidence.json'))){assert.ok(!fs.existsSync(path.join(dest,name)));fs.copyFileSync(path.join(run.dir,name),path.join(dest,name));}}
const images=fs.readdirSync(dest).filter(n=>n.endsWith('.png')).sort();assert.deepEqual(images,expectedImages);
const imageHashes=Object.fromEntries(images.map(n=>[n,sha(fs.readFileSync(path.join(dest,n)))]));
const stats={expected:2,unexpected:0,skipped:0,flaky:0,duration:runs.reduce((sum,r)=>sum+r.summary.stats.duration,0)};
const summary={baselineSHA:prior,finalSHA:expected,workflows:2,selectedViews:views,evidenceCount:8,elbowCaptureCount:evidence.filter(e=>e.elbowDetail).length,workers:1,retries:0,inputsUnchanged:true,privateCandidate:true,runs:names,images,imageHashes,stats};
fs.writeFileSync(path.join(dest,'summary.json'),JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(path.join(dest,'arm-preview-metrics.json'),JSON.stringify({baselineSHA:prior,finalSHA:expected,evidence},null,2)+'\n');console.log(JSON.stringify(summary));
