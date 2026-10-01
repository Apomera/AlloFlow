// Real WebGL interaction and screenshot checks for the black-hole experiment.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || (process.argv.includes('--moments-regression') ? 'reports/galaxy-black-hole-moments-2026-09-29/regression' : process.argv.includes('--moments') ? 'reports/galaxy-black-hole-moments-2026-09-29' : process.argv.includes('--motion-regression') ? 'reports/galaxy-black-hole-motion-2026-09-29/regression' : process.argv.includes('--motion') ? 'reports/galaxy-black-hole-motion-2026-09-29' : process.argv.includes('--picking-regression') ? 'reports/galaxy-black-hole-picking-2026-09-29/regression' : process.argv.includes('--picking') ? 'reports/galaxy-black-hole-picking-2026-09-29' : process.argv.includes('--regression') ? 'reports/galaxy-black-hole-debris-2026-09-29/regression' : process.argv.includes('--debris') ? 'reports/galaxy-black-hole-debris-2026-09-29' : process.argv.includes('--optics') ? 'reports/galaxy-black-hole-optics-2026-09-29' : (process.argv.includes('--distance')||process.argv.includes('--distance-only')) ? 'reports/galaxy-black-hole-distance-2026-09-29' : process.argv.includes('--follow') ? 'reports/galaxy-black-hole-follow-2026-09-29' : process.argv.includes('--planning') ? 'reports/galaxy-black-hole-planning-2026-09-29' : process.argv.includes('--breakup') ? 'reports/galaxy-black-hole-breakup-2026-09-29' : 'reports/galaxy-black-hole-interaction-2026-09-28'));
const before = process.argv.includes('--before');
const optical = process.argv.includes('--optics');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//,'');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const shell = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));

