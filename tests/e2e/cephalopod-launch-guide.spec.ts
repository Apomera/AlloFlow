import {test, expect, Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
import {clickCephalopodControl} from './helpers/cephalopod_controls';
import {useCephalopodAudioFallback} from './helpers/cephalopod_audio';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});
const errors=new WeakMap<Page,string[]>();
test.describe.configure({timeout:120000,retries:0});
test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{
  const found:string[]=[];errors.set(page,found);page.on('pageerror',error=>found.push(error.message));
  await useCephalopodAudioFallback(page);
});
test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});

async function launch(page:Page){
  await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:false,huntSpeciesId:'commonOcto',huntMode:'observe',huntSeed:2741,huntQuality:'low',_threeLoaded:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';});
}

test('the launch guide follows species and mode choices, then agrees with live help',async({page})=>{
  await launch(page);
  const controls=page.locator('[data-cl-dive-guide=controls]');
  await controls.locator('summary').focus();await page.keyboard.press('Enter');await expect(controls).toHaveAttribute('open','');
  await page.getByLabel('Dive species',{exact:true}).selectOption('vampireSquid');
  await expect(controls).toContainText('Gather / hold');await expect(controls).toContainText('Flash');await expect(controls).toContainText('No ink');await expect(controls).not.toContainText('selected prey');
  await page.getByLabel('Dive species',{exact:true}).selectOption('dumboOcto');
  await expect(controls).toContainText('does not spend stamina on its boost');await expect(controls).not.toContainText('Flash');
  await page.getByLabel('Dive species',{exact:true}).selectOption('coconutOcto');
  await expect(page.locator('[data-cl-dive-guide=strategy]')).toContainText('Carrying improves camouflage but does not count as being in a den');
  const rules=page.locator('[data-cl-dive-guide=rules]');await rules.locator('summary').click();
  await page.getByLabel('Dive mode',{exact:true}).selectOption('reefMission');await expect(rules).toContainText('Hunger and injury are active');
  await page.getByLabel('Dive mode',{exact:true}).selectOption('observe');await expect(rules).toContainText('without health loss or hunger depletion');
  const actions=await controls.locator('dd').allTextContents();
  await page.getByRole('button',{name:'Start field study · Coconut Octopus',exact:true}).click();
  await expect(page.locator('canvas[role=application]')).toBeVisible();
  await expect.poll(async()=>(await harness.glScene(page,'.cl-hunt-stage'))?.draws||0).toBeGreaterThan(0);
  await clickCephalopodControl(page,'Help / settings');
  expect(await page.locator('.cl-hunt-guide dd').allTextContents()).toEqual(actions);
  await expect(page.locator('[data-dive-mode=observe]')).toContainText('without health loss or hunger depletion');
  await page.getByRole('button',{name:'Return to dive',exact:true}).click();
  await expect(page.locator('canvas[role=application]')).toBeFocused();
  await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

for(const width of [1280,390,320])test(`launch controls fit ${width}px and retain native keyboard disclosure`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await launch(page);
  await page.getByLabel('Dive species',{exact:true}).selectOption(width===1280?'commonOcto':'vampireSquid');
  const controls=page.locator('[data-cl-dive-guide=controls]'),summary=controls.locator('summary');
  await summary.focus();await page.keyboard.press('Space');await expect(controls).toHaveAttribute('open','');
  const bounds=await controls.evaluate(node=>{
    const elements=[node,...node.querySelectorAll('section,dt,dd')];
    return elements.map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent?.slice(0,60),left:r.left,right:r.right,scroll:el.scrollWidth,width:el.clientWidth};});
  });
  for(const b of bounds){expect(b.left,b.text).toBeGreaterThanOrEqual(0);expect(b.right,b.text).toBeLessThanOrEqual(width+1);expect(b.scroll,b.text).toBeLessThanOrEqual(b.width+1);}
  await controls.screenshot({path:info.outputPath(`launch-guide-${width}.png`)});
  await summary.focus();await page.keyboard.press('Enter');await expect(controls).not.toHaveAttribute('open','');
});
