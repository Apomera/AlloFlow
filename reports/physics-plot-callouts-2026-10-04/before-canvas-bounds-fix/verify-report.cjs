// Read-only audit of actual suite JSON, source pins, raster evidence, and preserved prior reports.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),report=__dirname;
const sourcePin = 'a77166ff17fbd9f9547c5b84b74975295678d27f00b1e11a104f8eaca691fc00';
const baselineCommit = '54d638b3213b0fbd484305feff43b769da8902f7';
const baselineUnitsPath = 'reports/physics-point-clarity-2026-10-02/unit-results.json';
const baselineUnitsPin = '66e71b4c8a86d614661b9a83c025f540e45c0f5dbb2253f7b3e1f7730b05224d';
const testPins = {
  "tests/e2e/physics-canvas-callouts.spec.ts": "811e7400d04517ae4722d239b3908f1e013a8bbd640548cc2549baa04546e50a",
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
  const files = ['stem_lab/stem_tool_physics.js','desktop/web-app/public/stem_lab/stem_tool_physics.js',...baselineUnitFiles(),...Object.keys(testPins),relative(path.join(report,'source-before-callouts.js'))];
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
  for(const key of ['mirrorMatches','modelPrefixUnchanged','calloutLayoutImproved'])assert.equal(evidence[key],true,key);
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
    const attempts=integrity.stages[name];assert(Array.isArray(attempts)&&attempts.length>0,'No actual stage record: '+name);
    const record=attempts[attempts.length-1];assert.equal(record.status,'passed',name+' latest stage failed');assert.equal(record.exitCode,0);assert.equal(record.nodeVersion,'v24.19.0');
    assert.deepEqual(record.before,current);assert.deepEqual(record.after,current);assert.equal(record.resultPath,relative(path.join(report,stage.result)));
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
  const axes=draw.text.filter(glyph=>glyph.paintOrder<draw.cards[0].paintOrder&&(glyph.x<draw.view.x*sx||glyph.y>=draw.view.groundY*sy||glyph.text==='Height (m)'||glyph.text==='Distance (m)'));assert(axes.length>=4,'Actual axis glyph observations');
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
  });assert.deepEqual(capture.annotated,annotated);
  for(let index=0;index<annotated.length;index++)for(const other of annotated.slice(index+1)){const current=annotated[index];assert(!calloutOverlap(current.card,other.card,5.99*sx),'Cards need at least six CSS pixels separation');for(const segment of current.leader.segments)assert(!calloutLineHits(segment.from,segment.to,other.card,1.99*sx),'Leader crosses a different card');for(const segment of other.leader.segments)assert(!calloutLineHits(segment.from,segment.to,current.card,1.99*sx),'Leader crosses a different card');}
  for(const key of ['geometryVerified','selectedCardVisible','axisGlyphClearance','originalPointClearance','vectorClearance','otherLabelClearance','savedPaintVerified','originalEvidenceUnchanged'])assert.equal(capture[key],true,key);
  return{draw,trail,index,point,sx,sy,projected,axes,annotated,apexIndex};
}
function calloutRasterProof(capture,filename,theme){
  const file=path.join(report,filename);assert.equal(capture.filename,filename);assert.equal(path.resolve(capture.screenshot),file);assert.equal(capture.theme,theme);assert.equal(capture.sourceSha256,sourcePin);const bytes=dependency(relative(file),capture.screenshotSha256);if(!bytes)return;png(file);const pixels=screenshotPixels(file);if(!pixels)return;const geometry=calloutGeometry(capture),{draw,sx,sy}=geometry;assert.equal(capture.pixelWidth,pixels.width);assert.equal(capture.pixelHeight,pixels.height);assert.equal(draw.backingWidth,pixels.width);assert.equal(draw.backingHeight,pixels.height);assert(draw.generation>0);
  const textFloor=theme==='contrast'?7:4.5,graphicFloor=theme==='contrast'?7:3,all=[],actualText=[],reportedText=[],leaderRatios=[],markerRatios=[];
  function actual(sample){assert(Number.isFinite(sample.x)&&Number.isFinite(sample.y));const x=Math.floor(sample.x*pixels.width/draw.width),y=Math.floor(sample.y*pixels.height/draw.height);assert.equal(sample.pixelX,x);assert.equal(sample.pixelY,y);assert(x>=0&&x<pixels.width&&y>=0&&y<pixels.height,'Sample within saved canvas');const rgb=pixels.at(x,y);calloutRGB(sample.rgb,'Saved sample RGB');assert.deepEqual(sample.rgb,rgb,'Sample must match independently decoded saved pixels');all.push(sample);return rgb;}
  const expectedGlyphs=[...geometry.axes.map(glyph=>({kind:'axis',...glyph})),...geometry.annotated.flatMap(annotation=>annotation.text.map(glyph=>({kind:annotation.id,...glyph})))];assert.equal(capture.glyphs.length,expectedGlyphs.length);
  for(let index=0;index<expectedGlyphs.length;index++){
    const expected=expectedGlyphs[index],glyph=capture.glyphs[index],{samples,minContrast,...observed}=glyph;assert.deepEqual(observed,expected);finiteAtLeast(glyph.fontSize,11.99,'Raster glyph font');calloutRGB(glyph.rgb,'Glyph ink');assert(Number.isFinite(glyph.alpha)&&glyph.alpha>0&&glyph.alpha<=1);assert.equal(samples.length,glyph.witnesses.length);assert(samples.length>=1);
    const contrasts=[];for(let sampleIndex=0;sampleIndex<samples.length;sampleIndex++){
      const witness=glyph.witnesses[sampleIndex],sample=samples[sampleIndex];near(sample.x,witness.x,'Glyph sample X');near(sample.y,witness.y,'Glyph sample Y');calloutRGB(witness.before,'Glyph prepaint surface');calloutRGB(witness.rgb,'Immediate glyph paint');assert(witness.alpha>=250/255&&witness.alpha<=1,'Solid glyph stencil witness');const alpha=glyph.alpha*witness.alpha,composite=glyph.rgb.map((value,index)=>Math.round(value*alpha+witness.before[index]*(1-alpha)));assert.deepEqual(witness.expected,composite,'Independent solid glyph compositing');assert.equal(witness.channelError,calloutError(witness.rgb,composite));assert(witness.channelError<=6,'Actual glyph matches its independent stencil');
      const rgb=actual(sample),retainedError=calloutError(rgb,witness.rgb);assert.equal(sample.channelError,retainedError);assert(retainedError<=4,'Final PNG must retain immediately painted glyph');for(const key of ['before','expected','alpha','contrast'])assert.deepEqual(sample[key],witness[key]);
      const ideal=contrastRatio(glyph.rgb.map((value,index)=>value*glyph.alpha+witness.before[index]*(1-glyph.alpha)),witness.before),painted=contrastRatio(rgb,witness.before);near(witness.contrast,ideal,'Glyph ideal contrast');finiteAtLeast(ideal,textFloor,'Actual glyph ink contrast');finiteAtLeast(painted,textFloor,'Saved glyph pixel contrast');contrasts.push(ideal);actualText.push(painted);reportedText.push(ideal);
    }near(minContrast,Math.min(...contrasts),'Glyph contrast minimum');
  }
  assert.equal(capture.cardPanels.length,geometry.annotated.length);
  for(let index=0;index<capture.cardPanels.length;index++){const panel=capture.cardPanels[index],annotation=geometry.annotated[index],card=annotation.card,inset=3*sx;assert.equal(panel.id,annotation.id);assert.deepEqual(panel.card,card);assert.equal(panel.samples.length,4);const locations=[{x:card.x+card.width/2,y:card.y+inset},{x:card.x+card.width/2,y:card.y+card.height-inset},{x:card.x+inset,y:card.y+card.height/2},{x:card.x+card.width-inset,y:card.y+card.height/2}];for(let sampleIndex=0;sampleIndex<4;sampleIndex++){const sample=panel.samples[sampleIndex],location=locations[sampleIndex];near(sample.x,location.x,'Panel sample X');near(sample.y,location.y,'Panel sample Y');const rgb=actual(sample),error=calloutError(rgb,card.rgb);assert.deepEqual(sample.expected,card.rgb);assert.equal(sample.channelError,error);assert(error<=4,'Saved panel must preserve opaque original surface');}}
  assert.equal(capture.leaders.length,geometry.annotated.length);
  for(let index=0;index<capture.leaders.length;index++){
    const proof=capture.leaders[index],annotation=geometry.annotated[index],{id,samples,minContrast,...leader}=proof;assert.equal(id,annotation.id);assert.deepEqual(leader,annotation.leader);assert.equal(samples.length,3);assert.equal(leader.witnesses.length,3);calloutRGB(leader.rgb,'Leader ink');assert(Number.isFinite(leader.alpha)&&leader.alpha>0&&leader.alpha<=1);const ratios=[];
    for(let sampleIndex=0;sampleIndex<3;sampleIndex++){const sample=samples[sampleIndex],witness=leader.witnesses[sampleIndex],segment=leader.segments[0],fraction=[.25,.5,.75][sampleIndex],predicted={x:segment.from.x+(segment.to.x-segment.from.x)*fraction,y:segment.from.y+(segment.to.y-segment.from.y)*fraction};near(sample.x,witness.x,'Leader witness X');near(sample.y,witness.y,'Leader witness Y');const centerX=Math.floor(predicted.x*pixels.width/draw.width),centerY=Math.floor(predicted.y*pixels.height/draw.height);assert(Math.abs(sample.pixelX-centerX)<=2&&Math.abs(sample.pixelY-centerY)<=2,'Leader witness must lie on a sampled original segment');calloutRGB(witness.before,'Leader prepaint surface');const expected=leader.rgb.map((value,index)=>Math.round(value*leader.alpha+witness.before[index]*(1-leader.alpha)));assert.deepEqual(witness.expected,expected);assert.equal(witness.channelError,calloutError(witness.rgb,expected));assert(witness.channelError<=8,'Physical leader contains its expected ink');const rgb=actual(sample),error=calloutError(rgb,witness.rgb);assert.equal(sample.channelError,error);assert(error<=4,'Saved leader must retain its original paint');for(const key of ['expected','before','contrast','changed'])assert.deepEqual(sample[key],witness[key]);assert.equal(witness.changed,calloutError(witness.rgb,witness.before));const observed=contrastRatio(witness.rgb,witness.before),saved=contrastRatio(rgb,witness.before);near(witness.contrast,observed,'Immediate leader contrast');finiteAtLeast(saved,graphicFloor,'Saved leader contrast');finiteAtLeast(observed,graphicFloor,'Immediate leader contrast');ratios.push(observed);leaderRatios.push(saved);}near(minContrast,Math.min(...ratios),'Leader contrast minimum');
  }
  assert.equal(capture.sky.length,4);const skyLocations=[{x:4,y:4},{x:draw.width-4,y:4},{x:4,y:draw.height-4},{x:draw.width-4,y:draw.height-4}];for(let index=0;index<4;index++){const sample=capture.sky[index];near(sample.x,skyLocations[index].x,'Opaque sky X');near(sample.y,skyLocations[index].y,'Opaque sky Y');assert(actual(sample).every((value,channel)=>value<=[30,50,75][channel]),'Saved canvas must contain its dark scene surface');}
  const markerInk=theme==='contrast'?[255,255,0]:[103,232,249];const predictions=[-Math.PI/2,0,Math.PI/2,Math.PI,-Math.PI/4,-Math.PI*3/4].map(angle=>({x:geometry.projected.x+Math.cos(angle)*10*sx,y:geometry.projected.y+Math.sin(angle)*10*sy})).filter(point=>point.x>=draw.view.x*sx+.25&&point.x<=draw.width-20*sx-.25&&point.y>=draw.layout.plotTop*sy+.25&&point.y<=draw.view.groundY*sy-.25);assert.equal(capture.marker.length,predictions.length);assert(predictions.length>=2);
  for(let index=0;index<predictions.length;index++){const sample=capture.marker[index],predicted=predictions[index];near(sample.predicted.x,predicted.x,'Marker cardinal X');near(sample.predicted.y,predicted.y,'Marker cardinal Y');const centerX=Math.floor(predicted.x*pixels.width/draw.width),centerY=Math.floor(predicted.y*pixels.height/draw.height),candidates=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const pixelX=centerX+dx,pixelY=centerY+dy;assert(pixelX>=0&&pixelX<pixels.width&&pixelY>=0&&pixelY<pixels.height);const rgb=pixels.at(pixelX,pixelY);candidates.push({x:(pixelX+.5)*draw.width/pixels.width,y:(pixelY+.5)*draw.height/pixels.height,pixelX,pixelY,rgb,channelError:calloutError(rgb,markerInk)});}candidates.sort((a,b)=>a.channelError-b.channelError||Math.hypot(a.x-predicted.x,a.y-predicted.y)-Math.hypot(b.x-predicted.x,b.y-predicted.y));const chosen=candidates[0];for(const key of ['pixelX','pixelY','channelError'])assert.equal(sample[key],chosen[key]);near(sample.x,chosen.x,'Selected marker X');near(sample.y,chosen.y,'Selected marker Y');assert.deepEqual(sample.expected,markerInk);assert.deepEqual(sample.rgb,chosen.rgb);actual(sample);assert(chosen.channelError<=4,'Original marker must be painted');const contrast=contrastRatio(chosen.rgb,capture.sky[0].rgb);near(sample.contrast,contrast,'Original marker contrast');finiteAtLeast(contrast,graphicFloor,'Saved original marker contrast');markerRatios.push(contrast);}
  assert.equal(capture.liveCanvasPixels.length,all.length,'Every saved witness must have an actual canvas equality witness');for(let index=0;index<all.length;index++){const rgba=capture.liveCanvasPixels[index];assert(Array.isArray(rgba)&&rgba.length===4&&rgba.every(value=>Number.isInteger(value)&&value>=0&&value<=255));assert.equal(rgba[3],255,'Actual canvas witness opaque');assert(calloutError(rgba.slice(0,3),all[index].rgb)<=4,'Saved pixels must equal native canvas witnesses');}
  near(capture.minFont,Math.min(...capture.glyphs.map(glyph=>glyph.fontSize)),'Capture minimum font');near(capture.minTextContrast,Math.min(...reportedText),'Capture minimum text contrast');near(capture.minLeaderContrast,Math.min(...capture.leaders.map(leader=>leader.minContrast)),'Capture minimum leader contrast');near(capture.minMarkerContrast,Math.min(...markerRatios),'Capture minimum marker contrast');
  calloutPaintResults.push({screenshot:relative(file),minFont:capture.minFont,minTextContrast:capture.minTextContrast,minPaintedTextContrast:Math.min(...actualText),minLeaderContrast:Math.min(...leaderRatios),minMarkerContrast:Math.min(...markerRatios),glyphs:capture.glyphs.length,panels:capture.cardPanels.length,leaders:capture.leaders.length,markerSamples:capture.marker.length,witnesses:all.length});return geometry;
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
  assert.equal(calloutPaintResults.length,35,'Every new canvas capture must decode and pass real paint verification');summary.calloutCaptures=35;summary.calloutGlyphs=calloutPaintResults.reduce((sum,item)=>sum+item.glyphs,0);summary.calloutPanels=calloutPaintResults.reduce((sum,item)=>sum+item.panels,0);summary.calloutLeaders=calloutPaintResults.reduce((sum,item)=>sum+item.leaders,0);summary.calloutMarkerSamples=calloutPaintResults.reduce((sum,item)=>sum+item.markerSamples,0);summary.calloutPixelWitnesses=calloutPaintResults.reduce((sum,item)=>sum+item.witnesses,0);
  summary.visualReports.callouts={configurations:9,edgeCases:8,captures:35,minFont:Math.min(...calloutPaintResults.map(item=>item.minFont)),minTextContrast:Math.min(...calloutPaintResults.map(item=>item.minTextContrast)),minPaintedTextContrast:Math.min(...calloutPaintResults.map(item=>item.minPaintedTextContrast)),minLeaderContrast:Math.min(...calloutPaintResults.map(item=>item.minLeaderContrast)),minMarkerContrast:Math.min(...calloutPaintResults.map(item=>item.minMarkerContrast)),actualGlyphClearance:true,actualPointClearance:true,actualVectorClearance:true,actualPanelAndLeaderPaint:true,originalEvidenceUnchanged:true};
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

