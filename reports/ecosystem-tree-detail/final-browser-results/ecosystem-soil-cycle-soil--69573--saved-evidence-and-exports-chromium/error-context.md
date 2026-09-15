# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-soil-cycle.spec.ts >> soil cycle connects paired samples, forest-floor inspection, saved evidence and exports
- Location: tests\e2e\ecosystem-soil-cycle.spec.ts:5:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-efw-meadow]').getByRole('button', { name: 'Inspect forest floor', exact: true })

```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | test('soil cycle connects paired samples, forest-floor inspection, saved evidence and exports',async({page})=>{
  6  |   await page.setViewportSize({width:1140,height:1050});
  7  |   await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  8  |   await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  9  |   const cycle=page.locator('[data-efw-soil-cycle]');await expect(cycle).toHaveCount(0);
  10 |   await page.getByRole('button',{name:'Decomposer decline',exact:true}).click();
  11 |   await expect(page.getByLabel('Enable soil nutrient cycle',{exact:true})).toBeChecked();
  12 |   await expect(page.getByLabel('Starting decomposer biomass',{exact:true})).toHaveValue('8');
  13 |   await expect(cycle.locator('[data-efw-soil-pool]')).toHaveCount(3);
  14 |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage');
  15 |   await expect(canvas).toHaveAttribute('data-soil-enabled','true');
  16 |   await expect(canvas).toHaveAttribute('data-soil-decomposers','8');
> 17 |   await meadow.getByRole('button',{name:'Inspect forest floor',exact:true}).click();
     |                                                                             ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  18 |   await expect(canvas).toHaveAttribute('data-camera-mode','soil');
  19 |   await stage.screenshot({path:'reports/ecosystem-soil-cycle/forest-floor.jpg',type:'jpeg',quality:90});
  20 |   await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  21 |   await page.getByLabel('Soil cycle timeline',{exact:true}).fill('80');
  22 |   const expected=await page.evaluate(()=>{const w=window as any;return w.StemLab.ecosystemFoodWeb.compare(w.__toolData.ecosystem.foodWeb.run.config);});
  23 |   for(const key of ['detritus','decomposers','nutrients']){
  24 |     await expect(canvas).toHaveAttribute('data-soil-'+key,String(expected.experiment[80].soil[key]));
  25 |     await expect(cycle.locator('[data-efw-soil-pool="'+key+'"]')).toHaveAttribute('data-baseline',String(expected.baseline[80].soil[key]));
  26 |     await expect(cycle.locator('[data-efw-soil-pool="'+key+'"]')).toHaveAttribute('data-experiment',String(expected.experiment[80].soil[key]));
  27 |   }
  28 |   await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');
  29 |   await expect(canvas).toHaveAttribute('data-soil-decomposers',String(expected.baseline[80].soil.decomposers));
  30 |   await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('experiment');
  31 |   await stage.screenshot({path:'reports/ecosystem-soil-cycle/decomposer-decline.jpg',type:'jpeg',quality:90});
  32 |   await cycle.screenshot({path:'reports/ecosystem-soil-cycle/nutrient-cycle.jpg',type:'jpeg',quality:90});
  33 |   await page.getByRole('button',{name:'Save observation',exact:true}).click();
  34 |   await expect(page.locator('[data-efw-note-soil]')).toHaveCount(1);
  35 |   const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export comparison CSV',exact:true}).click();
  36 |   await (await downloadEvent).saveAs('reports/ecosystem-soil-cycle/comparison.csv');
  37 |   await page.setViewportSize({width:390,height:844});
  38 |   await cycle.screenshot({path:'reports/ecosystem-soil-cycle/mobile-cycle.jpg',type:'jpeg',quality:88});
  39 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  40 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(meadow).toContainText('Reduced motion is on');
  41 |   await page.getByRole('button',{name:'Shared-prey web',exact:true}).click();
  42 |   await expect(cycle).toHaveCount(0);await expect(canvas).toHaveAttribute('data-soil-enabled','false');await expect(canvas).toHaveAttribute('data-camera-mode','habitat');
  43 |   await page.getByRole('button',{name:'Reopen observation 1',exact:true}).click();
  44 |   await expect(page.getByLabel('Soil cycle timeline',{exact:true})).toHaveValue('80');
  45 |   await expect(canvas).toHaveAttribute('data-soil-decomposers',String(expected.experiment[80].soil.decomposers));
  46 |   await page.getByLabel('Disturbance',{exact:true}).selectOption('clearLitter');await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  47 |   await page.getByLabel('Soil cycle timeline',{exact:true}).fill('80');await expect(canvas).toHaveAttribute('data-soil-litter','0');
  48 |   await page.getByLabel('Starting decomposer biomass',{exact:true}).fill('0');await expect(canvas).toHaveAttribute('data-soil-fungi','0');
  49 |   await page.getByLabel('Enable soil nutrient cycle',{exact:true}).uncheck();await expect(page.getByLabel('Disturbance',{exact:true})).toHaveValue('none');
  50 |   expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  51 | });
  52 | 
```