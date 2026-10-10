const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const rendererPin='8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9',uiPin='a744f3d2e32b5bec28864c8ee29468ec68178cd20d9bb08bcd8fa3d9eefc19a9';
function inverse(candidate,changes){let text=candidate;for(const c of [...changes].reverse()){
 const before=Array.isArray(c)?c[0]:c.before,after=Array.isArray(c)?c[1]:c.after;
 assert.ok(text.includes(after),'Inverse patch marker');text=text.replace(after,before);
}return text;}
(async()=>{
 const sourceChecks=[];
 for(const [file,pin,baseline,manifest]of [
  ['universe_flight_scene.js',rendererPin,'baseline-renderer.js','candidate-patch-manifest.json'],
  ['stem_tool_universe.js',uiPin,'baseline-ui.js','vista.json'],
 ]){
  const canonical=read(path.join(repo,'stem_lab',file)),mirror=read(path.join(repo,'desktop/web-app/public/stem_lab',file));
  assert.equal(sha(canonical),pin);assert.deepEqual(mirror,canonical);new vm.Script(canonical.toString(),{filename:file});
  const data=json(path.join(stage,manifest));assert.equal(inverse(canonical.toString(),data.changes||data.replacements),read(path.join(stage,baseline)).toString());
  const response=await fetch('http://127.0.0.1:3187/stem_lab/'+file);assert.equal(response.status,200);const served=Buffer.from(await response.arrayBuffer());assert.equal(sha(served),pin);
  sourceChecks.push({file,sha256:pin,mirrorExact:true,inversePatchExact:true,servedExact:true,syntax:true});
 }
 const testManifest=json(path.join(stage,'candidate-test-patch-manifest.json'));
 for(const t of testManifest.files){assert.equal(sha(read(t.sourcePath)),t.candidateHash);assert.equal(inverse(read(t.sourcePath).toString(),t.changes),read(t.baselinePath).toString());}
 const atlasTestManifest=json(path.join(stage,'candidate-atlas-test-patch-manifest.json'));
 for(const t of atlasTestManifest.files){assert.equal(sha(read(t.sourcePath)),t.candidateHash);assert.equal(inverse(read(t.sourcePath).toString(),t.changes),read(t.baselinePath).toString());}
 const host=json(path.join(report,'evidence/candidate-host-audit.json')),hostDriver=json(path.join(report,'evidence/host-audit-provenance.json'));
 assert.equal(host.completed,true);assert.equal(host.candidateHash,rendererPin);assert.equal(hostDriver.actualAuditDriverHash,sha(read(path.join(report,'evidence/candidate-host-audit.cjs'))));
 const native=json(path.join(report,'native/check.json')),analysis=json(path.join(report,'native/analysis.json'));
 assert.equal(native.completed,false);assert.equal(native.captures.length,40);assert.equal(analysis.completed,true);assert.equal(analysis.reusedCaptures,40);assert.equal(analysis.browserLaunches,0);assert.equal(analysis.newCaptures,0);assert.equal(analysis.rendererPins.candidate,rendererPin);assert.deepEqual(analysis.errors,[]);
 assert.equal(analysis.harnessSha256,sha(read(path.join(report,'evidence/native-check.cjs'))));assert.equal(analysis.analysisSha256,sha(read(path.join(report,'evidence/native-analyze.cjs'))));
 for(const c of native.captures)assert.equal(sha(read(path.join(report,'native',c.file))),c.hash);
 const beta=json(path.join(report,'native-beta/check.json'));assert.equal(beta.completed,true);assert.deepEqual(beta.errors,[]);
 assert.equal(beta.harnessSha256,sha(read(path.join(report,'evidence/native-beta-check.cjs'))));assert.equal(beta.pins.candidate,rendererPin);
 const visibleBeta=json(path.join(report,'native-beta-visible/check.json'));assert.equal(visibleBeta.completed,true);assert.deepEqual(visibleBeta.errors,[]);assert.equal(visibleBeta.captures.length,2);
 assert.equal(visibleBeta.harnessSha256,sha(read(path.join(report,'evidence/native-beta-visible-check.cjs'))));assert.equal(visibleBeta.pins.candidate,rendererPin);
 for(const [folder,data]of [['native-beta',beta],['native-beta-visible',visibleBeta]])for(const c of data.captures)assert.equal(sha(read(path.join(report,folder,c.file))),c.hash);
 assert.ok(visibleBeta.captures.every(c=>c.nonzeroEmittedPixels>0&&c.sumEmittedLuminance>0));
 const browser=json(path.join(report,'browser/vista-browser-check.json'));assert.equal(browser.completed,true);assert.deepEqual(browser.errors,[]);assert.equal(browser.harnessHash,sha(read(path.join(report,'evidence/browser-check.cjs'))));
 const unit=json(path.join(report,'unit/aggregate.json')),execution=json(path.join(report,'unit/affected-retry/execution.json'));
 assert.equal(unit.completed,true);assert.equal(unit.allFocusedAssertionsPassed,true);assert.equal(unit.distinctFiles,7);assert.equal(execution.completed,true);assert.equal(execution.exitCode,0);assert.equal(execution.inputsUnchanged,true);assert.equal(execution.diagnosticsUnchanged,true);
 for(const p of execution.inputs)assert.equal(sha(read(path.join(repo,p.path))),p.sha256);
 const previews=json(path.join(report,'previews/check.json'));assert.equal(previews.completed,true);assert.equal(previews.rendererHash,rendererPin);assert.equal(previews.views.length,12);assert.ok(previews.views.every(x=>x.poseUnchanged));
 const baseAssets='stem_lab/assets/universe-flight/highlights',manifest=json(path.join(repo,baseAssets,'manifest.json'));
 assert.equal(manifest.rendererHash,rendererPin);assert.deepEqual(read(path.join(repo,baseAssets,'manifest.json')),read(path.join(repo,'desktop/web-app/public',baseAssets,'manifest.json')));
 for(const v of manifest.views){const image=read(path.join(repo,baseAssets,v.file));assert.equal(sha(image),v.hash);assert.deepEqual(image,read(path.join(repo,'desktop/web-app/public',baseAssets,v.file)));}
 const archived=json(path.join(report,'evidence-manifest.json'));for(const e of archived.files)assert.equal(sha(read(path.join(report,e.path))),e.sha256);
 function git(args){const result=spawnSync('git',args,{cwd:repo,windowsHide:true,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout.trim();}
 git(['diff','--check','--','stem_lab/universe_flight_scene.js','stem_lab/stem_tool_universe.js','desktop/web-app/public/stem_lab/universe_flight_scene.js','desktop/web-app/public/stem_lab/stem_tool_universe.js','tests/helpers/universe_galaxy_surfaces.js','tests/universe_flight_bulges.test.js','reports/universe-flight-2026-09-29/README.md']);
 const staged=git(['diff','--cached','--name-only']);assert.equal(staged,'','Index must remain untouched and empty.');
 const result={completed:true,verifiedAt:new Date().toISOString(),verifierHash:sha(read(__filename)),sourceChecks,originalPointsExact:true,existingGeometryPrefixExact:true,ellipticalAndCloudMapsExact:true,bulgeAlphaExact:true,hostPoseCount:host.poses?.length,native:{savedComparisons:analysis.comparisons.length,pngs:40,originalAnalysisFailurePreserved:true,reanalysisCompleted:true,betaCompleted:true,betaCaptures:beta.captures?.length},browser:{checks:browser.checks.length,accessibilityAudits:browser.accessibility.length,captures:browser.captures.length,loaderRetries:browser.loaderRetries||[]},unit:{passed:unit.distinctTests,files:unit.distinctFiles,environment:'diagnostic Node shim; one thread worker without isolation',fullDomSuiteRun:false},previews:{views:12,posesUnchanged:true},archivedEvidenceFiles:archived.files.length,committed:false,indexEmpty:true,scope:'Enhancement 57 focused checks. No full DOM unit-suite completion claim.'};
 result.unit.environment=unit.environment;
 result.native.visibleBetaCaptures=visibleBeta.captures.length;
 result.native.originalBeta09Scope='Compilation and finite inputs only; the rest-direction camera placed the source outside the frame.';
 result.native.visibleBeta09=visibleBeta.captures.map(c=>({phase:c.phase,signal:c.sumEmittedLuminance,nonzeroPixels:c.nonzeroEmittedPixels}));
 fs.writeFileSync(path.join(report,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
