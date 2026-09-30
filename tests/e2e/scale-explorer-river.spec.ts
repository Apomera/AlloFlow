import {test,expect} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-river');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__riverCamera=c;if(window.__riverSamples){s.traverse(function(n){if(n.name==='canyonRouteLocator'&&n.visible&&window.__riverSamples.length<500)window.__riverSamples.push(n.position.toArray());});}return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
const canvas=(p:any)=>p.locator('[data-atlas-ready]');
const route=(p:any)=>p.getByRole('region',{name:'Navigate the river',exact:true});
const slider=(p:any)=>p.getByRole('slider',{name:'Position along the illustrated river',exact:true});
async function mount(page:any,phone=false){
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize(phone?{width:320,height:780}:{width:1400,height:1100});
 await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
 await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('grand-canyon');
 await expect(canvas(page)).toHaveAttribute('data-atlas-objects','grand-canyon');
 await page.getByRole('button',{name:'Travel along the river',exact:true}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-detail','river-journey');
}
async function position(page:any){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;r.scene.traverse((n:any)=>{if(n.userData.itemId==='grand-canyon')root=n;});
 const g=root.userData.model,c=g.userData.canyon;
 return {point:c.locator.position.toArray(),aim:g.worldToLocal(new T.Vector3().fromArray(r.canvas.dataset.atlasAim.split(',').map(Number))).toArray(),scale:root.scale.x,zoom:r.canvas.dataset.atlasZoom,relief:c.land.scale.y,yaw:r.canvas.dataset.atlasYaw,visible:c.locator.visible};
});}
test('river distance guides the camera through bends without changing the measured terrain',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
 const first=await position(page);expect(first.point[0]).toBe(-.5);expect(first.visible).toBe(true);
 await expect(route(page).getByRole('button',{name:'Move back 25 km',exact:true})).toBeDisabled();
 for(const km of [111,223,335,446]){
   await slider(page).fill(String(km));await expect(canvas(page)).toHaveAttribute('data-atlas-river-km',String(km));
   const p=await position(page);expect(p.scale).toBe(first.scale);expect(p.zoom).toBe('8.00');
   expect(Math.hypot(p.aim[0]-p.point[0],p.aim[2]-p.point[2])).toBeLessThan(.0002);
   expect(looksBlank(await harness.glPixels(page))).toBe(false);
   if(km===223)await page.locator('.sx-stage').screenshot({path:path.join(out,'river-desktop.png')});
 }
 expect((await position(page)).point[0]).toBe(.5);
 await expect(route(page).getByRole('button',{name:'Move forward 25 km',exact:true})).toBeDisabled();
 await route(page).getByRole('button',{name:'Whole landscape',exact:true}).click();await expect(route(page)).toHaveCount(0);
 expect((await position(page)).visible).toBe(false);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-overview');expect(errors).toEqual([]);
});
test('phone keyboard controls stay reachable and preserve position when leaving the journey',async({page})=>{
 await mount(page,true);await expect(slider(page)).toBeFocused();await slider(page).press('End');await expect(slider(page)).toHaveValue('446');
 await slider(page).press('ArrowLeft');await expect(canvas(page)).toHaveAttribute('data-atlas-river-km','445');
 await route(page).getByRole('button',{name:'Move back 25 km',exact:true}).click();await expect(slider(page)).toHaveValue('420');
 await slider(page).fill('223');await page.locator('.sx-stage').screenshot({path:path.join(out,'river-phone.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const bounds=await route(page).boundingBox();const stage=await page.locator('.sx-stage').boundingBox();
 expect(bounds!.x).toBeGreaterThanOrEqual(stage!.x);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(stage!.x+stage!.width);
 await route(page).getByRole('button',{name:'Whole landscape',exact:true}).click();
 await page.getByRole('button',{name:'Travel along the river',exact:true}).click();await expect(slider(page)).toHaveValue('223');
 await slider(page).press('Home');await expect(slider(page)).toHaveValue('0');
 await slider(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toBeFocused();
});
test('notebook restores river position, relief and manual camera direction and exports the route context',async({page})=>{
 await mount(page);await slider(page).fill('250');
 await page.getByRole('slider',{name:'Vertical relief',exact:true}).fill('7');
 const yaw=(await position(page)).yaw;await canvas(page).focus();await canvas(page).press('d');
 await expect.poll(async()=>Math.abs(Number((await position(page)).yaw)-Number(yaw)-.12)).toBeLessThan(.0002);const saved=await position(page);
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('The river bends between layered walls.');
 await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await slider(page).fill('20');await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('moon');
 await book.locator('[data-observation="grand-canyon:river-journey"]').getByRole('button',{name:/^Return to/}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-river-km','250');await expect(slider(page)).toHaveValue('250');
 await expect.poll(()=>position(page)).toEqual(saved);
 const download=page.waitForEvent('download');await book.getByRole('button',{name:'Download notes',exact:true}).click();
 const text=readFileSync((await(await download).path())!,'utf8');expect(text).toContain('River journey: 250 km');expect(text).toContain('Vertical relief: 7×');expect(text).toContain('not a geographic coordinate');
});
test('animated travel follows the river and becomes idle with ambience paused',async({page})=>{
 await mount(page);await slider(page).fill('100');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'Pause ambience',exact:true}).click();await page.evaluate(()=>{(window as any).__riverSamples=[];});
 await slider(page).fill('350');await expect(canvas(page)).toHaveAttribute('data-atlas-river-travel-km','350.00',{timeout:15000});
 const samples=await page.evaluate(()=>(window as any).__riverSamples as number[][]);expect(samples.length).toBeGreaterThan(2);
 for(let i=1;i<samples.length;i++)expect(samples[i][0]).toBeGreaterThanOrEqual(samples[i-1][0]);
 const error=await page.evaluate(()=>{
   const w=window as any,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let river:any;r.scene.traverse((n:any)=>{if(n.name==='canyonRiver')river=n;});
   const a=river.geometry.attributes.position;let worst=0;
   for(const p of w.__riverSamples){let best=Infinity;for(let i=0;i<a.count-2;i+=2){
     const ax=a.getX(i),az=(a.getZ(i)+a.getZ(i+1))/2,bx=a.getX(i+2),bz=(a.getZ(i+2)+a.getZ(i+3))/2;
     const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((p[0]-ax)*dx+(p[2]-az)*dz)/(dx*dx+dz*dz)));
     best=Math.min(best,Math.hypot(p[0]-ax-t*dx,p[2]-az-t*dz));
   }worst=Math.max(worst,best);}return worst;
 });expect(error).toBeLessThan(.000001);
 const renders=()=>page.evaluate(()=>(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).renders);
 await expect.poll(async()=>{const n=await renders();await page.waitForTimeout(250);return await renders()===n;},{timeout:8000}).toBe(true);
 const n=await renders();await page.waitForTimeout(300);expect(await renders()).toBe(n);
 await slider(page).fill('20');await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas(page)).toHaveAttribute('data-atlas-river-travel-km','20.00');
});
test('WebGL 1 renders the route marker and scene after a river journey',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){if(type==='webgl2')return null;return(get as any).call(this,type,...args);};});
 await mount(page);await slider(page).fill('310');expect(looksBlank(await harness.glPixels(page))).toBe(false);expect((await position(page)).visible).toBe(true);
 await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('earth');await expect(route(page)).toHaveCount(0);
 await expect(canvas(page)).not.toHaveAttribute('data-atlas-river-km');expect(errors).toEqual([]);
});
