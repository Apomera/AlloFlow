'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={checks:[],errors:[],consoleErrors:[],screenshots:[],sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+n)).digest('hex')]))};
 const check=(ok,label,detail)=>{r.checks.push({label,pass:!!ok,...(detail?{detail}:{})});if(!ok)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  for(const view of [
   {id:'areaSurface',title:'Area & Surface Area',p:[22,15,26],t:[9,2.5,7],image:'area-surface-final'},
   {id:'compositeVolume',title:'Composite Volume',p:[-3,11,13],t:[6,1.5,5],image:'composite-volume-final'}
  ]) {
   const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(60000);
   page.on('pageerror',e=>r.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
   const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
   await page.locator('.gwe-home').waitFor({timeout:120000});
   await page.locator('.gwe-home-card[data-path=learn]').click();
   await page.getByLabel('Choose a lesson',{exact:true}).selectOption(view.id);
   await page.getByRole('button',{name:'Start this lesson',exact:true}).click();
   await page.waitForFunction(title=>window.__geoWorldEngine&&__geoWorldEngine._currentLesson.title.includes(title),view.title);
   await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);});
   const skip=page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true});if(await skip.isVisible())await skip.click();await frames();
   const mode=await page.evaluate(()=>({activeLesson:__ctx.toolData.geometryWorld.activeLesson,worldTitle:__geoWorldEngine._currentLesson.title,sandbox:!!__geoWorldEngine._currentLesson.sandbox,mode:document.querySelector('#geoworld-fs-workspace').getAttribute('data-geometry-mode'),sandboxDock:!!document.querySelector('.gwe-builder-dock')}));
   check(mode.activeLesson===view.id&&mode.worldTitle.includes(view.title)&&!mode.sandbox&&mode.mode==='lesson'&&!mode.sandboxDock,view.id+' native Home Learn flow keeps host state, world and visible mode consistent',mode);
   const before=await page.evaluate(()=>JSON.stringify({title:__geoWorldEngine._currentLesson.title,count:__geoWorldEngine.getConstructionBlockCount(),activeLesson:__ctx.toolData.geometryWorld.activeLesson}));
   const launch=page.locator('.gwe-free-build-launch');
   check(await launch.getAttribute('aria-haspopup')==='dialog',view.id+' Free Build control is an action that opens a dialog');
   await launch.click();await page.locator('#gwe-sandbox-launcher').waitFor();
   check(await page.evaluate(()=>JSON.stringify({title:__geoWorldEngine._currentLesson.title,count:__geoWorldEngine.getConstructionBlockCount(),activeLesson:__ctx.toolData.geometryWorld.activeLesson}))===before,view.id+' opening Free Build options keeps the current lesson intact');
   await page.locator('#gwe-sandbox-launcher').getByRole('button',{name:'Cancel',exact:true}).click();
   await page.locator('#gwe-sandbox-launcher').waitFor({state:'hidden'});
   check(await page.locator('#geoworld-fs-workspace').getAttribute('data-geometry-mode')==='lesson',view.id+' cancelling Free Build retains lesson mode');
   await page.evaluate(v=>{const e=__geoWorldEngine;e.camera.position.fromArray(v.p);e.camera.lookAt(...v.t);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);},view);await frames();
   await page.screenshot({path:path.join(out,view.image+'.png'),timeout:90000});r.screenshots.push(view.image+'.png');
   await page.close();
  }
 } catch(error) { r.failure=error.stack; }
 finally {r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length;fs.writeFileSync(path.join(out,'guided-presets-final.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
