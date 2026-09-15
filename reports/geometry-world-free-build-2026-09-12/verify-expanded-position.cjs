'use strict';
const fs=require('node:fs'),path=require('node:path');let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={checks:[],layouts:[],errors:[],consoleErrors:[]};const check=(label,pass,detail)=>{r.checks.push({label,pass:!!pass,detail});if(!pass)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(30000);page.on('pageerror',err=>r.errors.push(err.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});await page.waitForFunction(()=>!!__geoWorldEngine);await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.getByRole('button',{name:'Hide the Geometry World game bar',exact:true}).click();await page.locator('.gw-coordinate-hud summary').click();
  for(const state of ['ready','aim'])for(const spec of [{width:320,height:700},{width:390,height:844},{width:320,height:568}]){
   await page.setViewportSize(spec);await page.locator('#geoworld-fs-wrap').focus();
   await page.evaluate(kind=>{const e=__geoWorldEngine,p=e.camera.position;e.flyMode=true;e.velocity.set(0,0,0);if(kind==='aim'){e.camera.lookAt(p.x,p.y+5,p.z-5);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);}else e.aimAtBuildArea();document.querySelector('.gw-coordinate-hud').scrollTop=0;},state);
   await page.locator('.gw-placement-hint[data-placement-state="'+state+'"]').waitFor();
   const detail=await page.evaluate(()=>{const rect=n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};},panel=rect(document.querySelector('.gw-coordinate-hud')),hint=rect(document.querySelector('.gw-placement-hint')),cross=rect(document.querySelector('.gw-crosshair')),cx=cross.x+cross.w/2,cy=cross.y+cross.h/2;const reach=selector=>{const n=document.querySelector(selector),b=n.getBoundingClientRect();return n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));};return{panel,hint,crosshair:cross,gap:hint.y-panel.bottom,panelHintOverlap:panel.x<hint.right&&panel.right>hint.x&&panel.y<hint.bottom&&panel.bottom>hint.y,crosshairCenterCovered:cx>=hint.x&&cx<=hint.right&&cy>=hint.y&&cy<=hint.bottom,recoveryReachable:reach('.gwe-home-shortcut')&&reach('.gw-toolbar-reveal'),overflow:document.documentElement.scrollWidth>innerWidth};});
   const label=state+' '+spec.width+'×'+spec.height;r.layouts.push({label,...detail});
   check(label+' keeps Position and placement guidance separate',!detail.panelHintOverlap,detail);
   check(label+' leaves the crosshair center clear',!detail.crosshairCenterCovered);
   check(label+' keeps both recovery controls reachable without document overflow',detail.recoveryReachable&&!detail.overflow);
   const sr=page.locator('.gw-coordinate-hud > button');await sr.scrollIntoViewIfNeeded();check(label+' exposes the screen-reader toggle through panel scrolling',await sr.evaluate(n=>{const b=n.getBoundingClientRect();return n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}));
   if(spec.height!==568)await page.screenshot({path:path.join(out,'final-expanded-position-'+state+'-'+spec.width+'.png'),timeout:120000});
  }
 }catch(error){r.failure=error.stack;await page.screenshot({path:path.join(out,'expanded-position-failure.png'),timeout:30000}).catch(()=>{});}
 finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length&&r.checks.every(c=>c.pass);fs.writeFileSync(path.join(out,'final-expanded-position.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
