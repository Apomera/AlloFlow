const fs=require('fs'),path=require('path'),crypto=require('crypto'),repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-scenario-clarity-2026-10-06/scenario-7'),capture=path.join(report,'captures');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),run=JSON.parse(fs.readFileSync(path.join(report,'run.json'),'utf8')),results=JSON.parse(fs.readFileSync(path.join(report,'results.json'),'utf8'));
if(run.exitCode!==0||run.startHashes['stem_lab/stem_tool_dissection.js']!=='c9c4d0a4170a44cb7492f19c7e10823bded91490edcc7ad0998e59a814508a56'||run.startHashes['tests/e2e/dissection-scenario-clarity.spec.ts']!=='d0b5a0ab9c9343963f9bb070ca48eb194d0e42ef51f3c2c331b0731191ba0246')throw Error('Successful current run pins required');
const relevantInputs=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js','tests/dissection_lab_improvements.test.js','tests/e2e/dissection-scenario-clarity.spec.ts'];
for(const input of relevantInputs)if(run.startHashes[input]!==run.endHashes?.[input])throw Error('Relevant scenario run pin changed: '+input);
if(run.servedRenderer.sha256!==run.startHashes[relevantInputs[0]]||run.startHashes[relevantInputs[1]]!==run.startHashes[relevantInputs[0]])throw Error('Served renderer or mirror mismatch');
const tests=[];function walk(s){for(const spec of s.specs||[])for(const t of spec.tests||[])tests.push({title:spec.title,status:t.status,results:(t.results||[]).map(x=>x.status)});for(const x of s.suites||[])walk(x);}walk(results);if(tests.length!==11||tests.some(t=>t.results.length!==1||t.results[0]!=='passed'))throw Error('Eleven fresh passes required');
function rgb(c){const v=c.match(/[\d.]+/g)?.map(Number);if(!v||v.length<3)throw Error('Color parse');return v.slice(0,3).map(n=>n/255);}
function lum(c){const v=rgb(c).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);return v[0]*0.2126+v[1]*0.7152+v[2]*0.0722;}
function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
const names=['phone','tablet','desktop','embedded-medium','embedded-large-contrast','forced-colors'],metrics=names.map(name=>{const m=JSON.parse(fs.readFileSync(path.join(capture,'after-'+name+'-metrics.json'),'utf8')),s=m.controls.find(c=>c.name==='Choose procedure scenario');return {name,panelWidth:m.width,clientWidth:m.client,scrollWidth:m.scroll,minimumTextFont:Math.min(...m.text.map(x=>x.font)),minimumControlFont:Math.min(...m.controls.map(x=>x.font)),minimumControlHeight:Math.min(...m.controls.map(x=>x.height)),clippedText:m.text.filter(x=>x.clipped).length,clippedControls:m.controls.filter(x=>x.clipped).length,select:s,selectTextContrastRatio:ratio(s.color,s.backgroundColor)};});
const audits=[...names,'restart-review'].map(name=>{
  const file=path.join(capture,name+'-axe.json');
  const a=JSON.parse(fs.readFileSync(file,'utf8'));
  return {
    name,
    file:file.replace(/\\/g,'/'),
    sha256:sha(fs.readFileSync(file)),
    violations:a.violations.length,
    incomplete:a.incomplete.map(x=>({
      id:x.id,
      nodes:x.nodes.map(n=>({
        target:n.target,
        checks:[...(n.any||[]),...(n.all||[]),...(n.none||[])].map(k=>({id:k.id,message:k.message,data:k.data}))
      }))
    })),
    passedRules:a.passes.length,
    inapplicableRules:a.inapplicable.length
  };
});
if(audits.some(a=>a.violations))throw Error('Review unexpected violation');
const normal=metrics.filter(x=>x.select.backgroundImage!=='none');
for(const m of normal){if(m.selectTextContrastRatio<4.5||m.select.backgroundColor!=='rgb(255, 255, 255)'||m.select.backgroundSize!=='16px 16px'||m.select.backgroundPosition!=='calc(100% - 9.6px) 50%')throw Error('Unexpected manual contrast inputs');}
for(const a of audits)for(const x of a.incomplete)if(x.id!=='color-contrast'||x.nodes.some(n=>n.target.join('')!=='#diss-scenario-select'||!n.checks.every(k=>k.data?.messageKey==='bgImage')))throw Error('Unexpected incomplete requires review');
const screenshots=['after-desktop-scenario.png','after-phone-scenario.png','after-embedded-large-contrast-scenario.png','after-forced-colors-scenario.png','restart-review-scenario.png'].map(name=>{const file=path.join(capture,name);return {name,file:file.replace(/\\/g,'/'),sha256:sha(fs.readFileSync(file))};});
const review={
  date:'2026-10-06',reviewer:'view_browser',scope:'Independent inspection of five actual current captures, six full layout metrics, and seven complete scoped axe result files from a successful eleven-case run.',
  pins:{source:run.startHashes['stem_lab/stem_tool_dissection.js'],mirror:run.startHashes['desktop/web-app/public/stem_lab/stem_tool_dissection.js'],unit:run.startHashes['tests/dissection_lab_improvements.test.js'],browser:run.startHashes['tests/e2e/dissection-scenario-clarity.spec.ts'],relevantStartEndHashesEqual:true,relevantInputs,servedRenderer:run.servedRenderer.sha256},
  browserResult:{cases:tests.length,passed:tests.length,retries:0,run:'scenario-7',exitCode:run.exitCode,runRecordSha256:sha(fs.readFileSync(path.join(report,'run.json'))),resultRecordSha256:sha(fs.readFileSync(path.join(report,'results.json')))},screenshots,metrics,
  visualObservations:[
    'Desktop separates purpose, objective, progress, scenario choice, Start, and Restart. Text remains readable and the current selected option fits.',
    'Phone reflows controls into one column. The current scenario name and difficulty wrap fully and the normal SVG arrow occupies a separate right-hand area.',
    'Large text with high contrast keeps the full selected option on two lines and shows a clear decorative chevron. Control borders and labels remain distinct without color.',
    'Restart review states the current native Skin layer and the full current Frog specimen scope. The focused Confirm control has a strong blue inset ring. Keep current attempt remains visible and separate.',
    'Forced colors now paints the full selected option, including its difficulty suffix, on two lines. Exactly one clear chevron appears. The actual capture confirms the earlier native paint issue is resolved.',
    'No text or control clipping appears in any of the five inspected captures. All six measured layouts retain readable text, large control targets, and no horizontal overflow.'
  ],
  visualFindings:[],
  resolvedVisualFindings:[{reportedRun:'scenario-6',capture:'after-forced-colors-scenario.png',finding:'Forced-color native select painting cropped the trailing difficulty suffix and drew a second chevron.',currentRun:'scenario-7',resolution:'The forced-only important appearance and forced-color-adjust rules retain explicit system colors. Independent inspection of the actual current image confirms complete wrapping and one decorative chevron.'}],
  axe:{audits,confirmedViolations:audits.reduce((n,a)=>n+a.violations,0),rawIncompleteRules:audits.reduce((n,a)=>n+a.incomplete.length,0),rawIncompleteNodes:audits.reduce((n,a)=>n+a.incomplete.reduce((sum,x)=>sum+x.nodes.length,0),0),manualResolutions:audits.filter(a=>a.incomplete.length).map(a=>({audit:a.name,target:'#diss-scenario-select',reason:'Automated background-color inference stops at the existing SVG arrow background image.',foreground:'rgb(59, 29, 104)',background:'rgb(255, 255, 255)',textContrastRatio:normal[0].selectTextContrastRatio,requiredTextContrastRatio:4.5,arrowStroke:'#475569',arrowContrastRatio:ratio('rgb(71, 85, 105)','rgb(255, 255, 255)'),arrowPosition:'calc(100% - 9.6px) 50%',arrowSize:'16px 16px',manualEvidence:'Computed styles in the actual layout metrics and inspected normal/restart captures show an opaque white text background and the small arrow placed away from the wrapped text.',result:'Text contrast resolved manually; the original full axe incomplete result remains retained.'}))},
  validationLimit:'This review covers the saved scenario-7 state and its four relevant scenario input pins. It does not claim that unrelated unit inputs stayed unchanged during that run. Native selected-option painting was inspected in the actual screenshot because DOM width metrics alone can miss it. The five original full axe contrast incompletes remain distinct from zero confirmed violations and the manual contrast resolutions.'
};
const finalFile=path.join(__dirname,'scenario-visual-review.json');
if(fs.existsSync(finalFile)){const previous=JSON.parse(fs.readFileSync(finalFile,'utf8'));if(previous.browserResult?.run==='scenario-6')fs.copyFileSync(finalFile,path.join(__dirname,'scenario-6-visual-review.json'));}
fs.writeFileSync(finalFile,JSON.stringify(review,null,2));console.log(JSON.stringify({file:finalFile,pins:review.pins,cases:review.browserResult.passed,audits:audits.length,confirmedViolations:review.axe.confirmedViolations,rawIncompleteRules:review.axe.rawIncompleteRules,manualResolutions:review.axe.manualResolutions.length,selectTextContrastRatio:normal[0].selectTextContrastRatio,arrowContrastRatio:review.axe.manualResolutions[0]?.arrowContrastRatio,visualFindings:review.visualFindings.length}));
