const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const snapshotFile=path.join(work,'history-input-snapshot.json'),ledgerFile=path.join(work,'history-index-refresh.json'),beforeBytes=fs.readFileSync(snapshotFile),snapshot=JSON.parse(beforeBytes);
for(const[file,pin]of Object.entries(snapshot.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(repo,file))),pin,'Runtime changed '+file);
for(const[folder,kind,pattern]of [['tests','fixtureHashes',/^firstresponse.*\.test\.js$/],['tests/helpers','helperHashes',/^firstresponse_.*_delta\.(cjs|json)$/],['dev-tools','checkerHashes',/^firstresponse.*\.cjs$/]]){assert.deepEqual(fs.readdirSync(path.join(repo,folder)).filter(name=>pattern.test(name)).sort(),Object.keys(snapshot[kind]).sort(),'Inventory changed '+folder);for(const[name,pin]of Object.entries(snapshot[kind]))assert.equal(hash(fs.readFileSync(path.join(repo,folder,name))),pin,'Shared file changed '+folder+'/'+name);}
const currentIndexSHA256=hash(fs.readFileSync(snapshot.indexPath));
if(currentIndexSHA256===snapshot.indexSHA256){console.log(JSON.stringify({unchanged:true,indexSHA256:currentIndexSHA256,sharedWrites:0}));process.exit(0);}
let ledger=fs.existsSync(ledgerFile)?JSON.parse(fs.readFileSync(ledgerFile)):{sharedIndexReadOnly:true,sharedWrites:0,indexBytesWritten:0,events:[]};
if(ledger.events.length)assert.equal(hash(beforeBytes),ledger.events.at(-1).afterSnapshotSHA256,'Previous private snapshot changed');
else assert.deepEqual(beforeBytes,fs.readFileSync(path.join(work,'candidate-rejected-recovery-fold/history-input-snapshot.json')),'Original snapshot must remain archived exact');
const after={...snapshot,indexSHA256:currentIndexSHA256},afterBytes=Buffer.from(JSON.stringify(after,null,2)+'\n');
const event={observedAt:new Date().toISOString(),oldIndexSHA256:snapshot.indexSHA256,newIndexSHA256:currentIndexSHA256,beforeSnapshotSHA256:hash(beforeBytes),afterSnapshotSHA256:hash(afterBytes),previousSnapshot:snapshot,allOtherSharedInputsExact:true,reason:'Shared index bytes changed while private work was in progress. Root authorized a fresh read-only delivery snapshot; no index content is written.'};
assert.equal(hash(fs.readFileSync(snapshot.indexPath)),currentIndexSHA256,'Index changed during refresh');assert.deepEqual(fs.readFileSync(snapshotFile),beforeBytes,'Private snapshot changed');
fs.writeFileSync(snapshotFile,afterBytes);assert.deepEqual(fs.readFileSync(snapshotFile),afterBytes);
ledger.events.push(event);fs.writeFileSync(ledgerFile,JSON.stringify(ledger,null,2)+'\n');assert.equal(JSON.parse(fs.readFileSync(ledgerFile)).events.at(-1).newIndexSHA256,currentIndexSHA256);
assert.equal(hash(fs.readFileSync(snapshot.indexPath)),currentIndexSHA256,'Index changed after private refresh');
console.log(JSON.stringify({refreshed:true,oldIndexSHA256:snapshot.indexSHA256,newIndexSHA256:currentIndexSHA256,allOtherSharedInputsExact:true,sharedWrites:0,indexBytesWritten:0}));
