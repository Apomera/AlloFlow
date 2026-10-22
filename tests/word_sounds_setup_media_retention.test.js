// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const section = (text, start, end) => {
  const a=text.indexOf(start), b=text.indexOf(end,a+start.length);
  if(a<0 || b<0) throw Error('Missing production seam '+start);
  return text.slice(a,b);
};
const iconNames=[...new Set([...source.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map(match=>match[1]||match[2]))]
  .filter(name=>!new RegExp('(?:function|const) '+name+'\\b').test(source));
const compiled = transformSync(source, {configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx']}).code;
const Generator = new Function('React','warnLog','debugLog','getWordSoundsString','loadProbeBanks',...iconNames,
  compiled+'\nreturn WordSoundsGenerator;')(React,()=>{},()=>{},(_t,key)=>key,()=>{},...iconNames.map(()=>()=>null));
const ownership = section(host,'const wordSoundsSetupReviewEpoch =','const setWsActivitySequence =');
const callback = name => {
  const tail=host.slice(host.indexOf(name+'={')+(name+'={').length);
  return tail.slice(0,tail.search(/^\s+\}\}/m))+'\n}';
};
const back = section(host,'onBackToSetup: () => {','},').slice('onBackToSetup: '.length)+'}';

// The production generator is mounted intact. These are the host's actual
// ownership hooks and launch/review/return callbacks, with unrelated services
// replaced by state setters so real navigation unmounts/remounts the Studio.
const Host = new Function('React','Generator', `
 const {useRef,useEffect}=React;
 const setTimeout=fn=>fn();
 return function Host({initialWords,initialConfig={},draft={},approvedAudio,capture,callTTS,callImagen}) {
  const [wsPreloadedWords,setWords]=React.useState(initialWords);
  const [generatedContent,setGeneratedContent]=React.useState({id:'pack-a',type:'word-sounds',data:initialWords,sessionConfig:initialConfig});
  const [history,setHistory]=React.useState([]), [activeView,setActiveView]=React.useState('word-sounds-generator');
  const [isWordSoundsMode,setIsWordSoundsMode]=React.useState(false);
  const [wsActivitySequence,setWsActivitySequence]=React.useState([]);
  const [isProbeMode,setIsProbeMode]=React.useState(false);
  const [probeActivity,setProbeActivity]=React.useState('segmentation');
  const probeGradeLevel='K', mathProbeForm='A';
  const setProbeGradeLevel=()=>{},setMathProbeForm=()=>{},setProbeTargetStudent=()=>{},prepareWordSoundsSession=()=>{};
  const setWordSoundsActivity=()=>{},setWordSoundsAutoReview=()=>{},setCurrentWordSoundsWord=()=>{},setWordSoundsPhonemes=()=>{},setWordSoundsFeedback=()=>{};
  const t=()=>undefined,wsDispatch=action=>setWords(action.value);
  ${ownership}
  const seededDraft=useRef(false);
  if(!seededDraft.current) {
    seededDraft.current=true;wordSoundsSetupReviewSession.setupDraft={...draft};
    if(approvedAudio) wordSoundsSetupReviewSession.audio=approvedAudio;
  }
  const onShowReview=${callback('onShowReview')};
  const onStartGame=${callback('onStartGame')};
  const onBackToSetup=${back};
  capture({session:wordSoundsSetupReviewSession,words:wsPreloadedWords,generatedContent,history,onShowReview,onStartGame,
    loadResource:(id,words)=>{setGeneratedContent({id,type:'word-sounds',data:words});setWsPreloadedWords(words);setActiveView('word-sounds-generator');}});
  return activeView==='word-sounds-generator'
    ? React.createElement(Generator,{key:wordSoundsSetupReviewSession.key,syllableReviewSession:wordSoundsSetupReviewSession,
       preloadedWords:wsPreloadedWords,glossaryTerms:[],isTeacherMode:true,isProbeMode,probeActivity,wordSoundsLanguage:'en',
       preparedSessionConfig:generatedContent.sessionConfig||{},
       selectedVoice:'af_heart',gradeLevel:'K',t,onShowReview,onStartGame,callTTS,callImagen,onClose:()=>setActiveView('output')})
    : React.createElement('button',{onClick:onBackToSetup},'Back to Setup');
 };
`)(React,Generator);

let root,container,state,props;
const render=async changes=>{props={...props,...changes};await act(async()=>root.render(React.createElement(Host,props)));};
const byText=text=>[...container.querySelectorAll('button')].find(button=>button.textContent.trim()===text);
const click=async button=>{expect(button).toBeTruthy();await act(async()=>button.click());};
const change=async(selector,value)=>{const input=container.querySelector(selector);expect(input).toBeTruthy();await act(async()=>Simulate.change(input,{target:{value}}));};
const clip=byte=>{const bytes=Buffer.alloc(68);bytes.write('RIFF');bytes.write('WAVE',8);bytes[60]=byte;return {mime:'audio/wav',base64:bytes.toString('base64'),source:'teacher_recording'};};
const words=()=>[
  {word:'cat',targetWord:'cat',phonemes:['k','a','t'],_ttsAssets:{cat:clip(1),dog:clip(2),'as in':clip(3),log:clip(4),fog:clip(5),map:clip(6),sun:clip(7),zebra:clip(8)},
   _decodingAssets:{cat:'cat-picture',dog:'dog-picture',log:'log-picture',fog:'fog-picture',map:'map-picture',sun:'sun-picture',zebra:'zebra-picture'},
   _aacAssets:{cat:'cat-symbol',dog:'dog-symbol',log:'log-symbol',fog:'fog-symbol',map:'map-symbol',sun:'sun-symbol',zebra:'zebra-symbol'}},
  {word:'dog',targetWord:'dog',phonemes:['d','o','g'],blendingDistractors:['log','fog']},
];
const lessonDraft=()=>({includeGlossary:false,includeLessonPlan:true,prepareScope:'lesson',
  lessonPlan:{blending:{enabled:true,count:2}},lessonPlanOrder:['blending'],wordSoundsSessionGoal:12});
beforeEach(()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  window.AlloModules={WordSoundsPronunciations:{lookup:()=>['1']}};
  window.WORD_FAMILY_PRESETS={at:['cat','hat']};window.SIGHT_WORD_PRESETS={first:['the']};
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
  props={initialWords:words(),capture:value=>{state=value;}};
});
afterEach(()=>{act(()=>root.unmount());container.remove();vi.unstubAllGlobals();});

