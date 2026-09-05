'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),{spawn}=require('child_process');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const fileDigest=p=>new Promise((resolve,reject)=>{const hash=crypto.createHash('sha256'),stream=fs.createReadStream(p);stream.on('data',b=>hash.update(b));stream.on('error',reject);stream.on('end',()=>resolve(hash.digest('hex')));});
function runtime() {
  const jar=process.env.ALLOFLOW_MCP_EPUBCHECK_JAR||path.join(__dirname,'vendor','epubcheck','epubcheck.jar');
  let ace=null;try{ace=require.resolve('@daisy/ace-cli/bin/ace.js',{paths:[__dirname,path.join(__dirname,'runtime')]});}catch(_){}
  const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'java.exe':'java'):'java';
  const javaPresent=path.isAbsolute(java)?fs.existsSync(java):(process.env.PATH||'').split(path.delimiter).some(p=>fs.existsSync(path.join(p,process.platform==='win32'?'java.exe':'java')));
  return {jar,ace,java,javaPresent,nodeSupported:Number(process.versions.node.split('.')[0])>=20};
}
function capabilities() {
  const r=runtime();return {epubcheck:{installed:fs.existsSync(r.jar),version:'5.3.0',javaAvailable:r.javaPresent},ace:{installed:!!r.ace,version:'1.4.6',nodeSupported:r.nodeSupported},scope:'Automated EPUB format and accessibility checks; human review remains necessary.'};
}
function fingerprint() {
  const r=runtime(),parts=[__filename,path.join(__dirname,'remediation_ace_worker.cjs'),path.join(__dirname,'vendor','manifest.json')];
  const lock=[path.join(__dirname,'runtime','package-lock.json'),path.join(__dirname,'..','package-lock.json')].find(p=>fs.existsSync(p));if(lock)parts.push(lock);
  return digest(JSON.stringify({node:process.versions.node,files:parts.map(p=>fs.existsSync(p)?digest(fs.readFileSync(p)):null),jar:fs.existsSync(r.jar)?digest(fs.readFileSync(r.jar)):null,ace:r.ace?digest(fs.readFileSync(r.ace)):null}));
}
function parseEpubcheck(report) {
  const count=x=>Number.isSafeInteger(x)&&x>=0?x:null;
  const c=report?.checker;if(!c||!Array.isArray(report.messages))throw Error('EPUBCheck returned an incomplete report.');
  const errors=count(c.nError),fatals=count(c.nFatal),warnings=count(c.nWarning);
  if([errors,fatals,warnings].some(x=>x===null))throw Error('EPUBCheck did not report complete severity counts.');
  return {status:errors+fatals>0?'failed':warnings>0?'review-required':'passed',errors,fatals,warnings,version:c.checkerVersion||'5.3.0'};
}
function parseAce(report) {
  if(report?.['@type']!=='earl:report'||!Array.isArray(report.assertions)||report.assertions.length===0)throw Error('Ace returned an invalid report.');
  const normalize=value=>({'earl:passed':'pass','earl:failed':'fail','earl:cantTell':'cantTell','earl:inapplicable':'inapplicable'})[value]||value;
  let failures=0,reviewFindings=0,assertions=0;
  const walk=v=>{if(!v||typeof v!=='object')return;
    const children=v.assertions||v['earl:assertions'];
    if(v['@type']==='earl:assertion'&&(!Array.isArray(children)||children.length===0)){
      const outcome=normalize(v['earl:result']?.['earl:outcome']);assertions++;
      if(outcome==='fail')failures++;else if(!['pass','inapplicable'].includes(outcome))reviewFindings++;
    }
    if(Array.isArray(children))children.forEach(walk);
  };walk(report);
  const outcome=normalize(report['earl:result']?.['earl:outcome']);
  if(!['pass','fail','cantTell'].includes(outcome))throw Error('Ace did not report a recognized overall outcome.');
  return {status:outcome==='fail'||failures>0?'failed':outcome==='cantTell'||reviewFindings>0?'review-required':'passed',failures,reviewFindings,assertions,version:'1.4.6'};
}
function run(command,args,{signal,timeoutMs=180000,env,cwd,ipc=false}={}) {
  return new Promise((resolve,reject)=>{
    let child,output='',timer,killTimer,stopped=null,done=false;
    const finish=(err,result)=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(killTimer);signal?.removeEventListener('abort',abort);err?reject(err):resolve(result);};
    const stop=err=>{if(done||stopped)return;stopped=err;if(ipc&&child?.connected){try{child.send({type:'cancel'});}catch(_){child.kill();}}else child?.kill();killTimer=setTimeout(()=>{child?.kill();finish(err);},5000);};
    const abort=()=>{const e=Error('EPUB validation cancelled');e.code='ALLOFLOW_VALIDATION_CANCELLED';stop(e);};
    if(signal?.aborted)return reject(Object.assign(Error('EPUB validation cancelled'),{code:'ALLOFLOW_VALIDATION_CANCELLED'}));
    try{child=spawn(command,args,{cwd,env,windowsHide:true,stdio:ipc?['ignore','pipe','pipe','ipc']:['ignore','pipe','pipe']});}catch(e){return finish(e);}
    const collect=d=>{output+=String(d);if(output.length>2*1024*1024)stop(Error('Validator output exceeded the limit.'));};
    child.stdout.on('data',collect);child.stderr.on('data',collect);
    child.on('error',e=>finish(e));child.on('close',code=>finish(stopped,{code,output}));
    signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>stop(Error('EPUB validation timed out.')),timeoutMs);
  });
}
async function validate(filePath,options={}) {
  const o=options,r=runtime(),scratch=fs.mkdtempSync(path.join(o.stateDir||os.tmpdir(),'epub-verify-'));
  // Each validator gets its own budget. The JVM and Ace's Chromium are slow on emulated or memory-starved hosts;
  // an exceeded budget is reported as `unavailable`, never as a pass.
  const envTimeout=Number(process.env.ALLOFLOW_MCP_EPUB_VALIDATION_TIMEOUT_MS);
  const timeoutMs=Number.isSafeInteger(o.timeoutMs)&&o.timeoutMs>0?o.timeoutMs:Number.isSafeInteger(envTimeout)&&envTimeout>0?envTimeout:600000;
  const snapshot=path.join(scratch,'document.epub'),checks={},files={};
  const env={...process.env};for(const key of ['GEMINI_API_KEY','GOOGLE_API_KEY','OPENAI_API_KEY'])delete env[key];
  const signal=o.signal,log=o.onLog||(()=>{});
  const readJson=p=>{if(fs.statSync(p).size>64*1024*1024)throw Error('Validator report exceeded 64 MB.');return JSON.parse(fs.readFileSync(p,'utf8'));};
  const save=(role,name,source)=>{if(o.claimPath&&fs.existsSync(source)){const dest=o.claimPath(name);fs.copyFileSync(source,dest);files[role]=dest;}};
  const stage=async(name,fn)=>{try{checks[name]=await fn();}catch(e){if(signal?.aborted||e.code==='ALLOFLOW_VALIDATION_CANCELLED')throw e;checks[name]={status:'unavailable',error:String(e.message||e).slice(0,1000)+(/timed out/.test(String(e.message))?' (budget '+timeoutMs+' ms; raise ALLOFLOW_MCP_EPUB_VALIDATION_TIMEOUT_MS on a slow host)':'')};}log(name+': '+checks[name].status);};
  try{
    const before=fs.statSync(filePath);fs.copyFileSync(filePath,snapshot);const after=fs.statSync(filePath);
    if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('EPUB changed during validation snapshot.');
    const inputSha256=await fileDigest(snapshot),inputBytes=fs.statSync(snapshot).size;
    const stem=path.basename(filePath,'.epub');
    await stage('epubcheck',async()=>{
      if(!fs.existsSync(r.jar)||!r.javaPresent)throw Error('EPUBCheck or Java is unavailable. Install Java and rerun verification.');
      const reportPath=path.join(scratch,'epubcheck.json');log('Checking EPUB format with EPUBCheck…');
      const result=await run(r.java,['-jar',r.jar,'--json',reportPath,snapshot],{signal,env,cwd:scratch,timeoutMs});
      const report=readJson(reportPath);save('epubcheckReport',stem+'-epubcheck.json',reportPath);const parsed=parseEpubcheck(report);
      if(result.code!==0&&parsed.status==='passed')throw Error('EPUBCheck exited unsuccessfully despite a passing report.');return parsed;
    });
    await stage('ace',async()=>{
      if(checks.epubcheck.status==='failed')return {status:'not-run',reason:'Resolve EPUB format errors before accessibility checking.'};
      if(!r.ace||!r.nodeSupported)throw Error('Ace is unavailable. Reinstall the full connector with Node.js 20 or newer.');
      const chrome=o.resolveChromium?.();if(!chrome?.installed)throw Error('Chromium is unavailable. Run remediation_setup.');
      const executable=chrome.chromium.executablePath();
      const out=path.join(scratch,'ace-report');log('Checking EPUB accessibility with Ace by DAISY…');
      const result=await run(process.execPath,[path.join(__dirname,'remediation_ace_worker.cjs'),r.ace,'--silent','--doNotReportMedia','--exiterror2','--outdir',out,'--tempdir',path.join(scratch,'ace-work'),snapshot],
        {signal,env:{...env,PUPPETEER_EXECUTABLE_PATH:executable,PUPPETEER_SKIP_DOWNLOAD:'true',ACE_TIMEOUT_INITIAL:'30000'},cwd:scratch,ipc:true,timeoutMs});
      const reportPath=path.join(out,'report.json');
      if(!fs.existsSync(reportPath))throw Error('Ace produced no report (exit '+result.code+'): '+String(result.output||'').trim().slice(-600));
      const report=readJson(reportPath);save('epubAccessibilityReport',stem+'-ace.json',reportPath);const parsed=parseAce(report);
      if((result.code!==0&&result.code!==2)||(result.code===2&&parsed.status==='passed'))throw Error('Ace exited unsuccessfully or contradicted its report.');return parsed;
    });
    if(await fileDigest(filePath)!==inputSha256)throw Error('EPUB changed after its validation snapshot.');
    const reviewRequired=Object.values(checks).some(c=>c.status!=='passed');
    return {status:reviewRequired?'review-required':'complete-for-tested-scope',reviewRequired,humanReviewRequired:true,inputSha256,inputBytes,validatedAt:new Date().toISOString(),checks,files,
      note:'Automated EPUB format and accessibility results are bound to these bytes. Review reading order, descriptions, navigation and read-along behavior with assistive technology.'};
  }finally{
    // This directory is created by this call and contains only its private snapshots/reports.
    const parent=path.resolve(o.stateDir||os.tmpdir()),resolved=path.resolve(scratch);
    if(path.dirname(resolved)===parent&&path.basename(resolved).startsWith('epub-verify-')){
      try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:250});}
      catch(e){log('Could not remove private validation scratch '+resolved+': '+String(e.message||e).slice(0,200));}
    }
  }
}
module.exports={validate,capabilities,fingerprint,parseEpubcheck,parseAce,run};
