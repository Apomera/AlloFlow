const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const files=['stem_lab/stem_tool_geometryworld.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld.js'];
let source=fs.readFileSync(files[0],'utf8');
if(source!==fs.readFileSync(files[1],'utf8'))throw new Error('Core mirror differs before layout patch');
const before=crypto.createHash('sha256').update(source).digest('hex'),eol=source.includes('\r\n')?'\r\n':'\n';
const scope='#geoworld-fs-workspace.gw-root[data-geometry-mode][data-touch-active] .gw-action-bar.gw-action-bar';
const css='@media(max-width:360px){'+
  scope+'{box-sizing:border-box;gap:2px!important;padding:3px!important}'+
  scope+' button{box-sizing:border-box;flex:1 1 0!important;min-width:44px!important;min-height:44px!important;padding:4px 3px!important;font-size:11px!important}'+
  scope+' .gw-utility-content{display:grid;grid-template-columns:auto;justify-content:center;justify-items:center;gap:1px}'+
  scope+' .gw-utility-content:has(.gw-utility-count){grid-template-columns:auto auto;column-gap:2px}'+
  scope+' .gw-workspace-icon{grid-column:1;grid-row:1;width:14px;height:14px}'+
  scope+' .gw-utility-label{display:block!important;grid-column:1/-1;grid-row:2;font-size:11px;line-height:12px}'+
  scope+' .gw-utility-count{grid-column:2;grid-row:1;min-width:0;padding:0 2px;font-size:9px;line-height:12px}'+
  '}';
const needle="      '@media(prefers-reduced-motion:reduce){.gw-root button";
if(source.split(needle).length!==2)throw new Error('CSS insertion point differs');
source=source.replace(needle,'      '+JSON.stringify(css)+','+eol+needle);
new vm.Script(source,{filename:files[0]});
for(const path of files){const handle=fs.openSync(path,'r+'),bytes=Buffer.from(source);try{fs.writeSync(handle,bytes,0,bytes.length,0);fs.ftruncateSync(handle,bytes.length);}finally{fs.closeSync(handle);}}
if(fs.readFileSync(files[0],'utf8')!==fs.readFileSync(files[1],'utf8'))throw new Error('Core mirror differs after layout patch');
const result={before,after:crypto.createHash('sha256').update(source).digest('hex'),syntax:true,parity:true,breakpoint:360,minTarget:44,retainsAllLabels:true,lineEnding:eol==='\r\n'?'CRLF':'LF'};
fs.writeFileSync('reports/geometry-world-building-tools-2026-09-09/narrow-utility-source.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
