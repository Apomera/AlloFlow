# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-mammal-rest.spec.ts >> foxes and rabbits settle onto planted feet, reconstruct their poses and retain inspection controls
- Location: tests\e2e\ecosystem-mammal-rest.spec.ts:5:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

@@ -114,7 +114,7 @@
        "sole": 0.04077684564085044,
      },
    ],
    "headY": 0.58,
    "settle": 0,
-   "tail": 0.11205117261811808,
+   "tail": 0,
  }
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
  4  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  5  | test('foxes and rabbits settle onto planted feet, reconstruct their poses and retain inspection controls',async({page})=>{
  6  |   page.setDefaultTimeout(120000);await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  7  |   await page.evaluate(()=>{
  8  |     document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
  9  |     const w=window as any,T=w.THREE,original=T.Object3D.prototype.updateMatrixWorld;
  10 |     T.Object3D.prototype.updateMatrixWorld=function(force:any){const result=original.call(this,force);if(this.isScene)w.__restScene=this.children.filter((a:any)=>a.visible&&a.userData.posture).map((a:any)=>({
  11 |       bodyY:a.userData.body.position.y,headY:a.userData.head.position.y,settle:a.userData.posture.settle,tail:a.userData.tail?.rotation.y||0,
  12 |       feet:(a.userData.legs||a.userData.paws).map((joint:any)=>{const mesh=joint.userData.rig?joint.userData.rig.paw.children[0]:joint.userData.paw,m=mesh.matrixWorld.elements,p=new T.Vector3().setFromMatrixPosition(mesh.matrixWorld);return {position:p.toArray(),sole:Math.hypot(m[1],m[5],m[9]),matrix:Array.from(m),hind:joint.userData.hind,side:joint.userData.side};})
  13 |     }));return result;};
  14 |   });
  15 |   await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  16 |   const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage'),timeline=meadow.getByLabel('Meadow timeline',{exact:true});
  17 |   const targets=await page.evaluate(()=>{
  18 |     const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,frames=a.behaviorTimeline(c,a.compare(c).experiment),out:any={};w.__restFrames=frames;
  19 |     for(const id of ['foxes','rabbits']){let best={step:0,index:0,settle:0};frames.forEach((f:any,step:number)=>f[id].slice(0,7).forEach((p:any,index:number)=>{const settle=a.mammalPosture(id,p).settle;if(p.active&&settle>best.settle)best={step,index,settle};}));const walk=frames.findIndex((f:any)=>{const p=f[id][best.index];return p.active&&p.moving>.05&&!p.pounce&&p.footPlants.some((f:any)=>f.held);});out[id]={...best,walk};}
  20 |     return {animals:out,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
  21 |   });
  22 |   await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  23 |   for(const [id,name] of [['foxes',/Red foxes\s/],['rabbits',/Rabbits\s/]] as const){
  24 |     const target=targets.animals[id];expect(target.settle).toBeGreaterThan(.85);expect(target.walk).toBeGreaterThan(0);await meadow.getByRole('button',{name}).click();
  25 |     let standing:any,resting:any;
  26 |     for(const [label,step] of [['standing',0],['walking',target.walk],['resting',target.step]] as const){
  27 |       await timeline.fill(String(step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(target.index));await meadow.getByRole('button',{name:'Side view',exact:true}).click();await expect(canvas).toHaveAttribute('data-step',String(step));
  28 |       const actual=await page.evaluate(()=>(window as any).__restScene);expect(actual).toHaveLength(1);expect(actual[0].feet).toHaveLength(4);
  29 |       const expected=await page.evaluate(({id,step,index})=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,p=w.__restFrames[step][id][index];return {posture:a.mammalPosture(id,p),feet:[-1,1].flatMap(side=>[true,false].map(hind=>({site:p.footPlants[(side<0?0:2)+(hind?0:1)],lift:a.footPose(id,p,hind,side).lift*(id==='foxes'?1:.86)*(.94+(index%5)*.028)})))};},{id,step,index:target.index});
  30 |       expect(actual[0].bodyY).toBeCloseTo(expected.posture.drop,10);
  31 |       for(let i=0;i<4;i++){const foot=actual[0].feet[i],wanted=expected.feet[i];expect(foot.position[0]).toBeCloseTo(wanted.site.x,9);expect(foot.position[2]).toBeCloseTo(wanted.site.z,9);const ground=await page.evaluate(([x,z])=>(window as any).StemLab.ecosystemFoodWeb.groundHeight(x,z),[foot.position[0],foot.position[2]]);expect(Math.abs(foot.position[1]-foot.sole-ground-wanted.lift-.002)).toBeLessThan(.006);}
  32 |       if(label==='standing')standing=actual[0];if(label==='resting')resting=actual[0];await stage.screenshot({path:`reports/ecosystem-mammal-rest/${id}-${label}.jpg`,type:'jpeg',quality:90});
  33 |     }
  34 |     expect(standing.bodyY-resting.bodyY).toBeGreaterThan(id==='foxes'?.12:.04);expect(resting.headY).toBeLessThan(standing.headY);
  35 |     await timeline.fill('0');await timeline.fill(String(target.step));expect((await page.evaluate(()=>(window as any).__restScene))[0]).toEqual(resting);
  36 |     await meadow.getByRole('button',{name:'Face view',exact:true}).click();await stage.screenshot({path:`reports/ecosystem-mammal-rest/${id}-face.jpg`,type:'jpeg',quality:90});
> 37 |     await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');expect((await page.evaluate(()=>(window as any).__restScene))[0]).toEqual(standing);await page.emulateMedia({reducedMotion:'no-preference'});await expect(canvas).not.toHaveAttribute('data-behavior','Starting pose');
     |                                                                                                                                                                                               ^ Error: expect(received).toEqual(expected) // deep equality
  38 |   }
  39 |   await page.setViewportSize({width:390,height:844});await meadow.getByRole('button',{name:'Side view',exact:true}).click();await stage.screenshot({path:'reports/ecosystem-mammal-rest/mobile-rabbit.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  40 |   expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(targets.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  41 | });
  42 | 
```