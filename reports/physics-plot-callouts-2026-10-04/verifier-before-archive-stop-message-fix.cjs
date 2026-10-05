// Read-only audit of actual suite JSON, source pins, raster evidence, and preserved prior reports.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),report=__dirname;
const sourcePin = '90d7922145112ef4c87b0f84c579cc413ed9fa5aa0b2d33a04386dcd9ceacd4b';
const baselineCommit = '54d638b3213b0fbd484305feff43b769da8902f7';
const baselineUnitsPath = 'reports/physics-point-clarity-2026-10-02/unit-results.json';
const baselineUnitsPin = '66e71b4c8a86d614661b9a83c025f540e45c0f5dbb2253f7b3e1f7730b05224d';
const testPins = {
  "tests/e2e/physics-canvas-callouts.spec.ts": "bec3b5fba4c000d156c07f31c4fefff83b790da25a2222cf85ca36b17e7a1531",
  "tests/e2e/physics-plot-inspection.spec.ts": "738cd149367530fdc44e4ef568f89ffecaba982f8700c999c35851272ec5436e",
  "tests/e2e/physics-trail-identity.spec.ts": "631a884fe9601edaa3c743255e0741cb702987b88847bc127021d601a1dcab5a",
  "tests/e2e/physics-visual-layout.spec.ts": "42e02b73837a8a1f2509dcb67453cc1d3a3c896c6141ff1e7cd4021c3544d5a8",
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

const failures=[],missing=new Set(),checks=[],dependencies={},screenshots=new Map(),diagnosticScreenshots=new Map(),browserFiles=new Set();
const summary={unitTests:0,unitFiles:0,browserTests:0,browserSuites:{},visualReports:{},historicalFilesPreserved:0};
function readBytes(file){if(!fs.existsSync(file)){missing.add(relative(file));return null;}return fs.readFileSync(file);}
function readJson(file){const bytes=readBytes(file);return bytes?JSON.parse(bytes.toString('utf8')):null;}
function dependency(file,pin){const bytes=readBytes(path.join(root,file));if(!bytes)return null;dependencies[file]=digest(bytes);if(pin)assert.equal(dependencies[file],pin,'Pinned file changed: '+file);return bytes;}
function check(name,action){const before=missing.size;try{action();checks.push({name,status:missing.size===before?'passed':'incomplete'});}catch(error){failures.push({check:name,message:error.message});checks.push({name,status:'failed'});}}
function finiteAtLeast(value,floor,label){assert(Number.isFinite(value),label+' must be finite');assert(value>=floor,label+' below '+floor+': '+value);}
function png(file,collection=screenshots){const bytes=readBytes(file);if(!bytes)return;assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Invalid PNG: '+relative(file));const raster=screenshotPixels(file);assert(raster&&raster.width>0&&raster.height>0,'Every registered PNG must decode to a nonzero raster');collection.set(relative(file),digest(bytes));}
const combinations=[];for(const width of [1100,375,320])for(const theme of ['default','dark','contrast'])combinations.push(theme+'/'+width);
let source,integrity,manifest;
check('Pinned source, mirror, seven browser specs and numerical/recording prefix',()=>{
  assert.match(sourcePin,/^[a-f0-9]{64}$/,'Final source pin missing');source=dependency('stem_lab/stem_tool_physics.js',sourcePin);
  const mirror=dependency('desktop/web-app/public/stem_lab/stem_tool_physics.js',sourcePin);if(source&&mirror)assert(source.equals(mirror));
  for(const[file,pin]of Object.entries(testPins)){assert.match(pin,/^[a-f0-9]{64}$/,'Final test pin missing');dependency(file,pin);}
  if(source){new Function(source.toString('utf8'));const prior=cp.execFileSync('git',['show',baselineCommit+':stem_lab/stem_tool_physics.js'],{cwd:root,windowsHide:true,maxBuffer:16*1024*1024});assert.equal(prefix(source),prefix(prior),'Numerical/recording prefix changed');}
});
check('Callout enhancement source proof and retained English catalog labels',()=>{
  const file=relative(path.join(report,'enhancement-integrity.json')),bytes=dependency(file);if(!bytes||!source)return;
  const evidence=JSON.parse(bytes);assert.equal(evidence.beforeSha256,'0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28');assert.equal(evidence.sourceSha256,sourcePin);
  for(const key of ['mirrorMatches','modelPrefixUnchanged','calloutLayoutImproved','oversizedGraphemeGuard','connectorOutline','outlineProtectsPointAndVectors','distinctClampedFallbackStops','launcherExcludesAxisTickGlyphs','comparisonReadoutPrefersHigherPosition'])assert.equal(evidence[key],true,key);assert.equal(evidence.outlineCapClearance,3);assert.equal(evidence.connectorPairClearance,4);assert.equal(evidence.candidateLimit,116);assert.equal(evidence.candidateLimitPerWidth,58);assert.equal(evidence.selectedWidthAttempts,2);assert.equal(evidence.selectedNarrowWidthFraction,.55);assert.equal(evidence.selectedCrosshairForegroundClearance,2);assert.equal(evidence.axisTickPadding,2);assert.equal(evidence.recordedRouteLabelPriority,-.5);assert.equal(evidence.selectedLabelPriority,-1);assert.equal(evidence.recordedRouteWidthAttempts,2);assert.equal(evidence.cardEdgeStopClearance,6);assert.equal(evidence.markerEdgeStopClearance,10);
  const before=dependency(relative(path.join(report,'source-before-callouts.js')),'0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28');if(!before)return;const boundary=Buffer.from("window.StemLab.registerTool('physics',");assert(source.indexOf(boundary)>=0&&before.indexOf(boundary)>=0);assert(source.subarray(0,source.indexOf(boundary)).equals(before.subarray(0,before.indexOf(boundary))),'Enhancement changed numerical or recording bytes');
  const labels={plot_choose_flight:'Choose a flight to pause and inspect its recorded points.',plot_inspect_point:'Inspect a recorded point',plot_view_analysis:'View flight analysis',plot_return_current:'Return to current flight',plot_return_latest:'Return to latest flight'};
  for(const catalogFile of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){const catalogBytes=dependency(catalogFile);if(!catalogBytes)return;const catalog=JSON.parse(catalogBytes).stem.physics;for(const[key,value]of Object.entries(labels))assert.equal(catalog[key],value,catalogFile+': '+key);}
  summary.enhancementIntegrity=evidence;summary.catalogKeys=Object.keys(labels);
});
check('Suite integrity binds current source, all test bytes, and actual result JSON',()=>{
  integrity=readJson(path.join(report,'check-integrity.json'));manifest=readJson(path.join(report,'preservation-baseline.json'));if(!integrity||!manifest)return;
  dependency(relative(path.join(report,'check-integrity.json')));dependency(relative(path.join(report,'preservation-baseline.json')));
  assert.equal(integrity.sourceSha256,sourcePin);assert.equal(manifest.sourceSha256,sourcePin);assert.deepEqual(integrity.testPins,testPins);assert.deepEqual(manifest.testPins,testPins);
  assert.equal(integrity.manifestSha256,digest(fs.readFileSync(path.join(report,'preservation-baseline.json'))));
  for(const key of ['sourceUnchanged','mirrorMatches','testsUnchanged','modelPrefixUnchanged'])assert.equal(integrity[key],true,key);
  const current=snapshot();assert.deepEqual(manifest.snapshot,current);assert.deepEqual(integrity.finalSnapshot,current);
  for(const[name,stage]of Object.entries(stages)){
    const attempts=integrity.stages[name];assert(Array.isArray(attempts)&&attempts.length===1,'Each final stage needs exactly one actual invocation: '+name);
    const record=attempts[attempts.length-1];assert.equal(record.status,'passed',name+' latest stage failed');assert.equal(record.exitCode,0);assert.equal(record.nodeVersion,'v24.19.0');
    assert.deepEqual(record.before,current);assert.deepEqual(record.after,current);assert.equal(record.resultPath,relative(path.join(report,stage.result)));
    assert.equal(typeof record.nodeExecutable,'string');assert.equal(record.command[0],record.nodeExecutable);assert(Number.isFinite(Date.parse(record.startedAt))&&Number.isFinite(Date.parse(record.completedAt))&&Date.parse(record.completedAt)>=Date.parse(record.startedAt),'Actual stage chronology');
    const expectedArguments=name==='unit'
      ?['node_modules/vitest/vitest.mjs','run','tests/physics','--maxWorkers=1','--pool=threads','--no-file-parallelism','--testTimeout=30000','--hookTimeout=30000','--reporter=default','--reporter=json','--outputFile='+relative(path.join(report,stage.result))]
      :['node_modules/@playwright/test/cli.js','test',...stage.files.map(file=>'tests/e2e/'+file),'--config='+relative(path.join(report,'playwright.config.ts')),'--workers=1','--retries=0','--max-failures=1','--reporter=list,json','--output='+relative(path.join(report,name+'-artifacts'))];
    assert.deepEqual(record.command.slice(1),expectedArguments,'Actual command must retain spec list, budgets, one worker and no retries');
    const sequence=Object.keys(stages),previous=sequence[sequence.indexOf(name)-1];if(previous)assert(Date.parse(record.startedAt)>=Date.parse(integrity.stages[previous][0].completedAt),'Heavy stages must run serially');

    const bytes=dependency(record.resultPath,record.resultSha256);if(!bytes)continue;assert.equal(record.resultBytes,bytes.length);assert(record.resultModifiedAt>=Date.parse(record.startedAt),'Actual suite JSON freshness');assert.equal(fs.statSync(path.join(root,record.resultPath)).mtimeMs,record.resultModifiedAt,'Actual suite JSON modified since stage');
    const actual=JSON.parse(bytes),start=name==='unit'?actual.startTime:Date.parse(actual.stats.startTime);
    assert(start>=Date.parse(record.startedAt)&&start<=Date.parse(record.completedAt),'Actual stage start binding: '+name);
    const expectedVisuals=visualArtifacts(name).map(relative);assert(record.visualArtifacts&&typeof record.visualArtifacts==='object','Stage visual binding missing');assert.deepEqual(Object.keys(record.visualArtifacts).sort(),expectedVisuals.sort(),'Every visual output must be bound to its producing stage');
    for(const file of expectedVisuals){const proof=record.visualArtifacts[file],artifact=dependency(file,proof.sha256);if(!artifact)continue;assert.equal(artifact.length,proof.bytes);assert(proof.modifiedAt>=Date.parse(record.startedAt),'Visual output predates producing stage');assert.equal(fs.statSync(path.join(root,file)).mtimeMs,proof.modifiedAt,'Visual output modified since producing stage');}
    assert.match(record.runId,/^[a-f0-9-]{36}$/);assert(Number.isFinite(record.durationMs)&&record.durationMs>=0);
  }
});
function identities(result,label){
  const files=new Map(),tests=new Map();assert(Array.isArray(result.testResults));
  for(const fileResult of result.testResults){const file=relative(path.resolve(root,fileResult.name));assert(/^tests\/physics(?:_|\/)[\w/.-]+\.test\.[cm]?[jt]sx?$/.test(file),'Unexpected unit file: '+file);assert(!files.has(file),'Duplicate unit file');
    assert.equal(fileResult.status,'passed',file);assert(Array.isArray(fileResult.assertionResults)&&fileResult.assertionResults.length>0);const counts=new Map();
    for(const test of fileResult.assertionResults){assert.equal(typeof test.fullName,'string');assert(test.fullName);assert.equal(test.status,'passed',test.fullName);assert.deepEqual(test.failureMessages,[]);const occurrence=(counts.get(test.fullName)||0)+1;counts.set(test.fullName,occurrence);tests.set(JSON.stringify([file,test.fullName,occurrence]),test);}
    files.set(file,fileResult);
  }
  assert.equal(result.numTotalTests,tests.size,label+' total');assert.equal(result.numPassedTests,tests.size,label+' passed');assert.equal(result.success,true);
  for(const key of ['numFailedTests','numPendingTests','numTodoTests','numPendingTestSuites'])assert.equal(result[key],0,label+' '+key);
  return{files,tests};
}
check('Exact 356 actual unit assertion occurrences in the original 21 files',()=>{
  const bytes=dependency(baselineUnitsPath,baselineUnitsPin),units=readJson(path.join(report,'unit-results.json'));if(!bytes||!units)return;
  const expected=identities(JSON.parse(bytes),'Prior complete units'),actual=identities(units,'Current units');assert.equal(expected.files.size,21);assert.equal(expected.tests.size,356);
  assert.deepEqual([...actual.files.keys()].sort(),[...expected.files.keys()].sort());assert.deepEqual([...actual.tests.keys()].sort(),[...expected.tests.keys()].sort());
  summary.unitTests=actual.tests.size;summary.unitFiles=actual.files.size;summary.unitDistinctFileFullNames=new Set([...actual.tests.keys()].map(key=>JSON.stringify(JSON.parse(key).slice(0,2)))).size;
});
for(const[name,stage]of Object.entries(stages).filter(([name])=>name!=='unit'))check(name+': '+stage.count+' actual browser cases pass once',()=>{
  const result=readJson(path.join(report,stage.result));if(!result)return;assert.deepEqual(result.errors,[]);for(const key of ['unexpected','flaky','skipped'])assert.equal(result.stats[key],0);assert.equal(result.stats.expected,stage.count);
  const tests=[],files=new Set();function walk(suite){for(const spec of suite.specs||[]){files.add(path.basename(spec.file.replace(/\\/g,'/')));assert.equal(spec.ok,true,spec.title);for(const test of spec.tests){assert.equal(test.expectedStatus,'passed');assert.equal(test.status,'expected');assert.equal(test.results.length,1,'Browser case repeated');tests.push(...test.results);}}for(const child of suite.suites||[])walk(child);}
  result.suites.forEach(walk);assert.equal(tests.length,stage.count);assert.deepEqual([...files].sort(),[...stage.files].sort());
  for(const test of tests){assert.equal(test.status,'passed');assert.equal(test.retry,0);assert.deepEqual(test.errors,[]);}files.forEach(file=>browserFiles.add(file));summary.browserTests+=stage.count;summary.browserSuites[name]={passed:stage.count,files:[...files].sort(),durationMs:result.stats.duration};
});
const pngCrcTable=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
function pngCrc(bytes){let value=0xffffffff;for(const byte of bytes)value=pngCrcTable[(value^byte)&255]^(value>>>8);return(value^0xffffffff)>>>0;}
function screenshotPixels(file) {
  const bytes = readBytes(file);
  if (!bytes) return null;
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid swatch PNG');
  let header, compressed = [], offset = 8, ended = false;
  while (offset < bytes.length) {
    assert(offset + 12 <= bytes.length, 'Truncated PNG chunk');
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    assert(offset + length + 12 <= bytes.length, 'Truncated PNG payload');
    const data = bytes.subarray(offset + 8, offset + 8 + length);assert.equal(pngCrc(bytes.subarray(offset+4,offset+8+length)),bytes.readUInt32BE(offset+8+length),'PNG chunk CRC');
    if (type === 'IHDR') { assert(!header, 'Duplicate PNG header'); assert.equal(length, 13); header = data; }
    if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
    if (type === 'IEND') { assert.equal(length,0,'PNG end chunk');ended=true;assert.equal(offset,bytes.length,'Unexpected bytes after PNG end');break; }
  }
  assert(ended && header && compressed.length, 'Incomplete PNG');
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4), kind = header[9];
  assert(width > 0 && width <= 16384 && height > 0 && height <= 16384, 'Unexpected swatch PNG dimensions');
  assert.equal(header[8], 8, 'Swatch PNG must use eight-bit channels');
  assert([2, 6].includes(kind), 'Swatch PNG must be RGB or RGBA');
  assert.equal(header[10], 0); assert.equal(header[11], 0); assert.equal(header[12], 0);
  const channels = kind === 6 ? 4 : 3, stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(compressed));
  assert.equal(raw.length, (stride + 1) * height, 'PNG raster size');
  const decoded = Buffer.alloc(stride * height);
  function paeth(left, up, corner) {
    const prediction = left + up - corner, a = Math.abs(prediction - left), b = Math.abs(prediction - up), c = Math.abs(prediction - corner);
    return a <= b && a <= c ? left : b <= c ? up : corner;
  }
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; assert(filter <= 4, 'Unsupported PNG filter');
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x, left = x >= channels ? decoded[index - channels] : 0;
      const up = y ? decoded[index - stride] : 0, corner = y && x >= channels ? decoded[index - stride - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, corner);
      decoded[index] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  return { width, height, at(x, y) {
    const index = y * stride + x * channels;
    if (channels === 4) assert.equal(decoded[index + 3], 255, 'Swatch sample must be opaque');
    return [...decoded.subarray(index, index + 3)];
  } };
}
function contrastRatio(first, second) {
  const luminance = rgb => rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4); })
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
function swatchRasterProof(metrics, file, theme, blank = false) {
  const pixels = screenshotPixels(file);
  if (!pixels) return false;
  assert.equal(metrics.pixelWidth, pixels.width); assert.equal(metrics.pixelHeight, pixels.height);
  assert(Array.isArray(metrics.samples)); assert.equal(metrics.samples.length, metrics.sampledColumns);
  finiteAtLeast(metrics.sampledColumns, 48, 'Swatch sampled columns');
  const expectedColumns = Array.from({ length: pixels.width }, (_, x) => x).filter(x => (x + .5) * 56 / pixels.width >= 3 && (x + .5) * 56 / pixels.width <= 53);
  assert.deepEqual(metrics.samples.map(sample => sample.x), expectedColumns, 'Every center column across the swatch must be measured');
  const stops = [[103, 232, 249], [251, 191, 36], [251, 113, 133]], contrasts = [], errors = [];
  for (const sample of metrics.samples) {
    const svgX = (sample.x + .5) * 56 / pixels.width;
    assert(Math.abs(sample.svgX - svgX) < 1e-9);
    const progress = (svgX - 2) / 52, segment = progress < .5 ? 0 : 1, blend = segment === 0 ? progress * 2 : (progress - .5) * 2;
    const expected = stops[segment].map((value, index) => Math.round(value + (stops[segment + 1][index] - value) * blend));
    assert.deepEqual(sample.expected, expected, 'Swatch expected cyan/amber/rose gradient');
    const rgb = pixels.at(sample.x, Math.floor(pixels.height / 2));
    const surface = pixels.at(sample.x, Math.max(0, Math.floor(pixels.height * 2 / 16)));
    assert.deepEqual(sample.rgb, rgb, 'Reported swatch color must match PNG bytes');
    assert.deepEqual(sample.surface, surface, 'Reported swatch surface must match PNG bytes');
    const contrast = contrastRatio(rgb, surface), error = Math.max(...rgb.map((value, index) => Math.abs(value - expected[index])));
    assert(Math.abs(sample.contrast - contrast) < 1e-7, 'Reported swatch pixel contrast');
    assert.equal(sample.channelError, error); contrasts.push(contrast); errors.push(error);
  }
  const visible = metrics.samples.filter((sample, index) => contrasts[index] >= 3);
  assert.equal(metrics.visibleColumns, visible.length); assert.equal(metrics.matchingColumns, errors.filter(error => error <= 4).length);
  const span = visible.length ? (visible[visible.length - 1].x - visible[0].x + 1) * 56 / pixels.width : 0;
  assert(Math.abs(metrics.visibleSpanCSS - span) < 1e-9, 'Reported visible swatch span');
  assert(Math.abs(metrics.minContrast - Math.min(...contrasts)) < 1e-7);
  assert.equal(metrics.maxChannelError, Math.max(...errors));
  if (blank) {
    assert.equal(metrics.visibleColumns, 0, 'Old gradient must reproduce its blank paint');
    assert.equal(metrics.visibleSpanCSS, 0); assert(metrics.matchingColumns < metrics.sampledColumns);
  } else {
    assert.equal(metrics.visibleColumns, metrics.sampledColumns, 'Focused swatch must paint every sampled column');
    assert.equal(metrics.matchingColumns, metrics.sampledColumns, 'Focused swatch must match the speed gradient');
    finiteAtLeast(metrics.visibleSpanCSS, 48, 'Rendered swatch width');
    finiteAtLeast(metrics.minContrast, theme === 'contrast' ? 7 : 3, 'Rendered swatch contrast');
    assert(metrics.maxChannelError <= 4);
  }
  return true;
}

