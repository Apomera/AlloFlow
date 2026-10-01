import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_coasterlab.js',toolId:'coasterLab',width:1280,height:900,
 probes:"document.head.insertAdjacentHTML('beforeend','<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');"});
test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
test('notebook continuation opens the next gap and keeps phone input visible',async({page},testInfo)=>{
 test.setTimeout(600000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('coaster_lab_onboarding_v1','complete');localStorage.setItem('coaster_lab_fx','lite');
  localStorage.setItem('coaster_lab_physics_pit_v1',JSON.stringify({experiment:'energy',stops:{energy:{choice:0,checked:0,notebook:{change:'Raise a crest',fixed:'Keep friction fixed',prediction:'A different valley speed',baseline:'12 m/s at valley',revised:'  ',explanation:''}}}}));
 });
 await page.setViewportSize({width:1280,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{},`document.querySelector('[aria-label="Coaster Lab 3-D designer"]')._lab`);
 const panel=page.locator('#clab-pitExperiment'),button=panel.locator('[data-pit-continue]');
 const status=panel.locator('[data-pit-note-status]');
 const field=(key:string)=>panel.locator('[data-pit-note="'+key+'"]');
 const design=()=>page.evaluate(()=>(document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.exportDesign());
 const original=await design();
 await expect(status).toHaveText('4 of 6 prompts have notes');
 await expect(panel.locator('[data-pit-stage-count="0"]')).toHaveText('3 of 3');
 await expect(panel.locator('[data-pit-stage-count="1"]')).toHaveText('1 of 2');
 await panel.locator('.clab-pit-note-overview').screenshot({path:testInfo.outputPath('notebook-summary-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await button.focus();await button.press('Enter');
 await expect(field('revised')).toBeFocused();
 await expect(panel.locator('.clab-pit-notebook details[open]')).toHaveCount(1);
 // Verify the focused prompt is actually in the scrolling panel, not hidden behind the 3D scene.
 expect(await field('revised').evaluate(el=>{const r=el.getBoundingClientRect();return el===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);})).toBe(true);
 await page.screenshot({path:testInfo.outputPath('notebook-continue-phone.png')});
 await field('revised').fill('Run 2: stalled before the valley.');
 await expect(status).toHaveText('5 of 6 prompts have notes');await expect(field('revised')).toBeFocused();
 await button.click();await expect(field('explanation')).toBeFocused();
 await field('explanation').fill('A stall prevents comparing speed at the valley.');
 await expect(status).toHaveText('6 of 6 prompts have notes');await expect(button).toHaveText('Review my explanation');
 await button.click();await expect(field('explanation')).toBeFocused();
 await field('explanation').fill('  ');await expect(status).toHaveText('5 of 6 prompts have notes');
 await expect(button).toHaveText('Continue notes');
 await panel.locator('[data-pit-return]').click();await page.locator('[data-pit-try]').click();
 await expect(status).toHaveText('5 of 6 prompts have notes');
 await button.click();await expect(field('explanation')).toBeFocused();
 await panel.locator('.clab-pit-note-overview').screenshot({path:testInfo.outputPath('notebook-summary-phone.png')});
 expect(await panel.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(false);
 expect(await design()).toBe(original);expect(errors).toEqual([]);
});
