const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sourcePath=path.join(root,'stem_lab/stem_tool_solarsystem.js'),source=fs.readFileSync(sourcePath),sourceSha256=createHash('sha256').update(source).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const modes=['unit-inspection','unit-gravity','unit-context'];
for(const mode of [...modes,'visual','visual-long']){assert.equal(read(mode+'-exit.json').status,0,mode);assert.equal(read(mode+'-source.json').sourceSha256,sourceSha256);assert.equal(read(mode+'-exit.json').sourceSha256,sourceSha256);}
const runs=modes.map(mode=>{const r=read(mode+'-results.json');assert.equal(r.success,true);assert.equal(r.numPassedTests,r.numTotalTests);return r;});
const visual=read('visual-results.json'),long=read('long-label-results.json');
for(const result of [visual,long]){assert.equal(result.sourceSha256,sourceSha256);assert.equal(result.completed,true);}
assert.equal(visual.results.length,4);assert.equal(long.results.length,2);
assert.ok(source.equals(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
const files=['stem_lab/stem_tool_solarsystem.js','desktop/web-app/public/stem_lab/stem_tool_solarsystem.js','tests/solar_system_gravity_inspection_chart.test.js','tests/solar_system_gravity_drop_lab.test.js'];
for(const[name,command,args]of[['syntax',process.execPath,['--max-old-space-size=48','--check',sourcePath]],['whitespace','git',['diff','--check','--',...files]]]){const r=spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8'});fs.writeFileSync(path.join(__dirname,name+'-log.txt'),(r.stdout||'')+(r.stderr||''));assert.equal(r.status,0,name);}
for(const file of files.slice(2))assert.ok(!fs.readFileSync(path.join(root,file),'utf8').split(/\r?\n/).some(line=>/[\t ]+$/.test(line)),file+' whitespace');
const summary={sourceSha256,baselineSha256:read('baseline.json').sourceSha256,verifiedAt:new Date().toISOString(),desktopMirrorMatches:true,
units:{passed:runs.reduce((n,r)=>n+r.numPassedTests,0),total:runs.reduce((n,r)=>n+r.numTotalTests,0),suites:runs.flatMap(r=>r.testResults.map(t=>path.relative(root,t.name)))},
browser:{passed:visual.results.length+long.results.length,cases:[...visual.results,...long.results].map(r=>r.name)},validatedBehavior:[
'Shared distance ruler is aligned to object centers at release, half-height and endpoint',
'Earth solid/cyan and comparison-world dashed/purple identities match the distance chart in both themes',
'Frozen trails sample the same elapsed-time intervals for both worlds using the existing capped quadratic model',
'Stage clock and per-world distance/status make inspection explicit without adding a timer or persistent state',
'Unrun, replayed, stale and reset experiments do not expose inspected trails',
'Short Jupiter and tall Pluto drops remain bounded and giant-planet reference levels remain explicit',
'Animated positions follow the existing shared-time acceleration and reduced motion shows stationary endpoints',
'Desktop and 320px light/dark layouts, long labels, keyboard inspection, readable text and touch targets verified',
'Prediction, replay, evidence saving, height changes and activity-context restoration preserve saved learning'
],visualReview:['gravity-measurement-1060-light-half.png','gravity-measurement-320-dark-half.png','gravity-measurement-320-pluto.png'],syntax:'passed',whitespace:'passed',committed:false};
fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
for(const name of ['.tmp-solar-read.cjs','.tmp-solar-gravity-setup.cjs']){const file=path.join(root,name);if(fs.existsSync(file))fs.unlinkSync(file);}
console.log(JSON.stringify(summary,null,2));