function visualReport(directory, kind) {
  const visuals = readJson(path.join(directory, 'visual-results.json'));
  if (!visuals) return;
  for (const key of ['sourceSha256', 'mirrorSha256', 'finalSourceSha256', 'finalMirrorSha256']) assert.equal(visuals[key], sourcePin, key);
  assert.equal(visuals.sourceStable, true); assert.equal(visuals.mirrorStable, true); assert.deepEqual(visuals.errors, []);
  assert.deepEqual(visuals.configurations.map(item => item.theme + '/' + item.width).sort(), [...combinations].sort());
  const swatchMetrics = new Map();
  for (const item of visuals.configurations) {
    const textFloor = item.theme === 'contrast' ? 7 : 4.5, graphicFloor = item.theme === 'contrast' ? 7 : 3;
    finiteAtLeast(item.minFont, 12, 'Minimum font'); finiteAtLeast(item.minTextContrast, textFloor, 'Text contrast');
    finiteAtLeast(item.minSVGContrast, graphicFloor, 'SVG contrast'); assert.equal(item.noOverflow, true);
    if (kind === 'trails') {
      assert.equal(item.rows, 5); finiteAtLeast(item.minCanvasContrast, graphicFloor, 'Canvas contrast');
      assert.equal(item.titleTextGroups, 5); finiteAtLeast(item.vacuumTextNodes, 1, 'Measured vacuum text nodes');
      assert.equal(item.textGlyphsWithinKeys, true);
      assert.equal(item.sceneFrameVerified, true);
      const focused = path.join(directory, 'swatch-focus-' + item.theme + '-' + item.width + '.png');
      assert(item.renderedSwatch, 'Rendered focused-swatch metrics missing');
      assert.equal(path.resolve(item.renderedSwatch.screenshot), focused, 'Focused swatch screenshot path');
      const metricPath = focused.replace(/\.png$/, '.json'), detailed = readJson(metricPath);
      if (!detailed) return;
      dependency(relative(metricPath)); png(focused);
      for (const key of ['sampledColumns', 'visibleColumns', 'matchingColumns', 'visibleSpanCSS', 'minContrast', 'maxChannelError'])
        assert.equal(item.renderedSwatch[key], detailed[key], 'Focused swatch summary: ' + key);
      if (!swatchRasterProof(detailed, focused, item.theme)) return;
      swatchMetrics.set(item.theme + '/' + item.width, detailed);
    } else {
      finiteAtLeast(item.minCanvasTextContrast, textFloor, 'Canvas text contrast');
      finiteAtLeast(item.minLegendTextContrast, textFloor, 'Legend text contrast');
      assert(Number.isFinite(item.pageOverflow) && item.pageOverflow <= 1);
      finiteAtLeast(item.row47Gap, 4, 'Second header row gap'); finiteAtLeast(item.cardCount, 1, 'Annotation cards');
      assert.equal(item.inspectionCardVisible, true); assert.equal(item.annotationVectorClearance, true);
      assert.equal(item.selectedCardPaintMatchesOriginal, true); assert.equal(item.selectedCardTitle, 'Falling');
      assert.match(item.selectedCardReading, /^y = \d+\.\d+ m · t = \d+\.\d{3} s$/);
    }
    const expected = path.join(directory, (kind === 'trails' ? 'trails-' : 'velocity-') + item.theme + '-' + item.width + '.png');
    assert.equal(path.resolve(item.screenshot), expected, 'Screenshot points outside its report');
    png(expected);
  }
  if (kind === 'trails') {
    const diagnostic = path.join(directory, 'gradient-negative-control');
    const evidencePath = path.join(diagnostic, 'evidence.json'), evidence = readJson(evidencePath);
    if (!evidence) return;
    dependency(relative(evidencePath)); assert.deepEqual(visuals.oldGradientReproduction, evidence, 'Negative control report binding');
    assert.equal(evidence.detectedBlankPaint, true); assert.equal(evidence.restoredPaintVerified, true);
    const negativeScreenshot = path.join(diagnostic, 'old-object-bounding-box.png');
    png(negativeScreenshot, diagnosticScreenshots);
    if (!swatchRasterProof(evidence.negative, negativeScreenshot, 'default', true)) return;
    assert.deepEqual(evidence.restored, swatchMetrics.get('default/1100'), 'Restoring the gradient must restore the measured positive paint');
    summary.gradientNegativeControl = { detectedBlankPaint: true, restoredPaintVerified: true,
      sampledColumns: evidence.negative.sampledColumns, visibleColumns: evidence.negative.visibleColumns };
  }
  summary.visualReports[kind] = {
    configurations: visuals.configurations.length,
    minFont: Math.min(...visuals.configurations.map(item => item.minFont)),
    minTextContrast: Math.min(...visuals.configurations.map(item => item.minTextContrast)),
    minSVGContrast: Math.min(...visuals.configurations.map(item => item.minSVGContrast)),
    ...(kind === 'trails' ? { minCanvasContrast: Math.min(...visuals.configurations.map(item => item.minCanvasContrast)),
      minRenderedSwatchContrast: Math.min(...visuals.configurations.map(item => item.renderedSwatch.minContrast)), focusedSwatchScreenshots: swatchMetrics.size } : {})
  };
}

