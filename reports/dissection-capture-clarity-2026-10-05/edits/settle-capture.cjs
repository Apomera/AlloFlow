const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const files=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'];
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const baseline='552654074f6136fd415f7cdb8c0c03a788b96a4c6e85c657e4cf1673fb8e9f75';
let original=fs.readFileSync(path.join(repo,files[0]),'utf8'),text=original;
for(const f of files)if(sha(fs.readFileSync(path.join(repo,f)))!==baseline)throw Error('Renderer ownership guard: '+f);
const changes=[
 {label:'Settle committed tissue in specimen capture',old:'                canvas._cameraTransition = null;\n              }\n              try {\n                drawDissectionFrame(0, true);',new:'                canvas._cameraTransition = null; canvas._toolOutcomePulse = null;\n              }\n              try {\n                drawDissectionFrame(0, true);'},
 {label:'Settle anatomy navigation in specimen capture',old:'              if (specimenEvidenceCapture) d = Object.assign({}, d, { hoveredOrgan: null, instrumentVisuals: false, _procedureDemo: null, _procedureReplay: null });',new:'              if (specimenEvidenceCapture) d = Object.assign({}, d, { hoveredOrgan: null, instrumentVisuals: false, _procedureDemo: null, _procedureReplay: null, _layerTransition: null, _viewTransition: null, _layerBrowseTransition: null });'},
];
for(const e of changes){e.offset=text.indexOf(e.old);if(e.offset<0||text.indexOf(e.old,e.offset+1)>=0)throw Error('Unique context missing: '+e.label);text=text.slice(0,e.offset)+e.new+text.slice(e.offset+e.old.length);}
new vm.Script(text);
let reversed=text;for(const e of [...changes].reverse()){if(reversed.slice(e.offset,e.offset+e.new.length)!==e.new)throw Error('Reversal context mismatch');reversed=reversed.slice(0,e.offset)+e.old+reversed.slice(e.offset+e.new.length);}
if(reversed!==original)throw Error('Reversal failed');
const record={files,baselineSha256:baseline,finalSha256:sha(text),edits:changes,parsed:true,exactReversal:true,reason:'Specimen captures settle layer/view navigation and committed tissue outcomes without changing the live transition; full canvas captures preserve those animations.'};
fs.writeFileSync(path.join(__dirname,'renderer-capture-settle-edits.json'),JSON.stringify(record,null,2));
for(const f of files)fs.writeFileSync(path.join(repo,f),text);
console.log(JSON.stringify(record));
