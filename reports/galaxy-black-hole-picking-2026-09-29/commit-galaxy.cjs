// Keep this task's commit separate from other shared staged work.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),report=path.relative(root,__dirname).replace(/\\/g,'/');
const git=(args,options={})=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...options});
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const summary=JSON.parse(read(report+'/validation-summary.json'));
assert.equal(summary.passed,89);assert.equal(summary.failed,0);assert.equal(summary.success,true);
for(const [file,expected] of Object.entries(summary.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected,'Validated file changed: '+file);
for(const file of ['picking-browser-results.json','regression/debris-browser-results.json','regression/browser-results.json'])assert.deepEqual(JSON.parse(read(report+'/'+file)).errors,[]);
const source=read('stem_lab/stem_tool_galaxy.js'),strings={};
for(const m of source.matchAll(/__alloT\('stem\.galaxy\.(bh_pick_[a-z_]+)','([^']*)'\)/g))strings[m[1]]=m[2];
assert.equal(Object.keys(strings).length,7);
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 const values=JSON.parse(read(file)).stem.galaxy;
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex'),summary.galaxyCatalogHash,'Validated Galaxy catalog changed');
 for(const [key,value] of Object.entries(strings))assert.equal(values[key],value);
}
function span(text){
 const needle='"galaxy": {',at=text.indexOf(needle);assert(at>=0&&text.indexOf(needle,at+1)<0);
 const start=at+needle.length-1;let depth=0,quoted=false,escaped=false;
 for(let i=start;i<text.length;i++){const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return [start,i];}
 throw Error('Unclosed Galaxy catalog');
}
function addStrings(base){
 const values=JSON.parse(base).stem.galaxy,missing=Object.keys(strings).filter(key=>!(key in values));
 for(const [key,value] of Object.entries(strings))if(key in values)assert.equal(values[key],value,'Existing inspector string differs');
 if(!missing.length)return base;
 const [,end]=span(base),lineStart=base.lastIndexOf('\n',end)+1,indent=base.slice(lineStart,end)+'  ',nl=base.includes('\r\n')?'\r\n':'\n';
 const updated=base.slice(0,lineStart).trimEnd()+','+nl+missing.map(key=>indent+JSON.stringify(key)+': '+JSON.stringify(strings[key])).join(','+nl)+nl+base.slice(lineStart);
 const before=JSON.parse(base),after=JSON.parse(updated);for(const key of missing)delete after.stem.galaxy[key];assert.deepEqual(after,before,'Only the seven new picking strings may change');return updated;
}
const files=[...Object.keys(summary.hashes),...['REVIEW.md','validation-summary.json','galaxy-tests.json','picking-browser-results.json','picked-fragment-1440.png','picked-fragment-320.png','local-metrics-1440.png','local-metrics-320.png','metrics-rtl-320.png','regression/debris-browser-results.json','regression/browser-results.json','regression/distance-results.json','regression/follow-results.json','regression/planning-results.json'].map(file=>report+'/'+file)];
const uiFiles=['ui_strings.js','desktop/web-app/public/ui_strings.js'],scope=[...files,...uiFiles];
const index=path.join(__dirname,'galaxy-commit.index'),env={...process.env,GIT_INDEX_FILE:index},stagedGit=args=>git(args,{env});
const base=git(['rev-parse','HEAD']).trim(),sharedBefore=new Map(scope.map(file=>[file,git(['ls-files','--stage','--',file])]));
if(fs.existsSync(index))fs.unlinkSync(index);
// Preserve cached stat data for unchanged files in this large checkout.
// A single-tree merge resets staged content to HEAD without touching files.
const sharedIndex=git(['rev-parse','--git-path','index']).trim();
fs.copyFileSync(path.resolve(root,sharedIndex),index);
stagedGit(['read-tree','-m',base]);stagedGit(['add','--',...files]);
for(const file of uiFiles){const content=addStrings(git(['show',base+':'+file])),blob=git(['hash-object','-w','--stdin'],{input:content}).trim();stagedGit(['update-index','--add','--cacheinfo','100644',blob,file]);}
stagedGit(['diff','--cached','--check']);
const names=stagedGit(['diff','--cached','--name-only']).trim().split('\n');assert(names.every(file=>scope.includes(file)));assert(names.includes('stem_lab/stem_tool_galaxy.js'));
console.log(stagedGit(['diff','--cached','--stat']));
if(!process.argv.includes('--commit')){console.log('Prepared a scoped Galaxy commit; the shared index is unchanged.');process.exit(0);}
assert.equal(git(['rev-parse','HEAD']).trim(),base,'HEAD changed; rerun preparation');
const output=stagedGit(['commit','-m','Add direct black hole fragment picking and local measurements','-m','Select visible debris by mouse, touch, or keyboard while preserving camera drags and launch gestures. Pause for inspection, show local radius and tidal/clock references, and jump to the selected parcel’s exact horizon crossing. Correct the selection ring texture color encoding.\n\nValidated with 89 Galaxy checks, WebGL picking and horizon occlusion, debris and launch/camera regressions, and phone/RTL layouts.']);console.log(output);
const match=output.match(/^\[[^\n]+ ([0-9a-f]{7,40})\]/m);assert(match,'Git did not return a commit identity');
const commit=git(['rev-parse',match[1]]).trim(),committed=git(['diff-tree','--no-commit-id','--name-only','-r',commit]).trim().split('\n');assert(committed.every(file=>scope.includes(file)));
const updates=[];
for(const file of files){assert.equal(git(['ls-files','--stage','--',file]),sharedBefore.get(file),'Shared staged path changed: '+file);updates.push('100644 '+git(['rev-parse',commit+':'+file]).trim()+'\t'+file);}
for(const file of uiFiles){const existing=git(['show',':'+file]),updated=addStrings(existing);if(updated!==existing)updates.push('100644 '+git(['hash-object','-w','--stdin'],{input:updated}).trim()+'\t'+file);}
git(['update-index','--index-info'],{input:updates.join('\n')+'\n'});
fs.writeFileSync(path.join(__dirname,'commit-receipt.json'),JSON.stringify({commit,parent:base,files:committed,otherStagedWorkPreserved:true},null,2)+'\n');fs.unlinkSync(index);
console.log(JSON.stringify({commit,files:committed.length,otherStagedWorkPreserved:true}));
