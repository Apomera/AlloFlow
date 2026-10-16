import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-larval-feeding';
test.describe.configure({timeout:240000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any,saved:any){
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
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();
}
function saved(patch='milkweed'){
 return {observations:['milkweed','bergamot'],restoration:{design:'mixed',trials:[{design:'mixed',prediction:'both'}]},lifecycle:{patch,prediction:'complete',stage:'caterpillar',broods:[]}};
}
async function state(page:any){return page.evaluate(()=>(window as any).__toolData.butterfly);}
async function snapshot(page:any){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__lifeScene,root=scene.getObjectByName('followed-generation'),leaf=root.getObjectByName('larval-feeding-leaf'),larva=root.getObjectByName('lifecycle-caterpillar');
 const support:any[]=[];scene.traverse((object:any)=>{if(object.userData.larvalFeedingSupport)support.push({patch:object.userData.patch,visible:object.visible,uuid:object.uuid});});
 let area=0;const p=leaf.geometry.getAttribute('position'),index=leaf.geometry.index,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();
 const count=index?index.count:p.count;
 for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1);c.fromBufferAttribute(p,index?index.getX(i+2):i+2);area+=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()/2;}
 const contact=leaf.userData.contactWorld||null,mouth=leaf.userData.mouthWorld||null,center=contact?new T.Vector3().fromArray(contact).project(w.__lifeCamera):null,actualMouth=new T.Vector3();
 for(const name of ['caterpillar-jaw-left','caterpillar-jaw-right']){const jaw=larva.getObjectByName(name);actualMouth.add(jaw.localToWorld(new T.Vector3().fromArray(jaw.userData.tip)));}actualMouth.multiplyScalar(.5);
 return {active:root.visible&&leaf.visible,area,geometry:leaf.geometry.uuid,mesh:leaf.uuid,support,contact,mouth,actualMouth:actualMouth.toArray(),moment:root.userData.larvalFeeding,center:center?center.toArray():null,position:larva.position.toArray(),scale:larva.scale.toArray(),camera:{position:w.__lifeCamera.position.toArray(),quaternion:w.__lifeCamera.quaternion.toArray(),fov:w.__lifeCamera.fov}};
});}
async function focus(page:any,name='Leaf feeding close-up',value='feeding'){
 const button=page.getByRole('group',{name:'Life cycle views',exact:true}).getByRole('button',{name,exact:true});await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-focus',value);
}
async function endpoint(page:any,after:boolean){
 await page.getByRole('button',{name:after?'After feeding':'Before feeding',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-progress',after?'1.000':'0.000');
}
async function still(page:any){
 await page.getByRole('button',{name:'Show stage still',exact:true}).evaluate((button:HTMLButtonElement)=>button.click());await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-progress','1.000');
}
async function half(page:any){
 const slider=page.getByRole('slider',{name:'Stage illustration progress',exact:true});await slider.focus();await slider.press('Home');
 for(let i=0;i<5;i++)await slider.press('PageUp');await expect(slider).toHaveValue('50');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-progress','0.500');return slider;
}
async function audit(page:any){expect(await page.evaluate(async()=>{
 const r=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
 return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
})).toEqual([]);}
function errorsOn(page:any){const errors:string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));page.on('console',(message:any)=>{if(message.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(message.text()))errors.push(message.text());});return errors;}
function expectReplacement(frame:any){
 expect(frame.active).toBe(true);expect(frame.support.length).toBeGreaterThanOrEqual(2);expect(frame.support.filter((leaf:any)=>!leaf.visible)).toHaveLength(1);
 expect(frame.center.every(Number.isFinite)).toBe(true);expect(Math.abs(frame.center[0])).toBeLessThan(1);expect(Math.abs(frame.center[1])).toBeLessThan(1);expect(Math.abs(frame.center[2])).toBeLessThan(1);
 expect([...frame.contact,...frame.mouth].every(Number.isFinite)).toBe(true);
 expect(Math.hypot(...frame.actualMouth.map((value:number,index:number)=>value-frame.mouth[index]))).toBeLessThan(.0001);
}

