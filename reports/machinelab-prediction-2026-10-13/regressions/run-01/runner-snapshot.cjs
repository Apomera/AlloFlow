const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const frozen='066f5c3c30dcb04fdf120a3add27cdb9ba716cfbfc6f8ca7dfb296e0af132ed6';
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,helper='tests/helpers/stem_widgets_smoke_harness.js';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const prior='reports/machinelab-backcheck-2026-10-13',selected=['machinelab_i18n_hygiene','machinelab_grade_bands','machinelab_a11y','machinelab_power_lab','machinelab_practice_coverage'].map(n=>'tests/'+n+'.test.js');
const groups=read(prior+'/regressions/run-03/processes.json').runs.filter(r=>selected.includes(r.file)).concat(read(prior+'/new-tests/run-03/processes.json').runs).map(r=>({file:r.file,pattern:r.pattern,expected:r.passed,testSha256:hash(r.file)}));
assert.equal(groups.length,13);assert.equal(groups.reduce((n,r)=>n+r.expected,0),218);
for(const r of groups)assert.equal(crypto.createHash('sha256').update(cp.execFileSync('git',['show','634806ffa:'+r.file],{maxBuffer:4e6})).digest('hex'),r.testSha256);
const out=path.resolve(process.argv[2]||__dirname+'/regressions/run-01');assert(!fs.existsSync(out),'Use a fresh directory');fs.mkdirSync(out+'/test-temp',{recursive:true});
const write=(name,data)=>fs.writeFileSync(out+'/'+name,JSON.stringify(data,null,2)+'\n');
const manifest={sourceSha256:frozen,runnerSha256:hash(__filename),helper,helperSha256:hash(helper),runs:[]},inventory=new Map();
function verify(){assert.equal(hash(source),frozen);assert.equal(hash(mirror),frozen);assert.equal(hash(helper),manifest.helperSha256);for(const g of groups)assert.equal(hash(g.file),g.testSha256);}
verify();fs.copyFileSync(__filename,out+'/runner-snapshot.cjs');
for(const [i,g] of groups.entries()){
  verify();const stem='group-'+String(i+1).padStart(2,'0'),receipt=stem+'.json',log=stem+'.log';
  const args=['node_modules/vitest/vitest.mjs','run',g.file,'--maxWorkers=1','--pool=forks','--no-isolate','--testTimeout=30000','--reporter=default','--reporter=json','--outputFile',out+'/'+receipt];if(g.pattern)args.push('--testNamePattern',g.pattern);
  const result=cp.spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:16e6,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8',TEMP:out+'/test-temp',TMP:out+'/test-temp'}});
  fs.writeFileSync(out+'/'+log,((result.stdout||'')+'\n'+(result.stderr||'')).replace(/\r\n/g,'\n').split('\n').map(s=>s.trimEnd()).join('\n').trimEnd()+'\n');
  const row={...g,receipt,log,exitCode:result.status,signal:result.signal,error:result.error?String(result.error):null,sourceSha256:hash(source),mirrorSha256:hash(mirror),logSha256:hash(out+'/'+log)};
  if(fs.existsSync(out+'/'+receipt))row.receiptSha256=hash(out+'/'+receipt);manifest.runs.push(row);write('processes.json',manifest);
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);verify();
  const report=read(out+'/'+receipt);assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPassedTests,g.expected);assert.equal(report.testResults.length,1);
  const cases=report.testResults[0].assertionResults;assert.equal(cases.filter(c=>c.status==='passed').length,g.expected);
  if(!inventory.has(g.file))inventory.set(g.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
  const inv=inventory.get(g.file);assert.deepEqual(cases.map(c=>c.fullName),inv.names);cases.forEach((c,j)=>{if(c.status==='passed')inv.counts[j]++;else assert(['pending','skipped'].includes(c.status));});
  row.passed=g.expected;write('processes.json',manifest);console.log(stem+': '+g.expected+' passed; native exit0');
}
for(const inv of inventory.values())assert(inv.counts.every(n=>n<=1));verify();
write('inventory.json',{files:[...inventory].map(([file,inv])=>({file,...inv}))});
write('final.json',{sourceSha256:frozen,passed:218,failed:0,files:inventory.size,processes:groups.length,processManifestSha256:hash(out+'/processes.json'),inventorySha256:hash(out+'/inventory.json')});console.log('All 218 selected regression cases passed.');
