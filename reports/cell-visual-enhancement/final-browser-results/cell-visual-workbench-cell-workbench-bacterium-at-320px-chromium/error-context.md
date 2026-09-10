# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cell-visual-workbench.spec.ts >> cell workbench bacterium at 320px
- Location: tests\e2e\cell-visual-workbench.spec.ts:11:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 1891.765625
Received:   843.03125
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | 
  4  | const harness = new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:900,appStyles:true});
  5  | test.use({deviceScaleFactor:2});
  6  | test.beforeAll(()=>harness.start());
  7  | test.afterAll(()=>harness.stop());
  8  | test.afterEach(async({page})=>harness.destroy(page));
  9  | 
  10 | for (const [width, cell] of [[1200,'animal'],[390,'plant'],[320,'bacterium']] as const) {
  11 |   test(`cell workbench ${cell} at ${width}px`,async({page})=>{
  12 |     await page.setViewportSize({width,height:960});
  13 |     const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  14 |     await harness.mount(page,{cell:{mode:'interior',interiorCellType:cell,interiorPaused:true,_cellPicked:true,_cellCategory:'interactive'}},undefined,{expectCanvas:false});
  15 |     await page.addStyleTag({content:'body{background:#f8fafc} #wrap{width:100%;max-width:1200px;display:block}'});
  16 |     const frame=page.locator('[data-cell-canvas-frame]');
  17 |     expect(await page.locator('[data-cell-interior-canvas]').evaluate((el:HTMLCanvasElement)=>el.width)).toBe(1520);
  18 |     const empty=page.locator('[data-cell-inspector-empty]');
  19 |     await expect(frame).toBeVisible();await expect(empty).toBeVisible();
  20 |     expect((await frame.boundingBox())!.y).toBeLessThan(850);
  21 |     await empty.getByRole('button',{name:'Start with the membrane'}).click();
  22 |     const inspector=page.locator('[data-cell-selected-structure]');
  23 |     await expect(inspector).toHaveAttribute('data-cell-selected-structure','cellMembrane');
  24 |     await inspector.getByText('Structure & connections',{exact:true}).click();
  25 |     await expect(inspector.getByText('Structure and mechanism',{exact:true})).toBeVisible();
  26 |     const canvas=page.locator('[data-cell-interior-canvas]');
  27 |     const expected=await page.evaluate(type=>(window as any).__alloCellPure.interiorHitTest(type,.6,.5,760,440,1),cell);
  28 |     const box=(await canvas.boundingBox())!;
  29 |     await canvas.click({position:{x:box.width*.6,y:box.height*.5}});
  30 |     await expect(inspector).toHaveAttribute('data-cell-selected-structure',expected);
  31 |     const annotations=page.getByRole('button',{name:'Show diagram annotations'});
  32 |     await annotations.click();await expect(page.getByRole('button',{name:'Hide diagram annotations'})).toHaveAttribute('aria-pressed','true');
  33 |     await page.getByRole('button',{name:'Hide diagram annotations'}).click();
  34 |     const picker=page.locator('[data-cell-structure-picker]');
  35 |     for(const button of await picker.getByRole('button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  36 |     if(width===1200)expect((await inspector.boundingBox())!.x).toBeGreaterThan((await frame.boundingBox())!.x+(await frame.boundingBox())!.width);
> 37 |     else expect((await inspector.boundingBox())!.y).toBeLessThan((await picker.boundingBox())!.y);
     |                                                     ^ Error: expect(received).toBeGreaterThan(expected)
  38 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  39 |     await page.screenshot({scale:'css',path:`reports/cell-visual-enhancement/full-${cell}-${width}.png`});
  40 |     await page.getByRole('button',{name:'Focus on cell',exact:true}).click();
  41 |     await page.locator('[data-cell-interior-workspace]').scrollIntoViewIfNeeded();
  42 |     await page.screenshot({scale:'css',path:`reports/cell-visual-enhancement/focused-${cell}-${width}.png`,fullPage:true});
  43 |     expect(errors).toEqual([]);
  44 |   });
  45 | }
  46 | 
```