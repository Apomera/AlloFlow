// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_module.js', 'utf8');
const between = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Missing production seam: ${start}`);
  return source.slice(from, to);
};
const core = {packAudioKey:value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ')};
const Host = new Function('React', 'WS_CORE', `return function Host({initialWords,owner,language='en',epoch=0,review=true,imageProvider,editProvider,taskProvider,capture,toasts}) {
  const [preloadedWords,setWords] = React.useState(initialWords);
  const wordsRef = React.useRef(preloadedWords); wordsRef.current=preloadedWords;
  const setWsPreloadedWords = update => { wordsRef.current=typeof update==='function'?update(wordsRef.current):update; setWords(wordsRef.current); };
  const setPreloadedWords = setWsPreloadedWords;
  const [generatingImageIndex,setGeneratingImageIndex] = React.useState(null);
  const [generatingImageSet,setGeneratingImageSet] = React.useState(new Set());
  const isMountedRef=React.useRef(true); React.useEffect(()=>()=>{isMountedRef.current=false;},[]);
  const advanceEpochRef=React.useRef(epoch);advanceEpochRef.current=epoch;
  const runtimeIdentityKey='learner|session|resource',reviewAuthoringSession=owner,wordSoundsLanguage=language,showReviewPanel=review;
  const [wordSoundsPhonemes,setWordSoundsPhonemes]=React.useState(initialWords[0]);
  const lastWordForManipulation=React.useRef(null);
  const generateManipulationTask=taskProvider,callImagen=imageProvider,callGeminiImageEdit=editProvider;
  const addToast=(...args)=>toasts.push(args),warnLog=()=>{};
  ${between('const reviewGenerationRef =', '// Refresh audio for a single distractor word:')}
  ${between('const handleGenerateWordImage =', 'React.useEffect(() => {\n        if (wordSoundsPhonemes && !nextWordBuffer')}
  capture({words:preloadedWords,setWords:setWsPreloadedWords,generate:handleGenerateWordImage,refine:handleRefineWordImage,
    regenerateTask:handleRegenerateManipulationTask,busy:generatingImageSet,busyIndex:generatingImageIndex,requests:reviewGeneration.images,
    live:wordSoundsPhonemes,setLive:setWordSoundsPhonemes});
  return null;
};`)(React,core);

const row = (word, extra={}) => ({id:word,word,phonemes:[word],...extra});
const deferred = () => {let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
let root,container,state,props;
const render = async next => {props={...props,...next};await act(async()=>root.render(React.createElement(Host,props)));};
const run = async action => {let result;await act(async()=>{result=await action(state);});return result;};
const start = async action => {let pending;await act(async()=>{pending=action(state);});return {pending};};
const finish = async (request,value,pending) => {let result;await act(async()=>{request.resolve(value);result=await pending;});return result;};
beforeEach(()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
  props={initialWords:[row('cat'),row('dog',{activityItems:{manipulation:{task:{targetWord:'dog'}}}})],owner:{},toasts:[],
    imageProvider:vi.fn(async()=> 'data:image/png;base64,NEW'),editProvider:vi.fn(async()=> 'data:image/png;base64,EDIT'),
    taskProvider:vi.fn(async()=>({targetWord:'cat',answer:'bat'})),capture:value=>{state=value;}};
});
afterEach(()=>{act(()=>root?.unmount());container.remove();vi.unstubAllGlobals();});

describe('Sound Swap generation owns its original row and request',()=>{
  it('follows a stable row through reorder without changing the other task',async()=>{
    const request=deferred();await render({taskProvider:()=>request.promise});
    const dog=state.words[1],{pending}=await start(state=>state.regenerateTask(0));
    await run(state=>state.setWords(words=>[words[1],words[0]]));
    expect(await finish(request,{targetWord:'cat',answer:'bat'},pending)).toBe(true);
    expect(state.words[0]).toBe(dog);
    expect(state.words[1].manipulationTask.targetWord).toBe('cat');
  });

  it.each(['delete','rename','phonemes','replacement','language','leave','epoch'])('rejects a late task after %s',async change=>{
    const request=deferred();await render({taskProvider:()=>request.promise});
    const {pending}=await start(state=>state.regenerateTask(0));
    if(change==='delete') await run(state=>state.setWords(words=>words.slice(1)));
    if(change==='rename') await run(state=>state.setWords(words=>words.map((word,i)=>i?word:{...word,word:'fish'})));
    if(change==='phonemes') await run(state=>state.setWords(words=>words.map((word,i)=>i?word:{...word,phonemes:['teacher-edit']})));
    if(change==='replacement') {await run(state=>state.setWords(words=>words.map(word=>({...word}))));await render({owner:{}});}
    if(change==='language') await render({language:'fr'});
    if(change==='leave') await render({review:false});
    if(change==='epoch') await render({epoch:1});
    const before=state.words;
    expect(await finish(request,{targetWord:'cat'},pending)).toBe(false);
    expect(state.words).toBe(before);
  });

  it('lets only the newest request update the row and live board',async()=>{
    const first=deferred(),second=deferred();await render({taskProvider:vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)});
    const a=await start(state=>state.regenerateTask(0)),b=await start(state=>state.regenerateTask(0));
    expect(await finish(second,{targetWord:'cat',answer:'new'},b.pending)).toBe(true);
    expect(await finish(first,{targetWord:'cat',answer:'old'},a.pending)).toBe(false);
    expect(state.words[0].manipulationTask.answer).toBe('new');
    expect(state.live.manipulationTask.answer).toBe('new');
  });

  it('keeps a live-board edit made while generation is pending',async()=>{
    const request=deferred();await render({taskProvider:()=>request.promise});
    const {pending}=await start(state=>state.regenerateTask(0));
    await run(state=>state.setLive(previous=>({...previous,manipulationTask:{answer:'teacher'}})));
    await finish(request,{targetWord:'cat',answer:'new'},pending);
    expect(state.live.manipulationTask.answer).toBe('teacher');
  });
});

describe('review image generation lifecycle',()=>{
  it('moves busy state with a reordered word and writes its image to that word',async()=>{
    const request=deferred();await render({imageProvider:()=>request.promise});
    const {pending}=await start(state=>state.generate(0,'cat'));
    expect([...state.busy]).toEqual([0]);
    await run(state=>state.setWords(words=>[words[1],words[0]]));
    expect([...state.busy]).toEqual([1]);
    expect(await finish(request,'data:image/png;base64,CAT',pending)).toBe(true);
    expect(state.words[0].image).toBeUndefined();
    expect(state.words[1].image).toBe('data:image/png;base64,CAT');
    expect(state.busy.size).toBe(0);expect(state.requests.size).toBe(0);
  });

  it.each(['delete','manual-image','replacement','close'])('keeps current images after %s while a request is pending',async change=>{
    const request=deferred();let signal;await render({imageProvider:(_prompt,_size,_style,options)=>{signal=options.signal;return request.promise;}});
    const {pending}=await start(state=>state.generate(0,'cat'));
    if(change==='delete') await run(state=>state.setWords(words=>words.slice(1)));
    if(change==='manual-image') await run(state=>state.setWords(words=>words.map((word,i)=>i?word:{...word,image:'teacher-image'})));
    if(change==='replacement') {await run(state=>state.setWords(words=>words.map(word=>({...word}))));await render({owner:{}});}
    if(change==='close') await render({review:false});
    const before=state.words;
    expect(signal.aborted).toBe(true);
    expect(state.busy.size).toBe(0);expect(state.requests.size).toBe(0);
    expect(await finish(request,'data:image/png;base64,STALE',pending)).toBe(false);
    expect(state.words).toBe(before);expect(state.busy.size).toBe(0);expect(state.requests.size).toBe(0);
  });

  it('permits more than five sequential images and clears every completed request',async()=>{
    await render({initialWords:['cat','dog','fish','tree','bird','house','apple'].map(word=>row(word))});
    for(let i=0;i<7;i++) expect(await run(state=>state.generate(i,state.words[i].word))).toBe(true);
    expect(props.imageProvider).toHaveBeenCalledTimes(7);
    expect(state.words.every(word=>word.image)).toBe(true);
    expect(state.requests.size).toBe(0);expect(state.busy.size).toBe(0);expect(state.busyIndex).toBeNull();
  });

  it('enforces five actual concurrent requests even before React rerenders and frees capacity on completion',async()=>{
    const requests=Array.from({length:6},deferred);let call=0;
    await render({initialWords:['cat','dog','fish','tree','bird','house'].map(word=>row(word)),imageProvider:vi.fn(()=>requests[call++].promise)});
    let pending;
    await act(async()=>{pending=state.words.map((word,index)=>state.generate(index,word.word));});
    expect(props.imageProvider).toHaveBeenCalledTimes(5);expect(await pending[5]).toBe(false);
    expect(state.busy.size).toBe(5);
    await finish(requests[0],'image-0',pending[0]);
    expect(state.busy.size).toBe(4);
    const retry=await start(state=>state.generate(5,'house'));
    expect(props.imageProvider).toHaveBeenCalledTimes(6);
    for(let i=1;i<5;i++) await finish(requests[i],'image-'+i,pending[i]);
    await finish(requests[5],'image-5',retry.pending);
    expect(state.busy.size).toBe(0);expect(state.requests.size).toBe(0);
  });

  it.each(['failure','empty','unavailable'])('releases capacity and preserves saved art on %s',async kind=>{
    const provider=kind==='unavailable'?undefined:kind==='empty'?async()=>null:async()=>{throw new Error('provider failed');};
    await render({initialWords:[row('cat',{image:'data:image/png;base64,OLD'})],imageProvider:provider});
    expect(await run(state=>state.generate(0,'cat'))).toBe(false);
    expect(state.words[0].image).toBe('data:image/png;base64,OLD');expect(state.requests.size).toBe(0);expect(state.busy.size).toBe(0);
  });

  it('keeps a newer image generation when an older refinement finishes later',async()=>{
    const edit=deferred(),image=deferred();await render({initialWords:[row('cat',{image:'data:image/png;base64,OLD'})],editProvider:()=>edit.promise,imageProvider:()=>image.promise});
    const older=await start(state=>state.refine(0,'clean background'));
    const newer=await start(state=>state.generate(0,'cat'));
    expect(state.requests.size).toBe(1);
    expect(await finish(image,'data:image/png;base64,NEW',newer.pending)).toBe(true);
    expect(await finish(edit,'data:image/png;base64,OLD-EDIT',older.pending)).toBe(false);
    expect(state.words[0].image).toBe('data:image/png;base64,NEW');expect(state.requests.size).toBe(0);
  });

  it.each(['owner','language','epoch'])('aborts five abandoned images and releases capacity after a new %s',async context=>{
    const requests=Array.from({length:6},deferred),signals=[];let call=0;
    await render({initialWords:['cat','dog','fish','tree','bird','house'].map(word=>row(word)),
      imageProvider:vi.fn((_prompt,_size,_style,options)=>{signals.push(options.signal);return requests[call++].promise;})});
    let pending;
    await act(async()=>{pending=state.words.slice(0,5).map((word,index)=>state.generate(index,word.word));});
    expect(state.requests.size).toBe(5);
    await render(context==='owner'?{owner:{}}:context==='language'?{language:'fr'}:{epoch:1});
    expect(signals.every(signal=>signal.aborted)).toBe(true);
    expect(state.requests.size).toBe(0);expect(state.busy.size).toBe(0);
    const current=await start(state=>state.generate(5,'house'));
    expect(props.imageProvider).toHaveBeenCalledTimes(6);
    expect(state.requests.size).toBe(1);expect(signals[5].aborted).toBe(false);
    for(let i=0;i<5;i++) expect(await finish(requests[i],'stale-'+i,pending[i])).toBe(false);
    expect(state.requests.size).toBe(1);expect([...state.busy]).toEqual([5]);
    expect(await finish(requests[5],'house-image',current.pending)).toBe(true);
    expect(state.words.slice(0,5).every(word=>!word.image)).toBe(true);
    expect(state.words[5].image).toBe('house-image');
  });

  it('aborts a superseded image without retaining a concurrency slot or clearing the new request',async()=>{
    const requests=[deferred(),deferred()],signals=[];let call=0;
    await render({imageProvider:vi.fn((_prompt,_size,_style,options)=>{signals.push(options.signal);return requests[call++].promise;})});
    const first=await start(state=>state.generate(0,'cat'));
    const second=await start(state=>state.generate(0,'cat'));
    expect(signals[0].aborted).toBe(true);expect(signals[1].aborted).toBe(false);
    expect(state.requests.size).toBe(1);
    expect(await finish(requests[0],'old',first.pending)).toBe(false);
    expect(state.requests.size).toBe(1);expect([...state.busy]).toEqual([0]);
    expect(await finish(requests[1],'new',second.pending)).toBe(true);
    expect(state.words[0].image).toBe('new');
  });

  it('stores decoding choice art separately without replacing teacher art or the decoding board',async()=>{
    const board={options:['cat','dog','fish'],answer:'cat'};
    await render({initialWords:[row('cat',{image:'teacher-cat',activityItems:{decoding:board},_decodingAssets:{fish:'teacher-fish'}})]});
    expect(await run(state=>state.generate(0,'Dog',{purpose:'decoding-choice'}))).toBe(true);
    expect(state.words[0].image).toBe('teacher-cat');
    expect(state.words[0]._decodingAssets).toEqual({fish:'teacher-fish',dog:'data:image/png;base64,NEW'});
    expect(state.words[0].activityItems.decoding).toBe(board);
  });

  it('allows transient audio status updates but protects substantive row edits',async()=>{
    const request=deferred();await render({imageProvider:()=>request.promise});
    const {pending}=await start(state=>state.generate(0,'cat'));
    await run(state=>state.setWords(words=>words.map(word=>({...word,_audioRequested:true,ttsReady:false}))));
    expect(await finish(request,'image',pending)).toBe(true);
    expect(state.words[0]._audioRequested).toBe(true);
  });

  it('reuses saved choice art from another row without generating or copying over it',async()=>{
    await render({initialWords:[row('cat'),row('fish',{_aacAssets:{dog:'teacher-dog'}})]});
    expect(await run(state=>state.generate(0,'dog',{purpose:'decoding-choice'}))).toBe(true);
    expect(props.imageProvider).not.toHaveBeenCalled();
    expect(state.words[0]._decodingAssets).toBeUndefined();
    expect(state.words[1]._aacAssets.dog).toBe('teacher-dog');
  });

  it('keeps choice art saved elsewhere while a generated replacement is pending',async()=>{
    const request=deferred();await render({imageProvider:()=>request.promise});
    const {pending}=await start(state=>state.generate(0,'dog',{purpose:'decoding-choice'}));
    await run(state=>state.setWords(words=>words.map(word=>word.word==='dog'?{...word,image:'teacher-dog'}:word)));
    expect(await finish(request,'generated-dog',pending)).toBe(true);
    expect(state.words[0]._decodingAssets).toBeUndefined();
    expect(state.words[1].image).toBe('teacher-dog');expect(state.requests.size).toBe(0);
  });

  it('rejects a copied replacement row without an explicit authoring owner',async()=>{
    const request=deferred();await render({owner:null,imageProvider:()=>request.promise});
    const {pending}=await start(state=>state.generate(0,'cat'));
    await run(state=>state.setWords(words=>words.map(word=>({...word}))));
    expect(await finish(request,'image',pending)).toBe(false);
  });

  it('does not write or show a success after unmount',async()=>{
    const request=deferred();let signal;await render({imageProvider:(_prompt,_size,_style,options)=>{signal=options.signal;return request.promise;}});
    const {pending}=await start(state=>state.generate(0,'cat'));
    const before=state.words;
    await act(async()=>root.unmount());root=null;
    expect(signal.aborted).toBe(true);expect(state.requests.size).toBe(0);
    expect(await finish(request,'image',pending)).toBe(false);
    expect(state.words).toBe(before);expect(props.toasts.filter(([,kind])=>kind==='success')).toEqual([]);
  });
});
