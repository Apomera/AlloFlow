import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { clickCephalopodControl } from './helpers/cephalopod_controls';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:900,height:1000,layout:'document'});
const canvas='canvas[role=application]',failures=new WeakMap<Page,string[]>();
async function step(page:Page,frames=1){return page.evaluate(async frames=>{const w=window as any;for(let i=0;i<frames;i++){w.__p40Step=.05;do{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}while(w.__p40Step!==0);}const row=w.__p40Frames[w.__p40Ticks];if(!row)throw new Error('First native render for this tick was not observed');return row;},frames);}
async function mount(page:Page,kind:'fish'|'crab',phone=false){
  await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:kind==='fish'?'humboldtSquid':'commonOcto',huntMode:'observe',huntSeed:2741,huntQuality:'low',_threeLoaded:true}});
  if(phone)await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';window.dispatchEvent(new Event('resize'));});
  await page.evaluate(async kind=>{
    const w=window as any,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),scene=record.scene,T=w.THREE;
    w.__p40Scene=scene;w.__p40Camera=null;w.__p40Player=scene.getObjectByName('cl-player');w.__p40Halo=scene.getObjectByName('cl-target');
    const fish=scene.children.filter((o:any)=>o.userData.alive&&o.userData.offset),crabs=scene.children.filter((o:any)=>o.userData.alive&&o.userData.cfg);
    if(!fish.length||crabs.length<2)throw new Error('Actual seeded prey required');w.__p40Fish=fish[0];w.__p40Crabs=crabs;
    w.__p40Step=0;w.__p40Ticks=0;w.__p40Frames={};T.Clock.prototype.getDelta=function(){const dt=w.__p40Step;w.__p40Step=0;if(dt)w.__p40Ticks++;return dt;};
    // Observe the original school in a frozen frame, restoring the hook immediately.
    const each=Array.prototype.forEach;let school:any;
    (Array.prototype as any).forEach=function(callback:any,thisArg:any){if(this.length&&this[0]?.center?.isVector3&&Array.isArray(this[0]?.fish))each.call(this,(candidate:any)=>{if(candidate?.fish?.includes(fish[0]))school=candidate;});return each.call(this,callback,thisArg);};
    try{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}finally{Array.prototype.forEach=each;}
    if(!school)throw new Error('Actual fish-school state required');w.__p40School=school;
    fish.forEach((o:any)=>o.position.set(80,4,80));crabs.forEach((o:any)=>{o.position.set(80,.18,80);o.userData.speed=0;});
    scene.children.forEach((o:any)=>{if(o.userData.substrate==='rock'){o.position.set(-45,o.position.y,-45);o.userData.substrateRadius=0;}if('cooldownUntil'in o.userData)o.userData.cooldownUntil=1e9;});
    w.__p40Prey=kind==='fish'?fish[0]:crabs[0];
    if(kind==='fish'){school.center.copy(w.__p40Player.position).add(new T.Vector3(0,0,3.5));fish[0].position.copy(school.center);fish[0].userData.offset.set(0,0,0);}
    else crabs[0].position.set(w.__p40Player.position.x,.18,w.__p40Player.position.z+2.62);
    const copy=w.__p40Halo.position.copy;w.__p40Copied=null;w.__p40Halo.position.copy=function(position:any){w.__p40Copied=position;return copy.call(this,position);};
    w.__p40Geometry=w.__p40Halo.geometry;w.__p40Material=w.__p40Halo.material;w.__p40PositionArray=w.__p40Geometry.attributes.position.array.slice();w.__p40IndexArray=w.__p40Geometry.index?.array.slice();
    const previous=scene.onAfterRender;
    scene.onAfterRender=function(renderer:any,renderedScene:any,renderedCamera:any){w.__p40Camera=renderedCamera;if(previous)previous.apply(this,arguments);const tick=w.__p40Ticks;if(tick&&!(tick in w.__p40Frames)){
      const p=w.__p40Prey,halo=w.__p40Halo,player=w.__p40Player,camera=w.__p40Camera,readout=document.querySelector('.cl-target-readout') as HTMLElement;
      w.__p40Frames[tick]={tick,player:player.position.toArray(),prey:p.position.toArray(),preyUUID:p.uuid,alive:p.userData.alive,visible:halo.visible,halo:halo.position.toArray(),copyUUID:scene.children.find((o:any)=>o.position===w.__p40Copied)?.uuid||null,offsetError:halo.position.distanceTo(p.position.clone().add(new T.Vector3(0,.06,0))),facingDot:Math.abs(halo.quaternion.dot(camera.quaternion)),distance:p.position.distanceTo(player.position),horizontal:Math.hypot(p.position.x-player.position.x,p.position.z-player.position.z),deltaY:p.position.y-player.position.y,color:halo.material.color.getHex(),text:document.querySelector('[data-target=action]')!.textContent,detail:document.querySelector('[data-target=detail]')!.textContent,readoutHidden:readout.hidden||readout.getClientRects().length===0||getComputedStyle(readout).visibility==='hidden',state:readout.dataset.state,score:document.querySelector('[data-hud=score]')!.textContent,geometryUUID:halo.geometry.uuid,materialUUID:halo.material.uuid,tailYaw:p.userData.tail?.rotation.y||0};
    }};
    scene.updateMatrixWorld(true);
  },kind);await page.locator(canvas).focus();await step(page,3);
}
function sameFrame(row:any){expect(row.visible).toBe(true);expect(row.copyUUID).toBe(row.preyUUID);expect(row.offsetError,'First render marker must follow final rendered prey position').toBeLessThan(1e-6);expect(row.facingDot,'Marker plane must face the final current camera').toBeGreaterThan(1-1e-8);}
async function resources(page:Page){return page.evaluate(()=>{const w=window as any,g=w.__p40Halo.geometry,m=w.__p40Halo.material;return{sameGeometry:g===w.__p40Geometry,sameMaterial:m===w.__p40Material,positions:Array.from(g.attributes.position.array).every((n:any,i:number)=>n===w.__p40PositionArray[i]),indices:!g.index&&!w.__p40IndexArray||!!g.index&&Array.from(g.index.array).every((n:any,i:number)=>n===w.__p40IndexArray[i])};});}
test.describe.configure({timeout:240000,retries:0,mode:'default'});test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.beforeEach(({page})=>{const errors:string[]=[];failures.set(page,errors);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});test.afterEach(async({page})=>{await harness.destroy(page);expect(failures.get(page)).toEqual([]);});

