const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname;
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth');
const targets=[
 ...['stem_lab','desktop/web-app/public/stem_lab'].flatMap(prefix=>[
  {target:path.join(repo,prefix,'universe_flight_scene.js'),baseline:path.join(stage,'baseline-renderer.js'),candidate:path.join(stage,'candidate-renderer.js')},
  {target:path.join(repo,prefix,'stem_tool_universe.js'),baseline:path.join(stage,'baseline-ui.js'),candidate:path.join(stage,'candidate-ui.js')},
 ]),
 ...JSON.parse(fs.readFileSync(path.join(stage,'candidate-test-patch-manifest.json'))).files.map(x=>({target:x.sourcePath,baseline:x.baselinePath,candidate:x.candidatePath})),
];
const proof=JSON.parse(fs.readFileSync(path.join(stage,'candidate-host-audit.json')));assert.equal(proof.completed,true);
assert.equal(sha(path.join(stage,'candidate-renderer.js')),'8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9');
assert.equal(sha(path.join(stage,'candidate-ui.js')),'a744f3d2e32b5bec28864c8ee29468ec68178cd20d9bb08bcd8fa3d9eefc19a9');
for(const t of targets)assert.equal(sha(t.target),sha(t.baseline),'Changed preimage: '+t.target);
fs.mkdirSync(report,{recursive:true});fs.mkdirSync(path.join(report,'preimages'),{recursive:true});
const baselinePreview=path.join(repo,'stem_lab/assets/universe-flight/highlights/manifest.json');
fs.copyFileSync(baselinePreview,path.join(report,'preimages/preview-manifest.json'));
for(const t of targets){
 fs.copyFileSync(t.target,path.join(report,'preimages',path.basename(t.baseline)));
 fs.copyFileSync(t.candidate,t.target);
 assert.equal(sha(t.target),sha(t.candidate));
}
const result={completed:true,installedAt:new Date().toISOString(),targets:targets.map(t=>({target:path.relative(repo,t.target).replaceAll('\\','/'),baselineHash:sha(t.baseline),candidateHash:sha(t.candidate)})),committed:false};
fs.writeFileSync(path.join(report,'installation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
