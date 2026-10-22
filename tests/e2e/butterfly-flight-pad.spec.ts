import {test,expect,type Page,type Locator} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

// The pad drives the real flight loop in the illustrated fallback. GPU camera
// and scenery checks live in the direct-flight and pollinator suites.
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1100,height:850});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1100,height:850},reducedMotion:'no-preference',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-pad-visible','true');
 await expect(page.getByRole('button',{name:'Flight pad',exact:true})).toBeDisabled();
 return errors;
}
async function snapshot(page:Page){
 return page.locator('.bf-stage').evaluate((node:HTMLElement)=>({
  position:(node.dataset.position||'').split(',').map(Number),heading:Number(node.dataset.bfHeading),speed:Number(node.dataset.bfSpeed),
  clock:node.dataset.clock,paused:node.dataset.bfMotionPaused,mode:node.dataset.bfFlightMode
 }));
}
function angle(a:number,b:number){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
async function start(page:Page){
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
 await expect(page.locator('.bf-stage')).toBeFocused();
 await expect(page.getByRole('button',{name:'Flight pad',exact:true})).toBeEnabled();
}
async function padGeometry(pad:Locator){
 await pad.scrollIntoViewIfNeeded();const box=await pad.boundingBox();expect(box).not.toBeNull();
 return {x:box!.x+box!.width/2,y:box!.y+box!.height/2,r:Math.min(box!.width,box!.height)*.32};
}
async function beginMouse(page:Page,pad:Locator){
 const center=await padGeometry(pad);await page.mouse.move(center.x,center.y);await page.mouse.down();
 await expect(pad).toHaveAttribute('data-active','true');return center;
}
async function neutral(pad:Locator){
 await expect(pad).not.toHaveAttribute('data-active','true');
 expect(await pad.evaluate((node:HTMLElement)=>({x:parseFloat(node.style.getPropertyValue('--bf-stick-x'))||0,y:parseFloat(node.style.getPropertyValue('--bf-stick-y'))||0}))).toEqual({x:0,y:0});
}
async function settled(page:Page){
 await expect.poll(async()=>(await snapshot(page)).speed).toBeLessThanOrEqual(.02);
 await expect.poll(async()=>{const before=await snapshot(page);await page.waitForTimeout(100);return Math.abs(angle((await snapshot(page)).heading,before.heading));}).toBeLessThan(.004);
 const before=await snapshot(page);await page.waitForTimeout(180);const after=await snapshot(page);
 expect(Math.hypot(after.position[0]-before.position[0],after.position[2]-before.position[2])).toBeLessThan(.03);
 expect(Math.abs(angle(after.heading,before.heading))).toBeLessThan(.01);
}
async function frozen(page:Page){const before=await snapshot(page);await page.waitForTimeout(180);expect(await snapshot(page)).toEqual(before);}
async function clickWhileCaptured(button:Locator){await button.evaluate((node:HTMLButtonElement)=>node.click());}

test('drag distance controls thrust and turning, down brakes, and outside release returns the thumb to neutral',async({page})=>{
 const errors=await mount(page);await start(page);
 const pad=page.getByRole('button',{name:'Flight pad',exact:true}),saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData));
 const center=await beginMouse(page,pad);
 await page.mouse.move(center.x,center.y-center.r*.4);
 await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(2);
 await page.waitForTimeout(350);const gentle=(await snapshot(page)).speed;expect(gentle).toBeLessThan(10);
 await page.mouse.move(center.x,center.y-center.r);
 await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(gentle+3);
 const beforeTurn=await snapshot(page);await page.mouse.move(center.x+center.r*.75,center.y-center.r*.65);
 await expect.poll(async()=>angle((await snapshot(page)).heading,beforeTurn.heading)).toBeLessThan(-.15);
 await page.mouse.move(center.x,center.y+center.r);
 await expect.poll(async()=>(await snapshot(page)).speed).toBeLessThan(.2);
 // The captured pointer can travel well outside the pad, but its thumb stays
 // bounded; release there must clear only this analog gesture.
 await page.mouse.move(center.x+center.r*4,center.y);
 const thumb=await pad.evaluate((node:HTMLElement)=>({x:parseFloat(node.style.getPropertyValue('--bf-stick-x'))||0,y:parseFloat(node.style.getPropertyValue('--bf-stick-y'))||0}));
 expect(Math.hypot(thumb.x,thumb.y)).toBeLessThanOrEqual(center.r+.2);
 await page.mouse.up();await neutral(pad);await settled(page);
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);expect(errors).toEqual([]);
});

test('pointer release preserves held keyboard thrust and the focused pad accepts keyboard steering',async({page})=>{
 const errors=await mount(page);await start(page);const pad=page.getByRole('button',{name:'Flight pad',exact:true});
 await page.keyboard.down('w');await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(4);
 const center=await beginMouse(page,pad),before=await snapshot(page);
 await page.mouse.move(center.x+center.r,center.y);
 await expect.poll(async()=>angle((await snapshot(page)).heading,before.heading)).toBeLessThan(-.15);
 await page.mouse.move(8,8);await page.mouse.up();await neutral(pad);
 await page.waitForTimeout(400);expect((await snapshot(page)).speed).toBeGreaterThan(4);
 await page.keyboard.up('w');await settled(page);
 await pad.focus();await page.keyboard.down('ArrowUp');
 await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(3);
 const keyboardTurn=await snapshot(page);await page.keyboard.down('ArrowLeft');
 await expect.poll(async()=>angle((await snapshot(page)).heading,keyboardTurn.heading)).toBeGreaterThan(.15);
 // Pausing from the pad must preserve the current moving pose, rather than
 // first zeroing momentum through the focus transfer's blur handler.
 await pad.press('Space');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-motion-paused','true');
 expect((await snapshot(page)).speed).toBeGreaterThan(1);await frozen(page);
 await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowUp');
 expect(errors).toEqual([]);
});

