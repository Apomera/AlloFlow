import {afterEach,beforeAll,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {React,setupBehaviorLens} from './helpers/behavior_lens_harness.js';
const require=createRequire(import.meta.url);const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));const {Simulate}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root,host,components,entries=[];
beforeAll(()=>{setupBehaviorLens();globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.AlloModules.BehaviorLens;new Function(readFileSync('behavior_lens_module.js','utf8').replace(/\}\)\(\);\s*$/,'window.__ratingTests={NaturalLanguageABC,VoiceToABC,WorkspaceSharing};})();'))();components=window.__ratingTests;});
afterEach(async()=>{if(root)await React.act(async()=>root.unmount());host?.remove();root=null;entries=[];delete window.SpeechRecognition;vi.restoreAllMocks();});
async function mount(name,props={}){host=document.createElement('div');document.body.append(host);root=createRoot(host);await React.act(async()=>root.render(React.createElement(components[name],{abcEntries:[],observationSessions:[],sessionHistory:[],studentRoster:[],studentProfile:{},cloudSync:{},studentName:'Synthetic',selectedStudent:'Synthetic',t:()=>undefined,addToast:()=>{},setAbcEntries:update=>entries=typeof update==='function'?update(entries):update,...props})));}
async function click(el){expect(el).toBeTruthy();await React.act(async()=>el.click());}
const label=name=>host.querySelector('[aria-label="'+name+'"]');
const textButton=text=>[...host.querySelectorAll('button')].find(button=>button.textContent.includes(text));
describe('Missing ratings in import and sharing paths',()=>{
 it('preserves absent and invalid AI-parsed ratings, while keeping valid ratings',async()=>{
  await mount('NaturalLanguageABC',{callGemini:async()=>JSON.stringify([{}, {intensity:9},{intensity:2}].map(item=>({antecedent:'Task',behavior:'Asked for help',consequence:'Help offered',...item})))});
  await React.act(async()=>Simulate.change(label('Raw behavior observation text'),{target:{value:'Three observations'}}));await click(textButton('Parse'));
  expect(host.textContent).toContain('Not rated');await click(textButton('Add All'));expect(entries.map(entry=>entry.intensity)).toEqual([null,null,2]);
 });
 it('preserves an unrated voice observation through review and saving',async()=>{
  let speech;window.SpeechRecognition=class{constructor(){speech=this;}start(){}stop(){}};
  await mount('VoiceToABC',{callGemini:async()=>JSON.stringify([{antecedent:'Task',behavior:'Help card shown',consequence:'Help offered'}])});
  await click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Start Recording')||b.textContent.includes('Stop Recording')));await React.act(async()=>speech.onresult({resultIndex:0,results:[Object.assign([{transcript:'Help card shown during work'}],{isFinal:true})]}));await click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Start Recording')||b.textContent.includes('Stop Recording')));await click(label('Parse ABC Entries from Transcript'));
  expect(host.textContent).toContain('Not rated');await click(label('Add Selected Entries'));expect(entries[0].intensity).toBeNull();
 });
 it.each([[null,null],[null,4]])('shares rated-only summaries for %j and %j',async(a,b)=>{
  const writeText=vi.fn().mockResolvedValue();Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true});
  await mount('WorkspaceSharing',{abcEntries:[{behavior:'Help',intensity:a},{behavior:'Help',intensity:b}]});await click(textButton('Teacher'));await click(textButton('Share Code'));
  const snapshot=JSON.parse(decodeURIComponent(escape(atob(writeText.mock.calls[0][0]))));expect(snapshot.avgIntensity).toBe(b);expect(snapshot.ratedIntensityCount).toBe(b===null?0:1);expect(snapshot.missingIntensityCount).toBe(b===null?2:1);
 });
});
