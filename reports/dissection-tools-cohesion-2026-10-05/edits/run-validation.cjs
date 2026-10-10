const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib'), {spawn} = require('child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-tools-cohesion-2026-10-05');
const modes = process.argv[2]?.split(',') || ['baseline','unit-main','unit-axe','tools','capture','gallery'];
const suffix = process.argv[3] || '1';
if (!/^\d+$/.test(suffix) || modes.some(x=>!['baseline','unit-main','unit-axe','tools','capture','gallery'].includes(x))) throw new Error('Invalid job');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const tracked = ['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js','tests/dissection_lab_improvements.test.js','tests/dissection_workspace_bands.test.js','tests/dissection_canvas_loop.test.js','tests/e2e/dissection-tools-cohesion.spec.ts','tests/e2e/dissection-capture-clarity.spec.ts','tests/e2e/dissection-evidence-gallery.spec.ts'];
const hashes = () => Object.fromEntries(tracked.map(f=>[f,hash(fs.readFileSync(path.join(repo,f)))]));
const sequenceFile = path.join(report, 'sequence-'+suffix+'.json');
if (fs.existsSync(sequenceFile)) throw new Error('Sequence exists');
const sequence = {start:new Date().toISOString(),runnerPid:process.pid,jobs:[],running:null};
const save = () => fs.writeFileSync(sequenceFile,JSON.stringify(sequence,null,2));
save();
async function run(mode) {
  const label = mode+'-'+suffix, out=path.join(report,label);
  if (fs.existsSync(out)) throw new Error('Job output exists');
  fs.mkdirSync(out);
  const temp = path.join('C:/Users/cabba/Documents/Codex/.diss-tools-20261005',label);
  if (fs.existsSync(temp)) throw new Error('Temp already exists');
  fs.mkdirSync(temp,{recursive:true});
  const unit=mode.startsWith('unit');
  let baselineModule=path.join(__dirname,'renderer-baseline.js');
  if(mode==='baseline'&&!fs.existsSync(baselineModule)){
    baselineModule=path.join(temp,'renderer-baseline.js');
    fs.writeFileSync(baselineModule,zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'renderer-baseline.js.gz'))));
  }
  const args=unit?['node_modules/vitest/vitest.mjs','run','tests/dissection_lab_improvements.test.js',...(mode==='unit-main'?['tests/dissection_workspace_bands.test.js','tests/dissection_canvas_loop.test.js']:[]),'--pool=forks','--maxWorkers=1','--no-file-parallelism','--reporter=verbose','--reporter=json','--outputFile='+path.join(out,'results.json'),'--testNamePattern='+(mode==='unit-axe'?'has no axe-detectable WCAG A or AA violations':'^(?!.*has no axe-detectable WCAG A or AA violations).*')]:['node_modules/@playwright/test/cli.js','test',mode==='capture'?'tests/e2e/dissection-capture-clarity.spec.ts':mode==='gallery'?'tests/e2e/dissection-evidence-gallery.spec.ts':'tests/e2e/dissection-tools-cohesion.spec.ts','--workers=1','--retries=0','--project=chromium','--reporter=list,json','--output='+path.join(out,'test-results'),...(mode==='baseline'?['--grep','lab tool groups layout']:[])];
  const env={...process.env,NODE_OPTIONS:'--max-old-space-size=1024',PLAYWRIGHT_BROWSERS_PATH:'C:/Users/cabba/AppData/Local/ms-playwright',PLAYWRIGHT_JSON_OUTPUT_FILE:path.join(out,'results.json'),DISSECTION_TOOLS_OUTPUT:path.join(out,'captures'),DISSECTION_TOOLS_BASELINE:mode==='baseline'?'1':'0',DISSECTION_CAPTURE_OUTPUT:path.join(out,'captures'),DISSECTION_CAPTURE_BASELINE:'0',DISSECTION_BASELINE:'0',EVIDENCE_GALLERY_OUTPUT:path.join(out,'captures'),TEMP:temp,TMP:temp,STEM_GL_SUBSTITUTE:mode==='baseline'?'stem_lab/stem_tool_dissection.js='+baselineModule:''};
  const run={mode,label,start:new Date().toISOString(),startHashes:hashes(),args,ownedTemporaryDirectory:temp,servedRenderer:{sha256:hash(fs.readFileSync(mode==='baseline'?baselineModule:path.join(repo,tracked[0]))),substituted:mode==='baseline'}};
  const stdout=fs.openSync(path.join(out,'stdout.log'),'w'),stderr=fs.openSync(path.join(out,'stderr.log'),'w');
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd:repo,env,stdio:['ignore',stdout,stderr],windowsHide:true});
    run.pid=child.pid;sequence.running={mode,label,pid:child.pid};save();fs.writeFileSync(path.join(out,'run.json'),JSON.stringify(run,null,2));
    const timer=setTimeout(()=>{run.timedOut=true;child.kill('SIGTERM');},600000);
    child.on('error',reject);child.on('exit',(exitCode,signal)=>{clearTimeout(timer);run.exitCode=exitCode;run.signal=signal;resolve(exitCode);});
  });
  run.end=new Date().toISOString();run.endHashes=hashes();fs.writeFileSync(path.join(out,'run.json'),JSON.stringify(run,null,2));fs.closeSync(stdout);fs.closeSync(stderr);
  sequence.jobs.push({mode,label,code,start:run.start,end:run.end});sequence.running=null;save();
  if(code!==0)throw new Error(label+' failed');
}
(async()=>{try{for(const mode of modes)await run(mode);sequence.success=true;}catch(error){sequence.success=false;sequence.error=error.message;process.exitCode=1;}finally{sequence.end=new Date().toISOString();sequence.running=null;save();}})();
