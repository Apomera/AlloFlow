import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1800,appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});
test.use({video:'off',trace:'off'});test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('Included free detailed body loads, preserves Blueprint, and falls back safely',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1400});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await harness.mount(page,{anatomy:{_bodyView3d:true,_body3dStyle:'realistic',_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur'}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;max-width:100%;}'});await mkdir('reports/anatomy-free-body',{recursive:true});
 const canvas=page.locator('[data-anatomy-3d-canvas]');await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});await expect(canvas).toHaveAttribute('data-anatomy-surface-asset','bundled');await expect(canvas).toHaveAttribute('data-anatomy-body-markers-visible','false');
 await canvas.screenshot({path:'reports/anatomy-free-body/body-front.png'});await canvas.evaluate(el=>(el as any).__freeBodyIdentity='same');
 await page.getByRole('button',{name:'Explore structure pins in Blueprint',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-body-markers-visible','true');await expect(canvas).toHaveJSProperty('__freeBodyIdentity','same');
 await page.getByRole('button',{name:'Surface',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-body-markers-visible','false');await expect(canvas).toHaveJSProperty('__freeBodyIdentity','same');
 await page.getByRole('group',{name:'Body orientation',exact:true}).getByRole('button',{name:'Posterior',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});await canvas.screenshot({path:'reports/anatomy-free-body/body-back.png'});
 await page.getByRole('group',{name:'Body orientation',exact:true}).getByRole('button',{name:'Anterior',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});
 await page.locator('[data-anatomy-model-source-controls] summary').click();await expect(page.locator('[data-anatomy-surface-source]')).toHaveValue('detailed');
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-model-source-controls]'],['[data-anatomy-model-explanation]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});}
 await writeFile('reports/anatomy-free-body/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);await page.evaluate(()=>document.body.className='');
 await page.setViewportSize({width:390,height:1600});await page.addStyleTag({content:'#wrap{width:100%;}'});await page.locator('[data-anatomy-model-shell]').screenshot({path:'reports/anatomy-free-body/body-phone.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
 await page.locator('[data-anatomy-surface-source]').selectOption('simple');await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready',{timeout:90000});await expect(page.locator('[data-anatomy-model-explanation]')).toContainText('teaching mannequin');
 await page.route('**/makehuman-body-surface.glb',route=>route.abort());await page.locator('[data-anatomy-surface-source]').selectOption('detailed');await expect(canvas).toHaveAttribute('data-anatomy-3d-state','fallback-model',{timeout:90000});
 await page.getByRole('button',{name:'Blueprint',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-3d-style','blueprint');
 expect(requests.filter(url=>url.includes('makehuman-body-surface.glb')).every(url=>new URL(url).hostname==='127.0.0.1')).toBe(true);expect(errors).toEqual([]);await harness.destroy(page);
});
