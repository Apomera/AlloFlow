const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
const scenes={neighborhood:{boundary:100000,initial:[0,0,0]},galaxy:{boundary:3000000,initial:[0,0,-95000]},cosmic:{boundary:120000000,initial:[0,0,-2200000]}};

(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
    const checks=[],errors=[],accessibility=[],layouts=[],events=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const create=value.create;
        value.create=function(canvas,options){
          const onTelemetry=options.onTelemetry,onPause=options.onPause;
          const scene=create.call(this,canvas,Object.assign({},options,{
            onTelemetry(info){window.__journeyInfo=info;if(onTelemetry)onTelemetry(info);},
            onPause(message,detail){
              window.__journeyPauses=window.__journeyPauses||[];
              window.__journeyPauses.push({message,detail:detail?JSON.parse(JSON.stringify(detail)):null,focusId:document.activeElement?.id,focusClass:document.activeElement?.className});
              if(onPause)onPause(message,detail);
            }
          }));
          window.__journeyScene=scene;return scene;
        };api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__journeyScene);
    await page.evaluate(()=>{
      const create=React.createElement;
      React.createElement=function(component,props,...children){
        if(component?.name==='UniverseFlightExplorer')window.__journeyHost=props;
        if(component?.name==='UniverseFlightInViewControls')window.__journeyControls=props;
        return create.call(this,component,props,...children);
      };
    });
    const button=name=>page.getByRole('button',{name,exact:true});
    await button('Close flight explorer').click();await button('Open 3D flight').click();
    await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false&&window.__journeyHost);
    const stage=page.locator('.uf-stage'),canvas=stage.locator('canvas'),panel=stage.locator('#uf-inview-controls'),body=panel.locator('#uf-inview-body');
    const card=stage.locator('#uf-stage-journey'),inline=panel.locator('#uf-inview-journey');
    const inButton=name=>panel.getByRole('button',{name,exact:true});
    const snapshot=()=>page.evaluate(()=>window.__journeyScene.snapshot());
    const info=()=>page.evaluate(()=>window.__journeyInfo);
    const nextDraw=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const pauseCount=()=>page.evaluate(()=>(window.__journeyPauses||[]).filter(event=>event.detail).length);
    const lastEvent=()=>page.evaluate(()=>(window.__journeyPauses||[]).filter(event=>event.detail).at(-1));
    const invariant=saved=>({position:saved.state.position,distanceLy:saved.state.distanceLy,universeYears:saved.state.universeYears,travelerYears:saved.state.travelerYears,settings:saved.settings,targetId:saved.targetId});
    async function enter(){await button('Toggle full screen for the 3D view').click();await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));}
    async function exit(){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);}
    async function section(name){await panel.locator('#uf-inview-tab-'+name).click();await panel.locator('#uf-inview-panel-'+name).waitFor({state:'visible'});await nextDraw();}
    async function open(name='explore'){
      if(await panel.count()===0){await stage.getByRole('button',{name:'Flight controls',exact:true}).click();await panel.waitFor({state:'visible'});}
      await section(name);
    }
    async function close(){await inButton('Close flight controls').click();await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));}
    async function focusedCanvas(){await page.waitForFunction(()=>document.activeElement===document.querySelector('.uf-stage canvas'));}
    async function noCheckpoint(){await page.waitForFunction(()=>!document.querySelector('#uf-stage-journey')&&!document.querySelector('#uf-inview-journey'));}
    async function paused(){await page.waitForFunction(()=>window.__journeyInfo?.running===false);const frozen=await snapshot();await page.waitForTimeout(140);assert.deepEqual(await snapshot(),frozen,'The stopped camera and clocks remain still');return frozen;}
    async function range(selector,value){await panel.locator(selector).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);await nextDraw();}
    async function mode(value){await open('explore');await panel.locator('#uf-inview-mode').selectOption(value);await page.waitForFunction(value=>window.__journeyScene.snapshot().settings.mode===value,value);await nextDraw();}
    async function region(value){await open('explore');await panel.locator('#uf-inview-region').selectOption(value);await page.waitForFunction(value=>window.__journeyScene.snapshot().settings.region===value,value);await nextDraw();}
    async function target(value){await open('explore');await panel.locator('#uf-inview-destination').selectOption(value);await page.waitForFunction(value=>window.__journeyScene.snapshot().targetId===(value||null),value);await nextDraw();}
    async function directPace(level=100){await open('travel');await range('#uf-inview-speed',level);const smooth=panel.locator('.uf-motion-toggle');if(await smooth.getAttribute('aria-pressed')!=='false')await smooth.click();await nextDraw();}
    async function fixture(position,yaw=0,pitch=0){
      await page.evaluate(({position,yaw,pitch})=>{const scene=window.__journeyScene,saved=scene.snapshot();Object.assign(saved.state,{position,yaw,pitch,distanceLy:17,universeYears:23,travelerYears:19});if(!scene.restore(saved))throw new Error('Journey fixture rejected');},{position,yaw,pitch});await nextDraw();
    }
    async function eventSince(count,kind){
      await page.waitForFunction(({count,kind})=>(window.__journeyPauses||[]).filter(event=>event.detail).length>count&&window.__journeyPauses.filter(event=>event.detail).at(-1).detail.kind===kind,{count,kind});
      const event=await lastEvent(),frozen=await paused();
      assert.equal((await info()).motion.paceLyPerSecond,0,'Automatic stops remove all free-flight momentum');
      assert.deepEqual(event.detail.position,frozen.state.position,'Checkpoint refers to the actual stopped position');
      assert.equal(await pauseCount(),count+1,'A genuine stop emits one structured event');events.push(event);return {event,frozen};
    }
    async function boundary(sceneName='neighborhood',physical=false,{keepControls=false,overlay=null,removeOverlay=false}={}){
      await mode(physical?'relativity':'explore');
      if(!physical)await region(sceneName);
      if(physical){await open('travel');await range('#uf-inview-beta',.9);await panel.locator('#uf-inview-time').selectOption('10');}
      else await directPace();
      if(overlay==='finder')await target('amber-star');else await target('');
      const edge=scenes[sceneName].boundary,gap=physical?2:overlay||keepControls?20:.2;
      await fixture([0,0,edge-gap]);const before=await pauseCount();
      if(keepControls){
        await section('travel');await inButton('Start travel').click();await panel.locator(physical?'#uf-inview-beta':'#uf-inview-speed').focus();
      }else{
        await close();await stage.locator('.uf-fs-play').click();
        if(overlay==='lens')await stage.getByRole('button',{name:'Narrow view',exact:true}).focus();
        else if(overlay==='finder')await stage.locator('.uf-target-finder').focus();
        else await canvas.focus();
      }
      const result=await eventSince(before,'boundary');
      assert.equal(result.event.detail.region,sceneName);assert.equal(result.event.detail.mode,physical?'relativity':'explore');
      assert.ok(Math.abs(Math.hypot(...result.frozen.state.position)-edge)<=edge*1e-9,'Travel stops at the finite edge in '+sceneName);
      if(overlay){
        assert.equal(await card.count(),0,'The card defers while an external '+overlay+' control owns focus');
        const selected=overlay==='lens'?stage.getByRole('button',{name:'Narrow view',exact:true}):stage.locator('.uf-target-finder');
        assert.equal(await selected.isVisible(),true,'The focused external control remains visible');
        assert.equal(await selected.evaluate(node=>node===document.activeElement),true,'The boundary does not steal '+overlay+' focus');
        if(removeOverlay){
          await selected.press('Enter');await page.waitForFunction(()=>!document.querySelector('.uf-target-finder'));
          assert.deepEqual(invariant(await snapshot()),invariant(result.frozen),'Replacing a focused finder changes only orientation');
          assert.equal(await page.evaluate(()=>document.activeElement===document.body),true,'Removing a focused finder does not programmatically move focus');
        }else await canvas.focus();
      }
      await (keepControls?inline:card).waitFor({state:'visible'});
      return result;
    }
    async function arrival({keepControls=false,marker=false,multiplier=1,vertical=false}={}){
      await mode('explore');await region('neighborhood');await directPace(70);await target('amber-star');
      await panel.locator('#uf-inview-arrival').selectOption(String(multiplier));
      const targetItem=await page.evaluate(()=>UniverseFlight.landmarks('neighborhood')[0]),radius=targetItem.arrivalRadiusLy*multiplier;
      await fixture(vertical?[targetItem.position[0],targetItem.position[1]-radius-.8,targetItem.position[2]]:[targetItem.position[0],targetItem.position[1],targetItem.position[2]-radius-.8],0,vertical?Math.PI/2-.01:0);
      const before=await pauseCount();await inButton('Fly to destination').click();await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));
      if(keepControls){await open('travel');await panel.locator('#uf-inview-speed').focus();}
      else if(marker){await stage.locator('.uf-target-marker').focus();}
      else await canvas.focus();
      const result=await eventSince(before,'arrival');
      assert.equal(result.event.detail.targetId,'amber-star');assert.equal(result.event.detail.targetName,'Amber star');assert.equal(result.event.detail.arrivalRadiusLy,radius);
      assert.equal((await info()).navigation.completed,true,'Only a genuine completed approach produces arrival context');
      assert.ok(Math.abs(Math.hypot(...result.frozen.state.position.map((value,index)=>value-targetItem.position[index]))-radius)<1e-9,'The route ends at the chosen survey radius');
      assert.ok(result.frozen.state.distanceLy>17,'The approach traveled before arrival');
      if(marker){assert.equal(await card.count(),0);assert.equal(await stage.locator('.uf-target-marker').isVisible(),true);assert.equal(await stage.locator('.uf-target-marker').evaluate(node=>node===document.activeElement),true);await canvas.focus();}
      await (keepControls?inline:card).waitFor({state:'visible'});return result;
    }
    async function singleAnnouncement(){assert.equal(await page.locator('#uf-journey-announcement').count(),1);assert.equal(await page.locator('#uf-journey-announcement').getAttribute('role'),'status');assert.ok((await page.locator('#uf-journey-announcement').innerText()).trim());}
    async function assertSuppressed(){for(const selector of ['.uf-lens-controls','.uf-target-marker','.uf-target-finder','.uf-target-bearing'])assert.equal(await stage.locator(selector).isVisible(),false,'The visible card suppresses overlapping '+selector);assert.equal(await stage.locator('.uf-fs-play').isVisible(),true);assert.equal(await stage.locator('.uf-fullscreen').isVisible(),true);assert.equal(await stage.locator('#uf-flight-controls-toggle').isVisible(),true);}
    async function axeScope(name){const violations=await stage.evaluate(async node=>{const result=await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}));});accessibility.push({name,violations});assert.deepEqual(violations,[],name+' has no scoped accessibility violations');}
    async function layout(name,external=true){
      const shell=external?card:panel,scroll=external?card.locator('#uf-stage-journey-body'):body,viewport=page.viewportSize();
      const box=await shell.boundingBox(),clip=await scroll.boundingBox(),dismiss=shell.getByRole('button',{name:'Dismiss checkpoint',exact:true});
      assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,name+' shell fits fullscreen');
      assert.ok(clip&&clip.height>=80,name+' body provides usable reading space');assert.equal(await scroll.evaluate(node=>getComputedStyle(node).overflowY),'auto');
      assert.ok(await scroll.evaluate(node=>node.scrollWidth<=node.clientWidth+1),name+' has no horizontal body overflow');
      if(external){
        const heading=await card.locator('#uf-stage-journey-title').boundingBox(),fixedDismiss=await dismiss.boundingBox();
        assert.ok(fixedDismiss.width>=40&&fixedDismiss.height>=40,'Dismiss remains a usable touch target');
        assert.ok(fixedDismiss.y>=box.y&&fixedDismiss.y+fixedDismiss.height<=clip.y+1,'Dismiss sits in the fixed header');
        await scroll.evaluate(node=>{node.scrollTop=node.scrollHeight;});
        assert.equal((await card.locator('#uf-stage-journey-title').boundingBox()).y,heading.y,'Body scrolling keeps the checkpoint heading fixed');
        assert.equal((await dismiss.boundingBox()).y,fixedDismiss.y,'Body scrolling keeps Dismiss fixed');assert.equal(await card.evaluate(node=>node.scrollTop),0);
        for(const control of await card.locator('.uf-journey-actions button').all()){
          await control.scrollIntoViewIfNeeded();const action=await control.boundingBox();
          assert.ok(action.x>=clip.x-1&&action.x+action.width<=clip.x+clip.width+1,'Each checkpoint action fits horizontally');
          assert.ok(action.y>=clip.y-1&&action.y+action.height<=clip.y+clip.height+1,'Each complete checkpoint action can be reached by scrolling');assert.ok(action.height>=40);
          assert.equal(await card.evaluate(node=>node.scrollTop),0,'Action scrolling does not move the fixed shell');
        }
        await scroll.evaluate(node=>{node.scrollTop=0;});
        if(viewport.width===568&&viewport.height===320){assert.ok(Math.abs(box.height-164)<=1,'Compact checkpoint uses the established 164px shell');assert.ok(clip.height>=93,'Compact checkpoint retains at least the established 94px body');}
      }else{
        await inline.scrollIntoViewIfNeeded();assert.equal(await panel.evaluate(node=>node.scrollTop),0);await dismiss.scrollIntoViewIfNeeded();
        const tabs=await panel.getByRole('tab').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top)),closeBox=await inButton('Close flight controls').boundingBox();
        await scroll.evaluate(node=>{node.scrollTop=node.scrollHeight;});assert.deepEqual(await panel.getByRole('tab').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top)),tabs);assert.equal((await inButton('Close flight controls').boundingBox()).y,closeBox.y);
      }
      await page.waitForTimeout(100);await stage.screenshot({path:path.join(report,'journey-'+name+'.png')});
      layouts.push({name,viewport,shell:box,body:clip,scroll:await scroll.evaluate(node=>({client:node.clientHeight,height:node.scrollHeight}))});await axeScope(name);
    }
    function centerAngle(saved){
      const {position,yaw,pitch}=saved.state,distance=Math.hypot(...position),n=position.map(value=>-value/distance),beta=saved.settings.mode==='relativity'&&!saved.settings.compareRest?saved.settings.beta:0,gamma=1/Math.sqrt(1-beta*beta),denominator=1+beta*n[2],a=[n[0]/gamma/denominator,n[1]/gamma/denominator,(n[2]+beta)/denominator];
      const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),x=a[0]*cy-a[2]*sy,y=-a[0]*sy*sp+a[1]*cp-a[2]*cy*sp,z=a[0]*sy*cp+a[1]*sp+a[2]*cy*cp;return Math.atan2(Math.hypot(x,y),z);
    }
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});await enter();
    for(const sceneName of Object.keys(scenes)){
      const {frozen}=await boundary(sceneName);await singleAnnouncement();assert.equal(await canvas.evaluate(node=>node===document.activeElement),true,'Boundary event preserves canvas focus');await assertSuppressed();
      await card.getByRole('button',{name:'Look toward scene center',exact:true}).click();await noCheckpoint();await focusedCanvas();
      const faced=await paused();assert.deepEqual(invariant(faced),invariant(frozen),'Looking back preserves position, counters, selected target, and display');assert.ok(centerAngle(faced)<1e-10,'Free-flight center action faces the radial scene center');
      checks.push(sceneName+' real boundary pauses once at finite limit',sceneName+' center inspection preserves position and clocks');
    }
    const physical=await boundary('neighborhood',true);await singleAnnouncement();assert.match(await card.innerText(),/fixed travel direction/i);
    await card.getByRole('button',{name:'Look toward scene center',exact:true}).click();await noCheckpoint();await focusedCanvas();
    const physicalFacing=await paused();assert.deepEqual(invariant(physicalFacing),invariant(physical.frozen));assert.ok(centerAngle(physicalFacing)<1e-10);
    // Move inward from the edge through a valid pose, keep the look-back orientation, and use real UI resume.
    await fixture([0,0,99900],physicalFacing.state.yaw,physicalFacing.state.pitch);const directionBefore=await snapshot();await stage.locator('.uf-fs-play').click();await page.waitForFunction(z=>window.__journeyScene.snapshot().state.position[2]>z,directionBefore.state.position[2]);await stage.locator('.uf-fs-play').click();const directionAfter=await paused();
    assert.equal(directionAfter.state.position[0],directionBefore.state.position[0]);assert.equal(directionAfter.state.position[1],directionBefore.state.position[1]);assert.ok(directionAfter.state.position[2]>directionBefore.state.position[2],'The light chase still travels along physical +Z while looking back');
    checks.push('physical boundary explains fixed travel heading','physical center inspection preserves aberration and clocks','look-back resume keeps physical +Z motion');
    await boundary('neighborhood',true);const physicalPreferences=(await snapshot()).settings;await card.getByRole('button',{name:'Reset scene position and counters',exact:true}).click();await noCheckpoint();await focusedCanvas();
    const freshPhysical=await paused();assert.deepEqual(freshPhysical.state,{position:[0,0,0],yaw:0,pitch:0,distanceLy:0,universeYears:0,travelerYears:0});assert.deepEqual(freshPhysical.settings,physicalPreferences);checks.push('physical checkpoint reset starts fresh while retaining optical preferences');
    const focusedBoundary=await boundary('neighborhood',false,{keepControls:true});assert.equal(await panel.locator('#uf-inview-speed').evaluate(node=>node===document.activeElement),true,'Inline checkpoint does not steal a native range focus');assert.equal(await card.count(),0);await singleAnnouncement();
    await inline.getByRole('button',{name:'Dismiss checkpoint',exact:true}).click();await noCheckpoint();assert.equal(await panel.locator('#uf-inview-tab-travel').evaluate(node=>node===document.activeElement),true,'Inline Dismiss returns focus to the active tab');assert.deepEqual(await snapshot(),focusedBoundary.frozen);
    checks.push('inline boundary retains native range focus and single announcement','inline Dismiss preserves state and focuses selected tab');
    for(const overlay of ['lens','finder']){const stopped=await boundary('neighborhood',false,{overlay});await card.getByRole('button',{name:'Dismiss checkpoint',exact:true}).click();await focusedCanvas();assert.deepEqual(await snapshot(),stopped.frozen);checks.push('boundary defers external checkpoint while '+overlay+' retains focus');}
    await boundary('neighborhood',false,{overlay:'finder',removeOverlay:true});await card.getByRole('button',{name:'Dismiss checkpoint',exact:true}).click();await focusedCanvas();checks.push('removed focused finder releases deferred checkpoint without stealing focus');
    const arrived=await arrival({multiplier:4});await singleAnnouncement();assert.equal(await card.locator('#uf-stage-journey-title').innerText(),'Arrived at Amber star');assert.match(await card.innerText(),/2.4 ly/);await assertSuppressed();await layout('desktop-arrival');
    await canvas.press('ArrowLeft');const looked=await snapshot();assert.deepEqual(invariant(looked),invariant(arrived.frozen));assert.equal(await card.isVisible(),true,'Manual look preserves useful arrival context');await canvas.press('+');assert.equal(await card.isVisible(),true,'Native lens changes preserve arrival context');
    const contextBefore=await lastEvent();await open('compose');assert.equal(await card.count(),0);await inline.waitFor({state:'visible'});await range('#uf-inview-fov',53);await range('#uf-inview-exposure',1.35);await panel.locator('#uf-inview-quality').selectOption('low');await close();await card.waitFor({state:'visible'});assert.deepEqual((await lastEvent()).detail,contextBefore.detail);
    await exit();assert.equal(await card.count(),0);await enter();await card.waitFor({state:'visible'});assert.deepEqual((await lastEvent()).detail,contextBefore.detail);await singleAnnouncement();
    checks.push('true arrival captures chosen wide viewing radius','arrival exposes inspect orbit save and exploration actions','manual look and lens edits retain arrival context','controls transfer one checkpoint into their scroll body','fullscreen exit and reentry retain stopped context');
    const beforeInspect=await snapshot();await card.getByRole('button',{name:'Inspect destination',exact:true}).click();await noCheckpoint();await focusedCanvas();assert.deepEqual(invariant(await paused()),invariant(beforeInspect));assert.ok((await info()).target.guide.angleDeg<1e-6);checks.push('arrival Inspect centers destination without moving or changing clocks');
    const markerArrival=await arrival({marker:true});await card.getByRole('button',{name:'Dismiss checkpoint',exact:true}).click();await focusedCanvas();assert.deepEqual(await snapshot(),markerArrival.frozen);checks.push('arrival defers external checkpoint while marker retains focus','external Dismiss preserves exact stopped state and focuses canvas');
    await arrival();await card.getByRole('button',{name:'Explore destinations',exact:true}).click();await panel.locator('#uf-inview-panel-explore').waitFor({state:'visible'});assert.equal(await panel.locator('#uf-inview-tab-explore').evaluate(node=>node===document.activeElement),true);await noCheckpoint();
    await arrival();
    await card.getByRole('button',{name:'Save viewpoint',exact:true}).click();await panel.locator('#uf-inview-panel-compose').waitFor({state:'visible'});await page.waitForFunction(()=>document.activeElement?.id==='uf-inview-view-name');const savePose=await paused();
    await panel.locator('#uf-inview-view-name').fill('Arrival checkpoint view');await panel.locator('#uf-inview-view-note').fill('A paused survey at the selected radius.');await inButton('Save current view').click();await page.waitForFunction(()=>window.__journeyHost.views.some(saved=>saved.title==='Arrival checkpoint view'));
    const saved=await page.evaluate(()=>window.__journeyHost.views.find(saved=>saved.title==='Arrival checkpoint view'));assert.deepEqual(saved.snapshot,savePose);assert.equal(await panel.locator('#uf-inview-tab-compose').getAttribute('aria-selected'),'true');
    await noCheckpoint();checks.push('Explore destinations opens Explore and resolves completed context','Save viewpoint opens Compose and focuses native name field','checkpoint viewpoint persists the complete paused snapshot');
    await arrival();await card.getByRole('button',{name:'Orbit destination',exact:true}).click();await noCheckpoint();await focusedCanvas();await page.waitForFunction(()=>window.__journeyInfo?.running&&window.__journeyInfo.orbit.active);await stage.locator('.uf-fs-play').click();await paused();checks.push('arrival Orbit starts an actual camera orbit and clears completed context');
    console.log('Journey boundary, arrival, focus, and action checks passed.');
    // Each stale-clear trigger starts with a new genuine arrival rather than injecting UI state.
    await arrival();await canvas.press('a');await noCheckpoint();checks.push('precision movement clears obsolete arrival context');
    await arrival();await stage.locator('.uf-fs-play').click();await noCheckpoint();await stage.locator('.uf-fs-play').click();await paused();checks.push('resume clears completed arrival context');
    await arrival();await open('explore');await panel.locator('#uf-inview-destination').selectOption('blue-star');await noCheckpoint();checks.push('different destination selection clears obsolete context');
    await arrival();await open('explore');await panel.locator('#uf-inview-saved-view').selectOption(saved.id);await noCheckpoint();await focusedCanvas();assert.deepEqual(invariant(await paused()),invariant(saved.snapshot));checks.push('saved-view restore clears obsolete context and returns paused');
    await arrival();await open('explore');await panel.locator('#uf-inview-region').selectOption('galaxy');await noCheckpoint();checks.push('scene change clears obsolete context');
    await boundary('galaxy');await card.getByRole('button',{name:'Explore destinations',exact:true}).click();await section('compose');await range('#uf-inview-fov',53);await range('#uf-inview-exposure',1.35);await panel.locator('#uf-inview-quality').selectOption('low');await section('travel');await range('#uf-inview-speed',76);
    const prefs=await page.evaluate(()=>({speed:document.querySelector('#uf-speed').value,smooth:window.__journeyControls.smoothTravel,beta:window.__journeyControls.beta,timeScale:window.__journeyControls.timeScale,fov:window.__journeyControls.fov,exposure:window.__journeyControls.exposure,quality:window.__journeyControls.quality}));
    await section('explore');await panel.locator('.uf-inview-reset').getByRole('button',{name:'Reset scene position and counters',exact:true}).click();await noCheckpoint();const reset=await paused();assert.deepEqual(reset.state,{position:scenes.galaxy.initial,yaw:0,pitch:0,distanceLy:0,universeYears:0,travelerYears:0});assert.equal(reset.targetId,null);
    await open('travel');const afterPrefs=await page.evaluate(()=>({speed:document.querySelector('#uf-speed').value,smooth:window.__journeyControls.smoothTravel,beta:window.__journeyControls.beta,timeScale:window.__journeyControls.timeScale,fov:window.__journeyControls.fov,exposure:window.__journeyControls.exposure,quality:window.__journeyControls.quality}));assert.deepEqual(afterPrefs,prefs);checks.push('Explore reset is always available and clears pose counters and context','scene reset retains pace smoothing and display preferences');
    // An unavailable renderer action follows the existing recoverable notice flow.
    for(const action of ['faceSceneCenter','frameTarget','startOrbit']){
      if(action==='faceSceneCenter')await boundary();else await arrival({vertical:action==='startOrbit'});const frozen=await snapshot();
      if(action!=='startOrbit')await page.evaluate(action=>{window.__journeyAction=window.__journeyScene[action];window.__journeyScene[action]=()=>false;},action);
      await card.getByRole('button',{name:action==='faceSceneCenter'?'Look toward scene center':action==='frameTarget'?'Inspect destination':'Orbit destination',exact:true}).click();
      await panel.locator('#uf-inview-panel-explore').waitFor({state:'visible'});await panel.locator('#uf-inview-notice').waitFor({state:'visible'});assert.ok((await panel.locator('#uf-inview-notice').innerText()).trim());assert.deepEqual(await snapshot(),frozen,'Rejected checkpoint '+action+' changes no camera state');
      if(action!=='startOrbit')await page.evaluate(action=>{window.__journeyScene[action]=window.__journeyAction;delete window.__journeyAction;},action);await noCheckpoint();checks.push((action==='startOrbit'?'vertical-axis orbit rejection':'unavailable '+action)+' opens Explore with recovery notice and preserves state');
    }
    await boundary();await stage.getByRole('button',{name:'Hide overlay',exact:true}).click();assert.equal(await card.isVisible(),true,'Clean view retains a functional checkpoint');await singleAnnouncement();await axeScope('clean-boundary');await stage.getByRole('button',{name:'Show overlay',exact:true}).click();
    await card.getByRole('button',{name:'Dismiss checkpoint',exact:true}).focus();await page.keyboard.press('Enter');await noCheckpoint();await focusedCanvas();checks.push('clean overlay keeps checkpoint and transport reachable','keyboard Dismiss works and returns canvas focus');
    for(const [name,viewport] of [['phone',{width:320,height:800}],['landscape',{width:568,height:320}]]){
      await exit();await page.setViewportSize(viewport);await enter();await boundary();await layout(name+'-boundary');await open('explore');await layout(name+'-inline-boundary',false);await inline.getByRole('button',{name:'Dismiss checkpoint',exact:true}).click();
      await arrival();await layout(name+'-arrival');const frozen=await paused();await card.getByRole('button',{name:'Dismiss checkpoint',exact:true}).press('Enter');await noCheckpoint();await focusedCanvas();assert.deepEqual(await snapshot(),frozen);checks.push(name+' checkpoint actions scroll under fixed heading and Dismiss',name+' inline checkpoint scrolls under fixed tabs and Close',name+' arrival keyboard actions retain exact paused state');
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(report,'journey-check.json'),JSON.stringify({checks,errors,accessibility,layouts,events},null,2));
    console.log('Journey checkpoint checks passed: '+checks.length+' groups, '+accessibility.length+' scoped accessibility checks.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
