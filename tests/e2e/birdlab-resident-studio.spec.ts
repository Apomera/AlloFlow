import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({video:'off',trace:'off',hasTouch:true});test.describe.configure({timeout:240000,retries:0});
const report=resolve('reports/avian-simulations-round33-2026-10-22/bird'),canvas='[data-birdlab-3d-canvas]';
const ids=['robin','chickadee','mourningDove','grouse','blueJay','northernCardinal','darkEyedJunco','tuftedTitmouse','easternTowhee','americanGoldfinch','easternBluebird','whiteThroatedSparrow'];
const probes=`window.AlloPostFXEnabled=false;window.studioDraws=0;window.studioTexturesDisposed=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.residentProbe={scene,camera,renderer:r};window.studioDraws++;const meshes=[];scene.traverseVisible(n=>{if(n.isMesh)meshes.push({name:n.name,uuid:n.uuid});});window.studioDraw={meshes,background:scene.background.name||'',fog:!!scene.fog,exposure:r.toneMappingExposure,key:scene.getObjectByName('birdlab-resident-studio-key')?.position.toArray()};if(scene.background.name?.startsWith('birdlab-resident-backdrop-')&&!scene.background.__watched){scene.background.__watched=true;scene.background.addEventListener('dispose',()=>window.studioTexturesDisposed++);}if(window.failResidentDraw){window.failResidentDraw=false;throw new Error('Controlled resident draw failure');}return render(scene,camera);};return r;};})();`;
const harness=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document',probes});
test.beforeAll(async()=>{mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function call(page:Page,method:string,value?:any){return page.locator(canvas).evaluate((n:any,args)=>n._birdlab3d[args.method](args.value),{method,value});}
async function step(page:Page,n=3){return page.evaluate(count=>{for(let i=0;i<count;i++)(window as any).studioStep();},n);}
async function mount(page:Page){
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});
  await page.addInitScript(()=>{let time=1000,id=0;const pending=new Map<number,FrameRequestCallback>();window.requestAnimationFrame=fn=>{pending.set(++id,fn);return id;};window.cancelAnimationFrame=id=>pending.delete(id);(window as any).studioStep=()=>{time+=100;const frames=[...pending.values()];pending.clear();frames.forEach(fn=>fn(time));};(window as any).studioPending=()=>pending.size;});
  await harness.mount(page,{birdLab:{view:'observatory3d',blXp:23,blLifeList:{}}},undefined,{expectCanvas:false});await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.residentProbe",null,{polling:50});await call(page,'seek',0);await step(page);return errors;
}
async function native(page:Page){return page.evaluate(()=>{
  const w=window as any,p=w.residentProbe,state=(document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState(),root=p.scene.getObjectByName('woodland-'+state.camera),meshes:string[]=[],resources:any[]=[];let hash=2166136261;
  function bytes(a:any){for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))hash=Math.imul(hash^b,16777619);}
  root.traverse((n:any)=>{if(n.isMesh)meshes.push(n.uuid);resources.push([n.uuid,n.geometry?.uuid,...(Array.isArray(n.material)?n.material:n.material?[n.material]:[]).map((m:any)=>[m.uuid,m.color?.getHex()])]);for(const a of Object.values(n.geometry?.attributes||{}) as any[])bytes(a.array);bytes(new Float64Array([...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray(),...(n.morphTargetInfluences||[]),n.visible?1:0]));});
  const environment:any[]=[];p.scene.traverse((n:any)=>{if(!n.name?.startsWith('birdlab-resident-studio'))environment.push([n.uuid,n.visible]);});
  return {state,hash:hash>>>0,meshes,resources,environment,background:p.scene.background.uuid||p.scene.background.getHex(),fog:p.scene.fog?.color.getHex(),exposure:p.renderer.toneMappingExposure,camera:p.camera.position.toArray(),rotation:p.camera.quaternion.toArray(),draw:w.studioDraw,calls:p.renderer.info.render.calls,memory:{...p.renderer.info.memory}};
});}
function frozen(a:any,b:any){expect(b.hash).toBe(a.hash);expect(b.resources).toEqual(a.resources);expect(b.camera).toEqual(a.camera);expect(b.rotation).toEqual(a.rotation);for(const key of ['time','pose','wildlife','position','orientation','sightings'])expect(b.state[key],key).toEqual(a.state[key]);expect(b.background).toEqual(a.background);expect(b.fog).toEqual(a.fog);expect(b.exposure).toEqual(a.exposure);}
async function capture(page:Page,selector:string,name:string){await page.locator(selector).scrollIntoViewIfNeeded();await step(page,4);const b=(await page.locator(selector).boundingBox())!,scroll=await page.evaluate(()=>({x:window.scrollX,y:window.scrollY})),cdp=await page.context().newCDPSession(page);const shot=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:b.x+scroll.x,y:b.y+scroll.y,width:b.width,height:b.height,scale:1},captureBeyondViewport:true});writeFileSync(resolve(report,name),Buffer.from(shot.data,'base64'));await cdp.detach();const png=readPng(readFileSync(resolve(report,name)));expect(png.width).toBeGreaterThan(150);expect(png.height).toBeGreaterThan(100);}
test('isolates all twelve actual residents, keeps their frozen geometry, and restores the habitat even on draw failure',async({page})=>{
  const errors=await mount(page),cases:any[]=[];
  for(const id of ids){
    await call(page,'setCamera',id);await call(page,'seek',0);await call(page,'setResidentPart','whole');await step(page);const before=await native(page);
    await call(page,'setResidentStudio',{presentation:'studio',backdrop:'teal',light:'soft'});await step(page);const studio=await native(page);frozen(before,studio);
    expect(studio.draw.meshes.length).toBeGreaterThan(0);expect(studio.draw.meshes.every((m:any)=>studio.meshes.includes(m.uuid))).toBe(true);expect(studio.draw.fog).toBe(false);expect(studio.draw.background).toBe('birdlab-resident-backdrop-teal');expect(studio.calls).toBeGreaterThan(0);
    await call(page,'setResidentStudio',{backdrop:'paper',light:'side'});await step(page);const side=await native(page);frozen(before,side);expect(side.draw.background).toBe('birdlab-resident-backdrop-paper');expect(side.draw.key).not.toEqual(studio.draw.key);
    await call(page,'setResidentStudio',{presentation:'woodland'});await step(page);const restored=await native(page);frozen(before,restored);expect(restored.draw.fog).toBe(true);expect(restored.draw.meshes.length).toBeGreaterThan(studio.draw.meshes.length);
    cases.push({id,studioMeshes:studio.draw.meshes.length,woodlandMeshes:restored.draw.meshes.length,hash:studio.hash});
  }
  await call(page,'setResidentStudio',{presentation:'studio'});await step(page);const baseline=await native(page);
  const failure=await page.evaluate(()=>{const w=window as any,c=(document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d;w.failResidentDraw=true;c.setResidentStudio({light:'soft'});try{w.studioStep();return null;}catch(e:any){return e.message;}});expect(failure).toBe('Controlled resident draw failure');frozen(baseline,await native(page));
  await call(page,'setResidentStudio',{light:'side'});await step(page);await call(page,'pinResidentShape');await call(page,'setResidentFrozenSurface',true);await step(page);expect((await native(page)).state.residentInspection.comparison.visible).toBe(true);
  expect((await native(page)).draw.meshes.some((m:any)=>m.name.includes('frozen'))).toBe(true);
  const previous=(await native(page)).state.residentInspection.studio;expect(await call(page,'setResidentStudio',{backdrop:'invalid'})).toBe(false);expect((await native(page)).state.residentInspection.studio).toEqual(previous);
  await call(page,'setPaused',false);await step(page);expect((await native(page)).draw.fog).toBe(true);expect((await native(page)).state.residentInspection.studio.active).toBe(false);
  await call(page,'setPaused',true);await step(page,12);expect(await page.evaluate(()=>(window as any).studioPending())).toBe(0);
  expect(errors).toEqual([]);writeFileSync(resolve(report,'native-residents.json'),JSON.stringify(cases,null,2));
});
test('studio controls remain usable across host sizes, keep saved overlays, and dispose both backdrops',async({page})=>{
  const errors=await mount(page),layouts:any[]=[];await call(page,'setCamera','easternBluebird');await call(page,'setResidentPart','head');await step(page);
  for(const [width,host] of [[1280,1100],[1280,500],[390,390]]){
    await page.setViewportSize({width,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>{n.style.width=w+'px';n.style.maxWidth='100%';n.setAttribute('data-stem-tool-shell','true');},host);
    await page.locator('[data-resident-presentation=studio]').focus();await page.keyboard.press('Enter');await step(page);await expect(page.locator('[data-resident-presentation=studio]')).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-resident-backdrop=paper]').click();await page.locator('[data-resident-studio-light=side]').click();await step(page);
    const checks=await page.evaluate(async()=>({controls:[...document.querySelectorAll('[data-resident-studio-controls] button')].map(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})),overflow:document.querySelector('#wrap')!.scrollWidth-document.querySelector('#wrap')!.clientWidth,violations:(await (window as any).axe.run('[data-resident-studio-controls]',{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))}));checks.controls.forEach(c=>expect(c.height).toBeGreaterThanOrEqual(44));expect(checks.overflow).toBeLessThanOrEqual(1);expect(checks.violations).toEqual([]);layouts.push({width,host,...checks});
    if(host===1100||host===390){await capture(page,canvas,`studio-${host}.png`);await capture(page,'[data-resident-studio-controls]',`controls-${host}.png`);}
  }
  await page.locator('[data-resident-backdrop=teal]').tap();await step(page);expect((await native(page)).draw.background).toBe('birdlab-resident-backdrop-teal');
  const fixed=(await native(page)).memory;for(let i=0;i<4;i++){await call(page,'setResidentStudio',{presentation:i%2?'studio':'woodland'});await step(page);}expect((await native(page)).memory).toEqual(fixed);
  await call(page,'setMode','free');await step(page);expect(await page.evaluate(()=>(window as any).studioDraw.fog)).toBe(true);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);await harness.destroy(page);await step(page,10);expect(await page.evaluate(()=>(window as any).studioPending())).toBe(0);expect(await page.evaluate(()=>(window as any).studioTexturesDisposed)).toBe(2);writeFileSync(resolve(report,'layouts.json'),JSON.stringify(layouts,null,2));
});
