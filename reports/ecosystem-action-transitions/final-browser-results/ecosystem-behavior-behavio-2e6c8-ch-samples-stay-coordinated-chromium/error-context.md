# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-behavior.spec.ts >> behavior, following inspection, isolation, rewind and branch samples stay coordinated
- Location: tests\e2e\ecosystem-behavior.spec.ts:5:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-efw-meadow]').locator('canvas')
Expected: "-1.3833,-2.5894"
Received: "-2.4219,4.9509"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-efw-meadow]').locator('canvas')
    30 × locator resolved to <canvas width="304" height="418" data-step="240" aria-hidden="true" data-soil-fungi="0" data-soil-litter="0" data-glyphs-owls="2" data-root-count="700" data-glyphs-voles="1" data-glyphs-foxes="3" data-soil-detritus="0" data-refuge-cover="10" data-hunt-stage="none" data-grass-tufts="2400" data-forest-trees="175" data-soil-nutrients="0" data-glyphs-plants="56" data-glyphs-rabbits="1" data-lighting="daylight" data-glyphs-bluetits="4" data-branch="experiment" data-soil-decomposers="0" data-soil-enabled="f…></canvas>
       - unexpected value "-2.4219,4.9509"

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
  12 |   await expect(meadow.locator('[data-efw-behavior]')).toContainText('Moving away');
  13 |   const setup=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  14 |   const isolate=meadow.getByRole('button',{name:'Isolate specimen',exact:true});await isolate.focus();await isolate.press('Enter');
  15 |   await expect(isolate).toHaveAttribute('aria-pressed','true');
  16 |   await expect(canvas).toHaveAttribute('data-isolated-specimen','true');await expect(canvas).toHaveAttribute('data-visible-glyphs-bluetits','1');await expect(canvas).toHaveAttribute('data-visible-glyphs-plants','0');await expect(canvas).toHaveAttribute('data-glyphs-plants','40');
  17 |   const representative=meadow.getByLabel('Representative animal',{exact:true});
  18 |   const firstPosition=await canvas.getAttribute('data-representative-position');
  19 |   await representative.selectOption('1');await expect(canvas).toHaveAttribute('data-representative-index','1');await expect(canvas).toHaveAttribute('data-visible-glyphs-bluetits','1');await expect(canvas).not.toHaveAttribute('data-representative-position',firstPosition!);
  20 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(setup);
  21 |   await representative.selectOption('0');await expect(canvas).toHaveAttribute('data-representative-position',firstPosition!);
  22 |   await stage.screenshot({path:'reports/ecosystem-action-transitions/isolated-blue-tit.jpg',type:'jpeg',quality:90});
  23 |   await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  24 |   const timeline=meadow.getByLabel('Meadow timeline',{exact:true});await timeline.fill('60');
  25 |   const expected=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,p=a.compare(c);return {pose:a.behaviorTimeline(c,p.experiment)[60].bluetits[0],value:p.experiment[60].values.bluetits};});
  26 |   await expect(canvas).toHaveAttribute('data-behavior',expected.pose.state);await expect(meadow.locator('[data-efw-behavior]')).toContainText(expected.pose.state);
  27 |   await expect(canvas).toHaveAttribute('data-representative-position',expected.pose.x.toFixed(4)+','+expected.pose.z.toFixed(4));await expect(canvas).toHaveAttribute('data-biomass-bluetits',String(expected.value));
  28 |   const position=await canvas.getAttribute('data-representative-position'),behavior=await canvas.getAttribute('data-behavior');
  29 |   await timeline.fill('150');await timeline.fill('60');await expect(canvas).toHaveAttribute('data-representative-position',position!);await expect(canvas).toHaveAttribute('data-behavior',behavior!);
  30 |   await isolate.click();await expect(canvas).toHaveAttribute('data-visible-glyphs-bluetits',await canvas.getAttribute('data-glyphs-bluetits')||'');await expect(canvas).toHaveAttribute('data-representative-position',position!);
  31 |   await meadow.getByRole('button',{name:/Red foxes/}).click();await isolate.click();
  32 |   const hunt=await page.evaluate(()=>{
  33 |     const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,frames=a.behaviorTimeline(c,a.compare(c).experiment);
  34 |     for(let i=0;i<16;i++)for(let t=1;t<frames.length-16;t++)if(frames[t].foxes[i].huntStage==='airborne'&&frames[t].foxes[i].huntAge===0&&frames[t+10].foxes[i].active){const p=frames[t+4].foxes[i];return {index:i,takeoff:t,peak:t+4,position:p.x.toFixed(4)+','+p.z.toFixed(4)};}
  35 |     return null;
  36 |   });
  37 |   expect(hunt).not.toBeNull();const takeoff=hunt!.takeoff,huntStep=hunt!.peak;
  38 |   await timeline.fill(String(takeoff));await representative.selectOption(String(hunt!.index));await expect(canvas).toHaveAttribute('data-representative-index',String(hunt!.index));
  39 |   await timeline.fill(String(takeoff-1));await expect(canvas).toHaveAttribute('data-hunt-stage','prepare');await expect(meadow.locator('[data-efw-behavior]')).toContainText('Preparing to pounce');
  40 |   await stage.screenshot({path:'reports/ecosystem-action-transitions/fox-preparation.jpg',type:'jpeg',quality:90});
  41 |   await timeline.fill(String(takeoff+10));await expect(canvas).toHaveAttribute('data-hunt-stage','recover');await expect(meadow.locator('[data-efw-behavior]')).toContainText('Recovering');
  42 |   await stage.screenshot({path:'reports/ecosystem-action-transitions/fox-recovery.jpg',type:'jpeg',quality:90});
  43 |   await timeline.fill(String(huntStep));await expect(canvas).toHaveAttribute('data-behavior','Pouncing');await expect(canvas).toHaveAttribute('data-hunt-stage','airborne');await expect(canvas).toHaveAttribute('data-representative-position',hunt!.position);await expect(canvas).toHaveAttribute('data-visible-glyphs-foxes','1');
  44 |   await stage.screenshot({path:'reports/ecosystem-action-transitions/fox-pounce.jpg',type:'jpeg',quality:90});
  45 |   await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-action-transitions/mobile-inspection.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
> 46 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(meadow).toContainText('Motion is frozen');const still=await canvas.getAttribute('data-representative-position');await timeline.fill('240');await expect(canvas).toHaveAttribute('data-representative-position',still!);
     |                                                                                                                                                                                                                                  ^ Error: expect(locator).toHaveAttribute(expected) failed
  47 |   await meadow.getByRole('button',{name:'Habitat view',exact:true}).click();await expect(canvas).toHaveAttribute('data-isolated-specimen','false');await expect(canvas).toHaveAttribute('data-visible-glyphs-plants',await canvas.getAttribute('data-glyphs-plants')||'');
  48 |   await page.getByLabel('Disturbance',{exact:true}).selectOption('remove');await page.getByLabel('Affected group',{exact:true}).selectOption('foxes');await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  49 |   await expect(canvas).toHaveAttribute('data-visible-glyphs-foxes','0');await expect(meadow.locator('[data-efw-behavior]')).toContainText('Not present');await expect(representative).toBeDisabled();await expect(canvas).toHaveAttribute('data-representative-index','0');
  50 |   await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');await expect(canvas).not.toHaveAttribute('data-visible-glyphs-foxes','0');
  51 |   await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(canvas).toHaveAttribute('data-isolated-specimen','false');await expect(canvas).toHaveAttribute('data-representative-index','0');
  52 |   expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  53 | });
  54 | 
```