const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-technique-roadmap-2026-10-06');
const file=path.join(repo,'tests/dissection_lab_improvements.test.js'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const sourcePin='1d10e56b0d969ccbda290bfbdb884a9c22d8586fe92f51e2c6ea4d2290c28a9b',unitPin='09a1ced8e0352c69624dc6682b6c2846619de0a696dedb42fabc739fce27f64f';
const old=fs.readFileSync(file),text=old.toString();
if(hash(old)!==unitPin||hash(fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js')))!==sourcePin)throw Error('Current source or unit drift');
const eol=text.includes('\r\n')?'\r\n':'\n';
const before=["  ])('keeps the technique roadmap out of %s', async (_case, patch) => {","    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, patch));","    try {","      expect(fixture.host.querySelector('[id=\"diss-technique-roadmap\"]')).toBeNull();"].join(eol);
const after=["  ])('keeps the technique roadmap out of %s', async (_case, patch) => {","    const activePatch = _case === 'timed practical' ? {","      ...patch, practicalTimer: 300, practicalEndsAt: Date.now() + 300000,","      practicalTargetIds: ['ventral_skin', 'tympanum'],","    } : patch;","    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, activePatch));","    try {","      if (_case === 'timed practical') {","        expect(fixture.state.practicalMode).toBe(true);","        expect(fixture.state.quizMode).toBe(true);","        expect(fixture.state.practicalEndsAt).toBeGreaterThan(Date.now());","        expect(fixture.state.practicalTimer).toBeGreaterThan(0);","        expect(fixture.state.practicalTargetIds).toEqual(['ventral_skin', 'tympanum']);","        expect(fixture.host.querySelector('[data-dissection-root]')?.getAttribute('data-assessment-mode')).toBe('true');","      }","      expect(fixture.host.querySelector('[id=\"diss-technique-roadmap\"]')).toBeNull();"].join(eol);
if(text.split(before).length!==2)throw Error('Timed practical fixture is not unique');
const next=text.replace(before,()=>after);
if(next.replace(after,()=>before)!==text)throw Error('Correction inverse failed');
require(path.join(repo,'node_modules/acorn')).parse(next,{ecmaVersion:'latest',sourceType:'module'});
const manifest=JSON.parse(fs.readFileSync(path.join(report,'edits/unit-edits.json')));
manifest.edits.push({name:'Keep the timed practical fixture active with a fresh deadline and verify its route',before,after});
manifest.afterSha256=hash(next);
let reversed=next;for(const edit of manifest.edits.slice().reverse()){if(reversed.split(edit.after).length!==2)throw Error('Ambiguous cumulative inverse');reversed=reversed.replace(edit.after,()=>edit.before);}
const baseline=zlib.gunzipSync(fs.readFileSync(path.join(report,'edits/unit-baseline.js.gz')));
if(reversed!==baseline.toString())throw Error('Prebaseline tests changed');
const results=JSON.parse(fs.readFileSync(path.join(report,'unit-practical-8/results.json')));
const failed=results.testResults.flatMap(s=>s.assertionResults).filter(t=>t.status==='failed').map(t=>({fullName:t.fullName,status:t.status,duration:t.duration,failureMessages:t.failureMessages}));
const receipt={at:new Date().toISOString(),sourceSha256:sourcePin,beforeSha256:unitPin,afterSha256:hash(next),exactInverse:true,prebaselineBytesPreserved:true,testNamesPreserved:true,originalAssertionsPreserved:true,newRouteAssertions:6,reason:'The prior seed omitted practicalEndsAt. syncCanvasPracticalCountdown immediately ticks on mount; tickCanvasPracticalCountdown detects the missing deadline and finishCanvasPractical correctly clears practicalMode and quizMode. A fresh execution-time deadline keeps this test in an actual active timed practical.',nativeCauseLines:[19459,19473,19474,19475,19498],priorCollectedFailure:failed,edit:{before,after}};
if(process.argv[2]==='apply'){
  fs.writeFileSync(path.join(report,'edits/unit-before-deadline-correction.js.gz'),zlib.gzipSync(old));
  fs.writeFileSync(file,next);fs.writeFileSync(path.join(report,'edits/unit-final.js.gz'),zlib.gzipSync(Buffer.from(next)));
  fs.writeFileSync(path.join(report,'edits/unit-edits.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(report,'edits/unit-deadline-correction.json'),JSON.stringify(receipt,null,2));
  const applied=JSON.parse(fs.readFileSync(path.join(report,'edits/apply-receipt.json')));applied.unit=hash(next);applied.unitDeadlineCorrectionAt=new Date().toISOString();fs.writeFileSync(path.join(report,'edits/apply-receipt.json'),JSON.stringify(applied,null,2));
}else{
  fs.writeFileSync(path.join(__dirname,'unit-practical-deadline-next.js'),next);
  fs.writeFileSync(path.join(__dirname,'unit-practical-deadline-edits.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(__dirname,'unit-practical-deadline-review.json'),JSON.stringify(receipt,null,2));
}
console.log(JSON.stringify({mode:process.argv[2]||'stage',sourceSha256:sourcePin,beforeSha256:unitPin,afterSha256:hash(next),exactInverse:true,prebaselineBytesPreserved:true,failedTest:failed[0]?.fullName},null,2));
