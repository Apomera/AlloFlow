import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
const failed=(what:string)=>'Could not read '+what+' aloud. Try Listen again, or read the text on the page.';
async function mount(page:Page,host=true){
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');
 await page.evaluate(host=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated view'));
  w.__speechRequests=[];w.__nativeRequests=[];w.__speechErrors=[];
  window.addEventListener('unhandledrejection',event=>w.__speechErrors.push(String(event.reason)));
  w.speechSynthesis.cancel=()=>{const previous=w.__nativeRequests.at(-1);if(previous?.onerror)previous.onerror({error:'canceled'});};
  w.speechSynthesis.speak=(utterance:any)=>{if(w.__nativeThrow)throw new Error('Speech unavailable');w.__nativeRequests.push(utterance);};
  w.__mount({butterfly:{}});
  if(host)w.__ctx.callTTS=(...args:any[])=>new Promise((resolve,reject)=>w.__speechRequests.push({args,resolve,reject}));
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },host);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function listen(page:Page,what='your mission'){
 const button=page.getByRole('button',{name:'Listen · '+what,exact:true});await button.focus();await page.keyboard.press('Enter');return button;
}
async function checkFailure(page:Page,button:any,what:string){
 const message=failed(what);await expect(page.locator('.bf-status')).toHaveText(message,{timeout:2500});await expect(button).toBeFocused();
 await expect(button).toHaveAccessibleName('Listen · '+what);await expect(button).toHaveAccessibleDescription(message);
 const local=button.locator('..').locator('.bf-listen-feedback');await expect(local).toHaveText(message);await expect(local).toBeVisible();
 expect(await local.evaluate((node:HTMLElement)=>!!node.closest('[aria-live="polite"],[aria-live="assertive"],[role="status"],[role="alert"]'))).toBe(false);
}
for(const outcome of ['null','rejection','exception']){
 test('host '+outcome+' failure explains recovery beside Listen, retains focus, and permits retry',async({page})=>{
  await mount(page);if(outcome==='exception')await page.evaluate(()=>{(window as any).__ctx.callTTS=()=>{throw new Error('Speech unavailable');};});
  const button=await listen(page);
  if(outcome!=='exception')await page.evaluate(outcome=>{const request=(window as any).__speechRequests[0];if(outcome==='rejection')request.reject(new Error('Speech unavailable'));else request.resolve(null);},outcome);
  await checkFailure(page,button,'your mission');
  await page.evaluate(()=>{(window as any).__ctx.callTTS=()=>Promise.resolve('blob:available-speech');});await page.keyboard.press('Enter');
  await expect(button).toBeFocused();await expect(button).toHaveAccessibleDescription('');await expect(page.locator('.bf-listen-feedback')).toHaveCount(0);
  await expect(page.locator('.bf-status')).not.toHaveText(failed('your mission'));
  await page.keyboard.press('Tab');await expect(page.locator('[data-bf-step="explore"]')).toBeFocused();
  expect(await page.evaluate(()=>(window as any).__speechErrors)).toEqual([]);
 });
}

test('a delayed failure cannot replace a newer Listen request or announce after the tool closes',async({page})=>{
 await mount(page);await listen(page);const park=await listen(page,'Park meadow');
 await page.evaluate(async()=>{(window as any).__speechRequests[0].reject(new Error('Older request'));await new Promise(resolve=>setTimeout(resolve,0));});
 await expect(park).toBeFocused();await expect(page.locator('.bf-listen-feedback')).toHaveCount(0);await expect(page.locator('.bf-status')).not.toContainText('Could not read');
 await page.evaluate(()=>(window as any).__speechRequests[1].resolve(null));await checkFailure(page,park,'Park meadow');
 await page.keyboard.press('Enter');await page.evaluate(async()=>{
  const w=window as any;w.__destroy();const field=document.createElement('textarea');field.id='another-tool';field.value='Other tool notes';document.body.appendChild(field);field.focus();field.setSelectionRange(2,9,'backward');
  w.__speechRequests[2].reject(new Error('Tool already closed'));await new Promise(resolve=>setTimeout(resolve,0));
 });
 await expect(page.locator('#another-tool')).toBeFocused();expect(await page.locator('#another-tool').evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([2,9,'backward']);
 expect(await page.evaluate(()=>(window as any).__speechErrors)).toEqual([]);await expect(page.locator('.bfl')).toHaveCount(0);
});

test('native speech errors are explained while replacement and cancellation stay quiet',async({page})=>{
 await mount(page,false);await listen(page);const park=await listen(page,'Park meadow');
 await expect(page.locator('.bf-listen-feedback')).toHaveCount(0);
 await page.evaluate(()=>{const requests=(window as any).__nativeRequests;requests[0].onerror?.({error:'synthesis-failed'});requests[1].onerror?.({error:'interrupted'});});
 await expect(park).toBeFocused();await expect(page.locator('.bf-status')).not.toContainText('Could not read');
 await page.evaluate(()=>(window as any).__nativeRequests[1].onerror?.({error:'voice-unavailable'}));await checkFailure(page,park,'Park meadow');
 await page.keyboard.press('Enter');await expect(park).toBeFocused();await expect(page.locator('.bf-listen-feedback')).toHaveCount(0);await expect(park).toHaveAccessibleDescription('');
 await page.evaluate(()=>(window as any).__nativeRequests[2].onerror?.({error:'canceled'}));await expect(page.locator('.bf-status')).not.toContainText('Could not read');
 expect(await page.evaluate(()=>(window as any).__nativeRequests.map((u:any)=>u.text))).toEqual(expect.arrayContaining([expect.stringContaining('Your mission: plan the restoration plot'),expect.stringContaining('Park meadow.')]));
});

test('a synchronous browser voice failure remains recoverable by keyboard',async({page})=>{
 await mount(page,false);await page.evaluate(()=>(window as any).__nativeThrow=true);const button=await listen(page);await checkFailure(page,button,'your mission');
 await page.evaluate(()=>(window as any).__nativeThrow=false);await page.keyboard.press('Enter');await expect(button).toBeFocused();await expect(page.locator('.bf-listen-feedback')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__nativeRequests.length)).toBe(1);
});

