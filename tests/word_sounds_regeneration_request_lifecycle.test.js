// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act}=React;
const source=readFileSync('word_sounds_module.js','utf8');
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a)throw Error('Missing production boundary: '+start);return source.slice(a,b);}
// Execute the actual cache/glossary fast paths and the full regeneration caller.
// The provider path is deliberately outside this glossary-backed regression.
const fetchPrefix=between('const fetchWordData = React.useCallback(', '          const MAX_RETRIES = 3;');
const regenerateSource=between('const handleRegenerateAll = React.useCallback(', '// Retry TTS prefetch');
const Host=new Function('React',`return function Host({initialWords,glossary,capture}) {
  const [preloadedWords,setWords]=React.useState(initialWords);
  const [regeneratingIndex,setRegeneratingIndex]=React.useState(null);
  const [finished,setFinished]=React.useState(0);
  const [live,setLive]=React.useState(null);
  const pendingRequests=React.useRef(new Map()),latestRequestedWord=React.useRef(null),wordDataCache=React.useRef(new Map());
  const audioInstances=React.useRef(new Map()),audioCache=React.useRef(new Map()),preloadedWordCache=React.useRef(new Map());
  const wordPool=glossary,window={},debugLog=()=>{},warnLog=()=>{},addToast=()=>{},setIsPlayingAudio=()=>{},setPhonemeError=()=>{};
  const setWsPreloadedWords=setWords,setPreloadedWords=setWords;
  const applyWordDataToState=value=>{wordDataCache.current.set(value.word,value);setLive(value);};
  ${fetchPrefix}
    throw Error('Unexpected provider path in glossary fast-path regression');
  },[wordPool]);
  ${regenerateSource}
  capture({words:preloadedWords,pending:pendingRequests.current,fetch:fetchWordData,live,finished,regeneratingIndex});
  return React.createElement('button',{disabled:regeneratingIndex!==null,onClick:()=>{
    handleRegenerateAll().then(()=>setFinished(value=>value+1));
  }},'Regenerate all');
};`)(React);
let container,root,state;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
async function mount(words){await act(async()=>root.render(React.createElement(Host,{initialWords:words,
  glossary:[{word:'cat',phonemes:['k','a','t'],definition:'glossary cat'},{word:'dog',phonemes:['d','o','g'],definition:'glossary dog'}],capture:value=>{state=value;}})));}
describe('glossary request completion and regeneration',()=>{
  it('settles repeated authored targets and a second complete regeneration',async()=>{
    const words=[{word:'cat',itemId:'cat-first'},{word:'cat',itemId:'cat-final'},{word:'dog',itemId:'dog-final'}];
    await mount(words);
    for(let run=1;run<=2;run++){
      await act(async()=>container.querySelector('button').click());
      expect(state.finished).toBe(run);expect(state.regeneratingIndex).toBeNull();expect(state.pending.size).toBe(0);
      expect(state.words.map(word=>word.itemId)).toEqual(['cat-first','cat-final','dog-final']);
      expect(state.words.map(word=>word.definition)).toEqual(['glossary cat','glossary cat','glossary dog']);
      expect(container.querySelector('button').disabled).toBe(false);
    }
  });
  it('returns glossary and cached data and releases each successful request',async()=>{
    await mount([{word:'cat',itemId:'cat'}]);
    let first,second;
    await act(async()=>{first=await state.fetch('cat');second=await state.fetch('cat');});
    expect(first).toMatchObject({word:'cat',phonemes:['k','a','t']});expect(second).toBe(first);
    expect(state.pending.size).toBe(0);
  });
});
