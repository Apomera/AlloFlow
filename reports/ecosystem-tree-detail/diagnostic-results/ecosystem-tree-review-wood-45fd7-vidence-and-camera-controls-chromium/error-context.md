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
  10 |   page.on('console',msg=>console.log(msg.text()));
  11 |   await page.setViewportSize({width:1140,height:1000});
  12 |   await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  13 |   await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  14 |   await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();
  15 |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage');
  16 |   const lighting=meadow.getByRole('combobox',{name:'Woodland lighting',exact:true});
  17 |   await expect(canvas).toHaveAttribute('data-lighting','daylight');
  18 |   await expect(canvas).toHaveAttribute('data-grass-tufts','2400');
  19 |   expect(Number(await canvas.getAttribute('data-root-count'))).toBeGreaterThan(400);
> 20 |   await meadow.getByRole('button',{name:'Forest overview',exact:true}).click();
     |                                                                        ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  21 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/forest-overview.jpg',type:'jpeg',quality:90});
  22 |   await meadow.getByRole('button',{name:'Rotate left',exact:true}).click();
  23 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/forest-rotated.jpg',type:'jpeg',quality:90});
  24 |   await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();
  25 |   const setup=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  26 |   const originalCanvas=await canvas.elementHandle();
  27 |   const day=await stage.screenshot({path:'reports/ecosystem-tree-detail/daylight.jpg',type:'jpeg',quality:88});
  28 |   await lighting.selectOption('golden');
  29 |   await expect(canvas).toHaveAttribute('data-lighting','golden');
  30 |   const golden=await stage.screenshot({path:'reports/ecosystem-tree-detail/golden-hour.jpg',type:'jpeg',quality:88});
  31 |   expect(golden.equals(day)).toBe(false);
  32 |   await lighting.focus();await lighting.press('ArrowDown');
  33 |   await expect(lighting).toHaveValue('overcast');
  34 |   await expect(canvas).toHaveAttribute('data-lighting','overcast');
  35 |   const overcast=await stage.screenshot({path:'reports/ecosystem-tree-detail/overcast.jpg',type:'jpeg',quality:88});
  36 |   expect(overcast.equals(golden)).toBe(false);
  37 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(setup);
  38 |   expect(await originalCanvas!.evaluate(el=>el===document.querySelector('[data-efw-meadow] canvas'))).toBe(true);
  39 |   await lighting.selectOption('golden');
  40 |   await meadow.getByRole('button',{name:/Red foxes/}).click();
  41 |   await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  42 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/fox-inspection.jpg',type:'jpeg',quality:88});
  43 |   await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  44 |   await expect(canvas).toHaveAttribute('data-refuge-cover','50');
  45 |   const results=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  46 |   await lighting.selectOption('daylight');
  47 |   await expect(canvas).toHaveAttribute('data-lighting','daylight');
  48 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(results);
  49 |   await meadow.getByRole('combobox',{name:'Meadow scene data',exact:true}).selectOption('baseline');
  50 |   await expect(canvas).toHaveAttribute('data-refuge-cover','10');
  51 |   await meadow.getByRole('combobox',{name:'Meadow scene data',exact:true}).selectOption('experiment');
  52 |   await expect(canvas).toHaveAttribute('data-refuge-cover','50');
  53 |   await page.emulateMedia({reducedMotion:'reduce'});
  54 |   await expect(meadow).toContainText('Reduced motion is on');
  55 |   await lighting.selectOption('overcast');
  56 |   await expect(canvas).toHaveAttribute('data-lighting','overcast');
  57 |   await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();
  58 |   await page.setViewportSize({width:390,height:844});
  59 |   await stage.screenshot({path:'reports/ecosystem-tree-detail/mobile.jpg',type:'jpeg',quality:88});
  60 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  61 |   await page.getByRole('button',{name:'Hide 3D meadow',exact:true}).click();
  62 |   await expect(canvas).toHaveCount(0);
  63 |   await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  64 |   await expect(canvas).toHaveAttribute('data-lighting','daylight');
  65 |   await expect(canvas).toHaveAttribute('data-refuge-cover','50');
  66 |   expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  67 | });
  68 | 
```