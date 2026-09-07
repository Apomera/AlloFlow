import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_coasterlab.js',toolId:'coasterLab',width:1440,height:960,
 probes: "document.head.insertAdjacentHTML('beforeend','<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');"});
test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
test('station forecourt stays grounded and frames across themes and layout edits',async({page},testInfo)=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('coaster_lab_onboarding_v1','complete'));
 await page.setViewportSize({width:1440,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{},"document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
 const state=()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.forecourtPresentation());
 const analysis=()=>page.evaluate(()=>JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
 const original=await analysis();await page.locator('#clab-btnStationView').click();
 const framed=()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.stationPresentation().projected.every((p:any)=>Math.abs(p.x)<=1 && Math.abs(p.y)<=1 && p.z>=-1 && p.z<=1));
 await expect.poll(framed).toBe(true);
 expect(await state()).toMatchObject({benches:2,finite:true,details:true});
 for(const theme of ['daylight','dusk','neon','blueprint']){
  await page.locator('#clab-visualTheme').selectOption(theme);
  expect((await state()).planting).toBe(theme!=='blueprint');
  expect((await state()).pools).toBe(['daylight','blueprint'].includes(theme)?0:4);
  await page.screenshot({path:testInfo.outputPath('forecourt-'+theme+'.png')});
 }
 expect(await analysis()).toBe(original);
 await page.locator('#clab-btnFx').click();expect((await state()).details).toBe(false);
 await page.screenshot({path:testInfo.outputPath('forecourt-lite.png')});
 await page.locator('#clab-btnFx').click();expect((await state()).details).toBe(true);
 await page.locator('#clab-btnSceneFocus').click();
 await page.evaluate(()=>{
  const lab=(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab;
  const design=JSON.parse(lab.exportDesign());
  design.points=design.points.map((p:any)=>({...p,x:-p.z,z:p.x}));design.points[0].y=15;
  lab.importDesign(JSON.stringify(design));
 });
 const model=await state();expect(model.position[1]).toBe(0);
 expect(model.position[0]).toBeCloseTo(model.stationPosition[0],6);expect(model.position[2]).toBeCloseTo(model.stationPosition[2],6);
 expect(model.heading).toBeCloseTo(model.stationHeading,6);expect(model.finite).toBe(true);
 expect(model.stairs.top).toBeCloseTo(model.stationPosition[1]+0.55,6);expect(model.stairs.flights).toBeGreaterThan(1);
 await page.locator('#clab-visualTheme').selectOption('daylight');
 await page.setViewportSize({width:390,height:844});await page.locator('#clab-btnStationView').click();
 await expect.poll(framed).toBe(true);await expect(page.locator('#clab-btnSceneFocus')).toBeInViewport();
 await page.screenshot({path:testInfo.outputPath('forecourt-phone-elevated.png')});
 expect(errors).toEqual([]);
});
