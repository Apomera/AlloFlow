# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-ear-motion.spec.ts >> articulated ears follow the head, recorded poses, rewind and reduced motion
- Location: tests\e2e\ecosystem-ear-motion.spec.ts:5:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-efw-meadow]').getByRole('button', { name: /Voles\s/ })

```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | test('articulated ears follow the head, recorded poses, rewind and reduced motion',async({page})=>{
  6  |   await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  7  |   await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';const w=window as any,p=w.THREE.Object3D.prototype,update=p.updateMatrixWorld;w.__earScene=[];p.updateMatrixWorld=function(force:any){if(this.isScene)w.__earScene=this.children.filter((a:any)=>a.visible===true&&a.userData.ears).map((a:any)=>a.userData.ears.map((ear:any)=>({angles:[ear.rotation.y,ear.rotation.z],attached:ear.parent===a.userData.head,parts:ear.children.length})));return update.call(this,force);};});
  8  |   await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  9  |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),timeline=meadow.getByLabel('Meadow timeline',{exact:true}),stage=meadow.locator('.efw-meadow-stage');
  10 |   await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  11 |   const data=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,f=a.behaviorTimeline(c,a.compare(c).experiment),targets:any={};for(const id of ['foxes','rabbits','voles']){const step=f.reduce((best:number,frame:any,i:number)=>Math.abs(frame[id][0].earLeft-frame[id][0].earRight)>Math.abs(f[best][id][0].earLeft-f[best][id][0].earRight)?i:best,0),p=f[step][id][0];targets[id]={step,angles:[p.earLeft,p.earRight,p.earTilt]};}return {targets,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};});
  12 |   for(const [id,name] of [['foxes',/Red foxes\s/],['rabbits',/Rabbits\s/],['voles',/Voles\s/]] as const){
> 13 |     const expected=data.targets[id];expect(expected.step).toBeGreaterThan(0);await meadow.getByRole('button',{name}).click();await timeline.fill(String(expected.step));await expect(canvas).toHaveAttribute('data-articulated-ears','2');await expect(canvas).toHaveAttribute('data-ear-articulation',JSON.stringify(expected.angles));
     |                                                                                                                      ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  14 |     const actual=await page.evaluate(()=>(window as any).__earScene);expect(actual).toHaveLength(1);expect(actual[0]).toEqual([{angles:[expected.angles[0],expected.angles[2]],attached:true,parts:2},{angles:[expected.angles[1],expected.angles[2]],attached:true,parts:2}]);
  15 |     await stage.screenshot({path:`reports/ecosystem-ear-motion/${id}.jpg`,type:'jpeg',quality:90});await timeline.fill('0');await expect(canvas).toHaveAttribute('data-ear-articulation','[0,0,0]');await timeline.fill(String(expected.step));await expect(canvas).toHaveAttribute('data-ear-articulation',JSON.stringify(expected.angles));
  16 |   }
  17 |   await meadow.getByRole('button',{name:/Rabbits\s/}).click();await timeline.fill(String(data.targets.rabbits.step));await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-ear-motion/mobile-rabbit.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  18 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');await expect(canvas).toHaveAttribute('data-ear-articulation','[0,0,0]');await timeline.fill('180');await expect(canvas).toHaveAttribute('data-ear-articulation','[0,0,0]');expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  19 | });
  20 | 
```