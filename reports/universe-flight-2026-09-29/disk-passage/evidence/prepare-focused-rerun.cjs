const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.copyFileSync(path.join(stage,'disk-test-repair-manifest.json'),path.join(stage,'unit-test-repair-manifest.json'),fs.constants.COPYFILE_EXCL);
const repair=JSON.parse(fs.readFileSync(path.join(stage,'unit-test-repair-manifest.json')));assert.equal(repair.candidateSha256,sha(path.join(repo,repair.target)));
console.log(JSON.stringify({prepared:true,testSha256:repair.candidateSha256,runDriverSha256:sha(path.join(stage,'run-focused-unit.cjs')),summaryDriverSha256:sha(path.join(stage,'summarize-focused-unit.cjs')),repairManifestSha256:sha(path.join(stage,'unit-test-repair-manifest.json')),node:process.execPath}));
