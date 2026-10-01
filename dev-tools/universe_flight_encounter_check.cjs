const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');

// Decode the actual rendered PNG, keeping this visual check dependency-free.
function pngPixels(buffer){
  assert.equal(buffer.subarray(1,4).toString(),'PNG');
  let width,height,channels,offset=8;const parts=[];
  while(offset<buffer.length){
    const length=buffer.readUInt32BE(offset),type=buffer.subarray(offset+4,offset+8).toString(),data=buffer.subarray(offset+8,offset+8+length);offset+=length+12;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;assert.equal(data[12],0);}
    else if(type==='IDAT')parts.push(data);else if(type==='IEND')break;
  }
  const raw=zlib.inflateSync(Buffer.concat(parts)),stride=width*channels,pixels=Buffer.alloc(stride*height);
  function paeth(a,b,c){const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;}
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)],start=y*stride;
    for(let x=0;x<stride;x++){
      const a=x>=channels?pixels[start+x-channels]:0,b=y?pixels[start+x-stride]:0,c=y&&x>=channels?pixels[start+x-stride-channels]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;
      assert.ok(Number.isFinite(predictor),'PNG filter is supported');pixels[start+x]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  return {width,height,channels,pixels};
}
function visualStats(buffer){
  const image=pngPixels(buffer),sample=[];let luminous=0,colored=0,sum=0,max=0;
  for(let y=0;y<image.height;y+=4)for(let x=0;x<image.width;x+=4){
    const index=(y*image.width+x)*image.channels,r=image.pixels[index],g=image.pixels[index+1],b=image.pixels[index+2],level=(r+g+b)/3;
    sample.push(r,g,b);sum+=level;max=Math.max(max,r,g,b);if(level>8)luminous++;if(Math.max(r,g,b)-Math.min(r,g,b)>8)colored++;
  }
  const count=sample.length/3;return {width:image.width,height:image.height,mean:sum/count,luminousFraction:luminous/count,colorFraction:colored/count,max,sample};
}
function imageDifference(a,b){
  assert.equal(a.width,b.width);assert.equal(a.height,b.height);let changed=0,sum=0;
  for(let index=0;index<a.sample.length;index+=3){const distance=(Math.abs(a.sample[index]-b.sample[index])+Math.abs(a.sample[index+1]-b.sample[index+1])+Math.abs(a.sample[index+2]-b.sample[index+2]))/3;sum+=distance;if(distance>4)changed++;}
  return {changedFraction:changed/(a.sample.length/3),meanAbsolute:sum/(a.sample.length/3)};
}
function summary(stats){const {sample,...rest}=stats;return rest;}

