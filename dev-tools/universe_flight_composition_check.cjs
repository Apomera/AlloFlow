const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[],checks=[],accessibility=[],layouts=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const original=value.create;
        value.create=function(canvas,options){
          const callback=options.onTelemetry;
          const created=original.call(this,canvas,Object.assign({},options,{onTelemetry(info){window.__compositionTelemetry=info;if(callback)callback(info);}}));
          window.__compositionScene=created;
          for(const name of ['frameTarget','undoFrame']){
            const action=created[name];
            created[name]=function(...args){
              const before=created.snapshot(),result=action.apply(created,args),after=created.snapshot();
              window.__compositionAction={name,args,before,after,result};return result;
            };
          }
          return created;
        };
        api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__compositionScene);
    const button=name=>page.getByRole('button',{name,exact:true});
    const stage=page.locator('.uf-stage');
    const normal=page.locator('.uf-view-column > .uf-composition-controls');
    const grid=stage.locator('.uf-composition-grid');
    const placements=[{u:1/3,label:'Frame Amber star on left third',placement:'left'},{u:.5,label:'Frame Amber star at center',placement:'center'},{u:2/3,label:'Frame Amber star on right third',placement:'right'}];
    const snapshot=()=>page.evaluate(()=>window.__compositionScene.snapshot());
    const telemetry=()=>page.evaluate(()=>window.__compositionTelemetry);
    const capture=()=>page.evaluate(()=>window.__compositionScene.capture());
    const preserved=saved=>{const {yaw,pitch,...state}=saved.state;return {settings:saved.settings,state};};
    const nextDraw=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    function closeNumber(actual,expected,description,tolerance=1e-7){assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<tolerance,description+': '+actual+' versus '+expected);}
    async function setRange(selector,value){
      await page.locator(selector).evaluate((input,value)=>{
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
        input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
      },value);
    }
    async function pose(direction,coincident=false){
      const desired=await page.evaluate(({direction,coincident})=>{
        const scene=window.__compositionScene,saved=scene.snapshot(),item=window.UniverseFlight.landmarks('neighborhood').find(item=>item.id==='amber-star');
        const length=Math.hypot(...direction);
        saved.state.position=item.position.map((value,index)=>value-(coincident?0:direction[index]/length*10));
        saved.state.yaw=.4;saved.state.pitch=.1;saved.state.distanceLy=12.5;saved.state.universeYears=4;saved.state.travelerYears=2;saved.targetId=item.id;
        if(!scene.restore(saved))throw new Error('Composition test pose was rejected.');
        return saved;
      },{direction,coincident});
      await nextDraw();
      await page.waitForFunction(position=>window.__compositionTelemetry.position.every((value,index)=>Math.abs(value-position[index])<1e-9),desired.state.position);
      return desired;
    }
    async function frame(item,scope=normal){
      await scope.getByRole('button',{name:item.label,exact:true}).click();
      await page.waitForFunction(placement=>window.__compositionTelemetry?.framing?.placement===placement,item.placement);
      await nextDraw();
      const info=await telemetry(),action=await page.evaluate(()=>window.__compositionAction);
      assert.equal(action.name,'frameTarget');assert.equal(action.result,true);
      assert.deepEqual(preserved(action.after),preserved(action.before),'Framing preserves the camera position, path, clocks, and lens');
      assert.equal(info.running,false,'Framing pauses travel');assert.equal(info.orbit.active,false,'Framing ends the orbit');
      closeNumber(info.target.screen[0],item.u,item.placement+' horizontal anchor');closeNumber(info.target.screen[1],.5,item.placement+' vertical center');
      assert.equal(info.target.inView,true);
      assert.equal(await stage.locator('canvas').evaluate(canvas=>document.activeElement===canvas),true,'Framing focuses the universe canvas');
      if(await page.evaluate(()=>!!document.fullscreenElement))assert.equal(await stage.locator('#uf-inview-controls').count(),0,'Successful fullscreen framing closes the panel to inspect the view');
      return {item,info,action};
    }
    async function undo(scope=normal){
      await scope.getByRole('button',{name:'Undo framing',exact:true}).click();await nextDraw();
      await page.waitForFunction(()=>window.__compositionTelemetry?.framing?.canUndo===false);
      const action=await page.evaluate(()=>window.__compositionAction);
      assert.equal(action.name,'undoFrame');assert.equal(action.result,true);
      assert.deepEqual(preserved(action.after),preserved(action.before),'Framing undo changes only gaze');
      assert.equal((await telemetry()).running,false);
      return action;
    }
    await button('Select destination: Amber star').click();
    await normal.waitFor({state:'visible'});
    assert.equal(await grid.count(),0,'The composition grid starts hidden');
    assert.equal(await normal.getByRole('button',{name:'Composition grid',exact:true}).getAttribute('aria-pressed'),'false');
    assert.equal(await normal.getByRole('button',{name:'Undo framing',exact:true}).isDisabled(),true);
    await pose([0,0,1]);
    const gridBefore=await capture();
    await normal.getByRole('button',{name:'Composition grid',exact:true}).click();await nextDraw();
    assert.equal(await grid.getAttribute('aria-hidden'),'true');assert.equal(await grid.locator('line').count(),4);
    assert.equal(await grid.evaluate(node=>getComputedStyle(node).pointerEvents),'none','The grid passes drag gestures to the canvas');
    const gridAfter=await capture();
    assert.deepEqual(gridAfter.snapshot,gridBefore.snapshot,'The grid changes no scene or saved-view settings');
    assert.equal(gridAfter.dataUrl,gridBefore.dataUrl,'The exported PNG excludes the composition overlay');
    await stage.screenshot({path:path.join(report,'composition-desktop-grid.png')});
    checks.push('decorative four-line composition grid','grid preserves scene state','grid excluded from saved snapshots and PNG pixels');
    const original=await snapshot(),framed=[];
    for(const item of placements){
      framed.push(await frame(item));
      assert.equal(await normal.getByRole('button',{name:item.label,exact:true}).getAttribute('aria-pressed'),'true');
      const paused=await snapshot();await page.waitForTimeout(150);assert.deepEqual(await snapshot(),paused,'Composed frames stay paused');
      await undo();assert.deepEqual(await snapshot(),original,'Undo restores the original gaze');
    }
    assert.equal(await normal.getByRole('button',{name:'Undo framing',exact:true}).isDisabled(),true);
    checks.push('all three exact anchors','paused frames retain position and clocks','orientation undo','frame action focuses canvas');
    // Saved views preserve the framed direction, while transient undo belongs to the live camera.
    await frame(placements[0]);const savedFrame=await snapshot();
    await page.locator('#uf-field-notes summary').click();
    const nameInput=page.locator('#uf-field-notes input[type="text"]').first();
    await nameInput.fill('Amber composition study');await button('Save current view').click();
    await stage.locator('canvas').focus();await stage.locator('canvas').press('ArrowRight');await nextDraw();
    assert.equal((await telemetry()).framing.canUndo,false,'Manual gaze clears framing undo');
    await button('Return to saved view: Amber composition study').click();await nextDraw();
    assert.deepEqual(await snapshot(),savedFrame,'A saved observation restores the composed gaze and settings');
    checks.push('saved views restore composition','manual gaze clears framing undo');
    // Display aberration and its unshifted comparison use their own inverse projection.
    await button('Einstein’s light chase').click();
    await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.mode==='relativity');
    await button('Select destination: Amber star').click();await setRange('#uf-beta',.9);
    await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.beta===.9);
    await pose([.6,0,-.8]);
    const apparent=await frame(placements[2]);
    await page.locator('.uf-controls .uf-compare').click();
    await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.compareRest===true);
    assert.equal(await normal.getByRole('button',{name:'Undo framing',exact:true}).isDisabled(),true,'A changed displayed sky invalidates old framing undo');
    const unshifted=await frame(placements[2]);
    assert.notEqual(apparent.action.after.state.yaw,unshifted.action.after.state.yaw,'Rest and aberrated sky require different gaze angles');
    assert.deepEqual(preserved(unshifted.action.after).state,preserved(apparent.action.after).state,'Switching and composing the displayed sky preserves the physical camera and clocks');
    await page.locator('.uf-controls .uf-compare').click();
    await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.compareRest===false);
    checks.push('relativistic apparent framing at beta 0.9','unshifted comparison framing','display change invalidates undo');
    await button('Free exploration').click();await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.mode==='explore');
    await button('Select destination: Amber star').click();await pose([0,0,1]);
    await button('Orbit destination').click();
    await page.waitForFunction(()=>window.__compositionTelemetry?.orbit?.active===true&&window.__compositionTelemetry?.running===true);
    await frame(placements[0]);assert.equal((await telemetry()).orbit.active,false);
    await undo();assert.equal((await telemetry()).orbit.active,false,'Undo keeps the orbit ended');
    await pose([0,0,1]);await button('Fly to destination').click();
    await page.waitForFunction(()=>window.__compositionTelemetry?.navigation?.active===true);
    await frame(placements[2]);
    const route=await telemetry();assert.equal(route.navigation.active,true,'Framing retains a matching guided route paused');
    const routeFrame=await snapshot();await page.waitForTimeout(150);assert.deepEqual(await snapshot(),routeFrame);
    await page.evaluate(()=>window.__compositionScene.cancelNavigation());
    checks.push('active orbit ends without camera translation','undo does not restart orbit','guided route retained paused');
    // Unreachable thirds are explained and disabled. Invalid API calls must remain atomic.
    const pole=Math.PI/2-.02;
    await pose([0,Math.sin(pole),Math.cos(pole)]);
    assert.equal(await normal.getByRole('button',{name:placements[0].label,exact:true}).isDisabled(),true);
    assert.equal(await normal.getByRole('button',{name:placements[1].label,exact:true}).isEnabled(),true);
    assert.equal(await normal.getByRole('button',{name:placements[2].label,exact:true}).isDisabled(),true);
    assert.match(await normal.innerText(),/Side framing is unavailable/);
    const rejected=await page.evaluate(()=>{
      const scene=window.__compositionScene,before=scene.snapshot(),result=scene.frameTarget('amber-star',1/3);
      return {before,result,after:scene.snapshot()};
    });
    assert.equal(rejected.result,false);assert.deepEqual(rejected.after,rejected.before);
    await frame(placements[1]);
    await pose([0,0,1],true);
    for(const item of placements)assert.equal(await normal.getByRole('button',{name:item.label,exact:true}).isDisabled(),true);
    assert.match(await normal.innerText(),/Move away from the landmark center/);
    checks.push('pole reachability gates side framing','unreachable frame rejection is atomic','coincident landmark disables framing');
    await pose([0,0,1]);
    await button('Hide overlay').click();assert.equal(await grid.isVisible(),false,'Clean view hides the decorative grid');
    await button('Show overlay').click();assert.equal(await grid.isVisible(),true);
    await button('Einstein’s light chase').click();await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.mode==='relativity');
    assert.equal(await normal.getByRole('button',{name:'Composition grid',exact:true}).getAttribute('aria-pressed'),'true','The grid preference persists across modes');
    await button('Close flight explorer').click();await button('Open 3D flight').click();
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__compositionScene);
    assert.equal(await normal.getByRole('button',{name:'Composition grid',exact:true}).getAttribute('aria-pressed'),'true','The grid preference persists across closing and reopening');
    checks.push('clean view hides grid','grid preference persists across modes and reopening');
    await button('Free exploration').click();await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.mode==='explore');
    await button('Select destination: Amber star').click();await pose([0,0,1]);
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    async function axeScope(name,scope){
      const violations=await scope.evaluate(async node=>{const result=await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}));});
      accessibility.push({name,violations});assert.deepEqual(violations,[],name+' passes scoped accessibility checks');
    }
    async function fitControls(name,scope){
      await scope.scrollIntoViewIfNeeded();
      const geometry=await scope.evaluate(node=>{
        const boundary=document.fullscreenElement?document.querySelector('#uf-inview-controls').getBoundingClientRect():{left:0,right:innerWidth};
        const controls=[...node.querySelectorAll('button')].map(child=>{const box=child.getBoundingClientRect();return {text:child.textContent,left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};});
        return {boundary:{left:boundary.left,right:boundary.right},controls,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.equal(geometry.overflow,false,name+' has no horizontal document overflow');
      for(const control of geometry.controls){
        assert.ok(control.left>=geometry.boundary.left-1&&control.right<=geometry.boundary.right+1,name+' keeps '+control.text+' inside its panel');
        assert.ok(control.width>=30&&control.height>=30,name+' keeps '+control.text+' usable');
      }
      layouts.push({name,...geometry});return geometry;
    }
    await axeScope('desktop composition controls',normal);await axeScope('desktop scene with grid',stage);
    await page.setViewportSize({width:320,height:800});await nextDraw();
    await fitControls('320px normal controls',normal);await normal.screenshot({path:path.join(report,'composition-phone-controls.png')});
    await axeScope('320px composition controls',normal);
    await button('Toggle full screen for the 3D view').click();
    await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));
    async function fullControls(){
      if(await stage.locator('#uf-inview-controls').count()===0)await stage.getByRole('button',{name:'Flight controls',exact:true}).click();
      const tab=stage.locator('#uf-inview-tab-compose');await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'),'true','Fullscreen composition opens its active tab');
      const scope=stage.locator('#uf-inview-controls .uf-composition-controls');await scope.waitFor({state:'visible'});return scope;
    }
    let full=await fullControls();await fitControls('320px fullscreen controls',full);
    assert.equal(await full.getByRole('button',{name:'Composition grid',exact:true}).getAttribute('aria-pressed'),'true');
    await full.getByRole('button',{name:'Composition grid',exact:true}).click();assert.equal(await grid.count(),0);
    assert.equal(await stage.locator('#uf-inview-controls').count(),1,'Grid toggle leaves fullscreen controls open');
    await full.getByRole('button',{name:'Composition grid',exact:true}).click();assert.equal(await grid.isVisible(),true);
    await axeScope('320px fullscreen composition controls',stage);
    await stage.screenshot({path:path.join(report,'composition-phone-fullscreen-controls.png')});
    await frame(placements[0],full);await stage.screenshot({path:path.join(report,'composition-phone-fullscreen.png')});
    full=await fullControls();await undo(full);
    await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.setViewportSize({width:568,height:320});await nextDraw();
    await button('Toggle full screen for the 3D view').click();await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));
    full=await fullControls();await fitControls('568x320 fullscreen controls',full);
    await axeScope('568x320 fullscreen controls',stage);
    await stage.screenshot({path:path.join(report,'composition-landscape-fullscreen-controls.png')});
    await frame(placements[2],full);await stage.screenshot({path:path.join(report,'composition-landscape-fullscreen.png')});
    full=await fullControls();await undo(full);
    await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.setViewportSize({width:1440,height:1000});await button('Einstein’s light chase').click();
    await page.waitForFunction(()=>window.__compositionScene.snapshot().settings.mode==='relativity');
    await button('Select destination: Amber star').click();await pose([0,0,1]);
    await button('Toggle full screen for the 3D view').click();await page.waitForFunction(()=>!!document.fullscreenElement);
    full=await fullControls();await frame(placements[2],full);
    full=await fullControls();await undo(full);
    full=await fullControls();
    await axeScope('relativity fullscreen composition controls',stage);
    await stage.getByRole('button',{name:'Close flight controls',exact:true}).click();
    await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    checks.push('shared fullscreen grid preference','fullscreen grid toggle retains panel','fullscreen framing closes panel and focuses canvas','320px controls fit','568x320 controls fit','relativity fullscreen composition','scoped accessibility checks');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(report,'composition-check.json'),JSON.stringify({errors,checks,accessibility,layouts,framed,apparent,unshifted},null,2));
    console.log('Composition browser checks passed: '+checks.length+' groups, '+accessibility.length+' scoped accessibility checks.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
