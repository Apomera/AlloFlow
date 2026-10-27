import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>{mkdirSync('scratch/butterfly-arrival-focus',{recursive:true});return harness.start();});test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated view'));
  w.__mount({butterfly:{notebook:{reasoning:'Compare the milkweed patch with the mown lawn.'}}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function travel(page:Page){
 await page.locator('[data-habitat="milkweed"] .bf-destination').click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-flight-mode','guided');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','false');
}
async function arrived(page:Page){
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true',{timeout:20000});
 await expect(page.locator('.bf-status')).toHaveText('You have reached Common milkweed. Land to examine this habitat.');
 await expect(page.getByRole('button',{name:'Land here',exact:true})).toBeEnabled();
}

test('guided arrival recovers focus from the flight pad and allows keyboard landing',async({page})=>{
 await mount(page);await travel(page);
 const stage=page.locator('.bf-stage'),pad=page.getByRole('button',{name:'Flight pad',exact:true});
 await pad.focus();await expect(pad).toBeFocused();
 await stage.evaluate(node=>{(window as any).__arrivalCaptions=[];node.addEventListener('focus',()=>{(window as any).__arrivalCaptions.push(document.getElementById('bf-scene-caption')!.textContent);});});
 await arrived(page);await expect(pad).toBeDisabled();
 await expect(stage).toBeFocused();await expect(stage).toHaveAccessibleDescription(/Ready to land · Common milkweed.*Within landing range/);
 expect(await page.evaluate(()=>(window as any).__arrivalCaptions)).toEqual([expect.stringContaining('Ready to land · Common milkweed')]);
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Pause all motion',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Land here',exact:true})).toBeFocused();
 await page.keyboard.press('Enter');await expect(stage).toHaveAttribute('data-bf-landed','milkweed');
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Examine patch',exact:true})).toBeFocused();
 await page.keyboard.press('Enter');await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.butterfly.observations)).toContain('milkweed');
 await expect(page.locator('.bf-status')).toContainText('Milkweed provides leaves for monarch caterpillars.');
});

for(const name of ['Glide','Rise while flying','Flap forward']){
 test('guided arrival recovers the focused '+name+' control',async({page})=>{
  await mount(page);await travel(page);const control=page.getByRole('button',{name,exact:true});
  await control.focus();await expect(control).toBeFocused();await arrived(page);
  await expect(control).toBeDisabled();await expect(page.locator('.bf-stage')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
 });
}

test('guided arrival also recovers map-direction controls without reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await mount(page);
 await page.getByRole('button',{name:'Map directions',exact:true}).click();await travel(page);
 const left=page.getByRole('button',{name:'Fly left',exact:true});await left.focus();await arrived(page);
 await expect(left).toBeDisabled();await expect(page.locator('.bf-stage')).toBeFocused();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-controls','map');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-motion-paused','false');
});

test('arrival preserves notebook focus, text, and backward selection',async({page})=>{
 await mount(page);await travel(page);const field=page.locator('#bf-notebook-reasoning');
 await field.focus();await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(3,18,'backward'));
 const notes=await field.inputValue();await arrived(page);await expect(field).toBeFocused();await expect(field).toBeInViewport();await expect(field).toHaveValue(notes);
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,18,'backward']);
 await page.keyboard.insertText('the meadow');await expect(field).toHaveValue(notes.slice(0,3)+'the meadow'+notes.slice(18));
});

test('arrival keeps the chosen habitat button focused and announces its released pressed state',async({page})=>{
 await mount(page);await travel(page);const destination=page.locator('[data-habitat="milkweed"] .bf-destination');
 await expect(destination).toBeFocused();await expect(destination).toHaveAttribute('aria-pressed','true');
 await arrived(page);await expect(destination).toBeFocused();await expect(destination).toHaveAttribute('aria-pressed','false');
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true})).toBeFocused();
});

test('arrival leaves the volume slider focused and usable',async({page})=>{
 await mount(page);await travel(page);const volume=page.getByRole('slider',{name:'Meadow volume',exact:true});
 await volume.focus();await arrived(page);await expect(volume).toBeFocused();
 const value=Number(await volume.inputValue());await page.keyboard.press('ArrowRight');await expect(volume).toHaveValue(String(value+1));
});

