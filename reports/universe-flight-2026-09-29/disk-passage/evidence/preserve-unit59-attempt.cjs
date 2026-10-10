const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const stage = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const attempt = path.join(stage, 'attempts', 'unit-v1'), partial = path.join(stage,'attempts','focused-unit-original-failed');
assert.equal(fs.existsSync(attempt), false, 'Original evidence archive already exists.');
assert.equal(path.resolve(partial).startsWith(path.resolve(stage)+path.sep),true);
assert.equal(path.resolve(attempt).startsWith(path.resolve(stage)+path.sep),true);
if(fs.existsSync(partial)) fs.renameSync(partial,attempt);
else fs.mkdirSync(attempt, {recursive:true});
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = ['run-focused-unit.cjs','node-renderer.config.mjs','node-renderer-setup.mjs','candidate-disk-passage.test.js','candidate-navigation.test.js','test-patch-manifest.json'];
if(!fs.existsSync(path.join(attempt,'focused-unit'))) fs.cpSync(path.join(stage,'focused-unit'),path.join(attempt,'focused-unit'),{recursive:true,errorOnExist:true,force:false});
for(const file of files) {
 if(!fs.existsSync(path.join(attempt,file))) fs.copyFileSync(path.join(stage,file),path.join(attempt,file),fs.constants.COPYFILE_EXCL);
 assert.equal(sha(path.join(attempt,file)),sha(path.join(stage,file)));
}
const installedTests = ['tests/universe_flight_disk_passage.test.js','tests/universe_flight_navigation.test.js'];
for(const file of installedTests) {
 if(!fs.existsSync(path.join(attempt,path.basename(file)))) fs.copyFileSync(path.join(repo,file),path.join(attempt,path.basename(file)),fs.constants.COPYFILE_EXCL);
 assert.equal(sha(path.join(attempt,path.basename(file))),sha(path.join(repo,file)));
}
const evidence = fs.readdirSync(attempt).filter(file=>fs.statSync(path.join(attempt,file)).isFile()).map(file=>({path:file,sha256:sha(path.join(attempt,file))}));
for(const file of fs.readdirSync(path.join(attempt,'focused-unit'))) evidence.push({path:'focused-unit/'+file,sha256:sha(path.join(attempt,'focused-unit',file))});
const archive = {preservedAt:new Date().toISOString(),originalRendererSha256:sha(path.join(repo,'stem_lab/universe_flight_scene.js')),evidence};
fs.writeFileSync(path.join(attempt,'preservation.json'),JSON.stringify(archive,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({archive:attempt,evidenceFiles:evidence.length,preservationSha256:sha(path.join(attempt,'preservation.json'))}));
