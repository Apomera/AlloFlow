const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
for(const name of ['run-arm-browser.cjs','playwright-arm.config.cjs','arm-capture-png.cjs','arm-mount-window.cjs','arm-render-submissions.cjs']){const r=spawnSync(process.execPath,['--check',path.join(work,name)],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(name+' '+r.stdout+r.stderr);}
const text=fs.readFileSync(path.join(work,'firstresponse-arm-preview.spec.ts'),'utf8');
if(text.includes('projection:projection([bounds])'))throw Error('Hidden contact projection still present');
const result=spawnSync(process.execPath,[path.join(root,'node_modules/@playwright/test/cli.js'),'test','firstresponse-arm-preview.spec.ts','--list','--config='+path.join(work,'playwright-arm.config.cjs')],{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,FIRST_RESPONSE_ARMS_WORK:work,FIRST_RESPONSE_ARMS_REPORT:path.join(work,'list-only'),FIRST_RESPONSE_ARMS_BASELINE_ONLY:'1',FIRST_RESPONSE_ARMS_SOURCE_SHA:'179ddeefd0c930ca4a084d98fc683c321fb4f36f720e62cddf8b30d56b576466',FIRST_RESPONSE_ARMS_CANDIDATE:path.join(work,'before.js')}});
console.log(result.stdout);if(result.status!==0)throw Error(result.stderr);if(!/Total: 2 tests/.test(result.stdout))throw Error('Expected 2 workflows');
fs.writeFileSync(path.join(work,'fixture-list-check.json'),JSON.stringify({exitCode:result.status,stdout:result.stdout,stderr:result.stderr,browserLaunched:false},null,2));
