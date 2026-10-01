import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('breeze changes rendered foliage while pause, rewind, still and reduced motion remain deterministic',async({page})=>{
  page.setDefaultTimeout(120000);
  const shaderErrors:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/shader|validate_status|webglprogram/i.test(m.text()))shaderErrors.push(m.text());});
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{
    document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
    const w=window as any,p=w.THREE.Object3D.prototype,update=p.updateMatrixWorld;w.__breezeMaterials=null;
    p.updateMatrixWorld=function(force:any){const result=update.call(this,force);if(this.isScene){const materials=new Set<any>();this.traverse((o:any)=>{if(o.material?.userData?.ecoBreeze)materials.add(o.material);});w.__breezeMaterials=Array.from(materials).map((m:any)=>({kind:m.userData.ecoBreeze.kind,time:m.userData.ecoBreeze.uniforms.ecoBreezeTime.value,amount:m.userData.ecoBreeze.uniforms.ecoBreezeAmount.value})).sort((a,b)=>a.kind.localeCompare(b.kind));}return result;};
  });
  await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage'),motion=meadow.getByLabel('Foliage motion',{exact:true});
  await expect(motion).toHaveValue('breeze');await expect(meadow.locator('[data-efw-foliage-help]')).toContainText('Run a comparison');
  await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();const timeline=meadow.getByLabel('Meadow timeline',{exact:true});await timeline.fill('80');await meadow.getByRole('button',{name:'Forest overview',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run));
  const expected=[{kind:'grass',time:8,amount:1},{kind:'leaves',time:8,amount:1}];expect(await page.evaluate(()=>(window as any).__breezeMaterials)).toEqual(expected);
  // Compare the rendered scene exactly, excluding unrelated HUD-edge antialiasing.
  const breeze=await stage.screenshot({animations:'disabled',style:'.efw-meadow-overlay { visibility: hidden !important; }',path:'reports/ecosystem-foliage-motion/breeze.png'});await stage.screenshot({path:'reports/ecosystem-foliage-motion/breeze.jpg',type:'jpeg',quality:90});
  await motion.selectOption('still');await expect(canvas).toHaveAttribute('data-foliage-motion','still');expect((await page.evaluate(()=>(window as any).__breezeMaterials)).every((m:any)=>m.amount===0)).toBe(true);
  const still=await stage.screenshot({animations:'disabled',style:'.efw-meadow-overlay { visibility: hidden !important; }'});expect(still.equals(breeze)).toBe(false);await stage.screenshot({path:'reports/ecosystem-foliage-motion/still.jpg',type:'jpeg',quality:90});
  await motion.selectOption('breeze');expect((await stage.screenshot({animations:'disabled',style:'.efw-meadow-overlay { visibility: hidden !important; }'})).equals(breeze)).toBe(true);
  await timeline.fill('140');await expect(canvas).toHaveAttribute('data-foliage-time','14');await timeline.fill('80');await expect(canvas).toHaveAttribute('data-foliage-time','8');expect(await page.evaluate(()=>(window as any).__breezeMaterials)).toEqual(expected);expect((await stage.screenshot({animations:'disabled',style:'.efw-meadow-overlay { visibility: hidden !important; }',path:'reports/ecosystem-foliage-motion/rewind.png'})).equals(breeze)).toBe(true);
  await meadow.getByRole('button',{name:'Play meadow timeline',exact:true}).click();await expect.poll(async()=>Number(await canvas.getAttribute('data-foliage-time'))).toBeGreaterThan(8);await meadow.getByRole('button',{name:'Pause meadow timeline',exact:true}).click();const paused=await canvas.getAttribute('data-foliage-time');await page.waitForTimeout(350);await expect(canvas).toHaveAttribute('data-foliage-time',paused!);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(motion).toBeDisabled();await expect(canvas).toHaveAttribute('data-foliage-motion','reduced');await expect(canvas).toHaveAttribute('data-foliage-time','0');expect((await page.evaluate(()=>(window as any).__breezeMaterials)).every((m:any)=>m.time===0&&m.amount===0)).toBe(true);
  await timeline.fill('180');await expect(canvas).toHaveAttribute('data-foliage-time','0');await page.emulateMedia({reducedMotion:'no-preference'});await expect(motion).toBeEnabled();await expect(motion).toHaveValue('breeze');await expect(canvas).toHaveAttribute('data-foliage-time','18');
  await page.setViewportSize({width:390,height:844});await meadow.getByRole('button',{name:'Habitat view',exact:true}).click();await stage.screenshot({path:'reports/ecosystem-foliage-motion/mobile.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    const label=await meadow.locator('.efw-meadow-overlay').boundingBox(),button=await meadow.getByRole('button',{name:'View the 3D meadow fullscreen',exact:true}).boundingBox();
    expect(label!.x+label!.width).toBeLessThanOrEqual(button!.x-6);expect(button!.width).toBeGreaterThanOrEqual(44);expect(button!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===320)await stage.screenshot({path:'reports/ecosystem-foliage-motion/narrow-mobile.jpg',type:'jpeg',quality:90});
  }
  await page.getByRole('button',{name:'Hide 3D meadow',exact:true}).click();await expect(canvas).toHaveCount(0);await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();await expect(canvas).toHaveAttribute('data-foliage-motion','breeze');expect((await page.evaluate(()=>(window as any).__breezeMaterials)).every((m:any)=>m.time===18&&m.amount===1)).toBe(true);
  expect(shaderErrors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(saved);
});
