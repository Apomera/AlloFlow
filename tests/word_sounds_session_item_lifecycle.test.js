import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let Modal, root, host, state, currentOverrides, originalAudio, originalGlobalAudio;
const played = [];

class CompleteAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.currentTime = 0; this.listeners = new Map(); queueMicrotask(()=>this.dispatch('canplaythrough')); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name,new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  dispatch(name) { this['on'+name]?.(); for(const fn of this.listeners.get(name)||[]) fn(); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(()=>{ this.dispatch('loadedmetadata'); this.dispatch('canplaythrough'); this.dispatch('canplay'); }); }
  removeAttribute() {}
  play() { this.paused = false; played.push(this.src); setTimeout(()=>{ if(!this.paused) { this.paused=true;this.ended=true;this.dispatch('ended'); } },1);return Promise.resolve(); }
  pause() { this.paused=true; this.dispatch('pause'); }
}

beforeAll(()=>{ installCanvasStub(); ({WordSoundsModal:Modal}=setupWordSounds()); });
beforeEach(()=>{
  vi.useFakeTimers({now:1700000000000,toFake:['Date','setTimeout','clearTimeout','setInterval','clearInterval']});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalAudio=window.Audio;originalGlobalAudio=globalThis.Audio;
  window.Audio=globalThis.Audio=CompleteAudio;played.length=0;
  window.__ALLO_ISOLATION_AUDIO={'1st':'data:audio/mp3;base64,FIRST','3rd':'data:audio/mp3;base64,THIRD'};
  window.__ALLO_INSTRUCTION_AUDIO={inst_counting:'data:audio/mp3;base64,COUNT'};
  window.__ALLO_PHONEME_AUDIO_BANK={cat:'data:audio/mp3;base64,CAT',dog:'data:audio/mp3;base64,DOG',k:'data:audio/mp3;base64,K',a:'data:audio/mp3;base64,A',t:'data:audio/mp3;base64,T',d:'data:audio/mp3;base64,D',o:'data:audio/mp3;base64,O',g:'data:audio/mp3;base64,G'};
});
afterEach(async()=>{
  if(root)await act(async()=>root.unmount());root=null;host?.remove();
  window.Audio=originalAudio;globalThis.Audio=originalGlobalAudio;
  delete window.__ALLO_ISOLATION_AUDIO;delete window.__ALLO_INSTRUCTION_AUDIO;delete window.__ALLO_PHONEME_AUDIO_BANK;
  vi.clearAllTimers();vi.useRealTimers();delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

function pack(word,itemId,position=0) {
  const phonemes=word==='dog'?['d','o','g']:['k','a','t'];
  return {...makePackItem(),id:itemId,itemId,word,targetWord:word,displayWord:word,phonemes,
    activityItems:{counting:{answer:3,options:[1,2,3,4,5]},isolation:{position,correctSound:phonemes[position],options:[...phonemes]}}};
}
async function tick(ms) { await act(async()=>vi.advanceTimersByTimeAsync(ms)); }
async function render(overrides) {
  currentOverrides={...currentOverrides,...overrides};
  await act(async()=>root.render(React.createElement(PlayerHost,currentOverrides)));
}
function PlayerHost(overrides) {
  const [activity,setActivity]=React.useState(overrides.activity||'isolation');
  const [word,setWord]=React.useState(null),[data,setData]=React.useState(null);
  const [score,setScore]=React.useState({correct:0,total:0,streak:0}),[history,setHistory]=React.useState([]);
  const [feedback,setFeedback]=React.useState(null);
  state={activity,word,data,score,history,feedback};
  return React.createElement(Modal,{...baseProps(activity),allowRuntimeAi:false,isTeacherMode:false,
    disableAnimations:true,sessionId:'session-a',wordSoundsSessionGoal:20,
    wsPreloadedWords:overrides.items,
    wordSoundsDifficulty:'easy',isProbeMode:true,
    sessionConfig:{fixedForm:true,probeItemCount:overrides.items.length},...overrides,
    wordSoundsActivity:activity,setWordSoundsActivity:setActivity,
    currentWordSoundsWord:word,setCurrentWordSoundsWord:setWord,
    wordSoundsPhonemes:data,setWordSoundsPhonemes:setData,
    wordSoundsScore:score,setWordSoundsScore:setScore,
    wordSoundsHistory:history,setWordSoundsHistory:setHistory,
    wordSoundsFeedback:feedback,setWordSoundsFeedback:setFeedback});
}
async function mount(overrides) {
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);currentOverrides={};
  await render(overrides);await tick(120);
}
async function clickNumber(n) {
  const target=host.querySelector(`[role="button"][aria-label="Number ${n}"]`);
  expect(target).toBeTruthy();await act(async()=>target.click());
}
async function clickSound(sound) {
  // Sound-only tiles are numbered for accessible access; their order follows
  // the authored prepared board and does not reveal printed phoneme labels.
  const index=state.data.activityItems.isolation.options.indexOf(sound);
  const target=host.querySelector(`button[aria-label="Choose Sound ${index+1}"]`);
  expect(target).toBeTruthy();await act(async()=>target.click());
}

describe('authored Word Sounds item advancement',()=>{
  it('preserves the exact prepared blending choices and order on the first and repeated target',async()=>{
    const items=[pack('cat','blend-first'),pack('cat','blend-second')];
    const options=[['bed','cat','sun'],['map','pig','cat']];
    const assets=Object.fromEntries(['bed','cat','sun','map','pig'].map(word=>[word,{mime:'audio/webm',base64:Buffer.from(word).toString('base64')}]));
    items.forEach((item,index)=>{
      item.activityItems.blending={answer:'cat',options:options[index]};
      item.blendingDistractors=index===0?['cot','cut','bat']:['dog','hat','bat'];
      item._ttsAssets={...item._ttsAssets,...assets};
    });
    await mount({activity:'blending',items});
    for(let index=0;index<2;index++) {
      await tick(60); // Let startActivity release its brief audio cancellation window.
      expect(state.data).toBe(items[index]);
      const choices=host.querySelectorAll('button[data-ws-blend-choice]');
      expect(choices).toHaveLength(3);
      // Named by what they show ("Option N" here, letters hidden), not "Volume".
      for(const choice of choices){expect(choice.getAttribute('aria-label')).toBeNull();expect(choice.textContent.trim()).toMatch(/^Option [1-3]$/);}
      const listen=host.querySelector('button[aria-label="common.listen_to_this_option"]');
      await act(async()=>listen.click());await tick(2);
      expect(played).toContain(`data:audio/webm;base64,${assets[options[index][0]].base64}`);
      await act(async()=>choices[options[index].indexOf('cat')].click());
      expect(state.history.at(-1)).toMatchObject({itemId:items[index].itemId,correct:true});
      await tick(801);
    }
    expect(state.score).toMatchObject({correct:2,total:2});
  });

  it('rebuilds isolation when a fixed form intentionally repeats the same object instance',async()=>{
    const item=pack('cat','shared');
    await mount({items:[item,item],sessionConfig:{fixedForm:true,probeItemCount:2,itemIds:['first','second']}});
    await clickSound('k');await tick(801);
    expect(state.data).toBe(item);
    expect(host.querySelector('button[aria-label="Choose Sound 1"]')).toBeTruthy();
    await clickSound('k');await tick(801);
    expect(state.history.map(row=>row.itemId)).toEqual(['first','second']);
    expect(state.score).toMatchObject({correct:2,total:2});
  });

  it('retains the continuation flag and exact item while prepared audio defers and retries its start',()=>{
    const source=readFileSync('word_sounds_module.js','utf8');
    const fromStart=sliceBetween(source,'const startActivity =',null,{file:'word_sounds_module.js'});
    const deferral=sliceBetween(fromStart,'if (studentPreparedAudioBlocked) {','waitingForPreparedAudioRef.current = null;',{file:'word_sounds_module.js',label:'prepared-audio deferral'});
    const ref={current:null},item={preparedItem:pack('cat','second'),itemId:'second',itemIndex:1};
    new Function('studentPreparedAudioBlocked','waitingForPreparedAudioRef','activityId','forceWord','excludeWord','recursionDepth','continuingForm',
      deferral)(true,ref,'isolation',item,null,0,true);
    const retry=source.match(/startActivity\(pending\.activityId, pending\.forceWord, pending\.excludeWord, pending\.recursionDepth[^;]*;/)?.[0];
    const resume=vi.fn();new Function('pending','startActivity',retry)(ref.current,resume);
    expect(resume).toHaveBeenCalledExactlyOnceWith('isolation',item,null,0,true);
  });

  it('delivers repeated targets in order with their own question, playback, history and completion identity',async()=>{
    const items=[pack('cat','cat-first',0),pack('cat','cat-last',2),pack('dog','dog-first',0)];
    const completed=vi.fn();await mount({items,onProbeComplete:completed});
    expect(state.data).toBe(items[0]);
    expect(host.textContent).toContain('Word 1 of 3');
    await tick(900);expect(played).toContain('data:audio/mp3;base64,FIRST');
    await clickSound('k');expect(state.history.at(-1)).toMatchObject({itemId:'cat-first',itemIndex:0,correct:true});
    await tick(801);expect(state.word).toBe('cat');expect(state.data).toBe(items[1]);
    await tick(900);expect(played).toContain('data:audio/mp3;base64,THIRD');
    await clickSound('t');expect(state.history.at(-1)).toMatchObject({itemId:'cat-last',itemIndex:1,correct:true});
    await tick(801);expect(state.word).toBe('dog');expect(state.data).toBe(items[2]);
    await clickSound('d');await tick(801);
    expect(state.history.map(row=>row.itemId)).toEqual(['cat-first','cat-last','dog-first']);
    expect(state.score).toMatchObject({correct:3,total:3});
    expect(completed).toHaveBeenCalledOnce();expect(completed.mock.calls[0][0].itemIds).toEqual(['cat-first','cat-last','dog-first']);
    expect(completed.mock.calls[0][0].duration).toBeGreaterThan(4);
  });

  it('preserves authored order after an error and ends an untimed fixed form at its attempted-item goal',async()=>{
    const items=[pack('cat','cat-first',0),pack('cat','cat-last',2),pack('dog','dog-first',0)];
    await mount({items,isProbeMode:false,sessionConfig:{fixedForm:true,probeItemCount:3},wordSoundsSessionGoal:20});
    // Practice grants one retry, but a scored miss may not add another item
    // to the authored fixed form or rotate its repeated next target.
    await clickSound('t');await clickSound('t');expect(state.history[0].correct).toBe(false);
    await tick(3001);expect(state.data).toBe(items[1]);
    await clickSound('t');await tick(2001);expect(state.data).toBe(items[2]);
    await clickSound('d');await tick(2001);
    expect(state.history.map(row=>row.itemId)).toEqual(['cat-first','cat-last','dog-first']);
    expect(state.score).toMatchObject({correct:2,total:3});
    expect(host.querySelector('[aria-labelledby="word-sounds-session-complete-title"]')).toBeTruthy();
  });

  it('continues normal practice through different words without assessment-only item attribution',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat'),pack('dog','dog')],isProbeMode:false,
      sessionConfig:{fixedForm:false,sessionGoal:20},wordSoundsDifficulty:'easy'});
    const first=state.word;await clickNumber(3);expect(state.score.total).toBe(1);
    await tick(2001);expect(state.word).not.toBe(first);expect(state.history[0].itemId).toBeUndefined();
    await clickNumber(3);expect(state.score.total).toBe(2);
  });

  it('keeps a new session response locked when an older answer timeout expires',async()=>{
    const items=[pack('cat','cat'),pack('dog','dog')];
    await mount({activity:'counting',items});await clickNumber(3);
    await tick(200);await render({sessionId:'session-b'});await tick(120);
    await clickNumber(3);expect(state.history).toHaveLength(2);expect(state.score.total).toBe(1);
    await tick(481); // The first session's 800ms callback has expired.
    await clickNumber(3);expect(state.history).toHaveLength(2);expect(state.score.total).toBe(1);
  });
});
