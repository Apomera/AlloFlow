const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'verify-workspace-pass.cjs');let source=fs.readFileSync(file,'utf8');
const before="__ctx.updateMulti('geometryWorld',{renderQuality:'saver',autoCycle:false,showGameSettings:false,sandboxDockCollapsed:false,touchMode:true});";
assert.equal(source.split(before).length-1,1);
source=source.replace(before,"en.blocksPlaced=Object.values(en.blocks).filter(mesh=>!mesh.userData._lessonBlock).length;\n      __ctx.updateMulti('geometryWorld',{blocksPlaced:en.blocksPlaced,renderQuality:'saver',autoCycle:false,showGameSettings:false,sandboxDockCollapsed:false,touchMode:true});");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
