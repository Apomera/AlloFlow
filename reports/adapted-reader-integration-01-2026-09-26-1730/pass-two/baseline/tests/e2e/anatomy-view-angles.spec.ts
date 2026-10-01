import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1800,appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});
test.use({video:'off',trace:'off'});test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('Body camera angles retain the region and zoom, report free orbit, and follow body laterality',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1400});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{anatomy:{_bodyView3d:true,_body3dStyle:'realistic',_surfaceLighting:'contour',_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur'}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;max-width:100%;}'});await mkdir('reports/anatomy-view-angles',{recursive:true});
 const canvas=page.locator('[data-anatomy-3d-canvas]');await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});await expect(canvas).toHaveAttribute('data-anatomy-camera-angle','front');await canvas.evaluate(el=>(el as any).__angleIdentity='same');
 const snap=()=>canvas.evaluate(el=>(el as any)._anatomy3dCameraSnapshot());const distance=(s:any)=>Math.hypot(...s.position.map((n:number,i:number)=>n-s.target[i]));
 await page.locator('[data-anatomy-camera-jump=head]').click();const original=await snap();
 for(const angle of ['right','back','left','front']){
  await page.locator('[data-anatomy-view-angle='+angle+']').click();await expect(canvas).toBeFocused();await expect(canvas).toHaveAttribute('data-anatomy-camera-angle',angle);await expect(page.locator('[data-anatomy-view-angle='+angle+']')).toHaveAttribute('aria-pressed','true');
  const next=await snap();expect(next.target).toEqual(original.target);expect(distance(next)).toBeCloseTo(distance(original),5);expect(next.preset).toBe('head');await expect(canvas).toHaveJSProperty('__angleIdentity','same');await expect(canvas).toHaveAttribute('data-anatomy-lighting','contour');
  if(angle==='right')expect(next.position[0]).toBeLessThan(next.target[0]);if(angle==='left')expect(next.position[0]).toBeGreaterThan(next.target[0]);
  if(angle==='right'||angle==='back')await page.locator('[data-anatomy-canvas-frame]').screenshot({path:'reports/anatomy-view-angles/'+angle+'.png'});
 }
 await canvas.press('ArrowLeft');await expect(canvas).toHaveAttribute('data-anatomy-camera-angle','free');await expect(page.locator('[data-anatomy-view-angle][aria-pressed=true]')).toHaveCount(0);await expect(page.locator('[data-anatomy-camera-angle-label]')).toHaveText('Free angle');
 await canvas.press('Home');await expect(canvas).toHaveAttribute('data-anatomy-camera-angle','front');await expect(canvas).toHaveAttribute('data-anatomy-camera-preset','body');
 await page.getByRole('group',{name:'Body orientation',exact:true}).getByRole('button',{name:'Posterior',exact:true}).click();await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});await expect(canvas).toHaveAttribute('data-anatomy-camera-angle','back');
 await page.locator('[data-anatomy-camera-jump=hand]').click();await page.locator('[data-anatomy-view-angle=right]').click();await expect(canvas).toHaveAttribute('data-anatomy-camera-angle','right');const posterior=await snap();expect(posterior.position[0]).toBeGreaterThan(posterior.target[0]);
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-view-angles]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});}
 await writeFile('reports/anatomy-view-angles/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);await page.evaluate(()=>document.body.className='');
 await page.setViewportSize({width:390,height:1600});await page.addStyleTag({content:'#wrap{width:100%;}'});await page.locator('[data-anatomy-camera-jump=head]').click();await page.locator('[data-anatomy-view-angle=left]').focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-anatomy-camera-angle','left');await page.locator('[data-anatomy-model-shell]').screenshot({path:'reports/anatomy-view-angles/phone.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
 expect(errors).toEqual([]);await harness.destroy(page);
});
