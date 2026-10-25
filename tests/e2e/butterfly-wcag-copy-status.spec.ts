import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,native=false){
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');
 await page.evaluate(native=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__reportRequests=[];w.__legacyCalls=0;
  const deferred=(text:string)=>new Promise<boolean>((resolve,reject)=>w.__reportRequests.push({text,resolve,reject}));
  w.alloCopyText=native?undefined:deferred;
  if(native)Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:deferred}});
  document.execCommand=()=>{w.__legacyCalls++;return true;};
  w.__mount({butterfly:{observations:['milkweed'],notebook:{reasoning:'Original explanation about the meadow.'}}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },native);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function start(page:Page){
 const command=page.locator('.bf-report-actions button');await command.focus();await page.keyboard.press('Enter');
 await expect.poll(()=>page.evaluate(()=>(window as any).__reportRequests.length)).toBe(1);return command;
}
async function finish(page:Page,result:boolean,index=0){await page.evaluate(({result,index})=>(window as any).__reportRequests[index].resolve(result),{result,index});}

test('a pending copy keeps a named focus target, reports busy state, and rejects repeated activation',async({page})=>{
 await mount(page);const command=await start(page),report=page.locator('.bf-report');
 await expect(command).toHaveAttribute('aria-busy','true',{timeout:2500});await expect(command).toHaveAttribute('aria-disabled','true');await expect(command).toBeFocused();
 await expect(command).toHaveAccessibleName('Copying field report…');
 await expect(page.locator('.bf-status')).toHaveText('Copying your field report. You can keep working.');
 await expect(report.locator('#bf-report-copy-feedback')).toHaveText('Copying your field report. You can keep working.');
 await page.keyboard.press('Enter');await page.keyboard.press('Space');await command.click({force:true});
 expect(await page.evaluate(()=>(window as any).__reportRequests.length)).toBe(1);
 await page.keyboard.press('Tab');await expect(report.locator('pre')).toBeFocused();
 await finish(page,true);await expect(report).toHaveAttribute('data-bf-report-copied','ok');
 await expect(command).toHaveAttribute('aria-busy','false');await expect(command).toBeEnabled();await expect(report.locator('pre')).toBeFocused();
});

test('a slow copy identifies an older snapshot after the learner changes notes and can copy the latest version next',async({page})=>{
 await mount(page);const command=await start(page),field=page.locator('#bf-notebook-reasoning');
 await field.fill('Revised explanation: compare milkweed with the mown lawn.');
 await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(4,20,'backward'));
 await finish(page,true);
 await expect(page.locator('.bf-report')).toHaveAttribute('data-bf-report-copied','changed',{timeout:2500});
 const message='An earlier version of your report was copied. Your latest changes are not included.';
 await expect(page.locator('.bf-status')).toHaveText(message);await expect(page.locator('#bf-report-copy-feedback')).toHaveText(message);
 await expect(command).toHaveAccessibleName('Copy my field report');await expect(command).toBeEnabled();await expect(field).toBeFocused();
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([4,20,'backward']);
 const original=await page.evaluate(()=>(window as any).__reportRequests[0].text);
 expect(original).toContain('Original explanation about the meadow.');expect(original).not.toContain('Revised explanation:');
 await expect(page.locator('.bf-report pre')).toContainText('Revised explanation:');
 await command.evaluate((node:HTMLButtonElement)=>node.click());
 await expect.poll(()=>page.evaluate(()=>(window as any).__reportRequests.length)).toBe(2);
 expect(await page.evaluate(()=>(window as any).__reportRequests[1].text)).toContain('Revised explanation:');
 await finish(page,true,1);await expect(page.locator('.bf-report')).toHaveAttribute('data-bf-report-copied','ok');await expect(field).toBeFocused();
});

