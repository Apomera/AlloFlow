// Real WebGL interaction and screenshot checks for the black-hole experiment.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.argv.includes('--regression') ? 'reports/galaxy-black-hole-debris-2026-09-29/regression' : process.argv.includes('--debris') ? 'reports/galaxy-black-hole-debris-2026-09-29' : process.argv.includes('--optics') ? 'reports/galaxy-black-hole-optics-2026-09-29' : (process.argv.includes('--distance')||process.argv.includes('--distance-only')) ? 'reports/galaxy-black-hole-distance-2026-09-29' : process.argv.includes('--follow') ? 'reports/galaxy-black-hole-follow-2026-09-29' : process.argv.includes('--planning') ? 'reports/galaxy-black-hole-planning-2026-09-29' : process.argv.includes('--breakup') ? 'reports/galaxy-black-hole-breakup-2026-09-29' : 'reports/galaxy-black-hole-interaction-2026-09-28');
const before = process.argv.includes('--before');
const optical = process.argv.includes('--optics');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//,'');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const shell = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));

async function debrisChecks(page,canvas,errors){
  const state=()=>canvas.evaluate(c=>c._blackHoleExperimentState());
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();await settle();};
  const mount=async settings=>{await page.evaluate(settings=>window.__mount({simMode:'blackHole',blackHolePaused:true,...settings}),settings);await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._inspectBlackHoleFragment);await settle();};
  const seek=async fraction=>{await canvas.evaluate((c,f)=>c._seekBlackHoleExperiment(f),fraction);await settle();};
  const selector=page.locator('#black-hole-fragment-select'),readout=page.locator('#black-hole-fragment-inspection-readout');
  const layouts=[],performance=[];
  await mount({blackHoleDropObject:'star',blackHoleReleaseRadius:4,blackHoleSideways:1});
  await act('Release object');
  let s=await state();assert.equal(s.duration,s.centerDuration,'Breakup keeps the full center revolution');assert(s.duration>12.45);
  assert.equal(await selector.locator('option').count(),49);
  assert(await page.getByRole('button',{name:'Farthest outside',exact:true}).isDisabled());
  assert(await page.getByRole('button',{name:'Follow selected fragment',exact:true}).isDisabled());
  await selector.selectOption('0');await settle();assert.equal((await state()).inspection.phase,'waiting');assert.match(await readout.textContent(),/Still part/);
  await act('Breakup starts');await seek(.3);
  await act('Farthest outside');s=await state();assert(s.highlightVisible&&s.paused);
  assert.equal(s.inspection.phase,'outside');assert.match(await readout.textContent(),new RegExp('Fragment '+(s.inspectedFragment+1)));
  const radii=s.fragmentPositions.map(p=>Math.hypot(p[0],p[2])/.43);
  assert(Math.abs(s.inspection.radius-Math.max(...radii))<1e-9,'Farthest selection uses the scene paths');
  const chart=await page.locator('#black-hole-distance-chart').evaluate(svg=>({d:svg.querySelector('#black-hole-distance-selected').getAttribute('d'),y:Number(svg.querySelector('#black-hole-distance-selected-dot').getAttribute('cy')),max:Number(document.getElementById('black-hole-distance-max').textContent)}));
  assert(chart.d.startsWith('M'));assert(Math.abs(1+(144-chart.y)/126*(chart.max-1)-s.inspection.radius)<1e-9);
  const colors=await page.locator('[data-bh-distance-key]').evaluate(key=>Array.from(key.querySelectorAll('i')).map(i=>getComputedStyle(i).backgroundColor));
  assert.deepEqual(colors,['rgb(103, 232, 249)','rgba(251, 191, 36, 0.4)','rgb(196, 181, 253)'],'Legend matches the center, debris and selected-fragment paths');
  await act('Follow selected fragment');
  let camera=await canvas.evaluate(c=>c._blackHoleCameraState());
  const selectedPosition=s.fragmentPositions[s.fragmentIndices.indexOf(s.inspectedFragment)];
  assert(camera.active);assert(Math.hypot(...camera.target.map((v,i)=>v-selectedPosition[i]))<1e-6,'Follow camera centers the selected parcel');
  assert.equal(camera.marker,'fragment');
  const selected=s.inspectedFragment;
  await seek(.9);const late=await state();assert(late.inspection.radius>s.inspection.radius,'Outward parcel keeps moving late in playback');
  await seek(.8);const a=await state();await seek(1);const b=await state();assert(b.inspection.radius>a.inspection.radius,'Unbound fragment does not freeze at its old exit boundary');
  await seek(.3);assert.deepEqual((await state()).fragmentPositions,s.fragmentPositions,'Rewind reconstructs the same debris');
  await act('Light bending');await act('Object experiment');assert.equal((await state()).inspectedFragment,selected);
  assert.deepEqual((await state()).fragmentPositions,s.fragmentPositions,'Light view preserves fragment inspection');
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1050});await canvas.scrollIntoViewIfNeeded();await settle();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No inspector overflow at '+width);
    const frame=await canvas.evaluate(c=>{const s=c._blackHoleExperimentState(),a=c._blackHoleCameraState();return {index:s.inspectedFragment,projection:a.projections[s.fragmentIndices.indexOf(s.inspectedFragment)],target:a.target};});
    assert(Math.abs(frame.projection[0])<.1&&Math.abs(frame.projection[1])<.1,'Selected parcel remains centered at '+width);
    await page.screenshot({path:path.join(OUT,'selected-fragment-'+width+'.png')});layouts.push({width,overflow:false,projection:frame.projection});
  }
  await page.evaluate(()=>{document.documentElement.dir='rtl';});await selector.scrollIntoViewIfNeeded();await settle();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'RTL inspector fits phone');
  await page.screenshot({path:path.join(OUT,'inspector-rtl-320.png')});await page.evaluate(()=>{document.documentElement.dir='ltr';});
  await selector.selectOption('-1');await settle();assert.equal((await state()).highlightVisible,false);assert.equal(await page.locator('#black-hole-distance-selected').getAttribute('d'),'');
  assert(await page.getByRole('button',{name:'Follow selected fragment',exact:true}).isDisabled());
  await canvas.scrollIntoViewIfNeeded();await settle();
  const allFrame=await canvas.evaluate(c=>c._blackHoleCameraState());assert(allFrame.projections.every(p=>Math.abs(p[0])<.85&&Math.abs(p[1])<.85),'All debris restores stream framing');
  await act('Nearest outside');s=await state();assert(Math.abs(s.inspection.radius-Math.min(...s.fragmentPositions.map(p=>Math.hypot(p[0],p[2])/.43)))<1e-9);
  // Capture updates the readout, removes the ring and ends the selected line.
  await mount({blackHoleDropObject:'probe',blackHoleSideways:0});await act('Release object');
  await selector.selectOption('0');await settle();await act('Breakup starts');assert.equal((await state()).inspection.phase,'outside');
  await act('Observation end');s=await state();assert.equal(s.inspection.phase,'captured');assert.equal(s.highlightVisible,false);assert.match(await readout.textContent(),/Crossed the horizon/);
  assert.equal(await page.locator('#black-hole-distance-selected-dot').evaluate(e=>getComputedStyle(e).display),'none');
  await act('Release moment');assert.equal((await state()).inspection.phase,'waiting');
  await selector.focus();await page.keyboard.press('ArrowDown');await settle();assert.equal((await state()).inspectedFragment,1,'Native selector supports keyboard selection');
  await act('Replay experiment');assert.equal((await state()).inspectedFragment,1);assert.equal((await state()).inspection.phase,'waiting');
  await act('Reset experiment');assert.equal((await state()).inspectedFragment,-1);assert.equal(await page.locator('#black-hole-fragment-inspector').isVisible(),false);
  await mount({blackHoleDropObject:'probe',blackHoleMassMode:'supermassive'});await act('Release object');assert.equal(await page.locator('#black-hole-fragment-inspector').isVisible(),false,'Intact experiment does not show an empty inspector');
  await page.setViewportSize({width:1440,height:1050});
  for(const settings of [{blackHoleSideways:1},{blackHoleSideways:1,blackHoleRadialVelocity:-.1}]){
    await mount({blackHoleDropObject:'star',...settings});
    const measurement=await canvas.evaluate(c=>{const started=performance.now();c._dropIntoBlackHole();const s=c._blackHoleExperimentState();return {releaseMs:performance.now()-started,duration:s.duration};});
    await settle();performance.push(measurement);await seek(.9);await act('Farthest outside');s=await state();assert.equal(s.inspection.phase,'outside');
    const before=s.inspection.radius;await seek(.95);assert.notEqual((await state()).inspection.radius,before,'Long-observation fragments still move');
  }
  await canvas.scrollIntoViewIfNeeded();
  const context=await canvas.evaluate(c=>{const gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();setTimeout(()=>ext.restoreContext(),120);return true;});
  if(context){await page.waitForFunction(()=>/recovered/.test(document.getElementById('black-hole-status').textContent));await settle();assert((await state()).highlightVisible);}
  const result={errors,layouts,performance,fullObservation:true,noFrozenEscape:true,selection:true,rewind:true,capture:true,keyboard:true,viewPreserved:true,contextRecovered:context};
  const cleanup=await canvas.evaluate(c=>{window.__mount({simMode:'star'});return !c._inspectBlackHoleFragment&&!c.isConnected;});assert(cleanup,'Inspector API disposes with the scene');
  fs.writeFileSync(path.join(OUT,'debris-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.equal(errors.length,0,errors.join('\n'));
}

async function distanceChecks(page,canvas){
  const state=()=>canvas.evaluate(c=>c._blackHoleExperimentState()),chart=page.locator('#black-hole-distance-chart');
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();await settle();};
  const mount=async settings=>{await page.evaluate(settings=>window.__mount({simMode:'blackHole',blackHolePaused:true,...settings}),settings);await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._blackHoleExperimentState);await settle();};
  const seek=async fraction=>{await canvas.evaluate((c,t)=>c._seekBlackHoleExperiment(t),fraction);await settle();};
  const read=()=>chart.evaluate(svg=>({value:Number(svg.getAttribute('aria-valuenow')),text:svg.getAttribute('aria-valuetext'),center:svg.querySelector('#black-hole-distance-center').getAttribute('d'),band:svg.querySelector('#black-hole-distance-debris').getAttribute('d'),cursor:Number(svg.querySelector('#black-hole-distance-cursor').getAttribute('x1')),dotHidden:svg.querySelector('#black-hole-distance-dot').style.display==='none'}));
  await mount({blackHoleMassMode:'supermassive'});assert.equal(await chart.isVisible(),false);
  await act('Release here');assert(await chart.isVisible());
  const fall=await read();assert(fall.center.startsWith('M0.00,'));assert.equal(fall.band,'');assert(!/NaN|Infinity/.test(fall.center));
  await chart.scrollIntoViewIfNeeded();const box=await chart.boundingBox();await chart.click({position:{x:box.width*.6,y:box.height*.5}});await settle();
  assert(Math.abs((await state()).time/(await state()).duration-.6)<.002);assert((await state()).paused);
  await chart.focus();await page.keyboard.press('ArrowRight');await settle();assert(Math.abs((await read()).value-61)<.2);
  await page.keyboard.press('Shift+ArrowLeft');await settle();assert(Math.abs((await read()).value-51)<.2);
  await page.keyboard.press('Home');await settle();assert.equal((await state()).time,0);
  await page.keyboard.press('End');await settle();assert.equal((await state()).time,(await state()).duration);
  await page.keyboard.press('ArrowRight');await settle();assert.equal((await read()).value,100);
  await page.keyboard.press('Home');await act('Start animation');await page.waitForTimeout(150);
  await chart.click({position:{x:box.width*.45,y:box.height*.5}});await settle();const pausedAt=(await state()).time;
  assert((await state()).paused);await page.waitForTimeout(150);assert.equal((await state()).time,pausedAt);
  const preserved=await read();await act('Light bending');assert.equal(await chart.isVisible(),false);await act('Object experiment');assert.deepEqual(await read(),preserved);

  for(const [name,sideways] of [['orbit',1],['escape',1.5]]){
    await mount({blackHoleMassMode:'supermassive',blackHoleSideways:sideways});await act('Release here');await seek(.5);
    const view=await read(),ys=Array.from(view.center.matchAll(/(?:M|L)([\d.]+),([\d.]+)/g),m=>Number(m[2]));
    if(name==='orbit')assert(Math.max(...ys)-Math.min(...ys)<.01,'Circular center distance stays flat');
    else assert(ys.at(-1)<ys[0],'Escaping distance rises on the chart');
  }

  const layouts=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:950});await mount({blackHoleMassMode:'supermassive',blackHoleDropObject:'star',blackHoleFollow:true});await act('Release here');await seek(.5);
    const view=await read();assert(view.band.includes(' Z'));assert(!/NaN|Infinity/.test(view.band));assert.equal(view.cursor,300);
    const synchronized=await chart.evaluate(svg=>{const s=document.querySelector('[data-black-hole-canvas]')._blackHoleExperimentState(),max=Number(document.getElementById('black-hole-distance-max').textContent),r=svg.querySelector('#black-hole-distance-range');return {near:1+(144-Number(r.getAttribute('y1')))/126*(max-1),far:1+(144-Number(r.getAttribute('y2')))/126*(max-1),radii:s.fragmentPositions.map(p=>Math.hypot(p[0],p[2])/.43)};});
    assert(Math.abs(synchronized.near-Math.min(...synchronized.radii))<1e-9);assert(Math.abs(synchronized.far-Math.max(...synchronized.radii))<1e-9);
    await seek(.75);await seek(.5);assert.deepEqual(await read(),view,'Rewind restores the chart exactly');
    await chart.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator('[data-bh-distance]').screenshot({path:path.join(OUT,'distance-star-'+width+'.png')});
    layouts.push({width,overflow:false,debrisRangeSynchronized:true,rewindExact:true});
  }
  await page.evaluate(()=>document.documentElement.dir='rtl');
  for(const width of [1440,320]){
    await page.setViewportSize({width,height:950});await mount({blackHoleMassMode:'supermassive',blackHoleDropObject:'star'});await act('Release here');await seek(.5);
    await chart.scrollIntoViewIfNeeded();
    const axis=await chart.evaluate(svg=>{const labels=svg.nextElementSibling.children;return {direction:getComputedStyle(svg.parentElement).direction,start:labels[0].getBoundingClientRect().left,end:labels[1].getBoundingClientRect().left};});
    assert.equal(axis.direction,'ltr');assert(axis.start<axis.end,'Playback percentages stay aligned with the SVG time axis in RTL');
    const plot=await chart.boundingBox();await chart.click({position:{x:plot.width*.3,y:plot.height*.5}});await settle();assert(Math.abs((await read()).value-30)<.6);
    if(width===320)await page.locator('[data-bh-distance]').screenshot({path:path.join(OUT,'distance-rtl-320.png')});
  }
  await page.evaluate(()=>document.documentElement.dir='ltr');
  const touchBox=await chart.boundingBox(),cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const touch={x:touchBox.x+touchBox.width*.4,y:touchBox.y+touchBox.height*.5};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();
  await page.waitForFunction(()=>Math.abs(Number(document.getElementById('black-hole-distance-chart').getAttribute('aria-valuenow'))-40)<.6,{},{timeout:1500});
  assert(Math.abs((await read()).value-40)<.6,'A phone tap seeks the chart within one screen pixel');
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  await page.setViewportSize({width:1440,height:1050});await mount({blackHoleDropObject:'astronaut',blackHoleFollow:true});await act('Release here');await act('Center at horizon');await act('Step forward');
  const afterCapture=await read();assert(afterCapture.dotHidden);assert((await state()).visibleFragments>0);assert(afterCapture.band.length>0);assert.match(afterCapture.text,/Debris/);
  await page.locator('[data-bh-distance]').screenshot({path:path.join(OUT,'distance-after-capture.png')});
  await act('Reset experiment');assert.equal(await chart.isVisible(),false);await mount({});
  fs.writeFileSync(path.join(OUT,'distance-results.json'),JSON.stringify({keyboardSeeking:true,tapSeeking:true,rtlAxis:true,inspectionPausesPlayback:true,viewPreservation:true,orbitAndEscapeShapes:true,centerCapture:true,layouts},null,2));
}

