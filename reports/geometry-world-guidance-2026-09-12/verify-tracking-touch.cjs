'use strict';
// Single WebGL page isolates native touch input from desktop-page GPU contention.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={scope:'Current production; single-page real WebGL, native Home/Learn/Start and touch Track/Stop',checks:[],errors:[],consoleErrors:[],sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+name)).digest('hex')]))};
 const check=(pass,label,detail)=>{r.checks.push({pass:!!pass,label,...(detail?{detail}:{})});if(!pass)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
 page.setDefaultTimeout(120000);page.on('pageerror',error=>r.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')r.consoleErrors.push(message.text());});
 const guide=page.locator('.gwe-activity-guide'),track=page.getByRole('button',{name:'Track this activity',exact:true}),stop=page.getByRole('button',{name:'Stop tracking activity',exact:true});
 const signature=()=>page.evaluate(()=>{const e=__geoWorldEngine,d=__ctx.toolData.geometryWorld;return JSON.stringify({blocks:StemLab.geometryWorldBuilderPure.editableWorld(e).blocks,camera:[e.camera.position.toArray(),e.camera.quaternion.toArray()],score:d.score||0,answered:d.answeredNpcs||{},reviews:Object.entries(d.lessonActivityProgress||{}).flatMap(([lessonKey,journal])=>Object.keys(journal.reviewed||{}).filter(id=>journal.reviewed[id]).map(id=>lessonKey+':'+id)).sort()});});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.locator('.gwe-home').waitFor();await page.waitForFunction(()=>!!window.__geoWorldEngine);
  await page.locator('.gwe-home-card[data-path=learn]').tap();await page.getByLabel('Choose a lesson',{exact:true}).selectOption('geometryHarbor');
  await page.getByRole('button',{name:'Start this lesson',exact:true}).tap();await page.waitForFunction(()=>__ctx.toolData.geometryWorld.activeLesson==='geometryHarbor');
  const skip=page.getByRole('button',{name:'Skip tutorial',exact:true});if(await skip.isVisible())await skip.tap();
  await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(-22,3,17);e.camera.lookAt(-13,1.5,14);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});
  check(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches&&__glLive()&&!__glLive().lost),'Native touch Home/Learn/Start enters a live WebGL lesson');
  const expected=await page.evaluate(()=>{const a=StemLab.geometryWorldBuilderPure.activityGuideModel(__geoWorldEngine._currentLesson).activities[1];return{id:a.id,npcName:a.npcName};});
  await page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first().tap();await guide.waitFor();await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:1});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await guide.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Touch journal fits a 390px viewport');
  await track.scrollIntoViewIfNeeded();check(await track.evaluate(node=>{const b=node.getBoundingClientRect();return b.height>=44&&b.width>=44&&node.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'Touch Track has a reachable 44px target');
  const before=await signature();await track.tap();await guide.waitFor({state:'hidden'});
  await page.waitForFunction(name=>document.querySelector('.gw-guide-compass')?.getAttribute('data-tracked-npc')===name,expected.npcName);
  check(await page.evaluate(id=>__geoWorldEngine._activityWaypoint?.id===id,expected.id),'Touch Track explicitly pins the selected activity');
  check(await signature()===before,'Touch Track preserves player position, blocks, scores, and reviewed work');
  check(await page.evaluate(name=>__geoWorldEngine.npcs.find(n=>n.data.name===name)?.label.userData.geometryGuideState.tracked,expected.npcName),'Touch tracking updates the real mentor label');
  await page.screenshot({path:path.join(out,'tracking-touch-390.png'),timeout:120000});
  await page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first().tap();await guide.waitFor();await stop.tap();
  await page.waitForFunction(()=>!__geoWorldEngine._activityWaypoint);
  check(await guide.isVisible(),'Touch Stop clears the pin and keeps the journal open');
  check(await signature()===before,'Touch Stop preserves player position and learning state');
  await page.waitForFunction(()=>!document.querySelector('.gw-guide-compass')?.hasAttribute('data-tracked-npc'));
  check(true,'Touch Stop clears the real compass marker');
 }catch(error){r.failure=error.stack;await page.screenshot({path:path.join(out,'tracking-touch-failure.png'),timeout:30000}).catch(()=>{});}
 finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length&&r.checks.every(check=>check.pass);fs.writeFileSync(path.join(out,'tracking-touch-browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({pass:r.pass,checks:r.checks.length,failed:r.checks.filter(check=>!check.pass),failure:r.failure,errors:r.errors,consoleErrors:r.consoleErrors}));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
