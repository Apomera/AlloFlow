import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-lifecycle-inspection';
test.describe.configure({timeout:240000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any,saved:any={observations:['milkweed']}){
 await page.goto(harness.url+'/__harness');await page.evaluate((saved:any)=>{
  const w=window as any;w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },saved);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','three');
 await page.evaluate(()=>{
  const w=window as any,original=w.THREE.Scene.prototype.onAfterRender;
  w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){
   if(this.getObjectByName('followed-generation')){w.__lifeScene=this;w.__lifeRenderer=renderer;w.__lifeCamera=camera;}
   return original.call(this,renderer,scene,camera);
  };
 });
 await page.getByRole('button',{name:'Map',exact:true}).click();await page.getByRole('button',{name:'Map',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__lifeScene)).toBe(true);
}
async function start(page:any,patch='milkweed'){
 const panel=page.getByRole('region',{name:'Life cycle investigation',exact:true});
 await panel.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption(patch);
 await panel.getByRole('combobox',{name:/Predict how far it gets/}).selectOption('complete');
 await panel.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 await expect(page.getByRole('region',{name:'Life cycle observation',exact:true})).toBeVisible();
}
async function state(page:any){return page.evaluate(()=>(window as any).__toolData.butterfly);}
async function camera(page:any){return page.evaluate(()=>{
 const c=(window as any).__lifeCamera;return {position:c.position.toArray(),rotation:c.quaternion.toArray(),fov:c.fov};
});}
async function specimenPose(page:any,id:string){return page.evaluate((id:string)=>{
 const w=window as any,root=w.__lifeScene.getObjectByName('followed-generation'),specimen=root.getObjectByName('lifecycle-'+id),bounds=new w.THREE.Box3().setFromObject(specimen);
 const rotations:any[]=[];specimen.traverse((object:any)=>{if(object.isGroup)rotations.push({name:object.name,rotation:object.rotation.toArray().slice(0,3)});});
 return {visible:root.visible&&specimen.visible,scale:specimen.scale.toArray(),position:specimen.position.toArray(),min:bounds.min.toArray(),max:bounds.max.toArray(),rotations};
},id);}
async function still(page:any){
 const button=page.getByRole('button',{name:'Show stage still',exact:true});
 await button.evaluate((element:HTMLButtonElement)=>element.click());
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-progress','1.000');
}
async function scrubStart(page:any){
 const slider=page.getByRole('slider',{name:'Stage illustration progress',exact:true});await slider.focus();await slider.press('Home');await slider.press('ArrowRight');
 await expect(slider).toHaveValue('1');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-progress','0.010');return slider;
}
async function focus(page:any,name:string,value:string){
 const button=page.getByRole('group',{name:'Life cycle views',exact:true}).getByRole('button',{name,exact:true});
 await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-focus',value);
}
async function audit(page:any){expect(await page.evaluate(async()=>{
 const result=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
 return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
})).toEqual([]);}
function errorsOn(page:any){const errors:string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));page.on('console',(message:any)=>{if(message.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(message.text()))errors.push(message.text());});return errors;}

