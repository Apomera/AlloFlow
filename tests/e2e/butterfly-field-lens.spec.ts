import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,width:1280,height:1000});
test.describe.configure({timeout:180000});test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
test.beforeAll(async()=>{mkdirSync('scratch/butterfly-habitat',{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:any,fallback=false,saved:any={}){
 await page.goto(harness.url+'/__harness');await page.evaluate(({fallback,saved})=>{const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test fallback'));w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});},{fallback,saved});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');
}
async function audit(page:any){expect(await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));})).toEqual([]);}
async function arrive(page:any,name:string){await page.getByRole('region',{name:'Habitat destinations'}).getByRole('button',{name:new RegExp(name)}).click();await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true',{timeout:70000});await page.getByRole('button',{name:'Land here',exact:true}).click();}

test('field lens moves only the camera, targets flowers and leaves, and retains its reading after context loss',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
 await page.evaluate(()=>{const w=window as any,after=w.THREE.Scene.prototype.onAfterRender;w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){if(this.getObjectByName('player-monarch')){w.__lensScene=this;w.__lensRenderer=renderer;w.__lensCamera=camera;}return after.call(this,renderer,scene,camera);};});
 await arrive(page,'Common milkweed');const stage=page.locator('.bf-stage'),controls=page.getByRole('group',{name:'Field lens controls'}),reading=page.getByRole('region',{name:'Field lens reading'});
 await page.locator('.bf-gl').evaluate((cv:any)=>cv.__lensIdentity=true);
 const position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock'),energy=await page.locator('meter').getAttribute('value');
 const wide=await page.evaluate(()=>(window as any).__lensCamera.position.toArray());
 await controls.getByRole('button',{name:'Flowers',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-lens','flowers');await expect(reading).toContainText('Flowers for adult feeding');
 const bloom=await page.evaluate(()=>{const w=window as any;return {point:w.__lensScene.getObjectByName('field-lens-marker').position.toArray(),camera:w.__lensCamera.position.toArray(),geometries:w.__lensRenderer.info.memory.geometries};});
 expect(bloom.camera).not.toEqual(wide);await stage.screenshot({path:'scratch/butterfly-habitat/field-lens-flowers-3d.png'});
 await controls.getByRole('button',{name:'Leaves',exact:true}).focus();await page.keyboard.press('Enter');await expect(stage).toHaveAttribute('data-bf-lens','leaves');await expect(reading).toContainText('Leaves for monarch caterpillars');
 expect(await page.evaluate(()=>(window as any).__lensScene.getObjectByName('field-lens-marker').position.y)).toBeLessThan(bloom.point[1]);
 expect(await page.evaluate(()=>(window as any).__lensScene.getObjectByName('field-lens-marker').visible)).toBe(true);
 // The marker must target an actual modeled leaf, not an approximate point in the patch.
 expect(await page.evaluate(()=>{const w=window as any,T=w.THREE,point=w.__lensScene.getObjectByName('field-lens-marker').position,matrix=new T.Matrix4(),position=new T.Vector3();let nearest=Infinity;w.__lensScene.traverseVisible((o:any)=>{if(o.isInstancedMesh&&o.geometry.name==='habitat-leaf-blade')for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix).applyMatrix4(o.matrixWorld);nearest=Math.min(nearest,position.distanceTo(point));}});return nearest;})).toBeLessThan(.00001);
 const frame=await page.evaluate(()=>(window as any).__lensRenderer.info.render.frame);await page.waitForTimeout(400);expect(await page.evaluate(()=>(window as any).__lensRenderer.info.render.frame)).toBe(frame);
 expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await page.locator('meter').getAttribute('value')).toBe(energy);
 await expect(page.getByRole('heading',{name:'0 of 3 patches investigated'})).toBeVisible();await expect(page.locator('.bf-gl')).toHaveJSProperty('__lensIdentity',true);
 expect(await page.evaluate(()=>(window as any).__lensRenderer.info.memory.geometries)).toBe(bloom.geometries);
 await stage.screenshot({path:'scratch/butterfly-habitat/field-lens-leaves-3d.png'});await audit(page);
 await page.getByRole('button',{name:'Map',exact:true}).click();await expect(reading).toContainText('outlined map patch');await expect(stage).toHaveAttribute('data-bf-lens','leaves');
 await page.getByRole('button',{name:'Map',exact:true}).click();await controls.getByRole('button',{name:'Wide view',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-lens','');expect(await page.evaluate(()=>(window as any).__lensCamera.position.toArray())).toEqual(wide);
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();await expect(page.locator('.bf-scene-bottom')).toContainText('Evidence recorded');
 await controls.getByRole('button',{name:'Leaves',exact:true}).click();await page.locator('.bf-gl').evaluate((cv:HTMLCanvasElement)=>cv.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(reading).toContainText('Leaves for monarch caterpillars');await expect(reading).toContainText('outlined map patch');await audit(page);
 await page.getByRole('button',{name:'Lift off',exact:true}).click();await expect(controls).toHaveCount(0);await expect(reading).toHaveCount(0);await expect(stage).toHaveAttribute('data-bf-lens','');expect(errors).toEqual([]);
});

test('mobile map lens follows redesigned plants, keeps predictions pending, and supports contrast themes',async({page})=>{
 await page.setViewportSize({width:375,height:900});await mount(page,true,{restoration:{design:'mixed',prediction:'both',trials:[]}});await arrive(page,'Restoration plot');
 const controls=page.getByRole('group',{name:'Field lens controls'}),reading=page.getByRole('region',{name:'Field lens reading'}),stage=page.locator('.bf-stage');
 await controls.getByRole('button',{name:'Flowers',exact:true}).click();await expect(page.locator('.bf-lens-caption')).toContainText('Wild bergamot');
 await controls.getByRole('button',{name:'Leaves',exact:true}).click();await expect(page.locator('.bf-lens-caption')).toContainText('Common milkweed');await expect(reading).toContainText('Resource present');
 await expect(page.locator('[data-design-record="mixed"]')).toContainText('Not examined');await expect(page.locator('.bf-design')).toContainText('Prediction saved');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await stage.screenshot({path:'scratch/butterfly-habitat/field-lens-mobile-map.png'});await reading.screenshot({path:'scratch/butterfly-habitat/field-lens-mobile-reading.png'});await audit(page);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);
 await page.emulateMedia({forcedColors:'active'});await audit(page);await page.emulateMedia({forcedColors:'none'});
 const design=page.getByRole('region',{name:'Habitat design activity'});
 await design.getByRole('button',{name:/^Plant wild bergamot/}).click();await design.getByRole('combobox').selectOption('nectar');await design.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
 await expect(controls).toHaveCount(0);await expect(reading).toHaveCount(0);await page.getByRole('button',{name:'Land here',exact:true}).click();await controls.getByRole('button',{name:'Leaves',exact:true}).click();
 await expect(reading).toContainText('Resource absent');await expect(reading).toContainText('These are bergamot leaves');
 await design.getByRole('button',{name:/^Keep it mown/}).click();await design.getByRole('combobox').selectOption('neither');await design.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();await controls.getByRole('button',{name:'Flowers',exact:true}).click();await expect(reading).toContainText('No nectar flowers here');
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();await expect(reading).toContainText('Evidence is already');await expect(page.locator('[data-design-record="lawn"] td').nth(0)).toContainText('Absent');
});
