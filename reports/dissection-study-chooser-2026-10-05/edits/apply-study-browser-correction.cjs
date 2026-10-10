const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-study-chooser-2026-10-05');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),file=path.join(repo,'tests/e2e/dissection-study-chooser.spec.ts');
const receipt=JSON.parse(fs.readFileSync(path.join(__dirname,process.argv[2]||'creation-receipt.json'))),old=fs.readFileSync(file),candidate=fs.readFileSync(path.join(__dirname,'dissection-study-chooser.spec.ts'));
if(sha(old)!==(receipt.previousSha256||receipt.oldSha256)||sha(candidate)!==(receipt.sha256||receipt.newSha256))throw Error('Browser correction input guard');
let next=old.toString();for(const edit of receipt.edits||[receipt.edit]){if(next.split(edit.before).length!==2)throw Error('Browser correction count');next=next.replace(edit.before,edit.after);}
if(!Buffer.from(next).equals(candidate))throw Error('Browser correction bytes');
require(path.join(repo,'node_modules/esbuild')).transformSync(next,{loader:'ts',format:'cjs'});
if(!fs.readFileSync(file).equals(old))throw Error('Concurrent browser change');
fs.writeFileSync(file,next);console.log(JSON.stringify({before:sha(old),after:sha(next),syntax:true,exact:true}));