test('pause, control-mode changes and blur cancel captured input so stale pointer moves cannot restore it',async({page})=>{
 const errors=await mount(page);await start(page);const stage=page.locator('.bf-stage');
 let pad=page.getByRole('button',{name:'Flight pad',exact:true}),center=await beginMouse(page,pad);
 await page.mouse.move(center.x+center.r*.7,center.y-center.r*.7);
 await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(1);
 await clickWhileCaptured(page.getByRole('button',{name:'Pause all motion',exact:true}));
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');await neutral(pad);
 await page.mouse.move(center.x-center.r,center.y-center.r);await frozen(page);await page.mouse.up();
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();await settled(page);

 center=await beginMouse(page,pad);await page.mouse.move(center.x+center.r,center.y);
 await clickWhileCaptured(page.getByRole('group',{name:'Flight controls',exact:true}).getByRole('button',{name:'Map directions',exact:true}));
 await expect(stage).toHaveAttribute('data-bf-pad-visible','false');await expect(pad).toHaveCount(0);
 await page.mouse.move(center.x,center.y-center.r);await page.mouse.up();
 await page.getByRole('button',{name:'Butterfly steering',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-pad-visible','true');
 pad=page.getByRole('button',{name:'Flight pad',exact:true});await neutral(pad);await settled(page);

 center=await beginMouse(page,pad);await page.mouse.move(center.x,center.y-center.r);
 await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');await neutral(pad);
 await page.mouse.move(center.x+center.r,center.y-center.r);await frozen(page);await page.mouse.up();
 await start(page);await settled(page);expect(errors).toEqual([]);
});

test.describe('mobile flight pad',()=>{
 test.use({viewport:{width:390,height:844},hasTouch:true});
 test('keeps the pad and caption apart, responds to native touch and preserves readable accessible controls',async({page})=>{
  const errors=await mount(page),stage=page.locator('.bf-stage');await start(page);
  const pad=page.getByRole('button',{name:'Flight pad',exact:true}),pilot=page.getByRole('group',{name:'On-scene flight controls',exact:true});
  await expect(pilot.getByRole('button',{name:'Rise while flying',exact:true})).toBeEnabled();
  await expect(pilot.getByRole('button',{name:'Lower while flying',exact:true})).toBeEnabled();
  const center=await padGeometry(pad),boxes=await page.evaluate(()=>{
   const bounds=(selector:string)=>{const r=document.querySelector(selector)!.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
   return {pad:bounds('.bf-pilot'),caption:bounds('.bf-scene-bottom'),stage:bounds('.bf-stage'),padTouch:getComputedStyle(document.querySelector('.bf-flight-pad')!).touchAction,stageTouch:getComputedStyle(document.querySelector('.bf-stage')!).touchAction};
  });
  expect(boxes.pad.left).toBeGreaterThanOrEqual(boxes.stage.left);expect(boxes.pad.right).toBeLessThanOrEqual(boxes.stage.right);
  expect(boxes.pad.top).toBeGreaterThanOrEqual(boxes.stage.top);expect(boxes.pad.bottom).toBeLessThanOrEqual(boxes.stage.bottom);
  const overlaps=boxes.pad.left<boxes.caption.right&&boxes.pad.right>boxes.caption.left&&boxes.pad.top<boxes.caption.bottom&&boxes.pad.bottom>boxes.caption.top;
  expect(overlaps).toBe(false);expect(boxes.padTouch).toBe('none');expect(boxes.stageTouch).toBe('auto');
  const scroll=await page.evaluate(()=>window.scrollY),session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x,y:center.y,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+center.r*.6,y:center.y-center.r*.8,id:1}]});
  await expect(pad).toHaveAttribute('data-active','true');
  await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(1);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await neutral(pad);await settled(page);expect(await page.evaluate(()=>window.scrollY)).toBe(scroll);
  // Two-thumb operation must work in either order: hold altitude first, then
  // start steering with the second (non-primary) touch.
  const rise=await pilot.getByRole('button',{name:'Rise while flying',exact:true}).boundingBox();expect(rise).not.toBeNull();
  const altitude=(await snapshot(page)).position[1],first={x:rise!.x+rise!.width/2,y:rise!.y+rise!.height/2,id:2};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,{x:center.x,y:center.y,id:3}]});
  await expect(pad).toHaveAttribute('data-active','true');
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[first,{x:center.x,y:center.y-center.r,id:3}]});
  await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(1);
  await expect.poll(async()=>(await snapshot(page)).position[1]).toBeGreaterThan(altitude+.3);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  await neutral(pad);await settled(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(async()=>{
   const result=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
   return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>node.failureSummary)}));
  })).toEqual([]);
  mkdirSync('scratch/butterfly-pollinator-view',{recursive:true});await stage.screenshot({path:'scratch/butterfly-pollinator-view/flight-pad-mobile.png'});
  expect(errors).toEqual([]);
 });
});