describe('selected pack media survives complete preparation',()=>{
  it('keeps selected target/choice teacher media from an unselected first row without providers, pruning unrelated media',async()=>{
    await render({draft:lessonDraft()});
    const original=structuredClone(props.initialWords);
    await click(container.querySelector('button[aria-label="cat: selected"]'));
    await click(byText('Start Activity'));
    const saved=state.generatedContent.data;
    expect(saved.map(item=>item.word)).toEqual(['dog']);
    expect(saved[0].activityItems.blending.options.sort()).toEqual(['cat','dog','fog','log','map','sun']);
    expect(saved[0]._ttsAssets.dog).toEqual(original[0]._ttsAssets.dog);
    expect(saved[0]._ttsAssets.log).toEqual(original[0]._ttsAssets.log);
    expect(saved[0]._ttsAssets.zebra).toBeUndefined();
    expect(saved[0]._decodingAssets).toEqual({cat:'cat-picture',dog:'dog-picture',log:'log-picture',fog:'fog-picture',map:'map-picture',sun:'sun-picture'});
    expect(saved[0]._aacAssets).toEqual({cat:'cat-symbol',dog:'dog-symbol',log:'log-symbol',fog:'fog-symbol',map:'map-symbol',sun:'sun-symbol'});
    expect(props.initialWords).toEqual(original);
  });

  it('retains shared teacher clips ahead of bank/provider replacements and applies a newly approved clip first',async()=>{
    const provider=vi.fn(async()=> 'data:audio/wav;base64,'+clip(9).base64);
    const imageProvider=vi.fn(async()=> 'replacement-image');
    window.loadWordAudioBank=vi.fn(async()=>{});window._CACHE_WORD_AUDIO_BANK={dog:'data:audio/wav;base64,'+clip(8).base64};
    const approved=clip(7);
    await render({draft:{...lessonDraft(),includeAacImages:true},approvedAudio:{'en:dog':approved}});
    await click(container.querySelector('button[aria-label="cat: selected"]'));
    await render({callTTS:provider,callImagen:imageProvider});
    await click(byText('Start Activity'));
    expect(state.generatedContent.data[0]._ttsAssets.dog).toEqual(approved);
    expect(provider.mock.calls.map(call=>call[0])).not.toContain('dog');
    expect(imageProvider).not.toHaveBeenCalled();
    delete window.loadWordAudioBank;delete window._CACHE_WORD_AUDIO_BANK;
  });

  it('keeps the latest legacy media bucket even when its row is deselected',async()=>{
    const initialWords=words(),latest=clip(9);
    initialWords[1]._ttsAssets={dog:clip(6)};
    initialWords[1]._decodingAssets={dog:'older-dog-picture'};
    initialWords[1]._aacAssets={dog:'older-dog-symbol'};
    initialWords.push({word:'fox',phonemes:['f','o','k','s'],_ttsAssets:{dog:latest},
      _decodingAssets:{dog:'latest-dog-picture'},_aacAssets:{dog:'latest-dog-symbol'}});
    await render({initialWords,draft:lessonDraft()});
    await click(container.querySelector('button[aria-label="cat: selected"]'));
    await click(container.querySelector('button[aria-label="fox: selected"]'));
    await click(byText('Start Activity'));
    expect(state.generatedContent.data[0]._ttsAssets.dog).toEqual(latest);
    expect(state.generatedContent.data[0]._decodingAssets.dog).toBe('latest-dog-picture');
    expect(state.generatedContent.data[0]._aacAssets.dog).toBe('latest-dog-symbol');
  });

  it('removes dependencies of deselected activities and respects an explicit AAC default off',async()=>{
    const initialWords=words();
    initialWords[1]._ttsRequiredKeys=['zebra'];initialWords[1]._aacDefaultOn=true;
    await render({initialWords,draft:{...lessonDraft(),aacDefaultOn:false,
      lessonPlan:{counting:{enabled:true,count:2}},lessonPlanOrder:['counting']}});
    await click(container.querySelector('button[aria-label="cat: selected"]'));
    await click(byText('Start Activity'));
    const saved=state.generatedContent.data[0];
    expect(Object.keys(saved.activityItems)).toEqual(['counting']);
    expect(Object.keys(saved._ttsAssets).sort()).toEqual(['as in','dog']);
    expect(saved._ttsRequiredKeys.sort()).toEqual(['as in','dog']);
    expect(saved._decodingAssets).toEqual({dog:'dog-picture'});
    expect(saved._aacAssets).toBeUndefined();expect(saved._aacDefaultOn).toBeUndefined();
  });

  it('retains speech dependencies for Read & Match choices when preparing only that activity',async()=>{
    const initialWords=words();
    await render({initialWords,draft:{...lessonDraft(),lessonPlan:{decoding:{enabled:true,count:2}},lessonPlanOrder:['decoding']}});
    await click(container.querySelector('button[aria-label="cat: selected"]'));
    await click(byText('Start Activity'));
    const saved=state.generatedContent.data[0];
    expect(saved.activityItems.decoding.choices.length).toBeGreaterThan(1);
    for(const word of saved.activityItems.decoding.choices) {
      expect(saved._ttsRequiredKeys).toContain(word);
      if(initialWords[0]._ttsAssets[word]) expect(saved._ttsAssets[word]).toEqual(initialWords[0]._ttsAssets[word]);
    }
    expect(saved._ttsAssets.cat).toEqual(initialWords[0]._ttsAssets.cat);
  });
});

