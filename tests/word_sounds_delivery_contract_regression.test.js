// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const read = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const host = read('AlloFlowANTI.txt');
const misc = read('misc_handlers_source.jsx');
const runtime = read('word_sounds_module.js');
const between = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw Error('Missing production boundary: ' + start);
  return source.slice(a, b);
};
const logic = new Function(between(host, 'const getWordSoundsMasteryScopeKey =', '// Live AAC bridge extracted') +
  '\nreturn {wsReducer,WS_INITIAL_STATE,getWordSoundsResourceSessionContract,resolveWordSoundsTtsSpeed};')();
const ownership = between(host, 'const wordSoundsSetupReviewEpoch =', 'const setWsActivitySequence =');
const setters = between(host, 'const setWsActivitySequence =', 'const setWordSoundsFamilies =');
const lifecycle = between(host, 'const prepareWordSoundsSession =', '// Pull in the lazily-registered Word Sounds player.');
const hydration = between(host, 'const hydrateWordSoundsFromSync =', '// Hydration safety net.');
const restoreView = new Function('window', between(misc, 'function handleRestoreView(', 'const detectClimaxArchetype =') + '\nreturn handleRestoreView;')(window);
const serialize = new Function('warnLog', between(host, 'const serializeItems = (items, stripImages) => {', 'const publishMediaReceipt =') + '\nreturn serializeItems;')(() => {});
const core = new Function(read('word_sounds_core.js')+'\nreturn createWordSoundsCore();')();
const generatedImagePatch = new Function('choice','imageKey','imageBase64',
  between(runtime,'const applied = applyReviewGeneration(request, row => choice','words => !choice')
    .replace('const applied = applyReviewGeneration(request, ', 'return ').replace(/,\s*$/, ';'));
const refinedImagePatch = new Function('imageBase64','return '+runtime.match(/row => \(\{ \.\.\.row, image: imageBase64, imageFailed: false, _packEdited: true \}\)/)[0]);
const runtimeAudioPatch = new Function('pw','ok',between(runtime,'return {\n                    ...pw,','};')+'};');
const clip = marker => { const bytes=Buffer.alloc(68);bytes.write('RIFF');bytes.write('WAVE',8);bytes[60]=marker;return {mime:'audio/wav',base64:bytes.toString('base64')}; };

// Mount the current host ownership hooks, actual reducer, run lifecycle, live
// hydration and saved-resource opener. Only unrelated shell/services are stubbed.
const Host = new Function('React', 'logic', 'restoreView', `
 const {useRef,useEffect}=React;
 const {wsReducer,WS_INITIAL_STATE,getWordSoundsResourceSessionContract,resolveWordSoundsTtsSpeed}=logic;
 return function Host({initialResource,initiallyOpen=false,teacher=false,capture}) {
  const [generatedContent,setGeneratedContent]=React.useState(initialResource);
  const [state,wsDispatch]=React.useReducer(wsReducer,{
    ...WS_INITIAL_STATE,wsPreloadedWords:initialResource.data||[],wsActivitySequence:initialResource.lessonPlanSequence||[],
    isWordSoundsMode:initiallyOpen,wordSoundsLanguage:'Spanish',wordSoundsDifficulty:'hard',
    wordSoundsSessionConfig:initiallyOpen?{...initialResource.sessionConfig,resourceId:initialResource.id,sessionId:'previous-run'}:null,
    wordSoundsSessionGoal:1,wordSoundsSessionProgress:2,wordSoundsAccuracyHistory:[{correct:true}],
    wordSoundsScore:{correct:2,total:3,streak:1},currentWordSoundsWord:'gato',wordSoundsPhonemes:['g','a','t','o'],
    wordSoundsFeedback:{type:'correct'},longitudinalHistorySentinel:[{word:'gato'}],
  });
  const {wsPreloadedWords,isWordSoundsMode,wordSoundsLanguage,wordSoundsActivity}=state;
  const isTeacherMode=teacher,user={uid:'current-student'},studentNickname='Current student';
  const [isProbeMode,setIsProbeMode]=React.useState(true),[probeActivity,setProbeActivity]=React.useState('isolation');
  const [probeGrade,setProbeGradeLevel]=React.useState('8'),[probeForm,setMathProbeForm]=React.useState('OLD');
  const [probeTarget,setProbeTargetStudent]=React.useState('previous-learner');
  const [autoReview,setWordSoundsAutoReview]=React.useState(true),[activeView,setActiveView]=React.useState('word-sounds');
  const setWordSoundsActivity=v=>wsDispatch({type:'WS_SET',field:'wordSoundsActivity',value:v});
  const warnLog=(...args)=>{throw Error(args.join(' '));};
  ${ownership}
  ${setters}
  ${lifecycle}
  ${hydration}
  const live=target=>{setGeneratedContent({...target});setActiveView(target.type);hydrateWordSoundsFromSync(target);};
  const deps={isTeacherMode,isWide:true,history:[],t:key=>key,debugLog:()=>{},setGeneratedContent,setActiveView,
    setIsMapLocked:()=>{},setDirectionsProgress:()=>{},setProbeTargetStudent,hydrateWordSoundsFromSync};
  capture({state,generatedContent,isProbeMode,probeActivity,probeGrade,probeForm,probeTarget,autoReview,activeView,live,
    reopen:target=>restoreView(target,{suppressLiveFollow:true},deps),
    prepare:prepareWordSoundsSession,close:()=>setIsWordSoundsMode(false)});
  return React.createElement('output',null,state.wordSoundsSessionConfig?.resourceId||'closed');
 };
`)(React, logic, restoreView);

