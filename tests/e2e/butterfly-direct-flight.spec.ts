import {test,expect,type Page,type Locator} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

// These controls use the real animation loop in the illustrated fallback.
// The pollinator suite covers the GPU scene separately.
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,three=false){
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(message.text()))errors.push(message.text());});
 await page.goto(harness.url+'/__harness');
 await page.evaluate(three=>{
  const w=window as any;
  if(!three)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  else{
   const original=w.THREE.Scene.prototype.onAfterRender;
   w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){
    if(this.getObjectByName('player-monarch')){w.__directScene=this;w.__directCamera=camera;}
    return original.call(this,renderer,scene,camera);
   };
  }
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },three);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',three?'three':'map');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-controls','steer');
 await expect(page.locator('.bf-gl')).toHaveCount(three?1:0);
 return errors;
}

async function snapshot(page:Page){
 return page.locator('.bf-stage').evaluate((node:HTMLElement)=>({
  position:(node.dataset.position||'').split(',').map(Number),
  heading:Number(node.dataset.bfHeading),speed:Number(node.dataset.bfSpeed),
  clock:node.dataset.clock,mode:node.dataset.bfFlightMode,paused:node.dataset.bfMotionPaused
 }));
}

async function takeFlight(page:Page){
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
 await expect(page.locator('.bf-stage')).toBeFocused();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-flight-mode','manual');
}

async function settled(page:Page){
 await expect.poll(async()=>(await snapshot(page)).speed).toBeLessThanOrEqual(.01);
 await expect.poll(async()=>{
  const heading=(await snapshot(page)).heading;await page.waitForTimeout(80);
  const delta=(await snapshot(page)).heading-heading;
  return Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)));
 }).toBeLessThan(.004);
 const still=await snapshot(page);
 await page.waitForTimeout(220);
 const later=await snapshot(page);
 expect(Math.hypot(later.position[0]-still.position[0],later.position[2]-still.position[2])).toBeLessThanOrEqual(.02);
 expect(Math.abs(Math.atan2(Math.sin(later.heading-still.heading),Math.cos(later.heading-still.heading)))).toBeLessThan(.01);
 expect(later.speed).toBeLessThanOrEqual(.01);
 return later;
}

async function frozen(page:Page){
 const before=await snapshot(page);await page.waitForTimeout(220);
 expect(await snapshot(page)).toEqual(before);
 return before;
}

async function pointerHold(page:Page,button:Locator,whileHeld:()=>Promise<void>){
 await button.scrollIntoViewIfNeeded();await expect(button).toBeEnabled();
 const box=await button.boundingBox();expect(box).not.toBeNull();
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();
 try{await whileHeld();}
 finally{
  // Releasing away from the button also exercises its real pointer capture.
  await page.mouse.move(8,8);await page.mouse.up();
 }
}

test('keyboard steering follows heading and supports braking, height and gliding',async({page})=>{
 const errors=await mount(page),stage=page.locator('.bf-stage');
 const controls=page.getByRole('group',{name:'Flight controls',exact:true});
 await expect(controls.getByRole('button',{name:'Butterfly steering',exact:true})).toHaveAttribute('aria-pressed','true');
 await takeFlight(page);

 const start=await snapshot(page);
 await page.keyboard.down('w');
 await expect.poll(async()=>(await snapshot(page)).position[2]).toBeLessThan(start.position[2]-1);
 const beforeTurn=await snapshot(page);
 // At the initial heading, forward travel is north; turning right then holding
 // forward must curve toward positive x rather than continue map-north.
 expect(Math.abs(beforeTurn.position[0]-start.position[0])).toBeLessThan(.1);
 await page.keyboard.down('d');
 await expect.poll(async()=>(await snapshot(page)).heading).toBeLessThan(-.4);
 await page.keyboard.up('d');
 await expect.poll(async()=>(await snapshot(page)).position[0]).toBeGreaterThan(beforeTurn.position[0]+1);
 await page.keyboard.up('w');await settled(page);

 await page.keyboard.down('w');
 await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(3);
 await page.keyboard.down('s');
 await expect.poll(async()=>(await snapshot(page)).speed).toBeLessThan(.15);
 await page.keyboard.up('w');await page.keyboard.up('s');await settled(page);

 const altitude=(await snapshot(page)).position[1];
 await page.keyboard.down('e');
 await expect.poll(async()=>(await snapshot(page)).position[1]).toBeGreaterThan(altitude+.6);
 await page.keyboard.up('e');const higher=(await snapshot(page)).position[1];
 await page.keyboard.down('q');
 await expect.poll(async()=>(await snapshot(page)).position[1]).toBeLessThan(higher-.4);
 await page.keyboard.up('q');
 await stage.press('g');await expect(stage).toHaveAttribute('data-bf-flight-mode','gliding');
 await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(1);
 await stage.press('g');await expect(stage).toHaveAttribute('data-bf-flight-mode','manual');
 await settled(page);expect(errors).toEqual([]);
});

