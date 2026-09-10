import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const width of [1200,320])test('observation controls at '+width,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:960});
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'amoeba',paused:true,zoom:3}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const stage=page.locator('[data-cell-stage]'),canvas=page.locator('[data-cell-sim-canvas]');await stage.scrollIntoViewIfNeeded();
 const labelCount=()=>canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels?.().length||0);
 const toggle=stage.locator('[data-cell-observation-labels]');await expect(toggle).toHaveAttribute('aria-pressed','true');
 await stage.locator('[data-cell-observation-center]').click();await expect(canvas).toBeFocused();await expect.poll(labelCount).toBeGreaterThan(0);
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');await expect.poll(labelCount).toBe(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.cell.observationLabels)).toBe(false);
 await stage.screenshot({scale:'css',path:'reports/cell-observation-refinement/clean-'+width+'.png'});
 await toggle.click();await expect.poll(labelCount).toBeGreaterThan(0);
 const box=await canvas.boundingBox();await page.mouse.move(box!.x+box!.width/2,box!.y+380);await page.mouse.down();await page.mouse.move(box!.x+box!.width*3,box!.y+380,{steps:10});await page.mouse.up();
 await expect.poll(labelCount).toBe(0);
 await stage.locator('[data-cell-observation-center]').click();await expect.poll(labelCount).toBeGreaterThan(0);
 const labels=await canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels());const hud=await stage.locator('[data-cell-stage-hud]').boundingBox();const cv=await canvas.boundingBox();for(const label of labels)expect(label.y).toBeGreaterThanOrEqual(hud!.y+hud!.height-cv!.y);
 for(const button of await stage.locator('[data-cell-observation-actions] button').all()){const b=await button.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);expect(b!.x+b!.width).toBeLessThanOrEqual(width);}
 await stage.screenshot({scale:'css',path:'reports/cell-observation-refinement/labeled-'+width+'.png'});
 await toggle.click();await stage.locator('[data-cell-observation-notes]').click();const detail=page.locator('[data-cell-selected-organism-card]');await expect(detail.locator('[data-cell-back-to-organisms]')).toBeFocused();
 await detail.locator('[data-cell-anatomy-item="Nucleus"]').click();await expect(canvas).toBeFocused();await expect(toggle).toHaveAttribute('aria-pressed','true');await expect.poll(labelCount).toBeGreaterThan(0);
 expect(errors).toEqual([]);
});
test('play structure labels remain available when observation labels are hidden',async({page})=>{
 await harness.mount(page,{cell:{mode:'play',playAsOrganism:'plantcell',selectedOrganism:'plantcell',observationLabels:false,paused:true,showPlayInstructions:false,playMission:{organismId:'plantcell',startSuccess:0,predictionSkipped:true},_cellExt:{successByOrganism:{plantcell:0},tutorialsSeen:{plantcell:true}}}},undefined,{expectCanvas:false});
 await page.locator('[data-cell-stage]').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.locator('[data-cell-sim-canvas]').evaluate((c:any)=>c._cellSimGetAnatomyLabels?.().length||0)).toBeGreaterThan(0);
 await expect(page.locator('[data-cell-observation-tools]')).toHaveCount(0);
});
