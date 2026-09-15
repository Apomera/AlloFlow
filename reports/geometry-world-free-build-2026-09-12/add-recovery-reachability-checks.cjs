'use strict';
const fs=require('node:fs'),file='reports/geometry-world-free-build-2026-09-12/verify-neutral-aim.cjs';let s=fs.readFileSync(file,'utf8');
s=s.replace("{name:'390px hidden game bar',width:390,height:844},{name:'390px shown game bar'","{name:'390px hidden game bar',width:390,height:844},{name:'320px hidden game bar',width:320,height:700},{name:'390px shown game bar'");
const anchor="r.alignmentLayouts.push({name:spec.name,...detail});";if(s.split(anchor).length!==2)throw Error('Unexpected layout record');
s=s.replace(anchor,anchor+`
   if(spec.name==='390px hidden game bar'||spec.name==='320px hidden game bar'){
    const recovery=await page.evaluate(()=>{const read=selector=>{const n=document.querySelector(selector),b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,atCenter:n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};};const home=read('.gwe-home-shortcut'),bar=read('.gw-toolbar-reveal');return {home,bar,overlap:home.x<bar.x+bar.w&&home.x+home.w>bar.x&&home.y<bar.y+bar.h&&home.y+home.h>bar.y,overflow:document.documentElement.scrollWidth>innerWidth};});
    check(spec.name+' exposes both recovery controls without overlap',recovery.home.atCenter&&recovery.bar.atCenter&&!recovery.overlap,recovery);
    check(spec.name+' gives both recovery controls 44px targets',recovery.home.w>=44&&recovery.home.h>=44&&recovery.bar.w>=44&&recovery.bar.h>=44);
    check(spec.name+' has no document overflow',!recovery.overflow);
    if(spec.name==='390px hidden game bar'){await page.locator('.gwe-home-shortcut').click({timeout:15000});await page.locator('.gwe-home').waitFor();check('Narrow World home opens the welcome screen',true);await page.keyboard.press('Escape');await page.locator('.gwe-home').waitFor({state:'hidden'});check('Escape returns from World home with the game bar still hidden',await page.evaluate(()=>__ctx.toolData.geometryWorld.toolbarCollapsed===true));}
   }
`);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
