import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_coasterlab.js',toolId:'coasterLab',width:1440,height:960,
 probes: "document.head.insertAdjacentHTML('beforeend','<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');"});
test.beforeAll(async()=>{await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
test('scene lighting preserves sun direction and adapts shadow detail to inspection views',async({page},testInfo)=>{
 test.setTimeout(300000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('coaster_lab_onboarding_v1','complete'));
 await page.setViewportSize({width:1440,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{},"document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
 const state=()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.lightingPresentation());
 const analysis=()=>page.evaluate(()=>JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
 const original=await analysis(), overview=await state();
 await page.locator('#clab-btnTrainView').click();
 await expect.poll(async()=>(await state()).span).toBeLessThan(overview.span);
 expect((await state()).carReceivesShadow).toBe(true);
 for(const theme of ['daylight','dusk','neon','blueprint']){
  await page.locator('#clab-visualTheme').selectOption(theme);
  const model=await state();
  model.direction.forEach((n:number,i:number)=>expect(n).toBeCloseTo(model.skyDirection[i],6));
  expect(model.shadowNear).toBeGreaterThan(0);expect(model.shadowFar).toBeGreaterThan(model.span);
  await page.screenshot({path:testInfo.outputPath('lighting-'+theme+'.png')});
 }
 expect(await analysis()).toBe(original);
 await page.locator('#clab-visualTheme').selectOption('daylight');
 const direction=(await state()).direction;
 await page.locator('#clab-btnSceneFocus').click();
 await page.locator('#clab-btnStationView').click();
 await page.screenshot({path:testInfo.outputPath('lighting-station.png')});
 await page.locator('#clab-btnFx').click();expect((await state()).shadows).toBe(false);
 await page.screenshot({path:testInfo.outputPath('lighting-lite.png')});
 await page.locator('#clab-btnFx').click();
 await page.locator('#clab-btnFitCoaster').click();
 await expect.poll(async()=>(await state()).span).toBe(overview.span);
 (await state()).direction.forEach((n:number,i:number)=>expect(n).toBeCloseTo(direction[i],6));
 await page.screenshot({path:testInfo.outputPath('lighting-overview.png')});
 await page.locator('#clab-btnSceneFocus').click();
 await page.setViewportSize({width:390,height:844});await page.locator('#clab-btnTrainView').click();
 await page.screenshot({path:testInfo.outputPath('lighting-phone.png')});
 expect((await state()).shaderErrors).toBe(0);expect(errors).toEqual([]);
});
