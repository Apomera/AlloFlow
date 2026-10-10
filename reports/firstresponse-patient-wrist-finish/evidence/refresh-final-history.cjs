const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),work=__dirname,archive=path.join(work,'candidate-rejected-recovery-fold');
const rejection=JSON.parse(fs.readFileSync(path.join(archive,'rejection.json')));
for(const name of ['history-integration.json','history-preservation.json']){
 const record=rejection.artifacts.find(x=>x.path===name);assert.ok(record);
 const current=fs.readFileSync(path.join(work,name)),saved=fs.readFileSync(path.join(archive,name));
 assert.equal(sha(saved),record.sha256);assert.deepEqual(current,saved,'Old history output must be safely archived before replacement');
}
const r=spawnSync(process.execPath,['--max-old-space-size=128',path.join(work,'prepare-history.cjs'),'--selftest'],{windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,'History refresh failed');
const result=JSON.parse(fs.readFileSync(path.join(work,'history-preservation.json'))),refresh=JSON.parse(fs.readFileSync(path.join(work,'history-index-refresh.json')));
assert.equal(result.sourceSHA256,'147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891');
assert.equal(result.sharedHistoryInputs.indexSHA256,'44620982ac88df5c4bff991b248000543eb8543837f76c12c3d9ce4ca99e0a94');
assert.equal(result.historicalChain.length,19);assert.equal(result.existingRawTests,39);assert.equal(result.selftest.restoredAndReread,true);
console.log(JSON.stringify({refreshed:true,sourceSHA256:result.sourceSHA256,indexSHA256:result.sharedHistoryInputs.indexSHA256,archivedPredecessorVerified:true,sharedWrites:0}));
