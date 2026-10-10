const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sourcePath=path.join(root,'stem_lab/stem_tool_solarsystem.js'),source=fs.readFileSync(sourcePath),sourceSha256=createHash('sha256').update(source).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const modes=['unit-shortcuts','unit-navigation','unit-rewards','unit-quiz'];
for(const mode of [...modes,'visual']){assert.equal(read(mode+'-exit.json').status,0,mode);assert.equal(read(mode+'-source.json').sourceSha256,sourceSha256,mode+' started on verified source');assert.equal(read(mode+'-exit.json').sourceSha256,sourceSha256);}
const runs=modes.map(mode=>{const result=read(mode+'-results.json');assert.equal(result.success,true);assert.ok(result.numTotalTests>0);assert.equal(result.numPassedTests,result.numTotalTests);return result;});
const units={success:true,numPassedTests:runs.reduce((n,r)=>n+r.numPassedTests,0),numTotalTests:runs.reduce((n,r)=>n+r.numTotalTests,0),testResults:runs.flatMap(r=>r.testResults)};assert.equal(units.numTotalTests,72);
const visual=read('visual-results.json');assert.equal(visual.sourceSha256,sourceSha256);assert.equal(visual.completed,true);assert.equal(visual.results.length,4);
assert.ok(source.equals(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for(const[name,command,args]of[['syntax',process.execPath,['--max-old-space-size=64','--check',sourcePath]],['whitespace','git',['diff','--check','--','stem_lab/stem_tool_solarsystem.js','desktop/web-app/public/stem_lab/stem_tool_solarsystem.js','tests/solar_system_activity_shortcuts.test.js']]]){const result=spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8'});fs.writeFileSync(path.join(__dirname,name+'-log.txt'),(result.stdout||'')+(result.stderr||''));assert.equal(result.status,0,name);}
const summary={sourceSha256,baselineSha256:read('baseline.json').sourceSha256,verifiedAt:new Date().toISOString(),desktopMirrorMatches:true,
units:{passed:units.numPassedTests,total:units.numTotalTests,suites:units.testResults.map(r=>path.relative(root,r.name))},browser:{passed:visual.results.length,cases:visual.results.map(r=>r.name)},validatedBehavior:[
'Independent accessible Save for later buttons across the 120-activity catalog',
'Saved collection intersects topic and normalized text search with clear empty-state recovery',
'Bookmark updates merge latest state and preserve unrecognized older saved records',
'Six recent activity/world pairs recorded atomically on explicit navigation only',
'Continue and recent shortcuts restore the recorded compatible world while preserving current settings',
'Stable world keys support translated names and malformed history stays quiet on restore',
'Latest selection and descent settings are respected by older card callbacks',
'Removing a saved-only card or clearing recents restores results focus after commit',
'Round-trip keyboard focus handles reordered recents and hidden or removed origins',
'Clear recent activities preserves bookmarks, filters, notes, quiz and progress',
'Existing challenge rewards, activity navigation and quiz checks pass',
'Desktop and 320px layouts in both themes have no horizontal overflow or browser errors'
],visualReview:['activity-shortcuts-1060-light-saved.png','activity-shortcuts-320-dark-recent.png','activity-shortcuts-320-light-empty.png'],syntax:'passed',whitespace:'passed',committed:false};
fs.writeFileSync(path.join(__dirname,'unit-results.json'),JSON.stringify(units,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
for(const name of ['.tmp-solar-read.cjs','.tmp-solar-shortcuts-report.cjs']){const temporary=path.join(root,name);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify(summary,null,2));
