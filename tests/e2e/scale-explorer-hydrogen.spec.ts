import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:240000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_HYDROGEN_REPORT_DIR||'reports/scale-explorer-hydrogen');
const cv=(page:Page)=>page.locator('[data-atlas-ready]');
const nav=(page:Page)=>page.getByRole('navigation',{name:'Landmark navigator',exact:true});
const panel=(page:Page)=>page.getByRole('region',{name:'Hydrogen observatory',exact:true});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const renderer=Reflect.construct(target,args),render=renderer.render;renderer.render=function(scene,camera){window.__hydrogenCamera=camera;return render.apply(this,arguments);};return renderer;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,phone=false){
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1100});
 await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
 await fly(page,'hydrogen');return errors;
}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settled(page);}
async function settled(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__hydrogenCamera,p=c.position.clone();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return p.distanceTo(c.position);})).toBeLessThan(.000001);}
async function range(locator:Locator,n:number){await locator.evaluate((el:HTMLInputElement,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},n);}
async function scene(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__hydrogenCamera;let root:any,water:any;
 rec.scene.traverse((o:any)=>{if(o.userData.itemId==='hydrogen'&&o.visible)root=o;if(o.userData.itemId==='water'&&o.visible)water=o;});
 const model=root.userData.model,d=model.userData.hydrogen,reference=model.localToWorld(new T.Vector3(-.5,0,0)).distanceTo(model.localToWorld(new T.Vector3(.5,0,0)))/root.scale.x;
 const positions=d.cloud.geometry.attributes.position.array,identity=d.objects.filter((o:any)=>o.geometry).map((o:any)=>[o.name,o.geometry.uuid,o.material.uuid]);
 let maxShellProjection=0;d.shell.updateMatrixWorld(true);for(let i=0;i<96;i++){const a=i/96*Math.PI*2,p=d.shell.localToWorld(new T.Vector3(Math.cos(a),Math.sin(a),0)).project(camera);maxShellProjection=Math.max(maxShellProjection,Math.abs(p.x),Math.abs(p.y));}
 return {stats:JSON.parse(JSON.stringify(d.stats)),type:rec.type,draws:rec.draws,identity,reference,scale:root.scale.x,ratio:water?water.scale.x/root.scale.x:null,dimension:model.userData.dimension,view:camera.type,cloud:d.cloud.visible,volume:d.volume.visible,section:d.section.visible,shell:d.shell.visible,bohr:d.bohrRing.visible,marker:d.marker.visible,points:positions.length/3,maxShellProjection,canvasHeight:rec.canvas.clientHeight,aim:document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')};
 });}
