import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);if(a<0||b<a)throw Error('Missing production boundary '+start);return source.slice(a,b);};
const sources=['AlloFlowANTI.txt','desktop/web-app/src/App.jsx','desktop/web-app/src/AlloFlowANTI.txt'];
const firestore=read('firestore_sync_module.js');
const load=file=>{
 const source=read(file);
 const logic=new Function(between(source,'const getWordSoundsMasteryScopeKey =','// Live AAC bridge extracted')+'\nreturn {wsReducer,WS_INITIAL_STATE,resolveWordSoundsTtsSpeed};')();
 const serialize=new Function('warnLog',between(source,'const serializeItems =','const publishMediaReceipt =')+'\nreturn serializeItems;')(()=>{});
 return {...logic,source,serialize};
};
const lesson=()=>({id:'lesson-a',type:'word-sounds',data:[{word:'cat',targetWord:'cat',phonemes:['k','a','t']}],
 sessionConfig:{wordSoundsTtsSpeed:0.5,ttsSpeed:0.5,sessionGoal:3,fixedForm:false,itemIds:['cat-1']}});
const runSetter=(H,resource=lesson())=>{
 let current=resource,history=[resource,{id:'other',type:'quiz',data:[]}];
 let state=H.wsReducer({...H.WS_INITIAL_STATE},{type:'WS_BEGIN_SESSION',config:{...resource.sessionConfig,resourceId:resource.id,sessionId:'live-session',learnerId:'current-learner'}});
 const ref={current:resource};const initialConfig=state.wordSoundsSessionConfig;
 const scope={resolveWordSoundsTtsSpeed:H.resolveWordSoundsTtsSpeed,latestWordSoundsResourceRef:ref,
  wordSoundsSessionConfig:initialConfig,wordSoundsTtsSpeed:state.wordSoundsTtsSpeed,
  wsDispatch:action=>{state=H.wsReducer(state,action);},
  setGeneratedContent:update=>{current=typeof update==='function'?update(current):update;},
  setHistory:update=>{history=typeof update==='function'?update(history):update;}};
 const set=new Function(...Object.keys(scope),between(H.source,'const setWordSoundsTtsSpeed =','const setWordSoundsFamilies =')+'\nreturn setWordSoundsTtsSpeed;')(...Object.values(scope));
 return {set,ref,get state(){return state;},get resource(){return current;},get history(){return history;}};
};

describe.each(sources)('host speech-rate contract: %s',file=>{
 const H=load(file);
 it.each([
  [{wordSoundsTtsSpeed:0.5},0.5], [{ttsSpeed:1.5},1.5],
  [{wordSoundsTtsSpeed:0.75,ttsSpeed:1.25},0.75],
  [{wordSoundsTtsSpeed:99,ttsSpeed:0.75},0.75],
  [{wordSoundsTtsSpeed:'0.5',ttsSpeed:1.25},1.25],
  [{wordSoundsTtsSpeed:NaN,ttsSpeed:0.5},0.5],
  [{wordSoundsTtsSpeed:0.49},1], [{wordSoundsTtsSpeed:1.51},1],
  [{ttsSpeed:Infinity},1], [{ttsSpeed:null},1], [{},1],
 ])('normalizes incoming saved settings %j to %s', (config,expected)=>{
  const state=H.wsReducer({...H.WS_INITIAL_STATE,wordSoundsTtsSpeed:1.5},{type:'WS_BEGIN_SESSION',config});
  expect(state.wordSoundsTtsSpeed).toBe(expected);
  expect(state.wordSoundsSessionConfig).toMatchObject({wordSoundsTtsSpeed:expected,ttsSpeed:expected});
 });

 it('updates both live aliases and persists only rate settings into the bound saved resource',()=>{
  const live=runSetter(H),unrelated=live.history[1];live.set(0.75);
  expect(live.state).toMatchObject({wordSoundsTtsSpeed:0.75,wordSoundsSessionConfig:{wordSoundsTtsSpeed:0.75,ttsSpeed:0.75,learnerId:'current-learner',sessionId:'live-session'}});
  expect(live.resource).toMatchObject({wordSoundsTtsSpeed:0.75,sessionConfig:{wordSoundsTtsSpeed:0.75,ttsSpeed:0.75,itemIds:['cat-1']}});
  expect(live.resource.sessionConfig.learnerId).toBeUndefined();expect(live.resource.sessionConfig.sessionId).toBeUndefined();
  expect(live.history[0]).toEqual(live.resource);expect(live.history[1]).toBe(unrelated);
  live.set(previous=>previous+0.25);live.set(previous=>previous+0.25);
  expect(live.state.wordSoundsTtsSpeed).toBe(1.25);expect(live.resource.sessionConfig.ttsSpeed).toBe(1.25);
 });

 it('rejects out-of-range or nonnumeric live updates without replacing the valid current rate',()=>{
  const live=runSetter(H);
  for(const value of [0,0.49,1.51,Infinity,NaN,'0.75',null,undefined]){
   live.set(value);expect(live.state.wordSoundsTtsSpeed).toBe(0.5);
   expect(live.state.wordSoundsSessionConfig).toMatchObject({wordSoundsTtsSpeed:0.5,ttsSpeed:0.5});
  }
 });

 it('declines a rate callback from a player whose resource was replaced',()=>{
  const live=runSetter(H),before=live.state;live.ref.current={...lesson(),id:'new-resource'};live.set(1.25);
  expect(live.state).toBe(before);expect(live.resource.sessionConfig.ttsSpeed).toBe(0.5);
 });

 it.each([false,true])('retains live rate adjustment through actual autosave/hydration/reopen (quota retry=%s)',stripped=>{
  const live=runSetter(H);live.set(1.25);
  const saved=H.serialize([live.resource],stripped)[0],win={AlloModules:{}};
  new Function('window',firestore)(win);
  const received=win.hydrateHistory(JSON.parse(JSON.stringify([saved])))[0];
  const reopened=H.wsReducer({...H.WS_INITIAL_STATE,wordSoundsTtsSpeed:0.5},{type:'WS_BEGIN_SESSION',config:received.sessionConfig});
  expect(reopened.wordSoundsTtsSpeed).toBe(1.25);
  expect(reopened.wordSoundsSessionConfig).toMatchObject({wordSoundsTtsSpeed:1.25,ttsSpeed:1.25,itemIds:['cat-1']});
 });

 it('migrates an explicit legacy resource rate and normalizes invalid saved fields',()=>{
  const resource=lesson();delete resource.sessionConfig;resource.wordSoundsTtsSpeed=0.75;
  const saved=H.serialize([resource],false)[0];
  expect(saved.sessionConfig).toEqual({wordSoundsTtsSpeed:0.75,ttsSpeed:0.75});
  resource.sessionConfig={wordSoundsTtsSpeed:'invalid',ttsSpeed:1.5};
  expect(H.serialize([resource],false)[0].sessionConfig).toEqual({wordSoundsTtsSpeed:1.5,ttsSpeed:1.5});
  resource.sessionConfig={wordSoundsTtsSpeed:5,ttsSpeed:-1};delete resource.wordSoundsTtsSpeed;
  expect(H.serialize([resource],false)[0].sessionConfig).toEqual({wordSoundsTtsSpeed:1,ttsSpeed:1});
 });
});
