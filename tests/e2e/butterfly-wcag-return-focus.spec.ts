import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:120000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,fallback=true){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(fallback=>{
  const w=window as any;
  if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test map'));
  w.__mount({butterfly:{notebook:{reasoning:'Compare the milkweed patch with the mown lawn.'}}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
  // Simulate lifecycle events deterministically without switching the user's
  // desktop. DOM focus and native disabled-button behavior remain unchanged.
  w.__foreground=true;w.__hidden=false;
  Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>w.__foreground});
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>w.__hidden});
 },fallback);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three',{timeout:90000});
}
async function leave(page:Page){
 await page.evaluate(()=>{(window as any).__foreground=false;window.dispatchEvent(new Event('blur'));});
}
async function returnToPage(page:Page){
 await page.evaluate(()=>{(window as any).__foreground=true;window.dispatchEvent(new Event('focus'));});
}
async function settle(page:Page){
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
async function startFlight(page:Page){await page.getByRole('button',{name:'Take flight',exact:true}).click();}

test('returning after automatic pause recovers keyboard navigation from a disabled flight pad',async({page})=>{
 await mount(page);await startFlight(page);
 const pad=page.getByRole('button',{name:'Flight pad',exact:true}),stage=page.locator('.bf-stage');
 await pad.focus();await expect(pad).toBeFocused();
 await leave(page);await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await expect(pad).toBeDisabled();await expect(stage).not.toBeFocused();
 await returnToPage(page);await expect(stage).toBeFocused();
 await expect(stage).toHaveAccessibleDescription(/All motion paused/);
 const stopped=await stage.getAttribute('data-position');await settle(page);
 expect(await stage.getAttribute('data-position')).toBe(stopped);
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
});

for(const name of ['Rise while flying','Flap forward','Glide']){
 test('returning recovers the disabled '+name+' control',async({page})=>{
  await mount(page);await startFlight(page);
  const control=page.getByRole('button',{name,exact:true}),stage=page.locator('.bf-stage');
  await control.focus();await leave(page);await expect(control).toBeDisabled();
  await returnToPage(page);await expect(stage).toBeFocused();
  await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
 });
}

test('duplicate blur and visibility events wait until the document is visible and focused',async({page})=>{
 await mount(page);await startFlight(page);
 const pad=page.getByRole('button',{name:'Flight pad',exact:true}),stage=page.locator('.bf-stage');
 await pad.focus();await leave(page);await expect(pad).toBeDisabled();
 await page.evaluate(()=>{(window as any).__hidden=true;document.dispatchEvent(new Event('visibilitychange'));});
 await returnToPage(page);await settle(page);await expect(stage).not.toBeFocused();
 await page.evaluate(()=>{const w=window as any;w.__foreground=false;w.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await settle(page);await expect(stage).not.toBeFocused();
 await returnToPage(page);await expect(stage).toBeFocused();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
});

test('a rapid return before React finishes pausing still recovers focus',async({page})=>{
 await mount(page);await startFlight(page);await page.getByRole('button',{name:'Flight pad',exact:true}).focus();
 await page.evaluate(()=>{const w=window as any;w.__foreground=false;window.dispatchEvent(new Event('blur'));w.__foreground=true;window.dispatchEvent(new Event('focus'));});
 await expect(page.locator('.bf-stage')).toBeFocused();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-motion-paused','true');
});

test('automatic pause preserves existing notebook focus and backward selection',async({page})=>{
 await mount(page);await startFlight(page);const field=page.locator('#bf-notebook-reasoning');
 await field.focus();await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(3,18,'backward'));
 const notes=await field.inputValue();await leave(page);await returnToPage(page);await settle(page);
 await expect(field).toBeFocused();await expect(field).toHaveValue(notes);
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,18,'backward']);
});

test('a returning learner can choose the notebook before deferred recovery',async({page})=>{
 await mount(page);await startFlight(page);const pad=page.getByRole('button',{name:'Flight pad',exact:true}),field=page.locator('#bf-notebook-reasoning');
 await pad.focus();await leave(page);await expect(pad).toBeDisabled();
 await page.evaluate(()=>{
  (window as any).__foreground=true;window.dispatchEvent(new Event('focus'));
  const field=document.getElementById('bf-notebook-reasoning') as HTMLTextAreaElement;
  field.focus();field.setSelectionRange(2,12,'backward');
 });
 await settle(page);await expect(field).toBeFocused();
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([2,12,'backward']);
});

