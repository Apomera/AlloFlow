const fs=require('node:fs'),file='reports/geometry-world-graphics-2026-09-08/verify-controls-views-pass.cjs';
let s=fs.readFileSync(file,'utf8').replace("'.gw-minimap','.gw-compass-panel'", "'.gw-minimap','.gw-coordinate-hud'");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
