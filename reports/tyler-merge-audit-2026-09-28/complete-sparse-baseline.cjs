const fs=require('fs'),path=require('path'),cp=require('child_process'),zlib=require('zlib'),crypto=require('crypto');
const MAIN=path.resolve(__dirname,'../..'),TARGET='C:/tmp/tyler_integration_candidate',REVIEW='C:/tmp/tyler_onboarding_review';
const git=(args,cwd=TARGET,input)=>cp.execFileSync('git',args,{cwd,input,encoding:'utf8',maxBuffer:40*1024*1024});
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'integration-main-snapshot.json'),'utf8'));
const receiptPath=path.join(__dirname,'integration-merge.json');
const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const sparsePath=git(['rev-parse','--git-path','info/sparse-checkout']).trim();
const patterns=fs.readFileSync(path.resolve(TARGET,sparsePath),'utf8').split(/\r?\n/).filter(Boolean);
const selected=patterns.map(s=>s.replace(/^\//,'').replace(/\\([!*?\[\]#])/g,'$1'));
git(['read-tree','HEAD']);
const tracked=new Set(git(['ls-files','-z']).split('\0').filter(Boolean));
const missing=selected.filter(p=>tracked.has(p) && !fs.existsSync(path.join(TARGET,p)) && !snapshot.captured.some(x=>x.path===p && x.deleted));
if(missing.length)git(['checkout-index','-z','--stdin','--ignore-skip-worktree-bits'],TARGET,missing.join('\0')+'\0');
console.log('Materialized '+missing.length+' missing baseline files without overwriting candidate files.');
const diff=require(path.join(MAIN,'node_modules/diff'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const emptyHash=hash('');
const cleanPaths=new Set(git(['ls-tree','-r','--name-only','-z',snapshot.head],MAIN).split('\0').filter(Boolean));
const repairPaths=receipt.results.filter(x=>x.before===emptyHash && cleanPaths.has(x.path) && !snapshot.captured.some(y=>y.path===x.path && y.deleted)).map(x=>x.path);
const patches=repairPaths.length?diff.parsePatch(git(['diff','--no-ext-diff','--no-color',receipt.base,'--',...repairPaths],REVIEW)):[];
let repaired=0;
for(const entry of receipt.results){
 if(entry.before!==emptyHash || !cleanPaths.has(entry.path) || snapshot.captured.some(x=>x.path===entry.path && x.deleted))continue;
 const ours=git(['show',snapshot.head+':'+entry.path],MAIN).replace(/\r\n/g,'\n');
 const patch=patches.find(x=>x.newFileName.replace(/^b\//,'')===entry.path);
 let merged=diff.applyPatch(ours,patch,{fuzzFactor:0});
 if(merged===false){
  const base=git(['show',receipt.base+':'+entry.path],MAIN).replace(/\r\n/g,'\n');
  const theirs=fs.existsSync(path.join(REVIEW,entry.path))?fs.readFileSync(path.join(REVIEW,entry.path),'utf8').replace(/\r\n/g,'\n'):git(['show','origin/onboarding-redesign:'+entry.path],MAIN);
  const temp=path.join(TARGET,'.tyler-merge-scratch');
  for(const [name,text] of Object.entries({ours,base,theirs}))fs.writeFileSync(path.join(temp,name),text);
  const r=cp.spawnSync('git',['merge-file','-p','--diff3','-L','CURRENT_MAIN','-L','COMMON_ANCESTOR','-L','TYLER_REVIEW',path.join(temp,'ours'),path.join(temp,'base'),path.join(temp,'theirs')],{encoding:'utf8',maxBuffer:30*1024*1024});
  if(r.status<0||r.status>127||!r.stdout)throw Error('Merge failed '+entry.path);
  merged=r.stdout;entry.mode='three-way';entry.conflicts=r.status?[{count:r.status}]:[];
 }else{entry.mode='patch';entry.conflicts=[];}
 fs.writeFileSync(path.join(__dirname,'integration-preimages',entry.path+'.gz'),zlib.gzipSync(ours));
 fs.writeFileSync(path.join(TARGET,entry.path),merged);
 entry.before=hash(ours);entry.after=hash(merged);repaired++;
 fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
 console.log('Reconciled '+entry.path+(entry.conflicts.length?' (review required)':''));
}
receipt.baselineCompletion={at:new Date().toISOString(),materialized:missing.length,repaired};
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({repaired,remainingConflicts:receipt.results.filter(x=>x.conflicts.length).map(x=>({path:x.path,conflicts:x.conflicts}))}));
