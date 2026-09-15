# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-tree-review.spec.ts >> woodland lighting changes the rendered scene while preserving evidence and camera controls
- Location: tests\e2e\ecosystem-tree-review.spec.ts:9:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-efw-meadow]').getByRole('button', { name: 'Forest overview', exact: true })

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | 
  4  | const harness = new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  5  | test.beforeAll(async()=>harness.start());
  6  | test.afterAll(async()=>harness.stop());
  7  | test.afterEach(async({page})=>harness.destroy(page));
  8  | 
  9  | test('woodland lighting changes the rendered scene while preserving evidence and camera controls',async({page})=>{
  10 |   await page.setViewportSize({width:1140,height:1000});
  11 |   await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  12 |   await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  13 |   await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();
  14 |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage');
  15 |   const lighting=meadow.getByRole('combobox',{name:'Woodland lighting',exact:true});
  16 |   await expect(canvas).toHaveAttribute('data-lighting','daylight');
  17 |   await expect(canvas).toHaveAttribute('data-grass-tufts','2400');
  18 |   expect(Number(await canvas.getAttribute('data-root-count'))).toBeGreaterThan(400);
> 19 |   await meadow.getByRole('button',{name:'Forest overview',exact:true}).click();
     |                                                                        ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  20 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/forest-overview.jpg',type:'jpeg',quality:90});
  21 |   await meadow.getByRole('button',{name:'Rotate left',exact:true}).click();
  22 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/forest-rotated.jpg',type:'jpeg',quality:90});
  23 |   await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();
  24 |   const setup=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  25 |   const originalCanvas=await canvas.elementHandle();
  26 |   const day=await stage.screenshot({path:'reports/ecosystem-tree-detail/daylight.jpg',type:'jpeg',quality:88});
  27 |   await lighting.selectOption('golden');
  28 |   await expect(canvas).toHaveAttribute('data-lighting','golden');
  29 |   const golden=await stage.screenshot({path:'reports/ecosystem-tree-detail/golden-hour.jpg',type:'jpeg',quality:88});
  30 |   expect(golden.equals(day)).toBe(false);
  31 |   await lighting.focus();await lighting.press('ArrowDown');
  32 |   await expect(lighting).toHaveValue('overcast');
  33 |   await expect(canvas).toHaveAttribute('data-lighting','overcast');
  34 |   const overcast=await stage.screenshot({path:'reports/ecosystem-tree-detail/overcast.jpg',type:'jpeg',quality:88});
  35 |   expect(overcast.equals(golden)).toBe(false);
  36 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(setup);
  37 |   expect(await originalCanvas!.evaluate(el=>el===document.querySelector('[data-efw-meadow] canvas'))).toBe(true);
  38 |   await lighting.selectOption('golden');
  39 |   await meadow.getByRole('button',{name:/Red foxes/}).click();
  40 |   await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  41 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/fox-inspection.jpg',type:'jpeg',quality:88});
  42 |   await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  43 |   await expect(canvas).toHaveAttribute('data-refuge-cover','50');
  44 |   const results=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  45 |   await lighting.selectOption('daylight');
  46 |   await expect(canvas).toHaveAttribute('data-lighting','daylight');
  47 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(results);
  48 |   await meadow.getByRole('combobox',{name:'Meadow scene data',exact:true}).selectOption('baseline');
  49 |   await expect(canvas).toHaveAttribute('data-refuge-cover','10');
  50 |   await meadow.getByRole('combobox',{name:'Meadow scene data',exact:true}).selectOption('experiment');
  51 |   await expect(canvas).toHaveAttribute('data-refuge-cover','50');
  52 |   await page.emulateMedia({reducedMotion:'reduce'});
  53 |   await expect(meadow).toContainText('Reduced motion is on');
  54 |   await lighting.selectOption('overcast');
  55 |   await expect(canvas).toHaveAttribute('data-lighting','overcast');
  56 |   await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();
  57 |   await page.setViewportSize({width:390,height:844});
  58 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/mobile.jpg',type:'jpeg',quality:88});
  59 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  60 |   await page.getByRole('button',{name:'Hide 3D meadow',exact:true}).click();
  61 |   await expect(canvas).toHaveCount(0);
  62 |   await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  63 |   await expect(canvas).toHaveAttribute('data-lighting','daylight');
  64 |   await expect(canvas).toHaveAttribute('data-refuge-cover','50');
  65 |   expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  66 | });
  67 | 
```