const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
    const errors=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const original=value.create;
        value.create=function(canvas,options){
          const callback=options.onTelemetry;
          const observed=Object.assign({},options,{onTelemetry(info){window.__fullscreenTelemetry=info;if(callback)callback(info);}});
          const created=original.call(this,canvas,observed);window.__fullscreenScene=created;return created;
        };
        api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__fullscreenScene);
    const button=name=>page.getByRole('button',{name,exact:true});
    const stage=page.locator('.uf-stage'),panel=page.locator('#uf-inview-controls'),body=panel.locator('#uf-inview-body');
    const toggle=page.locator('#uf-flight-controls-toggle');
    const snapshot=()=>page.evaluate(()=>window.__fullscreenScene.snapshot().state);
    async function section(name){
      const tab=panel.locator('#uf-inview-tab-'+name);
      if(await tab.getAttribute('aria-selected')!=='true')await tab.click();
      await panel.locator('#uf-inview-panel-'+name).waitFor({state:'visible'});
    }
    const range=async(id,value)=>{
      await section('travel');
      await page.locator(id).evaluate((input,value)=>{
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
        input.dispatchEvent(new Event('input',{bubbles:true}));
      },value);
      await page.waitForFunction(([id,value])=>Number(document.querySelector(id)?.value)===value,[id,value]);
      await page.waitForTimeout(70);
    };
    async function enter(){
      await button('Toggle full screen for the 3D view').click();
      await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));
      await toggle.waitFor({state:'visible'});
    }
    async function exit(){
      await button('Toggle full screen for the 3D view').click();
      await page.waitForFunction(()=>!document.fullscreenElement);
      assert.equal(await panel.count(),0,'Exiting fullscreen removes the flight controls panel');
      assert.equal(await toggle.isVisible(),false,'The in-view toggle is fullscreen only');
      await page.waitForFunction(()=>document.activeElement===document.querySelector('.uf-stage canvas'));
    }
    async function open(){
      if(await panel.count()===0)await toggle.click();await panel.waitFor({state:'visible'});
      assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      assert.equal(await toggle.getAttribute('aria-controls'),'uf-inview-controls');
      await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='tab'&&document.activeElement?.getAttribute('aria-selected')==='true');
      await section('travel');
    }
    async function close(){
      await panel.getByRole('button',{name:'Close flight controls',exact:true}).click();
      assert.equal(await panel.count(),0);
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      await page.waitForFunction(()=>document.activeElement?.id==='uf-flight-controls-toggle');
    }
    async function layout(name){
      const bounds=await panel.boundingBox();
      assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=page.viewportSize().width+1&&bounds.y+bounds.height<=page.viewportSize().height+1,name+' panel fits inside the viewport');
      const horizontal=await panel.evaluate(node=>{
        const bounds=node.getBoundingClientRect();return {scroll:node.scrollWidth,client:node.clientWidth,overflowing:[...node.querySelectorAll('*')].filter(child=>child.getBoundingClientRect().right>bounds.right).map(child=>({tag:child.tagName,class:child.className,text:child.textContent?.slice(0,100),width:child.getBoundingClientRect().width}))};
      });
      if(horizontal.scroll>horizontal.client+1)console.log(name+' panel overflow: '+JSON.stringify(horizontal));
      assert.ok(horizontal.scroll<=horizontal.client+1,name+' controls do not overflow horizontally');
      const closeButton=panel.getByRole('button',{name:'Close flight controls',exact:true});
      await closeButton.scrollIntoViewIfNeeded();
      const closeBox=await closeButton.boundingBox();
      assert.ok(closeBox&&closeBox.x>=bounds.x&&closeBox.x+closeBox.width<=bounds.x+bounds.width+1,name+' close action remains reachable');
      await body.evaluate(node=>{node.scrollTop=0;});
      await stage.screenshot({path:path.join(report,'fullscreen-controls-'+name+'.png')});
      return {viewport:page.viewportSize(),panel:bounds,scroll:await body.evaluate(node=>({height:node.scrollHeight,client:node.clientHeight}))};
    }
    assert.equal(await toggle.isVisible(),false);
    const paused=await snapshot();await enter();await open();
    assert.equal(await panel.locator('#uf-inview-tab-travel').evaluate(node=>node===document.activeElement),true);
    for(const [name,value] of [['Survey pace',25],['Cruise pace',55],['Traversal pace',85]]){
      await panel.getByRole('button',{name,exact:true}).click();
      assert.equal(Number(await page.locator('#uf-speed').inputValue()),value);
      assert.equal(await panel.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
    }
    await range('#uf-inview-speed',74);
    assert.equal(Number(await page.locator('#uf-speed').inputValue()),74,'In-view speed synchronizes the main slider');
    assert.ok((await panel.locator('.uf-inview-value').first().innerText()).length>0);
    // Native keyboard and pointer input reach the same controls without rotating the canvas.
    await page.locator('#uf-inview-speed').press('ArrowLeft');
    assert.equal(Number(await page.locator('#uf-speed').inputValue()),73);
    const speedBox=await page.locator('#uf-inview-speed').boundingBox();
    await page.mouse.click(speedBox.x+speedBox.width*.3,speedBox.y+speedBox.height/2);
    assert.ok(Number(await page.locator('#uf-speed').inputValue())<50,'Pointer adjustment reaches the range through the popover');
    assert.deepEqual(await snapshot(),paused,'Opening and changing controls preserves a paused camera and clocks');
    const desktop=await layout('desktop');await close();
    assert.deepEqual(await snapshot(),paused,'Closing controls preserves the paused state');
    await stage.locator('.uf-overlay-toggle').click();assert.equal(await toggle.isVisible(),true,'Clean view keeps flight controls accessible');
    await open();await range('#uf-inview-speed',90);
    await panel.getByRole('button',{name:'Start travel',exact:true}).click();
    await page.waitForFunction(()=>window.__fullscreenTelemetry?.running===true);
    const moving=await snapshot();await range('#uf-inview-speed',75);await page.waitForTimeout(300);
    assert.equal(await panel.getByRole('button',{name:'Pause travel',exact:true}).count(),1,'Adjusting speed leaves travel running');
    assert.equal(await page.evaluate(()=>window.__fullscreenTelemetry.running),true);
    assert.notDeepEqual((await snapshot()).position,moving.position,'The camera keeps traveling after a pace change');
    await panel.getByRole('button',{name:'Pause travel',exact:true}).click();
    await page.waitForFunction(()=>window.__fullscreenTelemetry?.running===false);
    const stopped=await snapshot();await page.waitForTimeout(150);assert.deepEqual(await snapshot(),stopped);
    await exit();await enter();assert.equal(await panel.count(),0,'Reentering fullscreen starts with controls closed');await exit();
    await button('Einstein’s light chase').click();await enter();await open();
    const physical=await snapshot();
    assert.equal(await panel.locator('#uf-inview-tab-travel').evaluate(node=>node===document.activeElement),true);
    await range('#uf-inview-beta',0.975);
    assert.equal(Number(await page.locator('#uf-beta').inputValue()),0.975);
    await page.locator('#uf-inview-time').selectOption('10');
    assert.equal(await page.locator('#uf-time').inputValue(),'10');
    const inViewCompare=panel.getByRole('button',{name:'Unshifted sky comparison',exact:true});
    const compareBefore=await inViewCompare.getAttribute('aria-pressed');await inViewCompare.click();
    assert.notEqual(await inViewCompare.getAttribute('aria-pressed'),compareBefore);
    assert.equal(await page.locator('.uf-controls .uf-compare').getAttribute('aria-pressed'),await inViewCompare.getAttribute('aria-pressed'));
    assert.deepEqual(await snapshot(),physical,'Relativity controls change parameters without advancing paused clocks');
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    const accessibility=[];
    async function axePanel(name){
      const violations=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('#uf-inview-controls'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});
      accessibility.push({name,violations});assert.deepEqual(violations,[],name+' panel passes scoped accessibility checks');
    }
    await axePanel('relativity');
    await exit();await page.setViewportSize({width:320,height:800});await enter();await open();
    const phone=await layout('phone');await axePanel('phone');
    await close();await open();await page.locator('#uf-inview-beta').press('ArrowLeft');
    assert.equal(Number(await page.locator('#uf-beta').inputValue()),0.9749,'Narrow fullscreen still accepts keyboard controls');
    await exit();await page.setViewportSize({width:700,height:360});await enter();await open();
    const landscape=await layout('landscape');
    assert.ok(landscape.scroll.height>landscape.scroll.client,'Short landscape exposes a scrollable controls panel');
    await page.locator('#uf-inview-time').scrollIntoViewIfNeeded();
    await page.locator('#uf-inview-time').selectOption('0.1');
    assert.equal(await page.locator('#uf-time').inputValue(),'0.1','Short-landscape scrolling reaches the playback selector');
    await panel.getByRole('button',{name:'Start travel',exact:true}).scrollIntoViewIfNeeded();
    const landscapeTransport=await panel.getByRole('button',{name:'Start travel',exact:true}).boundingBox();
    assert.ok(landscapeTransport.y>=landscape.panel.y&&landscapeTransport.y+landscapeTransport.height<=landscape.panel.y+landscape.panel.height+1,'The bottom transport is fully reachable by scrolling');
    assert.ok(await body.evaluate(node=>node.scrollTop>0));
    await stage.screenshot({path:path.join(report,'fullscreen-controls-landscape-scrolled.png')});
    await panel.getByRole('button',{name:'Close flight controls',exact:true}).click();await open();await axePanel('landscape');
    await exit();await page.setViewportSize({width:1440,height:1000});
    await button('Free exploration').click();await page.locator('#uf-region').selectOption('galaxy');
    await page.getByRole('button',{name:/Spiral portrait/}).click();
    await button('Orbit destination').click();await page.waitForTimeout(100);await enter();await open();
    assert.equal(await panel.locator('.uf-inview-value').first().evaluate(node=>node.firstChild.textContent),await page.locator('output[for="uf-speed"]').evaluate(node=>node.firstChild.textContent),'Galaxy pace output matches the main scale');
    await range('#uf-inview-orbit-rate',6);
    assert.equal(Number(await page.locator('#uf-orbit-rate').inputValue()),6,'Fullscreen orbit pace synchronizes the main control');
    await panel.getByRole('button',{name:'Reverse orbit direction',exact:true}).click();
    await section('explore');
    assert.equal(await panel.getByRole('button',{name:'End orbit',exact:true}).count(),1,'The fullscreen orbit action stays available after reversing direction');
    assert.equal(await page.evaluate(()=>window.__fullscreenTelemetry?.orbit?.active),true,'Changing orbit direction preserves the orbit');
    await axePanel('orbit');
    await section('travel');
    await panel.getByRole('button',{name:'Pause travel',exact:true}).click();
    await page.waitForFunction(()=>window.__fullscreenTelemetry?.running===false);
    const orbitPaused=await snapshot();await range('#uf-inview-orbit-rate',2);await page.waitForTimeout(150);
    assert.deepEqual(await snapshot(),orbitPaused,'Orbit pace changes preserve a paused orbit');
    await exit();await page.locator('#uf-region').selectOption('cosmic');await page.waitForTimeout(100);await enter();await open();
    const cosmicPaused=await snapshot();await range('#uf-inview-speed',85);
    assert.equal(Number(await page.locator('#uf-speed').inputValue()),85);
    assert.equal(await panel.locator('.uf-inview-value').first().evaluate(node=>node.firstChild.textContent),await page.locator('output[for="uf-speed"]').evaluate(node=>node.firstChild.textContent),'Cosmic pace output matches the main scale');
    assert.deepEqual(await snapshot(),cosmicPaused,'Changing cosmic pace preserves the paused camera');
    await exit();assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(report,'fullscreen-controls-check.json'),JSON.stringify({errors,accessibility,desktop,phone,landscape,checks:['fullscreen-only controls','selected tab focus on open','focus return on close and fullscreen exit','pace presets','paused position and clock invariants','keyboard and pointer speed adjustment','running speed adjustment','clean overlay access','exit and reentry cleanup','relativity speed and time synchronization','sky comparison synchronization','320px layout','short landscape body scrolling and bottom transport reachability','orbit pace and direction','paused orbit invariants','local, galaxy, and cosmic pace synchronization']},null,2));
    console.log('Fullscreen flight controls browser checks passed.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
