import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-life-cycle';
test.describe.configure({timeout:180000});test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any,saved:any={},fallback=false){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(({saved,fallback})=>{
  const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test fallback'));
  w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },{saved,fallback});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');
 if(!fallback){
  await page.evaluate(()=>{const w=window as any,original=w.THREE.Scene.prototype.onAfterRender;w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){if(this.getObjectByName('followed-generation')){w.__lifeScene=this;w.__lifeRenderer=renderer;w.__lifeCamera=camera;}return original.call(this,renderer,scene,camera);};});
  await page.getByRole('button',{name:'Map',exact:true}).click();await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__lifeScene)).toBe(true);
 }
}
async function start(page:any,patch:string,guess='complete'){
 const panel=page.getByRole('region',{name:'Life cycle investigation'});
 await panel.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption(patch);
 await panel.getByRole('combobox',{name:/Predict how far it gets/}).selectOption(guess);
 await panel.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-watch','true');
}
async function expectStage(page:any,id:string){
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-stage',id);
 const frame=await page.evaluate((id:string)=>{
  const w=window as any,T=w.THREE,root=w.__lifeScene.getObjectByName('followed-generation'),specimen=root.getObjectByName('lifecycle-'+id),center=new T.Box3().setFromObject(specimen).getCenter(new T.Vector3()).project(w.__lifeCamera);
  return {root:root.visible,specimen:specimen.visible,stage:root.userData.stage,center:center.toArray(),other:['egg','caterpillar','chrysalis','adult'].filter(key=>key!==id&&root.getObjectByName('lifecycle-'+key).visible)};
 },id);
 expect(frame.root).toBe(true);expect(frame.specimen).toBe(true);expect(frame.stage).toBe(id);expect(frame.other).toEqual([]);
 expect(Math.abs(frame.center[0])).toBeLessThan(1);expect(Math.abs(frame.center[1])).toBeLessThan(1);expect(frame.center[2]).toBeGreaterThan(-1);expect(frame.center[2]).toBeLessThan(1);
}
async function audit(page:any){expect(await page.evaluate(async()=>{
 const r=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
 return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
})).toEqual([]);}
function errorLog(page:any){const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(m.text()))errors.push(m.text());});return errors;}

test('the same 3D plant shows egg, growing caterpillar, chrysalis, and emerging adult without automatic records',async({page})=>{
 const errors=errorLog(page);await mount(page,{observations:['milkweed']});const stage=page.locator('.bf-stage');
 const position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock');
 await page.locator('.bf-gl').evaluate((canvas:any)=>canvas.__generationCanvas=true);
 await start(page,'milkweed');await expectStage(page,'egg');await stage.screenshot({path:shots+'/egg-under-leaf.png'});
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await expectStage(page,'caterpillar');
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(0);
 // Space pauses the specimen directly; it remains safe if a slow renderer
 // reaches the endpoint while Playwright is moving focus to the scene.
 await stage.focus();await page.keyboard.press('Space');
 await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();
 const paused={progress:await stage.getAttribute('data-bf-life-progress'),frame:await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame)};
 await page.waitForTimeout(300);expect(await stage.getAttribute('data-bf-life-progress')).toBe(paused.progress);expect(await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame)).toBe(paused.frame);
 await page.getByRole('button',{name:'Replay stage motion',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress')),{timeout:10000}).toBe(1);
 await stage.screenshot({path:shots+'/caterpillar-on-leaf.png'});
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await expectStage(page,'chrysalis');await stage.screenshot({path:shots+'/chrysalis.png'});
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await expectStage(page,'adult');
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress')),{timeout:10000}).toBe(1);
 await stage.screenshot({path:shots+'/emerged-adult.png'});
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.lifecycle.broods)).toEqual([]);
 expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);
 await expect(stage).toHaveAttribute('data-bf-paused','true');await expect(page.locator('.bf-gl')).toHaveJSProperty('__generationCanvas',true);
 await page.getByRole('button',{name:'Record this generation',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.lifecycle.broods)).toEqual([{patch:'milkweed',prediction:'complete',result:'complete'}]);
 await expectStage(page,'adult');await page.getByRole('button',{name:'Return to flight view',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-watch','false');
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();await expectStage(page,'adult');await audit(page);expect(errors).toEqual([]);
});