const canvasPaintResults=[];
function near(actual,expected,label){assert(Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<1e-7,label+': '+actual+' differs from '+expected);}
function canvasRasterProof(paint,file,theme,positive=true){
  assert(paint&&typeof paint==='object','Canvas paint evidence missing');const pixels=screenshotPixels(file);if(!pixels)return null;
  assert.equal(paint.pixelWidth,pixels.width);assert.equal(paint.pixelHeight,pixels.height);assert.equal(paint.geometryMatches,true);
  const {canvasRect:canvas,sceneRect:scene,view,layout,originalPoint:point,selected,marker}=paint;
  for(const rect of [canvas,scene]){assert(rect&&rect.width>0&&rect.height>0);near(rect.x,rect.left,'Rectangle x');near(rect.y,rect.top,'Rectangle y');near(rect.right,rect.left+rect.width,'Rectangle right');near(rect.bottom,rect.top+rect.height,'Rectangle bottom');}
  assert(canvas.left>=scene.left&&canvas.top>=scene.top&&canvas.right<=scene.right+1&&canvas.bottom<=scene.bottom+1,'Canvas within retained scene');
  assert(Number.isInteger(paint.backingWidth)&&Number.isInteger(paint.backingHeight)&&paint.backingWidth>0&&paint.backingHeight>0);assert(paint.dpr>0&&paint.dpr<=2);
  near(layout.width,paint.backingWidth/paint.dpr,'Canvas layout width');near(layout.height,paint.backingHeight/paint.dpr,'Canvas layout height');near(view.x,40,'Original launcher origin');near(view.groundY,layout.height-122,'Original ground baseline');assert(Number.isFinite(view.scale)&&view.scale>0&&view.scale<=12);
  assert.equal(selected.run,2,'Fixture selected original Run 2');assert.equal(selected.apex,true,'Original canonical apex evidence');assert.equal(selected.impact,false,'Apex precedes impact');assert(Number.isInteger(selected.count)&&selected.count>0,'Original sample count');for(const key of ['t','mX','mY','mVx','mVy'])assert(Number.isFinite(point[key]),'Finite original physical point '+key);assert(point.t>0,'This original Run 2 apex occurs after launch');assert(Number.isInteger(selected.index)&&selected.index>0&&selected.index<selected.count);assert.equal(point.mVy,0,'Fixture selected canonical apex');
  for(const[key,original]of Object.entries({t:point.t,x:point.mX,y:point.mY,vx:point.mVx,vy:point.mVy}))assert.equal(selected[key],original,'Selected original physical point '+key);
  for(const[key,expected]of Object.entries({angle:35,velocity:17,gravity:9.8,mass:2,launchHeight:10,airResist:true}))assert.equal(selected.parameters[key],expected,'Captured original settings '+key);
  assert.equal(marker.run,selected.run);assert.equal(marker.index,selected.index);assert.equal(marker.t,point.t);near(marker.x,view.x+point.mX*view.scale,'Original marker x');near(marker.y,view.groundY-point.mY*view.scale,'Original marker y');
  const selectedX=(view.x+point.mX*view.scale)*canvas.width/layout.width,selectedY=(view.groundY-point.mY*view.scale)*canvas.height/layout.height;
  near(paint.selectedX,selectedX,'Projected selected x');near(paint.selectedY,selectedY,'Projected selected y');
  const accent=theme==='contrast'?[255,255,0]:[103,232,249],floor=theme==='contrast'?7:3;assert.deepEqual(paint.expectedMarkerRGB,accent);
  const px=x=>Math.floor((x-scene.left)*pixels.width/scene.width),py=y=>Math.floor((y-scene.top)*pixels.height/scene.height);
  const at=(x,y)=>{assert(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<pixels.width&&y>=0&&y<pixels.height,'Canvas witness bounds');return pixels.at(x,y);};
  assert(Array.isArray(paint.skySamples)&&paint.skySamples.length===4);assert(Array.isArray(paint.markerSamples)&&paint.markerSamples.length===4);
  const errors=[],skyPositions=[[4,4],[canvas.width-4,4],[4,canvas.height-4],[canvas.width-4,canvas.height-4]];
  for(const[sampleIndex,sample]of paint.skySamples.entries()){
    const [localX,localY]=skyPositions[sampleIndex],x=canvas.left+localX,y=canvas.top+localY;assert.equal(sample.side,sampleIndex);near(sample.localX,localX,'Sky local x');near(sample.localY,localY,'Sky local y');near(sample.x,x,'Sky page x');near(sample.y,y,'Sky page y');assert.equal(sample.pixelX,px(x));assert.equal(sample.pixelY,py(y));
    const rgb=at(sample.pixelX,sample.pixelY),dark=rgb.every((value,index)=>value<=[30,50,75][index]);assert.deepEqual(sample.rgb,rgb);assert.equal(sample.dark,dark);if(!dark)errors.push('sky '+sampleIndex+' is missing its dark painted surface');
  }
  const cardinal=[[-10,0],[10,0],[0,-10],[0,10]],ratios=[],channelErrors=[];
  for(const[sampleIndex,sample]of paint.markerSamples.entries()){
    const[dx,dy]=cardinal[sampleIndex],predictedX=canvas.left+selectedX+dx*canvas.width/layout.width,predictedY=canvas.top+selectedY+dy*canvas.height/layout.height;
    assert.equal(sample.side,sampleIndex);assert.equal(sample.dx,dx);assert.equal(sample.dy,dy);near(sample.predictedX,predictedX,'Marker predicted x');near(sample.predictedY,predictedY,'Marker predicted y');
    const candidates=[];for(let y=py(predictedY-1);y<=py(predictedY+1);y++)for(let x=px(predictedX-1);x<=px(predictedX+1);x++){
      const cssX=scene.left+(x+.5)*scene.width/pixels.width,cssY=scene.top+(y+.5)*scene.height/pixels.height;if(Math.abs(cssX-predictedX)>1||Math.abs(cssY-predictedY)>1)continue;
      const rgb=at(x,y),channelError=Math.max(...rgb.map((value,index)=>Math.abs(value-accent[index])));candidates.push({pixelX:x,pixelY:y,x:cssX,y:cssY,rgb,channelError,distance:Math.hypot(cssX-predictedX,cssY-predictedY)});
    }
    candidates.sort((a,b)=>a.channelError-b.channelError||a.distance-b.distance||a.pixelY-b.pixelY||a.pixelX-b.pixelX);assert(candidates.length>0);const chosen=candidates[0];
    for(const key of ['pixelX','pixelY','channelError'])assert.equal(sample[key],chosen[key]);for(const key of ['x','y','distance'])near(sample[key],chosen[key],'Chosen marker '+key);assert.deepEqual(sample.rgb,chosen.rgb);
    const ratio=contrastRatio(chosen.rgb,paint.skySamples[0].rgb);near(sample.contrast,ratio,'Actual marker contrast');ratios.push(ratio);channelErrors.push(chosen.channelError);
    if(chosen.channelError>4)errors.push('original selected marker '+sampleIndex+' is missing its expected ink');if(ratio<floor)errors.push('original selected marker '+sampleIndex+' lacks required contrast');
  }
  near(paint.minMarkerContrast,Math.min(...ratios),'Minimum original-marker contrast');assert.equal(paint.maxMarkerChannelError,Math.max(...channelErrors));assert.deepEqual(paint.errors,errors);assert.equal(paint.painted,errors.length===0);
  if(positive){
    assert.equal(paint.painted,true,'Retained canvas must contain its scene and original selected marker');assert.equal(paint.actualCanvasPixels.length,8,'Eight actual opaque canvas witnesses');
    for(const[index,actual]of paint.actualCanvasPixels.entries()){
      const witness=[...paint.skySamples,...paint.markerSamples][index];assert.equal(actual.pixelX,Math.floor((witness.x-canvas.left)*paint.backingWidth/canvas.width));assert.equal(actual.pixelY,Math.floor((witness.y-canvas.top)*paint.backingHeight/canvas.height));assert(Array.isArray(actual.rgba)&&actual.rgba.length===4);assert(actual.rgba.every(value=>Number.isInteger(value)&&value>=0&&value<=255));assert.equal(actual.rgba[3],255,'Actual canvas paint must be opaque');assert(Math.max(...actual.rgba.slice(0,3).map((value,channel)=>Math.abs(value-witness.rgb[channel])))<=4,'Retained screenshot must match actual canvas paint');
    }
    finiteAtLeast(paint.minMarkerContrast,floor,'Original marker graphic contrast');assert(paint.maxMarkerChannelError<=4);canvasPaintResults.push({screenshot:relative(file),minMarkerContrast:paint.minMarkerContrast,maxMarkerChannelError:paint.maxMarkerChannelError});
  }else{assert.equal(paint.painted,false);assert.equal(paint.actualCanvasPixels,undefined);assert(errors.some(error=>error.includes('selected marker')),'Negative control must reject original-marker paint');assert(channelErrors.every(error=>error>4),'The archived blank must lack every original marker cardinal');}
  return{painted:paint.painted,errors,minMarkerContrast:Math.min(...ratios),maxMarkerChannelError:Math.max(...channelErrors)};
}
function primaryVisualReport(){
  const directory=path.join(report,'inspection-regression');
  const visuals=readJson(path.join(directory,'visual-results.json'));if(!visuals)return;
  for(const key of ['sourceSha256','mirrorSha256','finalSourceSha256','finalMirrorSha256'])assert.equal(visuals[key],sourcePin,key);assert.equal(visuals.sourceStable,true);assert.equal(visuals.mirrorStable,true);assert.deepEqual(visuals.errors,[]);
  assert.deepEqual(visuals.configurations.map(item=>item.theme+'/'+item.width).sort(),[...combinations].sort());
  for(const item of visuals.configurations){
    const textFloor=item.theme==='contrast'?7:4.5,graphicFloor=item.theme==='contrast'?7:3;
    finiteAtLeast(item.minFont,12,'Font size');finiteAtLeast(item.minTextContrast,textFloor,'Text contrast');finiteAtLeast(item.minFocusContrast,graphicFloor,'Focus contrast');finiteAtLeast(item.minSVGContrast,graphicFloor,'SVG contrast');
    assert(Array.isArray(item.text)&&item.text.length>10,'Actual text-node measurements required');
    assert.deepEqual([...new Set(item.text.filter(node=>node.flight).map(node=>node.flight))].sort(),['1','2','3','4','5'],'All five path labels must be measured');
    for(const node of item.text){finiteAtLeast(node.font,12,'Text node font');finiteAtLeast(node.contrast,textFloor,'Text node contrast');assert.equal(typeof node.text,'string');assert(node.text.trim());assert(Array.isArray(node.rects)&&node.rects.length>0,'Visible glyph rectangles required');for(const glyph of node.rects){assert(glyph.left>=Math.max(0,node.bounds.left)-1);assert(glyph.right<=Math.min(item.width,node.bounds.right)+1);assert(glyph.top>=node.bounds.top-1);assert(glyph.bottom<=node.bounds.bottom+1);}}
    assert(Math.abs(item.minFont-Math.min(...item.text.map(node=>node.font)))<1e-7);assert(Math.abs(item.minTextContrast-Math.min(...item.text.map(node=>node.contrast)))<1e-7);
    finiteAtLeast(item.minTargetHeight,44,'Target height');finiteAtLeast(item.minTargetWidth,44,'Target width');assert.equal(item.noOverflow,true);assert.equal(item.textGlyphsWithinControls,true);assert.equal(item.focusPaintVerified,true);
    const scene=path.join(directory,'plot-inspection-'+item.theme+'-'+item.width+'.png'),moment=path.join(directory,'moment-focus-'+item.theme+'-'+item.width+'.png'),swatch=path.join(directory,'swatch-selected-'+item.theme+'-'+item.width+'.png');
    assert.equal(path.resolve(item.screenshot),scene);png(scene);png(moment);png(swatch);assert(item.renderedSwatch);assert.equal(path.resolve(item.renderedSwatch.screenshot),swatch);if(!swatchRasterProof(item.renderedSwatch,swatch,item.theme))return;
    assert(Array.isArray(item.focusTargets)&&item.focusTargets.length===2,'Two representative keyboard focus targets required');
    assert.equal(item.canvasPaintVerified,true);const covered=new Set();for(const focus of item.focusTargets){
      const file=path.resolve(focus.screenshot);assert([scene,moment].includes(file),'Focus proof outside its configuration');assert(!covered.has(file),'Duplicate focused screenshot');covered.add(file);
      const pixels=screenshotPixels(file);if(!pixels)return;assert(focus.canvasGeometry&&focus.canvasPaint,'Enclosing capture canvas geometry');assert.deepEqual(focus.canvasPaint.sceneRect,focus.sceneRect,'Canvas proof must use the enclosing retained scene');for(const key of ['canvasRect','backingWidth','backingHeight','dpr','view','layout','selected','originalPoint','marker'])assert.deepEqual(focus.canvasPaint[key],focus.canvasGeometry[key],'Canvas proof must bind enclosing geometry: '+key);if(!canvasRasterProof(focus.canvasPaint,file,item.theme))return;assert.equal(focus.pixelWidth,pixels.width);assert.equal(focus.pixelHeight,pixels.height);assert.equal(focus.focusVisible,true);assert.equal(focus.outlineStyle,'solid');assert.equal(focus.outlineWidth,3);assert.equal(focus.outlineOffset,2);assert.deepEqual(focus.outlineRGB,item.theme==='contrast'?[255,255,0]:[103,232,249]);assert(Array.isArray(focus.samples)&&focus.samples.length===4,'Four focused outline side midpoints required');
      finiteAtLeast(focus.rect.width,44,'Focused target width');finiteAtLeast(focus.rect.height,44,'Focused target height');assert.equal(typeof focus.selector,'string');assert(focus.selector);
      const ratios=[],sides=new Set();
      const sceneLeft=focus.sceneRect.left??focus.sceneRect.x,sceneTop=focus.sceneRect.top??focus.sceneRect.y;
      assert(Number.isFinite(sceneLeft)&&Number.isFinite(sceneTop)&&focus.sceneRect.width>0&&focus.sceneRect.height>0,'Screenshot CSS rectangle');
      const left=focus.rect.left??focus.rect.x,top=focus.rect.top??focus.rect.y,centerX=left+focus.rect.width/2,centerY=top+focus.rect.height/2;
      assert(file===scene?focus.selector.includes('data-physics-plot-flight'):focus.selector.includes('data-physics-plot-moment'),'Expected legend and landmark outline types');
      for(const sample of focus.samples){
        assert.equal(sample.pixelX,Math.floor((sample.x-sceneLeft)*pixels.width/focus.sceneRect.width),'Focus pixel X mapping');
        assert.equal(sample.pixelY,Math.floor((sample.y-sceneTop)*pixels.height/focus.sceneRect.height),'Focus pixel Y mapping');assert.equal(sample.surfacePixelX,Math.floor((sample.surfaceX-sceneLeft)*pixels.width/focus.sceneRect.width));assert.equal(sample.surfacePixelY,Math.floor((sample.surfaceY-sceneTop)*pixels.height/focus.sceneRect.height));
        const tolerance=.6,expectedSides=[['left',left-3.5,centerY],['right',left+focus.rect.width+3.5,centerY],['top',centerX,top-3.5],['bottom',centerX,top+focus.rect.height+3.5]];
        const side=expectedSides.find(([,x,y])=>Math.abs(sample.x-x)<=tolerance&&Math.abs(sample.y-y)<=tolerance);assert(side,'Sample must lie at a focused outline side midpoint');
        const surfacePositions={left:[left-5.75,centerY],right:[left+focus.rect.width+5.75,centerY],top:[centerX,top-5.75],bottom:[centerX,top+focus.rect.height+5.75]};const adjacent=surfacePositions[side[0]];assert(Math.abs(sample.surfaceX-adjacent[0])<=tolerance&&Math.abs(sample.surfaceY-adjacent[1])<=tolerance,'Focus contrast must use the directly adjacent surface');assert(!sides.has(side[0]),'Duplicate outline side');sides.add(side[0]);
        for(const key of ['pixelX','pixelY','surfacePixelX','surfacePixelY'])assert(Number.isInteger(sample[key]),'Focus sample coordinate');
        assert(sample.pixelX>=0&&sample.pixelX<pixels.width&&sample.pixelY>=0&&sample.pixelY<pixels.height);assert(sample.surfacePixelX>=0&&sample.surfacePixelX<pixels.width&&sample.surfacePixelY>=0&&sample.surfacePixelY<pixels.height);
        const rgb=pixels.at(sample.pixelX,sample.pixelY),surface=pixels.at(sample.surfacePixelX,sample.surfacePixelY);assert.deepEqual(sample.rgb,rgb);assert.deepEqual(sample.surface,surface);assert(Math.max(...rgb.map((value,index)=>Math.abs(value-focus.outlineRGB[index])))<=4,'Actual outline must paint its specified color');
        const ratio=contrastRatio(rgb,surface);assert(Math.abs(sample.contrast-ratio)<1e-7);finiteAtLeast(ratio,graphicFloor,'Actual focused outline contrast');ratios.push(ratio);
      }
      assert.equal(sides.size,4,'Every outline side must be painted');finiteAtLeast(Math.min(...ratios),graphicFloor,'Focus target paint');if(focus.minContrast!==undefined)assert(Math.abs(focus.minContrast-Math.min(...ratios))<1e-7);
    }
    near(item.minCanvasMarkerContrast,Math.min(...item.focusTargets.map(focus=>focus.canvasPaint.minMarkerContrast)),'Configuration original-marker contrast');assert(Array.isArray(item.targets),'Full target sizing coverage missing');assert.equal(item.targets.length,10,'Five paths, three moments, analysis and close controls required');
    assert.equal(new Set(item.targets.map(target=>target.selector)).size,item.targets.length,'Duplicate sized controls');assert.deepEqual(item.targets.filter(target=>target.kind==='trail').map(target=>target.id).sort(),['1','2','3','4','5']);assert.deepEqual(item.targets.filter(target=>target.kind==='moment').map(target=>target.id).sort(),['apex','impact','launch']);
    assert.equal(item.targets.filter(target=>target.kind==='trail').length,5,'Five comparison paths must be sized');
    assert.equal(item.targets.filter(target=>target.kind==='moment').length,3,'Launch, apex and impact target sizing required');assert.equal(item.targets.filter(target=>target.kind==='analysis').length,1,'Analysis target sizing required');assert(item.targets.some(target=>target.kind==='close'),'Inspection close sizing missing');
    assert(Math.abs(item.minFocusContrast-Math.min(...item.focusTargets.map(focus=>focus.minContrast)))<1e-7);assert(Math.abs(item.minSVGContrast-item.renderedSwatch.minContrast)<1e-7);for(const target of item.targets){assert(target.rect.left>=0&&target.rect.right<=item.width+1,'Control within viewport');assert.equal(typeof target.selector,'string');finiteAtLeast(target.rect.width,44,'Control width');finiteAtLeast(target.rect.height,44,'Control height');}assert(Math.abs(item.minTargetWidth-Math.min(...item.targets.map(target=>target.rect.width)))<1e-7);assert(Math.abs(item.minTargetHeight-Math.min(...item.targets.map(target=>target.rect.height)))<1e-7);
  }
  assert.equal(canvasPaintResults.length,18,'Every one of the 18 retained scene captures must show actual canvas paint');
  const negativePath=path.join(directory,'canvas-capture-negative-control.json'),negative=readJson(negativePath);if(!negative)return;dependency(relative(negativePath));assert.deepEqual(visuals.canvasCaptureNegativeControl,negative,'Visual report must bind blank-canvas negative control');
  const blank=path.join(directory,'before-canvas-capture-fix/moment-focus-default-320.png'),blankPin='f63547f191e63cc98187486da98c40a8e068c1756c790d4b02c7928327d64303';dependency(relative(blank),blankPin);assert.equal(path.resolve(negative.sourceScreenshot),blank);assert.equal(negative.sourceScreenshotSha256,blankPin);assert.equal(negative.detectedBlankPaint,true);assert.equal(negative.geometryMatches,true);
  const positive=visuals.configurations.find(item=>item.theme==='default'&&item.width===320).focusTargets.find(focus=>focus.selector.includes('data-physics-plot-moment'));assert(positive);assert.equal(path.resolve(negative.positiveScreenshot),path.resolve(positive.screenshot));
  for(const key of ['canvasRect','backingWidth','backingHeight','dpr','view','layout','selected','originalPoint','marker','sceneRect'])assert.deepEqual(negative.negative[key],positive.canvasPaint[key],'Negative control must use the actual positive geometry: '+key);
  assert.equal(negative.negative.pixelWidth,positive.pixelWidth);assert.equal(negative.negative.pixelHeight,positive.pixelHeight);const rejected=canvasRasterProof(negative.negative,blank,'default',false);if(!rejected)return;
  summary.canvasCaptureNegativeControl={detectedBlankPaint:true,geometryMatches:true,sourceScreenshot:relative(blank),sourceScreenshotSha256:blankPin,originalMarkerMissing:true,minMarkerContrast:rejected.minMarkerContrast,maxMarkerChannelError:rejected.maxMarkerChannelError};summary.canvasCaptures=18;summary.canvasMarkerSamples=72;
  summary.visualReports.inspection={configurations:visuals.configurations.length,minCanvasMarkerContrast:Math.min(...canvasPaintResults.map(item=>item.minMarkerContrast)),maxCanvasMarkerChannelError:Math.max(...canvasPaintResults.map(item=>item.maxMarkerChannelError)),minFont:Math.min(...visuals.configurations.map(item=>item.minFont)),minTextContrast:Math.min(...visuals.configurations.map(item=>item.minTextContrast)),minFocusContrast:Math.min(...visuals.configurations.map(item=>item.minFocusContrast)),minTargetHeight:Math.min(...visuals.configurations.map(item=>item.minTargetHeight)),minTargetWidth:Math.min(...visuals.configurations.map(item=>item.minTargetWidth)),minSVGContrast:Math.min(...visuals.configurations.map(item=>item.minSVGContrast))};
}