test('the rendered follow camera follows steering while player wing flex respects shared pause',async({page})=>{
 test.setTimeout(180000);
 await page.setViewportSize({width:1100,height:850});
 const errors=await mount(page,true),stage=page.locator('.bf-stage');
 const playerFlex=()=>page.evaluate(()=>{
  const root=(window as any).__directScene.getObjectByName('player-monarch');
  return root.getObjectByName('monarch-forewing-left').material.userData.playerWingFlex.value.toArray() as number[];
 });
 // Idle hovering uses meadow time, independently of the flight clock.
 await expect.poll(async()=>(await playerFlex()).some(value=>Math.abs(value)>.002),{timeout:45000}).toBe(true);
 await takeFlight(page);
 const heading=(await snapshot(page)).heading;
 await page.keyboard.down('d');
 await expect.poll(async()=>{
  const turn=(await snapshot(page)).heading-heading;return Math.abs(Math.atan2(Math.sin(turn),Math.cos(turn)));
 },{timeout:45000}).toBeGreaterThan(.05);
 // Input release and deceleration are covered above without GPU timing. Freeze
 // this actual rendered turn to inspect camera alignment at exactly that pose.
 await page.keyboard.up('d');await stage.press('Space');const heldFlex=await playerFlex();await frozen(page);
 expect(await playerFlex()).toEqual(heldFlex);
 const framing=await page.evaluate(()=>{
  const w=window as any,player=w.__directScene.getObjectByName('player-monarch'),camera=w.__directCamera;
  const dx=camera.position.x-player.position.x,dz=camera.position.z-player.position.z,yaw=player.rotation.y;
  return {behind:(dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.hypot(dx,dz),fov:camera.fov,up:camera.up.toArray()};
 });
 expect(framing.behind).toBeGreaterThan(.95);expect(framing.up).toEqual([0,1,0]);expect(framing.fov).toBeLessThan(65);
 mkdirSync('scratch/butterfly-pollinator-view',{recursive:true});
 await stage.screenshot({path:'scratch/butterfly-pollinator-view/direct-steering-flight.png'});
 expect(errors).toEqual([]);
});

test('pause, focus loss and captured pointer release clear held steering',async({page})=>{
 const errors=await mount(page),stage=page.locator('.bf-stage');await takeFlight(page);
 await page.keyboard.down('w');await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(3);
 await stage.press('Space');await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await frozen(page);
 // W is still physically held. Resuming must not restore its old logical hold.
 await stage.press('Space');await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await settled(page);await page.keyboard.up('w');

 await page.keyboard.down('w');await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(3);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');await frozen(page);
 await takeFlight(page);await settled(page);await page.keyboard.up('w');

 const heading=(await snapshot(page)).heading;
 await pointerHold(page,page.getByRole('button',{name:'Turn left',exact:true}),async()=>{
  await expect.poll(async()=>(await snapshot(page)).heading-heading).toBeGreaterThan(.35);
 });
 await settled(page);
 const start=await snapshot(page);
 await pointerHold(page,page.getByRole('button',{name:'Flap forward',exact:true}),async()=>{
  await expect.poll(async()=>{
   const now=await snapshot(page);return Math.hypot(now.position[0]-start.position[0],now.position[2]-start.position[2]);
  }).toBeGreaterThan(1);
 });
 await settled(page);expect(errors).toEqual([]);
});

test('map directions remain available and manual steering takes over guided travel without changing evidence',async({page})=>{
 const errors=await mount(page),stage=page.locator('.bf-stage');
 const journal=page.getByRole('region',{name:'Field journal',exact:true});
 const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData));
 const evidence=await journal.innerText();
 const controls=page.getByRole('group',{name:'Flight controls',exact:true});
 await controls.getByRole('button',{name:'Map directions',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-controls','map');
 await expect(controls.getByRole('button',{name:'Map directions',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'Fly left',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Fly back',exact:true})).toBeVisible();
 await takeFlight(page);const start=await snapshot(page);
 await pointerHold(page,page.getByRole('button',{name:'Fly right',exact:true}),async()=>{
  await expect.poll(async()=>(await snapshot(page)).position[0]).toBeGreaterThan(start.position[0]+1);
 });
 const east=await settled(page);expect(Math.abs(east.position[2]-start.position[2])).toBeLessThan(.1);
 await controls.getByRole('button',{name:'Butterfly steering',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-controls','steer');

 await page.locator('[data-habitat="milkweed"] .bf-destination').click();
 await expect(stage).toHaveAttribute('data-bf-flight-mode','guided');
 await stage.focus();const guided=await snapshot(page);
 await page.keyboard.down('a');
 await expect(stage).toHaveAttribute('data-bf-flight-mode','manual');
 await expect.poll(async()=>Math.abs((await snapshot(page)).heading-guided.heading)).toBeGreaterThan(.25);
 await page.keyboard.up('a');await settled(page);
 expect(await journal.innerText()).toBe(evidence);
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);
 expect(errors).toEqual([]);
});
