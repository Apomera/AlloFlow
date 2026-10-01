import {test, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const harness = new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1800,appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});
const report = 'reports/anatomy-view-readout-2026-09-19';
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>harness.start());
test.afterAll(async()=>harness.stop());

test('Camera readout follows region, orbit, reset, and presentation changes', async({page})=>{
  test.setTimeout(240000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1280,height:1100});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await harness.mount(page,{anatomy:{_bodyView3d:true,_body3dStyle:'realistic',_anatomyModelFocus:true,_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur'}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'#wrap{height:auto;max-width:100%;}'});
  await mkdir(report,{recursive:true});
  const canvas=page.locator('[data-anatomy-3d-canvas]');
  const readout=page.locator('[data-anatomy-view-readout]');
  const region=page.locator('[data-anatomy-readout-region]');
  const angle=page.locator('[data-anatomy-readout-angle]');
  await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});
  await canvas.evaluate(el=>(el as any).__readoutIdentity='same');
  await expect(region).toHaveText('Whole body');
  await expect(angle).toHaveText('Front');
  await expect(page.locator('[data-anatomy-camera-jump] svg[aria-hidden=true]')).toHaveCount(5);
  await expect(page.getByRole('button',{name:'Head',exact:true})).toBeVisible();
  await page.locator('[data-anatomy-camera-jump=head]').click();
  await page.locator('[data-anatomy-view-angle=right]').click();
  await expect(region).toHaveText('Head');
  await expect(angle).toHaveText('Right');
  await canvas.press('ArrowUp');
  await expect(angle).toHaveText('Free angle');
  await page.locator('[data-anatomy-camera-jump=torso]').click();
  await expect(region).toHaveText('Torso');
  await expect(angle).toHaveText('Free angle');
  await page.locator('[data-anatomy-viewer-action=reset]').click();
  await expect(region).toHaveText('Whole body');
  await expect(angle).toHaveText('Front');
  await page.locator('[data-anatomy-camera-jump=head]').click();
  await page.locator('[data-anatomy-view-angle=left]').click();
  await page.locator('[data-anatomy-light-option=contour]').click();
  await page.getByRole('button',{name:'Blueprint',exact:true}).click();
  await expect(region).toHaveText('Head');
  await expect(angle).toHaveText('Left');
  await page.getByRole('button',{name:'Surface',exact:true}).click();
  await expect(canvas).toHaveJSProperty('__readoutIdentity','same');
  await page.locator('[data-anatomy-model-shell]').screenshot({path:report+'/desktop.png'});
  // This overlay must never intercept dragging or tapping the model.
  expect(await readout.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  const scans:any[]=[];
  for(const theme of ['light','dark','contrast']){
    await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
    const violations=await page.evaluate(async()=>{
      const result=await (window as any).axe.run({include:[['[data-anatomy-view-readout]'],['[data-anatomy-camera-presets]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
      return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));
    });
    scans.push({theme,violations});
  }
  await writeFile(report+'/accessibility.json',JSON.stringify(scans,null,2));
  expect(scans.flatMap(s=>s.violations)).toEqual([]);
  await page.evaluate(()=>document.body.className='');
  await page.locator('[data-anatomy-model-focus-toggle]').click();
  await expect(angle).toHaveText('Left');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:1300});
    await page.addStyleTag({content:'#wrap{width:100%;}'});
    await expect(region).toHaveText('Head');
    const frame=(await page.locator('[data-anatomy-canvas-frame]').boundingBox())!;
    const overlay=(await readout.boundingBox())!;
    expect(overlay.x).toBeGreaterThanOrEqual(frame.x);
    expect(overlay.x+overlay.width).toBeLessThanOrEqual(frame.x+frame.width);
    expect(overlay.y+overlay.height).toBeLessThanOrEqual(frame.y+frame.height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
    if(width===390)await page.locator('[data-anatomy-model-shell]').screenshot({path:report+'/phone.png'});
  }
  await page.getByRole('button',{name:'2D',exact:true}).click();
  await expect(readout).toHaveCount(0);
  expect(errors).toEqual([]);
  await harness.destroy(page);
});
