import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({video:'off',trace:'off',hasTouch:true});
test.describe.configure({timeout:300000,retries:0});
const output=resolve(process.env.AVIAN_REPORT_DIR ? process.env.AVIAN_REPORT_DIR + '/camera' : 'reports/avian-simulations-round32-2026-10-22/raptor');
const probes=`window.AlloPostFXEnabled=false;window.cameraDraws=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.cameraProbe={scene,camera,renderer:r};window.cameraDraws++;return render(scene,camera);};return r;};})();`;
const harness=new GlHarness({toolId:'raptorHunt',toolFile:'stem_lab/stem_tool_raptorhunt.js',width:880,height:680,appStyles:true,probes,extraScripts:['node_modules/axe-core/axe.min.js']});
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test.beforeEach(async({page})=>{
  await page.setViewportSize({width:1060,height:1100});
  await page.addInitScript(()=>{let now=1000,next=0,seed=731;const pending=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>now;window.requestAnimationFrame=fn=>{pending.set(++next,fn);return next;};window.cancelAnimationFrame=id=>pending.delete(id);(window as any).cameraStep=(ms=25)=>{now+=ms;const frames=[...pending.values()];pending.clear();frames.forEach(fn=>fn(now));};(window as any).cameraPending=()=>pending.size;});
});
async function mount(page:Page,species='peregrine',mission='highStoop'){
  await harness.mount(page,{raptorHunt:{activeSection:'hunt',activeMission:mission,selectedSpecies:species,flightSession:{speciesId:species,missionId:mission},huntTutorialDismissed:true,graphicsQuality:'low'}},undefined,{expectCanvas:false});
  await page.waitForFunction(()=>!!(window as any).cameraProbe&&!!(document.querySelector('[data-raptor-canvas]') as any)?._rhSnapshot,null,{polling:50,timeout:60000});
  await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:0,dayPhase:.44,cloudCover:.15});for(let i=0;i<8;i++)(window as any).cameraStep(25);});
  await page.locator('[data-raptor-study-button]').click();await page.locator('[data-study-fine] summary').click();
  await expect(page.locator('[data-study-fine]')).toHaveAttribute('open','');
}
async function model(page:Page){return page.evaluate(()=>{
  const w=window as any,s=(document.querySelector('[data-raptor-canvas]') as any)._rhSnapshot(),root=w.cameraProbe.scene.getObjectByName('raptor-head-rig').parent,parts:any[]=[];
  const hash=(a:any)=>{let h=2166136261;for(const n of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))h=Math.imul(h^n,16777619);return h>>>0;};
  root.traverse((m:any)=>{if(m.isMesh)parts.push({id:m.uuid,geometry:m.geometry.uuid,position:m.position.toArray(),rotation:m.rotation.toArray(),scale:m.scale.toArray(),morphs:m.morphTargetInfluences?.slice(),buffers:Object.entries(m.geometry.attributes).map(([k,a]:any)=>[k,hash(a.array)]),material:(Array.isArray(m.material)?m.material:[m.material]).map((v:any)=>[v.uuid,v.color?.getHex(),v.opacity])});});
  return {clock:s.motionTimeMs,position:s.raptorPosition,heading:s.headingRadians,pitch:s.pitchRadians,wing:s.wingAngle,speed:s.speedMps,stamina:s.stamina,parts};
});}
async function verify(page:Page){
  const info=await page.evaluate(()=>{
    const w=window as any,c=w.cameraProbe.camera,s=(document.querySelector('[data-raptor-canvas]') as any)._rhSnapshot(),svg=document.querySelector('[data-study-compass]')!,dot=svg.querySelector('circle[data-study-compass-camera]') as SVGCircleElement;
    // Camera local +Z points backward from its look direction. This is independent
    // of the feature's target-coordinate and requested-angle calculations.
    const e=c.matrixWorld.elements,back=[e[8],e[9],e[10]],length=Math.hypot(...back),heading=s.headingRadians;
    const bearing=Math.atan2(Math.sin(Math.atan2(back[0],-back[2])-heading),Math.cos(Math.atan2(back[0],-back[2])-heading));
    return {actual:{bearing,elevation:Math.asin(back[1]/length)},shown:{bearing:Number(svg.getAttribute('data-bearing')),elevation:Number(svg.getAttribute('data-elevation'))},dot:[dot.cx.baseVal.value,dot.cy.baseVal.value],requested:Number((document.querySelector('[data-study-angle=elevation]') as HTMLInputElement).value),bearingInput:Number((document.querySelector('[data-study-angle=bearing]') as HTMLInputElement).value),label:svg.getAttribute('aria-label'),camera:c.position.toArray(),quaternion:c.quaternion.toArray(),draws:w.cameraDraws};
  });
  expect(info.shown.bearing).toBeCloseTo(info.actual.bearing,9);expect(info.shown.elevation).toBeCloseTo(info.actual.elevation,9);
  expect(info.dot[0]).toBeCloseTo(90+60*Math.sin(info.actual.bearing)*Math.cos(info.actual.elevation),4);
  expect(info.dot[1]).toBeCloseTo(90-60*Math.cos(info.actual.bearing)*Math.cos(info.actual.elevation),4);
  expect(info.label).toContain('Actual camera:');return info;
}
async function setAngles(page:Page,bearing:number,elevation:number){
  await page.locator('[data-study-angle=bearing]').fill(String(bearing));
  // Native input sanitization uses the fractional focus-dependent minimum.
  await page.locator('[data-study-angle=elevation]').evaluate((n:HTMLInputElement,value)=>{n.value=String(value);n.dispatchEvent(new Event('input',{bubbles:true}));},elevation);
}
test('native camera compass follows custom angles, preset/part changes and saved views without changing the frozen bird',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const checks:any[]=[];
  for(const species of ['peregrine','osprey','greatHorned']){
    await mount(page,species,species==='peregrine'?'highStoop':'open');const before=await model(page);
    for(const [bearing,elevation] of [[-135,12],[42,65],[178,80]]){await setAngles(page,bearing,elevation);checks.push({species,...await verify(page)});expect(await model(page)).toEqual(before);await expect(page.locator('[data-study-view][aria-pressed=true]')).toHaveCount(0);}
    await page.getByRole('combobox',{name:'Inspect',exact:true}).selectOption('head');await setAngles(page,-72,-35);checks.push({species,focus:'head',...await verify(page)});expect(await model(page)).toEqual(before);
    await page.getByRole('button',{name:'Keep moment',exact:true}).click();await expect(page.getByRole('button',{name:'Moment kept',exact:true})).toBeDisabled();
    const saved=await verify(page),record=await page.evaluate(()=>(window as any).__toolData.raptorHunt.flightStudyMoments[0]);expect(record.view.preset).toBe('');expect(record.view.focus).toBe('head');expect(record.image).toMatch(/^data:image\/jpeg;base64,/);
    await page.locator('[data-study-view=above]').click();await verify(page);
    await page.getByRole('combobox',{name:'Inspect',exact:true}).selectOption('whole');await expect(page.locator('[data-study-angle=elevation]')).toHaveAttribute('min',String(.08*180/Math.PI));
    await page.getByRole('button',{name:'Match saved view',exact:true}).click();const restored=await verify(page);expect(restored.camera).toEqual(saved.camera);expect(restored.quaternion).toEqual(saved.quaternion);expect(await model(page)).toEqual(before);
    await page.evaluate(()=>(window as any).cameraStep(1000));const draws=await page.evaluate(()=>(window as any).cameraDraws);await page.evaluate(()=>(window as any).cameraStep(60000));expect(await page.evaluate(()=>(window as any).cameraDraws)).toBe(draws);
    expect(await model(page)).toEqual(before);await harness.destroy(page);
  }
  expect(errors).toEqual([]);writeFileSync(resolve(output,'native-camera.json'),JSON.stringify(checks,null,2));
});
test('fine controls retain an open bird viewport, support keyboard and touch, and dispose cleanly',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);const before=await model(page),layouts:any[]=[];
  await page.locator('[data-study-angle=bearing]').focus();await page.keyboard.press('Home');expect((await verify(page)).bearingInput).toBe(-180);await page.keyboard.press('End');expect((await verify(page)).bearingInput).toBe(180);
  await page.locator('[data-study-angle=bearing]').press('ArrowLeft');expect((await verify(page)).bearingInput).toBeCloseTo(179.9,1);
  for(const [viewport,host] of [[1280,880],[1280,500],[390,390]]){
    await page.setViewportSize({width:viewport,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,width)=>{n.style.width=width+'px';n.style.maxWidth='100%';},host);
    await setAngles(page,42,25);await verify(page);
    const layout=await page.evaluate(()=>{const stage=document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect(),panel=document.querySelector('.rh-study-panel')!.getBoundingClientRect(),header=document.querySelector('.rh-study-header')!.getBoundingClientRect();return {stage:{x:stage.x,y:stage.y,width:stage.width,height:stage.height},gap:panel.top-header.bottom,doc:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('[data-study-fine] input,[data-study-fine] summary')].map(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width}))};});
    expect(layout.gap).toBeGreaterThan(110);expect(layout.doc).toBeLessThanOrEqual(viewport);layout.controls.forEach(c=>{expect(c.height).toBeGreaterThanOrEqual(44);expect(c.width).toBeGreaterThan(30);});
    const axe=await page.evaluate(async()=>(await (window as any).axe.run({include:['.rh-study-header','.rh-study-panel']},{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));
    expect(axe).toEqual([]);layouts.push({viewport,host,...layout,axe});
    if(host===880||host===390){await page.locator('[data-study-fine]').evaluate(n=>n.scrollIntoView({block:'nearest',behavior:'instant'}));await setAngles(page,42,25);const b=(await page.locator('[data-raptor-flight-stage]').boundingBox())!,cdp=await page.context().newCDPSession(page);const scroll=await page.evaluate(()=>({x:window.scrollX,y:window.scrollY}));const capture=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:b.x+scroll.x,y:b.y+scroll.y,width:b.width,height:b.height,scale:1},captureBeyondViewport:true});const path=resolve(output,`raptor-${host}.png`);writeFileSync(path,Buffer.from(capture.data,'base64'));const png=readPng(readFileSync(path));expect(png.width).toBeGreaterThan(300);expect(png.height).toBeGreaterThan(500);await cdp.detach();}
  }
  await page.locator('[data-study-angle=bearing]').scrollIntoViewIfNeeded();const b=(await page.locator('[data-study-angle=bearing]').boundingBox())!,cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width*.35,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();const touched=await verify(page);expect(touched.bearingInput).toBeLessThan(0);expect(await model(page)).toEqual(before);
  await page.getByRole('button',{name:'Restart this flight',exact:true}).click();await page.waitForFunction(()=>!!(document.querySelector('[data-raptor-canvas]') as any)?._rhSnapshot,null,{polling:50});await expect(page.locator('[data-study-fine]')).toHaveCount(1);await page.locator('[data-raptor-study-button]').click();await expect(page.locator('[data-study-fine]')).not.toHaveAttribute('open','');
  expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);await harness.destroy(page);await page.evaluate(()=>(window as any).cameraStep(1000));expect(await page.evaluate(()=>(window as any).cameraPending())).toBe(0);
  writeFileSync(resolve(output,'interaction-layout.json'),JSON.stringify(layouts,null,2));
});