const calloutPaintResults=[];
function calloutContains(box,point,pad=0){return point.x>=box.x-pad&&point.x<=box.x+box.width+pad&&point.y>=box.y-pad&&point.y<=box.y+box.height+pad;}
function calloutOverlap(a,b,pad=0){return a.x<b.x+b.width+pad&&a.x+a.width+pad>b.x&&a.y<b.y+b.height+pad&&a.y+a.height+pad>b.y;}
// An independent line clipping calculation checks every closed expanded obstacle.
function calloutLineHits(a,b,box,pad=0){
  const limits=[[a.x,b.x-a.x,box.x-pad,box.x+box.width+pad],[a.y,b.y-a.y,box.y-pad,box.y+box.height+pad]];let lo=0,hi=1;
  for(const[start,delta,min,max]of limits){if(Math.abs(delta)<1e-14){if(start<min||start>max)return false;continue;}const first=(min-start)/delta,second=(max-start)/delta;lo=Math.max(lo,Math.min(first,second));hi=Math.min(hi,Math.max(first,second));if(lo>hi)return false;}return true;
}
function calloutRGB(rgb,label){assert(Array.isArray(rgb)&&rgb.length===3,label);assert(rgb.every(value=>Number.isInteger(value)&&value>=0&&value<=255),label);}
function calloutError(first,second){return Math.max(...first.map((value,index)=>Math.abs(value-second[index])));}
function calloutApexIndex(trail){
  if(!trail.apex)return-1;const apex=trail.apex;for(const key of ['tSec','mX','mY','vx'])assert(Number.isFinite(apex[key]),'Canonical apex '+key+' must be finite');
  const index=trail.points.findIndex(point=>point.mVy===0&&point.t===apex.tSec&&point.mX===apex.mX&&point.mY===apex.mY&&point.mVx===apex.vx);assert(index>=0,'Canonical apex must be an exact original recorded sample');return index;
}
function calloutTextValue(value){return value!==0&&Math.abs(value)<.01?value.toPrecision(3):value.toFixed(2);}
function calloutGeometry(capture){
  const draw=capture.draw,trail=capture.originalTrail,index=capture.originalIndex;assert(draw&&trail&&Array.isArray(trail.points)&&trail.points.length>0);assert(Number.isInteger(index)&&index>=0&&index<trail.points.length);
  assert.equal(trail.modelVersion,'projectile-v3');assert(trail.run===null||Number.isInteger(trail.run));for(const key of ['angle','velocity','gravity','mass','launchHeight'])assert(Number.isFinite(trail.parameters[key]),'Original parameter '+key);assert.equal(typeof trail.parameters.drag,'boolean');
  let time=-Infinity;for(const point of trail.points){for(const key of ['t','mX','mY','mVx','mVy'])assert(Number.isFinite(point[key]),'Every original sample '+key+' must be finite');assert(point.t>=0&&point.t>=time,'Original times must remain ordered');time=point.t;}
  const apexIndex=calloutApexIndex(trail),point=trail.points[index],sx=draw.width/draw.layout.width,sy=draw.height/draw.layout.height;assert(sx>0&&sy>0&&Number.isFinite(sx)&&Number.isFinite(sy));
  assert.deepEqual(capture.originalPoint,point);assert.deepEqual(draw.originalPoint,point);assert.equal(draw.selected.run,trail.run);assert.equal(draw.selected.index,index);assert.equal(draw.selected.count,trail.points.length);
  for(const[key,value]of Object.entries({t:point.t,x:point.mX,y:point.mY,vx:point.mVx,vy:point.mVy}))assert.equal(draw.selected[key],value,'Selected original '+key);
  for(const[key,value]of Object.entries({angle:trail.parameters.angle,velocity:trail.parameters.velocity,gravity:trail.parameters.gravity,mass:trail.parameters.mass,launchHeight:trail.parameters.launchHeight,airResist:trail.parameters.drag,modelVersion:trail.modelVersion}))assert.equal(draw.selected.parameters[key],value,'Captured selected parameter '+key);
  const atApex=index===apexIndex,impact=point.t>0&&point.mY===0&&point.mVy<=0;assert.equal(draw.selected.apex,atApex);assert.equal(draw.selected.impact,impact);assert.deepEqual(draw.selectedApex,trail.apex);
  const projected={x:(draw.view.x+point.mX*draw.view.scale)*sx,y:(draw.view.groundY-point.mY*draw.view.scale)*sy};near(capture.projected.x,projected.x,'Original projected X');near(capture.projected.y,projected.y,'Original projected Y');
  assert.equal(draw.marker.index,index);assert.equal(draw.marker.run,trail.run);assert.equal(draw.marker.t,point.t);near(draw.marker.x*sx,projected.x,'Actual marker X');near(draw.marker.y*sy,projected.y,'Actual marker Y');assert(draw.pageWidth<=draw.viewportWidth+1,'Document overflow');
  const labelFor=card=>draw.layout.labels.find(label=>Math.abs(label.x*sx-card.x)<1e-7&&Math.abs(label.y*sy-card.y)<1e-7&&Math.abs(label.width*sx-card.width)<1e-7&&Math.abs(label.height*sy-card.height)<1e-7);
  assert.equal(draw.cards.length,draw.layout.labels.length);assert(draw.cards.length>0);const selected=draw.cards.find(card=>labelFor(card)?.id==='inspection');assert(selected,'The original selected card must actually paint');
  const selectedText=draw.text.filter(glyph=>glyph.paintOrder>selected.paintOrder&&calloutContains(selected,{x:glyph.left,y:glyph.top})&&calloutContains(selected,{x:glyph.right,y:glyph.bottom})).sort((a,b)=>a.y-b.y||a.x-b.x);
  const title=atApex&&point.t===0?'Highest point at release':index===0?'Launch point':impact?'Ground impact':atApex?'At apex':point.mVy>0?'Rising':point.mVy<0?'Falling':'Vertical velocity is zero';const expected=title+' y = '+calloutTextValue(point.mY)+' m · t = '+point.t.toFixed(3)+' s';
  assert.equal(selectedText.map(glyph=>glyph.text).join(' '),expected,'Painted selected text must retain original values');assert.equal(capture.expectedText,expected);assert.deepEqual(capture.selectedText,selectedText.map(glyph=>glyph.text));
  const axes=draw.text.filter(glyph=>glyph.paintOrder<draw.cards[0].paintOrder&&(glyph.text==='Height (m)'||glyph.text==='Distance (m)'||(/^-?\d+(?:\.\d+)?$/.test(glyph.text)&&(Math.abs(glyph.x-(draw.view.x-9)*sx)<.01||Math.abs(glyph.y-(draw.view.groundY+20)*sy)<.01))));assert(axes.length>=4,'Actual axis glyph observations');
  const axisBoxes=axes.map(glyph=>({x:glyph.left,y:glyph.top,width:glyph.right-glyph.left,height:glyph.bottom-glyph.top,text:glyph.text}));assert.deepEqual(capture.axes,axes);assert.deepEqual(capture.axisBoxes,axisBoxes);
  const points=draw.rings.filter(ring=>Math.abs(Math.abs(ring.end-ring.start)-Math.PI*2)<1e-7&&ring.radius>=3&&ring.radius<=10.01&&ring.x>=draw.view.x*sx-.01&&ring.x<=draw.width-20*sx+.01&&ring.y>=draw.layout.plotTop*sy&&ring.y<=draw.view.groundY*sy+.01).map(ring=>({x:ring.x-ring.radius-4*sx,y:ring.y-ring.radius-4*sy,width:ring.radius*2+8*sx,height:ring.radius*2+8*sy,center:{x:ring.x,y:ring.y},radius:ring.radius}));assert.deepEqual(capture.points,points);
  assert(points.some(ring=>Math.hypot(ring.center.x-draw.view.x*sx,ring.center.y-(draw.view.groundY-trail.parameters.launchHeight*draw.view.scale)*sy)<.01),'Original release ring must be protected even at zero height');
  const arrows=draw.strokes.filter(stroke=>['#93c5fd','#6ee7b7','#c4b5fd','#fda4af'].includes(stroke.color.toLowerCase()));
  const annotated=draw.cards.map(card=>{
    const label=labelFor(card);assert(label,'Actual panel semantic identity');assert.equal(card.alpha,1,'Opaque panel');const text=draw.text.filter(glyph=>glyph.paintOrder>card.paintOrder&&glyph.paintOrder<(draw.cards.find(other=>other.paintOrder>card.paintOrder)?.paintOrder??Infinity));assert(text.length>0,'Every panel needs actual text');
    const candidates=draw.strokes.filter(stroke=>stroke.paintOrder===card.paintOrder-1&&stroke.segments.length===1&&Math.abs(stroke.width-sx)<.01&&!stroke.dash.length);assert.equal(candidates.length,1,'One actual leader per card');const leader=candidates[0];
    assert(card.x>=(draw.view.x+8)*sx-.01&&card.x+card.width<=draw.width-28*sx+.01,'Card horizontal inset');assert(card.y>=(draw.layout.plotTop+8)*sy-.01&&card.y+card.height<=(draw.view.groundY-8)*sy+.01,'Card vertical inset');
    for(const glyph of text){finiteAtLeast(glyph.fontSize,11.99,'Actual glyph font');assert(glyph.left>=card.x+7*sx-.01&&glyph.right<=card.x+card.width-7*sx+.01,'Actual horizontal glyph padding');assert(glyph.top>=card.y&&glyph.bottom<=card.y+card.height,'Actual vertical glyph padding');}
    for(const axis of axisBoxes){assert(!calloutOverlap(card,axis,2),'Card obscures actual axis glyphs');for(const segment of leader.segments)assert(!calloutLineHits(segment.from,segment.to,axis,1),'Leader crosses actual axis glyphs');}
    for(const ring of points){assert(!calloutOverlap(card,ring),'Card obscures an original point ring');if(Math.hypot(ring.center.x-label.anchor.x*sx,ring.center.y-label.anchor.y*sy)>ring.radius+4)for(const segment of leader.segments)assert(!calloutLineHits(segment.from,segment.to,ring),'Leader crosses another original point');}
    for(const arrow of arrows)for(const segment of arrow.segments)assert(!calloutLineHits(segment.from,segment.to,card,arrow.width/2),'Card obscures an actual vector shaft or arrowhead');
    const segment=leader.segments[0],anchor={x:label.anchor.x*sx,y:label.anchor.y*sy},cross=(segment.to.x-anchor.x)*(segment.from.y-anchor.y)-(segment.to.y-anchor.y)*(segment.from.x-anchor.x);assert(Math.abs(cross)<1e-5,'Leader must point toward its original anchor');assert(Math.abs(Math.hypot(segment.from.x-anchor.x,segment.from.y-anchor.y)-(label.anchor.radius+2)*sx)<5e-8,'Leader begins at true marker edge');assert(calloutContains(card,segment.to,.01));assert(Math.min(Math.abs(segment.to.x-card.x),Math.abs(segment.to.x-card.x-card.width),Math.abs(segment.to.y-card.y),Math.abs(segment.to.y-card.y-card.height))<.01,'Leader must terminate at card edge');
    return{id:label.id,card,text,leader,anchor,radius:label.anchor.radius};
  });
  for(let index=0;index<annotated.length;index++)for(const other of annotated.slice(index+1)){const current=annotated[index];assert(!calloutOverlap(current.card,other.card,5.99*sx),'Cards need at least six CSS pixels separation');for(const segment of current.leader.segments)assert(!calloutLineHits(segment.from,segment.to,other.card,1.99*sx),'Leader crosses a different card');for(const segment of other.leader.segments)assert(!calloutLineHits(segment.from,segment.to,current.card,1.99*sx),'Leader crosses a different card');}
  calloutConnectorPairGeometry(capture.connectorClearance,annotated,points,arrows,sx,sy);
  for(const key of ['geometryVerified','selectedCardVisible','selectedTextComplete','axisGlyphClearance','originalPointClearance','vectorClearance','otherLabelClearance','savedPaintVerified','originalEvidenceUnchanged'])assert.equal(capture[key],true,key);
  return calloutOutlineGeometry(capture,{draw,trail,index,point,sx,sy,projected,axes,annotated,apexIndex});
}
function calloutConnectorPairGeometry(proof,annotated,points,arrows,sx,sy){
  assert(proof);assert.equal(proof.requiredDistance,4);const normalize=point=>({x:point.x/sx,y:point.y/sy}),segment=value=>({from:normalize(value.from),to:normalize(value.to)});
  const markerBounds=points.map(point=>({x:point.x/sx,y:point.y/sy,width:point.width/sx,height:point.height/sy}));
  for(const annotation of annotated){const anchor=normalize(annotation.anchor),margin=annotation.radius+4;markerBounds.push({x:anchor.x-margin,y:anchor.y-margin,width:margin*2,height:margin*2});}
  const vectorBounds=arrows.filter(stroke=>stroke.color.toLowerCase()==='#93c5fd').map(resultant=>{const origin=resultant.segments[0].from,shafts=arrows.flatMap(stroke=>stroke.segments.filter(line=>Math.hypot(line.from.x-origin.x,line.from.y-origin.y)<1e-7).map(segment)),endpoints=shafts.flatMap(line=>[line.from,line.to]),left=Math.min(...endpoints.map(point=>point.x))-6,top=Math.min(...endpoints.map(point=>point.y))-6,right=Math.max(...endpoints.map(point=>point.x))+6,bottom=Math.max(...endpoints.map(point=>point.y))+6;return{x:left,y:top,width:right-left,height:bottom-top,shafts};});
  function rectangle(reported,expected,label){assert(reported&&expected);for(const key of ['x','y','width','height'])near(reported[key],expected[key],label+' '+key);}
  assert.equal(proof.markerBoxes.length,markerBounds.length);markerBounds.forEach((box,index)=>rectangle(proof.markerBoxes[index],box,'Observed common point bounds'));assert.equal(proof.vectorBoxes.length,vectorBounds.length);vectorBounds.forEach((box,index)=>{rectangle(proof.vectorBoxes[index],box,'Observed common vector bounds');assert.deepEqual(proof.vectorBoxes[index].shafts,box.shafts,'Vector envelope binds actual shaft endpoints');});
  function outside(segment,bounds){
    assert(calloutContains(bounds,segment.from,1e-7),'A shared connector begins in its independently observed point bundle');if(calloutContains(bounds,segment.to))return null;
    let exit=1;for(const[origin,delta,min,max]of [[segment.from.x,segment.to.x-segment.from.x,bounds.x,bounds.x+bounds.width],[segment.from.y,segment.to.y-segment.from.y,bounds.y,bounds.y+bounds.height]]){if(delta>0)exit=Math.min(exit,(max-origin)/delta);else if(delta<0)exit=Math.min(exit,(min-origin)/delta);}
    assert(exit>=-1e-7&&exit<=1);return{from:{x:segment.from.x+(segment.to.x-segment.from.x)*exit,y:segment.from.y+(segment.to.y-segment.from.y)*exit},to:segment.to};
  }
  function endpoints(reported,expected,label){if(expected===null){assert.equal(reported,null);return;}assert(reported);for(const end of ['from','to'])for(const axis of ['x','y'])near(reported[end][axis],expected[end][axis],label+' '+end+' '+axis);}
  assert.equal(proof.pairs.length,annotated.length*(annotated.length-1)/2);let pairIndex=0;
  for(let index=0;index<annotated.length;index++)for(const other of annotated.slice(index+1)){
    const current=annotated[index],anchor=normalize(current.anchor),otherAnchor=normalize(other.anchor),actualA=segment(current.leader.segments[0]),actualB=segment(other.leader.segments[0]),sharedAnchor=Math.abs(anchor.x-otherAnchor.x)<1e-7&&Math.abs(anchor.y-otherAnchor.y)<1e-7;let first=actualA,second=actualB,bundle=null;
    if(sharedAnchor){
      const shared=[...markerBounds,...vectorBounds].filter(box=>calloutContains(box,anchor));assert(shared.length>0,'Shared anchor has actual observed marker bounds');const left=Math.min(...shared.map(box=>box.x))-3,top=Math.min(...shared.map(box=>box.y))-3,right=Math.max(...shared.map(box=>box.x+box.width))+3,bottom=Math.max(...shared.map(box=>box.y+box.height))+3;bundle={x:left,y:top,width:right-left,height:bottom-top};first=outside(first,bundle);second=outside(second,bundle);
    }
    const distance=first&&second?calloutSegmentDistance(first,second):null,reported=proof.pairs[pairIndex++];assert.equal(reported.idA,current.id);assert.equal(reported.idB,other.id);assert.equal(reported.sharedAnchor,sharedAnchor);assert.equal(reported.requiredDistance,4);if(bundle)rectangle(reported.bundle,bundle,'Independent shared bundle');else assert.equal(reported.bundle,null);endpoints(reported.actualA,actualA,'Actual first leader');endpoints(reported.actualB,actualB,'Actual second leader');endpoints(reported.comparedA,first,'Independently clipped first tail');endpoints(reported.comparedB,second,'Independently clipped second tail');
    if(distance!==null){near(reported.distance,distance,'Independent finite connector distance');assert(distance>=4-1e-7,'Accepted actual connector bodies need four CSS pixels separation outside their common point bundle: '+current.id+'/'+other.id);}else assert.equal(reported.distance,null);
  }
}
function calloutPointSegmentDistance(point,segment){const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,lengthSquared=dx*dx+dy*dy;if(!lengthSquared)return Math.hypot(point.x-segment.from.x,point.y-segment.from.y);const fraction=Math.max(0,Math.min(1,((point.x-segment.from.x)*dx+(point.y-segment.from.y)*dy)/lengthSquared));return Math.hypot(point.x-segment.from.x-dx*fraction,point.y-segment.from.y-dy*fraction);}
function calloutSegmentDistance(first,second){
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),a=first.from,b=first.to,c=second.from,d=second.to;
  if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y)))return 0;
  return Math.min(calloutPointSegmentDistance(a,second),calloutPointSegmentDistance(b,second),calloutPointSegmentDistance(c,first),calloutPointSegmentDistance(d,first));
}
function calloutOutlineGeometry(capture,geometry){
  const {draw,annotated,projected,sx,sy}=geometry;
  const arms=[{from:{x:projected.x-14*sx,y:projected.y},to:{x:projected.x-6*sx,y:projected.y}},{from:{x:projected.x+6*sx,y:projected.y},to:{x:projected.x+14*sx,y:projected.y}},{from:{x:projected.x,y:projected.y-14*sy},to:{x:projected.x,y:projected.y-6*sy}},{from:{x:projected.x,y:projected.y+6*sy},to:{x:projected.x,y:projected.y+14*sy}}];
  const crosshairs=draw.strokes.filter(stroke=>stroke.segments.length===4&&Math.abs(stroke.width-2*sx)<.01&&stroke.segments.every((segment,index)=>Math.abs(segment.from.x-arms[index].from.x)<1e-7&&Math.abs(segment.from.y-arms[index].from.y)<1e-7&&Math.abs(segment.to.x-arms[index].to.x)<1e-7&&Math.abs(segment.to.y-arms[index].to.y)<1e-7));assert.equal(crosshairs.length,1,'One actually painted four-arm original-point crosshair');
  const crosshair=crosshairs[0];assert.deepEqual(crosshair.rgb,capture.theme==='contrast'?[255,255,0]:[103,232,249]);assert.equal(crosshair.alpha,1);assert.equal(crosshair.lineCap,'butt');assert.equal(crosshair.lineJoin,'miter');
  const rings=draw.rings.filter(ring=>Math.abs(Math.abs(ring.end-ring.start)-Math.PI*2)<1e-7&&ring.radius>=3&&ring.radius<=10.01);
  const arrows=draw.strokes.filter(stroke=>['#93c5fd','#6ee7b7','#c4b5fd','#fda4af'].includes(stroke.color.toLowerCase()));
  const cssSegment=segment=>({from:{x:segment.from.x/sx,y:segment.from.y/sy},to:{x:segment.to.x/sx,y:segment.to.y/sy}});
  const lowerForegroundPairs=[];
  for(const annotation of annotated){
    const {card,leader,anchor}=annotation,label=draw.layout.labels.find(label=>label.id===annotation.id);assert(label);
    assert.equal(leader.lineCap,'butt');assert.equal(leader.lineJoin,'miter');
    if(annotation.id!=='inspection')for(const observedSegment of leader.segments)for(let armIndex=0;armIndex<crosshair.segments.length;armIndex++){const segment=cssSegment(observedSegment),arm=cssSegment(crosshair.segments[armIndex]),distance=calloutSegmentDistance(segment,arm);assert(distance>=2-1e-7,'Lower-priority foreground must preserve actual selected crosshair ink: '+annotation.id);lowerForegroundPairs.push({id:annotation.id,armIndex,segment,arm,distance,requiredDistance:2});}
    const outlines=draw.strokes.filter(stroke=>stroke.paintOrder===card.paintOrder-2&&stroke.segments.length===1&&Math.abs(stroke.width-3*sx)<.01&&!stroke.dash.length);
    assert.equal(outlines.length,label.outline?1:0,'Optional outline must match actual opaque paint');const outline=outlines[0]||null;annotation.outline=outline;
    if(!outline)continue;assert.equal(outline.alpha,1);assert.deepEqual(outline.rgb,card.rgb);assert.equal(outline.lineCap,'butt');assert.equal(outline.lineJoin,'miter');
    const segment=outline.segments[0],foreground=leader.segments[0];for(const end of ['from','to']){near(segment[end].x,label.outline[end].x*sx,'Actual outline '+end+' X');near(segment[end].y,label.outline[end].y*sy,'Actual outline '+end+' Y');}
    near(segment.to.x,foreground.to.x,'Outline ends at foreground card edge X');near(segment.to.y,foreground.to.y,'Outline ends at foreground card edge Y');
    const dx=foreground.to.x-anchor.x,dy=foreground.to.y-anchor.y,cross=dx*(segment.from.y-anchor.y)-dy*(segment.from.x-anchor.x);assert(Math.abs(cross)<1e-5,'Shortened outline remains on original anchor direction');assert(Math.hypot(segment.from.x-anchor.x,segment.from.y-anchor.y)+1e-7>=Math.hypot(foreground.from.x-anchor.x,foreground.from.y-anchor.y),'Outline may shorten its anchor-side end');
    assert(calloutPointSegmentDistance(segment.from,foreground)<1e-7,'Outline starts within actual foreground segment');
    for(const ring of rings)assert(calloutPointSegmentDistance({x:ring.x,y:ring.y},segment)>=ring.radius+ring.width/2+outline.width/2-.01,'Opaque outline must preserve every original point ring');
    for(const stroke of [...arrows,crosshair])for(const actual of stroke.segments)assert(calloutSegmentDistance(segment,actual)>=(outline.width+stroke.width)/2-.01,'Opaque outline must clear every actual vector and selected crosshair stroke');
    for(const glyph of geometry.axes){const box={x:glyph.left,y:glyph.top,width:glyph.right-glyph.left,height:glyph.bottom-glyph.top};assert(!calloutLineHits(segment.from,segment.to,box,outline.width/2),'Opaque outline must clear actual axis glyphs');}
    for(const other of annotated)if(other!==annotation)assert(!calloutLineHits(segment.from,segment.to,other.card,outline.width/2),'Opaque outline must clear other card bodies');
  }
  const lowerForegroundProof=capture.lowerForegroundCrosshairClearance;assert(lowerForegroundProof);assert.equal(lowerForegroundProof.requiredDistance,2);assert.equal(lowerForegroundProof.pairs.length,lowerForegroundPairs.length);for(let index=0;index<lowerForegroundPairs.length;index++){const expected=lowerForegroundPairs[index],reported=lowerForegroundProof.pairs[index];for(const key of ['id','armIndex','segment','arm','requiredDistance'])assert.deepEqual(reported[key],expected[key],'Independently observed foreground-crosshair '+key);near(reported.distance,expected.distance,'Independent foreground-crosshair finite distance');}
  for(const expected of annotated){const reported=capture.annotated.find(item=>item.id===expected.id);assert(reported);for(const key of ['id','card','text','leader','outline','anchor','radius'])assert.deepEqual(reported[key],expected[key],'Independent observed annotation '+key);}
  geometry.crosshair=crosshair;return geometry;
}

