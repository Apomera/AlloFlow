const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
const sections=['travel','explore','compose'];
(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
    const errors=[],checks=[],accessibility=[],layouts=[],failures=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const original=value.create;
        value.create=function(canvas,options){
          const callback=options.onTelemetry;
          const created=original.call(this,canvas,Object.assign({},options,{onTelemetry(info){window.__fullscreenTabsTelemetry=info;if(callback)callback(info);}}));
          window.__fullscreenTabsScene=created;window.__fullscreenTabsCreates=(window.__fullscreenTabsCreates||0)+1;
          return created;
        };
        api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__fullscreenTabsScene);
    const stage=page.locator('.uf-stage'),panel=stage.locator('#uf-inview-controls'),body=panel.locator('#uf-inview-body');
    const button=name=>page.getByRole('button',{name,exact:true});
    const inButton=name=>panel.getByRole('button',{name,exact:true});
    const tab=name=>panel.locator('#uf-inview-tab-'+name);
    const content=name=>panel.locator('#uf-inview-panel-'+name);
    const snapshot=()=>page.evaluate(()=>window.__fullscreenTabsScene.snapshot());
    const info=()=>page.evaluate(()=>window.__fullscreenTabsTelemetry);
    const nextDraw=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    async function enter(){
      await button('Toggle full screen for the 3D view').click();
      await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));
    }
    async function exit(){
      await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();
      await page.waitForFunction(()=>!document.fullscreenElement);
      assert.equal(await panel.count(),0);
      await page.waitForFunction(()=>document.activeElement===document.querySelector('.uf-stage canvas'));
    }
    async function open(expected){
      await stage.getByRole('button',{name:'Flight controls',exact:true}).click();await panel.waitFor({state:'visible'});
      await page.waitForFunction(expected=>document.activeElement?.id==='uf-inview-tab-'+expected,expected);
      await assertSection(expected);
    }
    async function close(){
      await inButton('Close flight controls').click();
      await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));
      await page.waitForFunction(()=>document.activeElement?.id==='uf-flight-controls-toggle');
    }
    async function assertSection(selected,focused=true){
      assert.equal(await panel.getByRole('tablist').count(),1);
      assert.equal(await panel.getByRole('tab').count(),3);
      for(const name of sections){
        assert.equal(await tab(name).getAttribute('role'),'tab');
        assert.equal(await tab(name).getAttribute('aria-controls'),'uf-inview-panel-'+name);
        assert.equal(await tab(name).getAttribute('aria-selected'),String(name===selected));
        assert.equal(await tab(name).getAttribute('tabindex'),name===selected?'0':'-1');
        assert.equal(await content(name).getAttribute('role'),'tabpanel');
        assert.equal(await content(name).getAttribute('aria-labelledby'),'uf-inview-tab-'+name);
        assert.equal(await content(name).count(),1,'Inactive sections remain mounted');
        assert.equal(await content(name).isVisible(),name===selected,'Only the selected section is displayed');
        if(name!==selected){
          assert.equal(await content(name).getAttribute('hidden'),'');
          assert.equal(await content(name).evaluate(node=>getComputedStyle(node).display),'none');
        }
      }
      if(focused)assert.equal(await tab(selected).evaluate(node=>node===document.activeElement),true,'The active tab retains keyboard focus');
    }
    async function select(name){
      await tab(name).click();await assertSection(name);await nextDraw();
    }
    async function range(selector,value){
      const control=panel.locator(selector);assert.equal(await control.isVisible(),true,'The tested input belongs to the active section');
      await control.evaluate((node,value)=>{
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));
        node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));
      },value);await nextDraw();
    }
    async function axeSection(mode,name){
      await select(name);
      const violations=await panel.evaluate(async node=>{
        const result=await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
        return result.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}));
      });
      accessibility.push({mode,section:name,violations});assert.deepEqual(violations,[],mode+' '+name+' passes scoped accessibility');
    }
    async function layout(name){
      const bounds=await panel.boundingBox(),clip=await body.boundingBox(),viewport=page.viewportSize();
      assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,name+' panel fits within fullscreen');
      assert.ok(clip&&clip.height>=36,name+' provides usable space for scrolling section controls');
      assert.equal(await body.evaluate(node=>getComputedStyle(node).overflowY),'auto');
      assert.ok(await body.evaluate(node=>node.scrollWidth<=node.clientWidth+1),name+' has no horizontal body overflow');
      for(const name of sections){
        const box=await tab(name).boundingBox();
        assert.ok(box.width>=55&&box.height>=32,'Every tab remains a usable target');
        assert.ok(box.x>=bounds.x-1&&box.x+box.width<=bounds.x+bounds.width+1&&box.y>=bounds.y-1&&box.y+box.height<=bounds.y+bounds.height+1,'Every tab stays inside the fixed panel header');
      }
      const closeBox=await inButton('Close flight controls').boundingBox();
      assert.ok(closeBox.height>=40&&closeBox.width>=40,'Close remains a usable target');
      assert.ok(closeBox.y>=bounds.y-1&&closeBox.y+closeBox.height<=clip.y+1,'Close stays above the scrolling body');
      const initialTabs=await panel.getByRole('tab').evaluateAll(nodes=>nodes.map(node=>({id:node.id,top:node.getBoundingClientRect().top})));
      await body.evaluate(node=>{node.scrollTop=node.scrollHeight;});
      const scrolledTabs=await panel.getByRole('tab').evaluateAll(nodes=>nodes.map(node=>({id:node.id,top:node.getBoundingClientRect().top})));
      assert.deepEqual(scrolledTabs,initialTabs,'Scrolling controls keeps every tab fixed');
      const closeAfter=await inButton('Close flight controls').boundingBox();assert.equal(closeAfter.y,closeBox.y,'Scrolling controls keeps Close fixed');
      await body.evaluate(node=>{node.scrollTop=0;});await page.waitForTimeout(100);
      await stage.screenshot({path:path.join(report,'fullscreen-tabs-'+name+'.png')});
      const metrics={name,viewport,panel:bounds,body:clip,scroll:await body.evaluate(node=>({client:node.clientHeight,height:node.scrollHeight}))};layouts.push(metrics);return metrics;
    }
    async function compactFailure(name,action){
      const before=await snapshot();await inButton(action).click();await nextDraw();await page.waitForTimeout(150);
      assert.deepEqual(await snapshot(),before,'Rejected '+name+' changes no camera state');
      const shell=await panel.boundingBox(),clip=await body.boundingBox(),notice=panel.locator('#uf-inview-notice'),note=await notice.boundingBox();
      const metrics={name,shell,body:clip,notice:note,outerScroll:await panel.evaluate(node=>node.scrollTop),bodyScroll:await body.evaluate(node=>node.scrollTop),text:await notice.innerText()};
      assert.equal(metrics.outerScroll,0,'Failure handling must not scroll the fixed shell: '+JSON.stringify(metrics));
      for(const control of [...sections.map(tab),inButton('Close flight controls')]){
        const box=await control.boundingBox();
        assert.ok(box.y>=shell.y-1&&box.y+box.height<=shell.y+shell.height+1,'Failure handling keeps tabs and Close in the panel clip: '+JSON.stringify(metrics));
      }
      assert.ok(note.y>=clip.y-1&&note.y+18<=clip.y+clip.height+1,'The start of the failure explanation is readable in the body: '+JSON.stringify(metrics));
      assert.ok(note.x>=clip.x-1&&note.x+note.width<=clip.x+clip.width+1,'Failure explanation has no horizontal clipping');
      await body.evaluate(node=>{node.scrollTop=node.scrollHeight;});
      const end=await notice.boundingBox();assert.ok(end.y+end.height>=clip.y+18&&end.y+end.height<=clip.y+clip.height+1,'The end of a long explanation is reachable by body scrolling');
      assert.equal(await panel.evaluate(node=>node.scrollTop),0,'Reading the explanation keeps the shell still');
      await body.evaluate((node,scrollTop)=>{node.scrollTop=scrollTop;},metrics.bodyScroll);
      await page.waitForTimeout(150); // Capture the readable start after verifying the end is reachable.
      await stage.screenshot({path:path.join(report,'fullscreen-tabs-landscape-failure-'+name+'.png')});
      failures.push(metrics);
    }
    await enter();await open('travel');
    const paused=await snapshot();
    for(const [key,expected] of [['ArrowRight','explore'],['ArrowRight','compose'],['ArrowRight','travel'],['ArrowLeft','compose'],['Home','travel'],['End','compose']]){
      const selected=await panel.locator('[role="tab"][aria-selected="true"]').getAttribute('id');
      await panel.locator('#'+selected).press(key);await assertSection(expected);
      assert.deepEqual(await snapshot(),paused,'Keyboard section changes preserve the paused camera and clocks');
    }
    checks.push('tablist associations and roving tabindex','mounted inactive panels are hidden','automatic Left/Right wrapping','Home and End select endpoints','keyboard tab changes preserve paused state');
    await select('travel');await tab('travel').press('Tab');
    assert.equal(await content('travel').evaluate(node=>node===document.activeElement),true,'Tab enters the active section panel');
    await content('travel').press('Tab');
    assert.equal(await panel.locator('#uf-inview-speed').evaluate(node=>node===document.activeElement),true,'Tab enters the first active section input');
    await panel.locator('#uf-inview-speed').press('ArrowRight');
    assert.equal(Number(await panel.locator('#uf-inview-speed').inputValue()),Number(await page.locator('#uf-speed').inputValue()));
    await assertSection('travel',false);assert.deepEqual((await snapshot()).state,paused.state,'Native speed keys do not rotate the camera');
    await select('explore');await panel.locator('#uf-inview-mode').press('ArrowDown');await panel.locator('#uf-inview-mode').press('Enter');
    await page.waitForFunction(()=>window.__fullscreenTabsScene.snapshot().settings.mode==='relativity');
    await assertSection('explore',false);
    assert.equal(await panel.locator('#uf-inview-mode').evaluate(node=>node===document.activeElement),true,'Changing mode preserves its native selector focus');
    await panel.locator('#uf-inview-mode').selectOption('explore');await nextDraw();
    await select('compose');const composedBefore=await snapshot();
    await range('#uf-inview-fov',57);
    assert.equal(Number(await page.locator('#uf-fov').inputValue()),57);assert.equal((await snapshot()).settings.fov,57);
    await range('#uf-inview-exposure',1.35);
    assert.equal(Number(await page.locator('#uf-exposure').inputValue()),1.35);assert.equal((await snapshot()).settings.exposure,1.35);
    await panel.locator('#uf-inview-quality').selectOption('high');await nextDraw();
    assert.equal(await page.locator('#uf-quality').inputValue(),'high');assert.equal((await snapshot()).settings.quality,'high');
    assert.deepEqual((await snapshot()).state,composedBefore.state,'Compose display changes preserve camera pose, path, and clocks');
    const beforeNativeLens=await snapshot();await panel.locator('#uf-inview-fov').press('ArrowLeft');await nextDraw();
    assert.equal((await snapshot()).settings.fov,56);await assertSection('compose',false);
    assert.deepEqual((await snapshot()).state,beforeNativeLens.state,'Native lens keys do not rotate the camera');
    checks.push('Tab enters only active controls','native speed keys preserve section and gaze','native mode select preserves focus','Compose lens synchronization','Compose exposure synchronization','Compose quality synchronization','display controls preserve position and clocks','native lens keys preserve section and gaze');
    await close();await open('compose');await exit();await enter();await open('compose');
    checks.push('selected section persists after close and reopen','selected section persists after fullscreen exit and reentry','opening focuses the selected tab');
    await select('travel');await range('#uf-inview-speed',50);
    await inButton('Start travel').click();await page.waitForFunction(()=>window.__fullscreenTabsTelemetry?.running===true);
    const moving=await snapshot();
    for(const name of ['explore','compose','travel']){
      await select(name);assert.equal((await info()).running,true,'Section changes keep travel running');
      assert.equal(await inButton('Pause travel').isVisible(),true,'Common pause remains available in every section');
      assert.equal((await snapshot()).settings.fov,moving.settings.fov);
    }
    await page.waitForTimeout(120);assert.ok((await snapshot()).state.distanceLy>moving.state.distanceLy,'The journey continues through section changes');
    await inButton('Pause travel').click();await page.waitForFunction(()=>window.__fullscreenTabsTelemetry?.running===false);
    const stopped=await snapshot();await page.waitForTimeout(100);assert.deepEqual(await snapshot(),stopped);
    checks.push('section changes preserve running travel and settings','common play/pause stays reachable in every section');
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    for(const name of sections)await axeSection('explore',name);
    await select('explore');await panel.locator('#uf-inview-mode').selectOption('relativity');await nextDraw();
    await assertSection('explore',false);
    for(const name of sections)await axeSection('relativity',name);
    checks.push('selected section persists during mode changes','all six mode and section combinations pass scoped accessibility');
    // A renderer retry should preserve panel organization independently of the GPU scene lifecycle.
    await select('compose');await close();const creates=await page.evaluate(()=>window.__fullscreenTabsCreates);
    await stage.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
    await stage.getByRole('button',{name:'Retry 3D view',exact:true}).waitFor({state:'visible'});
    await stage.getByRole('button',{name:'Retry 3D view',exact:true}).click();
    await page.waitForFunction(creates=>window.__fullscreenTabsCreates>creates&&document.querySelector('.uf-transport button')?.disabled===false,creates);
    await open('compose');checks.push('selected section persists through renderer retry');
    await layout('desktop-compose');await close();await stage.getByRole('button',{name:'Hide overlay',exact:true}).click();
    await open('compose');await select('explore');await close();await stage.getByRole('button',{name:'Show overlay',exact:true}).click();
    checks.push('tabs remain reachable in clean view');
    await exit();
    for(const [name,width,height] of [['phone',320,800],['landscape',568,320]]){
      await page.setViewportSize({width,height});await enter();await open('explore');
      const frozen=await snapshot();
      for(const section of sections){
        await select(section);await layout(name+'-'+section);
        assert.deepEqual(await snapshot(),frozen,'Compact section changes preserve the paused camera');
      }
      await panel.locator('#uf-inview-quality').scrollIntoViewIfNeeded();await panel.locator('#uf-inview-quality').selectOption('low');
      await inButton('Start travel').scrollIntoViewIfNeeded();
      const box=await inButton('Start travel').boundingBox(),clip=await body.boundingBox();
      assert.ok(box.y>=clip.y-1&&box.y+box.height<=clip.y+clip.height+1,'Compact common transport is reachable within the body');
      if(name==='landscape'){
        await select('explore');await panel.locator('#uf-inview-mode').selectOption('explore');await nextDraw();
        await panel.locator('#uf-inview-destination').selectOption('amber-star');
        await page.evaluate(()=>{
          const scene=window.__fullscreenTabsScene,saved=scene.snapshot(),target=window.UniverseFlight.landmarks('neighborhood').find(item=>item.id==='amber-star');
          saved.state.position=target.position.slice();saved.targetId=target.id;
          if(!scene.restore(saved))throw new Error('The compact failure test pose was rejected.');
        });await nextDraw();
        await compactFailure('orbit','Orbit destination');
        await compactFailure('approach','Fly to destination');
        await select('compose');
      }
      await close();await open('compose');await select('explore');await exit();
    }
    checks.push('320px tabs and all sections fit','568x320 fixed header and usable scrolling body','compact native quality and common transport remain reachable','compact Close and reopening preserve selected section');
    checks.push('short-landscape failed orbit keeps fixed chrome and readable notice','short-landscape failed approach keeps fixed chrome and readable notice');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(report,'fullscreen-tabs-check.json'),JSON.stringify({errors,checks,accessibility,layouts,failures},null,2));
    console.log('Fullscreen tabs checks passed: '+checks.length+' groups, '+accessibility.length+' scoped accessibility checks.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
