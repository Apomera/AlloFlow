const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(repo,'reports/universe-flight-2026-09-29/disk-passage');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(path.join(stage,p)));
const audit=read('audit-route-v2.json'),independent=read('source-audit-final.json'),native=read('native-v2-report/check.json');
for(const proof of [audit,independent,native])assert.equal(proof.completed,true);
const finalHash='255f57893385f5e0ae1a932d00f3ba8e7e98cacc8851bc6ce8985003bd025a75';
assert.equal(sha(path.join(stage,'candidate-v2-renderer.js')),finalHash);
assert.equal(audit.candidateHash,finalHash);assert.equal(independent.candidateHash,finalHash);assert.equal(native.pins.candidate,finalHash);
const targets=[];
for(const prefix of ['stem_lab','desktop/web-app/public/stem_lab']){
 targets.push({target:path.join(repo,prefix,'universe_flight_scene.js'),baseline:path.join(stage,'baseline-renderer.js'),candidate:path.join(stage,'candidate-v2-renderer.js')});
 targets.push({target:path.join(repo,prefix,'stem_tool_universe.js'),baseline:path.join(stage,'baseline-ui.js'),candidate:path.join(stage,'candidate-ui.js')});
}
for(const [file,base,candidate]of [['dev-tools/build_universe_flight_previews.cjs','baseline-preview-builder.cjs','candidate-preview-builder.cjs'],['dev-tools/universe_flight_preview.cjs','baseline-preview-server.cjs','candidate-preview-server.cjs'],['tests/universe_flight_navigation.test.js','baseline-navigation.test.js','candidate-navigation.test.js']])targets.push({target:path.join(repo,file),baseline:path.join(stage,base),candidate:path.join(stage,candidate)});
for(const t of targets)assert.equal(sha(t.target),sha(t.baseline),'Changed preimage '+t.target);
assert.equal(sha(path.join(stage,'candidate-ui.js')),'52bea55b412a2ce73ce4bd55724e1fce5befef32e17da6ad730f995bfe7a0874');
const testTarget=path.join(repo,'tests/universe_flight_disk_passage.test.js'),testSource=path.join(stage,'candidate-disk-passage.test.js');assert.equal(fs.existsSync(testTarget),false);assert.equal(sha(testSource),'b2bc0c1e3f0e26d7062330ae6699d15d42eef4379e481df32dec5de1234b9d1a');
fs.mkdirSync(path.join(report,'preimages'),{recursive:true});
for(const [file,name]of [['stem_lab/assets/universe-flight/highlights/manifest.json','preview-manifest.json'],['reports/universe-flight-2026-09-29/README.md','main-README.md']])fs.copyFileSync(path.join(repo,file),path.join(report,'preimages',name));
for(const t of targets){const name=path.basename(t.baseline);if(!fs.existsSync(path.join(report,'preimages',name)))fs.copyFileSync(t.target,path.join(report,'preimages',name));fs.copyFileSync(t.candidate,t.target);assert.equal(sha(t.target),sha(t.candidate));}
fs.copyFileSync(testSource,testTarget);assert.equal(sha(testSource),sha(testTarget));
const result={completed:true,installedAt:new Date().toISOString(),installerHash:sha(__filename),targets:targets.map(t=>({target:path.relative(repo,t.target).replaceAll('\\','/'),baselineHash:sha(t.baseline),candidateHash:sha(t.candidate)})),newTest:{target:'tests/universe_flight_disk_passage.test.js',candidateHash:sha(testSource)},committed:false};fs.writeFileSync(path.join(report,'installation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