async function momentChecks(page,canvas,errors){
  const state=()=>canvas.evaluate(c=>c._blackHoleExperimentState());
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();await settle();};
  const mount=async settings=>{await page.evaluate(settings=>window.__mount({simMode:'blackHole',blackHolePaused:true,...settings}),settings);await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._seekBlackHoleFragmentMoment);await settle();};
  const select=async index=>{await page.locator('#black-hole-fragment-select').selectOption(String(index));await settle();};
  const details=page.locator('#black-hole-fragment-moments'),chart=page.locator('#black-hole-distance-chart');
  const open=async()=>{if(!await details.evaluate(d=>d.open))await details.locator('summary').click();await settle();};
  await mount({blackHoleDropObject:'probe'});await act('Release object');assert.equal(await details.isVisible(),false);await select(0);await open();let s=await state();assert.equal(s.fragmentMoments[0].key,'breakup');assert.equal(s.fragmentMoments.at(-1).key,'capture');assert(await page.locator('#black-hole-fragment-moment-previous').isDisabled());
  await act('Next fragment moment');s=await state();assert.equal(s.time,s.fragmentMoments[0].time);assert(s.paused);assert.equal(await details.locator('[data-bh-moment-button="0"]').getAttribute('aria-pressed'),'true');
  await act('Next fragment moment');s=await state();assert.equal(s.time,s.fragmentMoments.at(-1).time);assert.equal(s.inspection.phase,'captured');assert(await page.locator('#black-hole-fragment-moment-next').isDisabled());
  await canvas.scrollIntoViewIfNeeded();await canvas.focus();await settle();const scroll=await page.evaluate(()=>scrollY);await page.keyboard.press('PageDown');await settle();assert.equal(await page.evaluate(()=>scrollY),scroll,'The last moment does not scroll the page');await page.keyboard.press('PageUp');await settle();assert.equal((await state()).time,s.fragmentMoments[0].time);
  assert.equal(await canvas.evaluate(c=>c._seekBlackHoleFragmentMoment(-1)),false);assert.equal(await canvas.evaluate(c=>c._seekBlackHoleFragmentMoment(1000)),false);
  // Use an eccentric stellar release so the observation includes radial turns.
  const eccentric={blackHoleDropObject:'star',blackHoleReleaseRadius:8,blackHoleSideways:1,blackHoleRadialVelocity:-.1,blackHoleFollow:true};await mount(eccentric);await act('Release object');
  const chosen=await canvas.evaluate(c=>{const selector=document.getElementById('black-hole-fragment-select');for(let i=0;i<selector.options.length-1;i++){c._inspectBlackHoleFragment(i);const events=c._blackHoleExperimentState().fragmentMoments;if(events.some(e=>e.key==='closest')&&events.some(e=>e.key==='farthest'))return i;}return -1;});assert(chosen>=0,'A real fragment has both inward and outward turns');await select(chosen);await open();s=await state();const events=s.fragmentMoments,turnIndex=events.findIndex(e=>e.key==='closest');
  await act('Start animation');await details.locator('[data-bh-moment-button="'+turnIndex+'"]').click();await settle();s=await state();assert.equal(s.time,events[turnIndex].time);assert(s.paused);assert(Math.abs(s.inspection.radialVelocity)<1e-7);assert.equal(await details.locator('[data-bh-moment-button="'+turnIndex+'"]').getAttribute('aria-pressed'),'true');const activeStyle=await details.locator('[data-bh-moment-button="'+turnIndex+'"]').evaluate(b=>getComputedStyle(b).backgroundColor);assert.equal(activeStyle,'rgb(76, 56, 106)','The current fragment moment has a visible violet highlight');
  // The highlighted curve includes the exact turn, and its marker uses that radius.
  const geometry=await chart.evaluate((svg,index)=>{const g=svg.querySelector('[data-bh-fragment-moment="'+index+'"]'),circles=g.querySelectorAll('ellipse');return {x:Number(circles[1].getAttribute('cx')),y:Number(circles[1].getAttribute('cy')),line:svg.querySelector('#black-hole-distance-selected').getAttribute('d'),max:Number(document.getElementById('black-hole-distance-max').textContent)};},turnIndex);assert(geometry.line.includes(geometry.x.toFixed(2)+','+geometry.y.toFixed(2)));assert(Math.abs(1+(144-geometry.y)/126*(geometry.max-1)-events[turnIndex].radius)<1e-9);
  await chart.scrollIntoViewIfNeeded();await settle();const mark=await chart.locator('[data-bh-fragment-moment="'+turnIndex+'"] [data-bh-moment-hit]').boundingBox();await page.mouse.click(mark.x+mark.width/2,mark.y+mark.height/2);await settle();assert.equal((await state()).time,events[turnIndex].time);
  await canvas.scrollIntoViewIfNeeded();await canvas.focus();await page.keyboard.press('PageDown');await settle();assert.equal((await state()).time,events[turnIndex+1].time);await page.keyboard.press('PageUp');await settle();assert.equal((await state()).time,events[turnIndex].time);
  const preserved=(await state()).time;await act('Light bending');assert.equal(await canvas.evaluate(c=>c._seekBlackHoleFragmentMoment('next')),false);await act('Object experiment');assert.equal((await state()).time,preserved);assert.deepEqual((await state()).fragmentMoments,events);
  await select(-1);assert.equal(await details.isVisible(),false);assert.equal(await chart.locator('[data-bh-fragment-moment]').count(),0);await select(chosen);assert.deepEqual((await state()).fragmentMoments,events);
  const layouts=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1050});await mount(eccentric);await act('Release object');await select(chosen);await open();s=await state();const index=s.fragmentMoments.findIndex(e=>e.key==='closest');await details.locator('[data-bh-moment-button="'+index+'"]').click();await settle();s=await state();assert(s.paused&&s.inspectedFragment===chosen);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await chart.scrollIntoViewIfNeeded();await settle();
    const dot=await chart.locator('[data-bh-fragment-moment="'+index+'"] [data-bh-moment-dot]').boundingBox();assert(Math.abs(dot.width-dot.height)<.5&&dot.width>=9.8,'Moment marker stays round and readable at '+width);
    const point=await chart.evaluate((svg,index)=>{const c=svg.querySelector('[data-bh-fragment-moment="'+index+'"] [data-bh-moment-dot]'),b=svg.getBoundingClientRect();return {x:b.x+Number(c.getAttribute('cx'))/600*b.width,y:b.y+Number(c.getAttribute('cy'))/160*b.height};},index);
    await canvas.evaluate(c=>c._seekBlackHoleExperiment(0));await settle();
    if(width<1000){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x+12,y:point.y+4}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();}else await page.mouse.click(point.x+12,point.y+4);
    await settle();assert.equal((await state()).time,s.fragmentMoments[index].time,'A near-marker tap snaps to the exact moment at '+width);await page.screenshot({path:path.join(OUT,'moment-chart-'+width+'.png')});await details.scrollIntoViewIfNeeded();await settle();await page.screenshot({path:path.join(OUT,'moment-controls-'+width+'.png')});layouts.push({width,overflow:false,events:s.fragmentMoments.length,touchSnap:width<1000});
  }
  await page.evaluate(()=>document.documentElement.dir='rtl');await details.scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(OUT,'moments-rtl-320.png')});await page.evaluate(()=>document.documentElement.dir='ltr');
  await act('Replay experiment');s=await state();assert.equal(s.time,0);assert.equal(s.inspectedFragment,chosen);assert.deepEqual(s.fragmentMoments,events);await act('Reset experiment');assert.equal((await state()).fragmentMoments.length,0);assert.equal(await details.isVisible(),false);assert.equal(await canvas.evaluate(c=>c._seekBlackHoleFragmentMoment('next')),false);
  const cleanup=await canvas.evaluate(c=>{window.__mount({simMode:'star'});return !c.isConnected&&!c._seekBlackHoleFragmentMoment;});assert(cleanup);assert.equal(errors.length,0,errors.join('\n'));const result={errors,layouts,chosen,events,exactNavigation:true,boundaries:true,curveSynchronized:true,keyboard:true,pickingSnap:true,viewPreserved:true,replay:true,reset:true,cleanup};fs.writeFileSync(path.join(OUT,'moment-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}

async function motionChecks(page,canvas,errors){
  const state=()=>canvas.evaluate(c=>c._blackHoleExperimentState()),camera=()=>canvas.evaluate(c=>c._blackHoleCameraState());
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();await settle();};
  const mount=async settings=>{await page.evaluate(settings=>window.__mount({simMode:'blackHole',blackHolePaused:true,...settings}),settings);await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._blackHoleExperimentState);await settle();};
  const seek=async f=>{await canvas.evaluate((c,f)=>c._seekBlackHoleExperiment(f),f);await settle();};
  const select=async i=>{await page.locator('#black-hole-fragment-select').selectOption(String(i));await settle();};
  const checkbox=page.getByRole('checkbox',{name:'Show motion direction',exact:true});
  const ringWidth=async()=>{const a=await camera(),box=await canvas.boundingBox();assert.equal(a.selectionEdges.length,2);return Math.abs(a.selectionEdges[0][0]-a.selectionEdges[1][0])*box.width/2;};
  await mount({blackHoleDropObject:'probe'});await act('Release object');await select(0);let s=await state();assert.equal(s.fragmentMotion,null);assert.equal(s.motionIndicator.visible,false);
  await act('Breakup starts');s=await state();await seek((s.time+.15)/s.duration);s=await state();assert(s.fragmentMotion&&s.fragmentMotion.speed>0&&s.fragmentMotion.speed<1);assert(s.fragmentMotion.clockRate<s.localReferences.clockFactor);
  assert.equal(await page.locator('#black-hole-fragment-speed').textContent(),s.fragmentMotion.speed>.9995?'~1 c':s.fragmentMotion.speed.toFixed(3)+' c');assert.equal(await page.locator('#black-hole-fragment-moving-clock').textContent(),s.fragmentMotion.clockRate.toFixed(3));
  await act('Jump to this horizon crossing');s=await state();assert.equal(s.fragmentMotion,null);assert.equal(s.motionIndicator.visible,false);assert.equal(await page.locator('#black-hole-fragment-metrics').isVisible(),false);
  await mount({blackHoleDropObject:'star',blackHoleReleaseRadius:4,blackHoleSideways:1,blackHoleFollow:true});await act('Release object');await seek(.3);s=await state();const index=s.fragmentIndices[0];await select(index);await act('Above disk');await canvas.scrollIntoViewIfNeeded();await settle();s=await state();assert(s.motionIndicator.visible);const original=s,time=s.time;
  // Compare the actual arrow to two rendered positions around this moment.
  const points=[];for(const t of [time-.001,time+.001]){await seek(t/s.duration);const sample=await state();points.push(sample.fragmentPositions[sample.fragmentIndices.indexOf(index)]);}await seek(time/s.duration);s=await state();
  const tangent=points[1].map((v,i)=>v-points[0][i]),arrow=s.motionIndicator.tip.map((v,i)=>v-s.motionIndicator.origin[i]),dot=tangent.reduce((sum,v,i)=>sum+v*arrow[i],0)/(Math.hypot(...tangent)*Math.hypot(...arrow));assert(dot>.99999,'Arrow follows the actual rendered tangent');
  const widths=[await ringWidth()];await canvas.focus();await page.keyboard.press('+');await page.keyboard.press('+');await settle();widths.push(await ringWidth());await page.keyboard.press('-');await page.keyboard.press('-');await page.keyboard.press('-');await settle();widths.push(await ringWidth());assert(widths.every(w=>Math.abs(w-44)<.5),'Selection ring keeps a 44 px sprite width while zooming');
  const frames=(await camera()).frames;await checkbox.uncheck();assert.equal((await state()).motionIndicator.visible,false);await canvas.scrollIntoViewIfNeeded();await settle();assert.equal((await state()).time,time);assert.equal((await state()).inspectedFragment,index);assert((await camera()).frames>frames,'Paused view refreshes after hiding its arrow');
  await checkbox.check();await canvas.scrollIntoViewIfNeeded();await settle();assert((await state()).motionIndicator.visible);await act('Light bending');assert.equal((await state()).motionIndicator.visible,false);await act('Object experiment');assert((await state()).motionIndicator.visible);assert.equal((await state()).time,time);
  await seek(.4);await seek(time/s.duration);s=await state();assert.deepEqual(s.fragmentMotion,original.fragmentMotion,'Rewind restores the same speed and direction');
  await checkbox.uncheck();await act('Replay experiment');await seek(.3);await select(index);assert.equal(await checkbox.isChecked(),false);assert.equal((await state()).motionIndicator.visible,false);await checkbox.check();await settle();
  await canvas.focus();await page.keyboard.press('Escape');await settle();assert.equal((await state()).motionIndicator.visible,false);assert.equal((await state()).fragmentMotion,null);
  const layouts=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1050});await mount({blackHoleDropObject:'star',blackHoleReleaseRadius:4,blackHoleSideways:1,blackHoleFollow:true});await act('Release object');await seek(.3);s=await state();await select(s.fragmentIndices[0]);await act('Above disk');await canvas.scrollIntoViewIfNeeded();await settle();s=await state();assert(s.motionIndicator.visible);const ring=await ringWidth();assert(Math.abs(ring-44)<.5);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(OUT,'motion-scene-'+width+'.png')});await page.locator('#black-hole-fragment-metrics').scrollIntoViewIfNeeded();await settle();await page.screenshot({path:path.join(OUT,'motion-values-'+width+'.png')});layouts.push({width,overflow:false,ringWidth:ring,speed:s.fragmentMotion.speed});
  }
  await page.evaluate(()=>document.documentElement.dir='rtl');await page.locator('#black-hole-fragment-metrics').scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(OUT,'motion-rtl-320.png')});await page.evaluate(()=>document.documentElement.dir='ltr');
  const cleanup=await canvas.evaluate(c=>{window.__mount({simMode:'star'});return !c.isConnected&&!c._blackHoleExperimentState;});assert(cleanup);assert.equal(errors.length,0,errors.join('\n'));
  const result={errors,layouts,tangentDot:dot,zoomWidths:widths,localSpeed:true,movingClock:true,captureHidden:true,pausedRefresh:true,viewPreserved:true,rewind:true,preferencePreserved:true,cleanup};fs.writeFileSync(path.join(OUT,'motion-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}

async function pickingChecks(page,canvas,errors){
  const state=()=>canvas.evaluate(c=>c._blackHoleExperimentState()),camera=()=>canvas.evaluate(c=>c._blackHoleCameraState());
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const act=async name=>{await page.getByRole('button',{name,exact:true}).click();await settle();};
  const mount=async settings=>{await page.evaluate(settings=>window.__mount({simMode:'blackHole',blackHolePaused:true,...settings}),settings);await page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._pickBlackHoleFragment);await settle();};
  const seek=async fraction=>{await canvas.evaluate((c,f)=>c._seekBlackHoleExperiment(f),fraction);await canvas.scrollIntoViewIfNeeded();await settle();};
  const clear=async()=>{await canvas.evaluate(c=>c._inspectBlackHoleFragment(-1));await settle();};
  const target=()=>canvas.evaluate(c=>{const box=c.getBoundingClientRect(),a=c._blackHoleCameraState(),s=c._blackHoleExperimentState();let best=null;
    a.projections.forEach((p,i)=>{if(p[2]< -1||p[2]>1||Math.abs(p[0])>.75||p[1]<-.6||p[1]>.75)return;const x=(p[0]+1)*box.width/2,y=(1-p[1])*box.height/2;let separation=Infinity;a.projections.forEach((q,j)=>{if(j!==i)separation=Math.min(separation,Math.hypot((q[0]-p[0])*box.width/2,(q[1]-p[1])*box.height/2));});if(!best||separation>best.separation)best={x:box.left+x,y:box.top+y,index:s.fragmentIndices[i],separation};});return best;});
  const metrics=page.locator('#black-hole-fragment-metrics'),captureButton=page.getByRole('button',{name:'Jump to this horizon crossing',exact:true});
  await mount({blackHoleDropObject:'star',blackHoleReleaseRadius:4,blackHoleSideways:1,blackHoleFollow:true});await act('Release object');
  assert.equal(await metrics.isVisible(),false,'No fragment measurements before selection and breakup');
  assert.equal(await canvas.evaluate(c=>c._pickBlackHoleFragment(0,0)),false);await seek(.3);await act('Above disk');await canvas.scrollIntoViewIfNeeded();await settle();
  const point=await target();assert(point,'A fragment is available for picking');const before=await camera();
  await page.mouse.click(point.x,point.y);await settle();let s=await state();assert(s.inspectedFragment>=0&&s.highlightVisible&&s.paused,'Scene click selects and highlights a parcel');
  assert.equal((await camera()).yaw,before.yaw,'A click does not orbit the camera');assert.equal((await camera()).pitch,before.pitch);
  assert(await metrics.isVisible());assert.equal(await page.locator('#black-hole-fragment-distance-km').textContent(),s.localReferences.distanceKm.toLocaleString(undefined,{maximumSignificantDigits:4})+' km');
  assert.equal(await page.locator('#black-hole-fragment-gradient').textContent(),s.localReferences.gradient.toExponential(2)+' s⁻²');assert.equal(await page.locator('#black-hole-fragment-clock').textContent(),s.localReferences.clockFactor.toFixed(3));
  // Small pointer motion is a tap; a drag out and back remains a drag.
  await clear();await canvas.scrollIntoViewIfNeeded();await settle();const tiny=await target(),smallCamera=await camera();
  await page.mouse.move(tiny.x,tiny.y);await page.mouse.down();await page.mouse.move(tiny.x+3,tiny.y+2);await page.mouse.up();await settle();assert((await state()).inspectedFragment>=0);assert.equal((await camera()).yaw,smallCamera.yaw);
  await clear();await canvas.scrollIntoViewIfNeeded();await settle();const dragPoint=await target();
  await page.mouse.move(dragPoint.x,dragPoint.y);await page.mouse.down();await page.mouse.move(dragPoint.x+40,dragPoint.y);await page.mouse.move(dragPoint.x,dragPoint.y);await page.mouse.up();await settle();assert.equal((await state()).inspectedFragment,-1,'Returning a drag to its origin does not select');
  await page.mouse.move(dragPoint.x,dragPoint.y);await page.mouse.down();const dragCamera=await camera();await page.mouse.move(dragPoint.x+35,dragPoint.y);await page.mouse.up();await settle();assert.notEqual((await camera()).yaw,dragCamera.yaw,'Dragging still orbits');assert.equal((await state()).inspectedFragment,-1);
  await canvas.evaluate(c=>{const box=c.getBoundingClientRect(),p={bubbles:true,button:0,isPrimary:true,pointerId:97,clientX:box.x+box.width/2,clientY:box.y+box.height/2};c.dispatchEvent(new PointerEvent('pointerdown',p));c.dispatchEvent(new PointerEvent('pointercancel',p));c.dispatchEvent(new PointerEvent('pointerup',p));});assert.equal((await state()).inspectedFragment,-1,'Cancelled pointers do not pick');
  // Keyboard cycling selects outside parcels and wraps; Escape restores all.
  await canvas.focus();s=await state();await page.keyboard.press(']');await settle();assert.equal((await state()).inspectedFragment,s.fragmentIndices[0]);
  await page.keyboard.press('[');await settle();assert.equal((await state()).inspectedFragment,s.fragmentIndices.at(-1));
  await page.keyboard.press('Escape');await settle();assert.equal((await state()).inspectedFragment,-1);assert.equal(await metrics.isVisible(),false);
  assert.match(await canvas.getAttribute('aria-keyshortcuts'),/\[ \] Escape/);
  // A parcel behind the opaque horizon cannot be selected through its projection.
  await act('Follow object');await act('Edge of disk');await canvas.scrollIntoViewIfNeeded();await settle();
  const hiddenIndex=(await state()).fragmentIndices[0];
  await canvas.evaluate((c,index)=>{const s=c._blackHoleExperimentState(),p=s.fragmentPositions[s.fragmentIndices.indexOf(index)],a=c._blackHoleCameraState();let delta=Math.atan2(p[0],p[2])+Math.PI-a.yaw;delta=Math.atan2(Math.sin(delta),Math.cos(delta));const steps=Math.round(delta/.1);for(let i=0;i<Math.abs(steps);i++)c.dispatchEvent(new KeyboardEvent('keydown',{key:steps<0?'ArrowLeft':'ArrowRight',bubbles:true}));},hiddenIndex);await settle();
  const hiddenPoint=await canvas.evaluate((c,index)=>{const s=c._blackHoleExperimentState(),a=c._blackHoleCameraState(),i=s.fragmentIndices.indexOf(index),p=s.fragmentPositions[i],q=a.projections[i],b=c.getBoundingClientRect(),v=p.map((x,j)=>x-a.position[j]),t=Math.max(0,Math.min(1,-a.position.reduce((sum,x,j)=>sum+x*v[j],0)/v.reduce((sum,x)=>sum+x*x,0))),closest=Math.hypot(...a.position.map((x,j)=>x+t*v[j]));return {x:b.x+(q[0]+1)*b.width/2,y:b.y+(1-q[1])*b.height/2,closest};},hiddenIndex);
  assert(hiddenPoint.closest<.4,'The horizon covers the selected far-side parcel');
  await canvas.evaluate((c,index)=>c._inspectBlackHoleFragment(index),hiddenIndex);await settle();assert.equal((await camera()).marker,'hidden');assert.equal((await state()).motionIndicator.visible,false);await clear();await page.mouse.click(hiddenPoint.x,hiddenPoint.y);await settle();assert.notEqual((await state()).inspectedFragment,hiddenIndex,'Picking cannot reach a parcel through the horizon');
  await clear();await act('Follow object');await act('Above disk');await canvas.scrollIntoViewIfNeeded();await settle();
  // Picking pauses a running experiment and updates the React transport state.
  await act('Start animation');await canvas.scrollIntoViewIfNeeded();await settle();const runningPoint=await target();await page.mouse.click(runningPoint.x,runningPoint.y);await settle();s=await state();assert(s.paused&&s.inspectedFragment>=0);assert(await page.getByRole('button',{name:'Start animation',exact:true}).isVisible());const stoppedTime=s.time;await page.waitForTimeout(150);assert.equal((await state()).time,stoppedTime);
  const selected=s.inspectedFragment;await act('Light bending');assert.equal(await canvas.evaluate(c=>c._cycleBlackHoleFragment(1)),false);await act('Object experiment');assert.equal((await state()).inspectedFragment,selected);
  // Each capture shortcut uses the selected path, even before breakup.
  await mount({blackHoleDropObject:'probe',blackHoleSideways:0});await act('Release object');await page.locator('#black-hole-fragment-select').selectOption('0');await settle();s=await state();const crossing=s.fragmentCaptureTime;assert(await captureButton.isEnabled());await captureButton.click();await settle();s=await state();assert.equal(s.time,crossing);assert.equal(s.inspection.phase,'captured');assert.equal(s.localReferences,null);assert.equal(await metrics.isVisible(),false);
  await act('Release moment');assert.equal(await metrics.isVisible(),false);await act('Breakup starts');await seek((crossing-.05)/s.duration);assert((await state()).localReferences);await captureButton.click();await settle();assert.equal((await state()).time,crossing);
  const layouts=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1050});await mount({blackHoleDropObject:'star',blackHoleReleaseRadius:4,blackHoleSideways:1,blackHoleFollow:true});await act('Release object');await seek(.3);await act('Above disk');await canvas.scrollIntoViewIfNeeded();await settle();const tap=await target();assert(tap);
    if(width<1000){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tap.x,y:tap.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();}else await page.mouse.click(tap.x,tap.y);
    await settle();s=await state();assert(s.inspectedFragment>=0&&s.highlightVisible,'Touch/mouse selection at '+width);assert(s.localReferences);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(OUT,'picked-fragment-'+width+'.png')});await metrics.scrollIntoViewIfNeeded();await settle();await page.screenshot({path:path.join(OUT,'local-metrics-'+width+'.png')});layouts.push({width,overflow:false,selected:s.inspectedFragment});
  }
  await page.evaluate(()=>{document.documentElement.dir='rtl';});await metrics.scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(OUT,'metrics-rtl-320.png')});await page.evaluate(()=>{document.documentElement.dir='ltr';});
  // Probe fragments provide an opaque geometry test in addition to sprites.
  await page.setViewportSize({width:1440,height:1050});await mount({blackHoleDropObject:'probe',blackHoleSideways:0,blackHoleFollow:true});await act('Release object');await act('Breakup starts');s=await state();await seek((s.time+.1)/s.duration);const solid=await target();assert(solid);await page.mouse.click(solid.x,solid.y);await settle();assert((await state()).inspectedFragment>=0);
  // A click into empty sky leaves selection unchanged.
  await clear();await canvas.scrollIntoViewIfNeeded();await settle();const box=await canvas.boundingBox();await page.mouse.click(box.x+4,box.y+4);await settle();assert.equal((await state()).inspectedFragment,-1);
  const cleanup=await canvas.evaluate(c=>{window.__mount({simMode:'star'});return !c._pickBlackHoleFragment&&!c._cycleBlackHoleFragment&&!c._seekBlackHoleFragmentCapture&&!c.isConnected;});assert(cleanup);
  const result={errors,layouts,mousePicking:true,touchPicking:true,horizonOcclusion:true,dragPreserved:true,cancelPreserved:true,keyboardCycling:true,runningPickPauses:true,localMetrics:true,exactCaptureShortcut:true,viewPreserved:true,cleanup:true};fs.writeFileSync(path.join(OUT,'picking-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.equal(errors.length,0,errors.join('\n'));
}

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
    if(process.argv.includes('--moments')){await momentChecks(page,canvas,errors);return;}
    if(process.argv.includes('--motion')){await pickingChecks(page,canvas,errors);await motionChecks(page,canvas,errors);return;}
    if(process.argv.includes('--picking')){await pickingChecks(page,canvas,errors);return;}
    if(process.argv.includes('--debris')){await debrisChecks(page,canvas,errors);return;}
    if(process.argv.includes('--distance')||process.argv.includes('--distance-only'))await distanceChecks(page,canvas);
    if(process.argv.includes('--distance-only')){assert.equal(errors.length,0,errors.join('\n'));const result={errors,distanceChecks:true};fs.writeFileSync(path.join(OUT,'distance-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;}
    if(process.argv.includes('--planning'))await planningChecks(page,canvas);
    if(process.argv.includes('--follow'))await followChecks(page,canvas);
    if(!before){
      const stateOf=()=>canvas.evaluate(c=>c._blackHoleExperimentState());
      await page.getByRole('button',{name:'Place object',exact:true}).click();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      let box=await canvas.boundingBox();
      const cameraBefore=(await stateOf()).cameraYaw;
      await canvas.click({position:{x:box.width*.3,y:box.height*.28}});
      const placed=await stateOf();
      assert(placed.releaseRadius>=4&&placed.releaseRadius<=8);
      assert(Math.abs(placed.launchAngle-41*Math.PI/180)>.1,'Placement must change the launch point');
      assert.equal(placed.cameraYaw,cameraBefore,'Placing must not orbit the camera');
      await page.getByRole('button',{name:'Aim throw',exact:true}).click();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
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
