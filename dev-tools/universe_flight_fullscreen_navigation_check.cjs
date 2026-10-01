const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
const views={
  neighborhood:[
    {title:'The stellar sea',position:[0,0,0],fov:90,targetId:null},
    {title:'Beside the amber star',position:[-3.8,1.2,6.7],fov:70,targetId:'amber-star'}
  ],
  galaxy:[
    {title:'Spiral portrait',position:[0,0,-95000],fov:65,targetId:'galactic-center'},
    {title:'Above the arms',position:[0,60000,-105000],fov:60,targetId:'galactic-center'},
    {title:'Across the disk',position:[-68000,16000,5000],fov:80,targetId:'galactic-center'}
  ],
  cosmic:[
    {title:'Island universe',position:[0,0,-650000],fov:50,targetId:'near-galaxy'},
    {title:'The companion',position:[-480000,190000,650000],fov:50,targetId:'companion-galaxy'},
    {title:'Golden elliptical',position:[800000,550000,150000],fov:45,targetId:'golden-elliptical'},
    {title:'The wider web',position:[0,5000000,-15000000],fov:85,targetId:'near-galaxy'}
  ]
};
(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
    const errors=[],checks=[],accessibility=[],layouts=[],scenic=[],failures=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const original=value.create;
        value.create=function(canvas,options){
          const callback=options.onTelemetry;
          const created=original.call(this,canvas,Object.assign({},options,{onTelemetry(info){window.__fullscreenNavigationTelemetry=info;if(callback)callback(info);}}));
          window.__fullscreenNavigationScene=created;window.__fullscreenNavigationActions=[];
          for(const name of ['navigateTo','startOrbit','cancelNavigation','endOrbit','frameTarget','restore','selectTarget','capture']){
            const action=created[name];
            created[name]=function(...args){
              const before=created.snapshot(),beforeRunning=window.__fullscreenNavigationTelemetry?.running,result=action.apply(created,args),after=created.snapshot();
              window.__fullscreenNavigationActions.push({name,args,before,after,beforeRunning,afterRunning:window.__fullscreenNavigationTelemetry?.running,result:name==='capture'?{valid:!!result?.dataUrl,dataUrlLength:result?.dataUrl?.length}:result});
              if(window.__fullscreenNavigationActions.length>100)window.__fullscreenNavigationActions.shift();
              return result;
            };
          }
          return created;
        };
        api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__fullscreenNavigationScene);
    const stage=page.locator('.uf-stage'),panel=stage.locator('#uf-inview-controls'),body=panel.locator('#uf-inview-body');
    const button=name=>page.getByRole('button',{name,exact:true});
    const inButton=name=>panel.getByRole('button',{name,exact:true});
    const snapshot=()=>page.evaluate(()=>window.__fullscreenNavigationScene.snapshot());
    const info=()=>page.evaluate(()=>window.__fullscreenNavigationTelemetry);
    const nextDraw=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const physical=saved=>{const {yaw,pitch,...state}=saved.state;return state;};
    const lastAction=name=>page.evaluate(name=>window.__fullscreenNavigationActions.findLast(action=>action.name===name),name);
    async function section(name){
      const tab=panel.locator('#uf-inview-tab-'+name);
      if(await tab.getAttribute('aria-selected')!=='true')await tab.click();
      await panel.locator('#uf-inview-panel-'+name).waitFor({state:'visible'});
    }
    async function open(name='explore'){
      if(await panel.count()===0){
        await stage.getByRole('button',{name:'Flight controls',exact:true}).click();
        await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='tab'&&document.activeElement?.getAttribute('aria-selected')==='true');
      }
      await panel.waitFor({state:'visible'});
      assert.equal(await stage.locator('#uf-flight-controls-toggle').getAttribute('aria-expanded'),'true');
      await section(name);
    }
    async function close(){
      if(await panel.count()!==0)await inButton('Close flight controls').click();
      await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));
    }
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
    async function inspected(){
      await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls')&&document.activeElement===document.querySelector('.uf-stage canvas'));
      assert.equal(await page.evaluate(()=>document.fullscreenElement===document.querySelector('.uf-stage')),true,'Navigation actions keep fullscreen active');
    }
    async function paused(){
      await page.waitForFunction(()=>window.__fullscreenNavigationTelemetry?.running===false);
      const saved=await snapshot();await page.waitForTimeout(120);assert.deepEqual(await snapshot(),saved,'A paused inspection remains still');return saved;
    }
    async function range(selector,value){
      await open('travel');
      await page.locator(selector).evaluate((node,value)=>{
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));
        node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));
      },value);await nextDraw();
    }
    // Exact navigation selectors are finalized with the shared in-view component.
    const selectors={mode:'#uf-inview-mode',region:'#uf-inview-region',target:'#uf-inview-destination'};
    const target=()=>panel.locator(selectors.target);
    const region=()=>panel.locator(selectors.region);
    const mode=()=>panel.locator(selectors.mode);
    async function selectRegion(value){
      await open();await region().selectOption(value);
      await page.waitForFunction(value=>window.__fullscreenNavigationScene.snapshot().settings.region===value,value);
      await nextDraw();assert.equal(await panel.count(),1,'Changing scale keeps navigation controls open');
      assert.equal(await page.locator('#uf-region').inputValue(),value,'Fullscreen scale synchronizes its main selector');
      assert.equal((await info()).running,false);return paused();
    }
    async function selectTarget(id){
      await open();await target().selectOption(id);
      await page.waitForFunction(id=>window.__fullscreenNavigationScene.snapshot().targetId===(id||null),id);
      await nextDraw();assert.equal(await panel.count(),1,'Changing destination keeps navigation controls open');
      return paused();
    }
    async function selectMode(value){
      await open();await mode().selectOption(value);
      await page.waitForFunction(value=>window.__fullscreenNavigationScene.snapshot().settings.mode===value,value);
      await nextDraw();assert.equal(await panel.count(),1,'Changing mode keeps navigation controls open');
      return paused();
    }
    async function selectVista(regionName,title){
      await open();
      const index=views[regionName].findIndex(view=>view.title===title);
      assert.ok(index>=0,'The requested scenic test view exists');
      await panel.locator('#uf-inview-vista').selectOption(String(index));await inspected();
    }
    async function saveImage(expectedRunning){
      await open('compose');const regionName=(await snapshot()).settings.region;
      const event=page.waitForEvent('download');await inButton('Save image').click();
      const download=await event;await inspected();
      assert.match(download.suggestedFilename(),new RegExp('^universe-generated-'+regionName+'-.*\\.png$'));
      const bytes=fs.readFileSync(await download.path());assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      assert.ok(bytes.length>1000,'The exported scene is a nonempty PNG');
      const action=await lastAction('capture');assert.equal(action.result.valid,true);
      assert.deepEqual(action.after,action.before,'Fullscreen export changes neither geometry nor clocks');
      assert.equal(action.beforeRunning,expectedRunning);assert.equal(action.afterRunning,expectedRunning,'Fullscreen export retains the travel state');
      return {name:download.suggestedFilename(),bytes:bytes.length,action};
    }
    async function visibleFailure(name){
      await nextDraw();
      await page.waitForFunction(()=>{
        const notice=document.querySelector('#uf-inview-notice'),panel=document.querySelector('#uf-inview-controls');
        if(!notice||!panel)return false;
        const bounds=notice.getBoundingClientRect(),clip=panel.getBoundingClientRect();
        return bounds.top>=clip.top-1&&bounds.bottom<=clip.bottom+1;
      });
      const details=await panel.locator('#uf-inview-notice').evaluate(node=>{
        const bounds=node.getBoundingClientRect(),clip=node.closest('#uf-inview-controls').getBoundingClientRect();
        return {text:node.textContent,notice:{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom},panel:{left:clip.left,right:clip.right,top:clip.top,bottom:clip.bottom}};
      });
      assert.ok(details.text.trim().length>0);
      assert.ok(details.notice.left>=details.panel.left-1&&details.notice.right<=details.panel.right+1,name+' explanation stays within panel width');
      await page.waitForTimeout(150); // Let Chromium finish painting the scroll before visual QA.
      await stage.screenshot({path:path.join(report,'fullscreen-navigation-failure-'+name.replaceAll(' ','-')+'.png')});
      failures.push({name,...details});
    }
    async function catalog(regionName){
      const expected=await page.evaluate(regionName=>window.UniverseFlight.landmarks(regionName).map(item=>({value:item.id,label:item.name})),regionName);
      const actual=await target().locator('option').evaluateAll(options=>options.filter(option=>option.value).map(option=>({value:option.value,label:option.textContent})));
      assert.deepEqual(actual,expected,regionName+' selector matches its destination catalog');return expected;
    }
    async function axePanel(name){
      const violations=await stage.evaluate(async node=>{
        const result=await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
        return result.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}));
      });
      accessibility.push({name,violations});assert.deepEqual(violations,[],name+' passes scoped stage accessibility checks');
    }
    async function layout(name){
      const bounds=await panel.boundingBox(),viewport=page.viewportSize();
      assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,name+' panel fits within fullscreen');
      await section('explore');
      const dimensions=await body.evaluate(node=>({width:node.clientWidth,scrollWidth:node.scrollWidth,height:node.clientHeight,scrollHeight:node.scrollHeight}));
      assert.ok(dimensions.scrollWidth<=dimensions.width+1,name+' panel has no horizontal overflow');
      for(const selector of [selectors.mode,selectors.region,selectors.target]){
        const control=panel.locator(selector);
        if(await control.count()===0)continue;
        await control.scrollIntoViewIfNeeded();
        const box=await control.boundingBox();
        assert.ok(box&&box.x>=bounds.x-1&&box.x+box.width<=bounds.x+bounds.width+1,name+' contains '+selector);
        assert.ok(box.height>=40,name+' provides a usable '+selector);
      }
      await body.evaluate(node=>{node.scrollTop=0;});
      await stage.screenshot({path:path.join(report,'fullscreen-navigation-'+name+'.png')});
      await panel.locator(selectors.target).scrollIntoViewIfNeeded();
      await stage.screenshot({path:path.join(report,'fullscreen-navigation-'+name+'-destinations.png')});
      await body.evaluate(node=>{node.scrollTop=0;});
      const result={name,viewport,bounds,dimensions};layouts.push(result);return result;
    }
    await enter();await open();
    const initial=await snapshot();
    assert.equal(await mode().inputValue(),'explore');assert.equal(await region().inputValue(),'neighborhood');
    const neighborhood=await catalog('neighborhood');
    await selectTarget(neighborhood[0].value);
    assert.deepEqual((await snapshot()).state,initial.state,'Selecting a destination changes neither position nor gaze');
    assert.match(await panel.innerText(),/Amber star/);
    await inButton('Center on destination').click();await inspected();
    const centered=await info();assert.equal(centered.running,false);
    assert.ok(Math.abs(centered.target.screen[0]-.5)<1e-7&&Math.abs(centered.target.screen[1]-.5)<1e-7);
    assert.deepEqual(physical(await snapshot()),physical(initial),'Centering preserves position and clocks');
    checks.push('fullscreen mode, scale, and destination selectors','catalog matches generated landmarks','paused destination selection preserves camera','center action closes panel and focuses canvas');
    await open();const beforePlan=await snapshot();
    await panel.locator('#uf-inview-arrival').selectOption('2');
    assert.equal(await page.locator('#uf-arrival-distance').inputValue(),'2','Fullscreen viewing distance synchronizes the approach planner');
    await inButton('Match pace to this trip').click();
    assert.equal(await panel.count(),1,'Matching the pace keeps planning controls open');
    assert.deepEqual((await snapshot()).state,beforePlan.state,'Planning adjusts only pace');
    assert.equal(Number(await panel.locator('#uf-inview-speed').inputValue()),Number(await page.locator('#uf-speed').inputValue()),'Matched pace synchronizes both sliders');
    await panel.locator('#uf-inview-arrival').selectOption('1');
    const pausedExport=await saveImage(false);
    checks.push('fullscreen viewing distance shares approach state','pace matching remains paused and synchronized','fullscreen PNG export preserves paused geometry and clocks');
    await open();await range('#uf-inview-speed',60);
    await inButton('Start travel').click();await page.waitForFunction(()=>window.__fullscreenNavigationTelemetry?.running===true);
    const runningExport=await saveImage(true);
    await selectTarget(neighborhood[1].value);assert.equal((await info()).navigation.active,false);assert.equal((await info()).orbit.active,false);
    checks.push('running fullscreen PNG export retains travel','destination selection pauses free travel');
    await inButton('Fly to destination').click();await inspected();
    await page.waitForFunction(()=>window.__fullscreenNavigationTelemetry?.navigation?.active===true&&window.__fullscreenNavigationTelemetry?.running===true);
    const startedApproach=await lastAction('navigateTo');assert.equal(startedApproach.result,true);
    assert.deepEqual(physical(startedApproach.after),physical(startedApproach.before),'Starting an approach does not teleport the camera');
    await open();assert.match(await panel.innerText(),/End guided approach/);
    await inButton('End guided approach').click();await inspected();await paused();
    assert.equal((await info()).navigation.active,false);
    await open();await inButton('Fly to destination').click();await inspected();
    await page.waitForFunction(()=>window.__fullscreenNavigationTelemetry?.navigation?.active===true);
    await selectTarget(neighborhood[0].value);
    assert.equal((await info()).navigation.active,false,'Selecting another landmark clears the previous guided route');
    checks.push('fullscreen approach starts without translation','ending approach pauses and returns to scene','destination changes clear mismatched routes');
    await inButton('Orbit destination').click();await inspected();
    await page.waitForFunction(()=>window.__fullscreenNavigationTelemetry?.orbit?.active===true&&window.__fullscreenNavigationTelemetry?.running===true);
    const orbitStart=await lastAction('startOrbit');assert.equal(orbitStart.result,true);
    assert.deepEqual(physical(orbitStart.after),physical(orbitStart.before),'Starting an orbit preserves the current position and clocks');
    await open();await inButton('End orbit').click();await inspected();await paused();
    assert.equal((await info()).orbit.active,false);
    await open();await inButton('Orbit destination').click();await inspected();
    await page.waitForFunction(()=>window.__fullscreenNavigationTelemetry?.orbit?.active===true);
    await selectTarget(neighborhood[1].value);assert.equal((await info()).orbit.active,false);
    checks.push('fullscreen orbit starts without translation','ending orbit pauses and returns to scene','destination changes end mismatched orbits');
    await page.evaluate(()=>{
      const scene=window.__fullscreenNavigationScene,saved=scene.snapshot(),landmark=window.UniverseFlight.landmarks('neighborhood').find(item=>item.id==='blue-star');
      saved.state.position=landmark.position.slice();saved.targetId=landmark.id;
      if(!scene.restore(saved))throw new Error('The coincident navigation test pose was rejected.');
    });await nextDraw();
    assert.equal(await inButton('Center on destination').isDisabled(),true,'A coincident destination has no centering direction');
    const atLandmark=await snapshot();await inButton('Orbit destination').click();
    assert.equal(await panel.count(),1,'An unavailable orbit keeps its explanation visible in the panel');
    assert.deepEqual(await snapshot(),atLandmark,'A rejected orbit changes no camera state');
    await visibleFailure('coincident orbit');
    await inButton('Fly to destination').click();
    assert.equal(await panel.count(),1,'An already-within-range approach keeps the controls open');
    assert.deepEqual(await snapshot(),atLandmark,'An already-within-range approach changes no camera state');
    assert.equal((await info()).running,false);
    await visibleFailure('already-within-range approach');
    checks.push('coincident destination disables centering','rejected orbit retains panel and camera','already-within-range approach retains panel and camera');
    for(const regionName of ['neighborhood','galaxy','cosmic']){
      const previousRegion=(await snapshot()).settings.region;
      await selectRegion(regionName);await catalog(regionName);
      if(previousRegion!==regionName)assert.equal((await snapshot()).targetId,null,'Changing scale clears the previous scene destination');
      for(const view of views[regionName]){
        await selectVista(regionName,view.title);
        const saved=await paused(),telemetry=await info();
        assert.deepEqual(saved.state.position,view.position,view.title+' restores its scenic camera position');
        assert.equal(saved.settings.fov,view.fov);assert.equal(saved.settings.region,regionName);assert.equal(saved.settings.mode,'explore');
        assert.equal(saved.targetId,view.targetId);
        assert.equal(saved.state.distanceLy,0);assert.equal(saved.state.universeYears,0);assert.equal(saved.state.travelerYears,0);
        assert.equal(telemetry.navigation.active,false);assert.equal(telemetry.orbit.active,false);
        scenic.push({region:regionName,title:view.title,snapshot:saved});
      }
    }
    checks.push('all three fullscreen scene scales','nine scenic viewpoints stay fullscreen','scenic jumps restore exact positions and lens','scenic jumps reset counters and clear motion');
    await open();const pausedBeforeMode=await snapshot();await selectMode('relativity');
    assert.equal((await snapshot()).settings.region,'neighborhood','The light chase uses its fixed neighborhood scene');
    assert.equal(await region().count(),0,'Relativity omits the exploration scale selector');
    await catalog('neighborhood');await selectTarget('amber-star');
    assert.equal(await inButton('Fly to destination').count(),0);assert.equal(await inButton('Orbit destination').count(),0,'Relativity omits nonphysical travel actions');
    await range('#uf-inview-beta',.9);await panel.locator('#uf-inview-time').selectOption('10');
    assert.equal(Number(await page.locator('#uf-beta').inputValue()),.9);assert.equal(await page.locator('#uf-time').inputValue(),'10');
    await section('explore');await inButton('Center on destination').click();await inspected();
    assert.ok(Math.abs((await info()).target.screen[0]-.5)<1e-7);
    await open('travel');await inButton('Unshifted sky comparison').click();
    assert.equal((await snapshot()).settings.compareRest,true);
    assert.equal(await page.locator('.uf-controls .uf-compare').getAttribute('aria-pressed'),'true');
    const physicalBefore=await snapshot();await section('explore');await inButton('Center on destination').click();await inspected();
    assert.deepEqual(physical(await snapshot()),physical(physicalBefore));
    assert.ok(Math.abs((await info()).target.screen[0]-.5)<1e-7&&Math.abs((await info()).target.screen[1]-.5)<1e-7);
    await open();await selectMode('explore');
    assert.equal((await snapshot()).settings.region,pausedBeforeMode.settings.region,'Returning to exploration retains its selected scale');
    checks.push('fullscreen mode switching pauses and resets scene','relativity has fixed scene and safe action set','fullscreen beta and time controls remain synchronized','center follows relativistic and unshifted skies','exploration scale restored after light chase');
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    await layout('desktop');await axePanel('desktop navigation controls');
    await close();await stage.getByRole('button',{name:'Hide overlay',exact:true}).click();await open();
    assert.equal(await region().isVisible(),true,'Navigation stays reachable in clean view');
    await selectRegion('neighborhood');await selectTarget('amber-star');
    await axePanel('clean fullscreen navigation');await close();
    await stage.getByRole('button',{name:'Show overlay',exact:true}).click();
    await exit();await page.setViewportSize({width:320,height:800});await enter();await open();
    await layout('phone');await axePanel('320px fullscreen navigation');
    await selectTarget('blue-star');await inButton('Center on destination').click();await inspected();await paused();
    await stage.screenshot({path:path.join(report,'fullscreen-navigation-phone-centered.png')});
    await open();await mode().focus();await mode().press('ArrowDown');await mode().press('Enter');
    await page.waitForFunction(()=>window.__fullscreenNavigationScene.snapshot().settings.mode==='relativity');
    await catalog('neighborhood');await axePanel('320px relativity navigation');
    await selectMode('explore');await selectRegion('galaxy');
    await selectVista('galaxy','Above the arms');
    assert.deepEqual((await snapshot()).state.position,[0,60000,-105000]);
    await exit();await page.setViewportSize({width:568,height:320});await enter();await open();
    await layout('landscape');await axePanel('568x320 navigation controls');
    const landscapeDimensions=await body.evaluate(node=>({height:node.clientHeight,scrollHeight:node.scrollHeight}));
    assert.ok(landscapeDimensions.scrollHeight>landscapeDimensions.height,'Short landscape supports scrollable navigation controls');
    await selectRegion('cosmic');await selectTarget('golden-elliptical');await inButton('Center on destination').click();await inspected();await paused();
    await selectVista('cosmic','The companion');
    assert.deepEqual((await snapshot()).state.position,[-480000,190000,650000]);
    await stage.screenshot({path:path.join(report,'fullscreen-navigation-landscape-vista.png')});
    await open();await selectMode('relativity');await layout('landscape-relativity');await axePanel('568x320 relativity navigation');
    await exit();
    checks.push('clean view retains navigation','320px selectors and center action','native selector keyboard changes mode','320px scenic action is reachable','568x320 navigation scrolls without overflow','568x320 destination and scenic actions are reachable','mode changes keep fullscreen active','scoped fullscreen accessibility');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(report,'fullscreen-navigation-check.json'),JSON.stringify({errors,checks,accessibility,layouts,scenic,exports:[pausedExport,runningExport],failures},null,2));
    console.log('Fullscreen navigation checks passed: '+checks.length+' groups, '+accessibility.length+' scoped accessibility checks.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
