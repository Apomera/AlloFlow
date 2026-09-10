import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_roadready.js',toolId:'roadReady',width:1100,height:780,appStyles:true,preScripts:['stem_lab/stem_lab_module.js'],probes:'window.__testHooks={};'});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{const pad={id:'Action test pad',index:0,mapping:'standard',axes:[0,0,0,0,-1],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};(window as any).__pad=pad;(window as any).__pads=[pad];Object.defineProperty(navigator,'getGamepads',{value:()=>(window as any).__pads,configurable:true});});
  await page.setViewportSize({width:1140,height:950});
});
async function button(page:any,index:number,held:boolean){await page.evaluate(({i,v})=>{const w=window as any;w.__pad.buttons[i]={pressed:v,value:v?1:0};w.StemInput.poll();},{i:index,v:held});}
test('press-to-assign warns about conflicts, saves a button and cancels with Escape',async({page})=>{
  await harness.mount(page,{roadReady:{view:'parking',reducedMotion:true}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Controls',exact:true}).click();const panel=page.getByRole('region',{name:'Controls settings'});
  await panel.getByText('Controller mapping and sensitivity',{exact:true}).click();
  await panel.getByRole('button',{name:'Learn controller input for Horn'}).focus();await button(page,0,true);await expect(panel.getByRole('button',{name:'Cancel controller capture'})).toBeVisible();
  await button(page,0,false);await button(page,7,true);await expect(panel).toContainText('already assigned to Accelerator');await button(page,7,false);
  await button(page,10,true);await expect(panel.getByLabel('Controller binding for Horn')).toHaveValue('b10');await button(page,10,false);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow_stem_controls_v1')!).profiles['roadReady|default'].buttons.horn)).toBe('b10');
  await panel.getByRole('button',{name:'Learn controller input for Look over left shoulder'}).click();await expect(panel.getByRole('button',{name:'Cancel controller capture'})).toBeVisible();await page.keyboard.press('Escape');
  await expect(panel).toContainText('Controller capture cancelled');await expect(panel).toBeVisible();
  await panel.getByRole('button',{name:'Learn controller input for Accelerator'}).click();await expect(panel.getByRole('button',{name:'Cancel controller capture'})).toBeVisible();
  await page.evaluate(()=>{const w=window as any;w.StemInput.poll();w.__pad.axes[4]=1;w.StemInput.poll();});await expect(panel.getByLabel('Controller binding for Accelerator')).toHaveValue('a4');
  await page.screenshot({path:'reports/stem-controller-review/press-to-assign.png',fullPage:true,scale:'css'});
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({path:'reports/stem-controller-review/press-to-assign-320.png',fullPage:true,scale:'css'});
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('right-stick shoulder checks release safely and Reverse never toggles into Park',async({page})=>{
  await harness.mount(page,{roadReady:{view:'scenarioBriefing',pendingScenario:'residential',scenario:'residential',vehicle:'sedan',reducedMotion:true}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Start Residential Street',exact:true}).click();await expect(page.getByRole('button',{name:'Fasten seatbelt',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.keysRef.current._gpA)).toBe(false);
  await page.evaluate(()=>{const w=window as any;w.__pad.axes[2]=-0.8;});
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.headCheckRef.current.dir)).toBe(-1);
  await page.evaluate(()=>{(window as any).__pad.axes[2]=0.8;});await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.headCheckRef.current.dir)).toBe(1);
  await page.evaluate(()=>{(window as any).__pads=[];});await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.headCheckRef.current.dir)).toBe(0);
  await page.evaluate(()=>{const w=window as any;w.__pad.axes[2]=0;w.__pads=[w.__pad];window.dispatchEvent(new Event('gamepadconnected'));});
  await page.getByRole('button',{name:'Fasten seatbelt',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.timeRef.current)).toBeGreaterThan(5);
  await button(page,13,true);await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.gearRef.current)).toBe('R');await button(page,13,false);
  // Let the tool sample the release edge before the second press.
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.keysRef.current._gpDown)).toBe(false);
  await button(page,13,true);await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.keysRef.current._gpDown)).toBe(true);expect(await page.evaluate(()=>(window as any).__testHooks.roadReady.gearRef.current)).toBe('R');await button(page,13,false);
  await button(page,8,true);await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.roadReady.gearRef.current)).toBe('P');await button(page,8,false);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
