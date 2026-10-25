import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-chrysalis-maturation';
test.describe.configure({timeout:240000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

function saved(patch='milkweed'){
 return {observations:['milkweed','bergamot'],restoration:{design:'mixed',trials:[{design:'mixed',prediction:'both'}]},lifecycle:{patch,prediction:'complete',stage:'chrysalis',broods:[]}};
}
async function mount(page:any,value=saved()){
 await page.goto(harness.url+'/__harness');await page.evaluate((value:any)=>{
  const w=window as any;w.__mount({butterfly:value});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },value);
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
async function state(page:any){return page.evaluate(()=>(window as any).__toolData.butterfly);}
async function snapshot(page:any){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,root=w.__lifeScene.getObjectByName('followed-generation'),pupa=root.getObjectByName('lifecycle-chrysalis'),empty=root.getObjectByName('lifecycle-empty-case'),surface=pupa.getObjectByName('monarch-chrysalis-surface');
 function appearance(object:any){const rows:any[]=[];object.traverse((child:any)=>{if(!child.isMesh)return;const color=child.geometry.getAttribute('color');let checksum=0;if(color)for(let i=0;i<color.array.length;i++)checksum+=Math.round(color.array[i]*100000)*((i%97)+1);
  rows.push({name:child.name,visible:child.visible,colorCount:color?.count||0,colors:checksum,materials:(Array.isArray(child.material)?child.material:[child.material]).map((material:any)=>({color:material.color?.toArray(),opacity:material.opacity,transparent:material.transparent}))});});return rows;}
 const resources:any[]=[];pupa.traverse((child:any)=>{if(child.isMesh)resources.push({name:child.name,geometry:child.geometry.uuid,materials:(Array.isArray(child.material)?child.material:[child.material]).map((material:any)=>material.uuid)});});
 const center=new T.Box3().setFromObject(pupa).getCenter(new T.Vector3()).project(w.__lifeCamera),supports:any[]=[];w.__lifeScene.traverse((child:any)=>{if(child.userData.larvalFeedingSupport)supports.push(child.visible);});
 return {visible:root.visible&&pupa.visible,emptyVisible:root.visible&&empty.visible,moment:root.userData.chrysalisMaturation,surfaceGeometry:surface.geometry.uuid,surfaceColors:appearance(surface)[0].colors,appearance:appearance(pupa),emptyAppearance:appearance(empty),resources,center:center.toArray(),position:pupa.position.toArray(),scale:pupa.scale.toArray(),anchor:root.position.toArray(),supports,camera:{position:w.__lifeCamera.position.toArray(),quaternion:w.__lifeCamera.quaternion.toArray(),fov:w.__lifeCamera.fov}};
});}
async function focus(page:any,name='Chrysalis maturation close-up',value='maturation'){
 const button=page.getByRole('group',{name:'Life cycle views',exact:true}).getByRole('button',{name,exact:true});await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-focus',value);
}
async function milestone(page:any,name:string,progress:string){
 await page.getByRole('region',{name:'Chrysalis maturation observation',exact:true}).getByRole('button',{name,exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-progress',progress);
}
function expectMaturation(frame:any,phase:string){
 expect(frame.visible).toBe(true);expect(frame.moment.active).toBe(true);expect(frame.moment.phase).toBe(phase);expect(frame.center.every(Number.isFinite)).toBe(true);
 expect(Math.abs(frame.center[0])).toBeLessThan(1);expect(Math.abs(frame.center[1])).toBeLessThan(1);expect(Math.abs(frame.center[2])).toBeLessThan(1);expect(frame.supports.every(Boolean)).toBe(true);
}
async function expectUnobscuredChrysalis(page:any){
 const bounds=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,pupa=w.__lifeScene.getObjectByName('lifecycle-chrysalis'),camera=w.__lifeCamera;
  const stage=document.querySelector('.bf-stage')!.getBoundingClientRect(),caption=document.querySelector('.bf-scene-bottom')!.getBoundingClientRect(),badge=document.querySelector('.bf-scene-badge')!.getBoundingClientRect();
  let top=Infinity,bottom=-Infinity;const point=new T.Vector3();pupa.updateMatrixWorld(true);
  pupa.traverse((object:any)=>{const positions=object.geometry?.attributes.position;if(!positions)return;for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).project(camera);const y=stage.top+(1-point.y)*stage.height/2;top=Math.min(top,y);bottom=Math.max(bottom,y);}});
  return {top,bottom,caption:caption.top,badge:badge.bottom};
 });
 expect(bounds.top).toBeGreaterThan(bounds.badge+4);expect(bounds.bottom).toBeLessThan(bounds.caption-8);
}
async function audit(page:any){expect(await page.evaluate(async()=>{
 const r=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
 return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
})).toEqual([]);}
function errorsOn(page:any){const errors:string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));page.on('console',(message:any)=>{if(message.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(message.text()))errors.push(message.text());});return errors;}

