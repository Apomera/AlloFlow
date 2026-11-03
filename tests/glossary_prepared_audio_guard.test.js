import {beforeAll,afterAll,it,expect} from 'vitest';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const moduleSource=readFileSync(resolve(process.env.CLASSROOM_CONTINUITY_CANDIDATES||'.','word_practice_module.js'),'utf8');
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

const clip='data:audio/wav;base64,UklGRgQAAABXQVZF';
async function prepare(page,change=true){await page.evaluate(({clip,change})=>{window.AlloWordPracticeMedia.prepareAudio=async pack=>({...pack,items:pack.items.map((item,i)=>i||!change?item:{...item,wordAudio:clip,wordAudioProvenance:{language:'English',source:'recorded_bank'}})});},{clip,change});await button(page,'Prepare audio').click();await page.getByText(/Audio ready for/).waitFor();}
it('protects audio-only changes on close, including cancelled download confirmation',async()=>{
 const {context,page,errors}=await launch(true);try{expect(await dirty(page)).toBe(false);await prepare(page);expect(await dirty(page)).toBe(true);await button(page,'Close').click();await button(page,'Cancel').click();
 await download(page);await button(page,'Keep editing').click();expect(await dirty(page)).toBe(true);const file=await download(page);const raw=JSON.parse(readFileSync(await file.path(),'utf8'));expect(raw.items.some(i=>i.wordAudio===clip)).toBe(true);await button(page,'I saved the file').click();expect(await dirty(page)).toBe(false);expect(errors).toEqual([]);
 }finally{await context.close();}
});
it('does not mark a no-op or completely failed audio preparation dirty',async()=>{
 const {context,page,errors}=await launch(true);try{await prepare(page,false);expect(await dirty(page)).toBe(false);await button(page,'Close').click();await page.locator('.awp-overlay').waitFor({state:'detached'});expect(errors).toEqual([]);}finally{await context.close();}
});
it('does not call an audio-excluding download a backup of newly prepared recordings',async()=>{
 const {context,page,errors}=await launch(true);try{await prepare(page);await page.getByRole('checkbox',{name:'Include prepared audio',exact:true}).uncheck();await button(page,'Save word set').click();await page.getByText(/Turn on Include prepared audio to save your new recordings/).waitFor();expect(await dirty(page)).toBe(true);expect(await page.getByRole('dialog',{name:'Download started',exact:true}).count()).toBe(0);expect(errors).toEqual([]);}finally{await context.close();}
});
it('guards opening another set and resets audio protection only after an explicit discard',async()=>{
 const {context,page,errors}=await launch(true);try{await prepare(page);const choose=async()=>{const chooser=page.waitForEvent('filechooser');await button(page,'Open word set').click();await(await chooser).setFiles({name:'river.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({title:'River words',words:['River']}))});};
 await choose();await button(page,'Cancel').click();expect(await dirty(page)).toBe(true);await choose();await button(page,'Open without saving').click();await page.getByText('Word set opened.',{exact:true}).waitFor();expect(await dirty(page)).toBe(false);expect(await page.getByRole('textbox',{name:'Practice title',exact:true}).inputValue()).toBe('River words');expect(errors).toEqual([]);}finally{await context.close();}
});