test('nonhost generations stop, mixed-plot specimens use real milkweed, and saved stages survive until replanting',async({page})=>{
 const errors=errorLog(page);await mount(page,{observations:['bergamot'],restoration:{design:'mixed',trials:[{design:'mixed',prediction:'both'}]}});
 const stage=page.locator('.bf-stage');await start(page,'bergamot');await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await expectStage(page,'caterpillar');
 await expect(page.getByRole('button',{name:'Watch next stage',exact:true})).toBeDisabled();await stage.screenshot({path:shots+'/blocked-bergamot.png'});
 await page.getByRole('button',{name:'Record this generation',exact:true}).click();
 await start(page,'restoration');await expectStage(page,'egg');
 const anchor=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,root=w.__lifeScene.getObjectByName('followed-generation'),origin=root.getWorldPosition(new T.Vector3()),matrix=new T.Matrix4(),point=new T.Vector3();let nearest=Infinity;
  w.__lifeScene.getObjectByName('restoration-mixed').traverseVisible((object:any)=>{
   if(!object.isMesh||object.geometry.name!=='habitat-leaf-blade')return;
   if(object.isInstancedMesh)for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix).applyMatrix4(object.matrixWorld);nearest=Math.min(nearest,point.distanceTo(origin));}
   else{object.getWorldPosition(point);nearest=Math.min(nearest,point.distanceTo(origin));}
  });return {point:origin.toArray(),nearest};
 });
 expect(anchor.nearest).toBeLessThan(.0001);expect(anchor.point[0]).toBeCloseTo(-46,6);expect(anchor.point[1]).toBeCloseTo(2.44,6);
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();const saved=await page.evaluate(()=>(window as any).__toolData.butterfly);
 expect(saved.lifecycle.broods).toHaveLength(1);expect(saved.lifecycle.stage).toBe('caterpillar');
 await harness.destroy(page);await mount(page,saved);await page.getByRole('button',{name:'Watch on plant',exact:true}).click();await expectStage(page,'caterpillar');
 await stage.screenshot({path:shots+'/restored-mixed-caterpillar.png'});
 const design=page.getByRole('region',{name:'Habitat design activity'});await design.getByRole('button',{name:/^Plant wild bergamot/}).click();
 await design.getByRole('combobox',{name:/Predict the resources/}).selectOption('nectar');await design.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__lifeScene.getObjectByName('followed-generation').visible)).toBe(false);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.lifecycle.broods)).toHaveLength(1);
 await expect(page.getByRole('button',{name:'Watch on plant',exact:true})).toBeDisabled();expect(errors).toEqual([]);
});

test('mobile reduced-motion map retains a readable still generation and accessible controls after context loss',async({page})=>{
 const errors=errorLog(page);
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await mount(page,{observations:['milkweed'],lifecycle:{patch:'milkweed',prediction:'complete',stage:'chrysalis',broods:[]}});
 const stage=page.locator('.bf-stage');await page.getByRole('button',{name:'Watch on plant',exact:true}).click();await expectStage(page,'chrysalis');
 await stage.screenshot({path:shots+'/mobile-chrysalis-3d.png'});
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(stage).toHaveAttribute('data-bf-life-watch','true');
 await expect(stage).toHaveAttribute('data-bf-life-stage','chrysalis');await page.getByRole('button',{name:'Watch next stage',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-life-stage','adult');await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBe(1);
 const progress=await stage.getAttribute('data-bf-life-progress'),clock=await stage.getAttribute('data-clock');await page.waitForTimeout(300);
 expect(await stage.getAttribute('data-bf-life-progress')).toBe(progress);expect(await stage.getAttribute('data-clock')).toBe(clock);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await stage.screenshot({path:shots+'/mobile-map-adult.png'});await audit(page);
 await page.getByRole('button',{name:'Record this generation',exact:true}).click();expect(await page.evaluate(()=>(window as any).__toolData.butterfly.lifecycle.broods)).toHaveLength(1);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});
 await expect(page.locator('.bfl')).toHaveCSS('color','rgb(255, 255, 255)');await expect(page.locator('.bfl')).toHaveCSS('background-color','rgb(0, 0, 0)');await audit(page);expect(errors).toEqual([]);
});
