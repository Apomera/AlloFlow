const fs=require('node:fs');
const path='stem_lab/stem_tool_geometryworld_builder.js';
let source=fs.readFileSync(path,'utf8');
const before='.gwe-home-shortcut{position:absolute;z-index:155;top:8px;left:156px;min-height:40px;border:1px solid #9bb89e66;border-radius:10px;background:#173b35;color:#f5f0e5;padding:7px 12px;cursor:pointer;font-size:12px}';
const rules='@media(max-width:800px){#geoworld-fs-workspace>.gwe-home-shortcut{top:56px;left:auto;right:8px;min-height:44px}#geoworld-fs-workspace[data-toolbar-collapsed=true]:not([data-fullscreen=true])>.gw-toolbar-reveal{min-height:44px}}';
if(source.split(before).length!==2)throw new Error('Expected one World home shortcut style anchor');
source=source.replace(before,before+rules);new Function(source);
if(process.argv.includes('--check'))console.log('Recovery control separation anchor and syntax verified; production unchanged.');
else {const fd=fs.openSync(path,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}console.log('Applied narrow recovery control separation.');}
