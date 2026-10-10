const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-technique-availability-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!JSON.parse(fs.readFileSync(path.join(report,'sequence-1.json'))).success)throw Error('Baseline captures incomplete');
const receipt=JSON.parse(fs.readFileSync(path.join(report,'edits/source-edits.json'))),candidate=fs.readFileSync(path.join(__dirname,'source-next.js')),files=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'];
if(hash(candidate)!==receipt.after)throw Error('Candidate drift');for(const f of files)if(hash(fs.readFileSync(path.join(repo,f)))!==receipt.before)throw Error('Baseline drift');
for(const f of files){if(hash(fs.readFileSync(path.join(repo,f)))!==receipt.before)throw Error('Concurrent edit');fs.writeFileSync(path.join(repo,f),candidate);}
fs.writeFileSync(path.join(report,'edits/source-after.js.gz'),zlib.gzipSync(candidate));console.log(JSON.stringify({applied:true,hash:receipt.after}));
