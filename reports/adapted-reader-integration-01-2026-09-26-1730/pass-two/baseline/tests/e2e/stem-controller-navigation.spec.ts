import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ratios.js',toolId:'ratioLab',width:1000,height:800,appStyles:true,preScripts:['stem_lab/stem_lab_module.js']});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    const pad={id:'Navigation test pad',index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    (window as any).__pad=pad;Object.defineProperty(navigator,'getGamepads',{value:()=>[pad],configurable:true});
  });
  await page.setViewportSize({width:1040,height:900});await harness.mount(page,{},undefined,{expectCanvas:false});
  await page.evaluate(()=>(window as any).StemInput.setScope('ratioLab',document.getElementById('wrap')));
});
async function press(page:any,button:number){
  // Poll the real runtime at both device edges instead of relying on machine frame timing.
  await page.evaluate((i:number)=>{const w=window as any;w.__pad.buttons[i]={pressed:true,value:1};w.StemInput.poll();},button);
  await page.evaluate((i:number)=>{const w=window as any;w.__pad.buttons[i]={pressed:false,value:0};w.StemInput.poll();},button);
}
test('controller navigates real Ratio Lab tabs and opens its exploration section',async({page})=>{
  await press(page,11);await expect.poll(()=>page.evaluate(()=>(window as any).StemInput.state().navigating)).toBe(true);
  await press(page,13);await expect(page.getByRole('button',{name:'Back to STEM tools'})).toBeFocused();
  await press(page,13);await expect(page.getByRole('tab',{name:/Ratio Tables/})).toBeFocused();
  await press(page,13);await expect(page.getByRole('tab',{name:/Double Line/})).toBeFocused();
  await press(page,0);await expect(page.getByRole('tab',{name:/Double Line/})).toHaveAttribute('aria-selected','true');
  // The remaining three tabs precede the exploration summary.
  for(let i=0;i<4;i++)await press(page,13);
  await expect(page.getByText('Free exploration — choose your own quantities',{exact:true})).toBeFocused();
  await press(page,0);await expect(page.locator('[data-ratio-exploration]')).toHaveAttribute('open','');
  await page.screenshot({path:'reports/stem-controller-review/ratio-controller-navigation.png',scale:'css'});
  await press(page,1);await expect.poll(()=>page.evaluate(()=>(window as any).StemInput.state().navigating)).toBe(false);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('controller changes real React settings once per press and closes with B',async({page})=>{
  await page.evaluate(()=>{
    const w=window as any,container=document.createElement('div');container.id='test-settings';document.getElementById('wrap')!.appendChild(container);
    w.ReactDOM.render(w.React.createElement(w.StemInput.Panel,{React:w.React,toolId:'ratioLab',onClose:()=>w.ReactDOM.unmountComponentAtNode(container)}),container);
  });
  const panel=page.getByRole('region',{name:'Controls settings'});await expect(panel).toBeVisible();
  await press(page,13);await expect(panel.getByRole('button',{name:'Close controls settings'})).toBeFocused();
  await press(page,13);await expect(panel.getByLabel('Input method',{exact:true})).toBeFocused();
  await press(page,15);await expect(panel.getByLabel('Input method',{exact:true})).toHaveValue('keyboard');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow_stem_controls_v1')!).preferences.mode)).toBe('keyboard');
  await press(page,13);await press(page,13);await press(page,13);
  await expect(panel.getByLabel('Show on-screen controls even with keyboard/controller')).toBeFocused();
  await press(page,0);await expect(panel.getByLabel('Show on-screen controls even with keyboard/controller')).toBeChecked();
  await press(page,1);await expect(panel).toHaveCount(0);expect(await page.evaluate(()=>(window as any).StemInput.isSuspended())).toBe(false);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
