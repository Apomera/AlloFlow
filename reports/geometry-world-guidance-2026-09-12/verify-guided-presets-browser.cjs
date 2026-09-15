'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={scope:'Local canonical JavaScript, real React and Three/WebGL; optional activities reached through Home Learn',checks:[],errors:[],consoleErrors:[],screenshots:[],worlds:{},sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+n)).digest('hex')]))};
 const check=(ok,label,detail)=>{r.checks.push({label,pass:!!ok,...(detail?{detail}:{})});if(!ok)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page;
 const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:90000});r.screenshots.push(name+'.png');};
 try{
  for(const config of [
   {id:'areaSurface',title:'Area & Surface Area',activities:5,questions:3,ground:625,construction:244,targets:[[2,1,2],[12,1,2],[2,1,10]],counts:[72,72,100],surfaces:[108,114,130],view:{p:[22,15,26],t:[9,2.5,7]},image:'area-surface-guided-overview'},
   {id:'compositeVolume',title:'Composite Volume',activities:4,questions:4,ground:775,construction:188,targets:[[2,1,2],[14,1,2],[2,1,12]],counts:[68,56,64],view:{p:[-3,11,13],t:[6,1.5,5]},image:'composite-two-color-t'}
  ]) {
   page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(60000);
   page.on('pageerror',e=>r.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
   const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const signature=()=>page.evaluate(()=>{const e=__geoWorldEngine;return JSON.stringify({blocks:Object.entries(e.blocks).map(([k,m])=>[k,m.userData.blockType]),score:__ctx.toolData.geometryWorld.score||0,undo:e._undoStack,redo:e._redoStack});});
   const open=async()=>{await page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first().click();await page.locator('.gwe-activity-guide').waitFor();};
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
   await page.locator('.gwe-home').waitFor({timeout:120000});await page.locator('.gwe-home-card[data-path=learn]').click();
   await page.getByLabel('Choose a lesson',{exact:true}).selectOption(config.id);await page.getByRole('button',{name:'Start this lesson',exact:true}).click();
   await page.waitForFunction(title=>window.__geoWorldEngine&&__geoWorldEngine._currentLesson.title.includes(title),config.title);
   await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);});
   const skip=page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true});if(await skip.isVisible())await skip.click();await frames();
   check(await page.evaluate(()=>__glLive()&&!__glLive().lost&&__glLive().w>500),config.id+' has a live WebGL canvas');
   const world=await page.evaluate(targets=>{const e=__geoWorldEngine;return {ground:e.getGroundBlockCount(),construction:e.getConstructionBlockCount(),truncated:!!e._fillTruncated,activities:e._currentLesson.activities.length,questions:e._currentLesson.npcs.filter(n=>n.question).length,npcGround:e._currentLesson.npcs.every(n=>n.position[1]===1),measurements:targets.map(p=>{const m=e.measureStructure(...p);return {count:m.count,occupied:m.totalVolume,bounding:m.boundingVolume,surface:m.exposedSurfaceArea,materials:m.materialCounts};})};},config.targets);
   r.worlds[config.id]=world;
   check(world.ground===config.ground&&world.construction===config.construction&&!world.truncated,config.id+' loads complete teaching models and independent terrain',world);
   check(JSON.stringify(world.measurements.map(m=>m.count))===JSON.stringify(config.counts),config.id+' real measured component counts match the lesson');
   check(world.activities===config.activities&&world.questions===config.questions&&world.npcGround,config.id+' activities preserve quiz counts and ground-level guides');
   if(config.surfaces)check(JSON.stringify(world.measurements.map(m=>m.surface))===JSON.stringify(config.surfaces),'Area actual Measure confirms all six-face surface areas');
   else check(world.measurements[0].materials.diamond===48&&world.measurements[0].materials.gold===20&&world.measurements[2].bounding===144,'Composite real measurement confirms48+20T and64within144U');
   const before=await signature();await open();
   check(await page.getByLabel('Choose an activity',{exact:true}).locator('option').count()===config.activities,config.id+' native guide lists every new activity');
   for(let i=0;i<config.activities;i++) {
    await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:i});
    const target=await page.evaluate(i=>__geoWorldEngine._currentLesson.activities[i].position,i);
    await page.getByRole('button',{name:'Go to this activity',exact:true}).click();await page.locator('.gwe-activity-guide').waitFor({state:'hidden'});await frames();
    const travel=await page.evaluate(()=>{const e=__geoWorldEngine,p=e.camera.position;return {position:p.toArray(),blocked:[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]].some(o=>{for(let y=Math.floor(p.y-1.6);y<=Math.floor(p.y+.2);y++)if(e.blocks[Math.floor(p.x+o[0])+','+y+','+Math.floor(p.z+o[1])])return true;return false;})};});
    check(!travel.blocked&&travel.position.every((n,j)=>Math.abs(n-target[j])<.01),config.id+' activity'+(i+1)+' arrives safely at its exact ground waypoint',travel);
    check(await signature()===before,config.id+' activity'+(i+1)+' travel preserves blocks and quiz score');
    await open();
   }
   await page.locator('#gwe-activity-note').fill('I checked the occupied volume and explained how the non-overlapping layers add together.');
   await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).check();
   check(await page.locator('.gwe-activity-progress').innerText()==='1 of '+config.activities+' activities reviewed',config.id+' review is recorded separately from the question score');
   check(await signature()===before,config.id+' journal does not mutate protected models or assessment');
   await page.locator('.gwe-activity-guide').evaluate(n=>n.scrollTop=0);await shot(config.id+'-build-activity');
   await page.getByRole('button',{name:'Back to exploring',exact:true}).click();
   await page.evaluate(v=>{const e=__geoWorldEngine;e.camera.position.fromArray(v.p);e.camera.lookAt(...v.t);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);},config.view);await frames();await shot(config.image);
   if(config.id==='compositeVolume') {
    const built=await page.evaluate(()=>{const e=__geoWorldEngine;for(const [y1,y2,z1,z2]of[[1,2,13,15],[3,4,14,15]])for(let x=15;x<=19;x++)for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)e.placeBlock(x,y,z,'stone','cube',0);const m=e.measureStructure(15,1,13);return {occupied:m.totalVolume,bounding:m.boundingVolume,count:m.count,teaching:e.measureStructure(2,1,2).count};});
    check(built.occupied===50&&built.count===50&&built.bounding===60&&built.teaching===68,'The hinted student step can be built and measured as50without changing the protectedT',built);
   }
   await page.close();
  }
 }catch(error){r.failure=error.stack;if(page&&!page.isClosed())await shot('guided-browser-failure').catch(()=>{});}
 finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length;fs.writeFileSync(path.join(out,'guided-presets-browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
