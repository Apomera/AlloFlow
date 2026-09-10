import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const width of [1200,320])test('dish controls and follow at '+width,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:width===320?'reduce':'no-preference'});await page.setViewportSize({width,height:960});
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'paramecium',paused:true,zoom:2}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const stage=page.locator('[data-cell-stage]'),canvas=page.locator('[data-cell-sim-canvas]'),panel=page.locator('[data-cell-visibility-panel]');
 const follow=stage.locator('[data-cell-observation-follow]');
 const view=()=>canvas.evaluate((c:any)=>c._cellSimGetObservationView());
 await stage.scrollIntoViewIfNeeded();await follow.click();await expect(follow).toHaveAttribute('aria-pressed','true');
 const start=await view();expect(start.following).toBe(true);expect(start.camera.zoom).toBe(2);
 expect(start.camera.x).toBeCloseTo(start.selected.x,5);expect(start.camera.y).toBeCloseTo(start.selected.y,5);
 await canvas.evaluate((c:any)=>c._cellSimSetPaused(false));
 await expect.poll(async()=>{const v=await view();return Math.hypot(v.selected.x-start.selected.x,v.selected.y-start.selected.y);}).toBeGreaterThan(3);
 const moving=await view();expect(Math.hypot(moving.selected.x-moving.camera.x,moving.selected.y-moving.camera.y)).toBeLessThan(width===320?4:20);
 await canvas.evaluate((c:any)=>c._cellSimSetPaused(true));
 await stage.screenshot({scale:'css',path:'reports/cell-dish-controls/follow-'+width+'.png'});
 const b=await canvas.boundingBox();await page.mouse.move(b!.x+b!.width/2,b!.y+400);await page.mouse.down();await page.mouse.move(b!.x+b!.width/2+70,b!.y+410,{steps:5});await page.mouse.up();
 await expect(follow).toHaveAttribute('aria-pressed','false');expect((await view()).following).toBe(false);
 await follow.click();await canvas.evaluate((c:any)=>c._cellSimResetView());await expect(follow).toHaveAttribute('aria-pressed','false');expect((await view()).camera.zoom).toBe(1);
 await follow.click();await panel.scrollIntoViewIfNeeded();
 await expect(panel.locator('[data-cell-visibility-count]')).toHaveText('11 of 11 visible');
 await panel.locator('[data-cell-visibility-option=paramecium]').click();
 await expect(panel.locator('[data-cell-visibility-count]')).toHaveText('10 of 11 visible');
 expect((await view()).selected).toBeNull();expect((await view()).following).toBe(false);
 await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.cell.followSpecimen)).toBe(false);
 await panel.locator('[data-cell-visibility-option=plantcell]').focus();await page.keyboard.press('Enter');
 await expect(panel.locator('[data-cell-visibility-option=plantcell]')).toHaveAttribute('aria-pressed','false');
 await panel.screenshot({scale:'css',path:'reports/cell-dish-controls/visibility-'+width+'.png'});
 for(const button of await panel.locator('button').all()){const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);}
 await panel.getByRole('button',{name:'Clear all cell types from petri dish',exact:true}).click();
 await expect(panel.locator('[data-cell-visibility-count]')).toHaveText('0 of 11 visible');await expect(panel.locator('[data-cell-visibility-empty]')).toBeVisible();
 await panel.getByRole('button',{name:'Show all cell types in petri dish',exact:true}).click();
 await expect(panel.locator('[data-cell-visibility-count]')).toHaveText('11 of 11 visible');await expect(panel.locator('[data-cell-visibility-empty]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('saved follow preference resumes without changing zoom',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'amoeba',paused:true,zoom:1.5,followSpecimen:true}},undefined,{expectCanvas:false});
 const canvas=page.locator('[data-cell-sim-canvas]');await page.locator('[data-cell-stage]').scrollIntoViewIfNeeded();
 await expect(page.locator('[data-cell-observation-follow]')).toHaveAttribute('aria-pressed','true');
 const v=await canvas.evaluate((c:any)=>c._cellSimGetObservationView());expect(v.following).toBe(true);expect(v.camera.zoom).toBe(1.5);expect(v.camera.x).toBeCloseTo(v.selected.x,5);
});

test('observation follow is suspended in play mode',async({page})=>{
 await harness.mount(page,{cell:{mode:'play',selectedOrganism:'amoeba',playAsOrganism:'amoeba',paused:true,followSpecimen:true,showPlayInstructions:false}},undefined,{expectCanvas:false});
 await expect(page.locator('[data-cell-observation-follow]')).toHaveCount(0);
 expect(await page.locator('[data-cell-sim-canvas]').evaluate((c:any)=>c._cellSimGetObservationView().following)).toBe(false);
});