async function followChecks(page,canvas){
  const state=()=>canvas.evaluate(c=>c._blackHoleExperimentState()),camera=()=>canvas.evaluate(c=>c._blackHoleCameraState());
  const settle=async()=>{await canvas.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();await settle();};
  const mount=async settings=>{await page.evaluate(settings=>window.__mount({simMode:'blackHole',blackHolePaused:true,...settings}),settings);await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._blackHoleCameraState);await settle();};
  const seek=async fraction=>{await canvas.evaluate((c,t)=>c._seekBlackHoleExperiment(t),fraction);await settle();};
  const inFrame=view=>{assert(view.projections.length>0);for(const p of view.projections)assert(Math.abs(p[0])<.86&&Math.abs(p[1])<.86&&p[2]>-1&&p[2]<1,'Every surviving center fits the follow view');assert(Math.hypot(...view.position)>=.65,'Inspection camera stays outside the schematic horizon');};
  await mount({blackHoleMassMode:'supermassive',blackHoleSideways:1.5});
  const overview=await camera();
  await act('Follow object');await act('Release here');
  const initialTarget=(await camera()).target;
  for(const fraction of [0,.25,.6,1]){await seek(fraction);const view=await camera();assert(view.active);inFrame(view);}
  assert.notDeepEqual((await camera()).target,initialTarget,'Camera moves with an escaping object');
  await canvas.screenshot({path:path.join(OUT,'follow-escape.png')});
  const time=(await state()).time;
  await act('Follow object');const returned=await camera();
  assert.deepEqual(returned.position,overview.position,'Disabling follow restores the previous overview');
  assert.equal((await state()).time,time,'Changing camera mode does not change playback');
  await act('Follow object');await canvas.focus();await page.keyboard.press('+');await settle();
  const zoomed=await camera();assert(zoomed.zoom<1);
  await act('Light bending');assert.equal((await camera()).active,false);
  await act('Object experiment');assert.deepEqual((await camera()).position,zoomed.position);assert.equal((await camera()).zoom,zoomed.zoom);
  await act('Place object');assert.equal((await camera()).active,false,'Placement uses the stable overview plane');
  await act('Move camera');assert.equal((await camera()).active,true);

  // Paused scenes draw on change, including comparison edits and appearance.
  await page.waitForTimeout(120);const idle=(await camera()).frames;await page.waitForTimeout(200);
  assert.equal((await camera()).frames,idle,'An unchanged paused object scene does not redraw');
  await page.getByText('Compare paths',{exact:true}).click();await act('Keep current path');
  const withComparison=(await camera()).frames;await act('Clear comparison');assert((await camera()).frames>withComparison,'Clearing a comparison refreshes a paused image');
  await page.getByText('Relativistic controls',{exact:true}).click();const beforeAppearance=(await camera()).frames;
  await page.locator('#black-hole-disk').fill('0.5');await settle();assert((await camera()).frames>beforeAppearance);

  const layouts=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:950});
    await mount({blackHoleMassMode:'supermassive',blackHoleDropObject:'star',blackHoleFollow:true});await act('Release here');
    for(const fraction of [.1,.4,.7,.95]){await seek(fraction);inFrame(await camera());}
    await seek(.4);const middle=await camera();await seek(.7);await seek(.4);
    assert.deepEqual((await camera()).target,middle.target,'Rewind restores the same tracking target');
    assert.deepEqual((await camera()).position,middle.position,'Rewind restores the same framing');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await canvas.screenshot({path:path.join(OUT,'follow-star-'+width+'.png')});
    layouts.push({width,allSurvivingCentersFit:true,rewindExact:true,overflow:false});
  }
  await page.setViewportSize({width:1440,height:1050});
  await mount({blackHoleDropObject:'astronaut',blackHoleFollow:true});await act('Release here');await act('Center at horizon');await act('Step forward');
  inFrame(await camera());assert((await state()).visibleFragments>0);await canvas.screenshot({path:path.join(OUT,'follow-surviving-debris.png')});
  await act('Observation end');assert.equal((await state()).visibleFragments,0);assert.equal((await camera()).marker,'hidden');
  await page.emulateMedia({reducedMotion:'reduce'});await mount({blackHoleFollow:true});
  assert((await state()).paused);await act('Release here');await act('Step forward');assert((await state()).paused);inFrame(await camera());
  await page.emulateMedia({reducedMotion:'no-preference'});await mount({});
  fs.writeFileSync(path.join(OUT,'follow-results.json'),JSON.stringify({escapeTracking:true,overviewRestored:true,opticalViewPreserved:true,idleRendering:true,appearanceRefresh:true,reducedMotion:true,layouts},null,2));
}

