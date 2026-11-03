import {beforeAll,afterAll,it,expect} from 'vitest';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const moduleSource=readFileSync(resolve(process.env.CLASSROOM_PRESERVE_CANDIDATES||'.','word_practice_module.js'),'utf8');
let browser;
beforeAll(async()=>{browser=await chromium.launch({headless:true});},90000);
afterAll(async()=>{await browser?.close();},90000);
const button=(p,name)=>p.getByRole('button',{name,exact:true});
const dirty=p=>p.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
async function launch(setup=false){
 const context=await browser.newContext({offline:true,viewport:{width:1000,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await page.setContent('<main></main>');await page.addScriptTag({content:moduleSource});
 if(setup)await page.evaluate(()=>window.AlloModules.WordPractice.open({title:'Cloud words',words:['Cloud','Rain']}));
 else{const html=await page.evaluate(()=>window.AlloModules.WordPractice.buildHtml({title:'Cloud words',words:['Cloud','Rain'],options:{shuffle:false}},{shuffle:false}));await page.setContent(html);await page.locator('.awp-card').waitFor();}
 return {context,page,errors};
}
async function download(page,name='Save word set'){
 const pending=page.waitForEvent('download');await button(page,name).click();const file=await pending;await file.path();
 await page.getByRole('dialog',{name:'Download started',exact:true}).waitFor();return file;
}
it('does not mark an offline download saved until confirmed, and keeps cancelled saves protected',async()=>{
 const {context,page,errors}=await launch();try{
  await button(page,'Add to review').click();expect(await dirty(page)).toBe(true);
  await download(page);expect(await dirty(page)).toBe(true);await button(page,'Keep editing').click();expect(await dirty(page)).toBe(true);
  await page.getByText('Download not confirmed. Your unsaved changes are still protected.',{exact:true}).waitFor();
  await download(page);await button(page,'I saved the file').click();expect(await dirty(page)).toBe(false);
  await button(page,'Remove from review').click();expect(await dirty(page)).toBe(true);expect(errors).toEqual([]);
 }finally{await context.close();}
});
it('keeps newer changes protected when confirmation refers to an older snapshot',async()=>{
 const {context,page,errors}=await launch();try{
  await button(page,'Add to review').click();await download(page);
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Remove from review').click());
  await button(page,'I saved the file').click();await page.getByText(/More changes were made after this download/).waitFor();
  await button(page,'Add to review').click();expect(await dirty(page)).toBe(true);expect(errors).toEqual([]);
 }finally{await context.close();}
});
it('keeps the original offline set when Save and open is unconfirmed, then opens only after confirmation',async()=>{
 const {context,page,errors}=await launch();try{
  await button(page,'Add to review').click();
  const open=async()=>{const pending=page.waitForEvent('filechooser');await button(page,'Open word set').click();await(await pending).setFiles({name:'new.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({title:'River words',words:['River']}))});await button(page,'Save and open').waitFor();};
  await open();await download(page,'Save and open');expect(await page.locator('.awp-word').textContent()).toContain('Cloud');await button(page,'Keep editing').click();
  expect(await dirty(page)).toBe(true);await open();await download(page,'Save and open');await button(page,'I saved the file').click();
  await page.getByText('Word set opened.',{exact:true}).waitFor();expect(await page.locator('.awp-word').textContent()).toContain('River');expect(await dirty(page)).toBe(false);expect(errors).toEqual([]);
 }finally{await context.close();}
});
it('waits for confirmation before closing app setup and retains cancelled changes',async()=>{
 const {context,page,errors}=await launch(true);try{
  await page.getByRole('textbox',{name:'Practice title',exact:true}).fill('Sky words');
  await button(page,'Close').click();await download(page,'Save and close');expect(await page.locator('.awp-overlay').count()).toBe(1);
  await button(page,'Keep editing').click();expect(await page.getByRole('textbox',{name:'Practice title',exact:true}).inputValue()).toBe('Sky words');
  await button(page,'Close').click();await download(page,'Save and close');await button(page,'I saved the file').click();
  await page.locator('.awp-overlay').waitFor({state:'detached'});expect(errors).toEqual([]);
 }finally{await context.close();}
});
it.each([false,true])('keeps changes after download startup fails; setup=%s',async setup=>{
 const {context,page,errors}=await launch(setup);try{
  if(setup)await page.getByRole('textbox',{name:'Practice title',exact:true}).fill('Changed title');else await button(page,'Add to review').click();
  await page.evaluate(()=>{URL.createObjectURL=()=>{throw Error('Download unavailable');};});await button(page,'Save word set').click();
  await page.getByText(/Download unavailable/).waitFor();expect(await page.getByRole('dialog',{name:'Download started',exact:true}).count()).toBe(0);
  if(setup){await button(page,'Close').click();await button(page,'Close without saving').waitFor();}else expect(await dirty(page)).toBe(true);
  expect(errors).toEqual([]);
 }finally{await context.close();}
});
