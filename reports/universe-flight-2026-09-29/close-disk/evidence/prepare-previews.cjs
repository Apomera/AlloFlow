const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const input=fs.readFileSync(path.join(__dirname,'../universe-disk-depth57/run-previews.cjs'),'utf8');
assert.ok(input.includes('disk-depth'));
const output=input.replaceAll('disk-depth','close-disk');
fs.writeFileSync(path.join(__dirname,'run-previews.cjs'),output);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
fs.writeFileSync(path.join(__dirname,'preview-driver-provenance.json'),JSON.stringify({completed:true,baselineHash:hash(input),candidateHash:hash(output),replacement:{before:'disk-depth',after:'close-disk'}},null,2)+'\n');
console.log(JSON.stringify({completed:true,driverHash:hash(output)}));
