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
describe('Word Sounds compiled pack actually played',()=>{
 it.each(['session','saved pack'])('limits the activity picker to the prepared %s',async source=>{
  const extra=source==='session'?{sessionConfig:{preparedActivities:['counting']}}:{preparedActivities:['counting']};
  const {host}=await mount('counting',true,extra);
  const labels=[...host.querySelectorAll('button')].map(b=>b.textContent);
  expect(labels.some(l=>l.includes(english.activity_counting))).toBe(true);
  expect(labels.some(l=>l.includes(english.activity_blending))).toBe(false);
 });
 it('plays the exact compiled Sound Sort choices after revealing labels',async()=>{
  const {host,word,calls}=await mount('sound_sort');
  const reveal=[...host.querySelectorAll('button')].find(b=>b.textContent.includes('👂'));
  expect(reveal).toBeTruthy();await act(async()=>reveal.click());
  const labels=[...host.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label'));
  for(const choice of [...word.activityItems.sound_sort.options,...word.activityItems.sound_sort.distractors])expect(labels.some(l=>l.endsWith(choice))).toBe(true);
  expect(calls).toEqual([]);
 });
 for(const activity of ['read_sentence','read_passage']){
  it(`${activity} records visible-answer matching without independent reading credit`,async()=>{
   const {host,rows}=await mount(activity,false);
   const answer=[...host.querySelectorAll('button')].find(b=>b.textContent.trim()==='cat');expect(answer).toBeTruthy();
   await act(async()=>answer.click());
   expect(rows.at(-1)).toMatchObject({activity,correct:true,taskKind:'word_matching',answerExposed:true,independentReading:false,fallbackReason:'missing_target_image',mode:'visual'});
  });
  it(`${activity} supplies the meaning of its picture clue`,async()=>{
   const {host}=await mount(activity,true);expect(host.querySelector('img[alt="Picture clue: cat"]')).toBeTruthy();
  });
 }
});
