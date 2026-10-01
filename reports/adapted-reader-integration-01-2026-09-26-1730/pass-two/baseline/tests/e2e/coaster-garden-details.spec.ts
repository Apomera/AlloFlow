import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_coasterlab.js',toolId:'coasterLab',width:1440,height:960,
 probes: "document.head.insertAdjacentHTML('beforeend','<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');"});
test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
test('garden flowers and readable wayfinding adapt to themes and FX Lite',async({page},testInfo)=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('coaster_lab_onboarding_v1','complete'));
 await page.setViewportSize({width:1440,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{},"document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
 const state=()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.gardenDetails());
 const analysis=()=>page.evaluate(()=>JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
 const rendered=()=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const original=await analysis(),model=await state();
 expect(model.flowerBatches.every((b:any)=>b.finite)).toBe(true);
 expect(Object.fromEntries(model.flowerBatches.map((b:any)=>[b.name,b.count]))).toEqual({'garden-shrubs':24,'garden-petals':240,'garden-flower-centers':48,'garden-stems':48});
 expect(model.signs.map((s:any)=>s.label)).toEqual(['BOARDING','EXIT']);
 expect(model.signs.every((s:any)=>s.frontSide)).toBe(true);
 expect(Math.abs(model.signs[0].rotation-model.signs[1].rotation)).toBeCloseTo(Math.PI,7);
 await page.locator('#clab-btnStationView').click();await page.locator('#clab-stationViews [data-station-shot="forecourt"]').click();
 for(const theme of ['daylight','neon','blueprint']){
  await page.locator('#clab-visualTheme').selectOption(theme);
  expect((await state()).plantingVisible).toBe(theme!=='blueprint');expect((await state()).signVisible).toBe(true);
  await rendered();await page.screenshot({path:testInfo.outputPath('garden-'+theme+'.png')});
 }
 await page.locator('#clab-visualTheme').selectOption('daylight');await page.locator('#clab-btnFx').click();
 expect((await state()).plantingVisible).toBe(false);expect((await state()).signVisible).toBe(true);
 await rendered();await page.screenshot({path:testInfo.outputPath('garden-lite.png')});
 await page.locator('#clab-btnFx').click();expect((await state()).plantingVisible).toBe(true);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.stationExplorer().projected.every((p:any)=>Math.abs(p.x)<=1 && Math.abs(p.y)<=1))).toBe(true);
 await rendered();await page.screenshot({path:testInfo.outputPath('garden-phone.png')});
 expect(await analysis()).toBe(original);
 expect(await page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.lightingPresentation().shaderErrors)).toBe(0);
 expect(errors).toEqual([]);
});