test('a delayed failure offers manual copying without moving a learner who continued writing',async({page})=>{
 await mount(page);const command=await start(page),field=page.locator('#bf-notebook-question');await field.fill('Would mowing later help?');
 await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(2,10,'backward'));await finish(page,false);
 await expect(page.locator('.bf-report')).toHaveAttribute('data-bf-report-copied','fail');await expect(field).toBeFocused();
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([2,10,'backward']);
 await expect(command).toHaveAttribute('aria-busy','false',{timeout:2500});await expect(command).toBeEnabled();
 const manual=page.getByRole('textbox',{name:'Field report text to copy manually',exact:true});await expect(manual).toBeVisible();await expect(manual).toHaveValue(/Would mowing later help\?/);
 await command.focus();await page.keyboard.press('Tab');await expect(page.locator('.bf-report pre')).toBeFocused();await page.keyboard.press('Tab');await expect(manual).toBeFocused();
});

test('leaving the tool cancels a delayed legacy fallback and preserves another field’s selection',async({page})=>{
 await mount(page,true);await start(page);
 await page.evaluate(async()=>{
  const w=window as any;w.__destroy();
  const outside=document.createElement('textarea');outside.id='outside-report-note';outside.value='Continue working in a different tool.';document.body.appendChild(outside);outside.focus();outside.setSelectionRange(3,16,'backward');
  w.__reportRequests[0].reject(new Error('Deferred clipboard permission rejection'));
  await new Promise(resolve=>setTimeout(resolve,0));
 });
 expect(await page.evaluate(()=>(window as any).__legacyCalls)).toBe(0);
 await expect(page.locator('#outside-report-note')).toBeFocused();
 expect(await page.locator('#outside-report-note').evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,16,'backward']);
 await expect(page.locator('.bfl')).toHaveCount(0);
});

test('manual copying distinguishes selected text, no selection, and the complete report',async({page})=>{
 await mount(page);await start(page);await finish(page,false);
 const report=page.locator('.bf-report'),manual=page.getByRole('textbox',{name:'Field report text to copy manually',exact:true});
 await manual.focus();await manual.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(12,44,'backward'));await page.keyboard.press('Control+c');
 await expect(report).toHaveAttribute('data-bf-report-copied','partial',{timeout:2500});
 await expect(page.locator('.bf-status')).toHaveText('Selected report text copied. Select all of the report to copy it completely.');
 await expect(manual).toBeFocused();expect(await manual.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([12,44,'backward']);
 await manual.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(0,0));
 expect(await manual.evaluate(node=>!node.dispatchEvent(new ClipboardEvent('copy',{bubbles:true,cancelable:true})))).toBe(true);
 await expect(report).toHaveAttribute('data-bf-report-copied','select');await expect(page.locator('.bf-status')).toHaveText('Select the report text you want to copy.');
 await page.keyboard.press('Control+a');await page.keyboard.press('Control+c');
 await expect(report).toHaveAttribute('data-bf-report-copied','ok');await expect(report.getByRole('button',{name:'✓ Report copied',exact:true})).toBeEnabled();await expect(manual).toBeFocused();
});

test('restored Windows line endings do not create a false older-version warning for a complete manual copy',async({page})=>{
 await mount(page);
 await page.evaluate(()=>{
  const w=window as any;w.__destroy();w.__mount({butterfly:{observations:['milkweed'],notebook:{reasoning:'First line\r\nSecond line\r\nThird line'}}});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
 await start(page);await finish(page,false);
 const manual=page.getByRole('textbox',{name:'Field report text to copy manually',exact:true});await manual.focus();
 expect(await manual.inputValue()).toContain('First line\nSecond line\nThird line');
 await page.keyboard.press('Control+c');
 await expect(page.locator('.bf-report')).toHaveAttribute('data-bf-report-copied','ok',{timeout:2500});
 await expect(page.locator('.bf-status')).toHaveText('Field report copied. Paste it wherever you keep your notes.');await expect(manual).toBeFocused();
});
