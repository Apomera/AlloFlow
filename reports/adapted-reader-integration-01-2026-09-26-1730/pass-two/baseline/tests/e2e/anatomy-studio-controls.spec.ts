import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1800,appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('Studio lights and nearby camera controls preserve the view and work across themes and phone layouts',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1400});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{anatomy:{_bodyView3d:true,_body3dStyle:'realistic',_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur'}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;max-width:100%;}'});await mkdir('reports/anatomy-studio-controls',{recursive:true});
 const canvas=page.locator('[data-anatomy-3d-canvas]');await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});await canvas.evaluate(el=>(el as any).__studioIdentity='same');
 await canvas.press(']');expect(await page.evaluate(()=>(window as any).__toolData.anatomy.selectedStructure)).toBe('femur');await expect(canvas).not.toHaveAttribute('aria-keyshortcuts',/\[/);
 const snap=()=>canvas.evaluate(el=>(el as any)._anatomy3dCameraSnapshot());
 const explanation=page.locator('[data-anatomy-model-explanation]');await expect(explanation).not.toHaveAttribute('open','');await explanation.locator('summary').click();await expect(explanation.locator('p')).toBeVisible();await explanation.locator('summary').click();
 const head=page.locator('[data-anatomy-camera-jump=head]');await head.click();await expect(head).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-anatomy-camera-jump=body]')).toHaveAttribute('aria-pressed','false');await expect(page.locator('[data-anatomy-camera-region]')).toHaveText('Head');
 await expect(canvas).toHaveAttribute('data-anatomy-lighting','soft');await page.locator('[data-anatomy-canvas-frame]').screenshot({path:'reports/anatomy-studio-controls/soft.png'});const before=await snap();
 await page.locator('[data-anatomy-light-option=contour]').click();await expect(canvas).toHaveAttribute('data-anatomy-lighting','contour');await expect(page.locator('[data-anatomy-light-option=contour]')).toHaveAttribute('aria-pressed','true');expect((await snap()).position).toEqual(before.position);await expect(canvas).toHaveJSProperty('__studioIdentity','same');await page.locator('[data-anatomy-canvas-frame]').screenshot({path:'reports/anatomy-studio-controls/contour.png'});
 await page.locator('[data-anatomy-viewer-action=zoom-in]').click();await expect(canvas).toBeFocused();expect((await snap()).position[2]).toBeLessThan(before.position[2]);await page.locator('[data-anatomy-viewer-action=reset]').click();await expect(page.locator('[data-anatomy-camera-region]')).toHaveText('Whole body');await expect(page.locator('[data-anatomy-camera-jump=body]')).toHaveAttribute('aria-pressed','true');
 await head.click();await page.getByRole('button',{name:'Blueprint',exact:true}).click();await expect(page.locator('[data-anatomy-surface-lighting]')).toHaveCount(0);await expect(canvas).toHaveAttribute('data-anatomy-lighting','default');await expect(page.locator('[data-anatomy-camera-region]')).toHaveText('Head');
 await page.getByRole('button',{name:'Surface',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-lighting','contour');await expect(head).toHaveAttribute('aria-pressed','true');await expect(canvas).toHaveJSProperty('__studioIdentity','same');
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){
  await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-surface-lighting]'],['[data-anatomy-viewer-dock]'],['[data-anatomy-camera-presets]'],['[data-anatomy-model-explanation]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});
 }
 await writeFile('reports/anatomy-studio-controls/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);await page.evaluate(()=>document.body.className='');
 await page.setViewportSize({width:390,height:1600});await page.addStyleTag({content:'#wrap{width:100%;}'});await page.locator('[data-anatomy-model-shell]').screenshot({path:'reports/anatomy-studio-controls/phone.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
 const dock=await page.locator('[data-anatomy-viewer-dock]').boundingBox(),frame=await page.locator('[data-anatomy-canvas-frame]').boundingBox();expect(dock!.y).toBeGreaterThanOrEqual(frame!.y+frame!.height);
 await page.locator('[data-anatomy-light-option=soft]').focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-anatomy-lighting','soft');
 expect(errors).toEqual([]);await harness.destroy(page);
});