function calloutRasterProof(capture,filename,theme){
  const file=path.join(report,filename);assert.equal(capture.filename,filename);assert.equal(path.resolve(capture.screenshot),file);assert.equal(capture.theme,theme);assert.equal(capture.sourceSha256,sourcePin);const bytes=dependency(relative(file),capture.screenshotSha256);if(!bytes)return;png(file);const pixels=screenshotPixels(file);if(!pixels)return;const geometry=calloutGeometry(capture),{draw,sx,sy}=geometry;
  assert.equal(capture.pixelWidth,pixels.width);assert.equal(capture.pixelHeight,pixels.height);assert(draw.generation>0);
  const screen=capture.screenshotGeometry;assert(screen,'Saved page clip geometry');const{clip,canvasRect,dpr}=screen;
  for(const value of Object.values(clip))assert(Number.isFinite(value)&&Number.isInteger(value),'Screenshot bounds must be integer CSS pixels');
  for(const value of Object.values(canvasRect))assert(Number.isFinite(value),'Actual canvas rectangle must be finite');assert(Number.isFinite(dpr)&&dpr>0);
  near(canvasRect.right,canvasRect.left+canvasRect.width,'Canvas right edge');near(canvasRect.bottom,canvasRect.top+canvasRect.height,'Canvas bottom edge');
  assert.equal(canvasRect.width,draw.width);assert.equal(canvasRect.height,draw.height);assert.equal(screen.backingWidth,draw.backingWidth);assert.equal(screen.backingHeight,draw.backingHeight);
  assert(Number.isFinite(screen.scrollX)&&Number.isFinite(screen.scrollY));assert.equal(screen.coordinateSpace,'document');
  const documentRect={left:canvasRect.left+screen.scrollX,top:canvasRect.top+screen.scrollY,right:canvasRect.right+screen.scrollX,bottom:canvasRect.bottom+screen.scrollY,width:canvasRect.width,height:canvasRect.height};assert.deepEqual(screen.canvasDocumentRect,documentRect,'Actual canvas document rectangle from DOM bounds and scroll');
  const expectedClip={x:Math.floor(documentRect.left+.001),y:Math.floor(documentRect.top+.001),width:Math.ceil(documentRect.right-.001)-Math.floor(documentRect.left+.001),height:Math.ceil(documentRect.bottom-.001)-Math.floor(documentRect.top+.001)};assert.deepEqual(clip,expectedClip,'Public element screenshot uses the exact enclosingIntRect document clip');
  for(const key of ['documentWidth','documentHeight'])assert(Number.isInteger(screen[key])&&screen[key]>0,'Actual document extent '+key);assert(clip.width>0&&clip.height>0&&clip.x>=0&&clip.y>=0&&clip.x+clip.width<=screen.documentWidth&&clip.y+clip.height<=screen.documentHeight,'Retained document clip must fit the actual document');
  assert.equal(pixels.width,clip.width*dpr);assert.equal(pixels.height,clip.height*dpr);
  

  const transform=capture.rasterTransform;assert(transform&&['css-origin-rounding','device-origin-rounding','continuous-css-origin'].includes(transform.kind),'One independently validated image-wide browser raster transform');
  assert.deepEqual(transform.cssOrigin,{left:canvasRect.left,top:canvasRect.top});assert.equal(draw.backingWidth,draw.width*dpr);assert.equal(draw.backingHeight,draw.height*dpr);const metrics=capture.captureMetrics;assert(metrics&&metrics.beforeCaptureMetrics&&metrics.afterCaptureMetrics,'Actual Chromium capture metrics before and after PNG');const beforeViewport=metrics.beforeCaptureMetrics.visualViewport,afterViewport=metrics.afterCaptureMetrics.visualViewport;assert(beforeViewport&&afterViewport);assert.deepEqual(afterViewport,beforeViewport,'Chromium document capture viewport must remain stable');for(const key of ['pageX','pageY'])assert(Number.isFinite(beforeViewport[key]),'Actual CDP document viewport '+key);assert.deepEqual(metrics.afterCanvasDocumentRect,documentRect,'Element document bounds must remain stable throughout the actual PNG capture');const documentCanvasOrigin={left:documentRect.left,top:documentRect.top},screenshotDocumentOrigin={left:clip.x,top:clip.y},effectiveCanvasOrigin=documentCanvasOrigin;assert.deepEqual(transform.documentCanvasOrigin,documentCanvasOrigin);assert.deepEqual(transform.screenshotDocumentOrigin,screenshotDocumentOrigin);assert.deepEqual(transform.effectiveCanvasOrigin,effectiveCanvasOrigin);near(effectiveCanvasOrigin.left-clip.x,documentCanvasOrigin.left-screenshotDocumentOrigin.left,'Actual element canvas-to-PNG document X');near(effectiveCanvasOrigin.top-clip.y,documentCanvasOrigin.top-screenshotDocumentOrigin.top,'Actual element canvas-to-PNG document Y');
  const calibrationAnchors=geometry.axes.flatMap(glyph=>glyph.witnesses.map(witness=>({text:glyph.text,anchorNativePixel:{x:Math.floor(witness.x*draw.backingWidth/draw.width),y:Math.floor(witness.y*draw.backingHeight/draw.height)},targets:witness.paintNeighbors.map(pixel=>({pixelX:pixel.pixelX,pixelY:pixel.pixelY}))})));assert(calibrationAnchors.length>=3,'Several actual axis pixel constellations required');assert.equal(transform.nativeConstellations.length,calibrationAnchors.length,'Every fixed actual axis glyph witness participates');
  for(let index=0;index<calibrationAnchors.length;index++){
    const expected=calibrationAnchors[index],native=transform.nativeConstellations[index];assert.equal(native.text,expected.text);assert.deepEqual(native.anchorNativePixel,expected.anchorNativePixel);assert.deepEqual(native.targets,expected.targets);assert.equal(native.targets.length,9);assert.equal(native.neighbors.length,25);const coordinates=[];
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)coordinates.push([expected.anchorNativePixel.x+dx,expected.anchorNativePixel.y+dy]);assert.deepEqual(native.neighbors.map(pixel=>[pixel.pixelX,pixel.pixelY]),coordinates,'One complete five-by-five final native constellation per fixed glyph anchor');
    for(const pixel of native.neighbors){assert(pixel.pixelX>=0&&pixel.pixelX<draw.backingWidth&&pixel.pixelY>=0&&pixel.pixelY<draw.backingHeight);assert(Array.isArray(pixel.rgba)&&pixel.rgba.length===4&&pixel.rgba.every(channel=>Number.isInteger(channel)&&channel>=0&&channel<=255));assert.equal(pixel.rgba[3],255,'Every actual native calibration input must be opaque');}
  }
  function calibrationProjection(pixelX,pixelY,native,origin){
    const rawX=((clip.x+(pixelX+.5)/dpr-origin.left)*draw.backingWidth/draw.width)-.5,rawY=((clip.y+(pixelY+.5)/dpr-origin.top)*draw.backingHeight/draw.height)-.5,left=Math.floor(rawX),top=Math.floor(rawY),xWeight=rawX-left,yWeight=rawY-top;
    const coordinates=[[left,top,(1-xWeight)*(1-yWeight)],[left+1,top,xWeight*(1-yWeight)],[left,top+1,(1-xWeight)*yWeight],[left+1,top+1,xWeight*yWeight]],inputs=coordinates.map(([pixelX,pixelY,weight])=>{const pixel=native.neighbors.find(pixel=>pixel.pixelX===pixelX&&pixel.pixelY===pixelY);assert(pixel,'Fixed native constellation must contain every compositor input');return{...pixel,weight};});
    const rgba=[0,1,2,3].map(channel=>Math.round(inputs.reduce((sum,pixel)=>sum+pixel.rgba[channel]*pixel.weight,0)));return{rawX,rawY,xWeight,yWeight,inputs,rgba};
  }
  const origins=[{kind:'css-origin-rounding',rasterOrigin:{left:Math.round(effectiveCanvasOrigin.left),top:Math.round(effectiveCanvasOrigin.top)}},{kind:'device-origin-rounding',rasterOrigin:{left:Math.round(effectiveCanvasOrigin.left*dpr)/dpr,top:Math.round(effectiveCanvasOrigin.top*dpr)/dpr}},{kind:'continuous-css-origin',rasterOrigin:effectiveCanvasOrigin}];assert.equal(transform.candidates.length,3,'Exactly three predetermined whole-image mappings');
  const auditedCandidates=origins.map((candidate,order)=>{
    const calibration=transform.nativeConstellations.map(native=>({text:native.text,anchorNativePixel:native.anchorNativePixel,samples:native.targets.map(pixel=>{
      const savedPixelX=Math.floor((candidate.rasterOrigin.left-clip.x)*dpr+(pixel.pixelX+.5)*dpr*draw.width/draw.backingWidth),savedPixelY=Math.floor((candidate.rasterOrigin.top-clip.y)*dpr+(pixel.pixelY+.5)*dpr*draw.height/draw.backingHeight);assert(savedPixelX>=0&&savedPixelX<pixels.width&&savedPixelY>=0&&savedPixelY<pixels.height,'Fixed calibration target within saved clip');const savedRgb=pixels.at(savedPixelX,savedPixelY),projected=calibrationProjection(savedPixelX,savedPixelY,native,candidate.rasterOrigin),channelError=calloutError(savedRgb,projected.rgba.slice(0,3));return{nativePixelX:pixel.pixelX,nativePixelY:pixel.pixelY,savedPixelX,savedPixelY,savedRgb,projected,channelError};
    })}));const errors=calibration.flatMap(anchor=>anchor.samples.map(sample=>sample.channelError));const audited={...candidate,order,calibration,maxResidual:Math.max(...errors),meanResidual:errors.reduce((sum,value)=>sum+value,0)/errors.length};assert.deepEqual(transform.candidates[order],audited,'Independently recomputed candidate calibration, native inputs, weights and every saved pixel residual');return audited;
  });
  assert.equal(transform.selectionRule,'lowest maximum residual, then mean residual, then CSS rounding, device rounding, continuous origin');const selected=[...auditedCandidates].sort((first,second)=>first.maxResidual-second.maxResidual||first.meanResidual-second.meanResidual||first.order-second.order)[0];assert(selected.maxResidual<=4,'One predetermined mapping must preserve every fixed native axis constellation within four channels');assert.equal(transform.kind,selected.kind);assert.deepEqual(transform.rasterOrigin,selected.rasterOrigin);assert.deepEqual(transform.calibration,selected.calibration);assert.equal(transform.maxResidual,selected.maxResidual);
  const rasterOrigin=selected.rasterOrigin,offsetDevicePixels={x:(rasterOrigin.left-effectiveCanvasOrigin.left)*dpr,y:(rasterOrigin.top-effectiveCanvasOrigin.top)*dpr};assert.deepEqual(transform.offsetDevicePixels,offsetDevicePixels);assert(Math.abs(offsetDevicePixels.x)<=.5*dpr&&Math.abs(offsetDevicePixels.y)<=.5*dpr,'Single selected raster origin stays within Blink half-CSS-pixel snapping');const residuals=selected.calibration.flatMap(anchor=>anchor.samples.map(sample=>sample.channelError));
  const textFloor=theme==='contrast'?7:4.5,graphicFloor=theme==='contrast'?7:3,all=[],actualText=[],reportedText=[],leaderRatios=[],overlapRatios=[],markerRatios=[];
  function sampleIndex(p){return{x:Math.floor((rasterOrigin.left+p.x-clip.x)*dpr),y:Math.floor((rasterOrigin.top+p.y-clip.y)*dpr)};}
  function actual(sample,retain=true){assert(Number.isFinite(sample.x)&&Number.isFinite(sample.y));const{x,y}=sampleIndex(sample);assert.equal(sample.pixelX,x);assert.equal(sample.pixelY,y);assert(x>=0&&x<pixels.width&&y>=0&&y<pixels.height,'Sample within saved page clip');const rgb=pixels.at(x,y);calloutRGB(sample.rgb,'Saved sample RGB');assert.deepEqual(sample.rgb,rgb,'Sample must match independently decoded saved pixels');if(retain)all.push(sample);return rgb;}
  function projection(pixelX,pixelY,neighbors,reported){
    assert(Array.isArray(neighbors)&&neighbors.length>=4,'Every projected pixel needs independently observed compositor inputs');
    const rawX=((clip.x+(pixelX+.5)/dpr-rasterOrigin.left)*draw.backingWidth/draw.width)-.5,rawY=((clip.y+(pixelY+.5)/dpr-rasterOrigin.top)*draw.backingHeight/draw.height)-.5;
    const x=Math.floor(rawX),y=Math.floor(rawY),fx=rawX-x,fy=rawY-y,coordinates=[[x,y,(1-fx)*(1-fy)],[x+1,y,fx*(1-fy)],[x,y+1,(1-fx)*fy],[x+1,y+1,fx*fy]];
    const seen=new Set();for(const p of neighbors){assert(Number.isInteger(p.pixelX)&&Number.isInteger(p.pixelY));const key=p.pixelX+','+p.pixelY;assert(!seen.has(key),'Native input coordinates must be unique');seen.add(key);assert(p.pixelX>=0&&p.pixelX<draw.backingWidth&&p.pixelY>=0&&p.pixelY<draw.backingHeight,'Native input inside bitmap');assert(Array.isArray(p.rgba)&&p.rgba.length===4&&p.rgba.every(v=>Number.isInteger(v)&&v>=0&&v<=255));assert.equal(p.rgba[3],255,'Native canvas input opaque');}
    const inputs=coordinates.map(([pixelX,pixelY,weight])=>{const p=neighbors.find(input=>input.pixelX===pixelX&&input.pixelY===pixelY);assert(p,'Actual native paint must contain every compositor input');return{...p,weight};});
    const rgba=[0,1,2,3].map(channel=>Math.round(inputs.reduce((sum,p)=>sum+p.rgba[channel]*p.weight,0)));const value={rawX,rawY,xWeight:fx,yWeight:fy,inputs,rgba};
    if(reported){for(const key of ['rawX','rawY','xWeight','yWeight'])near(reported[key],value[key],'Independent compositor '+key);assert.deepEqual(reported.inputs,inputs,'Independent four native inputs and weights');assert.deepEqual(reported.rgba,rgba,'Independent bilinear compositing');}
    return value;
  }
  function immediatePaint(witness,sample){
    assert(Array.isArray(witness.paintNeighbors)&&witness.paintNeighbors.length===9,'Immediate paint needs a complete three by three native neighborhood');
    const cx=Math.floor(witness.x*draw.backingWidth/draw.width),cy=Math.floor(witness.y*draw.backingHeight/draw.height),expected=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)expected.push((cx+dx)+','+(cy+dy));assert.deepEqual(witness.paintNeighbors.map(p=>p.pixelX+','+p.pixelY).sort(),expected.sort(),'Native neighborhood must surround the physical paint witness');
    const center=witness.paintNeighbors.find(p=>p.pixelX===cx&&p.pixelY===cy);assert(center);assert.deepEqual(center.rgba.slice(0,3),witness.rgb,'Immediate paint RGB binds its native center');
    const predicted=projection(sample.pixelX,sample.pixelY,witness.paintNeighbors,sample.projected),error=calloutError(sample.rgb,predicted.rgba.slice(0,3));assert.equal(sample.channelError,error);assert(error<=4,'Saved PNG retains independently projected immediate native paint');return predicted;
  }
  function finalNativePaint(witness,sample){
    const neighbors=witness.finalPaintNeighbors;assert(Array.isArray(neighbors)&&neighbors.length===9,'Foreground needs a complete independently observed final native neighborhood');
    const cx=Math.floor(witness.x*draw.backingWidth/draw.width),cy=Math.floor(witness.y*draw.backingHeight/draw.height),coordinates=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)coordinates.push([cx+dx,cy+dy]);assert.deepEqual(neighbors.map(pixel=>[pixel.pixelX,pixel.pixelY]),coordinates,'Final foreground neighborhood surrounds its physical native witness');
    const center=neighbors.find(pixel=>pixel.pixelX===cx&&pixel.pixelY===cy);assert(center);assert.deepEqual(witness.finalNativeRgba,center.rgba,'Final foreground RGBA binds actual center after every annotation');assert.deepEqual(sample.finalNativeRgba,witness.finalNativeRgba);assert.deepEqual(sample.finalPaintNeighbors,neighbors);const inkError=calloutError(witness.rgb,witness.finalNativeRgba.slice(0,3));assert.equal(sample.finalInkError,inkError);assert(inkError<=4,'Original native foreground ink survives every later annotation');
    const projected=projection(sample.pixelX,sample.pixelY,neighbors,sample.finalProjected),error=calloutError(sample.rgb,projected.rgba.slice(0,3));assert.equal(sample.finalChannelError,error);assert(error<=4,'Saved PNG preserves the actual final native foreground paint');
  }
  const expectedGlyphs=[...geometry.axes.map(glyph=>({kind:'axis',...glyph})),...geometry.annotated.flatMap(annotation=>annotation.text.map(glyph=>({kind:annotation.id,...glyph})))];assert.equal(capture.glyphs.length,expectedGlyphs.length);
  for(let index=0;index<expectedGlyphs.length;index++){
    const expected=expectedGlyphs[index],glyph=capture.glyphs[index],{samples,minContrast,...observed}=glyph;assert.deepEqual(observed,expected);finiteAtLeast(glyph.fontSize,11.99,'Raster glyph font');calloutRGB(glyph.rgb,'Glyph ink');assert(Number.isFinite(glyph.alpha)&&glyph.alpha>0&&glyph.alpha<=1);assert.equal(samples.length,glyph.witnesses.length);assert(samples.length>=1);
    const contrasts=[];for(let sampleIndex=0;sampleIndex<samples.length;sampleIndex++){
      const witness=glyph.witnesses[sampleIndex],sample=samples[sampleIndex];near(sample.x,witness.x,'Glyph sample X');near(sample.y,witness.y,'Glyph sample Y');calloutRGB(witness.before,'Glyph prepaint surface');calloutRGB(witness.rgb,'Immediate glyph paint');assert(witness.alpha>=250/255&&witness.alpha<=1,'Solid glyph stencil witness');const alpha=glyph.alpha*witness.alpha,composite=glyph.rgb.map((value,index)=>Math.round(value*alpha+witness.before[index]*(1-alpha)));assert.deepEqual(witness.expected,composite,'Independent solid glyph compositing');assert.equal(witness.channelError,calloutError(witness.rgb,composite));assert(witness.channelError<=6,'Actual glyph matches its independent stencil');
      const rgb=actual(sample);immediatePaint(witness,sample);for(const key of ['before','expected','alpha','paintNeighbors'])assert.deepEqual(sample[key],witness[key]);
      const ideal=contrastRatio(glyph.rgb.map((value,index)=>value*glyph.alpha+witness.before[index]*(1-glyph.alpha)),witness.before),painted=contrastRatio(rgb,witness.before);near(witness.contrast,ideal,'Glyph ideal contrast');near(sample.contrast,painted,'Actual saved glyph contrast');finiteAtLeast(ideal,textFloor,'Actual glyph ink contrast');finiteAtLeast(painted,textFloor,'Saved glyph pixel contrast');contrasts.push(painted);actualText.push(painted);reportedText.push(painted);
    }near(minContrast,Math.min(...contrasts),'Saved glyph contrast minimum');
  }
  assert.equal(capture.cardPanels.length,geometry.annotated.length);
  for(let index=0;index<capture.cardPanels.length;index++){const panel=capture.cardPanels[index],annotation=geometry.annotated[index],card=annotation.card,inset=3*sx;assert.equal(panel.id,annotation.id);assert.deepEqual(panel.card,card);assert.equal(panel.samples.length,4);const locations=[{x:card.x+card.width/2,y:card.y+inset},{x:card.x+card.width/2,y:card.y+card.height-inset},{x:card.x+inset,y:card.y+card.height/2},{x:card.x+card.width-inset,y:card.y+card.height/2}];for(let sampleIndex=0;sampleIndex<4;sampleIndex++){const sample=panel.samples[sampleIndex],location=locations[sampleIndex];near(sample.x,location.x,'Panel sample X');near(sample.y,location.y,'Panel sample Y');const rgb=actual(sample),error=calloutError(rgb,card.rgb);assert.deepEqual(sample.expected,card.rgb);assert.equal(sample.channelError,error);assert(error<=4,'Saved panel must preserve opaque original surface');}}
  function sceneSurface(leader,sample,retain=true){
    const segment=leader.segments[0],middle={x:(segment.from.x+segment.to.x)/2,y:(segment.from.y+segment.to.y)/2};assert.deepEqual(sample.leaderMiddle,middle);near(sample.distance,Math.hypot(sample.x-middle.x,sample.y-middle.y),'Observed scene distance');assert.equal(sample.clearOfObservedPaint,true);assert(sample.x>=draw.view.x+4&&sample.x<=draw.width-24&&sample.y>=draw.layout.plotTop+4&&sample.y<=draw.view.groundY-4,'Visible scene sample inside plot');
    const glyphBoxes=draw.text.map(glyph=>({x:glyph.left,y:glyph.top,width:glyph.right-glyph.left,height:glyph.bottom-glyph.top}));for(const box of [...draw.cards,...glyphBoxes,...capture.points])assert(!calloutContains(box,sample,2),'Scene witness must clear every actual panel, glyph, and original point');
    const pixelBox={x:sample.x-.5,y:sample.y-.5,width:1,height:1};for(const stroke of draw.strokes)for(const segment of stroke.segments)assert(!calloutLineHits(segment.from,segment.to,pixelBox,stroke.width/2+3),'Scene witness must clear observed actual strokes');const rgb=actual(sample,retain);assert(rgb.every((value,channel)=>value<=[30,50,75][channel]),'Actual leader scene witness must retain dark surface');return rgb;
  }
  assert.equal(capture.leaders.length,geometry.annotated.length);
  for(let index=0;index<capture.leaders.length;index++){
    const proof=capture.leaders[index],annotation=geometry.annotated[index],{id,samples,surfaceWitness,minContrast,minOverlapContrast,...leader}=proof;assert.equal(id,annotation.id);assert.deepEqual(leader,annotation.leader);assert.equal(samples.length,3);assert.equal(leader.witnesses.length,3);calloutRGB(leader.rgb,'Leader ink');assert(Number.isFinite(leader.alpha)&&leader.alpha>0&&leader.alpha<=1);const ratios=[],overlaps=[];
    // Samples enter the native-equality inventory in the same paint order as the capture.
    for(let sampleIndex=0;sampleIndex<3;sampleIndex++){const sample=samples[sampleIndex],witness=leader.witnesses[sampleIndex],segment=leader.segments[0],fraction=[.25,.5,.75][sampleIndex],predicted={x:segment.from.x+(segment.to.x-segment.from.x)*fraction,y:segment.from.y+(segment.to.y-segment.from.y)*fraction};near(sample.x,witness.x,'Leader witness X');near(sample.y,witness.y,'Leader witness Y');const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,length=Math.hypot(dx,dy),along=((witness.x-segment.from.x)*dx+(witness.y-segment.from.y)*dy)/length,distanceToLine=Math.abs((witness.x-segment.from.x)*(-dy/length)+(witness.y-segment.from.y)*(dx/length));assert.equal(witness.fraction,fraction);near(witness.along,along,'Independent foreground body position');near(witness.distanceToLine,distanceToLine,'Independent foreground line distance');near(witness.startClearance,along,'Foreground start clearance');near(witness.cardBorderClearance,length-along,'Future own-card border clearance');assert(along>=.5&&length-along>=.75&&distanceToLine<=.5,'Saved foreground witness must lie on its actual body outside the future own-card stroke');const centerX=Math.floor(predicted.x*draw.backingWidth/draw.width),centerY=Math.floor(predicted.y*draw.backingHeight/draw.height),nativeX=Math.floor(witness.x*draw.backingWidth/draw.width),nativeY=Math.floor(witness.y*draw.backingHeight/draw.height);assert(Math.abs(nativeX-centerX)<=2&&Math.abs(nativeY-centerY)<=2,'Leader native witness must lie on its sampled original segment');calloutRGB(witness.before,'Leader prepaint surface');const expected=leader.rgb.map((value,index)=>Math.round(value*leader.alpha+witness.before[index]*(1-leader.alpha)));assert.deepEqual(witness.expected,expected);assert.equal(witness.channelError,calloutError(witness.rgb,expected));assert(witness.channelError<=8,'Physical leader contains its expected ink');const rgb=actual(sample);immediatePaint(witness,sample);finalNativePaint(witness,sample);for(const key of ['expected','before','changed','paintNeighbors','fraction','along','distanceToLine','startClearance','cardBorderClearance'])assert.deepEqual(sample[key],witness[key]);assert.equal(witness.changed,calloutError(witness.rgb,witness.before));near(witness.contrast,contrastRatio(witness.rgb,witness.before),'Immediate overlap contrast');near(sample.overlapContrast,contrastRatio(rgb,witness.before),'Saved overlap contrast');const visible=contrastRatio(rgb,surfaceWitness.rgb);near(sample.contrast,visible,'Saved leader contrast against visible scene');finiteAtLeast(visible,graphicFloor,'Saved leader scene contrast');ratios.push(visible);overlaps.push(sample.overlapContrast);leaderRatios.push(visible);overlapRatios.push(sample.overlapContrast);}
    sceneSurface(leader,surfaceWitness);near(minContrast,Math.min(...ratios),'Leader scene contrast minimum');near(minOverlapContrast,Math.min(...overlaps),'Leader overlap contrast minimum');
  }
  function survivingStroke(proof,stroke,id,threshold){
    const{samples,minContrast,id:reportedId,...observed}=proof;assert.equal(reportedId,id);assert.deepEqual(observed,stroke,'Surviving stroke must bind actual observed paint');assert(Array.isArray(stroke.finalWitnesses));assert.equal(samples.length,stroke.finalWitnesses.length);assert(samples.length>=(stroke.segments.length===4?6:2),'Enough actual final native ink witnesses');
    const ratios=[];for(let index=0;index<samples.length;index++){
      const witness=stroke.finalWitnesses[index],sample=samples[index];near(sample.x,witness.x,'Surviving stroke X');near(sample.y,witness.y,'Surviving stroke Y');assert([.25,.5,.75].includes(witness.fraction));assert((stroke.width>2?[-1,1]:[0]).includes(witness.side));
      const candidates=[];for(const segment of stroke.segments){const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
        const target={x:segment.from.x+dx*witness.fraction+nx*witness.side*1.1,y:segment.from.y+dy*witness.fraction+ny*witness.side*1.1},along=((witness.x-segment.from.x)*dx+(witness.y-segment.from.y)*dy)/length,distanceToLine=Math.abs((witness.x-segment.from.x)*nx+(witness.y-segment.from.y)*ny);
        const px=Math.floor(witness.x*draw.backingWidth/draw.width),py=Math.floor(witness.y*draw.backingHeight/draw.height),tx=Math.floor(target.x*draw.backingWidth/draw.width),ty=Math.floor(target.y*draw.backingHeight/draw.height);
        if(Math.abs(px-tx)>2||Math.abs(py-ty)>2||along<0||along>length)continue;if(stroke.width>2&&(distanceToLine<.7||distanceToLine>1.45)||stroke.width<=2&&distanceToLine>stroke.width/2)continue;candidates.push({distanceToLine,distance:Math.hypot(witness.x-target.x,witness.y-target.y)});
      }
      assert(candidates.some(candidate=>Math.abs(candidate.distanceToLine-witness.distanceToLine)<1e-7&&Math.abs(candidate.distance-witness.distance)<1e-7),'Final native witness must belong to an actual stroke segment and side');
      assert(witness.x>=draw.view.x+.25&&witness.x<=draw.width-20-.25&&witness.y>=draw.layout.plotTop+.25&&witness.y<=draw.view.groundY-.25,'Native final ink inside original visible plot clip');assert.deepEqual(witness.expected,stroke.rgb);assert.equal(witness.channelError,calloutError(witness.rgb,stroke.rgb));assert(witness.channelError<=4,'Opaque stroke remains in final native paint');
      const rgb=actual(sample);immediatePaint(witness,sample);for(const key of ['expected','distance','distanceToLine','fraction','side','paintNeighbors'])assert.deepEqual(sample[key],witness[key]);const surface=sceneSurface(stroke,sample.surfaceWitness,false),ratio=contrastRatio(rgb,surface);near(sample.contrast,ratio,'Saved final stroke scene contrast');if(threshold!==undefined)finiteAtLeast(ratio,threshold,'Saved selected crosshair scene contrast');ratios.push(ratio);
    }
    near(minContrast,Math.min(...ratios),'Surviving stroke contrast minimum');return{minimum:Math.min(...ratios),samples:samples.length};
  }
  const observedOutlines=geometry.annotated.filter(annotation=>annotation.outline);assert.equal(capture.outlines.length,observedOutlines.length);let outlineSamples=0;for(let index=0;index<observedOutlines.length;index++){const annotation=observedOutlines[index],result=survivingStroke(capture.outlines[index],annotation.outline,annotation.id+'-outline');outlineSamples+=result.samples;}
  const crosshairProof=survivingStroke(capture.crosshair,geometry.crosshair,'selected-crosshair',graphicFloor);near(capture.minCrosshairContrast,crosshairProof.minimum,'Capture original crosshair minimum contrast');

  assert.equal(capture.sky.length,4);const skyLocations=[{x:16,y:10},{x:draw.width-16,y:10},{x:16,y:draw.height-5},{x:draw.width-16,y:draw.height-5}];for(let index=0;index<4;index++){const sample=capture.sky[index];near(sample.x,skyLocations[index].x,'Opaque scene X');near(sample.y,skyLocations[index].y,'Opaque scene Y');assert(actual(sample).every((value,channel)=>value<=[30,50,75][channel]),'Saved canvas must retain its dark scene inside rounded parent');}
  const markerInk=theme==='contrast'?[255,255,0]:[103,232,249];const predictions=Array.from({length:16},(_,index)=>index*Math.PI/8).map(angle=>({x:geometry.projected.x+Math.cos(angle)*10*sx,y:geometry.projected.y+Math.sin(angle)*10*sy})).filter(point=>point.x>=draw.view.x*sx+.25&&point.x<=draw.width-20*sx-.25&&point.y>=draw.layout.plotTop*sy+.25&&point.y<=draw.view.groundY*sy-.25);assert.equal(capture.marker.length,predictions.length);assert(predictions.length>=2);
  for(let index=0;index<predictions.length;index++){const sample=capture.marker[index],predicted=predictions[index];near(sample.predicted.x,predicted.x,'Marker cardinal X');near(sample.predicted.y,predicted.y,'Marker cardinal Y');const{x:centerX,y:centerY}=sampleIndex(predicted),candidates=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const pixelX=centerX+dx,pixelY=centerY+dy;assert(pixelX>=0&&pixelX<pixels.width&&pixelY>=0&&pixelY<pixels.height);const rgb=pixels.at(pixelX,pixelY);candidates.push({x:clip.x+(pixelX+.5)/dpr-rasterOrigin.left,y:clip.y+(pixelY+.5)/dpr-rasterOrigin.top,pixelX,pixelY,rgb,channelError:calloutError(rgb,markerInk)});}candidates.sort((a,b)=>a.channelError-b.channelError||Math.hypot(a.x-predicted.x,a.y-predicted.y)-Math.hypot(b.x-predicted.x,b.y-predicted.y));const chosen=candidates[0];for(const key of ['pixelX','pixelY','channelError'])assert.equal(sample[key],chosen[key]);near(sample.x,chosen.x,'Selected marker X');near(sample.y,chosen.y,'Selected marker Y');assert.deepEqual(sample.expected,markerInk);assert.deepEqual(sample.rgb,chosen.rgb);actual(sample);assert(chosen.channelError<=4,'Original marker must be painted');const contrast=contrastRatio(chosen.rgb,capture.sky[0].rgb);near(sample.contrast,contrast,'Original marker contrast');finiteAtLeast(contrast,graphicFloor,'Saved original marker contrast');markerRatios.push(contrast);}
  assert.equal(capture.liveCanvasPixels.length,all.length,'Every saved witness must have actual native compositor input evidence');for(let index=0;index<all.length;index++){const proof=capture.liveCanvasPixels[index],sample=all[index];assert.equal(proof.pixelX,sample.pixelX);assert.equal(proof.pixelY,sample.pixelY);assert.equal(proof.inputs.length,4);const projected=projection(sample.pixelX,sample.pixelY,proof.inputs,proof);assert(calloutError(projected.rgba.slice(0,3),sample.rgb)<=4,'Saved PNG retains independently projected final native canvas paint');}
  near(capture.minFont,Math.min(...capture.glyphs.map(glyph=>glyph.fontSize)),'Capture minimum font');near(capture.minTextContrast,Math.min(...reportedText),'Capture minimum saved text contrast');near(capture.minLeaderContrast,Math.min(...capture.leaders.map(leader=>leader.minContrast)),'Capture minimum leader scene contrast');near(capture.minMarkerContrast,Math.min(...markerRatios),'Capture minimum marker contrast');
  calloutPaintResults.push({screenshot:relative(file),minFont:capture.minFont,minTextContrast:capture.minTextContrast,minPaintedTextContrast:Math.min(...actualText),minLeaderContrast:Math.min(...leaderRatios),minLeaderOverlapContrast:Math.min(...overlapRatios),minMarkerContrast:Math.min(...markerRatios),glyphs:capture.glyphs.length,panels:capture.cardPanels.length,leaders:capture.leaders.length,markerSamples:capture.marker.length,outlines:capture.outlines.length,outlineSamples,crosshairSamples:crosshairProof.samples,minCrosshairContrast:crosshairProof.minimum,rasterCalibrationAnchors:calibrationAnchors.length,rasterCalibrationPixels:residuals.length,maxRasterCalibrationResidual:transform.maxResidual,witnesses:all.length});return geometry;
}

