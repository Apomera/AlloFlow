'use strict';
const fs=require('node:fs'),file='reports/geometry-world-free-build-2026-09-12/verify-free-build.cjs';let s=fs.readFileSync(file,'utf8');
const anchor='  // Original arch fixture gives the actual selection/focus/showcase controls something to frame.';
if(s.split(anchor).length!==2)throw Error('Unexpected fixture anchor');
s=s.replace(anchor,`  for(const recipe of [{name:'wood',key:'Digit3',index:2,shape:0},{name:'gold',key:'Digit5',index:4,shape:0},{name:'glass-wedge',key:'Digit7',index:6,shape:3}]){await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press(recipe.key);if(recipe.shape===3){await page.keyboard.press('KeyQ');await page.keyboard.press('KeyQ');await page.keyboard.press('KeyQ');}await page.waitForFunction(expected=>__geoWorldEngine._placeState.selectedBlock===expected.index&&__geoWorldEngine._placeState.selectedShape===expected.shape,recipe);r.checks['preview-'+recipe.name]=await ui();await snap('preview-'+recipe.name);}await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press('Digit1');await page.keyboard.press('KeyQ');
`+anchor);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
