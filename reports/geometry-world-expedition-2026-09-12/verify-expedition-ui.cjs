'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
  const r={scope:'Local canonical source with real React and Three/WebGL; generated API calls are not used',checks:[],errors:[],consoleErrors:[],screenshots:[],sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+n)).digest('hex')]))};
  const check=(ok,label,detail)=>{r.checks.push({label,pass:!!ok,...(detail?{detail}:{})});if(!ok)throw Error(label);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  let page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const watch=p=>{p.setDefaultTimeout(60000);p.on('pageerror',e=>r.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});};watch(page);
  const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:90000});r.screenshots.push(name+'.png');};
  const guide=()=>page.locator('.gwe-activity-guide');
  const openGuide=async()=>{await page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first().click();await guide().waitFor();await frames();};
  const closeGuide=async()=>{await page.getByRole('button',{name:'Close activity guide',exact:true}).click();await guide().waitFor({state:'hidden'});await frames();};
  const signature=()=>page.evaluate(()=>{const e=__geoWorldEngine;return JSON.stringify({blocks:StemLab.geometryWorldBuilderPure.editableWorld(e).blocks,selection:e._builderSelection,undo:e._undoStack,redo:e._redoStack,score:__ctx.toolData.geometryWorld.score||0});});
  const startHarbor=async()=>{await page.locator('.gwe-home').waitFor({timeout:120000});await page.locator('.gwe-home-card[data-path=learn]').click();await page.getByLabel('Choose a lesson',{exact:true}).selectOption('geometryHarbor');await page.getByRole('button',{name:'Start this lesson',exact:true}).click();await page.waitForFunction(()=>window.__geoWorldEngine&&__geoWorldEngine._currentLesson.title.includes('Geometry Harbor'));await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(-22,2.6,17);e.camera.lookAt(-13,1.5,14);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});await frames();};
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await startHarbor();
    check(await page.evaluate(()=>__ctx.toolData.geometryWorld.activeLesson==='geometryHarbor'),'Home Learn starts the actual Harbor preset');
    check(await page.evaluate(()=>__glLive()&&!__glLive().lost&&__glLive().w>500),'Harbor uses a live visible WebGL canvas');
    const loaded=await page.evaluate(()=>{const e=__geoWorldEngine;return {truncated:!!e._fillTruncated,npcs:e.npcs.length,structures:e._currentLesson.structures.length,blocks:Object.keys(e.blocks).length,activities:e._currentLesson.activities.length,measure:[[-15,1,14],[-15,1,-9],[-15,1,2],[7,1,3],[10,1,7]].map(p=>{const m=e.measureStructure(...p);return m&&{count:m.count,volume:m.volume||m.totalVolume};})};});r.loaded=loaded;
    check(loaded.npcs===7&&loaded.activities===6,'All seven NPCs and six activities are loaded');
    if(!process.argv.includes('--guide-only')){
      check(!loaded.truncated,'Large Harbor terrain does not truncate the teaching world');
      check(loaded.measure.every((m,i)=>m&&m.count===[6,24,24,24,24][i]),'Five real measured components match the authored mathematics',loaded.measure);
    }
    await page.evaluate(()=>{const e=__geoWorldEngine;e.camera.position.set(-25,19,27);e.camera.lookAt(0,0,-1);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});await frames();await shot('harbor-overview-1440');
    await page.evaluate(()=>{const e=__geoWorldEngine;e.placeBlock(-23,1,14,'wood','cube',0);e.placeBlock(-22,1,14,'wood','cube',0);e._builderSelection={blocks:[{x:-23,y:1,z:14},{x:-22,y:1,z:14}]};});await frames();
    const before=await signature();
    await openGuide();
    check(await guide().getAttribute('role')==='dialog'&&await guide().getAttribute('aria-modal')==='true','Activity journal is an accessible modal dialog');
    check(await page.getByLabel('Choose an activity',{exact:true}).locator('option').count()===6,'All six stations appear in the activity selector');
    check(await guide().evaluate(n=>document.activeElement===n),'Opening the guide moves keyboard focus into it');
    await page.keyboard.press('Shift+Tab');check(await page.getByRole('button',{name:'Back to exploring',exact:true}).evaluate(n=>n===document.activeElement),'Shift Tab wraps to the final journal control');
    await page.keyboard.press('Tab');check(await page.getByRole('button',{name:'Close activity guide',exact:true}).evaluate(n=>n===document.activeElement),'Tab wraps from the final control to Close');
    await guide().focus();await page.keyboard.press('KeyB');await page.keyboard.press('Control+z');await page.keyboard.press('KeyW');await frames();
    check(await signature()===before,'Guide keyboard input cannot change blocks, selection, build history, or question score');
    await page.getByText('Show a hint',{exact:true}).click();check(await guide().locator('details').getAttribute('open')!==null,'Hint opens through its native disclosure control');
    const note='I measured six cubes. Rearranging them changed the length but preserved the volume.';
    await page.locator('#gwe-activity-note').fill(note);await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).check();
    check(await guide().getByRole('status').innerText()==='1 of 6 activities reviewed','Self-review updates visible activity progress');
    check(await signature()===before,'Notes and review marks do not alter the question score or construction');
    await shot('harbor-activity-guide-1440');
    await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:3});
    check(await page.locator('#gwe-activity-note').inputValue()==='','A different activity starts with its own notes');
    await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:0});
    check(await page.locator('#gwe-activity-note').inputValue()===note&&await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).isChecked(),'Switching activities preserves the first journal note and review');
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download journal',exact:true}).click();const download=await downloadPromise;const downloaded=path.join(out,'verified-learning-journal.json');await download.saveAs(downloaded);const journal=JSON.parse(fs.readFileSync(downloaded,'utf8'));
    check(journal.schema==='alloflow-geometry-journal/1'&&journal.activities.length===6&&journal.activities[0].reflection===note&&journal.activities[0].reviewed,'Native journal download includes the reviewed activity and explanation');
    await page.keyboard.press('Escape');await guide().waitFor({state:'hidden'});check(await signature()===before,'Escape safely dismisses the guide');
    await openGuide();check(await page.locator('#gwe-activity-note').inputValue()===note,'Closing and reopening the guide retains the journal');
    for(let i=0;i<6;i++){
      await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:i});
      const target=await page.evaluate(i=>__geoWorldEngine._currentLesson.activities[i].position,i);
      await page.getByRole('button',{name:'Go to this activity',exact:true}).click();await guide().waitFor({state:'hidden'});await frames();
      const travel=await page.evaluate(()=>{const e=__geoWorldEngine,p=e.camera.position;return {position:p.toArray(),entry:e._entryAnim,blocked:[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]].some(o=>{for(let y=Math.floor(p.y-1.6);y<=Math.floor(p.y+.2);y++)if(e.blocks[Math.floor(p.x+o[0])+','+y+','+Math.floor(p.z+o[1])])return true;return false;})};});
      check(Math.abs(travel.position[0]-target[0])<.01&&Math.abs(travel.position[2]-target[2])<.01&&!travel.blocked&&!travel.entry,'Activity '+(i+1)+' travels to clear space and cancels entry motion',travel);
      check(await signature()===before,'Activity '+(i+1)+' travel preserves construction, history, selection, and score');
      await openGuide();
    }
    await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:2});
    for(const size of [{width:390,height:844},{width:320,height:700},{width:844,height:390}]){
      await page.setViewportSize(size);await frames();
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow at '+size.width+'x'+size.height);
      check(await guide().evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Guide has no internal horizontal overflow at '+size.width);
      const targets=[page.getByRole('button',{name:'Close activity guide',exact:true}),page.getByLabel('Choose an activity',{exact:true}),page.getByRole('button',{name:'Go to this activity',exact:true}),guide().locator('summary'),page.locator('#gwe-activity-note'),guide().locator('.gwe-activity-review'),page.getByRole('button',{name:'Download journal',exact:true}),page.getByRole('button',{name:'Back to exploring',exact:true})];
      for(const target of targets){await target.scrollIntoViewIfNeeded();const rect=await target.evaluate(n=>{const b=n.getBoundingClientRect();return {width:b.width,height:b.height,hit:n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),label:n.getAttribute('aria-label')||n.tagName};});check(rect.width>=44&&rect.height>=44&&rect.hit,'Guide '+rect.label+' target is reachable and at least44px at '+size.width,rect);}
      await guide().evaluate(n=>n.scrollTop=0);await shot('harbor-guide-'+size.width+'x'+size.height);
      await closeGuide();const visibleOpen=page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first();await visibleOpen.scrollIntoViewIfNeeded();check(await visibleOpen.isVisible(),'Activities remains discoverable at '+size.width);await openGuide();
    }
    await page.setViewportSize({width:1440,height:1000});await closeGuide();
    // Real tool unmount/remount retains host toolData but creates a fresh engine.
    await page.evaluate(()=>__ctx.setStemLabTool('printLab'));await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
    await page.evaluate(()=>__ctx.setStemLabTool('geometryWorld'));await startHarbor();await openGuide();
    await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:0});
    check(await page.locator('#gwe-activity-note').inputValue()===note&&await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).isChecked(),'Journal survives leaving Geometry World and returning to the same lesson');
    await closeGuide();
    const desktop=page;
    page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});watch(page);await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await startHarbor();
    check(await page.locator('#geoworld-fs-workspace').getAttribute('data-touch-active')==='true','Harbor entry supports a touch phone');await openGuide();await page.getByLabel('Choose an activity',{exact:true}).selectOption({index:3});await page.locator('#gwe-activity-note').fill('One layer holds 12 cubes. Two layers hold 24.');await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).check();await guide().evaluate(n=>n.scrollTop=0);await shot('harbor-guide-touch-390');await page.getByRole('button',{name:'Go to this activity',exact:true}).click();await guide().waitFor({state:'hidden'});check(await page.evaluate(()=>Math.abs(__geoWorldEngine.camera.position.x-15)<.01),'Touch journal travels to the reservoir');await page.close();page=desktop;
  }catch(error){r.failure=error.stack;await shot('expedition-ui-failure').catch(()=>{});}
  finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length&&r.checks.every(c=>c.pass);fs.writeFileSync(path.join(out,'expedition-ui-browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({pass:r.pass,checks:r.checks.length,failed:r.checks.filter(c=>!c.pass),failure:r.failure,errors:r.errors,consoleErrors:r.consoleErrors,screenshots:r.screenshots}));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};
eval(harness+'('+run.toString()+')();');
