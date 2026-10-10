const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=process.argv.slice(2);assert.equal(names.length,3);for(const name of names)assert.match(name,/^[a-z0-9-]+$/);
const expected=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8')).afterSHA256;
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),expected);
const dest=path.join(work,'native-final');assert.ok(!fs.existsSync(dest),'combined evidence must be new');
const runs=names.map(name=>{const dir=path.join(work,name),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));return{name,dir,summary:read('summary.json'),inputs:read('inputs.json'),metrics:read('wrist-preview-metrics.json')};});
const views=['adult-oblique','adult-heel-side','child-heel-side-contrast'];
assert.deepEqual(runs.flatMap(r=>r.summary.selectedViews).sort(),views.slice().sort());
for(const run of runs){assert.equal(run.summary.finalSHA,expected);assert.equal(run.summary.inputsUnchanged,true);assert.equal(run.summary.baselineOnly,false);assert.equal(run.summary.workers,1);assert.equal(run.summary.retries,0);assert.equal(run.summary.stats.expected,run.summary.workflows);for(const k of ['unexpected','skipped','flaky'])assert.equal(run.summary.stats[k],0);for(const[p,h]of Object.entries(run.inputs.inputs))assert.equal(sha(fs.readFileSync(p)),h,'input changed: '+p);}
const evidence=runs.flatMap(r=>r.metrics.evidence);assert.equal(evidence.length,12);
for(const id of views)for(const variant of ['baseline','candidate'])for(const phase of ['release','compression'])assert.equal(evidence.filter(e=>e.id===id&&e.variant===variant&&e.phase===phase).length,1);
fs.mkdirSync(dest);
for(const run of runs){fs.cpSync(run.dir,path.join(dest,'runs',run.name),{recursive:true});for(const name of fs.readdirSync(run.dir).filter(n=>n.endsWith('.png')||n.endsWith('-evidence.json'))){assert.ok(!fs.existsSync(path.join(dest,name)));fs.copyFileSync(path.join(run.dir,name),path.join(dest,name));}}
const images=fs.readdirSync(dest).filter(n=>n.endsWith('.png'));assert.equal(images.length,24);
const stats={expected:3,unexpected:0,skipped:0,flaky:0,duration:runs.reduce((sum,r)=>sum+r.summary.stats.duration,0)};
const summary={baselineSHA:runs[0].summary.baselineSHA,finalSHA:expected,workflows:3,selectedViews:views,evidenceCount:12,workers:1,retries:0,inputsUnchanged:true,privateCandidate:true,runs:names,images,stats};
fs.writeFileSync(path.join(dest,'summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(dest,'wrist-preview-metrics.json'),JSON.stringify({baselineSHA:summary.baselineSHA,finalSHA:expected,evidence},null,2)+'\n');
console.log(JSON.stringify(summary));
