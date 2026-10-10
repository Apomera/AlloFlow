const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sourcePath=path.join(root,'stem_lab/stem_tool_solarsystem.js'),source=fs.readFileSync(sourcePath),sourceSha256=createHash('sha256').update(source).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const modes=['unit-context','unit-shortcuts','unit-navigation','unit-discovery','unit-signal','unit-inspection','unit-gravity'];
for(const mode of [...modes,'visual']){assert.equal(read(mode+'-exit.json').status,0,mode);assert.equal(read(mode+'-source.json').sourceSha256,sourceSha256,mode+' started on verified source');assert.equal(read(mode+'-exit.json').sourceSha256,sourceSha256);}
const runs=modes.map(mode=>{const result=read(mode+'-results.json');assert.equal(result.success,true);assert.ok(result.numTotalTests>0);assert.equal(result.numPassedTests,result.numTotalTests);return result;});
const units={success:true,numPassedTests:runs.reduce((n,r)=>n+r.numPassedTests,0),numTotalTests:runs.reduce((n,r)=>n+r.numTotalTests,0),testResults:runs.flatMap(r=>r.testResults)};
const visual=read('visual-results.json');assert.equal(visual.sourceSha256,sourceSha256);assert.equal(visual.completed,true);assert.equal(visual.results.length,4);
assert.ok(source.equals(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for(const[name,command,args]of[['syntax',process.execPath,['--max-old-space-size=48','--check',sourcePath]],['whitespace','git',['diff','--check','--','stem_lab/stem_tool_solarsystem.js','desktop/web-app/public/stem_lab/stem_tool_solarsystem.js','tests/solar_system_activity_context.test.js','tests/solar_system_signal_inspection.test.js']]]){const result=spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8'});fs.writeFileSync(path.join(__dirname,name+'-log.txt'),(result.stdout||'')+(result.stderr||''));assert.equal(result.status,0,name);}
const summary={sourceSha256,baselineSha256:read('baseline.json').sourceSha256,verifiedAt:new Date().toISOString(),desktopMirrorMatches:true,
units:{passed:units.numPassedTests,total:units.numTotalTests,suites:units.testResults.map(r=>path.relative(root,r.name))},browser:{passed:visual.results.length,cases:visual.results.map(r=>r.name)},validatedBehavior:[
'Signal shortcuts record and restore the actual lab destination separately from the explorer world',
'Older signal records explicitly retain the current destination without guessing from the saved view world',
'Gravity shortcuts show the actual Earth-versus-target comparison, including Earth selection resolving to Mars',
'Current setup cards preview shared normalized signal angles, mass and drop height in both themes',
'New signal destinations deduplicate by actual target; equivalent Earth/Mars gravity shortcuts deduplicate by comparison',
'Changed signal destinations clear only transient trial state; same-target launches preserve it',
'Notebooks, drafts, journal entries, assignments and rewards are preserved by resume actions',
'Signal and gravity Close return keyboard focus to the launch control or visible finder results',
'Saved shortcuts, navigation, investigation discovery, signal model/inspection and gravity model regressions pass',
'Desktop and 320px layouts in both themes have readable controls and no horizontal overflow or browser errors'
],visualReview:['activity-context-1060-light-recents.png','activity-context-320-dark-recents.png','activity-context-320-light-continue.png'],syntax:'passed',whitespace:'passed',committed:false};
fs.writeFileSync(path.join(__dirname,'unit-results.json'),JSON.stringify(units,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
for(const name of ['.tmp-solar-read.cjs','.tmp-solar-context-setup.cjs','.tmp-solar-context-finish.cjs','.tmp-solar-context-sync.cjs']){const temporary=path.join(root,name);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify(summary,null,2));
