import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:60000});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,legacySuccess:boolean,rejectClipboard=false){
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');
 await page.evaluate(({legacySuccess,rejectClipboard})=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));w.alloCopyText=undefined;w.__legacyCopy=[];w.__nativeCopy=0;
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:rejectClipboard?{writeText(){w.__nativeCopy++;return Promise.reject(new Error('Clipboard permission denied'));}}:undefined});
  // Keep the temporary textarea's real select/remove/focus behavior. Only the
  // OS clipboard result is controlled, so focus regressions remain observable.
  document.execCommand=function(command:string){const active=document.activeElement as HTMLTextAreaElement;w.__legacyCopy.push({command,tag:active?.tagName,value:active?.value,selection:[active?.selectionStart,active?.selectionEnd]});return legacySuccess;};
  w.__mount({butterfly:{observations:['milkweed'],notebook:{reasoning:'Compare milkweed with the mown lawn, then explain the evidence.'}}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },{legacySuccess,rejectClipboard});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}

for(const success of [true,false])test('legacy report-copy restores keyboard focus after '+(success?'success':'failure'),async({page})=>{
 await mount(page,success);const report=page.getByRole('region',{name:'Field report',exact:true}),copy=report.locator('.bf-report-actions button');
 await copy.focus();await page.keyboard.press('Enter');
 await expect(report).toHaveAttribute('data-bf-report-copied',success?'ok':'fail');
 const calls=await page.evaluate(()=>(window as any).__legacyCopy);
 expect(calls).toHaveLength(1);expect(calls[0].command).toBe('copy');expect(calls[0].tag).toBe('TEXTAREA');expect(calls[0].value).toContain('Common milkweed');expect(calls[0].selection).toEqual([0,calls[0].value.length]);
 await expect(copy).toBeFocused({timeout:1500});await expect(copy).toBeInViewport();
 await page.keyboard.press('Tab');await expect(report.locator('pre')).toBeFocused();
 await expect(report.getByRole('textbox',{name:'Field report text to copy manually',exact:true})).toHaveCount(success?0:1);
});

test('a rejected Clipboard API falls back to legacy copying and preserves a writing selection',async({page})=>{
 await mount(page,true,true);const field=page.locator('#bf-notebook-reasoning'),report=page.getByRole('region',{name:'Field report',exact:true});
 await field.focus();await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(3,20,'backward'));
 await report.locator('.bf-report-actions button').evaluate((node:HTMLButtonElement)=>node.click());
 await expect(report).toHaveAttribute('data-bf-report-copied','ok');
 expect(await page.evaluate(()=>(window as any).__nativeCopy)).toBe(1);expect(await page.evaluate(()=>(window as any).__legacyCopy.length)).toBe(1);
 await expect(field).toBeFocused();expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,20,'backward']);
 await expect(field).toHaveValue('Compare milkweed with the mown lawn, then explain the evidence.');
});

test('an unsuccessful legacy copy preserves the report text selection for manual copying',async({page})=>{
 await mount(page,false);const report=page.getByRole('region',{name:'Field report',exact:true}),text=report.locator('pre');
 await text.focus();const selected=await text.evaluate(node=>{const selection=window.getSelection()!;selection.setBaseAndExtent(node.firstChild!,40,node.firstChild!,4);return selection.toString();});
 await report.locator('.bf-report-actions button').evaluate((node:HTMLButtonElement)=>node.click());
 await expect(report).toHaveAttribute('data-bf-report-copied','fail');await expect(text).toBeFocused();expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe(selected);expect(await page.evaluate(()=>[window.getSelection()?.anchorOffset,window.getSelection()?.focusOffset])).toEqual([40,4]);
 await expect(report.getByRole('textbox',{name:'Field report text to copy manually',exact:true})).toBeVisible();
});

test('copy recovery respects a different focus target chosen by a copy handler',async({page})=>{
 await mount(page,true);
 const field=page.locator('#bf-notebook-reasoning'),copy=page.locator('.bf-report-actions button');
 await page.evaluate(()=>{
  const original=document.execCommand;
  document.execCommand=function(command:string){
   const result=original.call(document,command),field=document.getElementById('bf-notebook-reasoning') as HTMLTextAreaElement;
   field.focus();field.setSelectionRange(4,17,'backward');return result;
  };
 });
 await copy.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.bf-report')).toHaveAttribute('data-bf-report-copied','ok');
 await expect(field).toBeFocused();await expect(field).toBeInViewport();
 expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([4,17,'backward']);
});
