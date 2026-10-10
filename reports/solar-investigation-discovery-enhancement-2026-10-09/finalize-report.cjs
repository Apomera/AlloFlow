const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sourcePath=path.join(root,'stem_lab/stem_tool_solarsystem.js'),source=fs.readFileSync(sourcePath),sourceSha256=createHash('sha256').update(source).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const modes=['unit-discovery','unit-shortcuts','unit-navigation','unit-dashboard','unit-hub','unit-walk'];
for(const mode of [...modes,'visual']){assert.equal(read(mode+'-exit.json').status,0,mode);assert.equal(read(mode+'-source.json').sourceSha256,sourceSha256,mode+' started on verified source');assert.equal(read(mode+'-exit.json').sourceSha256,sourceSha256);}
const runs=modes.map(mode=>{const result=read(mode+'-results.json');assert.equal(result.success,true);assert.ok(result.numTotalTests>0);assert.equal(result.numPassedTests,result.numTotalTests);return result;});
const units={success:true,numPassedTests:runs.reduce((n,r)=>n+r.numPassedTests,0),numTotalTests:runs.reduce((n,r)=>n+r.numTotalTests,0),testResults:runs.flatMap(r=>r.testResults)};
const visual=read('visual-results.json');assert.equal(visual.sourceSha256,sourceSha256);assert.equal(visual.completed,true);assert.equal(visual.results.length,4);
assert.ok(source.equals(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'))));
for(const[name,command,args]of[['syntax',process.execPath,['--max-old-space-size=48','--check',sourcePath]],['whitespace','git',['diff','--check','--','stem_lab/stem_tool_solarsystem.js','desktop/web-app/public/stem_lab/stem_tool_solarsystem.js','tests/solar_system_investigation_discovery.test.js','tests/solar_system_activity_shortcuts.test.js']]]){const result=spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8'});fs.writeFileSync(path.join(__dirname,name+'-log.txt'),(result.stdout||'')+(result.stderr||''));assert.equal(result.status,0,name);}
const summary={sourceSha256,baselineSha256:read('baseline.json').sourceSha256,verifiedAt:new Date().toISOString(),desktopMirrorMatches:true,
units:{passed:units.numPassedTests,total:units.numTotalTests,suites:units.testResults.map(r=>path.relative(root,r.name))},browser:{passed:visual.results.length,cases:visual.results.map(r=>r.name)},validatedBehavior:[
'124 searchable catalog entries including the existing seasons, Moon/eclipses, scale-walk and visual-comparison labs',
'Six-item Investigations collection with descriptions included in normalized search and topic filtering',
'The four new lab entries support bookmarks, recent shortcuts and committed destination focus',
'Seasons routes use the actual supported model world; Moon/eclipses consistently records Earth',
'Finder and resume launches preserve phases, angles, walk settings, comparison pairs, drafts and evidence',
'Existing dashboard, Investigation Hub, guide and scale-walk launchers record explicit openings atomically',
'Close and evidence-only actions do not create false recent activity',
'External launchers clear superseded finder focus and return ownership',
'Closing newly connected labs returns keyboard focus to the launch control or visible results',
'Existing navigation, saved shortcuts, mission dashboard, investigation hub and scale walk regressions pass',
'Desktop and 320px finder layouts in both themes have readable controls and no horizontal overflow or browser errors'
],visualReview:['investigation-discovery-1060-light-collection.png','investigation-discovery-320-dark-collection.png','investigation-discovery-320-light-resume.png'],syntax:'passed',whitespace:'passed',committed:false};
fs.writeFileSync(path.join(__dirname,'unit-results.json'),JSON.stringify(units,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
for(const name of ['.tmp-solar-read.cjs','.tmp-solar-discovery-setup.cjs','.tmp-solar-discovery-finish.cjs']){const temporary=path.join(root,name);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify(summary,null,2));