describe('authoring configuration follows the current resource',()=>{
  it('keeps a complete large form and its config-only occurrence IDs, including a selected subset',async()=>{
    const initialWords=Array.from({length:12},(_,index)=>({word:['cat','dog','sun','hat','map','bed','cup','pin','log','fan','bat','fox'][index],phonemes:['k','a','t'],
      activityItems:{isolation:{position:index%3,correctSound:['k','a','t'][index%3],options:['k','a','t']}}}));
    initialWords.splice(2,0,{...initialWords[0],activityItems:{isolation:{position:2,correctSound:'t',options:['t','a','k']}}});
    const itemIds=initialWords.map((_,index)=>'authored-'+index);
    await render({initialWords,initialConfig:{fixedForm:true,itemIds},draft:{includeGlossary:false,probeActivitySel:'isolation'}});
    expect(container.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(13); // twelve words plus Assessment
    await click(byText('Start Activity'));
    expect(state.generatedContent.data).toHaveLength(13);
    expect(state.generatedContent.sessionConfig.itemIds).toEqual(itemIds);
    await click(byText('Back to Setup'));
    await click(container.querySelector('button[aria-label="dog: selected"]'));
    await click(byText('Start Activity'));
    expect(state.generatedContent.sessionConfig.itemIds).toEqual(itemIds.filter(id=>id!=='authored-1'));
    expect(state.generatedContent.data.filter(item=>item.word==='cat')).toHaveLength(2);
  });

  it('preserves repeated assessment occurrences, IDs and distinct boards through Back to Setup and Start',async()=>{
    const initialWords=[
      {id:'cat-first',word:'cat',phonemes:['k','a','t'],activityItems:{isolation:{position:0,correctSound:'k',options:['k','m','t']}}},
      {id:'cat-final',word:'cat',phonemes:['k','a','t'],activityItems:{isolation:{position:2,correctSound:'t',options:['t','k','m']}}},
      {id:'dog',word:'dog',phonemes:['d','o','g'],activityItems:{isolation:{position:1,correctSound:'o',options:['o','g','d']}}},
    ];
    const original=structuredClone(initialWords);
    await render({initialWords,draft:{includeGlossary:false,sessionType:'assessment',probeActivitySel:'isolation'}});
    await click(byText('Review Words'));await click(byText('Back to Setup'));
    await click(byText('Start Activity'));
    expect(state.generatedContent.data.map(item=>item.id)).toEqual(['cat-first','cat-final','dog']);
    expect(state.generatedContent.data.map(item=>item.activityItems.isolation)).toEqual(original.map(item=>item.activityItems.isolation));
    expect(state.generatedContent.sessionConfig).toMatchObject({fixedForm:true,sessionGoal:3,probeItemCount:3,itemIds:['cat-first','cat-final','dog']});
    await click(byText('Back to Setup'));await click(byText('Start Activity'));
    expect(state.generatedContent.data.map(item=>item.id)).toEqual(['cat-first','cat-final','dog']);
    expect(initialWords).toEqual(original);
  });

  it('keeps ordinary practice vocabulary selection unique when its source has repeated targets',async()=>{
    const initialWords=words();initialWords.push({...initialWords[0],id:'cat-repeat'});
    await render({initialWords,draft:lessonDraft()});
    expect(container.querySelectorAll('button[aria-label="cat: selected"]')).toHaveLength(1);
    await click(byText('Start Activity'));
    expect(state.generatedContent.data.map(item=>item.word)).toEqual(['cat','dog']);
    expect(state.generatedContent.sessionConfig.fixedForm).toBe(false);
  });

  it('preserves real control edits through Review and Back to Setup',async()=>{
    const draft={...lessonDraft(),orthoSessionGoal:7,aacDefaultOn:true,imageVisibilityMode:'off',probeStudent:'Learner A',
      imageTheme:'pencil',imageThemeMode:'override',selectedFamily:'at',selectedSightWordList:'first',
      taughtPatternsText:'a, t',knownWordsText:'dog',syllableRange:{min:2,max:6},aiTopic:'Space'};
    await render({draft});
    await change('[data-help-key="ws_gen_session_slider"]','15');
    await click(container.querySelector('[data-help-key="ws_gen_src_custom"] input'));
    const custom=container.querySelector('textarea');
    expect(custom).toBeTruthy();await act(async()=>Simulate.change(custom,{target:{value:'customword'}}));
    const session=state.session;
    await click(byText('Review Words'));await click(byText('Back to Setup'));
    expect(state.session).toBe(session);
    expect(container.querySelector('[data-help-key="ws_gen_session_slider"]').value).toBe('15');
    expect(container.querySelector('textarea').value).toBe('customword');
    expect(state.session.setupDraft).toMatchObject({...draft,wordSoundsSessionGoal:15,includeCustom:true,customText:'customword'});
    await click(byText('Start Activity'));
    const preparedSession=state.session;
    expect(preparedSession).toBe(session);
    await click(byText('Back to Setup'));
    expect(state.session).toBe(session);
    expect(state.session.setupDraft.wordSoundsSessionGoal).toBe(15);
  });

  it('starts fresh on resource replacement and rejects stale review and launch callbacks',async()=>{
    await render({draft:{...lessonDraft(),probeStudent:'Learner A',includeAacImages:true}});
    const previous=state, heldReview=state.onShowReview,heldStart=state.onStartGame;
    await act(async()=>{
      state.loadResource('pack-b',[{word:'table',phonemes:['t','a','b','l']}]);
      heldReview(previous.words);heldStart(previous.words,[],null,'old',{isProbe:true,student:'Learner A'},{});
    });
    // Host test seed applies only to the initial session; a distinct resource
    // starts with its own defaults in the actual Studio.
    expect(state.session).not.toBe(previous.session);
    expect(state.session.setupDraft.probeStudent).toBeUndefined();
    expect(state.session.setupDraft.includeAacImages).toBeUndefined();
    const currentWords=state.words,currentResource=state.generatedContent;
    await act(async()=>{heldReview(previous.words);heldStart(previous.words,[],null,'old',{isProbe:true,student:'Learner A'},{});});
    expect(state.words).toBe(currentWords);expect(state.generatedContent).toBe(currentResource);
    expect(state.generatedContent.id).toBe('pack-b');
  });
});
