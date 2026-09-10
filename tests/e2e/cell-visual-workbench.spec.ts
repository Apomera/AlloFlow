import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:900,appStyles:true});
test.use({deviceScaleFactor:2});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

for (const [width, cell] of [[1200,'animal'],[390,'plant'],[320,'bacterium']] as const) {
  test(`cell workbench ${cell} at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:960});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await harness.mount(page,{cell:{mode:'interior',interiorCellType:cell,interiorPaused:true,_cellPicked:true,_cellCategory:'interactive'}},undefined,{expectCanvas:false});
    await page.addStyleTag({content:'body{background:#f8fafc} #wrap{width:100%;max-width:1200px;display:block}'});
    const frame=page.locator('[data-cell-canvas-frame]');
    expect(await page.locator('[data-cell-interior-canvas]').evaluate((el:HTMLCanvasElement)=>el.width)).toBe(1520);
    const empty=page.locator('[data-cell-inspector-empty]');
    await expect(frame).toBeVisible();await expect(empty).toBeVisible();
    expect((await frame.boundingBox())!.y).toBeLessThan(850);
    await empty.getByRole('button',{name:'Start with the membrane'}).click();
    const inspector=page.locator('[data-cell-selected-structure]');
    await expect(inspector).toHaveAttribute('data-cell-selected-structure','cellMembrane');
    await inspector.getByText('Structure & connections',{exact:true}).click();
    await expect(inspector.getByText('Structure and mechanism',{exact:true})).toBeVisible();
    const canvas=page.locator('[data-cell-interior-canvas]');
    const expected=await page.evaluate(type=>(window as any).__alloCellPure.interiorHitTest(type,.6,.5,760,440,1),cell);
    const box=(await canvas.boundingBox())!;
    await canvas.click({position:{x:box.width*.6,y:box.height*.5}});
    await expect(inspector).toHaveAttribute('data-cell-selected-structure',expected);
    const annotations=page.getByRole('button',{name:'Show diagram annotations'});
    await annotations.click();await expect(page.getByRole('button',{name:'Hide diagram annotations'})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Hide diagram annotations'}).click();
    const picker=page.locator('[data-cell-structure-picker]');
    for(const button of await picker.getByRole('button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if(width===1200)expect((await inspector.boundingBox())!.x).toBeGreaterThan((await frame.boundingBox())!.x+(await frame.boundingBox())!.width);
    else expect((await inspector.boundingBox())!.y).toBeLessThan((await picker.boundingBox())!.y);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({scale:'css',path:`reports/cell-visual-enhancement/full-${cell}-${width}.png`});
    await page.getByRole('button',{name:'Focus on cell',exact:true}).click();
    await page.locator('[data-cell-interior-workspace]').scrollIntoViewIfNeeded();
    await page.screenshot({scale:'css',path:`reports/cell-visual-enhancement/focused-${cell}-${width}.png`,fullPage:true});
    expect(errors).toEqual([]);
  });
}
