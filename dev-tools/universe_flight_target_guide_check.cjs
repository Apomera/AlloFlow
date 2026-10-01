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
          const observed=Object.assign({},options,{onTelemetry(info){window.__targetGuideTelemetry=info;if(callback)callback(info);}});
          const created=original.call(this,canvas,observed);window.__targetGuideScene=created;return created;
        };
        api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__targetGuideScene);
    const button=name=>page.getByRole('button',{name,exact:true});
    const stage=page.locator('.uf-stage'),finder=stage.getByRole('button',{name:'Find target: Amber star',exact:true});
    const bearing=stage.locator('.uf-target-bearing'),description=stage.locator('#uf-target-guide');
    const state=()=>page.evaluate(()=>window.__targetGuideScene.snapshot().state);
    const telemetry=()=>page.evaluate(()=>window.__targetGuideTelemetry.target);
    const preserved=source=>({position:source.position,distanceLy:source.distanceLy,universeYears:source.universeYears,travelerYears:source.travelerYears});
    await button('Select destination: Amber star').click();
    await stage.scrollIntoViewIfNeeded();
    async function pose(direction,coincident=false){
      const position=await page.evaluate(({direction,coincident})=>{
        const scene=window.__targetGuideScene,saved=scene.snapshot();
        const item=window.UniverseFlight.landmarks('neighborhood').find(item=>item.id==='amber-star');
        const length=Math.hypot(...direction);
        saved.state.position=item.position.map((value,index)=>value-(coincident?0:direction[index]/length*10));
        saved.state.yaw=0;saved.state.pitch=0;
        saved.state.distanceLy=12.5;saved.state.universeYears=4;saved.state.travelerYears=2;
        saved.targetId=item.id;
        if(!scene.restore(saved))throw new Error('The test camera pose was rejected.');
        return saved.state.position;
      },{direction,coincident});
      await page.waitForFunction(position=>window.__targetGuideTelemetry?.position.every((value,index)=>Math.abs(value-position[index])<1e-10),position);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      return state();
    }
    function angleFromText(text){
      const match=text.match(/([\d.]+)\s*°/);assert.ok(match,'The guide describes its angular separation');return Number(match[1]);
    }
    async function assertGuide({name,direction,words,behind=false,angle=90}){
      await pose(direction);
      await finder.waitFor({state:'visible'});
      assert.equal(await finder.getAttribute('aria-describedby'),'uf-target-guide',name+' has an accessible direction description');
      const text=await description.innerText();
      assert.match(text,/from view center/,name+' describes angular separation from the current gaze');
      for(const word of words)assert.match(text,word,name+' supplies the expected look direction');
      assert.equal(/Behind you/i.test(text),behind,name+' describes whether the destination is behind the camera');
      assert.ok(Math.abs(angleFromText(await finder.locator('.uf-finder-angle').innerText())-angle)<=0.51,name+' agrees with geometric angular separation');
      assert.ok((await finder.locator('.uf-finder-direction').innerText()).trim().length>0);
      assert.equal(await bearing.getAttribute('aria-hidden'),'true','The visual edge pointer is decorative');
      assert.equal(await bearing.isVisible(),true,name+' has a visible edge pointer');
      assert.equal(await stage.locator('.uf-target-marker').count(),0,name+' has no misleading on-screen marker');
      const target=await telemetry();assert.equal(target.inView,false);assert.ok(target.guide);assert.equal(target.coincident,false);
      assert.equal(target.guide.behind,behind,name+' telemetry agrees with the rear description');
      assert.ok(Math.abs(target.guide.angleDeg-angle)<1e-7,name+' telemetry agrees with the geometric angle');
      assert.ok(target.guide.edge.every(value=>Number.isFinite(value)&&value>=.1-1e-10&&value<=.9+1e-10),name+' telemetry places its pointer safely inside the scene');
      if(['right','left','up','down','upper right','upper left','lower right','lower left','direct rear'].includes(name)){
        assert.equal(target.guide.sector,name==='direct rear'?'behind':name.replaceAll(' ','-'),name+' identifies its compass sector');
      }
      return {name,text,angle:angleFromText(text),target};
    }
    const directions=[];
    for(const item of [
      {name:'right',direction:[1,0,0],words:[/right/i]},
      {name:'left',direction:[-1,0,0],words:[/left/i]},
      {name:'up',direction:[0,1,0],words:[/(?:up|upper)/i]},
      {name:'down',direction:[0,-1,0],words:[/(?:down|lower)/i]},
      {name:'upper right',direction:[1,1,0],words:[/(?:up|upper)/i,/right/i]},
      {name:'upper left',direction:[-1,1,0],words:[/(?:up|upper)/i,/left/i]},
      {name:'lower right',direction:[1,-1,0],words:[/(?:down|lower)/i,/right/i]},
      {name:'lower left',direction:[-1,-1,0],words:[/(?:down|lower)/i,/left/i]}
    ])directions.push(await assertGuide(item));
    const rear=await assertGuide({name:'direct rear',direction:[0,0,-1],words:[/Turn around/i],behind:true,angle:180});
    const before=await state();await finder.click();
    await page.waitForFunction(()=>window.__targetGuideTelemetry?.target?.inView===true);
    await page.waitForFunction(()=>!document.querySelector('.uf-target-finder')&&!!document.querySelector('.uf-target-marker'));
    assert.deepEqual(preserved(await state()),preserved(before),'Centering an off-screen destination preserves position, distance, and both clocks');
    const centered=await telemetry();assert.ok(Math.abs(centered.screen[0]-.5)<.001&&Math.abs(centered.screen[1]-.5)<.001,'The finder centers the apparent destination');
    assert.equal(await bearing.count(),0,'Centering removes the edge pointer');
    // Relativity turns this rest-space direction from behind to ahead; the guide must follow the displayed sky.
    await button('Einstein’s light chase').click();
    await page.waitForFunction(()=>window.__targetGuideScene.snapshot().settings.mode==='relativity');
    await button('Select destination: Amber star').click();
    await page.locator('#uf-beta').evaluate(input=>{
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0.9');
      input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.waitForFunction(()=>window.__targetGuideScene.snapshot().settings.beta===.9);
    const restDirection=[.6,0,-.8],relativisticAngle=Math.acos((-.8+.9)/(1+.9*-.8))*180/Math.PI;
    const relativistic=await assertGuide({name:'relativistic apparent bearing',direction:restDirection,words:[/right/i],angle:relativisticAngle});
    const physicalBefore=await state();
    await page.locator('.uf-controls .uf-compare').click();
    await page.waitForFunction(()=>window.__targetGuideScene.snapshot().settings.compareRest===true);
    await finder.waitFor({state:'visible'});
    const comparisonText=await description.innerText();
    assert.match(comparisonText,/Behind you/i,'The unshifted comparison reports the rest-space destination behind the gaze');
    assert.ok(Math.abs(angleFromText(comparisonText)-Math.acos(-.8)*180/Math.PI)<=.51,'Unshifted guide agrees with the rest-space angular separation');
    assert.deepEqual(preserved(await state()),preserved(physicalBefore),'Switching the comparison leaves the camera and clocks still');
    const comparison=await telemetry();assert.ok(comparison.guide);
    await finder.click();await page.waitForFunction(()=>window.__targetGuideTelemetry?.target?.inView===true);
    assert.deepEqual(preserved(await state()),preserved(physicalBefore),'The comparison finder centers its displayed sky without moving the traveler');
    await page.locator('.uf-controls .uf-compare').click();
    await page.waitForFunction(()=>window.__targetGuideScene.snapshot().settings.compareRest===false);
    const betaBefore=await pose(restDirection);await finder.click();
    await page.waitForFunction(()=>window.__targetGuideTelemetry?.target?.inView===true);
    assert.deepEqual(preserved(await state()),preserved(betaBefore),'Relativistic centering preserves position and clocks');
    const betaCentered=await telemetry();assert.ok(Math.abs(betaCentered.screen[0]-.5)<.001&&Math.abs(betaCentered.screen[1]-.5)<.001);
    await button('Free exploration').click();
    await page.waitForFunction(()=>window.__targetGuideScene.snapshot().settings.mode==='explore');
    await button('Select destination: Amber star').click();
    await pose([0,0,1],true);
    await stage.locator('.uf-at-landmark').waitFor({state:'visible'});
    const coincident=await telemetry();assert.equal(coincident.coincident,true);assert.equal(coincident.guide,null);
    assert.equal(await finder.count(),0);assert.equal(await bearing.count(),0);assert.equal(await stage.locator('.uf-target-marker').count(),0,'A coincident landmark has no invented viewing direction');
    assert.match(await stage.locator('.uf-at-landmark').innerText(),/Amber star/);
    async function fits(name){
      const geometry=await stage.evaluate(node=>{
        const bounds=node.getBoundingClientRect();
        const boxes=[...node.querySelectorAll('.uf-target-bearing,.uf-target-finder')].map(child=>{const b=child.getBoundingClientRect();return {class:child.className,left:b.left,top:b.top,right:b.right,bottom:b.bottom};});
        return {stage:{left:bounds.left,top:bounds.top,right:bounds.right,bottom:bounds.bottom},boxes,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.equal(geometry.overflow,false,name+' has no document horizontal overflow');
      assert.equal(geometry.boxes.length,2,name+' shows a finder and edge pointer');
      for(const bounds of geometry.boxes){
        assert.ok(bounds.left>=geometry.stage.left-1&&bounds.right<=geometry.stage.right+1&&bounds.top>=geometry.stage.top-1&&bounds.bottom<=geometry.stage.bottom+1,name+' keeps '+bounds.class+' inside the scene');
      }
      await stage.screenshot({path:path.join(report,'target-guide-'+name+'.png')});return geometry;
    }
    await assertGuide({name:'desktop right',direction:[1,0,0],words:[/right/i]});
    const desktop=await fits('desktop');
    await button('Hide overlay').click();assert.equal(await finder.isVisible(),false);assert.equal(await bearing.isVisible(),false,'Clean view hides direction aids');
    await button('Show overlay').click();assert.equal(await finder.isVisible(),true);assert.equal(await bearing.isVisible(),true);
    await page.setViewportSize({width:320,height:800});await stage.scrollIntoViewIfNeeded();
    const phone=await fits('phone');
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    const accessibility=[];
    async function axeStage(name){
      const violations=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('.uf-stage'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});
      accessibility.push({name,violations});assert.deepEqual(violations,[],name+' stage passes scoped accessibility checks');
    }
    await axeStage('phone finder');
    await button('Toggle full screen for the 3D view').click();
    await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));
    const fullscreen=await fits('fullscreen-phone');await axeStage('fullscreen finder');
    await button('Flight controls').click();await page.locator('#uf-inview-controls').waitFor({state:'visible'});
    assert.equal(await finder.isVisible(),false);assert.equal(await bearing.isVisible(),false,'Flight controls suppress direction aids beneath the popover');
    await axeStage('fullscreen controls');
    await button('Close flight controls').click();assert.equal(await finder.isVisible(),true);assert.equal(await bearing.isVisible(),true);
    await button('Hide overlay').click();assert.equal(await finder.isVisible(),false);assert.equal(await bearing.isVisible(),false);
    await button('Show overlay').click();await finder.click();
    await page.waitForFunction(()=>window.__targetGuideTelemetry?.target?.inView===true);await axeStage('fullscreen centered');
    await button('Toggle full screen for the 3D view').click();await page.waitForFunction(()=>!document.fullscreenElement);
    // A short fullscreen still has to leave room for the lens and a paused route HUD.
    await page.setViewportSize({width:568,height:320});
    await button('Toggle full screen for the 3D view').click();
    await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));
    const landscape=[];
    for(const item of [
      {name:'right',direction:[1,0,0],words:[/right/i]},
      {name:'upper-right',direction:[1,1,0],words:[/(?:up|upper)/i,/right/i]},
      {name:'up',direction:[0,1,0],words:[/(?:up|upper)/i]},
      {name:'upper-left',direction:[-1,1,0],words:[/(?:up|upper)/i,/left/i]},
      {name:'left',direction:[-1,0,0],words:[/left/i]},
      {name:'lower-left',direction:[-1,-1,0],words:[/(?:down|lower)/i,/left/i]},
      {name:'down',direction:[0,-1,0],words:[/(?:down|lower)/i]},
      {name:'lower-right',direction:[1,-1,0],words:[/(?:down|lower)/i,/right/i]}
    ]){
      await pose(item.direction);
      await page.evaluate(()=>{
        const scene=window.__targetGuideScene;
        if(!scene.navigateTo('amber-star',1))throw new Error('The test approach could not start.');
        scene.set({running:false});scene.view('forward');
      });
      await page.waitForFunction(()=>window.__targetGuideTelemetry?.navigation?.active===true&&window.__targetGuideTelemetry?.running===false);
      await finder.waitFor({state:'visible'});
      const route=stage.locator('.uf-route-progress');await route.waitFor({state:'visible'});
      assert.match(await route.innerText(),/APPROACH PAUSED/,'The landscape route is active and paused');
      const guideText=await description.innerText();for(const word of item.words)assert.match(guideText,word,item.name+' supplies its off-screen direction beside an active route');
      const boxes=[];
      for(const [name,locator] of [['finder',finder],['lens',stage.locator('.uf-lens-controls')],['route HUD',route],['bearing',bearing]]){
        assert.equal(await locator.isVisible(),true,item.name+' exposes '+name);
        const bounds=await locator.boundingBox();assert.ok(bounds);boxes.push({name,...bounds});
      }
      const layout=await fits('fullscreen-landscape-'+item.name);
      for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
        const first=boxes[i],second=boxes[j];
        const overlapWidth=Math.min(first.x+first.width,second.x+second.width)-Math.max(first.x,second.x);
        const overlapHeight=Math.min(first.y+first.height,second.y+second.height)-Math.max(first.y,second.y);
        assert.ok(overlapWidth<=1||overlapHeight<=1,item.name+' keeps '+first.name+' clear of '+second.name+' in short fullscreen: '+JSON.stringify({first,second}));
      }
      const paused=await state();
      await page.waitForTimeout(150);assert.deepEqual(await state(),paused,'Inspecting the short-screen guide leaves the paused approach still');
      await axeStage('short fullscreen '+item.name+' approach');
      landscape.push({name:item.name,guideText,layout,boxes});
    }
    await page.evaluate(()=>window.__targetGuideScene.cancelNavigation());
    await button('Toggle full screen for the 3D view').click();await page.waitForFunction(()=>!document.fullscreenElement);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(report,'target-guide-check.json'),JSON.stringify({errors,accessibility,directions,rear,relativistic,comparison,coincident,desktop,phone,fullscreen,landscape,checks:['eight look directions','rear turn-around guidance','described angular separation','decorative edge pointer','finder preserves position and clocks','finder centers the displayed target','relativity and unshifted sky agreement','coincident destination status','320px fitting','fullscreen fitting','568px by 320px fullscreen paused approach with all eight bearings','finder, lens, route HUD, and bearing remain disjoint','clean overlay suppression','flight controls popover suppression','scoped stage accessibility']},null,2));
    console.log('Destination direction guide browser checks passed.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