test('a green chrysalis gains visible wing markings reversibly without advancing or recording its generation',async({page})=>{
 const errors=errorsOn(page);await mount(page);const stage=page.locator('.bf-stage'),before=await state(page),context=await snapshot(page);
 const position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock'),energy=await page.locator('meter').getAttribute('value');
 await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);await page.locator('.bf-gl').evaluate((canvas:any)=>canvas.__maturationCanvas=true);
 await focus(page);await expect(stage).toHaveAttribute('data-bf-life-progress','1.000');const notes=page.getByRole('region',{name:'Chrysalis maturation observation',exact:true});await expect(notes).toBeVisible();
 await milestone(page,'Green chrysalis','0.000');const green=await snapshot(page);expectMaturation(green,'green');expect(green.camera).not.toEqual(context.camera);await stage.screenshot({path:shots+'/green-chrysalis.png'});
 await milestone(page,'Wing markings appear','0.600');const markings=await snapshot(page);expectMaturation(markings,'markings');expect(markings.surfaceColors).not.toBe(green.surfaceColors);expect(markings.resources).toEqual(green.resources);await stage.screenshot({path:shots+'/wing-markings-appear.png'});
 await milestone(page,'Before emergence','1.000');const patterned=await snapshot(page);expectMaturation(patterned,'pattern');expect(patterned.surfaceColors).not.toBe(markings.surfaceColors);expect(patterned.surfaceColors).not.toBe(green.surfaceColors);await expect(notes).toContainText('Wing pattern visible');await stage.screenshot({path:shots+'/before-emergence.png'});
 expect(patterned.resources).toEqual(green.resources);expect(patterned.position).toEqual(green.position);expect(patterned.scale).toEqual(green.scale);expect(patterned.emptyAppearance).toEqual(context.emptyAppearance);
 await milestone(page,'Green chrysalis','0.000');expect((await snapshot(page)).appearance).toEqual(green.appearance);const slider=page.getByRole('slider',{name:'Stage illustration progress',exact:true});await slider.focus();await slider.press('ArrowRight');await expect(slider).toHaveValue('1');
 await expect(slider).toHaveAttribute('aria-valuetext',/chrysalis appearance illustration/);await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();
 const frame=await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame);await page.waitForTimeout(200);expect(await page.evaluate(()=>(window as any).__lifeRenderer.info.render.frame)).toBe(frame);await expect(stage).toHaveAttribute('data-bf-life-progress','0.010');
 const speed=page.getByRole('combobox',{name:'Stage playback speed',exact:true});await speed.selectOption('0.5');await page.getByRole('button',{name:'Continue stage motion',exact:true}).click();await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(.01);
 await focus(page,'Chrysalis attachment close-up','detail');const stopped=await stage.getAttribute('data-bf-life-progress');await expect(slider).toHaveCount(0);await page.waitForTimeout(200);expect(await stage.getAttribute('data-bf-life-progress')).toBe(stopped);expect((await snapshot(page)).appearance).toEqual(context.appearance);
 await focus(page);expect(await stage.getAttribute('data-bf-life-progress')).toBe(stopped);await milestone(page,'Green chrysalis','0.000');await page.getByRole('button',{name:'Continue stage motion',exact:true}).click();await stage.focus();await stage.press('Space');await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();await speed.selectOption('2');await page.getByRole('button',{name:'Replay stage motion',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-focus','maturation');await expect(speed).toHaveValue('2');await milestone(page,'Before emergence','1.000');expect((await snapshot(page)).appearance).toEqual(patterned.appearance);
 await focus(page,'Chrysalis attachment close-up','detail');await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);expect((await snapshot(page)).appearance).toEqual(context.appearance);expect((await snapshot(page)).moment).toBeNull();
 await focus(page,'Plant context','context');expect((await snapshot(page)).camera).toEqual(context.camera);expect(await state(page)).toEqual(before);expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await page.locator('meter').getAttribute('value')).toBe(energy);
 await expect(page.locator('.bf-gl')).toHaveJSProperty('__maturationCanvas',true);expect(errors).toEqual([]);
});

