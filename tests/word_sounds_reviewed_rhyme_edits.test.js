// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {transformSync} from '@babel/core';
import {core, coreSource, compileWords} from './helpers/word_sounds_core.js';

const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act,Simulate}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const runtime=readFileSync('word_sounds_module.js','utf8');
const between=(source,start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<0)throw Error('Missing source boundary '+start);
  return source.slice(a,b);
};
const editSource=between(runtime,'      const _ttsTextChanged =','      const handleDeleteWord =');
const useActualEdit=new Function('React','WS_CORE','setWsPreloadedWords','setPreloadedWords','preloadedWordCache','wordDataCache','debugLog','warnLog',
  editSource+';return handleUpdatePreloadedWord;');
const componentSource=readFileSync('misc_components_source.jsx','utf8');
const componentCode=transformSync(componentSource,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx']}).code;
const icons=['Ban','ChevronDown','ChevronLeft','ImageIcon','Play','RefreshCw','Sparkles','Volume2','CheckCircle2','Send'];
const Panel=new Function('React','useState','useEffect','useRef','useContext','LanguageContext','debugLog','warnLog',...icons,
  componentCode+';return WordSoundsReviewPanel;')(
    React,React.useState,React.useEffect,React.useRef,React.useContext,React.createContext({t:key=>key}),()=>{},()=>{},...icons.map(()=>()=>null));
function loadWithCore(file){
  const module={exports:{}},window={};
  const source=readFileSync(file,'utf8').replace(/\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/,
    '// BEGIN GENERATED WORD SOUNDS CORE\n'+coreSource+'\nconst WS_CORE=createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE');
  new Function('globalThis','window','module',source)({window},window,module);
  return module.exports;
}
const DI=loadWithCore('word_sounds_di_loader.js'),readiness=loadWithCore('word_sounds_readiness_contract.js');
let root,container,current;
const initial=()=>({word:'banana',targetWord:'banana',phonemes:['b','schwa','n','a','n','schwa'],ttsReady:true,
  rhymeWord:'',rhymeDistractors:['cat','sun'],rhymePronunciation:{word:'old',phonemes:['o','l','d']},
  _rhymeRejectedAnswer:'old',activityItems:{rhyming:{answer:'old',options:['old','cat','sun'],supported:false,
    contentStatus:'teacher_review_required',pronunciations:{targetWord:'banana',answer:'old'}}}});
function Host(){
  const [words,setWords]=React.useState(()=>[initial()]);
  const cache=React.useRef(new Map());
  const wordCache=React.useRef(new Map());
  const edit=useActualEdit(React,core,setWords,null,cache,wordCache,()=>{},()=>{});
  current={words,edit};
  return React.createElement(Panel,{preloadedWords:words,activitySequence:['rhyming'],currentActivity:'rhyming',
    onUpdateWord:edit,onClose(){},onStartActivity(){},onPlayAudio(){},t:key=>key});
}
async function mount(){
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
  await act(async()=>root.render(React.createElement(Host)));
  await act(async()=>container.querySelector('button[aria-label="common.expand"]').click());
}
const correct=()=>container.querySelector('input[aria-label="common.rhyme_time_options"]');
const change=async(input,value)=>act(async()=>Simulate.change(input,{target:{value}}));
function installRuntime(item){
  const start=runtime.lastIndexOf('          const currentWord = currentWordSoundsWord || wordSoundsPhonemes?.word;',runtime.indexOf('// Keep-existing-board check FIRST:'));
  const at=runtime.indexOf('const correctRhyme =',start);
  const end=runtime.indexOf('          } else {',runtime.indexOf('            lastWordForRhyming.current = currentWord;',at));
  let options,review;
  const scope={currentWordSoundsWord:item.word,wordSoundsPhonemes:item,lastWordForRhyming:{current:null},rhymeOptions:[],
    setRhymeOptions:value=>{options=value;},setRhymeReviewRequired:value=>{review=value;},preloadedWords:[item],
    wsLangCaps:{isEnglish:true},WS_CORE:core,debugLog(){},advanceEpochRef:{current:1},rhymePresentationRef:{current:0},
    rhymeSessionRef:{current:core.createRhymeSession()},lastRhymeOccurrenceRef:{current:null}};
  new Function(...Object.keys(scope),runtime.slice(start,end)+'\n          }')(...Object.values(scope));
  return {options,review};
}
beforeEach(()=>vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true));
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;container?.remove();vi.unstubAllGlobals();});

describe('real teacher rhyme edits carry reviewed authority through delivery',()=>{
  it('takes actual correct-answer and choice UI edits through the production row handler, compiler, portable form, DI and runtime',async()=>{
    await mount();
    expect(core.rhymePairStatus({word:'banana',answer:'bandana',phonemes:initial().phonemes}).supported).toBe(false);
    await change(correct(),'bandana');
    let row=current.words[0];
    expect(row.activityItems.rhyming).toMatchObject({targetWord:'banana',answer:'bandana',teacherEdited:true,supported:true});
    expect(row.rhymePronunciation).toBeUndefined();expect(row._rhymeRejectedAnswer).toBeUndefined();
    const choices=correct().parentElement.querySelectorAll('input[aria-label="common.enter_d"]');
    await change(choices[0],'hat');
    row=current.words[0];
    expect(row.activityItems.rhyming.options).toEqual(['bandana','hat','sun']);
    const board=structuredClone(row.activityItems.rhyming);
    const compiled=compileWords(structuredClone(current.words));
    expect(compiled[0].activityItems.rhyming).toEqual(board);
    const saved=JSON.parse(JSON.stringify(readiness.portable({type:'word-sounds',isProbeMode:true,lessonPlanSequence:['rhyming'],data:compiled}))).data[0];
    expect(saved.activityItems.rhyming).toEqual(board);
    expect(DI.presenterLines('rhyming',saved,{language:'en',words:[saved]}).model).toMatch(/Banana and bandana rhyme/);
    expect(installRuntime(saved)).toEqual({options:board.options,review:false});
    expect(core.rhymePairStatus({word:'other',answer:'bandana',prepared:board}).supported).toBe(false);
  });

  it('keeps blank answer/choice edits visible but unplayable until the teacher completes them',async()=>{
    await mount();await change(correct(),' bandana ');
    expect(correct().value).toBe(' bandana ');
    const add=[...correct().parentElement.querySelectorAll('button')].find(button=>button.textContent==='word_sounds.add_distractor');
    await act(async()=>add.click());
    expect(current.words[0].rhymeDistractors).toEqual(['cat','sun','']);
    expect(current.words[0].activityItems.rhyming).toMatchObject({teacherEdited:true,supported:false});
    expect(installRuntime(current.words[0]).review).toBe(true);
    const choices=correct().parentElement.querySelectorAll('input[aria-label="common.enter_d"]');
    await change(choices[2],'moon');
    expect(current.words[0].activityItems.rhyming).toMatchObject({supported:true,options:['bandana','cat','sun','moon']});
    await change(correct(),'');
    expect(correct().value).toBe('');
    expect(current.words[0].activityItems.rhyming.supported).toBe(false);
    expect(DI.presenterLines('rhyming',current.words[0],{language:'en',words:current.words})).toBeNull();
  });
});
