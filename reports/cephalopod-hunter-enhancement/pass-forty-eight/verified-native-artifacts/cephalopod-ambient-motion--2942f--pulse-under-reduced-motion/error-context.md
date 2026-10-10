# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-ambient-motion.spec.ts >> Desktop balanced quality >> keeps seeded motion stable across render-only frames and freezes the pulse under reduced motion
- Location: tests\e2e\cephalopod-ambient-motion.spec.ts:20:6

# Error details

```
TimeoutError: locator.focus: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('canvas[role=application]')

```

# Test source

```ts
  1  | import {test,expect,Page} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | import {clickCephalopodControl} from './helpers/cephalopod_controls';
  4  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:900,height:1000,layout:'document'}),errors=new WeakMap<Page,string[]>();
  5  | async function ticks(page:Page,count:number,gap=0){await page.evaluate(async({count,gap})=>{const w=window as any;for(let i=0;i<count;i++){w.__motionStep=.05;for(let attempt=0;attempt<60&&w.__motionStep;attempt++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));if(w.__motionStep)throw Error('Simulation did not consume tick '+i+'; connected canvas: '+!!document.querySelector('canvas[role=application]'));for(let n=0;n<gap;n++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));}},{count,gap});}
  6  | async function mount(page:Page,phone:boolean){
  7  |  await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!(window as any).THREE?.Clock&&typeof (window as any).__mount==='function');
  8  |  await page.evaluate(phone=>{const w=window as any;let seed=8191;w.Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};w.__motionStep=0;w.__motionFirst=false;w.THREE.Clock.prototype.getDelta=function(){if(!w.__motionFirst){w.__motionFirst=true;document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true,cancelable:true}));}const dt=w.__motionStep;w.__motionStep=0;return dt;};if(phone)document.getElementById('wrap')!.style.width='100%';w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'humboldtSquid',huntMode:'observe',huntSeed:2741,huntQuality:phone?'low':'balanced',_threeLoaded:true}});},phone);
  9  |  await page.waitForFunction(()=>(window as any).__glRecorder.records.some((r:any)=>r.scene?.getObjectByName('cl-player')&&r.canvas.isConnected&&r.draws>0));
  10 |  await page.evaluate(()=>{const w=window as any,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),scene=record.scene,jellies=scene.children.filter((o:any)=>o.userData.bellGeo),resources:any[]=[],owned:any[]=[];w.__motionScene=scene;
  11 |  for(const j of jellies)for(const mesh of j.children){owned.push({mesh,g:mesh.geometry,m:mesh.material,attrs:Object.entries(mesh.geometry.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array}))});for(const resource of [mesh.geometry,...(Array.isArray(mesh.material)?mesh.material:[mesh.material])]){const row={resource,disposed:0};resource.addEventListener('dispose',()=>row.disposed++);resources.push(row);}}
  12 |  w.__motionResources=resources;w.__motionRead=()=>({jellies:jellies.map((j:any)=>({position:j.position.toArray(),rotation:j.quaternion.toArray(),phases:[j.userData.pulsePhase,j.userData.verticalPhase],children:j.children.map((o:any)=>({position:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray(),attrs:Object.fromEntries(Object.entries(o.geometry.attributes).map(([n,a]:[string,any])=>[n,{version:a.version,values:Array.from(a.array)}]))}))})),prey:scene.children.filter((o:any)=>o.userData.alive!==undefined).map((o:any)=>[o.position.toArray(),o.quaternion.toArray(),o.userData.alive]),patrol:scene.children.filter((o:any)=>o.userData.patrolAngle!==undefined).map((o:any)=>[o.position.toArray(),o.userData.patrolAngle,o.userData.state]),retained:owned.every(o=>o.mesh.geometry===o.g&&o.mesh.material===o.m&&o.attrs.every((a:any)=>o.g.attributes[a.name]===a.a&&a.a.array===a.array)),disposed:resources.map(r=>r.disposed),contextLost:record.ctx.isContextLost(),pageCreated:record.createdBy==='page'});
> 13 |  });await page.locator('canvas[role=application]').focus();await page.keyboard.press('Escape');
     |                                                    ^ TimeoutError: locator.focus: Timeout 30000ms exceeded.
  14 | }
  15 | async function read(page:Page){return page.evaluate(()=>(window as any).__motionRead());}
  16 | async function cleanup(page:Page){await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await page.evaluate(()=>(window as any).__motionResources.map((r:any)=>r.disposed))).toEqual(Array(85).fill(1));}
  17 | test.describe.configure({timeout:240000,retries:0});test.use({video:'off',trace:'off'});test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.beforeEach(({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error')list.push(m.text());});});test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});
  18 | for(const phone of [false,true])test.describe(phone?'Phone low quality':'Desktop balanced quality',()=>{
  19 |  if(phone)test.use({hasTouch:true,viewport:{width:390,height:844}});
  20 |  test('keeps seeded motion stable across render-only frames and freezes the pulse under reduced motion',async({page},testInfo)=>{
  21 |   await mount(page,phone);const spawn=await read(page);await ticks(page,12);const regular=await read(page);expect(regular.pageCreated&&regular.retained&&!regular.contextLost).toBe(true);expect(regular.jellies).toHaveLength(5);expect(regular.patrol.length).toBeGreaterThan(0);expect(regular.prey.length).toBeGreaterThan(0);
  22 |   for(let j=0;j<5;j++)for(let arm=2;arm<6;arm++){const a=regular.jellies[j].children[arm].attrs,b=spawn.jellies[j].children[arm].attrs;expect(a.position.values).not.toEqual(b.position.values);expect(a.normal.values).not.toEqual(b.normal.values);expect(a.position.version).toBeGreaterThan(b.position.version);expect(a.normal.version).toBeGreaterThan(b.normal.version);expect(a.color).toEqual(b.color);expect(a.position.values.slice(0,3)).toEqual([0,0,0]);}await cleanup(page);
  23 |   await mount(page,phone);await ticks(page,12,2);const extraFrames=await read(page);for(const key of ['jellies','prey','patrol'])expect(extraFrames[key]).toEqual(regular[key]);
  24 |   await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive',exact:true}).click();const reduced=await read(page);await ticks(page,12,2);const gliding=await read(page);
  25 |   for(let i=0;i<5;i++){const a=reduced.jellies[i],b=gliding.jellies[i];for(const key of ['rotation','phases','children'])expect(b[key]).toEqual(a[key]);expect(b.position[1]).toBe(a.position[1]);expect(Math.hypot(b.position[0]-a.position[0],b.position[2]-a.position[2])).toBeGreaterThan(.2);}
  26 |   await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).uncheck();await page.getByRole('button',{name:'Resume dive',exact:true}).click();await ticks(page,1);const resumed=await read(page);for(let i=0;i<5;i++){expect(resumed.jellies[i].phases).not.toEqual(gliding.jellies[i].phases);expect(Math.abs(resumed.jellies[i].position[1]-gliding.jellies[i].position[1])).toBeLessThan(.05);for(let arm=2;arm<6;arm++){const a=resumed.jellies[i].children[arm].attrs.position,b=gliding.jellies[i].children[arm].attrs.position;expect(a.version).toBeGreaterThan(b.version);expect(Math.max(...a.values.map((v:number,n:number)=>Math.abs(v-b.values[n])))).toBeLessThan(.006);}}
  27 |   await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await read(page);await ticks(page,8);expect(await read(page)).toEqual(paused);await clickCephalopodControl(page,'Inspect');await ticks(page,3);expect(await read(page)).toEqual(paused);expect(resumed.retained&&!resumed.contextLost&&resumed.disposed.every((n:number)=>n===0)).toBe(true);
  28 |   await testInfo.attach('ambient-motion-replay',{body:JSON.stringify({phone,positiveSteps:12,extraZeroFramesPerStep:2,matched:['jellies','prey','patrol'],reducedMotionFreeze:true,flowingOralArms:20,oralResumeContinuous:true,resources:85},null,2),contentType:'application/json'});await cleanup(page);
  29 |  });
  30 | });
  31 | 
```