'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
harness=harness.replace('window.__events = { toasts: [], errors: [] };','window.__events = { toasts: [], errors: [], announcements: [] };').replace('announceToSR: function () {},','announceToSR: function (message) { window.__events.announcements.push(String(message)); },');
const run=async function(){
 const r={scope:'Current local production with native React/Three UI and real WebGL; no external AI calls',checks:[],errors:[],consoleErrors:[],screenshots:[],sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+name)).digest('hex')]))};
 const check=(ok,label,detail)=>{r.checks.push({pass:!!ok,label,...(detail?{detail}:{})});if(!ok)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page=await browser.newPage({viewport:{width:1440,height:1000}});
 const watch=p=>{p.setDefaultTimeout(60000);p.on('pageerror',error=>r.errors.push(error.message));p.on('console',message=>{if(message.type()==='error')r.consoleErrors.push(message.text());});};watch(page);
 const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:60000});r.screenshots.push(name+'.png');};
 const guide=()=>page.locator('.gwe-activity-guide');
 const track=()=>page.getByRole('button',{name:'Track this activity',exact:true});
 const stop=()=>page.getByRole('button',{name:'Stop tracking activity',exact:true});
 const choose=()=>page.getByLabel('Choose an activity',{exact:true});
 const compass=()=>page.locator('canvas[aria-label*="NPC compass strip"]');
 const signature=()=>page.evaluate(()=>{const e=__geoWorldEngine,d=__ctx.toolData.geometryWorld;return JSON.stringify({title:e._currentLesson.title,blocks:StemLab.geometryWorldBuilderPure.editableWorld(e).blocks,selection:e._builderSelection,undo:e._undoStack,redo:e._redoStack,camera:[e.camera.position.toArray(),e.camera.quaternion.toArray()],score:d.score||0,answered:d.answeredNpcs||{},reviews:Object.entries(d.lessonActivityProgress||{}).flatMap(([lessonKey,journal])=>Object.keys(journal.reviewed||{}).filter(id=>journal.reviewed[id]).map(id=>lessonKey+':'+id)).sort()});});
 const openGuide=async()=>{await page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first().click();await guide().waitFor();await frames();};
 const closeGuide=async()=>{await page.getByRole('button',{name:'Close activity guide',exact:true}).click();await guide().waitFor({state:'hidden'});await frames();};
 const openHome=async()=>{if(await guide().isVisible())await closeGuide();await page.getByRole('button',{name:'Geometry World home',exact:true}).filter({visible:true}).first().click();await page.locator('.gwe-home').waitFor();};
 const selectPreview=async id=>{await page.locator('.gwe-home').waitFor({timeout:120000});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});await page.locator('.gwe-home-card[data-path=learn]').click();await page.getByLabel('Choose a lesson',{exact:true}).selectOption(id);};
 const startPreview=async id=>{await page.getByRole('button',{name:'Start this lesson',exact:true}).click();await page.waitForFunction(id=>window.__geoWorldEngine&&__ctx.toolData.geometryWorld.activeLesson===id,id);const skip=page.getByRole('button',{name:'Skip tutorial',exact:true});if(await skip.isVisible())await skip.click();await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(-22,3,17);e.camera.lookAt(-13,1.5,14);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});await frames();};
 const startHarbor=async()=>{await selectPreview('geometryHarbor');await startPreview('geometryHarbor');};
 const waypoint=()=>page.evaluate(()=>__geoWorldEngine._activityWaypoint||null);
 const waitTracked=async name=>page.waitForFunction(name=>{const element=document.querySelector('canvas[aria-label*="NPC compass strip"]');return element&&element.getAttribute('data-tracked-npc')===name;},name);
 const reachable=async(locator,label)=>{await locator.scrollIntoViewIfNeeded();const value=await locator.evaluate(node=>{const b=node.getBoundingClientRect();return{width:b.width,height:b.height,hit:node.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};});check(value.width>=44&&value.height>=44&&value.hit,label,value);};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await startHarbor();
  check(await page.evaluate(()=>__glLive()&&!__glLive().lost),'Activity tracking starts on a live WebGL world');
  const initialWaypoint=await waypoint();check(!initialWaypoint,'A fresh lesson has no implicitly pinned activity');
  const activities=await page.evaluate(()=>StemLab.geometryWorldBuilderPure.activityGuideModel(__geoWorldEngine._currentLesson).activities.map(a=>({id:a.id,title:a.title,npcName:a.npcName})));const pinned=activities[2];
  const untrackedPixels=await compass().evaluate(canvas=>canvas.toDataURL());
  await page.evaluate(name=>{const npc=__geoWorldEngine.npcs.find(n=>n.data.name===name);window.__trackingLabelBefore={sprite:npc.label.uuid,texture:npc.label.material.map.uuid};},pinned.npcName);
  await openGuide();await choose().selectOption({index:2});const beforePin=await signature();
  await reachable(track(),'Track control is a reachable 44px button');await track().click();await guide().waitFor({state:'hidden'});await frames();
  const tracked=await waypoint();check(tracked&&tracked.id===pinned.id&&tracked.npcName===pinned.npcName&&tracked.title===pinned.title&&tracked.count===6,'Explicit tracking pins the selected activity metadata',tracked);
  check(await signature()===beforePin,'Tracking never teleports, builds, changes scores, or reviews work');
  check(await page.evaluate(()=>{const w=__geoWorldEngine._activityWaypoint;return __ctx.toolData.geometryWorld.lessonActivityProgress[w.lessonKey].trackedId===w.id;}),'Tracking is persisted in the corresponding lesson journal');
  await waitTracked(pinned.npcName);check(await compass().getAttribute('aria-hidden')==='true'&&await compass().getAttribute('aria-live')===null,'Tracked compass remains decorative without an automatic live region');
  check(await compass().evaluate(canvas=>canvas.toDataURL())!==untrackedPixels,'Pinning visibly changes the real compass canvas');
  const labelState=await page.evaluate(name=>{const e=__geoWorldEngine,npc=e.npcs.find(n=>n.data.name===name),label=npc.label;return{state:label.userData.geometryGuideState,sprite:label.uuid,texture:label.material.map.uuid,inScene:!!e.scene.getObjectById(label.id),visible:label.visible,trackedCount:e.npcs.filter(n=>n.label&&n.label.userData.geometryGuideState&&n.label.userData.geometryGuideState.tracked).length,previous:window.__trackingLabelBefore};},pinned.npcName);
  check(labelState.state&&labelState.state.tracked&&labelState.trackedCount===1&&labelState.inScene&&labelState.visible,'Exactly the tracked mentor receives the visible in-world label treatment',labelState);
  check(labelState.sprite===labelState.previous.sprite&&labelState.texture===labelState.previous.texture,'Tracking reuses the existing label sprite and texture');
  await shot('tracking-world-1440');
  await openGuide();await choose().selectOption({index:2});check(await track().isDisabled()&&await track().getAttribute('aria-pressed')==='true','The currently tracked activity has a disabled pressed Track control');
  check((await page.locator('.gwe-activity-tracking-state').innerText()).includes(pinned.title),'Journal tracking banner identifies the pinned activity');
  check(await guide().locator('[data-map-tracked=true]').count()===1,'Route overview marks exactly one explicitly tracked stop');
  await choose().selectOption({index:4});check((await waypoint()).id===pinned.id,'Browsing another activity never retargets the pin');check(await track().isEnabled(),'Another activity can be explicitly chosen for tracking');
  await closeGuide();await waitTracked(pinned.npcName);check((await waypoint()).id===pinned.id,'Closing the journal preserves the chosen tracked mentor');
  await openGuide();check((await waypoint()).id===pinned.id,'Reopening the journal restores tracking independently of the browsed card');await closeGuide();
  // Rotate the real camera around a fixed vector to the actual tracked NPC.
  for(const test of [{yaw:0,phrase:'straight ahead'},{yaw:Math.PI/2,phrase:'to your right'},{yaw:Math.PI,phrase:'behind you'},{yaw:-Math.PI/2,phrase:'to your left'}]){
    await page.evaluate(({name,yaw})=>{const e=__geoWorldEngine,p=e.npcs.find(n=>n.data.name===name).body.position;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(p.x,3,p.z+8);e.euler.set(0,yaw,0,'YXZ');e.camera.quaternion.setFromEuler(e.euler);e.camera.updateMatrixWorld(true);document.getElementById('allo-live-geometryworld').textContent='';},{name:pinned.npcName,yaw:test.yaw});
    await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press('KeyL');
    await page.waitForFunction(()=>window.__liveRegion&&__liveRegion().startsWith('Tracked activity:'));
    const spoken=await page.evaluate(()=>__liveRegion());check(spoken==='Tracked activity: '+pinned.title+'. '+pinned.npcName+' is 8 steps '+test.phrase+'.','Locate announces the tracked mentor '+test.phrase+' with distance',spoken);
  }
  await page.evaluate(name=>{const e=__geoWorldEngine,p=e.npcs.find(n=>n.data.name===name).body.position;e.camera.position.set(p.x,3,p.z+8);e.camera.lookAt(p.x,p.y+1,p.z);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);},pinned.npcName);await frames();await shot('tracked-guide-label');
  await openGuide();await choose().selectOption({index:2});const beforeStop=await signature();await stop().click();await frames();check(!await waypoint(),'Stop tracking clears the active waypoint');check(await guide().isVisible()&&await track().evaluate(node=>document.activeElement===node),'Stopping keeps the journal open and returns focus to Track');check(await signature()===beforeStop,'Stopping does not move the player or alter learning scores');
  check(await page.evaluate(key=>!__ctx.toolData.geometryWorld.lessonActivityProgress[key].trackedId,tracked.lessonKey),'Stopping clears the persisted pin');
  await closeGuide();await frames();check(await compass().getAttribute('data-tracked-npc')===null,'Unpinning removes the tracked compass attribute');check(await page.evaluate(name=>!__geoWorldEngine.npcs.find(n=>n.data.name===name).label.userData.geometryGuideState.tracked,pinned.npcName),'Unpinning restores the mentor label state');
  await openGuide();await choose().selectOption({index:2});await track().click();await guide().waitFor({state:'hidden'});await waitTracked(pinned.npcName);
  await page.evaluate(name=>{window.__oldTrackedLabel=__geoWorldEngine.npcs.find(n=>n.data.name===name).label;},pinned.npcName);
  await openHome();await selectPreview('volumeExplorer');check((await waypoint()).id===pinned.id,'Previewing a different lesson leaves the current pin intact');await startPreview('volumeExplorer');check(!await waypoint(),'Starting another lesson clears the previous world waypoint');
  check(await page.evaluate(()=>!__geoWorldEngine.scene.getObjectById(window.__oldTrackedLabel.id)),'The previous tracked label does not leak into the new scene');
  await openHome();await startHarbor();await waitTracked(pinned.npcName);check((await waypoint()).id===pinned.id,'Returning to the same lesson restores its saved tracked activity');
  await page.evaluate(()=>__ctx.setStemLabTool('printLab'));await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();await page.evaluate(()=>__ctx.setStemLabTool('geometryWorld'));await startHarbor();await waitTracked(pinned.npcName);check((await waypoint()).id===pinned.id,'Tracking survives a real tool unmount and remount for the same lesson');
  await openGuide();await choose().selectOption({index:2});
  for(const size of [{width:390,height:844},{width:320,height:700},{width:844,height:390}]){
    await page.setViewportSize(size);await frames();check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await guide().evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Tracking journal has no horizontal overflow at '+size.width+'x'+size.height);
    await reachable(stop(),'Stop tracking is reachable at '+size.width);const preserved=await signature();await stop().click();await reachable(track(),'Track is reachable at '+size.width);await shot('tracking-journal-'+size.width+'x'+size.height);await track().click();await guide().waitFor({state:'hidden'});await waitTracked(pinned.npcName);check(await signature()===preserved,'Pin/unpin preserves scene and scores at '+size.width);await shot('tracking-world-'+size.width+'x'+size.height);await openGuide();await choose().selectOption({index:2});
  }
  await page.setViewportSize({width:1440,height:1000});await stop().click();await closeGuide();await openHome();await startHarbor();check(!await waypoint(),'A stopped pin stays cleared when the lesson is reopened');
  const desktop=page;page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});watch(page);await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await startHarbor();await openGuide();await choose().selectOption({index:1});const touchBefore=await signature();await track().tap();await guide().waitFor({state:'hidden'});await waitTracked(activities[1].npcName);check((await waypoint()).id===activities[1].id,'Touch Track pins the selected activity');check(await signature()===touchBefore,'Touch Track does not teleport or grade the student');await shot('tracking-touch-390');await openGuide();await stop().tap();check(!await waypoint(),'Touch Stop removes the pin');await page.close();page=desktop;
 }catch(error){r.failure=error.stack;await shot('tracking-failure').catch(()=>{});}
 finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length&&r.checks.every(check=>check.pass);fs.writeFileSync(path.join(out,'tracking-browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({pass:r.pass,checks:r.checks.length,failed:r.checks.filter(check=>!check.pass),failure:r.failure,errors:r.errors,consoleErrors:r.consoleErrors}));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
