'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={checks:[],errors:[],consoleErrors:[],screenshots:[],sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+n)).digest('hex')]))};
 const check=(ok,label,detail)=>{r.checks.push({label,pass:!!ok,...(detail?{detail}:{})});if(!ok)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(60000);page.on('pageerror',e=>r.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
 const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const signature=()=>page.evaluate(()=>{const e=__geoWorldEngine;return JSON.stringify({blocks:Object.entries(e.blocks).map(([k,m])=>[k,m.userData.blockType]),undo:e._undoStack,redo:e._redoStack,score:__ctx.toolData.geometryWorld.score});});
 const open=async()=>{await page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first().click();await page.locator('.gwe-activity-guide').waitFor();};
 const shot=async(name)=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:90000});r.screenshots.push(name+'.png');};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});await page.locator('.gwe-home-card[data-path=explore]').click();await page.getByRole('button',{name:'Enter Geometry Garden',exact:true}).click();await page.waitForFunction(()=>window.__geoWorldEngine&&__geoWorldEngine._currentLesson.title.includes('Geometry Garden'));
  await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);});
  const skip=page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true});if(await skip.isVisible())await skip.click();await frames();
  r.world=await page.evaluate(()=>{const e=__geoWorldEngine,targets=[[3,1,2],[8,1,2],[16,1,1],[24,1,1],[32,1,0],[32,1,8],[38,1,8],[32,1,-7],[42,1,-8],[48,1,1]],m=targets.map(p=>e.measureStructure(...p));return{count:Object.keys(e.blocks).length,construction:e.getConstructionBlockCount(),ground:e.getGroundBlockCount(),truncated:e._fillTruncated,questions:e._currentLesson.npcs.filter(n=>n.question).length,activities:e._currentLesson.activities.length,targets:m.map(m=>m.count),nestedMaterials:m[8].materialCounts};});
  check(!r.world.truncated&&r.world.count===2361&&r.world.ground===1891&&r.world.construction===470,'Garden loads all supported ground and470structures without truncation',r.world);
  check(JSON.stringify(r.world.targets)==='[1,5,15,45,24,24,24,72,125,85]','Real Measure returns the ten correct independent target volumes');
  check(r.world.nestedMaterials.glass===98&&r.world.nestedMaterials.gold===27,'Real nested model contains98glass and27visible gold cells');
  check(r.world.activities===8&&r.world.questions===0,'Explore Garden offers eight optional discoveries with no scored questions');
  const before=await signature();await open();check(await page.getByLabel('Choose an activity',{exact:true}).locator('option').count()===8,'All eight discoveries appear in the guide');
  for(let i=0;i<8;i++){
   await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:i});const target=await page.evaluate(i=>__geoWorldEngine._currentLesson.activities[i].position,i);await page.getByRole('button',{name:'Go to this activity',exact:true}).click();await page.locator('.gwe-activity-guide').waitFor({state:'hidden'});await frames();const position=await page.evaluate(()=>__geoWorldEngine.camera.position.toArray());
   check(position.every((v,j)=>Math.abs(v-target[j])<.01),'Discovery'+(i+1)+' arrives at its authored clear ground waypoint',position);check(await signature()===before,'Discovery'+(i+1)+' travel preserves the complete world and score');await open();
  }
  await page.locator('#gwe-activity-note').fill('The five layers contain45,21,15,3,and1cubes:85in total. The bounding box includes empty corners.');await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).check();check(await page.locator('.gwe-activity-progress').innerText()==='1 of 8 activities reviewed','Garden journals self-review without a quiz score');await page.locator('.gwe-activity-guide').evaluate(n=>n.scrollTop=0);await shot('garden-hidden-discovery-guide');await page.getByRole('button',{name:'Back to exploring',exact:true}).click();
  for(const view of[{name:'garden-nested-cubes-final',p:[49,7,-1],t:[44.5,3,-5.5]},{name:'garden-hidden-monument-final',p:[54,8,14],t:[49.5,2,5]},{name:'garden-discovery-overview-final',p:[29,22,29],t:[28,1,-1]}]){await page.evaluate(v=>{const e=__geoWorldEngine;e.camera.position.fromArray(v.p);e.camera.lookAt(...v.t);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);},view);await frames();await shot(view.name);}
 }catch(error){r.failure=error.stack;await shot('garden-browser-failure').catch(()=>{});}
 finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length;fs.writeFileSync(path.join(out,'garden-browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
