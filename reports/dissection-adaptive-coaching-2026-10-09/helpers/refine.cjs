const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),assert=require('assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-adaptive-coaching-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const receiptFile=path.join(report,'edits/source-edits.json'),receipt=JSON.parse(fs.readFileSync(receiptFile));
let source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8');
const before="label: label || 'Review technique controls', target: target || 'diss-procedure-panel'",after="label: label || 'Review technique controls', target: target || 'diss-procedure-summary'";
assert.equal(source.split(after).length,2);assert.equal(hash(source.replace(after,before)),receipt.after);
assert.equal(fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'),'utf8'),source);
receipt.edits.push({before,after});receipt.after=hash(source);fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));fs.writeFileSync(path.join(report,'edits/source-after.js.gz'),zlib.gzipSync(source));
const runner=path.join(__dirname,'run.cjs');fs.writeFileSync(runner,fs.readFileSync(runner,'utf8').replace('.diss-checkpoint-coaching-20261009','.diss-adaptive-coaching-20261009'));console.log(receipt.after);
