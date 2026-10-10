const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(repo,'reports/universe-flight-2026-09-29/close-disk');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
async function main(){
 const audit=read(path.join(stage,'audit-handoff.json'));
 const native=read(path.join(stage,'native-report/analysis.json'));
 const artifact=read(path.join(stage,'artifact-report/analysis.json'));
 const unit=read(path.join(stage,'focused-unit/aggregate.json'));
 const browser=read(path.join(report,'vista-browser-check.json'));
 const previews=read(path.join(report,'previews/check.json'));
 for(const proof of [audit,native,artifact,unit,browser,previews])assert.equal(proof.completed,true);
 assert.equal(unit.distinctTests,39);assert.equal(unit.distinctFiles,3);assert.equal(unit.allPassed,true);assert.equal(unit.fullDomSuiteRun,false);
 assert.equal(browser.checks.length,4);assert.equal(browser.accessibility.length,6);assert.equal(browser.captures.length,4);
 assert.ok(browser.accessibility.every(x=>x.violations.length===0));
 assert.equal(previews.views.length,12);assert.ok(previews.views.every(x=>x.poseUnchanged));
 assert.equal(sha(path.join(stage,'audit-handoff.cjs')),audit.driverHash);
 assert.equal(sha(path.join(stage,'native-check.cjs')),native.driverSha256);
 assert.equal(sha(path.join(stage,'analyze-native.cjs')),native.analysisSha256);
 assert.equal(sha(path.join(stage,'artifact-check.cjs')),artifact.driverSha256);
 assert.equal(sha(path.join(stage,'analyze-artifact.cjs')),artifact.analysisSha256);
 assert.equal(sha(path.join(stage,'finalize-unit-summary.cjs')),unit.summaryDriver.sha256);
 assert.equal(sha(path.join(stage,'browser-check.cjs')),browser.harnessHash);
 assert.equal(native.renderPins.candidate,audit.candidateHash);
 assert.equal(artifact.renderPins.candidate,audit.candidateHash);
 assert.equal(native.renderPins.baseline,audit.baselineHash);
 assert.equal(artifact.renderPins.baseline,audit.baselineHash);
 assert.equal(native.reusedCaptures+artifact.reusedCaptures,36);
 const baseline=fs.readFileSync(path.join(stage,'baseline-renderer.js'),'utf8');
 const candidate=fs.readFileSync(path.join(stage,'candidate-renderer.js'),'utf8');
 let inverse=candidate;for(const r of [...read(path.join(stage,'patch-manifest.json')).replacements].reverse()){assert.equal(inverse.split(r.after).length,2);inverse=inverse.replace(r.after,r.before);}assert.equal(inverse,baseline);
 const runtime=[];
 for(const prefix of ['stem_lab','desktop/web-app/public/stem_lab']){
  for(const [file,pin] of [['universe_flight_scene.js',audit.candidateHash],['stem_tool_universe.js','a744f3d2e32b5bec28864c8ee29468ec68178cd20d9bb08bcd8fa3d9eefc19a9']]){
   const target=path.join(repo,prefix,file);assert.equal(sha(target),pin);new vm.Script(fs.readFileSync(target,'utf8'),{filename:target});runtime.push({file:prefix+'/'+file,sha256:pin,syntaxPassed:true});
  }
 }
 const testHash=sha(path.join(stage,'candidate-close-disk.test.js'));assert.equal(testHash,'ed7e3572a4a3ccc5760e2edf408e10e4e9d0bfc4e67a9a135af15e580cb07276');assert.equal(sha(path.join(repo,'tests/universe_flight_close_disk.test.js')),testHash);
 assert.equal(previews.rendererHash,audit.candidateHash);
 const served=[];
 for(const file of ['stem_lab/universe_flight_scene.js','stem_lab/stem_tool_universe.js']){
  const response=await fetch('http://127.0.0.1:3187/'+file,{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const hash=crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');assert.equal(hash,sha(path.join(repo,file)));served.push({file,sha256:hash});
 }
 const gitPaths=['stem_lab/universe_flight_scene.js','desktop/web-app/public/stem_lab/universe_flight_scene.js','tests/universe_flight_close_disk.test.js'];
 execFileSync('git',['diff','--check','--',...gitPaths],{cwd:repo,stdio:['ignore','pipe','pipe'],windowsHide:true});
 const stagedPaths=execFileSync('git',['diff','--cached','--name-only'],{cwd:repo,encoding:'utf8',windowsHide:true}).trim();assert.equal(stagedPaths,'');
 const intro=`## Enhancement 58 — Entering spiral disks\n\nClose galaxy passes now fade the exterior spiral illustration within the stellar disk, revealing the existing 3D star and emission records. This removes the large gray triangles reproduced in the recorded interior view and softens the thin map line at nearby heights. The warm core and finite disk proxy remain intact.\n\n39 focused tests, four browser workflows, six scoped accessibility audits and 36 matched WebGL captures were checked. Exterior controls remain pixel exact. All twelve preview cards use the current renderer. The focused unit checks use a Node canvas/event shim; the full DOM unit suite was not run.\n\n[Model and evidence](close-disk/README.md) · [Verification](close-disk/verification.json). Changes are uncommitted.\n\n`;
 const readme=`# Entering spiral disks\n\nEnhancement 58 improves the transition from an exterior galaxy portrait into its stellar disk. The legacy spiral RGB map is flat; from some interior poses its eye-plane clipping produced two large gray triangles. The exact enhancement 57 pose reproduces that artifact, and the new full scene removes it while preserving the independently captured star field.\n\n## How the handoff works\n\nEach non-elliptical galaxy has a source frame defined by its existing turn and tilt. The observer's height and radius in that frame control a smooth fade of the flat map. It is fully suppressed within 0.012 galaxy radii of the plane and restored by 0.048 radii. These bounds are one and four vertical sigmas of the generated diffuse spiral records. Radial suppression applies through the map's existing luminous cutoff, 1.12 radii, and ends at its 1.22-radius axis extent. These are rendering bounds rather than measured galaxy parameters.\n\nThe existing six-float vertex layout carries a constant marker between 0 and 0.5. Only those marker slots change; XYZ, UV, atlas data and resolved point records stay exact. A range is uploaded only when its Float32 marker changes, using the existing buffer. Looking around, changing the lens or exposure, restoring the same position and pausing do not upload new surfaces. No graphics resources are added.\n\nThe rounded bulge and smooth disk proxy keep their existing projection and nearby fade. Ellipticals and the neighborhood keep their existing behavior. The neighborhood's analytic sky band is not used as an entered-galaxy fallback.\n\n## Validation\n\n- An independent host audit checks 298,048 finite, bounded and symmetric source-frame cases and all 89 spiral ranges. Complete atlas bytes, point records, initial geometry, projection, physics, routes and proxy helpers match enhancement 57.\n- Six native controls above or outside the handoff envelope are pixel exact, including DPR 2, an elliptical and the neighborhood. Three spiral styles, height and radial transitions, and actual beta 0.9 and 0.99 views are covered. The fast views use an aberrated chief-ray aim and contain visible emission.\n- The exact legacy pose is replayed with both the flat surface alone and the full scene. The original isolated artifact image matches its saved PNG byte for byte. The candidate isolated view has no pixel above RGB 20; the candidate full scene matches the independent clean star-field capture exactly.\n- 39 distinct focused Vitest tests pass across physics, bulges and the new close-disk file. This uses a Node canvas/event shim. Real WebGL and real DOM checks are separate.\n- Desktop, fullscreen and 320-pixel phone controls retain the paused pose and image. Six scoped accessibility audits pass. All twelve preview cards retain their authored poses and match the current renderer.\n\n## Model limits and preserved attempts\n\nThis suppresses an invalid close-range exterior illustration. Its removed light is not redistributed. The handoff is not volumetric dust transfer, a conserved-light model or a physical photometry claim. The scene still uses procedural point populations and existing display RGB Doppler styling. The special-relativity functions and journey clocks are unchanged.\n\nBoth original native comparison drivers completed their image captures, then failed a metric assertion. The first expected a large change from a direct coplanar pose that was nearly pixel exact; height-transition images exercise the fade. The replay's second assertion used an incorrect dark-clear floor. Separate frozen offline analyses validate all 36 captured PNGs without new renders. The original failed checks, drivers and images remain under evidence. Unit startup and duplicate-module test-helper failures are also preserved, together with their fixes and passing assertion results.\n\n[Host audit](evidence/audit-handoff.json) · [Native analysis](evidence/native-report/analysis.json) · [Artifact comparison](evidence/artifact-report/comparison.html) · [Focused tests](evidence/focused-unit/aggregate.json) · [Browser checks](browser/vista-browser-check.json) · [Preview cards](previews/check.json)\n\nSource and desktop mirrors are exact. Nothing was staged, committed or pushed.\n`;
 const mainPath=path.join(repo,'reports/universe-flight-2026-09-29/README.md');
 const old=fs.readFileSync(path.join(report,'preimages/main-README.md'),'utf8');assert.equal(fs.readFileSync(mainPath,'utf8'),old,'Report changed during work');assert.ok(old.startsWith('# Universe flight explorer'));
 const finalReadme=readme
  .replaceAll('independently captured star field','independently captured clean full scene')
  .replaceAll('independent clean star-field capture','independent clean full-scene capture')
  .replace('It is fully suppressed within 0.012 galaxy radii of the plane','Within the luminous footprint, the flat map is fully suppressed within 0.012 galaxy radii of the plane')
  .replace('Only those marker slots change; XYZ, UV, atlas data and resolved point records stay exact. A range is uploaded only when its Float32 marker changes, using the existing buffer.','Within the flat spiral ranges, only those marker slots change; their XYZ and UV stay exact. Atlas data and resolved point records are unchanged. A flat spiral range is uploaded only when its Float32 marker changes, using the existing buffer. Existing projected elliptical, bulge and smooth disk ranges still update when the camera position changes.')
  .replace('browser/vista-browser-check.json','vista-browser-check.json');
 fs.writeFileSync(mainPath,old.replace(/^(# Universe flight explorer\r?\n)/,'$1\n'+intro.replace('The warm core and finite disk proxy remain intact.','The rounded bulge and smooth disk proxy remain unchanged.')));fs.writeFileSync(path.join(report,'README.md'),finalReadme);
 const evidence=path.join(report,'evidence');fs.mkdirSync(evidence,{recursive:true});
 for(const entry of fs.readdirSync(stage,{withFileTypes:true})){
  if(entry.name==='unit-temp')continue;
  fs.cpSync(path.join(stage,entry.name),path.join(evidence,entry.name),{recursive:true});
 }
 const verification={completed:true,verifiedAt:new Date().toISOString(),verifierHash:sha(__filename),runtime,testHash,inversePatchExact:true,served,hostCases:audit.gate.testedGridCases,spiralRanges:audit.gate.testedMarkerWriteRanges,nativeCaptures:36,nativeOriginalMetricFailuresPreserved:true,exteriorControls:native.exactOutsideControls,distinctFocusedTests:39,distinctFocusedFiles:3,unitEnvironment:'Node canvas/event shim',fullDomUnitSuiteRun:false,browserWorkflows:4,scopedAccessibilityAudits:6,previewCards:12,previewImagesChanged:previews.views.filter(x=>!x.imageUnchanged).map(x=>x.file),gitDiffCheckPassed:true,gitIndexEmpty:true,committed:false};
 fs.writeFileSync(path.join(report,'verification.json'),JSON.stringify(verification,null,2)+'\n');
 const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name!=='evidence-manifest.json')files.push({file:path.relative(report,f).replaceAll('\\','/'),bytes:fs.statSync(f).size,sha256:sha(f)});}}walk(report);
 fs.writeFileSync(path.join(report,'evidence-manifest.json'),JSON.stringify({completed:true,createdAt:new Date().toISOString(),files},null,2)+'\n');console.log(JSON.stringify(verification));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