(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
    const checks=[],errors=[],accessibility=[],captures=[],journeys=[],layouts=[],graphics=[];
    const layoutsOnly=process.argv.includes('--layouts-only');
    function saveReport(completed=false){if(!layoutsOnly)fs.writeFileSync(path.join(report,'encounter-check.json'),JSON.stringify({completed,checks,errors,accessibility,captures,journeys,layouts,graphics},null,2));}
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){const context=getContext.call(this,type,...args);if(type==='webgl'&&context)window.__encounterGL=context;return context;};
      let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){
        const create=value.create;
        value.create=function(canvas,options){
          const onTelemetry=options.onTelemetry,onPause=options.onPause;
          const scene=create.call(this,canvas,Object.assign({},options,{
            onTelemetry(info){window.__encounterInfo=info;if(onTelemetry)onTelemetry(info);},
            onPause(message,detail){window.__encounterPauses=window.__encounterPauses||[];window.__encounterPauses.push({message,detail:detail?JSON.parse(JSON.stringify(detail)):null});if(onPause)onPause(message,detail);}
          }));
          const set=scene.set,navigateTo=scene.navigateTo;
          scene.set=function(settings){window.__encounterSettings=Object.assign({},settings);return set.call(this,settings);};
          scene.navigateTo=function(...args){
            const record={arguments:args,snapshot:scene.snapshot(),settings:Object.assign({},window.__encounterSettings),at:Date.now()};
            record.accepted=navigateTo.apply(this,args);window.__encounterLaunches=window.__encounterLaunches||[];window.__encounterLaunches.push(record);return record.accepted;
          };
          window.__encounterScene=scene;return scene;
        };api=value;
      }});
    });
    await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
    await page.waitForFunction(()=>window.__encounterScene&&document.querySelector('.uf-transport button')?.disabled===false);
    const stage=page.locator('.uf-stage'),canvas=stage.locator('canvas'),panel=stage.locator('#uf-inview-controls');
    const button=name=>page.getByRole('button',{name,exact:true});
    const inButton=name=>panel.getByRole('button',{name,exact:true});
    const snapshot=()=>page.evaluate(()=>window.__encounterScene.snapshot());
    const info=()=>page.evaluate(()=>window.__encounterInfo);
    const nextDraw=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    async function enter(){await button('Toggle full screen for the 3D view').click();await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('.uf-stage'));}
    async function exit(){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);}
    async function open(section='explore'){if(await panel.count()===0){await stage.getByRole('button',{name:'Flight controls',exact:true}).click();await panel.waitFor({state:'visible'});}await panel.locator('#uf-inview-tab-'+section).click();await panel.locator('#uf-inview-panel-'+section).waitFor({state:'visible'});await nextDraw();}
    async function close(){await inButton('Close flight controls').click();await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));}
    async function range(selector,value){await page.locator(selector).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);await nextDraw();}
    async function mode(value){await open('explore');await panel.locator('#uf-inview-mode').selectOption(value);await page.waitForFunction(value=>window.__encounterScene.snapshot().settings.mode===value,value);await nextDraw();}
    async function region(value){await open('explore');await panel.locator('#uf-inview-region').selectOption(value);await page.waitForFunction(value=>window.__encounterScene.snapshot().settings.region===value,value);await nextDraw();}
    async function target(value){await open('explore');await panel.locator('#uf-inview-destination').selectOption(value);await page.waitForFunction(value=>window.__encounterScene.snapshot().targetId===(value||null),value);await nextDraw();}
    async function play(){await canvas.focus();await canvas.press('Space');await page.waitForFunction(()=>window.__encounterInfo?.running===true);}
    async function pause(){if((await info()).running){await canvas.focus();await canvas.press('Space');}await page.waitForFunction(()=>window.__encounterInfo?.running===false);const saved=await snapshot();await page.waitForTimeout(150);assert.deepEqual(await snapshot(),saved,'Pausing freezes actual position and elapsed clocks');return saved;}
    async function fixture(position,yaw=0,pitch=0){await page.evaluate(({position,yaw,pitch})=>{const saved=window.__encounterScene.snapshot();Object.assign(saved.state,{position,yaw,pitch,distanceLy:0,universeYears:0,travelerYears:0});if(!window.__encounterScene.restore(saved))throw new Error('Encounter pose rejected');},{position,yaw,pitch});await nextDraw();}
    async function capture(name){
      const actual=await page.evaluate(()=>window.__encounterScene.capture());assert.ok(actual?.dataUrl.startsWith('data:image/png;base64,'),'The source renderer returns a real PNG');
      const buffer=Buffer.from(actual.dataUrl.split(',')[1],'base64'),stats=visualStats(buffer);fs.writeFileSync(path.join(report,'encounter-'+name+'.png'),buffer);
      assert.ok(stats.max>32,'The renderer produces visible light');captures.push({name,snapshot:actual.snapshot,stats:summary(stats)});
      const error=await page.evaluate(()=>window.__encounterGL.getError());graphics.push({name,error});assert.equal(error,0,'Actual WebGL drawing reports no errors');return {snapshot:actual.snapshot,stats};
    }
    async function axeScope(name,node=stage){const violations=await node.evaluate(async node=>{const result=await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}));});accessibility.push({name,violations});assert.deepEqual(violations,[],name+' passes scoped accessibility');}
    async function significant(before,after,name){const difference=imageDifference(before.stats,after.stats);assert.ok(difference.changedFraction>.005,name+' changes a meaningful part of the actual scenery: '+JSON.stringify(difference));assert.ok(difference.meanAbsolute>.1,name+' changes more than a few bright points');return difference;}
    async function nativeLook(){
      const before=await pause();await canvas.focus();await canvas.press('ArrowRight');await canvas.press('ArrowUp');const after=await snapshot();
      for(const key of ['position','distanceLy','universeYears','travelerYears'])assert.deepEqual(after.state[key],before.state[key],'Free look keeps '+key+' unchanged');assert.notEqual(after.state.yaw,before.state.yaw);assert.notEqual(after.state.pitch,before.state.pitch);assert.deepEqual(after.settings,before.settings);return after;
    }
    async function seedJourney(){
      await pause();await page.evaluate(()=>{const saved=window.__encounterScene.snapshot();saved.state.distanceLy=17;saved.state.universeYears=23;saved.state.travelerYears=19;if(!window.__encounterScene.restore(saved))throw new Error('Old journey fixture rejected');});await nextDraw();
    }
    async function focusedCanvas(){await page.waitForFunction(()=>document.activeElement===document.querySelector('.uf-stage canvas'));}
    async function flight(sceneName,{normal=false,fullscreenAfterLaunch=false}={}){
      const flights={
        galaxy:{position:[0,27000,-85000],targetId:'galactic-center',fov:65,radius:18000},
        neighborhood:{position:[0,0,0],targetId:'pale-star',fov:75,radius:1},
        cosmic:{position:[0,0,-2200000],targetId:'near-galaxy',fov:60,radius:360000}
      },expected=flights[sceneName];
      if(!normal)await open('explore');
      await seedJourney();const previous=await snapshot(),previousSettings=await page.evaluate(()=>window.__encounterSettings),before=await page.evaluate(()=>(window.__encounterLaunches||[]).length),stopsBefore=await page.evaluate(()=>(window.__encounterPauses||[]).filter(item=>item.detail).length);
      const launch=(normal?page.locator('#uf-scenic-flights'):panel.locator('#uf-inview-scenic-flights')).locator('[data-scenic-flight="'+sceneName+'"]');
      const startedAt=Date.now();await launch.click();
      await page.waitForFunction(({before,sceneName})=>(window.__encounterLaunches||[]).length===before+1&&window.__encounterInfo?.running&&window.__encounterScene.snapshot().settings.region===sceneName,{before,sceneName});
      await focusedCanvas();assert.equal(await panel.count(),0,'Launching returns focus to the unobstructed 3D view');
      const launchRecord=await page.evaluate(()=>window.__encounterLaunches.at(-1)),fresh=launchRecord.snapshot;
      assert.equal(launchRecord.accepted,true);assert.equal(fresh.settings.mode,'explore');assert.equal(fresh.settings.region,sceneName);assert.equal(fresh.settings.compareRest,false);assert.equal(fresh.settings.fov,expected.fov);assert.equal(fresh.settings.exposure,1);assert.equal(fresh.targetId,expected.targetId);
      assert.deepEqual(fresh.state.position,expected.position,'The launch restores an explicit useful starting viewpoint');
      for(const key of ['distanceLy','universeYears','travelerYears'])assert.equal(fresh.state[key],0,'The fresh flight resets '+key);
      for(const key of ['beta','quality'])assert.equal(fresh.settings[key],previous.settings[key],'The launch preserves '+key);
      for(const key of ['timeScale','smoothTravel'])assert.equal(launchRecord.settings[key],previousSettings[key],'The launch preserves '+key);
      const planned=await page.evaluate(({sceneName,launchRecord,expected})=>{const target=UniverseFlight.landmarks(sceneName).find(item=>item.id===expected.targetId),distance=Math.hypot(...target.position.map((value,index)=>value-expected.position[index]));return {target,plan:UniverseFlight.math.approachPlan(distance,target.arrivalRadiusLy,1,launchRecord.settings.speed)};},{sceneName,launchRecord,expected});
      assert.ok(Math.abs(planned.plan.estimatedSeconds-20)<1,'The selected pace plans an encounter in about twenty playback seconds');
      await pause();let activeWallMs=Date.now()-startedAt;
      if(fullscreenAfterLaunch)await enter();
      const initial=await capture('scenic-'+sceneName+'-initial');
      assert.equal(initial.snapshot.settings.region,sceneName);assert.equal((await info()).navigation.active,true);
      const resumedAt=Date.now();await play();await page.waitForFunction(()=>window.__encounterInfo?.navigation?.progress>=.5&&window.__encounterInfo.running,{},{timeout:60000});await pause();activeWallMs+=Date.now()-resumedAt;
      const middle=await capture('scenic-'+sceneName+'-middle'),midInfo=await info();assert.ok(midInfo.navigation.progress>=.5&&midInfo.navigation.progress<1);assert.ok(middle.snapshot.state.distanceLy>initial.snapshot.state.distanceLy);
      assert.equal(midInfo.navigation.active,true,'A user pause preserves the real approach for resuming');
      const movingDifference=await significant(initial,middle,sceneName+' scenic first half');
      const finalResumedAt=Date.now();await play();
      await page.waitForFunction(({stopsBefore,targetId})=>{const stops=(window.__encounterPauses||[]).filter(item=>item.detail);return stops.length>stopsBefore&&stops.at(-1).detail.kind==='arrival'&&stops.at(-1).detail.targetId===targetId;},{stopsBefore,targetId:expected.targetId},{timeout:60000});
      activeWallMs+=Date.now()-finalResumedAt;const arrivedAt=Date.now();await pause();const arrived=await capture('scenic-'+sceneName+'-arrival'),arrivalInfo=await info(),event=await page.evaluate(()=>window.__encounterPauses.filter(item=>item.detail).at(-1));
      assert.equal(arrivalInfo.running,false);assert.equal(arrivalInfo.navigation.completed,true);assert.equal(arrivalInfo.motion.paceLyPerSecond,0);assert.equal(event.detail.region,sceneName);assert.equal(event.detail.arrivalRadiusLy,expected.radius);
      const separation=Math.hypot(...arrived.snapshot.state.position.map((value,index)=>value-planned.target.position[index]));assert.ok(Math.abs(separation-expected.radius)<Math.max(1e-9,expected.radius*1e-9),'Arrival pauses at the actual world-space survey radius');
      for(const key of ['universeYears','travelerYears'])assert.equal(arrived.snapshot.state[key],0,'Free camera exploration keeps physical '+key+' at zero');
      assert.equal((await page.evaluate(()=>(window.__encounterPauses||[]).filter(item=>item.detail).length)),stopsBefore+1,'Each scenic flight emits one genuine arrival event');
      const arrivalDifference=await significant(initial,arrived,sceneName+' scenic arrival');
      journeys.push({name:'scenic-'+sceneName,fromMode:previous.settings.mode,fromRegion:previous.settings.region,launchRecord,plannedSeconds:planned.plan.estimatedSeconds,activePlaybackWallMs:activeWallMs,wallMs:arrivedAt-startedAt,middleProgress:midInfo.navigation.progress,arrivalRadiusLy:separation,movingDifference,arrivalDifference,event});
      checks.push(sceneName+' scenic launch resets position and counters with a planned twenty second pace',sceneName+' scenic launch preserves physics and quality preferences',sceneName+' scenic first half visibly changes rendered scenery during actual travel',sceneName+' scenic arrival pauses at the real destination radius',sceneName+' scenic pause freezes position and retains its resumable approach');
      if(await page.evaluate(()=>!!document.fullscreenElement)){await stage.locator('#uf-stage-journey').waitFor({state:'visible'});await stage.screenshot({path:path.join(report,'encounter-scenic-'+sceneName+'-arrival-ui.png')});}
      await axeScope('scenic-'+sceneName+'-arrival');
      saveReport();
    }
    async function launchLayout(name,{fullscreen=false}={}){
      const launchArea=fullscreen?panel.locator('#uf-inview-scenic-flights'):page.locator('#uf-scenic-flights'),viewport=page.viewportSize();
      assert.equal(await launchArea.locator('[data-scenic-flight]').count(),3);
      assert.ok((await launchArea.innerText()).includes('About 20 seconds to an encounter'));
      if(fullscreen)assert.ok((await launchArea.innerText()).includes('Switches to Free exploration.'),'Physical mode makes the scenic mode change explicit');
      assert.ok(await launchArea.evaluate(node=>node.scrollWidth<=node.clientWidth+1),name+' has no horizontal launch overflow');
      const boxes=[];
      for(const control of await launchArea.locator('[data-scenic-flight]').all()){
        await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=viewport.width+1&&box.height>=44,name+' has usable launch touch targets');
        if(fullscreen){const body=await panel.locator('#uf-inview-body').boundingBox();assert.ok(box.y>=body.y-1&&box.y+box.height<=body.y+body.height+1,name+' can reveal each full launch button inside its scrolling body');}
        else assert.ok(box.y>=-1&&box.y+box.height<=viewport.height+1,name+' can scroll each launch into the viewport: '+JSON.stringify({box,viewport}));
        boxes.push(box);
      }
      if(fullscreen){const shell=await panel.boundingBox();assert.ok(shell.x>=0&&shell.y>=0&&shell.x+shell.width<=viewport.width+1&&shell.y+shell.height<=viewport.height+1,name+' control shell fits the screen');assert.equal(await panel.evaluate(node=>node.scrollTop),0,'The fixed fullscreen shell does not scroll');await stage.screenshot({path:path.join(report,'encounter-'+name+'.png')});}
      else {assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Normal layout avoids horizontal page overflow');await launchArea.screenshot({path:path.join(report,'encounter-'+name+'.png')});}
      layouts.push({name,viewport,boxes});await axeScope(name,fullscreen?stage:launchArea);checks.push(name+' exposes all three readable and reachable scenic launch buttons');
      return launchArea;
    }
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    if(!layoutsOnly){
    await launchLayout('desktop-launcher');
    await flight('galaxy',{normal:true,fullscreenAfterLaunch:true});
    await nativeLook();await capture('scenic-galaxy-paused-look');checks.push('scenic arrival retains free look with frozen position and clocks');
    await mode('relativity');await open('travel');await range('#uf-inview-beta',.77);await panel.locator('#uf-inview-time').selectOption('10');await inButton('Unshifted sky comparison').click();
    await open('compose');await range('#uf-inview-fov',40);await range('#uf-inview-exposure',.55);await panel.locator('#uf-inview-quality').selectOption('low');await open('explore');
    assert.ok((await panel.locator('#uf-inview-scenic-flights').innerText()).includes('Switches to Free exploration.'));await axeScope('physical-mode-scenic-launch');
    await flight('neighborhood');checks.push('a scenic launch from the physical light chase explicitly switches to free exploration');
    await flight('cosmic');checks.push('scenic launch works from a different scene scale without losing the approach to React settings');
    await mode('explore');await region('neighborhood');await target('');await close();
    await fixture([0,0,0]);const nearbyInitial=await capture('nearby-origin');
    await open('travel');await range('#uf-inview-speed',100);const smoothing=panel.locator('.uf-motion-toggle');if(await smoothing.getAttribute('aria-pressed')!=='false')await smoothing.click();await close();
    await play();await page.waitForFunction(()=>window.__encounterScene.snapshot().state.position[2]>=20,{},{timeout:30000});await pause();const nearbyMiddle=await capture('nearby-passing');
    const parallax=await significant(nearbyInitial,nearbyMiddle,'Nearby free flight');assert.ok(nearbyMiddle.snapshot.state.distanceLy>=20);assert.deepEqual(nearbyMiddle.snapshot.state.position.slice(0,2),[0,0]);
    checks.push('nearby free flight traverses genuine scene depth','nearby stars and emission regions change visibly during real camera motion');
    await nativeLook();const nearbyLook=await capture('nearby-paused-look');await significant(nearbyMiddle,nearbyLook,'Paused nearby look');checks.push('nearby pause retains native free look and fixed clocks');
    await fixture([13,-7,24]);const cloudNear=await capture('nearby-cloud-front');await fixture([13,-7,52]);const cloudPassed=await capture('nearby-cloud-behind');const cloudChange=await significant(cloudNear,cloudPassed,'Passing a nearby emission region');
    checks.push('local emission regions occupy changing world-space positions','nearby emission clouds remain visible from inside the scene');
    journeys.push({name:'nearby-free-flight',difference:parallax,cloudDifference:cloudChange});
    await axeScope('nearby-paused');
    saveReport();
    }else await enter();
    for(const viewport of [{width:320,height:740},{width:568,height:320}]){
      await exit();await page.setViewportSize(viewport);await nextDraw();const device=viewport.width===320?'phone':'landscape';
      const normalLaunch=await launchLayout(device+'-normal-launcher');
      await normalLaunch.locator('[data-scenic-flight="neighborhood"]').focus();await normalLaunch.locator('[data-scenic-flight="neighborhood"]').press('Enter');await page.waitForFunction(()=>window.__encounterInfo?.running&&window.__encounterScene.snapshot().settings.region==='neighborhood');await focusedCanvas();await pause();checks.push(device+' normal scenic launch supports native keyboard activation and returns focus to the view');
      await enter();await mode('relativity');const compactLaunch=await launchLayout(device+'-fullscreen-launcher',{fullscreen:true});
      await compactLaunch.locator('[data-scenic-flight="galaxy"]').focus();await compactLaunch.locator('[data-scenic-flight="galaxy"]').press('Enter');await page.waitForFunction(()=>window.__encounterInfo?.running&&window.__encounterScene.snapshot().settings.mode==='explore'&&window.__encounterScene.snapshot().settings.region==='galaxy');await focusedCanvas();assert.equal(await panel.count(),0);await pause();await capture(device+'-fullscreen-launch');checks.push(device+' fullscreen scenic launch works from physical mode and closes the controls');
    }
    assert.deepEqual(errors,[]);saveReport(true);
    console.log('Encounter checks passed: '+checks.length+' groups, '+accessibility.length+' scoped accessibility checks.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
