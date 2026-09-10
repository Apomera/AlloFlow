const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const files=['stem_lab/stem_tool_geometryworld.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld.js'];
let source=fs.readFileSync(files[0],'utf8');
if(source!==fs.readFileSync(files[1],'utf8'))throw new Error('Core mirror differs before utility-width patch');
const before=crypto.createHash('sha256').update(source).digest('hex');
const oldRule='@media(max-width:360px){#geoworld-fs-workspace.gw-root[data-geometry-mode][data-touch-active] .gw-action-bar.gw-action-bar';
const newRule=oldRule.replace('360px','420px');
if(source.split(oldRule).length!==2)throw new Error('Expected one compact utility media query');
source=source.replace(oldRule,newRule);
new vm.Script(source,{filename:files[0]});
for(const path of files){const handle=fs.openSync(path,'r+'),bytes=Buffer.from(source);try{fs.writeSync(handle,bytes,0,bytes.length,0);fs.ftruncateSync(handle,bytes.length);}finally{fs.closeSync(handle);}}
if(fs.readFileSync(files[0],'utf8')!==fs.readFileSync(files[1],'utf8'))throw new Error('Core mirror differs after utility-width patch');
const result={before,after:crypto.createHash('sha256').update(source).digest('hex'),syntax:true,parity:true,previousBreakpoint:360,breakpoint:420,minTarget:44,allLabelsRetained:true,scope:'Existing compact utility row only; widths above420px unchanged',lineEnding:source.includes('\r\n')?'CRLF':'LF'};
fs.writeFileSync('reports/geometry-world-control-polish-2026-09-10/compact-utility-source.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
