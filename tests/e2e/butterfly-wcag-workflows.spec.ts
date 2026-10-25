import {test,expect,type Locator,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,reducedMotion:'reduce'|'no-preference'='no-preference'){
 await page.emulateMedia({reducedMotion});await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function enter(page:Page,button:Locator){await expect(button).toBeEnabled();await button.focus();await expect(button).toBeFocused();await page.keyboard.press('Enter');}
async function seek(page:Page,slider:Locator,value:number){await slider.focus();await page.keyboard.press('Home');for(let i=0;i<value;i++)await page.keyboard.press('ArrowRight');}
async function openFeeding(page:Page){
 await page.locator('.bf-destination-row[data-habitat="milkweed"] .bf-visit-direct').click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 return page.getByRole('region',{name:'Feeding and pollination observation',exact:true});
}

for(const feeding of [true,false]){
 test((feeding?'flower':'stage')+' playback retains focus through disabled states and natural completion',async({page})=>{
  await mount(page);const stage=page.locator('.bf-stage');let scope:Locator;
  if(feeding)scope=await openFeeding(page);
  else{
   const cycle=page.getByRole('region',{name:'Life cycle investigation',exact:true});
   await cycle.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption('milkweed');
   await cycle.getByRole('combobox',{name:/Predict how far it gets/}).selectOption('complete');
   await cycle.getByRole('button',{name:'Lay eggs here',exact:true}).click();
   scope=page.getByRole('region',{name:'Life cycle observation',exact:true});
   await scope.getByRole('button',{name:'Watch next stage',exact:true}).click();
  }
  const noun=feeding?'feeding':'stage',progressAttr=feeding?'data-bf-feeding-progress':'data-bf-life-progress';
  const pause=scope.getByRole('button',{name:'Pause '+noun+' motion',exact:true});
  const resume=scope.getByRole('button',{name:'Continue '+noun+' motion',exact:true});
  const replay=scope.getByRole('button',{name:'Replay '+noun+' motion',exact:true});
  const still=scope.getByRole('button',{name:feeding?'Show step still':'Show stage still',exact:true});
  const slider=scope.getByRole('slider',{name:feeding?'Visit progress':'Stage illustration progress',exact:true});
  const following=scope.getByRole('button',{name:feeding?'Restart flower visit':'Return to flight view',exact:true});
  await enter(page,pause);await expect(pause).toBeDisabled();await expect(pause).toHaveAttribute('tabindex','-1');await expect(pause).toBeFocused();await expect(pause).toHaveCSS('opacity','1');
  await page.keyboard.press('Tab');await expect(still).toBeFocused();await expect(pause).toHaveCSS('opacity','0.55');
  await seek(page,slider,40);await enter(page,resume);await expect(resume).toBeDisabled();await expect(resume).toBeFocused();
  // Inactive Replay must ignore every activation route instead of restarting at zero.
  await expect(replay).toBeDisabled();await replay.focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');await replay.click({force:true});
  expect(Number(await stage.getAttribute(progressAttr))).toBeGreaterThanOrEqual(.4);
  await expect(replay).toBeFocused();
  await enter(page,pause);const stopped=await stage.getAttribute(progressAttr);
  await page.keyboard.press('Enter');await page.keyboard.press('Space');await pause.click({force:true});await page.waitForTimeout(120);
  expect(await stage.getAttribute(progressAttr)).toBe(stopped);await expect(pause).toBeFocused();
  await enter(page,replay);await expect(replay).toBeDisabled();await expect(replay).toBeFocused();
  await enter(page,still);await expect(still).toBeDisabled();await expect(still).toBeFocused();await expect(still).toHaveCSS('opacity','1');
  await expect(stage).toHaveAttribute(progressAttr,'1.000');await page.keyboard.press('Tab');await expect(following).toBeFocused();

  // Completion is autonomous: focus cannot fall to BODY if the learner Tabs to Pause or Still.
  await scope.getByRole('combobox',{name:feeding?'Playback speed':'Stage playback speed',exact:true}).selectOption('2');
  await seek(page,slider,40);await enter(page,resume);await expect(pause).toBeEnabled();await pause.focus();await expect(pause).toBeFocused();
  await expect(pause).toBeDisabled({timeout:7000});await expect(pause).toBeFocused();await expect(pause).toHaveCSS('opacity','1');await expect(pause).toBeInViewport();
  await page.keyboard.press('Tab');await expect(following).toBeFocused();
  await enter(page,replay);await expect(still).toBeEnabled();await still.focus();await expect(still).toBeFocused();
  await expect(still).toBeDisabled({timeout:7000});await expect(still).toBeFocused();await expect(still).toHaveCSS('opacity','1');await expect(still).toBeInViewport();
  await page.keyboard.press('Tab');await expect(following).toBeFocused();

  await enter(page,replay);await expect(pause).toBeEnabled();await pause.focus();await page.emulateMedia({reducedMotion:'reduce'});
  await expect(pause).toBeDisabled();await expect(pause).toBeFocused();await expect(pause).toHaveAttribute('tabindex','-1');
 });
}

test('flower steps and saved comparisons retain meaningful keyboard continuation',async({page})=>{
 await mount(page,'reduce');const stage=page.locator('.bf-stage'),feed=await openFeeding(page);
 await enter(page,feed.getByRole('button',{name:'Fly to next flower',exact:true}));
 await expect(stage).toHaveAttribute('data-bf-feeding','carry');await expect(stage).toBeFocused();await expect(stage).toBeInViewport();
 await page.keyboard.press('Tab');await expect(feed.getByRole('button',{name:'Whole visit',exact:true})).toBeFocused();
 await enter(page,feed.getByRole('button',{name:'Transfer pollen',exact:true}));
 await expect(stage).toHaveAttribute('data-bf-feeding','deposit');
 const contact=feed.getByRole('group',{name:'Does the pollen make contact?',exact:true});
 await enter(page,feed.getByRole('button',{name:'Record this flower visit',exact:true}));
 await expect(contact).toBeFocused();await expect(contact).toBeInViewport();
 await expect(contact).toHaveAccessibleDescription('This case is saved. Switch contact to inspect and record the other case.');
 await page.keyboard.press('Tab');await expect(contact.getByRole('button',{name:'Touches receptive surface',exact:true})).toBeFocused();
 await enter(page,contact.getByRole('button',{name:'Misses receptive surface',exact:true}));
 await enter(page,feed.getByRole('button',{name:'Record this flower visit',exact:true}));
 await expect(contact).toBeFocused();await expect(contact).toHaveAccessibleDescription('Both contact cases are saved. Replay them or explain your comparison.');
 await expect(feed.locator('[data-bf-pollination-case][data-recorded="true"]')).toHaveCount(2);
});

test('running a season focuses its newly revealed result without rewinding to setup',async({page})=>{
 await mount(page,'reduce');const season=page.getByRole('region',{name:'Mowing and timing investigation',exact:true});
 await season.getByRole('combobox',{name:/Choose a patch you have examined/}).selectOption('milkweed');
 await season.getByRole('combobox',{name:/Predict what happens to the generation/}).selectOption('complete');
 await enter(page,season.getByRole('button',{name:'Run the season',exact:true}));
 const result=season.getByRole('list',{name:'Stage by stage through the season',exact:true});
 await expect(result).toBeFocused();await expect(result).toBeInViewport();await expect(result).toHaveAccessibleDescription(/./);
 await expect(result.locator('li[data-state="cleared"]')).toHaveCount(4);
 await page.keyboard.press('Tab');await expect(season.getByRole('button',{name:'Back to investigation guide',exact:true})).toBeFocused();
});
