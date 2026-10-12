// Each run gets a fresh directory and an observed native child exit receipt.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'../../..');process.chdir(root);
const out=path.resolve(process.argv[2]||path.join(__dirname,'run-01'));
if(fs.existsSync(out))throw Error('Use a fresh output directory; existing evidence will not be overwritten: '+out);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const item=p=>({path:path.relative(root,p).replaceAll('\\','/'),sha256:sha(p),bytes:fs.statSync(p).size});
const canonical='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/stem_lab/stem_tool_machinelab.js',harness='dev-tools/ml_efficiency_envelope_qa.cjs';
const frozen='e10d476980428471e6ddd5d31f193da4d071f259d10cca7a275f8e34ae126b0c';
const sourceSha256=sha(canonical),publicMirrorSha256=sha(mirror),startedAt=new Date().toISOString();
if(sourceSha256!==frozen||publicMirrorSha256!==frozen)throw Error('Canonical and public source must match the reviewed frozen SHA');
fs.mkdirSync(out,{recursive:true});fs.copyFileSync(harness,path.join(out,'harness-snapshot.cjs'));
const logPath=path.join(out,'console.log'),fd=fs.openSync(logPath,'w');
const native=cp.spawnSync(process.execPath,[harness,out],{cwd:root,stdio:['ignore',fd,fd],env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8'},windowsHide:true});fs.closeSync(fd);
fs.writeFileSync(logPath,fs.readFileSync(logPath,'utf8').replace(/\r\n/g,'\n').split('\n').map(line=>line.replace(/[ \t]+$/,'')).join('\n').replace(/\n*$/,'\n'));
const resultsPath=path.join(out,'results.json'),results=fs.existsSync(resultsPath)?JSON.parse(fs.readFileSync(resultsPath,'utf8')):null;
const page=path.join(out,'ml-shots.html'),tool=fs.readFileSync(canonical,'utf8');
const manifest={command:'node '+harness+' '+path.relative(root,out).replaceAll('\\','/'),startedAt,finishedAt:new Date().toISOString(),observedExitCode:native.status,signal:native.signal,error:native.error?String(native.error):null,
  sourceSha256,sourceSha256After:sha(canonical),publicMirrorSha256,publicMirrorSha256After:sha(mirror),sourceExactInNativePage:fs.existsSync(page)&&fs.readFileSync(page,'utf8').includes('<script>'+tool+'<\/script>'),
  scenarios:results?.scenarios||0,checks:results?.checks?.length||0,errors:results?.errors||['Missing native browser results'],
  screenshots:(results?.shots||[]).map(name=>{const p=path.join(out,name+'.png'),data=fs.readFileSync(p);return{...item(p),width:data.readUInt32BE(16),height:data.readUInt32BE(20),visuallyInspected:false};}),
  harness:item(harness),harnessSnapshot:item(path.join(out,'harness-snapshot.cjs')),helperPreamble:item('dev-tools/ml_efficiency_lab_qa.cjs'),baseHarness:item('dev-tools/ml_scene_shots.cjs'),
  results:results?item(resultsPath):null,nativePage:fs.existsSync(page)?item(page):null,console:item(logPath),
  downloadedRecord:fs.existsSync(path.join(out,'downloaded-record.txt'))?item(path.join(out,'downloaded-record.txt')):null,
  limitations:['Native React/THREE with local Chromium software WebGL; no deployed host build exercised.','Forced colors is browser emulation; no physical assistive technology session.']};
fs.writeFileSync(path.join(out,'process.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({exit:manifest.observedExitCode,checks:manifest.checks,scenarios:manifest.scenarios,screenshots:manifest.screenshots.length,errors:manifest.errors,sourceUnchanged:manifest.sourceSha256===manifest.sourceSha256After,sourceExactInNativePage:manifest.sourceExactInNativePage},null,2));
process.exitCode=native.status===0&&manifest.errors.length===0&&manifest.sourceSha256===manifest.sourceSha256After&&manifest.publicMirrorSha256===manifest.publicMirrorSha256After&&manifest.sourceExactInNativePage?0:1;
