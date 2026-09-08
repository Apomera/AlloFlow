const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'verify-workspace-pass.cjs');let source=fs.readFileSync(file,'utf8');
const before='await page.waitForFunction(index=>__ctx.toolData.geometryWorld.selectedBlock===index,index);';
assert.equal(source.split(before).length-1,1);
source=source.replace(before,before+'\n          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));');
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
