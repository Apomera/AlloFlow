import {test,expect,type Locator,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,stage?:string){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(stage=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed','bergamot'],...(stage?{lifecycle:{patch:'milkweed',prediction:'complete',stage,broods:[]}}:{})}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },stage);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function watchAnnouncements(page:Page){
 await page.evaluate(()=>{
  const w=window as any;w.__observationObserver?.disconnect();w.__observationAnnouncements=[];
  w.__observationObserver=new MutationObserver(records=>{
   const regions=new Set<Element>();
   for(const record of records){
    const target=record.target.nodeType===Node.ELEMENT_NODE?record.target as Element:record.target.parentElement;
    const region=target?.closest('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]');
    if(region&&!region.closest('[aria-live="off"],[aria-hidden="true"]'))regions.add(region);
   }
   for(const region of regions)w.__observationAnnouncements.push({region:region.className,text:region.textContent?.trim()});
  });
  w.__observationObserver.observe(document.querySelector('.bfl'),{subtree:true,childList:true,characterData:true});
 });
}
async function activateAndHear(page:Page,command:Locator,description:Locator,prefix?:Locator){
 await command.focus();await watchAnnouncements(page);await page.keyboard.press('Enter');
 await expect(command).toBeFocused();
 const result=(prefix?(await prefix.textContent())!.trim()+'. ':'')+(await description.textContent())!.trim();
 await expect(page.locator('.bf-status')).toHaveText(result,{timeout:2500});
 await expect.poll(()=>page.evaluate(()=>(window as any).__observationAnnouncements),{timeout:2500}).toEqual([{region:'bf-status',text:result}]);
}

test('flight energy has a visible label, percent value and recovery instruction',async({page})=>{
 await mount(page);const meter=page.getByRole('meter');
 await expect(meter).toHaveAccessibleName('Flight energy · 100%',{timeout:2500});
 await expect(meter).toHaveAccessibleDescription('A simplified activity meter. Examine a flowering patch to replenish it.');
 await expect(meter).toHaveAttribute('aria-valuetext','100%');
 const cdp=await page.context().newCDPSession(page);
 const ax=await cdp.send('Accessibility.getFullAXTree');
 expect(ax.nodes.find(node=>node.role?.value==='meter')?.name?.value).toBe('Flight energy · 100%');
 await cdp.detach();
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
 const forward=page.getByRole('button',{name:'Flap forward',exact:true});await forward.focus();
 // Assistive activation makes bounded steps, so the energy change is deterministic.
 for(let i=0;i<6;i++)await forward.evaluate((button:HTMLButtonElement)=>button.click());
 await expect(meter).toHaveAccessibleName('Flight energy · 99%');
 await expect(meter).toHaveAttribute('aria-valuetext','99%');await expect(forward).toBeFocused();
 expect(await meter.evaluate(node=>node.closest('[role="status"],[aria-live="polite"],[aria-live="assertive"]')!==null)).toBe(false);
});

for(const [patch,name] of [['milkweed','Common milkweed'],['bergamot','Wild bergamot']]){
 test(patch+' still comparisons announce the pollen result once while scrubbing stays quiet',async({page})=>{
  await mount(page);
  await page.getByRole('button',{name:'Visit without flying · '+name,exact:true}).click();
  await page.getByRole('button',{name:'Land here',exact:true}).click();
  await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
  const feed=page.getByRole('region',{name:'Feeding and pollination observation',exact:true});
  const progress=feed.getByRole('slider',{name:'Visit progress',exact:true});
  const still=feed.getByRole('button',{name:'Show step still',exact:true});
  const result=feed.getByRole('region',{name:'Pollen transfer result',exact:true}).locator('p.bf-help');
  // The endpoint also gives a text observation for the nectar pickup step.
  await progress.focus();await page.keyboard.press('Home');await activateAndHear(page,still,result);
  await feed.getByRole('button',{name:'Fly to next flower',exact:true}).click();
  await feed.getByRole('button',{name:'Transfer pollen',exact:true}).click();
  for(const contact of ['Touches receptive surface','Misses receptive surface']){
   await feed.getByRole('button',{name:contact,exact:true}).click();
   await progress.focus();await watchAnnouncements(page);await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
   await expect(progress).toHaveValue('1');await expect(progress).toBeFocused();
   expect(await page.evaluate(()=>(window as any).__observationAnnouncements)).toEqual([]);
   await activateAndHear(page,still,result);await expect(still).toBeDisabled();
   await page.keyboard.press('Tab');await expect(feed.getByRole('button',{name:'Restart flower visit',exact:true})).toBeFocused();
  }
  await expect(page.locator('[data-bf-pollination-record]')).toHaveCount(0);
 });
}

test('before and after leaf feeding announce the matching still observation without advancing the generation',async({page})=>{
 await mount(page,'caterpillar');
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();
 await page.getByRole('button',{name:'Leaf feeding close-up',exact:true}).click();
 const result=page.getByRole('region',{name:'Caterpillar feeding observation',exact:true}),description=result.locator(':scope > p').first(),tissue=result.locator('.bf-larval-readout strong').nth(1);
 const before=await page.evaluate(()=>(window as any).__toolData.butterfly);
 for(const name of ['Before feeding','After feeding','Before feeding'])await activateAndHear(page,result.getByRole('button',{name,exact:true}),description,tissue);
 await activateAndHear(page,page.getByRole('button',{name:'Show stage still',exact:true}),description,tissue);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(before);
});

test('chrysalis still milestones announce the selected appearance while preserving reduced motion',async({page})=>{
 await mount(page,'chrysalis');
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();
 await page.getByRole('button',{name:'Chrysalis maturation close-up',exact:true}).click();
 const result=page.getByRole('region',{name:'Chrysalis maturation observation',exact:true}),stage=page.locator('.bf-stage');
 const before=await page.evaluate(()=>(window as any).__toolData.butterfly);
 for(const [name,value] of [['Green chrysalis','0.000'],['Wing markings appear','0.600'],['Before emergence','1.000'],['Green chrysalis','0.000']]){
  const command=result.getByRole('button',{name,exact:true});await command.focus();await watchAnnouncements(page);await page.keyboard.press('Enter');
  const text=(await result.locator('.bf-maturation-cue').textContent())!.trim()+'. '+(await result.locator(':scope > p').first().textContent())!.trim();
  await expect(page.locator('.bf-status')).toHaveText(text,{timeout:2500});await expect(command).toBeFocused();await expect(command).toHaveAttribute('aria-pressed','true');
  await expect(stage).toHaveAttribute('data-bf-life-progress',value);
  expect(await page.evaluate(()=>(window as any).__observationAnnouncements)).toEqual([{region:'bf-status',text}]);
 }
 const still=page.getByRole('button',{name:'Show stage still',exact:true});await still.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.bf-status')).toHaveText(/Wing pattern visible\. Orange and dark markings/);await expect(still).toBeFocused();
 await page.waitForTimeout(120);await expect(stage).toHaveAttribute('data-bf-life-progress','1.000');
 await expect(page.getByRole('button',{name:'Continue stage motion',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(before);
});
