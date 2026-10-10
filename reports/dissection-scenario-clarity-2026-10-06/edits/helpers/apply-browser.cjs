const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-scenario-clarity-2026-10-06'),file='tests/e2e/dissection-scenario-clarity.spec.ts',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fixture=fs.readFileSync(path.join(__dirname,'browser-work/dissection-scenario-clarity.spec.ts'));
if(sha(fixture)!=='4df2924590a118f81de03b90fbd665f5d1e1083c2a507f198a0e92723ee7f51e'||fs.existsSync(path.join(repo,file)))throw Error('Browser guard');
require(path.join(repo,'node_modules/esbuild')).transformSync(fixture.toString(),{loader:'ts',format:'cjs'});
fs.writeFileSync(path.join(repo,file),fixture);fs.writeFileSync(path.join(report,'edits/browser-creation-receipt.json'),JSON.stringify({file,existedBefore:false,sha256:sha(fixture),syntax:true},null,2));console.log(JSON.stringify({browserSha256:sha(fixture)}));
