import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:180000,retries:0});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page){
 await page.goto(harness.url+'/__harness');
await page.evaluate(()=>{
  const w=window as any;w.__mount({butterfly:{notebook:{reasoning:'Compare the milkweed patch with the mown lawn.'}}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','three',{timeout:90000});
 await page.evaluate(()=>{
  const w=window as any;w.__rendererFocusEvents=[];
  document.addEventListener('focusin',event=>{
   const scene=event.target as HTMLElement;if(!scene.matches('.bf-stage'))return;
   w.__rendererFocusEvents.push({renderer:scene.dataset.bfRenderer,name:scene.getAttribute('aria-label'),description:document.getElementById(scene.getAttribute('aria-describedby')!)!.textContent});
  });
 });
}
async function watchPollinators(page:Page){
 await expect(page.getByRole('button',{name:'Watch pollinators',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Watch pollinators',exact:true}).click();
 const watcher=page.getByRole('group',{name:'Pollinator watching',exact:true});await expect(watcher).toBeVisible();await watcher.getByRole('button').first().focus();
 await expect(watcher.getByRole('button').first()).toBeFocused();await page.evaluate(()=>(window as any).__rendererFocusEvents=[]);
}
async function expectCommittedMapFocus(page:Page){
 const scene=page.locator('.bf-stage');await expect(scene).toHaveAttribute('data-bf-renderer','map');await expect(scene).toBeFocused();
 await expect(scene).toHaveAccessibleName(/^Butterfly flight area/);await expect(scene).toHaveAccessibleDescription(/All motion paused/);
 const current=await scene.evaluate(node=>({renderer:(node as HTMLElement).dataset.bfRenderer,name:node.getAttribute('aria-label'),description:document.getElementById(node.getAttribute('aria-describedby')!)!.textContent}));
 expect(await page.evaluate(()=>(window as any).__rendererFocusEvents)).toEqual([current]);
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
}

test('a 3D interruption exposes the paused map context before recovering pollinator-control focus',async({page})=>{
 await mount(page);await watchPollinators(page);await loseNativeContext(page);
 await expectCommittedMapFocus(page);await expect(page.getByRole('group',{name:'Pollinator watching',exact:true})).toHaveCount(0);
});

async function loseNativeContext(page:Page){
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>{
  const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');if(!gl)throw new Error('No WebGL context');
  const extension=gl.getExtension('WEBGL_lose_context');if(!extension)throw new Error('Context loss extension unavailable');extension.loseContext();
 });
}
async function simulateForeground(page:Page){
 // Keep these browser lifecycle races deterministic without touching the desktop.
 await page.evaluate(()=>{const w=window as any;w.__foreground=true;w.__hidden=false;
  Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>w.__foreground});
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>w.__hidden});
 });
}

test('native context loss recovers a camera button only after the map description commits',async({page})=>{
 await mount(page);await watchPollinators(page);const camera=page.getByRole('button',{name:'Watch pollinators',exact:true});
 await camera.focus();await expect(camera).toBeFocused();await loseNativeContext(page);
 await expectCommittedMapFocus(page);await expect(camera).toBeDisabled();
});

test('a rapid page return waits for the map commit before recovering a removed control',async({page})=>{
 await mount(page);await watchPollinators(page);await simulateForeground(page);
 const duringReturn=await page.evaluate(()=>{
  const w=window as any;w.__foreground=false;w.__hidden=true;window.dispatchEvent(new Event('blur'));
  // A transition allows the map commit to lag the browser's return events.
  w.React.startTransition(()=>document.querySelector('.bf-gl')!.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  w.__hidden=false;w.__foreground=true;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));
  const scene=document.querySelector('.bf-stage')!;return {renderer:scene.getAttribute('data-bf-renderer'),focused:document.activeElement===scene};
 });
 expect(duringReturn).toEqual({renderer:'three',focused:false});await expectCommittedMapFocus(page);
});

test('a pending disabled-flight-control recovery also waits for the renderer change',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();const glide=page.getByRole('button',{name:'Glide',exact:true});
 await glide.focus();await expect(glide).toBeFocused();await simulateForeground(page);
 await page.evaluate(()=>{(window as any).__foreground=false;window.dispatchEvent(new Event('blur'));});
 await expect(glide).toBeDisabled();await expect(page.locator('.bf-stage')).not.toBeFocused();
 const duringReturn=await page.evaluate(()=>{
  const w=window as any;w.__rendererFocusEvents=[];
  w.React.startTransition(()=>document.querySelector('.bf-gl')!.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  w.__foreground=true;window.dispatchEvent(new Event('focus'));
  const scene=document.querySelector('.bf-stage')!;return {renderer:scene.getAttribute('data-bf-renderer'),focused:document.activeElement===scene};
 });
 expect(duringReturn).toEqual({renderer:'three',focused:false});await expectCommittedMapFocus(page);
});

test('choosing notes during renderer recovery cancels focus movement and preserves selection',async({page})=>{
 await mount(page);await watchPollinators(page);
 await page.locator('.bf-gl').evaluate(canvas=>{
  canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
  const field=document.getElementById('bf-notebook-reasoning') as HTMLTextAreaElement;field.focus();field.setSelectionRange(3,18,'backward');
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');const field=page.locator('#bf-notebook-reasoning');await expect(field).toBeFocused();
 await page.waitForTimeout(100);expect(await page.evaluate(()=>(window as any).__rendererFocusEvents)).toEqual([]);
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,18,'backward']);
 const before=await field.inputValue();await page.keyboard.insertText('the meadow');await expect(field).toHaveValue(before.slice(0,3)+'the meadow'+before.slice(18));
 await expect(page.locator('.bf-status')).toContainText('The 3D view was interrupted.');
});
