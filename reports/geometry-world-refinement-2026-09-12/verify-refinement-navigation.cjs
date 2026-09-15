'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
  const result={scope:'Current local production sources in the real React/Three browser host; no live AI requests',checks:[],errors:[],consoleErrors:[],screenshots:[],sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+name)).digest('hex')]))};
  const check=(ok,label,detail)=>{result.checks.push({label,pass:!!ok,...(detail?{detail}:{})});if(!ok)throw Error(label);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  let page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const watch=target=>{target.setDefaultTimeout(60000);target.on('pageerror',error=>result.errors.push(error.message));target.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});};watch(page);
  const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:60000});result.screenshots.push(name+'.png');};
  const signature=()=>page.evaluate(()=>{const e=__geoWorldEngine,d=__ctx.toolData.geometryWorld;return JSON.stringify({title:e._currentLesson.title,blocks:StemLab.geometryWorldBuilderPure.editableWorld(e).blocks,selection:e._builderSelection,undo:e._undoStack,redo:e._redoStack,camera:[e.camera.position.toArray(),e.camera.quaternion.toArray()],score:d.score||0,answered:d.answeredNpcs||{},totalQ:d.totalQ});});
  const guide=()=>page.locator('.gwe-activity-guide');
  const next=()=>page.getByRole('button',{name:'Next activity',exact:true});
  const previous=()=>page.getByRole('button',{name:'Previous activity',exact:true});
  const activitySelect=()=>page.getByLabel('Choose an activity',{exact:true});
  const heading=()=>page.locator('#gwe-active-activity-title');
  const waitHeadingFocus=()=>page.waitForFunction(()=>document.activeElement&&document.activeElement.id==='gwe-active-activity-title');
  const openGuide=async()=>{await page.getByRole('button',{name:'Open activity guide',exact:true}).filter({visible:true}).first().click();await guide().waitFor();await frames();};
  const openHome=async()=>{if(await guide().isVisible())await page.getByRole('button',{name:'Close activity guide',exact:true}).click();await page.getByRole('button',{name:'Geometry World home',exact:true}).filter({visible:true}).first().click();await page.locator('.gwe-home').waitFor();};
  const selectHarborPreview=async()=>{await page.locator('.gwe-home').waitFor({timeout:120000});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});await page.locator('.gwe-home-card[data-path=learn]').click();await page.getByLabel('Choose a lesson',{exact:true}).selectOption('geometryHarbor');await page.locator('.gwe-lesson-facts').waitFor();await page.locator('.gwe-lesson-map svg').waitFor();await frames();};
  const startPreview=async()=>{await page.getByRole('button',{name:'Start this lesson',exact:true}).click();await page.waitForFunction(()=>window.__geoWorldEngine&&__geoWorldEngine._currentLesson.title.includes('Geometry Harbor'));await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(-22,2.6,17);e.camera.lookAt(-13,1.5,14);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});await frames();};
  const reachable=async(target,label)=>{await target.scrollIntoViewIfNeeded();const box=await target.evaluate(node=>{const rect=node.getBoundingClientRect();return{width:rect.width,height:rect.height,hit:node.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))};});check(box.width>=44&&box.height>=44&&box.hit,label,box);};
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await selectHarborPreview();
    const beforePreview=await signature();
    const facts=page.locator('.gwe-lesson-facts');
    const factText=await facts.innerText();
    check(/6 activities/.test(factText),'Harbor preview advertises all six connected activities',factText);
    check(/45\s*(?:min|minutes)/i.test(factText),'Harbor preview explains estimated student time',factText);
    check(/19 question steps/.test(factText),'Harbor preview counts primary and follow-up question steps',factText);
    check(await facts.locator('li').count()>=3,'Lesson facts use a readable semantic list');
    const map=page.locator('.gwe-lesson-map'),svg=map.locator('svg[role=img]');
    check(await svg.count()===1,'The route overview is one accessible native SVG image');
    check(!!(await svg.getAttribute('aria-label'))&&await svg.locator('title').count()===1&&await svg.locator('desc').count()===1,'Route overview has an accessible name, title, and description');
    check(await map.locator('[data-map-activity]').count()===6,'Route overview shows all six activity markers');
    check(await map.locator('[data-map-structure]').count()>10,'Route overview depicts the actual authored structure footprints');
    const geometry=await svg.evaluate(node=>{const box=node.viewBox.baseVal;return{viewBox:[box.x,box.y,box.width,box.height],finite:Array.from(node.querySelectorAll('[data-map-structure]')).every(shape=>['x','y','width','height'].every(name=>Number.isFinite(Number(shape.getAttribute(name))))&&Number(shape.getAttribute('width'))>0&&Number(shape.getAttribute('height'))>0),invalid:/NaN|Infinity|undefined/.test(node.outerHTML)};});
    check(geometry.viewBox.every(Number.isFinite)&&geometry.viewBox[2]>0&&geometry.viewBox[3]>0&&geometry.finite&&!geometry.invalid,'Map coordinates and structure outlines have valid finite bounds',geometry);
    check(await map.locator('button,a,input,select,[tabindex]:not([tabindex="-1"])').count()===0,'Static route preview introduces no misleading interactive controls');
    for(const size of [{width:1440,height:1000},{width:390,height:844},{width:320,height:700},{width:844,height:390}]){
      await page.setViewportSize(size);await frames();await map.scrollIntoViewIfNeeded();
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Home preview has no horizontal overflow at '+size.width+'x'+size.height);
      check(await page.locator('.gwe-home').evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Home preview fits its own scrolling surface at '+size.width);
      const bounds=await svg.boundingBox();check(bounds&&bounds.width>100&&bounds.width<=size.width&&bounds.height>50,'Route overview remains readable at '+size.width,bounds);
      await reachable(page.getByRole('button',{name:'Start this lesson',exact:true}),'Start lesson remains reachable at '+size.width);
      await map.scrollIntoViewIfNeeded();await shot('harbor-preview-'+size.width+'x'+size.height);
    }
    check(await signature()===beforePreview,'Previewing the route and resizing never moves the player or changes work');
    await page.setViewportSize({width:1440,height:1000});
    const picker=page.getByLabel('Choose a lesson',{exact:true});await picker.focus();await picker.selectOption('volumeExplorer');
    check(await picker.evaluate(node=>node===document.activeElement),'Changing the preview retains focus on the native lesson selector');
    check(!/undefined|NaN|Infinity/.test(await page.locator('.gwe-home-preview').innerText()),'Older lessons display clean fallback preview metadata');
    await picker.selectOption('geometryHarbor');await frames();check(await signature()===beforePreview,'Switching preview choices preserves the current scene and question state');
    await startPreview();await openGuide();
    const beforeJournal=await signature();
    const titles=await page.evaluate(()=>__geoWorldEngine._currentLesson.activities.map(activity=>activity.title));
    check(await previous().isDisabled()&&await next().isEnabled(),'First activity disables Previous and enables Next');
    check(await heading().innerText()===titles[0],'Journal starts with the first activity heading');
    const note='I compared equal volumes and kept a measurement record.';
    await page.locator('#gwe-activity-note').fill(note);await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).check();
    await next().focus();await page.keyboard.press('Enter');await waitHeadingFocus();
    check(await heading().innerText()===titles[1],'Keyboard Next opens the following activity and focuses its heading');
    check(await previous().isEnabled()&&await next().isEnabled(),'Middle activity enables both directions');
    check(await page.locator('#gwe-activity-note').inputValue()===''&&!await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).isChecked(),'Navigation does not copy notes or auto-review the next activity');
    check(await signature()===beforeJournal,'Next changes only journal selection, preserving player pose, construction, and scores');
    await previous().click();await waitHeadingFocus();
    check(await heading().innerText()===titles[0]&&await page.locator('#gwe-activity-note').inputValue()===note&&await page.getByRole('checkbox',{name:'I have reviewed my work',exact:true}).isChecked(),'Previous restores the first activity and its existing journal work');
    for(let index=1;index<titles.length;index++){await next().click();await waitHeadingFocus();check(await heading().innerText()===titles[index],'Next reaches activity '+(index+1)+' in lesson order');}
    check(await next().isDisabled()&&await previous().isEnabled(),'Last activity disables Next and enables Previous');
    check(await signature()===beforeJournal,'Browsing the entire activity trail never teleports or changes mathematical scores');
    await activitySelect().selectOption({index:2});await frames();check(await heading().innerText()===titles[2],'The native activity selector remains available for direct navigation');
    for(const size of [{width:390,height:844},{width:320,height:700},{width:844,height:390}]){
      await page.setViewportSize(size);await frames();
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await guide().evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Journal navigation fits without horizontal overflow at '+size.width+'x'+size.height);
      await reachable(previous(),'Previous is a reachable 44px control at '+size.width);await reachable(next(),'Next is a reachable 44px control at '+size.width);await reachable(activitySelect(),'Direct activity selection is reachable at '+size.width);
      const index=await activitySelect().evaluate(node=>node.selectedIndex);await next().click();await waitHeadingFocus();check(await activitySelect().evaluate(node=>node.selectedIndex)===index+1,'Next remains operable at '+size.width);await previous().click();await waitHeadingFocus();check(await activitySelect().evaluate(node=>node.selectedIndex)===index,'Previous remains operable at '+size.width);
      await heading().scrollIntoViewIfNeeded();await shot('journal-navigation-'+size.width+'x'+size.height);
    }
    check(await signature()===beforeJournal,'Responsive journal navigation preserves the complete scene state');
    await page.setViewportSize({width:1440,height:1000});await activitySelect().selectOption({index:0});await openHome();await page.locator('.gwe-home-card[data-path=explore]').click();
    const gardenFacts=await page.locator('.gwe-lesson-facts').innerText();check(/Self-paced exploration/.test(gardenFacts),'Question-free exploration is distinguished from scored question steps',gardenFacts);
    await shot('garden-preview');
    const desktop=page;page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});watch(page);
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await selectHarborPreview();await startPreview();await openGuide();const touchBefore=await signature();
    await next().tap();await waitHeadingFocus();check(await activitySelect().evaluate(node=>node.selectedIndex)===1,'Touch Next selects the second activity');await previous().tap();await waitHeadingFocus();check(await activitySelect().evaluate(node=>node.selectedIndex)===0,'Touch Previous returns to the first activity');check(await signature()===touchBefore,'Touch journal navigation does not move the player or change scores');await shot('journal-navigation-touch-390');await page.close();page=desktop;
  }catch(error){result.failure=error.stack;await shot('refinement-navigation-failure').catch(()=>{});}
  finally{result.pass=!result.failure&&!result.errors.length&&!result.consoleErrors.length&&result.checks.every(item=>item.pass);fs.writeFileSync(path.join(out,'navigation-browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,checks:result.checks.length,failed:result.checks.filter(item=>!item.pass),failure:result.failure,errors:result.errors,consoleErrors:result.consoleErrors}));await browser.close();await new Promise(resolve=>server.close(resolve));if(!result.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
