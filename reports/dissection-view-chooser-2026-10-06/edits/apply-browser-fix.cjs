const fs=require('fs'),path=require('path'),crypto=require('crypto'),repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report=path.join(repo,'reports/dissection-view-chooser-2026-10-06'),target=path.join(repo,'tests/e2e/dissection-view-chooser.spec.ts'),receipt=JSON.parse(fs.readFileSync(path.join(__dirname,'browser-fixture-edits.json'))),before=fs.readFileSync(target),next=fs.readFileSync(path.join(__dirname,'dissection-view-chooser.spec.ts'));
if(sha(before)!==receipt.beforeSha256||sha(next)!==receipt.afterSha256)throw Error('Fixture drift');
if(JSON.parse(fs.readFileSync(path.join(report,'sequence-1.json'))).running)throw Error('Tests still active');
const esbuild=require(path.join(repo,'node_modules/esbuild'));esbuild.transformSync(next.toString(),{loader:'ts',format:'cjs'});
if(!fs.readFileSync(target).equals(before))throw Error('Concurrent fixture edit');fs.writeFileSync(target,next);
fs.copyFileSync(path.join(__dirname,'browser-fixture-edits.json'),path.join(report,'edits/browser-fixture-edits.json'));
fs.writeFileSync(path.join(report,'edits/browser-fixture-initial.ts.gz'),require('zlib').gzipSync(before));
console.log(JSON.stringify({browserSha256:sha(next),syntax:true,sourceUnchanged:true}));
