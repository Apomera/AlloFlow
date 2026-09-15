# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-behavior.spec.ts >> behavior, following inspection, isolation, rewind and branch samples stay coordinated
- Location: tests\e2e\ecosystem-behavior.spec.ts:5:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[data-efw-meadow]').locator('[data-efw-behavior]')
Expected substring: "Hopping"
Received string:    "Moving away · Representative behavior at the selected time. "
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('[data-efw-meadow]').locator('[data-efw-behavior]')
    33 × locator resolved to <p data-efw-behavior="true">…</p>
       - unexpected value "Moving away · Representative behavior at the selected time. "

```

```yaml
- paragraph:
  - strong: Moving away
  - text: · Representative behavior at the selected time.
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | test('behavior, following inspection, isolation, rewind and branch samples stay coordinated',async({page})=>{
  6  |   await page.setViewportSize({width:1140,height:1050});
  7  |   await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  8  |   await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  9  |   await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();
  10 |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage');
  11 |   await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
> 12 |   await expect(meadow.locator('[data-efw-behavior]')).toContainText('Moving away');
     |                                                       ^ Error: expect(locator).toContainText(expected) failed
  13 |   const setup=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  14 |   const isolate=meadow.getByRole('button',{name:'Isolate specimen',exact:true});await isolate.focus();await isolate.press('Enter');
  15 |   await expect(isolate).toHaveAttribute('aria-pressed','true');
  16 |   await expect(canvas).toHaveAttribute('data-isolated-specimen','true');await expect(canvas).toHaveAttribute('data-visible-glyphs-bluetits','1');await expect(canvas).toHaveAttribute('data-visible-glyphs-plants','0');await expect(canvas).toHaveAttribute('data-glyphs-plants','40');
  17 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(setup);
  18 |   await stage.screenshot({path:'reports/ecosystem-behavior/isolated-blue-tit.jpg',type:'jpeg',quality:90});
  19 |   await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  20 |   const timeline=meadow.getByLabel('Meadow timeline',{exact:true});await timeline.fill('60');
  21 |   const expected=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,p=a.compare(c);return {pose:a.behaviorTimeline(c,p.experiment)[60].bluetits[0],value:p.experiment[60].values.bluetits};});
  22 |   await expect(canvas).toHaveAttribute('data-behavior',expected.pose.state);await expect(meadow.locator('[data-efw-behavior]')).toContainText(expected.pose.state);
  23 |   await expect(canvas).toHaveAttribute('data-representative-position',expected.pose.x.toFixed(4)+','+expected.pose.z.toFixed(4));await expect(canvas).toHaveAttribute('data-biomass-bluetits',String(expected.value));
  24 |   const position=await canvas.getAttribute('data-representative-position'),behavior=await canvas.getAttribute('data-behavior');
  25 |   await timeline.fill('150');await timeline.fill('60');await expect(canvas).toHaveAttribute('data-representative-position',position!);await expect(canvas).toHaveAttribute('data-behavior',behavior!);
  26 |   await isolate.click();await expect(canvas).toHaveAttribute('data-visible-glyphs-bluetits',await canvas.getAttribute('data-glyphs-bluetits')||'');await expect(canvas).toHaveAttribute('data-representative-position',position!);
  27 |   await meadow.getByRole('button',{name:/Red foxes/}).click();await isolate.click();
  28 |   const huntStep=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,frames=a.behaviorTimeline(c,a.compare(c).experiment);return frames.findIndex((f:any)=>f.foxes[0].state==='Pouncing');});
  29 |   expect(huntStep).toBeGreaterThan(0);await timeline.fill(String(huntStep));await expect(canvas).toHaveAttribute('data-behavior','Pouncing');
  30 |   await stage.screenshot({path:'reports/ecosystem-behavior/fox-pounce.jpg',type:'jpeg',quality:90});
  31 |   await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-behavior/mobile-inspection.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  32 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(meadow).toContainText('Motion is frozen');const still=await canvas.getAttribute('data-representative-position');await timeline.fill('240');await expect(canvas).toHaveAttribute('data-representative-position',still!);
  33 |   await meadow.getByRole('button',{name:'Habitat view',exact:true}).click();await expect(canvas).toHaveAttribute('data-isolated-specimen','false');await expect(canvas).toHaveAttribute('data-visible-glyphs-plants',await canvas.getAttribute('data-glyphs-plants')||'');
  34 |   await page.getByLabel('Disturbance',{exact:true}).selectOption('remove');await page.getByLabel('Affected group',{exact:true}).selectOption('foxes');await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  35 |   await expect(canvas).toHaveAttribute('data-visible-glyphs-foxes','0');await expect(meadow.locator('[data-efw-behavior]')).toContainText('Not present');
  36 |   await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');await expect(canvas).not.toHaveAttribute('data-visible-glyphs-foxes','0');
  37 |   await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(canvas).toHaveAttribute('data-isolated-specimen','false');
  38 |   expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  39 | });
  40 | 
```