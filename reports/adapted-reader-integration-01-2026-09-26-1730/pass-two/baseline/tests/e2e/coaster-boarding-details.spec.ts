import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_coasterlab.js',toolId:'coasterLab',width:1440,height:960,
 probes: "document.head.insertAdjacentHTML('beforeend','<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');"});
test.beforeAll(async()=>{await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});

test('boarding assemblies stay grounded and readable through presentation and dispatch changes',async({page},testInfo)=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('coaster_lab_onboarding_v1','complete'));
 await page.setViewportSize({width:1440,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{},`document.querySelector('[aria-label="Coaster Lab 3-D designer"]')._lab`);
 const state=()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.boardingPresentation());
 const analysis=()=>page.evaluate(()=>JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
 const rendered=()=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const original=await analysis(),model=await state();
 expect(model.posts).toHaveLength(6);model.posts.forEach((post:any)=>expect(post.bottom).toBeCloseTo(0.55,7));
 expect(model.panels).toHaveLength(6);expect(model.panels.every((p:any)=>p.finite && p.members===6 && Math.abs(p.angle)<0.01)).toBe(true);
 expect(model.plates).toHaveLength(12);expect(model.plates.every((p:any)=>p.frontSide)).toBe(true);
 for(let i=0;i<12;i+=2) expect(Math.abs(model.plates[i].rotation-model.plates[i+1].rotation)).toBeCloseTo(Math.PI,7);
 await page.locator('#clab-btnStationView').click();await page.locator('[data-station-shot="platform"]').click();
 for(const theme of ['daylight','neon','blueprint']){
  await page.locator('#clab-visualTheme').selectOption(theme);await rendered();
  await page.screenshot({path:testInfo.outputPath('boarding-'+theme+'.png')});
 }
 await page.locator('#clab-visualTheme').selectOption('daylight');await page.locator('#clab-btnFx').click();
 expect((await state()).anchorsVisible).toBe(false);expect((await state()).plates).toHaveLength(12);
 await rendered();await page.screenshot({path:testInfo.outputPath('boarding-lite.png')});
 await page.locator('#clab-btnFx').click();expect((await state()).anchorsVisible).toBe(true);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.stationExplorer().projected.every((p:any)=>Math.abs(p.x)<=1 && Math.abs(p.y)<=1))).toBe(true);
 await rendered();await page.screenshot({path:testInfo.outputPath('boarding-phone.png')});
 expect(await analysis()).toBe(original);
 await page.locator('#clab-btnRun').click();
 await expect.poll(async()=>(await state()).panels.every((p:any)=>Math.abs(p.angle)>1.4),{timeout:30000}).toBe(true);
 await page.locator('#clab-btnRun').click();
 await expect.poll(async()=>(await state()).panels.every((p:any)=>Math.abs(p.angle)<0.01)).toBe(true);
 expect(await page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.lightingPresentation().shaderErrors)).toBe(0);
 expect(errors).toEqual([]);
});