test('milkweed feeding removes real leaf tissue reversibly while keyboard playback preserves the generation',async({page})=>{
 const errors=errorsOn(page);await mount(page,saved());const stage=page.locator('.bf-stage');
 await still(page);const before=await state(page),context=await snapshot(page);
 const position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock'),energy=await page.locator('meter').getAttribute('value');
 await page.locator('.bf-gl').evaluate((canvas:any)=>canvas.__feedingCanvas=true);await focus(page);await expect(stage).toHaveAttribute('data-bf-life-progress','1.000');
 const notes=page.getByRole('region',{name:'Caterpillar feeding observation',exact:true});await expect(notes).toBeVisible();await expect(notes).toContainText('Leaf tissue');
 await endpoint(page,false);await expect(notes).toContainText('Unbitten leaf edge');const intact=await snapshot(page);expectReplacement(intact);expect(intact.camera).not.toEqual(context.camera);await stage.screenshot({path:shots+'/milkweed-before-feeding.png'});
 const slider=await half(page),mid=await snapshot(page);expectReplacement(mid);expect(mid.area).toBeLessThan(intact.area);expect(mid.geometry).toBe(intact.geometry);expect(mid.mesh).toBe(intact.mesh);
 expect(mid.scale).toEqual(intact.scale);await stage.screenshot({path:shots+'/milkweed-mid-feeding.png'});
 await expect(slider).toHaveAttribute('aria-valuetext',/leaf feeding illustration/);await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();
 const frame=await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame);await page.waitForTimeout(200);expect(await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame)).toBe(frame);await expect(stage).toHaveAttribute('data-bf-life-progress','0.500');
 await endpoint(page,true);await expect(notes).toContainText('Feeding marks at the edge');const eaten=await snapshot(page);expectReplacement(eaten);expect(eaten.area).toBeLessThan(mid.area);expect(eaten.geometry).toBe(intact.geometry);expect(Math.hypot(...eaten.contact.map((value:number,index:number)=>value-eaten.mouth[index]))).toBeLessThan(.0001);await stage.screenshot({path:shots+'/milkweed-after-feeding.png'});
 await endpoint(page,false);expect((await snapshot(page)).area).toBe(intact.area);await slider.focus();await slider.press('ArrowRight');await expect(stage).toHaveAttribute('data-bf-life-progress','0.010');
 const speed=page.getByRole('combobox',{name:'Stage playback speed',exact:true});await speed.selectOption('0.5');await page.getByRole('button',{name:'Continue stage motion',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(.01);await stage.focus();await stage.press('Space');await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();
 await speed.selectOption('2');await page.getByRole('button',{name:'Replay stage motion',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-focus','feeding');await expect(speed).toHaveValue('2');await endpoint(page,true);
 expect((await snapshot(page)).area).toBe(eaten.area);await focus(page,'Plant context','context');const restored=await snapshot(page);expect(restored.active).toBe(false);expect(restored.support.every((leaf:any)=>leaf.visible)).toBe(true);expect(restored.camera).toEqual(context.camera);
 expect(await state(page)).toEqual(before);expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await page.locator('meter').getAttribute('value')).toBe(energy);
 await expect(page.locator('.bf-gl')).toHaveJSProperty('__feedingCanvas',true);expect(errors).toEqual([]);
});

test('mixed habitat replaces only its milkweed blade and restores it when leaving or changing stage',async({page})=>{
 const errors=errorsOn(page);await mount(page,saved('restoration'));const stage=page.locator('.bf-stage');
 await still(page);const before=await state(page);await focus(page);await endpoint(page,false);const intact=await snapshot(page);expectReplacement(intact);expect(intact.support.find((leaf:any)=>!leaf.visible).patch).toBe('restoration');
 await endpoint(page,true);const eaten=await snapshot(page);expect(eaten.area).toBeLessThan(intact.area);await stage.screenshot({path:shots+'/mixed-host-feeding.png'});
 await page.getByRole('button',{name:'Return to flight view',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-watch','false');const flight=await snapshot(page);
 expect(flight.active).toBe(false);expect(flight.support.every((leaf:any)=>leaf.visible)).toBe(true);expect(await state(page)).toEqual(before);
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-focus','context');await focus(page);await endpoint(page,true);
 expect((await snapshot(page)).geometry).toBe(intact.geometry);await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-stage','chrysalis');await expect(stage).toHaveAttribute('data-bf-life-focus','context');
 const chrysalis=await snapshot(page);expect(chrysalis.active).toBe(false);expect(chrysalis.support.every((leaf:any)=>leaf.visible)).toBe(true);await expect(page.getByRole('button',{name:'Leaf feeding close-up',exact:true})).toHaveCount(0);
 expect((await state(page)).lifecycle.broods).toEqual([]);expect(errors).toEqual([]);
});

test('nectar-only plants offer no leaf-feeding illustration and retain intact support leaves',async({page})=>{
 const errors=errorsOn(page);await mount(page,saved('bergamot'));const stage=page.locator('.bf-stage'),before=await state(page),initial=await snapshot(page);
 await expect(stage).toHaveAttribute('data-bf-life-stage','caterpillar');await expect(page.getByRole('button',{name:'Leaf feeding close-up',exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Caterpillar feeding observation',exact:true})).toHaveCount(0);
 await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Watch next stage',exact:true})).toBeDisabled();
 await focus(page,'Caterpillar head close-up','detail');await page.waitForTimeout(200);const current=await snapshot(page);expect(current.active).toBe(false);expect(current.area).toBe(initial.area);expect(current.support.every((leaf:any)=>leaf.visible)).toBe(true);expect(await state(page)).toEqual(before);expect(errors).toEqual([]);
});

test('mobile reduced motion retains reversible bites through illustrated fallback and 3D recovery',async({page})=>{
 const errors=errorsOn(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await mount(page,saved());
 const stage=page.locator('.bf-stage'),before=await state(page);await focus(page);const slider=await half(page),native=await snapshot(page);expectReplacement(native);await stage.screenshot({path:shots+'/mobile-feeding-3d.png'});
 for(const name of ['Continue stage motion','Replay stage motion','Pause stage motion'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();await expect(page.getByRole('combobox',{name:'Stage playback speed',exact:true})).toBeDisabled();
 await page.waitForTimeout(200);await expect(stage).toHaveAttribute('data-bf-life-progress','0.500');
 await page.evaluate(()=>{const w=window as any;w.__feedingDisposals=0;w.__lifeScene.getObjectByName('larval-feeding-leaf').geometry.addEventListener('dispose',()=>w.__feedingDisposals++);});
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(page.locator('.bf-gl')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__feedingDisposals)).toBe(1);
 await expect(stage).toHaveAttribute('data-bf-life-focus','feeding');await expect(stage).toHaveAttribute('data-bf-life-progress','0.500');
 const notes=page.getByRole('region',{name:'Caterpillar feeding observation',exact:true});await expect(notes).toBeVisible();await expect(notes).toContainText('Leaf tissue');const midMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
 await endpoint(page,false);await expect(notes).toContainText('Unbitten leaf edge');const intactMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());expect(intactMap).not.toEqual(midMap);
 await endpoint(page,true);await expect(notes).toContainText('Feeding marks at the edge');const eatenMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());expect(eatenMap).not.toEqual(intactMap);expect(eatenMap).not.toEqual(midMap);await stage.screenshot({path:shots+'/mobile-feeding-map.png'});
 await endpoint(page,false);expect(await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL())).toBe(intactMap);await half(page);await audit(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Retry 3D',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-renderer','three');await expect(stage).toHaveAttribute('data-bf-life-focus','feeding');await expect(stage).toHaveAttribute('data-bf-life-progress','0.500');
 const recovered=await snapshot(page);expectReplacement(recovered);expect(recovered.geometry).not.toBe(native.geometry);expect(recovered.area).toBe(native.area);await expect(slider).toHaveValue('50');expect(await state(page)).toEqual(before);
 await focus(page,'Plant context','context');expect((await snapshot(page)).support.every((leaf:any)=>leaf.visible)).toBe(true);expect(errors).toEqual([]);
});
