const fs=require('node:fs'),path=require('node:path'),d=__dirname;
let s=fs.readFileSync(path.join(d,'browser-print-camera.cjs'),'utf8');
s=s.replace("r.failure=e.stack;console.log(e.stack);", "r.failure=e.stack;r.failedState=await page.evaluate(()=>{const e=__geoWorldEngine;return{preset:e._viewPreset,anim:e._viewPresetAnim,input:e.isInputActive(),active:document.activeElement?.outerHTML,keyboardFocus:e.keyboardFocused,_keyboardFocus:e._keyboardFocused,position:e.camera.position.toArray(),modal:e._modalState,move:e.moveState,look:e.lookState,data:__ctx.toolData.geometryWorld,toasts:__events.toasts.slice(-10)}});console.log(JSON.stringify(r.failedState));console.log(e.stack);");
s=s.replaceAll('browser-print-camera.json','browser-print-camera-diagnostic.json');fs.writeFileSync(path.join(d,'browser-print-camera-diagnostic.cjs'),s);
console.log('Prepared print diagnostic');
