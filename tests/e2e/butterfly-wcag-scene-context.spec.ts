import {test,expect,type Page,type Locator} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page){
 await page.goto(harness.url+'/__harness');await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated view'));
  w.__mount({butterfly:{observations:['milkweed'],lifecycle:{patch:'milkweed',prediction:'complete',stage:'caterpillar',broods:[]},notebook:{reasoning:'Compare the milkweed patch with the mown lawn.'}}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
 await page.evaluate(()=>{
  const w=window as any;w.__sceneFocusEvents=[];
  document.addEventListener('focusin',event=>{
   const target=event.target as HTMLElement;if(!target.matches('.bf-stage'))return;
   const description=document.getElementById(target.getAttribute('aria-describedby')!);
   w.__sceneFocusEvents.push({name:target.getAttribute('aria-label'),description:description!.textContent});
  });
 });
}
async function focusAction(page:Page,button:Locator){
 await expect(button).toBeEnabled();await button.focus();await expect(button).toBeFocused();await page.evaluate(()=>(window as any).__sceneFocusEvents=[]);await page.keyboard.press('Enter');
}
async function expectCurrentContext(page:Page,name:RegExp){
 const scene=page.locator('.bf-stage');await expect(scene).toBeFocused();await expect(scene).toHaveAccessibleName(name);
 const current=await scene.evaluate(node=>({name:node.getAttribute('aria-label'),description:document.getElementById(node.getAttribute('aria-describedby')!)!.textContent}));
 // Inspect the context at focus time, not only after React has caught up.
 expect(await page.evaluate(()=>(window as any).__sceneFocusEvents)).toEqual([current]);
}
async function landAtMilkweed(page:Page){
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
}

test('opening feeding exposes the feeding context before the scene receives focus',async({page})=>{
 await mount(page);await landAtMilkweed(page);
 await focusAction(page,page.getByRole('button',{name:'Watch feeding & pollination',exact:true}));
 await expectCurrentContext(page,/^Feeding and pollination close-up/);
});


test('feeding step changes describe the destination before keyboard focus moves',async({page})=>{
 await mount(page);await landAtMilkweed(page);await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await focusAction(page,page.getByRole('button',{name:'Fly to next flower',exact:true}));
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding','carry');await expectCurrentContext(page,/^Feeding and pollination close-up/);
 await focusAction(page,page.getByRole('button',{name:'Transfer pollen',exact:true}));
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding','deposit');await expectCurrentContext(page,/^Feeding and pollination close-up/);
});

test('returning from feeding exposes the landed habitat context at focus time',async({page})=>{
 await mount(page);await landAtMilkweed(page);await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await focusAction(page,page.getByRole('button',{name:'Return to habitat view',exact:true}));
 await expectCurrentContext(page,/^Butterfly flight area/);await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/Landed · Common milkweed/);
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Flowers',exact:true})).toBeFocused();
});

test('life cycle opening and returning expose their committed context',async({page})=>{
 await mount(page);await focusAction(page,page.getByRole('button',{name:'Watch on plant',exact:true}));
 await expectCurrentContext(page,/^Life cycle close-up/);await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-stage','caterpillar');
 await focusAction(page,page.getByRole('button',{name:'Return to flight view',exact:true}));
 await expectCurrentContext(page,/^Butterfly flight area/);await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-life-watch','false');
});

test('taking flight from a close-up focuses the flight context with current guidance',async({page})=>{
 await mount(page);await landAtMilkweed(page);await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await focusAction(page,page.getByRole('button',{name:'Take flight',exact:true}));await expectCurrentContext(page,/^Butterfly flight area/);
 await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/Exploring the meadow/);await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','false');
});

test('direct visits expose the new habitat name at focus time',async({page})=>{
 await mount(page);
 for(const name of ['Common milkweed','Wild bergamot','Mown lawn','Restoration plot']){
  await focusAction(page,page.getByRole('button',{name:'Visit without flying · '+name,exact:true}));await expectCurrentContext(page,/^Butterfly flight area/);
  await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(new RegExp('Ready to land · '+name));
 }
});

test('Explore navigation focuses the already-paused scene description',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();
 await focusAction(page,page.locator('[data-bf-step="explore"]'));await expectCurrentContext(page,/^Butterfly flight area/);
 await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/Ready when you are/);await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true');
});

