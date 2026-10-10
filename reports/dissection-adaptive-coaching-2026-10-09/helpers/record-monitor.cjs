const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),assert=require('assert/strict'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-adaptive-coaching-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const file=path.join(report,'edits/source-edits.json'),receipt=JSON.parse(fs.readFileSync(file)),source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8');
const before="            focusDissectionTarget(coaching.target);",after=`            if (coaching.target === 'diss-field-monitor-summary') {
              var monitorSummary = dissectionNodeById(coaching.target);
              var monitor = monitorSummary && monitorSummary.closest('details');
              if (monitor) monitor.open = true;
            }
            focusDissectionTarget(coaching.target);`;
assert.equal(source.split(after).length,2);assert.equal(hash(source.replace(after,before)),receipt.after);assert.equal(fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'),'utf8'),source);new vm.Script(source);
receipt.edits.push({before,after});receipt.after=hash(source);fs.writeFileSync(file,JSON.stringify(receipt,null,2));fs.writeFileSync(path.join(report,'edits/source-after.js.gz'),zlib.gzipSync(source));console.log(receipt.after);