if(!missing.size&&!failures.length)check('Complete aggregate totals',()=>{assert.equal(summary.unitTests,356);assert.equal(summary.unitFiles,21);assert.equal(summary.historicalFilesPreserved,601);assert.equal(summary.previousInspectionReportFilesPreserved,479);assert.equal(summary.previousTrailReportFilesPreserved,71);assert.equal(summary.browserTests,35);assert.equal(browserFiles.size,7);assert.equal(screenshots.size,99);assert.equal(summary.calloutCaptures,35);assert.equal(summary.startupArchive.filesPreserved,44);assert.equal(summary.canvasCaptures,18);assert.equal(summary.canvasMarkerSamples,72);assert.equal(summary.canvasCaptureNegativeControl.originalMarkerMissing,true);assert.equal(diagnosticScreenshots.size,1);assert.equal(Object.keys(summary.visualReports).length,4);});
const status=failures.length?'failed':missing.size?'incomplete':'passed';const verification={status,passed:status==='passed',complete:missing.size===0,sourceSha256:sourcePin,baselineCommit,testPins,...summary,browserFiles:[...browserFiles].sort(),screenshots:Object.fromEntries(screenshots),diagnosticScreenshots:Object.fromEntries(diagnosticScreenshots),dependencies,checks,missing:[...missing].sort(),failures,scope:'Audits actual suite JSON and retained raster evidence without executing tests or modifying prior reports.',completedAt:new Date().toISOString()};
atomicJson(path.join(report,'verification.json'),verification);console.log(JSON.stringify(verification,null,2));process.exitCode=status==='passed'?0:status==='incomplete'?2:1;