test('restoration travel identifies the guided destination when focus enters the scene',async({page})=>{
 await mount(page);await focusAction(page,page.getByRole('button',{name:'Visit restoration plot',exact:true}));
 await expect(page.locator('.bf-stage')).toBeFocused();
 const events=await page.evaluate(()=>(window as any).__sceneFocusEvents);expect(events).toHaveLength(1);
 expect(events[0].name).toMatch(/^Butterfly flight area/);expect(events[0].description).toContain('Guided flight · Restoration plot');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-flight-mode','guided');
});

test('pausing from the flight pad exposes the paused description before moving focus',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();const pad=page.getByRole('button',{name:'Flight pad',exact:true});await pad.focus();
 await page.evaluate(()=>(window as any).__sceneFocusEvents=[]);await page.keyboard.press('Space');
 await expectCurrentContext(page,/^Butterfly flight area/);await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/All motion paused/);
});

test('retrying 3D during flight exposes the paused caption without waiting for the renderer',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();
 await page.evaluate(()=>{(window as any).StemLab.ensureThree=()=>new Promise((_,reject)=>(window as any).__rejectSceneRetry=reject);});
 await focusAction(page,page.getByRole('button',{name:'Retry 3D',exact:true}));await expectCurrentContext(page,/^Butterfly flight area/);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','loading');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true');
 await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/Ready when you are/);
 const field=page.locator('#bf-notebook-reasoning');await field.focus();await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(3,12,'backward'));
 await page.evaluate(()=>(window as any).__rejectSceneRetry(new Error('Test retry unavailable')));await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');await expect(field).toBeFocused();
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,12,'backward']);
});

test('a later focus choice cancels pending scene navigation and preserves notes',async({page})=>{
 await mount(page);await landAtMilkweed(page);const button=page.getByRole('button',{name:'Watch feeding & pollination',exact:true});await button.focus();
 await button.evaluate((node:HTMLButtonElement)=>{
  (window as any).__sceneFocusEvents=[];node.click();
  const field=document.getElementById('bf-notebook-reasoning') as HTMLTextAreaElement;field.focus();field.setSelectionRange(3,18,'backward');
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding','sip');const field=page.locator('#bf-notebook-reasoning');await expect(field).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__sceneFocusEvents)).toEqual([]);
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,18,'backward']);
});

test('pointer selection takes priority over queued scene focus',async({page})=>{
 await mount(page);await landAtMilkweed(page);const button=page.getByRole('button',{name:'Watch feeding & pollination',exact:true});await button.focus();
 await button.evaluate((node:HTMLButtonElement)=>{
  (window as any).__sceneFocusEvents=[];node.click();const label=document.querySelector('label[for="bf-notebook-reasoning"]')!;
  label.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));const range=document.createRange();range.selectNodeContents(label);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);
 });
 const selected=await page.evaluate(()=>window.getSelection()!.toString());expect(selected).not.toBe('');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding','sip');await expect(page.locator('.bf-stage')).not.toBeFocused();
 expect(await page.evaluate(()=>(window as any).__sceneFocusEvents)).toEqual([]);expect(await page.evaluate(()=>window.getSelection()!.toString())).toBe(selected);
});

test('leaving the page before the destination commits cancels queued scene focus',async({page})=>{
 await mount(page);await landAtMilkweed(page);const button=page.getByRole('button',{name:'Watch feeding & pollination',exact:true});await button.focus();
 await button.evaluate((node:HTMLButtonElement)=>{
  (window as any).__sceneFocusEvents=[];node.click();Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>false});window.dispatchEvent(new Event('blur'));
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding','sip');await expect(page.locator('.bf-stage')).not.toBeFocused();
 await page.evaluate(()=>{Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>true});window.dispatchEvent(new Event('focus'));});
 await page.waitForTimeout(100);expect(await page.evaluate(()=>(window as any).__sceneFocusEvents)).toEqual([]);
});

test('unmount cancels queued scene navigation without affecting the next tool',async({page})=>{
 await mount(page);await landAtMilkweed(page);const button=page.getByRole('button',{name:'Watch feeding & pollination',exact:true});await button.focus();
 await button.evaluate((node:HTMLButtonElement)=>{
  const w=window as any;w.__sceneFocusEvents=[];node.click();w.__destroy();
  const field=document.createElement('textarea');field.id='next-tool';field.value='Another investigation';document.body.appendChild(field);field.focus();field.setSelectionRange(2,8,'backward');
 });
 await expect(page.locator('.bf-stage')).toHaveCount(0);const next=page.locator('#next-tool');await expect(next).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__sceneFocusEvents)).toEqual([]);
 expect(await next.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([2,8,'backward']);
});
