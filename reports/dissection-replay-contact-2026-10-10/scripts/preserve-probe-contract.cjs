const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-contact-2026-10-10');
const files=[path.join(repo,'stem_lab/stem_tool_dissection.js'),path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js')];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
let source=fs.readFileSync(files[0],'utf8'),record=JSON.parse(fs.readFileSync(path.join(report,'edits/source-edits.json'),'utf8'));
if(hash(source)!==record.after||source!==fs.readFileSync(files[1],'utf8'))throw Error('Source drift');
const edit={before:"performProcedureAction('probe', { organ: drag.target, point: { x: drag.current.x, y: drag.current.y }, probeDragMetrics: probeDragMetrics, inputType: drag.inputType })",after:"performProcedureAction('probe', { organ: drag.target, probeDragMetrics: probeDragMetrics, point: { x: drag.current.x, y: drag.current.y }, inputType: drag.inputType })"};
if(source.split(edit.before).length!==2)throw Error('Nonunique source edit');
source=source.replace(edit.before,edit.after);new vm.Script(source,{filename:'stem_tool_dissection.js'});
for(const file of files){if(hash(fs.readFileSync(file))!==record.after)throw Error('Concurrent source change');const temp=file+'.replay-contact.tmp';fs.writeFileSync(temp,source,{flag:'wx'});fs.renameSync(temp,file);}
record.edits.push(edit);record.after=hash(source);
const recordPath=path.join(report,'edits/source-edits.json'),temp=recordPath+'.tmp';fs.writeFileSync(temp,JSON.stringify(record,null,2)+'\n',{flag:'wx'});fs.renameSync(temp,recordPath);
console.log(JSON.stringify({source:record.after,edits:record.edits.length}));
