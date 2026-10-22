// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {transformSync} from '@babel/core';
const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act,Simulate}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const read=file=>readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const source=read('word_sounds_setup_source.jsx'),host=read('AlloFlowANTI.txt');
const between=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a+start.length);if(a<0||b<a)throw Error('Missing production boundary '+start);return text.slice(a,b);};
const icons=[...new Set([...source.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map(match=>match[1]||match[2]))]
 .filter(name=>!new RegExp('(?:function|const) '+name+'\\b').test(source));
const compiled=transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx']}).code;
const Generator=new Function('React','warnLog','debugLog','getWordSoundsString','loadProbeBanks',...icons,
 compiled+'\nreturn WordSoundsGenerator;')(React,()=>{},()=>{},(_t,key)=>key,()=>{},...icons.map(()=>()=>null));
const generatorHost=between(host,'<WordSoundsGenerator key=','onShowReview={(reviewedWords)');
const callback=(name,text=generatorHost)=>between(text,name+'={','\n').replace(name+'={','').replace(/\}\s*$/,'');
const closeDashboard=host.match(/const handleCloseDashboard = useCallback\(\(\) => setActiveView\('input'\), \[\]\);/)[0];
const mountCondition=host.match(/\{\((activeView === 'word-sounds-generator' \|\| wsGeneratorMinimized)\) && \(/)[1];
// Full production generator and exact host lifecycle callbacks/retained mount.
const Host=new Function('React','Generator',`
 const {useCallback}=React;
 return function Host({props,capture}){
  const [activeView,setActiveView]=React.useState('word-sounds-generator');
  const [wsGeneratorMinimized,setWsGeneratorMinimized]=React.useState(false);
  ${closeDashboard}
  const onMinimize=${callback('onMinimize')},onExpand=${callback('onExpand')},onClose=${callback('onClose')};
  capture({activeView,wsGeneratorMinimized,reopen:()=>setActiveView('word-sounds-generator')});
  return (${mountCondition})?React.createElement(Generator,{...props,onMinimize,onExpand,onClose}):null;
 };
`)(React,Generator);
const clip=()=>{const bytes=Buffer.alloc(68);bytes.write('RIFF');bytes.write('WAVE',8);return 'data:audio/wav;base64,'+bytes.toString('base64');};
let root,container,props,state;
const mount=async()=>act(async()=>root.render(React.createElement(Host,{props,capture:value=>{state=value;}})));
const input=()=>container.querySelector('#ws-probe-student');
const click=async selector=>{const button=typeof selector==='string'?container.querySelector(selector):selector;expect(button).toBeTruthy();await act(async()=>button.click());};
const start=()=>[...container.querySelectorAll('button')].find(button=>button.textContent.trim()==='Start Activity');
const changeLearner=async name=>act(async()=>Simulate.change(input(),{target:{value:name}}));
const deferTts=()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});const signals=[];
 props.callTTS=vi.fn(async(text,_voice,_speed,options)=>{
  options?.onResolvedProfile?.({provider:'kokoro',resolvedVoice:'af_heart',language:'English'});
  if(text==='cat'){signals.push(options.signal);return pending;}return clip();
 });
 return {signals,release:()=>release(clip())};
};
beforeEach(()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);window.AlloModules={};window.WORD_FAMILY_PRESETS={};window.SIGHT_WORD_PRESETS={};
 container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
 props={glossaryTerms:[],preloadedWords:[{word:'cat',targetWord:'cat',phonemes:['k','a','t']}],
  isTeacherMode:true,isProbeMode:false,probeActivity:'counting',selectedVoice:'af_heart',wordSoundsLanguage:'English',gradeLevel:'K',t:key=>key,ttsSpeed:0.5,
  syllableReviewSession:{key:1,setupDraft:{sessionType:'assessment',probeStudent:'Learner A',probeActivitySel:'counting',includeGlossary:false}},onStartGame:vi.fn()};
});
afterEach(()=>{act(()=>root.unmount());container.remove();vi.unstubAllGlobals();});

describe('setup learner contract during preparation',()=>{
 it.each(['Learner A',''])('locks the confirmed learner %j until the pending run completes',async learner=>{
  props.syllableReviewSession.setupDraft.probeStudent=learner;const pending=deferTts();await mount();
  await click(start());expect(pending.signals).toHaveLength(1);expect(input().disabled).toBe(true);
  // A synthetic event also exercises the callback guard, independently of
  // the browser's native disabled-input protection.
  await changeLearner('Learner B');expect(input().value).toBe(learner);
  expect(props.syllableReviewSession.setupDraft.probeStudent).toBe(learner);
  expect(container.textContent).not.toContain('record for Learner B');
  await act(async()=>pending.release());
  expect(props.onStartGame).toHaveBeenCalledTimes(1);
  const [, , , ,probe,config]=props.onStartGame.mock.calls[0];
  expect(probe.student).toBe(learner||null);expect(config.learnerId).toBe(learner||null);
  expect(config).toMatchObject({wordSoundsTtsSpeed:0.5,ttsSpeed:0.5});
 });

 it('accepts a learner change before preparing and emits that same learner',async()=>{
  const pending=deferTts();await mount();expect(input().disabled).toBe(false);
  await changeLearner('Learner B');await click(start());await act(async()=>pending.release());
  expect(props.onStartGame.mock.calls[0][4].student).toBe('Learner B');
  expect(props.onStartGame.mock.calls[0][5].learnerId).toBe('Learner B');
 });

 it('cancels the pending run when closed and unlocks the retained draft on reopen',async()=>{
  const pending=deferTts();await mount();await click(start());
  await click('[data-help-key="ws_gen_close"]');expect(pending.signals[0].aborted).toBe(true);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  await act(async()=>pending.release());expect(props.onStartGame).not.toHaveBeenCalled();
  await act(async()=>state.reopen());expect(input().disabled).toBe(false);
  await changeLearner('Learner B');expect(input().value).toBe('Learner B');
 });
});

describe('minimized setup ownership',()=>{
 it('removes the floating tile when its close control is used',async()=>{
  await mount();await click('[data-help-key="ws_gen_minimize"]');
  expect(state.wsGeneratorMinimized).toBe(true);expect(state.activeView).toBe('output');
  await click('button[aria-label="Close Word Sounds setup"]');
  expect(state.wsGeneratorMinimized).toBe(false);expect(state.activeView).toBe('input');
  expect(container.children).toHaveLength(0);
 });

 it('closes a minimized pending run without allowing its late preparation to launch',async()=>{
  const pending=deferTts();await mount();await click(start());await click('[data-help-key="ws_gen_minimize"]');
  await click('button[aria-label="Close Word Sounds setup"]');
  expect(pending.signals[0].aborted).toBe(true);expect(state.wsGeneratorMinimized).toBe(false);
  await act(async()=>pending.release());expect(props.onStartGame).not.toHaveBeenCalled();expect(container.children).toHaveLength(0);
 });
});
