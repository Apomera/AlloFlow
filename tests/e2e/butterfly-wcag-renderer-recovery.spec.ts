import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:180000,retries:0});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,map=true){
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');
 await page.evaluate(map=>{
  const w=window as any;if(map)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated view'));
  w.__mount({butterfly:{observations:['milkweed'],notebook:{reasoning:'Compare the milkweed patch with the mown lawn.'}}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },map);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',map?'map':'three',{timeout:90000});
}
async function pendingRetry(page:Page){
 await page.evaluate(()=>{(window as any).StemLab.ensureThree=()=>new Promise((_,reject)=>(window as any).__rejectRetry=reject);});
 const retry=page.getByRole('button',{name:'Retry 3D',exact:true});await retry.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','loading');await expect(retry).toHaveCount(0);
}
async function failRetry(page:Page){
 await page.evaluate(()=>(window as any).__rejectRetry(new Error('Test retry unavailable')));
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}

test('a keyboard retry keeps a named focus target while loading and after failure',async({page})=>{
 await mount(page);await pendingRetry(page);
 const scene=page.getByRole('region',{name:/^Butterfly flight area/});await expect(scene).toBeFocused();await expect(scene).toBeInViewport();
 await failRetry(page);await expect(scene).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
});

test('finishing a retry does not pull focus back after the learner continues to another control',async({page})=>{
 await mount(page);await pendingRetry(page);
 await page.keyboard.press('Tab');const next=page.getByRole('button',{name:'Take flight',exact:true});await expect(next).toBeFocused();
 await failRetry(page);await expect(next).toBeFocused();
});

test('Explore guide navigation focuses the named scene and continues into its relevant controls',async({page})=>{
 await mount(page);const explore=page.locator('[data-bf-step="explore"]');
 await explore.focus();await page.keyboard.press('Enter');
 const scene=page.getByRole('region',{name:/^Butterfly flight area/});await expect(scene).toBeFocused();await expect(scene).toBeInViewport();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await explore.focus();await page.keyboard.press('Enter');await expect(scene).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Flowers',exact:true})).toBeFocused();
});

test('context loss recovers focus from disappearing 3D pollinator controls',async({page})=>{
 await mount(page,false);await page.getByRole('button',{name:'Watch pollinators',exact:true}).click();
 const watcher=page.getByRole('group',{name:'Pollinator watching',exact:true});await expect(watcher).toBeVisible();
 await watcher.getByRole('button').first().focus();
 await page.locator('.bf-gl').dispatchEvent('webglcontextlost',{cancelable:true});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');await expect(watcher).toHaveCount(0);
 await expect(page.getByRole('region',{name:/^Butterfly flight area/})).toBeFocused();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-motion-paused','true');
 await expect(page.locator('.bf-status')).toContainText('The 3D view was interrupted.');
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Take flight',exact:true})).toBeFocused();
});

test('context loss preserves focus and selection when the learner is writing notes',async({page})=>{
 await mount(page,false);const field=page.locator('#bf-notebook-reasoning');await field.focus();
 await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(3,18,'backward'));
 const before=(await field.boundingBox())!;
 await page.locator('.bf-gl').dispatchEvent('webglcontextlost',{cancelable:true});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');await expect(field).toBeFocused();
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,18,'backward']);
 // The fallback adds a Retry row above the notebook. Browser scroll anchoring
 // may change scrollY to keep the writing surface in the same visible place.
 await expect(field).toBeInViewport();expect(Math.abs((await field.boundingBox())!.y-before.y)).toBeLessThanOrEqual(1);
});
