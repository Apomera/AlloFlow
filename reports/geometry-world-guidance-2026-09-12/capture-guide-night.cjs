const fs=require('node:fs'),path=require('node:path');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false,envPreset:"night"});');
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
  report.before=await page.evaluate(()=>{const e=__geoWorldEngine,n=e.npcs.find(n=>n.data.question);e._entryAnim=null;e.flyMode=true;e._ambientMotionEnabled=false;e.velocity.set(0,0,0);e._activityWaypoint={npcName:n.data.name};e.camera.position.set(n.body.position.x+1.4,n.data.position[1]+2.6,n.body.position.z+2.6);e.camera.lookAt(n.body.position.x,n.data.position[1]+2.1,n.body.position.z);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);return {count:Object.keys(e.blocks).length,name:n.data.name,uuid:n.label.material.map.uuid};});await frames();
  report.night=await page.evaluate(()=>{const e=__geoWorldEngine,n=e.npcs.find(n=>n.data.question);return {intensity:e.sun.intensity,state:n.label.userData.geometryGuideState,toneMapped:n.label.material.toneMapped};});
  check(Math.abs(report.night.intensity-0.22)<0.0001,'Actual production night preset has the authored night sun intensity');
  check(report.night.state.kind==='question'&&report.night.state.tracked&&!report.night.toneMapped,'Pinned question guide uses consistent unlit typography at night');
  await page.screenshot({path:path.join(out,'guide-night.png'),timeout:90000});
  await page.evaluate(()=>{const e=__geoWorldEngine,index=e.npcs.findIndex(n=>n.data.question);e._answeredRef={[index]:true};});await frames();
  report.complete=await page.evaluate(()=>{const n=__geoWorldEngine.npcs.find(n=>n.data.question);return {state:n.label.userData.geometryGuideState,uuid:n.label.material.map.uuid};});
  check(report.complete.state.kind==='complete'&&report.complete.uuid===report.before.uuid,'Completing a question repaints its vector check without replacing the texture');
  await page.screenshot({path:path.join(out,'guide-complete.png'),timeout:90000});
 }catch(error){report.failure=error.stack;}
 finally{report.pass=!report.failure&&!report.errors.length&&!report.consoleErrors.length;fs.writeFileSync(path.join(out,'guide-night-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));if(!report.pass)process.exitCode=1;}
};
eval(harness+'('+run.toString()+')();');
