const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-review-2026-10-09'),file=path.join(repo,'stem_lab/stem_tool_dissection.js');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let source=fs.readFileSync(file,'utf8'),record=JSON.parse(fs.readFileSync(path.join(report,'edits/source-edits.json'),'utf8'));
if(hash(source)!==record.after)throw Error('Source drift');
function edit(before,after){if(source.split(before).length!==2)throw Error('Nonunique edit');source=source.replace(before,after);record.edits.push({before,after});}
edit('          function showProcedureReplay(reviewOnly) {', `          function showProcedureReplay() {
            startProcedureReplay(false);
          }
          function startProcedureReplay(reviewOnly) {`);
edit('onClick: function () { showProcedureReplay(true); }', 'onClick: function () { startProcedureReplay(true); }');
function write(target){const temp=target+'.replay-review.tmp';fs.writeFileSync(temp,source);fs.renameSync(temp,target);}
new(require('node:vm').Script)(source);write(file);write(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'));
record.after=hash(source);fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({source:record.after,edits:record.edits.length}));
