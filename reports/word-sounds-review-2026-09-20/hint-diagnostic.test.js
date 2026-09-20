import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const english=JSON.parse(readFileSync('ui_strings.js','utf8')).word_sounds;
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';
import { compileWords } from './helpers/word_sounds_core.js';
const require=createRequire(import.meta.url), modules=resolve('desktop/web-app/node_modules');
let React,client,act,Modal; const mounted=[];
beforeAll(()=>{React=require(resolve(modules,'react'));client=require(resolve(modules,'react-dom/client'));({act}=require(resolve(modules,'react-dom/test-utils')));installCanvasStub();Modal=setupWordSounds().WordSoundsModal;});
afterEach(()=>{for(const {root,host} of mounted.splice(0)){act(()=>root.unmount());host.remove();}});
async function mount(activity,image=true,extra={}){
 const calls=[],props=studentProps(activity,calls),base=props.wsPreloadedWords[0];
 const word=compileWords([{...base,image:image?base.image:null}])[0];
 if(!image){word.image=null;word._decodingAssets={};word._aacAssets={};}
 if(extra.preparedActivities)word._preparedActivities=extra.preparedActivities;
 props.sessionConfig=extra.sessionConfig;
 if(extra.preparedActivities || extra.sessionConfig)props.getWordSoundsString=(_t,key)=>english[key.replace('word_sounds.','')] || key;
 props.wsPreloadedWords=[word];props.wordSoundsPhonemes=word;
 const rows=[];props.setWordSoundsHistory=u=>rows.splice(0,rows.length,...(typeof u==='function'?u(rows):u));
 const host=document.createElement('div');document.body.appendChild(host);const root=client.createRoot(host);mounted.push({host,root});
 await act(async()=>{root.render(React.createElement(Modal,props));await new Promise(r=>setTimeout(r,30));});
 return {host,word,rows,calls};
}

// Temporary diagnostic: reproduces current behavior for the review.
import { writeFileSync } from 'node:fs';
it('records the current outcome after showing and hiding labels',async()=>{
 const {host,rows}=await mount('counting');
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('👂')).click());
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('👁️')).click());
 await act(async()=>host.querySelector('[role="button"][aria-label="Number 3"]').click());
 expect(rows).toHaveLength(1);
 writeFileSync('reports/word-sounds-review-2026-09-20/hint-toggle.json',JSON.stringify(rows[0],null,2));
 expect(rows[0]).toMatchObject({correct:true,textSupported:false,mode:'sound_only',cluesShown:[]});
});
