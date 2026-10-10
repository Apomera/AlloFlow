const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-view-chooser-2026-10-06');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const summary=json(path.join(report,'validation-summary.json')),manifest=json(path.join(report,'manifest.json')),links=json(path.join(report,'local-links.json'));
const checkManifest=(root,m)=>{for(const e of m.entries){const b=fs.readFileSync(path.join(root,e.file));if(b.length!==e.bytes||sha(b)!==e.sha256)throw Error('Manifest changed '+e.file);}};
checkManifest(report,manifest);
for(const[f,h]of Object.entries({...summary.currentHashes,...summary.unchangedInputs}))if(sha(fs.readFileSync(path.join(repo,f)))!==h)throw Error('Input changed '+f);
const prior=path.join(repo,'reports/dissection-study-chooser-2026-10-05');checkManifest(prior,json(path.join(prior,'manifest.json')));
for(const l of links.links)if(!fs.existsSync(path.resolve(report,l)))throw Error('Missing link '+l);
if(!fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js')).equals(fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'))))throw Error('Mirror changed');
const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true});
if(git(['diff','--cached','--name-only'])!==summary.stagedPaths)throw Error('Staging changed');
git(['diff','--check','--','stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js','tests/dissection_lab_improvements.test.js','tests/e2e/dissection-view-chooser.spec.ts']);
const row=json(path.join(report,'edits/handoff-completion.json')).edits[0],handoff=fs.readFileSync(path.join(repo,'AGENT_HANDOFF.md'),'utf8');if(handoff.split(row.after).length!==2||handoff.includes(row.before))throw Error('Own handoff row differs');
const result={currentHashes:summary.currentHashes,unitPassed:summary.unitPassed,browserPassed:summary.browserPassed,checkedManifestEntries:manifest.entries.length,checkedLinks:links.count,priorReportEntries:summary.previousReportEntriesPreserved,head:git(['rev-parse','HEAD']).trim(),stagedPaths:summary.stagedPaths,whitespaceCheckPassed:true,ownHandoffRowMatches:true};
if(process.argv[2]==='post'){
  const targets=['C:/Users/cabba/Documents/Codex/2026-09-29/please-keep-improving-interactivity-engagement-and/dissection-view-chooser-2026-10-06','C:/Users/cabba/Documents/Codex/.diss-view-20261006'];
  if(targets.some(p=>fs.existsSync(p)))throw Error('Owned cleanup directory remains');result.ownedTemporaryDirectoriesRemoved=true;
  fs.writeFileSync(path.join(report,'post-cleanup-verification.json'),JSON.stringify(result,null,2));
  const files=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):[path.join(d,e.name)]);
  const entries=files(report).filter(f=>path.basename(f)!=='manifest.json').sort().map(f=>{const b=fs.readFileSync(f);return{file:path.relative(report,f).replace(/\\/g,'/'),bytes:b.length,sha256:sha(b)};});
  fs.writeFileSync(path.join(report,'manifest.json'),JSON.stringify({algorithm:'SHA-256',entries},null,2));checkManifest(report,{entries});result.finalManifestEntries=entries.length;
}
console.log(JSON.stringify(result));
