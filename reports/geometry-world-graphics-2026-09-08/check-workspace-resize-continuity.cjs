const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'verify-workspace-pass.cjs');let source=fs.readFileSync(file,'utf8');
const marker='window.__workspaceFingerprint=async()=>{';
assert.equal(source.split(marker).length-1,1);source=source.replace(marker,'window.__workspaceEngine=en;\n      '+marker);
const before="await expanded(false);\n        frame.overflow=";
const after="frame.resizeContinuity=await page.evaluate(()=>({sameEngine:window.__geoWorldEngine===window.__workspaceEngine,studentBlocks:Object.values(__geoWorldEngine.blocks).filter(mesh=>!mesh.userData._lessonBlock).length,mobileGateVisible:!!document.querySelector('#gw-mobile-title')}));\n        check(frame.resizeContinuity.sameEngine&&frame.resizeContinuity.studentBlocks===150&&!frame.resizeContinuity.mobileGateVisible,label+': responsive resize preserves the mounted engine and all student blocks');\n        await expanded(false);\n        frame.overflow=";
assert.equal(source.split(before).length-1,1);source=source.replace(before,after);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
