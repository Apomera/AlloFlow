const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sourcePath=path.join(root,'stem_lab/stem_tool_solarsystem.js'),source=fs.readFileSync(sourcePath),sourceSha256=createHash('sha256').update(source).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const modes=['unit-rewards','unit-navigation','unit-board','unit-quiz'];
for(const mode of [...modes,'visual']){assert.equal(read(mode+'-exit.json').status,0,mode);assert.equal(read(mode+'-source.json').sourceSha256,sourceSha256,mode+' started on verified source');assert.equal(read(mode+'-exit.json').sourceSha256,sourceSha256);}
const runs=modes.map(mode=>{const result=read(mode+'-results.json');assert.equal(result.success,true);assert.ok(result.numTotalTests>0);assert.equal(result.numPassedTests,result.numTotalTests);return result;});
const units={success:true,numPassedTests:runs.reduce((n,r)=>n+r.numPassedTests,0),numTotalTests:runs.reduce((n,r)=>n+r.numTotalTests,0),testResults:runs.flatMap(r=>r.testResults)};
const visual=read('visual-results.json');assert.equal(visual.sourceSha256,sourceSha256);assert.equal(visual.completed,true);assert.equal(visual.results.length,4);
assert.ok(source.equals(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for(const[name,command,args]of[['syntax',process.execPath,['--max-old-space-size=64','--check',sourcePath]],['whitespace','git',['diff','--check','--','stem_lab/stem_tool_solarsystem.js','desktop/web-app/public/stem_lab/stem_tool_solarsystem.js','tests/solar_system_activity_navigation.test.js','tests/solar_system_challenge_rewards.test.js']]]){const result=spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8'});fs.writeFileSync(path.join(__dirname,name+'-log.txt'),(result.stdout||'')+(result.stderr||''));assert.equal(result.status,0,name);}
const summary={sourceSha256,baselineSha256:read('baseline.json').sourceSha256,verifiedAt:new Date().toISOString(),desktopMirrorMatches:true,
units:{passed:units.numPassedTests,total:units.numTotalTests,suites:units.testResults.map(r=>path.relative(root,r.name))},browser:{passed:visual.results.length,cases:visual.results.map(r=>r.name)},validatedBehavior:[
'Challenge rewards merge latest points, achievements, visits and engagement without overwriting concurrent work',
'Pure replayable reward updates with committed once-only feedback and bounded receipt bookkeeping',
'Timers start after commit, use the latest checker, and stop on unmount',
'Only unique recognized worlds count toward visit achievements; translated names and stable keys are supported',
'120 existing activities and references searchable across seven topics',
'All 104 indexed mini-tools have unique mounted destinations',
'All 18 challenge routes open supported activities, including from no selected world',
'Deployment navigation focuses the real Deploy control without deploying a vehicle',
'Round-trip keyboard focus preserves activity searches and challenge filters',
'Restored state stays quiet; stale and disconnected refs cannot consume active navigation',
'Quiz, journal, assignment, prediction and simulator settings preserved when opening activities',
'Malformed saved finder preferences recover without render-time state writes',
'Desktop and 320px layouts in both themes have no horizontal overflow or browser errors'
],visualReview:['activity-finder-1060-dark-browse.png','activity-finder-1060-dark-stars.png','activity-finder-320-light-stars.png'],syntax:'passed',whitespace:'passed',committed:false};
fs.writeFileSync(path.join(__dirname,'unit-results.json'),JSON.stringify(units,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
for(const name of ['.tmp-solar-read.cjs','.tmp-solar-catalog.cjs','.tmp-solar-catalog.json','.tmp-solar-finder-component.txt','.tmp-solar-finder-edit.cjs','.tmp-solar-finder-candidate.js','.tmp-solar-navigation-report.cjs','.tmp-solar-memory.ps1','.tmp-solar-rewards-edit.py']){const temporary=path.join(root,name);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify(summary,null,2));