test('choosing another control while recovery is pending cancels it',async({page})=>{
 await mount(page);await startFlight(page);const pad=page.getByRole('button',{name:'Flight pad',exact:true});
 await pad.focus();await leave(page);await expect(pad).toBeDisabled();
 const volume=page.getByRole('slider',{name:'Meadow volume',exact:true});await volume.focus();
 await returnToPage(page);await settle(page);await expect(volume).toBeFocused();
 const before=Number(await volume.inputValue());await page.keyboard.press('ArrowRight');
 await expect(volume).toHaveValue(String(before+1));await expect(volume).toBeFocused();
});

test('a pointer return takes priority even when it selects non-focusable text',async({page})=>{
 await mount(page);await startFlight(page);const pad=page.getByRole('button',{name:'Flight pad',exact:true});
 await pad.focus();await leave(page);await expect(pad).toBeDisabled();
 await page.evaluate(()=>{
  (window as any).__foreground=true;window.dispatchEvent(new Event('focus'));
  const caption=document.getElementById('bf-scene-caption')!;
  caption.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  const range=document.createRange();range.selectNodeContents(caption);
  const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);
 });
 const selected=await page.evaluate(()=>window.getSelection()!.toString());
 await settle(page);await expect(page.locator('.bf-stage')).not.toBeFocused();
 expect(await page.evaluate(()=>window.getSelection()!.toString())).toBe(selected);expect(selected).toContain('All motion paused');
});

test('unmount cancels pending recovery without disturbing the next tool',async({page})=>{
 await mount(page);await startFlight(page);const pad=page.getByRole('button',{name:'Flight pad',exact:true});
 await pad.focus();await leave(page);await expect(pad).toBeDisabled();
 await page.evaluate(()=>{
  const w=window as any;w.__foreground=true;window.dispatchEvent(new Event('focus'));w.__destroy();
  const next=document.createElement('textarea');next.id='next-tool';next.value='Continue another investigation';document.body.appendChild(next);next.focus();next.setSelectionRange(2,10,'backward');
  window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));
 });
 await settle(page);const next=page.locator('#next-tool');await expect(next).toBeFocused();
 expect(await next.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([2,10,'backward']);
 await expect(page.locator('.bf-stage')).toHaveCount(0);
});

test('renderer interruption recovers the focused Glide button and leaves all motion paused',async({page})=>{
 test.setTimeout(180000);await mount(page,false);await startFlight(page);
 const glide=page.getByRole('button',{name:'Glide',exact:true}),stage=page.locator('.bf-stage');
 await glide.focus();await page.locator('.bf-gl').dispatchEvent('webglcontextlost',{cancelable:true});
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(glide).toBeDisabled();
 await expect(stage).toBeFocused();await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await expect(page.locator('.bf-status')).toContainText('The 3D view was interrupted.');
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
});

test('a second departure cancels a queued return until the learner actually returns',async({page})=>{
 await mount(page);await startFlight(page);const pad=page.getByRole('button',{name:'Flight pad',exact:true}),stage=page.locator('.bf-stage');
 await pad.focus();await page.evaluate(()=>{const w=window as any;w.__foreground=false;window.dispatchEvent(new Event('blur'));w.__foreground=true;window.dispatchEvent(new Event('focus'));w.__foreground=false;window.dispatchEvent(new Event('blur'));});
 await expect(pad).toBeDisabled();await settle(page);await expect(stage).not.toBeFocused();
 await returnToPage(page);await expect(stage).toBeFocused();await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
});

test('a renderer interruption while away defers recovery until the page returns',async({page})=>{
 test.setTimeout(180000);await mount(page,false);await startFlight(page);
 const glide=page.getByRole('button',{name:'Glide',exact:true}),stage=page.locator('.bf-stage');await glide.focus();
 await page.evaluate(()=>{
  const w=window as any;w.__foreground=false;w.__hidden=true;window.dispatchEvent(new Event('blur'));
  document.querySelector('.bf-gl')!.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
 });
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(glide).toBeDisabled();await expect(stage).not.toBeFocused();
 await page.evaluate(()=>{(window as any).__hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await settle(page);await expect(stage).not.toBeFocused();
 await returnToPage(page);await expect(stage).toBeFocused();await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
});

test('background renderer recovery also handles a removed pollinator control',async({page})=>{
 test.setTimeout(180000);await mount(page,false);await page.getByRole('button',{name:'Watch pollinators',exact:true}).click();
 const watcher=page.getByRole('group',{name:'Pollinator watching',exact:true}),stage=page.locator('.bf-stage');
 const control=watcher.getByRole('button').first();await control.focus();
 await page.evaluate(()=>{
  const w=window as any;w.__foreground=false;w.__hidden=true;window.dispatchEvent(new Event('blur'));
  document.querySelector('.bf-gl')!.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
 });
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(watcher).toHaveCount(0);await expect(stage).not.toBeFocused();
 await page.evaluate(()=>{const w=window as any;w.__hidden=false;w.__foreground=true;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
 await expect(stage).toBeFocused();await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
});
