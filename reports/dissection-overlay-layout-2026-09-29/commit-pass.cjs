const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const folder = path.resolve('reports/dissection-overlay-layout-2026-09-29');
const prepared = path.join(folder,'commit-preparation');
const files = ['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js','tests/dissection_workspace_bands.test.js','tests/e2e/dissection-overlay-layout.spec.ts',
  ...['README.md','before-phone-320.png','phone-320.png','phone-dorsal.png','phone-ventral.png','perch-edge.png','fullscreen.png','overlay-final-tests.log','browser-run-tail.log','ventral-recheck.log','unit-results.json','verification.json'].map(file=>'reports/dissection-overlay-layout-2026-09-29/'+file)];
function git(args,env=process.env,input) {
  const result = cp.spawnSync('git',args,{encoding:'utf8',env,input,maxBuffer:64*1024*1024});
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}
function assertTested() {
  const review = JSON.parse(fs.readFileSync(path.join(folder,'verification.json'),'utf8'));
  const source = fs.readFileSync(files[0]);
  if (crypto.createHash('sha256').update(source).digest('hex') !== review.rendererSha256 || !source.equals(fs.readFileSync(files[1]))) throw new Error('Tested renderer changed.');
}
async function main() {
  const mode = process.argv[2];
  if (mode === 'prepare') {
    assertTested(); fs.mkdirSync(prepared,{recursive:true});
    const base = git(['rev-parse','HEAD']).trim(), index=path.join(prepared,'dissection.index');
    const env = {...process.env,GIT_INDEX_FILE:index};
    git(['read-tree',base],env);
    for (const file of files.filter(file=>file.endsWith('.log'))) {
      const contents = fs.readFileSync(file,'utf8'), cleaned=contents.replace(/[\t ]+(?=\r?$)/gm,'').replace(/[\r\n]+$/,'')+'\n';
      if (contents !== cleaned) fs.writeFileSync(file,cleaned);
    }
    git(['add','-f','--',...files],env);
    git(['diff','--cached','--check'],env);
    const changed=git(['diff','--cached','--name-only'],env).trim().split('\n').filter(Boolean);
    if (changed.some(file=>!files.includes(file))) throw new Error('Commit scope includes an unexpected path.');
    const sharedIndex = git(['ls-files','--stage','-z','--',...changed]);
    fs.writeFileSync(path.join(prepared,'scope.json'),JSON.stringify({base,index,changed,sharedIndex},null,2));
    fs.writeFileSync(path.join(prepared,'staged.diff'),git(['diff','--cached'],env));
    console.log(JSON.stringify({base,paths:changed.length},null,2));
    console.log(git(['diff','--cached','--stat'],env)); return;
  }
  const scope=JSON.parse(fs.readFileSync(path.join(prepared,'scope.json'),'utf8'));
  const env={...process.env,GIT_INDEX_FILE:scope.index};
  if (mode === 'commit') {
    assertTested();
    if (git(['rev-parse','HEAD']).trim()!==scope.base) throw new Error('HEAD changed; prepare again.');
    if (git(['ls-files','--stage','-z','--',...scope.changed])!==scope.sharedIndex) throw new Error('Scoped shared staging changed; preserve and inspect it.');
    const output=git(['commit','-m','Improve Dissection Lab overlay clarity during zoom and pan'],env);
    console.log(output);
    const match=output.match(/\[[^\]\n]+ ([0-9a-f]{7,40})\]/);
    if (!match) throw new Error('Unexpected commit receipt.');
    const commit=git(['rev-parse',match[1]]).trim();
    fs.writeFileSync(path.join(prepared,'receipt.json'),JSON.stringify({commit,base:scope.base,paths:scope.changed},null,2));
  }
  if (mode === 'commit' || mode === 'finish') {
    const receipt=JSON.parse(fs.readFileSync(path.join(prepared,'receipt.json'),'utf8'));
    const entries=git(['ls-tree','-z',receipt.commit,'--',...scope.changed]).split('\0').filter(Boolean).map(entry=>{
      const at=entry.indexOf('\t'), [mode,type,blob]=entry.slice(0,at).split(' ');
      if (type!=='blob') throw new Error('Expected a file blob.');
      return mode+' '+blob+'\t'+entry.slice(at+1)+'\0';
    }).join('');
    for (let attempt=0;attempt<10;attempt++) {
      if (git(['ls-files','--stage','-z','--',...scope.changed])!==scope.sharedIndex) throw new Error('Shared staging changed; preserve it. Commit receipt is saved.');
      const result=cp.spawnSync('git',['update-index','-z','--index-info'],{encoding:'utf8',input:entries,maxBuffer:64*1024*1024});
      if (result.status===0) { console.log('Committed and synchronized scoped index entries: '+receipt.commit); return; }
      if (!result.stderr.includes('index.lock')) throw new Error(result.stderr||result.stdout);
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    throw new Error('Commit saved; shared index is still busy.');
  }
  if (mode === 'verify') {
    const receipt=JSON.parse(fs.readFileSync(path.join(prepared,'receipt.json'),'utf8'));
    git(['merge-base','--is-ancestor',receipt.commit,'HEAD']); assertTested();
    const changed=git(['diff-tree','--no-commit-id','--name-only','-r',receipt.commit]).trim().split('\n').filter(Boolean);
    if (JSON.stringify(changed)!==JSON.stringify(receipt.paths)) throw new Error('Committed paths differ from the reviewed scope.');
    const committed=git(['show',receipt.commit+':'+files[0]]).replace(/\r\n/g,'\n');
    if (committed!==fs.readFileSync(files[0],'utf8').replace(/\r\n/g,'\n')) throw new Error('The commit differs from the tested renderer.');
    if (git(['diff','--cached','--name-only','--',...receipt.paths]).trim()) throw new Error('Scoped paths remain staged.');
    console.log(JSON.stringify({commit:receipt.commit,paths:changed.length,testedRendererVerified:true,scopedIndexClean:true},null,2)); return;
  }
  throw new Error('Unknown mode.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
