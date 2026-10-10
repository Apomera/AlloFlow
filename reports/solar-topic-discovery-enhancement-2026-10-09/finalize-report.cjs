const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sourcePath=path.join(root,'stem_lab/stem_tool_solarsystem.js'),source=fs.readFileSync(sourcePath),sourceSha256=createHash('sha256').update(source).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const modes=['unit-topics','unit-navigation','unit-shortcuts','unit-discovery'];
for(const mode of [...modes,'visual']){assert.equal(read(mode+'-exit.json').status,0,mode);assert.equal(read(mode+'-source.json').sourceSha256,sourceSha256,mode+' started on verified source');assert.equal(read(mode+'-exit.json').sourceSha256,sourceSha256);}
const runs=modes.map(mode=>{const result=read(mode+'-results.json');assert.equal(result.success,true);assert.ok(result.numTotalTests>0);assert.equal(result.numPassedTests,result.numTotalTests);return result;});
const units={success:true,numPassedTests:runs.reduce((n,r)=>n+r.numPassedTests,0),numTotalTests:runs.reduce((n,r)=>n+r.numTotalTests,0),testResults:runs.flatMap(r=>r.testResults)};
const visual=read('visual-results.json');assert.equal(visual.sourceSha256,sourceSha256);assert.equal(visual.completed,true);assert.equal(visual.results.length,4);
assert.ok(source.equals(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for(const[name,command,args]of[['syntax',process.execPath,['--max-old-space-size=48','--check',sourcePath]],['whitespace','git',['diff','--check','--','stem_lab/stem_tool_solarsystem.js','desktop/web-app/public/stem_lab/stem_tool_solarsystem.js','tests/solar_system_activity_topics.test.js']]]){const result=spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8'});fs.writeFileSync(path.join(__dirname,name+'-log.txt'),(result.stdout||'')+(result.stderr||''));assert.equal(result.status,0,name);}
assert.ok(!fs.readFileSync(path.join(root,'tests/solar_system_activity_topics.test.js'),'utf8').split(/\r?\n/).some(line=>/[\t ]+$/.test(line)),'New test whitespace');
const summary={sourceSha256,baselineSha256:read('baseline.json').sourceSha256,verifiedAt:new Date().toISOString(),desktopMirrorMatches:true,
units:{passed:units.numPassedTests,total:units.numTotalTests,suites:units.testResults.map(r=>path.relative(root,r.name))},browser:{passed:visual.results.length,cases:visual.results.map(r=>r.name)},validatedBehavior:[
'Eight topic buttons expose matching counts computed from search and collection before the selected topic filter',
'Topic icons and colors repeat on result cards, with text labels and pressed state carrying the meaning',
'Topic buttons and the existing native select remain synchronized without moving focus away from topic selection',
'Counts update with normalized, translated-label and description search, saved bookmarks and the investigation collection',
'Empty results offer one accurate recovery action: widen topic, clear search, widen collection, or reset all filters',
'Recovery preserves helpful filters and saved work, and focuses the committed results heading after the action',
'Detached, closed and stale recovery controls cannot overwrite newer filters or saved selections',
'Restored invalid data stays read-only; filtering does not launch activities or change rewards/history',
'Desktop and 320px layouts in both themes have readable controls, sufficient topic contrast and no horizontal overflow or browser errors',
'Navigation, saved shortcuts and investigation discovery regressions pass'
],visualReview:['topic-discovery-1060-light-investigations.png','topic-discovery-320-dark-investigations.png','topic-discovery-320-light-recovery.png'],syntax:'passed',whitespace:'passed',committed:false};
fs.writeFileSync(path.join(__dirname,'unit-results.json'),JSON.stringify(units,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
for(const name of ['.tmp-solar-read.cjs','.tmp-solar-topics-setup.cjs','.tmp-solar-topics-sync.cjs']){const temporary=path.join(root,name);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify(summary,null,2));