const previous = () => ({ id: 'old-probe', type: 'word-sounds', isProbeMode: true, probeActivity: 'isolation',
  lessonPlanSequence: ['isolation'], data: [{ targetWord: 'gato', phonemes: ['g','a','t','o'] }],
  sessionConfig: { fixedForm: true, sessionGoal: 1, language: 'Spanish', itemIds: ['old-item'], resourceId: 'old-probe', initialActivity: 'isolation' } });
const practice = (id = 'new-practice') => ({ id, type: 'word-sounds', lessonPlanSequence: [],
  data: ['cat','dog','sun','hat'].map(targetWord => ({ targetWord, phonemes: [...targetWord], _preparedActivities: ['counting'] })),
  sessionConfig: { fixedForm: false, sessionGoal: 4, language: 'English', preparedActivities: ['counting'] } });
const form = () => ({ id: 'authored-form', type: 'word-sounds', isProbeMode: true, probeActivity: 'isolation', probeGradeLevel: '2', probeForm: 'B', lessonPlanSequence: [],
  data: ['cat','cat','dog'].map(targetWord => ({ targetWord, phonemes: [...targetWord] })),
  sessionConfig: { fixedForm: true, itemCount: 3, itemIds: ['cat-first','cat-final','dog-final'], formId: 'teacher-form-A', language: 'English', preparedActivities: ['isolation'] } });