test('mixed-host maturation stays attached to its plant and cannot darken the adult empty case',async({page})=>{
 const errors=errorsOn(page);await mount(page,saved('restoration'));const stage=page.locator('.bf-stage'),before=await state(page),context=await snapshot(page);
 expect(context.anchor[0]).toBeCloseTo(-46,6);expect(context.anchor[1]).toBeCloseTo(2.44,6);await focus(page);await milestone(page,'Before emergence','1.000');const matured=await snapshot(page);expectMaturation(matured,'pattern');expect(matured.anchor).toEqual(context.anchor);expect(matured.emptyAppearance).toEqual(context.emptyAppearance);await stage.screenshot({path:shots+'/mixed-host-before-emergence.png'});
 await page.getByRole('button',{name:'Return to flight view',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-watch','false');const flight=await snapshot(page);expect(flight.appearance).toEqual(context.appearance);expect(flight.moment).toBeNull();expect(await state(page)).toEqual(before);
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-focus','context');await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);await focus(page);await milestone(page,'Before emergence','1.000');expect((await snapshot(page)).resources).toEqual(context.resources);
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-life-stage','adult');await expect(stage).toHaveAttribute('data-bf-life-focus','context');await expect(page.getByRole('button',{name:'Chrysalis maturation close-up',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Show stage still',exact:true}).evaluate((button:HTMLButtonElement)=>button.click());const adult=await snapshot(page);expect(adult.visible).toBe(false);expect(adult.emptyVisible).toBe(true);expect(adult.emptyAppearance).toEqual(context.emptyAppearance);expect(adult.moment).toBeNull();expect((await state(page)).lifecycle.broods).toEqual([]);await stage.screenshot({path:shots+'/adult-with-empty-case.png'});expect(errors).toEqual([]);
});

