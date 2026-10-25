import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({video:'off',trace:'off',hasTouch:true});test.describe.configure({timeout:240000,retries:0});
const report=resolve('reports/avian-simulations-round35-2026-10-23/bird'),canvas='[data-birdlab-3d-canvas]';
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
async function capture(page:Page,selector:string,name:string){await page.locator(selector).scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,80)));await call(page,'setPaused',true);await step(page,4);const b=(await page.locator(selector).boundingBox())!,scroll=await page.evaluate(()=>({x:window.scrollX,y:window.scrollY})),cdp=await page.context().newCDPSession(page);const shot=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:b.x+scroll.x,y:b.y+scroll.y,width:b.width,height:b.height,scale:1},captureBeyondViewport:true});writeFileSync(resolve(report,name),Buffer.from(shot.data,'base64'));await cdp.detach();const png=readPng(readFileSync(resolve(report,name)));expect(png.width).toBeGreaterThan(150);expect(png.height).toBeGreaterThan(100);if(selector==='.birdlab-3d-stage'){let bright=0,total=0;for(let y=Math.floor(png.height*.25);y<png.height*.8;y+=3)for(let x=Math.floor(png.width*.25);x<png.width*.75;x+=3){const [r,g,b]=png.at(x,y);if(b>45&&g>40)bright++;total++;}expect(bright/total,'paused canvas contains the rendered bird and backdrop').toBeGreaterThan(.4);}}
async function state(page:Page){return call(page,'getState');}
async function target(page:Page,part:string){return page.evaluate(part=>{
  const w=window as any,T=w.THREE,p=w.residentProbe,c=document.querySelector('[data-birdlab-3d-canvas]') as any,s=c._birdlab3d.getState(),root=p.scene.getObjectByName('woodland-'+s.camera);
  const names:any={head:['woodland-head',s.camera+'-head'],wing:['woodland-right-wing',s.camera+'-wing-1'],wingB:['woodland-left-wing',s.camera+'-wing-0'],tail:['woodland-tail',s.camera+'-tail']};
  const selection=names[part].map((n:string)=>root.getObjectByName(n)).find(Boolean);if(!selection)return null;
  root.updateMatrixWorld(true);p.camera.updateMatrixWorld(true);const meshes:any[]=[],included=new Set();root.traverse((n:any)=>{if(n.isMesh)meshes.push(n);});selection.traverse((n:any)=>included.add(n.uuid));
  const bounds=new T.Box3().setFromObject(selection),lo=new T.Vector3(1,1,1),hi=new T.Vector3(-1,-1,-1),point=new T.Vector3(),ray=new T.Raycaster();
  for(let i=0;i<8;i++){point.set((i&1?bounds.max:bounds.min).x,(i&2?bounds.max:bounds.min).y,(i&4?bounds.max:bounds.min).z).project(p.camera);lo.min(point);hi.max(point);}
  const visible=(hit:any)=>{for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;const m=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;return m&&m.visible!==false&&(!m.transparent||m.opacity>0);};
  for(let row=0;row<17;row++)for(let col=0;col<17;col++){
    const x=Math.max(-.96,lo.x)+(Math.min(.96,hi.x)-Math.max(-.96,lo.x))*(col+.5)/17,y=Math.max(-.96,lo.y)+(Math.min(.96,hi.y)-Math.max(-.96,lo.y))*(row+.5)/17;
    ray.setFromCamera(new T.Vector2(x,y),p.camera);const hit=ray.intersectObjects(meshes,false).find(visible);
    if(hit&&included.has(hit.object.uuid))return{x:(x+1)/2,y:(1-y)/2,mesh:hit.object.uuid,name:hit.object.name,point:hit.point.toArray()};
  }return null;
},part);}
async function marker(page:Page,world:number[]){return page.evaluate(world=>{
 const w=window as any,p=w.residentProbe,T=w.THREE,s=(document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState(),m=s.residentInspection.exploration.marker,point=new T.Vector3().fromArray(world),q=point.clone().project(p.camera),meshes:any[]=[];
 p.scene.getObjectByName('woodland-'+s.camera).traverse((n:any)=>{if(n.isMesh)meshes.push(n);});const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(q.x,q.y),p.camera);const hit=ray.intersectObjects(meshes,false).find((hit:any)=>{for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;const mat=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;return mat&&mat.visible!==false&&(!mat.transparent||mat.opacity>0);});
 const gap=hit?hit.point.distanceTo(point):null,visible=Math.abs(q.x)<=.98&&Math.abs(q.y)<=.98&&q.z>=-1&&q.z<=1&&gap!==null&&gap<.0001;
 const projected=m?new T.Vector3().fromArray(m.world).project(p.camera):null;return{visible,gap,shown:m?[m.x,m.y]:null,projected:projected?[(projected.x+1)/2,(1-projected.y)/2]:null};
},world);}
test('visible native surfaces select all four field-mark regions across twelve residents without changing their pose',async({page})=>{
  const errors=await mount(page),checks:any[]=[];
  for(const id of ids){
    await call(page,'setCamera',id);await call(page,'setResidentExplore',true);await step(page);const before=await native(page);
    for(const part of ['head','wing','wingB','tail']){
      await call(page,'setResidentPart','whole');let hit:any=null;
      for(const view of ['side','opposite','above','rear','front']){await call(page,'setResidentView',view);await step(page);hit=await target(page,part);if(hit)break;}
      expect(hit,`${id} ${part} has a visible native surface`).toBeTruthy();
      await page.locator(canvas).scrollIntoViewIfNeeded();await step(page);const box=(await page.locator(canvas).boundingBox())!;
      await page.mouse.click(box.x+hit.x*box.width,box.y+hit.y*box.height);await step(page);
      const after=await native(page),pick=after.state.residentInspection.exploration;
      expect(after.state.residentInspection.part,`${id} selected part`).toBe(part);expect(pick.selected.mesh).toBe(hit.mesh);expect(after.hash).toBe(before.hash);expect(after.resources).toEqual(before.resources);expect(after.state.time).toBe(before.state.time);expect(after.state.wildlife).toEqual(before.state.wildlife);
      const mark=await marker(page,hit.point);expect(!!mark.shown,`${id} ${part} marker follows native visibility; gap ${mark.gap}`).toBe(mark.visible);if(mark.shown)mark.shown.forEach((v,i)=>expect(v).toBeCloseTo(mark.projected![i],8));
      checks.push({id,part,mesh:pick.selected.meshName,marker:mark,vertices:after.state.residentInspection.vertices});
    }
    await call(page,'pinResidentShape');await call(page,'setResidentFrozenSurface',true);await step(page);expect((await state(page)).residentInspection.comparison.pinned.part).toBe('tail');
    await call(page,'setResidentPart','wingB');await call(page,'pinResidentShape');await call(page,'setResidentFrozenSurface',true);await step(page);const saved=(await state(page)).residentInspection.comparison;expect(saved.pinned.part).toBe('wingB');expect(saved.pinned.triangles).toBeGreaterThan(0);expect(saved.visible).toBe(true);await call(page,'clearResidentShape');
  }
  await step(page);const draws=await page.evaluate(()=>(window as any).studioDraws);await step(page,100);expect(await page.evaluate(()=>(window as any).studioDraws)).toBe(draws);
  expect(checks.filter(c=>c.marker.visible).length).toBeGreaterThan(20);expect(errors).toEqual([]);writeFileSync(resolve(report,'native-picking.json'),JSON.stringify(checks,null,2));
});
test('touch, keyboard, orbit cancellation and responsive field-mark controls remain usable',async({page})=>{
  const errors=await mount(page);await call(page,'setCamera','easternBluebird');await page.locator('[data-resident-explore-toggle]').click();await step(page);
  await expect(page.locator('[data-resident-explore-toggle]')).toHaveAttribute('aria-pressed','true');const before=await native(page),layouts:any[]=[];
  for(const [viewport,host] of [[1280,1100],[1280,500],[390,390]]){
    await page.setViewportSize({width:viewport,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,width)=>{n.style.width=width+'px';n.style.maxWidth='100%';},host);
    await call(page,'setResidentPart','head');await call(page,'setResidentView','front');await step(page);await page.locator(canvas).scrollIntoViewIfNeeded();await step(page);
    const hit=await target(page,'head');expect(hit).toBeTruthy();const box=(await page.locator(canvas).boundingBox())!,cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+hit!.x*box.width,y:box.y+hit!.y*box.height}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await step(page);expect((await state(page)).residentInspection.exploration.selected.part).toBe('head');
    const layout=await page.locator('[data-resident-explore-controls]').evaluate(n=>({doc:document.documentElement.scrollWidth,height:n.querySelector('button')!.getBoundingClientRect().height,overflow:n.scrollWidth>n.clientWidth+1}));expect(layout.doc).toBeLessThanOrEqual(viewport);expect(layout.height).toBeGreaterThanOrEqual(44);expect(layout.overflow).toBe(false);
    const axe=await page.evaluate(async()=>(await (window as any).axe.run({include:['[data-resident-explore-controls]']},{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>v.id));expect(axe).toEqual([]);layouts.push({viewport,host,...layout,axe});
    if(host===1100||host===390){await capture(page,'.birdlab-3d-stage',`field-mark-${host}.png`);await capture(page,'[data-resident-explore-controls]',`touch-controls-${host}.png`);}
  }
  await call(page,'setResidentPart','head');await call(page,'setResidentView','front');await step(page);await page.locator(canvas).focus();await page.keyboard.press('Enter');await step(page);expect((await state(page)).residentInspection.exploration.selected).toBeTruthy();
  await call(page,'setResidentPart','whole');await step(page);await page.locator(canvas).scrollIntoViewIfNeeded();const box=(await page.locator(canvas).boundingBox())!;
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+45,box.y+box.height*.5,{steps:4});await page.mouse.up();await step(page);expect((await state(page)).residentInspection.exploration.selected).toBeNull();
  await page.mouse.click(box.x+8,box.y+box.height*.5);expect((await state(page)).camera).toBe('easternBluebird');expect((await state(page)).residentInspection.exploration.selected).toBeNull();
  await page.locator(canvas).focus();await page.keyboard.press('Escape');await step(page);expect((await state(page)).residentInspection.exploration.active).toBe(false);
  await call(page,'setResidentExplore',true);await call(page,'setResidentStudio',{presentation:'woodland'});await step(page);expect((await state(page)).residentInspection.exploration.active).toBe(false);
  await call(page,'setResidentExplore',true);await call(page,'setPaused',false);expect((await state(page)).residentInspection.exploration.active).toBe(false);await call(page,'setPaused',true);
  expect((await native(page)).hash).toBe(before.hash);expect(errors).toEqual([]);await harness.destroy(page);await step(page);expect(await page.evaluate(()=>(window as any).studioPending())).toBe(0);writeFileSync(resolve(report,'picking-layout.json'),JSON.stringify(layouts,null,2));
});