test('all stages have distinct inspection cameras and reversible playback without changing generation evidence',async({page})=>{
 const errors=errorsOn(page);await mount(page);await start(page);const stage=page.locator('.bf-stage');
 await page.locator('.bf-gl').evaluate((canvas:any)=>canvas.__lifeInspectionIdentity=true);
 const position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock'),energy=await page.locator('meter').getAttribute('value');
 for(const [id,detail] of [['egg','Egg shell close-up'],['caterpillar','Caterpillar head close-up'],['chrysalis','Chrysalis attachment close-up'],['adult','Wing close-up']]){
  await expect(stage).toHaveAttribute('data-bf-life-stage',id);await expect(stage).toHaveAttribute('data-bf-life-focus','context');
  const moving=id==='caterpillar'||id==='adult';if(moving){await expect(page.getByRole('combobox',{name:'Stage playback speed',exact:true})).toHaveValue('1');await still(page);}
  else await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);
  const before=await state(page),context=await camera(page);expect((await specimenPose(page,id)).visible).toBe(true);
  await expect(page.getByRole('region',{name:'Stage inspection notes',exact:true})).toBeVisible();
  await focus(page,'Specimen close-up','specimen');const specimen=await camera(page);expect(specimen).not.toEqual(context);
  await focus(page,detail,'detail');const closeup=await camera(page);expect(closeup).not.toEqual(context);expect(closeup).not.toEqual(specimen);
  expect([...closeup.position,...closeup.rotation,closeup.fov].every(Number.isFinite)).toBe(true);
  await stage.screenshot({path:shots+'/'+id+'-detail.png'});
  if(moving){
   const endPose=await specimenPose(page,id),slider=await scrubStart(page),paused=await stage.getAttribute('data-bf-life-progress');
   expect(await specimenPose(page,id)).not.toEqual(endPose);await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();
   await expect(page.getByRole('button',{name:'Continue stage motion',exact:true})).toBeEnabled();
   const frame=await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame);await page.waitForTimeout(200);
   expect(await stage.getAttribute('data-bf-life-progress')).toBe(paused);expect(await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame)).toBe(frame);
   if(id==='caterpillar'){
    const pausedPose=await specimenPose(page,id);await page.emulateMedia({reducedMotion:'reduce'});
    await expect(page.getByRole('button',{name:'Continue stage motion',exact:true})).toBeDisabled();expect(await stage.getAttribute('data-bf-life-progress')).toBe(paused);expect(await specimenPose(page,id)).toEqual(pausedPose);
    await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Continue stage motion',exact:true})).toBeEnabled();
   }
   const speed=page.getByRole('combobox',{name:'Stage playback speed',exact:true});await speed.selectOption('0.5');await expect(speed).toHaveValue('0.5');
   await page.getByRole('button',{name:'Continue stage motion',exact:true}).click();await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(.01);
   await stage.focus();await stage.press('Space');await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();
   await speed.selectOption('2');await slider.focus();await slider.press('End');await expect(stage).toHaveAttribute('data-bf-life-progress','1.000');
   expect(await specimenPose(page,id)).toEqual(endPose);
   await page.getByRole('button',{name:'Replay stage motion',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-focus','detail');await expect(speed).toHaveValue('2');await still(page);
  }
  await focus(page,'Plant context','context');expect(await camera(page)).toEqual(context);
  expect(await state(page)).toEqual(before);expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await page.locator('meter').getAttribute('value')).toBe(energy);
  await expect(page.locator('.bf-gl')).toHaveJSProperty('__lifeInspectionIdentity',true);
  if(id!=='adult')await page.getByRole('button',{name:'Watch next stage',exact:true}).click();
 }
 expect((await state(page)).lifecycle.broods).toEqual([]);await expect(page.getByRole('button',{name:'Watch next stage',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Record this generation',exact:true}).click();expect((await state(page)).lifecycle.broods).toEqual([{patch:'milkweed',prediction:'complete',result:'complete'}]);
 await focus(page,'Wing close-up','detail');await page.getByRole('button',{name:'Return to flight view',exact:true}).click();await page.getByRole('button',{name:'Watch on plant',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-life-focus','context');await expect(page.getByRole('combobox',{name:'Stage playback speed',exact:true})).toHaveValue('1');expect(errors).toEqual([]);
});

test('mobile reduced motion permits real manual poses and retains inspection after context loss',async({page})=>{
 const errors=errorsOn(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await mount(page,{observations:['milkweed'],lifecycle:{patch:'milkweed',prediction:'complete',stage:'caterpillar',broods:[]}});
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();const stage=page.locator('.bf-stage');await expect(stage).toHaveAttribute('data-bf-life-progress','1.000');
 const before=await state(page),endPose=await specimenPose(page,'caterpillar'),slider=await scrubStart(page);expect(await specimenPose(page,'caterpillar')).not.toEqual(endPose);
 const progress=await stage.getAttribute('data-bf-life-progress');await page.waitForTimeout(200);expect(await stage.getAttribute('data-bf-life-progress')).toBe(progress);
 await expect(page.getByRole('button',{name:'Continue stage motion',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Replay stage motion',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();await expect(page.getByRole('combobox',{name:'Stage playback speed',exact:true})).toBeDisabled();
 await slider.press('End');expect(await specimenPose(page,'caterpillar')).toEqual(endPose);await slider.press('Home');for(let i=0;i<5;i++)await slider.press('PageUp');await expect(slider).toHaveValue('50');
 await focus(page,'Caterpillar head close-up','detail');await stage.screenshot({path:shots+'/mobile-caterpillar-3d.png'});
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(stage).toHaveAttribute('data-bf-life-progress','0.500');await expect(stage).toHaveAttribute('data-bf-life-focus','detail');
 const midMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());await slider.press('Home');
 const startMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());expect(startMap).not.toEqual(midMap);
 for(let i=0;i<5;i++)await slider.press('PageUp');await expect(stage).toHaveAttribute('data-bf-life-progress','0.500');await stage.screenshot({path:shots+'/mobile-caterpillar-map.png'});
 await expect(page.getByRole('region',{name:'Stage inspection notes',exact:true})).toBeVisible();await focus(page,'Specimen close-up','specimen');await focus(page,'Plant context','context');
 expect(await state(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page);
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await focus(page,'Chrysalis attachment close-up','detail');await stage.screenshot({path:shots+'/mobile-chrysalis-map.png'});
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-focus','context');await focus(page,'Wing close-up','detail');
 await scrubStart(page);await expect(page.getByRole('button',{name:'Replay stage motion',exact:true})).toBeDisabled();await still(page);await stage.screenshot({path:shots+'/mobile-adult-map.png'});
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
});

test('a caterpillar without host leaves can be inspected but cannot play growth or advance',async({page})=>{
 const errors=errorsOn(page);await mount(page,{observations:['bergamot']});await start(page,'bergamot');await page.getByRole('button',{name:'Watch next stage',exact:true}).click();
 const stage=page.locator('.bf-stage');await expect(stage).toHaveAttribute('data-bf-life-stage','caterpillar');const before=await state(page),pose=await specimenPose(page,'caterpillar');
 await focus(page,'Caterpillar head close-up','detail');await expect(page.getByRole('region',{name:'Stage inspection notes',exact:true})).toBeVisible();
 await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);await expect(page.getByRole('combobox',{name:'Stage playback speed',exact:true})).toHaveCount(0);
 for(const name of ['Continue stage motion','Replay stage motion','Pause stage motion','Show stage still'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Watch next stage',exact:true})).toBeDisabled();await page.waitForTimeout(200);expect(await specimenPose(page,'caterpillar')).toEqual(pose);expect(await state(page)).toEqual(before);
 await stage.screenshot({path:shots+'/blocked-caterpillar-detail.png'});await page.getByRole('button',{name:'Record this generation',exact:true}).click();
 expect((await state(page)).lifecycle.broods).toEqual([{patch:'bergamot',prediction:'complete',result:'stalls'}]);await expect(stage).toHaveAttribute('data-bf-life-stage','caterpillar');expect(errors).toEqual([]);
});
