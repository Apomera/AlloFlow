import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { readReflection, saveReflection, reflectionKey } from '../connected_escape_room_reflection.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React,babel=require('@babel/core');
const solo=require('../concept_quest_solo_engine.js');
let root,host,Practice,Reflection,latest;
const compile=source=>babel.transformSync(source,{plugins:['@babel/plugin-transform-react-jsx'],babelrc:false,configFile:false}).code;
beforeAll(()=>{
 window.React=React;window.AlloModules.ConceptQuestSoloEngine=solo;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const question=readFileSync('concept_quest_solo_question_source.jsx','utf8'),source=readFileSync('concept_quest_solo_source.jsx','utf8'),component=source.slice(source.indexOf('function ConceptQuestTargetedPractice'),source.indexOf('function ConceptQuestSolo('));
 Practice=new Function('React','window',compile(question+'\n'+component)+'\nreturn ConceptQuestTargetedPractice;')(React,window);
 const reflection=readFileSync('connected_escape_room_debrief.jsx','utf8').replace(/^import .*;\r?\n/gm,'').split('export function RoomDebrief')[0];
 Reflection=new Function('window','readReflection','saveReflection','reflectionKey',compile(reflection)+'\nreturn PersonalReflection;')(window,readReflection,saveReflection,reflectionKey);
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=null;window.localStorage.clear();});
async function mount(element){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(element));}
const click=async element=>{expect(element).toBeTruthy();await act(async()=>element.click());};
const type=async(element,text)=>{await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(element,text);element.dispatchEvent(new Event('input',{bubbles:true}));});};
describe('Game follow-through controls',()=>{
 it('runs missed-item practice using authored keys without changing quest evidence',async()=>{
  const item=solo.normalizeItems({data:{questions:[{question:'Which material conducts?',options:['Copper','Wood'],correctAnswer:'Copper'}]}})[0];
  const quest={solo:{bank:[item],attempts:{0:{count:1,firstCorrect:false,lastCorrect:false,firstStatus:'incorrect',status:'incorrect'}},history:[]}},before=JSON.stringify(quest);
  function Harness(){const [value,setValue]=React.useState(null);latest=value;return React.createElement(Practice,{quest,value,onChange:setValue,t:key=>key});}
  await mount(React.createElement(Harness));await click(host.querySelector('[data-start-targeted-practice]'));
  expect(document.activeElement.textContent).toBe('Focused practice');
  await click(host.querySelector('input[type=radio]'));await click([...host.querySelectorAll('button')].find(button=>button.textContent==='Check practice response'));
  expect(host.textContent).toContain('Correct practice response');expect(latest.entries).toHaveLength(1);expect(JSON.stringify(quest)).toBe(before);
  await click([...host.querySelectorAll('button')].find(button=>button.textContent==='Continue practice'));expect(host.textContent).toContain('Focused practice complete');
  await click([...host.querySelectorAll('button')].find(button=>button.textContent==='Close practice'));expect(latest.entries).toHaveLength(1);expect(host.textContent).toContain('Resume focused practice');
  expect(document.activeElement).toBe(host.querySelector('[data-start-targeted-practice]'));
  await click(host.querySelector('[data-start-targeted-practice]'));expect(host.textContent).toContain('Focused practice complete');
  expect(document.activeElement.textContent).toBe('Focused practice');
 });
 it('keeps unsaved writing through live snapshot refreshes and restores only the same scope',async()=>{
  const room={title:'Water cycle',nodes:[]};
  await mount(React.createElement(Reflection,{room,scope:'student-a:attempt-1',t:key=>key}));
  await type(host.querySelector('textarea'),'Energy connected the two discoveries.');
  await act(async()=>root.render(React.createElement(Reflection,{room:{...room},scope:'student-a:attempt-1',t:key=>key})));
  expect(host.querySelector('textarea').value).toBe('Energy connected the two discoveries.');
  await click([...host.querySelectorAll('button')].find(button=>button.textContent==='Save on this device'));
  expect(host.textContent).toContain('This has not been sent to your teacher.');
  await act(async()=>root.render(React.createElement(Reflection,{room,scope:'student-b:attempt-1',t:key=>key})));
  expect(host.querySelector('textarea').value).toBe('');
  await act(async()=>root.render(React.createElement(Reflection,{room,scope:'student-a:attempt-1',t:key=>key})));
  expect(host.querySelector('textarea').value).toBe('Energy connected the two discoveries.');
 });
});
