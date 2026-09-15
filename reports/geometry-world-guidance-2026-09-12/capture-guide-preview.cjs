const fs=require('node:fs'),path=require('node:path');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const report={checks:[],errors:[],consoleErrors:[]};
 const check=(pass,label)=>{report.checks.push({pass:!!pass,label});if(!pass)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});
  await page.locator('.gwe-home-card[data-path=learn]').click();await page.getByLabel('Choose a lesson',{exact:true}).selectOption('geometryHarbor');await page.getByRole('button',{name:'Start this lesson',exact:true}).click();
  const skip=page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true});if(await skip.isVisible())await skip.click();await frames();
  report.before=await page.evaluate(()=>{const e=__geoWorldEngine,n=e.npcs[0];e._entryAnim=null;e.flyMode=true;e._ambientMotionEnabled=false;e.velocity.set(0,0,0);e.camera.position.set(n.body.position.x+2,n.data.position[1]+2.8,n.body.position.z+3.4);e.camera.lookAt(n.body.position.x,n.data.position[1]+1.9,n.body.position.z);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);return {count:Object.keys(e.blocks).length,name:n.data.name,uuid:n.label.material.map.uuid,kind:n.label.userData.geometryGuideState.kind};});await frames();
  check(report.before.count===2673,'Guide artwork leaves every Harbor cell intact');
  await page.screenshot({path:path.join(out,'guide-day.png'),timeout:90000});
  await page.evaluate(()=>{const e=__geoWorldEngine;e._activityWaypoint={npcName:e.npcs[0].data.name,title:'Arrival Quay',index:0,count:8};});await frames();
  report.tracked=await page.evaluate(()=>{const e=__geoWorldEngine,n=e.npcs[0],cv=document.querySelector('.gw-guide-compass');return {name:cv.getAttribute('data-tracked-npc'),state:n.label.userData.geometryGuideState,uuid:n.label.material.map.uuid,hidden:cv.getAttribute('aria-hidden'),toneMapped:n.label.material.toneMapped,depthWrite:n.label.material.depthWrite};});
  check(report.tracked.name===report.before.name&&report.tracked.state.tracked,'Pinned guide is represented in both compass and world nameplate');
  check(report.tracked.uuid===report.before.uuid&&!report.tracked.toneMapped&&!report.tracked.depthWrite,'Pin redraw reuses the texture and preserves consistent unlit typography');
  check(report.tracked.hidden==='true','Decorative compass stays hidden from assistive technology');
  await page.screenshot({path:path.join(out,'guide-tracked.png'),timeout:90000});
  await page.evaluate(()=>{const e=__geoWorldEngine,n=e.npcs[0];e.camera.position.set(n.body.position.x+1.3,n.data.position[1]+2.6,n.body.position.z+2.3);e.camera.lookAt(n.body.position.x,n.data.position[1]+2.05,n.body.position.z);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});await frames();
  await page.screenshot({path:path.join(out,'guide-close.png'),timeout:90000});
  await page.evaluate(()=>{document.documentElement.classList.add('theme-contrast');__geoWorldEngine._guideContrastAt=0;});await frames();
  report.contrast=await page.evaluate(()=>__geoWorldEngine.npcs[0].label.userData.geometryGuideState);
  check(report.contrast.contrast,'High contrast theme repaints guide textures');
  await page.screenshot({path:path.join(out,'guide-contrast.png'),timeout:90000});
  await page.evaluate(()=>{document.documentElement.classList.remove('theme-contrast');const e=__geoWorldEngine;e._guideContrastAt=0;e._activityWaypoint=null;e._answeredRef={0:true};});await frames();
  report.after=await page.evaluate(()=>{const e=__geoWorldEngine,n=e.npcs[0];return {state:n.label.userData.geometryGuideState,pinned:document.querySelector('.gw-guide-compass').hasAttribute('data-tracked-npc'),uuid:n.label.material.map.uuid};});
  check(report.after.state.kind==='discovery'&&!report.after.state.tracked&&!report.after.pinned,'Ungraded welcome remains a discovery and removing pin clears both representations');
  check(report.after.uuid===report.before.uuid,'Answer and contrast changes retain the same GPU texture');
  await page.evaluate(()=>{const e=__geoWorldEngine,n=e.npcs.find(n=>n.data.question);e._answeredRef={};e._activityWaypoint={npcName:n.data.name};e.camera.position.set(n.body.position.x+1.4,n.data.position[1]+2.6,n.body.position.z+2.6);e.camera.lookAt(n.body.position.x,n.data.position[1]+2.1,n.body.position.z);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});await frames();
  await page.screenshot({path:path.join(out,'guide-question.png'),timeout:90000});
  await page.getByLabel('Time of day / environment preset',{exact:true}).selectOption('night',{force:true});
  await page.waitForFunction(()=>__geoWorldEngine._envDone===true);await frames();
  await page.screenshot({path:path.join(out,'guide-night.png'),timeout:90000});
  report.night=await page.evaluate(()=>{const n=__geoWorldEngine.npcs.find(n=>n.data.question);return {state:n.label.userData.geometryGuideState,toneMapped:n.label.material.toneMapped};});
  check(report.night.state.kind==='question'&&!report.night.toneMapped,'Activity guide text stays unlit and readable in the actual night preset');
  await page.evaluate(()=>{const e=__geoWorldEngine,index=e.npcs.findIndex(n=>n.data.question);e._answeredRef={[index]:true};});await frames();
  check(await page.evaluate(()=>__geoWorldEngine.npcs.find(n=>n.data.question).label.userData.geometryGuideState.kind==='complete'),'A graded guide receives a completed vector check');
  await page.screenshot({path:path.join(out,'guide-complete.png'),timeout:90000});
 }catch(error){report.failure=error.stack;}
 finally{report.pass=!report.failure&&!report.errors.length&&!report.consoleErrors.length;fs.writeFileSync(path.join(out,'guide-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));if(!report.pass)process.exitCode=1;}
};
eval(harness+'('+run.toString()+')();');
