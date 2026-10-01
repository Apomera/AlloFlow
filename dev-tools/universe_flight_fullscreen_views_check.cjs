const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
    const checks=[],errors=[],accessibility=[],layouts=[],saved=[],failures=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const create=value.create;
        value.create=function(canvas,options){
          const callback=options.onTelemetry;
          const scene=create.call(this,canvas,Object.assign({},options,{onTelemetry(info){window.__fullscreenViewsInfo=info;if(callback)callback(info);}}));
          const restore=scene.restore,set=scene.set;
          scene.restore=function(data){const before=scene.snapshot(),result=restore.call(scene,data);window.__fullscreenViewsRestore={before,result,after:scene.snapshot()};window.__fullscreenViewsRestoreCount=(window.__fullscreenViewsRestoreCount||0)+1;return result;};
          scene.set=function(update){const before=scene.snapshot(),result=set.call(scene,update);if(update.running===false)window.__fullscreenViewsStop={before,after:scene.snapshot()};return result;};
          window.__fullscreenViewsScene=scene;return scene;
        };api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__fullscreenViewsScene);
    // Expose the preview host's actual persistence callbacks; production source remains untouched.
    await page.evaluate(()=>{
      const create=React.createElement;
      React.createElement=function(component,props,...children){
        if(component?.name==='UniverseFlightExplorer')window.__fullscreenViewsHost=props;
        if(component?.name==='UniverseFlightInViewControls')window.__fullscreenViewsControls=props;
        return create.call(this,component,props,...children);
      };
    });
    const button=name=>page.getByRole('button',{name,exact:true});
    await button('Close flight explorer').click();await button('Open 3D flight').click();
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__fullscreenViewsHost);
    const stage=page.locator('.uf-stage'),panel=stage.locator('#uf-inview-controls'),body=panel.locator('#uf-inview-body');
    const inButton=name=>panel.getByRole('button',{name,exact:true});
    const snapshot=()=>page.evaluate(()=>window.__fullscreenViewsScene.snapshot());
    const info=()=>page.evaluate(()=>window.__fullscreenViewsInfo);
    const records=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__fullscreenViewsHost.views)));
    const nextDraw=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    async function normalNotes(){if(await page.locator('#uf-field-notes').getAttribute('open')===null)await page.locator('#uf-field-notes summary').click();}
    async function enter(){await button('Toggle full screen for the 3D view').click();await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));}
    async function exit(){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(await panel.count(),0);}
    async function section(name){const tab=panel.locator('#uf-inview-tab-'+name);if(await tab.getAttribute('aria-selected')!=='true')await tab.click();await panel.locator('#uf-inview-panel-'+name).waitFor({state:'visible'});}
    async function open(name='compose'){
      if(await panel.count()===0){await stage.getByRole('button',{name:'Flight controls',exact:true}).click();await panel.waitFor({state:'visible'});}
      await section(name);
    }
    async function close(){await inButton('Close flight controls').click();await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));}
    async function inspected(){await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls')&&document.activeElement===document.querySelector('.uf-stage canvas'));assert.equal(await page.evaluate(()=>document.fullscreenElement===document.querySelector('.uf-stage')),true);}
    async function paused(){await page.waitForFunction(()=>window.__fullscreenViewsInfo?.running===false);const current=await snapshot();await page.waitForTimeout(120);assert.deepEqual(await snapshot(),current,'Paused notes retain camera pose, path, and clocks');return current;}
    async function mode(value){await open('explore');await panel.locator('#uf-inview-mode').selectOption(value);await page.waitForFunction(value=>window.__fullscreenViewsScene.snapshot().settings.mode===value,value);await nextDraw();}
    async function region(value){await open('explore');await panel.locator('#uf-inview-region').selectOption(value);await page.waitForFunction(value=>window.__fullscreenViewsScene.snapshot().settings.region===value,value);await nextDraw();}
    async function target(value){await open('explore');await panel.locator('#uf-inview-destination').selectOption(value);await page.waitForFunction(value=>window.__fullscreenViewsScene.snapshot().targetId===(value||null),value);await nextDraw();}
    async function range(selector,value){await panel.locator(selector).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);await nextDraw();}
    async function start(){await inButton('Start travel').click();await page.waitForFunction(()=>window.__fullscreenViewsInfo?.running===true);}
    async function notice(name,capture=false){
      await nextDraw();await page.waitForTimeout(150);
      const node=panel.locator('#uf-inview-notice'),box=await node.boundingBox(),clip=await body.boundingBox();
      assert.ok(box&&box.y>=clip.y-1&&box.y+18<=clip.y+clip.height+1,name+' notice begins inside the scroll body');
      assert.ok(box.x>=clip.x-1&&box.x+box.width<=clip.x+clip.width+1,name+' notice fits the body width');
      assert.equal(await panel.evaluate(node=>node.scrollTop),0,'Notice reveals keep the fixed shell still');
      if(capture)await stage.screenshot({path:path.join(report,'fullscreen-views-'+name+'.png')});
      return {name,text:await node.innerText(),box,body:clip};
    }
    async function axeScope(name){const violations=await stage.evaluate(async node=>{const result=await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}));});accessibility.push({name,violations});assert.deepEqual(violations,[],name+' has no scoped accessibility violations');}
    async function save(title,note,expectedTitle){
      await open('compose');
      if(title!==undefined)await panel.locator('#uf-inview-view-name').fill(title);
      if(note!==undefined)await panel.locator('#uf-inview-view-note').fill(note);
      const count=(await records()).length,expected=await paused();await inButton('Save current view').click();
      await page.waitForFunction(count=>window.__fullscreenViewsHost.views.length===count+1,count);
      const record=(await records()).at(-1);
      assert.equal(record.title,expectedTitle===undefined?title.trim():expectedTitle);
      assert.equal(record.note,note===undefined?'':note.trim());assert.deepEqual(record.snapshot,expected,'The host persists the paused snapshot exactly');
      assert.equal(await panel.count(),1,'Saving keeps Compose open');assert.equal(await panel.locator('#uf-inview-tab-compose').getAttribute('aria-selected'),'true');
      for(const selector of ['#uf-inview-view-name','#uf-inview-view-note','#uf-view-name','#uf-view-note'])assert.equal(await page.locator(selector).inputValue(),'','Saving clears the shared draft');
      assert.match((await notice('saved')).text,/saved/i);return record;
    }
    async function restore(record){
      await open('explore');const selector=panel.locator('#uf-inview-saved-view');
      assert.equal(await selector.inputValue(),'','Saved-view selector returns to its placeholder');
      await selector.selectOption(record.id);await inspected();const actual=await paused();
      assert.ok(Math.abs(Math.atan2(Math.sin(actual.state.yaw-record.snapshot.state.yaw),Math.cos(actual.state.yaw-record.snapshot.state.yaw)))<1e-12,'Restore retains orientation when yaw is wrapped by a full turn');
      assert.deepEqual({...actual,state:{...actual.state,yaw:record.snapshot.state.yaw}},record.snapshot,'Restoring returns to exact camera/display/target/path/clocks');
    }
    async function preferences(){
      await mode('relativity');await open('travel');await panel.locator('#uf-inview-time').selectOption('10');await mode('explore');
      await open('travel');await range('#uf-inview-speed',76);
      const toggle=panel.locator('.uf-motion-toggle');if(await toggle.getAttribute('aria-pressed')!=='false')await toggle.click();
      return {speed:await page.locator('#uf-speed').inputValue(),time:await page.evaluate(()=>window.__fullscreenViewsControls.timeScale),smooth:await toggle.getAttribute('aria-pressed')};
    }
    async function assertPreferences(expected){await open('travel');assert.equal(await page.locator('#uf-speed').inputValue(),expected.speed);assert.equal(await page.evaluate(()=>window.__fullscreenViewsControls.timeScale),expected.time);assert.equal(await panel.locator('.uf-motion-toggle').getAttribute('aria-pressed'),expected.smooth);}
    async function layout(name,sectionName,selector){
      await open(sectionName);await panel.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(120);
      const shell=await panel.boundingBox(),clip=await body.boundingBox(),control=await panel.locator(selector).boundingBox(),viewport=page.viewportSize();
      assert.ok(shell.x>=0&&shell.y>=0&&shell.x+shell.width<=viewport.width+1&&shell.y+shell.height<=viewport.height+1,name+' shell fits fullscreen');
      assert.ok(control.x>=clip.x-1&&control.x+control.width<=clip.x+clip.width+1,name+' control fits body width');
      assert.ok(control.y>=clip.y-1&&control.y+control.height<=clip.y+clip.height+1,name+' complete native control is reachable');
      assert.ok(control.height>=40,'Saved-view fields remain usable touch targets');assert.ok(await body.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Body has no horizontal overflow');
      assert.equal(await panel.evaluate(node=>node.scrollTop),0,'Scrolling fields keeps the shell still');
      const tabs=await panel.getByRole('tab').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));
      const closeBefore=await inButton('Close flight controls').boundingBox();
      await body.evaluate(node=>{node.scrollTop=node.scrollHeight;});
      assert.deepEqual(await panel.getByRole('tab').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top)),tabs,'Scrolling keeps tabs fixed');
      assert.equal((await inButton('Close flight controls').boundingBox()).y,closeBefore.y,'Scrolling keeps Close fixed');
      await panel.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(150);
      await stage.screenshot({path:path.join(report,'fullscreen-views-'+name+'.png')});
      layouts.push({name,viewport,shell,body:clip,control});await axeScope(name);
    }
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    await enter();await open('explore');
    assert.equal(await panel.locator('#uf-inview-saved-view').isDisabled(),true);assert.equal(await panel.locator('#uf-inview-saved-view option').count(),1);
    assert.match(await panel.locator('#uf-inview-saved-views').innerText(),/save|saved/i);await axeScope('empty-explore');
    await section('compose');
    assert.equal(await panel.locator('#uf-inview-view-name').getAttribute('maxlength'),'80');assert.equal(await panel.locator('#uf-inview-view-note').getAttribute('maxlength'),'1200');
    assert.equal(await panel.getByLabel('View name (optional)',{exact:true}).getAttribute('id'),'uf-inview-view-name');
    assert.equal(await panel.getByLabel('What do you notice? (optional)',{exact:true}).getAttribute('id'),'uf-inview-view-note');await axeScope('empty-compose');
    await panel.locator('#uf-inview-view-note').scrollIntoViewIfNeeded();await page.waitForTimeout(150);await stage.screenshot({path:path.join(report,'fullscreen-views-desktop-notes.png')});
    checks.push('disabled empty saved-view selector and help','shared draft labels and length limits');
    await exit();await normalNotes();
    await page.locator('#uf-view-name').fill('  Stellar notebook  ');await page.locator('#uf-view-note').fill('  Nearby stars shift.\nThe distant sky stays steady.  ');
    await enter();await open('compose');
    assert.equal(await panel.locator('#uf-inview-view-name').inputValue(),'  Stellar notebook  ');assert.equal(await panel.locator('#uf-inview-view-note').inputValue(),'  Nearby stars shift.\nThe distant sky stays steady.  ');
    await panel.locator('#uf-inview-view-name').press('End');await panel.locator('#uf-inview-view-name').press('ArrowLeft');await panel.locator('#uf-inview-view-name').press('w');
    const nativeTitle=await panel.locator('#uf-inview-view-name').inputValue();await close();await open('compose');assert.equal(await panel.locator('#uf-inview-view-name').inputValue(),nativeTitle);
    await exit();assert.equal(await page.locator('#uf-view-name').inputValue(),nativeTitle);
    await enter();await open('compose');await panel.locator('#uf-inview-view-name').fill('  Stellar notebook  ');
    const first=await save(undefined,'  Nearby stars shift.\nThe distant sky stays steady.  ','Stellar notebook');saved.push(first);
    checks.push('normal drafts appear in fullscreen','native fullscreen typing syncs to normal draft','drafts survive panel close and fullscreen exit','trimmed title and multiline note persist with exact paused snapshot','save stays open clears both surfaces and reveals status');
    await section('explore');assert.equal(await panel.locator('#uf-inview-saved-view').isEnabled(),true);
    const firstOption=panel.locator('#uf-inview-saved-view option[value="'+first.id+'"]');assert.match(await firstOption.innerText(),/Stellar notebook/);assert.match(await firstOption.innerText(),/stellar|neighborhood/i);
    checks.push('saved selector shares the host records and scene label');
    // Writing pauses each motion mode without changing its paused inspection.
    for(const kind of ['free','relativity','orbit','approach']){
      await mode(kind==='relativity'?'relativity':'explore');
      if(kind!=='relativity')await region('neighborhood');
      await open('travel');if(kind==='relativity')await range('#uf-inview-beta',.9);else await range('#uf-inview-speed',kind==='approach'?35:55);
      if(kind==='relativity')await panel.locator('#uf-inview-time').selectOption('1');
      if(kind==='orbit'||kind==='approach'){
        await target('amber-star');await inButton(kind==='orbit'?'Orbit destination':'Fly to destination').click();await inspected();
      }else await start();
      await page.waitForFunction(kind=>window.__fullscreenViewsInfo.running&&window.__fullscreenViewsInfo.motion.kind===(kind==='free'?'free':kind),kind);
      await open('compose');await panel.locator('#uf-inview-view-note').focus();const frozen=await paused();
      await panel.locator('#uf-inview-view-note').fill('W A S D are observations.');await panel.locator('#uf-inview-view-note').press('End');await panel.locator('#uf-inview-view-note').press('w');await panel.locator('#uf-inview-view-note').press('ArrowLeft');await panel.locator('#uf-inview-view-note').press('Space');
      assert.deepEqual(await snapshot(),frozen,'Native text keys never move the paused '+kind+' camera');
      if(kind==='orbit')assert.equal((await info()).orbit.active,true,'Writing pauses the current orbit without discarding it');
      if(kind==='approach')assert.equal((await info()).navigation.active,true,'Writing pauses the guided approach without discarding it');
      checks.push('writing pauses '+kind+' motion and isolates native keyboard input');
    }
    await mode('explore');await region('neighborhood');await target('amber-star');
    const defaultView=await save('   ','  A star-centered observation.  ','Amber star');saved.push(defaultView);checks.push('empty title uses the selected destination name');
    await panel.locator('#uf-inview-view-name').fill('Travel paused by save');await start();await page.waitForTimeout(100);
    const movingCount=(await records()).length;await inButton('Save current view').click();await page.waitForFunction(count=>window.__fullscreenViewsHost.views.length===count+1,movingCount);
    const savedMoving=(await records()).at(-1),saveStop=await page.evaluate(()=>window.__fullscreenViewsStop);
    assert.deepEqual(saveStop.after,saveStop.before,'Saving pauses without changing the moving pose or clocks');assert.deepEqual(savedMoving.snapshot,saveStop.after,'Saving without editing captures the paused instant');
    await paused();assert.equal(await panel.count(),1);await notice('saved-running');saved.push(savedMoving);checks.push('save without editing pauses moving travel before capturing the snapshot');
    // Use valid fixture poses with distinct nonzero clocks to catch partial restores.
    const cases=[
      {region:'neighborhood',target:'blue-star',position:[2.5,-1.2,-3.7],title:'Blue star survey',fov:53,exposure:1.25,quality:'low'},
      {region:'galaxy',target:'galactic-center',position:[-68000,16000,5000],title:'Across the spiral',fov:71,exposure:.85,quality:'high'},
      {region:'cosmic',target:'companion-galaxy',position:[-480000,190000,650000],title:'Companion portrait',fov:47,exposure:1.65,quality:'auto'},
      {region:'neighborhood',target:'amber-star',position:[-2.1,.8,4.2],title:'Stationary comparison',fov:82,exposure:.7,quality:'low',physical:true}
    ];
    for(const [index,item] of cases.entries()){
      await mode(item.physical?'relativity':'explore');if(!item.physical)await region(item.region);await target(item.target);
      if(item.physical){await section('travel');await range('#uf-inview-beta',.9);if(await inButton('Unshifted sky comparison').getAttribute('aria-pressed')!=='true')await inButton('Unshifted sky comparison').click();}
      await section('compose');await range('#uf-inview-fov',item.fov);await range('#uf-inview-exposure',item.exposure);await panel.locator('#uf-inview-quality').selectOption(item.quality);
      await page.evaluate(({item,index})=>{const scene=window.__fullscreenViewsScene,current=scene.snapshot();Object.assign(current.state,{position:item.position,yaw:.17*(index+1),pitch:-.06*(index+1),distanceLy:17+index*23,universeYears:2+index,travelerYears:1.5+index*.5});if(!scene.restore(current))throw new Error('Valid saved-view fixture rejected');},{item,index});
      const record=await save(item.title,'Scene '+item.region+' observation.');saved.push(record);
      await mode('explore');await region('neighborhood');const prefs=await preferences();await start();await page.waitForTimeout(120);
      await restore(record);assert.equal((await info()).motion.paceLyPerSecond,0,'Restoring clears current motion');
      await mode('explore');await assertPreferences(prefs);
      // Revisit after checking preferences in exploration, including the physical record.
      await restore(record);assert.equal((await snapshot()).settings.compareRest,!!record.snapshot.settings.compareRest);
      checks.push('exact saved '+(item.physical?'relativity comparison':item.region)+' pose display destination and clock restore');
    }
    checks.push('restores retain current travel speed playback and smoothing preferences','restore closes controls focuses canvas and retains fullscreen');
    await mode('explore');await region('neighborhood');await preferences();
    // Deliberately malformed persisted fixtures use the same host callback as real saves.
    const base=await snapshot();
    const invalid=[{id:'fixture-invalid-pose',title:'Incomplete pose',snapshot:{...base,state:{...base.state,position:[0,'invalid',0]}}},{id:'fixture-unsupported-scene',title:'Unsupported light chase scene',snapshot:{...base,settings:{...base.settings,mode:'relativity',region:'cosmic'}}}];
    for(const record of invalid){
      await page.evaluate(record=>window.__fullscreenViewsHost.onSaveView({...record,note:'Deliberately invalid QA fixture',savedAt:new Date().toISOString()}),record);
      await page.waitForFunction(id=>window.__fullscreenViewsHost.views.some(item=>item.id===id),record.id);
      await open('explore');await start();await page.waitForTimeout(100);const restoreCount=await page.evaluate(()=>window.__fullscreenViewsRestoreCount||0);await panel.locator('#uf-inview-saved-view').selectOption(record.id);
      const frozen=await paused();assert.equal(await panel.count(),1,'A failed restore keeps the panel open');
      assert.equal(await panel.locator('#uf-inview-saved-view').inputValue(),'');assert.equal(await page.evaluate(()=>document.fullscreenElement===document.querySelector('.uf-stage')),true);
      const status=await notice(record.id,true);assert.match(status.text,/could not|incomplete|unavailable|unsupported/i);failures.push({...status,state:frozen});
      if(record.id==='fixture-invalid-pose'){const action=await page.evaluate(()=>window.__fullscreenViewsRestore);assert.equal(action.result,false);assert.deepEqual(action.after,action.before,'Malformed restore is atomic');}
      else {assert.equal(await page.evaluate(()=>window.__fullscreenViewsRestoreCount||0),restoreCount,'Unsupported physics scene is rejected before renderer mutation');const stopped=await page.evaluate(()=>window.__fullscreenViewsStop);assert.deepEqual(stopped.after,stopped.before);assert.deepEqual(frozen,stopped.after,'Unsupported restore preserves the pose and clocks at pause');}
      checks.push('failed '+record.id+' stops travel preserves state and explains the failure');
    }
    await exit();await normalNotes();
    for(const record of invalid)await page.getByRole('button',{name:'Remove saved view: '+record.title,exact:true}).click();
    await button('Close flight explorer').click();await button('Open 3D flight').click();await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false);
    assert.equal((await records()).length,saved.length,'Saved views survive explorer close/reopen');
    await enter();await open('explore');assert.equal(await panel.locator('#uf-inview-saved-view option').count(),saved.length+1);checks.push('saved records survive explorer close and reopen');
    await section('compose');await panel.locator('#uf-inview-view-name').fill('Retained fullscreen draft');await panel.locator('#uf-inview-view-note').fill('A draft survives controls closing.');await close();await open('compose');
    assert.equal(await panel.locator('#uf-inview-view-note').inputValue(),'A draft survives controls closing.');
    await stage.getByRole('button',{name:'Hide overlay',exact:true}).click();await section('explore');await restore(saved[2]);
    assert.equal(await stage.getByRole('button',{name:'Show overlay',exact:true}).count(),1,'Restoring in clean view retains the overlay preference');
    await open('compose');assert.equal(await panel.locator('#uf-inview-view-name').inputValue(),'Retained fullscreen draft');await stage.getByRole('button',{name:'Show overlay',exact:true}).click();
    checks.push('clean-view saved controls work and retain draft and overlay preferences');
    while((await records()).length<12){const count=(await records()).length;await save('Slot '+(count+1),'Capacity check.');}
    assert.equal(await inButton('Save current view').isDisabled(),true);assert.match(await panel.locator('#uf-inview-views-full').innerText(),/Twelve|12/);
    await panel.locator('#uf-inview-view-name').fill('Slot after removal');await panel.locator('#uf-inview-view-note').fill('Keep this draft while full.');await inButton('Save current view').evaluate(node=>node.click());assert.equal((await records()).length,12,'The host capacity remains twelve');
    await exit();await normalNotes();const last=(await records()).at(-1);await page.getByRole('button',{name:'Remove saved view: '+last.title,exact:true}).click();
    await enter();await open('compose');assert.equal(await inButton('Save current view').isEnabled(),true);assert.equal(await panel.locator('#uf-inview-view-note').inputValue(),'Keep this draft while full.');
    await save(undefined,'Keep this draft while full.','Slot after removal');assert.equal((await records()).length,12);
    checks.push('twelve-view capacity disables save and explains recovery','full capacity retains drafts and removal frees a slot');
    await axeScope('populated-compose');await section('explore');await axeScope('populated-explore');
    await section('compose');await panel.locator('#uf-inview-view-note').fill('Narrow screen observation.');
    for(const [name,viewport] of [['phone',{width:320,height:800}],['landscape',{width:568,height:320}]]){
      await exit();await page.setViewportSize(viewport);await enter();
      await layout(name+'-notes','compose','#uf-inview-view-note');
      await panel.locator('#uf-inview-view-name').scrollIntoViewIfNeeded();await panel.locator('#uf-inview-view-name').fill('Native '+name+' note');await panel.locator('#uf-inview-view-name').press('End');await panel.locator('#uf-inview-view-name').press('w');const frozen=await paused();assert.deepEqual(await snapshot(),frozen);
      await layout(name+'-saved','explore','#uf-inview-saved-view');
      await restore(saved[1]);await open('compose');assert.equal(await panel.locator('#uf-inview-view-note').inputValue(),'Narrow screen observation.');
      checks.push(name+' notes and saved selector scroll within fixed tabs and Close',name+' native typing and saved restore stay reachable');
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(report,'fullscreen-views-check.json'),JSON.stringify({checks,errors,accessibility,layouts,failures,saved:saved.map(({id,title,note,snapshot})=>({id,title,note,snapshot})),finalCount:(await records()).length},null,2));
    console.log('Fullscreen saved-view checks passed: '+checks.length+' groups, '+accessibility.length+' scoped accessibility checks.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