async function planningChecks(page,canvas){
  const prediction=()=>canvas.evaluate(c=>c._blackHolePredictionState());
  const state=()=>canvas.evaluate(c=>c._blackHoleExperimentState());
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();};
  const mount=async settings=>{await page.evaluate(settings=>window.__mount({simMode:'blackHole',blackHolePaused:true,...settings}),settings);await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._blackHolePredictionState);};
  const openComparison=async()=>{const details=page.locator('[data-bh-planner] details');if(!await details.evaluate(d=>d.open))await details.locator('summary').click();};
  assert.equal((await prediction()).current.outcome,'captured');
  assert.equal((await prediction()).current.minimumRadius,1);
  await openComparison();await act('Keep current path');
  const retained=(await prediction()).comparison;
  await act('Orbit');
  assert.equal((await prediction()).current.outcome,'orbit');
  assert.deepEqual((await prediction()).comparison,retained,'Editing a reused preview buffer cannot change the retained path');
  await canvas.screenshot({path:path.join(OUT,'capture-versus-orbit.png')});
  await page.locator('[data-bh-planner]').screenshot({path:path.join(OUT,'comparison-controls.png')});
  await act('Keep current path');await act('Escape');
  const orbit=(await prediction()).comparison;
  assert.equal(orbit.prediction.outcome,'orbit');
  assert.equal((await prediction()).current.outcome,'escaped');
  await act('Release here');await act('Step forward');
  const playback=await state();
  assert(playback.released&&playback.paused&&playback.time>0);
  await act('Light bending');await act('Object experiment');
  assert.equal((await state()).time,playback.time);
  assert.deepEqual((await prediction()).comparison,orbit,'Switching views preserves the retained comparison');
  await page.selectOption('#black-hole-object','star');await page.selectOption('#black-hole-mass','supermassive');
  const starDistance=(await prediction()).cameraDistance;await act('Reset view');
  assert.equal((await prediction()).cameraDistance,starDistance,'Reset view preserves the enlarged stellar envelope framing');
  await act('Restore comparison release');
  assert.equal((await state()).released,false);assert.equal((await state()).sideways,1);
  assert.equal(await page.locator('#black-hole-object').inputValue(),'probe');
  assert.equal(await page.locator('#black-hole-mass').inputValue(),'stellar');
  await act('Aim throw');await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox(),point={x:box.x+box.width*.55,y:box.y+box.height*.4},original=await state();
  await page.mouse.click(point.x,point.y);
  assert.equal((await state()).sideways,original.sideways,'Clicking in aim mode preserves an existing throw');
  assert.equal((await state()).radialVelocityAtRelease,original.radialVelocityAtRelease);
  await page.mouse.move(point.x,point.y);await page.mouse.down();
  assert.equal((await state()).sideways,original.sideways,'Pointer-down does not snap the arrow');
  await page.mouse.move(point.x+75,point.y-30,{steps:5});
  await page.mouse.move(point.x,point.y,{steps:5});await page.mouse.up();
  assert.equal((await state()).sideways,original.sideways,'Dragging back to the origin restores the original vector');
  assert.equal((await state()).radialVelocityAtRelease,original.radialVelocityAtRelease);
  assert.equal((await state()).cameraYaw,original.cameraYaw);
  assert.deepEqual((await prediction()).comparison,orbit);
  await act('Clear comparison');assert.equal((await prediction()).comparison,null);
  assert.equal(await page.locator('#black-hole-comparison-restore').isVisible(),false);
  const layouts=[];
  for(const width of [390,320]){
    await page.setViewportSize({width,height:950});await mount({blackHoleSideways:1});
    await openComparison();await act('Keep current path');await act('Direct fall');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
    await canvas.screenshot({path:path.join(OUT,'comparison-phone-'+width+'.png')});
    await page.locator('[data-bh-planner]').screenshot({path:path.join(OUT,'comparison-controls-'+width+'.png')});
    await act('Release here');assert((await state()).released);
    layouts.push({width,overflow,releaseFromScene:true});
  }
  await page.setViewportSize({width:1440,height:1050});await mount({});
  fs.writeFileSync(path.join(OUT,'planning-results.json'),JSON.stringify({anchoredAim:true,comparisonPreserved:true,restoreSettings:true,starCameraReset:true,layouts},null,2));
}

