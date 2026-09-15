const fs=require('node:fs'),assert=require('node:assert/strict');
const file='stem_lab/stem_tool_geometryworld.js',raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let source=raw.replace(/\r\n/g,'\n');
const start=source.indexOf('      "@media(max-width:800px){#geoworld-fs-workspace.gw-root[data-geometry-mode=');assert(start>0);
const end=source.indexOf('\n',start);assert(end>start);
const css='@media(max-width:800px) and (min-height:520px) and (orientation:portrait){#geoworld-fs-workspace.gw-root[data-geometry-mode="sandbox"][data-touch-active="false"]>.gw-coordinate-hud[open]{max-height:calc(50% - 188px)}#geoworld-fs-workspace.gw-root[data-geometry-mode="sandbox"][data-touch-active="false"]:has(>.gw-coordinate-hud[open]) .gw-placement-hint{top:calc(50% - 108px)}}';
source=source.slice(0,end)+'\n      '+JSON.stringify(css)+','+source.slice(end);new Function(source);
const data=Buffer.from(source.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}
console.log('Separated expanded portrait Position details from placement guidance.');
