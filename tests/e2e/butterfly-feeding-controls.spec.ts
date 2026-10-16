import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-pollination-controls';
test.describe.configure({timeout:180000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any){
 await page.goto(harness.url+'/__harness');await page.evaluate(()=>{
  const w=window as any;w.__mount({});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','three');
 await page.evaluate(()=>{
  const w=window as any,original=w.THREE.Scene.prototype.onAfterRender;
  w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){
   if(this.getObjectByName('feeding-observation')){w.__feedingScene=this;w.__feedingRenderer=renderer;w.__feedingCamera=camera;}
   return original.call(this,renderer,scene,camera);
  };
 });
 await page.getByRole('button',{name:'Map',exact:true}).click();await page.getByRole('button',{name:'Map',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__feedingScene)).toBe(true);
}
async function openAt(page:any,name='Wild bergamot'){
 await page.getByRole('button',{name:'Visit '+name+' without flying',exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await expect(page.getByRole('region',{name:'Feeding and pollination observation',exact:true})).toBeVisible();
}
async function still(page:any){
 const button=page.getByRole('button',{name:'Show step still',exact:true});await expect(button).toBeVisible();
 // The button may become disabled naturally before a slow renderer scrolls it.
 await button.evaluate((element:HTMLButtonElement)=>element.click());await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding-progress','1.000');
}
async function scrubByKeyboard(page:any){
 const slider=page.getByRole('slider',{name:'Visit progress',exact:true});await slider.focus();await slider.press('Home');await slider.press('ArrowRight');
 await expect.poll(async()=>Number(await page.locator('.bf-stage').getAttribute('data-bf-feeding-progress'))).toBeGreaterThan(0);
 expect(Number(await page.locator('.bf-stage').getAttribute('data-bf-feeding-progress'))).toBeLessThan(1);
 return slider;
}
async function load(page:any){return page.evaluate(()=>{
 const w=window as any,root=w.__feedingScene.getObjectByName('feeding-observation'),milk=root.userData.species==='milkweed';
 const received=root.getObjectByName('feeding-pollen-deposited'),packet=root.getObjectByName('feeding-pollen-carried-pollinia'),grains=root.getObjectByName('feeding-pollen-carried-grains');
 return {contact:root.userData.contact,carrying:milk?packet.children.filter((o:any)=>o.isGroup&&o.visible).length:grains.children.filter((o:any)=>o.visible).length,received:received.visible,progress:root.userData.progress};
});}
async function camera(page:any){return page.evaluate(()=>(window as any).__feedingCamera.position.toArray());}
async function audit(page:any){expect(await page.evaluate(async()=>{
 const result=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
 return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
})).toEqual([]);}
function errorsOn(page:any){const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(m.text()))errors.push(m.text());});return errors;}

test('students can scrub, continue, change speed and inspect closeups without changing fieldwork',async({page})=>{
 const errors=errorsOn(page);await mount(page);await openAt(page);await still(page);
 const stage=page.locator('.bf-stage'),before=await page.evaluate(()=>(window as any).__toolData.butterfly);
 const position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock'),energy=await page.locator('meter').getAttribute('value');
 await page.locator('.bf-gl').evaluate((canvas:any)=>canvas.__feedingControlsIdentity=true);
 const slider=await scrubByKeyboard(page),paused=await stage.getAttribute('data-bf-feeding-progress');
 await expect(page.getByRole('button',{name:'Pause feeding motion',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Continue feeding motion',exact:true})).toBeEnabled();
 const frame=await page.evaluate(()=>(window as any).__feedingRenderer.info.render.frame);await page.waitForTimeout(250);
 expect(await stage.getAttribute('data-bf-feeding-progress')).toBe(paused);expect(await page.evaluate(()=>(window as any).__feedingRenderer.info.render.frame)).toBe(frame);
 const speed=page.getByRole('combobox',{name:'Playback speed',exact:true});await expect(speed).toHaveValue('1');await speed.selectOption('0.5');await expect(speed).toHaveValue('0.5');
 await page.getByRole('button',{name:'Continue feeding motion',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-feeding-progress'))).toBeGreaterThan(Number(paused));
 await stage.focus();await page.keyboard.press('Space');await expect(page.getByRole('button',{name:'Pause feeding motion',exact:true})).toBeDisabled();
 await speed.selectOption('2');await expect(speed).toHaveValue('2');await slider.focus();await slider.press('End');await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');
 const whole=await camera(page);await page.getByRole('button',{name:'Drinking tube close-up',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-feeding-focus','tube');await expect(page.getByRole('button',{name:'Drinking tube close-up',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await camera(page)).not.toEqual(whole);await stage.screenshot({path:shots+'/drinking-tube-closeup.png'});
 await page.getByRole('button',{name:'Pollen close-up',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding-focus','pollen');expect(await camera(page)).not.toEqual(whole);
 await page.getByRole('button',{name:'Whole visit',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding-focus','whole');expect(await camera(page)).toEqual(whole);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(before);expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await page.locator('meter').getAttribute('value')).toBe(energy);
 await expect(page.locator('.bf-gl')).toHaveJSProperty('__feedingControlsIdentity',true);await expect(page.getByRole('heading',{name:'0 of 3 patches investigated',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Return to habitat view',exact:true}).click();await openAt(page);await still(page);
 await expect(stage).toHaveAttribute('data-bf-feeding-contact','true');await expect(stage).toHaveAttribute('data-bf-feeding-focus','whole');await expect(speed).toHaveValue('1');expect(errors).toEqual([]);
});

test('a missed receptive surface retains pollen while contact transfers part of the load for both flowers',async({page})=>{
 const errors=errorsOn(page);await page.emulateMedia({reducedMotion:'reduce'});await mount(page);const stage=page.locator('.bf-stage');
 for(const [name,species,total,remaining] of [['Common milkweed','milkweed',2,1],['Wild bergamot','bergamot',9,6]] as const){
  await openAt(page,name);await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();
  await expect(stage).toHaveAttribute('data-bf-feeding','deposit');await expect(stage).toHaveAttribute('data-bf-feeding-contact','true');
  expect(await load(page)).toMatchObject({contact:true,carrying:remaining,received:true,progress:1});
  const before=await page.evaluate(()=>(window as any).__toolData.butterfly),result=page.getByRole('region',{name:'Pollen transfer result',exact:true});await expect(result).toContainText(/pollen|pollin/i);
  await page.getByRole('button',{name:'Misses receptive surface',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding-contact','false');
  await expect(page.getByRole('button',{name:'Misses receptive surface',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await load(page)).toMatchObject({contact:false,carrying:total,received:false,progress:1});await expect(result).toContainText(/no pollen|none|miss|not.*transfer/i);
  await page.getByRole('button',{name:'Pollen close-up',exact:true}).click();await stage.screenshot({path:shots+'/'+species+'-missed-contact.png'});
  await page.getByRole('button',{name:'Touches receptive surface',exact:true}).click();expect(await load(page)).toMatchObject({contact:true,carrying:remaining,received:true,progress:1});
  await stage.screenshot({path:shots+'/'+species+'-successful-contact.png'});expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(before);
  await page.getByRole('button',{name:'Misses receptive surface',exact:true}).click();await page.getByRole('button',{name:'Restart flower visit',exact:true}).click();
  await expect(stage).toHaveAttribute('data-bf-feeding','sip');await expect(stage).toHaveAttribute('data-bf-feeding-contact','true');await expect(stage).toHaveAttribute('data-bf-feeding-focus','whole');
  await page.getByRole('button',{name:'Return to habitat view',exact:true}).click();
 }
 expect(errors).toEqual([]);
});

test('mobile reduced motion allows keyboard scrubbing and preserves the comparison in the illustrated view',async({page})=>{
 const errors=errorsOn(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);await openAt(page);
 const stage=page.locator('.bf-stage');await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');
 await scrubByKeyboard(page);const progress=await stage.getAttribute('data-bf-feeding-progress');await page.waitForTimeout(200);expect(await stage.getAttribute('data-bf-feeding-progress')).toBe(progress);
 await expect(page.getByRole('button',{name:'Continue feeding motion',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Replay feeding motion',exact:true})).toBeDisabled();
 await still(page);await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();
 await page.getByRole('button',{name:'Misses receptive surface',exact:true}).click();await page.getByRole('button',{name:'Pollen close-up',exact:true}).click();await stage.screenshot({path:shots+'/mobile-pollen-comparison.png'});
 const before=await page.evaluate(()=>(window as any).__toolData.butterfly);await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(stage).toHaveAttribute('data-bf-feeding-contact','false');await expect(stage).toHaveAttribute('data-bf-feeding','deposit');
 await scrubByKeyboard(page);await expect(stage).toHaveAttribute('data-bf-feeding-contact','false');await still(page);
 await expect(page.getByRole('region',{name:'Pollen transfer result',exact:true})).toContainText(/no pollen|none|miss|not.*transfer/i);await stage.screenshot({path:shots+'/mobile-missed-contact-map.png'});
 await page.getByRole('button',{name:'Touches receptive surface',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding-contact','true');await stage.screenshot({path:shots+'/mobile-pollen-transfer-map.png'});
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);expect(errors).toEqual([]);
});
