const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),cp=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report=path.join(repo,'reports/dissection-replay-review-2026-10-09');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'));
if(hash(source)!=='e3a88070afa77800d1be26612e69ad68d5949ee6322c588c49f2a3b192f5990d')throw Error('Unexpected source baseline');
if(!source.equals(fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'))))throw Error('Mirror drift');
fs.mkdirSync(path.join(report,'edits'),{recursive:true});
const protectedFiles={...JSON.parse(fs.readFileSync(path.join(repo,'reports/dissection-replay-evidence-2026-10-09/baseline.json'),'utf8')).protected};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else protectedFiles[path.relative(repo,p).replaceAll('\\','/')]=hash(fs.readFileSync(p));}}
walk(path.join(repo,'reports/dissection-replay-evidence-2026-10-09'));
for(const dir of ['tests','tests/e2e'])for(const e of fs.readdirSync(path.join(repo,dir),{withFileTypes:true}))if(e.isFile()&&/dissection/.test(e.name)){const p=dir+'/'+e.name;protectedFiles[p]=hash(fs.readFileSync(path.join(repo,p)));}
const git=args=>cp.execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true}).trim();
fs.writeFileSync(path.join(report,'baseline.json'),JSON.stringify({at:new Date().toISOString(),source:hash(source),head:git(['rev-parse','HEAD']),staged:git(['diff','--cached','--name-only']),protected:protectedFiles},null,2)+'\n');
fs.writeFileSync(path.join(report,'edits/source-before.js.gz'),zlib.gzipSync(source));
const handoff=path.join(repo,'AGENT_HANDOFF.md'),text=fs.readFileSync(handoff,'utf8');
const row='- 2026-10-09 | Codex Dissection replay review | IN PROGRESS. Owns canonical/public stem_lab/stem_tool_dissection.js, new focused replay-review unit/browser tests and reports/dissection-replay-review-2026-10-09. Add learner-controlled paused action review and readable playback controls. Preserve shared work/index. No staging, commit, push or deployment.';
if(text.includes(row))throw Error('Ownership already recorded');
fs.writeFileSync(handoff,text.replace('# AlloFlow Agent Handoff','# AlloFlow Agent Handoff\n\n'+row));
fs.writeFileSync(path.join(report,'edits/handoff-start.json'),JSON.stringify({row},null,2)+'\n');
let runner=fs.readFileSync(path.join(__dirname,'../replay-work/run-final.cjs'),'utf8');
runner=runner.replaceAll('dissection-replay-evidence-2026-10-09','dissection-replay-review-2026-10-09').replaceAll('dissection-replay-evidence.spec.ts','dissection-replay-review.spec.ts').replaceAll('dissection_replay_evidence.test.js','dissection_replay_review.test.js').replaceAll('replay-evidence','replay-review').replaceAll('DISSECTION_REPLAY_EVIDENCE_OUTPUT','DISSECTION_REPLAY_REVIEW_OUTPUT');
runner=runner.replace('replay evidence|persistent, accessible procedural instrument|renders guided instruments|renders specimen-aware realism controls|shows comparison replay statically','replay review|persistent, accessible procedural instrument|renders guided instruments|shows comparison replay statically');
fs.writeFileSync(path.join(__dirname,'run.cjs'),runner);
fs.writeFileSync(path.join(__dirname,'read.cjs'),`const fs=require('node:fs'),path=require('node:path');const p=path.resolve(process.argv[2]);const t=fs.readFileSync(p,'utf8').split(/\\r?\\n/);const start=+process.argv[3]||1,end=+process.argv[4]||t.length;console.log(t.slice(start-1,end).map((s,i)=>(start+i)+': '+s).join('\\n'));`);
console.log(JSON.stringify({report,protected:Object.keys(protectedFiles).length}));
