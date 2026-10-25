import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({video:'off',trace:'off',hasTouch:true});
test.describe.configure({timeout:300000,retries:0});
const output=resolve('reports/avian-simulations-round34-2026-10-23/raptor');
const probes=`window.AlloPostFXEnabled=false;window.cameraDraws=0;window.shapeMaterials=new Map();window.shapeDisposed=[];(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.cameraProbe={scene,camera,renderer:r};window.cameraDraws++;const root=scene.getObjectByName('raptor-head-rig')?.parent;window.shapeRender=[];if(root)root.traverse(m=>{if(!m.isMesh)return;for(const mat of Array.isArray(m.material)?m.material:[m.material]){window.shapeRender.push({mesh:m.uuid,geometry:m.geometry.uuid,material:mat.uuid,name:mat.name,opacity:mat.opacity,alphaTest:mat.alphaTest,side:mat.side,map:mat.map?.uuid});if(mat.name==='raptor-study-silhouette'&&!window.shapeMaterials.has(mat.uuid)){window.shapeMaterials.set(mat.uuid,mat);mat.addEventListener('dispose',()=>window.shapeDisposed.push(mat.uuid));}}});if(window.shapeFail){window.shapeFail=false;throw new Error('controlled studio render failure');}return render(scene,camera);};return r;};})();`;
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
async function sceneState(page:Page){return page.evaluate(()=>{const p=(window as any).cameraProbe;return{background:p.scene.background?.uuid||p.scene.background?.getHex(),fog:p.scene.fog?.color.getHex(),exposure:p.renderer.toneMappingExposure,roots:p.scene.children.map((n:any)=>[n.uuid,n.visible]),camera:p.camera.position.toArray(),quaternion:p.camera.quaternion.toArray()};});}
async function pixelCheck(page:Page,name:string){
  const data=await page.locator('[data-raptor-canvas]').evaluate((n:HTMLCanvasElement)=>n.toDataURL('image/png'));
  const buffer=Buffer.from(data.split(',')[1],'base64');writeFileSync(resolve(output,name+'.png'),buffer);
  const png=readPng(buffer);let dark=0,light=0;
  for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){const [r,g,b]=png.at(x,y);if(Math.abs(r-9)<4&&Math.abs(g-19)<4&&Math.abs(b-23)<4)dark++;if(r>200&&g>200&&b>180)light++;}
  expect(dark).toBeGreaterThan(250);expect(light).toBeGreaterThan(png.width*png.height*.25);return{width:png.width,height:png.height,dark,light};
}
test('silhouettes retain native poses, deformation, materials and saved views across three raptors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const checks:any[]=[];
  page.on('console',message=>{if(message.type()==='error'&&/THREE\.WebGLProgram|shader error|Error compiling/i.test(message.text()))errors.push(message.text());});
  for(const species of ['peregrine','osprey','greatHorned']){
    await mount(page,species,species==='peregrine'?'highStoop':'open');
    const before=await model(page),state=await sceneState(page),original=await page.evaluate(()=>(window as any).shapeRender);
    await page.locator('[data-study-rendering]').selectOption('silhouette');
    const silhouette=await page.evaluate(()=>(window as any).shapeRender);
    expect(silhouette.map((m:any)=>({...m,material:'',name:''}))).toEqual(original.map((m:any)=>({...m,material:'',name:''})));
    expect(silhouette.every((m:any)=>m.name==='raptor-study-silhouette')).toBe(true);
    expect(await model(page)).toEqual(before);expect(await sceneState(page)).toEqual(state);
    checks.push({species,pixels:await pixelCheck(page,species+'-silhouette'),materialCount:silhouette.length});
    await page.getByRole('button',{name:'Keep moment',exact:true}).click();
    const record=await page.evaluate(()=>(window as any).__toolData.raptorHunt.flightStudyMoments[0]);
    expect(record.view.lighting).toBe('silhouette');expect(record.presentationLabel).toContain('silhouette');expect(record.image).toMatch(/^data:image\/jpeg;base64,/);
    await page.locator('[data-study-rendering]').selectOption('side');await page.locator('[data-study-view=above]').click();
    await page.getByRole('button',{name:'Match saved view',exact:true}).click();
    await expect(page.locator('[data-study-rendering]')).toHaveValue('silhouette');expect(await sceneState(page)).toEqual(state);expect(await model(page)).toEqual(before);
    const warm=await page.evaluate(()=>(window as any).shapeMaterials.size);
    for(let i=0;i<3;i++){await page.locator('[data-study-rendering]').selectOption('soft');await page.locator('[data-study-rendering]').selectOption('silhouette');}
    expect(await page.evaluate(()=>(window as any).shapeMaterials.size)).toBe(warm);
    await page.locator('[data-study-rendering]').selectOption('soft');
    const restored=await page.evaluate(()=>(window as any).shapeRender);expect(restored).toEqual(original);
    const failure=await page.locator('[data-study-rendering]').evaluate((n:any)=>{(window as any).shapeFail=true;n.value='silhouette';try{n.onchange();return 'missing';}catch(e:any){return e.message;}});
    expect(failure).toBe('controlled studio render failure');expect(await model(page)).toEqual(before);expect(await sceneState(page)).toEqual(state);
    await page.locator('[data-study-rendering]').selectOption('side');await page.locator('[data-study-rendering]').selectOption('silhouette');
    for(const angle of ['above','front','behind']){await page.locator(`[data-study-view=${angle}]`).click();expect(await model(page)).toEqual(before);if(angle==='above')checks.push({species,angle,pixels:await pixelCheck(page,species+'-above')});}
    await page.getByRole('combobox',{name:'Inspect',exact:true}).selectOption('head');expect(await model(page)).toEqual(before);checks.push({species,focus:'head',pixels:await pixelCheck(page,species+'-head')});
    await page.evaluate(()=>(window as any).cameraStep(1000));const draws=await page.evaluate(()=>(window as any).cameraDraws);await page.evaluate(()=>(window as any).cameraStep(60000));expect(await page.evaluate(()=>(window as any).cameraDraws)).toBe(draws);
    await harness.destroy(page);expect(await page.evaluate(()=>(window as any).shapeDisposed.length)).toBe(warm);
  }
  expect(errors).toEqual([]);writeFileSync(resolve(output,'silhouette-native.json'),JSON.stringify(checks,null,2));
});
test('silhouette controls fit desktop, embedded and phone layouts and restore habitat rendering',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);const before=await model(page),checks:any[]=[];
  await page.locator('[data-study-fine] summary').click();
  await page.locator('[data-study-rendering]').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-study-rendering]')).toHaveValue('silhouette');
  await expect(page.locator('.rh-study-heading')).toContainText('Frozen moment · silhouette');await page.locator('[data-study-view=above]').click();
  for(const [viewport,host] of [[1280,880],[1280,500],[390,390]]){
    await page.setViewportSize({width:viewport,height:1100});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>{n.style.width=w+'px';n.style.maxWidth='100%';},host);
    await page.locator('[data-study-rendering]').selectOption('soft');await page.locator('[data-study-rendering]').selectOption('silhouette');
    const layout=await page.evaluate(()=>{const select=document.querySelector('[data-study-rendering]')!.getBoundingClientRect();return {doc:document.documentElement.scrollWidth,select:{width:select.width,height:select.height,left:select.left,right:select.right}};});
    expect(layout.doc).toBeLessThanOrEqual(viewport);expect(layout.select.height).toBeGreaterThanOrEqual(44);expect(layout.select.right).toBeLessThanOrEqual(viewport);expect(layout.select.left).toBeGreaterThanOrEqual(0);
    const axe=await page.evaluate(async()=>(await (window as any).axe.run({include:['.rh-study-header','.rh-study-panel']},{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));
    expect(axe).toEqual([]);checks.push({viewport,host,...layout,axe});
    if(host===880||host===390){
      await page.locator('[data-raptor-flight-stage]').scrollIntoViewIfNeeded();await page.locator('[data-study-rendering]').selectOption('side');await page.locator('[data-study-rendering]').selectOption('silhouette');
      const b=(await page.locator('[data-raptor-flight-stage]').boundingBox())!,scroll=await page.evaluate(()=>({x:window.scrollX,y:window.scrollY})),cdp=await page.context().newCDPSession(page);
      const shot=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:b.x+scroll.x,y:b.y+scroll.y,width:b.width,height:b.height,scale:1},captureBeyondViewport:true});writeFileSync(resolve(output,`silhouette-${host}.png`),Buffer.from(shot.data,'base64'));await cdp.detach();
    }
  }
  expect(await model(page)).toEqual(before);
  await page.getByRole('button',{name:'Habitat',exact:true}).tap();await expect(page.locator('[data-study-rendering]')).toBeDisabled();expect((await page.evaluate(()=>(window as any).shapeRender)).every((m:any)=>m.name!=='raptor-study-silhouette')).toBe(true);
  await page.getByRole('button',{name:'Studio',exact:true}).tap();await expect(page.locator('[data-study-rendering]')).toHaveValue('silhouette');
  await page.getByRole('button',{name:'Close study',exact:true}).click();expect((await page.evaluate(()=>(window as any).shapeRender)).every((m:any)=>m.name!=='raptor-study-silhouette')).toBe(true);
  expect(errors).toEqual([]);await harness.destroy(page);await page.evaluate(()=>(window as any).cameraStep(1000));expect(await page.evaluate(()=>(window as any).cameraPending())).toBe(0);
  writeFileSync(resolve(output,'silhouette-layout.json'),JSON.stringify(checks,null,2));
});
