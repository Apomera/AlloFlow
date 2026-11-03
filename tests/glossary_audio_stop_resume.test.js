import {beforeAll,afterAll,it,expect} from 'vitest';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const moduleSource=readFileSync(resolve(process.env.CLASSROOM_DRAFT_CANDIDATES||'.','word_practice_module.js'),'utf8');
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
async function audioSetup(page){await page.evaluate(clip=>{window.calls=[];window.audioClip=clip;window.AlloModules.WordPractice.open({title:'Resume words',items:[{word:'First',phonemes:[]},{word:'Second',phonemes:[]},{word:'Third',phonemes:[]}],callTTS:word=>{window.calls.push(word);return window.calls.length===2?new Promise(resolve=>window.finishStale=resolve):Promise.resolve(clip);}});},clip);}
it('stops real audio preparation, retains completed clips, skips them on continue, and ignores late replies',async()=>{const {context,page,errors}=await launch();try{await page.setContent('<main></main>');await page.addScriptTag({content:moduleSource});await audioSetup(page);await button(page,'Prepare audio').click();await page.waitForFunction(()=>window.calls.length===2);expect(await dirty(page)).toBe(true);await button(page,'Stop and keep completed audio').click();await button(page,'Continue preparation').waitFor();expect(await dirty(page)).toBe(true);await page.evaluate(()=>window.finishStale(window.audioClip));await button(page,'Continue preparation').click();await page.getByText(/Audio ready for 3 of 3 words/).waitFor();expect(await page.evaluate(()=>window.calls)).toEqual(['First','Second','Second','Third']);const file=await download(page);const saved=JSON.parse(readFileSync(await file.path(),'utf8'));expect(saved.items.map(i=>i.wordAudio)).toEqual([clip,clip,clip]);await button(page,'I saved the file').click();expect(await dirty(page)).toBe(false);expect(errors).toEqual([]);}finally{await context.close();}});
it('closing during preparation stops it and keeps the panel available to save or continue',async()=>{const {context,page,errors}=await launch();try{await page.setContent('<main></main>');await page.addScriptTag({content:moduleSource});await audioSetup(page);await button(page,'Prepare audio').click();await page.waitForFunction(()=>window.calls.length===2);await button(page,'Close').click();await button(page,'Continue preparation').waitFor();expect(await page.locator('.awp-overlay').count()).toBe(1);await button(page,'Close').click();await button(page,'Cancel').click();expect(await dirty(page)).toBe(true);expect(errors).toEqual([]);}finally{await context.close();}});
it('retains completed word and sound audio and preserves opt-out cancellation semantics',async()=>{const {context,page,errors}=await launch();try{const result=await page.evaluate(async clip=>{const controller=new AbortController(),calls=[];const input={title:'Partial sound',items:[{word:'cat',phonemes:[{label:'k',audio:clip,provenance:{language:'English'}},{label:'a'}]},{word:'dog',phonemes:[]}]};const partial=await window.AlloWordPracticeMedia.prepareAudio(input,{signal:controller.signal,keepCompletedOnStop:true,callTTS:async word=>{calls.push(word);if(word==='dog'){controller.abort();return '';}return clip;}});const resumed=await window.AlloWordPracticeMedia.prepareAudio(partial,{callTTS:async word=>{calls.push(word);return clip;}});let legacy='';try{await window.AlloWordPracticeMedia.prepareAudio(input,{signal:controller.signal});}catch(e){legacy=e.name;}return {partial,resumed,calls,legacy};},clip);expect(result.partial.audioStatus.cancelled).toBe(true);expect(result.partial.items[0].wordAudio).toBe(clip);expect(result.partial.items[0].phonemes[0].audio).toBe(clip);expect(result.resumed.items[0].phonemes[0].audio).toBe(clip);expect(result.calls).toEqual(['cat','dog','dog']);expect(result.legacy).toBe('AbortError');expect(errors).toEqual([]);}finally{await context.close();}});
