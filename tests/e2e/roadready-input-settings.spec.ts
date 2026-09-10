import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_roadready.js',toolId:'roadReady',width:1100,height:780,appStyles:true,preScripts:['stem_lab/stem_lab_module.js'],probes:"window.__testHooks={};document.documentElement.classList.add('theme-dark');"});
test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    const pad={id:'Test controller',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    (window as any).__pad=pad;(window as any).__pads=[pad];Object.defineProperty(navigator,'getGamepads',{value:()=> (window as any).__pads,configurable:true});
  });
});
async function mount(page:any){await harness.mount(page,{roadReady:{view:'parking',reducedMotion:true,badges:{park_master:true}}},undefined,{expectCanvas:false});}
test('keyboard choice hides driving buttons, keeps essentials, and saves custom bindings',async({page})=>{
  await page.setViewportSize({width:1140,height:950});await mount(page);
  await page.getByRole('button',{name:'Controls',exact:true}).click();const panel=page.getByRole('region',{name:'Controls settings'});
  await panel.getByLabel('Input method',{exact:true}).selectOption('keyboard');
  await panel.getByText('Keyboard bindings',{exact:true}).click();
  await panel.getByRole('button',{name:'Change key for Steer left',exact:true}).click();await page.keyboard.press('j');
  await expect(panel).toContainText('Key saved');await panel.getByRole('button',{name:'Close controls settings'}).click();
  await expect(page.getByRole('button',{name:'Forward',exact:true})).toBeHidden();
  await expect(page.getByRole('button',{name:'Park + parking brake',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Pause practice',exact:true})).toBeVisible();
  await page.keyboard.down('j');await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.parking.carRef.current.steering)).toBeLessThan(-0.2);await page.keyboard.up('j');
  await expect.poll(()=>page.evaluate(()=>Math.abs((window as any).__testHooks.parking.carRef.current.steering))).toBeLessThan(0.01);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow_stem_controls_v1')!));expect(saved.preferences.mode).toBe('keyboard');expect(saved.profiles['roadReady|default'].parkingKeys.KeyA).toBe('KeyJ');
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await panel.getByLabel('Show on-screen controls even with keyboard/controller').check();
  await page.screenshot({path:'reports/stem-controller-review/controls-desktop.png',scale:'css',fullPage:true});
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({path:'reports/stem-controller-review/controls-320.png',scale:'css',fullPage:true});
  await panel.getByRole('button',{name:'Close controls settings'}).click();await expect(page.getByRole('button',{name:'Forward',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('controller parking uses analog inputs and brings buttons back on disconnect',async({page})=>{
  await page.setViewportSize({width:1140,height:950});await mount(page);
  await page.getByRole('button',{name:'Controls',exact:true}).click();const panel=page.getByRole('region',{name:'Controls settings'});
  await panel.getByLabel('Input method',{exact:true}).selectOption('controller');await panel.getByRole('button',{name:'Close controls settings'}).click();
  await expect(page.getByRole('button',{name:'Forward',exact:true})).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>(window as any).StemInput.state().waitingForNeutral)).toBe(false);
  await page.evaluate(()=>{(window as any).__pad.buttons[13]={pressed:true,value:1};});
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.parking.carRef.current.driveGear)).toBe('R');
  await page.evaluate(()=>{const p=(window as any).__pad;p.buttons[13]={pressed:false,value:0};p.buttons[7]={pressed:true,value:0.5};p.axes[0]=0.4;});
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.parking.carRef.current.speed)).toBeLessThan(-1);
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.parking.carRef.current.steering)).toBeGreaterThan(0.1);
  await page.evaluate(()=>{(window as any).__pads=[];});await expect(page.getByRole('button',{name:'Forward',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>Math.abs((window as any).__testHooks.parking.carRef.current.speed))).toBe(0);
  await page.evaluate(()=>{(window as any).__pads=[(window as any).__pad];window.dispatchEvent(new Event('gamepadconnected'));});
  await expect.poll(()=>page.evaluate(()=>(window as any).StemInput.state().waitingForNeutral)).toBe(true);
  expect(await page.evaluate(()=>(window as any).__testHooks.parking.carRef.current.speed)).toBe(0);
  await page.evaluate(()=>{const p=(window as any).__pad;p.axes[0]=0;p.buttons[7]={pressed:false,value:0};});
  await expect.poll(()=>page.evaluate(()=>(window as any).StemInput.state().waitingForNeutral)).toBe(false);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

test('driving settings pause practice and retain safety actions with a keyboard layout',async({page})=>{
  await page.setViewportSize({width:1140,height:950});
  await harness.mount(page,{roadReady:{view:'scenarioBriefing',pendingScenario:'residential',scenario:'residential',vehicle:'sedan',reducedMotion:true}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Start Residential Street',exact:true}).click();
  await expect(page.getByRole('button',{name:'Fasten seatbelt',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Controls',exact:true}).click();const panel=page.getByRole('region',{name:'Controls settings'});
  await panel.getByLabel('Input method',{exact:true}).selectOption('keyboard');
  await panel.getByRole('button',{name:'Close controls settings'}).click();
  await expect(page.getByRole('button',{name:'Accelerate (touch and hold)',exact:true})).toBeHidden();
  await expect(page.getByRole('button',{name:'Look over left shoulder (touch and hold)',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await panel.getByLabel('Show on-screen controls even with keyboard/controller').check();
  await panel.getByRole('button',{name:'Close controls settings'}).click();
  await expect(page.getByRole('button',{name:'Accelerate (touch and hold)',exact:true})).toBeVisible();
  await page.screenshot({path:'reports/stem-controller-review/driving-controls.png',scale:'css'});
  expect(await page.evaluate(()=>(window as any).__testHooks.roadReady.carRef.current.speed)).toBe(0);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
