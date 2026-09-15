# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-steady-camera.spec.ts >> steady camera reveals turns and leaps, rewinds deterministically and retains heading mode
- Location: tests\e2e\ecosystem-steady-camera.spec.ts:11:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-efw-meadow]').locator('canvas')
Expected: "[-2.9634975410717996,0.6245354394051852,0.9282654940306762]"
Received: "[-3.184661452853551,0.6149683622746392,0.7437918532973896]"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-efw-meadow]').locator('canvas')
    30 × locator resolved to <canvas width="304" height="418" data-step="0" data-owl-bank="0" data-trail-end="" aria-hidden="true" data-soil-fungi="0" data-trail-range="" data-soil-litter="0" data-glyphs-owls="7" data-root-count="700" data-glyphs-voles="7" data-glyphs-foxes="7" data-biomass-owls="6" data-soil-detritus="0" data-refuge-cover="10" data-trail-samples="0" data-biomass-foxes="9" data-grass-tufts="2400" data-forest-trees="175" data-soil-nutrients="0" data-interaction-cue="" data-wing-amplitude="0" data-glyphs-plants="40…></canvas>
       - unexpected value "[-3.184661452853551,0.6149683622746392,0.7437918532973896]"

```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | async function setup(page:any){
  6  |   await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  7  |   await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  8  |   await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  9  |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),timeline=meadow.getByLabel('Meadow timeline',{exact:true});await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();return {meadow,canvas,timeline,tracking:meadow.getByLabel('Animal camera tracking',{exact:true})};
  10 | }
  11 | test('steady camera reveals turns and leaps, rewinds deterministically and retains heading mode',async({page})=>{
  12 |   const {meadow,canvas,timeline,tracking}=await setup(page);await meadow.getByRole('button',{name:/Red foxes\s/}).click();await timeline.fill('0');
  13 |   const data=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,f=a.behaviorTimeline(c,a.compare(c).experiment);let leap:any=null;for(let step=0;step<f.length&&!leap;step++)for(let index=0;index<16;index++)if(f[step].foxes[index].active&&f[step].foxes[index].altitude>0.30){leap={step,index,rise:f[step].foxes[index].altitude-f[0].foxes[index].altitude};break;}return {turn:f.findIndex((x:any)=>Math.abs(x.foxes[0].yaw-f[0].foxes[0].yaw)>0.8),leap,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};});
  14 |   expect(data.turn).toBeGreaterThan(0);expect(data.leap).toBeTruthy();await expect(tracking).toHaveValue('steady');const bearing=await canvas.getAttribute('data-camera-bearing');await timeline.fill(String(data.turn));await expect(canvas).toHaveAttribute('data-camera-bearing',bearing!);const target=await canvas.getAttribute('data-camera-target');
  15 |   await tracking.selectOption('heading');await expect(canvas).toHaveAttribute('data-camera-tracking','heading');await expect(canvas).not.toHaveAttribute('data-camera-bearing',bearing!);await expect(timeline).toHaveValue(String(data.turn));await tracking.selectOption('steady');await expect(canvas).toHaveAttribute('data-camera-bearing',bearing!);
  16 |   await meadow.getByRole('button',{name:'Rotate left',exact:true}).click();expect(Number(await canvas.getAttribute('data-camera-bearing'))).toBeCloseTo(Number(bearing)-Math.PI/6,7);await meadow.getByRole('button',{name:'Rotate right',exact:true}).click();
  17 |   await timeline.fill('0');await timeline.fill(String(data.turn));await expect(canvas).toHaveAttribute('data-camera-target',target!);
  18 |   await timeline.fill(String(data.leap.step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(data.leap.index));await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  19 |   const steadyTarget=JSON.parse((await canvas.getAttribute('data-camera-target'))!);await tracking.selectOption('heading');const headingTarget=JSON.parse((await canvas.getAttribute('data-camera-target'))!);expect(headingTarget[1]-steadyTarget[1]).toBeCloseTo(data.leap.rise,7);await tracking.selectOption('steady');
  20 |   await meadow.locator('.efw-meadow-stage').screenshot({path:'reports/ecosystem-steady-camera/fox-leap.jpg',type:'jpeg',quality:90});
  21 |   await page.setViewportSize({width:390,height:844});await meadow.locator('.efw-meadow-stage').screenshot({path:'reports/ecosystem-steady-camera/mobile-leap.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
> 22 |   await page.emulateMedia({reducedMotion:'reduce'});const frozen=await canvas.getAttribute('data-camera-target');await timeline.fill('0');await expect(canvas).toHaveAttribute('data-camera-target',frozen!);await expect(canvas).toHaveAttribute('data-behavior','Starting pose');
     |                                                                                                                                                                ^ Error: expect(locator).toHaveAttribute(expected) failed
  23 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);await tracking.selectOption('heading');await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await expect(tracking).toHaveValue('steady');expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  24 | });
  25 | test('interaction preference holds its bearing when a cue disappears and restores the chosen tracking mode',async({page})=>{
  26 |   const {meadow,canvas,timeline,tracking}=await setup(page);await timeline.fill('0');await tracking.selectOption('heading');const reason=meadow.locator('[data-efw-action-reason]');await reason.locator('summary').click();const interaction=reason.getByRole('button',{name:'Show behavior interaction',exact:true});await interaction.click();await expect(tracking).toBeDisabled();await expect(canvas).toHaveAttribute('data-camera-tracking','steady');const bearing=await canvas.getAttribute('data-camera-bearing');
  27 |   const noCue=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config;return a.behaviorTimeline(c,a.compare(c).experiment).findIndex((f:any)=>f.bluetits[0].active&&!a.interaction(f,'bluetits',0));});expect(noCue).toBeGreaterThan(0);await timeline.fill(String(noCue));await expect(canvas).toHaveAttribute('data-interaction-view','false');await expect(canvas).toHaveAttribute('data-camera-bearing',bearing!);await interaction.click();await expect(tracking).toBeEnabled();await expect(tracking).toHaveValue('heading');await expect(canvas).toHaveAttribute('data-camera-tracking','heading');expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  28 | });
  29 | 
```