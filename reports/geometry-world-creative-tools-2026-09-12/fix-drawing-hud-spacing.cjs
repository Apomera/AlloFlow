const fs=require('node:fs'),assert=require('node:assert/strict');
const file='stem_lab/stem_tool_geometryworld_builder.js',raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';
let source=raw.replace(/\r\n/g,'\n');
const before='@media(max-width:800px){.gwe-draw-hud{top:110px;width:300px;padding:8px 10px}}';
const after='@media(max-width:800px){.gwe-draw-hud{top:128px;width:300px;padding:8px 10px}}@media(max-width:800px) and (min-height:520px) and (orientation:portrait){#geoworld-fs-workspace[data-touch-active="false"]:has(>.gw-coordinate-hud[open]) .gwe-draw-hud{top:calc(50% - 108px)}}@media(max-width:800px) and (max-height:520px) and (orientation:landscape){#geoworld-fs-workspace[data-touch-active="false"] .gwe-draw-hud{top:68px;left:auto;right:12px;transform:none;width:min(300px,calc(100% - 232px))}}';
assert.equal(source.split(before).length,2,'Expected one drawing HUD mobile rule');source=source.replace(before,after);new Function(source);
const bytes=Buffer.from(source.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}
console.log('Separated drawing preview from compact and expanded mobile Position controls.');
