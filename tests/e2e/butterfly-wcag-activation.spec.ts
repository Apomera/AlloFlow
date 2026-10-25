import {test,expect,type Page,type Locator} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));w.__mount({butterfly:{observations:['milkweed']}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
}
async function snapshot(page:Page){return page.locator('.bf-stage').evaluate((node:HTMLElement)=>({position:(node.dataset.position||'').split(',').map(Number),heading:Number(node.dataset.bfHeading),speed:Number(node.dataset.bfSpeed)}));}
async function activate(button:Locator){await button.focus();await button.evaluate((node:HTMLButtonElement)=>node.click());await expect(button).toBeFocused();}
async function stable(page:Page){const before=await snapshot(page);expect(before.speed).toBe(0);await page.waitForTimeout(300);expect(await snapshot(page)).toEqual(before);}

test('voice or switch activation makes one repeatable forward, turning, or altitude step and stops',async({page})=>{
 await mount(page);const forward=page.getByRole('button',{name:'Flap forward',exact:true}),right=page.getByRole('button',{name:'Turn right',exact:true}),rise=page.locator('.bf-touch').getByRole('button',{name:'Rise',exact:true});
 let before=await snapshot(page);await activate(forward);let after=await snapshot(page);
 expect(before.position[2]-after.position[2]).toBeGreaterThan(1);await stable(page);
 await expect(page.locator('.bf-status')).toHaveText('Flap forward: one short step. Hovering.');
 before=after;await activate(forward);after=await snapshot(page);expect(before.position[2]-after.position[2]).toBeGreaterThan(1);await stable(page);
 before=after;await activate(right);after=await snapshot(page);expect(Math.abs(after.heading-before.heading)).toBeGreaterThan(.15);await stable(page);
 before=after;await activate(rise);after=await snapshot(page);expect(after.position[1]-before.position[1]).toBeGreaterThan(.3);await stable(page);
});

test('physical holds still work and their release click does not add an assistive step',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Map directions',exact:true}).click();
 const right=page.getByRole('button',{name:'Fly right',exact:true});await right.focus();
 for(const key of ['Enter','Space']){
  const before=await snapshot(page);await page.keyboard.down(key);await expect.poll(async()=>(await snapshot(page)).position[0]).toBeGreaterThan(before.position[0]+.15);await page.keyboard.up(key);
  await page.waitForTimeout(1800);const released=await snapshot(page);await page.waitForTimeout(200);expect((await snapshot(page)).position[0]).toBe(released.position[0]);
 }
 await right.scrollIntoViewIfNeeded();const box=(await right.boundingBox())!,before=await snapshot(page);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect.poll(async()=>(await snapshot(page)).position[0]).toBeGreaterThan(before.position[0]+.15);await page.mouse.up();
 // A physical release carries detail=1. Check synchronously so normal frame
 // integration cannot be confused with an extra quarter-second activation.
 const clicked=await right.evaluate(node=>{const stage=document.querySelector('.bf-stage') as HTMLElement;const before={position:stage.dataset.position,clock:stage.dataset.clock};node.dispatchEvent(new MouseEvent('click',{detail:1,bubbles:true,cancelable:true}));return {before,after:{position:stage.dataset.position,clock:stage.dataset.clock}};});
 expect(clicked.after).toEqual(clicked.before);
});

test('assistive steps work in map directions and preserve paused poses and modified activation',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Map directions',exact:true}).click();
 const right=page.getByRole('button',{name:'Fly right',exact:true});let before=await snapshot(page);await activate(right);expect((await snapshot(page)).position[0]-before.position[0]).toBeGreaterThan(.5);await stable(page);
 before=await snapshot(page);
 for(const modifiers of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true}])await right.evaluate((node,modifiers)=>node.dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true,cancelable:true,...modifiers})),modifiers);
 expect(await snapshot(page)).toEqual(before);
 await right.focus();await page.keyboard.down('Enter');await expect.poll(async()=>(await snapshot(page)).speed).toBeGreaterThan(1);
 await page.getByRole('button',{name:'Pause all motion',exact:true}).evaluate((node:HTMLButtonElement)=>node.click());await page.keyboard.up('Enter');
 const paused=await snapshot(page);expect(paused.speed).toBeGreaterThan(1);await right.evaluate((node:HTMLButtonElement)=>node.click());await page.waitForTimeout(250);expect(await snapshot(page)).toEqual(paused);
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();
 const landed=await snapshot(page);await right.evaluate((node:HTMLButtonElement)=>node.click());expect(await snapshot(page)).toEqual(landed);
});

test('ignored modifier and composition key sequences cannot become an unmodified assistive click',async({page})=>{
 await mount(page);const forward=page.getByRole('button',{name:'Flap forward',exact:true});await forward.focus();
 const before=await snapshot(page);
 // Space normally activates a button on keyup. Releasing Control first must
 // not turn a previously ignored chord into a synthesized flight step.
 await page.keyboard.down('Control');await page.keyboard.down('Space');await page.keyboard.up('Control');await page.keyboard.up('Space');
 expect(await snapshot(page)).toEqual(before);
 for(const key of [' ','Enter']){
  await forward.evaluate((node,key)=>{
   node.dispatchEvent(new KeyboardEvent('keydown',{key,ctrlKey:true,bubbles:true,cancelable:true}));
   (node as HTMLButtonElement).click();
   node.dispatchEvent(new KeyboardEvent('keydown',{key,repeat:true,bubbles:true,cancelable:true}));
   (node as HTMLButtonElement).click();
   node.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));
  },key);
  expect(await snapshot(page)).toEqual(before);
 }
 for(const composition of [{isComposing:true},{keyCode:229}]){
  const prevented=await forward.evaluate((node,composition)=>{
   const key=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true,...composition});node.dispatchEvent(key);
   // Browser default activation does not carry composition state in its click.
   (node as HTMLButtonElement).click();node.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}));return key.defaultPrevented;
  },composition);
  expect(prevented).toBe(false);expect(await snapshot(page)).toEqual(before);
 }
 // If the user agent sends no activation for an ignored key, the block expires
 // after its keyup rather than swallowing the next voice/switch operation.
 await forward.evaluate(node=>{node.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',ctrlKey:true,bubbles:true,cancelable:true}));node.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));});
 await page.waitForTimeout(30);await activate(forward);expect((await snapshot(page)).position[2]).toBeLessThan(before.position[2]-1);await stable(page);
});