check('Nine callout layouts and eight edge captures preserve actual glyph, panel, leader and original-marker paint',()=>{
  const visuals=readJson(path.join(report,'visual-results.json'));if(!visuals)return;for(const key of ['sourceSha256','mirrorSha256','finalSourceSha256','finalMirrorSha256'])assert.equal(visuals[key],sourcePin,key);for(const key of ['specSha256','finalSpecSha256'])assert.equal(visuals[key],testPins['tests/e2e/physics-canvas-callouts.spec.ts'],key);for(const key of ['sourceStable','mirrorStable','specStable'])assert.equal(visuals[key],true,key);assert.deepEqual(visuals.errors,[]);assert.deepEqual(visuals.configurations.map(item=>item.theme+'/'+item.width).sort(),[...combinations].sort());
  let original;for(const configuration of visuals.configurations){assert.equal(configuration.id,configuration.theme+'-'+configuration.width);assert.equal(configuration.originalEvidenceUnchanged,true);assert.equal(configuration.captures.length,3);const moments=['launch','apex','impact'];for(let index=0;index<3;index++){const capture=configuration.captures[index],proof=calloutRasterProof(capture,'callout-'+configuration.theme+'-'+configuration.width+'-'+moments[index]+'.png',configuration.theme);if(!proof)return;assert.equal(capture.draw.viewportWidth,configuration.width);assert.equal(proof.index,index===0?0:index===1?proof.apexIndex:proof.trail.points.length-1);assert.equal(proof.trail.parameters.angle,45);assert.equal(proof.trail.parameters.velocity,25);assert.equal(proof.trail.parameters.gravity,9.8);assert.equal(proof.trail.parameters.launchHeight,0);assert.equal(proof.trail.parameters.drag,false);if(!original)original=proof.trail;else assert.deepEqual(proof.trail,original,'Every width and theme must retain the same original completed recording');}
    for(const key of ['minFont','minTextContrast','minLeaderContrast','minMarkerContrast'])near(configuration[key],Math.min(...configuration.captures.map(capture=>capture[key])),'Configuration '+key);
  }
  const edgeIds=['horizontal-release','horizontal-impact','drag-launch','drag-apex','drag-impact','unfinished-latest','dense-overlays','dense-long-token'];assert.deepEqual(visuals.edgeCases.map(capture=>capture.id).sort(),[...edgeIds].sort());let drag,dense;
  for(const capture of visuals.edgeCases){const id=capture.id,theme=id.startsWith('drag-')?'contrast':'default',proof=calloutRasterProof(capture,id+'.png',theme);if(!proof)return;const{trail,index,point,draw}=proof;
    if(id.startsWith('horizontal-')){assert.equal(trail.parameters.angle,0);assert.equal(trail.parameters.launchHeight,10);assert.equal(proof.apexIndex,0);assert.equal(index,id==='horizontal-release'?0:trail.points.length-1);assert.equal(draw.selected.apex,id==='horizontal-release');}
    if(id.startsWith('drag-')){assert.equal(trail.parameters.drag,true);for(const[key,value]of Object.entries({angle:60,velocity:30,gravity:3.7,mass:2.5,launchHeight:25}))assert.equal(trail.parameters[key],value);assert.equal(index,id==='drag-launch'?0:id==='drag-apex'?proof.apexIndex:trail.points.length-1);if(!drag)drag=trail;else assert.deepEqual(trail,drag);assert.equal(draw.preview.kind,'reference');for(const key of ['angle','velocity','gravity','launchHeight'])assert.equal(draw.preview[key],trail.parameters[key],'Reference retains captured parameter');}
    if(id==='unfinished-latest'){assert.equal(trail.run,null);assert.equal(trail.apex,undefined);assert.equal(index,trail.points.length-1);assert(point.mVy>0);assert.equal(draw.launched,true);assert.equal(draw.selected.apex,false);assert.equal(draw.selected.impact,false);}
    if(id.startsWith('dense-')){assert.equal(trail.run,3);assert.equal(index,proof.apexIndex);const routes=proof.annotated.filter(annotation=>annotation.id.startsWith('run-'));assert(routes.length>0,'At least one original comparison route is actually labeled');if(!dense)dense=trail;else assert.deepEqual(trail,dense);if(id==='dense-long-token')for(const route of routes)assert(route.text.map(glyph=>glyph.text).join('').includes('ComparisonRecordingWithoutWhitespaceABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),'Wrapped route text retains the complete translated token');}
  }
  assert.equal(calloutPaintResults.length,35,'Every new canvas capture must decode and pass real paint verification');summary.calloutCaptures=35;summary.calloutGlyphs=calloutPaintResults.reduce((sum,item)=>sum+item.glyphs,0);summary.calloutPanels=calloutPaintResults.reduce((sum,item)=>sum+item.panels,0);summary.calloutLeaders=calloutPaintResults.reduce((sum,item)=>sum+item.leaders,0);summary.calloutMarkerSamples=calloutPaintResults.reduce((sum,item)=>sum+item.markerSamples,0);summary.calloutPixelWitnesses=calloutPaintResults.reduce((sum,item)=>sum+item.witnesses,0);summary.calloutOutlines=calloutPaintResults.reduce((sum,item)=>sum+item.outlines,0);summary.calloutOutlineSamples=calloutPaintResults.reduce((sum,item)=>sum+item.outlineSamples,0);summary.calloutCrosshairSamples=calloutPaintResults.reduce((sum,item)=>sum+item.crosshairSamples,0);
  summary.visualReports.callouts={configurations:9,edgeCases:8,captures:35,minFont:Math.min(...calloutPaintResults.map(item=>item.minFont)),minTextContrast:Math.min(...calloutPaintResults.map(item=>item.minTextContrast)),minPaintedTextContrast:Math.min(...calloutPaintResults.map(item=>item.minPaintedTextContrast)),minLeaderContrast:Math.min(...calloutPaintResults.map(item=>item.minLeaderContrast)),minLeaderOverlapContrast:Math.min(...calloutPaintResults.map(item=>item.minLeaderOverlapContrast)),minCrosshairContrast:Math.min(...calloutPaintResults.map(item=>item.minCrosshairContrast)),minMarkerContrast:Math.min(...calloutPaintResults.map(item=>item.minMarkerContrast)),actualGlyphClearance:true,actualPointClearance:true,actualVectorClearance:true,actualPanelAndLeaderPaint:true,actualOutlineAndCrosshairPaint:true,independentClipAndBilinearProjection:true,originalEvidenceUnchanged:true};
});

check('Nine inspection layouts, actual keyboard outline raster, targets and selected gradient paint',primaryVisualReport);
check('Nine unchanged trail layouts, 18 positive PNGs and one reproduced blank negative control',()=>visualReport(path.join(report,'trail-regression'),'trails'));
const phaseScreenshots=['selected-launch.png','selected-rising.png','selected-apex.png','selected-near-apex.png','selected-falling.png','selected-impact.png','selected-after-six-control-changes.png','horizontal-release-unresolved.png','horizontal-release-canonical-apex.png','unfinished-highest-rising.png'];
check('Nine point layouts and ten original-event screenshots',()=>{const directory=path.join(report,'point-regression');visualReport(directory,'points');phaseScreenshots.forEach(file=>png(path.join(directory,file)));});
check('All designated previous reports remain byte-identical',()=>{
  if(!manifest||!integrity){missing.add(relative(path.join(report,'preservation-baseline.json')));return;}
  const actual=protectedFiles();assert.deepEqual(actual,manifest.historical);assert.deepEqual(integrity.historical,manifest.historical);assert.equal(integrity.historicalFilesPreserved,actual.length);assert.equal(manifest.historicalFilesPreserved,actual.length);
  const prior=actual.filter(item=>item.category==='prior-visuals');assert.equal(prior.length,51);assert.equal(prior.filter(item=>item.path.endsWith('.png')).length,47);assert.equal(prior.filter(item=>item.path.endsWith('/visual-results.json')).length,4);
  for(const item of actual)dependency(item.path,item.sha256);summary.historicalFilesPreserved=actual.length;summary.historicalVisualFilesPreserved=51;summary.previousTrailReportFilesPreserved=71;summary.previousInspectionReportFilesPreserved=actual.filter(item=>item.category==='completed-inspection-report').length;
});
check('CI includes the new spec with one worker and no retries',()=>{const bytes=dependency('.github/workflows/physics.yml');if(!bytes)return;const workflow=bytes.toString('utf8'),command=workflow.match(/^\s*run:\s*(npx playwright test .+)$/m);assert(command);for(const file of Object.keys(testPins))assert(command[1].split(/\s+/).includes(file),'CI browser entry missing: '+file);assert(command[1].includes('--workers=1'));assert(command[1].includes('--retries=0'));});
check('Runner, verifier, private config and visual JSON hashes',()=>{dependency(relative(__filename));dependency(relative(path.join(report,'run-checks.cjs')));dependency(relative(path.join(report,'playwright.config.ts')));for(const directory of [report,path.join(report,'inspection-regression'),path.join(report,'trail-regression'),path.join(report,'point-regression')])dependency(relative(path.join(directory,'visual-results.json')));});

check('The initial sandbox browser-startup archive remains byte-identical and distinct from application evidence',()=>{
  const directory=path.join(report,'initial-sandbox-browser-startup'),proofPath=path.join(directory,'archive-integrity.json'),bytes=dependency(relative(proofPath),'c14be1fa94dc174df87a2a64c740269c5cb7e0a41886d11858d514534d9ccd57');if(!bytes)return;const archive=JSON.parse(bytes),originalSource='a77166ff17fbd9f9547c5b84b74975295678d27f00b1e11a104f8eaca691fc00';
  assert.equal(archive.schemaVersion,1);assert.equal(archive.applicationLoaded,false);assert.equal(archive.unitTestsPassed,356);assert.equal(archive.unitFilesPassed,21);assert.equal(archive.browserStage,'callouts');assert.equal(archive.sourceSha256,originalSource);assert.equal(archive.mirrorSha256,originalSource);assert.equal(archive.sourceAndTestsUnchanged,true);assert.equal(archive.activeHelperAndProofFilesUnchanged,true);assert.equal(archive.historicalFilesPreserved,601);assert.deepEqual(archive.historical,protectedFiles(),'The archive must describe the same preserved previous reports');
  assert(Array.isArray(archive.archived));assert.equal(archive.archivedFiles,44);assert.equal(archive.archived.length,44);assert.equal(new Set(archive.archived.map(item=>item.path)).size,44);assert.equal(archive.archiveInventorySha256,'3236c25ad6dcac12f615985c04beb510a44b1efc4c62e6e7272a36f75c2139e5');assert.equal(digest(Buffer.from(JSON.stringify(archive.archived))),archive.archiveInventorySha256,'Pinned archive inventory changed');
  const actual=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{assert(entry.isFile(),'Unsupported archived entry');if(file!==proofPath)actual.push(relative(file));}}}walk(directory);assert.deepEqual(actual.sort(),archive.archived.map(item=>item.path).sort(),'All archived files must appear in the pinned inventory');
  for(const item of archive.archived){const absolute=path.resolve(root,item.path),within=path.relative(directory,absolute);assert(within&&!within.startsWith('..')&&!path.isAbsolute(within),'Archive inventory escapes its directory');const input=path.resolve(root,item.inputPath),inputWithin=path.relative(root,input);assert(inputWithin&&!inputWithin.startsWith('..')&&!path.isAbsolute(inputWithin),'Original archive input escapes the repository');assert(['copied','moved'].includes(item.mode));const fileBytes=dependency(item.path,item.sha256);if(!fileBytes)continue;assert.equal(fileBytes.length,item.bytes);}
  const archivedManifest=readJson(path.join(directory,'preservation-baseline.json')),archivedIntegrity=readJson(path.join(directory,'check-integrity.json')),archivedUnits=readJson(path.join(directory,'unit-results.json')),archivedBrowser=readJson(path.join(directory,'callout-results.json'));if(!archivedManifest||!archivedIntegrity||!archivedUnits||!archivedBrowser)return;
  assert.equal(digest(fs.readFileSync(path.join(directory,'preservation-baseline.json'))),archive.preparedRunManifestSha256);assert.equal(digest(fs.readFileSync(path.join(directory,'check-integrity.json'))),archive.preparedRunIntegritySha256);assert.equal(archivedIntegrity.manifestSha256,archive.preparedRunManifestSha256);assert.equal(archivedManifest.sourceSha256,originalSource);assert.equal(archivedIntegrity.sourceSha256,originalSource);assert.deepEqual(archivedManifest.historical,archive.historical);assert.deepEqual(archivedIntegrity.historical,archive.historical);assert.deepEqual(archivedIntegrity.finalSnapshot,archivedManifest.snapshot);
  assert.deepEqual(Object.keys(archivedIntegrity.stages).sort(),['callouts','unit']);for(const name of ['unit','callouts']){const records=archivedIntegrity.stages[name];assert.equal(records.length,1);const record=records[0];assert.equal(record.status,name==='unit'?'passed':'failed');assert.equal(record.exitCode,name==='unit'?0:1);assert.deepEqual(record.before,archivedManifest.snapshot);assert.deepEqual(record.after,archivedManifest.snapshot);const result=path.join(directory,name==='unit'?'unit-results.json':'callout-results.json');assert.equal(digest(fs.readFileSync(result)),record.resultSha256);}
  const units=identities(archivedUnits,'Archived sandbox attempt units');assert.equal(units.tests.size,356);assert.equal(units.files.size,21);const errors=[];function visit(suite){for(const spec of suite.specs||[])for(const test of spec.tests||[])for(const result of test.results||[])for(const error of result.errors||[])errors.push(error.message||'');for(const child of suite.suites||[])visit(child);}for(const suite of archivedBrowser.suites||[])visit(suite);assert(errors.some(error=>error===archive.browserStartupError&&error.includes("Executable doesn't exist")&&error.includes('ms-playwright')),'Archived browser failure must be a missing executable before application loading');
  for(const[file,pin]of Object.entries(archivedManifest.snapshot.fileHashes)){if(file.startsWith('tests/'))assert.equal(digest(fs.readFileSync(path.join(directory,'test-snapshot',file))),pin,'Archived test snapshot differs from the original invocation');}
  assert.equal(digest(fs.readFileSync(path.join(directory,'physics-source.js'))),originalSource);assert.equal(digest(fs.readFileSync(path.join(directory,'physics-desktop-source.js'))),originalSource);assert.equal(digest(fs.readFileSync(path.join(directory,'source-before-callouts.js'))),'0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28');assert.equal(digest(fs.readFileSync(path.join(directory,'inspection-regression/before-canvas-capture-fix/moment-focus-default-320.png'))),blankCanvasPin);
  summary.startupArchive={path:relative(directory),filesPreserved:44,integritySha256:digest(bytes),inventorySha256:archive.archiveInventorySha256,unitTestsPassed:356,unitFilesPassed:21,applicationLoaded:false,missingExecutableConfirmed:true,allOriginalEvidencePreserved:true};
});


check('The capture-bounds failure archive preserves its original application evidence and complete actual invocation',()=>{
  const directory=path.join(report,'before-canvas-bounds-fix'),proofPath=path.join(directory,'archive-integrity.json'),bytes=dependency(relative(proofPath),'004d89f163ede7efc113bfeb567e1e6eceb498f23ea6792e5dd7980f5388c272');if(!bytes)return;const archive=JSON.parse(bytes),originalSource='a77166ff17fbd9f9547c5b84b74975295678d27f00b1e11a104f8eaca691fc00';
  assert.equal(archive.schemaVersion,1);assert.equal(archive.applicationLoaded,true);assert.equal(archive.unitTestsPassed,356);assert.equal(archive.unitFilesPassed,21);assert.equal(archive.browserStage,'callouts');assert.equal(archive.browserCasesPassed,0);assert.equal(archive.sourceSha256,originalSource);assert.equal(archive.mirrorSha256,originalSource);assert.equal(archive.sourceAndTestsUnchanged,true);assert.equal(archive.activeHelperAndProofFilesUnchanged,true);assert.equal(archive.historicalFilesPreserved,601);assert.deepEqual(archive.historical,protectedFiles());assert.deepEqual(archive.startupArchivePreserved,{integritySha256:'c14be1fa94dc174df87a2a64c740269c5cb7e0a41886d11858d514534d9ccd57',inventorySha256:'3236c25ad6dcac12f615985c04beb510a44b1efc4c62e6e7272a36f75c2139e5',files:44});
  assert(Array.isArray(archive.archived));assert.equal(archive.archivedFiles,125);assert.equal(archive.archived.length,125);assert.equal(new Set(archive.archived.map(item=>item.path)).size,125);assert.equal(archive.archiveInventorySha256,'354a04a08f5339494b55250a0adc14a2688a88ff37b8b4fbca4e1fa73a836893');assert.equal(digest(Buffer.from(JSON.stringify(archive.archived))),archive.archiveInventorySha256);
  const actual=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{assert(entry.isFile());if(file!==proofPath)actual.push(relative(file));}}}walk(directory);assert.deepEqual(actual.sort(),archive.archived.map(item=>item.path).sort(),'Every actual capture-attempt output must remain archived');
  for(const item of archive.archived){const absolute=path.resolve(root,item.path),within=path.relative(directory,absolute);assert(within&&!within.startsWith('..')&&!path.isAbsolute(within));const inputWithin=path.relative(root,path.resolve(root,item.inputPath));assert(inputWithin&&!inputWithin.startsWith('..')&&!path.isAbsolute(inputWithin));assert(['copied','moved'].includes(item.mode));const fileBytes=dependency(item.path,item.sha256);if(fileBytes)assert.equal(fileBytes.length,item.bytes);}
  const archivedManifest=readJson(path.join(directory,'preservation-baseline.json')),archivedIntegrity=readJson(path.join(directory,'check-integrity.json')),archivedUnits=readJson(path.join(directory,'unit-results.json')),archivedBrowser=readJson(path.join(directory,'callout-results.json'));if(!archivedManifest||!archivedIntegrity||!archivedUnits||!archivedBrowser)return;
  assert.equal(digest(fs.readFileSync(path.join(directory,'preservation-baseline.json'))),archive.preparedRunManifestSha256);assert.equal(digest(fs.readFileSync(path.join(directory,'check-integrity.json'))),archive.preparedRunIntegritySha256);assert.equal(archivedIntegrity.manifestSha256,archive.preparedRunManifestSha256);assert.equal(archivedManifest.sourceSha256,originalSource);assert.equal(archivedIntegrity.sourceSha256,originalSource);assert.deepEqual(archivedManifest.historical,archive.historical);assert.deepEqual(archivedIntegrity.historical,archive.historical);assert.deepEqual(archivedIntegrity.finalSnapshot,archivedManifest.snapshot);
  assert.deepEqual(Object.keys(archivedIntegrity.stages).sort(),['callouts','unit']);for(const name of ['unit','callouts']){const records=archivedIntegrity.stages[name];assert.equal(records.length,1);const record=records[0];assert.equal(record.status,name==='unit'?'passed':'failed');assert.equal(record.exitCode,name==='unit'?0:1);assert.deepEqual(record.before,archivedManifest.snapshot);assert.deepEqual(record.after,archivedManifest.snapshot);const result=path.join(directory,name==='unit'?'unit-results.json':'callout-results.json');assert.equal(digest(fs.readFileSync(result)),record.resultSha256);}
  const units=identities(archivedUnits,'Archived capture-bounds attempt units');assert.equal(units.tests.size,356);assert.equal(units.files.size,21);assert.equal(archivedBrowser.stats.expected,0);assert.equal(archivedBrowser.stats.unexpected,1);assert.equal(archivedBrowser.stats.skipped,4);const errors=[];function visit(suite){for(const spec of suite.specs||[])for(const test of spec.tests||[])for(const result of test.results||[])for(const error of result.errors||[])errors.push(error.message||'');for(const child of suite.suites||[])visit(child);}for(const suite of archivedBrowser.suites||[])visit(suite);assert(errors.some(error=>error===archive.browserCaptureError&&error.replace(/\u001b\[[0-9;]*m/g,'').includes('Expected: 952')&&error.replace(/\u001b\[[0-9;]*m/g,'').includes('Received: 954')),'Archived assertion must preserve the real 954-versus952 bounds mismatch');
  for(const[file,pin]of Object.entries(archivedManifest.snapshot.fileHashes)){if(file.startsWith('tests/'))assert.equal(digest(fs.readFileSync(path.join(directory,'test-snapshot',file))),pin);}
  assert.equal(digest(fs.readFileSync(path.join(directory,'physics-source.js'))),originalSource);assert.equal(digest(fs.readFileSync(path.join(directory,'physics-desktop-source.js'))),originalSource);assert.equal(digest(fs.readFileSync(path.join(directory,'source-before-callouts.js'))),'0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28');assert.equal(digest(fs.readFileSync(path.join(directory,'inspection-regression/before-canvas-capture-fix/moment-focus-default-320.png'))),blankCanvasPin);
  const capturePath=path.join(directory,'callout-default-1100-launch.png'),pixels=screenshotPixels(capturePath);if(!pixels)return;assert.equal(pixels.width,1388);assert.equal(pixels.height,954);assert.deepEqual(archive.actualPNGDimensions,{width:pixels.width,height:pixels.height});assert.equal(archive.expectedBackingHeight,952);
  summary.boundsCaptureArchive={path:relative(directory),filesPreserved:125,integritySha256:digest(bytes),inventorySha256:archive.archiveInventorySha256,unitTestsPassed:356,unitFilesPassed:21,applicationLoaded:true,captureAssertionFailed:true,diagnosticPNG:{path:relative(capturePath),sha256:digest(fs.readFileSync(capturePath)),width:pixels.width,height:pixels.height,expectedBackingHeight:952},allOriginalEvidencePreserved:true};
});


check('The clip-path recorder failure archive preserves all actual application evidence and original invocation inputs',()=>{
  const directory=path.join(report,'before-clip-path-test-fix'),proofPath=path.join(directory,'archive-integrity.json'),bytes=dependency(relative(proofPath),'e83c97e56ff92c705d2082b76f9b64ba2ff29ef72b7d3fdfbf48b2971b931547');if(!bytes)return;
  const archive=JSON.parse(bytes),originalSource='90d7922145112ef4c87b0f84c579cc413ed9fa5aa0b2d33a04386dcd9ceacd4b',originalLayoutTest='fdf29af0b0db3170c4b0e2f9fac229ed3ab6579f4011d8ad759bfac78d954fb7';
  assert.equal(archive.schemaVersion,1);assert.equal(archive.applicationLoaded,true);assert.equal(archive.sourceSha256,originalSource);assert.equal(archive.mirrorSha256,originalSource);assert.equal(archive.legacyLayoutTestSha256,originalLayoutTest);assert.equal(archive.calloutTestSha256,'bec3b5fba4c000d156c07f31c4fefff83b790da25a2222cf85ca36b17e7a1531');assert.equal(archive.unitTestsPassed,356);assert.equal(archive.unitFilesPassed,21);assert.equal(archive.browserStage,'regression');assert.equal(archive.sourceAndTestsUnchanged,true);assert.equal(archive.activeHelperAndProofFilesUnchanged,true);assert.equal(archive.historicalFilesPreserved,601);assert.deepEqual(archive.historical,protectedFiles());
  const expectedStageResults={callouts:{passed:5,failed:0,skipped:0},inspection:{passed:5,failed:0,skipped:0},trail:{passed:4,failed:0,skipped:0},regression:{passed:13,failed:1,skipped:1},point:{invoked:false}};assert.deepEqual(archive.browserStageResults,expectedStageResults);
  assert.deepEqual(archive.olderArchivesPreserved,{'initial-sandbox-browser-startup':{files:44,integritySha256:'c14be1fa94dc174df87a2a64c740269c5cb7e0a41886d11858d514534d9ccd57',inventorySha256:'3236c25ad6dcac12f615985c04beb510a44b1efc4c62e6e7272a36f75c2139e5'},'before-canvas-bounds-fix':{files:125,integritySha256:'004d89f163ede7efc113bfeb567e1e6eceb498f23ea6792e5dd7980f5388c272',inventorySha256:'354a04a08f5339494b55250a0adc14a2688a88ff37b8b4fbca4e1fa73a836893'}});
  assert.equal(archive.archivedFiles,1673);assert.equal(archive.archived.length,1673);assert.equal(new Set(archive.archived.map(item=>item.path)).size,1673);assert.equal(archive.archiveInventorySha256,'369e3f2de56ac4885fd5683654a1acb8f5e3efeb84a202f79986e0911760f961');assert.equal(digest(Buffer.from(JSON.stringify(archive.archived))),archive.archiveInventorySha256);
  const actual=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{assert(entry.isFile(),'Unsupported archived entry');if(file!==proofPath)actual.push(relative(file));}}}walk(directory);assert.deepEqual(actual.sort(),archive.archived.map(item=>item.path).sort(),'Every actual file in the failed full run must be inventoried');
  const inventory=new Map();for(const item of archive.archived){const absolute=path.resolve(root,item.path),within=path.relative(directory,absolute),inputWithin=path.relative(root,path.resolve(root,item.inputPath));assert(within&&!within.startsWith('..')&&!path.isAbsolute(within),'Archive file escapes its directory');assert(inputWithin&&!inputWithin.startsWith('..')&&!path.isAbsolute(inputWithin),'Original input escapes the repository');assert(['copied','moved'].includes(item.mode));const input=dependency(item.path,item.sha256);if(input)assert.equal(input.length,item.bytes);inventory.set(item.path,item);}
  assert.equal(archive.archived.filter(item=>item.mode==='copied').length,38);assert.equal(archive.archived.filter(item=>item.mode==='moved').length,1635);assert.deepEqual(archive.snapshotCopies,archive.archived.filter(item=>item.mode==='copied').sort((a,b)=>archive.snapshotCopies.findIndex(c=>c.path===a.path)-archive.snapshotCopies.findIndex(c=>c.path===b.path)));
  const archivedManifest=readJson(path.join(directory,'preservation-baseline.json')),archivedIntegrity=readJson(path.join(directory,'check-integrity.json')),archivedUnits=readJson(path.join(directory,'unit-results.json'));if(!archivedManifest||!archivedIntegrity||!archivedUnits)return;
  assert.equal(digest(fs.readFileSync(path.join(directory,'preservation-baseline.json'))),archive.preparedRunManifestSha256);assert.equal(digest(fs.readFileSync(path.join(directory,'check-integrity.json'))),archive.preparedRunIntegritySha256);assert.equal(archivedIntegrity.manifestSha256,archive.preparedRunManifestSha256);assert.equal(archivedManifest.sourceSha256,originalSource);assert.equal(archivedIntegrity.sourceSha256,originalSource);assert.deepEqual(archivedIntegrity.testPins,archivedManifest.testPins);assert.equal(archivedManifest.testPins['tests/e2e/physics-visual-layout.spec.ts'],originalLayoutTest);assert.equal(archivedManifest.testPins['tests/e2e/physics-canvas-callouts.spec.ts'],archive.calloutTestSha256);assert.deepEqual(archivedManifest.historical,archive.historical);assert.deepEqual(archivedIntegrity.historical,archive.historical);assert.deepEqual(archivedIntegrity.finalSnapshot,archivedManifest.snapshot);
  for(const key of ['sourceUnchanged','mirrorMatches','testsUnchanged','modelPrefixUnchanged'])assert.equal(archivedIntegrity[key],true,key);
  const snapshot=archivedManifest.snapshot;assert.equal(snapshot.sourceSha256,originalSource);assert.equal(snapshot.mirrorSha256,originalSource);const requiredCopies=[];
  for(const[inputPath,pin]of Object.entries(snapshot.fileHashes)){let name;if(inputPath==='stem_lab/stem_tool_physics.js')name='physics-source.js';else if(inputPath==='desktop/web-app/public/stem_lab/stem_tool_physics.js')name='physics-desktop-source.js';else if(inputPath.startsWith(relative(report)+'/'))name=path.basename(inputPath);else name='test-snapshot/'+inputPath;const copiedPath=relative(path.join(directory,name)),item=inventory.get(copiedPath);assert(item&&item.mode==='copied');assert.equal(item.inputPath,inputPath);assert.equal(item.sha256,pin);requiredCopies.push(copiedPath);assert.equal(digest(fs.readFileSync(path.join(root,copiedPath))),pin,'Archived invocation input differs from original snapshot');}
  for(const name of ['verify-report.cjs','enhancement-integrity.json']){const copiedPath=relative(path.join(directory,name)),item=inventory.get(copiedPath);assert(item&&item.mode==='copied');assert.equal(item.sha256,archive.activeFilesPreserved[name]);requiredCopies.push(copiedPath);}assert.deepEqual(archive.snapshotCopies.map(item=>item.path).sort(),requiredCopies.sort(),'All test/helper/config/source/proof copies must be accounted for');
  for(const[inputPath,pin]of Object.entries(snapshot.fixtures)){const copiedPath=relative(path.join(directory,path.relative(report,path.resolve(root,inputPath)))),item=inventory.get(copiedPath);assert(item&&item.mode==='moved');assert.equal(item.inputPath,inputPath);assert.equal(item.sha256,pin);assert.equal(digest(fs.readFileSync(path.join(root,copiedPath))),pin);}
  const priorUnitsBytes=dependency(baselineUnitsPath,baselineUnitsPin);if(!priorUnitsBytes)return;const expectedUnits=identities(JSON.parse(priorUnitsBytes),'Prior complete units'),units=identities(archivedUnits,'Archived clip-path attempt units');assert.equal(units.tests.size,356);assert.equal(units.files.size,21);assert.deepEqual([...units.tests.keys()].sort(),[...expectedUnits.tests.keys()].sort());assert.deepEqual([...units.files.keys()].sort(),[...expectedUnits.files.keys()].sort());
  const sequence=['unit','callouts','inspection','trail','regression'];assert.deepEqual(Object.keys(archivedIntegrity.stages),sequence);let previous;const failedErrors=[];
  for(const name of sequence){const stage=stages[name],records=archivedIntegrity.stages[name];assert.equal(records.length,1,'Each failed-run stage was invoked once');const record=records[0];assert.equal(record.status,name==='regression'?'failed':'passed');assert.equal(record.exitCode,name==='regression'?1:0);assert.equal(record.nodeVersion,'v24.19.0');assert.deepEqual(record.before,snapshot);assert.deepEqual(record.after,snapshot);assert.equal(record.resultPath,relative(path.join(report,stage.result)));assert.equal(record.command[0],record.nodeExecutable);assert(Number.isFinite(Date.parse(record.startedAt))&&Number.isFinite(Date.parse(record.completedAt))&&Date.parse(record.completedAt)>=Date.parse(record.startedAt));if(previous)assert(Date.parse(record.startedAt)>=Date.parse(previous.completedAt),'Archived heavy checks were serial');previous=record;
    const expectedArguments=name==='unit'?['node_modules/vitest/vitest.mjs','run','tests/physics','--maxWorkers=1','--pool=threads','--no-file-parallelism','--testTimeout=30000','--hookTimeout=30000','--reporter=default','--reporter=json','--outputFile='+relative(path.join(report,stage.result))]:['node_modules/@playwright/test/cli.js','test',...stage.files.map(file=>'tests/e2e/'+file),'--config='+relative(path.join(report,'playwright.config.ts')),'--workers=1','--retries=0','--max-failures=1','--reporter=list,json','--output='+relative(path.join(report,name+'-artifacts'))];assert.deepEqual(record.command.slice(1),expectedArguments);
    const resultPath=path.join(directory,stage.result),resultBytes=dependency(relative(resultPath),record.resultSha256);if(!resultBytes)continue;assert.equal(resultBytes.length,record.resultBytes);const result=JSON.parse(resultBytes);assert.deepEqual(result.errors||[],[]);const start=name==='unit'?result.startTime:Date.parse(result.stats.startTime);assert(start>=Date.parse(record.startedAt)&&start<=Date.parse(record.completedAt));
    assert.deepEqual(Object.keys(record.visualArtifacts).sort(),visualArtifacts(name).map(relative).sort());for(const[inputPath,proof]of Object.entries(record.visualArtifacts)){const archivedPath=relative(path.join(directory,path.relative(report,path.resolve(root,inputPath)))),item=inventory.get(archivedPath);assert(item&&item.mode==='moved');assert.equal(item.inputPath,inputPath);assert.equal(item.sha256,proof.sha256);assert.equal(item.bytes,proof.bytes);assert(proof.modifiedAt>=Date.parse(record.startedAt));}
    if(name==='unit')continue;const expected=expectedStageResults[name];assert.equal(result.stats.expected,expected.passed);assert.equal(result.stats.unexpected,expected.failed);assert.equal(result.stats.skipped,expected.skipped);assert.equal(result.stats.flaky,0);const counts={passed:0,failed:0,skipped:0},files=new Set();function visit(suite){for(const spec of suite.specs||[]){files.add(path.basename(spec.file.replace(/\\/g,'/')));for(const test of spec.tests||[]){assert.equal(test.expectedStatus,'passed');assert(test.results.length<=1,'Archived browser case repeated');const last=test.results[0];if(!last){assert.equal(test.status,'skipped');counts.skipped++;continue;}assert.equal(last.retry,0);assert(['passed','failed','skipped'].includes(last.status));counts[last.status]++;assert.equal(test.status,last.status==='failed'?'unexpected':last.status==='skipped'?'skipped':'expected');if(last.status==='failed')for(const error of last.errors||[])failedErrors.push({title:spec.title,file:spec.file,line:spec.line,retry:last.retry,...error});else assert.deepEqual(last.errors||[],[]);}}for(const child of suite.suites||[])visit(child);}for(const suite of result.suites||[])visit(suite);assert.deepEqual(counts,expected);assert.deepEqual([...files].sort(),[...stage.files].sort());assert.equal(counts.passed+counts.failed+counts.skipped,stage.count);
  }
  assert.equal(failedErrors.length,1);assert.deepEqual(failedErrors[0],archive.regressionFailure);assert.equal(failedErrors[0].title,'changing a landed flight previews the next launch and hides annotations for off-screen measurements');assert.equal(path.basename(failedErrors[0].file),'physics-visual-layout.spec.ts');assert.equal(failedErrors[0].line,270);assert.equal(failedErrors[0].location.line,327);assert.equal(failedErrors[0].retry,0);assert(failedErrors[0].message.includes('16.65234375')&&failedErrors[0].message.includes('167.5')&&failedErrors[0].message.includes('16.173828125')&&failedErrors[0].message.includes('12.5'),'Preserve the actual glyph-hole rectangle mismatch');
  assert(!fs.existsSync(path.join(directory,'point-results.json')));assert(!fs.existsSync(path.join(directory,'point-artifacts')));assert(!fs.existsSync(path.join(directory,'point-regression')));assert.equal(archivedIntegrity.stages.point,undefined);
  summary.clipPathTestArchive={path:relative(directory),filesPreserved:1673,integritySha256:digest(bytes),inventorySha256:archive.archiveInventorySha256,unitTestsPassed:356,unitFilesPassed:21,browserStageResults:expectedStageResults,applicationLoaded:true,originalLayoutTestSha256:originalLayoutTest,originalSourceSha256:originalSource,recorderAssertionFailed:true,pointStageNotInvoked:true,allOriginalEvidencePreserved:true};
});

