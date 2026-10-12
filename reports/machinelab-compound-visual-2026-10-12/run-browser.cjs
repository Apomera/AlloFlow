const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'browser');process.chdir(root);fs.mkdirSync(out,{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const item=p=>({path:path.relative(root,p).replaceAll('\\','/'),sha256:sha(p),bytes:fs.statSync(p).size});
if(fs.existsSync(path.join(out,'process.json'))||fs.existsSync(path.join(out,'results.json'))){
  let n=1;while(fs.existsSync(path.join(out,'attempt-'+n)))n++;
  const previous=path.join(out,'attempt-'+n);fs.mkdirSync(previous);
  for(const name of fs.readdirSync(out))if(fs.statSync(path.join(out,name)).isFile()&&name!=='ml-shots.html')fs.copyFileSync(path.join(out,name),path.join(previous,name));
}
const canonical='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/stem_lab/stem_tool_machinelab.js';
const sourceSha256=sha(canonical),publicMirrorSha256=sha(mirror),startedAt=new Date().toISOString();
if(sourceSha256!==publicMirrorSha256)throw Error('Canonical and public sources differ before browser run');
fs.copyFileSync('dev-tools/ml_compound_visual_qa.cjs',path.join(out,'harness-snapshot.cjs'));
const logPath=path.join(out,'console.log'),fd=fs.openSync(logPath,'w');
const result=cp.spawnSync(process.execPath,['dev-tools/ml_compound_visual_qa.cjs',out],{cwd:root,stdio:['ignore',fd,fd],env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8'},windowsHide:true});fs.closeSync(fd);
const log=fs.readFileSync(logPath,'utf8').replace(/\r\n/g,'\n').split('\n').map(line=>line.replace(/[ \t]+$/,'')).join('\n').replace(/\n*$/,'\n');fs.writeFileSync(logPath,log);
const resultsPath=path.join(out,'results.json'),results=fs.existsSync(resultsPath)?JSON.parse(fs.readFileSync(resultsPath,'utf8')):null;
const nativePage=path.join(out,'ml-shots.html'),tool=fs.readFileSync(canonical,'utf8');
const manifest={command:'node dev-tools/ml_compound_visual_qa.cjs '+path.relative(root,out).replaceAll('\\','/'),startedAt,finishedAt:new Date().toISOString(),observedExitCode:result.status,signal:result.signal,error:result.error?String(result.error):null,
  sourceSha256,sourceSha256After:sha(canonical),publicMirrorSha256,publicMirrorSha256After:sha(mirror),
  sourceExactInNativePage:fs.existsSync(nativePage)&&fs.readFileSync(nativePage,'utf8').includes('<script>'+tool+'<\/script>'),
  scenarios:results?.scenarios||0,checks:results?.checks?.length||0,errors:results?.errors||['No native browser results'],
  screenshots:(results?.shots||[]).map(name=>{const p=path.join(out,name+'.png'),data=fs.readFileSync(p);return {...item(p),width:data.readUInt32BE(16),height:data.readUInt32BE(20),visuallyInspected:false};}),
  harness:item(path.join(root,'dev-tools/ml_compound_visual_qa.cjs')),harnessSnapshot:item(path.join(out,'harness-snapshot.cjs')),helperPreamble:item(path.join(root,'dev-tools/ml_compound_lab_qa.cjs')),baseHarness:item(path.join(root,'dev-tools/ml_scene_shots.cjs')),
  results:fs.existsSync(resultsPath)?item(resultsPath):null,nativePage:fs.existsSync(nativePage)?item(nativePage):null,console:item(logPath),
  priorAttempts:fs.readdirSync(out).filter(name=>/^attempt-\d+$/.test(name)).map(name=>path.join(out,name,'process.json')).filter(p=>fs.existsSync(p)).map(item),
  limitations:['Real React/THREE with local Chromium software WebGL; no deployed host build exercised.','No physical assistive-device or screen-reader session performed.']};
fs.writeFileSync(path.join(out,'process.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({exit:manifest.observedExitCode,checks:manifest.checks,scenarios:manifest.scenarios,screenshots:manifest.screenshots.length,errors:manifest.errors,sourceUnchanged:manifest.sourceSha256===manifest.sourceSha256After,sourceExactInNativePage:manifest.sourceExactInNativePage},null,2));
process.exitCode=result.status===0&&manifest.errors.length===0&&manifest.sourceSha256===manifest.sourceSha256After&&manifest.publicMirrorSha256===manifest.publicMirrorSha256After&&manifest.sourceExactInNativePage?0:1;