test('a legacy host with no return value does not produce a false speech failure',async({page})=>{
 await mount(page);await page.evaluate(()=>{const w=window as any;w.__legacySpeech=[];w.__ctx.callTTS=(text:string)=>{w.__legacySpeech.push(text);};});
 const button=await listen(page);await expect(button).toBeFocused();await expect(page.locator('.bf-listen-feedback')).toHaveCount(0);await expect(page.locator('.bf-status')).not.toContainText('Could not read');
 expect(await page.evaluate(()=>(window as any).__legacySpeech[0])).toContain('Your mission: plan the restoration plot');
});

test('localized failure feedback wraps on a narrow screen without changing the Listen name',async({page})=>{
 await page.setViewportSize({width:320,height:900});await mount(page);await page.evaluate(()=>{
  const w=window as any;const translations:Record<string,string>={'stem.butterfly.ui_listen':'Escuchar','stem.butterfly.top_listen_mission':'tu misión','stem.butterfly.ui_listen_failed':'No se pudo leer {value1} en voz alta. Vuelve a pulsar Escuchar o lee el texto en la página.'};
  w.__ctx.t=(key:string,fallback:string)=>translations[key]||fallback;w.__ctx.callTTS=()=>Promise.resolve(null);w.__rerender();
 });
 const button=page.getByRole('button',{name:'Escuchar · tu misión',exact:true});await button.focus();await page.keyboard.press('Enter');
 const message='No se pudo leer tu misión en voz alta. Vuelve a pulsar Escuchar o lee el texto en la página.';
 await expect(button).toHaveAccessibleDescription(message,{timeout:2500});await expect(button).toBeFocused();await expect(page.locator('.bf-listen-feedback')).toHaveText(message);
 await page.addStyleTag({content:'.bfl * { line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important; } .bfl p { margin-bottom:2em !important; }'});
 const box=await page.locator('.bf-listen-feedback').boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(321);
 expect(await page.locator('.bf-listen-feedback').evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
 await page.locator('.bf-listen-feedback').locator('..').screenshot({path:'scratch/butterfly-listen-failure-mobile.png'});
 const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run(document.querySelector('.bfl'),{runOnly:{type:'rule',values:['aria-valid-attr','aria-valid-attr-value','button-name','label-content-name-mismatch','color-contrast']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});expect(violations).toEqual([]);
});


test('latest-message retry reads its original content and newer meadow messages remain available',async({page})=>{
 await mount(page);const original=await page.locator('.bf-status').innerText();const button=await listen(page,'latest message');
 await page.evaluate(()=>(window as any).__speechRequests[0].resolve(null));await checkFailure(page,button,'latest message');
 await page.keyboard.press('Enter');expect(await page.evaluate(()=>(window as any).__speechRequests[1].args[0])).toBe(original);await expect(page.locator('.bf-status')).toHaveText(original);
 await page.evaluate(()=>(window as any).__speechRequests[1].resolve(null));await checkFailure(page,button,'latest message');
 await page.getByRole('button',{name:'Map directions',exact:true}).click();const updated=await page.locator('.bf-status').innerText();expect(updated).toContain('Map directions:');
 await button.focus();await page.keyboard.press('Enter');expect(await page.evaluate(()=>(window as any).__speechRequests[2].args[0])).toBe(updated);
 await expect(page.locator('.bf-status')).toHaveText(updated);await page.evaluate(()=>(window as any).__speechRequests[2].resolve('blob:available-speech'));await expect(button).toBeFocused();await expect(page.locator('.bf-listen-feedback')).toHaveCount(0);
});

test('a delayed speech error leaves notebook focus and backward text selection untouched',async({page})=>{
 await mount(page);await listen(page);const field=page.locator('#bf-notebook-reasoning');await field.fill('Compare two different plantings.');
 await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(3,19,'backward'));
 await page.evaluate(()=>(window as any).__speechRequests[0].resolve(null));await expect(page.locator('.bf-status')).toHaveText(failed('your mission'));
 await expect(field).toBeFocused();expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,19,'backward']);
 await expect(field).toHaveValue('Compare two different plantings.');
});
