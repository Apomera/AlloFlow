import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('observe layout follows available width without replacing the microscope',async({page})=>{
 test.setTimeout(180000);
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1200,height:1000});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'plantcell',paused:true,zoom:3}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const canvas=page.locator('[data-cell-sim-canvas]'),panel=page.locator('[data-cell-explanation-panel]'),workspace=page.locator('[data-cell-microscope-workspace]');
 await page.locator('[data-cell-anatomy-item="Endoplasmic Reticulum"]').click();
 const original=await canvas.elementHandle();
 const initial=await canvas.evaluate((c:any)=>c._cellSimGetObservationView());
 const picker=panel.getByRole('combobox',{name:'Jump to structure'});await picker.focus();
 const assertLayout=async(split:boolean)=>{
  await expect.poll(async()=>{const c=(await canvas.boundingBox())!,p=(await panel.boundingBox())!;return split?p.x>=c.x+c.width&&Math.abs(p.y-c.y)<3:p.y>=c.y+c.height;}).toBe(true);
  if(split){expect((await canvas.boundingBox())!.width).toBeGreaterThan(640);expect((await panel.boundingBox())!.width).toBeGreaterThanOrEqual(318);}
  expect(await original!.evaluate(e=>e===document.querySelector('[data-cell-sim-canvas]'))).toBe(true);
  expect(await canvas.evaluate((c:any)=>c._cellSimGetObservationView())).toEqual(initial);
  await expect(picker).toBeFocused();await expect(picker).toHaveValue('Endoplasmic Reticulum');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 };
 await assertLayout(true);
 await workspace.screenshot({path:'reports/cell-structure-explorer/split-desktop-1200.png'});
 // A wide window may still contain a narrow app panel: use container width, not viewport width.
 await page.locator('#wrap').evaluate((e:HTMLElement)=>{e.style.width='900px';});await assertLayout(false);
 await workspace.screenshot({path:'reports/cell-structure-explorer/stacked-container-900.png'});
 await page.locator('#wrap').evaluate((e:HTMLElement)=>{e.style.width='100%';});
 await page.setViewportSize({width:320,height:1000});await assertLayout(false);
 await workspace.screenshot({path:'reports/cell-structure-explorer/stacked-phone-320.png'});
 await page.setViewportSize({width:1200,height:1000});await assertLayout(true);
 await canvas.evaluate((c:any)=>c._cellSimSelectOrganism(null));await expect(panel).toHaveCount(0);
 await expect.poll(async()=>(await canvas.boundingBox())!.width).toBeGreaterThan(1000);
 expect(await original!.evaluate(e=>e===document.querySelector('[data-cell-sim-canvas]'))).toBe(true);
 expect(errors).toEqual([]);
});
test('play mode keeps its full-width microscope on desktop',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1200,height:1000});
 await harness.mount(page,{cell:{mode:'play',playAsOrganism:'plantcell',selectedOrganism:'plantcell',paused:true,showPlayInstructions:false,playMission:{organismId:'plantcell',startSuccess:0,predictionSkipped:true},_cellExt:{successByOrganism:{plantcell:0},tutorialsSeen:{plantcell:true}}}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{width:100%;max-width:1200px;display:block}'});
 const c=(await page.locator('[data-cell-sim-canvas]').boundingBox())!,p=(await page.locator('[data-cell-explanation-panel]').boundingBox())!;
 expect(c.width).toBeGreaterThan(1000);expect(p.y).toBeGreaterThanOrEqual(c.y+c.height);
});
