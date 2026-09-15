'use strict';
const fs=require('node:fs'),file='reports/geometry-world-free-build-2026-09-12/verify-neutral-aim.cjs';let s=fs.readFileSync(file,'utf8');
const anchor="  await page.evaluate(()=>{const e=__geoWorldEngine,p=e.camera.position;e.flyMode=true;";
if(s.split(anchor).length!==2)throw Error('Unexpected camera fixture anchor');
s=s.replace(anchor,`  const nativeCamera=await page.evaluate(()=>__geoWorldEngine.camera.position.toArray());
  await page.keyboard.press('KeyB');await page.waitForFunction(()=>__worldState().studentBlocks===1,{},{timeout:15000});
  check('Native first B places one block before camera fixtures',true);
  check('Native first B preserves the entry camera position',await page.evaluate(old=>JSON.stringify(old)===JSON.stringify(__geoWorldEngine.camera.position.toArray()),nativeCamera));
  await page.keyboard.press('Control+z');await page.waitForFunction(()=>__worldState().studentBlocks===0,{},{timeout:15000});check('Native Undo removes the first block',true);
  // Reopen a native blank world because first-block guidance tracks prior placement input, not the Undo count.
  await page.getByRole('button',{name:'Geometry World home',exact:true}).filter({visible:true}).first().click();await page.locator('.gwe-home').waitFor();
  if(!await page.getByRole('button',{name:'Open blank sandbox',exact:true}).isVisible())await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.getByRole('button',{name:'Start building',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='geoworld-fs-wrap');
`+anchor);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
