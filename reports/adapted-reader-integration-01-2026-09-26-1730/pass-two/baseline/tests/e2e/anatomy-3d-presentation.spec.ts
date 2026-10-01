import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1600,appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('3D anatomy model presentation',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1200});
 await harness.mount(page,{anatomy:{_bodySurfaceSource:'simple',_bodyView3d:true,_body3dStyle:'blueprint',_activeTab:'explore',_anatomyModelFocus:false,system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur'}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;max-width:100%;}'});await mkdir('reports/anatomy-3d-presentation',{recursive:true});
 const canvas=page.locator('[data-anatomy-3d-canvas]');await expect(canvas).toHaveAttribute('data-anatomy-3d-state',/ready/,{timeout:90000});
 await page.locator('[data-anatomy-model-switcher]').scrollIntoViewIfNeeded();
 await expect(page.locator('[data-anatomy-model-explanation]')).toContainText('Transparent body map');
 await canvas.screenshot({path:'reports/anatomy-3d-presentation/blueprint.png'});
 await canvas.evaluate(el=>(el as any).__presentationIdentity='retained');
 await page.locator('[data-anatomy-model-option=realistic]').click();await expect(canvas).toHaveAttribute('data-anatomy-3d-style','realistic');await expect(page.locator('#anatomy-3d-status')).toContainText('Simplified surface body ready');
 await expect(page.locator('[data-anatomy-model-explanation]')).toContainText('teaching mannequin');
 await expect(canvas).toHaveJSProperty('__presentationIdentity','retained');
 await canvas.screenshot({path:'reports/anatomy-3d-presentation/surface.png'});
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){
   await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
   const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run({include:[['[data-anatomy-model-switcher]'],['[data-anatomy-model-explanation]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});
 }
 await writeFile('reports/anatomy-3d-presentation/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);
 await page.evaluate(()=>document.body.className='');
 await page.setViewportSize({width:390,height:1400});await page.addStyleTag({content:'#wrap{width:100%;}'});
 await page.locator('[data-anatomy-model-shell]').screenshot({path:'reports/anatomy-3d-presentation/chooser-phone.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
 await page.getByRole('button',{name:'Blueprint',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-3d-style','blueprint');await expect(page.locator('#anatomy-3d-status')).toContainText('Blueprint body ready');await expect(canvas).toHaveJSProperty('__presentationIdentity','retained');

 await harness.destroy(page);
});
