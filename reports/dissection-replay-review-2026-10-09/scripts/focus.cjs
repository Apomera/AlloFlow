const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-review-2026-10-09'),file=path.join(repo,'stem_lab/stem_tool_dissection.js');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let source=fs.readFileSync(file,'utf8'),record=JSON.parse(fs.readFileSync(path.join(report,'edits/source-edits.json'),'utf8'));
if(hash(source)!==record.after)throw Error('Source drift');
function edit(before,after){if(source.split(before).length!==2)throw Error('Nonunique edit');source=source.replace(before,after);record.edits.push({before,after});}
edit('          function showProcedureReplay(reviewOnly) {', `          function focusProcedureReplayControl(targetId, showSpecimen) {
            var root = currentDissectionRootNode(), attempts = 2;
            function focusWhenReady() {
              if (!root || !root.isConnected) return;
              var target = scopedDissectionQuery(root, '#' + targetId);
              if (!target && attempts-- > 0) { setTimeout(focusWhenReady, 0); return; }
              if (!target) return;
              if (showSpecimen && canvasRefNode && canvasRefNode.scrollIntoView) canvasRefNode.scrollIntoView({ block: 'start', behavior: 'auto' });
              if (target.focus) target.focus({ preventScroll: true });
              if (target.scrollIntoView) target.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }
            setTimeout(focusWhenReady, 0);
          }
          function showProcedureReplay(reviewOnly) {`);
edit("            focusDissectionTarget('diss-replay-toggle');", "            focusProcedureReplayControl('diss-replay-toggle', true);");
edit("focusDissectionTarget(next.actions.length > 1 ? 'diss-replay-next' : 'diss-replay-toggle');", "focusProcedureReplayControl(next.actions.length > 1 ? 'diss-replay-next' : 'diss-replay-toggle');");
edit("focusDissectionTarget(next.actions.length > 1 ? 'diss-replay-previous' : 'diss-replay-toggle');", "focusProcedureReplayControl(next.actions.length > 1 ? 'diss-replay-previous' : 'diss-replay-toggle');");
function write(target){const temp=target+'.replay-review.tmp';fs.writeFileSync(temp,source);fs.renameSync(temp,target);}
new(require('node:vm').Script)(source);write(file);write(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'));
record.after=hash(source);fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({source:record.after,edits:record.edits.length}));
