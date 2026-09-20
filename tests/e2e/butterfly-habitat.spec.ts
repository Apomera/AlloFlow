import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,width:1280,height:1000});
test.describe.configure({timeout:180000});test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
test.beforeAll(async()=>{mkdirSync('scratch/butterfly-habitat',{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:any,fallback=false,saved:any={}){await page.goto(harness.url+'/__harness');await page.evaluate(({fallback,saved})=>{const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test fallback'));w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});},{fallback,saved});await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');}
async function audit(page:any){const violations=await page.evaluate(async()=>{const w=window as any,r=await w.axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));});expect(violations).toEqual([]);}
async function visit(page:any,name:string){await page.getByRole('button',{name:new RegExp(name)}).click();await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true',{timeout:70000});await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Examine patch',exact:true}).click();}
test('3D flight responds to keyboard, pauses exactly, and changes camera without changing the session',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);const stage=page.locator('.bf-stage');
 await page.locator('.bfl').screenshot({path:'scratch/butterfly-habitat/desktop.png'});await audit(page);
 const before=await stage.getAttribute('data-position');await page.getByRole('button',{name:'Take flight',exact:true}).click();await stage.focus();await page.keyboard.down('ArrowLeft');await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(before);await page.keyboard.up('ArrowLeft');await page.keyboard.press('Space');await expect(stage).toHaveAttribute('data-bf-paused','true');
 const clock=await stage.getAttribute('data-clock'),position=await stage.getAttribute('data-position');await page.getByRole('button',{name:'Meadow view',exact:true}).click();await page.getByRole('button',{name:'Map',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-renderer','map');await page.waitForTimeout(400);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await stage.getAttribute('data-position')).toBe(position);
 await page.getByRole('button',{name:'Map',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-renderer','three');expect(errors).toEqual([]);
});
test('all three guided visits create distinct evidence and survive paused WebGL loss',async({page})=>{
 await mount(page);await visit(page,'Common milkweed');await visit(page,'Wild bergamot');await visit(page,'Mown lawn');
 await expect(page.getByRole('heading',{name:'3 of 3 patches investigated'})).toBeVisible();expect(await page.evaluate(()=>(window as any).__toolData.butterfly.observations)).toEqual(['milkweed','bergamot','lawn']);
 await page.getByRole('button',{name:'No, caterpillars also need milkweed'}).click();await expect(page.locator('.bf-question [role="status"]')).toContainText('Your three observations');
 await page.locator('.bf-gl').evaluate((cv:HTMLCanvasElement)=>cv.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true');await expect(page.getByRole('heading',{name:'3 of 3 patches investigated'})).toBeVisible();await expect(page.locator('.bf-map')).toBeVisible();await audit(page);
});
test('mobile fallback retains learning, touch control, saved evidence, and readable layouts',async({page})=>{
 await page.setViewportSize({width:375,height:900});await mount(page,true,{observations:['milkweed']});await expect(page.getByRole('heading',{name:'1 of 3 patches investigated'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.locator('.bfl').screenshot({path:'scratch/butterfly-habitat/mobile-map.png'});await audit(page);
 await page.getByRole('button',{name:'Take flight',exact:true}).click();const right=page.locator('[data-direction="right"]');await right.scrollIntoViewIfNeeded();const position=await page.locator('.bf-stage').getAttribute('data-position');const box=(await right.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect.poll(()=>page.locator('.bf-stage').getAttribute('data-position')).not.toBe(position);await page.mouse.up();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true');
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__rerender();});await audit(page);
});


async function planHabitat(page:any,plan:string,prediction:string){
 const panel=page.getByRole('region',{name:'Habitat design activity'});
 await panel.getByRole('button',{name:new RegExp('^'+plan)}).click();
 await panel.getByRole('combobox',{name:/Predict the resources/}).selectOption(prediction);
 await panel.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
}
async function visitRestoration(page:any){
 await page.getByRole('button',{name:'Visit restoration plot',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true',{timeout:70000});
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();
}
test('restoration plans update the same 3D world and require a visit before recording comparisons',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
 await page.evaluate(()=>{const w=window as any,after=w.THREE.Scene.prototype.onAfterRender;w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){if(this.getObjectByName('restoration-plots')){w.__restorationScene=this;w.__restorationRenderer=renderer;}return after.call(this,renderer,scene,camera);};});
 await page.getByRole('button',{name:'Meadow view',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__restorationScene)).toBe(true);
 await page.getByRole('button',{name:'Follow view',exact:true}).click();
 await page.locator('.bf-gl').evaluate((cv:any)=>cv.__sameHabitat=true);
 const snapshot=await page.locator('.bf-stage').getAttribute('data-position'),clock=await page.locator('.bf-stage').getAttribute('data-clock');
 await planHabitat(page,'Plant wild bergamot','both');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','flowers');
 expect(await page.locator('.bf-stage').getAttribute('data-position')).toBe(snapshot);expect(await page.locator('.bf-stage').getAttribute('data-clock')).toBe(clock);
 await expect(page.locator('[data-design-record="flowers"]')).toContainText('Not examined');
 await expect.poll(()=>page.evaluate(()=>(window as any).__restorationScene.getObjectByName('restoration-flowers').visible)).toBe(true);
 const pausedFrames=await page.evaluate(()=>(window as any).__restorationRenderer.info.render.frame);await page.waitForTimeout(400);expect(await page.evaluate(()=>(window as any).__restorationRenderer.info.render.frame)).toBe(pausedFrames);
 await visitRestoration(page);
 await expect(page.locator('.bf-design-feedback')).toContainText('Different from your prediction.');
 await expect(page.locator('[data-design-record="flowers"] td').nth(0)).toContainText('Present');await expect(page.locator('[data-design-record="flowers"] td').nth(1)).toHaveText('Absent');
 const geometryCount=await page.evaluate(()=>(window as any).__restorationRenderer.info.memory.geometries);
 await planHabitat(page,'Plant milkweed','both');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-landed','');
 await expect(page.locator('[data-design-record="flowers"] td').nth(1)).toHaveText('Absent');
 await visitRestoration(page);await expect(page.locator('.bf-design-feedback')).toContainText('Prediction matched.');
 await expect(page.locator('[data-design-record="mixed"] td').nth(1)).toHaveText('Present');
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-habitat/restoration-mixed-3d.png'});
 await page.getByRole('region',{name:'Habitat design activity'}).screenshot({path:'scratch/butterfly-habitat/restoration-comparison-desktop.png'});
 await planHabitat(page,'Keep it mown','neither');await visitRestoration(page);
 await expect(page.locator('.bf-comparison caption')).toContainText('3 of 3 examined');
 await expect(page.locator('.bf-gl')).toHaveJSProperty('__sameHabitat',true);
 expect(await page.evaluate(()=>(window as any).__restorationRenderer.info.memory.geometries)).toBeLessThanOrEqual(geometryCount+2);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.observations)).toEqual([]);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.restoration.trials.length)).toBe(3);
 await audit(page);expect(errors).toEqual([]);
});
test('restoration predictions survive a restored mobile session and work in the fallback map',async({page})=>{
 await page.setViewportSize({width:375,height:900});
 await mount(page,true,{version:2,observations:['milkweed'],restoration:{design:'mixed',prediction:'both',trials:[{design:'flowers',prediction:'both'}]}});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','mixed');
 await expect(page.locator('.bf-design')).toContainText('Prediction saved.');
 await expect(page.locator('[data-design-record="mixed"]')).toContainText('Not examined');
 await visitRestoration(page);await expect(page.locator('.bf-comparison caption')).toContainText('2 of 3 examined');
 await expect(page.getByRole('heading',{name:'1 of 3 patches investigated'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('region',{name:'Habitat design activity'}).screenshot({path:'scratch/butterfly-habitat/restoration-mobile.png'});
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-habitat/restoration-map-mobile.png'});
 await audit(page);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);
 await page.getByRole('button',{name:/^Keep it mown/}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'Apply habitat plan',exact:true})).toBeDisabled();
 await page.getByRole('combobox',{name:/Predict the resources/}).selectOption('neither');await page.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','lawn');await expect(page.locator('[data-design-record="mixed"] td').nth(1)).toHaveText('Present');
});