async function opticalChecks(page,canvas,errors){
  const state=()=>canvas.evaluate(c=>c._blackHoleOpticalState());
  const shot=async name=>{const buffer=await canvas.screenshot({path:path.join(OUT,name+'.png')});if(name!=='optical-shadow')return null;return page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;const ctx=cv.getContext('2d');ctx.drawImage(image,0,0);return {width:cv.width,height:cv.height,data:Array.from(ctx.getImageData(0,Math.floor(cv.height/2),cv.width,1).data)};},buffer.toString('base64'));};
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(80);};
  await act('Release object');await act('Step forward');
  const release=await canvas.evaluate(c=>c._blackHoleExperimentState());
  const start=Date.now();await act('Light bending');
  await page.waitForFunction(()=>document.querySelector('[data-black-hole-canvas]')?._blackHoleOpticalState()?.frames>0);
  const initialViewMs=Date.now()-start;
  await shot('optical-angled');
  const idle=(await state()).frames;await page.waitForTimeout(180);assert.equal((await state()).frames,idle,'Paused optics does not redraw an unchanged image');
  await page.getByLabel('Show accretion disk',{exact:true}).uncheck();await page.waitForTimeout(100);
  const shadow=await shot('optical-shadow'),view=await state(),cx=Math.floor(shadow.width/2),cy=Math.floor(shadow.height/2);
  const dark=x=>{const p=x*4;return Math.max(shadow.data[p],shadow.data[p+1],shadow.data[p+2])<=2;};
  assert(dark(cx),'The radial light ray is captured');
  let left=cx,right=cx;while(left>0&&dark(left))left--;while(right<shadow.width-1&&dark(right))right++;
  const expected=shadow.height/2*Math.tan(Math.asin(1.5*Math.sqrt(3)*Math.sqrt(.95)/20))/view.tanFov;
  const measured=(right-left)/2;assert(Math.abs(measured-expected)<3,'Rendered shadow matches the finite-observer critical angle: '+measured+' vs '+expected);
  assert(Math.abs((cx-left)-(right-cx))<3,'The nonrotating shadow is symmetric');
  await page.getByLabel('Show sky grid',{exact:true}).check();await page.waitForTimeout(100);await shot('optical-sky-grid');
  await page.getByLabel('Show accretion disk',{exact:true}).check();await page.getByLabel('Show sky grid',{exact:true}).uncheck();
  await act('Edge of disk');await shot('optical-edge');
  await page.getByLabel('Show frequency-shift map',{exact:true}).check();await page.waitForTimeout(100);await shot('optical-frequency-map');
  await act('Above disk');await shot('optical-above');
  await page.getByLabel('Show frequency-shift map',{exact:true}).uncheck();await act('Reset view');
  const cameraSamples=await canvas.evaluate(async c=>{const samples=[];for(let i=0;i<15;i++){const start=performance.now();c.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));samples.push(performance.now()-start);}return samples;});
  await act('Animate disk');await page.waitForTimeout(180);await act('Pause disk');
  assert.equal((await canvas.evaluate(c=>c._blackHoleExperimentState())).time,release.time,'Optical animation preserves the experiment time');
  await act('Object experiment');
  const returned=await canvas.evaluate(c=>c._blackHoleExperimentState());
  assert.equal(returned.time,release.time);assert.equal(returned.cameraYaw,release.cameraYaw);assert.equal(returned.released,true);
  await act('Light bending');
  await canvas.evaluate(async c=>{const gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl.getExtension('WEBGL_lose_context');if(!ext)throw Error('Context-loss extension unavailable');await new Promise(resolve=>{c.addEventListener('webglcontextlost',resolve,{once:true});ext.loseContext();});await new Promise(resolve=>setTimeout(resolve,120));await new Promise(resolve=>{c.addEventListener('webglcontextrestored',resolve,{once:true});ext.restoreContext();});});
  await page.waitForFunction(()=>document.querySelector('[data-black-hole-canvas]')?._blackHoleOpticalState()?.enabled&&!document.querySelector('[data-bh-optics-controls] input').disabled);
  await page.waitForTimeout(100);await shot('optical-restored');
  const layouts=[];
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(100);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'No optical layout overflow at '+width);const draw=await state();assert(draw.bufferWidth<=1001&&draw.bufferHeight<=721);layouts.push({width,overflow,bufferWidth:draw.bufferWidth,bufferHeight:draw.bufferHeight});if(width===390)await page.screenshot({path:path.join(OUT,'optical-phone.png')});}
  const result={errors,initialViewMs,shadow:{measuredRadius:measured,expectedRadius:expected},cameraFramePairMs:cameraSamples,layouts,pausedRendering:true,experimentPreserved:true,contextRecovered:true};
  const disposed=await canvas.evaluate(c=>{window.__mount({simMode:'star'});return !c.isConnected&&!c._blackHoleOpticalState;});assert(disposed,'Optical view disposes on mode exit');
  fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.equal(errors.length,0,errors.join('\n'));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const assets = {
    '/react.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js',
    '/react-dom.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
    '/three.js': 'vendor/three-r128/three.min.js',
    '/galaxy.js': 'stem_lab/stem_tool_galaxy.js',
    '/styles.css': cssAsset,
  };
  if (process.argv.includes('--serve')) {
    const http = require('node:http');
    const server = http.createServer((req,res) => {
      const url = new URL(req.url, 'http://localhost');
      res.setHeader('Cache-Control','no-store');
      if (url.pathname === '/') {
        res.setHeader('Content-Type','text/html; charset=utf-8');
        res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Black Hole Lab — local preview</title><link rel="stylesheet" href="/styles.css"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script>window.__uiStrings={};'+shell+'</script><script src="/galaxy.js"></script><script>window.__mount({simMode:"blackHole",blackHolePaused:true,blackHoleOptical:'+String(optical)+'});</script></body></html>');
      } else if(assets[url.pathname]) {
        res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8');
        res.end(read(assets[url.pathname]));
      } else {res.statusCode=404;res.end('Not found');}
    });
    server.listen(0,'127.0.0.1',()=>console.log('BLACK_HOLE_PREVIEW=http://127.0.0.1:'+server.address().port));
    return;
  }
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ path: path.join(ROOT, cssAsset) });
    for (const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(p) });
    await page.addScriptTag({ content: 'window.__uiStrings = ' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(() => window.__mount({ simMode: 'blackHole', blackHolePaused: true }));
    await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
    const canvas = page.locator('[data-black-hole-canvas]');
    await canvas.scrollIntoViewIfNeeded();
    if(optical){await opticalChecks(page,canvas,errors);return;}
    if(process.argv.includes('--debris')){await debrisChecks(page,canvas,errors);return;}
    if(process.argv.includes('--distance')||process.argv.includes('--distance-only'))await distanceChecks(page,canvas);
    if(process.argv.includes('--distance-only')){assert.equal(errors.length,0,errors.join('\n'));const result={errors,distanceChecks:true};fs.writeFileSync(path.join(OUT,'distance-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;}
    if(process.argv.includes('--planning'))await planningChecks(page,canvas);
    if(process.argv.includes('--follow'))await followChecks(page,canvas);
    if(!before){
      const stateOf=()=>canvas.evaluate(c=>c._blackHoleExperimentState());
      await page.getByRole('button',{name:'Place object',exact:true}).click();
      let box=await canvas.boundingBox();
      const cameraBefore=(await stateOf()).cameraYaw;
      await canvas.click({position:{x:box.width*.3,y:box.height*.28}});
      const placed=await stateOf();
      assert(placed.releaseRadius>=4&&placed.releaseRadius<=8);
      assert(Math.abs(placed.launchAngle-41*Math.PI/180)>.1,'Placement must change the launch point');
      assert.equal(placed.cameraYaw,cameraBefore,'Placing must not orbit the camera');
      await page.getByRole('button',{name:'Aim throw',exact:true}).click();
      const marker=await page.locator('#black-hole-object-marker').boundingBox();
      assert(marker,'Placed object must remain visible');
      await page.mouse.move(marker.x+marker.width/2,marker.y+marker.height/2);
      await page.mouse.down();
      await page.mouse.move(marker.x+95,marker.y-45,{steps:6});
      await page.mouse.up();
      const aimed=await stateOf();
      assert(Math.abs(aimed.sideways)+Math.abs(aimed.radialVelocityAtRelease)>.1,'Aiming sets the launch velocity');
      assert.equal(aimed.cameraYaw,cameraBefore);
      await canvas.screenshot({path:path.join(OUT,'place-and-throw.png')});
      // Escape cancels the pending edit without saving it.
      box=await canvas.boundingBox();
      await page.mouse.move(box.x+box.width*.65,box.y+box.height*.4);
      await page.mouse.down();
      await page.mouse.move(box.x+box.width*.6,box.y+box.height*.3);
      await canvas.focus();await page.keyboard.press('Escape');await page.mouse.up();
      assert.equal((await stateOf()).sideways,aimed.sideways);
      assert.equal((await stateOf()).radialVelocityAtRelease,aimed.radialVelocityAtRelease);
      await page.keyboard.press('ArrowLeft');
      assert.notEqual((await stateOf()).sideways,aimed.sideways,'Keyboard can edit launch velocity');
      await page.evaluate(()=>window.__mount({simMode:'blackHole',blackHolePaused:true}));
      await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
    }
    await page.screenshot({ path: path.join(OUT, before ? 'before-desktop.png' : 'after-desktop.png') });
    await page.getByRole('button', { name: 'Release object', exact: true }).click();
    if (before) {
      await page.getByRole('button', { name: 'Start animation', exact: true }).click();
      await page.waitForTimeout(2200);
      await canvas.screenshot({ path: path.join(OUT, 'before-drop.png') });
    } else {
      const stateOf = () => canvas.evaluate(c => c._blackHoleExperimentState());
      const act = async name => {
        await page.getByRole('button', { name, exact: true }).click();
        // Allow React effects to configure the experiment before inspecting it.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      };
      const seek = async value => {
        await page.locator('#black-hole-timeline').evaluate((el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, value);
      };
      await page.getByRole('button', { name: 'Step forward', exact: true }).click();
      const state = await stateOf();
      assert(state.time > 0 && state.radius < state.releaseRadius, 'Stepping must move the released object inward');
      assert(state.paused, 'Step must pause automatic playback');
      await page.waitForTimeout(200);
      assert.equal((await stateOf()).time, state.time, 'Paused time must stay fixed');
      await canvas.screenshot({ path: path.join(OUT, 'after-step.png') });
      await seek(65);
      const middle = await stateOf();
      await canvas.screenshot({ path: path.join(OUT, 'after-tidal-stretch.png') });
      await seek(100);
      assert((await stateOf()).complete && (await stateOf()).radius === 1, 'Capture stops at the horizon');
      assert.match(await page.locator('#black-hole-status').textContent(), /Debris observation complete/);
      await seek(65);
      assert.equal((await stateOf()).radius, middle.radius, 'Backwards scrubbing must restore the same position');
      assert.deepEqual((await stateOf()).fragmentPositions,middle.fragmentPositions,'Rewinding reproduces every fragment position');
      assert.deepEqual((await stateOf()).fragmentColors,middle.fragmentColors,'Rewinding reproduces fragment color');
      assert.deepEqual((await stateOf()).fragmentOpacities,middle.fragmentOpacities,'Rewinding reproduces fragment opacity');
      assert(middle.fragmentPositions.length>0,'The probe must separate into visible parts');
      await seek(0);
      assert.equal((await stateOf()).visibleFragments,0,'Rewinding before breakup restores the intact object');
      await act('Replay experiment');
      assert.equal((await stateOf()).time, 0);
      assert.equal((await stateOf()).radius, 5);
      await act('Step back');
      assert.equal((await stateOf()).time,0,'Stepping backward clamps at release');
      await act('Breakup starts');
      assert.equal((await stateOf()).time,(await stateOf()).events.find(event=>event.key==='breakup').time);
      assert.equal(await page.locator('#black-hole-event-breakup').getAttribute('aria-pressed'),'true');
      const breakupTime=(await stateOf()).time;
      await act('Step back');assert((await stateOf()).time<breakupTime);
      await act('Step forward');assert.equal((await stateOf()).time,breakupTime);
      await act('Release moment');assert.equal((await stateOf()).time,0);
      await act('Start animation');
      await page.waitForTimeout(450);
      await act('Pause animation');
      assert((await stateOf()).time > 0, 'Play must advance the experiment');
      const pausedAt = (await stateOf()).time;
      await page.waitForTimeout(250);
      assert.equal((await stateOf()).time, pausedAt);

      for (const [preset, expected] of [['Orbit','orbit'],['Escape','escaped']]) {
        await act(preset);
        assert.equal((await stateOf()).released, false, 'Changing settings must reset the previous run');
        await act('Release object');
        await seek(100);
        assert.equal((await stateOf()).outcome, expected);
        assert((await stateOf()).radius > 1);
        await canvas.screenshot({ path: path.join(OUT, 'after-'+preset.toLowerCase()+'.png') });
      }
      await act('Direct fall');
      await page.selectOption('#black-hole-mass', 'supermassive');
      await act('Release object');
      await seek(95);
      assert.match(await page.locator('#black-hole-run-readout').textContent(), /1\.0×/);
      await canvas.screenshot({ path: path.join(OUT, 'after-supermassive-probe.png') });
      await page.selectOption('#black-hole-object', 'star');
      await act('Release object');
      await act('Breakup starts');
      const starStart=await stateOf();
      assert.equal(starStart.fragmentBlend,0,'Stellar surface remains intact at breakup onset');
      assert(starStart.intactOpacity>0);
      assert(starStart.fragmentOpacities.every(alpha=>alpha===0),'Parcels appear gradually');
      await canvas.screenshot({path:path.join(OUT,'star-breakup-start.png')});
      await canvas.evaluate(c=>{const s=c._blackHoleExperimentState();c._seekBlackHoleExperiment((s.time+.275)/s.duration);});
      const starMiddle=await stateOf();
      assert(Math.abs(starMiddle.fragmentBlend-.5)<1e-10);
      assert(starMiddle.intactOpacity>0&&starMiddle.intactOpacity<starStart.intactOpacity);
      assert(starMiddle.fragmentOpacities.every(alpha=>alpha>0));
      await canvas.screenshot({path:path.join(OUT,'star-breakup-transition.png')});
      await act('Step forward');await act('Step forward');
      assert.equal((await stateOf()).fragmentBlend,1);
      assert.equal((await stateOf()).intactOpacity,0);
      await page.waitForFunction(()=>document.querySelector('#black-hole-object-marker span').textContent.includes('Debris'));
      await canvas.screenshot({path:path.join(OUT,'star-breakup-stream.png')});
      await canvas.evaluate((c,time)=>{c._seekBlackHoleExperiment(time/c._blackHoleExperimentState().duration);},starMiddle.time);
      assert.deepEqual((await stateOf()).fragmentOpacities,starMiddle.fragmentOpacities,'Star crossfade is deterministic under rewind');
      await seek(60);
      await canvas.screenshot({ path: path.join(OUT, 'after-star-disruption.png') });
      await page.selectOption('#black-hole-object', 'astronaut');
      await page.selectOption('#black-hole-mass', 'stellar');
      await act('Release object');
      await act('Start animation');
      await act('Center at horizon');
      const centerCapture=await stateOf();
      assert(centerCapture.paused,'Event navigation pauses playback');
      assert.equal(centerCapture.time,centerCapture.centerDuration);
      await act('Step forward');
      const surviving=await stateOf();
      assert(surviving.visibleFragments>0,'Some enlarged trailing parts survive center capture');
      assert.equal(surviving.intactOpacity,0);
      assert(surviving.fragmentOpacities.every(alpha=>alpha>0),'Surviving parts must remain visible after the intact center is hidden');
      surviving.fragmentPositions.forEach((position,i)=>{const r=Math.hypot(position[0],position[2])/.43;assert(Math.abs(surviving.fragmentOpacities[i]-Math.max(.08,Math.sqrt(1-1/r)))<1e-9,'Each surviving part keeps the fade at its own radius');});
      assert.match(await page.locator('#black-hole-run-readout').textContent(),/Debris/);
      await canvas.screenshot({path:path.join(OUT,'surviving-debris.png')});
      await page.locator('[data-bh-transport]').last().screenshot({path:path.join(OUT,'event-navigation.png')});
      await seek(75);
      await canvas.screenshot({ path: path.join(OUT, 'after-astronaut.png') });

      // Changes to appearance must preserve an experiment and its canvas.
      await page.getByText('Relativistic controls', { exact: true }).click();
      const beforeAppearance = await stateOf();
      await page.locator('#black-hole-spin').fill('0.3');
      assert.equal((await stateOf()).time, beforeAppearance.time);
      const restored = await canvas.evaluate(async c => {
        const gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl.getExtension('WEBGL_lose_context');
        if(!ext)return 'unsupported';
        await new Promise(resolve=>{c.addEventListener('webglcontextlost',resolve,{once:true});ext.loseContext();});
        await new Promise(resolve=>setTimeout(resolve,150));
        if(!document.getElementById('black-hole-status').textContent.includes('interrupted'))throw Error('Context-loss feedback was overwritten');
        const done=new Promise(resolve=>c.addEventListener('webglcontextrestored',resolve,{once:true}));ext.restoreContext();await done;
        return true;
      });
      assert.equal(restored, true, 'WebGL context recovery was exercised');
      await page.waitForTimeout(100);
      assert.equal((await stateOf()).time, beforeAppearance.time);
      // Only actual inward-to-outward turning points offer this shortcut.
      await page.evaluate(()=>window.__mount({simMode:'blackHole',blackHolePaused:true,blackHoleMassMode:'supermassive',blackHoleSideways:1.2,blackHoleRadialVelocity:-.3}));
      await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
      await act('Release object');await act('Closest approach');
      assert(Math.abs((await stateOf()).radialVelocity)<1e-8);
      assert.equal(await page.locator('#black-hole-event-capture').isVisible(),false);
      assert.equal(await page.locator('#black-hole-event-breakup').isVisible(),false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => window.__mount({ simMode:'blackHole' }));
      await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
      assert((await stateOf()).paused, 'Reduced motion starts paused');
      await act('Release object');
      await act('Step forward');
      assert((await stateOf()).time > 0 && (await stateOf()).paused);

      // Both release extremes stay in frame on desktop and phone after reset.
      for (const width of [1440,390,320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => window.__mount({ simMode:'blackHole',blackHoleReleaseRadius:8,blackHolePaused:true }));
        await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
        await canvas.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => !document.getElementById('black-hole-object-marker').hidden);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No overflow at '+width);
      }
      await page.getByRole('button',{name:'Place object',exact:true}).click();
      await canvas.scrollIntoViewIfNeeded();
      const touchBox=await canvas.boundingBox(),cdp=await page.context().newCDPSession(page);
      const touchYaw=(await stateOf()).cameraYaw;
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchBox.x+touchBox.width*.7,y:touchBox.y+touchBox.height*.4}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchBox.x+touchBox.width*.6,y:touchBox.y+touchBox.height*.25}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.equal((await stateOf()).cameraYaw,touchYaw,'Touch placement must not orbit the camera');
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
      await page.getByRole('button', { name:'Release object',exact:true }).click();
      const inView=await canvas.evaluate(c=>{const r=c.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;});
      assert(inView,'Phone release returns to the object');
      await page.setViewportSize({width:1440,height:1050});
      await page.emulateMedia({ reducedMotion:'no-preference' });
      await page.evaluate(() => window.__mount({ simMode:'blackHole',blackHolePaused:true }));
      await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
      await canvas.scrollIntoViewIfNeeded();
      await page.screenshot({ path:path.join(OUT,'after-desktop.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await canvas.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, before ? 'before-phone.png' : 'after-phone.png') });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if(!before){
      await page.getByRole('button',{name:'Place object',exact:true}).click();
      const cleanup=await canvas.evaluate(c=>{
        const box=c.getBoundingClientRect(),queued=[],cancelled=[];
        const request=window.requestAnimationFrame,cancel=window.cancelAnimationFrame;
        window.requestAnimationFrame=function(callback){const id=request.call(window,callback);queued.push(id);return id;};
        window.cancelAnimationFrame=function(id){cancelled.push(id);return cancel.call(window,id);};
        try{
          const pointer={bubbles:true,button:0,isPrimary:true,pointerId:91,clientX:box.x+box.width*.7,clientY:box.y+box.height*.3};
          c.dispatchEvent(new PointerEvent('pointerdown',pointer));
          c.dispatchEvent(new PointerEvent('pointermove',{...pointer,clientX:pointer.clientX-20}));
          const pending=queued.slice();window.__mount({simMode:'star'});
          return {pending:pending.length,cancelled:pending.every(id=>cancelled.includes(id)),detached:!c.isConnected};
        }finally{window.requestAnimationFrame=request;window.cancelAnimationFrame=cancel;}
      });
      assert(cleanup.pending>0&&cleanup.cancelled&&cleanup.detached,'Leaving during a drag cancels queued preview work');
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    const result = { before, errors, overflow };
    fs.writeFileSync(path.join(OUT, before ? 'before.json' : 'browser-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(overflow, false, 'No horizontal phone overflow');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
