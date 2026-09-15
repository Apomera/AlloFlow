'use strict';
const fs=require('node:fs'),file='reports/geometry-world-free-build-2026-09-12/verify-neutral-aim.cjs';let s=fs.readFileSync(file,'utf8');
s=s.replace("check('Native first B places one block before camera fixtures',true);","check('Native first B places one block before camera fixtures',true);await page.screenshot({path:path.join(out,'final-native-first-b-latest.png'),timeout:120000});");
s=s.replace("await page.keyboard.press('Escape');await page.locator('.gwe-home').waitFor({state:'hidden'});check('Escape returns from World home with the game bar still hidden'","await page.locator('.gwe-home-continue').click();await page.locator('.gwe-home').waitFor({state:'hidden'});check('Continue returns from World home with the game bar still hidden'");
const anchor="    check(spec.name+' has no document overflow',!recovery.overflow);";if(s.split(anchor).length!==2)throw Error('Unexpected recovery check');
s=s.replace(anchor,anchor+`
    if(spec.name==='320px hidden game bar'){
     const position=page.locator('.gw-coordinate-hud summary');if(await position.count()){
      await position.click();const expanded=await page.evaluate(()=>{const reach=selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));};return{positionOpen:document.querySelector('.gw-coordinate-hud').open,home:reach('.gwe-home-shortcut'),bar:reach('.gw-toolbar-reveal'),overflow:document.documentElement.scrollWidth>innerWidth};});
      check('320px expanded Position keeps recovery controls reachable',expanded.positionOpen&&expanded.home&&expanded.bar&&!expanded.overflow,expanded);await page.screenshot({path:path.join(out,'final-toolbar-recovery-320-expanded.png'),timeout:120000});await position.click();
     }
     await page.screenshot({path:path.join(out,'final-toolbar-recovery-320.png'),timeout:120000});
    }
`);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
