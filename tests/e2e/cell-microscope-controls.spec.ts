import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const width of [1200,390,320])test('microscope controls at '+width,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:960});
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'amoeba',paused:true,zoom:3}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const detail=page.locator('[data-cell-selected-organism-card]');await detail.locator('[data-cell-return-to-dish]').click();
 const canvas=page.locator('[data-cell-sim-canvas]');await expect(canvas).toBeFocused();
 const stage=page.locator('[data-cell-stage]');await stage.scrollIntoViewIfNeeded();
 await expect(stage.locator('[data-cell-control-value=zoom]')).toHaveText('120×');
 const zoom=page.getByRole('slider',{name:'Microscope zoom level'});await zoom.focus();await zoom.press('ArrowRight');await expect(stage.locator('[data-cell-control-value=zoom]')).toHaveText('124×');
 const speed=page.getByRole('slider',{name:'Simulation speed'});await speed.focus();await speed.press('ArrowRight');await expect(stage.locator('[data-cell-control-value=speed]')).toHaveText('2×');
 await page.getByRole('button',{name:'Reset microscope view',exact:true}).click();await expect(stage.locator('[data-cell-control-value=zoom]')).toHaveText('40×');
 await page.getByRole('button',{name:'Play simulation',exact:true}).click();await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimPaused)).toBe(false);
 await page.getByRole('button',{name:'Pause simulation',exact:true}).click();await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimPaused)).toBe(true);
 for(const utility of await stage.locator('[data-cell-stage-utility]').all()){
   const box=await utility.boundingBox();const button=await utility.locator('button').boundingBox();const slider=await utility.locator('input').boundingBox();
   expect(button!.width).toBeGreaterThanOrEqual(44);expect(button!.height).toBeGreaterThanOrEqual(44);expect(slider!.x+slider!.width).toBeLessThanOrEqual(button!.x);
   expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await detail.locator('[data-cell-return-to-dish]').click();
 await expect(canvas).toBeFocused();await stage.scrollIntoViewIfNeeded();
 await stage.screenshot({scale:'css',path:'reports/cell-microscope-controls/dish-'+width+'.png'});
 await detail.locator('[data-cell-selected-organism-actions]').screenshot({scale:'css',path:'reports/cell-microscope-controls/detail-actions-'+width+'.png'});
 expect(errors).toEqual([]);
});