if(!missing.size&&!failures.length)check('Complete aggregate totals',()=>{assert.equal(summary.unitTests,356);assert.equal(summary.unitFiles,21);assert.equal(summary.historicalFilesPreserved,601);assert.equal(summary.previousInspectionReportFilesPreserved,479);assert.equal(summary.previousTrailReportFilesPreserved,71);assert.equal(summary.browserTests,35);assert.equal(browserFiles.size,7);assert.equal(screenshots.size,99);assert.equal(summary.calloutCaptures,35);assert.equal(summary.startupArchive.filesPreserved,44);assert.equal(summary.boundsCaptureArchive.filesPreserved,125);assert.equal(summary.clipPathTestArchive.filesPreserved,1673);assert.equal(summary.canvasCaptures,18);assert.equal(summary.canvasMarkerSamples,72);assert.equal(summary.canvasCaptureNegativeControl.originalMarkerMissing,true);assert.equal(diagnosticScreenshots.size,1);assert.equal(Object.keys(summary.visualReports).length,4);});
const status=failures.length?'failed':missing.size?'incomplete':'passed';const verification={status,passed:status==='passed',complete:missing.size===0,sourceSha256:sourcePin,baselineCommit,testPins,...summary,browserFiles:[...browserFiles].sort(),screenshots:Object.fromEntries(screenshots),diagnosticScreenshots:Object.fromEntries(diagnosticScreenshots),dependencies,checks,missing:[...missing].sort(),failures,scope:'Audits actual suite JSON and retained raster evidence without executing tests or modifying prior reports.',completedAt:new Date().toISOString()};
atomicJson(path.join(report,'verification.json'),verification);console.log(JSON.stringify(verification,null,2));process.exitCode=status==='passed'?0:status==='incomplete'?2:1;
