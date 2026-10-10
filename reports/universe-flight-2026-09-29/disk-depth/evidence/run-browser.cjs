const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const stage = __dirname;
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/browser');
fs.mkdirSync(report,{recursive:true});
if(fs.existsSync(path.join(report,'vista-browser-check.json'))){
 const previous=JSON.parse(fs.readFileSync(path.join(report,'vista-browser-check.json')));if(previous.completed)throw new Error('Browser check already passed.');
 const attempts=path.join(report,'attempts');fs.mkdirSync(attempts,{recursive:true});
 const id=String(fs.readdirSync(attempts).filter(x=>x.endsWith('.json')).length+1).padStart(2,'0');
 fs.copyFileSync(path.join(report,'vista-browser-check.json'),path.join(attempts,id+'-check.json'));
}
for (const [candidate, target] of [['candidate-renderer.js','universe_flight_scene.js'],['candidate-ui.js','stem_tool_universe.js']]) {
  const expected = sha(path.join(stage,candidate));
  for (const prefix of ['stem_lab','desktop/web-app/public/stem_lab']) {
    if (sha(path.join(repo,prefix,target)) !== expected) throw new Error('Installed candidate mismatch: '+prefix+'/'+target);
  }
}
const child = spawn(process.execPath,[path.join(stage,'browser-check.cjs')],{
  cwd:repo,windowsHide:true,stdio:'inherit',
  env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:'C:/Users/cabba/AppData/Local/ms-playwright',UNIVERSE_DISK_VISTA_REPORT:report},
});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
