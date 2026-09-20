# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-directional-attention.spec.ts >> mammal heads and ears render directional attention and replay it exactly
- Location: tests\e2e\ecosystem-directional-attention.spec.ts:6:5

# Error details

```
TimeoutError: locator.selectOption: Timeout 120000ms exceeded.
Call log:
  - waiting for locator('[data-efw-meadow]').getByLabel('Representative animal', { exact: true })
    - locator resolved to <select disabled aria-label="Representative animal">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - element is not enabled
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - element is not enabled
    - retrying select option action
      - waiting 100ms
    228 × waiting for element to be visible and enabled
        - element is not enabled
      - retrying select option action
        - waiting 500ms

```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | 
  6  | test('mammal heads and ears render directional attention and replay it exactly',async({page})=>{
  7  |   page.setDefaultTimeout(120000);await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  8  |   await page.evaluate(()=>{
  9  |     document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
  10 |     const w=window as any,p=w.THREE.Object3D.prototype,original=p.updateMatrixWorld;
  11 |     p.updateMatrixWorld=function(force:any){const result=original.call(this,force);if(this.isScene)w.__attentionScene=this.children.filter((a:any)=>a.userData.ecoRepresentative&&a.userData.head&&a.userData.ears).map((a:any)=>({species:a.userData.body.children.find((c:any)=>c.userData.species)?.userData.species,visible:a.visible,head:a.userData.head.rotation.y,ears:a.userData.ears.map((e:any)=>e.rotation.y),position:[a.position.x,a.position.z],yaw:a.rotation.y}));return result;};
  12 |   });
  13 |   await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  14 |   const meadow=page.locator('[data-efw-meadow]'),timeline=meadow.getByLabel('Meadow timeline',{exact:true}),stage=meadow.locator('.efw-meadow-stage');
  15 |   const data=await page.evaluate(()=>{
  16 |     const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,frames=a.behaviorTimeline(c,a.compare(c).experiment),targets:any={};
  17 |     for(const id of ['foxes','rabbits','voles']){
  18 |       let best:any=null;
  19 |       for(let t=5;t<frames.length;t++)for(let i=0;i<7;i++){const p=frames[t][id][i];if(p.active&&p.attention&&p.forage<.4&&Math.abs(p.headTurn)>.25&&(!best||Math.abs(p.headTurn)>Math.abs(best.pose.headTurn)))best={step:t,index:i,pose:p,start:frames[0][id][i]};}
  20 |       targets[id]=best;
  21 |     }return {targets,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
  22 |   });
  23 |   await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'View from above',exact:true}).click();
  24 |   for(const [id,name] of [['foxes',/Red foxes\s/],['rabbits',/Rabbits\s/],['voles',/voles\s/i]] as const){
> 25 |     const t=data.targets[id];expect(t).toBeTruthy();await meadow.getByRole('button',{name}).click();await timeline.fill(String(t.step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(t.index));
     |                                                                                                                                                                                                       ^ TimeoutError: locator.selectOption: Timeout 120000ms exceeded.
  26 |     const actual=()=>page.evaluate(({id,index})=>(window as any).__attentionScene.filter((p:any)=>p.species===id)[index],{id,index:t.index});
  27 |     await expect.poll(async()=>(await actual())?.head).toBe(t.pose.headTurn);const remembered=await actual();
  28 |     expect(remembered.visible).toBe(true);expect(remembered.ears).toEqual([t.pose.earLeft,t.pose.earRight]);expect(remembered.position).toEqual([t.pose.x,t.pose.z]);
  29 |     await stage.screenshot({path:`reports/ecosystem-directional-attention/${id}.jpg`,type:'jpeg',quality:90});
  30 |     await timeline.fill('0');await expect.poll(async()=>(await actual())?.head).toBe(t.start.headTurn);await timeline.fill(String(t.step));await expect.poll(actual).toEqual(remembered);
  31 |     await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await actual())?.head).toBe(t.start.headTurn);await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(actual).toEqual(remembered);
  32 |   }
  33 |   await meadow.getByRole('button',{name:/Rabbits\s/}).click();const r=data.targets.rabbits;await timeline.fill(String(r.step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(r.index));await page.setViewportSize({width:390,height:844});
  34 |   await stage.screenshot({path:'reports/ecosystem-directional-attention/mobile.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  35 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  36 | });
  37 | 
```