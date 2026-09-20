# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-ground-navigation.spec.ts >> ground detours appear in the scene, explanation and trail and replay exactly
- Location: tests\e2e\ecosystem-ground-navigation.spec.ts:5:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: null
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | test('ground detours appear in the scene, explanation and trail and replay exactly',async({page})=>{
  6  |   page.setDefaultTimeout(120000);await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  7  |   await page.evaluate(()=>{
  8  |     document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
  9  |     const w=window as any,p=w.THREE.Object3D.prototype,original=p.updateMatrixWorld;
  10 |     p.updateMatrixWorld=function(force:any){const result=original.call(this,force);if(this.isScene)w.__groundScene=this.children.filter((a:any)=>a.userData.ecoRepresentative&&a.userData.body).map((a:any)=>({species:a.userData.body.children.find((c:any)=>c.userData.species)?.userData.species,visible:a.visible,x:a.position.x,z:a.position.z}));return result;};
  11 |   });
  12 |   await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  13 |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage'),timeline=meadow.getByLabel('Meadow timeline',{exact:true});
  14 |   const target=await page.evaluate(()=>{
  15 |     const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,pair=a.compare(c),frames=a.behaviorTimeline(c,pair.experiment);w.__navigationFrames={experiment:frames,baseline:a.behaviorTimeline(c,pair.baseline)};
  16 |     for(const id of ['foxes','rabbits'])for(let i=0;i<7;i++)for(let step=30;step<frames.length-4;step++){
  17 |       const p=frames[step][id][i],obstacle=p.navigation&&a.groundObstacles().find((o:any)=>o.id===p.navigation.id),old=frames[step-25][id][i];if(p.active&&p.moving>.01&&p.navigation&&!p.navigation.blocked&&Math.hypot(p.x-old.x,p.z-old.z)>.6&&Math.hypot(p.x-obstacle.x,p.z-obstacle.z)>obstacle.radius+a.groundRadius(id,i)&&[1,2].every(offset=>frames[step+offset][id][i].active&&frames[step+offset][id][i].navigation?.id===p.navigation.id))return {id,index:i,step,name:p.navigation.name,obstacle:p.navigation.id,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
  18 |     }return null;
  19 |   });
> 20 |   expect(target).toBeTruthy();const t=target!;await meadow.getByRole('button',{name:t.id==='foxes'?/Red foxes\s/:/Rabbits\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
     |                  ^ Error: expect(received).toBeTruthy()
  21 |   await timeline.fill(String(t.step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(t.index));await meadow.getByRole('button',{name:'View from above',exact:true}).click();await meadow.getByRole('button',{name:'Recent movement trail',exact:true}).click();
  22 |   let remembered:any;
  23 |   for(const step of [t.step,t.step+1,t.step+2]){
  24 |     await timeline.fill(String(step));await expect(canvas).toHaveAttribute('data-ground-navigation',t.obstacle);await expect(meadow.locator('[data-efw-navigation]')).toContainText(t.name);
  25 |     const record=await page.evaluate(({id,index,step})=>{const w=window as any;return {expected:w.__navigationFrames.experiment[step][id][index],actual:w.__groundScene.filter((p:any)=>p.species===id)[index]};},{id:t.id,index:t.index,step});
  26 |     expect(record.actual.visible).toBe(true);expect(record.actual.x).toBe(record.expected.x);expect(record.actual.z).toBe(record.expected.z);if(step===t.step+2)remembered=record.actual;
  27 |   }
  28 |   await stage.screenshot({path:'reports/ecosystem-ground-navigation/detour.jpg',type:'jpeg',quality:90});await expect(canvas).toHaveAttribute('data-movement-trail','true');
  29 |   await timeline.fill('0');await expect(meadow.locator('[data-efw-navigation]')).toHaveCount(0);await timeline.fill(String(t.step+2));expect(await page.evaluate(({id,index})=>(window as any).__groundScene.filter((p:any)=>p.species===id)[index],{id:t.id,index:t.index})).toEqual(remembered);
  30 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-ground-navigation','');await expect(meadow.locator('[data-efw-navigation]')).toHaveCount(0);await page.emulateMedia({reducedMotion:'no-preference'});await expect(canvas).toHaveAttribute('data-ground-navigation',t.obstacle);
  31 |   await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');const expected=await page.evaluate(({id,index,step})=>(window as any).__navigationFrames.baseline[step][id][index],{id:t.id,index:t.index,step:t.step+2});await expect(canvas).toHaveAttribute('data-representative-position',expected.x.toFixed(4)+','+expected.z.toFixed(4));
  32 |   await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-ground-navigation/mobile.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  33 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(t.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  34 | });
  35 | 
```