async function shot(page:Page,name:string){await settled(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png'),timeout:60000});}
test('hydrogen cloud, density section and probability guide preserve their physical scale',async({page})=>{
 const errors=await mount(page),initial=await scene(page);expect(initial.type).toBe('webgl');expect(initial.points).toBe(14000);expect(initial.reference).toBeCloseTo(1,10);expect(initial.stats.probability).toBe(90);expect(initial.cloud).toBe(true);expect(initial.maxShellProjection).toBeLessThan(.9);expect(initial.canvasHeight).toBeGreaterThan(380);
 const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);await shot(page,'hydrogen-desktop-cloud');
 await panel(page).getByRole('button',{name:'50%',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-hydrogen-probability','50');await settled(page);const half=await scene(page);expect(half.stats.selectedRadiusA0).toBeCloseTo(1.3370301569,8);expect(half.identity).toEqual(initial.identity);expect(half.scale).toBe(initial.scale);
 const slider=panel(page).getByRole('slider',{name:'Enclosed probability',exact:true});await slider.focus();await slider.press('End');await expect(slider).toHaveValue('99');await expect(cv(page)).toHaveAttribute('data-atlas-hydrogen-probability','99');await settled(page);const outer=await scene(page);expect(outer.stats.selectedRadiusA0).toBeGreaterThan(4);expect(outer.maxShellProjection).toBeLessThan(1);await shot(page,'hydrogen-desktop-99-percent');
 await panel(page).getByRole('button',{name:'Density section',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-hydrogen-view','section');await settled(page);const section=await scene(page);expect(section.section).toBe(true);expect(section.cloud).toBe(false);expect(section.volume).toBe(false);expect(section.identity).toEqual(initial.identity);await shot(page,'hydrogen-desktop-section');
 await nav(page).getByRole('button',{name:'Explore landmarks',exact:true}).click();const ids=['density','bohr-radius','probability-shell','nucleus'],views=[];
 for(let i=0;i<ids.length;i++){if(i)await nav(page).getByRole('button',{name:'Next landmark',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);await settled(page);const current=await scene(page);expect(current.identity).toEqual(initial.identity);expect(current.reference).toBeCloseTo(1,10);views.push(current);}
 await shot(page,'hydrogen-desktop-center');await nav(page).getByRole('button',{name:'Return to whole view',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-zoom','1.00');
 writeFileSync(path.join(out,'desktop.json'),JSON.stringify({initial,half,outer,section,views,errors},null,2));expect(errors).toEqual([]);
});
test('phone probability controls, saved observations and water comparison work in WebGL 1',async({page})=>{
 const errors=await mount(page,true),initial=await scene(page);expect(initial.canvasHeight).toBeGreaterThan(300);expect(initial.maxShellProjection).toBeLessThan(.94);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await shot(page,'hydrogen-phone-cloud');
 for(const label of ['Probability cloud','Density section','50%','90%','95%'])expect((await panel(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await panel(page).getByRole('button',{name:'Density section',exact:true}).tap();await panel(page).getByRole('button',{name:'95%',exact:true}).tap();await expect(cv(page)).toHaveAttribute('data-atlas-hydrogen-view','section');await range(page.getByRole('slider',{name:'Inspection magnification',exact:true}),1.8);await page.getByRole('button',{name:'Orbit left',exact:true}).click();await settled(page);
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The cloud extends beyond the reference diameter.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((n:any)=>n.itemId==='hydrogen'&&n.detailId===''));expect(saved).toMatchObject({hydrogenView:'section',hydrogenProbability:95,zoom:1.8,cutaway:false});
 await fly(page,'water');await book.locator('[data-observation="hydrogen:"]').getByRole('button',{name:/^Return to/}).click();await expect(cv(page)).toHaveAttribute('data-atlas-hydrogen-view','section');await expect(cv(page)).toHaveAttribute('data-atlas-hydrogen-probability','95');await expect(cv(page)).toHaveAttribute('data-atlas-zoom','1.80');await settled(page);const restored=await scene(page);expect(restored.stats.probability).toBe(95);expect(restored.section).toBe(true);expect(restored.identity).toEqual(initial.identity);await shot(page,'hydrogen-phone-restored');
 await book.getByRole('button',{name:'Update observation',exact:true}).click();const again=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((n:any)=>n.itemId==='hydrogen'&&n.detailId===''));expect(again.yaw).toBeCloseTo(saved.yaw,10);expect(again.pitch).toBeCloseTo(saved.pitch,10);
 const compare=page.locator('.sx-comparison-workbench');if(await compare.getAttribute('open')===null)await compare.locator(':scope > summary').click();await compare.getByRole('combobox',{name:'First thing',exact:true}).selectOption('water');await compare.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('hydrogen');await compare.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison','water:hydrogen');await settled(page);const compared=await scene(page);expect(compared.view).toBe('OrthographicCamera');expect(compared.ratio).toBeCloseTo(2.75e-10/1.06e-10,9);expect(compared.cloud).toBe(true);expect(compared.shell).toBe(false);expect(compared.bohr).toBe(false);expect(compared.marker).toBe(false);expect(compared.section).toBe(false);await expect(panel(page)).toHaveCount(0);await shot(page,'hydrogen-water-comparison');
 writeFileSync(path.join(out,'phone.json'),JSON.stringify({initial,saved,restored,again,compared,errors},null,2));expect(errors).toEqual([]);
});
