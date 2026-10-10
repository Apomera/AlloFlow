const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-contact-2026-10-10');
const file=path.join(repo,'stem_lab/stem_tool_dissection.js'),mirror=path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
let source=fs.readFileSync(file,'utf8'),record=JSON.parse(fs.readFileSync(path.join(report,'edits/source-edits.json'),'utf8'));
if(hash(source)!==record.after||source!==fs.readFileSync(mirror,'utf8'))throw Error('Source drift');
const edits=[
  {before:"updateProcedure({ inspected: true, orientationRecheckRequired: false, orientationObservedAt: Date.now(), inputType: payload.inputType || 'pointer' }",after:"updateProcedure({ inspected: true, point: procedureReplayContact(payload), orientationRecheckRequired: false, orientationObservedAt: Date.now(), inputType: payload.inputType || 'pointer' }"},
  {before:"              updateProcedure(calibratedActionPatch('probe', { probed: true, probedOrganId: target.id, probePressure: toolCalibration.probePressure / 100, probeDragMetrics: probeDragMetrics, inputType: payload.inputType || (probeDragMetrics && probeDragMetrics.inputType) || 'button' })",after:"              var probeInputType = payload.inputType || (probeDragMetrics && probeDragMetrics.inputType) || 'button';\n              var recordedProbePoint = procedureReplayContact(payload);\n              if (!recordedProbePoint && (probeInputType === 'button' || probeInputType === 'motor-neutral')) recordedProbePoint = procedureReplayContact({ point: variedOrganPoint(target) });\n              updateProcedure(calibratedActionPatch('probe', { probed: true, probedOrganId: target.id, point: recordedProbePoint, probePressure: toolCalibration.probePressure / 100, probeDragMetrics: probeDragMetrics, inputType: probeInputType })"},
  {before:"performProcedureAction('probe', { organ: drag.target, probeDragMetrics: probeDragMetrics, inputType: drag.inputType })",after:"performProcedureAction('probe', { organ: drag.target, point: { x: drag.current.x, y: drag.current.y }, probeDragMetrics: probeDragMetrics, inputType: drag.inputType })"}
];
for(const edit of edits){if(source.split(edit.before).length!==2)throw Error('Nonunique source edit');source=source.replace(edit.before,edit.after);record.edits.push(edit);}
new vm.Script(source,{filename:'stem_tool_dissection.js'});
for(const target of[file,mirror]){if(hash(fs.readFileSync(target))!==record.after)throw Error('Concurrent source change');const temp=target+'.replay-contact.tmp';fs.writeFileSync(temp,source,{flag:'wx'});fs.renameSync(temp,target);}
record.after=hash(source);fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({source:record.after,edits:record.edits.length}));
