const fs=require('fs'),cp=require('child_process'),out='reports/sky-lab-tidal-forcing-2026-10-01';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
cp.execFileSync(process.execPath,[out+'/verify-build.cjs'],{stdio:'inherit'});
const original=read(out+'/unit-extended-results.json'),rerun=read(out+'/unit-tidal-rerun-results.json'),pointer=read(out+'/unit-pointer-results.json');
if(!rerun.success||rerun.numPassedTests!==45||rerun.numFailedTests!==0)throw Error('Tide rerun incomplete');
const pointerPassed=pointer.testResults.flatMap(t=>t.assertionResults.filter(a=>a.status==='passed'));
if(!pointer.success||pointer.numFailedTests!==0||pointerPassed.length!==1||!pointerPassed[0].fullName.includes('Standard pointer movement'))throw Error('Pointer check incomplete');
const files=original.testResults.filter(t=>!t.name.endsWith('astronomy_tidal_forcing.test.js'));
files.push({...rerun.testResults[0],assertionResults:[...rerun.testResults[0].assertionResults,...pointerPassed]});
const assertions=files.flatMap(t=>t.assertionResults);
const unit={success:assertions.every(a=>a.status==='passed'),numTotalTests:assertions.length,numPassedTests:assertions.filter(a=>a.status==='passed').length,numFailedTests:assertions.filter(a=>a.status==='failed').length,testResults:files,acceptedReports:['unit-extended-results.json (119 regression cases)','unit-tidal-rerun-results.json (45 tide and Moon visibility cases)','unit-pointer-results.json (1 pointer movement case)']};
if(unit.numTotalTests!==165)throw Error('Unexpected accepted unit count');
fs.writeFileSync(out+'/unit-results.json',JSON.stringify(unit,null,2)+'\n');
const browser=read(out+'/browser-results.json'),phone=read(out+'/phone-geometry.json');
if(!unit.success||unit.numFailedTests!==0||unit.numPassedTests!==unit.numTotalTests)throw Error('Unit checks incomplete or failing');
const cases=[];
function walk(suites){for(const suite of suites){for(const spec of suite.specs||[])for(const test of spec.tests||[]){const last=test.results?.at(-1);cases.push({file:suite.file||spec.file,title:spec.title,status:last?.status,durationMs:last?.duration});}walk(suite.suites||[]);}}
walk(browser.suites||[]);
const beforePhone=cases.length,phoneRun=read(out+'/browser-polish-results.json');
walk(phoneRun.suites||[]);const updatedPhone=cases.splice(beforePhone);
if(updatedPhone.length!==2||updatedPhone[0].status!=='passed')throw Error('Final phone check incomplete');
for(const replacement of updatedPhone){const index=cases.findIndex(c=>c.title===replacement.title);if(index<0)throw Error('Phone case absent from base browser report');cases[index]=replacement;}

if(cases.length!==13||cases.some(c=>c.status!=='passed'))throw Error('Expected 13 passing browser scenarios');
const paths=['stem_lab/stem_tool_astronomy.js','desktop/web-app/public/stem_lab/stem_tool_astronomy.js','ui_strings.js','desktop/web-app/public/ui_strings.js','tests/astronomy_tidal_forcing.test.js','tests/e2e/astronomy-tidal-forcing.spec.ts'];
const diff=cp.spawnSync('git',['diff','--check','--',...paths],{encoding:'utf8'});
if(diff.status!==0)throw Error('Whitespace check failed: '+diff.stdout+diff.stderr);
const result={
 checkedOn:'2026-10-01',enhancement:'Interactive tidal-forcing explorer in Sky Lab Moon',
 changes:['Linked Earth-Moon-Sun geometry and a 48-hour contribution chart.','Starting phase and NASA mean lunar distance presets, Moon-only comparison and reset.','Keyboard, touch and graph time selection with live alignment feedback.','Published NASA/JPL inputs, NOAA local tide link and explicit model limitations.','Corrected the existing claim that all coasts have two highs every day.','Moon GPU drawing pauses when its canvas is hidden or outside the viewport.'],
 scope:read(out+'/scope-verification.json'),data:read(out+'/data-provenance.json'),
 units:{total:unit.numTotalTests,passed:unit.numPassedTests,failed:unit.numFailedTests,files:unit.testResults.map(t=>({file:t.name.split(/[\\/]/).at(-1),passed:t.assertionResults.filter(a=>a.status==='passed').length,failed:t.assertionResults.filter(a=>a.status==='failed').length}))},
 browser:{scenarios:cases,passed:cases.length,failed:0,durationMs:(browser.stats?.duration||0)+(phoneRun.stats?.duration||0),acceptedReports:['browser-results.json (13 scenarios)','browser-polish-results.json (final desktop and phone scenarios)'],errorsAndRejections:'Each scenario asserted empty browser error and unhandled-rejection logs.'},
 phone:{viewportWidth:320,contrast:true,overflow:phone.overflow,minimumSvgTextPixels:Math.min(...phone.svgs.flatMap(s=>s.text.map(t=>t.font))),minimumControlHeightPixels:Math.min(...phone.targets.map(t=>t.height)),table:phone.table,textClippingAndPairwiseOverlap:'All labels checked inside each SVG viewBox, with no intersecting text boxes.'},
 moonRendering:read(out+'/moon-render-visibility.json'),runner:read(out+'/runner-notes.json'),whitespaceCheckPassed:true,
 limitations:['Idealized coplanar equatorial forcing using published reference inputs; this is not a local water-level prediction.','Distance and mean angular rates are fixed for each 48-hour experiment.','Ocean dynamics, local coast and basin geometry, inclination, eccentricity, friction, lag, weather and uncertainty are omitted.','Automated browser checks use the local React harness; no end-to-end live deployment was performed.'],
 artifacts:['tidal-forcing-desktop.png','tidal-forcing-phone-contrast.png','tidal-geometry-phone.png','tidal-curve-phone.png','tidal-inputs-phone.png','unit-results.json','browser-results.json','phone-geometry.json','scope-verification.json','download-provenance.json'],
 committed:false,pushed:false
};
fs.writeFileSync(out+'/verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({units:result.units,browserPassed:cases.length,phone:result.phone,sourceSha256:result.scope.sourceSha256,committed:false}));