test('a non-host saved chrysalis is constrained to an unfed caterpillar with no maturation controls',async({page})=>{
 const errors=errorsOn(page);await mount(page,saved('bergamot'));const stage=page.locator('.bf-stage'),before=await state(page),initial=await snapshot(page);
 await expect(stage).toHaveAttribute('data-bf-life-stage','caterpillar');await expect(page.getByRole('button',{name:'Chrysalis maturation close-up',exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Chrysalis maturation observation',exact:true})).toHaveCount(0);
 await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Watch next stage',exact:true})).toBeDisabled();await focus(page,'Caterpillar head close-up','detail');
 const current=await snapshot(page);expect(current.visible).toBe(false);expect(current.moment).toBeNull();expect(current.appearance).toEqual(initial.appearance);expect(current.emptyAppearance).toEqual(initial.emptyAppearance);expect(await state(page)).toEqual(before);expect(errors).toEqual([]);
});

test('mobile reduced motion preserves manual maturation through map fallback, accessibility modes, and 3D recovery',async({page})=>{
 const errors=errorsOn(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);const stage=page.locator('.bf-stage'),before=await state(page);
 await focus(page);await milestone(page,'Wing markings appear','0.600');const native=await snapshot(page);expectMaturation(native,'markings');await expectUnobscuredChrysalis(page);await stage.screenshot({path:shots+'/mobile-maturation-3d.png'});
 for(const name of ['Continue stage motion','Replay stage motion','Pause stage motion'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();const reducedSpeed=page.getByRole('combobox',{name:'Stage playback speed',exact:true});await expect(reducedSpeed).toBeEnabled();await reducedSpeed.selectOption('0.5');await expect(reducedSpeed).toHaveValue('0.5');const configuredMoment=await stage.getAttribute('data-bf-life-progress');await page.waitForTimeout(200);expect(await stage.getAttribute('data-bf-life-progress')).toBe(configuredMoment);
 const slider=page.getByRole('slider',{name:'Stage illustration progress',exact:true});await slider.focus();await slider.press('Home');await slider.press('ArrowRight');await expect(slider).toHaveValue('1');await page.waitForTimeout(200);await expect(stage).toHaveAttribute('data-bf-life-progress','0.010');await milestone(page,'Wing markings appear','0.600');
 await page.evaluate(()=>{const w=window as any;w.__maturationDisposals={};const seen=new Set();w.__lifeScene.getObjectByName('lifecycle-chrysalis').traverse((child:any)=>{if(!child.geometry||seen.has(child.geometry))return;seen.add(child.geometry);w.__maturationDisposals[child.geometry.uuid]=0;child.geometry.addEventListener('dispose',()=>w.__maturationDisposals[child.geometry.uuid]++);});});
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(page.locator('.bf-gl')).toHaveCount(0);
 const disposals=await page.evaluate(()=>Object.values((window as any).__maturationDisposals));expect(disposals.length).toBeGreaterThan(0);expect(disposals.every(count=>count===1)).toBe(true);await expect(stage).toHaveAttribute('data-bf-life-focus','maturation');await expect(stage).toHaveAttribute('data-bf-life-progress','0.600');
 const midMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());await stage.screenshot({path:shots+'/mobile-wing-markings-map.png'});await milestone(page,'Green chrysalis','0.000');const greenMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());expect(greenMap).not.toEqual(midMap);
 await milestone(page,'Before emergence','1.000');const lateMap=await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());expect(lateMap).not.toEqual(greenMap);expect(lateMap).not.toEqual(midMap);await expect(page.getByRole('region',{name:'Chrysalis maturation observation',exact:true})).toContainText('Wing pattern visible');await stage.screenshot({path:shots+'/mobile-before-emergence-map.png'});
 await milestone(page,'Green chrysalis','0.000');expect(await page.locator('.bf-map').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL())).toBe(greenMap);await milestone(page,'Wing markings appear','0.600');await audit(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Retry 3D',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-renderer','three');await expect(stage).toHaveAttribute('data-bf-life-focus','maturation');await expect(stage).toHaveAttribute('data-bf-life-progress','0.600');const recovered=await snapshot(page);expectMaturation(recovered,'markings');expect(recovered.surfaceGeometry).not.toBe(native.surfaceGeometry);expect(recovered.appearance).toEqual(native.appearance);expect(await state(page)).toEqual(before);
 await expectUnobscuredChrysalis(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Map',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await page.getByRole('combobox',{name:'Stage playback speed',exact:true}).selectOption('2');
 await milestone(page,'Green chrysalis','0.000');await page.evaluate(()=>{const w=window as any;w.__maturationFrameGaps=[];let last=0;function sample(now:number){if(last)w.__maturationFrameGaps.push(now-last);last=now;w.__maturationFrameRaf=requestAnimationFrame(sample);}w.__maturationFrameRaf=requestAnimationFrame(sample);});
 await page.getByRole('button',{name:'Replay stage motion',exact:true}).click();await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(0);
 await expect(stage).toHaveAttribute('data-bf-life-progress','1.000');await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();expect(await state(page)).toEqual(before);
 console.log('Illustrated maturation playback frame gaps (ms)',await page.evaluate(()=>{const w=window as any;cancelAnimationFrame(w.__maturationFrameRaf);const gaps=w.__maturationFrameGaps.sort((a:number,b:number)=>a-b);return {samples:gaps.length,median:gaps[Math.floor(gaps.length/2)],worst:gaps[gaps.length-1]};}));
 await page.getByRole('button',{name:'Map',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-renderer','three');
 await focus(page,'Chrysalis attachment close-up','detail');await expect(page.getByRole('slider',{name:'Stage illustration progress',exact:true})).toHaveCount(0);expect((await snapshot(page)).moment).toBeNull();expect(errors).toEqual([]);
});
