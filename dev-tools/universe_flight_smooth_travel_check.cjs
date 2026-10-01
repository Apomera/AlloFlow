const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const original=value.create;
        value.create=function(canvas,options){
          const callback=options.onTelemetry;
          const created=original.call(this,canvas,Object.assign({},options,{onTelemetry(info){
            window.__smoothTelemetry=info;
            window.__smoothHistory=(window.__smoothHistory||[]).concat([{time:performance.now(),motion:info.motion,running:info.running}]).slice(-256);
            if(callback)callback(info);
          }}));
          window.__smoothScene=created;return created;
        };
        api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__smoothScene&&window.__smoothTelemetry?.motion);
    const button=name=>page.getByRole('button',{name,exact:true});
    const stage=page.locator('.uf-stage'),sidebar=page.locator('.uf-controls'),panel=page.locator('#uf-inview-controls');
    const sideToggle=sidebar.getByRole('button',{name:'Smooth camera travel',exact:true});
    const sideReadout=sidebar.locator('.uf-motion-readout');
    const state=()=>page.evaluate(()=>window.__smoothScene.snapshot().state);
    const motion=()=>page.evaluate(()=>window.__smoothTelemetry.motion);
    const current=()=>page.evaluate(()=>window.__smoothTelemetry);
    const range=async(id,value)=>{
      await page.locator(id).evaluate((input,value)=>{
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
        input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
      },value);
      await page.waitForFunction(([id,value])=>Number(document.querySelector(id)?.value)===value,[id,value]);
    };
    async function start(scope=page.locator('.uf-transport')){
      await stage.scrollIntoViewIfNeeded();
      await scope.getByRole('button',{name:'Start travel',exact:true}).click();
      await page.waitForFunction(()=>window.__smoothTelemetry?.running===true);
    }
    async function pause(scope=page.locator('.uf-transport')){
      await scope.getByRole('button',{name:'Pause travel',exact:true}).click();
      await page.waitForFunction(()=>window.__smoothTelemetry?.running===false&&window.__smoothTelemetry.motion.paceLyPerSecond===0);
      const stopped=await state();await page.waitForTimeout(350);
      assert.deepEqual(await state(),stopped,'Pause immediately freezes position, distance, and both clocks');
      return stopped;
    }
    async function enter(){
      await button('Toggle full screen for the 3D view').click();
      await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));
      await page.locator('#uf-flight-controls-toggle').click();await panel.waitFor({state:'visible'});
      const tab=panel.locator('#uf-inview-tab-travel');await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'),'true','Smooth travel uses the active Travel tab');
    }
    async function exit(){
      await button('Toggle full screen for the 3D view').click();
      await page.waitForFunction(()=>!document.fullscreenElement);
    }
    function finiteMotion(info){
      assert.ok(Number.isFinite(info.paceLyPerSecond)&&info.paceLyPerSecond>=0,'Current pace remains finite and nonnegative');
      assert.ok(Number.isFinite(info.targetLyPerSecond)&&info.targetLyPerSecond>=0,'Target pace remains finite and nonnegative');
    }
    assert.equal(await sideToggle.getAttribute('aria-pressed'),'true','Smooth free travel is enabled initially');
    assert.equal((await motion()).smoothTravel,true);assert.equal((await motion()).paceLyPerSecond,0);
    const initial=await state();await sideToggle.click();await range('#uf-speed',70);
    await page.waitForFunction(()=>window.__smoothTelemetry.motion.smoothTravel===false);
    assert.equal(await sideToggle.getAttribute('aria-pressed'),'false');
    assert.deepEqual(await state(),initial,'Changing paused pace or smoothing does not move the camera');
    await sideToggle.click();await page.waitForFunction(()=>window.__smoothTelemetry.motion.smoothTravel===true);
    assert.match(await sideReadout.innerText(),/pace|camera/i);
    await start();
    await page.waitForFunction(()=>{const m=window.__smoothTelemetry.motion;return m.kind==='free'&&m.paceLyPerSecond>0&&m.paceLyPerSecond<m.targetLyPerSecond*.9;});
    const ramp=await motion();finiteMotion(ramp);
    await page.waitForFunction(()=>{const m=window.__smoothTelemetry.motion;return m.paceLyPerSecond>m.targetLyPerSecond*.8;},null,{timeout:15000});
    const cruise=await motion();finiteMotion(cruise);assert.ok(cruise.paceLyPerSecond>ramp.paceLyPerSecond,'Free camera pace rises toward its target');
    const beforeSlowing=await state();await range('#uf-speed',25);await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(target=>window.__smoothTelemetry.motion.targetLyPerSecond<target/10,cruise.targetLyPerSecond);
    const slowing=await motion();finiteMotion(slowing);
    assert.equal((await current()).running,true,'Changing target pace does not force a pause');
    assert.ok(slowing.paceLyPerSecond>slowing.targetLyPerSecond,'A lower target pace eases down from the current pace');
    await page.waitForFunction(pace=>window.__smoothTelemetry.motion.paceLyPerSecond<pace,slowing.paceLyPerSecond);
    assert.notDeepEqual((await state()).position,beforeSlowing.position,'The camera continues moving while slowing');
    const paused=await pause();await range('#uf-speed',70);
    assert.deepEqual(await state(),paused,'Paused target changes preserve the full camera state');
    await start();
    await page.waitForFunction(()=>{const m=window.__smoothTelemetry.motion;return m.paceLyPerSecond>0&&m.paceLyPerSecond<m.targetLyPerSecond*.9;});
    const restart=await motion();finiteMotion(restart);await pause();
    await sideToggle.click();await start();
    await page.waitForFunction(()=>{const m=window.__smoothTelemetry.motion;return !m.smoothTravel&&m.paceLyPerSecond===m.targetLyPerSecond&&m.paceLyPerSecond>0;});
    const immediate=await motion();finiteMotion(immediate);
    await page.evaluate(()=>window.__smoothScene.set({speed:0}));
    await page.waitForFunction(()=>window.__smoothTelemetry.motion.paceLyPerSecond===0&&window.__smoothTelemetry.motion.targetLyPerSecond===0);
    assert.match(await sideReadout.innerText(),/Stationary/,'A running camera with zero pace is described as stationary');
    const zero=await state();await page.waitForTimeout(350);
    assert.deepEqual(await state(),zero,'API zero pace stops without residual drift');await pause();
    // Both visible control surfaces share the same preference and current pace.
    await enter();const fullToggle=panel.getByRole('button',{name:'Smooth camera travel',exact:true});
    assert.equal(await fullToggle.getAttribute('aria-pressed'),'false');await fullToggle.click();
    assert.equal(await fullToggle.getAttribute('aria-pressed'),'true');assert.equal(await sideToggle.getAttribute('aria-pressed'),'true');
    await range('#uf-inview-speed',80);assert.equal(Number(await page.locator('#uf-speed').inputValue()),80);
    await start(panel);
    await page.waitForFunction(()=>window.__smoothTelemetry.motion.paceLyPerSecond>0);
    assert.ok((await panel.locator('.uf-motion-readout').innerText()).length>0,'Fullscreen exposes live pace');
    await pause(panel);await stage.screenshot({path:path.join(report,'smooth-travel-fullscreen.png')});await exit();
    // Saving/restoring a view restores geometry while preserving this preference.
    await page.locator('#uf-field-notes summary').click();await page.locator('#uf-view-name').fill('Smooth travel survey');
    await button('Save current view').click();const saved=await state();
    const snapshotSettings=await page.evaluate(()=>window.__smoothScene.snapshot().settings);
    assert.equal(Object.hasOwn(snapshotSettings,'smoothTravel'),false,'Saved views exclude the travel preference');
    assert.equal(Object.hasOwn(snapshotSettings,'speed'),false,'Saved views exclude current target pace');
    await sideToggle.click();await start();await page.waitForTimeout(350);await pause();
    assert.notDeepEqual((await state()).position,saved.position);
    await button('Return to saved view: Smooth travel survey').click();
    assert.deepEqual(await state(),saved,'A saved view restores the original position and clocks');
    assert.equal(await sideToggle.getAttribute('aria-pressed'),'false','Restore retains the current smoothing preference');
    assert.equal((await motion()).paceLyPerSecond,0,'Restore clears current motion');
    // Guided motion uses its established approach profile rather than free-flight easing.
    await button('Reset position').click();await button('Select destination: Amber star').click();await range('#uf-speed',70);
    await button('Fly to destination').click();await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.__smoothTelemetry.motion.kind==='approach'&&window.__smoothTelemetry.running&&window.__smoothTelemetry.motion.paceLyPerSecond>0);
    const approach=await motion();finiteMotion(approach);assert.match(await sideReadout.innerText(),/approach/i);
    assert.equal(approach.paceLyPerSecond,approach.targetLyPerSecond,'A distant guided approach uses its selected pace directly');
    await sideToggle.click();await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.__smoothTelemetry.motion.kind==='approach'&&window.__smoothTelemetry.motion.smoothTravel&&window.__smoothTelemetry.motion.paceLyPerSecond>0);
    assert.equal((await current()).navigation.active,true,'Changing the preference retains a guided approach');
    assert.equal((await motion()).paceLyPerSecond,approach.paceLyPerSecond,'A free-camera smoothing change leaves the distant approach pace unchanged');
    await button('End guided approach').click();
    // A camera orbit has its own angular pace and never inherits a free-flight ramp.
    await page.locator('#uf-region').selectOption('galaxy');await page.getByRole('button',{name:/Spiral portrait/}).click();
    await button('Orbit destination').click();await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.__smoothTelemetry.motion.kind==='orbit'&&window.__smoothTelemetry.motion.paceLyPerSecond>0);
    const orbit=await motion();finiteMotion(orbit);assert.match(await sideReadout.innerText(),/orbit/i);
    await sideToggle.click();await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!window.__smoothTelemetry.motion.smoothTravel&&window.__smoothTelemetry.motion.kind==='orbit');
    const orbitAfter=await motion();
    assert.ok(Math.abs(orbitAfter.paceLyPerSecond-orbit.paceLyPerSecond)<=Math.max(1,orbit.paceLyPerSecond)*1e-8,'Smoothing does not change camera orbit pace');
    await pause();await button('End orbit').click();
    // Physical travel retains its selected beta and Lorentz-factor clock relation.
    await button('Einstein’s light chase').click();assert.equal(await page.locator('.uf-motion-toggle').count(),0,'The free-camera toggle is absent from physical mode');
    await range('#uf-beta',0.9);const physicsBefore=await state();await start();
    await page.waitForFunction(()=>window.__smoothTelemetry.motion.kind==='relativity'&&window.__smoothTelemetry.universeYears>0);
    const physical=await current();await pause();const physicsAfter=await state();
    const years=physicsAfter.universeYears-physicsBefore.universeYears;
    assert.ok(years>0);assert.ok(Math.abs((physicsAfter.travelerYears-physicsBefore.travelerYears)/years-Math.sqrt(1-.9*.9))<1e-9);
    assert.ok(Math.abs((physicsAfter.position[2]-physicsBefore.position[2])/years-.9)<1e-9);
    finiteMotion(physical.motion);await enter();assert.equal(await panel.locator('.uf-motion-toggle').count(),0);await exit();
    await button('Free exploration').click();assert.equal(await sideToggle.getAttribute('aria-pressed'),'false','The free-camera preference survives a physical-mode visit');
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const accessibility=[];
    async function axeScope(name,selector){
      const violations=await page.evaluate(async selector=>{const result=await axe.run(document.querySelector(selector),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));},selector);
      accessibility.push({name,violations});assert.deepEqual(violations,[],name+' passes scoped accessibility checks');
    }
    await axeScope('free-camera-sidebar','.uf-controls');
    async function layout(name){
      const bounds=await panel.boundingBox(),viewport=page.viewportSize();
      assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,name+' controls fit the viewport');
      const lens=await stage.locator('.uf-lens-controls').boundingBox();
      assert.equal(lens,null,'Lens controls are hidden while the fullscreen panel is open');
      const body=panel.locator('#uf-inview-body'),bodyBounds=await body.boundingBox();
      assert.ok(bodyBounds&&bodyBounds.height>=44,name+' leaves room for a full native control');
      const scrolling=await body.evaluate(node=>({width:node.scrollWidth,clientWidth:node.clientWidth,height:node.scrollHeight,clientHeight:node.clientHeight}));
      assert.ok(scrolling.width<=scrolling.clientWidth+1,name+' controls do not overflow horizontally');
      await panel.locator('.uf-motion-toggle').scrollIntoViewIfNeeded();
      const control=await panel.locator('.uf-motion-toggle').boundingBox();assert.ok(control.y>=bodyBounds.y-1&&control.y+control.height<=bodyBounds.y+bodyBounds.height+1,name+' smoothing control is reachable in the scroll body');
      await panel.locator('.uf-motion-readout').scrollIntoViewIfNeeded();
      const readout=await panel.locator('.uf-motion-readout').boundingBox();assert.ok(readout.y>=bodyBounds.y-1&&readout.y+readout.height<=bodyBounds.y+bodyBounds.height+1,name+' current pace and status are reachable in the scroll body');
      await stage.screenshot({path:path.join(report,'smooth-travel-'+name+'-readout.png')});
      await panel.getByRole('button',{name:'Start travel',exact:true}).scrollIntoViewIfNeeded();
      const transport=await panel.getByRole('button',{name:'Start travel',exact:true}).boundingBox();assert.ok(transport.y>=bodyBounds.y-1&&transport.y+transport.height<=bodyBounds.y+bodyBounds.height+1,name+' shared transport remains reachable in the scroll body');
      await axeScope(name+'-fullscreen','#uf-inview-controls');
      await body.evaluate(node=>{node.scrollTop=0;});await stage.screenshot({path:path.join(report,'smooth-travel-'+name+'.png')});
      return {viewport,bounds,bodyBounds,scrolling,lens};
    }
    await page.setViewportSize({width:320,height:800});await enter();const phone=await layout('phone');
    await panel.getByRole('button',{name:'Smooth camera travel',exact:true}).click();assert.equal(await sideToggle.getAttribute('aria-pressed'),'true');
    await exit();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'320px page has no horizontal overflow');
    await page.setViewportSize({width:568,height:320});await enter();const landscape=await layout('landscape');
    assert.ok(landscape.scrolling.height>landscape.scrolling.clientHeight,'Short landscape provides a scrollable fullscreen body');
    await exit();assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(report,'smooth-travel-check.json'),JSON.stringify({errors,accessibility,ramp,cruise,slowing,restart,immediate,approach,orbit,orbitAfter,physical:physical.motion,phone,landscape,checks:['default smooth travel','paused settings invariants','free-flight acceleration','live pace reduction','instant pause','resume ramp','instant pace option','API zero pace','shared normal and fullscreen preference','fullscreen live pace','saved-view preference retention and motion reset','guided approach remains active','orbit pace unaffected','physical mode hides camera smoothing','physical clocks and distance','320px layout','568x320 fullscreen body scrolling','scoped accessibility','fullscreen panel hides lens controls']},null,2));
    console.log('Smooth camera travel browser checks passed.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
