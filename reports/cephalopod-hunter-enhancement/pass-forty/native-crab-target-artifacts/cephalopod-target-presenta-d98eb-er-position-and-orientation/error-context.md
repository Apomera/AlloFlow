# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-target-presentation.spec.ts >> first rendered moving fish and follow camera share the target marker position and orientation
- Location: tests\e2e\cephalopod-target-presentation.spec.ts:41:5

# Error details

```
Test timeout of 240000ms exceeded.
```

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Cannot read properties of undefined (reading 'quaternion')",
+ ]
```

```
Error: page.evaluate: Test timeout of 240000ms exceeded.
```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | import { clickCephalopodControl } from './helpers/cephalopod_controls';
  4  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:900,height:1000,layout:'document'});
  5  | const canvas='canvas[role=application]',failures=new WeakMap<Page,string[]>();
> 6  | async function step(page:Page,frames=1){return page.evaluate(async frames=>{const w=window as any;for(let i=0;i<frames;i++){w.__p40Step=.05;do{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}while(w.__p40Step!==0);}const row=w.__p40Frames[w.__p40Ticks];if(!row)throw new Error('First native render for this tick was not observed');return row;},frames);}
     |                                                     ^ Error: page.evaluate: Test timeout of 240000ms exceeded.
  7  | async function mount(page:Page,kind:'fish'|'crab',phone=false){
  8  |   await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:kind==='fish'?'humboldtSquid':'commonOcto',huntMode:'observe',huntSeed:2741,huntQuality:'low',_threeLoaded:true}});
  9  |   if(phone)await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';window.dispatchEvent(new Event('resize'));});
  10 |   await page.evaluate(async kind=>{
  11 |     const w=window as any,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),scene=record.scene,T=w.THREE;
  12 |     w.__p40Scene=scene;w.__p40Camera=record.camera;w.__p40Player=scene.getObjectByName('cl-player');w.__p40Halo=scene.getObjectByName('cl-target');
  13 |     const fish=scene.children.filter((o:any)=>o.userData.alive&&o.userData.offset),crabs=scene.children.filter((o:any)=>o.userData.alive&&o.userData.cfg);
  14 |     if(!fish.length||crabs.length<2)throw new Error('Actual seeded prey required');w.__p40Fish=fish[0];w.__p40Crabs=crabs;
  15 |     w.__p40Step=0;w.__p40Ticks=0;w.__p40Frames={};T.Clock.prototype.getDelta=function(){const dt=w.__p40Step;w.__p40Step=0;if(dt)w.__p40Ticks++;return dt;};
  16 |     // Observe the original school in a frozen frame, restoring the hook immediately.
  17 |     const each=Array.prototype.forEach;let school:any;
  18 |     (Array.prototype as any).forEach=function(callback:any,thisArg:any){if(this.length&&this[0]?.center?.isVector3&&Array.isArray(this[0]?.fish))each.call(this,(candidate:any)=>{if(candidate?.fish?.includes(fish[0]))school=candidate;});return each.call(this,callback,thisArg);};
  19 |     try{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}finally{Array.prototype.forEach=each;}
  20 |     if(!school)throw new Error('Actual fish-school state required');w.__p40School=school;
  21 |     fish.forEach((o:any)=>o.position.set(80,4,80));crabs.forEach((o:any)=>{o.position.set(80,.18,80);o.userData.speed=0;});
  22 |     scene.children.forEach((o:any)=>{if(o.userData.substrate==='rock'){o.position.set(-45,o.position.y,-45);o.userData.substrateRadius=0;}if('cooldownUntil'in o.userData)o.userData.cooldownUntil=1e9;});
  23 |     w.__p40Prey=kind==='fish'?fish[0]:crabs[0];
  24 |     if(kind==='fish'){school.center.copy(w.__p40Player.position).add(new T.Vector3(0,0,3.5));fish[0].position.copy(school.center);fish[0].userData.offset.set(0,0,0);}
  25 |     else crabs[0].position.set(w.__p40Player.position.x,.18,w.__p40Player.position.z+2.62);
  26 |     const copy=w.__p40Halo.position.copy;w.__p40Copied=null;w.__p40Halo.position.copy=function(position:any){w.__p40Copied=position;return copy.call(this,position);};
  27 |     w.__p40Geometry=w.__p40Halo.geometry;w.__p40Material=w.__p40Halo.material;w.__p40PositionArray=w.__p40Geometry.attributes.position.array.slice();w.__p40IndexArray=w.__p40Geometry.index?.array.slice();
  28 |     const previous=scene.onAfterRender;
  29 |     scene.onAfterRender=function(){if(previous)previous.apply(this,arguments);const tick=w.__p40Ticks;if(tick&&!(tick in w.__p40Frames)){
  30 |       const p=w.__p40Prey,halo=w.__p40Halo,player=w.__p40Player,camera=w.__p40Camera,readout=document.querySelector('.cl-target-readout') as HTMLElement;
  31 |       w.__p40Frames[tick]={tick,player:player.position.toArray(),prey:p.position.toArray(),preyUUID:p.uuid,alive:p.userData.alive,visible:halo.visible,halo:halo.position.toArray(),copyUUID:scene.children.find((o:any)=>o.position===w.__p40Copied)?.uuid||null,offsetError:halo.position.distanceTo(p.position.clone().add(new T.Vector3(0,.06,0))),facingDot:Math.abs(halo.quaternion.dot(camera.quaternion)),distance:p.position.distanceTo(player.position),horizontal:Math.hypot(p.position.x-player.position.x,p.position.z-player.position.z),deltaY:p.position.y-player.position.y,color:halo.material.color.getHex(),text:document.querySelector('[data-target=action]')!.textContent,detail:document.querySelector('[data-target=detail]')!.textContent,readoutHidden:readout.hidden,state:readout.dataset.state,score:document.querySelector('[data-hud=score]')!.textContent,geometryUUID:halo.geometry.uuid,materialUUID:halo.material.uuid,tailYaw:p.userData.tail?.rotation.y||0};
  32 |     }};
  33 |     scene.updateMatrixWorld(true);
  34 |   },kind);await page.locator(canvas).focus();await step(page,3);
  35 | }
  36 | function sameFrame(row:any){expect(row.visible).toBe(true);expect(row.copyUUID).toBe(row.preyUUID);expect(row.offsetError,'First render marker must follow final rendered prey position').toBeLessThan(1e-6);expect(row.facingDot,'Marker plane must face the final current camera').toBeGreaterThan(1-1e-8);}
  37 | async function resources(page:Page){return page.evaluate(()=>{const w=window as any,g=w.__p40Halo.geometry,m=w.__p40Halo.material;return{sameGeometry:g===w.__p40Geometry,sameMaterial:m===w.__p40Material,positions:Array.from(g.attributes.position.array).every((n:any,i:number)=>n===w.__p40PositionArray[i]),indices:!g.index&&!w.__p40IndexArray||!!g.index&&Array.from(g.index.array).every((n:any,i:number)=>n===w.__p40IndexArray[i])};});}
  38 | test.describe.configure({timeout:240000,retries:0,mode:'default'});test.use({trace:'off',video:'off'});
  39 | test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.beforeEach(({page})=>{const errors:string[]=[];failures.set(page,errors);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});test.afterEach(async({page})=>{await harness.destroy(page);expect(failures.get(page)).toEqual([]);});
  40 | 
  41 | test('first rendered moving fish and follow camera share the target marker position and orientation',async({page},testInfo)=>{
  42 |   await mount(page,'fish');const initial=await step(page,1);sameFrame(initial);await page.locator(canvas).focus();await page.keyboard.down('KeyW');const moving=await step(page,1);await page.keyboard.up('KeyW');
  43 |   sameFrame(moving);expect(moving.player).not.toEqual(initial.player);expect(moving.prey).not.toEqual(initial.prey);expect(moving.geometryUUID).toBe(initial.geometryUUID);expect(moving.materialUUID).toBe(initial.materialUUID);
  44 |   for(let i=0;i<4;i++)sameFrame(await step(page,1));expect(await resources(page)).toEqual({sameGeometry:true,sameMaterial:true,positions:true,indices:true});
  45 |   await testInfo.attach('first-render-live-fish-following',{body:JSON.stringify({initial,moving},null,2),contentType:'application/json'});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  46 | });
  47 | 
  48 | test('native approach and retreat flush actual reach transitions, while target cycling preserves strike commitment',async({page},testInfo)=>{
  49 |   await mount(page,'crab');const initial=await step(page,1);sameFrame(initial);expect(initial.horizontal).toBeGreaterThan(2.6);expect(initial.text).toMatch(/^OUT OF REACH/);expect(initial.text).toContain('under 2.6 m');
  50 |   await page.keyboard.down('KeyW');const entered=await step(page,1);await page.keyboard.up('KeyW');sameFrame(entered);expect(entered.horizontal).toBeLessThan(2.6);expect(Math.abs(entered.deltaY)).toBeLessThan(1.1);expect(entered.color).toBe(0x94f4bf);expect(entered.text,'Readiness transition must be visible in its first native render').toMatch(/^IN RANGE/);expect(entered.state).toBe('ready');
  51 |   await page.keyboard.down('KeyS');const left=await step(page,1);await page.keyboard.up('KeyS');sameFrame(left);expect(left.horizontal).toBeGreaterThanOrEqual(2.6);expect(left.color).toBe(0xffdf91);expect(left.text).toMatch(/^OUT OF REACH/);expect(left.text).toContain('under 2.6 m');
  52 |   await page.evaluate(()=>{const w=window as any,p=w.__p40Player.position;w.__p40Crabs[0].position.set(p.x,.18,p.z+3.4);w.__p40Crabs[1].position.set(p.x+.3,.18,p.z+4.4);});await step(page,3);await page.keyboard.press('KeyT');await step(page,1);await page.keyboard.press('KeyE');const committed=await step(page,1);sameFrame(committed);expect(committed.text).toMatch(/^STRIKING/);
  53 |   await page.keyboard.press('KeyT');const windup=await step(page,2);sameFrame(windup);expect(windup.copyUUID).toBe(committed.preyUUID);expect(windup.text).toMatch(/^STRIKING/);expect(windup.alive).toBe(true);expect(windup.score).toBe('0');
  54 |   await step(page,3);expect(await resources(page)).toEqual({sameGeometry:true,sameMaterial:true,positions:true,indices:true});await testInfo.attach('first-render-range-transitions-and-commitment',{body:JSON.stringify({initial,entered,left,committed,windup},null,2),contentType:'application/json'});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  55 | });
  56 | 
  57 | test.describe('phone reduced motion and frozen dive presentation',()=>{test.use({hasTouch:true,viewport:{width:390,height:844}});
  58 |   test('live reduced-motion prey retains marker clarity; Pause and Inspect freeze/hide it without resource changes',async({page},testInfo)=>{
  59 |     await mount(page,'fish',true);await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive',exact:true}).click();const reduced=await step(page,2),moving=await step(page,1);sameFrame(reduced);sameFrame(moving);expect(moving.prey).not.toEqual(reduced.prey);expect(moving.tailYaw).toBe(0);
  60 |     await page.getByRole('button',{name:'Pause',exact:true}).tap();const paused=await step(page,1),frozen=await step(page,4);expect(frozen.player).toEqual(paused.player);expect(frozen.prey).toEqual(paused.prey);expect(frozen.halo).toEqual(paused.halo);expect(frozen.text).toBe(paused.text);expect(frozen.color).toBe(paused.color);
  61 |     await page.getByRole('button',{name:'Pause',exact:true}).tap();await step(page,2);await clickCephalopodControl(page,'Inspect');const inspection=await step(page,1),inspectionAfter=await step(page,3);expect(inspection.visible).toBe(false);expect(inspectionAfter.visible).toBe(false);expect(inspectionAfter.prey).toEqual(inspection.prey);expect(inspectionAfter.player).toEqual(inspection.player);expect(inspectionAfter.readoutHidden).toBe(true);
  62 |     await page.getByRole('button',{name:'Return to dive',exact:true}).click();const resumed=await step(page,2);sameFrame(resumed);expect(await resources(page)).toEqual({sameGeometry:true,sameMaterial:true,positions:true,indices:true});await testInfo.attach('reduced-motion-pause-inspection',{body:JSON.stringify({reduced,moving,paused,frozen,inspection,inspectionAfter,resumed},null,2),contentType:'application/json'});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  63 |   });
  64 | });
  65 | 
```