test('first rendered moving fish and follow camera share the target marker position and orientation',async({page},testInfo)=>{
  await mount(page,'fish');const initial=await step(page,1);sameFrame(initial);await page.locator(canvas).focus();await page.keyboard.down('KeyW');const moving=await step(page,1);await page.keyboard.up('KeyW');
  sameFrame(moving);expect(moving.player).not.toEqual(initial.player);expect(moving.prey).not.toEqual(initial.prey);expect(moving.geometryUUID).toBe(initial.geometryUUID);expect(moving.materialUUID).toBe(initial.materialUUID);
  for(let i=0;i<4;i++)sameFrame(await step(page,1));expect(await resources(page)).toEqual({sameGeometry:true,sameMaterial:true,positions:true,indices:true});
  await testInfo.attach('first-render-live-fish-following',{body:JSON.stringify({initial,moving},null,2),contentType:'application/json'});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('native approach and retreat flush actual reach transitions, while target cycling preserves strike commitment',async({page},testInfo)=>{
  await mount(page,'crab');const initial=await step(page,1);sameFrame(initial);expect(initial.horizontal).toBeGreaterThan(2.6);expect(initial.text).toMatch(/^OUT OF REACH/);expect(initial.text).toContain('under 2.6 m');
  await page.keyboard.down('KeyW');const entered=await step(page,1);await page.keyboard.up('KeyW');sameFrame(entered);expect(entered.horizontal).toBeLessThan(2.6);expect(Math.abs(entered.deltaY)).toBeLessThan(1.1);expect(entered.color).toBe(0x94f4bf);expect(entered.text,'Readiness transition must be visible in its first native render').toMatch(/^IN RANGE/);expect(entered.state).toBe('ready');
  await page.keyboard.down('KeyS');const left=await step(page,1);await page.keyboard.up('KeyS');sameFrame(left);expect(left.horizontal).toBeGreaterThanOrEqual(2.6);expect(left.color).toBe(0xffdf91);expect(left.text).toMatch(/^OUT OF REACH/);expect(left.text).toContain('under 2.6 m');
  await page.evaluate(()=>{const w=window as any,p=w.__p40Player.position;w.__p40Crabs[0].position.set(p.x,.18,p.z+3.4);w.__p40Crabs[1].position.set(p.x+.3,.18,p.z+4.4);});await step(page,3);await page.keyboard.press('KeyT');await step(page,1);await page.keyboard.press('KeyE');const committed=await step(page,1);sameFrame(committed);expect(committed.text).toMatch(/^STRIKING/);
  await page.keyboard.press('KeyT');const windup=await step(page,2);sameFrame(windup);expect(windup.copyUUID).toBe(committed.preyUUID);expect(windup.text).toMatch(/^STRIKING/);expect(windup.alive).toBe(true);expect(windup.score).toBe('0');
  await step(page,3);expect(await resources(page)).toEqual({sameGeometry:true,sameMaterial:true,positions:true,indices:true});await testInfo.attach('first-render-range-transitions-and-commitment',{body:JSON.stringify({initial,entered,left,committed,windup},null,2),contentType:'application/json'});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test.describe('phone reduced motion and frozen dive presentation',()=>{test.use({hasTouch:true,viewport:{width:390,height:844}});
  test('live reduced-motion prey retains marker clarity; Pause and Inspect freeze/hide it without resource changes',async({page},testInfo)=>{
    await mount(page,'fish',true);await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive',exact:true}).click();const reduced=await step(page,2),moving=await step(page,1);sameFrame(reduced);sameFrame(moving);expect(moving.prey).not.toEqual(reduced.prey);expect(moving.tailYaw).toBe(0);
    await page.getByRole('button',{name:'Pause',exact:true}).tap();const paused=await step(page,1),frozen=await step(page,4);expect(frozen.player).toEqual(paused.player);expect(frozen.prey).toEqual(paused.prey);expect(frozen.halo).toEqual(paused.halo);expect(frozen.text).toBe(paused.text);expect(frozen.color).toBe(paused.color);
    await page.getByRole('button',{name:'Pause',exact:true}).tap();await step(page,2);await clickCephalopodControl(page,'Inspect');const inspection=await step(page,1),inspectionAfter=await step(page,3);expect(inspection.visible).toBe(false);expect(inspectionAfter.visible).toBe(false);expect(inspectionAfter.prey).toEqual(inspection.prey);expect(inspectionAfter.player).toEqual(inspection.player);expect(inspectionAfter.readoutHidden).toBe(true);
    await page.getByRole('button',{name:'Return to dive',exact:true}).click();const resumed=await step(page,2);sameFrame(resumed);expect(await resources(page)).toEqual({sameGeometry:true,sameMaterial:true,positions:true,indices:true});await testInfo.attach('reduced-motion-pause-inspection',{body:JSON.stringify({reduced,moving,paused,frozen,inspection,inspectionAfter,resumed},null,2),contentType:'application/json'});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  });
});
