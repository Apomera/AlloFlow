import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1800,appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('Body regional views frame the model, retain the viewer, and reset on desktop and phone',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1400});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{anatomy:{_bodyView3d:true,_body3dStyle:'realistic',_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur'}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;max-width:100%;}'});await mkdir('reports/anatomy-camera-presets',{recursive:true});
 const canvas=page.locator('[data-anatomy-3d-canvas]');await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});
 await canvas.evaluate(el=>(el as any).__cameraIdentity='same');
 const snapshot=()=>canvas.evaluate(el=>(el as any)._anatomy3dCameraSnapshot());
 const jump=(id:string)=>page.locator('[data-anatomy-camera-jump="'+id+'"]').click();
 const home=await snapshot();
 for(const id of ['head','torso','hand','feet']){
  await jump(id);await expect(canvas).toHaveAttribute('data-anatomy-camera-preset',id);await expect(canvas).toBeFocused();
  const state=await snapshot();expect(state.minimumDistance).toBe(1.2);expect(state.stageVisible).toBe(false);expect(state.position[2]).toBeLessThan(home.position[2]);
  await expect(canvas).toHaveJSProperty('__cameraIdentity','same');await canvas.screenshot({path:'reports/anatomy-camera-presets/'+id+'.png'});
 }
 await jump('body');const reset=await snapshot();expect(reset.target).toEqual(home.target);expect(reset.position).toEqual(home.position);expect(reset.minimumDistance).toBe(6);expect(reset.stageVisible).toBe(true);
 await jump('head');const head=await snapshot();await canvas.press('+');expect((await snapshot()).position[2]).toBeLessThan(head.position[2]);await canvas.press('Home');await expect(canvas).toHaveAttribute('data-anatomy-camera-preset','body');
 await jump('head');const centered=await snapshot();await canvas.press('ArrowLeft');const rotated=await snapshot();expect(rotated.target).toEqual(centered.target);expect(rotated.position[0]).not.toBe(centered.position[0]);
 await jump('hand');await page.getByRole('button',{name:'Blueprint',exact:true}).click();expect((await snapshot()).target[0]).toBeCloseTo(-1.02);
 await page.getByRole('button',{name:'Surface',exact:true}).click();expect((await snapshot()).target[0]).toBeCloseTo(-1.42);await expect(canvas).toHaveJSProperty('__cameraIdentity','same');
 await jump('head');await page.locator('[data-anatomy-appearance-controls] summary').click();await page.getByRole('button',{name:'Deep skin tone',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-camera-preset','head');await canvas.screenshot({path:'reports/anatomy-camera-presets/deep-tone.png'});
 await page.getByRole('button',{name:'Olive skin tone',exact:true}).click();await page.locator('[data-anatomy-appearance-controls] summary').click();
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){
  await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-camera-presets]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});
 }
 await writeFile('reports/anatomy-camera-presets/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);await page.evaluate(()=>document.body.className='');
 await page.setViewportSize({width:390,height:1600});await page.addStyleTag({content:'#wrap{width:100%;}'});await jump('head');await expect(canvas).toBeFocused();
 await page.locator('[data-anatomy-model-shell]').screenshot({path:'reports/anatomy-camera-presets/phone.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
 await jump('body');expect((await snapshot()).target).toEqual(home.target);expect(errors).toEqual([]);await harness.destroy(page);
});
