import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1800,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('Atlas visual controls, selection caption and responsive themes',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1400});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{anatomy:{_bodyView3d:false,_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,_structuresViewed:{skull:true}}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;max-width:100%;}'});await mkdir('reports/anatomy-atlas-visual',{recursive:true});
 const model=page.locator('[data-anatomy-model-shell]');const caption=page.locator('[data-anatomy-atlas-caption]');const controls=page.locator('[data-anatomy-canvas-controls="2d"]');
 await expect(caption).toContainText('Select a pin to learn more');
 await expect(controls.locator('[data-anatomy-canvas-control=pan-left]')).toBeDisabled();
 await controls.locator('[data-anatomy-canvas-control=zoom-in]').click();await expect(controls.locator('[data-anatomy-canvas-control=pan-left]')).toBeEnabled();
 await controls.locator('[data-anatomy-canvas-control=pan-left]').click();await controls.locator('[data-anatomy-canvas-control=reset]').click();await expect(controls.getByRole('status')).toHaveText('100%');
 await page.locator('[data-anatomy-structure-option=femur]').click();await expect(caption).toContainText('Femur');
 await page.getByRole('button',{name:'Show on atlas',exact:true}).click();await model.screenshot({path:'reports/anatomy-atlas-visual/atlas-desktop.png'});
 await page.locator('[data-anatomy-model-focus-toggle]').click();await caption.getByRole('button',{name:'Read selected structure',exact:true}).click();await expect(page.locator('[data-anatomy-tool]')).toHaveAttribute('data-anatomy-model-focus','false');await expect(page.locator('[data-anatomy-structure-detail-heading]')).toBeFocused();
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){
  await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-canvas-toolbar]'],['[data-anatomy-atlas-caption]'],['.anatomy-body-title-row']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});
  if(theme==='dark'){await page.getByRole('button',{name:'Show on atlas',exact:true}).click();await model.screenshot({path:'reports/anatomy-atlas-visual/atlas-dark.png'});}
 }
 await writeFile('reports/anatomy-atlas-visual/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);
 await page.evaluate(()=>document.body.className='');await page.setViewportSize({width:390,height:1200});await page.addStyleTag({content:'#wrap{width:100%;}'});await model.screenshot({path:'reports/anatomy-atlas-visual/atlas-phone.png'});
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:1200});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  for(const button of await controls.getByRole('button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(35.5);
 }
 await page.getByRole('tab',{name:'Quiz',exact:true}).click();await expect(caption).toHaveCount(0);expect(errors).toEqual([]);await harness.destroy(page);
});
