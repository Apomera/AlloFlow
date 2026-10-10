# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-octopus-propulsion.spec.ts >> Phone blue-ringed octopus >> eases real boost input with complete arms, stable surfaces, pause and reduced-motion support
- Location: tests\e2e\cephalopod-octopus-propulsion.spec.ts:21:6

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1  | import {test,expect,Page} from '@playwright/test';
  2  | import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
  3  | import {clickCephalopodControl} from './helpers/cephalopod_controls';
  4  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1000,height:1000,layout:'document'}),errors=new WeakMap<Page,string[]>();
  5  | async function step(page:Page,count=1){await page.evaluate(async count=>{const w=window as any;for(let i=0;i<count;i++){w.__motionStep=.05;let frames=0;do{await new Promise<void>(r=>requestAnimationFrame(()=>r()));if(++frames>120)throw Error('Propulsion clock was not consumed');}while(w.__motionStep!==0);}},count);}
  6  | async function mount(page:Page,phone:boolean){
  7  |  await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!(window as any).THREE?.Clock&&typeof(window as any).__mount==='function');
  8  |  await page.evaluate(phone=>{const w=window as any;w.__motionStep=0;w.__motionFirst=false;w.THREE.Clock.prototype.getDelta=function(){if(!w.__motionFirst){w.__motionFirst=true;document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true,cancelable:true}));}const dt=w.__motionStep;w.__motionStep=0;return dt;};if(phone)document.getElementById('wrap')!.style.width='100%';w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:phone?'blueRinged':'giantPacific',huntMode:'observe',huntSeed:2741,huntQuality:phone?'low':'balanced',_threeLoaded:true}});},phone);
  9  |  await page.waitForFunction(()=>(window as any).__glRecorder.records.some((r:any)=>r.scene?.getObjectByName('cl-player')&&r.canvas.isConnected&&r.draws>0));
  10 |  await page.evaluate(()=>{const w=window as any,T=w.THREE,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),player=record.scene.getObjectByName('cl-player'),arms=Array.from({length:8},(_,i)=>player.getObjectByName('cl-arm-'+i)),scale=player.userData.species==='giantPacific'?1.4:.72,meshes=[...arms,player.getObjectByName('cl-suckers'),player.getObjectByName('cl-webbing')],owned=new Set<any>(),refs=meshes.map((m:any)=>({m,g:m.geometry,mat:m.material,index:m.geometry.index,attrs:Object.entries(m.geometry.attributes).map(([n,a]:[string,any])=>({n,a,array:a.array})),instance:m.instanceMatrix,array:m.instanceMatrix?.array}));w.__motionDisposed=[];
  11 |   for(const m of meshes)for(const resource of [m.geometry,m.material])if(!owned.has(resource)){owned.add(resource);const row={uuid:resource.uuid,count:0};w.__motionDisposed.push(row);resource.addEventListener('dispose',()=>row.count++);}
  12 |   w.__motionRead=()=>{const centers=arms.map((a:any)=>Array.from({length:21},(_,ring)=>{const c=new T.Vector3();for(let k=0;k<8;k++)c.add(new T.Vector3().fromBufferAttribute(a.geometry.attributes.position,ring*9+k));return c.multiplyScalar(1/(8*scale)).toArray();}));let gap=Infinity,frameDot=1;for(let a=0;a<8;a++)for(let j=1;j<=20;j++){gap=Math.min(gap,new T.Vector3(...centers[a][j]).distanceTo(new T.Vector3(...centers[a][j-1])));const n=arms[a].geometry.attributes.normal;frameDot=Math.min(frameDot,new T.Vector3().fromBufferAttribute(n,j*9).dot(new T.Vector3().fromBufferAttribute(n,(j-1)*9)));}return{centers,mantle:player.getObjectByName('cl-mantle').scale.toArray(),player:player.position.toArray(),gap,frameDot,retained:refs.every((x:any)=>x.m.geometry===x.g&&x.m.material===x.mat&&x.g.index===x.index&&x.attrs.every((r:any)=>x.g.attributes[r.n]===r.a&&r.a.array===r.array)&&x.m.instanceMatrix===x.instance&&x.m.instanceMatrix?.array===x.array),finite:refs.every((x:any)=>Array.from(x.g.attributes.position.array).every(Number.isFinite)),program:w.__motionProgram,contextLost:record.ctx.isContextLost()};};
  13 |   arms[2].onAfterRender=function(renderer:any){if(w.__motionProgram)return;const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM);w.__motionProgram={linked:gl.getProgramParameter(program,gl.LINK_STATUS),compiled:gl.getAttachedShaders(program).every((s:any)=>gl.getShaderParameter(s,gl.COMPILE_STATUS)),attributes:['position','normal'].map(n=>{const at=gl.getAttribLocation(program,n);return{name:n,bound:at>=0&&!!gl.getVertexAttrib(at,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)};})};};
  14 |  });await page.locator('canvas[role=application]').focus();await page.keyboard.press('Escape');await step(page,2);await page.waitForFunction(()=>(window as any).__motionProgram);
  15 | }
  16 | const read=(page:Page)=>page.evaluate(()=>(window as any).__motionRead());
  17 | const drift=(a:any,b:any)=>Math.max(...a.centers.flatMap((arm:number[][],i:number)=>arm.map((p:number[],j:number)=>Math.hypot(...p.map((v,k)=>v-b.centers[i][j][k])))));
  18 | test.describe.configure({timeout:180000,retries:0});test.use({video:'off',trace:'off'});test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.beforeEach(({page})=>{const e:string[]=[];errors.set(page,e);page.on('pageerror',x=>e.push(x.message));page.on('console',m=>{if(m.type()==='error')e.push(m.text());});});test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});
  19 | for(const phone of [false,true])test.describe(phone?'Phone blue-ringed octopus':'Desktop giant Pacific octopus',()=>{
  20 |  if(phone)test.use({hasTouch:true,viewport:{width:390,height:844}});
  21 |  test('eases real boost input with complete arms, stable surfaces, pause and reduced-motion support',async({page},testInfo)=>{
  22 |   await mount(page,phone);await page.keyboard.down('KeyQ');await step(page,12);await page.keyboard.up('KeyQ');await step(page,2);const ready=await read(page);
  23 |   await page.keyboard.down('KeyW');await page.keyboard.down('Space');await step(page,1);const launch=await read(page);await step(page,11);const boost=await read(page);expect(drift(ready,boost)).toBeGreaterThan(1.5);expect(drift(ready,launch)).toBeLessThan(drift(ready,boost)*.35);expect(boost.player[2]).toBeGreaterThan(ready.player[2]+1);
  24 |   for(const arm of boost.centers)expect(arm[20][2]).toBeLessThan(arm[0][2]);
  25 |   await page.keyboard.up('Space');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const toggled=await read(page);expect(toggled.centers).toEqual(boost.centers);expect(toggled.mantle).toEqual(boost.mantle);await step(page,1);const release=await read(page);expect(drift(release,boost)).toBeLessThan(.7);
  26 |   await page.keyboard.up('KeyW');await page.keyboard.press('Escape');const frozen=await read(page);await step(page,5);expect(await read(page)).toEqual(frozen);await page.keyboard.press('Escape');await step(page,18);const settled=await read(page);expect(drift(settled,boost)).toBeGreaterThan(1.5);
  27 |   await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive',exact:true}).click();await step(page,2);const reduced=await read(page);await page.locator('canvas[role=application]').focus();await page.keyboard.down('KeyW');await page.keyboard.down('Space');await step(page,4);const reducedBoost=await read(page);await page.keyboard.up('Space');await page.keyboard.up('KeyW');expect(reducedBoost.centers).toEqual(reduced.centers);expect(reducedBoost.mantle).toEqual(reduced.mantle);expect(reducedBoost.player).not.toEqual(reduced.player);
  28 |   for(const row of [ready,launch,boost,release,frozen,settled,reduced,reducedBoost]){expect(row.retained&&row.finite&&row.program.linked&&row.program.compiled&&row.program.attributes.every((a:any)=>a.bound)).toBe(true);expect(row.contextLost).toBe(false);expect(row.gap).toBeGreaterThan(.045);expect(row.frameDot).toBeGreaterThan(.6);}
> 29 |   const pixels=await harness.glPixels(page);expect(pixels&&!looksBlank(pixels)).toBeTruthy();await testInfo.attach('native-propulsion',{body:pixels!.png,contentType:'image/png'});await testInfo.attach('native-propulsion-states',{body:JSON.stringify({ready,launch,boost,release,frozen,settled,reduced,reducedBoost}),contentType:'application/json'});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await page.evaluate(()=>(window as any).__motionDisposed.every((r:any)=>r.count===1))).toBe(true);
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  30 |  });
  31 | });
  32 | 
```