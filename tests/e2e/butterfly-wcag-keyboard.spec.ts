import {test,expect,type Locator,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

// The illustrated view uses the production input handlers without a GPU.
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}

async function dispatchKey(target:Locator,type:string,key:string,code:string,extra:Record<string,unknown>={}){
 // Synthetic keys let us test reserved browser chords without closing the tab.
 return target.evaluate((node,args)=>{
  const event=new KeyboardEvent(args.type,{key:args.key,code:args.code,bubbles:true,cancelable:true,...args.extra});
  node.dispatchEvent(event);return event.defaultPrevented;
 },{type,key,code,extra});
}

test('returning from either close-up keeps keyboard focus in the meadow',async({page})=>{
 await mount(page);const stage=page.locator('.bf-stage');
 await page.locator('.bf-destination-row[data-habitat="milkweed"] .bf-visit-direct').click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();
 const transfer=page.getByRole('button',{name:'Transfer pollen',exact:true});
 await expect(stage).toHaveAttribute('data-bf-feeding','carry');
 await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');
 await expect(transfer).toBeEnabled();await transfer.focus();await expect(transfer).toBeFocused();await page.keyboard.press('Enter');
 await expect(transfer).toHaveCount(0);await expect(stage).toBeFocused();await expect(stage).toBeInViewport();
 const returnHabitat=page.getByRole('button',{name:'Return to habitat view',exact:true});
 await expect(returnHabitat).toBeEnabled();await returnHabitat.focus();await expect(returnHabitat).toBeFocused();await page.keyboard.press('Enter');
 await expect(returnHabitat).toHaveCount(0);await expect(stage).toBeFocused();await expect(stage).toBeInViewport();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Flowers',exact:true})).toBeFocused();

 const lifecycle=page.getByRole('region',{name:'Life cycle investigation',exact:true});
 await lifecycle.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption('milkweed');
 await lifecycle.getByRole('combobox',{name:/Predict how far it gets/}).selectOption('complete');
 await lifecycle.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 const returnFlight=page.getByRole('button',{name:'Return to flight view',exact:true});
 await expect(returnFlight).toBeEnabled();await returnFlight.focus();await expect(returnFlight).toBeFocused();await page.keyboard.press('Enter');
 await expect(returnFlight).toHaveCount(0);await expect(stage).toBeFocused();await expect(stage).toBeInViewport();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Flowers',exact:true})).toBeFocused();
});

test('flight controls preserve modified shortcuts and composition, then release held input',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();
 const stage=page.locator('.bf-stage'),pad=page.getByRole('button',{name:'Flight pad',exact:true}),forward=page.locator('.bf-touch [data-direction="forward"]');
 const glide=page.getByRole('button',{name:'Glide',exact:true});
 for(const target of [stage,pad]){
  await target.focus();const position=await stage.getAttribute('data-position');
  for(const extra of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229}]){
   for(const [key,code] of [['w','KeyW'],[' ','Space'],['g','KeyG']]){
    expect(await dispatchKey(target,'keydown',key,code,extra)).toBe(false);
    await dispatchKey(target,'keyup',key,code,extra);
   }
  }
  await page.waitForTimeout(200);
  expect(await stage.getAttribute('data-position')).toBe(position);
  await expect(stage).toHaveAttribute('data-bf-motion-paused','false');await expect(glide).toHaveAttribute('aria-pressed','false');
 }
 await forward.focus();const start=await stage.getAttribute('data-position');
 for(const extra of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229}]){
  expect(await dispatchKey(forward,'keydown','Enter','Enter',extra)).toBe(false);
  await dispatchKey(forward,'keyup','Enter','Enter',extra);
 }
 await page.waitForTimeout(200);expect(await stage.getAttribute('data-position')).toBe(start);

 // A modifier pressed while moving must not prevent key-up from releasing input.
 for(const [target,key,code] of [[stage,'w','KeyW'],[pad,'w','KeyW'],[forward,'Enter','Enter']] as const){
  await target.focus();const before=await stage.getAttribute('data-position');
  expect(await dispatchKey(target,'keydown',key,code)).toBe(true);
  await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(before);
  await dispatchKey(target,'keyup',key,code,{ctrlKey:true});
  await page.waitForTimeout(1600);const released=await stage.getAttribute('data-position');
  await page.waitForTimeout(250);expect(await stage.getAttribute('data-position')).toBe(released);
 }
});
