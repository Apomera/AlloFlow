/* Read-only verification of this closed Explorer Journey presentation report. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function arg(name,fallback){const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];}
const report=path.resolve(arg('report',__dirname));
const root=path.resolve(arg('root',path.resolve(report,'../..')));
const qaPath=path.resolve(arg('qa',path.join(report,'journey-overlay-qa.cjs')));
const CURRENT='f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36';
const BASELINE='4bb912b9f1d00c1b54be26d29197f0c1bd9c1277161664d21842532f973f4bf3';
const TEST='5eaa39034e5f9826b5ba7123476fe557953dded439ad899b439d71ac90f8ef06';
const MANIFEST='25ca5c798202408d27a18dd59b00541d2324ef974b3212d0404b3195d9635298';
const CURRENT_BYTES=3163319,BASELINE_BYTES=3153009;
const runtimePaths=['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
let checks=0;const browserSummaries=[];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=name=>fs.readFileSync(path.join(report,name));
const json=name=>JSON.parse(read(name).toString('utf8'));
function equal(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
function ok(actual,label){assert(actual,label);checks++;}
function childFile(name){const resolved=path.resolve(report,name);ok(resolved.startsWith(report+path.sep),'Artifact remains inside this report: '+name);return resolved;}
function artifact(name,expectedSha,expectedBytes){const bytes=fs.readFileSync(childFile(name));equal(sha(bytes),expectedSha,'Artifact hash: '+name);if(expectedBytes!=null)equal(bytes.length,expectedBytes,'Artifact bytes: '+name);return bytes;}

const mainBytes=fs.readFileSync(path.join(root,runtimePaths[0]));
runtimePaths.forEach(name=>{const bytes=fs.readFileSync(path.join(root,name));equal(sha(bytes),CURRENT,'Current runtime: '+name);equal(bytes.length,CURRENT_BYTES,'Current runtime bytes: '+name);});
const baselineBytes=artifact('baseline-runtime.js',BASELINE,BASELINE_BYTES);
const manifestBytes=artifact('presentation-changes.json',MANIFEST),manifest=JSON.parse(manifestBytes.toString('utf8'));
equal(manifest.baselineSha256,BASELINE,'Manifest baseline');equal(manifest.sourceSha256,CURRENT,'Manifest current source');
equal(manifest.changes.map(change=>change.id),['overlay-helpers','reserve-overlays','route-badges','foreground-parcel-plates','nearest-label-lane','stage-label-leaders'],'Six reviewed presentation slices');
let restored=mainBytes.toString('utf8');
manifest.changes.forEach(change=>{equal(typeof change.original,'string','Original slice');equal(typeof change.replacement,'string','Replacement slice');const i=restored.indexOf(change.replacement);ok(i>=0,'Present replacement: '+change.id);equal(restored.indexOf(change.replacement,i+change.replacement.length),-1,'Unique replacement: '+change.id);restored=restored.slice(0,i)+change.original+restored.slice(i+change.replacement.length);});
equal(Buffer.from(restored),baselineBytes,'Every byte outside the six presentation slices is preserved');

const focused=json('focused-tests-final.json');
equal(focused.completed,true,'Focused run completed');equal(focused.successful,true,'Focused run successful');equal(focused.passed,33,'Focused test count');equal(focused.tests.length,33,'Focused test inventory');ok(focused.tests.every(test=>test.passed===true),'All focused assertions passed');
equal(focused.sourceSha256,CURRENT,'Focused actual source hash');equal(focused.sourceBytes,CURRENT_BYTES,'Focused actual source bytes');equal(focused.baselineSha256,BASELINE,'Focused baseline hash');equal(focused.manifestSha256,MANIFEST,'Focused manifest hash');equal(focused.testSha256,TEST,'Focused frozen test hash');
const focusedName=path.basename(focused.testPath.replace(/\\/g,'/'));
const focusedPath=path.resolve(arg('test',path.join(report,focusedName)));
equal(sha(fs.readFileSync(focusedPath)),TEST,'Packaged or explicitly supplied focused script hash');

function verifyBrowser(prefix,expectedSha,expectedBytes,limits){
  const receipt=json(prefix+'-results.json');
  equal(receipt.prefix,prefix,'Browser prefix '+prefix);equal(receipt.completed,true,'Browser completed '+prefix);equal(receipt.successful,true,'Browser successful '+prefix);equal(receipt.browserClosed,true,'Browser closed '+prefix);equal(receipt.resourcesClosed,true,'Browser resources closed '+prefix);
  equal(receipt.errors,[],'Browser errors empty '+prefix);equal(receipt.consoleErrors,[],'Browser console errors empty '+prefix);
  equal(receipt.sourceSha256,expectedSha,'Browser source hash '+prefix);equal(receipt.sourceBytes,expectedBytes,'Browser source bytes '+prefix);equal(receipt.loadedRuntimeSha256,expectedSha,'Native loaded runtime hash '+prefix);equal(receipt.loadedRuntimeBytes,expectedBytes,'Native loaded runtime bytes '+prefix);
  ok(Array.isArray(receipt.checks)&&receipt.checks.length>=limits.checks,'Browser check coverage '+prefix);ok(receipt.checks.every(check=>check.passed===true),'All browser checks passed '+prefix);
  ok(Array.isArray(receipt.cases)&&receipt.cases.length>=limits.cases,'Browser scene coverage '+prefix);ok(Array.isArray(receipt.captures)&&receipt.captures.length>=limits.captures,'Browser capture coverage '+prefix);
  if(limits.nativeActions!=null)equal(receipt.nativeActions.length,limits.nativeActions,'Exact native action inventory '+prefix);
  if(limits.exact){equal(receipt.checks.length,limits.checks,'Exact browser check inventory '+prefix);equal(receipt.cases.length,limits.cases,'Exact scene matrix '+prefix);equal(receipt.captures.length,limits.captures,'Exact capture inventory '+prefix);}
  artifact(prefix+'-tested-runtime.js',expectedSha,expectedBytes);artifact(prefix+'-tested-harness.cjs',receipt.harnessSha256);
  receipt.captures.forEach(capture=>{equal(capture.sourceSha256,expectedSha,'Capture source provenance '+capture.path);artifact(capture.path,capture.sha256,capture.bytes);});
  if(limits.mode)equal(receipt.mode,limits.mode,'Browser provenance mode '+prefix);
  if(limits.interception!=null)equal(receipt.interceptionUsed,limits.interception,'Runtime interception provenance '+prefix);
  if(limits.harness)equal(sha(fs.readFileSync(qaPath)),receipt.harnessSha256,'Current QA matches frozen final harness '+prefix);
  if(limits.actions){const routes=receipt.nativeActions.filter(action=>action.route);equal(routes.length,6,'Native route actions '+prefix);routes.forEach(action=>{equal(action.after.data.journeyState,action.route.state,'Native route state '+action.label);equal(action.after.data.journeyLastPath,action.route.key,'Native route recorded '+action.label);for(const key of ['runoff','infiltrate','plant'])equal(action.deltas[key],key===action.route.key?1:0,'Native route count '+action.label+'/'+key);for(const key of ['xp','score','researchPoints','completedChallenges','wcExperimentLog','wcCheckReflections'])equal(action.after.data[key],action.before.data[key],'Learner work remains intact '+action.label+'/'+key);});}
  if(limits.smoke)verifyPlaybackSmoke(receipt,prefix);
  browserSummaries.push({prefix,checks:receipt.checks.length,scenes:receipt.cases.length,captures:receipt.captures.length,sourceSha256:receipt.sourceSha256,loadedRuntimeSha256:receipt.loadedRuntimeSha256,harnessSha256:receipt.harnessSha256});
}
function verifyPlaybackSmoke(receipt,prefix){
  const smokes=receipt.nativeActions.filter(action=>action.label==='Native canvas Space resume then pause');
  equal(smokes.length,1,'One native playback smoke '+prefix);const smoke=smokes[0];
  equal(smoke.completed,true,'Playback smoke completed '+prefix);equal(smoke.keys,['Space','Space'],'Native playback keys '+prefix);equal(smoke.fixtureJourneyPaused,false,'Ready-to-play journey fixture '+prefix);equal(smoke.fixtureMotion,'no-preference','Native motion fixture '+prefix);
  equal(smoke.focusedElement,{id:'wcCanvas',reducedMotionQuery:false},'Native canvas receives keys '+prefix);equal(smoke.nativeObservation.methodsRestored,true,'Native playback observer restored '+prefix);
  const events=smoke.nativeObservation.events;equal(events.length,2,'Exactly two native Space events '+prefix);
  events.forEach((event,index)=>{equal(event.type,'keydown','Native key event '+prefix);equal(event.code,'Space','Native Space key '+prefix);equal(event.target,'wcCanvas','Native Space target '+prefix);equal(event.activeElement,'wcCanvas','Native Space focus '+prefix);equal(event.wc2dPaused,index===0?'true':'false','Native pause transition event '+prefix);});
  const before=smoke.beforeNative;
  ok(Number.isFinite(before.ratio)&&before.parcel&&Number.isFinite(before.parcel.x)&&Number.isFinite(before.parcel.y),'Native starting HUD and parcel '+prefix);
  ok(smoke.nativeObservation.samples.some(sample=>sample.wc2dPaused==='false'&&Number.isFinite(sample.ratio)&&sample.ratio>before.ratio+.01&&sample.parcel&&Math.hypot(sample.parcel.x-before.parcel.x,sample.parcel.y-before.parcel.y)>.25),'Native HUD progress and parcel actually advance '+prefix);
  equal(smoke.playing.dataset.wc2dPaused,'false','Native playback resumes '+prefix);equal(smoke.paused.dataset.wc2dPaused,'true','Native playback pauses '+prefix);equal(smoke.afterRedraw.dataset.wc2dPaused,'true','Requested redraw retains pause '+prefix);equal(smoke.still.dataset.wc2dPaused,'true','Passive observation retains pause '+prefix);
  ok(smoke.playingText.includes('Animation leg')&&!smoke.playingText.includes('Paused ·'),'Playing footer '+prefix);ok(smoke.pausedText.includes('Paused · Animation leg'),'Paused footer '+prefix);
  for(const value of [smoke.pausedRatio,smoke.settledRatio,smoke.finalRatio])ok(Number.isFinite(value)&&value>=0&&value<=1&&Math.abs(value-smoke.pausedNative.ratio)<1e-6,'Requested paints preserve actual HUD ratio '+prefix);
  ok(smoke.pausedParcel&&Number.isFinite(smoke.pausedParcel.x)&&Number.isFinite(smoke.pausedParcel.y),'Paused parcel center is recorded '+prefix);
  for(const name of ['settledParcel','finalParcel']){const parcel=smoke[name];ok(parcel&&Number.isFinite(parcel.x)&&Number.isFinite(parcel.y)&&Math.hypot(parcel.x-smoke.pausedParcel.x,parcel.y-smoke.pausedParcel.y)<.1,'Requested paints preserve parcel center '+prefix+'/'+name);}
  equal(smoke.afterRedraw.canvasSha256,smoke.still.canvasSha256,'Passive paused pixels remain stable after last requested paint '+prefix);
  const fields=['xp','score','researchPoints','wcExperimentLog','wcCheckReflections','completedChallenges','journeyPaths','journeyLoops','journeyLastPath','wcScenarioBaseline','wcPrediction','wcReplayedObservation'];
  for(const name of ['playing','paused','afterFirstRequestedRedraw','afterRedraw','still']){const observed=smoke[name];fields.forEach(field=>equal(observed.data[field],smoke.before.data[field],'Saved playback work '+prefix+'/'+name+'/'+field));ok(observed.engine.canvasSame&&observed.engine.contextSame&&observed.engine.hooks.every(hook=>hook.type==='function'&&hook.same),'Original playback engine retained '+prefix+'/'+name);}
  for(const label of ['Native canvas Space resumes actual animation leg and removes Paused status','Native canvas Space pauses and requested redraw preserves progress','Native pause retains rendered progress and parcel through forced redraw and freezes passive pixels','Native Space playback retains saved work baseline scores paths and engine']){const matches=receipt.checks.filter(check=>check.label===label);equal(matches.length,1,'Explicit native playback check '+prefix+'/'+label);equal(matches[0].passed,true,'Native playback check passed '+prefix+'/'+label);}
}
verifyBrowser('baseline-initial',BASELINE,BASELINE_BYTES,{checks:195,cases:45,captures:17,nativeActions:6,exact:true,actions:true});
verifyBrowser('final-corrected',CURRENT,CURRENT_BYTES,{checks:631,cases:45,captures:17,nativeActions:7,exact:true,actions:true,smoke:true,mode:'candidate',interception:true,harness:true});
verifyBrowser('live-final',CURRENT,CURRENT_BYTES,{checks:50,cases:3,captures:3,nativeActions:1,exact:true,smoke:true,mode:'live-delivery',interception:false,harness:true});

const regression=json('regression-final4/receipt.json'),results=json('regression-final4/results.json');
equal(regression.successful,true,'Final regression run succeeded');equal(regression.code,0,'Final regression exit');equal(regression.instrumented,false,'Final regression uses native uninstrumented runtime');equal(regression.sourceSha256,CURRENT,'Regression source hash');
for(const name of ['before','after']){equal(regression[name].length,2,'Both regression runtime hashes '+name);runtimePaths.forEach(file=>{const record=regression[name].find(item=>item.path===file);ok(record,'Regression source record '+name+'/'+file);equal(record.sha256,CURRENT,'Regression source hash '+name+'/'+file);});}
equal(regression.results,{success:true,passed:108,failed:0},'Regression receipt totals');equal(results.success,true,'Vitest result success');equal(results.numTotalTests,108,'Vitest total count');equal(results.numPassedTests,108,'Vitest passing count');equal(results.numFailedTests,0,'Vitest failed count');equal(results.numPendingTests,0,'Vitest pending count');equal(results.numTodoTests,0,'Vitest todo count');
equal(regression.testHashes.length,9,'Existing regression inventory');equal(results.testResults.length,9,'Detailed regression file count');
regression.testHashes.forEach(test=>{equal(sha(fs.readFileSync(path.join(root,test.path))),test.sha256,'Existing test remains unchanged '+test.path);const result=results.testResults.find(item=>item.name.replace(/\\/g,'/').endsWith('/'+test.path));ok(result,'Detailed test file '+test.path);equal(result.status,'passed','Detailed test file passed '+test.path);ok(result.assertionResults.every(item=>item.status==='passed'),'All detailed assertions passed '+test.path);});
equal(results.testResults.reduce((sum,file)=>sum+file.assertionResults.length,0),108,'Detailed assertion total');
console.log(JSON.stringify({successful:true,checks,focusedTests:33,regressionTests:108,totalTests:141,currentSourceSha256:CURRENT,baselineSha256:BASELINE,browser:browserSummaries},null,2));
