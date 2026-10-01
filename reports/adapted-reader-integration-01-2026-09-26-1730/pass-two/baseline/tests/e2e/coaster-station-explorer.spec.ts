import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_coasterlab.js',toolId:'coasterLab',width:1440,height:960,
 probes: "document.head.insertAdjacentHTML('beforeend','<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');"});
test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
test('station explorer frames details responsively and respects manual camera movement',async({page},testInfo)=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('coaster_lab_onboarding_v1','complete'));
 await page.setViewportSize({width:1440,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{},"document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
 const state=()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.stationExplorer());
 const analysis=()=>page.evaluate(()=>JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
 const original=await analysis(),nav=page.locator('#clab-stationViews');
 await expect(nav).toBeHidden();
 await page.locator('#clab-btnStationView').click();await expect(nav).toBeVisible();
 await expect(page.locator('#clab-btnSceneFocus')).toBeFocused();
 const framed=async()=>(await state()).projected.every((p:any)=>Math.abs(p.x)<=1 && Math.abs(p.y)<=1 && p.z>=-1 && p.z<=1);
 await expect.poll(framed).toBe(true);const overview=(await state()).radius;
 await page.locator('#clab-visualTheme').selectOption('daylight');
 for(const shot of ['platform','forecourt']){
  const button=nav.locator('[data-station-shot="'+shot+'"]');await button.focus();await button.press('Enter');
  await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-pressed','true');
  await expect.poll(framed).toBe(true);expect((await state()).radius).toBeLessThan(overview);
  await page.screenshot({path:testInfo.outputPath('explorer-'+shot+'.png')});
 }
 await page.setViewportSize({width:390,height:844});await expect.poll(framed).toBe(true);
 expect((await state()).autoFit).toBe(true);
 await expect(nav).toBeInViewport();await expect(page.locator('#clab-btnExitStationView')).toBeInViewport();
 await page.screenshot({path:testInfo.outputPath('explorer-forecourt-phone.png')});
 await nav.locator('[data-station-shot="platform"]').click();await expect.poll(framed).toBe(true);
 await page.screenshot({path:testInfo.outputPath('explorer-platform-phone.png')});
 const canvas=page.locator('#clab-gl'),box=(await canvas.boundingBox())!;
 await page.mouse.move(box.x+box.width*0.5,box.y+box.height*0.55);await page.mouse.down();
 await page.mouse.move(box.x+box.width*0.7,box.y+box.height*0.60,{steps:5});await page.mouse.up();
 expect((await state()).autoFit).toBe(false);await expect(nav.locator('[aria-pressed="true"]')).toHaveCount(0);
 await expect(page.locator('#clab-stationViewHint')).toContainText('Free orbit');
 const radius=(await state()).radius;await page.setViewportSize({width:430,height:900});
 await expect.poll(async()=>(await state()).radius).toBe(radius);
 await nav.locator('[data-station-shot="platform"]').click();expect((await state()).autoFit).toBe(true);
 await page.locator('#clab-btnFitCoaster').click();await expect(nav).toBeHidden();
 await page.locator('#clab-btnSceneFocus').click();
 await page.locator('#clab-btnStationView').click();await expect(nav).toBeVisible();
 await page.locator('#clab-btnExitStationView').click();await expect(nav).toBeHidden();
 await expect(page.locator('#clab-side')).toBeVisible();await expect(page.locator('#clab-btnStationView')).toBeFocused();
 expect(await analysis()).toBe(original);expect(errors).toEqual([]);
});