let root, container, state;
const mount = async props => { await act(async () => root.render(React.createElement(Host, { initialResource: previous(), capture: value => { state = value; }, ...props }))); };
const deliver = async resource => { await act(async () => state.live(resource)); };
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Word Sounds delivered-resource session boundary', () => {
  it.each([false,true])('replaces the previous assessment contract when player open=%s', async initiallyOpen => {
    await mount({ initiallyOpen });
    await act(async () => { state.prepare({resourceId:'stale-pending',fixedForm:true,language:'French'}); state.live(practice()); });
    expect(state.state).toMatchObject({isWordSoundsMode:true,wsActivitySequence:[],wordSoundsActivity:'counting',
      wordSoundsLanguage:'English',wordSoundsDifficulty:'auto',wordSoundsSessionGoal:4,wordSoundsSessionProgress:0,
      wordSoundsAccuracyHistory:[],wordSoundsScore:{correct:0,total:0,streak:0},currentWordSoundsWord:null,wordSoundsPhonemes:null,wordSoundsFeedback:null});
    expect(state.state.wordSoundsSessionConfig).toMatchObject({resourceId:'new-practice',fixedForm:false,sessionGoal:4,learnerId:'current-student',preparedActivities:['counting']});
    expect(state.state.wordSoundsSessionConfig.sessionId).not.toBe('previous-run');
    expect(state.state.wordSoundsSessionConfig.itemIds).toBeUndefined();
    expect(state.isProbeMode).toBe(false); expect(state.autoReview).toBe(false);
    expect(state.state.wsPreloadedWords.map(row=>row.targetWord)).toEqual(['cat','dog','sun','hat']);
    expect(state.state.longitudinalHistorySentinel).toEqual([{word:'gato'}]);
  });

  it('accepts two deliveries in one batch without an older delayed launch', async () => {
    vi.useFakeTimers(); await mount({initiallyOpen:true});
    const first=state.live, final=practice('last-resource'); final.sessionConfig.sessionGoal=9;
    await act(async()=>{ first(form()); first(final); });
    await act(async()=>vi.runAllTimers());
    expect(state.generatedContent.id).toBe('last-resource');
    expect(state.state.wordSoundsSessionConfig).toMatchObject({resourceId:'last-resource',fixedForm:false,sessionGoal:9,language:'English'});
    expect(state.state.wsActivitySequence).toEqual([]); expect(state.isProbeMode).toBe(false);
  });

  it.each(['generated target picture','generated choice picture','refined picture','prepared audio repair','runtime audio readiness'])('preserves the active run for real %s payloads', async repair => {
    const original=practice(); original.lessonPlanSequence=['counting']; original.data[0]._ttsAssets={cat:clip(1)};
    original.data[0].image='old-picture';original.data[0].imageFailed=true;
    await mount({initialResource:original,initiallyOpen:true});
    const before=state.state, replacement=structuredClone(original);
    replacement.timestamp=Date.now();
    if(repair==='generated target picture') replacement.data[0]=generatedImagePatch(false,'cat','replacement-picture')(replacement.data[0]);
    if(repair==='generated choice picture') replacement.data[0]=generatedImagePatch(true,'dog','replacement-picture')(replacement.data[0]);
    if(repair==='refined picture') replacement.data[0]=refinedImagePatch('replacement-picture')(replacement.data[0]);
    if(repair==='prepared audio repair') replacement.data=core.replacePackAssets(replacement.data,{cat:clip(2)});
    if(repair==='runtime audio readiness') replacement.data[0]=runtimeAudioPatch(replacement.data[0],true);
    await deliver(replacement);
    expect(state.state.wordSoundsSessionConfig).toBe(before.wordSoundsSessionConfig);
    expect(state.state.wordSoundsScore).toBe(before.wordSoundsScore);
    expect(state.state.wordSoundsSessionProgress).toBe(2);
    expect(state.state.currentWordSoundsWord).toBe('gato');
    expect(state.state.wsActivitySequence).toBe(before.wsActivitySequence);
    expect(state.state.wsPreloadedWords[0]._ttsAssets).toEqual(replacement.data[0]._ttsAssets);
    expect(state.state.wsPreloadedWords[0].image).toBe(replacement.data[0].image);
    expect(state.state.wsPreloadedWords[0]._decodingAssets).toEqual(replacement.data[0]._decodingAssets);
  });

  it('treats reordered object properties as the same media-refresh contract', async () => {
    const original=practice(); await mount({initialResource:original,initiallyOpen:true});
    const updated={...original,sessionConfig:{preparedActivities:['counting'],language:'English',sessionGoal:4,fixedForm:false}};
    await deliver(updated);
    expect(state.state.wordSoundsSessionConfig.sessionId).toBe('previous-run');
    expect(state.state.wordSoundsSessionProgress).toBe(2);
  });

  it.each(['config','board','words'])('starts a fresh run for a same-ID %s edit', async kind => {
    const original=practice(); await mount({initialResource:original,initiallyOpen:true});
    const updated=structuredClone(original);
    if(kind==='config') updated.sessionConfig.sessionGoal=7;
    if(kind==='board') {updated.data[0].activityItems={counting:{answer:3}};updated.data[0]._packEdited=true;}
    if(kind==='words') updated.data.reverse();
    await deliver(updated);
    expect(state.state.wordSoundsSessionConfig.sessionId).not.toBe('previous-run');
    expect(state.state.wordSoundsSessionProgress).toBe(0);
  });

  it('closes a replaced teacher run without automatically launching practice', async () => {
    await mount({teacher:true,initiallyOpen:true}); await deliver(practice());
    expect(state.state.isWordSoundsMode).toBe(false); expect(state.state.wordSoundsSessionConfig).toBeNull();
    expect(state.state.wsActivitySequence).toEqual([]); expect(state.isProbeMode).toBe(false);
    expect(state.generatedContent.id).toBe('new-practice');
  });

  it('clears previous words when the next delivered resource is empty', async () => {
    await mount({initiallyOpen:true}); const empty=practice('empty');empty.data=[];
    await deliver(empty);
    expect(state.state.wsPreloadedWords).toEqual([]);
    expect(state.state.wordSoundsSessionConfig.resourceId).toBe('empty');
  });

  it('reopens a saved form with its exact IDs and fresh session, including a second explicit open', async () => {
    await mount({initiallyOpen:true}); const saved=form();
    await act(async()=>state.reopen(saved));
    expect(state.state.wordSoundsSessionConfig).toMatchObject({resourceId:'authored-form',fixedForm:true,sessionGoal:3,language:'English',itemIds:saved.sessionConfig.itemIds,learnerId:'current-student'});
    expect(state.state.wsActivitySequence).toEqual([]); expect(state.state.wordSoundsActivity).toBe('isolation');
    expect(state.isProbeMode).toBe(true); expect(state.probeGrade).toBe('2'); expect(state.probeForm).toBe('B'); expect(state.probeTarget).toBeNull();
    const firstSession=state.state.wordSoundsSessionConfig.sessionId;
    await act(async()=>state.reopen(saved));
    expect(state.state.wordSoundsSessionConfig.sessionId).not.toBe(firstSession);
  });

  it('opens a saved teacher probe anonymously while ordinary teacher practice stays in setup', async () => {
    await mount({teacher:true,initiallyOpen:true});
    await act(async()=>state.reopen(form()));
    expect(state.state.isWordSoundsMode).toBe(true);
    expect(state.state.wordSoundsSessionConfig).toMatchObject({learnerId:null,resourceId:'authored-form',fixedForm:true});
    expect(state.probeTarget).toBeNull();
    await act(async()=>state.reopen(practice()));
    expect(state.state.isWordSoundsMode).toBe(false); expect(state.isProbeMode).toBe(false); expect(state.activeView).toBe('word-sounds-generator');
  });

  it.each(['config','row','legacy'])('reopens a spelling probe at its runtime activity (%s)', async location => {
    await mount({initiallyOpen:true});const saved=form();saved.probeActivity='spelling';
    saved.sessionConfig.preparedActivities=['spelling_bee'];
    if(location==='config') saved.sessionConfig.runtimeActivity='spelling_bee';
    if(location==='row') saved.data[0].probeRuntimeActivity='spelling_bee';
    await act(async()=>state.reopen(saved));
    expect(state.probeActivity).toBe('spelling');
    expect(state.state.wordSoundsActivity).toBe('spelling_bee');
    expect(state.state.wordSoundsSessionConfig.initialActivity).toBe('spelling_bee');
  });
});

