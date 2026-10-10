const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const stage = __dirname;
const report = path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/unit');
const temp = path.join(stage,'unit-temp');
fs.mkdirSync(report,{recursive:true});fs.mkdirSync(temp,{recursive:true});
if(fs.existsSync(path.join(report,'execution.json'))){
 const attempts=path.join(report,'attempts');fs.mkdirSync(attempts,{recursive:true});
 const prior=JSON.parse(fs.readFileSync(path.join(report,'execution.json')));if(prior.exitCode===0)throw new Error('Focused run already passed.');
 const id=String(fs.readdirSync(attempts).filter(x=>x.endsWith('-execution.json')).length+1).padStart(2,'0');
 for(const name of ['execution.json','stdout.txt','results.json'])if(fs.existsSync(path.join(report,name)))fs.copyFileSync(path.join(report,name),path.join(attempts,id+'-'+name));
}
// Keep Vite's bundled-config temporary output inside the writable repository.
const config=path.join(report,'node-renderer.config.mjs');
fs.copyFileSync(path.join(stage,'node-renderer.config.mjs'),config);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(sha(path.join(repo,'stem_lab/universe_flight_scene.js'))!==sha(path.join(stage,'candidate-renderer.js')))throw new Error('Candidate is not installed.');
const inputs = ['stem_lab/universe_flight_scene.js','tests/universe_flight_physics.test.js','tests/universe_flight_bulges.test.js','tests/universe_flight_barred_detail.test.js','tests/universe_flight_cloud_surfaces.test.js','tests/universe_flight_spiral_detail.test.js','tests/universe_flight_stellar_surfaces.test.js','tests/universe_flight_two_arm_detail.test.js','tests/helpers/universe_galaxy_surfaces.js','tests/fixtures/universe_flight_bulge_baseline.json'].map(p=>({path:p,sha256:sha(path.join(repo,p))}));
const diagnostics = ['node-renderer.config.mjs','node-renderer-setup.js','run-unit.cjs'].map(p=>({path:p,sha256:sha(path.join(stage,p))}));
const args = [path.join(repo,'node_modules/vitest/vitest.mjs'),'run','--config',config,'--pool=threads','--maxWorkers=1','--no-file-parallelism','--no-isolate','--testTimeout=60000','--hookTimeout=60000','--reporter=default','--reporter=json','--outputFile='+path.join(report,'results.json')];
const execution = {startedAt:new Date().toISOString(),completed:false,scope:'Original focused Vitest assertions in diagnostic Node environment with canvas/event shim; native WebGL and real DOM covered separately.',inputs,diagnostics,args};
fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');
const log = fs.createWriteStream(path.join(report,'stdout.txt'));
const child = spawn(process.execPath,args,{cwd:repo,windowsHide:true,env:{...process.env,TEMP:temp,TMP:temp},stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{process.stdout.write(data);log.write(data);});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{
  execution.completed=true;execution.exitCode=code;execution.finishedAt=new Date().toISOString();
  execution.inputsUnchanged=inputs.every(x=>sha(path.join(repo,x.path))===x.sha256);
  execution.diagnosticsUnchanged=diagnostics.every(x=>sha(path.join(stage,x.path))===x.sha256);
  fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');log.end();process.exitCode=code??1;
});