test('a learner choosing the notebook as arrival renders takes priority over recovery',async({page})=>{
 await mount(page);await travel(page);const pad=page.getByRole('button',{name:'Flight pad',exact:true});await pad.focus();
 await page.evaluate(()=>{
  const stage=document.querySelector('.bf-stage')!;
  const observer=new MutationObserver(()=>{
   if(stage.getAttribute('data-bf-paused')!=='true')return;observer.disconnect();
   const field=document.getElementById('bf-notebook-reasoning') as HTMLTextAreaElement;field.focus();field.setSelectionRange(2,12,'backward');
  });
  observer.observe(stage,{attributes:true,attributeFilter:['data-bf-paused']});
 });
 await arrived(page);const field=page.locator('#bf-notebook-reasoning');await expect(field).toBeFocused();
 await page.waitForTimeout(100);await expect(field).toBeFocused();
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([2,12,'backward']);
});

test('global pause freezes the approach and resumed arrival produces one announcement',async({page})=>{
 await mount(page);await travel(page);const stage=page.locator('.bf-stage');
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');const stopped=await stage.getAttribute('data-position');
 await page.waitForTimeout(250);expect(await stage.getAttribute('data-position')).toBe(stopped);
 await expect(page.locator('.bf-status')).not.toContainText('You have reached');
 await page.evaluate(()=>{
  const status=document.querySelector('.bf-status')!;(window as any).__arrivalAnnouncements=[];
  new MutationObserver(()=>{if(status.textContent!.startsWith('You have reached'))(window as any).__arrivalAnnouncements.push(status.textContent);}).observe(status,{subtree:true,childList:true,characterData:true});
 });
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();
 await page.getByRole('button',{name:'Flight pad',exact:true}).focus();await arrived(page);await expect(stage).toBeFocused();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');await expect(stage).toHaveAttribute('data-bf-speed','0.00');
 await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).__arrivalAnnouncements)).toEqual(['You have reached Common milkweed. Land to examine this habitat.']);
});

test('visiting without flight names each nearby habitat in the landing guidance',async({page})=>{
 await mount(page);
 for(const name of ['Common milkweed','Wild bergamot','Mown lawn','Restoration plot']){
  await page.getByRole('button',{name:'Visit without flying · '+name,exact:true}).click();
  const stage=page.locator('.bf-stage');await expect(stage).toBeFocused();
  await expect(stage).toHaveAccessibleDescription('Ready to land · '+name+' Within landing range · Land here to investigate');
  await expect(page.getByRole('button',{name:'Land here',exact:true})).toBeEnabled();
 }
});


test('landing guidance stays readable with enlarged translated text on a narrow screen',async({page})=>{
 await page.setViewportSize({width:320,height:1000});await mount(page);
 await page.evaluate(()=>{const w=window as any;w.__ctx.t=(key:string,fallback:string)=>key==='stem.butterfly.hud_ready_to_land'?'Bereit zur Landung am Lebensraum · {value1}':fallback;w.__rerender();});
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 const dock=page.locator('.bf-scene-dock'),caption=page.locator('#bf-scene-caption');
 await expect(caption.locator('strong')).toHaveText('Bereit zur Landung am Lebensraum · Common milkweed');
 await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/Bereit zur Landung am Lebensraum · Common milkweed/);
 await dock.evaluate(root=>{const values=[root,...root.querySelectorAll('*')].map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));for(const {el,size} of values)(el as HTMLElement).style.fontSize=size*2+'px';});
 await page.addStyleTag({content:'.bf-scene-dock *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}'});
 const overflow=await caption.evaluate(root=>[root,...root.querySelectorAll('*')].filter(el=>el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1).map(el=>el.textContent));expect(overflow).toEqual([]);
 await expect(page.getByRole('button',{name:'Land here',exact:true})).toBeEnabled();
 await dock.screenshot({path:'scratch/butterfly-arrival-focus/translated-landing-guidance.png'});
});
