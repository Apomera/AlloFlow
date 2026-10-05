// Run serial checks with the bundled Node 24.19.0. --prepare records the untouched prior evidence.
const fs=require('node:fs'), path=require('node:path'), cp=require('node:child_process'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'), report=__dirname;
const sourcePin = '90d7922145112ef4c87b0f84c579cc413ed9fa5aa0b2d33a04386dcd9ceacd4b';
const baselineCommit = '54d638b3213b0fbd484305feff43b769da8902f7';
const baselineUnitsPath = 'reports/physics-point-clarity-2026-10-02/unit-results.json';
const baselineUnitsPin = '66e71b4c8a86d614661b9a83c025f540e45c0f5dbb2253f7b3e1f7730b05224d';
const testPins = {
  "tests/e2e/physics-canvas-callouts.spec.ts": "bec3b5fba4c000d156c07f31c4fefff83b790da25a2222cf85ca36b17e7a1531",
  "tests/e2e/physics-plot-inspection.spec.ts": "738cd149367530fdc44e4ef568f89ffecaba982f8700c999c35851272ec5436e",
  "tests/e2e/physics-trail-identity.spec.ts": "631a884fe9601edaa3c743255e0741cb702987b88847bc127021d601a1dcab5a",
  "tests/e2e/physics-visual-layout.spec.ts": "fdf29af0b0db3170c4b0e2f9fac229ed3ab6579f4011d8ad759bfac78d954fb7",
  "tests/e2e/physics-flight-history.spec.ts": "3f2c263dad510a0b8f35fd280c1f4f516bc0a65f9c92da08c4d82b2efeb66916",
  "tests/e2e/physics-apex-inspection.spec.ts": "bb44609f54a80f3411ffd55c67bc46f840ac8d8a8d56337786d83157d585aba6",
  "tests/e2e/physics-velocity-clarity.spec.ts": "76b73adcdb17eafc1653503dcb5ed6b2467b73a7bf94caff4d08d7bd3306dbf1"
};
const historicalDirectories = {'physics-recorded-flights-2026-10-02':10,'physics-recorded-context-2026-10-02':11,'physics-velocity-clarity-2026-10-02':10,'physics-point-clarity-2026-10-02':20};
const previousReport = 'reports/physics-trail-identity-2026-10-02';
const completedInspectionReport = 'reports/physics-plot-inspection-2026-10-04';
const completedInspectionInventoryPin = '1bd29c24c413bfa4ef1eed9a3d2194a69b0b14ccf14c198cb76e98aec2b1186d';
const blankCanvasPin = 'f63547f191e63cc98187486da98c40a8e068c1756c790d4b02c7928327d64303';
const blankCanvasSource = completedInspectionReport + '/before-canvas-capture-fix/moment-focus-default-320.png';
const blankCanvasFixture = 'inspection-regression/before-canvas-capture-fix/moment-focus-default-320.png';
const stages = {
  unit: {count:356, files:null, result:'unit-results.json'},
  callouts: {count:5, files:['physics-canvas-callouts.spec.ts'], result:'callout-results.json'},
  inspection: {count:5, files:['physics-plot-inspection.spec.ts'], result:'inspection-results.json', visual:'inspection-regression'},
  trail: {count:4, files:['physics-trail-identity.spec.ts'], result:'trail-results.json', visual:'trail-regression'},
  regression: {count:15, files:['physics-visual-layout.spec.ts','physics-flight-history.spec.ts','physics-apex-inspection.spec.ts'], result:'regression-results.json', visual:'regression'},
  point: {count:6, files:['physics-velocity-clarity.spec.ts'], result:'point-results.json', visual:'point-regression'}
};
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(root, file).replace(/\\/g, '/');
function prefix(value) {
  const normalized = value.toString('utf8').replace(/\r\n/g, '\n'), marker = "window.StemLab.registerTool('physics',";
  assert(normalized.includes(marker), 'Physics registration boundary missing');
  return normalized.split(marker)[0];
}
function baselineUnitFiles() {
  const bytes = fs.readFileSync(path.join(root, baselineUnitsPath));
  assert.equal(digest(bytes), baselineUnitsPin, 'Prior complete unit identity report changed');
  return JSON.parse(bytes).testResults.map(item => relative(path.resolve(root, item.name))).sort();
}
function legacyProtectedFiles() {
  const values = [];
  function add(directory, select, category) {
    const absolute = path.join(root, directory);
    for (const entry of fs.readdirSync(absolute, {withFileTypes:true})) {
      if (!entry.isFile() || !select(entry.name)) continue;
      const file = directory + '/' + entry.name;
      values.push({path:file, category, sha256:digest(fs.readFileSync(path.join(root, file)))});
    }
  }
  for (const [name, count] of Object.entries(historicalDirectories)) {
    const before = values.length;
    add('reports/' + name, file => file === 'visual-results.json' || file.endsWith('.png'), 'prior-visuals');
    assert.equal(values.length - before, count, 'Prior visual artifact count: ' + name);
  }
  for (const suffix of ['', '/point-regression', '/gradient-negative-control'])
    add(previousReport + suffix, () => true, 'completed-trail-report');
  values.sort((a,b) => a.path.localeCompare(b.path));
  assert.equal(new Set(values.map(item => item.path)).size, values.length, 'Duplicate protected file');
  assert.equal(values.length,122,'All 122 designated prior files must be present before preparation');
  assert.equal(values.filter(item=>item.category==='completed-trail-report').length,71,'All 71 completed trail report files must be preserved');
  const anchorPath=path.join(root,"reports/physics-plot-inspection-2026-10-04/before-history-heading-fix/preservation-baseline.json"),anchorBytes=fs.readFileSync(anchorPath);
  assert.equal(digest(anchorBytes),"7d7360603a5deb0efb720879976fe0c27b84ac69a872fd439c7bf485192576c1",'Original preserved-file anchor changed');
  assert.deepEqual(values,JSON.parse(anchorBytes).historical,'Prior files must match the original pinned inventory');
  return values;
}
function protectedFiles() {
  const values = legacyProtectedFiles(), inspection = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true})) {
      const file=directory+'/'+entry.name;
      if(entry.isDirectory())walk(file);
      else if(entry.isFile())inspection.push({path:file,category:'completed-inspection-report',sha256:digest(fs.readFileSync(path.join(root,file)))});
      else assert.fail('Unsupported historical file entry: '+file);
    }
  }
  walk(completedInspectionReport);inspection.sort((a,b)=>a.path.localeCompare(b.path));
  // Retain the original 478-file anchor and separately preserve the sole discovery addition.
  const addedPath=completedInspectionReport+'/playwright-report/index.html', added=inspection.find(item=>item.path===addedPath), original=inspection.filter(item=>item.path!==addedPath);
  assert.equal(original.length,478,'Every original completed inspection report file and archive must remain present');
  assert.equal(digest(Buffer.from(JSON.stringify(original))),completedInspectionInventoryPin,'The original 478 inspection files changed');
  assert(added,'The HTML report produced during discovery must also be preserved');
  assert.equal(added.sha256,'37ca34b753231779951ee24377f5810a4946b9a45a13c18ef20da82bddd7aba6','Discovery HTML bytes changed');
  assert.equal(inspection.length,479,'Every completed inspection file plus the discovery addition must remain present');
  assert.equal(digest(Buffer.from(JSON.stringify(inspection))),'14011d3202da09e990402973ae903ddffee39eb8c020721255d3f69c5750fd48','Expanded inspection inventory changed');
  values.push(...inspection);values.sort((a,b)=>a.path.localeCompare(b.path));
  assert.equal(new Set(values.map(item=>item.path)).size,values.length,'Duplicate historical path');
  assert.equal(values.length,601,'All original 600 files and the pinned discovery HTML must be present');
  return values;
}
function fixtureSnapshot() {
  const source=fs.readFileSync(path.join(root,blankCanvasSource)), fixture=fs.readFileSync(path.join(report,blankCanvasFixture));
  assert.equal(digest(source),blankCanvasPin,'Archived blank canvas source changed');
  assert.equal(digest(fixture),blankCanvasPin,'Prepared blank canvas input changed');
  return {[relative(path.join(report,blankCanvasFixture))]:blankCanvasPin};
}
function visualArtifacts(name){
  const files=[];
  if(name==='callouts'){
    files.push('visual-results.json');
    for(const theme of ['default','dark','contrast'])for(const width of [1100,375,320])for(const phase of ['launch','apex','impact'])files.push('callout-'+theme+'-'+width+'-'+phase+'.png');
    for(const name of ['horizontal-release','horizontal-impact','drag-launch','drag-apex','drag-impact','unfinished-latest','dense-overlays','dense-long-token'])files.push(name+'.png');
  }
  if(name==='inspection'){
    files.push('inspection-regression/visual-results.json','inspection-regression/canvas-capture-negative-control.json');
    for(const theme of ['default','dark','contrast'])for(const width of [1100,375,320])for(const prefix of ['plot-inspection','moment-focus','swatch-selected'])files.push('inspection-regression/'+prefix+'-'+theme+'-'+width+'.png');
  }
  if(name==='trail'){
    files.push('trail-regression/visual-results.json','trail-regression/gradient-negative-control/evidence.json','trail-regression/gradient-negative-control/old-object-bounding-box.png');
    for(const theme of ['default','dark','contrast'])for(const width of [1100,375,320])for(const file of ['trails-'+theme+'-'+width+'.png','contrast-'+theme+'-'+width+'.json','swatch-focus-'+theme+'-'+width+'.png','swatch-focus-'+theme+'-'+width+'.json'])files.push('trail-regression/'+file);
  }
  if(name==='point')files.push(...['visual-results.json','selected-launch.png','selected-rising.png','selected-apex.png','selected-near-apex.png','selected-falling.png','selected-impact.png','selected-after-six-control-changes.png','horizontal-release-unresolved.png','horizontal-release-canonical-apex.png','unfinished-highest-rising.png',...['default','dark','contrast'].flatMap(theme=>[1100,375,320].map(width=>'velocity-'+theme+'-'+width+'.png'))].map(file=>'point-regression/'+file));
  return files.map(file=>path.join(report,file)).sort();
}
function snapshot() {
  const files = ['stem_lab/stem_tool_physics.js','desktop/web-app/public/stem_lab/stem_tool_physics.js',...baselineUnitFiles(),...Object.keys(testPins),relative(path.join(report,'source-before-callouts.js')),'playwright.config.ts','tests/e2e/helpers/stem_gl_harness.ts','tests/e2e/helpers/png_pixels.ts',relative(path.join(report,'run-checks.cjs')),relative(path.join(report,'playwright.config.ts'))];
  const hashes = Object.fromEntries(files.map(file => [file,digest(fs.readFileSync(path.join(root,file)))]));
  assert.equal(hashes[files[0]], sourcePin, 'Source differs from final pin');
  assert.equal(hashes[files[1]], sourcePin, 'Desktop copy differs from final pin');
  for (const [file,pin] of Object.entries(testPins)) assert.equal(hashes[file],pin,'Browser spec differs from final pin: '+file);
  assert.equal(hashes[relative(path.join(report,'source-before-callouts.js'))],'0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28','Before-source snapshot changed');
  return {sourceSha256:hashes[files[0]],mirrorSha256:hashes[files[1]],modelPrefixSha256:digest(prefix(fs.readFileSync(path.join(root,files[0])))),fileHashes:hashes,fixtures:fixtureSnapshot()};
}
function atomicJson(file, value) {
  const temporary = file + '.tmp-' + process.pid;
  try { fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n'); fs.renameSync(temporary,file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

process.chdir(root);
assert.equal(process.version,'v24.19.0','Use the bundled primary Node 24.19.0 runtime');
assert.match(sourcePin,/^[a-f0-9]{64}$/,'Final source pin has not been supplied');
for (const pin of Object.values(testPins)) assert.match(pin,/^[a-f0-9]{64}$/,'Final test pin has not been supplied');
const original=cp.execFileSync('git',['show',baselineCommit+':stem_lab/stem_tool_physics.js'],{cwd:root,windowsHide:true,maxBuffer:16*1024*1024});
assert.equal(prefix(fs.readFileSync(path.join(root,'stem_lab/stem_tool_physics.js'))),prefix(original),'Numerical or recording prefix changed');
const manifestPath=path.join(report,'preservation-baseline.json'), integrityPath=path.join(report,'check-integrity.json');
// Validate protected history and current source before preparing any report input.
const historical=protectedFiles();
for(const file of ['stem_lab/stem_tool_physics.js','desktop/web-app/public/stem_lab/stem_tool_physics.js'])assert.equal(digest(fs.readFileSync(path.join(root,file))),sourcePin,'Current source differs from final pin');
for(const [file,pin] of Object.entries(testPins))assert.equal(digest(fs.readFileSync(path.join(root,file))),pin,'Current browser spec differs from final pin: '+file);
// This byte-identical archived blank is an explicit test input, never a fresh result.
const fixturePath=path.join(report,blankCanvasFixture), fixtureSource=path.join(root,blankCanvasSource);
assert.equal(digest(fs.readFileSync(fixtureSource)),blankCanvasPin,'Archived blank fixture source changed');
if(!fs.existsSync(fixturePath)){
  assert(!fs.existsSync(manifestPath),'Missing prepared fixture cannot be silently recreated');
  fs.mkdirSync(path.dirname(fixturePath),{recursive:true});fs.copyFileSync(fixtureSource,fixturePath,fs.constants.COPYFILE_EXCL);
}
const initial=snapshot();
if (!fs.existsSync(manifestPath)) atomicJson(manifestPath,{schemaVersion:1,sourceSha256:sourcePin,testPins,baselineCommit,preparedAt:new Date().toISOString(),snapshot:initial,historicalFilesPreserved:historical.length,historical});
const manifest=JSON.parse(fs.readFileSync(manifestPath));
assert.equal(manifest.sourceSha256,sourcePin,'Prepared source version changed');
assert.deepEqual(manifest.testPins,testPins,'Prepared browser pins changed');
assert.deepEqual(manifest.snapshot,initial,'Prepared source or test bytes changed');
assert.deepEqual(manifest.historical,historical,'Prior evidence changed since preparation');
const integrity=fs.existsSync(integrityPath)?JSON.parse(fs.readFileSync(integrityPath)):{schemaVersion:1,sourceSha256:sourcePin,baselineCommit,testPins,manifestSha256:digest(fs.readFileSync(manifestPath)),historicalFilesPreserved:historical.length,historical,stages:{}};
assert.equal(integrity.sourceSha256,sourcePin,'Existing check report describes another source');
assert.equal(integrity.manifestSha256,digest(fs.readFileSync(manifestPath)),'Preparation manifest changed');
function preserve() {
  const final=snapshot();
  assert.deepEqual(final,initial,'Source, mirror, or tests changed during checks');
  assert.deepEqual(protectedFiles(),manifest.historical,'Prior evidence changed during checks');
  integrity.sourceUnchanged=true; integrity.mirrorMatches=true; integrity.testsUnchanged=true; integrity.modelPrefixUnchanged=true;
  integrity.finalSnapshot=final; integrity.updatedAt=new Date().toISOString(); atomicJson(integrityPath,integrity);
}
function runStage(name) {
  const stage=stages[name], resultPath=path.join(report,stage.result), before=snapshot(), startedAt=new Date().toISOString();
  assert(!fs.existsSync(resultPath),'Existing actual suite result must be archived before rerunning '+name);
  for(const file of visualArtifacts(name))assert(!fs.existsSync(file),'Existing visual output must be archived before rerunning: '+relative(file));
  const runId=crypto.randomUUID(), record={runId,startedAt,status:'running',before,nodeExecutable:process.execPath,nodeVersion:process.version,resultPath:relative(resultPath)};
  (integrity.stages[name] ||= []).push(record); atomicJson(integrityPath,integrity);
  let args, env={...process.env};
  if (name==='unit') args=['node_modules/vitest/vitest.mjs','run','tests/physics','--maxWorkers=1','--pool=threads','--no-file-parallelism','--testTimeout=30000','--hookTimeout=30000','--reporter=default','--reporter=json','--outputFile='+relative(resultPath)];
  else {
    const visualDirectory=stage.visual?path.join(report,stage.visual):report; fs.mkdirSync(visualDirectory,{recursive:true});
    args=['node_modules/@playwright/test/cli.js','test',...stage.files.map(file=>'tests/e2e/'+file),'--config='+relative(path.join(report,'playwright.config.ts')),'--workers=1','--retries=0','--max-failures=1','--reporter=list,json','--output='+relative(path.join(report,name+'-artifacts'))];
    env={...env,PLAYWRIGHT_JSON_OUTPUT_FILE:resultPath,PHYSICS_VISUAL_REPORT_DIR:visualDirectory,PLAYWRIGHT_HTML_OUTPUT_DIR:path.join(report,name+'-html'),NODE_OPTIONS:[process.env.NODE_OPTIONS,'--max-semi-space-size=4','--max-old-space-size=384'].filter(Boolean).join(' ')};
  }
  record.command=[process.execPath,...args]; atomicJson(integrityPath,integrity);
  const result=cp.spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env,windowsHide:true});
  record.completedAt=new Date().toISOString(); record.durationMs=Date.parse(record.completedAt)-Date.parse(startedAt); record.exitCode=result.status;
  record.after=snapshot(); assert.deepEqual(record.after,before,'Source or tests changed during '+name);
  if (fs.existsSync(resultPath)) {
    const resultBytes=fs.readFileSync(resultPath), actual=JSON.parse(resultBytes);
    const resultStarted=name==='unit'?actual.startTime:Date.parse(actual.stats.startTime);
    assert(Number.isFinite(resultStarted)&&resultStarted>=Date.parse(startedAt)&&resultStarted<=Date.parse(record.completedAt),'Result was not produced during this stage: '+name);
    assert(fs.statSync(resultPath).mtimeMs>=Date.parse(startedAt),'Suite JSON must be freshly written');record.resultSha256=digest(resultBytes); record.resultBytes=resultBytes.length;record.resultModifiedAt=fs.statSync(resultPath).mtimeMs;
  }
  record.visualArtifacts={};
  if(!result.error&&result.status===0)for(const file of visualArtifacts(name)){
    assert(fs.existsSync(file),'Successful stage missed a required visual output: '+relative(file));
    const stat=fs.statSync(file);assert(stat.isFile());assert(stat.mtimeMs>=Date.parse(startedAt),'Visual output must be produced by this stage: '+relative(file));
    record.visualArtifacts[relative(file)]={sha256:digest(fs.readFileSync(file)),bytes:stat.size,modifiedAt:stat.mtimeMs};
  }
  record.status=result.error||result.status!==0?'failed':'passed';
  if (result.error) record.error=result.error.message;
  preserve();
  if (result.error) throw result.error;
  assert.equal(result.status,0,'Check failed: '+name);
  assert(record.resultSha256,'Successful stage did not emit actual JSON results: '+name);
}
const chosen=process.argv.slice(2), allowed=new Set(['--prepare',...Object.keys(stages).map(name=>'--'+name)]);
for (const flag of chosen) assert(allowed.has(flag),'Unknown check flag: '+flag);
try { for (const name of Object.keys(stages)) if(chosen.length===0||chosen.includes('--'+name)) runStage(name); }
finally { preserve(); }
console.log('Pinned source and tests stable; '+historical.length+' protected prior files unchanged.');
