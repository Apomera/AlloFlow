# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-species-motion.spec.ts >> articulated insects, banking owls and action overlays follow the selected sample
- Location: tests\e2e\ecosystem-species-motion.spec.ts:5:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | test('articulated insects, banking owls and action overlays follow the selected sample',async({page})=>{
  6  |   await page.setViewportSize({width:1140,height:1050});
  7  |   await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  8  |   await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  9  |   await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  10 |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage'),timeline=meadow.getByLabel('Meadow timeline',{exact:true});
  11 |   const expected=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,rows=a.compare(c).experiment,f=a.behaviorTimeline(c,rows),crawl=f.findIndex((x:any)=>x.caterpillars[0].active&&x.caterpillars[0].crawl>.8),feed=f.findIndex((x:any)=>x.caterpillars[0].state==='Feeding'&&x.caterpillars[0].crawl===0),bank=f.reduce((best:number,x:any,i:number)=>Math.abs(x.owls[0].bank)>Math.abs(f[best].owls[0].bank)?i:best,0);return {crawl,feed,bank,parts:JSON.stringify(Array.from({length:14},(_,i)=>a.segmentPose(f[crawl].caterpillars[0],i))),bankValue:f[bank].owls[0].bank.toFixed(5),wing:f[bank].owls[0].wingFlap.toFixed(5),owlState:f[bank].owls[0].state,biomass:rows[crawl].values.caterpillars};});
> 12 |   expect(expected.crawl).toBeGreaterThan(0);expect(expected.feed).toBeGreaterThan(0);expect(expected.bank).toBeGreaterThan(0);
     |                                                                   ^ Error: expect(received).toBeGreaterThan(expected)
  13 |   await meadow.getByRole('button',{name:/Caterpillars\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();await timeline.fill(String(expected.crawl));
  14 |   await expect(canvas).toHaveAttribute('data-caterpillar-segments','14');await expect(canvas).toHaveAttribute('data-caterpillar-articulation',expected.parts);await expect(canvas).toHaveAttribute('data-biomass-caterpillars',String(expected.biomass));await expect(meadow.locator('[data-efw-action-overlay]')).toContainText('Crawling');
  15 |   await stage.screenshot({path:'reports/ecosystem-species-motion/caterpillar-crawling.jpg',type:'jpeg',quality:90});
  16 |   await timeline.fill(String(expected.feed));await expect(meadow.locator('[data-efw-action-overlay]')).toContainText('Feeding');await expect(canvas).not.toHaveAttribute('data-caterpillar-articulation',expected.parts);
  17 |   await timeline.fill(String(expected.crawl));await expect(canvas).toHaveAttribute('data-caterpillar-articulation',expected.parts);
  18 |   await meadow.getByRole('button',{name:/Barn owls\s/}).click();await timeline.fill(String(expected.bank));await expect(canvas).toHaveAttribute('data-owl-bank',expected.bankValue);await expect(canvas).toHaveAttribute('data-wing-amplitude',expected.wing);await expect(meadow.locator('[data-efw-action-overlay]')).toContainText(expected.owlState);
  19 |   await stage.screenshot({path:'reports/ecosystem-species-motion/owl-banking.jpg',type:'jpeg',quality:90});
  20 |   await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-species-motion/mobile-owl.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  21 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(meadow.locator('[data-efw-action-overlay]')).toContainText('Starting pose');await expect(canvas).toHaveAttribute('data-owl-bank','0.00000');
  22 |   await meadow.getByRole('button',{name:/Caterpillars\s/}).click();const frozen=await canvas.getAttribute('data-caterpillar-articulation');await timeline.fill('240');await expect(canvas).toHaveAttribute('data-caterpillar-articulation',frozen!);
  23 |   await meadow.getByRole('button',{name:'Habitat view',exact:true}).click();await expect(meadow.locator('[data-efw-action-overlay]')).toHaveCount(0);
  24 |   expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  25 | });
  26 | 
```