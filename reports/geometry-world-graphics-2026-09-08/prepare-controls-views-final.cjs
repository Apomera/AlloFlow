const fs=require('node:fs');
const base='reports/geometry-world-graphics-2026-09-08/';
for(const [oldName,newName] of [['controls-views-results.json','controls-views-first-run-results.json'],['controls-views-failure.png','controls-views-first-run-failure.png']])if(fs.existsSync(base+oldName)&&!fs.existsSync(base+newName))fs.copyFileSync(base+oldName,base+newName);
const file=base+'verify-controls-views-pass.cjs';
let s=fs.readFileSync(file,'utf8');
s=s.replace("enabled:__geoWorldEngine._touchControlsEnabled}));", "enabled:__geoWorldEngine._touchControlsEnabled,nativePointerLock:!!document.pointerLockElement}));");
s=s.replace("&&!after.up&&!after.down};", "&&!after.up&&!after.down&&!after.nativePointerLock};");
s=s.replace("   await page.setViewportSize(size);", `   if(size.width<800||size.landscape){await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',configurable:true});});await page.waitForFunction(()=>!document.pointerLockElement);}
   await page.setViewportSize(size);`);
s=s.replace("const groups=['.gw-hotbar','.gw-shape-tray','.gwe-builder-dock','.gw-touch-look-panel']", "const groups=['.gw-hotbar','.gw-shape-tray','.gwe-builder-dock','.gw-touch-look-panel','.gw-action-bar']");
s=s.replace("'.gw-touch-look-panel','.gw-touch-actions']", "'.gw-touch-look-panel','.gw-touch-actions','.gw-minimap','.gw-compass-panel']");
s=s.replace("const label=size.width+'x'+size.height,row=", "const label=size.width+'x'+size.height;console.log('Verifying '+label);const row=");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
