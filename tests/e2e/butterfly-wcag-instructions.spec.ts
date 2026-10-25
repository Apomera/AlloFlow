import {test,expect,type Locator,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,motion:'reduce'|'no-preference'='reduce',life?:string){
 await page.emulateMedia({reducedMotion:motion});await page.goto(harness.url+'/__harness');
 await page.evaluate(life=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:life?{observations:['milkweed'],lifecycle:{patch:'milkweed',prediction:'complete',stage:life,broods:[]}}:{}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },life);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function enter(page:Page,command:Locator){await command.focus();await page.keyboard.press('Enter');await expect(command).toBeFocused();}
async function watchStatus(page:Page){
 await page.evaluate(()=>{
  const w=window as any;w.__instructionObserver?.disconnect();w.__instructionMessages=[];
  w.__instructionObserver=new MutationObserver(()=>w.__instructionMessages.push(document.querySelector('.bf-status')!.textContent!.trim()));
  w.__instructionObserver.observe(document.querySelector('.bf-status'),{subtree:true,childList:true,characterData:true});
 });
}

test('repeated activation of the selected planting plan preserves the prediction and keyboard continuation',async({page})=>{
 await mount(page);const design=page.getByRole('region',{name:'Habitat design activity',exact:true});
 const current=design.getByRole('button',{name:/^Keep it mown/}),guess=design.getByRole('combobox');
 await guess.selectOption('neither');await current.focus();await watchStatus(page);
 for(const activation of ['Enter','Space','assistive']){
  if(activation==='assistive')await current.evaluate((button:HTMLButtonElement)=>button.click());else await page.keyboard.press(activation);
  await expect(guess).toHaveValue('neither',{timeout:2500});await expect(current).toBeFocused();
  await expect(design.getByRole('button',{name:'Apply habitat plan',exact:true})).toBeEnabled();
 }
 expect(await page.evaluate(()=>(window as any).__instructionMessages)).toEqual([]);
 await page.keyboard.press('Tab');await expect(design.getByRole('button',{name:/^Plant wild bergamot/})).toBeFocused();
});

test('a changed planting plan explains the cleared prediction and supplies the current plan as field context',async({page})=>{
 await mount(page);const design=page.getByRole('region',{name:'Habitat design activity',exact:true}),guess=design.getByRole('combobox');
 await expect(guess).toHaveAccessibleDescription(/Keep it mown.*Short mown grass, as the plot is today/,{timeout:2500});
 await guess.selectOption('neither');await watchStatus(page);
 const mixed=design.getByRole('button',{name:/^Plant milkweed \+ bergamot/});await enter(page,mixed);
 const message='Planting plan selected: Plant milkweed + bergamot. Previous prediction cleared. Choose a prediction for this plan before applying it.';
 await expect(page.locator('.bf-status')).toHaveText(message,{timeout:2500});
 await expect(design.locator('.bf-design-feedback')).toHaveText(message);
 expect(await design.locator('.bf-design-feedback').evaluate(node=>node.closest('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]')!==null)).toBe(false);
 expect(await page.evaluate(()=>(window as any).__instructionMessages)).toEqual([message]);
 await expect(guess).toHaveValue('');await expect(design.getByRole('button',{name:'Apply habitat plan',exact:true})).toBeDisabled();
 await expect(guess).toHaveAccessibleDescription(/Plant milkweed \+ bergamot.*Both species, established and in bloom/);
 await page.keyboard.press('Tab');await expect(guess).toBeFocused();
 await guess.selectOption('both');await expect(design.getByRole('button',{name:'Apply habitat plan',exact:true})).toBeEnabled();
 // Choosing and predicting a draft must not plant it or save model evidence.
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','lawn');
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual({});
 await page.setViewportSize({width:320,height:900});
 await page.addStyleTag({content:'.bfl *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}'});
 expect(await page.locator('.bf-status').evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await enter(page,design.getByRole('button',{name:'Apply habitat plan',exact:true}));
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','mixed');
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.restoration)).toMatchObject({design:'mixed',prediction:'both',trials:[]});
});

test('the season patch field explains its prerequisite and updates its instructions after a patch is examined',async({page})=>{
 await mount(page);const site=page.getByRole('combobox',{name:'1. Choose a patch you have examined',exact:true});
 await site.focus();await expect(site).toHaveAccessibleDescription('Examine a patch in the meadow first. You can only run a season where you know what is growing.',{timeout:2500});
 await expect(site.locator('option')).toHaveCount(1);
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Examine patch',exact:true}).click();
 await site.focus();await site.selectOption('milkweed');await expect(site).toBeFocused();
 await expect(site).toHaveAccessibleDescription('Running a season does not change the plants. It only asks whether the plot is still standing when each stage needs it.');
 await page.keyboard.press('Tab');await expect(page.getByRole('combobox',{name:'2. Choose when it gets mown',exact:true})).toBeFocused();
 await expect(page.getByRole('button',{name:'Run the season',exact:true})).toBeDisabled();
});

