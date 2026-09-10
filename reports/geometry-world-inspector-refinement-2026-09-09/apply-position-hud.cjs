const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const files=['stem_lab/stem_tool_geometryworld.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld.js'];
let source=fs.readFileSync(files[0],'utf8');
if(source!==fs.readFileSync(files[1],'utf8'))throw new Error('Core mirror differs before HUD patch');
const before=crypto.createHash('sha256').update(source).digest('hex'),eol=source.includes('\r\n')?'\r\n':'\n';
const root='#geoworld-fs-workspace.gw-root[data-geometry-mode="sandbox"][data-touch-active="false"]';
const hud=root+'>.gw-coordinate-hud';
const css='@media(max-width:800px){'+
  hud+'{top:68px!important;bottom:auto!important;box-sizing:border-box;width:max-content;max-width:min(200px,calc(100% - 108px));max-height:calc(100% - 268px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#839c86 #173b35}'+
  root+'[data-toolbar-collapsed="true"]>.gw-coordinate-hud,'+root+'[data-fullscreen="true"]>.gw-coordinate-hud{top:56px!important}'+
  hud+'>summary{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:44px;min-height:44px!important;margin-bottom:0!important;list-style:none}'+
  hud+'>summary::-webkit-details-marker{display:none}'+
  hud+'>summary::after{content:"+";font:18px/1 ui-sans-serif,system-ui,sans-serif;color:#c7d7cd}'+
  hud+'[open]>summary::after{content:"−"}'+
  hud+'>button{box-sizing:border-box;min-width:44px;min-height:44px;font-size:10px!important}'+
  '}'+
  '@media(max-width:800px) and (min-height:620px) and (orientation:portrait){'+
  hud+'{max-height:calc(50% - 188px)}'+
  root+' .gw-placement-hint{top:calc(50% + 28px);left:50%;transform:translateX(-50%);max-width:min(300px,calc(100% - 36px))}'+
  '}'+
  '@media(max-width:800px) and (max-height:520px) and (orientation:landscape){'+
  root+' .gw-placement-hint{left:auto;right:12px;transform:none;max-width:190px}'+
  '}';
const needle="      '@media(prefers-reduced-motion:reduce){.gw-root button";
if(source.split(needle).length!==2)throw new Error('CSS insertion point differs');
source=source.replace(needle,'      '+JSON.stringify(css)+','+eol+needle);
new vm.Script(source,{filename:files[0]});
for(const path of files){const handle=fs.openSync(path,'r+'),bytes=Buffer.from(source);try{fs.writeSync(handle,bytes,0,bytes.length,0);fs.ftruncateSync(handle,bytes.length);}finally{fs.closeSync(handle);}}
if(fs.readFileSync(files[0],'utf8')!==fs.readFileSync(files[1],'utf8'))throw new Error('Core mirror differs after HUD patch');
const result={before,after:crypto.createHash('sha256').update(source).digest('hex'),syntax:true,parity:true,breakpoint:800,minTarget:44,scope:'Sandbox, touch inactive only; desktop wider than 800px unchanged',lineEnding:eol==='\r\n'?'CRLF':'LF'};
fs.writeFileSync('reports/geometry-world-inspector-refinement-2026-09-09/position-hud-source.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