describe('device history preserves config-only assessment occurrence IDs', () => {
  it.each([false,true])('retains IDs through complete autosave/hydration/reopen (quota retry=%s)', async stripped => {
    const original=form(), saved=serialize([original],stripped)[0];
    const win={AlloModules:{}};
    new Function('window',read('firestore_sync_module.js'))(win);
    const received=win.hydrateHistory(JSON.parse(JSON.stringify([saved])))[0];
    expect(received.sessionConfig.itemIds).toEqual(original.sessionConfig.itemIds);
    expect(received.data.map(row=>row.targetWord)).toEqual(['cat','cat','dog']);
    await mount({initiallyOpen:true}); await act(async()=>state.reopen(received));
    expect(state.state.wordSoundsSessionConfig.itemIds).toEqual(['cat-first','cat-final','dog-final']);
    expect(state.state.wordSoundsSessionGoal).toBe(3);
  });

  it('keeps supported scalar IDs exactly and excludes nested metadata/live identities', () => {
    const original=form();original.data=Array.from({length:7},()=>({targetWord:'cat'}));
    const ids=[' cat first ','識別子'.repeat(300),0,42,null,{learnerId:'private'},Infinity];
    original.sessionConfig={...original.sessionConfig,itemIds:ids,learnerId:'private',sessionId:'live',startedAt:'now',arbitraryProvider:{secret:'hidden'}};
    const saved=serialize([original],false)[0];
    expect(saved.sessionConfig.itemIds).toEqual([...ids.slice(0,4),null,null,null]);
    expect(saved.sessionConfig.learnerId).toBeUndefined();expect(saved.sessionConfig.sessionId).toBeUndefined();
    expect(saved.sessionConfig.startedAt).toBeUndefined();expect(saved.sessionConfig.arbitraryProvider).toBeUndefined();
    expect(original.sessionConfig.itemIds).toBe(ids);
  });
});
