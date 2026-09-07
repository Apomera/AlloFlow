import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1440, height: 960,
 probes: "document.head.insertAdjacentHTML('beforeend','<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('continuous deck and aligned wheel assemblies survive rebuilds and FX changes', async ({ page }, testInfo) => {
 test.setTimeout(300000);
 const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(() => localStorage.setItem('coaster_lab_onboarding_v1','complete'));
 await page.setViewportSize({width:1440,height:960}); await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page, {}, "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
 const state = () => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.trackHardwarePresentation());
 const analysis = () => page.evaluate(() => JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
 const original = await analysis();
 let model = await state();
 expect(model.deck?.finite).toBe(true); expect(model.deck!.vertices).toBeGreaterThan(8);
 expect(model.deck!.triangles).toBe((model.deck!.vertices/4-1)*8+4);
 expect(model.batches).toHaveLength(3); expect(model.batches.every((b: any) => b.finite && b.count > 0)).toBe(true);
 for(const contact of model.wheelRailContact){ expect(contact.lateralError).toBeCloseTo(0,8); expect(contact.clearance).toBeCloseTo(0,8); }
 await page.locator('#clab-btnTrainView').click();
 for(const theme of ['daylight','neon','blueprint']){
  await page.locator('#clab-visualTheme').selectOption(theme);
  await page.screenshot({path:testInfo.outputPath('hardware-'+theme+'.png')});
 }
 await page.locator('#clab-btnFx').click();
 expect((await state()).batches.filter((b: any) => b.name !== 'crossmember-webs').every((b: any) => !b.visible)).toBe(true);
 expect((await state()).deck?.finite).toBe(true);
 await page.locator('#clab-btnFx').click();
 expect(await analysis()).toBe(original);
 await page.locator('#clab-btnSceneFocus').click();
 await page.locator('#clab-trainLen').selectOption('8');
 model = await state(); expect(model.batches.every((b: any) => b.finite)).toBe(true);
 await page.setViewportSize({width:390,height:844});
 await page.locator('#clab-visualTheme').selectOption('daylight');
 await page.locator('#clab-btnTrainView').click();
 await expect.poll(() => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.trainPresentation().projected.every((p: any) => Math.abs(p.x)<=1 && Math.abs(p.y)<=1))).toBe(true);
 await page.screenshot({path:testInfo.outputPath('hardware-phone.png')});
 expect((await state()).shaderErrors).toBe(0); expect(errors).toEqual([]);
});
