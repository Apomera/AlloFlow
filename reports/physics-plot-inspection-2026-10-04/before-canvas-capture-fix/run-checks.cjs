// Run serial checks with the bundled Node 24.19.0. --prepare records the untouched prior evidence.
const fs=require('node:fs'), path=require('node:path'), cp=require('node:child_process'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'), report=__dirname;
const sourcePin = '0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28';
const baselineCommit = '54d638b3213b0fbd484305feff43b769da8902f7';
const baselineUnitsPath = 'reports/physics-point-clarity-2026-10-02/unit-results.json';
const baselineUnitsPin = '66e71b4c8a86d614661b9a83c025f540e45c0f5dbb2253f7b3e1f7730b05224d';
const testPins = {
  "tests/e2e/physics-plot-inspection.spec.ts": "3827eb9c7db290de2ff2b2a650e7fe3180ed559ff63378b2ac744f0d9b87b31a",
  "tests/e2e/physics-trail-identity.spec.ts": "631a884fe9601edaa3c743255e0741cb702987b88847bc127021d601a1dcab5a",
  "tests/e2e/physics-flight-history.spec.ts": "3f2c263dad510a0b8f35fd280c1f4f516bc0a65f9c92da08c4d82b2efeb66916",
  "tests/e2e/physics-apex-inspection.spec.ts": "bb44609f54a80f3411ffd55c67bc46f840ac8d8a8d56337786d83157d585aba6",
  "tests/e2e/physics-velocity-clarity.spec.ts": "76b73adcdb17eafc1653503dcb5ed6b2467b73a7bf94caff4d08d7bd3306dbf1"
};
const historicalDirectories = {'physics-recorded-flights-2026-10-02':10,'physics-recorded-context-2026-10-02':11,'physics-velocity-clarity-2026-10-02':10,'physics-point-clarity-2026-10-02':20};
const previousReport = 'reports/physics-trail-identity-2026-10-02';
const stages = {
  unit: {count:356, files:null, result:'unit-results.json'},
  plot: {count:5, files:['physics-plot-inspection.spec.ts'], result:'plot-results.json'},
  trail: {count:4, files:['physics-trail-identity.spec.ts'], result:'trail-results.json', visual:'trail-regression'},
  regression: {count:11, files:['physics-flight-history.spec.ts','physics-apex-inspection.spec.ts'], result:'regression-results.json', visual:'regression'},
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
function protectedFiles() {
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
  return values;
}
function snapshot() {
  const files = ['stem_lab/stem_tool_physics.js','desktop/web-app/public/stem_lab/stem_tool_physics.js',...baselineUnitFiles(),...Object.keys(testPins)];
  const hashes = Object.fromEntries(files.map(file => [file,digest(fs.readFileSync(path.join(root,file)))]));
  assert.equal(hashes[files[0]], sourcePin, 'Source differs from final pin');
  assert.equal(hashes[files[1]], sourcePin, 'Desktop copy differs from final pin');
  for (const [file,pin] of Object.entries(testPins)) assert.equal(hashes[file],pin,'Browser spec differs from final pin: '+file);
  return {sourceSha256:hashes[files[0]],mirrorSha256:hashes[files[1]],modelPrefixSha256:digest(prefix(fs.readFileSync(path.join(root,files[0])))),fileHashes:hashes};
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
const initial=snapshot(), historical=protectedFiles();
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
    assert(Number.isFinite(resultStarted)&&resultStarted>=Date.parse(startedAt)-5000&&resultStarted<=Date.parse(record.completedAt),'Result was not produced during this stage: '+name);
    record.resultSha256=digest(resultBytes); record.resultBytes=resultBytes.length;
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
