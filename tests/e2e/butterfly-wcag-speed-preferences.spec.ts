import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

for(const feeding of [true,false]){
 test((feeding?'flower':'stage')+' speed configuration retains focus when reduced motion changes and does not start playback',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(harness.url+'/__harness');
  await page.evaluate(()=>{
   const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
   w.__mount({butterfly:{observations:['milkweed'],lifecycle:{patch:'milkweed',prediction:'complete',stage:'caterpillar',broods:[]}}});
   Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
  });
  const stage=page.locator('.bf-stage');await expect(stage).toHaveAttribute('data-bf-renderer','map');
  if(feeding){
   await page.locator('.bf-destination-row[data-habitat="milkweed"] .bf-visit-direct').click();
   await page.getByRole('button',{name:'Land here',exact:true}).click();
   await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
  }else await page.getByRole('button',{name:'Watch on plant',exact:true}).click();
  const scope=page.getByRole('region',{name:feeding?'Feeding and pollination observation':'Life cycle observation',exact:true});
  const progress=feeding?'data-bf-feeding-progress':'data-bf-life-progress';
  // Finish setup before beginning a fresh live animation through its actual control.
  await scope.getByRole('button',{name:feeding?'Show step still':'Show stage still',exact:true}).evaluate((button:HTMLButtonElement)=>button.click());
  await expect(stage).toHaveAttribute(progress,'1.000');
  const replay=scope.getByRole('button',{name:feeding?'Replay feeding motion':'Replay stage motion',exact:true});
  await expect(replay).toBeEnabled();await replay.focus();await page.keyboard.press('Enter');
  const pause=scope.getByRole('button',{name:feeding?'Pause feeding motion':'Pause stage motion',exact:true});
  await expect(pause).toBeEnabled();
  const speed=scope.getByRole('combobox',{name:feeding?'Playback speed':'Stage playback speed',exact:true});
  await speed.focus();await expect(speed).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(pause).toBeDisabled();await expect(replay).toBeDisabled();
  await expect(speed).toBeEnabled();await expect(speed).toBeFocused();await expect(speed).toBeInViewport();
  const frozen=await stage.getAttribute(progress);
  await speed.selectOption('0.5');await expect(speed).toHaveValue('0.5');await expect(speed).toBeFocused();
  await page.waitForTimeout(200);expect(await stage.getAttribute(progress)).toBe(frozen);
  await speed.selectOption('2');await expect(speed).toHaveValue('2');await expect(speed).toBeFocused();
  await page.waitForTimeout(200);expect(await stage.getAttribute(progress)).toBe(frozen);
  // Changing the OS preference back also waits for an explicit playback request.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(speed).toBeFocused();await expect(replay).toBeEnabled();
  await page.waitForTimeout(200);expect(await stage.getAttribute(progress)).toBe(frozen);
  await replay.focus();await page.keyboard.press('Enter');await expect(pause).toBeEnabled();
  await expect.poll(()=>stage.getAttribute(progress)).not.toBe(frozen);
 });
}
