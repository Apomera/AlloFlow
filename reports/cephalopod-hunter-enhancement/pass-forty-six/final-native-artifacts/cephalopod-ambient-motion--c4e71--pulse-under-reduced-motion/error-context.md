# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-ambient-motion.spec.ts >> Phone low quality >> keeps seeded motion stable across render-only frames and freezes the pulse under reduced motion
- Location: tests\e2e\cephalopod-ambient-motion.spec.ts:20:6

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 9
+ Received  + 9

@@ -1,10 +1,10 @@
  Array [
    Array [
      Array [
        -3.0811657854283077,
-       0.1513877611110144,
+       0.15159339104441727,
        6.256533820576635,
      ],
      Array [
        0,
        0.03224709347060864,
@@ -14,11 +14,11 @@
      true,
    ],
    Array [
      Array [
        -5.319689298778394,
-       0.12657770472139782,
+       0.12641539402965726,
        5.351814730138656,
      ],
      Array [
        0,
        0.9473824297277641,
@@ -28,11 +28,11 @@
      true,
    ],
    Array [
      Array [
        -7.848764465823599,
-       0.19223727354997558,
+       0.19288554028025504,
        10.635315661011916,
      ],
      Array [
        0,
        0.23709500037633302,
@@ -42,11 +42,11 @@
      true,
    ],
    Array [
      Array [
        -9.344707432833971,
-       0.17595227278620956,
+       0.17533174670674395,
        9.52378822195664,
      ],
      Array [
        0,
        0.9997452170029338,
@@ -56,11 +56,11 @@
      true,
    ],
    Array [
      Array [
        -9.316217284891138,
-       0.22955972537549943,
+       0.22954412383177109,
        13.077305615671406,
      ],
      Array [
        0,
        0.7408911902877521,
@@ -84,11 +84,11 @@
      true,
    ],
    Array [
      Array [
        -35.47083720500595,
-       0.1891439981977249,
+       0.18977494127377878,
        21.31507773902055,
      ],
      Array [
        0,
        0.7161528488300624,
@@ -98,11 +98,11 @@
      true,
    ],
    Array [
      Array [
        24.068892580124125,
-       0.11085025809760872,
+       0.10948687381428969,
        34.69083360913397,
      ],
      Array [
        0,
        0.80748016495598,
@@ -112,11 +112,11 @@
      true,
    ],
    Array [
      Array [
        -16.909853508285384,
-       0.17451679577933632,
+       0.17473418209729863,
        -45.52822610674994,
      ],
      Array [
        0,
        0.9406175643723601,
@@ -126,11 +126,11 @@
      true,
    ],
    Array [
      Array [
        34.55456908210295,
-       -23.77147947302601,
+       -23.934305406297465,
        64.74046784790242,
      ],
      Array [
        0,
        0.503264310260522,
```

# Test source

```ts
  1  | import {test,expect,Page} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | import {clickCephalopodControl} from './helpers/cephalopod_controls';
  4  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:900,height:1000,layout:'document'}),errors=new WeakMap<Page,string[]>();
  5  | async function ticks(page:Page,count:number,gap=0){await page.evaluate(async({count,gap})=>{const w=window as any;for(let i=0;i<count;i++){w.__motionStep=.05;do{await new Promise<void>(r=>requestAnimationFrame(()=>r()));}while(w.__motionStep);for(let n=0;n<gap;n++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));}},{count,gap});}
  6  | async function mount(page:Page,phone:boolean){
  7  |  await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!(window as any).THREE?.Clock&&typeof (window as any).__mount==='function');
  8  |  await page.evaluate(phone=>{const w=window as any;let seed=8191;w.Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};w.__motionStep=0;w.THREE.Clock.prototype.getDelta=function(){const dt=w.__motionStep;w.__motionStep=0;return dt;};if(phone)document.getElementById('wrap')!.style.width='100%';w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'humboldtSquid',huntMode:'observe',huntSeed:2741,huntQuality:phone?'low':'balanced',_threeLoaded:true}});},phone);
  9  |  await page.waitForFunction(()=>(window as any).__glRecorder.records.some((r:any)=>r.scene?.getObjectByName('cl-player')&&r.canvas.isConnected&&r.draws>0));
  10 |  await page.evaluate(()=>{const w=window as any,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),scene=record.scene,jellies=scene.children.filter((o:any)=>o.userData.bellGeo),resources:any[]=[],owned:any[]=[];w.__motionScene=scene;
  11 |  for(const j of jellies)for(const mesh of j.children){owned.push({mesh,g:mesh.geometry,m:mesh.material,attrs:Object.entries(mesh.geometry.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array}))});for(const resource of [mesh.geometry,...(Array.isArray(mesh.material)?mesh.material:[mesh.material])]){const row={resource,disposed:0};resource.addEventListener('dispose',()=>row.disposed++);resources.push(row);}}
  12 |  w.__motionResources=resources;w.__motionRead=()=>({jellies:jellies.map((j:any)=>({position:j.position.toArray(),rotation:j.quaternion.toArray(),phases:[j.userData.pulsePhase,j.userData.verticalPhase],children:j.children.map((o:any)=>({position:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray(),attrs:Object.fromEntries(Object.entries(o.geometry.attributes).map(([n,a]:[string,any])=>[n,{version:a.version,values:Array.from(a.array)}]))}))})),prey:scene.children.filter((o:any)=>o.userData.alive!==undefined).map((o:any)=>[o.position.toArray(),o.quaternion.toArray(),o.userData.alive]),patrol:scene.children.filter((o:any)=>o.userData.patrolAngle!==undefined).map((o:any)=>[o.position.toArray(),o.userData.patrolAngle,o.userData.state]),retained:owned.every(o=>o.mesh.geometry===o.g&&o.mesh.material===o.m&&o.attrs.every((a:any)=>o.g.attributes[a.name]===a.a&&a.a.array===a.array)),disposed:resources.map(r=>r.disposed),contextLost:record.ctx.isContextLost(),pageCreated:record.createdBy==='page'});
  13 |  });
  14 | }
  15 | async function read(page:Page){return page.evaluate(()=>(window as any).__motionRead());}
  16 | async function cleanup(page:Page){await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await page.evaluate(()=>(window as any).__motionResources.map((r:any)=>r.disposed))).toEqual(Array(85).fill(1));}
  17 | test.describe.configure({timeout:240000,retries:0});test.use({video:'off',trace:'off'});test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.beforeEach(({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error')list.push(m.text());});});test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});
  18 | for(const phone of [false,true])test.describe(phone?'Phone low quality':'Desktop balanced quality',()=>{
  19 |  if(phone)test.use({hasTouch:true,viewport:{width:390,height:844}});
  20 |  test('keeps seeded motion stable across render-only frames and freezes the pulse under reduced motion',async({page},testInfo)=>{
  21 |   await mount(page,phone);await ticks(page,40);const regular=await read(page);expect(regular.pageCreated&&regular.retained&&!regular.contextLost).toBe(true);expect(regular.jellies).toHaveLength(5);expect(regular.patrol.length).toBeGreaterThan(0);expect(regular.prey.length).toBeGreaterThan(0);await cleanup(page);
> 22 |   await mount(page,phone);await ticks(page,40,3);const extraFrames=await read(page);for(const key of ['jellies','prey','patrol'])expect(extraFrames[key]).toEqual(regular[key]);
     |                                                                                                                                                           ^ Error: expect(received).toEqual(expected) // deep equality
  23 |   await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive',exact:true}).click();const reduced=await read(page);await ticks(page,12,2);const gliding=await read(page);
  24 |   for(let i=0;i<5;i++){const a=reduced.jellies[i],b=gliding.jellies[i];for(const key of ['rotation','phases','children'])expect(b[key]).toEqual(a[key]);expect(b.position[1]).toBe(a.position[1]);expect(Math.hypot(b.position[0]-a.position[0],b.position[2]-a.position[2])).toBeGreaterThan(.2);}
  25 |   await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).uncheck();await page.getByRole('button',{name:'Resume dive',exact:true}).click();await ticks(page,1);const resumed=await read(page);for(let i=0;i<5;i++){expect(resumed.jellies[i].phases).not.toEqual(gliding.jellies[i].phases);expect(Math.abs(resumed.jellies[i].position[1]-gliding.jellies[i].position[1])).toBeLessThan(.05);}
  26 |   await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await read(page);await ticks(page,8);expect(await read(page)).toEqual(paused);await clickCephalopodControl(page,'Inspect');await ticks(page,3);expect(await read(page)).toEqual(paused);expect(resumed.retained&&!resumed.contextLost&&resumed.disposed.every((n:number)=>n===0)).toBe(true);
  27 |   await testInfo.attach('ambient-motion-replay',{body:JSON.stringify({phone,positiveSteps:40,extraZeroFramesPerStep:3,matched:['jellies','prey','patrol'],reducedMotionFreeze:true,resources:85},null,2),contentType:'application/json'});await cleanup(page);
  28 |  });
  29 | });
  30 | 
```