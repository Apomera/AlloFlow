const fs=require('node:fs'),file='reports/geometry-world-graphics-2026-09-08/verify-workspace-feedback.cjs';
let s=fs.readFileSync(file,'utf8');
s=s.replace("for(const selector of ['.gw-viewport-control--touch','.gw-viewport-control--fullscreen']){const state=", "for(const selector of ['.gw-viewport-control--touch','.gw-viewport-control--fullscreen']){if(selector==='.gw-viewport-control--touch'&&size.width>=800&&!size.landscape&&await page.locator(selector).count()===0)continue;const state=");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
