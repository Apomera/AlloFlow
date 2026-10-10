const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-action-handoff-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!JSON.parse(fs.readFileSync(path.join(report,'sequence-1.json'))).success)throw Error('Before capture not complete');
const receipt=JSON.parse(fs.readFileSync(path.join(report,'edits/source-edits.json'))), candidate=fs.readFileSync(path.join(__dirname,'source-next.js'));
if(hash(candidate)!==receipt.after)throw Error('Candidate changed');
const files=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'];
for(const file of files)if(hash(fs.readFileSync(path.join(repo,file)))!==receipt.before)throw Error('Baseline drift: '+file);
for(const file of files){if(hash(fs.readFileSync(path.join(repo,file)))!==receipt.before)throw Error('Concurrent edit: '+file);fs.writeFileSync(path.join(repo,file),candidate);}
fs.writeFileSync(path.join(report,'edits/source-after.js.gz'),zlib.gzipSync(candidate));
console.log(JSON.stringify({applied:true,source:receipt.after,edits:receipt.edits.length}));