test('Visit progress exposes its operating instructions and follows reduced motion without losing slider focus',async({page})=>{
 await mount(page,'no-preference');
 const browserErrors:string[]=[];page.on('pageerror',error=>browserErrors.push(error.message));
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 const slider=page.getByRole('slider',{name:'Visit progress',exact:true});await slider.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 await expect(slider).toHaveAccessibleDescription('Drag Visit progress to pause at any moment. Continue resumes there; Replay starts the current step again. Each step stops at its endpoint.',{timeout:2500});
 await expect(slider).toHaveValue('1');await expect(slider).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);await expect(slider).toBeFocused();
 await expect(slider).toHaveAccessibleDescription('Reduced motion: each step opens still. Drag Visit progress or use its arrow keys to inspect any moment without playback.');
 await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(slider).toHaveValue('1');
 await page.waitForTimeout(120);await expect(slider).toHaveValue('1');
 expect(await page.locator('#bf-feed-progress-help').evaluate(node=>node.closest('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]')!==null)).toBe(false);
 expect(browserErrors).toEqual([]);
});

test('stage progress describes growth and leaf feeding in the current motion mode',async({page})=>{
 await mount(page,'no-preference','caterpillar');await page.getByRole('button',{name:'Watch on plant',exact:true}).click();
 const slider=page.getByRole('slider',{name:'Stage illustration progress',exact:true});await slider.focus();
 await expect(slider).toHaveAccessibleDescription(/Replay starts this stage again\. The slider illustrates changes, not elapsed time\./,{timeout:2500});
 await page.getByRole('button',{name:'Leaf feeding close-up',exact:true}).click();await slider.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 await expect(slider).toHaveAccessibleDescription(/Replay starts this feeding sequence again\. The slider illustrates changes, not elapsed time\./);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);await expect(slider).toBeFocused();await expect(slider).toHaveValue('1');
 await expect(slider).toHaveAccessibleDescription(/Reduced motion:.*inspect leaf feeding without automatic playback\./);
 await page.waitForTimeout(120);await expect(slider).toHaveValue('1');
});

test('chrysalis progress describes appearance rather than elapsed development and updates for reduced motion',async({page})=>{
 await mount(page,'no-preference','chrysalis');await page.getByRole('button',{name:'Watch on plant',exact:true}).click();
 await page.getByRole('button',{name:'Chrysalis maturation close-up',exact:true}).click();
 const slider=page.getByRole('slider',{name:'Stage illustration progress',exact:true});await slider.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 await expect(slider).toHaveAccessibleDescription(/Replay starts this appearance sequence again\. The slider illustrates changes, not elapsed time\./,{timeout:2500});
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);await expect(slider).toBeFocused();await expect(slider).toHaveValue('1');
 await expect(slider).toHaveAccessibleDescription(/Reduced motion:.*inspect chrysalis appearance without automatic playback\./);
 await page.waitForTimeout(120);await expect(slider).toHaveValue('1');
});

// Emulate a real preference change while withholding the event notification.
// The scene's existing idle frame must still reconcile its controls and help.
test('idle controls recover when motion-preference change notifications are delayed',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any,prototype=MediaQueryList.prototype,original=prototype.addEventListener;
  w.__motionListenersSuppressed=0;
  prototype.addEventListener=function(type:any,listener:any,options:any){
   if(this.media==='(prefers-reduced-motion: reduce)'&&type==='change'){w.__motionListenersSuppressed++;return;}
   return original.call(this,type,listener,options);
  } as any;
 });
 await mount(page,'no-preference','caterpillar');
 expect(await page.evaluate(()=>(window as any).__motionListenersSuppressed)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 const visit=page.getByRole('slider',{name:'Visit progress',exact:true});await visit.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
 await expect(visit).toHaveAccessibleDescription(/^Reduced motion:/,{timeout:2500});await expect(visit).toBeFocused();
 const feedReplay=page.getByRole('button',{name:'Replay feeding motion',exact:true});await expect(feedReplay).toBeDisabled();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect.poll(()=>page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
 await expect(feedReplay).toBeEnabled();await expect(visit).toHaveAccessibleDescription(/^Drag Visit progress/);await expect(visit).toBeFocused();
 await page.getByRole('button',{name:'Return to habitat view',exact:true}).click();
 await page.getByRole('button',{name:'Watch on plant',exact:true}).click();await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 const stage=page.locator('.bf-stage'),progress=page.getByRole('slider',{name:'Stage illustration progress',exact:true});
 await progress.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 const clock=await stage.getAttribute('data-bf-meadow-clock'),replay=page.getByRole('button',{name:'Replay stage motion',exact:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(progress).toHaveAccessibleDescription(/^Reduced motion:/);await expect(replay).toBeDisabled();await expect(progress).toBeFocused();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(replay).toBeEnabled();await expect(progress).toHaveAccessibleDescription(/^Drag Stage illustration progress/);await expect(progress).toBeFocused();
 await page.waitForTimeout(120);await expect(progress).toHaveValue('1');await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(clock);
});
